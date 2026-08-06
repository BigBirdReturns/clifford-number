import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProduct,
  DATA_DIR,
  PREDECESSOR_MATRIX_PATH,
  PREDECESSOR_MATRIX_SHA256,
  PREDECESSOR_PRODUCT_COMMIT,
  PREDECESSOR_PRODUCT_TREE,
  PREDECESSOR_MERGE_COMMIT,
  PROTOCOL_ID,
  TARGET_STATES,
  TARGET_FIELD_IDS,
} from './build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-capture-adjudication.mjs';

const EFFECT_KEYS = Object.freeze([
  'publication_effect',
  'adoption_effect',
  'graph_effect',
  'national_prevalence_effect',
  'discrimination_effect',
  'coordination_effect',
  'common_purpose_effect',
  'racial_order_effect',
  'complete_compact_effect',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertAuthorityCeiling(object, label) {
  assert.equal(object.outside_human_dependency, false, `${label} outside-human dependency`);
  for (const key of EFFECT_KEYS) {
    if (Object.hasOwn(object, key)) assert.equal(object[key], 'none', `${label} ${key}`);
  }
  if (Object.hasOwn(object, 'reviewed_disposition_effect')) assert.equal(object.reviewed_disposition_effect, 'none', `${label} reviewed disposition`);
}

function deepClone(value) {
  return structuredClone(value);
}

function indexBy(rows, key, label) {
  const map = new Map();
  for (const row of rows) {
    assert(!map.has(row[key]), `${label} duplicate ${row[key]}`);
    map.set(row[key], row);
  }
  return map;
}

function expectedRouteDispositionCounts() {
  return {
    terminal_disallowed_final_host: 2,
    terminal_source_admitted: 22,
    terminal_content_insufficient: 2,
    terminal_transport_failure: 2,
    terminal_http_non_success: 2,
  };
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1;
  return out;
}

export function validateObjectSet(objects) {
  const {
    captureRouteResults,
    captureManifest,
    captureCustody,
    visualReview,
    decisions,
    routeAdjudications,
    terminalLedger,
    matrix,
    census,
    summary,
    index,
    manifest,
    predecessor,
  } = objects;

  assert.equal(captureRouteResults.schema_version, 'ssc-rd04-wave03-mf7-minimum-frontier-route-results@1');
  assert.equal(captureRouteResults.protocol_id, PROTOCOL_ID);
  assert.equal(captureRouteResults.routes.length, 30);
  assert.equal(captureManifest.schema_version, 'ssc-rd04-wave03-mf7-minimum-frontier-capture-manifest@1');
  assert.equal(captureManifest.entries.length, 122);
  assert.equal(captureCustody.schema_version, 'ssc-rd04-wave03-mf7-capture-custody@1');
  assert.equal(captureCustody.protocol_id, PROTOCOL_ID);
  assert.equal(captureCustody.counts.fixed_routes, 30);
  assert.equal(captureCustody.counts.terminal_routes, 30);
  assert.equal(captureCustody.counts.http_success_pending_adjudication, 24);
  assert.equal(captureCustody.counts.http_non_success, 2);
  assert.equal(captureCustody.counts.capture_transport_failure, 4);
  assert.equal(captureCustody.counts.adjudicated_disallowed_final_host, 2);
  assert.equal(captureCustody.counts.adjudicated_transport_failure, 2);
  assert.equal(captureCustody.counts.result_spawned_requests, 0);
  assertAuthorityCeiling(captureCustody.authority, 'capture custody authority');

  assert.equal(visualReview.schema_version, 'ssc-rd04-wave03-mf7-pdf-visual-review-receipt@1');
  assert.equal(visualReview.pdf_routes, 4);
  assert.equal(visualReview.pdf_routes_visually_inspected, 4);
  assert.equal(visualReview.rows.length, 4);
  assert.deepEqual(visualReview.rows.map((row) => row.route_id), [
    'RD04-W03-MF7-010',
    'RD04-W03-MF7-014',
    'RD04-W03-MF7-026',
    'RD04-W03-MF7-030',
  ]);
  for (const row of visualReview.rows) {
    assert.equal(row.visual_result, 'legible_state_plan_with_checked_form_fields_and_tables');
    assert.equal(row.retained_contact_details, false);
    assert.equal(row.layout_dependent_claims_beyond_selected_pages, false);
  }
  assertAuthorityCeiling(visualReview.authority, 'visual review authority');

  assert.equal(decisions.schema_version, 'ssc-rd04-wave03-mf7-authored-adjudication-decisions@1');
  assert.equal(decisions.protocol_id, PROTOCOL_ID);
  assert.deepEqual(decisions.counts, {
    route_decisions: 30,
    terminal_route_decisions: 30,
    source_admissions: 22,
    field_decisions: 21,
    observed_field_decisions: 14,
    not_publicly_recovered_field_decisions: 7,
    field_terminalizations: 21,
    row_terminalizations: 0,
    class_closures: 0,
    result_spawned_requests: 0,
  });
  assert.equal(decisions.route_decisions.length, 30);
  assert.equal(decisions.field_decisions.length, 21);
  assertAuthorityCeiling(decisions.authority, 'authored authority');

  const capturedById = indexBy(captureRouteResults.routes, 'route_id', 'capture route');
  const routeById = indexBy(decisions.route_decisions, 'route_id', 'route decision');
  assert.equal(capturedById.size, 30);
  assert.equal(routeById.size, 30);
  assert.deepEqual(routeAdjudications, decisions.route_decisions, 'JSONL route adjudications drift from authored route decisions');

  for (let ordinal = 1; ordinal <= 30; ordinal += 1) {
    const id = `RD04-W03-MF7-${String(ordinal).padStart(3, '0')}`;
    const captured = capturedById.get(id);
    const decision = routeById.get(id);
    assert(captured && decision, `missing route ${id}`);
    assert.equal(captured.route_ordinal, ordinal);
    assert.equal(decision.route_decision_ordinal, ordinal);
    for (const key of ['state_scope', 'route_category', 'final_url', 'final_host', 'http_status', 'body_bytes', 'body_sha256', 'headers_sha256']) {
      assert.deepEqual(decision[key], captured[key], `${id} ${key}`);
    }
    assert.equal(decision.capture_state_before, captured.state);
    assert.equal(decision.adjudication_state, 'terminal');
    assert.equal(decision.field_classification_effect, 'none_at_route_layer');
    assert.equal(decision.row_terminalization_effect, 'none');
    assert.equal(decision.class_closure_effect, 'none');
    assert.equal(decision.result_spawned_requests, 0);
    assertAuthorityCeiling(decision, `route ${id}`);
    if (decision.source_admitted) {
      assert.equal(decision.route_disposition, 'terminal_source_admitted');
      assert(decision.admitted_target_cells.length > 0, `${id} admitted route without target cells`);
      assert(decision.final_url, `${id} admitted route without final URL`);
      assert(decision.body_bytes > 0, `${id} admitted route without body`);
    } else {
      assert.equal(decision.admitted_target_cells.length, 0, `${id} nonadmitted route has admitted cells`);
    }
  }
  assert.equal([...routeById.values()].filter((row) => row.source_admitted).length, 22);
  assert.deepEqual(countBy([...routeById.values()], 'route_disposition'), expectedRouteDispositionCounts());

  const fieldById = indexBy(decisions.field_decisions, 'target_cell_id', 'field decision');
  assert.equal(fieldById.size, 21);
  assert.deepEqual(decisions.field_decisions.map((row) => row.field_decision_ordinal), Array.from({ length: 21 }, (_, i) => i + 1));
  assert.equal(decisions.field_decisions.filter((row) => row.terminal_state === 'observed').length, 14);
  assert.equal(decisions.field_decisions.filter((row) => row.terminal_state === 'not_publicly_recovered').length, 7);

  for (const field of decisions.field_decisions) {
    assert(TARGET_STATES.includes(field.postal_code), `${field.target_cell_id} unexpected state`);
    assert(TARGET_FIELD_IDS.includes(field.field_id), `${field.target_cell_id} unexpected field`);
    assert.equal(field.state_before, 'still_open');
    assert.equal(field.state_after, field.terminal_state);
    assert.equal(field.terminal_after, true);
    assert(['observed', 'not_publicly_recovered'].includes(field.terminal_state));
    assert.equal(field.terminal_state === 'not_publicly_recovered', typeof field.typed_gap === 'string');
    assert(field.finding_code.length > 10);
    assert(field.finding_summary.length > 40);
    assert(field.evidence_route_ids.length > 0);
    assert(field.limitations.includes('bounded_to_the_exact_fixed_public_route_corpus'));
    assertAuthorityCeiling(field, `field ${field.target_cell_id}`);
    for (const routeId of field.evidence_route_ids) {
      const route = routeById.get(routeId);
      assert(route?.source_admitted, `${field.target_cell_id} references nonadmitted route ${routeId}`);
      assert(route.admitted_target_cells.includes(field.target_cell_id), `${field.target_cell_id} lacks route-cell custody ${routeId}`);
    }
  }

  assert.equal(predecessor.schema_version, 'ssc-rd04-wave03-ca-sd-wa-row-state-promoted-partial-field-matrix@1');
  assert.equal(predecessor.counts.terminal_cells, 190);
  assert.equal(predecessor.counts.still_open_cells, 260);
  assert.equal(predecessor.counts.terminal_substantive_cells, 87);
  assert.equal(predecessor.counts.still_open_substantive_cells, 213);
  assert.equal(predecessor.counts.terminal_units, 3);
  assert.equal(predecessor.rows.length, 50);

  assert.equal(matrix.schema_version, 'ssc-rd04-wave03-mf7-capture-adjudication-promoted-partial-field-matrix@1');
  assert.equal(matrix.rows.length, 50);
  assert.equal(matrix.minimum_frontier_capture_adjudication_product.predecessor_matrix_path, PREDECESSOR_MATRIX_PATH);
  assert.equal(matrix.minimum_frontier_capture_adjudication_product.predecessor_matrix_sha256, PREDECESSOR_MATRIX_SHA256);
  assert.equal(matrix.minimum_frontier_capture_adjudication_product.predecessor_product_commit, PREDECESSOR_PRODUCT_COMMIT);
  assert.equal(matrix.minimum_frontier_capture_adjudication_product.predecessor_product_tree, PREDECESSOR_PRODUCT_TREE);
  assert.equal(matrix.minimum_frontier_capture_adjudication_product.predecessor_merge_commit, PREDECESSOR_MERGE_COMMIT);
  assert.deepEqual(matrix.counts, {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    inherited_terminal_cells: 190,
    target_substantive_cells: 21,
    newly_terminalized_cells: 21,
    evidence_complete_cells: 181,
    observed_cells: 17,
    not_publicly_recovered_cells: 13,
    still_open_cells: 239,
    terminal_cells: 211,
    source_rows_promoted: 50,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    terminal_substantive_cells: 108,
    still_open_substantive_cells: 192,
    row_terminal_state_cells_terminal: 3,
    row_terminal_state_cells_open: 47,
    terminal_units: 3,
    class_closed: false,
  });
  assert.equal(matrix.current_result.terminal_cells, '211/450');
  assert.equal(matrix.current_result.still_open_cells, '239/450');
  assert.equal(matrix.current_result.terminal_substantive_cells, 108);
  assert.equal(matrix.current_result.still_open_substantive_cells, 192);
  assert.equal(matrix.current_result.class_closed, false);
  assert.deepEqual(matrix.current_result.target_rows_ready_for_separate_row_state_adjudication, [...TARGET_STATES]);
  assertAuthorityCeiling(matrix.current_result, 'matrix current result');

  const predecessorRows = indexBy(predecessor.rows, 'postal_code', 'predecessor row');
  const matrixRows = indexBy(matrix.rows, 'postal_code', 'matrix row');
  assert.equal(matrixRows.size, 50);
  for (const [code, row] of matrixRows) {
    const before = predecessorRows.get(code);
    assert(before, `missing predecessor row ${code}`);
    assert.equal(row.cells.length, 9);
    assert.equal(row.terminal_fields, row.cells.filter((cell) => cell.terminal).length);
    assert.equal(row.open_fields, 9 - row.terminal_fields);
    const rowCell = row.cells.find((cell) => cell.field_id === 'field_and_row_terminal_state');
    if (TARGET_STATES.includes(code)) {
      assert.equal(row.row_state, 'still_open');
      assert.equal(row.terminal_fields, 8);
      assert.equal(row.open_fields, 1);
      assert.equal(rowCell.terminal, false);
      assert.equal(rowCell.typed_gap, 'row_remains_open_pending_separate_row_state_adjudication_after_8_of_9_required_fields_terminal');
      for (const fieldId of TARGET_FIELD_IDS) {
        const afterCell = row.cells.find((cell) => cell.field_id === fieldId);
        const beforeCell = before.cells.find((cell) => cell.field_id === fieldId);
        assert.equal(beforeCell.terminal, false);
        assert.equal(beforeCell.state, 'still_open');
        assert.equal(afterCell.terminal, true);
        assert(['observed', 'not_publicly_recovered'].includes(afterCell.state));
      }
    } else {
      assert.deepEqual(row, before, `nontarget row drift ${code}`);
    }
  }

  const allCells = matrix.rows.flatMap((row) => row.cells);
  const substantiveCells = allCells.filter((cell) => cell.field_ordinal >= 2 && cell.field_ordinal <= 7);
  assert.equal(allCells.length, 450);
  assert.equal(allCells.filter((cell) => cell.terminal).length, 211);
  assert.equal(allCells.filter((cell) => !cell.terminal).length, 239);
  assert.equal(substantiveCells.length, 300);
  assert.equal(substantiveCells.filter((cell) => cell.terminal).length, 108);
  assert.equal(substantiveCells.filter((cell) => !cell.terminal).length, 192);
  assert.equal(matrix.rows.filter((row) => row.cells.every((cell) => cell.terminal)).length, 3);

  assert.equal(terminalLedger.schema_version, 'ssc-rd04-wave03-mf7-terminal-target-cell-ledger@1');
  assert.equal(terminalLedger.protocol_id, PROTOCOL_ID);
  assert.deepEqual(terminalLedger.counts, {
    target_cells: 21,
    newly_terminalized_cells: 21,
    observed_decisions: 14,
    not_publicly_recovered_decisions: 7,
    row_terminalizations: 0,
    class_closures: 0,
  });
  assert.equal(terminalLedger.cells.length, 21);
  assertAuthorityCeiling(terminalLedger.authority, 'terminal ledger authority');
  for (const cell of terminalLedger.cells) {
    const decision = fieldById.get(cell.target_cell_id);
    assert(decision, `terminal ledger unknown target ${cell.target_cell_id}`);
    assert.equal(cell.field_decision_ordinal, decision.field_decision_ordinal);
    assert.equal(cell.target_cell_key, `${decision.postal_code}:${decision.field_id}`);
    assert.equal(cell.predecessor_state, 'still_open');
    assert.equal(cell.predecessor_terminal, false);
    assert.equal(cell.composition_action, 'terminalize_predecessor_open_substantive_cell');
    assert.equal(cell.state_after, decision.terminal_state);
    assert.equal(cell.terminal_after, true);
    assert.equal(cell.finding_code, decision.finding_code);
    assert.deepEqual(cell.evidence_route_ids, decision.evidence_route_ids);
    assert.equal(cell.outside_human_dependency, false);
  }

  assert.equal(census.schema_version, 'ssc-rd04-wave03-mf7-capture-adjudication-remaining-open-field-census@1');
  assert.equal(census.protocol_id, PROTOCOL_ID);
  assert.deepEqual(census.counts, {
    units: 50,
    required_cells: 450,
    terminal_cells: 211,
    still_open_cells: 239,
    substantive_cells: 300,
    terminal_substantive_cells: 108,
    still_open_substantive_cells: 192,
    row_terminal_state_cells_terminal: 3,
    row_terminal_state_cells_open: 47,
    terminal_units: 3,
    open_units: 47,
    target_rows_ready_for_separate_row_state_adjudication: 7,
    class_closed: false,
  });
  assert.equal(census.open_cells.length, 239);
  assert.equal(census.terminal_rows.length, 3);
  assert.equal(census.target_rows_ready_for_separate_row_state_adjudication.length, 7);
  assert.deepEqual(census.target_rows_ready_for_separate_row_state_adjudication.map((row) => row.postal_code), [...TARGET_STATES]);
  assertAuthorityCeiling(census.authority_boundary, 'census authority');
  const openKeys = new Set(census.open_cells.map((row) => `${row.postal_code}:${row.field_id}`));
  assert.equal(openKeys.size, 239);
  for (const row of matrix.rows) {
    for (const cell of row.cells.filter((candidate) => !candidate.terminal)) {
      assert(openKeys.has(`${row.postal_code}:${cell.field_id}`), `census missing open cell ${row.postal_code}:${cell.field_id}`);
    }
  }

  assert.equal(summary.schema_version, 'ssc-rd04-wave03-mf7-capture-adjudication-summary@1');
  assert.equal(summary.protocol_id, PROTOCOL_ID);
  assert.equal(summary.fixed_routes, 30);
  assert.equal(summary.terminal_route_adjudications, 30);
  assert.deepEqual(summary.route_dispositions, expectedRouteDispositionCounts());
  assert.equal(summary.source_admissions, 22);
  assert.equal(summary.target_cells, 21);
  assert.equal(summary.observed_field_decisions, 14);
  assert.equal(summary.not_publicly_recovered_field_decisions, 7);
  assert.equal(summary.canonical_predecessor.matrix_sha256, PREDECESSOR_MATRIX_SHA256);
  assert.deepEqual(summary.composition, {
    predecessor_terminal_cells: 190,
    newly_terminalized_cells: 21,
    terminal_cells_after: 211,
    still_open_cells_after: 239,
    terminal_substantive_cells_after: 108,
    still_open_substantive_cells_after: 192,
    target_rows_ready_for_separate_row_state_adjudication: 7,
    row_state_cells_terminalized: 0,
    terminal_units_after: 3,
  });
  assert.equal(summary.target_state_results.length, 7);
  assert.equal(summary.target_state_results.reduce((sum, row) => sum + row.observed_cells, 0), 14);
  assert.equal(summary.target_state_results.reduce((sum, row) => sum + row.not_publicly_recovered_cells, 0), 7);
  assert.equal(summary.class_state, 'still_open');
  assert.equal(summary.class_closed, false);
  assert.equal(summary.cumulative_ledger_effect, 'none');
  assert.equal(summary.result_spawned_requests, 0);
  assertAuthorityCeiling(summary, 'summary authority');

  assert.equal(index.schema_version, 'ssc-rd04-wave03-mf7-capture-adjudication-index@1');
  assert.equal(index.protocol_id, PROTOCOL_ID);
  assert.equal(index.counts.fixed_routes, 30);
  assert.equal(index.counts.terminal_route_adjudications, 30);
  assert.equal(index.counts.source_admissions, 22);
  assert.equal(index.counts.target_cells, 21);
  assert.equal(index.counts.observed_target_cells, 14);
  assert.equal(index.counts.not_publicly_recovered_target_cells, 7);
  assert.equal(index.counts.terminal_cells_after, 211);
  assert.equal(index.counts.still_open_substantive_cells_after, 192);
  assert.equal(index.counts.target_rows_ready_for_separate_row_state_adjudication, 7);
  assert.equal(index.counts.class_closed, false);
  assert.equal(index.current_result.capture_adjudication_complete, true);
  assert.equal(index.current_result.twenty_one_target_decisions_composed, true);
  assert.equal(index.current_result.seven_target_rows_ready_for_separate_row_state_adjudication, true);
  assert.equal(index.current_result.class_closed, false);
  assertAuthorityCeiling(index.current_result, 'index current result');

  assert.equal(manifest.schema_version, 'ssc-rd04-wave03-mf7-capture-adjudication-product-manifest@1');
  assert.equal(manifest.protocol_id, PROTOCOL_ID);
  assert.equal(manifest.permanent_data_files, 12);
  assert.equal(manifest.manifest_entries, 11);
  assert.equal(manifest.entries.length, 11);
  assert.equal(new Set(manifest.entries.map((row) => row.path)).size, 11);
  assert.equal(manifest.terminal_cells_before, 190);
  assert.equal(manifest.target_cells, 21);
  assert.equal(manifest.newly_terminalized_cells, 21);
  assert.equal(manifest.terminal_cells_after, 211);
  assert.equal(manifest.still_open_substantive_cells_after, 192);
  assert.equal(manifest.target_rows_ready_for_separate_row_state_adjudication, 7);
  assert.equal(manifest.class_closed, false);
  assert.equal(manifest.cumulative_ledger_effect, 'none');
  assertAuthorityCeiling(manifest, 'product manifest authority');
  const recombined = sha256(Buffer.from(manifest.entries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join('\n')));
  assert.equal(recombined, manifest.file_set_combined_sha256, 'product manifest combined digest');

  return true;
}

export async function validateProduct(root = process.cwd()) {
  const { files, objects } = await buildProduct(root);
  validateObjectSet(objects);
  for (const [name, expected] of Object.entries(files)) {
    const observed = await readFile(path.join(root, DATA_DIR, name), 'utf8');
    assert.equal(observed, expected, `${name} deterministic byte drift`);
  }
  const predecessorBytes = await readFile(path.join(root, PREDECESSOR_MATRIX_PATH));
  assert.equal(sha256(predecessorBytes), PREDECESSOR_MATRIX_SHA256);
  console.log('rd04_mf7_capture_adjudication_validation=pass routes=30 sources=22 cells=21 terminal=211 open_substantive=192');
  return deepClone(objects);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateProduct(process.cwd());
}
