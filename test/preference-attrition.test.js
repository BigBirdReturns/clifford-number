import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceAttritionFixture,
  renderPreferenceAttritionMarkdown,
  validateAttritionChain,
  validatePreferenceAttritionBuild,
  validatePreferenceAttritionFixture
} from '../tools/lib/preference-attrition.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/refusal-exit.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceAttritionFixture(fixture), []);

const compiled = compilePreferenceAttritionFixture(fixture);
assert.deepEqual(validatePreferenceAttritionBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.metrics.distinct_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_full_outcome_signatures, 3);
assert.equal(compiled.metrics.distinct_mechanism_signatures, 3);
assert.equal(compiled.metrics.all_headlines_equal, true);
assert.equal(compiled.metrics.observed_total_range, 250);
assert.equal(compiled.metrics.exit_total_range, 250);
assert.equal(compiled.metrics.nonresponse_total_range, 250);
assert.equal(compiled.classification.preference_change_identification_from_headline, 'unavailable');
assert.equal(compiled.classification.strategic_refusal_identification_from_headline, 'unavailable');
assert.equal(compiled.classification.population_support_identification_from_headline, 'unavailable');
assert.equal(compiled.classification.same_headline_implies_same_population_state, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

const headlineSignatures = new Set(compiled.worlds.map(world => world.headline_signature_sha256));
const fullSignatures = new Set(compiled.worlds.map(world => world.full_outcome_signature_sha256));
assert.equal(headlineSignatures.size, 1);
assert.equal(fullSignatures.size, 3);
for (const world of compiled.worlds) {
  assert.equal(world.headline_normalized_observed_share.A, 0.8);
  assert.equal(world.headline_normalized_observed_share.B, 0.2);
  assert.deepEqual(validateAttritionChain(world.custody_chain), []);
}

const conversion = compiled.worlds.find(world => world.world_id === 'conversion-no-exit');
const exit = compiled.worlds.find(world => world.world_id === 'selective-exit-no-conversion');
const silence = compiled.worlds.find(world => world.world_id === 'strategic-silence-no-conversion');
assert.deepEqual(conversion.post_transition_preference, { A: 800, B: 200 });
assert.equal(conversion.full_outcome.observed_total, 1000);
assert.equal(exit.full_outcome.exit_total, 250);
assert.equal(exit.full_outcome.observed_total, 750);
assert.equal(silence.full_outcome.nonresponse_total, 250);
assert.equal(silence.full_outcome.observed_total, 750);

const markdown = renderPreferenceAttritionMarkdown(compiled);
assert.match(markdown, /Preference change identified from headline: false/);
assert.match(markdown, /Strategic refusal identified from headline: false/);
assert.match(markdown, /Population support identified from headline: false/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|converted the public/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceAttritionFixture(graphLeak).some(error => /graph_effect/.test(error)));

const invalidDisposition = structuredClone(fixture);
invalidDisposition.worlds[1].exit.B = 500;
assert.ok(validatePreferenceAttritionFixture(invalidDisposition).some(error => /exit plus nonresponse exceeds/.test(error)));

const headlineMismatch = structuredClone(fixture);
headlineMismatch.worlds[1].exit.B = 200;
assert.throws(() => compilePreferenceAttritionFixture(headlineMismatch), /does not produce the frozen expected headline/);

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[3].payload.observed.A = 799;
assert.ok(validatePreferenceAttritionBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const launderingBuild = structuredClone(compiled);
launderingBuild.classification.preference_change_identification_from_headline = 'identified';
assert.ok(validatePreferenceAttritionBuild(launderingBuild).some(error => /refuse preference-change identification/.test(error)));

const intentLeak = structuredClone(compiled);
intentLeak.classification.manipulative_intent_inferable = true;
assert.ok(validatePreferenceAttritionBuild(intentLeak).some(error => /refuse intent inference/.test(error)));

console.log('preference-attrition.test.js: OK');
