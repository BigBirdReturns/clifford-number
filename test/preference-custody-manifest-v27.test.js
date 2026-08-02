import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV27,
  validatePreferenceCustodyManifestV27Build
} from '../tools/lib/preference-custody-manifest-v27.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v27.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v27.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v27.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v27.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV27(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV27Build(compiled), []);
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v27-build@1');
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v27');
assert.equal(compiled.status, 'laboratory_floor_v27_qualified');
assert.equal(compiled.control_issue, 781);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_count, 29);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), Array.from({ length: 29 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`).sort());

assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v26');
assert.equal(compiled.composition.base_schema_version, 'preference-custody-control-manifest-v26-build@1');
assert.equal(compiled.composition.base_control_count, 28);
assert.equal(compiled.composition.extension_control_id, 'PC-29');
assert.equal(compiled.composition.added_promotion_requirement_count, 71);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 71);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);

for (const [key, value] of Object.entries(compiled.control_integrity)) assert.equal(value, true, `control integrity ${key} must remain true`);
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.ok(compiled.promotion_boundary.real_case_requires.includes('equilibrium_assurance_observed_market_identity_boundary_version_and_denominator'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('equilibrium_assurance_market_capacity_price_response_substitution_equilibrium_welfare_replication_lineage_consequence_and_interpretation_chain_history'));
assert.equal(new Set(compiled.promotion_boundary.real_case_requires).size, compiled.promotion_boundary.real_case_requires.length);

assert.ok(!compiled.open_frontiers.includes('saturation_general_equilibrium_and_interference_robust_policy_governance'));
assert.ok(compiled.open_frontiers.includes('market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance'));
assert.ok(compiled.open_frontiers.includes('strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance'));
assert.ok(compiled.open_frontiers.includes('identity_resolution_entity_boundary_and_network_frame_assurance'));
assert.ok(compiled.open_frontiers.includes('edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance'));

const pc29 = compiled.controls.find(control => control.control_id === 'PC-29');
assert.ok(pc29);
assert.equal(pc29.fixture_id, 'same-equilibrium-adjusted-status-different-system-states-v1');
assert.equal(pc29.failure_class, 'saturation_general_equilibrium_capacity_price_substitution_welfare_replication_and_scale_succession_equifinality');
assert.equal(pc29.graph_effect, 'none');
assert.equal(pc29.counts_toward_thesis_evidence, false);
assert.equal(pc29.conclusion_generated, false);
assert.equal(pc29.real_world_effect_claimed, false);
assert.equal(pc29.preference_change_present, false);
assert.equal(pc29.manipulative_intent_inferable, false);

const expectedProof = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_equilibrium_governance_signatures: 8,
  complete_equilibrium_assurance_worlds: 1,
  universal_saturation_no_counterfactual_worlds: 1,
  capacity_queue_rationing_quality_worlds: 1,
  price_availability_feedback_worlds: 1,
  strategic_anticipation_gaming_provider_response_worlds: 1,
  substitution_displacement_harm_transfer_worlds: 1,
  multiple_equilibria_path_selection_worlds: 1,
  stale_scale_succession_worlds: 1,
  market_counterfactual_complete_worlds: 7,
  capacity_access_complete_worlds: 7,
  price_availability_complete_worlds: 7,
  strategic_response_complete_worlds: 7,
  substitution_harm_complete_worlds: 7,
  equilibrium_selection_complete_worlds: 7,
  welfare_incidence_complete_worlds: 7,
  independent_replication_complete_worlds: 7,
  current_scale_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  total_saturated_unit_count: 100,
  total_capacity_constrained_unit_count: 60,
  total_queued_unit_count: 40,
  total_rationed_unit_count: 30,
  total_denied_unit_count: 20,
  total_quality_deteriorated_unit_count: 30,
  total_price_exposed_unit_count: 60,
  total_affordability_shifted_unit_count: 40,
  total_demand_shifted_unit_count: 40,
  total_uptake_shifted_unit_count: 30,
  total_anticipating_unit_count: 50,
  total_gaming_unit_count: 30,
  total_compliance_adapted_unit_count: 30,
  total_provider_response_unit_count: 40,
  total_substituted_unit_count: 50,
  total_displaced_unit_count: 40,
  total_crowd_out_unit_count: 30,
  total_rebound_unit_count: 20,
  total_harm_shifted_unit_count: 40,
  total_cross_market_exposure_count: 100,
  total_intertemporal_exposure_count: 40,
  total_path_dependent_unit_count: 60,
  total_stale_scale_decision_count: 100,
  total_unsupported_equilibrium_decisions: 700,
  binding_public_authority_worlds: 0
};
assert.deepEqual(Object.fromEntries(Object.keys(expectedProof).map(key => [key, pc29.proof_summary[key]])), expectedProof);
for (const key of [
  'universal_rollout_identifies_untreated_system_counterfactual',
  'observed_untreated_units_identify_untreated_markets_under_saturation',
  'zero_published_capacity_change_identifies_unconstrained_capacity',
  'completed_service_identifies_eligible_or_attempted_service_denominator',
  'zero_published_price_change_identifies_zero_affordability_or_availability_feedback',
  'stable_uptake_identifies_absence_of_demand_adaptation',
  'pre_policy_behavior_identifies_unanticipated_behavior_after_announcement',
  'compliance_identifies_absence_of_gaming_or_provider_response',
  'within_market_gain_identifies_system_welfare_without_substitution_or_harm_transfer',
  'one_solved_equilibrium_identifies_unique_policy_relevant_equilibrium',
  'favorable_initialization_identifies_equilibrium_identification',
  'aggregate_welfare_gain_identifies_explicit_weights_incidence_and_no_harmed_groups',
  'replication_count_identifies_independent_equivalent_replication',
  'pilot_partial_equilibrium_identifies_current_systemwide_assurance_after_scale_succession',
  'public_equilibrium_adjusted_status_identifies_complete_current_counterfactual_capacity_price_response_substitution_welfare_replication_authorized_evidence',
  'equilibrium_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed'
]) assert.equal(pc29.proof_summary[key], false);
assert.equal(pc29.proof_summary.complete_equilibrium_assurance_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v26_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc29_market_counterfactual_saturation_capacity_price_response_substitution_equilibrium_welfare_replication_and_scale_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'equilibrium_assurance_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'equilibrium_assurance_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain[4].event_type, 'interpretation_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v27/);
assert.match(markdown, /Controls:\*\* 29/);
assert.match(markdown, /PC-29: saturation, general equilibrium, and interference-robust policy custody/);
assert.match(markdown, /total_unsupported_equilibrium_decisions: 700/);
assert.doesNotMatch(markdown, /named policy caused|actual manipulation|publicly authorized/i);

const manifestMutations = [
  ['graph', m => { m.graph_effect = 'asserted'; }, /graph_effect/],
  ['issue', m => { m.control_issue = 780; }, /control issue/],
  ['base count', m => { m.base_floor.expected_control_count = 27; }, /base floor contract/],
  ['control', m => { m.extension_control.control_id = 'PC-30'; }, /extension control/],
  ['frontier', m => { m.frontier_transition.resolved_base_frontier = 'wrong_frontier'; }, /resolved frontier/],
  ['successor', m => { m.frontier_transition.successor_frontiers.pop(); }, /successor frontiers/],
  ['requirements', m => { m.real_case_requirements_added.splice(-2); }, /real-case requirements/],
  ['requirement format', m => { m.real_case_requirements_added[0] = 'Not-Machine-Addressable'; }, /lowercase underscore/],
  ['interpretation', m => { m.interpretation_contract.copy_ready_caveat = ''; }, /interpretation contract/]
];
for (const [label, mutate, pattern] of manifestMutations) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  assert.ok(validatePreferenceCustodyManifestV27(candidate).some(error => pattern.test(error)), label);
}

const buildCountLeak = structuredClone(compiled);
buildCountLeak.control_count = 28;
assert.ok(validatePreferenceCustodyManifestV27Build(buildCountLeak).some(error => /twenty-nine controls/.test(error)));
const proofLeak = structuredClone(compiled);
proofLeak.controls.find(control => control.control_id === 'PC-29').proof_summary.total_saturated_unit_count = 99;
assert.ok(validatePreferenceCustodyManifestV27Build(proofLeak).some(error => /PC-29 total_saturated_unit_count/.test(error)));
const integrityLeak = structuredClone(compiled);
integrityLeak.control_integrity.base_integrity_preserved = false;
assert.ok(validatePreferenceCustodyManifestV27Build(integrityLeak).some(error => /base_integrity_preserved/.test(error)));
const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('saturation_general_equilibrium_and_interference_robust_policy_governance');
assert.ok(validatePreferenceCustodyManifestV27Build(resolvedFrontierLeak).some(error => /resolved broad saturation frontier/.test(error)));
const successorLeak = structuredClone(compiled);
successorLeak.open_frontiers = successorLeak.open_frontiers.filter(frontier => frontier !== 'market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance');
assert.ok(validatePreferenceCustodyManifestV27Build(successorLeak).some(error => /successor frontier missing/.test(error)));
const authorityLeak = structuredClone(compiled);
authorityLeak.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV27Build(authorityLeak).some(error => /must remain false/.test(error)));
const chainLeak = structuredClone(compiled);
chainLeak.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV27Build(chainLeak).some(error => /hash mismatch/.test(error)));
const headLeak = structuredClone(compiled);
headLeak.custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceCustodyManifestV27Build(headLeak).some(error => /custody head mismatch/.test(error)));

console.log('Preference custody laboratory floor v27 integration tests: PASS');
