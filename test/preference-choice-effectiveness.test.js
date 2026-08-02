import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceChoiceEffectivenessFixture,
  renderPreferenceChoiceEffectivenessMarkdown,
  simulatePreferenceChoiceEffectivenessWorld,
  validatePreferenceChoiceEffectivenessBuild,
  validatePreferenceChoiceEffectivenessChain,
  validatePreferenceChoiceEffectivenessFixture
} from '../tools/lib/preference-choice-effectiveness.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/choice-effectiveness.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceChoiceEffectivenessFixture(fixture), []);
const compiled = compilePreferenceChoiceEffectivenessFixture(fixture);
assert.deepEqual(validatePreferenceChoiceEffectivenessBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-informed-choice-status-different-comprehension-agency-v1');
assert.equal(compiled.status, 'notice_comprehension_accessibility_exit_and_assent_effectiveness_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
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
  binding_public_authority_worlds: 0
});

for (const [key, value] of Object.entries({
  notice_delivery_or_message_open_identifies_comprehension:false,
  recognition_score_identifies_consequence_understanding_or_scenario_transfer:false,
  translation_availability_identifies_semantic_procedural_equivalence:false,
  formal_accessibility_label_identifies_usable_access_or_assisted_comprehension:false,
  formal_choice_route_identifies_self_authored_meaningful_choice:false,
  recorded_exit_rate_identifies_intended_exit_or_completed_agency:false,
  representative_or_operator_action_identifies_affected_person_assent:false,
  payment_retention_identifies_prior_informed_agreement:false,
  explicit_choice_field_identifies_valid_explicit_assent_receipt:false,
  same_recorded_disposition_identifies_same_comprehension_intention_choice_or_authority:false,
  comprehension_or_exit_failure_identifies_coercion_manipulation_breach_misconduct_or_intent:false,
  public_informed_choice_complete_status_identifies_validated_accessible_self_authored_correctable_authorized_choice:false,
  complete_informed_choice_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['verified-comprehension-accessible-self-authored-choice'];
assert.equal(positive.flags.complete_informed_choice_path, true);
assert.equal(positive.flags.verified_comprehension_complete, true);
assert.equal(positive.flags.explicit_assent_complete, true);
assert.equal(positive.flags.self_authorship_complete, true);
assert.equal(positive.flags.independent_validation_and_correction_complete, true);
assert.equal(positive.agency.intended_exit_count, 5);
assert.equal(positive.agency.completed_exit_count, 5);

const openReceipt = worlds['message-open-receipt-treated-as-comprehension'];
assert.equal(openReceipt.flags.open_receipt_as_comprehension_present, true);
assert.equal(openReceipt.assessment.assessed_count, 20);
assert.equal(openReceipt.assessment.consequence_understanding_count, 20);
assert.equal(openReceipt.assessment.scenario_transfer_count, 15);

const recognition = worlds['recognition-quiz-passes-without-scenario-transfer'];
assert.equal(recognition.flags.recognition_without_transfer_present, true);
assert.equal(recognition.assessment.recognition_count, 95);
assert.equal(recognition.assessment.scenario_transfer_count, 25);

const translation = worlds['literal-translation-without-semantic-or-procedural-equivalence'];
assert.equal(translation.flags.translation_equivalence_failure_present, true);
assert.equal(translation.translation.translated_population_count, 20);
assert.equal(translation.translation.semantic_equivalence_count, 8);
assert.equal(translation.translation.procedural_equivalence_count, 5);

const access = worlds['accessibility-and-assisted-comprehension-gaps'];
assert.equal(access.flags.accessibility_failure_present, true);
assert.equal(access.accessibility.format_coverage_count, 80);
assert.equal(access.accessibility.usable_access_count, 70);

const friction = worlds['comprehended-choice-with-default-friction-suppressing-intended-exit'];
assert.equal(friction.flags.verified_comprehension_complete, true);
assert.equal(friction.flags.intended_exit_suppression_present, true);
assert.equal(friction.agency.intended_exit_count, 20);
assert.equal(friction.agency.completed_exit_count, 5);
assert.equal(friction.suppressed_exit_intentions, 15);
assert.equal(friction.agency.inferred_assent_count, 15);

const representative = worlds['representative-or-call-center-substitutes-affected-person-choice'];
assert.equal(representative.flags.representative_substitution_present, true);
assert.equal(representative.agency.representative_substituted_choice_count, 30);
assert.equal(representative.agency.representative_ratification_count, 0);
assert.equal(representative.agency.self_authored_choice_count, 70);

const payment = worlds['payment-precedes-choice-and-retention-is-treated-as-assent'];
assert.equal(payment.flags.payment_before_assent_present, true);
assert.equal(payment.agency.payment_before_choice_count, 100);
assert.equal(payment.agency.explicit_assent_count, 0);
assert.equal(payment.agency.inferred_assent_count, 95);
assert.equal(payment.agency.self_authored_choice_count, 5);

assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature_sha256)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.choice_effectiveness_signature_sha256)).size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_choice_status, 'informed_choice_complete');
  assert.equal(world.public_claim.recorded_bound_count, 95);
  assert.equal(world.public_claim.recorded_exit_count, 5);
  assert.equal(world.public_claim.people_paid, 100);
  assert.equal(world.full_notice_delivery, true);
  assert.equal(world.full_formal_choice_record, true);
  assert.equal(world.same_recorded_disposition, true);
  assert.equal(world.full_payment, true);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.choice_effectiveness_signature_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(validatePreferenceChoiceEffectivenessChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceChoiceEffectivenessWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'comprehended-choice-with-default-friction-suppressing-intended-exit')
);
assert.equal(direct.flags.intended_exit_suppression_present, true);
assert.equal(direct.suppressed_exit_intentions, 15);

const markdown = renderPreferenceChoiceEffectivenessMarkdown(compiled);
assert.match(markdown, /Notice comprehension, accessibility, exit, and assent-effectiveness custody/);
assert.match(markdown, /verified-comprehension-accessible-self-authored-choice/);
assert.match(markdown, /Complete informed-choice path: true/);
assert.match(markdown, /comprehended-choice-with-default-friction-suppressing-intended-exit/);
assert.match(markdown, /Intended exits: 20/);
assert.match(markdown, /payment-precedes-choice-and-retention-is-treated-as-assent/);
assert.match(markdown, /Payment before choice: 100/);
assert.match(markdown, /total_suppressed_exit_intentions: 15/);
assert.doesNotMatch(markdown, /named process coerced|actual consent invalid|binding public authorization|manipulated people/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceChoiceEffectivenessFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceChoiceEffectivenessFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceChoiceEffectivenessFixture(missingWorld).some(error => /exactly the eight required choice-effectiveness worlds/.test(error)));

const publicClaimLeak = structuredClone(fixture);
publicClaimLeak.worlds[0].public_claim.recorded_exit_count = 6;
assert.ok(validatePreferenceChoiceEffectivenessFixture(publicClaimLeak).some(error => /must preserve the frozen public informed-choice claim/.test(error)));

const noticeChainLeak = structuredClone(fixture);
noticeChainLeak.worlds[0].notice.acknowledged_count = 101;
assert.ok(validatePreferenceChoiceEffectivenessFixture(noticeChainLeak).some(error => /notice acknowledged_count must be within|notice counts do not form a valid custody chain/.test(error)));

const assessmentLeak = structuredClone(fixture);
assessmentLeak.worlds[0].assessment.scenario_transfer_count = 101;
assert.ok(validatePreferenceChoiceEffectivenessFixture(assessmentLeak).some(error => /assessment scenario_transfer_count must be within|cannot exceed assessed_count/.test(error)));

const translationLeak = structuredClone(fixture);
translationLeak.worlds.find(world => world.world_id === 'literal-translation-without-semantic-or-procedural-equivalence').translation.semantic_equivalence_count = 21;
assert.ok(validatePreferenceChoiceEffectivenessFixture(translationLeak).some(error => /equivalence counts cannot exceed translated population/.test(error)));

const accessibilityLeak = structuredClone(fixture);
accessibilityLeak.worlds.find(world => world.world_id === 'accessibility-and-assisted-comprehension-gaps').accessibility.usable_access_count = 81;
assert.ok(validatePreferenceChoiceEffectivenessFixture(accessibilityLeak).some(error => /usable access cannot exceed format coverage/.test(error)));

const exitLedgerLeak = structuredClone(fixture);
exitLedgerLeak.worlds.find(world => world.world_id === 'comprehended-choice-with-default-friction-suppressing-intended-exit').agency.failed_exit_count = 9;
assert.ok(validatePreferenceChoiceEffectivenessFixture(exitLedgerLeak).some(error => /exit attempts must equal|intended exits must reconcile/.test(error)));

const assentLedgerLeak = structuredClone(fixture);
assentLedgerLeak.worlds.find(world => world.world_id === 'payment-precedes-choice-and-retention-is-treated-as-assent').agency.inferred_assent_count = 94;
assert.ok(validatePreferenceChoiceEffectivenessFixture(assentLedgerLeak).some(error => /explicit and inferred assent must reconcile/.test(error)));

const authorshipLedgerLeak = structuredClone(fixture);
authorshipLedgerLeak.worlds.find(world => world.world_id === 'representative-or-call-center-substitutes-affected-person-choice').agency.self_authored_choice_count = 71;
assert.ok(validatePreferenceChoiceEffectivenessFixture(authorshipLedgerLeak).some(error => /self-authored choices must reconcile/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.worlds[0].governance.binding_public_authority = true;
assert.ok(validatePreferenceChoiceEffectivenessFixture(authorityLeak).some(error => /binding_public_authority must remain false/.test(error)));

const expectedFlagLeak = structuredClone(fixture);
expectedFlagLeak.worlds.find(world => world.world_id === 'message-open-receipt-treated-as-comprehension').expected_flags.open_receipt_as_comprehension_present = false;
assert.throws(() => compilePreferenceChoiceEffectivenessFixture(expectedFlagLeak), /open_receipt_as_comprehension_present mismatch/);

const falseTransferRepair = structuredClone(fixture);
const recognitionWorld = falseTransferRepair.worlds.find(world => world.world_id === 'recognition-quiz-passes-without-scenario-transfer');
recognitionWorld.assessment.scenario_transfer_count = 95;
recognitionWorld.assessment.consequence_understanding_count = 95;
recognitionWorld.assessment.delayed_retention_count = 95;
assert.throws(() => compilePreferenceChoiceEffectivenessFixture(falseTransferRepair), /recognition_without_transfer_present mismatch/);

const falseFrictionRepair = structuredClone(fixture);
const frictionWorld = falseFrictionRepair.worlds.find(world => world.world_id === 'comprehended-choice-with-default-friction-suppressing-intended-exit');
frictionWorld.agency.intended_exit_count = 5;
frictionWorld.agency.attempted_exit_count = 5;
frictionWorld.agency.failed_exit_count = 0;
frictionWorld.agency.abandoned_exit_count = 0;
frictionWorld.agency.self_authored_choice_count = 100;
frictionWorld.agency.explicit_assent_count = 95;
frictionWorld.agency.inferred_assent_count = 0;
assert.throws(() => compilePreferenceChoiceEffectivenessFixture(falseFrictionRepair), /intended_exit_suppression_present mismatch|explicit_assent_complete mismatch|self_authorship_complete mismatch/);

const comprehensionInferenceLeak = structuredClone(fixture);
comprehensionInferenceLeak.expected_classification.notice_delivery_or_message_open_identifies_comprehension = true;
assert.ok(validatePreferenceChoiceEffectivenessFixture(comprehensionInferenceLeak).some(error => /notice_delivery_or_message_open_identifies_comprehension/.test(error)));

const coercionInferenceLeak = structuredClone(fixture);
coercionInferenceLeak.expected_classification.comprehension_or_exit_failure_identifies_coercion_manipulation_breach_misconduct_or_intent = true;
assert.ok(validatePreferenceChoiceEffectivenessFixture(coercionInferenceLeak).some(error => /comprehension_or_exit_failure_identifies_coercion_manipulation_breach_misconduct_or_intent/.test(error)));

const tamperedBuild = structuredClone(compiled);
const tamperedWorld = tamperedBuild.worlds.find(world => world.world_id === 'verified-comprehension-accessible-self-authored-choice');
tamperedWorld.custody_chain[4].payload.explicit_assent_count = 1;
assert.ok(validatePreferenceChoiceEffectivenessBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_informed_choice_worlds = 2;
assert.ok(validatePreferenceChoiceEffectivenessBuild(metricInflation).some(error => /complete_informed_choice_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceChoiceEffectivenessFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-choice-effectiveness.test.js: OK');
