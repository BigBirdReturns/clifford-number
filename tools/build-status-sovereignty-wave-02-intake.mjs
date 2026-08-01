#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bytes=(p)=>fs.readFileSync(path.join(root,p));
const stable=(v)=>`${JSON.stringify(v,null,2)}\n`;
const sha=(v)=>crypto.createHash('sha256').update(v).digest('hex');
const write=(p,v)=>{const q=path.join(root,p);fs.mkdirSync(path.dirname(q),{recursive:true});fs.writeFileSync(q,v)};
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export const releaseScope=[
 '.github/workflows/status-sovereignty-wave-02-intake.yml',
 'data/intake/status-sovereignty-wave-02-structural-synthesis.md',
 'data/intake/status-sovereignty-wave-02-source-denominator.json',
 'data/intake/status-sovereignty-wave-02-candidate-observations.json',
 'schemas/status-sovereignty-wave-02-intake.schema.json',
 'docs/milestones/m05-status-sovereignty-wave-02-intake.md',
 'tools/build-status-sovereignty-wave-02-intake.mjs',
 'tools/validate-status-sovereignty-wave-02-intake.mjs',
 'test/status-sovereignty-wave-02-intake.test.js'
];
export function computeWave02IntakeManifest(){
 const entries=releaseScope.map(p=>{const b=bytes(p);return{path:p,sha256:sha(b),bytes:b.length}});
 return{schema_version:'status-sovereignty-wave-02-intake-release-manifest@1',hypothesis_id:'SSC-H01',wave_id:'SSC-W02',intake_id:'SSC-W02-I01',as_of:'2026-07-31',hash_mode:'sha256_exact_bytes',scope_ordered:true,self_included:false,entries,combined_sha256:sha(entries.map(r=>`${r.path}\0${r.sha256}\0${r.bytes}\n`).join('')),boundaries:{exact_bytes_prove_source_truth:false,manifest_promotes_intake_to_field_wave:false,manifest_proves_review:false,manifest_changes_wave_01:false,manifest_closes_acquisition_obligation:false,manifest_authorizes_sg09:false,manifest_proves_complete_compact:false,manifest_proves_racial_order:false,manifest_proves_prevalence:false,manifest_proves_coordination:false,manifest_authorizes_graph_edge:false,manifest_authorizes_publication:false,graph_effect:'none'}};
}
export function buildWave02Intake(){
 const reviewPath=path.join(root,'data/research/status-sovereignty-wave-02-maintainer-review.json');
 if(fs.existsSync(reviewPath)){
  console.log('build-status-sovereignty-wave-02-intake: historical intake preserved after maintainer review; no write');
  return{historical:true};
 }
 const intake=read('data/intake/status-sovereignty-wave-02-candidate-observations.json');
 const sources=read('data/intake/status-sovereignty-wave-02-source-denominator.json');
 const fanout=read('data/project/status-sovereignty-fanout.json');
 const wave01=read('data/research/status-sovereignty-wave-01.json');
 const acquisition=read('data/research/status-sovereignty-wave-01-targeted-acquisition.json');
 const manifest=computeWave02IntakeManifest();
 write('data/project/status-sovereignty-wave-02-intake-release-manifest.json',stable(manifest));
 const sourceById=new Map(sources.records.map(r=>[r.source_id,r]));
 const report={schema_version:'status-sovereignty-wave-02-intake-report@1',hypothesis_id:intake.hypothesis_id,wave_id:intake.wave_id,intake_id:intake.intake_id,as_of:intake.as_of,title:intake.title,status:intake.status,publication_status:intake.current_result.publication_status,selection_contract:intake.selection_contract,counts:intake.counts,lane_counts:intake.lane_counts,disposition_counts:intake.disposition_counts,candidate_lane_ids:intake.candidate_lane_ids,candidate_observations:intake.observations.map(o=>({...o,sources:o.source_ids.map(id=>{const s=sourceById.get(id);return s?{source_id:s.source_id,title:s.title,publisher:s.publisher,url:s.url,authority:s.authority,retrieval_status:s.retrieval.status,limitations:s.limitations}:{source_id:id,missing:true}})})),source_denominator:{path:intake.source_denominator_path,selection_window:sources.selection_window,source_plane:sources.source_plane,counts:sources.counts,records:sources.records,boundaries:sources.boundaries},structural_synthesis:{path:intake.structural_synthesis_path,authority:'source_provided_hypothesis_only',original_bytes_preserved:false},frozen_parent_state:{wave_01:{status:wave01.status,executed_lanes:wave01.counts.executed_lanes,observations:wave01.counts.observations,maintainer_reviewed:wave01.counts.maintainer_reviewed,complete_compact_findings:wave01.counts.supported_bounded_compact},targeted_acquisition:{status:acquisition.status,obligations:acquisition.counts.obligations,partially_repaired_open:acquisition.counts.partially_repaired_open,closed:acquisition.counts.closed},previously_zero_lanes:intake.candidate_lane_ids.map(id=>{const l=fanout.lanes.find(x=>x.lane_id===id);return{lane_id:id,title:l?.title??null,parent_started:l?.execution?.started??null,parent_records_retained:l?.execution?.records_retained??null}})},current_result:intake.current_result,boundaries:intake.boundaries,release_manifest:{path:'data/project/status-sovereignty-wave-02-intake-release-manifest.json',combined_sha256:manifest.combined_sha256}};
 write('build/core-thesis/status-sovereignty/wave-02-intake/manifest.json',stable(manifest));
 write('build/core-thesis/status-sovereignty/wave-02-intake/data.json',stable(report));
 write('reports/core-thesis/status-sovereignty/wave-02-intake/data.json',stable(report));
 const dispositions=Object.entries(intake.disposition_counts).map(([k,v])=>`<tr><td><code>${esc(k)}</code></td><td>${v}</td></tr>`).join('');
 const rows=report.candidate_observations.map(o=>`<tr><td><code>${esc(o.observation_id)}</code><br><code>${esc(o.lane_id)}</code></td><td><code>${esc(o.disposition)}</code><br>${esc(o.review_state)}</td><td>${esc(o.observed_facts.join(' '))}</td><td>${esc(o.working_interpretation)}</td></tr>`).join('');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SSC-H01 Wave 02 intake</title><style>:root{background:#eeeae0;color:#181714;font-family:system-ui,sans-serif}body{max-width:1500px;margin:auto;padding:40px 24px 72px;line-height:1.5}h1{font-size:clamp(2rem,5vw,4.5rem);line-height:1}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:10px}.card{padding:15px}.card b{display:block;font-size:2rem}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd5c7;text-align:left;vertical-align:top}code,pre{overflow-wrap:anywhere}.state{font-weight:800;color:#8c300d}</style></head><body><p><b>CLIFFORD NUMBER · SSC-H01 · WAVE 02 INTAKE</b></p><h1>Eight candidate lanes frozen before review</h1><p class="state">INTAKE ONLY · UNREVIEWED 8/8 · FIELD WAVE NOT EXECUTED · COMPLETE-COMPACT FINDINGS 0 · GRAPH EFFECT NONE · PUBLICATION BLOCKED</p><div class="grid"><div class="card"><b>14</b>source records</div><div class="card"><b>8</b>candidate packets</div><div class="card"><b>8</b>previously zero lanes</div><div class="card"><b>0</b>reviewed</div><div class="card"><b>0</b>complete compact</div></div><h2>Disposition denominator</h2><table><tbody>${dispositions}</tbody></table><h2>Candidate packets</h2><table><thead><tr><th>Packet</th><th>Intake state</th><th>Facts</th><th>Ceiling</th></tr></thead><tbody>${rows}</tbody></table><h2>Boundary</h2><pre>${esc(JSON.stringify(intake.boundaries,null,2))}</pre><p><code>${manifest.combined_sha256}</code></p></body></html>\n`;
 write('reports/core-thesis/status-sovereignty/wave-02-intake/index.html',html);
 console.log(`build-status-sovereignty-wave-02-intake: ${sources.records.length} sources, ${intake.observations.length} candidates, 0 reviewed`);
 return{intake,sources,fanout,wave01,acquisition,manifest,report};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(invoked)buildWave02Intake();
