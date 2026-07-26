#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const reconciliation=read('data/project/m05-answerable-power-sprint-02-reconciliation.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-reconciliation.json');
const observationPath=path.join(root,'data/project/m05-answerable-power-sprint-02-source-health-observation.json');
const observation=fs.existsSync(observationPath)?JSON.parse(fs.readFileSync(observationPath,'utf8')):null;

if(reconciliation.legs.length!==7)fail(`expected seven legs, got ${reconciliation.legs.length}`);
if(new Set(reconciliation.legs.map((row)=>row.leg_id)).size!==7)fail('duplicate leg ids');
if(reconciliation.answer_library.length!==7)fail('expected R1-R7 answer library');
if(reconciliation.answer_library.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('answer ladder drift');
if(!reconciliation.answer_library.every((row)=>row.observed===true))fail('every R1-R7 level must be observed somewhere');
if(reconciliation.cross_domain_assessment.one_combined_durable_answer_observed!==false)fail('combined answer must remain open');
if(reconciliation.cross_domain_assessment.works_standard_met!==false)fail('works standard must remain unmet');
if(reconciliation.cross_domain_assessment.current_disposition!=='retained_candidate_only')fail('cross-domain disposition drift');
const sourceLeg=reconciliation.legs.find((row)=>row.leg_id==='S02-L7');
if(!sourceLeg||sourceLeg.state!=='engineering_merged_observed_proof_pending')fail('source-health leg state drift');
if(sourceLeg.baseline.selected!==96||sourceLeg.baseline.content_succeeded!==53||sourceLeg.baseline.failed!==43)fail('source-health baseline drift');
if(sourceLeg.acceptance.minimum_global_route_success_rate<0.75||sourceLeg.acceptance.minimum_global_content_success_rate<0.65)fail('source-health acceptance weakened');
if(observation){
  if(observation.merge_sha!=='0f517f497eed8c8a9d7f1f83c5c0688a509ea41f')fail('observation merge SHA drift');
  if(observation.run_id===null||observation.run_id===undefined)fail('observation run id missing');
  if(observation.selected!==96)fail('post-repair all-class denominator must be 96');
  if(observation.state_separation.evidence_sufficient!==false)fail('poller may not claim evidence sufficiency');
  if(observation.failed+observation.route_succeeded!==96)fail('route denominator mismatch');
  if(observation.content_succeeded+observation.metadata_only+observation.failed!==96)fail('content denominator mismatch');
}
for(const [key,value] of Object.entries(reconciliation.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.legs!==7||report.counts.answer_levels_observed!==7)fail('report count drift');
if(observation&&report.terminal_state!=='sprint_02_reconciled')fail('observed complete orbit must reconcile sprint');
if(!observation&&report.terminal_state!=='awaiting_post_repair_orbit')fail('pending state drift');
console.log('validate-m05-answerable-power-sprint-02-reconciliation: OK');
