#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-17.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-17-function-attribution.json'), 'utf8'));
const clone = () => structuredClone(baseline);

const mutations = [
  ['operator finding', (x) => { x.counts.complete_operator_findings = 1; }],
  ['field-test candidate', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['contact authority', (x) => { x.counts.contacts_authorized = 1; }],
  ['collaboration authority', (x) => { x.counts.bounded_collaborations_authorized = 1; }],
  ['promotion', (x) => { x.counts.promotions = 1; }],
  ['person ranking', (x) => { x.counts.person_rankings = 1; }],
  ['public profile', (x) => { x.counts.public_identity_profiles = 1; }],
  ['graph effect', (x) => { x.counts.graph_effects = 1; }],
  ['external review executed count', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['review request sent count', (x) => { x.counts.external_review_requests_sent = 1; }],
  ['aggregate support added', (x) => { x.counts.aggregate_dimension_supports_added = 1; }],
  ['support assignment count', (x) => { x.counts.person_trace_support_assignments = 10; }],
  ['source count', (x) => { x.sources.pop(); }],
  ['function packet count', (x) => { x.function_packets.pop(); }],
  ['person attribution count', (x) => { x.person_traces.pop(); }],
  ['identity block count', (x) => { x.identity_blocks.pop(); }],
  ['review packet count', (x) => { x.external_review_packets.pop(); }],
  ['acquisition lane count', (x) => { x.acquisition_lanes.pop(); }],
  ['duplicate trace identity', (x) => { x.person_traces[1].trace_id = x.person_traces[0].trace_id; }],
  ['duplicate source id', (x) => { x.sources[1].source_id = x.sources[0].source_id; }],
  ['boisjoly elasticity removed', (x) => { x.person_traces[0].supported_dimensions = ['exception_handling','epistemic_restraint']; }],
  ['boisjoly gate control added', (x) => { x.person_traces[0].supported_dimensions.push('governed_capacity'); }],
  ['mcdonald governed capacity removed', (x) => { x.person_traces[1].supported_dimensions = ['epistemic_restraint']; }],
  ['mcdonald custody added', (x) => { x.person_traces[1].supported_dimensions.push('custody'); }],
  ['rocha exception handling removed', (x) => { x.person_traces[2].supported_dimensions = ['epistemic_restraint']; }],
  ['rocha later authorship made elasticity', (x) => { x.person_traces[2].supported_dimensions.push('model_elasticity'); }],
  ['febles custody removed', (x) => { x.person_traces[3].supported_dimensions = ['governed_capacity']; }],
  ['febles sole authorship', (x) => { x.person_traces[3].sole_technical_authorship_claimed = true; }],
  ['ndk inferred identity', (x) => { x.identity_blocks[0].named_person_inferred = true; }],
  ['liberty person support', (x) => { x.identity_blocks[1].person_support_assigned = true; }],
  ['review packet contact', (x) => { x.external_review_packets[0].contact_authorized = true; }],
  ['review packet executed', (x) => { x.external_review_packets[0].external_review_executed = true; }],
  ['review packet field test', (x) => { x.external_review_packets[0].field_test_authorized = true; }],
  ['review packet profile', (x) => { x.external_review_packets[0].public_identity_profile_authorized = true; }],
  ['acquisition lane contact', (x) => { x.acquisition_lanes[0].contact_authorized = true; }],
  ['acquisition lane graph', (x) => { x.acquisition_lanes[0].graph_effect = 'candidate_edge'; }],
  ['source limit removed', (x) => { x.sources[0].limits = []; }],
  ['denominator double count', (x) => { x.function_packets[0].denominator_object_double_counted = true; }],
  ['attribution becomes operator', (x) => { x.boundaries.source_identity_attribution_is_complete_operator = true; }],
  ['direct handoff manufactured', (x) => { x.boundaries.authored_warning_is_safe_handoff = true; }]
];

assert.equal(mutations.length, 40, 'expected 40 adversarial mutations');
validateContract(baseline);

for (const [name, mutate] of mutations) {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateContract(candidate), undefined, name);
}

console.log(`counter-selector-wave-17.test: ${mutations.length} adversarial mutations refused`);
