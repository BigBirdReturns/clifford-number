import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeBeneficialInterestRecord, validateDisclosureSourceCoverage, validateFecBulkManifest } from '../tools/lib/disclosure-spine.mjs';
import { validateDisclosureSpine } from '../tools/validate-disclosure-spine.mjs';

const matrix = JSON.parse(fs.readFileSync('data/research/presidential-disclosure-source-coverage.json', 'utf8'));
const bulkManifest = JSON.parse(fs.readFileSync('data/research/fec-bulk-oppexp-2004-manifest.json', 'utf8'));
assert.deepEqual(validateDisclosureSourceCoverage(matrix), []);
assert.deepEqual(validateFecBulkManifest(bulkManifest), []);
assert.equal(validateDisclosureSpine().ok, true);

const normalized = normalizeBeneficialInterestRecord({
  interest_holder_scope: 'spouse',
  asset_or_entity_name_as_reported: 'EXAMPLE HOLDING LLC',
  asset_description_as_reported: 'Example description',
  interest_type_as_reported: 'LLC interest',
  value_range_as_reported: '$100,001-$250,000',
  income_type_as_reported: 'rent or royalties',
  income_range_as_reported: '$5,001-$15,000',
  source_page: 12,
  source_row_label: '7.1',
  valid_from: '2020-01-01',
  valid_until: '2020-12-31',
  street_address: 'must not survive',
  account_number: 'must not survive',
  dependent_name: 'must not survive',
}, {
  person_id: 'joe-biden',
  person_name: 'Joe Biden',
  source_document_id: 'fixture-oge-278e',
  report_type: 'OGE Form 278e annual',
  report_date: '2021-05-15',
  source_url: 'https://example.test/fixture.pdf',
  source_sha256: 'a'.repeat(64),
});

assert.equal(normalized.interest_holder_scope, 'spouse');
assert.equal(normalized.entity_resolution_status, 'unresolved_as_reported_name');
assert.equal(normalized.evidence_state, 'self_claimed');
assert.equal(normalized.graph_effect, 'none');
for (const forbidden of ['street_address', 'account_number', 'dependent_name']) assert.equal(forbidden in normalized, false);
assert.throws(() => normalizeBeneficialInterestRecord({ asset_or_entity_name_as_reported: 'X' }, {
  person_id: 'not-in-cohort', source_url: 'https://example.test/x', source_sha256: 'b'.repeat(64),
}));

console.log('disclosure-spine.test.js: OK');
