#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { resultPathFor } from '../tools/build-lake-allocator-war-public-interest-downstream-wave-27.mjs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-public-interest-downstream-wave-27.mjs';

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

const policy = readJson('data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json');
const wave26ProjectionRaw = fs.readFileSync(policy.paths.source_wave26_projection, 'utf8');
const repairProjectionRaw = fs.readFileSync(policy.paths.source_repair_projection, 'utf8');
const wave26PlanRaw = fs.readFileSync(policy.paths.source_wave26_plan, 'utf8');
const resultPaths = [resultPathFor('LAW21-EST-05', policy), resultPathFor('LAW21-EST-11', policy)];
const baseline = {
  policy,
  wave26Projection: JSON.parse(wave26ProjectionRaw),
  repairProjection: JSON.parse(repairProjectionRaw),
  wave26Plan: JSON.parse(wave26PlanRaw),
  publicRows: readJsonl(policy.paths.source_public_ledger),
  legislativeRows: readJsonl(policy.paths.source_legislative_ledger),
  executionPlan: readJson(policy.paths.execution_plan),
  projection: readJson(policy.paths.projection),
  resultRowsByPath: Object.fromEntries(resultPaths.map(relative => [relative, readJsonl(relative)])),
  rawInputs: { wave26ProjectionRaw, repairProjectionRaw, wave26PlanRaw },
  graphDigestView: graphDigestView(),
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};

assert.deepEqual(validateArtifacts(baseline), [], 'Wave 27 baseline must validate');

const publicResultPath = resultPathFor('LAW21-EST-05', policy);
const legislativeResultPath = resultPathFor('LAW21-EST-11', policy);
const mutations = [
  ['replace institutional source with research source', state => {
    state.executionPlan.source_registry[0].source_ref = 'LAW24-S016';
  }],
  ['remove institutional source', state => {
    state.executionPlan.source_registry.pop();
  }],
  ['reorder institutional source set', state => {
    state.executionPlan.source_registry.reverse();
  }],
  ['plan legislative blocked task', state => {
    state.executionPlan.task_plans.push({ ...state.executionPlan.task_plans[0], closure_ref: state.policy.source_contract.legislative_blocked_refs[0] });
  }],
  ['remove eligible task plan', state => {
    state.executionPlan.task_plans.pop();
  }],
  ['change eligible result to complete', state => {
    state.executionPlan.task_plans[0].result_state = 'complete';
  }],
  ['change plan source custody', state => {
    state.executionPlan.task_plans[0].source_refs[0] = 'LAW24-S016';
  }],
  ['empty negative search', state => {
    state.executionPlan.task_plans[0].negative_search_statement = '';
  }],
  ['execute noneligible source row', state => {
    const row = state.publicRows.find(item => item.closure_ref === state.policy.source_contract.public_interest_gate_ref);
    row.execution_state = state.policy.source_contract.eligible_source_state;
  }],
  ['unblock legislative source row', state => {
    const row = state.legislativeRows.find(item => item.closure_ref === state.policy.source_contract.legislative_blocked_refs[0]);
    row.execution_state = state.policy.source_contract.eligible_source_state;
  }],
  ['change public result to complete', state => {
    const row = state.resultRowsByPath[publicResultPath].find(item => item.row_type === 'downstream_execution_result');
    row.result_state = 'complete';
  }],
  ['mark public denominator complete', state => {
    const row = state.resultRowsByPath[publicResultPath].find(item => item.row_type === 'downstream_execution_result');
    row.complete_denominator = true;
  }],
  ['adjudicate public evidence', state => {
    const row = state.resultRowsByPath[publicResultPath].find(item => item.row_type === 'downstream_execution_result');
    row.evidence_adjudicated = true;
  }],
  ['execute legislative blocked result', state => {
    const row = state.resultRowsByPath[legislativeResultPath].find(item => item.row_type === 'downstream_execution_result');
    row.executed_in_wave = true;
  }],
  ['give legislative result source refs', state => {
    const row = state.resultRowsByPath[legislativeResultPath].find(item => item.row_type === 'downstream_execution_result');
    row.source_refs = state.policy.source_contract.institutional_source_refs;
  }],
  ['promote finding', state => {
    const row = state.resultRowsByPath[publicResultPath].find(item => item.row_type === 'downstream_execution_result');
    row.finding_promoted = true;
  }],
  ['create graph effect', state => {
    state.projection.counts.graph_effects = 1;
  }],
  ['clear publication', state => {
    state.projection.counts.publication_clearances = 1;
  }],
  ['change executed denominator', state => {
    state.projection.counts.executed_tasks = 3;
  }],
  ['change graph digest', state => {
    state.graphDigestView.hop_edges_sha256 = '0'.repeat(64);
  }],
  ['remove Wave 27 basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(relative => relative !== publicResultPath);
  }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  let rejected = false;
  try {
    rejected = validateArtifacts(state).length > 0;
  } catch {
    rejected = true;
  }
  assert.ok(rejected, label + ': mutation was not rejected');
}

console.log('allocator-war public-interest downstream Wave 27 adversarial mutations passed: ' + mutations.length);
