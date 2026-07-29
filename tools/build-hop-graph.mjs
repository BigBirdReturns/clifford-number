#!/usr/bin/env node
import fs from 'node:fs';
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

function readJsonl(relative) {
  return fs.readFileSync(relative, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}

function loadLocalCanonicalResolutions() {
  const directory = 'data/project';
  if (!fs.existsSync(directory)) return { rows: [], byLocal: new Map() };
  const paths = fs.readdirSync(directory)
    .filter(name => /^lake-local-canonical-resolution-registry-wave-\d+\.jsonl$/.test(name))
    .sort()
    .map(name => `${directory}/${name}`);
  const rows = [];
  const byLocal = new Map();
  for (const relative of paths) {
    for (const row of readJsonl(relative)) {
      if (!row.local_subject_id || !row.canonical_id) continue;
      if (!String(row.status ?? '').startsWith('accepted_')) continue;
      const prior = byLocal.get(row.local_subject_id);
      if (prior && prior.canonical_id !== row.canonical_id) {
        errors.push(`local canonical resolution conflict for ${row.local_subject_id}: ${prior.canonical_id} vs ${row.canonical_id}`);
        continue;
      }
      const bound = { ...row, source_registry_path: relative };
      byLocal.set(row.local_subject_id, bound);
      rows.push(bound);
    }
  }
  return { rows, byLocal };
}

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
const aliasKeys = new Set(aliases.map(row => `${row.kind}:${row.canonical_id}:${String(row.alias).toLowerCase()}`));
const legacyActors = [];
const legacyOrganizations = [];
const legacyNodeById = new Map((legacyGraph.nodes ?? []).map(node => [node.id, node]));
const { rows: localResolutionRows, byLocal: localResolutionByLocal } = loadLocalCanonicalResolutions();
const legacyContextsByCanonical = new Map();

function pushAlias(row) {
  const key = `${row.kind}:${row.canonical_id}:${String(row.alias).toLowerCase()}`;
  if (aliasKeys.has(key)) return;
  aliasKeys.add(key);
  aliases.push(row);
}

function addLegacyContext(canonicalId, node, resolution = null) {
  if (!legacyContextsByCanonical.has(canonicalId)) legacyContextsByCanonical.set(canonicalId, []);
  legacyContextsByCanonical.get(canonicalId).push({
    node,
    local_subject_id: node.id,
    resolution_id: resolution?.resolution_id ?? null,
    source_registry_path: resolution?.source_registry_path ?? null,
  });
}

for (const node of legacyGraph.nodes ?? []) {
  const resolution = localResolutionByLocal.get(node.id) ?? null;
  let targetId = resolution?.canonical_id ?? node.id;
  const targetIsActor = actorById.has(targetId);
  const targetIsOrganization = orgById.has(targetId);
  const expectedKind = node.type === 'person' ? 'actor' : 'organization';

  if (resolution) {
    if (!targetIsActor && !targetIsOrganization) {
      errors.push(`resolved legacy node ${node.id} targets missing canonical record ${targetId}`);
      targetId = node.id;
    } else if ((expectedKind === 'actor' && !targetIsActor) || (expectedKind === 'organization' && !targetIsOrganization)) {
      errors.push(`resolved legacy node ${node.id} kind ${expectedKind} conflicts with canonical target ${targetId}`);
      targetId = node.id;
    }
  }

  if ((node.type === 'person' && actorById.has(targetId)) || (node.type !== 'person' && orgById.has(targetId))) {
    addLegacyContext(targetId, node, resolution);
  } else if (node.type === 'person' && !actorIds.has(targetId)) {
    legacyActors.push({
      id: targetId,
      label: node.label,
      kind: 'person',
      source: 'legacy_graph',
      legacy_type: node.type,
      description: node.description,
      tags: node.tags ?? [],
    });
    actorIds.add(targetId);
  } else if (node.type !== 'person' && !orgIds.has(targetId)) {
    legacyOrganizations.push({
      id: targetId,
      label: node.label,
      kind: node.type,
      source: 'legacy_graph',
      legacy_type: node.type,
      description: node.description,
      tags: node.tags ?? [],
    });
    orgIds.add(targetId);
  }

  for (const alias of node.aliases ?? []) {
    pushAlias({
      alias,
      canonical_id: targetId,
      kind: node.type === 'person' ? 'actor' : 'organization',
      source: resolution ? 'legacy_graph_retargeted_by_local_canonical_resolution' : 'legacy_graph',
      ...(resolution ? {
        legacy_local_id: node.id,
        local_resolution_id: resolution.resolution_id,
      } : {}),
    });
  }
}

function withLegacyContext(record, expectedType) {
  const contexts = legacyContextsByCanonical.get(record.id) ?? [];
  const sameIdLegacy = legacyNodeById.get(record.id);
  if (sameIdLegacy && sameIdLegacy.type === expectedType && !contexts.some(context => context.node.id === sameIdLegacy.id)) {
    contexts.push({ node: sameIdLegacy, local_subject_id: sameIdLegacy.id, resolution_id: null, source_registry_path: null });
  }
  const valid = contexts.filter(context => context.node.type === expectedType);
  if (!valid.length) return record;
  const description = record.description
    ?? record.plain?.who
    ?? valid.find(context => context.node.description)?.node.description
    ?? '';
  const tags = [...new Set([
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...valid.flatMap(context => context.node.tags ?? []),
  ])];
  const legacyLocalIds = [...new Set(valid.map(context => context.local_subject_id).filter(id => id !== record.id))].sort();
  const resolutionIds = [...new Set(valid.map(context => context.resolution_id).filter(Boolean))].sort();
  return {
    ...record,
    description,
    tags,
    legacy_bridge: true,
    legacy_types: [...new Set(valid.map(context => context.node.type))].sort(),
    ...(legacyLocalIds.length ? { legacy_local_ids: legacyLocalIds } : {}),
    ...(resolutionIds.length ? { local_canonical_resolution_ids: resolutionIds } : {}),
  };
}

const canonicalActors = data.actors.map(actor => withLegacyContext(actor, 'person'));
const canonicalOrganizations = data.organizations.map(organization => withLegacyContext(organization, legacyNodeById.get(organization.id)?.type ?? 'organization'))
  .map(organization => {
    if (organization.legacy_bridge) return organization;
    const contexts = legacyContextsByCanonical.get(organization.id) ?? [];
    if (!contexts.length) return organization;
    const valid = contexts.filter(context => context.node.type !== 'person');
    if (!valid.length) return organization;
    const description = organization.description ?? valid.find(context => context.node.description)?.node.description ?? '';
    const tags = [...new Set([...(organization.tags ?? []), ...valid.flatMap(context => context.node.tags ?? [])])];
    const legacyLocalIds = [...new Set(valid.map(context => context.local_subject_id).filter(id => id !== organization.id))].sort();
    const resolutionIds = [...new Set(valid.map(context => context.resolution_id).filter(Boolean))].sort();
    return {
      ...organization,
      description,
      tags,
      legacy_bridge: true,
      legacy_types: [...new Set(valid.map(context => context.node.type))].sort(),
      ...(legacyLocalIds.length ? { legacy_local_ids: legacyLocalIds } : {}),
      ...(resolutionIds.length ? { local_canonical_resolution_ids: resolutionIds } : {}),
    };
  });

const surfaceGraph = {
  generated: new Date().toISOString(),
  surfaces: data.surfaces.map(surface => ({
    ...surface,
    participants: participationBySurface.get(surface.surface_id) ?? [],
  })),
  actors: [...canonicalActors, ...legacyActors],
  organizations: [...canonicalOrganizations, ...legacyOrganizations],
  aliases,
  local_canonical_resolutions: localResolutionRows.map(row => ({
    resolution_id: row.resolution_id,
    local_subject_id: row.local_subject_id,
    canonical_id: row.canonical_id,
    canonical_kind: row.canonical_kind,
    status: row.status,
    graph_effect: row.graph_effect,
  })),
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
console.log(`axm identity (provisional): ${identityLayer.entities.length} entities, ${identityLayer.claims.length} participates_in claims.`);
console.log(`local canonical resolutions observed: ${localResolutionRows.length}.`);
console.log(`rejected hop surfaces: ${rejectedHopSurfaces.length}, rejected hop pairs (no temporal overlap): ${rejectedHopPairs.length}`);
