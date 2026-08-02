import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV23,
  validatePreferenceCustodyManifestV23Build
} from '../tools/lib/preference-custody-manifest-v23.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v23.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v23.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v23.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v23.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV23(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV23Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v23');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v23-build@1');
assert.equal(compiled.status, 'laboratory_floor_v23_qualified');
assert.equal(compiled.control_issue, 737);
assert.equal(compiled.control_count, 25);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v22');
assert.equal(compiled.composition.base_control_count, 24);
assert.equal(compiled.composition.extension_control_id, 'PC-25');
assert.equal(compiled.composition.added_promotion_requirement_count, 54);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 54);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20',
  'PC-21','PC-22','PC-23','PC-24','PC-25'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('criterion_independence_external_validation_and_score_use_governance'), false);
assert.equal(compiled.open_frontiers.includes('criterion_temporal_causality_feedback_and_post_treatment_bias_assurance'), true);
assert.equal(compiled.open_frontiers.includes('external_replication_population_transport_and_consequential_score_use_governance'), true);
assert.equal(compiled.open_frontiers.includes('item_bank_exposure_adaptive_routing_equating_and_version_succession_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'criterion_independence_external_validation_transport_and_score_use'), true);
assert.equal(manifest.real_case_requirements_added.length, 54);
assert.equal(new Set(manifest.real_case_requirements_added).size, 54);
assert.equal(manifest.real_case_requirements_added.every(item => /^[a-z0-9_]+$/.test(item)), true);

const pc25 = compiled.controls.find(control => control.control_id === 'PC-25');
assert.ok(pc25);
assert.equal(pc25.fixture_id, 'same-external-validation-status-different-criterion-use-governance-v1');
assert.equal(pc25.failure_class, 'criterion_independence_external_validation_transport_and_score_use_equifinality');
assert.equal(pc25.graph_effect, 'none');
assert.equal(pc25.counts_toward_thesis_evidence, false);
assert.equal(pc25.conclusion_generated, false);
assert.equal(pc25.real_world_effect_claimed, false);
assert.equal(pc25.preference_change_present, false);
assert.equal(pc25.manipulative_intent_inferable, false);
assert.equal(pc25.required_refusal_rules.every(rule => pc25.observed_refusal_rules.includes(rule)), true);

const expectedMetrics = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_external_validation_governance_signatures: 8,
  complete_external_validation_and_use_worlds: 1,
  same_team_criterion_worlds: 1,
  post_decision_criterion_worlds: 1,
  overlap_contamination_worlds: 1,
  proxy_criterion_worlds: 1,
  transport_failure_worlds: 1,
  unsupported_score_use_worlds: 1,
  validation_succession_drift_worlds: 1,
  criterion_independence_complete_worlds: 5,
  construct_relevance_complete_worlds: 7,
  predecision_criterion_complete_worlds: 7,
  blind_adjudication_complete_worlds: 6,
  independent_replication_complete_worlds: 6,
  representative_transport_complete_worlds: 7,
  score_use_alignment_complete_worlds: 6,
  current_validation_lineage_complete_worlds: 7,
  published_coefficient_matches_independent_reference_worlds: 1,
  same_public_decision_surface_worlds: 8,
  total_nonindependent_criterion_records: 300,
  total_post_decision_feedback_count: 100,
  total_overlap_count: 260,
  total_proxy_criterion_records: 100,
  total_transport_selection_bias_count: 60,
  total_unsupported_consequential_decisions: 360,
  total_stale_lineage_decisions: 100,
  binding_public_authority_worlds: 0
};
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(pc25.proof_summary[key], value);
for (const key of [
  'external_organization_identifies_independent_design_data_analysis_publication',
  'criterion_availability_identifies_criterion_independence',
  'post_decision_outcome_identifies_pre_treatment_criterion',
  'decision_agreement_identifies_independent_validity_when_score_shaped_decision',
  'shared_labels_features_records_answer_material_identify_independent_validation',
  'independent_criterion_identifies_construct_relevance',
  'replication_count_identifies_independent_representative_replication',
  'external_replication_identifies_transport_to_deployed_population',
  'predictive_validity_identifies_authority_for_consequential_score_use',
  'historical_validation_identifies_current_validation_after_succession',
  'public_externally_validated_status_identifies_independent_transportable_use_aligned_current_correctable_authorized_validation',
  'criterion_transport_use_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
]) assert.equal(pc25.proof_summary[key], false);
assert.equal(pc25.proof_summary.complete_external_validation_and_use_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v22_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc25_criterion_replication_transport_score_use_and_succession_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'criterion_score_use_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'criterion_score_use_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v23/);
assert.match(markdown, /Controls:\*\* 25/);
assert.match(markdown, /PC-25: criterion independence, external validation, transport, and score use/);
assert.match(markdown, /complete_external_validation_and_use_worlds: 1/);
assert.match(markdown, /total_unsupported_consequential_decisions: 360/);
assert.match(markdown, /criterion_temporal_causality_feedback_and_post_treatment_bias_assurance/);
assert.match(markdown, /external_replication_population_transport_and_consequential_score_use_governance/);
assert.doesNotMatch(markdown, /named validator was dependent|binding public authorization|actual manipulation or discrimination/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV23(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v21';
assert.ok(validatePreferenceCustodyManifestV23(wrongBase).some(error => /base manifest must remain floor v22/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-26';
assert.ok(validatePreferenceCustodyManifestV23(wrongControl).some(error => /extension control must remain PC-25/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV23(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const malformedRequirement = structuredClone(manifest);
malformedRequirement.real_case_requirements_added[0] = 'criterion score use malformed requirement';
assert.ok(validatePreferenceCustodyManifestV23(malformedRequirement).some(error => /machine identifiers/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV23(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV23(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 26;
assert.ok(validatePreferenceCustodyManifestV23Build(countInflation).some(error => /preserve twenty-five controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-25').proof_summary.complete_external_validation_and_use_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV23Build(metricInflation).some(error => /complete_external_validation_and_use_worlds must equal 1/.test(error)));

const independenceLaundering = structuredClone(compiled);
independenceLaundering.controls.find(control => control.control_id === 'PC-25').proof_summary.external_organization_identifies_independent_design_data_analysis_publication = true;
assert.ok(validatePreferenceCustodyManifestV23Build(independenceLaundering).some(error => /external_organization_identifies_independent_design_data_analysis_publication must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count += 1;
assert.ok(validatePreferenceCustodyManifestV23Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('criterion_independence_external_validation_and_score_use_governance');
assert.ok(validatePreferenceCustodyManifestV23Build(resolvedFrontierLeak).some(error => /remove the resolved broad criterion-score-use frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV23Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV23Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v23.test.js: OK');
