#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-04-workplace-co-governance.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-04.json');

if(stress.schema_version!=='m05-answerable-power-sprint-03-leg-04@1')fail('schema drift');
if(stress.leg_id!=='S03-L4'||stress.constitution_under_test!=='APC-01')fail('leg or constitution drift');
if(stress.status!=='bounded_domain_test_frozen')fail('status drift');
if(stress.systems.length!==4)fail('expected four systems');
if(stress.domain_adapter.adapter_id!=='APC-WORK-01')fail('adapter identity drift');
if(stress.domain_adapter.workplace_invariants.length<14)fail('workplace invariants weakened');
if(stress.r_level_tests.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('R-level test drift');
if(stress.architecture_and_governance_fault_lines.length!==5)fail('fault-line count drift');
if(stress.action_packet_translation.fields.length<16)fail('action packet incomplete');
if(!/bears the burden/.test(stress.action_packet_translation.burden_rule))fail('burden rule drift');
if(!/triggers renewed R1, R2, R3, and R6/.test(stress.action_packet_translation.update_rule))fail('update rule drift');
if(!/may strengthen but may not eliminate/.test(stress.action_packet_translation.direct_rights_floor))fail('direct rights floor drift');
if(stress.cross_system_controls.length!==7)fail('control count drift');
for(const id of ['WORK-CONTROL-04','WORK-CONTROL-05']){
  const row=stress.cross_system_controls.find((item)=>item.control_id===id);
  if(!row||row.disposition!=='bounded_non_link')fail(`${id} must remain bounded non-link`);
}
if(stress.propositions.length!==7)fail('proposition count drift');
for(const id of ['M05-S03-L4-P04','M05-S03-L4-P05']){
  const row=stress.propositions.find((item)=>item.proposition_id===id);
  if(!row||row.disposition!=='bounded_non_link')fail(`${id} must remain bounded non-link`);
}
if(stress.current_result.domain_adapter_frozen!==true||stress.current_result.r6_positive_control_observed!==true||stress.current_result.centralization_fault_line_supported!==true||stress.current_result.capability_based_anti_bypass_supported!==true)fail('positive-control state drift');
if(stress.current_result.direct_individual_veto_observed!==false||stress.current_result.complete_r4_observed!==false||stress.current_result.r5_observed_in_domain!==false||stress.current_result.r7_observed_in_domain!==false||stress.current_result.cross_jurisdiction_transfer_observed!==false||stress.current_result.composed_answer_observed!==false)fail('open-state drift');
for(const [key,value] of Object.entries(stress.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.systems!==4||report.counts.r_levels!==7||report.counts.fault_lines!==5||report.counts.cross_system_controls!==7||report.counts.propositions!==7)fail('report count drift');
if(report.fingerprint.length!==64)fail('invalid fingerprint');
console.log('validate-m05-answerable-power-sprint-03-leg-04: OK');
