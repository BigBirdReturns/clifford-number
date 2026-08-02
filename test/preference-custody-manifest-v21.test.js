import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV21,
  validatePreferenceCustodyManifestV21Build
} from '../tools/lib/preference-custody-manifest-v21.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v21.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v21.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v21.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v21.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV21(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV21Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v21');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v21-build@1');
assert.equal(compiled.status, 'laboratory_floor_v21_qualified');
assert.equal(compiled.control_issue, 731);
assert.equal(compiled.control_count, 23);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v20');
assert.equal(compiled.composition.base_control_count, 22);
assert.equal(compiled.composition.extension_control_id, 'PC-23');
assert.equal(compiled.composition.added_promotion_requirement_count, 50);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 50);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20','PC-21','PC-22','PC-23'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('comprehension_measurement_translation_accessibility_and_transfer_assurance'), false);
assert.equal(compiled.open_frontiers.includes('measurement_construct_validity_item_security_and_administration_independence_assurance'), true);
assert.equal(compiled.open_frontiers.includes('translation_accessibility_subgroup_equivalence_and_longitudinal_retention_governance'), true);
assert.equal(compiled.open_frontiers.includes('choice_reversal_cooling_off_clawback_and_post_choice_finality_governance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'comprehension_measurement_translation_accessibility_and_transfer_assurance'), true);

const pc23 = compiled.controls.find(control => control.control_id === 'PC-23');
assert.ok(pc23);
assert.equal(pc23.fixture_id, 'same-comprehension-status-different-measurement-assurance-v1');
assert.equal(pc23.failure_class, 'comprehension_measurement_translation_accessibility_and_transfer_assurance_equifinality');
assert.equal(pc23.graph_effect, 'none');
assert.equal(pc23.counts_toward_thesis_evidence, false);
assert.equal(pc23.conclusion_generated, false);
assert.equal(pc23.real_world_effect_claimed, false);
assert.equal(pc23.preference_change_present, false);
assert.equal(pc23.manipulative_intent_inferable, false);
assert.equal(pc23.required_refusal_rules.every(rule => pc23.observed_refusal_rules.includes(rule)), true);
assert.deepEqual(pc23.proof_summary, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_measurement_assurance_signatures: 8,
  complete_measurement_assurance_worlds: 1,
  recognition_only_worlds: 1,
  item_leakage_worlds: 1,
  coaching_contamination_worlds: 1,
  translation_dif_worlds: 1,
  accessibility_construct_failure_worlds: 1,
  denominator_imputation_worlds: 1,
  delayed_retention_failure_worlds: 7,
  construct_valid_complete_worlds: 4,
  scenario_transfer_complete_worlds: 1,
  delayed_retention_complete_worlds: 1,
  independent_validation_complete_worlds: 1,
  subgroup_equivalence_complete_worlds: 6,
  item_security_complete_worlds: 7,
  full_population_observed_worlds: 7,
  same_certificate_publication_worlds: 8,
  total_assessed_count: 760,
  total_certified_count: 800,
  total_imputed_count: 40,
  total_recognition_count: 760,
  total_consequence_understanding_count: 545,
  total_scenario_transfer_count: 455,
  total_delayed_retention_count: 365,
  total_item_leakage_count: 100,
  total_memorized_answer_count: 80,
  total_coaching_count: 60,
  total_answer_prompt_count: 60,
  total_translation_dif_affected_count: 30,
  total_access_failure_count: 20,
  binding_public_authority_worlds: 0,
  certificate_count_identifies_assessed_population_or_validated_comprehension: false,
  mean_score_identifies_operative_consequence_understanding: false,
  recognition_recall_identifies_scenario_transfer: false,
  immediate_pass_identifies_delayed_retention: false,
  translation_availability_identifies_semantic_procedural_consequence_equivalence: false,
  accessibility_label_identifies_usable_construct_preserving_accommodation: false,
  expert_review_identifies_independent_validation: false,
  item_bank_secrecy_claim_identifies_item_security: false,
  administrator_assistance_identifies_uncontaminated_person_understanding: false,
  imputed_certificate_identifies_observed_person_comprehension: false,
  aggregate_pass_parity_identifies_subgroup_measurement_equivalence: false,
  public_comprehension_validated_status_identifies_secure_representative_transfer_retained_accessible_independently_validated_authorized_comprehension: false,
  measurement_failure_identifies_coercion_manipulation_breach_discrimination_misconduct_intent: false,
  binding_public_authority_supported: false,
  complete_measurement_assurance_supported_in_at_least_one_world: true
});

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v20_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc23_comprehension_measurement_translation_accessibility_transfer_assurance_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'comprehension_assurance_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'comprehension_assurance_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v21/);
assert.match(markdown, /Controls:\*\* 23/);
assert.match(markdown, /PC-23: comprehension measurement, translation, accessibility, and transfer assurance/);
assert.match(markdown, /complete_measurement_assurance_worlds: 1/);
assert.match(markdown, /total_imputed_count: 40/);
assert.match(markdown, /measurement_construct_validity_item_security_and_administration_independence_assurance/);
assert.match(markdown, /translation_accessibility_subgroup_equivalence_and_longitudinal_retention_governance/);
assert.doesNotMatch(markdown, /named assessment invalid|discrimination confirmed|publicly authorized comprehension|coercion established/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV21(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(manifest);
issueLeak.control_issue = 733;
assert.ok(validatePreferenceCustodyManifestV21(issueLeak).some(error => /control issue must remain 731/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v19';
assert.ok(validatePreferenceCustodyManifestV21(wrongBase).some(error => /base manifest must remain floor v20/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-24';
assert.ok(validatePreferenceCustodyManifestV21(wrongControl).some(error => /extension control must remain PC-23/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV21(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV21(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV21(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 24;
assert.ok(validatePreferenceCustodyManifestV21Build(countInflation).some(error => /preserve twenty-three controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-23').proof_summary.complete_measurement_assurance_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV21Build(metricInflation).some(error => /complete_measurement_assurance_worlds must equal 1/.test(error)));

const scoreLaundering = structuredClone(compiled);
scoreLaundering.controls.find(control => control.control_id === 'PC-23').proof_summary.mean_score_identifies_operative_consequence_understanding = true;
assert.ok(validatePreferenceCustodyManifestV21Build(scoreLaundering).some(error => /mean_score_identifies_operative_consequence_understanding must remain false/.test(error)));

const certificateLaundering = structuredClone(compiled);
certificateLaundering.controls.find(control => control.control_id === 'PC-23').proof_summary.imputed_certificate_identifies_observed_person_comprehension = true;
assert.ok(validatePreferenceCustodyManifestV21Build(certificateLaundering).some(error => /imputed_certificate_identifies_observed_person_comprehension must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count = 51;
assert.ok(validatePreferenceCustodyManifestV21Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('comprehension_measurement_translation_accessibility_and_transfer_assurance');
assert.ok(validatePreferenceCustodyManifestV21Build(resolvedFrontierLeak).some(error => /remove the resolved broad comprehension-assurance frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV21Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV21Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v21.test.js: OK');
