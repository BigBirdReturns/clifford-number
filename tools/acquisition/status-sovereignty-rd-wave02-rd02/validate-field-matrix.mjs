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
  ok(matrix.schema_version === 'ssc-rd-wave02-rd02-license-leverage-field-matrix@1', 'matrix schema');
  ok(matrix.class_id === 'RD-02-C04' && matrix.issue === 787, 'matrix identity');
  ok(matrix.status === 'immutable_eighteen_row_field_matrix_pending_fixed_protocol', 'matrix status');
  ok(seed.input_manifest.combined_sha256 === matrix.parent.seed_input_manifest_sha256, 'seed digest');
  ok(parent.execution_id === matrix.parent.execution_id, 'parent execution');
  ok(Array.isArray(parent.cohort_rows) && parent.cohort_rows.length === 18, 'parent denominator');
  ok(Array.isArray(matrix.rows) && matrix.rows.length === 18, 'matrix denominator');
  ok(JSON.stringify(matrix.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required field order');
  ok(matrix.denominator_contract.publicly_named_rows === 17 && matrix.denominator_contract.withheld_rows === 1, 'denominator classes');

  const rowNumbers = matrix.rows.map((row) => row.row);
  ok(JSON.stringify(rowNumbers) === JSON.stringify(Array.from({length: 18}, (_, index) => index + 1)), 'row order');
  for (let index = 0; index < 18; index += 1) {
    const row = matrix.rows[index];
    const source = parent.cohort_rows[index];
    ok(row.legal_vehicle === source.legal_vehicle, `row ${row.row} identity changed`);
    ok(row.parent_state.row === source.row && row.parent_state.legal_vehicle === source.legal_vehicle, `row ${row.row} parent state changed`);
    ok(Object.keys(row.fields).length === REQUIRED_FIELDS.length, `row ${row.row} field denominator`);
    for (const key of REQUIRED_FIELDS) {
      const field = row.fields[key];
      ok(field && ALLOWED.has(field.state), `row ${row.row} ${key} state`);
      ok(Array.isArray(field.source_ids), `row ${row.row} ${key} sources`);
      ok(typeof field.fixed_protocol_complete === 'boolean' && typeof field.terminal_for_class_closure === 'boolean', `row ${row.row} ${key} flags`);
      if (field.state === 'not_publicly_recovered') {
        ok(field.value === null, `row ${row.row} ${key} unresolved value`);
        ok(field.fixed_protocol_complete === false && field.terminal_for_class_closure === false, `row ${row.row} ${key} premature terminal`);
      }
      ok(field.value !== 0, `row ${row.row} ${key} unknown substituted as zero`);
    }
    ok(row.row_result.fixed_protocol_executed === false && row.row_result.row_closed === false, `row ${row.row} premature closure`);
    ok(row.row_result.terminal_state === 'still_open', `row ${row.row} terminal state`);
  }
  ok(matrix.counts.rows === 18 && matrix.counts.publicly_named_rows === 17 && matrix.counts.withheld_rows === 1, 'matrix counts');
  ok(matrix.counts.closed_rows === 0 && matrix.counts.fixed_protocol_completed_rows === 0, 'premature completion count');
  ok(matrix.current_result.fixed_protocol_complete === false && matrix.current_result.class_closed === false, 'class prematurely closed');
  ok(matrix.current_result.reviewed_disposition_changed === false, 'reviewed disposition changed');
  ok(matrix.boundaries.outside_human_dependency === false, 'human dependency');
  ok(matrix.counts.external_contacts === 0 && matrix.counts.external_reviews === 0, 'outside activity');
  ok(matrix.current_result.graph_effect === 'none' && matrix.current_result.publication_effect === 'none' && matrix.current_result.adoption_effect === 'none', 'authority effect');
  return true;
}

export function validateRepository() {
  const matrix = readJson(OUTPUT_PATH);
  validateMatrixData(matrix);
  console.log('validate-rd02-field-matrix: PASS — exact 18 rows, required fields present, fixed protocol still open');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validateRepository(); } catch (error) { console.error(`validate-rd02-field-matrix: ${error.message}`); process.exit(1); }
}
