import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assertPrivacyProjection,
  parseOgePages,
  sha256,
} from '../tools/lib/oge-beneficial-interest.mjs';

const fixture = JSON.parse(fs.readFileSync('test/fixtures/oge-page-items.json', 'utf8'));
const sourceSha = 'a'.repeat(64);
const annual = parseOgePages([fixture.annual], {
  person_id: 'joe-biden',
  person_name: 'Joe Biden',
  source_document_id: `oge:${sourceSha}`,
  report_type: 'Annual (2024)',
  report_date: '2024-05-15',
  source_url: 'https://example.test/annual.pdf',
  source_sha256: sourceSha,
});
assert.equal(annual.records.length, 1);
assert.equal(annual.records[0].interest_holder_scope, 'filer');
assert.equal(annual.records[0].value_range_as_reported, '$100,001 - $250,000');
assert.equal(annual.records[0].income_type_as_reported, 'rent or royalties');
assert.equal(annual.records[0].source_page, 3);
assert.match(annual.records[0].raw_text_ref, /page=3&row=part-2%2F1%40y476/);
assert.equal(annual.records[0].graph_effect, 'none');
assertPrivacyProjection(annual.records[0]);

const transaction = parseOgePages([fixture.transaction], {
  person_id: 'donald-trump',
  person_name: 'Donald Trump',
  source_document_id: `oge:${sourceSha}`,
  report_type: '278 Transaction',
  report_date: '2025-11-22',
  source_url: 'https://example.test/transaction.pdf',
  source_sha256: sourceSha,
});
assert.equal(transaction.records.length, 1);
assert.equal(transaction.records[0].interest_holder_scope, 'spouse');
assert.equal(transaction.records[0].interest_type_as_reported, 'purchase');
assert.equal(transaction.records[0].transaction_date_as_reported, '10/15/2025');
assert.equal(transaction.records[0].transaction_date_normalized, '2025-10-15');
assert.equal(transaction.records[0].transaction_date_status, 'strictly_parsed');
assert.equal(transaction.records[0].interest_type_normalized, 'purchase');
assert.equal(transaction.records[0].value_range_as_reported, '$50,001 - $100,000');
assert.equal(transaction.records[0].raw_text_sha256.length, 64);
assertPrivacyProjection(transaction.records[0]);

const privateFixture = structuredClone(fixture.annual);
privateFixture.items.find(item => item.str === 'EXAMPLE HOLDING LLC').str = 'Account # ABCDE12345';
const rejected = parseOgePages([privateFixture], {
  person_id: 'joe-biden', source_document_id: `oge:${sourceSha}`, report_type: 'Annual',
  source_url: 'https://example.test/private.pdf', source_sha256: sourceSha,
});
assert.equal(rejected.records.length, 0);
assert.equal(rejected.rejections.length, 1);
assert.equal(rejected.rejections[0].graph_effect, 'none');
assert.equal(sha256('fixture').length, 64);

const ambiguousDateFixture = structuredClone(fixture.transaction);
ambiguousDateFixture.items.find(item => item.str === '10/15/2025').str = '1015/2025';
const ambiguous = parseOgePages([ambiguousDateFixture], {
  person_id: 'donald-trump', source_document_id: `oge:${sourceSha}`, report_type: '278 Transaction',
  source_url: 'https://example.test/ambiguous.pdf', source_sha256: sourceSha,
});
assert.equal(ambiguous.records.length, 1);
assert.equal(ambiguous.records[0].transaction_date_as_reported, '1015/2025');
assert.equal(ambiguous.records[0].transaction_date_normalized, null);
assert.equal(ambiguous.records[0].transaction_date_status, 'ocr_ambiguous');
assert.equal(ambiguous.records[0].valid_from, null, 'OCR-collapsed date must not enter temporal joins');

console.log('oge-beneficial-interest.test.js: OK');
