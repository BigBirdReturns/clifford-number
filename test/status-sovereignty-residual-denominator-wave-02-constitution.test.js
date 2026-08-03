#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  CONSTITUTION_PATH,
  SCHEMA_PATH,
  validateConstitutionData
} from '../tools/validate-status-sovereignty-residual-denominator-wave-02-constitution.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = read(CONSTITUTION_PATH);
const schema = read(SCHEMA_PATH);

const clone = () => structuredClone(base);
const fail = (message) => { throw new Error(message); };
const expectFailure = (name, mutate, pattern) => {
  const value = clone();
  mutate(value);
  try {
    validateConstitutionData(value, schema);
    fail(`${name}: mutation unexpectedly passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error ${error.message}`);
  }
};

validateConstitutionData(base, schema);

const cases = [
  ['wave identity', (v) => { v.wave_id = 'SSC-RD-W03'; }, /wave identity/],
  ['issue custody', (v) => { v.issue = 999; }, /issue or date/],
  ['A09 parent', (v) => { v.parent_custody.rd04_a09_merge = '0'.repeat(40); }, /A09 parent/],
  ['frozen base', (v) => { v.parent_custody.frozen_execution_base = '0'.repeat(40); }, /frozen execution base/],
  ['starting closure', (v) => { v.parent_custody.closed_residual_classes = 1; }, /launch closure/],
  ['attempt ceiling', (v) => { v.closure_contract.maximum_closed_classes_after_wave = 42; }, /attempt ceiling/],
  ['terminal vocabulary', (v) => { v.closure_contract.permitted_terminal_states.push('unsupported_promotion'); }, /terminal states/],
  ['closure conditions', (v) => { v.closure_contract.required_conditions.pop(); }, /closure conditions/],
  ['missing lane', (v) => { v.lane_attempts.pop(); }, /six lane attempts/],
  ['duplicate class', (v) => { v.lane_attempts[1].class_id = v.lane_attempts[0].class_id; }, /duplicate class/],
  ['lane reorder', (v) => { [v.lane_attempts[0], v.lane_attempts[1]] = [v.lane_attempts[1], v.lane_attempts[0]]; }, /lane order or identity/],
  ['canonical ordinal', (v) => { v.lane_attempts[2].canonical_ordinal = 5; }, /canonical ordinal/],
  ['source binding', (v) => { v.lane_attempts[3].source_path = v.lane_attempts[2].source_path; }, /source binding/],
  ['class label', (v) => { v.lane_attempts[4].exact_label = 'completed recommendations'; }, /exact class label/],
  ['unit denominator', (v) => { v.lane_attempts[5].initial_unit_count = 3; }, /launch unit count/],
  ['outcome selection', (v) => { v.lane_attempts[0].selected_because_expected_result = true; }, /outcome-selected/],
  ['unreceipted execution', (v) => { v.lane_attempts[1].execution_state = 'complete'; }, /unreceipted execution/],
  ['unreceipted closure', (v) => { v.lane_attempts[2].class_closed = true; }, /class closed without receipt/],
  ['invented receipt', (v) => { v.counts.terminal_class_receipts = 1; }, /terminal receipt invented/],
  ['class accounting', (v) => { v.counts.classes_closed_this_wave = 1; }, /class accounting promoted/],
  ['human dependency', (v) => { v.counts.outside_human_dependencies = 1; }, /outside_human_dependencies/],
  ['reviewed disposition', (v) => { v.counts.reviewed_disposition_changes = 1; }, /reviewed_disposition_changes/],
  ['empirical state', (v) => { v.current_result.empirical_acquisition_started = true; }, /unreceipted empirical acquisition/],
  ['project block', (v) => { v.current_result.project_blocking = true; }, /human or project dependency/],
  ['graph effect', (v) => { v.current_result.graph_effect = 'added'; }, /effect authority/],
  ['boundary weakening', (v) => { v.boundaries.source_unavailability_is_noncompliance = true; }, /source_unavailability_is_noncompliance/]
];

for (const [name, mutate, pattern] of cases) expectFailure(name, mutate, pattern);
console.log(`status-sovereignty-residual-denominator-wave-02-constitution.test: positive plus ${cases.length} adversarial mutations passed`);
