#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const checkpoint = read('data/project/project-stable-ground-sg02.json');
const pointer = read('data/project/project-stable-ground-current.json');

function errors(record = checkpoint, current = pointer) {
  const result = [];
  if (record.checkpoint_id !== 'SG-2026-07-29-02') result.push('checkpoint_id');
  if (record.supersedes.checkpoint_id !== 'SG-2026-07-29-01' || record.supersedes.preserved_unchanged !== true) result.push('supersession');
  if (record.authority_change.current_authority !== 'canonical_AT2_field_hypothesis') result.push('authority');
  if (record.authority_change.prevalence_execution_started !== false) result.push('prevalence_execution');
  if (record.authority_change.graph_effect !== 'none') result.push('authority_graph');
  if (record.canonical_snapshot.dca.query_templates_executed !== 0 || record.canonical_snapshot.dca.field_records !== 0) result.push('dca_execution_state');
  if (record.canonical_snapshot.k0.query_templates_executed !== 8) result.push('k0_state');
  if (record.canonical_snapshot.m05_story_ecology.stories !== 14) result.push('story_state');
  if (record.canonical_snapshot.sprint_09.maximum_verified_adoption_level !== 'A0') result.push('adoption_state');
  if (record.canonical_snapshot.sprint_09.real_person_pilot_authorized !== false) result.push('pilot_state');
  if (record.fanout_state.dca_execution_waves.length !== 6) result.push('wave_count');
  if (record.fanout_state.dca_execution_waves.some((row) => !row.state.includes('zero'))) result.push('wave_execution_laundering');
  if (record.boundaries.canonical_DCA_proves_prevalence !== false) result.push('prevalence_boundary');
  if (record.boundaries.fanout_issues_prove_execution !== false) result.push('issue_execution_boundary');
  if (record.boundaries.seed_control_recovery_proves_query_execution !== false) result.push('seed_boundary');
  if (record.boundaries.same_mechanism_proves_coordination !== false) result.push('coordination_boundary');
  if (record.boundaries.checkpoint_advances_adoption !== false) result.push('adoption_boundary');
  if (record.boundaries.graph_effect !== 'none') result.push('graph_effect');
  if (current.current_checkpoint_id !== record.checkpoint_id) result.push('pointer');
  if (current.history.length !== 2 || current.history[0].status !== 'superseded_preserved') result.push('history');
  return result;
}

assert.deepEqual(errors(), []);

const mutations = [
  ['rewrite SG-01', (r) => { r.supersedes.preserved_unchanged = false; }, 'supersession'],
  ['promote prevalence execution', (r) => { r.authority_change.prevalence_execution_started = true; }, 'prevalence_execution'],
  ['launder issue opening into execution', (r) => { r.fanout_state.dca_execution_waves[0].state = 'executed'; }, 'wave_execution_laundering'],
  ['promote seed recovery', (r) => { r.boundaries.seed_control_recovery_proves_query_execution = true; }, 'seed_boundary'],
  ['promote prevalence finding', (r) => { r.boundaries.canonical_DCA_proves_prevalence = true; }, 'prevalence_boundary'],
  ['promote coordination', (r) => { r.boundaries.same_mechanism_proves_coordination = true; }, 'coordination_boundary'],
  ['advance adoption', (r) => { r.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'adoption_state'],
  ['authorize pilot', (r) => { r.canonical_snapshot.sprint_09.real_person_pilot_authorized = true; }, 'pilot_state'],
  ['create graph effect', (r) => { r.boundaries.graph_effect = 'edge'; }, 'graph_effect'],
  ['break current pointer', (_r, p) => { p.current_checkpoint_id = 'SG-OTHER'; }, 'pointer']
];

for (const [name, mutate, expected] of mutations) {
  const record = structuredClone(checkpoint);
  const current = structuredClone(pointer);
  mutate(record, current);
  assert(errors(record, current).includes(expected), `${name} did not fail closed`);
}

console.log(`project-stable-ground-sg02.test: ${mutations.length} adversarial mutations PASS`);
