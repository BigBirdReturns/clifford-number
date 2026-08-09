import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {
  ROOT,
  SLUG,
  OUTPUT_DIR,
  PERMANENT_PATHS,
  TARGET,
  assert,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization.mjs';

const validator = `tools/validate-${SLUG}.mjs`;
const predecessor = 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json';

function editJson(root, relative, mutate) {
  const file = path.join(root, relative);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function mutateProduct(mutate) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-nd-exact-approval-'));
  try {
    for (const relative of PERMANENT_PATHS) {
      const source = path.join(ROOT, relative);
      const destination = path.join(temporary, relative);
      fs.mkdirSync(path.dirname(destination), {recursive: true});
      fs.copyFileSync(source, destination);
    }
    const predecessorDestination = path.join(temporary, predecessor);
    fs.mkdirSync(path.dirname(predecessorDestination), {recursive: true});
    fs.copyFileSync(path.join(ROOT, predecessor), predecessorDestination);
    mutate(temporary);
    const result = spawnSync(process.execPath, [path.join(temporary, validator)], {
      env: {...process.env, RD04_ROOT: temporary},
      encoding: 'utf8',
    });
    assert(result.status !== 0, `mutation was accepted: ${result.stdout} ${result.stderr}`);
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

const baseline = spawnSync(process.execPath, [path.join(ROOT, validator)], {encoding: 'utf8'});
assert(baseline.status === 0, `baseline validation failed: ${baseline.stdout} ${baseline.stderr}`);

const cases = [
  (root) => editJson(root, `${OUTPUT_DIR}/promoted-partial-field-matrix.json`, (value) => { value.rows[0].cells[0].authority_effect = 'mutated'; }),
  (root) => editJson(root, `${OUTPUT_DIR}/promoted-partial-field-matrix.json`, (value) => { findTarget(value).state = 'not_publicly_recovered'; }),
  (root) => editJson(root, `${OUTPUT_DIR}/promoted-partial-field-matrix.json`, (value) => { findRowState(value).state = 'evidence_complete'; findRowState(value).terminal = true; }),
  (root) => editJson(root, `${OUTPUT_DIR}/promoted-partial-field-matrix.json`, (value) => { findNorthDakota(value).row_state = 'terminal_fixed_public_record_obligation_complete'; }),
  (root) => editJson(root, `${OUTPUT_DIR}/promoted-partial-field-matrix.json`, (value) => { findNorthDakota(value).terminal_fields = 9; findNorthDakota(value).open_fields = 0; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-input-custody.json`, (value) => { value.publication_parent_lease.expected_tree = '0'.repeat(40); }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-input-custody.json`, (value) => { value.source_custody.embedded_pdf.data_base64 = `A${value.source_custody.embedded_pdf.data_base64.slice(1)}`; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-input-custody.json`, (value) => { value.source_custody.body_sha256 = '0'.repeat(64); }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-input-custody.json`, (value) => { value.page_complete_review.page_count = 4; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-decisions.json`, (value) => { value.decisions[0].bounded_finding.approved_areas[0] = 'Burleigh County'; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-decisions.json`, (value) => { value.decisions[0].bounded_finding.governing_period.expiration_date = '2027-06-30'; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-decisions.json`, (value) => { value.decision_count = 2; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-decisions.json`, (value) => { value.row_terminalization_count = 1; }),
  (root) => editJson(root, `${OUTPUT_DIR}/cell-transition-ledger.json`, (value) => { value.counts.matrix_updates = 2; }),
  (root) => editJson(root, `${OUTPUT_DIR}/cell-transition-ledger.json`, (value) => { value.transitions.push({...value.transitions[0], ordinal: 2, field_id: TARGET.rowFieldId}); }),
  (root) => editJson(root, `${OUTPUT_DIR}/remaining-open-field-census.json`, (value) => { value.counts.terminal_units = 11; }),
  (root) => editJson(root, `${OUTPUT_DIR}/remaining-open-field-census.json`, (value) => { const row = value.state_rows.find((item) => item.unit_id === TARGET.unitId); row.still_open_field_ids = []; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-summary.json`, (value) => { value.transition.row_state_after = 'terminal_fixed_public_record_obligation_complete'; }),
  (root) => editJson(root, `${OUTPUT_DIR}/terminalization-summary.json`, (value) => { value.current_result.north_dakota_row_terminalized = true; }),
  (root) => editJson(root, `${OUTPUT_DIR}/index.json`, (value) => { value.counts.row_terminalizations = 1; }),
  (root) => editJson(root, `${OUTPUT_DIR}/index.json`, (value) => { value.current_result.north_dakota_fixed_public_record_obligation_complete = true; }),
  (root) => editJson(root, `${OUTPUT_DIR}/product-manifest.json`, (value) => { value.permanent_path_count = 15; }),
  (root) => editJson(root, `${OUTPUT_DIR}/product-manifest.json`, (value) => { value.combined_sha256 = '0'.repeat(64); }),
  (root) => fs.appendFileSync(path.join(root, `.github/workflows/${SLUG}.yml`), '\npermissions:\n  contents: write\n'),
  (root) => fs.appendFileSync(path.join(root, 'docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization.md'), '\nunauthorized drift\n'),
  (root) => fs.unlinkSync(path.join(root, `${OUTPUT_DIR}/index.json`)),
  (root) => { const file = path.join(root, predecessor); const bytes = fs.readFileSync(file); bytes[100] ^= 1; fs.writeFileSync(file, bytes); },
  (root) => fs.appendFileSync(path.join(root, `tools/build-${SLUG}.mjs`), '\n// drift\n'),
  (root) => fs.appendFileSync(path.join(root, `tools/validate-${SLUG}.mjs`), '\n// drift\n'),
];

for (const testCase of cases) mutateProduct(testCase);
console.log(`rd04_nd_fy2025_waiver_approval_terminalization_adversarial=pass mutations=${cases.length}`);

function findNorthDakota(matrix) {
  return matrix.rows.find((row) => row.unit_id === TARGET.unitId);
}

function findTarget(matrix) {
  return findNorthDakota(matrix).cells.find((cell) => cell.field_id === TARGET.fieldId);
}

function findRowState(matrix) {
  return findNorthDakota(matrix).cells.find((cell) => cell.field_id === TARGET.rowFieldId);
}
