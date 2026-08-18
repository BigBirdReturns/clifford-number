#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  FOODINHO_COMPLIANCE_FRONTIER_ID,
  FOODINHO_COMPLIANCE_RECEIPT_ID,
  FOODINHO_COMPLIANCE_DOMAIN_ID,
  FOODINHO_COMPLIANCE_JURISDICTION,
  FOODINHO_COMPLIANCE_SOURCE_IDS,
  FOODINHO_COMPLIANCE_ROUTE_IDS,
  summarizeFoodinhoCompliancePublicRecordAcquisition
} from './lib/m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const acquisitionPath=resolvePath(
  'M05_FOODINHO_COMPLIANCE_ACQUISITION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.json'
);
const frontierPath=resolvePath(
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'
);
const gapLedgerPath=resolvePath(
  'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
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
const gapLedgerRaw=readRaw(gapLedgerPath);
const packetRaw=readRaw(packetPath);
const acquisition=JSON.parse(acquisitionRaw.toString('utf8'));
const frontier=JSON.parse(frontierRaw.toString('utf8'));
const gapLedger=JSON.parse(gapLedgerRaw.toString('utf8'));
const packet=JSON.parse(packetRaw.toString('utf8'));
const snapshots={
  acquisition:JSON.stringify(acquisition),
  frontier:JSON.stringify(frontier),
  gapLedger:JSON.stringify(gapLedger),
  packet:JSON.stringify(packet)
};

if(acquisition.schema_version!=='m05-answerable-power-s03-l7-foodinho-compliance-public-record-acquisition@1')fail('acquisition schema drift');
if(acquisition.object_class!=='bounded_public_record_acquisition_result')fail('acquisition object class drift');
if(acquisition.program_id!=='M-05'||acquisition.sprint_id!=='M05-SPRINT-03'||acquisition.leg_id!=='S03-L7')fail('acquisition program binding drift');
if(acquisition.issue!==345)fail('acquisition issue identity drift');
if(acquisition.as_of!=='2026-08-17')fail('acquisition as-of drift');
if(acquisition.status!=='foodinho_compliance_public_record_acquisition_frozen')fail('acquisition status drift');
if(!text(acquisition.title,35)||!text(acquisition.question,160))fail('acquisition title or question is under-specified');

if(acquisition.canonical_base?.branch!=='main')fail('canonical branch drift');
if(acquisition.canonical_base?.sha!=='1088df4a45e7510ea35fa19fb7eb281110559d08')fail('canonical base drift');
if(acquisition.canonical_base?.tree_sha!=='4c53e40847160a40d3a64c0862cfe0e492f2685f')fail('canonical tree drift');
if(acquisition.canonical_base?.implementation_frontier_pull_request!==2162)fail('frontier PR binding drift');
if(acquisition.canonical_base?.state_composition_pull_request!==2164)fail('composition PR binding drift');

const frontierBinding=acquisition.bindings?.implementation_frontier||{};
if(frontierBinding.path!=='data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json')fail('frontier binding path drift');
if(frontierBinding.blob_sha!=='34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c')fail('frontier declared blob drift');
if(gitBlobSha(frontierRaw)!==frontierBinding.blob_sha)fail('frontier Git object drift');
if(frontierBinding.schema_version!=='m05-answerable-power-s03-l7-five-domain-implementation-frontier@1'||frontier.schema_version!==frontierBinding.schema_version)fail('frontier schema binding drift');
if(frontierBinding.pull_request!==2162||frontierBinding.merge_commit!=='01e3f154ef8a86baa90a89dc250adb9c362ba9ee')fail('frontier publication binding drift');

const gapBinding=acquisition.bindings?.implementation_gap_probe_ledger||{};
if(gapBinding.path!=='data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json')fail('gap-ledger binding path drift');
if(gapBinding.blob_sha!=='ec0f9e68804c54ad487eb08a8ec8691bbd4db2bf')fail('gap-ledger declared blob drift');
if(gitBlobSha(gapLedgerRaw)!==gapBinding.blob_sha)fail('gap-ledger Git object drift');
if(gapBinding.schema_version!=='m05-answerable-power-s03-l7-implementation-gap-probe-ledger@1'||gapLedger.schema_version!==gapBinding.schema_version)fail('gap-ledger schema binding drift');
if(gapBinding.commit!=='359caf0d3725bbbae570b11fa7f65fd553bf72f7')fail('gap-ledger publication binding drift');

const packetBinding=acquisition.bindings?.official_receipt_packet||{};
if(packetBinding.path!=='data/project/m05-cross-domain-official-receipt-candidates.json')fail('packet binding path drift');
if(packetBinding.blob_sha!=='1c17549a39b826853435d3726596bf41d0fc7de9')fail('packet declared blob drift');
if(gitBlobSha(packetRaw)!==packetBinding.blob_sha)fail('packet Git object drift');
if(packetBinding.schema_version!=='m05-cross-domain-official-receipt-candidates@1'||packet.schema_version!==packetBinding.schema_version)fail('packet schema binding drift');
if(packetBinding.pull_request!==2151||packetBinding.merge_commit!=='204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0')fail('packet publication binding drift');

const target=acquisition.target||{};
const expectedTarget={
  frontier_id:FOODINHO_COMPLIANCE_FRONTIER_ID,
  receipt_id:FOODINHO_COMPLIANCE_RECEIPT_ID,
  domain_id:FOODINHO_COMPLIANCE_DOMAIN_ID,
  jurisdiction:FOODINHO_COMPLIANCE_JURISDICTION,
  route_class:'active_public_record_acquisition',
  dimensions:{
    pre_action_timing:{before:false,after:false},
    durability:{before:false,after:false}
  }
};
if(!same(target,expectedTarget))fail('acquisition target drift');

const targetFrontier=(frontier.frontiers||[]).find((row)=>row.frontier_id===target.frontier_id);
if(!targetFrontier)fail('target frontier missing');
if(targetFrontier.receipt_id!==target.receipt_id||targetFrontier.domain_id!==target.domain_id||targetFrontier.jurisdiction!==target.jurisdiction)fail('target frontier identity drift');
if(targetFrontier.route_class!==target.route_class||targetFrontier.activation_state!=='active_now'||targetFrontier.execution_wave!==1)fail('target frontier routing drift');
if(!same(targetFrontier.current_dimension_state,{
  pre_action_timing:false,
  durability:false,
  composed_durable_answer:false
}))fail('target frontier dimension-state drift');
if(!same(targetFrontier.preserved_deficits,[
  'composed_durable_answer',
  'dimension:pre_action_timing',
  'dimension:durability'
]))fail('target frontier deficit drift');

const targetProbe=(gapLedger.probes||[]).find((row)=>row.receipt_id===target.receipt_id);
if(!targetProbe)fail('target implementation probe missing');
if(targetProbe.probe_id!=='M05-IP-WORK-IT-FOODINHO-PRE-ACTION-DURABILITY'||targetProbe.domain_id!==target.domain_id||targetProbe.jurisdiction!==target.jurisdiction)fail('target implementation probe identity drift');
if(targetProbe.probe_result?.answer_changes_authorized!==false||targetProbe.probe_result?.promotion_changes_authorized!==false)fail('target probe boundary drift');
if(!same(targetProbe.target_deficits,targetFrontier.preserved_deficits))fail('target probe deficit drift');

const packetRecord=(packet.records||[]).find((row)=>row.receipt_id===target.receipt_id);
if(!packetRecord)fail('target official receipt missing');
if(packetRecord.domain_id!==target.domain_id||packetRecord.jurisdiction!==target.jurisdiction)fail('target official receipt identity drift');
if(packetRecord.observation?.answer?.dimensions?.pre_action_timing!==false||packetRecord.observation?.answer?.dimensions?.durability!==false)fail('target official answer-state drift');
if(packetRecord.observation?.answer?.composed_durable_answer!==false)fail('target official composed-answer drift');

const protocol=acquisition.acquisition_protocol||{};
const expectedHosts=['www.garanteprivacy.it','garanteprivacy.it'];
const expectedQueries=[
  'Foodinho closure determination and proceeding extinction',
  'documented compliance response and verified corrective-control operation',
  'independent technical audit or rider-level human-review, contest, correction, and nonrecurrence result',
  '2025 annual oversight references to Foodinho, Glovo, riders, and platform-work algorithms'
];
const expectedSourceClasses=[
  'official_primary_record',
  'official_adjudicative_record',
  'source_native_primary_record',
  'lawfully_supplied_subject_record'
];
if(protocol.executed_at!=='2026-08-17')fail('acquisition execution date drift');
if(!same(protocol.official_hosts,expectedHosts))fail('official host denominator drift');
if(!same(protocol.query_families,expectedQueries))fail('query-family denominator drift');
if(!same(protocol.allowed_source_classes,expectedSourceClasses))fail('allowed source-class drift');
for(const key of [
  'search_exhaustiveness_claimed',
  'current_public_nonexistence_claimed',
  'access_controls_bypassed',
  'direct_voice_bulk_polling_allowed',
  'metadata_counts_as_substantive_content',
  'adjacent_case_transfer_allowed',
  'annual_report_silence_counts_as_compliance',
  'annual_report_silence_counts_as_noncompliance'
]){
  if(protocol[key]!==false)fail(`unsafe acquisition protocol ${key}`);
}
if(protocol.failed_and_nonqualifying_routes_preserved!==true)fail('route preservation contract drift');

const expectedSourceHashes={
  "IT-FOODINHO-2024-ORDER": "eae337a655079333cd20eb8329b19c3f4e85afa0b4b6e152e72732e7c4d76aba",
  "IT-FOODINHO-2024-EXTENSION": "50261d7d651a663cd9873de133f583d51125c89462610d2e1fc2bcc457c61d46",
  "IT-GARANTE-ANNUAL-REPORT-2025": "c87c08f77c3c96613f703142cb34a7f122e704d535038b5007df94650258052a"
};
const sourceRecords=Array.isArray(acquisition.source_records)?acquisition.source_records:[];
if(!same(sourceRecords.map((row)=>row.source_id),FOODINHO_COMPLIANCE_SOURCE_IDS))fail('source-record identity or order drift');
if(new Set(sourceRecords.map((row)=>row.source_id)).size!==sourceRecords.length)fail('duplicate source identity');
for(const source of sourceRecords){
  if(!expectedSourceClasses.includes(source.record_type))fail(`${source.source_id} source class is not allowed`);
  if(!text(source.authority,8))fail(`${source.source_id} authority is under-specified`);
  let parsed;
  try{parsed=new URL(source.url)}catch{fail(`${source.source_id} URL is invalid`)}
  if(parsed.protocol!=='https:'||!expectedHosts.includes(parsed.hostname))fail(`${source.source_id} source boundary drift`);
  if(!Array.isArray(source.locators)||source.locators.length!==3||source.locators.some((row)=>!text(row,80)))fail(`${source.source_id} locator drift`);
  if(source.qualifies_as_compliance_receipt!==false)fail(`${source.source_id} improperly qualifies as compliance evidence`);
  if(sha256Json(source)!==expectedSourceHashes[source.source_id])fail(`${source.source_id} custody drift`);
}
if(sourceRecords[0].published_at!=='2024-11-13'||sourceRecords[0].source_role!=='binding_corrective_order_without_operated_result'||sourceRecords[0].newly_acquired!==false)fail('2024 order source-state drift');
if(sourceRecords[1].published_at!=='2024-12-19'||sourceRecords[1].source_role!=='conditional_implementation_timetable_without_closure'||sourceRecords[1].newly_acquired!==false)fail('2024 extension source-state drift');
if(sourceRecords[2].published_at!=='2026-07-02'||sourceRecords[2].source_role!=='annual_oversight_without_foodinho_specific_result'||sourceRecords[2].newly_acquired!==true)fail('annual-report source-state drift');
if(!text(sourceRecords[2].document_url,80))fail('annual-report document URL missing');

const expectedRouteHashes={
  "IT-FD-COMP-01": "da07917cb3bf887d38774d8f108882b357227fbbdf2ac0b1f368b6841a92eac9",
  "IT-FD-COMP-02": "792c9cce5ffb932ecddc2d61f0914612f88d54d529026707b3c7932b34d21b8a",
  "IT-FD-COMP-03": "cdcba27f0c0df6c92611544a9a5841a910a2158578800686d0c09a2fc366a961",
  "IT-FD-COMP-04": "4c421b153b93d888b25f8c01f3947750231aa7bde1215fc15d4abc416234852f",
  "IT-FD-COMP-05": "8dfd4cf4a884f16547dceb35e844b4d5334e7e1005a5f0f64d192987521d491a"
};
const expectedRouteState={
  'IT-FD-COMP-01':{host:'www.garanteprivacy.it',result_class:'binding_order_only',source_ids:['IT-FOODINHO-2024-ORDER']},
  'IT-FD-COMP-02':{host:'www.garanteprivacy.it',result_class:'conditional_extension_only',source_ids:['IT-FOODINHO-2024-EXTENSION']},
  'IT-FD-COMP-03':{host:'www.garanteprivacy.it',result_class:'historical_enforcement_chain_only',source_ids:['IT-FOODINHO-2024-ORDER','IT-FOODINHO-2024-EXTENSION']},
  'IT-FD-COMP-04':{host:'www.garanteprivacy.it',result_class:'annual_oversight_without_foodinho_specific_entry',source_ids:['IT-GARANTE-ANNUAL-REPORT-2025']},
  'IT-FD-COMP-05':{host:'www.garanteprivacy.it',result_class:'no_later_foodinho_specific_result_located',source_ids:[]}
};
const routes=Array.isArray(acquisition.route_ledger)?acquisition.route_ledger:[];
if(!same(routes.map((row)=>row.route_id),FOODINHO_COMPLIANCE_ROUTE_IDS))fail('route identity or order drift');
if(new Set(routes.map((row)=>row.route_id)).size!==routes.length)fail('duplicate route identity');
for(const route of routes){
  const expected=expectedRouteState[route.route_id];
  if(!expected)fail(`unexpected route ${route.route_id}`);
  if(route.host!==expected.host||route.result_class!==expected.result_class||!same(route.observed_source_ids,expected.source_ids))fail(`${route.route_id} route state drift`);
  if(route.qualifying_receipt_found!==false)fail(`${route.route_id} improperly qualifies a receipt`);
  if(!text(route.surface,20)||!text(route.query_family,20)||!text(route.preserved_reason,80))fail(`${route.route_id} route description is under-specified`);
  if(sha256Json(route)!==expectedRouteHashes[route.route_id])fail(`${route.route_id} route custody drift`);
}

const expectedObservedState={
  binding_corrective_order_published:true,
  recurrent_violations_after_prior_order_recorded:true,
  compliance_intention_recorded:true,
  implementation_extension_recorded:true,
  documented_response_required:true,
  annual_report_2025_published:true,
  foodinho_named_in_annual_report_2025:false,
  published_foodinho_specific_closure_located:false,
  documented_foodinho_compliance_response_located:false,
  independent_technical_compliance_audit_located:false,
  rider_level_pre_action_human_review_outcome_located:false,
  recurrence_free_post_change_denominator_located:false,
  pre_action_timing_supported:false,
  durability_supported:false
};
if(!same(acquisition.observed_state,expectedObservedState))fail('observed acquisition state drift');

const finding=acquisition.finding||{};
if(finding.finding_class!=='official_enforcement_and_annual_oversight_without_qualifying_compliance_receipt')fail('finding class drift');
if(!same(finding.deficits_closed,[]))fail('closed-deficit ledger drift');
if(!same(finding.deficits_preserved,targetFrontier.preserved_deficits))fail('preserved-deficit ledger drift');
if(finding.promotion_changes_authorized!==false||finding.answer_changes_authorized!==false||finding.repository_effect!=='none')fail('finding authorization boundary drift');
if(!Array.isArray(finding.next_required_receipts)||finding.next_required_receipts.length!==4||finding.next_required_receipts.some((row)=>!text(row,100)))fail('next-receipt ledger drift');

const summary=summarizeFoodinhoCompliancePublicRecordAcquisition(
  acquisition,
  frontier,
  gapLedger,
  packet
);
if(
  JSON.stringify(acquisition)!==snapshots.acquisition||
  JSON.stringify(frontier)!==snapshots.frontier||
  JSON.stringify(gapLedger)!==snapshots.gapLedger||
  JSON.stringify(packet)!==snapshots.packet
)fail('acquisition summary mutated a source object');
if(!same(summary,{...summary}))fail('summary is not serializable');

const expectedResult=acquisition.expected_result||{};
const computed={
  source_records:summary.source_records,
  new_source_records:summary.new_source_records,
  qualifying_compliance_receipts:summary.qualifying_compliance_receipts,
  routes_executed:summary.routes_executed,
  routes_with_substantive_content:summary.routes_with_substantive_content,
  routes_with_qualifying_receipt:summary.routes_with_qualifying_receipt,
  foodinho_pre_action_timing:summary.foodinho_pre_action_timing,
  foodinho_durability:summary.foodinho_durability,
  deficits_closed:summary.deficits_closed,
  deficits_preserved:summary.deficits_preserved,
  candidate_evidence_records:summary.candidate_evidence_records,
  repository_promotion_allowed:summary.repository_promotion_allowed,
  advanced_answer_dimensions:summary.advanced_answer_dimensions,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(computed,expectedResult))fail('expected acquisition result drift');

const boundaries=acquisition.boundaries||{};
for(const key of [
  'changes_implementation_frontier',
  'changes_implementation_gap_probe_ledger',
  'changes_official_receipt_packet',
  'creates_new_empirical_answer_receipt',
  'claims_search_exhaustiveness',
  'claims_current_public_nonexistence',
  'corrective_order_is_operated_safeguard',
  'compliance_intention_is_completed_compliance',
  'implementation_extension_is_closure',
  'annual_report_silence_is_compliance',
  'annual_report_silence_is_noncompliance',
  'later_sanction_is_recurrence_free_durability',
  'claims_pre_action_timing',
  'claims_durability',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`acquisition boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='repository_content'||boundaries.graph_effect!=='none')fail('repository boundary drift');

const assessment=acquisition.assessment||{};
for(const key of ['evidence_tier','venue','target','upside','downside','failure_mode']){
  if(!text(assessment[key],60))fail(`assessment ${key} is under-specified`);
}

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-foodinho-compliance-public-record-acquisition',
  ...computed
},null,2));
