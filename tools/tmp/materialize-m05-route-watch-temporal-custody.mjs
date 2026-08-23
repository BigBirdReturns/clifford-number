#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const libraryPath=path.join(root,'tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs');
const testPath=path.join(root,'test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js');

function fail(message){throw new Error(message)}
function gitBlobSha(content){
  const bytes=Buffer.from(content,'utf8');
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`,'utf8')).update(bytes).digest('hex');
}
function replaceOnce(content,needle,replacement,label){
  const first=content.indexOf(needle);
  if(first<0)fail(`${label} anchor is absent`);
  if(content.indexOf(needle,first+needle.length)>=0)fail(`${label} anchor is not unique`);
  return content.slice(0,first)+replacement+content.slice(first+needle.length);
}

let library=fs.readFileSync(libraryPath,'utf8');
let test=fs.readFileSync(testPath,'utf8');

if(gitBlobSha(library)!=='9806ffb4fdca23940f2700d9f3489c37c80f9329')fail('library source blob drift');
if(gitBlobSha(test)!=='fb85b4fb1cb316141d667d2b03cddd8e7d8e24e2')fail('test source blob drift');

library=replaceOnce(
  library,
  "function validateObservationState(row,lane,route,contract){",
  "function validateObservationState(row,lane,route,contract,receiptTimes){",
  'validator signature'
);

library=replaceOnce(
  library,
  "  assert(validTimestamp(row.observed_at),`${label} has an invalid observation timestamp`);\n  if(COMPLETED_STATUSES.has(row.status)){\n    assert(validTimestamp(row.completed_at),`${label} has an invalid completion timestamp`);\n    assert(Date.parse(row.completed_at)>=Date.parse(row.observed_at),`${label} completes before it starts`);\n  }",
  "  assert(validTimestamp(row.observed_at),`${label} has an invalid observation timestamp`);\n  const rowObservedAtMs=Date.parse(row.observed_at);\n  assert(rowObservedAtMs>=receiptTimes.observationClockMs,`${label} starts before receipt observation clock`);\n  assert(rowObservedAtMs<=receiptTimes.generatedAtMs,`${label} starts after receipt generation`);\n  if(COMPLETED_STATUSES.has(row.status)){\n    assert(validTimestamp(row.completed_at),`${label} has an invalid completion timestamp`);\n    const completedAtMs=Date.parse(row.completed_at);\n    assert(completedAtMs>=rowObservedAtMs,`${label} completes before it starts`);\n    assert(completedAtMs<=receiptTimes.generatedAtMs,`${label} completes after receipt generation`);\n  }",
  'observation temporal window'
);

library=replaceOnce(
  library,
  "  assert(validTimestamp(receipt.generated_at),'receipt generated_at is invalid');\n  assert(validTimestamp(receipt.observation_clock_utc),'receipt observation clock is invalid');\n  exactKeys(receipt.intel_gate,INTEL_GATE_KEYS,'receipt Intel gate');",
  "  assert(validTimestamp(receipt.generated_at),'receipt generated_at is invalid');\n  assert(validTimestamp(receipt.observation_clock_utc),'receipt observation clock is invalid');\n  const generatedAtMs=Date.parse(receipt.generated_at);\n  const observedAtMs=Date.parse(receipt.observation_clock_utc);\n  assert(observedAtMs<=generatedAtMs,'receipt generated_at precedes observation clock');\n  exactKeys(receipt.intel_gate,INTEL_GATE_KEYS,'receipt Intel gate');",
  'receipt temporal window'
);

library=replaceOnce(
  library,
  "  const observedAtMs=Date.parse(receipt.observation_clock_utc);\n  const gateMs=Date.parse(contract.intel_time_gate.ordinary_gate_utc);",
  "  const gateMs=Date.parse(contract.intel_time_gate.ordinary_gate_utc);",
  'duplicate observation clock parse'
);

library=replaceOnce(
  library,
  "    validateObservationState(row,lane,route,contract);",
  "    validateObservationState(row,lane,route,contract,{observationClockMs:observedAtMs,generatedAtMs});",
  'observation temporal binding'
);

const testAnchor="\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');";
const temporalTests=String.raw`
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
`;

test=replaceOnce(
  test,
  testAnchor,
  temporalTests+testAnchor,
  'temporal adversarial tests'
);

fs.writeFileSync(libraryPath,library);
fs.writeFileSync(testPath,test);

const librarySha=gitBlobSha(library);
const testSha=gitBlobSha(test);
process.stdout.write(JSON.stringify({
  schema_version:'m05-route-watch-temporal-custody-materialization@1',
  library_blob_sha:librarySha,
  test_blob_sha:testSha,
  changed_paths:[
    'test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js',
    'tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs'
  ]
},null,2)+'\n');
