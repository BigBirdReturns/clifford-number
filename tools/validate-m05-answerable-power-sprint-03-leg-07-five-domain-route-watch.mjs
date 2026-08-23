#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import process from 'node:process';
import {validateContract,validateReceipt} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs';

const DEFAULT_CONTRACT='data/project/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch-contract.json';
const EXPECTED_FRONTIERS=[
  ['M05-IF-ADMIN-AU-ROBODEBT-DURABILITY','active_public_record_acquisition'],
  ['M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS','controlled_subject_or_archival_acquisition'],
  ['M05-IF-WORK-IT-FOODINHO-COMPLIANCE','active_public_record_acquisition'],
  ['M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY','active_public_record_acquisition'],
  ['M05-IF-VALUE-US-INTEL-REALIZATION','future_time_gated_monitoring']
];

function parseArgs(argv){
  const args={contract:DEFAULT_CONTRACT,receipt:null};
  for(let index=0;index<argv.length;index++){
    const token=argv[index];
    if(token==='--help'||token==='-h'){args.help=true;continue}
    if(!['--contract','--receipt'].includes(token))throw new Error(`Unknown argument: ${token}`);
    const value=argv[++index];
    if(!value||value.startsWith('--'))throw new Error(`${token} requires a value`);
    if(token==='--contract')args.contract=value;
    if(token==='--receipt')args.receipt=value;
  }
  return args;
}

function usage(){return `Usage: node tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs [--contract <path>] [--receipt <path>]\n`}
async function readJson(file){return JSON.parse(await fs.readFile(file,'utf8'))}
function gitBlobSha1(bytes){
  const header=Buffer.from(`blob ${bytes.length}\0`,'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}
function assert(condition,message){if(!condition)throw new Error(message)}

function findSourceRecord(value,sourceId){
  if(Array.isArray(value)){
    for(const item of value){const found=findSourceRecord(item,sourceId);if(found)return found}
    return null;
  }
  if(value&&typeof value==='object'){
    if(value.source_id===sourceId)return value;
    for(const item of Object.values(value)){const found=findSourceRecord(item,sourceId);if(found)return found}
  }
  return null;
}

async function validateBindings(contract){
  const parsedBindings=new Map();
  for(const [name,binding] of Object.entries(contract.canonical_bindings)){
    const bytes=await fs.readFile(binding.path);
    const actual=gitBlobSha1(bytes);
    assert(actual===binding.blob_sha,`canonical binding ${name} drift: expected ${binding.blob_sha}, found ${actual}`);
    parsedBindings.set(name,JSON.parse(bytes.toString('utf8')));
  }
  for(const lane of contract.lanes){
    for(const route of lane.routes){
      const sourceObject=parsedBindings.get(route.source_binding);
      assert(sourceObject,`${route.route_id} source binding ${route.source_binding} was not loaded`);
      const sourceRecord=findSourceRecord(sourceObject,route.source_record);
      assert(sourceRecord,`${route.route_id} source record ${route.source_record} is absent from ${route.source_binding}`);
      const sourceUrls=[sourceRecord.url,sourceRecord.document_url].filter((value)=>typeof value==='string');
      assert(sourceUrls.includes(route.url),`${route.route_id} URL does not equal the bound ${route.source_record} source URL`);
    }
  }
}

async function validateFrontier(contract){
  const binding=contract.canonical_bindings.five_domain_frontier;
  assert(binding,'five_domain_frontier binding is required');
  const frontier=await readJson(binding.path);
  assert(frontier.schema_version==='m05-answerable-power-s03-l7-five-domain-implementation-frontier@1','frontier schema drift');
  assert(frontier.frontier_count===5,'frontier denominator drift');
  assert(frontier.execution_policy?.denominator_frozen===5,'frontier execution denominator drift');
  assert(frontier.execution_policy?.direct_voice_bulk_polling_allowed===false,'frontier direct-voice boundary drift');
  assert(frontier.execution_policy?.access_controls_bypassed===false,'frontier access boundary drift');
  assert(frontier.execution_policy?.metadata_counts_as_substantive_content===false,'frontier metadata boundary drift');
  assert(frontier.execution_policy?.claim_admission_counts_as_answer===false,'frontier answer boundary drift');
  assert(frontier.execution_policy?.failed_routes_preserved===true,'frontier failed-route boundary drift');
  const actual=frontier.frontiers.map((row)=>[row.frontier_id,row.route_class]);
  assert(JSON.stringify(actual)===JSON.stringify(EXPECTED_FRONTIERS),'frontier identities or route classes drift');
  assert(frontier.frontiers.every((row)=>row.answer_changes_authorized===false),'frontier authorizes an answer change');
  const intel=frontier.frontiers.find((row)=>row.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION');
  assert(intel?.time_gate?.standard_sale_route_eligible_as_of==='2026-08-27','frontier Intel gate drift');
  assert(intel?.time_gate?.exception_agreement_observed===false,'frontier invents an Intel exception agreement');
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  if(args.help){process.stdout.write(usage());return}
  const contract=await readJson(args.contract);
  validateContract(contract);
  await validateBindings(contract);
  await validateFrontier(contract);
  if(args.receipt){
    const receipt=await readJson(args.receipt);
    validateReceipt(receipt,contract);
  }
  process.stdout.write(`m05 five-domain route watch validation: OK${args.receipt?' (contract and receipt)':' (contract)'}\n`);
}

main().catch((error)=>{
  process.stderr.write(`m05 five-domain route watch validation failed: ${error?.stack||error}\n`);
  process.exitCode=1;
});
