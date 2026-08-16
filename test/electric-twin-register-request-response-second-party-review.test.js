#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
} from '../tools/lib/electric-twin-register-request-response-core.mjs';
import {
  RESPONSE_ADJUDICATION_MANIFEST_NAME,
  recordResponseAdjudication,
} from '../tools/lib/electric-twin-register-request-response-adjudication-core.mjs';
import {
  RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME,
  recordResponseSecondPartyReview,
  validateResponseSecondPartyReviewInput,
} from '../tools/lib/electric-twin-register-request-response-second-party-review-core.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

const privateDir = 'data/local';
const outputRoot = 'build/source-acquisition/electric-twin-register-of-members';
const requesterPath = `${privateDir}/electric-twin-second-party-requester-${process.pid}.json`;
const dispatchInputPath = `${privateDir}/electric-twin-second-party-dispatch-${process.pid}.json`;
const deliveryInputPath = `${privateDir}/electric-twin-second-party-delivery-${process.pid}.json`;
const responseInputPath = `${privateDir}/electric-twin-second-party-response-${process.pid}.json`;
const firstReviewInputPath = `${privateDir}/electric-twin-first-review-${process.pid}.json`;
const secondReviewInputPath = `${privateDir}/electric-twin-second-review-${process.pid}.json`;
const outsideSecondReviewPath = `build/electric-twin-second-review-outside-${process.pid}.json`;
const dispatchProofPath = `${privateDir}/electric-twin-second-party-dispatch-proof-${process.pid}.pdf`;
const deliveryProofPath = `${privateDir}/electric-twin-second-party-delivery-proof-${process.pid}.pdf`;
const responseInstrumentPath = `${privateDir}/electric-twin-second-party-instrument-${process.pid}.pdf`;
const outputA = `${outputRoot}/second-party-review-test-${process.pid}-a`;
const outputB = `${outputRoot}/second-party-review-test-${process.pid}-b`;
const outputC = `${outputRoot}/second-party-review-test-${process.pid}-c`;
const PRE_SECOND_PARTY_RULES_RECEIPT = Object.freeze({
  source_commit: '50a8590c1714ea8923a0b12a27ab8c14f40fbb81',
  bytes: 8283,
  sha256: 'fd7211aee23b1411335232cc5a211852aa1aee5d31c2457f39054dd311cde133',
});
const cleanupPaths = [
  requesterPath,
  dispatchInputPath,
  deliveryInputPath,
  responseInputPath,
  firstReviewInputPath,
  secondReviewInputPath,
  outsideSecondReviewPath,
  dispatchProofPath,
  deliveryProofPath,
  responseInstrumentPath,
  outputA,
  outputB,
  outputC,
];

const requesterInput = {
  schema_version: 'electric-twin-register-request-private-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  requester: {
    full_name: 'Test Independent Review Researcher',
    postal_address_lines: ['1 Test Street', 'London', 'SW1A 1AA'],
    email: 'independent-reviewer@example.test',
  },
  request_date: '2026-09-01',
  disclosure_recipients: ['NO OTHER PERSON'],
  location_verification: {
    checked_at: '2026-09-01',
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
    finalization_record: 'test-second-party-finalization-authorization-001',
    finalized_at: '2026-09-01T08:00:00Z',
    statutory_dispatch_authorized: true,
    statutory_dispatch_record: 'test-second-party-statutory-dispatch-authorization-001',
    voluntary_dispatch_authorized: false,
    voluntary_dispatch_record: null,
  },
};

const dispatchInput = {
  schema_version: 'electric-twin-register-request-dispatch-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  channel: 'statutory_register_request',
  method: 'postal_service',
  declared_dispatched_at: '2026-09-01T09:00:00Z',
  dispatch_event_record: 'test-second-party-postal-dispatch-event-001',
  authorization_record: 'test-second-party-statutory-dispatch-authorization-001',
  service_provider: 'Test Postal Service',
  service_level: 'Tracked custody service',
  tracking_reference: 'TEST-SECOND-PARTY-TRACKING-REFERENCE-001',
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
  confirmed_delivered_at: '2026-09-01T10:00:00Z',
  confirmed_receipt_local_date: '2026-09-01',
  receipt_time_zone: 'Europe/London',
  delivery_event_record: 'test-second-party-delivery-event-001',
  tracking_reference: 'TEST-SECOND-PARTY-TRACKING-REFERENCE-001',
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
    calendar_record: 'test-second-party-calendar-001',
    reviewed_at: '2026-09-01',
    source_urls: [
      'https://www.legislation.gov.uk/ukpga/2006/46/section/117',
      'https://www.gov.uk/bank-holidays',
    ],
    counting_rule: 'first_eligible_day_after_receipt_is_day_1',
    non_working_dates: [],
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
  response_event_record: 'test-second-party-response-event-001',
  response_route: 'postal_service',
  sender_role: 'company_corporate_services_provider',
  asserted_sender: 'Test Corporate Services Provider',
  primary_disposition: 'voluntary_transaction_record_supplied',
  additional_dispositions: [],
  asserted_document_categories: ['subscription_schedule'],
  evidence_artifacts: [
    {
      role: 'transaction_instrument',
      path: responseInstrumentPath,
      mime_type: 'application/pdf',
    },
  ],
};

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function writePrivateJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function buildResponseChain(outputDir) {
  finalizeRequestFiles({ inputPath: requesterPath, outputDir });
  renderRequestPdfs({ sourceDir: outputDir });
  const dispatch = recordDispatchCustody({ sourceDir: outputDir, inputPath: dispatchInputPath });
  const delivery = recordDeliveryCustody({
    dispatchDir: dispatch.dispatch_dir,
    inputPath: deliveryInputPath,
  });
  return recordResponseCustody({
    deliveryDir: delivery.delivery_dir,
    inputPath: responseInputPath,
  });
}

function firstReviewInputFor(responseResult, overrides = {}) {
  const responseManifest = JSON.parse(fs.readFileSync(
    path.join(responseResult.response_dir, RESPONSE_MANIFEST_NAME),
    'utf8',
  ));
  const artifact = responseManifest.evidence_files[0];
  return {
    schema_version: 'electric-twin-register-request-response-adjudication-input@1',
    acquisition_id: 'ET-ROM-2025-09-01',
    review_status: 'review_completed',
    reviewed_at: '2026-09-04T12:00:00Z',
    review_event_record: 'test-second-party-first-review-event-001',
    reviewer_role: 'repository_evidence_reviewer',
    original_response_bytes_inspected: true,
    all_response_artifacts_reviewed: true,
    outcome_state: 'partial_or_ambiguous_response',
    canonical_recommendation: 'no_canonical_mutation',
    promotion_gate_assessment: 'not_satisfied',
    legal_timeliness_assessment: 'not_adjudicated',
    statutory_compliance_assessment: 'not_adjudicated',
    court_application_merits_assessment: 'not_adjudicated',
    findings: [
      {
        finding_id: 'first-review-finding-001',
        proposition_class: 'response_scope_or_completeness',
        conclusion: 'ambiguous',
        source_artifact_path: artifact.path,
        source_artifact_sha256: artifact.sha256,
        source_address: {
          kind: 'page',
          page: 1,
          locator: 'Synthetic response fixture, page 1',
        },
        assertion: 'The response is source-addressed but its transaction semantics remain ambiguous.',
        unresolved_ambiguities: [
          'transaction mechanism and legal vehicle identity remain unresolved',
        ],
        transaction_join: null,
      },
    ],
    review_notes: 'The first review preserves ambiguity and authorizes no canonical mutation.',
    second_party_review_required: true,
    second_party_review_completed: false,
    canonical_mutation_authorized: false,
    ...overrides,
  };
}

function recordFirstReview(responseResult, input) {
  writePrivateJson(firstReviewInputPath, input);
  return recordResponseAdjudication({
    responseDir: responseResult.response_dir,
    inputPath: firstReviewInputPath,
  });
}

function secondPartyInputFor(firstResult, overrides = {}) {
  const firstManifestPath = path.join(
    firstResult.adjudication_dir,
    RESPONSE_ADJUDICATION_MANIFEST_NAME,
  );
  const firstManifestBytes = fs.readFileSync(firstManifestPath);
  const firstManifest = JSON.parse(firstManifestBytes.toString('utf8'));
  const firstFinding = firstManifest.findings[0];
  return {
    schema_version: 'electric-twin-register-request-response-second-party-review-input@1',
    acquisition_id: 'ET-ROM-2025-09-01',
    review_status: 'second_party_review_completed',
    reviewed_at: '2026-09-05T12:00:00Z',
    review_event_record: 'test-second-party-review-event-001',
    reviewer_role: 'independent_repository_evidence_reviewer',
    independence_attestation: {
      original_response_bytes_inspected: true,
      all_response_artifacts_reviewed: true,
      first_review_manifest_inspected: true,
      independent_judgment_asserted: true,
    },
    first_review_manifest_sha256: sha256(firstManifestBytes),
    first_review_manifest_bytes: firstManifestBytes.length,
    overall_assessment: 'confirmed',
    canonical_recommendation: 'independent_review_completed_separate_promotion_required',
    finding_assessments: [
      {
        finding_id: firstFinding.finding_id,
        assessment: 'confirmed',
        source_artifact_path: firstFinding.source_artifact_path,
        source_artifact_sha256: firstFinding.source_artifact_sha256,
        source_address: {
          kind: 'page',
          page: 1,
          locator: 'Independent review of synthetic response fixture, page 1',
        },
        rationale: 'The second reviewer confirms the first reviewer’s bounded ambiguity classification.',
        remaining_ambiguities: [...firstFinding.unresolved_ambiguities],
      },
    ],
    review_notes: 'The independent review confirms only the first review’s bounded conclusion.',
    second_party_review_required: true,
    second_party_review_completed: true,
    canonical_mutation_authorized: false,
    ...overrides,
  };
}

fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.mkdirSync('build', { recursive: true });
for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
writePrivateJson(requesterPath, requesterInput);
writePrivateJson(dispatchInputPath, dispatchInput);
writePrivateJson(deliveryInputPath, deliveryInput);
writePrivateJson(responseInputPath, responseInput);
fs.writeFileSync(
  dispatchProofPath,
  Buffer.from('%PDF-1.4\ndispatch proof fixture\n%%EOF\n', 'ascii'),
  { mode: 0o600 },
);
fs.chmodSync(dispatchProofPath, 0o600);
fs.writeFileSync(
  deliveryProofPath,
  Buffer.from('%PDF-1.4\ndelivery proof fixture\n%%EOF\n', 'ascii'),
  { mode: 0o600 },
);
fs.chmodSync(deliveryProofPath, 0o600);
fs.writeFileSync(
  responseInstrumentPath,
  Buffer.from([
    '%PDF-1.4',
    'Test source-addressed transaction instrument fixture.',
    'Electric Twin Ltd; Seed 2 Preferred; quantity 604294; date 2025-09-16.',
    'The fixture is synthetic and does not itself establish a real allottee.',
    '%%EOF',
    '',
  ].join('\n'), 'ascii'),
  { mode: 0o600 },
);
fs.chmodSync(responseInstrumentPath, 0o600);

try {
  const responseA = buildResponseChain(outputA);
  const firstPartial = recordFirstReview(responseA, firstReviewInputFor(responseA));
  const validSecond = secondPartyInputFor(firstPartial);
  assert.doesNotThrow(() => validateResponseSecondPartyReviewInput(validSecond));
  writePrivateJson(secondReviewInputPath, validSecond);
  const secondResult = recordResponseSecondPartyReview({
    adjudicationDir: firstPartial.adjudication_dir,
    inputPath: secondReviewInputPath,
  });
  assert.equal(
    secondResult.state,
    'response_second_party_review_recorded_canonical_promotion_blocked',
  );
  assert.equal(secondResult.first_review_outcome_state, 'partial_or_ambiguous_response');
  assert.equal(secondResult.overall_assessment, 'confirmed');
  assert.equal(secondResult.second_party_review_completed, true);
  assert.equal(secondResult.canonical_mutation_authorized, false);
  assert.equal(secondResult.canonical_effect, 'none');

  const secondManifestPath = path.join(
    secondResult.second_party_review_dir,
    RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME,
  );
  const secondManifest = JSON.parse(fs.readFileSync(secondManifestPath, 'utf8'));
  assert.equal(secondManifest.first_review.second_party_review_completed, false);
  assert.equal(secondManifest.assessment.second_party_review_completed, true);
  assert.equal(secondManifest.assessment.canonical_mutation_authorized, false);
  assert.equal(secondManifest.controls.first_review_manifest_verified, true);
  assert.equal(secondManifest.controls.every_first_review_finding_assessed_exactly_once, true);
  assert.equal(secondManifest.controls.every_response_artifact_independently_source_addressed, true);
  assert.equal(secondManifest.controls.independence_verified_by_tool, false);
  assert.equal(secondManifest.controls.first_review_semantic_correctness_verified_by_tool, false);
  assert.equal(secondManifest.controls.second_party_semantic_correctness_verified_by_tool, false);
  assert.equal(secondManifest.controls.allottee_identity_canonically_promoted, false);
  assert.equal(secondManifest.controls.beneficial_ownership_canonically_promoted, false);
  assert.equal(secondManifest.controls.rights_exercise_canonically_promoted, false);
  assert.equal(secondManifest.controls.actor_hop_canonically_promoted, false);
  assert.equal(secondManifest.controls.canonical_effect, 'none');
  const secondManifestText = JSON.stringify(secondManifest);
  assert.equal(secondManifestText.includes('Test Corporate Services Provider'), false);
  assert.equal(secondManifestText.includes('Test Independent Review Researcher'), false);
  assert.equal(secondManifestText.includes('independent-reviewer@example.test'), false);
  assert.equal(fs.statSync(secondResult.second_party_review_dir).mode & 0o077, 0);
  assert.equal(fs.statSync(secondManifestPath).mode & 0o077, 0);

  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /refusing to overwrite existing second-party-review directory/u,
  );

  const invalidDigest = structuredClone(validSecond);
  invalidDigest.first_review_manifest_sha256 = '0'.repeat(64);
  writePrivateJson(secondReviewInputPath, invalidDigest);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /first_review_manifest_sha256 mismatch/u,
  );

  const invalidBytes = structuredClone(validSecond);
  invalidBytes.first_review_manifest_bytes += 1;
  writePrivateJson(secondReviewInputPath, invalidBytes);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /first_review_manifest_bytes mismatch/u,
  );

  const duplicateEvent = structuredClone(validSecond);
  duplicateEvent.review_event_record = 'test-second-party-first-review-event-001';
  writePrivateJson(secondReviewInputPath, duplicateEvent);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /second-party review event must differ/u,
  );

  const earlyReview = structuredClone(validSecond);
  earlyReview.reviewed_at = '2026-09-03T12:00:00Z';
  writePrivateJson(secondReviewInputPath, earlyReview);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /cannot precede the first review/u,
  );

  const unknownFinding = structuredClone(validSecond);
  unknownFinding.finding_assessments[0].finding_id = 'unknown-first-review-finding';
  writePrivateJson(secondReviewInputPath, unknownFinding);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /every first-review finding must be assessed exactly once/u,
  );

  const wrongArtifactDigest = structuredClone(validSecond);
  wrongArtifactDigest.finding_assessments[0].source_artifact_sha256 = '1'.repeat(64);
  writePrivateJson(secondReviewInputPath, wrongArtifactDigest);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /source artifact SHA-256 mismatch/u,
  );

  const changedConfirmedAmbiguity = structuredClone(validSecond);
  changedConfirmedAmbiguity.finding_assessments[0].remaining_ambiguities = [];
  writePrivateJson(secondReviewInputPath, changedConfirmedAmbiguity);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: secondReviewInputPath,
    }),
    /confirmed finding must preserve the first review ambiguity ledger/u,
  );

  const confirmedWithNarrowedFinding = structuredClone(validSecond);
  confirmedWithNarrowedFinding.finding_assessments[0].assessment = 'narrowed';
  assert.throws(
    () => validateResponseSecondPartyReviewInput(confirmedWithNarrowedFinding),
    /overall_assessment must be narrowed/u,
  );

  const narrowedWithoutNarrowing = structuredClone(validSecond);
  narrowedWithoutNarrowing.overall_assessment = 'narrowed';
  narrowedWithoutNarrowing.canonical_recommendation = 'candidate_reframing_review_required';
  assert.throws(
    () => validateResponseSecondPartyReviewInput(narrowedWithoutNarrowing),
    /overall_assessment must be confirmed/u,
  );

  const rejectedWithoutRejection = structuredClone(validSecond);
  rejectedWithoutRejection.overall_assessment = 'rejected';
  rejectedWithoutRejection.canonical_recommendation = 'no_canonical_mutation';
  assert.throws(
    () => validateResponseSecondPartyReviewInput(rejectedWithoutRejection),
    /overall_assessment must be confirmed/u,
  );

  const rejectedWithConfirmedFinding = structuredClone(validSecond);
  rejectedWithConfirmedFinding.overall_assessment = 'rejected';
  rejectedWithConfirmedFinding.canonical_recommendation = 'no_canonical_mutation';
  rejectedWithConfirmedFinding.finding_assessments[0].assessment = 'rejected';
  rejectedWithConfirmedFinding.finding_assessments[0].remaining_ambiguities = [];
  const confirmedCompanion = structuredClone(validSecond.finding_assessments[0]);
  confirmedCompanion.finding_id = 'first-review-finding-002';
  rejectedWithConfirmedFinding.finding_assessments.push(confirmedCompanion);
  assert.throws(
    () => validateResponseSecondPartyReviewInput(rejectedWithConfirmedFinding),
    /overall_assessment must be narrowed/u,
  );

  const narrowedWithRejectedAndConfirmed = structuredClone(rejectedWithConfirmedFinding);
  narrowedWithRejectedAndConfirmed.overall_assessment = 'narrowed';
  narrowedWithRejectedAndConfirmed.canonical_recommendation =
    'candidate_reframing_review_required';
  assert.doesNotThrow(
    () => validateResponseSecondPartyReviewInput(narrowedWithRejectedAndConfirmed),
  );

  const narrowedWithRejectedAndNarrowed = structuredClone(narrowedWithRejectedAndConfirmed);
  narrowedWithRejectedAndNarrowed.finding_assessments[1].assessment = 'narrowed';
  assert.doesNotThrow(
    () => validateResponseSecondPartyReviewInput(narrowedWithRejectedAndNarrowed),
  );

  const unresolvedWithRejectedAndUnresolved = structuredClone(narrowedWithRejectedAndConfirmed);
  unresolvedWithRejectedAndUnresolved.overall_assessment = 'unresolved';
  unresolvedWithRejectedAndUnresolved.canonical_recommendation =
    'preserve_ambiguity_no_promotion';
  unresolvedWithRejectedAndUnresolved.finding_assessments[1].assessment = 'unresolved';
  unresolvedWithRejectedAndUnresolved.finding_assessments[1].remaining_ambiguities = [
    'the companion finding remains unresolved after independent review',
  ];
  assert.doesNotThrow(
    () => validateResponseSecondPartyReviewInput(unresolvedWithRejectedAndUnresolved),
  );

  const narrowedWithUnresolvedFinding = structuredClone(unresolvedWithRejectedAndUnresolved);
  narrowedWithUnresolvedFinding.overall_assessment = 'narrowed';
  narrowedWithUnresolvedFinding.canonical_recommendation =
    'candidate_reframing_review_required';
  assert.throws(
    () => validateResponseSecondPartyReviewInput(narrowedWithUnresolvedFinding),
    /overall_assessment must be unresolved/u,
  );

  const narrowedWithAllRejected = structuredClone(narrowedWithRejectedAndConfirmed);
  narrowedWithAllRejected.finding_assessments[1].assessment = 'rejected';
  narrowedWithAllRejected.finding_assessments[1].remaining_ambiguities = [];
  assert.throws(
    () => validateResponseSecondPartyReviewInput(narrowedWithAllRejected),
    /overall_assessment must be rejected/u,
  );

  const unresolvedWithoutUnresolved = structuredClone(validSecond);
  unresolvedWithoutUnresolved.overall_assessment = 'unresolved';
  unresolvedWithoutUnresolved.canonical_recommendation = 'preserve_ambiguity_no_promotion';
  assert.throws(
    () => validateResponseSecondPartyReviewInput(unresolvedWithoutUnresolved),
    /overall_assessment must be confirmed/u,
  );

  const unresolvedWithoutAmbiguity = structuredClone(validSecond);
  unresolvedWithoutAmbiguity.overall_assessment = 'unresolved';
  unresolvedWithoutAmbiguity.canonical_recommendation = 'preserve_ambiguity_no_promotion';
  unresolvedWithoutAmbiguity.finding_assessments[0].assessment = 'unresolved';
  unresolvedWithoutAmbiguity.finding_assessments[0].remaining_ambiguities = [];
  assert.throws(
    () => validateResponseSecondPartyReviewInput(unresolvedWithoutAmbiguity),
    /must not be empty for an unresolved assessment/u,
  );

  const mixedFirstInput = firstReviewInputFor(responseA, {
    reviewed_at: '2026-09-12T12:00:00Z',
    review_event_record: 'test-second-party-mixed-first-review-event-001',
    review_notes: 'The first review records two independently assessable bounded findings.',
  });
  const mixedFirstCompanion = structuredClone(mixedFirstInput.findings[0]);
  mixedFirstCompanion.finding_id = 'mixed-first-review-finding-002';
  mixedFirstCompanion.source_address.locator =
    'Synthetic response fixture, page 1, second bounded proposition';
  mixedFirstCompanion.assertion =
    'A second bounded proposition remains independently assessable from the same artifact.';
  mixedFirstCompanion.unresolved_ambiguities = [
    'the second proposition remains bounded by transaction-mechanism ambiguity',
  ];
  mixedFirstInput.findings.push(mixedFirstCompanion);
  const firstMixed = recordFirstReview(responseA, mixedFirstInput);
  const mixedFirstManifest = JSON.parse(fs.readFileSync(
    path.join(firstMixed.adjudication_dir, RESPONSE_ADJUDICATION_MANIFEST_NAME),
    'utf8',
  ));
  const mixedSecond = secondPartyInputFor(firstMixed, {
    reviewed_at: '2026-09-13T12:00:00Z',
    review_event_record: 'test-second-party-mixed-review-event-001',
    overall_assessment: 'narrowed',
    canonical_recommendation: 'candidate_reframing_review_required',
    review_notes: 'The independent review rejects one finding and confirms the other.',
  });
  mixedSecond.finding_assessments[0].assessment = 'rejected';
  mixedSecond.finding_assessments[0].remaining_ambiguities = [];
  const mixedConfirmedFinding = mixedFirstManifest.findings[1];
  mixedSecond.finding_assessments.push({
    finding_id: mixedConfirmedFinding.finding_id,
    assessment: 'confirmed',
    source_artifact_path: mixedConfirmedFinding.source_artifact_path,
    source_artifact_sha256: mixedConfirmedFinding.source_artifact_sha256,
    source_address: {
      kind: 'page',
      page: 1,
      locator: 'Independent review of the second bounded proposition, page 1',
    },
    rationale: 'The second reviewer confirms the companion finding within its ambiguity ledger.',
    remaining_ambiguities: [...mixedConfirmedFinding.unresolved_ambiguities],
  });
  writePrivateJson(secondReviewInputPath, mixedSecond);
  const mixedSecondResult = recordResponseSecondPartyReview({
    adjudicationDir: firstMixed.adjudication_dir,
    inputPath: secondReviewInputPath,
  });
  assert.equal(mixedSecondResult.overall_assessment, 'narrowed');
  assert.equal(mixedSecondResult.canonical_recommendation,
    'candidate_reframing_review_required');
  assert.equal(mixedSecondResult.canonical_mutation_authorized, false);
  assert.equal(mixedSecondResult.canonical_effect, 'none');

  const mutationAuthorized = structuredClone(validSecond);
  mutationAuthorized.canonical_mutation_authorized = true;
  assert.throws(
    () => validateResponseSecondPartyReviewInput(mutationAuthorized),
    /must remain false/u,
  );

  writePrivateJson(secondReviewInputPath, validSecond);
  fs.copyFileSync(secondReviewInputPath, outsideSecondReviewPath);
  fs.chmodSync(outsideSecondReviewPath, 0o600);
  assert.throws(
    () => recordResponseSecondPartyReview({
      adjudicationDir: firstPartial.adjudication_dir,
      inputPath: outsideSecondReviewPath,
    }),
    /must remain under ignored data\/local/u,
  );

  const transactionFirstInput = firstReviewInputFor(responseA, {
    reviewed_at: '2026-09-06T12:00:00Z',
    review_event_record: 'test-second-party-transaction-first-review-event-001',
    outcome_state: 'transaction_specific_allottee_identified',
    canonical_recommendation: 'candidate_allottee_review_required',
    promotion_gate_assessment: 'claimed_satisfied_requires_independent_review',
    findings: [
      {
        finding_id: 'transaction-first-review-finding-001',
        proposition_class: 'transaction_specific_allottee',
        conclusion: 'supported',
        source_artifact_path: validSecond.finding_assessments[0].source_artifact_path,
        source_artifact_sha256: validSecond.finding_assessments[0].source_artifact_sha256,
        source_address: {
          kind: 'page',
          page: 1,
          locator: 'Synthetic transaction join fixture, page 1',
        },
        assertion: 'The first reviewer asserts a complete synthetic transaction-specific join.',
        unresolved_ambiguities: [],
        transaction_join: {
          issuer: 'Electric Twin Ltd',
          company_number: '15173006',
          named_legal_vehicle: 'Test Atomico Vehicle SCSp',
          share_class: 'Seed 2 Preferred',
          quantity: 604294,
          allotment_date: '2025-09-16',
          allotment_event: 'SH01 issue dated 16 September 2025',
          transaction_mechanism: 'subscription',
          source_addressable_instrument_identity: 'Synthetic fixture page 1, transaction row 1',
          ambiguity_flags: {
            nominee_or_custody: false,
            transfer_or_register_movement: false,
            aggregation: false,
            legal_vehicle_identity: false,
          },
        },
      },
    ],
    review_notes: 'The synthetic first review remains blocked from canonical mutation.',
  });
  const firstTransaction = recordFirstReview(responseA, transactionFirstInput);
  const secondTransaction = secondPartyInputFor(firstTransaction, {
    reviewed_at: '2026-09-07T12:00:00Z',
    review_event_record: 'test-second-party-transaction-review-event-001',
    review_notes: 'The independent review confirms the synthetic first review only.',
  });
  secondTransaction.finding_assessments[0].remaining_ambiguities = [];
  writePrivateJson(secondReviewInputPath, secondTransaction);
  const transactionSecondResult = recordResponseSecondPartyReview({
    adjudicationDir: firstTransaction.adjudication_dir,
    inputPath: secondReviewInputPath,
  });
  assert.equal(
    transactionSecondResult.first_review_outcome_state,
    'transaction_specific_allottee_identified',
  );
  assert.equal(transactionSecondResult.overall_assessment, 'confirmed');
  assert.equal(transactionSecondResult.second_party_review_completed, true);
  assert.equal(transactionSecondResult.canonical_mutation_authorized, false);
  const transactionSecondManifest = JSON.parse(fs.readFileSync(
    path.join(
      transactionSecondResult.second_party_review_dir,
      RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME,
    ),
    'utf8',
  ));
  assert.equal(
    transactionSecondManifest.first_review.outcome_state,
    'transaction_specific_allottee_identified',
  );
  assert.equal(transactionSecondManifest.controls.allottee_identity_canonically_promoted, false);
  assert.equal(transactionSecondManifest.controls.canonical_effect, 'none');

  const responseB = buildResponseChain(outputB);
  const firstB = recordFirstReview(responseB, firstReviewInputFor(responseB, {
    reviewed_at: '2026-09-08T12:00:00Z',
    review_event_record: 'test-second-party-first-review-event-b',
  }));
  const firstBManifestPath = path.join(
    firstB.adjudication_dir,
    RESPONSE_ADJUDICATION_MANIFEST_NAME,
  );
  const pristineFirstBManifest = JSON.parse(fs.readFileSync(firstBManifestPath, 'utf8'));
  const writeFirstBManifest = (value) => {
    fs.writeFileSync(
      firstBManifestPath,
      `${JSON.stringify(value, null, 2)}\n`,
      { mode: 0o600 },
    );
    fs.chmodSync(firstBManifestPath, 0o600);
  };
  const assertTamperedFirstReviewRejected = (mutate, expectedPattern) => {
    const tampered = structuredClone(pristineFirstBManifest);
    mutate(tampered);
    writeFirstBManifest(tampered);
    const secondB = secondPartyInputFor(firstB, {
      reviewed_at: '2026-09-09T12:00:00Z',
      review_event_record: 'test-second-party-review-event-b',
    });
    writePrivateJson(secondReviewInputPath, secondB);
    assert.throws(
      () => recordResponseSecondPartyReview({
        adjudicationDir: firstB.adjudication_dir,
        inputPath: secondReviewInputPath,
      }),
      expectedPattern,
    );
  };

  const responseC = buildResponseChain(outputC);
  const firstC = recordFirstReview(responseC, firstReviewInputFor(responseC, {
    reviewed_at: '2026-09-10T12:00:00Z',
    review_event_record: 'test-second-party-first-review-event-c',
  }));
  const firstCManifestPath = path.join(
    firstC.adjudication_dir,
    RESPONSE_ADJUDICATION_MANIFEST_NAME,
  );
  const historicalFirstCManifest = JSON.parse(fs.readFileSync(firstCManifestPath, 'utf8'));
  const liveRulesSha256 = historicalFirstCManifest.adjudication_rules.sha256;
  historicalFirstCManifest.adjudication_rules.bytes =
    PRE_SECOND_PARTY_RULES_RECEIPT.bytes;
  historicalFirstCManifest.adjudication_rules.sha256 =
    PRE_SECOND_PARTY_RULES_RECEIPT.sha256;
  fs.writeFileSync(
    firstCManifestPath,
    `${JSON.stringify(historicalFirstCManifest, null, 2)}
`,
    { mode: 0o600 },
  );
  fs.chmodSync(firstCManifestPath, 0o600);
  const historicalSecondC = secondPartyInputFor(firstC, {
    reviewed_at: '2026-09-11T12:00:00Z',
    review_event_record: 'test-second-party-historical-rules-review-event-c',
  });
  writePrivateJson(secondReviewInputPath, historicalSecondC);
  const historicalSecondResult = recordResponseSecondPartyReview({
    adjudicationDir: firstC.adjudication_dir,
    inputPath: secondReviewInputPath,
  });
  assert.equal(
    historicalSecondResult.state,
    'response_second_party_review_recorded_canonical_promotion_blocked',
  );
  const historicalSecondManifest = JSON.parse(fs.readFileSync(
    path.join(
      historicalSecondResult.second_party_review_dir,
      RESPONSE_SECOND_PARTY_REVIEW_MANIFEST_NAME,
    ),
    'utf8',
  ));
  assert.equal(historicalSecondManifest.controls.adjudication_rules_verified, true);
  assert.equal(historicalSecondManifest.adjudication_rules.sha256, liveRulesSha256);
  assert.notEqual(
    historicalSecondManifest.adjudication_rules.sha256,
    PRE_SECOND_PARTY_RULES_RECEIPT.sha256,
  );

  assertTamperedFirstReviewRejected(
    (manifest) => {
      manifest.adjudication_rules.sha256 = '0'.repeat(64);
    },
    /first review adjudication-rules receipt is not recognized/u,
  );

  assertTamperedFirstReviewRejected(
    (manifest) => {
      manifest.review.reviewed_at = '2026-09-02T12:00:00Z';
    },
    /stored first-review reviewed_at cannot precede the recorded response/u,
  );

  assertTamperedFirstReviewRejected(
    (manifest) => {
      manifest.outcome.state = 'transaction_specific_allottee_identified';
      manifest.outcome.canonical_recommendation = 'candidate_allottee_review_required';
      manifest.outcome.promotion_gate_assessment =
        'claimed_satisfied_requires_independent_review';
    },
    /requires a transaction_specific_allottee finding/u,
  );

  assertTamperedFirstReviewRejected(
    (manifest) => {
      manifest.findings[0].proposition_class = 'unsupported_proposition_class';
    },
    /unsupported findings\[0\]\.proposition_class/u,
  );

  assertTamperedFirstReviewRejected(
    (manifest) => {
      manifest.outcome.unreviewed_override = true;
    },
    /first review outcome field set mismatch/u,
  );

  assertTamperedFirstReviewRejected(
    (manifest) => {
      manifest.controls.canonical_mutation_authorized = true;
    },
    /canonical_mutation_authorized/u,
  );
  writeFirstBManifest(pristineFirstBManifest);

} finally {
  for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
}

console.log('electric-twin-register-request-response-second-party-review.test: OK');
