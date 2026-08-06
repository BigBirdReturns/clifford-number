#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WAVE_ID = 'SSC-RD-W03';
export const LANE_ID = 'RD-04';
export const CLASS_ID = 'RD-04-C02';
export const ISSUE = 1017;
export const DATA_ROOT = 'data/intake/status-sovereignty-rd-wave03-rd04-state-options-exemption-promotion';
export const BASE_MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-field-promotion/promoted-partial-field-matrix.json';
export const SOURCE_CUSTODY_PATH = `${DATA_ROOT}/source-custody.json`;
export const SOURCE_PAGE_PATH = `${DATA_ROOT}/source-page-11.txt`;
export const REGISTER_PATH = `${DATA_ROOT}/state-field-register.jsonl`;
export const MATRIX_PATH = `${DATA_ROOT}/promoted-partial-field-matrix.json`;
export const CENSUS_PATH = `${DATA_ROOT}/remaining-open-field-census.json`;
export const SUMMARY_PATH = `${DATA_ROOT}/promotion-summary.json`;
export const MANIFEST_PATH = `${DATA_ROOT}/product-manifest.json`;
export const TARGET_FIELD = 'discretionary_exemption_authority_and_reported_state_practice';
export const SOURCE_ID = 'RD04-SOURCE-FNS-STATE-OPTIONS-17E-P11';
export const BASE_MATRIX_SHA256 = '267b6315fe19c0470f0fa0f1b12c37662b5cb7fccd2df7335502fb3733d4e3ca';
export const SOURCE_CUSTODY_SHA256 = '209469f5ae47ed47e4d25a243376718386fe52c10cbb51895a4d61d9a4fd29ec';
export const SOURCE_PAGE_SHA256 = '6fd56a3be1216edb632d5488a622944ce2cf5ff4f57d3b198bd3f85888fd0d56';
export const REGISTER_SHA256 = '06f287b717e9b49b85a5b9e2760c92b5eb244513ad7f2e13dbac7b547bfe006b';

const abs = (root, rel) => path.join(root, rel);
const bytes = (root, rel) => fs.readFileSync(abs(root, rel));
const text = (root, rel) => bytes(root, rel).toString('utf8');
const readJson = (root, rel) => JSON.parse(text(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const clone = (value) => JSON.parse(JSON.stringify(value));

export function verifyInputs(root = ROOT) {
  const expected = new Map([
    [BASE_MATRIX_PATH, BASE_MATRIX_SHA256],
    [SOURCE_CUSTODY_PATH, SOURCE_CUSTODY_SHA256],
    [SOURCE_PAGE_PATH, SOURCE_PAGE_SHA256],
    [REGISTER_PATH, REGISTER_SHA256],
  ]);
  for (const [rel, digest] of expected) {
    ok(sha256(bytes(root, rel)) === digest, `${rel}: frozen input bytes changed`);
  }
}

export function readRegister(root = ROOT) {
  const lines = text(root, REGISTER_PATH).split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`register row ${index + 1} is not JSON: ${error.message}`); }
  });
  ok(rows.length === 50, 'state-field register must contain exactly fifty rows');
  return rows;
}

function manifestEntry(buffer, rel) {
  return { path: rel, bytes: buffer.length, sha256: sha256(buffer) };
}

export function buildProduct(root = ROOT) {
  verifyInputs(root);
  const base = readJson(root, BASE_MATRIX_PATH);
  const source = readJson(root, SOURCE_CUSTODY_PATH);
  const register = readRegister(root);
  ok(base.counts?.terminal_cells === 131 && base.counts?.still_open_cells === 319, 'base matrix counts changed');
  ok(source.source_id === SOURCE_ID, 'source identity changed');
  ok(source.initial_acquisition?.source_request_attempts === 1, 'source request denominator changed');
  ok(source.retained_artifact_adjudication?.additional_empirical_source_requests === 0, 'unexpected empirical replay');
  ok(source.extraction?.state_rows === 50 && source.extraction?.reported_use_rows === 37 && source.extraction?.reported_no_use_rows === 13, 'source row denominator changed');

  const byState = new Map();
  for (const finding of register) {
    ok(!byState.has(finding.state_name), `duplicate register state: ${finding.state_name}`);
    ok(finding.field_id === TARGET_FIELD, `${finding.state_name}: wrong target field`);
    ok(finding.terminal === true && finding.terminal_state === 'evidence_complete', `${finding.state_name}: register row is not terminal`);
    ok(JSON.stringify(finding.evidence_source_ids) === JSON.stringify([SOURCE_ID]), `${finding.state_name}: source identity changed`);
    byState.set(finding.state_name, finding);
  }
  ok(byState.size === 50, 'register state denominator changed');

  const matrix = clone(base);
  matrix.schema_version = 'ssc-rd04-wave03-state-options-exemption-promoted-partial-field-matrix@1';
  matrix.source_product = {
    source_custody_path: SOURCE_CUSTODY_PATH,
    source_page_text_path: SOURCE_PAGE_PATH,
    state_field_register_path: REGISTER_PATH,
    source_id: SOURCE_ID,
    reference_period: 'FFY 2024',
  };
  for (const row of matrix.rows) {
    const finding = byState.get(row.state_name);
    ok(finding, `missing register state: ${row.state_name}`);
    ok(finding.unit_id === row.unit_id && finding.postal_code === row.postal_code && finding.unit_ordinal === row.unit_ordinal, `${row.state_name}: identity drift`);
    const target = row.cells.find((cell) => cell.field_id === TARGET_FIELD);
    ok(target?.state === 'still_open' && target?.terminal === false, `${row.state_name}: target cell was not open`);
    Object.assign(target, {
      state: finding.terminal_state,
      terminal: finding.terminal,
      value: finding.value,
      evidence_source_ids: finding.evidence_source_ids,
      typed_gap: finding.typed_gap,
      authority_effect: finding.authority_effect,
    });
    row.terminal_fields = row.cells.filter((cell) => cell.terminal).length;
    row.open_fields = row.cells.length - row.terminal_fields;
    row.row_state = 'still_open';
    const rowState = row.cells.find((cell) => cell.field_id === 'field_and_row_terminal_state');
    ok(rowState?.terminal === false, `${row.state_name}: row-state cell unexpectedly terminal`);
    rowState.typed_gap = `row_remains_open_because_${row.open_fields}_required_cells_are_unresolved`;
  }

  const terminalCells = matrix.rows.flatMap((row) => row.cells).filter((cell) => cell.terminal).length;
  const openCells = 450 - terminalCells;
  const substantiveFields = new Set(matrix.field_order.slice(1, 7));
  const substantiveTerminal = matrix.rows.flatMap((row) => row.cells)
    .filter((cell) => substantiveFields.has(cell.field_id) && cell.terminal).length;
  const substantiveOpen = 300 - substantiveTerminal;
  ok(terminalCells === 181 && openCells === 269, 'post-promotion matrix arithmetic changed');
  ok(substantiveTerminal === 81 && substantiveOpen === 219, 'substantive matrix arithmetic changed');

  matrix.counts = {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    inherited_terminal_cells: 131,
    newly_terminalized_cells: 50,
    evidence_complete_cells: 181,
    still_open_cells: 269,
    terminal_cells: 181,
    source_rows_promoted: 50,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    terminal_units: 0,
    class_closed: false,
  };
  matrix.current_result = {
    canonical_state_identity_terminal: '50/50',
    source_identities_and_exact_custody_terminal: '50/50',
    discretionary_exemption_field_terminal: '50/50',
    reported_ffy2024_use_rows: 37,
    reported_ffy2024_no_use_rows: 13,
    terminal_cells: '181/450',
    still_open_cells: '269/450',
    terminal_substantive_cells: 81,
    still_open_substantive_cells: 219,
    row_terminal_state_cells_open: 50,
    terminal_units: 0,
    field_matrix_terminal: false,
    class_state: 'still_open',
    class_closed: false,
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  };

  const fieldCounts = {};
  for (const fieldId of matrix.field_order) {
    const terminal = matrix.rows.flatMap((row) => row.cells).filter((cell) => cell.field_id === fieldId && cell.terminal).length;
    fieldCounts[fieldId] = { terminal, open: 50 - terminal };
  }
  const openCellRows = [];
  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      if (!cell.terminal) openCellRows.push({
        unit_ordinal: row.unit_ordinal,
        unit_id: row.unit_id,
        postal_code: row.postal_code,
        state_name: row.state_name,
        field_ordinal: cell.field_ordinal,
        field_id: cell.field_id,
        typed_gap: cell.typed_gap,
        authority_effect: cell.authority_effect,
      });
    }
  }
  ok(openCellRows.length === 269, 'open-cell census changed');
  const census = {
    schema_version: 'ssc-rd04-wave03-state-options-exemption-remaining-open-field-census@1',
    wave_id: WAVE_ID,
    lane_id: LANE_ID,
    class_id: CLASS_ID,
    issue: ISSUE,
    matrix_path: MATRIX_PATH,
    counts: {
      units: 50,
      required_cells: 450,
      terminal_cells: 181,
      still_open_cells: 269,
      substantive_cells: 300,
      terminal_substantive_cells: 81,
      still_open_substantive_cells: 219,
      row_terminal_state_cells_open: 50,
      terminal_units: 0,
      class_closed: false,
    },
    field_counts: fieldCounts,
    open_cells: openCellRows,
    next_source_planes: [
      'operative state implementation authority and version for 49 states',
      'implementation effective date or typed gap for 41 states',
      'ABAWD or work-requirement waiver state and complete governing period for 49 states',
      'fitness-for-work or eligibility-screening rule for 35 states',
      'verification evidence and staff-discretion surface for 45 states',
      'row terminal state for all 50 states after substantive closure',
    ],
    authority: source.interpretation_contract,
  };
  const summary = {
    schema_version: 'ssc-rd04-wave03-state-options-exemption-promotion-summary@1',
    wave_id: WAVE_ID,
    lane_id: LANE_ID,
    class_id: CLASS_ID,
    issue: ISSUE,
    source_id: SOURCE_ID,
    source_request_attempts: 1,
    additional_empirical_source_requests: 0,
    source_artifact_id: 8949949465,
    adjudication_artifact_id: 8950104341,
    reference_period: 'FFY 2024',
    fifty_state_rows: 50,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    terminal_cells_before: 131,
    newly_terminalized_cells: 50,
    terminal_cells_after: 181,
    still_open_cells_after: 269,
    terminal_substantive_cells_after: 81,
    still_open_substantive_cells_after: 219,
    terminal_state_rows: 0,
    class_state: 'still_open',
    class_closed: false,
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  };

  const encoded = new Map([
    ['source-custody.json', bytes(root, SOURCE_CUSTODY_PATH)],
    ['source-page-11.txt', bytes(root, SOURCE_PAGE_PATH)],
    ['state-field-register.jsonl', bytes(root, REGISTER_PATH)],
    ['promoted-partial-field-matrix.json', encode(matrix)],
    ['remaining-open-field-census.json', encode(census)],
    ['promotion-summary.json', encode(summary)],
  ]);
  const entries = [...encoded.entries()].map(([rel, buffer]) => manifestEntry(buffer, rel));
  const combined = sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'));
  const manifest = {
    schema_version: 'ssc-rd04-wave03-state-options-exemption-promotion-manifest@1',
    entries,
    combined_sha256: combined,
  };
  return {
    [MATRIX_PATH]: encoded.get('promoted-partial-field-matrix.json'),
    [CENSUS_PATH]: encoded.get('remaining-open-field-census.json'),
    [SUMMARY_PATH]: encoded.get('promotion-summary.json'),
    [MANIFEST_PATH]: encode(manifest),
  };
}

export function writeProduct(root = ROOT) {
  const product = buildProduct(root);
  for (const [rel, buffer] of Object.entries(product)) {
    fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
    fs.writeFileSync(abs(root, rel), buffer);
  }
  return product;
}

export function checkProduct(root = ROOT) {
  const product = buildProduct(root);
  for (const [rel, expected] of Object.entries(product)) {
    const actual = bytes(root, rel);
    ok(Buffer.compare(actual, expected) === 0, `${rel}: generated bytes differ`);
  }
  return product;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? '--check';
  if (mode === '--write') writeProduct(ROOT);
  else if (mode === '--check') checkProduct(ROOT);
  else throw new Error(`unknown mode: ${mode}`);
  console.log(`rd04_state_options_exemption_product=${mode === '--write' ? 'written' : 'verified'}`);
}
