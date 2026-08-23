import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canonicalJson,
  fetchOfficialRoute,
  flattenRoutes,
  HostGate,
  routeActivation,
  runRouteWatch,
  sha256,
  validateContract,
  validateReceipt
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs';

const contract=JSON.parse(fs.readFileSync(new URL('../data/project/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch-contract.json',import.meta.url),'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const successResponse=(body='official record',status=200,headers={})=>new Response(body===null?null:Buffer.from(body),{status,headers:{'content-type':'text/html; charset=utf-8',...headers}});
const noSleep=async()=>{};
let clockValue=Date.parse('2026-08-22T00:00:00Z');
const clock=()=>++clockValue;
const workflow=fs.readFileSync(new URL('../.github/workflows/m05-five-domain-route-watch.yml',import.meta.url),'utf8');
const runner=fs.readFileSync(new URL('../tools/run-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs',import.meta.url),'utf8');
const resign=(receipt)=>{
  const {proof_sha256:ignored,...core}=receipt;
  receipt.proof_sha256=sha256(Buffer.from(canonicalJson(core),'utf8'));
  return receipt;
};

assert(workflow.includes('actions: read'));
assert(workflow.includes('status=success'));
assert(!workflow.includes('branch=main&status=success'));
assert(workflow.includes('select(.head_branch=="main")'));
assert(workflow.includes('unzip -tq'));
assert(workflow.includes('exactly one is required'));
assert(workflow.includes('prior receipt proof does not recompute'));
assert(workflow.includes('authenticated receipt targets a different contract'));
assert(workflow.includes('actions/runs/${run_id}/artifacts'));
assert(workflow.includes('--previous "$PREVIOUS_RECEIPT"'));
assert(workflow.includes('validate-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs --receipt "$candidate"'));

validateContract(contract);
assert.equal(contract.execution_policy.host_interval_applies_to_each_http_request,true);
assert.equal(contract.execution_policy.challenge_pages_count_as_substantive_content,false);
assert.equal(contract.execution_policy.receipt_unknown_fields_allowed,false);
assert.equal(contract.execution_policy.future_observation_clock_authorizes_execution,false);
assert(runner.includes('--observed-at cannot be in the future'));
assert.deepEqual(contract.execution_policy.retained_response_headers,['content-type','content-length','content-encoding','etag','last-modified','cache-control','date']);
assert(workflow.includes('Challenge pages:'));
assert(workflow.includes('previous successful run:'));
assert.equal(contract.lanes.length,5);
assert.equal(flattenRoutes(contract).length,20);
assert.equal(new Set(flattenRoutes(contract).map(({route})=>route.route_id)).size,20);

{
  const mutated=clone(contract);
  mutated.lanes[1].routes[0].route_id=mutated.lanes[0].routes[0].route_id;
  assert.throws(()=>validateContract(mutated),/duplicate route_id/u);
}
{
  const mutated=clone(contract);
  mutated.lanes[0].routes[0].url='http://ministers.dss.gov.au/media-releases/51';
  assert.throws(()=>validateContract(mutated),/must use HTTPS/u);
}
{
  const mutated=clone(contract);
  mutated.authority_boundaries.answer_changes_authorized=true;
  assert.throws(()=>validateContract(mutated),/answer_changes_authorized/u);
}
{
  const mutated=clone(contract);
  mutated.lanes[1].public_route_observation_satisfies_evidence_access=true;
  assert.throws(()=>validateContract(mutated),/cannot satisfy person-level evidence access/u);
}


{
  const events=[];
  let releaseFirst;
  const gate=new HostGate({sleepImpl:noSleep,clock});
  const first=gate.runMany(['redirect.example','origin.example'],0,async()=>{
    events.push('first-start');
    await new Promise((resolve)=>{releaseFirst=resolve});
    events.push('first-end');
  });
  await new Promise((resolve)=>setImmediate(resolve));
  const second=gate.runMany(['origin.example'],0,async()=>{events.push('second-start')});
  await new Promise((resolve)=>setImmediate(resolve));
  assert.deepEqual(events,['first-start']);
  releaseFirst();
  await Promise.all([first,second]);
  assert.deepEqual(events,['first-start','first-end','second-start']);
}

const intelLane=contract.lanes.at(-1);
assert.deepEqual(routeActivation(intelLane,contract,Date.parse('2026-08-26T23:59:59Z')),{
  state:'gated_not_before',not_before_utc:'2026-08-27T00:00:00Z'
});
assert.deepEqual(routeActivation(intelLane,contract,Date.parse('2026-08-27T00:00:00Z')),{
  state:'active',not_before_utc:'2026-08-27T00:00:00Z'
});

{
  const lane=contract.lanes[0];
  const route=lane.routes[0];
  const observation=await fetchOfficialRoute(lane,route,contract,{
    fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://example.com/capture'}}),
    clock
  });
  assert.equal(observation.status,'policy_refusal');
  assert.equal(observation.reason,'redirect_host_not_allowlisted');
  assert.equal(observation.network_request_count,1);
  assert.equal(observation.promotion_authority,false);
}

{
  const lane=contract.lanes[0];
  const route=lane.routes[0];
  const bounded=clone(contract);
  bounded.execution_policy.max_body_bytes=1024;
  validateContract(bounded);
  const observation=await fetchOfficialRoute(lane,route,bounded,{
    fetchImpl:async()=>successResponse('x'.repeat(1025)),
    clock
  });
  assert.equal(observation.status,'body_limit_exceeded');
  assert.equal(observation.content_success,false);
  assert.equal(observation.body_sha256,null);
}

{
  let calls=0;
  const receipt=await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>{calls+=1;return successResponse('same official bytes')},
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(receipt,contract);
  assert.equal(receipt.body_hash_domain,'http_representation_octets_after_content_decoding');
  assert.equal(calls,16);
  assert.equal(receipt.observations.length,20);
  assert.equal(receipt.summary.executed_routes,16);
  assert.equal(receipt.summary.gated_not_before,4);
  assert.equal(receipt.summary.content_successes,16);
  assert.equal(receipt.summary.qualifying_evidence_receipts,0);
  assert.equal(receipt.summary.answer_changes_authorized,false);
  assert.equal(receipt.summary.cross_domain_regression_completed,false);
  assert.equal(receipt.summary.issue_345_may_close,false);
  assert(receipt.observations.slice(-4).every((row)=>row.status==='gated_not_before'&&row.network_request_count===0));
}

{
  const gateOpen=Date.parse('2026-08-27T00:00:00Z');
  clockValue=Math.max(clockValue,gateOpen+1000);
  let calls=0;
  const receipt=await runRouteWatch(contract,{
    observedAtMs:gateOpen,
    fetchImpl:async(url)=>{
      calls+=1;
      if(url.includes('stb-2014-320'))return new Response(null,{status:204,headers:{'content-type':'text/html'}});
      if(url.includes('10074601'))return successResponse('upstream unavailable',503);
      return successResponse('official bytes after gate');
    },
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(receipt,contract);
  assert.equal(calls,20);
  assert.equal(receipt.summary.gated_not_before,0);
  assert.equal(receipt.summary.metadata_only,1);
  assert.equal(receipt.summary.failed_routes,1);
  assert.equal(receipt.summary.failure_counts.http_failure,1);
  const metadata=receipt.observations.find((row)=>row.status==='metadata_only');
  assert.equal(metadata.route_success,true);
  assert.equal(metadata.content_success,false);
  const failed=receipt.observations.find((row)=>row.status==='http_failure');
  assert.equal(failed.status_code,503);
  assert.equal(failed.route_success,false);
  assert.equal(failed.network_observation_only,true);
}

{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const previous=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('version one'),
    sleepImpl:noSleep,
    clock
  });
  let changedRoute=true;
  const current=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    previousReceipt:previous,
    fetchImpl:async()=>{
      if(changedRoute){changedRoute=false;return successResponse('version two')}
      return successResponse('version one');
    },
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(current,contract);
  assert.equal(current.summary.changed_routes,1);
  assert.equal(current.summary.qualifying_evidence_receipts,0);
  assert.equal(current.authority_boundaries.changed_bytes_are_claim_evidence,false);
  assert.equal(current.observations.filter((row)=>row.changed_since_previous===true).length,1);
}

{
  const receipt=await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>successResponse('proof bytes'),
    sleepImpl:noSleep,
    clock
  });
  const forged=clone(receipt);
  forged.summary.effective_domain_answers=1;
  assert.throws(()=>validateReceipt(forged,contract),/summary does not reconcile/u);
  const bodyLeak=clone(receipt);
  bodyLeak.observations[0].body='forbidden body';
  assert.throws(()=>validateReceipt(bodyLeak,contract),/improperly retains response body bytes/u);
  assert.equal(typeof canonicalJson(receipt),'string');
}


{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const content=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('coherent content'),
    sleepImpl:noSleep,
    clock
  });
  const zeroBody=clone(content);
  zeroBody.observations[0].body_bytes=0;
  zeroBody.observations[0].body_sha256=null;
  resign(zeroBody);
  assert.throws(()=>validateReceipt(zeroBody,contract),/content_retrieved requires positive body bytes/u);

  let mixedCalls=0;
  const mixed=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{
      const index=mixedCalls++;
      if(index===0)return new Response(null,{status:204,headers:{'content-type':'text/html'}});
      if(index===1)return successResponse('failure body',503);
      return successResponse('coherent content');
    },
    sleepImpl:noSleep,
    clock
  });
  const contradictoryMetadata=clone(mixed);
  contradictoryMetadata.observations.find((row)=>row.status==='metadata_only').metadata_only=false;
  resign(contradictoryMetadata);
  assert.throws(()=>validateReceipt(contradictoryMetadata,contract),/metadata_only flag is incoherent/u);
  const contradictoryHttp=clone(mixed);
  contradictoryHttp.observations.find((row)=>row.status==='http_failure').status_code=200;
  resign(contradictoryHttp);
  assert.throws(()=>validateReceipt(contradictoryHttp,contract),/http_failure requires a 4xx or 5xx status/u);

  const policy=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://example.com/refused'}}),
    sleepImpl:noSleep,
    clock
  });
  const contradictoryPolicy=clone(policy);
  contradictoryPolicy.observations[0].status_code=200;
  resign(contradictoryPolicy);
  assert.throws(()=>validateReceipt(contradictoryPolicy,contract),/policy_refusal status_code must be null or 3xx/u);

  const bounded=clone(contract);
  bounded.execution_policy.max_body_bytes=1024;
  validateContract(bounded);
  const limited=await runRouteWatch(bounded,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('x'.repeat(1025)),
    sleepImpl:noSleep,
    clock
  });
  const contradictoryLimit=clone(limited);
  contradictoryLimit.observations[0].body_bytes=1;
  contradictoryLimit.observations[0].body_sha256=sha256(Buffer.from('x'));
  resign(contradictoryLimit);
  assert.throws(()=>validateReceipt(contradictoryLimit,bounded),/body_limit_exceeded must not retain body bytes/u);

  const transport=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{throw new Error('offline')},
    sleepImpl:noSleep,
    clock
  });
  const contradictoryTransport=clone(transport);
  contradictoryTransport.observations[0].body_bytes=1;
  contradictoryTransport.observations[0].body_sha256=sha256(Buffer.from('x'));
  resign(contradictoryTransport);
  assert.throws(()=>validateReceipt(contradictoryTransport,contract),/transport_failure must not retain body bytes/u);

  const timeout=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>{const error=new Error('aborted');error.name='AbortError';throw error},
    sleepImpl:noSleep,
    clock
  });
  const contradictoryTimeout=clone(timeout);
  contradictoryTimeout.observations[0].status_code=408;
  resign(contradictoryTimeout);
  assert.throws(()=>validateReceipt(contradictoryTimeout,contract),/timeout status_code must be null/u);

  const beforeGate=await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>successResponse('coherent content'),
    sleepImpl:noSleep,
    clock
  });
  const contradictoryGate=clone(beforeGate);
  contradictoryGate.observations.find((row)=>row.status==='gated_not_before').status_code=200;
  resign(contradictoryGate);
  assert.throws(()=>validateReceipt(contradictoryGate,contract),/gated_not_before status_code must be null/u);
}


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
  clockValue=Math.max(clockValue,afterGate+1000);
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
  clockValue=Math.max(clockValue,afterGate+1000);
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


{
  const actual=Date.parse('2026-08-22T00:00:00Z');
  await assert.rejects(()=>runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-27T00:00:00Z'),
    fetchImpl:async()=>successResponse('must not execute'),
    sleepImpl:noSleep,
    clock:()=>actual
  }),/observation clock cannot be in the future/u);
}

{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const receipt=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('bounded representation'),
    sleepImpl:noSleep,
    clock
  });
  const oversized=clone(receipt);
  oversized.observations[0].body_bytes=contract.execution_policy.max_body_bytes+1;
  oversized.observations[0].body_sha256=sha256(Buffer.from('synthetic oversized digest'));
  resign(oversized);
  assert.throws(()=>validateReceipt(oversized,contract),/body byte count exceeds the contract ceiling/u);

  const falseComparison=clone(receipt);
  falseComparison.observations[0].changed_since_previous=false;
  resign(falseComparison);
  assert.throws(()=>validateReceipt(falseComparison,contract),/comparison flags do not match previous-receipt provenance/u);

  const previous=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('previous representation'),
    sleepImpl:noSleep,
    clock
  });
  const compared=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    previousReceipt:previous,
    fetchImpl:async()=>successResponse('current representation'),
    sleepImpl:noSleep,
    clock
  });
  const missingProvenance=clone(compared);
  missingProvenance.previous_receipt_proof_sha256=null;
  resign(missingProvenance);
  assert.throws(()=>validateReceipt(missingProvenance,contract),/comparison flags do not match previous-receipt provenance/u);

  const selfReference=clone(compared);
  selfReference.previous_receipt_proof_sha256=selfReference.proof_sha256;
  assert.throws(()=>validateReceipt(selfReference,contract),/cannot name its own proof/u);
}


{
  const lane=contract.lanes[0];
  const route=lane.routes[0];
  const challenge='<html><head><title>Attention Required</title></head><body>Cloudflare Ray ID 1234567890</body></html>';
  const observation=await fetchOfficialRoute(lane,route,contract,{fetchImpl:async()=>successResponse(challenge,503),clock});
  assert.equal(observation.status,'challenge_page');
  assert.equal(observation.status_code,503);
  assert.equal(observation.route_success,false);
  assert.equal(observation.content_success,false);
  assert.equal(observation.reason,'challenge_page_detected');
  assert(observation.body_bytes>0);
  validateReceipt(await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>successResponse(challenge,503),
    sleepImpl:noSleep,
    clock
  }),contract);
}

console.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');
