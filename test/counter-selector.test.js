#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectStructuralErrors, hydrateRegistry } from '../tools/validate-counter-selector.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const program0 = read('data/project/counter-selector-program.json');
const registry0 = hydrateRegistry(read('data/project/counter-selector-candidate-registry.json'));
const supersession0 = read('data/project/counter-selector-wave-00-supersession.json');
const wave0 = read('data/project/counter-selector-wave-01.json');
const schema0 = read('schemas/counter-selector-candidate.schema.json');

function expectMutation(name, mutate, code) {
  const program = clone(program0);
  const registry = clone(registry0);
  const supersession = clone(supersession0);
  const wave = clone(wave0);
  const schema = clone(schema0);
  mutate({ program, registry, supersession, wave, schema });
  const errors = collectStructuralErrors(program, registry, wave, schema, supersession);
  assert(errors.some((error) => error.startsWith(`${code}:`)), `${name}: expected ${code}, received ${errors.join(', ')}`);
}

const mutations = [
  ['capability boundary cannot flip', ({ program }) => { program.boundaries.status_output_mismatch_proves_capability = true; }, 'PROGRAM_BOUNDARY'],
  ['aggregate score cannot activate', ({ program }) => { program.dimension_contract.numeric_aggregate_generated = true; }, 'PROGRAM_RANK_BOUNDARY'],
  ['candidate required field cannot disappear', ({ registry }) => { delete registry.candidates[0].custody; }, 'CANDIDATE_REQUIRED'],
  ['candidate ids remain unique', ({ registry }) => { registry.candidates[1].candidate_id = registry.candidates[0].candidate_id; }, 'CANDIDATE_ID_DUP'],
  ['source records count once', ({ registry }) => { registry.candidates[1].source_ids = [...registry.candidates[0].source_ids]; registry.candidates[1].source_routes[0].record_id = registry.candidates[0].source_ids[0]; }, 'SOURCE_ID_DUP'],
  ['each class retains five objects', ({ registry }) => { registry.candidates[0].denominator_class = 'ordinary_specialists'; }, 'CLASS_COUNT'],
  ['source intake cannot promote itself', ({ registry }) => { registry.candidates[0].review_state = 'supported_for_bounded_field_test'; }, 'REVIEW_STATE'],
  ['dimension cannot be pre-scored', ({ registry }) => { registry.candidates[0].support_adjusted_surplus = 'bounded_observation'; }, 'DIMENSION_PREMATURE'],
  ['status residual cannot appear before test', ({ registry }) => { registry.candidates[0].status_output_residual = 0.9; }, 'STATUS_RESIDUAL'],
  ['bounded test cannot be backfilled', ({ registry }) => { registry.candidates[0].bounded_test = 'complete'; }, 'TEST_PREMATURE'],
  ['field result cannot be fabricated', ({ registry }) => { registry.candidates[0].field_result = 'observed'; }, 'FIELD_RESULT'],
  ['private evidence cannot enter silently', ({ registry }) => { registry.candidates[0].privacy.private_evidence_used = true; }, 'PRIVACY'],
  ['public identity release cannot be inferred', ({ registry }) => { registry.candidates[0].privacy.public_identity_release_authorized = true; }, 'PRIVACY'],
  ['graph effect cannot activate', ({ registry }) => { registry.candidates[0].graph_effect = 'actor_edge'; }, 'GRAPH_EFFECT'],
  ['matched control must exist', ({ registry }) => { registry.candidates[0].matched_control.candidate_id = 'CS-C9999'; registry.candidates[0].comparators = ['CS-C9999']; }, 'MATCHED_CONTROL'],
  ['source route must stay internally typed', ({ registry }) => { registry.candidates[0].source_routes[0].path = 'data/actors.json'; }, 'SOURCE_ROUTE'],
  ['Wave 00 supersession cannot restore premature scores', ({ supersession }) => { supersession.replacement_contract.status_output_residual_before_field_test = 0; }, 'SUPERSESSION_CONTRACT'],
  ['wave cannot claim tests', ({ wave }) => { wave.execution.bounded_tests_executed = 1; }, 'WAVE_EXECUTION'],
  ['denominator cannot become complete by assertion alone', ({ registry }) => { registry.denominator.current = 29; }, 'DENOMINATOR']
];

for (const [name, mutate, code] of mutations) expectMutation(name, mutate, code);
const baselineErrors = collectStructuralErrors(program0, registry0, wave0, schema0, supersession0);
assert.deepEqual(baselineErrors, [], baselineErrors.join('\n'));
console.log(`counter-selector.test: PASS (${mutations.length} adversarial mutations)`);
