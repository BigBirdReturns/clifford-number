import assert from 'node:assert/strict';
import { loadAll } from '../tools/lib/ledger.mjs';
import { assessHopDensity, countDistinctActorParticipants } from '../tools/lib/density.mjs';
import { deriveHopEdges } from '../tools/lib/hops.mjs';

const data = loadAll();
const policy = data.densityPolicy;
const dialog = data.surfaces.find(s => s.surface_id === 'dialog-public-directory-exposure-2026-06-16');
const directoryType = data.surfaceTypes.find(t => t.id === 'directory_roster_surface');
const dialogParts = data.participation.filter(p => p.surface_id === dialog.surface_id);

assert.equal(dialog.hop_eligible, false, 'the 112-actor Dialog public directory must remain non-hop');
assert.equal(directoryType.hop_eligible_default, false, 'new directory/roster surfaces must default to non-hop');
assert.ok(countDistinctActorParticipants(dialogParts) > policy.max_hop_actor_count,
  'Dialog must exercise the configured density boundary');
assert.equal(assessHopDensity(dialog, dialogParts, policy).exceeds_limit, false,
  'a dense non-hop surface remains valid scorable context');

function fixture(actorCount, hopEligible = true) {
  const surface = {
    surface_id: `roster-${actorCount}`,
    surface_label: `${actorCount}-actor roster`,
    surface_type: 'directory_roster_surface',
    hop_eligible: hopEligible,
    receipt_ids: ['r1'],
  };
  const participants = Array.from({ length: actorCount }, (_, i) => ({
    surface_id: surface.surface_id,
    participant_type: 'actor',
    actor_id: `actor-${i}`,
    role: 'listed member',
    evidence_class: 'primary_public',
    receipt_ids: ['r1'],
  }));
  return { surface, participants };
}

const atLimit = fixture(policy.max_hop_actor_count);
const allowed = deriveHopEdges({
  surfaces: [atLimit.surface],
  participationBySurface: new Map([[atLimit.surface.surface_id, atLimit.participants]]),
  broadOrgIds: new Set(),
  densityPolicy: policy,
});
assert.equal(allowed.edges.length, policy.max_hop_actor_count * (policy.max_hop_actor_count - 1) / 2,
  'a surface at the configured ceiling remains eligible');

const overLimit = fixture(policy.max_hop_actor_count + 1);
const rejected = deriveHopEdges({
  surfaces: [overLimit.surface],
  participationBySurface: new Map([[overLimit.surface.surface_id, overLimit.participants]]),
  broadOrgIds: new Set(),
  densityPolicy: policy,
});
assert.equal(rejected.edges.length, 0, 'a broad roster must not create any pairwise hops');
assert.deepEqual(rejected.rejectedHopSurfaces, [{
  surface_id: overLimit.surface.surface_id,
  reason: 'density_limit_exceeded',
  actor_count: policy.max_hop_actor_count + 1,
  max_hop_actor_count: policy.max_hop_actor_count,
}]);


// Phase 0 section 2.2 acceptance: adding a 100-member roster must not change
// the pre-existing actor graph or reduce its median finite pairwise distance.
// The test uses the full roster denominator rather than only the policy edge.
function pairSurface(id, actorA, actorB) {
  const surface = {
    surface_id: id,
    surface_label: id,
    surface_type: 'government_advisory_surface',
    hop_eligible: true,
    receipt_ids: ['r1'],
  };
  const participants = [actorA, actorB].map(actor_id => ({
    surface_id: id,
    participant_type: 'actor',
    actor_id,
    role: 'participant',
    evidence_class: 'official',
    receipt_ids: ['r1'],
  }));
  return { surface, participants };
}

function edgePairs(edges) {
  return edges
    .map(edge => [edge.actor_a, edge.actor_b].sort().join('|'))
    .sort();
}

function medianFinitePairwiseDistance(edges, actorIds) {
  const adjacency = new Map(actorIds.map(id => [id, new Set()]));
  for (const edge of edges) {
    adjacency.get(edge.actor_a)?.add(edge.actor_b);
    adjacency.get(edge.actor_b)?.add(edge.actor_a);
  }
  const distances = [];
  for (let left = 0; left < actorIds.length; left += 1) {
    const start = actorIds[left];
    const seen = new Map([[start, 0]]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.set(next, seen.get(current) + 1);
        queue.push(next);
      }
    }
    for (let right = left + 1; right < actorIds.length; right += 1) {
      const value = seen.get(actorIds[right]);
      if (Number.isFinite(value)) distances.push(value);
    }
  }
  distances.sort((a, b) => a - b);
  assert.ok(distances.length > 0, 'control graph must contain finite actor pairs');
  const middle = Math.floor(distances.length / 2);
  return distances.length % 2
    ? distances[middle]
    : (distances[middle - 1] + distances[middle]) / 2;
}

const controlActors = Array.from({ length: 5 }, (_, index) => `actor-${index}`);
const controlSurfaces = controlActors.slice(0, -1)
  .map((actorId, index) => pairSurface(`control-${index}`, actorId, controlActors[index + 1]));
const controlMap = new Map(controlSurfaces.map(row => [row.surface.surface_id, row.participants]));
const controlResult = deriveHopEdges({
  surfaces: controlSurfaces.map(row => row.surface),
  participationBySurface: controlMap,
  broadOrgIds: new Set(),
  densityPolicy: policy,
});
const controlMedian = medianFinitePairwiseDistance(controlResult.edges, controlActors);
assert.equal(controlMedian, 2, 'control path median must remain stable and inspectable');

const roster100 = fixture(100, false);
const withRosterResult = deriveHopEdges({
  surfaces: [...controlSurfaces.map(row => row.surface), roster100.surface],
  participationBySurface: new Map([
    ...controlMap,
    [roster100.surface.surface_id, roster100.participants],
  ]),
  broadOrgIds: new Set(),
  densityPolicy: policy,
});
assert.deepEqual(edgePairs(withRosterResult.edges), edgePairs(controlResult.edges),
  'a 100-member non-hop roster must not add or remove actor edges');
assert.equal(
  medianFinitePairwiseDistance(withRosterResult.edges, controlActors),
  controlMedian,
  'a 100-member roster must not reduce median pairwise Clifford distance',
);
assert.equal(
  withRosterResult.edges.some(edge => edge.actor_a === 'actor-99' || edge.actor_b === 'actor-99'),
  false,
  'roster-only actors must remain outside the hop graph',
);

console.log('density.test: OK');
