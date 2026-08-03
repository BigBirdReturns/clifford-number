#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateSource } from '../tools/validate-counter-selector-wave-35.mjs';

const SOURCE_PATH = 'data/project/counter-selector-wave-35-real-world-handoff-join.json';
const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const mutations = [];

for (const key of Object.keys(source.counts)) {
  mutations.push({
    name: `inflate count ${key}`,
    apply(value) { value.counts[key] += 1; }
  });
}
for (const key of Object.keys(source.counts)) {
  mutations.push({
    name: `negative count ${key}`,
    apply(value) { value.counts[key] = -1; }
  });
}
for (const key of Object.keys(source.boundaries)) {
  mutations.push({
    name: `violate boundary ${key}`,
    apply(value) {
      if (key === 'graph_effect') value.boundaries[key] = 'created';
      else value.boundaries[key] = true;
    }
  });
}
for (let index = 0; index < source.controls.length; index += 1) {
  mutations.push({
    name: `promote complete handoff control ${index}`,
    apply(value) { value.controls[index].adjudication.complete_bounded_executable_handoff = true; }
  });
  mutations.push({
    name: `add person support control ${index}`,
    apply(value) { value.controls[index].adjudication.person_support_added = true; }
  });
  mutations.push({
    name: `create operator finding control ${index}`,
    apply(value) { value.controls[index].operator_finding = true; }
  });
  mutations.push({
    name: `authorize field test control ${index}`,
    apply(value) { value.controls[index].field_test_eligible = true; }
  });
  mutations.push({
    name: `authorize contact control ${index}`,
    apply(value) { value.controls[index].contact_authorized = true; }
  });
}

assert.equal(mutations.length, 96);
for (const mutation of mutations) {
  const candidate = clone(source);
  mutation.apply(candidate);
  assert.throws(() => validateSource(candidate), undefined, mutation.name);
}

validateSource(source);
console.log(`counter-selector-wave-35.test: ${mutations.length} adversarial mutations refused`);
