import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ACQUISITION_ID,
  DEFAULT_OUTPUT_ROOT,
  FINALIZATION_SCHEMA,
} from './electric-twin-register-request-core.mjs';
import {
  PDF_MANIFEST_NAME,
  PDF_RENDERING_SCHEMA,
  SOURCE_FILES,
  SOURCE_MANIFEST_NAME,
} from './electric-twin-register-request-pdf-core.mjs';
import {
  DISPATCH_CUSTODY_SCHEMA,
  DISPATCH_MANIFEST_NAME,
} from './electric-twin-register-request-dispatch-core.mjs';
import {
  DELIVERY_CUSTODY_SCHEMA,
  DELIVERY_MANIFEST_NAME,
} from './electric-twin-register-request-delivery-core.mjs';

export const RESPONSE_INPUT_SCHEMA = 'electric-twin-register-request-response-input@1';
export const RESPONSE_CUSTODY_SCHEMA = 'electric-twin-register-request-response-custody@1';
export const RESPONSE_MANIFEST_NAME = 'inbound-response-manifest.json';
export const RESPONSE_DIRECTORY_NAME = 'response';

const CHANNELS = new Set([
  'statutory_register_request',
  'voluntary_transaction_instrument_request',
]);
const RESPONSE_ROUTES = new Set([
  'email',
  'postal_service',
  'in_person_inspection',
  'court_service',
  'other_documentary_route',
]);
const SENDER_ROLES = new Set([
  'company',
  'company_officer',
  'company_secretary',
  'company_legal_adviser',
  'company_corporate_services_provider',
  'court',
  'carrier_or_routing_intermediary',
  'unidentified_sender',
]);
const DISPOSITIONS = new Set([
  'full_statutory_compliance',
  'partial_statutory_compliance',
  'inspection_offered',
  'electronic_copy_offered',
  'fee_or_logistics_requested',
  'clarification_requested',
  'routed_to_sail_or_other_inspection_location',
  'company_application_to_court',
  'improper_purpose_asserted',
  'voluntary_transaction_record_supplied',
  'voluntary_request_declined',
  'confidentiality_asserted',
  'route_failure',
  'other_response',
]);
const DOCUMENT_CATEGORIES = new Set([
  'correspondence_only',
  'register_of_members_extract',
  'inspection_terms',
  'fee_notice',
  'court_application',
  'register_of_allotments_extract',
  'allotment_schedule',
  'board_allotment_resolution',
  'closing_schedule',
  'subscription_schedule',
  'other_transaction_instrument',
  'routing_notice',
  'other_attachment',
]);
const TRANSACTION_DOCUMENT_CATEGORIES = new Set([
  'register_of_allotments_extract',
  'allotment_schedule',
  'board_allotment_resolution',
  'closing_schedule',
  'subscription_schedule',
  'other_transaction_instrument',
]);
const EVIDENCE_ROLES = new Set([
  'response_message_source',
  'response_letter_original',
  'inspection_offer_or_terms',
  'fee_notice',
  'register_extract',
  'transaction_instrument',
  'court_application_original',
  'clarification_request',
  'routing_notice',
  'attachment',
  'other_response_evidence',
]);
const PRIMARY_EVIDENCE_ROLES = new Set([
  'response_message_source',
  'response_letter_original',
  'inspection_offer_or_terms',
  'fee_notice',
  'register_extract',
  'transaction_instrument',
  'court_application_original',
  'clarification_request',
  'routing_notice',
  'other_response_evidence',
]);
const MIME_EXTENSIONS = new Map([
  ['message/rfc822', '.eml'],
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['text/plain; charset=utf-8', '.txt'],
  ['text/html; charset=utf-8', '.html'],
  ['application/json', '.json'],
  ['application/zip', '.zip'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/octet-stream', '.bin'],
]);

function normalizeRelative(filePath) {
  return path.relative(process.cwd(), path.resolve(filePath)).replaceAll('\\', '/');
}

function isWithin(relativePath, root) {
  return relativePath === root || relativePath.startsWith(`${root}/`);
}

function assertNoSymlinkComponents(filePath) {
  let current = path.resolve(filePath);
  const root = path.parse(current).root;
  while (current !== root) {
    if (fs.existsSync(current)) {
      assert.equal(fs.lstatSync(current).isSymbolicLink(), false,
        `symlink path component is not allowed: ${current}`);
    }
    current = path.dirname(current);
  }
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function requireString(value, label, { maxLength = 512 } = {}) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  const trimmed = value.trim();
  assert.ok(trimmed.length > 0, `${label} must not be empty`);
  assert.ok(trimmed.length <= maxLength, `${label} is too long`);
  assert.equal(/\[[^\]]+\]/u.test(trimmed), false, `${label} still contains a placeholder`);
  return trimmed;
}

function requireOpaqueRecordId(value, label) {
  const recordId = requireString(value, label, { maxLength: 128 });
  assert.match(recordId, /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u,
    `${label} must be an opaque local record ID`);
  return recordId;
}

function requireIsoTimestamp(value, label) {
  const timestamp = requireString(value, label, { maxLength: 32 });
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u,
    `${label} must be a UTC ISO-8601 timestamp`);
  assert.equal(Number.isNaN(Date.parse(timestamp)), false, `${label} is not a valid timestamp`);
  return timestamp;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function requireIsoDate(value, label) {
  const date = requireString(value, label, { maxLength: 10 });
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  assert.ok(match, `${label} must use YYYY-MM-DD`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  assert.ok(month >= 1 && month <= 12, `${label} has an invalid month`);
  assert.ok(day >= 1 && day <= daysInMonth(year, month), `${label} has an invalid day`);
  return date;
}

function requireUniqueEnumList(value, label, allowed, { maxItems = 16, allowEmpty = false } = {}) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  if (!allowEmpty) assert.ok(value.length > 0, `${label} must not be empty`);
  assert.ok(value.length <= maxItems, `${label} may contain at most ${maxItems} values`);
  const rows = value.map((item, index) => {
    const normalized = requireString(item, `${label}[${index}]`, { maxLength: 128 });
    assert.ok(allowed.has(normalized), `unsupported ${label} value: ${normalized}`);
    return normalized;
  });
  assert.equal(new Set(rows).size, rows.length, `${label} contains duplicates`);
  return rows;
}

function assertPrivateRegularFile(filePath, label, { requireLocal = false } = {}) {
  const relative = normalizeRelative(filePath);
  if (requireLocal) {
    assert.ok(isWithin(relative, 'data/local'), `${label} must remain under ignored data/local/: ${relative}`);
  }
  assertNoSymlinkComponents(filePath);
  assert.ok(fs.existsSync(filePath), `${label} does not exist: ${relative}`);
  const stat = fs.statSync(filePath);
  assert.ok(stat.isFile(), `${label} must be a regular file: ${relative}`);
  assert.equal(stat.mode & 0o077, 0, `${label} must not be group- or world-readable: ${relative}`);
  assert.ok(stat.size > 0, `${label} must not be empty: ${relative}`);
  return relative;
}

function assertPrivateDirectory(directory, label) {
  assertNoSymlinkComponents(directory);
  assert.ok(fs.existsSync(directory), `${label} does not exist: ${normalizeRelative(directory)}`);
  const stat = fs.statSync(directory);
  assert.ok(stat.isDirectory(), `${label} must be a directory: ${normalizeRelative(directory)}`);
  assert.equal(stat.mode & 0o077, 0, `${label} must not be group- or world-accessible: ${normalizeRelative(directory)}`);
}

function resolveDeliveryContext(directory) {
  const deliveryDirectory = path.resolve(directory);
  assertPrivateDirectory(deliveryDirectory, 'delivery directory');
  const deliveryContainer = path.dirname(deliveryDirectory);
  assert.equal(path.basename(deliveryContainer), 'delivery',
    'delivery directory must be an immutable child of a delivery/ custody directory');
  const dispatchDirectory = path.dirname(deliveryContainer);
  assertPrivateDirectory(dispatchDirectory, 'dispatch directory');
  const dispatchContainer = path.dirname(dispatchDirectory);
  assert.equal(path.basename(dispatchContainer), 'dispatch',
    'dispatch directory must be an immutable child of a dispatch/ custody directory');
  const sourceDirectory = path.dirname(dispatchContainer);
  const relativeSourceDirectory = normalizeRelative(sourceDirectory);
  assert.ok(relativeSourceDirectory !== DEFAULT_OUTPUT_ROOT && isWithin(relativeSourceDirectory, DEFAULT_OUTPUT_ROOT),
    `source directory must be an immutable child of ignored ${DEFAULT_OUTPUT_ROOT}/: ${relativeSourceDirectory}`);
  assertPrivateDirectory(sourceDirectory, 'source directory');
  return {
    sourceDirectory,
    relativeSourceDirectory,
    dispatchDirectory,
    relativeDispatchDirectory: normalizeRelative(dispatchDirectory),
    deliveryDirectory,
    relativeDeliveryDirectory: normalizeRelative(deliveryDirectory),
  };
}

function readPrivateBytes(filePath, label, options) {
  assertPrivateRegularFile(filePath, label, options);
  return fs.readFileSync(filePath);
}

function readPrivateJson(filePath, label, options) {
  const bytes = readPrivateBytes(filePath, label, options);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`${label} must be valid UTF-8 JSON: ${error.message}`);
  }
  return { bytes, value };
}

function validateMimeBytes(mimeType, bytes, label) {
  if (mimeType === 'application/pdf') {
    assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-', `${label} does not have a PDF signature`);
  } else if (mimeType === 'image/png') {
    assert.equal(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true,
      `${label} does not have a PNG signature`);
  } else if (mimeType === 'image/jpeg') {
    assert.equal(bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff, true,
      `${label} does not have a JPEG signature`);
  } else if (mimeType === 'text/plain; charset=utf-8' || mimeType === 'text/html; charset=utf-8') {
    const text = bytes.toString('utf8');
    assert.equal(Buffer.from(text, 'utf8').equals(bytes), true, `${label} must be canonical UTF-8`);
  } else if (mimeType === 'application/json') {
    const text = bytes.toString('utf8');
    assert.equal(Buffer.from(text, 'utf8').equals(bytes), true, `${label} must be canonical UTF-8`);
    assert.doesNotThrow(() => JSON.parse(text), `${label} must contain valid JSON`);
  } else if (mimeType === 'application/zip'
    || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    assert.equal(bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
      && [0x03, 0x05, 0x07].includes(bytes[2]), true, `${label} does not have a ZIP signature`);
  } else if (mimeType === 'message/rfc822') {
    const sample = bytes.subarray(0, Math.min(bytes.length, 65536)).toString('latin1');
    assert.match(sample, /^(?:From|Sender|Date|Subject|Message-ID|Return-Path):[^\r\n]*$/mi,
      `${label} does not contain a recognizable RFC 822 header`);
    assert.match(sample, /\r?\n\r?\n/u, `${label} does not contain an RFC 822 header/body separator`);
  }
}

export function validateResponseInput(input) {
  assert.equal(input?.schema_version, RESPONSE_INPUT_SCHEMA, 'unexpected response-input schema');
  assert.equal(input?.acquisition_id, ACQUISITION_ID, 'response input acquisition_id mismatch');

  const channel = requireString(input.channel, 'channel', { maxLength: 96 });
  assert.ok(CHANNELS.has(channel), `unsupported response channel: ${channel}`);
  const responseStatus = requireString(input.response_status, 'response_status', { maxLength: 32 });
  assert.equal(responseStatus, 'response_received', 'response_status must be response_received');
  const receivedAt = requireIsoTimestamp(input.received_at, 'received_at');
  const receivedLocalDate = requireIsoDate(input.received_local_date, 'received_local_date');
  const receiptTimeZone = requireString(input.receipt_time_zone, 'receipt_time_zone', { maxLength: 64 });
  assert.equal(receiptTimeZone, 'Europe/London', 'receipt_time_zone must be Europe/London');
  const responseEventRecord = requireOpaqueRecordId(input.response_event_record, 'response_event_record');
  const responseRoute = requireString(input.response_route, 'response_route', { maxLength: 64 });
  assert.ok(RESPONSE_ROUTES.has(responseRoute), `unsupported response_route: ${responseRoute}`);
  const senderRole = requireString(input.sender_role, 'sender_role', { maxLength: 96 });
  assert.ok(SENDER_ROLES.has(senderRole), `unsupported sender_role: ${senderRole}`);
  const assertedSender = requireString(input.asserted_sender, 'asserted_sender', { maxLength: 256 });

  const primaryDisposition = requireString(input.primary_disposition, 'primary_disposition', { maxLength: 128 });
  assert.ok(DISPOSITIONS.has(primaryDisposition), `unsupported primary_disposition: ${primaryDisposition}`);
  const additionalDispositions = requireUniqueEnumList(
    input.additional_dispositions ?? [],
    'additional_dispositions',
    DISPOSITIONS,
    { maxItems: 8, allowEmpty: true },
  );
  assert.equal(additionalDispositions.includes(primaryDisposition), false,
    'additional_dispositions must not repeat primary_disposition');
  const allDispositions = [primaryDisposition, ...additionalDispositions];
  assert.equal(new Set(allDispositions).size, allDispositions.length, 'response dispositions contain duplicates');

  const assertedDocumentCategories = requireUniqueEnumList(
    input.asserted_document_categories,
    'asserted_document_categories',
    DOCUMENT_CATEGORIES,
    { maxItems: 16 },
  );

  assert.ok(Array.isArray(input.evidence_artifacts), 'evidence_artifacts must be an array');
  assert.ok(input.evidence_artifacts.length >= 1, 'evidence_artifacts must not be empty');
  assert.ok(input.evidence_artifacts.length <= 16, 'evidence_artifacts may contain at most sixteen files');
  const seenPaths = new Set();
  const evidenceArtifacts = input.evidence_artifacts.map((row, index) => {
    const role = requireString(row?.role, `evidence_artifacts[${index}].role`, { maxLength: 96 });
    assert.ok(EVIDENCE_ROLES.has(role), `unsupported response evidence role: ${role}`);
    const evidencePath = requireString(row?.path, `evidence_artifacts[${index}].path`, { maxLength: 1024 });
    const normalizedPath = normalizeRelative(evidencePath);
    assert.equal(seenPaths.has(normalizedPath), false, `duplicate response evidence path: ${normalizedPath}`);
    seenPaths.add(normalizedPath);
    const mimeType = requireString(row?.mime_type, `evidence_artifacts[${index}].mime_type`, { maxLength: 128 });
    assert.ok(MIME_EXTENSIONS.has(mimeType), `unsupported response evidence MIME type: ${mimeType}`);
    return { role, path: evidencePath, mimeType };
  });
  assert.ok(evidenceArtifacts.some((row) => PRIMARY_EVIDENCE_ROLES.has(row.role)),
    'evidence_artifacts must contain a primary response evidence role');

  if (responseRoute === 'email') {
    assert.ok(evidenceArtifacts.some((row) => row.role === 'response_message_source' && row.mimeType === 'message/rfc822'),
      'email responses require a response_message_source artifact with message/rfc822 MIME type');
  } else if (responseRoute === 'postal_service') {
    assert.ok(evidenceArtifacts.some((row) => PRIMARY_EVIDENCE_ROLES.has(row.role)
      && row.role !== 'response_message_source'),
    'postal responses require a non-email primary response artifact');
  } else if (responseRoute === 'court_service') {
    assert.ok(evidenceArtifacts.some((row) => row.role === 'court_application_original'),
      'court_service responses require court_application_original evidence');
  } else if (responseRoute === 'in_person_inspection') {
    assert.ok(evidenceArtifacts.some((row) => row.role === 'inspection_offer_or_terms'
      || row.role === 'register_extract'),
    'in_person_inspection responses require inspection terms or a register extract');
  }

  return {
    channel,
    responseStatus,
    receivedAt,
    receivedLocalDate,
    receiptTimeZone,
    responseEventRecord,
    responseRoute,
    senderRole,
    assertedSender,
    primaryDisposition,
    additionalDispositions,
    allDispositions,
    assertedDocumentCategories,
    transactionDocumentCategoryAsserted: assertedDocumentCategories.some(
      (category) => TRANSACTION_DOCUMENT_CATEGORIES.has(category),
    ),
    evidenceArtifacts,
  };
}

function validateSourceManifest(manifest) {
  assert.equal(manifest?.schema_version, FINALIZATION_SCHEMA, 'unexpected source-finalization schema');
  assert.equal(manifest?.acquisition_id, ACQUISITION_ID, 'source-finalization acquisition_id mismatch');
  assert.ok(Array.isArray(manifest.files), 'source manifest files must be an array');
  assert.equal(manifest.files.length, SOURCE_FILES.length, 'source manifest must contain exactly two request sources');
  assert.equal(manifest?.controls?.messages_sent, false);
  assert.equal(manifest?.controls?.canonical_effect, 'none');
  return manifest;
}

function validatePdfManifest(manifest, sourceManifestBytes, sourceManifest) {
  assert.equal(manifest?.schema_version, PDF_RENDERING_SCHEMA, 'unexpected PDF-rendering schema');
  assert.equal(manifest?.acquisition_id, ACQUISITION_ID, 'PDF-rendering acquisition_id mismatch');
  assert.equal(manifest?.source_finalization?.bytes, sourceManifestBytes.length,
    'PDF manifest source-manifest byte length mismatch');
  assert.equal(manifest?.source_finalization?.sha256, sha256(sourceManifestBytes),
    'PDF manifest source-manifest SHA-256 mismatch');
  assert.deepEqual(manifest?.authorization, sourceManifest.authorization,
    'PDF manifest authorization does not match source manifest');
  assert.ok(Array.isArray(manifest.files), 'PDF manifest files must be an array');
  assert.equal(manifest.files.length, SOURCE_FILES.length, 'PDF manifest must contain exactly two request PDFs');
  assert.equal(manifest?.controls?.messages_sent, false);
  assert.equal(manifest?.controls?.canonical_effect, 'none');
  return manifest;
}

function validateDispatchManifest(manifest, context, sourceManifestRecord, pdfManifestRecord) {
  assert.equal(manifest?.schema_version, DISPATCH_CUSTODY_SCHEMA, 'unexpected dispatch-custody schema');
  assert.equal(manifest?.acquisition_id, ACQUISITION_ID, 'dispatch-custody acquisition_id mismatch');
  assert.equal(manifest?.state, 'postal_dispatch_evidence_recorded_delivery_unconfirmed',
    'dispatch custody is not in the expected delivery-unconfirmed state');
  assert.equal(manifest?.source_finalization?.directory, context.relativeSourceDirectory,
    'dispatch manifest source directory mismatch');
  assert.equal(manifest?.source_finalization?.bytes, sourceManifestRecord.bytes.length,
    'dispatch manifest source-manifest byte length mismatch');
  assert.equal(manifest?.source_finalization?.sha256, sha256(sourceManifestRecord.bytes),
    'dispatch manifest source-manifest SHA-256 mismatch');
  assert.equal(manifest?.pdf_rendering?.bytes, pdfManifestRecord.bytes.length,
    'dispatch manifest PDF-manifest byte length mismatch');
  assert.equal(manifest?.pdf_rendering?.sha256, sha256(pdfManifestRecord.bytes),
    'dispatch manifest PDF-manifest SHA-256 mismatch');
  assert.ok(Array.isArray(manifest.evidence_files) && manifest.evidence_files.length >= 1,
    'dispatch manifest must contain dispatch evidence files');
  assert.equal(manifest?.controls?.external_dispatch_assertion_recorded, true);
  assert.equal(manifest?.controls?.canonical_effect, 'none');
  return manifest;
}

function validateDeliveryManifest(manifest, context, sourceManifestRecord, pdfManifestRecord, dispatchManifestRecord) {
  assert.equal(manifest?.schema_version, DELIVERY_CUSTODY_SCHEMA, 'unexpected delivery-custody schema');
  assert.equal(manifest?.acquisition_id, ACQUISITION_ID, 'delivery-custody acquisition_id mismatch');
  assert.equal(manifest?.state, 'postal_delivery_evidence_recorded_operational_checkpoint_calculated',
    'delivery custody is not in the expected operational-checkpoint state');
  assert.equal(manifest?.source_finalization?.directory, context.relativeSourceDirectory,
    'delivery manifest source directory mismatch');
  assert.equal(manifest?.source_finalization?.bytes, sourceManifestRecord.bytes.length,
    'delivery manifest source-manifest byte length mismatch');
  assert.equal(manifest?.source_finalization?.sha256, sha256(sourceManifestRecord.bytes),
    'delivery manifest source-manifest SHA-256 mismatch');
  assert.equal(manifest?.pdf_rendering?.bytes, pdfManifestRecord.bytes.length,
    'delivery manifest PDF-manifest byte length mismatch');
  assert.equal(manifest?.pdf_rendering?.sha256, sha256(pdfManifestRecord.bytes),
    'delivery manifest PDF-manifest SHA-256 mismatch');
  assert.equal(manifest?.dispatch_custody?.directory, context.relativeDispatchDirectory,
    'delivery manifest dispatch directory mismatch');
  assert.equal(manifest?.dispatch_custody?.bytes, dispatchManifestRecord.bytes.length,
    'delivery manifest dispatch-manifest byte length mismatch');
  assert.equal(manifest?.dispatch_custody?.sha256, sha256(dispatchManifestRecord.bytes),
    'delivery manifest dispatch-manifest SHA-256 mismatch');
  assert.ok(Array.isArray(manifest.evidence_files) && manifest.evidence_files.length >= 1,
    'delivery manifest must contain delivery evidence files');
  assert.equal(manifest?.response_checkpoint?.operational_only, true);
  assert.equal(manifest?.response_checkpoint?.legal_deadline_adjudicated, false);
  assert.match(manifest?.response_checkpoint?.checkpoint_date ?? '', /^\d{4}-\d{2}-\d{2}$/u,
    'delivery manifest must contain an operational checkpoint date');
  assert.equal(manifest?.controls?.legal_response_deadline_calculated, false);
  assert.equal(manifest?.controls?.legal_response_deadline, null);
  assert.equal(manifest?.controls?.canonical_effect, 'none');
  return manifest;
}

function verifySourceAndPdfFiles(context, sourceManifest, pdfManifest) {
  for (const definition of SOURCE_FILES) {
    const sourceDescriptor = sourceManifest.files.find((row) => row.path === definition.source);
    assert.ok(sourceDescriptor, `missing source descriptor for ${definition.source}`);
    const sourceBytes = readPrivateBytes(path.join(context.sourceDirectory, definition.source), definition.source);
    assert.equal(sourceBytes.length, sourceDescriptor.bytes, `${definition.source} byte length mismatch`);
    assert.equal(sha256(sourceBytes), sourceDescriptor.sha256, `${definition.source} SHA-256 mismatch`);

    const pdfDescriptor = pdfManifest.files.find((row) => row.path === definition.pdf && row.channel === definition.channel);
    assert.ok(pdfDescriptor, `missing PDF descriptor for ${definition.pdf}`);
    const pdfBytes = readPrivateBytes(path.join(context.sourceDirectory, definition.pdf), definition.pdf);
    assert.equal(pdfBytes.length, pdfDescriptor.bytes, `${definition.pdf} byte length mismatch`);
    assert.equal(sha256(pdfBytes), pdfDescriptor.sha256, `${definition.pdf} SHA-256 mismatch`);
  }
}

function verifyCustodyEvidence(directory, descriptors, labelPrefix) {
  for (const descriptor of descriptors) {
    const filePath = path.join(directory, descriptor.path);
    const bytes = readPrivateBytes(filePath, `${labelPrefix} ${descriptor.role}`);
    assert.equal(bytes.length, descriptor.bytes, `${labelPrefix} ${descriptor.role} byte length mismatch`);
    assert.equal(sha256(bytes), descriptor.sha256, `${labelPrefix} ${descriptor.role} SHA-256 mismatch`);
    validateMimeBytes(descriptor.mime_type, bytes, `${labelPrefix} ${descriptor.role}`);
  }
}

function evidenceDescriptor(artifact, index) {
  const relativeSourcePath = assertPrivateRegularFile(
    artifact.path,
    `response evidence ${artifact.role}`,
    { requireLocal: true },
  );
  const bytes = fs.readFileSync(artifact.path);
  validateMimeBytes(artifact.mimeType, bytes, `response evidence ${artifact.role}`);
  const extension = MIME_EXTENSIONS.get(artifact.mimeType);
  const copiedName = `${String(index + 1).padStart(2, '0')}-${artifact.role}${extension}`;
  return {
    sourcePath: relativeSourcePath,
    copiedName,
    bytes,
    descriptor: {
      path: copiedName,
      role: artifact.role,
      mime_type: artifact.mimeType,
      bytes: bytes.length,
      sha256: sha256(bytes),
    },
  };
}

function privateWrite(filePath, bytes) {
  fs.writeFileSync(filePath, bytes, { mode: 0o600, flag: 'wx' });
  fs.chmodSync(filePath, 0o600);
}

function outputDirectory(deliveryDirectory, normalizedInput) {
  const timestamp = normalizedInput.receivedAt.replaceAll(':', '-').replaceAll('.', '-');
  const eventDigest = sha256(Buffer.from([
    normalizedInput.channel,
    normalizedInput.receivedAt,
    normalizedInput.responseEventRecord,
  ].join('\0'), 'utf8')).slice(0, 12);
  return path.join(deliveryDirectory, RESPONSE_DIRECTORY_NAME, `${timestamp}-${eventDigest}`);
}

export function recordResponseCustody({ deliveryDir, inputPath } = {}) {
  assert.equal(typeof deliveryDir, 'string', '--delivery-dir is required');
  assert.equal(typeof inputPath, 'string', '--input is required');

  const context = resolveDeliveryContext(deliveryDir);
  const inputRecord = readPrivateJson(inputPath, 'response input', { requireLocal: true });
  const normalizedInput = validateResponseInput(inputRecord.value);

  const sourceManifestRecord = readPrivateJson(
    path.join(context.sourceDirectory, SOURCE_MANIFEST_NAME), SOURCE_MANIFEST_NAME);
  const sourceManifest = validateSourceManifest(sourceManifestRecord.value);
  const pdfManifestRecord = readPrivateJson(
    path.join(context.sourceDirectory, PDF_MANIFEST_NAME), PDF_MANIFEST_NAME);
  const pdfManifest = validatePdfManifest(pdfManifestRecord.value, sourceManifestRecord.bytes, sourceManifest);
  const dispatchManifestRecord = readPrivateJson(
    path.join(context.dispatchDirectory, DISPATCH_MANIFEST_NAME), DISPATCH_MANIFEST_NAME);
  const dispatchManifest = validateDispatchManifest(
    dispatchManifestRecord.value, context, sourceManifestRecord, pdfManifestRecord);
  const deliveryManifestRecord = readPrivateJson(
    path.join(context.deliveryDirectory, DELIVERY_MANIFEST_NAME), DELIVERY_MANIFEST_NAME);
  const deliveryManifest = validateDeliveryManifest(
    deliveryManifestRecord.value,
    context,
    sourceManifestRecord,
    pdfManifestRecord,
    dispatchManifestRecord,
  );

  verifySourceAndPdfFiles(context, sourceManifest, pdfManifest);
  verifyCustodyEvidence(context.dispatchDirectory, dispatchManifest.evidence_files, 'dispatch evidence');
  verifyCustodyEvidence(context.deliveryDirectory, deliveryManifest.evidence_files, 'delivery evidence');

  assert.equal(normalizedInput.channel, deliveryManifest.channel,
    'response input channel does not match delivery custody');
  assert.ok(Date.parse(normalizedInput.receivedAt) >= Date.parse(deliveryManifest.delivery.confirmed_delivered_at),
    'response received timestamp cannot precede confirmed delivery');
  assert.ok(normalizedInput.receivedLocalDate >= deliveryManifest.delivery.confirmed_receipt_local_date,
    'response local date cannot precede the delivery receipt local date');

  const evidenceRows = normalizedInput.evidenceArtifacts.map(evidenceDescriptor);
  const checkpointDate = deliveryManifest.response_checkpoint.checkpoint_date;
  const checkpointRelation = normalizedInput.receivedLocalDate <= checkpointDate
    ? 'on_or_before_operational_checkpoint'
    : 'after_operational_checkpoint';
  const responseDirectory = outputDirectory(context.deliveryDirectory, normalizedInput);
  assertNoSymlinkComponents(responseDirectory);
  assert.equal(fs.existsSync(responseDirectory), false,
    `refusing to overwrite existing response custody directory: ${normalizeRelative(responseDirectory)}`);
  fs.mkdirSync(responseDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(responseDirectory, 0o700);

  const assertedSenderBytes = Buffer.from(normalizedInput.assertedSender, 'utf8');
  const manifest = {
    schema_version: RESPONSE_CUSTODY_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: 'response_evidence_recorded_unadjudicated',
    channel: normalizedInput.channel,
    source_finalization: {
      directory: context.relativeSourceDirectory,
      manifest: SOURCE_MANIFEST_NAME,
      bytes: sourceManifestRecord.bytes.length,
      sha256: sha256(sourceManifestRecord.bytes),
      state: sourceManifest.state,
      request_date: sourceManifest.request_date,
    },
    pdf_rendering: {
      manifest: PDF_MANIFEST_NAME,
      bytes: pdfManifestRecord.bytes.length,
      sha256: sha256(pdfManifestRecord.bytes),
      state: pdfManifest.state,
    },
    dispatch_custody: {
      directory: context.relativeDispatchDirectory,
      manifest: DISPATCH_MANIFEST_NAME,
      bytes: dispatchManifestRecord.bytes.length,
      sha256: sha256(dispatchManifestRecord.bytes),
      state: dispatchManifest.state,
      declared_dispatched_at: dispatchManifest.dispatch.declared_dispatched_at,
      outbound_document: dispatchManifest.pdf_rendering.outbound_document,
      evidence_files: dispatchManifest.evidence_files,
    },
    delivery_custody: {
      directory: context.relativeDeliveryDirectory,
      manifest: DELIVERY_MANIFEST_NAME,
      bytes: deliveryManifestRecord.bytes.length,
      sha256: sha256(deliveryManifestRecord.bytes),
      state: deliveryManifest.state,
      confirmed_delivered_at: deliveryManifest.delivery.confirmed_delivered_at,
      confirmed_receipt_local_date: deliveryManifest.delivery.confirmed_receipt_local_date,
      operational_response_checkpoint: deliveryManifest.response_checkpoint.checkpoint_date,
      evidence_files: deliveryManifest.evidence_files,
    },
    response: {
      response_status: normalizedInput.responseStatus,
      received_at: normalizedInput.receivedAt,
      received_local_date: normalizedInput.receivedLocalDate,
      receipt_time_zone: normalizedInput.receiptTimeZone,
      event_record: normalizedInput.responseEventRecord,
      response_route: normalizedInput.responseRoute,
      sender_role: normalizedInput.senderRole,
      asserted_sender_present: true,
      asserted_sender_bytes: assertedSenderBytes.length,
      asserted_sender_sha256: sha256(assertedSenderBytes),
      primary_disposition: normalizedInput.primaryDisposition,
      additional_dispositions: normalizedInput.additionalDispositions,
      all_dispositions: normalizedInput.allDispositions,
      asserted_document_categories: normalizedInput.assertedDocumentCategories,
      transaction_document_category_asserted: normalizedInput.transactionDocumentCategoryAsserted,
    },
    checkpoint_relation: {
      operational_checkpoint_date: checkpointDate,
      received_local_date: normalizedInput.receivedLocalDate,
      relation: checkpointRelation,
      chronology_only: true,
      legal_timeliness_adjudicated: false,
    },
    evidence_files: evidenceRows.map((row) => row.descriptor),
    controls: {
      response_input_copied_to_output: false,
      requester_name_address_email_in_manifest: false,
      raw_tracking_reference_in_manifest: false,
      asserted_sender_in_manifest: false,
      source_chain_verified: true,
      dispatch_manifest_verified: true,
      dispatch_proof_files_verified: true,
      delivery_manifest_verified: true,
      delivery_evidence_files_verified: true,
      response_evidence_copied: true,
      external_response_assertion_recorded: true,
      response_authenticity_verified_by_tool: false,
      sender_identity_verified_by_tool: false,
      document_categories_verified_by_tool: false,
      disposition_classification_verified_by_tool: false,
      operational_checkpoint_relation_calculated: true,
      legal_timeliness_adjudicated: false,
      legal_response_deadline_calculated: false,
      legal_response_deadline: null,
      statutory_compliance_adjudicated: false,
      court_application_merits_adjudicated: false,
      no_response_inferred: false,
      register_contents_adjudicated: false,
      transaction_instrument_contents_adjudicated: false,
      allottee_identity_adjudicated: false,
      beneficial_ownership_adjudicated: false,
      rights_exercise_adjudicated: false,
      actor_hop_adjudicated: false,
      network_calls_performed: false,
      messages_sent_by_tool: false,
      canonical_effect: 'none',
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const created = [];
  try {
    for (const row of evidenceRows) {
      const outputPath = path.join(responseDirectory, row.copiedName);
      privateWrite(outputPath, row.bytes);
      created.push(outputPath);
    }
    const manifestPath = path.join(responseDirectory, RESPONSE_MANIFEST_NAME);
    privateWrite(manifestPath, manifestBytes);
    created.push(manifestPath);
  } catch (error) {
    fs.rmSync(responseDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    state: manifest.state,
    channel: manifest.channel,
    delivery_dir: context.relativeDeliveryDirectory,
    response_dir: normalizeRelative(responseDirectory),
    manifest_path: normalizeRelative(path.join(responseDirectory, RESPONSE_MANIFEST_NAME)),
    evidence_files: manifest.evidence_files,
    checkpoint_relation: checkpointRelation,
    legal_response_deadline: null,
    canonical_effect: 'none',
  };
}
