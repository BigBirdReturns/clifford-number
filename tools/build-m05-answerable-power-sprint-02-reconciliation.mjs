#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const reconciliation=read('data/project/m05-answerable-power-sprint-02-reconciliation.json');
const observationPath='data/project/m05-answerable-power-sprint-02-source-health-observation.json';
const sourceHealthObservation=fs.existsSync(path.join(root,observationPath))?read(observationPath):null;

const legStates=reconciliation.legs.reduce((acc,row)=>{acc[row.state]=(acc[row.state]||0)+1;return acc},{});
const observedLevels=reconciliation.answer_library.filter((row)=>row.observed).map((row)=>row.level);
const sourceHealthState=sourceHealthObservation?.state_separation??{
  execution_complete:false,
  coverage_healthy:false,
  evidence_sufficient:false,
  observation_pending:true
};
const report={
  schema_version:'m05-answerable-power-sprint-02-reconciliation-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  generated_from:[
    'data/project/m05-answerable-power-sprint-02-reconciliation.json',
    ...(sourceHealthObservation?[observationPath]:[])
  ],
  counts:{
    legs:reconciliation.legs.length,
    merged_research_legs:reconciliation.legs.filter((row)=>row.state==='merged_bounded').length,
    engineering_merged_pending_proof:reconciliation.legs.filter((row)=>row.state==='engineering_merged_observed_proof_pending').length,
    answer_levels_observed:observedLevels.length,
    next_frontiers:reconciliation.next_marathon_frontier.length
  },
  leg_state_counts:legStates,
  answer_levels_observed:observedLevels,
  reconciliation,
  source_health_observation:sourceHealthObservation,
  source_health_state:sourceHealthState,
  terminal_state:sourceHealthObservation?(
    sourceHealthState.execution_complete?'sprint_02_reconciled':'source_health_orbit_incomplete'
  ):'awaiting_post_repair_orbit',
  boundaries:reconciliation.boundaries
};
write('reports/core-thesis/answerable-power/sprint-02-reconciliation.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const legRows=reconciliation.legs.map((row)=>`<tr><td><code>${esc(row.leg_id)}</code></td><td>${esc(row.title)}</td><td><code>${esc(row.state)}</code></td><td>${esc(row.result)}</td></tr>`).join('');
const answerRows=reconciliation.answer_library.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.name)}</td><td><code>${row.observed?'observed':'open'}</code></td><td>${esc(row.examples.join(' · '))}</td><td>${esc(row.limit)}</td></tr>`).join('');
const frontierItems=reconciliation.next_marathon_frontier.map((row)=>`<li>${esc(row)}</li>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 reconciliation</title><style>body{font:16px/1.55 system-ui;max-width:1440px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 reconciliation</h1><p class="state">${esc(report.terminal_state.toUpperCase().replaceAll('_',' '))}</p><div class="metrics"><div class="metric"><b>${report.counts.legs}</b>sprint legs</div><div class="metric"><b>${report.counts.merged_research_legs}</b>research legs merged</div><div class="metric"><b>${report.counts.answer_levels_observed}</b>answer levels observed</div><div class="metric"><b>${esc(reconciliation.cross_domain_assessment.works_standard_met)}</b>works standard</div></div><h2>Legs</h2><table><tr><th>Leg</th><th>Title</th><th>State</th><th>Result</th></tr>${legRows}</table><h2>Answer library</h2><table><tr><th>Level</th><th>Name</th><th>State</th><th>Examples</th><th>Limit</th></tr>${answerRows}</table><h2>Cross-domain assessment</h2><pre class="box">${esc(JSON.stringify(reconciliation.cross_domain_assessment,null,2))}</pre><h2>Source-health proof gate</h2><pre class="box">${esc(JSON.stringify(report.source_health_state,null,2))}</pre><h2>Next marathon frontier</h2><ol class="box">${frontierItems}</ol><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-reconciliation.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-reconciliation: ${report.counts.legs} legs, ${report.counts.answer_levels_observed} observed answer levels, ${report.terminal_state}`);
