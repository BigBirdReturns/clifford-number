import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceMarketServiceAssuranceFixture,
  renderPreferenceMarketServiceAssuranceMarkdown,
  validatePreferenceMarketServiceAssuranceBuild,
  validatePreferenceMarketServiceAssuranceChain,
  validatePreferenceMarketServiceAssuranceFixture
} from '../tools/lib/preference-market-service-assurance.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/market-service-assurance.fixture.json', 'utf8'));
const compiled = compilePreferenceMarketServiceAssuranceFixture(fixture);
const markdown = renderPreferenceMarketServiceAssuranceMarkdown(compiled);
assert.deepEqual(validatePreferenceMarketServiceAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceMarketServiceAssuranceBuild(compiled), []);

const expectedMetrics = {
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
assert.deepEqual(compiled.metrics, expectedMetrics);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.preference_change_present, false);
assert.equal(compiled.manipulative_intent_inferable, false);
assert.equal(compiled.real_world_effect_claimed, false);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.market_service_governance_signature_sha256)).size, 8);

for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_market_assurance_status, 'market_service_verified');
  assert.equal(world.public_claim.published_capacity_coverage, 1);
  assert.equal(world.public_claim.published_access_coverage, 1);
  assert.equal(world.public_claim.published_denial_rate, 0);
  assert.equal(world.public_claim.published_price_change, 0);
  assert.equal(world.public_claim.published_quality_score, 0.9);
  assert.equal(world.governance.binding_public_authority, false);
  assert.deepEqual(validatePreferenceMarketServiceAssuranceChain(world.custody_chain), []);
  assert.equal(world.custody_chain.length, 10);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
}

const positive = compiled.worlds.find(world => world.flags.complete_market_service_assurance);
assert.ok(positive);
for (const key of [
  'market_counterfactual_complete','capacity_flow_complete','price_affordability_complete',
  'access_coverage_complete','service_denominator_complete','quality_measurement_complete',
  'current_market_lineage_complete','monitoring_correction_complete'
]) assert.equal(positive.flags[key], true);

const failureFlagByWorld = new Map([
  ['boundary-truncation-omitted-markets-and-cross-market-counterfactual-contamination','market_boundary_counterfactual_failure_present'],
  ['capacity-stock-flow-mismatch-queues-rationing-denial-and-unmet-need','capacity_queue_rationing_denial_failure_present'],
  ['price-availability-affordability-demand-and-uptake-feedback','price_availability_affordability_failure_present'],
  ['nominal-access-coverage-with-geographic-temporal-language-disability-digital-and-administrative-exclusion','access_exclusion_failure_present'],
  ['completion-only-publication-excluding-attempted-denied-abandoned-deferred-referred-and-unserved-units','service_denominator_failure_present'],
  ['aggregate-quality-preserved-by-version-provider-severity-cream-skimming-and-survivor-selection','quality_version_provider_selection_failure_present'],
  ['historical-market-assurance-inherited-after-supplier-service-price-capacity-access-policy-workflow-population-and-scale-succession','stale_market_lineage_failure_present']
]);
for (const [worldId, flag] of failureFlagByWorld) {
  const world = compiled.worlds.find(candidate => candidate.world_id === worldId);
  assert.ok(world, worldId);
  assert.equal(world.flags.complete_market_service_assurance, false);
  assert.equal(world.flags[flag], true);
  assert.equal(world.governance.unsupported_market_assurance_decision_count, 100);
}

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
]) assert.equal(compiled.classification[key], false);
assert.equal(compiled.classification.complete_market_service_assurance_supported_in_at_least_one_world, true);

assert.match(markdown, /Preference Custody PC-30/);
assert.match(markdown, /total_unsupported_market_assurance_decisions: 700/);
assert.match(markdown, /market_service_verified/);
assert.doesNotMatch(markdown, /named provider failed|actual discrimination|publicly authorized/i);

const fixtureMutations = [
  ['schema', c => { c.schema_version = 'wrong'; }, /identity or schema/],
  ['issue', c => { c.issue = 798; }, /issue lineage/],
  ['graph', c => { c.graph_effect = 'asserted'; }, /status or graph/],
  ['evidence', c => { c.counts_toward_thesis_evidence = true; }, /must remain false/],
  ['baseline', c => { c.baseline.published_denial_rate = 0.1; }, /baseline contract/],
  ['world removed', c => { c.worlds.pop(); }, /eight required worlds/],
  ['duplicate world', c => { c.worlds[1].world_id = c.worlds[0].world_id; }, /eight required worlds|unique/],
  ['rule', c => { c.required_refusal_rules.pop(); }, /refusal rule/],
  ['classification', c => { c.expected_classification.binding_public_authority_supported = true; }, /must remain false/],
  ['public drift', c => { c.world_defaults.public_claim.published_quality_score = 0.8; }, /frozen market-service publication surface/],
  ['market reconciliation', c => { c.world_defaults.market.operational_market_count = 11; }, /omitted markets/],
  ['capacity stock', c => { c.world_defaults.capacity.utilized_capacity_units = 121; }, /capacity stock/],
  ['access channels', c => { c.world_defaults.access.usable_channel_count = 6; }, /usable channels/],
  ['service attempt', c => { c.world_defaults.service_denominator.attempted_unit_count = 99; }, /attempted and no-attempt/],
  ['service statuses', c => { c.world_defaults.service_denominator.denied_unit_count = 1; }, /statuses must reconcile/],
  ['quality', c => { c.world_defaults.quality.published_quality_score = 1.1; }, /quality/],
  ['lineage', c => { c.world_defaults.lineage.current_market_lineage = 'yes'; }, /must be boolean/],
  ['authority', c => { c.world_defaults.governance.binding_public_authority = true; }, /binding public authority/],
  ['flags', c => { delete c.worlds[0].expected_flags.capacity_flow_complete; }, /expected flags/],
  ['interpretation', c => { c.interpretation_contract.copy_ready_caveat = ''; }, /interpretation contract/]
];
for (const [label, mutate, pattern] of fixtureMutations) {
  const candidate = structuredClone(fixture);
  mutate(candidate);
  assert.ok(validatePreferenceMarketServiceAssuranceFixture(candidate).some(error => pattern.test(error)), label);
}

const buildMetricLeak = structuredClone(compiled);
buildMetricLeak.metrics.total_access_limited_unit_count = 49;
assert.ok(validatePreferenceMarketServiceAssuranceBuild(buildMetricLeak).some(error => /total_access_limited_unit_count/.test(error)));
const buildAuthorityLeak = structuredClone(compiled);
buildAuthorityLeak.worlds[0].governance.binding_public_authority = true;
assert.ok(validatePreferenceMarketServiceAssuranceBuild(buildAuthorityLeak).some(error => /binding authority/.test(error)));
const buildClassificationLeak = structuredClone(compiled);
buildClassificationLeak.classification.real_world_effect_claimed = true;
assert.ok(validatePreferenceMarketServiceAssuranceBuild(buildClassificationLeak).some(error => /real_world_effect_claimed/.test(error)));
const chainLeak = structuredClone(compiled);
chainLeak.worlds[0].custody_chain[4].payload.access.access_limited_unit_count = 1;
assert.ok(validatePreferenceMarketServiceAssuranceBuild(chainLeak).some(error => /custody chain invalid/.test(error)));
const headLeak = structuredClone(compiled);
headLeak.worlds[0].custody_chain_head_sha256 = '0'.repeat(64);
assert.ok(validatePreferenceMarketServiceAssuranceBuild(headLeak).some(error => /custody head mismatch/.test(error)));

console.log(`Preference market-service assurance tests: PASS (${fixtureMutations.length + 5} adversarial mutations)`);
