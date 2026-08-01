import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceSubgroupFixture,
  renderPreferenceSubgroupMarkdown,
  validatePreferenceSubgroupBuild,
  validatePreferenceSubgroupFixture,
  validateSubgroupChain
} from '../tools/lib/preference-subgroup.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/subgroup-capacity.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceSubgroupFixture(fixture), []);

const compiled = compilePreferenceSubgroupFixture(fixture);
assert.deepEqual(validatePreferenceSubgroupBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.metrics.distinct_aggregate_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_subgroup_outcome_signatures, 3);
assert.equal(compiled.metrics.distinct_burden_signatures, 3);
assert.equal(compiled.metrics.all_aggregate_headlines_equal, true);
assert.equal(compiled.metrics.maximum_subgroup_success_rate_gap, 0.4);
assert.equal(compiled.metrics.maximum_adaptation_cost_ratio, 15);
assert.equal(compiled.metrics.aggregate_success_rate, 0.8);
assert.equal(compiled.classification.subgroup_outcome_identification_from_aggregate, 'unavailable');
assert.equal(compiled.classification.adaptation_burden_identification_from_aggregate, 'unavailable');
assert.equal(compiled.classification.willingness_identification_from_adaptation, 'unavailable');
assert.equal(compiled.classification.same_aggregate_implies_same_distribution, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

const headlines = new Set(compiled.worlds.map(world => world.aggregate_headline_signature_sha256));
assert.equal(headlines.size, 1);
for (const world of compiled.worlds) {
  assert.equal(world.aggregate_headline.success, 800);
  assert.equal(world.aggregate_headline.failure, 200);
  assert.equal(world.aggregate_headline.success_rate, 0.8);
  assert.deepEqual(validateSubgroupChain(world.custody_chain), []);
}

const balanced = compiled.worlds.find(world => world.world_id === 'balanced-capacity');
const alpha = compiled.worlds.find(world => world.world_id === 'alpha-advantaged');
const beta = compiled.worlds.find(world => world.world_id === 'beta-advantaged');
assert.equal(balanced.subgroup_success_rate_gap, 0);
assert.equal(alpha.groups.alpha.success_rate, 1);
assert.equal(alpha.groups.beta.success_rate, 0.6);
assert.equal(alpha.groups.beta.adaptation_cost_per_success, 30);
assert.equal(beta.groups.alpha.success_rate, 0.6);
assert.equal(beta.groups.beta.success_rate, 1);

const markdown = renderPreferenceSubgroupMarkdown(compiled);
assert.match(markdown, /Subgroup outcomes identified from aggregate: false/);
assert.match(markdown, /Adaptation burden identified from aggregate: false/);
assert.match(markdown, /Distributional acceptability established: false/);
assert.doesNotMatch(markdown, /Electric Twin discriminated|News UK harmed|manipulated the group/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceSubgroupFixture(graphLeak).some(error => /graph_effect/.test(error)));

const invalidGroup = structuredClone(fixture);
invalidGroup.worlds[1].groups.beta.failure = 199;
assert.ok(validatePreferenceSubgroupFixture(invalidGroup).some(error => /success plus failure/.test(error)));

const headlineMismatch = structuredClone(fixture);
headlineMismatch.worlds[1].groups.beta.success = 301;
headlineMismatch.worlds[1].groups.beta.failure = 199;
assert.throws(() => compilePreferenceSubgroupFixture(headlineMismatch), /does not produce the frozen aggregate headline/);

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[2].payload.alpha.success = 399;
assert.ok(validatePreferenceSubgroupBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const launderingBuild = structuredClone(compiled);
launderingBuild.classification.subgroup_outcome_identification_from_aggregate = 'identified';
assert.ok(validatePreferenceSubgroupBuild(launderingBuild).some(error => /refuse subgroup-outcome identification/.test(error)));

const intentLeak = structuredClone(compiled);
intentLeak.classification.manipulative_intent_inferable = true;
assert.ok(validatePreferenceSubgroupBuild(intentLeak).some(error => /refuse intent inference/.test(error)));

console.log('preference-subgroup.test.js: OK');
