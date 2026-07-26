#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const reconciliation=read('data/project/m05-answerable-power-sprint-02-reconciliation.json');
const observation=read('data/project/m05-answerable-power-sprint-02-source-health-observation.json');

const legStates=reconciliation.legs.reduce((acc,row)=>{acc[row.state]=(acc[row.state]||0)+1;return acc},{});
const observedLevels=reconciliation.answer_library.filter((row)=>row.observed).map((row)=>row.level);
const report={
  schema_version:'m05-answerable-power-sprint-02-reconciliation-report@2',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-02',
  generated_from:[
    'data/project/m05-answerable-power-sprint-02-reconciliation.json',
    'data/project/m05-answerable-power-sprint-02-source-health-observation.json'
  ],
  counts:{
    legs:reconciliation.legs.length,
    merged_bounded_legs:reconciliation.legs.filter((row)=>row.state==='merged_bounded').length,
    merged_observed_targets_missed:reconciliation.legs.filter((row)=>row.state==='merged_observed_targets_missed').length,
    answer_levels_observed:observedLevels.length,
    healthy_basins:observation.healthy_basins,
    unhealthy_basins:observation.unhealthy_basins.length,
    next_frontiers:reconciliation.next_marathon_frontier.length
  },
  leg_state_counts:legStates,
  answer_levels_observed:observedLevels,
  reconciliation,
  source_health_observation:observation,
  source_health_state:observation.state_separation,
  terminal_state:observation.state_separation.execution_complete
    ? 'sprint_02_reconciled_with_open_source_health_deficit'
    : 'source_health_orbit_incomplete',
  boundaries:reconciliation.boundaries
};
write('reports/core-thesis/answerable-power/sprint-02-reconciliation.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const legRows=reconciliation.legs.map((row)=>`<tr><td><code>${esc(row.leg_id)}</code></td><td>${esc(row.title)}</td><td><code>${esc(row.state)}</code></td><td>${esc(row.result)}</td></tr>`).join('');
const answerRows=reconciliation.answer_library.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.name)}</td><td><code>${row.observed?'observed':'open'}</code></td><td>${esc(row.examples.join(' · '))}</td><td>${esc(row.limit)}</td></tr>`).join('');
const basinRows=observation.basins.map((row)=>`<tr><td><code>${esc(row.basin_id)}</code></td><td>${row.route_succeeded}/${row.selected}</td><td>${row.content_succeeded}/${row.selected}</td><td>${row.metadata_only}</td><td>${row.failed}</td><td><code>${row.coverage_healthy?'healthy':'open'}</code></td></tr>`).join('');
const frontierItems=reconciliation.next_marathon_frontier.map((row)=>`<li>${esc(row)}</li>`).join('');
const stateColor=observation.state_separation.coverage_healthy?'#08783e':'#a43a00';
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 02 reconciliation</title><style>body{font:16px/1.55 system-ui;max-width:1440px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:${stateColor}}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 02 reconciliation</h1><p class="state">${esc(report.terminal_state.toUpperCase().replaceAll('_',' '))}</p><div class="metrics"><div class="metric"><b>${report.counts.legs}</b>sprint legs</div><div class="metric"><b>${report.counts.answer_levels_observed}</b>answer levels observed</div><div class="metric"><b>${observation.route_succeeded}/${observation.selected}</b>route success</div><div class="metric"><b>${observation.content_succeeded}/${observation.selected}</b>content success</div><div class="metric"><b>${observation.healthy_basins}/${observation.expected_basins}</b>healthy basins</div><div class="metric"><b>${esc(reconciliation.cross_domain_assessment.works_standard_met)}</b>works standard</div></div><h2>Legs</h2><table><tr><th>Leg</th><th>Title</th><th>State</th><th>Result</th></tr>${legRows}</table><h2>Answer library</h2><table><tr><th>Level</th><th>Name</th><th>State</th><th>Examples</th><th>Limit</th></tr>${answerRows}</table><h2>Observed source-health denominator</h2><table><tr><th>Basin</th><th>Route</th><th>Content</th><th>Metadata</th><th>Failed</th><th>Health</th></tr>${basinRows}</table><h2>Source-health state</h2><pre class="box">${esc(JSON.stringify({run_id:observation.run_id,proof_sha256:observation.proof_sha256,global_route_success_rate:observation.global_route_success_rate,global_content_success_rate:observation.global_content_success_rate,healthy_basins:observation.healthy_basins,unhealthy_basins:observation.unhealthy_basins,state_separation:observation.state_separation,acceptance_result:observation.acceptance_result,failure_class_counts:observation.failure_class_counts},null,2))}</pre><h2>Cross-domain assessment</h2><pre class="box">${esc(JSON.stringify(reconciliation.cross_domain_assessment,null,2))}</pre><h2>Next marathon frontier</h2><ol class="box">${frontierItems}</ol><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-02-reconciliation.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-02-reconciliation: ${report.counts.legs} legs, ${report.counts.answer_levels_observed} observed answer levels, ${report.terminal_state}`);
