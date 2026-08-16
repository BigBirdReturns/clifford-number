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

export const DISPATCH_INPUT_SCHEMA = 'electric-twin-register-request-dispatch-input@1';
export const DISPATCH_CUSTODY_SCHEMA = 'electric-twin-register-request-dispatch-custody@1';
export const DISPATCH_MANIFEST_NAME = 'outbound-dispatch-manifest.json';
export const DISPATCH_DIRECTORY_NAME = 'dispatch';

const CHANNELS = new Map([
  ['statutory_register_request', {
    authorizationFlag: 'statutory_dispatch_authorized',
    authorizationRecord: 'statutory_dispatch_record',
    pdf: 'statutory-register-of-members-request.pdf',
  }],
  ['voluntary_transaction_instrument_request', {
    authorizationFlag: 'voluntary_dispatch_authorized',
    authorizationRecord: 'voluntary_dispatch_record',
    pdf: 'voluntary-transaction-instrument-request.pdf',
  }],
]);

const PROOF_ROLES = new Set([
  'postal_proof_of_dispatch',
  'postal_receipt',
  'postal_label',
  'carrier_confirmation_export',
  'other_dispatch_evidence',
]);

const MIME_EXTENSIONS = new Map([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['text/plain; charset=utf-8', '.txt'],
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
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u, `${label} must be a UTC ISO-8601 timestamp`);
  assert.equal(Number.isNaN(Date.parse(timestamp)), false, `${label} is not a valid timestamp`);
  return timestamp;
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

function assertPrivateSourceDirectory(directory) {
  const relative = normalizeRelative(directory);
  assert.ok(relative !== DEFAULT_OUTPUT_ROOT && isWithin(relative, DEFAULT_OUTPUT_ROOT),
    `source directory must be an immutable child of ignored ${DEFAULT_OUTPUT_ROOT}/: ${relative}`);
  assertNoSymlinkComponents(directory);
  assert.ok(fs.existsSync(directory), `source directory does not exist: ${relative}`);
  const stat = fs.statSync(directory);
  assert.ok(stat.isDirectory(), `source directory must be a directory: ${relative}`);
  assert.equal(stat.mode & 0o077, 0, `source directory must not be group- or world-accessible: ${relative}`);
  return relative;
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

export function validateDispatchInput(input) {
  assert.equal(input?.schema_version, DISPATCH_INPUT_SCHEMA, 'unexpected dispatch-input schema');
  assert.equal(input?.acquisition_id, ACQUISITION_ID, 'dispatch input acquisition_id mismatch');

  const channel = requireString(input.channel, 'channel', { maxLength: 96 });
  const channelDefinition = CHANNELS.get(channel);
  assert.ok(channelDefinition, `unsupported dispatch channel: ${channel}`);

  const method = requireString(input.method, 'method', { maxLength: 64 });
  assert.equal(method, 'postal_service', 'dispatch method must be postal_service');

  const declaredDispatchedAt = requireIsoTimestamp(input.declared_dispatched_at, 'declared_dispatched_at');
  const dispatchEventRecord = requireOpaqueRecordId(input.dispatch_event_record, 'dispatch_event_record');
  const authorizationRecord = requireOpaqueRecordId(input.authorization_record, 'authorization_record');
  const serviceProvider = requireString(input.service_provider, 'service_provider', { maxLength: 160 });
  const serviceLevel = requireString(input.service_level, 'service_level', { maxLength: 160 });
  const trackingReference = requireString(input.tracking_reference, 'tracking_reference', { maxLength: 256 });

  assert.ok(Array.isArray(input.proof_artifacts), 'proof_artifacts must be an array');
  assert.ok(input.proof_artifacts.length >= 1, 'proof_artifacts must not be empty');
  assert.ok(input.proof_artifacts.length <= 8, 'proof_artifacts may contain at most eight files');

  const seenRoles = new Set();
  const seenPaths = new Set();
  const proofArtifacts = input.proof_artifacts.map((row, index) => {
    const role = requireString(row?.role, `proof_artifacts[${index}].role`, { maxLength: 96 });
    assert.ok(PROOF_ROLES.has(role), `unsupported proof role: ${role}`);
    assert.equal(seenRoles.has(role), false, `duplicate proof role: ${role}`);
    seenRoles.add(role);

    const proofPath = requireString(row?.path, `proof_artifacts[${index}].path`, { maxLength: 1024 });
    const normalizedPath = normalizeRelative(proofPath);
    assert.equal(seenPaths.has(normalizedPath), false, `duplicate proof path: ${normalizedPath}`);
    seenPaths.add(normalizedPath);

    const mimeType = requireString(row?.mime_type, `proof_artifacts[${index}].mime_type`, { maxLength: 96 });
    assert.ok(MIME_EXTENSIONS.has(mimeType), `unsupported proof MIME type: ${mimeType}`);

    return { role, path: proofPath, mimeType };
  });

  assert.equal(seenRoles.has('postal_proof_of_dispatch'), true,
    'proof_artifacts must contain postal_proof_of_dispatch');

  return {
    channel,
    channelDefinition,
    method,
    declaredDispatchedAt,
    dispatchEventRecord,
    authorizationRecord,
    serviceProvider,
    serviceLevel,
    trackingReference,
    proofArtifacts,
  };
}

function validateSourceManifest(sourceManifest) {
  assert.equal(sourceManifest?.schema_version, FINALIZATION_SCHEMA, 'unexpected source-finalization schema');
  assert.equal(sourceManifest?.acquisition_id, ACQUISITION_ID, 'source-finalization acquisition_id mismatch');
  assert.ok(Array.isArray(sourceManifest.files), 'source manifest files must be an array');
  assert.equal(sourceManifest.files.length, SOURCE_FILES.length, 'source manifest must contain exactly two request sources');
  assert.equal(sourceManifest?.controls?.messages_sent, false);
  assert.equal(sourceManifest?.controls?.postal_dispatch_performed, false);
  assert.equal(sourceManifest?.controls?.routing_email_sent, false);
  assert.equal(sourceManifest?.controls?.response_deadline_calculated, false);
  assert.equal(sourceManifest?.controls?.response_deadline, null);
  assert.equal(sourceManifest?.controls?.canonical_effect, 'none');
  return sourceManifest;
}

function validatePdfManifest(pdfManifest, sourceManifestBytes, sourceManifest) {
  assert.equal(pdfManifest?.schema_version, PDF_RENDERING_SCHEMA, 'unexpected PDF-rendering schema');
  assert.equal(pdfManifest?.acquisition_id, ACQUISITION_ID, 'PDF-rendering acquisition_id mismatch');
  assert.equal(pdfManifest?.state, 'pdfs_rendered_not_dispatched', 'PDF rendering is not in the expected no-send state');
  assert.equal(pdfManifest?.source_finalization?.manifest, SOURCE_MANIFEST_NAME);
  assert.equal(pdfManifest?.source_finalization?.bytes, sourceManifestBytes.length,
    'PDF manifest source-manifest byte length mismatch');
  assert.equal(pdfManifest?.source_finalization?.sha256, sha256(sourceManifestBytes),
    'PDF manifest source-manifest SHA-256 mismatch');
  assert.deepEqual(pdfManifest?.authorization, sourceManifest.authorization,
    'PDF manifest authorization does not match source manifest');
  assert.ok(Array.isArray(pdfManifest.files), 'PDF manifest files must be an array');
  assert.equal(pdfManifest.files.length, SOURCE_FILES.length, 'PDF manifest must contain exactly two request PDFs');
  assert.equal(pdfManifest?.controls?.source_files_verified_against_manifest, true);
  assert.equal(pdfManifest?.controls?.messages_sent, false);
  assert.equal(pdfManifest?.controls?.dispatch_ready, false);
  assert.equal(pdfManifest?.controls?.postal_dispatch_performed, false);
  assert.equal(pdfManifest?.controls?.routing_email_sent, false);
  assert.equal(pdfManifest?.controls?.response_deadline_calculated, false);
  assert.equal(pdfManifest?.controls?.response_deadline, null);
  assert.equal(pdfManifest?.controls?.canonical_effect, 'none');
  return pdfManifest;
}

function verifySourceFiles(sourceDirectory, sourceManifest) {
  for (const definition of SOURCE_FILES) {
    const descriptors = sourceManifest.files.filter((row) => row.path === definition.source);
    assert.equal(descriptors.length, 1, `expected one source descriptor for ${definition.source}`);
    const descriptor = descriptors[0];
    const sourcePath = path.join(sourceDirectory, definition.source);
    const bytes = readPrivateBytes(sourcePath, definition.source);
    assert.equal(bytes.length, descriptor.bytes, `${definition.source} byte length does not match source manifest`);
    assert.equal(sha256(bytes), descriptor.sha256, `${definition.source} SHA-256 does not match source manifest`);
  }
}

function verifyOutboundPdf(sourceDirectory, pdfManifest, normalizedInput) {
  const descriptors = pdfManifest.files.filter((row) =>
    row.channel === normalizedInput.channel && row.path === normalizedInput.channelDefinition.pdf);
  assert.equal(descriptors.length, 1, `expected one PDF descriptor for ${normalizedInput.channel}`);
  const descriptor = descriptors[0];
  assert.equal(descriptor.mime_type, 'application/pdf');
  assert.ok(Number.isInteger(descriptor.pages) && descriptor.pages >= 1, 'outbound PDF page count must be positive');
  const pdfPath = path.join(sourceDirectory, descriptor.path);
  const bytes = readPrivateBytes(pdfPath, descriptor.path);
  assert.equal(bytes.length, descriptor.bytes, `${descriptor.path} byte length does not match PDF manifest`);
  assert.equal(sha256(bytes), descriptor.sha256, `${descriptor.path} SHA-256 does not match PDF manifest`);
  assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-', `${descriptor.path} does not have a PDF signature`);
  return {
    path: descriptor.path,
    channel: descriptor.channel,
    mime_type: descriptor.mime_type,
    bytes: descriptor.bytes,
    sha256: descriptor.sha256,
    pages: descriptor.pages,
  };
}

function verifyAuthorization(sourceManifest, normalizedInput) {
  const { authorizationFlag, authorizationRecord } = normalizedInput.channelDefinition;
  assert.equal(sourceManifest?.authorization?.[authorizationFlag], true,
    `${normalizedInput.channel} is not authorized for dispatch`);
  const recordedAuthorization = requireOpaqueRecordId(
    sourceManifest?.authorization?.[authorizationRecord],
    `sourceManifest.authorization.${authorizationRecord}`,
  );
  assert.equal(normalizedInput.authorizationRecord, recordedAuthorization,
    'dispatch input authorization_record does not match source finalization');
  return recordedAuthorization;
}

function proofDescriptor(artifact, index) {
  const relativeSourcePath = assertPrivateRegularFile(
    artifact.path,
    `proof artifact ${artifact.role}`,
    { requireLocal: true },
  );
  const bytes = fs.readFileSync(artifact.path);
  validateMimeBytes(artifact.mimeType, bytes, `proof artifact ${artifact.role}`);
  const extension = MIME_EXTENSIONS.get(artifact.mimeType);
  const copiedName = `${String(index + 1).padStart(2, '0')}-${artifact.role}${extension}`;
  return {
    role: artifact.role,
    sourcePath: relativeSourcePath,
    copiedName,
    mimeType: artifact.mimeType,
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

function outputDirectory(sourceDirectory, normalizedInput) {
  const timestamp = normalizedInput.declaredDispatchedAt.replaceAll(':', '-').replaceAll('.', '-');
  const eventDigest = sha256(Buffer.from([
    normalizedInput.channel,
    normalizedInput.declaredDispatchedAt,
    normalizedInput.dispatchEventRecord,
  ].join('\0'), 'utf8')).slice(0, 12);
  return path.join(
    sourceDirectory,
    DISPATCH_DIRECTORY_NAME,
    `${normalizedInput.channel}-${timestamp}-${eventDigest}`,
  );
}

export function recordDispatchCustody({ sourceDir, inputPath } = {}) {
  assert.equal(typeof sourceDir, 'string', '--source-dir is required');
  assert.equal(typeof inputPath, 'string', '--input is required');

  const sourceDirectory = path.resolve(sourceDir);
  const relativeSourceDirectory = assertPrivateSourceDirectory(sourceDirectory);
  const input = readPrivateJson(inputPath, 'dispatch input', { requireLocal: true });
  const normalizedInput = validateDispatchInput(input.value);

  const sourceManifestPath = path.join(sourceDirectory, SOURCE_MANIFEST_NAME);
  const sourceManifestRecord = readPrivateJson(sourceManifestPath, SOURCE_MANIFEST_NAME);
  const sourceManifest = validateSourceManifest(sourceManifestRecord.value);

  const pdfManifestPath = path.join(sourceDirectory, PDF_MANIFEST_NAME);
  const pdfManifestRecord = readPrivateJson(pdfManifestPath, PDF_MANIFEST_NAME);
  const pdfManifest = validatePdfManifest(pdfManifestRecord.value, sourceManifestRecord.bytes, sourceManifest);

  verifySourceFiles(sourceDirectory, sourceManifest);
  const outboundPdf = verifyOutboundPdf(sourceDirectory, pdfManifest, normalizedInput);
  const authorizationRecord = verifyAuthorization(sourceManifest, normalizedInput);
  assert.ok(normalizedInput.declaredDispatchedAt.slice(0, 10) >= sourceManifest.request_date,
    'declared dispatch date cannot precede the request date');

  const proofRows = normalizedInput.proofArtifacts.map(proofDescriptor);
  const dispatchDirectory = outputDirectory(sourceDirectory, normalizedInput);
  assertNoSymlinkComponents(dispatchDirectory);
  assert.equal(fs.existsSync(dispatchDirectory), false,
    `refusing to overwrite existing dispatch custody directory: ${normalizeRelative(dispatchDirectory)}`);

  fs.mkdirSync(dispatchDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(dispatchDirectory, 0o700);

  const trackingBytes = Buffer.from(normalizedInput.trackingReference, 'utf8');
  const manifest = {
    schema_version: DISPATCH_CUSTODY_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: 'postal_dispatch_evidence_recorded_delivery_unconfirmed',
    channel: normalizedInput.channel,
    method: normalizedInput.method,
    source_finalization: {
      directory: relativeSourceDirectory,
      manifest: SOURCE_MANIFEST_NAME,
      bytes: sourceManifestRecord.bytes.length,
      sha256: sha256(sourceManifestRecord.bytes),
      state: sourceManifest.state,
      finalized_at: sourceManifest.finalized_at,
      request_date: sourceManifest.request_date,
    },
    pdf_rendering: {
      manifest: PDF_MANIFEST_NAME,
      bytes: pdfManifestRecord.bytes.length,
      sha256: sha256(pdfManifestRecord.bytes),
      state: pdfManifest.state,
      outbound_document: outboundPdf,
    },
    authorization: {
      dispatch_authorized: true,
      dispatch_record: authorizationRecord,
      authorization_record_confirmed: true,
    },
    dispatch: {
      declared_dispatched_at: normalizedInput.declaredDispatchedAt,
      event_record: normalizedInput.dispatchEventRecord,
      service_provider: normalizedInput.serviceProvider,
      service_level: normalizedInput.serviceLevel,
      tracking_reference_present: true,
      tracking_reference_bytes: trackingBytes.length,
      tracking_reference_sha256: sha256(trackingBytes),
    },
    evidence_files: proofRows.map((row) => row.descriptor),
    controls: {
      dispatch_input_copied_to_output: false,
      requester_name_address_email_in_manifest: false,
      tracking_reference_in_manifest: false,
      source_chain_verified: true,
      outbound_pdf_verified: true,
      proof_artifacts_copied: true,
      external_dispatch_assertion_recorded: true,
      carrier_authenticity_verified: false,
      network_calls_performed: false,
      messages_sent_by_tool: false,
      postal_dispatch_performed_by_tool: false,
      routing_email_sent_by_tool: false,
      dispatch_ready: false,
      delivery_confirmed: false,
      confirmed_receipt_at: null,
      response_deadline_calculated: false,
      response_deadline: null,
      canonical_effect: 'none',
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const created = [];

  try {
    for (const row of proofRows) {
      const outputPath = path.join(dispatchDirectory, row.copiedName);
      privateWrite(outputPath, row.bytes);
      created.push(outputPath);
    }
    const manifestPath = path.join(dispatchDirectory, DISPATCH_MANIFEST_NAME);
    privateWrite(manifestPath, manifestBytes);
    created.push(manifestPath);
  } catch (error) {
    fs.rmSync(dispatchDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    state: manifest.state,
    channel: manifest.channel,
    source_dir: relativeSourceDirectory,
    dispatch_dir: normalizeRelative(dispatchDirectory),
    manifest_path: normalizeRelative(path.join(dispatchDirectory, DISPATCH_MANIFEST_NAME)),
    evidence_files: manifest.evidence_files,
    messages_sent_by_tool: false,
    postal_dispatch_performed_by_tool: false,
    delivery_confirmed: false,
    response_deadline: null,
  };
}
