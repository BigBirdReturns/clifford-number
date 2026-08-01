#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-estate-execution-wave-22.mjs';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const sourceRaw = fs.readFileSync(path.join(root, 'data/project/lake-allocator-war-estate-acquisition-registry-wave-21.jsonl'), 'utf8');
const sourceRows = sourceRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const baseline = {
  policy: readJson('data/project/lake-allocator-war-estate-execution-wave-22-policy.json'),
  sourceRows,
  sourceRaw,
  projection: readJson('build/lake-actions/allocator-war-estate-execution-wave-22.json'),
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};
const clone = value => structuredClone(value);
const errorsFor = state => validateArtifacts(state);
assert.deepEqual(errorsFor(clone(baseline)), [], 'Wave 22 baseline should validate');

const mutations = [
  ['drop estate queue', state => { state.projection.queues.pop(); }],
  ['duplicate estate feed', state => { state.projection.queues[1].allocator_estate_feed_id = state.projection.queues[0].allocator_estate_feed_id; }],
  ['drop acquisition task', state => { state.projection.queues[0].tasks.pop(); }],
  ['duplicate task reference', state => { state.projection.queues[0].tasks[1].task_ref = state.projection.queues[0].tasks[0].task_ref; }],
  ['change priority', state => { const task = state.projection.queues[0].tasks[0]; task.priority_tier = task.priority_tier === 'P0' ? 'P1' : 'P0'; }],
  ['change acquisition target', state => { state.projection.queues[0].tasks[0].acquisition_target = 'invented target'; }],
  ['inflate task authority', state => { state.projection.queues[0].tasks[0].task_authority = 'adjudicated'; }],
  ['drop allowed result', state => { state.projection.queues[0].tasks[0].allowed_results.pop(); }],
  ['drop blocked promotion', state => { state.projection.queues[0].tasks[0].blocked_promotions.pop(); }],
  ['remove controls', state => { state.projection.queues[0].tasks[0].controls_and_refusals_required = false; }],
  ['promote finding', state => { state.projection.queues[0].tasks[0].finding_promoted = true; }],
  ['create graph effect', state => { state.projection.queues[0].tasks[0].graph_effect = 'edge'; }],
  ['clear publication', state => { state.projection.queues[0].tasks[0].publication_status = 'cleared'; }],
  ['change queue class', state => { state.projection.queues[0].queue_class = 'adjudicated_queue'; }],
  ['unknown source authority', state => { state.sourceRows[0].route_authority = 'invented_authority'; }],
  ['launder unreviewed source', state => {
    const row = state.sourceRows.find(item => item.route_authority === 'unreviewed_wave_02_acquisition_only');
    row.reviewed_source_observation_refs.push('SSC-OBS-0001');
  }],
  ['change source digest', state => { state.projection.generated_from.source_registry_sha256 = '0'.repeat(64); }],
  ['inflate task count', state => { state.projection.counts.acquisition_tasks += 1; }],
  ['remove generated path contract', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths =
      state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== state.policy.paths.projection);
  }],
  ['remove source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(item => item.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== 'data/project/lake-allocator-war-estate-execution-wave-22-policy.json');
  }],
  ['change expected task denominator', state => { state.policy.expected_counts.acquisition_tasks += 1; }],
  ['introduce machine identifier', state => { state.projection.queues[0].tasks[0].invented_id = 'LAW22-X'; }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = errorsFor(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war estate execution Wave 22 adversarial mutations passed: ' + mutations.length);
