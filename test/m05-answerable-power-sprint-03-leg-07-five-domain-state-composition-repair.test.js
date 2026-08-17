#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateObservation} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';
import {
  FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID,
  FIVE_DOMAIN_STATE_REPAIR_DIMENSION,
  applyFiveDomainStateCompositionRepair,
  summarizeFiveDomainStateCompositionRepair
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-state-composition-repair.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  repair:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-state-composition-repair.json'),
  packet:path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json'),
  prior:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'),
  contract:path.join(root,'data/project/m05-source-health-evidence-state-regression.json'),
  robodebt:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'),
  fiveDomain:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'),
  intel:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  hfu:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const repair=read(paths.repair);
const officialPacket=read(paths.packet);
const priorAdjudication=read(paths.prior);
const contract=read(paths.contract);
const robodebtImplementationReceipt=read(paths.robodebt);
const fiveDomainReconciliation=read(paths.fiveDomain);
const intelCandidate=read(paths.intel);
const hfuCandidate=read(paths.hfu);
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-five-domain-state-composition-'));

const inputs=()=>({
  officialPacket,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  fiveDomainReconciliation,
  intelCandidate,
  hfuCandidate
});
const observationForDomain=(derived,domainId)=>
  derived.domain_observations.find((row)=>row.domain_id===domainId);

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-state-composition-repair.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...env}
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const sourceObjects=[
  officialPacket,
  priorAdjudication,
  contract,
  robodebtImplementationReceipt,
  fiveDomainReconciliation,
  intelCandidate,
  hfuCandidate
];
const sourceSnapshots=sourceObjects.map((value)=>JSON.stringify(value));
const summary=summarizeFiveDomainStateCompositionRepair(inputs());
assert.equal(summary.audited_domains,5);
assert.equal(summary.claim_evidence_admissible,5);
assert.equal(summary.repository_promotion_allowed,5);
assert.equal(summary.advanced_answer_dimensions,1);
assert.equal(summary.five_domain_baseline_robodebt_pre_action_timing,false);
assert.equal(summary.canonical_robodebt_pre_action_timing,true);
assert.equal(summary.robodebt_pre_action_timing,true);
assert.equal(summary.robodebt_durability,false);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.evidentiary_sufficiency,true);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.regression.domain_observations_evaluated,5);
assert.equal(summary.regression.admissible_domain_evidence_records,5);
assert.equal(summary.regression.effective_domain_answers,0);
assert.equal(summary.regression.domains.filter((row)=>row.repository_promotion_allowed).length,5);

for(const [index,value] of sourceObjects.entries()){
  assert.equal(JSON.stringify(value),sourceSnapshots[index]);
}

const baselineDomains=summary.applied.five_domain_baseline.applied.derived_contract.domain_observations;
const finalDomains=summary.applied.final_contract.domain_observations;
assert.deepEqual(baselineDomains.map((row)=>row.domain_id),[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01',
  'APC-EXIT-01',
  'APC-VALUE-01'
]);
assert.deepEqual(finalDomains.map((row)=>row.domain_id),baselineDomains.map((row)=>row.domain_id));

for(let index=0;index<finalDomains.length;index+=1){
  const before=baselineDomains[index];
  const after=finalDomains[index];
  if(after.domain_id!==FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID){
    assert.deepEqual(after,before);
    continue;
  }
  const normalizedBefore=clone(before);
  const normalizedAfter=clone(after);
  normalizedBefore.answer.dimensions[FIVE_DOMAIN_STATE_REPAIR_DIMENSION]='__authorized_state__';
  normalizedAfter.answer.dimensions[FIVE_DOMAIN_STATE_REPAIR_DIMENSION]='__authorized_state__';
  assert.deepEqual(normalizedAfter,normalizedBefore);
  assert.equal(before.answer.dimensions.pre_action_timing,false);
  assert.equal(after.answer.dimensions.pre_action_timing,true);
}

const finalRobodebt=observationForDomain(summary.applied.final_contract,FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID);
assert.ok(finalRobodebt);
assert.deepEqual(finalRobodebt,summary.robodebt_summary.applied.after_observation);
assert.equal(finalRobodebt.answer.dimensions.pre_action_timing,true);
assert.equal(finalRobodebt.answer.dimensions.durability,false);
assert.equal(finalRobodebt.answer.composed_durable_answer,false);
const targetEvaluation=evaluateObservation(finalRobodebt,contract);
assert.equal(targetEvaluation.claim_evidence_admissible,true);
assert.equal(targetEvaluation.repository_promotion_allowed,true);
assert.equal(targetEvaluation.answer_effective,false);
assert.equal(targetEvaluation.answer_failures.includes('dimension:pre_action_timing'),false);
assert.equal(targetEvaluation.answer_failures.includes('dimension:durability'),true);
assert.equal(targetEvaluation.answer_failures.includes('composed_durable_answer'),true);

assert.deepEqual(summary.applied.additional_promoted_records.map((row)=>row.receipt_id),[
  'M05-RC-VALUE-US-INTEL-CHIPS-EQUITY',
  'M05-RC-EXIT-UK-HFU-SHARE'
]);
for(const promoted of summary.applied.additional_promoted_records){
  assert.equal(promoted.authorized_claim,promoted.source_claim);
  assert.deepEqual(promoted.observation.answer,promoted.source_observation.answer);
  assert.deepEqual(promoted.observation.source_health,promoted.source_observation.source_health);
  assert.equal(promoted.observation.promotes_to,'candidate_evidence');
  assert.equal(promoted.observation.evidence.promotion_authority,true);
  assert.equal(promoted.observation.evidence.promotion_ceiling,'claim_evidence');
  const evaluation=evaluateObservation(promoted.observation,contract);
  assert.equal(evaluation.claim_evidence_admissible,true);
  assert.equal(evaluation.repository_promotion_allowed,true);
  assert.equal(evaluation.answer_effective,false);
}

const appliedAgain=applyFiveDomainStateCompositionRepair(inputs());
assert.deepEqual(appliedAgain.final_contract,summary.applied.final_contract);
assert.equal(
  observationForDomain(appliedAgain.final_contract,FIVE_DOMAIN_STATE_REPAIR_DOMAIN_ID)
    .answer.dimensions.pre_action_timing,
  true
);

const deficient=clone(finalRobodebt);
deficient.evidence.counterevidence_reviewed=false;
const deficientEvaluation=evaluateObservation(deficient,contract);
assert.equal(deficientEvaluation.claim_evidence_admissible,false);
assert.equal(deficientEvaluation.repository_promotion_allowed,false);
assert.equal(deficientEvaluation.answer_effective,false);

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
const expectRepairFailure=(label,mutate)=>expectFailure(
  label,
  'M05_FIVE_DOMAIN_STATE_COMPOSITION_REPAIR_PATH',
  repair,
  mutate
);

expectRepairFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectRepairFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectRepairFailure('canonical-tree-drift',(row)=>{row.canonical_base.tree_sha='0'.repeat(40)});
expectRepairFailure('five-domain-binding-drift',(row)=>{row.bindings.five_domain_reconciliation.blob_sha='0'.repeat(40)});
expectRepairFailure('robodebt-binding-drift',(row)=>{row.bindings.robodebt_pre_action_implementation_receipt.blob_sha='0'.repeat(40)});
expectRepairFailure('defect-class-drift',(row)=>{row.defect.defect_class='empirical_dispute'});
expectRepairFailure('before-state-erasure',(row)=>{row.defect.prior_five_domain_robodebt_pre_action_timing=true});
expectRepairFailure('canonical-state-erasure',(row)=>{row.defect.canonical_robodebt_implementation_after=false});
expectRepairFailure('empirical-change-overclaim',(row)=>{row.defect.empirical_claim_changed=true});
expectRepairFailure('human-review-overclaim',(row)=>{row.authority.human_review_claimed=true});
expectRepairFailure('external-review-overclaim',(row)=>{row.authority.independent_external_review_claimed=true});
expectRepairFailure('answer-authority-widening',(row)=>{row.authority.authorized_answer_scope='all five domains'});
expectRepairFailure('target-receipt-drift',(row)=>{row.target.receipt_id='M05-RC-WORK-IT-FOODINHO'});
expectRepairFailure('target-domain-drift',(row)=>{row.target.domain_id='APC-WORK-01'});
expectRepairFailure('target-dimension-drift',(row)=>{row.target.dimension='durability'});
expectRepairFailure('transition-removal',(row)=>{row.target.composed_after=false});
expectRepairFailure('durability-overclaim',(row)=>{row.target.durability_after=true});
expectRepairFailure('claim-denominator-inflation',(row)=>{row.expected_result.claim_evidence_admissible=6});
expectRepairFailure('answer-effectiveness-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectRepairFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectRepairFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectRepairFailure('other-dimension-authorization',(row)=>{row.boundaries.changes_any_dimension_other_than_robodebt_pre_action_timing=true});
expectRepairFailure('new-receipt-overclaim',(row)=>{row.boundaries.creates_new_empirical_receipt=true});
expectRepairFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});

expectFailure('source-packet-mutation','M05_OFFICIAL_RECEIPT_PACKET_PATH',officialPacket,(row)=>{row.records[0].claim_binding.claim+=' mutated'});
expectFailure('prior-promotion-mutation','M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',priorAdjudication,(row)=>{row.adjudications[0].promotion_authority=false});
expectFailure('contract-mutation','M05_EVIDENCE_STATE_CONTRACT_PATH',contract,(row)=>{row.answer_effectiveness_contract.human_in_loop_alone_is_sufficient=true});
expectFailure('robodebt-state-mutation','M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',robodebtImplementationReceipt,(row)=>{row.target.after=false});
expectFailure('five-domain-claim-mutation','M05_FIVE_DOMAIN_RECONCILIATION_PATH',fiveDomainReconciliation,(row)=>{row.adjudications[0].authorized_claim+=' widened'});
expectFailure('intel-realization-mutation','M05_INTEL_RECEIPT_CANDIDATE_PATH',intelCandidate,(row)=>{row.receipt.instrument_chain.identified_federal_cash_receipt=true});
expectFailure('hfu-custody-mutation','M05_HFU_RECEIPT_CANDIDATE_PATH',hfuCandidate,(row)=>{row.receipt.transition_chain.former_supplier_deletion_certificate=true});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-five-domain-state-composition-repair.test: OK');
