#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-04-workplace-co-governance.json');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(stress)).digest('hex');
const byDisposition=stress.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-04-report@1',
  program_id:stress.program_id,
  sprint_id:stress.sprint_id,
  leg_id:stress.leg_id,
  title:stress.title,
  status:stress.status,
  constitution_under_test:stress.constitution_under_test,
  fingerprint,
  counts:{
    systems:stress.systems.length,
    domain_invariants:stress.domain_adapter.workplace_invariants.length,
    r_levels:stress.r_level_tests.length,
    fault_lines:stress.architecture_and_governance_fault_lines.length,
    action_packet_fields:stress.action_packet_translation.fields.length,
    cross_system_controls:stress.cross_system_controls.length,
    propositions:stress.propositions.length,
    by_disposition:byDisposition,
    facebook_acquisitions:stress.decisive_acquisition.facebook.length,
    office365_acquisitions:stress.decisive_acquisition.office365.length,
    email_headset_acquisitions:stress.decisive_acquisition.email_and_headset.length,
    comparator_classes:stress.decisive_acquisition.comparators.length
  },
  governing_question:stress.governing_question,
  systems:stress.systems,
  domain_adapter:stress.domain_adapter,
  r_level_tests:stress.r_level_tests,
  architecture_and_governance_fault_lines:stress.architecture_and_governance_fault_lines,
  action_packet_translation:stress.action_packet_translation,
  cross_system_controls:stress.cross_system_controls,
  decisive_acquisition:stress.decisive_acquisition,
  propositions:stress.propositions,
  current_result:stress.current_result,
  boundaries:stress.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-04.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const systemRows=stress.systems.map((row)=>`<tr><td><code>${esc(row.system_id)}</code></td><td>${esc(row.case_name)}</td><td>${esc(row.technical_function)}</td><td>${esc(row.representative_body)}</td><td>${esc(row.observed_control)}</td><td><code>${esc(row.highest_observed_level)}</code></td></tr>`).join('');
const levelRows=stress.r_level_tests.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.required_by_apc)}</td><td><code>${esc(row.facebook_state)}</code><br>${esc(row.facebook_observation)}</td><td><code>${esc(row.centralization_state)}</code><br>${esc(row.centralization_observation)}</td><td><code>${esc(row.domain_result)}</code></td></tr>`).join('');
const faultRows=stress.architecture_and_governance_fault_lines.map((row)=>`<tr><td><code>${esc(row.fault_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.observation)}</td><td>${esc(row.risk)}</td><td>${esc(row.required_control)}</td></tr>`).join('');
const controlRows=stress.cross_system_controls.map((row)=>`<tr><td><code>${esc(row.control_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.limit)}</td></tr>`).join('');
const propositionRows=stress.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workplace co-governance stress test</title><style>body{font:16px/1.55 system-ui;max-width:1550px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · S03-L4</b></p><h1>Workplace-monitoring co-governance, centralization, and bypass</h1><p class="state">R6 POSITIVE CONTROL · COMPOSED ANSWER NOT YET OBSERVED</p><div class="metrics"><div class="metric"><b>${report.counts.systems}</b>systems</div><div class="metric"><b>${report.counts.r_levels}</b>R-level tests</div><div class="metric"><b>${report.counts.domain_invariants}</b>domain invariants</div><div class="metric"><b>${report.counts.fault_lines}</b>fault lines</div><div class="metric"><b>${report.counts.action_packet_fields}</b>action-packet fields</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div></div><h2>Governing question</h2><pre class="box">${esc(stress.governing_question)}</pre><h2>Systems</h2><table><tr><th>System</th><th>Case</th><th>Function</th><th>Representative</th><th>Observed control</th><th>Highest</th></tr>${systemRows}</table><h2>Worker Monitoring Constitution</h2><pre class="box">${esc(JSON.stringify(stress.domain_adapter,null,2))}</pre><h2>R1–R7 stress matrix</h2><table><tr><th>Level</th><th>APC requirement</th><th>Facebook control</th><th>Centralization/control surface</th><th>Domain result</th></tr>${levelRows}</table><h2>Architecture and governance fault lines</h2><table><tr><th>ID</th><th>Name</th><th>Observation</th><th>Risk</th><th>Required control</th></tr>${faultRows}</table><h2>Action-packet translation</h2><pre class="box">${esc(JSON.stringify(stress.action_packet_translation,null,2))}</pre><h2>Cross-system controls</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Limit</th></tr>${controlRows}</table><h2>Decisive acquisition</h2><pre class="box">${esc(JSON.stringify(stress.decisive_acquisition,null,2))}</pre><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(stress.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(stress.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-04.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-04: ${report.counts.systems} systems, ${report.counts.fault_lines} fault lines, ${report.counts.propositions} propositions`);
