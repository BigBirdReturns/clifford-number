import assert from 'node:assert/strict';
import { deriveHopEdges } from '../tools/lib/hops.mjs';

const densityPolicy = { max_hop_actor_count: 19 };
const surface = {
  surface_id: 'multi-stint-board',
  surface_label: 'Multi-stint board',
  surface_type: 'board_advisory_surface',
  hop_eligible: true,
  receipt_ids: ['r1'],
};
const stint = (actorId, start, end) => ({
  surface_id: surface.surface_id,
  participant_type: 'actor',
  actor_id: actorId,
  role: 'member',
  time_start: start,
  time_end: end,
  evidence_class: 'official',
  receipt_ids: ['r1'],
});

const participations = [
  stint('actor-a', '2020', '2020'),
  stint('actor-a', '2022', '2022'),
  stint('actor-b', '2019', '2023'),
];
const result = deriveHopEdges({
  surfaces: [surface],
  participationBySurface: new Map([[surface.surface_id, participations]]),
  broadOrgIds: new Set(),
  densityPolicy,
});

assert.equal(result.edges.length, 1, 'two actors must yield one actor-pair edge');
assert.deepEqual([result.edges[0].actor_a, result.edges[0].actor_b], ['actor-a', 'actor-b']);
assert.deepEqual(result.edges[0].surfaces.map(b => [b.valid_from, b.valid_until]), [
  ['2020-01-01', '2020-12-31'],
  ['2022-01-01', '2022-12-31'],
], 'both legitimate stints must survive as separate hop-basis windows');
for (const basis of result.edges[0].surfaces) {
  assert.equal(basis.actor_a_participation.actor_id, 'actor-a');
  assert.equal(basis.actor_b_participation.actor_id, 'actor-b');
  assert.deepEqual(basis.actor_a_participation.receipt_ids, ['r1']);
  assert.deepEqual(basis.actor_b_participation.receipt_ids, ['r1']);
  assert.equal(basis.actor_a_participation.window.dated, true);
  assert.equal(basis.actor_b_participation.window.dated, true);
}
assert.ok(!result.edges.some(e => e.actor_a === e.actor_b), 'multiple stints must never create a self-hop');
assert.ok(!result.rejectedHopPairs.some(p => p.actor_a === p.actor_b), 'multiple stints must never create a rejected self-pair');

const oneActorOnly = deriveHopEdges({
  surfaces: [surface],
  participationBySurface: new Map([[surface.surface_id, participations.slice(0, 2)]]),
  broadOrgIds: new Set(),
  densityPolicy,
});
assert.equal(oneActorOnly.edges.length, 0);
assert.deepEqual(oneActorOnly.rejectedHopSurfaces, [{
  surface_id: surface.surface_id,
  reason: 'fewer_than_two_actor_participants',
}], 'two rows for one actor still count as one participant');

console.log('hop-stints.test: OK');
