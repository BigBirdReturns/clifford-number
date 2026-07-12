// Density discipline for hop-eligible surfaces.
//
// A large roster creates O(n^2) actor pairs while carrying very little
// pairwise information. The release policy therefore sets an explicit ceiling
// on distinct actor participants for any surface that can create hops.

export function validateDensityPolicy(policy) {
  const max = policy?.max_hop_actor_count;
  if (!Number.isInteger(max) || max < 2) {
    throw new Error('density_policy.max_hop_actor_count must be an integer >= 2');
  }
  return policy;
}

export function countDistinctActorParticipants(participants = []) {
  return new Set(
    participants
      .filter(p => p.participant_type === 'actor' && p.actor_id)
      .map(p => p.actor_id),
  ).size;
}

export function assessHopDensity(surface, participants, policy) {
  validateDensityPolicy(policy);
  const actorCount = countDistinctActorParticipants(participants);
  const maxHopActorCount = policy.max_hop_actor_count;
  return {
    actor_count: actorCount,
    max_hop_actor_count: maxHopActorCount,
    exceeds_limit: surface?.hop_eligible === true && actorCount > maxHopActorCount,
  };
}
