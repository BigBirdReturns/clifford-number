#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(target,value)=>{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n')};
const append=(target,rows)=>{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,rows.map((row)=>JSON.stringify(row)).join('\n')+(rows.length?'\n':''))};
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const args=process.argv.slice(2);
const get=(name,fallback)=>{const i=args.indexOf(name);return i>=0&&i+1<args.length?args[i+1]:fallback};
const has=(name)=>args.includes(name);

const basinArg=get('--basin','all');
const classArg=get('--class','all').split(',').map((value)=>value.trim()).filter(Boolean);
const limit=Number.parseInt(get('--limit','200'),10);
const strictMin=Number.parseInt(get('--strict-min-success','0'),10);
const initialDelayMs=Number.parseInt(get('--initial-delay-ms','0'),10);
const outputDir=path.resolve(root,get('--output-dir','build/global-circulation'));
const dryRun=has('--dry-run');
if(!Number.isInteger(limit)||limit<1||limit>500)throw new Error('--limit must be 1..500');
if(!Number.isInteger(strictMin)||strictMin<0)throw new Error('--strict-min-success must be >=0');
if(!Number.isInteger(initialDelayMs)||initialDelayMs<0||initialDelayMs>180000)throw new Error('--initial-delay-ms must be 0..180000');

const pollsDoc=read('data/project/m04g-global-circulation-polls.json');
const sourcesDoc=read('data/intake/m04g-global-circulation-sources-01.json');
const policy=read('data/project/m04g-global-circulation-source-health-policy.json');
const sourceById=new Map(sourcesDoc.sources.map((row)=>[row.source_id,row]));
const classes=new Set(classArg);
const selected=pollsDoc.polls
  .filter((poll)=>poll.enabled)
  .filter((poll)=>basinArg==='all'||poll.basin_id===basinArg)
  .filter((poll)=>classes.has('all')||classes.has(poll.hydrology_class))
  .slice(0,limit);
const plan=selected.map((poll)=>({
  poll_id:poll.poll_id,
  source_id:poll.source_id,
  basin_id:poll.basin_id,
  hydrology_class:poll.hydrology_class,
  url:poll.request.url,
  promotion_ceiling:poll.promotion_ceiling,
  initial_delay_ms:initialDelayMs
}));
if(dryRun){
  console.log(JSON.stringify({ok:true,dry_run:true,basin:basinArg,classes:classArg,selected:plan.length,initial_delay_ms:initialDelayMs,plan},null,2));
  process.exit(0);
}
if(initialDelayMs>0){
  console.log(`initial basin stagger: ${initialDelayMs}ms`);
  await sleep(initialDelayMs);
}

const now=new Date();
const orbitId=`${now.toISOString().replace(/[:.]/g,'-')}-${basinArg}`;
const statePath=path.join(outputDir,'state',`${basinArg}.json`);
const previous=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{observations:{}};
const observations={};
const changes=[];
const candidates=[];
const failures=[];
const degraded=[];
const attemptLedger=[];
const hostLastRequest=new Map();

class ResponseTooLargeError extends Error{
  constructor(maxBytes,observedBytes){super(`response exceeded max_bytes=${maxBytes}`);this.name='ResponseTooLargeError';this.maxBytes=maxBytes;this.observedBytes=observedBytes;}
}
class RedirectPolicyError extends Error{
  constructor(message,failureClass){super(message);this.name='RedirectPolicyError';this.failureClass=failureClass;}
}

async function readLimited(response,maxBytes){
  if(!response.body)return Buffer.alloc(0);
  const reader=response.body.getReader();
  const chunks=[];
  let total=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>maxBytes){
      await reader.cancel('max bytes');
      throw new ResponseTooLargeError(maxBytes,total);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function summary(buffer,contentType,method){
  if(method==='HEAD')return{bytes:0,format:'metadata',title:null,preview:null};
  const text=buffer.toString('utf8');
  const out={bytes:buffer.length};
  if(/json/i.test(contentType)||/^\s*[\[{]/.test(text)){
    try{
      const value=JSON.parse(text);
      out.format='json';
      out.top_level=Array.isArray(value)?'array':typeof value;
      out.top_level_keys=value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).slice(0,30):[];
      out.array_length=Array.isArray(value)?value.length:null;
      return out;
    }catch(error){
      out.json_parse_error=error.message;
    }
  }
  out.format=/xml|rss|atom/i.test(contentType)||/^\s*</.test(text)?'markup':'text';
  out.title=text.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim()??null;
  out.preview=text.replace(/\s+/g,' ').slice(0,240);
  return out;
}

function statusFailureClass(status){
  if(status===401)return'authentication_required';
  if(status===403)return'access_blocked';
  if(status===405)return'method_not_allowed';
  if(status===408)return'timeout';
  if(status===429)return'rate_limited';
  if([500,502,503,504].includes(status))return'upstream_failure';
  if(status>=300&&status<400)return'redirect_unresolved';
  if(status>=400&&status<500)return'client_error';
  return'unknown_failure';
}

function errorFailureClass(error){
  if(error instanceof ResponseTooLargeError)return'oversized_response';
  if(error instanceof RedirectPolicyError)return error.failureClass;
  if(error?.name==='AbortError')return'timeout';
  const code=String(error?.cause?.code??'').toUpperCase();
  if(['ENOTFOUND','EAI_AGAIN'].includes(code))return'dns_failure';
  if(code.includes('CERT')||code.includes('TLS')||code.includes('SSL'))return'tls_failure';
  if(/timeout|timed out/i.test(String(error?.message??'')))return'timeout';
  if(/fetch failed|socket|connect|network/i.test(String(error?.message??'')))return'transport_failure';
  return'unknown_failure';
}

function compactAttempt(result){
  return{
    attempt:result.attempt,
    method:result.method,
    requested_url:result.requested_url,
    final_url:result.final_url??null,
    started_at:result.started_at,
    finished_at:result.finished_at,
    ok:Boolean(result.ok),
    status:result.status??null,
    failure_class:result.failure_class??null,
    error:result.error??null,
    redirect_chain:result.redirect_chain??[],
    retry_after:result.retry_after??null,
    content_ok:Boolean(result.content_ok),
    success_mode:result.success_mode??null
  };
}

async function throttleHost(host){
  const minimum=Number(policy.host_policy?.[host]?.minimum_interval_ms??0);
  if(minimum<=0)return;
  const previousAt=hostLastRequest.get(host)??0;
  const wait=Math.max(0,previousAt+minimum-Date.now());
  if(wait>0)await sleep(wait);
  hostLastRequest.set(host,Date.now());
}

async function fetchFollowingRedirects(rawUrl,method,signal){
  let current=new URL(rawUrl);
  let currentMethod=method;
  const chain=[];
  const maximum=Number(policy.request_policy.maximum_redirects??5);
  for(let index=0;index<=maximum;index+=1){
    await throttleHost(current.host);
    const response=await fetch(current,{
      method:currentMethod,
      headers:{
        accept:policy.request_policy.accept,
        'user-agent':policy.request_policy.user_agent
      },
      signal,
      redirect:'manual'
    });
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get('location');
      if(!location)return{response,finalUrl:current.toString(),method:currentMethod,redirectChain:chain};
      if(index>=maximum)throw new RedirectPolicyError(`redirect limit exceeded: ${maximum}`,'redirect_unresolved');
      const next=new URL(location,current);
      if(policy.request_policy.require_https_after_redirect&&next.protocol!=='https:'){
        throw new RedirectPolicyError(`insecure redirect refused: ${current} -> ${next}`,'redirect_insecure');
      }
      chain.push({status:response.status,from:current.toString(),to:next.toString()});
      if(response.status===303||([301,302].includes(response.status)&&!['GET','HEAD'].includes(currentMethod)))currentMethod='GET';
      current=next;
      continue;
    }
    return{response,finalUrl:current.toString(),method:currentMethod,redirectChain:chain};
  }
  throw new RedirectPolicyError('redirect loop unresolved','redirect_unresolved');
}

function metadataFingerprint(result){
  const value={
    final_url:result.final_url??null,
    status:result.status??null,
    content_type:result.content_type??null,
    content_length:result.content_length??null,
    etag:result.etag??null,
    last_modified:result.last_modified??null,
    date:result.date??null
  };
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function requestAttempt(poll,method,attempt){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),poll.timeout_ms);
  const startedAt=new Date().toISOString();
  try{
    const fetched=await fetchFollowingRedirects(poll.request.url,method,controller.signal);
    const response=fetched.response;
    const contentType=response.headers.get('content-type')??'';
    const body=method==='HEAD'?Buffer.alloc(0):await readLimited(response,poll.max_bytes);
    const contentSha=method==='HEAD'?null:crypto.createHash('sha256').update(body).digest('hex');
    const result={
      attempt,
      method:fetched.method,
      requested_url:poll.request.url,
      final_url:fetched.finalUrl,
      started_at:startedAt,
      finished_at:new Date().toISOString(),
      ok:response.ok,
      route_ok:response.ok,
      content_ok:response.ok&&method!=='HEAD',
      success_mode:response.ok?(method==='HEAD'?'metadata_fingerprint':'content'):null,
      status:response.status,
      content_type:contentType,
      content_length:response.headers.get('content-length'),
      etag:response.headers.get('etag'),
      last_modified:response.headers.get('last-modified'),
      date:response.headers.get('date'),
      retry_after:response.headers.get('retry-after'),
      redirect_chain:fetched.redirectChain,
      content_sha256:contentSha,
      summary:summary(body,contentType,method)
    };
    result.failure_class=result.ok?null:statusFailureClass(result.status);
    result.fingerprint_sha256=result.content_sha256??metadataFingerprint(result);
    result.sha256=result.fingerprint_sha256;
    return result;
  }catch(error){
    return{
      attempt,
      method,
      requested_url:poll.request.url,
      started_at:startedAt,
      finished_at:new Date().toISOString(),
      ok:false,
      route_ok:false,
      content_ok:false,
      status:null,
      failure_class:errorFailureClass(error),
      error:error.message,
      error_code:error?.cause?.code??null,
      redirect_chain:[]
    };
  }finally{
    clearTimeout(timer);
  }
}

function parseRetryAfter(value){
  if(!value)return 0;
  const seconds=Number(value);
  if(Number.isFinite(seconds)&&seconds>=0)return seconds*1000;
  const date=Date.parse(value);
  return Number.isFinite(date)?Math.max(0,date-Date.now()):0;
}

function retryable(result){
  if(result.status!==null&&policy.request_policy.retryable_statuses.includes(result.status))return true;
  if(policy.request_policy.retry_transport_failures&&['transport_failure','tls_failure','dns_failure'].includes(result.failure_class))return true;
  if(policy.request_policy.retry_timeouts&&result.failure_class==='timeout')return true;
  return false;
}

function retryDelay(result,attempt){
  const base=Number(policy.request_policy.base_retry_delay_ms??1000)*2**Math.max(0,attempt-1);
  const retryAfter=policy.request_policy.honor_retry_after?parseRetryAfter(result.retry_after):0;
  return Math.min(Number(policy.request_policy.maximum_retry_delay_ms??12000),Math.max(base,retryAfter));
}

async function pollOne(poll){
  const attempts=[];
  let primaryFailure=null;
  const maximum=Number(policy.request_policy.maximum_attempts??1);
  for(let attempt=1;attempt<=maximum;attempt+=1){
    const result=await requestAttempt(poll,'GET',attempt);
    attempts.push(compactAttempt(result));
    if(result.ok)return{...result,attempts,primary_failure:null};
    primaryFailure=result;
    if(attempt<maximum&&retryable(result))await sleep(retryDelay(result,attempt));
    else break;
  }
  const fallback=policy.request_policy.metadata_fallback;
  if(fallback?.enabled&&fallback.trigger_failure_classes.includes(primaryFailure?.failure_class)){
    const head=await requestAttempt(poll,fallback.method??'HEAD',attempts.length+1);
    attempts.push(compactAttempt(head));
    if(head.ok){
      return{
        ...head,
        ok:true,
        route_ok:true,
        content_ok:false,
        success_mode:'metadata_fingerprint',
        primary_failure:{
          status:primaryFailure.status??null,
          failure_class:primaryFailure.failure_class,
          error:primaryFailure.error??null
        },
        attempts
      };
    }
  }
  return{...primaryFailure,attempts,primary_failure:null};
}

for(const poll of selected){
  const started=new Date().toISOString();
  const source=sourceById.get(poll.source_id);
  const result=await pollOne(poll);
  const observation={
    orbit_id:orbitId,
    poll_id:poll.poll_id,
    source_id:poll.source_id,
    source_name:source?.name,
    basin_id:poll.basin_id,
    hydrology_class:poll.hydrology_class,
    started_at:started,
    request:{method:poll.request.method,url:poll.request.url},
    source_language_tags:source?.language_tags??[],
    translation_state:'not_performed',
    promotion_ceiling:poll.promotion_ceiling,
    ...result
  };
  const prior=previous.observations?.[poll.poll_id]??null;
  const changed=Boolean(prior)&&(
    prior.fingerprint_sha256!==observation.fingerprint_sha256||
    prior.status!==observation.status||
    prior.etag!==observation.etag||
    prior.last_modified!==observation.last_modified||
    prior.success_mode!==observation.success_mode
  );
  observation.changed_from_previous=changed;
  observations[poll.poll_id]=observation;
  for(const attempt of observation.attempts??[])attemptLedger.push({orbit_id:orbitId,poll_id:poll.poll_id,source_id:poll.source_id,basin_id:poll.basin_id,...attempt});
  if(!observation.route_ok){
    failures.push({
      orbit_id:orbitId,
      poll_id:poll.poll_id,
      source_id:poll.source_id,
      basin_id:poll.basin_id,
      status:observation.status??null,
      failure_class:observation.failure_class??'unknown_failure',
      error:observation.error??null,
      attempts:observation.attempts??[],
      promotion_ceiling:'candidate_only'
    });
  }else if(!observation.content_ok){
    degraded.push({
      orbit_id:orbitId,
      poll_id:poll.poll_id,
      source_id:poll.source_id,
      basin_id:poll.basin_id,
      success_mode:observation.success_mode,
      primary_failure:observation.primary_failure,
      final_url:observation.final_url,
      promotion_ceiling:'candidate_only'
    });
  }
  if(changed){
    changes.push({
      event_type:'source_state_changed',
      orbit_id:orbitId,
      poll_id:poll.poll_id,
      source_id:poll.source_id,
      basin_id:poll.basin_id,
      prior:prior?{status:prior.status,fingerprint_sha256:prior.fingerprint_sha256??prior.sha256,etag:prior.etag,last_modified:prior.last_modified,success_mode:prior.success_mode??'content'}:null,
      current:{status:observation.status,fingerprint_sha256:observation.fingerprint_sha256,etag:observation.etag,last_modified:observation.last_modified,success_mode:observation.success_mode},
      promotion_ceiling:'candidate_only'
    });
  }
  if(observation.route_ok&&(changed||!prior)){
    candidates.push({
      candidate_type:observation.content_ok?(prior?'changed_source_locator':'new_source_baseline'):(prior?'changed_metadata_fingerprint':'new_metadata_fingerprint'),
      orbit_id:orbitId,
      poll_id:poll.poll_id,
      source_id:poll.source_id,
      source_name:source?.name,
      basin_id:poll.basin_id,
      hydrology_class:poll.hydrology_class,
      catchments:source?.catchments??[],
      request_url:observation.request.url,
      final_url:observation.final_url,
      response_sha256:observation.content_sha256,
      fingerprint_sha256:observation.fingerprint_sha256,
      summary:observation.summary,
      success_mode:observation.success_mode,
      translation_state:'not_performed',
      terminal_state:observation.content_ok?'unrouted_discovery':'unrouted_metadata_only',
      promotes_to:'candidate_only',
      graph_effect:'none'
    });
  }
  console.log(`${poll.poll_id} ${observation.route_ok?(observation.content_ok?'CONTENT':'METADATA'):'FAIL'} ${observation.status??'-'} ${observation.failure_class??'-'} ${source?.name??poll.source_id}`);
}

const observationRows=Object.values(observations);
const routeSucceeded=observationRows.filter((row)=>row.route_ok).length;
const contentSucceeded=observationRows.filter((row)=>row.content_ok).length;
const metadataOnly=observationRows.filter((row)=>row.route_ok&&!row.content_ok).length;
const failureClassCounts=failures.reduce((acc,row)=>{acc[row.failure_class]=(acc[row.failure_class]??0)+1;return acc},{});
const unclassifiedFailures=failures.filter((row)=>!policy.failure_taxonomy.includes(row.failure_class)).length;
const classHealth={};
for(const row of observationRows){
  const current=classHealth[row.hydrology_class]??{selected:0,route_succeeded:0,content_succeeded:0,metadata_only:0,failed:0};
  current.selected+=1;
  if(row.route_ok)current.route_succeeded+=1;else current.failed+=1;
  if(row.content_ok)current.content_succeeded+=1;
  if(row.route_ok&&!row.content_ok)current.metadata_only+=1;
  classHealth[row.hydrology_class]=current;
}
for(const current of Object.values(classHealth)){
  current.route_success_rate=current.selected?Number((current.route_succeeded/current.selected).toFixed(4)):0;
  current.content_success_rate=current.selected?Number((current.content_succeeded/current.selected).toFixed(4)):0;
}
const requiredGroupsSatisfied=policy.acceptance_contract.required_content_success_groups.map((group)=>({
  group,
  satisfied:group.some((name)=>(classHealth[name]?.content_succeeded??0)>0)
}));
const routeSuccessRate=selected.length?Number((routeSucceeded/selected.length).toFixed(4)):0;
const contentSuccessRate=selected.length?Number((contentSucceeded/selected.length).toFixed(4)):0;
const basinHealth={
  route_rate_met:routeSuccessRate>=policy.acceptance_contract.minimum_basin_route_success_rate,
  content_rate_met:contentSuccessRate>=policy.acceptance_contract.minimum_basin_content_success_rate,
  required_content_groups:requiredGroupsSatisfied,
  required_groups_met:requiredGroupsSatisfied.every((row)=>row.satisfied),
  all_failures_classified:unclassifiedFailures===0
};
basinHealth.coverage_healthy=basinHealth.route_rate_met&&basinHealth.content_rate_met&&basinHealth.required_groups_met&&basinHealth.all_failures_classified;
const counts={
  selected:selected.length,
  succeeded:routeSucceeded,
  route_succeeded:routeSucceeded,
  content_succeeded:contentSucceeded,
  metadata_only:metadataOnly,
  failed:failures.length,
  degraded:degraded.length,
  changed:changes.length,
  candidates:candidates.length,
  route_success_rate:routeSuccessRate,
  content_success_rate:contentSuccessRate,
  unclassified_failures:unclassifiedFailures
};
const stateSeparation={
  execution_complete:true,
  route_healthy:basinHealth.route_rate_met,
  content_healthy:basinHealth.content_rate_met&&basinHealth.required_groups_met,
  coverage_healthy:basinHealth.coverage_healthy,
  evidence_sufficient:false
};
const snapshot={
  schema:'m04g-global-circulation-orbit@2',
  program_id:'M04G-GC-002',
  orbit_id:orbitId,
  observed_at:now.toISOString(),
  basin:basinArg,
  selected_classes:classArg,
  counts,
  class_health:classHealth,
  basin_health:basinHealth,
  state_separation:stateSeparation,
  failure_class_counts:failureClassCounts,
  observations,
  boundaries:{
    metadata_fingerprint_proves_content_access:false,
    route_health_proves_evidence_sufficiency:false,
    source_failure_proves_suppression_or_intent:false,
    promotes_to:'candidate_only',
    graph_effect:'none',
    conclusion_generated:false,
    estate_completion_claimed:false
  }
};
write(path.join(outputDir,'snapshots',`${basinArg}.json`),snapshot);
write(statePath,snapshot);
write(path.join(outputDir,'orbit-manifest.json'),{
  orbit_id:orbitId,
  basin:basinArg,
  classes:classArg,
  counts,
  class_health:classHealth,
  basin_health:basinHealth,
  state_separation:stateSeparation,
  failure_class_counts:failureClassCounts,
  strict_min_success:strictMin
});
write(path.join(outputDir,'run-plan.json'),{orbit_id:orbitId,initial_delay_ms:initialDelayMs,plan});
append(path.join(outputDir,'changes.ndjson'),changes);
append(path.join(outputDir,'candidates.ndjson'),candidates);
append(path.join(outputDir,'failures.ndjson'),failures);
append(path.join(outputDir,'degraded.ndjson'),degraded);
append(path.join(outputDir,'attempts.ndjson'),attemptLedger);
console.log(JSON.stringify({counts,class_health:classHealth,basin_health:basinHealth,state_separation:stateSeparation,failure_class_counts:failureClassCounts},null,2));
if(routeSucceeded<strictMin)process.exit(2);
console.log('refresh-m04g-global-circulation: COMPLETE');
