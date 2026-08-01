import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceNetworkFormationFixture,
  renderPreferenceNetworkFormationMarkdown,
  simulatePreferenceNetworkFormationWorld,
  validatePreferenceNetworkFormationBuild,
  validatePreferenceNetworkFormationChain,
  validatePreferenceNetworkFormationFixture
} from '../tools/lib/preference-network-formation.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/network-formation.fixture.json', 'utf8'));
assert.deepEqual(validatePreferenceNetworkFormationFixture(fixture), []);

const compiled = compilePreferenceNetworkFormationFixture(fixture);
assert.deepEqual(validatePreferenceNetworkFormationBuild(compiled), []);
assert.equal(compiled.fixture_id, 'same-surfaced-majority-different-network-mechanisms-v1');
assert.equal(compiled.status, 'network_formation_equifinality_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none');
assert.equal(compiled.metrics.world_count, 6);
assert.equal(compiled.metrics.distinct_surface_headline_signatures, 1);
assert.equal(compiled.metrics.distinct_latent_headline_signatures, 2);
assert.equal(compiled.metrics.distinct_report_headline_signatures, 2);
assert.equal(compiled.metrics.distinct_action_headline_signatures, 2);
assert.equal(compiled.metrics.distinct_mechanism_signatures, 6);
assert.equal(compiled.metrics.worlds_with_latent_conversion, 3);
assert.equal(compiled.metrics.worlds_without_latent_conversion, 3);
assert.equal(compiled.metrics.worlds_with_independent_conversion, 1);
assert.equal(compiled.metrics.worlds_with_peer_mediated_conversion, 1);
assert.equal(compiled.metrics.worlds_with_common_source_conversion, 1);
assert.equal(compiled.metrics.worlds_with_report_latent_divergence, 1);
assert.equal(compiled.metrics.worlds_with_action_latent_divergence, 1);
assert.equal(compiled.metrics.worlds_with_ranking_amplification, 1);
assert.equal(compiled.metrics.worlds_with_network_mediated_response, 3);
assert.equal(compiled.metrics.worlds_with_collective_deliberation, 0);
assert.equal(compiled.metrics.stable_identity_worlds, 6);
assert.equal(compiled.metrics.stable_network_version_worlds, 6);
assert.equal(compiled.metrics.stable_instrument_worlds, 6);
assert.equal(compiled.metrics.binding_public_authority_worlds, 0);
assert.equal(compiled.metrics.baseline_A_share, 0.6);
assert.equal(compiled.metrics.surfaced_A_share, 0.8);
assert.ok(Math.abs(compiled.metrics.surfaced_A_share_shift - 0.2) < 1e-12);
assert.ok(Math.abs(compiled.metrics.maximum_surface_latent_total_variation - 0.2) < 1e-12);
assert.ok(Math.abs(compiled.metrics.maximum_surface_report_total_variation - 0.2) < 1e-12);

assert.equal(compiled.classification.surface_majority_identifies_independent_preference_distribution, false);
assert.equal(compiled.classification.correlated_change_identifies_peer_influence_without_source_separation, false);
assert.equal(compiled.classification.homophily_identifies_contagion, false);
assert.equal(compiled.classification.common_broadcast_is_peer_cascade, false);
assert.equal(compiled.classification.public_report_always_equals_private_preference, false);
assert.equal(compiled.classification.public_action_always_equals_private_preference, false);
assert.equal(compiled.classification.surfaced_share_always_equals_population_report_share, false);
assert.equal(compiled.classification.peer_influence_path_supported_in_at_least_one_world, true);
assert.equal(compiled.classification.collective_deliberation_supported, false);
assert.equal(compiled.classification.network_path_establishes_manipulation, false);
assert.equal(compiled.classification.binding_public_authority_supported, false);
assert.equal(compiled.classification.preference_change_present, false);
assert.equal(compiled.classification.manipulative_intent_inferable, false);
assert.equal(compiled.classification.real_world_effect_claimed, false);

const worlds = Object.fromEntries(compiled.worlds.map(world => [world.world_id, world]));
const independent = worlds['independent-private-evidence-conversion'];
assert.equal(independent.latent_conversion_count, 200);
assert.equal(independent.private_source_conversion_count, 200);
assert.equal(independent.peer_mediated_conversion_count, 0);
assert.equal(independent.common_source_conversion_count, 0);
assert.equal(independent.independent_conversion, true);
assert.equal(independent.post_latent_distribution.A, 0.8);
assert.equal(independent.post_report_distribution.A, 0.8);
assert.equal(independent.surfaced_distribution.A, 0.8);
assert.equal(independent.network_mediated_response, false);

const cascade = worlds['peer-cascade-latent-conversion'];
assert.equal(cascade.latent_conversion_count, 200);
assert.equal(cascade.private_source_conversion_count, 50);
assert.equal(cascade.peer_mediated_conversion_count, 150);
assert.equal(cascade.common_source_conversion_count, 0);
assert.equal(cascade.independent_conversion, false);
assert.equal(cascade.network_mediated_response, true);
assert.equal(cascade.peer_rounds.length, 2);
assert.equal(cascade.peer_rounds[1].source, 'converted_peers');
assert.deepEqual(cascade.counterfactual.expected_surface_counts, { A: 650, B: 350 });

const broadcast = worlds['common-broadcast-latent-conversion'];
assert.equal(broadcast.latent_conversion_count, 200);
assert.equal(broadcast.private_source_conversion_count, 0);
assert.equal(broadcast.peer_mediated_conversion_count, 0);
assert.equal(broadcast.common_source_conversion_count, 200);
assert.equal(broadcast.network_mediated_response, false);
assert.equal(broadcast.common_broadcast.state, 'institutional_broadcast_signal_A');
assert.deepEqual(broadcast.counterfactual.expected_surface_counts, { A: 600, B: 400 });

const conformity = worlds['pluralistic-conformity-reporting'];
assert.equal(conformity.latent_conversion_count, 0);
assert.equal(conformity.report_latent_divergence_count, 200);
assert.equal(conformity.action_latent_divergence_count, 0);
assert.equal(conformity.post_latent_distribution.A, 0.6);
assert.equal(conformity.post_report_distribution.A, 0.8);
assert.equal(conformity.post_action_distribution.A, 0.6);
assert.equal(conformity.surfaced_distribution.A, 0.8);
assert.equal(conformity.social_incentive.conformity_pressure, true);
assert.equal(conformity.network_mediated_response, true);

const coordination = worlds['coordination-action-without-conversion'];
assert.equal(coordination.latent_conversion_count, 0);
assert.equal(coordination.report_latent_divergence_count, 0);
assert.equal(coordination.action_latent_divergence_count, 200);
assert.equal(coordination.post_latent_distribution.A, 0.6);
assert.equal(coordination.post_report_distribution.A, 0.6);
assert.equal(coordination.post_action_distribution.A, 0.8);
assert.equal(coordination.surfaced_distribution.A, 0.8);
assert.equal(coordination.social_incentive.coordination_payoff, true);
assert.equal(coordination.surface_source, 'public_action');
assert.equal(coordination.network_mediated_response, true);

const visibility = worlds['algorithmic-visibility-amplification'];
assert.equal(visibility.latent_conversion_count, 0);
assert.equal(visibility.report_latent_divergence_count, 0);
assert.equal(visibility.action_latent_divergence_count, 0);
assert.equal(visibility.post_latent_distribution.A, 0.6);
assert.equal(visibility.post_report_distribution.A, 0.6);
assert.equal(visibility.post_action_distribution.A, 0.6);
assert.equal(visibility.surfaced_distribution.A, 0.8);
assert.equal(visibility.surface_counts.A, 800);
assert.equal(visibility.surface_counts.B, 200);
assert.equal(visibility.ranking_amplification, true);
assert.equal(visibility.ranking.weights.A, 4);
assert.equal(visibility.ranking.weights.B, 1.5);
assert.ok(Math.abs(visibility.surface_report_total_variation - 0.2) < 1e-12);

const surfaceSignatures = new Set(compiled.worlds.map(world => world.surface_headline_signature_sha256));
const latentSignatures = new Set(compiled.worlds.map(world => world.latent_headline_signature_sha256));
const reportSignatures = new Set(compiled.worlds.map(world => world.report_headline_signature_sha256));
const actionSignatures = new Set(compiled.worlds.map(world => world.action_headline_signature_sha256));
const mechanismSignatures = new Set(compiled.worlds.map(world => world.mechanism_signature_sha256));
const networkSignatures = new Set(compiled.worlds.map(world => world.network_snapshot_sha256));
assert.equal(surfaceSignatures.size, 1);
assert.equal(latentSignatures.size, 2);
assert.equal(reportSignatures.size, 2);
assert.equal(actionSignatures.size, 2);
assert.equal(mechanismSignatures.size, 6);
assert.equal(networkSignatures.size, 1);

for (const world of compiled.worlds) {
  assert.equal(world.surfaced_distribution.A, 0.8);
  assert.equal(world.surfaced_distribution.B, 0.2);
  assert.equal(world.network_version, 'network-v1');
  assert.equal(world.instrument.invariant_from_baseline, true);
  assert.equal(world.collective_deliberation_supported, false);
  assert.deepEqual(validatePreferenceNetworkFormationChain(world.custody_chain), []);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}

const directSimulation = simulatePreferenceNetworkFormationWorld(
  fixture,
  fixture.worlds.find(world => world.world_id === 'algorithmic-visibility-amplification')
);
assert.deepEqual(directSimulation.report_counts, { A: 600, B: 400 });
assert.deepEqual(directSimulation.surface_counts, { A: 800, B: 200 });
assert.equal(directSimulation.ranking_amplification, true);

const markdown = renderPreferenceNetworkFormationMarkdown(compiled);
assert.match(markdown, /Network dependence and collective preference-formation custody/);
assert.match(markdown, /Baseline A share: 60\.00%/);
assert.match(markdown, /Surfaced A share: 80\.00%/);
assert.match(markdown, /peer-cascade-latent-conversion/);
assert.match(markdown, /Peer-mediated conversions: 150/);
assert.match(markdown, /common-broadcast-latent-conversion/);
assert.match(markdown, /Common-source conversions: 200/);
assert.match(markdown, /pluralistic-conformity-reporting/);
assert.match(markdown, /Report-latent divergence: 200/);
assert.match(markdown, /coordination-action-without-conversion/);
assert.match(markdown, /Action-latent divergence: 200/);
assert.match(markdown, /algorithmic-visibility-amplification/);
assert.match(markdown, /Ranking amplification: true/);
assert.doesNotMatch(markdown, /Electric Twin caused|News UK caused|collective deliberation confirmed|manipulated the public|publicly authorized the intervention/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceNetworkFormationFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceNetworkFormationFixture(thesisLeak).some(error => /must not count toward thesis evidence/.test(error)));

const missingWorld = structuredClone(fixture);
missingWorld.worlds.pop();
assert.ok(validatePreferenceNetworkFormationFixture(missingWorld).some(error => /exactly the six required network worlds/.test(error)));

const networkDrift = structuredClone(fixture);
networkDrift.worlds[0].network_version = 'network-v2';
assert.ok(validatePreferenceNetworkFormationFixture(networkDrift).some(error => /must preserve the baseline network version/.test(error)));

const instrumentDrift = structuredClone(fixture);
instrumentDrift.worlds[0].instrument.version = 'instrument-v2';
assert.ok(validatePreferenceNetworkFormationFixture(instrumentDrift).some(error => /must preserve the baseline instrument/.test(error)));

const unknownEdgeGroup = structuredClone(fixture);
unknownEdgeGroup.baseline.edge_classes[0].to_group = 'UNKNOWN';
assert.ok(validatePreferenceNetworkFormationFixture(unknownEdgeGroup).some(error => /references an unknown group/.test(error)));

const recipientCountLeak = structuredClone(fixture);
recipientCountLeak.worlds.find(world => world.world_id === 'common-broadcast-latent-conversion').common_broadcast.recipient_count = 199;
assert.ok(validatePreferenceNetworkFormationFixture(recipientCountLeak).some(error => /recipient_count does not match recipient groups/.test(error)));

const peerOrderLeak = structuredClone(fixture);
const peerOrderWorld = peerOrderLeak.worlds.find(world => world.world_id === 'peer-cascade-latent-conversion');
peerOrderWorld.peer_rounds[1].round = 0;
assert.ok(validatePreferenceNetworkFormationFixture(peerOrderLeak).some(error => /strictly increasing/.test(error)));

const groupCountLeak = structuredClone(fixture);
groupCountLeak.worlds[0].post_groups[0].count -= 1;
assert.ok(validatePreferenceNetworkFormationFixture(groupCountLeak).some(error => /must preserve its baseline count|must preserve population_total/.test(error)));

const surfaceExpectationLeak = structuredClone(fixture);
surfaceExpectationLeak.worlds.find(world => world.world_id === 'independent-private-evidence-conversion').expected_surface_counts = { A: 799, B: 201 };
assert.throws(
  () => compilePreferenceNetworkFormationFixture(surfaceExpectationLeak),
  /surface counts mismatch/
);

const cascadeExpectationLeak = structuredClone(fixture);
cascadeExpectationLeak.worlds.find(world => world.world_id === 'peer-cascade-latent-conversion').expected_peer_mediated_conversion_count = 0;
assert.throws(
  () => compilePreferenceNetworkFormationFixture(cascadeExpectationLeak),
  /peer-mediated conversion count mismatch/
);

const rankingLeak = structuredClone(fixture);
rankingLeak.worlds.find(world => world.world_id === 'algorithmic-visibility-amplification').ranking.weights.A = 1;
assert.throws(
  () => compilePreferenceNetworkFormationFixture(rankingLeak),
  /surface counts mismatch/
);

const commonSourceLeak = structuredClone(fixture);
commonSourceLeak.worlds.find(world => world.world_id === 'common-broadcast-latent-conversion').common_broadcast.recipient_groups = [];
commonSourceLeak.worlds.find(world => world.world_id === 'common-broadcast-latent-conversion').common_broadcast.recipient_count = 0;
assert.throws(
  () => compilePreferenceNetworkFormationFixture(commonSourceLeak),
  /common-source conversion count mismatch|worlds_with_common_source_conversion mismatch/
);

const manipulationLeak = structuredClone(fixture);
manipulationLeak.expected_classification.network_path_establishes_manipulation = true;
assert.ok(validatePreferenceNetworkFormationFixture(manipulationLeak).some(error => /network_path_establishes_manipulation/.test(error)));

const deliberationLeak = structuredClone(fixture);
deliberationLeak.expected_classification.collective_deliberation_supported = true;
assert.ok(validatePreferenceNetworkFormationFixture(deliberationLeak).some(error => /collective_deliberation_supported/.test(error)));

const authorityLeak = structuredClone(fixture);
authorityLeak.expected_classification.binding_public_authority_supported = true;
assert.ok(validatePreferenceNetworkFormationFixture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const realWorldLeak = structuredClone(fixture);
realWorldLeak.expected_classification.real_world_effect_claimed = true;
assert.ok(validatePreferenceNetworkFormationFixture(realWorldLeak).some(error => /real_world_effect_claimed/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.worlds[0].custody_chain[4].payload.surface_counts.A = 801;
assert.ok(validatePreferenceNetworkFormationBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const metricInflation = structuredClone(compiled);
metricInflation.metrics.distinct_surface_headline_signatures = 2;
assert.ok(validatePreferenceNetworkFormationBuild(metricInflation).some(error => /distinct_surface_headline_signatures must equal 1/.test(error)));

const preferenceClaimLeak = structuredClone(compiled);
preferenceClaimLeak.classification.preference_change_present = true;
assert.ok(validatePreferenceNetworkFormationBuild(preferenceClaimLeak).some(error => /must not claim real-world preference change/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceNetworkFormationFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-network-formation.test.js: OK');
