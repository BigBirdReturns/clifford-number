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
  FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS,
  FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS,
  FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS,
  summarizeFiveDomainClaimEvidenceReconciliation
} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const reconciliationPath=resolvePath(
  'M05_FIVE_DOMAIN_RECONCILIATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
);
const priorAdjudicationPath=resolvePath(
  'M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const contractPath=resolvePath(
  'M05_EVIDENCE_STATE_CONTRACT_PATH',
  'data/project/m05-source-health-evidence-state-regression.json'
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
const sort=(values)=>[...values].sort();
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const clone=(value)=>JSON.parse(JSON.stringify(value));
const fail=(message)=>{throw new Error(message)};

const reconciliation=readJson(reconciliationPath);
const packetRaw=readRaw(packetPath);
const packet=JSON.parse(packetRaw.toString('utf8'));
const priorRaw=readRaw(priorAdjudicationPath);
const priorAdjudication=JSON.parse(priorRaw.toString('utf8'));
const contractRaw=readRaw(contractPath);
const contract=JSON.parse(contractRaw.toString('utf8'));
const intelRaw=readRaw(intelPath);
const intelCandidate=JSON.parse(intelRaw.toString('utf8'));
const hfuRaw=readRaw(hfuPath);
const hfuCandidate=JSON.parse(hfuRaw.toString('utf8'));
const sourceSnapshots=[packet,priorAdjudication,contract,intelCandidate,hfuCandidate].map((value)=>JSON.stringify(value));

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

const bindings=reconciliation.bindings||{};
const bindingChecks=[
  ['official_receipt_packet',bindings.official_receipt_packet,packetRaw,'data/project/m05-cross-domain-official-receipt-candidates.json','1c17549a39b826853435d3726596bf41d0fc7de9','m05-cross-domain-official-receipt-candidates@1',2151,'204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0'],
  ['prior_promotion_adjudication',bindings.prior_promotion_adjudication,priorRaw,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json','e64f24fb74094b99e717c2cd03af8e0620d23f15','m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1',2153,'49d1f3617132248484647eca4ddfa4fa49db40fb'],
  ['intel_receipt_candidate',bindings.intel_receipt_candidate,intelRaw,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json','ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a','m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',2156,'3e13165dcd033f4c0b7a983af7b8a613622a1896'],
  ['hfu_receipt_candidate',bindings.hfu_receipt_candidate,hfuRaw,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json','8d864b004f3319dae39a5b74b746581d42d768d1','m05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1',2159,'8ec1941ae75ff2df1b9ba0aa0219b38b75d255d6']
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
if(gitBlobSha(contractRaw)!==contractBinding.blob_sha)fail('evidence-state contract Git object drift');
if(contractBinding.schema_version!=='m05-source-health-evidence-state-regression@1')fail('evidence-state schema binding drift');
if(contractBinding.minimum_domains!==3||contractBinding.minimum_jurisdictions!==2)fail('evidence-state denominator drift');
if(contract.evidence_admission_contract.required_promotion_ceiling!=='claim_evidence')fail('claim-evidence ceiling drift');
if(contract.answer_effectiveness_contract.minimum_observed_domains!==3||contract.answer_effectiveness_contract.minimum_observed_jurisdictions!==2)fail('answer denominator drift');

const priorSummary=summarizeClaimEvidencePromotionAdjudication(packet,priorAdjudication,contract);
if(priorSummary.audited_domains!==5||priorSummary.claim_evidence_admissible!==3||priorSummary.repository_promotion_allowed!==3)fail('prior claim-evidence denominator drift');
if(priorSummary.effective_answers!==0||priorSummary.answer_effectiveness!==false||priorSummary.cross_domain_regression_completed!==false)fail('prior answer boundary drift');

const candidateDefinitions=[
  {
    label:'intel',
    object:intelCandidate,
    schema:'m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1',
    objectClass:'bounded_public_equity_operation_receipt_candidate',
    receiptId:'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY',
    domainId:'APC-VALUE-01',
    jurisdiction:'US',
    nonfindings:{
      realized_sale_dividend_or_warrant_exercise:false,
      identified_federal_cash_receipt:false,
      transparent_public_or_affected_party_distribution:false
    },
    chainKey:'instrument_chain',
    promotedBoundary:'intel_claim_promoted'
  },
  {
    label:'hfu',
    object:hfuCandidate,
    schema:'m05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1',
    objectClass:'bounded_public_platform_exit_operation_receipt_candidate',
    receiptId:'M05-RC-EXIT-UK-HFU-SHARE',
    domainId:'APC-EXIT-01',
    jurisdiction:'UK',
    nonfindings:{
      independent_end_to_end_migration_assurance:false,
      residual_supplier_custody_reconciled:false,
      former_supplier_deletion_certificate:false,
      independent_cost_and_performance_reconciliation:false,
      affected_party_post_exit_governance:false,
      supplier_free_operation:false,
      cloud_independent_operation:false
    },
    chainKey:'transition_chain',
    promotedBoundary:'hfu_claim_promoted'
  }
];

for(const definition of candidateDefinitions){
  const candidate=definition.object;
  const receipt=candidate.receipt||{};
  const observation=receipt.observation||{};
  if(candidate.schema_version!==definition.schema)fail(`${definition.label} candidate schema drift`);
  if(candidate.object_class!==definition.objectClass)fail(`${definition.label} candidate class drift`);
  if(candidate.issue!==345||candidate.as_of!=='2026-08-17'||candidate.status!=='repository_content_candidate_frozen')fail(`${definition.label} candidate identity drift`);
  if(receipt.receipt_id!==definition.receiptId||receipt.domain_id!==definition.domainId||receipt.jurisdiction!==definition.jurisdiction)fail(`${definition.label} receipt identity drift`);
  if(!text(receipt.claim_binding?.claim,220))fail(`${definition.label} exact claim is under-specified`);
  if(observation.domain_id!==definition.domainId||observation.jurisdiction!==definition.jurisdiction)fail(`${definition.label} observation identity drift`);
  if(observation.fixture_only!==false||observation.promotes_to!=='none')fail(`${definition.label} source promotion state drift`);
  if(observation.evidence?.promotion_ceiling!=='repository_content'||observation.evidence?.promotion_authority!==false)fail(`${definition.label} source evidence ceiling drift`);
  for(const gate of EVIDENCE_BOOLEAN_GATES.filter((value)=>value!=='promotion_authority')){
    if(observation.evidence?.[gate]!==true)fail(`${definition.label} source evidence gate ${gate} drift`);
  }
  if(observation.answer?.observed_domains!==1||observation.answer?.observed_jurisdictions!==1||observation.answer?.observed_outcome!==true)fail(`${definition.label} observed outcome denominator drift`);
  if(observation.answer?.composed_durable_answer!==false||observation.expected?.claim_evidence_admissible!==false||observation.expected?.answer_effective!==false)fail(`${definition.label} answer boundary drift`);
  if(candidate.boundaries?.[definition.promotedBoundary]!==false)fail(`${definition.label} source candidate promotion boundary drift`);
  const chain=receipt[definition.chainKey]||{};
  for(const [key,value] of Object.entries(definition.nonfindings)){
    if(chain[key]!==value)fail(`${definition.label} guarded source nonfinding ${key} drift`);
  }
}

if(!same(FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS,candidateDefinitions.map((row)=>row.receiptId)))fail('additional receipt denominator drift');
if(!same(FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS,candidateDefinitions.map((row)=>row.domainId)))fail('additional domain denominator drift');
if(!same(FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS,candidateDefinitions.map((row)=>row.jurisdiction)))fail('additional jurisdiction denominator drift');

const authority=reconciliation.authority||{};
if(authority.authority_class!=='repository_owner_directed_candidate_evidence_adjudication')fail('authority class drift');
if(authority.repository_owner!=='BigBirdReturns')fail('repository owner authority drift');
if(!text(authority.authorization_basis,180))fail('authorization basis is under-specified');
if(authority.effective_event!=='merge_to_main')fail('authority effective event drift');
for(const key of ['human_review_claimed','independent_external_review_claimed','legal_or_fact_finding_authority_claimed']){
  if(authority[key]!==false)fail(`authority overclaim: ${key}`);
}
if(authority.authorized_evidence_scope!=='candidate evidence for the two exact frozen claims only')fail('authorized evidence scope drift');
if(authority.authorized_answer_scope!=='none'||authority.authorized_graph_effect!=='none')fail('authority escaped evidence-only boundary');

const decisions=Array.isArray(reconciliation.adjudications)?reconciliation.adjudications:[];
if(decisions.length!==2)fail('additional adjudication denominator drift');
if(!same(decisions.map((row)=>row.receipt_id),FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS))fail('additional adjudication receipt identity or order drift');
if(new Set(decisions.map((row)=>row.receipt_id)).size!==decisions.length)fail('duplicate additional adjudication');
if(!same(decisions.map((row)=>row.domain_id),FIVE_DOMAIN_ADDITIONAL_DOMAIN_IDS))fail('additional adjudication domain identity or order drift');
if(!same(decisions.map((row)=>row.jurisdiction),FIVE_DOMAIN_ADDITIONAL_JURISDICTIONS))fail('additional adjudication jurisdiction identity or order drift');

const sourcesById=new Map(candidateDefinitions.map((definition)=>[definition.receiptId,definition.object.receipt]));
for(const decision of decisions){
  const source=sourcesById.get(decision.receipt_id);
  if(!source)fail(`missing additional source record ${decision.receipt_id}`);
  if(source.domain_id!==decision.domain_id||source.jurisdiction!==decision.jurisdiction)fail(`${decision.receipt_id} source identity drift`);
  if(decision.authorized_claim!==source.claim_binding.claim)fail(`${decision.receipt_id} authorized claim widened or changed`);
  if(decision.promotion_authority!==true)fail(`${decision.receipt_id} lacks explicit promotion authority`);
  if(decision.promotion_ceiling!=='claim_evidence')fail(`${decision.receipt_id} promotion ceiling drift`);
  if(decision.promotes_to!=='candidate_evidence')fail(`${decision.receipt_id} repository promotion target drift`);
  if(decision.claim_scope_widening_authorized!==false)fail(`${decision.receipt_id} authorizes claim-scope widening`);
  if(decision.answer_changes_authorized!==false)fail(`${decision.receipt_id} authorizes answer mutation`);
  const expectedDeficits=source.deficits.filter((value)=>value!=='promotion_authority');
  if(!same(sort(decision.preserved_deficits||[]),sort(expectedDeficits)))fail(`${decision.receipt_id} preserved deficit ledger drift`);
  const chain=source.instrument_chain||source.transition_chain||{};
  const guarded=decision.guarded_nonfindings||{};
  if(Object.keys(guarded).length===0)fail(`${decision.receipt_id} lacks guarded nonfindings`);
  for(const [key,value] of Object.entries(guarded)){
    if(value!==false||chain[key]!==false)fail(`${decision.receipt_id} guarded nonfinding ${key} drift`);
  }
}

const summary=summarizeFiveDomainClaimEvidenceReconciliation({
  officialPacket:packet,
  priorAdjudication,
  contract,
  intelCandidate,
  hfuCandidate,
  reconciliation
});
for(const [index,value] of [packet,priorAdjudication,contract,intelCandidate,hfuCandidate].entries()){
  if(JSON.stringify(value)!==sourceSnapshots[index])fail('reconciliation mutated a bound source object');
}

const normalizeObservation=(value)=>{
  const normalized=clone(value);
  delete normalized.expected;
  normalized.promotes_to='__promotion_field__';
  normalized.evidence.promotion_authority='__promotion_field__';
  normalized.evidence.promotion_ceiling='__promotion_field__';
  return normalized;
};

for(const promoted of summary.applied.additional_promoted_records){
  if(promoted.authorized_claim!==promoted.source_claim)fail(`${promoted.receipt_id} output claim drift`);
  if(!same(normalizeObservation(promoted.observation),normalizeObservation(promoted.source_observation)))fail(`${promoted.receipt_id} changed fields outside the promotion boundary`);
  if(!same(promoted.observation.answer,promoted.source_observation.answer))fail(`${promoted.receipt_id} answer state changed during promotion`);
  if(!same(promoted.observation.source_health,promoted.source_observation.source_health))fail(`${promoted.receipt_id} source-health state changed during promotion`);
  for(const gate of EVIDENCE_BOOLEAN_GATES){
    if(promoted.observation.evidence[gate]!==true)fail(`${promoted.receipt_id} promoted evidence gate ${gate} is not true`);
  }
  if(promoted.observation.evidence.promotion_ceiling!=='claim_evidence'||promoted.observation.promotes_to!=='candidate_evidence')fail(`${promoted.receipt_id} promoted evidence state drift`);
  const evaluation=evaluateObservation(promoted.observation,contract);
  if(evaluation.claim_evidence_admissible!==true||evaluation.repository_promotion_allowed!==true)fail(`${promoted.receipt_id} failed claim-evidence admission`);
  if(evaluation.answer_effective!==false)fail(`${promoted.receipt_id} escaped answer-effectiveness boundary`);
}

if(summary.regression.source_health_healthy!==true)fail('source-health receipt drift');
if(summary.regression.domain_observations_evaluated!==5)fail('five-domain denominator drift');
if(summary.regression.admissible_domain_evidence_records!==5)fail('five-domain claim-evidence reconciliation drift');
if(summary.regression.domains.filter((row)=>row.repository_promotion_allowed).length!==5)fail('five-domain repository-promotion denominator drift');
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
  ...computed
},null,2));
