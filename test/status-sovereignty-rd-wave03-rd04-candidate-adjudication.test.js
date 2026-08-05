#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ROOT, SOURCE_RECEIPT_PATH, REPLAY_PROTOCOL_PATH, INDEX_PATH, PRODUCT_MANIFEST_PATH, SHARD_PATHS,
  deriveIndex, deriveProductManifest, validateCandidateRow, validateReplayRoute
} from '../tools/build-status-sovereignty-rd-wave03-rd04-candidate-adjudication.mjs';
import { SCHEMA_PATH, validateSchemaContract, validateValue } from '../tools/validate-status-sovereignty-rd-wave03-rd04-candidate-adjudication.mjs';

const read=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const clone=(value)=>structuredClone(value);
const rows=SHARD_PATHS.flatMap((rel)=>fs.readFileSync(path.join(ROOT,rel),'utf8').trimEnd().split('\n').map(JSON.parse));
const replay=read(ROOT,REPLAY_PROTOCOL_PATH);
const index=read(ROOT,INDEX_PATH);
const schema=read(ROOT,SCHEMA_PATH);
assert.equal(validateValue(ROOT),true);
assert.deepEqual(index,deriveIndex(ROOT));
assert.deepEqual(read(ROOT,PRODUCT_MANIFEST_PATH),deriveProductManifest(ROOT,index));
assert.equal(validateSchemaContract(schema),true);
assert.equal(rows.length,1500);

const refusals=[];
const refuse=(name,fn)=>refusals.push({name,fn});

for(const row of rows){
  refuse(`${row.candidate_id}: responsive promotion`,()=>{const v=clone(row);v.terminal_disposition='responsive_exact_source';assert.throws(()=>validateCandidateRow(v));});
}
for(let i=0;i<replay.routes.length;i++){
  refuse(`replay ${i+1}: host substitution`,()=>{const v=clone(replay.routes[i]);v.allowed_final_host='www.fns.usda.gov';assert.throws(()=>validateReplayRoute(v,i+1));});
}
for(const [name,mutate] of [
 ['candidate selected',v=>{v.selected_for_followup=true}],
 ['candidate admitted',v=>{v.admitted_source=true}],
 ['candidate implementation invented',v=>{v.state_implementation_observed=true}],
 ['candidate field effect',v=>{v.field_classification_effect='observed'}],
 ['candidate request spawned',v=>{v.result_spawned_requests=1}],
 ['candidate host changed',v=>{v.url_host='example.gov'}],
 ['candidate government typing changed',v=>{v.official_government_host=!v.official_government_host}],
 ['candidate responsive hit inserted',v=>{v.responsive_term_hits=['snap']}],
 ['candidate route changed',v=>{v.route_id='RD04-W03-99-IMPLEMENTATION'}],
 ['candidate unit changed',v=>{v.unit_ordinal=51}]
]) refuse(name,()=>{const v=clone(rows[0]);mutate(v);assert.throws(()=>validateCandidateRow(v));});

const sourceMutation=(name,mutate)=>refuse(name,()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rd04-adj-'));
 try{
  for(const rel of [SOURCE_RECEIPT_PATH,REPLAY_PROTOCOL_PATH,INDEX_PATH,PRODUCT_MANIFEST_PATH,SCHEMA_PATH,...SHARD_PATHS]){
   const target=path.join(temp,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(ROOT,rel),target);
  }
  const value=read(temp,SOURCE_RECEIPT_PATH);mutate(value);fs.writeFileSync(path.join(temp,SOURCE_RECEIPT_PATH),`${JSON.stringify(value,null,2)}\n`);
  assert.throws(()=>validateValue(temp));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
sourceMutation('artifact identity mutation',v=>{v.artifact_id++});
sourceMutation('candidate denominator mutation',v=>{v.counts.candidate_rows--});
sourceMutation('source admission mutation',v=>{v.counts.admitted_sources=1});
sourceMutation('human dependency mutation',v=>{v.authority.outside_human_dependency=true});
sourceMutation('class closure mutation',v=>{v.authority.class_closed=true});

const schemaMutation=(name,mutate)=>refuse(name,()=>{const v=clone(schema);mutate(v);assert.throws(()=>validateSchemaContract(v));});
schemaMutation('schema dialect',v=>{v.$schema='https://json-schema.org/draft/2019-09/schema'});
schemaMutation('schema identity',v=>{v.$id+='x'});
schemaMutation('schema openness',v=>{v.additionalProperties=true});
schemaMutation('schema candidate denominator',v=>{v.properties.counts.properties.candidate_rows.const=1499});
schemaMutation('schema responsive promotion',v=>{v.properties.counts.properties.responsive_term_candidates.const=1});
schemaMutation('schema replay denominator',v=>{v.properties.current_result.properties.official_redirect_replay_routes.const=53});
schemaMutation('schema class closure',v=>{v.properties.current_result.properties.class_closed.const=true});

for(const test of refusals)test.fn();
console.log(`RD-04 candidate-adjudication adversarial suite: ${refusals.length} mutations refused; 1500/1500 candidates terminal, 54 exact official replays frozen, class still open`);
