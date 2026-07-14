// Corpus-agnostic crossing core. The FEC/OGE gate in entity-resolution.mjs is one instantiation of
// this discipline welded to finance vocabulary; this core carries the SAME rules with no
// corpus-specific fields, so a positive control can run any corpus through it without exceptions:
//   - every endpoint must be a resolved identity (disposition 'accepted');
//   - at least one INDEPENDENT public receipt (official/primary_public/reported evidence class with a
//     public locator + valid content hash + provenance), present in the declared manifest — a single
//     private/open self-supplied artifact does NOT qualify;
//   - definite temporal overlap (possibly/unknown never passes);
//   - a typed predicate drawn from a supplied corpus-appropriate registry (never a vague edge).
import { temporalRelation } from './entity-resolution.mjs';

const SHA256_RE = /^[a-f0-9]{64}$/i;
const INDEPENDENT_EVIDENCE_CLASSES = new Set(['official', 'primary_public', 'reported']);
const PRIVATE_LOCATOR_STATES = new Set(['private_local_artifact', 'user_supplied_artifact', 'unavailable']);
const VAGUE_PREDICATES = new Set(['linked_to', 'tied_to', 'associated_with', 'involved_in', 'connected_to', 'related_to']);
const hasText = v => typeof v === 'string' && v.trim().length > 0;

export function isIndependentReceipt(receipt = {}, manifestHashes = []) {
  const reasons = [];
  if (!SHA256_RE.test(receipt.content_sha256 ?? '')) reasons.push('invalid_content_hash');
  if (!hasText(receipt.locator) && !hasText(receipt.locator_url)) reasons.push('missing_locator');
  if (!hasText(receipt.provenance_chain_id)) reasons.push('missing_provenance_chain');
  if (!INDEPENDENT_EVIDENCE_CLASSES.has(receipt.evidence_class)) reasons.push(`non_independent_evidence_class:${receipt.evidence_class ?? 'none'}`);
  if (PRIVATE_LOCATOR_STATES.has(receipt.locator_status)) reasons.push(`private_locator:${receipt.locator_status}`);
  if (Array.isArray(manifestHashes) && manifestHashes.length && !manifestHashes.includes(receipt.content_sha256)) reasons.push('receipt_not_in_manifest');
  return { independent: reasons.length === 0, reasons };
}

// input: { predicate, allowed_predicates:Set|Array, endpoints:[{role, resolution:{disposition}}],
//          receipts:[...], manifest_hashes:[...], interval_a, interval_b }
export function evaluateGenericCrossing(input) {
  const failures = [];
  const allowed = input.allowed_predicates instanceof Set ? input.allowed_predicates : new Set(input.allowed_predicates ?? []);

  for (const ep of input.endpoints ?? []) {
    if (ep?.resolution?.disposition !== 'accepted' || !hasText(ep?.resolution?.accepted_entity_id)) {
      failures.push(`endpoint_not_resolved:${ep?.role ?? 'unknown'}`);
    }
  }
  if (!(input.endpoints ?? []).length) failures.push('no_endpoints');

  const independentReceipts = (input.receipts ?? []).filter(r => isIndependentReceipt(r, input.manifest_hashes).independent);
  if (independentReceipts.length === 0) failures.push('no_independent_receipt');

  const temporal = temporalRelation(input.interval_a, input.interval_b);
  if (temporal === 'non_overlapping') failures.push('non_overlapping_intervals');
  if (temporal === 'temporally_unknown') failures.push('temporally_unknown_intervals');
  if (temporal === 'possibly_overlapping') failures.push('temporal_overlap_not_definite');

  if (!hasText(input.predicate)) failures.push('missing_predicate');
  else if (VAGUE_PREDICATES.has(input.predicate)) failures.push(`vague_predicate:${input.predicate}`);
  else if (!allowed.has(input.predicate)) failures.push(`predicate_not_in_registry:${input.predicate}`);

  const passed = failures.length === 0;
  return {
    gate: passed ? 'pass' : 'held',
    temporal_relation: temporal,
    failures,
    independent_receipt_count: independentReceipts.length,
    candidate: {
      schema_version: 'generic-crossing-candidate@1',
      predicate: input.predicate ?? null,
      endpoint_ids: (input.endpoints ?? []).map(e => e?.resolution?.accepted_entity_id ?? null),
      temporal_relation: temporal,
      establishes: passed ? 'Independently receipted, temporally overlapping, resolved-endpoint co-occurrence under a typed predicate.' : null,
      does_not_establish: ['intent', 'legality', 'control', 'coordination', 'causation', 'wrongdoing'],
      verification_status: 'machine_proposed_unverified',
      causal_status: 'not_established',
      graph_effect: 'none',
    },
  };
}
