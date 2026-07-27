#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const data=read('data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json');
const sourceIds=[...new Set(data.systems.flatMap((row)=>row.source_ids).concat(data.propositions.flatMap((row)=>row.source_ids)))].sort();
const dispositions=data.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-05-report@1',
  program_id:data.program_id,
  sprint_id:data.sprint_id,
  leg_id:data.leg_id,
  adapter_id:data.adapter_id,
  generated_from:['data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json'],
  counts:{
    systems:data.systems.length,
    operating_sovereignty_dimensions:data.public_operating_sovereignty_dimensions.length,
    propositions:data.propositions.length,
    source_ids:sourceIds.length,
    pilot_packet_fields:data.adapter.pilot_packet.length,
    by_disposition:dispositions
  },
  systems:data.systems,
  operating_sovereignty_dimensions:data.public_operating_sovereignty_dimensions,
  adapter:data.adapter,
  propositions:data.propositions,
  current_result:data.current_result,
  boundaries:data.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-05.json',JSON.stringify(report,null,2)+'\n');
const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const systemRows=data.systems.map((row)=>`<tr><td><code>${esc(row.system_id)}</code></td><td>${esc(row.title)}</td><td><code>${esc(row.role)}</code></td><td>${esc(row.highest_ceiling)}</td></tr>`).join('');
const dimensionRows=data.public_operating_sovereignty_dimensions.map((row)=>`<tr><td><code>${esc(row.dimension_id)}</code></td><td>${esc(row.requirement)}</td><td>${esc(row.failure_state)}</td></tr>`).join('');
const propositionRows=data.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const packetItems=data.adapter.pilot_packet.map((row)=>`<li>${esc(row)}</li>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 03 Leg 05</title><style>body{font:16px/1.55 system-ui;max-width:1440px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Public-platform exit and operating sovereignty</h1><p class="state">${esc(data.current_result.adapter_state.toUpperCase().replaceAll('_',' '))}</p><div class="metrics"><div class="metric"><b>${report.counts.systems}</b>bounded systems</div><div class="metric"><b>${report.counts.operating_sovereignty_dimensions}</b>sovereignty dimensions</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div><div class="metric"><b>${report.counts.source_ids}</b>source routes</div><div class="metric"><b>${esc(data.current_result.highest_observed_level)}</b>highest observed level</div></div><h2>Systems</h2><table><tr><th>ID</th><th>System</th><th>Role</th><th>Ceiling</th></tr>${systemRows}</table><h2>Public operating-sovereignty dimensions</h2><table><tr><th>Dimension</th><th>Requirement</th><th>Failure state</th></tr>${dimensionRows}</table><h2>APC-EXIT-01 pilot packet</h2><ol class="box">${packetItems}</ol><h2>Propositions</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(data.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(data.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-05.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-05: ${report.counts.systems} systems, ${report.counts.propositions} propositions, ${data.current_result.highest_observed_level}`);
