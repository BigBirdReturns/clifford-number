export const EVIDENCE_RANK = Object.freeze({
  confirmed: 0,
  official: 1,
  government_record: 1,
  primary_public: 2,
  reported: 3,
  derived: 4,
  judgment: 5,
  open: 6
});

export const CLUSTER_LABELS = Object.freeze({
  policy: 'Policy and government',
  capital: 'Capital and finance',
  defense: 'Defence and procurement',
  enterprise: 'Companies and commercial roles',
  campaigns: 'Campaigns and elections',
  forums: 'Forums, cohorts and rosters',
  other: 'Other bounded surfaces'
});

export function humanLabel(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function normalizeEvidence(value) {
  const normalized = String(value || 'open').toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'primary') return 'primary_public';
  if (normalized === 'government') return 'government_record';
  return Object.hasOwn(EVIDENCE_RANK, normalized) ? normalized : 'open';
}

export function evidenceRank(value) {
  return EVIDENCE_RANK[normalizeEvidence(value)];
}

export function meetsEvidenceFloor(value, floor = 'open') {
  return evidenceRank(value) <= evidenceRank(floor);
}

export function periodBounds(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  if (/^\d{4}$/.test(input)) return { start: `${input}-01-01`, end: `${input}-12-31` };
  if (/^\d{4}-\d{2}$/.test(input)) {
    const [year, month] = input.split('-').map(Number);
    if (month < 1 || month > 12) return null;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { start: `${input}-01`, end: `${input}-${String(lastDay).padStart(2, '0')}` };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return { start: input, end: input };
  return null;
}

function expandedStart(value) {
  return periodBounds(value)?.start ?? null;
}

function expandedEnd(value) {
  return periodBounds(value)?.end ?? null;
}

export function windowOverlaps(start, end, asOf) {
  const query = periodBounds(asOf);
  if (!query) return !asOf;
  const validStart = expandedStart(start);
  const validEnd = expandedEnd(end);
  if (!validStart && !validEnd) return false;
  if (validStart && validStart > query.end) return false;
  if (validEnd && validEnd < query.start) return false;
  return true;
}

export function basisMatches(basis, { evidenceFloor = 'open', asOf = '' } = {}) {
  if (!meetsEvidenceFloor(basis?.evidence_class, evidenceFloor)) return false;
  if (!asOf) return true;
  if (basis?.temporal_status !== 'dated') return false;
  return windowOverlaps(basis.valid_from, basis.valid_until, asOf);
}

export function participantMatches(participant, { evidenceFloor = 'open', asOf = '' } = {}) {
  if (!meetsEvidenceFloor(participant?.evidence_class, evidenceFloor)) return false;
  if (!asOf) return true;
  return windowOverlaps(participant?.time_start, participant?.time_end, asOf);
}

export function bestBasis(bases = []) {
  return [...bases].sort((a, b) => {
    const evidenceDelta = evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class);
    if (evidenceDelta) return evidenceDelta;
    const datedDelta = Number(b.temporal_status === 'dated') - Number(a.temporal_status === 'dated');
    if (datedDelta) return datedDelta;
    return (b.receipt_ids?.length ?? 0) - (a.receipt_ids?.length ?? 0);
  })[0] ?? null;
}

export function shortestFilteredPath(hopGraph, start, target, filters = {}) {
  if (!start || !target) return null;
  if (start === target) return { number: 0, actorPath: [start], hops: [] };

  const adjacency = new Map();
  for (const edge of hopGraph?.edges ?? []) {
    if (!adjacency.has(edge.actor_a)) adjacency.set(edge.actor_a, []);
    if (!adjacency.has(edge.actor_b)) adjacency.set(edge.actor_b, []);
    adjacency.get(edge.actor_a).push({ to: edge.actor_b, edge });
    adjacency.get(edge.actor_b).push({ to: edge.actor_a, edge });
  }

  const queue = [{ actor: start, actorPath: [start], hops: [] }];
  const seen = new Set([start]);
  while (queue.length) {
    const current = queue.shift();
    for (const candidate of adjacency.get(current.actor) ?? []) {
      if (seen.has(candidate.to)) continue;
      const bases = (candidate.edge.surfaces ?? []).filter(basis => basisMatches(basis, filters));
      if (!bases.length) continue;
      const orderedBases = [...bases].sort((a, b) => evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class));
      const hop = {
        from: current.actor,
        to: candidate.to,
        edge: candidate.edge,
        bases: orderedBases,
        basis: bestBasis(orderedBases)
      };
      const actorPath = [...current.actorPath, candidate.to];
      const hops = [...current.hops, hop];
      if (candidate.to === target) return { number: hops.length, actorPath, hops };
      seen.add(candidate.to);
      queue.push({ actor: candidate.to, actorPath, hops });
    }
  }
  return null;
}

export function diagnosePathFilters(hopGraph, filters = {}) {
  const diagnostics = {
    totalEdges: 0,
    traversableEdges: 0,
    evidenceBlockedBases: 0,
    timeBlockedBases: 0,
    undatedBlockedBases: 0
  };
  for (const edge of hopGraph?.edges ?? []) {
    diagnostics.totalEdges += 1;
    let traversable = false;
    for (const basis of edge.surfaces ?? []) {
      if (!meetsEvidenceFloor(basis.evidence_class, filters.evidenceFloor ?? 'open')) {
        diagnostics.evidenceBlockedBases += 1;
        continue;
      }
      if (filters.asOf) {
        if (basis.temporal_status !== 'dated') {
          diagnostics.undatedBlockedBases += 1;
          continue;
        }
        if (!windowOverlaps(basis.valid_from, basis.valid_until, filters.asOf)) {
          diagnostics.timeBlockedBases += 1;
          continue;
        }
      }
      traversable = true;
    }
    if (traversable) diagnostics.traversableEdges += 1;
  }
  return diagnostics;
}

export function clusterForSurface(surface) {
  const text = [surface?.surface_type, ...(surface?.secondary_surface_types ?? []), surface?.surface_label]
    .join(' ')
    .toLowerCase();
  if (/defen|military|security|procure|award|contract|army|navy|air force/.test(text)) return 'defense';
  if (/capital|fund|invest|finance|venture|shareholder|beneficial interest/.test(text)) return 'capital';
  if (/campaign|election|vote|political party/.test(text)) return 'campaigns';
  if (/forum|directory|roster|cohort|event|conference|summit|membership|ranking/.test(text)) return 'forums';
  if (/government|policy|cabinet|advis|regulat|minister|appointment|parliament|public office/.test(text)) return 'policy';
  if (/company|commercial|customer|vendor|employment|founder|officer|board|technology|product/.test(text)) return 'enterprise';
  return 'other';
}

export function actorParticipants(surface) {
  return (surface?.participants ?? []).filter(participant => participant.participant_type === 'actor' && participant.actor_id);
}

export function summarizeClusters(surfaceGraph) {
  const clusters = new Map();
  for (const surface of surfaceGraph?.surfaces ?? []) {
    const clusterId = clusterForSurface(surface);
    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, {
        id: clusterId,
        label: CLUSTER_LABELS[clusterId] ?? humanLabel(clusterId),
        surfaces: [],
        actorIds: new Set(),
        evidenceCounts: new Map(),
        hopEligible: 0,
        contextOnly: 0
      });
    }
    const cluster = clusters.get(clusterId);
    cluster.surfaces.push(surface);
    if (surface.hop_eligible) cluster.hopEligible += 1;
    else cluster.contextOnly += 1;
    for (const participant of actorParticipants(surface)) {
      cluster.actorIds.add(participant.actor_id);
      const evidence = normalizeEvidence(participant.evidence_class);
      cluster.evidenceCounts.set(evidence, (cluster.evidenceCounts.get(evidence) ?? 0) + 1);
    }
  }

  return [...clusters.values()]
    .map(cluster => ({
      ...cluster,
      surfaceCount: cluster.surfaces.length,
      actorCount: cluster.actorIds.size,
      evidenceCounts: Object.fromEntries(cluster.evidenceCounts)
    }))
    .sort((a, b) => b.surfaceCount - a.surfaceCount || b.actorCount - a.actorCount || a.label.localeCompare(b.label));
}

export function computeCorridors(surfaceGraph) {
  const actorClusters = new Map();
  for (const surface of surfaceGraph?.surfaces ?? []) {
    const cluster = clusterForSurface(surface);
    for (const participant of actorParticipants(surface)) {
      if (!actorClusters.has(participant.actor_id)) actorClusters.set(participant.actor_id, new Set());
      actorClusters.get(participant.actor_id).add(cluster);
    }
  }

  const corridors = new Map();
  for (const clusters of actorClusters.values()) {
    const values = [...clusters].sort();
    for (let left = 0; left < values.length; left += 1) {
      for (let right = left + 1; right < values.length; right += 1) {
        const key = `${values[left]}||${values[right]}`;
        corridors.set(key, (corridors.get(key) ?? 0) + 1);
      }
    }
  }

  return [...corridors.entries()]
    .map(([key, actorCount]) => {
      const [from, to] = key.split('||');
      return { from, to, actorCount };
    })
    .sort((a, b) => b.actorCount - a.actorCount || a.from.localeCompare(b.from));
}

export function surfaceTypeGroups(surfaceGraph, clusterId) {
  const groups = new Map();
  for (const surface of surfaceGraph?.surfaces ?? []) {
    if (clusterForSurface(surface) !== clusterId) continue;
    const type = surface.surface_type || 'other_surface';
    if (!groups.has(type)) groups.set(type, { id: type, label: humanLabel(type), surfaces: [], actorIds: new Set(), hopEligible: 0 });
    const group = groups.get(type);
    group.surfaces.push(surface);
    if (surface.hop_eligible) group.hopEligible += 1;
    for (const participant of actorParticipants(surface)) group.actorIds.add(participant.actor_id);
  }
  return [...groups.values()]
    .map(group => ({ ...group, surfaceCount: group.surfaces.length, actorCount: group.actorIds.size }))
    .sort((a, b) => b.surfaceCount - a.surfaceCount || b.actorCount - a.actorCount || a.label.localeCompare(b.label));
}

export function denseSurfaces(surfaceGraph, { minimumActors = 2 } = {}) {
  return (surfaceGraph?.surfaces ?? [])
    .map(surface => ({ surface, actorCount: actorParticipants(surface).length }))
    .filter(item => item.actorCount >= minimumActors)
    .sort((a, b) => b.actorCount - a.actorCount || a.surface.surface_label.localeCompare(b.surface.surface_label));
}

function denseGroupKey(participant) {
  const type = String(participant?.participation_type || '').toLowerCase();
  const role = String(participant?.role || '').toLowerCase();
  const text = `${type} ${role}`;
  if (/minister|official|government|civil service|adviser/.test(text)) return 'public_office';
  if (/invest|fund|capital|shareholder/.test(text)) return 'capital';
  if (/founder|chief|ceo|officer|director|board/.test(text)) return 'leadership';
  if (/staff|employee|scientist|engineer|research/.test(text)) return 'operators';
  if (/listed|directory|member|attend|register/.test(text)) return 'listed_or_attending';
  return type || 'other';
}

export function groupDenseSurface(surface) {
  const groups = new Map();
  for (const participant of actorParticipants(surface)) {
    const id = denseGroupKey(participant);
    if (!groups.has(id)) groups.set(id, { id, label: humanLabel(id), participants: [] });
    groups.get(id).participants.push(participant);
  }
  return [...groups.values()]
    .map(group => ({ ...group, count: group.participants.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function selectBudgetedParticipants(surface, {
  query = '',
  evidenceFloor = 'open',
  asOf = '',
  budget = 18,
  pinnedIds = new Set(),
  labels = new Map()
} = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds ?? []);
  const eligible = actorParticipants(surface).filter(participant => participantMatches(participant, { evidenceFloor, asOf }));
  const matchesQuery = participant => {
    if (!normalizedQuery) return true;
    const label = labels.get(participant.actor_id) || participant.actor_id;
    return [label, participant.actor_id, participant.role, participant.participation_type]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  };
  const candidates = eligible.filter(participant => pinned.has(participant.actor_id) || matchesQuery(participant));
  candidates.sort((a, b) => {
    const pinDelta = Number(pinned.has(b.actor_id)) - Number(pinned.has(a.actor_id));
    if (pinDelta) return pinDelta;
    const evidenceDelta = evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class);
    if (evidenceDelta) return evidenceDelta;
    const datedDelta = Number(Boolean(b.time_start || b.time_end)) - Number(Boolean(a.time_start || a.time_end));
    if (datedDelta) return datedDelta;
    const aLabel = labels.get(a.actor_id) || a.actor_id;
    const bLabel = labels.get(b.actor_id) || b.actor_id;
    return aLabel.localeCompare(bLabel);
  });

  const pinnedCandidates = candidates.filter(participant => pinned.has(participant.actor_id));
  const unpinnedCandidates = candidates.filter(participant => !pinned.has(participant.actor_id));
  const targetBudget = Math.max(Number(budget) || 0, pinnedCandidates.length);
  const visible = [...pinnedCandidates, ...unpinnedCandidates.slice(0, Math.max(0, targetBudget - pinnedCandidates.length))];
  const candidateIds = new Set(candidates.map(participant => participant.actor_id));
  const queryExcluded = eligible.filter(participant => !candidateIds.has(participant.actor_id)).length;
  return {
    visible,
    eligibleCount: eligible.length,
    hiddenByBudget: Math.max(0, candidates.length - visible.length),
    filteredOut: queryExcluded,
    totalActors: actorParticipants(surface).length
  };
}

export function semanticLevel(scale) {
  const value = Number(scale) || 1;
  if (value < 1.45) return 'corpus';
  if (value < 2.6) return 'machine';
  if (value < 3.9) return 'surface';
  return 'evidence';
}

export function stableRingPosition(index, count, centerX, centerY, radiusX, radiusY = radiusX, phase = -Math.PI / 2) {
  const safeCount = Math.max(1, count);
  const angle = phase + (index / safeCount) * Math.PI * 2;
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY,
    angle
  };
}
