const SURFACE_TYPES = Object.freeze([
  'government_advisory_surface',
  'capital_surface',
  'defense_procurement_surface',
  'company_board_surface',
  'campaign_surface',
  'event_roster_surface',
  'research_cohort_surface'
]);

const EVIDENCE_CLASSES = Object.freeze(['official', 'primary_public', 'reported']);
const ROLE_LABELS = Object.freeze([
  'Public official',
  'Company leader',
  'Research operator',
  'Capital participant',
  'Listed participant'
]);

function positiveInteger(value, fallback, minimum = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.trunc(number)) : fallback;
}

function pad(value, width = 5) {
  return String(value).padStart(width, '0');
}

export function syntheticActorId(index) {
  return `synthetic-actor-${pad(index + 1)}`;
}

function participant(surfaceId, actorIndex, ordinal) {
  const actorId = syntheticActorId(actorIndex);
  const role = ROLE_LABELS[ordinal % ROLE_LABELS.length];
  return {
    surface_id: surfaceId,
    participant_type: 'actor',
    actor_id: actorId,
    role,
    participation_type: role.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    time_start: `${2020 + (ordinal % 5)}-01`,
    time_end: `${2022 + (ordinal % 5)}-12`,
    evidence_class: EVIDENCE_CLASSES[ordinal % EVIDENCE_CLASSES.length],
    receipt_ids: [`receipt-${surfaceId}-${actorId}`]
  };
}

function uniqueParticipantIndexes({ actorCount, surfaceIndex, required = [], count = 8 }) {
  const indexes = [];
  const seen = new Set();
  const add = value => {
    const normalized = ((value % actorCount) + actorCount) % actorCount;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    indexes.push(normalized);
  };
  for (const value of required) add(value);
  let cursor = 0;
  while (indexes.length < count) {
    add(surfaceIndex * 17 + cursor * 97 + 13);
    cursor += 1;
  }
  return indexes;
}

export function buildVisualApertureScaleFixture(options = {}) {
  const actorCount = positiveInteger(options.actorCount, 5000, 2);
  const surfaceCount = positiveInteger(options.surfaceCount, 1200, 2);
  const denseRosterSize = Math.min(actorCount, positiveInteger(options.denseRosterSize, actorCount, 2));
  const hopEdgeCount = Math.min(actorCount - 1, surfaceCount - 1, positiveInteger(options.hopEdgeCount, 1000, 1));
  const participantsPerSurface = positiveInteger(options.participantsPerSurface, 8, 2);
  const denseSurfaceId = options.denseSurfaceId || 'synthetic-dense-roster';

  const actors = Array.from({ length: actorCount }, (_, index) => ({
    id: syntheticActorId(index),
    label: `Synthetic Actor ${pad(index + 1)}`,
    description: 'Synthetic scale-fixture actor. No real person or claim.'
  }));

  const surfaces = [{
    surface_id: denseSurfaceId,
    surface_label: `Synthetic bounded roster · ${denseRosterSize} actors`,
    surface_type: 'event_roster_surface',
    secondary_surface_types: [],
    hop_eligible: false,
    time_start: '2024',
    time_end: '2024',
    receipt_ids: ['receipt-synthetic-dense-roster'],
    notes: 'Synthetic context-only scale fixture. This bounded roster creates no participant-to-participant adjacency.',
    participants: Array.from({ length: denseRosterSize }, (_, index) => participant(denseSurfaceId, index, index))
  }];

  for (let surfaceIndex = 1; surfaceIndex < surfaceCount; surfaceIndex += 1) {
    const surfaceId = `synthetic-surface-${pad(surfaceIndex, 4)}`;
    const hopIndex = surfaceIndex - 1;
    const required = hopIndex < hopEdgeCount ? [hopIndex, hopIndex + 1] : [];
    const actorIndexes = uniqueParticipantIndexes({
      actorCount,
      surfaceIndex,
      required,
      count: participantsPerSurface
    });
    const type = SURFACE_TYPES[surfaceIndex % SURFACE_TYPES.length];
    surfaces.push({
      surface_id: surfaceId,
      surface_label: `Synthetic ${type.replaceAll('_', ' ')} ${pad(surfaceIndex, 4)}`,
      surface_type: type,
      secondary_surface_types: [],
      hop_eligible: hopIndex < hopEdgeCount,
      time_start: '2020',
      time_end: '2026',
      receipt_ids: [`receipt-${surfaceId}`],
      notes: 'Synthetic bounded surface used only for deterministic scale measurement.',
      participants: actorIndexes.map((actorIndex, ordinal) => participant(surfaceId, actorIndex, surfaceIndex + ordinal))
    });
  }

  const edges = Array.from({ length: hopEdgeCount }, (_, index) => {
    const surface = surfaces[index + 1];
    const actorA = syntheticActorId(index);
    const actorB = syntheticActorId(index + 1);
    return {
      actor_a: actorA,
      actor_b: actorB,
      surfaces: [{
        surface_id: surface.surface_id,
        surface_label: surface.surface_label,
        surface_type: surface.surface_type,
        actor_a_role: surface.participants.find(item => item.actor_id === actorA)?.role || 'Recorded participant',
        actor_b_role: surface.participants.find(item => item.actor_id === actorB)?.role || 'Recorded participant',
        evidence_class: 'official',
        valid_from: '2020-01-01',
        valid_until: '2026-12-31',
        temporal_status: 'dated',
        receipt_ids: surface.receipt_ids
      }]
    };
  });

  const receipts = surfaces.map(surface => ({
    receipt_id: surface.receipt_ids[0],
    label: `${surface.surface_label} synthetic receipt`,
    evidence_class: 'official',
    source_type: 'synthetic_scale_fixture',
    archive: { method: 'synthetic_fixture', ref: `fixture:${surface.surface_id}` }
  }));

  const surfaceGraph = { actors, surfaces };
  const hopGraph = {
    anchor_actor_id: syntheticActorId(Math.min(1, actorCount - 1)),
    edges,
    rejected_hop_pairs: []
  };
  const receiptGraph = { receipts };
  const legacyGraph = { nodes: [], edges: [] };

  return {
    fixture_version: 'clifford-visual-aperture-scale-fixture@1',
    graph_effect: 'none',
    contains_real_people: false,
    dense_surface_id: denseSurfaceId,
    surfaceGraph,
    hopGraph,
    receiptGraph,
    legacyGraph,
    expected: {
      actor_count: actorCount,
      surface_count: surfaceCount,
      dense_roster_size: denseRosterSize,
      hop_edge_count: hopEdgeCount,
      participation_count: denseRosterSize + (surfaceCount - 1) * participantsPerSurface,
      maximum_family_pairs: 21
    }
  };
}

export function summarizeVisualApertureScaleFixture(fixture) {
  const participationCount = (fixture?.surfaceGraph?.surfaces ?? [])
    .reduce((sum, surface) => sum + (surface.participants?.length ?? 0), 0);
  const dense = (fixture?.surfaceGraph?.surfaces ?? [])
    .find(surface => surface.surface_id === fixture?.dense_surface_id);
  return {
    fixture_version: fixture?.fixture_version ?? null,
    graph_effect: fixture?.graph_effect ?? null,
    contains_real_people: fixture?.contains_real_people === true,
    actors: fixture?.surfaceGraph?.actors?.length ?? 0,
    surfaces: fixture?.surfaceGraph?.surfaces?.length ?? 0,
    participations: participationCount,
    dense_roster_actors: dense?.participants?.length ?? 0,
    dense_roster_hop_eligible: dense?.hop_eligible === true,
    hop_edges: fixture?.hopGraph?.edges?.length ?? 0,
    dense_roster_hop_bases: (fixture?.hopGraph?.edges ?? [])
      .flatMap(edge => edge.surfaces ?? [])
      .filter(basis => basis.surface_id === fixture?.dense_surface_id).length
  };
}
