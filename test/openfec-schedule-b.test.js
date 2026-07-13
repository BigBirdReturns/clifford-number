import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authenticatedScheduleBUrl, normalizeScheduleBPage, publicScheduleBUrl, summarizeScheduleBQueries } from '../tools/lib/openfec-schedule-b.mjs';

const identifiers = JSON.parse(fs.readFileSync('data/research/openfec-presidential-identifiers.json', 'utf8'));
assert.equal(identifiers.identities.length, 8);
assert.equal(new Set(identifiers.identities.map(row => row.person_id)).size, 8);
assert.equal(new Set(identifiers.identities.map(row => row.candidate_id)).size, 8);
assert.equal(identifiers.identities.flatMap(row => row.authorized_committees).length, 37);
assert.ok(identifiers.identities.every(row => /^P\d{8}$/.test(row.candidate_id)));
assert.ok(identifiers.identities.flatMap(row => row.authorized_committees).every(row => /^C\d{8}$/.test(row.committee_id)));
assert.equal(identifiers.graph_effect, 'none');

const publicUrl = publicScheduleBUrl('C00431445', { perPage: 50, page: 2, minDate: '01/01/2011', maxDate: '12/31/2012' });
assert.equal(publicUrl.searchParams.get('committee_id'), 'C00431445');
assert.equal(publicUrl.searchParams.get('page'), '2');
assert.equal(publicUrl.searchParams.get('min_date'), '01/01/2011');
assert.equal(publicUrl.searchParams.has('api_key'), false);
assert.throws(() => publicScheduleBUrl('not-a-committee'));

const context = {
  cohort_id: identifiers.cohort_id,
  person_id: 'barack-obama',
  person_name: 'Barack Obama',
  candidate_id: 'P80003338',
  committee_id: 'C00431445',
  committee_name: 'OBAMA FOR AMERICA',
  query_url: publicUrl.toString(),
  retrieved_at: '2026-07-13T00:00:00.000Z',
  credential_mode: 'fixture',
  page: 2,
  consumption: identifiers.consumption,
};
const payload = {
  pagination: { count: 101, pages: 3, page: 2, per_page: 50, last_indexes: { last_disbursement_date: '2012-01-01', last_index: '99' } },
  results: [{
    committee_id: 'C00431445',
    recipient_name: 'FIXTURE VENDOR LLC',
    recipient_committee_id: null,
    recipient_street_1: 'must not survive',
    recipient_city: 'must not survive',
    recipient_state: 'ZZ',
    recipient_zip: '00000',
    disbursement_date: '2012-01-02',
    disbursement_amount: 123.45,
    disbursement_description: 'fixture purpose',
    memo_text: 'fixture memo',
    entity_type: 'ORG',
    filing_form: 'F3P',
    line_number: '23',
    report_type: 'M2',
    two_year_transaction_period: 2012,
    image_number: '123456',
    transaction_id: 'T1',
    sub_id: 'S1',
    amendment_indicator: 'N',
  }],
};
const normalized = normalizeScheduleBPage(payload, context);
assert.equal(normalized.query.coverage_status, 'bounded_partial');
assert.equal(normalized.records.length, 1);
assert.equal(normalized.records[0].payee_name_as_reported, 'FIXTURE VENDOR LLC');
assert.equal(normalized.records[0].disbursement_amount, 123.45);
assert.equal('recipient_street_1' in normalized.records[0], false);
assert.equal('recipient_city' in normalized.records[0], false);
assert.equal('recipient_state' in normalized.records[0], false);
assert.equal('recipient_zip' in normalized.records[0], false);
assert.equal(normalized.records[0].graph_effect, 'none');

const finalPage = normalizeScheduleBPage({ pagination: { count: 1, pages: 1, page: 1, per_page: 100 }, results: [] }, { ...context, page: 1 });
assert.equal(finalPage.query.query_status, 'null_observed');
assert.equal(finalPage.query.coverage_status, 'source_pages_complete');
assert.deepEqual(summarizeScheduleBQueries([normalized.query, finalPage.query], normalized.records), {
  committees_queried: 1,
  pages_queried: 2,
  pages_with_records: 1,
  null_pages_observed: 1,
  source_failures: 0,
  records_observed: 1,
  complete_committee_ranges: 1,
  crossing_matches: 0,
});

const authenticated = authenticatedScheduleBUrl('C00431445', 'secret-key');
assert.equal(authenticated.searchParams.get('api_key'), 'secret-key');
assert.equal(authenticated.searchParams.get('committee_id'), 'C00431445');

console.log('openfec-schedule-b.test.js: OK');
