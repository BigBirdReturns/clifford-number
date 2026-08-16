import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const run = spawnSync(process.execPath, ['tools/validate-electric-twin-class-rights.mjs'], {
  encoding: 'utf8',
});
if (run.status !== 0) {
  console.error(run.stdout);
  console.error(run.stderr);
}
assert.equal(run.status, 0, 'Electric Twin class-rights validator failed');

const finalizerRun = spawnSync(process.execPath, ['test/electric-twin-register-request-finalizer.test.js'], {
  encoding: 'utf8',
});
if (finalizerRun.status !== 0) {
  console.error(finalizerRun.stdout);
  console.error(finalizerRun.stderr);
}
assert.equal(finalizerRun.status, 0, 'Electric Twin register-request finalizer test failed');

const pdfRun = spawnSync(process.execPath, ['test/electric-twin-register-request-pdf.test.js'], {
  encoding: 'utf8',
});
if (pdfRun.status !== 0) {
  console.error(pdfRun.stdout);
  console.error(pdfRun.stderr);
}
assert.equal(pdfRun.status, 0, 'Electric Twin register-request PDF custody test failed');

const dispatchRun = spawnSync(process.execPath, ['test/electric-twin-register-request-dispatch.test.js'], {
  encoding: 'utf8',
});
if (dispatchRun.status !== 0) {
  console.error(dispatchRun.stdout);
  console.error(dispatchRun.stderr);
}
assert.equal(dispatchRun.status, 0, 'Electric Twin register-request dispatch custody test failed');

const receipts = fs.readFileSync('data/ledger/receipts.jsonl', 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const surfaces = fs.readFileSync('data/ledger/surfaces.jsonl', 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const receipt = id => receipts.find(row => row.receipt_id === id);
const surface = id => surfaces.find(row => row.surface_id === id);

assert.equal(receipt('companies-house-electric-twin-articles-2025-09-12').rights_exercise_established, false);
assert.equal(receipt('companies-house-electric-twin-sh10-rights-2025-09-12').holders_identified, false);
assert.equal(surface('electric-twin-seed2-governance-instrument-2025-09-12').hop_eligible, false);
assert.equal(surface('electric-twin-capital-allotment-observations-2026-01-13-2026-07-09').status,
  'official_sh01_form_sequence_allottees_unidentified');

const cs01 = receipt('companies-house-electric-twin-cs01-shareholders-2025-09-27');
assert.equal(cs01.source_document_id, 'MzQ4MzAzNTU3OGFkaXF6a2N4');
assert.equal(cs01.source_pdf_sha256, '2017a4fb95f4aca753b2780168d789e11ad289aa86a1dcb9f051b48ff8d3408f');
assert.equal(cs01.registered_shareholdings.length, 18);
assert.equal(cs01.grouped_registered_holdings.atomico.total_equity_shares, 604294);
assert.equal(cs01.grouped_registered_holdings.localglobe.total_equity_shares, 680137);
assert.equal(cs01.qualifying_holdings_established, true);
assert.equal(cs01.rights_exercise_established, false);
assert.equal(cs01.allottees_identified, false);
assert.equal(cs01.transaction_join_established, false);
assert.equal(surface('electric-twin-registered-shareholdings-2025-09-27').hop_eligible, false);

console.log('electric-twin-class-rights.test: OK');
