import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root } from './ledger.mjs';

// Field-autopsy extension to case-ledger@1: a place-centered case bundle that
// preserves an untrusted conversation intake, re-derives its factual claims
// against independent receipts, and keeps interpretive material permanently
// out of the canonical graph. See docs/field-autopsy.md.

export const EVIDENCE_STATES = new Set([
  'observed',
  'self_claimed',
  'reported',
  'official_record',
  'corroborated',
  'inferred',
  'interpretive_hypothesis',
  'disputed',
  'unavailable_after_search',
  'not_searched',
  'partially_searched',
]);

export const SEARCH_DEPENDENT_STATES = new Set([
  'unavailable_after_search',
  'partially_searched',
]);

export const GRAPH_EFFECTS = new Set(['none', 'context', 'edge']);

export const ENTITY_TYPES = new Set([
  'person',
  'organization',
  'government_body',
  'parcel_site',
  'infrastructure_system',
  'geological_system',
  'professional_role',
  'development_project',
  'governance_vehicle',
]);

// Edge types that assert documented coordination or control. These are the
// only edge types allowed to carry graph_effect "edge", and they demand a
// material basis plus a strong evidence state.
export const COORDINATION_EDGE_TYPES = new Set([
  'coordination',
  'control',
  'contractual_relationship',
  'ownership_transfer',
  'governance_role',
  'professional_engagement',
]);

// Context-only edge types. Alignment, adjacency, or shared incentives never
// become coordination; they stay context or below.
export const CONTEXT_EDGE_TYPES = new Set([
  'structural_alignment',
  'spatial_context',
  'temporal_context',
  'shared_incentive',
]);

export const MATERIAL_BASES = new Set([
  'contract',
  'deed_or_filing',
  'corporate_registration',
  'governance_record',
  'official_publication',
  'source_explicit_statement',
]);

export const NON_MATERIAL_BASES = new Set([
  'alignment',
  'spatial_correlation',
  'temporal_coincidence',
  'shared_professional_market',
]);

export const CLAIM_KINDS = new Set(['external_fact', 'expression']);

export const CONTRADICTION_STATUSES = new Set(['confirmed', 'corrected', 'rejected', 'unresolved']);

export const TRAIL_STATUSES = new Set([
  'open',
  'in_progress',
  'terminal_confirmed',
  'terminal_rejected',
  'terminal_unavailable',
]);

// Language that has no business inside a terminal state or a completeness
// label. Terminal means terminal; partial means partial.
export const CONTINUATION_LANGUAGE = /\b(next step|follow[- ]?up|to ?do|continue|continuing|pending|will (search|check|verify|revisit)|remaining work)\b/i;
export const COMPLETION_LANGUAGE = /\b(complete|closed|exhausted|exhaustive|fully searched|nothing (more|further)|identity unresolved after search)\b/i;

// Predicates and edge types that would encode a prohibited inference if they
// ever reached the graph. Preserved hypotheses may discuss these ideas in
// prose; no graph-effective row may be typed with them.
export const PROHIBITED_INFERENCE = /\b(occult|supernatural|ethnic|racial|cabal|conspirac|mastermind|wrongful)\b/i;

export const REQUIRED_REGIMES = [
  'regime-indigenous-tongva',
  'regime-mission-rancho',
  'regime-baldwin',
  'regime-subdivision-interwar',
  'regime-turf-club',
  'regime-wartime-federal',
  'regime-postwar-suburban',
  'regime-redevelopment-rail-planning',
  'regime-assessment-district',
  'regime-acquisition-assembly',
  'regime-station-opening',
  'regime-entitlement-construction',
  'regime-street-reconstruction',
];

const EXTENSION_FILES = {
  intake: 'intake.json',
  chronology: 'chronology.json',
  frontier: 'frontier.json',
};

const EXTENSION_LEDGERS = {
  observations: 'observations.jsonl',
  hypotheses: 'hypotheses.jsonl',
  entities: 'entities.jsonl',
  edges: 'edges.jsonl',
  searches: 'searches.jsonl',
  rejectedJoins: 'rejected-joins.jsonl',
  contradictions: 'contradictions.jsonl',
  coverage: 'coverage.jsonl',
  trails: 'trails.jsonl',
};

export function isFieldAutopsyCase(caseDirectory) {
  return fs.existsSync(path.join(caseDirectory, EXTENSION_FILES.intake));
}

export function loadFieldAutopsy(caseDirectory) {
  const rel = path.relative(root, caseDirectory).replaceAll('\\', '/');
  const bundle = {};
  for (const [key, file] of Object.entries(EXTENSION_FILES)) bundle[key] = readJson(`${rel}/${file}`);
  for (const [key, file] of Object.entries(EXTENSION_LEDGERS)) bundle[key] = readJsonl(`${rel}/${file}`);
  bundle.receipts = readJsonl(`${rel}/receipts.jsonl`);
  bundle.claims = readJsonl(`${rel}/claims.jsonl`);
  bundle.events = readJsonl(`${rel}/events.jsonl`);
  return bundle;
}

function index(rows, key, errors, owner) {
  const out = new Map();
  for (const row of rows ?? []) {
    if (!row[key]) errors.push(`${owner}: record missing ${key}`);
    else if (out.has(row[key])) errors.push(`${owner}: duplicate ${key} ${row[key]}`);
    else out.set(row[key], row);
  }
  return out;
}

function yearOf(value) {
  const match = /^(\d{4})/.exec(String(value ?? ''));
  return match ? Number(match[1]) : null;
}

export function validateFieldAutopsy(bundle) {
  const errors = [];
  const receipts = index(bundle.receipts, 'receipt_id', errors, 'receipts');
  const claims = index(bundle.claims, 'claim_id', errors, 'claims');
  const observations = index(bundle.observations, 'observation_id', errors, 'observations');
  const hypotheses = index(bundle.hypotheses, 'hypothesis_id', errors, 'hypotheses');
  const entities = index(bundle.entities, 'entity_id', errors, 'entities');
  index(bundle.edges, 'edge_id', errors, 'edges');
  const searches = index(bundle.searches, 'search_id', errors, 'searches');
  index(bundle.rejectedJoins, 'rejected_id', errors, 'rejected-joins');
  const contradictions = index(bundle.contradictions, 'contradiction_id', errors, 'contradictions');
  index(bundle.coverage, 'coverage_id', errors, 'coverage');
  const trails = index(bundle.trails, 'trail_id', errors, 'trails');

  // --- Intake: the conversation is provenance for expressions, never an
  // external-fact receipt. -------------------------------------------------
  const intake = bundle.intake ?? {};
  if (!intake.intake_id || !intake.received_at || !intake.boundary) {
    errors.push('intake must carry intake_id, received_at, and boundary text');
  }
  if (intake.establishes !== 'expression_only') {
    errors.push('intake.establishes must be "expression_only" — a conversation is not a receipt for external facts');
  }
  const conversationReceiptIds = new Set(
    (bundle.receipts ?? []).filter(r => r.source_type === 'conversation_artifact').map(r => r.receipt_id));
  if (conversationReceiptIds.size === 0) {
    errors.push('the conversation intake must be preserved as a conversation_artifact receipt');
  }

  for (const claim of bundle.claims ?? []) {
    if (!CLAIM_KINDS.has(claim.claim_kind)) {
      errors.push(`claim ${claim.claim_id} must declare claim_kind external_fact or expression`);
      continue;
    }
    const ids = claim.receipt_ids ?? [];
    const nonConversation = ids.filter(id => !conversationReceiptIds.has(id));
    if (claim.claim_kind === 'external_fact') {
      if (nonConversation.length === 0) {
        errors.push(`external-fact claim ${claim.claim_id} rests only on the conversation artifact — the conversation establishes expression, not fact`);
      }
      if (claim.evidence_state && !EVIDENCE_STATES.has(claim.evidence_state)) {
        errors.push(`claim ${claim.claim_id} has unknown evidence_state ${claim.evidence_state}`);
      }
    }
    if (claim.claim_kind === 'expression' && !ids.some(id => conversationReceiptIds.has(id))) {
      errors.push(`expression claim ${claim.claim_id} must cite the conversation intake receipt`);
    }
    // Source-specific counts: a numeric assertion names the receipt that
    // itself states the number. Another source's receipt cannot carry it.
    if (/(_count|_amount|_rate)$/.test(claim.predicate ?? '')) {
      if (!claim.count_source_receipt_id) {
        errors.push(`count claim ${claim.claim_id} must name count_source_receipt_id`);
      } else if (!ids.includes(claim.count_source_receipt_id)) {
        errors.push(`count claim ${claim.claim_id} count_source_receipt_id is not among its own receipts`);
      }
    }
    if (claim.evidence_state === 'interpretive_hypothesis') {
      if (claim.graph_effect !== 'none') errors.push(`interpretive claim ${claim.claim_id} must carry graph_effect none`);
      if (claim.claim_status === 'verified') errors.push(`interpretive claim ${claim.claim_id} can never be verified`);
    }
  }

  // --- Observations: preserved verbatim-in-substance, graph-inert. --------
  for (const row of bundle.observations ?? []) {
    if (row.graph_effect !== 'none') errors.push(`observation ${row.observation_id} must carry graph_effect none`);
    if (row.intake_id !== intake.intake_id) errors.push(`observation ${row.observation_id} does not reference the intake record`);
    if (!['observed', 'self_claimed'].includes(row.evidence_state)) {
      errors.push(`observation ${row.observation_id} must be observed or self_claimed, got ${row.evidence_state}`);
    }
    if (!CONTRADICTION_STATUSES.has(row.disposition) && row.disposition !== 'interpretive') {
      errors.push(`observation ${row.observation_id} has unknown disposition ${row.disposition}`);
    }
  }

  // --- Hypotheses: preserved, searchable, and permanently graph-inert. ----
  for (const row of bundle.hypotheses ?? []) {
    if (row.evidence_state !== 'interpretive_hypothesis') {
      errors.push(`hypothesis ${row.hypothesis_id} must carry evidence_state interpretive_hypothesis`);
    }
    if (row.graph_effect !== 'none') errors.push(`hypothesis ${row.hypothesis_id} must carry graph_effect none`);
    for (const id of row.observation_ids ?? []) {
      if (!observations.has(id)) errors.push(`hypothesis ${row.hypothesis_id} references missing observation ${id}`);
    }
    for (const id of row.mechanism_search_ids ?? []) {
      if (!searches.has(id)) errors.push(`hypothesis ${row.hypothesis_id} references missing search ${id}`);
    }
  }
  const hypothesisIds = new Set(hypotheses.keys());
  for (const event of bundle.events ?? []) {
    for (const id of event.claim_ids ?? []) {
      if (hypothesisIds.has(id)) errors.push(`event ${event.event_id} lifts hypothesis ${id} into the event graph`);
    }
  }

  // --- Entities: every named person resolves to a receipt or is demoted. --
  for (const row of bundle.entities ?? []) {
    if (!ENTITY_TYPES.has(row.entity_type)) errors.push(`entity ${row.entity_id} has unknown entity_type ${row.entity_type}`);
    if (!row.label) errors.push(`entity ${row.entity_id} lacks a label`);
    if (row.evidence_state && !EVIDENCE_STATES.has(row.evidence_state)) {
      errors.push(`entity ${row.entity_id} has unknown evidence_state ${row.evidence_state}`);
    }
    const receiptIds = row.receipt_ids ?? [];
    for (const id of receiptIds) if (!receipts.has(id)) errors.push(`entity ${row.entity_id} references missing receipt ${id}`);
    if (row.entity_type === 'person' && row.unresolved !== true) {
      const resolving = receiptIds.filter(id => receipts.has(id) && !conversationReceiptIds.has(id));
      if (resolving.length === 0) {
        errors.push(`named person ${row.entity_id} lacks a resolving non-conversation receipt — demote to unresolved candidate`);
      }
    }
    for (const role of row.roles ?? []) {
      if (!role.role) errors.push(`entity ${row.entity_id} has a role without a role label`);
      if (!role.regime_id) errors.push(`entity ${row.entity_id} role "${role.role}" lacks a regime_id — "connected to the place" is not a predicate`);
      if (!(role.receipt_ids?.length > 0) && row.unresolved !== true) {
        errors.push(`entity ${row.entity_id} role "${role.role}" lacks receipts`);
      }
    }
  }

  // --- Edges: alignment alone is never coordination. -----------------------
  for (const row of bundle.edges ?? []) {
    if (!entities.has(row.from) || !entities.has(row.to)) {
      errors.push(`edge ${row.edge_id} references missing entities ${row.from}/${row.to}`);
    }
    if (!GRAPH_EFFECTS.has(row.graph_effect)) errors.push(`edge ${row.edge_id} has unknown graph_effect ${row.graph_effect}`);
    if (!EVIDENCE_STATES.has(row.evidence_state)) errors.push(`edge ${row.edge_id} has unknown evidence_state ${row.evidence_state}`);
    if (!row.regime_id) errors.push(`edge ${row.edge_id} lacks a regime_id`);
    const coordination = COORDINATION_EDGE_TYPES.has(row.edge_type);
    const context = CONTEXT_EDGE_TYPES.has(row.edge_type);
    if (!coordination && !context) errors.push(`edge ${row.edge_id} has unknown edge_type ${row.edge_type}`);
    if (coordination) {
      if (!MATERIAL_BASES.has(row.basis)) {
        errors.push(`coordination-class edge ${row.edge_id} requires a material basis, got "${row.basis}" — alignment alone is not coordination`);
      }
      // Graph-effective coordination demands the strongest evidence. A
      // documented but single-source role assertion may exist as context,
      // never as a graph edge. The strongest predicates (coordination,
      // control) demand strong evidence at any graph effect.
      const strong = ['official_record', 'corroborated'].includes(row.evidence_state);
      if (row.graph_effect === 'edge' && !strong) {
        errors.push(`coordination-class edge ${row.edge_id} requires official_record or corroborated evidence, got ${row.evidence_state}`);
      }
      if (['coordination', 'control'].includes(row.edge_type) && !strong) {
        errors.push(`coordination-class edge ${row.edge_id} requires official_record or corroborated evidence, got ${row.evidence_state}`);
      }
      if (!strong && !['reported', 'self_claimed'].includes(row.evidence_state)) {
        errors.push(`coordination-class edge ${row.edge_id} has evidence_state ${row.evidence_state}, which cannot carry a role or transaction assertion`);
      }
      if (!(row.receipt_ids?.length > 0)) errors.push(`coordination-class edge ${row.edge_id} lacks receipts`);
      const nonConversation = (row.receipt_ids ?? []).filter(id => !conversationReceiptIds.has(id));
      if ((row.receipt_ids?.length ?? 0) > 0 && nonConversation.length === 0) {
        errors.push(`coordination-class edge ${row.edge_id} rests only on the conversation artifact`);
      }
    }
    if (context && row.graph_effect === 'edge') {
      errors.push(`context edge ${row.edge_id} may not carry graph_effect edge`);
    }
    if (NON_MATERIAL_BASES.has(row.basis) && row.graph_effect === 'edge') {
      errors.push(`edge ${row.edge_id} with basis ${row.basis} may not reach the graph`);
    }
    if (row.evidence_state === 'interpretive_hypothesis' && row.graph_effect !== 'none') {
      errors.push(`interpretive edge ${row.edge_id} must carry graph_effect none`);
    }
    if (PROHIBITED_INFERENCE.test(`${row.edge_type} ${row.basis ?? ''}`)) {
      errors.push(`edge ${row.edge_id} encodes a prohibited inference class in its type or basis`);
    }
    for (const id of row.receipt_ids ?? []) if (!receipts.has(id)) errors.push(`edge ${row.edge_id} references missing receipt ${id}`);
  }
  for (const claim of bundle.claims ?? []) {
    if ((claim.graph_effect ?? 'none') !== 'none' && PROHIBITED_INFERENCE.test(claim.predicate ?? '')) {
      errors.push(`claim ${claim.claim_id} encodes a prohibited inference class in a graph-effective predicate`);
    }
  }

  // --- Searches and coverage: _after_search demands provenance; partial is
  // never labeled complete. -------------------------------------------------
  for (const row of bundle.searches ?? []) {
    if (!row.query || !row.domain_or_database || !row.timestamp) {
      errors.push(`search ${row.search_id} lacks query, domain_or_database, or timestamp`);
    }
    if (!Array.isArray(row.inspected)) errors.push(`search ${row.search_id} must list inspected URLs or record identifiers`);
    if (!['found', 'not_found', 'partial'].includes(row.result)) errors.push(`search ${row.search_id} has unknown result ${row.result}`);
    if (!Array.isArray(row.alternatives_attempted)) errors.push(`search ${row.search_id} must record alternatives_attempted (may be empty)`);
  }
  const requireSearchProvenance = (owner, state, searchIds) => {
    if (!SEARCH_DEPENDENT_STATES.has(state)) return;
    if (!(searchIds?.length > 0)) {
      errors.push(`${owner} carries ${state} without search provenance`);
      return;
    }
    for (const id of searchIds) {
      const search = searches.get(id);
      if (!search) errors.push(`${owner} references missing search ${id}`);
      else if (!search.query || !search.domain_or_database || !search.timestamp || !Array.isArray(search.inspected)) {
        errors.push(`${owner} relies on search ${id} that lacks full provenance`);
      }
    }
  };
  for (const row of bundle.coverage ?? []) {
    if (!EVIDENCE_STATES.has(row.state) || !['unavailable_after_search', 'partially_searched', 'not_searched'].includes(row.state)) {
      errors.push(`coverage ${row.coverage_id} has invalid state ${row.state}`);
    }
    requireSearchProvenance(`coverage ${row.coverage_id}`, row.state, row.search_ids);
    if (['partially_searched', 'not_searched'].includes(row.state) && COMPLETION_LANGUAGE.test(row.notes ?? '')) {
      errors.push(`coverage ${row.coverage_id} labels a partial surface with completion language`);
    }
  }
  for (const row of [...(bundle.entities ?? []), ...(bundle.edges ?? []), ...(bundle.claims ?? [])]) {
    const owner = row.entity_id ?? row.edge_id ?? row.claim_id;
    requireSearchProvenance(`record ${owner}`, row.evidence_state, row.search_ids);
  }

  // --- Contradictions: corrected and rejected material never disappears. ---
  const referencedObservations = new Set();
  for (const row of bundle.contradictions ?? []) {
    if (!CONTRADICTION_STATUSES.has(row.status)) errors.push(`contradiction ${row.contradiction_id} has unknown status ${row.status}`);
    if (!(row.observation_ids?.length > 0)) {
      errors.push(`contradiction ${row.contradiction_id} must reference the preserved observation(s) it corrects`);
    }
    for (const id of row.observation_ids ?? []) {
      if (!observations.has(id)) errors.push(`contradiction ${row.contradiction_id} references missing observation ${id} — corrected claims must stay in the record`);
      referencedObservations.add(id);
    }
    if (['corrected', 'rejected'].includes(row.status)) {
      if (!row.correction) errors.push(`contradiction ${row.contradiction_id} lacks correction text`);
      const ids = (row.receipt_ids ?? []).filter(id => !conversationReceiptIds.has(id));
      if (ids.length === 0) errors.push(`contradiction ${row.contradiction_id} corrects a claim without an independent receipt`);
    }
  }
  for (const row of bundle.observations ?? []) {
    if (['corrected', 'rejected'].includes(row.disposition) && !referencedObservations.has(row.observation_id)) {
      errors.push(`observation ${row.observation_id} is marked ${row.disposition} but no contradiction record preserves the correction`);
    }
  }

  // --- Chronology: control regimes are never collapsed. --------------------
  const chronology = bundle.chronology ?? {};
  const regimes = index(chronology.regimes ?? [], 'regime_id', errors, 'chronology');
  for (const required of REQUIRED_REGIMES) {
    if (!regimes.has(required)) errors.push(`chronology is missing required control regime ${required}`);
  }
  const starts = new Set((chronology.regimes ?? []).map(r => r.valid_from).filter(Boolean));
  if ((chronology.regimes ?? []).length > 1 && starts.size < Math.min(8, (chronology.regimes ?? []).length)) {
    errors.push('control regimes appear collapsed: successive regimes share start dates');
  }
  for (const regime of chronology.regimes ?? []) {
    if (!regime.label || !regime.control_description) errors.push(`regime ${regime.regime_id} lacks label or control_description`);
    if (!regime.valid_from) errors.push(`regime ${regime.regime_id} lacks valid_from`);
  }
  for (const event of bundle.events ?? []) {
    if (!event.regime_id) {
      errors.push(`event ${event.event_id} lacks a regime_id — events must be placed in a control regime`);
      continue;
    }
    const regime = regimes.get(event.regime_id);
    if (!regime) {
      errors.push(`event ${event.event_id} references missing regime ${event.regime_id}`);
      continue;
    }
    const eventYear = yearOf(event.occurred_at);
    const fromYear = yearOf(regime.valid_from);
    const untilYear = regime.valid_until ? yearOf(regime.valid_until) : null;
    if (eventYear !== null && fromYear !== null && eventYear < fromYear) {
      errors.push(`event ${event.event_id} (${event.occurred_at}) predates its regime ${regime.regime_id}`);
    }
    if (eventYear !== null && untilYear !== null && eventYear > untilYear) {
      errors.push(`event ${event.event_id} (${event.occurred_at}) postdates its regime ${regime.regime_id}`);
    }
  }

  // --- Trails and frontier: signatures generate candidate searches, never
  // findings; terminal states end. ------------------------------------------
  for (const row of bundle.trails ?? []) {
    if (!TRAIL_STATUSES.has(row.status)) errors.push(`trail ${row.trail_id} has unknown status ${row.status}`);
    if (row.graph_effect !== 'none') errors.push(`trail ${row.trail_id} must carry graph_effect none`);
    if (row.promotes_to !== 'candidate_only') {
      errors.push(`trail ${row.trail_id} must declare promotes_to candidate_only — a trail match is never a finding`);
    }
    const prose = `${row.label ?? ''} ${row.notes ?? ''}`;
    if (row.status.startsWith('terminal') && CONTINUATION_LANGUAGE.test(prose)) {
      errors.push(`terminal trail ${row.trail_id} contains continuation language`);
    }
    for (const search of row.bounded_searches ?? []) {
      if (!search.query || !search.target_domain) errors.push(`trail ${row.trail_id} has an unbounded search entry`);
      if (search.claim_status || search.verdict) errors.push(`trail ${row.trail_id} search entry carries finding fields — candidates must stay candidates`);
    }
  }
  const frontier = bundle.frontier ?? {};
  const openIds = new Set(frontier.open_trail_ids ?? []);
  for (const id of openIds) {
    const trail = trails.get(id);
    if (!trail) errors.push(`frontier lists missing trail ${id}`);
    else if (trail.status.startsWith('terminal')) errors.push(`frontier lists terminal trail ${id} as open`);
  }
  for (const row of bundle.trails ?? []) {
    if (!row.status.startsWith('terminal') && !openIds.has(row.trail_id)) {
      errors.push(`non-terminal trail ${row.trail_id} is missing from the frontier`);
    }
  }
  if (CONTINUATION_LANGUAGE.test(frontier.terminal_note ?? '')) {
    errors.push('frontier terminal_note contains continuation language');
  }

  return errors;
}
