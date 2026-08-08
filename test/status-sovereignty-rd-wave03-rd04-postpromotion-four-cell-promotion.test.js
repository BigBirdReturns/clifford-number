import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  OUTPUT_DIR,
  OUTPUT_NAMES,
  buildProduct,
  sha256Bytes,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs';
import {
  loadProduct,
  validateProduct,
} from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs';

const base = loadProduct();
const result = validateProduct(base, { root: ROOT, verifyFiles: true, compareDerived: true });
assert.deepEqual(result, {
  candidate_count: 4,
  promoted_cells: 4,
  held_cells: 2,
  source_target_checks: 6,
  locator_target_checks: 8,
  terminal_cells: 226,
  still_open_substantive_cells: 184,
  terminal_units: 10,
  class_closed: false,
});

const before = Object.fromEntries(OUTPUT_NAMES.map((name) => {
  const bytes = fs.readFileSync(path.join(ROOT, OUTPUT_DIR, name));
  return [name, sha256Bytes(bytes)];
}));
buildProduct();
const after = Object.fromEntries(OUTPUT_NAMES.map((name) => {
  const bytes = fs.readFileSync(path.join(ROOT, OUTPUT_DIR, name));
  return [name, sha256Bytes(bytes)];
}));
assert.deepEqual(after, before, 'builder replay changed permanent output bytes');

const mutations = [
  ['canonical parent', (p) => { p.custody.canonical_parent = '0'.repeat(40); }],
  ['canonical tree', (p) => { p.custody.canonical_parent_tree = '0'.repeat(40); }],
  ['validation run', (p) => { p.custody.validation_receipt.workflow_run += 1; }],
  ['validation artifact', (p) => { p.custody.validation_receipt.artifact_id += 1; }],
  ['validation digest', (p) => { p.custody.validation_receipt.receipt_sha256 = '0'.repeat(64); }],
  ['validation candidates', (p) => { p.custody.validation_receipt.candidate_count = 3; }],
  ['validation admissible count', (p) => { p.custody.validation_receipt.admissible_candidate_count = 3; }],
  ['validation scope hold', (p) => { p.custody.validation_receipt.scope_held_candidate_count = 1; }],
  ['validation held cells', (p) => { p.custody.validation_receipt.held_cell_count = 1; }],
  ['validation source checks', (p) => { p.custody.validation_receipt.route_target_source_checks = 5; }],
  ['validation locator checks', (p) => { p.custody.validation_receipt.route_target_locator_checks = 7; }],
  ['validation promotion authority', (p) => { p.custody.validation_receipt.promotion_authority_created = true; }],
  ['input matrix blob', (p) => { p.custody.inputs.matrix.git_blob_sha = '0'.repeat(40); }],
  ['input protocol sha', (p) => { p.custody.inputs.protocol.sha256 = '0'.repeat(64); }],
  ['decision count', (p) => { p.decisions.candidate_count = 3; }],
  ['admissible count', (p) => { p.decisions.admissible_candidate_count = 3; }],
  ['scope held candidate', (p) => { p.decisions.scope_held_candidate_count = 1; }],
  ['held decision leak', (p) => { p.decisions.excluded_held_decisions.pop(); }],
  ['candidate cell identity', (p) => { p.decisions.decisions[0].candidate_field = 'implementation_effective_date_or_typed_gap'; }],
  ['candidate route target', (p) => { p.decisions.decisions[0].source_route_ids.push('RD04-W03-PPN-MT-003'); }],
  ['candidate locator target', (p) => { p.decisions.decisions[0].evidence_locators.push({route_id:'RD04-W03-PPN-MT-003',anchor:'x'}); }],
  ['candidate outcome', (p) => { p.decisions.decisions[0].promotion_outcome = 'hold_open'; }],
  ['candidate before state', (p) => { p.decisions.decisions[0].field_cell_state_before = 'evidence_complete'; }],
  ['candidate after state', (p) => { p.decisions.decisions[0].field_cell_state_after = 'still_open'; }],
  ['candidate publication effect', (p) => { p.decisions.decisions[0].publication_effect = 'published'; }],
  ['candidate outside human', (p) => { p.decisions.decisions[0].outside_human_dependency = true; }],
  ['decision matrix updates', (p) => { p.decisions.authority_boundary.matrix_updates = 5; }],
  ['decision row mutation', (p) => { p.decisions.authority_boundary.row_state_mutations = 1; }],
  ['decision class closure', (p) => { p.decisions.authority_boundary.class_closed = true; }],
  ['ledger promoted cells', (p) => { p.ledger.counts.promoted_cells = 3; }],
  ['ledger held exclusions', (p) => { p.ledger.counts.excluded_held_decisions = 1; }],
  ['ledger terminal after', (p) => { p.ledger.counts.terminal_cells_after = 225; }],
  ['ledger substantive after', (p) => { p.ledger.counts.open_substantive_cells_after = 185; }],
  ['ledger source checks', (p) => { p.ledger.counts.route_target_source_checks = 5; }],
  ['ledger field counts', (p) => { p.ledger.field_promotion_counts.operative_state_implementation_authority_and_version = 0; }],
  ['matrix terminal cells', (p) => { p.matrix.counts.terminal_cells = 225; }],
  ['matrix open cells', (p) => { p.matrix.counts.still_open_cells = 225; }],
  ['matrix substantive cells', (p) => { p.matrix.counts.still_open_substantive_cells = 185; }],
  ['matrix terminal units', (p) => { p.matrix.counts.terminal_units = 11; }],
  ['matrix class closure', (p) => { p.matrix.current_result.class_closed = true; }],
  ['matrix validation receipt', (p) => { p.matrix.postpromotion_four_cell_promotion_product.validation_receipt_sha256 = '0'.repeat(64); }],
  ['MT target reopened', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-MT'); const cell=row.cells.find((c)=>c.field_id==='operative_state_implementation_authority_and_version'); cell.terminal=false; cell.state='still_open'; }],
  ['ND held authority terminalized', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-ND'); const cell=row.cells.find((c)=>c.field_id==='operative_state_implementation_authority_and_version'); cell.terminal=true; cell.state='evidence_complete'; }],
  ['ND held waiver terminalized', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-ND'); const cell=row.cells.find((c)=>c.field_id==='abawd_or_work_requirement_waiver_state_and_governing_period'); cell.terminal=true; cell.state='evidence_complete'; }],
  ['non-target cell drift', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-WY'); row.cells[0].typed_gap='drift'; }],
  ['MT row terminalized', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-MT'); row.row_state='terminal'; }],
  ['MT row gap', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-MT'); row.cells.find((c)=>c.field_id==='field_and_row_terminal_state').typed_gap='wrong'; }],
  ['ND row count', (p) => { const row=p.matrix.rows.find((r)=>r.unit_id==='US-STATE-ND'); row.open_fields=2; }],
  ['census terminal cells', (p) => { p.census.counts.terminal_cells = 225; }],
  ['census row terminalization', (p) => { p.census.authority_boundary.row_terminalizations = 1; }],
  ['summary candidates', (p) => { p.summary.input_counts.bounded_finding_candidates = 3; }],
  ['summary state denominator', (p) => { p.summary.input_counts.states_with_candidates = 3; }],
  ['summary route checks', (p) => { p.summary.route_target_checks.candidate_to_evidence_locators = 7; }],
  ['summary class closure', (p) => { p.summary.current_result.class_closed = true; }],
  ['summary graph effect', (p) => { p.summary.current_result.graph_effect = 'changed'; }],
  ['index promotions', (p) => { p.index.counts.candidate_findings_promoted = 3; }],
  ['index terminal after', (p) => { p.index.counts.terminal_cells_after = 225; }],
  ['index next operation', (p) => { p.index.next_bounded_operation = 'unbounded'; }],
  ['manifest path count', (p) => { p.manifest.permanent_path_count = 13; }],
  ['manifest hashed count', (p) => { p.manifest.hashed_file_count = 12; }],
  ['manifest path denominator', (p) => { p.manifest.permanent_paths.pop(); }],
  ['manifest matrix effect', (p) => { p.manifest.authority_boundary.matrix_updates = 3; }],
  ['manifest publication', (p) => { p.manifest.authority_boundary.publication_effect = 'published'; }],
];

let refused = 0;
for (const [label, mutate] of mutations) {
  const candidate = structuredClone(base);
  mutate(candidate);
  assert.throws(() => validateProduct(candidate, { root: ROOT, verifyFiles: false, compareDerived: false }), undefined, label);
  refused += 1;
}
assert.equal(refused, mutations.length);
console.log(JSON.stringify({postpromotion_four_cell_promotion:'pass',adversarial_refusals:refused,terminal_cells:result.terminal_cells,open_substantive:result.still_open_substantive_cells,class_closed:result.class_closed}));
