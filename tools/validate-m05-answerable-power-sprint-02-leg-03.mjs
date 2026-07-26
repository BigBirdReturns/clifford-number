#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-03-ngc2-sources.json');
const matrix=read('data/project/m05-answerable-power-sprint-02-ngc2-responsibility-acceptance.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-leg-03.json');

if(sources.sources.length!==10)fail(`expected 10 sources, got ${sources.sources.length}`);
if(new Set(sources.sources.map((row)=>row.source_id)).size!==sources.sources.length)fail('duplicate source ids');
for(const source of sources.sources){
  if(!source.url.startsWith('https://'))fail(`${source.source_id}: HTTPS required`);
  if(!source.source_class || !source.subjects.length)fail(`${source.source_id}: source metadata incomplete`);
  if(!source.supports.length || !source.does_not_support.length)fail(`${source.source_id}: support boundary missing`);
}
const sourceIds=new Set(sources.sources.map((row)=>row.source_id));
if(matrix.public_decision_chain.length!==8)fail(`expected 8 decision stages, got ${matrix.public_decision_chain.length}`);
for(const stage of matrix.public_decision_chain){
  if(!stage.source_ids.every((id)=>sourceIds.has(id)))fail(`${stage.stage_id}: unknown source`);
  if(!stage.observation || !stage.current_ceiling || !stage.missing)fail(`${stage.stage_id}: incomplete stage`);
}
if(matrix.responsibility_matrix.length!==8)fail(`expected 8 actors, got ${matrix.responsibility_matrix.length}`);
if(new Set(matrix.responsibility_matrix.map((row)=>row.actor_id)).size!==matrix.responsibility_matrix.length)fail('duplicate responsibility actor ids');
for(const row of matrix.responsibility_matrix){
  if(!row.documented_responsibilities.length || !row.documented_rights.length || !row.unresolved.length)fail(`${row.actor_id}: incomplete responsibility record`);
}
if(matrix.acceptance_ledger.length!==6)fail(`expected 6 acceptance objects, got ${matrix.acceptance_ledger.length}`);
if(matrix.propositions.length!==10)fail(`expected 10 propositions, got ${matrix.propositions.length}`);
const allowed=new Set(['supported_for_human_review','requires_additional_acquisition','bounded_non_link','retained_candidate_only','falsified','source_restricted','source_unavailable']);
for(const row of matrix.propositions){
  if(!allowed.has(row.disposition))fail(`${row.proposition_id}: invalid disposition`);
  if(!row.maximum_ceiling || !row.support || !row.counterevidence)fail(`${row.proposition_id}: incomplete adjudication`);
}
const counts=matrix.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
if(counts.supported_for_human_review!==3)fail(`expected 3 supported propositions, got ${counts.supported_for_human_review}`);
if(counts.requires_additional_acquisition!==4)fail(`expected 4 acquisition-open propositions, got ${counts.requires_additional_acquisition}`);
if(counts.retained_candidate_only!==1)fail(`expected 1 retained candidate, got ${counts.retained_candidate_only}`);
if(counts.bounded_non_link!==2)fail(`expected 2 bounded non-links, got ${counts.bounded_non_link}`);
if(matrix.current_result.army_mission_sovereignty!=='supported_for_human_review')fail('Army sovereignty result drift');
if(matrix.current_result.palantir_anduril_integration!=='supported_for_human_review')fail('integration result drift');
if(matrix.current_result.final_full_stack_acceptance!=='requires_additional_acquisition')fail('acceptance result drift');
if(matrix.current_result.meaningful_human_veto!=='retained_candidate_only')fail('human veto result drift');
if(matrix.current_result.complete_program_foreclosure!=='bounded_non_link')fail('foreclosure result drift');
if(matrix.current_result.common_private_governance!=='bounded_non_link')fail('governance result drift');
if(matrix.decisive_acquisition_contract.required_objects.length<12)fail('acquisition contract too weak');
if(matrix.decisive_acquisition_contract.lawful_routes.length<7)fail('lawful routes too weak');
if(!matrix.decisive_acquisition_contract.falsifier || !matrix.decisive_acquisition_contract.stopping_rule)fail('falsifier or stopping rule missing');
for(const [key,value] of Object.entries(matrix.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.sources!==10 || report.counts.decision_stages!==8 || report.counts.responsibility_actors!==8 || report.counts.propositions!==10)fail('report count drift');
if(JSON.stringify(report.current_result)!==JSON.stringify(matrix.current_result))fail('current result drift');
if(JSON.stringify(report.boundaries)!==JSON.stringify(matrix.boundaries))fail('report boundary drift');
console.log('validate-m05-answerable-power-sprint-02-leg-03: OK');
