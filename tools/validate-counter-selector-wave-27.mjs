#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAll,
  deriveBlindRegistry,
  deriveDisagreementLedger,
  deriveManifest,
  deriveReport,
  deriveReviewRegistry,
  renderHtml,
  stableJson
} from './build-counter-selector-wave-27.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-27-batch-a-blind-review.json';
const BLIND_PATH = 'data/project/counter-selector-wave-27-blind-packet-registry.json';
const REVIEW_PATH = 'data/project/counter-selector-wave-27-review-registry.json';
const DISAGREEMENT_PATH = 'data/project/counter-selector-wave-27-disagreement-ledger.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-27-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-27/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-27/index.html';

const DIMENSIONS = [
  'support_adjusted_surplus',
  'cross_domain_transfer',
  'exception_handling',
  'custody',
  'model_elasticity',
  'governed_capacity',
  'non_zero_sum_orientation',
  'epistemic_restraint'
];

const PROHIBITED_BLIND_TOKENS = [
  'daniel',
  'stenberg',
  'curl',
  'haxx',
  'wolfssl',
  'fastly',
  'hackerone',
  'github',
  'simon',
  'willison',
  'datasette',
  'django',
  'filippo',
  'valsorda',
  'claude',
  'gpt-5.4',
  'world online'
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}

function countSupports(source) {
  return {
    person: source.packets.reduce((sum, packet) => sum + packet.person_bounded_supports.length, 0),
    function: source.packets.reduce((sum, packet) => sum + packet.function_bounded_supports.length, 0)
  };
}

function scanBlindPacket(packet) {
  const serialized = JSON.stringify(packet).toLowerCase();
  for (const token of PROHIBITED_BLIND_TOKENS) {
    assert.equal(serialized.includes(token), false, `blind packet leaked prohibited cue: ${token}`);
  }
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-observability-blind-review@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W27-BA-01');
  assert.equal(source.parent_wave_id, 'CS-W26-OP-01');
  assert.equal(source.parent_release_sha256, '44f61564a6fe12e9cf5f4c236cecb6afd528db65ba7d1f3dbfbe1b4c8e598a04');
  assert.equal(source.status, 'batch_a_two_pass_review_completed_five_person_supports_one_function_support_zero_operator_findings');
  assert.equal(source.packets.length, 2);
  assert.equal(source.disagreements.length, 2);

  const expectedCounts = {
    source_packets_audited: 2,
    public_source_records: 13,
    identity_minimized_packets_created: 2,
    identity_minimized_packets_reviewed: 2,
    procedurally_separated_review_passes: 4,
    external_independent_reviews: 0,
    support_ledgers_completed: 2,
    packets_with_person_bounded_support: 2,
    person_bounded_dimension_supports: 5,
    function_bounded_dimension_supports: 1,
    disagreements_preserved: 2,
    direct_handoff_receipts: 0,
    valid_resource_normalized_comparators: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    contacts_authorized: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 56
  };
  for (const [key, value] of Object.entries(expectedCounts)) {
    assert.equal(source.counts[key], value, `${key} drift`);
  }

  assert.equal(source.review_independence.identity_labels_removed, true);
  assert.equal(source.review_independence.identity_blindness_claimed, false);
  assert.equal(source.review_independence.artifact_inferability, 'high');
  assert.equal(source.review_independence.procedural_separation_claimed, true);
  assert.equal(source.review_independence.fresh_context_claimed, true);
  assert.equal(source.review_independence.external_human_independence_claimed, false);
  assert.equal(source.review_independence.different_model_or_institution_claimed, false);
  assert.equal(source.review_independence.same_system_limitation_preserved, true);
  assert.equal(source.review_independence.private_identity_map_available_during_passes, false);

  const packetIds = source.packets.map(packet => packet.review_packet_id);
  const blindTokens = source.packets.map(packet => packet.blind_token);
  const sourcePacketIds = source.packets.map(packet => packet.source_packet_id);
  assert.equal(new Set(packetIds).size, 2);
  assert.equal(new Set(blindTokens).size, 2);
  assert.equal(new Set(sourcePacketIds).size, 2);
  assert.deepEqual(sourcePacketIds, ['CS-OBS-0001', 'CS-OBS-0004']);

  const sourceRecords = source.packets.flatMap(packet => packet.source_records);
  assert.equal(sourceRecords.length, 13);
  assert.equal(new Set(sourceRecords.map(record => record.source_id)).size, 13);
  assert.equal(new Set(sourceRecords.map(record => record.url)).size, 13);
  for (const record of sourceRecords) {
    assert.match(record.source_id, /^CS-W27-S\d{2}$/);
    assert.match(record.url, /^https:\/\//);
    assert.equal(record.artifact_scope.length > 30, true);
  }

  for (const packet of source.packets) {
    assert.equal(packet.candidate_type, 'person_attributable_living_operator');
    assert.equal(typeof packet.source_identity, 'string');
    assert.equal(packet.source_identity.length > 0, true);
    assert.equal(packet.blind_packet.packet_id, packet.review_packet_id);
    assert.equal(packet.blind_packet.blind_token, packet.blind_token);
    assert.equal(Object.keys(packet.dimension_vector).length, 8);
    assert.deepEqual(Object.keys(packet.dimension_vector), DIMENSIONS);
    assert.equal(packet.review_passes.length, 2);
    assert.deepEqual(packet.review_passes.map(pass => pass.reviewer_role), ['artifact_validity', 'adversarial_countermodel']);
    assert.equal(packet.review_passes.every(pass => pass.fresh_context === true), true);
    assert.equal(packet.review_passes.every(pass => pass.external_independence_claimed === false), true);
    assert.equal(packet.review_passes.every(pass => pass.identity_cues_available === false), true);
    assert.equal(packet.review_passes.every(pass => pass.candidate_mapping_available === false), true);
    assert.equal(packet.review_passes.every(pass => pass.source_routes_available === false), true);
    assert.equal(packet.support_ledger.complete_for_current_public_surface, true);
    assert.equal(packet.support_ledger.valid_resource_normalized_comparator, false);
    assert.equal(packet.support_ledger.support_adjusted_surplus_supported, false);
    assert.equal(packet.support_ledger.support_elements.length >= 6, true);
    assert.equal(packet.support_ledger.missing_normalization.length >= 3, true);
    assert.equal(packet.field_test_eligible, false);
    assert.equal(packet.operator_finding, false);
    assert.equal(packet.contact_authorized, false);
    assert.equal(packet.graph_effect, 'none');
    scanBlindPacket(packet.blind_packet);
  }

  const first = source.packets[0];
  assert.equal(first.source_identity, 'Daniel Stenberg');
  assert.deepEqual(first.person_bounded_supports, ['model_elasticity', 'epistemic_restraint']);
  assert.deepEqual(first.function_bounded_supports, ['exception_handling']);
  assert.equal(first.dimension_vector.support_adjusted_surplus, 'insufficient_heavy_visible_support_no_normalized_comparator');
  assert.equal(first.dimension_vector.cross_domain_transfer, 'not_tested_materially_unrelated_domain_absent');
  assert.equal(first.dimension_vector.exception_handling, 'collective_function_bounded_support_not_person_aggregate');
  assert.equal(first.dimension_vector.custody, 'insufficient_governance_backup_roles_and_plan_not_observed_handoff');
  assert.equal(first.dimension_vector.model_elasticity, 'bounded_person_support_authored_assumption_revision_and_operational_route_change_collective_decision_ceiling');
  assert.equal(first.dimension_vector.governed_capacity, 'insufficient_project_role_and_process_visible_person_scope_not_isolated');
  assert.equal(first.dimension_vector.non_zero_sum_orientation, 'insufficient_transparency_and_credit_rules_are_project_contract_not_person_result');
  assert.equal(first.dimension_vector.epistemic_restraint, 'bounded_person_support_mistake_admission_requirement_specificity_and_uncertainty');
  assert.equal(first.review_passes[0].provisional_person_support.includes('exception_handling'), false);
  assert.deepEqual(first.review_passes[0].provisional_function_support, ['exception_handling']);
  assert.deepEqual(first.review_passes[1].surviving_person_support, ['model_elasticity', 'epistemic_restraint']);
  assert.deepEqual(first.review_passes[1].surviving_function_support, ['exception_handling']);

  const second = source.packets[1];
  assert.equal(second.source_identity, 'Simon Willison');
  assert.deepEqual(second.person_bounded_supports, ['exception_handling', 'model_elasticity', 'epistemic_restraint']);
  assert.deepEqual(second.function_bounded_supports, []);
  assert.equal(second.dimension_vector.support_adjusted_surplus, 'insufficient_external_research_ai_tools_coauthor_community_and_platform_support_not_normalized');
  assert.equal(second.dimension_vector.cross_domain_transfer, 'insufficient_related_software_and_information_tool_family');
  assert.equal(second.dimension_vector.exception_handling, 'bounded_person_support_security_discovery_advisory_patch_test_and_release_scope');
  assert.equal(second.dimension_vector.custody, 'insufficient_public_repair_objects_present_independent_resumability_and_direct_handoff_absent');
  assert.equal(second.dimension_vector.model_elasticity, 'bounded_person_support_external_reasoning_to_changed_security_design_code_docs_and_upgrade_path');
  assert.equal(second.dimension_vector.governed_capacity, 'insufficient_self_governed_maintainer_process_and_collective_controls_not_independently_tested');
  assert.equal(second.dimension_vector.non_zero_sum_orientation, 'insufficient_open_source_credit_and_public_docs_do_not_alone_establish_orientation');
  assert.equal(second.dimension_vector.epistemic_restraint, 'bounded_person_support_impact_ceiling_external_credit_and_tool_assistance_disclosure');
  assert.deepEqual(second.review_passes[0].provisional_person_support, ['exception_handling', 'model_elasticity', 'epistemic_restraint', 'custody']);
  assert.deepEqual(second.review_passes[1].surviving_person_support, ['exception_handling', 'model_elasticity', 'epistemic_restraint']);
  assert.equal(second.review_passes[1].rejected_inferences.includes('custody or direct handoff'), true);

  const supports = countSupports(source);
  assert.equal(supports.person, 5);
  assert.equal(supports.function, 1);
  assert.equal(source.packets.filter(packet => packet.person_bounded_supports.length > 0).length, 2);

  assert.equal(source.disagreements.every(item => item.averaged === false), true);
  assert.deepEqual(source.disagreements.map(item => item.resolution), [
    'retain_exception_handling_only_at_collective_security_function_scope',
    'retain_public_repair_objects_as_evidence_but_do_not_add_custody_support'
  ]);

  const falseBoundaryKeys = [
    'identity_label_removed_is_identity_blind',
    'artifact_inferability_is_external_independence',
    'public_blog_is_independent_review',
    'first_party_repository_is_external_review',
    'person_authored_explanation_is_sole_person_causality',
    'team_reversal_is_person_exception_handling',
    'mistake_admission_is_universal_model_elasticity',
    'public_security_fix_is_complete_operator',
    'public_release_is_independent_handoff',
    'backup_admin_is_observed_succession',
    'governance_plan_is_completed_handoff',
    'open_source_is_non_zero_sum_proof',
    'related_software_breadth_is_cross_domain_transfer',
    'paid_support_is_person_surplus',
    'small_team_is_support_adjusted_surplus',
    'ai_assistance_is_person_surplus',
    'support_ledger_is_normalization',
    'bounded_dimension_count_is_rank',
    'internal_two_pass_review_is_external_review',
    'living_person_is_contact_authorization',
    'field_test_authorized',
    'promotion_authorized',
    'person_ranking_authorized',
    'public_identity_profile_authorized'
  ];
  for (const key of falseBoundaryKeys) {
    assert.equal(source.boundaries[key], false, `${key} must remain false`);
  }
  assert.equal(source.boundaries.graph_effect, 'none');
  assert.equal(source.next_action.includes('do not contact either source subject'), true);
  return true;
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);

  const expectedBlind = deriveBlindRegistry(source);
  const expectedReview = deriveReviewRegistry(source, expectedBlind);
  const expectedDisagreement = deriveDisagreementLedger(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedBlind, expectedReview, expectedDisagreement, expectedManifest);

  exact(BLIND_PATH, stableJson(expectedBlind));
  exact(REVIEW_PATH, stableJson(expectedReview));
  exact(DISAGREEMENT_PATH, stableJson(expectedDisagreement));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));

  const blind = readJson(BLIND_PATH);
  assert.equal(blind.packets.length, 2);
  assert.equal(blind.counts.source_routes_exposed_in_packets, 0);
  assert.equal(blind.counts.identity_labels_exposed_in_packets, 0);
  assert.equal(blind.packets.every(packet => packet.identity_labels_removed === true), true);
  assert.equal(blind.packets.every(packet => packet.identity_blindness_claimed === false), true);
  assert.equal(blind.packets.every(packet => packet.source_routes_exposed === false), true);
  assert.equal(blind.packets.every(packet => packet.candidate_mapping_exposed === false), true);
  assert.equal(blind.packets.every(packet => /^[a-f0-9]{64}$/.test(packet.input_digest)), true);
  for (const packet of blind.packets) scanBlindPacket(packet);

  const review = readJson(REVIEW_PATH);
  assert.equal(review.packet_results.length, 2);
  assert.equal(review.packet_results.flatMap(packet => packet.review_passes).length, 4);
  assert.equal(review.packet_results.every(packet => packet.operator_finding === false), true);
  assert.equal(review.packet_results.every(packet => packet.field_test_eligible === false), true);
  assert.equal(review.packet_results.every(packet => packet.contact_authorized === false), true);
  assert.equal(review.packet_results.every(packet => packet.graph_effect === 'none'), true);

  const disagreement = readJson(DISAGREEMENT_PATH);
  assert.equal(disagreement.counts.disagreements_preserved, 2);
  assert.equal(disagreement.counts.averaged_disagreements, 0);

  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W27-BA-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-27: contract and products valid');
}
