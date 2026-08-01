#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReleaseManifest,
  deriveGateRegistry,
  deriveArchiveRegistry,
  deriveExternalReviewRegistry,
  deriveReport,
  renderHtml
} from './build-counter-selector-wave-21.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const eq = (a, b, message) => assert.deepEqual(a, b, message);
const dimensions = [
  'support_adjusted_surplus',
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'model_elasticity',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

export function validateContract(contract) {
  assert.equal(contract.schema_version, 'counter-selector-gate-exhaustion-audit@1');
  assert.equal(contract.program_id, 'counter-selector-v1');
  assert.equal(contract.wave_id, 'CS-W21-GE-01');
  assert.equal(contract.as_of, '2026-08-01');
  assert.equal(contract.parent_main_sha, 'd92c018e85a7099a3c6965da66646295bb2a3b5e');
  assert.equal(contract.parent_wave_id, 'CS-W20-EF-01');
  assert.equal(contract.parent_release_sha256, 'f43284412d7f4b37c0b44c8bc25cf56b8e4175924f3f9c722c55d5b9bc9da79d');
  assert.equal(contract.publication_status, 'staged_public_review_request_source_custody');

  const expectedCounts = {
    candidate_lanes_audited: 1,
    gate_families_attacked: 6,
    official_or_contemporaneous_source_records: 18,
    contemporaneous_corroboration_records: 4,
    person_causality_upgrades: 0,
    model_elasticity_indicators_tested: 3,
    new_model_elasticity_supports: 0,
    support_comparator_lanes_tested: 3,
    new_support_adjusted_surplus_supports: 0,
    direct_handoff_routes_tested: 3,
    direct_handoff_receipts: 0,
    archive_request_packets_prepared: 3,
    archive_requests_sent: 0,
    external_review_requests_opened: 1,
    external_review_responses_received: 0,
    external_selector_reviews_executed: 0,
    new_dimension_supports: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    source_subject_contacts_authorized: 0,
    custodian_contacts_authorized: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 56
  };
  eq(contract.counts, expectedCounts, 'exact counts');

  const candidate = contract.candidate_gate_state;
  assert.equal(candidate.candidate_id, 'CS-C0019');
  assert.equal(candidate.packet_id, 'CS-BLIND-0019');
  assert.equal(candidate.source_identity, 'Elliot Richardson');
  eq(candidate.previous_supported_dimensions, [
    'cross_domain_transfer',
    'exception_handling',
    'custody',
    'governed_capacity',
    'non_zero_sum_orientation',
    'epistemic_restraint'
  ], 'previous vector');
  eq(candidate.previous_unresolved_dimensions, [
    'support_adjusted_surplus',
    'model_elasticity'
  ], 'previous unresolved vector');
  eq(candidate.supported_dimensions_after_exhaustion, candidate.previous_supported_dimensions, 'no dimension inflation');
  eq(candidate.unresolved_dimensions_after_exhaustion, candidate.previous_unresolved_dimensions, 'unresolved gates preserved');
  assert.equal(new Set([...candidate.supported_dimensions_after_exhaustion, ...candidate.unresolved_dimensions_after_exhaustion]).size, 8);
  assert(dimensions.every((dimension) =>
    candidate.supported_dimensions_after_exhaustion.includes(dimension) ||
    candidate.unresolved_dimensions_after_exhaustion.includes(dimension)
  ));
  assert.equal(candidate.complete_operator_finding, false);
  assert.equal(candidate.field_test_eligible, false);
  assert.equal(candidate.contact_authorized, false);
  assert.equal(candidate.public_identity_profile_authorized, false);
  assert.equal(candidate.graph_effect, 'none');

  const expectedGates = [
    'contemporaneous_corroboration',
    'model_elasticity',
    'support_adjusted_surplus',
    'direct_handoff',
    'archival_acquisition',
    'genuinely_independent_review'
  ];
  assert.equal(candidate.gate_results.length, 6);
  eq(candidate.gate_results.map((row) => row.gate), expectedGates, 'six ordered gate families');
  assert.equal(new Set(candidate.gate_results.map((row) => row.gate)).size, 6);
  assert(candidate.gate_results.every((row) => row.cleared === false));
  assert.match(candidate.gate_results[0].state, /no_person_causality_upgrade/);
  assert.equal(candidate.gate_results[1].state, 'insufficient_evidence');
  assert.match(candidate.gate_results[2].state, /heavy_support/);
  assert.equal(candidate.gate_results[3].state, 'not_established');
  assert.match(candidate.gate_results[4].state, /zero_sent/);
  assert.match(candidate.gate_results[5].state, /zero_responses_zero_reviews/);

  assert.equal(contract.contemporaneous_corroboration.length, 4);
  assert.equal(new Set(contract.contemporaneous_corroboration.map((row) => row.corroboration_id)).size, 4);
  assert(contract.contemporaneous_corroboration.every((row) => row.person_causality_upgraded === false));
  assert(contract.contemporaneous_corroboration.every((row) => row.source_ids.length >= 1 && row.ceiling.length >= 30));

  assert.equal(contract.model_elasticity_tests.length, 3);
  assert.equal(new Set(contract.model_elasticity_tests.map((row) => row.test_id)).size, 3);
  assert(contract.model_elasticity_tests.every((row) => row.supported === false));
  assert(contract.model_elasticity_tests.every((row) => row.missing_sequence.length >= 4));
  eq(contract.model_elasticity_tests.map((row) => row.classification), [
    'retrospective_assessment_update',
    'retrospective_self_critique_without_repair',
    'direct_admission_of_position_change_without_linked_operational_receipt'
  ], 'model elasticity indicator classes');

  const surplus = contract.support_adjusted_surplus_adjudication;
  assert.equal(surplus.supported, false);
  assert.equal(surplus.substantial_support_observed, true);
  assert(surplus.candidate_support_ledger.length >= 8);
  assert.equal(surplus.matched_comparator_lanes.length, 3);
  assert.equal(new Set(surplus.matched_comparator_lanes.map((row) => row.comparator_id)).size, 3);
  assert(surplus.matched_comparator_lanes.every((row) => /not normalized|different|smaller|mandate|metric/i.test(row.reason_not_normalized)));
  assert.match(surplus.reason, /No resource-normalized comparator/i);

  const handoff = contract.direct_handoff_adjudication;
  assert.equal(handoff.established, false);
  assert.equal(handoff.routes_tested.length, 3);
  assert.equal(handoff.direct_handoff_receipts, 0);
  assert.equal(new Set(handoff.routes_tested.map((row) => row.route_id)).size, 3);
  assert(handoff.routes_tested.every((row) => /not_acquired|not_established|delivery_asserted|continuity_observed/i.test(row.state)));

  assert.equal(contract.archive_request_packets.length, 3);
  eq(contract.archive_request_packets.map((row) => row.request_id), [
    'CS-W21-AQ-LOC',
    'CS-W21-AQ-UNARMS',
    'CS-W21-AQ-CARTER'
  ], 'archive request ids');
  assert.equal(new Set(contract.archive_request_packets.map((row) => row.document_path)).size, 3);
  for (const request of contract.archive_request_packets) {
    assert.equal(request.state, 'prepared_not_sent');
    assert.equal(request.route_executed, false);
    assert.equal(request.contact_authorized, false);
    assert(request.target_collections.length >= 1);
    assert(fs.existsSync(path.join(root, request.document_path)), `request document exists: ${request.document_path}`);
    const requestText = readText(request.document_path);
    assert.match(requestText, /prepared, not sent/i);
    assert.match(requestText, /does not|no claim|does not presume/i);
  }

  const review = contract.external_review;
  assert.equal(review.request_id, 'CS-W21-ER-0019');
  assert.equal(review.review_token, 'CS-EXT-BLIND-W20-0019');
  assert.equal(review.issue_number, 597);
  assert.equal(review.issue_url, 'https://github.com/BigBirdReturns/clifford-number/issues/597');
  assert.equal(review.request_opened, true);
  assert.equal(review.source_identity_label_omitted, true);
  assert.equal(review.artifact_may_remain_inferable, true);
  assert.equal(review.responses_received, 0);
  assert.equal(review.external_review_executed, false);
  assert.equal(review.subject_contacted, false);
  assert.equal(review.field_test_authorized, false);
  assert.equal(review.graph_effect, 'none');

  assert.equal(contract.sources.length, 18);
  const sourceIds = contract.sources.map((row) => row.source_id);
  assert.equal(new Set(sourceIds).size, 18);
  assert(sourceIds.every((id, index) => id === `CS-W21-S${String(index + 1).padStart(3, '0')}`));
  const sourceSet = new Set(sourceIds);
  for (const source of contract.sources) {
    assert.match(source.url, /^https:\/\//);
    assert(source.supports.length >= 1);
    assert(source.limits.length >= 1);
    assert(source.record_state.length >= 10);
  }
  for (const row of candidate.gate_results) {
    for (const sourceId of row.source_ids) assert(sourceSet.has(sourceId), `gate source exists: ${sourceId}`);
  }
  for (const row of contract.contemporaneous_corroboration) {
    for (const sourceId of row.source_ids) assert(sourceSet.has(sourceId), `corroboration source exists: ${sourceId}`);
  }
  for (const row of contract.model_elasticity_tests) {
    for (const sourceId of row.source_ids) assert(sourceSet.has(sourceId), `model source exists: ${sourceId}`);
  }
  for (const row of handoff.routes_tested) {
    for (const sourceId of row.source_ids) assert(sourceSet.has(sourceId), `handoff source exists: ${sourceId}`);
  }
  for (const row of contract.archive_request_packets) {
    for (const sourceId of row.source_ids) assert(sourceSet.has(sourceId), `archive source exists: ${sourceId}`);
  }

  const falseBoundaries = Object.entries(contract.boundaries).filter(([key]) => key !== 'graph_effect');
  assert(falseBoundaries.length >= 25);
  assert(falseBoundaries.every(([, value]) => value === false));
  assert.equal(contract.boundaries.graph_effect, 'none');
  assert.equal(contract.boundaries.contemporaneous_issue_corroboration_is_person_causality, false);
  assert.equal(contract.boundaries.admitted_change_of_mind_is_complete_model_elasticity, false);
  assert.equal(contract.boundaries.mission_scale_is_support_adjusted_surplus, false);
  assert.equal(contract.boundaries.successor_continuity_is_direct_person_handoff, false);
  assert.equal(contract.boundaries.archive_request_packet_is_archive_request_sent, false);
  assert.equal(contract.boundaries.public_review_request_is_external_review, false);
  assert.equal(contract.boundaries.gate_exhaustion_is_complete_operator, false);

  assert.match(contract.next_action, /Keep issue 597 open/i);
  assert.match(contract.next_action, /refuse CS-FT-01/i);
  return true;
}

export function validateProducts(contract) {
  const gates = read('data/project/counter-selector-wave-21-gate-registry.json');
  const archives = read('data/project/counter-selector-wave-21-archive-request-registry.json');
  const external = read('data/project/counter-selector-wave-21-external-review-registry.json');
  const manifest = read('data/project/counter-selector-wave-21-release-manifest.json');
  const report = read('reports/core-thesis/counter-selector-wave-21/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-21/index.html');

  eq(gates, deriveGateRegistry(contract), 'gate registry deterministic');
  eq(archives, deriveArchiveRegistry(contract), 'archive registry deterministic');
  eq(external, deriveExternalReviewRegistry(contract), 'external review registry deterministic');
  eq(manifest, computeReleaseManifest(), 'release manifest deterministic');
  eq(report, deriveReport(contract, gates, archives, external, manifest), 'report deterministic');
  assert.equal(html, renderHtml(report), 'html deterministic');

  assert.equal(archives.counts.request_packets_prepared, 3);
  assert.equal(archives.counts.requests_sent, 0);
  assert.equal(archives.counts.routes_executed, 0);
  assert.equal(archives.counts.custodian_contacts_authorized, 0);
  assert(archives.requests.every((row) => row.state === 'prepared_not_sent' && row.contact_authorized === false));

  assert.equal(external.counts.requests_opened, 1);
  assert.equal(external.counts.responses_received, 0);
  assert.equal(external.counts.reviews_executed, 0);
  assert.equal(external.request.issue_number, 597);
  assert.equal(external.request.request_opened, true);
  assert.equal(external.request.external_review_executed, false);

  assert.equal(report.counts.new_dimension_supports, 0);
  assert.equal(report.counts.complete_operator_findings, 0);
  assert.equal(report.counts.field_test_eligible_candidates, 0);
  assert.equal(report.candidate.complete_operator_finding, false);
  assert.equal(report.candidate.field_test_eligible, false);
  assert.equal(report.model_elasticity.supported, false);
  assert.equal(report.support_adjusted_surplus.supported, false);
  assert.equal(report.direct_handoff.established, false);
  assert.equal(report.external_review.reviews_executed, 0);
  assert.equal(report.release_manifest.combined_sha256, manifest.combined_sha256);

  assert.match(manifest.combined_sha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.entries.length, 11);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 11);
  assert(manifest.boundaries && Object.entries(manifest.boundaries).every(([key, value]) =>
    key === 'graph_effect' ? value === 'none' : value === false
  ));

  assert.match(html, /Every remaining gate was attacked/);
  assert.match(html, /review request opened ≠ external review/);
  assert(!html.includes('field-test eligible: true'));
  assert(!html.includes('complete operator: true'));
  assert(!html.includes('ranked'));
  return true;
}

export function validateCounterSelectorWave21() {
  const contract = read('data/project/counter-selector-wave-21-gate-exhaustion.json');
  validateContract(contract);
  validateProducts(contract);
  console.log('validate-counter-selector-wave-21: contract and products valid');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) validateCounterSelectorWave21();
