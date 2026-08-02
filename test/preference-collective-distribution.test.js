import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceCollectiveDistributionFixture,
  renderPreferenceCollectiveDistributionMarkdown,
  simulatePreferenceCollectiveDistributionWorld,
  validatePreferenceCollectiveDistributionBuild,
  validatePreferenceCollectiveDistributionChain,
  validatePreferenceCollectiveDistributionFixture
} from '../tools/lib/preference-collective-distribution.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/collective-distribution.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceCollectiveDistributionFixture(fixture), []);

const compiled = compilePreferenceCollectiveDistributionFixture(fixture);
assert.deepEqual(validatePreferenceCollectiveDistributionBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-distributed-status-different-collective-governance-v1');
assert.equal(compiled.status, 'collective_distribution_governance_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
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
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  class_certification_identifies_adequate_representation:false,
  representative_appointment_identifies_absence_of_conflict:false,
  notice_sent_identifies_received_understood_usable_notice:false,
  formal_opt_out_identifies_meaningful_exit:false,
  claim_route_identifies_population_takeup_or_remedy:false,
  settlement_approval_identifies_fair_allocation_or_complete_payment:false,
  gross_fund_identifies_net_distributable_or_beneficiary_payment:false,
  administrator_payment_file_identifies_accurate_audited_distribution:false,
  unclaimed_funds_default_to_defendant_or_cy_pres:false,
  pro_rata_equality_identifies_harm_responsive_fairness:false,
  release_or_class_judgment_identifies_informed_consent:false,
  public_distributed_status_identifies_complete_fair_auditable_appealable_remedy:false,
  complete_collective_distribution_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const complete = worlds['adequate-representation-automatic-audited-distribution'];
assert.equal(complete.flags.complete_collective_distribution, true);
assert.equal(complete.representation.adequacy_state, 'adequate');
assert.equal(complete.notice.delivered_count, 100);
assert.equal(complete.notice.comprehended_count, 100);
assert.equal(complete.notice.meaningful_opt_out, true);
assert.equal(complete.claims.approved_count, 100);
assert.equal(complete.release.overbroad, false);
assert.equal(complete.fund.net_distributable, 1800);
assert.equal(complete.allocation.people_paid, 100);
assert.equal(complete.allocation.amount_paid_to_affected, 1800);
assert.equal(complete.allocation.durable_compensation_paid, 1800);
assert.equal(complete.unclaimed.amount, 0);
assert.equal(complete.governance.audit_state, 'independent_complete');
assert.equal(complete.flags.reference_formula_match, true);

assert.equal(worlds['representative-conflict-side-payment-skew'].flags.representation_conflict_present, true);
assert.equal(worlds['representative-conflict-side-payment-skew'].flags.fee_opacity_present, true);
assert.equal(worlds['notice-failure-binds-unnotified-population'].flags.notice_optout_failure_present, true);
assert.equal(worlds['claims-made-high-burden-low-takeup-reversion'].flags.claims_burden_low_takeup_present, true);
assert.equal(worlds['algorithmic-formula-undercompensates-high-harm-group'].flags.formula_disparity_present, true);
assert.equal(worlds['cy-pres-diversion-away-from-affected-population'].flags.cy_pres_diversion_present, true);
assert.equal(worlds['opaque-administrator-fees-and-deductions'].flags.fee_opacity_present, true);
assert.equal(worlds['overbroad-release-binds-excluded-unpaid-people'].flags.overbroad_release_present, true);
assert.equal(worlds['overbroad-release-binds-excluded-unpaid-people'].bound_but_unpaid_people, 30);

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.distribution_governance_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_status_state.public_remedy_status, 'distributed');
  assert.equal(world.public_status_state.technical_correction_state, 'complete');
  assert.equal(world.public_status_state.final_proposal_id, 'A1');
  assert.equal(world.public_status_state.affected_population, 100);
  assert.equal(world.public_status_state.gross_remedy_fund, 2000);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.distribution_governance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(validatePreferenceCollectiveDistributionChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceCollectiveDistributionWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'claims-made-high-burden-low-takeup-reversion')
);
assert.equal(direct.flags.claims_burden_low_takeup_present, true);
assert.ok(direct.bound_but_unpaid_people > 0);

const markdown = renderPreferenceCollectiveDistributionMarkdown(compiled);
assert.match(markdown, /Collective representation, opt-out, release, and distribution-governance custody/);
assert.match(markdown, /adequate-representation-automatic-audited-distribution/);
assert.match(markdown, /Complete collective distribution: true/);
assert.match(markdown, /claims-made-high-burden-low-takeup-reversion/);
assert.match(markdown, /cy-pres-diversion-away-from-affected-population/);
assert.match(markdown, /overbroad-release-binds-excluded-unpaid-people/);
assert.match(markdown, /total_bound_but_unpaid_people: 260/);
assert.doesNotMatch(markdown, /named court failed|actual class was unfair|binding public authorization|manipulated the class/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCollectiveDistributionFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceCollectiveDistributionFixture(thesisLeak).some(error => /must remain false/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceCollectiveDistributionFixture(missingWorld).some(error => /exactly the eight required collective-distribution worlds/.test(error)));

const populationMutation = structuredClone(fixture);
populationMutation.baseline.affected_population = 99;
assert.ok(validatePreferenceCollectiveDistributionFixture(populationMutation).some(error => /affected population must remain 100|affected groups must sum to 100/.test(error)));

const noticeChainBreak = structuredClone(fixture);
const noticeState = noticeChainBreak.worlds[0].notice;
noticeState.delivered_count = noticeState.sent_count + 1;
assert.ok(validatePreferenceCollectiveDistributionFixture(noticeChainBreak).some(error => /notice counts do not form a valid custody chain/.test(error)));

const claimInflation = structuredClone(fixture);
const claimState = claimInflation.worlds[0].claims;
claimState.approved_count = claimState.submitted_count + 1;
assert.ok(validatePreferenceCollectiveDistributionFixture(claimInflation).some(error => /claim counts are inconsistent/.test(error)));

const fundInflation = structuredClone(fixture);
fundInflation.worlds[0].fund.gross_fund = 2100;
assert.ok(validatePreferenceCollectiveDistributionFixture(fundInflation).some(error => /gross fund must remain 2000|fund does not reconcile/.test(error)));

const deductionMismatch = structuredClone(fixture);
deductionMismatch.worlds[0].fund.other_deductions = 1;
assert.ok(validatePreferenceCollectiveDistributionFixture(deductionMismatch).some(error => /fund does not reconcile/.test(error)));

const representationPaymentMismatch = structuredClone(fixture);
representationPaymentMismatch.worlds[0].representation.counsel_fee = 101;
assert.ok(validatePreferenceCollectiveDistributionFixture(representationPaymentMismatch).some(error => /representation payments do not match the fund ledger/.test(error)));

const groupPaymentMismatch = structuredClone(fixture);
groupPaymentMismatch.worlds[0].allocation.group_payments['HIGH-HARM'] += 1;
assert.ok(validatePreferenceCollectiveDistributionFixture(groupPaymentMismatch).some(error => /group payments do not reconcile to affected payment/.test(error)));

const unclaimedMismatch = structuredClone(fixture);
unclaimedMismatch.worlds.find(world => world.world_id === 'claims-made-high-burden-low-takeup-reversion').unclaimed.reversion_amount += 1;
assert.ok(validatePreferenceCollectiveDistributionFixture(unclaimedMismatch).some(error => /unclaimed disposition does not reconcile/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds.find(world => world.world_id === 'representative-conflict-side-payment-skew').expected_flags.representation_conflict_present = false;
assert.throws(() => compilePreferenceCollectiveDistributionFixture(expectedFlagLeak), /representation_conflict_present mismatch/);

const falseNoticeRecovery = structuredClone(fixture);
const falseNoticeWorld = falseNoticeRecovery.worlds.find(world => world.world_id === 'notice-failure-binds-unnotified-population');
falseNoticeWorld.notice.sent_count = 100;
falseNoticeWorld.notice.delivered_count = 100;
falseNoticeWorld.notice.acknowledged_count = 100;
falseNoticeWorld.notice.comprehended_count = 100;
falseNoticeWorld.notice.meaningful_opt_out = true;
assert.throws(() => compilePreferenceCollectiveDistributionFixture(falseNoticeRecovery), /notice_optout_failure_present mismatch/);

const falseFormulaRepair = structuredClone(fixture);
falseFormulaRepair.worlds.find(world => world.world_id === 'algorithmic-formula-undercompensates-high-harm-group').allocation.fairness_state = 'reference_match';
assert.throws(() => compilePreferenceCollectiveDistributionFixture(falseFormulaRepair), /formula_disparity_present mismatch/);

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceCollectiveDistributionFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const consentLeak = structuredClone(fixture);
consentLeak.expected_classification.release_or_class_judgment_identifies_informed_consent = true;
assert.ok(validatePreferenceCollectiveDistributionFixture(consentLeak).some(error => /release_or_class_judgment_identifies_informed_consent/.test(error)));

const tamperedBuild = structuredClone(compiled);
const tamperedWorld = tamperedBuild.worlds.find(world => world.world_id === 'adequate-representation-automatic-audited-distribution');
tamperedWorld.custody_chain[3].payload.deductions = 999;
assert.ok(validatePreferenceCollectiveDistributionBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_collective_distribution_worlds = 2;
assert.ok(validatePreferenceCollectiveDistributionBuild(metricInflation).some(error => /complete_collective_distribution_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceCollectiveDistributionFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-collective-distribution.test.js: OK');
