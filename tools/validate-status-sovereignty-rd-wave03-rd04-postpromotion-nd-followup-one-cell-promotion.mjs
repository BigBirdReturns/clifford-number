import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  ROOT,
  SLUG,
  OUTPUT_DIR,
  SCHEMA_PATH,
  OUTPUT_NAMES,
  PERMANENT_PATHS,
  MANIFEST_PATH,
  CANONICAL_PARENT,
  CANONICAL_PARENT_TREE,
  VALIDATION_PARENT,
  VALIDATION_PARENT_TREE,
  INTERVENING_MAIN_PATHS,
  INTERVENING_MAIN_PATHS_SHA256,
  TARGET,
  HELD,
  INPUTS,
  VALIDATION,
  ROUTE_TARGET_FIELDS,
  buildProduct,
  sha256Bytes,
  gitBlob,
  stable,
  canonicalSha,
} from './build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs';

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
function authority(boundary, label, matrixUpdates = 1, fieldTerminalizations = 1) {
  equal(boundary.matrix_updates ?? matrixUpdates, matrixUpdates, `${label}.matrix_updates`);
  equal(boundary.field_terminalizations ?? fieldTerminalizations, fieldTerminalizations, `${label}.field_terminalizations`);
  equal(boundary.row_state_mutations ?? 0, 0, `${label}.row_state_mutations`);
  equal(boundary.row_terminalizations ?? 0, 0, `${label}.row_terminalizations`);
  equal(boundary.class_closed, false, `${label}.class_closed`);
  equal(boundary.cumulative_ledger_effect, 'none', `${label}.cumulative_ledger_effect`);
  equal(boundary.outside_human_dependency, false, `${label}.outside_human_dependency`);
  for (const key of ['publication_effect','adoption_effect','graph_effect']) equal(boundary[key], 'none', `${label}.${key}`);
}
function noWidening(object, label) {
  for (const key of ['reviewed_disposition_effect','publication_effect','adoption_effect','graph_effect','prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect']) {
    equal(object[key], 'none', `${label}.${key}`);
  }
  equal(object.outside_human_dependency, false, `${label}.outside_human_dependency`);
}

export function loadProduct(root = ROOT) {
  const dataRoot = path.join(root, OUTPUT_DIR);
  return {
    custody:readJson(dataRoot, 'promotion-input-custody.json'),
    decisions:readJson(dataRoot, 'promotion-decisions.json'),
    ledger:readJson(dataRoot, 'cell-promotion-ledger.json'),
    matrix:readJson(dataRoot, 'promoted-partial-field-matrix.json'),
    census:readJson(dataRoot, 'remaining-open-field-census.json'),
    summary:readJson(dataRoot, 'promotion-summary.json'),
    index:readJson(dataRoot, 'index.json'),
    manifest:readJson(dataRoot, 'product-manifest.json'),
  };
}

export function validateProduct(product, options = {}) {
  const root = options.root ?? ROOT;
  const verifyFiles = options.verifyFiles ?? false;
  const compareDerived = options.compareDerived ?? false;
  const predecessor = readJson(root, INPUTS.matrix.path);
  const protocol = readJson(root, INPUTS.protocol.path);
  const fields = readJson(root, INPUTS.fieldAdjudications.path);
  const capture = readJson(root, INPUTS.captureCustody.path);
  const sources = readJson(root, INPUTS.sourceAdjudications.path);
  const html = readJson(root, INPUTS.htmlReviewReceipts.path);
  const duplication = readJson(root, INPUTS.transportDuplicationLedger.path);
  const adjudicationManifest = readJson(root, INPUTS.adjudicationManifest.path);
  const {custody, decisions, ledger, matrix, census, summary, index, manifest} = product;

  equal(custody.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-input-custody@1', 'custody schema');
  equal(custody.canonical_parent, CANONICAL_PARENT, 'canonical parent');
  equal(custody.canonical_parent_tree, CANONICAL_PARENT_TREE, 'canonical parent tree');
  equal(custody.main_reconciliation, {comparison_base:VALIDATION_PARENT,comparison_base_tree:VALIDATION_PARENT_TREE,observed_main:CANONICAL_PARENT,observed_main_tree:CANONICAL_PARENT_TREE,commits_ahead:2,changed_paths:[...INTERVENING_MAIN_PATHS],changed_paths_sha256:INTERVENING_MAIN_PATHS_SHA256,overlapping_input_paths:[],overlapping_permanent_paths:[],overlap_status:'nonoverlapping_current_main_rebind'}, 'main reconciliation');
  for (const [key,spec] of Object.entries(INPUTS)) equal(custody.inputs[key], {path:spec.path,bytes:spec.bytes,sha256:spec.sha256,git_blob_sha:spec.gitBlob}, `input custody ${key}`);
  equal(custody.validation_receipt, {
    validation_parent:VALIDATION_PARENT,validation_parent_tree:VALIDATION_PARENT_TREE,
    pull_request:VALIDATION.pullRequest,workflow_run:VALIDATION.workflowRun,head:VALIDATION.head,
    artifact_id:VALIDATION.artifactId,artifact_bytes:VALIDATION.artifactBytes,artifact_zip_sha256:VALIDATION.artifactZipSha256,
    receipt_sha256:VALIDATION.receiptSha256,ledger_sha256:VALIDATION.ledgerSha256,input_inventory_sha256:VALIDATION.inputInventorySha256,post_release_status_sha256:VALIDATION.postReleaseStatusSha256,
    state:VALIDATION.state,candidate_count:1,admissible_candidate_count:1,held_cell_count:1,route_target_checks:1,locator_target_checks:3,promotion_authority_created:false,separate_promotion_product_required:true,
  }, 'validation receipt custody');
  equal(custody.target_cell, {unit_id:TARGET.unitId,field_id:TARGET.fieldId,state:'still_open',terminal:false,canonical_sha256:TARGET.beforeCellSha256}, 'target cell custody');
  equal(custody.excluded_held_cell, {unit_id:HELD.unitId,field_id:HELD.fieldId,state:'still_open',terminal:false,canonical_sha256:HELD.cellSha256,disposition:HELD.disposition,excluded_from_candidate_denominator:true}, 'held cell custody');
  for (const key of ['source_requests','route_executions','new_source_admissions','result_spawned_requests','external_contacts','external_reviews']) equal(custody[key], 0, `custody ${key}`);
  equal(custody.outside_human_dependency, false, 'custody outside human');
  for (const key of ['publication_effect','adoption_effect','graph_effect']) equal(custody[key], 'none', `custody ${key}`);

  equal(decisions.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-decisions@1', 'decision schema');
  equal(decisions.candidate_count, 1, 'decision candidates');
  equal(decisions.admissible_candidate_count, 1, 'decision admissible candidates');
  equal(decisions.scope_held_candidate_count, 0, 'decision scope-held candidates');
  equal(decisions.decisions.length, 1, 'promotion decision denominator');
  equal(decisions.excluded_held_decisions.length, 1, 'held exclusion denominator');
  equal(decisions.excluded_held_decisions[0], {decision_id:HELD.decisionId,unit_id:HELD.unitId,field_id:HELD.fieldId,disposition:HELD.disposition,source_route_ids:[HELD.routeId],current_cell_state:'still_open',current_cell_terminal:false,current_cell_canonical_sha256:HELD.cellSha256,excluded_from_candidate_denominator:true}, 'held exclusion identity');
  authority(decisions.authority_boundary, 'decision authority');
  const promotion = decisions.decisions[0];
  equal([promotion.promotion_candidate_id,promotion.candidate_decision_id,promotion.unit_id,promotion.postal_code,promotion.state_name,promotion.candidate_field], [TARGET.candidateId,TARGET.decisionId,TARGET.unitId,TARGET.postalCode,TARGET.stateName,TARGET.fieldId], 'promotion identity');
  equal(promotion.source_route_ids, [TARGET.routeId], 'promotion route denominator');
  equal(promotion.source_body_sha256s, ['b67637ce96affea164d2a467bae37327eeb9141e15d824ab092e017364595d8d'], 'promotion source body');
  equal(promotion.authoritative_route_receipt_sha256s, ['2c570cc23251bd6ee81d5670313a8bf851f48933817da35d5183fd0e94dc0bc3'], 'promotion route receipt');
  equal(promotion.evidence_locators.length, 3, 'promotion locator denominator');
  for (const routeId of promotion.source_route_ids) truth(ROUTE_TARGET_FIELDS[routeId]?.includes(TARGET.fieldId), 'promotion source target');
  for (const locator of promotion.evidence_locators) truth(locator.route_id === TARGET.routeId && ROUTE_TARGET_FIELDS[locator.route_id]?.includes(TARGET.fieldId), 'promotion locator target');
  equal(promotion.field_cell_state_before, 'still_open', 'promotion before state');
  equal(promotion.field_cell_state_after, 'evidence_complete', 'promotion after state');
  equal(promotion.promotion_outcome, 'promote_bounded_finding', 'promotion outcome');
  equal(promotion.field_terminalization_effect, 'observed', 'promotion terminalization effect');
  equal(promotion.route_target_source_checks, 1, 'promotion source checks');
  equal(promotion.route_target_locator_checks, 3, 'promotion locator checks');
  noWidening(promotion, 'promotion');

  equal(ledger.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-cell-promotion-ledger@1', 'ledger schema');
  equal(ledger.counts, {candidate_findings:1,unique_candidate_cells:1,promoted_candidate_findings:1,scope_held_candidate_findings:0,excluded_held_decisions:1,promoted_cells:1,affected_states:1,terminal_cells_before:226,terminal_cells_after:227,still_open_cells_before:224,still_open_cells_after:223,open_substantive_cells_before:184,open_substantive_cells_after:183,terminal_units_after:10,route_target_source_checks:1,route_target_locator_checks:3}, 'ledger counts');
  equal(ledger.field_promotion_counts, {operative_state_implementation_authority_and_version:1,implementation_effective_date_or_typed_gap:0,abawd_or_work_requirement_waiver_state_and_governing_period:0,discretionary_exemption_authority_and_reported_state_practice:0,fitness_for_work_or_eligibility_screening_rule:0,verification_evidence_and_staff_discretion_surface:0}, 'field promotion counts');
  equal(ledger.cells.length, 1, 'ledger cell denominator');
  authority(ledger.authority_boundary, 'ledger authority');
  const ledgerCell = ledger.cells[0];
  equal([ledgerCell.unit_id,ledgerCell.field_id,ledgerCell.state_before,ledgerCell.state_after,ledgerCell.terminal_before,ledgerCell.terminal_after], [TARGET.unitId,TARGET.fieldId,'still_open','evidence_complete',false,true], 'ledger cell transition');
  equal(ledgerCell.before_cell_sha256, TARGET.beforeCellSha256, 'ledger before cell hash');
  equal(ledgerCell.evidence_route_ids, [TARGET.routeId], 'ledger evidence route');
  equal(ledgerCell.source_body_sha256s, promotion.source_body_sha256s, 'ledger source bodies');
  equal(ledgerCell.authoritative_route_receipt_sha256s, promotion.authoritative_route_receipt_sha256s, 'ledger route receipts');
  equal(ledgerCell.authority_effect, 'one_bounded_matrix_cell_terminalized', 'ledger authority effect');
  noWidening(ledgerCell, 'ledger cell');

  equal(matrix.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promoted-partial-field-matrix@1', 'matrix schema');
  equal(matrix.counts.materialized_cells, 450, 'matrix cells');
  equal(matrix.counts.terminal_cells, 227, 'matrix terminal cells');
  equal(matrix.counts.still_open_cells, 223, 'matrix open cells');
  equal(matrix.counts.terminal_substantive_cells, 117, 'matrix terminal substantive');
  equal(matrix.counts.still_open_substantive_cells, 183, 'matrix open substantive');
  equal(matrix.counts.terminal_units, 10, 'matrix terminal units');
  equal(matrix.counts.row_terminal_state_cells_terminal, 10, 'matrix terminal rows');
  equal(matrix.counts.row_terminal_state_cells_open, 40, 'matrix open rows');
  equal(matrix.counts.postpromotion_candidate_cells, 5, 'matrix cumulative postpromotion candidates');
  equal(matrix.counts.newly_terminalized_postpromotion_cells, 5, 'matrix cumulative postpromotion terminalizations');
  equal(matrix.counts.postpromotion_nd_followup_candidate_cells, 1, 'matrix ND followup candidates');
  equal(matrix.counts.newly_terminalized_postpromotion_nd_followup_cells, 1, 'matrix ND followup terminalizations');
  equal(matrix.current_result.field_matrix_terminal, false, 'matrix terminality');
  equal(matrix.current_result.class_closed, false, 'matrix class closure');
  const metadata = matrix.postpromotion_nd_followup_one_cell_promotion_product;
  equal(metadata.predecessor_matrix_git_blob, INPUTS.matrix.gitBlob, 'matrix predecessor blob');
  equal(metadata.validation_workflow_run, VALIDATION.workflowRun, 'matrix validation run');
  equal(metadata.validation_artifact_id, VALIDATION.artifactId, 'matrix validation artifact');
  equal(metadata.validation_receipt_sha256, VALIDATION.receiptSha256, 'matrix validation receipt');
  equal(metadata.validation_ledger_sha256, VALIDATION.ledgerSha256, 'matrix validation ledger');
  equal(metadata.canonical_parent, CANONICAL_PARENT, 'matrix canonical parent');
  equal(metadata.canonical_parent_tree, CANONICAL_PARENT_TREE, 'matrix canonical parent tree');
  equal(metadata.validation_parent, VALIDATION_PARENT, 'matrix validation parent');
  equal(metadata.validation_parent_tree, VALIDATION_PARENT_TREE, 'matrix validation parent tree');
  equal(metadata.main_reconciliation_status, 'nonoverlapping_current_main_rebind', 'matrix main reconciliation status');
  equal(metadata.main_reconciliation_changed_paths_sha256, INTERVENING_MAIN_PATHS_SHA256, 'matrix main reconciliation path digest');

  const targetKey = `${TARGET.unitId}|${TARGET.fieldId}`;
  for (const row of matrix.rows) {
    const priorRow = findRow(predecessor, row.unit_id);
    if (row.unit_id === TARGET.unitId) {
      equal([row.terminal_fields,row.open_fields,row.row_state], [7,2,'still_open'], 'North Dakota row counts');
    } else {
      equal([row.terminal_fields,row.open_fields,row.row_state], [priorRow.terminal_fields,priorRow.open_fields,priorRow.row_state], `${row.unit_id} row counts`);
    }
    for (const cell of row.cells) {
      const prior = findCell(priorRow, cell.field_id);
      const key = `${row.unit_id}|${cell.field_id}`;
      if (key === targetKey) {
        equal(prior.state, 'still_open', 'target prior state');
        equal(prior.terminal, false, 'target prior terminal');
        equal(canonicalSha(prior), TARGET.beforeCellSha256, 'target prior hash');
        equal(cell.state, 'evidence_complete', 'target promoted state');
        equal(cell.terminal, true, 'target promoted terminal');
        equal(cell.typed_gap, null, 'target typed gap');
        equal(cell.evidence_source_ids, [TARGET.routeId], 'target evidence route');
        equal(cell.authority_effect, 'bounded_official_state_field_observation_only', 'target authority effect');
        truth(cell.value?.findings?.length === 1, 'target finding denominator');
        const finding = cell.value.findings[0];
        equal(finding.candidate_id, TARGET.candidateId, 'target finding candidate');
        equal(finding.candidate_decision_id, TARGET.decisionId, 'target finding decision');
        equal(finding.source_routes.length, 1, 'target source denominator');
        equal(finding.source_routes[0].substantive_weight_count, 1, 'target source weight');
        equal(finding.source_routes[0].duplicate_transport_observations, 2, 'target duplicate observations');
        equal(finding.source_routes[0].all_visible_text_reviewed, true, 'target HTML review');
        equal(finding.promotion_validation.receipt_sha256, VALIDATION.receiptSha256, 'target validation receipt');
        equal(finding.promotion_validation.held_cell_exclusion, 'pass', 'target hold exclusion');
      } else if (row.unit_id === TARGET.unitId && cell.field_id === 'field_and_row_terminal_state') {
        equal(cell.state, prior.state, 'ND row-state state');
        equal(cell.terminal, prior.terminal, 'ND row-state terminal');
        equal(cell.value, prior.value, 'ND row-state value');
        equal(cell.evidence_source_ids, prior.evidence_source_ids, 'ND row-state evidence');
        equal(cell.authority_effect, prior.authority_effect, 'ND row-state authority');
        equal(cell.typed_gap, 'row_remains_open_because_2_required_cells_are_unresolved', 'ND row-state gap');
      } else {
        equal(stable(cell), stable(prior), `${key} non-target cell changed`);
      }
    }
  }
  const nd = findRow(matrix, TARGET.unitId);
  equal(canonicalSha(findCell(nd, HELD.fieldId)), HELD.cellSha256, 'held cell changed');
  equal(findCell(nd, HELD.fieldId).terminal, false, 'held cell terminalized');
  equal(ledgerCell.after_cell_sha256, canonicalSha(findCell(nd, TARGET.fieldId)), 'ledger after cell hash');

  equal(census.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-remaining-open-field-census@1', 'census schema');
  equal(census.counts, {states:50,materialized_cells:450,terminal_cells:227,still_open_cells:223,substantive_fields_total:300,substantive_fields_terminal:117,substantive_fields_still_open:183,row_terminal_state_cells_still_open:40,terminal_units:10,class_closed:false}, 'census counts');
  authority(census.authority_boundary, 'census authority');
  const ndCensus = census.state_rows.find((row) => row.unit_id === TARGET.unitId);
  equal([ndCensus.terminal_fields,ndCensus.open_fields,ndCensus.row_state], [7,2,'still_open'], 'census ND row');
  equal(ndCensus.still_open_field_ids, [HELD.fieldId,'field_and_row_terminal_state'], 'census ND open fields');

  equal(summary.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-summary@1', 'summary schema');
  equal(summary.input_counts, {bounded_finding_candidates:1,unique_candidate_cells:1,states_with_candidates:1,held_decisions_excluded:1}, 'summary input counts');
  equal(summary.promotion_counts, {candidate_findings_promoted:1,candidate_findings_scope_held:0,unique_cells_terminalized:1,states_with_terminalizations:1}, 'summary promotion counts');
  equal(summary.route_target_checks, {candidate_to_source_routes:1,candidate_to_evidence_locators:3}, 'summary target checks');
  equal(summary.matrix_transition, {terminal_cells_before:226,terminal_cells_after:227,still_open_cells_before:224,still_open_cells_after:223,substantive_fields_still_open_before:184,substantive_fields_still_open_after:183,terminal_units_before:10,terminal_units_after:10,north_dakota_terminal_fields_before:6,north_dakota_terminal_fields_after:7,north_dakota_open_fields_before:3,north_dakota_open_fields_after:2,north_dakota_row_state_before:'still_open',north_dakota_row_state_after:'still_open',class_closed_before:false,class_closed_after:false}, 'summary matrix transition');
  equal(summary.affected_states, ['ND'], 'summary affected states');
  equal(summary.current_result.independently_supported_cells_promoted, 1, 'summary promoted cells');
  equal(summary.current_result.held_north_dakota_cells_remaining, 1, 'summary held cells');
  equal(summary.current_result.class_closed, false, 'summary class closure');
  for (const key of ['publication_effect','adoption_effect','graph_effect','prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect']) equal(summary.current_result[key], 'none', `summary.${key}`);

  equal(index.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-index@1', 'index schema');
  equal(index.counts, {candidate_findings:1,candidate_findings_promoted:1,candidate_findings_scope_held:0,excluded_held_decisions:1,unique_candidate_cells:1,unique_cells_terminalized:1,terminal_cells_before:226,terminal_cells_after:227,still_open_cells_after:223,still_open_substantive_fields_after:183,terminal_units:10,result_spawned_requests:0}, 'index counts');
  equal(index.current_result.class_closed, false, 'index class closure');
  equal(index.next_bounded_operation, summary.next_bounded_operation, 'next operation');

  equal(manifest.schema_version, 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-manifest@1', 'manifest schema');
  equal(manifest.permanent_path_count, 14, 'manifest permanent paths');
  equal(manifest.hashed_file_count, 13, 'manifest hashed files');
  equal(manifest.permanent_paths, PERMANENT_PATHS, 'manifest path denominator');
  equal(manifest.hashed_files.map((row) => row.path), PERMANENT_PATHS.filter((relative) => relative !== MANIFEST_PATH), 'manifest hashed paths');
  authority(manifest.authority_boundary, 'manifest authority');

  equal(protocol.candidate_count, 1, 'canonical protocol candidates');
  equal(fields.summary.held_open_fields, 1, 'canonical held fields');
  equal(sources.summary.narrow_source_admissions, 2, 'canonical source admissions');
  equal(capture.transport_ledger.route_count, 2, 'canonical route count');
  equal(html.summary.all_visible_text_reviewed, true, 'canonical HTML review completion');
  equal(duplication.summary.body_changes, 0, 'canonical duplication body changes');
  equal(adjudicationManifest.authority_boundary.matrix_updates, 0, 'canonical adjudication matrix authority');

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
    const schema = readJson(root, SCHEMA_PATH);
    equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', 'schema dialect');
    equal(schema.oneOf.length, 8, 'schema object denominator');
    truth(schema.oneOf.every((variant) => variant.additionalProperties === false), 'schema top-level closure');
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
    const derived = {custody:built.custody,decisions:built.decisionObject,ledger:built.ledger,matrix:built.matrix,census:built.census,summary:built.summary,index:built.index,manifest:built.manifest};
    equal(stable(before), stable(derived), 'deterministic derived product differs');
  }

  return {candidate_count:1,promoted_cells:1,held_cells:1,source_target_checks:1,locator_target_checks:3,terminal_cells:227,still_open_substantive_cells:183,terminal_units:10,north_dakota_open_fields:2,class_closed:false};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(validateProduct(loadProduct(), {root:ROOT,verifyFiles:true,compareDerived:true})));
}
