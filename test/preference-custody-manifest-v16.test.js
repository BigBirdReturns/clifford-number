import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV16,
  validatePreferenceCustodyManifestV16Build
} from '../tools/lib/preference-custody-manifest-v16.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v16.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v16.json', 'utf8'));
const compiled = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v16.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v16.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV16(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV16Build(compiled), []);
assert.equal(compiled.manifest_id, 'preference-custody-laboratory-floor-v16');
assert.equal(compiled.schema_version, 'preference-custody-control-manifest-v16-build@1');
assert.equal(compiled.status, 'laboratory_floor_v16_qualified');
assert.equal(compiled.control_count, 18);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.composition.base_manifest_id, 'preference-custody-laboratory-floor-v15');
assert.equal(compiled.composition.base_control_count, 17);
assert.equal(compiled.composition.extension_control_id, 'PC-18');
assert.equal(compiled.composition.added_promotion_requirement_count, 35);
assert.equal(compiled.composition.final_promotion_requirement_count, compiled.composition.base_promotion_requirement_count + 35);
assert.match(compiled.composition.base_floor_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.match(compiled.composition.extension_snapshot_sha256, /^[0-9a-f]{64}$/);
assert.deepEqual(compiled.controls.map(control => control.control_id), [
  'PC-01','PC-02','PC-03','PC-04','PC-05','PC-06','PC-07','PC-08','PC-09',
  'PC-10','PC-11','PC-12','PC-13','PC-14','PC-15','PC-16','PC-17','PC-18'
]);
assert.ok(Object.values(compiled.control_integrity).every(value => value === true));
assert.equal(compiled.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(compiled.open_frontiers.includes('collective_claim_representation_opt_out_and_distribution_governance'), false);
assert.equal(compiled.open_frontiers.includes('distribution_formula_subgroup_harm_and_algorithmic_allocation_governance'), true);
assert.equal(compiled.open_frontiers.includes('release_scope_notice_comprehension_and_collective_exit_authority'), true);
assert.equal(compiled.identification_requirements.some(item => item.stage === 'collective_representation_notice_optout_release_and_distribution_governance'), true);

const pc18 = compiled.controls.find(control => control.control_id === 'PC-18');
assert.ok(pc18);
assert.equal(pc18.fixture_id, 'same-distributed-status-different-collective-governance-v1');
assert.equal(pc18.failure_class, 'collective_claim_representation_opt_out_release_and_distribution_governance_equifinality');
assert.equal(pc18.graph_effect, 'none');
assert.equal(pc18.counts_toward_thesis_evidence, false);
assert.equal(pc18.conclusion_generated, false);
assert.equal(pc18.real_world_effect_claimed, false);
assert.equal(pc18.preference_change_present, false);
assert.equal(pc18.manipulative_intent_inferable, false);
assert.equal(pc18.required_refusal_rules.every(rule => pc18.observed_refusal_rules.includes(rule)), true);
assert.deepEqual(pc18.proof_summary, {
  world_count: 8,
  distinct_distribution_governance_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_collective_distribution_worlds: 1,
  representation_conflict_worlds: 2,
  notice_optout_failure_worlds: 2,
  claims_burden_low_takeup_worlds: 1,
  formula_disparity_worlds: 1,
  cy_pres_diversion_worlds: 1,
  fee_opacity_worlds: 2,
  overbroad_release_worlds: 4,
  full_affected_population_paid_worlds: 4,
  full_reference_net_paid_worlds: 2,
  reference_formula_match_worlds: 1,
  total_people_paid: 540,
  total_bound_but_unpaid_people: 260,
  total_amount_paid_to_affected: 8400,
  total_durable_compensation_paid: 8400,
  total_unclaimed_or_redirected: 4600,
  total_fees_incentives_and_deductions: 3000,
  binding_public_authority_worlds: 0,
  class_certification_identifies_adequate_representation: false,
  representative_appointment_identifies_absence_of_conflict: false,
  notice_sent_identifies_received_understood_usable_notice: false,
  formal_opt_out_identifies_meaningful_exit: false,
  claim_route_identifies_population_takeup_or_remedy: false,
  settlement_approval_identifies_fair_allocation_or_complete_payment: false,
  gross_fund_identifies_net_distributable_or_beneficiary_payment: false,
  administrator_payment_file_identifies_accurate_audited_distribution: false,
  unclaimed_funds_default_to_defendant_or_cy_pres: false,
  pro_rata_equality_identifies_harm_responsive_fairness: false,
  release_or_class_judgment_identifies_informed_consent: false,
  public_distributed_status_identifies_complete_fair_auditable_appealable_remedy: false,
  binding_public_authority_supported: false,
  complete_collective_distribution_supported_in_at_least_one_world: true
});

assert.equal(compiled.custody_chain.length, 5);
assert.equal(compiled.custody_chain[0].event_type, 'qualified_v15_floor_snapshot');
assert.equal(compiled.custody_chain[1].event_type, 'pc18_collective_distribution_governance_control_admitted');
assert.equal(compiled.custody_chain[2].event_type, 'collective_distribution_frontier_transition_sealed');
assert.equal(compiled.custody_chain[3].event_type, 'collective_distribution_real_case_promotion_boundary_sealed');
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);
assert.match(compiled.custody_chain_head_sha256, /^[0-9a-f]{64}$/);

assert.match(markdown, /Preference custody laboratory floor v16/);
assert.match(markdown, /Controls:\*\* 18/);
assert.match(markdown, /PC-18: collective representation, release, and distribution governance/);
assert.match(markdown, /complete_collective_distribution_worlds: 1/);
assert.match(markdown, /total_bound_but_unpaid_people: 260/);
assert.match(markdown, /distribution_formula_subgroup_harm_and_algorithmic_allocation_governance/);
assert.match(markdown, /release_scope_notice_comprehension_and_collective_exit_authority/);
assert.doesNotMatch(markdown, /named settlement was unfair|binding public authorization|actual representative was inadequate/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyManifestV16(graphLeak).some(error => /graph_effect/.test(error)));

const wrongBase = structuredClone(manifest);
wrongBase.base_floor.manifest_id = 'preference-custody-laboratory-floor-v14';
assert.ok(validatePreferenceCustodyManifestV16(wrongBase).some(error => /base manifest must remain floor v15/.test(error)));

const wrongControl = structuredClone(manifest);
wrongControl.extension_control.control_id = 'PC-19';
assert.ok(validatePreferenceCustodyManifestV16(wrongControl).some(error => /extension control must remain PC-18/.test(error)));

const missingRequirement = structuredClone(manifest);
missingRequirement.real_case_requirements_added.pop();
assert.ok(validatePreferenceCustodyManifestV16(missingRequirement).some(error => /real-case requirements are incomplete/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.frontier_transition.successor_frontiers.pop();
assert.ok(validatePreferenceCustodyManifestV16(frontierLeak).some(error => /successor frontiers are incomplete/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCustodyManifestV16(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.control_count = 19;
assert.ok(validatePreferenceCustodyManifestV16Build(countInflation).some(error => /preserve eighteen controls/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.controls.find(control => control.control_id === 'PC-18').proof_summary.complete_collective_distribution_worlds = 2;
assert.ok(validatePreferenceCustodyManifestV16Build(metricInflation).some(error => /complete_collective_distribution_worlds must equal 1/.test(error)));

const consentLaundering = structuredClone(compiled);
consentLaundering.controls.find(control => control.control_id === 'PC-18').proof_summary.release_or_class_judgment_identifies_informed_consent = true;
assert.ok(validatePreferenceCustodyManifestV16Build(consentLaundering).some(error => /release_or_class_judgment_identifies_informed_consent must remain false/.test(error)));

const promotionInflation = structuredClone(compiled);
promotionInflation.composition.added_promotion_requirement_count = 36;
assert.ok(validatePreferenceCustodyManifestV16Build(promotionInflation).some(error => /promotion requirement counts do not reconcile/.test(error)));

const resolvedFrontierLeak = structuredClone(compiled);
resolvedFrontierLeak.open_frontiers.push('collective_claim_representation_opt_out_and_distribution_governance');
assert.ok(validatePreferenceCustodyManifestV16Build(resolvedFrontierLeak).some(error => /remove the resolved broad collective-distribution frontier/.test(error)));

const authorityInflation = structuredClone(compiled);
authorityInflation.promotion_boundary.laboratory_controls_are_real_world_evidence = true;
assert.ok(validatePreferenceCustodyManifestV16Build(authorityInflation).some(error => /laboratory_controls_are_real_world_evidence must remain false/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.open_frontiers.push('tampered_frontier');
assert.ok(validatePreferenceCustodyManifestV16Build(tamperedChain).some(error => /hash mismatch/.test(error)));

console.log('preference-custody-manifest-v16.test.js: OK');
