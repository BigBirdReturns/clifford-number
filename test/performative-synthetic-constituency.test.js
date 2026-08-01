import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePerformativeFixture,
  renderPerformativeFixtureMarkdown,
  validatePerformativeBuild,
  validatePerformativeFixture
} from '../tools/lib/performative-synthetic-constituency.mjs';

const fixture = JSON.parse(readFileSync('data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json', 'utf8'));
assert.deepEqual(validatePerformativeFixture(fixture), []);

const compiled = compilePerformativeFixture(fixture);
assert.deepEqual(validatePerformativeBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

const first = compiled.rounds[0];
assert.equal(first.observed_feedback.A, 540);
assert.equal(first.observed_feedback.B, 40);
assert.ok(Math.abs(first.naive_estimate.A - (540 / 580)) < 1e-12);
assert.ok(Math.abs(first.naive_estimate.B - (40 / 580)) < 1e-12);
assert.ok(Math.abs(first.propensity_corrected_estimate.A - 0.6) < 1e-12);
assert.ok(Math.abs(first.propensity_corrected_estimate.B - 0.4) < 1e-12);

const second = compiled.rounds[1];
assert.ok(second.naive_estimate.A > first.naive_estimate.A);
assert.ok(second.naive_estimate.B < first.naive_estimate.B);
assert.ok(Math.abs(second.propensity_corrected_estimate.A - 0.6) < 1e-12);
assert.ok(Math.abs(second.propensity_corrected_estimate.B - 0.4) < 1e-12);
assert.ok(compiled.metrics.max_naive_absolute_drift_from_latent > 0.35);
assert.ok(compiled.metrics.max_propensity_corrected_absolute_drift_from_latent < 1e-12);

const markdown = renderPerformativeFixtureMarkdown(compiled);
assert.match(markdown, /not exposed|not_exposed/i);
assert.match(markdown, /Preference change present: false/);
assert.match(markdown, /Real-world effect claimed: false/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|manipulated the audience/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePerformativeFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePerformativeFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const mutablePreference = structuredClone(fixture);
mutablePreference.population.preference_mutable = true;
assert.ok(validatePerformativeFixture(mutablePreference).some(error => /preference_mutable false/.test(error)));

const missingCaveat = structuredClone(fixture);
delete missingCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePerformativeFixture(missingCaveat).some(error => /copy-ready caveat/.test(error)));

const badExposure = structuredClone(fixture);
badExposure.rounds[0].exposure_policy = { A: 0.8, B: 0.1 };
assert.ok(validatePerformativeFixture(badExposure).some(error => /sum to 1/.test(error)));

console.log('performative-synthetic-constituency.test.js: OK');
