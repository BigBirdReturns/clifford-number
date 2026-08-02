import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceAllocationFormulaFixture,
  renderPreferenceAllocationFormulaMarkdown,
  simulatePreferenceAllocationFormulaWorld,
  validatePreferenceAllocationFormulaBuild,
  validatePreferenceAllocationFormulaChain,
  validatePreferenceAllocationFormulaFixture
} from '../tools/lib/preference-allocation-formula.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/allocation-formula.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceAllocationFormulaFixture(fixture), []);
const compiled = compilePreferenceAllocationFormulaFixture(fixture);
assert.deepEqual(validatePreferenceAllocationFormulaBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-fair-allocation-status-different-formula-governance-v1');
assert.equal(compiled.status, 'allocation_formula_governance_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_formula_governance_signatures: 8,
  complete_reference_allocation_worlds: 1,
  harm_undercompensation_worlds: 7,
  per_capita_equality_worlds: 1,
  access_barrier_shortfall_worlds: 6,
  proxy_failure_worlds: 1,
  opaque_lineage_worlds: 1,
  threshold_cliff_worlds: 1,
  feedback_loop_worlds: 1,
  gaming_risk_worlds: 1,
  version_drift_worlds: 1,
  manual_override_worlds: 1,
  aggregate_audit_without_subgroup_validation_worlds: 1,
  subgroup_reference_match_worlds: 1,
  full_population_paid_worlds: 8,
  full_net_exhaustion_worlds: 8,
  explanation_and_correction_complete_worlds: 1,
  total_absolute_subgroup_allocation_error: 3500,
  total_access_barrier_shortfall: 1000,
  maximum_single_subgroup_shortfall: 330,
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  full_fund_exhaustion_identifies_reference_correct_allocation:false,
  payment_to_every_person_identifies_subgroup_adequacy:false,
  per_capita_equality_identifies_harm_responsive_fairness:false,
  feature_omission_identifies_absence_of_proxy_effects:false,
  approved_formula_identifies_executed_formula:false,
  model_transparency_label_identifies_model_data_checkpoint_lineage:false,
  aggregate_audit_identifies_subgroup_validation:false,
  stable_total_payout_identifies_stable_person_or_subgroup_outcomes:false,
  manual_override_identifies_correction:false,
  appeal_route_identifies_effective_explanation_or_correction:false,
  formula_disparity_identifies_unlawful_discrimination_or_misconduct:false,
  public_fairly_allocated_status_identifies_complete_valid_auditable_challengeable_authorized_allocation:false,
  complete_reference_allocation_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['predeclared-harm-responsive-audited-correctable-formula'];
assert.equal(positive.flags.complete_reference_allocation, true);
assert.equal(positive.flags.subgroup_reference_match, true);
assert.equal(positive.flags.explanation_and_correction_complete, true);
assert.equal(positive.absolute_subgroup_allocation_error, 0);
assert.equal(positive.access_barrier_shortfall, 0);
assert.equal(positive.formula.approved_formula_id, 'FORMULA-HARM-V1');
assert.equal(positive.formula.executed_formula_id, 'FORMULA-HARM-V1');

const uniform = worlds['uniform-per-capita-equality-harm-undercompensation'];
assert.equal(uniform.flags.per_capita_equality_present, true);
assert.equal(uniform.flags.harm_undercompensation_present, true);
assert.equal(uniform.flags.aggregate_audit_without_subgroup_validation_present, true);
assert.equal(uniform.absolute_subgroup_allocation_error, 1080);
assert.equal(uniform.maximum_subgroup_shortfall, 330);
assert.equal(uniform.subgroup_allocations.every(item => item.actual_amount / item.count === 18), true);

const proxy = worlds['convenience-proxy-suppresses-access-barrier-group'];
assert.equal(proxy.flags.proxy_failure_present, true);
assert.equal(proxy.access_barrier_shortfall, 240);
assert.equal(proxy.integrity.proxy_effect_state, 'material_unmitigated');

const opaque = worlds['opaque-model-score-hidden-training-checkpoint-lineage'];
assert.equal(opaque.flags.opaque_lineage_present, true);
assert.equal(opaque.formula.lineage_complete, false);
assert.equal(opaque.model.lineage_complete, false);
assert.equal(opaque.model.checkpoint_id, 'undisclosed');

const threshold = worlds['threshold-cliff-severe-within-population-discontinuity'];
assert.equal(threshold.flags.threshold_cliff_present, true);
assert.equal(threshold.thresholds.cliff_present, true);
assert.equal(threshold.flags.gaming_risk_present, false);

const feedback = worlds['prior-engagement-feedback-penalizes-lower-access-population'];
assert.equal(feedback.flags.feedback_loop_present, true);
assert.equal(feedback.flags.proxy_failure_present, false);
assert.equal(feedback.access_barrier_shortfall, 210);

const gaming = worlds['gameable-self-reported-score-without-integrity-controls'];
assert.equal(gaming.flags.gaming_risk_present, true);
assert.equal(gaming.integrity.adversarial_test_state, 'absent');
assert.equal(gaming.access_barrier_shortfall, 120);

const drift = worlds['approved-formula-replaced-by-drifted-version-and-undisclosed-overrides'];
assert.equal(drift.flags.version_drift_present, true);
assert.equal(drift.flags.manual_override_present, true);
assert.equal(drift.override_events.length, 2);
assert.equal(drift.override_events.every(event => event.disclosed === false), true);
assert.equal(drift.formula.approved_formula_id, 'FORMULA-HARM-V1');
assert.equal(drift.formula.executed_formula_id, 'FORMULA-HARM-V2-DRIFT');

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.formula_governance_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_allocation_status, 'fairly_allocated');
  assert.equal(world.public_claim.people_paid, 100);
  assert.equal(world.public_claim.amount_paid, 1800);
  assert.equal(world.full_population_paid, true);
  assert.equal(world.full_net_exhaustion, true);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.formula_governance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(validatePreferenceAllocationFormulaChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceAllocationFormulaWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'uniform-per-capita-equality-harm-undercompensation')
);
assert.equal(direct.flags.per_capita_equality_present, true);
assert.equal(direct.full_population_paid, true);
assert.equal(direct.full_net_exhaustion, true);

const markdown = renderPreferenceAllocationFormulaMarkdown(compiled);
assert.match(markdown, /Distribution formula, subgroup harm, and algorithmic allocation-governance custody/);
assert.match(markdown, /predeclared-harm-responsive-audited-correctable-formula/);
assert.match(markdown, /Complete reference allocation: true/);
assert.match(markdown, /uniform-per-capita-equality-harm-undercompensation/);
assert.match(markdown, /Per-capita equality: true/);
assert.match(markdown, /approved-formula-replaced-by-drifted-version-and-undisclosed-overrides/);
assert.match(markdown, /Version drift: true/);
assert.match(markdown, /total_absolute_subgroup_allocation_error: 3500/);
assert.doesNotMatch(markdown, /named model discriminated|actual program violated law|binding public authorization|manipulated claimants/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceAllocationFormulaFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceAllocationFormulaFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceAllocationFormulaFixture(missingWorld).some(error => /exactly the eight required allocation-formula worlds/.test(error)));

const baselineFundLeak = structuredClone(fixture);
baselineFundLeak.baseline.net_distributable_fund = 1799;
assert.ok(validatePreferenceAllocationFormulaFixture(baselineFundLeak).some(error => /net_distributable_fund must remain 1800|fund ledger does not reconcile|reference amounts must sum/.test(error)));

const groupCountLeak = structuredClone(fixture);
groupCountLeak.baseline.affected_groups[0].count = 59;
assert.ok(validatePreferenceAllocationFormulaFixture(groupCountLeak).some(error => /group counts must sum|reference per-capita amount does not reconcile/.test(error)));

const publicClaimLeak = structuredClone(fixture);
publicClaimLeak.worlds[0].public_claim.people_paid = 99;
assert.ok(validatePreferenceAllocationFormulaFixture(publicClaimLeak).some(error => /must preserve the frozen public allocation claim/.test(error)));

const allocationExhaustionLeak = structuredClone(fixture);
allocationExhaustionLeak.worlds[0].subgroup_allocations[0].actual_amount += 1;
assert.ok(validatePreferenceAllocationFormulaFixture(allocationExhaustionLeak).some(error => /must exhaust the net distributable fund/.test(error)));

const populationPaymentLeak = structuredClone(fixture);
populationPaymentLeak.worlds[0].subgroup_allocations[0].people_paid = 59;
assert.ok(validatePreferenceAllocationFormulaFixture(populationPaymentLeak).some(error => /must preserve payment to every person|payment counts must cover/.test(error)));

const featureIdentityLeak = structuredClone(fixture);
featureIdentityLeak.worlds[0].features.push(structuredClone(featureIdentityLeak.worlds[0].features[0]));
assert.ok(validatePreferenceAllocationFormulaFixture(featureIdentityLeak).some(error => /feature IDs must be unique/.test(error)));

const overrideGroupLeak = structuredClone(fixture);
overrideGroupLeak.worlds.find(world => world.world_id === 'approved-formula-replaced-by-drifted-version-and-undisclosed-overrides').override_events[0].to_group_id = 'MISSING';
assert.ok(validatePreferenceAllocationFormulaFixture(overrideGroupLeak).some(error => /invalid group custody/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].governance.binding_public_authority = true;
assert.ok(validatePreferenceAllocationFormulaFixture(authorityLeak).some(error => /binding_public_authority must remain false/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds.find(world => world.world_id === 'uniform-per-capita-equality-harm-undercompensation').expected_flags.per_capita_equality_present = false;
assert.throws(() => compilePreferenceAllocationFormulaFixture(expectedFlagLeak), /per_capita_equality_present mismatch/);

const falseProxyRepair = structuredClone(fixture);
falseProxyRepair.worlds.find(world => world.world_id === 'convenience-proxy-suppresses-access-barrier-group').integrity.proxy_effect_state = 'tested_clear';
assert.throws(() => compilePreferenceAllocationFormulaFixture(falseProxyRepair), /proxy_failure_present mismatch/);

const falseLineageRepair = structuredClone(fixture);
const opaqueWorld = falseLineageRepair.worlds.find(world => world.world_id === 'opaque-model-score-hidden-training-checkpoint-lineage');
opaqueWorld.formula.lineage_complete = true;
opaqueWorld.model.lineage_complete = true;
assert.throws(() => compilePreferenceAllocationFormulaFixture(falseLineageRepair), /opaque_lineage_present mismatch/);

const falseDriftRepair = structuredClone(fixture);
const driftWorld = falseDriftRepair.worlds.find(world => world.world_id === 'approved-formula-replaced-by-drifted-version-and-undisclosed-overrides');
driftWorld.formula.approved_formula_id = driftWorld.formula.executed_formula_id;
driftWorld.formula.approved_version = driftWorld.formula.executed_version;
assert.throws(() => compilePreferenceAllocationFormulaFixture(falseDriftRepair), /version_drift_present mismatch/);

const equalityInferenceLeak = structuredClone(fixture);
equalityInferenceLeak.expected_classification.per_capita_equality_identifies_harm_responsive_fairness = true;
assert.ok(validatePreferenceAllocationFormulaFixture(equalityInferenceLeak).some(error => /per_capita_equality_identifies_harm_responsive_fairness/.test(error)));

const legalityInferenceLeak = structuredClone(fixture);
legalityInferenceLeak.expected_classification.formula_disparity_identifies_unlawful_discrimination_or_misconduct = true;
assert.ok(validatePreferenceAllocationFormulaFixture(legalityInferenceLeak).some(error => /formula_disparity_identifies_unlawful_discrimination_or_misconduct/.test(error)));

const tamperedBuild = structuredClone(compiled);
const tamperedWorld = tamperedBuild.worlds.find(world => world.world_id === 'predeclared-harm-responsive-audited-correctable-formula');
tamperedWorld.custody_chain[3].payload.subgroup_allocations[0].actual_amount = 999;
assert.ok(validatePreferenceAllocationFormulaBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_reference_allocation_worlds = 2;
assert.ok(validatePreferenceAllocationFormulaBuild(metricInflation).some(error => /complete_reference_allocation_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceAllocationFormulaFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-allocation-formula.test.js: OK');
