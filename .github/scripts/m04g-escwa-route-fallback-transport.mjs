import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const command=process.argv[2];
const root=process.cwd();
const pollsPath='data/project/m04g-global-circulation-polls.json';
const policyPath='data/project/m04g-source-ecology-v2-policy.json';
const libPath='tools/lib/m04g-source-ecology-v2.mjs';
const testPath='test/m05-answerable-power-sprint-03-leg-07.test.js';
const routeIds=['M04G-GP051','M04G-GP056'];
const probeBase={workflow_run_id:31893141242,artifact_id:9249075074,artifact_digest:'sha256:c0e81d6f26c75787e03e9276cfa293c9b949e353a34ea47e77bb34469311e607',observed_at:'2026-08-15T15:35:50.157Z'};
const products=new Map([
 ['M04G-GP051',{url:'https://docs.un.org/E/ESCWA/30/14',method:'GET',source_class:'official_un_ods_commission_record',max_bytes:524288,record_identity:{issuing_body:'United Nations Economic and Social Commission for Western Asia',document_symbol:'E/ESCWA/30/14'},probe_receipt:{...probeBase,observed_status:200,observed_bytes:4080,observed_content_sha256:'8ea186a8520a94fa5a6d5cc673ffd7daee27d5057d9fecfcc470aa0611ff91ca'}}],
 ['M04G-GP056',{url:'https://docs.un.org/E/ESCWA/OES/2017/1',method:'GET',source_class:'official_un_ods_annual_report',max_bytes:524288,record_identity:{issuing_body:'United Nations Economic and Social Commission for Western Asia',document_symbol:'E/ESCWA/OES/2017/1'},probe_receipt:{...probeBase,observed_status:200,observed_bytes:4120,observed_content_sha256:'d427dcd6c19f8f964aa4068316d81923706d3966ffb52077ee319d71c98a9da3'}}]
]);

function replaceOnce(text,before,after,label){
 assert.equal(text.split(before).length,2,`${label} anchor drift`);
 return text.replace(before,after);
}

function apply(){
 const registry=JSON.parse(fs.readFileSync(pollsPath,'utf8'));
 assert.equal(registry.schema,'m04g-global-circulation-polls@1');
 assert.equal(registry.polls.length,96);
 for(const [routeId,fallback] of products){
  const route=registry.polls.find((row)=>row.poll_id===routeId);
  assert.ok(route,`missing ${routeId}`);
  assert.equal(route.enabled,true);
  assert.ok(route.request.url.startsWith('https://www.unescwa.org'));
  assert.equal(route.route_fallbacks,undefined);
  assert.equal(route.inherit_host_fallbacks,undefined);
  route.inherit_host_fallbacks=false;
  route.route_fallbacks=[fallback];
 }
 assert.equal(registry.polls.length,96);
 assert.equal(new Set(registry.polls.map((row)=>row.poll_id)).size,96);
 fs.writeFileSync(pollsPath,JSON.stringify(registry,null,2)+'\n');

 let lib=fs.readFileSync(libPath,'utf8');
 const policyBefore=`export function routePolicy(route, policy){
  const host=new URL(route.url).hostname;
  const hostPolicy=policy.host_policies.find((row)=>hostMatches(host,row.match))||{};
  const fallbackPolicy=policy.host_fallbacks.find((row)=>hostMatches(host,row.match));
  return {
    host,
    attempts:hostPolicy.attempts||policy.execution.attempts,
    timeout_ms:route.timeout_ms||hostPolicy.timeout_ms||policy.execution.default_timeout_ms,
    max_bytes:route.max_bytes||policy.execution.default_max_bytes,
    minimum_interval_ms:hostPolicy.minimum_interval_ms||policy.execution.default_host_interval_ms,
    max_concurrency:hostPolicy.max_concurrency||policy.execution.default_host_concurrency,
    fallbacks:fallbackPolicy?.fallbacks||[],
    manual_aquifer_after_failure:Boolean(fallbackPolicy?.manual_aquifer_after_failure)
  };
}`;
 const policyAfter=`export function routePolicy(route, policy){
  const host=new URL(route.url).hostname;
  const hostPolicy=policy.host_policies.find((row)=>hostMatches(host,row.match))||{};
  const fallbackPolicy=policy.host_fallbacks.find((row)=>hostMatches(host,row.match));
  const routeFallbacks=Array.isArray(route.raw?.route_fallbacks)?route.raw.route_fallbacks:[];
  const inheritHostFallbacks=route.raw?.inherit_host_fallbacks!==false;
  const hostFallbacks=inheritHostFallbacks?(fallbackPolicy?.fallbacks||[]):[];
  return {
    host,
    attempts:hostPolicy.attempts||policy.execution.attempts,
    timeout_ms:route.timeout_ms||hostPolicy.timeout_ms||policy.execution.default_timeout_ms,
    max_bytes:route.max_bytes||policy.execution.default_max_bytes,
    minimum_interval_ms:hostPolicy.minimum_interval_ms||policy.execution.default_host_interval_ms,
    max_concurrency:hostPolicy.max_concurrency||policy.execution.default_host_concurrency,
    fallbacks:[...routeFallbacks,...hostFallbacks],
    inherit_host_fallbacks:inheritHostFallbacks,
    manual_aquifer_after_failure:Boolean(fallbackPolicy?.manual_aquifer_after_failure)
  };
}`;
 lib=replaceOnce(lib,policyBefore,policyAfter,'routePolicy');
 const okBefore=`return {success:true,content_success:method!=='HEAD'&&(result.body?.length||0)>0,metadata_only:method==='HEAD'||Boolean(result.metadata_only),status:result.status,requested_url:candidateUrl,final_url:result.final_url,method,headers:result.headers,bytes:result.body?.length||0,content_sha256:result.body?.length?sha256(result.body):null,summary:summarizeBody(result.body),attempts:attemptLedger};`;
 const okAfter=`return {success:true,content_success:method!=='HEAD'&&(result.body?.length||0)>0,metadata_only:method==='HEAD'||Boolean(result.metadata_only),status:result.status,requested_url:candidateUrl,final_url:result.final_url,method,source_class:candidate.source_class||route.hydrology_class,record_identity:candidate.record_identity||null,probe_receipt:candidate.probe_receipt||null,headers:result.headers,bytes:result.body?.length||0,content_sha256:result.body?.length?sha256(result.body):null,summary:summarizeBody(result.body),attempts:attemptLedger};`;
 lib=replaceOnce(lib,okBefore,okAfter,'successful candidate receipt');
 const failBefore=`return {success:false,content_success:false,metadata_only:false,status:last?.status||null,requested_url:candidateUrl,final_url:last?.final_url||candidateUrl,method,failure:last?.failure||'unclassified',attempts:attemptLedger};`;
 const failAfter=`return {success:false,content_success:false,metadata_only:false,status:last?.status||null,requested_url:candidateUrl,final_url:last?.final_url||candidateUrl,method,source_class:candidate.source_class||route.hydrology_class,record_identity:candidate.record_identity||null,probe_receipt:candidate.probe_receipt||null,failure:last?.failure||'unclassified',attempts:attemptLedger};`;
 lib=replaceOnce(lib,failBefore,failAfter,'failed candidate receipt');
 const exportBefore=`  return {
    route_id:route.route_id,
    basin_id:route.basin_id,
    hydrology_class:route.hydrology_class,
    original_url:route.url,
    route_success:false,
    content_success:false,
    metadata_only:false,
    fallback_used:false,
    manual_aquifer_after_failure:specific.manual_aquifer_after_failure,
    failure:candidateResults.at(-1)?.failure||'unclassified',
    candidate_results:candidateResults
  };
}

async function mapLimit`;
 const exportAfter=`  return {
    route_id:route.route_id,
    basin_id:route.basin_id,
    hydrology_class:route.hydrology_class,
    original_url:route.url,
    route_success:false,
    content_success:false,
    metadata_only:false,
    fallback_used:false,
    manual_aquifer_after_failure:specific.manual_aquifer_after_failure,
    failure:candidateResults.at(-1)?.failure||'unclassified',
    candidate_results:candidateResults
  };
}

export async function executeSingleRoute(route,policy){
  const gate=new HostGate();
  return executeRoute(route,policy,gate);
}

async function mapLimit`;
 lib=replaceOnce(lib,exportBefore,exportAfter,'single-route export');
 fs.writeFileSync(libPath,lib);

 let test=fs.readFileSync(testPath,'utf8');
 test=replaceOnce(test,`import { classifyFailure, executionContractFailures } from '../tools/lib/m04g-source-ecology-v2.mjs';`,`import { classifyFailure, executionContractFailures, routePolicy } from '../tools/lib/m04g-source-ecology-v2.mjs';`,'test import');
 const anchor=`assert.deepEqual(commonCrawlFallback,{match:'index.commoncrawl.org',fallbacks:[{url:'https://index.commoncrawl.org/collinfo.json',method:'GET',source_class:'public_index_catalog',max_bytes:524288}]});\n`;
 const checks=`const escwaRoutes=['M04G-GP051','M04G-GP056'].map((routeId)=>discovery.routes.find((row)=>row.route_id===routeId));
assert.ok(escwaRoutes.every(Boolean));
const escwaPolicies=escwaRoutes.map((route)=>routePolicy(route,policy));
assert.deepEqual(escwaPolicies.map((row)=>row.inherit_host_fallbacks),[false,false]);
assert.deepEqual(escwaPolicies.map((row)=>row.fallbacks.length),[1,1]);
assert.deepEqual(escwaPolicies.map((row)=>row.fallbacks[0].url),['https://docs.un.org/E/ESCWA/30/14','https://docs.un.org/E/ESCWA/OES/2017/1']);
assert.deepEqual(escwaPolicies.map((row)=>row.fallbacks[0].record_identity.document_symbol),['E/ESCWA/30/14','E/ESCWA/OES/2017/1']);
assert.deepEqual(escwaPolicies.map((row)=>row.fallbacks[0].source_class),['official_un_ods_commission_record','official_un_ods_annual_report']);
assert.equal(new Set(escwaPolicies.map((row)=>row.fallbacks[0].probe_receipt.observed_content_sha256)).size,2);
assert.ok(escwaPolicies.every((row)=>row.fallbacks[0].probe_receipt.workflow_run_id===31893141242));
`;
 test=replaceOnce(test,anchor,anchor+checks,'test route assertions');
 fs.writeFileSync(testPath,test);
 console.log('Applied distinct route-bound ESCWA official-record fallbacks.');
}

async function forced(){
 const {discoverFrozenRoutes,executeSingleRoute}=await import(`${pathToFileURL(path.resolve(libPath)).href}?v=${Date.now()}`);
 const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
 const discovery=discoverFrozenRoutes(root,{expectedRoutes:96,expectedBasins:12,expectedPerBasin:8});
 const fast=structuredClone(policy);
 fast.execution.attempts=1;
 fast.execution.default_timeout_ms=1500;
 fast.execution.retry_backoff_ms=[0];
 const results=[];
 for(const routeId of routeIds){
  const route=discovery.routes.find((row)=>row.route_id===routeId);
  assert.ok(route);
  const result=await executeSingleRoute({...route,url:'https://127.0.0.1:9/forced-primary-failure',timeout_ms:1500},fast);
  assert.equal(result.route_success,true);
  assert.equal(result.content_success,true);
  assert.equal(result.fallback_used,true);
  assert.equal(result.selected_candidate,1);
  assert.equal(result.result.final_url,result.result.requested_url);
  assert.ok(result.result.record_identity?.document_symbol);
  assert.equal(result.result.probe_receipt?.workflow_run_id,31893141242);
  assert.ok(result.result.summary.includes(result.result.record_identity.document_symbol));
  results.push(result);
 }
 assert.equal(new Set(results.map((row)=>row.result.requested_url)).size,2);
 assert.equal(new Set(results.map((row)=>row.result.record_identity.document_symbol)).size,2);
 assert.equal(new Set(results.map((row)=>row.result.probe_receipt.observed_content_sha256)).size,2);
 fs.mkdirSync('qualification/forced',{recursive:true});
 fs.writeFileSync('qualification/forced/forced-route-fallbacks.json',JSON.stringify({schema_version:'m04g-escwa-forced-route-fallbacks@1',results},null,2)+'\n');
 console.log(JSON.stringify({forced_routes:results.map((row)=>({route_id:row.route_id,url:row.result.requested_url,symbol:row.result.record_identity.document_symbol}))},null,2));
}

function verifyLive(){
 const receipt=JSON.parse(fs.readFileSync('qualification/live/m04g-source-ecology-v2-receipt.json','utf8'));
 const observations=JSON.parse(fs.readFileSync('qualification/live/m04g-source-ecology-v2-observations.json','utf8'));
 assert.equal(receipt.summary.selected,96);
 assert.equal(receipt.summary.execution_complete,true);
 assert.equal(receipt.summary.unclassified_failures,0);
 const targets=routeIds.map((routeId)=>observations.find((row)=>row.route_id===routeId));
 assert.ok(targets.every(Boolean));
 assert.ok(targets.every((row)=>row.route_success));
 assert.ok(targets.every((row)=>row.content_success));
 const output={schema_version:'m04g-escwa-live-verification@1',proof_sha256:receipt.proof_sha256,summary:receipt.summary,target_routes:targets.map((row)=>({route_id:row.route_id,route_success:row.route_success,content_success:row.content_success,fallback_used:row.fallback_used,selected_url:row.result?.requested_url,final_url:row.result?.final_url,record_identity:row.result?.record_identity||null,probe_receipt:row.result?.probe_receipt||null}))};
 fs.writeFileSync('qualification/live-verification.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify(output,null,2));
}

function publication(){
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const output={schema_version:'m04g-escwa-candidate-publication@1',base_sha:process.env.EXPECTED_MAIN,base_tree:process.env.EXPECTED_MAIN_TREE,candidate_branch:process.env.CANDIDATE_BRANCH,candidate_sha:git('rev-parse','HEAD'),candidate_tree:git('rev-parse','HEAD^{tree}'),changed_paths:git('diff-tree','--no-commit-id','--name-only','-r','HEAD').split('\n').sort(),probe_run_id:31893141242,probe_artifact_id:9249075074,probe_artifact_digest:probeBase.artifact_digest};
 fs.mkdirSync('qualification',{recursive:true});
 fs.writeFileSync('qualification/candidate-publication.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify(output,null,2));
}

if(command==='apply')apply();
else if(command==='forced')await forced();
else if(command==='verify-live')verifyLive();
else if(command==='publication')publication();
else throw new Error(`unknown command: ${command}`);
