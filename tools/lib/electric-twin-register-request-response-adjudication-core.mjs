import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ACQUISITION_ID } from './electric-twin-register-request-core.mjs';
import {
  RESPONSE_MANIFEST_NAME,
  verifyResponseCustodyChain,
} from './electric-twin-register-request-response-core.mjs';

export const RESPONSE_ADJUDICATION_INPUT_SCHEMA =
  'electric-twin-register-request-response-adjudication-input@1';
export const RESPONSE_ADJUDICATION_SCHEMA =
  'electric-twin-register-request-response-adjudication@1';
export const RESPONSE_ADJUDICATION_MANIFEST_NAME = 'inbound-response-adjudication.json';
export const RESPONSE_ADJUDICATION_DIRECTORY_NAME = 'adjudication';
export const ADJUDICATION_RULES_PATH =
  'data/research/electric-twin-register-of-members-acquisition/adjudication-rules.json';

const REVIEWER_ROLES = new Set([
  'repository_evidence_reviewer',
  'source_custody_reviewer',
  'external_legal_reviewer',
  'other_qualified_reviewer',
]);
const OUTCOME_STATES = new Set([
  'transaction_specific_allottee_identified',
  'registered_holder_history_strengthened_only',
  'transfer_or_register_movement_identified',
  'nominee_or_beneficial_owner_ambiguity',
  'partial_or_ambiguous_response',
  'company_application_to_court',
  'refusal_confidentiality_or_improper_purpose_asserted',
]);
const RECOMMENDATION_BY_OUTCOME = new Map([
  ['transaction_specific_allottee_identified', 'candidate_allottee_review_required'],
  ['registered_holder_history_strengthened_only', 'candidate_holder_history_review_required'],
  ['transfer_or_register_movement_identified', 'candidate_register_movement_review_required'],
  ['nominee_or_beneficial_owner_ambiguity', 'preserve_ambiguity_no_promotion'],
  ['partial_or_ambiguous_response', 'no_canonical_mutation'],
  ['company_application_to_court', 'procedural_disposition_only'],
  ['refusal_confidentiality_or_improper_purpose_asserted', 'procedural_disposition_only'],
]);
const PROMOTION_ASSESSMENT_BY_OUTCOME = new Map([
  ['transaction_specific_allottee_identified', 'claimed_satisfied_requires_independent_review'],
  ['registered_holder_history_strengthened_only', 'not_satisfied'],
  ['transfer_or_register_movement_identified', 'not_satisfied'],
  ['nominee_or_beneficial_owner_ambiguity', 'not_satisfied'],
  ['partial_or_ambiguous_response', 'not_satisfied'],
  ['company_application_to_court', 'not_satisfied'],
  ['refusal_confidentiality_or_improper_purpose_asserted', 'not_satisfied'],
]);
const PROPOSITION_CLASSES = new Set([
  'transaction_specific_allottee',
  'registered_holder_history',
  'register_movement',
  'nominee_or_beneficial_owner',
  'procedural_disposition',
  'response_scope_or_completeness',
]);
const PROCEDURAL_DISPOSITION_KINDS = new Set([
  'company_application_to_court',
  'refusal',
  'confidentiality_asserted',
  'improper_purpose_asserted',
  'other_procedural_disposition',
]);
const CONCLUSIONS = new Set([
  'supported',
  'not_supported',
  'ambiguous',
  'contradicted',
]);
const SOURCE_ADDRESS_KINDS = new Set([
  'page',
  'line_range',
  'byte_range',
  'message_part',
  'document_section',
  'table_row',
]);
const TRANSACTION_MECHANISMS = new Set([
  'allotment',
  'subscription',
  'register_of_allotments_entry',
  'equivalent_transaction_specific_entry',
]);
const AMBIGUITY_KEYS = [
  'nominee_or_custody',
  'transfer_or_register_movement',
  'aggregation',
  'legal_vehicle_identity',
];
const OUTCOME_FINDING_REQUIREMENTS = new Map([
  ['transaction_specific_allottee_identified', {
    propositionClass: 'transaction_specific_allottee',
    acceptedConclusions: new Set(['supported']),
  }],
  ['registered_holder_history_strengthened_only', {
    propositionClass: 'registered_holder_history',
    acceptedConclusions: new Set(['supported']),
  }],
  ['transfer_or_register_movement_identified', {
    propositionClass: 'register_movement',
    acceptedConclusions: new Set(['supported']),
  }],
  ['nominee_or_beneficial_owner_ambiguity', {
    propositionClass: 'nominee_or_beneficial_owner',
    acceptedConclusions: new Set(['supported', 'ambiguous']),
  }],
  ['partial_or_ambiguous_response', {
    propositionClass: 'response_scope_or_completeness',
    acceptedConclusions: new Set(['supported', 'ambiguous']),
  }],
  ['company_application_to_court', {
    propositionClass: 'procedural_disposition',
    acceptedConclusions: new Set(['supported']),
    acceptedProceduralDispositionKinds: new Set(['company_application_to_court']),
  }],
  ['refusal_confidentiality_or_improper_purpose_asserted', {
    propositionClass: 'procedural_disposition',
    acceptedConclusions: new Set(['supported']),
    acceptedProceduralDispositionKinds: new Set([
      'refusal',
      'confidentiality_asserted',
      'improper_purpose_asserted',
    ]),
  }],
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

function requireString(value, label, { maxLength = 4096 } = {}) {
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

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function requireIsoTimestamp(value, label) {
  const timestamp = requireString(value, label, { maxLength: 32 });
  const match = timestamp.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/u,
  );
  assert.ok(match, `${label} must be a UTC ISO-8601 timestamp`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  assert.ok(month >= 1 && month <= 12, `${label} has an invalid month`);
  assert.ok(day >= 1 && day <= daysInMonth(year, month), `${label} has an invalid day`);
  assert.ok(hour >= 0 && hour <= 23, `${label} has an invalid hour`);
  assert.ok(minute >= 0 && minute <= 59, `${label} has an invalid minute`);
  assert.ok(second >= 0 && second <= 59, `${label} has an invalid second`);
  return timestamp;
}

function requireSha256(value, label) {
  const digest = requireString(value, label, { maxLength: 64 });
  assert.match(digest, /^[0-9a-f]{64}$/u, `${label} must be a lowercase SHA-256 digest`);
  return digest;
}

function requirePositiveInteger(value, label) {
  assert.equal(Number.isInteger(value), true, `${label} must be an integer`);
  assert.ok(value > 0, `${label} must be positive`);
  return value;
}

function requireIsoDate(value, label) {
  const date = requireString(value, label, { maxLength: 10 });
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/u, `${label} must use YYYY-MM-DD`);
  const [year, month, day] = date.split('-').map(Number);
  assert.ok(month >= 1 && month <= 12, `${label} has an invalid month`);
  assert.ok(day >= 1 && day <= daysInMonth(year, month), `${label} has an invalid day`);
  return date;
}

function requireUniqueStrings(value, label, { maxItems = 32, allowEmpty = true } = {}) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  if (!allowEmpty) assert.ok(value.length > 0, `${label} must not be empty`);
  assert.ok(value.length <= maxItems, `${label} may contain at most ${maxItems} values`);
  const normalized = value.map((item, index) => requireString(
    item, `${label}[${index}]`, { maxLength: 512 },
  ));
  assert.equal(new Set(normalized).size, normalized.length, `${label} contains duplicates`);
  return normalized;
}

function requireEnum(value, label, allowed) {
  const normalized = requireString(value, label, { maxLength: 128 });
  assert.ok(allowed.has(normalized), `unsupported ${label}: ${normalized}`);
  return normalized;
}

function validateSourceAddress(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const kind = requireEnum(value.kind, `${label}.kind`, SOURCE_ADDRESS_KINDS);
  const locator = requireString(value.locator, `${label}.locator`, { maxLength: 512 });
  let start = null;
  let end = null;
  if (kind === 'line_range' || kind === 'byte_range') {
    start = requirePositiveInteger(value.start, `${label}.start`);
    end = requirePositiveInteger(value.end, `${label}.end`);
    assert.ok(end >= start, `${label}.end must be greater than or equal to start`);
  } else {
    assert.equal(value.start ?? null, null, `${label}.start is only allowed for line_range or byte_range`);
    assert.equal(value.end ?? null, null, `${label}.end is only allowed for line_range or byte_range`);
  }
  if (kind === 'page') requirePositiveInteger(value.page, `${label}.page`);
  else assert.equal(value.page ?? null, null, `${label}.page is only allowed for page addresses`);
  return {
    kind,
    locator,
    ...(start === null ? {} : { start, end }),
    ...(kind === 'page' ? { page: value.page } : {}),
  };
}

function validateTransactionJoin(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const issuer = requireString(value.issuer, `${label}.issuer`, { maxLength: 256 });
  assert.equal(issuer, 'Electric Twin Ltd', `${label}.issuer must be Electric Twin Ltd`);
  const companyNumber = requireString(value.company_number, `${label}.company_number`, { maxLength: 16 });
  assert.equal(companyNumber, '15173006', `${label}.company_number must be 15173006`);
  const namedLegalVehicle = requireString(value.named_legal_vehicle, `${label}.named_legal_vehicle`, { maxLength: 512 });
  const shareClass = requireString(value.share_class, `${label}.share_class`, { maxLength: 256 });
  const quantity = requirePositiveInteger(value.quantity, `${label}.quantity`);
  const allotmentDate = value.allotment_date === null || value.allotment_date === undefined
    ? null
    : requireIsoDate(value.allotment_date, `${label}.allotment_date`);
  const allotmentEvent = value.allotment_event === null || value.allotment_event === undefined
    ? null
    : requireString(value.allotment_event, `${label}.allotment_event`, { maxLength: 512 });
  assert.ok(allotmentDate !== null || allotmentEvent !== null,
    `${label} requires allotment_date or allotment_event`);
  const mechanism = requireEnum(value.transaction_mechanism, `${label}.transaction_mechanism`, TRANSACTION_MECHANISMS);
  const instrumentIdentity = requireString(
    value.source_addressable_instrument_identity,
    `${label}.source_addressable_instrument_identity`,
    { maxLength: 1024 },
  );
  assert.ok(value.ambiguity_flags && typeof value.ambiguity_flags === 'object'
    && !Array.isArray(value.ambiguity_flags), `${label}.ambiguity_flags must be an object`);
  const ambiguityFlags = {};
  for (const key of AMBIGUITY_KEYS) {
    assert.equal(typeof value.ambiguity_flags[key], 'boolean', `${label}.ambiguity_flags.${key} must be boolean`);
    ambiguityFlags[key] = value.ambiguity_flags[key];
  }
  return {
    issuer,
    company_number: companyNumber,
    named_legal_vehicle: namedLegalVehicle,
    share_class: shareClass,
    quantity,
    allotment_date: allotmentDate,
    allotment_event: allotmentEvent,
    transaction_mechanism: mechanism,
    source_addressable_instrument_identity: instrumentIdentity,
    ambiguity_flags: ambiguityFlags,
  };
}

function validateFinding(value, index) {
  const label = `findings[${index}]`;
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const findingId = requireOpaqueRecordId(value.finding_id, `${label}.finding_id`);
  const propositionClass = requireEnum(value.proposition_class, `${label}.proposition_class`, PROPOSITION_CLASSES);
  const conclusion = requireEnum(value.conclusion, `${label}.conclusion`, CONCLUSIONS);
  const sourceArtifactPath = requireString(value.source_artifact_path, `${label}.source_artifact_path`, { maxLength: 256 });
  assert.equal(sourceArtifactPath, path.basename(sourceArtifactPath),
    `${label}.source_artifact_path must be the copied response artifact filename`);
  const sourceArtifactSha256 = requireSha256(value.source_artifact_sha256, `${label}.source_artifact_sha256`);
  const sourceAddress = validateSourceAddress(value.source_address, `${label}.source_address`);
  const assertion = requireString(value.assertion, `${label}.assertion`, { maxLength: 4096 });
  const unresolvedAmbiguities = requireUniqueStrings(
    value.unresolved_ambiguities ?? [],
    `${label}.unresolved_ambiguities`,
    { maxItems: 16, allowEmpty: true },
  );
  let proceduralDispositionKind = null;
  if (value.procedural_disposition_kind !== null
    && value.procedural_disposition_kind !== undefined) {
    proceduralDispositionKind = requireEnum(
      value.procedural_disposition_kind,
      `${label}.procedural_disposition_kind`,
      PROCEDURAL_DISPOSITION_KINDS,
    );
  }
  let transactionJoin = null;
  if (value.transaction_join !== null && value.transaction_join !== undefined) {
    transactionJoin = validateTransactionJoin(value.transaction_join, `${label}.transaction_join`);
  }
  if (propositionClass !== 'transaction_specific_allottee') {
    assert.equal(transactionJoin, null, `${label}.transaction_join is only allowed for transaction_specific_allottee findings`);
  }
  if (propositionClass === 'transaction_specific_allottee' && conclusion === 'supported') {
    assert.ok(transactionJoin, `${label}.transaction_join is required for a supported transaction-specific finding`);
  }
  if (propositionClass === 'procedural_disposition') {
    assert.ok(proceduralDispositionKind,
      `${label}.procedural_disposition_kind is required for procedural_disposition findings`);
  } else {
    assert.equal(proceduralDispositionKind, null,
      `${label}.procedural_disposition_kind is only allowed for procedural_disposition findings`);
  }
  return {
    finding_id: findingId,
    proposition_class: propositionClass,
    conclusion,
    source_artifact_path: sourceArtifactPath,
    source_artifact_sha256: sourceArtifactSha256,
    source_address: sourceAddress,
    assertion,
    unresolved_ambiguities: unresolvedAmbiguities,
    procedural_disposition_kind: proceduralDispositionKind,
    transaction_join: transactionJoin,
  };
}

export function validateResponseAdjudicationInput(input) {
  assert.equal(input?.schema_version, RESPONSE_ADJUDICATION_INPUT_SCHEMA,
    'unexpected response-adjudication input schema');
  assert.equal(input?.acquisition_id, ACQUISITION_ID, 'response-adjudication acquisition_id mismatch');
  assert.equal(input?.review_status, 'review_completed', 'review_status must be review_completed');
  const reviewedAt = requireIsoTimestamp(input.reviewed_at, 'reviewed_at');
  const reviewEventRecord = requireOpaqueRecordId(input.review_event_record, 'review_event_record');
  const reviewerRole = requireEnum(input.reviewer_role, 'reviewer_role', REVIEWER_ROLES);
  assert.equal(input.original_response_bytes_inspected, true,
    'original_response_bytes_inspected must be true');
  assert.equal(input.all_response_artifacts_reviewed, true,
    'all_response_artifacts_reviewed must be true');
  const outcomeState = requireEnum(input.outcome_state, 'outcome_state', OUTCOME_STATES);
  const canonicalRecommendation = requireString(
    input.canonical_recommendation, 'canonical_recommendation', { maxLength: 128 },
  );
  assert.equal(canonicalRecommendation, RECOMMENDATION_BY_OUTCOME.get(outcomeState),
    'canonical_recommendation does not match outcome_state');
  const promotionGateAssessment = requireString(
    input.promotion_gate_assessment, 'promotion_gate_assessment', { maxLength: 128 },
  );
  assert.equal(promotionGateAssessment, PROMOTION_ASSESSMENT_BY_OUTCOME.get(outcomeState),
    'promotion_gate_assessment does not match outcome_state');
  assert.equal(input.legal_timeliness_assessment, 'not_adjudicated',
    'legal_timeliness_assessment must remain not_adjudicated');
  assert.equal(input.statutory_compliance_assessment, 'not_adjudicated',
    'statutory_compliance_assessment must remain not_adjudicated');
  assert.equal(input.court_application_merits_assessment, 'not_adjudicated',
    'court_application_merits_assessment must remain not_adjudicated');
  assert.ok(Array.isArray(input.findings), 'findings must be an array');
  assert.ok(input.findings.length >= 1 && input.findings.length <= 32,
    'findings must contain between one and thirty-two rows');
  const findings = input.findings.map(validateFinding);
  assert.equal(new Set(findings.map((row) => row.finding_id)).size, findings.length,
    'findings contain duplicate finding_id values');
  const findingRequirement = OUTCOME_FINDING_REQUIREMENTS.get(outcomeState);
  assert.ok(findingRequirement, `outcome_state ${outcomeState} has no finding requirement`);
  const matchingOutcomeFindings = findings.filter((row) => {
    if (row.proposition_class !== findingRequirement.propositionClass
      || !findingRequirement.acceptedConclusions.has(row.conclusion)) return false;
    if (findingRequirement.acceptedProceduralDispositionKinds) {
      return findingRequirement.acceptedProceduralDispositionKinds.has(row.procedural_disposition_kind);
    }
    return true;
  });
  const proceduralKindRequirement = findingRequirement.acceptedProceduralDispositionKinds
    ? ` with procedural_disposition_kind ${[...findingRequirement.acceptedProceduralDispositionKinds].join(' or ')}`
    : '';
  assert.ok(matchingOutcomeFindings.length > 0,
    `outcome_state ${outcomeState} requires a ${findingRequirement.propositionClass} finding concluded ${[...findingRequirement.acceptedConclusions].join(' or ')}${proceduralKindRequirement}`);
  if (outcomeState === 'transaction_specific_allottee_identified') {
    const supportedTransactions = findings.filter((row) => row.proposition_class === 'transaction_specific_allottee'
      && row.conclusion === 'supported');
    assert.ok(supportedTransactions.length >= 1,
      'transaction_specific_allottee_identified requires a supported transaction-specific finding');
    const blockingFindings = findings.filter((row) => {
      if (row.unresolved_ambiguities.length > 0) return true;
      if (row.proposition_class === 'transaction_specific_allottee') {
        return row.conclusion === 'ambiguous'
          || row.conclusion === 'contradicted'
          || row.unresolved_ambiguities.length > 0;
      }
      if (row.proposition_class === 'register_movement'
        || row.proposition_class === 'nominee_or_beneficial_owner') {
        return row.conclusion === 'supported'
          || row.conclusion === 'ambiguous'
          || row.unresolved_ambiguities.length > 0;
      }
      return false;
    });
    assert.equal(blockingFindings.length, 0,
      'transaction_specific_allottee_identified cannot coexist with unresolved or conflicting transaction-attribution findings');
    for (const finding of supportedTransactions) {
      assert.deepEqual(finding.unresolved_ambiguities, [],
        'supported transaction-specific findings must not retain unresolved ambiguities');
      for (const key of AMBIGUITY_KEYS) {
        assert.equal(finding.transaction_join.ambiguity_flags[key], false,
          `supported transaction-specific finding retains ${key} ambiguity`);
      }
    }
  }
  const reviewNotes = requireString(input.review_notes, 'review_notes', { maxLength: 8192 });
  assert.equal(input.second_party_review_required, true, 'second_party_review_required must be true');
  assert.equal(input.second_party_review_completed, false,
    'second_party_review_completed must remain false in this gate');
  assert.equal(input.canonical_mutation_authorized, false,
    'canonical_mutation_authorized must remain false in this gate');
  return {
    reviewedAt,
    reviewEventRecord,
    reviewerRole,
    outcomeState,
    canonicalRecommendation,
    promotionGateAssessment,
    findings,
    reviewNotes,
  };
}

function readPrivateJson(filePath, label, { requireLocal = false } = {}) {
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
  const bytes = fs.readFileSync(filePath);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`${label} must be valid UTF-8 JSON: ${error.message}`);
  }
  return { bytes, value };
}

function readRules() {
  const bytes = fs.readFileSync(ADJUDICATION_RULES_PATH);
  const value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value?.schema_version, 'electric-twin-allottee-adjudication@1',
    'unexpected allottee-adjudication rules schema');
  assert.equal(value?.acquisition_id, ACQUISITION_ID, 'adjudication rules acquisition_id mismatch');
  assert.equal(value?.status, 'active_fail_closed_rules', 'adjudication rules are not active');
  const states = new Set((value.admissible_outcome_states ?? []).map((row) => row.state));
  for (const outcome of OUTCOME_STATES) {
    assert.ok(states.has(outcome), `adjudication rules do not admit outcome: ${outcome}`);
  }
  assert.equal(
    value.response_review_contract?.procedural_outcome_requires_matching_disposition_kind,
    true,
    'adjudication rules must require a matching procedural disposition kind',
  );
  assert.deepEqual(
    value.response_review_contract?.procedural_disposition_kinds_by_outcome,
    {
      company_application_to_court: ['company_application_to_court'],
      refusal_confidentiality_or_improper_purpose_asserted: [
        'refusal',
        'confidentiality_asserted',
        'improper_purpose_asserted',
      ],
    },
    'adjudication rules procedural disposition map mismatch',
  );
  assert.equal(
    value.response_review_contract?.review_timestamp_calendar_and_clock_components_must_be_valid,
    true,
    'adjudication rules must require calendar-valid UTC review timestamps',
  );
  return { bytes, value };
}

function outputDirectory(responseDirectory, normalizedInput) {
  const timestamp = normalizedInput.reviewedAt.replaceAll(':', '-').replaceAll('.', '-');
  const digest = sha256(Buffer.from([
    normalizedInput.reviewEventRecord,
    normalizedInput.outcomeState,
    normalizedInput.canonicalRecommendation,
  ].join('\0'), 'utf8')).slice(0, 12);
  return path.join(responseDirectory, RESPONSE_ADJUDICATION_DIRECTORY_NAME, `${timestamp}-${digest}`);
}

function privateWrite(filePath, bytes) {
  fs.writeFileSync(filePath, bytes, { mode: 0o600, flag: 'wx' });
  fs.chmodSync(filePath, 0o600);
}

function crossCheckFindings(normalizedInput, responseManifest) {
  const evidence = new Map(responseManifest.evidence_files.map((row) => [row.path, row]));
  const referenced = new Set();
  for (const finding of normalizedInput.findings) {
    const descriptor = evidence.get(finding.source_artifact_path);
    assert.ok(descriptor, `finding references an unknown response artifact: ${finding.source_artifact_path}`);
    assert.equal(finding.source_artifact_sha256, descriptor.sha256,
      `finding response-artifact SHA-256 mismatch: ${finding.source_artifact_path}`);
    referenced.add(finding.source_artifact_path);
  }
  const missing = [...evidence.keys()].filter((artifactPath) => !referenced.has(artifactPath));
  assert.deepEqual(missing, [], `every response artifact must be source-addressed by a finding: ${missing.join(', ')}`);
}

export function recordResponseAdjudication({ responseDir, inputPath } = {}) {
  assert.equal(typeof responseDir, 'string', '--response-dir is required');
  assert.equal(typeof inputPath, 'string', '--input is required');

  const verified = verifyResponseCustodyChain({ responseDir });
  const inputRecord = readPrivateJson(inputPath, 'response-adjudication input', { requireLocal: true });
  const normalizedInput = validateResponseAdjudicationInput(inputRecord.value);
  const rulesRecord = readRules();
  crossCheckFindings(normalizedInput, verified.responseManifest);

  assert.ok(Date.parse(normalizedInput.reviewedAt) >= Date.parse(verified.responseManifest.response.received_at),
    'reviewed_at cannot precede the recorded response');

  const responseDirectory = verified.context.responseDirectory;
  const output = outputDirectory(responseDirectory, normalizedInput);
  assertNoSymlinkComponents(output);
  assert.equal(fs.existsSync(output), false,
    `refusing to overwrite existing response-adjudication directory: ${normalizeRelative(output)}`);
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  fs.chmodSync(output, 0o700);

  const reviewNotesBytes = Buffer.from(normalizedInput.reviewNotes, 'utf8');
  const manifest = {
    schema_version: RESPONSE_ADJUDICATION_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: 'response_adjudication_recorded_canonical_promotion_blocked',
    response_custody: {
      directory: verified.context.relativeResponseDirectory,
      manifest: RESPONSE_MANIFEST_NAME,
      bytes: verified.responseManifestRecord.bytes.length,
      sha256: sha256(verified.responseManifestRecord.bytes),
      state: verified.responseManifest.state,
      channel: verified.responseManifest.channel,
      response_received_at: verified.responseManifest.response.received_at,
      evidence_files: verified.responseManifest.evidence_files,
    },
    adjudication_rules: {
      path: ADJUDICATION_RULES_PATH,
      bytes: rulesRecord.bytes.length,
      sha256: sha256(rulesRecord.bytes),
      schema_version: rulesRecord.value.schema_version,
      status: rulesRecord.value.status,
    },
    review: {
      review_status: 'review_completed',
      reviewed_at: normalizedInput.reviewedAt,
      event_record: normalizedInput.reviewEventRecord,
      reviewer_role: normalizedInput.reviewerRole,
      reviewer_identity_recorded: false,
      original_response_bytes_inspected: true,
      all_response_artifacts_reviewed: true,
      review_notes_bytes: reviewNotesBytes.length,
      review_notes_sha256: sha256(reviewNotesBytes),
      review_notes_copied_to_manifest: false,
    },
    outcome: {
      state: normalizedInput.outcomeState,
      canonical_recommendation: normalizedInput.canonicalRecommendation,
      promotion_gate_assessment: normalizedInput.promotionGateAssessment,
      second_party_review_required: true,
      second_party_review_completed: false,
      canonical_mutation_authorized: false,
    },
    findings: normalizedInput.findings,
    controls: {
      source_pdf_dispatch_delivery_response_chain_verified: true,
      response_manifest_verified: true,
      response_evidence_files_verified: true,
      every_response_artifact_source_addressed: true,
      original_bytes_inspection_assertion_recorded: true,
      source_address_semantics_verified_by_tool: false,
      finding_semantics_verified_by_tool: false,
      transaction_join_semantics_verified_by_tool: false,
      source_authenticity_verified_by_tool: false,
      sender_identity_verified_by_tool: false,
      legal_timeliness_adjudicated: false,
      statutory_compliance_adjudicated: false,
      court_application_merits_adjudicated: false,
      legal_response_deadline_calculated: false,
      legal_response_deadline: null,
      canonical_mutation_authorized: false,
      candidate_branch_required_for_any_promotion: true,
      checksum_bound_receipt_required_for_any_promotion: true,
      targeted_validator_required_for_any_promotion: true,
      full_release_check_required_for_any_promotion: true,
      allottee_identity_canonically_promoted: false,
      beneficial_ownership_canonically_promoted: false,
      rights_exercise_canonically_promoted: false,
      actor_hop_canonically_promoted: false,
      network_calls_performed: false,
      messages_sent_by_tool: false,
      canonical_effect: 'none',
    },
  };

  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  try {
    privateWrite(path.join(output, RESPONSE_ADJUDICATION_MANIFEST_NAME), manifestBytes);
  } catch (error) {
    fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }

  return {
    state: manifest.state,
    response_dir: verified.context.relativeResponseDirectory,
    adjudication_dir: normalizeRelative(output),
    manifest_path: normalizeRelative(path.join(output, RESPONSE_ADJUDICATION_MANIFEST_NAME)),
    outcome_state: normalizedInput.outcomeState,
    canonical_recommendation: normalizedInput.canonicalRecommendation,
    canonical_mutation_authorized: false,
    canonical_effect: 'none',
  };
}
