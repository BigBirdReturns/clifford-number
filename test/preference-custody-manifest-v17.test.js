import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV17,
  validatePreferenceCustodyManifestV17Build
} from '../tools/lib/preference-custody-manifest-v17.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v17.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v17.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v17.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v17.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV17(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV17Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v17');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v17-build@1');
assert.equal(compiled.status, 'laboratory_floor_v17_qualified');
assert.equal(compiled.control_count, 19);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v16');
assert.equal(compiled.composition.base_control_count, 18);
assert.equal(compiled.composition.extension_control_id, 'PC-19');
assert.equal(compiled.composition.added_promotion_requirement_count, 40);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 40);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('distribution_formula_subgroup_harm_and_algorithmic_allocation_governance'), false);
assert.equal(compiled.open_frontiers.includes('harm_reference_causality_measurement_and_compensation_objective_governance'), true);
assert.equal(compiled.open_frontiers.includes('allocation_model_execution_monitoring_override_and_correction_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'distribution_formula_subgroup_harm_and_algorithmic_allocation_governance'), true);

const pc19 = compiled.controls.find(control => control.control_id === 'PC-19');
assert.ok(pc19);
assert.equal(pc19.fixture_id, 'same-fair-allocation-status-different-formula-governance-v1');
assert.equal(pc19.failure_class, 'distribution_formula_subgroup_harm_and_algorithmic_allocation_governance_equifinality');
assert.equal(pc19.graph_effect, 'none');
assert.equal(pc19.counts_toward_thesis_evidence, false);
assert.equal(pc19.conclusion_generated, false);
assert.equal(pc19.real_world_effect_claimed, false);
assert.equal(pc19.preference_change_present, false);
assert.equal(pc19.manipulative_intent_inferable, false);
assert.equal(pc19.required_refusal_rules.every(rule => pc19.observed_refusal_rules.includes(rule)), true);
assert.deepEqual(pc19.proof_summary, {
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
  binding_public_authority_worlds: 0,
  full_fund_exhaustion_identifies_reference_correct_allocation: false,
  payment_to_every_person_identifies_subgroup_adequacy: false,
  per_capita_equality_identifies_harm_responsive_fairness: false,
  feature_omission_identifies_absence_of_proxy_effects: false,
  approved_formula_identifies_executed_formula: false,
  model_transparency_label_identifies_model_data_checkpoint_lineage: false,
  aggregate_audit_identifies_subgroup_validation: false,
  stable_total_payout_identifies_stable_person_or_subgroup_outcomes: false,
  manual_override_identifies_correction: false,
  appeal_route_identifies_effective_explanation_or_correction: false,
  formula_disparity_identifies_unlawful_discrimination_or_misconduct: false,
  public_fairly_allocated_status_identifies_complete_valid_auditable_challengeable_authorized_allocation: false,
  binding_public_authority_supported: false,
  complete_reference_allocation_supported_in_at_least_one_world: true
});

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v16_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc19_allocation_formula_governance_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'allocation_formula_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'allocation_formula_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v17/);
assert.match(markdown, /Controls:\*\* 19/);
assert.match(markdown, /PC-19: allocation formula, subgroup harm, and execution governance/);
assert.match(markdown, /complete_reference_allocation_worlds: 1/);
assert.match(markdown, /total_absolute_subgroup_allocation_error: 3500/);
assert.match(markdown, /harm_reference_causality_measurement_and_compensation_objective_governance/);
assert.match(markdown, /allocation_model_execution_monitoring_override_and_correction_assurance/);
assert.doesNotMatch(markdown, /named model discriminated|binding public authorization|actual allocation violated law/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV17(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v15';
assert.ok(validatePreferenceCustodyManifestV17(wrongBase).some(error => /base manifest must remain floor v16/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-20';
assert.ok(validatePreferenceCustodyManifestV17(wrongControl).some(error => /extension control must remain PC-19/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV17(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV17(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV17(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 20;
assert.ok(validatePreferenceCustodyManifestV17Build(countInflation).some(error => /preserve nineteen controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-19').proof_summary.complete_reference_allocation_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV17Build(metricInflation).some(error => /complete_reference_allocation_worlds must equal 1/.test(error)));

const equalityLaundering = structuredClone(compiled);
equalityLaundering.controls.find(control => control.control_id === 'PC-19').proof_summary.per_capita_equality_identifies_harm_responsive_fairness = true;
assert.ok(validatePreferenceCustodyManifestV17Build(equalityLaundering).some(error => /per_capita_equality_identifies_harm_responsive_fairness must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count = 41;
assert.ok(validatePreferenceCustodyManifestV17Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('distribution_formula_subgroup_harm_and_algorithmic_allocation_governance');
assert.ok(validatePreferenceCustodyManifestV17Build(resolvedFrontierLeak).some(error => /remove the resolved broad allocation-formula frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV17Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV17Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v17.test.js: OK');
