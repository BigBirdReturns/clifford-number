import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildEstateExpansion } from '../tools/build-estate-expansion.mjs';

const manifest = buildEstateExpansion();
const again = buildEstateExpansion({ write: false });
assert.deepEqual(again, manifest, 'estate expansion must be deterministic');

assert.equal(manifest.counts.first_ten_estates, 10);
assert.equal(manifest.counts.first_ten_incomplete_layers_closed, 48);
assert.deepEqual(manifest.counts.first_ten_closure_states, {
  partially_searched: 47,
  surface_complete: 1
});
assert.equal(manifest.counts.second_cohort_estates, 10);
assert.equal(manifest.counts.second_cohort_tracks, 10);
assert.equal(manifest.counts.inherited_sources, 25);
assert.ok(manifest.counts.new_sources >= 50);
assert.deepEqual(manifest.work_order.map(item => item.position), [1,2,3,4,5,6,7,8,9,10]);

const completion = JSON.parse(fs.readFileSync('data/intake/estate-expansion-01/completion.json', 'utf8'));
const diana2026 = completion.estates.find(item => item.estate_id === 'nato-diana-2026-cohort');
assert.ok(diana2026);
const dianaRoster = diana2026.records.find(item => item.record_id === 'diana-2026-full-cohort');
assert.equal(dianaRoster.unit_count, 150);
assert.equal(dianaRoster.challenge_groups.length, 10);
assert.equal(dianaRoster.challenge_groups.reduce((total, item) => total + item.companies.length, 0), 150);
assert.equal(diana2026.layer_closures.find(item => item.layer === 'official_cohort_denominator').closure_state, 'surface_complete');

for (const estate of completion.estates) {
  for (const closure of estate.layer_closures) {
    assert.notEqual(closure.closure_state, 'not_searched');
    if (closure.closure_state === 'partially_searched') {
      assert.ok(closure.residual_fog);
      assert.ok(closure.next_step);
    }
  }
}

const nextTen = JSON.parse(fs.readFileSync('data/intake/estate-expansion-01/next-ten.json', 'utf8'));
assert.equal(nextTen.estates.length, 10);
const diana2025 = nextTen.estates.find(item => item.estate_id === 'nato-diana-2025-cohort');
assert.equal(diana2025.denominator.acquired_count, 72);
assert.equal(diana2025.records.find(item => item.record_id === 'diana-2025-count-discrepancy').separate_official_article_innovators, 74);
const ftc = nextTen.estates.find(item => item.estate_id === 'ftc-commissioner-router-2021-2026');
assert.equal(ftc.denominator.acquired_count, 10);
const house = nextTen.estates.find(item => item.estate_id === 'us-house-119th-disclosures');
assert.equal(house.denominator.acquired_count, 441);
const metro = nextTen.estates.find(item => item.estate_id === 'expo-crenshaw-joint-development');
assert.equal(metro.records[0].approval_date, '2025-03-27');

for (const estate of nextTen.estates) {
  assert.equal(estate.graph_effect, 'none');
  assert.equal(estate.promotes_to, 'candidate_only');
  assert.equal(estate.conclusion_generated, false);
  assert.ok(estate.required_layers.every(layer => layer.state !== 'not_searched'));
}

const triage = JSON.parse(fs.readFileSync('data/intake/estate-expansion-01/triage.json', 'utf8'));
assert.equal(triage.fog_that_reveals_most.length, 3);
assert.equal(triage.next_ten_work_order.length, 10);
assert.equal(triage.next_ten_work_order[0].estate_id, 'nato-diana-2025-cohort');

console.log('estate-expansion.test: OK');
