#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeRequestFiles } from '../tools/lib/electric-twin-register-request-core.mjs';
import { renderRequestPdfs } from '../tools/lib/electric-twin-register-request-pdf-core.mjs';
import {
  DISPATCH_MANIFEST_NAME,
  recordDispatchCustody,
  validateDispatchInput,
} from '../tools/lib/electric-twin-register-request-dispatch-core.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

const privateInput = {
  schema_version: 'electric-twin-register-request-private-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  requester: {
    full_name: 'Test Researcher',
    postal_address_lines: ['1 Test Street', 'London', 'SW1A 1AA'],
    email: 'researcher@example.test',
  },
  request_date: '2026-08-15',
  disclosure_recipients: ['NO OTHER PERSON'],
  location_verification: {
    checked_at: '2026-08-15',
    registered_office_lines: ['7 Berwick Street', 'London', 'W1F 0PQ'],
    register_location_basis: 'registered_office',
    register_location_lines: ['7 Berwick Street', 'London', 'W1F 0PQ'],
    source_urls: [
      'https://find-and-update.company-information.service.gov.uk/company/15173006',
      'https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history',
    ],
  },
  authorization: {
    finalization_authorized: true,
    finalization_record: 'test-dispatch-finalization-authorization-001',
    finalized_at: '2026-08-15T14:00:00Z',
    statutory_dispatch_authorized: true,
    statutory_dispatch_record: 'test-statutory-dispatch-authorization-001',
    voluntary_dispatch_authorized: false,
    voluntary_dispatch_record: null,
  },
};

const privateDir = 'data/local';
const outputRoot = 'build/source-acquisition/electric-twin-register-of-members';
const requesterPath = `${privateDir}/electric-twin-register-dispatch-requester-${process.pid}.json`;
const dispatchInputPath = `${privateDir}/electric-twin-register-dispatch-${process.pid}.json`;
const proofPath = `${privateDir}/electric-twin-register-postal-proof-${process.pid}.pdf`;
const outsideProofPath = `build/electric-twin-register-postal-proof-outside-${process.pid}.pdf`;
const symlinkProofPath = `${privateDir}/electric-twin-register-postal-proof-symlink-${process.pid}.pdf`;
const inputOutsidePath = `build/electric-twin-register-dispatch-input-outside-${process.pid}.json`;
const outputA = `${outputRoot}/dispatch-test-${process.pid}-a`;
const outputB = `${outputRoot}/dispatch-test-${process.pid}-b`;
const cleanupPaths = [
  requesterPath,
  dispatchInputPath,
  proofPath,
  outsideProofPath,
  symlinkProofPath,
  inputOutsidePath,
  outputA,
  outputB,
];

const baseDispatchInput = {
  schema_version: 'electric-twin-register-request-dispatch-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  channel: 'statutory_register_request',
  method: 'postal_service',
  declared_dispatched_at: '2026-08-15T15:00:00Z',
  dispatch_event_record: 'test-postal-dispatch-event-001',
  authorization_record: 'test-statutory-dispatch-authorization-001',
  service_provider: 'Test Postal Service',
  service_level: 'Tracked custody service',
  tracking_reference: 'TEST-TRACKING-REFERENCE-001',
  proof_artifacts: [
    {
      role: 'postal_proof_of_dispatch',
      path: proofPath,
      mime_type: 'application/pdf',
    },
  ],
};

fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.mkdirSync('build', { recursive: true });
for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
fs.writeFileSync(requesterPath, `${JSON.stringify(privateInput, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(requesterPath, 0o600);
fs.writeFileSync(proofPath, Buffer.from('%PDF-1.4\npostal proof test fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(proofPath, 0o600);
fs.writeFileSync(dispatchInputPath, `${JSON.stringify(baseDispatchInput, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(dispatchInputPath, 0o600);

try {
  finalizeRequestFiles({ inputPath: requesterPath, outputDir: outputA });
  renderRequestPdfs({ sourceDir: outputA });

  const result = recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath });
  assert.equal(result.state, 'postal_dispatch_evidence_recorded_delivery_unconfirmed');
  assert.equal(result.channel, 'statutory_register_request');
  assert.equal(result.messages_sent_by_tool, false);
  assert.equal(result.postal_dispatch_performed_by_tool, false);
  assert.equal(result.delivery_confirmed, false);
  assert.equal(result.response_deadline, null);
  assert.equal(result.evidence_files.length, 1);

  const manifestPath = path.join(result.dispatch_dir, DISPATCH_MANIFEST_NAME);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.authorization.dispatch_authorized, true);
  assert.equal(manifest.authorization.dispatch_record, privateInput.authorization.statutory_dispatch_record);
  assert.equal(manifest.controls.requester_name_address_email_in_manifest, false);
  assert.equal(manifest.controls.source_chain_verified, true);
  assert.equal(manifest.controls.outbound_pdf_verified, true);
  assert.equal(manifest.controls.proof_artifacts_copied, true);
  assert.equal(manifest.controls.external_dispatch_assertion_recorded, true);
  assert.equal(manifest.controls.carrier_authenticity_verified, false);
  assert.equal(manifest.controls.network_calls_performed, false);
  assert.equal(manifest.controls.messages_sent_by_tool, false);
  assert.equal(manifest.controls.postal_dispatch_performed_by_tool, false);
  assert.equal(manifest.controls.delivery_confirmed, false);
  assert.equal(manifest.controls.confirmed_receipt_at, null);
  assert.equal(manifest.controls.response_deadline_calculated, false);
  assert.equal(manifest.controls.response_deadline, null);
  assert.equal(manifest.controls.canonical_effect, 'none');
  assert.equal(manifest.dispatch.tracking_reference_present, true);
  assert.equal(typeof manifest.dispatch.tracking_reference_sha256, 'string');
  assert.equal(JSON.stringify(manifest).includes('TEST-TRACKING-REFERENCE-001'), false);
  assert.equal(JSON.stringify(manifest).includes('Test Researcher'), false);
  assert.equal(JSON.stringify(manifest).includes('researcher@example.test'), false);

  const copiedProofPath = path.join(result.dispatch_dir, result.evidence_files[0].path);
  assert.deepEqual(fs.readFileSync(copiedProofPath), fs.readFileSync(proofPath));
  assert.equal(fs.statSync(result.dispatch_dir).mode & 0o077, 0);
  assert.equal(fs.statSync(copiedProofPath).mode & 0o077, 0);
  assert.equal(fs.statSync(manifestPath).mode & 0o077, 0);

  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath }),
    /refusing to overwrite existing dispatch custody directory/u,
  );

  const unauthorizedVoluntary = {
    ...baseDispatchInput,
    channel: 'voluntary_transaction_instrument_request',
    dispatch_event_record: 'test-voluntary-dispatch-event-001',
    authorization_record: 'test-voluntary-dispatch-authorization-001',
  };
  fs.writeFileSync(dispatchInputPath, `${JSON.stringify(unauthorizedVoluntary, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(dispatchInputPath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath }),
    /not authorized for dispatch/u,
  );

  const mismatchedAuthorization = {
    ...baseDispatchInput,
    dispatch_event_record: 'test-postal-dispatch-event-002',
    authorization_record: 'different-authorization-record',
  };
  fs.writeFileSync(dispatchInputPath, `${JSON.stringify(mismatchedAuthorization, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(dispatchInputPath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath }),
    /authorization_record does not match/u,
  );

  fs.writeFileSync(outsideProofPath, fs.readFileSync(proofPath), { mode: 0o600 });
  fs.chmodSync(outsideProofPath, 0o600);
  const outsideProof = {
    ...baseDispatchInput,
    dispatch_event_record: 'test-postal-dispatch-event-003',
    proof_artifacts: [{ ...baseDispatchInput.proof_artifacts[0], path: outsideProofPath }],
  };
  fs.writeFileSync(dispatchInputPath, `${JSON.stringify(outsideProof, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(dispatchInputPath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath }),
    /must remain under ignored data\/local/u,
  );

  fs.chmodSync(proofPath, 0o644);
  const worldReadableProof = {
    ...baseDispatchInput,
    dispatch_event_record: 'test-postal-dispatch-event-004',
  };
  fs.writeFileSync(dispatchInputPath, `${JSON.stringify(worldReadableProof, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(dispatchInputPath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath }),
    /must not be group- or world-readable/u,
  );
  fs.chmodSync(proofPath, 0o600);

  fs.symlinkSync(path.basename(proofPath), symlinkProofPath);
  const symlinkProof = {
    ...baseDispatchInput,
    dispatch_event_record: 'test-postal-dispatch-event-005',
    proof_artifacts: [{ ...baseDispatchInput.proof_artifacts[0], path: symlinkProofPath }],
  };
  fs.writeFileSync(dispatchInputPath, `${JSON.stringify(symlinkProof, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(dispatchInputPath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath }),
    /symlink path component is not allowed/u,
  );
  fs.rmSync(symlinkProofPath, { force: true });

  assert.throws(
    () => validateDispatchInput({
      ...baseDispatchInput,
      proof_artifacts: [{ ...baseDispatchInput.proof_artifacts[0], role: 'postal_receipt' }],
    }),
    /must contain postal_proof_of_dispatch/u,
  );
  assert.throws(
    () => validateDispatchInput({
      ...baseDispatchInput,
      proof_artifacts: [{ ...baseDispatchInput.proof_artifacts[0], mime_type: 'text/html' }],
    }),
    /unsupported proof MIME type/u,
  );

  fs.writeFileSync(inputOutsidePath, `${JSON.stringify(baseDispatchInput, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(inputOutsidePath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputA, inputPath: inputOutsidePath }),
    /dispatch input must remain under ignored data\/local/u,
  );

  finalizeRequestFiles({ inputPath: requesterPath, outputDir: outputB });
  renderRequestPdfs({ sourceDir: outputB });
  const tamperedPdfPath = path.join(outputB, 'statutory-register-of-members-request.pdf');
  const tamperedPdf = fs.readFileSync(tamperedPdfPath);
  tamperedPdf[tamperedPdf.length - 2] ^= 0x01;
  fs.writeFileSync(tamperedPdfPath, tamperedPdf);
  fs.chmodSync(tamperedPdfPath, 0o600);
  fs.writeFileSync(dispatchInputPath, `${JSON.stringify({
    ...baseDispatchInput,
    dispatch_event_record: 'test-postal-dispatch-event-006',
  }, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(dispatchInputPath, 0o600);
  assert.throws(
    () => recordDispatchCustody({ sourceDir: outputB, inputPath: dispatchInputPath }),
    /SHA-256 does not match PDF manifest/u,
  );

  assert.throws(
    () => validateDispatchInput({
      ...baseDispatchInput,
      declared_dispatched_at: '[UTC ISO-8601 TIMESTAMP]',
    }),
    /placeholder/u,
  );
} finally {
  for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
}

console.log('electric-twin-register-request-dispatch.test: OK');
