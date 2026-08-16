#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const out=path.join(root,'qualification');
fs.mkdirSync(out,{recursive:true});
const policyPath=path.join(root,'data/project/m04g-source-ecology-v2-policy.json');
const testPath=path.join(root,'test/m05-answerable-power-sprint-03-leg-07.test.js');
const candidateBranch='candidate/m04g-official-fallbacks-v1';
const repo=process.env.GITHUB_REPOSITORY||'BigBirdReturns/clifford-number';
const runId=process.env.GITHUB_RUN_ID||null;
const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');

const definitions=[
  {route_id:'M04G-GP054',basin_id:'G07-MENA',match:'u.ae',fallback:{url:'https://u.ae/',method:'GET',source_class:'official_portal_large_document',max_bytes:2097152},probe:{run_id:'31948740070',body_sha256:'75ab805d03afd1bfc5309646a5ef6259d64b64a45b12265472260deac9fdc4e1'}},
  {route_id:'M04G-GP013',basin_id:'G02-NORTH-AMERICA',match:'congress.gov',fallback:{url:'https://www.congress.gov/rss/most-viewed-bills.xml',method:'GET',source_class:'official_legislation_feed',max_bytes:524288},probe:{run_id:'31948740070',body_sha256:'d5e8397e80944b088fe5b1468b18fb7e490078bb0f618be4b335c94437d93717'}},
  {route_id:'M04G-GP083',basin_id:'G11-SOUTHEAST-ASIA',match:'asean.org',fallback:{url:'https://asean.org/feed/',method:'GET',source_class:'official_feed',max_bytes:1048576},probe:{run_id:'31948740070',body_sha256:'6d05a8119d756752951f2c2e84ede933ebd96fa39938e76278d3626860a8e720'}},
  {route_id:'M04G-GP063',basin_id:'G08-SUB-SAHARAN-AFRICA',match:'kenyalaw.org',fallback:{url:'https://new.kenyalaw.org/',method:'GET',source_class:'official_legal_repository_replacement',max_bytes:2097152},probe:{run_id:'31948740070',body_sha256:'b278f1ae22cb81e9378399855480c79f4f1cec6504bfd3adcb8aaa378336688a'}},
  {route_id:'M04G-GP075',basin_id:'G10-EAST-ASIA',match:'e-gov.go.jp',fallback:{url:'https://laws.e-gov.go.jp/',method:'GET',source_class:'official_law_repository',max_bytes:2097152},probe:{run_id:'31948740070',body_sha256:'b2e5ede6447907450aadd16d512d97d3ffed4c35dac9e5ba0fa6a9859de8ab55'}},
  {route_id:'M04G-GP044',basin_id:'G06-EASTERN-EUROPE-EURASIA',match:'echr.coe.int',fallback:{url:'https://hudoc.echr.coe.int/app/query/results?query=contentsitename%3AECHR&select=itemid%2Cdocname%2Cdocumentcollectionid2&sort=&start=0&length=10',method:'GET',source_class:'official_case_law_api',max_bytes:2097152},probe:{run_id:'31963180366',body_sha256:'0b0c5710df6cc617afbc6fab8b51650a0f18691bc24ba21781ee126a7d72d2eb'}},
  {route_id:'M04G-GP021',basin_id:'G03-LATIN-AMERICA-CARIBBEAN',match:'mercosur.int',fallback:{url:'https://www.mercosur.int/feed/',method:'GET',source_class:'official_feed',max_bytes:1048576},probe:{run_id:'31963180366',body_sha256:'b849bd810b877b23207c5aef66281a2e457267cee01723a65c15769b859cf49a'}},
  {route_id:'M04G-GP012',basin_id:'G02-NORTH-AMERICA',match:'regulations.gov',fallback:{url:'https://api.regulations.gov/v4/documents?filter%5BsearchTerm%5D=artificial%20intelligence&page%5Bsize%5D=5&api_key=DEMO_KEY',method:'GET',source_class:'official_regulatory_api',max_bytes:2097152},probe:{run_id:'31963180366',body_sha256:'f6465d6f0f09c5bf58de91f94b6925fa070d77eb676337557f088a2c8029b7a3'}},
  {route_id:'M04G-GP015',basin_id:'G02-NORTH-AMERICA',match:'sec.gov',fallback:{url:'https://data.sec.gov/submissions/CIK0000320193.json',method:'GET',source_class:'official_disclosure_api',max_bytes:4194304},probe:{run_id:'31963180366',body_sha256:'9ce67c0a62345214dd42434cbacfa70dad226e679c6ce752281578b1cfd2fac4'}}
];

function run(command,args,{allowFailure=false,env={}}={}){
  const result=spawnSync(command,args,{cwd:root,encoding:'utf8',stdio:allowFailure?'pipe':'inherit',env:{...process.env,...env}});
  if(!allowFailure&&result.status!==0)throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
  return result;
}
function git(...args){return run('git',args);}
function gitText(...args){const result=run('git',args,{allowFailure:true});if(result.status!==0)throw new Error(result.stderr||`git ${args.join(' ')} failed`);return result.stdout.trim();}

async function readBounded(response,maxBytes){
  const chunks=[];let total=0;
  for await(const chunk of response.body||[]){
    const buffer=Buffer.from(chunk);total+=buffer.length;
    if(total>maxBytes){try{await response.body.cancel()}catch{};throw Object.assign(new Error(`response exceeded ${maxBytes} bytes`),{failure:'oversized_response'});}
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
function visibleText(text){return text.replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--([\s\S]*?)-->/g,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function classifyBody(body,type){
  if(body.length<128)return {success:false,failure:'insufficient_content'};
  const text=body.toString('utf8').trim();const lower=text.toLowerCase();
  const challenge=['cf-chl-','cloudflare ray id','just a moment','enable javascript and cookies to continue','access denied','request blocked','captcha','the request could not be satisfied'].find((marker)=>lower.includes(marker));
  if(challenge)return {success:false,failure:'challenge_or_access_page',reason:challenge};
  const contentType=String(type||'').toLowerCase();
  if(contentType.includes('json')||/^[\[{]/.test(text)){try{const value=JSON.parse(text);return (Array.isArray(value)?value.length:Object.keys(value||{}).length)>0?{success:true}:{success:false,failure:'insufficient_content'};}catch{return {success:false,failure:'parse_failure'};}}
  if(contentType.includes('xml')||contentType.includes('rss')||/^<\?xml\b/i.test(text))return /<(?:rss|feed|urlset|sitemapindex|channel|entry|item|DataRoot|Law)\b/i.test(text)?{success:true}:{success:false,failure:'parse_failure'};
  if(contentType.includes('html')||/<html\b/i.test(text.slice(0,1000)))return visibleText(text).length>=300?{success:true}:{success:false,failure:'insufficient_visible_content'};
  return text.length>=300?{success:true}:{success:false,failure:'insufficient_content'};
}
async function preflight(definition){
  let current=definition.fallback.url;const redirects=[];
  try{
    for(let count=0;count<=5;count++){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new Error('timeout after 30000ms')),30000);
      let response;
      try{response=await fetch(current,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'CliffordNumber-M04G/2.0 (+https://github.com/BigBirdReturns/clifford-number)','accept':'application/gzip,application/octet-stream,text/html,application/json,application/xml,text/xml,text/plain,application/pdf,*/*;q=0.1'}})}finally{clearTimeout(timer)}
      const headers=Object.fromEntries(response.headers);
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location');if(!location)return {...definition,success:false,failure:'redirect_unresolved',status:response.status,final_url:current,headers,redirects};
        const next=new URL(location,current);if(next.protocol!=='https:')return {...definition,success:false,failure:'https_downgrade_refused',status:response.status,final_url:current,headers,redirects};
        if(next.toString()===current)return {...definition,success:false,failure:'redirect_loop',status:response.status,final_url:current,headers,redirects};
        redirects.push({status:response.status,from:current,to:next.toString()});current=next.toString();continue;
      }
      if(response.status!==200)return {...definition,success:false,failure:response.status===403?'access_blocked':response.status===429?'rate_limited':response.status>=500?'upstream_failure':'http_failure',status:response.status,final_url:current,headers,redirects};
      const body=await readBounded(response,definition.fallback.max_bytes);const classified=classifyBody(body,response.headers.get('content-type'));
      return {...definition,success:classified.success,failure:classified.failure||null,rejection_reason:classified.reason||null,status:response.status,final_url:current,headers,redirects,bytes:body.length,body_sha256:sha256(body),content_type:response.headers.get('content-type')||null};
    }
    return {...definition,success:false,failure:'redirect_limit_exceeded',status:null,final_url:current,redirects};
  }catch(error){return {...definition,success:false,failure:String(error?.message||'').includes('timeout')?'timeout':error.failure||'transport_failure',status:null,final_url:current,redirects,error:String(error?.message||error)};}
}

function writeOutcome(status,extra={}){
  const values={STATUS:status,...extra};
  fs.writeFileSync(path.join(out,'outcome.env'),Object.entries(values).map(([key,value])=>`${key}=${String(value??'').replace(/\n/g,' ')}`).join('\n')+'\n');
}

const decision={schema_version:'m04g-official-fallback-materializer@1',generated_at:new Date().toISOString(),run_id:runId,repository:repo,candidate_branch:candidateBranch,status:'started',definitions,base_sha:null,preflight:[],selected:[],baseline:null,candidate:null,candidate_sha:null,changed_files:[],boundaries:{denominator_changed:false,thresholds_changed:false,route_ids_changed:false,semantic_escwa_substitution:false,evidentiary_sufficiency:false,answer_effectiveness:false}};

try{
  git('fetch','origin','main');
  const baseSha=gitText('rev-parse','origin/main');decision.base_sha=baseSha;
  git('checkout','--detach',baseSha);

  for(const definition of definitions)decision.preflight.push(await preflight(definition));
  decision.selected=decision.preflight.filter((row)=>row.success);
  if(decision.selected.length<6)throw new Error(`only ${decision.selected.length} clean fallbacks survived runtime-equivalent preflight; six required`);
  if(!decision.selected.some((row)=>row.route_id==='M04G-GP054'))throw new Error('the MENA repair route M04G-GP054 did not survive preflight');
  if(decision.selected.some((row)=>['M04G-GP051','M04G-GP056'].includes(row.route_id)))throw new Error('closed ESCWA semantic substitutions were reintroduced');

  run('node',['tools/build-m05-answerable-power-sprint-03-leg-07.mjs']);
  run('node',['tools/validate-m05-answerable-power-sprint-03-leg-07.mjs']);
  run('node',['test/m05-answerable-power-sprint-03-leg-07.test.js']);
  run('node',['tools/run-m04g-source-ecology-v2.mjs','--output-dir',path.join(out,'baseline')]);
  decision.baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline/m04g-source-ecology-v2-receipt.json'),'utf8')).summary;

  const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
  for(const selected of decision.selected){
    const expected={match:selected.match,fallbacks:[selected.fallback]};
    const index=policy.host_fallbacks.findIndex((row)=>row.match===selected.match);
    if(index>=0)policy.host_fallbacks[index]=expected;else policy.host_fallbacks.push(expected);
  }
  fs.writeFileSync(policyPath,JSON.stringify(policy,null,2)+'\n');

  let test=fs.readFileSync(testPath,'utf8');
  if(test.includes('const officialFallbackCensusRepairs='))throw new Error('official fallback census test marker already exists');
  const expected=decision.selected.map((row)=>({match:row.match,fallbacks:[row.fallback]}));
  const insertion=`\nconst officialFallbackCensusRepairs=${JSON.stringify(expected,null,2)};\nassert.ok(officialFallbackCensusRepairs.length>=6);\nassert.ok(officialFallbackCensusRepairs.some((row)=>row.match==='u.ae'));\nassert.equal(officialFallbackCensusRepairs.some((row)=>row.match==='unescwa.org'),false);\nfor(const expectedFallback of officialFallbackCensusRepairs){\n  assert.deepEqual(policy.host_fallbacks.find((row)=>row.match===expectedFallback.match),expectedFallback);\n}\n`;
  const marker="console.log('m05-answerable-power-sprint-03-leg-07.test: OK');";
  if(!test.includes(marker))throw new Error('focused test completion marker missing');
  test=test.replace(marker,`${insertion}\n${marker}`);
  fs.writeFileSync(testPath,test);

  run('node',['tools/build-m05-answerable-power-sprint-03-leg-07.mjs']);
  run('node',['tools/validate-m05-answerable-power-sprint-03-leg-07.mjs']);
  run('node',['test/m05-answerable-power-sprint-03-leg-07.test.js']);
  run('npm',['run','release:check']);
  run('node',['tools/run-m04g-source-ecology-v2.mjs','--output-dir',path.join(out,'candidate')]);
  const candidateReceipt=JSON.parse(fs.readFileSync(path.join(out,'candidate/m04g-source-ecology-v2-receipt.json'),'utf8'));
  decision.candidate=candidateReceipt.summary;
  if(candidateReceipt.summary.selected!==96)throw new Error(`candidate denominator ${candidateReceipt.summary.selected}/96`);
  if(candidateReceipt.summary.unclassified_failures!==0)throw new Error(`${candidateReceipt.summary.unclassified_failures} unclassified candidate failures`);
  if(!candidateReceipt.summary.route_healthy)throw new Error(`candidate route rate ${(100*candidateReceipt.summary.route_success_rate).toFixed(2)}% remains below 75%`);
  if(!candidateReceipt.summary.content_healthy)throw new Error(`candidate content rate ${(100*candidateReceipt.summary.content_success_rate).toFixed(2)}% remains below 65%`);
  if(candidateReceipt.summary.healthy_basins!==12)throw new Error(`candidate has ${candidateReceipt.summary.healthy_basins}/12 healthy basins`);
  if(!candidateReceipt.summary.coverage_healthy)throw new Error('candidate coverage_healthy remains false');

  const selectedIds=new Set(decision.selected.map((row)=>row.route_id));
  const observations=JSON.parse(fs.readFileSync(path.join(out,'candidate/m04g-source-ecology-v2-observations.json'),'utf8'));
  const selectedObservations=observations.filter((row)=>selectedIds.has(row.route_id));
  if(selectedObservations.length!==decision.selected.length)throw new Error(`candidate returned ${selectedObservations.length}/${decision.selected.length} selected route observations`);
  const selectedFailures=selectedObservations.filter((row)=>!row.route_success);
  if(selectedFailures.length)throw new Error(`selected fallback routes failed in candidate orbit: ${selectedFailures.map((row)=>row.route_id).join(', ')}`);

  const policyBytes=fs.readFileSync(policyPath);const testBytes=fs.readFileSync(testPath);
  const policyBlobSha=sha256(policyBytes);const testBlobSha=sha256(testBytes);
  fs.writeFileSync(path.join(out,'selected-fallbacks.json'),JSON.stringify(decision.selected,null,2)+'\n');

  const currentMain=gitText('ls-remote','origin','refs/heads/main').split(/\s+/)[0];
  if(currentMain!==baseSha)throw new Error(`canonical main advanced from ${baseSha} to ${currentMain} during qualification`);
  git('reset','--hard',baseSha);
  fs.writeFileSync(policyPath,policyBytes);fs.writeFileSync(testPath,testBytes);
  git('checkout','-B',candidateBranch,baseSha);
  decision.changed_files=gitText('diff','--name-only').split(/\n/).filter(Boolean).sort();
  const expectedFiles=['data/project/m04g-source-ecology-v2-policy.json','test/m05-answerable-power-sprint-03-leg-07.test.js'].sort();
  if(JSON.stringify(decision.changed_files)!==JSON.stringify(expectedFiles))throw new Error(`candidate boundary mismatch: ${decision.changed_files.join(', ')}`);
  git('config','user.name','BigBirdReturns');git('config','user.email','bigbirdreturns@proton.me');
  git('add',...expectedFiles);git('commit','-m','Repair official fallback route coverage');
  const candidateSha=gitText('rev-parse','HEAD');decision.candidate_sha=candidateSha;
  git('push','--force','origin',`HEAD:refs/heads/${candidateBranch}`);
  decision.status='success';decision.policy_file_sha256=policyBlobSha;decision.test_file_sha256=testBlobSha;decision.candidate_receipt_proof=candidateReceipt.proof_sha256;
  fs.writeFileSync(path.join(out,'decision.json'),JSON.stringify(decision,null,2)+'\n');
  writeOutcome('success',{BASE_SHA:baseSha,CANDIDATE_SHA:candidateSha,CANDIDATE_BRANCH:candidateBranch,SELECTED_COUNT:decision.selected.length,ROUTE_SUCCESSES:decision.candidate.route_successes,CONTENT_SUCCESSES:decision.candidate.content_successes,HEALTHY_BASINS:decision.candidate.healthy_basins,PROOF_SHA256:candidateReceipt.proof_sha256});
}catch(error){
  decision.status='failure';decision.error=String(error?.stack||error);
  fs.writeFileSync(path.join(out,'decision.json'),JSON.stringify(decision,null,2)+'\n');
  writeOutcome('failure',{BASE_SHA:decision.base_sha||'',REASON:String(error?.message||error)});
  console.error(error);
  process.exitCode=2;
}
