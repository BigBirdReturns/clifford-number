#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const bytes=(rel)=>fs.readFileSync(path.join(root,rel));
const writeJson=(rel,v)=>{const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,`${JSON.stringify(v,null,2)}\n`)};
const writeText=(rel,v)=>{const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v)};
const sha256=(v)=>crypto.createHash('sha256').update(v).digest('hex');

export const releaseScope=[
  '.github/workflows/counter-selector-wave-12.yml',
  'data/project/counter-selector-wave-12-batch-05.json',
  'data/project/counter-selector-wave-12-source-registry.json',
  'schemas/counter-selector-artifact-acquisition-b05.schema.json',
  'docs/methods/counter-selector-artifact-acquisition-b05.md',
  'docs/milestones/counter-selector-wave-12.md',
  'tools/build-counter-selector-wave-12.mjs',
  'tools/validate-counter-selector-wave-12.mjs',
  'test/counter-selector-wave-12.test.js'
];

export function manifest(){
  const entries=releaseScope.map(p=>{const b=bytes(p);return{path:p,sha256:sha256(b),bytes:b.length}});
  return {
    schema_version:'counter-selector-wave-12-release-manifest@1',
    program_id:'counter-selector-v1',
    wave_id:'CS-W12-B05',
    batch_id:'CS-AQ-B05',
    as_of:'2026-07-31',
    hash_mode:'sha256_exact_bytes',
    scope_ordered:true,
    self_included:false,
    entries,
    combined_sha256:sha256(entries.map(x=>`${x.path}\0${x.sha256}\0${x.bytes}\n`).join('')),
    boundaries:{
      exact_bytes_prove_source_truth:false,
      manifest_proves_operator_capacity:false,
      manifest_authorizes_blind_review_result:false,
      manifest_authorizes_field_test:false,
      manifest_authorizes_person_ranking:false,
      manifest_authorizes_graph_edge:false,
      graph_effect:'none'
    }
  }
}

export function acquisition(contract,sources){
  const classes=[...new Set(contract.records.map(r=>r.denominator_class))];
  return {
    schema_version:'counter-selector-artifact-acquisition-b05-registry@1',
    program_id:contract.program_id,
    wave_id:contract.wave_id,
    batch_id:contract.batch_id,
    as_of:contract.as_of,
    status:'batch_05_acquired_four_packets_ready_review_not_started',
    parent_release_sha256:contract.parent_release_sha256,
    counts:structuredClone(contract.expected_counts),
    class_counts:Object.fromEntries(classes.map(c=>[c,contract.records.filter(r=>r.denominator_class===c).length])),
    qualification_counts:{
      partial_not_blind_ready:contract.records.filter(r=>r.qualification==='partial_not_blind_ready').length,
      qualifying_for_blind_packet:contract.records.filter(r=>r.qualification==='qualifying_for_blind_packet').length
    },
    candidates:structuredClone(contract.records),
    source_packets:structuredClone(sources.sources),
    boundaries:{...contract.boundaries,...sources.boundaries}
  }
}

export function packets(contract){
  return {
    schema_version:'counter-selector-blind-packet-registry-b05@1',
    program_id:contract.program_id,
    wave_id:contract.wave_id,
    batch_id:contract.batch_id,
    as_of:contract.as_of,
    status:'four_identity_minimized_packets_ready_blind_review_not_started',
    counts:{
      packets_ready:contract.blind_packets.length,
      operator_artifact_packets:contract.blind_packets.filter(p=>p.packet_kind==='operator_artifact_packet').length,
      mechanism_only_packets:contract.blind_packets.filter(p=>p.packet_kind!=='operator_artifact_packet').length,
      blind_reviews_executed:0,
      field_tests_executed:0,
      person_or_partnership_findings:0,
      public_identity_releases:0,
      promotions:0,
      person_rankings:0,
      graph_effects:0
    },
    private_map:contract.blind_packets.map(p=>({
      packet_id:p.packet_id,
      blind_token:p.blind_token,
      candidate_id:p.candidate_id,
      mapping_authority:'custody_only_not_available_to_blind_reviewer'
    })),
    packets:structuredClone(contract.blind_packets),
    next_action:"Run procedurally separated blind-first review on the four Batch 05 packets. Preserve the clinical work artifact, ordinary-merits control, correction mechanism, and disputed-exit failure as distinct units.",
    boundaries:{
      packet_is_operator_finding:false,
      mechanism_packet_is_person_or_partnership_finding:false,
      packet_is_blind_review_result:false,
      private_map_available_to_blind_reviewer:false,
      packet_authorizes_contact:false,
      packet_authorizes_field_test:false,
      graph_effect:'none'
    }
  }
}

export function report(contract,src,acq,pkt,m){
  return {
    schema_version:'counter-selector-wave-12-report@1',
    program_id:contract.program_id,
    wave_id:contract.wave_id,
    batch_id:contract.batch_id,
    as_of:contract.as_of,
    title:contract.title,
    status:acq.status,
    parent_release_sha256:contract.parent_release_sha256,
    counts:acq.counts,
    class_counts:acq.class_counts,
    qualification_counts:acq.qualification_counts,
    candidate_results:acq.candidates.map(r=>({
      candidate_id:r.candidate_id,
      blind_token:r.blind_token,
      denominator_class:r.denominator_class,
      public_label:r.public_label,
      acquisition_state:r.acquisition_state,
      qualification:r.qualification,
      packet_kind:r.packet_kind,
      source_packet_count:r.source_packet_ids.length,
      missing_receipts:r.missing_receipts,
      review_state:r.review_state,
      graph_effect:'none'
    })),
    blind_packets:pkt.packets.map(p=>({
      packet_id:p.packet_id,
      blind_token:p.blind_token,
      packet_kind:p.packet_kind,
      review_authority:p.review_authority,
      packet_state:p.packet_state,
      graph_effect:p.graph_effect
    })),
    source_summary:{
      source_packets:src.sources.length,
      source_domains:[...new Set(src.sources.map(s=>new URL(s.url).hostname))].sort()
    },
    next_action:pkt.next_action,
    boundaries:{...acq.boundaries,...pkt.boundaries},
    release_manifest:{
      path:'data/project/counter-selector-wave-12-release-manifest.json',
      combined_sha256:m.combined_sha256
    }
  }
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export function html(r){
  const rows=r.candidate_results.map(x=>`<tr><td><code>${esc(x.candidate_id)}</code></td><td>${esc(x.denominator_class)}</td><td>${esc(x.qualification)}</td><td>${esc(x.packet_kind)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Counter-Selector Wave 12</title><style>body{font-family:system-ui;max-width:1200px;margin:auto;padding:36px;line-height:1.5;background:#f3f0e9;color:#181714}h1{font-size:clamp(2.5rem,6vw,5rem);line-height:.95}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card,table{background:#fff;border:1px solid #c9c1b4;border-radius:12px}.card{padding:16px}.card b{display:block;font-size:2.2rem}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><p><b>CLIFFORD NUMBER · ${esc(r.wave_id)}</b></p><h1>Clinical evidence and exit authorship enter the selector</h1><div class="grid"><div class="card"><b>${r.counts.batch_objects}</b>objects</div><div class="card"><b>${r.counts.qualifying_acquisitions}</b>qualifying</div><div class="card"><b>${r.counts.partial_acquisitions}</b>partial</div><div class="card"><b>${r.counts.blind_reviews_executed}</b>reviews</div></div><table><thead><tr><th>Candidate</th><th>Class</th><th>Acquisition</th><th>Packet</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Next:</strong> ${esc(r.next_action)}</p><p><code>${esc(r.release_manifest.combined_sha256)}</code></p></body></html>\n`
}

export function build(){
  const c=read('data/project/counter-selector-wave-12-batch-05.json');
  const s=read('data/project/counter-selector-wave-12-source-registry.json');
  const a=acquisition(c,s),p=packets(c);
  writeJson('data/project/counter-selector-artifact-acquisition-b05-registry.json',a);
  writeJson('data/project/counter-selector-blind-packet-registry-b05.json',p);
  const m=manifest();
  writeJson('data/project/counter-selector-wave-12-release-manifest.json',m);
  const r=report(c,s,a,p,m);
  writeJson('reports/core-thesis/counter-selector-wave-12/data.json',r);
  writeText('reports/core-thesis/counter-selector-wave-12/index.html',html(r));
  console.log(`build-counter-selector-wave-12: ${a.counts.batch_objects} objects, ${a.counts.qualifying_acquisitions} qualifying, ${p.counts.packets_ready} packets`)
}
if(process.argv[1]===fileURLToPath(import.meta.url))build();
