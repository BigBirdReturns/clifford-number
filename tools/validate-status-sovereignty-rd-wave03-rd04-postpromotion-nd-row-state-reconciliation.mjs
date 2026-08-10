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
const PINNED_SCHEMA_BYTES=14765;
const PINNED_SCHEMA_SHA256='2db941cfac2608bad4efeaa010bd1c28c1f0b97b89ac8e93053350a356df8388';
const PINNED_SCHEMA_GIT_BLOB='d41112bb621656bd41fcbfaa605e6cedbfeb04ca';
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

function schemaTypeMatches(value,type){
  if(type==='null')return value===null;
  if(type==='array')return Array.isArray(value);
  if(type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value);
  if(type==='integer')return Number.isInteger(value);
  return typeof value===type;
}
function validateSchemaInstance(root,schema,value,label){
  assert(schema&&typeof schema==='object',`${label} schema missing`);
  if(schema.$ref){
    const prefix='#/$defs/';assert(schema.$ref.startsWith(prefix),`${label} unsupported schema reference ${schema.$ref}`);
    const name=schema.$ref.slice(prefix.length);assert(root.$defs?.[name],`${label} missing schema definition ${name}`);
    return validateSchemaInstance(root,root.$defs[name],value,label);
  }
  if(Object.hasOwn(schema,'const'))assert(same(value,schema.const),`${label} const mismatch`);
  if(Array.isArray(schema.enum))assert(schema.enum.some(item=>same(value,item)),`${label} enum mismatch`);
  if(schema.type){const types=Array.isArray(schema.type)?schema.type:[schema.type];assert(types.some(type=>schemaTypeMatches(value,type)),`${label} type mismatch`);}
  if(typeof value==='string'){
    if(schema.pattern)assert(new RegExp(schema.pattern).test(value),`${label} pattern mismatch`);
    if(Number.isInteger(schema.minLength))assert(value.length>=schema.minLength,`${label} minLength mismatch`);
    if(Number.isInteger(schema.maxLength))assert(value.length<=schema.maxLength,`${label} maxLength mismatch`);
  }
  if(typeof value==='number'){
    if(typeof schema.minimum==='number')assert(value>=schema.minimum,`${label} minimum mismatch`);
    if(typeof schema.maximum==='number')assert(value<=schema.maximum,`${label} maximum mismatch`);
  }
  if(Array.isArray(value)){
    if(Number.isInteger(schema.minItems))assert(value.length>=schema.minItems,`${label} minItems mismatch`);
    if(Number.isInteger(schema.maxItems))assert(value.length<=schema.maxItems,`${label} maxItems mismatch`);
    if(schema.uniqueItems)assert(new Set(value.map(item=>JSON.stringify(item))).size===value.length,`${label} uniqueItems mismatch`);
    const prefix=Array.isArray(schema.prefixItems)?schema.prefixItems:[];
    for(let index=0;index<Math.min(prefix.length,value.length);index++)validateSchemaInstance(root,prefix[index],value[index],`${label}[${index}]`);
    if(schema.items===false)assert(value.length<=prefix.length,`${label} additional array items forbidden`);
    else if(schema.items&&schema.items!==true)for(let index=prefix.length;index<value.length;index++)validateSchemaInstance(root,schema.items,value[index],`${label}[${index}]`);
  }else if(value!==null&&typeof value==='object'){
    const properties=schema.properties??{};
    for(const key of schema.required??[])assert(Object.hasOwn(value,key),`${label} missing required property ${key}`);
    for(const [key,subschema] of Object.entries(properties))if(Object.hasOwn(value,key))validateSchemaInstance(root,subschema,value[key],`${label}.${key}`);
    if(schema.additionalProperties===false){const allowed=new Set(Object.keys(properties));for(const key of Object.keys(value))assert(allowed.has(key),`${label} additional property forbidden ${key}`);}
  }
}
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
  const schemaBytes=readBytes(m.repoRoot,SCHEMA_PATH,m.overrides);
  assert(schemaBytes.length===PINNED_SCHEMA_BYTES,'published schema byte denominator mismatch');
  assert(sha(schemaBytes)===PINNED_SCHEMA_SHA256,'published schema SHA-256 mismatch');
  assert(gitBlob(schemaBytes)===PINNED_SCHEMA_GIT_BLOB,'published schema Git blob mismatch');
  const schema=JSON.parse(schemaBytes);
  const schemaRootVersion=schema?.properties?.schema_version?.const;
  const schemaProduct=schema?.properties?.product_contract?.properties;
  const schemaTransition=schemaProduct?.matrix_transition?.properties;
  const schemaInput=schema?.$defs?.inputCustody?.properties;
  const schemaCandidate=schema?.$defs?.rowStateDecision?.properties?.candidate_id?.const;
  const schemaManifestVersion=schema?.$defs?.productManifest?.properties?.schema_version?.const;
  assert(schemaRootVersion==='ssc-rd04-nd-row-state-reconciliation-schema@2','row-state product schema version mismatch');
  assert(schemaProduct?.canonical_parent?.const===C.CANONICAL_PARENT,'row-state product schema canonical parent mismatch');
  assert(schemaTransition?.predecessor_sha256?.const===C.PREDECESSOR_MATRIX_SHA,'row-state product schema predecessor matrix mismatch');
  assert(schemaTransition?.promoted_sha256?.const===C.PROMOTED_MATRIX_SHA,'row-state product schema promoted matrix mismatch');
  assert(schemaInput?.canonical_parent?.const===C.CANONICAL_PARENT,'input-custody schema canonical parent mismatch');
  assert(schemaInput?.canonical_parent_tree?.const===C.CANONICAL_PARENT_TREE,'input-custody schema canonical parent tree mismatch');
  assert(schemaCandidate===C.PRIOR_ROW_CANDIDATE_ID,'row-state decision schema candidate id mismatch');
  assert(schemaManifestVersion==='ssc-rd04-nd-row-state-reconciliation-manifest@2','row-state manifest schema version mismatch');
  const schemaEvidenceCounts=schema?.$defs?.rowStateValue?.properties?.terminal_evidence_state_counts;
  assert(same(schemaEvidenceCounts?.required,['evidence_complete','observed','not_publicly_recovered']),'row-state evidence-count schema key set mismatch');
  assert(schemaEvidenceCounts?.additionalProperties===false,'row-state evidence-count schema must remain closed');
  assert(schemaEvidenceCounts?.properties?.evidence_complete?.const===7&&schemaEvidenceCounts?.properties?.observed?.const===0&&schemaEvidenceCounts?.properties?.not_publicly_recovered?.const===1,'row-state evidence-count schema values mismatch');
  assert(m.input.canonical_parent===schemaProduct.canonical_parent.const&&m.input.canonical_parent===schemaInput.canonical_parent.const,'input custody does not conform to current product parent schema');
  assert(m.input.canonical_parent_tree===schemaInput.canonical_parent_tree.const,'input custody does not conform to current product parent tree schema');
  assert(m.decision.candidate_id===schemaCandidate,'row-state decision does not conform to candidate schema');
  assert(m.manifest.schema_version===schemaManifestVersion,'product manifest does not conform to manifest schema version');
  validateSchemaInstance(schema,schema.$defs.inputCustody,m.input,'input custody');
  validateSchemaInstance(schema,schema.$defs.rowStateDecision,m.decision,'row-state decision');
  validateSchemaInstance(schema,schema.$defs.productManifest,m.manifest,'product manifest');
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
