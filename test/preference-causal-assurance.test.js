import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceCausalAssuranceFixture,
  renderPreferenceCausalAssuranceMarkdown,
  simulatePreferenceCausalAssuranceWorld,
  validatePreferenceCausalAssuranceBuild,
  validatePreferenceCausalAssuranceChain,
  validatePreferenceCausalAssuranceFixture
} from '../tools/lib/preference-causal-assurance.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/causal-assurance.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceCausalAssuranceFixture(fixture), []);
const compiled = compilePreferenceCausalAssuranceFixture(fixture);
assert.deepEqual(validatePreferenceCausalAssuranceBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-causal-validation-status-different-identification-paths-v1');
assert.equal(compiled.status, 'criterion_temporal_causality_feedback_and_post_treatment_bias_qualified');
assert.equal(compiled.issue, 740);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_causal_governance_signatures: 8,
  complete_causal_identification_worlds: 1,
  post_treatment_bias_worlds: 1,
  collider_selection_worlds: 1,
  interference_spillover_worlds: 1,
  historical_control_drift_worlds: 1,
  regression_to_mean_worlds: 1,
  adaptive_feedback_selective_label_worlds: 1,
  version_pooling_drift_worlds: 1,
  randomized_assignment_complete_worlds: 5,
  temporal_order_complete_worlds: 7,
  complete_followup_observed_worlds: 6,
  no_selection_bias_complete_worlds: 6,
  no_interference_complete_worlds: 7,
  concurrent_comparator_complete_worlds: 7,
  baseline_regression_control_complete_worlds: 7,
  adaptive_logging_complete_worlds: 7,
  current_experiment_lineage_complete_worlds: 7,
  independent_replication_complete_worlds: 8,
  published_effect_matches_reference_worlds: 1,
  same_public_causal_surface_worlds: 8,
  total_post_treatment_conditioned_count: 100,
  total_collider_conditioned_count: 40,
  total_control_exposed_count: 30,
  total_historical_calendar_offset_days: 365,
  total_regression_to_mean_count: 50,
  total_selective_label_count: 40,
  total_policy_feedback_count: 200,
  total_pooled_successor_decision_count: 60,
  total_imputed_outcome_count: 80,
  total_unsupported_causal_decisions: 700,
  binding_public_authority_worlds: 0
});

for (const [key,value] of Object.entries({
  score_outcome_association_identifies_causal_effect:false,
  post_treatment_criterion_identifies_pre_treatment_outcome:false,
  published_denominator_identifies_complete_observed_followup:false,
  conditioned_observed_set_identifies_unselected_outcome_population:false,
  nominal_control_group_identifies_unexposed_control_under_interference:false,
  historical_control_identifies_concurrent_counterfactual:false,
  extreme_baseline_improvement_identifies_treatment_effect:false,
  adaptive_policy_agreement_identifies_unbiased_effect_without_exploration_logging:false,
  observed_labels_identify_representative_outcomes_under_feedback:false,
  pooled_estimate_identifies_current_validation_after_system_succession:false,
  narrow_interval_low_p_value_identifies_valid_causal_identification:false,
  replication_count_identifies_independent_replication_of_same_estimand_design:false,
  public_causally_validated_status_identifies_temporally_ordered_unselected_interference_aware_current_correctable_authorized_evidence:false,
  causal_design_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent:false,
  complete_causal_identification_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key],value);

const worlds = Object.fromEntries(compiled.worlds.map(world=>[world.world_id,world]));
const positive = worlds['randomized-predecision-complete-interference-free-current'];
assert.equal(positive.flags.complete_causal_identification_path,true);
assert.equal(positive.flags.randomized_assignment_complete,true);
assert.equal(positive.flags.temporal_order_complete,true);
assert.equal(positive.flags.complete_followup_observed,true);
assert.equal(positive.flags.no_selection_bias_complete,true);
assert.equal(positive.flags.no_interference_complete,true);
assert.equal(positive.flags.current_experiment_lineage_complete,true);
assert.equal(positive.flags.published_effect_matches_independent_reference,true);

const post = worlds['post-treatment-mediator-used-as-criterion'];
assert.equal(post.flags.post_treatment_bias_present,true);
assert.equal(post.flags.temporal_order_complete,false);
assert.equal(post.temporal.post_treatment_conditioned_count,100);
assert.equal(post.temporal.decision_feedback_count,100);
assert.equal(post.estimation.independent_reference_effect,0.05);

const collider = worlds['collider-selected-outcome-population'];
assert.equal(collider.flags.collider_selection_present,true);
assert.equal(collider.flags.complete_followup_observed,false);
assert.equal(collider.flags.no_selection_bias_complete,false);
assert.equal(collider.observation.observed_count,60);
assert.equal(collider.observation.imputed_count,40);
assert.equal(collider.observation.collider_conditioned_count,40);

const interference = worlds['control-spillover-and-network-interference'];
assert.equal(interference.flags.interference_spillover_present,true);
assert.equal(interference.flags.no_interference_complete,false);
assert.equal(interference.interference.control_exposed_count,30);
assert.equal(interference.interference.spillover_count,30);
assert.equal(interference.interference.stable_unit_assumption,false);

const historical = worlds['historical-control-with-time-policy-population-drift'];
assert.equal(historical.flags.historical_control_drift_present,true);
assert.equal(historical.flags.concurrent_comparator_complete,false);
assert.equal(historical.comparator.calendar_offset_days,365);
assert.equal(historical.assignment.randomized,false);

const regression = worlds['high-risk-selection-regression-to-mean'];
assert.equal(regression.flags.regression_to_mean_present,true);
assert.equal(regression.flags.baseline_regression_control_complete,false);
assert.equal(regression.baseline_selection.selected_high_risk_count,50);
assert.equal(regression.baseline_selection.regression_to_mean_count,50);
assert.equal(regression.estimation.independent_reference_effect,0);

const adaptive = worlds['adaptive-policy-selective-label-feedback'];
assert.equal(adaptive.flags.adaptive_feedback_selective_labels_present,true);
assert.equal(adaptive.flags.adaptive_logging_complete,false);
assert.equal(adaptive.flags.complete_followup_observed,false);
assert.equal(adaptive.adaptive.exploration_probability,0);
assert.equal(adaptive.adaptive.propensity_logged,false);
assert.equal(adaptive.adaptive.selective_label_count,40);
assert.equal(adaptive.adaptive.policy_feedback_count,100);

const version = worlds['pooled-estimate-across-system-version-succession'];
assert.equal(version.flags.version_pooling_drift_present,true);
assert.equal(version.flags.current_experiment_lineage_complete,false);
assert.equal(version.lineage.executed_model_version,'model-v2');
assert.equal(version.lineage.executed_threshold,0.6);
assert.equal(version.lineage.pooled_successor_decision_count,60);

assert.equal(new Set(compiled.worlds.map(world=>world.public_status_signature_sha256)).size,1);
assert.equal(new Set(compiled.worlds.map(world=>world.causal_governance_signature_sha256)).size,8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_causal_status,'causally_validated');
  assert.equal(world.public_claim.reported_average_effect,0.2);
  assert.equal(world.public_claim.published_ci_low,0.12);
  assert.equal(world.public_claim.published_ci_high,0.28);
  assert.equal(world.public_claim.published_p_value,0.01);
  assert.equal(world.public_claim.published_replication_count,2);
  assert.deepEqual(validatePreferenceCausalAssuranceChain(world.custody_chain),[]);
  assert.equal(world.custody_chain.at(-1).event_sha256,world.custody_chain_head_sha256);
}

const direct = simulatePreferenceCausalAssuranceWorld(fixture,fixture.worlds.find(world=>world.world_id==='adaptive-policy-selective-label-feedback'));
assert.equal(direct.flags.adaptive_feedback_selective_labels_present,true);
assert.equal(direct.unsupported_causal_decision_count,100);

const markdown = renderPreferenceCausalAssuranceMarkdown(compiled);
assert.match(markdown,/Criterion temporal causality, feedback, and post-treatment-bias custody/);
assert.match(markdown,/Reported effect: 20\.00%/);
assert.match(markdown,/randomized-predecision-complete-interference-free-current/);
assert.match(markdown,/Complete causal-identification path: true/);
assert.match(markdown,/Collider-conditioned records: 40/);
assert.match(markdown,/Control spillover exposure: 30/);
assert.match(markdown,/Historical offset days: 365/);
assert.match(markdown,/Regression-to-mean cases: 50/);
assert.match(markdown,/Selective labels: 40/);
assert.match(markdown,/Pooled successor decisions: 60/);
assert.doesNotMatch(markdown,/named policy caused|publicly authorized|actual manipulation or discrimination/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect='asserted';
assert.ok(validatePreferenceCausalAssuranceFixture(graphLeak).some(error=>/graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence=true;
assert.ok(validatePreferenceCausalAssuranceFixture(thesisLeak).some(error=>/counts_toward_thesis_evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceCausalAssuranceFixture(missingWorld).some(error=>/exactly the eight required/.test(error)));

const publicSurfaceLeak = structuredClone(fixture);
publicSurfaceLeak.worlds[0].public_claim.reported_average_effect=0.3;
assert.ok(validatePreferenceCausalAssuranceFixture(publicSurfaceLeak).some(error=>/frozen causal-publication surface/.test(error)));

const denominatorLeak = structuredClone(fixture);
denominatorLeak.worlds[0].observation.observed_count=99;
assert.ok(validatePreferenceCausalAssuranceFixture(denominatorLeak).some(error=>/observed and imputed records|followed and observed counts/.test(error)));

const postRepair = structuredClone(fixture);
const postFixture=postRepair.worlds.find(world=>world.world_id==='post-treatment-mediator-used-as-criterion');
postFixture.temporal.post_treatment_conditioned_count=0;
postFixture.temporal.decision_feedback_count=0;
postFixture.estimation.estimand=postRepair.baseline.reference_estimand;
postFixture.estimation.predeclared=true;
assert.throws(()=>compilePreferenceCausalAssuranceFixture(postRepair),/post_treatment_bias_present mismatch|temporal_order_complete mismatch/);

const colliderRepair = structuredClone(fixture);
const colliderFixture=colliderRepair.worlds.find(world=>world.world_id==='collider-selected-outcome-population');
colliderFixture.observation.followed_count=100;
colliderFixture.observation.observed_count=100;
colliderFixture.observation.missing_count=0;
colliderFixture.observation.imputed_count=0;
colliderFixture.observation.selected_count=100;
colliderFixture.observation.collider_conditioned_count=0;
colliderFixture.observation.appeal_conditioned_count=0;
assert.throws(()=>compilePreferenceCausalAssuranceFixture(colliderRepair),/collider_selection_present mismatch|complete_followup_observed mismatch|no_selection_bias_complete mismatch/);

const interferenceRepair = structuredClone(fixture);
const interferenceFixture=interferenceRepair.worlds.find(world=>world.world_id==='control-spillover-and-network-interference');
interferenceFixture.interference.stable_unit_assumption=true;
interferenceFixture.interference.spillover_count=0;
interferenceFixture.interference.control_exposed_count=0;
interferenceFixture.interference.exposure_mapping_state='complete_no_cross_unit_exposure';
assert.throws(()=>compilePreferenceCausalAssuranceFixture(interferenceRepair),/interference_spillover_present mismatch|no_interference_complete mismatch/);

const historicalRepair = structuredClone(fixture);
const historicalFixture=historicalRepair.worlds.find(world=>world.world_id==='historical-control-with-time-policy-population-drift');
historicalFixture.comparator.type='concurrent_control';
historicalFixture.comparator.concurrent=true;
historicalFixture.comparator.calendar_offset_days=0;
historicalFixture.comparator.policy_match=true;
historicalFixture.comparator.population_match=true;
historicalFixture.comparator.channel_match=true;
assert.throws(()=>compilePreferenceCausalAssuranceFixture(historicalRepair),/historical_control_drift_present mismatch|concurrent_comparator_complete mismatch/);

const regressionRepair = structuredClone(fixture);
const regressionFixture=regressionRepair.worlds.find(world=>world.world_id==='high-risk-selection-regression-to-mean');
regressionFixture.baseline_selection.selected_high_risk_count=0;
regressionFixture.baseline_selection.regression_to_mean_count=0;
regressionFixture.baseline_selection.repeated_measurement=true;
regressionFixture.baseline_selection.untreated_trajectory_observed=true;
assert.throws(()=>compilePreferenceCausalAssuranceFixture(regressionRepair),/regression_to_mean_present mismatch|baseline_regression_control_complete mismatch/);

const adaptiveRepair = structuredClone(fixture);
const adaptiveFixture=adaptiveRepair.worlds.find(world=>world.world_id==='adaptive-policy-selective-label-feedback');
adaptiveFixture.adaptive.exploration_probability=0.2;
adaptiveFixture.adaptive.propensity_logged=true;
adaptiveFixture.adaptive.off_policy_evaluation=true;
adaptiveFixture.adaptive.selective_label_count=0;
adaptiveFixture.adaptive.policy_feedback_count=0;
adaptiveFixture.observation.selective_label_count=0;
assert.throws(()=>compilePreferenceCausalAssuranceFixture(adaptiveRepair),/adaptive_feedback_selective_labels_present mismatch|adaptive_logging_complete mismatch/);

const lineageRepair = structuredClone(fixture);
const lineageFixture=lineageRepair.worlds.find(world=>world.world_id==='pooled-estimate-across-system-version-succession');
lineageFixture.lineage.approved_model_version='model-v2';
lineageFixture.lineage.approved_score_version='score-v2';
lineageFixture.lineage.approved_threshold=0.6;
lineageFixture.lineage.approved_policy_version='policy-v2';
lineageFixture.lineage.approved_workflow_version='workflow-v2';
lineageFixture.lineage.approved_population_version='population-v2';
lineageFixture.lineage.approved_experiment_version='experiment-v2';
lineageFixture.lineage.pooled_successor_decision_count=0;
lineageFixture.lineage.revalidation_state='current';
assert.throws(()=>compilePreferenceCausalAssuranceFixture(lineageRepair),/version_pooling_drift_present mismatch|current_experiment_lineage_complete mismatch/);

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].governance.binding_public_authority=true;
assert.ok(validatePreferenceCausalAssuranceFixture(authorityLeak).some(error=>/binding public authority must remain false/.test(error)));

const classificationLeak = structuredClone(fixture);
classificationLeak.expected_classification.score_outcome_association_identifies_causal_effect=true;
assert.ok(validatePreferenceCausalAssuranceFixture(classificationLeak).some(error=>/expected_classification/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[3].payload.imputed_count=99;
assert.ok(validatePreferenceCausalAssuranceBuild(tamperedBuild).some(error=>/hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_causal_identification_worlds=2;
assert.ok(validatePreferenceCausalAssuranceBuild(metricInflation).some(error=>/complete_causal_identification_worlds must equal 1/.test(error)));

const realWorldLeak = structuredClone(compiled);
realWorldLeak.classification.real_world_effect_claimed=true;
assert.ok(validatePreferenceCausalAssuranceBuild(realWorldLeak).some(error=>/zero intent, real-world effect, and preference-change claims/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCausalAssuranceFixture(strippedCaveat).some(error=>/interpretation contract is incomplete/.test(error)));

console.log('preference-causal-assurance.test.js: OK');
