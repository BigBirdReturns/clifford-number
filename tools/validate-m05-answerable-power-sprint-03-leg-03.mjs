#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-03-surveillance-enforcement.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-03.json');

if(stress.schema_version!=='m05-answerable-power-sprint-03-leg-03@1')fail('schema drift');
if(stress.leg_id!=='S03-L3'||stress.constitution_under_test!=='APC-01')fail('leg or constitution drift');
if(stress.status!=='bounded_domain_test_frozen')fail('status drift');
if(stress.systems.length!==2)fail('expected two systems');
if(stress.systems.map((row)=>row.system_id).join(',')!=='SYS-ICE-ELITE-WOODBURN-MJMA,SYS-NETHERLANDS-SYRI')fail('system denominator drift');
if(stress.domain_adapter.adapter_id!=='APC-COERCION-01')fail('adapter identity drift');
if(stress.domain_adapter.coercive_domain_invariants.length<10)fail('coercive invariants weakened');
if(stress.r_level_tests.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('R-level test drift');
if(stress.action_packet_translation.fields.length<15)fail('action packet incomplete');
if(!/bears the burden/.test(stress.action_packet_translation.burden_rule))fail('burden rule drift');
if(!/may be delayed only/.test(stress.action_packet_translation.delayed_notice_rule))fail('delayed notice rule drift');
if(!/counts as meaningful only/.test(stress.action_packet_translation.human_control_rule))fail('human control rule drift');
if(stress.cross_system_controls.length!==6)fail('cross-system control count drift');
const stacked=stress.cross_system_controls.find((row)=>row.control_id==='COERCION-CONTROL-03');
const governance=stress.cross_system_controls.find((row)=>row.control_id==='COERCION-CONTROL-06');
if(!stacked||stacked.disposition!=='bounded_non_link')fail('stacked-control claim must remain non-link');
if(!governance||governance.disposition!=='bounded_non_link')fail('challenge-to-R6 claim must remain non-link');
if(stress.propositions.length!==7)fail('proposition count drift');
for(const id of ['M05-S03-L3-P04','M05-S03-L3-P05','M05-S03-L3-P06']){
  const row=stress.propositions.find((item)=>item.proposition_id===id);
  if(!row||row.disposition!=='bounded_non_link')fail(`${id} must remain bounded non-link`);
}
if(stress.current_result.domain_adapter_frozen!==true||stress.current_result.pre_action_person_notice_observed!==false||stress.current_result.complete_person_and_technical_evidence_access_observed!==false||stress.current_result.r6_observed_in_domain!==false||stress.current_result.r7_observed_in_domain!==false||stress.current_result.composed_answer_observed!==false)fail('current result drift');
for(const [key,value] of Object.entries(stress.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.systems!==2||report.counts.r_levels!==7||report.counts.cross_system_controls!==6||report.counts.propositions!==7)fail('report count drift');
if(report.fingerprint.length!==64)fail('invalid fingerprint');
console.log('validate-m05-answerable-power-sprint-03-leg-03: OK');
