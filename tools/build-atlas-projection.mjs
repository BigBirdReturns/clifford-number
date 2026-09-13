#!/usr/bin/env node
// Builds build/atlas-projection.json: a derived, disposable, reproducible
// display-projection artifact for the atlas representation ladder
// (docs/atlas-representation-ladder.md, Implementation sequence step 1).
//
// This tool NEVER alters canonical identity, hop counts, hop eligibility,
// dense-surface exclusions, or evidence semantics. Those remain the
// exclusive authority of tools/build-hop-graph.mjs and BUILD-INSTRUCTIONS.md
// Section 1. This builder only reshapes already-compiled artifacts into a
// representation the atlas renderer can mount without recomputing anything.
//
// Determinism contract: no Date.now(), no Math.random(), no environment- or
// locale-dependent formatting. All ordering is by explicit sort on stable
// string ids. All layout positions are seeded hashes of stable ids. Running
// this script twice against an unchanged build/ and data/ tree must produce
// byte-identical output.
import { root, readJson, writeJson } from './lib/ledger.mjs';
import { CANONICAL_EVIDENCE_CLASSES } from '../src/evidence-rank.js';

const EVIDENCE_CLASSES = CANONICAL_EVIDENCE_CLASSES;
const GRAPH_EFFECTS = ['hop-eligible', 'context-only', 'scout-only', 'none'];

// Surface statuses that mark a surface as a scouted/candidate finding that
// has not been promoted into a verified, hop-eligible bounded surface. This
// list is intentionally narrow and drawn from the actual status vocabulary
// emitted by tools/scout-surfaces.mjs and the intake pipeline
// (see data-shape note in the scheme block below).
const SCOUT_ONLY_STATUSES = new Set(['candidate_pending_contract_receipt', 'seeded_from_public_post']);

const GRAPH_EFFECT_DERIVATION_RULE = [
  'graph_effect is copied/derived only from surface.hop_eligible (declared in the',
  'ledger surface record) and build/hop-graph.json rejected_hop_surfaces[].reason',
  '(computed by tools/lib/hops.mjs deriveHopEdges, never re-derived here):',
  '  hop_eligible=true, no rejection reason            -> "hop-eligible"',
  '  hop_eligible=true, reason=broad_institution_context_only -> "context-only"',
  '  hop_eligible=true, reason=fewer_than_two_actor_participants',
  '    or reason=density_limit_exceeded                -> "none" (structurally cannot hop)',
  '  hop_eligible=false, status is a scouted/candidate status',
  '    (candidate_pending_contract_receipt, seeded_from_public_post) -> "scout-only"',
  '  hop_eligible=false, any other declared status       -> "none"',
  'No graph_effect value is ever inferred from anything other than these',
  'source fields.',
].join(' ');

const REGION_MEMBERSHIP_BASIS = [
  'cases.json is the authoritative declared case list. build/surface-graph.json',
  'carries no per-surface case_id tag yet (a future ladder step), so every',
  'bounded surface is attributed to cases.json.default_case_id until finer',
  'per-surface case tagging exists. Regions for any other declared case are',
  'reported with an honest zero population, not guessed membership.',
].join(' ');

const CANVAS = { width: 1400, height: 900 };
const REGION_BOX = { x: 80, y: 80, width: CANVAS.width - 160, height: CANVAS.height - 160 };
const MACHINE_BOX = { x: 80, y: 80, width: CANVAS.width - 160, height: CANVAS.height - 160 };

// ---- deterministic seeded geometry ---------------------------------------

// FNV-1a 32-bit, pure integer ops -> deterministic across runs/platforms.
function hashId(id) {
  let h = 0x811c9dc5;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Placement depends only on a stable namespaced id string, never on degree,
// insertion order, or any other property that could change as the corpus
// grows. Adding a node cannot reshuffle existing anchors.
function seededPosition(namespacedId, box) {
  const h = hashId(namespacedId);
  const hx = h >>> 16;
  const hy = h & 0xffff;
  return {
    x: round2(box.x + (hx / 0xffff) * box.width),
    y: round2(box.y + (hy / 0xffff) * box.height),
  };
}

// ---- small deterministic helpers -----------------------------------------

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function countMetric(metric, count, denominator, sourceIds) {
  return { metric, count, denominator, source_ids: sortedUnique(sourceIds) };
}

function assertKnownEvidenceClass(cls, contextLabel, errors) {
  if (!EVIDENCE_CLASSES.includes(cls)) {
    errors.push(`${contextLabel}: unrecognized evidence_class "${cls}"`);
  }
}

// Evidence composition over an array of {evidence_class, receipt_ids} rows.
// by_class always sums to population by construction (one increment per row).
function evidenceComposition(rows, contextLabel, errors) {
  const by_class = {};
  for (const cls of EVIDENCE_CLASSES) by_class[cls] = 0;
  const receiptIds = new Set();
  for (const row of rows) {
    assertKnownEvidenceClass(row.evidence_class, contextLabel, errors);
    if (by_class[row.evidence_class] !== undefined) by_class[row.evidence_class] += 1;
    for (const rid of row.receipt_ids ?? []) receiptIds.add(rid);
  }
  return { population: rows.length, by_class, source_ids: [...receiptIds].sort() };
}

function emptyEvidenceComposition() {
  const by_class = {};
  for (const cls of EVIDENCE_CLASSES) by_class[cls] = 0;
  return { population: 0, by_class, source_ids: [] };
}

function addComposition(a, b) {
  const by_class = {};
  for (const cls of EVIDENCE_CLASSES) by_class[cls] = (a.by_class[cls] ?? 0) + (b.by_class[cls] ?? 0);
  return {
    population: a.population + b.population,
    by_class,
    source_ids: sortedUnique([...a.source_ids, ...b.source_ids]),
  };
}

function emptyGraphEffectComposition() {
  return { 'hop-eligible': 0, 'context-only': 0, 'scout-only': 0, none: 0 };
}

function graphEffectComposition(surfaceIds, graphEffectBySurfaceId) {
  const counts = emptyGraphEffectComposition();
  for (const id of surfaceIds) {
    const effect = graphEffectBySurfaceId.get(id);
    if (counts[effect] !== undefined) counts[effect] += 1;
  }
  return counts;
}

function dominantGraphEffect(counts) {
  for (const effect of GRAPH_EFFECTS) {
    if (counts[effect] > 0) return effect;
  }
  return 'none';
}

// ---- load inputs -----------------------------------------------------------

const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');
const receiptGraph = readJson('build/receipt-graph.json');
const scores = readJson('build/scores.json');
const casesManifest = readJson('cases.json');
const surfaceTypeRegistry = readJson('data/canonical/surface-types.json');

const errors = [];

const receiptIds = new Set(receiptGraph.receipts.map(r => r.receipt_id));
const actorById = new Map(surfaceGraph.actors.map(a => [a.id, a]));
const orgById = new Map(surfaceGraph.organizations.map(o => [o.id, o]));
const surfaceTypeById = new Map(surfaceTypeRegistry.surface_types.map(t => [t.id, t]));
const maxHopActorCount = surfaceTypeRegistry.density_policy.max_hop_actor_count;

const rejectedReasonBySurfaceId = new Map(
  hopGraph.rejected_hop_surfaces.map(r => [r.surface_id, r.reason]),
);

const surfaces = [...surfaceGraph.surfaces].sort((a, b) => a.surface_id.localeCompare(b.surface_id));

// ---- per-surface derived facts --------------------------------------------

function graphEffectFor(surface) {
  const reason = rejectedReasonBySurfaceId.get(surface.surface_id) ?? null;
  if (surface.hop_eligible) {
    if (reason === 'broad_institution_context_only') return 'context-only';
    if (reason === 'fewer_than_two_actor_participants' || reason === 'density_limit_exceeded') return 'none';
    return 'hop-eligible';
  }
  if (SCOUT_ONLY_STATUSES.has(surface.status)) return 'scout-only';
  return 'none';
}

const graphEffectBySurfaceId = new Map();
const surfaceRecords = new Map(); // surface_id -> computed record used by every higher level

for (const surface of surfaces) {
  const participants = [...(surface.participants ?? [])].sort((a, b) => {
    const aId = a.participant_type === 'actor' ? `actor:${a.actor_id}` : `org:${a.organization_id}`;
    const bId = b.participant_type === 'actor' ? `actor:${b.actor_id}` : `org:${b.organization_id}`;
    return aId.localeCompare(bId);
  });

  for (const p of participants) {
    if (p.participant_type === 'actor' && !actorById.has(p.actor_id)) {
      errors.push(`surface ${surface.surface_id}: participant actor_id ${p.actor_id} does not resolve in build/surface-graph.json actors`);
    }
    if (p.participant_type === 'organization' && !orgById.has(p.organization_id)) {
      errors.push(`surface ${surface.surface_id}: participant organization_id ${p.organization_id} does not resolve in build/surface-graph.json organizations`);
    }
    for (const rid of p.receipt_ids ?? []) {
      if (!receiptIds.has(rid)) errors.push(`surface ${surface.surface_id}: participant receipt ${rid} does not resolve in build/receipt-graph.json`);
    }
  }
  for (const rid of surface.receipt_ids ?? []) {
    if (!receiptIds.has(rid)) errors.push(`surface ${surface.surface_id}: surface receipt ${rid} does not resolve in build/receipt-graph.json`);
  }

  const actorRows = participants.filter(p => p.participant_type === 'actor');
  const orgRows = participants.filter(p => p.participant_type === 'organization');
  const distinctActorCount = new Set(actorRows.map(p => p.actor_id)).size;
  const distinctOrgIds = sortedUnique(orgRows.map(p => p.organization_id));
  const distinctActorIds = sortedUnique(actorRows.map(p => p.actor_id));

  const effect = graphEffectFor(surface);
  graphEffectBySurfaceId.set(surface.surface_id, effect);

  const composition = evidenceComposition(participants, `surface ${surface.surface_id}`, errors);

  surfaceRecords.set(surface.surface_id, {
    surface,
    participants,
    actorRows,
    orgRows,
    distinctActorCount,
    distinctActorIds,
    distinctOrgIds,
    dense: distinctActorCount > maxHopActorCount,
    graph_effect: effect,
    composition,
  });
}

// ---- surface_nodes ---------------------------------------------------------

const surface_nodes = surfaces.map(surface => {
  const rec = surfaceRecords.get(surface.surface_id);
  const totalRows = rec.participants.length;
  return {
    surface_id: surface.surface_id,
    label: surface.surface_label,
    surface_type: surface.surface_type,
    secondary_surface_types: [...(surface.secondary_surface_types ?? [])].sort(),
    status: surface.status,
    graph_effect: rec.graph_effect,
    graph_effect_basis: {
      hop_eligible: surface.hop_eligible,
      rejected_hop_reason: rejectedReasonBySurfaceId.get(surface.surface_id) ?? null,
    },
    window: { time_start: surface.time_start ?? null, time_end: surface.time_end ?? null },
    dense: rec.dense,
    bounded_by: surface.bounded_by ?? [],
    notes: surface.notes ?? null,
    actor_participant_count: countMetric('actor_participants', rec.actorRows.length, totalRows, rec.distinctActorIds),
    organization_participant_count: countMetric('organization_participants', rec.orgRows.length, totalRows, rec.distinctOrgIds),
    distinct_actor_count: rec.distinctActorCount,
    evidence_composition: rec.composition,
    receipt_ids: sortedUnique(surface.receipt_ids ?? []),
    actor_ids: rec.distinctActorIds,
    organization_ids: rec.distinctOrgIds,
  };
});

const totalSurfaceCount = surfaces.length;

// ---- surface_clusters (grouped by surface_type) ---------------------------

const surfaceIdsByType = new Map();
for (const surface of surfaces) {
  if (!surfaceIdsByType.has(surface.surface_type)) surfaceIdsByType.set(surface.surface_type, []);
  surfaceIdsByType.get(surface.surface_type).push(surface.surface_id);
}

const surface_clusters = [...surfaceIdsByType.keys()].sort().map(surfaceType => {
  const surfaceIds = [...surfaceIdsByType.get(surfaceType)].sort();
  const registryEntry = surfaceTypeById.get(surfaceType) ?? null;
  const rows = surfaceIds.flatMap(id => surfaceRecords.get(id).participants);
  const receiptSourceIds = sortedUnique(surfaceIds.flatMap(id => surfaceRecords.get(id).surface.receipt_ids ?? []));
  return {
    cluster_id: surfaceType,
    label: registryEntry?.label ?? surfaceType,
    description: registryEntry?.description ?? null,
    hop_eligible_default: registryEntry?.hop_eligible_default ?? null,
    surface_ids: surfaceIds,
    surface_count: countMetric('surfaces_of_type', surfaceIds.length, totalSurfaceCount, surfaceIds),
    evidence_composition: evidenceComposition(rows, `surface_cluster ${surfaceType}`, errors),
    graph_effect_composition: graphEffectComposition(surfaceIds, graphEffectBySurfaceId),
    receipt_ids: receiptSourceIds,
  };
});

// ---- machines (organizations that generated at least one surface) --------

const surfaceIdsByOrg = new Map();
for (const surface of surfaces) {
  const rec = surfaceRecords.get(surface.surface_id);
  for (const orgId of rec.distinctOrgIds) {
    if (!surfaceIdsByOrg.has(orgId)) surfaceIdsByOrg.set(orgId, []);
    surfaceIdsByOrg.get(orgId).push(surface.surface_id);
  }
}

const machines = [...surfaceIdsByOrg.keys()].sort().map(orgId => {
  const surfaceIds = sortedUnique(surfaceIdsByOrg.get(orgId));
  const org = orgById.get(orgId) ?? null;
  if (!org) errors.push(`machine ${orgId}: organization does not resolve in build/surface-graph.json organizations`);

  const byType = new Map();
  for (const id of surfaceIds) {
    const type = surfaceRecords.get(id).surface.surface_type;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(id);
  }
  const surfaces_by_type = [...byType.keys()].sort().map(type => ({
    surface_type: type,
    surface_ids: [...byType.get(type)].sort(),
  }));

  const rows = surfaceIds.flatMap(id => surfaceRecords.get(id).participants);
  const receiptSourceIds = sortedUnique(surfaceIds.flatMap(id => surfaceRecords.get(id).surface.receipt_ids ?? []));

  return {
    organization_id: orgId,
    label: org?.label ?? orgId,
    kind: org?.kind ?? null,
    declared_surface_factory: org?.surface_factory ?? false,
    surfaces_by_type,
    surface_ids: surfaceIds,
    surface_count: countMetric('surfaces_generated', surfaceIds.length, totalSurfaceCount, surfaceIds),
    evidence_composition: evidenceComposition(rows, `machine ${orgId}`, errors),
    graph_effect_composition: graphEffectComposition(surfaceIds, graphEffectBySurfaceId),
    receipt_ids: receiptSourceIds,
    position: seededPosition(`machine:${orgId}`, MACHINE_BOX),
  };
});

// ---- regions (from cases.json; see REGION_MEMBERSHIP_BASIS) --------------

const defaultCaseId = casesManifest.default_case_id;
const allSurfaceIds = surfaces.map(s => s.surface_id).sort();

const regions = [...casesManifest.cases].sort((a, b) => a.id.localeCompare(b.id)).map(caseEntry => {
  const isDefault = caseEntry.id === defaultCaseId;
  const surfaceIds = isDefault ? allSurfaceIds : [];
  const rows = surfaceIds.flatMap(id => surfaceRecords.get(id).participants);
  const receiptSourceIds = sortedUnique(surfaceIds.flatMap(id => surfaceRecords.get(id).surface.receipt_ids ?? []));
  return {
    case_id: caseEntry.id,
    label: caseEntry.label,
    description: caseEntry.description ?? null,
    is_default_case: isDefault,
    membership_basis: REGION_MEMBERSHIP_BASIS,
    surface_ids: surfaceIds,
    surface_count: countMetric('surfaces_in_region', surfaceIds.length, totalSurfaceCount, surfaceIds),
    evidence_composition: surfaceIds.length
      ? evidenceComposition(rows, `region ${caseEntry.id}`, errors)
      : emptyEvidenceComposition(),
    graph_effect_composition: graphEffectComposition(surfaceIds, graphEffectBySurfaceId),
    receipt_ids: receiptSourceIds,
    position: seededPosition(`region:${caseEntry.id}`, REGION_BOX),
  };
});

// ---- actor_brackets (no pairwise actor-actor data anywhere) --------------

const surfaceIdsByActor = new Map();
const receiptIdsByActor = new Map();
for (const surface of surfaces) {
  const rec = surfaceRecords.get(surface.surface_id);
  for (const row of rec.actorRows) {
    if (!surfaceIdsByActor.has(row.actor_id)) {
      surfaceIdsByActor.set(row.actor_id, new Set());
      receiptIdsByActor.set(row.actor_id, new Set());
    }
    surfaceIdsByActor.get(row.actor_id).add(surface.surface_id);
    for (const rid of row.receipt_ids ?? []) receiptIdsByActor.get(row.actor_id).add(rid);
  }
}

const actor_brackets = [...surfaceIdsByActor.keys()].sort().map(actorId => {
  const surfaceIds = [...surfaceIdsByActor.get(actorId)].sort();
  const actor = actorById.get(actorId) ?? null;
  if (!actor) errors.push(`actor_bracket ${actorId}: actor does not resolve in build/surface-graph.json actors`);
  const effectCounts = graphEffectComposition(surfaceIds, graphEffectBySurfaceId);
  const denseSurfaceIds = surfaceIds.filter(id => surfaceRecords.get(id).dense);
  return {
    actor_id: actorId,
    label: actor?.label ?? actorId,
    kind: actor?.kind ?? null,
    anchor: Boolean(actor?.anchor),
    surface_ids: surfaceIds,
    surface_count: surfaceIds.length,
    graph_effect: dominantGraphEffect(effectCounts),
    graph_effect_composition: effectCounts,
    dense_surface_ids: denseSurfaceIds,
    receipt_ids: [...receiptIdsByActor.get(actorId)].sort(),
  };
});

// ---- corridors (structural, always graph_effect: "none") -----------------

const corridors = [...(scores.chains ?? [])].sort((a, b) => a.chain_id.localeCompare(b.chain_id)).map(chain => {
  if (chain.clifford_number !== null) {
    errors.push(`corridor ${chain.chain_id}: source chain has a non-null clifford_number; a structural corridor must never carry a Clifford Number effect`);
  }
  if (chain.connector_surfaces_all_non_hop === false) {
    errors.push(`corridor ${chain.chain_id}: source chain declares connector_surfaces_all_non_hop=false; refusing to label it graph_effect "none"`);
  }
  const surfaceIds = sortedUnique(chain.surfaces ?? []);
  for (const id of surfaceIds) {
    if (!surfaceRecords.has(id)) errors.push(`corridor ${chain.chain_id}: stage surface ${id} does not resolve in build/surface-graph.json`);
  }
  for (const rid of chain.receipt_ids ?? []) {
    if (!receiptIds.has(rid)) errors.push(`corridor ${chain.chain_id}: receipt ${rid} does not resolve in build/receipt-graph.json`);
  }
  return {
    chain_id: chain.chain_id,
    label: chain.chain_label,
    pattern: chain.pattern,
    stage_categories: chain.stage_categories ?? [],
    chain_length: chain.chain_length ?? (chain.stages ?? []).length,
    stages: (chain.stages ?? []).map(stage => ({
      order: stage.order,
      stage_category: stage.stage_category,
      surface_id: stage.surface_id,
      actor_id: stage.actor_id ?? null,
      organization_id: stage.organization_id ?? null,
      receipt_ids: sortedUnique(stage.receipt_ids ?? []),
      note: stage.note ?? null,
    })),
    surface_ids: surfaceIds,
    receipt_ids: sortedUnique(chain.receipt_ids ?? []),
    evidence_class: chain.evidence_class ?? null,
    graph_effect: 'none',
    graph_effect_basis: {
      connector_surfaces_all_non_hop: chain.connector_surfaces_all_non_hop ?? null,
      source_clifford_number: chain.clifford_number ?? null,
      why_no_hop: chain.why_no_hop ?? null,
    },
  };
});

// ---- route_index (hop-eligible surface memberships only) -----------------

const route_index = {};
for (const actorId of [...surfaceIdsByActor.keys()].sort()) {
  const hopEligibleSurfaceIds = [...surfaceIdsByActor.get(actorId)]
    .filter(id => graphEffectBySurfaceId.get(id) === 'hop-eligible')
    .sort();
  if (hopEligibleSurfaceIds.length) route_index[actorId] = hopEligibleSurfaceIds;
}

// ---- aggregate_metrics ------------------------------------------------------

const allParticipantRows = surfaces.flatMap(s => surfaceRecords.get(s.surface_id).participants);
const denseSurfaceIds = surfaces.filter(s => surfaceRecords.get(s.surface_id).dense).map(s => s.surface_id).sort();
const effectTotals = graphEffectComposition(allSurfaceIds, graphEffectBySurfaceId);

const aggregate_metrics = {
  total_surfaces: countMetric('total_surfaces', totalSurfaceCount, totalSurfaceCount, allSurfaceIds),
  hop_eligible_surfaces: countMetric('hop_eligible_surfaces', effectTotals['hop-eligible'], totalSurfaceCount,
    allSurfaceIds.filter(id => graphEffectBySurfaceId.get(id) === 'hop-eligible')),
  context_only_surfaces: countMetric('context_only_surfaces', effectTotals['context-only'], totalSurfaceCount,
    allSurfaceIds.filter(id => graphEffectBySurfaceId.get(id) === 'context-only')),
  scout_only_surfaces: countMetric('scout_only_surfaces', effectTotals['scout-only'], totalSurfaceCount,
    allSurfaceIds.filter(id => graphEffectBySurfaceId.get(id) === 'scout-only')),
  none_effect_surfaces: countMetric('none_effect_surfaces', effectTotals.none, totalSurfaceCount,
    allSurfaceIds.filter(id => graphEffectBySurfaceId.get(id) === 'none')),
  dense_surfaces: countMetric('dense_surfaces', denseSurfaceIds.length, totalSurfaceCount, denseSurfaceIds),
  actors_with_participation: countMetric('actors_with_participation', actor_brackets.length, surfaceGraph.actors.length,
    actor_brackets.map(a => a.actor_id)),
  machines: countMetric('machines', machines.length, orgById.size, machines.map(m => m.organization_id)),
  regions: countMetric('regions', regions.length, regions.length, regions.map(r => r.case_id)),
  corridors: countMetric('corridors', corridors.length, corridors.length, corridors.map(c => c.chain_id)),
  receipts: countMetric('receipts', receiptGraph.receipts.length, receiptGraph.receipts.length,
    receiptGraph.receipts.map(r => r.receipt_id)),
  corpus_evidence_composition: evidenceComposition(allParticipantRows, 'corpus aggregate_metrics', errors),
};

// ---- assemble + write -------------------------------------------------------

const projection = {
  scheme: {
    generator: 'tools/build-atlas-projection.mjs',
    schema_version: 'atlas-projection@1',
    governing_design_note: 'docs/atlas-representation-ladder.md',
    disposability_notice: 'This file is a derived, disposable display projection of the compiled ledger artifacts. It is never canonical truth and never alters ledger identity, hop counts, hop eligibility, dense-surface exclusions, or evidence semantics, which remain governed exclusively by BUILD-INSTRUCTIONS.md Section 1 and tools/build-hop-graph.mjs. Safe to delete and regenerate at any time with `node tools/build-atlas-projection.mjs`.',
    source_artifacts: [
      'build/surface-graph.json',
      'build/hop-graph.json',
      'build/receipt-graph.json',
      'build/scores.json',
      'cases.json',
      'data/canonical/surface-types.json',
    ],
    graph_effect_derivation_rule: GRAPH_EFFECT_DERIVATION_RULE,
    region_membership_basis: REGION_MEMBERSHIP_BASIS,
    determinism_notice: 'No Date.now(), no Math.random(), no locale-dependent formatting. All arrays are sorted by stable string ids before serialization; all layout positions are seeded FNV-1a hashes of namespaced stable ids. Running this builder twice against an unchanged input tree produces byte-identical output.',
  },
  regions,
  machines,
  surface_clusters,
  surface_nodes,
  actor_brackets,
  corridors,
  route_index,
  aggregate_metrics,
};

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

writeJson('build/atlas-projection.json', projection);
console.log(`build-atlas-projection: ${regions.length} regions, ${machines.length} machines, ${surface_clusters.length} surface_clusters, ${surface_nodes.length} surface_nodes, ${actor_brackets.length} actor_brackets, ${corridors.length} corridors.`);
