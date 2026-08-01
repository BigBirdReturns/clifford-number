#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs';
import { resultPathFor } from '../tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs';

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

const policyPath = 'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json';
const policyRaw = fs.readFileSync(policyPath, 'utf8');
const policy = JSON.parse(policyRaw);
const sourceProjectionRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const sourceLedgerRaw = fs.readFileSync(policy.paths.source_public_ledger, 'utf8');
const estateRegistryRaw = fs.readFileSync(policy.paths.estate_registry, 'utf8');
const baseline = {
  policy,
  sourceProjection: JSON.parse(sourceProjectionRaw),
  sourceRows: sourceLedgerRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)),
  estateRows: estateRegistryRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)),
  projection: readJson(policy.paths.projection),
  resultRowsByPath: Object.fromEntries(policy.queues.map(queue => {
    const relative = resultPathFor(queue.queue_ref, policy);
    return [relative, readJsonl(relative)];
  })),
  rawInputs: {
    policy: policyRaw,
    sourceProjection: sourceProjectionRaw,
    sourceLedger: sourceLedgerRaw,
    estateRegistry: estateRegistryRaw
  },
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json'),
  graphDigestView: graphDigestView()
};

assert.deepEqual(validateArtifacts(baseline), [], 'Wave 28 baseline must validate');

const firstLedgerPath = Object.keys(baseline.resultRowsByPath).sort()[0];
const firstTask = state => state.resultRowsByPath[firstLedgerPath].find(row => row.row_type === 'implementation_closure_task');
const firstSummary = state => state.resultRowsByPath[firstLedgerPath].find(row => row.row_type === 'implementation_closure_queue');

const mutations = [
  ['duplicate queue reference', state => { state.policy.queues[1].queue_ref = state.policy.queues[0].queue_ref; }],
  ['duplicate estate consumer', state => { state.policy.queues[1].consumer_key = state.policy.queues[0].consumer_key; }],
  ['unknown estate consumer', state => { state.policy.queues[0].consumer_key = 'unknown-estate'; }],
  ['remove source partial', state => { state.sourceRows = state.sourceRows.filter(row => row.closure_ref !== 'LAW25-LAW21-EST-05/C01'); }],
  ['complete source partial', state => {
    const row = state.sourceRows.find(item => item.closure_ref === 'LAW25-LAW21-EST-05/C01');
    row.result_state = 'complete';
    row.complete_denominator = true;
  }],
  ['change inherited institutional source set', state => {
    const row = state.sourceRows.find(item => item.closure_ref === 'LAW25-LAW21-EST-05/C03');
    row.source_refs.pop();
  }],
  ['inflate source evidence authority', state => {
    const row = state.sourceRows.find(item => item.closure_ref === 'LAW25-LAW21-EST-05/C03');
    row.evidence_adjudicated = true;
  }],
  ['change queue route authority', state => { state.policy.queues[0].source_route_authority = 'reviewed'; }],
  ['duplicate task reference', state => { state.policy.queues[0].tasks[1].task_ref = state.policy.queues[0].tasks[0].task_ref; }],
  ['unknown source closure', state => { state.policy.queues[0].tasks[0].source_closure_refs = ['LAW28-UNKNOWN']; }],
  ['remove required receipts', state => { state.policy.queues[0].tasks[0].required_receipts = []; }],
  ['change task priority', state => { state.policy.queues[0].tasks[0].priority_tier = 'P2'; }],
  ['change task class', state => { state.policy.queues[0].tasks[0].task_class = 'invented'; }],
  ['change expected priority denominator', state => { state.policy.expected_counts.priority_tiers.P0 = 5; }],
  ['change expected task-class denominator', state => { state.policy.expected_counts.task_classes.correction_outcome_ledger = 2; }],
  ['change projected task count', state => { state.projection.counts.closure_tasks = 11; }],
  ['change projected priority denominator', state => { state.projection.counts.priority_tiers.P0 = 5; }],
  ['change projected task-class denominator', state => { state.projection.counts.task_classes.covered_entity_roster = 1; }],
  ['change result ledger hash', state => { state.projection.queues[0].result_sha256 = '0'.repeat(64); }],
  ['remove result task row', state => { state.resultRowsByPath[firstLedgerPath].pop(); }],
  ['change result task target', state => { firstTask(state).closure_target = 'invented'; }],
  ['change result execution state', state => { firstTask(state).execution_state = 'complete'; }],
  ['change inherited result source', state => { firstTask(state).inherited_source_refs.pop(); }],
  ['claim complete denominator', state => { firstTask(state).complete_denominator = true; }],
  ['adjudicate evidence', state => { firstTask(state).evidence_adjudicated = true; }],
  ['adopt estate', state => { firstTask(state).estate_adopted = true; }],
  ['promote finding', state => { firstTask(state).finding_promoted = true; }],
  ['create graph effect', state => { firstTask(state).graph_effect = 'created'; }],
  ['clear publication', state => { firstTask(state).publication_status = 'cleared'; }],
  ['remove blocked promotion', state => { firstTask(state).blocked_promotions.pop(); }],
  ['change queue summary task count', state => { firstSummary(state).closure_task_count -= 1; }],
  ['remove Wave 28 source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== state.policy.paths.method);
  }],
  ['remove Wave 28 generated path contract', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths = state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== state.policy.paths.projection);
  }],
  ['remove Wave 28 evidence boundary', state => { delete state.wave21Policy.boundaries.wave_28_implementation_task_is_evidence_row; }],
  ['change graph digest', state => { state.graphDigestView.hop_edges_sha256 = '0'.repeat(64); }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war public-interest implementation Wave 28 adversarial mutations passed: ' + mutations.length);
