#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadWave04State, validateWave04State } from '../tools/validate-counter-selector-wave-04.mjs';

const baseline = loadWave04State();
validateWave04State(baseline);

const mutations = [
  ['drops a packet plan', (state) => { state.contract.packet_review_plans.pop(); }],
  ['duplicates a packet plan', (state) => { state.contract.packet_review_plans[1].packet_id = state.contract.packet_review_plans[0].packet_id; }],
  ['drops a review pass definition', (state) => { state.contract.review_passes.pop(); }],
  ['claims external human independence', (state) => { state.contract.reviewer_independence.external_human_independence_claimed = true; }],
  ['allows the private map during review', (state) => { state.contract.synthesis_rules.private_map_available_during_blind_passes = true; }],
  ['averages review outputs', (state) => { state.contract.synthesis_rules.average_review_scores = true; }],
  ['changes the parent release digest', (state) => { state.contract.parent_release_sha256 = '0'.repeat(64); }],
  ['drops a packet review', (state) => { state.reviewRegistry.packet_reviews.pop(); }],
  ['drops one review pass', (state) => { state.reviewRegistry.packet_reviews[0].review_passes.pop(); }],
  ['leaks candidate identity into a pass', (state) => { state.reviewRegistry.packet_reviews[0].review_passes[0].candidate_id = 'CS-C0016'; }],
  ['leaks denominator class into a pass', (state) => { state.reviewRegistry.packet_reviews[0].review_passes[0].denominator_class = 'high_status_selected_operators'; }],
  ['claims external independence in a pass', (state) => { state.reviewRegistry.packet_reviews[0].review_passes[0].external_independence_claimed = true; }],
  ['changes the public-input digest', (state) => { state.reviewRegistry.packet_reviews[0].review_passes[0].input_digest = 'f'.repeat(64); }],
  ['changes review input fields', (state) => { state.reviewRegistry.packet_reviews[0].review_passes[0].input_fields.push('candidate_id'); }],
  ['promotes support-adjusted surplus', (state) => { state.reviewRegistry.packet_reviews[0].dimension_vector.support_adjusted_surplus = 'bounded_support'; }],
  ['promotes custody without handoff', (state) => { state.reviewRegistry.packet_reviews[0].dimension_vector.custody = 'bounded_support'; }],
  ['adds a third bounded dimension', (state) => { state.reviewRegistry.packet_reviews[0].dimension_vector.cross_domain_transfer = 'bounded_support'; }],
  ['attributes an operator dimension to the mechanism packet', (state) => { state.reviewRegistry.packet_reviews[1].dimension_vector.custody = 'bounded_support'; }],
  ['claims durable partnership repair', (state) => { state.reviewRegistry.packet_reviews[1].mechanism_observations.durable_partnership_repair_observed = true; }],
  ['rewrites the historical class', (state) => { state.reviewRegistry.packet_reviews[1].class_reassignment_recommendation.rewrites_historical_class = true; }],
  ['authorizes a field test', (state) => { state.reviewRegistry.packet_reviews[0].field_test_eligible = true; }],
  ['creates an operator finding', (state) => { state.reviewRegistry.packet_reviews[0].operator_finding = true; }],
  ['drops a disagreement', (state) => { state.disagreementLedger.disagreements.pop(); }],
  ['erases the adversarial countermodel', (state) => { state.reviewRegistry.packet_reviews[0].review_passes[1].ordinary_explanations = []; }],
  ['drifts report counts', (state) => { state.report.counts.bounded_dimension_supports = 3; }],
  ['drifts a manifest hash', (state) => { state.manifest.entries[0].sha256 = 'e'.repeat(64); }]
];

for (const [name, mutate] of mutations) {
  const state = structuredClone(baseline);
  mutate(state);
  assert.throws(() => validateWave04State(state), undefined, name);
}

console.log(`counter-selector-wave-04.test: PASS (${mutations.length} adversarial mutations)`);
