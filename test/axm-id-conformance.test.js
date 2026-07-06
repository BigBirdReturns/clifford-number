import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canonicalize, entityId, claimId } from '../tools/lib/axm-id.mjs';

// AXM Genesis v1 identity conformance (genesis spec section 10). This asserts
// this repo's port in tools/lib/axm-id.mjs against the shared, byte-pinned
// vectors copied from axm-genesis (test/vectors/identity.json), so any drift
// from the canonical derivation — canonicalize(), entity_id, or claim_id —
// fails the release. The vectors file is authoritative and must not be edited
// to make a failing port pass.
const here = dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(readFileSync(join(here, 'vectors', 'identity.json'), 'utf8'));

function fail(table, i, input, expected, actual) {
  assert.fail(`${table}[${i}] mismatch\n  input:    ${JSON.stringify(input)}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

// --- canonicalization ---
let canonChecked = 0;
vectors.canonicalization.forEach((c, i) => {
  if (c.expected_error) {
    let threw = false;
    try { canonicalize(c.input); } catch { threw = true; }
    if (!threw) fail('canonicalization', i, c.input, `throw ${c.expected_error}`, 'no throw');
  } else {
    let actual;
    try { actual = canonicalize(c.input); } catch (e) { actual = `threw ${e.message}`; }
    if (actual !== c.expected) fail('canonicalization', i, c.input, c.expected, actual);
  }
  canonChecked++;
});

// --- entity_ids ---
let entityChecked = 0;
vectors.entity_ids.forEach((e, i) => {
  const actual = entityId(e.namespace, e.label);
  if (actual !== e.expected_id) fail('entity_ids', i, { namespace: e.namespace, label: e.label }, e.expected_id, actual);
  entityChecked++;
});

// --- claim_ids ---
let claimChecked = 0;
vectors.claim_ids.forEach((c, i) => {
  const actual = claimId(c.subject, c.predicate, c.object, c.object_type);
  if (actual !== c.expected_id) {
    fail('claim_ids', i, { subject: c.subject, predicate: c.predicate, object: c.object, object_type: c.object_type }, c.expected_id, actual);
  }
  claimChecked++;
});

console.log('axm-id-conformance.test: OK');
console.log(`  canonicalization: ${canonChecked}/${vectors.canonicalization.length} vectors pass`);
console.log(`  entity_ids:       ${entityChecked}/${vectors.entity_ids.length} vectors pass`);
console.log(`  claim_ids:        ${claimChecked}/${vectors.claim_ids.length} vectors pass`);
console.log(`  provenance_ids/span_ids: not implemented in this repo — ${(vectors.provenance_ids?.length ?? 0) + (vectors.span_ids?.length ?? 0)} vectors skipped`);
