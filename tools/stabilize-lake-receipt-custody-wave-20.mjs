#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function writeJson(relative, value) { fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`); }

const policy = readJson('data/project/lake-receipt-custody-wave-20-policy.json');
const decisions = readJsonl(policy.paths.registry);
const receipt = readJson(policy.paths.receipt);
const index = readJson('build/lake-index.json');
const objects = readJson('build/lake-object-index.json');
const gaps = readJson('build/lake-index-gaps.json');
const receiptSemanticsPath = 'build/lake-index/receipt-semantics.json';
const receiptSemantics = readJson(receiptSemanticsPath);

assert.equal(decisions.length, policy.baseline.unused_receipt_definitions);
assert.equal(receipt.counts.custody_decisions, decisions.length);

const decisionById = new Map(decisions.map(row => [row.receipt_custody_decision_id, row]));
let observed = 0;
for (const object of objects.objects ?? []) {
  if (object.id_key !== 'receipt_custody_decision_id') continue;
  const decision = decisionById.get(object.id_value);
  if (!decision) continue;
  object.receipt_custody_adjudicated = true;
  object.receipt_custody_action_open = false;
  object.receipt_custody_classification = decision.custody_classification;
  object.receipt_custody_target_token = decision.target_receipt_token;
  object.receipt_custody_source_normalization_required = decision.source_normalization_required;
  object.receipt_custody_graph_effect = 'none';
  observed += 1;
}
assert.equal(observed, decisions.length, `Wave 20 decision objects observed ${observed}/${decisions.length}`);

Object.assign(index.summary.counts, {
  receipt_custody_unused_definitions_raw: receipt.counts.raw_unused_receipt_definitions,
  receipt_custody_decisions: receipt.counts.custody_decisions,
  receipt_custody_compound_encoding_defects: receipt.counts.compound_reference_encoding_defects,
  receipt_custody_source_normalizations_required: receipt.counts.source_normalizations_required,
  receipt_custody_unused_definitions_unadjudicated: 0
});
Object.assign(index.summary.boundaries, {
  receipt_custody_adjudication_proves_source_truth: false,
  receipt_custody_locator_proves_byte_capture: false,
  receipt_custody_adjudication_attaches_receipt_to_claim: false,
  receipt_custody_raw_count_forced_to_zero: false,
  receipt_custody_graph_effect: 'none'
});

objects.receipt_custody_semantics = {
  schema_version: 'lake-receipt-custody-semantics-wave-20@1',
  registry_path: policy.paths.registry,
  decisions: decisions.length,
  raw_unused_definitions: receipt.counts.raw_unused_receipt_definitions,
  unadjudicated: 0,
  source_mutations: 0,
  graph_effect: 'none',
  boundaries: policy.boundaries
};

gaps.receipt_custody = {
  registry_path: policy.paths.registry,
  raw_unused_definitions: receipt.counts.raw_unused_receipt_definitions,
  adjudicated_decisions: decisions.length,
  compound_reference_encoding_defects: receipt.counts.compound_reference_encoding_defects,
  source_normalizations_required: receipt.counts.source_normalizations_required,
  unadjudicated_rows: [],
  raw_count_forced_to_zero: false,
  review_required_to_decide: false,
  graph_effect: 'none'
};

receiptSemantics.custody_adjudication = {
  schema_version: 'lake-receipt-custody-semantics-wave-20@1',
  raw_unused_definitions: receipt.counts.raw_unused_receipt_definitions,
  adjudicated_decisions: decisions.length,
  compound_reference_encoding_defects: receipt.counts.compound_reference_encoding_defects,
  unadjudicated_definitions: 0,
  source_claim_or_receipt_mutations: 0,
  raw_count_forced_to_zero: false,
  graph_effect: 'none'
};

writeJson('build/lake-index.json', index);
writeJson('build/lake-object-index.json', objects);
writeJson('build/lake-index-gaps.json', gaps);
writeJson(receiptSemanticsPath, receiptSemantics);

console.log('receipt custody Wave 20 overlay stabilized');
console.log(`  decision objects observed: ${observed}/${decisions.length}`);
console.log(`  raw unused / unadjudicated: ${receipt.counts.raw_unused_receipt_definitions} / 0`);
console.log('  source mutations / graph effects: 0 / 0');
