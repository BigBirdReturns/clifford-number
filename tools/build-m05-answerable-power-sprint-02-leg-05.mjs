#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-05-r6-sources.json');
const candidate=read('data/project/m05-answerable-power-sprint-02-r6-works-council.json');
const sourceById=new Map(sources.sources.map((row)=>[row.source_id,row]));
const dispositionCounts=candidate.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const dimensionCounts=candidate.r6_dimensions.reduce((acc,row)=>{acc[row.state]=(acc[row.state]||0)+1;return acc},{});
const usedSourceIds=[...new Set(candidate.propositions.flatMap((row)=>row.source_ids))];
const usedSources=usedSourceIds.map((id)=>sourceById.get(id)).filter(Boolean);

const report={
  schema_version:'m05-sprint-02-leg-05-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  leg_id:'S02-L5',
  generated_from:[
    'data/intake/m05-answerable-power-sprint-02-leg-05-r6-sources.json',
    'data/project/m05-answerable-power-sprint-02-r6-works-council.json'
  ],
  counts:{
    sources:sources.sources.length,
    sources_used:usedSources.length,
    r6_dimensions:candidate.r6_dimensions.length,
    propositions:candidate.propositions.length
  },
  disposition_counts:dispositionCounts,
  dimension_counts:dimensionCounts,
  source_registry:sources,
  candidate,
  source_records:usedSources,
  current_result:candidate.current_result,
  boundaries:candidate.boundaries
};
write('reports/core-thesis/answerable-power/sprint-02-leg-05.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const sourceRows=sources.sources.map((row)=>`<tr><td><code>${esc(row.source_id)}</code></td><td>${esc(row.title)}</td><td><code>${esc(row.source_class)}</code></td></tr>`).join('');
const dimensionRows=candidate.r6_dimensions.map((row)=>`<tr><td><code>${esc(row.dimension)}</code></td><td><code>${esc(row.state)}</code></td><td>${esc(row.observation)}</td><td>${esc(row.limit)}</td></tr>`).join('');
const propositionRows=candidate.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 Leg 05</title><style>body{font:16px/1.55 system-ui;max-width:1400px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 Leg 05: bounded R6 co-governance candidate</h1><p class="state">R6 OBSERVED AT A BOUNDED COLLECTIVE MONITORING-USE CEILING</p><div class="metrics"><div class="metric"><b>${report.counts.sources}</b>official sources</div><div class="metric"><b>${report.counts.r6_dimensions}</b>R6 dimensions</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div><div class="metric"><b>${esc(report.current_result.highest_observed_level)}</b>highest observed</div></div><h2>Primary deployment</h2><pre class="box">${esc(JSON.stringify(candidate.primary_deployment,null,2))}</pre><h2>Source registry</h2><table><tr><th>ID</th><th>Source</th><th>Class</th></tr>${sourceRows}</table><h2>R6 dimensions</h2><table><tr><th>Dimension</th><th>State</th><th>Observation</th><th>Limit</th></tr>${dimensionRows}</table><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-leg-05.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-leg-05: ${report.counts.sources} sources, ${report.counts.r6_dimensions} dimensions, ${report.counts.propositions} propositions`);
