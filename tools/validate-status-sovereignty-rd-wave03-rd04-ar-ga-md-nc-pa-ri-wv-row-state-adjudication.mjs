import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, PREDECESSOR_MATRIX_PATH, PREDECESSOR_MATRIX_SHA256, PREDECESSOR_PRODUCT_COMMIT, PREDECESSOR_PRODUCT_TREE, PREDECESSOR_MERGE_COMMIT, TARGET_STATES, checkProduct } from './build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-row-state-adjudication.mjs';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalHash = (value) => sha256(Buffer.from(JSON.stringify(value)));
async function readText(root, rel, overrides = new Map()) { if (overrides.has(rel)) return overrides.get(rel); return readFile(path.join(root, rel), 'utf8'); }
async function readJson(root, rel, overrides = new Map()) { return JSON.parse(await readText(root, rel, overrides)); }
function assertNoneBoundary(value, label) {
  assert.equal(value.outside_human_dependency, false, `${label} outside-human drift`);
  assert.equal(value.external_contacts, 0, `${label} external contacts drift`);
  assert.equal(value.external_reviews, 0, `${label} external reviews drift`);
  assert.equal(value.reviewed_disposition_changes, 0, `${label} reviewed disposition drift`);
  for (const key of ['publication_effect','adoption_effect','graph_effect','prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect']) assert.equal(value[key], 'none', `${label} ${key} drift`);
}
function fieldStateCounts(matrix) { const counts={}; for (const row of matrix.rows) for (const cell of row.cells) counts[cell.state]=(counts[cell.state]||0)+1; return counts; }
function combinedManifest(entries) { return sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''))); }

export async function validateProduct(root = process.cwd(), overrides = new Map()) {
  await checkProduct(root, overrides);
  const rel=(name)=>`${DATA_DIR}/${name}`;
  const decisions=await readJson(root,rel('authored-row-state-decisions.json'),overrides);
  const custody=await readJson(root,rel('predecessor-custody.json'),overrides);
  const ledger=await readJson(root,rel('row-state-ledger.json'),overrides);
  const matrix=await readJson(root,rel('promoted-partial-field-matrix.json'),overrides);
  const census=await readJson(root,rel('remaining-open-field-census.json'),overrides);
  const summary=await readJson(root,rel('summary.json'),overrides);
  const index=await readJson(root,rel('index.json'),overrides);
  const manifest=await readJson(root,rel('product-manifest.json'),overrides);
  const predecessorText=await readText(root,PREDECESSOR_MATRIX_PATH,overrides);
  const predecessor=JSON.parse(predecessorText);
  assert.equal(sha256(Buffer.from(predecessorText)), PREDECESSOR_MATRIX_SHA256);
  assert.equal(custody.predecessor.product_commit,PREDECESSOR_PRODUCT_COMMIT);
  assert.equal(custody.predecessor.product_tree,PREDECESSOR_PRODUCT_TREE);
  assert.equal(custody.predecessor.merge_commit,PREDECESSOR_MERGE_COMMIT);
  assert.equal(predecessor.counts.terminal_cells,211);
  assert.equal(predecessor.counts.still_open_substantive_cells,192);
  assert.equal(decisions.decisions.length,7);
  assert.deepEqual(decisions.target_states,TARGET_STATES);
  assert.equal(ledger.rows.length,7);
  assert.deepEqual(ledger.rows.map((row)=>row.postal_code),TARGET_STATES);
  assert.equal(ledger.counts.newly_terminalized_row_state_cells,7);
  assert.equal(ledger.counts.substantive_field_changes,0);
  assert.equal(ledger.counts.terminal_units_before,3);
  assert.equal(ledger.counts.terminal_units_after,10);
  assert.equal(ledger.counts.class_closures,0);
  assert.equal(ledger.counts.cumulative_ledger_changes,0);
  assert.equal(matrix.rows.length,50);
  assert.equal(matrix.counts.materialized_cells,450);
  assert.equal(matrix.counts.inherited_terminal_cells,211);
  assert.equal(matrix.counts.terminal_cells,218);
  assert.equal(matrix.counts.still_open_cells,232);
  assert.equal(matrix.counts.terminal_substantive_cells,108);
  assert.equal(matrix.counts.still_open_substantive_cells,192);
  assert.equal(matrix.counts.row_terminal_state_cells_terminal,10);
  assert.equal(matrix.counts.row_terminal_state_cells_open,40);
  assert.equal(matrix.counts.terminal_units,10);
  assert.equal(matrix.counts.class_closed,false);
  assert.deepEqual(fieldStateCounts(matrix),{ evidence_complete:188, observed:17, not_publicly_recovered:13, still_open:232 });
  const predecessorByCode=new Map(predecessor.rows.map((row)=>[row.postal_code,row]));
  const matrixByCode=new Map(matrix.rows.map((row)=>[row.postal_code,row]));
  const ledgerByCode=new Map(ledger.rows.map((row)=>[row.postal_code,row]));
  for (const code of TARGET_STATES) {
    const before=predecessorByCode.get(code), after=matrixByCode.get(code), receipt=ledgerByCode.get(code);
    assert(before&&after&&receipt,`${code} row missing`);
    assert.equal(before.row_state,'still_open'); assert.equal(before.terminal_fields,8); assert.equal(before.open_fields,1); assert.equal(canonicalHash(before),receipt.predecessor_row_canonical_sha256);
    assert.equal(after.row_state,'terminal_fixed_public_record_obligation_complete'); assert.equal(after.terminal_fields,9); assert.equal(after.open_fields,0); assert.equal(canonicalHash(after),receipt.final_row_canonical_sha256);
    const beforeEvidence=before.cells.filter((cell)=>cell.field_id!=='field_and_row_terminal_state');
    const afterEvidence=after.cells.filter((cell)=>cell.field_id!=='field_and_row_terminal_state');
    assert.deepEqual(afterEvidence,beforeEvidence,`${code} substantive or custody field changed`);
    const beforeRowState=before.cells.find((cell)=>cell.field_id==='field_and_row_terminal_state');
    const afterRowState=after.cells.find((cell)=>cell.field_id==='field_and_row_terminal_state');
    assert.equal(beforeRowState.terminal,false); assert.equal(afterRowState.terminal,true); assert.equal(afterRowState.state,'evidence_complete');
    assert.equal(afterRowState.value.terminal_classification,'terminal_fixed_public_record_obligation_complete');
    assert.equal(afterRowState.value.completed_evidence_fields,8); assert.equal(afterRowState.value.class_effect,'none'); assert.equal(afterRowState.value.cumulative_ledger_effect,'none');
    assert.equal(afterRowState.typed_gap,null); assert.equal(afterRowState.authority_effect,'row_level_fixed_public_record_obligation_terminal_only');
  }
  for (const row of matrix.rows.filter((row)=>!TARGET_STATES.includes(row.postal_code))) assert.deepEqual(row,predecessorByCode.get(row.postal_code),`${row.postal_code} non-target row changed`);
  assert.deepEqual(matrix.row_state_product,predecessor.row_state_product,'prior CA-SD-WA row-state custody changed');
  assert.deepEqual(matrix.minimum_frontier_capture_adjudication_product,predecessor.minimum_frontier_capture_adjudication_product,'MF7 capture custody changed');
  assert.equal(matrix.minimum_frontier_row_state_product.predecessor_merge_commit,PREDECESSOR_MERGE_COMMIT);
  assert.equal(census.counts.terminal_cells,218); assert.equal(census.counts.still_open_cells,232); assert.equal(census.counts.terminal_substantive_cells,108); assert.equal(census.counts.still_open_substantive_cells,192);
  assert.equal(census.counts.terminal_units,10); assert.equal(census.counts.open_units,40); assert.equal(census.counts.class_closed,false); assert.equal(census.terminal_rows.length,10); assert.equal(census.open_cells.length,232);
  assert.equal(census.field_counts.field_and_row_terminal_state.terminal,10); assert.equal(census.field_counts.field_and_row_terminal_state.open,40);
  assert.equal(summary.transition.newly_terminalized_row_state_cells,7); assert.equal(summary.transition.substantive_field_changes,0); assert.equal(summary.transition.terminal_cells_before,211); assert.equal(summary.transition.terminal_cells_after,218); assert.equal(summary.transition.still_open_substantive_cells_after,192); assert.equal(summary.transition.terminal_units_after,10); assert.equal(summary.class_closed,false); assert.equal(summary.cumulative_ledger_effect,'none');
  assert.equal(index.counts.terminal_cells_before,211); assert.equal(index.counts.terminal_cells_after,218); assert.equal(index.counts.still_open_substantive_cells_after,192); assert.equal(index.counts.terminal_units_after,10); assert.equal(index.counts.open_units_after,40); assert.equal(index.current_result.class_closed,false); assert.equal(index.current_result.cumulative_ledger_effect,'none');
  assert.equal(manifest.permanent_data_files,8); assert.equal(manifest.manifest_entries,7); assert.equal(manifest.entries.length,7); assert.equal(manifest.file_set_combined_sha256,combinedManifest(manifest.entries));
  assert.equal(manifest.terminal_cells_before,211); assert.equal(manifest.terminal_cells_after,218); assert.equal(manifest.still_open_substantive_cells_after,192); assert.equal(manifest.terminal_units_after,10); assert.equal(manifest.class_closed,false); assert.equal(manifest.cumulative_ledger_effect,'none');
  for (const entry of manifest.entries) { const text=await readText(root,rel(entry.path),overrides); assert.equal(Buffer.byteLength(text),entry.bytes,`${entry.path} bytes drift`); assert.equal(sha256(Buffer.from(text)),entry.sha256,`${entry.path} digest drift`); }
  assertNoneBoundary(decisions.authority_boundary,'decisions'); assertNoneBoundary(custody.authority_boundary,'custody'); assertNoneBoundary(ledger.authority_boundary,'ledger'); assertNoneBoundary(census.authority_boundary,'census'); assertNoneBoundary(summary.authority_boundary,'summary'); assertNoneBoundary(manifest.authority_boundary,'manifest');
  assert.equal(matrix.current_result.class_closed,false); assert.equal(matrix.current_result.field_matrix_terminal,false); assert.equal(matrix.current_result.outside_human_dependency,false);
  for (const key of ['reviewed_disposition_effect','publication_effect','adoption_effect','graph_effect','prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect']) assert.equal(matrix.current_result[key],'none',`matrix ${key} drift`);
  return { terminal_cells:218, still_open_cells:232, terminal_substantive_cells:108, still_open_substantive_cells:192, terminal_units:10, open_units:40, class_closed:false };
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){const result=await validateProduct(process.cwd());console.log(`rd04_mf7_row_state_validation=pass terminal_cells=${result.terminal_cells} open_substantive=${result.still_open_substantive_cells} terminal_units=${result.terminal_units}`);}
