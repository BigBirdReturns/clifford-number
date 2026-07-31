#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateObjects } from '../tools/validate-counter-selector-wave-07.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const clone = (value) => structuredClone(value);

const base = {
  contract: read('data/project/counter-selector-wave-07-batch-02.json'),
  sources: read('data/project/counter-selector-wave-07-source-registry.json'),
  acquisition: read('data/project/counter-selector-artifact-acquisition-b02-registry.json'),
  packets: read('data/project/counter-selector-blind-packet-registry-b02.json')
};

const mutations = [
  (o) => { o.contract.expected_counts.batch_objects = 7; },
  (o) => { o.contract.candidate_results.pop(); },
  (o) => { o.contract.candidate_results[1].candidate_id = o.contract.candidate_results[0].candidate_id; },
  (o) => { o.contract.candidate_results[0].denominator_class = 'ordinary_specialists'; },
  (o) => { o.contract.candidate_results[0].source_ids = ['CS-W07-S999']; },
  (o) => { o.sources.sources[1].source_id = o.sources.sources[0].source_id; },
  (o) => { o.sources.sources.pop(); },
  (o) => { o.acquisition.candidates.find((r) => r.candidate_id === 'CS-C0002').qualification = 'qualifying_for_blind_packet'; },
  (o) => { o.acquisition.candidates.find((r) => r.candidate_id === 'CS-C0007').qualification = 'qualifying_for_blind_packet'; },
  (o) => { o.acquisition.candidates.find((r) => r.candidate_id === 'CS-C0012').qualification = 'partial_not_blind_ready'; },
  (o) => { o.acquisition.candidates.find((r) => r.candidate_id === 'CS-C0017').qualification = 'partial_not_blind_ready'; },
  (o) => { o.acquisition.candidates.find((r) => r.candidate_id === 'CS-C0022').packet_kind = 'operator_artifact_packet'; },
  (o) => { o.acquisition.candidates.find((r) => r.candidate_id === 'CS-C0027').packet_kind = 'operator_artifact_packet'; },
  (o) => { o.packets.packets[0].identity_removed = false; },
  (o) => { o.packets.packets[0].source_ids = ['CS-W07-S005']; },
  (o) => { o.packets.packets[0].candidate_id = 'CS-C0012'; },
  (o) => { o.packets.private_map.pop(); },
  (o) => { o.packets.counts.blind_reviews_executed = 1; },
  (o) => { o.packets.packets[0].field_test_authorized = true; },
  (o) => { o.packets.counts.promotions = 1; },
  (o) => { o.packets.counts.person_rankings = 1; },
  (o) => { o.packets.packets[0].graph_effect = 'edge'; },
  (o) => { o.packets.packets[0].public_identity_release_authorized = true; },
  (o) => { o.acquisition.counts.mechanism_only_packets = 1; },
  (o) => { o.acquisition.counts.blind_packets_ready = 3; },
  (o) => { o.sources.sources[0].supports = []; },
  (o) => { o.sources.sources[0].limits = []; },
  (o) => { o.contract.boundaries.source_summary_is_artifact = true; },
  (o) => { o.contract.boundaries.mechanism_packet_is_person_finding = true; },
  (o) => { o.acquisition.boundaries.field_test_authorized = true; }
];

for (const mutate of mutations) {
  const o = clone(base);
  mutate(o);
  assert.throws(() => validateObjects(o.contract, o.sources, o.acquisition, o.packets));
}

assert.equal(mutations.length, 30);
console.log(`counter-selector-wave-07.test: PASS (${mutations.length} adversarial mutations refused)`);
