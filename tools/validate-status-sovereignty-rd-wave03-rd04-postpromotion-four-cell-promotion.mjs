import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import {
  ROOT,
  OUTPUT_DIR,
  OUTPUT_NAMES,
  PERMANENT_PATHS,
  MANIFEST_PATH,
  CANONICAL_PARENT,
  CANONICAL_PARENT_TREE,
  INPUTS,
  VALIDATION,
  ROUTE_TARGET_FIELDS,
  buildProduct,
  sha256Bytes,
  gitBlob,
  stable,
  canonicalSha,
} from './build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs';

function fail(message) { throw new Error(message); }
function truth(value, label) { if (!value) fail(label); }
function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}
function readJson(root, relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function findRow(matrix, unitId) {
  const row = matrix.rows.find((candidate) => candidate.unit_id === unitId);
  truth(row, `missing row ${unitId}`);
  return row;
}
function findCell(row, fieldId) {
  const cell = row.cells.find((candidate) => candidate.field_id === fieldId);
  truth(cell, `missing cell ${row.unit_id}:${fieldId}`);
  return cell;
}
function authority(boundary, label, matrixUpdates = 0, fieldTerminalizations = 0) {
  equal(boundary.matrix_updates ?? matrixUpdates, matrixUpdates, `${label}.matrix_updates`);
  equal(boundary.field_terminalizations ?? fieldTerminalizations, fieldTerminalizations, `${label}.field_terminalizations`);
  equal(boundary.row_state_mutations ?? 0, 0, `${label}.row_state_mutations`);
  equal(boundary.row_terminalizations ?? 0, 0, `${label}.row_terminalizations`);
  equal(boundary.class_closed, false, `${label}.class_closed`);
  equal(boundary.cumulative_ledger_effect, 'none', `${label}.cumulative_ledger_effect`);
  equal(boundary.outside_human_dependency, false, `${label}.outside_human_dependency`);
  for (const key of ['publication_effect','adoption_effect','graph_effect']) equal(boundary[key], 'none', `${label}.${key}`);
}

export function loadProduct(root = ROOT) {
  const dataRoot = path.join(root, OUTPUT_DIR);
  return {
    custody: readJson(dataRoot, 'promotion-input-custody.json'),
    decisions: readJson(dataRoot, 'promotion-decisions.json'),
    ledger: readJson(dataRoot, 'cell-promotion-ledger.json'),
    matrix: readJson(dataRoot, 'promoted-partial-field-matrix.json'),
    census: readJson(dataRoot, 'remaining-open-field-census.json'),
    summary: readJson(dataRoot, 'promotion-summary.json'),
    index: readJson(dataRoot, 'index.json'),
    manifest: readJson(dataRoot, 'product-manifest.json'),
  };
}

export function validateProduct(product, options = {}) {
  const root = options.root ?? ROOT;
  const verifyFiles = options.verifyFiles ?? false;
  const compareDerived = options.compareDerived ?? false;
  const predecessor = readJson(root, INPUTS.matrix.path);
  const protocol = readJson(root, INPUTS.protocol.path);
  const fieldAdjudications = readJson(root, INPUTS.fieldAdjudications.path);
  const sourceAdjudications = readJson(root, INPUTS.sourceAdjudications.path);
  const captureCustody = readJson(root, INPUTS.captureCustody.path);
  const pdfReviewReceipts = readJson(root, INPUTS.pdfReviewReceipts.path);
  const { custody, decisions, ledger, matrix, census, summary, index, manifest } = product;

  equal(custody.canonical_parent, CANONICAL_PARENT, 'canonical parent');
  equal(custody.canonical_parent_tree, CANONICAL_PARENT_TREE, 'canonical parent tree');
  equal(custody.main_reconciliation.overlap_status, 'exact_current_main', 'main reconciliation');
  equal(custody.validation_receipt.pull_request, VALIDATION.pullRequest, 'validation PR');
  equal(custody.validation_receipt.workflow_run, VALIDATION.workflowRun, 'validation run');
  equal(custody.validation_receipt.artifact_id, VALIDATION.artifactId, 'validation artifact');
  equal(custody.validation_receipt.artifact_zip_sha256, VALIDATION.artifactZipSha256, 'validation artifact digest');
  equal(custody.validation_receipt.receipt_sha256, VALIDATION.receiptSha256, 'validation receipt digest');
  equal(custody.validation_receipt.candidate_count, 4, 'validated candidates');
  equal(custody.validation_receipt.admissible_candidate_count, 4, 'admissible candidates');
  equal(custody.validation_receipt.scope_held_candidate_count, 0, 'scope-held candidates');
  equal(custody.validation_receipt.held_cell_count, 2, 'held cells');
  equal(custody.validation_receipt.route_target_source_checks, 6, 'validation source checks');
  equal(custody.validation_receipt.route_target_locator_checks, 8, 'validation locator checks');
  equal(custody.validation_receipt.promotion_authority_created, false, 'validation authority');
  for (const [key, spec] of Object.entries(INPUTS)) {
    equal(custody.inputs[key], {path:spec.path,bytes:spec.bytes,sha256:spec.sha256,git_blob_sha:spec.gitBlob}, `input custody ${key}`);
  }
  equal(custody.empirical_requests, 0, 'custody empirical requests');
  equal(custody.result_spawned_requests, 0, 'custody spawned requests');
  equal(custody.outside_human_dependency, false, 'custody outside human');
  for (const key of ['publication_effect','adoption_effect','graph_effect']) equal(custody[key], 'none', `custody ${key}`);

  equal(decisions.candidate_count, 4, 'decision candidates');
  equal(decisions.admissible_candidate_count, 4, 'decision admissible candidates');
  equal(decisions.scope_held_candidate_count, 0, 'decision scope-held candidates');
  equal(decisions.decisions.length, 4, 'promotion decisions');
  equal(decisions.excluded_held_decisions.length, 2, 'excluded held decisions');
  const excluded = Object.fromEntries(decisions.excluded_held_decisions.map((row) => [row.decision_id, row.disposition]));
  equal(excluded, {
    'RD04-PPN-ND-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION':'no_relevant_support_hold_open',
    'RD04-PPN-ND-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD':'temporal_or_scope_ambiguity_hold_open',
  }, 'excluded held identities');
  authority(decisions.authority_boundary, 'decision authority', 4, 4);

  const expectedCells = [
    ['US-STATE-MT','operative_state_implementation_authority_and_version'],
    ['US-STATE-MT','implementation_effective_date_or_typed_gap'],
    ['US-STATE-MT','abawd_or_work_requirement_waiver_state_and_governing_period'],
    ['US-STATE-ND','implementation_effective_date_or_typed_gap'],
  ];
  equal(decisions.decisions.map((row) => [row.unit_id,row.candidate_field]), expectedCells, 'decision cell identities');
  let sourceChecks = 0;
  let locatorChecks = 0;
  for (const decision of decisions.decisions) {
    equal(decision.promotion_outcome, 'promote_bounded_finding', `${decision.promotion_candidate_id} outcome`);
    equal(decision.field_cell_state_before, 'still_open', `${decision.promotion_candidate_id} before`);
    equal(decision.field_cell_state_after, 'evidence_complete', `${decision.promotion_candidate_id} after`);
    equal(decision.field_terminalization_effect, 'observed', `${decision.promotion_candidate_id} terminalization`);
    for (const routeId of decision.source_route_ids) {
      sourceChecks += 1;
      truth(ROUTE_TARGET_FIELDS[routeId]?.includes(decision.candidate_field), `${decision.promotion_candidate_id} source route target`);
    }
    for (const locator of decision.evidence_locators) {
      locatorChecks += 1;
      truth(ROUTE_TARGET_FIELDS[locator.route_id]?.includes(decision.candidate_field), `${decision.promotion_candidate_id} locator target`);
    }
    equal(decision.route_target_source_checks, decision.source_route_ids.length, `${decision.promotion_candidate_id} source-check count`);
    equal(decision.route_target_locator_checks, decision.evidence_locators.length, `${decision.promotion_candidate_id} locator-check count`);
    for (const key of ['reviewed_disposition_effect','publication_effect','adoption_effect','graph_effect','prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect']) equal(decision[key], 'none', `${decision.promotion_candidate_id}.${key}`);
    equal(decision.outside_human_dependency, false, `${decision.promotion_candidate_id}.outside_human`);
  }
  equal(sourceChecks, 6, 'source target checks');
  equal(locatorChecks, 8, 'locator target checks');

  equal(ledger.counts.candidate_findings, 4, 'ledger candidates');
  equal(ledger.counts.promoted_cells, 4, 'ledger promoted cells');
  equal(ledger.counts.excluded_held_decisions, 2, 'ledger held exclusions');
  equal(ledger.counts.terminal_cells_before, 222, 'ledger terminal before');
  equal(ledger.counts.terminal_cells_after, 226, 'ledger terminal after');
  equal(ledger.counts.still_open_cells_before, 228, 'ledger open before');
  equal(ledger.counts.still_open_cells_after, 224, 'ledger open after');
  equal(ledger.counts.open_substantive_cells_before, 188, 'ledger substantive before');
  equal(ledger.counts.open_substantive_cells_after, 184, 'ledger substantive after');
  equal(ledger.counts.terminal_units_after, 10, 'ledger terminal units');
  equal(ledger.counts.route_target_source_checks, 6, 'ledger source checks');
  equal(ledger.counts.route_target_locator_checks, 8, 'ledger locator checks');
  equal(ledger.field_promotion_counts, {
    operative_state_implementation_authority_and_version:1,
    implementation_effective_date_or_typed_gap:2,
    abawd_or_work_requirement_waiver_state_and_governing_period:1,
    discretionary_exemption_authority_and_reported_state_practice:0,
    fitness_for_work_or_eligibility_screening_rule:0,
    verification_evidence_and_staff_discretion_surface:0,
  }, 'field promotion counts');
  equal(ledger.cells.length, 4, 'ledger cell denominator');
  authority(ledger.authority_boundary, 'ledger authority', 0, 0);

  equal(matrix.counts.materialized_cells, 450, 'matrix cells');
  equal(matrix.counts.terminal_cells, 226, 'matrix terminal cells');
  equal(matrix.counts.still_open_cells, 224, 'matrix open cells');
  equal(matrix.counts.terminal_substantive_cells, 116, 'matrix terminal substantive');
  equal(matrix.counts.still_open_substantive_cells, 184, 'matrix open substantive');
  equal(matrix.counts.terminal_units, 10, 'matrix terminal units');
  equal(matrix.counts.row_terminal_state_cells_terminal, 10, 'matrix terminal rows');
  equal(matrix.counts.row_terminal_state_cells_open, 40, 'matrix open rows');
  equal(matrix.counts.postpromotion_candidate_cells, 4, 'matrix candidate cells');
  equal(matrix.counts.newly_terminalized_postpromotion_cells, 4, 'matrix newly terminalized');
  equal(matrix.current_result.class_closed, false, 'matrix class closure');
  equal(matrix.current_result.field_matrix_terminal, false, 'matrix terminality');
  equal(matrix.postpromotion_four_cell_promotion_product.validation_workflow_run, VALIDATION.workflowRun, 'matrix validation run');
  equal(matrix.postpromotion_four_cell_promotion_product.validation_receipt_sha256, VALIDATION.receiptSha256, 'matrix validation receipt');

  const targetSet = new Set(expectedCells.map(([unit,field]) => `${unit}|${field}`));
  for (const row of matrix.rows) {
    const predecessorRow = findRow(predecessor, row.unit_id);
    for (const cell of row.cells) {
      const prior = findCell(predecessorRow, cell.field_id);
      const key = `${row.unit_id}|${cell.field_id}`;
      if (targetSet.has(key)) {
        equal(prior.state, 'still_open', `${key} prior state`);
        equal(prior.terminal, false, `${key} prior terminal`);
        equal(cell.state, 'evidence_complete', `${key} promoted state`);
        equal(cell.terminal, true, `${key} promoted terminal`);
        equal(cell.typed_gap, null, `${key} typed gap`);
        equal(cell.authority_effect, 'bounded_official_state_field_observation_only', `${key} authority effect`);
        truth(cell.value?.findings?.length === 1, `${key} finding denominator`);
      } else if (cell.field_id === 'field_and_row_terminal_state' && ['US-STATE-MT','US-STATE-ND'].includes(row.unit_id)) {
        equal(cell.terminal, false, `${key} row state terminal`);
        equal(cell.state, 'still_open', `${key} row state`);
      } else {
        equal(stable(cell), stable(prior), `${key} non-target cell changed`);
      }
    }
  }
  const mt = findRow(matrix, 'US-STATE-MT');
  const nd = findRow(matrix, 'US-STATE-ND');
  equal([mt.terminal_fields,mt.open_fields,mt.row_state],[8,1,'still_open'],'MT row counts');
  equal([nd.terminal_fields,nd.open_fields,nd.row_state],[6,3,'still_open'],'ND row counts');
  equal(findCell(mt,'field_and_row_terminal_state').typed_gap,'row_remains_open_because_1_required_cells_are_unresolved','MT row gap');
  equal(findCell(nd,'field_and_row_terminal_state').typed_gap,'row_remains_open_because_3_required_cells_are_unresolved','ND row gap');
  equal(findCell(nd,'operative_state_implementation_authority_and_version').terminal,false,'ND authority hold');
  equal(findCell(nd,'abawd_or_work_requirement_waiver_state_and_governing_period').terminal,false,'ND waiver hold');

  equal(census.counts.terminal_cells, 226, 'census terminal');
  equal(census.counts.still_open_cells, 224, 'census open');
  equal(census.counts.substantive_fields_still_open, 184, 'census substantive open');
  equal(census.counts.terminal_units, 10, 'census terminal units');
  authority(census.authority_boundary, 'census authority', 0, 0);

  equal(summary.input_counts, {bounded_finding_candidates:4,unique_candidate_cells:4,states_with_candidates:2,held_decisions_excluded:2}, 'summary input counts');
  equal(summary.promotion_counts, {candidate_findings_promoted:4,candidate_findings_scope_held:0,unique_cells_terminalized:4,states_with_terminalizations:2}, 'summary promotion counts');
  equal(summary.route_target_checks, {candidate_to_source_routes:6,candidate_to_evidence_locators:8}, 'summary route checks');
  equal(summary.matrix_transition.terminal_cells_after, 226, 'summary terminal after');
  equal(summary.matrix_transition.substantive_fields_still_open_after, 184, 'summary open substantive after');
  equal(summary.current_result.class_closed, false, 'summary class closure');
  equal(summary.current_result.held_north_dakota_cells_remaining, 2, 'summary held cells');
  for (const key of ['publication_effect','adoption_effect','graph_effect','prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect']) equal(summary.current_result[key], 'none', `summary.${key}`);

  equal(index.counts.candidate_findings_promoted, 4, 'index promotions');
  equal(index.counts.excluded_held_decisions, 2, 'index held exclusions');
  equal(index.counts.terminal_cells_after, 226, 'index terminal after');
  equal(index.counts.still_open_substantive_fields_after, 184, 'index open substantive after');
  equal(index.current_result.class_closed, false, 'index class closure');
  equal(index.next_bounded_operation, summary.next_bounded_operation, 'next operation');

  equal(manifest.permanent_path_count, 14, 'manifest permanent paths');
  equal(manifest.hashed_file_count, 13, 'manifest hashed files');
  equal(manifest.permanent_paths, PERMANENT_PATHS, 'manifest path denominator');
  equal(manifest.hashed_files.map((row) => row.path), PERMANENT_PATHS.filter((relative) => relative !== MANIFEST_PATH), 'manifest hashed paths');
  authority(manifest.authority_boundary, 'manifest authority', 4, 4);

  if (verifyFiles) {
    const combinedRows = [];
    for (const row of manifest.hashed_files) {
      const bytes = fs.readFileSync(path.join(root, row.path));
      equal(bytes.length, row.bytes, `${row.path} bytes`);
      equal(sha256Bytes(bytes), row.sha256, `${row.path} sha256`);
      equal(gitBlob(bytes), row.git_blob, `${row.path} git blob`);
      combinedRows.push(`${row.path}\0${row.bytes}\0${row.sha256}\0${row.git_blob}\n`);
    }
    equal(sha256Bytes(Buffer.from(combinedRows.join(''))), manifest.combined_sha256, 'manifest combined identity');
    for (const name of OUTPUT_NAMES) {
      const raw = fs.readFileSync(path.join(root, OUTPUT_DIR, name), 'utf8');
      const parsed = JSON.parse(raw);
      equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `${name} canonical JSON`);
    }
    for (const spec of Object.values(INPUTS)) {
      const bytes = fs.readFileSync(path.join(root, spec.path));
      equal(bytes.length, spec.bytes, `${spec.path} input bytes`);
      equal(sha256Bytes(bytes), spec.sha256, `${spec.path} input sha256`);
      equal(gitBlob(bytes), spec.gitBlob, `${spec.path} input git blob`);
    }
  }

  if (compareDerived) {
    const before = structuredClone(product);
    const built = buildProduct();
    const derived = {
      custody: built.custody,
      decisions: built.decisionObject,
      ledger: built.ledger,
      matrix: built.matrix,
      census: built.census,
      summary: built.summary,
      index: built.index,
      manifest: built.manifest,
    };
    equal(stable(before), stable(derived), 'deterministic derived product differs');
  }

  equal(protocol.candidate_count, 4, 'canonical protocol candidates');
  equal(fieldAdjudications.summary.held_open_fields, 2, 'canonical held fields');
  equal(sourceAdjudications.summary.narrow_source_admissions, 4, 'canonical source admissions');
  equal(captureCustody.transport_ledger.unique_route_count, 5, 'canonical route count');
  equal(pdfReviewReceipts.rendering.all_pages_visually_reviewed, true, 'canonical PDF review completion');

  return {candidate_count:4,promoted_cells:4,held_cells:2,source_target_checks:6,locator_target_checks:8,terminal_cells:226,still_open_substantive_cells:184,terminal_units:10,class_closed:false};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(validateProduct(loadProduct(), {root:ROOT,verifyFiles:true,compareDerived:true})));
}
