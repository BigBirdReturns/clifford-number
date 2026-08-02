import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceRemedyEnforcementFixture,
  renderPreferenceRemedyEnforcementMarkdown,
  simulatePreferenceRemedyEnforcementWorld,
  validatePreferenceRemedyEnforcementBuild,
  validatePreferenceRemedyEnforcementChain,
  validatePreferenceRemedyEnforcementFixture
} from '../tools/lib/preference-remedy-enforcement.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/remedy-enforcement.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceRemedyEnforcementFixture(fixture), []);

const compiled = compilePreferenceRemedyEnforcementFixture(fixture);
assert.deepEqual(validatePreferenceRemedyEnforcementBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-remedied-status-different-enforcement-states-v1');
assert.equal(compiled.issue, 691);
assert.equal(compiled.status, 'remedy_enforcement_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_enforcement_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_durable_collective_remedy_worlds: 1,
  appeal_stay_worlds: 1,
  insolvency_priority_gap_worlds: 2,
  pass_through_failure_worlds: 1,
  claim_fragmentation_worlds: 1,
  successor_liability_gap_worlds: 2,
  clawback_risk_worlds: 1,
  nonmonetary_only_worlds: 1,
  full_gross_payment_worlds: 3,
  full_gross_affected_payment_worlds: 2,
  full_durable_compensation_worlds: 1,
  zero_durable_compensation_worlds: 5,
  collective_standing_worlds: 7,
  total_gross_paid: 6600,
  total_gross_paid_to_affected_people: 4600,
  total_durable_compensation_paid: 2600,
  total_unpaid_durable_obligation: 13400,
  maximum_enforcement_delay_days: 365,
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  judgment_or_settlement_identifies_collected_remedy: false,
  appeal_right_identifies_unstayed_enforcement: false,
  escrow_announcement_identifies_funded_segregated_account: false,
  intermediary_payment_identifies_affected_party_payment: false,
  nominal_collective_eligibility_identifies_usable_collective_standing: false,
  individual_claim_route_identifies_population_remedy: false,
  gross_provisional_payment_identifies_durable_compensation: false,
  insolvency_claim_identifies_priority_or_recovery: false,
  technical_correction_identifies_monetary_restoration: false,
  successor_acquisition_identifies_liability_assumption: false,
  public_remedied_status_identifies_completed_durable_remedy: false,
  uncollected_award_establishes_breach_misconduct_or_intent: false,
  complete_durable_collective_remedy_supported_in_at_least_one_world: true,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false,
  preference_change_present: false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const complete = worlds['segregated-escrow-collective-paid-successor-guarantee'];
assert.equal(complete.flags.complete_durable_collective_remedy, true);
assert.equal(complete.standing.collective_standing, true);
assert.equal(complete.standing.participating_claimants, 100);
assert.equal(complete.instrument.finality_state, 'final_enforceable');
assert.equal(complete.security.escrow_funded_amount, 2000);
assert.equal(complete.security.segregated_for_affected_people, true);
assert.equal(complete.payment.gross_paid, 2000);
assert.equal(complete.payment.paid_to_affected_people, 2000);
assert.equal(complete.payment.durable_compensation_paid, 2000);
assert.equal(complete.succession.successor_assumed_liability, true);
assert.equal(complete.residual.unpaid_durable_obligation, 0);
assert.equal(complete.residual.remedy_durable, true);

const stayed = worlds['final-judgment-stayed-pending-appeal'];
assert.equal(stayed.flags.appeal_stay_present, true);
assert.equal(stayed.instrument.appeal_pending, true);
assert.equal(stayed.instrument.enforcement_stayed, true);
assert.equal(stayed.instrument.bond_posted_amount, 2000);
assert.equal(stayed.payment.durable_compensation_paid, 0);
assert.equal(stayed.residual.unpaid_durable_obligation, 2000);

const insolvency = worlds['unsecured-settlement-insolvency-fractional-recovery'];
assert.equal(insolvency.flags.insolvency_priority_gap_present, true);
assert.equal(insolvency.flags.successor_liability_gap_present, true);
assert.equal(insolvency.insolvency.priority_state, 'low_priority_general_unsecured');
assert.equal(insolvency.payment.durable_compensation_paid, 200);
assert.equal(insolvency.residual.unpaid_durable_obligation, 1800);
assert.equal(insolvency.enforcement.delay_days, 365);

const passThrough = worlds['customer-indemnity-no-affected-pass-through'];
assert.equal(passThrough.flags.pass_through_failure_present, true);
assert.equal(passThrough.flags.full_gross_payment_present, true);
assert.equal(passThrough.payment.gross_paid, 2000);
assert.equal(passThrough.payment.paid_to_affected_people, 0);
assert.equal(passThrough.payment.durable_compensation_paid, 0);
assert.equal(passThrough.payment.intermediary, 'ORG-CUSTOMER');

const fragmented = worlds['individual-arbitration-fragmented-low-takeup'];
assert.equal(fragmented.flags.claim_fragmentation_present, true);
assert.equal(fragmented.standing.collective_standing, false);
assert.equal(fragmented.standing.eligible_claimants, 100);
assert.equal(fragmented.standing.participating_claimants, 20);
assert.equal(fragmented.payment.durable_compensation_paid, 400);
assert.equal(fragmented.residual.unpaid_durable_obligation, 1600);

const successor = worlds['successor-exclusion-original-obligor-dissolved'];
assert.equal(successor.flags.successor_liability_gap_present, true);
assert.equal(successor.flags.insolvency_priority_gap_present, true);
assert.equal(successor.succession.original_obligor_active, false);
assert.equal(successor.succession.successor_assumed_liability, false);
assert.equal(successor.succession.successor_guarantee_state, 'excluded_by_transaction');
assert.equal(successor.payment.gross_paid, 0);

const clawback = worlds['provisional-public-fund-payment-clawback-risk'];
assert.equal(clawback.flags.clawback_risk_present, true);
assert.equal(clawback.flags.full_gross_payment_present, true);
assert.equal(clawback.flags.full_gross_affected_payment_present, true);
assert.equal(clawback.flags.full_durable_compensation_present, false);
assert.equal(clawback.payment.gross_paid, 2000);
assert.equal(clawback.payment.paid_to_affected_people, 2000);
assert.equal(clawback.payment.durable_compensation_paid, 0);
assert.equal(clawback.payment.provisional, true);
assert.equal(clawback.residual.unpaid_durable_obligation, 2000);

const nonmonetary = worlds['nonmonetary-correction-complete-compensation-uncollected'];
assert.equal(nonmonetary.flags.nonmonetary_only_present, true);
assert.equal(nonmonetary.instrument.nonmonetary_correction_complete, true);
assert.equal(nonmonetary.payment.gross_paid, 0);
assert.equal(nonmonetary.payment.durable_compensation_paid, 0);
assert.equal(nonmonetary.residual.unpaid_durable_obligation, 2000);

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.enforcement_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.deepEqual(validatePreferenceRemedyEnforcementChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
  assert.equal(world.public_status_state.technical_correction_state, 'complete');
  assert.equal(world.public_status_state.final_proposal_id, 'A1');
  assert.equal(world.public_status_state.public_incident_status, 'remedied');
  assert.equal(world.public_status_state.eligible_affected_people, 100);
  assert.equal(world.public_status_state.nominal_compensation_obligation, 2000);
  assert.equal(world.payment.durable_compensation_paid + world.residual.unpaid_durable_obligation, 2000);
}

const direct = simulatePreferenceRemedyEnforcementWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'provisional-public-fund-payment-clawback-risk')
);
assert.equal(direct.flags.full_gross_affected_payment_present, true);
assert.equal(direct.flags.full_durable_compensation_present, false);
assert.equal(direct.flags.clawback_risk_present, true);

const markdown = renderPreferenceRemedyEnforcementMarkdown(compiled);
assert.match(markdown, /Collective remedy enforcement, insolvency, priority, and successor custody/);
assert.match(markdown, /\*\*Public incident status:\*\* remedied/);
assert.match(markdown, /\*\*Nominal compensation obligation:\*\* 2000/);
assert.match(markdown, /segregated-escrow-collective-paid-successor-guarantee/);
assert.match(markdown, /Complete durable collective remedy: true/);
assert.match(markdown, /final-judgment-stayed-pending-appeal/);
assert.match(markdown, /Enforcement stayed: true/);
assert.match(markdown, /customer-indemnity-no-affected-pass-through/);
assert.match(markdown, /Gross paid: 2000/);
assert.match(markdown, /Paid to affected people: 0/);
assert.match(markdown, /provisional-public-fund-payment-clawback-risk/);
assert.match(markdown, /Durable compensation: 0/);
assert.doesNotMatch(markdown, /named successor evaded liability|judgment is uncollectible in reality|breach confirmed|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceRemedyEnforcementFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceRemedyEnforcementFixture(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceRemedyEnforcementFixture(missingWorld).some(error => /exactly the eight required remedy-enforcement worlds/.test(error)));

const populationLeak = structuredClone(fixture);
populationLeak.worlds[0].standing.eligible_claimants = 99;
assert.ok(validatePreferenceRemedyEnforcementFixture(populationLeak).some(error => /must preserve the eligible claimant population/.test(error)));

const falseSegregation = structuredClone(fixture);
const completeWorld = falseSegregation.worlds.find(world => world.world_id === 'segregated-escrow-collective-paid-successor-guarantee');
completeWorld.security.escrow_funded_amount = 0;
assert.ok(validatePreferenceRemedyEnforcementFixture(falseSegregation).some(error => /segregated account must preserve positive funding/.test(error)));

const paymentInflation = structuredClone(fixture);
paymentInflation.worlds.find(world => world.world_id === 'customer-indemnity-no-affected-pass-through').payment.paid_to_affected_people = 2100;
assert.ok(validatePreferenceRemedyEnforcementFixture(paymentInflation).some(error => /cannot exceed gross payment/.test(error)));

const clawbackLaundering = structuredClone(fixture);
clawbackLaundering.worlds.find(world => world.world_id === 'provisional-public-fund-payment-clawback-risk').payment.provisional = false;
assert.ok(validatePreferenceRemedyEnforcementFixture(clawbackLaundering).some(error => /clawback risk must remain provisional/.test(error)));

const unpaidLedgerLeak = structuredClone(fixture);
unpaidLedgerLeak.worlds.find(world => world.world_id === 'individual-arbitration-fragmented-low-takeup').residual.unpaid_durable_obligation = 0;
assert.ok(validatePreferenceRemedyEnforcementFixture(unpaidLedgerLeak).some(error => /unpaid durable obligation does not reconcile/.test(error)));

const appealPromotion = structuredClone(fixture);
appealPromotion.worlds.find(world => world.world_id === 'final-judgment-stayed-pending-appeal').expected_flags.appeal_stay_present = false;
assert.throws(() => compilePreferenceRemedyEnforcementFixture(appealPromotion), /appeal_stay_present mismatch/);

const collectiveInflation = structuredClone(fixture);
collectiveInflation.worlds.find(world => world.world_id === 'individual-arbitration-fragmented-low-takeup').expected_flags.claim_fragmentation_present = false;
assert.throws(() => compilePreferenceRemedyEnforcementFixture(collectiveInflation), /claim_fragmentation_present mismatch/);

const grossAsDurableLeak = structuredClone(fixture);
grossAsDurableLeak.expected_classification.gross_provisional_payment_identifies_durable_compensation = true;
assert.ok(validatePreferenceRemedyEnforcementFixture(grossAsDurableLeak).some(error => /gross_provisional_payment_identifies_durable_compensation/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceRemedyEnforcementFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const breachLeak = structuredClone(fixture);
breachLeak.expected_classification.uncollected_award_establishes_breach_misconduct_or_intent = true;
assert.ok(validatePreferenceRemedyEnforcementFixture(breachLeak).some(error => /uncollected_award_establishes_breach_misconduct_or_intent/.test(error)));

const tamperedBuild = structuredClone(compiled);
const tamperedWorld = tamperedBuild.worlds.find(world => world.world_id === 'segregated-escrow-collective-paid-successor-guarantee');
tamperedWorld.custody_chain[2].payload.payment.durable_compensation_paid = 1999;
assert.ok(validatePreferenceRemedyEnforcementBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_durable_collective_remedy_worlds = 2;
assert.ok(validatePreferenceRemedyEnforcementBuild(metricInflation).some(error => /complete_durable_collective_remedy_worlds must equal 1/.test(error)));

const preferenceClaimLeak = structuredClone(compiled);
preferenceClaimLeak.classification.preference_change_present = true;
assert.ok(validatePreferenceRemedyEnforcementBuild(preferenceClaimLeak).some(error => /preference_change_present must remain false/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceRemedyEnforcementFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-remedy-enforcement.test.js: OK');
