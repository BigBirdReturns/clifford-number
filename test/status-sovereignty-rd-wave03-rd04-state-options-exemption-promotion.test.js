#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, DATA_ROOT, BASE_MATRIX_PATH, SOURCE_CUSTODY_PATH, REGISTER_PATH, MATRIX_PATH, CENSUS_PATH, SUMMARY_PATH, MANIFEST_PATH } from '../tools/build-status-sovereignty-rd-wave03-rd04-state-options-exemption-promotion.mjs';
import { validateProduct } from '../tools/validate-status-sovereignty-rd-wave03-rd04-state-options-exemption-promotion.mjs';

const ok = (condition, message) => { if (!condition) throw new Error(message); };
const copy = (sourceRoot, targetRoot, rel) => {
  const source = path.join(sourceRoot, rel);
  const target = path.join(targetRoot, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};
const template = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-state-options-template-'));
for (const rel of [BASE_MATRIX_PATH, SOURCE_CUSTODY_PATH, `${DATA_ROOT}/source-page-11.txt`, REGISTER_PATH, MATRIX_PATH, CENSUS_PATH, SUMMARY_PATH, MANIFEST_PATH]) copy(ROOT, template, rel);
validateProduct(template);

let refused = 0;
function mutation(rel, transform, label) {
  const target = path.join(template, rel);
  const original = fs.readFileSync(target);
  try {
    fs.writeFileSync(target, transform(Buffer.from(original)));
    let failed = false;
    try { validateProduct(template); } catch { failed = true; }
    ok(failed, `mutation was accepted: ${label}`);
    refused += 1;
  } finally {
    fs.writeFileSync(target, original);
  }
}
function jsonMutation(rel, transform, label) {
  mutation(rel, (buffer) => {
    const value = JSON.parse(buffer.toString('utf8'));
    transform(value);
    return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  }, label);
}

for (const [key, replacement] of [
  ['source_id', 'RD04-SOURCE-SUBSTITUTED'],
  ['issue', 9999],
]) jsonMutation(SOURCE_CUSTODY_PATH, (value) => { value[key] = replacement; }, `source ${key}`);
for (const key of ['source_request_attempts','artifact_id','artifact_zip_bytes']) {
  jsonMutation(SOURCE_CUSTODY_PATH, (value) => { value.initial_acquisition[key] += 1; }, `initial ${key}`);
}
for (const key of ['artifact_id','artifact_zip_bytes','artifact_retrieval_requests']) {
  jsonMutation(SOURCE_CUSTODY_PATH, (value) => { value.retained_artifact_adjudication[key] += 1; }, `adjudication ${key}`);
}
for (const key of ['body_bytes','pdf_pages']) jsonMutation(SOURCE_CUSTODY_PATH, (value) => { value.document[key] += 1; }, `document ${key}`);
for (const key of ['state_rows','reported_use_rows','reported_no_use_rows']) jsonMutation(SOURCE_CUSTODY_PATH, (value) => { value.extraction[key] += 1; }, `extraction ${key}`);
for (const key of ['class_closed','outside_human_dependency','reported_ffy2024_use_is_current_2026_practice']) {
  jsonMutation(SOURCE_CUSTODY_PATH, (value) => { value.interpretation_contract[key] = true; }, `authority ${key}`);
}

const registerLines = fs.readFileSync(path.join(template, REGISTER_PATH), 'utf8').trimEnd().split('\n');
for (let index = 0; index < 50; index += 1) {
  mutation(REGISTER_PATH, () => {
    const lines = [...registerLines];
    const row = JSON.parse(lines[index]);
    row.value.reported_state_practice.used_discretionary_exemptions = !row.value.reported_state_practice.used_discretionary_exemptions;
    lines[index] = JSON.stringify(row);
    return Buffer.from(`${lines.join('\n')}\n`);
  }, `register category ${index + 1}`);
}
for (let index = 0; index < 12; index += 1) {
  jsonMutation(MATRIX_PATH, (value) => {
    const cell = value.rows[index].cells.find((item) => item.field_id === 'discretionary_exemption_authority_and_reported_state_practice');
    cell.terminal = false;
  }, `matrix target ${index + 1}`);
}
for (const key of ['terminal_cells_after','still_open_cells_after','terminal_substantive_cells_after','still_open_substantive_cells_after','reported_use_rows','reported_no_use_rows']) {
  jsonMutation(SUMMARY_PATH, (value) => { value[key] += 1; }, `summary ${key}`);
}
for (const key of ['terminal_cells','still_open_cells','terminal_substantive_cells','still_open_substantive_cells']) {
  jsonMutation(CENSUS_PATH, (value) => { value.counts[key] += 1; }, `census ${key}`);
}
for (let index = 0; index < 6; index += 1) {
  jsonMutation(MANIFEST_PATH, (value) => { value.entries[index].sha256 = '0'.repeat(64); }, `manifest ${index + 1}`);
}

ok(refused === 94, `expected 94 refused mutations, received ${refused}`);
console.log(`rd04_state_options_exemption_adversarial=pass refused=${refused}`);
