#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-lead-execution-wave-24.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const clone = value => structuredClone(value);

const policyPath = 'data/project/lake-allocator-war-lead-execution-wave-24-policy.json';
const policy = readJson(policyPath);
const sourcePlanRaw = fs.readFileSync(policy.paths.source_plan, 'utf8');
const sourceProjectionRaw = fs.readFileSync(policy.paths.source_projection, 'utf8');
const projection = readJson(policy.paths.projection);
const ledgerRowsByPath = {};
const ledgerRawByPath = {};
for (const execution of projection.executions) {
  ledgerRawByPath[execution.ledger_path] = fs.readFileSync(execution.ledger_path, 'utf8');
  ledgerRowsByPath[execution.ledger_path] = readJsonl(execution.ledger_path);
}

const baseline = {
  policy,
  sourcePlan: JSON.parse(sourcePlanRaw),
  sourcePlanRaw,
  sourceProjection: JSON.parse(sourceProjectionRaw),
  sourceProjectionRaw,
  projection,
  ledgerRowsByPath,
  ledgerRawByPath,
  wave21Policy: readJson('data/project/lake-allocator-war-wave-21-policy.json')
};

const errorsFor = state => validateArtifacts({
  policy: state.policy,
  sourcePlan: state.sourcePlan,
  sourcePlanRaw: state.sourcePlanRaw,
  sourceProjection: state.sourceProjection,
  sourceProjectionRaw: state.sourceProjectionRaw,
  projection: state.projection,
  ledgerRowsByPath: state.ledgerRowsByPath,
  ledgerRawByPath: state.ledgerRawByPath,
  wave21Policy: state.wave21Policy
});

assert.deepEqual(errorsFor(baseline), [], 'Wave 24 baseline must validate');

const firstLedger = baseline.projection.executions[0].ledger_path;
const gateUnspecifiedLedger = baseline.projection.executions
  .find(row => row.acquisition_disposition === 'bounded_public_record_recovered_gate_unspecified')
  .ledger_path;

const mutations = [
  ['duplicate source reference', state => { state.sourcePlan.source_registry[1].id = state.sourcePlan.source_registry[0].id; }],
  ['duplicate stable identifier', state => { state.sourcePlan.source_registry[1].stable_identifier = state.sourcePlan.source_registry[0].stable_identifier; }],
  ['remove source custody', state => { state.sourcePlan.source_registry[0].custody_refs = []; }],
  ['invent retrieval status', state => { state.sourcePlan.source_registry[0].retrieval_status = 'complete'; }],
  ['remove packet plan', state => { state.sourcePlan.packet_plans.pop(); }],
  ['invent packet source reference', state => { state.sourcePlan.packet_plans[0].source_refs[0] = 'LAW24-S999'; }],
  ['duplicate packet source use', state => { state.sourcePlan.packet_plans[0].source_refs[1] = state.sourcePlan.packet_plans[0].source_refs[0]; }],
  ['invent acquisition disposition', state => { state.sourcePlan.packet_plans[0].acquisition_disposition = 'supported'; }],
  ['erase negative search', state => { state.sourcePlan.packet_plans[0].negative_search_statement = ''; }],
  ['turn gate-unspecified plan into named gate', state => {
    const plan = state.sourcePlan.packet_plans.find(row => row.acquisition_disposition === 'bounded_public_record_recovered_gate_unspecified');
    plan.institutional_gate_state = 'named_gate';
  }],
  ['turn partial plan into gate-unspecified state', state => {
    const plan = state.sourcePlan.packet_plans.find(row => row.acquisition_disposition === 'partial_source_recovery');
    plan.institutional_gate_state = 'no_bounded_institutional_gate_identified';
  }],
  ['change execution packet reference', state => { state.projection.executions[0].packet_ref = 'LAW24-BROKEN'; }],
  ['change execution ledger path', state => { state.projection.executions[0].ledger_path = 'data/acquisition/wrong.jsonl'; }],
  ['change execution ledger hash', state => { state.projection.executions[0].ledger_sha256 = '0'.repeat(64); }],
  ['claim complete denominator', state => { state.projection.executions[0].complete_denominator = true; }],
  ['claim evidence adjudication', state => { state.projection.executions[0].evidence_adjudicated = true; }],
  ['claim evidence row', state => { state.projection.executions[0].evidence_rows = 1; }],
  ['claim finding promotion', state => { state.projection.executions[0].finding_promoted = true; }],
  ['change projection disposition count', state => { state.projection.counts.acquisition_dispositions.partial_source_recovery = 8; }],
  ['change acquisition-row count', state => { state.projection.counts.acquisition_rows = 61; }],
  ['change source-use count', state => { state.projection.counts.source_receipt_uses = 50; }],
  ['change source-plan hash', state => { state.projection.generated_from.source_plan_sha256 = '0'.repeat(64); }],
  ['change packet row consumer', state => { state.ledgerRowsByPath[firstLedger][0].consumer_key = 'wrong-estate'; }],
  ['change packet row coverage', state => { state.ledgerRowsByPath[firstLedger][0].coverage_statement = 'invented'; }],
  ['claim packet complete denominator', state => { state.ledgerRowsByPath[firstLedger][0].complete_denominator = true; }],
  ['remove packet refusal', state => { state.ledgerRowsByPath[firstLedger][0].refused_rows.pop(); }],
  ['change source receipt reference', state => { state.ledgerRowsByPath[firstLedger][1].source_ref = 'LAW24-S999'; }],
  ['change source stable identifier', state => { state.ledgerRowsByPath[firstLedger][1].stable_identifier = 'invented'; }],
  ['claim source bytes preserved', state => { state.ledgerRowsByPath[firstLedger][1].source_bytes_preserved = true; }],
  ['claim source evidence adjudication', state => { state.ledgerRowsByPath[firstLedger][1].evidence_adjudicated = true; }],
  ['turn gate-unspecified ledger into evidence gate', state => { state.ledgerRowsByPath[gateUnspecifiedLedger][0].institutional_gate_state = 'named_gate'; }],
  ['remove Wave 24 source basin path', state => {
    const basin = state.wave21Policy.basin_contract.find(row => row.basin_id === 'allocator-war-source');
    basin.path_prefixes = basin.path_prefixes.filter(item => item !== policyPath);
  }],
  ['remove generated ledger authorization', state => {
    state.wave21Policy.projection_contract.allowed_generated_paths =
      state.wave21Policy.projection_contract.allowed_generated_paths.filter(item => item !== firstLedger);
  }],
  ['authorize graph effect', state => { state.projection.boundaries.graph_effect = 'created'; }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = errorsFor(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war lead execution Wave 24 adversarial mutations passed: ' + mutations.length);
