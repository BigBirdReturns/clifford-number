#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-02-sources.json');
const closure=read('data/project/m05-answerable-power-sprint-02-clifford-anduril-closure.json');
const report=read('reports/core-thesis/answerable-power/sprint-02-leg-02.json');

if(sources.sources.length!==9)fail(`expected 9 sources, got ${sources.sources.length}`);
if(new Set(sources.sources.map((row)=>row.source_id)).size!==sources.sources.length)fail('duplicate source ids');
for(const source of sources.sources){
  if(!source.url.startsWith('https://'))fail(`${source.source_id}: HTTPS required`);
  if(!source.source_class || !source.subjects.length)fail(`${source.source_id}: source metadata incomplete`);
  if(!source.supports.length || !source.does_not_support.length)fail(`${source.source_id}: support boundary missing`);
}
if(sources.search_denominator.found_direct_bilateral_instrument!==false)fail('direct bridge must remain absent in frozen denominator');
if(sources.search_denominator.found_process_mediated_overlap!==true)fail('process overlap must remain recorded');
if(closure.timeline.length!==9)fail(`expected 9 timeline events, got ${closure.timeline.length}`);
if(closure.propositions.length!==5)fail(`expected 5 propositions, got ${closure.propositions.length}`);
const allowed=new Set(['supported_for_human_review','requires_additional_acquisition','bounded_non_link','retained_candidate_only','falsified','source_restricted','source_unavailable']);
for(const row of closure.propositions){
  if(!allowed.has(row.disposition))fail(`${row.proposition_id}: invalid disposition`);
  if(!row.maximum_ceiling || !row.support || !row.counterevidence)fail(`${row.proposition_id}: incomplete adjudication`);
}
const dispositionCounts=closure.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
if(dispositionCounts.supported_for_human_review!==1)fail('expected one supported proposition');
if(dispositionCounts.requires_additional_acquisition!==1)fail('expected one acquisition-open proposition');
if(dispositionCounts.bounded_non_link!==3)fail('expected three bounded non-links');
if(closure.current_result.direct_bridge!=='bounded_non_link')fail('direct bridge must close as bounded non-link');
if(closure.current_result.process_overlap!=='supported_for_human_review')fail('process overlap must remain supported');
if(closure.current_result.best_current_explanation.indexOf('ordinary shared')<0)fail('ordinary ecology explanation missing');
if(closure.decisive_acquisition_contract.required_objects.length<8)fail('reopening contract too weak');
if(!closure.decisive_acquisition_contract.falsifier || !closure.decisive_acquisition_contract.stopping_rule)fail('falsifier or stopping rule missing');
for(const [key,value] of Object.entries(closure.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
}
if(report.counts.sources!==9 || report.counts.timeline_events!==9 || report.counts.propositions!==5)fail('report count drift');
if(report.current_result.direct_bridge!=='bounded_non_link')fail('report direct-bridge drift');
if(JSON.stringify(report.boundaries)!==JSON.stringify(closure.boundaries))fail('report boundary drift');
console.log('validate-m05-answerable-power-sprint-02-leg-02: OK');
