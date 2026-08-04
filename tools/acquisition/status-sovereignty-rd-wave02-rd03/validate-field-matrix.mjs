#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PARENT_PATH, SEED_PATH, OUTPUT_PATH, REQUIRED_FIELDS } from './build-field-matrix.mjs';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const ALLOWED = new Set(['observed','not_applicable_by_instrument_state','source_restricted','source_unavailable_after_fixed_protocol','not_publicly_recovered','identity_withheld_under_policy']);

export function validateMatrixData(matrix, parent = readJson(PARENT_PATH), seed = readJson(SEED_PATH)) {
  ok(matrix.schema_version === 'ssc-rd-wave02-rd03-negotiated-terms-field-matrix@1', 'matrix schema');
  ok(matrix.class_id === 'RD-03-C04' && matrix.issue === 788, 'matrix identity');
  ok(matrix.status === 'immutable_five_instrument_field_matrix_pending_fixed_protocol', 'matrix status');
  ok(seed.input_manifest.combined_sha256 === matrix.parent.seed_input_manifest_sha256, 'seed digest');
  ok(parent.execution_id === matrix.parent.execution_id, 'parent execution');
  ok(Array.isArray(parent.instruments) && parent.instruments.length === 5, 'parent denominator');
  ok(Array.isArray(matrix.instruments) && matrix.instruments.length === 5, 'matrix denominator');
  ok(JSON.stringify(matrix.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required field order');
  const expectedIds = parent.instruments.map((row) => row.instrument_id);
  ok(JSON.stringify(matrix.denominator_contract.instrument_ids) === JSON.stringify(expectedIds), 'instrument denominator IDs');
  for (let index = 0; index < 5; index += 1) {
    const row = matrix.instruments[index];
    const source = parent.instruments[index];
    ok(row.instrument_id === source.instrument_id && row.borrower === source.borrower, `instrument ${index + 1} identity changed`);
    ok(row.parent_state.instrument_id === source.instrument_id && row.parent_state.bounded_state === source.bounded_state, `${row.instrument_id} parent state changed`);
    ok(Object.keys(row.fields).length === REQUIRED_FIELDS.length, `${row.instrument_id} field denominator`);
    for (const key of REQUIRED_FIELDS) {
      const field = row.fields[key];
      ok(field && ALLOWED.has(field.state), `${row.instrument_id} ${key} state`);
      ok(Array.isArray(field.source_ids), `${row.instrument_id} ${key} sources`);
      ok(typeof field.fixed_protocol_complete === 'boolean' && typeof field.terminal_for_class_closure === 'boolean', `${row.instrument_id} ${key} flags`);
      if (field.state === 'not_publicly_recovered') {
        ok(field.value === null, `${row.instrument_id} ${key} unresolved value`);
        ok(field.fixed_protocol_complete === false && field.terminal_for_class_closure === false, `${row.instrument_id} ${key} premature terminal`);
      }
      ok(field.value !== 0, `${row.instrument_id} ${key} unknown substituted as zero`);
    }
    ok(row.instrument_result.fixed_protocol_executed === false && row.instrument_result.instrument_closed === false, `${row.instrument_id} premature closure`);
    ok(row.instrument_result.terminal_state === 'still_open', `${row.instrument_id} terminal state`);
  }
  ok(matrix.counts.instruments === 5 && matrix.counts.closed_instruments === 0, 'matrix counts');
  ok(matrix.current_result.fixed_protocol_complete === false && matrix.current_result.class_closed === false, 'class prematurely closed');
  ok(matrix.current_result.reviewed_disposition_changed === false, 'reviewed disposition changed');
  ok(matrix.boundaries.outside_human_dependency === false, 'human dependency');
  ok(matrix.counts.external_contacts === 0 && matrix.counts.external_reviews === 0, 'outside activity');
  ok(matrix.current_result.graph_effect === 'none' && matrix.current_result.publication_effect === 'none' && matrix.current_result.adoption_effect === 'none', 'authority effect');
  return true;
}

export function validateRepository() {
  validateMatrixData(readJson(OUTPUT_PATH));
  console.log('validate-rd03-field-matrix: PASS — exact 5 instruments, required fields present, fixed protocol still open');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validateRepository(); } catch (error) { console.error(`validate-rd03-field-matrix: ${error.message}`); process.exit(1); }
}
