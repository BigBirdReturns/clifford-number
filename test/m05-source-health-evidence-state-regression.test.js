#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-source-health-evidence-state-regression.json'),'utf8'));
const run=spawnSync(process.execPath,['tools/validate-m05-source-health-evidence-state-regression.mjs'],{cwd:root,encoding:'utf8'});
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

const repository=evaluateRegression(contract);
assert.equal(repository.source_health_healthy,true);
assert.equal(repository.domain_observations_evaluated,5);
assert.equal(repository.admissible_domain_evidence_records,0);
assert.equal(repository.effective_domain_answers,0);
assert.equal(repository.cross_domain_regression_completed,false);
assert.equal(repository.evidentiary_sufficiency,false);
assert.equal(repository.answer_effectiveness,false);
assert.ok(repository.domains.every((row)=>row.repository_promotion_allowed===false));

console.log(`m05-source-health-evidence-state-regression.test: OK (${EVIDENCE_BOOLEAN_GATES.length} evidence-gate mutations; ${EVIDENCE_SUFFICIENCY_GUARDS.length+ANSWER_SUFFICIENCY_GUARDS.length} fail-closed contract guards; ${ANSWER_DIMENSIONS.length} answer-dimension mutations; 3 completion-path regressions)`);
