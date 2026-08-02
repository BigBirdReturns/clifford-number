import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceLiabilityRemedyFixture,
  renderPreferenceLiabilityRemedyMarkdown,
  simulatePreferenceLiabilityRemedyWorld,
  validatePreferenceLiabilityRemedyBuild,
  validatePreferenceLiabilityRemedyChain,
  validatePreferenceLiabilityRemedyFixture
} from '../tools/lib/preference-liability-remedy.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/liability-remedy.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceLiabilityRemedyFixture(fixture), []);

const compiled = compilePreferenceLiabilityRemedyFixture(fixture);
assert.deepEqual(validatePreferenceLiabilityRemedyBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-recovery-different-liability-remedy-v1');
assert.equal(compiled.issue, 686);
assert.equal(compiled.status, 'liability_remedy_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_liability_remedy_signatures: 8,
  distinct_public_status_signatures: 1,
  complete_governance_and_remedy_worlds: 1,
  complete_affected_party_compensation_worlds: 2,
  direct_standing_absent_worlds: 3,
  liability_cap_worlds: 1,
  circular_indemnity_worlds: 1,
  upstream_disclaimer_worlds: 1,
  insurance_exclusion_worlds: 1,
  forum_fragmentation_worlds: 2,
  causation_burden_block_worlds: 1,
  insurance_payment_worlds: 1,
  customer_concentrated_loss_worlds: 1,
  externalized_loss_worlds: 6,
  unresolved_liability_worlds: 4,
  total_paid_across_worlds: 10750,
  total_affected_party_compensation_paid: 5000,
  total_uncompensated_affected_party_harm: 11000,
  total_externalized_loss: 17250,
  maximum_enforcement_delay_days: 365,
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  technical_recovery_identifies_loss_allocation: false,
  vendor_indemnity_identifies_direct_public_remedy: false,
  contractual_indemnity_identifies_payment: false,
  liability_cap_identifies_complete_compensation: false,
  insurance_policy_identifies_covered_or_paid_claim: false,
  claim_acceptance_identifies_full_indemnification: false,
  customer_payment_identifies_correct_cross_organizational_allocation: false,
  forum_availability_identifies_timely_enforceable_remedy: false,
  public_recovered_status_identifies_compensated_population: false,
  correction_identifies_monetary_or_nonmonetary_restoration: false,
  uncompensated_loss_establishes_breach_misconduct_or_intent: false,
  complete_joint_allocation_supported_in_at_least_one_world: true,
  complete_affected_party_compensation_supported_in_at_least_one_world: true,
  binding_public_authority_supported: false,
  manipulative_intent_inferable: false,
  real_world_effect_claimed: false,
  preference_change_present: false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const complete = worlds['complete-joint-allocation-insurance-paid-remedy'];
assert.equal(complete.flags.complete_governance_and_remedy, true);
assert.equal(complete.flags.complete_affected_party_compensation, true);
assert.equal(complete.flags.insurance_payment_present, true);
assert.equal(complete.contract.contractual_allocation_complete, true);
assert.equal(complete.claim.direct_standing, true);
assert.equal(complete.insurance.paid_amount, 1500);
assert.equal(complete.payments.total_paid, 3500);
assert.equal(complete.payments.affected_party_compensation_paid, 2000);
assert.equal(complete.residual.uncompensated_affected_party_harm, 0);
assert.equal(complete.residual.externalized_loss, 0);
assert.equal(complete.residual.remedy_durable_after_succession, true);

const customerOnly = worlds['vendor-indemnity-customer-only-no-public-standing'];
assert.equal(customerOnly.flags.direct_standing_absent, true);
assert.equal(customerOnly.flags.complete_affected_party_compensation, false);
assert.equal(customerOnly.payments.total_paid, 1500);
assert.equal(customerOnly.payments.affected_party_compensation_paid, 0);
assert.equal(customerOnly.residual.uncompensated_affected_party_harm, 2000);
assert.equal(customerOnly.residual.externalized_loss, 2000);

const capped = worlds['liability-cap-externalizes-balance'];
assert.equal(capped.flags.liability_cap_present, true);
assert.equal(capped.contract.liability_cap, 500);
assert.equal(capped.payments.affected_party_compensation_paid, 500);
assert.equal(capped.residual.externalized_loss, 3000);

const circular = worlds['circular-mutual-indemnities-no-primary-payer'];
assert.equal(circular.flags.circular_indemnity_present, true);
assert.equal(circular.flags.forum_fragmentation_present, true);
assert.equal(circular.flags.unresolved_liability_present, true);
assert.equal(circular.payments.total_paid, 0);
assert.equal(circular.residual.externalized_loss, 3500);

const disclaimer = worlds['upstream-disclaimer-customer-concentrated-loss'];
assert.equal(disclaimer.flags.upstream_disclaimer_present, true);
assert.equal(disclaimer.flags.customer_concentrated_loss, true);
assert.equal(disclaimer.flags.complete_affected_party_compensation, true);
assert.equal(disclaimer.flags.complete_governance_and_remedy, false);
assert.equal(disclaimer.payments.by_payer['ORG-CUSTOMER'], 3500);
assert.equal(disclaimer.residual.externalized_loss, 0);

const exclusion = worlds['insurance-exclusion-defeats-expected-recovery'];
assert.equal(exclusion.flags.insurance_exclusion_present, true);
assert.equal(exclusion.insurance.policy_id, 'POLICY-LR-02');
assert.equal(exclusion.insurance.coverage_state, 'excluded');
assert.equal(exclusion.insurance.claim_paid, false);
assert.equal(exclusion.flags.insurance_payment_present, false);
assert.equal(exclusion.residual.externalized_loss, 3000);

const fragmented = worlds['fragmented-forum-delays-payment'];
assert.equal(fragmented.flags.forum_fragmentation_present, true);
assert.equal(fragmented.forum.enforcement_delay_days, 365);
assert.equal(fragmented.payments.total_paid, 1000);
assert.equal(fragmented.residual.unresolved_liability, true);

const causation = worlds['causation-burden-blocks-public-fund'];
assert.equal(causation.flags.causation_burden_block_present, true);
assert.equal(causation.claim.public_fund_state, 'denied_for_causation');
assert.equal(causation.payments.by_payer['PUBLIC-FUND'], 0);
assert.equal(causation.residual.externalized_loss, 3250);

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.liability_remedy_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.deepEqual(validatePreferenceLiabilityRemedyChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
  assert.equal(world.public_status_state.technical_recovery_state, 'complete');
  assert.equal(world.public_status_state.final_proposal_id, 'A1');
  assert.equal(world.public_status_state.public_incident_status, 'recovered');
  assert.equal(world.public_status_state.total_loss, 3500);
  assert.equal(world.payments.total_paid + world.residual.externalized_loss, 3500);
  assert.equal(world.payments.affected_party_compensation_paid + world.residual.uncompensated_affected_party_harm, 2000);
}

const direct = simulatePreferenceLiabilityRemedyWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'upstream-disclaimer-customer-concentrated-loss')
);
assert.equal(direct.flags.complete_affected_party_compensation, true);
assert.equal(direct.flags.customer_concentrated_loss, true);
assert.equal(direct.flags.complete_governance_and_remedy, false);

const markdown = renderPreferenceLiabilityRemedyMarkdown(compiled);
assert.match(markdown, /Federated liability, loss allocation, insurance, and public-remedy custody/);
assert.match(markdown, /\*\*Technical recovery:\*\* complete/);
assert.match(markdown, /\*\*Total loss per world:\*\* 3500/);
assert.match(markdown, /complete-joint-allocation-insurance-paid-remedy/);
assert.match(markdown, /Complete governance and remedy: true/);
assert.match(markdown, /vendor-indemnity-customer-only-no-public-standing/);
assert.match(markdown, /Affected-party compensation: 0/);
assert.match(markdown, /liability-cap-externalizes-balance/);
assert.match(markdown, /Externalized loss: 3000/);
assert.match(markdown, /upstream-disclaimer-customer-concentrated-loss/);
assert.match(markdown, /Total paid: 3500/);
assert.match(markdown, /fragmented-forum-delays-payment/);
assert.match(markdown, /Enforcement delay: 365 days/);
assert.doesNotMatch(markdown, /named organization breached|insurer unlawfully denied|negligence established|publicly authorized/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceLiabilityRemedyFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceLiabilityRemedyFixture(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceLiabilityRemedyFixture(missingWorld).some(error => /exactly the eight required liability-remedy worlds/.test(error)));

const lossLedgerLeak = structuredClone(fixture);
lossLedgerLeak.baseline.loss_ledger.total_loss = 3600;
assert.ok(validatePreferenceLiabilityRemedyFixture(lossLedgerLeak).some(error => /must reconcile to 3500/.test(error)));

const payerLedgerLeak = structuredClone(fixture);
payerLedgerLeak.worlds[0].payments.by_payer['ORG-VENDOR'] += 1;
assert.ok(validatePreferenceLiabilityRemedyFixture(payerLedgerLeak).some(error => /payer ledger does not reconcile/.test(error)));

const standingLaundering = structuredClone(fixture);
standingLaundering.worlds.find(world => world.world_id === 'vendor-indemnity-customer-only-no-public-standing').claim.direct_standing = true;
assert.ok(validatePreferenceLiabilityRemedyFixture(standingLaundering).some(error => /direct standing must match/.test(error)));

const insurancePaymentLaundering = structuredClone(fixture);
const exclusionWorld = insurancePaymentLaundering.worlds.find(world => world.world_id === 'insurance-exclusion-defeats-expected-recovery');
exclusionWorld.insurance.claim_paid = true;
assert.ok(validatePreferenceLiabilityRemedyFixture(insurancePaymentLaundering).some(error => /claim_paid must match paid_amount/.test(error)));

const residualLaundering = structuredClone(fixture);
residualLaundering.worlds.find(world => world.world_id === 'liability-cap-externalizes-balance').residual.externalized_loss = 0;
assert.ok(validatePreferenceLiabilityRemedyFixture(residualLaundering).some(error => /externalized loss does not reconcile/.test(error)));

const capPromotion = structuredClone(fixture);
capPromotion.worlds.find(world => world.world_id === 'liability-cap-externalizes-balance').expected_flags.liability_cap_present = false;
assert.throws(() => compilePreferenceLiabilityRemedyFixture(capPromotion), /liability_cap_present mismatch/);

const completeInflation = structuredClone(fixture);
completeInflation.worlds.find(world => world.world_id === 'upstream-disclaimer-customer-concentrated-loss').expected_flags.complete_governance_and_remedy = true;
assert.throws(() => compilePreferenceLiabilityRemedyFixture(completeInflation), /complete_governance_and_remedy mismatch/);

const policyAsPaymentLeak = structuredClone(fixture);
policyAsPaymentLeak.expected_classification.insurance_policy_identifies_covered_or_paid_claim = true;
assert.ok(validatePreferenceLiabilityRemedyFixture(policyAsPaymentLeak).some(error => /insurance_policy_identifies_covered_or_paid_claim/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceLiabilityRemedyFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const breachLeak = structuredClone(fixture);
breachLeak.expected_classification.uncompensated_loss_establishes_breach_misconduct_or_intent = true;
assert.ok(validatePreferenceLiabilityRemedyFixture(breachLeak).some(error => /uncompensated_loss_establishes_breach_misconduct_or_intent/.test(error)));

const tamperedBuild = structuredClone(compiled);
const tamperedWorld = tamperedBuild.worlds.find(world => world.world_id === 'complete-joint-allocation-insurance-paid-remedy');
tamperedWorld.custody_chain[4].payload.total_paid = 3499;
assert.ok(validatePreferenceLiabilityRemedyBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_governance_and_remedy_worlds = 2;
assert.ok(validatePreferenceLiabilityRemedyBuild(metricInflation).some(error => /complete_governance_and_remedy_worlds must equal 1/.test(error)));

const preferenceClaimLeak = structuredClone(compiled);
preferenceClaimLeak.classification.preference_change_present = true;
assert.ok(validatePreferenceLiabilityRemedyBuild(preferenceClaimLeak).some(error => /preference_change_present must remain false/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceLiabilityRemedyFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-liability-remedy.test.js: OK');
