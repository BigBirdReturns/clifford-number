#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const sources=read('data/intake/m05-answerable-power-sprint-02-leg-03-ngc2-sources.json');
const matrix=read('data/project/m05-answerable-power-sprint-02-ngc2-responsibility-acceptance.json');
const sourceById=new Map(sources.sources.map((row)=>[row.source_id,row]));
const usedIds=[...new Set(matrix.public_decision_chain.flatMap((row)=>row.source_ids||[]))];
const usedSources=usedIds.map((id)=>sourceById.get(id)).filter(Boolean);
const dispositionCounts=matrix.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const acceptanceCounts=matrix.acceptance_ledger.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});

const report={
  schema_version:'m05-sprint-02-leg-03-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  leg_id:'S02-L3',
  generated_from:[
    'data/intake/m05-answerable-power-sprint-02-leg-03-ngc2-sources.json',
    'data/project/m05-answerable-power-sprint-02-ngc2-responsibility-acceptance.json'
  ],
  counts:{
    sources:sources.sources.length,
    sources_used:usedSources.length,
    decision_stages:matrix.public_decision_chain.length,
    responsibility_actors:matrix.responsibility_matrix.length,
    acceptance_objects:matrix.acceptance_ledger.length,
    propositions:matrix.propositions.length,
    required_acquisitions:matrix.decisive_acquisition_contract.required_objects.length,
    lawful_routes:matrix.decisive_acquisition_contract.lawful_routes.length
  },
  disposition_counts:dispositionCounts,
  acceptance_disposition_counts:acceptanceCounts,
  matrix,
  source_records:usedSources,
  current_result:matrix.current_result,
  boundaries:matrix.boundaries
};

write('reports/core-thesis/answerable-power/sprint-02-leg-03.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const decisionRows=matrix.public_decision_chain.map((row)=>`<tr><td>${esc(row.date)}</td><td><code>${esc(row.stage)}</code></td><td>${esc(row.observation)}</td><td>${esc(row.current_ceiling)}</td><td>${esc(row.missing)}</td></tr>`).join('');
const responsibilityRows=matrix.responsibility_matrix.map((row)=>`<tr><td><code>${esc(row.actor_id)}</code></td><td>${esc(row.actor)}</td><td>${esc(row.documented_responsibilities.join('; '))}</td><td>${esc(row.documented_rights.join('; '))}</td><td>${esc(row.unresolved.join('; '))}</td></tr>`).join('');
const acceptanceRows=matrix.acceptance_ledger.map((row)=>`<tr><td>${esc(row.object)}</td><td><code>${esc(row.state)}</code></td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.ceiling)}</td></tr>`).join('');
const propositionRows=matrix.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const sourceRows=usedSources.map((row)=>`<tr><td><code>${esc(row.source_id)}</code></td><td><a href="${esc(row.url)}">${esc(row.title)}</a></td><td>${esc(row.source_class)}</td><td>${esc(row.supports.join('; '))}</td><td>${esc(row.does_not_support.join('; '))}</td></tr>`).join('');
const acquisitionItems=matrix.decisive_acquisition_contract.required_objects.map((item)=>`<li>${esc(item)}</li>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 Leg 03</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 Leg 03: NGC2 responsibility and acceptance</h1><p class="state">ARMY MISSION SOVEREIGNTY AND MULTI-VENDOR INTEGRATION SUPPORTED · FINAL ACCEPTANCE AND RIGHTS OPEN</p><div class="metrics"><div class="metric"><b>${report.counts.sources}</b>official sources</div><div class="metric"><b>${report.counts.decision_stages}</b>decision stages</div><div class="metric"><b>${report.counts.responsibility_actors}</b>responsibility actors</div><div class="metric"><b>${report.counts.acceptance_objects}</b>acceptance objects</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div><div class="metric"><b>${report.counts.required_acquisitions}</b>decisive objects</div></div><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result,null,2))}</pre><h2>Public decision chain</h2><table><tr><th>Date</th><th>Stage</th><th>Observation</th><th>Current ceiling</th><th>Missing</th></tr>${decisionRows}</table><h2>Responsibility matrix</h2><table><tr><th>ID</th><th>Actor</th><th>Documented responsibilities</th><th>Documented rights</th><th>Unresolved</th></tr>${responsibilityRows}</table><h2>Acceptance ledger</h2><table><tr><th>Object</th><th>State</th><th>Disposition</th><th>Ceiling</th></tr>${acceptanceRows}</table><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Official source denominator</h2><table><tr><th>ID</th><th>Source</th><th>Class</th><th>Supports</th><th>Does not support</th></tr>${sourceRows}</table><h2>Next decisive acquisitions</h2><ol class="box">${acquisitionItems}</ol><h2>Falsifier</h2><p class="box">${esc(matrix.decisive_acquisition_contract.falsifier)}</p><h2>Stopping rule</h2><p class="box">${esc(matrix.decisive_acquisition_contract.stopping_rule)}</p><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-leg-03.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-leg-03: ${report.counts.sources} sources, ${report.counts.propositions} propositions`);
