#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  INTEL_REALIZATION_FRONTIER_ID,
  INTEL_REALIZATION_RECEIPT_ID,
  INTEL_REALIZATION_DOMAIN_ID,
  INTEL_REALIZATION_JURISDICTION,
  INTEL_REALIZATION_ORDINARY_GATE,
  INTEL_REALIZATION_ROUTE_IDS,
  shouldActivateIntelRealizationAcquisition,
  summarizeIntelRealizationDateGateMonitor
} from './lib/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  monitor:resolvePath(
    'M05_INTEL_REALIZATION_MONITOR_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'
  ),
  frontier:resolvePath(
    'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'
  ),
  intel:resolvePath(
    'M05_INTEL_RECEIPT_CANDIDATE_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
  ),
  syri:resolvePath(
    'M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json'
  )
};

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const fail=(message)=>{throw new Error(message)};
const recursiveValues=(value,key,found=[])=>{
  if(Array.isArray(value)){
    for(const row of value)recursiveValues(row,key,found);
    return found;
  }
  if(value&&typeof value==='object'){
    for(const [entryKey,entryValue] of Object.entries(value)){
      if(entryKey===key)found.push(entryValue);
      recursiveValues(entryValue,key,found);
    }
  }
  return found;
};

const raw=Object.fromEntries(
  Object.entries(paths).map(([key,target])=>[key,readRaw(target)])
);
const data=Object.fromEntries(
  Object.entries(raw).map(([key,buffer])=>[key,JSON.parse(buffer.toString('utf8'))])
);
const {monitor,frontier,intel,syri}=data;
const snapshots=Object.fromEntries(
  Object.entries(data).map(([key,value])=>[key,JSON.stringify(value)])
);

if(monitor.schema_version!=='m05-answerable-power-s03-l7-intel-realization-date-gate-monitor@1')fail('monitor schema drift');
if(monitor.object_class!=='bounded_future_time_gated_monitor')fail('monitor object class drift');
if(monitor.program_id!=='M-05'||monitor.sprint_id!=='M05-SPRINT-03'||monitor.leg_id!=='S03-L7')fail('monitor program binding drift');
if(monitor.issue!==345)fail('monitor issue identity drift');
if(monitor.as_of!=='2026-08-17')fail('monitor as-of drift');
if(monitor.status!=='intel_realization_waiting_for_ordinary_gate')fail('monitor status drift');
if(!text(monitor.title,30)||!text(monitor.question,140))fail('monitor title or question is under-specified');

const base=monitor.canonical_base||{};
if(base.branch!=='main')fail('canonical branch drift');
if(base.sha!=='34dd125446f9b2fa7beadef16c8f68afacb09a61')fail('canonical base drift');
if(base.tree_sha!=='232d0d49835f0d198a5d4ab5cf652154b1c55efe')fail('canonical tree drift');
if(base.latest_controlled_acquisition_pull_request!==2171)fail('latest controlled acquisition binding drift');

const bindingDefinitions={
  implementation_frontier:{
    dataKey:'frontier',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json',
    blob:'34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c',
    schema:'m05-answerable-power-s03-l7-five-domain-implementation-frontier@1',
    pullRequest:2162,
    mergeCommit:'01e3f154ef8a86baa90a89dc250adb9c362ba9ee'
  },
  intel_receipt_candidate:{
    dataKey:'intel',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json',
    blob:'ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a',
    schema:'m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',
    pullRequest:2156,
    mergeCommit:'3e13165dcd033f4c0b7a983af7b8a613622a1896'
  },
  latest_controlled_acquisition:{
    dataKey:'syri',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json',
    blob:'58ac18ec5841982d8ffc1be75aee6269e5f40dc9',
    schema:'m05-answerable-power-s03-l7-syri-subject-access-public-record-acquisition@1',
    pullRequest:2171,
    mergeCommit:'34dd125446f9b2fa7beadef16c8f68afacb09a61'
  }
};
for(const [bindingId,definition] of Object.entries(bindingDefinitions)){
  const binding=monitor.bindings?.[bindingId];
  if(!binding)fail(`missing binding ${bindingId}`);
  if(binding.path!==definition.path)fail(`${bindingId} path drift`);
  if(binding.blob_sha!==definition.blob)fail(`${bindingId} declared blob drift`);
  if(gitBlobSha(raw[definition.dataKey])!==definition.blob)fail(`${bindingId} Git object drift`);
  if(binding.schema_version!==definition.schema||data[definition.dataKey].schema_version!==definition.schema)fail(`${bindingId} schema drift`);
  if(binding.pull_request!==definition.pullRequest||binding.merge_commit!==definition.mergeCommit)fail(`${bindingId} publication drift`);
}
if(syri.status!=='syri_subject_access_public_record_acquisition_frozen')fail('latest controlled acquisition status drift');
if(syri.expected_result?.qualifying_evidence_access_receipts!==0)fail('latest controlled acquisition unexpectedly qualified');

const target=monitor.target||{};
const expectedTarget={
  frontier_id:INTEL_REALIZATION_FRONTIER_ID,
  receipt_id:INTEL_REALIZATION_RECEIPT_ID,
  domain_id:INTEL_REALIZATION_DOMAIN_ID,
  jurisdiction:INTEL_REALIZATION_JURISDICTION,
  route_class:'future_time_gated_monitoring',
  ordinary_gate_utc:INTEL_REALIZATION_ORDINARY_GATE,
  ordinary_route_open_as_of_record:false,
  bilateral_exception_receipt_located:false,
  monitor_state:'waiting_for_gate'
};
if(!same(target,expectedTarget))fail('monitor target drift');
const frontierRow=(frontier.frontiers||[]).find((row)=>row.frontier_id===target.frontier_id);
if(!frontierRow)fail('Intel frontier missing');
if(frontierRow.receipt_id!==target.receipt_id||frontierRow.domain_id!==target.domain_id||frontierRow.jurisdiction!==target.jurisdiction)fail('Intel frontier identity drift');
if(frontierRow.route_class!==target.route_class)fail('Intel frontier route class drift');
const controlSource=(frontier.route_control_sources||[]).find(
  (row)=>row.source_id==='US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS'
);
if(!controlSource)fail('Intel timing control source missing');
if(controlSource.control_effect?.standard_sale_route_eligible_as_of!=='2026-08-27')fail('Intel ordinary date gate drift');
if(controlSource.control_effect?.exception_requires_bilateral_agreement!==true)fail('Intel exception rule drift');
if(controlSource.control_effect?.registration_is_sale!==false)fail('frontier registration guardrail weakened');
if(controlSource.control_effect?.federal_cash_receipt_established!==false)fail('frontier federal-receipt guardrail weakened');
if(controlSource.control_effect?.public_distribution_established!==false)fail('frontier distribution guardrail weakened');

const activation=monitor.activation_policy||{};
if(activation.first_ordinary_eligible_date!=='2026-08-27')fail('activation date drift');
if(activation.earlier_activation_requires_source_addressed_bilateral_agreement!==true)fail('early activation boundary drift');
if(activation.scheduled_clock_check!==true||activation.scheduled_clock_check_cron_utc!=='17 12 * * *')fail('scheduled clock contract drift');
if(activation.scheduled_failure_after_gate_requires_new_acquisition!==true)fail('post-gate activation contract drift');
for(const key of ['passage_of_time_is_realization','gate_open_is_sale','gate_open_is_federal_receipt','gate_open_is_distribution']){
  if(activation[key]!==false)fail(`activation overclaim: ${key}`);
}

const expectedRouteState=[
  ['US-INTEL-REALIZATION-01','www.sec.gov'],
  ['US-INTEL-REALIZATION-02','www.intc.com'],
  ['US-INTEL-REALIZATION-03','www.commerce.gov'],
  ['US-INTEL-REALIZATION-04','fiscaldata.treasury.gov'],
  ['US-INTEL-REALIZATION-05','www.usaspending.gov']
];
const routes=Array.isArray(monitor.official_routes)?monitor.official_routes:[];
if(!same(routes.map((row)=>row.route_id),INTEL_REALIZATION_ROUTE_IDS))fail('official route identity or order drift');
if(routes.length!==expectedRouteState.length)fail('official route denominator drift');
for(const [index,[routeId,host]] of expectedRouteState.entries()){
  const route=routes[index];
  if(route.route_id!==routeId||route.host!==host)fail(`${routeId} route boundary drift`);
  if(!text(route.authority,10)||!text(route.surface,50)||!text(route.receipt_required,80))fail(`${routeId} route description is under-specified`);
  if(!Array.isArray(route.qualifying_source_classes)||route.qualifying_source_classes.length===0)fail(`${routeId} source classes missing`);
  if(route.qualifying_receipt_found!==false)fail(`${routeId} prematurely qualified`);
}
if(!Array.isArray(monitor.observed_receipts)||monitor.observed_receipts.length!==0)fail('monitor contains an unadjudicated observed receipt');

const expectedEventChain={
  source_addressed_sale_transfer_dividend_or_warrant_exercise:false,
  transaction_quantity_and_date_bound:false,
  identified_federal_cash_receipt:false,
  public_account_booking:false,
  transparent_public_or_affected_party_distribution:false,
  qualifying_realization_receipt:false
};
if(!same(monitor.required_event_chain,expectedEventChain))fail('required event-chain state drift');
const expectedGuardrails={
  registration_is_completed_sale:false,
  escrow_release_is_federal_cash_receipt:false,
  mark_to_market_value_is_realized_return:false,
  issuer_receives_no_proceeds_means_federal_receives_no_proceeds:false,
  ordinary_gate_open_is_transaction:false,
  elapsed_date_is_distribution:false,
  bounded_search_is_exhaustive_nonexistence_finding:false
};
if(!same(monitor.guardrails,expectedGuardrails))fail('monitor guardrail drift');

for(const key of [
  'realized_sale_dividend_or_warrant_exercise',
  'identified_federal_cash_receipt',
  'transparent_public_or_affected_party_distribution'
]){
  const values=recursiveValues(intel,key,[]);
  if(values.length===0||values.some((value)=>value!==false))fail(`Intel candidate nonfinding drift: ${key}`);
}

const summary=summarizeIntelRealizationDateGateMonitor(monitor,frontier,intel);
for(const [key,value] of Object.entries(monitor.expected_result||{})){
  const summaryKey={
    ordinary_gate_open_as_of_record:'ordinary_gate_open_as_of_reference',
    realization_supported:'realization_supported',
    federal_receipt_supported:'federal_receipt_supported',
    distribution_supported:'distribution_supported'
  }[key]||key;
  if(summary[summaryKey]!==value)fail(`expected result drift: ${key}`);
}
if(summary.monitor_state!=='waiting_for_gate'||summary.ordinary_gate_open_as_of_reference!==false)fail('record-time gate state drift');
if(summary.qualifying_receipts!==0||summary.realization_supported!==false||summary.federal_receipt_supported!==false||summary.distribution_supported!==false)fail('premature Intel realization state');

const boundaries=monitor.boundaries||{};
for(const key of [
  'search_exhaustiveness_claimed',
  'current_public_nonexistence_claimed',
  'answer_changes_authorized',
  'promotion_changes_authorized',
  'conclusion_generated',
  'estate_completion_claimed',
  'issue_345_may_close'
]){
  if(boundaries[key]!==false)fail(`unsafe monitor boundary: ${key}`);
}
if(boundaries.graph_effect!=='none')fail('monitor graph effect drift');

if(process.env.M05_INTEL_MONITOR_ENFORCE_CLOCK==='1'){
  if(shouldActivateIntelRealizationAcquisition(monitor,new Date())){
    fail('Intel realization date gate is open; execute a new source-addressed acquisition instead of preserving waiting state');
  }
}

for(const [key,value] of Object.entries(data)){
  if(JSON.stringify(value)!==snapshots[key])fail(`validator mutated ${key}`);
}

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-intel-realization-date-gate-monitor',
  ordinary_gate_utc:INTEL_REALIZATION_ORDINARY_GATE,
  monitor_state:summary.monitor_state,
  official_routes:summary.official_routes,
  qualifying_receipts:summary.qualifying_receipts,
  realization_supported:summary.realization_supported,
  federal_receipt_supported:summary.federal_receipt_supported,
  distribution_supported:summary.distribution_supported,
  issue_345_may_close:summary.issue_345_may_close
},null,2));
