import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceEquilibriumAssuranceFixture,
  validatePreferenceEquilibriumAssuranceFixture,
  validatePreferenceEquilibriumAssuranceBuild
} from '../tools/lib/preference-equilibrium-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-equilibrium-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/equilibrium-assurance.fixture.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-equilibrium-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-equilibrium-assurance.md', 'utf8');

assert.deepEqual(validatePreferenceEquilibriumAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceEquilibriumAssuranceBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-equilibrium-adjusted-status-different-system-states-v1');
assert.equal(compiled.schema_version, 'preference-equilibrium-assurance-build@1');
assert.equal(compiled.status, 'saturation_general_equilibrium_and_interference_robust_policy_assurance_qualified');
assert.equal(compiled.issue, 781);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.worlds.length, 8);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.equilibrium_governance_signature_sha256)).size, 8);

const expectedMetrics = {
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
assert.deepEqual(compiled.metrics, expectedMetrics);

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
  'real_world_effect_claimed',
  'preference_change_present'
]) assert.equal(compiled.classification[key], false, `${key} must remain false`);
assert.equal(compiled.classification.complete_equilibrium_assurance_supported_in_at_least_one_world, true);

const byId = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = byId['complete-market-counterfactual-capacity-price-substitution-welfare-replication-current-lineage'];
assert.equal(positive.flags.complete_equilibrium_assurance, true);
assert.equal(byId['universal-saturation-without-system-counterfactual'].flags.universal_saturation_no_counterfactual_present, true);
assert.equal(byId['universal-saturation-without-system-counterfactual'].market.saturated_unit_count, 100);
assert.equal(byId['capacity-queues-rationing-denial-and-quality-deterioration'].flags.capacity_queue_rationing_quality_present, true);
assert.equal(byId['capacity-queues-rationing-denial-and-quality-deterioration'].capacity.queued_unit_count, 40);
assert.equal(byId['price-availability-affordability-and-demand-feedback'].flags.price_availability_feedback_present, true);
assert.equal(byId['price-availability-affordability-and-demand-feedback'].price.price_exposed_unit_count, 60);
assert.equal(byId['strategic-anticipation-gaming-compliance-and-provider-response'].flags.strategic_anticipation_gaming_provider_response_present, true);
assert.equal(byId['strategic-anticipation-gaming-compliance-and-provider-response'].strategic_response.provider_response_unit_count, 40);
assert.equal(byId['substitution-displacement-crowd-out-rebound-and-harm-transfer'].flags.substitution_displacement_harm_transfer_present, true);
assert.equal(byId['substitution-displacement-crowd-out-rebound-and-harm-transfer'].substitution.harm_shifted_unit_count, 40);
assert.equal(byId['multiple-equilibria-path-dependent-favorable-selection-and-unpublished-welfare-weights'].flags.multiple_equilibria_path_selection_present, true);
assert.equal(byId['multiple-equilibria-path-dependent-favorable-selection-and-unpublished-welfare-weights'].equilibrium.path_dependent_unit_count, 60);
assert.equal(byId['pilot-partial-equilibrium-extrapolated-after-scale-and-system-succession'].flags.stale_scale_succession_present, true);
assert.equal(byId['pilot-partial-equilibrium-extrapolated-after-scale-and-system-succession'].lineage.stale_scale_decision_count, 100);

for (const world of compiled.worlds) {
  assert.equal(world.custody_chain.length, 10);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.equilibrium_governance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}
assert.equal(positive.custody_chain[0].event_type, 'equilibrium_publication_surface_frozen');
assert.equal(positive.custody_chain[4].event_type, 'strategic_anticipation_gaming_compliance_and_provider_response_state');
assert.equal(positive.custody_chain[6].event_type, 'equilibrium_multiplicity_path_selection_and_welfare_incidence_state');
assert.equal(positive.custody_chain[9].event_type, 'equilibrium_governance_mechanism_classified');

assert.match(markdown, /Saturation, general-equilibrium, and interference-robust policy custody/);
assert.match(markdown, /Worlds:\*\* 8/);
assert.match(markdown, /total_unsupported_equilibrium_decisions: 700/);
assert.match(markdown, /multiple-equilibria-path-dependent-favorable-selection/);
assert.doesNotMatch(markdown, /named policy caused|actual manipulation|publicly authorized/i);

const fixtureMutations = [
  ['graph effect', f => { f.graph_effect = 'actor_graph'; }, /graph effect/],
  ['thesis evidence', f => { f.counts_toward_thesis_evidence = true; }, /must remain false/],
  ['baseline drift', f => { f.baseline.reported_welfare_gain = 0.16; }, /baseline contract mismatch/],
  ['duplicate world', f => { f.worlds[7].world_id = f.worlds[6].world_id; }, /eight required|unique/],
  ['public status drift', f => { f.world_defaults.public_claim.public_equilibrium_status = 'validated'; }, /frozen equilibrium-publication surface/],
  ['market denominator', f => { f.worlds[1].overrides.market.untreated_market_count = 1; }, /market counts must reconcile/],
  ['unit denominator', f => { f.worlds[1].overrides.market.untreated_unit_count = 1; }, /unit counts must reconcile/],
  ['capacity flow', f => { f.worlds[2].overrides.capacity.utilized_capacity_units = 61; }, /stock, flow, and completion counts must reconcile/],
  ['published price', f => { f.worlds[3].overrides.price.published_price_change = 0.1; }, /published price change must remain zero/],
  ['announcement order', f => { f.world_defaults.strategic_response.policy_announcement_time = 10; }, /announcement must precede treatment/],
  ['equilibrium solution', f => { f.worlds[6].overrides.equilibrium.solved_equilibrium_count = 6; }, /equilibrium solution and initialization counts must reconcile/],
  ['welfare incidence', f => { f.worlds[6].overrides.welfare.neutral_unit_count = 0; }, /welfare incidence counts must reconcile/],
  ['replication denominator', f => { f.worlds[7].overrides.replication.independent_replication_count = 3; }, /cannot exceed/],
  ['authority', f => { f.worlds[0].overrides.governance = { binding_public_authority: true }; }, /binding public authority/],
  ['omitted refusal rule', f => { f.required_refusal_rules.pop(); }, /required refusal rule/],
  ['false classification', f => { f.expected_classification.one_solved_equilibrium_identifies_unique_policy_relevant_equilibrium = true; }, /must remain false/]
];
for (const [label, mutate, pattern] of fixtureMutations) {
  const candidate = structuredClone(fixture);
  mutate(candidate);
  assert.ok(validatePreferenceEquilibriumAssuranceFixture(candidate).some(error => pattern.test(error)), label);
}

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds[1].expected_flags.market_counterfactual_complete = true;
assert.throws(() => compilePreferenceEquilibriumAssuranceFixture(expectedFlagLeak), /flag market_counterfactual_complete mismatch/);

const metricLeak = structuredClone(compiled);
metricLeak.metrics.total_saturated_unit_count = 99;
assert.ok(validatePreferenceEquilibriumAssuranceBuild(metricLeak).some(error => /total_saturated_unit_count/.test(error)));
const buildAuthorityLeak = structuredClone(compiled);
buildAuthorityLeak.classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceEquilibriumAssuranceBuild(buildAuthorityLeak).some(error => /must remain false/.test(error)));
const chainLeak = structuredClone(compiled);
chainLeak.worlds[0].custody_chain[4].payload.strategic_response.gaming_unit_count = 1;
assert.ok(validatePreferenceEquilibriumAssuranceBuild(chainLeak).some(error => /hash mismatch/.test(error)));
const custodyHeadLeak = structuredClone(compiled);
custodyHeadLeak.worlds[0].custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceEquilibriumAssuranceBuild(custodyHeadLeak).some(error => /custody head mismatch/.test(error)));
const signatureLeak = structuredClone(compiled);
signatureLeak.worlds[0].equilibrium_governance_signature_sha256 = 'invalid';
assert.ok(validatePreferenceEquilibriumAssuranceBuild(signatureLeak).some(error => /signature is invalid/.test(error)));
const missingWorldLeak = structuredClone(compiled);
missingWorldLeak.worlds.pop();
assert.ok(validatePreferenceEquilibriumAssuranceBuild(missingWorldLeak).some(error => /worlds are incomplete/.test(error)));

console.log('Preference equilibrium assurance adversarial tests: PASS');
