#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-05-r6-sources.json');
const candidate=read('data/project/m05-answerable-power-sprint-02-r6-works-council.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-leg-05.json');

if(sources.sources.length!==8)fail(`expected eight sources, got ${sources.sources.length}`);
if(new Set(sources.sources.map((row)=>row.source_id)).size!==sources.sources.length)fail('duplicate source ids');
const sourceIds=new Set(sources.sources.map((row)=>row.source_id));
for(const source of sources.sources){
  if(!source.url.startsWith('https://'))fail(`${source.source_id}: HTTPS required`);
  if(!source.supports.length || !source.does_not_support.length)fail(`${source.source_id}: incomplete source boundary`);
}
if(candidate.r6_dimensions.length!==8)fail(`expected eight R6 dimensions, got ${candidate.r6_dimensions.length}`);
if(candidate.propositions.length!==8)fail(`expected eight propositions, got ${candidate.propositions.length}`);
const dispositions=new Set(['supported_for_human_review','bounded_non_link','retained_candidate_only','requires_additional_acquisition']);
for(const proposition of candidate.propositions){
  if(!dispositions.has(proposition.disposition))fail(`${proposition.proposition_id}: invalid disposition`);
  if(!proposition.source_ids.length || !proposition.source_ids.every((id)=>sourceIds.has(id)))fail(`${proposition.proposition_id}: unknown source`);
  if(!proposition.counterevidence.length || !proposition.falsifier || !proposition.stopping_rule)fail(`${proposition.proposition_id}: incomplete adjudication`);
}
const p03=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L5-P03');
const p04=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L5-P04');
const p06=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L5-P06');
const p08=candidate.propositions.find((row)=>row.proposition_id==='M05-S02-L5-P08');
if(p03?.maximum_ceiling!=='R6_bounded_collective_co_governance_over_monitoring_use')fail('R6 ceiling drift');
if(p04?.disposition!=='bounded_non_link')fail('individual veto non-link must remain explicit');
if(p06?.disposition!=='bounded_non_link')fail('deletion and value recovery non-link must remain explicit');
if(p08?.disposition!=='bounded_non_link')fail('works-standard non-link must remain explicit');
if(candidate.current_result.highest_observed_level!=='R6' || candidate.current_result.observed_binding_result!==true)fail('R6 current result drift');
if(candidate.current_result.represented_population_has_direct_individual_veto!==false)fail('individual veto boundary drift');
if(candidate.current_result.works_standard_met!==false)fail('works standard must remain unmet');
for(const object of [sources.boundaries,candidate.boundaries,report.boundaries]){
  for(const [key,value] of Object.entries(object)){
    if(['promotes_to','graph_effect'].includes(key))continue;
    if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
  }
}
if(report.counts.sources!==8 || report.counts.r6_dimensions!==8 || report.counts.propositions!==8)fail('report count drift');
if(report.disposition_counts.supported_for_human_review!==4 || report.disposition_counts.bounded_non_link!==3 || report.disposition_counts.retained_candidate_only!==1)fail('disposition count drift');
console.log('validate-m05-answerable-power-sprint-02-leg-05: OK');
