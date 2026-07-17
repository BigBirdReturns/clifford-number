import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateFecOppexpCohort } from '../tools/validate-fec-oppexp-cohort.mjs';

const manifest = JSON.parse(fs.readFileSync('data/research/fec-bulk-oppexp-cohort-manifest.json', 'utf8'));
const frozen2004 = JSON.parse(fs.readFileSync('data/research/fec-bulk-oppexp-2004-manifest.json', 'utf8'));

// The checked-in manifest must validate clean.
assert.deepEqual(validateFecOppexpCohort(manifest, frozen2004), [], 'checked-in cohort manifest must be valid');

// 2004 must remain the frozen reference and be present.
const c2004 = manifest.cycles.find(c => c.cycle === 2004);
assert.ok(c2004, '2004 frozen reference cycle present');
assert.equal(c2004.source_rows_scanned, 954706);
assert.equal(c2004.matched_reported_rows, 27862);
assert.equal(c2004.distinct_transaction_report_keys, 27862);
assert.equal(c2004.extracted_sha256, frozen2004.extracted_source_sha256);

// Corrected amendment semantics must hold in EVERY cycle (no "duplicate rows" regression).
for (const c of manifest.cycles) {
  assert.equal(c.matched_reported_rows, c.distinct_transaction_report_keys, `cycle ${c.cycle}: matched==distinct keys`);
  assert.equal(c.transaction_report_keys_spanning_multiple_file_numbers, 0, `cycle ${c.cycle}: no cross-file key`);
}

// Honest zero interpretive output until disclosures + gate run.
assert.equal(manifest.normalized_beneficial_interest_records, 0);
assert.equal(manifest.crossing_matches, 0);
assert.equal(manifest.graph_effect, 'none');

// Negative: a manifest that recasts amended rows as duplicates (matched != distinct) must fail.
const tampered = JSON.parse(JSON.stringify(manifest));
tampered.cycles[1].distinct_transaction_report_keys = tampered.cycles[1].matched_reported_rows - 1;
assert.ok(validateFecOppexpCohort(tampered, frozen2004).some(e => /amendment semantics/.test(e)), 'must reject duplicate-row reinterpretation');

// Negative: a 2004 regression must fail.
const tampered2 = JSON.parse(JSON.stringify(manifest));
tampered2.cycles.find(c => c.cycle === 2004).matched_reported_rows = 27000;
assert.ok(validateFecOppexpCohort(tampered2, frozen2004).length > 0, 'must reject 2004 baseline regression');

console.log('fec-oppexp-cohort.test.js: OK');
