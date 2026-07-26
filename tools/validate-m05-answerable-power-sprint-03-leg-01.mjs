#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const constitution=read('data/project/m05-answerable-power-sprint-03-leg-01-constitution.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-01.json');

if(constitution.schema_version!=='m05-answerable-power-constitution@1')fail('constitution schema drift');
if(constitution.constitution_id!=='APC-01'||constitution.leg_id!=='S03-L1')fail('constitution identity drift');
if(constitution.status!=='candidate_design_frozen_for_domain_testing')fail('constitution status drift');
if(constitution.constitutional_roles.length!==8)fail(`expected eight roles, got ${constitution.constitutional_roles.length}`);
if(new Set(constitution.constitutional_roles.map((row)=>row.role_id)).size!==8)fail('duplicate constitutional roles');
if(constitution.action_packet.required_before_avoidable_action!==true)fail('action packet requirement weakened');
if(constitution.action_packet.fields.length<14)fail('action packet insufficiently specified');
if(constitution.rights_sequence.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('rights sequence drift');
for(const row of constitution.rights_sequence){
  for(const key of ['trigger','holder','operator_duty','compulsory_mechanism','proof_object','minimum_remedy','failure_test']) if(row[key]===undefined)fail(`${row.level}: missing ${key}`);
}
if(constitution.emergency_constitution.requirements.length<8)fail('emergency constitution weakened');
if(constitution.anti_bypass_rules.length!==8)fail('anti-bypass rule count drift');
if(new Set(constitution.anti_bypass_rules.map((row)=>row.rule_id)).size!==8)fail('duplicate anti-bypass rules');
if(constitution.constitutional_invariants.length<10)fail('insufficient constitutional invariants');
if(constitution.works_standard.minimum_domains!==3||constitution.works_standard.minimum_jurisdictions!==2)fail('works standard drift');
if(constitution.works_standard.current_state!=='not_met')fail('works standard may not self-promote');
if(constitution.domain_mapping.length!==5)fail('domain mapping drift');
if(constitution.propositions.length!==5)fail('proposition count drift');
const completionClaim=constitution.propositions.find((row)=>row.proposition_id==='M05-S03-L1-P05');
if(!completionClaim||completionClaim.disposition!=='bounded_non_link')fail('working-answer claim must remain a non-link');
if(constitution.current_result.answer_constitution_frozen!==true||constitution.current_result.candidate_design_ready_for_domain_testing!==true)fail('design freeze drift');
if(constitution.current_result.one_combined_durable_answer_observed!==false||constitution.current_result.works_standard_met!==false||constitution.current_result.project_complete!==false)fail('completion boundary drift');
for(const [key,value] of Object.entries(constitution.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.roles!==8||report.counts.rights_levels!==7||report.counts.anti_bypass_rules!==8||report.counts.domains!==5||report.counts.propositions!==5)fail('report count drift');
if(report.fingerprint.length!==64)fail('invalid fingerprint');
console.log('validate-m05-answerable-power-sprint-03-leg-01: OK');
