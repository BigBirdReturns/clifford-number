#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const original = read('data/project/dca-h01-field-hypothesis.json');
const denominator = read('data/project/dca-h01-role-neutral-denominator.json');

function structuralErrors(hypothesis, den = denominator) {
  const errors = [];
  if (hypothesis.hypothesis_id !== 'DCA-H01') errors.push('hypothesis_id');
  if (hypothesis.authority_tier !== 'AT-2') errors.push('authority_tier');
  if (hypothesis.mechanisms.length !== 5) errors.push('mechanism_count');
  if (hypothesis.boundaries.same_mechanism_proves_communication !== false) errors.push('communication_boundary');
  if (hypothesis.boundaries.field_hypothesis_creates_actor_edge !== false) errors.push('graph_boundary');
  if (hypothesis.boundaries.field_hypothesis_advances_adoption !== false) errors.push('adoption_boundary');
  if (hypothesis.current_state.prevalence_finding_generated !== false) errors.push('prevalence_state');
  if (hypothesis.current_state.common_purpose_finding_generated !== false) errors.push('common_purpose_state');
  if (hypothesis.current_state.graph_effect !== 'none') errors.push('graph_effect');
  if (den.records.length !== 0 || den.execution.started !== false || den.execution.query_templates_executed !== 0) errors.push('execution_state');
  if (den.boundaries.fixtures_are_denominator !== false) errors.push('fixture_boundary');
  if (den.boundaries.query_hit_is_recurrence !== false) errors.push('query_hit_boundary');
  return errors;
}

assert.deepEqual(structuralErrors(original), []);

const mutations = [
  ['actor edge promotion', (h) => { h.boundaries.field_hypothesis_creates_actor_edge = true; }, 'graph_boundary'],
  ['communication inference', (h) => { h.boundaries.same_mechanism_proves_communication = true; }, 'communication_boundary'],
  ['prevalence self-award', (h) => { h.current_state.prevalence_finding_generated = true; }, 'prevalence_state'],
  ['common purpose self-award', (h) => { h.current_state.common_purpose_finding_generated = true; }, 'common_purpose_state'],
  ['adoption self-award', (h) => { h.boundaries.field_hypothesis_advances_adoption = true; }, 'adoption_boundary'],
  ['mechanism deletion', (h) => { h.mechanisms.pop(); }, 'mechanism_count'],
  ['graph mutation', (h) => { h.current_state.graph_effect = 'edge'; }, 'graph_effect'],
  ['fixture laundering', (_h, d) => { d.boundaries.fixtures_are_denominator = true; }, 'fixture_boundary'],
  ['query hit laundering', (_h, d) => { d.boundaries.query_hit_is_recurrence = true; }, 'query_hit_boundary'],
  ['execution self-award', (_h, d) => { d.execution.started = true; d.execution.query_templates_executed = 12; }, 'execution_state']
];

for (const [name, mutate, expected] of mutations) {
  const h = structuredClone(original);
  const d = structuredClone(denominator);
  mutate(h, d);
  assert(structuralErrors(h, d).includes(expected), `${name} did not fail closed`);
}

console.log(`dca-h01.test: ${mutations.length} adversarial mutations PASS`);
