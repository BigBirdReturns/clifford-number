import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNextTenEstates } from '../tools/build-next-ten-estates.mjs';
import { readJson, readJsonl } from '../tools/lib/ledger.mjs';

const first = buildNextTenEstates();
const second = buildNextTenEstates({ write: false });
assert.deepEqual(second, first, 'a second estate build must be deterministic');
assert.deepEqual(readJson('data/intake/next-ten-estates/manifest.json'), first);

assert.equal(first.counts.estates, 10);
assert.equal(first.counts.tracks, 10);
assert.equal(first.counts.sources, 25);
assert.equal(first.counts.raw_records, 239);
assert.deepEqual(first.counts.denominator_states, {
  partially_searched: 1,
  surface_complete: 9
});
assert.deepEqual(first.counts.required_layer_states, {
  not_searched: 40,
  partially_searched: 8,
  surface_complete: 14
});

const byEstate = new Map(first.estates.map(item => [item.estate_id, item]));
assert.equal(byEstate.get('fulton-county-qoz-centennial-yards').denominator.acquired_count, 27);
assert.equal(byEstate.get('nato-diana-2026-cohort').denominator.expected_count, 150);
assert.equal(byEstate.get('nato-diana-2026-cohort').denominator.acquired_count, 14);
assert.equal(byEstate.get('nato-diana-2026-cohort').denominator.coverage_state, 'partially_searched');
assert.equal(byEstate.get('us-senate-119th-disclosures').denominator.acquired_count, 100);
assert.equal(byEstate.get('new-york-state-authority-land-contracts').denominator.acquired_count, 45);

const senate = readJson('data/intake/next-ten-estates/raw/us-senate-119th-disclosures.json');
assert.equal(senate.denominator.expected_count, 100);
const senateRoster = senate.records.find(record => record.record_type === 'legislative_cohort_roster');
assert.equal(senateRoster.unit_count, 100);
assert.equal(senateRoster.members.length, 100);
assert.ok(senate.records.every(record => record.graph_effect === undefined));
assert.ok(senate.required_layers.some(layer => layer.layer === 'null_results' && layer.state === 'not_searched'));

const fulton = readJson('data/intake/next-ten-estates/raw/fulton-county-qoz-centennial-yards.json');
assert.equal(fulton.records.filter(record => record.record_type === 'designated_qoz_tract').length, 27);
assert.ok(fulton.records.some(record => record.record_id === 'centennial-yards-enterprise-zone-ordinance'));

const diana = readJson('data/intake/next-ten-estates/raw/nato-diana-2026-cohort.json');
assert.equal(diana.records.filter(record => record.record_type === 'accelerator_cohort_company').length, 14);
assert.ok(diana.required_layers.some(layer => layer.layer === 'official_cohort_denominator' && layer.state === 'partially_searched'));

const ny = readJson('data/intake/next-ten-estates/raw/new-york-state-authority-land-contracts.json');
const authorityRoster = ny.records.find(record => record.record_type === 'state_public_authority_roster');
assert.equal(authorityRoster.unit_count, 45);
assert.equal(authorityRoster.authorities.length, 45);
assert.ok(ny.required_layers.some(layer => layer.layer === 'procurement_rows' && layer.state === 'partially_searched'));
assert.ok(ny.required_layers.some(layer => layer.layer === 'real_property_rows' && layer.state === 'partially_searched'));

const summaries = readJsonl('data/intake/next-ten-estates/estates.jsonl');
const sources = readJsonl('data/intake/next-ten-estates/sources.jsonl');
assert.equal(summaries.length, 10);
assert.equal(sources.length, 25);
assert.equal(new Set(sources.map(source => source.source_id)).size, sources.length);
assert.ok(sources.every(source => /^https?:\/\//.test(source.url)));

for (const item of summaries) {
  assert.equal(item.graph_effect, 'none');
  assert.equal(item.promotes_to, 'candidate_only');
  assert.equal(item.conclusion_generated, false);
}
for (const estate of first.estates) {
  const raw = readJson(estate.raw_file);
  assert.equal(raw.graph_effect, 'none');
  assert.equal(raw.promotes_to, 'candidate_only');
  assert.equal(raw.conclusion_generated, false);
  assert.ok(raw.required_layers.every(layer => layer.state === 'surface_complete' || layer.next_step));
  assert.doesNotMatch(JSON.stringify(raw), /"(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status)"\s*:/i);
}

const readme = fs.readFileSync('data/intake/next-ten-estates/README.md', 'utf8');
assert.match(readme, /one bounded \*\*estate slice\*\* for each/i);
assert.match(readme, /historical package used `estate_id`/i);
assert.match(readme, /not a merit score or subject ranking/i);

console.log('next-ten-estates.test: OK');
