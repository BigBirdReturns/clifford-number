import assert from 'node:assert/strict';
import { loadCase, loadCases } from '../tools/lib/ledger.mjs';
import { deriveHopEdges } from '../tools/lib/hops.mjs';
import { buildIdentityLayer } from '../tools/lib/axm-identity.mjs';
import { entityId } from '../tools/lib/axm-id.mjs';

const { defaultId, cases } = loadCases();
const ukCfg = cases.find(c => c.id === 'uk-ai-policy');
const natsecCfg = cases.find(c => c.id === 'us-defense-natsec100');
assert.ok(ukCfg && natsecCfg, 'both the UK and natsec cases must be present in cases.json');
assert.equal(defaultId, 'uk-ai-policy');

// (a) loadCase loads both cases; natsec has the expected shape.
const uk = loadCase(ukCfg);
const natsec = loadCase(natsecCfg);
assert.ok(uk.surfaces.length > 0 && uk.organizations.length > 0, 'UK case must load a ledger');
assert.equal(natsec.surfaces.length, 4, 'natsec must have 4 ranking surfaces');
assert.equal(natsec.participation.length, 358, 'natsec must have 358 participations');
assert.equal(natsec.receipts.length, 16, 'natsec must have 16 receipts');
assert.equal(natsec.actors.length, 0, 'natsec chunk 1 has no person actors');
// Shared vocabulary comes from data/canonical regardless of case.
assert.ok(natsec.surfaceTypes.some(t => t.id === 'ranking_surface'), 'natsec must see the shared ranking_surface vocabulary');
assert.ok(typeof natsec.densityRule?.broad_surface_threshold === 'number', 'natsec must see the shared density_rule');

// (b) deriveHopEdges on the natsec case: 0 edges, 4 rejections, all because the
// ranking surfaces are not hop-eligible (density discipline, constitution 1.7).
const participationBySurface = new Map();
for (const p of natsec.participation) {
  if (!participationBySurface.has(p.surface_id)) participationBySurface.set(p.surface_id, []);
  participationBySurface.get(p.surface_id).push(p);
}
const broadOrgIds = new Set(natsec.organizations.filter(o => o.broad_institution).map(o => o.id));
const { edges, rejectedHopSurfaces } = deriveHopEdges({
  surfaces: natsec.surfaces,
  participationBySurface,
  broadOrgIds,
  broadSurfaceThreshold: natsec.densityRule?.broad_surface_threshold ?? Infinity,
});
assert.equal(edges.length, 0, 'natsec must compile to zero hop edges');
assert.equal(rejectedHopSurfaces.length, 4, 'natsec must reject all 4 ranking surfaces');
assert.ok(rejectedHopSurfaces.every(r => r.reason === 'surface_not_hop_eligible'),
  'every natsec surface rejection must be surface_not_hop_eligible');

// (c) THE JOIN PRECONDITION. Build the identity layer for both cases and assert
// that the organization "Andreessen Horowitz" produces the SAME axm_entity_id in
// both — that is exactly what a case-scoped namespace made impossible and what
// kind-based namespaces restore (BUILD-INSTRUCTIONS 3.2).
const ukLayer = buildIdentityLayer({
  caseId: 'uk-ai-policy',
  actors: uk.actors, organizations: uk.organizations, surfaces: uk.surfaces,
  participation: uk.participation, aliases: uk.aliases,
});
const natsecLayer = buildIdentityLayer({
  caseId: 'us-defense-natsec100',
  actors: natsec.actors, organizations: natsec.organizations, surfaces: natsec.surfaces,
  participation: natsec.participation, aliases: natsec.aliases,
});

const ukA16z = ukLayer.entities.find(e => e.local_id === 'andreessen-horowitz');
const natsecA16z = natsecLayer.entities.find(e => e.local_id === 'andreessen-horowitz');
assert.ok(ukA16z && natsecA16z, 'Andreessen Horowitz must exist in both cases\' registries');
assert.equal(ukA16z.axm_entity_id, natsecA16z.axm_entity_id,
  'Andreessen Horowitz must yield an IDENTICAL axm_entity_id across cases (kind-based join precondition)');
assert.equal(ukA16z.axm_entity_id, entityId('organization', 'Andreessen Horowitz'),
  'the shared id must be the kind-based derivation entityId("organization", "Andreessen Horowitz")');

// The natsec a16z alias (from the registry row\'s own "aliases" array, since the
// natsec case has no aliases.json) must produce an alias-derived id.
assert.ok(natsecA16z.alias_axm_ids.length > 0, 'natsec a16z must carry an alias-derived id from its "aliases" array');
assert.ok(natsecA16z.alias_axm_ids.includes(entityId('organization', 'a16z')),
  'the natsec a16z alias must derive entityId("organization", "a16z")');

console.log(`join: Andreessen Horowitz axm_entity_id (both cases) = ${ukA16z.axm_entity_id}`);

// (d) The kind-based namespace convention is declared in both layers.
assert.ok(/kind-based/.test(ukLayer.scheme.namespace_convention), 'UK layer must declare the kind-based convention');
assert.ok(/kind-based/.test(natsecLayer.scheme.namespace_convention), 'natsec layer must declare the kind-based convention');
assert.equal(ukLayer.scheme.case, 'uk-ai-policy');
assert.equal(natsecLayer.scheme.case, 'us-defense-natsec100');

console.log('multi-case.test: OK');
