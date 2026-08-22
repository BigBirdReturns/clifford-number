#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one target, found {count}")
    return text.replace(old, new, 1)


def replace_span(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:start_index] + replacement + text[end_index:]


def patch_contract(root: Path) -> None:
    path = root / "data/project/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch-contract.json"
    data = json.loads(path.read_text())
    policy = data["execution_policy"]
    policy["host_interval_applies_to_each_http_request"] = True
    policy["challenge_pages_count_as_substantive_content"] = False
    policy["receipt_unknown_fields_allowed"] = False
    policy["retained_response_headers"] = [
        "content-type",
        "content-length",
        "content-encoding",
        "etag",
        "last-modified",
        "cache-control",
        "date",
    ]
    path.write_text(json.dumps(data, separators=(",", ":")) + "\n")


def patch_library(root: Path) -> None:
    path = root / "tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs"
    text = path.read_text()

    text = replace_once(
        text,
        "  'metadata_only',\n  'gated_not_before',\n",
        "  'metadata_only',\n  'challenge_page',\n  'gated_not_before',\n",
        "challenge terminal status",
    )

    text = replace_once(
        text,
        """  assert(policy.body_hash_domain==='http_representation_octets_after_content_decoding','body hash domain must remain decoded HTTP representation octets');
  assert(policy.body_retained_in_receipt===false,'response bodies must not be retained in the receipt');
  assert(typeof policy.user_agent==='string'&&policy.user_agent.includes('CliffordNumber-M05-Five-Domain-Route-Watch/'),'a bounded watcher user agent is required');
""",
        """  assert(policy.body_hash_domain==='http_representation_octets_after_content_decoding','body hash domain must remain decoded HTTP representation octets');
  assert(policy.body_retained_in_receipt===false,'response bodies must not be retained in the receipt');
  assert(policy.host_interval_applies_to_each_http_request===true,'host interval must apply to every HTTP request and redirect hop');
  assert(policy.challenge_pages_count_as_substantive_content===false,'challenge pages must not count as substantive content');
  assert(policy.receipt_unknown_fields_allowed===false,'receipt schemas must remain closed');
  const retainedHeaders=['content-type','content-length','content-encoding','etag','last-modified','cache-control','date'];
  assert(Array.isArray(policy.retained_response_headers)&&canonicalJson(policy.retained_response_headers)===canonicalJson(retainedHeaders),'retained response-header allowlist drift');
  assert(typeof policy.user_agent==='string'&&policy.user_agent.includes('CliffordNumber-M05-Five-Domain-Route-Watch/'),'a bounded watcher user agent is required');
""",
        "execution policy hardening",
    )

    text = replace_once(
        text,
        """function selectedHeaders(headers){
  const result={};
  for(const name of ['content-type','content-length','content-encoding','etag','last-modified','cache-control','date']){
    const value=headers?.get?.(name);
    if(value!==null&&value!==undefined)result[name]=value;
  }
  return result;
}
""",
        """function selectedHeaders(headers,names){
  const result={};
  for(const name of names){
    const value=headers?.get?.(name);
    if(value!==null&&value!==undefined)result[name]=value;
  }
  return result;
}
""",
        "selected response headers",
    )

    text = replace_once(
        text,
        "export function classifyTransportError(error){\n",
        r"""function isChallengePage(body,headers){
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
""",
        "challenge-page classifier",
    )

    fetch_replacement = r"""export async function fetchOfficialRoute(lane,route,contract,{fetchImpl=globalThis.fetch,clock=Date.now,beforeRequest=async()=>{}}={}){
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
    const challengePage=response.ok&&body.length>0&&isChallengePage(body,headers);
    const metadataOnly=response.ok&&!challengePage&&body.length===0;
    const status=response.ok?(challengePage?'challenge_page':(metadataOnly?'metadata_only':'content_retrieved')):'http_failure';
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

"""
    text = replace_span(
        text,
        "export async function fetchOfficialRoute",
        "export class HostGate",
        fetch_replacement,
        "route fetch implementation",
    )

    gate_replacement = r"""export class HostGate{
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

"""
    text = replace_span(
        text,
        "export class HostGate",
        "export async function mapLimit",
        gate_replacement,
        "host gate",
    )

    text = replace_once(
        text,
        "return gate.runMany(route.allowed_hosts,contract.execution_policy.minimum_host_interval_ms,()=>fetchOfficialRoute(lane,route,contract,{fetchImpl,clock}));",
        "return gate.runMany(route.allowed_hosts,contract.execution_policy.minimum_host_interval_ms,()=>fetchOfficialRoute(lane,route,contract,{fetchImpl,clock,beforeRequest:(host,interval)=>gate.waitForRequest(host,interval)}));",
        "per-request host interval wiring",
    )

    text = replace_once(
        text,
        "    metadata_only:counts('metadata_only'),\n    failed_routes:",
        "    metadata_only:counts('metadata_only'),\n    challenge_pages:counts('challenge_page'),\n    failed_routes:",
        "challenge summary count",
    )

    validator = r"""function expectedSummary(receipt,contract){return summarizeObservations(receipt.observations,contract)}

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
      assert(row.status_code>=200&&row.status_code<=299,`${label} challenge_page requires a 2xx status`);
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
  assert(proof===sha256(Buffer.from(canonicalJson(core),'utf8')),'receipt proof mismatch');
  return receipt;
}
"""
    start = text.index("function expectedSummary(receipt,contract)")
    text = text[:start] + validator
    path.write_text(text)


def patch_workflow(root: Path) -> None:
    path = root / ".github/workflows/m05-five-domain-route-watch.yml"
    text = path.read_text()
    text = replace_once(
        text,
        "            `- Metadata only: ${s.metadata_only}`,\n            `- Failed routes: ${s.failed_routes}`,\n",
        "            `- Metadata only: ${s.metadata_only}`,\n            `- Challenge pages: ${s.challenge_pages}`,\n            `- Failed routes: ${s.failed_routes}`,\n",
        "step-summary challenge count",
    )
    text = replace_once(
        text,
        """      - name: Reconcile issue 345 without promoting evidence
        env:
          GH_TOKEN: ${{ github.token }}
""",
        """      - name: Reconcile issue 345 without promoting evidence
        env:
          GH_TOKEN: ${{ github.token }}
          PREVIOUS_RUN_ID: ${{ steps.previous.outputs.previous_run_id }}
""",
        "issue-comment previous run environment",
    )
    text = replace_once(
        text,
        """          console.log(`metadata only:                 ${s.metadata_only}`);
          console.log(`failed routes:                 ${s.failed_routes}`);
          console.log(`policy refusals:               ${s.policy_refusals}`);
          console.log(`unclassified failures:         ${s.unclassified_failures}`);
""",
        """          console.log(`metadata only:                 ${s.metadata_only}`);
          console.log(`challenge pages:               ${s.challenge_pages}`);
          console.log(`failed routes:                 ${s.failed_routes}`);
          console.log(`policy refusals:               ${s.policy_refusals}`);
          console.log(`unclassified failures:         ${s.unclassified_failures}`);
          console.log(`previous successful run:       ${process.env.PREVIOUS_RUN_ID||'none'}`);
          console.log(`previous receipt proof:        ${receipt.previous_receipt_proof_sha256||'none'}`);
          console.log(`changed routes:                ${s.changed_routes}`);
          console.log(`uncompared routes:             ${s.uncompared_routes}`);
""",
        "issue-comment comparison fields",
    )
    path.write_text(text)


def patch_test(root: Path) -> None:
    path = root / "test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js"
    text = path.read_text()
    text = replace_once(
        text,
        "assert.equal(contract.lanes.length,5);\n",
        """assert.equal(contract.execution_policy.host_interval_applies_to_each_http_request,true);
assert.equal(contract.execution_policy.challenge_pages_count_as_substantive_content,false);
assert.equal(contract.execution_policy.receipt_unknown_fields_allowed,false);
assert.deepEqual(contract.execution_policy.retained_response_headers,['content-type','content-length','content-encoding','etag','last-modified','cache-control','date']);
assert(workflow.includes('Challenge pages:'));
assert(workflow.includes('previous successful run:'));
assert.equal(contract.lanes.length,5);
""",
        "contract hardening assertions",
    )

    addition = r"""

{
  const lane=contract.lanes[0];
  const route=lane.routes[0];
  let now=0;
  const sleeps=[];
  let calls=0;
  const gate=new HostGate({clock:()=>now,sleepImpl:async(ms)=>{sleeps.push(ms);now+=ms}});
  const observation=await gate.runMany(route.allowed_hosts,contract.execution_policy.minimum_host_interval_ms,()=>fetchOfficialRoute(lane,route,contract,{
    clock:()=>now,
    beforeRequest:(host,interval)=>gate.waitForRequest(host,interval),
    fetchImpl:async(url)=>{
      calls+=1;
      if(calls===1)return new Response(null,{status:302,headers:{location:new URL('/same-host-hop',url).toString()}});
      return successResponse('redirected official content');
    }
  }));
  assert.equal(observation.status,'content_retrieved');
  assert.equal(calls,2);
  assert.deepEqual(sleeps,[contract.execution_policy.minimum_host_interval_ms]);
}

{
  const lane=contract.lanes[0];
  const route=lane.routes[0];
  const challenge='<html><head><title>Just a moment...</title></head><body><script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script></body></html>';
  const observation=await fetchOfficialRoute(lane,route,contract,{fetchImpl:async()=>successResponse(challenge),clock});
  assert.equal(observation.status,'challenge_page');
  assert.equal(observation.route_success,false);
  assert.equal(observation.content_success,false);
  assert.equal(observation.reason,'challenge_page_detected');
  assert(observation.body_bytes>0);
}

{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  const receipt=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('schema closure'),
    sleepImpl:noSleep,
    clock
  });

  const topLevelAlias=clone(receipt);
  topLevelAlias.response_body_alias='forbidden';
  resign(topLevelAlias);
  assert.throws(()=>validateReceipt(topLevelAlias,contract),/receipt keys drift/u);

  const observationAlias=clone(receipt);
  observationAlias.observations[0].body_base64='forbidden';
  resign(observationAlias);
  assert.throws(()=>validateReceipt(observationAlias,contract),/observation keys drift/u);

  const headerAlias=clone(receipt);
  headerAlias.observations[0].response_headers['x-response-body']='forbidden';
  resign(headerAlias);
  assert.throws(()=>validateReceipt(headerAlias,contract),/undeclared response header/u);

  const redirectAlias=clone(receipt);
  const route=contract.lanes[0].routes[0];
  redirectAlias.observations[0].redirect_chain=[{from:route.url,status:302,location:route.url,to:route.url,body_alias:'forbidden'}];
  redirectAlias.observations[0].network_request_count=2;
  resign(redirectAlias);
  assert.throws(()=>validateReceipt(redirectAlias,contract),/redirect 0 keys drift/u);

  const escapedAddress=clone(receipt);
  escapedAddress.observations[0].final_url='https://example.com/escaped';
  resign(escapedAddress);
  assert.throws(()=>validateReceipt(escapedAddress,contract),/final URL/u);

  const impossibleCount=clone(receipt);
  impossibleCount.observations[0].network_request_count=2;
  resign(impossibleCount);
  assert.throws(()=>validateReceipt(impossibleCount,contract),/request count does not reconcile/u);

  const summaryAlias=clone(receipt);
  summaryAlias.summary.response_body='forbidden';
  resign(summaryAlias);
  assert.throws(()=>validateReceipt(summaryAlias,contract),/summary keys drift/u);
}

{
  const beforeGate=await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>successResponse('pre-gate content'),
    sleepImpl:noSleep,
    clock
  });
  const forged=clone(beforeGate);
  const row=forged.observations.at(-1);
  delete row.not_before_utc;
  row.completed_at=row.observed_at;
  row.status='metadata_only';
  row.status_code=204;
  row.reason=null;
  row.route_success=true;
  row.content_success=false;
  row.metadata_only=true;
  row.network_request_count=1;
  row.body_bytes=0;
  row.body_sha256=null;
  resign(forged);
  assert.throws(()=>validateReceipt(forged,contract),/escaped the pre-gate Intel terminal state/u);
}

{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  let first=true;
  const receipt=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{
      if(first){first=false;return successResponse('<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/test"></script>')}
      return successResponse('official content');
    },
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(receipt,contract);
  assert.equal(receipt.summary.challenge_pages,1);
  assert.equal(receipt.summary.content_successes,19);
  assert.equal(receipt.summary.failed_routes,1);
  assert.equal(receipt.summary.failure_counts.challenge_page,1);
}
"""
    text = replace_once(
        text,
        "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        addition + "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        "complete hardening tests",
    )
    path.write_text(text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    patch_contract(root)
    patch_library(root)
    patch_workflow(root)
    patch_test(root)


if __name__ == "__main__":
    main()
