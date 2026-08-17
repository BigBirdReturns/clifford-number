#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  ANSWER_DIMENSIONS,
  ANSWER_SUFFICIENCY_GUARDS,
  EVIDENCE_BOOLEAN_GATES,
  EVIDENCE_SUFFICIENCY_GUARDS,
  evaluateObservation,
  evaluateRegression
} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';
import {
  OFFICIAL_RECEIPT_DIMENSION_GAPS,
  OFFICIAL_RECEIPT_IDS,
  summarizeOfficialReceiptCandidates,
  validateOfficialReceiptCandidates
} from '../tools/lib/m05-cross-domain-official-receipt-candidates.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-source-health-evidence-state-regression.json'),'utf8'));
const audit=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'),'utf8'));
const officialCandidates=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json'),'utf8'));
const runValidator=(auditPath)=>spawnSync(process.execPath,['tools/validate-m05-source-health-evidence-state-regression.mjs'],{
  cwd:root,
  encoding:'utf8',
  env:auditPath?{...process.env,M05_REAL_RECEIPT_AUDIT_PATH:auditPath}:process.env
});
const run=runValidator();
if(run.status!==0){console.error(run.stdout);console.error(run.stderr);throw new Error('validator failed')}

const control=(id)=>structuredClone(contract.controls.find((row)=>row.control_id===id));
const promotedAnswer=(id,jurisdiction)=>{
  const row=control('PC-OBSERVED-DURABLE-ANSWER');
  delete row.control_id;
  row.domain_id=id;
  row.jurisdiction=jurisdiction;
  row.fixture_only=false;
  row.promotes_to='candidate_evidence';
  return row;
};
const evidencePositive=control('PC-CLAIM-BOUND-PRIMARY');
const answerPositive=control('PC-OBSERVED-DURABLE-ANSWER');
assert.equal(evaluateObservation(evidencePositive,contract).claim_evidence_admissible,true);
assert.equal(evaluateObservation(evidencePositive,contract).answer_effective,false);
assert.equal(evaluateObservation(answerPositive,contract).claim_evidence_admissible,true);
assert.equal(evaluateObservation(answerPositive,contract).answer_effective,true);

for(const gate of EVIDENCE_BOOLEAN_GATES){
  const mutation=control('PC-CLAIM-BOUND-PRIMARY');
  mutation.evidence[gate]=false;
  const result=evaluateObservation(mutation,contract);
  assert.equal(result.claim_evidence_admissible,false,`${gate} mutation must refuse claim evidence`);
  assert.ok(result.evidence_failures.includes(gate));
}

for(const guard of EVIDENCE_SUFFICIENCY_GUARDS){
  for(const invalidValue of [true,undefined]){
    const mutation=structuredClone(contract);
    if(invalidValue===undefined)delete mutation.evidence_admission_contract[guard];
    else mutation.evidence_admission_contract[guard]=invalidValue;
    const result=evaluateObservation(evidencePositive,mutation);
    assert.equal(result.claim_evidence_admissible,false,`${guard} must fail closed when ${invalidValue===undefined?'missing':'true'}`);
    assert.ok(result.evidence_failures.includes(`contract_guard:${guard}`));
  }
}

for(const sourceClass of ['official_feed','official_repository_content','public_index_catalog','missing']){
  const mutation=control('PC-CLAIM-BOUND-PRIMARY');
  mutation.evidence.source_class=sourceClass;
  assert.equal(evaluateObservation(mutation,contract).claim_evidence_admissible,false,`${sourceClass} must not satisfy the claim-evidence source class gate`);
}

for(const ceiling of ['locator_only','repository_content','metadata_only']){
  const mutation=control('PC-CLAIM-BOUND-PRIMARY');
  mutation.evidence.promotion_ceiling=ceiling;
  assert.equal(evaluateObservation(mutation,contract).claim_evidence_admissible,false,`${ceiling} must not satisfy the claim-evidence promotion ceiling`);
}

for(const health of [
  {coverage_healthy:true,route_healthy:true,content_healthy:true},
  {coverage_healthy:false,route_healthy:false,content_healthy:false}
]){
  const mutation=control('PC-CLAIM-BOUND-PRIMARY');
  mutation.source_health=health;
  assert.equal(evaluateObservation(mutation,contract).claim_evidence_admissible,true,'global source health must remain independent from a complete claim-level receipt');
}

for(const dimension of ANSWER_DIMENSIONS){
  const mutation=control('PC-OBSERVED-DURABLE-ANSWER');
  mutation.answer.dimensions[dimension]=false;
  const result=evaluateObservation(mutation,contract);
  assert.equal(result.answer_effective,false,`${dimension} mutation must refuse answer effectiveness`);
  assert.ok(result.answer_failures.includes(`dimension:${dimension}`));
}

for(const guard of ANSWER_SUFFICIENCY_GUARDS){
  for(const invalidValue of [true,undefined]){
    const mutation=structuredClone(contract);
    if(invalidValue===undefined)delete mutation.answer_effectiveness_contract[guard];
    else mutation.answer_effectiveness_contract[guard]=invalidValue;
    const result=evaluateObservation(answerPositive,mutation);
    assert.equal(result.answer_effective,false,`${guard} must fail closed when ${invalidValue===undefined?'missing':'true'}`);
    assert.ok(result.answer_failures.includes(`contract_guard:${guard}`));
  }
}

for(const [field,value] of [
  ['observed_domains',2],
  ['observed_jurisdictions',1],
  ['observed_outcome',false],
  ['composed_durable_answer',false]
]){
  const mutation=control('PC-OBSERVED-DURABLE-ANSWER');
  mutation.answer[field]=value;
  assert.equal(evaluateObservation(mutation,contract).answer_effective,false,`${field} mutation must refuse answer effectiveness`);
}

for(const row of contract.controls){
  const result=evaluateObservation(row,contract);
  assert.equal(result.repository_promotion_allowed,false,'fixture controls must never promote repository state');
}

const completedContract=structuredClone(contract);
completedContract.domain_observations=[
  promotedAnswer('D1','J1'),
  promotedAnswer('D2','J1'),
  promotedAnswer('D3','J2')
];
let promoted=evaluateRegression(completedContract);
assert.equal(promoted.admissible_domain_evidence_records,3);
assert.equal(promoted.effective_domain_answers,3);
assert.equal(promoted.cross_domain_regression_completed,true);

const evidenceOnlyContract=structuredClone(completedContract);
for(const row of evidenceOnlyContract.domain_observations){
  row.answer.observed_outcome=false;
  row.answer.composed_durable_answer=false;
  row.answer.dimensions={};
}
promoted=evaluateRegression(evidenceOnlyContract);
assert.equal(promoted.admissible_domain_evidence_records,3);
assert.equal(promoted.effective_domain_answers,0);
assert.equal(promoted.cross_domain_regression_completed,false,'claim-admissible promotion without effective answers must not complete the regression');

const jurisdictionLeakContract=structuredClone(contract);
jurisdictionLeakContract.domain_observations=[
  promotedAnswer('D1','J1'),
  promotedAnswer('D2','J1'),
  promotedAnswer('D3','J1'),
  promotedAnswer('D4','J2')
];
jurisdictionLeakContract.domain_observations[3].answer.observed_outcome=false;
promoted=evaluateRegression(jurisdictionLeakContract);
assert.equal(promoted.admissible_domain_evidence_records,4);
assert.equal(promoted.effective_domain_answers,3);
assert.equal(promoted.cross_domain_regression_completed,false,'an ineffective answer must not supply a qualifying jurisdiction');

assert.deepEqual(validateOfficialReceiptCandidates(officialCandidates,contract),[]);
assert.deepEqual(summarizeOfficialReceiptCandidates(officialCandidates,contract),officialCandidates.expected_state);
assert.deepEqual(officialCandidates.records.map((row)=>row.receipt_id),OFFICIAL_RECEIPT_IDS);

for(const row of officialCandidates.records){
  const evaluation=evaluateObservation(row.observation,contract);
  assert.equal(evaluation.claim_evidence_admissible,false,`${row.receipt_id} must remain below claim evidence`);
  assert.equal(evaluation.answer_effective,false,`${row.receipt_id} must remain below answer effectiveness`);
  assert.equal(evaluation.repository_promotion_allowed,false,`${row.receipt_id} must remain repository content`);
  const observedGaps=ANSWER_DIMENSIONS.filter((dimension)=>row.observation.answer.dimensions[dimension]===false);
  assert.deepEqual(observedGaps,OFFICIAL_RECEIPT_DIMENSION_GAPS[row.receipt_id],`${row.receipt_id} dimension-gap ledger drift`);

  const authorityOnly=structuredClone(row.observation);
  authorityOnly.evidence.promotion_authority=true;
  assert.equal(evaluateObservation(authorityOnly,contract).claim_evidence_admissible,false,`${row.receipt_id} must not promote while the ceiling remains repository_content`);

  const claimBound=structuredClone(row.observation);
  claimBound.evidence.promotion_authority=true;
  claimBound.evidence.promotion_ceiling='claim_evidence';
  claimBound.promotes_to='candidate_evidence';
  const claimBoundEvaluation=evaluateObservation(claimBound,contract);
  assert.equal(claimBoundEvaluation.claim_evidence_admissible,true,`${row.receipt_id} complete evidence gates should remain discriminating`);
  assert.equal(claimBoundEvaluation.answer_effective,false,`${row.receipt_id} missing answer dimensions must still fail closed`);
  assert.equal(claimBoundEvaluation.repository_promotion_allowed,true,`${row.receipt_id} synthetic promotion mutation should reach only candidate evidence`);
}

const insecureUrl=structuredClone(officialCandidates);
insecureUrl.records[0].sources[0].url=insecureUrl.records[0].sources[0].url.replace('https://','http://');
assert.ok(validateOfficialReceiptCandidates(insecureUrl,contract).some((error)=>error.includes('must use HTTPS')));

const foreignHost=structuredClone(officialCandidates);
foreignHost.records[1].sources[0].url='https://example.com/syri';
assert.ok(validateOfficialReceiptCandidates(foreignHost,contract).some((error)=>error.includes('outside the official host boundary')));

const missingLocator=structuredClone(officialCandidates);
missingLocator.records[2].sources[0].locator=[];
assert.ok(validateOfficialReceiptCandidates(missingLocator,contract).some((error)=>error.includes('lacks a locator')));

const duplicateSource=structuredClone(officialCandidates);
duplicateSource.records[2].sources[0].source_id=duplicateSource.records[1].sources[0].source_id;
assert.ok(validateOfficialReceiptCandidates(duplicateSource,contract).includes('duplicate official source identifier'));

const promotedOfficialContract=structuredClone(contract);
promotedOfficialContract.domain_observations=officialCandidates.records.map((row)=>{
  const observation=structuredClone(row.observation);
  observation.evidence.promotion_authority=true;
  observation.evidence.promotion_ceiling='claim_evidence';
  observation.promotes_to='candidate_evidence';
  return observation;
});
promoted=evaluateRegression(promotedOfficialContract);
assert.equal(promoted.admissible_domain_evidence_records,3);
assert.equal(promoted.effective_domain_answers,0);
assert.equal(promoted.cross_domain_regression_completed,false,'three official claim-bound records with unresolved answer deficits must not complete the regression');

const repository=evaluateRegression(contract);
assert.equal(repository.source_health_healthy,true);
assert.equal(repository.domain_observations_evaluated,5);
assert.equal(repository.admissible_domain_evidence_records,0);
assert.equal(repository.effective_domain_answers,0);
assert.equal(repository.cross_domain_regression_completed,false);
assert.equal(repository.evidentiary_sufficiency,false);
assert.equal(repository.answer_effectiveness,false);
assert.ok(repository.domains.every((row)=>row.repository_promotion_allowed===false));

const auditObservations=audit.domain_audits.map((row)=>contract.domain_observations.find((candidate)=>candidate.domain_id===row.source_observation_id));
const auditContract={...contract,domain_observations:auditObservations};
const audited=evaluateRegression(auditContract);
assert.equal(audit.schema_version,'m05-answerable-power-s03-l7-real-receipt-admission-audit@1');
assert.equal(audit.domain_audits.length,5);
assert.equal(audited.domain_observations_evaluated,5);
assert.equal(audited.admissible_domain_evidence_records,0);
assert.equal(audited.effective_domain_answers,0);
assert.equal(audited.cross_domain_regression_completed,false);
assert.equal(audited.evidentiary_sufficiency,false);
assert.equal(audited.answer_effectiveness,false);
assert.deepEqual(audit.current_result,{
  audited_domains:5,
  claim_admissible_domains:0,
  answer_effective_domains:0,
  qualifying_jurisdictions:0,
  cross_domain_regression_completed:false,
  evidentiary_sufficiency:false,
  answer_effectiveness:false,
  issue_345_may_close:false
});
for(const row of audit.domain_audits){
  const observation=contract.domain_observations.find((candidate)=>candidate.domain_id===row.source_observation_id);
  const evaluated=evaluateObservation(observation,contract);
  assert.equal(evaluated.claim_evidence_admissible,false,`${row.domain_id} must remain below claim admission`);
  assert.equal(evaluated.answer_effective,false,`${row.domain_id} must remain below answer effectiveness`);
  assert.equal(evaluated.repository_promotion_allowed,false,`${row.domain_id} must not promote repository state`);
  assert.ok(row.missing_evidence_receipts.length>0,`${row.domain_id} must retain a missing-evidence ledger`);
  assert.ok(row.missing_answer_dimensions.length>0,`${row.domain_id} must retain a missing-answer ledger`);
  assert.equal(row.current_state.jurisdiction_contributes_to_answer,false,`${row.domain_id} must not leak a control jurisdiction into the works standard`);
  assert.equal(row.current_state.control_transfer_allowed,false,`${row.domain_id} must not transfer control evidence to a target domain`);
}
const syntheticAuditObservation=contract.controls.find((row)=>row.control_id===audit.synthetic_complete_receipt_control_id);
const syntheticAuditControl=evaluateObservation(syntheticAuditObservation,contract);
assert.equal(syntheticAuditControl.claim_evidence_admissible,true);
assert.equal(syntheticAuditControl.answer_effective,true);
assert.equal(syntheticAuditControl.repository_promotion_allowed,false);

const expectAuditFailure=(label,mutate,pattern)=>{
  const mutation=structuredClone(audit);
  mutate(mutation);
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'m05-real-receipt-audit-'));
  const tempPath=path.join(tempDir,'audit.json');
  try{
    fs.writeFileSync(tempPath,`${JSON.stringify(mutation,null,2)}\n`,'utf8');
    const result=runValidator(tempPath);
    assert.notEqual(result.status,0,`${label} mutation must fail the validator`);
    assert.match(`${result.stdout}\n${result.stderr}`,pattern,`${label} mutation must fail for the expected reason`);
  }finally{
    fs.rmSync(tempDir,{recursive:true,force:true});
  }
};

expectAuditFailure('canonical base',(row)=>{row.canonical_base.sha='0'.repeat(40)},/audit canonical base drift/u);
expectAuditFailure('project blob',(row)=>{row.domain_audits[0].project_binding.blob_sha='0'.repeat(40)},/APC-ADMIN-01 project binding drift/u);
expectAuditFailure('report blob',(row)=>{row.domain_audits[1].report_binding.blob_sha='0'.repeat(40)},/APC-COERCION-01 report binding drift/u);
expectAuditFailure('report fingerprint',(row)=>{row.domain_audits[2].report_binding.fingerprint='0'.repeat(64)},/APC-WORK-01 report fingerprint drift/u);
expectAuditFailure('pilot ceiling',(row)=>{row.domain_audits[3].pilot_ceiling='unbounded_R5'},/APC-EXIT-01 pilot ceiling drift/u);
expectAuditFailure('missing evidence ledger',(row)=>{row.domain_audits[0].missing_evidence_receipts=[]},/APC-ADMIN-01 missing evidence receipt ledger/u);
expectAuditFailure('missing answer ledger',(row)=>{row.domain_audits[1].missing_answer_dimensions=[]},/APC-COERCION-01 missing answer dimension ledger/u);
expectAuditFailure('claim state promotion',(row)=>{row.domain_audits[2].current_state.claim_evidence_admissible=true},/APC-WORK-01 audit state claim_evidence_admissible must remain false/u);
expectAuditFailure('jurisdiction leakage',(row)=>{row.domain_audits[3].current_state.jurisdiction_contributes_to_answer=true},/APC-EXIT-01 audit state jurisdiction_contributes_to_answer must remain false/u);
expectAuditFailure('control transfer',(row)=>{row.domain_audits[4].current_state.control_transfer_allowed=true},/APC-VALUE-01 audit state control_transfer_allowed must remain false/u);
expectAuditFailure('next receipt focus',(row)=>{row.domain_audits[0].next_receipt_focus=[]},/APC-ADMIN-01 next receipt focus incomplete/u);
expectAuditFailure('synthetic discrimination',(row)=>{row.synthetic_complete_receipt_control_id='PC-CLAIM-BOUND-PRIMARY'},/synthetic complete receipt control identity drift/u);
expectAuditFailure('false cross-domain completion',(row)=>{row.current_result.cross_domain_regression_completed=true},/audit current result cross_domain_regression_completed drift/u);
expectAuditFailure('false issue closure',(row)=>{row.boundaries.issue_345_may_close=true},/audit boundary issue_345_may_close must remain false/u);
expectAuditFailure('admission boundary transfer',(row)=>{row.admission_contract_binding.control_evidence_can_transfer_to_target_domain=true},/audit admission boundary weakened/u);
expectAuditFailure('canonical pilot observation substitution',(row)=>{
  row.domain_audits[0].source_observation_id='PC-OBSERVED-DURABLE-ANSWER';
},/APC-ADMIN-01 source observation binding drift/u);

console.log(`m05-source-health-evidence-state-regression.test: OK (${EVIDENCE_BOOLEAN_GATES.length} evidence-gate mutations; ${EVIDENCE_SUFFICIENCY_GUARDS.length+ANSWER_SUFFICIENCY_GUARDS.length} fail-closed contract guards; ${ANSWER_DIMENSIONS.length} answer-dimension mutations; 3 completion-path regressions; ${OFFICIAL_RECEIPT_IDS.length} official receipt candidates with 4 boundary attacks; 5 bound pilot audits; 16 real-receipt audit mutations)`);
