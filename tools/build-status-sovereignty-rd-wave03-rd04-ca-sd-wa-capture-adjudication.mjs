import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-ca-sd-wa-capture-adjudication';
export const PREDECESSOR_MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-state-options-exemption-promotion/promoted-partial-field-matrix.json';

const INPUT_FILES = Object.freeze({
  captureRouteResults: 'capture-route-results.json',
  captureManifest: 'capture-manifest.json',
  captureCustody: 'capture-custody.json',
  visualReview: 'pdf-visual-review-receipt.json',
  decisions: 'authored-adjudication-decisions.json',
});

const INPUT_SHA256 = Object.freeze({
  'capture-route-results.json': '60fc91c3677b2226c8fc81ef2fe98609442f0af14d97b07ead3bdc2fe4dfe6eb',
  'capture-manifest.json': '907eee85b77874d46be71150fd3e9092c24f3bdacde06988b3586e57dff64c3f',
  'capture-custody.json': '2e19e551efb3d4b977dac5075532a54b47e29e9f2896f6b3d58ec90d03ebd02f',
  'pdf-visual-review-receipt.json': '0f70293367afa7105c52fd243279ff9bef79a17ea42031eb201642e3a8f06c2d',
  'authored-adjudication-decisions.json': '3a0f07426678972f8dc5f2cbe0c7b589f013739051ee23f077527d30357e73e2',
});

export const PREDECESSOR_MATRIX_SHA256 = '9c83e14652ce1c4799f1b5a9d3ff9b60692f03732c0ebfd51d1a3706c74eb546';
export const PREDECESSOR_PRODUCT_COMMIT = 'e7168949ddd299496210b72f108f83a42e160d48';
export const PREDECESSOR_MERGE_COMMIT = '51b9a58b13fe10587280c027740188061b6e02f5';
export const PROTOCOL_ID = 'SSC-RD04-W03-CA-SD-WA-SUCCESSOR-V1';
export const TARGET_STATES = Object.freeze(['CA', 'SD', 'WA']);
export const TARGET_FIELD_IDS = Object.freeze([
  'operative_state_implementation_authority_and_version',
  'implementation_effective_date_or_typed_gap',
  'abawd_or_work_requirement_waiver_state_and_governing_period',
  'discretionary_exemption_authority_and_reported_state_practice',
  'verification_evidence_and_staff_discretion_surface',
]);

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

function canonicalValueHash(value) {
  return sha256(Buffer.from(JSON.stringify(value)));
}

function clone(value) {
  return structuredClone(value);
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
      final_url: route.final_url,
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

function assertInputCustody({ captureRouteResults, captureManifest, captureCustody, visualReview, decisions, predecessor }) {
  assert.equal(captureRouteResults.schema_version, 'ssc-rd04-wave03-ca-sd-wa-successor-route-results@1');
  assert.equal(captureRouteResults.protocol_id, PROTOCOL_ID);
  assert.equal(captureRouteResults.routes.length, 30);
  assert.equal(captureManifest.schema_version, 'ssc-rd04-wave03-ca-sd-wa-successor-capture-manifest@1');
  assert.equal(captureManifest.entries.length, 122);
  assert.equal(captureManifest.combined_sha256, '86a6a99f6ff055e7328bd30fa399f1b4f5556aebe94ee8a6a5ff95e1b76e8ea0');
  assert.equal(captureCustody.workflow_run, 31056936843);
  assert.equal(captureCustody.artifact_id, 8950629798);
  assert.equal(captureCustody.artifact_zip_sha256, 'b6f81d9b5cff8090896c63060c27ebdc44e92a3d17f67766142302493a9e7010');
  assert.equal(captureCustody.counts.fixed_routes, 30);
  assert.equal(captureCustody.counts.terminal_routes, 30);
  assert.equal(captureCustody.counts.pdf_bodies, 14);
  assert.equal(captureCustody.counts.html_bodies, 16);
  assert.equal(visualReview.pdf_routes, 14);
  assert.equal(visualReview.pdf_routes_visually_inspected, 14);
  assert.equal(visualReview.rows.length, 14);
  assert.equal(decisions.schema_version, 'ssc-rd04-wave03-ca-sd-wa-authored-adjudication-decisions@1');
  assert.equal(decisions.protocol_id, PROTOCOL_ID);
  assert.equal(decisions.route_decisions.length, 30);
  assert.equal(decisions.field_decisions.length, 9);
  assert.deepEqual(decisions.counts, {
    route_decisions: 30,
    terminal_route_decisions: 30,
    source_admissions: 17,
    field_decisions: 9,
    observed_field_decisions: 3,
    not_publicly_recovered_field_decisions: 6,
    field_terminalizations: 9,
    row_terminalizations: 0,
    class_closures: 0,
    result_spawned_requests: 0,
  });
  assert.equal(predecessor.schema_version, 'ssc-rd04-wave03-state-options-exemption-promoted-partial-field-matrix@1');
  assert.equal(predecessor.counts.terminal_cells, 181);
  assert.equal(predecessor.counts.still_open_cells, 269);
  assert.equal(predecessor.current_result.terminal_substantive_cells, 81);
  assert.equal(predecessor.current_result.still_open_substantive_cells, 219);
  assert.equal(predecessor.current_result.row_terminal_state_cells_open, 50);
  assert.equal(predecessor.rows.length, 50);
}

function reconcileRoutes(captureRouteResults, decisions) {
  const capturedById = new Map(captureRouteResults.routes.map((row) => [row.route_id, row]));
  assert.equal(capturedById.size, 30);
  const routeMap = new Map();
  for (const decision of decisions.route_decisions) {
    const captured = capturedById.get(decision.route_id);
    assert(captured, `authored decision references unknown route ${decision.route_id}`);
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
  return routeMap;
}

function composeMatrix(predecessor, decisions, routeMap, executionReceipt) {
  const matrix = clone(predecessor);
  matrix.schema_version = 'ssc-rd04-wave03-ca-sd-wa-capture-adjudication-promoted-partial-field-matrix@2';

  const rowsByCode = new Map(matrix.rows.map((row) => [row.postal_code, row]));
  const cellLedger = [];
  const targetKeys = new Set();
  let newlyTerminalizedCells = 0;
  let terminalEvidenceUpdates = 0;

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

    const predecessorSnapshot = clone(cell);
    const predecessorValueSha256 = canonicalValueHash(predecessorSnapshot.value);
    const currentFinding = buildCurrentFinding(decision, routeMap);
    let compositionAction;

    if (cell.terminal) {
      assert.equal(decision.field_id, 'discretionary_exemption_authority_and_reported_state_practice', `${targetKey} unexpectedly terminal in predecessor`);
      assert.equal(cell.state, 'evidence_complete');
      assert.equal(cell.value.reported_state_practice.reference_period, 'FFY 2024');
      assert.equal(decision.terminal_state, 'not_publicly_recovered');
      compositionAction = 'compose_terminal_historical_evidence_with_current_gap';
      terminalEvidenceUpdates += 1;
      cell.state = decision.terminal_state;
      cell.terminal = true;
      cell.value = {
        terminal_classification: decision.terminal_state,
        finding_scope: 'bounded_chronology_composed_state_field_terminalization',
        historical_reported_practice: predecessorSnapshot.value,
        current_fixed_protocol_finding: currentFinding,
        chronology: {
          historical_reference_period: predecessorSnapshot.value.reported_state_practice.reference_period,
          historical_report_publication_month: predecessorSnapshot.value.report_publication_month,
          current_capture_started_at: executionReceipt.started_at,
          current_capture_completed_at: executionReceipt.completed_at,
          composition_rule: 'preserve_historical_reported_practice_without_treating_it_as_current_actual_use',
        },
        prohibited_inferences: [...PROHIBITED_INFERENCES],
      };
      cell.evidence_source_ids = [...new Set([...predecessorSnapshot.evidence_source_ids, ...decision.evidence_route_ids])];
      cell.typed_gap = decision.typed_gap;
      cell.authority_effect = 'bounded_historical_reported_practice_and_current_fixed_protocol_public_record_gap_only';
    } else {
      assert.equal(cell.state, 'still_open');
      compositionAction = 'terminalize_predecessor_open_cell';
      newlyTerminalizedCells += 1;
      cell.state = decision.terminal_state;
      cell.terminal = true;
      cell.value = currentFinding;
      cell.evidence_source_ids = clone(decision.evidence_route_ids);
      cell.typed_gap = decision.typed_gap;
      cell.authority_effect = decision.terminal_state === 'observed'
        ? 'bounded_official_state_field_observation_only'
        : 'bounded_fixed_protocol_public_record_gap_only';
    }

    cellLedger.push({
      field_decision_ordinal: decision.field_decision_ordinal,
      target_cell_id: decision.target_cell_id,
      target_cell_key: targetKey,
      unit_id: decision.unit_id,
      postal_code: decision.postal_code,
      state_name: decision.state_name,
      field_id: decision.field_id,
      authored_state_before: decision.state_before,
      composed_predecessor_state: predecessorSnapshot.state,
      composed_predecessor_terminal: predecessorSnapshot.terminal,
      composed_predecessor_typed_gap: predecessorSnapshot.typed_gap,
      composed_predecessor_value_sha256: predecessorValueSha256,
      composition_action: compositionAction,
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

  assert.equal(targetKeys.size, 9);
  assert.equal(newlyTerminalizedCells, 6);
  assert.equal(terminalEvidenceUpdates, 3);

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
  const terminalCells = allCells.filter((cell) => cell.terminal).length;
  const openCells = allCells.length - terminalCells;
  const substantiveCells = allCells.filter((cell) => cell.field_ordinal >= 2 && cell.field_ordinal <= 7);
  const terminalSubstantive = substantiveCells.filter((cell) => cell.terminal).length;
  const openSubstantive = substantiveCells.length - terminalSubstantive;
  const stateCounts = Object.fromEntries([...new Set(allCells.map((cell) => cell.state))].sort().map((state) => [state, allCells.filter((cell) => cell.state === state).length]));

  assert.equal(terminalCells, 187);
  assert.equal(openCells, 263);
  assert.equal(terminalSubstantive, 87);
  assert.equal(openSubstantive, 213);
  assert.deepEqual(stateCounts, {
    evidence_complete: 178,
    not_publicly_recovered: 6,
    observed: 3,
    still_open: 263,
  });

  matrix.counts = {
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
  };

  matrix.current_result = {
    canonical_state_identity_terminal: '50/50',
    source_identities_and_exact_custody_terminal: '50/50',
    historical_discretionary_exemption_field_terminal: '50/50',
    historical_ffy2024_reported_use_rows: 37,
    historical_ffy2024_reported_no_use_rows: 13,
    current_actual_discretionary_exemption_use_not_publicly_recovered_rows: 3,
    target_cells_adjudicated: '9/9',
    newly_terminalized_cells: 6,
    terminal_evidence_updates: 3,
    terminal_cells: '187/450',
    still_open_cells: '263/450',
    terminal_substantive_cells: 87,
    still_open_substantive_cells: 213,
    row_terminal_state_cells_open: 50,
    target_rows_ready_for_separate_row_state_adjudication: TARGET_STATES,
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

  matrix.composition_product = {
    predecessor_matrix_path: PREDECESSOR_MATRIX_PATH,
    predecessor_matrix_sha256: PREDECESSOR_MATRIX_SHA256,
    predecessor_product_commit: PREDECESSOR_PRODUCT_COMMIT,
    predecessor_merge_commit: PREDECESSOR_MERGE_COMMIT,
    capture_custody_path: `${DATA_DIR}/capture-custody.json`,
    authored_decisions_path: `${DATA_DIR}/authored-adjudication-decisions.json`,
    capture_reference_period: '2026-08-05',
    composition_rule: 'six_predecessor_open_cells_terminalized_and_three_terminal_historical_cells_updated_without_double_counting',
  };

  return { matrix, cellLedger, newlyTerminalizedCells, terminalEvidenceUpdates };
}

function buildOpenCensus(matrix) {
  const openCells = [];
  const fieldCounts = {};
  for (const fieldId of matrix.field_order) fieldCounts[fieldId] = { terminal: 0, open: 0 };
  for (const row of matrix.rows) {
    for (const cell of row.cells) {
      fieldCounts[cell.field_id][cell.terminal ? 'terminal' : 'open'] += 1;
      if (!cell.terminal) {
        openCells.push({
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
  }
  assert.equal(openCells.length, 263);
  return {
    schema_version: 'ssc-rd04-wave03-ca-sd-wa-capture-adjudication-remaining-open-field-census@2',
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
      terminal_cells: 187,
      still_open_cells: 263,
      substantive_cells: 300,
      terminal_substantive_cells: 87,
      still_open_substantive_cells: 213,
      row_terminal_state_cells_open: 50,
      target_rows_ready_for_separate_row_state_adjudication: 3,
      terminal_units: 0,
      class_closed: false,
    },
    field_counts: fieldCounts,
    target_rows_ready_for_separate_row_state_adjudication: TARGET_STATES.map((postalCode) => {
      const row = matrix.rows.find((candidate) => candidate.postal_code === postalCode);
      return {
        unit_id: row.unit_id,
        postal_code: postalCode,
        state_name: row.state_name,
        terminal_fields: row.terminal_fields,
        open_fields: row.open_fields,
        remaining_open_field_id: 'field_and_row_terminal_state',
      };
    }),
    open_cells: openCells,
    authority: {
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
    },
  };
}

function buildSummary(captureCustody, decisions) {
  return {
    schema_version: 'ssc-rd04-wave03-ca-sd-wa-capture-adjudication-summary@2',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    protocol_pr: 1220,
    capture_pr: 1221,
    capture_workflow_run: captureCustody.workflow_run,
    capture_artifact_id: captureCustody.artifact_id,
    capture_artifact_zip_sha256: captureCustody.artifact_zip_sha256,
    fixed_routes: 30,
    terminal_route_adjudications: 30,
    source_admissions: decisions.counts.source_admissions,
    target_cells: 9,
    observed_field_decisions: 3,
    not_publicly_recovered_field_decisions: 6,
    canonical_predecessor: {
      product_commit: PREDECESSOR_PRODUCT_COMMIT,
      merge_commit: PREDECESSOR_MERGE_COMMIT,
      matrix_path: PREDECESSOR_MATRIX_PATH,
      matrix_sha256: PREDECESSOR_MATRIX_SHA256,
      terminal_cells: 181,
      still_open_cells: 269,
      still_open_substantive_cells: 219,
    },
    composition: {
      stale_authored_predecessor_terminal_cells: 131,
      stale_authored_terminal_cells_after: 140,
      stale_authored_field_terminalizations: 9,
      canonical_predecessor_terminal_cells: 181,
      newly_terminalized_cells: 6,
      terminal_evidence_updates: 3,
      canonical_terminal_cells_after: 187,
      canonical_still_open_cells_after: 263,
      canonical_still_open_substantive_cells_after: 213,
      target_rows_ready_for_separate_row_state_adjudication: 3,
      double_counted_terminal_cells_refused: 3,
    },
    terminal_units_after: 0,
    class_state: 'still_open',
    class_closed: false,
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

function buildIndex() {
  return {
    schema_version: 'ssc-rd04-wave03-ca-sd-wa-capture-adjudication-index@2',
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
    predecessor: {
      authored_pre_state_options_field_promotion_merge: 'efcf6bc094facb72dec6b966a7e8e3b2acdf4d06',
      canonical_state_options_product_commit: PREDECESSOR_PRODUCT_COMMIT,
      canonical_state_options_merge_commit: PREDECESSOR_MERGE_COMMIT,
      canonical_state_options_matrix_sha256: PREDECESSOR_MATRIX_SHA256,
      successor_protocol_merge: 'e46d4aa98955e890a1bd2820dc43c52bc256490e',
      capture_workflow_run: 31056936843,
      capture_artifact_id: 8950629798,
    },
    counts: {
      fixed_routes: 30,
      terminal_route_adjudications: 30,
      source_admissions: 17,
      target_cells: 9,
      newly_terminalized_cells: 6,
      terminal_evidence_updates: 3,
      observed_target_cells: 3,
      not_publicly_recovered_target_cells: 6,
      terminal_cells_before: 181,
      terminal_cells_after: 187,
      still_open_cells_after: 263,
      still_open_substantive_cells_after: 213,
      target_rows_ready_for_separate_row_state_adjudication: 3,
      terminal_units_after: 0,
      class_closed: false,
      result_spawned_requests: 0,
    },
    current_result: {
      capture_adjudication_complete: true,
      nine_target_decisions_composed: true,
      six_predecessor_open_cells_terminalized: true,
      three_terminal_historical_cells_updated_without_double_counting: true,
      target_rows_ready_for_separate_row_state_adjudication: true,
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
    next_bounded_operation: 'separately adjudicate the California, South Dakota, and Washington row-state cells without closing RD-04-C02, then continue the remaining 213 substantive state-field obligations under fixed protocols',
  };
}

function buildTerminalLedger(cellLedger) {
  return {
    schema_version: 'ssc-rd04-wave03-ca-sd-wa-terminal-target-cell-ledger@2',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    predecessor: {
      matrix_path: PREDECESSOR_MATRIX_PATH,
      matrix_sha256: PREDECESSOR_MATRIX_SHA256,
      product_commit: PREDECESSOR_PRODUCT_COMMIT,
      merge_commit: PREDECESSOR_MERGE_COMMIT,
      terminal_cells: 181,
    },
    counts: {
      target_cells: 9,
      newly_terminalized_cells: 6,
      terminal_evidence_updates: 3,
      observed_decisions: 3,
      not_publicly_recovered_decisions: 6,
      row_terminalizations: 0,
      class_closures: 0,
    },
    cells: cellLedger,
    authority: {
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
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

function buildManifest(fileTexts) {
  const entries = MANIFEST_ORDER.map((fileName) => {
    const text = fileTexts.get(fileName);
    assert.equal(typeof text, 'string', `manifest input missing ${fileName}`);
    const bytes = Buffer.byteLength(text);
    return { path: fileName, bytes, sha256: sha256(Buffer.from(text)) };
  });
  const combined = entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}`).join('\n');
  return {
    schema_version: 'ssc-rd04-wave03-ca-sd-wa-capture-adjudication-product-manifest@2',
    protocol_id: PROTOCOL_ID,
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    permanent_data_files: 12,
    manifest_entries: 11,
    combined_mode: 'sha256_of_ordered_path_nul_bytes_nul_sha256_lines',
    entries,
    file_set_combined_sha256: sha256(Buffer.from(combined)),
    terminal_cells_before: 181,
    target_cells: 9,
    newly_terminalized_cells: 6,
    terminal_evidence_updates: 3,
    terminal_cells_after: 187,
    still_open_cells_after: 263,
    still_open_substantive_cells_after: 213,
    target_rows_ready_for_separate_row_state_adjudication: 3,
    terminal_units_after: 0,
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
}

export async function buildProduct({ root = process.cwd(), write = false } = {}) {
  const dataRoot = path.join(root, DATA_DIR);
  const inputs = {};
  const inputTexts = new Map();
  for (const [key, fileName] of Object.entries(INPUT_FILES)) {
    const rel = `${DATA_DIR}/${fileName}`;
    const { text, value } = await readJson(root, rel);
    assert.equal(sha256(Buffer.from(text)), INPUT_SHA256[fileName], `${fileName} SHA-256 drift`);
    inputs[key] = value;
    inputTexts.set(fileName, text);
  }
  const executionReceipt = {
    started_at: '2026-08-05T23:37:17.543280+00:00',
    completed_at: '2026-08-05T23:37:51.236380+00:00',
    sha256: '4aac4fbe13701c29995a877481b935296e446febbb1e9ac5da655d69f3d0f274',
  };

  const predecessorText = await readUtf8(root, PREDECESSOR_MATRIX_PATH);
  assert.equal(sha256(Buffer.from(predecessorText)), PREDECESSOR_MATRIX_SHA256, 'canonical predecessor matrix SHA-256 drift');
  const predecessor = JSON.parse(predecessorText);
  assertInputCustody({ ...inputs, predecessor });
  const routeMap = reconcileRoutes(inputs.captureRouteResults, inputs.decisions);
  const { matrix, cellLedger } = composeMatrix(predecessor, inputs.decisions, routeMap, executionReceipt);
  const terminalLedger = buildTerminalLedger(cellLedger);
  const openCensus = buildOpenCensus(matrix);
  const summary = buildSummary(inputs.captureCustody, inputs.decisions);
  const index = buildIndex();
  const routeText = inputs.decisions.route_decisions.map((row) => JSON.stringify(row)).join('\n') + '\n';

  const outputObjects = {
    'terminal-target-cell-ledger.json': terminalLedger,
    'promoted-partial-field-matrix.json': matrix,
    'remaining-open-field-census.json': openCensus,
    'summary.json': summary,
    'index.json': index,
  };
  const fileTexts = new Map(inputTexts);
  fileTexts.set('route-adjudications.jsonl', routeText);
  for (const [fileName, value] of Object.entries(outputObjects)) fileTexts.set(fileName, jsonText(value));
  const manifest = buildManifest(fileTexts);
  outputObjects['product-manifest.json'] = manifest;
  fileTexts.set('product-manifest.json', jsonText(manifest));

  if (write) {
    await mkdir(dataRoot, { recursive: true });
    await Promise.all([
      writeFile(path.join(dataRoot, 'route-adjudications.jsonl'), routeText),
      ...Object.entries(outputObjects).map(([fileName, value]) => writeFile(path.join(dataRoot, fileName), jsonText(value))),
    ]);
  }

  return {
    inputs,
    predecessor,
    executionReceipt,
    routeAdjudicationsText: routeText,
    terminalLedger,
    matrix,
    openCensus,
    summary,
    index,
    manifest,
    fileTexts,
  };
}

export async function checkProduct({ root = process.cwd() } = {}) {
  const expected = await buildProduct({ root, write: false });
  for (const fileName of DERIVED_FILES) {
    const actual = await readUtf8(root, `${DATA_DIR}/${fileName}`);
    const expectedText = expected.fileTexts.get(fileName);
    assert.equal(actual, expectedText, `${fileName} is not the deterministic build output`);
  }
  return expected;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  assert(!(args.has('--write') && args.has('--check')), 'choose either --write or --check');
  const write = args.has('--write');
  if (write) {
    await buildProduct({ write: true });
    console.log('rd04_ca_sd_wa_composed_build=written');
  } else {
    await checkProduct();
    console.log('rd04_ca_sd_wa_composed_build=clean');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
