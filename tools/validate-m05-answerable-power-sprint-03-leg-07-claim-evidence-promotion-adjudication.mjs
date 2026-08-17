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
  OFFICIAL_RECEIPT_IDS,
  OFFICIAL_RECEIPT_DOMAINS,
  OFFICIAL_RECEIPT_JURISDICTIONS,
  validateOfficialReceiptCandidates
} from './lib/m05-cross-domain-official-receipt-candidates.mjs';
import {
  CLAIM_PROMOTION_RECEIPT_IDS,
  CLAIM_PROMOTION_DOMAIN_IDS,
  CLAIM_PROMOTION_JURISDICTIONS,
  summarizeClaimEvidencePromotionAdjudication
} from './lib/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const adjudicationPath=resolvePath(
  'M05_CLAIM_PROMOTION_ADJUDICATION_PATH',
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const packetPath=resolvePath(
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  'data/project/m05-cross-domain-official-receipt-candidates.json'
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
const sort=(values)=>[...values].sort();
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const clone=(value)=>JSON.parse(JSON.stringify(value));
const fail=(message)=>{throw new Error(message)};

const adjudication=readJson(adjudicationPath);
const packetRaw=readRaw(packetPath);
const packet=JSON.parse(packetRaw.toString('utf8'));
const contractRaw=readRaw(contractPath);
const contract=JSON.parse(contractRaw.toString('utf8'));
const packetBefore=JSON.stringify(packet);
const contractBefore=JSON.stringify(contract);

if(adjudication.schema_version!=='m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1')fail('adjudication schema drift');
if(adjudication.object_class!=='bounded_claim_evidence_promotion_adjudication')fail('adjudication object class drift');
if(adjudication.program_id!=='M-05'||adjudication.sprint_id!=='M05-SPRINT-03'||adjudication.leg_id!=='S03-L7')fail('adjudication program binding drift');
if(adjudication.issue!==345)fail('adjudication issue identity drift');
if(adjudication.as_of!=='2026-08-16')fail('adjudication as-of drift');
if(adjudication.status!=='candidate_evidence_promotion_adjudication_frozen')fail('adjudication status drift');
if(!text(adjudication.title,30)||!text(adjudication.question,100))fail('adjudication title or question is under-specified');

if(adjudication.canonical_base?.branch!=='main')fail('canonical branch drift');
if(adjudication.canonical_base?.sha!=='204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0')fail('canonical base drift');
if(adjudication.canonical_base?.tree_sha!=='6153b9128073f98871ca287002d74fade762d164')fail('canonical tree drift');

const packetBinding=adjudication.source_candidate_packet||{};
if(packetBinding.path!=='data/project/m05-cross-domain-official-receipt-candidates.json')fail('source packet path drift');
if(packetBinding.blob_sha!=='1c17549a39b826853435d3726596bf41d0fc7de9')fail('source packet declared blob drift');
if(gitBlobSha(packetRaw)!==packetBinding.blob_sha)fail('source packet Git object drift');
if(packetBinding.schema_version!=='m05-cross-domain-official-receipt-candidates@1')fail('source packet schema binding drift');
if(packetBinding.pull_request!==2151||packetBinding.merge_commit!=='204fb917a6fcef3d3a6fcf09186bf9c2de7ed2f0')fail('source packet publication binding drift');

const contractBinding=adjudication.evidence_state_contract||{};
if(contractBinding.path!=='data/project/m05-source-health-evidence-state-regression.json')fail('evidence-state contract path drift');
if(contractBinding.blob_sha!=='72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33')fail('evidence-state declared blob drift');
if(gitBlobSha(contractRaw)!==contractBinding.blob_sha)fail('evidence-state contract Git object drift');
if(contractBinding.schema_version!=='m05-source-health-evidence-state-regression@1')fail('evidence-state schema binding drift');
if(contractBinding.minimum_domains!==3||contractBinding.minimum_jurisdictions!==2)fail('evidence-state denominator drift');
if(contract.evidence_admission_contract.required_promotion_ceiling!=='claim_evidence')fail('claim-evidence ceiling drift');
if(contract.answer_effectiveness_contract.minimum_observed_domains!==3||contract.answer_effectiveness_contract.minimum_observed_jurisdictions!==2)fail('answer denominator drift');

const packetErrors=validateOfficialReceiptCandidates(packet,contract);
if(packetErrors.length>0)fail(`source packet invalid: ${packetErrors.join('; ')}`);

if(!same(CLAIM_PROMOTION_RECEIPT_IDS,OFFICIAL_RECEIPT_IDS))fail('promotion receipt denominator diverges from source packet');
if(!same(CLAIM_PROMOTION_DOMAIN_IDS,OFFICIAL_RECEIPT_DOMAINS))fail('promotion domain denominator diverges from source packet');
if(!same(CLAIM_PROMOTION_JURISDICTIONS,OFFICIAL_RECEIPT_JURISDICTIONS))fail('promotion jurisdiction denominator diverges from source packet');

const authority=adjudication.authority||{};
if(authority.authority_class!=='repository_owner_directed_candidate_evidence_adjudication')fail('authority class drift');
if(authority.repository_owner!=='BigBirdReturns')fail('repository owner authority drift');
if(!text(authority.authorization_basis,150))fail('authorization basis is under-specified');
if(authority.effective_event!=='merge_to_main')fail('authority effective event drift');
for(const key of ['human_review_claimed','independent_external_review_claimed','legal_or_fact_finding_authority_claimed']){
  if(authority[key]!==false)fail(`authority overclaim: ${key}`);
}
if(authority.authorized_evidence_scope!=='candidate evidence for the exact frozen claims only')fail('authorized evidence scope drift');
if(authority.authorized_answer_scope!=='none'||authority.authorized_graph_effect!=='none')fail('authority escaped evidence-only boundary');

const decisions=Array.isArray(adjudication.adjudications)?adjudication.adjudications:[];
if(decisions.length!==3)fail('adjudication denominator drift');
if(!same(decisions.map((row)=>row.receipt_id),CLAIM_PROMOTION_RECEIPT_IDS))fail('adjudication receipt identity or order drift');
if(new Set(decisions.map((row)=>row.receipt_id)).size!==decisions.length)fail('duplicate promotion adjudication');
if(!same(decisions.map((row)=>row.domain_id),CLAIM_PROMOTION_DOMAIN_IDS))fail('adjudication domain identity or order drift');
if(!same(decisions.map((row)=>row.jurisdiction),CLAIM_PROMOTION_JURISDICTIONS))fail('adjudication jurisdiction identity or order drift');

const recordsById=new Map(packet.records.map((row)=>[row.receipt_id,row]));
for(const decision of decisions){
  const source=recordsById.get(decision.receipt_id);
  if(!source)fail(`missing source record ${decision.receipt_id}`);
  if(source.domain_id!==decision.domain_id||source.jurisdiction!==decision.jurisdiction)fail(`${decision.receipt_id} source identity drift`);
  if(decision.authorized_claim!==source.claim_binding.claim)fail(`${decision.receipt_id} authorized claim widened or changed`);
  if(decision.promotion_authority!==true)fail(`${decision.receipt_id} lacks explicit promotion authority`);
  if(decision.promotion_ceiling!=='claim_evidence')fail(`${decision.receipt_id} promotion ceiling drift`);
  if(decision.promotes_to!=='candidate_evidence')fail(`${decision.receipt_id} repository promotion target drift`);
  if(decision.claim_scope_widening_authorized!==false)fail(`${decision.receipt_id} authorizes claim-scope widening`);
  if(decision.answer_changes_authorized!==false)fail(`${decision.receipt_id} authorizes answer mutation`);
  const expectedDeficits=source.deficits.filter((value)=>value!=='promotion_authority');
  if(!same(sort(decision.preserved_deficits||[]),sort(expectedDeficits)))fail(`${decision.receipt_id} preserved deficit ledger drift`);
}

const summary=summarizeClaimEvidencePromotionAdjudication(packet,adjudication,contract);
if(JSON.stringify(packet)!==packetBefore)fail('promotion application mutated the source packet');
if(JSON.stringify(contract)!==contractBefore)fail('promotion application mutated the evidence-state contract');

const normalizeObservation=(value)=>{
  const normalized=clone(value);
  delete normalized.expected;
  normalized.promotes_to='__promotion_field__';
  normalized.evidence.promotion_authority='__promotion_field__';
  normalized.evidence.promotion_ceiling='__promotion_field__';
  return normalized;
};

for(const promoted of summary.applied.promoted_records){
  if(promoted.authorized_claim!==promoted.source_claim)fail(`${promoted.receipt_id} output claim drift`);
  if(!same(normalizeObservation(promoted.observation),normalizeObservation(promoted.source_observation)))fail(`${promoted.receipt_id} changed fields outside the promotion boundary`);
  if(!same(promoted.observation.answer,promoted.source_observation.answer))fail(`${promoted.receipt_id} answer state changed during promotion`);
  if(!same(promoted.observation.source_health,promoted.source_observation.source_health))fail(`${promoted.receipt_id} source-health state changed during promotion`);
  for(const gate of EVIDENCE_BOOLEAN_GATES){
    if(promoted.observation.evidence[gate]!==true)fail(`${promoted.receipt_id} promoted evidence gate ${gate} is not true`);
  }
  if(promoted.observation.evidence.promotion_ceiling!=='claim_evidence')fail(`${promoted.receipt_id} promoted evidence ceiling drift`);
  if(promoted.observation.promotes_to!=='candidate_evidence')fail(`${promoted.receipt_id} promoted repository state drift`);
  const evaluation=evaluateObservation(promoted.observation,contract);
  if(evaluation.claim_evidence_admissible!==true)fail(`${promoted.receipt_id} failed claim-evidence admission`);
  if(evaluation.repository_promotion_allowed!==true)fail(`${promoted.receipt_id} failed candidate-evidence promotion`);
  if(evaluation.answer_effective!==false)fail(`${promoted.receipt_id} escaped answer-effectiveness boundary`);
}

if(summary.regression.source_health_healthy!==true)fail('source-health receipt drift');
if(summary.regression.domain_observations_evaluated!==5)fail('five-domain denominator drift');
if(summary.regression.admissible_domain_evidence_records!==3)fail('admissible evidence denominator drift');
if(summary.regression.effective_domain_answers!==0)fail('effective answer denominator drift');
if(summary.regression.evidentiary_sufficiency!==true)fail('claim-scoped evidentiary sufficiency did not open');
if(summary.regression.answer_effectiveness!==false)fail('answer effectiveness improperly opened');
if(summary.regression.cross_domain_regression_completed!==false)fail('cross-domain regression improperly completed');

const computed={
  audited_domains:summary.audited_domains,
  adjudicated_receipts:summary.adjudicated_receipts,
  claim_evidence_admissible:summary.claim_evidence_admissible,
  repository_promotion_allowed:summary.repository_promotion_allowed,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  evidentiary_sufficiency:summary.evidentiary_sufficiency,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(computed,adjudication.expected_result))fail('expected promotion result drift');
if(!text(adjudication.scope_note,120))fail('claim-scoped evidentiary sufficiency note is under-specified');

const boundaries=adjudication.boundaries||{};
for(const key of [
  'changes_source_health_contract',
  'changes_original_candidate_packet',
  'promotes_beyond_exact_claims',
  'claims_independent_external_review',
  'claims_human_review',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`adjudication boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='candidate_only'||boundaries.graph_effect!=='none')fail('adjudication repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication',
  ...computed
},null,2));
