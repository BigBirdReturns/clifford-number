#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const C = Object.freeze({
  ROOT: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation',
  PREDECESSOR_MATRIX_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion/promoted-partial-field-matrix.json',
  PREDECESSOR_MATRIX_BYTES: 495400,
  PREDECESSOR_MATRIX_SHA: '1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824',
  PREDECESSOR_MATRIX_BLOB: 'c25a1ad8fdfe82f70f1ff71e61da6796be94c737',
  INPUT_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation/input-custody.json',
  INPUT_BYTES: 6188,
  INPUT_SHA: '3233bb5ac506a9c2eb03fb3244673e79a948f695d2a4ae0b70771cf6f99b1efd',
  INPUT_BLOB: '1003c3bcba44554c51163f2f92ba21f28dbf597d',
  DECISION_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation/row-state-decision.json',
  DECISION_BYTES: 5421,
  DECISION_SHA: 'd29ff10a0f9b2d5d3f5eed6ff89f1dfadff173488b2d3b7e18058b841787d668',
  DECISION_BLOB: '0a9e611061779854c510dd1a8c5a1a0d82822ac7',
  CANONICAL_PARENT: '789c800d00a6d4924cb69d2ce33d336ab315972f',
  CANONICAL_PARENT_TREE: 'fef73cc4267070c8cc7fb7c1dc15481477391d62',
  CURRENT_ND_ROW_SHA: '0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e',
  CURRENT_ROW_STATE_SHA: '6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3',
  CURRENT_TARGET_SHA: '8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25',
  PROPOSED_ROW_STATE_SHA: 'f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c',
  RECONCILED_ND_ROW_SHA: 'f75ac04e5c8fc53304e897d918ee80057c580e2b8bbeeca979e9f92312f96f4b',
  PROMOTED_MATRIX_BYTES: 499923,
  PROMOTED_MATRIX_SHA: 'd2ff4b4d711417b2319b1c26486127c4eba1366aa0e11abf1fd489dcd2b2ffe6',
  PROMOTED_MATRIX_BLOB: '66a9a6d7003a39b1dca569895e0bc3513f004ca6',
  UNCHANGED_ROWS_SHA: '93dd5ec59cbde9943931358aecc87b2d2cef918ba1f04a2c40d43574017c1dd4',
  PRIOR_VALIDATION_PR: 1798,
  PRIOR_VALIDATION_RUN: 31357895694,
  PRIOR_VALIDATION_ARTIFACT_ID: 9051293563,
  PRIOR_VALIDATION_ARTIFACT_BYTES: 8908,
  PRIOR_VALIDATION_ARTIFACT_SHA: '90cdfa87640ce7a6ebb9d6d381a4aa97f46f16455fa470bc59fff282e282124d',
  PRIOR_VALIDATION_RECEIPT_SHA: '8f1b31c8b8d8e664c9b25f128d2bc31a85ee08ea7b9c8ea3f4217805f2b54ab7',
  PRIOR_ROW_CANDIDATE_ID: 'RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V3',
  PRIOR_ROW_CANDIDATE_SHA: 'f0c6fe75d1720c1a6cf8b90fd44b96bc96fcb0656fc70808c5439d514d30217c',
});

export const AUTHORITY_KEYS = Object.freeze([
  'source_requests','route_executions','source_admissions','field_terminalizations','matrix_updates',
  'row_state_mutations','row_terminalizations','class_closed','cumulative_ledger_effect',
  'publication_effect','adoption_effect','graph_effect','outside_human_dependency',
]);
export const INPUT_KEYS = Object.freeze([
  'schema_version','wave_id','lane_id','class_id','issue','canonical_parent','canonical_parent_tree',
  'predecessor_matrix','prior_candidate_validation','current_north_dakota','terminal_evidence_cells',
  'projection','authority_boundary',
]);
export const DECISION_KEYS = Object.freeze([
  'schema_version','wave_id','lane_id','class_id','issue','decision_id','candidate_id','decision',
  'unit_id','postal_code','state_name','field_id','field_ordinal','current_row_state','target_row_state',
  'current_row_sha256','reconciled_row_sha256','current_cell_sha256','proposed_cell_sha256',
  'prerequisite_satisfaction','proposed_row_state_cell','prohibited_inferences','transition_effects','authority_boundary',
]);
export const CELL_KEYS = Object.freeze([
  'field_ordinal','field_id','state','terminal','value','evidence_source_ids','typed_gap','authority_effect',
]);
export const CELL_VALUE_KEYS = Object.freeze([
  'terminal_classification','row_scope','completed_evidence_fields','terminal_evidence_field_ids',
  'terminal_evidence_state_counts','predecessor_row_canonical_sha256','completion_rule','class_effect',
  'cumulative_ledger_effect','limitations','prohibited_inferences',
]);
export const PROHIBITED_INFERENCES = Object.freeze([
  'do_not_infer_complete_state_implementation_truth_beyond_terminal_field_custody',
  'do_not_convert_not_publicly_recovered_fields_into_event_or_policy_absence',
  'do_not_infer_uniform_frontline_practice',
  'do_not_infer_person_level_outcome',
  'do_not_infer_national_prevalence',
  'do_not_infer_discrimination_or_racial_order',
  'do_not_infer_coordination_or_common_purpose',
  'do_not_infer_complete_compact',
  'do_not_close_rd04_c02_or_wave03_from_eleven_terminal_rows',
]);
export const TERMINAL_EVIDENCE_HASHES = Object.freeze({
  canonical_state_identity: 'ae343af2d3a7e55ca080c413c82bf3da3ff5b346711595011e0d0c3ccf87e796',
  operative_state_implementation_authority_and_version: 'd64b417c8d9358d3e1594ab5410dd8d647888077a3bab49dfb01a5d89bf7e85a',
  implementation_effective_date_or_typed_gap: 'b30384e97edb52ef9baf36a6c2804f9ea608de9a52eb0b7b0976b1b3973aedda',
  abawd_or_work_requirement_waiver_state_and_governing_period: C.CURRENT_TARGET_SHA,
  discretionary_exemption_authority_and_reported_state_practice: 'ebe9440a96566f126fc844f0ea190b37247c7821c6081c7fff06ee703a681f3d',
  fitness_for_work_or_eligibility_screening_rule: 'ea9f90e41d2fa59cd934e9fb8abe698b26602fdb9906a78ec28f988bb51d3de5',
  verification_evidence_and_staff_discretion_surface: '482be106cac2b3d8cd85d149bbaee0036a0cedc90112edd6b2933d829a7d819d',
  source_identities_and_exact_custody: 'c4d0a1d61760e04432eaf24fefc9fb27e68b488832b963be1dec730ce41b4d87',
});

export const sortDeep = value => {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortDeep(value[key])]));
  return value;
};
export const canon = value => Buffer.from(JSON.stringify(sortDeep(value)));
export const sha = data => crypto.createHash('sha256').update(data).digest('hex');
export const gitBlob = data => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest('hex');
export const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export const assertExactKeys = (value, expected, label) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be object`);
  assert(same(Object.keys(value).sort(), [...expected].sort()), `${label} key set mismatch`);
};
const readBytes = (repoRoot, relativePath, overrides = new Map()) => {
  if (overrides.has(relativePath)) return Buffer.from(overrides.get(relativePath));
  return fs.readFileSync(path.join(repoRoot, relativePath));
};
const readJson = (repoRoot, relativePath, overrides = new Map()) => JSON.parse(readBytes(repoRoot, relativePath, overrides));
export const authorityBoundary = () => ({
  source_requests:0, route_executions:0, source_admissions:0,
  field_terminalizations:0, matrix_updates:1, row_state_mutations:1, row_terminalizations:1,
  class_closed:false, cumulative_ledger_effect:'none', publication_effect:'none',
  adoption_effect:'none', graph_effect:'none', outside_human_dependency:false,
});
const externalBoundary = () => ({
  cumulative_ledger_effect:'none', publication_effect:'none', adoption_effect:'none',
  graph_effect:'none', outside_human_dependency:false,
});
export const NEXT_OPERATION = 'continue_rd04_c02_across_the_remaining_thirty_nine_open_row_state_cells_and_one_hundred_eighty_two_open_substantive_cells_without_reopening_north_dakota_or_closing_the_class';

function validateAuthority(value, label) {
  assertExactKeys(value, AUTHORITY_KEYS, `${label}.authority_boundary`);
  assert(same(value, authorityBoundary()), `${label} authority boundary widened`);
}

function validateInputs(inputBytes, input, decisionBytes, decision) {
  assert(inputBytes.length === C.INPUT_BYTES && sha(inputBytes) === C.INPUT_SHA && gitBlob(inputBytes) === C.INPUT_BLOB, 'input custody byte identity mismatch');
  assert(decisionBytes.length === C.DECISION_BYTES && sha(decisionBytes) === C.DECISION_SHA && gitBlob(decisionBytes) === C.DECISION_BLOB, 'row-state decision byte identity mismatch');
  assertExactKeys(input, INPUT_KEYS, 'input custody');
  assertExactKeys(decision, DECISION_KEYS, 'row-state decision');
  for (const obj of [input, decision]) {
    assert(obj.wave_id === 'SSC-RD-W03' && obj.lane_id === 'RD-04' && obj.class_id === 'RD-04-C02' && obj.issue === 1017, 'lane identity mismatch');
  }
  assert(input.schema_version === 'ssc-rd04-nd-row-state-reconciliation-input-custody@2', 'input schema mismatch');
  assert(decision.schema_version === 'ssc-rd04-nd-row-state-reconciliation-decision@2', 'decision schema mismatch');
  assert(input.canonical_parent === C.CANONICAL_PARENT && input.canonical_parent_tree === C.CANONICAL_PARENT_TREE, 'canonical parent custody mismatch');
  assert(same(input.predecessor_matrix, {path:C.PREDECESSOR_MATRIX_PATH,bytes:C.PREDECESSOR_MATRIX_BYTES,sha256:C.PREDECESSOR_MATRIX_SHA,git_blob_sha:C.PREDECESSOR_MATRIX_BLOB}), 'predecessor matrix custody mismatch');
  const prior = input.prior_candidate_validation;
  assert(prior.pull_request === C.PRIOR_VALIDATION_PR && prior.product_commit === '0de57f1d6d395e28e495b456794fe92b681a35c6' && prior.product_tree === 'fef73cc4267070c8cc7fb7c1dc15481477391d62' && prior.merge_commit === C.CANONICAL_PARENT, 'prior validation venue mismatch');
  assert(prior.workflow_run === C.PRIOR_VALIDATION_RUN && prior.artifact_id === C.PRIOR_VALIDATION_ARTIFACT_ID && prior.artifact_bytes === C.PRIOR_VALIDATION_ARTIFACT_BYTES && prior.artifact_zip_sha256 === C.PRIOR_VALIDATION_ARTIFACT_SHA, 'prior validation artifact mismatch');
  assert(prior.validation_receipt_sha256 === C.PRIOR_VALIDATION_RECEIPT_SHA && prior.row_candidate_id === C.PRIOR_ROW_CANDIDATE_ID && prior.row_candidate_sha256 === C.PRIOR_ROW_CANDIDATE_SHA, 'prior validation candidate mismatch');
  assert(prior.projection_integrity_state === 'repaired_counts_and_current_result_match' && prior.corrected_semantic_projection_bytes === 498054 && prior.corrected_semantic_projection_sha256 === '6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c' && prior.corrected_semantic_projection_git_blob === '8efadaa94bc9de68b4d90d471051d613ad0ce32e', 'projection repair custody mismatch');
  assert(prior.current_rebind.substantive_prerequisite_applied === true, 'substantive prerequisite not bound');
  assert(prior.current_rebind.canonical_target_cell_sha256 === C.CURRENT_TARGET_SHA, 'canonical target prerequisite mismatch');
  assert(prior.current_rebind.substantive_cell_reapplication_authorized === false, 'substantive cell reapplication widened');
  assert(prior.current_rebind.row_candidate_semantics_retained === true && prior.current_rebind.successor_projection === 'one_derivative_row_state_cell_only', 'row candidate rebind mismatch');
  assert(input.current_north_dakota.row_sha256 === C.CURRENT_ND_ROW_SHA && input.current_north_dakota.row_state_cell_sha256 === C.CURRENT_ROW_STATE_SHA, 'current ND custody mismatch');
  assert(input.current_north_dakota.target_substantive_cell_sha256 === C.CURRENT_TARGET_SHA, 'current target custody mismatch');
  assert(input.terminal_evidence_cells.length === 8, 'terminal evidence denominator mismatch');
  assert(same(input.terminal_evidence_cells.map(x=>x.field_id), Object.keys(TERMINAL_EVIDENCE_HASHES)), 'terminal evidence order mismatch');
  for (const rec of input.terminal_evidence_cells) {
    assert(rec.terminal === true && rec.cell_sha256 === TERMINAL_EVIDENCE_HASHES[rec.field_id], `terminal evidence custody mismatch ${rec.field_id}`);
  }
  assert(decision.decision_id === 'RD04-ND-EXACT-CURRENT-ROW-STATE-RECONCILIATION-DECISION-V1', 'decision id mismatch');
  assert(decision.candidate_id === C.PRIOR_ROW_CANDIDATE_ID, 'candidate id mismatch');
  assert(decision.unit_id === 'US-STATE-ND' && decision.field_id === 'field_and_row_terminal_state' && decision.field_ordinal === 9, 'decision target mismatch');
  assert(decision.current_row_sha256 === C.CURRENT_ND_ROW_SHA && decision.current_cell_sha256 === C.CURRENT_ROW_STATE_SHA, 'decision current identity mismatch');
  assert(decision.reconciled_row_sha256 === C.RECONCILED_ND_ROW_SHA && decision.proposed_cell_sha256 === C.PROPOSED_ROW_STATE_SHA, 'decision projected identity mismatch');
  assertExactKeys(decision.proposed_row_state_cell, CELL_KEYS, 'proposed row-state cell');
  assertExactKeys(decision.proposed_row_state_cell.value, CELL_VALUE_KEYS, 'proposed row-state value');
  assert(sha(canon(decision.proposed_row_state_cell)) === C.PROPOSED_ROW_STATE_SHA, 'proposed row-state cell canonical digest mismatch');
  assert(same(decision.prohibited_inferences, PROHIBITED_INFERENCES), 'decision prohibited inference set mismatch');
  assert(same(decision.proposed_row_state_cell.value.prohibited_inferences, PROHIBITED_INFERENCES), 'cell prohibited inference set mismatch');
  assert(decision.prerequisite_satisfaction.all_eight_terminal === true && decision.prerequisite_satisfaction.observed_terminal_evidence_fields === 8, 'decision prerequisite count mismatch');
  assert(decision.prerequisite_satisfaction.substantive_prerequisite_applied === true && decision.prerequisite_satisfaction.substantive_cell_reapplication_authorized === false, 'decision prerequisite authority widened');
  assert(decision.prerequisite_satisfaction.validation_repair_product_commit === '0de57f1d6d395e28e495b456794fe92b681a35c6' && decision.prerequisite_satisfaction.validation_repair_merge_commit === C.CANONICAL_PARENT && decision.prerequisite_satisfaction.validation_receipt_sha256 === C.PRIOR_VALIDATION_RECEIPT_SHA && decision.prerequisite_satisfaction.corrected_semantic_projection_sha256 === '6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c', 'decision validation repair custody mismatch');
  assert(same(decision.transition_effects, {field_terminalizations:0,matrix_updates:1,row_state_mutations:1,row_terminalizations:1,terminal_units_delta:1,class_closed:false,cumulative_ledger_effect:'none'}), 'decision transition denominator mismatch');
  validateAuthority(input.authority_boundary, 'input');
  validateAuthority(decision.authority_boundary, 'decision');
}

function actualCounts(matrix) {
  const cells = matrix.rows.flatMap(row=>row.cells);
  const substantive = cells.filter(cell=>!['canonical_state_identity','source_identities_and_exact_custody','field_and_row_terminal_state'].includes(cell.field_id));
  const terminalRows = matrix.rows.filter(row=>row.open_fields===0);
  return {
    materialized_cells:cells.length,
    terminal_cells:cells.filter(cell=>cell.terminal).length,
    still_open_cells:cells.filter(cell=>!cell.terminal).length,
    terminal_substantive_cells:substantive.filter(cell=>cell.terminal).length,
    still_open_substantive_cells:substantive.filter(cell=>!cell.terminal).length,
    row_terminal_state_cells_terminal:cells.filter(cell=>cell.field_id==='field_and_row_terminal_state'&&cell.terminal).length,
    row_terminal_state_cells_open:cells.filter(cell=>cell.field_id==='field_and_row_terminal_state'&&!cell.terminal).length,
    terminal_units:terminalRows.length,
    terminal_unit_ids:terminalRows.map(row=>row.unit_id),
    evidence_complete_cells:cells.filter(cell=>cell.state==='evidence_complete').length,
    observed_cells:cells.filter(cell=>cell.state==='observed').length,
    not_publicly_recovered_cells:cells.filter(cell=>cell.state==='not_publicly_recovered').length,
  };
}

export function buildModel(repoRoot=process.cwd(), overrides=new Map()) {
  const matrixBytes=readBytes(repoRoot,C.PREDECESSOR_MATRIX_PATH,overrides);
  assert(matrixBytes.length===C.PREDECESSOR_MATRIX_BYTES && sha(matrixBytes)===C.PREDECESSOR_MATRIX_SHA && gitBlob(matrixBytes)===C.PREDECESSOR_MATRIX_BLOB, 'predecessor matrix identity mismatch');
  const matrix=JSON.parse(matrixBytes);
  const inputBytes=readBytes(repoRoot,C.INPUT_PATH,overrides); const input=JSON.parse(inputBytes);
  const decisionBytes=readBytes(repoRoot,C.DECISION_PATH,overrides); const decision=JSON.parse(decisionBytes);
  validateInputs(inputBytes,input,decisionBytes,decision);
  assert(matrix.schema_version==='ssc-rd04-wave03-postpromotion-nd-current-public-record-gap-promoted-partial-field-matrix@1', 'predecessor schema mismatch');
  assert(matrix.rows.length===50 && matrix.counts.materialized_cells===450, 'matrix denominator mismatch');
  assert(matrix.counts.terminal_cells===228 && matrix.counts.still_open_cells===222, 'predecessor global count mismatch');
  assert(matrix.counts.terminal_substantive_cells===118 && matrix.counts.still_open_substantive_cells===182, 'predecessor substantive count mismatch');
  assert(matrix.counts.row_terminal_state_cells_terminal===10 && matrix.counts.row_terminal_state_cells_open===40 && matrix.counts.terminal_units===10, 'predecessor row count mismatch');
  assert(matrix.counts.class_closed===false, 'predecessor class already closed');
  const ndRows=matrix.rows.filter(row=>row.unit_id==='US-STATE-ND'); assert(ndRows.length===1,'ND row denominator mismatch');
  const beforeRow=ndRows[0];
  assert(sha(canon(beforeRow))===C.CURRENT_ND_ROW_SHA, 'current ND row canonical digest mismatch');
  assert(beforeRow.row_state==='still_open'&&beforeRow.terminal_fields===8&&beforeRow.open_fields===1,'current ND row state mismatch');
  const rowStateCell=beforeRow.cells.find(cell=>cell.field_id==='field_and_row_terminal_state');
  assert(rowStateCell&&rowStateCell.state==='still_open'&&rowStateCell.terminal===false&&sha(canon(rowStateCell))===C.CURRENT_ROW_STATE_SHA,'current row-state cell mismatch');
  const evidenceCells=beforeRow.cells.filter(cell=>cell.field_id!=='field_and_row_terminal_state');
  assert(evidenceCells.length===8&&evidenceCells.every(cell=>cell.terminal),'eight terminal evidence cells required');
  for (const cell of evidenceCells) assert(sha(canon(cell))===TERMINAL_EVIDENCE_HASHES[cell.field_id],`terminal evidence cell changed ${cell.field_id}`);
  const target=evidenceCells.find(cell=>cell.field_id==='abawd_or_work_requirement_waiver_state_and_governing_period');
  assert(target.state==='not_publicly_recovered'&&target.terminal===true&&sha(canon(target))===C.CURRENT_TARGET_SHA,'substantive prerequisite mismatch');

  const promoted=structuredClone(matrix);
  promoted.schema_version='ssc-rd04-wave03-postpromotion-nd-row-state-reconciled-partial-field-matrix@2';
  const afterRow=promoted.rows.find(row=>row.unit_id==='US-STATE-ND');
  const rowStateIndex=afterRow.cells.findIndex(cell=>cell.field_id==='field_and_row_terminal_state'); assert(rowStateIndex>=0,'row-state index missing');
  afterRow.cells[rowStateIndex]=structuredClone(decision.proposed_row_state_cell);
  afterRow.row_state='terminal_fixed_public_record_obligation_complete'; afterRow.terminal_fields=9; afterRow.open_fields=0;
  promoted.counts.evidence_complete_cells+=1;
  promoted.counts.still_open_cells-=1; promoted.counts.terminal_cells+=1;
  promoted.counts.row_terminal_state_cells_terminal+=1; promoted.counts.row_terminal_state_cells_open-=1; promoted.counts.terminal_units+=1;
  promoted.counts.postpromotion_nd_current_public_record_gap_row_state_candidate_cells=1;
  promoted.counts.newly_terminalized_postpromotion_nd_current_public_record_gap_row_state_cells=1;
  Object.assign(promoted.current_result,{
    terminal_cells:'229/450',still_open_cells:'221/450',row_terminal_state_cells_terminal:11,row_terminal_state_cells_open:39,
    terminal_units:11,terminal_unit_ids:promoted.rows.filter(row=>row.open_fields===0).map(row=>row.unit_id),
    field_matrix_terminal:false,class_state:'still_open',class_closed:false,
  });
  promoted.postpromotion_nd_current_public_record_gap_row_state_reconciliation_product={
    predecessor_matrix_path:C.PREDECESSOR_MATRIX_PATH,predecessor_matrix_bytes:C.PREDECESSOR_MATRIX_BYTES,
    predecessor_matrix_sha256:C.PREDECESSOR_MATRIX_SHA,predecessor_matrix_git_blob:C.PREDECESSOR_MATRIX_BLOB,
    validation_repair_product_commit:'0de57f1d6d395e28e495b456794fe92b681a35c6',validation_repair_product_tree:'fef73cc4267070c8cc7fb7c1dc15481477391d62',validation_repair_merge_commit:C.CANONICAL_PARENT,
    validation_artifact_id:C.PRIOR_VALIDATION_ARTIFACT_ID,validation_artifact_bytes:C.PRIOR_VALIDATION_ARTIFACT_BYTES,
    validation_artifact_zip_sha256:C.PRIOR_VALIDATION_ARTIFACT_SHA,validation_receipt_sha256:C.PRIOR_VALIDATION_RECEIPT_SHA,
    canonical_parent:C.CANONICAL_PARENT,canonical_parent_tree:C.CANONICAL_PARENT_TREE,
    current_north_dakota_row_sha256:C.CURRENT_ND_ROW_SHA,current_row_state_cell_sha256:C.CURRENT_ROW_STATE_SHA,
    proposed_row_state_cell_sha256:C.PROPOSED_ROW_STATE_SHA,reconciled_north_dakota_row_sha256:C.RECONCILED_ND_ROW_SHA,
    corrected_semantic_projection_sha256:'6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c',
    composition_rule:'delete_only_postpromotion_nd_current_public_record_gap_row_state_reconciliation_product_then_require_byte_identity_with_corrected_semantic_projection',
  };
  const afterCell=afterRow.cells[rowStateIndex];
  assert(sha(canon(afterCell))===C.PROPOSED_ROW_STATE_SHA,'after row-state cell mismatch');
  assert(sha(canon(afterRow))===C.RECONCILED_ND_ROW_SHA,'reconciled ND row mismatch');
  for (const cell of afterRow.cells.filter(cell=>cell.field_id!=='field_and_row_terminal_state')) assert(sha(canon(cell))===TERMINAL_EVIDENCE_HASHES[cell.field_id],`substantive cell changed ${cell.field_id}`);
  for (const before of matrix.rows.filter(row=>row.unit_id!=='US-STATE-ND')) {
    const after=promoted.rows.find(row=>row.unit_id===before.unit_id); assert(sha(canon(after))===sha(canon(before)),`non-target row changed ${before.unit_id}`);
  }
  assert(sha(canon(promoted.rows.filter(row=>row.unit_id!=='US-STATE-ND')))===C.UNCHANGED_ROWS_SHA,'unchanged row set digest mismatch');
  const counts=actualCounts(promoted);
  assert(same(counts,{materialized_cells:450,terminal_cells:229,still_open_cells:221,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:11,row_terminal_state_cells_open:39,terminal_units:11,terminal_unit_ids:['US-STATE-AR','US-STATE-CA','US-STATE-GA','US-STATE-MD','US-STATE-NC','US-STATE-ND','US-STATE-PA','US-STATE-RI','US-STATE-SD','US-STATE-WA','US-STATE-WV'],evidence_complete_cells:198,observed_cells:17,not_publicly_recovered_cells:14}),'actual promoted counts mismatch');
  assert(promoted.counts.terminal_substantive_cells===118&&promoted.counts.still_open_substantive_cells===182,'substantive counts changed');
  assert(promoted.counts.class_closed===false&&promoted.current_result.class_closed===false,'class closure widened');
  const normalized=structuredClone(promoted); delete normalized.postpromotion_nd_current_public_record_gap_row_state_reconciliation_product;
  const normalizedBytes=jsonBytes(normalized);
  assert(normalizedBytes.length===498054&&sha(normalizedBytes)==='6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c'&&gitBlob(normalizedBytes)==='8efadaa94bc9de68b4d90d471051d613ad0ce32e','corrected semantic projection mismatch');
  const promotedBytes=jsonBytes(promoted);
  assert(promotedBytes.length===C.PROMOTED_MATRIX_BYTES&&sha(promotedBytes)===C.PROMOTED_MATRIX_SHA&&gitBlob(promotedBytes)===C.PROMOTED_MATRIX_BLOB,'promoted matrix identity mismatch');
  return {matrix,input,decision,promoted,beforeRow,rowStateCell,evidenceCells,target,afterRow,afterCell,counts};
}

function buildLedger(model) {
  return {
    schema_version:'ssc-rd04-nd-row-state-reconciliation-ledger@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    row_state_mutation_count:1,row_terminalization_count:1,substantive_field_terminalization_count:0,matrix_update_count:1,
    transition:{
      decision_id:model.decision.decision_id,candidate_id:model.decision.candidate_id,unit_ordinal:34,unit_id:'US-STATE-ND',postal_code:'ND',state_name:'North Dakota',
      field_id:'field_and_row_terminal_state',field_ordinal:9,
      cell_before:structuredClone(model.rowStateCell),cell_before_sha256:C.CURRENT_ROW_STATE_SHA,
      cell_after:structuredClone(model.afterCell),cell_after_sha256:C.PROPOSED_ROW_STATE_SHA,
      row_before_sha256:C.CURRENT_ND_ROW_SHA,row_after_sha256:C.RECONCILED_ND_ROW_SHA,
      terminal_evidence_cells:model.input.terminal_evidence_cells.map(x=>structuredClone(x)),
      substantive_cells_reapplied:0,source_requests:0,route_executions:0,
    },
    matrix_transition:{
      predecessor:{path:C.PREDECESSOR_MATRIX_PATH,bytes:C.PREDECESSOR_MATRIX_BYTES,sha256:C.PREDECESSOR_MATRIX_SHA,git_blob_sha:C.PREDECESSOR_MATRIX_BLOB},
      promoted:{path:`${C.ROOT}/promoted-partial-field-matrix.json`,bytes:C.PROMOTED_MATRIX_BYTES,sha256:C.PROMOTED_MATRIX_SHA,git_blob_sha:C.PROMOTED_MATRIX_BLOB},
      counts_before:{materialized_cells:450,terminal_cells:228,still_open_cells:222,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:10,row_terminal_state_cells_open:40,terminal_units:10,class_closed:false},
      counts_after:{materialized_cells:450,terminal_cells:229,still_open_cells:221,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:11,row_terminal_state_cells_open:39,terminal_units:11,class_closed:false},
      north_dakota_before:{row_state:'still_open',terminal_fields:8,open_fields:1,row_sha256:C.CURRENT_ND_ROW_SHA},
      north_dakota_after:{row_state:'terminal_fixed_public_record_obligation_complete',terminal_fields:9,open_fields:0,row_sha256:C.RECONCILED_ND_ROW_SHA},
      unchanged_non_target_rows:49,unchanged_non_target_rows_sha256:C.UNCHANGED_ROWS_SHA,unchanged_north_dakota_substantive_cells:8,
    },
    authority_boundary:authorityBoundary(),
  };
}
function openProjection(row,cell){return {unit_ordinal:row.unit_ordinal,unit_id:row.unit_id,postal_code:row.postal_code,state_name:row.state_name,row_state:row.row_state,field_ordinal:cell.field_ordinal,field_id:cell.field_id,state:cell.state,typed_gap:cell.typed_gap,authority_effect:cell.authority_effect,cell_sha256:sha(canon(cell))};}
function buildCensus(model){
  const open=[]; for(const row of model.promoted.rows)for(const cell of row.cells)if(!cell.terminal)open.push(openProjection(row,cell));
  const terminalRows=model.promoted.rows.filter(row=>row.open_fields===0);
  return {schema_version:'ssc-rd04-nd-row-state-reconciliation-remaining-open-field-census@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    matrix_sha256:C.PROMOTED_MATRIX_SHA,open_cell_count:221,open_substantive_cell_count:182,open_row_state_cell_count:39,terminal_cell_count:229,terminal_substantive_cell_count:118,
    terminal_unit_count:11,terminal_unit_ids:terminalRows.map(row=>row.unit_id),north_dakota:{row_state:model.afterRow.row_state,terminal_fields:9,open_fields:0,row_sha256:C.RECONCILED_ND_ROW_SHA,remaining_open_cells:[],next_mechanical_frontier:'none_for_north_dakota_fixed_public_record_obligation'},
    open_cells:open,class_closed:false,next_bounded_operation:NEXT_OPERATION,authority_boundary:externalBoundary()};
}
function buildSummary(model){return {schema_version:'ssc-rd04-nd-row-state-reconciliation-summary@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
  state:'north_dakota_derivative_row_state_reconciled',decision_id:model.decision.decision_id,candidate_id:model.decision.candidate_id,row_state_mutations:1,row_terminalizations:1,substantive_field_terminalizations:0,matrix_updates:1,
  counts:{materialized_cells:450,terminal_cells:229,still_open_cells:221,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:11,row_terminal_state_cells_open:39,terminal_units:11},
  north_dakota:{terminal_fields:9,open_fields:0,row_state:'terminal_fixed_public_record_obligation_complete',row_sha256:C.RECONCILED_ND_ROW_SHA},
  class_closed:false,next_bounded_operation:NEXT_OPERATION,authority_boundary:authorityBoundary()};}
function buildIndex(model){return {schema_version:'ssc-rd04-nd-row-state-reconciliation-index@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
  input_custody_path:'input-custody.json',row_state_decision_path:'row-state-decision.json',row_state_ledger_path:'row-state-ledger.json',promoted_partial_field_matrix_path:'promoted-partial-field-matrix.json',remaining_open_field_census_path:'remaining-open-field-census.json',row_state_summary_path:'row-state-summary.json',
  counts:{validated_row_candidates:1,reconciled_row_state_cells:1,row_state_mutations:1,row_terminalizations:1,substantive_field_terminalizations:0,matrix_updates:1,terminal_cells_before:228,terminal_cells_after:229,still_open_cells_after:221,still_open_substantive_cells_after:182,terminal_units_after:11},
  current_result:{north_dakota_terminal_fields:9,north_dakota_open_fields:0,north_dakota_row_state:'terminal_fixed_public_record_obligation_complete',class_closed:false,outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},next_bounded_operation:NEXT_OPERATION};}

export const DERIVED_NAMES=Object.freeze(['row-state-ledger.json','promoted-partial-field-matrix.json','remaining-open-field-census.json','row-state-summary.json','index.json']);
export function buildProduct(repoRoot=process.cwd(),overrides=new Map()){
  const model=buildModel(repoRoot,overrides); const objects={
    'row-state-ledger.json':buildLedger(model),'promoted-partial-field-matrix.json':model.promoted,'remaining-open-field-census.json':buildCensus(model),'row-state-summary.json':buildSummary(model),'index.json':buildIndex(model),
  }; return Object.fromEntries(DERIVED_NAMES.map(name=>[name,jsonBytes(objects[name])]));
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const outIndex=process.argv.indexOf('--out'); const out=outIndex>=0?process.argv[outIndex+1]:null; const check=process.argv.includes('--check'); const files=buildProduct(process.cwd());
  if(out){fs.mkdirSync(out,{recursive:true});for(const [name,bytes]of Object.entries(files))fs.writeFileSync(path.join(out,name),bytes);}
  if(check){for(const [name,bytes]of Object.entries(files)){const actual=fs.readFileSync(path.join(process.cwd(),C.ROOT,name));assert(actual.equals(bytes),`committed ${name} differs from deterministic build`);}}
  console.log(JSON.stringify({state:'deterministic_north_dakota_row_state_reconciliation_built',files:Object.keys(files).length,promoted_matrix_sha256:C.PROMOTED_MATRIX_SHA,terminal_cells:229,still_open_cells:221,terminal_units:11,class_closed:false},null,2));
}
