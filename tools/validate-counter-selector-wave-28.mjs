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
} from './build-counter-selector-wave-28.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-28-batch-b-blind-review.json';
const BLIND_PATH = 'data/project/counter-selector-wave-28-blind-packet-registry.json';
const REVIEW_PATH = 'data/project/counter-selector-wave-28-review-registry.json';
const DISAGREEMENT_PATH = 'data/project/counter-selector-wave-28-disagreement-ledger.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-28-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-28/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-28/index.html';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
function exact(relativePath, expected) {
  assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`);
}
function allFalse(object, keys) {
  for (const key of keys) assert.equal(object[key], false, `${key} must remain false`);
}

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-observability-batch-b-blind-review@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W28-BB-01');
  assert.equal(source.parent_wave_id, 'CS-W26-OP-01');
  assert.equal(source.sibling_wave_id, 'CS-W27-BA-01');
  assert.match(source.parent_release_sha256, /^[a-f0-9]{64}$/);
  assert.match(source.sibling_release_sha256, /^[a-f0-9]{64}$/);
  assert.equal(source.status, 'batch_b_two_pass_review_completed_three_person_supports_eight_function_supports_zero_operator_findings');
  assert.equal(source.packets.length, 2);
  assert.equal(source.disagreements.length, 2);

  const expectedCounts = {
    source_packets_audited: 2,
    public_source_records: 12,
    identity_minimized_packets_created: 2,
    identity_minimized_packets_reviewed: 2,
    procedurally_separated_review_passes: 4,
    external_independent_reviews: 0,
    support_ledgers_completed: 2,
    packets_with_person_bounded_support: 1,
    person_bounded_dimension_supports: 3,
    packets_with_function_bounded_support: 2,
    function_bounded_dimension_supports: 8,
    disagreements_preserved: 2,
    direct_handoff_receipts: 0,
    observed_project_successions: 0,
    valid_resource_normalized_comparators: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    contacts_authorized: 0,
    bounded_collaborations_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_profiles: 0,
    graph_effects: 0,
    adversarial_mutations: 60
  };
  assert.deepEqual(source.counts, expectedCounts);

  assert.equal(source.review_independence.identity_labels_removed, true);
  assert.equal(source.review_independence.identity_blindness_claimed, false);
  assert.equal(source.review_independence.artifact_inferability, 'high');
  assert.equal(source.review_independence.procedural_separation_claimed, true);
  assert.equal(source.review_independence.external_human_independence_claimed, false);
  assert.equal(source.review_independence.different_model_or_institution_claimed, false);
  assert.equal(source.review_independence.same_system_limitation_preserved, true);
  assert.equal(source.review_independence.private_identity_map_available_during_passes, false);

  const sourceIds = source.packets.flatMap(packet => packet.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 12);
  assert.equal(new Set(sourceIds).size, 12);
  assert.equal(new Set(source.packets.map(packet => packet.review_packet_id)).size, 2);
  assert.equal(new Set(source.packets.map(packet => packet.blind_token)).size, 2);

  const collective = source.packets.find(packet => packet.candidate_type === 'collective_custody_system');
  const living = source.packets.find(packet => packet.candidate_type === 'person_attributable_living_operator');
  assert.ok(collective);
  assert.ok(living);
  assert.equal(collective.source_identity, null);
  assert.equal(collective.person_bounded_supports.length, 0);
  assert.deepEqual(collective.function_bounded_supports, [
    'exception_handling', 'custody', 'model_elasticity',
    'governed_capacity', 'epistemic_restraint'
  ]);
  assert.deepEqual(living.person_bounded_supports, [
    'exception_handling', 'model_elasticity', 'epistemic_restraint'
  ]);
  assert.deepEqual(living.function_bounded_supports, [
    'custody', 'governed_capacity', 'non_zero_sum_orientation'
  ]);

  for (const packet of source.packets) {
    assert.equal(packet.review_passes.length, 2);
    assert.equal(packet.review_passes[0].reviewer_role, 'artifact_validity');
    assert.equal(packet.review_passes[1].reviewer_role, 'adversarial_countermodel');
    assert.equal(packet.review_passes.every(pass => pass.fresh_context === true), true);
    assert.equal(packet.review_passes.every(pass => pass.external_independence_claimed === false), true);
    assert.equal(packet.support_ledger.complete_for_current_public_surface, true);
    assert.equal(packet.support_ledger.valid_resource_normalized_comparator, false);
    assert.equal(Object.keys(packet.dimension_vector).length, 8);
    assert.equal(packet.field_test_eligible, false);
    assert.equal(packet.operator_finding, false);
    assert.equal(packet.contact_authorized, false);
    assert.equal(packet.graph_effect, 'none');
    assert.equal(packet.blind_packet.review_authority.includes('no_contact_authority'), true);
    assert.equal(packet.blind_packet.counterevidence.length >= 6, true);
    assert.equal(packet.blind_packet.falsifier.length >= 5, true);
  }

  assert.equal(source.disagreements.every(item => item.averaged === false), true);
  assert.equal(source.disagreements[0].resolution, 'retain_model_elasticity_only_at_collective_assurance_system_scope');
  assert.equal(source.disagreements[1].resolution, 'retain_custody_governed_capacity_and_non_zero_sum_orientation_only_at_service_function_scope');

  allFalse(source.boundaries, [
    'identity_label_removed_is_identity_blind',
    'artifact_inferability_is_external_independence',
    'first_party_documentation_is_external_review',
    'collective_assurance_system_is_person_operator',
    'fault_injection_is_person_exception_handling',
    'current_rollback_is_successor_handoff',
    'stated_long_horizon_is_observed_succession',
    'public_domain_is_non_zero_sum_proof',
    'failed_acquisition_is_universal_model_elasticity',
    'open_sourcing_is_completed_handoff',
    'team_growth_is_independent_resumability',
    'service_custody_is_person_custody',
    'subscription_free_policy_is_person_orientation',
    'related_security_roles_are_cross_domain_transfer',
    'commercial_support_is_person_surplus',
    'small_team_is_support_adjusted_surplus',
    'support_ledger_is_normalization',
    'bounded_dimension_count_is_rank',
    'internal_two_pass_review_is_external_review',
    'living_person_is_contact_authorization',
    'field_test_authorized',
    'promotion_authorized',
    'person_ranking_authorized',
    'public_identity_profile_authorized'
  ]);
  assert.equal(source.boundaries.graph_effect, 'none');

  const personTotal = source.packets.reduce((sum, packet) => sum + packet.person_bounded_supports.length, 0);
  const functionTotal = source.packets.reduce((sum, packet) => sum + packet.function_bounded_supports.length, 0);
  assert.equal(personTotal, source.counts.person_bounded_dimension_supports);
  assert.equal(functionTotal, source.counts.function_bounded_dimension_supports);
  assert.equal(source.packets.filter(packet => packet.person_bounded_supports.length > 0).length, source.counts.packets_with_person_bounded_support);
  assert.equal(source.packets.filter(packet => packet.function_bounded_supports.length > 0).length, source.counts.packets_with_function_bounded_support);
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);
  const blind = deriveBlindRegistry(source);
  const reviews = deriveReviewRegistry(source);
  const disagreements = deriveDisagreementLedger(source);
  const manifest = deriveManifest(source);
  const report = deriveReport(source, blind, reviews, disagreements, manifest);
  exact(BLIND_PATH, stableJson(blind));
  exact(REVIEW_PATH, stableJson(reviews));
  exact(DISAGREEMENT_PATH, stableJson(disagreements));
  exact(MANIFEST_PATH, stableJson(manifest));
  exact(REPORT_PATH, stableJson(report));
  exact(HTML_PATH, renderHtml(report));

  const committedManifest = readJson(MANIFEST_PATH);
  assert.equal(committedManifest.entries.length, 8);
  assert.match(committedManifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(committedManifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(committedManifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(committedManifest.boundaries.manifest_authorizes_graph_edge, false);

  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W28-BB-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-28: contract and products valid');
}
