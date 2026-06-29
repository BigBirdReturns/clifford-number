#!/usr/bin/env node
import { loadAll, readJson, indexBy } from './lib/ledger.mjs';

const data = loadAll();
const scores = readJson('build/scores.json');
const hopGraph = readJson('build/hop-graph.json');
const surfaceGraph = readJson('build/surface-graph.json');
const migration = readJson('build/migration-summary.json');
const surfaceById = indexBy(surfaceGraph.surfaces, 'surface_id');
const surfaceTypeById = indexBy(data.surfaceTypes, 'id');
const actorScore = new Map(scores.actors.map(a => [a.actor_id, a]));
const orgScore = new Map(scores.organizations.map(o => [o.organization_id, o]));

const errors = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }
function hasSurface(actorId, surfaceId) {
  return actorScore.get(actorId)?.surfaces.includes(surfaceId);
}
function hasType(actorId, typeId) {
  return (actorScore.get(actorId)?.surfaces ?? []).some(sid => surfaceById.get(sid)?.surface_type === typeId);
}
function hasSecondary(actorId, typeId) {
  return (actorScore.get(actorId)?.secondary_surface_types ?? []).includes(typeId);
}

// Ledger integrity.
for (const surface of data.surfaces) {
  assert(surface.surface_id && surface.surface_label && surface.surface_type, `surface missing required fields: ${JSON.stringify(surface)}`);
  assert(surfaceTypeById.has(surface.surface_type), `surface ${surface.surface_id} uses unknown type ${surface.surface_type}`);
  for (const secondary of surface.secondary_surface_types ?? []) assert(surfaceTypeById.has(secondary), `surface ${surface.surface_id} uses unknown secondary type ${secondary}`);
}

// Every hop must carry its surface basis.
for (const edge of hopGraph.edges) {
  assert(edge.actor_a && edge.actor_b, `hop edge missing actor ids: ${JSON.stringify(edge)}`);
  assert(edge.surfaces?.length > 0, `hop ${edge.actor_a}/${edge.actor_b} lacks shared surfaces`);
  for (const basis of edge.surfaces) {
    const surface = surfaceById.get(basis.surface_id);
    assert(surface, `hop basis references missing surface ${basis.surface_id}`);
    assert(surface?.hop_eligible === true, `hop basis ${basis.surface_id} is not hop eligible`);
    const parts = surface?.participants ?? [];
    assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a), `hop basis ${basis.surface_id} lacks participant ${edge.actor_a}`);
    assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b), `hop basis ${basis.surface_id} lacks participant ${edge.actor_b}`);
    assert(basis.receipt_ids?.length > 0, `hop basis ${basis.surface_id} lacks receipts`);
  }
}

// Regression fixture 1: Ben Warner.
const warnerSurfaces = [
  'no10-digital-data-advisory-2019-2021',
  'faculty-investor-employee-2015-2019',
  'vote-leave-data-science-2016',
  'electric-twin-founder-2023',
  'electric-twin-newsuk-synthetic-audience',
  'gartner-synthetic-population-category-2026',
];
for (const sid of warnerSurfaces) assert(hasSurface('ben-warner', sid), `Ben Warner missing surface ${sid}`);
for (const type of ['government_advisory_surface', 'employment_investment_surface', 'campaign_surface', 'founder_officer_surface', 'customer_vendor_surface', 'category_formation_surface']) {
  assert(hasType('ben-warner', type), `Ben Warner missing surface type ${type}`);
}
assert(hasSecondary('ben-warner', 'democratic_input_replacement'), 'Ben Warner missing democratic_input_replacement recurrence');
assert(actorScore.get('ben-warner')?.governance_replacement_score > 0, 'Ben Warner governance replacement score must be > 0');

// Regression fixture 2: Electric Twin surface factory.
const et = orgScore.get('electric-twin');
assert(et?.surface_factory === true, 'Electric Twin must be a surface factory');
for (const sid of ['electric-twin-founder-2023', 'electric-twin-ethics-board-2026', 'electric-twin-funding-surface-2023-2026', 'electric-twin-newsuk-synthetic-audience', 'gartner-synthetic-population-category-2026']) {
  assert(et?.surfaces.includes(sid), `Electric Twin missing factory surface ${sid}`);
}

// Regression fixture 3: Simon Case governance continuity.
assert(hasSurface('simon-case', 'simon-case-cabinet-secretary-2020-2024'), 'Simon Case missing Cabinet Secretary surface');
assert(hasSurface('simon-case', 'electric-twin-ethics-board-2026'), 'Simon Case missing Electric Twin ethics board surface');
assert(hasSurface('simon-case', 'team-barrow-public-private-fund-2026'), 'Simon Case missing Team Barrow public-private fund surface');
assert(hasSecondary('simon-case', 'governance_continuity_surface'), 'Simon Case missing governance continuity surface type');

// Regression fixture 4: surface discrimination.
assert(surfaceById.get('electric-twin-newsuk-synthetic-audience')?.hop_eligible === false, 'News UK synthetic audience surface must be non-hop scorable context');
assert(surfaceById.get('gartner-synthetic-population-category-2026')?.hop_eligible === false, 'Gartner category formation surface must be non-hop scorable context');
assert(surfaceById.get('faculty-investor-employee-2015-2019')?.hop_eligible === true, 'Faculty investor/employee surface must be hop eligible');

// Regression fixture 5: no broad institution hops.
const broadOrgIds = new Set(data.organizations.filter(o => o.broad_institution).map(o => o.id));
for (const edge of hopGraph.edges) {
  for (const basis of edge.surfaces) {
    const surface = surfaceById.get(basis.surface_id);
    const orgParts = (surface?.participants ?? []).filter(p => p.participant_type === 'organization');
    for (const orgPart of orgParts) {
      if (broadOrgIds.has(orgPart.organization_id)) {
        // Broad institutions may be present in a surface, but the hop itself must still be actor co-participation in that named bounded surface.
        const actorParts = (surface?.participants ?? []).filter(p => p.participant_type === 'actor');
        assert(actorParts.length >= 2, `surface ${surface.surface_id} has broad institution but fewer than two actor participants`);
      }
    }
  }
}

// Laundering-chain / machine-score dimension: must be present, must NOT create hops.
const hopEdgeKeys = new Set(hopGraph.edges.flatMap(e => [`${e.actor_a}||${e.actor_b}`, `${e.actor_b}||${e.actor_a}`]));
for (const chain of (scores.chains ?? [])) {
  assert(chain.clifford_number === null, `chain ${chain.chain_id} must not carry a Clifford Number`);
  assert(typeof chain.why_no_hop === 'string' && chain.why_no_hop.length > 0, `chain ${chain.chain_id} must explain why_no_hop`);
  assert(chain.connector_surfaces_all_non_hop === true, `chain ${chain.chain_id} connector surfaces must be non-hop`);
  assert(chain.laundering_chain_score >= 1 && chain.laundering_chain_score <= chain.laundering_chain_max, `chain ${chain.chain_id} laundering_chain_score out of range`);
  for (const sid of chain.surfaces) assert(surfaceById.has(sid), `chain ${chain.chain_id} references missing surface ${sid}`);
  // The chain's dedicated connector surfaces must never appear as a hop basis.
  for (const sid of chain.surfaces) {
    const surface = surfaceById.get(sid);
    if (surface?.surface_type === 'laundering_chain_connector') {
      const isHopBasis = hopGraph.edges.some(e => e.surfaces.some(b => b.surface_id === sid));
      assert(!isHopBasis, `laundering_chain_connector ${sid} must never be a hop basis`);
    }
  }
}
// machine_score must be a normalized 0..1 figure on every scored entity.
for (const a of scores.actors) assert(a.machine_score >= 0 && a.machine_score <= 1, `actor ${a.actor_id} machine_score out of range`);
for (const c of (scores.chains ?? [])) assert(c.machine_score >= 0 && c.machine_score <= 1, `chain ${c.chain_id} machine_score out of range`);
// A high chain score must be expressible without a hop: at least one entity with chain score >= 3
// and no Clifford hop, OR the chain itself (which never hops). This is the whole point of the dimension.
assert((scores.chains ?? []).some(c => c.laundering_chain_score >= 3), 'expected at least one laundering chain with score >= 3');

// Full-database migration is required, not optional.
assert(migration.total_rows > 200, `migration parsed too few master rows: ${migration.total_rows}`);
assert(migration.bucket_counts?.participation_claim > 50, 'migration did not classify enough participation claims from master doc');

if (errors.length) {
  console.error('validate-release failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('validate-release: OK');
console.log(`  surfaces: ${data.surfaces.length}`);
console.log(`  hop edges: ${hopGraph.edges.length}`);
console.log(`  master rows classified: ${migration.total_rows}`);
