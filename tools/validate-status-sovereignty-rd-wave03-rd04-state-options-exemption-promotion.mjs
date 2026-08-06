#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  BASE_MATRIX_PATH,
  SOURCE_CUSTODY_PATH,
  SOURCE_PAGE_PATH,
  REGISTER_PATH,
  MATRIX_PATH,
  CENSUS_PATH,
  SUMMARY_PATH,
  MANIFEST_PATH,
  TARGET_FIELD,
  SOURCE_ID,
  buildProduct,
  readRegister,
} from './build-status-sovereignty-rd-wave03-rd04-state-options-exemption-promotion.mjs';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => fs.readFileSync(abs(root, rel));
const json = (root, rel) => JSON.parse(read(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (left, right, message) => ok(JSON.stringify(left) === JSON.stringify(right), message);

export function validateProduct(root = ROOT) {
  const generated = buildProduct(root);
  for (const [rel, expected] of Object.entries(generated)) {
    ok(Buffer.compare(read(root, rel), expected) === 0, `${rel}: deterministic output mismatch`);
  }
  const base = json(root, BASE_MATRIX_PATH);
  const source = json(root, SOURCE_CUSTODY_PATH);
  const matrix = json(root, MATRIX_PATH);
  const census = json(root, CENSUS_PATH);
  const summary = json(root, SUMMARY_PATH);
  const manifest = json(root, MANIFEST_PATH);
  const register = readRegister(root);

  ok(matrix.rows.length === 50 && register.length === 50, 'fifty-state denominator changed');
  ok(new Set(matrix.rows.map((row) => row.state_name)).size === 50, 'matrix state identity duplicated');
  ok(new Set(register.map((row) => row.state_name)).size === 50, 'register state identity duplicated');
  ok(matrix.counts.terminal_cells === 181 && matrix.counts.still_open_cells === 269, 'matrix terminal arithmetic changed');
  ok(matrix.counts.newly_terminalized_cells === 50, 'new terminal-cell denominator changed');
  ok(matrix.counts.terminal_units === 0 && matrix.counts.class_closed === false, 'class or row closure inflated');
  ok(census.counts.terminal_substantive_cells === 81 && census.counts.still_open_substantive_cells === 219, 'substantive census changed');
  ok(census.open_cells.length === 269, 'open-cell ledger changed');
  ok(summary.source_request_attempts === 1 && summary.additional_empirical_source_requests === 0, 'source request custody changed');
  ok(summary.reported_use_rows === 37 && summary.reported_no_use_rows === 13, 'reported practice counts changed');
  ok(summary.class_closed === false && summary.outside_human_dependency === false, 'authority ceiling changed');

  const registerByState = new Map(register.map((row) => [row.state_name, row]));
  let useRows = 0;
  for (let index = 0; index < matrix.rows.length; index += 1) {
    const before = base.rows[index];
    const after = matrix.rows[index];
    const finding = registerByState.get(after.state_name);
    ok(before.unit_id === after.unit_id && before.postal_code === after.postal_code && before.state_name === after.state_name, `${after.state_name}: row identity changed`);
    ok(finding?.unit_id === after.unit_id && finding?.unit_ordinal === after.unit_ordinal, `${after.state_name}: register identity mismatch`);
    for (const beforeCell of before.cells) {
      const afterCell = after.cells.find((cell) => cell.field_id === beforeCell.field_id);
      ok(afterCell, `${after.state_name}: field removed: ${beforeCell.field_id}`);
      if (beforeCell.field_id === TARGET_FIELD) {
        ok(beforeCell.terminal === false && afterCell.terminal === true && afterCell.state === 'evidence_complete', `${after.state_name}: target transition invalid`);
        same(afterCell.value, finding.value, `${after.state_name}: target value differs from register`);
        same(afterCell.evidence_source_ids, [SOURCE_ID], `${after.state_name}: source identity changed`);
        ok(afterCell.typed_gap === null && afterCell.authority_effect === 'bounded_ffy2024_reported_state_practice_only', `${after.state_name}: target authority changed`);
        if (afterCell.value.reported_state_practice.used_discretionary_exemptions) useRows += 1;
      } else if (beforeCell.field_id === 'field_and_row_terminal_state') {
        ok(afterCell.terminal === false && afterCell.state === beforeCell.state, `${after.state_name}: row state terminalized`);
        ok(afterCell.typed_gap === `row_remains_open_because_${after.open_fields}_required_cells_are_unresolved`, `${after.state_name}: row-state gap is stale`);
        const beforeComparable = { ...beforeCell, typed_gap: afterCell.typed_gap };
        same(afterCell, beforeComparable, `${after.state_name}: row-state cell changed beyond open-count refresh`);
      } else {
        same(afterCell, beforeCell, `${after.state_name}: non-target field changed: ${beforeCell.field_id}`);
      }
    }
    ok(after.terminal_fields === before.terminal_fields + 1, `${after.state_name}: terminal field count did not advance by one`);
    ok(after.open_fields === before.open_fields - 1, `${after.state_name}: open field count did not decline by one`);
    ok(after.row_state === 'still_open', `${after.state_name}: row closed`);
  }
  ok(useRows === 37, 'matrix reported-use count changed');

  const page = read(root, SOURCE_PAGE_PATH).toString('utf8');
  const normalized = page.replace(/\s+/g, ' ').trim();
  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  for (const phrase of ['ABAWD Discretionary Exemptions', 'Section 6(o)(6)', '273.24(g)', 'FFY 2024', 'Use of discretionary', 'Data reference period']) {
    ok(normalized.includes(phrase), `source page phrase missing: ${phrase}`);
  }
  ok(compact.includes('nouseofdiscretionaryexemptions(16)'), 'source page no-use heading changed');
  ok(source.document.body_sha256 === 'b5970b4f3847f6c4c0cbcf15755728f3671ffdb7ae78babe40aec6ec0ca59b75', 'source PDF digest changed');
  ok(source.retained_artifact_adjudication.artifact_id === 8950104341, 'adjudication artifact changed');

  ok(manifest.entries.length === 6, 'manifest entry denominator changed');
  const manifestLines = [];
  for (const entry of manifest.entries) {
    const payload = read(root, `${path.dirname(MANIFEST_PATH)}/${entry.path}`);
    ok(payload.length === entry.bytes, `${entry.path}: manifest byte count changed`);
    ok(sha256(payload) === entry.sha256, `${entry.path}: manifest digest changed`);
    manifestLines.push(`${entry.sha256}  ${entry.path}\n`);
  }
  ok(sha256(Buffer.from(manifestLines.join(''), 'utf8')) === manifest.combined_sha256, 'manifest combined digest changed');

  for (const key of [
    'reviewed_disposition_effect', 'publication_effect', 'adoption_effect', 'graph_effect',
    'prevalence_effect', 'discrimination_effect', 'coordination_effect', 'common_purpose_effect',
    'racial_order_effect', 'complete_compact_effect',
  ]) ok(summary[key] === 'none', `${key} changed`);

  return {
    terminal_cells: 181,
    still_open_cells: 269,
    terminal_substantive_cells: 81,
    still_open_substantive_cells: 219,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    class_closed: false,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateProduct(ROOT);
  console.log(`rd04_state_options_exemption_validation=pass terminal=${result.terminal_cells}/450 open_substantive=${result.still_open_substantive_cells}`);
}
