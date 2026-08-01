#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquisition, packets, manifest, report, html } from './build-counter-selector-wave-12.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const text=rel=>fs.readFileSync(path.join(root,rel),'utf8');

export function validateContractObject(c,s){
  assert.equal(c.schema_version,'counter-selector-wave-12-program@1');
  assert.equal(c.wave_id,'CS-W12-B05');
  assert.equal(c.batch_id,'CS-AQ-B05');
  assert.equal(c.records.length,6);
  assert.equal(new Set(c.records.map(r=>r.denominator_class)).size,6);
  assert.equal(c.expected_counts.batch_objects,6);
  assert.equal(c.expected_counts.denominator_classes,6);
  assert.equal(c.expected_counts.qualifying_acquisitions,c.records.filter(r=>r.qualification==='qualifying_for_blind_packet').length);
  assert.equal(c.expected_counts.partial_acquisitions,c.records.filter(r=>r.qualification==='partial_not_blind_ready').length);
  assert.equal(c.expected_counts.blind_packets_ready,c.blind_packets.length);
  assert.equal(c.expected_counts.identity_minimized_packets,c.blind_packets.length);
  assert.equal(c.expected_counts.source_packets,s.sources.length);
  assert.equal(c.expected_counts.blind_reviews_executed,0);
  assert.equal(c.expected_counts.field_tests_executed,0);
  assert.equal(c.expected_counts.operator_findings,0);
  assert.equal(c.expected_counts.person_or_partnership_findings,0);
  assert.equal(c.expected_counts.promotions,0);
  assert.equal(c.expected_counts.person_rankings,0);
  assert.equal(c.expected_counts.public_identity_releases,0);
  assert.equal(c.expected_counts.graph_effects,0);
  const ids=new Set(s.sources.map(x=>x.source_id));
  assert.equal(ids.size,s.sources.length);
  for(const r of c.records){
    assert.ok(r.source_packet_ids.length>0);
    for(const id of r.source_packet_ids)assert.ok(ids.has(id));
    assert.equal(r.graph_effect,'none');
    assert.equal(r.operator_finding,false);
    assert.equal(r.field_test_authorized,false);
    if(r.qualification==='qualifying_for_blind_packet')assert.equal(r.blind_packet_ready,true);
    if(r.qualification==='partial_not_blind_ready')assert.equal(r.blind_packet_ready,false);
  }
  const candidateIds=new Set(c.records.map(r=>r.candidate_id));
  for(const p of c.blind_packets){
    assert.ok(candidateIds.has(p.candidate_id));
    assert.equal(p.identity_removed,true);
    assert.equal(p.status_cues_removed,true);
    assert.equal(p.class_cues_removed,true);
    assert.equal(p.source_ids_removed,true);
    assert.equal(p.blind_review_executed,false);
    assert.equal(p.field_test_authorized,false);
    assert.equal(p.public_identity_release_authorized,false);
    assert.equal(p.graph_effect,'none');
  }
  assert.equal(c.boundaries.qualifying_acquisition_is_blind_review_result,false);
  assert.equal(c.boundaries.partial_acquisition_is_negative_capability_evidence,false);
  assert.equal(c.boundaries.field_test_authorized,false);
  assert.equal(c.boundaries.promotion_authorized,false);
  assert.equal(c.boundaries.person_ranking_authorized,false);
  assert.equal(c.boundaries.public_identity_release_authorized,false);
  assert.equal(c.boundaries.graph_effect,'none');
  return true;
}

export function validate(){
  const c=read('data/project/counter-selector-wave-12-batch-05.json');
  const s=read('data/project/counter-selector-wave-12-source-registry.json');
  const a=read('data/project/counter-selector-artifact-acquisition-b05-registry.json');
  const p=read('data/project/counter-selector-blind-packet-registry-b05.json');
  const m=read('data/project/counter-selector-wave-12-release-manifest.json');
  const r=read('reports/core-thesis/counter-selector-wave-12/data.json');
  const h=text('reports/core-thesis/counter-selector-wave-12/index.html');
  validateContractObject(c,s);
  assert.deepEqual(a,acquisition(c,s));
  assert.deepEqual(p,packets(c));
  assert.deepEqual(m,manifest());
  assert.deepEqual(r,report(c,s,a,p,m));
  assert.equal(h,html(r));
  assert.equal(m.entries.length,9);
  assert.equal(m.combined_sha256.length,64);
  assert.equal(r.release_manifest.combined_sha256,m.combined_sha256);
  assert.equal(r.counts.adversarial_mutations,30);
  console.log(`validate-counter-selector-wave-12: PASS (${c.records.length} objects, ${p.packets.length} packets, ${m.combined_sha256})`);
  return true;
}
if(process.argv[1]===fileURLToPath(import.meta.url))validate();
