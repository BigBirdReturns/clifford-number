#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  IMPLEMENTATION_GAP_PROBE_IDS,
  IMPLEMENTATION_GAP_RECEIPT_IDS,
  IMPLEMENTATION_GAP_DOMAIN_IDS,
  IMPLEMENTATION_GAP_JURISDICTIONS,
  summarizeImplementationGapProbeLedger
} from './lib/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const ledgerPath=resolvePath(
  'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
);
const adjudicationPath=resolvePath(
  'M05_CLAIM_PROMOTION_ADJUDICATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const contractPath=resolvePath(
  'M05_EVIDENCE_STATE_CONTRACT_PATH',
  'data/project/m05-source-health-evidence-state-regression.json'
);
const readRaw=(target)=>fs.readFileSync(target);
const readJson=(target)=>JSON.parse(readRaw(target).toString('utf8'));
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const sorted=(values)=>[...values].sort();
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const clone=(value)=>JSON.parse(JSON.stringify(value));
const sha256Json=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(message)=>{throw new Error(message)};

const ledger=readJson(ledgerPath);
const packetRaw=readRaw(packetPath);
const packet=JSON.parse(packetRaw.toString('utf8'));
const adjudicationRaw=readRaw(adjudicationPath);
const adjudication=JSON.parse(adjudicationRaw.toString('utf8'));
const contractRaw=readRaw(contractPath);
const contract=JSON.parse(contractRaw.toString('utf8'));
const packetBefore=JSON.stringify(packet);
const adjudicationBefore=JSON.stringify(adjudication);
const contractBefore=JSON.stringify(contract);

if(ledger.schema_version!=='m05-answerable-power-s03-l7-implementation-gap-probe-ledger@1')fail('probe-ledger schema drift');
if(ledger.object_class!=='bounded_implementation_gap_probe_ledger')fail('probe-ledger object class drift');
if(ledger.program_id!=='M-05'||ledger.sprint_id!=='M05-SPRINT-03'||ledger.leg_id!=='S03-L7')fail('probe-ledger program binding drift');
if(ledger.issue!==345)fail('probe-ledger issue identity drift');
if(ledger.as_of!=='2026-08-16')fail('probe-ledger as-of drift');
if(ledger.status!=='implementation_gaps_researched_no_answer_promotion')fail('probe-ledger status drift');
if(!text(ledger.title,40)||!text(ledger.question,140))fail('probe-ledger title or question is under-specified');

if(ledger.canonical_base?.branch!=='main')fail('canonical branch drift');
if(ledger.canonical_base?.sha!=='49d1f3617132248484647eca4ddfa4fa49db40fb')fail('canonical base drift');
if(ledger.canonical_base?.tree_sha!=='c715de12ddc83354b8f957345e368487e7ee16c6')fail('canonical tree drift');

const packetBinding=ledger.source_candidate_packet||{};
if(packetBinding.path!=='data/project/m05-cross-domain-official-receipt-candidates.json')fail('source packet path drift');
if(packetBinding.blob_sha!=='1c17549a39b826853435d3726596bf41d0fc7de9')fail('source packet declared blob drift');
if(gitBlobSha(packetRaw)!==packetBinding.blob_sha)fail('source packet Git object drift');
if(packetBinding.schema_version!=='m05-cross-domain-official-receipt-candidates@1')fail('source packet schema drift');
if(packetBinding.pull_request!==2151||packetBinding.merge_commit!=='204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0')fail('source packet publication drift');

const adjudicationBinding=ledger.claim_promotion_adjudication||{};
if(adjudicationBinding.path!=='data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json')fail('claim-promotion path drift');
if(adjudicationBinding.blob_sha!=='e64f24fb74094b99e717c2cd03af8e0620d23f15')fail('claim-promotion declared blob drift');
if(gitBlobSha(adjudicationRaw)!==adjudicationBinding.blob_sha)fail('claim-promotion Git object drift');
if(adjudicationBinding.schema_version!=='m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1')fail('claim-promotion schema drift');
if(adjudicationBinding.pull_request!==2153||adjudicationBinding.merge_commit!=='49d1f3617132248484647eca4ddfa4fa49db40fb')fail('claim-promotion publication drift');

const contractBinding=ledger.evidence_state_contract||{};
if(contractBinding.path!=='data/project/m05-source-health-evidence-state-regression.json')fail('evidence-state path drift');
if(contractBinding.blob_sha!=='72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33')fail('evidence-state declared blob drift');
if(gitBlobSha(contractRaw)!==contractBinding.blob_sha)fail('evidence-state Git object drift');
if(contractBinding.schema_version!=='m05-source-health-evidence-state-regression@1')fail('evidence-state schema drift');

const expectedByProbe={
  'M05-IP-ADMIN-AU-ROBODEBT-PRE-ACTION-DURABILITY':{
    receipt_id:'M05-RC-ADMIN-AU-ROBODEBT',
    domain_id:'APC-ADMIN-01',
    jurisdiction:'AU',
    issue_comment_id:5311303325,
    finding_class:'partial_implementation_receipts_deficits_remain_open',
    target_deficits:['composed_durable_answer','dimension:pre_action_timing','dimension:durability'],
    allowed_hosts:['www.servicesaustralia.gov.au','formerministers.dss.gov.au','ministers.dss.gov.au','www.ombudsman.gov.au'],
    source_ids:[
      'AU-ROBODEBT-REVIEW-PAUSE-INSTRUCTIONS',
      'AU-ROBODEBT-IMPLEMENTATION-2024',
      'AU-ROBODEBT-WAIVER-2025',
      'AU-ROBODEBT-DEBT-SUPPORT-2026',
      'AU-ROBODEBT-OMBUDSMAN-ADJACENT-CASE'
    ],
    observed_state:{
      current_agency_review_route:true,
      requestable_repayment_pause:true,
      automatic_stay_before_recovery:false,
      observed_pause_entered_before_collection:false,
      published_annual_review_result:false,
      published_independent_assurance_result:false,
      longitudinal_nonrecurrence_denominator:false
    }
  },
  'M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS':{
    receipt_id:'M05-RC-COERCION-NL-SYRI',
    domain_id:'APC-COERCION-01',
    jurisdiction:'NL',
    issue_comment_id:5311266093,
    finding_class:'formal_access_route_without_fulfillment_event',
    target_deficits:['composed_durable_answer','dimension:evidence_access'],
    allowed_hosts:['zoek.officielebekendmakingen.nl'],
    source_ids:[
      'NL-SYRI-ACCESS-MEMORANDUM',
      'NL-SYRI-RISK-REGISTER-DECREE',
      'NL-SYRI-DATA-DESTRUCTION-ANSWER'
    ],
    observed_state:{
      formal_access_and_correction_route:true,
      queryable_risk_report_register:true,
      named_requester:false,
      granted_subject_access_response:false,
      disclosed_inputs_or_risk_indication:false,
      disclosed_reasoning_or_recipients:false,
      observed_correction_or_contest_outcome:false,
      later_data_destruction:true
    }
  },
  'M05-IP-WORK-IT-FOODINHO-PRE-ACTION-DURABILITY':{
    receipt_id:'M05-RC-WORK-IT-FOODINHO',
    domain_id:'APC-WORK-01',
    jurisdiction:'IT',
    issue_comment_id:5311308897,
    finding_class:'supervised_implementation_timetable_without_verified_compliance',
    target_deficits:['composed_durable_answer','dimension:pre_action_timing','dimension:durability'],
    allowed_hosts:['www.garanteprivacy.it','garanteprivacy.it'],
    source_ids:[
      'IT-FOODINHO-2021-ORDER-RELEASE',
      'IT-FOODINHO-2024-ORDER',
      'IT-FOODINHO-2024-ORDER-RELEASE',
      'IT-FOODINHO-2024-EXTENSION'
    ],
    observed_state:{
      binding_corrective_orders:true,
      recurrent_violations_after_prior_order:true,
      no_appeal_and_compliance_intention_recorded:true,
      extended_implementation_timetable:true,
      documented_implementation_response_required:true,
      published_foodinho_specific_closure_finding:false,
      independent_technical_compliance_audit:false,
      rider_level_human_review_outcome:false,
      recurrence_free_post_change_denominator:false
    }
  }
};

const expectedSourceRecordSha256={
  "AU-ROBODEBT-REVIEW-PAUSE-INSTRUCTIONS": "0714b61fc1a5331566339a2280242c04f6e1d81f6db17e00f5a5b37e7a21984e",
  "AU-ROBODEBT-IMPLEMENTATION-2024": "0aec32b1ca95fb59ca7fd2535ce162d0890d4c38e888ef2c57726e23a75d5d1c",
  "AU-ROBODEBT-WAIVER-2025": "a5bc44a839a5f51205407a7a07a740f52425e3ac43e364f7fdfe7cf2794914bd",
  "AU-ROBODEBT-DEBT-SUPPORT-2026": "b08ff9ac822c3ffd19647bd79980a581591e751636a145a9ccb177859dee88d9",
  "AU-ROBODEBT-OMBUDSMAN-ADJACENT-CASE": "0fb6ffb6b2a8d5f426ee829586c476ee974bb29ffaefac245a75088688fa064e",
  "NL-SYRI-ACCESS-MEMORANDUM": "3f7b689dcfae4cd2f19786c90faa25b37837fe999d5ed36723faba5c910ac36b",
  "NL-SYRI-RISK-REGISTER-DECREE": "6c2348d22e4d2c26a3f56b8a85fe13afc6bc0439b9c6f87109a11a84d4d72965",
  "NL-SYRI-DATA-DESTRUCTION-ANSWER": "7d6578d7a58ee1a5f134088111b081d9bba38634a5ccb2aec4ee0f2086592f8b",
  "IT-FOODINHO-2021-ORDER-RELEASE": "4aed521aa125199a3f8d8998dab7e1aa48eba3a7ab48ca13660ebdbc77450508",
  "IT-FOODINHO-2024-ORDER": "e3c135ebd4a83d5ee4e84cd480c724e49623e169f5b08c1daf4f8d314697dd51",
  "IT-FOODINHO-2024-ORDER-RELEASE": "b5bcc8952bd478b9a9c1640b85f322424ef01becd2e2b2d1b02a60dbedfc071c",
  "IT-FOODINHO-2024-EXTENSION": "34fc645f03edd12bfa16027ef109de217544627e990b030010fee846ca300c62"
};

const probes=Array.isArray(ledger.probes)?ledger.probes:[];
if(ledger.probe_count!==3||probes.length!==3)fail('probe denominator drift');
if(!same(probes.map((row)=>row.probe_id),IMPLEMENTATION_GAP_PROBE_IDS))fail('probe identity or order drift');
if(!same(probes.map((row)=>row.receipt_id),IMPLEMENTATION_GAP_RECEIPT_IDS))fail('receipt identity or order drift');
if(!same(probes.map((row)=>row.domain_id),IMPLEMENTATION_GAP_DOMAIN_IDS))fail('domain identity or order drift');
if(!same(probes.map((row)=>row.jurisdiction),IMPLEMENTATION_GAP_JURISDICTIONS))fail('jurisdiction identity or order drift');
if(new Set(probes.map((row)=>row.probe_id)).size!==probes.length)fail('duplicate probe identity');

const packetByReceipt=new Map(packet.records.map((row)=>[row.receipt_id,row]));
const decisionsByReceipt=new Map(adjudication.adjudications.map((row)=>[row.receipt_id,row]));
const sourceIds=new Set();
const allowedRecordTypes=new Set(['official_primary_record','official_adjudicative_record','source_native_primary_record']);
const allowedRoles=new Set(['supports_partial_implementation','preserves_counterevidence','supports_negative_finding']);

for(const probe of probes){
  const expected=expectedByProbe[probe.probe_id];
  if(!expected)fail(`unexpected probe ${probe.probe_id}`);
  if(probe.receipt_id!==expected.receipt_id||probe.domain_id!==expected.domain_id||probe.jurisdiction!==expected.jurisdiction)fail(`${probe.probe_id} identity drift`);
  if(probe.issue_comment_id!==expected.issue_comment_id)fail(`${probe.probe_id} issue-comment binding drift`);
  if(!text(probe.title,30))fail(`${probe.probe_id} title is under-specified`);
  if(!same(probe.target_deficits,expected.target_deficits))fail(`${probe.probe_id} target deficit drift`);
  if(!same(probe.allowed_hosts,expected.allowed_hosts))fail(`${probe.probe_id} host boundary drift`);
  if(!same(probe.observed_state,expected.observed_state))fail(`${probe.probe_id} observed-state drift`);

  const packetRecord=packetByReceipt.get(probe.receipt_id);
  const decision=decisionsByReceipt.get(probe.receipt_id);
  if(!packetRecord||!decision)fail(`${probe.probe_id} lacks source packet or promotion decision`);
  if(packetRecord.domain_id!==probe.domain_id||packetRecord.jurisdiction!==probe.jurisdiction)fail(`${probe.probe_id} source packet identity drift`);
  if(!same(sorted(decision.preserved_deficits),sorted(probe.target_deficits)))fail(`${probe.probe_id} diverges from promoted deficit ledger`);

  const sources=Array.isArray(probe.source_records)?probe.source_records:[];
  if(!same(sources.map((row)=>row.source_id),expected.source_ids))fail(`${probe.probe_id} source-record denominator drift`);
  for(const source of sources){
    if(sourceIds.has(source.source_id))fail(`duplicate source identity ${source.source_id}`);
    sourceIds.add(source.source_id);
    if(!text(source.authority,8))fail(`${source.source_id} authority is under-specified`);
    if(!allowedRecordTypes.has(source.record_type))fail(`${source.source_id} source class is not allowed`);
    if(!allowedRoles.has(source.source_role))fail(`${source.source_id} source role drift`);
    let parsed;
    try{parsed=new URL(source.url)}catch{fail(`${source.source_id} URL is invalid`)}
    if(parsed.protocol!=='https:')fail(`${source.source_id} transport is not HTTPS`);
    if(!probe.allowed_hosts.includes(parsed.hostname))fail(`${source.source_id} escaped the receipt host boundary`);
    if(!Array.isArray(source.locator)||source.locator.length===0||source.locator.some((row)=>!text(row,40)))fail(`${source.source_id} locator is missing or under-specified`);
    const expectedSourceSha=expectedSourceRecordSha256[source.source_id];
    if(!expectedSourceSha||sha256Json(source)!==expectedSourceSha)fail(`${source.source_id} exact source-record binding drift`);
  }

  const result=probe.probe_result||{};
  if(result.finding_class!==expected.finding_class)fail(`${probe.probe_id} finding classification drift`);
  if(!Array.isArray(result.deficits_closed)||result.deficits_closed.length!==0)fail(`${probe.probe_id} improperly closes a deficit`);
  if(!same(result.deficits_preserved,probe.target_deficits))fail(`${probe.probe_id} does not preserve every target deficit`);
  if(result.promotion_changes_authorized!==false||result.answer_changes_authorized!==false)fail(`${probe.probe_id} authorizes a state change`);
  if(result.repository_effect!=='none')fail(`${probe.probe_id} repository effect drift`);
  if(!Array.isArray(result.next_required_receipts)||result.next_required_receipts.length===0||result.next_required_receipts.some((row)=>!text(row,90)))fail(`${probe.probe_id} acquisition frontier is under-specified`);
}

const summary=summarizeImplementationGapProbeLedger(packet,adjudication,contract,ledger);
if(JSON.stringify(packet)!==packetBefore)fail('probe summary mutated the source packet');
if(JSON.stringify(adjudication)!==adjudicationBefore)fail('probe summary mutated the promotion adjudication');
if(JSON.stringify(contract)!==contractBefore)fail('probe summary mutated the evidence-state contract');

const normalizeObservation=(value)=>{
  const normalized=clone(value);
  delete normalized.expected;
  normalized.promotes_to='__promotion_field__';
  normalized.evidence.promotion_authority='__promotion_field__';
  normalized.evidence.promotion_ceiling='__promotion_field__';
  return normalized;
};
for(const row of summary.probes){
  if(!same(normalizeObservation(row.current_observation),normalizeObservation(row.source_observation)))fail(`${row.probe_id} changed substantive observation fields`);
  if(!same(row.current_observation.answer,row.source_observation.answer))fail(`${row.probe_id} changed answer state`);
  if(row.evaluation.claim_evidence_admissible!==true||row.evaluation.repository_promotion_allowed!==true)fail(`${row.probe_id} lost the merged claim promotion`);
  if(row.evaluation.answer_effective!==false)fail(`${row.probe_id} improperly opened answer effectiveness`);
  if(row.deficits_closed.length!==0||!same(row.deficits_preserved,row.target_deficits))fail(`${row.probe_id} summary deficit drift`);
}
if(summary.regression.domain_observations_evaluated!==5)fail('five-domain denominator drift');
if(summary.regression.admissible_domain_evidence_records!==3)fail('claim-evidence denominator drift');
if(summary.regression.effective_domain_answers!==0)fail('effective-answer denominator drift');
if(summary.regression.answer_effectiveness!==false||summary.regression.cross_domain_regression_completed!==false)fail('answer or cross-domain boundary opened');

const computed={
  probe_records:summary.probe_records,
  source_records:summary.source_records,
  deficit_entries_examined:summary.deficit_entries_examined,
  deficit_entries_closed:summary.deficit_entries_closed,
  deficit_entries_preserved:summary.deficit_entries_preserved,
  claim_evidence_admissible:summary.claim_evidence_admissible,
  repository_promotion_allowed:summary.repository_promotion_allowed,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(computed,ledger.expected_result))fail('expected probe-ledger result drift');

const boundaries=ledger.boundaries||{};
for(const key of [
  'changes_source_health_contract',
  'changes_candidate_claims',
  'changes_claim_promotion_authority',
  'closes_any_answer_dimension',
  'claims_source_body_checksums',
  'claims_independent_external_review',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`probe-ledger boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='candidate_only'||boundaries.graph_effect!=='none')fail('probe-ledger repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-implementation-gap-probe-ledger',
  ...computed
},null,2));
