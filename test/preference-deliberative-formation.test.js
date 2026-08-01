import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceDeliberativeFormationFixture,
  renderPreferenceDeliberativeFormationMarkdown,
  simulatePreferenceDeliberativeFormationWorld,
  validatePreferenceDeliberativeFormationBuild,
  validatePreferenceDeliberativeFormationChain,
  validatePreferenceDeliberativeFormationFixture
} from '../tools/lib/preference-deliberative-formation.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/deliberative-formation.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceDeliberativeFormationFixture(fixture), []);

const compiled = compilePreferenceDeliberativeFormationFixture(fixture);
assert.deepEqual(validatePreferenceDeliberativeFormationBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-published-disposition-different-deliberative-processes-v1');
assert.equal(compiled.status, 'deliberative_process_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.deepEqual(compiled.metrics, {
  world_count: 6,
  distinct_published_disposition_signatures: 1,
  distinct_private_preference_signatures: 2,
  distinct_ballot_signatures: 2,
  distinct_process_signatures: 6,
  worlds_with_private_conversion: 3,
  worlds_without_private_conversion: 3,
  worlds_with_reciprocal_reason_exchange: 1,
  worlds_with_reason_uptake: 1,
  worlds_with_amendment_uptake: 1,
  worlds_with_one_way_briefing: 1,
  worlds_with_vote_private_divergence: 2,
  worlds_with_strategic_logroll: 1,
  worlds_with_summary_vote_divergence: 1,
  worlds_with_deliberative_process: 1,
  worlds_with_reason_responsive_collective_position: 1,
  binding_public_authority_worlds: 0,
  baseline_A_share: 0.6,
  published_A_share: 0.8,
  published_A_share_shift: 0.20000000000000007,
  maximum_published_private_total_variation: 0.20000000000000004,
  maximum_published_vote_total_variation: 0.20000000000000004
});

for (const [key, value] of Object.entries({
  published_disposition_identifies_private_preference:false,
  information_exposure_is_deliberation:false,
  one_way_briefing_is_reciprocal_reason_exchange:false,
  speaking_opportunity_establishes_reason_uptake:false,
  majority_vote_is_consensus:false,
  strategic_logroll_is_focal_preference_conversion:false,
  published_summary_is_actual_ballot:false,
  reason_exchange_confers_binding_authority:false,
  amendment_is_collective_agreement_without_disposition_rule:false,
  deliberative_process_supported_in_at_least_one_world:true,
  reason_responsive_collective_position_supported_in_at_least_one_world:true,
  binding_public_authority_supported:false,
  manipulative_intent_inferable:false,
  real_world_effect_claimed:false,
  preference_change_present:false
})) assert.equal(compiled.classification[key], value);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const independent = worlds['independent-private-evidence-conversion'];
assert.equal(independent.private_conversion_count, 200);
assert.equal(independent.vote_private_divergence_count, 0);
assert.equal(independent.reciprocal_exchange_count, 0);
assert.equal(independent.deliberative_process_supported, false);
assert.equal(independent.post_private_distribution.A, 0.8);
assert.equal(independent.post_vote_distribution.A, 0.8);

const reciprocal = worlds['reciprocal-reason-exchange-amendment'];
assert.equal(reciprocal.private_conversion_count, 200);
assert.equal(reciprocal.reciprocal_exchange_count, 1);
assert.equal(reciprocal.reason_uptake_count, 2);
assert.equal(reciprocal.amendment_count, 1);
assert.equal(reciprocal.evidence_citation_count, 3);
assert.equal(reciprocal.deliberative_process_supported, true);
assert.equal(reciprocal.reason_responsive_collective_position_supported, true);
assert.equal(reciprocal.communication_events[0].speech_act, 'challenge');
assert.equal(reciprocal.communication_events[1].target_claim_id, 'C-BURDEN');
assert.ok(reciprocal.proposal_versions.some(proposal => proposal.proposal_id === 'A1' && proposal.parent_proposal_id === 'A0' && proposal.status === 'adopted'));

const briefing = worlds['one-way-expert-briefing-conversion'];
assert.equal(briefing.private_conversion_count, 200);
assert.equal(briefing.one_way_briefing, true);
assert.equal(briefing.reciprocal_exchange_count, 0);
assert.equal(briefing.deliberative_process_supported, false);

const conformity = worlds['public-conformity-vote-without-conversion'];
assert.equal(conformity.private_conversion_count, 0);
assert.equal(conformity.vote_private_divergence_count, 200);
assert.equal(conformity.conformity_vote, true);
assert.equal(conformity.post_private_distribution.A, 0.6);
assert.equal(conformity.post_vote_distribution.A, 0.8);

const logroll = worlds['strategic-logroll-vote-without-focal-conversion'];
assert.equal(logroll.private_conversion_count, 0);
assert.equal(logroll.vote_private_divergence_count, 200);
assert.equal(logroll.strategic_logroll, true);
assert.equal(logroll.side_agreements.length, 1);
assert.equal(logroll.side_agreements[0].agreement_id, 'SIDE-1');
assert.equal(logroll.post_private_distribution.A, 0.6);
assert.equal(logroll.post_vote_distribution.A, 0.8);

const summary = worlds['facilitator-summary-distortion-without-vote-change'];
assert.equal(summary.private_conversion_count, 0);
assert.equal(summary.vote_private_divergence_count, 0);
assert.equal(summary.summary_vote_divergence_count, 200);
assert.equal(summary.summary_distortion, true);
assert.equal(summary.post_private_distribution.A, 0.6);
assert.equal(summary.post_vote_distribution.A, 0.6);
assert.equal(summary.published_distribution.A, 0.8);
assert.equal(summary.facilitator.can_reclassify, true);
assert.deepEqual(summary.publication.summary_adjustments, [{from:'B',to:'A',count:200,source_group:'B_SHIFT',rule:'conditional_opposition_as_support'}]);

const publishedSignatures = new Set(compiled.worlds.map(world => world.published_disposition_signature_sha256));
const privateSignatures = new Set(compiled.worlds.map(world => world.private_preference_signature_sha256));
const ballotSignatures = new Set(compiled.worlds.map(world => world.ballot_signature_sha256));
const processSignatures = new Set(compiled.worlds.map(world => world.process_signature_sha256));
assert.equal(publishedSignatures.size, 1);
assert.equal(privateSignatures.size, 2);
assert.equal(ballotSignatures.size, 2);
assert.equal(processSignatures.size, 6);

for (const world of compiled.worlds) {
  assert.equal(world.published_distribution.A, 0.8);
  assert.equal(world.published_distribution.B, 0.2);
  assert.deepEqual(validatePreferenceDeliberativeFormationChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const direct = simulatePreferenceDeliberativeFormationWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'facilitator-summary-distortion-without-vote-change')
);
assert.deepEqual(direct.vote_counts, {A:600,B:400});
assert.deepEqual(direct.published_counts, {A:800,B:200});
assert.equal(direct.summary_vote_divergence_count, 200);

const markdown = renderPreferenceDeliberativeFormationMarkdown(compiled);
assert.match(markdown, /Deliberative reason exchange, vote, and summary custody/);
assert.match(markdown, /Baseline private A share: 60\.00%/);
assert.match(markdown, /Published A share: 80\.00%/);
assert.match(markdown, /reciprocal-reason-exchange-amendment/);
assert.match(markdown, /Reciprocal exchanges: 1/);
assert.match(markdown, /Reason uptake events: 2/);
assert.match(markdown, /Deliberative process supported: true/);
assert.match(markdown, /public-conformity-vote-without-conversion/);
assert.match(markdown, /Vote-private divergence: 200/);
assert.match(markdown, /facilitator-summary-distortion-without-vote-change/);
assert.match(markdown, /Summary-vote divergence: 200/);
assert.doesNotMatch(markdown, /consensus confirmed|publicly authorized|manipulated participants|named institution distorted/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceDeliberativeFormationFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceDeliberativeFormationFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceDeliberativeFormationFixture(missingWorld).some(error => /exactly the six required deliberative worlds/.test(error)));

const instrumentDrift = structuredClone(fixture);
instrumentDrift.worlds[0].instrument.version = 'instrument-v2';
assert.ok(validatePreferenceDeliberativeFormationFixture(instrumentDrift).some(error => /must preserve the baseline instrument/.test(error)));

const unknownTarget = structuredClone(fixture);
unknownTarget.worlds.find(world => world.world_id === 'reciprocal-reason-exchange-amendment').communication_events[1].target_claim_id = 'UNKNOWN';
assert.ok(validatePreferenceDeliberativeFormationFixture(unknownTarget).some(error => /targets unknown prior claim or proposal/.test(error)));

const roundOrderLeak = structuredClone(fixture);
roundOrderLeak.worlds.find(world => world.world_id === 'reciprocal-reason-exchange-amendment').communication_events[1].round = 1;
assert.ok(validatePreferenceDeliberativeFormationFixture(roundOrderLeak).some(error => /rounds must be strictly increasing/.test(error)));

const identityLeak = structuredClone(fixture);
identityLeak.worlds[0].post_groups[0].count -= 1;
assert.ok(validatePreferenceDeliberativeFormationFixture(identityLeak).some(error => /must preserve its baseline count|must preserve population_total/.test(error)));

const publicationExpectationLeak = structuredClone(fixture);
publicationExpectationLeak.worlds.find(world => world.world_id === 'independent-private-evidence-conversion').expected_published_counts = {A:799,B:201};
assert.throws(() => compilePreferenceDeliberativeFormationFixture(publicationExpectationLeak), /published counts mismatch/);

const deliberationInflation = structuredClone(fixture);
deliberationInflation.worlds.find(world => world.world_id === 'one-way-expert-briefing-conversion').deliberative_process_supported = true;
assert.throws(() => compilePreferenceDeliberativeFormationFixture(deliberationInflation), /deliberative-process classification mismatch/);

const reciprocityRemoval = structuredClone(fixture);
const reciprocalWorld = reciprocityRemoval.worlds.find(world => world.world_id === 'reciprocal-reason-exchange-amendment');
reciprocalWorld.communication_events = reciprocalWorld.communication_events.filter(event => event.speech_act !== 'response');
assert.throws(() => compilePreferenceDeliberativeFormationFixture(reciprocityRemoval), /reciprocal exchange count mismatch|deliberative-process classification mismatch/);

const summaryRuleLeak = structuredClone(fixture);
summaryRuleLeak.worlds.find(world => world.world_id === 'facilitator-summary-distortion-without-vote-change').publication.summary_adjustments = [];
assert.throws(() => compilePreferenceDeliberativeFormationFixture(summaryRuleLeak), /published counts mismatch/);

const strategicLeak = structuredClone(fixture);
strategicLeak.worlds.find(world => world.world_id === 'strategic-logroll-vote-without-focal-conversion').side_agreements = [];
assert.throws(() => compilePreferenceDeliberativeFormationFixture(strategicLeak), /worlds_with_strategic_logroll mismatch/);

const consensusLeak = structuredClone(fixture);
consensusLeak.expected_classification.majority_vote_is_consensus = true;
assert.ok(validatePreferenceDeliberativeFormationFixture(consensusLeak).some(error => /majority_vote_is_consensus/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceDeliberativeFormationFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const realWorldLeak = structuredClone(fixture);
realWorldLeak.expected_classification.real_world_effect_claimed = true;
assert.ok(validatePreferenceDeliberativeFormationFixture(realWorldLeak).some(error => /real_world_effect_claimed/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[5].payload.published_counts.A = 801;
assert.ok(validatePreferenceDeliberativeFormationBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.distinct_published_disposition_signatures = 2;
assert.ok(validatePreferenceDeliberativeFormationBuild(metricInflation).some(error => /distinct_published_disposition_signatures must equal 1/.test(error)));

const preferenceClaimLeak = structuredClone(compiled);
preferenceClaimLeak.classification.preference_change_present = true;
assert.ok(validatePreferenceDeliberativeFormationBuild(preferenceClaimLeak).some(error => /must not claim real-world preference change/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceDeliberativeFormationFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-deliberative-formation.test.js: OK');
