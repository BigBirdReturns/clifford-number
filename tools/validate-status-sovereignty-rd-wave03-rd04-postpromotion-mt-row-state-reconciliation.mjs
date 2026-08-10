#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { C, AUTHORITY_KEYS, NEXT_OPERATION, PROHIBITED_INFERENCES, authorityBoundary, buildProduct, canon, gitBlob, sha } from './build-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs';

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const readBytes=(root,rel,overrides=new Map())=>overrides.has(rel)?Buffer.from(overrides.get(rel)):fs.readFileSync(path.join(root,rel));
const readJson=(root,rel,overrides=new Map())=>JSON.parse(readBytes(root,rel,overrides));
export const EXPECTED_PERMANENT_PATHS=Object.freeze([
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.yml',
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/input-custody.json','data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/row-state-decision.json','data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/row-state-ledger.json',
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/promoted-partial-field-matrix.json','data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/remaining-open-field-census.json','data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/row-state-summary.json',
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/index.json','data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/product-manifest.json','docs/milestones/ssc-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.md',
  'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.schema.json','test/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.test.js','tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs','tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.mjs',
]);
export const EXPECTED_HASHED_PATHS=Object.freeze(EXPECTED_PERMANENT_PATHS.filter(p=>!p.endsWith('/product-manifest.json')));
const combined=records=>crypto.createHash('sha256').update(records.map(r=>`${r.path}\0${r.sha256}\0${r.bytes}\n`).sort().join('')).digest('hex');
const exactKeys=(value,keys,label)=>{assert(value&&typeof value==='object'&&!Array.isArray(value),`${label} must be object`);assert(same(Object.keys(value).sort(),[...keys].sort()),`${label} key set mismatch`);};
const fullBoundary=value=>{exactKeys(value,AUTHORITY_KEYS,'authority boundary');assert(same(value,authorityBoundary()),'authority boundary widened');};

export function validateProduct(repoRoot=process.cwd(),overrides=new Map()){
  const generated=buildProduct(repoRoot,overrides);
  for(const [name,built] of Object.entries(generated))assert(built.equals(readBytes(repoRoot,`${C.ROOT}/${name}`,overrides)),`${name} deterministic byte mismatch`);
  const input=readJson(repoRoot,`${C.ROOT}/input-custody.json`,overrides);
  const decision=readJson(repoRoot,`${C.ROOT}/row-state-decision.json`,overrides);
  const ledger=readJson(repoRoot,`${C.ROOT}/row-state-ledger.json`,overrides);
  const matrix=readJson(repoRoot,`${C.ROOT}/promoted-partial-field-matrix.json`,overrides);
  const census=readJson(repoRoot,`${C.ROOT}/remaining-open-field-census.json`,overrides);
  const summary=readJson(repoRoot,`${C.ROOT}/row-state-summary.json`,overrides);
  const index=readJson(repoRoot,`${C.ROOT}/index.json`,overrides);
  const manifestPath=`${C.ROOT}/product-manifest.json`;
  const manifestBytes=readBytes(repoRoot,manifestPath,overrides);
  const manifest=JSON.parse(manifestBytes);
  assert(manifestBytes.equals(Buffer.from(`${JSON.stringify(manifest,null,2)}
`)),'manifest canonical serialization mismatch');
  const schema=readJson(repoRoot,'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.schema.json',overrides);
  assert(input.canonical_parent===C.CANONICAL_PARENT&&input.canonical_parent_tree===C.CANONICAL_PARENT_TREE,'input canonical parent mismatch');
  assert(decision.proposed_cell_sha256===C.PROPOSED_ROW_STATE_SHA&&sha(canon(decision.proposed_row_state_cell))===C.PROPOSED_ROW_STATE_SHA,'candidate cell mismatch');
  assert(ledger.row_state_mutation_count===1&&ledger.row_terminalization_count===1&&ledger.substantive_field_terminalization_count===0&&ledger.matrix_update_count===1,'ledger effect mismatch');
  fullBoundary(ledger.authority_boundary);fullBoundary(summary.authority_boundary);fullBoundary(decision.authority_boundary);fullBoundary(input.authority_boundary);
  assert(matrix.counts.terminal_cells===230&&matrix.counts.still_open_cells===220&&matrix.counts.terminal_substantive_cells===118&&matrix.counts.still_open_substantive_cells===182,'matrix counts mismatch');
  assert(matrix.counts.row_terminal_state_cells_terminal===12&&matrix.counts.row_terminal_state_cells_open===38&&matrix.counts.terminal_units===12&&matrix.counts.class_closed===false,'matrix row-state counts mismatch');
  const mt=matrix.rows.find(r=>r.unit_id==='US-STATE-MT');assert(mt&&mt.row_state==='terminal_fixed_public_record_obligation_complete'&&mt.terminal_fields===9&&mt.open_fields===0&&sha(canon(mt))===C.RECONCILED_ROW_SHA,'promoted Montana row mismatch');
  assert(sha(canon(mt.cells[8]))===C.PROPOSED_ROW_STATE_SHA,'promoted Montana cell mismatch');
  assert(census.open_cell_count===220&&census.open_substantive_cell_count===182&&census.open_row_state_cell_count===38&&census.open_cells.length===220,'census count mismatch');
  assert(census.open_cells.every(x=>x.unit_id!=='US-STATE-MT'),'Montana remained in open census');
  assert(summary.state==='montana_derivative_row_state_reconciled'&&summary.counts.terminal_units===12&&summary.class_closed===false&&summary.next_bounded_operation===NEXT_OPERATION,'summary mismatch');
  assert(index.counts.validated_row_candidates===1&&index.counts.substantive_field_terminalizations===0&&index.current_result.montana_open_fields===0&&index.current_result.class_closed===false,'index mismatch');
  assert(manifest.schema_version==='ssc-rd04-mt-row-state-reconciliation-manifest@1'&&manifest.permanent_path_count===14&&manifest.hashed_file_count===13,'manifest count mismatch');
  assert(same(manifest.permanent_paths,EXPECTED_PERMANENT_PATHS),'manifest permanent path mismatch');
  assert(same(manifest.hashed_files.map(x=>x.path),EXPECTED_HASHED_PATHS),'manifest hashed path mismatch');
  const observed=[];for(const p of EXPECTED_HASHED_PATHS){const data=readBytes(repoRoot,p,overrides);observed.push({path:p,bytes:data.length,sha256:sha(data),git_blob:gitBlob(data)});}
  assert(same(manifest.hashed_files,observed),'manifest hashed identity mismatch');assert(manifest.combined_sha256===combined(observed),'manifest combined hash mismatch');fullBoundary(manifest.authority_boundary);
  assert(schema.type==='object'&&schema.additionalProperties===false&&schema.properties.schema_version.const==='ssc-rd04-mt-row-state-reconciliation-schema@1','schema root mismatch');
  const contract=schema.$defs.productContract.properties;assert(contract.canonical_parent.const===C.CANONICAL_PARENT&&contract.canonical_parent_tree.const===C.CANONICAL_PARENT_TREE,'schema parent mismatch');
  assert(contract.matrix_transition.properties.predecessor_sha256.const===C.PREDECESSOR_MATRIX_SHA&&contract.matrix_transition.properties.promoted_sha256.const===C.PROMOTED_MATRIX_SHA,'schema matrix mismatch');
  assert(schema.$defs.rowStateDecision.properties.candidate_id.const==='RD04-MT-EXACT-CURRENT-ROW-STATE-RECONCILIATION-CANDIDATE-V1','schema candidate mismatch');
  assert(same(schema.$defs.rowStateValue.properties.prohibited_inferences.const,PROHIBITED_INFERENCES),'schema inference boundary mismatch');
  const workflow=readBytes(repoRoot,'.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.yml',overrides).toString();assert(workflow.includes(`CANONICAL_PARENT: ${C.CANONICAL_PARENT}`)&&workflow.includes('first-parent-edge-paths.tsv')&&workflow.includes('diff-filter=A'),'workflow control mismatch');
  const docs=readBytes(repoRoot,'docs/milestones/ssc-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation.md',overrides).toString();assert(docs.includes(C.PROMOTED_MATRIX_SHA)&&docs.includes('one-parent, fourteen-addition product')&&docs.includes('class remains open'),'milestone mismatch');
  return {schema_version:'ssc-rd04-mt-row-state-reconciliation-validation-receipt@1',state:'qualified_exact_montana_row_state_reconciliation',canonical_parent:C.CANONICAL_PARENT,predecessor_matrix_sha256:C.PREDECESSOR_MATRIX_SHA,promoted_matrix_sha256:C.PROMOTED_MATRIX_SHA,montana_row_sha256:C.RECONCILED_ROW_SHA,proposed_cell_sha256:C.PROPOSED_ROW_STATE_SHA,terminal_cells:230,still_open_cells:220,terminal_substantive_cells:118,still_open_substantive_cells:182,terminal_units:12,row_state_mutations:1,row_terminalizations:1,field_terminalizations:0,matrix_updates:1,class_closed:false,outside_human_dependency:false,adversarial_refusal_floor:40};
}

function parseArgs(argv){const out={out:null};for(let i=0;i<argv.length;i++){if(argv[i]==='--out')out.out=argv[++i];else throw new Error(`unknown argument ${argv[i]}`);}return out;}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){try{const args=parseArgs(process.argv.slice(2));const receipt=validateProduct(process.cwd());const data=Buffer.from(`${JSON.stringify(receipt,null,2)}\n`);if(args.out){fs.mkdirSync(path.dirname(args.out),{recursive:true});fs.writeFileSync(args.out,data);}process.stdout.write(data);}catch(error){console.error(error.stack||error.message);process.exit(1);}}
