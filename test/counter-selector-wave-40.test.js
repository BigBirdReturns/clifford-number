#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EXPECTED_ADJUDICATIONS,
  EXPECTED_BOUNDARIES,
  EXPECTED_CONTROL_METADATA,
  EXPECTED_COUNTS,
  EXPECTED_JOIN_MATRIX,
  EXPECTED_SOURCE_RECORDS,
  validateGeneratedNarratives,
  validateSchemaAgainstSource,
  validateSource,
  validateStaticInputs,
} from '../tools/validate-counter-selector-wave-40.mjs';
import { renderMethod, renderMilestone } from '../tools/build-counter-selector-wave-40.mjs';

const source = JSON.parse(fs.readFileSync('data/project/counter-selector-wave-40-cross-host-registry.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schemas/counter-selector-cross-host-registry.schema.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/counter-selector-wave-40.yml');
const clone = value => structuredClone(value);
const mutations = [];

for (const key of Object.keys(EXPECTED_COUNTS)) {
  mutations.push(value => { value.counts[key] += 1; });
}
for (const [key, expected] of Object.entries(EXPECTED_BOUNDARIES)) {
  mutations.push(value => { value.boundaries[key] = expected === false ? true : 'changed'; });
}
for (let row = 0; row < EXPECTED_JOIN_MATRIX.length; row += 1) {
  for (const key of Object.keys(EXPECTED_JOIN_MATRIX[row])) {
    mutations.push(value => {
      const current = value.join_matrix[row][key];
      value.join_matrix[row][key] = typeof current === 'boolean' ? !current : `${current}-mutated`;
    });
  }
}
for (let row = 0; row < EXPECTED_ADJUDICATIONS.length; row += 1) {
  for (const key of Object.keys(EXPECTED_ADJUDICATIONS[row])) {
    mutations.push(value => {
      const current = value.controls[row].adjudication[key];
      value.controls[row].adjudication[key] = typeof current === 'boolean' ? !current : `${current}-mutated`;
    });
  }
}
for (let row = 0; row < EXPECTED_CONTROL_METADATA.length; row += 1) {
  for (const field of ['public_label', 'control_type', 'system_or_subject']) {
    mutations.push(value => { value.controls[row][field] += ' mutated'; });
  }
}
for (const field of ['public_label', 'control_type', 'system_or_subject']) {
  for (const [left, right] of [[0, 1], [1, 2], [0, 2]]) {
    mutations.push(value => {
      const held = value.controls[left][field];
      value.controls[left][field] = value.controls[right][field];
      value.controls[right][field] = held;
    });
  }
}
for (let row = 0; row < EXPECTED_SOURCE_RECORDS.length; row += 1) {
  for (let item = 0; item < EXPECTED_SOURCE_RECORDS[row].length; item += 1) {
    for (const field of ['source_id', 'title', 'publisher', 'date', 'url', 'source_class', 'artifact_scope']) {
      mutations.push(value => { value.controls[row].source_records[item][field] += ' mutated'; });
    }
  }
}
for (const [left, right] of [[0, 1], [1, 2], [0, 2]]) {
  mutations.push(value => {
    const held = value.controls[left].source_records;
    value.controls[left].source_records = value.controls[right].source_records;
    value.controls[right].source_records = held;
  });
}
mutations.push(value => { value.schema_version = 'mutated'; });
mutations.push(value => { value.program_id = 'mutated'; });
mutations.push(value => { value.wave_id = 'mutated'; });
mutations.push(value => { value.parent_wave_ids = ['mutated']; });
mutations.push(value => { value.as_of = '2026-08-02'; });
mutations.push(value => { value.observed_at = '2026-08-02T00:00:00Z'; });
mutations.push(value => { value.title = 'mutated'; });
mutations.push(value => { value.status = 'mutated'; });
mutations.push(value => { value.purpose = 'mutated'; });
mutations.push(value => { value.controls.pop(); });
mutations.push(value => { value.next_action = 'mutated'; });
mutations.push(value => { value.graph_effect = 'changed'; });
for (const field of [
  'proofs_may_be_assembled_across_controls',
  'package_variants_may_be_combined_within_system',
  'documentation_is_execution_receipt',
  'contact_required',
  'control_is_candidate_promotion',
]) {
  mutations.push(value => { value.handoff_contract[field] = !value.handoff_contract[field]; });
}
for (let row = 0; row < source.controls.length; row += 1) {
  for (const field of Object.keys(source.controls[row].components)) {
    mutations.push(value => { value.controls[row].components[field] += ' mutated'; });
  }
  mutations.push(value => { value.controls[row].positive_findings[0] += ' mutated'; });
  mutations.push(value => { value.controls[row].known_limits[0] += ' mutated'; });
}

assert.equal(mutations.length, EXPECTED_COUNTS.adversarial_mutations);
for (const [index, mutate] of mutations.entries()) {
  const candidate = clone(source);
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, `mutation ${index + 1} should fail`);
}

const exactContractTamperCases = [
  () => {
    const candidate = clone(source);
    candidate.controls[0].components.independent_verification += ' externally reproduced';
    assert.throws(() => validateSource(candidate));
  },
  () => {
    const candidate = clone(source);
    candidate.controls[1].positive_findings.push('complete portable operational handoff established');
    assert.throws(() => validateSource(candidate));
  },
  () => {
    const candidate = clone(source);
    candidate.controls[2].known_limits[0] += ' removed';
    assert.throws(() => validateSource(candidate));
  },
  () => {
    const candidate = clone(schema);
    candidate.required = [];
    assert.throws(() => validateSchemaAgainstSource(candidate, source));
  },
  () => {
    const candidate = clone(schema);
    candidate.$defs.control.properties.public_label.type = 'number';
    assert.throws(() => validateSchemaAgainstSource(candidate, source));
  },
  () => {
    const candidate = Buffer.from(workflow.toString('utf8').replace('contents: read', 'contents: write'));
    assert.throws(() => validateStaticInputs({ workflowBytes: candidate }));
  },
  () => {
    const method = Buffer.from(`${renderMethod(source)}\nmutated method narrative\n`);
    assert.throws(() => validateGeneratedNarratives(source, method, Buffer.from(renderMilestone(source))));
  },
  () => {
    const milestone = Buffer.from(renderMilestone(source).replace(
      'one bounded documented checkpoint-image registry migration route',
      'the first complete public registry handoff',
    ));
    assert.throws(() => validateGeneratedNarratives(source, Buffer.from(renderMethod(source)), milestone));
  },
];
for (const runCase of exactContractTamperCases) runCase();
assert.equal(exactContractTamperCases.length, EXPECTED_COUNTS.exact_contract_tamper_cases);

console.log(`counter-selector-wave-40.test: ${mutations.length} adversarial mutations + ${exactContractTamperCases.length} exact-contract tamper cases PASS`);
