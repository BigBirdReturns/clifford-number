#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadAll, readJson, indexBy, root } from './lib/ledger.mjs';
import { windowOf, intersectAll, UNBOUNDED } from './lib/temporal.mjs';
import { isFieldAutopsyCase, loadFieldAutopsy, validateFieldAutopsy } from './lib/field-autopsy.mjs';
import { buildIdentityLayer } from './lib/axm-identity.mjs';
import { checkReceiptArchival, todayString } from './lib/receipt-archival.mjs';
import { assessHopDensity, validateDensityPolicy } from './lib/density.mjs';
import { receiptSupportsPublishedWindow } from './lib/hops.mjs';
import { validateCorpusSelection } from './validate-corpus-selection.mjs';
import { validateConsumptionContract } from './validate-consumption-contract.mjs';
import { validateOfficeholderCohort } from './validate-officeholder-cohort.mjs';

const data = loadAll();
const scores = readJson('build/scores.json');
const hopGraph = readJson('build/hop-graph.json');
const surfaceGraph = readJson('build/surface-graph.json');
const migration = readJson('build/migration-summary.json');
const surfaceById = indexBy(surfaceGraph.surfaces, 'surface_id');
const surfaceTypeById = indexBy(data.surfaceTypes, 'id');
const actorScore = new Map(scores.actors.map(a => [a.actor_id, a]));
const orgScore = new Map(scores.organizations.map(o => [o.organization_id, o]));
const receiptById = indexBy(data.receipts, 'receipt_id');

const errors = [];
const warnings = [];
function assert(cond, msg) { if (!cond) errors.push(msg); }

// Completed transport must not survive on the canonical release tree. These
// paths were branch-local bootstrap for M-03 and M-05, both of which now have
// permanent builders, validators, reports, and release gates on main. Keeping
// the carriers or self-removing writers after completion creates a second,
// stale authority surface and makes later audits mistake transport for source.
for (const completedTransportPath of [
  '.github/temporary',
  '.github/workflows/temporary-m03-apply.yml',
  '.github/workflows/temporary-m03-source-export.yml',
  '.github/workflows/temporary-materialize-m05-s03-l7.yml',
]) {
  assert(!fs.existsSync(path.join(root, completedTransportPath)),
    `completed transport remains on the release tree: ${completedTransportPath}`);
}
function sameWindow(left, right) {
  return (left?.valid_from ?? null) === (right?.valid_from ?? null)
    && (left?.valid_until ?? null) === (right?.valid_until ?? null)
    && Boolean(left?.dated) === Boolean(right?.dated);
}
function sameIdSet(left = [], right = []) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

// Constitutional selection-layer gate. A release cannot be individually
// careful at the edge while silently choosing asymmetric or unmeasured corpora.
for (const error of validateCorpusSelection({ root: process.cwd() }).errors) {
  errors.push(`selection ${error.code} (${error.file}): ${error.message}`);
}
for (const error of validateConsumptionContract({ root: process.cwd() }).errors) {
  errors.push(`consumption ${error.code} (${error.file}): ${error.message}`);
}
for (const error of validateOfficeholderCohort({ root: process.cwd() }).errors) {
  errors.push(`officeholder ${error.code} (${error.file}): ${error.message}`);
}
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
let densityPolicyValid = true;
try {
  validateDensityPolicy(data.densityPolicy);
} catch (error) {
  densityPolicyValid = false;
  errors.push(error.message);
}

const sourcePartsBySurface = new Map();
for (const p of data.participation) {
  if (!sourcePartsBySurface.has(p.surface_id)) sourcePartsBySurface.set(p.surface_id, []);
  sourcePartsBySurface.get(p.surface_id).push(p);
}

function checkDensity(surface, participants, origin) {
  if (!densityPolicyValid) return;
  const density = assessHopDensity(surface, participants, data.densityPolicy);
  assert(!density.exceeds_limit,
    `${origin} surface ${surface.surface_id} is hop eligible with ${density.actor_count} distinct actors; maximum is ${density.max_hop_actor_count}`);
}

for (const surface of data.surfaces) {
  assert(surface.surface_id && surface.surface_label && surface.surface_type, `surface missing required fields: ${JSON.stringify(surface)}`);
  assert(typeof surface.hop_eligible === 'boolean', `surface ${surface.surface_id} hop_eligible must be boolean`);
  assert(surfaceTypeById.has(surface.surface_type), `surface ${surface.surface_id} uses unknown type ${surface.surface_type}`);
  for (const secondary of surface.secondary_surface_types ?? []) assert(surfaceTypeById.has(secondary), `surface ${surface.surface_id} uses unknown secondary type ${secondary}`);
  checkDensity(surface, sourcePartsBySurface.get(surface.surface_id) ?? [], 'ledger');
}

// Generated surface data must retain the source eligibility decision and the
// same density invariant. This also prevents validate:release from accepting a
// stale hop artifact after a roster has been downgraded to non-hop.
for (const surface of surfaceGraph.surfaces) {
  const source = data.surfaces.find(s => s.surface_id === surface.surface_id);
  assert(source, `compiled surface ${surface.surface_id} is missing from the ledger`);
  assert(surface.hop_eligible === source?.hop_eligible,
    `compiled surface ${surface.surface_id} hop_eligible is stale (${surface.hop_eligible} != ledger ${source?.hop_eligible})`);
  checkDensity(surface, surface.participants ?? [], 'compiled');
}

// Every hop must carry its surface basis.
for (const edge of hopGraph.edges) {
  assert(edge.actor_a && edge.actor_b, `hop edge missing actor ids: ${JSON.stringify(edge)}`);
  assert(edge.actor_a !== edge.actor_b, `hop edge must connect two distinct actors, got self-hop ${edge.actor_a}`);
  assert(edge.surfaces?.length > 0, `hop ${edge.actor_a}/${edge.actor_b} lacks shared surfaces`);
  for (const basis of edge.surfaces) {
    const surface = surfaceById.get(basis.surface_id);
    assert(surface, `hop basis references missing surface ${basis.surface_id}`);
    assert(surface?.hop_eligible === true, `hop basis ${basis.surface_id} is not hop eligible`);
    const parts = surface?.participants ?? [];
    assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a), `hop basis ${basis.surface_id} lacks participant ${edge.actor_a}`);
    assert(parts.some(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b), `hop basis ${basis.surface_id} lacks participant ${edge.actor_b}`);
    assert(basis.receipt_ids?.length > 0, `hop basis ${basis.surface_id} lacks receipts`);

    // Temporal integrity: every basis carries a status, and a dated basis
    // must fall within the intersection of the surface and both participation
    // windows — never assert co-presence outside every source's own window.
    assert(typeof basis.temporal_status === 'string', `hop basis ${basis.surface_id} lacks temporal_status`);
    const partsA = (surface?.participants ?? []).filter(p => p.participant_type === 'actor' && p.actor_id === edge.actor_a);
    const partsB = (surface?.participants ?? []).filter(p => p.participant_type === 'actor' && p.actor_id === edge.actor_b);
    const surfaceWindow = windowOf(surface);
    const expectedWindows = [];
    for (const partA of partsA) {
      for (const partB of partsB) {
        const aWindow = windowOf(partA);
        const bWindow = windowOf(partB);
        const expected = intersectAll([
          surfaceWindow.dated ? surfaceWindow : UNBOUNDED,
          aWindow.dated ? aWindow : UNBOUNDED,
          bWindow.dated ? bWindow : UNBOUNDED,
        ]);
        if (expected !== null) expectedWindows.push({
          ...expected,
          temporal_status: aWindow.dated && bWindow.dated ? 'dated'
            : aWindow.dated || bWindow.dated ? 'partially_dated'
            : surfaceWindow.dated ? 'surface_window_only' : 'undated',
        });
      }
    }
    const matchesAStintPair = expectedWindows.some(expected =>
      (basis.valid_from ?? null) === (expected.valid_from ?? null)
      && (basis.valid_until ?? null) === (expected.valid_until ?? null)
      && basis.temporal_status === expected.temporal_status);
    assert(matchesAStintPair,
      `hop basis ${basis.surface_id} window/status does not match any participation-stint pair for ${edge.actor_a}/${edge.actor_b}`);
  }
}

// No hop basis may assert co-presence across disjoint dated windows: every
// rejected pair the builder recorded must genuinely have an empty intersection.
for (const pair of hopGraph.rejected_hop_pairs ?? []) {
  assert(pair.reason?.startsWith('no_temporal_overlap'), `rejected pair ${pair.surface_id} has unexpected reason ${pair.reason}`);
  assert(pair.actor_a !== pair.actor_b, `rejected hop pair must name distinct actors, got ${pair.actor_a}/${pair.actor_b}`);
  const sourceSurface = surfaceById.get(pair.surface_id);
  assert(sourceSurface, `rejected pair references missing surface ${pair.surface_id}`);
  const actorAParts = (sourceSurface?.participants ?? []).filter(part => part.participant_type === 'actor' && part.actor_id === pair.actor_a);
  const actorBParts = (sourceSurface?.participants ?? []).filter(part => part.participant_type === 'actor' && part.actor_id === pair.actor_b);
  const sourceSurfaceWindow = sourceSurface ? windowOf(sourceSurface) : null;
  const matchingSource = actorAParts.flatMap(actorAPart => actorBParts.map(actorBPart => ({ actorAPart, actorBPart }))).find(({ actorAPart, actorBPart }) => {
    const actorAWindow = windowOf(actorAPart);
    const actorBWindow = windowOf(actorBPart);
    const overlap = intersectAll([
      sourceSurfaceWindow?.dated ? sourceSurfaceWindow : UNBOUNDED,
      actorAWindow.dated ? actorAWindow : UNBOUNDED,
      actorBWindow.dated ? actorBWindow : UNBOUNDED,
    ]);
    return overlap === null
      && sameWindow(pair.actor_a_window, actorAWindow)
      && sameWindow(pair.actor_b_window, actorBWindow)
      && sameWindow(pair.surface_window, sourceSurfaceWindow);
  });
  assert(matchingSource,
    `rejected pair ${pair.actor_a}/${pair.actor_b} on ${pair.surface_id} disagrees with its source participant windows`);
  if (matchingSource) {
    assert(sameIdSet(pair.actor_a_receipt_ids, matchingSource.actorAPart.receipt_ids),
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_a receipts disagree with source participant ${pair.actor_a}`);
    assert(sameIdSet(pair.actor_b_receipt_ids, matchingSource.actorBPart.receipt_ids),
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_b receipts disagree with source participant ${pair.actor_b}`);
    assert(sameIdSet(pair.surface_receipt_ids, sourceSurface.receipt_ids),
      `rejected pair ${pair.actor_a}/${pair.actor_b} surface receipts disagree with ${pair.surface_id}`);
    assert(sameIdSet(pair.receipt_ids, [
      ...(sourceSurface.receipt_ids ?? []),
      ...(matchingSource.actorAPart.receipt_ids ?? []),
      ...(matchingSource.actorBPart.receipt_ids ?? []),
    ]), `rejected pair ${pair.actor_a}/${pair.actor_b} combined receipts are incomplete`);
    const actorAWindowReverifiable = (matchingSource.actorAPart.receipt_ids ?? [])
      .some(receiptId => receiptSupportsPublishedWindow(receiptById.get(receiptId)));
    const actorBWindowReverifiable = (matchingSource.actorBPart.receipt_ids ?? [])
      .some(receiptId => receiptSupportsPublishedWindow(receiptById.get(receiptId)));
    const expectedPublicationStatus = actorAWindowReverifiable && actorBWindowReverifiable ? 'verified' : 'review_required';
    assert(pair.actor_a_window_reverifiable === actorAWindowReverifiable,
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_a reverifiability is stale`);
    assert(pair.actor_b_window_reverifiable === actorBWindowReverifiable,
      `rejected pair ${pair.actor_a}/${pair.actor_b} actor_b reverifiability is stale`);
    assert(pair.publication_status === expectedPublicationStatus,
      `rejected pair ${pair.actor_a}/${pair.actor_b} publication status must be ${expectedPublicationStatus}`);
    if (pair.publication_status === 'verified') {
      assert(actorAWindowReverifiable && actorBWindowReverifiable,
        `verified rejected pair ${pair.actor_a}/${pair.actor_b} lacks direct re-verifiable actor-window receipts`);
    }
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
for (const sid of ['electric-twin-founder-2023', 'electric-twin-ethics-board-2026', 'electric-twin-seed-round-2026-02-11', 'electric-twin-ben-blume-director-appointment-2025-09-12', 'electric-twin-newsuk-synthetic-audience', 'gartner-synthetic-population-category-2026']) {
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

// Temporal identity layer (provisional AXM ids). The artifact must be a
// deterministic function of the ledger — recompute it and require exact
// agreement — and must carry its provisional caveat, so a stale or hand-edited
// artifact, or one silently stripped of the caveat, fails the release.
{
  const identity = readJson('build/axm-identity.json');
  assert(identity.scheme?.status === 'provisional', 'axm-identity scheme.status must remain "provisional" until reconciled against axm-genesis');
  assert(identity.scheme?.namespace === readJson('cases.json').default_case_id, `axm-identity namespace ${identity.scheme?.namespace} does not match the default case id`);
  const recomputed = buildIdentityLayer({
    namespace: readJson('cases.json').default_case_id,
    actors: data.actors,
    organizations: data.organizations,
    surfaces: data.surfaces,
    participation: data.participation,
    aliases: data.aliases,
  });
  assert(JSON.stringify({ scheme: identity.scheme, entities: identity.entities, claims: identity.claims }) === JSON.stringify(recomputed),
    'build/axm-identity.json does not match the identity layer recomputed from the ledger — rebuild (npm run build:hops)');
  const idRe = /^e_[a-z2-7]{24}$/;
  for (const e of identity.entities) assert(idRe.test(e.axm_entity_id), `entity ${e.local_id} has malformed axm id ${e.axm_entity_id}`);
  for (const c of identity.claims) {
    assert(/^c_[a-z2-7]{24}$/.test(c.claim_id), `claim ${c.claim_id} is malformed`);
    assert(c.windows.length > 0, `claim ${c.claim_id} carries no temporal windows`);
    for (const w of c.windows) {
      assert(w.dated === Boolean(w.valid_from || w.valid_until), `claim ${c.claim_id} window dated flag disagrees with its bounds`);
    }
  }
  // Identity is time-stable: one claim per (subj, obj), stints as windows.
  const pairs = new Set(identity.claims.map(c => `${c.subj}||${c.obj}`));
  assert(pairs.size === identity.claims.length, 'duplicate (subj, obj) participates_in claims — stints must be windows on one claim');
}

// Full-database migration is required, not optional.
assert(migration.total_rows > 200, `migration parsed too few master rows: ${migration.total_rows}`);
assert(migration.bucket_counts?.participation_claim > 50, 'migration did not classify enough participation claims from master doc');

// Receipt archival gate (BUILD-INSTRUCTIONS 2.5). Missing archive references
// warn before the cutoff and fail on/after it; a stale in-repo content hash
// fails immediately.
{
  const { errors: archivalErrors, warnings: archivalWarnings } = checkReceiptArchival(data.receipts, { today: todayString() });
  for (const err of archivalErrors) errors.push(err);
  for (const warn of archivalWarnings) warnings.push(warn);
}

// Place-centered field-autopsy bundles preserve untrusted intake as expression
// only, keep hypotheses graph-inert, and require provenance for searched states.
{
  const caseRoot = path.join(root, 'cases');
  for (const entry of fs.readdirSync(caseRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(caseRoot, entry.name);
    if (!isFieldAutopsyCase(dir)) continue;
    for (const err of validateFieldAutopsy(loadFieldAutopsy(dir))) {
      errors.push(`field-autopsy ${entry.name}: ${err}`);
    }
  }
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

console.log('validate-release: OK');
console.log(`  surfaces: ${data.surfaces.length}`);
console.log(`  hop edges: ${hopGraph.edges.length}`);
console.log(`  master rows classified: ${migration.total_rows}`);
