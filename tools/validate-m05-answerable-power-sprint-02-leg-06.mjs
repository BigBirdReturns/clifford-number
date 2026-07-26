#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-06-r7-sources.json');
const candidate=read('data/project/m05-answerable-power-sprint-02-r7-tarp-value-recovery.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-leg-06.json');

if(sources.sources.length!==10)fail(`expected ten sources, got ${sources.sources.length}`);
if(new Set(sources.sources.map((row)=>row.source_id)).size!==sources.sources.length)fail('duplicate source ids');
const sourceIds=new Set(sources.sources.map((row)=>row.source_id));
for(const source of sources.sources){
  if(!source.url.startsWith('https://'))fail(`${source.source_id}: HTTPS required`);
  if(!source.supports.length || !source.does_not_support.length)fail(`${source.source_id}: incomplete source boundary`);
}
if(candidate.recovery_chain.length!==10)fail(`expected ten recovery stages, got ${candidate.recovery_chain.length}`);
if(candidate.propositions.length!==11)fail(`expected eleven propositions, got ${candidate.propositions.length}`);
const dispositions=new Set(['supported_for_human_review','bounded_non_link','retained_candidate_only','requires_additional_acquisition']);
for(const proposition of candidate.propositions){
  if(!dispositions.has(proposition.disposition))fail(`${proposition.proposition_id}: invalid disposition`);
  if(!proposition.source_ids.length || !proposition.source_ids.every((id)=>sourceIds.has(id)))fail(`${proposition.proposition_id}: unknown source`);
  if(!proposition.counterevidence.length || !proposition.falsifier || !proposition.stopping_rule)fail(`${proposition.proposition_id}: incomplete adjudication`);
}
const p05=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L6-P05');
const p06=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L6-P06');
const p07=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L6-P07');
const p08=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L6-P08');
const p11=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L6-P11');
if(p05?.maximum_ceiling!=='R7_bounded_public_capital_and_risk_value_recovery')fail('R7 ceiling drift');
for(const row of [p06,p07,p08,p11])if(row?.disposition!=='bounded_non_link')fail(`${row?.proposition_id}: required non-link drift`);
if(candidate.current_result.highest_observed_level!=='R7' || candidate.current_result.observed_public_value_recovery!==true)fail('R7 result drift');
if(candidate.current_result.observed_direct_affected_person_recovery!==false)fail('affected-person recovery boundary drift');
if(candidate.current_result.observed_public_co_governance!==false)fail('co-governance boundary drift');
if(candidate.current_result.works_standard_met!==false)fail('works standard must remain unmet');
for(const object of [sources.boundaries,candidate.boundaries,report.boundaries]){
  for(const [key,value] of Object.entries(object)){
    if(['promotes_to','graph_effect'].includes(key))continue;
    if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
  }
}
if(report.counts.sources!==10 || report.counts.recovery_stages!==10 || report.counts.propositions!==11)fail('report count drift');
if(report.disposition_counts.supported_for_human_review!==5 || report.disposition_counts.bounded_non_link!==4 || report.disposition_counts.retained_candidate_only!==2)fail('disposition count drift');
console.log('validate-m05-answerable-power-sprint-02-leg-06: OK');
