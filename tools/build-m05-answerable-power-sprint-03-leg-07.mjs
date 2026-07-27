#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverFrozenRoutes } from './lib/m04g-source-ecology-v2.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const plan=read('data/project/m05-answerable-power-sprint-03-leg-07-source-ecology-v2.json');
const policy=read('data/project/m04g-source-ecology-v2-policy.json');
const discovery=discoverFrozenRoutes(root,{expectedRoutes:policy.denominator.expected_routes,expectedBasins:policy.denominator.expected_basins,expectedPerBasin:policy.denominator.expected_routes_per_basin});
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const policyFingerprint=crypto.createHash('sha256').update(JSON.stringify(policy)).digest('hex');
const byClass=discovery.routes.reduce((acc,row)=>{const key=row.hydrology_class||'unclassified';acc[key]=(acc[key]||0)+1;return acc},{});
const gdeltRoutes=discovery.routes.filter((row)=>/gdelt/i.test(row.url)||/gdelt/i.test(row.route_id));
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-07-report@1',
  program_id:plan.program_id,
  hydrology_program_id:plan.hydrology_program_id,
  sprint_id:plan.sprint_id,
  leg_id:plan.leg_id,
  title:plan.title,
  status:plan.status,
  fingerprint,
  policy_fingerprint:policyFingerprint,
  counts:{
    routes:discovery.routes.length,
    basins:discovery.basins.length,
    routes_per_basin:[...new Set(discovery.basins.map((row)=>row.route_ids.length))],
    hydrology_classes:byClass,
    gdelt_routes:gdeltRoutes.length,
    host_policies:policy.host_policies.length,
    fallback_policies:policy.host_fallbacks.length,
    failure_classes:policy.failure_taxonomy.length,
    repair_legs:plan.repair_legs.length,
    regression_domains:plan.cross_domain_regression.length,
    acceptance_fields:Object.keys(plan.acceptance).length
  },
  registry:{file:discovery.registry_file,path:discovery.registry_path},
  route_ids:discovery.routes.map((row)=>row.route_id),
  basin_denominator:discovery.basins,
  route_class_denominator:byClass,
  policy,
  question:plan.question,
  baseline:plan.baseline,
  acceptance:plan.acceptance,
  repair_legs:plan.repair_legs,
  cross_domain_regression:plan.cross_domain_regression,
  regression_result_contract:plan.regression_result_contract,
  current_result:plan.current_result,
  boundaries:plan.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-07.json',JSON.stringify(report,null,2)+'\n');
write('build/m04g-source-ecology-v2/m04g-source-ecology-v2-discovery.json',JSON.stringify(discovery,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const repairRows=plan.repair_legs.map((row)=>`<tr><td><code>${esc(row.repair_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.problem)}</td><td>${esc(row.intervention)}</td><td>${esc(row.falsifier)}</td></tr>`).join('');
const basinRows=discovery.basins.map((row)=>`<tr><td><code>${esc(row.basin_id)}</code></td><td>${row.route_ids.length}</td><td><code>${esc(row.route_ids.join(', '))}</code></td></tr>`).join('');
const domainRows=plan.cross_domain_regression.map((row)=>`<tr><td><code>${esc(row.domain_id)}</code></td><td>${esc(row.domain)}</td><td>${esc(row.observed_strength)}</td><td>${esc(row.open_failure)}</td><td>${esc(row.required_regression.join(' · '))}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Source ecology v2</title><style>body{font:16px/1.55 system-ui;max-width:1600px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-04G / M-05 · S03-L7</b></p><h1>Source ecology v2 and cross-domain regression</h1><p class="state">REPAIR IMPLEMENTED · LIVE V2 ORBIT NOT YET ADJUDICATED</p><div class="metrics"><div class="metric"><b>${report.counts.routes}</b>frozen routes</div><div class="metric"><b>${report.counts.basins}</b>basins</div><div class="metric"><b>${report.counts.gdelt_routes}</b>GDELT routes</div><div class="metric"><b>${report.counts.fallback_policies}</b>fallback policies</div><div class="metric"><b>${report.counts.failure_classes}</b>failure classes</div><div class="metric"><b>${report.counts.regression_domains}</b>regression domains</div></div><h2>Question</h2><pre class="box">${esc(plan.question)}</pre><h2>Baseline</h2><pre class="box">${esc(JSON.stringify(plan.baseline,null,2))}</pre><h2>Acceptance</h2><pre class="box">${esc(JSON.stringify(plan.acceptance,null,2))}</pre><h2>Frozen denominator</h2><p><code>${esc(discovery.registry_file)}:${esc(discovery.registry_path)}</code></p><table><tr><th>Basin</th><th>Routes</th><th>Route IDs</th></tr>${basinRows}</table><h2>Repair legs</h2><table><tr><th>ID</th><th>Name</th><th>Problem</th><th>Intervention</th><th>Falsifier</th></tr>${repairRows}</table><h2>Cross-domain regression</h2><table><tr><th>Adapter</th><th>Domain</th><th>Observed strength</th><th>Open failure</th><th>Required regression</th></tr>${domainRows}</table><h2>Policy</h2><pre class="box">${esc(JSON.stringify(policy,null,2))}</pre><h2>Current result</h2><pre class="box">${esc(JSON.stringify(plan.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(plan.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-07.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-07: ${report.counts.routes} routes, ${report.counts.basins} basins, ${report.counts.regression_domains} domains`);
