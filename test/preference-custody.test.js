import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceCustodyFixture,
  renderPreferenceCustodyMarkdown,
  validateCustodyChain,
  validatePreferenceCustodyBuild,
  validatePreferenceCustodyFixture
} from '../tools/lib/preference-custody.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/option-set-starvation.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceCustodyFixture(fixture), []);

const compiled = compilePreferenceCustodyFixture(fixture);
assert.deepEqual(validatePreferenceCustodyBuild(compiled), []);
assert.deepEqual(validateCustodyChain(compiled.custody_chain), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);
assert.equal(compiled.metrics.same_population_distinct_observations, true);
assert.equal(compiled.metrics.distinct_observation_signatures, 2);
assert.ok(compiled.metrics.max_unsupported_naive_full_vector_absolute_drift >= 0.3);

const fallback = compiled.scenarios.find(scenario => scenario.scenario_id === 'fallback-to-offered-option');
assert.deepEqual(fallback.observed_choices, { A: 400, B: 600 });
assert.equal(fallback.nonresponse, 0);
assert.equal(fallback.raw_choice_share_among_choices.A, 0.4);
assert.equal(fallback.raw_choice_share_among_choices.B, 0.6);
assert.equal(fallback.excluded_option_observation_state.C, 'unoffered');
assert.equal(fallback.provenance_by_latent_first_choice.C.observed_as, 'B');
assert.equal(fallback.provenance_by_latent_first_choice.C.observation_class, 'fallback_selected_because_first_choice_unavailable');
assert.equal(fallback.unsupported_naive_full_vector.C, 0);
assert.equal(fallback.first_choice_identification, 'unavailable_from_raw_choices');

const abstain = compiled.scenarios.find(scenario => scenario.scenario_id === 'abstain-when-first-choice-unavailable');
assert.deepEqual(abstain.observed_choices, { A: 400, B: 300 });
assert.equal(abstain.nonresponse, 300);
assert.ok(Math.abs(abstain.raw_choice_share_among_choices.A - (4 / 7)) < 1e-12);
assert.ok(Math.abs(abstain.raw_choice_share_among_choices.B - (3 / 7)) < 1e-12);
assert.equal(abstain.excluded_option_observation_state.C, 'unoffered');
assert.equal(abstain.provenance_by_latent_first_choice.C.observed_as, null);
assert.equal(abstain.provenance_by_latent_first_choice.C.observation_class, 'nonresponse_with_first_choice_unavailable');

const markdown = renderPreferenceCustodyMarkdown(compiled);
assert.match(markdown, /C observation state: unoffered/);
assert.match(markdown, /Full first-choice distribution identified from raw choices: false/);
assert.match(markdown, /Preference change present: false/);
assert.match(markdown, /Real-world effect claimed: false/);
assert.doesNotMatch(markdown, /C preference: 0|C was rejected|Electric Twin caused|News UK caused/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceCustodyFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceCustodyFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const invalidFallback = structuredClone(fixture);
invalidFallback.scenarios[0].unavailable_behavior.C.target = 'C';
assert.ok(validatePreferenceCustodyFixture(invalidFallback).some(error => /fallback target must be offered/.test(error)));

const missingBehavior = structuredClone(fixture);
delete missingBehavior.scenarios[0].unavailable_behavior.C;
assert.ok(validatePreferenceCustodyFixture(missingBehavior).some(error => /cover exactly the excluded options/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.custody_chain[3].payload.observed_choices.B = 599;
assert.ok(validatePreferenceCustodyBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const launderingBuild = structuredClone(compiled);
launderingBuild.scenarios[0].first_choice_identification = 'identified';
assert.ok(validatePreferenceCustodyBuild(launderingBuild).some(error => /must refuse first-choice identification/.test(error)));

const realWorldLeak = structuredClone(compiled);
realWorldLeak.classification.real_world_effect_claimed = true;
assert.ok(validatePreferenceCustodyBuild(realWorldLeak).some(error => /refuse real-world effect claims/.test(error)));

console.log('preference-custody.test.js: OK');
