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
  applyFiveDomainClaimEvidenceReconciliation,
  summarizeFiveDomainClaimEvidenceReconciliation
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reconciliationPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json');
const packetPath=path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json');
const priorAdjudicationPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json');
const contractPath=path.join(root,'data/project/m05-source-health-evidence-state-regression.json');
const intelPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json');
const hfuPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json');
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const reconciliation=read(reconciliationPath);
const officialPacket=read(packetPath);
const priorAdjudication=read(priorAdjudicationPath);
const contract=read(contractPath);
const intelCandidate=read(intelPath);
const hfuCandidate=read(hfuPath);
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-five-domain-reconciliation-'));

const inputs=()=>({
  officialPacket,
  priorAdjudication,
  contract,
  intelCandidate,
  hfuCandidate,
  reconciliation
});

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...env}
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const sourceSnapshots=[officialPacket,priorAdjudication,contract,intelCandidate,hfuCandidate].map((value)=>JSON.stringify(value));
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
assert.deepEqual(summary.applied.additional_promoted_records.map((row)=>row.receipt_id),FIVE_DOMAIN_ADDITIONAL_RECEIPT_IDS);
assert.equal(summary.regression.domain_observations_evaluated,5);
assert.equal(summary.regression.admissible_domain_evidence_records,5);
assert.equal(summary.regression.effective_domain_answers,0);
assert.equal(summary.regression.domains.filter((row)=>row.claim_evidence_admissible&&row.repository_promotion_allowed).length,5);
assert.equal(summary.regression.domains.filter((row)=>row.answer_effective).length,0);

for(const row of summary.applied.additional_promoted_records){
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

const intelPromoted=summary.applied.additional_promoted_records.find((row)=>row.receipt_id==='M05-RC-VALUE-US-INTEL-CHIPS-EQUITY');
assert.ok(intelPromoted);
assert.equal(intelPromoted.source_instrument_chain.realized_sale_dividend_or_warrant_exercise,false);
assert.equal(intelPromoted.source_instrument_chain.identified_federal_cash_receipt,false);
assert.equal(intelPromoted.source_instrument_chain.transparent_public_or_affected_party_distribution,false);
assert.equal(intelPromoted.observation.answer.dimensions.practical_exit_or_governance,false);

const hfuPromoted=summary.applied.additional_promoted_records.find((row)=>row.receipt_id==='M05-RC-EXIT-UK-HFU-SHARE');
assert.ok(hfuPromoted);
assert.equal(hfuPromoted.source_instrument_chain.independent_end_to_end_migration_assurance,false);
assert.equal(hfuPromoted.source_instrument_chain.former_supplier_deletion_certificate,false);
assert.equal(hfuPromoted.source_instrument_chain.affected_party_post_exit_governance,false);
assert.equal(hfuPromoted.observation.answer.dimensions.practical_exit_or_governance,true);
assert.equal(hfuPromoted.observation.answer.dimensions.durability,false);

for(const [index,value] of [officialPacket,priorAdjudication,contract,intelCandidate,hfuCandidate].entries()){
  assert.equal(JSON.stringify(value),sourceSnapshots[index]);
}

const deficient=clone(intelPromoted.observation);
deficient.evidence.exact_claim_binding=false;
const deficientEvaluation=evaluateObservation(deficient,contract);
assert.equal(deficientEvaluation.claim_evidence_admissible,false);
assert.equal(deficientEvaluation.repository_promotion_allowed,false);
assert.equal(deficientEvaluation.answer_effective,false);

const applyAgain=applyFiveDomainClaimEvidenceReconciliation(inputs());
assert.deepEqual(applyAgain.derived_contract.domain_observations.map((row)=>row.domain_id),[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01',
  'APC-EXIT-01',
  'APC-VALUE-01'
]);
assert.equal(applyAgain.derived_contract.domain_observations.every((row)=>row.promotes_to==='candidate_evidence'),true);
assert.equal(applyAgain.derived_contract.domain_observations.every((row)=>row.evidence.promotion_authority===true),true);
assert.equal(applyAgain.derived_contract.domain_observations.every((row)=>row.answer.composed_durable_answer===false),true);

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
const expectReconciliationFailure=(label,mutate)=>expectFailure(
  label,
  'M05_FIVE_DOMAIN_RECONCILIATION_PATH',
  reconciliation,
  mutate
);

expectReconciliationFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectReconciliationFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectReconciliationFailure('canonical-tree-drift',(row)=>{row.canonical_base.tree_sha='0'.repeat(40)});
expectReconciliationFailure('intel-blob-drift',(row)=>{row.bindings.intel_receipt_candidate.blob_sha='0'.repeat(40)});
expectReconciliationFailure('hfu-blob-drift',(row)=>{row.bindings.hfu_receipt_candidate.blob_sha='0'.repeat(40)});
expectReconciliationFailure('human-review-overclaim',(row)=>{row.authority.human_review_claimed=true});
expectReconciliationFailure('external-review-overclaim',(row)=>{row.authority.independent_external_review_claimed=true});
expectReconciliationFailure('legal-authority-overclaim',(row)=>{row.authority.legal_or_fact_finding_authority_claimed=true});
expectReconciliationFailure('missing-adjudication',(row)=>{row.adjudications.pop()});
expectReconciliationFailure('duplicate-adjudication',(row)=>{row.adjudications[1]=clone(row.adjudications[0])});
expectReconciliationFailure('domain-drift',(row)=>{row.adjudications[0].domain_id='APC-EXIT-01'});
expectReconciliationFailure('claim-widening',(row)=>{row.adjudications[0].authorized_claim+=' This sentence widens the claim.'});
expectReconciliationFailure('ceiling-widening',(row)=>{row.adjudications[0].promotion_ceiling='admitted_primary_evidence'});
expectReconciliationFailure('promotion-target-removal',(row)=>{row.adjudications[0].promotes_to='none'});
expectReconciliationFailure('authority-removal',(row)=>{row.adjudications[0].promotion_authority=false});
expectReconciliationFailure('scope-widening-authorized',(row)=>{row.adjudications[0].claim_scope_widening_authorized=true});
expectReconciliationFailure('answer-change-authorized',(row)=>{row.adjudications[0].answer_changes_authorized=true});
expectReconciliationFailure('deficit-ledger-erasure',(row)=>{row.adjudications[0].preserved_deficits=[]});
expectReconciliationFailure('intel-realization-overclaim',(row)=>{row.adjudications[0].guarded_nonfindings.realized_sale_dividend_or_warrant_exercise=true});
expectReconciliationFailure('hfu-sovereignty-overclaim',(row)=>{row.adjudications[1].guarded_nonfindings.supplier_free_operation=true});
expectReconciliationFailure('total-claim-inflation',(row)=>{row.expected_result.total_claim_evidence_admissible=6});
expectReconciliationFailure('answer-effectiveness-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectReconciliationFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectReconciliationFailure('all-five-answer-overclaim',(row)=>{row.boundaries.all_five_claims_admitted_is_cross_domain_answer=true});
expectReconciliationFailure('intel-return-overclaim',(row)=>{row.boundaries.intel_equity_operation_is_realized_return=true});
expectReconciliationFailure('hfu-sovereignty-boundary-overclaim',(row)=>{row.boundaries.hfu_supplier_exit_is_complete_sovereignty=true});
expectReconciliationFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectReconciliationFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});

expectFailure('intel-source-claim-mutation','M05_INTEL_RECEIPT_CANDIDATE_PATH',intelCandidate,(row)=>{row.receipt.claim_binding.claim+=' mutated'});
expectFailure('intel-realization-mutation','M05_INTEL_RECEIPT_CANDIDATE_PATH',intelCandidate,(row)=>{row.receipt.instrument_chain.identified_federal_cash_receipt=true});
expectFailure('hfu-source-claim-mutation','M05_HFU_RECEIPT_CANDIDATE_PATH',hfuCandidate,(row)=>{row.receipt.claim_binding.claim+=' mutated'});
expectFailure('hfu-deletion-mutation','M05_HFU_RECEIPT_CANDIDATE_PATH',hfuCandidate,(row)=>{row.receipt.transition_chain.former_supplier_deletion_certificate=true});
expectFailure('prior-adjudication-mutation','M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',priorAdjudication,(row)=>{row.adjudications[0].promotion_authority=false});
expectFailure('source-packet-mutation','M05_OFFICIAL_RECEIPT_PACKET_PATH',officialPacket,(row)=>{row.records[0].claim_binding.claim+=' mutated'});
expectFailure('contract-ceiling-mutation','M05_EVIDENCE_STATE_CONTRACT_PATH',contract,(row)=>{row.evidence_admission_contract.required_promotion_ceiling='admitted_primary_evidence'});
expectFailure('contract-answer-guard-mutation','M05_EVIDENCE_STATE_CONTRACT_PATH',contract,(row)=>{row.answer_effectiveness_contract.human_in_loop_alone_is_sufficient=true});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.test: OK');
