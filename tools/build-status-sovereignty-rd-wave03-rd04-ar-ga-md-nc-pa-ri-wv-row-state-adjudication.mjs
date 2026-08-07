import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-row-state-adjudication';
export const PREDECESSOR_MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-capture-adjudication/promoted-partial-field-matrix.json';
export const PREDECESSOR_MATRIX_SHA256 = '9615aa0d081f37f242f5a8c891ef80649f8c5a566e2a09e0d37c34db9cf23d11';
export const PREDECESSOR_MATRIX_BYTES = 429465;
export const PREDECESSOR_PRODUCT_COMMIT = '187ffb0e45c8b3fbcf03929c3b898e917b62fc27';
export const PREDECESSOR_PRODUCT_TREE = 'fdc4acfb8b3381872c157d0bf9a8bd6947631bd3';
export const PREDECESSOR_MERGE_COMMIT = 'a49b18304a69e9637cd854d38e80b67d4165cc6c';
export const TARGET_STATES = Object.freeze(["AR", "GA", "MD", "NC", "PA", "RI", "WV"]);
export const AUTHORED_DECISIONS_SHA256 = 'c03b4ea204bfcbb0a7309bbec77e066b17cd7618a1e646821f9ffa5c0eec7579';
export const PREDECESSOR_CUSTODY_SHA256 = 'a0481db18cd8c5de6ea7b1285942c6bcbc2293f27f88426bbb8ea264b95a8ba7';

const MANIFEST_ORDER = Object.freeze([
  'authored-row-state-decisions.json',
  'predecessor-custody.json',
  'row-state-ledger.json',
  'promoted-partial-field-matrix.json',
  'remaining-open-field-census.json',
  'summary.json',
  'index.json',
]);

const PROHIBITED_INFERENCES = Object.freeze(["do_not_infer_complete_state_implementation_truth_beyond_terminal_field_custody", "do_not_convert_not_publicly_recovered_fields_into_event_or_policy_absence", "do_not_infer_uniform_frontline_practice", "do_not_infer_person_level_outcome", "do_not_infer_national_prevalence", "do_not_infer_discrimination_or_racial_order", "do_not_infer_coordination_or_common_purpose", "do_not_infer_complete_compact", "do_not_close_rd04_c02_or_wave03_from_ten_terminal_rows"]);

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function canonicalHash(value) { return sha256(Buffer.from(JSON.stringify(value))); }
function clone(value) { return structuredClone(value); }
function assertObject(value, label) { assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`); }
function commonAuthorityBoundary() { return {"outside_human_dependency": false, "external_contacts": 0, "external_reviews": 0, "reviewed_disposition_changes": 0, "publication_effect": "none", "adoption_effect": "none", "graph_effect": "none", "prevalence_effect": "none", "discrimination_effect": "none", "coordination_effect": "none", "common_purpose_effect": "none", "racial_order_effect": "none", "complete_compact_effect": "none"}; }

function countFieldStates(rows) {
  const counts = {};
  for (const fieldId of rows[0].cells.map((cell) => cell.field_id)) counts[fieldId] = { terminal: 0, open: 0 };
  for (const row of rows) for (const cell of row.cells) counts[cell.field_id][cell.terminal ? 'terminal' : 'open'] += 1;
  return counts;
}

async function readText(root, rel, overrides = new Map()) {
  if (overrides.has(rel)) return overrides.get(rel);
  return readFile(path.join(root, rel), 'utf8');
}
async function readJson(root, rel, overrides = new Map()) {
  const text = await readText(root, rel, overrides);
  const value = JSON.parse(text);
  assertObject(value, rel);
  return { text, value };
}

function validateInputs(decisionsText, decisions, custodyText, custody, predecessorText, predecessor) {
  assert.equal(sha256(Buffer.from(decisionsText)), AUTHORED_DECISIONS_SHA256, 'authored decisions byte drift');
  assert.equal(sha256(Buffer.from(custodyText)), PREDECESSOR_CUSTODY_SHA256, 'predecessor custody byte drift');
  assert.equal(Buffer.byteLength(predecessorText), PREDECESSOR_MATRIX_BYTES, 'predecessor matrix byte drift');
  assert.equal(sha256(Buffer.from(predecessorText)), PREDECESSOR_MATRIX_SHA256, 'predecessor matrix digest drift');

  assert.equal(decisions.schema_version, 'ssc-rd04-wave03-mf7-row-state-authored-decisions@1');
  assert.equal(decisions.wave_id, 'SSC-RD-W03');
  assert.equal(decisions.lane_id, 'RD-04');
  assert.equal(decisions.class_id, 'RD-04-C02');
  assert.equal(decisions.issue, 1017);
  assert.deepEqual(decisions.target_states, TARGET_STATES);
  assert.equal(decisions.decisions.length, 7);
  assert.deepEqual(decisions.prohibited_inferences, PROHIBITED_INFERENCES);

  assert.equal(custody.schema_version, 'ssc-rd04-wave03-mf7-row-state-predecessor-custody@1');
  assert.equal(custody.predecessor.product_commit, PREDECESSOR_PRODUCT_COMMIT);
  assert.equal(custody.predecessor.product_tree, PREDECESSOR_PRODUCT_TREE);
  assert.equal(custody.predecessor.merge_commit, PREDECESSOR_MERGE_COMMIT);
  assert.equal(custody.predecessor.matrix_path, PREDECESSOR_MATRIX_PATH);
  assert.equal(custody.predecessor.matrix_bytes, PREDECESSOR_MATRIX_BYTES);
  assert.equal(custody.predecessor.matrix_sha256, PREDECESSOR_MATRIX_SHA256);
  assert.deepEqual(custody.predecessor_counts, {
    required_cells: 450,
    terminal_cells: 211,
    still_open_cells: 239,
    terminal_substantive_cells: 108,
    still_open_substantive_cells: 192,
    row_terminal_state_cells_open: 47,
    terminal_units: 3,
    class_closed: false,
  });

  assert.equal(predecessor.schema_version, 'ssc-rd04-wave03-mf7-capture-adjudication-promoted-partial-field-matrix@1');
  assert.equal(predecessor.wave_id, 'SSC-RD-W03');
  assert.equal(predecessor.lane_id, 'RD-04');
  assert.equal(predecessor.class_id, 'RD-04-C02');
  assert.equal(predecessor.issue, 1017);
  assert.equal(predecessor.rows.length, 50);
  assert.equal(predecessor.counts.materialized_cells, 450);
  assert.equal(predecessor.counts.terminal_cells, 211);
  assert.equal(predecessor.counts.still_open_cells, 239);
  assert.equal(predecessor.counts.terminal_substantive_cells, 108);
  assert.equal(predecessor.counts.still_open_substantive_cells, 192);
  assert.equal(predecessor.counts.row_terminal_state_cells_open, 47);
  assert.deepEqual(predecessor.current_result.target_rows_ready_for_separate_row_state_adjudication, TARGET_STATES);
  assert.equal(predecessor.current_result.terminal_units, 3);
  assert.equal(predecessor.current_result.class_closed, false);
}

function composeRowStates(predecessor, decisions) {
  const matrix = clone(predecessor);
  matrix.schema_version = 'ssc-rd04-wave03-mf7-row-state-promoted-partial-field-matrix@1';
  const byCode = new Map(matrix.rows.map((row) => [row.postal_code, row]));
  const ledgerRows = [];
  const seen = new Set();

  for (const decision of decisions.decisions) {
    assert(TARGET_STATES.includes(decision.postal_code), `unexpected state ${decision.postal_code}`);
    assert(!seen.has(decision.postal_code), `duplicate state ${decision.postal_code}`);
    seen.add(decision.postal_code);
    const row = byCode.get(decision.postal_code);
    assert(row, `missing state row ${decision.postal_code}`);
    assert.equal(row.unit_id, decision.unit_id);
    assert.equal(row.state_name, decision.state_name);
    assert.equal(row.unit_ordinal, decision.unit_ordinal);
    assert.equal(row.row_state, 'still_open');
    assert.equal(row.terminal_fields, 8);
    assert.equal(row.open_fields, 1);
    assert.equal(canonicalHash(row), decision.predecessor_row_canonical_sha256, `${decision.postal_code} predecessor row digest drift`);

    const openCells = row.cells.filter((cell) => !cell.terminal);
    assert.equal(openCells.length, 1);
    const rowStateCell = openCells[0];
    assert.equal(rowStateCell.field_id, 'field_and_row_terminal_state');
    assert.equal(rowStateCell.state, 'still_open');
    assert.equal(rowStateCell.terminal, false);

    const evidenceCells = row.cells.filter((cell) => cell.field_id !== 'field_and_row_terminal_state');
    assert.equal(evidenceCells.length, 8);
    assert(evidenceCells.every((cell) => cell.terminal), `${decision.postal_code} requires eight terminal evidence cells`);
    assert.deepEqual(evidenceCells.map((cell) => cell.field_id), decision.required_predecessor_terminal_field_ids);
    const evidenceStateCounts = {};
    for (const cell of evidenceCells) evidenceStateCounts[cell.state] = (evidenceStateCounts[cell.state] || 0) + 1;

    const predecessorRowSha256 = canonicalHash(row);
    row.row_state = decision.row_state_after;
    row.terminal_fields = 9;
    row.open_fields = 0;
    rowStateCell.state = decision.row_state_cell_after;
    rowStateCell.terminal = true;
    rowStateCell.value = {
      terminal_classification: decision.row_state_after,
      row_scope: 'fixed_public_record_obligation_for_one_state',
      completed_evidence_fields: 8,
      terminal_evidence_field_ids: evidenceCells.map((cell) => cell.field_id),
      terminal_evidence_state_counts: evidenceStateCounts,
      predecessor_row_canonical_sha256: predecessorRowSha256,
      completion_rule: 'all_eight_declared_state_evidence_fields_are_terminal_under_exact_source_or_typed_gap_custody',
      class_effect: 'none',
      cumulative_ledger_effect: 'none',
      limitations: [
        'row completion closes only the declared fixed public-record obligation for this state',
        'typed source gaps remain distinct from event, policy, practice, or implementation absence',
        'row completion does not establish uniform frontline practice or person-level outcome',
        'ten terminal rows do not establish national prevalence or close RD-04-C02',
      ],
      prohibited_inferences: [...PROHIBITED_INFERENCES],
    };
    rowStateCell.evidence_source_ids = [`RD04-MF7-ROW-STATE-${decision.postal_code}-V1`];
    rowStateCell.typed_gap = null;
    rowStateCell.authority_effect = 'row_level_fixed_public_record_obligation_terminal_only';

    const finalRowSha256 = canonicalHash(row);
    ledgerRows.push({
      decision_ordinal: decision.decision_ordinal,
      unit_ordinal: row.unit_ordinal,
      unit_id: row.unit_id,
      postal_code: row.postal_code,
      state_name: row.state_name,
      predecessor_row_state: decision.predecessor_row_state,
      predecessor_terminal_fields: 8,
      predecessor_open_fields: 1,
      predecessor_row_canonical_sha256: predecessorRowSha256,
      terminal_evidence_field_ids: evidenceCells.map((cell) => cell.field_id),
      terminal_evidence_state_counts: evidenceStateCounts,
      row_state_after: row.row_state,
      row_state_cell_after: rowStateCell.state,
      row_terminal: true,
      final_terminal_fields: 9,
      final_open_fields: 0,
      final_row_canonical_sha256: finalRowSha256,
      class_closure_effect: 'none',
      cumulative_ledger_effect: 'none',
      authority_boundary: commonAuthorityBoundary(),
    });
  }
  assert.equal(seen.size, 7);

  const allCells = matrix.rows.flatMap((row) => row.cells);
  const terminalCells = allCells.filter((cell) => cell.terminal).length;
  const openCells = 450 - terminalCells;
  const terminalUnits = matrix.rows.filter((row) => row.row_state === 'terminal_fixed_public_record_obligation_complete').length;
  const rowStateOpen = matrix.rows.filter((row) => !row.cells.find((cell) => cell.field_id === 'field_and_row_terminal_state').terminal).length;
  const terminalSubstantive = allCells.filter((cell) => !['canonical_state_identity','source_identities_and_exact_custody','field_and_row_terminal_state'].includes(cell.field_id) && cell.terminal).length;
  const openSubstantive = 300 - terminalSubstantive;
  assert.equal(terminalCells, 218);
  assert.equal(openCells, 232);
  assert.equal(terminalUnits, 10);
  assert.equal(rowStateOpen, 40);
  assert.equal(terminalSubstantive, 108);
  assert.equal(openSubstantive, 192);

  matrix.counts = {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    inherited_terminal_cells: 211,
    row_state_target_cells: 7,
    newly_terminalized_row_state_cells: 7,
    evidence_complete_cells: allCells.filter((cell) => cell.state === 'evidence_complete').length,
    observed_cells: allCells.filter((cell) => cell.state === 'observed').length,
    not_publicly_recovered_cells: allCells.filter((cell) => cell.state === 'not_publicly_recovered').length,
    still_open_cells: openCells,
    terminal_cells: terminalCells,
    source_rows_promoted: 50,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    terminal_substantive_cells: terminalSubstantive,
    still_open_substantive_cells: openSubstantive,
    row_terminal_state_cells_terminal: 10,
    row_terminal_state_cells_open: rowStateOpen,
    terminal_units: terminalUnits,
    class_closed: false,
  };
  const terminalUnitIds = matrix.rows.filter((row) => row.row_state === 'terminal_fixed_public_record_obligation_complete').map((row) => row.unit_id);
  matrix.current_result = {
    canonical_state_identity_terminal: '50/50',
    source_identities_and_exact_custody_terminal: '50/50',
    discretionary_exemption_field_terminal: '50/50',
    minimum_frontier_target_cells_adjudicated: '21/21',
    minimum_frontier_row_state_cells_adjudicated: '7/7',
    terminal_cells: '218/450',
    still_open_cells: '232/450',
    terminal_substantive_cells: 108,
    still_open_substantive_cells: 192,
    row_terminal_state_cells_terminal: 10,
    row_terminal_state_cells_open: 40,
    terminal_units: 10,
    terminal_unit_ids: terminalUnitIds,
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
  matrix.minimum_frontier_row_state_product = {
    predecessor_matrix_path: PREDECESSOR_MATRIX_PATH,
    predecessor_matrix_sha256: PREDECESSOR_MATRIX_SHA256,
    predecessor_product_commit: PREDECESSOR_PRODUCT_COMMIT,
    predecessor_product_tree: PREDECESSOR_PRODUCT_TREE,
    predecessor_merge_commit: PREDECESSOR_MERGE_COMMIT,
    authored_decisions_path: `${DATA_DIR}/authored-row-state-decisions.json`,
    row_state_ledger_path: `${DATA_DIR}/row-state-ledger.json`,
    composition_rule: 'terminalize_only_the_seven_derivative_row_state_cells_after_all_eight_evidence_fields_are_terminal',
  };
  return { matrix, ledgerRows, fieldCounts: countFieldStates(matrix.rows) };
}

function buildRemainingCensus(matrix, fieldCounts) {
  const openCells = [];
  const terminalRows = [];
  for (const row of matrix.rows) {
    if (row.row_state === 'terminal_fixed_public_record_obligation_complete') terminalRows.push({
      unit_ordinal: row.unit_ordinal, unit_id: row.unit_id, postal_code: row.postal_code,
      state_name: row.state_name, row_state: row.row_state, terminal_fields: row.terminal_fields, open_fields: row.open_fields,
    });
    for (const cell of row.cells) if (!cell.terminal) openCells.push({
      unit_ordinal: row.unit_ordinal, unit_id: row.unit_id, postal_code: row.postal_code, state_name: row.state_name,
      field_ordinal: cell.field_ordinal, field_id: cell.field_id, typed_gap: cell.typed_gap, authority_effect: cell.authority_effect,
    });
  }
  assert.equal(openCells.length, 232);
  assert.equal(terminalRows.length, 10);
  return {
    schema_version: 'ssc-rd04-wave03-mf7-row-state-remaining-open-field-census@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    matrix_path: `${DATA_DIR}/promoted-partial-field-matrix.json`,
    predecessor_matrix_path: PREDECESSOR_MATRIX_PATH,
    counts: { units: 50, required_cells: 450, terminal_cells: 218, still_open_cells: 232,
      substantive_cells: 300, terminal_substantive_cells: 108, still_open_substantive_cells: 192,
      row_terminal_state_cells_terminal: 10, row_terminal_state_cells_open: 40,
      terminal_units: 10, open_units: 40, class_closed: false },
    field_counts: fieldCounts,
    terminal_rows: terminalRows,
    open_cells: openCells,
    authority_boundary: commonAuthorityBoundary(),
  };
}

function buildSummary(ledgerRows) {
  return {
    schema_version: 'ssc-rd04-wave03-mf7-row-state-summary@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    predecessor: { source_pr: 1278, product_commit: PREDECESSOR_PRODUCT_COMMIT, product_tree: PREDECESSOR_PRODUCT_TREE,
      merge_commit: PREDECESSOR_MERGE_COMMIT, matrix_path: PREDECESSOR_MATRIX_PATH, matrix_sha256: PREDECESSOR_MATRIX_SHA256,
      terminal_cells: 211, still_open_cells: 239, terminal_substantive_cells: 108, still_open_substantive_cells: 192, terminal_units: 3 },
    transition: { target_rows: TARGET_STATES, newly_terminalized_row_state_cells: 7, substantive_field_changes: 0,
      terminal_cells_before: 211, terminal_cells_after: 218, still_open_cells_after: 232,
      terminal_substantive_cells_after: 108, still_open_substantive_cells_after: 192,
      terminal_units_before: 3, terminal_units_after: 10, open_units_after: 40 },
    terminal_rows: ledgerRows.map((row) => ({ unit_id: row.unit_id, postal_code: row.postal_code, state_name: row.state_name,
      row_state: row.row_state_after, terminal_fields: row.final_terminal_fields, open_fields: row.final_open_fields })),
    class_state: 'still_open', class_closed: false, cumulative_ledger_effect: 'none', authority_boundary: commonAuthorityBoundary(),
  };
}

function buildIndex() {
  return {
    schema_version: 'ssc-rd04-wave03-mf7-row-state-index@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    input_paths: { authored_row_state_decisions: `${DATA_DIR}/authored-row-state-decisions.json`,
      predecessor_custody: `${DATA_DIR}/predecessor-custody.json`, predecessor_matrix: PREDECESSOR_MATRIX_PATH },
    derived_paths: { row_state_ledger: `${DATA_DIR}/row-state-ledger.json`, promoted_partial_field_matrix: `${DATA_DIR}/promoted-partial-field-matrix.json`,
      remaining_open_field_census: `${DATA_DIR}/remaining-open-field-census.json`, summary: `${DATA_DIR}/summary.json`, product_manifest: `${DATA_DIR}/product-manifest.json` },
    predecessor: { source_pr: 1278, product_commit: PREDECESSOR_PRODUCT_COMMIT, product_tree: PREDECESSOR_PRODUCT_TREE,
      merge_commit: PREDECESSOR_MERGE_COMMIT, matrix_sha256: PREDECESSOR_MATRIX_SHA256 },
    counts: { target_rows: 7, newly_terminalized_row_state_cells: 7, substantive_field_changes: 0,
      terminal_cells_before: 211, terminal_cells_after: 218, still_open_cells_after: 232,
      terminal_substantive_cells_after: 108, still_open_substantive_cells_after: 192,
      row_terminal_state_cells_terminal_after: 10, row_terminal_state_cells_open_after: 40,
      terminal_units_after: 10, open_units_after: 40, class_closed: false },
    current_result: { row_state_adjudication_complete: true, seven_target_rows_terminal: true, field_matrix_terminal: false,
      class_state: 'still_open', class_closed: false, cumulative_ledger_effect: 'none', ...commonAuthorityBoundary() },
    next_bounded_operation: 'continue fixed-source acquisition and terminal adjudication for the 192 still-open substantive state fields and separately terminalize additional rows only after all eight evidence fields are terminal',
  };
}
function manifestCombined(entries) { return sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''))); }

export async function generateProduct(root = process.cwd(), overrides = new Map()) {
  const decisionsRel = `${DATA_DIR}/authored-row-state-decisions.json`;
  const custodyRel = `${DATA_DIR}/predecessor-custody.json`;
  const decisionsRead = await readJson(root, decisionsRel, overrides);
  const custodyRead = await readJson(root, custodyRel, overrides);
  const predecessorRead = await readJson(root, PREDECESSOR_MATRIX_PATH, overrides);
  validateInputs(decisionsRead.text, decisionsRead.value, custodyRead.text, custodyRead.value, predecessorRead.text, predecessorRead.value);
  const { matrix, ledgerRows, fieldCounts } = composeRowStates(predecessorRead.value, decisionsRead.value);
  const ledger = { schema_version: 'ssc-rd04-wave03-mf7-row-state-ledger@1', wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    predecessor: { product_commit: PREDECESSOR_PRODUCT_COMMIT, product_tree: PREDECESSOR_PRODUCT_TREE, merge_commit: PREDECESSOR_MERGE_COMMIT,
      matrix_path: PREDECESSOR_MATRIX_PATH, matrix_sha256: PREDECESSOR_MATRIX_SHA256 },
    counts: { target_rows: 7, terminal_row_decisions: 7, newly_terminalized_row_state_cells: 7, substantive_field_changes: 0,
      terminal_units_before: 3, terminal_units_after: 10, class_closures: 0, cumulative_ledger_changes: 0 },
    rows: ledgerRows, authority_boundary: commonAuthorityBoundary() };
  const census = buildRemainingCensus(matrix, fieldCounts);
  const summary = buildSummary(ledgerRows);
  const index = buildIndex();
  const outputs = new Map([
    ['row-state-ledger.json', jsonText(ledger)], ['promoted-partial-field-matrix.json', jsonText(matrix)],
    ['remaining-open-field-census.json', jsonText(census)], ['summary.json', jsonText(summary)], ['index.json', jsonText(index)],
  ]);
  const manifestEntries = [];
  for (const name of MANIFEST_ORDER) {
    let text;
    if (name === 'authored-row-state-decisions.json') text = decisionsRead.text;
    else if (name === 'predecessor-custody.json') text = custodyRead.text;
    else text = outputs.get(name);
    assert.equal(typeof text, 'string', `missing manifest source ${name}`);
    manifestEntries.push({ path: name, bytes: Buffer.byteLength(text), sha256: sha256(Buffer.from(text)) });
  }
  const manifest = { schema_version: 'ssc-rd04-wave03-mf7-row-state-product-manifest@1', wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    permanent_data_files: 8, manifest_entries: manifestEntries.length, combined_mode: 'sha256_of_ordered_path_nul_bytes_nul_sha256_lines', entries: manifestEntries,
    file_set_combined_sha256: manifestCombined(manifestEntries), terminal_cells_before: 211, newly_terminalized_row_state_cells: 7,
    terminal_cells_after: 218, still_open_cells_after: 232, terminal_substantive_cells_after: 108, still_open_substantive_cells_after: 192,
    terminal_units_after: 10, open_units_after: 40, class_closed: false, cumulative_ledger_effect: 'none', authority_boundary: commonAuthorityBoundary() };
  outputs.set('product-manifest.json', jsonText(manifest));
  return outputs;
}
export async function writeProduct(root = process.cwd()) { const outputs = await generateProduct(root); await mkdir(path.join(root, DATA_DIR), { recursive: true }); for (const [name,text] of outputs) await writeFile(path.join(root, DATA_DIR, name), text); }
export async function checkProduct(root = process.cwd(), overrides = new Map()) { const outputs = await generateProduct(root, overrides); for (const [name,expected] of outputs) { const actual = await readText(root, `${DATA_DIR}/${name}`, overrides); assert.equal(actual, expected, `${DATA_DIR}/${name} deterministic drift`); } return outputs; }
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) { const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : null; assert(mode, 'usage: node build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-row-state-adjudication.mjs --write|--check'); if (mode === 'write') { await writeProduct(process.cwd()); console.log('rd04_mf7_row_state_build=written'); } else { await checkProduct(process.cwd()); console.log('rd04_mf7_row_state_build=clean'); } }
