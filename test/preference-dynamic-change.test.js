import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceDynamicChangeFixture,
  renderPreferenceDynamicChangeMarkdown,
  simulateDynamicChangeWorld,
  validatePreferenceDynamicChangeBuild,
  validatePreferenceDynamicChangeChain,
  validatePreferenceDynamicChangeFixture
} from '../tools/lib/preference-dynamic-change.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/dynamic-change.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceDynamicChangeFixture(fixture), []);

const compiled = compilePreferenceDynamicChangeFixture(fixture);
assert.deepEqual(validatePreferenceDynamicChangeBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-observed-shift-different-mechanisms-v1');
assert.equal(compiled.status, 'dynamic_change_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.metrics.world_count, 6);
assert.equal(compiled.metrics.distinct_observed_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_latent_headline_signatures, 2);
assert.equal(compiled.metrics.distinct_mechanism_signatures, 6);
assert.equal(compiled.metrics.worlds_with_individual_conversion, 2);
assert.equal(compiled.metrics.worlds_without_individual_conversion, 4);
assert.equal(compiled.metrics.worlds_with_stable_panel_identity, 5);
assert.equal(compiled.metrics.worlds_with_composition_change, 1);
assert.equal(compiled.metrics.worlds_with_instrument_drift, 1);
assert.equal(compiled.metrics.worlds_with_strategic_compliance, 1);
assert.equal(compiled.metrics.worlds_with_imputation, 1);
assert.equal(compiled.metrics.worlds_with_targeted_performative_path, 1);
assert.equal(compiled.metrics.binding_public_authority_worlds, 0);
assert.equal(compiled.metrics.baseline_A_share, 0.6);
assert.equal(compiled.metrics.post_A_share, 0.8);
assert.ok(Math.abs(compiled.metrics.observed_A_share_shift - 0.2) < 1e-12);
assert.ok(Math.abs(compiled.metrics.maximum_observed_latent_total_variation - 0.2) < 1e-12);

assert.equal(compiled.classification.aggregate_shift_identifies_individual_preference_change, false);
assert.equal(compiled.classification.stable_panel_identity_alone_is_sufficient, false);
assert.equal(compiled.classification.instrument_invariance_or_crosswalk_required, true);
assert.equal(compiled.classification.reported_choice_always_equals_latent_preference, false);
assert.equal(compiled.classification.entry_and_exit_are_individual_conversion, false);
assert.equal(compiled.classification.imputation_is_observed_human_response, false);
assert.equal(compiled.classification.targeted_exposure_conversion_supports_performative_path, true);
assert.equal(compiled.classification.targeted_exposure_conversion_establishes_manipulation, false);
assert.equal(compiled.classification.binding_public_authority_supported, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const neutral = worlds['stable-panel-neutral-learning-conversion'];
assert.equal(neutral.individual_conversion_count, 200);
assert.equal(neutral.entrants, 0);
assert.equal(neutral.exits, 0);
assert.equal(neutral.stable_panel_identity, true);
assert.equal(neutral.post_latent_distribution.A, 0.8);
assert.equal(neutral.post_observed_distribution.A, 0.8);
assert.equal(neutral.performative_path_supported, false);
assert.equal(neutral.transition_matrix.B.A, 200);
assert.equal(neutral.transition_matrix.B.B, 200);

const targeted = worlds['stable-panel-targeted-exposure-conversion'];
assert.equal(targeted.individual_conversion_count, 200);
assert.equal(targeted.performative_path_supported, true);
assert.equal(targeted.exposure.assignment, 'model_selected_targeted_exposure');
assert.deepEqual(targeted.exposure.target_cohorts, ['B_SHIFT']);
assert.equal(targeted.post_latent_distribution.A, 0.8);
assert.equal(targeted.post_observed_distribution.A, 0.8);

const composition = worlds['composition-replacement-no-conversion'];
assert.equal(composition.individual_conversion_count, 0);
assert.equal(composition.entrants, 200);
assert.equal(composition.exits, 200);
assert.equal(composition.stable_panel_identity, false);
assert.equal(composition.composition_change, true);
assert.equal(composition.transition_matrix.ENTRY.A, 200);
assert.equal(composition.post_latent_distribution.A, 0.8);
assert.equal(composition.post_observed_distribution.A, 0.8);

const instrument = worlds['instrument-drift-no-conversion'];
assert.equal(instrument.individual_conversion_count, 0);
assert.equal(instrument.instrument_drift, true);
assert.equal(instrument.report_latent_divergence_count, 200);
assert.equal(instrument.post_latent_distribution.A, 0.6);
assert.equal(instrument.post_observed_distribution.A, 0.8);
assert.ok(Math.abs(instrument.observed_latent_total_variation - 0.2) < 1e-12);
assert.equal(instrument.report_matrix.B.A, 200);
assert.equal(instrument.report_matrix.B.B, 200);

const strategic = worlds['strategic-compliance-no-conversion'];
assert.equal(strategic.individual_conversion_count, 0);
assert.equal(strategic.strategic_compliance, true);
assert.equal(strategic.incentive.reporting_pressure, true);
assert.equal(strategic.report_latent_divergence_count, 200);
assert.equal(strategic.post_latent_distribution.A, 0.6);
assert.equal(strategic.post_observed_distribution.A, 0.8);

const imputation = worlds['postprocessing-imputation-no-conversion'];
assert.equal(imputation.individual_conversion_count, 0);
assert.equal(imputation.imputed_count, 200);
assert.equal(imputation.postprocessing.state, 'impute_nonresponse_as_A');
assert.equal(imputation.report_latent_divergence_count, 200);
assert.equal(imputation.post_latent_distribution.A, 0.6);
assert.equal(imputation.post_observed_distribution.A, 0.8);

const observedSignatures = new Set(compiled.worlds.map(world => world.observed_headline_signature_sha256));
const latentSignatures = new Set(compiled.worlds.map(world => world.latent_headline_signature_sha256));
const mechanismSignatures = new Set(compiled.worlds.map(world => world.mechanism_signature_sha256));
assert.equal(observedSignatures.size, 1);
assert.equal(latentSignatures.size, 2);
assert.equal(mechanismSignatures.size, 6);

for (const world of compiled.worlds) {
  assert.equal(world.post_observed_distribution.A, 0.8);
  assert.equal(world.post_observed_distribution.B, 0.2);
  assert.deepEqual(validatePreferenceDynamicChangeChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const directSimulation = simulateDynamicChangeWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'composition-replacement-no-conversion')
);
assert.equal(directSimulation.individual_conversion_count, 0);
assert.equal(directSimulation.entrants, 200);
assert.equal(directSimulation.exits, 200);
assert.equal(directSimulation.observed_counts.A, 800);

const markdown = renderPreferenceDynamicChangeMarkdown(compiled);
assert.match(markdown, /Dynamic preference change, composition, and measurement custody/);
assert.match(markdown, /Baseline A share: 60\.00%/);
assert.match(markdown, /Post-period A share: 80\.00%/);
assert.match(markdown, /Distinct observed headlines: 1/);
assert.match(markdown, /Distinct latent headlines: 2/);
assert.match(markdown, /Distinct mechanisms: 6/);
assert.match(markdown, /stable-panel-targeted-exposure-conversion/);
assert.match(markdown, /Performative path supported: true/);
assert.match(markdown, /composition-replacement-no-conversion/);
assert.match(markdown, /Entrants: 200/);
assert.match(markdown, /instrument-drift-no-conversion/);
assert.match(markdown, /Strategic compliance: true/);
assert.match(markdown, /Imputed observations: 200/);
assert.doesNotMatch(markdown, /Electric Twin changed|News UK manipulated|publicly authorized the intervention|real-world preference change confirmed/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceDynamicChangeFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceDynamicChangeFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceDynamicChangeFixture(missingWorld).some(error => /exactly the six required dynamic worlds/.test(error)));

const instrumentInvarianceLeak = structuredClone(fixture);
const instrumentWorld = instrumentInvarianceLeak.worlds.find(world => world.world_id === 'instrument-drift-no-conversion');
instrumentWorld.instrument.version = instrumentInvarianceLeak.baseline.instrument_version;
instrumentWorld.instrument.wording_hash = instrumentInvarianceLeak.baseline.wording_hash;
assert.ok(validatePreferenceDynamicChangeFixture(instrumentInvarianceLeak).some(error => /claims instrument drift without changing the instrument/.test(error)));

const unknownRetainedIdentity = structuredClone(fixture);
unknownRetainedIdentity.worlds[0].post_cohorts[0].cohort_id = 'UNKNOWN';
assert.ok(validatePreferenceDynamicChangeFixture(unknownRetainedIdentity).some(error => /lacks a baseline identity/.test(error)));

const postPopulationLeak = structuredClone(fixture);
postPopulationLeak.worlds[0].post_cohorts[0].count -= 1;
assert.ok(validatePreferenceDynamicChangeFixture(postPopulationLeak).some(error => /post cohorts must preserve the frozen population total/.test(error)));

const conversionExpectationLeak = structuredClone(fixture);
conversionExpectationLeak.worlds.find(world => world.world_id === 'stable-panel-neutral-learning-conversion').expected_individual_conversion_count = 0;
assert.throws(
  () => compilePreferenceDynamicChangeFixture(conversionExpectationLeak),
  /conversion count mismatch/
);

const observedHeadlineLeak = structuredClone(fixture);
const observedWorld = observedHeadlineLeak.worlds.find(world => world.world_id === 'stable-panel-neutral-learning-conversion');
observedWorld.post_cohorts.find(cohort => cohort.cohort_id === 'B_SHIFT').reported_choice = 'B';
assert.throws(
  () => compilePreferenceDynamicChangeFixture(observedHeadlineLeak),
  /observed counts mismatch/
);

const performativePathLeak = structuredClone(fixture);
performativePathLeak.worlds.find(world => world.world_id === 'stable-panel-targeted-exposure-conversion').performative_path_supported = false;
assert.throws(
  () => compilePreferenceDynamicChangeFixture(performativePathLeak),
  /worlds_with_targeted_performative_path mismatch/
);

const strategicLeak = structuredClone(fixture);
strategicLeak.worlds.find(world => world.world_id === 'strategic-compliance-no-conversion').incentive.reporting_pressure = false;
assert.throws(
  () => compilePreferenceDynamicChangeFixture(strategicLeak),
  /worlds_with_strategic_compliance mismatch/
);

const imputationLeak = structuredClone(fixture);
imputationLeak.worlds.find(world => world.world_id === 'postprocessing-imputation-no-conversion').post_cohorts.find(cohort => cohort.cohort_id === 'B_SHIFT').observation_source = 'direct';
assert.throws(
  () => compilePreferenceDynamicChangeFixture(imputationLeak),
  /imputed count mismatch/
);

const manipulationLeak = structuredClone(fixture);
manipulationLeak.expected_classification.targeted_exposure_conversion_establishes_manipulation = true;
assert.ok(validatePreferenceDynamicChangeFixture(manipulationLeak).some(error => /targeted_exposure_conversion_establishes_manipulation/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceDynamicChangeFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const realWorldLeak = structuredClone(fixture);
realWorldLeak.expected_classification.real_world_effect_claimed = true;
assert.ok(validatePreferenceDynamicChangeFixture(realWorldLeak).some(error => /real_world_effect_claimed/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[3].payload.report_latent_divergence_count += 1;
assert.ok(validatePreferenceDynamicChangeBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.distinct_observed_headline_signatures = 2;
assert.ok(validatePreferenceDynamicChangeBuild(metricInflation).some(error => /distinct_observed_headline_signatures must equal 1/.test(error)));

const preferenceClaimLeak = structuredClone(compiled);
preferenceClaimLeak.classification.preference_change_present = true;
assert.ok(validatePreferenceDynamicChangeBuild(preferenceClaimLeak).some(error => /must not claim real-world preference change/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceDynamicChangeFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-dynamic-change.test.js: OK');
