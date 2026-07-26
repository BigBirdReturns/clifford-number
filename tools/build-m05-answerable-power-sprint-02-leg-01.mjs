#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const survey=read('data/project/m05-answerable-power-sprint-02-ecosystem-survey.json');
const decision=read('data/project/m05-answerable-power-sprint-02-clifford-decision-file-01.json');
const sourceRegistry=read('data/intake/m05-answerable-power-sprint-01-sources.json');
const sourceById=new Map(sourceRegistry.sources.map((row)=>[row.source_id,row]));
const resolvedSources=decision.source_ids.map((sourceId)=>sourceById.get(sourceId)).filter(Boolean);

const dispositionCounts=decision.propositions.reduce((acc,row)=>{
  acc[row.disposition]=(acc[row.disposition]||0)+1;
  return acc;
},{});
const transitionCounts=decision.transition_status.reduce((acc,row)=>{
  acc[row.state]=(acc[row.state]||0)+1;
  return acc;
},{});

const report={
  schema_version:'m05-sprint-02-leg-01-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  leg_id:'S02-L1',
  generated_from:[
    'data/project/m05-answerable-power-sprint-02-ecosystem-survey.json',
    'data/project/m05-answerable-power-sprint-02-clifford-decision-file-01.json',
    'data/intake/m05-answerable-power-sprint-01-sources.json'
  ],
  counts:{
    ecosystem_layers:survey.layers.length,
    decision_sources:resolvedSources.length,
    chain_stages:decision.public_record_chain.length,
    transitions:decision.transition_status.length,
    propositions:decision.propositions.length,
    required_acquisitions:decision.decisive_acquisition_contract.required_objects.length
  },
  disposition_counts:dispositionCounts,
  transition_counts:transitionCounts,
  ecosystem:survey,
  decision_file:decision,
  source_records:resolvedSources,
  current_result:{
    selected_leg:survey.selected_next_leg,
    disposition:decision.current_disposition,
    maximum_current_ceiling:decision.maximum_current_ceiling,
    closed_now:[
      'formal commission of Clifford to lead the Action Plan',
      'publication of the fifty-recommendation plan',
      'same-day appointment to an unpaid implementation-adviser role',
      'public disclosure of outside interests and mitigation procedures'
    ],
    still_open:[
      'exact recommendation text, number, authorship, drafts and redlines',
      'ministerial acceptance or modification record',
      'appointment-selection process and candidate denominator',
      'decision-specific conflict mitigation or recusal',
      'one advice-to-decision-to-implementation-to-outcome chain'
    ]
  },
  boundaries:decision.boundaries
};

write('reports/core-thesis/answerable-power/sprint-02-leg-01.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const layerRows=survey.layers.map((row)=>`<tr><td><code>${esc(row.layer_id)}</code></td><td>${esc(row.name)}</td><td><code>${esc(row.state)}</code></td><td>${esc(row.strength)}</td><td>${esc(row.constraint)}</td></tr>`).join('');
const chainRows=decision.public_record_chain.map((row)=>`<tr><td>${esc(row.date)}</td><td><code>${esc(row.stage)}</code></td><td><code>${esc(row.source_id)}</code></td><td>${esc(row.observation)}</td><td>${esc(row.does_not_support)}</td></tr>`).join('');
const propositionRows=decision.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const acquisitionItems=decision.decisive_acquisition_contract.required_objects.map((item)=>`<li>${esc(item)}</li>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 Leg 01</title><style>body{font:16px/1.55 system-ui;max-width:1400px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 Leg 01: ecosystem survey and Matt Clifford decision file</h1><p class="state">STARTED · REQUIRES ADDITIONAL ACQUISITION</p><div class="metrics"><div class="metric"><b>${report.counts.ecosystem_layers}</b>ecosystem layers</div><div class="metric"><b>${report.counts.decision_sources}</b>official source records</div><div class="metric"><b>${report.counts.chain_stages}</b>public chain stages</div><div class="metric"><b>${report.counts.propositions}</b>bounded propositions</div><div class="metric"><b>${report.counts.required_acquisitions}</b>decisive acquisition objects</div></div><h2>Ecosystem survey</h2><table><tr><th>Layer</th><th>Name</th><th>State</th><th>Strength</th><th>Constraint</th></tr>${layerRows}</table><h2>Frozen public record chain</h2><table><tr><th>Date</th><th>Stage</th><th>Source</th><th>Observation</th><th>Does not support</th></tr>${chainRows}</table><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Next decisive acquisitions</h2><ol class="box">${acquisitionItems}</ol><h2>Falsifier</h2><p class="box">${esc(decision.decisive_acquisition_contract.falsifier)}</p><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-leg-01.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-leg-01: ${report.counts.decision_sources} sources, ${report.counts.propositions} propositions`);
