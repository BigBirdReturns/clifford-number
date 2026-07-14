import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('data/research/natsec100-award-control-manifest.json', 'utf8'));
assert.equal(manifest.schema_version, 'natsec100-award-control-manifest@1');
assert.equal(manifest.coverage.leads_queried, 5);
assert.ok(manifest.coverage.official_award_rows_observed > 0);
assert.equal(manifest.source_native_real_positive.gate.gate, 'pass');
assert.deepEqual(manifest.source_native_real_positive.gate.receipt_roles_satisfied, ['award_record']);
assert.match(manifest.source_native_real_positive.award.recipient_uei, /^[A-Z0-9]{12}$/);
assert.equal(manifest.cross_corpus_join_status, 'held_identity_unresolved');
assert.match(manifest.cross_corpus_identity_gap, /name similarity cannot merge/i);
assert.ok(manifest.source_native_real_positive.does_not_establish.includes('wrongdoing'));
assert.equal(manifest.graph_effect, 'none');
console.log('natsec100-award-control.test.js: OK');
