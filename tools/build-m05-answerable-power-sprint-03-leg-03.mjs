#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-03-surveillance-enforcement.json');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(stress)).digest('hex');
const byDisposition=stress.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-03-report@1',
  program_id:stress.program_id,
  sprint_id:stress.sprint_id,
  leg_id:stress.leg_id,
  title:stress.title,
  status:stress.status,
  constitution_under_test:stress.constitution_under_test,
  fingerprint,
  counts:{
    systems:stress.systems.length,
    domain_invariants:stress.domain_adapter.coercive_domain_invariants.length,
    r_levels:stress.r_level_tests.length,
    action_packet_fields:stress.action_packet_translation.fields.length,
    cross_system_controls:stress.cross_system_controls.length,
    propositions:stress.propositions.length,
    by_disposition:byDisposition,
    elite_acquisitions:stress.decisive_acquisition.elite.length,
    syri_acquisitions:stress.decisive_acquisition.syri.length,
    comparator_classes:stress.decisive_acquisition.comparators.length
  },
  governing_question:stress.governing_question,
  systems:stress.systems,
  domain_adapter:stress.domain_adapter,
  r_level_tests:stress.r_level_tests,
  action_packet_translation:stress.action_packet_translation,
  cross_system_controls:stress.cross_system_controls,
  decisive_acquisition:stress.decisive_acquisition,
  propositions:stress.propositions,
  current_result:stress.current_result,
  boundaries:stress.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-03.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const systemRows=stress.systems.map((row)=>`<tr><td><code>${esc(row.system_id)}</code></td><td>${esc(row.case_name)}</td><td>${esc(row.jurisdiction)}</td><td>${esc(row.observed_control)}</td><td><code>${esc(row.highest_observed_level)}</code></td><td>${esc(row.largest_limit)}</td></tr>`).join('');
const levelRows=stress.r_level_tests.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.required_by_apc)}</td><td><code>${esc(row.elite_state)}</code><br>${esc(row.elite_observation)}</td><td><code>${esc(row.syri_state)}</code><br>${esc(row.syri_observation)}</td><td><code>${esc(row.domain_result)}</code></td></tr>`).join('');
const controlRows=stress.cross_system_controls.map((row)=>`<tr><td><code>${esc(row.control_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.limit)}</td></tr>`).join('');
const propositionRows=stress.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Surveillance and enforcement stress test</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · S03-L3</b></p><h1>Surveillance, enforcement, and system prohibition</h1><p class="state">BOUNDED DOMAIN TEST · COMPOSED ANSWER NOT YET OBSERVED</p><div class="metrics"><div class="metric"><b>${report.counts.systems}</b>systems</div><div class="metric"><b>${report.counts.r_levels}</b>R-level tests</div><div class="metric"><b>${report.counts.domain_invariants}</b>domain invariants</div><div class="metric"><b>${report.counts.action_packet_fields}</b>action-packet fields</div><div class="metric"><b>${report.counts.cross_system_controls}</b>controls</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div></div><h2>Governing question</h2><pre class="box">${esc(stress.governing_question)}</pre><h2>Systems</h2><table><tr><th>System</th><th>Case</th><th>Jurisdiction</th><th>Observed control</th><th>Highest</th><th>Largest limit</th></tr>${systemRows}</table><h2>Inference-to-Intervention Covenant</h2><pre class="box">${esc(JSON.stringify(stress.domain_adapter,null,2))}</pre><h2>R1–R7 stress matrix</h2><table><tr><th>Level</th><th>APC requirement</th><th>ELITE</th><th>SyRI</th><th>Domain result</th></tr>${levelRows}</table><h2>Action-packet translation</h2><pre class="box">${esc(JSON.stringify(stress.action_packet_translation,null,2))}</pre><h2>Cross-system controls</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Limit</th></tr>${controlRows}</table><h2>Decisive acquisition</h2><pre class="box">${esc(JSON.stringify(stress.decisive_acquisition,null,2))}</pre><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(stress.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(stress.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-03.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-03: ${report.counts.systems} systems, ${report.counts.r_levels} R-level tests, ${report.counts.propositions} propositions`);
