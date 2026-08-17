#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EVIDENCE_BOOLEAN_GATES,
  evaluateObservation
} from './lib/m05-source-health-evidence-state-regression.mjs';
import {
  FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS
} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';
import {
  FIVE_DOMAIN_STATE_REPAIR_RECEIPT_ID,
  FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID,
  FIVE_DOMAIN_STATE_REPAIR_JURISDICTION,
  FIVE_DOMAIN_STATE_REPAIR_DIMENSION,
  summarizeFiveDomainStateCompositionRepair
} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-state-composition-repair.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const repairPath=resolvePath(
  'M05_FIVE_DOMAIN_STATE_COMPOSITION_REPAIR_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-state-composition-repair.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
);
const priorPath=resolvePath(
  'M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const contractPath=resolvePath(
  'M05_EVIDENCE_STATE_CONTRACT_PATH',
  'data/project/m05-source-health-evidence-state-regression.json'
);
const robodebtPath=resolvePath(
  'M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
);
const fiveDomainPath=resolvePath(
  'M05_FIVE_DOMAIN_RECONCILIATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'
);
const intelPath=resolvePath(
  'M05_INTEL_RECEIPT_CANDIDATE_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
);
const hfuPath=resolvePath(
  'M05_HFU_RECEIPT_CANDIDATE_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'
);

const readRaw=(target)=>fs.readFileSync(target);
const readJson=(target)=>JSON.parse(readRaw(target).toString('utf8'));
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const clone=(value)=>JSON.parse(JSON.stringify(value));
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const fail=(message)=>{throw new Error(message)};
const observationForDomain=(contract,domainId)=>
  contract.domain_observations.find((row)=>row.domain_id===domainId);

const repair=readJson(repairPath);
const packetRaw=readRaw(packetPath);
const packet=JSON.parse(packetRaw.toString('utf8'));
const priorRaw=readRaw(priorPath);
const priorAdjudication=JSON.parse(priorRaw.toString('utf8'));
const contractRaw=readRaw(contractPath);
const contract=JSON.parse(contractRaw.toString('utf8'));
const robodebtRaw=readRaw(robodebtPath);
const robodebtImplementationReceipt=JSON.parse(robodebtRaw.toString('utf8'));
const fiveDomainRaw=readRaw(fiveDomainPath);
const fiveDomainReconciliation=JSON.parse(fiveDomainRaw.toString('utf8'));
const intelRaw=readRaw(intelPath);
const intelCandidate=JSON.parse(intelRaw.toString('utf8'));
const hfuRaw=readRaw(hfuPath);
const hfuCandidate=JSON.parse(hfuRaw.toString('utf8'));
const sourceObjects=[
  packet,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  fiveDomainReconciliation,
  intelCandidate,
  hfuCandidate
];
const sourceSnapshots=sourceObjects.map((value)=>JSON.stringify(value));

if(repair.schema_version!=='m05-answerable-power-s03-l7-five-domain-state-composition-repair@1')fail('state composition repair schema drift');
if(repair.object_class!=='bounded_cross_domain_state_composition_repair')fail('state composition repair object class drift');
if(repair.program_id!=='M-05'||repair.sprint_id!=='M05-SPRINT-03'||repair.leg_id!=='S03-L7')fail('state composition repair program binding drift');
if(repair.issue!==345)fail('state composition repair issue identity drift');
if(repair.as_of!=='2026-08-17')fail('state composition repair as-of drift');
if(repair.status!=='five_domain_state_composition_repair_frozen')fail('state composition repair status drift');
if(!text(repair.title,50)||!text(repair.question,180))fail('state composition repair title or question is under-specified');

if(repair.canonical_base?.branch!=='main')fail('canonical branch drift');
if(repair.canonical_base?.sha!=='f67ea1abd09f18f5e02dd1f8b34887a1f863aa0e')fail('canonical base drift');
if(repair.canonical_base?.tree_sha!=='a2710a47a87241160c3692932348712fdb599446')fail('canonical tree drift');
if(repair.canonical_base?.merge_pull_request!==2161)fail('canonical merge binding drift');

const bindings=repair.bindings||{};
const bindingChecks=[
  ['official_receipt_packet',bindings.official_receipt_packet,packetRaw,'data/project/m05-cross-domain-official-receipt-candidates.json','1c17549a39b826853435d3726596bf41d0fc7de9','m05-cross-domain-official-receipt-candidates@1',2151,'204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0'],
  ['prior_promotion_adjudication',bindings.prior_promotion_adjudication,priorRaw,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json','e64f24fb74094b99e717c2cd03af8e0620d23f15','m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1',2153,'49d1f3617132248484647eca4ddfa4fa49db40fb'],
  ['robodebt_pre_action_implementation_receipt',bindings.robodebt_pre_action_implementation_receipt,robodebtRaw,'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json','a31d7ea7a1432a169de31035c153210b8975e217','m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt@1',2155,'3e9132f1628fe96989b931f56a302bf69907ef99'],
  ['five_domain_reconciliation',bindings.five_domain_reconciliation,fiveDomainRaw,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json','f2784666aa55fcf92d4523ee01765f1b623fcb35','m05-answerable-power-s03-l7-five-domain-claim-evidence-reconciliation@1',2161,'f67ea1abd09f18f5e02dd1f8b34887a1f863aa0e']
];
for(const [label,binding,raw,expectedPath,expectedSha,expectedSchema,expectedPr,expectedMerge] of bindingChecks){
  if(binding?.path!==expectedPath)fail(`${label} path drift`);
  if(binding?.blob_sha!==expectedSha)fail(`${label} declared blob drift`);
  if(gitBlobSha(raw)!==expectedSha)fail(`${label} Git object drift`);
  if(binding?.schema_version!==expectedSchema)fail(`${label} schema binding drift`);
  if(binding?.pull_request!==expectedPr||binding?.merge_commit!==expectedMerge)fail(`${label} publication binding drift`);
}

const contractBinding=bindings.evidence_state_contract||{};
if(contractBinding.path!=='data/project/m05-source-health-evidence-state-regression.json')fail('evidence-state contract path drift');
if(contractBinding.blob_sha!=='72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33')fail('evidence-state declared blob drift');
if(gitBlobSha(contractRaw)!==contractBinding.blob_sha)fail('evidence-state Git object drift');
if(contractBinding.schema_version!=='m05-source-health-evidence-state-regression@1')fail('evidence-state schema binding drift');
if(contractBinding.minimum_domains!==3||contractBinding.minimum_jurisdictions!==2)fail('evidence-state denominator drift');

const candidateBindings=[
  ['intel_receipt_candidate',bindings.intel_receipt_candidate,intelRaw,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json','ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a','m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1'],
  ['hfu_receipt_candidate',bindings.hfu_receipt_candidate,hfuRaw,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json','8d864b004f3319dae39a5b74b746581d42d768d1','m05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1']
];
for(const [label,binding,raw,expectedPath,expectedSha,expectedSchema] of candidateBindings){
  if(binding?.path!==expectedPath)fail(`${label} path drift`);
  if(binding?.blob_sha!==expectedSha||gitBlobSha(raw)!==expectedSha)fail(`${label} Git object drift`);
  if(binding?.schema_version!==expectedSchema)fail(`${label} schema binding drift`);
}

const defect=repair.defect||{};
if(defect.defect_class!=='deterministic_state_composition_regression')fail('defect class drift');
if(defect.target_path!=='tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs')fail('defect target drift');
if(!text(defect.mechanism,240)||!text(defect.repair_rule,120))fail('defect mechanism or repair rule is under-specified');
if(defect.prior_five_domain_robodebt_pre_action_timing!==false)fail('defect before-state drift');
if(defect.canonical_robodebt_implementation_after!==true)fail('canonical implementation state drift');
for(const key of ['empirical_claim_changed','promotion_authority_changed','answer_authority_created']){
  if(defect[key]!==false)fail(`defect boundary ${key} weakened`);
}

const authority=repair.authority||{};
if(authority.authority_class!=='repository_owner_directed_state_composition_repair')fail('repair authority class drift');
if(authority.repository_owner!=='BigBirdReturns')fail('repair authority owner drift');
if(!text(authority.authorization_basis,180))fail('repair authority basis is under-specified');
if(authority.effective_event!=='merge_to_main')fail('repair authority event drift');
if(authority.authorized_state_change!=='restore the previously authorized Robodebt pre_action_timing value in the composed five-domain derived contract')fail('authorized state-change scope drift');
if(authority.authorized_evidence_scope!=='none beyond the five already admitted exact claims')fail('authorized evidence scope drift');
if(authority.authorized_answer_scope!=='the previously authorized Robodebt pre_action_timing transition only')fail('authorized answer scope drift');
if(authority.authorized_graph_effect!=='none')fail('authorized graph effect drift');
for(const key of ['human_review_claimed','independent_external_review_claimed','legal_or_fact_finding_authority_claimed']){
  if(authority[key]!==false)fail(`authority overclaim: ${key}`);
}

const target=repair.target||{};
if(target.receipt_id!==FIVE_DOMAIN_STATE_REPAIR_RECEIPT_ID)fail('repair receipt identity drift');
if(target.domain_id!==FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID)fail('repair domain identity drift');
if(target.jurisdiction!==FIVE_DOMAIN_STATE_REPAIR_JURISDICTION)fail('repair jurisdiction drift');
if(target.dimension!==FIVE_DOMAIN_STATE_REPAIR_DIMENSION)fail('repair dimension drift');
if(target.five_domain_composition_before!==false||target.canonical_implementation_state!==true||target.composed_after!==true)fail('repair transition drift');
if(target.durability_after!==false||target.composed_durable_answer_after!==false)fail('repair opened an unauthorized answer state');

if(fiveDomainReconciliation.expected_result?.total_claim_evidence_admissible!==5)fail('five-domain claim denominator drift');
if(fiveDomainReconciliation.expected_result?.effective_answers!==0)fail('five-domain answer denominator drift');
if(fiveDomainReconciliation.boundaries?.issue_345_may_close!==false)fail('five-domain issue boundary drift');
if(robodebtImplementationReceipt.target?.receipt_id!==FIVE_DOMAIN_STATE_REPAIR_RECEIPT_ID)fail('Robodebt source receipt identity drift');
if(robodebtImplementationReceipt.target?.dimension!==FIVE_DOMAIN_STATE_REPAIR_DIMENSION)fail('Robodebt source dimension drift');
if(robodebtImplementationReceipt.target?.after!==true)fail('Robodebt canonical state closed');
if(robodebtImplementationReceipt.expected_result?.robodebt_durability!==false)fail('Robodebt durability source drift');

const summary=summarizeFiveDomainStateCompositionRepair({
  officialPacket:packet,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  fiveDomainReconciliation,
  intelCandidate,
  hfuCandidate
});
for(const [index,value] of sourceObjects.entries()){
  if(JSON.stringify(value)!==sourceSnapshots[index])fail('state composition repair mutated a bound source object');
}

if(summary.five_domain_baseline_robodebt_pre_action_timing!==false)fail('five-domain regression is not reproduced');
if(summary.canonical_robodebt_pre_action_timing!==true)fail('canonical Robodebt implementation state is not reproduced');
if(summary.robodebt_pre_action_timing!==true)fail('final Robodebt pre-action state was not restored');
if(summary.robodebt_durability!==false)fail('final Robodebt durability was improperly opened');
if(summary.advanced_answer_dimensions!==1)fail('authorized state transition denominator drift');

const baselineDomains=summary.applied.five_domain_baseline.applied.derived_contract.domain_observations;
const finalDomains=summary.applied.final_contract.domain_observations;
if(baselineDomains.length!==5||finalDomains.length!==5)fail('five-domain observation denominator drift');
if(!same(baselineDomains.map((row)=>row.domain_id),finalDomains.map((row)=>row.domain_id)))fail('five-domain order drift');

for(let index=0;index<finalDomains.length;index+=1){
  const before=baselineDomains[index];
  const after=finalDomains[index];
  if(after.domain_id!==FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID){
    if(!same(before,after))fail(`${after.domain_id} changed outside the state composition repair`);
    continue;
  }
  const normalizedBefore=clone(before);
  const normalizedAfter=clone(after);
  normalizedBefore.answer.dimensions[FIVE_DOMAIN_STATE_REPAIR_DIMENSION]='__authorized_state__';
  normalizedAfter.answer.dimensions[FIVE_DOMAIN_STATE_REPAIR_DIMENSION]='__authorized_state__';
  if(!same(normalizedBefore,normalizedAfter))fail('Robodebt changed outside the authorized pre-action dimension');
  if(before.answer.dimensions.pre_action_timing!==false||after.answer.dimensions.pre_action_timing!==true)fail('Robodebt repair transition failed');
}

const finalRobodebt=observationForDomain(summary.applied.final_contract,FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID);
if(!finalRobodebt)fail('missing final Robodebt observation');
if(!same(finalRobodebt,summary.robodebt_summary.applied.after_observation))fail('final Robodebt state differs from the canonical implementation receipt');
if(finalRobodebt.answer.dimensions.durability!==false)fail('Robodebt durability deficit disappeared');
if(finalRobodebt.answer.composed_durable_answer!==false)fail('Robodebt composed-answer deficit disappeared');
const targetEvaluation=evaluateObservation(finalRobodebt,contract);
if(targetEvaluation.claim_evidence_admissible!==true||targetEvaluation.repository_promotion_allowed!==true)fail('Robodebt claim evidence regressed');
if(targetEvaluation.answer_effective!==false)fail('Robodebt escaped the answer-effectiveness boundary');
if(targetEvaluation.answer_failures.includes('dimension:pre_action_timing'))fail('Robodebt pre-action deficit remained after repair');
if(!targetEvaluation.answer_failures.includes('dimension:durability'))fail('Robodebt durability deficit disappeared');
if(!targetEvaluation.answer_failures.includes('composed_durable_answer'))fail('Robodebt composed-answer deficit disappeared');

if(summary.applied.additional_promoted_records.length!==2)fail('additional promotion denominator drift');
if(!same(summary.applied.additional_promoted_records.map((row)=>row.receipt_id),FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS))fail('additional promotion identity or order drift');
for(const promoted of summary.applied.additional_promoted_records){
  if(promoted.authorized_claim!==promoted.source_claim)fail(`${promoted.receipt_id} claim widened during repair`);
  if(!same(promoted.observation.answer,promoted.source_observation.answer))fail(`${promoted.receipt_id} answer state changed during repair`);
  if(!same(promoted.observation.source_health,promoted.source_observation.source_health))fail(`${promoted.receipt_id} source-health state changed during repair`);
  if(promoted.observation.promotes_to!=='candidate_evidence'||promoted.observation.evidence.promotion_ceiling!=='claim_evidence')fail(`${promoted.receipt_id} promotion state drift`);
  for(const gate of EVIDENCE_BOOLEAN_GATES){
    if(promoted.observation.evidence[gate]!==true)fail(`${promoted.receipt_id} evidence gate ${gate} is not true`);
  }
  const evaluation=evaluateObservation(promoted.observation,contract);
  if(evaluation.claim_evidence_admissible!==true||evaluation.repository_promotion_allowed!==true)fail(`${promoted.receipt_id} claim evidence admission failed`);
  if(evaluation.answer_effective!==false)fail(`${promoted.receipt_id} escaped answer-effectiveness boundary`);
}

if(summary.regression.source_health_healthy!==true)fail('source-health state drift');
if(summary.audited_domains!==5)fail('audited-domain denominator drift');
if(summary.claim_evidence_admissible!==5)fail('claim-evidence denominator drift');
if(summary.repository_promotion_allowed!==5)fail('repository-promotion denominator drift');
if(summary.effective_answers!==0)fail('effective-answer denominator drift');
if(summary.qualifying_jurisdictions!==0)fail('qualifying-jurisdiction denominator drift');
if(summary.evidentiary_sufficiency!==true)fail('claim-scoped evidentiary sufficiency regressed');
if(summary.answer_effectiveness!==false)fail('answer effectiveness improperly opened');
if(summary.cross_domain_regression_completed!==false)fail('cross-domain regression improperly completed');

const computed={
  audited_domains:summary.audited_domains,
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
if(!same(computed,repair.expected_result))fail('expected repair result drift');
if(!text(repair.scope_note,240))fail('repair scope note is under-specified');

const boundaries=repair.boundaries||{};
for(const key of [
  'changes_official_receipt_packet',
  'changes_prior_promotion_adjudication',
  'changes_evidence_state_contract',
  'changes_robodebt_implementation_receipt',
  'changes_five_domain_reconciliation',
  'changes_intel_candidate',
  'changes_hfu_candidate',
  'changes_claim_text',
  'changes_promotion_denominator',
  'changes_source_health_state',
  'changes_observed_outcome',
  'changes_any_dimension_other_than_robodebt_pre_action_timing',
  'creates_new_empirical_receipt',
  'claims_robodebt_durability',
  'claims_composed_durable_answer',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'claims_independent_external_review',
  'claims_human_review',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`repair boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='candidate_state_composition_repair'||boundaries.graph_effect!=='none')fail('repair repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-five-domain-state-composition-repair',
  ...computed
},null,2));
