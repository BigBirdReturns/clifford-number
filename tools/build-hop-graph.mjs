#!/usr/bin/env node
import { loadAll, readJson, writeJson, indexBy } from './lib/ledger.mjs';
import { deriveHopEdges, buildAdjacency, shortestPath } from './lib/hops.mjs';
import { buildIdentityLayer } from './lib/axm-identity.mjs';

const ANCHOR_ACTOR_ID = 'matt-clifford';

const data = loadAll();
const legacyGraph = readJson('graph.json');
const intakeCandidates = readJson('data/intake/defense-industrial-candidates.json').candidates ?? [];
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
const { edges: hopEdges, rejectedHopSurfaces, rejectedHopPairs } = deriveHopEdges({
  surfaces: data.surfaces,
  participationBySurface,
  broadOrgIds: BROAD_ORGS,
  densityPolicy: data.densityPolicy,
  receiptById,
});
for (const rejected of rejectedHopSurfaces.filter(s => s.reason === 'density_limit_exceeded')) {
  errors.push(`surface ${rejected.surface_id} has ${rejected.actor_count} actors, exceeding the hop density limit of ${rejected.max_hop_actor_count}`);
}

const adjacency = buildAdjacency(hopEdges);
const shortestPaths = {};
for (const actor of data.actors) shortestPaths[actor.id] = shortestPath(adjacency, actor.id, ANCHOR_ACTOR_ID);

const actorIds = new Set(data.actors.map(actor => actor.id));
const orgIds = new Set(data.organizations.map(org => org.id));
const aliases = [...data.aliases];
const legacyActors = [];
const legacyOrganizations = [];

for (const node of legacyGraph.nodes ?? []) {
  if (node.type === 'person' && !actorIds.has(node.id)) {
    legacyActors.push({
      id: node.id,
      label: node.label,
      kind: 'person',
      source: 'legacy_graph',
      legacy_type: node.type,
      description: node.description,
      tags: node.tags ?? [],
    });
    actorIds.add(node.id);
  } else if (node.type !== 'person' && !orgIds.has(node.id)) {
    legacyOrganizations.push({
      id: node.id,
      label: node.label,
      kind: node.type,
      source: 'legacy_graph',
      legacy_type: node.type,
      description: node.description,
      tags: node.tags ?? [],
    });
    orgIds.add(node.id);
  }

  for (const alias of node.aliases ?? []) {
    aliases.push({
      alias,
      canonical_id: node.id,
      kind: node.type === 'person' ? 'actor' : 'organization',
      source: 'legacy_graph',
    });
  }
}

const surfaceGraph = {
  generated: new Date().toISOString(),
  surfaces: data.surfaces.map(surface => ({
    ...surface,
    participants: participationBySurface.get(surface.surface_id) ?? [],
  })),
  actors: [...data.actors, ...legacyActors],
  organizations: [...data.organizations, ...legacyOrganizations],
  aliases,
  candidates: intakeCandidates,
};

const hopGraph = {
  generated: new Date().toISOString(),
  anchor_actor_id: ANCHOR_ACTOR_ID,
  rule: 'Actor-to-actor hops are generated only from shared valid bounded surfaces with explicit participation rows.',
  temporal_rule: 'A hop basis exists only for the window where both participations and the surface overlap. Disjoint dated participations create no hop (rejected_hop_pairs). Bases with an undated participation never support time-sliced claims.',
  edges: hopEdges,
  shortest_paths: shortestPaths,
  rejected_hop_surfaces: rejectedHopSurfaces,
  rejected_hop_pairs: rejectedHopPairs,
};

// Reconciled temporal identity layer: content-addressed entity ids for the
// canonical registries plus time-qualified participates_in claims. Kept in
// its own artifact; reconciled identity does not add or alter graph edges.
const identityLayer = buildIdentityLayer({
  namespace: readJson('cases.json').default_case_id,
  actors: data.actors,
  organizations: data.organizations,
  surfaces: data.surfaces,
  participation: data.participation,
  aliases: data.aliases,
});

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
writeJson('build/axm-identity.json', { generated: new Date().toISOString(), ...identityLayer });
writeJson('build/build-hop-report.json', { generated: new Date().toISOString(), errors, warnings, hop_edges: hopEdges.length, rejected_hop_surfaces: rejectedHopSurfaces, rejected_hop_pairs: rejectedHopPairs });

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`build-hop-graph: ${data.surfaces.length} surfaces, ${hopEdges.length} actor-hop edges.`);
console.log(`axm identity (reconciled): ${identityLayer.entities.length} entities, ${identityLayer.claims.length} participates_in claims.`);
console.log(`rejected hop surfaces: ${rejectedHopSurfaces.length}, rejected hop pairs (no temporal overlap): ${rejectedHopPairs.length}`);
