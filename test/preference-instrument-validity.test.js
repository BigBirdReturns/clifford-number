import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceInstrumentValidityFixture,
  renderPreferenceInstrumentValidityMarkdown,
  simulatePreferenceInstrumentValidityWorld,
  validatePreferenceInstrumentValidityBuild,
  validatePreferenceInstrumentValidityChain,
  validatePreferenceInstrumentValidityFixture
} from '../tools/lib/preference-instrument-validity.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/instrument-validity.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceInstrumentValidityFixture(fixture), []);

const compiled = compilePreferenceInstrumentValidityFixture(fixture);
assert.deepEqual(validatePreferenceInstrumentValidityBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-instrument-validation-status-different-score-provenance-v1');
assert.equal(compiled.issue, 734);
assert.equal(compiled.status, 'measurement_construct_validity_item_security_administration_independence_score_provenance_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_score_provenance_signatures: 8,
  complete_instrument_assurance_worlds: 1,
  construct_underrepresentation_worlds: 1,
  construct_irrelevant_variance_worlds: 1,
  criterion_contamination_worlds: 1,
  item_leakage_teaching_worlds: 1,
  adaptive_exposure_concentration_worlds: 1,
  administration_scoring_override_worlds: 1,
  form_equating_version_drift_worlds: 1,
  construct_coverage_complete_worlds: 7,
  criterion_independence_complete_worlds: 7,
  item_security_complete_worlds: 6,
  administration_independence_complete_worlds: 7,
  form_comparability_complete_worlds: 5,
  external_replication_complete_worlds: 1,
  published_validity_matches_independent_criterion_worlds: 1,
  same_reliability_publication_worlds: 8,
  same_validity_publication_worlds: 8,
  total_excluded_construct_domains: 3,
  total_high_exposure_participant_count: 180,
  total_item_leakage_count: 100,
  total_memorized_answer_count: 80,
  total_teaching_to_test_count: 80,
  total_criterion_item_overlap_count: 10,
  total_criterion_curriculum_overlap_count: 20,
  total_criterion_answer_key_overlap_count: 10,
  total_model_assistance_count: 60,
  total_answer_prompt_count: 60,
  total_answer_completion_count: 20,
  total_score_override_count: 25,
  total_nonindependent_administration_population: 60,
  binding_public_authority_worlds: 0
});

for (const [key,value] of Object.entries({
  reliability_coefficient_identifies_construct_validity:false,
  validity_coefficient_identifies_independent_criterion_validity:false,
  high_mean_pass_rate_identifies_complete_construct_coverage:false,
  content_review_identifies_absence_of_construct_underrepresentation:false,
  stable_aggregate_score_identifies_form_comparability:false,
  item_bank_secrecy_claim_identifies_secure_item_exposure:false,
  instructional_alignment_identifies_uncontaminated_understanding:false,
  adaptive_delivery_identifies_exposure_diversity_or_score_comparability:false,
  administrator_assistance_identifies_independent_response_production:false,
  automated_score_identifies_unoverridden_score_provenance:false,
  equating_label_identifies_valid_cross_form_equivalence:false,
  public_instrument_validated_status_identifies_complete_secure_independent_comparable_replicated_correctable_authorized_measurement:false,
  construct_security_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent:false,
  complete_instrument_assurance_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const positive = worlds['complete-construct-secure-independent-equated-validation'];
assert.equal(positive.flags.complete_instrument_assurance, true);
assert.equal(positive.flags.construct_coverage_complete, true);
assert.equal(positive.flags.criterion_independence_complete, true);
assert.equal(positive.flags.item_security_complete, true);
assert.equal(positive.flags.administration_independence_complete, true);
assert.equal(positive.flags.form_comparability_complete, true);
assert.equal(positive.flags.external_replication_complete, true);
assert.equal(positive.flags.published_validity_matches_independent_criterion, true);
assert.equal(positive.instrument.independent_observed_validity_coefficient, 0.8);
assert.equal(positive.validation.correction_state, 'reassessment_revocation_and_reissue_operational');

const underrepresentation = worlds['construct-underrepresentation-vocabulary-only'];
assert.equal(underrepresentation.flags.construct_underrepresentation_present, true);
assert.equal(underrepresentation.flags.construct_coverage_complete, false);
assert.deepEqual(underrepresentation.construct.covered_domains, ['release_scope']);
assert.deepEqual(underrepresentation.construct.excluded_domains, ['choice_consequence','exit_consequence','payment_and_clawback_consequence']);
assert.equal(underrepresentation.excluded_construct_domain_count, 3);
assert.equal(underrepresentation.instrument.observed_reliability, 0.9);
assert.equal(underrepresentation.instrument.independent_observed_validity_coefficient, 0.25);

const irrelevant = worlds['construct-irrelevant-reading-speed-and-technical-familiarity'];
assert.equal(irrelevant.flags.construct_irrelevant_variance_present, true);
assert.equal(irrelevant.flags.construct_coverage_complete, true);
assert.equal(irrelevant.construct.construct_irrelevant_variance_share, 0.6);
assert.equal(irrelevant.validation.subgroup_validation, false);

const criterion = worlds['criterion-contamination-shared-items-and-instruction'];
assert.equal(criterion.flags.criterion_contamination_present, true);
assert.equal(criterion.flags.criterion_independence_complete, false);
assert.equal(criterion.criterion.item_overlap_count, 10);
assert.equal(criterion.criterion.curriculum_overlap_count, 20);
assert.equal(criterion.criterion.answer_key_overlap_count, 10);
assert.equal(criterion.instrument.published_validity_coefficient, 0.8);
assert.equal(criterion.instrument.independent_observed_validity_coefficient, 0.35);

const leakage = worlds['item-leakage-and-teaching-to-test'];
assert.equal(leakage.flags.item_leakage_teaching_present, true);
assert.equal(leakage.flags.item_security_complete, false);
assert.equal(leakage.items.leakage_count, 100);
assert.equal(leakage.items.memorized_answer_count, 80);
assert.equal(leakage.items.teaching_to_test_count, 80);
assert.equal(leakage.items.answer_key_compromised, true);
assert.equal(leakage.flags.administration_independence_complete, true);

const adaptive = worlds['adaptive-item-exposure-concentration'];
assert.equal(adaptive.flags.adaptive_exposure_concentration_present, true);
assert.equal(adaptive.flags.item_security_complete, false);
assert.equal(adaptive.items.high_exposure_participant_count, 80);
assert.equal(adaptive.items.maximum_item_exposure_count, 100);
assert.equal(adaptive.items.unique_items_administered, 30);
assert.equal(adaptive.equating.anchor_security_state, 'overexposed');
assert.equal(adaptive.flags.form_comparability_complete, false);

const administration = worlds['administrator-model-prompting-and-score-overrides'];
assert.equal(administration.flags.administration_scoring_override_present, true);
assert.equal(administration.flags.administration_independence_complete, false);
assert.equal(administration.administration.model_assistance_count, 60);
assert.equal(administration.administration.answer_prompt_count, 60);
assert.equal(administration.administration.answer_completion_count, 20);
assert.equal(administration.administration.score_override_count, 25);
assert.equal(administration.administration.human_override_count, 10);
assert.equal(administration.administration.automated_override_count, 15);
assert.equal(administration.nonindependent_administration_population, 60);

const drift = worlds['form-equating-and-version-drift'];
assert.equal(drift.flags.form_equating_version_drift_present, true);
assert.equal(drift.flags.form_comparability_complete, false);
assert.equal(drift.equating.approved_form_id, 'FORM-REFERENCE-A');
assert.equal(drift.equating.executed_form_id, 'FORM-DRIFT-B');
assert.equal(drift.equating.version_drift, true);
assert.equal(drift.equating.score_transformation_disclosed, false);
assert.equal(drift.instrument.observed_mean_score, 85);
assert.equal(drift.instrument.observed_reliability, 0.9);

const publicSignatures = new Set(compiled.worlds.map(world => world.public_status_signature_sha256));
const provenanceSignatures = new Set(compiled.worlds.map(world => world.score_provenance_signature_sha256));
assert.equal(publicSignatures.size, 1);
assert.equal(provenanceSignatures.size, 8);
for (const world of compiled.worlds) {
  assert.equal(world.public_claim.assessed_population, 100);
  assert.equal(world.public_claim.certificates_issued, 100);
  assert.equal(world.public_claim.published_mean_score, 85);
  assert.equal(world.public_claim.published_pass_rate, 1);
  assert.equal(world.public_claim.published_reliability, 0.9);
  assert.equal(world.public_claim.published_validity_coefficient, 0.8);
  assert.deepEqual(validatePreferenceInstrumentValidityChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceInstrumentValidityWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'criterion-contamination-shared-items-and-instruction')
);
assert.equal(direct.flags.criterion_contamination_present, true);
assert.equal(direct.flags.published_validity_matches_independent_criterion, false);
assert.equal(direct.public_claim.public_instrument_status, 'instrument_validated');

const markdown = renderPreferenceInstrumentValidityMarkdown(compiled);
assert.match(markdown, /Construct validity, item security, administration independence, and score-provenance custody/);
assert.match(markdown, /complete-construct-secure-independent-equated-validation/);
assert.match(markdown, /Complete assurance: true/);
assert.match(markdown, /construct-underrepresentation-vocabulary-only/);
assert.match(markdown, /Excluded domains: 3/);
assert.match(markdown, /item-leakage-and-teaching-to-test/);
assert.match(markdown, /Item leakage: 100/);
assert.match(markdown, /administrator-model-prompting-and-score-overrides/);
assert.match(markdown, /Score overrides: 25/);
assert.match(markdown, /form-equating-and-version-drift/);
assert.match(markdown, /Executed form: FORM-DRIFT-B/);
assert.doesNotMatch(markdown, /named instrument invalid|discrimination confirmed|publicly authorized|coercion established/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceInstrumentValidityFixture(graphLeak).some(error => /graph_effect/.test(error)));

const issueLeak = structuredClone(fixture);
issueLeak.issue = 731;
assert.ok(validatePreferenceInstrumentValidityFixture(issueLeak).some(error => /issue must remain 734/.test(error)));

const publicClaimDrift = structuredClone(fixture);
publicClaimDrift.worlds[0].public_claim.published_reliability = 0.89;
assert.ok(validatePreferenceInstrumentValidityFixture(publicClaimDrift).some(error => /frozen public claim/.test(error)));

const populationDrift = structuredClone(fixture);
populationDrift.worlds[0].population.passed_count = 99;
assert.ok(validatePreferenceInstrumentValidityFixture(populationDrift).some(error => /full assessed, passed, and certified surface/.test(error)));

const domainOverlap = structuredClone(fixture);
domainOverlap.worlds[0].construct.excluded_domains.push('release_scope');
assert.ok(validatePreferenceInstrumentValidityFixture(domainOverlap).some(error => /domains must not overlap/.test(error)));

const coefficientDrift = structuredClone(fixture);
coefficientDrift.worlds[0].instrument.observed_reliability = 0.89;
assert.ok(validatePreferenceInstrumentValidityFixture(coefficientDrift).some(error => /published score, threshold, reliability, and validity surface/.test(error)));

const overrideMismatch = structuredClone(fixture);
overrideMismatch.worlds.find(world => world.world_id === 'administrator-model-prompting-and-score-overrides').administration.automated_override_count = 14;
assert.ok(validatePreferenceInstrumentValidityFixture(overrideMismatch).some(error => /score overrides must reconcile/.test(error)));

const assistanceMismatch = structuredClone(fixture);
assistanceMismatch.worlds.find(world => world.world_id === 'item-leakage-and-teaching-to-test').population.assisted_count = 79;
assert.ok(validatePreferenceInstrumentValidityFixture(assistanceMismatch).some(error => /cannot be smaller than model assistance or instructional exposure/.test(error)));

const secureAnchorMismatch = structuredClone(fixture);
secureAnchorMismatch.worlds[0].equating.secure_anchor_count = 5;
assert.ok(validatePreferenceInstrumentValidityFixture(secureAnchorMismatch).some(error => /secure anchors exceed/.test(error)));

const falseUnderrepresentationRepair = structuredClone(fixture);
const underFixture = falseUnderrepresentationRepair.worlds.find(world => world.world_id === 'construct-underrepresentation-vocabulary-only');
underFixture.construct.covered_domains = [...fixture.baseline.reference_domains];
underFixture.construct.excluded_domains = [];
underFixture.construct.construct_underrepresentation = false;
assert.throws(() => compilePreferenceInstrumentValidityFixture(falseUnderrepresentationRepair), /construct_underrepresentation_present mismatch|construct_coverage_complete mismatch/);

const falseCriterionRepair = structuredClone(fixture);
const criterionFixture = falseCriterionRepair.worlds.find(world => world.world_id === 'criterion-contamination-shared-items-and-instruction');
criterionFixture.criterion.criterion_independent = true;
criterionFixture.criterion.item_overlap_count = 0;
criterionFixture.criterion.curriculum_overlap_count = 0;
criterionFixture.criterion.answer_key_overlap_count = 0;
criterionFixture.criterion.temporal_independence = true;
criterionFixture.criterion.criterion_valid = true;
criterionFixture.criterion.contamination_state = 'none';
assert.throws(() => compilePreferenceInstrumentValidityFixture(falseCriterionRepair), /criterion_contamination_present mismatch|criterion_independence_complete mismatch/);

const falseLeakageRepair = structuredClone(fixture);
const leakageFixture = falseLeakageRepair.worlds.find(world => world.world_id === 'item-leakage-and-teaching-to-test');
leakageFixture.items.leakage_count = 0;
leakageFixture.items.memorized_answer_count = 0;
leakageFixture.items.teaching_to_test_count = 0;
leakageFixture.items.answer_key_compromised = false;
leakageFixture.items.high_exposure_participant_count = 0;
leakageFixture.items.maximum_item_exposure_count = 25;
leakageFixture.items.exposure_state = 'rotating_balanced';
leakageFixture.items.reuse_state = 'bounded';
leakageFixture.items.security_audit_state = 'independent_complete';
leakageFixture.population.assisted_count = 0;
assert.throws(() => compilePreferenceInstrumentValidityFixture(falseLeakageRepair), /item_leakage_teaching_present mismatch|item_security_complete mismatch/);

const falseAdaptiveRepair = structuredClone(fixture);
const adaptiveFixture = falseAdaptiveRepair.worlds.find(world => world.world_id === 'adaptive-item-exposure-concentration');
adaptiveFixture.items.high_exposure_participant_count = 0;
adaptiveFixture.items.maximum_item_exposure_count = 25;
adaptiveFixture.items.exposure_state = 'rotating_balanced';
adaptiveFixture.items.reuse_state = 'bounded';
adaptiveFixture.items.security_audit_state = 'independent_complete';
adaptiveFixture.equating.anchor_security_state = 'verified';
adaptiveFixture.equating.form_comparable = true;
adaptiveFixture.equating.score_transformation_disclosed = true;
adaptiveFixture.equating.equating_audit_state = 'independent_complete';
assert.throws(() => compilePreferenceInstrumentValidityFixture(falseAdaptiveRepair), /adaptive_exposure_concentration_present mismatch|item_security_complete mismatch|form_comparability_complete mismatch/);

const falseOverrideRepair = structuredClone(fixture);
const adminFixture = falseOverrideRepair.worlds.find(world => world.world_id === 'administrator-model-prompting-and-score-overrides');
adminFixture.population.assisted_count = 0;
adminFixture.population.overridden_score_count = 0;
adminFixture.administration.administrator_independent = true;
adminFixture.administration.model_assistance_count = 0;
adminFixture.administration.answer_prompt_count = 0;
adminFixture.administration.answer_completion_count = 0;
adminFixture.administration.score_override_count = 0;
adminFixture.administration.human_override_count = 0;
adminFixture.administration.automated_override_count = 0;
adminFixture.administration.scoring_independent = true;
assert.throws(() => compilePreferenceInstrumentValidityFixture(falseOverrideRepair), /administration_scoring_override_present mismatch|administration_independence_complete mismatch/);

const falseDriftRepair = structuredClone(fixture);
const driftFixture = falseDriftRepair.worlds.find(world => world.world_id === 'form-equating-and-version-drift');
driftFixture.equating.approved_form_id = 'FORM-DRIFT-B';
driftFixture.equating.version_drift = false;
driftFixture.equating.form_comparable = true;
driftFixture.equating.secure_anchor_count = 4;
driftFixture.equating.anchor_security_state = 'verified';
assert.throws(() => compilePreferenceInstrumentValidityFixture(falseDriftRepair), /form_equating_version_drift_present mismatch|form_comparability_complete mismatch/);

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceInstrumentValidityFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const intentLeak = structuredClone(fixture);
intentLeak.expected_classification.construct_security_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_intent = true;
assert.ok(validatePreferenceInstrumentValidityFixture(intentLeak).some(error => /construct_security_failure_identifies/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload.items.leakage_count = 999;
assert.ok(validatePreferenceInstrumentValidityBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.complete_instrument_assurance_worlds = 2;
assert.ok(validatePreferenceInstrumentValidityBuild(metricInflation).some(error => /complete_instrument_assurance_worlds must equal 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceInstrumentValidityFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-instrument-validity.test.js: OK');
