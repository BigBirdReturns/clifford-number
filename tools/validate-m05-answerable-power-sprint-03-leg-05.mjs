#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-05.json');

if(stress.systems.length!==3)fail(`expected three systems, got ${stress.systems.length}`);
if(stress.r_level_tests.map((row)=>row.level).join(',')!=='R1,R2,R3,R4,R5,R6,R7')fail('R-level sequence drift');
if(stress.exit_fault_lines.length<8)fail('expected at least eight exit fault lines');
if(stress.operating_sovereignty_matrix.length<7)fail('operating-sovereignty matrix too thin');
if(stress.propositions.length<8)fail('expected at least eight propositions');
if(stress.current_result.highest_observed_level!=='R5')fail('highest observed level drift');
if(stress.current_result.composed_answer_observed!==false)fail('composed answer must remain open');
if(stress.current_result.works_standard_met!==false)fail('works standard must remain unmet');
const homes=stress.propositions.find((row)=>row.proposition_id==='M05-S03-L5-P01');
if(!homes||homes.disposition!=='supported_for_human_review')fail('Homes for Ukraine positive control drift');
for(const id of ['M05-S03-L5-P02','M05-S03-L5-P03','M05-S03-L5-P05','M05-S03-L5-P06']){
  const row=stress.propositions.find((item)=>item.proposition_id===id);
  if(!row||row.disposition!=='bounded_non_link')fail(`${id} must remain a bounded non-link`);
}
if(stress.boundaries.one_exit_proves_universal_substitutability!==false)fail('universal-substitutability boundary drift');
if(stress.boundaries.public_operation_proves_R6!==false)fail('R6 boundary drift');
if(stress.boundaries.reported_savings_prove_full_value_recovery!==false)fail('R7 boundary drift');
for(const [key,value] of Object.entries(stress.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.systems!==3||report.counts.r_levels!==7||report.counts.propositions!==stress.propositions.length)fail('report count drift');
console.log('validate-m05-answerable-power-sprint-03-leg-05: OK');
