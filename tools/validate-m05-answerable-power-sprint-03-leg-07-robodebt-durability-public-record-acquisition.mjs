#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  ROBODEBT_DURABILITY_FRONTIER_ID,
  ROBODEBT_DURABILITY_RECEIPT_ID,
  ROBODEBT_DURABILITY_DOMAIN_ID,
  ROBODEBT_DURABILITY_JURISDICTION,
  ROBODEBT_DURABILITY_DIMENSION,
  ROBODEBT_DURABILITY_SOURCE_IDS,
  ROBODEBT_DURABILITY_ROUTE_IDS,
  summarizeRobodebtDurabilityPublicRecordAcquisition
} from './lib/m05-answerable-power-sprint-03-leg-07-robodebt-durability-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const acquisitionPath=resolvePath(
  'M05_ROBODEBT_DURABILITY_ACQUISITION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-durability-public-record-acquisition.json'
);
const frontierPath=resolvePath(
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'
);
const priorReceiptPath=resolvePath(
  'M05_ROBODEBT_PRE_ACTION_IMPLEMENTATION_RECEIPT_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
);

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const sha256Json=(value)=>crypto
  .createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const fail=(message)=>{throw new Error(message)};

const acquisitionRaw=readRaw(acquisitionPath);
const frontierRaw=readRaw(frontierPath);
const priorReceiptRaw=readRaw(priorReceiptPath);
const acquisition=JSON.parse(acquisitionRaw.toString('utf8'));
const frontier=JSON.parse(frontierRaw.toString('utf8'));
const priorReceipt=JSON.parse(priorReceiptRaw.toString('utf8'));
const acquisitionBefore=JSON.stringify(acquisition);
const frontierBefore=JSON.stringify(frontier);
const priorReceiptBefore=JSON.stringify(priorReceipt);

if(acquisition.schema_version!=='m05-answerable-power-s03-l7-robodebt-durability-public-record-acquisition@1')fail('acquisition schema drift');
if(acquisition.object_class!=='bounded_public_record_acquisition_result')fail('acquisition object class drift');
if(acquisition.program_id!=='M-05'||acquisition.sprint_id!=='M05-SPRINT-03'||acquisition.leg_id!=='S03-L7')fail('acquisition program binding drift');
if(acquisition.issue!==345)fail('acquisition issue identity drift');
if(acquisition.as_of!=='2026-08-17')fail('acquisition as-of drift');
if(acquisition.status!=='robodebt_durability_public_record_acquisition_frozen')fail('acquisition status drift');
if(!text(acquisition.title,35)||!text(acquisition.question,140))fail('acquisition title or question is under-specified');

if(acquisition.canonical_base?.branch!=='main')fail('canonical branch drift');
if(acquisition.canonical_base?.sha!=='01e3f154ef8a86baa90a89dc250adb9c362ba9ee')fail('canonical base drift');
if(acquisition.canonical_base?.tree_sha!=='65b89b877332c76ed1905be4e88a742c7e9163a1')fail('canonical tree drift');
if(acquisition.canonical_base?.implementation_frontier_pull_request!==2162)fail('frontier PR binding drift');

const frontierBinding=acquisition.bindings?.implementation_frontier||{};
if(frontierBinding.path!=='data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json')fail('frontier binding path drift');
if(frontierBinding.blob_sha!=='34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c')fail('frontier declared blob drift');
if(gitBlobSha(frontierRaw)!==frontierBinding.blob_sha)fail('frontier Git object drift');
if(frontierBinding.schema_version!=='m05-answerable-power-s03-l7-five-domain-implementation-frontier@1'||frontier.schema_version!==frontierBinding.schema_version)fail('frontier schema binding drift');
if(frontierBinding.pull_request!==2162||frontierBinding.merge_commit!=='01e3f154ef8a86baa90a89dc250adb9c362ba9ee')fail('frontier publication binding drift');

const priorBinding=acquisition.bindings?.robodebt_pre_action_implementation_receipt||{};
if(priorBinding.path!=='data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json')fail('prior receipt binding path drift');
if(priorBinding.blob_sha!=='a31d7ea7a1432a169de31035c153210b8975e217')fail('prior receipt declared blob drift');
if(gitBlobSha(priorReceiptRaw)!==priorBinding.blob_sha)fail('prior receipt Git object drift');
if(priorBinding.schema_version!=='m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt@1'||priorReceipt.schema_version!==priorBinding.schema_version)fail('prior receipt schema binding drift');
if(priorBinding.pull_request!==2155||priorBinding.merge_commit!=='3e9132f1628fe96989b931f56a302bf69907ef99')fail('prior receipt publication binding drift');

const target=acquisition.target||{};
const expectedTarget={
  frontier_id:ROBODEBT_DURABILITY_FRONTIER_ID,
  receipt_id:ROBODEBT_DURABILITY_RECEIPT_ID,
  domain_id:ROBODEBT_DURABILITY_DOMAIN_ID,
  jurisdiction:ROBODEBT_DURABILITY_JURISDICTION,
  route_class:'active_public_record_acquisition',
  dimension:ROBODEBT_DURABILITY_DIMENSION,
  before:false,
  after:false
};
if(!same(target,expectedTarget))fail('acquisition target drift');
const targetFrontier=(frontier.frontiers||[]).find((row)=>row.frontier_id===target.frontier_id);
if(!targetFrontier)fail('target frontier missing');
if(targetFrontier.receipt_id!==target.receipt_id||targetFrontier.domain_id!==target.domain_id||targetFrontier.jurisdiction!==target.jurisdiction)fail('target frontier identity drift');
if(targetFrontier.route_class!==target.route_class||targetFrontier.activation_state!=='active_now'||targetFrontier.execution_wave!==1)fail('target frontier routing drift');
if(targetFrontier.current_dimension_state?.pre_action_timing!==true||targetFrontier.current_dimension_state?.durability!==false||targetFrontier.current_dimension_state?.composed_durable_answer!==false)fail('target frontier dimension state drift');
if(!same(targetFrontier.preserved_deficits,['composed_durable_answer','dimension:durability']))fail('target frontier deficit drift');
if(priorReceipt.target?.receipt_id!==target.receipt_id||priorReceipt.target?.dimension!=='pre_action_timing'||priorReceipt.target?.after!==true)fail('prior pre-action transition drift');
if(priorReceipt.expected_result?.robodebt_durability!==false||priorReceipt.boundaries?.claims_durability!==false)fail('prior durability boundary drift');

const protocol=acquisition.acquisition_protocol||{};
const expectedHosts=[
  'www.servicesaustralia.gov.au',
  'www.anao.gov.au',
  'ministers.finance.gov.au',
  'www.aph.gov.au',
  'formerministers.dss.gov.au',
  'ministers.dss.gov.au'
];
const expectedQueries=[
  'annual debt-management-program review and operated denominator',
  'external independent assurance result and tested recommendations',
  'subject-level debt decision, contest, pre-collection pause, outcome, correction, waiver or refund, and follow-up'
];
const expectedSourceClasses=[
  'official_primary_record',
  'official_audit_work_program_record',
  'official_adjudicative_record',
  'source_native_primary_record'
];
if(protocol.executed_at!=='2026-08-17')fail('acquisition execution date drift');
if(!same(protocol.official_hosts,expectedHosts))fail('official host denominator drift');
if(!same(protocol.query_families,expectedQueries))fail('query-family denominator drift');
if(!same(protocol.allowed_source_classes,expectedSourceClasses))fail('allowed source-class drift');
for(const key of [
  'search_exhaustiveness_claimed',
  'access_controls_bypassed',
  'direct_voice_bulk_polling_allowed',
  'metadata_counts_as_substantive_content',
  'adjacent_case_transfer_allowed'
]){
  if(protocol[key]!==false)fail(`unsafe acquisition protocol ${key}`);
}
if(protocol.failed_and_nonqualifying_routes_preserved!==true)fail('route preservation contract drift');

const expectedSourceHashes={
  'AU-ROBODEBT-SA-ANNUAL-REPORT-2024-25':'64c34c3d2cc72144ea61c0d8bb2ddeb75bb242281184a975f79dd86688c4f2f4',
  'AU-ROBODEBT-ANAO-DEBT-AUDIT-POTENTIAL-2027-29':'3aba7ec18fec0cfccba6dcc408787aab59f2f000164c0fc2ff35b328316c12de',
  'AU-ROBODEBT-DEBT-SUPPORT-2026':'448aca90176fb4fb3ecaf398d238d4ea1699e7190881bcab773bd8bc708f9b8f'
};
const sourceRecords=Array.isArray(acquisition.source_records)?acquisition.source_records:[];
if(!same(sourceRecords.map((row)=>row.source_id),ROBODEBT_DURABILITY_SOURCE_IDS))fail('source-record identity or order drift');
if(new Set(sourceRecords.map((row)=>row.source_id)).size!==sourceRecords.length)fail('duplicate source identity');
for(const source of sourceRecords){
  if(!expectedSourceClasses.includes(source.record_type))fail(`${source.source_id} source class is not allowed`);
  if(!text(source.authority,8))fail(`${source.source_id} authority is under-specified`);
  let parsed;
  try{parsed=new URL(source.url)}catch{fail(`${source.source_id} URL is invalid`)}
  if(parsed.protocol!=='https:'||!expectedHosts.includes(parsed.hostname))fail(`${source.source_id} source boundary drift`);
  if(!Array.isArray(source.locators)||source.locators.length!==3||source.locators.some((row)=>!text(row,80)))fail(`${source.source_id} locator drift`);
  if(source.qualifies_as_durability_receipt!==false)fail(`${source.source_id} improperly qualifies as durability evidence`);
  if(sha256Json(source)!==expectedSourceHashes[source.source_id])fail(`${source.source_id} custody drift`);
}
if(sourceRecords[0].published_at!=='2025-11-11'||sourceRecords[0].source_role!=='supports_denominator_and_status_only')fail('annual-report source state drift');
if(sourceRecords[1].observed_at!=='2026-08-17'||sourceRecords[1].source_role!=='opens_future_independent_audit_route')fail('ANAO route source state drift');
if(sourceRecords[2].published_at!=='2026-05-26'||sourceRecords[2].source_role!=='inherited_current_implementation_without_durability')fail('current implementation source state drift');

const expectedRouteHashes={
  'AU-RD-DUR-01':'7cb3126069d62883a46307d83a00ad5ceab0f7dc89383e713a35dae4051bc260',
  'AU-RD-DUR-02':'8890f28566e104dfb80a70936d90efe7a9acde72dae55bbdd8abf9dc1d5fdaee',
  'AU-RD-DUR-03':'d0113f1b78b15e32c92c0e21c795afd79397a2d3379946fecc60e344be632b6a',
  'AU-RD-DUR-04':'2853cfbfa2c50538544c8da3f88d701b0b9568c9f330a3a460495a88373525d7',
  'AU-RD-DUR-05':'c301df8aa41204c1f6156dd0100d9365ac29ec618f83c4b1f01426e2ec9bb03d',
  'AU-RD-DUR-06':'3b7de32686408c1c30731bcb6e4cb3a7ece1bccacb75c4dd947f4704bb3dc26f'
};
const expectedRouteState={
  'AU-RD-DUR-01':{host:'www.servicesaustralia.gov.au',result_class:'substantive_nonqualifying_content',source_ids:['AU-ROBODEBT-SA-ANNUAL-REPORT-2024-25','AU-ROBODEBT-DEBT-SUPPORT-2026']},
  'AU-RD-DUR-02':{host:'www.anao.gov.au',result_class:'future_audit_route_only',source_ids:['AU-ROBODEBT-ANAO-DEBT-AUDIT-POTENTIAL-2027-29']},
  'AU-RD-DUR-03':{host:'ministers.finance.gov.au',result_class:'no_qualifying_result_located',source_ids:[]},
  'AU-RD-DUR-04':{host:'www.aph.gov.au',result_class:'no_qualifying_result_located',source_ids:[]},
  'AU-RD-DUR-05':{host:'formerministers.dss.gov.au',result_class:'inherited_implementation_statement_only',source_ids:[]},
  'AU-RD-DUR-06':{host:'ministers.dss.gov.au',result_class:'substantive_nonqualifying_content',source_ids:[]}
};
const routes=Array.isArray(acquisition.route_ledger)?acquisition.route_ledger:[];
if(!same(routes.map((row)=>row.route_id),ROBODEBT_DURABILITY_ROUTE_IDS))fail('route identity or order drift');
if(new Set(routes.map((row)=>row.route_id)).size!==routes.length)fail('duplicate route identity');
for(const route of routes){
  const expected=expectedRouteState[route.route_id];
  if(!expected)fail(`unexpected route ${route.route_id}`);
  if(route.host!==expected.host||route.result_class!==expected.result_class||!same(route.observed_source_ids,expected.source_ids))fail(`${route.route_id} route state drift`);
  if(route.qualifying_receipt_found!==false)fail(`${route.route_id} improperly qualifies a receipt`);
  if(!text(route.surface,20)||!text(route.preserved_reason,80))fail(`${route.route_id} route description is under-specified`);
  if(sha256Json(route)!==expectedRouteHashes[route.route_id])fail(`${route.route_id} route custody drift`);
}

const expectedObservedState={
  debt_management_program_reported_implemented:true,
  operated_2024_25_debt_denominator_published:true,
  annual_review_commitment_published:true,
  published_annual_review_result_located:false,
  external_assurance_process_reported:true,
  published_external_assurance_result_located:false,
  future_anao_audit_route_identified:true,
  source_addressed_subject_level_pause_and_remedy_chain_located:false,
  successor_system_nonrecurrence_denominator_located:false,
  durability_supported:false
};
if(!same(acquisition.observed_state,expectedObservedState))fail('observed acquisition state drift');

const finding=acquisition.finding||{};
if(finding.finding_class!=='denominator_and_assurance_status_observed_without_qualifying_durability_receipt')fail('finding class drift');
const summary=summarizeRobodebtDurabilityPublicRecordAcquisition(acquisition,frontier,priorReceipt);
if(JSON.stringify(acquisition)!==acquisitionBefore||JSON.stringify(frontier)!==frontierBefore||JSON.stringify(priorReceipt)!==priorReceiptBefore)fail('acquisition summary mutated a source object');
const computedFinding={
  source_records:summary.source_records,
  new_source_records:summary.new_source_records,
  qualifying_durability_receipts:summary.qualifying_durability_receipts,
  routes_executed:summary.routes_executed,
  routes_with_substantive_content:summary.routes_with_substantive_content,
  routes_with_qualifying_receipt:summary.routes_with_qualifying_receipt,
  deficits_closed:summary.deficits_closed,
  deficits_preserved:summary.deficits_preserved,
  answer_changes_authorized:summary.answer_changes_authorized,
  repository_effect:summary.repository_effect
};
const declaredFinding={
  source_records:finding.source_records,
  new_source_records:finding.new_source_records,
  qualifying_durability_receipts:finding.qualifying_durability_receipts,
  routes_executed:finding.routes_executed,
  routes_with_substantive_content:finding.routes_with_substantive_content,
  routes_with_qualifying_receipt:finding.routes_with_qualifying_receipt,
  deficits_closed:finding.deficits_closed,
  deficits_preserved:finding.deficits_preserved,
  answer_changes_authorized:finding.answer_changes_authorized,
  repository_effect:finding.repository_effect
};
if(!same(computedFinding,declaredFinding))fail('declared finding does not match computed acquisition state');
if(!same(finding.deficits_closed,[])||!same(finding.deficits_preserved,['composed_durable_answer','dimension:durability']))fail('deficit ledger drift');
if(finding.answer_changes_authorized!==false||finding.repository_effect!=='repository_content_only')fail('repository effect escaped content-only boundary');
if(!Array.isArray(finding.next_required_receipts)||finding.next_required_receipts.length!==3||finding.next_required_receipts.some((row)=>!text(row,100)))fail('next-receipt ledger drift');
if(summary.robodebt_pre_action_timing!==true||summary.robodebt_durability!==false)fail('Robodebt dimension summary drift');

const assessment=acquisition.assessment||{};
for(const key of ['evidence_tier','venue','target','upside','downside','failure_mode']){
  if(!text(assessment[key],80))fail(`assessment ${key} is under-specified`);
}

const expectedState={
  existing_candidate_evidence_records:5,
  existing_repository_promotions:5,
  existing_advanced_answer_dimensions:1,
  robodebt_pre_action_timing:true,
  robodebt_durability:false,
  new_source_records:2,
  qualifying_durability_receipts:0,
  effective_answers:0,
  qualifying_jurisdictions:0,
  cross_domain_regression_completed:false,
  issue_345_may_close:false
};
if(!same(acquisition.expected_state,expectedState))fail('expected state drift');
if(frontier.expected_result?.candidate_evidence_records!==5||frontier.expected_result?.repository_promotion_allowed!==5||frontier.expected_result?.advanced_answer_dimensions!==1||frontier.expected_result?.effective_answers!==0||frontier.expected_result?.qualifying_jurisdictions!==0||frontier.expected_result?.cross_domain_regression_completed!==false)fail('bound frontier result drift');

const boundaries=acquisition.boundaries||{};
for(const key of [
  'changes_implementation_frontier',
  'changes_prior_robodebt_receipt',
  'search_exhaustiveness_claimed',
  'implementation_statement_is_assurance_result',
  'annual_review_commitment_is_review_result',
  'future_audit_topic_is_completed_audit',
  'published_denominator_is_nonrecurrence_proof',
  'current_waiver_changes_are_durability',
  'requestable_pause_is_observed_pause',
  'adjacent_case_transfer_allowed',
  'answer_effectiveness_claimed',
  'cross_domain_regression_completed',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`acquisition boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='repository_content'||boundaries.graph_effect!=='none')fail('acquisition repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-robodebt-durability-public-record-acquisition',
  source_records:summary.source_records,
  new_source_records:summary.new_source_records,
  qualifying_durability_receipts:summary.qualifying_durability_receipts,
  routes_executed:summary.routes_executed,
  routes_with_substantive_content:summary.routes_with_substantive_content,
  routes_with_qualifying_receipt:summary.routes_with_qualifying_receipt,
  robodebt_pre_action_timing:summary.robodebt_pre_action_timing,
  robodebt_durability:summary.robodebt_durability,
  effective_answers:0,
  cross_domain_regression_completed:false,
  issue_345_may_close:false
},null,2));
