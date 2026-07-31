#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function fileDigest(relative) { return crypto.createHash('sha256').update(fs.readFileSync(full(relative))).digest('hex'); }
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}

const policy = readJson('data/project/lake-receipt-custody-wave-20-policy.json');
const decisions = readJsonl(policy.paths.registry);
const projection = readJson(policy.paths.projection);
const priorReceipt = readJson(policy.paths.receipt);
const index = readJson('build/lake-index.json');
const objectIndex = readJson('build/lake-object-index.json');
const rawReceiptRows = readJsonl('build/lake-index/receipts.jsonl');
const unusedGaps = readJsonl('build/lake-index/receipt-gaps.jsonl')
  .filter(row => row.gap_class === 'unused_receipt_definition')
  .sort((left, right) => left.receipt_id.localeCompare(right.receipt_id));

assert.equal(priorReceipt.schema_version, 'lake-receipt-custody-wave-20-receipt@1');
assert.equal(projection.schema_version, 'lake-receipt-custody-wave-20@1');
assert.equal(decisions.length, policy.baseline.unused_receipt_definitions);
assert.equal(projection.registry_sha256, digest(decisions));
assert.equal(priorReceipt.registry_sha256, digest(decisions));
assert.equal(digest(unusedGaps), priorReceipt.receipt_gap_sha256, 'raw receipt-gap denominator drift');
assert.equal(digest(rawReceiptRows), priorReceipt.receipt_index_sha256, 'receipt index denominator drift');

for (const [relative, expected] of Object.entries(priorReceipt.source_definition_digests)) {
  assert.ok(fs.existsSync(full(relative)), `${relative}: protected receipt source is missing`);
  assert.equal(fileDigest(relative), expected, `${relative}: source claim or receipt bytes changed`);
}

const graphDigests = {
  participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
  active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
  hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
  rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
};
assert.deepEqual(graphDigests, priorReceipt.graph_digests, 'Wave 20 changed participation, claims, or hop controls');

const objectByCompound = new Map((objectIndex.objects ?? []).map(object => [`${object.id_key}:${object.id_value}`, object]));
let sourceObserved = 0;
let projectionObserved = 0;
let indexObserved = 0;
const observations = [];

for (const decision of decisions) {
  const object = objectByCompound.get(`receipt_custody_decision_id:${decision.receipt_custody_decision_id}`);
  assert.ok(object, `${decision.receipt_custody_decision_id}: lake object missing`);
  const sourceOccurrences = (object.occurrences ?? []).filter(occurrence =>
    occurrence.generated !== true && occurrence.path === policy.paths.registry
  );
  const projectionOccurrences = (object.occurrences ?? []).filter(occurrence =>
    projectionOccurrence(occurrence) && occurrence.path === policy.paths.projection
  );
  assert.ok(sourceOccurrences.length > 0, `${decision.receipt_custody_decision_id}: source registry occurrence missing`);
  assert.ok(projectionOccurrences.length > 0, `${decision.receipt_custody_decision_id}: generated projection occurrence missing`);
  assert.equal(object.receipt_custody_adjudicated, true, `${decision.receipt_custody_decision_id}: adjudication overlay missing`);
  assert.equal(object.receipt_custody_action_open, false, `${decision.receipt_custody_decision_id}: custody action remains open`);
  assert.equal(object.receipt_custody_graph_effect, 'none', `${decision.receipt_custody_decision_id}: graph boundary drift`);
  sourceObserved += 1;
  projectionObserved += 1;
  indexObserved += 1;
  observations.push({
    receipt_custody_decision_id: decision.receipt_custody_decision_id,
    target_receipt_token: decision.target_receipt_token,
    custody_classification: decision.custody_classification,
    source_observed: true,
    projection_observed: true,
    index_observed: true,
    source_normalization_required: decision.source_normalization_required,
    graph_effect: 'none'
  });
}

const rawTargets = unusedGaps.map(row => row.receipt_id).sort();
const decisionTargets = decisions.map(row => row.target_receipt_token).sort();
assert.deepEqual(decisionTargets, rawTargets, 'Wave 20 decisions do not exactly cover the raw gap denominator');

const counts = {
  ...priorReceipt.counts,
  raw_unused_receipt_definitions_after: unusedGaps.length,
  unadjudicated_receipt_definitions_after: 0,
  decision_ids_source_observed: sourceObserved,
  decision_ids_projection_observed: projectionObserved,
  decision_ids_index_observed: indexObserved,
  decisions_requiring_human_permission: 0,
  relationship_delta: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0
};

assert.equal(index.summary.counts.receipt_custody_unused_definitions_raw, unusedGaps.length);
assert.equal(index.summary.counts.receipt_custody_decisions, decisions.length);
assert.equal(index.summary.counts.receipt_custody_unused_definitions_unadjudicated, 0);

const receipt = {
  ...priorReceipt,
  graph_digests: graphDigests,
  counts,
  post_execution_reconciliation_complete: true,
  source_projection_index_complete: sourceObserved === decisions.length
    && projectionObserved === decisions.length
    && indexObserved === decisions.length,
  all_raw_unused_definitions_adjudicated: true,
  raw_unused_definition_count_forced_to_zero: false,
  source_claim_or_receipt_mutations: 0,
  correction_mode: policy.decision_law.correction_mode,
  boundaries: policy.boundaries
};
const reconciliation = {
  schema_version: 'lake-receipt-custody-wave-20-reconciliation@1',
  program_id: policy.program_id,
  registry_sha256: digest(decisions),
  receipt_gap_sha256: digest(unusedGaps),
  graph_digests: graphDigests,
  counts,
  observations,
  completion: {
    all_raw_unused_definitions_adjudicated: true,
    all_decisions_source_projected_indexed: receipt.source_projection_index_complete,
    raw_unused_definition_count_forced_to_zero: false,
    source_claim_or_receipt_mutations: 0,
    evidence_truth_determined: false,
    publication_cleared: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};

writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.reconciliation, reconciliation);

const report = `# Receipt and source custody — Wave 20

\`\`\`text
raw unused receipt definitions:              ${counts.raw_unused_receipt_definitions}
custody decisions:                           ${counts.custody_decisions}
compound reference encoding defects:         ${counts.compound_reference_encoding_defects}
source normalizations required:              ${counts.source_normalizations_required}
definitions with observed hashes:            ${counts.definitions_with_observed_hashes}
definitions with locator URLs:                ${counts.definitions_with_locator_urls}
explicit unresolved custody:                 ${counts.explicit_unresolved_custody}
decision IDs source/projected/indexed:        ${sourceObserved} / ${projectionObserved} / ${indexObserved}
unadjudicated receipt definitions:            0
raw unused count forced to zero:              false
source claim or receipt mutations:            0
human-permission dependencies:                0
relationship / participation / claim / graph: 0 / 0 / 0 / 0
\`\`\`

Wave 20 preserves all forty-nine raw unused-definition rows and assigns each one a
bounded custody disposition. A compound scalar token is an encoding defect only when
every constituent receipt already exists. A URL without captured bytes remains
locator-only custody; a hash does not manufacture claim use; an unavailable source
remains explicitly unavailable rather than becoming a permission wait.

No source claim or receipt definition was rewritten. No receipt was attached to a claim,
no evidence truth or publication clearance was inferred, and the active graph is
unchanged.
`;
fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
fs.writeFileSync(full(policy.paths.report), report);

console.log('receipt custody Wave 20 reconciled');
console.log(`  raw / adjudicated / unadjudicated: ${unusedGaps.length} / ${decisions.length} / 0`);
console.log(`  decision IDs source / projected / indexed: ${sourceObserved} / ${projectionObserved} / ${indexObserved}`);
console.log('  source mutations / relationship / participation / claim / graph: 0 / 0 / 0 / 0 / 0');
