#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  SYRI_ACCESS_FRONTIER_ID,
  SYRI_ACCESS_RECEIPT_ID,
  SYRI_ACCESS_DOMAIN_ID,
  SYRI_ACCESS_JURISDICTION,
  SYRI_ACCESS_DIMENSION,
  SYRI_ACCESS_PROBE_ID,
  SYRI_ACCESS_SOURCE_IDS,
  SYRI_ACCESS_ROUTE_IDS,
  summarizeSyriSubjectAccessPublicRecordAcquisition
} from './lib/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const acquisitionPath=resolvePath(
  'M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json'
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
const clone=(value)=>JSON.parse(JSON.stringify(value));
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
const acquisitionBefore=JSON.stringify(acquisition);
const frontierBefore=JSON.stringify(frontier);
const gapLedgerBefore=JSON.stringify(gapLedger);
const packetBefore=JSON.stringify(packet);

if(sha256Json(acquisition)!=='73def3d8a0254ddb1083a1854fc25c84ab92c24fee1e847183a57c210a39b7a4')fail('SyRI acquisition semantic custody drift');
if(acquisition.schema_version!=='m05-answerable-power-s03-l7-syri-subject-access-public-record-acquisition@1')fail('acquisition schema drift');
if(acquisition.object_class!=='bounded_controlled_subject_or_archival_acquisition_result')fail('acquisition object class drift');
if(acquisition.program_id!=='M-05'||acquisition.sprint_id!=='M05-SPRINT-03'||acquisition.leg_id!=='S03-L7')fail('acquisition program binding drift');
if(acquisition.issue!==345)fail('acquisition issue identity drift');
if(acquisition.as_of!=='2026-08-17')fail('acquisition as-of drift');
if(acquisition.status!=='syri_subject_access_public_record_acquisition_frozen')fail('acquisition status drift');
if(!text(acquisition.title,35)||!text(acquisition.question,180))fail('acquisition title or question is under-specified');

if(acquisition.canonical_base?.branch!=='main')fail('canonical branch drift');
if(acquisition.canonical_base?.sha!=='cc9a3db668b985bf5303fcbad6c3f49855728cd8')fail('canonical base drift');
if(acquisition.canonical_base?.tree_sha!=='cede9104a1e939ac038224a881f8a8c02a38eef1')fail('canonical tree drift');
if(acquisition.canonical_base?.implementation_frontier_pull_request!==2162)fail('frontier PR binding drift');
if(acquisition.canonical_base?.latest_active_public_record_pull_request!==2170)fail('active-route chronology drift');

const bindingDefinitions={
  implementation_frontier:{
    raw:frontierRaw,
    data:frontier,
    path:'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json',
    blob:'34fa8d54c3a6ea9b993c3b650f4b737dcbbc756c',
    schema:'m05-answerable-power-s03-l7-five-domain-implementation-frontier@1'
  },
  implementation_gap_probe_ledger:{
    raw:gapLedgerRaw,
    data:gapLedger,
    path:'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json',
    blob:'ec0f9e68804c54ad487eb08a8ec8691bbd4db2bf',
    schema:'m05-answerable-power-s03-l7-implementation-gap-probe-ledger@1'
  },
  official_receipt_packet:{
    raw:packetRaw,
    data:packet,
    path:'data/project/m05-cross-domain-official-receipt-candidates.json',
    blob:'1c17549a39b826853435d3726596bf41d0fc7de9',
    schema:'m05-cross-domain-official-receipt-candidates@1'
  }
};
for(const [bindingId,definition] of Object.entries(bindingDefinitions)){
  const binding=acquisition.bindings?.[bindingId];
  if(!binding)fail(`missing binding ${bindingId}`);
  if(binding.path!==definition.path)fail(`${bindingId} path drift`);
  if(binding.blob_sha!==definition.blob)fail(`${bindingId} declared blob drift`);
  if(gitBlobSha(definition.raw)!==definition.blob)fail(`${bindingId} Git object drift`);
  if(binding.schema_version!==definition.schema||definition.data.schema_version!==definition.schema)fail(`${bindingId} schema drift`);
}
if(acquisition.bindings.implementation_frontier.pull_request!==2162||acquisition.bindings.implementation_frontier.merge_commit!=='01e3f154ef8a86baa90a89dc250adb9c362ba9ee')fail('frontier publication binding drift');
if(acquisition.bindings.implementation_gap_probe_ledger.commit!=='359caf0d3725bbbae570b11fa7f65fd553bf72f7')fail('gap-ledger publication binding drift');
if(acquisition.bindings.official_receipt_packet.pull_request!==2151||acquisition.bindings.official_receipt_packet.merge_commit!=='204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0')fail('packet publication binding drift');

const expectedTarget={
  frontier_id:SYRI_ACCESS_FRONTIER_ID,
  receipt_id:SYRI_ACCESS_RECEIPT_ID,
  domain_id:SYRI_ACCESS_DOMAIN_ID,
  jurisdiction:SYRI_ACCESS_JURISDICTION,
  route_class:'controlled_subject_or_archival_acquisition',
  dimension:SYRI_ACCESS_DIMENSION,
  before:false,
  after:false
};
if(!same(acquisition.target,expectedTarget))fail('SyRI target drift');
const targetFrontier=(frontier.frontiers||[]).find((row)=>row.frontier_id===SYRI_ACCESS_FRONTIER_ID);
if(!targetFrontier)fail('SyRI frontier missing');
if(targetFrontier.receipt_id!==SYRI_ACCESS_RECEIPT_ID||targetFrontier.domain_id!==SYRI_ACCESS_DOMAIN_ID||targetFrontier.jurisdiction!==SYRI_ACCESS_JURISDICTION)fail('SyRI frontier identity drift');
if(targetFrontier.route_class!=='controlled_subject_or_archival_acquisition'||targetFrontier.activation_state!=='active_access_bounded'||targetFrontier.execution_wave!==2)fail('SyRI frontier route drift');
if(!same(targetFrontier.current_dimension_state,{evidence_access:false,composed_durable_answer:false}))fail('SyRI frontier dimension drift');
if(!same(targetFrontier.preserved_deficits,['composed_durable_answer','dimension:evidence_access']))fail('SyRI frontier deficit drift');
if(targetFrontier.answer_changes_authorized!==false)fail('SyRI frontier answer authority drift');
if(!same(targetFrontier.access_boundary,{
  subject_consent_or_lawful_public_record_required:true,
  direct_voice_bulk_polling_allowed:false,
  access_controls_bypassed:false,
  person_level_record_may_be_inferred_from_formal_route:false
}))fail('SyRI frontier access boundary drift');

const targetProbe=(gapLedger.probes||[]).find((row)=>row.probe_id===SYRI_ACCESS_PROBE_ID);
if(!targetProbe)fail('SyRI implementation probe missing');
if(targetProbe.receipt_id!==SYRI_ACCESS_RECEIPT_ID||targetProbe.domain_id!==SYRI_ACCESS_DOMAIN_ID||targetProbe.jurisdiction!==SYRI_ACCESS_JURISDICTION)fail('SyRI probe identity drift');
if(!same(targetProbe.target_deficits,['composed_durable_answer','dimension:evidence_access']))fail('SyRI probe deficit drift');
if(targetProbe.probe_result?.answer_changes_authorized!==false||targetProbe.probe_result?.promotion_changes_authorized!==false)fail('SyRI probe authority drift');

const sourceCandidate=(packet.records||[]).find((row)=>row.receipt_id===SYRI_ACCESS_RECEIPT_ID);
if(!sourceCandidate)fail('SyRI official candidate missing');
if(sourceCandidate.domain_id!==SYRI_ACCESS_DOMAIN_ID||sourceCandidate.jurisdiction!==SYRI_ACCESS_JURISDICTION)fail('SyRI candidate identity drift');
if(sourceCandidate.observation?.answer?.dimensions?.evidence_access!==false||sourceCandidate.observation?.answer?.composed_durable_answer!==false)fail('SyRI source answer boundary drift');
if(!sourceCandidate.deficits?.includes('dimension:evidence_access'))fail('SyRI source deficit missing');

const expectedAccessBoundary={
  subject_consent_or_lawful_public_record_required:true,
  direct_voice_bulk_polling_allowed:false,
  access_controls_bypassed:false,
  person_level_record_may_be_inferred_from_formal_route:false,
  synthetic_or_adjacent_subject_transfer_allowed:false
};
if(!same(acquisition.access_boundary,expectedAccessBoundary))fail('acquisition access boundary drift');

const protocol=acquisition.acquisition_protocol||{};
const expectedHosts=[
  'www.rechtspraak.nl',
  'zoek.officielebekendmakingen.nl',
  'www.rijksoverheid.nl',
  'www.autoriteitpersoonsgegevens.nl'
];
const expectedQueries=[
  'archived SyRI subject-access request and response',
  'litigation exhibit or ombudsman file joining one person to SyRI inputs and a risk indication',
  'disclosed reasoning, recipients, correction, objection, or contest outcome',
  'historical register access, destruction records, public risk-model documents, and current ministry privacy routes'
];
const expectedSourceClasses=[
  'official_primary_record',
  'official_adjudicative_record',
  'lawfully_supplied_subject_record'
];
if(protocol.executed_at!=='2026-08-17')fail('protocol execution date drift');
if(!same(protocol.official_hosts,expectedHosts)||!same(protocol.query_families,expectedQueries)||!same(protocol.allowed_source_classes,expectedSourceClasses))fail('protocol denominator drift');
for(const key of [
  'search_exhaustiveness_claimed',
  'current_public_nonexistence_claimed',
  'access_controls_bypassed',
  'direct_voice_bulk_polling_allowed',
  'metadata_counts_as_substantive_content',
  'formal_access_route_counts_as_fulfilled_access',
  'data_destruction_counts_as_subject_explanation',
  'system_level_disclosure_counts_as_person_level_join'
]){
  if(protocol[key]!==false)fail(`unsafe acquisition protocol ${key}`);
}
if(protocol.failed_and_nonqualifying_routes_preserved!==true)fail('route preservation drift');

const sourceDefinitions={
  'NL-SYRI-COURT-JUDGMENT-2020':{
    authority:'Rechtbank Den Haag',
    record_type:'official_adjudicative_record',
    date_key:'decision_date',
    date_value:'2020-02-05',
    url:'https://www.rechtspraak.nl/organisatie-en-contact/organisatie/rechtbanken/rechtbank-den-haag/nieuws/2020/02/syri-legislation-in-breach-of-european-convention-on-human-rights',
    role:'inherited_system_level_adjudication_without_subject_access',
    newly_acquired:false
  },
  'NL-SYRI-REGISTER-ACCESS-RULE-2014':{
    authority:'Ministerie van Sociale Zaken en Werkgelegenheid, Staatsblad',
    record_type:'official_primary_record',
    date_key:'published_at',
    date_value:'2014-09-11',
    url:'https://zoek.officielebekendmakingen.nl/stb-2014-320.html',
    role:'historical_formal_access_route_without_fulfilled_subject_record',
    newly_acquired:true
  },
  'NL-SYRI-DATA-DESTRUCTION-ANSWERS-2022':{
    authority:'Tweede Kamer der Staten-Generaal and the Dutch Government',
    record_type:'official_primary_record',
    date_key:'published_at',
    date_value:'2022-06-21',
    url:'https://zoek.officielebekendmakingen.nl/kst-31066-1051.html',
    role:'system_level_destruction_and_no_decision_record',
    newly_acquired:true
  },
  'NL-SYRI-RISK-MODEL-WOB-2023':{
    authority:'Ministerie van Sociale Zaken en Werkgelegenheid',
    record_type:'official_primary_record',
    date_key:'published_at',
    date_value:'2023-06-08',
    url:'https://www.rijksoverheid.nl/documenten/2023/06/08/herzien-besluit-wob-verzoek-systeem-risico-indicatie-syri-en-gebruikte-risicomodellen',
    role:'system_level_model_disclosure_without_person_level_join',
    newly_acquired:true
  },
  'NL-SZW-CURRENT-PRIVACY-RIGHTS-ROUTE':{
    authority:'Ministerie van Sociale Zaken en Werkgelegenheid',
    record_type:'official_primary_record',
    date_key:'observed_at',
    date_value:'2026-08-17',
    url:'https://www.rijksoverheid.nl/ministeries/ministerie-van-sociale-zaken-en-werkgelegenheid/organisatie/privacy',
    role:'current_general_privacy_route_without_syRI_fulfillment',
    newly_acquired:true
  }
};
const sources=Array.isArray(acquisition.source_records)?acquisition.source_records:[];
if(!same(sources.map((row)=>row.source_id),SYRI_ACCESS_SOURCE_IDS))fail('source identity or order drift');
if(new Set(sources.map((row)=>row.source_id)).size!==sources.length)fail('duplicate source identity');
for(const source of sources){
  const expected=sourceDefinitions[source.source_id];
  if(!expected)fail(`unexpected source ${source.source_id}`);
  if(source.authority!==expected.authority||source.record_type!==expected.record_type)fail(`${source.source_id} authority or class drift`);
  if(source[expected.date_key]!==expected.date_value||source.url!==expected.url)fail(`${source.source_id} date or URL drift`);
  if(source.source_role!==expected.role||source.newly_acquired!==expected.newly_acquired)fail(`${source.source_id} role drift`);
  if(source.qualifies_as_evidence_access_receipt!==false)fail(`${source.source_id} improperly qualifies as evidence access`);
  let parsed;
  try{parsed=new URL(source.url)}catch{fail(`${source.source_id} URL invalid`)}
  if(parsed.protocol!=='https:'||!expectedHosts.includes(parsed.hostname))fail(`${source.source_id} host boundary drift`);
  if(!Array.isArray(source.locators)||source.locators.length!==3||source.locators.some((row)=>!text(row,95)))fail(`${source.source_id} locator drift`);
  const hashable=clone(source);
  delete hashable.source_sha256;
  if(source.source_sha256!==sha256Json(hashable))fail(`${source.source_id} source custody drift`);
}

const routeDefinitions={
  'NL-SYRI-ACCESS-01':{host:'www.rechtspraak.nl',result_class:'system_level_adjudication_without_subject_access',source_ids:['NL-SYRI-COURT-JUDGMENT-2020']},
  'NL-SYRI-ACCESS-02':{host:'zoek.officielebekendmakingen.nl',result_class:'formal_access_route_only',source_ids:['NL-SYRI-REGISTER-ACCESS-RULE-2014']},
  'NL-SYRI-ACCESS-03':{host:'zoek.officielebekendmakingen.nl',result_class:'destruction_and_no_decision_record',source_ids:['NL-SYRI-DATA-DESTRUCTION-ANSWERS-2022']},
  'NL-SYRI-ACCESS-04':{host:'www.rijksoverheid.nl',result_class:'system_level_model_disclosure',source_ids:['NL-SYRI-RISK-MODEL-WOB-2023']},
  'NL-SYRI-ACCESS-05':{host:'www.rijksoverheid.nl',result_class:'current_general_access_route',source_ids:['NL-SZW-CURRENT-PRIVACY-RIGHTS-ROUTE']},
  'NL-SYRI-ACCESS-06':{host:'www.autoriteitpersoonsgegevens.nl',result_class:'no_qualifying_subject_file_located',source_ids:[]}
};
const routes=Array.isArray(acquisition.route_ledger)?acquisition.route_ledger:[];
if(!same(routes.map((row)=>row.route_id),SYRI_ACCESS_ROUTE_IDS))fail('route identity or order drift');
if(new Set(routes.map((row)=>row.route_id)).size!==routes.length)fail('duplicate route identity');
for(const route of routes){
  const expected=routeDefinitions[route.route_id];
  if(!expected)fail(`unexpected route ${route.route_id}`);
  if(route.host!==expected.host||route.result_class!==expected.result_class||!same(route.observed_source_ids,expected.source_ids))fail(`${route.route_id} route state drift`);
  if(route.qualifying_receipt_found!==false)fail(`${route.route_id} improperly qualifies a receipt`);
  if(!text(route.surface,25)||!text(route.preserved_reason,100))fail(`${route.route_id} route description drift`);
  const hashable=clone(route);
  delete hashable.route_sha256;
  if(route.route_sha256!==sha256Json(hashable))fail(`${route.route_id} route custody drift`);
}

const expectedObservedState={
  system_level_judicial_invalidation_observed:true,
  historical_register_access_route_observed:true,
  system_level_risk_model_disclosure_observed:true,
  current_general_privacy_access_route_observed:true,
  all_syRI_data_reported_destroyed:true,
  syRI_based_decisions_reported:false,
  fulfilled_subject_access_request_located:false,
  identified_subject_inputs_disclosed:false,
  risk_indication_disclosed_to_subject:false,
  reasoning_disclosed_to_subject:false,
  recipients_disclosed_to_subject:false,
  correction_or_contest_outcome_located:false,
  evidence_access_supported:false
};
if(!same(acquisition.observed_state,expectedObservedState))fail('observed state drift');

const summary=summarizeSyriSubjectAccessPublicRecordAcquisition(
  acquisition,
  frontier,
  gapLedger,
  packet
);
if(JSON.stringify(acquisition)!==acquisitionBefore||JSON.stringify(frontier)!==frontierBefore||JSON.stringify(gapLedger)!==gapLedgerBefore||JSON.stringify(packet)!==packetBefore)fail('summary mutated a source object');

const computedFinding={
  finding_class:'formal_and_system_level_access_material_without_person_level_fulfillment',
  source_records:summary.source_records,
  new_source_records:summary.new_source_records,
  routes_executed:summary.routes_executed,
  routes_with_substantive_content:summary.routes_with_substantive_content,
  routes_with_qualifying_receipt:summary.routes_with_qualifying_receipt,
  qualifying_evidence_access_receipts:summary.qualifying_evidence_access_receipts,
  deficits_closed:summary.deficits_closed,
  deficits_preserved:summary.deficits_preserved,
  answer_changes_authorized:summary.answer_changes_authorized,
  repository_effect:summary.repository_effect,
  graph_effect:summary.graph_effect,
  issue_345_may_close:false
};
if(!same(acquisition.finding,computedFinding))fail('finding ledger drift');

const computedExpected={
  source_records:summary.source_records,
  new_source_records:summary.new_source_records,
  routes_executed:summary.routes_executed,
  routes_with_substantive_content:summary.routes_with_substantive_content,
  routes_with_qualifying_receipt:summary.routes_with_qualifying_receipt,
  qualifying_evidence_access_receipts:summary.qualifying_evidence_access_receipts,
  syri_evidence_access:summary.syri_evidence_access,
  syri_composed_durable_answer:summary.syri_composed_durable_answer,
  candidate_evidence_records:summary.candidate_evidence_records,
  repository_promotions:summary.repository_promotions,
  advanced_answer_dimensions:summary.advanced_answer_dimensions,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(acquisition.expected_result,computedExpected))fail('expected result drift');
if(!same(acquisition.finding.deficits_preserved,['composed_durable_answer','dimension:evidence_access'])||acquisition.finding.deficits_closed.length!==0)fail('deficit ledger drift');
if(acquisition.finding.answer_changes_authorized!==false||acquisition.finding.repository_effect!=='repository_content_only'||acquisition.finding.graph_effect!=='none')fail('repository effect drift');

const boundaries=acquisition.boundaries||{};
for(const key of [
  'creates_new_empirical_answer_receipt',
  'claims_fulfilled_subject_access',
  'claims_person_level_inputs_disclosed',
  'claims_risk_indication_disclosed',
  'claims_reasoning_disclosed',
  'claims_recipients_disclosed',
  'claims_correction_or_contest_outcome',
  'claims_search_exhaustiveness',
  'claims_current_public_nonexistence',
  'formal_access_route_is_fulfilled_access',
  'data_destruction_is_subject_level_explanation',
  'system_level_model_disclosure_is_person_level_join',
  'changes_syRI_evidence_access',
  'changes_any_other_answer_dimension',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='none'||boundaries.graph_effect!=='none')fail('promotion boundary drift');
if(!Array.isArray(acquisition.next_receipts)||acquisition.next_receipts.length!==3||acquisition.next_receipts.some((row)=>!text(row,120)))fail('next-receipt ledger drift');
if(!text(acquisition.scope_note,450))fail('scope note under-specified');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-syri-subject-access-public-record-acquisition',
  ...computedExpected
},null,2));
