import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  OUTPUT_DIR,
  OUTPUT_NAMES,
  SCHEMA_PATH,
  TARGET,
  HELD,
  buildProduct,
  sha256Bytes,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs';
import {
  loadProduct,
  validateProduct,
} from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs';

const base = loadProduct();
const result = validateProduct(base, {root:ROOT,verifyFiles:true,compareDerived:true});
assert.deepEqual(result, {
  candidate_count:1,
  promoted_cells:1,
  held_cells:1,
  source_target_checks:1,
  locator_target_checks:3,
  terminal_cells:227,
  still_open_substantive_cells:183,
  terminal_units:10,
  north_dakota_open_fields:2,
  class_closed:false,
});

const replayPaths = [...OUTPUT_NAMES.map((name) => path.join(OUTPUT_DIR, name)), SCHEMA_PATH];
const before = Object.fromEntries(replayPaths.map((relative) => [relative, sha256Bytes(fs.readFileSync(path.join(ROOT, relative)))]));
buildProduct();
const after = Object.fromEntries(replayPaths.map((relative) => [relative, sha256Bytes(fs.readFileSync(path.join(ROOT, relative)))]));
assert.deepEqual(after, before, 'builder replay changed permanent product or schema bytes');

const ndRow = (p) => p.matrix.rows.find((row) => row.unit_id === TARGET.unitId);
const targetCell = (p) => ndRow(p).cells.find((cell) => cell.field_id === TARGET.fieldId);
const heldCell = (p) => ndRow(p).cells.find((cell) => cell.field_id === HELD.fieldId);
const rowStateCell = (p) => ndRow(p).cells.find((cell) => cell.field_id === 'field_and_row_terminal_state');

const mutations = [
  ['canonical parent', (p) => { p.custody.canonical_parent = '0'.repeat(40); }],
  ['canonical tree', (p) => { p.custody.canonical_parent_tree = '0'.repeat(40); }],
  ['main comparison base', (p) => { p.custody.main_reconciliation.comparison_base = '0'.repeat(40); }],
  ['main observed tree', (p) => { p.custody.main_reconciliation.observed_main_tree = '0'.repeat(40); }],
  ['main commit distance', (p) => { p.custody.main_reconciliation.commits_ahead = 1; }],
  ['main changed path denominator', (p) => { p.custody.main_reconciliation.changed_paths.pop(); }],
  ['main changed path digest', (p) => { p.custody.main_reconciliation.changed_paths_sha256 = '0'.repeat(64); }],
  ['main input overlap', (p) => { p.custody.main_reconciliation.overlapping_input_paths.push('data/intake/leak'); }],
  ['main permanent overlap', (p) => { p.custody.main_reconciliation.overlapping_permanent_paths.push('tools/leak.mjs'); }],
  ['main overlap status', (p) => { p.custody.main_reconciliation.overlap_status = 'drift'; }],
  ['validation parent', (p) => { p.custody.validation_receipt.validation_parent = '0'.repeat(40); }],
  ['validation parent tree', (p) => { p.custody.validation_receipt.validation_parent_tree = '0'.repeat(40); }],
  ['validation PR', (p) => { p.custody.validation_receipt.pull_request += 1; }],
  ['validation run', (p) => { p.custody.validation_receipt.workflow_run += 1; }],
  ['validation head', (p) => { p.custody.validation_receipt.head = '0'.repeat(40); }],
  ['validation artifact', (p) => { p.custody.validation_receipt.artifact_id += 1; }],
  ['validation artifact bytes', (p) => { p.custody.validation_receipt.artifact_bytes += 1; }],
  ['validation artifact digest', (p) => { p.custody.validation_receipt.artifact_zip_sha256 = '0'.repeat(64); }],
  ['validation receipt digest', (p) => { p.custody.validation_receipt.receipt_sha256 = '0'.repeat(64); }],
  ['validation ledger digest', (p) => { p.custody.validation_receipt.ledger_sha256 = '0'.repeat(64); }],
  ['validation inventory digest', (p) => { p.custody.validation_receipt.input_inventory_sha256 = '0'.repeat(64); }],
  ['validation state', (p) => { p.custody.validation_receipt.state = 'failed_closed'; }],
  ['validation candidates', (p) => { p.custody.validation_receipt.candidate_count = 0; }],
  ['validation admissible count', (p) => { p.custody.validation_receipt.admissible_candidate_count = 0; }],
  ['validation held count', (p) => { p.custody.validation_receipt.held_cell_count = 0; }],
  ['validation route checks', (p) => { p.custody.validation_receipt.route_target_checks = 0; }],
  ['validation locator checks', (p) => { p.custody.validation_receipt.locator_target_checks = 2; }],
  ['validation promotion authority', (p) => { p.custody.validation_receipt.promotion_authority_created = true; }],
  ['validation separate product', (p) => { p.custody.validation_receipt.separate_promotion_product_required = false; }],
  ['input matrix blob', (p) => { p.custody.inputs.matrix.git_blob_sha = '0'.repeat(40); }],
  ['input protocol sha', (p) => { p.custody.inputs.protocol.sha256 = '0'.repeat(64); }],
  ['target cell custody hash', (p) => { p.custody.target_cell.canonical_sha256 = '0'.repeat(64); }],
  ['held cell custody hash', (p) => { p.custody.excluded_held_cell.canonical_sha256 = '0'.repeat(64); }],
  ['held denominator leak', (p) => { p.custody.excluded_held_cell.excluded_from_candidate_denominator = false; }],
  ['source request widened', (p) => { p.custody.source_requests = 1; }],
  ['route execution widened', (p) => { p.custody.route_executions = 1; }],
  ['new source admission', (p) => { p.custody.new_source_admissions = 1; }],
  ['custody outside human', (p) => { p.custody.outside_human_dependency = true; }],
  ['custody publication', (p) => { p.custody.publication_effect = 'published'; }],
  ['decision candidate count', (p) => { p.decisions.candidate_count = 0; }],
  ['decision admissible count', (p) => { p.decisions.admissible_candidate_count = 0; }],
  ['decision scope hold', (p) => { p.decisions.scope_held_candidate_count = 1; }],
  ['decision denominator', (p) => { p.decisions.decisions.push(structuredClone(p.decisions.decisions[0])); }],
  ['held decision removed', (p) => { p.decisions.excluded_held_decisions.pop(); }],
  ['held decision disposition', (p) => { p.decisions.excluded_held_decisions[0].disposition = 'promote'; }],
  ['held decision terminal', (p) => { p.decisions.excluded_held_decisions[0].current_cell_terminal = true; }],
  ['candidate identity', (p) => { p.decisions.decisions[0].promotion_candidate_id = 'wrong'; }],
  ['candidate field', (p) => { p.decisions.decisions[0].candidate_field = HELD.fieldId; }],
  ['candidate route target', (p) => { p.decisions.decisions[0].source_route_ids.push(HELD.routeId); }],
  ['candidate source body', (p) => { p.decisions.decisions[0].source_body_sha256s[0] = '0'.repeat(64); }],
  ['candidate route receipt', (p) => { p.decisions.decisions[0].authoritative_route_receipt_sha256s[0] = '0'.repeat(64); }],
  ['candidate locator target', (p) => { p.decisions.decisions[0].evidence_locators[0].route_id = HELD.routeId; }],
  ['candidate outcome', (p) => { p.decisions.decisions[0].promotion_outcome = 'hold_open'; }],
  ['candidate before state', (p) => { p.decisions.decisions[0].field_cell_state_before = 'evidence_complete'; }],
  ['candidate after state', (p) => { p.decisions.decisions[0].field_cell_state_after = 'still_open'; }],
  ['candidate source checks', (p) => { p.decisions.decisions[0].route_target_source_checks = 0; }],
  ['candidate locator checks', (p) => { p.decisions.decisions[0].route_target_locator_checks = 2; }],
  ['candidate publication', (p) => { p.decisions.decisions[0].publication_effect = 'published'; }],
  ['candidate outside human', (p) => { p.decisions.decisions[0].outside_human_dependency = true; }],
  ['decision matrix updates', (p) => { p.decisions.authority_boundary.matrix_updates = 0; }],
  ['decision field terminalizations', (p) => { p.decisions.authority_boundary.field_terminalizations = 0; }],
  ['decision row mutation', (p) => { p.decisions.authority_boundary.row_state_mutations = 1; }],
  ['decision class closure', (p) => { p.decisions.authority_boundary.class_closed = true; }],
  ['ledger promoted cells', (p) => { p.ledger.counts.promoted_cells = 0; }],
  ['ledger held exclusions', (p) => { p.ledger.counts.excluded_held_decisions = 0; }],
  ['ledger terminal after', (p) => { p.ledger.counts.terminal_cells_after = 226; }],
  ['ledger open after', (p) => { p.ledger.counts.still_open_cells_after = 224; }],
  ['ledger substantive after', (p) => { p.ledger.counts.open_substantive_cells_after = 184; }],
  ['ledger source checks', (p) => { p.ledger.counts.route_target_source_checks = 0; }],
  ['ledger locator checks', (p) => { p.ledger.counts.route_target_locator_checks = 2; }],
  ['ledger field count', (p) => { p.ledger.field_promotion_counts.operative_state_implementation_authority_and_version = 0; }],
  ['ledger before hash', (p) => { p.ledger.cells[0].before_cell_sha256 = '0'.repeat(64); }],
  ['ledger after hash', (p) => { p.ledger.cells[0].after_cell_sha256 = '0'.repeat(64); }],
  ['ledger route', (p) => { p.ledger.cells[0].evidence_route_ids[0] = HELD.routeId; }],
  ['ledger publication', (p) => { p.ledger.cells[0].publication_effect = 'published'; }],
  ['ledger authority matrix', (p) => { p.ledger.authority_boundary.matrix_updates = 0; }],
  ['matrix terminal cells', (p) => { p.matrix.counts.terminal_cells = 226; }],
  ['matrix open cells', (p) => { p.matrix.counts.still_open_cells = 224; }],
  ['matrix substantive terminal', (p) => { p.matrix.counts.terminal_substantive_cells = 116; }],
  ['matrix substantive open', (p) => { p.matrix.counts.still_open_substantive_cells = 184; }],
  ['matrix terminal units', (p) => { p.matrix.counts.terminal_units = 11; }],
  ['matrix cumulative candidates', (p) => { p.matrix.counts.postpromotion_candidate_cells = 4; }],
  ['matrix ND candidate count', (p) => { p.matrix.counts.postpromotion_nd_followup_candidate_cells = 0; }],
  ['matrix class closure', (p) => { p.matrix.current_result.class_closed = true; }],
  ['matrix validation receipt', (p) => { p.matrix.postpromotion_nd_followup_one_cell_promotion_product.validation_receipt_sha256 = '0'.repeat(64); }],
  ['matrix canonical parent', (p) => { p.matrix.postpromotion_nd_followup_one_cell_promotion_product.canonical_parent = '0'.repeat(40); }],
  ['matrix validation parent', (p) => { p.matrix.postpromotion_nd_followup_one_cell_promotion_product.validation_parent = '0'.repeat(40); }],
  ['matrix main reconciliation digest', (p) => { p.matrix.postpromotion_nd_followup_one_cell_promotion_product.main_reconciliation_changed_paths_sha256 = '0'.repeat(64); }],
  ['target reopened', (p) => { targetCell(p).terminal = false; targetCell(p).state = 'still_open'; }],
  ['target route changed', (p) => { targetCell(p).evidence_source_ids[0] = HELD.routeId; }],
  ['target finding candidate', (p) => { targetCell(p).value.findings[0].candidate_id = 'wrong'; }],
  ['target source weight', (p) => { targetCell(p).value.findings[0].source_routes[0].substantive_weight_count = 2; }],
  ['target HTML review', (p) => { targetCell(p).value.findings[0].source_routes[0].all_visible_text_reviewed = false; }],
  ['target validation hold exclusion', (p) => { targetCell(p).value.findings[0].promotion_validation.held_cell_exclusion = 'fail'; }],
  ['held cell terminalized', (p) => { heldCell(p).terminal = true; heldCell(p).state = 'evidence_complete'; }],
  ['non-target cell drift', (p) => { const row=p.matrix.rows.find((item)=>item.unit_id==='US-STATE-WY'); row.cells[0].typed_gap='drift'; }],
  ['ND row count', (p) => { ndRow(p).open_fields = 1; }],
  ['ND row terminalized', (p) => { ndRow(p).row_state = 'terminal'; }],
  ['ND row-state gap', (p) => { rowStateCell(p).typed_gap = 'wrong'; }],
  ['census terminal cells', (p) => { p.census.counts.terminal_cells = 226; }],
  ['census open cells', (p) => { p.census.counts.still_open_cells = 224; }],
  ['census ND open fields', (p) => { p.census.state_rows.find((row)=>row.unit_id===TARGET.unitId).still_open_field_ids.pop(); }],
  ['census row terminalization', (p) => { p.census.authority_boundary.row_terminalizations = 1; }],
  ['summary candidates', (p) => { p.summary.input_counts.bounded_finding_candidates = 0; }],
  ['summary state denominator', (p) => { p.summary.input_counts.states_with_candidates = 2; }],
  ['summary locator checks', (p) => { p.summary.route_target_checks.candidate_to_evidence_locators = 2; }],
  ['summary terminal after', (p) => { p.summary.matrix_transition.terminal_cells_after = 226; }],
  ['summary ND open after', (p) => { p.summary.matrix_transition.north_dakota_open_fields_after = 3; }],
  ['summary held cells', (p) => { p.summary.current_result.held_north_dakota_cells_remaining = 0; }],
  ['summary class closure', (p) => { p.summary.current_result.class_closed = true; }],
  ['summary graph effect', (p) => { p.summary.current_result.graph_effect = 'changed'; }],
  ['summary next operation', (p) => { p.summary.next_bounded_operation = 'unbounded'; }],
  ['index promotions', (p) => { p.index.counts.candidate_findings_promoted = 0; }],
  ['index terminal after', (p) => { p.index.counts.terminal_cells_after = 226; }],
  ['index substantive open', (p) => { p.index.counts.still_open_substantive_fields_after = 184; }],
  ['index next operation', (p) => { p.index.next_bounded_operation = 'unbounded'; }],
  ['manifest path count', (p) => { p.manifest.permanent_path_count = 13; }],
  ['manifest hashed count', (p) => { p.manifest.hashed_file_count = 12; }],
  ['manifest path denominator', (p) => { p.manifest.permanent_paths.pop(); }],
  ['manifest matrix effect', (p) => { p.manifest.authority_boundary.matrix_updates = 0; }],
  ['manifest field effect', (p) => { p.manifest.authority_boundary.field_terminalizations = 0; }],
  ['manifest publication', (p) => { p.manifest.authority_boundary.publication_effect = 'published'; }],
];

let refused = 0;
for (const [label, mutate] of mutations) {
  const candidate = structuredClone(base);
  mutate(candidate);
  assert.throws(() => validateProduct(candidate, {root:ROOT,verifyFiles:false,compareDerived:false}), undefined, label);
  refused += 1;
}
assert.equal(refused, mutations.length);
console.log(JSON.stringify({postpromotion_nd_followup_one_cell_promotion:'pass',adversarial_refusals:refused,terminal_cells:result.terminal_cells,open_substantive:result.still_open_substantive_cells,north_dakota_open_fields:result.north_dakota_open_fields,class_closed:result.class_closed}));
