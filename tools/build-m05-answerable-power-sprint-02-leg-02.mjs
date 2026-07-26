#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-02-sources.json');
const closure=read('data/project/m05-answerable-power-sprint-02-clifford-anduril-closure.json');
const sourceById=new Map(sources.sources.map((row)=>[row.source_id,row]));
const usedIds=[...new Set(closure.timeline.flatMap((row)=>row.source_ids||[]))];
const usedSources=usedIds.map((id)=>sourceById.get(id)).filter(Boolean);
const dispositionCounts=closure.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});

const report={
  schema_version:'m05-sprint-02-leg-02-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  leg_id:'S02-L2',
  generated_from:[
    'data/intake/m05-answerable-power-sprint-02-leg-02-sources.json',
    'data/project/m05-answerable-power-sprint-02-clifford-anduril-closure.json'
  ],
  counts:{
    sources:sources.sources.length,
    sources_used:usedSources.length,
    timeline_events:closure.timeline.length,
    propositions:closure.propositions.length,
    required_acquisitions:closure.decisive_acquisition_contract.required_objects.length,
    lawful_routes:closure.decisive_acquisition_contract.lawful_routes.length
  },
  disposition_counts:dispositionCounts,
  search_denominator:sources.search_denominator,
  closure,
  source_records:usedSources,
  current_result:closure.current_result,
  boundaries:closure.boundaries
};

write('reports/core-thesis/answerable-power/sprint-02-leg-02.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const timelineRows=closure.timeline.map((row)=>`<tr><td>${esc(row.date)}</td><td>${esc(row.event)}</td><td>${esc(row.relationship_to_question)}</td><td>${esc(row.source_ids.join(', '))}</td></tr>`).join('');
const propositionRows=closure.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const acquisitionItems=closure.decisive_acquisition_contract.required_objects.map((item)=>`<li>${esc(item)}</li>`).join('');
const sourceRows=usedSources.map((row)=>`<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a></td><td>${esc(row.source_class)}</td><td>${esc(row.supports.join('; '))}</td><td>${esc(row.does_not_support.join('; '))}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 Leg 02</title><style>body{font:16px/1.55 system-ui;max-width:1450px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 Leg 02: Matt Clifford × Anduril</h1><p class="state">DIRECT BRIDGE CLOSED AT THE FROZEN PUBLIC-RECORD DENOMINATOR</p><div class="metrics"><div class="metric"><b>${report.counts.sources}</b>source records</div><div class="metric"><b>${report.counts.timeline_events}</b>timeline events</div><div class="metric"><b>${report.counts.propositions}</b>bounded propositions</div><div class="metric"><b>${report.disposition_counts.bounded_non_link||0}</b>bounded non-links</div><div class="metric"><b>${report.counts.required_acquisitions}</b>reopening objects</div></div><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result,null,2))}</pre><h2>Timeline</h2><table><tr><th>Date</th><th>Event</th><th>Relation to question</th><th>Sources</th></tr>${timelineRows}</table><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Frozen source denominator</h2><table><tr><th>ID</th><th>Source</th><th>Class</th><th>Supports</th><th>Does not support</th></tr>${sourceRows}</table><h2>Reopening contract</h2><ol class="box">${acquisitionItems}</ol><h2>Falsifier</h2><p class="box">${esc(closure.decisive_acquisition_contract.falsifier)}</p><h2>Stopping rule</h2><p class="box">${esc(closure.decisive_acquisition_contract.stopping_rule)}</p><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-leg-02.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-leg-02: ${report.counts.sources} sources, ${report.counts.propositions} propositions`);
