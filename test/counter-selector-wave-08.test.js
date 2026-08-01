#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveReviewRegistry, deriveDisagreementLedger } from '../tools/build-counter-selector-wave-08.mjs';
import { validateRegistryObject } from '../tools/validate-counter-selector-wave-08.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const program = read('data/project/counter-selector-wave-08-blind-review.json');
const parent = read(program.review_protocol.parent_packet_path);
const baseRegistry = deriveReviewRegistry(program, parent);
const baseLedger = deriveDisagreementLedger(program);

const mutations = [
  ['program id', (r) => { r.program_id = 'wrong'; }],
  ['wave id', (r) => { r.wave_id = 'CS-W08-WRONG'; }],
  ['batch id', (r) => { r.batch_id = 'CS-AQ-WRONG'; }],
  ['as of', (r) => { r.as_of = '2026-07-30'; }],
  ['parent wave', (r) => { r.parent_wave_id = 'CS-W06-CUSTODY-01'; }],
  ['parent digest', (r) => { r.parent_release_sha256 = '0'.repeat(64); }],
  ['packet count', (r) => { r.counts.identity_minimized_packets_reviewed = 3; }],
  ['review pass count', (r) => { r.counts.procedurally_separated_review_passes = 7; }],
  ['external review inflation', (r) => { r.counts.external_independent_reviews = 1; }],
  ['bounded support inflation', (r) => { r.counts.bounded_dimension_supports = 5; }],
  ['operator finding inflation', (r) => { r.counts.operator_findings = 1; }],
  ['field test inflation', (r) => { r.counts.field_test_eligible_packets = 1; }],
  ['drop packet', (r) => { r.packet_results.pop(); }],
  ['duplicate packet id', (r) => { r.packet_results[1].packet_id = r.packet_results[0].packet_id; }],
  ['drop review pass', (r) => { r.packet_results[0].review_passes.pop(); }],
  ['review role mutation', (r) => { r.packet_results[0].review_passes[0].reviewer_role = 'adversarial_countermodel'; }],
  ['fresh context mutation', (r) => { r.packet_results[0].review_passes[0].fresh_context = false; }],
  ['external independence claim', (r) => { r.packet_results[0].review_passes[0].external_independence_claimed = true; }],
  ['dimension key deletion', (r) => { delete r.packet_results[0].dimension_vector.custody; }],
  ['packet field test', (r) => { r.packet_results[0].field_test_eligible = true; }],
  ['packet operator finding', (r) => { r.packet_results[0].operator_finding = true; }],
  ['packet person finding', (r) => { r.packet_results[0].person_or_partnership_finding = true; }],
  ['graph effect', (r) => { r.packet_results[0].graph_effect = 'edge'; }],
  ['rewrite history', (r) => { r.packet_results[0].analysis_class_recommendation.rewrites_historical_class = true; }],
  ['collective exception support removed', (r) => { r.packet_results[0].dimension_vector.exception_handling = 'not_tested'; }],
  ['collective restraint support removed', (r) => { r.packet_results[0].dimension_vector.epistemic_restraint = 'not_tested'; }],
  ['collective custody inflated', (r) => { r.packet_results[0].dimension_vector.custody = 'bounded_support'; }],
  ['checking custody removed', (r) => { r.packet_results[1].dimension_vector.custody = 'not_tested'; }],
  ['checking capacity removed', (r) => { r.packet_results[1].dimension_vector.governed_capacity = 'not_tested'; }],
  ['mechanism dimension attributed', (r) => { r.packet_results[2].dimension_vector.custody = 'bounded_support'; }],
  ['partnership capacity invented', (r) => { r.packet_results[2].mechanism_observations.partnership_capacity_established = true; }],
  ['bounded partnership invented', (r) => { r.packet_results[3].mechanism_observations.bounded_partnership_identified = true; }]
];

for (const [name, mutate] of mutations) {
  const registry = clone(baseRegistry);
  const ledger = clone(baseLedger);
  mutate(registry, ledger);
  assert.throws(() => validateRegistryObject(registry, program, parent, ledger), undefined, name);
}

assert.equal(mutations.length, 32);
console.log(`counter-selector-wave-08.test: PASS (${mutations.length} adversarial mutations)`);
