#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs';

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

const policy = readJson('data/project/lake-allocator-war-wave26-source-custody-repair-policy.json');
const sourcePlanRaw = fs.readFileSync(policy.paths.wave26_source_plan, 'utf8');
const sourceProjectionRaw = fs.readFileSync(policy.paths.wave26_projection, 'utf8');
const baseline = {
  policy,
  sourcePlan: JSON.parse(sourcePlanRaw),
  sourcePlanRaw,
  sourceProjection: JSON.parse(sourceProjectionRaw),
  sourceProjectionRaw,
  publicRows: readJsonl(policy.paths.public_interest_ledger),
  legislativeRows: readJsonl(policy.paths.legislative_finance_ledger),
  repairProjection: readJson(policy.paths.projection),
  graphDigestView: graphDigestView()
};

assert.deepEqual(validateArtifacts(baseline), [], 'source-custody repair baseline must validate');

const mutations = [
  ['restore research-only public gate sources', state => {
    const gate = state.sourcePlan.task_plans.find(row => row.closure_ref === state.policy.public_interest_gate.closure_ref);
    gate.source_refs = ['LAW24-S016', 'LAW24-S017', 'LAW24-S018'];
  }],
  ['attach one research source to public gate', state => {
    const gate = state.sourcePlan.task_plans.find(row => row.closure_ref === state.policy.public_interest_gate.closure_ref);
    gate.source_refs[0] = 'LAW24-S016';
  }],
  ['remove executive order from public gate', state => {
    const gate = state.sourcePlan.task_plans.find(row => row.closure_ref === state.policy.public_interest_gate.closure_ref);
    gate.source_refs = gate.source_refs.filter(ref => ref !== 'LAW24-S019');
  }],
  ['reorder public gate source custody', state => {
    const gate = state.sourcePlan.task_plans.find(row => row.closure_ref === state.policy.public_interest_gate.closure_ref);
    gate.source_refs.reverse();
  }],
  ['change legislative no-gate source set', state => {
    const gate = state.sourcePlan.task_plans.find(row => row.closure_ref === state.policy.legislative_no_gate.closure_ref);
    gate.source_refs[0] = 'LAW24-S019';
  }],
  ['allow research to establish public gate', state => {
    state.sourcePlan.custody_contract.research_sources_establish_public_interest_gate = true;
  }],
  ['change source-plan custody contract', state => {
    state.sourcePlan.custody_contract.public_interest_gate_source_refs.pop();
  }],
  ['change public result ledger sources', state => {
    const row = state.publicRows.find(item => item.closure_ref === state.policy.public_interest_gate.closure_ref);
    row.source_refs = ['LAW24-S016', 'LAW24-S017', 'LAW24-S018'];
  }],
  ['change public receipt count', state => {
    const row = state.publicRows.find(item => item.closure_ref === state.policy.public_interest_gate.closure_ref);
    row.source_receipt_count = 3;
  }],
  ['change legislative result ledger sources', state => {
    const row = state.legislativeRows.find(item => item.closure_ref === state.policy.legislative_no_gate.closure_ref);
    row.source_refs[0] = 'LAW24-S019';
  }],
  ['execute public downstream task in repair wave', state => {
    const row = state.publicRows.find(item => item.execution_state === state.policy.public_interest_gate.expected_downstream_state);
    row.executed_in_wave = true;
  }],
  ['execute legislative blocked task', state => {
    const row = state.legislativeRows.find(item => item.execution_state === state.policy.legislative_no_gate.expected_downstream_state);
    row.result_state = 'partial';
  }],
  ['change public gate result', state => {
    const gate = state.sourcePlan.task_plans.find(row => row.closure_ref === state.policy.public_interest_gate.closure_ref);
    gate.result_state = 'partial';
  }],
  ['inflate complete denominator', state => {
    const row = state.publicRows.find(item => item.closure_ref === state.policy.public_interest_gate.closure_ref);
    row.complete_denominator = true;
  }],
  ['adjudicate evidence', state => {
    const row = state.publicRows.find(item => item.closure_ref === state.policy.public_interest_gate.closure_ref);
    row.evidence_adjudicated = true;
  }],
  ['promote finding', state => {
    const row = state.legislativeRows.find(item => item.closure_ref === state.policy.legislative_no_gate.closure_ref);
    row.finding_promoted = true;
  }],
  ['create graph effect', state => {
    state.repairProjection.counts.graph_effects = 1;
  }],
  ['clear publication', state => {
    state.repairProjection.counts.publication_clearances = 1;
  }],
  ['change repair projection source view', state => {
    state.repairProjection.public_interest_gate.source_refs.pop();
  }],
  ['change graph digest', state => {
    state.graphDigestView.hop_edges_sha256 = '0'.repeat(64);
  }]
];

for (const [label, mutate] of mutations) {
  const state = clone(baseline);
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, label + ': mutation was not rejected');
}

console.log('allocator-war Wave 26 source-custody repair adversarial mutations passed: ' + mutations.length);
