#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(stress)).digest('hex');
const byDisposition=stress.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-05-report@1',
  program_id:stress.program_id,
  sprint_id:stress.sprint_id,
  leg_id:stress.leg_id,
  title:stress.title,
  status:stress.status,
  constitution_under_test:stress.constitution_under_test,
  domain_adapter_id:stress.domain_adapter_id,
  fingerprint,
  counts:{
    systems:stress.systems.length,
    public_sovereignty_requirements:stress.domain_adapter.public_sovereignty_requirements.length,
    r_levels:stress.r_level_tests.length,
    fault_lines:stress.exit_fault_lines.length,
    sovereignty_dimensions:stress.operating_sovereignty_matrix.length,
    cross_system_controls:stress.cross_system_controls.length,
    propositions:stress.propositions.length,
    by_disposition:byDisposition,
    homes_for_ukraine_acquisitions:stress.decisive_acquisition.homes_for_ukraine.length,
    nhs_acquisitions:stress.decisive_acquisition.nhs.length,
    ngc2_acquisitions:stress.decisive_acquisition.ngc2.length,
    comparator_classes:stress.decisive_acquisition.comparators.length
  },
  governing_question:stress.governing_question,
  systems:stress.systems,
  domain_adapter:stress.domain_adapter,
  r_level_tests:stress.r_level_tests,
  exit_fault_lines:stress.exit_fault_lines,
  operating_sovereignty_matrix:stress.operating_sovereignty_matrix,
  cross_system_controls:stress.cross_system_controls,
  decisive_acquisition:stress.decisive_acquisition,
  propositions:stress.propositions,
  current_result:stress.current_result,
  boundaries:stress.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-05.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const systemRows=stress.systems.map((row)=>`<tr><td><code>${esc(row.system_id)}</code></td><td>${esc(row.case_name)}</td><td>${esc(row.system_role)}</td><td>${esc(row.observed_transition)}</td><td><code>${esc(row.highest_observed_level)}</code></td><td>${esc(row.open_join)}</td></tr>`).join('');
const levelRows=stress.r_level_tests.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.required_by_apc)}</td><td><code>${esc(row.homes_for_ukraine_state)}</code><br>${esc(row.homes_for_ukraine_observation)}</td><td><code>${esc(row.nhs_state)}</code><br>${esc(row.nhs_observation)}</td><td><code>${esc(row.ngc2_state)}</code><br>${esc(row.ngc2_observation)}</td><td>${esc(row.domain_result)}</td></tr>`).join('');
const faultRows=stress.exit_fault_lines.map((row)=>`<tr><td><code>${esc(row.fault_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.observation)}</td><td>${esc(row.required_control)}</td></tr>`).join('');
const matrixRows=stress.operating_sovereignty_matrix.map((row)=>`<tr><td><code>${esc(row.dimension)}</code></td><td>${esc(row.homes_for_ukraine)}</td><td>${esc(row.nhs)}</td><td>${esc(row.ngc2)}</td></tr>`).join('');
const controlRows=stress.cross_system_controls.map((row)=>`<tr><td><code>${esc(row.control_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.limit)}</td></tr>`).join('');
const propositionRows=stress.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Public-platform exit stress test</title><style>body{font:16px/1.55 system-ui;max-width:1600px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · S03-L5</b></p><h1>Public-platform exit, substitution, and operating sovereignty</h1><p class="state">R5 POSITIVE CONTROL · COMPOSED ANSWER NOT YET OBSERVED</p><div class="metrics"><div class="metric"><b>${report.counts.systems}</b>systems</div><div class="metric"><b>${report.counts.r_levels}</b>R-level tests</div><div class="metric"><b>${report.counts.public_sovereignty_requirements}</b>sovereignty requirements</div><div class="metric"><b>${report.counts.fault_lines}</b>fault lines</div><div class="metric"><b>${report.counts.sovereignty_dimensions}</b>matrix dimensions</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div></div><h2>Governing question</h2><pre class="box">${esc(stress.governing_question)}</pre><h2>Systems</h2><table><tr><th>System</th><th>Case</th><th>Role</th><th>Observed transition</th><th>Highest</th><th>Open join</th></tr>${systemRows}</table><h2>Public Operating Sovereignty Covenant</h2><pre class="box">${esc(JSON.stringify(stress.domain_adapter,null,2))}</pre><h2>R1–R7 stress matrix</h2><table><tr><th>Level</th><th>APC requirement</th><th>Homes for Ukraine</th><th>NHS</th><th>NGC2</th><th>Domain result</th></tr>${levelRows}</table><h2>Exit fault lines</h2><table><tr><th>ID</th><th>Name</th><th>Observation</th><th>Required control</th></tr>${faultRows}</table><h2>Operating-sovereignty matrix</h2><table><tr><th>Dimension</th><th>Homes for Ukraine</th><th>NHS</th><th>NGC2</th></tr>${matrixRows}</table><h2>Cross-system controls</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Limit</th></tr>${controlRows}</table><h2>Decisive acquisition</h2><pre class="box">${esc(JSON.stringify(stress.decisive_acquisition,null,2))}</pre><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(stress.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(stress.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-05.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-05: ${report.counts.systems} systems, ${report.counts.fault_lines} fault lines, ${report.counts.propositions} propositions`);
