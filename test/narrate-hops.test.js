import assert from 'node:assert/strict';
import { narrationBasesForSlice, narrationWindowText, selectNarrationBasis } from '../tools/lib/narration.mjs';

const edge = {
  actor_a: 'ben-warner',
  actor_b: 'dominic-cummings',
  surfaces: [
    {
      surface_id: 'bounded-policy-session-2020',
      temporal_status: 'dated',
      valid_from: '2019-12-01',
      valid_until: '2020-12-31',
      evidence_class: 'official',
    },
    {
      surface_id: 'vote-leave-data-science-2016',
      temporal_status: 'dated',
      valid_from: '2016-01-01',
      valid_until: '2016-12-31',
      evidence_class: 'reported',
    },
  ],
};

// Vote Leave is the smaller surface, so an all-time narration may prefer it.
// A time-sliced narration must first exclude bases outside the requested slice.
const populations = new Map([
  ['bounded-policy-session-2020', 5],
  ['vote-leave-data-science-2016', 3],
]);
const populationOf = id => populations.get(id) ?? 0;

assert.equal(selectNarrationBasis(edge, { populationOf }).surface_id, 'vote-leave-data-science-2016');
assert.equal(selectNarrationBasis(edge, { asOf: '2020', populationOf }).surface_id,
  'bounded-policy-session-2020',
  '2020 narration must not substitute the smaller 2016 surface');
assert.equal(selectNarrationBasis(edge, { asOf: '2016', populationOf }).surface_id,
  'vote-leave-data-science-2016',
  '2016 narration must not substitute the later No. 10 surface');
assert.equal(narrationBasesForSlice(edge, '2020').length, 1,
  'out-of-slice bases must not count as additional contemporaneous surfaces');

const partiallyDated = {
  temporal_status: 'partially_dated',
  valid_from: '2015-01-01',
  valid_until: '2019-12-31',
};
assert.equal(narrationWindowText(partiallyDated), '(co-presence dates not fully documented)');
assert.doesNotMatch(narrationWindowText(partiallyDated), /2015|2019/,
  'a surface or one participant\'s bounds must not be rendered as shared co-presence dates');

console.log('narrate-hops.test: OK');
