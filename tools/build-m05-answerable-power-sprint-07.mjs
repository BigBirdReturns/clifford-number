#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const readBytes=(rel)=>fs.readFileSync(path.join(root,rel));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
export const releaseScope=[
  '.github/ISSUE_TEMPLATE/apc-a1-adjudicator-nomination.yml',
  '.github/workflows/m05-answerable-power-sprint-07.yml',
  'data/project/m05-answerable-power-sprint-07-plan.json',
  'data/project/m05-answerable-power-sprint-07-adjudicator-constitution.json',
  'data/project/m05-answerable-power-sprint-07-adjudication-schema.json',
  'data/project/m05-answerable-power-sprint-07-scenarios.json',
  'data/project/m05-answerable-power-sprint-07-docket.json',
  'docs/methods/answerable-power-a1-adjudication.md',
  'docs/milestones/m05-answerable-power-sprint-07.md',
  'tools/m05-a1-adjudication.mjs',
  'tools/build-m05-answerable-power-sprint-07.mjs',
  'tools/validate-m05-answerable-power-sprint-07.mjs',
  'test/m05-a1-adjudication.test.js',
  'test/m05-answerable-power-sprint-07.test.js'
];
export function computeReleaseManifest(){
  const entries=releaseScope.map((rel)=>{const bytes=readBytes(rel);return{path:rel,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}});
  const combined_sha256=crypto.createHash('sha256').update(entries.map((row)=>`${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')).digest('hex');
  return{schema_version:'m05-answerable-power-sprint-07-release-manifest@1',program_id:'M-05',sprint_id:'M05-SPRINT-07',as_of:'2026-07-27',hash_mode:'sha256_exact_utf8_bytes',scope_ordered:true,self_included:false,entries,combined_sha256,boundaries:{exact_bytes_prove_external_adjudication:false,release_manifest_proves_reviewer_independence:false,combined_hash_proves_a1:false}};
}
const plan=read('data/project/m05-answerable-power-sprint-07-plan.json');
const constitution=read('data/project/m05-answerable-power-sprint-07-adjudicator-constitution.json');
const schema=read('data/project/m05-answerable-power-sprint-07-adjudication-schema.json');
const scenarios=read('data/project/m05-answerable-power-sprint-07-scenarios.json');
const docket=read('data/project/m05-answerable-power-sprint-07-docket.json');
const manifest=computeReleaseManifest();
write('data/project/m05-answerable-power-sprint-07-release-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const report={schema_version:'m05-answerable-power-sprint-07-report@1',program_id:'M-05',sprint_id:'M05-SPRINT-07',title:plan.title,status:plan.status,as_of:plan.as_of,basis:plan.basis,counts:{legs:plan.leg_registry.length,roles:constitution.roles.length,automatic_disqualifiers:constitution.automatic_disqualifiers.length,human_review_flags:constitution.human_review_flags.length,separation_rules:constitution.separation_rules.length,scenarios:scenarios.scenarios.length,scenario_denominator:scenarios.denominator,eligible_adjudicators:docket.counts.eligible_adjudicators,independence_decisions:docket.counts.independence_decisions,evidence_decisions:docket.counts.evidence_decisions,eligible_registry_transactions:docket.counts.eligible_registry_transactions,approved_for_a1:docket.counts.approved_for_a1},adjudication_roles:constitution.roles,automatic_disqualifiers:constitution.automatic_disqualifiers,human_review_flags:constitution.human_review_flags,separation_rules:constitution.separation_rules,challenge_law:constitution.challenge_law,registry_law:constitution.registry_law,transaction_schema_id:schema.$id,scenarios:scenarios.scenarios,docket,current_result:plan.current_result,release_manifest:{path:'data/project/m05-answerable-power-sprint-07-release-manifest.json',combined_sha256:manifest.combined_sha256},boundaries:plan.boundaries};
write('reports/core-thesis/answerable-power/sprint-07.json',JSON.stringify(report,null,2)+'\n');
const esc=(v)=>String(v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const roleRows=constitution.roles.map((r)=>`<tr><td><code>${esc(r.role_id)}</code></td><td>${esc(r.name)}</td><td>${esc(r.function)}</td></tr>`).join('');
const dqRows=constitution.automatic_disqualifiers.map((r)=>`<tr><td><code>${esc(r.rule_id)}</code></td><td>${esc(r.name)}</td></tr>`).join('');
const scenarioRows=scenarios.scenarios.map((r)=>`<tr><td><code>${esc(r.scenario_id)}</code></td><td>${esc(r.name)}</td><td><code>${esc(r.expected_outcome)}</code></td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 07 · External adjudication</title><style>body{font:16px/1.55 system-ui;max-width:1450px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · SPRINT 07</b></p><h1>${esc(plan.title)}</h1><p class="state">VERIFIED CEILING: A0 · NO EXTERNAL ADJUDICATION OBSERVED</p><div class="metrics"><div class="metric"><b>${report.counts.roles}</b>adjudication roles</div><div class="metric"><b>${report.counts.automatic_disqualifiers}</b>automatic disqualifiers</div><div class="metric"><b>${report.counts.human_review_flags}</b>human-review flags</div><div class="metric"><b>${report.counts.scenarios}</b>adversarial scenarios</div><div class="metric"><b>${report.counts.eligible_adjudicators}</b>eligible adjudicators</div><div class="metric"><b>${report.counts.approved_for_a1}</b>A1 approvals</div></div><h2>Roles</h2><table><tr><th>ID</th><th>Role</th><th>Function</th></tr>${roleRows}</table><h2>Automatic disqualifiers</h2><table><tr><th>ID</th><th>Disqualifier</th></tr>${dqRows}</table><h2>Challenge law</h2><pre class="box">${esc(JSON.stringify(constitution.challenge_law,null,2))}</pre><h2>Registry law</h2><pre class="box">${esc(JSON.stringify(constitution.registry_law,null,2))}</pre><h2>Adversarial denominator</h2><table><tr><th>ID</th><th>Scenario</th><th>Expected</th></tr>${scenarioRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(plan.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(plan.boundaries,null,2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/sprint-07.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-07: ${report.counts.roles} roles, ${report.counts.automatic_disqualifiers} disqualifiers, ${report.counts.scenarios} scenarios, ceiling ${plan.current_result.maximum_verified_adoption_level}`);
