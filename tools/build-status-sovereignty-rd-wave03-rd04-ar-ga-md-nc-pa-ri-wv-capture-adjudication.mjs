import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-capture-adjudication';
export const PREDECESSOR_MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-ca-sd-wa-row-state-adjudication/promoted-partial-field-matrix.json';
export const PREDECESSOR_MATRIX_SHA256 = '6df9c4a1c4f46debe339c9997c11124f0308cea6e57decac6f75cd9111468375';
export const PREDECESSOR_PRODUCT_COMMIT = 'ec8a45f4acd2c8f1c1b6a40837fb46373f7670a4';
export const PREDECESSOR_PRODUCT_TREE = '104a107946636f86a3a56dec8f243063a80329b9';
export const PREDECESSOR_MERGE_COMMIT = '9d9f9522fbc2909611033370044e9748a29b3cf7';
export const PROTOCOL_ID = 'SSC-RD04-W03-AR-GA-MD-NC-PA-RI-WV-MINIMUM-FRONTIER-V1';
export const TARGET_STATES = Object.freeze(['AR', 'GA', 'MD', 'NC', 'PA', 'RI', 'WV']);
export const TARGET_FIELD_IDS = Object.freeze([
  'operative_state_implementation_authority_and_version',
  'abawd_or_work_requirement_waiver_state_and_governing_period',
  'verification_evidence_and_staff_discretion_surface',
]);

const INPUT_FILES = Object.freeze({
  captureRouteResults: 'capture-route-results.json',
  captureManifest: 'capture-manifest.json',
  captureCustody: 'capture-custody.json',
  visualReview: 'pdf-visual-review-receipt.json',
  decisions: 'authored-adjudication-decisions.json',
});

const INPUT_SHA256 = Object.freeze({
  'authored-adjudication-decisions.json': '77f8062763cb9c3c36a827897f0ac03d7d8413b1de0ffa99d351bea8b52c7eb1',
  'capture-custody.json': 'c2bc3565bc78b433c9660273bff2f26ad2016662fbdc42e84d18c94251decc8c',
  'capture-manifest.json': 'ea1be05d3b65db409d222839de7a86e5000a3b4236bd8b166c9650bb9e777725',
  'capture-route-results.json': 'ba56e27473367dc2c38f01a4f21960a83641a7cd7642ffcbc8be11d33e3ed46f',
  'pdf-visual-review-receipt.json': 'e39c1f638e71fdad59c78e63f8501ff8ab2b2e8a2bc16a94ccea31c158f200ca',
});

const DERIVED_FILES = Object.freeze([
  'route-adjudications.jsonl',
  'terminal-target-cell-ledger.json',
  'promoted-partial-field-matrix.json',
  'remaining-open-field-census.json',
  'summary.json',
  'index.json',
  'product-manifest.json',
]);

const MANIFEST_ORDER = Object.freeze([
  'capture-route-results.json',
  'capture-manifest.json',
  'capture-custody.json',
  'pdf-visual-review-receipt.json',
  'authored-adjudication-decisions.json',
  'route-adjudications.jsonl',
  'terminal-target-cell-ledger.json',
  'promoted-partial-field-matrix.json',
  'remaining-open-field-census.json',
  'summary.json',
  'index.json',
]);

const PROHIBITED_INFERENCES = Object.freeze([
  'do_not_infer_uniform_frontline_practice',
  'do_not_infer_person_level_outcome',
  'do_not_infer_statewide_fact_beyond_the_exact_finding_scope',
  'do_not_infer_national_prevalence',
  'do_not_infer_discrimination_or_racial_order',
  'do_not_infer_coordination_or_common_purpose',
  'do_not_infer_complete_compact',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function clone(value) {
  return structuredClone(value);
}

function canonicalValueHash(value) {
  return sha256(Buffer.from(JSON.stringify(value)));
}

function assertPlainObject(value, label) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}

async function readUtf8(root, rel) {
  return readFile(path.join(root, rel), 'utf8');
}

async function readJson(root, rel) {
  const text = await readUtf8(root, rel);
  const value = JSON.parse(text);
  assertPlainObject(value, rel);
  return { text, value };
}

function buildEvidenceSources(decision, routeMap) {
  return decision.evidence_route_ids.map((routeId) => {
    const route = routeMap.get(routeId);
    assert(route, `missing route decision ${routeId}`);
    return {
      route_id: route.route_id,
      requested_url: route.requested_url,
      final_url: route.final_url,
      final_host: route.final_host,
      http_status: route.http_status,
      content_type: route.content_type,
      body_bytes: route.body_bytes,
      body_sha256: route.body_sha256,
      headers_sha256: route.headers_sha256,
      route_disposition: route.route_disposition,
    };
  });
}

function buildCurrentFinding(decision, routeMap) {
  return {
    terminal_classification: decision.terminal_state,
    finding_scope: 'bounded_fixed_protocol_state_field_terminalization',
    finding_code: decision.finding_code,
    finding_summary: decision.finding_summary,
    observed_components: clone(decision.observed_components),
    evidence_sources: buildEvidenceSources(decision, routeMap),
    evidence_locators: clone(decision.evidence_locators),
    limitations: clone(decision.limitations),
    prohibited_inferences: [...PROHIBITED_INFERENCES],
  };
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) counts[row[key]] = (counts[row[key]] ?? 0) + 1;
  return counts;
}

function assertInputCustody({ captureRouteResults, captureManifest, captureCustody, visualReview, decisions, predecessor }) {
  assert.equal(captureRouteResults.schema_version, 'ssc-rd04-wave03-mf7-minimum-frontier-route-results@1');
  assert.equal(captureRouteResults.protocol_id, PROTOCOL_ID);
  assert.equal(captureRouteResults.routes.length, 30);
  assert.equal(captureManifest.schema_version, 'ssc-rd04-wave03-mf7-minimum-frontier-capture-manifest@1');
  assert.equal(captureManifest.entries.length, 122);
  assert.equal(captureCustody.schema_version, 'ssc-rd04-wave03-mf7-capture-custody@1');
  assert.equal(captureCustody.workflow_run, 31088884667);
  assert.equal(captureCustody.artifact_id, 8962608866);
  assert.equal(captureCustody.artifact_zip_sha256, 'ee4f043f536778c151030c0ad206669afd84d4a8db3f01930c1b9fcac33d2ad6');
  assert.deepEqual(captureCustody.counts, {
    fixed_routes: 30,
    terminal_routes: 30,
    http_success_pending_adjudication: 24,
    http_non_success: 2,
    capture_transport_failure: 4,
    adjudicated_disallowed_final_host: 2,
    adjudicated_transport_failure: 2,
    pdf_bodies: 4,
    html_success_bodies: 20,
    result_spawned_requests: 0,
    source_admissions_at_capture: 0,
    field_classifications_at_capture: 0,
    row_terminalizations_at_capture: 0,
    class_closures_at_capture: 0,
  });
  assert.equal(visualReview.schema_version, 'ssc-rd04-wave03-mf7-pdf-visual-review-receipt@1');
  assert.equal(visualReview.pdf_routes, 4);
  assert.equal(visualReview.pdf_routes_visually_inspected, 4);
  assert.equal(visualReview.rows.length, 4);
  assert.equal(decisions.schema_version, 'ssc-rd04-wave03-mf7-authored-adjudication-decisions@1');
  assert.equal(decisions.protocol_id, PROTOCOL_ID);
  assert.equal(decisions.route_decisions.length, 30);
  assert.equal(decisions.field_decisions.length, 21);
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
  assert.equal(predecessor.schema_version, 'ssc-rd04-wave03-ca-sd-wa-row-state-promoted-partial-field-matrix@1');
  assert.equal(predecessor.counts.terminal_cells, 190);
  assert.equal(predecessor.counts.still_open_cells, 260);
  assert.equal(predecessor.counts.terminal_substantive_cells, 87);
  assert.equal(predecessor.counts.still_open_substantive_cells, 213);
  assert.equal(predecessor.counts.row_terminal_state_cells_terminal, 3);
  assert.equal(predecessor.counts.row_terminal_state_cells_open, 47);
  assert.equal(predecessor.counts.terminal_units, 3);
  assert.equal(predecessor.rows.length, 50);
}

function reconcileRoutes(captureRouteResults, decisions) {
  const capturedById = new Map(captureRouteResults.routes.map((row) => [row.route_id, row]));
  assert.equal(capturedById.size, 30);
  const routeMap = new Map();
  for (const decision of decisions.route_decisions) {
    const captured = capturedById.get(decision.route_id);
    assert(captured, `authored decision references unknown route ${decision.route_id}`);
    assert.equal(decision.route_decision_ordinal, captured.route_ordinal);
    for (const key of ['state_scope', 'route_category', 'final_url', 'final_host', 'http_status', 'body_bytes', 'body_sha256', 'headers_sha256']) {
      assert.deepEqual(decision[key], captured[key], `${decision.route_id} ${key} drift`);
    }
    assert.equal(decision.capture_state_before, captured.state);
    assert.equal(decision.adjudication_state, 'terminal');
    assert.equal(decision.field_classification_effect, 'none_at_route_layer');
    assert.equal(decision.row_terminalization_effect, 'none');
    assert.equal(decision.class_closure_effect, 'none');
    assert.equal(decision.outside_human_dependency, false);
    assert.equal(decision.result_spawned_requests, 0);
    routeMap.set(decision.route_id, decision);
  }
  assert.equal(routeMap.size, 30);
  assert.equal([...routeMap.values()].filter((row) => row.source_admitted).length, 22);
  assert.deepEqual(countBy([...routeMap.values()], 'route_disposition'), {
    terminal_disallowed_final_host: 2,
    terminal_source_admitted: 22,
    terminal_content_insufficient: 2,
    terminal_transport_failure: 2,
    terminal_http_non_success: 2,
  });
  return routeMap;
}

function composeMatrix(predecessor, decisions, routeMap) {
  const matrix = clone(predecessor);
  matrix.schema_version = 'ssc-rd04-wave03-mf7-capture-adjudication-promoted-partial-field-matrix@1';
  matrix.minimum_frontier_capture_adjudication_product = {
    predecessor_matrix_path: PREDECESSOR_MATRIX_PATH,
    predecessor_matrix_sha256: PREDECESSOR_MATRIX_SHA256,
    predecessor_product_commit: PREDECESSOR_PRODUCT_COMMIT,
    predecessor_product_tree: PREDECESSOR_PRODUCT_TREE,
    predecessor_merge_commit: PREDECESSOR_MERGE_COMMIT,
    protocol_merge_commit: 'e3cf2a53d5209557183a340752df83d38ab83994',
    protocol_product_commit: '4155cdb9f35802e76e754151fbf6f8c6f9145ef0',
    capture_workflow_run: 31088884667,
    capture_artifact_id: 8962608866,
    capture_custody_path: `${DATA_DIR}/capture-custody.json`,
    authored_decisions_path: `${DATA_DIR}/authored-adjudication-decisions.json`,
    composition_rule: 'terminalize_only_the_twenty_one_frozen_predecessor_open_substantive_cells_and_leave_seven_row_state_cells_open',
  };

  const rowsByCode = new Map(matrix.rows.map((row) => [row.postal_code, row]));
  const cellLedger = [];
  const targetKeys = new Set();

  for (const decision of decisions.field_decisions) {
    assert(TARGET_STATES.includes(decision.postal_code), `unexpected target state ${decision.postal_code}`);
    assert(TARGET_FIELD_IDS.includes(decision.field_id), `unexpected target field ${decision.field_id}`);
    const targetKey = `${decision.postal_code}:${decision.field_id}`;
    assert(!targetKeys.has(targetKey), `duplicate target cell ${targetKey}`);
    targetKeys.add(targetKey);

    const row = rowsByCode.get(decision.postal_code);
    assert(row, `missing state row ${decision.postal_code}`);
    const cell = row.cells.find((candidate) => candidate.field_id === decision.field_id);
    assert(cell, `missing field ${targetKey}`);
    assert.equal(cell.state, 'still_open', `${targetKey} predecessor state`);
    assert.equal(cell.terminal, false, `${targetKey} predecessor terminality`);
    assert.equal(decision.state_before, 'still_open');
    assert(['observed', 'not_publicly_recovered'].includes(decision.terminal_state));
    assert.equal(decision.state_after, decision.terminal_state);
    assert.equal(decision.terminal_after, true);

    for (const routeId of decision.evidence_route_ids) {
      const route = routeMap.get(routeId);
      assert(route?.source_admitted, `${targetKey} uses nonadmitted route ${routeId}`);
      assert(route.admitted_target_cells.includes(decision.target_cell_id), `${targetKey} route-cell custody drift ${routeId}`);
    }

    const predecessorSnapshot = clone(cell);
    const currentFinding = buildCurrentFinding(decision, routeMap);
    cell.state = decision.terminal_state;
    cell.terminal = true;
    cell.value = currentFinding;
    cell.evidence_source_ids = clone(decision.evidence_route_ids);
    cell.typed_gap = decision.typed_gap;
    cell.authority_effect = decision.terminal_state === 'observed'
      ? 'bounded_official_state_field_observation_only'
      : 'bounded_fixed_protocol_public_record_gap_only';

    cellLedger.push({
      field_decision_ordinal: decision.field_decision_ordinal,
      target_cell_id: decision.target_cell_id,
      target_cell_key: targetKey,
      unit_id: decision.unit_id,
      postal_code: decision.postal_code,
      state_name: decision.state_name,
      field_id: decision.field_id,
      predecessor_state: predecessorSnapshot.state,
      predecessor_terminal: predecessorSnapshot.terminal,
      predecessor_typed_gap: predecessorSnapshot.typed_gap,
      predecessor_value_sha256: canonicalValueHash(predecessorSnapshot.value),
      composition_action: 'terminalize_predecessor_open_substantive_cell',
      state_after: cell.state,
      terminal_after: cell.terminal,
      finding_code: decision.finding_code,
      finding_summary: decision.finding_summary,
      evidence_route_ids: clone(decision.evidence_route_ids),
      evidence_locators: clone(decision.evidence_locators),
      typed_gap: decision.typed_gap,
      final_value_sha256: canonicalValueHash(cell.value),
      authority_effect: cell.authority_effect,
      outside_human_dependency: false,
    });
  }

  assert.equal(targetKeys.size, 21);
  for (const code of TARGET_STATES) {
    const row = rowsByCode.get(code);
    row.terminal_fields = row.cells.filter((cell) => cell.terminal).length;
    row.open_fields = row.cells.length - row.terminal_fields;
    assert.equal(row.terminal_fields, 8, `${code} terminal-field count`);
    assert.equal(row.open_fields, 1, `${code} open-field count`);
    assert.equal(row.row_state, 'still_open');
    const rowCell = row.cells.find((cell) => cell.field_id === 'field_and_row_terminal_state');
    assert(rowCell && !rowCell.terminal);
    rowCell.typed_gap = 'row_remains_open_pending_separate_row_state_adjudication_after_8_of_9_required_fields_terminal';
  }

  const allCells = matrix.rows.flatMap((row) => row.cells);
  const substantiveCells = allCells.filter((cell) => cell.field_ordinal >= 2 && cell.field_ordinal <= 7);
  const terminalCells = allCells.filter((cell) => cell.terminal).length;
  const openCells = allCells.length - terminalCells;
  const terminalSubstantiveCells = substantiveCells.filter((cell) => cell.terminal).length;
  const openSubstantiveCells = substantiveCells.length - terminalSubstantiveCells;
  const terminalUnits = matrix.rows.filter((row) => row.cells.every((cell) => cell.terminal));
  const stateCounts = countBy(allCells.filter((cell) => cell.terminal), 'state');

  assert.equal(allCells.length, 450);
  assert.equal(substantiveCells.length, 300);
  assert.equal(terminalCells, 211);
  assert.equal(openCells, 239);
  assert.equal(terminalSubstantiveCells, 108);
  assert.equal(openSubstantiveCells, 192);
  assert.equal(terminalUnits.length, 3);
  assert.equal(stateCounts.evidence_complete, 181);
  assert.equal(stateCounts.observed, 17);
  assert.equal(stateCounts.not_publicly_recovered, 13);

  matrix.counts = {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    inherited_terminal_cells: 190,
    target_substantive_cells: 21,
    newly_terminalized_cells: 21,
    evidence_complete_cells: stateCounts.evidence_complete,
    observed_cells: stateCounts.observed,
    not_publicly_recovered_cells: stateCounts.not_publicly_recovered,
    still_open_cells: openCells,
    terminal_cells: terminalCells,
    source_rows_promoted: predecessor.counts.source_rows_promoted,
    reported_use_rows: predecessor.counts.reported_use_rows,
    reported_no_use_rows: predecessor.counts.reported_no_use_rows,
    terminal_substantive_cells: terminalSubstantiveCells,
    still_open_substantive_cells: openSubstantiveCells,
    row_terminal_state_cells_terminal: 3,
    row_terminal_state_cells_open: 47,
    terminal_units: terminalUnits.length,
    class_closed: false,
  };
  matrix.current_result = {
    canonical_state_identity_terminal: '50/50',
    source_identities_and_exact_custody_terminal: '50/50',
    discretionary_exemption_field_terminal: '50/50',
    minimum_frontier_target_cells_adjudicated: '21/21',
    terminal_cells: '211/450',
    still_open_cells: '239/450',
    terminal_substantive_cells: terminalSubstantiveCells,
    still_open_substantive_cells: openSubstantiveCells,
    row_terminal_state_cells_terminal: 3,
    row_terminal_state_cells_open: 47,
    terminal_units: terminalUnits.length,
    terminal_unit_ids: terminalUnits.map((row) => row.unit_id),
    target_rows_ready_for_separate_row_state_adjudication: [...TARGET_STATES],
    field_matrix_terminal: false,
    class_state: 'still_open',
    class_closed: false,
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    national_prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  };

  return { matrix, cellLedger };
}

function buildRemainingCensus(matrix) {
  const allCells = matrix.rows.flatMap((row) => row.cells.map((cell) => ({ row, cell })));
  const openCells = allCells.filter(({ cell }) => !cell.terminal).map(({ row, cell }) => ({
    unit_ordinal: row.unit_ordinal,
    unit_id: row.unit_id,
    postal_code: row.postal_code,
    state_name: row.state_name,
    field_ordinal: cell.field_ordinal,
    field_id: cell.field_id,
    typed_gap: cell.typed_gap,
    authority_effect: cell.authority_effect,
  }));
  const fieldCounts = {};
  for (const fieldId of matrix.field_order) {
    const cells = allCells.filter(({ cell }) => cell.field_id === fieldId).map(({ cell }) => cell);
    fieldCounts[fieldId] = {
      terminal: cells.filter((cell) => cell.terminal).length,
      open: cells.filter((cell) => !cell.terminal).length,
    };
  }
  const terminalRows = matrix.rows.filter((row) => row.cells.every((cell) => cell.terminal)).map((row) => ({
    unit_ordinal: row.unit_ordinal,
    unit_id: row.unit_id,
    postal_code: row.postal_code,
    state_name: row.state_name,
    row_state: row.row_state,
    terminal_fields: row.terminal_fields,
    open_fields: row.open_fields,
  }));
  return {
    schema_version: 'ssc-rd04-wave03-mf7-capture-adjudication-remaining-open-field-census@1',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    matrix_path: `${DATA_DIR}/promoted-partial-field-matrix.json`,
    predecessor_matrix_path: PREDECESSOR_MATRIX_PATH,
    counts: {
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
    },
    field_counts: fieldCounts,
    terminal_rows: terminalRows,
    target_rows_ready_for_separate_row_state_adjudication: TARGET_STATES.map((code) => {
      const row = matrix.rows.find((candidate) => candidate.postal_code === code);
      return {
        unit_ordinal: row.unit_ordinal,
        unit_id: row.unit_id,
        postal_code: row.postal_code,
        state_name: row.state_name,
        row_state: row.row_state,
        terminal_fields: row.terminal_fields,
        open_fields: row.open_fields,
        remaining_field_id: 'field_and_row_terminal_state',
      };
    }),
    open_cells: openCells,
    authority_boundary: {
      outside_human_dependency: false,
      reviewed_disposition_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      national_prevalence_effect: 'none',
      discrimination_effect: 'none',
      coordination_effect: 'none',
      common_purpose_effect: 'none',
      racial_order_effect: 'none',
      complete_compact_effect: 'none',
    },
  };
}

function buildSummary(decisions, routeMap) {
  const routeDispositions = countBy([...routeMap.values()], 'route_disposition');
  return {
    schema_version: 'ssc-rd04-wave03-mf7-capture-adjudication-summary@1',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    protocol_pr: 1263,
    protocol_merge: 'e3cf2a53d5209557183a340752df83d38ab83994',
    capture_pr: 1265,
    capture_workflow_run: 31088884667,
    capture_artifact_id: 8962608866,
    capture_artifact_zip_sha256: 'ee4f043f536778c151030c0ad206669afd84d4a8db3f01930c1b9fcac33d2ad6',
    fixed_routes: 30,
    terminal_route_adjudications: 30,
    route_dispositions: routeDispositions,
    source_admissions: 22,
    target_cells: 21,
    observed_field_decisions: 14,
    not_publicly_recovered_field_decisions: 7,
    canonical_predecessor: {
      product_commit: PREDECESSOR_PRODUCT_COMMIT,
      product_tree: PREDECESSOR_PRODUCT_TREE,
      merge_commit: PREDECESSOR_MERGE_COMMIT,
      matrix_path: PREDECESSOR_MATRIX_PATH,
      matrix_sha256: PREDECESSOR_MATRIX_SHA256,
      terminal_cells: 190,
      still_open_cells: 260,
      terminal_substantive_cells: 87,
      still_open_substantive_cells: 213,
      terminal_units: 3,
    },
    composition: {
      predecessor_terminal_cells: 190,
      newly_terminalized_cells: 21,
      terminal_cells_after: 211,
      still_open_cells_after: 239,
      terminal_substantive_cells_after: 108,
      still_open_substantive_cells_after: 192,
      target_rows_ready_for_separate_row_state_adjudication: 7,
      row_state_cells_terminalized: 0,
      terminal_units_after: 3,
    },
    target_state_results: TARGET_STATES.map((code) => ({
      postal_code: code,
      terminalized_substantive_cells: 3,
      observed_cells: decisions.field_decisions.filter((row) => row.postal_code === code && row.terminal_state === 'observed').length,
      not_publicly_recovered_cells: decisions.field_decisions.filter((row) => row.postal_code === code && row.terminal_state === 'not_publicly_recovered').length,
      row_state: 'still_open_pending_separate_deterministic_adjudication',
    })),
    class_state: 'still_open',
    class_closed: false,
    cumulative_ledger_effect: 'none',
    result_spawned_requests: 0,
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    national_prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  };
}

function buildIndex(summary) {
  return {
    schema_version: 'ssc-rd04-wave03-mf7-capture-adjudication-index@1',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    input_paths: {
      capture_route_results: `${DATA_DIR}/capture-route-results.json`,
      capture_manifest: `${DATA_DIR}/capture-manifest.json`,
      capture_custody: `${DATA_DIR}/capture-custody.json`,
      pdf_visual_review_receipt: `${DATA_DIR}/pdf-visual-review-receipt.json`,
      authored_adjudication_decisions: `${DATA_DIR}/authored-adjudication-decisions.json`,
      canonical_predecessor_matrix: PREDECESSOR_MATRIX_PATH,
    },
    derived_paths: {
      route_adjudications: `${DATA_DIR}/route-adjudications.jsonl`,
      terminal_target_cell_ledger: `${DATA_DIR}/terminal-target-cell-ledger.json`,
      promoted_partial_field_matrix: `${DATA_DIR}/promoted-partial-field-matrix.json`,
      remaining_open_field_census: `${DATA_DIR}/remaining-open-field-census.json`,
      summary: `${DATA_DIR}/summary.json`,
      product_manifest: `${DATA_DIR}/product-manifest.json`,
    },
    predecessor: summary.canonical_predecessor,
    capture: {
      protocol_pr: 1263,
      protocol_merge: 'e3cf2a53d5209557183a340752df83d38ab83994',
      trigger_pr: 1265,
      workflow_run: 31088884667,
      artifact_id: 8962608866,
      artifact_zip_sha256: 'ee4f043f536778c151030c0ad206669afd84d4a8db3f01930c1b9fcac33d2ad6',
    },
    counts: {
      fixed_routes: 30,
      terminal_route_adjudications: 30,
      source_admissions: 22,
      target_cells: 21,
      observed_target_cells: 14,
      not_publicly_recovered_target_cells: 7,
      terminal_cells_before: 190,
      terminal_cells_after: 211,
      still_open_cells_after: 239,
      terminal_substantive_cells_after: 108,
      still_open_substantive_cells_after: 192,
      target_rows_ready_for_separate_row_state_adjudication: 7,
      terminal_units_after: 3,
      class_closed: false,
      result_spawned_requests: 0,
    },
    current_result: {
      capture_adjudication_complete: true,
      thirty_route_decisions_terminal: true,
      twenty_one_target_decisions_composed: true,
      seven_target_rows_ready_for_separate_row_state_adjudication: true,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      reviewed_disposition_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      national_prevalence_effect: 'none',
      discrimination_effect: 'none',
      coordination_effect: 'none',
      common_purpose_effect: 'none',
      racial_order_effect: 'none',
      complete_compact_effect: 'none',
    },
    next_bounded_operation: 'separately adjudicate the seven derivative row-state cells without changing the twenty-one terminal substantive decisions or closing RD-04-C02, then continue the remaining 192 substantive obligations under fixed protocols',
  };
}

function buildTerminalLedger(cellLedger) {
  return {
    schema_version: 'ssc-rd04-wave03-mf7-terminal-target-cell-ledger@1',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    predecessor: {
      matrix_path: PREDECESSOR_MATRIX_PATH,
      matrix_sha256: PREDECESSOR_MATRIX_SHA256,
      product_commit: PREDECESSOR_PRODUCT_COMMIT,
      product_tree: PREDECESSOR_PRODUCT_TREE,
      merge_commit: PREDECESSOR_MERGE_COMMIT,
      terminal_cells: 190,
      terminal_substantive_cells: 87,
    },
    counts: {
      target_cells: 21,
      newly_terminalized_cells: 21,
      observed_decisions: 14,
      not_publicly_recovered_decisions: 7,
      row_terminalizations: 0,
      class_closures: 0,
    },
    cells: cellLedger,
    authority: {
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      national_prevalence_effect: 'none',
      discrimination_effect: 'none',
      coordination_effect: 'none',
      common_purpose_effect: 'none',
      racial_order_effect: 'none',
      complete_compact_effect: 'none',
    },
  };
}

function buildProductManifest(files) {
  const entries = MANIFEST_ORDER.map((name) => {
    const content = files[name];
    assert.equal(typeof content, 'string', `manifest input missing ${name}`);
    const bytes = Buffer.byteLength(content);
    return { path: name, bytes, sha256: sha256(Buffer.from(content)) };
  });
  const combined = sha256(Buffer.from(entries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join('\n')));
  return {
    schema_version: 'ssc-rd04-wave03-mf7-capture-adjudication-product-manifest@1',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    permanent_data_files: 12,
    manifest_entries: entries.length,
    combined_mode: 'sha256_of_ordered_path_nul_bytes_nul_sha256_lines',
    entries,
    file_set_combined_sha256: combined,
    terminal_cells_before: 190,
    target_cells: 21,
    newly_terminalized_cells: 21,
    terminal_cells_after: 211,
    still_open_cells_after: 239,
    terminal_substantive_cells_after: 108,
    still_open_substantive_cells_after: 192,
    target_rows_ready_for_separate_row_state_adjudication: 7,
    terminal_units_after: 3,
    class_closed: false,
    cumulative_ledger_effect: 'none',
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    national_prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  };
}

export async function buildProduct(root = process.cwd()) {
  const dataRoot = path.join(root, DATA_DIR);
  const inputs = {};
  for (const [key, name] of Object.entries(INPUT_FILES)) {
    const { text, value } = await readJson(dataRoot, name);
    assert.equal(sha256(Buffer.from(text)), INPUT_SHA256[name], `${name} SHA-256 drift`);
    inputs[key] = value;
  }
  const predecessorText = await readUtf8(root, PREDECESSOR_MATRIX_PATH);
  assert.equal(sha256(Buffer.from(predecessorText)), PREDECESSOR_MATRIX_SHA256, 'canonical predecessor matrix SHA-256 drift');
  const predecessor = JSON.parse(predecessorText);
  assertInputCustody({ ...inputs, predecessor });
  const routeMap = reconcileRoutes(inputs.captureRouteResults, inputs.decisions);
  const { matrix, cellLedger } = composeMatrix(predecessor, inputs.decisions, routeMap);
  const terminalLedger = buildTerminalLedger(cellLedger);
  const census = buildRemainingCensus(matrix);
  const summary = buildSummary(inputs.decisions, routeMap);
  const index = buildIndex(summary);
  const routeAdjudications = `${inputs.decisions.route_decisions.map((row) => JSON.stringify(row)).join('\n')}\n`;

  const files = {
    'capture-route-results.json': await readUtf8(dataRoot, 'capture-route-results.json'),
    'capture-manifest.json': await readUtf8(dataRoot, 'capture-manifest.json'),
    'capture-custody.json': await readUtf8(dataRoot, 'capture-custody.json'),
    'pdf-visual-review-receipt.json': await readUtf8(dataRoot, 'pdf-visual-review-receipt.json'),
    'authored-adjudication-decisions.json': await readUtf8(dataRoot, 'authored-adjudication-decisions.json'),
    'route-adjudications.jsonl': routeAdjudications,
    'terminal-target-cell-ledger.json': jsonText(terminalLedger),
    'promoted-partial-field-matrix.json': jsonText(matrix),
    'remaining-open-field-census.json': jsonText(census),
    'summary.json': jsonText(summary),
    'index.json': jsonText(index),
  };
  const manifest = buildProductManifest(files);
  files['product-manifest.json'] = jsonText(manifest);

  return {
    files,
    objects: {
      captureRouteResults: inputs.captureRouteResults,
      captureManifest: inputs.captureManifest,
      captureCustody: inputs.captureCustody,
      visualReview: inputs.visualReview,
      decisions: inputs.decisions,
      routeAdjudications: inputs.decisions.route_decisions,
      terminalLedger,
      matrix,
      census,
      summary,
      index,
      manifest,
      predecessor,
    },
  };
}

async function runCli() {
  const mode = process.argv[2] ?? '--check';
  assert(['--check', '--write'].includes(mode), 'usage: builder [--check|--write]');
  const { files } = await buildProduct(process.cwd());
  for (const name of DERIVED_FILES) {
    const expected = files[name];
    const outputPath = path.join(DATA_DIR, name);
    if (mode === '--write') {
      await writeFile(outputPath, expected);
    } else {
      const observed = await readFile(outputPath, 'utf8');
      assert.equal(observed, expected, `${outputPath} deterministic drift`);
    }
  }
  console.log(`rd04_mf7_capture_adjudication_build=${mode === '--write' ? 'written' : 'clean'} paths=${DERIVED_FILES.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
