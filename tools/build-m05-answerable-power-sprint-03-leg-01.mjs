#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const constitution=read('data/project/m05-answerable-power-sprint-03-leg-01-constitution.json');
const fingerprint=crypto.createHash('sha256').update(JSON.stringify(constitution)).digest('hex');
const byDisposition=constitution.propositions.reduce((acc,row)=>{acc[row.disposition]=(acc[row.disposition]||0)+1;return acc},{});
const report={
  schema_version:'m05-answerable-power-sprint-03-leg-01-report@1',
  program_id:constitution.program_id,
  sprint_id:constitution.sprint_id,
  leg_id:constitution.leg_id,
  constitution_id:constitution.constitution_id,
  title:constitution.title,
  status:constitution.status,
  fingerprint,
  counts:{
    roles:constitution.constitutional_roles.length,
    action_packet_fields:constitution.action_packet.fields.length,
    rights_levels:constitution.rights_sequence.length,
    emergency_requirements:constitution.emergency_constitution.requirements.length,
    anti_bypass_rules:constitution.anti_bypass_rules.length,
    invariants:constitution.constitutional_invariants.length,
    domains:constitution.domain_mapping.length,
    propositions:constitution.propositions.length,
    by_disposition:byDisposition
  },
  governing_problem:constitution.governing_problem,
  governing_purpose:constitution.governing_purpose,
  constitutional_roles:constitution.constitutional_roles,
  action_packet:constitution.action_packet,
  rights_sequence:constitution.rights_sequence,
  emergency_constitution:constitution.emergency_constitution,
  anti_bypass_rules:constitution.anti_bypass_rules,
  constitutional_invariants:constitution.constitutional_invariants,
  works_standard:constitution.works_standard,
  domain_mapping:constitution.domain_mapping,
  propositions:constitution.propositions,
  current_result:constitution.current_result,
  boundaries:constitution.boundaries
};
write('reports/core-thesis/answerable-power/sprint-03-leg-01.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const roleRows=constitution.constitutional_roles.map((row)=>`<tr><td><code>${esc(row.role_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.function)}</td><td>${esc((row.minimum_rights||row.minimum_powers||row.minimum_duties||[]).join(' · '))}</td></tr>`).join('');
const rightsRows=constitution.rights_sequence.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.name)}</td><td>${esc(row.trigger)}</td><td>${esc(row.compulsory_mechanism)}</td><td>${esc(row.failure_test)}</td></tr>`).join('');
const bypassRows=constitution.anti_bypass_rules.map((row)=>`<tr><td><code>${esc(row.rule_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.rule)}</td></tr>`).join('');
const domainRows=constitution.domain_mapping.map((row)=>`<tr><td><code>${esc(row.domain)}</code></td><td>#${row.issue}</td><td>${esc(row.initial_controls.join(' · '))}</td><td>${esc(row.missing_for_composed_answer.join(' · '))}</td></tr>`).join('');
const propositionRows=constitution.propositions.map((row)=>`<tr><td><code>${esc(row.proposition_id)}</code></td><td>${esc(row.claim)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Answerable Power Constitution</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · ${esc(constitution.constitution_id)}</b></p><h1>Answerable Power Constitution</h1><p class="state">CANDIDATE DESIGN FROZEN · DOMAIN TESTING REQUIRED</p><div class="metrics"><div class="metric"><b>${report.counts.roles}</b>constitutional roles</div><div class="metric"><b>${report.counts.action_packet_fields}</b>action-packet fields</div><div class="metric"><b>${report.counts.rights_levels}</b>rights levels</div><div class="metric"><b>${report.counts.anti_bypass_rules}</b>anti-bypass rules</div><div class="metric"><b>${report.counts.domains}</b>domain routes</div><div class="metric"><b>${report.counts.propositions}</b>propositions</div></div><h2>Problem and purpose</h2><pre class="box">${esc(constitution.governing_problem)}\n\n${esc(constitution.governing_purpose)}</pre><h2>Constitutional roles</h2><table><tr><th>ID</th><th>Role</th><th>Function</th><th>Minimum rights, powers, or duties</th></tr>${roleRows}</table><h2>Action packet</h2><pre class="box">${esc(JSON.stringify(constitution.action_packet,null,2))}</pre><h2>R1–R7 sequence</h2><table><tr><th>Level</th><th>Name</th><th>Trigger</th><th>Compulsory mechanism</th><th>Failure test</th></tr>${rightsRows}</table><h2>Emergency constitution</h2><pre class="box">${esc(JSON.stringify(constitution.emergency_constitution,null,2))}</pre><h2>Anti-bypass rules</h2><table><tr><th>ID</th><th>Name</th><th>Rule</th></tr>${bypassRows}</table><h2>Domain map</h2><table><tr><th>Domain</th><th>Issue</th><th>Initial controls</th><th>Missing for composed answer</th></tr>${domainRows}</table><h2>Works standard</h2><pre class="box">${esc(JSON.stringify(constitution.works_standard,null,2))}</pre><h2>Proposition ledger</h2><table><tr><th>ID</th><th>Claim</th><th>Disposition</th><th>Ceiling</th></tr>${propositionRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(constitution.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(constitution.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-03-leg-01.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-03-leg-01: ${report.counts.roles} roles, ${report.counts.rights_levels} rights levels, ${report.counts.anti_bypass_rules} bypass rules`);
