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
  verifyResponseCustodyChain,
} from '../tools/lib/electric-twin-register-request-response-core.mjs';
import {
  RESPONSE_ADJUDICATION_MANIFEST_NAME,
  recordResponseAdjudication,
  validateResponseAdjudicationInput,
} from '../tools/lib/electric-twin-register-request-response-adjudication-core.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
process.chdir(repoRoot);

const privateDir = 'data/local';
const outputRoot = 'build/source-acquisition/electric-twin-register-of-members';
const requesterPath = `${privateDir}/electric-twin-adjudication-requester-${process.pid}.json`;
const dispatchInputPath = `${privateDir}/electric-twin-adjudication-dispatch-${process.pid}.json`;
const deliveryInputPath = `${privateDir}/electric-twin-adjudication-delivery-${process.pid}.json`;
const responseInputPath = `${privateDir}/electric-twin-adjudication-response-${process.pid}.json`;
const reviewInputPath = `${privateDir}/electric-twin-adjudication-review-${process.pid}.json`;
const outsideReviewPath = `build/electric-twin-adjudication-review-outside-${process.pid}.json`;
const dispatchProofPath = `${privateDir}/electric-twin-adjudication-dispatch-proof-${process.pid}.pdf`;
const deliveryProofPath = `${privateDir}/electric-twin-adjudication-delivery-proof-${process.pid}.pdf`;
const responseInstrumentPath = `${privateDir}/electric-twin-adjudication-instrument-${process.pid}.pdf`;
const outputA = `${outputRoot}/response-adjudication-test-${process.pid}-a`;
const outputB = `${outputRoot}/response-adjudication-test-${process.pid}-b`;
const cleanupPaths = [
  requesterPath,
  dispatchInputPath,
  deliveryInputPath,
  responseInputPath,
  reviewInputPath,
  outsideReviewPath,
  dispatchProofPath,
  deliveryProofPath,
  responseInstrumentPath,
  outputA,
  outputB,
];

const requesterInput = {
  schema_version: 'electric-twin-register-request-private-input@1',
  acquisition_id: 'ET-ROM-2025-09-01',
  requester: {
    full_name: 'Test Adjudication Researcher',
    postal_address_lines: ['1 Test Street', 'London', 'SW1A 1AA'],
    email: 'adjudication-researcher@example.test',
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
    finalization_record: 'test-adjudication-finalization-authorization-001',
    finalized_at: '2026-09-01T08:00:00Z',
    statutory_dispatch_authorized: true,
    statutory_dispatch_record: 'test-adjudication-statutory-dispatch-authorization-001',
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
  dispatch_event_record: 'test-adjudication-postal-dispatch-event-001',
  authorization_record: 'test-adjudication-statutory-dispatch-authorization-001',
  service_provider: 'Test Postal Service',
  service_level: 'Tracked custody service',
  tracking_reference: 'TEST-ADJUDICATION-TRACKING-REFERENCE-001',
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
  delivery_event_record: 'test-adjudication-delivery-event-001',
  tracking_reference: 'TEST-ADJUDICATION-TRACKING-REFERENCE-001',
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
    calendar_record: 'test-adjudication-calendar-001',
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
  response_event_record: 'test-adjudication-response-event-001',
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

function writePrivateJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function buildResponseChain(outputDir) {
  finalizeRequestFiles({ inputPath: requesterPath, outputDir });
  renderRequestPdfs({ sourceDir: outputDir });
  const dispatch = recordDispatchCustody({ sourceDir: outputDir, inputPath: dispatchInputPath });
  const delivery = recordDeliveryCustody({ dispatchDir: dispatch.dispatch_dir, inputPath: deliveryInputPath });
  return recordResponseCustody({ deliveryDir: delivery.delivery_dir, inputPath: responseInputPath });
}

function reviewInputFor(responseResult, overrides = {}) {
  const responseManifest = JSON.parse(fs.readFileSync(
    path.join(responseResult.response_dir, RESPONSE_MANIFEST_NAME), 'utf8'));
  const artifact = responseManifest.evidence_files[0];
  return {
    schema_version: 'electric-twin-register-request-response-adjudication-input@1',
    acquisition_id: 'ET-ROM-2025-09-01',
    review_status: 'review_completed',
    reviewed_at: '2026-09-04T12:00:00Z',
    review_event_record: 'test-adjudication-review-event-001',
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
        finding_id: 'response-finding-001',
        proposition_class: 'response_scope_or_completeness',
        conclusion: 'ambiguous',
        source_artifact_path: artifact.path,
        source_artifact_sha256: artifact.sha256,
        source_address: {
          kind: 'page',
          page: 1,
          locator: 'Test transaction instrument fixture, page 1',
        },
        assertion: 'The fixture is source-addressed but its transaction semantics remain unproved.',
        unresolved_ambiguities: ['transaction mechanism and legal vehicle identity remain unresolved'],
        transaction_join: null,
      },
    ],
    review_notes: 'The review records a bounded ambiguity and does not authorize a canonical mutation.',
    second_party_review_required: true,
    second_party_review_completed: false,
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
fs.writeFileSync(dispatchProofPath, Buffer.from('%PDF-1.4\ndispatch proof fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(dispatchProofPath, 0o600);
fs.writeFileSync(deliveryProofPath, Buffer.from('%PDF-1.4\ndelivery proof fixture\n%%EOF\n', 'ascii'), { mode: 0o600 });
fs.chmodSync(deliveryProofPath, 0o600);
fs.writeFileSync(responseInstrumentPath, Buffer.from([
  '%PDF-1.4',
  'Test source-addressed transaction instrument fixture.',
  'Electric Twin Ltd; Seed 2 Preferred; quantity 604294; date 2025-09-16.',
  'The fixture is synthetic and does not itself establish a real allottee.',
  '%%EOF',
  '',
].join('\n'), 'ascii'), { mode: 0o600 });
fs.chmodSync(responseInstrumentPath, 0o600);

try {
  const responseA = buildResponseChain(outputA);
  const verified = verifyResponseCustodyChain({ responseDir: responseA.response_dir });
  assert.equal(verified.responseManifest.state, 'response_evidence_recorded_unadjudicated');
  assert.equal(verified.responseManifest.evidence_files.length, 1);

  const partialReview = reviewInputFor(responseA);
  for (const [reviewedAt, expectedError] of [
    ['2026-02-30T12:00:00Z', /invalid day/u],
    ['2026-02-29T12:00:00Z', /invalid day/u],
    ['2026-03-01T24:00:00Z', /invalid hour/u],
    ['2026-03-01T12:60:00Z', /invalid minute/u],
    ['2026-03-01T12:00:60Z', /invalid second/u],
  ]) {
    const invalidTimestampReview = structuredClone(partialReview);
    invalidTimestampReview.reviewed_at = reviewedAt;
    assert.throws(
      () => validateResponseAdjudicationInput(invalidTimestampReview),
      expectedError,
    );
  }
  for (const reviewedAt of [
    '2028-02-29T23:59:59Z',
    '2028-02-29T23:59:59.123Z',
  ]) {
    const validTimestampReview = structuredClone(partialReview);
    validTimestampReview.reviewed_at = reviewedAt;
    assert.doesNotThrow(
      () => validateResponseAdjudicationInput(validTimestampReview),
    );
  }
  writePrivateJson(reviewInputPath, partialReview);
  const partialResult = recordResponseAdjudication({
    responseDir: responseA.response_dir,
    inputPath: reviewInputPath,
  });
  assert.equal(partialResult.state, 'response_adjudication_recorded_canonical_promotion_blocked');
  assert.equal(partialResult.outcome_state, 'partial_or_ambiguous_response');
  assert.equal(partialResult.canonical_recommendation, 'no_canonical_mutation');
  assert.equal(partialResult.canonical_mutation_authorized, false);
  assert.equal(partialResult.canonical_effect, 'none');

  const partialManifestPath = path.join(
    partialResult.adjudication_dir,
    RESPONSE_ADJUDICATION_MANIFEST_NAME,
  );
  const partialManifest = JSON.parse(fs.readFileSync(partialManifestPath, 'utf8'));
  assert.equal(partialManifest.response_custody.state, 'response_evidence_recorded_unadjudicated');
  assert.equal(partialManifest.outcome.second_party_review_required, true);
  assert.equal(partialManifest.outcome.second_party_review_completed, false);
  assert.equal(partialManifest.outcome.canonical_mutation_authorized, false);
  assert.equal(partialManifest.controls.source_address_semantics_verified_by_tool, false);
  assert.equal(partialManifest.controls.finding_semantics_verified_by_tool, false);
  assert.equal(partialManifest.controls.transaction_join_semantics_verified_by_tool, false);
  assert.equal(partialManifest.controls.legal_timeliness_adjudicated, false);
  assert.equal(partialManifest.controls.statutory_compliance_adjudicated, false);
  assert.equal(partialManifest.controls.allottee_identity_canonically_promoted, false);
  assert.equal(partialManifest.controls.beneficial_ownership_canonically_promoted, false);
  assert.equal(partialManifest.controls.actor_hop_canonically_promoted, false);
  assert.equal(partialManifest.controls.canonical_effect, 'none');
  const manifestText = JSON.stringify(partialManifest);
  assert.equal(manifestText.includes('Test Corporate Services Provider'), false);
  assert.equal(manifestText.includes('Test Adjudication Researcher'), false);
  assert.equal(manifestText.includes('adjudication-researcher@example.test'), false);
  assert.equal(fs.statSync(partialResult.adjudication_dir).mode & 0o077, 0);
  assert.equal(fs.statSync(partialManifestPath).mode & 0o077, 0);

  assert.throws(
    () => recordResponseAdjudication({ responseDir: responseA.response_dir, inputPath: reviewInputPath }),
    /refusing to overwrite existing response-adjudication directory/u,
  );

  const transactionReview = reviewInputFor(responseA, {
    reviewed_at: '2026-09-05T12:00:00Z',
    review_event_record: 'test-adjudication-review-event-002',
    outcome_state: 'transaction_specific_allottee_identified',
    canonical_recommendation: 'candidate_allottee_review_required',
    promotion_gate_assessment: 'claimed_satisfied_requires_independent_review',
    findings: [
      {
        finding_id: 'transaction-finding-001',
        proposition_class: 'transaction_specific_allottee',
        conclusion: 'supported',
        source_artifact_path: verified.responseManifest.evidence_files[0].path,
        source_artifact_sha256: verified.responseManifest.evidence_files[0].sha256,
        source_address: {
          kind: 'page',
          page: 1,
          locator: 'Synthetic transaction join fixture, page 1',
        },
        assertion: 'The reviewer asserts that one source expressly joins the issuer, vehicle, class, quantity and issue.',
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
    review_notes: 'The asserted join remains blocked from canonical mutation pending independent review.',
  });
  writePrivateJson(reviewInputPath, transactionReview);
  const transactionResult = recordResponseAdjudication({
    responseDir: responseA.response_dir,
    inputPath: reviewInputPath,
  });
  assert.equal(transactionResult.outcome_state, 'transaction_specific_allottee_identified');
  assert.equal(transactionResult.canonical_recommendation, 'candidate_allottee_review_required');
  const transactionManifest = JSON.parse(fs.readFileSync(
    path.join(transactionResult.adjudication_dir, RESPONSE_ADJUDICATION_MANIFEST_NAME),
    'utf8',
  ));
  assert.equal(transactionManifest.findings[0].transaction_join.company_number, '15173006');
  assert.equal(transactionManifest.findings[0].transaction_join.quantity, 604294);
  assert.equal(transactionManifest.controls.allottee_identity_canonically_promoted, false);
  const eventOnlyTransactionReview = structuredClone(transactionReview);
  delete eventOnlyTransactionReview.findings[0].transaction_join.allotment_date;
  const eventOnlyNormalized = validateResponseAdjudicationInput(eventOnlyTransactionReview);
  assert.equal(eventOnlyNormalized.findings[0].transaction_join.allotment_date, null);
  assert.equal(
    eventOnlyNormalized.findings[0].transaction_join.allotment_event,
    'SH01 issue dated 16 September 2025',
  );

  const dateOnlyTransactionReview = structuredClone(transactionReview);
  delete dateOnlyTransactionReview.findings[0].transaction_join.allotment_event;
  const dateOnlyNormalized = validateResponseAdjudicationInput(dateOnlyTransactionReview);
  assert.equal(dateOnlyNormalized.findings[0].transaction_join.allotment_date, '2025-09-16');
  assert.equal(dateOnlyNormalized.findings[0].transaction_join.allotment_event, null);

  const transactionWithoutDateOrEvent = structuredClone(transactionReview);
  delete transactionWithoutDateOrEvent.findings[0].transaction_join.allotment_date;
  delete transactionWithoutDateOrEvent.findings[0].transaction_join.allotment_event;
  assert.throws(
    () => validateResponseAdjudicationInput(transactionWithoutDateOrEvent),
    /requires allotment_date or allotment_event/u,
  );

  assert.throws(
    () => validateResponseAdjudicationInput({
      ...transactionReview,
      canonical_recommendation: 'no_canonical_mutation',
    }),
    /does not match outcome_state/u,
  );

  assert.throws(
    () => validateResponseAdjudicationInput({
      ...transactionReview,
      canonical_mutation_authorized: true,
    }),
    /must remain false/u,
  );

  const transactionWithAmbiguity = structuredClone(transactionReview);
  transactionWithAmbiguity.findings[0].transaction_join.ambiguity_flags.aggregation = true;
  assert.throws(
    () => validateResponseAdjudicationInput(transactionWithAmbiguity),
    /retains aggregation ambiguity/u,
  );
  const peerFinding = ({
    findingId,
    propositionClass,
    conclusion,
    assertion,
    ambiguities = [],
    proceduralDispositionKind = null,
  }) => ({
    finding_id: findingId,
    proposition_class: propositionClass,
    conclusion,
    source_artifact_path: transactionReview.findings[0].source_artifact_path,
    source_artifact_sha256: transactionReview.findings[0].source_artifact_sha256,
    source_address: {
      kind: 'page',
      page: 1,
      locator: `Synthetic ${findingId} fixture, page 1`,
    },
    assertion,
    unresolved_ambiguities: ambiguities,
    procedural_disposition_kind: proceduralDispositionKind,
    transaction_join: null,
  });

  const identifiedOutcomeCases = [
    {
      outcomeState: 'registered_holder_history_strengthened_only',
      canonicalRecommendation: 'candidate_holder_history_review_required',
      propositionClass: 'registered_holder_history',
    },
    {
      outcomeState: 'transfer_or_register_movement_identified',
      canonicalRecommendation: 'candidate_register_movement_review_required',
      propositionClass: 'register_movement',
    },
    {
      outcomeState: 'company_application_to_court',
      canonicalRecommendation: 'procedural_disposition_only',
      propositionClass: 'procedural_disposition',
      proceduralDispositionKind: 'company_application_to_court',
    },
    {
      outcomeState: 'refusal_confidentiality_or_improper_purpose_asserted',
      canonicalRecommendation: 'procedural_disposition_only',
      propositionClass: 'procedural_disposition',
      proceduralDispositionKind: 'refusal',
    },
  ];
  for (const identifiedOutcomeCase of identifiedOutcomeCases) {
    const ambiguousIdentifiedOutcome = structuredClone(partialReview);
    ambiguousIdentifiedOutcome.outcome_state = identifiedOutcomeCase.outcomeState;
    ambiguousIdentifiedOutcome.canonical_recommendation = identifiedOutcomeCase.canonicalRecommendation;
    ambiguousIdentifiedOutcome.findings = [peerFinding({
      findingId: `ambiguous-${identifiedOutcomeCase.outcomeState}`,
      propositionClass: identifiedOutcomeCase.propositionClass,
      conclusion: 'ambiguous',
      assertion: 'The required proposition remains ambiguous and cannot support an identified outcome.',
      proceduralDispositionKind: identifiedOutcomeCase.proceduralDispositionKind,
    })];
    assert.throws(
      () => validateResponseAdjudicationInput(ambiguousIdentifiedOutcome),
      /requires a .* finding concluded supported/u,
    );
  }

  const proceduralReview = ({ outcomeState, dispositionKind }) => {
    const review = structuredClone(partialReview);
    review.outcome_state = outcomeState;
    review.canonical_recommendation = 'procedural_disposition_only';
    review.findings = [peerFinding({
      findingId: `procedural-${outcomeState}-${dispositionKind ?? 'missing'}` ,
      propositionClass: 'procedural_disposition',
      conclusion: 'supported',
      assertion: 'The source-addressed response records the classified procedural disposition.',
      proceduralDispositionKind: dispositionKind,
    })];
    return review;
  };

  assert.doesNotThrow(() => validateResponseAdjudicationInput(proceduralReview({
    outcomeState: 'company_application_to_court',
    dispositionKind: 'company_application_to_court',
  })));
  for (const dispositionKind of ['refusal', 'confidentiality_asserted', 'improper_purpose_asserted']) {
    assert.doesNotThrow(() => validateResponseAdjudicationInput(proceduralReview({
      outcomeState: 'refusal_confidentiality_or_improper_purpose_asserted',
      dispositionKind,
    })));
  }
  assert.throws(
    () => validateResponseAdjudicationInput(proceduralReview({
      outcomeState: 'company_application_to_court',
      dispositionKind: 'confidentiality_asserted',
    })),
    /requires a procedural_disposition finding concluded supported with procedural_disposition_kind company_application_to_court/u,
  );
  assert.throws(
    () => validateResponseAdjudicationInput(proceduralReview({
      outcomeState: 'refusal_confidentiality_or_improper_purpose_asserted',
      dispositionKind: 'company_application_to_court',
    })),
    /requires a procedural_disposition finding concluded supported with procedural_disposition_kind refusal or confidentiality_asserted or improper_purpose_asserted/u,
  );
  assert.throws(
    () => validateResponseAdjudicationInput(proceduralReview({
      outcomeState: 'company_application_to_court',
      dispositionKind: null,
    })),
    /procedural_disposition_kind is required/u,
  );
  const nonProceduralKind = structuredClone(partialReview);
  nonProceduralKind.findings[0].procedural_disposition_kind = 'company_application_to_court';
  assert.throws(
    () => validateResponseAdjudicationInput(nonProceduralKind),
    /procedural_disposition_kind is only allowed for procedural_disposition findings/u,
  );

  const nomineeAmbiguityOutcome = structuredClone(partialReview);
  nomineeAmbiguityOutcome.outcome_state = 'nominee_or_beneficial_owner_ambiguity';
  nomineeAmbiguityOutcome.canonical_recommendation = 'preserve_ambiguity_no_promotion';
  nomineeAmbiguityOutcome.findings = [peerFinding({
    findingId: 'nominee-ambiguity-outcome-001',
    propositionClass: 'nominee_or_beneficial_owner',
    conclusion: 'ambiguous',
    assertion: 'The reviewed source leaves the nominee or beneficial-owner relationship ambiguous.',
    ambiguities: ['nominee or beneficial-owner relationship remains unresolved'],
  })];
  assert.doesNotThrow(
    () => validateResponseAdjudicationInput(nomineeAmbiguityOutcome),
  );

  const blockedPeerFindings = [
    peerFinding({
      findingId: 'transaction-finding-002',
      propositionClass: 'transaction_specific_allottee',
      conclusion: 'contradicted',
      assertion: 'A second reviewed row contradicts the asserted transaction-specific attribution.',
    }),
    peerFinding({
      findingId: 'nominee-finding-001',
      propositionClass: 'nominee_or_beneficial_owner',
      conclusion: 'ambiguous',
      assertion: 'The reviewed source leaves a nominee or custody relationship unresolved.',
      ambiguities: ['nominee or custody relationship remains unresolved'],
    }),
    peerFinding({
      findingId: 'register-movement-finding-001',
      propositionClass: 'register_movement',
      conclusion: 'supported',
      assertion: 'The reviewed source supports an alternative register-movement mechanism.',
    }),
    peerFinding({
      findingId: 'response-scope-finding-002',
      propositionClass: 'response_scope_or_completeness',
      conclusion: 'ambiguous',
      assertion: 'The response-scope finding retains a legal-vehicle ambiguity relevant to attribution.',
      ambiguities: ['legal vehicle identity remains unresolved'],
    }),
    peerFinding({
      findingId: 'holder-history-finding-002',
      propositionClass: 'registered_holder_history',
      conclusion: 'supported',
      assertion: 'The holder-history finding retains an aggregation ambiguity relevant to attribution.',
      ambiguities: ['aggregation remains unresolved'],
    }),
  ];
  for (const blockedPeerFinding of blockedPeerFindings) {
    const reviewWithBlockedPeer = structuredClone(transactionReview);
    reviewWithBlockedPeer.findings.push(blockedPeerFinding);
    assert.throws(
      () => validateResponseAdjudicationInput(reviewWithBlockedPeer),
      /cannot coexist with unresolved or conflicting transaction-attribution findings/u,
    );
  }

  const reviewWithRejectedMovementHypothesis = structuredClone(transactionReview);
  reviewWithRejectedMovementHypothesis.findings.push(peerFinding({
    findingId: 'register-movement-finding-002',
    propositionClass: 'register_movement',
    conclusion: 'not_supported',
    assertion: 'The reviewed source does not support the alternative register-movement hypothesis.',
  }));
  assert.doesNotThrow(
    () => validateResponseAdjudicationInput(reviewWithRejectedMovementHypothesis),
  );

  const wrongArtifactDigest = reviewInputFor(responseA, {
    reviewed_at: '2026-09-06T12:00:00Z',
    review_event_record: 'test-adjudication-review-event-003',
  });
  wrongArtifactDigest.findings[0].source_artifact_sha256 = '0'.repeat(64);
  writePrivateJson(reviewInputPath, wrongArtifactDigest);
  assert.throws(
    () => recordResponseAdjudication({ responseDir: responseA.response_dir, inputPath: reviewInputPath }),
    /response-artifact SHA-256 mismatch/u,
  );

  const unreviewedArtifact = reviewInputFor(responseA, {
    reviewed_at: '2026-09-07T12:00:00Z',
    review_event_record: 'test-adjudication-review-event-004',
    findings: [
      {
        ...partialReview.findings[0],
        source_artifact_path: 'unknown.pdf',
        source_artifact_sha256: '1'.repeat(64),
      },
    ],
  });
  writePrivateJson(reviewInputPath, unreviewedArtifact);
  assert.throws(
    () => recordResponseAdjudication({ responseDir: responseA.response_dir, inputPath: reviewInputPath }),
    /unknown response artifact/u,
  );

  writePrivateJson(reviewInputPath, partialReview);
  fs.copyFileSync(reviewInputPath, outsideReviewPath);
  fs.chmodSync(outsideReviewPath, 0o600);
  assert.throws(
    () => recordResponseAdjudication({ responseDir: responseA.response_dir, inputPath: outsideReviewPath }),
    /must remain under ignored data\/local/u,
  );

  const responseB = buildResponseChain(outputB);
  const responseManifestB = JSON.parse(fs.readFileSync(
    path.join(responseB.response_dir, RESPONSE_MANIFEST_NAME), 'utf8'));
  const responseEvidenceB = path.join(responseB.response_dir, responseManifestB.evidence_files[0].path);
  const tampered = fs.readFileSync(responseEvidenceB);
  tampered[0] = tampered[0] === 0x25 ? 0x24 : 0x25;
  fs.writeFileSync(responseEvidenceB, tampered);
  fs.chmodSync(responseEvidenceB, 0o600);
  writePrivateJson(reviewInputPath, reviewInputFor(responseB, {
    reviewed_at: '2026-09-08T12:00:00Z',
    review_event_record: 'test-adjudication-review-event-005',
  }));
  assert.throws(
    () => recordResponseAdjudication({ responseDir: responseB.response_dir, inputPath: reviewInputPath }),
    /response evidence .* SHA-256 mismatch/u,
  );
} finally {
  for (const target of cleanupPaths) fs.rmSync(target, { recursive: true, force: true });
}

console.log('electric-twin-register-request-response-adjudication.test: OK');
