#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  contract:resolvePath(
    'M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_CONTRACT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.json'
  ),
  acquisition:resolvePath(
    'M05_INTEL_BILATERAL_EXCEPTION_ACQUISITION_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.json'
  ),
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
  )
};

const EXPECTED_CONTRACT_BLOB_SHA='4d59d3e93af806e97fde862daadf7194d3498790';
const EXPECTED_CONTRACT_SHA256='3924a4bfd18e98cacbd4b551e2ec4816de57bfa6eb5afb39089980081f2ab6c6';
const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
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
const containsAll=(values,required)=>Array.isArray(values)&&required.every((value)=>values.includes(value));

const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,readRaw(target)]));
if(gitBlobSha(raw.contract)!==EXPECTED_CONTRACT_BLOB_SHA)fail('contract Git object drift');
const data=Object.fromEntries(
  Object.entries(raw).map(([key,buffer])=>[key,JSON.parse(buffer.toString('utf8'))])
);
const {contract,acquisition,monitor,frontier,intel}=data;
const snapshots=Object.fromEntries(
  Object.entries(data).map(([key,value])=>[key,JSON.stringify(value)])
);

if(contract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-accounting-admission-contract@1')fail('contract schema drift');
if(contract.object_class!=='bounded_post_gate_realization_accounting_admission_contract')fail('contract object class drift');
if(contract.program_id!=='M-05'||contract.sprint_id!=='M05-SPRINT-03'||contract.leg_id!=='S03-L7')fail('contract program binding drift');
if(contract.issue!==345||contract.as_of!=='2026-08-18'||contract.status!=='intel_realization_accounting_admission_contract_frozen')fail('contract identity drift');

const expectedBase={
  branch:'main',
  sha:'a7f46edcb8053c083198bbd15248db5d928f00d8',
  tree_sha:'fc2da2d3e2262b60072ba390edad9859418cf2ea',
  preceding_pull_request:2179,
  preceding_merge_commit:'a7f46edcb8053c083198bbd15248db5d928f00d8'
};
if(!same(contract.canonical_base,expectedBase))fail('canonical base drift');

const bindingDefinitions={
  bilateral_exception_acquisition:{
    dataKey:'acquisition',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.json',
    blob:'de9e9f9069386385ba765af283dc5a505e9bea7b',
    schema:'m05-answerable-power-s03-l7-intel-bilateral-exception-acquisition@1',
    pullRequest:2178,
    mergeCommit:'0848f2dcfb319eec921157e0e5cba8584866b419'
  },
  realization_date_gate_monitor:{
    dataKey:'monitor',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json',
    blob:'b4643f2131cf7ebb27e53765fec31f86447d6b8f',
    schema:'m05-answerable-power-s03-l7-intel-realization-date-gate-monitor@1',
    pullRequest:2173,
    mergeCommit:'f798a6dea21431a9b225b157e3235929381aa085'
  },
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
  }
};
for(const [bindingId,definition] of Object.entries(bindingDefinitions)){
  const binding=contract.bindings?.[bindingId];
  if(!binding)fail(`missing binding ${bindingId}`);
  if(binding.path!==definition.path||binding.blob_sha!==definition.blob)fail(`${bindingId} declared Git binding drift`);
  if(binding.schema_version!==definition.schema)fail(`${bindingId} declared schema drift`);
  if(binding.pull_request!==definition.pullRequest||binding.merge_commit!==definition.mergeCommit)fail(`${bindingId} publication drift`);
  if(gitBlobSha(raw[definition.dataKey])!==definition.blob)fail(`${bindingId} Git object drift`);
  if(data[definition.dataKey].schema_version!==definition.schema)fail(`${bindingId} input schema drift`);
}

const expectedSourceIds=[
  'US-INTEL-2026-RESALE-PROSPECTUS',
  'US-MISCELLANEOUS-RECEIPTS-31-USC-3302',
  'US-GAO-B-305402-STOCK-PROCEEDS',
  'US-TREASURY-CARS-TAS-BETC'
];
if(!same((contract.control_sources||[]).map((row)=>row.source_id),expectedSourceIds))fail('control-source denominator drift');
if(contract.control_sources[0]?.control_effect?.ordinary_gate_utc!=='2026-08-27T00:00:00Z')fail('resale gate source drift');
if(contract.control_sources[0]?.control_effect?.registration_is_transaction!==false)fail('registration guardrail weakened');
if(contract.control_sources[1]?.control_effect?.gross_receipts_analysis_required!==true)fail('gross-receipts control drift');
if(contract.control_sources[1]?.control_effect?.specific_retention_or_credit_authority_must_be_identified!==true)fail('retention-authority control drift');
if(contract.control_sources[2]?.control_effect?.analogy_is_intel_specific_legal_determination!==false)fail('GAO analogy overclaim');
if(contract.control_sources[3]?.control_effect?.tas_required_for_public_account_booking!==true||contract.control_sources[3]?.control_effect?.betc_required_for_public_account_booking!==true)fail('TAS/BETC control drift');

const expectedActivation={
  ordinary_gate_utc:'2026-08-27T00:00:00Z',
  ordinary_route_active_as_of_contract:false,
  bilateral_exception_receipt_located:false,
  earlier_activation_requires_source_addressed_bilateral_exception:true,
  passage_of_time_only_opens_acquisition_route:true,
  gate_open_is_transaction:false,
  gate_open_is_federal_receipt:false,
  gate_open_is_public_account_booking:false,
  gate_open_is_distribution:false
};
if(!same(contract.activation,expectedActivation))fail('activation contract drift');

const expectedStageOrder=['transaction','federal_cash_custody','public_account_booking','distribution'];
if(!same(contract.stage_order,expectedStageOrder))fail('admission stage order drift');
const stages=contract.admission_stages||{};
if(!containsAll(stages.transaction?.required_fields,[
  'event_type','security_or_right','quantity','trade_or_declaration_date',
  'settlement_or_payment_date','gross_consideration','source_body_sha256'
]))fail('transaction receipt schema incomplete');
if(stages.transaction?.registration_or_eligibility_alone_qualifies!==false)fail('transaction qualification weakened');
if(stages.federal_cash_custody?.requires_stage!=='transaction')fail('federal cash stage dependency drift');
if(!containsAll(stages.federal_cash_custody?.required_fields,[
  'gross_amount_received_for_government','gross_vs_net_treatment',
  'underwriting_discounts','broker_or_agent_commissions',
  'authority_for_any_deduction','authority_for_any_retention_or_appropriation_credit'
]))fail('federal cash receipt schema incomplete');
if(stages.federal_cash_custody?.selling_costs_must_not_be_silently_netted!==true)fail('selling-cost ledger weakened');
if(stages.public_account_booking?.requires_stage!=='federal_cash_custody')fail('public-account stage dependency drift');
if(!containsAll(stages.public_account_booking?.required_fields,[
  'treasury_account_symbol','business_event_type_code',
  'cars_or_source_system_transaction_identifier','booked_amount',
  'retention_or_miscellaneous_receipts_authority'
]))fail('public-account schema incomplete');
if(stages.public_account_booking?.tas_and_betc_required!==true)fail('TAS/BETC admission weakened');
if(stages.distribution?.requires_stage!=='public_account_booking')fail('distribution stage dependency drift');
if(!containsAll(stages.distribution?.required_fields,[
  'distribution_authority','recipient_or_affected_party_class',
  'distributed_amount','residual_balance','public_ledger_identifier'
]))fail('distribution schema incomplete');
if(stages.distribution?.general_fund_deposit_alone_qualifies!==false)fail('distribution boundary weakened');

if(contract.complete_denominator?.public_contribution_authority_usd!==8869800000)fail('public contribution denominator drift');
for(const [key,value] of Object.entries(contract.complete_denominator||{})){
  if(key!=='public_contribution_authority_usd'&&value!==true)fail(`incomplete denominator weakened: ${key}`);
}

if(!Array.isArray(contract.observed_receipts)||contract.observed_receipts.length!==0)fail('unadjudicated receipt injected');
const expectedObserved={
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  answer_change_authorized:false
};
if(!same(contract.observed_state,expectedObserved))fail('observed state drift');

for(const [key,value] of Object.entries(contract.guardrails||{})){
  if(value!==false)fail(`guardrail weakened: ${key}`);
}
const expectedResult={
  control_sources:4,
  admission_stages:4,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  candidate_evidence_records:5,
  repository_promotions:5,
  advanced_answer_dimensions:1,
  effective_answers:0,
  qualifying_jurisdictions:0,
  answer_effectiveness:false,
  cross_domain_regression_completed:false,
  graph_effect:'none',
  issue_345_may_close:false
};
if(!same(contract.expected_result,expectedResult))fail('expected result drift');
for(const [key,value] of Object.entries(contract.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('graph boundary drift');
  }else if(value!==false){
    fail(`unsafe terminal boundary: ${key}`);
  }
}

if(acquisition.status!=='intel_bilateral_exception_acquisition_frozen')fail('bilateral acquisition identity drift');
if(acquisition.target?.ordinary_gate_utc!=='2026-08-27T00:00:00Z')fail('bilateral acquisition gate drift');
if(acquisition.expected_result?.qualifying_early_realization_receipts!==0)fail('bilateral acquisition receipt inflation');
for(const key of [
  'bilateral_exception_publicly_evidenced',
  'completed_sale_or_transfer_observed',
  'identified_federal_cash_receipt',
  'public_account_booking_observed',
  'transparent_public_or_affected_party_distribution'
]){
  if(acquisition.expected_result?.[key]!==false)fail(`bilateral acquisition overclaim: ${key}`);
}
if(acquisition.boundaries?.issue_345_may_close!==false)fail('bilateral acquisition closure drift');

if(monitor.status!=='intel_realization_waiting_for_ordinary_gate')fail('date-gate monitor identity drift');
if(monitor.target?.ordinary_gate_utc!=='2026-08-27T00:00:00Z'||monitor.target?.monitor_state!=='waiting_for_gate')fail('date-gate monitor state drift');
if(monitor.expected_result?.realization_supported!==false||monitor.expected_result?.federal_receipt_supported!==false||monitor.expected_result?.distribution_supported!==false)fail('date-gate monitor overclaim');

const frontierRow=(frontier.frontiers||[]).find(
  (row)=>row.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION'
);
if(!frontierRow)fail('Intel implementation frontier missing');
if(frontierRow.time_gate?.standard_sale_route_currently_eligible!==false||frontierRow.time_gate?.exception_agreement_observed!==false)fail('implementation frontier gate drift');
if(frontierRow.answer_changes_authorized!==false)fail('implementation frontier answer boundary drift');

for(const key of [
  'realized_sale_dividend_or_warrant_exercise',
  'identified_federal_cash_receipt',
  'transparent_public_or_affected_party_distribution'
]){
  const values=recursiveValues(intel,key,[]);
  if(values.length===0||values.some((value)=>value!==false))fail(`Intel candidate nonfinding drift: ${key}`);
}

const contractCopy=clone(contract);
const declaredContractHash=contractCopy.contract_sha256;
delete contractCopy.contract_sha256;
if(declaredContractHash!==EXPECTED_CONTRACT_SHA256)fail('contract declared checksum drift');
if(semanticHash(contractCopy)!==EXPECTED_CONTRACT_SHA256)fail('contract checksum drift');

for(const [key,value] of Object.entries(data)){
  if(JSON.stringify(value)!==snapshots[key])fail(`validator mutated ${key}`);
}

console.log(JSON.stringify({
  validator:'m05-intel-realization-accounting-admission-contract',
  ordinary_gate_utc:contract.activation.ordinary_gate_utc,
  control_sources:4,
  admission_stages:4,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
},null,2));
