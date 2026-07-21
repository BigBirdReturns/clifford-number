import assert from 'node:assert/strict';
import {
  computeCorridors,
  selectBudgetedParticipants,
  shortestFilteredPath,
  summarizeClusters
} from '../src/visual-aperture-core.mjs';
import {
  buildVisualApertureScaleFixture,
  summarizeVisualApertureScaleFixture,
  syntheticActorId
} from '../tools/visual-aperture-scale-fixture.mjs';

const fixture = buildVisualApertureScaleFixture({
  actorCount: 5000,
  surfaceCount: 1200,
  denseRosterSize: 5000,
  hopEdgeCount: 1000,
  participantsPerSurface: 8
});
const summary = summarizeVisualApertureScaleFixture(fixture);

assert.equal(fixture.fixture_version, 'clifford-visual-aperture-scale-fixture@1');
assert.equal(fixture.graph_effect, 'none');
assert.equal(fixture.contains_real_people, false);
assert.deepEqual(summary, {
  fixture_version: 'clifford-visual-aperture-scale-fixture@1',
  graph_effect: 'none',
  contains_real_people: false,
  actors: 5000,
  surfaces: 1200,
  participations: 14592,
  dense_roster_actors: 5000,
  dense_roster_hop_eligible: false,
  hop_edges: 1000,
  dense_roster_hop_bases: 0
});

const dense = fixture.surfaceGraph.surfaces.find(surface => surface.surface_id === fixture.dense_surface_id);
assert.ok(dense);
assert.equal(dense.hop_eligible, false);
assert.match(dense.notes, /no participant-to-participant adjacency/i);
assert.equal(dense.participants.length, 5000);
assert.ok(dense.participants.every(participant => participant.participant_type === 'actor'));

const labels = new Map(fixture.surfaceGraph.actors.map(actor => [actor.id, actor.label]));
const selection = selectBudgetedParticipants(dense, {
  budget: 36,
  pinnedIds: new Set([syntheticActorId(4999)]),
  labels
});
assert.equal(selection.visible.length, 36);
assert.equal(selection.visible[0].actor_id, syntheticActorId(4999));
assert.equal(selection.totalActors, 5000);
assert.equal(selection.hiddenByBudget, 4964);

const clusters = summarizeClusters(fixture.surfaceGraph);
assert.ok(clusters.length <= 7, 'synthetic fixture must keep the family vocabulary fixed');
assert.equal(clusters.reduce((sum, cluster) => sum + cluster.surfaceCount, 0), 1200);
const corridors = computeCorridors(fixture.surfaceGraph);
assert.ok(corridors.length <= fixture.expected.maximum_family_pairs);
assert.deepEqual(corridors, computeCorridors(fixture.surfaceGraph), 'aggregate ordering must remain deterministic');

const route = shortestFilteredPath(
  fixture.hopGraph,
  syntheticActorId(0),
  syntheticActorId(1000),
  { asOf: '2024', evidenceFloor: 'official' }
);
assert.equal(route.number, 1000);
assert.equal(route.actorPath.length, 1001);
assert.equal(route.hops[0].basis.surface_id, 'synthetic-surface-0001');
assert.equal(route.hops.at(-1).basis.surface_id, 'synthetic-surface-1000');

const theoreticalDensePairs = (5000 * 4999) / 2;
assert.equal(fixture.hopGraph.edges.length, 1000);
assert.ok(fixture.hopGraph.edges.length < theoreticalDensePairs / 1000);
assert.equal(
  fixture.hopGraph.edges.flatMap(edge => edge.surfaces ?? []).filter(basis => basis.surface_id === fixture.dense_surface_id).length,
  0,
  'the 5,000-actor context roster must never generate a hop basis'
);

console.log('visual-aperture-scale.test.js: OK');
