import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV18,
  validatePreferenceCustodyManifestV18Build
} from '../tools/lib/preference-custody-manifest-v18.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v18.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v18.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v18.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v18.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV18(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV18Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v18');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v18-build@1');
assert.equal(compiled.status, 'laboratory_floor_v18_qualified');
assert.equal(compiled.control_count, 20);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v17');
assert.equal(compiled.composition.base_control_count, 19);
assert.equal(compiled.composition.extension_control_id, 'PC-20');
assert.equal(compiled.composition.added_promotion_requirement_count, 42);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 42);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09','PC-10',
  'PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18','PC-19','PC-20'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('release_scope_notice_comprehension_and_collective_exit_authority'), false);
assert.equal(compiled.open_frontiers.includes('notice_comprehension_accessibility_exit_and_assent_effectiveness'), true);
assert.equal(compiled.open_frontiers.includes('release_text_future_unknown_claim_scope_and_nonparty_binding_governance'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'release_scope_notice_comprehension_collective_exit_and_binding_authority'), true);

const pc20 = compiled.controls.find(control => control.control_id === 'PC-20');
assert.ok(pc20);
assert.equal(pc20.fixture_id, 'same-all-claims-released-status-different-notice-exit-authority-v1');
assert.equal(pc20.failure_class, 'release_scope_notice_comprehension_collective_exit_and_binding_authority_equifinality');
assert.equal(pc20.graph_effect, 'none');
assert.equal(pc20.counts_toward_thesis_evidence, false);
assert.equal(pc20.conclusion_generated, false);
assert.equal(pc20.real_world_effect_claimed, false);
assert.equal(pc20.preference_change_present, false);
assert.equal(pc20.manipulative_intent_inferable, false);
assert.equal(pc20.required_refusal_rules.every(rule => pc20.observed_refusal_rules.includes(rule)), true);
assert.deepEqual(pc20.proof_summary, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_release_authority_signatures: 8,
  complete_notice_exit_release_worlds: 1,
  delivery_without_comprehension_worlds: 4,
  notice_overload_worlds: 1,
  accessibility_failure_worlds: 1,
  meaningful_exit_failure_worlds: 5,
  release_scope_drift_worlds: 2,
  future_claim_release_worlds: 2,
  nonparticipant_binding_worlds: 1,
  payment_as_consent_worlds: 1,
  approved_binding_version_mismatch_worlds: 2,
  independent_review_and_correction_complete_worlds: 1,
  notice_comprehension_complete_worlds: 4,
  full_notice_delivery_worlds: 8,
  full_affected_payment_worlds: 8,
  total_affected_people_without_notice_comprehension: 245,
  total_failed_optout_attempts: 55,
  total_nonparticipant_bound_people: 20,
  binding_public_authority_worlds: 0,
  notice_delivery_identifies_received_understood_accessible_usable_notice: false,
  formal_optout_identifies_meaningful_exit: false,
  payment_acceptance_identifies_informed_release_agreement: false,
  approval_or_collective_judgment_identifies_consent_by_every_bound_person: false,
  approved_release_identifies_binding_release: false,
  release_label_identifies_operative_text_version_scope_or_time_horizon: false,
  narrow_disclosed_release_identifies_narrow_binding_release: false,
  representation_confers_authority_to_bind_nonparticipants_or_future_claimants: false,
  full_compensation_identifies_informed_release_or_objective_control: false,
  objection_or_appeal_identifies_effective_explanation_correction_or_exit: false,
  release_overbreadth_or_comprehension_failure_identifies_breach_coercion_misconduct_or_intent: false,
  public_all_claims_released_status_identifies_complete_informed_accessible_exit_capable_authorized_release: false,
  binding_public_authority_supported: false,
  complete_notice_exit_release_supported_in_at_least_one_world: true
});

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v17_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc20_release_notice_exit_and_binding_authority_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'release_authority_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'release_authority_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v18/);
assert.match(markdown, /Controls:\*\* 20/);
assert.match(markdown, /PC-20: release scope, notice comprehension, collective exit, and binding authority/);
assert.match(markdown, /complete_notice_exit_release_worlds: 1/);
assert.match(markdown, /total_affected_people_without_notice_comprehension: 245/);
assert.match(markdown, /notice_comprehension_accessibility_exit_and_assent_effectiveness/);
assert.match(markdown, /release_text_future_unknown_claim_scope_and_nonparty_binding_governance/);
assert.doesNotMatch(markdown, /named court coerced|binding public authorization|actual release was unenforceable/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV18(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v16';
assert.ok(validatePreferenceCustodyManifestV18(wrongBase).some(error => /base manifest must remain floor v17/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-21';
assert.ok(validatePreferenceCustodyManifestV18(wrongControl).some(error => /extension control must remain PC-20/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV18(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV18(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV18(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 21;
assert.ok(validatePreferenceCustodyManifestV18Build(countInflation).some(error => /preserve twenty controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-20').proof_summary.complete_notice_exit_release_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV18Build(metricInflation).some(error => /complete_notice_exit_release_worlds must equal 1/.test(error)));

const consentLaundering = structuredClone(compiled);
consentLaundering.controls.find(control => control.control_id === 'PC-20').proof_summary.payment_acceptance_identifies_informed_release_agreement = true;
assert.ok(validatePreferenceCustodyManifestV18Build(consentLaundering).some(error => /payment_acceptance_identifies_informed_release_agreement must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count = 43;
assert.ok(validatePreferenceCustodyManifestV18Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('release_scope_notice_comprehension_and_collective_exit_authority');
assert.ok(validatePreferenceCustodyManifestV18Build(resolvedFrontierLeak).some(error => /remove the resolved broad release-authority frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV18Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV18Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v18.test.js: OK');
