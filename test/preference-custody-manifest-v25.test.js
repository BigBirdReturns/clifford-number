import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV25,
  validatePreferenceCustodyManifestV25Build
} from '../tools/lib/preference-custody-manifest-v25.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v25.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v25.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v25.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v25.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV25(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV25Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v25');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v25-build@1');
assert.equal(compiled.status, 'laboratory_floor_v25_qualified');
assert.equal(compiled.control_issue, 752);
assert.equal(compiled.control_count, 27);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v24');
assert.equal(compiled.composition.base_control_count, 26);
assert.equal(compiled.composition.extension_control_id, 'PC-27');
assert.equal(compiled.composition.added_promotion_requirement_count, 60);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 60);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20',
  'PC-21','PC-22','PC-23','PC-24','PC-25','PC-26','PC-27'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('interference_network_spillover_and_exposure_mapping_causal_governance'), false);
assert.equal(compiled.open_frontiers.includes('network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance'), true);
assert.equal(compiled.open_frontiers.includes('saturation_general_equilibrium_and_interference_robust_policy_governance'), true);
assert.equal(compiled.open_frontiers.includes('adaptive_policy_selective_labels_off_policy_evaluation_and_experiment_succession_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'interference_network_channel_exposure_treatment_version_topology_saturation_and_equilibrium'), true);
assert.equal(manifest.real_case_requirements_added.length, 60);
assert.equal(new Set(manifest.real_case_requirements_added).size, 60);
assert.equal(manifest.real_case_requirements_added.every(item => /^[a-z0-9_]+$/.test(item)), true);

const pc27 = compiled.controls.find(control => control.control_id === 'PC-27');
assert.ok(pc27);
assert.equal(pc27.fixture_id, 'same-interference-adjusted-status-different-exposure-governance-v1');
assert.equal(pc27.failure_class, 'interference_network_spillover_exposure_mapping_and_general_equilibrium_equifinality');
assert.equal(pc27.graph_effect, 'none');
assert.equal(pc27.counts_toward_thesis_evidence, false);
assert.equal(pc27.conclusion_generated, false);
assert.equal(pc27.real_world_effect_claimed, false);
assert.equal(pc27.preference_change_present, false);
assert.equal(pc27.manipulative_intent_inferable, false);
assert.equal(pc27.required_refusal_rules.every(rule => pc27.observed_refusal_rules.includes(rule)), true);

const expectedMetrics = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_interference_governance_signatures: 8,
  complete_interference_assurance_worlds: 1,
  peer_spillover_worlds: 1,
  institutional_channel_contamination_worlds: 1,
  cross_cluster_interference_worlds: 1,
  network_undercoverage_worlds: 1,
  treatment_version_interference_worlds: 1,
  endogenous_network_rewiring_worlds: 1,
  general_equilibrium_saturation_worlds: 1,
  assignment_complete_worlds: 8,
  network_census_complete_worlds: 6,
  channel_map_complete_worlds: 7,
  control_unexposed_complete_worlds: 2,
  stable_treatment_complete_worlds: 7,
  stable_network_complete_worlds: 6,
  partial_interference_supported_worlds: 3,
  exposure_mapping_complete_worlds: 1,
  spillover_estimand_identified_worlds: 1,
  current_interference_lineage_complete_worlds: 5,
  same_public_interference_surface_worlds: 8,
  total_true_exposed_control_count: 205,
  total_false_negative_exposure_count: 205,
  total_peer_spillover_count: 30,
  total_institutional_exposure_count: 40,
  total_cross_cluster_exposure_count: 25,
  total_hidden_network_exposure_count: 40,
  total_rewiring_exposure_count: 20,
  total_ambient_saturation_exposure_count: 100,
  total_missing_edge_count: 400,
  total_cross_cluster_edge_count: 50,
  total_shared_channel_exposure_count: 140,
  total_multiple_version_unit_count: 30,
  total_rewired_edge_count: 100,
  total_unsupported_interference_decisions: 700,
  binding_public_authority_worlds: 0
};
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(pc27.proof_summary[key], value);
for (const key of [
  'cluster_randomization_identifies_absence_of_interference',
  'nominal_control_identifies_unexposed_control',
  'complete_node_coverage_identifies_complete_edge_channel_exposure_coverage',
  'person_network_identifies_complete_institutional_market_exposure',
  'predeclared_mapping_identifies_correct_exposure_when_channels_omitted',
  'zero_observed_cross_cluster_edges_identifies_partial_interference',
  'stable_assignment_identifies_stable_network',
  'single_treatment_label_identifies_stable_version_or_dose',
  'network_adjusted_estimator_identifies_valid_exposure_model',
  'cluster_robust_uncertainty_identifies_spillover_correction',
  'zero_reported_spillover_identifies_zero_true_spillover',
  'current_network_snapshot_identifies_pre_treatment_network',
  'saturation_equilibrium_identifies_unit_level_untreated_counterfactual',
  'public_interference_adjusted_status_identifies_complete_current_exposure_aware_correctable_authorized_evidence',
  'interference_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
]) assert.equal(pc27.proof_summary[key], false);
assert.equal(pc27.proof_summary.complete_interference_assurance_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v24_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc27_interference_network_channel_exposure_topology_saturation_and_lineage_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'interference_assurance_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'interference_assurance_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v25/);
assert.match(markdown, /Controls:\*\* 27/);
assert.match(markdown, /PC-27: interference, network spillover, and exposure mapping/);
assert.match(markdown, /complete_interference_assurance_worlds: 1/);
assert.match(markdown, /total_unsupported_interference_decisions: 700/);
assert.match(markdown, /network_topology_measurement_error_hidden_edge_and_dynamic_exposure_assurance/);
assert.match(markdown, /saturation_general_equilibrium_and_interference_robust_policy_governance/);
assert.doesNotMatch(markdown, /named network caused harm|binding public authorization|actual manipulation or discrimination/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV25(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v23';
assert.ok(validatePreferenceCustodyManifestV25(wrongBase).some(error => /base manifest must remain floor v24/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-28';
assert.ok(validatePreferenceCustodyManifestV25(wrongControl).some(error => /extension control must remain PC-27/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV25(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const malformedRequirement = structuredClone(manifest);
malformedRequirement.real_case_requirements_added[0] = 'interference assurance malformed requirement';
assert.ok(validatePreferenceCustodyManifestV25(malformedRequirement).some(error => /machine identifiers/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV25(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV25(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 28;
assert.ok(validatePreferenceCustodyManifestV25Build(countInflation).some(error => /preserve twenty-seven controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-27').proof_summary.complete_interference_assurance_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV25Build(metricInflation).some(error => /complete_interference_assurance_worlds must equal 1/.test(error)));

const exposureLaundering = structuredClone(compiled);
exposureLaundering.controls.find(control => control.control_id === 'PC-27').proof_summary.nominal_control_identifies_unexposed_control = true;
assert.ok(validatePreferenceCustodyManifestV25Build(exposureLaundering).some(error => /nominal_control_identifies_unexposed_control must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count += 1;
assert.ok(validatePreferenceCustodyManifestV25Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('interference_network_spillover_and_exposure_mapping_causal_governance');
assert.ok(validatePreferenceCustodyManifestV25Build(resolvedFrontierLeak).some(error => /remove the resolved broad interference frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV25Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV25Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v25.test.js: OK');
