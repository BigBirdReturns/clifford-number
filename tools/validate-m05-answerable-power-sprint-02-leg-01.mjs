#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const survey=read('data/project/m05-answerable-power-sprint-02-ecosystem-survey.json');
const decision=read('data/project/m05-answerable-power-sprint-02-clifford-decision-file-01.json');
const sourceRegistry=read('data/intake/m05-answerable-power-sprint-01-sources.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-leg-01.json');

if(survey.layers.length!==4)fail('expected four ecosystem layers');
if(survey.selected_next_leg.lane_id!=='S02-L1' || survey.selected_next_leg.issue_number!==323)fail('selected leg route drift');
if(JSON.stringify(survey.layers.map((row)=>row.layer_id))!==JSON.stringify(['M04B','M04F','M04G','M05']))fail('ecosystem layer drift');

if(decision.decision_file_id!=='M05-S02-DF-001')fail('decision id drift');
if(decision.current_disposition!=='requires_additional_acquisition')fail('decision must remain acquisition-open');
if(decision.maximum_current_ceiling!=='actor_specific_institutional_translation')fail('decision ceiling drift');
if(decision.source_ids.length!==4 || decision.public_record_chain.length!==4)fail('decision source or stage count drift');
if(decision.transition_status.length!==5 || decision.propositions.length!==4)fail('decision transition or proposition count drift');
if(decision.decisive_acquisition_contract.required_objects.length<8)fail('acquisition contract too weak');

const sourceIds=new Set(sourceRegistry.sources.map((row)=>row.source_id));
for(const sourceId of decision.source_ids)if(!sourceIds.has(sourceId))fail(`unknown source ${sourceId}`);
for(const stage of decision.public_record_chain){
  if(!decision.source_ids.includes(stage.source_id))fail(`${stage.stage}: source outside decision file`);
  if(!stage.observation || !stage.supports || !stage.does_not_support)fail(`${stage.stage}: incomplete boundary`);
}

const allowed=new Set(['supported_for_human_review','requires_additional_acquisition','bounded_non_link','retained_candidate_only','source_restricted','source_unavailable']);
const seen=new Set();
const dispositions={};
for(const proposition of decision.propositions){
  if(seen.has(proposition.proposition_id))fail('duplicate proposition');
  seen.add(proposition.proposition_id);
  if(!allowed.has(proposition.disposition))fail(`${proposition.proposition_id}: invalid disposition`);
  if(!proposition.claim || !proposition.maximum_ceiling)fail(`${proposition.proposition_id}: incomplete proposition`);
  if(!Array.isArray(proposition.counterevidence) || proposition.counterevidence.length<2)fail(`${proposition.proposition_id}: counterevidence too thin`);
  if(!proposition.source_ids.every((sourceId)=>decision.source_ids.includes(sourceId)))fail(`${proposition.proposition_id}: source outside frozen set`);
  dispositions[proposition.disposition]=(dispositions[proposition.disposition]||0)+1;
}
for(const key of ['supported_for_human_review','requires_additional_acquisition','bounded_non_link','retained_candidate_only'])if(dispositions[key]!==1)fail(`expected one ${key} proposition`);

const transitions=decision.transition_status.reduce((acc,row)=>{acc[row.state]=(acc[row.state]||0)+1;return acc;},{});
if(transitions.supported_for_human_review!==2 || transitions.requires_additional_acquisition!==3)fail('transition disposition drift');

for(const boundaries of [survey.boundaries,decision.boundaries]){
  for(const [key,value] of Object.entries(boundaries)){
    if(['promotes_to','graph_effect'].includes(key))continue;
    if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
  }
}

if(report.counts.ecosystem_layers!==4 || report.counts.decision_sources!==4 || report.counts.chain_stages!==4)fail('report count drift');
if(report.counts.transitions!==5 || report.counts.propositions!==4)fail('report decision count drift');
if(report.current_result.disposition!==decision.current_disposition)fail('report disposition drift');
if(JSON.stringify(report.boundaries)!==JSON.stringify(decision.boundaries))fail('report boundary drift');

console.log('validate-m05-answerable-power-sprint-02-leg-01: OK');
