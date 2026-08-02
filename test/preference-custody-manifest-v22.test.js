import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV22,
  validatePreferenceCustodyManifestV22Build
} from '../tools/lib/preference-custody-manifest-v22.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v22.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v22.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v22.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v22.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV22(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV22Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v22');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v22-build@1');
assert.equal(compiled.status, 'laboratory_floor_v22_qualified');
assert.equal(compiled.control_issue, 734);
assert.equal(compiled.control_count, 24);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v21');
assert.equal(compiled.composition.base_control_count, 23);
assert.equal(compiled.composition.extension_control_id, 'PC-24');
assert.equal(compiled.composition.added_promotion_requirement_count, 55);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 55);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20',
  'PC-21','PC-22','PC-23','PC-24'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('measurement_construct_validity_item_security_and_administration_independence_assurance'), false);
assert.equal(compiled.open_frontiers.includes('criterion_independence_external_validation_and_score_use_governance'), true);
assert.equal(compiled.open_frontiers.includes('item_bank_exposure_adaptive_routing_equating_and_version_succession_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'measurement_construct_validity_item_security_administration_independence_and_score_provenance'), true);
assert.equal(manifest.real_case_requirements_added.length, 55);
assert.equal(new Set(manifest.real_case_requirements_added).size, 55);
assert.equal(manifest.real_case_requirements_added.every(item => /^[a-z0-9_]+$/.test(item)), true);

const pc24 = compiled.controls.find(control => control.control_id === 'PC-24');
assert.ok(pc24);
assert.equal(pc24.fixture_id, 'same-instrument-validation-status-different-score-provenance-v1');
assert.equal(pc24.failure_class, 'measurement_construct_validity_item_security_administration_independence_and_score_provenance_equifinality');
assert.equal(pc24.graph_effect, 'none');
assert.equal(pc24.counts_toward_thesis_evidence, false);
assert.equal(pc24.conclusion_generated, false);
assert.equal(pc24.real_world_effect_claimed, false);
assert.equal(pc24.preference_change_present, false);
assert.equal(pc24.manipulative_intent_inferable, false);
assert.equal(pc24.required_refusal_rules.every(rule => pc24.observed_refusal_rules.includes(rule)), true);

const expectedMetrics = {
  world_count:8,
  distinct_public_status_signatures:1,
  distinct_score_provenance_signatures:8,
  complete_instrument_assurance_worlds:1,
  construct_underrepresentation_worlds:1,
  construct_irrelevant_variance_worlds:1,
  criterion_contamination_worlds:1,
  item_leakage_teaching_worlds:1,
  adaptive_exposure_concentration_worlds:1,
  administration_scoring_override_worlds:1,
  form_equating_version_drift_worlds:1,
  construct_coverage_complete_worlds:7,
  criterion_independence_complete_worlds:7,
  item_security_complete_worlds:6,
  administration_independence_complete_worlds:7,
  form_comparability_complete_worlds:5,
  external_replication_complete_worlds:1,
  published_validity_matches_independent_criterion_worlds:1,
  same_reliability_publication_worlds:8,
  same_validity_publication_worlds:8,
  total_excluded_construct_domains:3,
  total_high_exposure_participant_count:180,
  total_item_leakage_count:100,
  total_memorized_answer_count:80,
  total_teaching_to_test_count:80,
  total_criterion_item_overlap_count:10,
  total_criterion_curriculum_overlap_count:20,
  total_criterion_answer_key_overlap_count:10,
  total_model_assistance_count:60,
  total_answer_prompt_count:60,
  total_answer_completion_count:20,
  total_score_override_count:25,
  total_nonindependent_administration_population:60,
  binding_public_authority_worlds:0
};
for (const [key, value] of Object.entries(expectedMetrics)) assert.equal(pc24.proof_summary[key], value);
for (const key of [
  'reliability_coefficient_identifies_construct_validity',
  'validity_coefficient_identifies_independent_criterion_validity',
  'high_mean_pass_rate_identifies_complete_construct_coverage',
  'content_review_identifies_absence_of_construct_underrepresentation',
  'stable_aggregate_score_identifies_form_comparability',
  'item_bank_secrecy_claim_identifies_secure_item_exposure',
  'instructional_alignment_identifies_uncontaminated_understanding',
  'adaptive_delivery_identifies_exposure_diversity_or_score_comparability',
  'administrator_assistance_identifies_independent_response_production',
  'automated_score_identifies_unoverridden_score_provenance',
  'equating_label_identifies_valid_cross_form_equivalence',
  'public_instrument_validated_status_identifies_complete_secure_independent_comparable_replicated_correctable_authorized_measurement',
  'construct_security_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent',
  'binding_public_authority_supported'
]) assert.equal(pc24.proof_summary[key], false);
assert.equal(pc24.proof_summary.complete_instrument_assurance_supported_in_at_least_one_world, true);

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v21_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc24_construct_item_criterion_administration_score_equating_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'instrument_validity_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'instrument_validity_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v22/);
assert.match(markdown, /Controls:\*\* 24/);
assert.match(markdown, /PC-24: construct validity, item security, administration independence, and score provenance/);
assert.match(markdown, /complete_instrument_assurance_worlds: 1/);
assert.match(markdown, /total_score_override_count: 25/);
assert.match(markdown, /criterion_independence_external_validation_and_score_use_governance/);
assert.match(markdown, /item_bank_exposure_adaptive_routing_equating_and_version_succession_assurance/);
assert.doesNotMatch(markdown, /named instrument invalid|binding public authorization|actual coercion or discrimination/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV22(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v20';
assert.ok(validatePreferenceCustodyManifestV22(wrongBase).some(error => /base manifest must remain floor v21/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-25';
assert.ok(validatePreferenceCustodyManifestV22(wrongControl).some(error => /extension control must remain PC-24/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV22(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const malformedRequirement = structuredClone(manifest);
malformedRequirement.real_case_requirements_added[0] = 'instrument validity malformed requirement';
assert.ok(validatePreferenceCustodyManifestV22(malformedRequirement).some(error => /machine identifiers/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV22(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV22(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 25;
assert.ok(validatePreferenceCustodyManifestV22Build(countInflation).some(error => /preserve twenty-four controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-24').proof_summary.complete_instrument_assurance_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV22Build(metricInflation).some(error => /complete_instrument_assurance_worlds must equal 1/.test(error)));

const reliabilityLaundering = structuredClone(compiled);
reliabilityLaundering.controls.find(control => control.control_id === 'PC-24').proof_summary.reliability_coefficient_identifies_construct_validity = true;
assert.ok(validatePreferenceCustodyManifestV22Build(reliabilityLaundering).some(error => /reliability_coefficient_identifies_construct_validity must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count += 1;
assert.ok(validatePreferenceCustodyManifestV22Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('measurement_construct_validity_item_security_and_administration_independence_assurance');
assert.ok(validatePreferenceCustodyManifestV22Build(resolvedFrontierLeak).some(error => /remove the resolved broad instrument-validity frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV22Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV22Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v22.test.js: OK');
