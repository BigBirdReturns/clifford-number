#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const freeze=read('data/project/m05-answerable-power-sprint-02-leg-04-freeze.json');
const ledger=read('data/project/m05-answerable-power-sprint-02-palantir-person-chain.json');
const sourceById=new Map(freeze.source_freeze.map((row)=>[row.source_id,row]));
const resolvedSources=[...new Set(ledger.propositions.flatMap((row)=>row.source_ids))].map((id)=>sourceById.get(id)).filter(Boolean);
const dispositionCounts=ledger.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const stageCeilingCounts=freeze.frozen_chain.reduce((acc,row)=>{acc[row.ceiling]=(acc[row.ceiling]||0)+1;return acc},{});

const report={
  schema_version:'m05-sprint-02-leg-04-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  leg_id:'S02-L4',
  generated_from:[
    'data/project/m05-answerable-power-sprint-02-leg-04-freeze.json',
    'data/project/m05-answerable-power-sprint-02-palantir-person-chain.json'
  ],
  counts:{
    sources:resolvedSources.length,
    chain_stages:freeze.frozen_chain.length,
    causal_fault_lines:freeze.causal_fault_lines.length,
    propositions:ledger.propositions.length,
    decisive_acquisitions:freeze.decisive_acquisition_contract.required_objects.length
  },
  disposition_counts:dispositionCounts,
  stage_ceiling_counts:stageCeilingCounts,
  freeze,
  ledger,
  source_records:resolvedSources,
  current_result:ledger.current_result,
  boundaries:ledger.boundaries
};

write('reports/core-thesis/answerable-power/sprint-02-leg-04.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const sourceRows=resolvedSources.map((row)=>`<tr><td><code>${esc(row.source_id)}</code></td><td>${esc(row.title)}</td><td><code>${esc(row.source_class)}</code></td></tr>`).join('');
const stageRows=freeze.frozen_chain.map((row)=>`<tr><td><code>${esc(row.stage)}</code></td><td>${esc(row.current_state)}</td><td><code>${esc(row.ceiling)}</code></td></tr>`).join('');
const propositionRows=ledger.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const faultItems=freeze.causal_fault_lines.map((row)=>`<li>${esc(row)}</li>`).join('');
const acquisitionItems=freeze.decisive_acquisition_contract.required_objects.map((row)=>`<li>${esc(row)}</li>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 Leg 04</title><style>body{font:16px/1.55 system-ui;max-width:1400px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 Leg 04: Palantir-attributed ELITE represented-person chain</h1><p class="state">PERSON-LEVEL CHAIN REACHED · CAUSAL FAULT LINES PRESERVED</p><div class="metrics"><div class="metric"><b>${report.counts.sources}</b>source records</div><div class="metric"><b>${report.counts.chain_stages}</b>chain stages</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div><div class="metric"><b>${report.counts.causal_fault_lines}</b>fault lines</div><div class="metric"><b>${report.counts.decisive_acquisitions}</b>open objects</div><div class="metric"><b>${esc(report.current_result.highest_observed_answer_level)}</b>highest answer</div></div><h2>Bounded case</h2><pre class="box">${esc(JSON.stringify(freeze.bounded_case,null,2))}</pre><h2>Source freeze</h2><table><tr><th>ID</th><th>Source</th><th>Class</th></tr>${sourceRows}</table><h2>Frozen chain</h2><table><tr><th>Stage</th><th>Current state</th><th>Ceiling</th></tr>${stageRows}</table><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Maximum ceiling</th></tr>${propositionRows}</table><h2>Causal fault lines</h2><ol class="box">${faultItems}</ol><h2>Decisive acquisitions</h2><ol class="box">${acquisitionItems}</ol><h2>Current result</h2><pre class="box">${esc(JSON.stringify(report.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-leg-04.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-leg-04: ${report.counts.sources} sources, ${report.counts.chain_stages} stages, ${report.counts.propositions} propositions`);
