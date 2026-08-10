#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const C = Object.freeze({
  ROOT: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion',
  MATRIX_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json',
  MATRIX_BYTES: 485610,
  MATRIX_SHA: '663f93d84f168bf6ccdd92eaee0deb47b109f4280e7b25613853c2c1a6be2b63',
  MATRIX_BLOB: '19357f8214ab2710bc5e75b3fae8c7fb09ff1654',
  CANDIDATE_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/promotion-candidate.json',
  CANDIDATE_BLOB: 'c5af22ad9457f93d3a34734982434bbee764b051',
  CANDIDATE_SHA: '40ac38da0a8d912c0d03818c06a238596605c66746565f0f66233254e5d75134',
  SOURCE_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/source-corpus.json',
  SOURCE_BLOB: 'c4cf754c064e4cc707b7b55ca872eff3006afe07',
  DECISION_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/field-decision.json',
  DECISION_BLOB: '54ab12737d4bcfba8f79373bab826d72db469d8d',
  VALIDATION_CANDIDATE_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/candidate-validation.json',
  VALIDATION_CANDIDATE_BLOB: '504c828de461d3933af7d755d15e254cd2261ccd',
  VALIDATION_CUSTODY_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/current-cell-custody.json',
  VALIDATION_CUSTODY_BLOB: 'd466159af5abb0ec677388389accc23a3c36e5ef',
  VALIDATION_PROTOCOL_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/validated-candidate-protocol.json',
  VALIDATION_PROTOCOL_BLOB: '9abd89f655573827bfabad60e0923e2f80a7f4aa',
  VALIDATION_MANIFEST_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/product-manifest.json',
  VALIDATION_MANIFEST_BLOB: '85e54edfc3789d5579ba227d55b09773451ad092',
  CANONICAL_PARENT: '77aef3313e85e1fddc68805a9f22252ff147b4e8',
  CANONICAL_PARENT_TREE: '4a8b28c6d3e00ac72e8a9b3f6769b50fc0e29259',
  CURRENT_ND_ROW_SHA: '18f9b127b61e45edafb64c78bc8c387175fffdb351156ccf9154158ca467d2dd',
  CURRENT_TARGET_SHA: 'cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe',
  CURRENT_ROW_STATE_SHA: '6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3',
  PROPOSED_TARGET_SHA: '8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25',
  PROMOTED_MATRIX_SHA: '1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824',
  PROMOTED_MATRIX_BLOB: 'c25a1ad8fdfe82f70f1ff71e61da6796be94c737',
  PROMOTED_MATRIX_BYTES: 495400,
  AFTER_ROW_SHA: '0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e',
  UNCHANGED_ROWS_SHA: '25b9992961da7c38dd933b532bf4e563bfc397f3655255fe9bce8cd407842b96',
  CANDIDATE_PRODUCT_COMMIT: '741fef03cf9d869a3370607158ccd27c527b0746',
  CANDIDATE_PRODUCT_TREE: 'b4323c3a03b51875a1b6c2f5784b92aa07c714cd',
  CANDIDATE_MERGE: 'd94b5ecd4547c7f051593fe330600985afc5e41c',
  CANDIDATE_PAYLOAD_SHA: '40e1904b1d98bb3894a39be7e7028e201e906d2659343b67df1c6869bd81f71b',
  VALIDATION_PRODUCT_COMMIT: '5fd3d17e2534d5a06f1d2d935cae54f609b3952a',
  VALIDATION_PRODUCT_TREE: '4a8b28c6d3e00ac72e8a9b3f6769b50fc0e29259',
  VALIDATION_MERGE: '77aef3313e85e1fddc68805a9f22252ff147b4e8',
  VALIDATION_PR: 1754,
  VALIDATION_RUN: 31335369211,
  VALIDATION_ARTIFACT_ID: 9044162097,
  VALIDATION_ARTIFACT_BYTES: 8035,
  VALIDATION_ARTIFACT_SHA: '38da554f82b05dacae14428217d529e6457a0b3bdfc065aeaefa725764e32ccc',
  VALIDATION_RECEIPT_SHA: '530ccebe5a51c5ba5dc19b4d1f5a0c8b0b528790d6979b3b781ffb8f5f8bee8d',
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
const readJson = (repoRoot, relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
const authorityBoundary = () => ({
  source_requests: 0,
  route_executions: 0,
  source_admissions: 0,
  field_terminalizations: 1,
  matrix_updates: 1,
  row_state_mutations: 0,
  row_terminalizations: 0,
  class_closed: false,
  cumulative_ledger_effect: 'none',
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
  outside_human_dependency: false,
});
const externalBoundary = () => ({
  cumulative_ledger_effect: 'none',
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none',
  outside_human_dependency: false,
});
const NEXT_OPERATION = 'perform_request_free_exact_current_row_validation_of_the_dependent_north_dakota_row_state_cell_then_construct_a_separate_row_state_promotion_only_if_qualified';

const INPUTS = Object.freeze({
  matrix: {path:C.MATRIX_PATH,bytes:485610,sha256:C.MATRIX_SHA,git_blob_sha:C.MATRIX_BLOB},
  candidate: {path:C.CANDIDATE_PATH,bytes:8867,sha256:C.CANDIDATE_SHA,git_blob_sha:C.CANDIDATE_BLOB},
  source_corpus: {path:C.SOURCE_PATH,bytes:11628,sha256:'efd5471953d69f3669ac8c3bffc4178b1b98e37a4cda99914c4b58f4d71298f4',git_blob_sha:C.SOURCE_BLOB},
  field_decision: {path:C.DECISION_PATH,bytes:8802,sha256:'e7a4185aced1cda2f02bae7807a2d495d77d143b8a35771ab99b9563e0b52e7a',git_blob_sha:C.DECISION_BLOB},
  candidate_current_cell_custody: {path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/current-cell-custody.json',bytes:2381,sha256:'5ed52b457bf4aaeb0704b45ba2fd59815573221a2dfaa1b9b118729148aceae6',git_blob_sha:'9fb881fa89f96e5754528c10165743508f0a153d'},
  candidate_manifest: {path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/product-manifest.json',bytes:4453,sha256:'86a1b0d4558421fae2fed68cb5e55755c51e5b98056e1b8033c8c8dba0fdfc91',git_blob_sha:'cede396081eae25a6b388b5e7c3ab7105e2f6a05'},
  validation_candidate: {path:C.VALIDATION_CANDIDATE_PATH,bytes:6560,sha256:'621fbfc2d00adbc199290db5826f254e53a0bf42ff4e413e94a7e8a49c8d36a4',git_blob_sha:C.VALIDATION_CANDIDATE_BLOB},
  validation_current_cell_custody: {path:C.VALIDATION_CUSTODY_PATH,bytes:1573,sha256:'2dab1fd49dcd7796fbdee7799ab11f76930c8cee713d0ba1ba09e08c46480009',git_blob_sha:C.VALIDATION_CUSTODY_BLOB},
  validated_candidate_protocol: {path:C.VALIDATION_PROTOCOL_PATH,bytes:2309,sha256:'d046d3a7efec516cf758b8f348d62c3a63528f46f5474d97cdbeb47338268fcd',git_blob_sha:C.VALIDATION_PROTOCOL_BLOB},
  validation_manifest: {path:C.VALIDATION_MANIFEST_PATH,git_blob_sha:C.VALIDATION_MANIFEST_BLOB},
  validation_workflow: {path:'.github/workflows/status-sovereignty-rd-wave03-rd04-nd-current-public-record-gap-validation.yml',sha256:'286d5470f9a9394b2a2a195df8a9d122561eeb4c36051c4cd0494b3c57e840e6',git_blob_sha:'bee66e19926a17d74387af4a3749aaaddc756be3'},
});

function assertValidation(candidate, validation, custody, protocol) {
  assert(validation.validation_result?.state === 'validated_exact_current_cell', 'candidate validation state mismatch');
  assert(validation.validation_result?.separate_promotion_product_authorized === true, 'promotion not authorized');
  assert(validation.validation_result?.promotion_executed_here === false, 'validation already executed promotion');
  assert(validation.candidate?.candidate_id === candidate.candidate_id, 'validation candidate id mismatch');
  assert(validation.candidate?.current_cell_sha256 === C.CURRENT_TARGET_SHA, 'validation current cell mismatch');
  assert(validation.candidate?.proposed_cell_sha256 === C.PROPOSED_TARGET_SHA, 'validation proposed cell mismatch');
  assert(custody.north_dakota?.target_cell_sha256 === C.CURRENT_TARGET_SHA, 'validation custody target mismatch');
  assert(custody.north_dakota?.row_state_cell_sha256 === C.CURRENT_ROW_STATE_SHA, 'validation custody row-state mismatch');
  assert(protocol.candidate_id === candidate.candidate_id, 'validated protocol candidate mismatch');
  assert(protocol.separate_promotion_product_authorized === true, 'validated protocol does not authorize promotion');
  assert(protocol.maximum_field_terminalizations === 1 && protocol.maximum_matrix_updates === 1, 'validated protocol denominator mismatch');
  assert(protocol.row_state_transition_authorized === false && protocol.maximum_row_state_mutations === 0 && protocol.maximum_row_terminalizations === 0, 'validated protocol row authority widened');
}

export function buildModel(repoRoot = process.cwd()) {
  const matrixBytes = fs.readFileSync(path.join(repoRoot, C.MATRIX_PATH));
  assert(matrixBytes.length === C.MATRIX_BYTES, 'predecessor matrix byte mismatch');
  assert(sha(matrixBytes) === C.MATRIX_SHA, 'predecessor matrix sha mismatch');
  assert(gitBlob(matrixBytes) === C.MATRIX_BLOB, 'predecessor matrix blob mismatch');
  const matrix = JSON.parse(matrixBytes);
  const candidate = readJson(repoRoot, C.CANDIDATE_PATH);
  const validation = readJson(repoRoot, C.VALIDATION_CANDIDATE_PATH);
  const validationCustody = readJson(repoRoot, C.VALIDATION_CUSTODY_PATH);
  const validationProtocol = readJson(repoRoot, C.VALIDATION_PROTOCOL_PATH);
  assert(candidate.candidate_id === 'RD04-ND-CURRENT-WAIVER-PUBLIC-RECORD-GAP-CANDIDATE', 'candidate id mismatch');
  assert(candidate.current_cell_sha256 === C.CURRENT_TARGET_SHA, 'candidate current cell mismatch');
  assert(candidate.proposed_cell_sha256 === C.PROPOSED_TARGET_SHA, 'candidate proposed cell claim mismatch');
  assert(sha(canon(candidate.proposed_cell)) === C.PROPOSED_TARGET_SHA, 'candidate proposed cell digest mismatch');
  assert(candidate.row_state_transition_in_candidate === false, 'candidate row transition widened');
  assertValidation(candidate, validation, validationCustody, validationProtocol);
  const ndRows = matrix.rows.filter(row => row.unit_id === 'US-STATE-ND');
  assert(ndRows.length === 1, 'North Dakota row denominator mismatch');
  const beforeRow = ndRows[0];
  const beforeTarget = beforeRow.cells.find(cell => cell.field_id === candidate.field_id);
  const beforeRowState = beforeRow.cells.find(cell => cell.field_id === 'field_and_row_terminal_state');
  assert(sha(canon(beforeRow)) === C.CURRENT_ND_ROW_SHA, 'current ND row mismatch');
  assert(sha(canon(beforeTarget)) === C.CURRENT_TARGET_SHA, 'current target mismatch');
  assert(sha(canon(beforeRowState)) === C.CURRENT_ROW_STATE_SHA, 'current row-state cell mismatch');

  const promoted = structuredClone(matrix);
  promoted.schema_version = 'ssc-rd04-wave03-postpromotion-nd-current-public-record-gap-promoted-partial-field-matrix@1';
  const afterRow = promoted.rows.find(row => row.unit_id === 'US-STATE-ND');
  const targetIndex = afterRow.cells.findIndex(cell => cell.field_id === candidate.field_id);
  assert(targetIndex >= 0, 'target cell absent');
  afterRow.cells[targetIndex] = structuredClone(candidate.proposed_cell);
  afterRow.terminal_fields = 8;
  afterRow.open_fields = 1;
  afterRow.row_state = 'still_open';
  promoted.counts.not_publicly_recovered_cells += 1;
  promoted.counts.still_open_cells -= 1;
  promoted.counts.terminal_cells += 1;
  promoted.counts.terminal_substantive_cells += 1;
  promoted.counts.still_open_substantive_cells -= 1;
  promoted.counts.postpromotion_nd_current_public_record_gap_candidate_cells = 1;
  promoted.counts.newly_terminalized_postpromotion_nd_current_public_record_gap_cells = 1;
  Object.assign(promoted.current_result, {
    terminal_cells:'228/450', still_open_cells:'222/450', terminal_substantive_cells:118,
    still_open_substantive_cells:182, row_terminal_state_cells_terminal:10,
    row_terminal_state_cells_open:40, terminal_units:10, field_matrix_terminal:false,
    class_state:'still_open', class_closed:false,
  });
  promoted.postpromotion_nd_current_public_record_gap_promotion_product = {
    predecessor_matrix_path:C.MATRIX_PATH,
    predecessor_matrix_bytes:C.MATRIX_BYTES,
    predecessor_matrix_sha256:C.MATRIX_SHA,
    predecessor_matrix_git_blob:C.MATRIX_BLOB,
    candidate_path:C.CANDIDATE_PATH,
    candidate_sha256:C.CANDIDATE_SHA,
    candidate_git_blob:C.CANDIDATE_BLOB,
    candidate_id:candidate.candidate_id,
    candidate_proposed_cell_sha256:C.PROPOSED_TARGET_SHA,
    validation_pull_request:C.VALIDATION_PR,
    validation_workflow_run:C.VALIDATION_RUN,
    validation_product_commit:C.VALIDATION_PRODUCT_COMMIT,
    validation_product_tree:C.VALIDATION_PRODUCT_TREE,
    validation_merge_commit:C.VALIDATION_MERGE,
    validation_artifact_id:C.VALIDATION_ARTIFACT_ID,
    validation_artifact_bytes:C.VALIDATION_ARTIFACT_BYTES,
    validation_artifact_zip_sha256:C.VALIDATION_ARTIFACT_SHA,
    validation_receipt_sha256:C.VALIDATION_RECEIPT_SHA,
    canonical_parent:C.CANONICAL_PARENT,
    canonical_parent_tree:C.CANONICAL_PARENT_TREE,
    composition_rule:'terminalize_only_the_single_exactly_validated_north_dakota_public_record_gap_candidate_leave_the_dependent_row_state_cell_byte_identical_and_preserve_the_row_and_class_open',
  };
  const afterTarget = afterRow.cells[targetIndex];
  const afterRowState = afterRow.cells.find(cell => cell.field_id === 'field_and_row_terminal_state');
  assert(sha(canon(afterTarget)) === C.PROPOSED_TARGET_SHA, 'after target mismatch');
  assert(sha(canon(afterRowState)) === C.CURRENT_ROW_STATE_SHA, 'row-state cell changed');
  assert(sha(canon(afterRow)) === C.AFTER_ROW_SHA, 'after row mismatch');
  const promotedBytes = jsonBytes(promoted);
  assert(promotedBytes.length === C.PROMOTED_MATRIX_BYTES, 'promoted matrix byte mismatch');
  assert(sha(promotedBytes) === C.PROMOTED_MATRIX_SHA, 'promoted matrix sha mismatch');
  assert(gitBlob(promotedBytes) === C.PROMOTED_MATRIX_BLOB, 'promoted matrix blob mismatch');
  return {matrix,candidate,validation,validationCustody,validationProtocol,promoted,beforeRow,beforeTarget,beforeRowState,afterRow,afterTarget,afterRowState};
}

function buildInputCustody(model) {
  return {
    schema_version:'ssc-rd04-nd-current-public-record-gap-promotion-input-custody@1',
    wave_id:'SSC-RD-W03', lane_id:'RD-04', class_id:'RD-04-C02', issue:1017,
    canonical_parent:C.CANONICAL_PARENT, canonical_parent_tree:C.CANONICAL_PARENT_TREE,
    inputs:structuredClone(INPUTS),
    candidate_product:{
      merge_commit:C.CANDIDATE_MERGE, product_commit:C.CANDIDATE_PRODUCT_COMMIT,
      product_tree:C.CANDIDATE_PRODUCT_TREE, payload_sha256:C.CANDIDATE_PAYLOAD_SHA,
      candidate_id:model.candidate.candidate_id, proposed_cell_sha256:C.PROPOSED_TARGET_SHA,
      source_ids_resolved:true,
    },
    validation_product:{
      pull_request:C.VALIDATION_PR, workflow_run:C.VALIDATION_RUN,
      product_commit:C.VALIDATION_PRODUCT_COMMIT, product_tree:C.VALIDATION_PRODUCT_TREE,
      merge_commit:C.VALIDATION_MERGE, artifact_id:C.VALIDATION_ARTIFACT_ID,
      artifact_bytes:C.VALIDATION_ARTIFACT_BYTES, artifact_zip_sha256:C.VALIDATION_ARTIFACT_SHA,
      validation_receipt_sha256:C.VALIDATION_RECEIPT_SHA, validated_candidates:1,
      rejected_candidates:0, separate_promotion_product_authorized:true,
      maximum_field_terminalizations:1, maximum_matrix_updates:1,
      row_state_transition_authorized:false,
    },
    current_north_dakota:{
      row_sha256:C.CURRENT_ND_ROW_SHA, target_cell_sha256:C.CURRENT_TARGET_SHA,
      row_state_cell_sha256:C.CURRENT_ROW_STATE_SHA, row_state:model.beforeRow.row_state,
      terminal_fields:model.beforeRow.terminal_fields, open_fields:model.beforeRow.open_fields,
    },
    projected_transition:{
      target_cell_sha256_after:C.PROPOSED_TARGET_SHA,
      north_dakota_row_sha256_after:C.AFTER_ROW_SHA,
      row_state_cell_sha256_after:C.CURRENT_ROW_STATE_SHA,
      promoted_matrix_bytes:C.PROMOTED_MATRIX_BYTES,
      promoted_matrix_sha256:C.PROMOTED_MATRIX_SHA,
      promoted_matrix_git_blob:C.PROMOTED_MATRIX_BLOB,
      terminal_cells:[model.matrix.counts.terminal_cells,model.promoted.counts.terminal_cells],
      still_open_cells:[model.matrix.counts.still_open_cells,model.promoted.counts.still_open_cells],
      terminal_substantive_cells:[model.matrix.counts.terminal_substantive_cells,model.promoted.counts.terminal_substantive_cells],
      still_open_substantive_cells:[model.matrix.counts.still_open_substantive_cells,model.promoted.counts.still_open_substantive_cells],
      terminal_units:[model.matrix.counts.terminal_units,model.promoted.counts.terminal_units],
      north_dakota_terminal_fields:[model.beforeRow.terminal_fields,model.afterRow.terminal_fields],
      north_dakota_open_fields:[model.beforeRow.open_fields,model.afterRow.open_fields],
      north_dakota_row_state:[model.beforeRow.row_state,model.afterRow.row_state],
    },
    authority_boundary:authorityBoundary(),
  };
}

function buildDecision(model) {
  const candidate = model.candidate;
  return {
    schema_version:'ssc-rd04-nd-current-public-record-gap-promotion-decision@1',
    wave_id:'SSC-RD-W03', lane_id:'RD-04', class_id:'RD-04-C02', issue:1017,
    decision:'promote_exact_validated_public_record_gap_candidate',
    candidate_id:candidate.candidate_id, decision_id:candidate.decision_id,
    unit_id:candidate.unit_id, field_id:candidate.field_id,
    current_state:candidate.current_state, target_state:candidate.target_state,
    current_cell_sha256:C.CURRENT_TARGET_SHA, promoted_cell_sha256:C.PROPOSED_TARGET_SHA,
    evidence_source_ids:structuredClone(candidate.proposed_cell.evidence_source_ids),
    typed_gap:candidate.proposed_cell.typed_gap,
    value:structuredClone(candidate.proposed_cell.value),
    prohibited_inferences:structuredClone(candidate.proposed_cell.value.prohibited_inferences),
    validation:{
      state:'validated_exact_current_cell', validation_product_commit:C.VALIDATION_PRODUCT_COMMIT,
      validation_merge_commit:C.VALIDATION_MERGE, validation_artifact_id:C.VALIDATION_ARTIFACT_ID,
      validation_receipt_sha256:C.VALIDATION_RECEIPT_SHA,
      separate_promotion_product_authorized:true,
    },
    row_state_transition:{
      authorized:false, executed:false,
      row_state_cell_sha256_before:C.CURRENT_ROW_STATE_SHA,
      row_state_cell_sha256_after:C.CURRENT_ROW_STATE_SHA,
      north_dakota_row_state_before:model.beforeRow.row_state,
      north_dakota_row_state_after:model.afterRow.row_state,
    },
    authority_boundary:authorityBoundary(),
  };
}

function buildLedger(model) {
  return {
    schema_version:'ssc-rd04-nd-current-public-record-gap-cell-promotion-ledger@1',
    wave_id:'SSC-RD-W03', lane_id:'RD-04', class_id:'RD-04-C02', issue:1017,
    promotion_count:1, matrix_update_count:1, row_state_mutation_count:0, row_terminalization_count:0,
    promotion:{
      unit_id:model.afterRow.unit_id, postal_code:model.afterRow.postal_code,
      state_name:model.afterRow.state_name, field_id:model.candidate.field_id,
      field_ordinal:model.afterTarget.field_ordinal,
      cell_before:structuredClone(model.beforeTarget), cell_before_sha256:C.CURRENT_TARGET_SHA,
      cell_after:structuredClone(model.afterTarget), cell_after_sha256:C.PROPOSED_TARGET_SHA,
      row_before_sha256:C.CURRENT_ND_ROW_SHA, row_after_sha256:C.AFTER_ROW_SHA,
      row_state_cell_sha256_before:C.CURRENT_ROW_STATE_SHA,
      row_state_cell_sha256_after:C.CURRENT_ROW_STATE_SHA,
    },
    matrix_transition:{
      predecessor:{bytes:C.MATRIX_BYTES,sha256:C.MATRIX_SHA,git_blob_sha:C.MATRIX_BLOB},
      promoted:{bytes:C.PROMOTED_MATRIX_BYTES,sha256:C.PROMOTED_MATRIX_SHA,git_blob_sha:C.PROMOTED_MATRIX_BLOB},
      counts_before:{
        materialized_cells:model.matrix.counts.materialized_cells,
        terminal_cells:model.matrix.counts.terminal_cells,
        still_open_cells:model.matrix.counts.still_open_cells,
        terminal_substantive_cells:model.matrix.counts.terminal_substantive_cells,
        still_open_substantive_cells:model.matrix.counts.still_open_substantive_cells,
        terminal_units:model.matrix.counts.terminal_units,
        class_closed:model.matrix.counts.class_closed,
      },
      counts_after:{
        materialized_cells:model.promoted.counts.materialized_cells,
        terminal_cells:model.promoted.counts.terminal_cells,
        still_open_cells:model.promoted.counts.still_open_cells,
        terminal_substantive_cells:model.promoted.counts.terminal_substantive_cells,
        still_open_substantive_cells:model.promoted.counts.still_open_substantive_cells,
        terminal_units:model.promoted.counts.terminal_units,
        class_closed:model.promoted.counts.class_closed,
      },
      north_dakota_before:{row_state:model.beforeRow.row_state,terminal_fields:model.beforeRow.terminal_fields,open_fields:model.beforeRow.open_fields},
      north_dakota_after:{row_state:model.afterRow.row_state,terminal_fields:model.afterRow.terminal_fields,open_fields:model.afterRow.open_fields},
      unchanged_non_target_rows:49,
      unchanged_non_target_rows_sha256:C.UNCHANGED_ROWS_SHA,
    },
    authority_boundary:authorityBoundary(),
  };
}

function openCellProjection(row, cell) {
  return {
    unit_ordinal:row.unit_ordinal, unit_id:row.unit_id, postal_code:row.postal_code,
    state_name:row.state_name, row_state:row.row_state, field_ordinal:cell.field_ordinal,
    field_id:cell.field_id, state:cell.state, typed_gap:cell.typed_gap,
    authority_effect:cell.authority_effect, cell_sha256:sha(canon(cell)),
  };
}
function buildCensus(model) {
  const openCells=[];
  for (const row of model.promoted.rows) for (const cell of row.cells) if (!cell.terminal) openCells.push(openCellProjection(row,cell));
  const terminalRows=model.promoted.rows.filter(row=>row.open_fields===0);
  const ndOpen=openCells.filter(cell=>cell.unit_id==='US-STATE-ND');
  return {
    schema_version:'ssc-rd04-nd-current-public-record-gap-remaining-open-field-census@1',
    wave_id:'SSC-RD-W03', lane_id:'RD-04', class_id:'RD-04-C02', issue:1017,
    matrix_sha256:C.PROMOTED_MATRIX_SHA,
    open_cell_count:openCells.length,
    open_substantive_cell_count:openCells.filter(cell=>cell.field_id!=='field_and_row_terminal_state').length,
    open_row_state_cell_count:openCells.filter(cell=>cell.field_id==='field_and_row_terminal_state').length,
    terminal_cell_count:model.promoted.counts.terminal_cells,
    terminal_substantive_cell_count:model.promoted.counts.terminal_substantive_cells,
    terminal_unit_count:terminalRows.length,
    terminal_unit_ids:terminalRows.map(row=>row.unit_id),
    north_dakota:{
      row_state:model.afterRow.row_state, terminal_fields:model.afterRow.terminal_fields,
      open_fields:model.afterRow.open_fields, row_sha256:C.AFTER_ROW_SHA,
      remaining_open_cells:ndOpen,
      next_mechanical_frontier:'validate_the_dependent_row_state_cell_against_the_exact_postpromotion_row_then_terminalize_it_in_a_separate_product_only_if_qualified',
    },
    open_cells:openCells,
    class_closed:false,
    authority_boundary:externalBoundary(),
  };
}
function buildSummary(model) {
  return {
    schema_version:'ssc-rd04-nd-current-public-record-gap-promotion-summary@1',
    wave_id:'SSC-RD-W03', lane_id:'RD-04', class_id:'RD-04-C02', issue:1017,
    state:'one_exact_validated_candidate_promoted', candidate_id:model.candidate.candidate_id,
    promoted_field:model.candidate.field_id, promoted_state:model.candidate.target_state,
    typed_gap:model.candidate.proposed_cell.typed_gap, field_terminalizations:1,
    matrix_updates:1, row_state_mutations:0, row_terminalizations:0,
    counts:{
      materialized_cells:model.promoted.counts.materialized_cells,
      terminal_cells:model.promoted.counts.terminal_cells,
      still_open_cells:model.promoted.counts.still_open_cells,
      terminal_substantive_cells:model.promoted.counts.terminal_substantive_cells,
      still_open_substantive_cells:model.promoted.counts.still_open_substantive_cells,
      terminal_units:model.promoted.counts.terminal_units,
    },
    north_dakota:{terminal_fields:model.afterRow.terminal_fields,open_fields:model.afterRow.open_fields,row_state:model.afterRow.row_state,remaining_open_field:'field_and_row_terminal_state'},
    class_closed:false, next_bounded_operation:NEXT_OPERATION,
    authority_boundary:authorityBoundary(),
  };
}
function buildIndex(model) {
  return {
    schema_version:'ssc-rd04-nd-current-public-record-gap-promotion-index@1',
    wave_id:'SSC-RD-W03', lane_id:'RD-04', class_id:'RD-04-C02', issue:1017,
    promotion_input_custody_path:'promotion-input-custody.json',
    promotion_decision_path:'promotion-decision.json',
    cell_promotion_ledger_path:'cell-promotion-ledger.json',
    promoted_partial_field_matrix_path:'promoted-partial-field-matrix.json',
    remaining_open_field_census_path:'remaining-open-field-census.json',
    promotion_summary_path:'promotion-summary.json',
    counts:{validated_candidates:1,promoted_candidates:1,rejected_candidates:0,unique_cells_terminalized:1,matrix_updates:1,row_state_mutations:0,row_terminalizations:0,terminal_cells_before:model.matrix.counts.terminal_cells,terminal_cells_after:model.promoted.counts.terminal_cells,still_open_cells_after:model.promoted.counts.still_open_cells,still_open_substantive_cells_after:model.promoted.counts.still_open_substantive_cells,terminal_units_after:model.promoted.counts.terminal_units},
    current_result:{north_dakota_terminal_fields:model.afterRow.terminal_fields,north_dakota_open_fields:model.afterRow.open_fields,north_dakota_row_state:model.afterRow.row_state,class_closed:false,outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
    next_bounded_operation:NEXT_OPERATION,
  };
}

const DATA_NAMES=['promotion-input-custody.json','promotion-decision.json','cell-promotion-ledger.json','promoted-partial-field-matrix.json','remaining-open-field-census.json','promotion-summary.json','index.json'];
export function buildProduct(repoRoot=process.cwd()) {
  const model=buildModel(repoRoot);
  const objects={
    'promotion-input-custody.json':buildInputCustody(model),
    'promotion-decision.json':buildDecision(model),
    'cell-promotion-ledger.json':buildLedger(model),
    'promoted-partial-field-matrix.json':model.promoted,
    'remaining-open-field-census.json':buildCensus(model),
    'promotion-summary.json':buildSummary(model),
    'index.json':buildIndex(model),
  };
  return Object.fromEntries(DATA_NAMES.map(name=>[name,jsonBytes(objects[name])]));
}

if (process.argv[1]===fileURLToPath(import.meta.url)) {
  const outIndex=process.argv.indexOf('--out');
  const out=outIndex>=0?process.argv[outIndex+1]:null;
  const files=buildProduct(process.cwd());
  if (out) {
    fs.mkdirSync(out,{recursive:true});
    for (const [name,bytes] of Object.entries(files)) fs.writeFileSync(path.join(out,name),bytes);
  }
  console.log(JSON.stringify({state:'deterministic_product_rebuilt_from_predecessor_and_validated_candidate',files:Object.keys(files).length,promoted_matrix_sha256:C.PROMOTED_MATRIX_SHA},null,2));
}
