import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_DIR,
  PREDECESSOR_MATRIX_PATH,
  PREDECESSOR_MATRIX_SHA256,
  PROTOCOL_ID,
  TARGET_STATES,
  buildProduct,
} from './build-status-sovereignty-rd-wave03-rd04-ca-sd-wa-capture-adjudication.mjs';

const DATA_FILES = Object.freeze([
  'authored-adjudication-decisions.json',
  'capture-custody.json',
  'capture-manifest.json',
  'capture-route-results.json',
  'index.json',
  'pdf-visual-review-receipt.json',
  'product-manifest.json',
  'promoted-partial-field-matrix.json',
  'remaining-open-field-census.json',
  'route-adjudications.jsonl',
  'summary.json',
  'terminal-target-cell-ledger.json',
]);

const AUTHORITY_NONE_KEYS = new Set([
  'reviewed_disposition_effect',
  'publication_effect',
  'adoption_effect',
  'graph_effect',
  'national_prevalence_effect',
  'prevalence_effect',
  'discrimination_effect',
  'coordination_effect',
  'common_purpose_effect',
  'racial_order_effect',
  'complete_compact_effect',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  return JSON.stringify(value);
}

function assertCanonicalEqual(actual, expected, label) {
  if (canonical(actual) !== canonical(expected)) throw new Error(`${label} differs from deterministic expected value`);
}

function assertExactKeys(value, keys, label) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} key surface drift`);
}

function walk(value, visit, pathParts = []) {
  visit(value, pathParts);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, [...pathParts, index]));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walk(item, visit, [...pathParts, key]);
  }
}

function assertNoAuthorityEscalation(bundle) {
  walk(bundle, (value, pathParts) => {
    const key = pathParts.at(-1);
    if (key === 'outside_human_dependency') assert.equal(value, false, `${pathParts.join('.')} must remain false`);
    if (key === 'external_contacts' || key === 'external_reviews' || key === 'result_spawned_requests' || key === 'class_closures' || key === 'row_terminalizations') {
      assert.equal(value, 0, `${pathParts.join('.')} must remain zero`);
    }
    if (AUTHORITY_NONE_KEYS.has(key)) assert.equal(value, 'none', `${pathParts.join('.')} must remain none`);
  });
}

function parseJsonLines(text) {
  assert(text.endsWith('\n'), 'route-adjudications.jsonl must end with a newline');
  const lines = text.trimEnd().split('\n');
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`route-adjudications.jsonl line ${index + 1} is invalid JSON: ${error.message}`);
    }
  });
}

export async function loadProductBundle({ root = process.cwd() } = {}) {
  const readJson = async (fileName) => JSON.parse(await readFile(path.join(root, DATA_DIR, fileName), 'utf8'));
  const routeText = await readFile(path.join(root, DATA_DIR, 'route-adjudications.jsonl'), 'utf8');
  return {
    inputs: {
      captureRouteResults: await readJson('capture-route-results.json'),
      captureManifest: await readJson('capture-manifest.json'),
      captureCustody: await readJson('capture-custody.json'),
      visualReview: await readJson('pdf-visual-review-receipt.json'),
      decisions: await readJson('authored-adjudication-decisions.json'),
    },
    routeAdjudicationsText: routeText,
    routeAdjudications: parseJsonLines(routeText),
    terminalLedger: await readJson('terminal-target-cell-ledger.json'),
    matrix: await readJson('promoted-partial-field-matrix.json'),
    openCensus: await readJson('remaining-open-field-census.json'),
    summary: await readJson('summary.json'),
    index: await readJson('index.json'),
    manifest: await readJson('product-manifest.json'),
  };
}

export function validateBundle(bundle, expected) {
  assertCanonicalEqual(bundle.inputs.captureRouteResults, expected.inputs.captureRouteResults, 'capture route results');
  assertCanonicalEqual(bundle.inputs.captureManifest, expected.inputs.captureManifest, 'capture manifest');
  assertCanonicalEqual(bundle.inputs.captureCustody, expected.inputs.captureCustody, 'capture custody');
  assertCanonicalEqual(bundle.inputs.visualReview, expected.inputs.visualReview, 'PDF visual review receipt');
  assertCanonicalEqual(bundle.inputs.decisions, expected.inputs.decisions, 'authored decisions');
  assert.equal(bundle.routeAdjudicationsText, expected.routeAdjudicationsText, 'route adjudication serialization drift');
  assertCanonicalEqual(bundle.terminalLedger, expected.terminalLedger, 'terminal target-cell ledger');
  assertCanonicalEqual(bundle.matrix, expected.matrix, 'composed matrix');
  assertCanonicalEqual(bundle.openCensus, expected.openCensus, 'remaining-open census');
  assertCanonicalEqual(bundle.summary, expected.summary, 'summary');
  assertCanonicalEqual(bundle.index, expected.index, 'index');
  assertCanonicalEqual(bundle.manifest, expected.manifest, 'product manifest');

  assertExactKeys(bundle.matrix, [
    'schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'field_order', 'counts', 'rows', 'current_result', 'source_product', 'composition_product',
  ], 'matrix');
  assertExactKeys(bundle.terminalLedger, [
    'schema_version', 'protocol_id', 'wave_id', 'lane_id', 'class_id', 'issue', 'predecessor', 'counts', 'cells', 'authority',
  ], 'terminal ledger');
  assertExactKeys(bundle.summary, [
    'schema_version', 'protocol_id', 'wave_id', 'lane_id', 'class_id', 'issue', 'protocol_pr', 'capture_pr', 'capture_workflow_run', 'capture_artifact_id', 'capture_artifact_zip_sha256', 'fixed_routes', 'terminal_route_adjudications', 'source_admissions', 'target_cells', 'observed_field_decisions', 'not_publicly_recovered_field_decisions', 'canonical_predecessor', 'composition', 'terminal_units_after', 'class_state', 'class_closed', 'result_spawned_requests', 'outside_human_dependency', 'reviewed_disposition_effect', 'publication_effect', 'adoption_effect', 'graph_effect', 'national_prevalence_effect', 'discrimination_effect', 'coordination_effect', 'common_purpose_effect', 'racial_order_effect', 'complete_compact_effect',
  ], 'summary');

  assert.equal(bundle.routeAdjudications.length, 30);
  assert.equal(new Set(bundle.routeAdjudications.map((row) => row.route_id)).size, 30);
  assert(bundle.routeAdjudications.every((row) => row.adjudication_state === 'terminal'));
  assert.equal(bundle.routeAdjudications.filter((row) => row.source_admitted).length, 17);

  const ledger = bundle.terminalLedger;
  assert.equal(ledger.protocol_id, PROTOCOL_ID);
  assert.deepEqual(ledger.counts, {
    target_cells: 9,
    newly_terminalized_cells: 6,
    terminal_evidence_updates: 3,
    observed_decisions: 3,
    not_publicly_recovered_decisions: 6,
    row_terminalizations: 0,
    class_closures: 0,
  });
  assert.equal(ledger.cells.length, 9);
  assert.equal(new Set(ledger.cells.map((row) => row.target_cell_key)).size, 9);
  assert.equal(ledger.cells.filter((row) => row.composition_action === 'terminalize_predecessor_open_cell').length, 6);
  assert.equal(ledger.cells.filter((row) => row.composition_action === 'compose_terminal_historical_evidence_with_current_gap').length, 3);
  assert(ledger.cells.filter((row) => row.composition_action.includes('historical')).every((row) => row.field_id === 'discretionary_exemption_authority_and_reported_state_practice'));

  const matrix = bundle.matrix;
  assert.equal(matrix.schema_version, 'ssc-rd04-wave03-ca-sd-wa-capture-adjudication-promoted-partial-field-matrix@2');
  assert.equal(matrix.rows.length, 50);
  assert(matrix.rows.every((row) => row.cells.length === 9));
  assert.deepEqual(matrix.counts, {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    inherited_terminal_cells: 181,
    target_cells: 9,
    newly_terminalized_cells: 6,
    terminal_evidence_updates: 3,
    observed_field_decisions: 3,
    not_publicly_recovered_field_decisions: 6,
    evidence_complete_cells: 178,
    observed_cells: 3,
    not_publicly_recovered_cells: 6,
    still_open_cells: 263,
    terminal_cells: 187,
    source_rows_promoted: 50,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    target_rows_ready_for_row_state_adjudication: 3,
    terminal_units: 0,
    class_closed: false,
  });
  const allCells = matrix.rows.flatMap((row) => row.cells);
  assert.equal(allCells.length, 450);
  assert.equal(allCells.filter((cell) => cell.terminal).length, 187);
  assert.equal(allCells.filter((cell) => !cell.terminal).length, 263);
  assert.equal(allCells.filter((cell) => cell.state === 'evidence_complete').length, 178);
  assert.equal(allCells.filter((cell) => cell.state === 'observed').length, 3);
  assert.equal(allCells.filter((cell) => cell.state === 'not_publicly_recovered').length, 6);

  for (const postalCode of TARGET_STATES) {
    const row = matrix.rows.find((candidate) => candidate.postal_code === postalCode);
    assert(row, `missing target row ${postalCode}`);
    assert.equal(row.terminal_fields, 8);
    assert.equal(row.open_fields, 1);
    assert.equal(row.row_state, 'still_open');
    const rowCell = row.cells.find((cell) => cell.field_id === 'field_and_row_terminal_state');
    assert(rowCell && !rowCell.terminal);
    assert.equal(rowCell.typed_gap, 'row_remains_open_pending_separate_row_state_adjudication_after_8_of_9_required_fields_terminal');
    const discretionary = row.cells.find((cell) => cell.field_id === 'discretionary_exemption_authority_and_reported_state_practice');
    assert.equal(discretionary.state, 'not_publicly_recovered');
    assert.equal(discretionary.value.historical_reported_practice.reported_state_practice.reference_period, 'FFY 2024');
    assert.equal(discretionary.value.current_fixed_protocol_finding.terminal_classification, 'not_publicly_recovered');
    assert.equal(discretionary.value.chronology.composition_rule, 'preserve_historical_reported_practice_without_treating_it_as_current_actual_use');
  }

  const census = bundle.openCensus;
  assert.equal(census.open_cells.length, 263);
  assert.equal(census.counts.still_open_substantive_cells, 213);
  assert.equal(census.target_rows_ready_for_separate_row_state_adjudication.length, 3);
  assert(census.target_rows_ready_for_separate_row_state_adjudication.every((row) => row.terminal_fields === 8 && row.open_fields === 1));

  assert.equal(bundle.summary.composition.double_counted_terminal_cells_refused, 3);
  assert.equal(bundle.summary.composition.canonical_terminal_cells_after, 187);
  assert.equal(bundle.summary.composition.canonical_still_open_substantive_cells_after, 213);
  assert.equal(bundle.index.counts.terminal_cells_before, 181);
  assert.equal(bundle.index.counts.terminal_cells_after, 187);
  assert.equal(bundle.index.counts.terminal_evidence_updates, 3);
  assert.equal(bundle.manifest.entries.length, 11);
  assert.equal(bundle.manifest.terminal_cells_after, 187);
  assert.equal(bundle.manifest.still_open_substantive_cells_after, 213);

  assertNoAuthorityEscalation(bundle);
  return true;
}

export async function validateProduct({ root = process.cwd() } = {}) {
  const actualNames = (await readdir(path.join(root, DATA_DIR))).sort();
  assert.deepEqual(actualNames, [...DATA_FILES].sort(), 'permanent data-file denominator drift');
  const predecessorText = await readFile(path.join(root, PREDECESSOR_MATRIX_PATH));
  assert.equal(sha256(predecessorText), PREDECESSOR_MATRIX_SHA256, 'predecessor SHA-256 drift');
  const expected = await buildProduct({ root, write: false });
  const bundle = await loadProductBundle({ root });
  validateBundle(bundle, expected);

  const manifestByName = new Map(bundle.manifest.entries.map((entry) => [entry.path, entry]));
  for (const fileName of bundle.manifest.entries.map((entry) => entry.path)) {
    const bytes = await readFile(path.join(root, DATA_DIR, fileName));
    const entry = manifestByName.get(fileName);
    assert.equal(bytes.length, entry.bytes, `${fileName} byte count drift`);
    assert.equal(sha256(bytes), entry.sha256, `${fileName} manifest SHA-256 drift`);
  }
  return { bundle, expected };
}

async function main() {
  await validateProduct();
  console.log('rd04_ca_sd_wa_composed_validation=pass');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
