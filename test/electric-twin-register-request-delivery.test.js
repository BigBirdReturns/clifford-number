#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeRequestFiles } from '../tools/lib/electric-twin-register-request-core.mjs';
import { renderRequestPdfs } from '../tools/lib/electric-twin-register-request-pdf-core.mjs';
import { recordDispatchCustody } from '../tools/lib/electric-twin-register-request-dispatch-core.mjs';
import {
  DELIVERY_MANIFEST_NAME,
  recordDeliveryCustody,
  validateDeliveryInput,
} from '../tools/lib/electric-twin-register-request-delivery-core.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

const privateDir = 'data/local';
const outputRoot = 'build/source-acquisition/electric-twin-register-of-members';
const requesterPath = `${privateDir}/electric-twin-register-delivery-requester-${process.pid}.json`;
const dispatchInputPath = `${privateDir}/electric-twin-register-delivery-dispatch-${process.pid}.json`;
const deliveryInputPath = `${privateDir}/electric-twin-register-delivery-${process.pid}.json`;
const dispatchProofPath = `${privateDir}/electric-twin-register-delivery-dispatch-proof-${process.pid}.pdf`;
const deliveryProofPath = `${privateDir}/electric-twin-register-delivery-proof-${process.pid}.pdf`;
const outsideProofPath = `build/electric-twin-register-delivery-proof-outside-${process.pid}.pdf`;
const outsideInputPath = `build/electric-twin-register-delivery-input-outside-${process.pid}.json`;
const symlinkProofPath = `${privateDir}/electric-twin-register-delivery-proof-symlink-${process.pid}.pdf`;
const outputA = `${outputRoot}/delivery-test-${process.pid}-a`;
const outputB = `${outputRoot}/delivery-test-${process.pid}-b`;
const cleanupPaths = [
  requesterPath,
  dispatchInputPath,
  deliveryInputPath,
  dispatchProofPath,
  deliveryProofPath,
  outsideProofPath,
  outsideInputPath,
  symlinkProofPath,
  outputA,
  outputB,
];

const requesterInput = {
  schema_version: 'electric-twin-register-request-private-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  requester: {
    full_name: 'Test Researcher',
    postal_address_lines: ['1 Test Street', 'London', 'SW1A 1AA'],
    email: 'researcher@example.test',
  },
  request_date: '2026-08-28',
  disclosure_recipients: ['NO OTHER PERSON'],
  location_verification: {
    checked_at: '2026-08-28',
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
    finalization_record: 'test-delivery-finalization-authorization-001',
    finalized_at: '2026-08-28T08:00:00Z',
    statutory_dispatch_authorized: true,
    statutory_dispatch_record: 'test-delivery-statutory-dispatch-authorization-001',
    voluntary_dispatch_authorized: false,
    voluntary_dispatch_record: null,
  },
};

const dispatchInput = {
  schema_version: 'electric-twin-register-request-dispatch-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  channel: 'statutory_register_request',
  method: 'postal_service',
  declared_dispatched_at: '2026-08-28T09:00:00Z',
  dispatch_event_record: 'test-delivery-postal-dispatch-event-001',
  authorization_record: 'test-delivery-statutory-dispatch-authorization-001',
  service_provider: 'Test Postal Service',
  service_level: 'Tracked custody service',
  tracking_reference: 'TEST-DELIVERY-TRACKING-REFERENCE-001',
  proof_artifacts: [
    {
      role: 'postal_proof_of_dispatch',
      path: dispatchProofPath,
      mime_type: 'application/pdf',
    },
  ],
};

const deliveryInput = {
  schema_version: 'electric-twin-register-request-delivery-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  channel: 'statutory_register_request',
  delivery_status: 'delivered',
  confirmed_delivered_at: '2026-08-28T10:00:00Z',
  confirmed_receipt_local_date: '2026-08-28',
  receipt_time_zone: 'Europe/London',
  delivery_event_record: 'test-delivery-event-001',
  tracking_reference: 'TEST-DELIVERY-TRACKING-REFERENCE-001',
  service_provider: 'Test Postal Service',
  delivery_location_class: 'registered_office',
  evidence_artifacts: [
    {
      role: 'carrier_delivery_confirmation',
      path: deliveryProofPath,
      mime_type: 'application/pdf',
    },
  ],
  working_day_calendar: {
    jurisdiction: 'England and Wales',
    time_zone: 'Europe/London',
    calendar_record: 'test-england-wales-working-day-calendar-001',
    reviewed_at: '2026-08-28',
    source_urls: [
      'https://www.legislation.gov.uk/ukpga/2006/46/section/117',
      'https://www.gov.uk/bank-holidays',
    ],
    counting_rule: 'first_eligible_day_after_receipt_is_day_1',
    non_working_dates: ['2026-08-31'],
  },
};

function writePrivateJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.mkdirSync('build', { recursive: true });
for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
writePrivateJson(requesterPath, requesterInput);
fs.writeFileSync(dispatchProofPath, Buffer.from('%PDF-1.4\ndispatch proof fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(dispatchProofPath, 0o600);
fs.writeFileSync(deliveryProofPath, Buffer.from('%PDF-1.4\ndelivery confirmation fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(deliveryProofPath, 0o600);
writePrivateJson(dispatchInputPath, dispatchInput);
writePrivateJson(deliveryInputPath, deliveryInput);

try {
  finalizeRequestFiles({ inputPath: requesterPath, outputDir: outputA });
  renderRequestPdfs({ sourceDir: outputA });
  const dispatchResult = recordDispatchCustody({ sourceDir: outputA, inputPath: dispatchInputPath });
  const result = recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath });

  assert.equal(result.state, 'postal_delivery_evidence_recorded_operational_checkpoint_calculated');
  assert.equal(result.channel, 'statutory_register_request');
  assert.equal(result.operational_response_checkpoint, '2026-09-07');
  assert.equal(result.legal_response_deadline, null);
  assert.equal(result.messages_sent_by_tool, false);
  assert.equal(result.evidence_files.length, 1);

  const manifestPath = path.join(result.delivery_dir, DELIVERY_MANIFEST_NAME);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(manifest.response_checkpoint.counted_working_dates, [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-07',
  ]);
  assert.equal(manifest.response_checkpoint.checkpoint_date, '2026-09-07');
  assert.equal(manifest.response_checkpoint.operational_only, true);
  assert.equal(manifest.response_checkpoint.legal_deadline_adjudicated, false);
  assert.equal(manifest.controls.dispatch_manifest_verified, true);
  assert.equal(manifest.controls.dispatch_proof_files_verified, true);
  assert.equal(manifest.controls.delivery_evidence_copied, true);
  assert.equal(manifest.controls.external_delivery_assertion_recorded, true);
  assert.equal(manifest.controls.carrier_authenticity_verified_by_tool, false);
  assert.equal(manifest.controls.delivery_confirmed_by_tool, false);
  assert.equal(manifest.controls.statutory_receipt_adjudicated, false);
  assert.equal(manifest.controls.operational_response_checkpoint_calculated, true);
  assert.equal(manifest.controls.legal_response_deadline_calculated, false);
  assert.equal(manifest.controls.legal_response_deadline, null);
  assert.equal(manifest.controls.network_calls_performed, false);
  assert.equal(manifest.controls.canonical_effect, 'none');
  assert.equal(JSON.stringify(manifest).includes('TEST-DELIVERY-TRACKING-REFERENCE-001'), false);
  assert.equal(JSON.stringify(manifest).includes('Test Researcher'), false);
  assert.equal(JSON.stringify(manifest).includes('researcher@example.test'), false);
  assert.equal(fs.statSync(result.delivery_dir).mode & 0o077, 0);
  assert.equal(fs.statSync(manifestPath).mode & 0o077, 0);
  assert.deepEqual(
    fs.readFileSync(path.join(result.delivery_dir, result.evidence_files[0].path)),
    fs.readFileSync(deliveryProofPath),
  );

  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath }),
    /refusing to overwrite existing delivery custody directory/u,
  );

  writePrivateJson(deliveryInputPath, {
    ...deliveryInput,
    delivery_event_record: 'test-delivery-event-tracking-mismatch',
    tracking_reference: 'WRONG-TRACKING-REFERENCE',
  });
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath }),
    /tracking reference/u,
  );

  writePrivateJson(deliveryInputPath, {
    ...deliveryInput,
    delivery_event_record: 'test-delivery-event-before-dispatch',
    confirmed_delivered_at: '2026-08-28T08:30:00Z',
  });
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath }),
    /cannot precede declared dispatch/u,
  );

  fs.writeFileSync(outsideProofPath, fs.readFileSync(deliveryProofPath), { mode: 0o600 });
  writePrivateJson(deliveryInputPath, {
    ...deliveryInput,
    delivery_event_record: 'test-delivery-event-outside-proof',
    evidence_artifacts: [{
      role: 'carrier_delivery_confirmation',
      path: outsideProofPath,
      mime_type: 'application/pdf',
    }],
  });
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath }),
    /must remain under ignored data\/local/u,
  );

  fs.chmodSync(deliveryProofPath, 0o644);
  writePrivateJson(deliveryInputPath, {
    ...deliveryInput,
    delivery_event_record: 'test-delivery-event-public-proof',
  });
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath }),
    /must not be group- or world-readable/u,
  );
  fs.chmodSync(deliveryProofPath, 0o600);

  fs.symlinkSync(path.resolve(deliveryProofPath), symlinkProofPath);
  writePrivateJson(deliveryInputPath, {
    ...deliveryInput,
    delivery_event_record: 'test-delivery-event-symlink-proof',
    evidence_artifacts: [{
      role: 'carrier_delivery_confirmation',
      path: symlinkProofPath,
      mime_type: 'application/pdf',
    }],
  });
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: deliveryInputPath }),
    /symlink path component is not allowed/u,
  );
  fs.rmSync(symlinkProofPath, { force: true });

  assert.throws(
    () => validateDeliveryInput({
      ...deliveryInput,
      evidence_artifacts: [{
        role: 'carrier_tracking_export',
        path: deliveryProofPath,
        mime_type: 'application/pdf',
      }],
    }),
    /must contain carrier_delivery_confirmation/u,
  );
  assert.throws(
    () => validateDeliveryInput({
      ...deliveryInput,
      working_day_calendar: {
        ...deliveryInput.working_day_calendar,
        non_working_dates: ['2026-08-31', '2026-08-31'],
      },
    }),
    /contains duplicates/u,
  );

  writePrivateJson(outsideInputPath, deliveryInput);
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResult.dispatch_dir, inputPath: outsideInputPath }),
    /must remain under ignored data\/local/u,
  );

  writePrivateJson(deliveryInputPath, deliveryInput);
  finalizeRequestFiles({ inputPath: requesterPath, outputDir: outputB });
  renderRequestPdfs({ sourceDir: outputB });
  const dispatchResultB = recordDispatchCustody({ sourceDir: outputB, inputPath: dispatchInputPath });
  const copiedDispatchProof = path.join(dispatchResultB.dispatch_dir, dispatchResultB.evidence_files[0].path);
  const tampered = fs.readFileSync(copiedDispatchProof);
  tampered[0] = tampered[0] === 0x25 ? 0x24 : 0x25;
  fs.writeFileSync(copiedDispatchProof, tampered);
  fs.chmodSync(copiedDispatchProof, 0o600);
  assert.throws(
    () => recordDeliveryCustody({ dispatchDir: dispatchResultB.dispatch_dir, inputPath: deliveryInputPath }),
    /dispatch evidence .* SHA-256 mismatch/u,
  );
} finally {
  for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
}

console.log('electric-twin-register-request-delivery.test: OK');
