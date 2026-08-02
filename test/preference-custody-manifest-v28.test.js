import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV28,
  validatePreferenceCustodyManifestV28Build
} from '../tools/lib/preference-custody-manifest-v28.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v28.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v28.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v28.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v28.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV28(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV28Build(compiled), []);
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v28-build@1');
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v28');
assert.equal(compiled.status, 'laboratory_floor_v28_qualified');
assert.equal(compiled.control_issue, 799);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.control_count, 30);
assert.deepEqual(compiled.controls.map(control => control.control_id).sort(), Array.from({ length: 30 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`).sort());

assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v27');
assert.equal(compiled.composition.base_control_count, 29);
assert.equal(compiled.composition.extension_control_id, 'PC-30');
assert.equal(compiled.composition.base_promotion_requirement_count, 820);
assert.equal(compiled.composition.added_promotion_requirement_count, 69);
assert.equal(compiled.composition.final_promotion_requirement_count, 889);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);

for (const [key, value] of Object.entries(compiled.control_integrity)) assert.equal(value, true, `control integrity ${key} must remain true`);
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.ok(compiled.promotion_boundary.real_case_requires.includes('market_service_declared_market_identity_boundary_version_and_denominator'));
assert.ok(compiled.promotion_boundary.real_case_requires.includes('market_service_market_capacity_price_access_denominator_quality_lineage_consequence_and_interpretation_chain_history'));
assert.equal(new Set(compiled.promotion_boundary.real_case_requires).size, compiled.promotion_boundary.real_case_requires.length);

assert.ok(!compiled.open_frontiers.includes('market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance'));
assert.ok(compiled.open_frontiers.includes('service_denominator_unserved_population_queue_rationing_denial_and_completion_reconciliation_governance'));
assert.ok(compiled.open_frontiers.includes('price_availability_affordability_access_quality_provider_mix_and_market_lineage_assurance'));
assert.ok(compiled.open_frontiers.includes('strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance'));
assert.ok(compiled.open_frontiers.includes('identity_resolution_entity_boundary_and_network_frame_assurance'));
assert.ok(compiled.open_frontiers.includes('edge_ascertainment_multiplex_temporal_reconstruction_and_path_validity_governance'));

const pc30 = compiled.controls.find(control => control.control_id === 'PC-30');
assert.ok(pc30);
assert.equal(pc30.fixture_id, 'same-market-service-verified-status-different-operational-states-v1');
assert.equal(pc30.failure_class, 'market_counterfactual_capacity_price_access_quality_service_denominator_and_lineage_equifinality');
assert.equal(pc30.graph_effect, 'none');
assert.equal(pc30.counts_toward_thesis_evidence, false);
assert.equal(pc30.conclusion_generated, false);
assert.equal(pc30.real_world_effect_claimed, false);
assert.equal(pc30.preference_change_present, false);
assert.equal(pc30.manipulative_intent_inferable, false);

const expectedProof = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_market_service_governance_signatures: 8,
  complete_market_service_assurance_worlds: 1,
  market_boundary_counterfactual_failure_worlds: 1,
  capacity_queue_rationing_denial_failure_worlds: 1,
  price_availability_affordability_failure_worlds: 1,
  access_exclusion_failure_worlds: 1,
  service_denominator_failure_worlds: 1,
  quality_version_provider_selection_failure_worlds: 1,
  stale_market_lineage_failure_worlds: 1,
  market_counterfactual_complete_worlds: 7,
  capacity_flow_complete_worlds: 7,
  price_affordability_complete_worlds: 7,
  access_coverage_complete_worlds: 7,
  service_denominator_complete_worlds: 7,
  quality_measurement_complete_worlds: 7,
  current_market_lineage_complete_worlds: 7,
  monitoring_correction_complete_worlds: 8,
  total_counterfactual_unavailable_unit_count: 100,
  total_omitted_market_count: 2,
  total_cross_market_contaminated_unit_count: 100,
  total_capacity_constrained_unit_count: 60,
  total_queued_unit_count: 40,
  total_rationed_unit_count: 30,
  total_capacity_denied_unit_count: 20,
  total_unmet_need_unit_count: 30,
  total_price_exposed_unit_count: 60,
  total_availability_shifted_unit_count: 30,
  total_affordability_shifted_unit_count: 40,
  total_demand_shifted_unit_count: 40,
  total_uptake_shifted_unit_count: 30,
  total_access_limited_unit_count: 50,
  total_geographic_temporal_excluded_unit_count: 60,
  total_language_excluded_unit_count: 20,
  total_disability_excluded_unit_count: 15,
  total_digital_excluded_unit_count: 25,
  total_documentation_excluded_unit_count: 10,
  total_administrative_burden_excluded_unit_count: 20,
  total_service_denominator_excluded_unit_count: 40,
  total_unserved_unit_count: 60,
  total_service_denied_unit_count: 30,
  total_abandoned_unit_count: 10,
  total_deferred_unit_count: 5,
  total_referred_pending_unit_count: 5,
  total_quality_degraded_unit_count: 40,
  total_version_shifted_unit_count: 40,
  total_provider_mix_selected_unit_count: 40,
  total_cream_skimming_unit_count: 30,
  total_survivor_only_unit_count: 40,
  total_stale_market_assurance_decision_count: 100,
  total_unsupported_market_assurance_decisions: 700,
  binding_public_authority_worlds: 0
};
assert.deepEqual(Object.fromEntries(Object.keys(expectedProof).map(key => [key, pc30.proof_summary[key]])), expectedProof);
for (const key of [
  'declared_market_boundary_identifies_operational_system_boundary',
  'observed_untreated_units_identify_valid_untreated_market_counterfactual',
  'published_capacity_coverage_identifies_staffed_available_usable_unconstrained_capacity',
  'completed_services_identify_complete_service_population',
  'zero_published_denial_rate_identifies_zero_true_denial',
  'zero_published_price_change_identifies_zero_affordability_or_availability_change',
  'nominal_channel_availability_identifies_usable_access',
  'published_access_coverage_identifies_complete_population_access',
  'published_service_records_identify_complete_service_denominator',
  'aggregate_quality_identifies_stable_version_dose_provider_and_case_mix',
  'stable_quality_score_identifies_absence_of_selection_or_deterioration',
  'historical_market_assurance_identifies_current_market_service_assurance',
  'public_market_service_verified_status_identifies_complete_current_counterfactual_capacity_price_access_denominator_quality_correctable_authorized_evidence',
  'market_service_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported','manipulative_intent_inferable','real_world_effect_claimed'
]) assert.equal(pc30.proof_summary[key], false);
assert.equal(pc30.proof_summary.complete_market_service_assurance_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v27_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc30_market_counterfactual_capacity_price_access_service_denominator_quality_and_lineage_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'market_service_assurance_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'market_service_assurance_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain[4].event_type, 'interpretation_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v28/);
assert.match(markdown, /Controls:\*\* 30/);
assert.match(markdown, /PC-30: market counterfactual, capacity, price, access, quality, and service-denominator custody/);
assert.match(markdown, /total_unsupported_market_assurance_decisions: 700/);
assert.doesNotMatch(markdown, /named provider failed|actual discrimination|publicly authorized/i);

const manifestMutations = [
  ['graph', m => { m.graph_effect = 'asserted'; }, /graph_effect/],
  ['issue', m => { m.control_issue = 798; }, /control issue/],
  ['base count', m => { m.base_floor.expected_control_count = 28; }, /base floor contract/],
  ['control', m => { m.extension_control.control_id = 'PC-31'; }, /extension control/],
  ['frontier', m => { m.frontier_transition.resolved_base_frontier = 'wrong_frontier'; }, /resolved frontier/],
  ['successor', m => { m.frontier_transition.successor_frontiers.pop(); }, /successor frontiers/],
  ['requirements', m => { m.real_case_requirements_added.pop(); }, /sixty-nine/],
  ['requirement format', m => { m.real_case_requirements_added[0] = 'Not-Machine-Addressable'; }, /lowercase underscore/],
  ['interpretation', m => { m.interpretation_contract.copy_ready_caveat = ''; }, /interpretation contract/]
];
for (const [label, mutate, pattern] of manifestMutations) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  assert.ok(validatePreferenceCustodyManifestV28(candidate).some(error => pattern.test(error)), label);
}

const buildCountLeak = structuredClone(compiled);
buildCountLeak.control_count = 29;
assert.ok(validatePreferenceCustodyManifestV28Build(buildCountLeak).some(error => /thirty controls/.test(error)));
const proofLeak = structuredClone(compiled);
proofLeak.controls.find(control => control.control_id === 'PC-30').proof_summary.total_access_limited_unit_count = 49;
assert.ok(validatePreferenceCustodyManifestV28Build(proofLeak).some(error => /PC-30 total_access_limited_unit_count/.test(error)));
const integrityLeak = structuredClone(compiled);
integrityLeak.control_integrity.base_integrity_preserved = false;
assert.ok(validatePreferenceCustodyManifestV28Build(integrityLeak).some(error => /base_integrity_preserved/.test(error)));
const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('market_counterfactual_capacity_price_access_quality_and_service_denominator_assurance');
assert.ok(validatePreferenceCustodyManifestV28Build(resolvedFrontierLeak).some(error => /resolved broad market-service frontier/.test(error)));
const successorLeak = structuredClone(compiled);
successorLeak.open_frontiers = successorLeak.open_frontiers.filter(frontier => frontier !== 'service_denominator_unserved_population_queue_rationing_denial_and_completion_reconciliation_governance');
assert.ok(validatePreferenceCustodyManifestV28Build(successorLeak).some(error => /successor frontier missing/.test(error)));
const strategicLeak = structuredClone(compiled);
strategicLeak.open_frontiers = strategicLeak.open_frontiers.filter(frontier => frontier !== 'strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance');
assert.ok(validatePreferenceCustodyManifestV28Build(strategicLeak).some(error => /independent strategic-equilibrium frontier/.test(error)));
const authorityLeak = structuredClone(compiled);
authorityLeak.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV28Build(authorityLeak).some(error => /must remain false/.test(error)));
const chainLeak = structuredClone(compiled);
chainLeak.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV28Build(chainLeak).some(error => /hash mismatch/.test(error)));
const headLeak = structuredClone(compiled);
headLeak.custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceCustodyManifestV28Build(headLeak).some(error => /custody head mismatch/.test(error)));

console.log(`Preference custody laboratory floor v28 integration tests: PASS (${manifestMutations.length + 9} adversarial mutations)`);
