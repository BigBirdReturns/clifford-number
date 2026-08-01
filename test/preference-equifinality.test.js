import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceEquifinalityFixture,
  renderPreferenceEquifinalityMarkdown,
  validateEquifinalityChain,
  validatePreferenceEquifinalityBuild,
  validatePreferenceEquifinalityFixture
} from '../tools/lib/preference-equifinality.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/observational-equivalence.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceEquifinalityFixture(fixture), []);

const compiled = compilePreferenceEquifinalityFixture(fixture);
assert.deepEqual(validatePreferenceEquifinalityBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.metrics.distinct_latent_world_signatures, 3);
assert.equal(compiled.metrics.distinct_observation_signatures, 1);
assert.equal(compiled.metrics.all_pairwise_observations_equal, true);
assert.ok(Math.abs(compiled.metrics.maximum_pairwise_latent_total_variation - 0.3) < 1e-12);
assert.equal(compiled.classification.latent_first_choice_identification, 'unavailable');
assert.equal(compiled.classification.response_mechanism_identification, 'unavailable');
assert.equal(compiled.classification.same_behavior_implies_same_preference, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

const signatures = new Set(compiled.worlds.map(world => world.observation_signature_sha256));
assert.equal(signatures.size, 1);
for (const world of compiled.worlds) {
  assert.deepEqual(world.observed_choices, { A: 600, B: 400 });
  assert.equal(world.nonresponse, 0);
  assert.deepEqual(validateEquifinalityChain(world.custody_chain), []);
}

const direct = compiled.worlds.find(world => world.world_id === 'direct-a60-b40');
const fallbackA = compiled.worlds.find(world => world.world_id === 'hidden-c-falls-to-a');
const fallbackB = compiled.worlds.find(world => world.world_id === 'hidden-c-falls-to-b');
assert.equal(direct.latent_first_choice_distribution.C, 0);
assert.equal(fallbackA.latent_first_choice_distribution.C, 0.3);
assert.equal(fallbackB.latent_first_choice_distribution.C, 0.3);
assert.equal(fallbackA.provenance_by_latent_first_choice.C.observed_as, 'A');
assert.equal(fallbackB.provenance_by_latent_first_choice.C.observed_as, 'B');

const markdown = renderPreferenceEquifinalityMarkdown(compiled);
assert.match(markdown, /Compatible latent worlds: 3/);
assert.match(markdown, /Latent first-choice distribution identified: false/);
assert.match(markdown, /Response mechanism identified: false/);
assert.match(markdown, /Public authorization conferred: false/);
assert.doesNotMatch(markdown, /Electric Twin hid|News UK hid|manipulated the audience/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceEquifinalityFixture(graphLeak).some(error => /graph_effect/.test(error)));

const invalidFallback = structuredClone(fixture);
invalidFallback.worlds[1].unavailable_behavior.C.target = 'C';
assert.ok(validatePreferenceEquifinalityFixture(invalidFallback).some(error => /fallback target must be offered/.test(error)));

const observationMismatch = structuredClone(fixture);
observationMismatch.worlds[1].latent_first_choice.A = 301;
observationMismatch.worlds[1].latent_first_choice.B = 399;
assert.throws(() => compilePreferenceEquifinalityFixture(observationMismatch), /does not produce the frozen expected observation/);

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload.observed_choices.A = 599;
assert.ok(validatePreferenceEquifinalityBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const launderingBuild = structuredClone(compiled);
launderingBuild.classification.latent_first_choice_identification = 'identified';
assert.ok(validatePreferenceEquifinalityBuild(launderingBuild).some(error => /refuse latent first-choice identification/.test(error)));

const intentLeak = structuredClone(compiled);
intentLeak.classification.manipulative_intent_inferable = true;
assert.ok(validatePreferenceEquifinalityBuild(intentLeak).some(error => /refuse intent inference/.test(error)));

console.log('preference-equifinality.test.js: OK');
