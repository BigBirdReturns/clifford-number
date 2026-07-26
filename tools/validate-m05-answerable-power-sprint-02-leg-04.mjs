#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const freeze=read('data/project/m05-answerable-power-sprint-02-leg-04-freeze.json');
const ledger=read('data/project/m05-answerable-power-sprint-02-palantir-person-chain.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-leg-04.json');

if(freeze.status!=='frozen_for_acquisition')fail('freeze status drift');
if(freeze.source_freeze.length!==6)fail(`expected six sources, got ${freeze.source_freeze.length}`);
if(new Set(freeze.source_freeze.map((row)=>row.source_id)).size!==freeze.source_freeze.length)fail('duplicate source ids');
if(freeze.frozen_chain.length!==8)fail(`expected eight chain stages, got ${freeze.frozen_chain.length}`);
if(freeze.causal_fault_lines.length!==6)fail(`expected six fault lines, got ${freeze.causal_fault_lines.length}`);
if(freeze.decisive_acquisition_contract.required_objects.length!==11)fail('decisive acquisition denominator drift');
if(ledger.propositions.length!==8)fail(`expected eight propositions, got ${ledger.propositions.length}`);

const sourceIds=new Set(freeze.source_freeze.map((row)=>row.source_id));
const dispositions=new Set(['supported_for_human_review','requires_additional_acquisition','bounded_non_link','retained_candidate_only']);
for(const source of freeze.source_freeze){
  if(!source.url.startsWith('https://'))fail(`${source.source_id}: HTTPS required`);
  if(!source.supports.length || !source.does_not_support.length)fail(`${source.source_id}: source boundary incomplete`);
}
for(const proposition of ledger.propositions){
  if(!dispositions.has(proposition.disposition))fail(`${proposition.proposition_id}: invalid disposition`);
  if(!proposition.source_ids.length || !proposition.source_ids.every((id)=>sourceIds.has(id)))fail(`${proposition.proposition_id}: unknown source`);
  if(!proposition.support || !proposition.counterevidence.length || !proposition.falsifier || !proposition.stopping_rule)fail(`${proposition.proposition_id}: incomplete adjudication`);
}

const p02=ledger.propositions.find((row)=>row.proposition_id==='M05-S02-L4-P02');
const p05=ledger.propositions.find((row)=>row.proposition_id==='M05-S02-L4-P05');
const p07=ledger.propositions.find((row)=>row.proposition_id==='M05-S02-L4-P07');
if(p02?.disposition!=='bounded_non_link')fail('individual-identification non-link must remain explicit');
if(p07?.disposition!=='bounded_non_link')fail('sole-causation non-link must remain explicit');
if(p05?.maximum_ceiling!=='R3_R4_arrest_practice_counterpower')fail('counterpower ceiling drift');
if(ledger.current_result.person_level_chain_reached!==true || ledger.current_result.direct_voice_present!==true)fail('person-level chain state drift');
if(ledger.current_result.highest_observed_answer_level!=='R4')fail('answer level drift');

for(const object of [freeze.boundaries,ledger.boundaries,report.boundaries]){
  for(const [key,value] of Object.entries(object)){
    if(['promotes_to','graph_effect'].includes(key))continue;
    if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
  }
}
if(report.counts.sources!==6 || report.counts.chain_stages!==8 || report.counts.propositions!==8 || report.counts.decisive_acquisitions!==11)fail('report count drift');
if(report.current_result.highest_observed_answer_level!=='R4')fail('report result drift');
console.log('validate-m05-answerable-power-sprint-02-leg-04: OK');
