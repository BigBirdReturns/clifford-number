#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveRegistry } from '../tools/build-counter-selector-wave-13.mjs';
import { validateRegistryObject } from '../tools/validate-counter-selector-wave-13.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-13-blind-review.json'), 'utf8'));
const parent = { packets: contract.records.map((row) => ({ packet_id: row.packet_id })) };
const clone = (value) => structuredClone(value);
const base = deriveRegistry(contract);
const op = 0;
const mech = 1;

const mutations = [
  (x) => { x.schema_version = 'bad'; },
  (x) => { x.program_id = 'bad'; },
  (x) => { x.wave_id = 'bad'; },
  (x) => { x.batch_id = 'bad'; },
  (x) => { x.counts.identity_minimized_packets_reviewed += 1; },
  (x) => { x.packet_results.pop(); },
  (x) => { x.packet_results[1].packet_id = x.packet_results[0].packet_id; },
  (x) => { x.packet_results[0].review_passes.pop(); },
  (x) => { x.packet_results[0].review_passes[0].fresh_context = false; },
  (x) => { x.packet_results[0].review_passes[0].external_independence_claimed = true; },
  (x) => { delete x.packet_results[0].dimension_vector.epistemic_restraint; },
  (x) => { x.counts.bounded_dimension_supports += 1; },
  (x) => { x.packet_results[0].field_test_eligible = true; },
  (x) => { x.packet_results[0].operator_finding = true; },
  (x) => { x.packet_results[0].person_or_partnership_finding = true; },
  (x) => { x.packet_results[0].graph_effect = 'edge'; },
  (x) => { x.packet_results[0].analysis_class_recommendation.rewrites_historical_class = true; },
  (x) => { x.packet_results[0].analysis_class_recommendation.historical_class = 'wrong'; },
  (x) => { x.packet_results[op].packet_kind = 'system_mechanism_packet'; },
  (x) => { x.packet_results[mech].dimension_vector.exception_handling = 'bounded_support_illegal'; },
  (x) => { x.packet_results[op].new_bounded_dimension_supports = 0; },
  (x) => { x.packet_results[mech].mechanism_observations = null; },
  (x) => { x.packet_results[op].mechanism_observations = { invented: true }; },
  (x) => { contract.disagreements.pop(); },
  (x) => { contract.disagreements[0].packet_id = 'missing'; },
  (x) => { x.independence.external_human_independence_claimed = true; },
  (x) => { contract.boundaries.blind_review_is_operator_selection = true; },
  (x) => { contract.boundaries.procedural_separation_is_external_independence = true; },
  (x) => { contract.boundaries.review_authorizes_field_test = true; },
  (x) => { contract.boundaries.aggregate_rank_generated = true; },
  (x) => { contract.boundaries.graph_effect = 'edge'; },
  (x) => { x.counts.promotions = 1; },
  (x) => { x.counts.person_rankings = 1; },
  (x) => { x.counts.public_identity_releases = 1; }
];

let passed = 0;
for (const mutate of mutations) {
  const registry = clone(base);
  const localContract = clone(contract);
  // The last eleven mutations target the contract rather than registry.
  const index = passed;
  if (index === 23) localContract.disagreements.pop();
  else if (index === 24) localContract.disagreements[0].packet_id = 'missing';
  else if (index === 26) localContract.boundaries.blind_review_is_operator_selection = true;
  else if (index === 27) localContract.boundaries.procedural_separation_is_external_independence = true;
  else if (index === 28) localContract.boundaries.review_authorizes_field_test = true;
  else if (index === 29) localContract.boundaries.aggregate_rank_generated = true;
  else if (index === 30) localContract.boundaries.graph_effect = 'edge';
  else mutate(registry);
  assert.throws(() => validateRegistryObject(registry, localContract, parent));
  passed += 1;
}
assert.equal(passed, 34);
console.log(`counter-selector-wave-13.test: PASS (${passed} adversarial mutations)`);
