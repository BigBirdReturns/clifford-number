import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ACQUISITION_ID = 'ET-ROM-2025-09-01';
export const PRIVATE_INPUT_SCHEMA = 'electric-twin-register-request-private-input@1';
export const FINALIZATION_SCHEMA = 'electric-twin-register-request-finalization@1';
export const DEFAULT_PRIVATE_INPUT = 'data/local/electric-twin-register-of-members-requester.json';
export const DEFAULT_OUTPUT_ROOT = 'build/source-acquisition/electric-twin-register-of-members';
export const TEMPLATE_PATH = 'docs/requests/electric-twin-section-116-register-of-members-request.md';
export const PACKET_ROOT = 'data/research/electric-twin-register-of-members-acquisition';
export const EXAMPLE_INPUT_PATH = `${PACKET_ROOT}/requester-input.example.json`;

const STATUTORY_HEADING = '## Part A: statutory register-of-members request';
const VOLUNTARY_HEADING = '## Part B: separate voluntary transaction-instrument request';
const DEFAULT_ADDRESS_BLOCK = [
  'Electric Twin Ltd',
  'Company number 15173006',
  '7 Berwick Street',
  'London',
  'W1F 0PQ',
].join('\n');
export const REQUIRED_TEMPLATE_TOKENS = [
  '[REQUESTER FULL NAME]',
  '[REQUESTER POSTAL ADDRESS]',
  '[EMAIL]',
  '[DATE]',
  '[IDENTIFY EACH REPOSITORY REVIEWER OR STATE “NO OTHER PERSON”]',
];
export const REQUIRED_TEMPLATE_HEADINGS = [STATUTORY_HEADING, VOLUNTARY_HEADING];
const REGISTER_LOCATION_BASES = new Set([
  'registered_office',
  'sail',
  'company_confirmed_other_inspection_location',
]);

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readUtf8(filePath));
}

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

function assertSafePrivateInputPath(filePath) {
  const relative = normalizeRelative(filePath);
  assert.ok(isWithin(relative, 'data/local'), `private input must remain under ignored data/local/: ${relative}`);
  assertNoSymlinkComponents(filePath);
  assert.ok(fs.existsSync(filePath), `private input does not exist: ${relative}`);
  const stat = fs.statSync(filePath);
  assert.ok(stat.isFile(), `private input must be a regular file: ${relative}`);
  assert.equal(stat.mode & 0o077, 0, `private input must not be group- or world-readable: ${relative}`);
}

function assertSafeOutputPath(outputDir) {
  const relative = normalizeRelative(outputDir);
  assert.ok(isWithin(relative, DEFAULT_OUTPUT_ROOT), `output must remain under ignored ${DEFAULT_OUTPUT_ROOT}/: ${relative}`);
  assertNoSymlinkComponents(outputDir);
  assert.equal(fs.existsSync(outputDir), false, `refusing to overwrite existing finalization directory: ${relative}`);
}

function requireString(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  const trimmed = value.trim();
  assert.ok(trimmed.length > 0, `${label} must not be empty`);
  assert.equal(/\[[^\]]+\]/u.test(trimmed), false, `${label} still contains a placeholder`);
  return trimmed;
}

function requireOpaqueRecordId(value, label) {
  const recordId = requireString(value, label);
  assert.match(recordId, /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u, `${label} must be an opaque local record ID`);
  return recordId;
}

function requireIsoDate(value, label) {
  const date = requireString(value, label);
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/u, `${label} must use YYYY-MM-DD`);
  const parsed = new Date(`${date}T00:00:00Z`);
  assert.equal(Number.isNaN(parsed.getTime()), false, `${label} is not a valid calendar date`);
  assert.equal(parsed.toISOString().slice(0, 10), date, `${label} is not a valid calendar date`);
  return date;
}

function requireIsoTimestamp(value, label) {
  const timestamp = requireString(value, label);
  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u, `${label} must be a UTC ISO-8601 timestamp`);
  assert.equal(Number.isNaN(Date.parse(timestamp)), false, `${label} is not a valid timestamp`);
  return timestamp;
}

function requireAddressLines(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  assert.ok(value.length >= 2, `${label} must contain at least two lines`);
  return value.map((line, index) => requireString(line, `${label}[${index}]`));
}

function requireHttpsUrls(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  assert.ok(value.length > 0, `${label} must not be empty`);
  return value.map((url, index) => {
    const normalized = requireString(url, `${label}[${index}]`);
    const parsed = new URL(normalized);
    assert.equal(parsed.protocol, 'https:', `${label}[${index}] must use HTTPS`);
    return normalized;
  });
}

function requireDisclosureRecipients(value) {
  assert.ok(Array.isArray(value), 'disclosure_recipients must be an array');
  assert.ok(value.length > 0, 'disclosure_recipients must not be empty');
  const recipients = value.map((item, index) => requireString(item, `disclosure_recipients[${index}]`));
  if (recipients.includes('NO OTHER PERSON')) {
    assert.deepEqual(recipients, ['NO OTHER PERSON'], 'NO OTHER PERSON must be the sole disclosure-recipient value');
  }
  return recipients;
}

export function validatePrivateInput(input) {
  assert.equal(input?.schema_version, PRIVATE_INPUT_SCHEMA, 'unexpected private-input schema');
  assert.equal(input?.acquisition_id, ACQUISITION_ID, 'private input acquisition_id mismatch');

  const requester = input.requester ?? {};
  const fullName = requireString(requester.full_name, 'requester.full_name');
  const postalAddressLines = requireAddressLines(requester.postal_address_lines, 'requester.postal_address_lines');
  const email = requireString(requester.email, 'requester.email');
  assert.match(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/u, 'requester.email must be a plausible email address');

  const requestDate = requireIsoDate(input.request_date, 'request_date');
  const disclosureRecipients = requireDisclosureRecipients(input.disclosure_recipients);

  const location = input.location_verification ?? {};
  const checkedAt = requireIsoDate(location.checked_at, 'location_verification.checked_at');
  assert.ok(checkedAt <= requestDate, 'location verification cannot occur after the request date');
  const registeredOfficeLines = requireAddressLines(location.registered_office_lines, 'location_verification.registered_office_lines');
  const registerLocationBasis = requireString(location.register_location_basis, 'location_verification.register_location_basis');
  assert.ok(REGISTER_LOCATION_BASES.has(registerLocationBasis), `unsupported register_location_basis: ${registerLocationBasis}`);
  const registerLocationLines = requireAddressLines(location.register_location_lines, 'location_verification.register_location_lines');
  const sourceUrls = requireHttpsUrls(location.source_urls, 'location_verification.source_urls');
  if (registerLocationBasis === 'registered_office') {
    assert.deepEqual(registerLocationLines, registeredOfficeLines, 'registered-office register location must match the verified registered office');
  }

  const authorization = input.authorization ?? {};
  assert.equal(authorization.finalization_authorized, true, 'authorization.finalization_authorized must be true');
  const finalizationRecord = requireOpaqueRecordId(authorization.finalization_record, 'authorization.finalization_record');
  const finalizedAt = requireIsoTimestamp(authorization.finalized_at, 'authorization.finalized_at');
  assert.equal(finalizedAt.slice(0, 10), requestDate, 'authorization.finalized_at date must match request_date');

  assert.equal(typeof authorization.statutory_dispatch_authorized, 'boolean', 'authorization.statutory_dispatch_authorized must be boolean');
  assert.equal(typeof authorization.voluntary_dispatch_authorized, 'boolean', 'authorization.voluntary_dispatch_authorized must be boolean');
  const statutoryDispatchRecord = authorization.statutory_dispatch_authorized
    ? requireOpaqueRecordId(authorization.statutory_dispatch_record, 'authorization.statutory_dispatch_record')
    : null;
  const voluntaryDispatchRecord = authorization.voluntary_dispatch_authorized
    ? requireOpaqueRecordId(authorization.voluntary_dispatch_record, 'authorization.voluntary_dispatch_record')
    : null;
  if (!authorization.statutory_dispatch_authorized) {
    assert.ok(authorization.statutory_dispatch_record == null, 'statutory_dispatch_record must be null while dispatch is unauthorized');
  }
  if (!authorization.voluntary_dispatch_authorized) {
    assert.ok(authorization.voluntary_dispatch_record == null, 'voluntary_dispatch_record must be null while dispatch is unauthorized');
  }

  return {
    requester: { fullName, postalAddressLines, email },
    requestDate,
    disclosureRecipients,
    location: {
      checkedAt,
      registeredOfficeLines,
      registerLocationBasis,
      registerLocationLines,
      sourceUrls,
    },
    authorization: {
      finalizationRecord,
      finalizedAt,
      statutoryDispatchAuthorized: authorization.statutory_dispatch_authorized,
      statutoryDispatchRecord,
      voluntaryDispatchAuthorized: authorization.voluntary_dispatch_authorized,
      voluntaryDispatchRecord,
    },
  };
}

function extractTextBlock(markdown, heading) {
  const headingIndex = markdown.indexOf(heading);
  assert.notEqual(headingIndex, -1, `missing template heading: ${heading}`);
  const fenceIndex = markdown.indexOf('```text\n', headingIndex);
  assert.notEqual(fenceIndex, -1, `missing text fence after heading: ${heading}`);
  const contentStart = fenceIndex + '```text\n'.length;
  const contentEnd = markdown.indexOf('\n```', contentStart);
  assert.notEqual(contentEnd, -1, `missing closing fence after heading: ${heading}`);
  return markdown.slice(contentStart, contentEnd).replace(/\r\n?/gu, '\n');
}

function replaceAddressBlock(text, addressLines) {
  const replacement = [
    'Electric Twin Ltd',
    'Company number 15173006',
    ...addressLines,
  ].join('\n');
  assert.ok(text.includes(DEFAULT_ADDRESS_BLOCK), 'template address block changed unexpectedly');
  return text.replace(DEFAULT_ADDRESS_BLOCK, replacement);
}

function formatLetterDate(isoDate) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

function applyRequesterFields(text, normalized) {
  const inlineAddress = normalized.requester.postalAddressLines.join(', ');
  const blockAddress = normalized.requester.postalAddressLines.join('\n');
  const recipients = normalized.disclosureRecipients.join('; ');
  const letterDate = formatLetterDate(normalized.requestDate);

  let output = text.replace(
    'I, [REQUESTER FULL NAME], of [REQUESTER POSTAL ADDRESS], request',
    `I, ${normalized.requester.fullName}, of ${inlineAddress}, request`,
  );
  output = output
    .replaceAll('[REQUESTER FULL NAME]', normalized.requester.fullName)
    .replaceAll('[REQUESTER POSTAL ADDRESS]', blockAddress)
    .replaceAll('[EMAIL]', normalized.requester.email)
    .replaceAll('[DATE]', letterDate)
    .replaceAll('[IDENTIFY EACH REPOSITORY REVIEWER OR STATE “NO OTHER PERSON”]', recipients);

  assert.equal(/\[[^\]]+\]/u.test(output), false, 'finalized request still contains a bracketed placeholder');
  return `${output.trimEnd()}\n`;
}

export function renderFinalizedRequests(templateMarkdown, privateInput) {
  for (const token of REQUIRED_TEMPLATE_TOKENS) {
    assert.ok(templateMarkdown.includes(token), `tracked request template is missing required token: ${token}`);
  }
  const normalized = validatePrivateInput(privateInput);
  const statutoryTemplate = replaceAddressBlock(
    extractTextBlock(templateMarkdown, STATUTORY_HEADING),
    normalized.location.registerLocationLines,
  );
  const voluntaryTemplate = replaceAddressBlock(
    extractTextBlock(templateMarkdown, VOLUNTARY_HEADING),
    normalized.location.registeredOfficeLines,
  );
  return {
    normalized,
    statutory: applyRequesterFields(statutoryTemplate, normalized),
    voluntary: applyRequesterFields(voluntaryTemplate, normalized),
  };
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function writePrivateFile(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.chmodSync(filePath, 0o600);
}

function fileDescriptor(fileName, content) {
  const bytes = Buffer.from(content, 'utf8');
  return {
    path: fileName,
    mime_type: 'text/plain; charset=utf-8',
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function finalizationState(authorization) {
  const statutory = authorization.statutoryDispatchAuthorized;
  const voluntary = authorization.voluntaryDispatchAuthorized;
  if (statutory && voluntary) return 'source_finalized_both_dispatch_authorizations_recorded_not_sent';
  if (statutory || voluntary) return 'source_finalized_partial_dispatch_authorization_recorded_not_sent';
  return 'source_finalized_not_dispatch_authorized';
}

export function finalizeRequestFiles({ inputPath = DEFAULT_PRIVATE_INPUT, outputDir } = {}) {
  assertSafePrivateInputPath(inputPath);
  const input = readJson(inputPath);
  const template = readUtf8(TEMPLATE_PATH);
  const rendered = renderFinalizedRequests(template, input);
  const resolvedOutput = outputDir ?? path.join(
    DEFAULT_OUTPUT_ROOT,
    rendered.normalized.authorization.finalizedAt.replaceAll(':', '-').replaceAll('.', '-'),
  );
  assertSafeOutputPath(resolvedOutput);

  fs.mkdirSync(resolvedOutput, { recursive: true, mode: 0o700 });
  fs.chmodSync(resolvedOutput, 0o700);

  const statutoryName = 'statutory-register-of-members-request.txt';
  const voluntaryName = 'voluntary-transaction-instrument-request.txt';
  const manifestName = 'outbound-source-manifest.json';
  const templateBytes = Buffer.from(template, 'utf8');
  const files = [
    fileDescriptor(statutoryName, rendered.statutory),
    fileDescriptor(voluntaryName, rendered.voluntary),
  ];
  const manifest = {
    schema_version: FINALIZATION_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: finalizationState(rendered.normalized.authorization),
    finalized_at: rendered.normalized.authorization.finalizedAt,
    request_date: rendered.normalized.requestDate,
    template: {
      path: TEMPLATE_PATH,
      bytes: templateBytes.length,
      sha256: sha256(templateBytes),
    },
    location_verification: {
      checked_at: rendered.normalized.location.checkedAt,
      register_location_basis: rendered.normalized.location.registerLocationBasis,
      source_urls: rendered.normalized.location.sourceUrls,
    },
    authorization: {
      finalization_record: rendered.normalized.authorization.finalizationRecord,
      statutory_dispatch_authorized: rendered.normalized.authorization.statutoryDispatchAuthorized,
      statutory_dispatch_record: rendered.normalized.authorization.statutoryDispatchRecord,
      voluntary_dispatch_authorized: rendered.normalized.authorization.voluntaryDispatchAuthorized,
      voluntary_dispatch_record: rendered.normalized.authorization.voluntaryDispatchRecord,
    },
    files,
    controls: {
      private_input_copied_to_output: false,
      requester_particulars_in_manifest: false,
      network_calls_performed: false,
      messages_sent: false,
      dispatch_ready: false,
      pdfs_rendered: false,
      postal_dispatch_performed: false,
      routing_email_sent: false,
      response_deadline_calculated: false,
      response_deadline: null,
      canonical_effect: 'none',
    },
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

  try {
    writePrivateFile(path.join(resolvedOutput, statutoryName), rendered.statutory);
    writePrivateFile(path.join(resolvedOutput, voluntaryName), rendered.voluntary);
    writePrivateFile(path.join(resolvedOutput, manifestName), manifestText);
  } catch (error) {
    fs.rmSync(resolvedOutput, { recursive: true, force: true });
    throw error;
  }

  return {
    state: manifest.state,
    output_dir: normalizeRelative(resolvedOutput),
    manifest_path: normalizeRelative(path.join(resolvedOutput, manifestName)),
    files,
    messages_sent: false,
  };
}
