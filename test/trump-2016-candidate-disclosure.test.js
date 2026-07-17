import assert from 'node:assert/strict';
import {
  TARGETS,
  assessInterval,
  extractDisclosureEvidence,
  sha256,
  summarizeFecWindow,
} from '../tools/lib/trump-2016-candidate-disclosure.mjs';

const pages = Array.from({ length: 22 }, (_, index) => ({ page_number: index + 1, text: '', text_sha256: sha256('') }));
for (const target of TARGETS) {
  const text = `Filer's Name Donald J. Trump Part 2: Filer's Employment Assets and Income ${target.row_number} ${target.entity_name} N/A ${target.reference_number} $1,000,001 rent $100,001 ${target.next_row_number} NEXT LLC`;
  pages[target.asset_page - 1] = { page_number: target.asset_page, text, text_sha256: sha256(text) };
}
const evidence = extractDisclosureEvidence(pages);
assert.equal(evidence.length, 3);
assert.ok(evidence.every(row => row.exact_name_present && row.section_header_present && row.row_and_reference_pattern_verified));
assert.ok(evidence.every(row => row.holder_scope === 'filer'));
assert.ok(evidence.every(row => row.interval_valid_from === null && row.interval_valid_until === null));

const fec = summarizeFecWindow([
  { normalized_payee_name: 'TRUMP CPS LLC', cycle: 2016, disbursement_date: '2015-07-01', report_amendment_indicator: 'A' },
  { normalized_payee_name: 'TRUMP CPS LLC', cycle: 2016, disbursement_date: '2016-06-01', report_amendment_indicator: 'N' },
]);
assert.deepEqual(fec[0].observed_date_range, { earliest: '2015-07-01', latest: '2016-06-01' });
assert.equal(fec[0].disclosure_observation_date_within_observed_fec_range, true);
const assessment = assessInterval(evidence[0], fec[0]);
assert.equal(assessment.explicit_filer_report, true);
assert.equal(assessment.contemporaneous_with_observed_fec_window, true);
assert.equal(assessment.supplies_defensible_closed_interval, false);

console.log('trump-2016-candidate-disclosure.test.js: OK');
