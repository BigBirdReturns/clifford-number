import assert from 'node:assert/strict';
import fs from 'node:fs';

const a = JSON.parse(fs.readFileSync('data/intake/linkedin-targeted-review/crossing-analysis.json', 'utf8'));
const src = fs.readFileSync('data/intake/linkedin-targeted-review/crossing-candidates.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).length;

assert.equal(a.schema_version, 'linkedin-crossing-analysis@1');
assert.equal(a.graph_effect, 'none');
assert.equal(a.candidates_analyzed, src, 'analysis covers every projected candidate');

// dedup: distinct transitions <= candidates, reduction recorded
assert.ok(a.deduplication.distinct_institutional_transitions <= a.candidates_analyzed);
assert.ok(a.deduplication.reduction_ratio >= 1);

// adjacency classes partition every candidate
const adj = a.chronological_adjacency.classes;
assert.equal(Object.values(adj).reduce((x, y) => x + y, 0), a.candidates_analyzed, 'adjacency classes partition all candidates');

// the decisive discipline: candidate stays candidate — the generic gate passes ZERO
assert.equal(a.source_explicit_classification.gate_passed, 0, '430 candidates are candidates, not established crossings');
assert.equal(a.source_explicit_classification.gate_held, a.candidates_analyzed);
// held for the honest reasons: self-claim is not an independent receipt; orgs are unresolved
assert.equal(a.source_explicit_classification.hold_reason_counts.no_independent_receipt, a.candidates_analyzed);
assert.ok(a.source_explicit_classification.hold_reason_counts.endpoint_not_resolved >= a.candidates_analyzed);

// recurring transitions surfaced (structural recrossing signal across >=2 subjects)
assert.ok(a.recurring_transitions.recurring_private_destinations.every(r => r.distinct_subjects >= 2));
assert.ok(a.recurring_transitions.recurring_public_origins.every(r => r.distinct_subjects >= 2));

// evidence limit preserved verbatim intent
assert.match(a.evidence_limit, /hash|not replace|private/i);

console.log('linkedin-crossing-analysis.test.js: OK');
