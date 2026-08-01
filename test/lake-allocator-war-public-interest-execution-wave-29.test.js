#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-public-interest-execution-wave-29.mjs';
import { resultPathFor } from '../tools/build-lake-allocator-war-public-interest-execution-wave-29.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const clone = value => structuredClone(value);
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const digest = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const graphDigestView = () => ({
  participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
  active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
  hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
  rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
});

const policy = readJson('data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json');
const sourceProjectionRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const sourcePlanRaw = fs.readFileSync(policy.paths.source_plan, 'utf8');
const sourceProjection = JSON.parse(sourceProjectionRaw);
const baseline = {
  policy,
  sourceProjection,
  sourceProjectionRaw,
  sourcePlan: JSON.parse(sourcePlanRaw),
  sourcePlanRaw,
  inheritedRegistry: readJson(policy.paths.inherited_source_registry),
  queueRowsByPath: Object.fromEntries(sourceProjection.queues.map(queue => [queue.result_path, readJsonl(queue.result_path)])),
  projection: readJson(policy.paths.projection),
  resultRowsByPath: Object.fromEntries(sourceProjection.queues.map(queue => {
    const relative = resultPathFor(queue.queue_ref, policy);
    return [relative, readJsonl(relative)];
  })),
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json'),
  graphDigestView: graphDigestView()
};

assert.deepEqual(validateArtifacts(baseline), [], 'Wave 29 baseline must validate');

const firstLedgerPath = Object.keys(baseline.resultRowsByPath).sort()[0];
const firstResult = state => state.resultRowsByPath[firstLedgerPath].find(row => row.row_type === 'implementation_execution_result');
const firstSummary = state => state.resultRowsByPath[firstLedgerPath].find(row => row.row_type === 'implementation_execution_queue');
const firstSourceTask = state => Object.values(state.queueRowsByPath).flat().find(row => row.row_type === 'implementation_closure_task');
const unavailablePlan = state => state.policy.source_contract.task_plans.find(row => row.result_state === 'unavailable_after_search');

const mutations = [
  ['duplicate inherited source reference', state => { state.policy.source_contract.inherited_source_refs[1] = state.policy.source_contract.inherited_source_refs[0]; }],
  ['remove inherited source from prior registry', state => { state.inheritedRegistry.source_registry = state.inheritedRegistry.source_registry.filter(row => row.source_ref !== 'LAW24-S012'); }],
  ['duplicate new source reference', state => { state.policy.source_contract.new_source_registry[1].source_ref = state.policy.source_contract.new_source_registry[0].source_ref; }],
  ['claim source bytes', state => { state.policy.source_contract.new_source_registry[0].source_bytes_preserved = true; }],
  ['remove source issuing body', state => { state.policy.source_contract.new_source_registry[0].issuing_body = ''; }],
  ['duplicate task plan', state => { state.policy.source_contract.task_plans[1].task_ref = state.policy.source_contract.task_plans[0].task_ref; }],
  ['remove task plan', state => { state.policy.source_contract.task_plans.pop(); }],
  ['use unknown source reference', state => { state.policy.source_contract.task_plans[0].source_refs = ['LAW29-UNKNOWN']; }],
  ['permit complete result', state => { state.policy.execution_law.complete_result_permitted = true; }],
  ['change unavailable result to complete', state => { unavailablePlan(state).result_state = 'complete'; }],
  ['remove negative search', state => { state.policy.source_contract.task_plans[0].negative_search_statement = ''; }],
  ['change expected result denominator', state => { state.policy.expected_counts.result_states.partial = 10; }],
  ['change expected source count', state => { state.policy.expected_counts.source_receipts = 33; }],
  ['change expected source-use count', state => { state.policy.expected_counts.source_receipt_uses = 99; }],
  ['make Wave 28 task non-executable', state => { firstSourceTask(state).execution_state = 'blocked'; }],
  ['inflate Wave 28 source denominator', state => { firstSourceTask(state).complete_denominator = true; }],
  ['change source-plan source count', state => { state.sourcePlan.counts.source_receipts = 33; }],
  ['change source-plan task plan', state => { state.sourcePlan.task_plans[0].coverage_statement = 'invented'; }],
  ['change source-plan boundary', state => { state.sourcePlan.boundaries.partial_is_complete = true; }],
  ['change projected task count', state => { state.projection.counts.source_tasks = 11; }],
  ['change projected result count', state => { state.projection.counts.result_states.partial = 10; }],
  ['change projected source-plan hash', state => { state.projection.generated_from.source_plan_sha256 = '0'.repeat(64); }],
  ['change result ledger hash', state => { state.projection.queues[0].result_sha256 = '0'.repeat(64); }],
  ['remove result row', state => { state.resultRowsByPath[firstLedgerPath].pop(); }],
  ['change result source task reference', state => { firstResult(state).source_task_ref = 'LAW28-BROKEN'; }],
  ['change result state', state => { firstResult(state).result_state = 'contradicted'; }],
  ['change result sources', state => { firstResult(state).source_refs.pop(); }],
  ['claim complete denominator', state => { firstResult(state).complete_denominator = true; }],
  ['adjudicate evidence', state => { firstResult(state).evidence_adjudicated = true; }],
  ['adopt estate', state => { firstResult(state).estate_adopted = true; }],
  ['promote finding', state => { firstResult(state).finding_promoted = true; }],
  ['create graph effect', state => { firstResult(state).graph_effect = 'created'; }],
  ['clear publication', state => { firstResult(state).publication_status = 'cleared'; }],
  ['remove blocked promotion', state => { firstResult(state).blocked_promotions.pop(); }],
  ['change queue summary count', state => { firstSummary(state).executed_task_count -= 1; }],
  ['remove Wave 29 source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== state.policy.paths.source_plan);
  }],
  ['remove Wave 29 generated path', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths =
      state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== state.policy.paths.projection);
  }],
  ['remove Wave 29 evidence boundary', state => { delete state.wave21Policy.boundaries.wave_29_execution_result_is_evidence_row; }],
  ['change graph digest', state => { state.graphDigestView.hop_edges_sha256 = '0'.repeat(64); }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war public-interest execution Wave 29 adversarial mutations passed: ' + mutations.length);
