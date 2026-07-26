#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};

const sources=read('data/intake/m05-answerable-power-sprint-01-sources.json');
const triad=read('data/project/m05-answerable-power-sprint-01-triad.json');
const benchmark=read('data/project/m05-answerable-power-benchmark-wave-01.json');
const cadence=read('data/project/m05-answerable-power-sprint-cadence.json');
const sourceHealth=read('data/project/m05-answerable-power-sprint-01-source-health.json');
const report=read('reports/core-thesis/answerable-power/sprint-01.json');

if(sources.sources.length!==25)fail(`expected 25 sources, got ${sources.sources.length}`);
if(new Set(sources.sources.map((row)=>row.source_id)).size!==sources.sources.length)fail('duplicate source ids');
for(const source of sources.sources){
  if(!source.url.startsWith('https://'))fail(`${source.source_id}: HTTPS required`);
  if(!source.source_class || !source.jurisdiction)fail(`${source.source_id}: source metadata incomplete`);
  if(!Array.isArray(source.supports) || !source.supports.length)fail(`${source.source_id}: no support boundary`);
  if(!Array.isArray(source.does_not_support) || !source.does_not_support.length)fail(`${source.source_id}: no limitation boundary`);
}
const sourceIds=new Set(sources.sources.map((row)=>row.source_id));
if(triad.packets.length!==6)fail(`expected six triad packets, got ${triad.packets.length}`);
if(triad.counts.standalone!==3 || triad.counts.overlap!==3)fail('triad must contain three standalone and three overlap packets');
for(const packet of triad.packets){
  if(!['standalone_actor','exact_overlap'].includes(packet.mode))fail(`${packet.packet_id}: invalid mode`);
  if(!packet.source_ids.every((id)=>sourceIds.has(id)))fail(`${packet.packet_id}: unknown source`);
  if(!packet.disposition || !packet.falsifier || !packet.stopping_rule)fail(`${packet.packet_id}: incomplete adjudication`);
  if(!packet.does_not_support.length || !packet.counterevidence.length)fail(`${packet.packet_id}: boundary or counterevidence missing`);
}
if(triad.triad_guardrail.disposition!=='bounded_non_link')fail('triad common-purpose guardrail must remain a bounded non-link');
if(benchmark.cases.length!==4)fail('expected four benchmark cases');
if(benchmark.counts.domains<3 || benchmark.counts.jurisdictions<2)fail('benchmark denominator too narrow');
if(benchmark.cross_domain_assessment.works_standard_met!==false)fail('Sprint 01 cannot claim the works standard');
if(benchmark.cross_domain_assessment.observed_levels.includes('R6') || benchmark.cross_domain_assessment.observed_levels.includes('R7'))fail('R6/R7 not observed in Wave 01');
for(const item of benchmark.cases){
  if(!item.source_ids.every((id)=>sourceIds.has(id)))fail(`${item.case_id}: unknown source`);
  if(!item.observed_outcome || !item.costs_and_limits.length || !item.transferable_mechanism)fail(`${item.case_id}: incomplete answer case`);
}
if(cadence.sprint_length_days!==14 || cadence.sprint_legs.length!==7)fail('sprint cadence drift');
if(cadence.exit_criteria.length<7)fail('sprint exit criteria too weak');
if(sourceHealth.basis.polls_selected!==96 || sourceHealth.basis.polls_succeeded!==53 || sourceHealth.basis.polls_failed!==43)fail('M-04G source-health baseline drift');
if(sourceHealth.state_separation.execution_complete!==true || sourceHealth.state_separation.coverage_healthy!==false || sourceHealth.state_separation.evidence_sufficient!==false)fail('source-health states collapsed');
if(sourceHealth.failure_taxonomy.reduce((sum,row)=>sum+row.count,0)!==43)fail('failure taxonomy denominator mismatch');
for(const object of [sources.boundaries,triad.boundaries,benchmark.boundaries,cadence.boundaries,sourceHealth.boundaries,report.boundaries]){
  for(const [key,value] of Object.entries(object)){
    if(['promotes_to','graph_effect'].includes(key))continue;
    if(typeof value==='boolean' && value!==false)fail(`boundary ${key} must remain false`);
  }
}
if(report.counts.sources!==25 || report.counts.triad_packets!==6 || report.counts.benchmark_cases!==4)fail('report count drift');
if(report.counts.polls_selected!==96 || report.counts.polls_succeeded!==53 || report.counts.polls_failed!==43)fail('report source-health drift');
console.log('validate-m05-answerable-power-sprint-01: OK');
