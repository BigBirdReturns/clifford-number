#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readJson } from '../tools/build-counter-selector-wave-25.mjs';
import { validateSource } from '../tools/validate-counter-selector-wave-25.mjs';

const SOURCE_PATH = 'data/project/counter-selector-wave-25-support-adjusted-surplus.json';
const original = readJson(SOURCE_PATH);
const clone = value => structuredClone(value);
const mutations = [];

for (const key of Object.keys(original.boundaries).filter(key => key !== 'graph_effect')) {
  mutations.push({
    label: `boundary:${key}`,
    apply(value) { value.boundaries[key] = true; }
  });
}

const extra = [
  ['complete operator', value => { value.candidate.complete_operator_finding = true; }],
  ['field test', value => { value.candidate.field_test_eligible = true; }],
  ['rank', value => { value.candidate.rank = 1; }],
  ['candidate graph', value => { value.candidate.graph_effect = 'person_edge'; }],
  ['top graph', value => { value.graph_effect = 'person_edge'; }],
  ['remove unresolved', value => { value.candidate.unresolved_dimensions = []; }],
  ['remove supported', value => { value.candidate.supported_dimensions.pop(); }],
  ['add surplus dimension', value => { value.candidate.supported_dimensions.unshift('support_adjusted_surplus'); }],
  ['surplus state', value => { value.candidate.support_adjusted_surplus_state = 'bounded_observation'; }],
  ['support added', value => { value.counts.support_adjusted_surplus_supports_added = 1; }],
  ['valid comparator count', value => { value.counts.valid_resource_normalized_comparators = 1; }],
  ['partial count', value => { value.counts.partial_comparator_lanes = 3; }],
  ['inadmissible count', value => { value.counts.inadmissible_comparator_lanes = 0; }],
  ['absent count', value => { value.counts.absent_comparator_lanes = 0; }],
  ['tested count', value => { value.counts.comparator_lanes_tested = 3; }],
  ['valid comparator lane', value => { value.comparator_lanes[0].admissibility = 'valid'; }],
  ['lane supports surplus', value => { value.comparator_lanes[0].support_adjusted_surplus_supported = true; }],
  ['external response', value => { value.counts.external_review_responses_received = 1; }],
  ['external review', value => { value.counts.external_selector_reviews_executed = 1; }],
  ['direct handoff', value => { value.counts.direct_handoff_receipts = 1; }],
  ['contact', value => { value.counts.source_subject_contacts = 1; }],
  ['followup', value => { value.counts.custodian_followups_authorized = 1; }],
  ['promotion', value => { value.counts.promotions = 1; }],
  ['ranking', value => { value.counts.person_rankings = 1; }]
];

for (const [label, apply] of extra) mutations.push({ label, apply });
assert.equal(mutations.length, 64);

for (const mutation of mutations) {
  const value = clone(original);
  mutation.apply(value);
  assert.throws(() => validateSource(value), undefined, mutation.label);
}

validateSource(original);
console.log(`counter-selector-wave-25.test: ${mutations.length} adversarial mutations refused`);
