import crypto from 'node:crypto';

export const CONTRACT_SCHEMA='m05-answerable-power-s03-l7-five-domain-route-watch-contract@1';
export const RECEIPT_SCHEMA='m05-answerable-power-s03-l7-five-domain-route-watch-receipt@1';
export const TERMINAL_STATUSES=new Set([
  'content_retrieved',
  'metadata_only',
  'challenge_page',
  'gated_not_before',
  'http_failure',
  'transport_failure',
  'timeout',
  'body_limit_exceeded',
  'policy_refusal'
]);

const EXPECTED_LANE_IDS=[
  'M05-IF-ADMIN-AU-ROBODEBT-DURABILITY',
  'M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS',
  'M05-IF-WORK-IT-FOODINHO-COMPLIANCE',
  'M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY',
  'M05-IF-VALUE-US-INTEL-REALIZATION'
];
const EXPECTED_ROUTE_CLASSES=new Set([
  'active_public_record_acquisition',
  'controlled_subject_or_archival_acquisition',
  'future_time_gated_monitoring'
]);
const NON_FAILURE_STATUSES=new Set(['content_retrieved','metadata_only','gated_not_before']);

export const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
export const sha256=(value)=>crypto.createHash('sha256').update(value).digest('hex');

function fail(message){throw new Error(message)}
function assert(condition,message){if(!condition)fail(message)}
function isObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}
function normalizeHost(value){return String(value||'').trim().toLowerCase().replace(/\.$/u,'')}

function canonicalize(value){
  if(Array.isArray(value))return value.map(canonicalize);
  if(isObject(value)){
    return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value){return JSON.stringify(canonicalize(value))}
export function semanticSha256(value){return sha256(Buffer.from(canonicalJson(value),'utf8'))}

function exactKeys(object,expected,label){
  const actual=Object.keys(object||{}).sort();
  const wanted=[...expected].sort();
  assert(JSON.stringify(actual)===JSON.stringify(wanted),`${label} keys drift: ${actual.join(', ')}`);
}

function validateAuthorityBoundaries(boundaries){
  assert(isObject(boundaries),'authority_boundaries must be an object');
  const expected={
    network_observation_only:true,
    metadata_counts_as_substantive_content:false,
    route_reachability_is_evidentiary_sufficiency:false,
    changed_bytes_are_claim_evidence:false,
    controlled_access_is_executed:false,
    direct_voice_bulk_polling_allowed:false,
    access_controls_bypassed:false,
    promotion_authority:false,
    answer_changes_authorized:false,
    effective_domain_answers:0,
    qualifying_jurisdictions:0,
    cross_domain_regression_completed:false,
    graph_effect:'none',
    issue_345_may_close:false
  };
  exactKeys(boundaries,Object.keys(expected),'authority_boundaries');
  for(const [key,value] of Object.entries(expected))assert(boundaries[key]===value,`authority boundary ${key} must remain ${JSON.stringify(value)}`);
}

function validateExecutionPolicy(policy){
  assert(isObject(policy),'execution_policy must be an object');
  assert(policy.allowed_method==='GET','only GET is permitted');
  assert(policy.required_protocol==='https:','only HTTPS is permitted');
  assert(Number.isInteger(policy.global_concurrency)&&policy.global_concurrency>=1&&policy.global_concurrency<=8,'global_concurrency must be between 1 and 8');
  assert(policy.per_host_concurrency===1,'per-host execution must remain serialized');
  assert(Number.isInteger(policy.minimum_host_interval_ms)&&policy.minimum_host_interval_ms>=0,'minimum_host_interval_ms must be a nonnegative integer');
  assert(Number.isInteger(policy.timeout_ms)&&policy.timeout_ms>=1000&&policy.timeout_ms<=60000,'timeout_ms must be between 1000 and 60000');
  assert(Number.isInteger(policy.max_redirects)&&policy.max_redirects>=0&&policy.max_redirects<=8,'max_redirects must be between 0 and 8');
  assert(Number.isInteger(policy.max_body_bytes)&&policy.max_body_bytes>=1024&&policy.max_body_bytes<=10*1024*1024,'max_body_bytes must be between 1 KiB and 10 MiB');
  assert(policy.credentials==='omit','credentials must be omitted');
  assert(policy.cookies_sent===false,'cookies must not be sent');
  assert(policy.authorization_sent===false,'authorization must not be sent');
  assert(policy.cache_mode==='no-store','cache mode must remain no-store');
  assert(policy.body_hash_domain==='http_representation_octets_after_content_decoding','body hash domain must remain decoded HTTP representation octets');
  assert(policy.body_retained_in_receipt===false,'response bodies must not be retained in the receipt');
  assert(policy.host_interval_applies_to_each_http_request===true,'host interval must apply to every HTTP request and redirect hop');
  assert(policy.challenge_pages_count_as_substantive_content===false,'challenge pages must not count as substantive content');
  assert(policy.receipt_unknown_fields_allowed===false,'receipt schemas must remain closed');
  assert(policy.future_observation_clock_authorizes_execution===false,'future observation clocks must not authorize route execution');
  const retainedHeaders=['content-type','content-length','content-encoding','etag','last-modified','cache-control','date'];
  assert(Array.isArray(policy.retained_response_headers)&&canonicalJson(policy.retained_response_headers)===canonicalJson(retainedHeaders),'retained response-header allowlist drift');
  assert(typeof policy.user_agent==='string'&&policy.user_agent.includes('CliffordNumber-M05-Five-Domain-Route-Watch/'),'a bounded watcher user agent is required');
}

function validateRoute(route,lane,bindingKeys,routeIds,urls){
  assert(isObject(route),`lane ${lane.lane_id} contains a non-object route`);
  assert(typeof route.route_id==='string'&&route.route_id.startsWith('M05-WATCH-'),`lane ${lane.lane_id} has an invalid route_id`);
  assert(!routeIds.has(route.route_id),`duplicate route_id ${route.route_id}`);
  routeIds.add(route.route_id);
  assert(route.method==='GET',`${route.route_id} must use GET`);
  let parsed;
  try{parsed=new URL(route.url)}catch{fail(`${route.route_id} has an invalid URL`)}
  assert(parsed.protocol==='https:',`${route.route_id} must use HTTPS`);
  assert(!parsed.username&&!parsed.password,`${route.route_id} must not embed credentials`);
  assert(!urls.has(route.url),`duplicate route URL ${route.url}`);
  urls.add(route.url);
  assert(Array.isArray(route.allowed_hosts)&&route.allowed_hosts.length>=1,`${route.route_id} requires allowed_hosts`);
  const hosts=route.allowed_hosts.map(normalizeHost);
  assert(hosts.every((host)=>host&&host===host.toLowerCase()&&!host.includes('*')&&!host.includes('/')),`${route.route_id} has an invalid allowed host`);
  assert(new Set(hosts).size===hosts.length,`${route.route_id} repeats an allowed host`);
  assert(hosts.includes(normalizeHost(parsed.hostname)),`${route.route_id} initial host is not allowlisted`);
  assert(bindingKeys.has(route.source_binding),`${route.route_id} names unknown source binding ${route.source_binding}`);
  assert(typeof route.source_record==='string'&&route.source_record,`${route.route_id} requires a source_record`);
}

export function validateContract(contract){
  assert(isObject(contract),'contract must be an object');
  assert(contract.schema_version===CONTRACT_SCHEMA,`unexpected contract schema ${contract.schema_version}`);
  assert(contract.object_class==='bounded_five_domain_official_route_watch_contract','unexpected object_class');
  assert(contract.program_id==='M-05'&&contract.sprint_id==='M05-SPRINT-03'&&contract.leg_id==='S03-L7','program identity drift');
  assert(contract.issue===345,'issue binding must remain 345');
  assert(contract.status==='network_observation_only','contract status must remain network_observation_only');
  assert(isObject(contract.canonical_bindings),'canonical_bindings must be an object');
  const bindingKeys=new Set(Object.keys(contract.canonical_bindings));
  for(const [name,binding] of Object.entries(contract.canonical_bindings)){
    assert(isObject(binding),`canonical binding ${name} must be an object`);
    assert(typeof binding.path==='string'&&binding.path.startsWith('data/project/'),`canonical binding ${name} has an invalid path`);
    assert(/^[0-9a-f]{40}$/u.test(binding.blob_sha),`canonical binding ${name} has an invalid blob SHA`);
  }
  assert(isObject(contract.denominator),'denominator must be an object');
  assert(contract.denominator.lanes===5,'lane denominator must remain five');
  assert(contract.denominator.routes_per_lane===4,'routes-per-lane denominator must remain four');
  assert(contract.denominator.routes===20,'route denominator must remain twenty');
  assert(contract.denominator.failed_routes_preserved===true,'failed routes must remain in the denominator');
  assert(contract.denominator.gated_routes_preserved===true,'gated routes must remain in the denominator');
  assert(contract.denominator.one_terminal_observation_per_route===true,'one terminal observation per route is required');
  validateExecutionPolicy(contract.execution_policy);
  validateAuthorityBoundaries(contract.authority_boundaries);
  assert(isObject(contract.intel_time_gate),'intel_time_gate must be an object');
  assert(contract.intel_time_gate.lane_id==='M05-IF-VALUE-US-INTEL-REALIZATION','Intel lane binding drift');
  assert(contract.intel_time_gate.ordinary_gate_utc==='2026-08-27T00:00:00Z','Intel ordinary gate drift');
  assert(contract.intel_time_gate.before_gate_route_state==='gated_not_before','Intel pre-gate state drift');
  assert(contract.intel_time_gate.early_exception_acquisition_is_separate_control===true,'Intel early exception must remain a separate control');
  assert(contract.intel_time_gate.bilateral_exception_observed===false,'contract must not invent a bilateral exception');
  assert(contract.intel_time_gate.elapsed_time_is_transaction_evidence===false,'elapsed time must not become transaction evidence');
  assert(Array.isArray(contract.lanes)&&contract.lanes.length===5,'contract must contain five lanes');
  const laneIds=[];
  const routeIds=new Set();
  const urls=new Set();
  for(const lane of contract.lanes){
    assert(isObject(lane),'lane must be an object');
    assert(typeof lane.lane_id==='string'&&lane.lane_id,'lane_id is required');
    laneIds.push(lane.lane_id);
    assert(typeof lane.domain_id==='string'&&lane.domain_id.startsWith('APC-'),`${lane.lane_id} requires a domain_id`);
    assert(typeof lane.jurisdiction==='string'&&lane.jurisdiction.length===2,`${lane.lane_id} requires a two-letter jurisdiction`);
    assert(EXPECTED_ROUTE_CLASSES.has(lane.route_class),`${lane.lane_id} has an invalid route class`);
    assert(lane.answer_changes_authorized===false,`${lane.lane_id} must not authorize answer changes`);
    assert(Array.isArray(lane.routes)&&lane.routes.length===4,`${lane.lane_id} must contain four routes`);
    for(const route of lane.routes)validateRoute(route,lane,bindingKeys,routeIds,urls);
  }
  assert(JSON.stringify(laneIds)===JSON.stringify(EXPECTED_LANE_IDS),'lane order or identity drift');
  assert(new Set(laneIds).size===5,'lane identities must be unique');
  assert(routeIds.size===20,'twenty unique route identities are required');
  const intel=contract.lanes.find((lane)=>lane.lane_id===contract.intel_time_gate.lane_id);
  assert(intel?.route_class==='future_time_gated_monitoring','Intel lane must remain future-time-gated');
  const syri=contract.lanes.find((lane)=>lane.lane_id==='M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS');
  assert(syri?.controlled_or_subject_access_required===true,'SyRI must preserve the controlled subject-access boundary');
  assert(syri?.public_route_observation_satisfies_evidence_access===false,'public SyRI route observation cannot satisfy person-level evidence access');
  return contract;
}

export function flattenRoutes(contract){
  validateContract(contract);
  return contract.lanes.flatMap((lane)=>lane.routes.map((route)=>({lane,route})));
}

export function routeActivation(lane,contract,observedAtMs){
  const clock=Number(observedAtMs);
  assert(Number.isFinite(clock),'observedAtMs must be a finite number');
  if(lane.lane_id!==contract.intel_time_gate.lane_id)return {state:'active',not_before_utc:null};
  const gate=Date.parse(contract.intel_time_gate.ordinary_gate_utc);
  assert(Number.isFinite(gate),'Intel ordinary gate must parse as a timestamp');
  return clock<gate?{state:'gated_not_before',not_before_utc:contract.intel_time_gate.ordinary_gate_utc}:{state:'active',not_before_utc:contract.intel_time_gate.ordinary_gate_utc};
}

function selectedHeaders(headers,names){
  const result={};
  for(const name of names){
    const value=headers?.get?.(name);
    if(value!==null&&value!==undefined)result[name]=value;
  }
  return result;
}

function policyObservation(lane,route,observedAt,status,reason,extra={}){
  return {
    lane_id:lane.lane_id,
    domain_id:lane.domain_id,
    jurisdiction:lane.jurisdiction,
    route_class:lane.route_class,
    route_id:route.route_id,
    requested_url:route.url,
    final_url:route.url,
    observed_at:observedAt,
    terminal:true,
    status,
    status_code:null,
    reason,
    route_success:false,
    content_success:false,
    metadata_only:false,
    network_request_count:0,
    redirect_chain:[],
    response_headers:{},
    body_bytes:0,
    body_sha256:null,
    changed_since_previous:null,
    network_observation_only:true,
    promotion_authority:false,
    answer_effect:'none',
    graph_effect:'none',
    ...extra
  };
}

function hostAllowed(route,url){return route.allowed_hosts.map(normalizeHost).includes(normalizeHost(url.hostname))}

async function readBounded(response,maxBytes){
  if(!response.body)return Buffer.alloc(0);
  const chunks=[];
  let total=0;
  for await(const chunk of response.body){
    const buffer=Buffer.from(chunk);
    total+=buffer.length;
    if(total>maxBytes){
      try{await response.body.cancel()}catch{}
      const error=new Error(`response exceeded ${maxBytes} bytes`);
      error.code='BODY_LIMIT_EXCEEDED';
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function isChallengePage(body,headers){
  const contentType=String(headers['content-type']||'').toLowerCase();
  if(!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml'))return false;
  const text=body.subarray(0,131072).toString('utf8').toLowerCase();
  return (
    (text.includes('just a moment')&&(text.includes('cf-chl-')||text.includes('/cdn-cgi/challenge-platform/'))) ||
    (text.includes('attention required')&&text.includes('cloudflare ray id')) ||
    (text.includes('enable javascript and cookies to continue')&&text.includes('cloudflare')) ||
    (text.includes('request unsuccessful')&&text.includes('incapsula incident id')) ||
    (text.includes('access denied')&&text.includes('reference #')&&text.includes('akamai'))
  );
}

export function classifyTransportError(error){
  const code=String(error?.code||error?.cause?.code||'').toUpperCase();
  const message=String(error?.message||error||'').toLowerCase();
  if(code==='BODY_LIMIT_EXCEEDED')return 'body_limit_exceeded';
  if(error?.name==='AbortError'||message.includes('timeout')||message.includes('aborted'))return 'timeout';
  return 'transport_failure';
}

export async function fetchOfficialRoute(lane,route,contract,{fetchImpl=globalThis.fetch,clock=Date.now,beforeRequest=async()=>{}}={}){
  assert(typeof fetchImpl==='function','fetch implementation is required');
  assert(typeof beforeRequest==='function','beforeRequest hook is required');
  const policy=contract.execution_policy;
  const startedAt=new Date(clock()).toISOString();
  let current=new URL(route.url);
  let requestCount=0;
  const redirectChain=[];
  for(let redirectIndex=0;redirectIndex<=policy.max_redirects;redirectIndex++){
    if(current.protocol!==policy.required_protocol){
      return policyObservation(lane,route,startedAt,'policy_refusal','non_https_target',{final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain});
    }
    if(!hostAllowed(route,current)){
      return policyObservation(lane,route,startedAt,'policy_refusal','redirect_host_not_allowlisted',{final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain});
    }
    if(current.username||current.password){
      return policyObservation(lane,route,startedAt,'policy_refusal','embedded_credentials_refused',{final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain});
    }
    await beforeRequest(normalizeHost(current.hostname),policy.minimum_host_interval_ms);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(new Error(`timeout after ${policy.timeout_ms}ms`)),policy.timeout_ms);
    let response;
    try{
      requestCount+=1;
      response=await fetchImpl(current.toString(),{
        method:'GET',
        redirect:'manual',
        credentials:'omit',
        cache:'no-store',
        signal:controller.signal,
        headers:{
          'user-agent':policy.user_agent,
          'accept':'text/html,application/xhtml+xml,application/json,application/xml,text/xml,text/plain,application/pdf,application/octet-stream,*/*;q=0.1'
        }
      });
    }catch(error){
      clearTimeout(timer);
      const status=classifyTransportError(error);
      return policyObservation(lane,route,startedAt,status,String(error?.message||error),{final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain});
    }
    const headers=selectedHeaders(response.headers,policy.retained_response_headers);
    if(response.status>=300&&response.status<400){
      const location=response.headers.get('location');
      try{await response.body?.cancel()}catch{}
      clearTimeout(timer);
      if(!location){
        return policyObservation(lane,route,startedAt,'policy_refusal','redirect_without_location',{status_code:response.status,final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain,response_headers:headers});
      }
      let next;
      try{next=new URL(location,current)}catch{
        return policyObservation(lane,route,startedAt,'policy_refusal','invalid_redirect_location',{status_code:response.status,final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain,response_headers:headers});
      }
      redirectChain.push({from:current.toString(),status:response.status,location,to:next.toString()});
      if(next.protocol!=='https:'){
        return policyObservation(lane,route,startedAt,'policy_refusal','https_downgrade_refused',{status_code:response.status,final_url:next.toString(),network_request_count:requestCount,redirect_chain:redirectChain,response_headers:headers});
      }
      if(!hostAllowed(route,next)){
        return policyObservation(lane,route,startedAt,'policy_refusal','redirect_host_not_allowlisted',{status_code:response.status,final_url:next.toString(),network_request_count:requestCount,redirect_chain:redirectChain,response_headers:headers});
      }
      current=next;
      continue;
    }
    let body;
    try{body=await readBounded(response,policy.max_body_bytes)}catch(error){
      const status=classifyTransportError(error);
      return policyObservation(lane,route,startedAt,status,String(error?.message||error),{status_code:response.status,final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain,response_headers:headers});
    }finally{clearTimeout(timer)}
    const completedAt=new Date(clock()).toISOString();
    const challengePage=body.length>0&&isChallengePage(body,headers);
    const metadataOnly=response.ok&&!challengePage&&body.length===0;
    const status=challengePage?'challenge_page':(response.ok?(metadataOnly?'metadata_only':'content_retrieved'):'http_failure');
    return {
      lane_id:lane.lane_id,
      domain_id:lane.domain_id,
      jurisdiction:lane.jurisdiction,
      route_class:lane.route_class,
      route_id:route.route_id,
      requested_url:route.url,
      final_url:current.toString(),
      observed_at:startedAt,
      completed_at:completedAt,
      terminal:true,
      status,
      status_code:response.status,
      reason:challengePage?'challenge_page_detected':(response.ok?null:`HTTP ${response.status}`),
      route_success:Boolean(response.ok&&!challengePage),
      content_success:Boolean(response.ok&&!challengePage&&body.length>0),
      metadata_only:metadataOnly,
      network_request_count:requestCount,
      redirect_chain:redirectChain,
      response_headers:headers,
      body_bytes:body.length,
      body_sha256:body.length?sha256(body):null,
      changed_since_previous:null,
      network_observation_only:true,
      promotion_authority:false,
      answer_effect:'none',
      graph_effect:'none'
    };
  }
  return policyObservation(lane,route,startedAt,'policy_refusal','redirect_limit_exceeded',{final_url:current.toString(),network_request_count:requestCount,redirect_chain:redirectChain});
}

export class HostGate{
  constructor({sleepImpl=sleep,clock=Date.now}={}){this.sleepImpl=sleepImpl;this.clock=clock;this.chains=new Map();this.lastRequestStart=new Map()}
  async run(host,_minimumIntervalMs,operation){
    const key=normalizeHost(host);
    const prior=this.chains.get(key)||Promise.resolve();
    let release;
    const turn=new Promise((resolve)=>{release=resolve});
    const chain=prior.then(()=>turn);
    this.chains.set(key,chain);
    await prior;
    try{return await operation()}
    finally{
      release();
      if(this.chains.get(key)===chain)this.chains.delete(key);
    }
  }
  async waitForRequest(host,minimumIntervalMs){
    const key=normalizeHost(host);
    const previous=this.lastRequestStart.get(key);
    const now=this.clock();
    const wait=previous===undefined?0:Math.max(0,minimumIntervalMs-(now-previous));
    if(wait)await this.sleepImpl(wait);
    const started=this.clock();
    this.lastRequestStart.set(key,started);
    return started;
  }
  async runMany(hosts,minimumIntervalMs,operation){
    const ordered=[...new Set(hosts.map(normalizeHost))].sort();
    assert(ordered.length>0,'at least one host lock is required');
    const acquire=(index)=>index===ordered.length?operation():this.run(ordered[index],minimumIntervalMs,()=>acquire(index+1));
    return acquire(0);
  }
}

export async function mapLimit(items,limit,fn){
  const results=new Array(items.length);
  let cursor=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){
      const index=cursor++;
      if(index>=items.length)return;
      results[index]=await fn(items[index],index);
    }
  });
  await Promise.all(workers);
  return results;
}

function comparableObservation(row){
  return {status:row.status,status_code:row.status_code,final_url:row.final_url,body_sha256:row.body_sha256,body_bytes:row.body_bytes};
}

export function compareWithPrevious(observations,previousReceipt){
  if(!previousReceipt)return observations.map((row)=>({...row,changed_since_previous:null}));
  const prior=new Map(previousReceipt.observations.map((row)=>[row.route_id,row]));
  return observations.map((row)=>{
    const previous=prior.get(row.route_id);
    return {...row,changed_since_previous:previous?canonicalJson(comparableObservation(previous))!==canonicalJson(comparableObservation(row)):null};
  });
}

function summarizeObservations(observations,contract){
  const counts=(status)=>observations.filter((row)=>row.status===status).length;
  const failureCounts={};
  for(const row of observations){
    if(NON_FAILURE_STATUSES.has(row.status))continue;
    failureCounts[row.status]=(failureCounts[row.status]||0)+1;
  }
  return {
    selected_lanes:contract.denominator.lanes,
    selected_routes:contract.denominator.routes,
    terminal_observations:observations.filter((row)=>row.terminal).length,
    executed_routes:observations.filter((row)=>row.network_request_count>0).length,
    network_requests:observations.reduce((sum,row)=>sum+row.network_request_count,0),
    gated_not_before:counts('gated_not_before'),
    route_successes:observations.filter((row)=>row.route_success).length,
    content_successes:observations.filter((row)=>row.content_success).length,
    metadata_only:counts('metadata_only'),
    challenge_pages:counts('challenge_page'),
    failed_routes:observations.filter((row)=>!row.route_success&&row.status!=='gated_not_before').length,
    policy_refusals:counts('policy_refusal'),
    unclassified_failures:observations.filter((row)=>!TERMINAL_STATUSES.has(row.status)).length,
    changed_routes:observations.filter((row)=>row.changed_since_previous===true).length,
    uncompared_routes:observations.filter((row)=>row.changed_since_previous===null).length,
    failure_counts:failureCounts,
    execution_complete:observations.length===contract.denominator.routes&&observations.every((row)=>row.terminal===true),
    denominator_preserved:observations.length===contract.denominator.routes,
    network_observation_only:true,
    qualifying_evidence_receipts:0,
    answer_changes_authorized:false,
    effective_domain_answers:0,
    qualifying_jurisdictions:0,
    cross_domain_regression_completed:false,
    graph_effect:'none',
    issue_345_may_close:false
  };
}

export async function runRouteWatch(contract,{fetchImpl=globalThis.fetch,observedAtMs=Date.now(),previousReceipt=null,sleepImpl=sleep,clock=Date.now}={}){
  validateContract(contract);
  const actualClockMs=Number(clock());
  assert(Number.isFinite(actualClockMs),'execution clock must be finite');
  assert(Number.isFinite(Number(observedAtMs)),'observation clock must be finite');
  assert(Number(observedAtMs)<=actualClockMs,'observation clock cannot be in the future');
  if(previousReceipt)validateReceipt(previousReceipt,contract);
  const observedAt=new Date(observedAtMs).toISOString();
  const gate=new HostGate({sleepImpl,clock});
  const rows=flattenRoutes(contract);
  const observations=await mapLimit(rows,contract.execution_policy.global_concurrency,async({lane,route})=>{
    const activation=routeActivation(lane,contract,observedAtMs);
    if(activation.state==='gated_not_before'){
      return policyObservation(lane,route,observedAt,'gated_not_before','ordinary Intel acquisition gate has not opened',{not_before_utc:activation.not_before_utc});
    }
    return gate.runMany(route.allowed_hosts,contract.execution_policy.minimum_host_interval_ms,()=>fetchOfficialRoute(lane,route,contract,{fetchImpl,clock,beforeRequest:(host,interval)=>gate.waitForRequest(host,interval)}));
  });
  const compared=compareWithPrevious(observations,previousReceipt);
  const summary=summarizeObservations(compared,contract);
  assert(summary.execution_complete,'route watch did not produce one terminal row per route');
  assert(summary.unclassified_failures===0,'route watch produced an unclassified terminal state');
  const receiptCore={
    schema_version:RECEIPT_SCHEMA,
    object_class:'bounded_five_domain_official_route_watch_receipt',
    program_id:'M-05',
    sprint_id:'M05-SPRINT-03',
    leg_id:'S03-L7',
    issue:345,
    generated_at:new Date(clock()).toISOString(),
    observation_clock_utc:observedAt,
    contract_semantic_sha256:semanticSha256(contract),
    contract_authoring_base:contract.canonical_base_at_authoring,
    previous_receipt_proof_sha256:previousReceipt?.proof_sha256||null,
    body_hash_domain:contract.execution_policy.body_hash_domain,
    intel_gate:{
      ordinary_gate_utc:contract.intel_time_gate.ordinary_gate_utc,
      standard_route_eligible:observedAtMs>=Date.parse(contract.intel_time_gate.ordinary_gate_utc),
      bilateral_exception_observed:false,
      elapsed_time_is_transaction_evidence:false
    },
    summary,
    observations:compared,
    authority_boundaries:contract.authority_boundaries
  };
  return {...receiptCore,proof_sha256:sha256(Buffer.from(canonicalJson(receiptCore),'utf8'))};
}

function expectedSummary(receipt,contract){return summarizeObservations(receipt.observations,contract)}

const RECEIPT_KEYS=['schema_version','object_class','program_id','sprint_id','leg_id','issue','generated_at','observation_clock_utc','contract_semantic_sha256','contract_authoring_base','previous_receipt_proof_sha256','body_hash_domain','intel_gate','summary','observations','authority_boundaries','proof_sha256'];
const SUMMARY_KEYS=['selected_lanes','selected_routes','terminal_observations','executed_routes','network_requests','gated_not_before','route_successes','content_successes','metadata_only','challenge_pages','failed_routes','policy_refusals','unclassified_failures','changed_routes','uncompared_routes','failure_counts','execution_complete','denominator_preserved','network_observation_only','qualifying_evidence_receipts','answer_changes_authorized','effective_domain_answers','qualifying_jurisdictions','cross_domain_regression_completed','graph_effect','issue_345_may_close'];
const INTEL_GATE_KEYS=['ordinary_gate_utc','standard_route_eligible','bilateral_exception_observed','elapsed_time_is_transaction_evidence'];
const OBSERVATION_KEYS=['lane_id','domain_id','jurisdiction','route_class','route_id','requested_url','final_url','observed_at','terminal','status','status_code','reason','route_success','content_success','metadata_only','network_request_count','redirect_chain','response_headers','body_bytes','body_sha256','changed_since_previous','network_observation_only','promotion_authority','answer_effect','graph_effect'];
const COMPLETED_STATUSES=new Set(['content_retrieved','metadata_only','challenge_page','http_failure']);
const POLICY_REFUSAL_REASONS=new Set(['non_https_target','redirect_host_not_allowlisted','embedded_credentials_refused','redirect_without_location','invalid_redirect_location','https_downgrade_refused','redirect_limit_exceeded']);
const REFUSAL_WITHOUT_FOLLOWUP=new Set(['non_https_target','redirect_host_not_allowlisted','embedded_credentials_refused','https_downgrade_refused','redirect_limit_exceeded']);
const FAILURE_STATUSES=new Set(['challenge_page','http_failure','transport_failure','timeout','body_limit_exceeded','policy_refusal']);

function validSha256(value){return typeof value==='string'&&/^[0-9a-f]{64}$/u.test(value)}
function nonEmptyString(value){return typeof value==='string'&&value.length>0}
function validTimestamp(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))}
function parseUrl(value,label){try{return new URL(value)}catch{fail(`${label} is not a valid URL`)}}
function allowedTarget(route,url){return url.protocol==='https:'&&!url.username&&!url.password&&hostAllowed(route,url)}

function validateResponseHeaders(headers,policy,label){
  assert(isObject(headers),`${label} response_headers must be an object`);
  const allowed=new Set(policy.retained_response_headers);
  for(const [name,value] of Object.entries(headers)){
    assert(allowed.has(name),`${label} retains undeclared response header ${name}`);
    assert(typeof value==='string',`${label} response header ${name} must be a string`);
    assert(!value.includes('\n')&&!value.includes('\r'),`${label} response header ${name} contains a line break`);
  }
}

function validateRedirectChain(row,route,policy){
  const label=row.route_id;
  assert(Array.isArray(row.redirect_chain),`${label} redirect_chain must be an array`);
  assert(row.redirect_chain.length<=policy.max_redirects+1,`${label} redirect chain exceeds the request ceiling`);
  let expectedFrom=route.url;
  for(let index=0;index<row.redirect_chain.length;index++){
    const redirect=row.redirect_chain[index];
    assert(isObject(redirect),`${label} redirect ${index} must be an object`);
    exactKeys(redirect,['from','status','location','to'],`${label} redirect ${index}`);
    assert(redirect.from===expectedFrom,`${label} redirect ${index} source is discontinuous`);
    const from=parseUrl(redirect.from,`${label} redirect ${index} from`);
    assert(allowedTarget(route,from),`${label} redirect ${index} starts outside the route allowlist`);
    assert(Number.isInteger(redirect.status)&&redirect.status>=300&&redirect.status<=399,`${label} redirect ${index} has an invalid status`);
    assert(nonEmptyString(redirect.location),`${label} redirect ${index} requires a location`);
    const resolved=new URL(redirect.location,from).toString();
    assert(redirect.to===resolved,`${label} redirect ${index} location does not resolve to its target`);
    const to=parseUrl(redirect.to,`${label} redirect ${index} to`);
    const followed=index<row.network_request_count-1;
    if(followed)assert(allowedTarget(route,to),`${label} followed a redirect outside the route allowlist`);
    expectedFrom=redirect.to;
  }
  assert(row.final_url===expectedFrom,`${label} final URL does not reconcile to its redirect chain`);
}

function validateAddressing(row,route){
  const label=row.route_id;
  const finalUrl=parseUrl(row.final_url,`${label} final_url`);
  if(row.status!=='policy_refusal'){
    assert(allowedTarget(route,finalUrl),`${label} final URL is outside the route allowlist`);
    return;
  }
  assert(POLICY_REFUSAL_REASONS.has(row.reason),`${label} has an unknown policy-refusal reason`);
  if(row.reason==='non_https_target'||row.reason==='https_downgrade_refused')assert(finalUrl.protocol!=='https:',`${label} did not record the refused HTTPS downgrade`);
  else if(row.reason==='redirect_host_not_allowlisted')assert(finalUrl.protocol==='https:'&&!hostAllowed(route,finalUrl),`${label} did not record a nonallowlisted redirect host`);
  else if(row.reason==='embedded_credentials_refused')assert(Boolean(finalUrl.username||finalUrl.password),`${label} did not record embedded credentials`);
  else assert(allowedTarget(route,finalUrl),`${label} policy refusal final URL is incoherent`);
}

function validateObservationState(row,lane,route,contract){
  const label=row.route_id;
  const policy=contract.execution_policy;
  const keys=[...OBSERVATION_KEYS];
  if(COMPLETED_STATUSES.has(row.status))keys.push('completed_at');
  if(row.status==='gated_not_before')keys.push('not_before_utc');
  exactKeys(row,keys,`${label} observation`);
  assert(row.lane_id===lane.lane_id,`${label} lane binding drift`);
  assert(row.domain_id===lane.domain_id,`${label} domain binding drift`);
  assert(row.jurisdiction===lane.jurisdiction,`${label} jurisdiction binding drift`);
  assert(row.route_class===lane.route_class,`${label} route-class binding drift`);
  assert(row.requested_url===route.url,`${label} requested URL binding drift`);
  assert(validTimestamp(row.observed_at),`${label} has an invalid observation timestamp`);
  if(COMPLETED_STATUSES.has(row.status)){
    assert(validTimestamp(row.completed_at),`${label} has an invalid completion timestamp`);
    assert(Date.parse(row.completed_at)>=Date.parse(row.observed_at),`${label} completes before it starts`);
  }
  assert(row.terminal===true,`${label} is not terminal`);
  assert(typeof row.route_success==='boolean',`${label} route_success must be boolean`);
  assert(typeof row.content_success==='boolean',`${label} content_success must be boolean`);
  assert(typeof row.metadata_only==='boolean',`${label} metadata_only must be boolean`);
  assert(row.changed_since_previous===null||typeof row.changed_since_previous==='boolean',`${label} changed_since_previous must be boolean or null`);
  assert(Number.isInteger(row.network_request_count)&&row.network_request_count>=0&&row.network_request_count<=policy.max_redirects+1,`${label} has an invalid request count`);
  assert(row.status_code===null||(Number.isInteger(row.status_code)&&row.status_code>=100&&row.status_code<=599),`${label} has an invalid status_code`);
  assert(Number.isInteger(row.body_bytes)&&row.body_bytes>=0,`${label} has an invalid body byte count`);
  assert(row.body_bytes<=policy.max_body_bytes,`${label} body byte count exceeds the contract ceiling`);
  if(row.body_bytes===0)assert(row.body_sha256===null,`${label} zero-byte observation must not carry a body digest`);
  else assert(validSha256(row.body_sha256),`${label} nonempty body requires a SHA-256 digest`);
  validateResponseHeaders(row.response_headers,policy,label);
  validateRedirectChain(row,route,policy);
  validateAddressing(row,route);

  if(row.status==='gated_not_before'){
    assert(row.network_request_count===0&&row.redirect_chain.length===0,`${label} executed before its gate`);
  }else if(row.status==='policy_refusal'&&REFUSAL_WITHOUT_FOLLOWUP.has(row.reason)){
    assert(row.network_request_count===row.redirect_chain.length,`${label} policy-refusal request count does not reconcile`);
  }else{
    assert(row.network_request_count===row.redirect_chain.length+1,`${label} request count does not reconcile to redirects`);
  }

  const contentRetrieved=row.status==='content_retrieved';
  const metadataOnly=row.status==='metadata_only';
  assert(row.route_success===(contentRetrieved||metadataOnly),`${label} route_success is incoherent with ${row.status}`);
  assert(row.content_success===contentRetrieved,`${label} content_success is incoherent with ${row.status}`);
  assert(row.metadata_only===metadataOnly,`${label} metadata_only flag is incoherent with ${row.status}`);

  switch(row.status){
    case 'content_retrieved':
      assert(row.status_code>=200&&row.status_code<=299,`${label} content_retrieved requires a 2xx status`);
      assert(row.body_bytes>0,`${label} content_retrieved requires positive body bytes`);
      assert(row.reason===null,`${label} content_retrieved must not carry a failure reason`);
      break;
    case 'metadata_only':
      assert(row.status_code>=200&&row.status_code<=299,`${label} metadata_only requires a 2xx status`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} metadata_only must remain bodyless`);
      assert(row.reason===null,`${label} metadata_only must not carry a failure reason`);
      break;
    case 'challenge_page':
      assert(row.status_code>=200&&!(row.status_code>=300&&row.status_code<=399),`${label} challenge_page requires a nonredirect HTTP status`);
      assert(row.body_bytes>0&&validSha256(row.body_sha256),`${label} challenge_page requires its representation digest`);
      assert(row.reason==='challenge_page_detected',`${label} challenge_page reason drift`);
      break;
    case 'http_failure':
      assert(row.status_code>=400&&row.status_code<=599,`${label} http_failure requires a 4xx or 5xx status`);
      assert(nonEmptyString(row.reason),`${label} http_failure requires a reason`);
      break;
    case 'transport_failure':
    case 'timeout':
      assert(row.status_code===null,`${label} ${row.status} status_code must be null`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} ${row.status} must not retain body bytes`);
      assert(nonEmptyString(row.reason),`${label} ${row.status} requires a reason`);
      break;
    case 'body_limit_exceeded':
      assert(row.status_code!==null&&row.status_code>=200&&!(row.status_code>=300&&row.status_code<=399),`${label} body_limit_exceeded requires a nonredirect HTTP status`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} body_limit_exceeded must not retain body bytes`);
      assert(nonEmptyString(row.reason),`${label} body_limit_exceeded requires a reason`);
      break;
    case 'gated_not_before':
      assert(row.status_code===null,`${label} gated_not_before status_code must be null`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} gated_not_before must remain bodyless`);
      assert(row.not_before_utc===contract.intel_time_gate.ordinary_gate_utc,`${label} Intel not-before boundary drift`);
      assert(nonEmptyString(row.reason),`${label} gated_not_before requires a reason`);
      break;
    case 'policy_refusal':
      assert(row.status_code===null||(row.status_code>=300&&row.status_code<=399),`${label} policy_refusal status_code must be null or 3xx`);
      assert(row.body_bytes===0&&row.body_sha256===null,`${label} policy_refusal must not retain body bytes`);
      assert(nonEmptyString(row.reason),`${label} policy_refusal requires a reason`);
      break;
    default:
      fail(`${label} has unclassified status ${row.status}`);
  }
}

export function validateReceipt(receipt,contract){
  validateContract(contract);
  assert(isObject(receipt),'receipt must be an object');
  exactKeys(receipt,RECEIPT_KEYS,'receipt');
  assert(receipt.schema_version===RECEIPT_SCHEMA,`unexpected receipt schema ${receipt.schema_version}`);
  assert(receipt.object_class==='bounded_five_domain_official_route_watch_receipt','unexpected receipt object_class');
  assert(receipt.program_id==='M-05'&&receipt.sprint_id==='M05-SPRINT-03'&&receipt.leg_id==='S03-L7','receipt program identity drift');
  assert(receipt.issue===345,'receipt issue binding must remain 345');
  assert(receipt.contract_semantic_sha256===semanticSha256(contract),'receipt contract binding drift');
  exactKeys(receipt.contract_authoring_base,['branch','commit','tree'],'receipt authoring base');
  assert(canonicalJson(receipt.contract_authoring_base)===canonicalJson(contract.canonical_base_at_authoring),'receipt authoring-base binding drift');
  assert(receipt.body_hash_domain===contract.execution_policy.body_hash_domain,'receipt body hash domain drift');
  assert(receipt.previous_receipt_proof_sha256===null||validSha256(receipt.previous_receipt_proof_sha256),'previous receipt proof must be null or a SHA-256 digest');
  assert(validTimestamp(receipt.generated_at),'receipt generated_at is invalid');
  assert(validTimestamp(receipt.observation_clock_utc),'receipt observation clock is invalid');
  exactKeys(receipt.intel_gate,INTEL_GATE_KEYS,'receipt Intel gate');
  assert(receipt.intel_gate.ordinary_gate_utc===contract.intel_time_gate.ordinary_gate_utc,'receipt Intel gate boundary drift');
  const observedAtMs=Date.parse(receipt.observation_clock_utc);
  const gateMs=Date.parse(contract.intel_time_gate.ordinary_gate_utc);
  const eligible=observedAtMs>=gateMs;
  assert(receipt.intel_gate.standard_route_eligible===eligible,'receipt Intel eligibility does not match its observation clock');
  assert(receipt.intel_gate.bilateral_exception_observed===false,'receipt invents a bilateral exception');
  assert(receipt.intel_gate.elapsed_time_is_transaction_evidence===false,'receipt converts elapsed time into evidence');
  assert(Array.isArray(receipt.observations)&&receipt.observations.length===20,'receipt must contain twenty observations');
  const expectedRoutes=flattenRoutes(contract);
  const expectedIds=expectedRoutes.map(({route})=>route.route_id);
  const actualIds=receipt.observations.map((row)=>row.route_id);
  assert(JSON.stringify(actualIds)===JSON.stringify(expectedIds),'receipt route order or denominator drift');
  assert(new Set(actualIds).size===20,'receipt route identities must be unique');
  for(let index=0;index<receipt.observations.length;index++){
    const row=receipt.observations[index];
    const {lane,route}=expectedRoutes[index];
    assert(isObject(row),`receipt observation ${row?.route_id||'unknown'} must be an object`);
    assert(TERMINAL_STATUSES.has(row.status),`${row.route_id} has unclassified status ${row.status}`);
    assert(row.network_observation_only===true,`${row.route_id} exceeds network-observation authority`);
    assert(row.promotion_authority===false,`${row.route_id} claims promotion authority`);
    assert(row.answer_effect==='none',`${row.route_id} claims an answer effect`);
    assert(row.graph_effect==='none',`${row.route_id} claims a graph effect`);
    assert(!Object.prototype.hasOwnProperty.call(row,'body'),`${row.route_id} improperly retains response body bytes`);
    validateObservationState(row,lane,route,contract);
    const intel=lane.lane_id===contract.intel_time_gate.lane_id;
    if(intel&&!eligible)assert(row.status==='gated_not_before',`${row.route_id} escaped the pre-gate Intel terminal state`);
    else assert(row.status!=='gated_not_before',`${row.route_id} is gated outside the pre-gate Intel boundary`);
  }
  const comparisonDeclared=receipt.previous_receipt_proof_sha256!==null;
  assert(receipt.observations.every((row)=>comparisonDeclared?typeof row.changed_since_previous==='boolean':row.changed_since_previous===null),'receipt comparison flags do not match previous-receipt provenance');
  assert(isObject(receipt.summary),'receipt summary must be an object');
  exactKeys(receipt.summary,SUMMARY_KEYS,'receipt summary');
  assert(isObject(receipt.summary.failure_counts),'receipt failure_counts must be an object');
  for(const [status,count] of Object.entries(receipt.summary.failure_counts)){
    assert(FAILURE_STATUSES.has(status),`receipt failure_counts contains unknown status ${status}`);
    assert(Number.isInteger(count)&&count>0,`receipt failure count for ${status} must be a positive integer`);
  }
  const derived=expectedSummary(receipt,contract);
  assert(canonicalJson(receipt.summary)===canonicalJson(derived),'receipt summary does not reconcile to observations');
  validateAuthorityBoundaries(receipt.authority_boundaries);
  const {proof_sha256:proof,...core}=receipt;
  assert(validSha256(proof),'receipt proof is not a SHA-256 digest');
  assert(receipt.previous_receipt_proof_sha256===null||receipt.previous_receipt_proof_sha256!==proof,'receipt cannot name its own proof as the previous receipt');
  assert(proof===sha256(Buffer.from(canonicalJson(core),'utf8')),'receipt proof mismatch');
  return receipt;
}
