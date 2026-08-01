#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-gap-fanout-wave-30.mjs';
import { resultPathFor } from '../tools/build-lake-allocator-war-gap-fanout-wave-30.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const clone = value => structuredClone(value);

const policy = readJson('data/project/lake-allocator-war-gap-fanout-wave-30-policy.json');
const sourceProjectionRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const sourceProjection = JSON.parse(sourceProjectionRaw);
const sourceRowsByPath = {};
const sourceRawByPath = {};
for (const queue of sourceProjection.queues) {
  const raw = fs.readFileSync(queue.result_path, 'utf8');
  sourceRawByPath[queue.result_path] = raw;
  sourceRowsByPath[queue.result_path] = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
const baseline = {
  policy,
  sourceProjection,
  sourceProjectionRaw,
  sourceRowsByPath,
  sourceRawByPath,
  projection: readJson(policy.paths.projection),
  resultRowsByPath: Object.fromEntries(policy.route_classes.map(route => {
    const relative = resultPathFor(route.route_class, policy);
    return [relative, readJsonl(relative)];
  })),
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};

assert.deepEqual(validateArtifacts(baseline), [], 'Wave 30 baseline must validate');

const firstRoutePath = Object.keys(baseline.resultRowsByPath).sort()[0];
const firstTask = state => state.resultRowsByPath[firstRoutePath].find(row => row.row_type === 'missing_row_closure_task');
const firstSummary = state => state.resultRowsByPath[firstRoutePath].find(row => row.row_type === 'missing_row_route_summary');
const firstSourceResult = state => Object.values(state.sourceRowsByPath).flat().find(row => row.row_type === 'implementation_execution_result');
const firstSourcePath = state => Object.keys(state.sourceRawByPath).sort()[0];

const mutations = [
  ['duplicate route class', state => { state.policy.route_classes[1].route_class = state.policy.route_classes[0].route_class; }],
  ['duplicate route sequence', state => { state.policy.route_classes[1].route_sequence = state.policy.route_classes[0].route_sequence; }],
  ['remove route owner', state => { state.policy.route_classes[0].owner = ''; }],
  ['remove route receipts', state => { state.policy.route_classes[0].required_receipts = []; }],
  ['change protected route to public', state => { state.policy.route_classes[0].public_execution = true; }],
  ['duplicate gap assignment', state => { state.policy.assignments[1] = clone(state.policy.assignments[0]); }],
  ['remove gap assignment', state => { state.policy.assignments.pop(); }],
  ['assign unknown route', state => { state.policy.assignments[0].route_class = 'unknown-route'; }],
  ['use negative gap index', state => { state.policy.assignments[0].unavailable_row_index = -1; }],
  ['change expected missing-row count', state => { state.policy.expected_counts.source_missing_rows = 37; }],
  ['change expected route count', state => { state.policy.expected_counts.route_classes = 6; }],
  ['change expected access-bound count', state => { state.policy.expected_counts.access_bounded_tasks = 3; }],
  ['inflate source complete denominator', state => { firstSourceResult(state).complete_denominator = true; }],
  ['remove source unavailable rows', state => { firstSourceResult(state).unavailable_rows = []; }],
  ['change source result state', state => { firstSourceResult(state).result_state = 'complete'; }],
  ['change source ledger bytes', state => { const p = firstSourcePath(state); state.sourceRawByPath[p] += ' '; }],
  ['change projection missing-row count', state => { state.projection.counts.source_missing_rows = 37; }],
  ['change projection route count', state => { state.projection.counts.route_classes = 6; }],
  ['change projection graph digest', state => { state.projection.graph_digests.hop_edges_sha256 = '0'.repeat(64); }],
  ['require manual dispatch', state => { state.projection.amortization_contract.manual_per_task_dispatch_required = true; }],
  ['remove route ledger row', state => { state.resultRowsByPath[firstRoutePath].pop(); }],
  ['change task route class', state => { firstTask(state).route_class = 'unknown-route'; }],
  ['change task gap hash', state => { firstTask(state).unavailable_row_sha256 = '0'.repeat(64); }],
  ['change task public flag', state => { firstTask(state).publicly_executable = !firstTask(state).publicly_executable; }],
  ['change task access flag', state => { firstTask(state).access_bounded = !firstTask(state).access_bounded; }],
  ['enable same-wave source acquisition', state => { firstTask(state).same_wave_source_acquisition = true; }],
  ['enable same-wave completion', state => { firstTask(state).same_wave_completion = true; }],
  ['claim complete denominator', state => { firstTask(state).complete_denominator = true; }],
  ['adjudicate evidence', state => { firstTask(state).evidence_adjudicated = true; }],
  ['adopt estate', state => { firstTask(state).estate_adopted = true; }],
  ['promote finding', state => { firstTask(state).finding_promoted = true; }],
  ['create graph effect', state => { firstTask(state).graph_effect = 'created'; }],
  ['clear publication', state => { firstTask(state).publication_status = 'cleared'; }],
  ['remove blocked promotion', state => { firstTask(state).blocked_promotions.pop(); }],
  ['change route summary count', state => { firstSummary(state).task_count -= 1; }],
  ['remove Wave 30 source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== state.policy.paths.method);
  }],
  ['remove Wave 30 generated path', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths =
      state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== state.policy.paths.projection);
  }],
  ['remove Wave 30 evidence boundary', state => { delete state.wave21Policy.boundaries.wave_30_gap_task_is_evidence_row; }],
  ['inflate protected absence', state => { state.policy.boundaries.protected_record_absence_is_substantive_inference = true; }],
  ['treat public base as action denominator', state => { state.policy.boundaries.public_base_universe_is_action_denominator = true; }],
  ['treat route recurrence as prevalence', state => { state.policy.boundaries.route_recurrence_is_prevalence = true; }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war gap fan-out Wave 30 adversarial mutations passed: ' + mutations.length);
