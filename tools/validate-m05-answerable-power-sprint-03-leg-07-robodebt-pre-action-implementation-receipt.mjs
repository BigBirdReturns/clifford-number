#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  evaluateObservation
} from './lib/m05-source-health-evidence-state-regression.mjs';
import {
  validateOfficialReceiptCandidates
} from './lib/m05-cross-domain-official-receipt-candidates.mjs';
import {
  summarizeClaimEvidencePromotionAdjudication
} from './lib/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';
import {
  ROBODEBT_IMPLEMENTATION_RECEIPT_ID,
  ROBODEBT_IMPLEMENTATION_DOMAIN_ID,
  ROBODEBT_IMPLEMENTATION_JURISDICTION,
  ROBODEBT_IMPLEMENTATION_DIMENSION,
  summarizeRobodebtPreActionImplementationReceipt
} from './lib/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const receiptPath=resolvePath(
  'M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
);
const promotionPath=resolvePath(
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
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const clone=(value)=>JSON.parse(JSON.stringify(value));
const fail=(message)=>{throw new Error(message)};

const receipt=readJson(receiptPath);
const packetRaw=readRaw(packetPath);
const packet=JSON.parse(packetRaw.toString('utf8'));
const promotionRaw=readRaw(promotionPath);
const promotion=JSON.parse(promotionRaw.toString('utf8'));
const contractRaw=readRaw(contractPath);
const contract=JSON.parse(contractRaw.toString('utf8'));
const packetBefore=JSON.stringify(packet);
const promotionBefore=JSON.stringify(promotion);
const contractBefore=JSON.stringify(contract);

if(receipt.schema_version!=='m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt@1')fail('implementation receipt schema drift');
if(receipt.object_class!=='bounded_answer_dimension_implementation_receipt')fail('implementation receipt object class drift');
if(receipt.program_id!=='M-05'||receipt.sprint_id!=='M05-SPRINT-03'||receipt.leg_id!=='S03-L7')fail('implementation receipt program binding drift');
if(receipt.issue!==345)fail('implementation receipt issue identity drift');
if(receipt.as_of!=='2026-08-16')fail('implementation receipt as-of drift');
if(receipt.status!=='robodebt_pre_action_implementation_receipt_frozen')fail('implementation receipt status drift');
if(!text(receipt.title,30)||!text(receipt.question,100))fail('implementation receipt title or question is under-specified');

if(receipt.canonical_base?.branch!=='main')fail('canonical branch drift');
if(receipt.canonical_base?.sha!=='49d1f3617132248484647eca4ddfa4fa49db40fb')fail('canonical base drift');
if(receipt.canonical_base?.tree_sha!=='c715de12ddc83354b8f957345e368487e7ee16c6')fail('canonical tree drift');

const packetBinding=receipt.source_candidate_packet||{};
if(packetBinding.path!=='data/project/m05-cross-domain-official-receipt-candidates.json')fail('source packet path drift');
if(packetBinding.blob_sha!=='1c17549a39b826853435d3726596bf41d0fc7de9')fail('source packet declared blob drift');
if(gitBlobSha(packetRaw)!==packetBinding.blob_sha)fail('source packet Git object drift');
if(packetBinding.schema_version!=='m05-cross-domain-official-receipt-candidates@1')fail('source packet schema drift');
if(packetBinding.pull_request!==2151||packetBinding.merge_commit!=='204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0')fail('source packet publication drift');

const promotionBinding=receipt.promotion_adjudication||{};
if(promotionBinding.path!=='data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json')fail('promotion path drift');
if(promotionBinding.blob_sha!=='e64f24fb74094b99e717c2cd03af8e0620d23f15')fail('promotion declared blob drift');
if(gitBlobSha(promotionRaw)!==promotionBinding.blob_sha)fail('promotion Git object drift');
if(promotionBinding.schema_version!=='m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1')fail('promotion schema drift');
if(promotionBinding.pull_request!==2153||promotionBinding.merge_commit!=='49d1f3617132248484647eca4ddfa4fa49db40fb')fail('promotion publication drift');

const contractBinding=receipt.evidence_state_contract||{};
if(contractBinding.path!=='data/project/m05-source-health-evidence-state-regression.json')fail('evidence-state path drift');
if(contractBinding.blob_sha!=='72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33')fail('evidence-state declared blob drift');
if(gitBlobSha(contractRaw)!==contractBinding.blob_sha)fail('evidence-state Git object drift');
if(contractBinding.schema_version!=='m05-source-health-evidence-state-regression@1')fail('evidence-state schema drift');
if(contractBinding.minimum_domains!==3||contractBinding.minimum_jurisdictions!==2)fail('evidence-state denominator drift');

const packetErrors=validateOfficialReceiptCandidates(packet,contract);
if(packetErrors.length>0)fail(`source packet invalid: ${packetErrors.join('; ')}`);

const promotionSummary=summarizeClaimEvidencePromotionAdjudication(packet,promotion,contract);
if(promotionSummary.claim_evidence_admissible!==3)fail('promotion baseline claim-evidence denominator drift');
if(promotionSummary.repository_promotion_allowed!==3)fail('promotion baseline repository denominator drift');
if(promotionSummary.effective_answers!==0)fail('promotion baseline answer denominator drift');
if(promotionSummary.cross_domain_regression_completed!==false)fail('promotion baseline cross-domain state drift');

const target=receipt.target||{};
if(target.receipt_id!==ROBODEBT_IMPLEMENTATION_RECEIPT_ID)fail('target receipt identity drift');
if(target.domain_id!==ROBODEBT_IMPLEMENTATION_DOMAIN_ID)fail('target domain identity drift');
if(target.jurisdiction!==ROBODEBT_IMPLEMENTATION_JURISDICTION)fail('target jurisdiction drift');
if(target.dimension!==ROBODEBT_IMPLEMENTATION_DIMENSION)fail('target dimension drift');
if(target.before!==false||target.after!==true)fail('target transition drift');

if(!same(receipt.existing_source_bindings,[
  'AU-ROBODEBT-RC-REPORT',
  'AU-ROBODEBT-ADVOCATES-CHANNEL'
]))fail('existing source binding drift');

const sourceIds=[
  'AU-ROBODEBT-RC-REC-18-1',
  'AU-ROBODEBT-SA-IMPLEMENTATION-2024',
  'AU-ARC-IMPLEMENTATION-STATEMENT-2026'
];
const sourceRoles=[
  'normative_requirement',
  'implementation_observation',
  'durability_support'
];
const sourceHosts={
  'AU-ROBODEBT-RC-REC-18-1':'robodebt.royalcommission.gov.au',
  'AU-ROBODEBT-SA-IMPLEMENTATION-2024':'ministers.dss.gov.au',
  'AU-ARC-IMPLEMENTATION-STATEMENT-2026':'www.ag.gov.au'
};
const sourceDates={
  'AU-ROBODEBT-RC-REC-18-1':'2023-07-07',
  'AU-ROBODEBT-SA-IMPLEMENTATION-2024':'2024-12-09',
  'AU-ARC-IMPLEMENTATION-STATEMENT-2026':'2026-06-23'
};
const sources=Array.isArray(receipt.implementation_sources)?receipt.implementation_sources:[];
if(sources.length!==3)fail('implementation source denominator drift');
if(!same(sources.map((row)=>row.source_id),sourceIds))fail('implementation source identity or order drift');
if(new Set(sourceIds).size!==sourceIds.length)fail('duplicate implementation source identity');
if(!same(sources.map((row)=>row.evidence_role),sourceRoles))fail('implementation source role drift');
for(const source of sources){
  if(!text(source.authority,20))fail(`${source.source_id} authority is under-specified`);
  if(source.record_type!=='official_primary_record')fail(`${source.source_id} source class drift`);
  if(source.published_at!==sourceDates[source.source_id])fail(`${source.source_id} publication date drift`);
  let parsed=null;
  try{parsed=new URL(source.url)}catch{}
  if(!parsed||parsed.protocol!=='https:')fail(`${source.source_id} URL must use HTTPS`);
  if(parsed.hostname!==sourceHosts[source.source_id])fail(`${source.source_id} escaped official host boundary`);
  if(!Array.isArray(source.locator)||source.locator.length<3)fail(`${source.source_id} locator denominator is incomplete`);
  for(const locator of source.locator){
    if(!text(locator,60))fail(`${source.source_id} contains an under-specified locator`);
  }
}

const inference=receipt.implementation_inference||{};
if(inference.inference_class!=='bounded_official_implementation_inference')fail('implementation inference class drift');
if(!text(inference.basis,250))fail('implementation inference basis is under-specified');
if(inference.pre_action_timing_supported!==true)fail('pre-action support removed');
if(inference.durability_supported!==false)fail('durability overclaim');
for(const key of [
  'direct_independent_assurance_result_published',
  'public_annual_review_result_published',
  'subject_level_pre_action_case_receipt_present'
]){
  if(inference[key]!==false)fail(`implementation inference overclaim: ${key}`);
}
if(!text(inference.counterevidence,150))fail('implementation counterevidence is under-specified');

const dimension=receipt.dimension_adjudication||{};
if(dimension.authorized_dimension!==ROBODEBT_IMPLEMENTATION_DIMENSION)fail('authorized dimension drift');
if(dimension.before!==false||dimension.after!==true)fail('authorized dimension transition drift');
if(dimension.authorized_answer_scope!=='one dimension on the exact Robodebt candidate only')fail('authorized answer scope drift');
for(const key of [
  'changes_claim_text',
  'changes_evidence_scope',
  'changes_source_health_state',
  'changes_observed_outcome',
  'changes_other_answer_dimensions',
  'claims_answer_effectiveness'
]){
  if(dimension[key]!==false)fail(`dimension adjudication boundary ${key} weakened`);
}
if(!same(receipt.retained_deficits,[
  'composed_durable_answer',
  'dimension:durability'
]))fail('retained deficit ledger drift');

const summary=summarizeRobodebtPreActionImplementationReceipt(
  packet,
  promotion,
  receipt,
  contract
);
if(JSON.stringify(packet)!==packetBefore)fail('implementation application mutated the source packet');
if(JSON.stringify(promotion)!==promotionBefore)fail('implementation application mutated the promotion adjudication');
if(JSON.stringify(contract)!==contractBefore)fail('implementation application mutated the evidence-state contract');

const before=summary.applied.before_observation;
const after=summary.applied.after_observation;
if(before.domain_id!==ROBODEBT_IMPLEMENTATION_DOMAIN_ID||after.domain_id!==ROBODEBT_IMPLEMENTATION_DOMAIN_ID)fail('implementation output domain drift');
if(before.answer.dimensions.pre_action_timing!==false)fail('implementation baseline pre-action state drift');
if(after.answer.dimensions.pre_action_timing!==true)fail('implementation pre-action transition did not open');
if(after.answer.dimensions.durability!==false)fail('implementation receipt improperly opened durability');
if(after.answer.composed_durable_answer!==false)fail('implementation receipt improperly opened composed answer');
if(before.evidence.promotion_authority!==true||after.evidence.promotion_authority!==true)fail('implementation receipt disturbed promotion authority');
if(before.evidence.promotion_ceiling!=='claim_evidence'||after.evidence.promotion_ceiling!=='claim_evidence')fail('implementation receipt disturbed claim-evidence ceiling');
if(before.promotes_to!=='candidate_evidence'||after.promotes_to!=='candidate_evidence')fail('implementation receipt disturbed repository promotion');

const normalizeTarget=(value)=>{
  const normalized=clone(value);
  delete normalized.expected;
  normalized.answer.dimensions.pre_action_timing='__authorized_dimension__';
  return normalized;
};
if(!same(normalizeTarget(before),normalizeTarget(after)))fail('implementation receipt changed fields outside the authorized dimension');
if(!same(before.evidence,after.evidence))fail('implementation receipt changed evidence state');
if(!same(before.source_health,after.source_health))fail('implementation receipt changed source-health state');
if(before.answer.observed_outcome!==after.answer.observed_outcome)fail('implementation receipt changed observed outcome');

const targetEvaluation=evaluateObservation(after,contract);
if(targetEvaluation.claim_evidence_admissible!==true)fail('Robodebt claim evidence admission regressed');
if(targetEvaluation.repository_promotion_allowed!==true)fail('Robodebt repository promotion regressed');
if(targetEvaluation.answer_effective!==false)fail('Robodebt implementation receipt escaped answer-effectiveness boundary');
if(!targetEvaluation.answer_failures.includes('composed_durable_answer'))fail('composed-answer deficit disappeared');
if(!targetEvaluation.answer_failures.includes('dimension:durability'))fail('durability deficit disappeared');
if(targetEvaluation.answer_failures.includes('dimension:pre_action_timing'))fail('pre-action deficit remained after authorized transition');

const baselineDomains=promotionSummary.applied.derived_contract.domain_observations;
const derivedDomains=summary.applied.derived_contract.domain_observations;
if(baselineDomains.length!==5||derivedDomains.length!==5)fail('five-domain denominator drift');
for(let index=0;index<derivedDomains.length;index+=1){
  if(derivedDomains[index].domain_id===ROBODEBT_IMPLEMENTATION_DOMAIN_ID)continue;
  if(!same(derivedDomains[index],baselineDomains[index]))fail(`${derivedDomains[index].domain_id} changed outside Robodebt transition`);
}

if(summary.regression.source_health_healthy!==true)fail('source-health receipt drift');
if(summary.regression.domain_observations_evaluated!==5)fail('domain denominator drift');
if(summary.regression.admissible_domain_evidence_records!==3)fail('admissible evidence denominator drift');
if(summary.regression.effective_domain_answers!==0)fail('effective answer denominator drift');
if(summary.regression.evidentiary_sufficiency!==true)fail('claim-scoped evidentiary sufficiency regressed');
if(summary.regression.answer_effectiveness!==false)fail('answer effectiveness improperly opened');
if(summary.regression.cross_domain_regression_completed!==false)fail('cross-domain regression improperly completed');

const computed={
  audited_domains:summary.audited_domains,
  adjudicated_receipts:summary.adjudicated_receipts,
  claim_evidence_admissible:summary.claim_evidence_admissible,
  repository_promotion_allowed:summary.repository_promotion_allowed,
  advanced_answer_dimensions:summary.advanced_answer_dimensions,
  robodebt_pre_action_timing:summary.robodebt_pre_action_timing,
  robodebt_durability:summary.robodebt_durability,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  evidentiary_sufficiency:summary.evidentiary_sufficiency,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(computed,receipt.expected_result))fail('expected implementation result drift');

const boundaries=receipt.boundaries||{};
for(const key of [
  'changes_original_candidate_packet',
  'changes_promotion_adjudication',
  'changes_evidence_state_contract',
  'changes_claim_text',
  'claims_independent_assurance_result',
  'claims_public_annual_review_result',
  'claims_subject_level_pre_action_case',
  'claims_durability',
  'claims_composed_durable_answer',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`implementation boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='candidate_answer_dimension'||boundaries.graph_effect!=='none')fail('implementation repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt',
  ...computed
},null,2));
