#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const clone = value => structuredClone(value);

const policy = readJson('data/project/lake-allocator-war-targeted-closure-wave-26-policy.json');
const sourceProjectionRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const sourcePlanRaw = fs.readFileSync(policy.paths.source_plan, 'utf8');
const sourceProjection = JSON.parse(sourceProjectionRaw);
const sourcePlan = JSON.parse(sourcePlanRaw);
const queueRowsByPath = Object.fromEntries(
  sourceProjection.queues.map(queue => [queue.queue_path, readJsonl(queue.queue_path)])
);
const resultRowsByPath = Object.fromEntries(
  sourceProjection.queues.map(queue => [
    policy.paths.result_root + '/' + queue.source_queue_ref.toLowerCase() + '.jsonl',
    readJsonl(policy.paths.result_root + '/' + queue.source_queue_ref.toLowerCase() + '.jsonl')
  ])
);
const baseline = {
  policy,
  sourceProjection,
  sourcePlan,
  sourceProjectionRaw,
  sourcePlanRaw,
  projection: readJson(policy.paths.projection),
  queueRowsByPath,
  resultRowsByPath,
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};

const errorsFor = state => validateArtifacts(state);
assert.deepEqual(errorsFor(baseline), [], 'Wave 26 baseline must validate');

const firstResultPath = Object.keys(baseline.resultRowsByPath).sort()[0];
const firstResult = state => state.resultRowsByPath[firstResultPath].find(row => row.row_type === 'closure_execution_result');
const firstSummary = state => state.resultRowsByPath[firstResultPath].find(row => row.row_type === 'closure_execution_queue');
const blockedResult = state => Object.values(state.resultRowsByPath)
  .flat()
  .find(row => row.row_type === 'closure_execution_result' && row.executed_in_wave === false);

const mutations = [
  ['duplicate source reference', state => { state.sourcePlan.source_registry[1].source_ref = state.sourcePlan.source_registry[0].source_ref; }],
  ['duplicate task plan', state => { state.sourcePlan.task_plans[1].closure_ref = state.sourcePlan.task_plans[0].closure_ref; }],
  ['remove ready task plan', state => { state.sourcePlan.task_plans.shift(); }],
  ['plan a blocked task', state => {
    const blocked = Object.values(state.queueRowsByPath).flat().find(row => row.row_type === 'closure_task' && row.execution_state === state.policy.execution_law.blocked_source_state);
    state.sourcePlan.task_plans.push({ ...state.sourcePlan.task_plans[0], closure_ref: blocked.closure_ref });
  }],
  ['use unknown source reference', state => { state.sourcePlan.task_plans[0].source_refs = ['LAW26-UNKNOWN']; }],
  ['claim source bytes', state => { state.sourcePlan.source_registry[0].source_bytes_preserved = true; }],
  ['change source plan hash', state => { state.projection.generated_from.source_plan_sha256 = '0'.repeat(64); }],
  ['change source projection hash', state => { state.projection.generated_from.source_projection_sha256 = '0'.repeat(64); }],
  ['change queue denominator', state => { state.projection.counts.source_queues = 10; }],
  ['change executed denominator', state => { state.projection.counts.executed_tasks = 35; }],
  ['change result-state count', state => { state.projection.counts.result_states.partial = 25; }],
  ['change downstream-state count', state => { state.projection.counts.downstream_states.unblocked_for_next_wave = 1; }],
  ['change result ledger hash', state => { state.projection.queues[0].result_sha256 = '0'.repeat(64); }],
  ['change result ledger row count', state => { state.projection.queues[0].result_rows += 1; }],
  ['change source task reference', state => { firstResult(state).source_task_ref = 'LAW21-BROKEN/T99'; }],
  ['change planned result state', state => { firstResult(state).result_state = 'complete'; }],
  ['change planned source references', state => { firstResult(state).source_refs.pop(); }],
  ['change coverage statement', state => { firstResult(state).coverage_statement = 'invented'; }],
  ['execute a blocked task', state => { const row = blockedResult(state); row.executed_in_wave = true; row.result_state = 'partial'; }],
  ['remove blocked task preservation', state => { blockedResult(state).source_refs = ['LAW26-S001']; }],
  ['enable same-wave execution', state => { state.policy.execution_law.same_wave_downstream_execution = true; }],
  ['change public-interest gate result', state => {
    const plan = state.sourcePlan.task_plans.find(row => row.closure_ref === 'LAW25-LAW21-EST-05/C02');
    plan.result_state = 'partial';
  }],
  ['change legislative gate result', state => {
    const plan = state.sourcePlan.task_plans.find(row => row.closure_ref === 'LAW25-LAW21-EST-11/C02');
    plan.result_state = 'partial';
  }],
  ['claim complete denominator', state => { firstResult(state).complete_denominator = true; }],
  ['claim evidence adjudication', state => { firstResult(state).evidence_adjudicated = true; }],
  ['create evidence row', state => { firstResult(state).evidence_rows = 1; }],
  ['promote finding', state => { firstResult(state).finding_promoted = true; }],
  ['create graph effect', state => { firstResult(state).graph_effect = 'created'; }],
  ['clear publication', state => { firstResult(state).publication_status = 'cleared'; }],
  ['remove blocked promotion', state => { firstResult(state).blocked_promotions.pop(); }],
  ['change queue result counts', state => { firstSummary(state).executed_task_count -= 1; }],
  ['remove source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== state.policy.paths.source_plan);
  }],
  ['remove generated path contract', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths =
      state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== state.policy.paths.projection);
  }],
  ['remove Wave 26 evidence boundary', state => { delete state.wave21Policy.boundaries.wave_26_closure_result_is_evidence_row; }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = errorsFor(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war targeted closure Wave 26 adversarial mutations passed: ' + mutations.length);
