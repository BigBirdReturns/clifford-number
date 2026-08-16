import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ACQUISITION_ID } from './electric-twin-register-request-core.mjs';
import {
  RESPONSE_MANIFEST_NAME,
  verifyResponseCustodyChain,
} from './electric-twin-register-request-response-core.mjs';
import {
  ADJUDICATION_RULES_PATH,
  RESPONSE_ADJUDICATION_INPUT_SCHEMA,
  RESPONSE_ADJUDICATION_MANIFEST_NAME,
  RESPONSE_ADJUDICATION_SCHEMA,
  validateResponseAdjudicationInput,
} from './electric-twin-register-request-response-adjudication-core.mjs';

export const RESPONSE_SECOND_PARTY_REVIEW_INPUT_SCHEMA =
  'electric-twin-register-request-response-second-party-review-input@1';
export const RESPONSE_SECOND_PARTY_REVIEW_SCHEMA =
  'electric-twin-register-request-response-second-party-review@1';
export const RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME =
  'inbound-response-second-party-review.json';
export const RESPONSE_SECOND_PARTY_REVIEW_DIRECTORY_NAME = 'second-party-review';

const REVIEWER_ROLES = new Set([
  'independent_repository_evidence_reviewer',
  'independent_source_custody_reviewer',
  'external_legal_reviewer',
  'other_qualified_independent_reviewer',
]);
const OVERALL_ASSESSMENTS = new Set([
  'confirmed',
  'narrowed',
  'rejected',
  'unresolved',
]);
const CANONICAL_RECOMMENDATION_BY_ASSESSMENT = new Map([
  ['confirmed', 'independent_review_completed_separate_promotion_required'],
  ['narrowed', 'candidate_reframing_review_required'],
  ['rejected', 'no_canonical_mutation'],
  ['unresolved', 'preserve_ambiguity_no_promotion'],
]);
const FINDING_ASSESSMENTS = new Set([
  'confirmed',
  'narrowed',
  'rejected',
  'unresolved',
]);
const SOURCE_ADDRESS_KINDS = new Set([
  'page',
  'line_range',
  'byte_range',
  'message_part',
  'document_section',
  'table_row',
]);

// First-review manifests issued by canonical commit 50a8590c1714ea8923a0b12a27ab8c14f40fbb81 bind to
// the exact rules bytes that predate the appended second-party-review contract.
const FIRST_REVIEW_RULES_COMPATIBILITY_RECEIPTS = Object.freeze([
  Object.freeze({
    path: ADJUDICATION_RULES_PATH,
    bytes: 8283,
    sha256: 'fd7211aee23b1411335232cc5a211852aa1aee5d31c2457f39054dd311cde133',
    schema_version: 'electric-twin-allottee-adjudication@1',
    status: 'active_fail_closed_rules',
  }),
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

function assertPrivateDirectory(directory, label) {
  assertNoSymlinkComponents(directory);
  assert.ok(fs.existsSync(directory), `${label} does not exist: ${normalizeRelative(directory)}`);
  const stat = fs.statSync(directory);
  assert.ok(stat.isDirectory(), `${label} must be a directory: ${normalizeRelative(directory)}`);
  assert.equal(stat.mode & 0o077, 0,
    `${label} must not be group- or world-accessible: ${normalizeRelative(directory)}`);
}

function readPrivateJson(filePath, label, { requireLocal = false } = {}) {
  const relative = normalizeRelative(filePath);
  if (requireLocal) {
    assert.ok(isWithin(relative, 'data/local'),
      `${label} must remain under ignored data/local/: ${relative}`);
  }
  assertNoSymlinkComponents(filePath);
  assert.ok(fs.existsSync(filePath), `${label} does not exist: ${relative}`);
  const stat = fs.statSync(filePath);
  assert.ok(stat.isFile(), `${label} must be a regular file: ${relative}`);
  assert.equal(stat.mode & 0o077, 0,
    `${label} must not be group- or world-readable: ${relative}`);
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
  assert.ok(value && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`);
  const kind = requireEnum(value.kind, `${label}.kind`, SOURCE_ADDRESS_KINDS);
  const locator = requireString(value.locator, `${label}.locator`, { maxLength: 512 });
  let start = null;
  let end = null;
  if (kind === 'line_range' || kind === 'byte_range') {
    start = requirePositiveInteger(value.start, `${label}.start`);
    end = requirePositiveInteger(value.end, `${label}.end`);
    assert.ok(end >= start, `${label}.end must be greater than or equal to start`);
  } else {
    assert.equal(value.start ?? null, null,
      `${label}.start is only allowed for line_range or byte_range`);
    assert.equal(value.end ?? null, null,
      `${label}.end is only allowed for line_range or byte_range`);
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

function validateFindingAssessment(value, index) {
  const label = `finding_assessments[${index}]`;
  assert.ok(value && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`);
  const findingId = requireOpaqueRecordId(value.finding_id, `${label}.finding_id`);
  const assessment = requireEnum(value.assessment, `${label}.assessment`, FINDING_ASSESSMENTS);
  const sourceArtifactPath = requireString(
    value.source_artifact_path, `${label}.source_artifact_path`, { maxLength: 256 },
  );
  assert.equal(sourceArtifactPath, path.basename(sourceArtifactPath),
    `${label}.source_artifact_path must be the copied response artifact filename`);
  const sourceArtifactSha256 = requireSha256(
    value.source_artifact_sha256, `${label}.source_artifact_sha256`,
  );
  const sourceAddress = validateSourceAddress(value.source_address, `${label}.source_address`);
  const rationale = requireString(value.rationale, `${label}.rationale`, { maxLength: 4096 });
  const remainingAmbiguities = requireUniqueStrings(
    value.remaining_ambiguities ?? [],
    `${label}.remaining_ambiguities`,
    { maxItems: 16, allowEmpty: true },
  );
  if (assessment === 'unresolved') {
    assert.ok(remainingAmbiguities.length > 0,
      `${label}.remaining_ambiguities must not be empty for an unresolved assessment`);
  }
  return {
    finding_id: findingId,
    assessment,
    source_artifact_path: sourceArtifactPath,
    source_artifact_sha256: sourceArtifactSha256,
    source_address: sourceAddress,
    rationale,
    remaining_ambiguities: remainingAmbiguities,
  };
}

export function validateResponseSecondPartyReviewInput(input) {
  assert.equal(input?.schema_version, RESPONSE_SECOND_PARTY_REVIEW_INPUT_SCHEMA,
    'unexpected response second-party-review input schema');
  assert.equal(input?.acquisition_id, ACQUISITION_ID,
    'response second-party-review acquisition_id mismatch');
  assert.equal(input?.review_status, 'second_party_review_completed',
    'review_status must be second_party_review_completed');
  const reviewedAt = requireIsoTimestamp(input.reviewed_at, 'reviewed_at');
  const reviewEventRecord = requireOpaqueRecordId(input.review_event_record, 'review_event_record');
  const reviewerRole = requireEnum(input.reviewer_role, 'reviewer_role', REVIEWER_ROLES);
  assert.ok(input.independence_attestation
    && typeof input.independence_attestation === 'object'
    && !Array.isArray(input.independence_attestation),
  'independence_attestation must be an object');
  for (const field of [
    'original_response_bytes_inspected',
    'all_response_artifacts_reviewed',
    'first_review_manifest_inspected',
    'independent_judgment_asserted',
  ]) {
    assert.equal(input.independence_attestation[field], true,
      `independence_attestation.${field} must be true`);
  }
  const firstReviewManifestSha256 = requireSha256(
    input.first_review_manifest_sha256, 'first_review_manifest_sha256',
  );
  const firstReviewManifestBytes = requirePositiveInteger(
    input.first_review_manifest_bytes, 'first_review_manifest_bytes',
  );
  const overallAssessment = requireEnum(
    input.overall_assessment, 'overall_assessment', OVERALL_ASSESSMENTS,
  );
  const canonicalRecommendation = requireString(
    input.canonical_recommendation, 'canonical_recommendation', { maxLength: 128 },
  );
  assert.equal(canonicalRecommendation,
    CANONICAL_RECOMMENDATION_BY_ASSESSMENT.get(overallAssessment),
    'canonical_recommendation does not match overall_assessment');
  assert.ok(Array.isArray(input.finding_assessments),
    'finding_assessments must be an array');
  assert.ok(input.finding_assessments.length >= 1 && input.finding_assessments.length <= 32,
    'finding_assessments must contain between one and thirty-two rows');
  const findingAssessments = input.finding_assessments.map(validateFindingAssessment);
  assert.equal(new Set(findingAssessments.map((row) => row.finding_id)).size,
    findingAssessments.length, 'finding_assessments contain duplicate finding_id values');
  const assessmentValues = findingAssessments.map((row) => row.assessment);
  let requiredOverallAssessment;
  if (assessmentValues.every((value) => value === 'confirmed')) {
    requiredOverallAssessment = 'confirmed';
  } else if (assessmentValues.every((value) => value === 'rejected')) {
    requiredOverallAssessment = 'rejected';
  } else if (assessmentValues.includes('unresolved')) {
    requiredOverallAssessment = 'unresolved';
  } else {
    requiredOverallAssessment = 'narrowed';
  }
  assert.equal(
    overallAssessment,
    requiredOverallAssessment,
    `overall_assessment must be ${requiredOverallAssessment} for the finding assessment combination`,
  );
  const reviewNotes = requireString(input.review_notes, 'review_notes', { maxLength: 8192 });
  assert.equal(input.second_party_review_required, true,
    'second_party_review_required must be true');
  assert.equal(input.second_party_review_completed, true,
    'second_party_review_completed must be true');
  assert.equal(input.canonical_mutation_authorized, false,
    'canonical_mutation_authorized must remain false');
  return {
    reviewedAt,
    reviewEventRecord,
    reviewerRole,
    firstReviewManifestSha256,
    firstReviewManifestBytes,
    overallAssessment,
    canonicalRecommendation,
    findingAssessments,
    reviewNotes,
  };
}

function resolveAdjudicationContext(directory) {
  const adjudicationDirectory = path.resolve(directory);
  assertPrivateDirectory(adjudicationDirectory, 'response adjudication directory');
  const adjudicationContainer = path.dirname(adjudicationDirectory);
  assert.equal(path.basename(adjudicationContainer), 'adjudication',
    'response adjudication directory must be an immutable child of an adjudication/ directory');
  const responseDirectory = path.dirname(adjudicationContainer);
  assertPrivateDirectory(responseDirectory, 'response custody directory');
  return {
    adjudicationDirectory,
    relativeAdjudicationDirectory: normalizeRelative(adjudicationDirectory),
    responseDirectory,
    relativeResponseDirectory: normalizeRelative(responseDirectory),
  };
}

function readRules() {
  const bytes = fs.readFileSync(ADJUDICATION_RULES_PATH);
  const value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value?.schema_version, 'electric-twin-allottee-adjudication@1',
    'unexpected allottee-adjudication rules schema');
  assert.equal(value?.acquisition_id, ACQUISITION_ID,
    'adjudication rules acquisition_id mismatch');
  assert.equal(value?.status, 'active_fail_closed_rules',
    'adjudication rules are not active');
  const contract = value.second_party_review_contract;
  assert.equal(contract?.input_schema, RESPONSE_SECOND_PARTY_REVIEW_INPUT_SCHEMA,
    'second-party-review rules input schema mismatch');
  assert.equal(contract?.output_schema, RESPONSE_SECOND_PARTY_REVIEW_SCHEMA,
    'second-party-review rules output schema mismatch');
  assert.equal(contract?.output_state,
    'response_second_party_review_recorded_canonical_promotion_blocked',
    'second-party-review rules output state mismatch');
  assert.equal(contract?.every_first_review_finding_must_be_assessed_exactly_once, true);
  assert.equal(contract?.canonical_mutation_authorized_by_this_gate, false);
  assert.equal(contract?.canonical_effect, 'none');
  return { bytes, value };
}

function currentRulesReceipt(rulesRecord) {
  return {
    path: ADJUDICATION_RULES_PATH,
    bytes: rulesRecord.bytes.length,
    sha256: sha256(rulesRecord.bytes),
    schema_version: rulesRecord.value.schema_version,
    status: rulesRecord.value.status,
  };
}

function validateFirstReviewRulesReceipt(receipt, rulesRecord) {
  const acceptedReceipts = [
    currentRulesReceipt(rulesRecord),
    ...FIRST_REVIEW_RULES_COMPATIBILITY_RECEIPTS,
  ];
  const matched = acceptedReceipts.some((candidate) => (
    candidate.path === receipt.path
    && candidate.bytes === receipt.bytes
    && candidate.sha256 === receipt.sha256
    && candidate.schema_version === receipt.schema_version
    && candidate.status === receipt.status
  ));
  assert.equal(matched, true,
    'first review adjudication-rules receipt is not recognized');
}

function validateFirstReviewManifest(manifest, record, context, verified, rulesRecord) {
  const assertExactKeys = (value, expectedKeys, label) => {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value),
      `${label} must be an object`);
    assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort(),
      `${label} field set mismatch`);
  };

  assertExactKeys(manifest, [
    'schema_version',
    'acquisition_id',
    'state',
    'response_custody',
    'adjudication_rules',
    'review',
    'outcome',
    'findings',
    'controls',
  ], 'first review manifest');
  assert.equal(manifest.schema_version, RESPONSE_ADJUDICATION_SCHEMA,
    'unexpected response adjudication schema');
  assert.equal(manifest.acquisition_id, ACQUISITION_ID,
    'response adjudication acquisition_id mismatch');
  assert.equal(manifest.state,
    'response_adjudication_recorded_canonical_promotion_blocked',
    'response adjudication is not in the expected promotion-blocked state');

  assertExactKeys(manifest.response_custody, [
    'directory',
    'manifest',
    'bytes',
    'sha256',
    'state',
    'channel',
    'response_received_at',
    'evidence_files',
  ], 'first review response_custody');
  assert.equal(manifest.response_custody.directory, context.relativeResponseDirectory,
    'first review response-custody directory mismatch');
  assert.equal(manifest.response_custody.manifest, RESPONSE_MANIFEST_NAME,
    'first review response manifest name mismatch');
  assert.equal(manifest.response_custody.bytes,
    verified.responseManifestRecord.bytes.length,
    'first review response-manifest byte length mismatch');
  assert.equal(manifest.response_custody.sha256,
    sha256(verified.responseManifestRecord.bytes),
    'first review response-manifest SHA-256 mismatch');
  assert.equal(manifest.response_custody.state,
    verified.responseManifest.state,
    'first review response state mismatch');
  assert.equal(manifest.response_custody.channel,
    verified.responseManifest.channel,
    'first review response channel mismatch');
  assert.equal(manifest.response_custody.response_received_at,
    verified.responseManifest.response.received_at,
    'first review response received_at mismatch');
  assert.deepEqual(manifest.response_custody.evidence_files,
    verified.responseManifest.evidence_files,
    'first review response evidence descriptors mismatch');

  assertExactKeys(manifest.adjudication_rules, [
    'path',
    'bytes',
    'sha256',
    'schema_version',
    'status',
  ], 'first review adjudication_rules');
  validateFirstReviewRulesReceipt(manifest.adjudication_rules, rulesRecord);

  assertExactKeys(manifest.review, [
    'review_status',
    'reviewed_at',
    'event_record',
    'reviewer_role',
    'reviewer_identity_recorded',
    'original_response_bytes_inspected',
    'all_response_artifacts_reviewed',
    'review_notes_bytes',
    'review_notes_sha256',
    'review_notes_copied_to_manifest',
  ], 'first review review');
  assertExactKeys(manifest.outcome, [
    'state',
    'canonical_recommendation',
    'promotion_gate_assessment',
    'second_party_review_required',
    'second_party_review_completed',
    'canonical_mutation_authorized',
  ], 'first review outcome');

  const normalizedStoredReview = validateResponseAdjudicationInput({
    schema_version: RESPONSE_ADJUDICATION_INPUT_SCHEMA,
    acquisition_id: manifest.acquisition_id,
    review_status: manifest.review.review_status,
    reviewed_at: manifest.review.reviewed_at,
    review_event_record: manifest.review.event_record,
    reviewer_role: manifest.review.reviewer_role,
    original_response_bytes_inspected: manifest.review.original_response_bytes_inspected,
    all_response_artifacts_reviewed: manifest.review.all_response_artifacts_reviewed,
    outcome_state: manifest.outcome.state,
    canonical_recommendation: manifest.outcome.canonical_recommendation,
    promotion_gate_assessment: manifest.outcome.promotion_gate_assessment,
    legal_timeliness_assessment: 'not_adjudicated',
    statutory_compliance_assessment: 'not_adjudicated',
    court_application_merits_assessment: 'not_adjudicated',
    findings: manifest.findings,
    review_notes: 'stored first-review notes retained only by byte length and SHA-256',
    second_party_review_required: manifest.outcome.second_party_review_required,
    second_party_review_completed: manifest.outcome.second_party_review_completed,
    canonical_mutation_authorized: manifest.outcome.canonical_mutation_authorized,
  });
  assert.equal(normalizedStoredReview.reviewedAt, manifest.review.reviewed_at,
    'stored first-review reviewed_at failed revalidation');
  assert.ok(
    Date.parse(normalizedStoredReview.reviewedAt)
      >= Date.parse(verified.responseManifest.response.received_at),
    'stored first-review reviewed_at cannot precede the recorded response',
  );
  assert.equal(normalizedStoredReview.reviewEventRecord, manifest.review.event_record,
    'stored first-review event_record failed revalidation');
  assert.equal(normalizedStoredReview.reviewerRole, manifest.review.reviewer_role,
    'stored first-review reviewer_role failed revalidation');
  assert.equal(normalizedStoredReview.outcomeState, manifest.outcome.state,
    'stored first-review outcome state failed revalidation');
  assert.equal(normalizedStoredReview.canonicalRecommendation,
    manifest.outcome.canonical_recommendation,
    'stored first-review canonical recommendation failed revalidation');
  assert.equal(normalizedStoredReview.promotionGateAssessment,
    manifest.outcome.promotion_gate_assessment,
    'stored first-review promotion assessment failed revalidation');
  assert.deepEqual(normalizedStoredReview.findings, manifest.findings,
    'stored first-review findings failed normalized revalidation');

  assert.equal(manifest.review.reviewer_identity_recorded, false,
    'first review reviewer_identity_recorded must remain false');
  requirePositiveInteger(manifest.review.review_notes_bytes,
    'first review review_notes_bytes');
  requireSha256(manifest.review.review_notes_sha256,
    'first review review_notes_sha256');
  assert.equal(manifest.review.review_notes_copied_to_manifest, false,
    'first review review_notes_copied_to_manifest must remain false');

  const expectedFirstReviewControls = new Map([
    ['source_pdf_dispatch_delivery_response_chain_verified', true],
    ['response_manifest_verified', true],
    ['response_evidence_files_verified', true],
    ['every_response_artifact_source_addressed', true],
    ['original_bytes_inspection_assertion_recorded', true],
    ['source_address_semantics_verified_by_tool', false],
    ['finding_semantics_verified_by_tool', false],
    ['transaction_join_semantics_verified_by_tool', false],
    ['source_authenticity_verified_by_tool', false],
    ['sender_identity_verified_by_tool', false],
    ['legal_timeliness_adjudicated', false],
    ['statutory_compliance_adjudicated', false],
    ['court_application_merits_adjudicated', false],
    ['legal_response_deadline_calculated', false],
    ['legal_response_deadline', null],
    ['canonical_mutation_authorized', false],
    ['candidate_branch_required_for_any_promotion', true],
    ['checksum_bound_receipt_required_for_any_promotion', true],
    ['targeted_validator_required_for_any_promotion', true],
    ['full_release_check_required_for_any_promotion', true],
    ['allottee_identity_canonically_promoted', false],
    ['beneficial_ownership_canonically_promoted', false],
    ['rights_exercise_canonically_promoted', false],
    ['actor_hop_canonically_promoted', false],
    ['network_calls_performed', false],
    ['messages_sent_by_tool', false],
    ['canonical_effect', 'none'],
  ]);
  assertExactKeys(manifest.controls,
    expectedFirstReviewControls.keys(), 'first review controls');
  for (const [field, expected] of expectedFirstReviewControls) {
    assert.deepEqual(manifest.controls[field], expected,
      `first review controls.${field} mismatch`);
  }

  const canonicalBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  assert.equal(record.bytes.equals(canonicalBytes), true,
    'first review manifest must use canonical JSON serialization');
  assert.ok(record.bytes.length > 0, 'first review manifest must not be empty');
  return manifest;
}

function crossCheckSecondPartyReview(normalizedInput, firstManifest, verified) {
  assert.equal(normalizedInput.firstReviewManifestBytes,
    Buffer.byteLength(`${JSON.stringify(firstManifest, null, 2)}\n`, 'utf8'),
    'first_review_manifest_bytes mismatch');
  const firstFindings = new Map(firstManifest.findings.map((row) => [row.finding_id, row]));
  const firstIds = [...firstFindings.keys()].sort();
  const secondIds = normalizedInput.findingAssessments.map((row) => row.finding_id).sort();
  assert.deepEqual(secondIds, firstIds,
    'every first-review finding must be assessed exactly once');
  const responseEvidence = new Map(
    verified.responseManifest.evidence_files.map((row) => [row.path, row]),
  );
  const referencedArtifacts = new Set();
  for (const assessment of normalizedInput.findingAssessments) {
    const firstFinding = firstFindings.get(assessment.finding_id);
    assert.equal(assessment.source_artifact_path, firstFinding.source_artifact_path,
      `second-party source artifact path mismatch for ${assessment.finding_id}`);
    assert.equal(assessment.source_artifact_sha256, firstFinding.source_artifact_sha256,
      `second-party source artifact SHA-256 mismatch for ${assessment.finding_id}`);
    const descriptor = responseEvidence.get(assessment.source_artifact_path);
    assert.ok(descriptor,
      `second-party review references unknown response artifact: ${assessment.source_artifact_path}`);
    assert.equal(assessment.source_artifact_sha256, descriptor.sha256,
      `second-party response-artifact SHA-256 mismatch: ${assessment.source_artifact_path}`);
    referencedArtifacts.add(assessment.source_artifact_path);
    if (assessment.assessment === 'confirmed') {
      assert.deepEqual(assessment.remaining_ambiguities,
        firstFinding.unresolved_ambiguities,
        `confirmed finding must preserve the first review ambiguity ledger: ${assessment.finding_id}`);
    }
  }
  const missingArtifacts = [...responseEvidence.keys()]
    .filter((artifactPath) => !referencedArtifacts.has(artifactPath));
  assert.deepEqual(missingArtifacts, [],
    `every response artifact must be independently source-addressed: ${missingArtifacts.join(', ')}`);
}

function outputDirectory(adjudicationDirectory, normalizedInput) {
  const timestamp = normalizedInput.reviewedAt.replaceAll(':', '-').replaceAll('.', '-');
  const digest = sha256(Buffer.from([
    normalizedInput.reviewEventRecord,
    normalizedInput.overallAssessment,
    normalizedInput.canonicalRecommendation,
    normalizedInput.firstReviewManifestSha256,
  ].join('\0'), 'utf8')).slice(0, 12);
  return path.join(
    adjudicationDirectory,
    RESPONSE_SECOND_PARTY_REVIEW_DIRECTORY_NAME,
    `${timestamp}-${digest}`,
  );
}

function privateWrite(filePath, bytes) {
  fs.writeFileSync(filePath, bytes, { mode: 0o600, flag: 'wx' });
  fs.chmodSync(filePath, 0o600);
}

export function recordResponseSecondPartyReview({ adjudicationDir, inputPath } = {}) {
  assert.equal(typeof adjudicationDir, 'string', '--adjudication-dir is required');
  assert.equal(typeof inputPath, 'string', '--input is required');

  const context = resolveAdjudicationContext(adjudicationDir);
  const verified = verifyResponseCustodyChain({ responseDir: context.responseDirectory });
  const rulesRecord = readRules();
  const firstManifestRecord = readPrivateJson(
    path.join(context.adjudicationDirectory, RESPONSE_ADJUDICATION_MANIFEST_NAME),
    RESPONSE_ADJUDICATION_MANIFEST_NAME,
  );
  const firstManifest = validateFirstReviewManifest(
    firstManifestRecord.value,
    firstManifestRecord,
    context,
    verified,
    rulesRecord,
  );
  const inputRecord = readPrivateJson(
    inputPath,
    'response second-party-review input',
    { requireLocal: true },
  );
  const normalizedInput = validateResponseSecondPartyReviewInput(inputRecord.value);

  assert.equal(normalizedInput.firstReviewManifestBytes, firstManifestRecord.bytes.length,
    'first_review_manifest_bytes mismatch');
  assert.equal(normalizedInput.firstReviewManifestSha256, sha256(firstManifestRecord.bytes),
    'first_review_manifest_sha256 mismatch');
  assert.notEqual(normalizedInput.reviewEventRecord, firstManifest.review.event_record,
    'second-party review event must differ from the first review event');
  assert.ok(Date.parse(normalizedInput.reviewedAt) >= Date.parse(firstManifest.review.reviewed_at),
    'second-party reviewed_at cannot precede the first review');
  crossCheckSecondPartyReview(normalizedInput, firstManifest, verified);

  const output = outputDirectory(context.adjudicationDirectory, normalizedInput);
  assertNoSymlinkComponents(output);
  assert.equal(fs.existsSync(output), false,
    `refusing to overwrite existing second-party-review directory: ${normalizeRelative(output)}`);
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  fs.chmodSync(output, 0o700);

  const reviewNotesBytes = Buffer.from(normalizedInput.reviewNotes, 'utf8');
  const manifest = {
    schema_version: RESPONSE_SECOND_PARTY_REVIEW_SCHEMA,
    acquisition_id: ACQUISITION_ID,
    state: 'response_second_party_review_recorded_canonical_promotion_blocked',
    response_custody: {
      directory: context.relativeResponseDirectory,
      manifest: RESPONSE_MANIFEST_NAME,
      bytes: verified.responseManifestRecord.bytes.length,
      sha256: sha256(verified.responseManifestRecord.bytes),
      state: verified.responseManifest.state,
      evidence_files: verified.responseManifest.evidence_files,
    },
    first_review: {
      directory: context.relativeAdjudicationDirectory,
      manifest: RESPONSE_ADJUDICATION_MANIFEST_NAME,
      bytes: firstManifestRecord.bytes.length,
      sha256: sha256(firstManifestRecord.bytes),
      state: firstManifest.state,
      reviewed_at: firstManifest.review.reviewed_at,
      event_record: firstManifest.review.event_record,
      reviewer_role: firstManifest.review.reviewer_role,
      outcome_state: firstManifest.outcome.state,
      canonical_recommendation: firstManifest.outcome.canonical_recommendation,
      finding_ids: firstManifest.findings.map((row) => row.finding_id),
      second_party_review_required: true,
      second_party_review_completed: false,
      canonical_mutation_authorized: false,
    },
    adjudication_rules: {
      path: ADJUDICATION_RULES_PATH,
      bytes: rulesRecord.bytes.length,
      sha256: sha256(rulesRecord.bytes),
      schema_version: rulesRecord.value.schema_version,
      status: rulesRecord.value.status,
    },
    review: {
      review_status: 'second_party_review_completed',
      reviewed_at: normalizedInput.reviewedAt,
      event_record: normalizedInput.reviewEventRecord,
      reviewer_role: normalizedInput.reviewerRole,
      reviewer_identity_recorded: false,
      original_response_bytes_inspected: true,
      all_response_artifacts_reviewed: true,
      first_review_manifest_inspected: true,
      independent_judgment_asserted: true,
      independence_verified_by_tool: false,
      review_notes_bytes: reviewNotesBytes.length,
      review_notes_sha256: sha256(reviewNotesBytes),
      review_notes_copied_to_manifest: false,
    },
    assessment: {
      overall_assessment: normalizedInput.overallAssessment,
      canonical_recommendation: normalizedInput.canonicalRecommendation,
      second_party_review_required: true,
      second_party_review_completed: true,
      canonical_mutation_authorized: false,
    },
    finding_assessments: normalizedInput.findingAssessments,
    controls: {
      full_source_pdf_dispatch_delivery_response_chain_verified: true,
      response_manifest_verified: true,
      response_evidence_files_verified: true,
      first_review_manifest_verified: true,
      adjudication_rules_verified: true,
      every_first_review_finding_assessed_exactly_once: true,
      every_response_artifact_independently_source_addressed: true,
      independence_assertion_recorded: true,
      independence_verified_by_tool: false,
      source_address_semantics_verified_by_tool: false,
      finding_semantics_verified_by_tool: false,
      first_review_semantic_correctness_verified_by_tool: false,
      second_party_semantic_correctness_verified_by_tool: false,
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
    privateWrite(path.join(output, RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME), manifestBytes);
  } catch (error) {
    fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }

  return {
    state: manifest.state,
    adjudication_dir: context.relativeAdjudicationDirectory,
    second_party_review_dir: normalizeRelative(output),
    manifest_path: normalizeRelative(
      path.join(output, RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME),
    ),
    first_review_outcome_state: firstManifest.outcome.state,
    overall_assessment: normalizedInput.overallAssessment,
    canonical_recommendation: normalizedInput.canonicalRecommendation,
    second_party_review_completed: true,
    canonical_mutation_authorized: false,
    canonical_effect: 'none',
  };
}
