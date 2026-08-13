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

console.log('density.test: OK');
