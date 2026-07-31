#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
let failures = 0;
function fail(message) { console.error(`- ${message}`); failures += 1; }
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
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
const receipt = readJson(policy.paths.receipt);
const reconciliation = readJson(policy.paths.reconciliation);
const summary = readJson('build/lake-index/summary.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const rawReceiptRows = readJsonl('build/lake-index/receipts.jsonl');
const receiptSemantics = readJson('build/lake-index/receipt-semantics.json');
const unusedGaps = readJsonl('build/lake-index/receipt-gaps.jsonl')
  .filter(row => row.gap_class === 'unused_receipt_definition')
  .sort((left, right) => left.receipt_id.localeCompare(right.receipt_id));

for (const [artifact, schema] of [
  [policy, 'lake-receipt-custody-wave-20-policy@1'],
  [projection, 'lake-receipt-custody-wave-20@1'],
  [receipt, 'lake-receipt-custody-wave-20-receipt@1'],
  [reconciliation, 'lake-receipt-custody-wave-20-reconciliation@1']
]) {
  if (artifact.schema_version !== schema) fail(`schema drift: ${schema}`);
}

if (decisions.length !== policy.baseline.unused_receipt_definitions) fail(`decision denominator is ${decisions.length}`);
if (decisions.some(row => row.program_id !== policy.program_id)) fail('decision program identity drift');
if (projection.program_id !== policy.program_id) fail('projection program identity drift');
if (receipt.program_id !== policy.program_id) fail('receipt program identity drift');
if (reconciliation.program_id !== policy.program_id) fail('reconciliation program identity drift');
if (unusedGaps.length !== policy.baseline.unused_receipt_definitions) fail(`raw unused denominator is ${unusedGaps.length}`);
if (rawReceiptRows.filter(row => row.defined && !row.used).length !== policy.baseline.unused_receipt_definitions) fail('unused receipt index denominator drift');
if (receiptSemantics.canonical_receipt_ids !== policy.baseline.canonical_receipt_ids) fail('canonical receipt denominator drift');
if (receiptSemantics.parse_errors.length !== 0) fail('receipt semantic parse errors exist');
if (!receipt.post_execution_reconciliation_complete) fail('Wave 20 receipt is not complete');
if (!receipt.source_projection_index_complete) fail('Wave 20 source/projection/index reconciliation is incomplete');
if (!receipt.all_raw_unused_definitions_adjudicated) fail('not every raw unused receipt definition is adjudicated');
if (receipt.raw_unused_definition_count_forced_to_zero !== false) fail('raw unused denominator was cosmetically forced to zero');
if (receipt.source_claim_or_receipt_mutations !== 0) fail('source claims or receipt definitions were mutated');
if (projection.registry_sha256 !== digest(decisions)) fail('projection registry digest drift');
if (receipt.registry_sha256 !== digest(decisions)) fail('receipt registry digest drift');
if (reconciliation.registry_sha256 !== digest(decisions)) fail('reconciliation registry digest drift');
if (receipt.receipt_gap_sha256 !== digest(unusedGaps)) fail('raw receipt-gap digest drift');
if (receipt.receipt_index_sha256 !== digest(rawReceiptRows)) fail('receipt-index digest drift');

for (const [relative, expected] of Object.entries(receipt.source_definition_digests)) {
  if (!fs.existsSync(full(relative))) {
    fail(`${relative}: protected source file missing`);
  } else if (fileDigest(relative) !== expected) {
    fail(`${relative}: protected source claim or receipt bytes changed`);
  }
}

const graphDigests = {
  participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
  active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
  hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
  rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
};
if (JSON.stringify(graphDigests) !== JSON.stringify(receipt.graph_digests)) fail('participation, claim, or hop payload changed');

const allowedClasses = new Set([
  'compound_reference_encoding_defect',
  'explicit_unresolved_custody',
  'coverage_hash_custody',
  'coverage_locator_only_custody',
  'hash_pinned_custody',
  'locator_only_custody',
  'repository_definition_only'
]);
if (new Set(decisions.map(row => row.receipt_custody_decision_id)).size !== decisions.length) fail('duplicate receipt custody decision ID');
if (new Set(decisions.map(row => row.target_receipt_token)).size !== decisions.length) fail('duplicate receipt custody target');
if (decisions.some(row => !allowedClasses.has(row.custody_classification))) fail('unknown receipt custody classification');
if (decisions.some(row => row.current_custody_action_open !== false)) fail('a receipt custody decision remains open');
if (decisions.some(row => row.consumer_attachment_created !== false)) fail('a receipt attachment was manufactured');
if (decisions.some(row => row.source_claim_or_receipt_mutated !== false)) fail('a decision reports source mutation');
if (decisions.some(row => row.evidence_truth_determined !== false)) fail('a decision claims evidence truth');
if (decisions.some(row => row.review_required_to_decide !== false)) fail('human-permission dependency introduced');
if (decisions.some(row => row.graph_effect !== 'none')) fail('decision graph effect introduced');

const receiptById = new Map(rawReceiptRows.map(row => [row.receipt_id, row]));
for (const decision of decisions.filter(row => row.compound_reference)) {
  if (decision.constituent_receipt_tokens.length < 2) fail(`${decision.receipt_custody_decision_id}: compound decision has fewer than two constituents`);
  for (const token of decision.constituent_receipt_tokens) {
    if (receiptById.get(token)?.defined !== true) fail(`${decision.receipt_custody_decision_id}: undefined compound constituent ${token}`);
  }
  if (!decision.source_normalization_required) fail(`${decision.receipt_custody_decision_id}: compound normalization not required`);
}

const rawTargets = unusedGaps.map(row => row.receipt_id).sort();
const decisionTargets = decisions.map(row => row.target_receipt_token).sort();
if (JSON.stringify(rawTargets) !== JSON.stringify(decisionTargets)) fail('decision targets do not exactly cover raw unused gaps');

const fileByPath = new Map(files.map(file => [file.path, file]));
for (const relative of [
  'data/project/lake-receipt-custody-wave-20-policy.json',
  policy.paths.registry,
  policy.paths.receipt
]) {
  const row = fileByPath.get(relative);
  if (!row) { fail(`${relative}: source row missing`); continue; }
  if (row.generated) fail(`${relative}: source row marked generated`);
  if (!row.authoritative_reachable) fail(`${relative}: source row not authoritative reachable`);
}
for (const relative of [policy.paths.projection, policy.paths.reconciliation]) {
  const row = fileByPath.get(relative);
  if (!row) { fail(`${relative}: generated row missing`); continue; }
  if (!row.generated) fail(`${relative}: generated row marked source`);
  if (!row.authoritative_reachable) fail(`${relative}: generated row not authoritative reachable`);
}

const objectByCompound = new Map(objects.map(object => [`${object.id_key}:${object.id_value}`, object]));
for (const decision of decisions) {
  const object = objectByCompound.get(`receipt_custody_decision_id:${decision.receipt_custody_decision_id}`);
  if (!object) { fail(`${decision.receipt_custody_decision_id}: lake object missing`); continue; }
  const source = (object.occurrences ?? []).some(occurrence =>
    occurrence.generated !== true && occurrence.path === policy.paths.registry
  );
  const generated = (object.occurrences ?? []).some(occurrence =>
    projectionOccurrence(occurrence) && occurrence.path === policy.paths.projection
  );
  if (!source) fail(`${decision.receipt_custody_decision_id}: source occurrence missing`);
  if (!generated) fail(`${decision.receipt_custody_decision_id}: projection occurrence missing`);
  if (object.receipt_custody_adjudicated !== true) fail(`${decision.receipt_custody_decision_id}: adjudication overlay missing`);
  if (object.receipt_custody_action_open !== false) fail(`${decision.receipt_custody_decision_id}: action-open overlay drift`);
}

const c = summary.counts;
if (c.receipt_custody_unused_definitions_raw !== decisions.length) fail('summary raw receipt-custody count drift');
if (c.receipt_custody_decisions !== decisions.length) fail('summary receipt-custody decision count drift');
if (c.receipt_custody_unused_definitions_unadjudicated !== 0) fail('summary receipt-custody unadjudicated count is not zero');
if (c.undefined_receipt_references !== 0) fail('undefined receipt references were introduced');
if (receiptSemantics.custody_adjudication?.unadjudicated_definitions !== 0) fail('receipt semantics unadjudicated count is not zero');
if (receipt.counts.decision_ids_source_observed !== decisions.length) fail('source observation count drift');
if (receipt.counts.decision_ids_projection_observed !== decisions.length) fail('projection observation count drift');
if (receipt.counts.decision_ids_index_observed !== decisions.length) fail('index observation count drift');
if (receipt.counts.decisions_requiring_human_permission !== 0) fail('receipt human-permission count drift');
if (receipt.counts.relationship_delta !== 0 || receipt.counts.participation_delta !== 0 || receipt.counts.active_claim_delta !== 0 || receipt.counts.graph_edge_delta !== 0) fail('relationship, participation, claim, or graph delta introduced');

if (fs.existsSync('.github/tmp/lake-receipt-custody-wave-20-trigger.json')) fail('temporary Wave 20 trigger remains');
if (fs.existsSync('.github/tmp/lake-generator-contracts-wave-19-trigger.json')) fail('inherited Wave 19 trigger remains');
const packageJson = readJson('package.json');
if (!packageJson.scripts.check.includes('validate:lake-receipt-custody-wave-20')) fail('Wave 20 is missing from canonical release gate');
if (!packageJson.scripts['validate:lake-receipt-custody-wave-20']) fail('Wave 20 validation script is missing');

for (const key of [
  'receipt_definition_proves_source_truth',
  'receipt_locator_proves_byte_capture',
  'content_hash_proves_claim_truth',
  'adjudication_attaches_receipt_to_claim',
  'source_bytes_invented',
  'publication_cleared',
  'relationship_created',
  'participation_created',
  'active_claim_created'
]) {
  if (receipt.boundaries[key] !== false) fail(`boundary drift: ${key}`);
}
if (receipt.boundaries.graph_effect !== 'none') fail('receipt graph boundary drift');

if (failures) {
  console.error(`validate-lake-receipt-custody-wave-20: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`validate-lake-receipt-custody-wave-20: OK (${decisions.length} raw definitions adjudicated, ${receipt.counts.compound_reference_encoding_defects} compound defects, 0 unadjudicated, graph effect none)`);
