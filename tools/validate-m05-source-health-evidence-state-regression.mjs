#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateObservation,evaluateRegression} from './lib/m05-source-health-evidence-state-regression.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const contract=read('data/project/m05-source-health-evidence-state-regression.json');

if(contract.schema_version!=='m05-source-health-evidence-state-regression@1')fail('regression schema drift');
if(contract.object_class!=='bounded_cross_domain_evidence_state_regression')fail('object class drift');
if(contract.program_id!=='M-05'||contract.hydrology_program_id!=='M-04G'||contract.source_leg_id!=='S03-L7')fail('program binding drift');
if(contract.status!=='candidate_regression_contract')fail('status drift');
if(contract.canonical_base.sha!=='50a8590c1714ea8923a0b12a27ab8c14f40fbb81')fail('canonical base drift');
if(contract.canonical_base.merged_candidate_sha!=='f85e9dd684d5ead1c2ec643225947e9fe579de3c')fail('merged candidate drift');

const receipt=contract.source_health_receipt;
if(receipt.qualification_run!==31964583533)fail('qualification run drift');
if(receipt.artifact_sha256!=='5c4b0dd5f7cbb64bc4522851064f051d089c4a0494d877f8cbeb0abaa7b1f33e')fail('artifact digest drift');
if(receipt.candidate_receipt_sha256!=='e54605c2e7f9d3b2d9113e38a39eb6d50b6afc09a8443741056ba44d9a8dca33')fail('candidate receipt drift');
if(receipt.common_crawl_body_sha256!=='eac053eb9d810c1ca519c99e7fdcf3c24a8042809becbbf6c6854a5795c1d52a'||receipt.common_crawl_bytes!==34675)fail('Common Crawl receipt drift');
if(receipt.selected_official_fallbacks!==8)fail('official fallback count drift');
if(!same(receipt.changed_paths,[
  'data/project/m04g-source-ecology-v2-policy.json',
  'test/m05-answerable-power-sprint-03-leg-07.test.js',
  'tools/lib/m04g-source-ecology-v2.mjs'
]))fail('qualified three-file boundary drift');
if(!same(receipt.observed,{
  selected_routes:96,
  route_successes:76,
  content_successes:76,
  healthy_basins:12,
  unclassified_failures:0,
  route_healthy:true,
  content_healthy:true,
  coverage_healthy:true,
  evidentiary_sufficiency:false,
  answer_effectiveness:false
}))fail('qualified orbit observation drift');

const frozen=contract.frozen_transport_contract;
if(frozen.selected_routes!==96||frozen.basins!==12||frozen.routes_per_basin!==8)fail('frozen denominator drift');
if(frozen.minimum_route_success_rate!==0.75||frozen.minimum_content_success_rate!==0.65||frozen.required_healthy_basins!==12||frozen.maximum_unclassified_failures!==0)fail('frozen threshold drift');
if(frozen.route_identifiers_preserved!==true||frozen.basin_assignments_preserved!==true||frozen.failure_taxonomy_preserved!==true)fail('transport identity boundary weakened');
if(frozen.direct_voice_bulk_polling_allowed!==false||frozen.locator_only_receipts_may_promote_to_claim_evidence!==false)fail('access or promotion boundary weakened');

const domainIds=contract.domain_observations.map((row)=>row.domain_id);
if(!same(domainIds,['APC-ADMIN-01','APC-COERCION-01','APC-WORK-01','APC-EXIT-01','APC-VALUE-01']))fail('cross-domain denominator drift');
if(new Set(domainIds).size!==5)fail('duplicate domain identifiers');
if(contract.controls.length!==4)fail('control count drift');

for(const row of [...contract.domain_observations,...contract.controls]){
  const evaluated=evaluateObservation(row,contract);
  if(evaluated.claim_evidence_admissible!==row.expected.claim_evidence_admissible)fail(`${evaluated.id} evidence expectation drift`);
  if(evaluated.answer_effective!==row.expected.answer_effective)fail(`${evaluated.id} answer expectation drift`);
  if(evaluated.repository_promotion_allowed!==false)fail(`${evaluated.id} escaped candidate-only boundary`);
}

const locator=contract.controls.find((row)=>row.control_id==='NC-LOCATOR-ONLY');
const repository=contract.controls.find((row)=>row.control_id==='NC-REPOSITORY-CONTENT');
const evidencePositive=contract.controls.find((row)=>row.control_id==='PC-CLAIM-BOUND-PRIMARY');
const answerPositive=contract.controls.find((row)=>row.control_id==='PC-OBSERVED-DURABLE-ANSWER');
if(!locator||!repository||!evidencePositive||!answerPositive)fail('required control missing');
if(evaluateObservation(locator,contract).claim_evidence_admissible)fail('locator-only negative control promoted');
if(evaluateObservation(repository,contract).claim_evidence_admissible)fail('repository-content negative control promoted');
if(!evaluateObservation(evidencePositive,contract).claim_evidence_admissible||evaluateObservation(evidencePositive,contract).answer_effective)fail('claim-evidence positive control lost discrimination');
if(!evaluateObservation(answerPositive,contract).claim_evidence_admissible||!evaluateObservation(answerPositive,contract).answer_effective)fail('answer positive control lost discrimination');

const result=evaluateRegression(contract);
for(const [key,value] of Object.entries(contract.expected_repository_state)){
  if(result[key]!==value)fail(`repository state ${key} drift`);
}
for(const [key,value] of Object.entries(contract.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(contract.boundaries.promotes_to!=='candidate_only'||contract.boundaries.graph_effect!=='none')fail('promotion boundary drift');

console.log('validate-m05-source-health-evidence-state-regression: OK (5 domains; 2 negative controls; 2 discriminating positive controls; repository evidence and answer states remain false)');
