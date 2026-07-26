#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const plan=read('data/project/m05-answerable-power-sprint-03-plan.json');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const report={
  schema_version:'m05-answerable-power-sprint-03-report@1',
  program_id:plan.program_id,
  sprint_id:plan.sprint_id,
  title:plan.title,
  fingerprint,
  counts:{
    answer_levels:plan.answer_constitution.length,
    composition_requirements:plan.composition_requirements.length,
    domain_tests:plan.domain_tests.length,
    lanes:plan.lanes.length,
    live_issues:1+plan.lanes.length,
    minimum_domains:plan.sprint_exit_contract.minimum_domains_tested,
    minimum_jurisdictions:plan.sprint_exit_contract.minimum_jurisdictions_tested
  },
  sprint_02_reconciliation:plan.sprint_02_reconciliation,
  answer_constitution:plan.answer_constitution,
  composition_requirements:plan.composition_requirements,
  domain_tests:plan.domain_tests,
  lanes:plan.lanes,
  sprint_exit_contract:plan.sprint_exit_contract,
  boundaries:plan.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-plan.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const answerRows=plan.answer_constitution.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.name)}</td><td>${esc(row.minimum_mechanism)}</td><td>${esc(row.failure_mode)}</td></tr>`).join('');
const domainRows=plan.domain_tests.map((row)=>`<tr><td><code>${esc(row.domain_id)}</code></td><td>${esc(row.systems.join(' · '))}</td><td>${esc(row.minimum_tests.join(' · '))}</td></tr>`).join('');
const laneRows=plan.lanes.map((row)=>`<tr><td><code>${esc(row.lane_id)}</code></td><td><a href="https://github.com/BigBirdReturns/clifford-number/issues/${row.issue}">#${row.issue}</a></td><td>${esc(row.title)}</td><td>${esc(row.terminal_contract)}</td></tr>`).join('');
const requirements=plan.composition_requirements.map((row)=>`<li>${esc(row)}</li>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 03</title><style>body{font:16px/1.55 system-ui;max-width:1450px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 03: compose and stress-test the answer to asymmetry</h1><p class="state">LAUNCHED · 7/7 LANES LIVE</p><div class="metrics"><div class="metric"><b>${report.counts.answer_levels}</b>answer levels</div><div class="metric"><b>${report.counts.domain_tests}</b>domain test surfaces</div><div class="metric"><b>${report.counts.lanes}</b>sprint lanes</div><div class="metric"><b>${report.counts.live_issues}</b>live issue records</div><div class="metric"><b>${report.counts.minimum_domains}</b>minimum domains</div><div class="metric"><b>${report.counts.minimum_jurisdictions}</b>minimum jurisdictions</div></div><h2>R1–R7 answer constitution</h2><table><tr><th>Level</th><th>Name</th><th>Minimum mechanism</th><th>Failure mode</th></tr>${answerRows}</table><h2>Composition requirements</h2><ol class="box">${requirements}</ol><h2>Domain stress tests</h2><table><tr><th>Domain</th><th>Systems</th><th>Minimum tests</th></tr>${domainRows}</table><h2>Live sprint topology</h2><table><tr><th>Lane</th><th>Issue</th><th>Title</th><th>Terminal contract</th></tr>${laneRows}</table><h2>Sprint exit contract</h2><pre class="box">${esc(JSON.stringify(plan.sprint_exit_contract,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(plan.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-plan.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03: ${report.counts.answer_levels} answer levels, ${report.counts.domain_tests} domains, ${report.counts.lanes} lanes`);
