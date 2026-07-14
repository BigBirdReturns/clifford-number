import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('data/research/oge-visual-date-correction-manifest.json', 'utf8'));
assert.equal(manifest.schema_version, 'oge-visual-date-correction-manifest@1');
assert.equal(manifest.source_rows_corrected, 23);
assert.equal(manifest.candidate_pairs_reclassified, 45);
assert.deepEqual(manifest.post_visual_review_dispositions, {
  overlapping: 0,
  non_overlapping: 177,
  temporally_unknown: 995,
});
assert.equal(manifest.corrections.length, 23);
for (const correction of manifest.corrections) {
  assert.match(correction.source_receipt.source_sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(correction.source_receipt.source_page));
  assert.ok(correction.source_receipt.source_row_label);
  assert.match(correction.normalized_date, /^2026-\d{2}-\d{2}$/);
  assert.equal(correction.verification_status, 'source_page_visually_reviewed');
  assert.equal(correction.graph_effect, 'none');
}
assert.match(manifest.interpretation, /does not invent dates/i);
assert.equal(manifest.graph_effect, 'none');
console.log('oge-visual-date-corrections.test.js: OK');
