import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV24,
  validatePreferenceCustodyManifestV24Build
} from '../tools/lib/preference-custody-manifest-v24.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v24.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v24.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v24.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v24.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV24(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV24Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v24');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v24-build@1');
assert.equal(compiled.status, 'laboratory_floor_v24_qualified');
assert.equal(compiled.control_issue, 740);
assert.equal(compiled.control_count, 26);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v23');
assert.equal(compiled.composition.base_control_count, 25);
assert.equal(compiled.composition.extension_control_id, 'PC-26');
assert.equal(compiled.composition.added_promotion_requirement_count, 60);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 60);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20',
  'PC-21','PC-22','PC-23','PC-24','PC-25','PC-26'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('criterion_temporal_causality_feedback_and_post_treatment_bias_assurance'), false);
assert.equal(compiled.open_frontiers.includes('interference_network_spillover_and_exposure_mapping_causal_governance'), true);
assert.equal(compiled.open_frontiers.includes('adaptive_policy_selective_labels_off_policy_evaluation_and_experiment_succession_assurance'), true);
assert.equal(compiled.open_frontiers.includes('external_replication_population_transport_and_consequential_score_use_governance'), true);
assert.equal(compiled.open_frontiers.includes('item_bank_exposure_adaptive_routing_equating_and_version_succession_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'criterion_temporal_causality_feedback_post_treatment_bias_and_interference'), true);
assert.equal(manifest.real_case_requirements_added.length, 60);
assert.equal(new Set(manifest.real_case_requirements_added).size, 60);
assert.equal(manifest.real_case_requirements_added.every(item => /^[a-z0-9_]+$/.test(item)), true);

const pc26 = compiled.controls.find(control => control.control_id === 'PC-26');
assert.ok(pc26);
assert.equal(pc26.fixture_id, 'same-causal-validation-status-different-identification-paths-v1');
assert.equal(pc26.failure_class, 'criterion_temporal_causality_feedback_post_treatment_bias_and_interference_equifinality');
assert.equal(pc26.graph_effect, 'none');
assert.equal(pc26.counts_toward_thesis_evidence, false);
assert.equal(pc26.conclusion_generated, false);
assert.equal(pc26.real_world_effect_claimed, false);
assert.equal(pc26.preference_change_present, false);
assert.equal(pc26.manipulative_intent_inferable, false);
assert.equal(pc26.required_refusal_rules.every(rule => pc26.observed_refusal_rules.includes(rule)), true);

const expectedMetrics = {
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
};
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(pc26.proof_summary[key], value);
for (const key of [
  'score_outcome_association_identifies_causal_effect',
  'post_treatment_criterion_identifies_pre_treatment_outcome',
  'published_denominator_identifies_complete_observed_followup',
  'conditioned_observed_set_identifies_unselected_outcome_population',
  'nominal_control_group_identifies_unexposed_control_under_interference',
  'historical_control_identifies_concurrent_counterfactual',
  'extreme_baseline_improvement_identifies_treatment_effect',
  'adaptive_policy_agreement_identifies_unbiased_effect_without_exploration_logging',
  'observed_labels_identify_representative_outcomes_under_feedback',
  'pooled_estimate_identifies_current_validation_after_system_succession',
  'narrow_interval_low_p_value_identifies_valid_causal_identification',
  'replication_count_identifies_independent_replication_of_same_estimand_design',
  'public_causally_validated_status_identifies_temporally_ordered_unselected_interference_aware_current_correctable_authorized_evidence',
  'causal_design_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
]) assert.equal(pc26.proof_summary[key], false);
assert.equal(pc26.proof_summary.complete_causal_identification_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v23_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc26_assignment_temporal_selection_interference_feedback_and_lineage_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'causal_assurance_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'causal_assurance_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v24/);
assert.match(markdown, /Controls:\*\* 26/);
assert.match(markdown, /PC-26: temporal causality, selection, interference, feedback, and experiment lineage/);
assert.match(markdown, /complete_causal_identification_worlds: 1/);
assert.match(markdown, /total_unsupported_causal_decisions: 700/);
assert.match(markdown, /interference_network_spillover_and_exposure_mapping_causal_governance/);
assert.match(markdown, /adaptive_policy_selective_labels_off_policy_evaluation_and_experiment_succession_assurance/);
assert.doesNotMatch(markdown, /named policy caused harm|binding public authorization|actual manipulation or discrimination/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV24(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v22';
assert.ok(validatePreferenceCustodyManifestV24(wrongBase).some(error => /base manifest must remain floor v23/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-27';
assert.ok(validatePreferenceCustodyManifestV24(wrongControl).some(error => /extension control must remain PC-26/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV24(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const malformedRequirement = structuredClone(manifest);
malformedRequirement.real_case_requirements_added[0] = 'causal assurance malformed requirement';
assert.ok(validatePreferenceCustodyManifestV24(malformedRequirement).some(error => /machine identifiers/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV24(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV24(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 27;
assert.ok(validatePreferenceCustodyManifestV24Build(countInflation).some(error => /preserve twenty-six controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-26').proof_summary.complete_causal_identification_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV24Build(metricInflation).some(error => /complete_causal_identification_worlds must equal 1/.test(error)));

const precisionLaundering = structuredClone(compiled);
precisionLaundering.controls.find(control => control.control_id === 'PC-26').proof_summary.narrow_interval_low_p_value_identifies_valid_causal_identification = true;
assert.ok(validatePreferenceCustodyManifestV24Build(precisionLaundering).some(error => /narrow_interval_low_p_value_identifies_valid_causal_identification must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count += 1;
assert.ok(validatePreferenceCustodyManifestV24Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('criterion_temporal_causality_feedback_and_post_treatment_bias_assurance');
assert.ok(validatePreferenceCustodyManifestV24Build(resolvedFrontierLeak).some(error => /remove the resolved broad causal-assurance frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV24Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV24Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v24.test.js: OK');
