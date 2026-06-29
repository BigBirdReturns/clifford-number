#!/usr/bin/env node
import { loadAll, readJson, writeJson, evidenceWeight, uniq } from './lib/ledger.mjs';

const data = loadAll();
const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');

const partsByActor = new Map();
const partsByOrg = new Map();
const surfaceById = new Map(surfaceGraph.surfaces.map(s => [s.surface_id, s]));

for (const surface of surfaceGraph.surfaces) {
  for (const p of surface.participants ?? []) {
    if (p.participant_type === 'actor') {
      if (!partsByActor.has(p.actor_id)) partsByActor.set(p.actor_id, []);
      partsByActor.get(p.actor_id).push({ surface, participation: p });
    }
    if (p.participant_type === 'organization') {
      if (!partsByOrg.has(p.organization_id)) partsByOrg.set(p.organization_id, []);
      partsByOrg.get(p.organization_id).push({ surface, participation: p });
    }
  }
}

const privateTypes = new Set(['employment_investment_surface', 'founder_officer_surface', 'customer_vendor_surface', 'category_formation_surface']);
const govTypes = new Set(['government_advisory_surface', 'policy_document_surface', 'procurement_contract_surface', 'public_private_fund_surface']);
const governanceSecondary = new Set(['democratic_input_replacement', 'model_governance_surface', 'governance_continuity_surface', 'policy_to_procurement_surface']);

// Laundering-chain stage vocabulary. A chain spanning many of these expresses
// actor-agnostic outcome transfer (policy -> procurement -> personnel -> commercialization).
// This is deliberately SEPARATE from the Clifford Number: a chain never creates a hop.
const STAGE_CATEGORIES = ['policy_creation', 'procurement_capture', 'personnel_continuity', 'commercial_deployment', 'category_formation'];
const STAGE_MAX = STAGE_CATEGORIES.length;

const chains = data.chains ?? [];
const partsBySurface = new Map();
for (const surface of surfaceGraph.surfaces) partsBySurface.set(surface.surface_id, surface.participants ?? []);

// Which actors / orgs does each chain touch (anchor a stage, or participate in a stage surface)?
function chainTouches(chain) {
  const actors = new Set();
  const orgs = new Set();
  for (const stage of chain.stages ?? []) {
    if (stage.actor_id) actors.add(stage.actor_id);
    if (stage.organization_id) orgs.add(stage.organization_id);
    for (const p of partsBySurface.get(stage.surface_id) ?? []) {
      if (p.participant_type === 'actor') actors.add(p.actor_id);
      if (p.participant_type === 'organization') orgs.add(p.organization_id);
    }
  }
  return { actors, orgs };
}
const chainTouchIndex = chains.map(c => ({ chain: c, touch: chainTouches(c), categories: uniq((c.stages ?? []).map(s => s.stage_category)) }));

function launderingChain(kind, id) {
  let best = 0;
  const touched = [];
  for (const entry of chainTouchIndex) {
    const set = kind === 'actor' ? entry.touch.actors : entry.touch.orgs;
    if (set.has(id)) { best = Math.max(best, entry.categories.length); touched.push(entry.chain.chain_id); }
  }
  return { score: best, chains: touched };
}

// Surface-type recurrence: which surface types (primary or secondary) recur across an
// entity's surfaces. The same governance logic in unrelated venues is a pattern signal,
// not a hop.
function surfaceTypeRecurrence(surfaces) {
  const byType = {};
  for (const s of surfaces) {
    for (const t of uniq([s.surface_type, ...(s.secondary_surface_types ?? [])])) {
      (byType[t] ??= []).push(s.surface_id);
    }
  }
  const recurring = {};
  let score = 0;
  for (const [t, sids] of Object.entries(byType)) {
    if (sids.length > 1) { recurring[t] = sids; score += sids.length; }
  }
  return { recurring, score };
}

function yearish(v) {
  const m = String(v ?? '').match(/(20\d{2}|19\d{2})/);
  return m ? Number(m[1]) : null;
}

function scoreActor(actor) {
  const entries = partsByActor.get(actor.id) ?? [];
  const surfaces = entries.map(e => e.surface);
  const typeSet = new Set(surfaces.map(s => s.surface_type));
  const secondaryTypes = surfaces.flatMap(s => s.secondary_surface_types ?? []);
  const secondarySet = new Set(secondaryTypes);
  const years = surfaces.flatMap(s => [yearish(s.time_start), yearish(s.time_end)]).filter(Boolean);
  const receipts = uniq(surfaces.flatMap(s => s.receipt_ids ?? []));
  const evidenceClasses = entries.map(e => e.participation.evidence_class).filter(Boolean);
  const shortest = hopGraph.shortest_paths[actor.id] ?? { number: null, actor_path: [], hops: [] };

  const hasGov = surfaces.some(s => govTypes.has(s.surface_type));
  const hasPrivate = surfaces.some(s => privateTypes.has(s.surface_type));
  const hasModelGov = secondaryTypes.some(t => governanceSecondary.has(t));
  const hasPublicPrivate = surfaces.some(s => s.surface_type === 'public_private_fund_surface' || (s.secondary_surface_types ?? []).includes('policy_to_procurement_surface'));

  const deniability =
    surfaces.filter(s => s.scorable).length +
    (hasGov && hasPrivate ? 2 : 0) +
    (hasModelGov ? 2 : 0) +
    (shortest.number !== null && shortest.number > 1 ? 1 : 0);

  const laundry =
    (hasGov ? 1 : 0) +
    (hasPrivate ? 1 : 0) +
    (hasPublicPrivate ? 2 : 0) +
    surfaces.filter(s => s.surface_type === 'customer_vendor_surface').length +
    surfaces.filter(s => s.surface_type === 'employment_investment_surface').length;

  const recurrenceCounts = {};
  for (const t of secondaryTypes) recurrenceCounts[t] = (recurrenceCounts[t] ?? 0) + 1;
  const recurrence = Object.values(recurrenceCounts).filter(n => n > 1).reduce((a, b) => a + b, 0);

  const governanceReplacement = surfaces.filter(s => (s.secondary_surface_types ?? []).includes('democratic_input_replacement')).length;
  const chain = launderingChain('actor', actor.id);
  const typeRecurrence = surfaceTypeRecurrence(surfaces);

  // machine_raw aggregates the structural dimensions that survive WITHOUT a hop.
  // It is normalized to 0..1 across all scored entities in a second pass.
  const machineRaw =
    laundry +
    governanceReplacement +
    typeRecurrence.score +
    chain.score +
    Math.min(surfaces.length, 5);

  return {
    actor_id: actor.id,
    label: actor.label,
    clifford_number: shortest.number,
    shortest_path: shortest,
    surface_density: surfaces.length,
    surface_diversity: typeSet.size,
    secondary_surface_types: [...secondarySet].sort(),
    deniability_score: deniability,
    laundry_score: laundry,
    governance_replacement_score: governanceReplacement,
    temporal_depth: years.length ? Math.max(...years) - Math.min(...years) : 0,
    recurrence_score: recurrence,
    surface_type_recurrence: typeRecurrence.recurring,
    surface_type_recurrence_score: typeRecurrence.score,
    laundering_chain_score: chain.score,
    laundering_chain_max: STAGE_MAX,
    chains: chain.chains,
    machine_raw: machineRaw,
    receipt_strength: evidenceClasses.length ? Math.min(...evidenceClasses.map(evidenceWeight)) : null,
    why_no_hop: shortest.number === null
      ? 'No bounded surface carries shared co-participation on a valid hop path to Matt Clifford. This actor can still hold surfaces, recurrence, and laundering-chain position. Absence of a hop is not absence of structural relevance.'
      : null,
    surfaces: surfaces.map(s => s.surface_id),
    receipt_ids: receipts,
  };
}

function scoreOrganization(org) {
  const entries = partsByOrg.get(org.id) ?? [];
  const surfaces = entries.map(e => e.surface);
  const secondaryTypes = surfaces.flatMap(s => s.secondary_surface_types ?? []);
  const factoryScore = surfaces.length + secondaryTypes.length;
  const chain = launderingChain('org', org.id);
  const typeRecurrence = surfaceTypeRecurrence(surfaces);
  const machineRaw = typeRecurrence.score + chain.score + Math.min(surfaces.length, 5);
  return {
    organization_id: org.id,
    label: org.label,
    kind: org.kind,
    surface_factory: Boolean(org.surface_factory || surfaces.length >= 3),
    surface_count: surfaces.length,
    surface_types: uniq(surfaces.map(s => s.surface_type)).sort(),
    secondary_surface_types: uniq(secondaryTypes).sort(),
    factory_score: factoryScore,
    laundering_chain_score: chain.score,
    laundering_chain_max: STAGE_MAX,
    chains: chain.chains,
    machine_raw: machineRaw,
    surfaces: surfaces.map(s => s.surface_id),
  };
}

function scoreChain(chain) {
  const categories = uniq((chain.stages ?? []).map(s => s.stage_category));
  const stageSurfaces = uniq((chain.stages ?? []).map(s => s.surface_id));
  const receipts = uniq((chain.stages ?? []).flatMap(s => s.receipt_ids ?? []));
  // Weakest evidence across the stages governs the chain's evidence posture.
  const stageEvidence = stageSurfaces
    .map(sid => surfaceById.get(sid))
    .flatMap(s => (s?.participants ?? []).map(p => p.evidence_class))
    .filter(Boolean);
  const evidenceClass = stageEvidence.length
    ? stageEvidence.sort((a, b) => evidenceWeight(b) - evidenceWeight(a))[0]
    : 'reported';
  // A chain MUST NOT manufacture a Clifford hop. Its dedicated connector surfaces
  // (type laundering_chain_connector) are non-hop by construction. Individual stages may
  // reuse surfaces that legitimately create their OWN local hops (e.g. the No. 10 surface
  // hops Warner<->Cummings), but no surface spans the chain to create a Clifford hop.
  const stageSurfaceObjs = stageSurfaces.map(sid => surfaceById.get(sid)).filter(Boolean);
  const connectorSurfacesAllNonHop = stageSurfaceObjs
    .filter(s => s.surface_type === 'laundering_chain_connector')
    .every(s => s.hop_eligible === false);
  const machineRaw = categories.length * 2 + (chain.stages ?? []).length;
  return {
    chain_id: chain.chain_id,
    chain_label: chain.chain_label,
    pattern: chain.pattern,
    clifford_number: null,
    laundering_chain_score: categories.length,
    laundering_chain_max: STAGE_MAX,
    stage_categories: categories,
    chain_length: (chain.stages ?? []).length,
    stages: (chain.stages ?? []).map(s => ({
      order: s.order,
      stage_category: s.stage_category,
      surface_id: s.surface_id,
      surface_label: surfaceById.get(s.surface_id)?.surface_label ?? s.surface_id,
      actor_id: s.actor_id ?? null,
      organization_id: s.organization_id ?? null,
      receipt_ids: s.receipt_ids ?? [],
      note: s.note ?? '',
    })),
    surfaces: stageSurfaces,
    receipt_ids: receipts,
    evidence_class: evidenceClass,
    machine_raw: machineRaw,
    connector_surfaces_all_non_hop: connectorSurfacesAllNonHop,
    why_no_hop: chain.why_no_hop ?? 'This chain expresses structural position only. It is connected by lineage and corridor, not by shared bounded co-participation, and never creates a Clifford Number hop.',
  };
}

const actorScores = data.actors.map(scoreActor);
const orgScores = data.organizations.map(scoreOrganization);
const chainScores = chains.map(scoreChain);

// Normalize machine_score to 0..1 across every scored entity so actors, orgs, and
// chains are comparable on the same "how embedded in the machine" axis.
const allRaw = [...actorScores, ...orgScores, ...chainScores].map(x => x.machine_raw ?? 0);
const maxRaw = Math.max(1, ...allRaw);
function attachMachineScore(x) { x.machine_score = Math.round((x.machine_raw ?? 0) / maxRaw * 100) / 100; return x; }
actorScores.forEach(attachMachineScore);
orgScores.forEach(attachMachineScore);
chainScores.forEach(attachMachineScore);

const scores = {
  generated: new Date().toISOString(),
  rule: 'Scores are generated from source ledgers and generated hop graph. Do not edit this file by hand.',
  machine_score_note: 'machine_score is normalized 0..1 relative to the most structurally embedded entity. laundering_chain_score and surface_type_recurrence are independent of the Clifford Number: an entity can have a high chain/machine score and no hop (clifford_number null). That is structural position, not guilt by association.',
  actors: actorScores,
  organizations: orgScores,
  chains: chainScores,
};

writeJson('build/scores.json', scores);
console.log(`score-deniability: ${scores.actors.length} actors, ${scores.organizations.length} organizations, ${scores.chains.length} chains scored.`);
