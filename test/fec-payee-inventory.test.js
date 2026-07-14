import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFecPayeeInventory, classifyPayeeName, normalizePayeeName } from '../tools/lib/fec-payee-inventory.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fec-payee-inventory-'));
const input = path.join(tmp, 'normalized');
const output = path.join(tmp, 'inventory');
fs.mkdirSync(input, { recursive: true });

const base = {
  cohort_id: 'fixture-cohort', person_id: 'fixture-person', candidate_id: 'P00000001',
  committee_id: 'C00000001', committee_name: 'FIXTURE COMMITTEE',
  disbursement_description: 'fixture purpose', memo_code: null, memo_text: null,
  report_amendment_indicator: 'A', source_url: 'https://example.invalid/oppexp.zip',
  source_sha256: 'a'.repeat(64), evidence_state: 'observed',
};
const rows2004 = [
  { ...base, payee_name_as_reported: 'Acme, LLC.', payee_address_as_reported: '10 Main St.', payee_city_as_reported: 'Example', payee_state_as_reported: 'ZZ', payee_zip_as_reported: '00000', disbursement_date: '2004-02-01', disbursement_amount: 12.5, sub_id: '1001', file_number: '10', transaction_id: 'T-1', back_reference_transaction_id: null, image_number: 'IMG-1', source_line: 5 },
  { ...base, payee_name_as_reported: '   ', disbursement_date: '2004-02-02', disbursement_amount: 1, sub_id: '1002', transaction_id: 'T-2', privacy_projection: 'City, state, ZIP code, street address, and private contact fields are not retained.', source_line: 6 },
  { ...base, payee_name_as_reported: { bad: true }, disbursement_date: '2004-02-03', disbursement_amount: 2, sub_id: '1003', transaction_id: 'T-3', source_line: 7 },
];
const rows2006 = [
  { ...base, payee_name_as_reported: 'ACME LLC', payee_address_as_reported: '10 MAIN ST', payee_city_as_reported: 'EXAMPLE', payee_state_as_reported: 'ZZ', payee_zip_as_reported: '00000', disbursement_date: '2006-03-01', disbursement_amount: 22, memo_code: 'X', memo_text: 'memo fixture', sub_id: '2001', file_number: '20', transaction_id: 'T-4', back_reference_transaction_id: 'T-0', image_number: 'IMG-2', source_line: 8 },
  { ...base, payee_name_as_reported: 'UNKNOWN', disbursement_date: '2006-03-02', disbursement_amount: 3, sub_id: '2002', transaction_id: 'T-5', source_line: 9 },
];
fs.writeFileSync(path.join(input, 'oppexp-2004.jsonl'), `${rows2004.map(JSON.stringify).join('\n')}\n`);
fs.writeFileSync(path.join(input, 'oppexp-2006.jsonl'), `${rows2006.map(JSON.stringify).join('\n')}\n{not-json}\n42\n`);

assert.equal(normalizePayeeName('Acme, LLC.'), 'ACME LLC');
assert.equal(classifyPayeeName('UNKNOWN').disposition, 'placeholder_payee_name');
assert.equal(classifyPayeeName('***').disposition, 'malformed_payee_name');

const { manifest } = await buildFecPayeeInventory({
  inputFiles: [path.join(input, 'oppexp-2006.jsonl'), path.join(input, 'oppexp-2004.jsonl')],
  inputRoot: input,
  outputDir: output,
});
assert.equal(manifest.coverage.input_lines, 7);
assert.equal(manifest.coverage.parsed_records, 5);
assert.equal(manifest.coverage.inventory_records_written, 5);
assert.equal(manifest.coverage.candidate_eligible_rows, 2);
assert.equal(manifest.coverage.blank_payee_name_rows, 1);
assert.equal(manifest.coverage.malformed_payee_name_rows, 1);
assert.equal(manifest.coverage.placeholder_payee_name_rows, 1);
assert.equal(manifest.coverage.invalid_json_lines, 1);
assert.equal(manifest.coverage.malformed_record_lines, 1);
assert.equal(manifest.coverage.distinct_unresolved_payee_candidates, 1);
assert.equal(manifest.coverage.address_status_rows.observed_in_input_projection, 2);
assert.equal(manifest.coverage.address_status_rows.unavailable_by_upstream_privacy_projection, 1);
assert.deepEqual(manifest.coverage.cycles_observed, [2004, 2006]);

const records = fs.readFileSync(path.join(output, 'payee-records.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(records.length, 5);
const first = records[0];
assert.equal(first.source_record_id, 'fec-oppexp:2004:sub:1001');
assert.equal(first.cycle, 2004);
assert.equal(first.committee_id, 'C00000001');
assert.equal(first.source_locator.cycle, 2004);
assert.equal(first.payee_name_as_reported, 'Acme, LLC.');
assert.equal(first.address_fields_as_reported.payee_address_as_reported, '10 Main St.');
assert.equal(first.disbursement_date, '2004-02-01');
assert.equal(first.disbursement_amount, 12.5);
assert.equal(first.source_ids.transaction_id, 'T-1');
assert.equal(first.source_ids.back_reference_transaction_id, null);
assert.equal(first.graph_effect, 'none');

const candidates = fs.readFileSync(path.join(output, 'payee-candidates.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(candidates.length, 1);
assert.equal(candidates[0].candidate_status, 'unresolved_normalized_candidate');
assert.equal(candidates[0].source_record_count, 2);
assert.deepEqual(candidates[0].observed_cycles, [2004, 2006]);
assert.deepEqual(candidates[0].observed_name_variants, [
  { value: 'ACME LLC', count: 1 },
  { value: 'Acme, LLC.', count: 1 },
]);
assert.match(candidates[0].allowed_language, /not an entity resolution/i);

const dispositions = fs.readFileSync(path.join(output, 'payee-dispositions.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.deepEqual(new Set(dispositions.map(row => row.disposition)), new Set([
  'blank_payee_name', 'malformed_payee_name', 'placeholder_payee_name', 'invalid_json', 'malformed_record',
]));
assert.ok(dispositions.find(row => row.disposition === 'invalid_json').line_sha256);

const rerun = path.join(tmp, 'rerun');
const { manifest: manifest2 } = await buildFecPayeeInventory({
  inputFiles: [path.join(input, 'oppexp-2004.jsonl'), path.join(input, 'oppexp-2006.jsonl')],
  inputRoot: input,
  outputDir: rerun,
});
for (const key of ['records', 'candidates', 'dispositions']) {
  assert.equal(manifest.outputs[key].sha256, manifest2.outputs[key].sha256, `${key} output must be reproducible`);
}
const { manifest: manifest3 } = await buildFecPayeeInventory({
  inputFiles: [path.join(input, 'oppexp-2004.jsonl'), path.join(input, 'oppexp-2006.jsonl')],
  inputRoot: input,
  outputDir: output,
});
for (const key of ['records', 'candidates', 'dispositions']) {
  assert.equal(manifest.outputs[key].sha256, manifest3.outputs[key].sha256, `${key} same-directory rerun must replace cleanly`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('fec-payee-inventory.test.js: OK');
