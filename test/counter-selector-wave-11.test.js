#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContractObject } from '../tools/validate-counter-selector-wave-11.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const original=JSON.parse(fs.readFileSync(path.join(root,'data/project/counter-selector-wave-11-batch-04.json'),'utf8'));
const sources=JSON.parse(fs.readFileSync(path.join(root,'data/project/counter-selector-wave-11-source-registry.json'),'utf8'));
const clone=x=>structuredClone(x);
const mutations=[
  c=>c.schema_version='wrong',
  c=>c.wave_id='wrong',
  c=>c.batch_id='wrong',
  c=>c.records.pop(),
  c=>c.records[1].denominator_class=c.records[0].denominator_class,
  c=>c.expected_counts.batch_objects=7,
  c=>c.expected_counts.denominator_classes=5,
  c=>c.expected_counts.qualifying_acquisitions+=1,
  c=>c.expected_counts.partial_acquisitions+=1,
  c=>c.expected_counts.blind_packets_ready+=1,
  c=>c.expected_counts.identity_minimized_packets+=1,
  c=>c.expected_counts.source_packets+=1,
  c=>c.expected_counts.blind_reviews_executed=1,
  c=>c.expected_counts.field_tests_executed=1,
  c=>c.expected_counts.operator_findings=1,
  c=>c.expected_counts.person_or_partnership_findings=1,
  c=>c.expected_counts.promotions=1,
  c=>c.expected_counts.person_rankings=1,
  c=>c.expected_counts.public_identity_releases=1,
  c=>c.expected_counts.graph_effects=1,
  c=>c.records[0].source_packet_ids=['missing'],
  c=>c.records[0].graph_effect='edge',
  c=>c.records[0].operator_finding=true,
  c=>c.records[0].field_test_authorized=true,
  c=>c.records.find(r=>r.qualification==='qualifying_for_blind_packet').blind_packet_ready=false,
  c=>c.records.find(r=>r.qualification==='partial_not_blind_ready').blind_packet_ready=true,
  c=>c.blind_packets[0].identity_removed=false,
  c=>c.blind_packets[0].field_test_authorized=true,
  c=>c.boundaries.qualifying_acquisition_is_blind_review_result=true,
  c=>c.boundaries.graph_effect='edge'
];
assert.equal(mutations.length,30);
let passed=0;
for(const mutate of mutations){
  const c=clone(original); mutate(c);
  assert.throws(()=>validateContractObject(c,sources));
  passed++;
}
console.log(`counter-selector-wave-11.test: PASS (${passed} adversarial mutations)`);
