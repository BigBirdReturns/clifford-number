#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  ANSWER_DIMENSIONS,
  EVIDENCE_BOOLEAN_GATES,
  evaluateObservation,
  evaluateRegression
} from '../tools/lib/m05-source-health-evidence-state-regression.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'data/project/m05-source-health-evidence-state-regression.json'),'utf8'));
const run=spawnSync(process.execPath,['tools/validate-m05-source-health-evidence-state-regression.mjs'],{cwd:root,encoding:'utf8'});
if(run.status!==0){console.error(run.stdout);console.error(run.stderr);throw new Error('validator failed')}

const control=(id)=>structuredClone(contract.controls.find((row)=>row.control_id===id));
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

const repository=evaluateRegression(contract);
assert.equal(repository.source_health_healthy,true);
assert.equal(repository.domain_observations_evaluated,5);
assert.equal(repository.admissible_domain_evidence_records,0);
assert.equal(repository.effective_domain_answers,0);
assert.equal(repository.cross_domain_regression_completed,false);
assert.equal(repository.evidentiary_sufficiency,false);
assert.equal(repository.answer_effectiveness,false);
assert.ok(repository.domains.every((row)=>row.repository_promotion_allowed===false));

console.log(`m05-source-health-evidence-state-regression.test: OK (${EVIDENCE_BOOLEAN_GATES.length} evidence-gate mutations; ${ANSWER_DIMENSIONS.length} answer-dimension mutations)`);
