#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};
const sha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
const plan=readJson('data/project/m05-answerable-power-sprint-06-plan.json');
const protocol=readJson('data/project/m05-answerable-power-sprint-06-protocol.json');
const schema=readJson('data/project/m05-answerable-power-sprint-06-receipt-schema.json');
const registry=readJson('data/project/m05-answerable-power-sprint-06-registry.json');
const scope=[
  '.github/ISSUE_TEMPLATE/apc-independent-reproduction.yml',
  '.github/workflows/m05-answerable-power-sprint-06.yml',
  'data/project/m05-answerable-power-sprint-06-plan.json',
  'data/project/m05-answerable-power-sprint-06-protocol.json',
  'data/project/m05-answerable-power-sprint-06-receipt-schema.json',
  'data/project/m05-answerable-power-sprint-06-registry.json',
  'docs/methods/answerable-power-independent-reproduction.md',
  'docs/milestones/m05-answerable-power-sprint-06.md',
  'tools/m05-independent-reproduction.mjs',
  'tools/build-m05-answerable-power-sprint-06.mjs',
  'tools/validate-m05-answerable-power-sprint-06.mjs',
  'test/m05-independent-reproduction.test.js',
  'test/m05-answerable-power-sprint-06.test.js'
];
const entries=scope.map((rel)=>{const bytes=fs.readFileSync(path.join(root,rel));return {path:rel,sha256:sha(bytes),bytes:bytes.length}});
const combined=sha(Buffer.from(entries.map((row)=>`${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''),'utf8'));
const release={schema_version:'m05-answerable-power-sprint-06-release-manifest@1',program_id:'M-05',sprint_id:'M05-SPRINT-06',as_of:plan.as_of,hash_mode:'sha256_exact_utf8_bytes',scope_ordered:true,self_included:false,entries,combined_sha256:combined,boundaries:{exact_bytes_prove_external_reproduction:false,release_manifest_proves_independence:false}};
write('data/project/m05-answerable-power-sprint-06-release-manifest.json',JSON.stringify(release,null,2)+'\n');
const report={
  schema_version:'m05-answerable-power-sprint-06-report@1',program_id:'M-05',sprint_id:'M05-SPRINT-06',title:plan.title,status:plan.status,as_of:plan.as_of,
  reference_capsule:protocol.reference_capsule,
  counts:{intake_stages:plan.intake_stages.length,legs:plan.leg_registry.length,required_commands:protocol.required_command_sequence.length,automatic_disqualifiers:protocol.automatic_disqualifiers.length,human_review_flags:protocol.human_review_flags.length,registry_entries:registry.entries.length,approved_for_a1:registry.counts.approved_for_a1},
  intake_stages:plan.intake_stages,clean_room_requirements:protocol.clean_room_requirements,required_command_sequence:protocol.required_command_sequence,
  automatic_disqualifiers:protocol.automatic_disqualifiers,human_review_flags:protocol.human_review_flags,custody_and_revocation:protocol.custody_and_revocation,
  schema_id:schema.$id,registry,current_result:plan.current_result,release_manifest:{path:'data/project/m05-answerable-power-sprint-06-release-manifest.json',combined_sha256:combined},boundaries:plan.boundaries
};
write('reports/core-thesis/answerable-power/sprint-06.json',JSON.stringify(report,null,2)+'\n');
const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const stages=plan.intake_stages.map((row)=>`<tr><td><code>${esc(row.stage)}</code></td><td>${esc(row.name)}</td><td>${esc(row.test)}</td><td>${row.may_promote_a1?'yes':'no'}</td></tr>`).join('');
const commands=protocol.required_command_sequence.map((row)=>`<tr><td>${row.order}</td><td><code>${esc(row.command)}</code></td><td>${esc(row.expected)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 06</title><style>body{font:16px/1.55 system-ui;max-width:1400px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · SPRINT 06</b></p><h1>${esc(plan.title)}</h1><p class="state">VERIFIED CEILING: A0 · EXTERNAL RECEIPTS: 0</p><div class="metrics"><div class="metric"><b>${report.counts.intake_stages}</b>intake stages</div><div class="metric"><b>${report.counts.legs}</b>sprint legs</div><div class="metric"><b>${report.counts.required_commands}</b>required commands</div><div class="metric"><b>${report.counts.automatic_disqualifiers}</b>automatic disqualifiers</div><div class="metric"><b>${report.counts.registry_entries}</b>registry entries</div></div><h2>Frozen reference</h2><pre class="box">${esc(JSON.stringify(protocol.reference_capsule,null,2))}</pre><h2>Intake stages</h2><table><tr><th>Stage</th><th>Name</th><th>Test</th><th>May promote A1</th></tr>${stages}</table><h2>Required command sequence</h2><table><tr><th>#</th><th>Command</th><th>Expected</th></tr>${commands}</table><h2>Automatic disqualifiers</h2><pre class="box">${esc(protocol.automatic_disqualifiers.join('\n'))}</pre><h2>Registry state</h2><pre class="box">${esc(JSON.stringify(registry.reconciliation,null,2))}</pre><h2>Release manifest</h2><pre class="box">${esc(JSON.stringify(report.release_manifest,null,2))}</pre><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(plan.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-06.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-06: ${report.counts.legs} legs, ${report.counts.required_commands} commands, ${report.counts.registry_entries} receipts`);
