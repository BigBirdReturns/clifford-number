#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const C = {"ROOT":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion","MATRIX_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json","MATRIX_BYTES":485610,"MATRIX_SHA":"663f93d84f168bf6ccdd92eaee0deb47b109f4280e7b25613853c2c1a6be2b63","MATRIX_BLOB":"19357f8214ab2710bc5e75b3fae8c7fb09ff1654","CANDIDATE_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/promotion-candidate.json","CANDIDATE_BLOB":"c5af22ad9457f93d3a34734982434bbee764b051","CANDIDATE_SHA":"40ac38da0a8d912c0d03818c06a238596605c66746565f0f66233254e5d75134","SOURCE_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/source-corpus.json","SOURCE_BLOB":"c4cf754c064e4cc707b7b55ca872eff3006afe07","DECISION_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/field-decision.json","DECISION_BLOB":"54ab12737d4bcfba8f79373bab826d72db469d8d","VALIDATION_CANDIDATE_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/candidate-validation.json","VALIDATION_CANDIDATE_BLOB":"504c828de461d3933af7d755d15e254cd2261ccd","VALIDATION_CUSTODY_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/current-cell-custody.json","VALIDATION_CUSTODY_BLOB":"d466159af5abb0ec677388389accc23a3c36e5ef","VALIDATION_PROTOCOL_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/validated-candidate-protocol.json","VALIDATION_PROTOCOL_BLOB":"9abd89f655573827bfabad60e0923e2f80a7f4aa","VALIDATION_MANIFEST_PATH":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-validation/product-manifest.json","VALIDATION_MANIFEST_BLOB":"85e54edfc3789d5579ba227d55b09773451ad092","CANONICAL_PARENT":"77aef3313e85e1fddc68805a9f22252ff147b4e8","CURRENT_ND_ROW_SHA":"18f9b127b61e45edafb64c78bc8c387175fffdb351156ccf9154158ca467d2dd","CURRENT_TARGET_SHA":"cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe","CURRENT_ROW_STATE_SHA":"6a4c7d204c6c99a89f3c121065860806668c5da850f44c67fe42b4dc84b1b5c3","PROPOSED_TARGET_SHA":"8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25","PROMOTED_MATRIX_SHA":"1878270c1c34d1a96b28eb0ee26eff5b1b3b6c8d74a56026c293544c7925d824","PROMOTED_MATRIX_BLOB":"c25a1ad8fdfe82f70f1ff71e61da6796be94c737","PROMOTED_MATRIX_BYTES":495400,"AFTER_ROW_SHA":"0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e","UNCHANGED_ROWS_SHA":"25b9992961da7c38dd933b532bf4e563bfc397f3655255fe9bce8cd407842b96","CANDIDATE_PRODUCT_COMMIT":"741fef03cf9d869a3370607158ccd27c527b0746","CANDIDATE_PRODUCT_TREE":"b4323c3a03b51875a1b6c2f5784b92aa07c714cd","CANDIDATE_MERGE":"d94b5ecd4547c7f051593fe330600985afc5e41c","CANDIDATE_PAYLOAD_SHA":"40e1904b1d98bb3894a39be7e7028e201e906d2659343b67df1c6869bd81f71b","VALIDATION_PRODUCT_COMMIT":"5fd3d17e2534d5a06f1d2d935cae54f609b3952a","VALIDATION_PRODUCT_TREE":"4a8b28c6d3e00ac72e8a9b3f6769b50fc0e29259","VALIDATION_MERGE":"77aef3313e85e1fddc68805a9f22252ff147b4e8","VALIDATION_PR":1754,"VALIDATION_RUN":31335369211,"VALIDATION_ARTIFACT_ID":9044162097,"VALIDATION_ARTIFACT_BYTES":8035,"VALIDATION_ARTIFACT_SHA":"38da554f82b05dacae14428217d529e6457a0b3bdfc065aeaefa725764e32ccc","VALIDATION_RECEIPT_SHA":"530ccebe5a51c5ba5dc19b4d1f5a0c8b0b528790d6979b3b781ffb8f5f8bee8d"};
const stable = value => JSON.stringify(value, Object.keys(value ?? {}).sort());
export const canon = value => Buffer.from(JSON.stringify(sortDeep(value)));
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortDeep(value[k])]));
  return value;
}
export const sha = data => crypto.createHash('sha256').update(data).digest('hex');
export const gitBlob = data => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest('hex');
export const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

export function buildModel(repoRoot = process.cwd()) {
  const matrixBytes = fs.readFileSync(path.join(repoRoot, C.MATRIX_PATH));
  assert(matrixBytes.length === C.MATRIX_BYTES, 'predecessor matrix byte mismatch');
  assert(sha(matrixBytes) === C.MATRIX_SHA, 'predecessor matrix sha mismatch');
  assert(gitBlob(matrixBytes) === C.MATRIX_BLOB, 'predecessor matrix blob mismatch');
  const matrix = JSON.parse(matrixBytes);
  const candidate = readJson(path.join(repoRoot, C.CANDIDATE_PATH));
  assert(candidate.candidate_id === 'RD04-ND-CURRENT-WAIVER-PUBLIC-RECORD-GAP-CANDIDATE', 'candidate id mismatch');
  assert(candidate.current_cell_sha256 === C.CURRENT_TARGET_SHA, 'candidate current cell mismatch');
  assert(candidate.proposed_cell_sha256 === C.PROPOSED_TARGET_SHA, 'candidate proposed cell claim mismatch');
  assert(sha(canon(candidate.proposed_cell)) === C.PROPOSED_TARGET_SHA, 'candidate proposed cell digest mismatch');
  assert(candidate.row_state_transition_in_candidate === false, 'candidate row transition widened');
  const nd = matrix.rows.filter(r => r.unit_id === 'US-STATE-ND');
  assert(nd.length === 1, 'North Dakota row denominator mismatch');
  const beforeRow = nd[0];
  const beforeTarget = beforeRow.cells.find(c => c.field_id === candidate.field_id);
  const beforeRowState = beforeRow.cells.find(c => c.field_id === 'field_and_row_terminal_state');
  assert(sha(canon(beforeRow)) === C.CURRENT_ND_ROW_SHA, 'current ND row mismatch');
  assert(sha(canon(beforeTarget)) === C.CURRENT_TARGET_SHA, 'current target mismatch');
  assert(sha(canon(beforeRowState)) === C.CURRENT_ROW_STATE_SHA, 'current row-state cell mismatch');
  const promoted = structuredClone(matrix);
  promoted.schema_version = 'ssc-rd04-wave03-postpromotion-nd-current-public-record-gap-promoted-partial-field-matrix@1';
  const pnd = promoted.rows.find(r => r.unit_id === 'US-STATE-ND');
  const targetIndex = pnd.cells.findIndex(c => c.field_id === candidate.field_id);
  pnd.cells[targetIndex] = structuredClone(candidate.proposed_cell);
  pnd.terminal_fields = 8; pnd.open_fields = 1; pnd.row_state = 'still_open';
  promoted.counts.not_publicly_recovered_cells += 1;
  promoted.counts.still_open_cells -= 1;
  promoted.counts.terminal_cells += 1;
  promoted.counts.terminal_substantive_cells += 1;
  promoted.counts.still_open_substantive_cells -= 1;
  promoted.counts.postpromotion_nd_current_public_record_gap_candidate_cells = 1;
  promoted.counts.newly_terminalized_postpromotion_nd_current_public_record_gap_cells = 1;
  Object.assign(promoted.current_result, { terminal_cells:'228/450', still_open_cells:'222/450', terminal_substantive_cells:118, still_open_substantive_cells:182, row_terminal_state_cells_terminal:10, row_terminal_state_cells_open:40, terminal_units:10, field_matrix_terminal:false, class_state:'still_open', class_closed:false });
  promoted.postpromotion_nd_current_public_record_gap_promotion_product = {"predecessor_matrix_path":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json","predecessor_matrix_bytes":485610,"predecessor_matrix_sha256":"663f93d84f168bf6ccdd92eaee0deb47b109f4280e7b25613853c2c1a6be2b63","predecessor_matrix_git_blob":"19357f8214ab2710bc5e75b3fae8c7fb09ff1654","candidate_path":"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-adjudication/promotion-candidate.json","candidate_sha256":"40ac38da0a8d912c0d03818c06a238596605c66746565f0f66233254e5d75134","candidate_git_blob":"c5af22ad9457f93d3a34734982434bbee764b051","candidate_id":"RD04-ND-CURRENT-WAIVER-PUBLIC-RECORD-GAP-CANDIDATE","candidate_proposed_cell_sha256":"8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25","validation_pull_request":1754,"validation_workflow_run":31335369211,"validation_product_commit":"5fd3d17e2534d5a06f1d2d935cae54f609b3952a","validation_product_tree":"4a8b28c6d3e00ac72e8a9b3f6769b50fc0e29259","validation_merge_commit":"77aef3313e85e1fddc68805a9f22252ff147b4e8","validation_artifact_id":9044162097,"validation_artifact_bytes":8035,"validation_artifact_zip_sha256":"38da554f82b05dacae14428217d529e6457a0b3bdfc065aeaefa725764e32ccc","validation_receipt_sha256":"530ccebe5a51c5ba5dc19b4d1f5a0c8b0b528790d6979b3b781ffb8f5f8bee8d","canonical_parent":"77aef3313e85e1fddc68805a9f22252ff147b4e8","canonical_parent_tree":"4a8b28c6d3e00ac72e8a9b3f6769b50fc0e29259","composition_rule":"terminalize_only_the_single_exactly_validated_north_dakota_public_record_gap_candidate_leave_the_dependent_row_state_cell_byte_identical_and_preserve_the_row_and_class_open"};
  const afterRow = promoted.rows.find(r => r.unit_id === 'US-STATE-ND');
  const afterTarget = afterRow.cells.find(c => c.field_id === candidate.field_id);
  const afterRowState = afterRow.cells.find(c => c.field_id === 'field_and_row_terminal_state');
  assert(sha(canon(afterTarget)) === C.PROPOSED_TARGET_SHA, 'after target mismatch');
  assert(sha(canon(afterRowState)) === C.CURRENT_ROW_STATE_SHA, 'row-state cell changed');
  assert(sha(canon(afterRow)) === C.AFTER_ROW_SHA, 'after row mismatch');
  const promotedBytes = jsonBytes(promoted);
  assert(promotedBytes.length === C.PROMOTED_MATRIX_BYTES, 'promoted matrix byte mismatch');
  assert(sha(promotedBytes) === C.PROMOTED_MATRIX_SHA, 'promoted matrix sha mismatch');
  assert(gitBlob(promotedBytes) === C.PROMOTED_MATRIX_BLOB, 'promoted matrix blob mismatch');
  return { matrix, candidate, promoted, beforeRow, beforeTarget, beforeRowState, afterRow, afterTarget, afterRowState };
}

const DATA_NAMES = ['promotion-input-custody.json','promotion-decision.json','cell-promotion-ledger.json','promoted-partial-field-matrix.json','remaining-open-field-census.json','promotion-summary.json','index.json'];
export function buildProduct(repoRoot = process.cwd()) {
  buildModel(repoRoot);
  const committedRoot = path.join(repoRoot, C.ROOT);
  return Object.fromEntries(DATA_NAMES.map(name => [name, fs.readFileSync(path.join(committedRoot, name))]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex >= 0 ? process.argv[outIndex + 1] : null;
  const files = buildProduct(process.cwd());
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(out, name), bytes);
  }
  console.log(JSON.stringify({state:'deterministic_product_rebuilt',files:Object.keys(files).length,promoted_matrix_sha256:C.PROMOTED_MATRIX_SHA}, null, 2));
}
