#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { C, canon, sha, gitBlob, buildModel, buildProduct } from './build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const read = (root, name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const deepEqual = (a,b) => JSON.stringify(a) === JSON.stringify(b);

export function loadModel(repoRoot = process.cwd()) {
  const root = path.join(repoRoot, C.ROOT);
  return {
    repoRoot, root,
    input: read(root,'promotion-input-custody.json'),
    decision: read(root,'promotion-decision.json'),
    ledger: read(root,'cell-promotion-ledger.json'),
    matrix: read(root,'promoted-partial-field-matrix.json'),
    census: read(root,'remaining-open-field-census.json'),
    summary: read(root,'promotion-summary.json'),
    index: read(root,'index.json'),
    manifest: read(root,'product-manifest.json'),
  };
}

export function validateModel(m) {
  const { promoted, candidate } = buildModel(m.repoRoot);
  const deterministic = buildProduct(m.repoRoot);
  const productObjects = {
    'promotion-input-custody.json': m.input,
    'promotion-decision.json': m.decision,
    'cell-promotion-ledger.json': m.ledger,
    'promoted-partial-field-matrix.json': m.matrix,
    'remaining-open-field-census.json': m.census,
    'promotion-summary.json': m.summary,
    'index.json': m.index,
  };
  for (const [name, object] of Object.entries(productObjects)) {
    const rebuilt = JSON.parse(deterministic[name].toString('utf8'));
    assert(deepEqual(object, rebuilt), `committed ${name} differs from deterministic build`);
  }
  assert(deepEqual(m.matrix, promoted), 'committed promoted matrix differs from deterministic build');
  assert(m.summary.state === 'one_exact_validated_candidate_promoted', 'summary state mismatch');
  assert(m.summary.candidate_id === candidate.candidate_id, 'summary candidate mismatch');
  assert(m.summary.field_terminalizations === 1 && m.summary.matrix_updates === 1, 'summary effect denominator mismatch');
  assert(m.summary.row_state_mutations === 0 && m.summary.row_terminalizations === 0, 'summary row effect widened');
  assert(m.summary.class_closed === false, 'summary class closed');
  assert(m.decision.current_cell_sha256 === C.CURRENT_TARGET_SHA && m.decision.promoted_cell_sha256 === C.PROPOSED_TARGET_SHA, 'decision cell hashes mismatch');
  assert(Array.isArray(m.decision.evidence_source_ids) && m.decision.evidence_source_ids.length === 7 && deepEqual(m.decision.evidence_source_ids, candidate.proposed_cell.evidence_source_ids), 'decision evidence-source denominator mismatch');
  assert(m.decision.row_state_transition.authorized === false && m.decision.row_state_transition.executed === false, 'decision row transition widened');
  assert(m.decision.prohibited_inferences.includes('do_not_close_rd04_c02'), 'class-closure refusal missing');
  assert(m.ledger.promotion_count === 1 && m.ledger.matrix_update_count === 1, 'ledger denominator mismatch');
  assert(m.ledger.row_state_mutation_count === 0 && m.ledger.row_terminalization_count === 0, 'ledger row effect widened');
  assert(m.ledger.promotion.cell_before_sha256 === C.CURRENT_TARGET_SHA && m.ledger.promotion.cell_after_sha256 === C.PROPOSED_TARGET_SHA, 'ledger target mismatch');
  assert(m.ledger.promotion.row_state_cell_sha256_before === C.CURRENT_ROW_STATE_SHA && m.ledger.promotion.row_state_cell_sha256_after === C.CURRENT_ROW_STATE_SHA, 'row-state cell changed');
  assert(m.ledger.matrix_transition.promoted.sha256 === C.PROMOTED_MATRIX_SHA && m.ledger.matrix_transition.promoted.git_blob_sha === C.PROMOTED_MATRIX_BLOB, 'promoted matrix identity mismatch');
  assert(m.ledger.matrix_transition.unchanged_non_target_rows === 49 && m.ledger.matrix_transition.unchanged_non_target_rows_sha256 === C.UNCHANGED_ROWS_SHA, 'unchanged row denominator mismatch');
  assert(m.matrix.counts.materialized_cells === 450 && m.matrix.counts.terminal_cells === 228 && m.matrix.counts.still_open_cells === 222, 'matrix global counts mismatch');
  assert(m.matrix.counts.terminal_substantive_cells === 118 && m.matrix.counts.still_open_substantive_cells === 182, 'matrix substantive counts mismatch');
  assert(m.matrix.counts.terminal_units === 10 && m.matrix.counts.class_closed === false, 'matrix unit or class mismatch');
  const nd = m.matrix.rows.find(r => r.unit_id === 'US-STATE-ND');
  assert(nd && nd.row_state === 'still_open' && nd.terminal_fields === 8 && nd.open_fields === 1, 'North Dakota row projection mismatch');
  const target = nd.cells.find(c => c.field_id === candidate.field_id);
  const rowState = nd.cells.find(c => c.field_id === 'field_and_row_terminal_state');
  assert(target.state === 'not_publicly_recovered' && target.terminal === true, 'target not terminalized as bounded gap');
  assert(sha(canon(target)) === C.PROPOSED_TARGET_SHA, 'target canonical digest mismatch');
  assert(rowState.state === 'still_open' && rowState.terminal === false && sha(canon(rowState)) === C.CURRENT_ROW_STATE_SHA, 'dependent row-state cell changed');
  assert(m.census.open_cell_count === 222 && m.census.open_substantive_cell_count === 182 && m.census.open_row_state_cell_count === 40, 'open census counts mismatch');
  assert(m.census.open_cells.length === 222, 'open census denominator mismatch');
  const ndOpen = m.census.open_cells.filter(x => x.unit_id === 'US-STATE-ND');
  assert(ndOpen.length === 1 && ndOpen[0].field_id === 'field_and_row_terminal_state', 'North Dakota remaining frontier mismatch');
  assert(m.index.counts.promoted_candidates === 1 && m.index.counts.unique_cells_terminalized === 1 && m.index.counts.matrix_updates === 1, 'index promotion counts mismatch');
  for (const obj of [m.input.authority_boundary,m.decision.authority_boundary,m.ledger.authority_boundary,m.summary.authority_boundary]) {
    assert(obj.source_requests === 0 && obj.route_executions === 0 && obj.source_admissions === 0, 'network/source authority widened');
    assert(obj.field_terminalizations === 1 && obj.matrix_updates === 1, 'field/matrix denominator mismatch');
    assert(obj.row_state_mutations === 0 && obj.row_terminalizations === 0, 'row authority widened');
    assert(obj.class_closed === false && obj.cumulative_ledger_effect === 'none', 'class/ledger authority widened');
    assert(obj.publication_effect === 'none' && obj.adoption_effect === 'none' && obj.graph_effect === 'none', 'external effect widened');
    assert(obj.outside_human_dependency === false, 'outside-human dependency introduced');
  }
  assert(m.manifest.permanent_path_count === 14 && m.manifest.hashed_file_count === 13, 'manifest denominator mismatch');
  assert(m.manifest.authority_boundary.matrix_updates === 1 && m.manifest.authority_boundary.field_terminalizations === 1, 'manifest effect mismatch');
  const rows = [];
  for (const rec of m.manifest.hashed_files) {
    const bytes = fs.readFileSync(path.join(m.repoRoot, rec.path));
    assert(bytes.length === rec.bytes, `manifest bytes mismatch ${rec.path}`);
    assert(sha(bytes) === rec.sha256, `manifest sha mismatch ${rec.path}`);
    assert(gitBlob(bytes) === rec.git_blob, `manifest blob mismatch ${rec.path}`);
    rows.push(`${rec.path}\0${rec.sha256}\0${rec.bytes}\n`);
  }
  rows.sort();
  assert(crypto.createHash('sha256').update(rows.join('')).digest('hex') === m.manifest.combined_sha256, 'manifest combined digest mismatch');
  return {state:'qualified_one_cell_promotion',terminal_cells:228,open_cells:222,nd_terminal_fields:8,nd_open_fields:1,nd_row_state:'still_open'};
}

export function validate(repoRoot = process.cwd()) { return validateModel(loadModel(repoRoot)); }
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(validate(process.cwd()), null, 2));
