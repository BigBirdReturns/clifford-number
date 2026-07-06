#!/usr/bin/env node
import { loadCase, loadCases, readJson, indexBy } from './lib/ledger.mjs';
import { windowOf, intersectAll, UNBOUNDED } from './lib/temporal.mjs';
import { buildIdentityLayer, NAMESPACE_CONVENTION } from './lib/axm-identity.mjs';
import { checkReceiptArchival, todayString } from './lib/receipt-archival.mjs';

const EXPECTED_VECTOR_SHA = '0104c9492c41a16f19e893f2d7be3b24f79456b49325a55c1885c6324fcc171e';

const { defaultId, cases } = loadCases();

const errors = [];
const warnings = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }

// ---- Per-case structural validation (runs for every case) ------------------
function validateCase(caseCfg) {
  const caseId = caseCfg.id;
  const data = loadCase(caseCfg);
  const hopGraph = readJson(`build/cases/${caseId}/hop-graph.json`);
  const surfaceGraph = readJson(`build/cases/${caseId}/surface-graph.json`);
  const surfaceById = indexBy(surfaceGraph.surfaces, 'surface_id');
  const surfaceTypeById = indexBy(data.surfaceTypes, 'id');

  const before = errors.length;

  // Ledger integrity.
  for (const surface of data.surfaces) {
    assert(surface.surface_id && surface.surface_label && surface.surface_type, `[${caseId}] surface missing required fields: ${JSON.stringify(surface)}`);
    assert(surfaceTypeById.has(surface.surface_type), `[${caseId}] surface ${surface.surface_id} uses unknown type ${surface.surface_type}`);
    for (const secondary of surface.secondary_surface_types ?? []) assert(surfaceTypeById.has(secondary), `[${caseId}] surface ${surface.surface_id} uses unknown secondary type ${secondary}`);
  }

  // Density discipline (constitution 1.7, BUILD-INSTRUCTIONS 2.2). The density
  // rule must exist and declare a numeric threshold — it must not be silently
  // deletable, or the population guard becomes a no-op.
  assert(data.densityRule && typeof data.densityRule.broad_surface_threshold === 'number',
    `[${caseId}] data/canonical/surface-types.json must declare density_rule.broad_surface_threshold as a number (constitution 1.7 density discipline)`);

  // Defense in depth: recompute each hop basis surface's distinct actor
  // population from the participation ledger and fail if any surface appearing
  // in a hop edge is at or above the declared threshold. Catches a stale or
  // hand-edited hop-graph.json that smuggled a large-N roster in as a silent hop.
  {
    const threshold = data.densityRule?.broad_surface_threshold;
    if (typeof threshold === 'number') {
      const actorPopBySurface = new Map();
      for (const p of data.participation) {
        if (p.participant_type !== 'actor') continue;
        if (!actorPopBySurface.has(p.surface_id)) actorPopBySurface.set(p.surface_id, new Set());
        actorPopBySurface.get(p.surface_id).add(p.actor_id);
      }
      const hopBasisSurfaceIds = new Set(hopGraph.edges.flatMap(e => (e.surfaces ?? []).map(b => b.surface_id)));
      for (const sid of hopBasisSurfaceIds) {
        const pop = actorPopBySurface.get(sid)?.size ?? 0;
        assert(pop < threshold, `[${caseId}] hop basis surface ${sid} has distinct actor population ${pop} >= density threshold ${threshold} — large-N surfaces are never silent hop machines (constitution 1.7)`);
      }
    }
  }

  // Every hop must carry its surface basis with a temporally honest window.
  for (const edge of hopGraph.edges) {
    assert(edge.actor_a && edge.actor_b, `[${caseId}] hop edge missing actor ids: ${JSON.stringify(edge)}`);
    assert(edge.surfaces?.length > 0, `[${caseId}] hop ${edge.actor_a}/${edge.actor_b} lacks shared surfaces`);
    for (const basis of edge.surfaces) {
      const surface = surfaceById.get(basis.surface_id);
      assert(surface, `[${caseId}] hop basis references missing surface ${basis.surface_id}`);
      assert(surface?.hop_eligible === true, `[${caseId}] hop basis ${basis.surface_id} is not hop eligible`);
      const parts = surface?.participants ?? [];
      assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a), `[${caseId}] hop basis ${basis.surface_id} lacks participant ${edge.actor_a}`);
      assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b), `[${caseId}] hop basis ${basis.surface_id} lacks participant ${edge.actor_b}`);
      assert(basis.receipt_ids?.length > 0, `[${caseId}] hop basis ${basis.surface_id} lacks receipts`);

      assert(typeof basis.temporal_status === 'string', `[${caseId}] hop basis ${basis.surface_id} lacks temporal_status`);
      const partA = (surface?.participants ?? []).find(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a);
      const partB = (surface?.participants ?? []).find(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b);
      const expected = intersectAll([
        windowOf(surface).dated ? windowOf(surface) : UNBOUNDED,
        windowOf(partA).dated ? windowOf(partA) : UNBOUNDED,
        windowOf(partB).dated ? windowOf(partB) : UNBOUNDED,
      ]);
      assert(expected !== null, `[${caseId}] hop basis ${basis.surface_id} for ${edge.actor_a}/${edge.actor_b} has disjoint windows and must not exist`);
      assert((basis.valid_from ?? null) === (expected?.valid_from ?? null), `[${caseId}] hop basis ${basis.surface_id} valid_from ${basis.valid_from} != expected ${expected?.valid_from}`);
      assert((basis.valid_until ?? null) === (expected?.valid_until ?? null), `[${caseId}] hop basis ${basis.surface_id} valid_until ${basis.valid_until} != expected ${expected?.valid_until}`);
    }
  }

  // Every rejected pair the builder recorded must genuinely have no overlap.
  for (const pair of hopGraph.rejected_hop_pairs ?? []) {
    assert(pair.reason?.startsWith('no_temporal_overlap'), `[${caseId}] rejected pair ${pair.surface_id} has unexpected reason ${pair.reason}`);
  }

  // No broad institution hops: broad orgs may be present in a surface, but the
  // hop itself must still be actor co-participation in that named surface.
  const broadOrgIds = new Set(data.organizations.filter(o => o.broad_institution).map(o => o.id));
  for (const edge of hopGraph.edges) {
    for (const basis of edge.surfaces) {
      const surface = surfaceById.get(basis.surface_id);
      const orgParts = (surface?.participants ?? []).filter(p => p.participant_type === 'organization');
      for (const orgPart of orgParts) {
        if (broadOrgIds.has(orgPart.organization_id)) {
          const actorParts = (surface?.participants ?? []).filter(p => p.participant_type === 'actor');
          assert(actorParts.length >= 2, `[${caseId}] surface ${surface.surface_id} has broad institution but fewer than two actor participants`);
        }
      }
    }
  }

  // Temporal identity layer (kind-based AXM Genesis ids). The artifact must be a
  // deterministic function of the ledger — recompute and require exact agreement
  // — and must carry its reconciliation statement and the kind-based namespace
  // convention, so a stale, hand-edited, or weakened artifact fails the release.
  {
    const identity = readJson(`build/cases/${caseId}/axm-identity.json`);
    assert(identity.scheme?.status === 'reconciled', `[${caseId}] axm-identity scheme.status must be "reconciled" (byte-for-byte against axm-genesis), got ${JSON.stringify(identity.scheme?.status)}`);
    assert(identity.scheme?.vectors?.sha256 === EXPECTED_VECTOR_SHA, `[${caseId}] axm-identity scheme must cite the shared vectors sha256 ${EXPECTED_VECTOR_SHA}`);
    assert(typeof identity.scheme?.serialization === 'string'
      && /axm_verify\.identity/.test(identity.scheme.serialization)
      && /identity\.json/.test(identity.scheme.serialization)
      && /conformance/.test(identity.scheme.serialization),
      `[${caseId}] axm-identity scheme.serialization must document reconciliation against axm-genesis axm_verify.identity, the shared vectors, and the conformance test`);
    // Namespace is now kind-based, not case-scoped: the convention string must be
    // present and the informational case field must name this case.
    assert(identity.scheme?.namespace_convention === NAMESPACE_CONVENTION, `[${caseId}] axm-identity scheme.namespace_convention must declare the kind-based convention`);
    assert(identity.scheme?.case === caseId, `[${caseId}] axm-identity scheme.case ${identity.scheme?.case} does not match the case id`);
    assert(identity.scheme?.namespace === undefined, `[${caseId}] axm-identity scheme must not pin a case-scoped namespace (kind-based ids now)`);
    const recomputed = buildIdentityLayer({
      caseId,
      actors: data.actors,
      organizations: data.organizations,
      surfaces: data.surfaces,
      participation: data.participation,
      aliases: data.aliases,
    });
    assert(JSON.stringify({ scheme: identity.scheme, entities: identity.entities, claims: identity.claims }) === JSON.stringify(recomputed),
      `[${caseId}] build/cases/${caseId}/axm-identity.json does not match the identity layer recomputed from the ledger — rebuild (npm run build:hops -- --case ${caseId})`);
    const idRe = /^e1_[a-z2-7]{52}$/;
    for (const e of identity.entities) assert(idRe.test(e.axm_entity_id), `[${caseId}] entity ${e.local_id} has malformed axm id ${e.axm_entity_id}`);
    for (const c of identity.claims) {
      assert(/^c1_[a-z2-7]{52}$/.test(c.claim_id), `[${caseId}] claim ${c.claim_id} is malformed`);
      assert(c.windows.length > 0, `[${caseId}] claim ${c.claim_id} carries no temporal windows`);
      for (const w of c.windows) {
        assert(w.dated === Boolean(w.valid_from || w.valid_until), `[${caseId}] claim ${c.claim_id} window dated flag disagrees with its bounds`);
      }
    }
    const pairs = new Set(identity.claims.map(c => `${c.subj}||${c.obj}`));
    assert(pairs.size === identity.claims.length, `[${caseId}] duplicate (subj, obj) participates_in claims — stints must be windows on one claim`);
  }

  // Receipt archival gate (BUILD-INSTRUCTIONS 2.5).
  {
    const { errors: archivalErrors, warnings: archivalWarnings } = checkReceiptArchival(data.receipts, { today: todayString() });
    for (const err of archivalErrors) errors.push(`[${caseId}] ${err}`);
    for (const warn of archivalWarnings) warnings.push(`[${caseId}] ${warn}`);
  }

  const caseErrors = errors.length - before;
  console.log(`  case ${caseId}: ${data.surfaces.length} surfaces, ${hopGraph.edges.length} hop edges, ${data.receipts.length} receipts${caseErrors ? ` — ${caseErrors} error(s)` : ' — OK'}`);
  return { data, hopGraph, surfaceGraph, surfaceById };
}

// ---- UK-specific fixture assertions (default case only) --------------------
function validateUkFixtures({ data, hopGraph, surfaceById }) {
  const scores = readJson('build/scores.json');
  const migration = readJson('build/migration-summary.json');
  const actorScore = new Map(scores.actors.map(a => [a.actor_id, a]));
  const orgScore = new Map(scores.organizations.map(o => [o.organization_id, o]));
  const hasSurface = (actorId, surfaceId) => actorScore.get(actorId)?.surfaces.includes(surfaceId);
  const hasType = (actorId, typeId) => (actorScore.get(actorId)?.surfaces ?? []).some(sid => surfaceById.get(sid)?.surface_type === typeId);
  const hasSecondary = (actorId, typeId) => (actorScore.get(actorId)?.secondary_surface_types ?? []).includes(typeId);

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

  // Laundering-chain / machine-score dimension: present, high, and provably NOT a hop.
  for (const chain of (scores.chains ?? [])) {
    assert(chain.clifford_number === null, `chain ${chain.chain_id} must not carry a Clifford Number`);
    assert(typeof chain.why_no_hop === 'string' && chain.why_no_hop.length > 0, `chain ${chain.chain_id} must explain why_no_hop`);
    assert(chain.connector_surfaces_all_non_hop === true, `chain ${chain.chain_id} connector surfaces must be non-hop`);
    assert(chain.laundering_chain_score >= 1 && chain.laundering_chain_score <= chain.laundering_chain_max, `chain ${chain.chain_id} laundering_chain_score out of range`);
    for (const sid of chain.surfaces) assert(surfaceById.has(sid), `chain ${chain.chain_id} references missing surface ${sid}`);
    for (const sid of chain.surfaces) {
      const surface = surfaceById.get(sid);
      if (surface?.surface_type === 'laundering_chain_connector') {
        const isHopBasis = hopGraph.edges.some(e => e.surfaces.some(b => b.surface_id === sid));
        assert(!isHopBasis, `laundering_chain_connector ${sid} must never be a hop basis`);
      }
    }
  }
  for (const a of scores.actors) assert(a.machine_score >= 0 && a.machine_score <= 1, `actor ${a.actor_id} machine_score out of range`);
  for (const c of (scores.chains ?? [])) assert(c.machine_score >= 0 && c.machine_score <= 1, `chain ${c.chain_id} machine_score out of range`);
  assert((scores.chains ?? []).some(c => c.laundering_chain_score >= 3), 'expected at least one laundering chain with score >= 3');

  // Full-database migration is required, not optional.
  assert(migration.total_rows > 200, `migration parsed too few master rows: ${migration.total_rows}`);
  assert(migration.bucket_counts?.participation_claim > 50, 'migration did not classify enough participation claims from master doc');
}

// ---- Run --------------------------------------------------------------------
console.log('validate-release: per-case checks');
for (const caseCfg of cases) {
  const ctx = validateCase(caseCfg);
  if (caseCfg.id === defaultId) validateUkFixtures(ctx);
}

if (errors.length) {
  console.error('validate-release failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn(`validate-release: ${warnings.length} warning(s):`);
  for (const warn of warnings) console.warn(`- ${warn}`);
}

console.log(`validate-release: OK (${cases.length} case(s): ${cases.map(c => c.id).join(', ')})`);
