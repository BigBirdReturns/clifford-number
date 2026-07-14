import assert from 'node:assert/strict';
import {
  analyzeInterestDateEvidence,
  applyDateRecovery,
  parseStrictSourceDateToken,
  sha256,
} from '../tools/lib/oge-date-recovery.mjs';

function fixture({ date = '5/18/2026', kind = 'reported_transaction', reportType = '278 Transaction' } = {}) {
  const items = kind === 'reported_transaction'
    ? [
      { x: 89.2, y: 443.2, str: '731' },
      { x: 134.5, y: 442.5, str: 'DISNEY WALT CO' },
      { x: 461.5, y: 439.9, str: 'sale' },
      { x: 511.8, y: 439.2, str: date },
      { x: 605.4, y: 438.5, str: 'No' },
      { x: 615.9, y: 438.5, str: '$1,001 -$15,000' },
      { x: 89.2, y: 429.1, str: '732' },
    ]
    : [
      { x: 40, y: 443.2, str: '1' },
      { x: 60, y: 442.5, str: 'EXAMPLE ASSET' },
      { x: 40, y: 429.1, str: '2' },
    ];
  const rowItems = items.filter(item => item.y <= 447.2 && item.y > 432.1);
  const raw = rowItems.slice().sort((a, b) => b.y - a.y || a.x - b.x).map(item => item.str).join(' ');
  const section = kind === 'reported_transaction' ? 'transactions' : 'part-6';
  const label = kind === 'reported_transaction' ? '731' : '1';
  return {
    page: { page_number: 1, text_sha256: 'a'.repeat(64), items },
    record: {
      source_document_id: 'oge:test', source_sha256: 'b'.repeat(64), source_page: 1,
      source_row_label: `${section}/${label}@y443.2`, raw_text_ref: 'pages/test#page=1', raw_text_sha256: sha256(raw),
      record_kind: kind, report_type: reportType, report_date: '2026-07-01',
      valid_from: null, valid_until: kind === 'reported_transaction' ? null : '2026-07-01',
      transaction_date_as_reported: kind === 'reported_transaction' ? date : null,
    },
  };
}

assert.equal(parseStrictSourceDateToken('5/18/2026'), '2026-05-18');
assert.equal(parseStrictSourceDateToken('2026-05-18'), '2026-05-18');
assert.equal(parseStrictSourceDateToken('5118/2026'), null);
assert.equal(parseStrictSourceDateToken('2/30/2026'), null);

const strict = fixture();
const recovered = analyzeInterestDateEvidence(strict.record, strict.page);
assert.equal(recovered.recovery_status, 'recovered');
assert.equal(recovered.recovered_date, '2026-05-18');
assert.equal(recovered.raw_text_sha256_verified, true);
const patched = applyDateRecovery({ interest_dates: { valid_from: null, valid_until: null } }, recovered);
assert.deepEqual(patched.interest_dates, { valid_from: '2026-05-18', valid_until: '2026-05-18' });

const collapsed = fixture({ date: '5118/2026' });
const rejected = analyzeInterestDateEvidence(collapsed.record, collapsed.page);
assert.equal(rejected.recovery_status, 'unrecovered');
assert.equal(rejected.reason, 'source_transaction_date_token_not_strict');
assert.equal(rejected.source_date_items[0].str, '5118/2026');

const annual = fixture({ kind: 'other_asset_or_income', reportType: 'Annual (2026)' });
const annualEvidence = analyzeInterestDateEvidence(annual.record, annual.page);
assert.equal(annualEvidence.recovery_status, 'unrecovered');
assert.equal(annualEvidence.reason, 'annual_disclosure_interest_start_date_not_reported');

const termination = fixture({ kind: 'employment_asset_or_income', reportType: 'Termination' });
assert.equal(analyzeInterestDateEvidence(termination.record, termination.page).reason, 'termination_disclosure_interest_start_date_not_reported');

const mismatch = fixture();
mismatch.record.raw_text_sha256 = '0'.repeat(64);
const mismatchEvidence = analyzeInterestDateEvidence(mismatch.record, mismatch.page);
assert.equal(mismatchEvidence.recovery_status, 'source_error');
assert.equal(mismatchEvidence.reason, 'source_row_text_hash_mismatch');

console.log('oge-date-recovery.test.js: OK');
