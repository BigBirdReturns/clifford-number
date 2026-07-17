import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authenticatedCandidateSearchUrl, normalizeCandidateSearchResponse, resolveOpenFecCohort, summarizeOpenFecRows } from '../tools/lib/openfec-cohort.mjs';

const cohort = JSON.parse(fs.readFileSync('data/canonical/us-presidential-officeholder-cohort.json', 'utf8'));
const contract = {
  contract_id: 'public-topology-map@1',
  what_this_is: 'fixture map',
  what_this_is_not: 'fixture finding',
  copy_ready_caveat: 'fixture caveat',
};
const payloadFor = member => ({
  pagination: { count: 1, page: 1, pages: 1, per_page: 100 },
  results: [{
    candidate_id: `P${String(cohort.members.indexOf(member) + 1).padStart(8, '0')}`,
    name: member.name.toUpperCase(),
    office: 'P',
    party: 'TST',
    cycles: [2000],
    election_years: [2000],
    active_through: 2000,
  }],
});

const emitted = [];
const rows = await resolveOpenFecCohort({
  cohort,
  retrievedAt: '2026-07-13T00:00:00.000Z',
  consumptionContract: contract,
  credentialMode: 'fixture',
  fetchJson: async member => {
    if (member.person_id === 'ronald-reagan') return { pagination: { count: 0 }, results: [] };
    if (member.person_id === 'george-h-w-bush') throw new Error('OpenFEC 429: fixture throttle');
    return payloadFor(member);
  },
  onRow: async row => emitted.push(row.person_id),
});

assert.equal(rows.length, 8);
assert.deepEqual(emitted, cohort.members.map(member => member.person_id));
assert.equal(rows.find(row => row.person_id === 'jimmy-carter').query_status, 'records_observed');
assert.equal(rows.find(row => row.person_id === 'ronald-reagan').query_status, 'null_observed');
assert.equal(rows.find(row => row.person_id === 'george-h-w-bush').query_status, 'source_failure');
assert.equal(rows.find(row => row.person_id === 'george-h-w-bush').evidence_state, 'unavailable');
assert.ok(rows.every(row => row.graph_effect === 'none' && row.consumption.contract_id === 'public-topology-map@1'));
assert.ok(rows.every(row => !row.query_url.includes('api_key')));

const summary = summarizeOpenFecRows(rows);
assert.deepEqual(summary, {
  cohort_members: 8,
  queries_completed: 7,
  candidate_records_observed: 6,
  by_query_status: { records_observed: 6, null_observed: 1, source_failure: 1 },
  canonical_identities_resolved: 0,
});

const normalized = normalizeCandidateSearchResponse({ results: [
  { candidate_id: 'H00000001', name: 'HOUSE FIXTURE', office: 'H' },
  { candidate_id: 'P00000001', name: 'PRESIDENT FIXTURE', office: 'P', cycles: null },
] });
assert.deepEqual(normalized.map(record => record.candidate_id), ['P00000001']);

const authenticated = authenticatedCandidateSearchUrl('Example Person', 'secret-key');
assert.equal(authenticated.searchParams.get('api_key'), 'secret-key');
assert.equal(authenticated.searchParams.get('office'), 'P');

console.log('openfec-cohort.test.js: OK');
