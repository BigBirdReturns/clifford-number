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
  '.github/ISSUE_TEMPLATE/apc-a1-support-challenge.yml',
  '.github/ISSUE_TEMPLATE/apc-a1-support-incident.yml',
  '.github/workflows/m05-answerable-power-sprint-08.yml',
  'data/project/m05-answerable-power-sprint-08-plan.json',
  'data/project/m05-answerable-power-sprint-08-lifecycle-constitution.json',
  'data/project/m05-answerable-power-sprint-08-challenge-schema.json',
  'data/project/m05-answerable-power-sprint-08-support-incident-schema.json',
  'data/project/m05-answerable-power-sprint-08-lifecycle-transaction-schema.json',
  'data/project/m05-answerable-power-sprint-08-support-ledger.json',
  'data/project/m05-answerable-power-sprint-08-scenarios.json',
  'docs/methods/answerable-power-a1-support-lifecycle.md',
  'docs/milestones/m05-answerable-power-sprint-08.md',
  'tools/m05-a1-support-lifecycle.mjs',
  'tools/build-m05-answerable-power-sprint-08.mjs',
  'tools/validate-m05-answerable-power-sprint-08.mjs',
  'test/m05-a1-support-lifecycle.test.js',
  'test/m05-answerable-power-sprint-08.test.js'
];
export function computeReleaseManifest(){
  const entries=releaseScope.map((rel)=>{const bytes=readBytes(rel);return{path:rel,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}});
  const combined_sha256=crypto.createHash('sha256').update(entries.map((row)=>`${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')).digest('hex');
  return{schema_version:'m05-answerable-power-sprint-08-release-manifest@1',program_id:'M-05',sprint_id:'M05-SPRINT-08',as_of:'2026-07-29',hash_mode:'sha256_exact_utf8_bytes',scope_ordered:true,self_included:false,entries,combined_sha256,boundaries:{exact_bytes_prove_external_lifecycle_event:false,release_manifest_proves_challenge_truth:false,combined_hash_proves_a1:false,manifest_authorizes_real_person_pilot:false}};
}
const plan=read('data/project/m05-answerable-power-sprint-08-plan.json');
const constitution=read('data/project/m05-answerable-power-sprint-08-lifecycle-constitution.json');
const challengeSchema=read('data/project/m05-answerable-power-sprint-08-challenge-schema.json');
const incidentSchema=read('data/project/m05-answerable-power-sprint-08-support-incident-schema.json');
const transactionSchema=read('data/project/m05-answerable-power-sprint-08-lifecycle-transaction-schema.json');
const ledger=read('data/project/m05-answerable-power-sprint-08-support-ledger.json');
const scenarios=read('data/project/m05-answerable-power-sprint-08-scenarios.json');
const manifest=computeReleaseManifest();
write('data/project/m05-answerable-power-sprint-08-release-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const report={schema_version:'m05-answerable-power-sprint-08-report@1',program_id:'M-05',sprint_id:'M05-SPRINT-08',title:plan.title,status:plan.status,as_of:plan.as_of,basis:plan.basis,counts:{legs:plan.leg_registry.length,roles:constitution.roles.length,lifecycle_states:constitution.lifecycle_states.length,allowed_transitions:constitution.allowed_transitions.length,challenge_categories:constitution.challenge_categories.length,automatic_support_loss_triggers:constitution.automatic_support_loss_triggers.length,scenarios:scenarios.scenarios.length,scenario_denominator:scenarios.denominator,...ledger.counts},roles:constitution.roles,lifecycle_states:constitution.lifecycle_states,allowed_transitions:constitution.allowed_transitions,challenge_categories:constitution.challenge_categories,automatic_support_loss_triggers:constitution.automatic_support_loss_triggers,challenge_routes:constitution.challenge_routes,interim_action_law:constitution.interim_action_law,restoration_law:constitution.restoration_law,registry_law:constitution.registry_law,expiry_law:constitution.expiry_law,schemas:{challenge:challengeSchema.$id,incident:incidentSchema.$id,transaction:transactionSchema.$id},scenarios:scenarios.scenarios,ledger,current_result:plan.current_result,release_manifest:{path:'data/project/m05-answerable-power-sprint-08-release-manifest.json',combined_sha256:manifest.combined_sha256},boundaries:plan.boundaries};
write('reports/core-thesis/answerable-power/sprint-08.json',JSON.stringify(report,null,2)+'\n');
const esc=(v)=>String(v).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const stateRows=constitution.lifecycle_states.map((r)=>`<tr><td><code>${esc(r.state_id)}</code></td><td>${esc(r.meaning)}</td></tr>`).join('');
const triggerRows=constitution.automatic_support_loss_triggers.map((v,i)=>`<tr><td>${i+1}</td><td><code>${esc(v)}</code></td></tr>`).join('');
const scenarioRows=scenarios.scenarios.map((r)=>`<tr><td><code>${esc(r.scenario_id)}</code></td><td>${esc(r.name)}</td><td><code>${esc(r.expected_outcome)}</code></td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 08 · A1 support lifecycle</title><style>body{font:16px/1.55 system-ui;max-width:1450px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · SPRINT 08</b></p><h1>${esc(plan.title)}</h1><p class="state">VERIFIED CEILING: A0 · NO A1 ENTRY OR LIFECYCLE EVENT OBSERVED</p><div class="metrics"><div class="metric"><b>${report.counts.roles}</b>lifecycle roles</div><div class="metric"><b>${report.counts.lifecycle_states}</b>states</div><div class="metric"><b>${report.counts.challenge_categories}</b>challenge categories</div><div class="metric"><b>${report.counts.automatic_support_loss_triggers}</b>support-loss triggers</div><div class="metric"><b>${report.counts.scenarios}</b>adversarial scenarios</div><div class="metric"><b>${report.counts.a1_entries}</b>A1 entries</div></div><h2>Lifecycle states</h2><table><tr><th>State</th><th>Meaning</th></tr>${stateRows}</table><h2>Automatic support-loss triggers</h2><table><tr><th>#</th><th>Trigger</th></tr>${triggerRows}</table><h2>Restoration law</h2><pre class="box">${esc(JSON.stringify(constitution.restoration_law,null,2))}</pre><h2>Adversarial denominator</h2><table><tr><th>ID</th><th>Scenario</th><th>Expected</th></tr>${scenarioRows}</table><h2>Current result</h2><pre class="box">${esc(JSON.stringify(plan.current_result,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(plan.boundaries,null,2))}</pre><p><code>release SHA-256: ${manifest.combined_sha256}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/sprint-08.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-08: ${report.counts.roles} roles, ${report.counts.lifecycle_states} states, ${report.counts.automatic_support_loss_triggers} triggers, ceiling ${plan.current_result.maximum_verified_adoption_level}`);
