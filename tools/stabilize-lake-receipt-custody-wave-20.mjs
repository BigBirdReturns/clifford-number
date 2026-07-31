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
function unique(values) { return [...new Set(values)].sort(); }
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}

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
assert.equal(policy.projection_contract.graph_effect, 'none');
assert.equal(policy.projection_contract.cross_key_join_authorized, false);
assert.equal(policy.projection_contract.projection_hash_equality_required, false);

const decisionById = new Map(decisions.map(row => [row.receipt_custody_decision_id, row]));
const contractTargets = new Set([
  `program_id:${policy.program_id}`,
  ...decisions.map(row => `receipt_custody_decision_id:${row.receipt_custody_decision_id}`)
]);
const allowedGeneratedPaths = new Set(policy.projection_contract.allowed_generated_paths);
const reconciliationPresent = fs.existsSync(full(policy.paths.reconciliation));
let observed = 0;
let projectionContractObjectsObserved = 0;
let divergentContractViewsAdjudicated = 0;

for (const object of objects.objects ?? []) {
  if (object.id_key === 'receipt_custody_decision_id') {
    const decision = decisionById.get(object.id_value);
    if (decision) {
      object.receipt_custody_adjudicated = true;
      object.receipt_custody_action_open = false;
      object.receipt_custody_classification = decision.custody_classification;
      object.receipt_custody_target_token = decision.target_receipt_token;
      object.receipt_custody_source_normalization_required = decision.source_normalization_required;
      object.receipt_custody_graph_effect = 'none';
      observed += 1;
    }
  }

  const compound = `${object.id_key}:${object.id_value}`;
  if (!contractTargets.has(compound)) continue;
  const generatedPaths = unique((object.occurrences ?? [])
    .filter(projectionOccurrence)
    .map(occurrence => occurrence.path)
    .filter(Boolean));
  object.receipt_custody_projection_contract = {
    contract_name: policy.projection_contract.contract_name,
    generated_paths: generatedPaths,
    projection_hash_equality_required: false,
    cross_key_join_authorized: false,
    graph_effect: 'none'
  };
  projectionContractObjectsObserved += 1;

  if (!object.divergent_projections) continue;
  assert.ok(generatedPaths.includes(policy.paths.projection), `${compound}: Wave 20 projection path missing`);
  assert.ok(generatedPaths.includes(policy.paths.reconciliation), `${compound}: Wave 20 reconciliation path missing`);
  assert.ok(generatedPaths.every(relative => allowedGeneratedPaths.has(relative)), `${compound}: undeclared Wave 20 generated view`);
  object.receipt_custody_projection_contract.divergence_classification = policy.projection_contract.divergence_classification;
  object.receipt_custody_projection_contract.final_disposition = policy.projection_contract.final_disposition;
  object.topology_divergence_classification = policy.projection_contract.divergence_classification;
  object.topology_divergence_disposition = policy.projection_contract.final_disposition;
  object.topology_generator_contract_action_open = false;
  object.divergent_projections_unadjudicated = false;
  divergentContractViewsAdjudicated += 1;
}

assert.equal(observed, decisions.length, `Wave 20 decision objects observed ${observed}/${decisions.length}`);
assert.equal(projectionContractObjectsObserved, decisions.length + 1, `Wave 20 projection-contract objects observed ${projectionContractObjectsObserved}/${decisions.length + 1}`);
if (reconciliationPresent) {
  assert.equal(divergentContractViewsAdjudicated, decisions.length + 1, `Wave 20 typed divergent views adjudicated ${divergentContractViewsAdjudicated}/${decisions.length + 1}`);
}

const remainingDivergenceRows = (objects.objects ?? []).filter(object => object.divergent_projections_unadjudicated);
Object.assign(index.summary.counts, {
  receipt_custody_unused_definitions_raw: receipt.counts.raw_unused_receipt_definitions,
  receipt_custody_decisions: receipt.counts.custody_decisions,
  receipt_custody_compound_encoding_defects: receipt.counts.compound_reference_encoding_defects,
  receipt_custody_source_normalizations_required: receipt.counts.source_normalizations_required,
  receipt_custody_unused_definitions_unadjudicated: 0,
  receipt_custody_projection_contract_objects: projectionContractObjectsObserved,
  receipt_custody_typed_divergent_views_adjudicated: divergentContractViewsAdjudicated,
  divergent_identifier_projections_unadjudicated: remainingDivergenceRows.length
});
Object.assign(index.summary.boundaries, {
  receipt_custody_adjudication_proves_source_truth: false,
  receipt_custody_locator_proves_byte_capture: false,
  receipt_custody_adjudication_attaches_receipt_to_claim: false,
  receipt_custody_raw_count_forced_to_zero: false,
  receipt_custody_typed_projection_views_prove_identity_or_truth: false,
  receipt_custody_typed_projection_views_authorize_cross_key_join: false,
  receipt_custody_graph_effect: 'none'
});

objects.receipt_custody_semantics = {
  schema_version: 'lake-receipt-custody-semantics-wave-20@1',
  registry_path: policy.paths.registry,
  decisions: decisions.length,
  raw_unused_definitions: receipt.counts.raw_unused_receipt_definitions,
  unadjudicated: 0,
  projection_contract: {
    ...policy.projection_contract,
    objects_observed: projectionContractObjectsObserved,
    divergent_views_adjudicated: divergentContractViewsAdjudicated
  },
  source_mutations: 0,
  graph_effect: 'none',
  boundaries: policy.boundaries
};

gaps.divergent_identifier_projections_unadjudicated = remainingDivergenceRows;
if (gaps.identifier_topology) {
  gaps.identifier_topology.divergence_unadjudicated = remainingDivergenceRows.length;
}
gaps.receipt_custody = {
  registry_path: policy.paths.registry,
  raw_unused_definitions: receipt.counts.raw_unused_receipt_definitions,
  adjudicated_decisions: decisions.length,
  compound_reference_encoding_defects: receipt.counts.compound_reference_encoding_defects,
  source_normalizations_required: receipt.counts.source_normalizations_required,
  projection_contract_objects: projectionContractObjectsObserved,
  typed_divergent_views_adjudicated: divergentContractViewsAdjudicated,
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
  projection_contract_objects: projectionContractObjectsObserved,
  typed_divergent_views_adjudicated: divergentContractViewsAdjudicated,
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
console.log(`  projection-contract objects / typed divergent views: ${projectionContractObjectsObserved} / ${divergentContractViewsAdjudicated}`);
console.log(`  raw unused / unadjudicated: ${receipt.counts.raw_unused_receipt_definitions} / 0`);
console.log(`  remaining divergence unadjudicated: ${remainingDivergenceRows.length}`);
console.log('  source mutations / graph effects: 0 / 0');
