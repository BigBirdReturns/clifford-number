#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateCounterSelectorWave05 } from '../tools/validate-counter-selector-wave-05.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
validateCounterSelectorWave05();
const contractPath = path.join(root, 'data/project/counter-selector-wave-05-gap-resolution.json');
const sourcePath = path.join(root, 'data/project/counter-selector-wave-05-source-registry.json');
const baseContract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const baseSources = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const mutations = [
  ['support ledger implies surplus', (c) => { c.lane_plans[0].findings.support_adjusted_surplus_established = true; }],
  ['office continuity becomes handoff', (c) => { c.lane_plans[0].findings.independent_handoff_receipt_located = true; }],
  ['role becomes transfer artifact', (c) => { c.lane_plans[0].findings.cross_domain_transfer_artifact_located = true; }],
  ['new support dimension', (c) => { c.lane_plans[0].dimension_update.cross_domain_transfer = 'bounded_support'; }],
  ['final merits invented', (c) => { c.lane_plans[1].mechanism_update.final_merits_observed = true; }],
  ['durable custody invented', (c) => { c.lane_plans[1].mechanism_update.durable_final_custody_observed = true; }],
  ['internal repair invented', (c) => { c.lane_plans[1].mechanism_update.voluntary_internal_repair_observed = true; }],
  ['partnership capacity invented', (c) => { c.lane_plans[1].mechanism_update.partnership_capacity_established = true; }],
  ['stay becomes final merits', (c) => { c.boundaries.stay_is_final_merits = true; }],
  ['ordered reinstatement becomes repair', (c) => { c.boundaries.reinstatement_under_order_is_internal_partnership_repair = true; }],
  ['search absence becomes nonexistence', (c) => { c.boundaries.public_search_absence_proves_nonexistence = true; }],
  ['field test authorized', (c) => { c.boundaries.field_test_authorized = true; }],
  ['promotion authorized', (c) => { c.boundaries.promotion_authorized = true; }],
  ['ranking authorized', (c) => { c.boundaries.person_ranking_authorized = true; }],
  ['graph effect', (c) => { c.boundaries.graph_effect = 'candidate_edge'; }],
  ['historical rewrite', (c) => { c.lane_plans[1].supersession.prior_record_deleted = true; }],
  ['remove chronology event', (c) => { c.lane_plans[1].chronology.pop(); }],
  ['remove lane', (c) => { c.lane_plans.pop(); }],
  ['duplicate packet', (c) => { c.lane_plans[1].packet_id = c.lane_plans[0].packet_id; }]
];
const sourceMutations = [
  ['remove source', (s) => { s.sources.pop(); }],
  ['duplicate source id', (s) => { s.sources[1].source_id = s.sources[0].source_id; }],
  ['remove search receipt', (s) => { s.search_receipts.pop(); }],
  ['absence proves nonexistence', (s) => { s.search_receipts[0].authority_ceiling = 'proves no decision exists'; }],
  ['stay source claims merits', (s) => { s.sources.find((row) => row.source_id === 'CS-W05-S005').limits = []; }],
  ['source graph effect', (s) => { s.boundaries.graph_effect = 'edge'; }]
];

function invariant(c, s) {
  assert.equal(c.lane_plans.length, 2);
  assert.equal(new Set(c.lane_plans.map((row) => row.packet_id)).size, 2);
  const a = c.lane_plans[0], b = c.lane_plans[1];
  assert.equal(a.findings.support_adjusted_surplus_established, false);
  assert.equal(a.findings.independent_handoff_receipt_located, false);
  assert.equal(a.findings.cross_domain_transfer_artifact_located, false);
  assert.notEqual(a.dimension_update.cross_domain_transfer, 'bounded_support');
  assert.equal(b.mechanism_update.final_merits_observed, false);
  assert.equal(b.mechanism_update.durable_final_custody_observed, false);
  assert.equal(b.mechanism_update.voluntary_internal_repair_observed, false);
  assert.equal(b.mechanism_update.partnership_capacity_established, false);
  assert.equal(b.supersession.prior_record_deleted ?? false, false);
  assert.equal(b.chronology.length, 6);
  for (const key of ['stay_is_final_merits','reinstatement_under_order_is_internal_partnership_repair','public_search_absence_proves_nonexistence','field_test_authorized','promotion_authorized','person_ranking_authorized']) assert.equal(c.boundaries[key], false);
  assert.equal(c.boundaries.graph_effect, 'none');
  assert.equal(s.sources.length, 6);
  assert.equal(new Set(s.sources.map((row) => row.source_id)).size, 6);
  assert.equal(s.search_receipts.length, 3);
  assert.equal(new Set(s.search_receipts.map((row) => row.search_receipt_id)).size, 3);
  for (const receipt of s.search_receipts) assert.match(receipt.authority_ceiling, /does not prove/i);
  assert.ok(s.sources.find((row) => row.source_id === 'CS-W05-S005').limits.includes('not final merits'));
  assert.equal(s.boundaries.graph_effect, 'none');
}

let passed = 0;
for (const [, mutate] of mutations) {
  const c = structuredClone(baseContract), s = structuredClone(baseSources); mutate(c);
  assert.throws(() => invariant(c, s)); passed++;
}
for (const [, mutate] of sourceMutations) {
  const c = structuredClone(baseContract), s = structuredClone(baseSources); mutate(s);
  assert.throws(() => invariant(c, s)); passed++;
}
invariant(baseContract, baseSources);
console.log(`counter-selector-wave-05.test: PASS (${passed} adversarial mutations)`);
