#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const clone = value => structuredClone(value);
const policyPath = 'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json';
const policy = readJson(policyPath);
const sourceRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const baseline = {
  policy,
  sourceProjection: JSON.parse(sourceRaw),
  sourceRaw,
  projection: readJson(policy.paths.projection),
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};

const errorsFor = state => validateArtifacts({
  policy: state.policy,
  sourceProjection: state.sourceProjection,
  sourceRaw: state.sourceRaw,
  projection: state.projection,
  wave21Policy: state.wave21Policy
});

assert.deepEqual(errorsFor(baseline), [], 'Wave 23 baseline must validate');

const mutations = [
  ['change packet reference', state => { state.projection.packets[0].packet_ref = 'LAW23-BROKEN'; }],
  ['change packet sequence', state => { state.projection.packets[0].packet_sequence = 99; }],
  ['change source task', state => { state.projection.packets[0].source_task_ref = 'LAW21-EST-01/T99'; }],
  ['change consumer', state => { state.projection.packets[0].consumer_key = 'wrong-estate'; }],
  ['change queue authority', state => { state.projection.packets[0].queue_class = 'reviewed_execution_queue'; }],
  ['change task authority', state => { state.projection.packets[0].task_authority = 'invented'; }],
  ['change selected priority', state => { state.projection.packets[0].selection_priority = 'P2'; }],
  ['change selection rule', state => { state.projection.packets[0].selection_rule = 'manual'; }],
  ['change acquisition target', state => { state.projection.packets[0].acquisition_target = 'invented target'; }],
  ['change allowed result states', state => { state.projection.packets[0].allowed_results.pop(); }],
  ['change source families', state => { state.projection.packets[0].source_families.pop(); }],
  ['change query seed', state => { state.projection.packets[0].query_seed = 'invented query'; }],
  ['change result ledger path', state => { state.projection.packets[0].result_ledger_path = 'data/other.jsonl'; }],
  ['claim execution complete', state => { state.projection.packets[0].execution_state = 'complete'; }],
  ['create evidence row', state => { state.projection.packets[0].result_rows = 1; }],
  ['claim evidence adjudication', state => { state.projection.packets[0].evidence_adjudicated = true; }],
  ['remove controls', state => { state.projection.packets[0].controls_and_refusals_required = false; }],
  ['remove blocked promotion', state => { state.projection.packets[0].blocked_promotions.pop(); }],
  ['remove receipt field', state => { state.projection.packets[0].receipt_contract.required_fields.pop(); }],
  ['disable primary-source requirement', state => { state.projection.packets[0].search_protocol.primary_source_required = false; }],
  ['change packet denominator', state => { state.projection.counts.lead_packets = 10; }],
  ['change evidence denominator', state => { state.projection.counts.evidence_rows = 1; }],
  ['remove Wave 23 basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== policyPath);
  }],
  ['authorize graph effect', state => { state.projection.boundaries.graph_effect = 'created'; }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = errorsFor(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war lead acquisition Wave 23 adversarial mutations passed: ' + mutations.length);
