#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const C = Object.freeze({
  ROOT: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation',
  PREDECESSOR_MATRIX_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation/promoted-partial-field-matrix.json',
  PREDECESSOR_MATRIX_BYTES: 499923,
  PREDECESSOR_MATRIX_SHA: '9f9dc05a057396056771bb566c44e9c3779d8ef6b0d2c078f7ffff11d9c7e6cb',
  PREDECESSOR_MATRIX_BLOB: '6ba11a6025021e9df8ac6535be8c42499654c233',
  INPUT_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/input-custody.json',
  INPUT_BYTES: 6736,
  INPUT_SHA: 'e9f18c06884477c3797d47556bbc27ab108b05d7bc42ad1acf4e52c7cf96fb5e',
  INPUT_BLOB: '6e868e3c0ee7c780f58067ce43589e1a0658b706',
  DECISION_PATH: 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/row-state-decision.json',
  DECISION_BYTES: 5529,
  DECISION_SHA: '5b2f040b11a06b6b0a05c6ea60ba5a595a9529ecb50af15990bf6414bea5da78',
  DECISION_BLOB: 'ea6a6ae4884a0e91d0b2e753f190c79fd01dbb38',
  CANONICAL_PARENT: '0840358962621b0be3db6864ecec763327f35903',
  CANONICAL_PARENT_TREE: '38023f86bcc27527f9db8da9622bada00b3de542',
  CURRENT_ROW_SHA: '06ab54ffbb8deaed317cfef33c44e685c43e17f2b3f6bb7f2c715f9a38ed86cc',
  CURRENT_ROW_STATE_SHA: '221d9a1a9ecf55d786ab6f92faf77dd0795b3f4ef344cbccf64b4b72356ec2de',
  PROPOSED_ROW_STATE_SHA: 'ba173d03c2f82316ca79eb8b6627057db6fdb54113340ff0f9539a85e89a1f2d',
  RECONCILED_ROW_SHA: 'b6474320f690a653eae081cf655a090bb5d5da0f444e9a1c42077fd0b951bcbc',
  PROMOTED_MATRIX_BYTES: 502424,
  PROMOTED_MATRIX_SHA: '12e52344af0c8ec3d845b6f05f8a20014fa84504d10dbc9ee0674d37715abe1d',
  PROMOTED_MATRIX_BLOB: '741bda42b609f386d71090e6368af537fd334914',
  UNCHANGED_ROWS_SHA: '59844b18cb168d805e09bbac359303ac6f3cc705f33c60243d61aae8dc90b9d5',
});

export const FIELD_IDS = Object.freeze(["canonical_state_identity", "operative_state_implementation_authority_and_version", "implementation_effective_date_or_typed_gap", "abawd_or_work_requirement_waiver_state_and_governing_period", "discretionary_exemption_authority_and_reported_state_practice", "fitness_for_work_or_eligibility_screening_rule", "verification_evidence_and_staff_discretion_surface", "source_identities_and_exact_custody"]);
export const PROHIBITED_INFERENCES = Object.freeze(["do_not_infer_complete_state_implementation_truth_beyond_terminal_field_custody", "do_not_convert_not_publicly_recovered_fields_into_event_or_policy_absence", "do_not_infer_uniform_frontline_practice", "do_not_infer_person_level_outcome", "do_not_infer_national_prevalence", "do_not_infer_discrimination_or_racial_order", "do_not_infer_coordination_or_common_purpose", "do_not_infer_complete_compact", "do_not_close_rd04_c02_or_wave03_from_twelve_terminal_rows"]);
export const LIMITATIONS = Object.freeze(["row completion closes only the declared fixed public-record obligation for this state", "typed source gaps remain distinct from event, policy, practice, or implementation absence", "row completion does not establish uniform frontline practice or person-level outcome", "twelve terminal rows do not establish national prevalence or close RD-04-C02"]);
export const NEXT_OPERATION = 'continue_rd04_c02_across_the_remaining_thirty_eight_open_row_state_cells_and_one_hundred_eighty_two_open_substantive_cells_without_reopening_montana_or_closing_the_class';
export const AUTHORITY_KEYS = Object.freeze([
  'source_requests','route_executions','source_admissions','field_terminalizations','matrix_updates',
  'row_state_mutations','row_terminalizations','class_closed','cumulative_ledger_effect',
  'publication_effect','adoption_effect','graph_effect','outside_human_dependency',
]);

export const sortDeep = value => {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortDeep(value[key])]));
  return value;
};
export const canon = value => Buffer.from(JSON.stringify(sortDeep(value)));
export const sha = data => crypto.createHash('sha256').update(data).digest('hex');
export const gitBlob = data => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest('hex');
export const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export const assertExactKeys = (value, expected, label) => {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be object`);
  assert(same(Object.keys(value).sort(), [...expected].sort()), `${label} key set mismatch`);
};
const readBytes = (repoRoot, relativePath, overrides = new Map()) => overrides.has(relativePath) ? Buffer.from(overrides.get(relativePath)) : fs.readFileSync(path.join(repoRoot, relativePath));
const readJson = (repoRoot, relativePath, overrides = new Map()) => JSON.parse(readBytes(repoRoot, relativePath, overrides));
export const authorityBoundary = () => ({
  source_requests:0, route_executions:0, source_admissions:0, field_terminalizations:0,
  matrix_updates:1, row_state_mutations:1, row_terminalizations:1, class_closed:false,
  cumulative_ledger_effect:'none', publication_effect:'none', adoption_effect:'none',
  graph_effect:'none', outside_human_dependency:false,
});

export const proposedCell = () => ({"field_ordinal": 9, "field_id": "field_and_row_terminal_state", "state": "evidence_complete", "terminal": true, "value": {"terminal_classification": "terminal_fixed_public_record_obligation_complete", "row_scope": "fixed_public_record_obligation_for_one_state", "completed_evidence_fields": 8, "terminal_evidence_field_ids": ["canonical_state_identity", "operative_state_implementation_authority_and_version", "implementation_effective_date_or_typed_gap", "abawd_or_work_requirement_waiver_state_and_governing_period", "discretionary_exemption_authority_and_reported_state_practice", "fitness_for_work_or_eligibility_screening_rule", "verification_evidence_and_staff_discretion_surface", "source_identities_and_exact_custody"], "terminal_evidence_state_counts": {"evidence_complete": 8, "observed": 0, "not_publicly_recovered": 0}, "predecessor_row_canonical_sha256": "06ab54ffbb8deaed317cfef33c44e685c43e17f2b3f6bb7f2c715f9a38ed86cc", "completion_rule": "all_eight_declared_state_evidence_fields_are_terminal_under_exact_source_or_typed_gap_custody", "class_effect": "none", "cumulative_ledger_effect": "none", "limitations": ["row completion closes only the declared fixed public-record obligation for this state", "typed source gaps remain distinct from event, policy, practice, or implementation absence", "row completion does not establish uniform frontline practice or person-level outcome", "twelve terminal rows do not establish national prevalence or close RD-04-C02"], "prohibited_inferences": ["do_not_infer_complete_state_implementation_truth_beyond_terminal_field_custody", "do_not_convert_not_publicly_recovered_fields_into_event_or_policy_absence", "do_not_infer_uniform_frontline_practice", "do_not_infer_person_level_outcome", "do_not_infer_national_prevalence", "do_not_infer_discrimination_or_racial_order", "do_not_infer_coordination_or_common_purpose", "do_not_infer_complete_compact", "do_not_close_rd04_c02_or_wave03_from_twelve_terminal_rows"]}, "evidence_source_ids": ["RD04-MT-ROW-STATE-RECONCILIATION-V1"], "typed_gap": null, "authority_effect": "row_level_fixed_public_record_obligation_terminal_only"});

function validateInputs(inputBytes, input, decisionBytes, decision) {
  assert(inputBytes.length === C.INPUT_BYTES && sha(inputBytes) === C.INPUT_SHA && gitBlob(inputBytes) === C.INPUT_BLOB, 'input custody byte identity mismatch');
  assert(decisionBytes.length === C.DECISION_BYTES && sha(decisionBytes) === C.DECISION_SHA && gitBlob(decisionBytes) === C.DECISION_BLOB, 'row-state decision byte identity mismatch');
  assert(input.schema_version === 'ssc-rd04-mt-row-state-reconciliation-input-custody@1', 'input schema mismatch');
  assert(decision.schema_version === 'ssc-rd04-mt-row-state-reconciliation-decision@1', 'decision schema mismatch');
  assert(input.canonical_parent === C.CANONICAL_PARENT && input.canonical_parent_tree === C.CANONICAL_PARENT_TREE, 'canonical parent custody mismatch');
  assert(same(input.predecessor_matrix, {path:C.PREDECESSOR_MATRIX_PATH,bytes:C.PREDECESSOR_MATRIX_BYTES,sha256:C.PREDECESSOR_MATRIX_SHA,git_blob_sha:C.PREDECESSOR_MATRIX_BLOB}), 'predecessor matrix custody mismatch');
  assert(input.admitted_validation.product_commit === 'a933ceacbfd9753401a7e9875c9f3048237c2014' && input.admitted_validation.merge_commit === '5cbe9d8628efbc8c9fa85027876be77e77fbf0ef', 'validation venue mismatch');
  assert(input.admitted_validation.candidate_sha256 === C.PROPOSED_ROW_STATE_SHA && input.admitted_validation.projected_row_sha256 === C.RECONCILED_ROW_SHA, 'validation candidate mismatch');
  assert(input.admitted_validation.projected_matrix_sha256 === C.PROMOTED_MATRIX_SHA && input.admitted_validation.projected_matrix_git_blob === C.PROMOTED_MATRIX_BLOB, 'validation projection mismatch');
  assert(input.standing_control_repairs.live_base_matrix_custody.merge_commit === '7d06800b6899add8beff7891a526abec843bb8d9', 'live matrix repair mismatch');
  assert(input.standing_control_repairs.first_parent_edge_census.merge_commit === C.CANONICAL_PARENT, 'edge census repair mismatch');
  assert(input.current_montana.row_sha256 === C.CURRENT_ROW_SHA && input.current_montana.row_state_cell_sha256 === C.CURRENT_ROW_STATE_SHA, 'current Montana custody mismatch');
  assert(input.current_montana.terminal_fields === 8 && input.current_montana.open_fields === 1 && input.current_montana.remaining_open_field_id === 'field_and_row_terminal_state', 'current Montana denominator mismatch');
  assert(input.terminal_evidence_cells.length === 8 && same(input.terminal_evidence_cells.map(x=>x.field_id), FIELD_IDS), 'terminal evidence denominator mismatch');
  assert(input.terminal_evidence_cells.every(x=>x.terminal === true), 'nonterminal prerequisite admitted');
  assert(input.projection.proposed_row_state_cell_sha256 === C.PROPOSED_ROW_STATE_SHA && input.projection.reconciled_row_sha256 === C.RECONCILED_ROW_SHA, 'input projection candidate mismatch');
  assert(input.projection.promoted_matrix_bytes === C.PROMOTED_MATRIX_BYTES && input.projection.promoted_matrix_sha256 === C.PROMOTED_MATRIX_SHA && input.projection.promoted_matrix_git_blob === C.PROMOTED_MATRIX_BLOB, 'input projection matrix mismatch');
  assert(decision.decision_id === 'RD04-MT-EXACT-CURRENT-ROW-STATE-RECONCILIATION-DECISION-V1', 'decision id mismatch');
  assert(decision.candidate_id === 'RD04-MT-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1', 'candidate id mismatch');
  assert(decision.unit_id === 'US-STATE-MT' && decision.postal_code === 'MT' && decision.field_id === 'field_and_row_terminal_state' && decision.field_ordinal === 9, 'decision target mismatch');
  assert(decision.current_row_sha256 === C.CURRENT_ROW_SHA && decision.current_cell_sha256 === C.CURRENT_ROW_STATE_SHA, 'decision predecessor mismatch');
  assert(decision.reconciled_row_sha256 === C.RECONCILED_ROW_SHA && decision.proposed_cell_sha256 === C.PROPOSED_ROW_STATE_SHA, 'decision projection mismatch');
  assert(sha(canon(decision.proposed_row_state_cell)) === C.PROPOSED_ROW_STATE_SHA && same(decision.proposed_row_state_cell, proposedCell()), 'proposed cell semantic mismatch');
  assert(same(decision.prohibited_inferences, PROHIBITED_INFERENCES), 'prohibited inference boundary mismatch');
  assert(decision.transition_effects.field_terminalizations === 0 && decision.transition_effects.matrix_updates === 1 && decision.transition_effects.row_state_mutations === 1 && decision.transition_effects.row_terminalizations === 1 && decision.transition_effects.class_closed === false, 'transition effects widened');
  for (const obj of [input.authority_boundary, decision.authority_boundary]) {
    assertExactKeys(obj, AUTHORITY_KEYS, 'authority boundary');
    assert(same(obj, authorityBoundary()), 'authority boundary widened');
  }
}

function buildOpenCensus(matrix) {
  const open=[];
  for(const row of matrix.rows) for(const cell of row.cells) if(!cell.terminal) open.push({
    unit_ordinal:row.unit_ordinal,unit_id:row.unit_id,postal_code:row.postal_code,state_name:row.state_name,row_state:row.row_state,
    field_ordinal:cell.field_ordinal,field_id:cell.field_id,state:cell.state,typed_gap:cell.typed_gap,authority_effect:cell.authority_effect,cell_sha256:sha(canon(cell)),
  });
  return open;
}

export function buildProduct(repoRoot=process.cwd(), overrides=new Map()) {
  const predecessorBytes=readBytes(repoRoot,C.PREDECESSOR_MATRIX_PATH,overrides);
  assert(predecessorBytes.length===C.PREDECESSOR_MATRIX_BYTES&&sha(predecessorBytes)===C.PREDECESSOR_MATRIX_SHA&&gitBlob(predecessorBytes)===C.PREDECESSOR_MATRIX_BLOB,'predecessor matrix byte identity mismatch');
  const inputBytes=readBytes(repoRoot,C.INPUT_PATH,overrides); const input=JSON.parse(inputBytes);
  const decisionBytes=readBytes(repoRoot,C.DECISION_PATH,overrides); const decision=JSON.parse(decisionBytes);
  validateInputs(inputBytes,input,decisionBytes,decision);
  const predecessor=JSON.parse(predecessorBytes);
  assert(predecessor.counts.terminal_cells===229&&predecessor.counts.still_open_cells===221&&predecessor.counts.terminal_units===11&&predecessor.counts.class_closed===false,'predecessor matrix count mismatch');
  const mtBefore=predecessor.rows.find(r=>r.unit_id==='US-STATE-MT');
  assert(mtBefore&&sha(canon(mtBefore))===C.CURRENT_ROW_SHA&&mtBefore.row_state==='still_open'&&mtBefore.terminal_fields===8&&mtBefore.open_fields===1,'current Montana row mismatch');
  assert(sha(canon(mtBefore.cells[8]))===C.CURRENT_ROW_STATE_SHA&&mtBefore.cells[8].terminal===false,'current Montana row-state cell mismatch');
  assert(mtBefore.cells.slice(0,8).every(cell=>cell.terminal===true),'Montana evidence prerequisite not terminal');
  for(let i=0;i<8;i++) assert(sha(canon(mtBefore.cells[i]))===input.terminal_evidence_cells[i].cell_sha256,`terminal evidence cell mismatch ${i+1}`);
  const promoted=structuredClone(predecessor); const mtAfter=promoted.rows.find(r=>r.unit_id==='US-STATE-MT');
  const cellBefore=structuredClone(mtAfter.cells[8]);
  mtAfter.cells[8]=structuredClone(decision.proposed_row_state_cell); mtAfter.row_state='terminal_fixed_public_record_obligation_complete'; mtAfter.terminal_fields=9; mtAfter.open_fields=0;
  promoted.counts.evidence_complete_cells+=1; promoted.counts.still_open_cells-=1; promoted.counts.terminal_cells+=1;
  promoted.counts.row_terminal_state_cells_terminal+=1; promoted.counts.row_terminal_state_cells_open-=1; promoted.counts.terminal_units+=1;
  promoted.current_result.terminal_cells='230/450'; promoted.current_result.still_open_cells='220/450'; promoted.current_result.row_terminal_state_cells_terminal=12;
  promoted.current_result.row_terminal_state_cells_open=38; promoted.current_result.terminal_units=12;
  promoted.current_result.terminal_unit_ids=[...promoted.current_result.terminal_unit_ids,'US-STATE-MT'].sort();
  assert(sha(canon(mtAfter))===C.RECONCILED_ROW_SHA,'reconciled Montana row mismatch');
  const matrixBytes=jsonBytes(promoted);
  assert(matrixBytes.length===C.PROMOTED_MATRIX_BYTES&&sha(matrixBytes)===C.PROMOTED_MATRIX_SHA&&gitBlob(matrixBytes)===C.PROMOTED_MATRIX_BLOB,'promoted matrix identity mismatch');
  const unchanged=predecessor.rows.filter(r=>r.unit_id!=='US-STATE-MT');
  assert(sha(canon(unchanged))===C.UNCHANGED_ROWS_SHA,'non-target row custody mismatch');
  const terminalEvidence=mtBefore.cells.slice(0,8).map(cell=>({field_ordinal:cell.field_ordinal,field_id:cell.field_id,state:cell.state,terminal:cell.terminal,cell_sha256:sha(canon(cell))}));
  const ledger={
    schema_version:'ssc-rd04-mt-row-state-reconciliation-ledger@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    row_state_mutation_count:1,row_terminalization_count:1,substantive_field_terminalization_count:0,matrix_update_count:1,
    transition:{decision_id:decision.decision_id,candidate_id:decision.candidate_id,unit_ordinal:26,unit_id:'US-STATE-MT',postal_code:'MT',state_name:'Montana',field_id:'field_and_row_terminal_state',field_ordinal:9,cell_before:cellBefore,cell_before_sha256:C.CURRENT_ROW_STATE_SHA,cell_after:structuredClone(decision.proposed_row_state_cell),cell_after_sha256:C.PROPOSED_ROW_STATE_SHA,row_before_sha256:C.CURRENT_ROW_SHA,row_after_sha256:C.RECONCILED_ROW_SHA,terminal_evidence_cells:terminalEvidence,substantive_cells_reapplied:0,source_requests:0,route_executions:0},
    matrix_transition:{predecessor:{path:C.PREDECESSOR_MATRIX_PATH,bytes:C.PREDECESSOR_MATRIX_BYTES,sha256:C.PREDECESSOR_MATRIX_SHA,git_blob_sha:C.PREDECESSOR_MATRIX_BLOB},promoted:{path:`${C.ROOT}/promoted-partial-field-matrix.json`,bytes:C.PROMOTED_MATRIX_BYTES,sha256:C.PROMOTED_MATRIX_SHA,git_blob_sha:C.PROMOTED_MATRIX_BLOB},counts_before:{materialized_cells:450,terminal_cells:229,still_open_cells:221,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:11,row_terminal_state_cells_open:39,terminal_units:11,class_closed:false},counts_after:{materialized_cells:450,terminal_cells:230,still_open_cells:220,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:12,row_terminal_state_cells_open:38,terminal_units:12,class_closed:false},montana_before:{row_state:'still_open',terminal_fields:8,open_fields:1,row_sha256:C.CURRENT_ROW_SHA},montana_after:{row_state:'terminal_fixed_public_record_obligation_complete',terminal_fields:9,open_fields:0,row_sha256:C.RECONCILED_ROW_SHA},unchanged_non_target_rows:49,unchanged_non_target_rows_sha256:C.UNCHANGED_ROWS_SHA,unchanged_montana_substantive_cells:8},
    authority_boundary:authorityBoundary(),
  };
  const open=buildOpenCensus(promoted); assert(open.length===220,'open census denominator mismatch');
  const census={schema_version:'ssc-rd04-mt-row-state-reconciliation-remaining-open-field-census@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,matrix_sha256:C.PROMOTED_MATRIX_SHA,open_cell_count:220,open_substantive_cell_count:182,open_row_state_cell_count:38,terminal_cell_count:230,terminal_substantive_cell_count:118,terminal_unit_count:12,terminal_unit_ids:promoted.current_result.terminal_unit_ids,montana:{row_state:'terminal_fixed_public_record_obligation_complete',terminal_fields:9,open_fields:0,row_sha256:C.RECONCILED_ROW_SHA,remaining_open_cells:[],next_mechanical_frontier:'none_for_montana_fixed_public_record_obligation'},open_cells:open,class_closed:false,next_bounded_operation:NEXT_OPERATION,authority_boundary:{cumulative_ledger_effect:'none',publication_effect:'none',adoption_effect:'none',graph_effect:'none',outside_human_dependency:false}};
  const summary={schema_version:'ssc-rd04-mt-row-state-reconciliation-summary@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,state:'montana_derivative_row_state_reconciled',decision_id:decision.decision_id,candidate_id:decision.candidate_id,row_state_mutations:1,row_terminalizations:1,substantive_field_terminalizations:0,matrix_updates:1,counts:{materialized_cells:450,terminal_cells:230,still_open_cells:220,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_state_cells_terminal:12,row_terminal_state_cells_open:38,terminal_units:12},montana:{terminal_fields:9,open_fields:0,row_state:'terminal_fixed_public_record_obligation_complete',row_sha256:C.RECONCILED_ROW_SHA},class_closed:false,next_bounded_operation:NEXT_OPERATION,authority_boundary:authorityBoundary()};
  const index={schema_version:'ssc-rd04-mt-row-state-reconciliation-index@1',wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,input_custody_path:'input-custody.json',row_state_decision_path:'row-state-decision.json',row_state_ledger_path:'row-state-ledger.json',promoted_partial_field_matrix_path:'promoted-partial-field-matrix.json',remaining_open_field_census_path:'remaining-open-field-census.json',row_state_summary_path:'row-state-summary.json',counts:{validated_row_candidates:1,reconciled_row_state_cells:1,row_state_mutations:1,row_terminalizations:1,substantive_field_terminalizations:0,matrix_updates:1,terminal_cells_before:229,terminal_cells_after:230,still_open_cells_after:220,still_open_substantive_cells_after:182,terminal_units_after:12},current_result:{montana_terminal_fields:9,montana_open_fields:0,montana_row_state:'terminal_fixed_public_record_obligation_complete',class_closed:false,outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},next_bounded_operation:NEXT_OPERATION};
  return {'row-state-ledger.json':jsonBytes(ledger),'promoted-partial-field-matrix.json':matrixBytes,'remaining-open-field-census.json':jsonBytes(census),'row-state-summary.json':jsonBytes(summary),'index.json':jsonBytes(index)};
}

function parseArgs(argv) { const out={out:null,check:false}; for(let i=0;i<argv.length;i++){if(argv[i]==='--out')out.out=argv[++i];else if(argv[i]==='--check')out.check=true;else throw new Error(`unknown argument ${argv[i]}`);} return out; }
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if(isMain){
  try{const args=parseArgs(process.argv.slice(2));const product=buildProduct(process.cwd());if(args.out){fs.mkdirSync(args.out,{recursive:true});for(const [name,data] of Object.entries(product))fs.writeFileSync(path.join(args.out,name),data);}if(args.check)for(const [name,data] of Object.entries(product))assert(data.equals(fs.readFileSync(path.join(C.ROOT,name))),`${name} mismatch`);console.log(JSON.stringify({state:'built_exact_montana_row_state_reconciliation',outputs:Object.keys(product).length,matrix_sha256:C.PROMOTED_MATRIX_SHA,row_sha256:C.RECONCILED_ROW_SHA,class_closed:false}));}catch(error){console.error(error.stack||error.message);process.exit(1);}
}
