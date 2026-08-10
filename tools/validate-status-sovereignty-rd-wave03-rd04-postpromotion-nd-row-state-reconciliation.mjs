#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { C, AUTHORITY_KEYS, authorityBoundary, assertExactKeys, canon, sha, gitBlob, buildModel, buildProduct, DERIVED_NAMES } from './build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs';

const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const readBytes=(root,rel,overrides=new Map())=>overrides.has(rel)?Buffer.from(overrides.get(rel)):fs.readFileSync(path.join(root,rel));
const readJson=(root,rel,overrides=new Map())=>JSON.parse(readBytes(root,rel,overrides));
const MANIFEST_PATH=`${C.ROOT}/product-manifest.json`;
const SCHEMA_PATH='schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json';
export const EXPECTED_PERMANENT_PATHS=Object.freeze([
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.yml',
  `${C.ROOT}/input-custody.json`,`${C.ROOT}/row-state-decision.json`,`${C.ROOT}/row-state-ledger.json`,
  `${C.ROOT}/promoted-partial-field-matrix.json`,`${C.ROOT}/remaining-open-field-census.json`,
  `${C.ROOT}/row-state-summary.json`,`${C.ROOT}/index.json`,MANIFEST_PATH,
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.md',
  'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.schema.json',
  'test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.test.js',
  'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs',
  'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-row-state-reconciliation.mjs',
]);
export const EXPECTED_HASHED_PATHS=Object.freeze(EXPECTED_PERMANENT_PATHS.filter(p=>p!==MANIFEST_PATH));
const MANIFEST_KEYS=Object.freeze(['schema_version','permanent_path_count','hashed_file_count','permanent_paths','hashed_files','combined_sha256','authority_boundary']);
const HASHED_FILE_KEYS=Object.freeze(['path','bytes','sha256','git_blob']);
const LEDGER_KEYS=Object.freeze(['schema_version','wave_id','lane_id','class_id','issue','row_state_mutation_count','row_terminalization_count','substantive_field_terminalization_count','matrix_update_count','transition','matrix_transition','authority_boundary']);
const CENSUS_KEYS=Object.freeze(['schema_version','wave_id','lane_id','class_id','issue','matrix_sha256','open_cell_count','open_substantive_cell_count','open_row_state_cell_count','terminal_cell_count','terminal_substantive_cell_count','terminal_unit_count','terminal_unit_ids','north_dakota','open_cells','class_closed','next_bounded_operation','authority_boundary']);
const SUMMARY_KEYS=Object.freeze(['schema_version','wave_id','lane_id','class_id','issue','state','decision_id','candidate_id','row_state_mutations','row_terminalizations','substantive_field_terminalizations','matrix_updates','counts','north_dakota','class_closed','next_bounded_operation','authority_boundary']);
const INDEX_KEYS=Object.freeze(['schema_version','wave_id','lane_id','class_id','issue','input_custody_path','row_state_decision_path','row_state_ledger_path','promoted_partial_field_matrix_path','remaining_open_field_census_path','row_state_summary_path','counts','current_result','next_bounded_operation']);

function validateAuthority(value,label){assertExactKeys(value,AUTHORITY_KEYS,`${label}.authority_boundary`);assert(same(value,authorityBoundary()),`${label} authority boundary mismatch`);}
export function loadModel(repoRoot=process.cwd(),overrides=new Map()){
  const root=C.ROOT;
  return {repoRoot,overrides,
    input:readJson(repoRoot,`${root}/input-custody.json`,overrides),decision:readJson(repoRoot,`${root}/row-state-decision.json`,overrides),
    ledger:readJson(repoRoot,`${root}/row-state-ledger.json`,overrides),matrix:readJson(repoRoot,`${root}/promoted-partial-field-matrix.json`,overrides),
    census:readJson(repoRoot,`${root}/remaining-open-field-census.json`,overrides),summary:readJson(repoRoot,`${root}/row-state-summary.json`,overrides),
    index:readJson(repoRoot,`${root}/index.json`,overrides),manifest:readJson(repoRoot,MANIFEST_PATH,overrides)};
}
export function validateModel(m){
  const built=buildProduct(m.repoRoot,m.overrides); const model=buildModel(m.repoRoot,m.overrides);
  const schema=readJson(m.repoRoot,SCHEMA_PATH,m.overrides);
  const schemaCandidate=schema?.$defs?.rowStateDecision?.properties?.candidate_id?.const;
  assert(schemaCandidate===C.PRIOR_ROW_CANDIDATE_ID,'row-state decision schema candidate id mismatch');
  assert(m.decision.candidate_id===schemaCandidate,'row-state decision does not conform to candidate schema');
  for(const name of DERIVED_NAMES){const rel=`${C.ROOT}/${name}`;const actual=readBytes(m.repoRoot,rel,m.overrides);assert(actual.equals(built[name]),`committed ${name} differs from deterministic build`);}
  assertExactKeys(m.ledger,LEDGER_KEYS,'row-state ledger'); assertExactKeys(m.census,CENSUS_KEYS,'remaining census'); assertExactKeys(m.summary,SUMMARY_KEYS,'row-state summary'); assertExactKeys(m.index,INDEX_KEYS,'index');
  assert(m.ledger.row_state_mutation_count===1&&m.ledger.row_terminalization_count===1&&m.ledger.substantive_field_terminalization_count===0&&m.ledger.matrix_update_count===1,'ledger effect denominator mismatch');
  assert(m.ledger.transition.cell_before_sha256===C.CURRENT_ROW_STATE_SHA&&m.ledger.transition.cell_after_sha256===C.PROPOSED_ROW_STATE_SHA,'ledger cell identity mismatch');
  assert(m.ledger.transition.row_before_sha256===C.CURRENT_ND_ROW_SHA&&m.ledger.transition.row_after_sha256===C.RECONCILED_ND_ROW_SHA,'ledger row identity mismatch');
  assert(m.ledger.transition.substantive_cells_reapplied===0&&m.ledger.transition.source_requests===0&&m.ledger.transition.route_executions===0,'ledger scope widened');
  assert(m.ledger.matrix_transition.unchanged_non_target_rows===49&&m.ledger.matrix_transition.unchanged_non_target_rows_sha256===C.UNCHANGED_ROWS_SHA&&m.ledger.matrix_transition.unchanged_north_dakota_substantive_cells===8,'minimum-delta denominator mismatch');
  assert(m.matrix.counts.terminal_cells===229&&m.matrix.counts.still_open_cells===221,'matrix terminal/open counts mismatch');
  assert(m.matrix.counts.terminal_substantive_cells===118&&m.matrix.counts.still_open_substantive_cells===182,'substantive counts changed');
  assert(m.matrix.counts.row_terminal_state_cells_terminal===11&&m.matrix.counts.row_terminal_state_cells_open===39&&m.matrix.counts.terminal_units===11,'row-state counts mismatch');
  assert(m.matrix.counts.class_closed===false&&m.matrix.current_result.class_closed===false,'class closure widened');
  const normalized=structuredClone(m.matrix); delete normalized.postpromotion_nd_current_public_record_gap_row_state_reconciliation_product; const normalizedBytes=Buffer.from(`${JSON.stringify(normalized,null,2)}\n`); assert(normalizedBytes.length===498054&&sha(normalizedBytes)==='6347024e87acf6d21192fa40844ae22b5b5c76c36bfb853edf5e6d35b58c829c'&&gitBlob(normalizedBytes)==='8efadaa94bc9de68b4d90d471051d613ad0ce32e','semantic projection normalization mismatch');
  const nd=m.matrix.rows.find(r=>r.unit_id==='US-STATE-ND');assert(nd&&nd.row_state==='terminal_fixed_public_record_obligation_complete'&&nd.terminal_fields===9&&nd.open_fields===0,'ND row not terminalized');
  const rowCell=nd.cells.find(c=>c.field_id==='field_and_row_terminal_state');assert(rowCell.state==='evidence_complete'&&rowCell.terminal===true&&sha(canon(rowCell))===C.PROPOSED_ROW_STATE_SHA,'ND row-state cell mismatch');
  for(const beforeCell of model.beforeRow.cells.filter(c=>c.field_id!=='field_and_row_terminal_state')){const afterCell=nd.cells.find(c=>c.field_id===beforeCell.field_id);assert(sha(canon(afterCell))===sha(canon(beforeCell)),`ND substantive cell changed ${beforeCell.field_id}`);}
  assert(m.census.open_cell_count===221&&m.census.open_substantive_cell_count===182&&m.census.open_row_state_cell_count===39&&m.census.open_cells.length===221,'census denominator mismatch');
  assert(m.census.north_dakota.remaining_open_cells.length===0&&m.census.north_dakota.open_fields===0,'ND remains open in census');
  assert(m.summary.state==='north_dakota_derivative_row_state_reconciled'&&m.summary.row_state_mutations===1&&m.summary.row_terminalizations===1&&m.summary.substantive_field_terminalizations===0&&m.summary.matrix_updates===1,'summary effect mismatch');
  assert(m.summary.class_closed===false&&m.index.current_result.class_closed===false,'summary/index class closure widened');
  assert(m.index.counts.reconciled_row_state_cells===1&&m.index.counts.terminal_units_after===11&&m.index.counts.substantive_field_terminalizations===0,'index count mismatch');
  validateAuthority(m.input.authority_boundary,'input');validateAuthority(m.decision.authority_boundary,'decision');validateAuthority(m.ledger.authority_boundary,'ledger');validateAuthority(m.summary.authority_boundary,'summary');

  assertExactKeys(m.manifest,MANIFEST_KEYS,'manifest');validateAuthority(m.manifest.authority_boundary,'manifest');
  assert(m.manifest.schema_version==='ssc-rd04-nd-row-state-reconciliation-manifest@2','manifest schema mismatch');
  assert(m.manifest.permanent_path_count===14&&m.manifest.hashed_file_count===13,'manifest denominator mismatch');
  assert(same(m.manifest.permanent_paths,EXPECTED_PERMANENT_PATHS),'manifest permanent path inventory mismatch');
  assert(new Set(m.manifest.permanent_paths).size===14,'manifest permanent paths not unique');
  assert(m.manifest.hashed_files.length===13,'manifest hashed file denominator mismatch');
  assert(same(m.manifest.hashed_files.map(r=>r.path),EXPECTED_HASHED_PATHS),'manifest hashed path inventory mismatch');
  assert(new Set(m.manifest.hashed_files.map(r=>r.path)).size===13,'manifest hashed paths not unique');
  const rows=[];
  for(const rec of m.manifest.hashed_files){assertExactKeys(rec,HASHED_FILE_KEYS,`manifest record ${rec.path}`);const bytes=readBytes(m.repoRoot,rec.path,m.overrides);assert(bytes.length===rec.bytes,`manifest bytes mismatch ${rec.path}`);assert(sha(bytes)===rec.sha256,`manifest sha mismatch ${rec.path}`);assert(gitBlob(bytes)===rec.git_blob,`manifest blob mismatch ${rec.path}`);rows.push(`${rec.path}\0${rec.sha256}\0${rec.bytes}\n`);}
  rows.sort();assert(crypto.createHash('sha256').update(rows.join('')).digest('hex')===m.manifest.combined_sha256,'manifest combined digest mismatch');
  return {state:'qualified_exact_north_dakota_row_state_reconciliation',matrix_sha256:C.PROMOTED_MATRIX_SHA,terminal_cells:229,still_open_cells:221,terminal_substantive_cells:118,still_open_substantive_cells:182,row_terminal_cells:11,row_open_cells:39,terminal_units:11,north_dakota_terminal_fields:9,north_dakota_open_fields:0,north_dakota_row_state:'terminal_fixed_public_record_obligation_complete',class_closed:false,adversarial_contract:'closed'};
}
export function validateProduct(repoRoot=process.cwd(),overrides=new Map()){return validateModel(loadModel(repoRoot,overrides));}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const result=validateProduct(process.cwd()); const outIndex=process.argv.indexOf('--out'); if(outIndex>=0)fs.writeFileSync(process.argv[outIndex+1],`${JSON.stringify(result,null,2)}\n`); console.log(JSON.stringify(result,null,2));
}
