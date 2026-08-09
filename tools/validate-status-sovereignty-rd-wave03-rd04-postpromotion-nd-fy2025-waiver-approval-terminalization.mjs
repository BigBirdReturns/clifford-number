import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  SLUG,
  OUTPUT_DIR,
  SCHEMA_PATH,
  MANIFEST_PATH,
  CANONICAL_PARENT,
  CANONICAL_TREE,
  PREDECESSOR,
  TARGET,
  EVIDENCE,
  PERMANENT_PATHS,
  PROHIBITED,
  sha256Bytes,
  gitBlob,
  stable,
  canonicalSha,
  assert,
  equal,
} from './build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization.mjs';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function findRow(matrix, unitId) {
  const row = matrix.rows.find((item) => item.unit_id === unitId);
  assert(row, `row missing: ${unitId}`);
  return row;
}

function findCell(row, fieldId) {
  const cell = row.cells.find((item) => item.field_id === fieldId);
  assert(cell, `cell missing: ${row.unit_id}:${fieldId}`);
  return cell;
}

function verifyBoundary(boundary, label) {
  assert(boundary.matrix_updates === 1, `${label} matrix updates differ`);
  assert(boundary.field_terminalizations === 1, `${label} field terminalizations differ`);
  assert(boundary.row_terminalizations === 0, `${label} row terminalizations differ`);
  assert(boundary.row_state_mutations === 0, `${label} row mutations differ`);
  assert(boundary.class_closed === false, `${label} class closure differs`);
  assert(boundary.outside_human_dependency === false, `${label} outside-human boundary differs`);
  for (const key of [
    'reviewed_disposition_effect',
    'publication_effect',
    'adoption_effect',
    'graph_effect',
    'prevalence_effect',
    'discrimination_effect',
    'coordination_effect',
    'common_purpose_effect',
    'racial_order_effect',
    'complete_compact_effect',
    'cumulative_ledger_effect',
  ]) {
    assert(boundary[key] === 'none', `${label}.${key} widened`);
  }
}

function verifyManifest(manifest) {
  assert(manifest.permanent_path_count === 14 && manifest.hashed_file_count === 13, 'manifest denominator differs');
  equal(manifest.permanent_paths, [...PERMANENT_PATHS], 'permanent paths differ');
  assert(new Set(manifest.permanent_paths).size === 14, 'duplicate permanent paths');
  assert(
    manifest.permanent_paths.every((relative) =>
      !relative.includes('/.tmp/') &&
      !relative.startsWith('.tmp/') &&
      !relative.includes('trigger') &&
      !relative.includes('carrier')),
    'transport path entered product',
  );

  const rows = [];
  for (const relative of PERMANENT_PATHS) {
    const absolute = path.join(ROOT, relative);
    assert(fs.existsSync(absolute), `permanent path missing: ${relative}`);
    if (relative === MANIFEST_PATH) continue;
    const bytes = fs.readFileSync(absolute);
    rows.push({
      path: relative,
      bytes: bytes.length,
      sha256: sha256Bytes(bytes),
      git_blob: gitBlob(bytes),
    });
  }
  equal(manifest.hashed_files, rows, 'manifest file identities differ');
  const combined = sha256Bytes(Buffer.from(rows.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\0${item.git_blob}\n`).join('')));
  assert(manifest.combined_sha256 === combined, 'combined digest differs');
  assert(manifest.authority_boundary.source_requests === 0, 'manifest source-request boundary differs');
  assert(manifest.authority_boundary.new_source_admissions === 1, 'manifest source-admission boundary differs');
  verifyBoundary(manifest.authority_boundary, 'manifest authority');
}

export function validateProduct() {
  const predecessorBytes = fs.readFileSync(path.join(ROOT, PREDECESSOR.path));
  assert(predecessorBytes.length === PREDECESSOR.bytes, 'predecessor byte count differs');
  assert(sha256Bytes(predecessorBytes) === PREDECESSOR.sha256, 'predecessor SHA-256 differs');
  assert(gitBlob(predecessorBytes) === PREDECESSOR.gitBlob, 'predecessor Git blob differs');
  const predecessor = JSON.parse(predecessorBytes.toString('utf8'));

  const custody = readJson(`${OUTPUT_DIR}/terminalization-input-custody.json`);
  const decisions = readJson(`${OUTPUT_DIR}/terminalization-decisions.json`);
  const ledger = readJson(`${OUTPUT_DIR}/cell-transition-ledger.json`);
  const matrix = readJson(`${OUTPUT_DIR}/promoted-partial-field-matrix.json`);
  const census = readJson(`${OUTPUT_DIR}/remaining-open-field-census.json`);
  const summary = readJson(`${OUTPUT_DIR}/terminalization-summary.json`);
  const index = readJson(`${OUTPUT_DIR}/index.json`);
  const manifest = readJson(MANIFEST_PATH);
  const schema = readJson(SCHEMA_PATH);

  equal(
    custody.publication_parent_lease,
    {
      expected_main: CANONICAL_PARENT,
      expected_tree: CANONICAL_TREE,
      tree_state: 'exact_commit_and_tree_bound_at_construction',
      current_matrix_blob: PREDECESSOR.gitBlob,
      fail_closed_on_parent_or_tree_drift: true,
    },
    'publication parent lease differs',
  );
  assert(custody.predecessor_matrix.terminal_cells === 227 && custody.predecessor_matrix.still_open_cells === 223, 'custody predecessor counts differ');
  assert(custody.source_custody.body_bytes === EVIDENCE.bodyBytes, 'source bytes differ');
  assert(custody.source_custody.body_sha256 === EVIDENCE.bodySha256, 'source SHA-256 differs');
  assert(custody.source_custody.route_consumed === true && custody.source_custody.additional_transport_authorized === false, 'source route state differs');
  const embedded = Buffer.from(custody.source_custody.embedded_pdf.data_base64, 'base64');
  assert(embedded.length === EVIDENCE.bodyBytes, 'embedded PDF bytes differ');
  assert(sha256Bytes(embedded) === EVIDENCE.bodySha256, 'embedded PDF SHA-256 differs');
  assert(custody.page_complete_review.page_count === 5, 'page denominator differs');
  equal(custody.page_complete_review.pages_reviewed, [1, 2, 3, 4, 5], 'reviewed pages differ');
  assert(custody.page_complete_review.all_pages_reviewed === true, 'page-complete review missing');
  equal(custody.page_complete_review.render.pages.map((item) => item.sha256), [...EVIDENCE.renderSha256], 'render hashes differ');
  assert(custody.page_complete_review.text_derivations.layout_sha256 === EVIDENCE.layoutTextSha256, 'layout text digest differs');
  assert(custody.page_complete_review.text_derivations.flow_sha256 === EVIDENCE.flowTextSha256, 'flow text digest differs');
  assert(custody.page_complete_review.observations.length === 10, 'observation denominator differs');
  assert(custody.authority_boundary.source_requests === 0 && custody.authority_boundary.new_source_admissions === 1, 'custody source boundary differs');
  verifyBoundary(custody.authority_boundary, 'custody authority');

  assert(decisions.decision_count === 1, 'decision denominator differs');
  assert(decisions.field_terminalization_count === 1 && decisions.row_terminalization_count === 0, 'decision transition counts differ');
  equal(decisions.decision_outcomes, ['terminalize_field_as_evidence_complete'], 'decision outcomes differ');
  assert(decisions.decisions.length === 1, 'decision array denominator differs');
  const decision = decisions.decisions[0];
  equal([decision.unit_id, decision.field_id], [TARGET.unitId, TARGET.fieldId], 'decision target differs');
  equal([decision.state_before, decision.state_after, decision.terminal_before, decision.terminal_after], ['still_open', 'evidence_complete', false, true], 'decision state differs');
  assert(decision.before_cell_sha256 === TARGET.beforeFieldSha256, 'decision before-cell hash differs');
  equal(decision.source_route_ids, [EVIDENCE.routeId], 'decision source route differs');
  equal(decision.source_body_sha256s, [EVIDENCE.bodySha256], 'decision source body differs');
  equal(decision.bounded_finding.approved_areas, EVIDENCE.approvedAreas, 'approved areas differ');
  equal(decision.bounded_finding.denied_areas, EVIDENCE.deniedAreas, 'denied areas differ');
  equal(decision.bounded_finding.governing_period, {implementation_date: EVIDENCE.implementationDate, expiration_date: EVIDENCE.expirationDate}, 'governing period differs');
  verifyBoundary(decisions.authority_boundary, 'decisions authority');

  equal(
    ledger.counts,
    {
      transitions: 1,
      affected_states: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      row_state_mutations: 0,
      matrix_updates: 1,
      terminal_cells_before: 227,
      terminal_cells_after: 228,
      still_open_cells_before: 223,
      still_open_cells_after: 222,
      terminal_substantive_cells_before: 117,
      terminal_substantive_cells_after: 118,
      still_open_substantive_cells_before: 183,
      still_open_substantive_cells_after: 182,
      terminal_units_before: 10,
      terminal_units_after: 10,
    },
    'ledger counts differ',
  );
  assert(ledger.transitions.length === 1, 'ledger transition denominator differs');
  const transition = ledger.transitions[0];
  equal([transition.unit_id, transition.field_id], [TARGET.unitId, TARGET.fieldId], 'ledger target differs');
  assert(transition.before_cell_sha256 === TARGET.beforeFieldSha256, 'ledger before-cell hash differs');
  verifyBoundary(ledger.authority_boundary, 'ledger authority');

  equal(
    {
      materialized_cells: matrix.counts.materialized_cells,
      terminal_cells: matrix.counts.terminal_cells,
      still_open_cells: matrix.counts.still_open_cells,
      evidence_complete_cells: matrix.counts.evidence_complete_cells,
      observed_cells: matrix.counts.observed_cells,
      not_publicly_recovered_cells: matrix.counts.not_publicly_recovered_cells,
      terminal_substantive_cells: matrix.counts.terminal_substantive_cells,
      still_open_substantive_cells: matrix.counts.still_open_substantive_cells,
      row_terminal_state_cells_terminal: matrix.counts.row_terminal_state_cells_terminal,
      row_terminal_state_cells_open: matrix.counts.row_terminal_state_cells_open,
      terminal_units: matrix.counts.terminal_units,
      field_terminalizations: matrix.counts.postpromotion_nd_fy2025_waiver_approval_field_terminalizations,
      row_terminalizations: matrix.counts.postpromotion_nd_fy2025_waiver_approval_row_terminalizations,
    },
    {
      materialized_cells: 450,
      terminal_cells: 228,
      still_open_cells: 222,
      evidence_complete_cells: 198,
      observed_cells: 17,
      not_publicly_recovered_cells: 13,
      terminal_substantive_cells: 118,
      still_open_substantive_cells: 182,
      row_terminal_state_cells_terminal: 10,
      row_terminal_state_cells_open: 40,
      terminal_units: 10,
      field_terminalizations: 1,
      row_terminalizations: 0,
    },
    'matrix counts differ',
  );
  assert(matrix.current_result.class_closed === false && matrix.current_result.class_state === 'still_open', 'matrix class state differs');
  assert(matrix.current_result.terminal_units === 10, 'matrix terminal-unit denominator differs');
  const metadata = matrix.postpromotion_nd_fy2025_waiver_approval_terminalization_product;
  equal(
    [metadata.field_terminalizations, metadata.row_terminalizations, metadata.row_state_mutations, metadata.matrix_updates],
    [1, 0, 0, 1],
    'matrix product authority differs',
  );
  assert(metadata.north_dakota_row_state_after === 'still_open' && metadata.north_dakota_row_state_cell_preserved === true, 'matrix row-state custody differs');

  const changedCells = [];
  for (const row of matrix.rows) {
    const priorRow = findRow(predecessor, row.unit_id);
    if (row.unit_id === TARGET.unitId) {
      equal([row.row_state, row.terminal_fields, row.open_fields], ['still_open', 8, 1], 'North Dakota row projection differs');
    } else {
      equal([row.row_state, row.terminal_fields, row.open_fields], [priorRow.row_state, priorRow.terminal_fields, priorRow.open_fields], `${row.unit_id} row metadata changed`);
    }
    for (const cell of row.cells) {
      const prior = findCell(priorRow, cell.field_id);
      const key = `${row.unit_id}|${cell.field_id}`;
      if (row.unit_id === TARGET.unitId && cell.field_id === TARGET.fieldId) {
        changedCells.push(key);
        assert(prior.state === 'still_open' && prior.terminal === false, 'target predecessor state differs');
        assert(canonicalSha(prior) === TARGET.beforeFieldSha256, 'target predecessor hash differs');
        assert(cell.state === 'evidence_complete' && cell.terminal === true && cell.typed_gap === null, 'target promotion differs');
        assert(cell.value.bounded_finding.waiver_status === 'partial_time_limit_waiver', 'target waiver status differs');
        equal(cell.value.bounded_finding.approved_areas, EVIDENCE.approvedAreas, 'target approved areas differ');
        equal(cell.value.bounded_finding.denied_areas, EVIDENCE.deniedAreas, 'target denied areas differ');
        assert(cell.value.bounded_finding.governing_period.implementation_date === EVIDENCE.implementationDate, 'target implementation date differs');
        assert(cell.value.bounded_finding.governing_period.expiration_date === EVIDENCE.expirationDate, 'target expiration date differs');
        assert(cell.value.source.substantive_weight_count === 1, 'target source weight differs');
        assert(cell.value.page_complete_review.all_pages_reviewed === true && cell.value.page_complete_review.observations.length === 10, 'target page review differs');
        for (const prohibited of PROHIBITED) assert(cell.value.prohibited_inferences.includes(prohibited), `prohibited inference missing: ${prohibited}`);
      } else {
        equal(stable(cell), stable(prior), `${key} non-target cell changed`);
      }
    }
  }
  equal(changedCells, [`${TARGET.unitId}|${TARGET.fieldId}`], 'changed-cell denominator differs');
  const northDakota = findRow(matrix, TARGET.unitId);
  const targetCell = findCell(northDakota, TARGET.fieldId);
  const rowStateCell = findCell(northDakota, TARGET.rowFieldId);
  assert(canonicalSha(targetCell) === decision.after_cell_sha256, 'decision after-cell hash differs');
  assert(canonicalSha(targetCell) === transition.after_cell_sha256, 'ledger after-cell hash differs');
  assert(canonicalSha(rowStateCell) === TARGET.beforeRowSha256, 'North Dakota row-state cell changed');
  assert(rowStateCell.state === 'still_open' && rowStateCell.terminal === false, 'North Dakota row state terminalized');
  assert(rowStateCell.typed_gap === 'row_remains_open_because_2_required_cells_are_unresolved', 'North Dakota row-state cell was rewritten');

  equal(
    census.counts,
    {
      states: 50,
      materialized_cells: 450,
      terminal_cells: 228,
      still_open_cells: 222,
      substantive_fields_total: 300,
      substantive_fields_terminal: 118,
      substantive_fields_still_open: 182,
      row_terminal_state_cells_still_open: 40,
      terminal_units: 10,
      class_closed: false,
    },
    'census counts differ',
  );
  const northDakotaCensus = census.state_rows.find((item) => item.unit_id === TARGET.unitId);
  equal([northDakotaCensus.row_state, northDakotaCensus.terminal_fields, northDakotaCensus.open_fields], ['still_open', 8, 1], 'census North Dakota row differs');
  equal(northDakotaCensus.still_open_field_ids, [TARGET.rowFieldId], 'census North Dakota open-field denominator differs');
  verifyBoundary(census.authority_boundary, 'census authority');

  equal(
    summary.transition,
    {
      field_state_before: 'still_open',
      field_state_after: 'evidence_complete',
      row_state_before: 'still_open',
      row_state_after: 'still_open',
      row_state_cell_preserved: true,
      terminal_cells_before: 227,
      terminal_cells_after: 228,
      still_open_cells_before: 223,
      still_open_cells_after: 222,
      terminal_substantive_cells_before: 117,
      terminal_substantive_cells_after: 118,
      still_open_substantive_cells_before: 183,
      still_open_substantive_cells_after: 182,
      terminal_units_before: 10,
      terminal_units_after: 10,
      north_dakota_terminal_fields_before: 7,
      north_dakota_terminal_fields_after: 8,
      north_dakota_open_fields_before: 2,
      north_dakota_open_fields_after: 1,
      class_closed_before: false,
      class_closed_after: false,
    },
    'summary transition differs',
  );
  assert(summary.current_result.field_terminalized === true && summary.current_result.north_dakota_row_terminalized === false, 'summary terminalization boundary differs');
  assert(summary.current_result.north_dakota_row_state === 'still_open', 'summary row state differs');
  assert(summary.current_result.class_closed === false && summary.current_result.remaining_open_substantive_cells === 182, 'summary class denominator differs');

  equal(
    index.counts,
    {
      source_documents: 1,
      pdf_pages_reviewed: 5,
      decisions: 1,
      field_terminalizations: 1,
      row_terminalizations: 0,
      matrix_updates: 1,
      terminal_cells_after: 228,
      still_open_cells_after: 222,
      still_open_substantive_fields_after: 182,
      terminal_units: 10,
      result_spawned_requests: 0,
    },
    'index counts differ',
  );
  assert(index.current_result.north_dakota_fixed_public_record_obligation_complete === false, 'index closes North Dakota row');
  assert(index.current_result.north_dakota_row_state === 'still_open', 'index row state differs');

  const workflow = fs.readFileSync(path.join(ROOT, `.github/workflows/${SLUG}.yml`), 'utf8');
  assert(workflow.includes('permissions:\n  contents: read'), 'workflow permissions differ');
  assert(!workflow.includes('contents: write') && !workflow.includes('pull-requests: write'), 'write permission entered workflow');
  assert(workflow.includes('github.event.pull_request.head.sha || github.sha'), 'workflow does not bind the exact product head');
  assert(workflow.includes("'row_terminalizations':0") || workflow.includes('row_terminalizations: 0'), 'workflow receipt row boundary differs');
  assert(workflow.includes("'matrix_updates':1") || workflow.includes('matrix_updates: 1'), 'workflow receipt matrix boundary differs');
  assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema' && schema.oneOf.length === 8, 'schema variant denominator differs');
  verifyManifest(manifest);

  return {
    changed_cells: changedCells,
    terminal_cells: matrix.counts.terminal_cells,
    open_substantive: matrix.counts.still_open_substantive_cells,
    terminal_units: matrix.counts.terminal_units,
    combined_sha256: manifest.combined_sha256,
    source_sha256: EVIDENCE.bodySha256,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const result = validateProduct();
  console.log(`rd04_nd_fy2025_waiver_approval_terminalization=valid changed_cells=${result.changed_cells.length} terminal_cells=${result.terminal_cells} open_substantive=${result.open_substantive} terminal_units=${result.terminal_units} source_sha256=${result.source_sha256} combined_sha256=${result.combined_sha256}`);
}
