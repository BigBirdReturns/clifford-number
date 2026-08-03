#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateSource, EXPECTED_ADJUDICATIONS, EXPECTED_BOUNDARIES, EXPECTED_COUNTS, EXPECTED_JOIN_MATRIX } from '../tools/validate-counter-selector-wave-39.mjs';

const source = JSON.parse(fs.readFileSync('data/project/counter-selector-wave-39-digest-selected-restore.json', 'utf8'));
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
mutations.push(value => { value.schema_version = 'mutated'; });
mutations.push(value => { value.program_id = 'mutated'; });
mutations.push(value => { value.wave_id = 'mutated'; });
mutations.push(value => { value.parent_wave_ids = ['mutated']; });
mutations.push(value => { value.as_of = '2026-08-02'; });
mutations.push(value => { value.observed_at = '2026-08-02T00:00:00Z'; });
mutations.push(value => { value.status = 'mutated'; });
mutations.push(value => { value.purpose = 'mutated'; });
mutations.push(value => { value.controls.pop(); });
mutations.push(value => { value.handoff_contract.proofs_may_be_assembled_across_controls = true; });
mutations.push(value => { value.handoff_contract.package_variants_may_be_combined_within_system = true; });
mutations.push(value => { value.next_action = 'mutated'; });
mutations.push(value => { value.graph_effect = 'changed'; });

assert.equal(mutations.length, EXPECTED_COUNTS.adversarial_mutations);
for (const [index, mutate] of mutations.entries()) {
  const candidate = clone(source);
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, `mutation ${index + 1} should fail`);
}
console.log(`counter-selector-wave-39.test: ${mutations.length} adversarial mutations PASS`);
