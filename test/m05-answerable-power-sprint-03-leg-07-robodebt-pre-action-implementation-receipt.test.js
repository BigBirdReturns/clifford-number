#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  evaluateObservation
} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';
import {
  applyRobodebtPreActionImplementationReceipt,
  summarizeRobodebtPreActionImplementationReceipt
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const receiptPath=path.join(
  root,
  'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
);
const packetPath=path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json');
const promotionPath=path.join(
  root,
  'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
);
const contractPath=path.join(root,'data/project/m05-source-health-evidence-state-regression.json');
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const receipt=read(receiptPath);
const packet=read(packetPath);
const promotion=read(promotionPath);
const contract=read(contractPath);
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-robodebt-pre-action-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...env}
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeRobodebtPreActionImplementationReceipt(
  packet,
  promotion,
  receipt,
  contract
);
assert.equal(summary.audited_domains,5);
assert.equal(summary.adjudicated_receipts,3);
assert.equal(summary.claim_evidence_admissible,3);
assert.equal(summary.repository_promotion_allowed,3);
assert.equal(summary.advanced_answer_dimensions,1);
assert.equal(summary.robodebt_pre_action_timing,true);
assert.equal(summary.robodebt_durability,false);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.evidentiary_sufficiency,true);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.regression.domain_observations_evaluated,5);
assert.equal(summary.regression.admissible_domain_evidence_records,3);
assert.equal(summary.regression.effective_domain_answers,0);

const before=summary.applied.before_observation;
const after=summary.applied.after_observation;
assert.equal(before.answer.dimensions.pre_action_timing,false);
assert.equal(after.answer.dimensions.pre_action_timing,true);
assert.equal(before.answer.dimensions.durability,false);
assert.equal(after.answer.dimensions.durability,false);
assert.equal(before.answer.composed_durable_answer,false);
assert.equal(after.answer.composed_durable_answer,false);
assert.deepEqual(before.evidence,after.evidence);
assert.deepEqual(before.source_health,after.source_health);
assert.equal(before.answer.observed_outcome,after.answer.observed_outcome);

const targetEvaluation=evaluateObservation(after,contract);
assert.equal(targetEvaluation.claim_evidence_admissible,true);
assert.equal(targetEvaluation.repository_promotion_allowed,true);
assert.equal(targetEvaluation.answer_effective,false);
assert.equal(targetEvaluation.answer_failures.includes('dimension:pre_action_timing'),false);
assert.equal(targetEvaluation.answer_failures.includes('dimension:durability'),true);
assert.equal(targetEvaluation.answer_failures.includes('composed_durable_answer'),true);

const deficient=clone(after);
deficient.evidence.counterevidence_reviewed=false;
const deficientEvaluation=evaluateObservation(deficient,contract);
assert.equal(deficientEvaluation.claim_evidence_admissible,false);
assert.equal(deficientEvaluation.repository_promotion_allowed,false);
assert.equal(deficientEvaluation.answer_effective,false);

const appliedAgain=applyRobodebtPreActionImplementationReceipt(
  packet,
  promotion,
  receipt,
  contract
);
assert.deepEqual(appliedAgain.derived_contract.domain_observations.map((row)=>row.domain_id),[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01',
  'APC-EXIT-01',
  'APC-VALUE-01'
]);
assert.equal(appliedAgain.derived_contract.domain_observations[0].answer.dimensions.pre_action_timing,true);
assert.equal(appliedAgain.derived_contract.domain_observations[1].answer.dimensions.evidence_access,false);
assert.equal(appliedAgain.derived_contract.domain_observations[2].answer.dimensions.durability,false);
assert.equal(appliedAgain.derived_contract.domain_observations[3].promotes_to,'none');
assert.equal(appliedAgain.derived_contract.domain_observations[4].promotes_to,'none');

let mutationIndex=0;
const writeMutation=(value,label)=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);
  return target;
};
const expectReceiptFailure=(label,mutate)=>{
  const changed=clone(receipt);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectPacketFailure=(label,mutate)=>{
  const changed=clone(packet);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_OFFICIAL_RECEIPT_PACKET_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectPromotionFailure=(label,mutate)=>{
  const changed=clone(promotion);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_CLAIM_PROMOTION_ADJUDICATION_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectContractFailure=(label,mutate)=>{
  const changed=clone(contract);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_EVIDENCE_STATE_CONTRACT_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};

expectReceiptFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectReceiptFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectReceiptFailure('source-binding-drift',(row)=>{row.source_candidate_packet.blob_sha='0'.repeat(40)});
expectReceiptFailure('promotion-binding-drift',(row)=>{row.promotion_adjudication.blob_sha='0'.repeat(40)});
expectReceiptFailure('target-receipt-drift',(row)=>{row.target.receipt_id='M05-RC-WORK-IT-FOODINHO'});
expectReceiptFailure('target-domain-drift',(row)=>{row.target.domain_id='APC-WORK-01'});
expectReceiptFailure('target-dimension-drift',(row)=>{row.target.dimension='durability'});
expectReceiptFailure('transition-removal',(row)=>{row.target.after=false});
expectReceiptFailure('source-denominator-drift',(row)=>{row.implementation_sources.pop()});
expectReceiptFailure('source-order-drift',(row)=>{row.implementation_sources.reverse()});
expectReceiptFailure('source-host-substitution',(row)=>{row.implementation_sources[1].url='https://example.com/implementation'});
expectReceiptFailure('source-role-drift',(row)=>{row.implementation_sources[1].evidence_role='durability_support'});
expectReceiptFailure('source-locator-erasure',(row)=>{row.implementation_sources[0].locator=[]});
expectReceiptFailure('pre-action-support-removal',(row)=>{row.implementation_inference.pre_action_timing_supported=false});
expectReceiptFailure('durability-overclaim',(row)=>{row.implementation_inference.durability_supported=true});
expectReceiptFailure('assurance-overclaim',(row)=>{row.implementation_inference.direct_independent_assurance_result_published=true});
expectReceiptFailure('annual-review-overclaim',(row)=>{row.implementation_inference.public_annual_review_result_published=true});
expectReceiptFailure('subject-case-overclaim',(row)=>{row.implementation_inference.subject_level_pre_action_case_receipt_present=true});
expectReceiptFailure('other-answer-change',(row)=>{row.dimension_adjudication.changes_other_answer_dimensions=true});
expectReceiptFailure('retained-deficit-erasure',(row)=>{row.retained_deficits=[]});
expectReceiptFailure('effective-answer-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectReceiptFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectReceiptFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectReceiptFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});

expectPacketFailure('packet-claim-mutation',(row)=>{row.records[0].claim_binding.claim+=' mutated'});
expectPromotionFailure('promotion-answer-authorization',(row)=>{row.adjudications[0].answer_changes_authorized=true});
expectContractFailure('contract-answer-guard',(row)=>{row.answer_effectiveness_contract.formal_policy_alone_is_sufficient=true});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.test: OK');
