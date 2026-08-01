import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceStandingFixture,
  renderPreferenceStandingMarkdown,
  validatePreferenceStandingBuild,
  validatePreferenceStandingFixture,
  validateStandingChain
} from '../tools/lib/preference-standing.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/standing-authority.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceStandingFixture(fixture), []);

const compiled = compilePreferenceStandingFixture(fixture);
assert.deepEqual(validatePreferenceStandingBuild(compiled), []);
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.metrics.distinct_aggregate_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_support_evidence_classes, 3);
assert.equal(compiled.metrics.distinct_authority_classes, 3);
assert.equal(compiled.metrics.distinct_authority_resolution_signatures, 3);
assert.equal(compiled.metrics.public_authorized_worlds, 1);
assert.equal(compiled.metrics.institutionally_approved_without_public_authorization_worlds, 2);
assert.equal(compiled.metrics.binding_public_rejection_worlds, 1);
assert.equal(compiled.metrics.aggregate_support_rate, 0.8);
assert.equal(compiled.classification.modeled_support_confers_authorization, false);
assert.equal(compiled.classification.advisory_feedback_confers_authorization, false);
assert.equal(compiled.classification.institutional_approval_is_public_authorization, false);
assert.equal(compiled.classification.aggregate_support_identifies_authorization, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

for (const world of compiled.worlds) {
  assert.equal(world.aggregate_headline.support, 800);
  assert.equal(world.aggregate_headline.oppose, 200);
  assert.equal(world.aggregate_headline.support_rate, 0.8);
  assert.deepEqual(validateStandingChain(world.custody_chain), []);
}

const modeled = compiled.worlds.find(world => world.world_id === 'modeled-support-commissioner-approval');
const advisory = compiled.worlds.find(world => world.world_id === 'advisory-feedback-commissioner-approval');
const authorized = compiled.worlds.find(world => world.world_id === 'binding-balanced-approval');
const rejected = compiled.worlds.find(world => world.world_id === 'binding-distributed-rejection');
assert.equal(modeled.resolution.institutional_approval, true);
assert.equal(modeled.resolution.public_authorization, false);
assert.equal(advisory.resolution.institutional_approval, true);
assert.equal(advisory.resolution.public_authorization, false);
assert.equal(authorized.resolution.public_authorization, true);
assert.equal(authorized.resolution.implementation_state, 'authorized_by_binding_public_standing');
assert.equal(rejected.resolution.binding_public_rejection, true);
assert.equal(rejected.resolution.implementation_state, 'blocked_by_binding_public_rule');
assert.equal(rejected.group_support_rates.alpha, 1);
assert.equal(rejected.group_support_rates.beta, 0.6);
assert.equal(rejected.rule_evaluation.overall_threshold_met, true);
assert.equal(rejected.rule_evaluation.group_thresholds_met, false);

const markdown = renderPreferenceStandingMarkdown(compiled);
assert.match(markdown, /Prediction confers public authorization: false/);
assert.match(markdown, /Institutional approval equals public authorization: false/);
assert.match(markdown, /Binding public rejection blocks implementation: true/);
assert.doesNotMatch(markdown, /Electric Twin is illegitimate|News UK lacks legitimacy|manipulated the public/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceStandingFixture(graphLeak).some(error => /graph_effect/.test(error)));

const rightsLeak = structuredClone(fixture);
rightsLeak.worlds[2].authority_instrument.rights.veto = false;
assert.ok(validatePreferenceStandingFixture(rightsLeak).some(error => /requires amend, suspend, veto, appeal, and remedy rights/.test(error)));

const nonbindingAuthorization = structuredClone(fixture);
nonbindingAuthorization.worlds[0].expected_resolution.public_authorization = true;
assert.ok(validatePreferenceStandingFixture(nonbindingAuthorization).some(error => /cannot expect public authorization/.test(error)));

const resolutionMismatch = structuredClone(fixture);
resolutionMismatch.worlds[3].support_evidence.support_by_group.alpha = 400;
resolutionMismatch.worlds[3].support_evidence.support_by_group.beta = 400;
resolutionMismatch.worlds[3].decision.outcome = 'approve';
assert.throws(() => compilePreferenceStandingFixture(resolutionMismatch), /does not produce the frozen expected authority resolution/);

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[2].custody_chain[4].payload.public_authorization = false;
assert.ok(validatePreferenceStandingBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const launderingBuild = structuredClone(compiled);
launderingBuild.worlds[0].resolution.public_authorization = true;
assert.ok(validatePreferenceStandingBuild(launderingBuild).some(error => /nonbinding authority cannot resolve as publicly authorized/.test(error)));

const intentLeak = structuredClone(compiled);
intentLeak.classification.manipulative_intent_inferable = true;
assert.ok(validatePreferenceStandingBuild(intentLeak).some(error => /refuse intent inference/.test(error)));

console.log('preference-standing.test.js: OK');
