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
  summarizeClaimEvidencePromotionAdjudication
} from './lib/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';
import {
  summarizeRobodebtPreActionImplementationReceipt
} from './lib/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.mjs';
import {
  FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS,
  FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS,
  FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS,
  FIVE_DOMAIN_ROBODEBT_RECEIPT_ID,
  FIVE_DOMAIN_ROBODEBT_DOMAIN_ID,
  FIVE_DOMAIN_ROBODEBT_JURISDICTION,
  FIVE_DOMAIN_ROBODEBT_DIMENSION,
  summarizeFiveDomainClaimEvidenceReconciliation
} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  reconciliation:resolvePath(
    'M05_FIVE_DOMAIN_RECONCILIATION_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'
  ),
  packet:resolvePath(
    'M05_OFFICIAL_RECEIPT_PACKET_PATH',
    'data/project/m05-cross-domain-official-receipt-candidates.json'
  ),
  prior:resolvePath(
    'M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
  ),
  contract:resolvePath(
    'M05_EVIDENCE_STATE_CONTRACT_PATH',
    'data/project/m05-source-health-evidence-state-regression.json'
  ),
  robodebt:resolvePath(
    'M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
  ),
  intel:resolvePath(
    'M05_INTEL_RECEIPT_CANDIDATE_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
  ),
  hfu:resolvePath(
    'M05_HFU_RECEIPT_CANDIDATE_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'
  )
};

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const clone=(value)=>JSON.parse(JSON.stringify(value));
const sorted=(values)=>[...values].sort();
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const fail=(message)=>{throw new Error(message)};
const observationForDomain=(contract,domainId)=>
  contract.domain_observations.find((row)=>row.domain_id===domainId);

const raw=Object.fromEntries(
  Object.entries(paths).map(([key,target])=>[key,readRaw(target)])
);
const data=Object.fromEntries(
  Object.entries(raw).map(([key,buffer])=>[key,JSON.parse(buffer.toString('utf8'))])
);
const {
  reconciliation,
  packet,
  prior:priorAdjudication,
  contract,
  robodebt:robodebtImplementationReceipt,
  intel:intelCandidate,
  hfu:hfuCandidate
}=data;
const sourceSnapshots=Object.fromEntries(
  Object.entries(data).map(([key,value])=>[key,JSON.stringify(value)])
);

if(reconciliation.schema_version!=='m05-answerable-power-s03-l7-five-domain-claim-evidence-reconciliation@1')fail('reconciliation schema drift');
if(reconciliation.object_class!=='bounded_five_domain_claim_evidence_reconciliation')fail('reconciliation object class drift');
if(reconciliation.program_id!=='M-05'||reconciliation.sprint_id!=='M05-SPRINT-03'||reconciliation.leg_id!=='S03-L7')fail('reconciliation program binding drift');
if(reconciliation.issue!==345)fail('reconciliation issue identity drift');
if(reconciliation.as_of!=='2026-08-17')fail('reconciliation as-of drift');
if(reconciliation.status!=='five_domain_claim_evidence_reconciliation_frozen')fail('reconciliation status drift');
if(!text(reconciliation.title,40)||!text(reconciliation.question,140))fail('reconciliation title or question is under-specified');
if(reconciliation.canonical_base?.branch!=='main')fail('canonical branch drift');
if(reconciliation.canonical_base?.sha!=='b768793261e01b6cb10fda9a086106c4db3d17b9')fail('canonical base drift');
if(reconciliation.canonical_base?.tree_sha!=='a068c679a36075b8c12007b89ecde83e1219020e')fail('canonical tree drift');
if(reconciliation.canonical_base?.pages_repair_pull_request!==2160)fail('canonical Pages repair binding drift');

const bindingDefinitions={
  official_receipt_packet:{
    dataKey:'packet',
    path:'data/project/m05-cross-domain-official-receipt-candidates.json',
    blob:'1c17549a39b826853435d3726596bf41d0fc7de9',
    schema:'m05-cross-domain-official-receipt-candidates@1',
    pullRequest:2151,
    mergeCommit:'204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0'
  },
  prior_promotion_adjudication:{
    dataKey:'prior',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json',
    blob:'e64f24fb74094b99e717c2cd03af8e0620d23f15',
    schema:'m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1',
    pullRequest:2153,
    mergeCommit:'49d1f3617132248484647eca4ddfa4fa49db40fb'
  },
  intel_receipt_candidate:{
    dataKey:'intel',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json',
    blob:'ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a',
    schema:'m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',
    pullRequest:2156,
    mergeCommit:'3e13165dcd033f4c0b7a983af7b8a613622a1896'
  },
  hfu_receipt_candidate:{
    dataKey:'hfu',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json',
    blob:'8d864b004f3319dae39a5b74b746581d42d768d1',
    schema:'m05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1',
    pullRequest:2159,
    mergeCommit:'8ec1941ae75ff2df1b9ba0aa0219b38b75d255d6'
  }
};
for(const [bindingId,definition] of Object.entries(bindingDefinitions)){
  const binding=reconciliation.bindings?.[bindingId];
  if(!binding)fail(`missing binding ${bindingId}`);
  if(binding.path!==definition.path)fail(`${bindingId} path drift`);
  if(binding.blob_sha!==definition.blob)fail(`${bindingId} declared blob drift`);
  if(gitBlobSha(raw[definition.dataKey])!==definition.blob)fail(`${bindingId} Git object drift`);
  if(binding.schema_version!==definition.schema)fail(`${bindingId} schema binding drift`);
  if(data[definition.dataKey].schema_version!==definition.schema)fail(`${bindingId} source schema drift`);
  if(binding.pull_request!==definition.pullRequest||binding.merge_commit!==definition.mergeCommit)fail(`${bindingId} publication drift`);
}
const contractBinding=reconciliation.bindings?.evidence_state_contract||{};
if(contractBinding.path!=='data/project/m05-source-health-evidence-state-regression.json')fail('evidence-state path drift');
if(contractBinding.blob_sha!=='72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33')fail('evidence-state declared blob drift');
if(gitBlobSha(raw.contract)!==contractBinding.blob_sha)fail('evidence-state Git object drift');
if(contractBinding.schema_version!=='m05-source-health-evidence-state-regression@1')fail('evidence-state schema drift');
if(contractBinding.minimum_domains!==3||contractBinding.minimum_jurisdictions!==2)fail('evidence-state denominator drift');

if(gitBlobSha(raw.robodebt)!=='a31d7ea7a1432a169de31035c153210b8975e217')fail('Robodebt implementation Git object drift');
if(robodebtImplementationReceipt.schema_version!=='m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt@1')fail('Robodebt implementation schema drift');
if(robodebtImplementationReceipt.issue!==345||robodebtImplementationReceipt.status!=='robodebt_pre_action_implementation_receipt_frozen')fail('Robodebt implementation identity drift');
const robodebtTarget=robodebtImplementationReceipt.target||{};
if(robodebtTarget.receipt_id!==FIVE_DOMAIN_ROBODEBT_RECEIPT_ID)fail('Robodebt receipt identity drift');
if(robodebtTarget.domain_id!==FIVE_DOMAIN_ROBODEBT_DOMAIN_ID)fail('Robodebt domain identity drift');
if(robodebtTarget.jurisdiction!==FIVE_DOMAIN_ROBODEBT_JURISDICTION)fail('Robodebt jurisdiction drift');
if(robodebtTarget.dimension!==FIVE_DOMAIN_ROBODEBT_DIMENSION)fail('Robodebt dimension drift');
if(robodebtTarget.before!==false||robodebtTarget.after!==true)fail('Robodebt implementation transition drift');
if(robodebtImplementationReceipt.expected_result?.robodebt_durability!==false)fail('Robodebt durability overclaim');
if(robodebtImplementationReceipt.expected_result?.effective_answers!==0)fail('Robodebt answer denominator drift');
if(robodebtImplementationReceipt.boundaries?.issue_345_may_close!==false)fail('Robodebt issue boundary drift');
if(!same(robodebtImplementationReceipt.retained_deficits,[
  'composed_durable_answer',
  'dimension:durability'
]))fail('Robodebt retained deficit ledger drift');

const priorSummary=summarizeClaimEvidencePromotionAdjudication(
  packet,
  priorAdjudication,
  contract
);
if(priorSummary.audited_domains!==5||priorSummary.claim_evidence_admissible!==3||priorSummary.repository_promotion_allowed!==3)fail('prior claim-evidence denominator drift');
if(priorSummary.effective_answers!==0||priorSummary.answer_effectiveness!==false||priorSummary.cross_domain_regression_completed!==false)fail('prior answer boundary drift');

const robodebtSummary=summarizeRobodebtPreActionImplementationReceipt(
  packet,
  priorAdjudication,
  robodebtImplementationReceipt,
  contract
);
if(robodebtSummary.robodebt_pre_action_timing!==true)fail('canonical Robodebt pre-action state closed');
if(robodebtSummary.robodebt_durability!==false)fail('canonical Robodebt durability opened');
if(robodebtSummary.advanced_answer_dimensions!==1)fail('canonical Robodebt transition denominator drift');
if(robodebtSummary.effective_answers!==0||robodebtSummary.cross_domain_regression_completed!==false)fail('canonical Robodebt answer boundary drift');

const candidateDefinitions=[
  {
    label:'intel',
    candidate:intelCandidate,
    receiptId:'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY',
    domainId:'APC-VALUE-01',
    jurisdiction:'US'
  },
  {
    label:'hfu',
    candidate:hfuCandidate,
    receiptId:'M05-RC-EXIT-UK-HFU-SHARE',
    domainId:'APC-EXIT-01',
    jurisdiction:'UK'
  }
];
if(!same(FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS,candidateDefinitions.map((row)=>row.receiptId)))fail('additional receipt denominator drift');
if(!same(FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS,candidateDefinitions.map((row)=>row.domainId)))fail('additional domain denominator drift');
if(!same(FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS,candidateDefinitions.map((row)=>row.jurisdiction)))fail('additional jurisdiction denominator drift');

const decisions=Array.isArray(reconciliation.adjudications)?reconciliation.adjudications:[];
if(decisions.length!==2)fail('additional adjudication denominator drift');
if(!same(decisions.map((row)=>row.receipt_id),FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS))fail('additional adjudication receipt identity or order drift');
if(!same(decisions.map((row)=>row.domain_id),FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS))fail('additional adjudication domain identity or order drift');
if(!same(decisions.map((row)=>row.jurisdiction),FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS))fail('additional adjudication jurisdiction identity or order drift');

const sourcesById=new Map(candidateDefinitions.map((definition)=>[
  definition.receiptId,
  definition.candidate.receipt
]));
for(const decision of decisions){
  const source=sourcesById.get(decision.receipt_id);
  if(!source)fail(`missing additional source record ${decision.receipt_id}`);
  if(source.domain_id!==decision.domain_id||source.jurisdiction!==decision.jurisdiction)fail(`${decision.receipt_id} source identity drift`);
  if(decision.authorized_claim!==source.claim_binding.claim)fail(`${decision.receipt_id} authorized claim widened or changed`);
  if(decision.promotion_authority!==true||decision.promotion_ceiling!=='claim_evidence'||decision.promotes_to!=='candidate_evidence')fail(`${decision.receipt_id} promotion state drift`);
  if(decision.claim_scope_widening_authorized!==false||decision.answer_changes_authorized!==false)fail(`${decision.receipt_id} scope widening authorized`);
  const expectedDeficits=(source.deficits||[]).filter((value)=>value!=='promotion_authority');
  if(!same(sorted(decision.preserved_deficits||[]),sorted(expectedDeficits)))fail(`${decision.receipt_id} preserved deficit ledger drift`);
  const chain=source.instrument_chain||source.transition_chain||{};
  const guarded=decision.guarded_nonfindings||{};
  if(Object.keys(guarded).length===0)fail(`${decision.receipt_id} lacks guarded nonfindings`);
  for(const [key,value] of Object.entries(guarded)){
    if(value!==false||chain[key]!==false)fail(`${decision.receipt_id} guarded nonfinding ${key} drift`);
  }
}

const authority=reconciliation.authority||{};
if(authority.authority_class!=='repository_owner_directed_candidate_evidence_adjudication')fail('authority class drift');
if(authority.repository_owner!=='BigBirdReturns'||authority.effective_event!=='merge_to_main')fail('authority identity drift');
if(!text(authority.authorization_basis,180))fail('authority basis is under-specified');
if(authority.authorized_evidence_scope!=='candidate evidence for the two exact frozen claims only')fail('authorized evidence scope drift');
if(authority.authorized_answer_scope!=='none'||authority.authorized_graph_effect!=='none')fail('reconciliation authority escaped evidence-only boundary');
for(const key of ['human_review_claimed','independent_external_review_claimed','legal_or_fact_finding_authority_claimed']){
  if(authority[key]!==false)fail(`authority overclaim: ${key}`);
}

const reconciliationInputs={
  officialPacket:packet,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  intelCandidate,
  hfuCandidate,
  reconciliation
};
const summary=summarizeFiveDomainClaimEvidenceReconciliation(reconciliationInputs);
for(const [key,value] of Object.entries(data)){
  if(JSON.stringify(value)!==sourceSnapshots[key])fail(`reconciliation mutated bound source ${key}`);
}

let missingReceiptFailed=false;
try{
  summarizeFiveDomainClaimEvidenceReconciliation({
    ...reconciliationInputs,
    robodebtImplementationReceipt:undefined
  });
}catch(error){
  missingReceiptFailed=/missing Robodebt implementation receipt/.test(
    String(error?.message||error)
  );
}
if(!missingReceiptFailed)fail('missing Robodebt implementation receipt did not fail closed');

const beforeContract=summary.applied.pre_implementation_contract;
const finalContract=summary.applied.derived_contract;
const beforeDomains=beforeContract.domain_observations;
const finalDomains=finalContract.domain_observations;
if(beforeDomains.length!==5||finalDomains.length!==5)fail('five-domain observation denominator drift');
if(!same(beforeDomains.map((row)=>row.domain_id),finalDomains.map((row)=>row.domain_id)))fail('five-domain observation order drift');

for(let index=0;index<finalDomains.length;index+=1){
  const before=beforeDomains[index];
  const after=finalDomains[index];
  if(after.domain_id!==FIVE_DOMAIN_ROBODEBT_DOMAIN_ID){
    if(!same(before,after))fail(`${after.domain_id} changed outside the Robodebt implementation transition`);
    continue;
  }
  const normalizedBefore=clone(before);
  const normalizedAfter=clone(after);
  normalizedBefore.answer.dimensions[FIVE_DOMAIN_ROBODEBT_DIMENSION]='__authorized_state__';
  normalizedAfter.answer.dimensions[FIVE_DOMAIN_ROBODEBT_DIMENSION]='__authorized_state__';
  if(!same(normalizedBefore,normalizedAfter))fail('Robodebt changed outside the authorized pre-action dimension');
  if(before.answer.dimensions.pre_action_timing!==false||after.answer.dimensions.pre_action_timing!==true)fail('Robodebt implementation transition was not preserved');
}

const finalRobodebt=observationForDomain(finalContract,FIVE_DOMAIN_ROBODEBT_DOMAIN_ID);
if(!finalRobodebt)fail('missing final Robodebt observation');
if(!same(finalRobodebt,robodebtSummary.applied.after_observation))fail('final Robodebt state differs from canonical implementation receipt');
if(finalRobodebt.answer.dimensions.durability!==false||finalRobodebt.answer.composed_durable_answer!==false)fail('Robodebt durability or composed-answer gate opened');
const promotedRobodebt=summary.applied.all_promoted_records.find((row)=>row.receipt_id===FIVE_DOMAIN_ROBODEBT_RECEIPT_ID);
if(!promotedRobodebt||!same(promotedRobodebt.observation,finalRobodebt))fail('promoted-record ledger erased the Robodebt implementation state');
if(!same(promotedRobodebt.preserved_deficits,robodebtImplementationReceipt.retained_deficits))fail('promoted-record ledger retained a resolved Robodebt deficit');
if(promotedRobodebt.preserved_deficits.includes('dimension:pre_action_timing'))fail('resolved Robodebt pre-action deficit remains exposed');

for(const promoted of summary.applied.additional_promoted_records){
  if(promoted.authorized_claim!==promoted.source_claim)fail(`${promoted.receipt_id} output claim drift`);
  const evaluation=evaluateObservation(promoted.observation,contract);
  if(evaluation.claim_evidence_admissible!==true||evaluation.repository_promotion_allowed!==true)fail(`${promoted.receipt_id} failed claim-evidence admission`);
  if(evaluation.answer_effective!==false)fail(`${promoted.receipt_id} escaped answer-effectiveness boundary`);
  for(const gate of EVIDENCE_BOOLEAN_GATES){
    if(promoted.observation.evidence[gate]!==true)fail(`${promoted.receipt_id} promoted evidence gate ${gate} is not true`);
  }
}

if(summary.regression.source_health_healthy!==true)fail('source-health receipt drift');
if(summary.regression.domain_observations_evaluated!==5)fail('five-domain denominator drift');
if(summary.regression.admissible_domain_evidence_records!==5)fail('five-domain claim-evidence denominator drift');
if(summary.regression.domains.filter((row)=>row.repository_promotion_allowed).length!==5)fail('repository-promotion denominator drift');
if(summary.regression.effective_domain_answers!==0)fail('effective answer denominator drift');
if(summary.regression.evidentiary_sufficiency!==true)fail('claim-scoped evidentiary sufficiency drift');
if(summary.regression.answer_effectiveness!==false)fail('answer effectiveness improperly opened');
if(summary.regression.cross_domain_regression_completed!==false)fail('cross-domain regression improperly completed');

const computed={
  audited_domains:summary.audited_domains,
  prior_claim_evidence_admissible:summary.prior_claim_evidence_admissible,
  newly_adjudicated_receipts:summary.newly_adjudicated_receipts,
  newly_claim_evidence_admissible:summary.newly_claim_evidence_admissible,
  total_claim_evidence_admissible:summary.total_claim_evidence_admissible,
  total_repository_promotion_allowed:summary.total_repository_promotion_allowed,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  evidentiary_sufficiency:summary.evidentiary_sufficiency,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(computed,reconciliation.expected_result))fail('expected reconciliation result drift');
if(!text(reconciliation.scope_note,220))fail('reconciliation scope note is under-specified');

const boundaries=reconciliation.boundaries||{};
for(const key of [
  'changes_source_health_contract',
  'changes_official_receipt_packet',
  'changes_prior_promotion_adjudication',
  'changes_intel_candidate',
  'changes_hfu_candidate',
  'promotes_beyond_exact_claims',
  'all_five_claims_admitted_is_cross_domain_answer',
  'intel_equity_operation_is_realized_return',
  'intel_registration_is_completed_sale',
  'hfu_supplier_exit_is_complete_sovereignty',
  'hfu_public_code_is_supplier_free_operation',
  'claims_independent_external_review',
  'claims_human_review',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`reconciliation boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='candidate_only'||boundaries.graph_effect!=='none')fail('reconciliation repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-five-domain-claim-evidence-reconciliation',
  ...computed,
  robodebt_pre_action_timing:finalRobodebt.answer.dimensions.pre_action_timing,
  robodebt_durability:finalRobodebt.answer.dimensions.durability,
  receipt_bound:true,
  missing_receipt_fails_closed:true,
  resolved_deficit_removed:true
},null,2));
