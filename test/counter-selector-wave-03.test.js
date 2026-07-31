#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadWave03State, validateWave03State } from '../tools/validate-counter-selector-wave-03.mjs';

const baseline = loadWave03State();
validateWave03State(baseline);

const mutations = [
  ['drops one candidate', (state) => { state.contract.candidates.pop(); }],
  ['duplicates one denominator class', (state) => { state.contract.candidates[1].denominator_class = state.contract.candidates[0].denominator_class; }],
  ['duplicates a source packet ID', (state) => { state.contract.source_packets[1].source_id = state.contract.source_packets[0].source_id; }],
  ['admits a non-official source host', (state) => { state.contract.source_packets[0].url = 'https://example.com/not-official'; }],
  ['changes the source-packet denominator', (state) => { state.contract.source_packets.pop(); }],
  ['promotes a partial acquisition', (state) => { state.contract.candidates[0].qualification = 'qualifying_for_blind_packet'; }],
  ['removes a candidate falsifier', (state) => { state.contract.candidates[0].falsifier = ''; }],
  ['removes missing-receipt custody', (state) => { state.contract.candidates[0].missing_receipts = []; }],
  ['drops a blind packet', (state) => { state.blindPacketRegistry.packets.pop(); }],
  ['adds an extra blind packet', (state) => { state.blindPacketRegistry.packets.push(structuredClone(state.blindPacketRegistry.packets[0])); }],
  ['leaves identity in a packet', (state) => { state.blindPacketRegistry.packets[0].identity_removed = false; }],
  ['leaves status cues in a packet', (state) => { state.blindPacketRegistry.packets[0].status_cues_removed = false; }],
  ['leaves source identifiers in a packet', (state) => { state.blindPacketRegistry.packets[0].source_ids_removed = false; }],
  ['claims a blind review', (state) => { state.blindPacketRegistry.packets[0].blind_review_executed = true; }],
  ['authorizes a field test', (state) => { state.blindPacketRegistry.packets[0].field_test_authorized = true; }],
  ['creates a graph effect', (state) => { state.acquisitionRegistry.candidates[0].graph_effect = 'edge_created'; }],
  ['changes the parent release digest', (state) => { state.contract.parent_release_sha256 = '0'.repeat(64); }],
  ['drifts report counts', (state) => { state.report.counts.qualifying_acquisitions = 3; }],
  ['drifts a release-manifest hash', (state) => { state.manifest.entries[0].sha256 = 'f'.repeat(64); }],
  ['changes the acquisition batch', (state) => { state.contract.batch_id = 'CS-AQ-B02'; }],
  ['duplicates a blind token', (state) => { state.blindPacketRegistry.packets[1].blind_token = state.blindPacketRegistry.packets[0].blind_token; }],
  ['maps a packet to a partial acquisition', (state) => { state.blindPacketRegistry.private_map[0].candidate_id = 'CS-C0001'; }],
  ['authorizes public identity release', (state) => { state.contract.boundaries.public_identity_release_authorized = true; }],
  ['generates a promotion or rank', (state) => { state.acquisitionRegistry.candidates[0].promotion_generated = true; }]
];

for (const [name, mutate] of mutations) {
  const state = structuredClone(baseline);
  mutate(state);
  assert.throws(() => validateWave03State(state), undefined, name);
}

console.log(`counter-selector-wave-03.test: PASS (${mutations.length} adversarial mutations)`);
