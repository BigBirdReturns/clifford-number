import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'data', 'intake', 'linkedin-targeted-review');
const readJson = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const readJsonl = name => fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));

const selection = readJson('selection.json');
const manifest = readJson('manifest.json');
const captures = readJsonl('captures.jsonl');
const claims = readJsonl('role-claims.jsonl');
const crossings = readJsonl('crossing-candidates.jsonl');
const notes = readJsonl('visual-review-notes.jsonl');
const warnings = readJsonl('review-warnings.jsonl');
const gaps = readJsonl('coverage-gaps.jsonl');

assert.equal(selection.capture_ids.length, 31);
assert.equal(captures.length, 31);
assert.equal(manifest.counts.captures, captures.length);
assert.equal(manifest.counts.role_claims, claims.length);
assert.equal(manifest.counts.crossing_candidates, crossings.length);
assert.equal(manifest.counts.visual_review_notes, notes.length);
assert.equal(manifest.counts.review_warnings, warnings.length);
assert.equal(manifest.counts.acquisition_coverage_gaps, gaps.length);
assert.equal(gaps.length, 4);
assert.equal(manifest.portability.independent_source_verification_without_pdf, false);
assert.equal(manifest.portability.map_and_extraction_review_without_pdf, true);

const captureIds = new Set(captures.map(row => row.capture_id));
const claimIds = new Set(claims.map(row => row.claim_id));
assert.deepEqual([...captureIds], selection.capture_ids);
assert.ok(claims.every(row => captureIds.has(row.capture_id)));
assert.ok(crossings.every(row => claimIds.has(row.public_role.claim_id) && claimIds.has(row.private_role.claim_id)));
assert.ok(notes.every(row => captureIds.has(row.capture_id)));
assert.ok(warnings.every(row => captureIds.has(row.capture_id)));

for (const row of captures) {
  assert.match(row.source_receipt.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.graph_effect, 'none');
  assert.equal(row.publication_status, 'review_projection');
}
for (const row of [...claims, ...crossings, ...notes, ...warnings]) assert.equal(row.graph_effect, 'none');
for (const row of gaps) {
  assert.equal(row.graph_effect, 'none');
  assert.equal(row.evidence_state, 'coverage_gap');
  assert.match(row.interpretation, /not evidence/i);
}

const portableText = [captures, claims, crossings, notes, warnings, gaps].map(value => JSON.stringify(value)).join('\n');
for (const forbidden of ['raw_copy', 'data/local', 'street_address', 'phone_number', 'email_address', 'filesystem_last_write_utc']) {
  assert.equal(portableText.includes(forbidden), false, `portable projection contains forbidden field: ${forbidden}`);
}

assert.ok(warnings.some(row => row.warning_type === 'exact_machine_role_duplicate'));
assert.ok(warnings.some(row => row.warning_type === 'zero_machine_crossings_for_selected_profile'));
assert.ok(notes.some(row => row.capture_id === 'liprof_5f577e92e31602ddfb5bd2fd'));

console.log('linkedin-targeted-review-projection.test.js: OK');
