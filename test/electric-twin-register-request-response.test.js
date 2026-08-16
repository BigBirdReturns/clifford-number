#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeRequestFiles } from '../tools/lib/electric-twin-register-request-core.mjs';
import { renderRequestPdfs } from '../tools/lib/electric-twin-register-request-pdf-core.mjs';
import { recordDispatchCustody } from '../tools/lib/electric-twin-register-request-dispatch-core.mjs';
import { recordDeliveryCustody } from '../tools/lib/electric-twin-register-request-delivery-core.mjs';
import {
  RESPONSE_MANIFEST_NAME,
  recordResponseCustody,
  validateResponseInput,
} from '../tools/lib/electric-twin-register-request-response-core.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

const privateDir = 'data/local';
const outputRoot = 'build/source-acquisition/electric-twin-register-of-members';
const requesterPath = `${privateDir}/electric-twin-register-response-requester-${process.pid}.json`;
const dispatchInputPath = `${privateDir}/electric-twin-register-response-dispatch-${process.pid}.json`;
const deliveryInputPath = `${privateDir}/electric-twin-register-response-delivery-${process.pid}.json`;
const responseInputPath = `${privateDir}/electric-twin-register-response-${process.pid}.json`;
const outsideInputPath = `build/electric-twin-register-response-input-outside-${process.pid}.json`;
const dispatchProofPath = `${privateDir}/electric-twin-register-response-dispatch-proof-${process.pid}.pdf`;
const deliveryProofPath = `${privateDir}/electric-twin-register-response-delivery-proof-${process.pid}.pdf`;
const responseEmailPath = `${privateDir}/electric-twin-register-response-email-${process.pid}.eml`;
const responseLetterPath = `${privateDir}/electric-twin-register-response-letter-${process.pid}.pdf`;
const outsideEvidencePath = `build/electric-twin-register-response-evidence-outside-${process.pid}.eml`;
const symlinkEvidencePath = `${privateDir}/electric-twin-register-response-symlink-${process.pid}.eml`;
const outputA = `${outputRoot}/response-test-${process.pid}-a`;
const outputB = `${outputRoot}/response-test-${process.pid}-b`;
const cleanupPaths = [
  requesterPath,
  dispatchInputPath,
  deliveryInputPath,
  responseInputPath,
  outsideInputPath,
  dispatchProofPath,
  deliveryProofPath,
  responseEmailPath,
  responseLetterPath,
  outsideEvidencePath,
  symlinkEvidencePath,
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
    finalization_record: 'test-response-finalization-authorization-001',
    finalized_at: '2026-08-28T08:00:00Z',
    statutory_dispatch_authorized: true,
    statutory_dispatch_record: 'test-response-statutory-dispatch-authorization-001',
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
  dispatch_event_record: 'test-response-postal-dispatch-event-001',
  authorization_record: 'test-response-statutory-dispatch-authorization-001',
  service_provider: 'Test Postal Service',
  service_level: 'Tracked custody service',
  tracking_reference: 'TEST-RESPONSE-TRACKING-REFERENCE-001',
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
  delivery_event_record: 'test-response-delivery-event-001',
  tracking_reference: 'TEST-RESPONSE-TRACKING-REFERENCE-001',
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
    calendar_record: 'test-response-england-wales-calendar-001',
    reviewed_at: '2026-08-28',
    source_urls: [
      'https://www.legislation.gov.uk/ukpga/2006/46/section/117',
      'https://www.gov.uk/bank-holidays',
    ],
    counting_rule: 'first_eligible_day_after_receipt_is_day_1',
    non_working_dates: ['2026-08-31'],
  },
};

const responseInput = {
  schema_version: 'electric-twin-register-request-response-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  channel: 'statutory_register_request',
  response_status: 'response_received',
  received_at: '2026-09-03T12:00:00Z',
  received_local_date: '2026-09-03',
  receipt_time_zone: 'Europe/London',
  response_event_record: 'test-response-event-001',
  response_route: 'email',
  sender_role: 'company_corporate_services_provider',
  asserted_sender: 'Test Corporate Services Provider',
  primary_disposition: 'electronic_copy_offered',
  additional_dispositions: ['fee_or_logistics_requested'],
  asserted_document_categories: ['correspondence_only', 'fee_notice'],
  evidence_artifacts: [
    {
      role: 'response_message_source',
      path: responseEmailPath,
      mime_type: 'message/rfc822',
    },
  ],
};

function writePrivateJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function buildDeliveryChain(outputDir) {
  finalizeRequestFiles({ inputPath: requesterPath, outputDir });
  renderRequestPdfs({ sourceDir: outputDir });
  const dispatch = recordDispatchCustody({ sourceDir: outputDir, inputPath: dispatchInputPath });
  return recordDeliveryCustody({ dispatchDir: dispatch.dispatch_dir, inputPath: deliveryInputPath });
}

fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.mkdirSync('build', { recursive: true });
for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
writePrivateJson(requesterPath, requesterInput);
writePrivateJson(dispatchInputPath, dispatchInput);
writePrivateJson(deliveryInputPath, deliveryInput);
writePrivateJson(responseInputPath, responseInput);
fs.writeFileSync(dispatchProofPath, Buffer.from('%PDF-1.4\ndispatch proof fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(dispatchProofPath, 0o600);
fs.writeFileSync(deliveryProofPath, Buffer.from('%PDF-1.4\ndelivery proof fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(deliveryProofPath, 0o600);
const emailBytes = Buffer.from([
  'From: Test Corporate Services Provider <provider@example.test>',
  'Date: Thu, 03 Sep 2026 12:00:00 +0000',
  'Subject: Electric Twin register request',
  'Message-ID: <response-001@example.test>',
  '',
  'Please see the attached fee and logistics information.',
  '',
].join('\r\n'), 'utf8');
fs.writeFileSync(responseEmailPath, emailBytes, { mode: 0o600 });
fs.chmodSync(responseEmailPath, 0o600);
fs.writeFileSync(responseLetterPath, Buffer.from('%PDF-1.4\nresponse letter fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(responseLetterPath, 0o600);

try {
  const deliveryA = buildDeliveryChain(outputA);
  assert.equal(deliveryA.operational_response_checkpoint, '2026-09-07');

  const result = recordResponseCustody({
    deliveryDir: deliveryA.delivery_dir,
    inputPath: responseInputPath,
  });
  assert.equal(result.state, 'response_evidence_recorded_unadjudicated');
  assert.equal(result.channel, 'statutory_register_request');
  assert.equal(result.checkpoint_relation, 'on_or_before_operational_checkpoint');
  assert.equal(result.legal_response_deadline, null);
  assert.equal(result.canonical_effect, 'none');
  assert.equal(result.evidence_files.length, 1);

  const manifestPath = path.join(result.response_dir, RESPONSE_MANIFEST_NAME);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.response.primary_disposition, 'electronic_copy_offered');
  assert.deepEqual(manifest.response.additional_dispositions, ['fee_or_logistics_requested']);
  assert.deepEqual(manifest.response.asserted_document_categories, ['correspondence_only', 'fee_notice']);
  assert.equal(manifest.response.transaction_document_category_asserted, false);
  assert.equal(manifest.checkpoint_relation.relation, 'on_or_before_operational_checkpoint');
  assert.equal(manifest.checkpoint_relation.chronology_only, true);
  assert.equal(manifest.checkpoint_relation.legal_timeliness_adjudicated, false);
  assert.equal(manifest.controls.response_authenticity_verified_by_tool, false);
  assert.equal(manifest.controls.sender_identity_verified_by_tool, false);
  assert.equal(manifest.controls.document_categories_verified_by_tool, false);
  assert.equal(manifest.controls.disposition_classification_verified_by_tool, false);
  assert.equal(manifest.controls.statutory_compliance_adjudicated, false);
  assert.equal(manifest.controls.legal_response_deadline_calculated, false);
  assert.equal(manifest.controls.legal_response_deadline, null);
  assert.equal(manifest.controls.no_response_inferred, false);
  assert.equal(manifest.controls.allottee_identity_adjudicated, false);
  assert.equal(manifest.controls.beneficial_ownership_adjudicated, false);
  assert.equal(manifest.controls.actor_hop_adjudicated, false);
  assert.equal(manifest.controls.canonical_effect, 'none');
  const manifestText = JSON.stringify(manifest);
  assert.equal(manifestText.includes('Test Corporate Services Provider'), false);
  assert.equal(manifestText.includes('provider@example.test'), false);
  assert.equal(manifestText.includes('Test Researcher'), false);
  assert.equal(manifestText.includes('researcher@example.test'), false);

  const copiedResponsePath = path.join(result.response_dir, result.evidence_files[0].path);
  assert.deepEqual(fs.readFileSync(copiedResponsePath), emailBytes);
  assert.equal(fs.statSync(result.response_dir).mode & 0o077, 0);
  assert.equal(fs.statSync(copiedResponsePath).mode & 0o077, 0);
  assert.equal(fs.statSync(manifestPath).mode & 0o077, 0);

  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryA.delivery_dir, inputPath: responseInputPath }),
    /refusing to overwrite existing response custody directory/u,
  );

  const lateTransactionResponse = {
    ...responseInput,
    received_at: '2026-09-08T09:00:00Z',
    received_local_date: '2026-09-08',
    response_event_record: 'test-response-event-002',
    response_route: 'postal_service',
    primary_disposition: 'voluntary_transaction_record_supplied',
    additional_dispositions: [],
    asserted_document_categories: ['subscription_schedule'],
    evidence_artifacts: [
      {
        role: 'transaction_instrument',
        path: responseLetterPath,
        mime_type: 'application/pdf',
      },
    ],
  };
  writePrivateJson(responseInputPath, lateTransactionResponse);
  const lateResult = recordResponseCustody({
    deliveryDir: deliveryA.delivery_dir,
    inputPath: responseInputPath,
  });
  assert.equal(lateResult.checkpoint_relation, 'after_operational_checkpoint');
  const lateManifest = JSON.parse(fs.readFileSync(
    path.join(lateResult.response_dir, RESPONSE_MANIFEST_NAME), 'utf8'));
  assert.equal(lateManifest.response.transaction_document_category_asserted, true);
  assert.equal(lateManifest.controls.transaction_instrument_contents_adjudicated, false);
  assert.equal(lateManifest.controls.allottee_identity_adjudicated, false);

  const invalidNoResponse = {
    ...responseInput,
    primary_disposition: 'no_response',
  };
  assert.throws(() => validateResponseInput(invalidNoResponse), /unsupported primary_disposition/u);

  const duplicateDisposition = {
    ...responseInput,
    additional_dispositions: ['electronic_copy_offered'],
  };
  assert.throws(() => validateResponseInput(duplicateDisposition), /must not repeat primary_disposition/u);

  const duplicateCategories = {
    ...responseInput,
    asserted_document_categories: ['correspondence_only', 'correspondence_only'],
  };
  assert.throws(() => validateResponseInput(duplicateCategories), /contains duplicates/u);

  const emailWithoutMessageSource = {
    ...responseInput,
    evidence_artifacts: [
      {
        role: 'response_letter_original',
        path: responseLetterPath,
        mime_type: 'application/pdf',
      },
    ],
  };
  assert.throws(() => validateResponseInput(emailWithoutMessageSource), /email responses require/u);

  writePrivateJson(responseInputPath, {
    ...responseInput,
    received_at: '2026-08-28T09:30:00Z',
    received_local_date: '2026-08-28',
    response_event_record: 'test-response-before-delivery',
  });
  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryA.delivery_dir, inputPath: responseInputPath }),
    /cannot precede confirmed delivery/u,
  );

  fs.copyFileSync(responseEmailPath, outsideEvidencePath);
  fs.chmodSync(outsideEvidencePath, 0o600);
  writePrivateJson(responseInputPath, {
    ...responseInput,
    response_event_record: 'test-response-outside-evidence',
    evidence_artifacts: [
      {
        role: 'response_message_source',
        path: outsideEvidencePath,
        mime_type: 'message/rfc822',
      },
    ],
  });
  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryA.delivery_dir, inputPath: responseInputPath }),
    /must remain under ignored data\/local/u,
  );

  fs.chmodSync(responseEmailPath, 0o644);
  writePrivateJson(responseInputPath, {
    ...responseInput,
    response_event_record: 'test-response-world-readable',
  });
  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryA.delivery_dir, inputPath: responseInputPath }),
    /must not be group- or world-readable/u,
  );
  fs.chmodSync(responseEmailPath, 0o600);

  fs.rmSync(symlinkEvidencePath, { force: true });
  fs.symlinkSync(path.basename(responseEmailPath), symlinkEvidencePath);
  writePrivateJson(responseInputPath, {
    ...responseInput,
    response_event_record: 'test-response-symlink',
    evidence_artifacts: [
      {
        role: 'response_message_source',
        path: symlinkEvidencePath,
        mime_type: 'message/rfc822',
      },
    ],
  });
  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryA.delivery_dir, inputPath: responseInputPath }),
    /symlink path component is not allowed/u,
  );

  writePrivateJson(responseInputPath, responseInput);
  fs.copyFileSync(responseInputPath, outsideInputPath);
  fs.chmodSync(outsideInputPath, 0o600);
  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryA.delivery_dir, inputPath: outsideInputPath }),
    /must remain under ignored data\/local/u,
  );

  const deliveryB = buildDeliveryChain(outputB);
  const deliveryManifestPath = path.join(deliveryB.delivery_dir, 'outbound-delivery-manifest.json');
  const deliveryManifest = JSON.parse(fs.readFileSync(deliveryManifestPath, 'utf8'));
  const deliveryEvidencePath = path.join(deliveryB.delivery_dir, deliveryManifest.evidence_files[0].path);
  const tampered = fs.readFileSync(deliveryEvidencePath);
  tampered[0] = tampered[0] === 0x25 ? 0x24 : 0x25;
  fs.writeFileSync(deliveryEvidencePath, tampered);
  fs.chmodSync(deliveryEvidencePath, 0o600);
  assert.throws(
    () => recordResponseCustody({ deliveryDir: deliveryB.delivery_dir, inputPath: responseInputPath }),
    /delivery evidence .* SHA-256 mismatch/u,
  );
} finally {
  for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
}

console.log('electric-twin-register-request-response.test: OK');
