#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateObservation} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';
import {
  FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS,
  FIVE_DOMAIN_ROBODEBT_RECEIPT_ID,
  FIVE_DOMAIN_ROBODEBT_DOMAIN_ID,
  FIVE_DOMAIN_ROBODEBT_DIMENSION,
  applyFiveDomainClaimEvidenceReconciliation,
  summarizeFiveDomainClaimEvidenceReconciliation
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  reconciliation:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'),
  packet:path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json'),
  prior:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'),
  contract:path.join(root,'data/project/m05-source-health-evidence-state-regression.json'),
  robodebt:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'),
  intel:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  hfu:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-five-domain-reconciliation-'));

const inputs=(overrides={})=>({
  officialPacket:data.packet,
  priorAdjudication:data.prior,
  contract:data.contract,
  robodebtImplementationReceipt:data.robodebt,
  intelCandidate:data.intel,
  hfuCandidate:data.hfu,
  reconciliation:data.reconciliation,
  ...overrides
});
const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeFiveDomainClaimEvidenceReconciliation(inputs());
assert.equal(summary.audited_domains,5);
assert.equal(summary.prior_claim_evidence_admissible,3);
assert.equal(summary.newly_adjudicated_receipts,2);
assert.equal(summary.newly_claim_evidence_admissible,2);
assert.equal(summary.total_claim_evidence_admissible,5);
assert.equal(summary.total_repository_promotion_allowed,5);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.evidentiary_sufficiency,true);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.regression.domain_observations_evaluated,5);
assert.equal(summary.regression.admissible_domain_evidence_records,5);
assert.equal(summary.regression.effective_domain_answers,0);

const beforeDomains=summary.applied.pre_implementation_contract.domain_observations;
const finalDomains=summary.applied.derived_contract.domain_observations;
assert.deepEqual(beforeDomains.map((row)=>row.domain_id),finalDomains.map((row)=>row.domain_id));
for(let index=0;index<finalDomains.length;index+=1){
  const before=beforeDomains[index];
  const after=finalDomains[index];
  if(after.domain_id!==FIVE_DOMAIN_ROBODEBT_DOMAIN_ID){
    assert.deepEqual(after,before);
    continue;
  }
  const normalizedBefore=clone(before);
  const normalizedAfter=clone(after);
  normalizedBefore.answer.dimensions[FIVE_DOMAIN_ROBODEBT_DIMENSION]='__authorized_state__';
  normalizedAfter.answer.dimensions[FIVE_DOMAIN_ROBODEBT_DIMENSION]='__authorized_state__';
  assert.deepEqual(normalizedAfter,normalizedBefore);
  assert.equal(before.answer.dimensions.pre_action_timing,false);
  assert.equal(after.answer.dimensions.pre_action_timing,true);
  assert.equal(after.answer.dimensions.durability,false);
  assert.equal(after.answer.composed_durable_answer,false);
}

const finalRobodebt=finalDomains.find((row)=>row.domain_id===FIVE_DOMAIN_ROBODEBT_DOMAIN_ID);
assert.ok(finalRobodebt);
assert.deepEqual(finalRobodebt,summary.applied.robodebt_applied.after_observation);
const promotedRobodebt=summary.applied.all_promoted_records.find(
  (row)=>row.receipt_id===FIVE_DOMAIN_ROBODEBT_RECEIPT_ID
);
assert.ok(promotedRobodebt);
assert.deepEqual(promotedRobodebt.observation,finalRobodebt);
assert.deepEqual(promotedRobodebt.preserved_deficits,data.robodebt.retained_deficits);
assert.equal(promotedRobodebt.preserved_deficits.includes('dimension:pre_action_timing'),false);
assert.deepEqual(promotedRobodebt.preserved_deficits,[
  'composed_durable_answer',
  'dimension:durability'
]);

assert.deepEqual(
  summary.applied.additional_promoted_records.map((row)=>row.receipt_id),
  FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS
);
for(const row of summary.applied.additional_promoted_records){
  assert.equal(row.authorized_claim,row.source_claim);
  assert.equal(row.observation.promotes_to,'candidate_evidence');
  assert.equal(row.observation.evidence.promotion_authority,true);
  assert.equal(row.observation.evidence.promotion_ceiling,'claim_evidence');
  assert.deepEqual(row.observation.answer,row.source_observation.answer);
  const evaluation=evaluateObservation(row.observation,data.contract);
  assert.equal(evaluation.claim_evidence_admissible,true);
  assert.equal(evaluation.repository_promotion_allowed,true);
  assert.equal(evaluation.answer_effective,false);
}

assert.throws(
  ()=>summarizeFiveDomainClaimEvidenceReconciliation(
    inputs({robodebtImplementationReceipt:undefined})
  ),
  /missing Robodebt implementation receipt/
);

const appliedAgain=applyFiveDomainClaimEvidenceReconciliation(inputs());
assert.deepEqual(appliedAgain.derived_contract,summary.applied.derived_contract);
assert.equal(appliedAgain.all_promoted_records.length,5);
assert.deepEqual(
  appliedAgain.all_promoted_records.find(
    (row)=>row.receipt_id===FIVE_DOMAIN_ROBODEBT_RECEIPT_ID
  ).preserved_deficits,
  data.robodebt.retained_deficits
);

let mutationIndex=0;
const writeMutation=(value,label)=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);
  return target;
};
const expectFailure=(label,envName,source,mutate)=>{
  const changed=clone(source);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({[envName]:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};

expectFailure('robodebt-transition-removal','M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',data.robodebt,(row)=>{row.target.after=false});
expectFailure('robodebt-durability-overclaim','M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',data.robodebt,(row)=>{row.expected_result.robodebt_durability=true});
expectFailure('robodebt-resolved-deficit-reopened','M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',data.robodebt,(row)=>{row.retained_deficits.push('dimension:pre_action_timing')});
expectFailure('reconciliation-claim-widening','M05_FIVE_DOMAIN_RECONCILIATION_PATH',data.reconciliation,(row)=>{row.adjudications[0].authorized_claim+=' widened'});
expectFailure('reconciliation-answer-authorization','M05_FIVE_DOMAIN_RECONCILIATION_PATH',data.reconciliation,(row)=>{row.adjudications[0].answer_changes_authorized=true});
expectFailure('reconciliation-answer-overclaim','M05_FIVE_DOMAIN_RECONCILIATION_PATH',data.reconciliation,(row)=>{row.expected_result.answer_effectiveness=true});
expectFailure('reconciliation-closure-overclaim','M05_FIVE_DOMAIN_RECONCILIATION_PATH',data.reconciliation,(row)=>{row.boundaries.issue_345_may_close=true});
expectFailure('intel-realization-overclaim','M05_INTEL_RECEIPT_CANDIDATE_PATH',data.intel,(row)=>{row.receipt.instrument_chain.identified_federal_cash_receipt=true});
expectFailure('hfu-custody-overclaim','M05_HFU_RECEIPT_CANDIDATE_PATH',data.hfu,(row)=>{row.receipt.transition_chain.former_supplier_deletion_certificate=true});
expectFailure('prior-authority-removal','M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',data.prior,(row)=>{row.adjudications[0].promotion_authority=false});
expectFailure('packet-claim-mutation','M05_OFFICIAL_RECEIPT_PACKET_PATH',data.packet,(row)=>{row.records[0].claim_binding.claim+=' mutated'});
expectFailure('contract-answer-guard','M05_EVIDENCE_STATE_CONTRACT_PATH',data.contract,(row)=>{row.answer_effectiveness_contract.human_in_loop_alone_is_sufficient=true});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.test: OK');
