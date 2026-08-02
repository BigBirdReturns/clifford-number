import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceChoiceArchitectureFixture,
  renderPreferenceChoiceArchitectureMarkdown,
  simulatePreferenceChoiceArchitectureWorld,
  validatePreferenceChoiceArchitectureBuild,
  validatePreferenceChoiceArchitectureChain,
  validatePreferenceChoiceArchitectureFixture
} from '../tools/lib/preference-choice-architecture.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/choice-architecture.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceChoiceArchitectureFixture(fixture), []);

const compiled = compilePreferenceChoiceArchitectureFixture(fixture);
assert.deepEqual(validatePreferenceChoiceArchitectureBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-choice-final-status-different-architecture-agency-v1');
assert.equal(compiled.issue, 727);
assert.equal(compiled.status, 'choice_architecture_exit_authorship_assent_payment_sequence_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
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
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  verified_comprehension_identifies_neutral_self_authored_choice:false,
  visible_option_identifies_symmetric_path_cost:false,
  completed_choice_field_identifies_active_choice:false,
  nonresponse_or_timeout_identifies_assent:false,
  recorded_exit_rate_identifies_intended_exit_or_completed_agency:false,
  representative_operator_action_identifies_affected_person_authorship:false,
  bundled_benefit_acceptance_identifies_independent_assent:false,
  payment_retention_identifies_prior_assent:false,
  repayment_clawback_route_identifies_meaningful_exit:false,
  formal_cooling_off_text_identifies_usable_reconsideration:false,
  same_recorded_disposition_identifies_same_architecture_intention_authorship_assent_authority:false,
  architecture_pressure_identifies_coercion_manipulation_breach_misconduct_intent:false,
  public_choice_final_status_identifies_neutral_self_authored_reversible_auditable_authorized_choice:false,
  complete_neutral_choice_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['neutral-symmetric-active-choice-before-payment'];
assert.equal(positive.flags.complete_neutral_choice_path, true);
assert.equal(positive.flags.default_binding_present, false);
assert.equal(positive.flags.asymmetric_path_cost_present, false);
assert.equal(positive.flags.urgency_pressure_present, false);
assert.equal(positive.flags.confirmation_asymmetry_present, false);
assert.equal(positive.flags.bundled_assent_present, false);
assert.equal(positive.flags.representative_substitution_present, false);
assert.equal(positive.flags.payment_clawback_present, false);
assert.equal(positive.flags.intended_exit_suppression_present, false);
assert.equal(positive.flags.self_authorship_complete, true);
assert.equal(positive.flags.explicit_assent_complete, true);
assert.equal(positive.flags.meaningful_reversal_available, true);
assert.equal(positive.agency.intended_exit_count, 5);
assert.equal(positive.agency.completed_exit_count, 5);
assert.equal(positive.reversal.reversal_completed_count, 2);
assert.equal(positive.payment.timing, 'after_choice');

const defaultWorld = worlds['binding-by-default-suppresses-intended-exit'];
assert.equal(defaultWorld.flags.default_binding_present, true);
assert.equal(defaultWorld.flags.intended_exit_suppression_present, true);
assert.equal(defaultWorld.agency.intended_exit_count, 20);
assert.equal(defaultWorld.agency.completed_exit_count, 5);
assert.equal(defaultWorld.suppressed_exit_intentions, 15);
assert.equal(defaultWorld.agency.default_or_automated_recorded_choice_count, 80);
assert.equal(defaultWorld.agency.inferred_assent_count, 80);
assert.equal(defaultWorld.flags.meaningful_reversal_available, true);

const pathCost = worlds['exit-authentication-and-cost-asymmetry'];
assert.equal(pathCost.flags.asymmetric_path_cost_present, true);
assert.equal(pathCost.interface.bind_authentication, 'account_login');
assert.equal(pathCost.interface.exit_authentication, 'notarized_mail_and_photo_id');
assert.equal(pathCost.interface.bind_monetary_cost, 0);
assert.equal(pathCost.interface.exit_monetary_cost, 25);
assert.equal(pathCost.agency.intended_exit_count, 15);
assert.equal(pathCost.agency.completed_exit_count, 5);

const urgency = worlds['urgent-countdown-compresses-exit-completion'];
assert.equal(urgency.flags.urgency_pressure_present, true);
assert.equal(urgency.interface.deadline_days, 1);
assert.equal(urgency.interface.urgency_state, 'high_countdown_and_expiring_banner');
assert.equal(urgency.suppressed_exit_intentions, 7);

const confirmation = worlds['exit-requires-repeated-confirmation'];
assert.equal(confirmation.flags.confirmation_asymmetry_present, true);
assert.equal(confirmation.interface.bind_confirmations, 1);
assert.equal(confirmation.interface.exit_confirmations, 4);
assert.equal(confirmation.suppressed_exit_intentions, 5);

const bundle = worlds['assent-bundled-with-payment-access'];
assert.equal(bundle.flags.bundled_assent_present, true);
assert.equal(bundle.bundling.benefit_id, 'PAYMENT-ACCESS');
assert.equal(bundle.bundling.independent_choice_available, false);
assert.equal(bundle.bundling.severable, false);
assert.equal(bundle.flags.self_authorship_complete, true);
assert.equal(bundle.flags.explicit_assent_complete, false);

const substitution = worlds['representative-or-operator-substitutes-choice'];
assert.equal(substitution.flags.representative_substitution_present, true);
assert.equal(substitution.agency.representative_substituted_choice_count, 30);
assert.equal(substitution.agency.self_authored_choice_count, 70);
assert.equal(substitution.agency.explicit_assent_count, 65);
assert.equal(substitution.agency.inferred_assent_count, 30);
assert.equal(substitution.reversal.reversal_attempt_count, 5);
assert.equal(substitution.reversal.reversal_completed_count, 0);
assert.equal(substitution.flags.meaningful_reversal_available, false);

const paymentFirst = worlds['payment-before-choice-with-clawback-exit'];
assert.equal(paymentFirst.flags.payment_clawback_present, true);
assert.equal(paymentFirst.flags.asymmetric_path_cost_present, true);
assert.equal(paymentFirst.flags.urgency_pressure_present, true);
assert.equal(paymentFirst.flags.confirmation_asymmetry_present, true);
assert.equal(paymentFirst.flags.bundled_assent_present, true);
assert.equal(paymentFirst.payment.timing, 'before_choice');
assert.equal(paymentFirst.payment.repayment_required_to_exit, true);
assert.equal(paymentFirst.payment.clawback_exposed_count, 95);
assert.equal(paymentFirst.payment.retention_inferred_assent, true);
assert.equal(paymentFirst.agency.intended_exit_count, 20);
assert.equal(paymentFirst.agency.completed_exit_count, 5);
assert.equal(paymentFirst.suppressed_exit_intentions, 15);

const publicSignatures = new Set(compiled.worlds.map(world => world.public_status_signature_sha256));
const architectureSignatures = new Set(compiled.worlds.map(world => world.architecture_governance_signature_sha256));
assert.equal(publicSignatures.size, 1);
assert.equal(architectureSignatures.size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.comprehension_verified_count, 100);
  assert.equal(world.public_claim.recorded_bound_count, 95);
  assert.equal(world.public_claim.recorded_exit_count, 5);
  assert.equal(world.payment.payment_count, 100);
  assert.equal(world.payment.amount_paid, 1800);
  assert.deepEqual(validatePreferenceChoiceArchitectureChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceChoiceArchitectureWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'payment-before-choice-with-clawback-exit')
);
assert.equal(direct.flags.payment_clawback_present, true);
assert.equal(direct.flags.intended_exit_suppression_present, true);
assert.equal(direct.public_claim.public_choice_status, 'choice_final');

const markdown = renderPreferenceChoiceArchitectureMarkdown(compiled);
assert.match(markdown, /Choice architecture, exit authorship, assent, and payment-sequence custody/);
assert.match(markdown, /neutral-symmetric-active-choice-before-payment/);
assert.match(markdown, /Complete neutral choice: true/);
assert.match(markdown, /binding-by-default-suppresses-intended-exit/);
assert.match(markdown, /Default: bound_by_default/);
assert.match(markdown, /exit-authentication-and-cost-asymmetry/);
assert.match(markdown, /Exit path: 5 steps, 1 confirmations, cost 25/);
assert.match(markdown, /payment-before-choice-with-clawback-exit/);
assert.match(markdown, /Clawback exposure: 95/);
assert.doesNotMatch(markdown, /named interface coerced|manipulation confirmed|publicly authorized|illegal architecture/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceChoiceArchitectureFixture(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(fixture);
issueLeak.issue = 718;
assert.ok(validatePreferenceChoiceArchitectureFixture(issueLeak).some(error => /issue must remain 727/.test(error)));

const publicClaimDrift = structuredClone(fixture);
publicClaimDrift.worlds[0].public_claim.recorded_exit_count = 6;
assert.ok(validatePreferenceChoiceArchitectureFixture(publicClaimDrift).some(error => /frozen public claim/.test(error)));

const intentionMismatch = structuredClone(fixture);
intentionMismatch.worlds[0].agency.abandoned_exit_count = 1;
assert.ok(validatePreferenceChoiceArchitectureFixture(intentionMismatch).some(error => /intended exits must reconcile/.test(error)));

const authorshipMismatch = structuredClone(fixture);
authorshipMismatch.worlds[0].agency.self_authored_choice_count = 99;
assert.ok(validatePreferenceChoiceArchitectureFixture(authorshipMismatch).some(error => /choice authorship counts must reconcile/.test(error)));

const assentMismatch = structuredClone(fixture);
assentMismatch.worlds[0].agency.explicit_assent_count = 94;
assert.ok(validatePreferenceChoiceArchitectureFixture(assentMismatch).some(error => /assent counts must reconcile/.test(error)));

const paymentDrift = structuredClone(fixture);
paymentDrift.worlds[0].payment.amount_paid = 1799;
assert.ok(validatePreferenceChoiceArchitectureFixture(paymentDrift).some(error => /frozen payment state/.test(error)));

const reversalLeak = structuredClone(fixture);
reversalLeak.worlds.find(world => world.world_id === 'exit-authentication-and-cost-asymmetry').reversal.reversal_attempt_count = 1;
assert.ok(validatePreferenceChoiceArchitectureFixture(reversalLeak).some(error => /unavailable reversal route/.test(error)));

const falseDefaultRepair = structuredClone(fixture);
const defaultFixture = falseDefaultRepair.worlds.find(world => world.world_id === 'binding-by-default-suppresses-intended-exit');
defaultFixture.interface.default_state = 'neutral_no_default';
defaultFixture.interface.active_choice_required = true;
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falseDefaultRepair), /default_binding_present mismatch/);

const falsePathSymmetry = structuredClone(fixture);
const costFixture = falsePathSymmetry.worlds.find(world => world.world_id === 'exit-authentication-and-cost-asymmetry');
costFixture.interface.exit_steps = costFixture.interface.bind_steps;
costFixture.interface.exit_authentication = costFixture.interface.bind_authentication;
costFixture.interface.exit_documentary_burden = costFixture.interface.bind_documentary_burden;
costFixture.interface.exit_monetary_cost = costFixture.interface.bind_monetary_cost;
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falsePathSymmetry), /asymmetric_path_cost_present mismatch/);

const falseUrgencyRepair = structuredClone(fixture);
const urgencyFixture = falseUrgencyRepair.worlds.find(world => world.world_id === 'urgent-countdown-compresses-exit-completion');
urgencyFixture.interface.deadline_days = 60;
urgencyFixture.interface.urgency_state = 'none';
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falseUrgencyRepair), /urgency_pressure_present mismatch/);

const falseConfirmationRepair = structuredClone(fixture);
falseConfirmationRepair.worlds.find(world => world.world_id === 'exit-requires-repeated-confirmation').interface.exit_confirmations = 1;
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falseConfirmationRepair), /confirmation_asymmetry_present mismatch/);

const falseBundleRepair = structuredClone(fixture);
const bundleFixture = falseBundleRepair.worlds.find(world => world.world_id === 'assent-bundled-with-payment-access');
bundleFixture.bundling.independent_choice_available = true;
bundleFixture.bundling.severable = true;
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falseBundleRepair), /bundled_assent_present mismatch|explicit_assent_complete mismatch/);

const falseSubstitutionRepair = structuredClone(fixture);
const substitutionFixture = falseSubstitutionRepair.worlds.find(world => world.world_id === 'representative-or-operator-substitutes-choice');
substitutionFixture.agency.self_authored_choice_count = 100;
substitutionFixture.agency.representative_substituted_choice_count = 0;
substitutionFixture.agency.explicit_assent_count = 95;
substitutionFixture.agency.inferred_assent_count = 0;
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falseSubstitutionRepair), /representative_substitution_present mismatch|self_authorship_complete mismatch|explicit_assent_complete mismatch/);

const falseClawbackRepair = structuredClone(fixture);
const paymentFixture = falseClawbackRepair.worlds.find(world => world.world_id === 'payment-before-choice-with-clawback-exit');
paymentFixture.payment.timing = 'after_choice';
paymentFixture.payment.repayment_required_to_exit = false;
paymentFixture.payment.clawback_exposed_count = 0;
assert.throws(() => compilePreferenceChoiceArchitectureFixture(falseClawbackRepair), /payment_clawback_present mismatch/);

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceChoiceArchitectureFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const intentLeak = structuredClone(fixture);
intentLeak.expected_classification.architecture_pressure_identifies_coercion_manipulation_breach_misconduct_intent = true;
assert.ok(validatePreferenceChoiceArchitectureFixture(intentLeak).some(error => /architecture_pressure_identifies/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload.intended_exit_count = 999;
assert.ok(validatePreferenceChoiceArchitectureBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_neutral_choice_worlds = 2;
assert.ok(validatePreferenceChoiceArchitectureBuild(metricInflation).some(error => /complete_neutral_choice_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceChoiceArchitectureFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-choice-architecture.test.js: OK');
