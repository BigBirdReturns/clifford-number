// Entity resolution + temporal join primitives for the presidential campaign/business lane.
//
// Invariants (mission EVIDENCE FIREWALL + ENTITY RESOLUTION):
//  - Never merge on name similarity alone.
//  - Accept identity only with a unique official identifier OR >= 2 independent strong anchors.
//  - Record every candidate and the rule that generated it; preserve ambiguous/provisional/
//    rejected/unresolved dispositions instead of choosing the most interesting entity.
//  - Parent/subsidiary, property/owner, brand/licensee, trust/beneficiary, operator/owner are
//    typed relationships, not aliases.
//  - Shared registered-agent addresses, generic vendors, coworking / mass-registration
//    addresses are WEAK signals and can never resolve identity by themselves.
//  - Temporal unknown never becomes permanent overlap.

export const NODE_TYPES = new Set([
  'person', 'committee', 'organization', 'trust', 'fund', 'legal_entity', 'brand', 'property', 'financial_interest',
]);

export const RELATIONSHIP_TYPES = new Set([
  'parent_of', 'subsidiary_of', 'owns_property', 'property_of', 'brand_of', 'licensee_of',
  'trustee_of', 'beneficiary_of', 'operator_of', 'owner_of',
]);

// Predicates allowed on candidate edges. Vague predicates are intentionally excluded.
export const ALLOWED_EDGE_PREDICATES = new Set([
  'paid', 'received_from', 'officer_of', 'owns_interest_in', 'operates_property',
  'trade_name_of', 'spouse_interest_in', 'alleged_by', 'charged_with', 'convicted_of', 'judgment_entered',
]);
export const FORBIDDEN_EDGE_PREDICATES = new Set(['linked_to', 'tied_to', 'associated_with', 'involved_in', 'connected_to']);

const STRONG_ANCHOR_KINDS = new Set([
  'official_identifier', 'legal_name_plus_jurisdiction', 'sec_cik', 'state_filing_id', 'lei',
  'fec_committee_id', 'property_parcel_id', 'temporally_valid_dba_registration',
]);
const WEAK_ANCHOR_KINDS = new Set([
  'name_similarity', 'shared_registered_agent_address', 'shared_mailing_address', 'generic_vendor_name',
  'coworking_address', 'mass_registration_address', 'city_state_match',
]);

const GENERIC_VENDOR_TOKENS = new Set([
  'llc', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'the', 'services', 'group',
  'consulting', 'media', 'printing', 'catering', 'associates', 'partners', 'enterprises', 'solutions',
]);
const SHA256_RE = /^[a-f0-9]{64}$/i;
const HOLDER_SCOPES = new Set(['filer', 'spouse', 'joint', 'dependent_child', 'trust', 'unknown']);

export function normalizePayee(rawText) {
  const source_text = typeof rawText === 'string' ? rawText : '';
  const upper = source_text.toUpperCase();
  const stripped = upper.replace(/[.,'"()\-/&]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = stripped.split(' ').filter(Boolean);
  const core = tokens.filter(t => !GENERIC_VENDOR_TOKENS.has(t.toLowerCase()));
  return {
    source_text,                       // immutable — never overwritten
    normalized: stripped,
    tokens,
    core_tokens: core,
    is_generic_vendor_string: core.length === 0,
  };
}

export function classifyAnchorStrength(kind) {
  if (STRONG_ANCHOR_KINDS.has(kind)) return 'strong';
  if (WEAK_ANCHOR_KINDS.has(kind)) return 'weak';
  return 'unknown';
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validIdentifierValue(kind, value) {
  if (!hasText(value)) return false;
  const text = value.trim();
  if (kind === 'sec_cik') return /^\d{1,10}$/.test(text);
  if (kind === 'fec_committee_id') return /^C\d{8}$/.test(text);
  if (kind === 'lei') return /^[A-Z0-9]{20}$/i.test(text);
  return true;
}

function evaluateAnchor(anchor = {}) {
  const strength = classifyAnchorStrength(anchor.kind);
  const source = anchor.source ?? {};
  const receiptValid = SHA256_RE.test(source.content_sha256 ?? '')
    && hasText(source.locator)
    && hasText(source.provenance_chain_id);
  const valid = strength !== 'unknown'
    && hasText(anchor.issuer)
    && validIdentifierValue(anchor.kind, anchor.value)
    && receiptValid;
  return {
    ...anchor,
    strength,
    valid,
    invalid_reasons: [
      strength === 'unknown' ? 'unknown_anchor_kind' : null,
      hasText(anchor.issuer) ? null : 'missing_issuer',
      validIdentifierValue(anchor.kind, anchor.value) ? null : 'invalid_or_empty_value',
      receiptValid ? null : 'missing_or_invalid_receipt',
    ].filter(Boolean),
  };
}

// candidates: [{ candidate_entity_id, node_type, rule, anchors: [{kind, value}] }]
export function resolveIdentity({ source_text, candidates = [] }) {
  const evaluated = candidates.map(c => {
    const anchors = (c.anchors ?? []).map(evaluateAnchor);
    const candidateValid = hasText(c.candidate_entity_id) && NODE_TYPES.has(c.node_type);
    const strong = anchors.filter(a => a.strength === 'strong' && a.valid);
    const uniqueKinds = new Set(['official_identifier', 'sec_cik', 'state_filing_id', 'fec_committee_id', 'lei', 'property_parcel_id']);
    const hasUniqueOfficialId = strong.some(a => uniqueKinds.has(a.kind));
    const independentStrong = new Set(strong.map(a => a.source.provenance_chain_id)).size;
    let disposition;
    if (!candidateValid) disposition = 'unresolved';
    else if (hasUniqueOfficialId) disposition = 'accepted';
    else if (independentStrong >= 2) disposition = 'accepted';
    else if (independentStrong === 1) disposition = 'provisional';
    else disposition = 'unresolved';
    return { ...c, anchors, independent_strong_provenance_chains: independentStrong, candidate_valid: candidateValid, disposition };
  });
  const accepted = evaluated.filter(c => c.disposition === 'accepted');
  let disposition;
  if (accepted.length === 1) disposition = 'accepted';
  else if (accepted.length > 1) disposition = 'ambiguous';       // multiple accepted-equivalents -> do NOT pick
  else if (evaluated.some(c => c.disposition === 'provisional')) disposition = 'provisional';
  else disposition = 'unresolved';
  return {
    source_text,
    disposition,
    accepted_entity_id: disposition === 'accepted' ? accepted[0].candidate_entity_id : null,
    candidates: evaluated,               // every candidate + rule preserved
    verification_status: 'machine_proposed_unverified',
    graph_effect: 'none',
    note: disposition === 'ambiguous'
      ? 'Multiple candidates cleared the anchor test; identity is not resolved to a single entity.'
      : disposition === 'unresolved'
        ? 'No strong anchor; name similarity alone cannot resolve identity.'
        : undefined,
  };
}

function parseInterval(interval) {
  if (!interval) return null;
  const from = interval.valid_from ? Date.parse(interval.valid_from) : null;
  const until = interval.valid_until ? Date.parse(interval.valid_until) : null;
  return { from: Number.isNaN(from) ? null : from, until: Number.isNaN(until) ? null : until };
}

// A completely unknown interval (no bounds at all) yields temporally_unknown, never overlap.
export function temporalRelation(a, b) {
  const ia = parseInterval(a);
  const ib = parseInterval(b);
  if (!ia || !ib) return 'temporally_unknown';
  const aOpen = ia.from === null && ia.until === null;
  const bOpen = ib.from === null && ib.until === null;
  if (aOpen || bOpen) return 'temporally_unknown';
  const aStart = ia.from ?? -Infinity, aEnd = ia.until ?? Infinity;
  const bStart = ib.from ?? -Infinity, bEnd = ib.until ?? Infinity;
  if (aEnd < bStart || bEnd < aStart) return 'non_overlapping';
  // one side open-ended on the relevant edge -> overlap is possible but not certain
  if (ia.until === null || ib.until === null || ia.from === null || ib.from === null) return 'possibly_overlapping';
  return 'overlapping';
}

// A crossing candidate requires: receipted itemization, resolved committee + payee, separately
// receipted interest, explicit holder scope, compatible temporal intervals, and a visible path.
export function evaluateCrossingGate(input) {
  const failures = [];
  const item = input.itemization ?? {};
  const interest = input.interest ?? {};
  const itemHashValid = SHA256_RE.test(item.source_sha256 ?? '');
  if (!itemHashValid || !Number.isInteger(item.source_line) || item.source_line < 1 || !hasText(item.transaction_id) || !hasText(item.committee_id)) {
    failures.push('missing_or_invalid_receipted_itemization');
  }
  if (!itemHashValid || !Array.isArray(input.source_manifest_hashes) || !input.source_manifest_hashes.includes(item.source_sha256)) {
    failures.push('itemization_source_not_in_manifest');
  }
  if (input.committee_resolution?.disposition !== 'accepted' || !hasText(input.committee_resolution?.accepted_entity_id)) failures.push('committee_not_resolved');
  if (input.payee_resolution?.disposition !== 'accepted' || !hasText(input.payee_resolution?.accepted_entity_id)) failures.push('payee_not_resolved');
  const interestHashValid = SHA256_RE.test(interest.source_sha256 ?? '');
  if (!interestHashValid || !hasText(interest.source_locator)) failures.push('missing_or_invalid_receipted_interest');
  if (!interestHashValid || !Array.isArray(input.disclosure_document_hashes) || !input.disclosure_document_hashes.includes(interest.source_sha256)) {
    failures.push('interest_source_not_in_manifest');
  }
  if (!HOLDER_SCOPES.has(interest.holder_scope)) failures.push('missing_or_invalid_holder_scope');
  const temporal = temporalRelation(input.itemization_interval, input.interest_interval);
  if (temporal === 'non_overlapping') failures.push('non_overlapping_intervals');
  if (temporal === 'temporally_unknown') failures.push('temporally_unknown_intervals');
  if (temporal === 'possibly_overlapping') failures.push('temporal_overlap_not_definite');
  if (!hasText(input.predicate)) failures.push('missing_predicate');
  else if (!ALLOWED_EDGE_PREDICATES.has(input.predicate)) failures.push(`disallowed_predicate:${input.predicate}`);
  const passed = failures.length === 0;
  return {
    gate: passed ? 'pass' : 'fail',
    temporal_relation: temporal,
    failures,
    candidate: {
      schema_version: 'bounded-crossing-candidate@1',
      verification_status: 'machine_proposed_unverified',
      causal_status: 'not_established',
      graph_effect: 'none',
      subject_id: input.committee_resolution?.accepted_entity_id ?? null,
      object_id: input.payee_resolution?.accepted_entity_id ?? null,
      predicate: input.predicate ?? null,
      transaction_id: item.transaction_id ?? null,
      committee_id: item.committee_id ?? null,
      itemization_source_sha256: item.source_sha256 ?? null,
      interest_source_sha256: interest.source_sha256 ?? null,
      interest_source_locator: interest.source_locator ?? null,
      temporal_relation: temporal,
      establishes: passed
        ? 'An official FEC itemization reports a committee disbursement to a resolved payee whose separately receipted disclosed interest definitely overlaps the itemization interval.'
        : null,
      does_not_establish: ['intent', 'legality', 'control', 'coordination', 'personal_enrichment', 'self_dealing', 'wrongdoing'],
      forbidden_inferences: ['crossing_implies_wrongdoing', 'overlap_implies_causation', 'payment_implies_beneficial_ownership'],
    },
  };
}
