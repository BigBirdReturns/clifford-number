#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const plan=read('data/project/m05-answerable-power-sprint-03-plan.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-plan.json');

if(plan.schema_version!=='m05-answerable-power-sprint-03-plan@1')fail('plan schema drift');
if(plan.program_id!=='M-05'||plan.sprint_id!=='M05-SPRINT-03')fail('program or sprint drift');
if(plan.master_issue.number!==338)fail('master issue drift');
if(plan.lanes.length!==7)fail(`expected seven lanes, got ${plan.lanes.length}`);
if(new Set(plan.lanes.map((row)=>row.lane_id)).size!==7)fail('duplicate lane ids');
if(plan.lanes.map((row)=>row.issue).join(',')!=='339,340,341,342,343,344,345')fail('live issue topology drift');
if(plan.answer_constitution.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('answer ladder drift');
if(plan.domain_tests.length<5)fail('insufficient domain test surfaces');
if(plan.sprint_02_reconciliation.all_answer_levels_observed_somewhere!==true)fail('Sprint 02 answer-library state drift');
if(plan.sprint_02_reconciliation.one_combined_durable_answer_observed!==false)fail('combined answer must remain open');
if(plan.sprint_02_reconciliation.works_standard_met!==false||plan.sprint_02_reconciliation.project_complete!==false)fail('completion boundary drift');
if(plan.sprint_exit_contract.minimum_domains_tested<3||plan.sprint_exit_contract.minimum_jurisdictions_tested<2)fail('works standard weakened');
if(plan.sprint_exit_contract.direct_voice_required!==true||plan.sprint_exit_contract.pre_action_timing_required!==true||plan.sprint_exit_contract.evidence_custody_required!==true||plan.sprint_exit_contract.independent_authority_required!==true||plan.sprint_exit_contract.observed_remedy_required!==true||plan.sprint_exit_contract.durability_required!==true||plan.sprint_exit_contract.bypass_and_successor_review_required!==true)fail('required answer controls weakened');
if(plan.sprint_exit_contract.network_output_auto_promotion!==false||plan.sprint_exit_contract.project_completion_claimed!==false)fail('automation or completion boundary drift');
for(const [key,value] of Object.entries(plan.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.answer_levels!==7||report.counts.lanes!==7||report.counts.live_issues!==8)fail('report count drift');
if(report.fingerprint.length!==64)fail('invalid report fingerprint');
console.log('validate-m05-answerable-power-sprint-03: OK');
