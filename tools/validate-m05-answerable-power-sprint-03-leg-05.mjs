#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const data=read('data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json');
const report=read('reports/core-thesis/answerable-power/sprint-03-leg-05.json');
if(data.leg_id!=='S03-L5'||data.adapter_id!=='APC-EXIT-01')fail('leg or adapter drift');
if(data.systems.length!==3)fail(`expected three bounded systems, got ${data.systems.length}`);
if(data.public_operating_sovereignty_dimensions.length!==10)fail('expected ten operating-sovereignty dimensions');
if(data.propositions.length!==9)fail(`expected nine propositions, got ${data.propositions.length}`);
if(new Set(data.propositions.map((row)=>row.proposition_id)).size!==9)fail('duplicate proposition ids');
const p=(id)=>data.propositions.find((row)=>row.proposition_id===id);
if(p('M05-S03-L5-P01')?.disposition!=='supported_for_human_review')fail('Share R5 positive-control drift');
for(const id of ['M05-S03-L5-P03','M05-S03-L5-P05','M05-S03-L5-P06','M05-S03-L5-P07','M05-S03-L5-P08']){
  if(p(id)?.disposition!=='bounded_non_link')fail(`${id} must remain a bounded non-link`);
}
if(p('M05-S03-L5-P02')?.disposition!=='requires_additional_acquisition'||p('M05-S03-L5-P04')?.disposition!=='requires_additional_acquisition')fail('outcome or deletion acquisition state drift');
if(p('M05-S03-L5-P09')?.disposition!=='retained_candidate_only')fail('adapter may not self-promote');
if(data.current_result.highest_observed_level!=='R5')fail('highest observed level drift');
if(data.current_result.one_complete_domain_answer_observed!==false||data.current_result.works_standard_met!==false)fail('completion boundary drift');
if(data.adapter.pilot_packet.length<12)fail('pilot packet too thin');
for(const [key,value] of Object.entries(data.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(data.boundaries.promotes_to!=='candidate_only'||data.boundaries.graph_effect!=='none')fail('non-promotion boundary drift');
if(report.counts.systems!==3||report.counts.operating_sovereignty_dimensions!==10||report.counts.propositions!==9)fail('report count drift');
if(report.current_result.adapter_state!=='candidate_design_ready_for_pilot_specification')fail('adapter state drift');
console.log('validate-m05-answerable-power-sprint-03-leg-05: OK');
