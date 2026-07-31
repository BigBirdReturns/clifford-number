#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const original = read('data/project/counter-selector-program.json');
const waveOriginal = read('data/project/counter-selector-wave-00.json');

function structuralErrors(program, wave = waveOriginal) {
  const errors = [];
  if (program.program_id !== 'CS-P01') errors.push('program_id');
  if (program.operational_residues.length !== 8) errors.push('residue_count');
  if (program.review_stages.length !== 8) errors.push('stage_count');
  if (program.scoring_contract.aggregate_score_generated !== false) errors.push('aggregate_score');
  if (program.scoring_contract.rank_order_generated !== false) errors.push('rank_order');
  if (program.privacy_and_fairness.protected_characteristics_used_for_scoring !== false) errors.push('protected_scoring');
  if (program.privacy_and_fairness.ai_use_used_as_positive_or_negative_signal !== false) errors.push('ai_scoring');
  if (program.privacy_and_fairness.public_person_ranking_authorized !== false) errors.push('public_ranking');
  if (program.boundaries.low_status_proves_hidden_capability !== false) errors.push('low_status_boundary');
  if (program.boundaries.rejection_proves_selector_bias !== false) errors.push('rejection_boundary');
  if (program.boundaries.program_becomes_new_recognition_monopoly !== false) errors.push('monopoly_boundary');
  if (program.current_state.candidate_records !== 0 || wave.candidate_records.length !== 0) errors.push('candidate_state');
  if (wave.execution.started !== false || wave.execution.lanes_executed !== 0) errors.push('execution_state');
  if (wave.comparison_design.blind_first_review !== true) errors.push('blind_review');
  if (wave.comparison_design.aggregate_rank_forbidden !== true) errors.push('wave_rank');
  if (program.current_state.graph_effect !== 'none' || wave.boundaries.graph_effect !== 'none') errors.push('graph_effect');
  return errors;
}

assert.deepEqual(structuralErrors(original), []);

const mutations = [
  ['hidden capability from low status', (p) => { p.boundaries.low_status_proves_hidden_capability = true; }, 'low_status_boundary'],
  ['selector bias from rejection', (p) => { p.boundaries.rejection_proves_selector_bias = true; }, 'rejection_boundary'],
  ['aggregate ranking', (p) => { p.scoring_contract.aggregate_score_generated = true; }, 'aggregate_score'],
  ['rank order', (p) => { p.scoring_contract.rank_order_generated = true; }, 'rank_order'],
  ['protected characteristic scoring', (p) => { p.privacy_and_fairness.protected_characteristics_used_for_scoring = true; }, 'protected_scoring'],
  ['AI scoring shortcut', (p) => { p.privacy_and_fairness.ai_use_used_as_positive_or_negative_signal = true; }, 'ai_scoring'],
  ['public person ranking', (p) => { p.privacy_and_fairness.public_person_ranking_authorized = true; }, 'public_ranking'],
  ['new recognition monopoly', (p) => { p.boundaries.program_becomes_new_recognition_monopoly = true; }, 'monopoly_boundary'],
  ['premature candidate admission', (_p, w) => { w.candidate_records.push({ candidate_id: 'CS-C0001' }); }, 'candidate_state'],
  ['execution self-award', (_p, w) => { w.execution.started = true; w.execution.lanes_executed = 10; }, 'execution_state'],
  ['identity-first review', (_p, w) => { w.comparison_design.blind_first_review = false; }, 'blind_review'],
  ['wave aggregate ranking', (_p, w) => { w.comparison_design.aggregate_rank_forbidden = false; }, 'wave_rank'],
  ['graph mutation', (p) => { p.current_state.graph_effect = 'edge'; }, 'graph_effect']
];

for (const [name, mutate, expected] of mutations) {
  const p = structuredClone(original);
  const w = structuredClone(waveOriginal);
  mutate(p, w);
  assert(structuralErrors(p, w).includes(expected), `${name} did not fail closed`);
}

console.log(`counter-selector.test: ${mutations.length} adversarial mutations PASS`);
