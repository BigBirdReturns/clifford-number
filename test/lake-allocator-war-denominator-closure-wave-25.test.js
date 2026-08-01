#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const clone = value => structuredClone(value);

const policy = readJson('data/project/lake-allocator-war-denominator-closure-wave-25-policy.json');
const sourcePlanRaw = fs.readFileSync(policy.paths.source_plan, 'utf8');
const sourceProjectionRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const projection = readJson(policy.paths.projection);
const queueRowsByPath = {};
const queueRawByPath = {};
for (const queue of projection.queues) {
  queueRawByPath[queue.queue_path] = fs.readFileSync(queue.queue_path, 'utf8');
  queueRowsByPath[queue.queue_path] = readJsonl(queue.queue_path);
}

const baseline = {
  policy,
  sourcePlan: JSON.parse(sourcePlanRaw),
  sourcePlanRaw,
  sourceProjection: JSON.parse(sourceProjectionRaw),
  sourceProjectionRaw,
  projection,
  queueRowsByPath,
  queueRawByPath,
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};

const errorsFor = state => validateArtifacts({
  policy: state.policy,
  sourcePlan: state.sourcePlan,
  sourcePlanRaw: state.sourcePlanRaw,
  sourceProjection: state.sourceProjection,
  sourceProjectionRaw: state.sourceProjectionRaw,
  projection: state.projection,
  queueRowsByPath: state.queueRowsByPath,
  queueRawByPath: state.queueRawByPath,
  wave21Policy: state.wave21Policy
});

assert.deepEqual(errorsFor(baseline), [], 'Wave 25 baseline must validate');

const namedQueue = baseline.projection.queues.find(row => row.queue_state === policy.execution_law.named_gate_queue_state);
const gateQueue = baseline.projection.queues.find(row => row.queue_state === policy.execution_law.gate_unspecified_queue_state);
const firstNamedTask = baseline.queueRowsByPath[namedQueue.queue_path][1];
const gateRows = baseline.queueRowsByPath[gateQueue.queue_path];
const gateTaskIndex = gateRows.findIndex(row => row.row_type === 'closure_task' && row.task_class === 'gate_identification');
const blockedTaskIndex = gateRows.findIndex(row => row.row_type === 'closure_task' && row.execution_state === policy.execution_law.downstream_gate_unspecified_state);

const mutations = [
  ['duplicate source packet plan', state => { state.sourcePlan.packet_plans[1].packet_ref = state.sourcePlan.packet_plans[0].packet_ref; }],
  ['remove source packet plan', state => { state.sourcePlan.packet_plans.pop(); }],
  ['remove unavailable obligation', state => { state.sourcePlan.packet_plans[0].unavailable_rows.pop(); }],
  ['duplicate source execution packet', state => { state.sourceProjection.executions[1].packet_ref = state.sourceProjection.executions[0].packet_ref; }],
  ['remove source execution packet', state => { state.sourceProjection.executions.pop(); }],
  ['change source-plan hash', state => { state.projection.generated_from.source_plan_sha256 = '0'.repeat(64); }],
  ['change source-projection hash', state => { state.projection.generated_from.source_projection_sha256 = '0'.repeat(64); }],
  ['change closure task count', state => { state.projection.counts.closure_tasks = 39; }],
  ['change closure row count', state => { state.projection.counts.closure_rows = 50; }],
  ['change ready task count', state => { state.projection.counts.ready_tasks = 35; }],
  ['change blocked task count', state => { state.projection.counts.blocked_tasks = 5; }],
  ['change gate task count', state => { state.projection.counts.gate_identification_tasks = 1; }],
  ['duplicate projection queue reference', state => { state.projection.queues[1].queue_ref = state.projection.queues[0].queue_ref; }],
  ['duplicate projection queue path', state => { state.projection.queues[1].queue_path = state.projection.queues[0].queue_path; }],
  ['change projection queue hash', state => { state.projection.queues[0].queue_sha256 = '0'.repeat(64); }],
  ['claim projection evidence row', state => { state.projection.queues[0].evidence_rows = 1; }],
  ['claim projection finding promotion', state => { state.projection.queues[0].finding_promoted = true; }],
  ['change queue summary consumer', state => { state.queueRowsByPath[namedQueue.queue_path][0].consumer_key = 'wrong-estate'; }],
  ['change queue summary state', state => { state.queueRowsByPath[namedQueue.queue_path][0].queue_state = 'blocked'; }],
  ['change queue summary task count', state => { state.queueRowsByPath[namedQueue.queue_path][0].closure_task_count -= 1; }],
  ['claim queue evidence adjudication', state => { state.queueRowsByPath[namedQueue.queue_path][0].evidence_adjudicated = true; }],
  ['change task target', state => { state.queueRowsByPath[namedQueue.queue_path][1].closure_target = 'invented target'; }],
  ['change task classification', state => { state.queueRowsByPath[namedQueue.queue_path][1].task_class = 'gate_identification'; }],
  ['change task priority', state => { state.queueRowsByPath[namedQueue.queue_path][1].priority_tier = 'G0'; }],
  ['block named-gate task', state => { state.queueRowsByPath[namedQueue.queue_path][1].execution_state = policy.execution_law.downstream_gate_unspecified_state; }],
  ['remove task source references', state => { state.queueRowsByPath[namedQueue.queue_path][1].source_refs = []; }],
  ['remove inherited refusal', state => { state.queueRowsByPath[namedQueue.queue_path][1].inherited_refused_rows.pop(); }],
  ['claim task evidence row', state => { state.queueRowsByPath[namedQueue.queue_path][1].evidence_rows = 1; }],
  ['claim task graph effect', state => { state.queueRowsByPath[namedQueue.queue_path][1].graph_effect = 'created'; }],
  ['block gate-identification task', state => { state.queueRowsByPath[gateQueue.queue_path][gateTaskIndex].execution_state = policy.execution_law.downstream_gate_unspecified_state; }],
  ['unblock downstream gate task', state => { state.queueRowsByPath[gateQueue.queue_path][blockedTaskIndex].execution_state = policy.execution_law.other_task_state; }],
  ['remove downstream blocking condition', state => { state.queueRowsByPath[gateQueue.queue_path][blockedTaskIndex].blocking_condition = null; }],
  ['convert gate target classification', state => { state.queueRowsByPath[gateQueue.queue_path][gateTaskIndex].task_class = 'denominator_closure'; }],
  ['remove Wave 25 source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== 'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json');
  }],
  ['remove generated queue authorization', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths =
      state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== namedQueue.queue_path);
  }],
  ['authorize evidence boundary', state => { state.projection.boundaries.closure_task_is_evidence_row = true; }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = errorsFor(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

assert.equal(firstNamedTask.execution_state, policy.execution_law.other_task_state);
console.log('allocator-war denominator closure Wave 25 adversarial mutations passed: ' + mutations.length);
