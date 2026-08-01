import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceSuccessionFixture,
  renderPreferenceSuccessionMarkdown,
  validatePreferenceSuccessionBuild,
  validatePreferenceSuccessionFixture,
  validateSuccessionChain
} from '../tools/lib/preference-succession.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/succession-validation.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceSuccessionFixture(fixture), []);

const compiled = compilePreferenceSuccessionFixture(fixture);
assert.deepEqual(validatePreferenceSuccessionBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.public_headline.score, 0.9);
assert.equal(compiled.metrics.distinct_public_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_successor_artifact_signatures, 4);
assert.equal(compiled.metrics.distinct_successor_metric_signatures, 2);
assert.equal(compiled.metrics.distinct_successor_policy_signatures, 2);
assert.equal(compiled.metrics.distinct_resolution_signatures, 6);
assert.equal(compiled.metrics.exact_inheritance_worlds, 1);
assert.equal(compiled.metrics.unvalidated_runtime_successor_worlds, 1);
assert.equal(compiled.metrics.current_noncomparable_metric_worlds, 1);
assert.equal(compiled.metrics.policy_validation_required_worlds, 1);
assert.equal(compiled.metrics.revalidated_successor_worlds, 1);
assert.equal(compiled.metrics.failed_revalidation_worlds, 1);
assert.equal(compiled.metrics.current_predictive_claim_worlds, 4);
assert.equal(compiled.metrics.continuity_claim_worlds, 2);
assert.equal(compiled.metrics.deployment_allowed_worlds, 3);
assert.equal(compiled.metrics.deployment_blocked_worlds, 3);
assert.equal(compiled.metrics.public_badge_unbound_worlds, 2);
assert.equal(compiled.metrics.shared_headline_but_deployment_blocked_worlds, 3);
assert.equal(compiled.metrics.rollback_required_worlds, 1);

for (const world of compiled.worlds) {
  assert.equal(world.public_headline.score, 0.9);
  assert.deepEqual(validateSuccessionChain(world.custody_chain), []);
}

const exact = compiled.worlds.find(world => world.world_id === 'exact-artifact-scope-replay');
assert.equal(exact.resolution.current_predictive_claim_eligible, true);
assert.equal(exact.resolution.continuity_claim_eligible, true);
assert.equal(exact.resolution.deployment_policy_claim_eligible, true);
assert.equal(exact.resolution.deployment_allowed, true);
assert.equal(exact.resolution.succession_state, 'exact_artifact_scope_inheritance');

const runtime = compiled.worlds.find(world => world.world_id === 'runtime-successor-inherits-old-badge');
assert.equal(runtime.resolution.artifact_changed, true);
assert.equal(runtime.resolution.current_predictive_claim_eligible, false);
assert.equal(runtime.resolution.public_badge_bound_to_current_predictive_artifact, false);
assert.equal(runtime.resolution.deployment_allowed, false);
assert.equal(runtime.resolution.succession_state, 'blocked_unvalidated_runtime_successor');

const metric = compiled.worlds.find(world => world.world_id === 'changed-metric-current-score-no-crosswalk');
assert.equal(metric.new_validation_passed, true);
assert.equal(metric.resolution.current_predictive_claim_eligible, true);
assert.equal(metric.resolution.metric_comparable, false);
assert.equal(metric.resolution.continuity_claim_eligible, false);
assert.equal(metric.resolution.deployment_allowed, true);
assert.equal(metric.resolution.succession_state, 'current_metric_validated_noncomparable_to_baseline');

const policy = compiled.worlds.find(world => world.world_id === 'policy-successor-inherits-predictive-badge');
assert.equal(policy.resolution.current_predictive_claim_eligible, true);
assert.equal(policy.resolution.deployment_policy_claim_eligible, false);
assert.equal(policy.resolution.public_badge_bound_to_current_predictive_artifact, true);
assert.equal(policy.resolution.deployment_allowed, false);
assert.equal(policy.resolution.succession_state, 'predictive_validation_retained_policy_validation_required');

const revalidated = compiled.worlds.find(world => world.world_id === 'fully-revalidated-successor');
assert.equal(revalidated.new_validation_passed, true);
assert.equal(revalidated.resolution.artifact_changed, true);
assert.equal(revalidated.resolution.metric_changed, true);
assert.equal(revalidated.resolution.policy_changed, true);
assert.equal(revalidated.resolution.metric_comparable, true);
assert.equal(revalidated.resolution.continuity_claim_eligible, true);
assert.equal(revalidated.resolution.deployment_allowed, true);
assert.equal(revalidated.resolution.succession_state, 'validated_successor_bounded_scope');

const failed = compiled.worlds.find(world => world.world_id === 'failed-revalidation-old-badge-and-rollback');
assert.equal(failed.new_validation_passed, false);
assert.equal(failed.resolution.current_predictive_claim_eligible, false);
assert.equal(failed.resolution.public_badge_bound_to_current_predictive_artifact, false);
assert.equal(failed.resolution.rollback_required, true);
assert.equal(failed.resolution.deployment_allowed, false);
assert.equal(failed.resolution.succession_state, 'failed_revalidation_preserved_and_rollback_required');

const markdown = renderPreferenceSuccessionMarkdown(compiled);
assert.match(markdown, /model, metric, policy, and validation succession/i);
assert.match(markdown, /Score: 90\.00%/);
assert.match(markdown, /Revalidated successor can carry a bounded claim: true/);
assert.match(markdown, /Failed revalidation is negative evidence, not missing data: true/);
assert.doesNotMatch(markdown, /Electric Twin reused|News UK reused|deceived the public/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceSuccessionFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceSuccessionFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const exactDrift = structuredClone(fixture);
exactDrift.worlds[0].successor_artifact.model_id = 'model-v2';
assert.ok(validatePreferenceSuccessionFixture(exactDrift).some(error => /exact inheritance requires no artifact/.test(error)));

const missingMetricReceipt = structuredClone(fixture);
missingMetricReceipt.worlds[2].new_validation = null;
assert.ok(validatePreferenceSuccessionFixture(missingMetricReceipt).some(error => /changed-metric validation requires a new receipt/.test(error)));

const policyTestLeak = structuredClone(fixture);
policyTestLeak.worlds[3].policy_consequence_test = true;
assert.ok(validatePreferenceSuccessionFixture(policyTestLeak).some(error => /policy successor must change policy, omit the consequence test/.test(error)));

const failedPassLeak = structuredClone(fixture);
failedPassLeak.worlds[5].new_validation.score = 0.9;
assert.ok(validatePreferenceSuccessionFixture(failedPassLeak).some(error => /failed revalidation requires a changed artifact and a below-threshold receipt/.test(error)));

const missingRules = structuredClone(fixture);
missingRules.required_refusal_rules = [];
assert.ok(validatePreferenceSuccessionFixture(missingRules).some(error => /required refusal rule missing/.test(error)));

const tampered = structuredClone(compiled.worlds[4].custody_chain);
tampered[6].payload.resolution.deployment_allowed = false;
assert.ok(validateSuccessionChain(tampered).some(error => /hash mismatch/.test(error)));

console.log('preference-succession.test.js: OK');
