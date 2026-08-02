import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV19,
  validatePreferenceCustodyManifestV19Build
} from '../tools/lib/preference-custody-manifest-v19.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v19.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v19.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v19.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v19.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV19(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV19Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v19');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v19-build@1');
assert.equal(compiled.status, 'laboratory_floor_v19_qualified');
assert.equal(compiled.control_count, 21);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v18');
assert.equal(compiled.composition.base_control_count, 20);
assert.equal(compiled.composition.extension_control_id, 'PC-21');
assert.equal(compiled.composition.added_promotion_requirement_count, 46);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 46);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20','PC-21'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('notice_comprehension_accessibility_exit_and_assent_effectiveness'), false);
assert.equal(compiled.open_frontiers.includes('choice_architecture_exit_authorship_assent_and_payment_sequence_governance'), true);
assert.equal(compiled.open_frontiers.includes('comprehension_measurement_translation_accessibility_and_transfer_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'notice_comprehension_accessibility_exit_and_assent_effectiveness'), true);

const pc21 = compiled.controls.find(control => control.control_id === 'PC-21');
assert.ok(pc21);
assert.equal(pc21.fixture_id, 'same-informed-choice-status-different-comprehension-agency-v1');
assert.equal(pc21.failure_class, 'notice_comprehension_accessibility_exit_and_assent_effectiveness_equifinality');
assert.equal(pc21.graph_effect, 'none');
assert.equal(pc21.counts_toward_thesis_evidence, false);
assert.equal(pc21.conclusion_generated, false);
assert.equal(pc21.real_world_effect_claimed, false);
assert.equal(pc21.preference_change_present, false);
assert.equal(pc21.manipulative_intent_inferable, false);
assert.equal(pc21.required_refusal_rules.every(rule => pc21.observed_refusal_rules.includes(rule)), true);
assert.deepEqual(pc21.proof_summary, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_choice_effectiveness_signatures: 8,
  complete_informed_choice_worlds: 1,
  open_receipt_as_comprehension_worlds: 1,
  recognition_without_transfer_worlds: 1,
  translation_equivalence_failure_worlds: 1,
  accessibility_failure_worlds: 1,
  intended_exit_suppression_worlds: 1,
  representative_substitution_worlds: 1,
  payment_before_assent_worlds: 1,
  explicit_assent_complete_worlds: 5,
  self_authorship_complete_worlds: 5,
  independent_validation_and_correction_complete_worlds: 1,
  verified_comprehension_complete_worlds: 3,
  full_notice_delivery_worlds: 8,
  full_formal_choice_record_worlds: 8,
  same_recorded_disposition_worlds: 8,
  full_payment_worlds: 8,
  total_verified_consequence_understanding: 550,
  total_scenario_transfer_count: 505,
  total_intended_exit_count: 55,
  total_completed_exit_count: 40,
  total_suppressed_exit_intentions: 15,
  total_representative_substituted_choices: 30,
  total_inferred_assent_count: 140,
  total_payment_before_choice_count: 100,
  binding_public_authority_worlds: 0,
  notice_delivery_or_message_open_identifies_comprehension: false,
  recognition_score_identifies_consequence_understanding_or_scenario_transfer: false,
  translation_availability_identifies_semantic_procedural_equivalence: false,
  formal_accessibility_label_identifies_usable_access_or_assisted_comprehension: false,
  formal_choice_route_identifies_self_authored_meaningful_choice: false,
  recorded_exit_rate_identifies_intended_exit_or_completed_agency: false,
  representative_or_operator_action_identifies_affected_person_assent: false,
  payment_retention_identifies_prior_informed_agreement: false,
  explicit_choice_field_identifies_valid_explicit_assent_receipt: false,
  same_recorded_disposition_identifies_same_comprehension_intention_choice_or_authority: false,
  comprehension_or_exit_failure_identifies_coercion_manipulation_breach_misconduct_or_intent: false,
  public_informed_choice_complete_status_identifies_validated_accessible_self_authored_correctable_authorized_choice: false,
  binding_public_authority_supported: false,
  complete_informed_choice_supported_in_at_least_one_world: true
});

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v18_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc21_notice_comprehension_accessibility_exit_and_assent_effectiveness_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'choice_effectiveness_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'choice_effectiveness_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v19/);
assert.match(markdown, /Controls:\*\* 21/);
assert.match(markdown, /PC-21: notice comprehension, accessibility, exit, and assent effectiveness/);
assert.match(markdown, /complete_informed_choice_worlds: 1/);
assert.match(markdown, /total_suppressed_exit_intentions: 15/);
assert.match(markdown, /choice_architecture_exit_authorship_assent_and_payment_sequence_governance/);
assert.match(markdown, /comprehension_measurement_translation_accessibility_and_transfer_assurance/);
assert.doesNotMatch(markdown, /named process coerced|binding public authorization|actual consent invalid/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV19(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v17';
assert.ok(validatePreferenceCustodyManifestV19(wrongBase).some(error => /base manifest must remain floor v18/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-22';
assert.ok(validatePreferenceCustodyManifestV19(wrongControl).some(error => /extension control must remain PC-21/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV19(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV19(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV19(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 22;
assert.ok(validatePreferenceCustodyManifestV19Build(countInflation).some(error => /preserve twenty-one controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-21').proof_summary.complete_informed_choice_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV19Build(metricInflation).some(error => /complete_informed_choice_worlds must equal 1/.test(error)));

const comprehensionLaundering = structuredClone(compiled);
comprehensionLaundering.controls.find(control => control.control_id === 'PC-21').proof_summary.notice_delivery_or_message_open_identifies_comprehension = true;
assert.ok(validatePreferenceCustodyManifestV19Build(comprehensionLaundering).some(error => /notice_delivery_or_message_open_identifies_comprehension must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count = 47;
assert.ok(validatePreferenceCustodyManifestV19Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('notice_comprehension_accessibility_exit_and_assent_effectiveness');
assert.ok(validatePreferenceCustodyManifestV19Build(resolvedFrontierLeak).some(error => /remove the resolved broad choice-effectiveness frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV19Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV19Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v19.test.js: OK');
