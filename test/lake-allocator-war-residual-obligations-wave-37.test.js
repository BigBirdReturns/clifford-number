#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { constructArtifacts } from '../tools/build-lake-allocator-war-residual-obligations-wave-37.mjs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-residual-obligations-wave-37.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const clone = value => structuredClone(value);
const policy = readJson('data/project/lake-allocator-war-residual-obligations-wave-37-policy.json');
const expected = constructArtifacts(process.cwd());

function load() {
  return {
    policy: clone(policy),
    expectedProjection: clone(expected.projection),
    expectedLedger: clone(expected.ledger),
    expectedReport: expected.report,
    projection: readJson(policy.paths.projection),
    ledger: readJsonl(policy.paths.ledger),
    report: fs.readFileSync(policy.paths.report, 'utf8')
  };
}

assert.deepEqual(validateArtifacts(load()), [], 'committed Wave 37 artifacts must validate');

function expectFailure(label, mutate) {
  const state = load();
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, `${label}: mutation unexpectedly passed`);
}

const mutations = [
  ['promote completion test', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').completion_test_passed = true; }],
  ['satisfy requirement', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').requirement_satisfied = true; }],
  ['authorize join', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').join_authorized = true; }],
  ['create evidence row', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').evidence_rows = 1; }],
  ['create graph effect', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').graph_effect = 'edge'; }],
  ['clear publication', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').publication_status = 'cleared'; }],
  ['erase completion gap', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').completion_gap = ''; }],
  ['change refused substitution', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').refused_substitution = 'public summary accepted'; }],
  ['duplicate priority sequence', state => {
    const rows = state.ledger.filter(row => row.row_type === 'residual_institutional_obligation');
    rows[1].priority_sequence = rows[0].priority_sequence;
  }],
  ['introduce external reviewer gate', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').external_human_review_required_to_classify = true; }],
  ['promote priority to evidence strength', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').priority_is_evidence_strength = true; }],
  ['give protected task public component', state => {
    const row = state.ledger.find(item => item.row_type === 'residual_institutional_obligation' && item.protected_lawful_access_only);
    row.public_record_component_count = 1;
  }],
  ['remove residual obligation', state => {
    const index = state.ledger.findIndex(row => row.row_type === 'residual_institutional_obligation');
    state.ledger.splice(index, 1);
  }],
  ['drift source requirement hash', state => { state.ledger.find(row => row.row_type === 'residual_institutional_obligation').source_requirement_sha256 = '0'.repeat(64); }],
  ['inflate projection count', state => { state.projection.counts.requirements_satisfied = 1; }],
  ['rewrite report', state => { state.report += '\nRequirement satisfied.\n'; }]
];

for (const [label, mutate] of mutations) expectFailure(label, mutate);

console.log(`allocator-war residual institutional obligations Wave 37 adversarial mutations passed: ${mutations.length}`);
