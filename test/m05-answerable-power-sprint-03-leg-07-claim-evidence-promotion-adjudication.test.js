#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateObservation} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';
import {
  CLAIM_PROMOTION_RECEIPT_IDS,
  applyClaimEvidencePromotionAdjudication,
  summarizeClaimEvidencePromotionAdjudication
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const adjudicationPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json');
const packetPath=path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json');
const contractPath=path.join(root,'data/project/m05-source-health-evidence-state-regression.json');
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const adjudication=read(adjudicationPath);
const packet=read(packetPath);
const contract=read(contractPath);
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-claim-promotion-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...env}
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeClaimEvidencePromotionAdjudication(packet,adjudication,contract);
assert.equal(summary.audited_domains,5);
assert.equal(summary.adjudicated_receipts,3);
assert.equal(summary.claim_evidence_admissible,3);
assert.equal(summary.repository_promotion_allowed,3);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.evidentiary_sufficiency,true);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.deepEqual(summary.applied.promoted_records.map((row)=>row.receipt_id),CLAIM_PROMOTION_RECEIPT_IDS);
assert.equal(summary.regression.domain_observations_evaluated,5);
assert.equal(summary.regression.admissible_domain_evidence_records,3);
assert.equal(summary.regression.effective_domain_answers,0);
assert.equal(summary.regression.domains.filter((row)=>row.claim_evidence_admissible&&row.repository_promotion_allowed).length,3);
assert.equal(summary.regression.domains.filter((row)=>row.answer_effective).length,0);

for(const row of summary.applied.promoted_records){
  assert.equal(row.authorized_claim,row.source_claim);
  assert.equal(row.observation.fixture_only,false);
  assert.equal(row.observation.promotes_to,'candidate_evidence');
  assert.equal(row.observation.evidence.promotion_authority,true);
  assert.equal(row.observation.evidence.promotion_ceiling,'claim_evidence');
  assert.deepEqual(row.observation.answer,row.source_observation.answer);
  assert.equal(row.observation.answer.composed_durable_answer,false);
  const evaluation=evaluateObservation(row.observation,contract);
  assert.equal(evaluation.claim_evidence_admissible,true);
  assert.equal(evaluation.repository_promotion_allowed,true);
  assert.equal(evaluation.answer_effective,false);
}

const deficient=clone(summary.applied.promoted_records[0].observation);
deficient.evidence.exact_claim_binding=false;
const deficientEvaluation=evaluateObservation(deficient,contract);
assert.equal(deficientEvaluation.claim_evidence_admissible,false);
assert.equal(deficientEvaluation.repository_promotion_allowed,false);
assert.equal(deficientEvaluation.answer_effective,false);

const applyAgain=applyClaimEvidencePromotionAdjudication(packet,adjudication,contract);
assert.deepEqual(applyAgain.derived_contract.domain_observations.map((row)=>row.domain_id),[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01',
  'APC-EXIT-01',
  'APC-VALUE-01'
]);
assert.equal(applyAgain.derived_contract.domain_observations[3].promotes_to,'none');
assert.equal(applyAgain.derived_contract.domain_observations[4].promotes_to,'none');

let mutationIndex=0;
const writeMutation=(value,label)=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);
  return target;
};
const expectAdjudicationFailure=(label,mutate)=>{
  const changed=clone(adjudication);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_CLAIM_PROMOTION_ADJUDICATION_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectPacketFailure=(label,mutate)=>{
  const changed=clone(packet);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_OFFICIAL_RECEIPT_PACKET_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectContractFailure=(label,mutate)=>{
  const changed=clone(contract);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({M05_EVIDENCE_STATE_CONTRACT_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};

expectAdjudicationFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAdjudicationFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAdjudicationFailure('source-blob-drift',(row)=>{row.source_candidate_packet.blob_sha='0'.repeat(40)});
expectAdjudicationFailure('human-review-overclaim',(row)=>{row.authority.human_review_claimed=true});
expectAdjudicationFailure('external-review-overclaim',(row)=>{row.authority.independent_external_review_claimed=true});
expectAdjudicationFailure('legal-authority-overclaim',(row)=>{row.authority.legal_or_fact_finding_authority_claimed=true});
expectAdjudicationFailure('missing-adjudication',(row)=>{row.adjudications.pop()});
expectAdjudicationFailure('duplicate-adjudication',(row)=>{row.adjudications[2]=clone(row.adjudications[1])});
expectAdjudicationFailure('domain-drift',(row)=>{row.adjudications[0].domain_id='APC-EXIT-01'});
expectAdjudicationFailure('claim-widening',(row)=>{row.adjudications[0].authorized_claim+=' This sentence widens the claim.'});
expectAdjudicationFailure('ceiling-widening',(row)=>{row.adjudications[0].promotion_ceiling='admitted_primary_evidence'});
expectAdjudicationFailure('promotion-target-removal',(row)=>{row.adjudications[0].promotes_to='none'});
expectAdjudicationFailure('authority-removal',(row)=>{row.adjudications[0].promotion_authority=false});
expectAdjudicationFailure('scope-widening-authorized',(row)=>{row.adjudications[0].claim_scope_widening_authorized=true});
expectAdjudicationFailure('answer-change-authorized',(row)=>{row.adjudications[0].answer_changes_authorized=true});
expectAdjudicationFailure('deficit-ledger-erasure',(row)=>{row.adjudications[0].preserved_deficits=[]});
expectAdjudicationFailure('answer-effectiveness-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectAdjudicationFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectAdjudicationFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectAdjudicationFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});

expectPacketFailure('source-packet-claim-mutation',(row)=>{row.records[0].claim_binding.claim+=' mutated'});
expectPacketFailure('source-packet-answer-mutation',(row)=>{row.records[1].observation.answer.dimensions.evidence_access=true});
expectContractFailure('contract-ceiling-mutation',(row)=>{row.evidence_admission_contract.required_promotion_ceiling='admitted_primary_evidence'});
expectContractFailure('contract-answer-guard-mutation',(row)=>{row.answer_effectiveness_contract.human_in_loop_alone_is_sufficient=true});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.test: OK');
