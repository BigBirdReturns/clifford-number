import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isIndependentReceipt, evaluateGenericCrossing } from '../tools/lib/generic-crossing.mjs';

const HASH = 'a'.repeat(64);
const PRED = new Set(['program_advanced_to']);

// --- generic core: receipt independence ---
assert.equal(isIndependentReceipt({ content_sha256: HASH, locator: 'x', provenance_chain_id: 'p', evidence_class: 'primary_public' }, [HASH]).independent, true);
// FA-03's actual receipt shape: open evidence class + private artifact => not independent
assert.equal(isIndependentReceipt({ content_sha256: HASH, locator: 'x', provenance_chain_id: 'p', evidence_class: 'open', locator_status: 'private_local_artifact' }, [HASH]).independent, false);
assert.equal(isIndependentReceipt({ content_sha256: HASH, locator: 'x', provenance_chain_id: 'p', evidence_class: 'primary_public' }, ['b'.repeat(64)]).independent, false, 'must be in manifest');

// --- generic gate: passes a fully-satisfied crossing (proves it is NOT a zero-only filter) ---
const good = {
  predicate: 'program_advanced_to', allowed_predicates: PRED,
  endpoints: [{ role: 'from', resolution: { disposition: 'accepted', accepted_entity_id: 'a' } }, { role: 'to', resolution: { disposition: 'accepted', accepted_entity_id: 'b' } }],
  receipts: [{ content_sha256: HASH, locator_url: 'https://x', provenance_chain_id: 'p', evidence_class: 'primary_public', locator_status: 'public' }],
  manifest_hashes: [HASH], interval_a: { valid_from: '2026-06-03', valid_until: '2026-06-03' }, interval_b: { valid_from: '2026-06-03', valid_until: '2026-06-03' },
};
assert.equal(evaluateGenericCrossing(good).gate, 'pass');
// each missing element independently holds it
assert.ok(evaluateGenericCrossing({ ...good, receipts: [] }).failures.includes('no_independent_receipt'));
assert.ok(evaluateGenericCrossing({ ...good, endpoints: [{ role: 'from', resolution: { disposition: 'unresolved' } }, good.endpoints[1]] }).failures.some(f => f.startsWith('endpoint_not_resolved')));
assert.ok(evaluateGenericCrossing({ ...good, interval_b: { valid_from: '2019-01-01', valid_until: '2019-12-31' } }).failures.includes('non_overlapping_intervals'));
assert.ok(evaluateGenericCrossing({ ...good, predicate: 'linked_to' }).failures.some(f => f.startsWith('vague_predicate')));

// --- FA-03 audit: disciplined-instrument signature, not zero-only ---
const a = JSON.parse(fs.readFileSync('test/audits/fa03-positive-control.json', 'utf8'));
assert.equal(a.schema_version, 'fa03-positive-control@1');
assert.equal(a.discrimination_demonstrated, true, 'engine must both hold blind and pass receipted');
assert.equal(a.condition_a_held, a.relations_tested, 'blind: every relation held (no receipted positives exist as-is)');
assert.ok(a.condition_a_failure_reasons.includes('no_independent_receipt'), 'blind hold reproduces FA-03 boundary');
assert.ok(a.condition_a_failure_reasons.includes('endpoint_not_resolved'));
assert.ok(a.condition_b_passed >= 1 && a.condition_b_passed < a.relations_tested, 'receipted: some pass, not all — temporal/predicate gates still bind');

// the two that pass under receipts are exactly the source_explicit temporally-overlapping ones
const passedB = a.results.filter(r => r.condition_b.gate === 'pass');
assert.ok(passedB.every(r => r.source_causal_status === 'source_explicit'), 'only source_explicit relations pass');
assert.ok(passedB.every(r => r.condition_b.temporal_relation === 'overlapping'));
// a source_explicit but non-overlapping relation must still be held even with receipts
const nonOverlapHeld = a.results.filter(r => r.condition_b.gate === 'held' && r.condition_b.temporal_relation === 'non_overlapping');
assert.ok(nonOverlapHeld.length >= 1, 'receipts do not override a temporal non-overlap');

console.log('fa03-positive-control.test.js: OK');
