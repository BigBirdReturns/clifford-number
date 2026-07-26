#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-02-administrative-benefits.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-02.json');

if(stress.schema_version!=='m05-answerable-power-sprint-03-leg-02@1')fail('schema drift');
if(stress.leg_id!=='S03-L2'||stress.constitution_under_test!=='APC-01')fail('leg or constitution drift');
if(stress.status!=='bounded_domain_test_frozen')fail('status drift');
if(stress.systems.length!==2)fail('expected two systems');
if(stress.systems.map((row)=>row.system_id).join(',')!=='SYS-IDAHO-MEDICAID-BUDGET-TOOL,SYS-AUSTRALIA-ROBODEBT')fail('system denominator drift');
if(stress.domain_adapter.adapter_id!=='APC-ADMIN-01')fail('adapter identity drift');
if(stress.domain_adapter.administrative_invariants.length<8)fail('administrative invariants weakened');
if(stress.r_level_tests.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('R-level test drift');
if(stress.action_packet_translation.fields.length<13)fail('action-packet translation incomplete');
if(!/must establish the complete action packet/.test(stress.action_packet_translation.burden_rule))fail('burden rule drift');
if(!/may not by itself establish/.test(stress.action_packet_translation.non_response_rule))fail('non-response rule drift');
if(stress.cross_system_controls.length!==5)fail('cross-system control count drift');
const stacked=stress.cross_system_controls.find((row)=>row.control_id==='ADMIN-CONTROL-03');
if(!stacked||stacked.disposition!=='bounded_non_link')fail('stacked-control claim must remain non-link');
if(stress.propositions.length!==6)fail('proposition count drift');
const composed=stress.propositions.find((row)=>row.proposition_id==='M05-S03-L2-P04');
const r7=stress.propositions.find((row)=>row.proposition_id==='M05-S03-L2-P05');
if(!composed||composed.disposition!=='bounded_non_link')fail('composed answer claim must remain non-link');
if(!r7||r7.disposition!=='bounded_non_link')fail('Robodebt R7 claim must remain non-link');
if(stress.current_result.domain_adapter_frozen!==true||stress.current_result.r6_observed_in_domain!==false||stress.current_result.r7_observed_in_domain!==false||stress.current_result.composed_answer_observed!==false)fail('current result drift');
for(const [key,value] of Object.entries(stress.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.systems!==2||report.counts.r_levels!==7||report.counts.cross_system_controls!==5||report.counts.propositions!==6)fail('report count drift');
if(report.fingerprint.length!==64)fail('invalid fingerprint');
console.log('validate-m05-answerable-power-sprint-03-leg-02: OK');
