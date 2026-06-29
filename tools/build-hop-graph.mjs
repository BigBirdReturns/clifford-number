#!/usr/bin/env node
import { loadAll, writeJson, combinations, indexBy, uniq, evidenceWeight } from './lib/ledger.mjs';

function weakestEvidence(classes) {
  const vals = classes.filter(Boolean);
  if (!vals.length) return 'reported';
  return vals.sort((a, b) => evidenceWeight(b) - evidenceWeight(a))[0];
}

const data = loadAll();
const actorById = indexBy(data.actors, 'id');
const orgById = indexBy(data.organizations, 'id');
const receiptById = indexBy(data.receipts, 'receipt_id');
const surfaceById = indexBy(data.surfaces, 'surface_id');
const typeById = indexBy(data.surfaceTypes, 'id');

const errors = [];
const warnings = [];

for (const surface of data.surfaces) {
  if (!typeById.has(surface.surface_type)) errors.push(`surface ${surface.surface_id} has unknown surface_type ${surface.surface_type}`);
  for (const st of surface.secondary_surface_types ?? []) {
    if (!typeById.has(st)) errors.push(`surface ${surface.surface_id} has unknown secondary_surface_type ${st}`);
  }
  for (const rid of surface.receipt_ids ?? []) {
    if (!receiptById.has(rid)) errors.push(`surface ${surface.surface_id} references missing receipt ${rid}`);
  }
}

const participationBySurface = new Map();
const surfacesByActor = new Map();
const surfacesByOrg = new Map();
for (const p of data.participation) {
  const s = surfaceById.get(p.surface_id);
  if (!s) errors.push(`participation references missing surface ${p.surface_id}`);
  if (p.participant_type === 'actor') {
    if (!actorById.has(p.actor_id)) errors.push(`participation references missing actor ${p.actor_id}`);
    if (!surfacesByActor.has(p.actor_id)) surfacesByActor.set(p.actor_id, []);
    surfacesByActor.get(p.actor_id).push(p.surface_id);
  } else if (p.participant_type === 'organization') {
    if (!orgById.has(p.organization_id)) errors.push(`participation references missing organization ${p.organization_id}`);
    if (!surfacesByOrg.has(p.organization_id)) surfacesByOrg.set(p.organization_id, []);
    surfacesByOrg.get(p.organization_id).push(p.surface_id);
  } else {
    errors.push(`participation for surface ${p.surface_id} has invalid participant_type ${p.participant_type}`);
  }
  for (const rid of p.receipt_ids ?? []) {
    if (!receiptById.has(rid)) errors.push(`participation ${p.surface_id}/${p.actor_id ?? p.organization_id} references missing receipt ${rid}`);
  }
  if (!participationBySurface.has(p.surface_id)) participationBySurface.set(p.surface_id, []);
  participationBySurface.get(p.surface_id).push(p);
}

const BROAD_ORGS = new Set(data.organizations.filter(o => o.broad_institution).map(o => o.id));
const hopEdges = [];
const hopEdgeMap = new Map();
const rejectedHopSurfaces = [];

for (const surface of data.surfaces) {
  const participants = participationBySurface.get(surface.surface_id) ?? [];
  const actorParts = participants.filter(p => p.participant_type === 'actor');
  const orgParts = participants.filter(p => p.participant_type === 'organization');

  // Broad institutions can be participants in receipts, but never create actor hops by themselves.
  const onlyBroadOrgContext = actorParts.length < 2 && orgParts.some(p => BROAD_ORGS.has(p.organization_id));

  if (!surface.hop_eligible) {
    rejectedHopSurfaces.push({ surface_id: surface.surface_id, reason: 'surface_not_hop_eligible' });
    continue;
  }
  if (onlyBroadOrgContext) {
    rejectedHopSurfaces.push({ surface_id: surface.surface_id, reason: 'broad_institution_context_only' });
    continue;
  }
  if (actorParts.length < 2) {
    rejectedHopSurfaces.push({ surface_id: surface.surface_id, reason: 'fewer_than_two_actor_participants' });
    continue;
  }

  for (const [a, b] of combinations(actorParts)) {
    const ids = [a.actor_id, b.actor_id].sort();
    const key = `${ids[0]}||${ids[1]}`;
    if (!hopEdgeMap.has(key)) {
      hopEdgeMap.set(key, {
        actor_a: ids[0],
        actor_b: ids[1],
        surfaces: [],
        evidence_weight: Infinity,
      });
    }
    const edge = hopEdgeMap.get(key);
    const receipts = uniq([...(surface.receipt_ids ?? []), ...(a.receipt_ids ?? []), ...(b.receipt_ids ?? [])]);
    edge.surfaces.push({
      surface_id: surface.surface_id,
      surface_label: surface.surface_label,
      surface_type: surface.surface_type,
      secondary_surface_types: surface.secondary_surface_types ?? [],
      actor_a_role: ids[0] === a.actor_id ? a.role : b.role,
      actor_b_role: ids[1] === b.actor_id ? b.role : a.role,
      evidence_class: weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]),
      receipt_ids: receipts,
    });
    const ew = evidenceWeight(weakestEvidence([surface.evidence_class, a.evidence_class, b.evidence_class]));
    edge.evidence_weight = Math.min(edge.evidence_weight, ew);
  }
}

for (const edge of hopEdgeMap.values()) {
  edge.surface_count = edge.surfaces.length;
  hopEdges.push(edge);
}

function buildAdjacency(edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.actor_a)) adj.set(e.actor_a, []);
    if (!adj.has(e.actor_b)) adj.set(e.actor_b, []);
    adj.get(e.actor_a).push({ to: e.actor_b, edge: e });
    adj.get(e.actor_b).push({ to: e.actor_a, edge: e });
  }
  return adj;
}

const adjacency = buildAdjacency(hopEdges);
function shortestPath(start, target = 'matt-clifford') {
  if (start === target) return { number: 0, actor_path: [target], hops: [] };
  const q = [{ actor: start, actor_path: [start], hops: [] }];
  const seen = new Set([start]);
  while (q.length) {
    const cur = q.shift();
    for (const next of adjacency.get(cur.actor) ?? []) {
      if (seen.has(next.to)) continue;
      const actor_path = [...cur.actor_path, next.to];
      const hops = [...cur.hops, {
        from: cur.actor,
        to: next.to,
        shared_surfaces: next.edge.surfaces,
      }];
      if (next.to === target) return { number: actor_path.length - 1, actor_path, hops };
      seen.add(next.to);
      q.push({ actor: next.to, actor_path, hops });
    }
  }
  return { number: null, actor_path: [], hops: [] };
}

const shortestPaths = {};
for (const actor of data.actors) shortestPaths[actor.id] = shortestPath(actor.id);

const surfaceGraph = {
  generated: new Date().toISOString(),
  surfaces: data.surfaces.map(surface => ({
    ...surface,
    participants: participationBySurface.get(surface.surface_id) ?? [],
  })),
  actors: data.actors,
  organizations: data.organizations,
};

const hopGraph = {
  generated: new Date().toISOString(),
  anchor_actor_id: 'matt-clifford',
  rule: 'Actor-to-actor hops are generated only from shared valid bounded surfaces with explicit participation rows.',
  edges: hopEdges.sort((a, b) => `${a.actor_a}-${a.actor_b}`.localeCompare(`${b.actor_a}-${b.actor_b}`)),
  shortest_paths: shortestPaths,
  rejected_hop_surfaces: rejectedHopSurfaces,
};

const receiptGraph = {
  generated: new Date().toISOString(),
  receipts: data.receipts,
  claims: data.claims,
  surface_receipt_links: data.surfaces.map(s => ({ surface_id: s.surface_id, receipt_ids: s.receipt_ids ?? [] })),
  participation_receipt_links: data.participation.map(p => ({ surface_id: p.surface_id, participant_id: p.actor_id ?? p.organization_id, receipt_ids: p.receipt_ids ?? [] })),
};

writeJson('build/surface-graph.json', surfaceGraph);
writeJson('build/hop-graph.json', hopGraph);
writeJson('build/receipt-graph.json', receiptGraph);
writeJson('build/build-hop-report.json', { generated: new Date().toISOString(), errors, warnings, hop_edges: hopEdges.length, rejected_hop_surfaces: rejectedHopSurfaces });

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`build-hop-graph: ${data.surfaces.length} surfaces, ${hopEdges.length} actor-hop edges.`);
console.log(`rejected hop surfaces: ${rejectedHopSurfaces.length}`);
