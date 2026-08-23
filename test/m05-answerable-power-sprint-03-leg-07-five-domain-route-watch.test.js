import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
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
const legacyCompletionlessReceipt=JSON.parse(inflateSync(Buffer.from(
  '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'+
  'qaLo8Ls/v/s/09O0Ng==',
  'base64'
)).toString('utf8'));
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

{
  const afterGate=Date.parse('2026-08-28T00:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const receipt=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('temporal custody'),
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(receipt,contract);

  const generatedBeforeObservation=clone(receipt);
  generatedBeforeObservation.generated_at=new Date(Date.parse(generatedBeforeObservation.observation_clock_utc)-1).toISOString();
  resign(generatedBeforeObservation);
  assert.throws(()=>validateReceipt(generatedBeforeObservation,contract),/generated_at precedes observation clock/u);

  const startsBeforeObservation=clone(receipt);
  startsBeforeObservation.observations[0].observed_at=new Date(Date.parse(startsBeforeObservation.observation_clock_utc)-1).toISOString();
  resign(startsBeforeObservation);
  assert.throws(()=>validateReceipt(startsBeforeObservation,contract),/starts before receipt observation clock/u);

  const startsAfterGeneration=clone(receipt);
  const afterGeneration=new Date(Date.parse(startsAfterGeneration.generated_at)+1).toISOString();
  startsAfterGeneration.observations[0].observed_at=afterGeneration;
  startsAfterGeneration.observations[0].completed_at=afterGeneration;
  resign(startsAfterGeneration);
  assert.throws(()=>validateReceipt(startsAfterGeneration,contract),/starts after receipt generation/u);

  const completesAfterGeneration=clone(receipt);
  completesAfterGeneration.observations[0].completed_at=new Date(Date.parse(completesAfterGeneration.generated_at)+1).toISOString();
  resign(completesAfterGeneration);
  assert.throws(()=>validateReceipt(completesAfterGeneration,contract),/completes after receipt generation/u);
}


{
  const beforeGate=Date.parse('2026-08-26T23:00:00Z');
  clockValue=Math.max(clockValue,beforeGate+1000);
  const receipt=await runRouteWatch(contract,{
    observedAtMs:beforeGate,
    fetchImpl:async()=>successResponse('completion custody before gate'),
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(receipt,contract);
  const gated=receipt.observations.filter((row)=>row.status==='gated_not_before');
  const executed=receipt.observations.filter((row)=>row.status!=='gated_not_before');
  assert.equal(gated.length,4);
  assert.equal(executed.length,16);
  assert(gated.every((row)=>!Object.prototype.hasOwnProperty.call(row,'completed_at')));
  assert(executed.every((row)=>Object.prototype.hasOwnProperty.call(row,'completed_at')));

  const forgedGatedCompletion=clone(receipt);
  const gatedIndex=forgedGatedCompletion.observations.findIndex((row)=>row.status==='gated_not_before');
  forgedGatedCompletion.observations[gatedIndex].completed_at=forgedGatedCompletion.generated_at;
  resign(forgedGatedCompletion);
  assert.throws(()=>validateReceipt(forgedGatedCompletion,contract),/keys drift/u);
}

{
  const lane=contract.lanes[0];
  const route={...lane.routes[0],url:'http://ministers.dss.gov.au/media-releases/51'};
  clockValue=Math.max(clockValue,Date.parse('2026-08-28T12:00:00Z'));
  const observation=await fetchOfficialRoute(lane,route,contract,{
    fetchImpl:async()=>{throw new Error('pre-request refusal must not execute')},
    clock
  });
  assert.equal(observation.status,'policy_refusal');
  assert.equal(observation.reason,'non_https_target');
  assert(Object.prototype.hasOwnProperty.call(observation,'completed_at'));
  assert(Date.parse(observation.completed_at)>=Date.parse(observation.observed_at));
}

{
  const afterGate=Date.parse('2026-08-28T12:00:00Z');
  const bounded=clone(contract);
  bounded.execution_policy.max_body_bytes=1024;
  validateContract(bounded);
  const failureCases=[
    {
      status:'transport_failure',
      receiptContract:contract,
      fetchImpl:async()=>{
        const error=new Error('synthetic connection reset');
        error.code='ECONNRESET';
        throw error;
      }
    },
    {
      status:'timeout',
      receiptContract:contract,
      fetchImpl:async()=>{
        const error=new Error('synthetic timeout');
        error.name='AbortError';
        throw error;
      }
    },
    {
      status:'body_limit_exceeded',
      receiptContract:bounded,
      fetchImpl:async()=>new Response(Buffer.alloc(1025,1),{status:200,headers:{'content-type':'application/octet-stream'}})
    },
    {
      status:'policy_refusal',
      receiptContract:contract,
      fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://example.com/refused'}})
    }
  ];

  for(const failureCase of failureCases){
    clockValue=Math.max(clockValue,afterGate+1000);
    const receipt=await runRouteWatch(failureCase.receiptContract,{
      observedAtMs:afterGate,
      fetchImpl:failureCase.fetchImpl,
      sleepImpl:noSleep,
      clock
    });
    validateReceipt(receipt,failureCase.receiptContract);
    assert.equal(receipt.observations.length,20);
    assert(receipt.observations.every((row)=>row.status===failureCase.status));
    assert(receipt.observations.every((row)=>Object.prototype.hasOwnProperty.call(row,'completed_at')));
    assert(receipt.observations.every((row)=>Date.parse(row.completed_at)>=Date.parse(row.observed_at)));
    assert(receipt.observations.every((row)=>Date.parse(row.completed_at)<=Date.parse(receipt.generated_at)));

    const missingCompletion=clone(receipt);
    delete missingCompletion.observations[0].completed_at;
    resign(missingCompletion);
    assert.throws(()=>validateReceipt(missingCompletion,failureCase.receiptContract),/keys drift/u);

    const completionAfterGeneration=clone(receipt);
    completionAfterGeneration.observations[0].completed_at=new Date(Date.parse(completionAfterGeneration.generated_at)+1).toISOString();
    resign(completionAfterGeneration);
    assert.throws(()=>validateReceipt(completionAfterGeneration,failureCase.receiptContract),/completes after receipt generation/u);
  }
}


{
  const afterGate=Date.parse('2026-08-28T18:00:00Z');
  const peak=afterGate+10000;
  let clockCalls=0;
  const regressingClock=()=>{
    clockCalls+=1;
    return clockCalls===1?peak:afterGate-10000;
  };
  const receipt=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    fetchImpl:async()=>successResponse('monotonic receipt time'),
    sleepImpl:noSleep,
    clock:regressingClock
  });
  validateReceipt(receipt,contract);
  assert(clockCalls>1);
  assert.equal(Date.parse(receipt.generated_at),peak);
  assert(receipt.observations.every((row)=>Date.parse(row.observed_at)<=Date.parse(receipt.generated_at)));
  assert(receipt.observations.every((row)=>Date.parse(row.completed_at)<=Date.parse(receipt.generated_at)));
  assert(receipt.observations.every((row)=>Date.parse(row.completed_at)>=Date.parse(row.observed_at)));
}


{
  assert.equal(legacyCompletionlessReceipt.proof_sha256,'90bb94f010fdca48285e39cc8a9874eabb20863a1ac2312980e64b6ff20489dd');
  assert.equal(legacyCompletionlessReceipt.contract_semantic_sha256,'26f179d929e40f91282967f985bbc96fcb5ab442aa2bc96a1ebc3f2ad04aedfc');
  validateReceipt(legacyCompletionlessReceipt,contract);
  assert.deepEqual(
    legacyCompletionlessReceipt.observations
      .filter((row)=>row.status!=='gated_not_before'&&!Object.prototype.hasOwnProperty.call(row,'completed_at'))
      .map((row)=>row.route_id),
    [
    "M05-WATCH-AU-ROBODEBT-ANNUAL-REPORT",
    "M05-WATCH-AU-ROBODEBT-ANAO-FUTURE-AUDIT",
    "M05-WATCH-AU-ROBODEBT-DEBT-SUPPORT"
]
  );

  const afterGate=Date.parse('2026-08-28T20:00:00Z');
  clockValue=Math.max(clockValue,afterGate+1000);
  const successor=await runRouteWatch(contract,{
    observedAtMs:afterGate,
    previousReceipt:legacyCompletionlessReceipt,
    fetchImpl:async()=>successResponse('strict successor after legacy predecessor'),
    sleepImpl:noSleep,
    clock
  });
  validateReceipt(successor,contract);
  assert.equal(successor.previous_receipt_proof_sha256,legacyCompletionlessReceipt.proof_sha256);
  assert.equal(successor.summary.uncompared_routes,0);
  assert(successor.observations.every((row)=>typeof row.changed_since_previous==='boolean'));
  assert(successor.observations.every((row)=>Object.prototype.hasOwnProperty.call(row,'completed_at')));

  const resignedLegacy=clone(legacyCompletionlessReceipt);
  resignedLegacy.observations.find((row)=>row.status==='timeout').reason='synthetic resigned legacy timeout';
  resign(resignedLegacy);
  assert.notEqual(resignedLegacy.proof_sha256,legacyCompletionlessReceipt.proof_sha256);
  assert.throws(()=>validateReceipt(resignedLegacy,contract),/keys drift/u);
}

console.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');
