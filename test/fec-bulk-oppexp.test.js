import assert from 'node:assert/strict';
import { createReportAmendmentAudit, normalizeBulkOperatingExpenditure, operatingExpenditureUrl, parseOperatingExpenditureLine } from '../tools/lib/fec-bulk-oppexp.mjs';

const line = [
  'C00431445', 'A', '2012', 'M2', '12345678901', '23', '3P', 'SB',
  'FIXTURE VENDOR LLC', 'PRIVATE CITY', 'ZZ', '00000', '01022012', '123.45', 'P2012', 'fixture purpose',
  '006', 'Campaign materials', 'X', 'fixture memo', 'ORG', '987654321', '1234567', 'SB23.1', 'SB23.0',
].join('|');
const row = parseOperatingExpenditureLine(line);
assert.equal(row.CMTE_ID, 'C00431445');
assert.equal(row.NAME, 'FIXTURE VENDOR LLC');
const normalized = normalizeBulkOperatingExpenditure(row, {
  cohort_id: 'us-presidents-eiga-era-1979-present',
  person_id: 'barack-obama',
  person_name: 'Barack Obama',
  candidate_id: 'P80003338',
  committee_name: 'OBAMA FOR AMERICA',
  source_url: operatingExpenditureUrl(2012),
  source_sha256: 'c'.repeat(64),
  source_line: 42,
});
assert.equal(normalized.disbursement_date, '2012-01-02');
assert.equal(normalized.disbursement_amount, 123.45);
assert.equal(normalized.payee_name_as_reported, 'FIXTURE VENDOR LLC');
assert.equal(normalized.source_line, 42);
assert.equal(normalized.report_amendment_indicator, 'A');
assert.equal('amendment_indicator' in normalized, false);
assert.equal(normalized.graph_effect, 'none');
for (const excluded of ['CITY', 'STATE', 'ZIP_CODE', 'city', 'state', 'zip_code']) assert.equal(excluded in normalized, false);
assert.equal(operatingExpenditureUrl(2020), 'https://www.fec.gov/files/bulk-downloads/2020/oppexp20.zip');
assert.throws(() => operatingExpenditureUrl(2003));

const audit = createReportAmendmentAudit();
audit.observe({ ...row, AMNDT_IND: 'N', FILE_NUM: '1', TRAN_ID: 'CHAIN-1' });
audit.observe({ ...row, AMNDT_IND: 'A', FILE_NUM: '2', TRAN_ID: 'CHAIN-1' });
audit.observe({ ...row, AMNDT_IND: 'A', FILE_NUM: '2', TRAN_ID: 'CHAIN-1' });
const summary = audit.summarize();
assert.deepEqual(summary.report_filing_indicator_counts, { A: 2, N: 1, T: 0, other: 0 });
assert.equal(summary.distinct_transaction_report_keys, 1);
assert.equal(summary.transaction_report_keys_spanning_multiple_file_numbers, 1);
assert.equal(summary.duplicate_transaction_report_file_keys, 1);

console.log('fec-bulk-oppexp.test.js: OK');
