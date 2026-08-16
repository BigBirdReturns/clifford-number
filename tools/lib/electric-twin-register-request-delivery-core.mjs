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

export const DELIVERY_INPUT_SCHEMA = 'electric-twin-register-request-delivery-input@1';
export const DELIVERY_CUSTODY_SCHEMA = 'electric-twin-register-request-delivery-custody@1';
export const DELIVERY_MANIFEST_NAME = 'outbound-delivery-manifest.json';
export const DELIVERY_DIRECTORY_NAME = 'delivery';
export const COUNTING_RULE = 'first_eligible_day_after_receipt_is_day_1';

const CHANNELS = new Set([
  'statutory_register_request',
  'voluntary_transaction_instrument_request',
]);
const DELIVERY_LOCATION_CLASSES = new Set([
  'registered_office',
  'verified_register_inspection_location',
  'company_confirmed_receipt_location',
]);
const DELIVERY_EVIDENCE_ROLES = new Set([
  'carrier_delivery_confirmation',
  'carrier_tracking_export',
  'proof_of_signature',
  'other_delivery_evidence',
]);
const MIME_EXTENSIONS = new Map([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['text/plain; charset=utf-8', '.txt'],
  ['application/octet-stream', '.bin'],
]);
const REQUIRED_WORKING_DAYS = 5;

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
      assert.equal(fs.lstatSync(current).isSymbolicLink(), false, `symlink path component is not allowed: ${current}`);
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
  assert.match(recordId, /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u, `${label} must be an opaque local record ID`);
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

function daysFromCivil(year, month, day) {
  let adjustedYear = year;
  if (month <= 2) adjustedYear -= 1;
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const monthPrime = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(serialDay) {
  const shifted = serialDay + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524)
    - Math.floor(dayOfEra / 146096)) / 365);
  let year = yearOfEra + era * 400;
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime + (monthPrime < 10 ? 3 : -9);
  if (month <= 2) year += 1;
  return { year, month, day };
}

function formatIsoDate(parts) {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
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
  return { text: date, year, month, day, serial: daysFromCivil(year, month, day) };
}

function requireHttpsUrls(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  assert.ok(value.length >= 2, `${label} must contain at least two official source URLs`);
  const urls = value.map((item, index) => {
    const normalized = requireString(item, `${label}[${index}]`, { maxLength: 1024 });
    const parsed = new URL(normalized);
    assert.equal(parsed.protocol, 'https:', `${label}[${index}] must use HTTPS`);
    return normalized;
  });
  assert.ok(urls.some((url) => url.includes('legislation.gov.uk/ukpga/2006/46/section/117')),
    `${label} must include the Companies Act 2006 section 117 route`);
  assert.ok(urls.some((url) => url.includes('gov.uk/bank-holidays')),
    `${label} must include the GOV.UK bank-holidays route`);
  return urls;
}

function requireNonWorkingDates(value) {
  assert.ok(Array.isArray(value), 'working_day_calendar.non_working_dates must be an array');
  assert.ok(value.length <= 64, 'working_day_calendar.non_working_dates may contain at most 64 dates');
  const rows = value.map((item, index) => requireIsoDate(item,
    `working_day_calendar.non_working_dates[${index}]`).text);
  assert.equal(new Set(rows).size, rows.length, 'working_day_calendar.non_working_dates contains duplicates');
  return [...rows].sort();
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

function resolveDispatchContext(directory) {
  const dispatchDirectory = path.resolve(directory);
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
    dispatchDirectory,
    relativeDispatchDirectory: normalizeRelative(dispatchDirectory),
    sourceDirectory,
    relativeSourceDirectory,
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
  } else if (mimeType === 'text/plain; charset=utf-8') {
    const text = bytes.toString('utf8');
    assert.equal(Buffer.from(text, 'utf8').equals(bytes), true, `${label} must be canonical UTF-8`);
  }
}

export function validateDeliveryInput(input) {
  assert.equal(input?.schema_version, DELIVERY_INPUT_SCHEMA, 'unexpected delivery-input schema');
  assert.equal(input?.acquisition_id, ACQUISITION_ID, 'delivery input acquisition_id mismatch');

  const channel = requireString(input.channel, 'channel', { maxLength: 96 });
  assert.ok(CHANNELS.has(channel), `unsupported delivery channel: ${channel}`);
  const deliveryStatus = requireString(input.delivery_status, 'delivery_status', { maxLength: 32 });
  assert.equal(deliveryStatus, 'delivered', 'delivery_status must be delivered');
  const confirmedDeliveredAt = requireIsoTimestamp(input.confirmed_delivered_at, 'confirmed_delivered_at');
  const confirmedReceiptLocalDate = requireIsoDate(input.confirmed_receipt_local_date, 'confirmed_receipt_local_date');
  const receiptTimeZone = requireString(input.receipt_time_zone, 'receipt_time_zone', { maxLength: 64 });
  assert.equal(receiptTimeZone, 'Europe/London', 'receipt_time_zone must be Europe/London');
  const deliveryEventRecord = requireOpaqueRecordId(input.delivery_event_record, 'delivery_event_record');
  const trackingReference = requireString(input.tracking_reference, 'tracking_reference', { maxLength: 256 });
  const serviceProvider = requireString(input.service_provider, 'service_provider', { maxLength: 160 });
  const deliveryLocationClass = requireString(input.delivery_location_class, 'delivery_location_class', { maxLength: 96 });
  assert.ok(DELIVERY_LOCATION_CLASSES.has(deliveryLocationClass),
    `unsupported delivery_location_class: ${deliveryLocationClass}`);

  assert.ok(Array.isArray(input.evidence_artifacts), 'evidence_artifacts must be an array');
  assert.ok(input.evidence_artifacts.length >= 1, 'evidence_artifacts must not be empty');
  assert.ok(input.evidence_artifacts.length <= 8, 'evidence_artifacts may contain at most eight files');
  const seenRoles = new Set();
  const seenPaths = new Set();
  const evidenceArtifacts = input.evidence_artifacts.map((row, index) => {
    const role = requireString(row?.role, `evidence_artifacts[${index}].role`, { maxLength: 96 });
    assert.ok(DELIVERY_EVIDENCE_ROLES.has(role), `unsupported delivery evidence role: ${role}`);
    assert.equal(seenRoles.has(role), false, `duplicate delivery evidence role: ${role}`);
    seenRoles.add(role);
    const evidencePath = requireString(row?.path, `evidence_artifacts[${index}].path`, { maxLength: 1024 });
    const normalizedPath = normalizeRelative(evidencePath);
    assert.equal(seenPaths.has(normalizedPath), false, `duplicate delivery evidence path: ${normalizedPath}`);
    seenPaths.add(normalizedPath);
    const mimeType = requireString(row?.mime_type, `evidence_artifacts[${index}].mime_type`, { maxLength: 96 });
    assert.ok(MIME_EXTENSIONS.has(mimeType), `unsupported delivery evidence MIME type: ${mimeType}`);
    return { role, path: evidencePath, mimeType };
  });
  assert.equal(seenRoles.has('carrier_delivery_confirmation'), true,
    'evidence_artifacts must contain carrier_delivery_confirmation');

  const calendar = input.working_day_calendar ?? {};
  const jurisdiction = requireString(calendar.jurisdiction, 'working_day_calendar.jurisdiction', { maxLength: 96 });
  assert.equal(jurisdiction, 'England and Wales', 'working_day_calendar.jurisdiction must be England and Wales');
  const timeZone = requireString(calendar.time_zone, 'working_day_calendar.time_zone', { maxLength: 64 });
  assert.equal(timeZone, receiptTimeZone, 'working-day calendar time zone must match receipt_time_zone');
  const calendarRecord = requireOpaqueRecordId(calendar.calendar_record, 'working_day_calendar.calendar_record');
  const reviewedAt = requireIsoDate(calendar.reviewed_at, 'working_day_calendar.reviewed_at');
  const sourceUrls = requireHttpsUrls(calendar.source_urls, 'working_day_calendar.source_urls');
  const countingRule = requireString(calendar.counting_rule, 'working_day_calendar.counting_rule', { maxLength: 96 });
  assert.equal(countingRule, COUNTING_RULE, `working_day_calendar.counting_rule must be ${COUNTING_RULE}`);
  const nonWorkingDates = requireNonWorkingDates(calendar.non_working_dates);

  return {
    channel,
    deliveryStatus,
    confirmedDeliveredAt,
    confirmedReceiptLocalDate,
    receiptTimeZone,
    deliveryEventRecord,
    trackingReference,
    serviceProvider,
    deliveryLocationClass,
    evidenceArtifacts,
    calendar: {
      jurisdiction,
      timeZone,
      calendarRecord,
      reviewedAt,
      sourceUrls,
      countingRule,
      nonWorkingDates,
    },
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
  assert.equal(manifest?.controls?.delivery_confirmed, false);
  assert.equal(manifest?.controls?.response_deadline_calculated, false);
  assert.equal(manifest?.controls?.response_deadline, null);
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

function verifyDispatchEvidence(context, dispatchManifest) {
  for (const descriptor of dispatchManifest.evidence_files) {
    const filePath = path.join(context.dispatchDirectory, descriptor.path);
    const bytes = readPrivateBytes(filePath, `dispatch evidence ${descriptor.role}`);
    assert.equal(bytes.length, descriptor.bytes, `dispatch evidence ${descriptor.role} byte length mismatch`);
    assert.equal(sha256(bytes), descriptor.sha256, `dispatch evidence ${descriptor.role} SHA-256 mismatch`);
    validateMimeBytes(descriptor.mime_type, bytes, `dispatch evidence ${descriptor.role}`);
  }
}

function evidenceDescriptor(artifact, index) {
  const relativeSourcePath = assertPrivateRegularFile(
    artifact.path,
    `delivery evidence ${artifact.role}`,
    { requireLocal: true },
  );
  const bytes = fs.readFileSync(artifact.path);
  validateMimeBytes(artifact.mimeType, bytes, `delivery evidence ${artifact.role}`);
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

function computeResponseCheckpoint(receiptDate, nonWorkingDates) {
  const excluded = new Set(nonWorkingDates);
  const countedWorkingDates = [];
  let serial = receiptDate.serial;
  let scanned = 0;
  while (countedWorkingDates.length < REQUIRED_WORKING_DAYS) {
    serial += 1;
    scanned += 1;
    assert.ok(scanned <= 370, 'working-day calendar did not produce a checkpoint within 370 days');
    const parts = civilFromDays(serial);
    const date = formatIsoDate(parts);
    const weekday = ((serial + 4) % 7 + 7) % 7;
    const weekend = weekday === 0 || weekday === 6;
    if (weekend || excluded.has(date)) continue;
    countedWorkingDates.push(date);
  }
  return {
    countedWorkingDates,
    checkpointDate: countedWorkingDates.at(-1),
  };
}

function privateWrite(filePath, bytes) {
  fs.writeFileSync(filePath, bytes, { mode: 0o600, flag: 'wx' });
  fs.chmodSync(filePath, 0o600);
}

function outputDirectory(dispatchDirectory, normalizedInput) {
  const timestamp = normalizedInput.confirmedDeliveredAt.replaceAll(':', '-').replaceAll('.', '-');
  const eventDigest = sha256(Buffer.from([
    normalizedInput.channel,
    normalizedInput.confirmedDeliveredAt,
    normalizedInput.deliveryEventRecord,
  ].join('\0'), 'utf8')).slice(0, 12);
  return path.join(dispatchDirectory, DELIVERY_DIRECTORY_NAME, `${timestamp}-${eventDigest}`);
}

export function recordDeliveryCustody({ dispatchDir, inputPath } = {}) {
  assert.equal(typeof dispatchDir, 'string', '--dispatch-dir is required');
  assert.equal(typeof inputPath, 'string', '--input is required');

  const context = resolveDispatchContext(dispatchDir);
  const inputRecord = readPrivateJson(inputPath, 'delivery input', { requireLocal: true });
  const normalizedInput = validateDeliveryInput(inputRecord.value);

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

  verifySourceAndPdfFiles(context, sourceManifest, pdfManifest);
  verifyDispatchEvidence(context, dispatchManifest);

  assert.equal(normalizedInput.channel, dispatchManifest.channel,
    'delivery input channel does not match dispatch custody');
  assert.equal(normalizedInput.serviceProvider, dispatchManifest.dispatch.service_provider,
    'delivery input service_provider does not match dispatch custody');
  assert.ok(Date.parse(normalizedInput.confirmedDeliveredAt) >= Date.parse(dispatchManifest.dispatch.declared_dispatched_at),
    'confirmed delivery timestamp cannot precede declared dispatch');

  const trackingBytes = Buffer.from(normalizedInput.trackingReference, 'utf8');
  assert.equal(trackingBytes.length, dispatchManifest.dispatch.tracking_reference_bytes,
    'tracking reference byte length does not match dispatch custody');
  assert.equal(sha256(trackingBytes), dispatchManifest.dispatch.tracking_reference_sha256,
    'tracking reference does not match dispatch custody');

  const evidenceRows = normalizedInput.evidenceArtifacts.map(evidenceDescriptor);
  const checkpoint = computeResponseCheckpoint(
    normalizedInput.confirmedReceiptLocalDate,
    normalizedInput.calendar.nonWorkingDates,
  );
  const deliveryDirectory = outputDirectory(context.dispatchDirectory, normalizedInput);
  assertNoSymlinkComponents(deliveryDirectory);
  assert.equal(fs.existsSync(deliveryDirectory), false,
    `refusing to overwrite existing delivery custody directory: ${normalizeRelative(deliveryDirectory)}`);
  fs.mkdirSync(deliveryDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(deliveryDirectory, 0o700);

  const manifest = {
    schema_version: DELIVERY_CUSTODY_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: 'postal_delivery_evidence_recorded_operational_checkpoint_calculated',
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
      service_provider: dispatchManifest.dispatch.service_provider,
      service_level: dispatchManifest.dispatch.service_level,
      outbound_document: dispatchManifest.pdf_rendering.outbound_document,
      evidence_files: dispatchManifest.evidence_files,
    },
    delivery: {
      delivery_status: normalizedInput.deliveryStatus,
      confirmed_delivered_at: normalizedInput.confirmedDeliveredAt,
      confirmed_receipt_local_date: normalizedInput.confirmedReceiptLocalDate.text,
      receipt_time_zone: normalizedInput.receiptTimeZone,
      event_record: normalizedInput.deliveryEventRecord,
      service_provider: normalizedInput.serviceProvider,
      delivery_location_class: normalizedInput.deliveryLocationClass,
      tracking_reference_present: true,
      tracking_reference_bytes: trackingBytes.length,
      tracking_reference_sha256: sha256(trackingBytes),
    },
    working_day_calendar: {
      jurisdiction: normalizedInput.calendar.jurisdiction,
      time_zone: normalizedInput.calendar.timeZone,
      calendar_record: normalizedInput.calendar.calendarRecord,
      reviewed_at: normalizedInput.calendar.reviewedAt.text,
      source_urls: normalizedInput.calendar.sourceUrls,
      weekend_days: ['Saturday', 'Sunday'],
      non_working_dates: normalizedInput.calendar.nonWorkingDates,
      counting_rule: normalizedInput.calendar.countingRule,
      calendar_supplied_by_custodian: true,
      calendar_completeness_verified_by_tool: false,
    },
    response_checkpoint: {
      statutory_reference: 'Companies Act 2006 section 117(1)',
      required_working_days: REQUIRED_WORKING_DAYS,
      receipt_local_date: normalizedInput.confirmedReceiptLocalDate.text,
      counted_working_dates: checkpoint.countedWorkingDates,
      checkpoint_date: checkpoint.checkpointDate,
      exact_expiry_time: null,
      operational_only: true,
      legal_deadline_adjudicated: false,
    },
    evidence_files: evidenceRows.map((row) => row.descriptor),
    controls: {
      delivery_input_copied_to_output: false,
      requester_name_address_email_in_manifest: false,
      tracking_reference_in_manifest: false,
      source_chain_verified: true,
      dispatch_manifest_verified: true,
      dispatch_proof_files_verified: true,
      outbound_pdf_verified_through_dispatch_chain: true,
      delivery_evidence_copied: true,
      external_delivery_assertion_recorded: true,
      carrier_authenticity_verified_by_tool: false,
      delivery_confirmed_by_tool: false,
      statutory_receipt_adjudicated: false,
      receipt_local_date_supplied_by_custodian: true,
      timezone_conversion_verified_by_tool: false,
      operational_response_checkpoint_calculated: true,
      legal_response_deadline_calculated: false,
      legal_response_deadline: null,
      exact_expiry_time_established: false,
      network_calls_performed: false,
      messages_sent_by_tool: false,
      postal_dispatch_performed_by_tool: false,
      canonical_effect: 'none',
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const created = [];
  try {
    for (const row of evidenceRows) {
      const outputPath = path.join(deliveryDirectory, row.copiedName);
      privateWrite(outputPath, row.bytes);
      created.push(outputPath);
    }
    const manifestPath = path.join(deliveryDirectory, DELIVERY_MANIFEST_NAME);
    privateWrite(manifestPath, manifestBytes);
    created.push(manifestPath);
  } catch (error) {
    fs.rmSync(deliveryDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    state: manifest.state,
    channel: manifest.channel,
    dispatch_dir: context.relativeDispatchDirectory,
    delivery_dir: normalizeRelative(deliveryDirectory),
    manifest_path: normalizeRelative(path.join(deliveryDirectory, DELIVERY_MANIFEST_NAME)),
    evidence_files: manifest.evidence_files,
    operational_response_checkpoint: checkpoint.checkpointDate,
    legal_response_deadline: null,
    messages_sent_by_tool: false,
  };
}
