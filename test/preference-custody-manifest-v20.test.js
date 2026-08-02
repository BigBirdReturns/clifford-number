import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV20,
  validatePreferenceCustodyManifestV20Build
} from '../tools/lib/preference-custody-manifest-v20.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v20.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v20.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v20.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v20.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV20(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV20Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v20');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v20-build@1');
assert.equal(compiled.status, 'laboratory_floor_v20_qualified');
assert.equal(compiled.control_issue, 727);
assert.equal(compiled.control_count, 22);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v19');
assert.equal(compiled.composition.base_control_count, 21);
assert.equal(compiled.composition.extension_control_id, 'PC-22');
assert.equal(compiled.composition.added_promotion_requirement_count, 45);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 45);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20','PC-21','PC-22'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('choice_architecture_exit_authorship_assent_and_payment_sequence_governance'), false);
assert.equal(compiled.open_frontiers.includes('choice_reversal_cooling_off_clawback_and_post_choice_finality_governance'), true);
assert.equal(compiled.open_frontiers.includes('benefit_bundling_payment_conditioning_and_assent_independence_assurance'), true);
assert.equal(compiled.open_frontiers.includes('comprehension_measurement_translation_accessibility_and_transfer_assurance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'choice_architecture_exit_authorship_assent_and_payment_sequence'), true);

const pc22 = compiled.controls.find(control => control.control_id === 'PC-22');
assert.ok(pc22);
assert.equal(pc22.fixture_id, 'same-choice-final-status-different-architecture-agency-v1');
assert.equal(pc22.failure_class, 'choice_architecture_exit_authorship_assent_and_payment_sequence_equifinality');
assert.equal(pc22.graph_effect, 'none');
assert.equal(pc22.counts_toward_thesis_evidence, false);
assert.equal(pc22.conclusion_generated, false);
assert.equal(pc22.real_world_effect_claimed, false);
assert.equal(pc22.preference_change_present, false);
assert.equal(pc22.manipulative_intent_inferable, false);
assert.equal(pc22.required_refusal_rules.every(rule => pc22.observed_refusal_rules.includes(rule)), true);
assert.deepEqual(pc22.proof_summary, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_architecture_governance_signatures: 8,
  complete_neutral_choice_worlds: 1,
  default_binding_worlds: 1,
  asymmetric_path_cost_worlds: 2,
  urgency_pressure_worlds: 2,
  confirmation_asymmetry_worlds: 2,
  bundled_assent_worlds: 2,
  representative_substitution_worlds: 1,
  payment_clawback_worlds: 1,
  intended_exit_suppression_worlds: 5,
  self_authorship_complete_worlds: 2,
  explicit_assent_complete_worlds: 1,
  meaningful_reversal_worlds: 2,
  full_comprehension_worlds: 8,
  same_recorded_disposition_worlds: 8,
  full_payment_worlds: 8,
  total_intended_exit_count: 92,
  total_completed_exit_count: 40,
  total_suppressed_exit_intentions: 52,
  total_default_or_automated_recorded_choices: 110,
  total_representative_substituted_choices: 30,
  total_inferred_assent_count: 140,
  total_payment_before_choice_count: 100,
  total_clawback_exposed_people: 95,
  total_reversal_completed_count: 3,
  binding_public_authority_worlds: 0,
  verified_comprehension_identifies_neutral_self_authored_choice: false,
  visible_option_identifies_symmetric_path_cost: false,
  completed_choice_field_identifies_active_choice: false,
  nonresponse_or_timeout_identifies_assent: false,
  recorded_exit_rate_identifies_intended_exit_or_completed_agency: false,
  representative_operator_action_identifies_affected_person_authorship: false,
  bundled_benefit_acceptance_identifies_independent_assent: false,
  payment_retention_identifies_prior_assent: false,
  repayment_clawback_route_identifies_meaningful_exit: false,
  formal_cooling_off_text_identifies_usable_reconsideration: false,
  same_recorded_disposition_identifies_same_architecture_intention_authorship_assent_authority: false,
  architecture_pressure_identifies_coercion_manipulation_breach_misconduct_intent: false,
  public_choice_final_status_identifies_neutral_self_authored_reversible_auditable_authorized_choice: false,
  binding_public_authority_supported: false,
  complete_neutral_choice_supported_in_at_least_one_world: true
});

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v19_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc22_choice_architecture_exit_authorship_assent_payment_sequence_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'choice_architecture_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'choice_architecture_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v20/);
assert.match(markdown, /Controls:\*\* 22/);
assert.match(markdown, /PC-22: choice architecture, exit authorship, assent, and payment sequence/);
assert.match(markdown, /complete_neutral_choice_worlds: 1/);
assert.match(markdown, /total_suppressed_exit_intentions: 52/);
assert.match(markdown, /choice_reversal_cooling_off_clawback_and_post_choice_finality_governance/);
assert.match(markdown, /benefit_bundling_payment_conditioning_and_assent_independence_assurance/);
assert.doesNotMatch(markdown, /named interface coerced|binding public authorization|actual consent invalid|manipulation confirmed/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV20(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(manifest);
issueLeak.control_issue = 730;
assert.ok(validatePreferenceCustodyManifestV20(issueLeak).some(error => /control issue must remain 727/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v18';
assert.ok(validatePreferenceCustodyManifestV20(wrongBase).some(error => /base manifest must remain floor v19/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-23';
assert.ok(validatePreferenceCustodyManifestV20(wrongControl).some(error => /extension control must remain PC-22/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV20(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV20(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV20(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 23;
assert.ok(validatePreferenceCustodyManifestV20Build(countInflation).some(error => /preserve twenty-two controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-22').proof_summary.complete_neutral_choice_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV20Build(metricInflation).some(error => /complete_neutral_choice_worlds must equal 1/.test(error)));

const comprehensionLaundering = structuredClone(compiled);
comprehensionLaundering.controls.find(control => control.control_id === 'PC-22').proof_summary.verified_comprehension_identifies_neutral_self_authored_choice = true;
assert.ok(validatePreferenceCustodyManifestV20Build(comprehensionLaundering).some(error => /verified_comprehension_identifies_neutral_self_authored_choice must remain false/.test(error)));

const paymentLaundering = structuredClone(compiled);
paymentLaundering.controls.find(control => control.control_id === 'PC-22').proof_summary.payment_retention_identifies_prior_assent = true;
assert.ok(validatePreferenceCustodyManifestV20Build(paymentLaundering).some(error => /payment_retention_identifies_prior_assent must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count = 46;
assert.ok(validatePreferenceCustodyManifestV20Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('choice_architecture_exit_authorship_assent_and_payment_sequence_governance');
assert.ok(validatePreferenceCustodyManifestV20Build(resolvedFrontierLeak).some(error => /remove the resolved broad choice-architecture frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV20Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV20Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v20.test.js: OK');
