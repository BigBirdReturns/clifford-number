#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseScope } from './build-counter-selector-wave-04.mjs';

const modulePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(modulePath), '..');
const readText = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const EXPECTED_PARENT = 'a8a07401b88a7c07db44935b1db8faafdf3b964645aa9da606d2932421102f09';
const PACKET_IDS = ['CS-BLIND-0016', 'CS-BLIND-0021'];
const PASS_ROLES = ['artifact_validity', 'adversarial_countermodel'];
const DIMENSIONS = [
  'support_adjusted_surplus', 'cross_domain_transfer', 'exception_handling', 'custody',
  'model_elasticity', 'governed_capacity', 'non_zero_sum_orientation', 'epistemic_restraint'
];
const REVIEW_INPUT_FIELDS = [
  'packet_id', 'blind_token', 'review_authority', 'task', 'requirements',
  'bounded_chronology', 'observable_transition', 'counterevidence', 'falsifier'
];
const FORBIDDEN_PASS_KEYS = [
  'candidate_id', 'denominator_class', 'public_label', 'title', 'employer', 'jurisdiction',
  'source_id', 'source_record_id', 'source_url', 'matched_control_id', 'class_reassignment_recommendation'
];
const FORBIDDEN_PASS_STRINGS = [
  'CS-C0016', 'CS-C0021', 'high_status_selected_operators', 'repair_capable_partnerships',
  'Senate-confirmed prosecutor', 'Independent stay halting', 'K0-W08-R001', 'K0-W01-R001'
];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function sameSet(left, right) {
  return sameJson([...left].sort(), [...right].sort());
}
function countState(vector, state) {
  return Object.values(vector).filter((value) => value === state).length;
}
function walkKeys(value, pathPrefix = '') {
  const keys = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => keys.push(...walkKeys(item, `${pathPrefix}[${index}]`)));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.push({ key, path: pathPrefix ? `${pathPrefix}.${key}` : key });
      keys.push(...walkKeys(child, pathPrefix ? `${pathPrefix}.${key}` : key));
    }
  }
  return keys;
}

function validateContract(contract) {
  requireCondition(contract.schema_version === 'counter-selector-blind-review-program@1', 'Unexpected Wave 04 contract schema.');
  requireCondition(contract.program_id === 'counter-selector-v1', 'Unexpected program ID.');
  requireCondition(contract.wave_id === 'CS-W04-B01', 'Unexpected Wave 04 ID.');
  requireCondition(contract.parent_release_sha256 === EXPECTED_PARENT, 'Wave 04 parent release digest drifted.');
  requireCondition(sameJson(contract.review_input_fields, REVIEW_INPUT_FIELDS), 'Review input field contract drifted.');
  requireCondition(contract.review_passes.length === 2, 'Wave 04 requires exactly two review-pass definitions.');
  requireCondition(sameSet(contract.review_passes.map((row) => row.reviewer_role), PASS_ROLES), 'Review-pass roles drifted.');
  requireCondition(contract.packet_review_plans.length === 2, 'Wave 04 requires exactly two packet plans.');
  requireCondition(sameSet(contract.packet_review_plans.map((row) => row.packet_id), PACKET_IDS), 'Packet-plan denominator drifted.');
  requireCondition(contract.reviewer_independence.procedural_separation_claimed === true, 'Procedural separation must be explicit.');
  requireCondition(contract.reviewer_independence.external_human_independence_claimed === false, 'External human independence must not be claimed.');
  requireCondition(contract.reviewer_independence.different_model_or_institution_claimed === false, 'Different-model independence must not be claimed.');
  requireCondition(contract.synthesis_rules.average_review_scores === false, 'Review outputs must not be averaged.');
  requireCondition(contract.synthesis_rules.preserve_disagreement === true, 'Review disagreement must be preserved.');
  requireCondition(contract.synthesis_rules.private_map_available_during_blind_passes === false, 'Private map cannot enter blind passes.');
  requireCondition(contract.boundaries.blind_review_is_operator_selection === false, 'Blind review cannot become operator selection.');
  requireCondition(contract.boundaries.review_authorizes_field_test === false, 'Review cannot authorize a field test.');
  requireCondition(contract.boundaries.aggregate_rank_generated === false, 'Wave 04 cannot generate aggregate rank.');
  requireCondition(contract.boundaries.graph_effect === 'none', 'Wave 04 graph effect must remain none.');

  for (const plan of contract.packet_review_plans) {
    requireCondition(plan.blind_token === plan.packet_id.replace('CS-BLIND-', 'CS-BP'), `${plan.packet_id} blind token drifted.`);
    requireCondition(Object.keys(plan.dimension_vector).length === DIMENSIONS.length, `${plan.packet_id} dimension vector is incomplete.`);
    requireCondition(sameSet(Object.keys(plan.dimension_vector), DIMENSIONS), `${plan.packet_id} dimension keys drifted.`);
    requireCondition(plan.artifact_validity.strengths.length > 0, `${plan.packet_id} requires artifact-validity strengths.`);
    requireCondition(plan.artifact_validity.limits.length > 0, `${plan.packet_id} requires artifact-validity limits.`);
    requireCondition(plan.adversarial_countermodel.ordinary_explanations.length > 0, `${plan.packet_id} requires ordinary explanations.`);
    requireCondition(plan.adversarial_countermodel.unresolved.length > 0, `${plan.packet_id} requires unresolved countermodel fields.`);
    requireCondition(plan.field_test_eligible === false, `${plan.packet_id} cannot be field-test eligible.`);
    requireCondition(plan.next_acquisitions.length > 0, `${plan.packet_id} requires named next acquisitions.`);
  }
}

function validateParent(parentManifest, parentRegistry) {
  requireCondition(parentManifest.combined_sha256 === EXPECTED_PARENT, 'Canonical Wave 03 release digest is unavailable.');
  requireCondition(parentRegistry.schema_version === 'counter-selector-blind-packet-registry@1', 'Unexpected parent blind-packet schema.');
  requireCondition(parentRegistry.counts.packets_ready === 2, 'Parent packet-ready count drifted.');
  requireCondition(parentRegistry.counts.blind_reviews_executed === 0, 'Parent registry must precede review execution.');
  requireCondition(parentRegistry.packets.length === 2, 'Parent registry must contain two packets.');
  requireCondition(parentRegistry.private_map.length === 2, 'Parent registry must contain two private mappings.');
  requireCondition(sameSet(parentRegistry.packets.map((row) => row.packet_id), PACKET_IDS), 'Parent packet IDs drifted.');
  requireCondition(parentRegistry.boundaries.private_map_available_to_blind_reviewer === false, 'Parent private map cannot be reviewer-visible.');
  for (const packet of parentRegistry.packets) {
    requireCondition(packet.identity_removed === true && packet.status_cues_removed === true && packet.source_ids_removed === true, `${packet.packet_id} is not identity-minimized.`);
    requireCondition(packet.blind_review_executed === false, `${packet.packet_id} already claims review execution.`);
    requireCondition(packet.field_test_authorized === false, `${packet.packet_id} authorizes field testing.`);
    requireCondition(packet.graph_effect === 'none', `${packet.packet_id} graph effect must remain none.`);
  }
}

function validatePass(pass, packet) {
  requireCondition(PASS_ROLES.includes(pass.reviewer_role), `${pass.review_id} has an invalid reviewer role.`);
  requireCondition(pass.packet_id === packet.packet_id && pass.blind_token === packet.blind_token, `${pass.review_id} packet custody drifted.`);
  requireCondition(sameJson(pass.input_fields, REVIEW_INPUT_FIELDS), `${pass.review_id} input fields drifted.`);
  const publicInput = Object.fromEntries(REVIEW_INPUT_FIELDS.map((field) => [field, structuredClone(packet[field])]));
  requireCondition(pass.input_digest === sha256(`${JSON.stringify(publicInput, null, 2)}\n`), `${pass.review_id} public-input digest drifted.`);
  requireCondition(pass.independence_class === 'procedural_same_system_not_external', `${pass.review_id} independence class drifted.`);
  requireCondition(pass.identity_cues_available === false, `${pass.review_id} identity cues leaked.`);
  requireCondition(pass.candidate_mapping_available === false, `${pass.review_id} candidate mapping leaked.`);
  requireCondition(pass.denominator_class_available === false, `${pass.review_id} denominator class leaked.`);
  requireCondition(pass.source_route_available === false, `${pass.review_id} source route leaked.`);
  requireCondition(pass.external_independence_claimed === false, `${pass.review_id} falsely claims external independence.`);
  requireCondition(pass.operator_finding === false, `${pass.review_id} generates an operator finding.`);
  requireCondition(pass.field_test_authorized === false, `${pass.review_id} authorizes field testing.`);
  requireCondition(pass.promotion_generated === false && pass.person_ranking_generated === false, `${pass.review_id} generates selection or rank.`);
  requireCondition(pass.public_identity_release_authorized === false, `${pass.review_id} authorizes identity release.`);
  requireCondition(pass.graph_effect === 'none', `${pass.review_id} graph effect must remain none.`);
  for (const { key, path: keyPath } of walkKeys(pass)) {
    requireCondition(!FORBIDDEN_PASS_KEYS.includes(key), `${pass.review_id} contains forbidden key ${keyPath}.`);
  }
  const serialized = JSON.stringify(pass);
  for (const forbidden of FORBIDDEN_PASS_STRINGS) {
    requireCondition(!serialized.includes(forbidden), `${pass.review_id} leaks forbidden blind cue ${forbidden}.`);
  }
  if (pass.reviewer_role === 'artifact_validity') {
    requireCondition(typeof pass.packet_validity === 'string' && pass.packet_validity.length > 0, `${pass.review_id} lacks packet validity.`);
    requireCondition(pass.strengths.length > 0 && pass.limits.length > 0, `${pass.review_id} lacks balanced validity analysis.`);
    requireCondition(Array.isArray(pass.provisional_dimension_support), `${pass.review_id} lacks provisional support vector.`);
  } else {
    requireCondition(pass.ordinary_explanations.length > 0 && pass.unresolved.length > 0, `${pass.review_id} lacks adversarial countermodel.`);
  }
}

function validatePacket0016(review) {
  requireCondition(review.synthesis === 'two_dimensions_bounded_support_no_operator_finding', 'Packet 0016 synthesis drifted.');
  requireCondition(review.disposition === 'retain_for_support_ledger_handoff_and_transfer_acquisition', 'Packet 0016 disposition drifted.');
  requireCondition(review.dimension_vector.support_adjusted_surplus === 'not_tested_support_ledger_missing', 'Packet 0016 support-adjusted state drifted.');
  requireCondition(review.dimension_vector.custody === 'insufficient_handoff_receipt', 'Packet 0016 custody state drifted.');
  requireCondition(review.dimension_vector.governed_capacity === 'bounded_support', 'Packet 0016 governed-capacity support drifted.');
  requireCondition(review.dimension_vector.epistemic_restraint === 'bounded_support', 'Packet 0016 epistemic-restraint support drifted.');
  requireCondition(countState(review.dimension_vector, 'bounded_support') === 2, 'Packet 0016 must contain exactly two bounded supports.');
  requireCondition(countState(review.dimension_vector, 'not_tested') === 4, 'Packet 0016 must retain four untested dimensions.');
  requireCondition(!Object.hasOwn(review, 'mechanism_observations'), 'Packet 0016 cannot inherit mechanism observations.');
  requireCondition(!Object.hasOwn(review, 'class_reassignment_recommendation'), 'Packet 0016 cannot carry a class recommendation.');
}

function validatePacket0021(review) {
  requireCondition(review.synthesis === 'mechanism_valid_partner_capacity_not_established', 'Packet 0021 synthesis drifted.');
  requireCondition(review.disposition === 'retain_as_external_counterpower_repair_control', 'Packet 0021 disposition drifted.');
  requireCondition(Object.values(review.dimension_vector).every((state) => state === 'not_attributable_from_system_packet'), 'Packet 0021 must refuse all operator-dimension attribution.');
  const observations = review.mechanism_observations;
  requireCondition(observations.correction_route_observed === true, 'Packet 0021 correction route must remain observed.');
  requireCondition(observations.external_counterpower_required === true, 'Packet 0021 external counterpower must remain explicit.');
  requireCondition(observations.adverse_state_suspended === true, 'Packet 0021 adverse-state suspension must remain explicit.');
  requireCondition(observations.durable_partnership_repair_observed === false, 'Packet 0021 cannot claim durable partnership repair.');
  requireCondition(observations.final_merits_observed === false, 'Packet 0021 cannot claim final merits.');
  requireCondition(observations.partnership_capacity_established === false, 'Packet 0021 cannot establish partnership capacity.');
  const recommendation = review.class_reassignment_recommendation;
  requireCondition(recommendation.historical_class === 'repair_capable_partnerships', 'Packet 0021 historical class drifted.');
  requireCondition(recommendation.recommended_analysis_class === 'correction_mechanism_control', 'Packet 0021 analysis-class recommendation drifted.');
  requireCondition(recommendation.rewrites_historical_class === false, 'Packet 0021 cannot rewrite its historical class.');
}

function validateReviewRegistry(parentRegistry, registry) {
  requireCondition(registry.schema_version === 'counter-selector-blind-review-registry@1', 'Unexpected review-registry schema.');
  requireCondition(registry.parent_release_sha256 === EXPECTED_PARENT, 'Review-registry parent digest drifted.');
  const expectedCounts = {
    identity_minimized_packets_reviewed: 2,
    procedurally_separated_review_passes: 4,
    external_independent_reviews: 0,
    bounded_dimension_supports: 2,
    disagreements_preserved: 2,
    class_reassignment_recommendations: 1,
    field_test_eligible_packets: 0,
    operator_findings: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_releases: 0,
    graph_effects: 0
  };
  requireCondition(sameJson(registry.counts, expectedCounts), 'Review-registry counts drifted.');
  requireCondition(registry.reviewer_independence.external_human_independence_claimed === false, 'Review registry falsely claims external independence.');
  requireCondition(registry.reviewer_independence.same_system_limitation_preserved === true, 'Same-system limitation must be preserved.');
  requireCondition(registry.review_input_contract.private_map_available_during_passes === false, 'Private mapping entered review passes.');
  requireCondition(sameJson(registry.review_input_contract.allowed_fields, REVIEW_INPUT_FIELDS), 'Review-registry allowed fields drifted.');
  requireCondition(registry.packet_reviews.length === 2, 'Review registry must contain two packet reviews.');
  requireCondition(sameSet(registry.packet_reviews.map((row) => row.packet_id), PACKET_IDS), 'Reviewed packet denominator drifted.');
  const parentPacketById = new Map(parentRegistry.packets.map((packet) => [packet.packet_id, packet]));
  for (const review of registry.packet_reviews) {
    requireCondition(review.schema_version === 'counter-selector-blind-review@1', `${review.packet_id} review schema drifted.`);
    requireCondition(review.review_passes.length === 2, `${review.packet_id} must have two review passes.`);
    requireCondition(sameSet(review.review_passes.map((pass) => pass.reviewer_role), PASS_ROLES), `${review.packet_id} pass roles drifted.`);
    const parentPacket = parentPacketById.get(review.packet_id);
    requireCondition(parentPacket, `${review.packet_id} lacks a parent packet.`);
    for (const pass of review.review_passes) validatePass(pass, parentPacket);
    requireCondition(review.review_passes[0].input_digest === review.review_passes[1].input_digest, `${review.packet_id} passes did not receive the same public packet.`);
    requireCondition(review.convergence === 'same_public_input_independent_question_sets', `${review.packet_id} convergence state drifted.`);
    requireCondition(sameSet(Object.keys(review.dimension_vector), DIMENSIONS), `${review.packet_id} dimension vector drifted.`);
    requireCondition(review.field_test_eligible === false, `${review.packet_id} cannot be field-test eligible.`);
    requireCondition(review.operator_finding === false, `${review.packet_id} cannot create an operator finding.`);
    requireCondition(review.promotion_generated === false && review.person_ranking_generated === false, `${review.packet_id} cannot generate promotion or rank.`);
    requireCondition(review.public_identity_release_authorized === false, `${review.packet_id} cannot authorize identity release.`);
    requireCondition(review.next_acquisitions.length > 0, `${review.packet_id} requires named acquisition work.`);
    requireCondition(review.graph_effect === 'none', `${review.packet_id} graph effect must remain none.`);
  }
  validatePacket0016(registry.packet_reviews.find((row) => row.packet_id === 'CS-BLIND-0016'));
  validatePacket0021(registry.packet_reviews.find((row) => row.packet_id === 'CS-BLIND-0021'));
  requireCondition(registry.post_review_custody_map.length === 2, 'Post-review custody map must contain two rows.');
  requireCondition(sameSet(registry.post_review_custody_map.map((row) => row.packet_id), PACKET_IDS), 'Post-review custody packet IDs drifted.');
  requireCondition(sameSet(registry.post_review_custody_map.map((row) => row.candidate_id), ['CS-C0016', 'CS-C0021']), 'Post-review candidate custody drifted.');
  requireCondition(registry.post_review_custody_map.every((row) => row.available_to_review_passes === false && row.restored_phase === 'post_review_synthesis_only'), 'Post-review mapping boundary drifted.');
  requireCondition(registry.boundaries.procedural_separation_is_external_independence === false, 'Procedural separation cannot become external independence.');
  requireCondition(registry.boundaries.review_authorizes_field_test === false, 'Review registry cannot authorize a field test.');
  requireCondition(registry.boundaries.graph_effect === 'none', 'Review-registry graph effect must remain none.');
}

function validateDisagreementLedger(ledger) {
  requireCondition(ledger.schema_version === 'counter-selector-review-disagreement-ledger@1', 'Unexpected disagreement-ledger schema.');
  requireCondition(ledger.counts.disagreements === 2, 'Disagreement denominator drifted.');
  requireCondition(ledger.counts.scope_disagreements === 1, 'Scope-disagreement count drifted.');
  requireCondition(ledger.counts.unit_of_analysis_disagreements === 1, 'Unit-of-analysis disagreement count drifted.');
  requireCondition(ledger.counts.class_reassignment_recommendations === 1, 'Class-reassignment recommendation count drifted.');
  requireCondition(ledger.counts.historical_class_rewrites === 0, 'Historical class rewrite is forbidden.');
  requireCondition(ledger.counts.graph_effects === 0, 'Disagreement ledger cannot create graph effects.');
  requireCondition(ledger.disagreements.length === 2, 'Disagreement ledger must contain two rows.');
  requireCondition(sameSet(ledger.disagreements.map((row) => row.disagreement_id), ['CS-DG-0001', 'CS-DG-0002']), 'Disagreement IDs drifted.');
  requireCondition(ledger.disagreements.every((row) => row.unresolved_disagreement_preserved === true), 'Disagreement must remain visible after synthesis.');
  const classRow = ledger.disagreements.find((row) => row.disagreement_id === 'CS-DG-0002');
  requireCondition(classRow.class_reassignment_recommendation.rewrites_historical_class === false, 'Class disagreement cannot rewrite historical intake.');
  requireCondition(ledger.packet_dispositions.length === 2, 'Disagreement ledger must reconcile two packet dispositions.');
  requireCondition(ledger.packet_dispositions.every((row) => row.field_test_eligible === false && row.operator_finding === false && row.graph_effect === 'none'), 'Disagreement synthesis exceeded authority.');
  requireCondition(ledger.boundaries.resolution_erases_countermodel === false, 'Resolution cannot erase the countermodel.');
  requireCondition(ledger.boundaries.graph_effect === 'none', 'Disagreement-ledger graph effect must remain none.');
}

function validateReport(reviewRegistry, disagreementLedger, report, html) {
  requireCondition(report.schema_version === 'counter-selector-wave-04-report@1', 'Unexpected Wave 04 report schema.');
  requireCondition(report.parent_release_sha256 === EXPECTED_PARENT, 'Report parent digest drifted.');
  requireCondition(report.counts.identity_minimized_packets_reviewed === 2, 'Report packet count drifted.');
  requireCondition(report.counts.procedurally_separated_review_passes === 4, 'Report pass count drifted.');
  requireCondition(report.counts.external_independent_reviews === 0, 'Report falsely claims external independent review.');
  requireCondition(report.counts.bounded_dimension_supports === 2, 'Report bounded-support count drifted.');
  requireCondition(report.counts.disagreements_preserved === 2, 'Report disagreement count drifted.');
  requireCondition(report.counts.class_reassignment_recommendations === 1, 'Report class-recommendation count drifted.');
  requireCondition(report.counts.field_test_eligible_packets === 0, 'Report field-test eligibility drifted.');
  requireCondition(report.counts.operator_findings === 0 && report.counts.promotions === 0 && report.counts.person_rankings === 0, 'Report generated selection authority.');
  requireCondition(report.counts.graph_effects === 0, 'Report graph effect count drifted.');
  requireCondition(report.counts.adversarial_mutations === 26, 'Report mutation count drifted.');
  requireCondition(report.packet_results.length === reviewRegistry.packet_reviews.length, 'Report packet results do not reconcile.');
  requireCondition(report.disagreements.length === disagreementLedger.disagreements.length, 'Report disagreements do not reconcile.');
  requireCondition(report.release_manifest?.combined_sha256?.length === 64, 'Report release digest is missing.');
  requireCondition(report.boundaries.graph_effect === 'none', 'Report graph effect must remain none.');
  requireCondition(html.includes('2 PACKETS REVIEWED'), 'HTML review count marker is missing.');
  requireCondition(html.includes('EXTERNAL INDEPENDENCE NOT CLAIMED'), 'HTML independence boundary is missing.');
  requireCondition(html.includes('0 FIELD TESTS'), 'HTML field-test boundary is missing.');
  for (const forbidden of FORBIDDEN_PASS_STRINGS) {
    requireCondition(!html.includes(forbidden), `HTML leaks forbidden identity or class cue ${forbidden}.`);
  }
}

function validateManifest(manifest, fileContents) {
  requireCondition(manifest.schema_version === 'counter-selector-wave-04-release-manifest@1', 'Unexpected release-manifest schema.');
  requireCondition(manifest.scope_ordered === true && manifest.self_included === false, 'Release-manifest scope contract drifted.');
  requireCondition(sameJson(manifest.entries.map((entry) => entry.path), releaseScope), 'Release-manifest path scope drifted.');
  for (const entry of manifest.entries) {
    requireCondition(Object.hasOwn(fileContents, entry.path), `Missing exact-byte content for ${entry.path}.`);
    const bytes = Buffer.from(fileContents[entry.path], 'utf8');
    requireCondition(entry.bytes === bytes.length, `Byte count drifted for ${entry.path}.`);
    requireCondition(entry.sha256 === sha256(bytes), `SHA-256 drifted for ${entry.path}.`);
  }
  const combined = sha256(manifest.entries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''));
  requireCondition(manifest.combined_sha256 === combined, 'Combined release digest drifted.');
  requireCondition(manifest.boundaries.manifest_proves_external_independence === false, 'Manifest cannot prove external independence.');
  requireCondition(manifest.boundaries.manifest_authorizes_field_test === false, 'Manifest cannot authorize field testing.');
  requireCondition(manifest.boundaries.graph_effect === 'none', 'Release-manifest graph effect must remain none.');
}

export function loadWave04State() {
  const contract = readJson('data/project/counter-selector-wave-04-blind-review.json');
  const parentManifest = readJson('data/project/counter-selector-wave-03-release-manifest.json');
  const parentRegistry = readJson('data/project/counter-selector-blind-packet-registry.json');
  const reviewRegistry = readJson('data/project/counter-selector-blind-review-registry.json');
  const disagreementLedger = readJson('data/project/counter-selector-review-disagreement-ledger.json');
  const report = readJson('reports/core-thesis/counter-selector-wave-04/data.json');
  const html = readText('reports/core-thesis/counter-selector-wave-04/index.html');
  const manifest = readJson('data/project/counter-selector-wave-04-release-manifest.json');
  const fileContents = Object.fromEntries(releaseScope.map((rel) => [rel, readText(rel)]));
  return { contract, parentManifest, parentRegistry, reviewRegistry, disagreementLedger, report, html, manifest, fileContents };
}

export function validateWave04State(state) {
  validateContract(state.contract);
  validateParent(state.parentManifest, state.parentRegistry);
  validateReviewRegistry(state.parentRegistry, state.reviewRegistry);
  validateDisagreementLedger(state.disagreementLedger);
  validateReport(state.reviewRegistry, state.disagreementLedger, state.report, state.html);
  validateManifest(state.manifest, state.fileContents);
  requireCondition(state.report.release_manifest.combined_sha256 === state.manifest.combined_sha256, 'Report and manifest digests do not reconcile.');
  return {
    ok: true,
    packets: state.reviewRegistry.counts.identity_minimized_packets_reviewed,
    passes: state.reviewRegistry.counts.procedurally_separated_review_passes,
    boundedSupports: state.reviewRegistry.counts.bounded_dimension_supports,
    disagreements: state.disagreementLedger.counts.disagreements,
    fieldEligible: state.reviewRegistry.counts.field_test_eligible_packets,
    combined_sha256: state.manifest.combined_sha256
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const result = validateWave04State(loadWave04State());
  console.log(
    `validate-counter-selector-wave-04: PASS (${result.packets} packets, ${result.passes} passes, ` +
    `${result.boundedSupports} bounded supports, ${result.disagreements} disagreements, ` +
    `${result.fieldEligible} field-test eligible, ${result.combined_sha256})`
  );
}
