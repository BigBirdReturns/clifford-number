#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const stress=read('data/project/m05-answerable-power-sprint-03-leg-06-value-recovery-transfer.json');
const sources=read('data/intake/m05-answerable-power-sprint-03-leg-06-value-recovery-sources.json');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify({stress,sources})).digest('hex');
const byDisposition=stress.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-06-report@1',
  program_id:stress.program_id,
  sprint_id:stress.sprint_id,
  leg_id:stress.leg_id,
  title:stress.title,
  status:stress.status,
  constitution_under_test:stress.constitution_under_test,
  domain_adapter_id:stress.domain_adapter_id,
  fingerprint,
  counts:{
    sources:sources.sources.length,
    systems:stress.systems.length,
    r_levels:stress.r_level_tests.length,
    value_dimensions:stress.value_recovery_dimensions.length,
    fault_lines:stress.fault_lines.length,
    cross_system_controls:stress.cross_system_controls.length,
    propositions:stress.propositions.length,
    by_disposition:byDisposition,
    nif_acquisitions:stress.decisive_acquisition.nif.length,
    nssif_acquisitions:stress.decisive_acquisition.nssif.length,
    chips_acquisitions:stress.decisive_acquisition.chips.length,
    nasa_acquisitions:stress.decisive_acquisition.nasa.length,
    nhs_data_acquisitions:stress.decisive_acquisition.nhs_data.length,
    comparator_classes:stress.decisive_acquisition.comparators.length
  },
  governing_question:stress.governing_question,
  transfer_rule:stress.transfer_rule,
  systems:stress.systems,
  domain_adapter:stress.domain_adapter,
  r_level_tests:stress.r_level_tests,
  value_recovery_dimensions:stress.value_recovery_dimensions,
  fault_lines:stress.fault_lines,
  cross_system_controls:stress.cross_system_controls,
  decisive_acquisition:stress.decisive_acquisition,
  propositions:stress.propositions,
  current_result:stress.current_result,
  source_registry:sources,
  boundaries:stress.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-06.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const systemRows=stress.systems.map((row)=>`<tr><td><code>${esc(row.system_id)}</code></td><td>${esc(row.case_name)}</td><td>${esc(row.sector)}</td><td>${esc(row.system_role)}</td><td>${esc(row.residual_right)}</td><td>${esc(row.realization)}</td><td><code>${esc(row.highest_observed_level)}</code></td></tr>`).join('');
const levelRows=stress.r_level_tests.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.required_by_apc)}</td><td><code>${esc(row.cross_sector_state)}</code></td><td>${esc(row.observation)}</td><td>${esc(row.domain_result)}</td></tr>`).join('');
const dimensionRows=stress.value_recovery_dimensions.map((row)=>`<tr><td><code>${esc(row.dimension_id)}</code></td><td>${esc(row.requirement)}</td><td>${esc(row.failure_state)}</td></tr>`).join('');
const faultRows=stress.fault_lines.map((row)=>`<tr><td><code>${esc(row.fault_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.observation)}</td><td>${esc(row.required_control)}</td></tr>`).join('');
const controlRows=stress.cross_system_controls.map((row)=>`<tr><td><code>${esc(row.control_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.limit)}</td></tr>`).join('');
const propositionRows=stress.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Public value-recovery transfer test</title><style>body{font:16px/1.55 system-ui;max-width:1650px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · S03-L6</b></p><h1>Public value recovery in AI, defense, data, and critical-infrastructure finance</h1><p class="state">R7 CONTROL OBSERVED · CROSS-SECTOR REALIZATION OPEN</p><div class="metrics"><div class="metric"><b>${report.counts.sources}</b>sources</div><div class="metric"><b>${report.counts.systems}</b>systems</div><div class="metric"><b>${report.counts.r_levels}</b>R-level tests</div><div class="metric"><b>${report.counts.value_dimensions}</b>value dimensions</div><div class="metric"><b>${report.counts.fault_lines}</b>fault lines</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div></div><h2>Governing question</h2><pre class="box">${esc(stress.governing_question)}</pre><h2>Transfer rule</h2><pre class="box">${esc(stress.transfer_rule)}</pre><h2>Systems</h2><table><tr><th>System</th><th>Case</th><th>Sector</th><th>Role</th><th>Residual right</th><th>Realization</th><th>Ceiling</th></tr>${systemRows}</table><h2>Public Contribution and Residual Rights Covenant</h2><pre class="box">${esc(JSON.stringify(stress.domain_adapter,null,2))}</pre><h2>R1–R7 stress matrix</h2><table><tr><th>Level</th><th>APC requirement</th><th>State</th><th>Observation</th><th>Domain result</th></tr>${levelRows}</table><h2>Value-recovery dimensions</h2><table><tr><th>ID</th><th>Requirement</th><th>Failure state</th></tr>${dimensionRows}</table><h2>Fault lines</h2><table><tr><th>ID</th><th>Name</th><th>Observation</th><th>Required control</th></tr>${faultRows}</table><h2>Cross-system controls</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Limit</th></tr>${controlRows}</table><h2>Decisive acquisition</h2><pre class="box">${esc(JSON.stringify(stress.decisive_acquisition,null,2))}</pre><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(stress.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(stress.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-06.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-06: ${report.counts.systems} systems, ${report.counts.fault_lines} fault lines, ${report.counts.propositions} propositions`);
