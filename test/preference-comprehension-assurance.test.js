import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceComprehensionAssuranceFixture,
  renderPreferenceComprehensionAssuranceMarkdown,
  simulatePreferenceComprehensionAssuranceWorld,
  validatePreferenceComprehensionAssuranceBuild,
  validatePreferenceComprehensionAssuranceChain,
  validatePreferenceComprehensionAssuranceFixture
} from '../tools/lib/preference-comprehension-assurance.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/comprehension-assurance.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceComprehensionAssuranceFixture(fixture), []);

const compiled = compilePreferenceComprehensionAssuranceFixture(fixture);
assert.deepEqual(validatePreferenceComprehensionAssuranceBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-comprehension-status-different-measurement-assurance-v1');
assert.equal(compiled.issue, 731);
assert.equal(compiled.status, 'comprehension_measurement_translation_accessibility_transfer_assurance_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
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
  binding_public_authority_worlds: 0
});

for (const [key,value] of Object.entries({
  certificate_count_identifies_assessed_population_or_validated_comprehension:false,
  mean_score_identifies_operative_consequence_understanding:false,
  recognition_recall_identifies_scenario_transfer:false,
  immediate_pass_identifies_delayed_retention:false,
  translation_availability_identifies_semantic_procedural_consequence_equivalence:false,
  accessibility_label_identifies_usable_construct_preserving_accommodation:false,
  expert_review_identifies_independent_validation:false,
  item_bank_secrecy_claim_identifies_item_security:false,
  administrator_assistance_identifies_uncontaminated_person_understanding:false,
  imputed_certificate_identifies_observed_person_comprehension:false,
  aggregate_pass_parity_identifies_subgroup_measurement_equivalence:false,
  public_comprehension_validated_status_identifies_secure_representative_transfer_retained_accessible_independently_validated_authorized_comprehension:false,
  measurement_failure_identifies_coercion_manipulation_breach_discrimination_misconduct_intent:false,
  complete_measurement_assurance_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['validated-consequence-transfer-retention-assurance'];
assert.equal(positive.flags.complete_measurement_assurance, true);
assert.equal(positive.population.assessed_count, 100);
assert.equal(positive.population.certified_count, 100);
assert.equal(positive.measurement.consequence_understanding_count, 100);
assert.equal(positive.measurement.scenario_transfer_count, 100);
assert.equal(positive.measurement.delayed_retention_count, 100);
assert.equal(positive.flags.item_security_complete, true);
assert.equal(positive.flags.subgroup_equivalence_complete, true);
assert.equal(positive.flags.independent_validation_complete, true);
assert.equal(positive.validation.correction_state, 'reassessment_revocation_and_reissue_operational');

const recognition = worlds['recognition-only-without-consequence-transfer'];
assert.equal(recognition.flags.recognition_only_present, true);
assert.equal(recognition.measurement.recognition_count, 100);
assert.equal(recognition.measurement.consequence_understanding_count, 40);
assert.equal(recognition.measurement.scenario_transfer_count, 20);
assert.equal(recognition.measurement.delayed_retention_count, 20);
assert.equal(recognition.flags.construct_valid_complete, false);
assert.equal(recognition.flags.item_security_complete, true);

const leakage = worlds['leaked-item-bank-and-memorized-answers'];
assert.equal(leakage.flags.item_leakage_present, true);
assert.equal(leakage.item_security.leakage_count, 100);
assert.equal(leakage.item_security.memorized_answer_count, 80);
assert.equal(leakage.item_security.answer_key_state, 'compromised');
assert.equal(leakage.flags.item_security_complete, false);

const coaching = worlds['administrator-coaching-and-answer-prompting'];
assert.equal(coaching.flags.coaching_contamination_present, true);
assert.equal(coaching.administration.coaching_count, 60);
assert.equal(coaching.administration.answer_prompt_count, 60);
assert.equal(coaching.administration.answer_substitution_count, 20);
assert.equal(coaching.administration.administrator_independent, false);
assert.equal(coaching.flags.construct_valid_complete, false);

const translation = worlds['literal-translation-with-differential-item-functioning'];
assert.equal(translation.flags.translation_dif_present, true);
assert.equal(translation.translation.semantic_equivalence, false);
assert.equal(translation.translation.procedural_equivalence, false);
assert.equal(translation.translation.consequence_equivalence, false);
assert.equal(translation.translation.dif_affected_count, 30);
assert.equal(translation.flags.subgroup_equivalence_complete, false);
assert.equal(translation.flags.construct_valid_complete, true);

const accessibility = worlds['nominal-accessibility-with-construct-failure'];
assert.equal(accessibility.flags.accessibility_construct_failure_present, true);
assert.equal(accessibility.accessibility.assistive_technology_tested, false);
assert.equal(accessibility.accessibility.usability_tested, false);
assert.equal(accessibility.accessibility.accommodation_construct_preserved, false);
assert.equal(accessibility.accessibility.access_failure_count, 20);
assert.equal(accessibility.flags.construct_valid_complete, false);

const denominator = worlds['partial-assessment-with-certificate-imputation'];
assert.equal(denominator.flags.denominator_imputation_present, true);
assert.equal(denominator.population.assessed_count, 60);
assert.equal(denominator.population.passed_count, 60);
assert.equal(denominator.population.certified_count, 100);
assert.equal(denominator.population.imputed_count, 40);
assert.equal(denominator.population.excluded_count, 40);
assert.equal(denominator.flags.full_population_observed, false);
assert.equal(denominator.flags.construct_valid_complete, true);

const retention = worlds['immediate-pass-with-delayed-retention-collapse'];
assert.equal(retention.flags.delayed_retention_failure_present, true);
assert.equal(retention.measurement.consequence_understanding_count, 100);
assert.equal(retention.measurement.scenario_transfer_count, 95);
assert.equal(retention.measurement.delayed_retention_count, 25);
assert.equal(retention.measurement.delayed_retention_valid, false);
assert.equal(retention.flags.construct_valid_complete, true);

const publicSignatures = new Set(compiled.worlds.map(world => world.public_status_signature_sha256));
const assuranceSignatures = new Set(compiled.worlds.map(world => world.measurement_assurance_signature_sha256));
assert.equal(publicSignatures.size, 1);
assert.equal(assuranceSignatures.size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.certificates_issued, 100);
  assert.equal(world.public_claim.published_mean_score, 85);
  assert.equal(world.public_claim.published_pass_rate, 1);
  assert.equal(world.public_claim.published_threshold, 70);
  assert.equal(world.population.certified_count, 100);
  assert.deepEqual(validatePreferenceComprehensionAssuranceChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceComprehensionAssuranceWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'partial-assessment-with-certificate-imputation')
);
assert.equal(direct.flags.denominator_imputation_present, true);
assert.equal(direct.flags.full_population_observed, false);
assert.equal(direct.public_claim.public_comprehension_status, 'comprehension_validated');

const markdown = renderPreferenceComprehensionAssuranceMarkdown(compiled);
assert.match(markdown, /Comprehension measurement, translation, accessibility, and scenario-transfer assurance custody/);
assert.match(markdown, /validated-consequence-transfer-retention-assurance/);
assert.match(markdown, /Complete assurance: true/);
assert.match(markdown, /recognition-only-without-consequence-transfer/);
assert.match(markdown, /Scenario transfer: 20/);
assert.match(markdown, /partial-assessment-with-certificate-imputation/);
assert.match(markdown, /Imputed: 40/);
assert.match(markdown, /immediate-pass-with-delayed-retention-collapse/);
assert.match(markdown, /Delayed retention: 25/);
assert.doesNotMatch(markdown, /named assessment coerced|discrimination confirmed|publicly authorized|actual consent invalid/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceComprehensionAssuranceFixture(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(fixture);
issueLeak.issue = 730;
assert.ok(validatePreferenceComprehensionAssuranceFixture(issueLeak).some(error => /issue must remain 731/.test(error)));

const publicClaimDrift = structuredClone(fixture);
publicClaimDrift.worlds[0].public_claim.certificates_issued = 99;
assert.ok(validatePreferenceComprehensionAssuranceFixture(publicClaimDrift).some(error => /frozen public claim/.test(error)));

const populationMismatch = structuredClone(fixture);
populationMismatch.worlds[0].population.imputed_count = 1;
assert.ok(validatePreferenceComprehensionAssuranceFixture(populationMismatch).some(error => /certified_count must reconcile/.test(error)));

const exclusionMismatch = structuredClone(fixture);
exclusionMismatch.worlds.find(world => world.world_id === 'partial-assessment-with-certificate-imputation').population.excluded_count = 39;
assert.ok(validatePreferenceComprehensionAssuranceFixture(exclusionMismatch).some(error => /excluded_count must reconcile/.test(error)));

const scoreDrift = structuredClone(fixture);
scoreDrift.worlds[0].measurement.observed_mean_score = 84;
assert.ok(validatePreferenceComprehensionAssuranceFixture(scoreDrift).some(error => /published score and threshold/.test(error)));

const assistanceMismatch = structuredClone(fixture);
assistanceMismatch.worlds.find(world => world.world_id === 'administrator-coaching-and-answer-prompting').administration.assistance_count = 59;
assert.ok(validatePreferenceComprehensionAssuranceFixture(assistanceMismatch).some(error => /assistance must match/.test(error)));

const falseRecognitionRepair = structuredClone(fixture);
const recognitionFixture = falseRecognitionRepair.worlds.find(world => world.world_id === 'recognition-only-without-consequence-transfer');
recognitionFixture.measurement.construct_state = 'validated';
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseRecognitionRepair), /recognition_only_present mismatch/);

const falseLeakageRepair = structuredClone(fixture);
const leakageFixture = falseLeakageRepair.worlds.find(world => world.world_id === 'leaked-item-bank-and-memorized-answers');
leakageFixture.item_security.leakage_count = 0;
leakageFixture.item_security.memorized_answer_count = 0;
leakageFixture.item_security.answer_key_state = 'segregated';
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseLeakageRepair), /item_leakage_present mismatch|item_security_complete mismatch/);

const falseCoachingRepair = structuredClone(fixture);
const coachingFixture = falseCoachingRepair.worlds.find(world => world.world_id === 'administrator-coaching-and-answer-prompting');
coachingFixture.administration.coaching_count = 0;
coachingFixture.administration.answer_prompt_count = 0;
coachingFixture.administration.answer_substitution_count = 0;
coachingFixture.administration.assistance_state = 'construct_preserving_documented';
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseCoachingRepair), /coaching_contamination_present mismatch|construct_valid_complete mismatch/);

const falseTranslationRepair = structuredClone(fixture);
const translationFixture = falseTranslationRepair.worlds.find(world => world.world_id === 'literal-translation-with-differential-item-functioning');
translationFixture.translation.semantic_equivalence = true;
translationFixture.translation.procedural_equivalence = true;
translationFixture.translation.consequence_equivalence = true;
translationFixture.translation.dif_affected_count = 0;
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseTranslationRepair), /translation_dif_present mismatch/);

const falseAccessibilityRepair = structuredClone(fixture);
const accessFixture = falseAccessibilityRepair.worlds.find(world => world.world_id === 'nominal-accessibility-with-construct-failure');
accessFixture.accessibility.assistive_technology_tested = true;
accessFixture.accessibility.usability_tested = true;
accessFixture.accessibility.accommodation_construct_preserved = true;
accessFixture.accessibility.access_failure_count = 0;
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseAccessibilityRepair), /accessibility_construct_failure_present mismatch|construct_valid_complete mismatch/);

const falseDenominatorRepair = structuredClone(fixture);
const denominatorFixture = falseDenominatorRepair.worlds.find(world => world.world_id === 'partial-assessment-with-certificate-imputation');
denominatorFixture.population.sampled_count = 100;
denominatorFixture.population.assigned_count = 100;
denominatorFixture.population.assessed_count = 100;
denominatorFixture.population.completed_count = 100;
denominatorFixture.population.passed_count = 100;
denominatorFixture.population.excluded_count = 0;
denominatorFixture.population.imputed_count = 0;
denominatorFixture.measurement.recognition_count = 100;
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseDenominatorRepair), /denominator_imputation_present mismatch|full_population_observed mismatch/);

const falseRetentionRepair = structuredClone(fixture);
const retentionFixture = falseRetentionRepair.worlds.find(world => world.world_id === 'immediate-pass-with-delayed-retention-collapse');
retentionFixture.measurement.delayed_retention_count = 100;
retentionFixture.measurement.delayed_retention_valid = true;
assert.throws(() => compilePreferenceComprehensionAssuranceFixture(falseRetentionRepair), /delayed_retention_failure_present mismatch|delayed_retention_complete mismatch/);

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceComprehensionAssuranceFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const intentLeak = structuredClone(fixture);
intentLeak.expected_classification.measurement_failure_identifies_coercion_manipulation_breach_discrimination_misconduct_intent = true;
assert.ok(validatePreferenceComprehensionAssuranceFixture(intentLeak).some(error => /measurement_failure_identifies/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload.scenario_transfer_count = 999;
assert.ok(validatePreferenceComprehensionAssuranceBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_measurement_assurance_worlds = 2;
assert.ok(validatePreferenceComprehensionAssuranceBuild(metricInflation).some(error => /complete_measurement_assurance_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceComprehensionAssuranceFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-comprehension-assurance.test.js: OK');
