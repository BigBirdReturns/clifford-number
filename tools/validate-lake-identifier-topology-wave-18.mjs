#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

let failures = 0;
function fail(message) { console.error(`- ${message}`); failures += 1; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

const policy = readJson('data/project/lake-identifier-topology-wave-18-policy.json');
const registry = readJson(policy.paths.registry);
const projection = readJson(policy.paths.projection);
const receipt = readJson(policy.paths.receipt);
const reconciliation = readJson(policy.paths.reconciliation);
const summary = readJson('build/lake-index/summary.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

for (const [artifact, schema] of [
  [policy, 'lake-identifier-topology-wave-18-policy@1'],
  [registry, 'lake-identifier-topology-registry-wave-18@1'],
  [projection, 'lake-identifier-topology-wave-18@1'],
  [receipt, 'lake-identifier-topology-wave-18-receipt@1'],
  [reconciliation, 'lake-identifier-topology-wave-18-reconciliation@1']
]) if (artifact.schema_version !== schema) fail(`schema drift: ${schema}`);

if (!receipt.post_execution_reconciliation_complete) fail('receipt is not complete');
if (registry.records.length !== registry.counts.records) fail('registry record denominator drift');
if (registry.records.length !== projection.topology_decisions.length) fail('projection record denominator drift');
if (registry.records.length !== receipt.counts.frozen_topology_rows_source_projected_indexed) fail('receipt observation denominator drift');
if (new Set(registry.records.map(row => `${row.id_key}:${row.id_value}`)).size !== registry.records.length) fail('duplicate topology target');
if (new Set(registry.records.map(row => row.topology_decision_id)).size !== registry.records.length) fail('duplicate topology decision ID');
if (registry.records.some(row => row.source_only?.final_classification === 'source_only_family_adjudication_required')) fail('generic source-only adjudication remains');
if (registry.records.some(row => row.review_required_to_decide)) fail('human-permission dependency introduced');
if (registry.records.some(row => row.cross_key_join_authorized)) fail('cross-key join authorized');
if (registry.records.some(row => row.graph_effect !== 'none')) fail('graph effect introduced');

const current = {
  unindexed: summary.counts.unindexed_machine_ids,
  unindexed_unadjudicated: summary.counts.unindexed_machine_ids_unadjudicated,
  source_only_raw: summary.counts.source_ids_without_projection,
  source_only_unadjudicated: summary.counts.source_ids_without_projection_unadjudicated,
  divergence_raw: summary.counts.divergent_identifier_projections,
  divergence_unadjudicated: summary.counts.divergent_identifier_projections_unadjudicated,
  projection_without_source: summary.counts.projection_ids_without_source,
  topology_records: summary.counts.identifier_topology_registry_records
};
if (current.unindexed !== 0) fail(`unindexed identifier count is ${current.unindexed}`);
if (current.unindexed_unadjudicated !== 0) fail(`unindexed unadjudicated count is ${current.unindexed_unadjudicated}`);
if (current.source_only_unadjudicated !== 0) fail(`source-only unadjudicated count is ${current.source_only_unadjudicated}`);
if (current.divergence_unadjudicated !== 0) fail(`divergence unadjudicated count is ${current.divergence_unadjudicated}`);
if (current.projection_without_source !== 0) fail(`projection-without-source count is ${current.projection_without_source}`);
if (current.topology_records !== registry.records.length) fail('summary topology record count drift');
if (receipt.counts.after.unindexed_machine_ids !== 0) fail('receipt unindexed count drift');
if (receipt.counts.after.source_ids_without_projection_unadjudicated !== 0) fail('receipt source-only adjudication drift');
if (receipt.counts.after.divergent_identifier_projections_unadjudicated !== 0) fail('receipt divergence adjudication drift');

const graphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
if (JSON.stringify(graphDigests) !== JSON.stringify(receipt.graph_digests)) fail('graph or participation payload changed');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [
  'data/project/lake-identifier-topology-wave-18-policy.json',
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

const objectByCompound = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
for (const record of registry.records) {
  const target = objectByCompound.get(`${record.id_key}:${record.id_value}`);
  if (!target) { fail(`${record.id_key}:${record.id_value}: target object missing`); continue; }
  if (!target.indexed) fail(`${record.id_key}:${record.id_value}: target not indexed`);
  if (!target.topology_adjudicated) fail(`${record.id_key}:${record.id_value}: topology overlay missing`);
  if (target.topology_decision_id !== record.topology_decision_id) fail(`${record.id_key}:${record.id_value}: topology decision mismatch`);
  if (!target.occurrences.some(item => item.path === policy.paths.registry && item.generated === false && item.index_file === true)) fail(`${record.id_key}:${record.id_value}: registry source/index occurrence missing`);
  if (record.source_only && target.source_without_projection_unadjudicated) fail(`${record.id_key}:${record.id_value}: source-only state unadjudicated`);
  if (record.divergence && target.divergent_projections_unadjudicated) fail(`${record.id_key}:${record.id_value}: divergence state unadjudicated`);
  const decision = objectByCompound.get(`topology_decision_id:${record.topology_decision_id}`);
  if (!decision) { fail(`${record.topology_decision_id}: decision object missing`); continue; }
  if (!decision.indexed || !decision.source_occurrence || !decision.projection_occurrence) fail(`${record.topology_decision_id}: decision custody incomplete`);
}

if (!fs.readFileSync('BUILD-INSTRUCTIONS.md', 'utf8').includes('3.18 **Identifier topology')) fail('build instruction contract missing');
if (!fs.readFileSync('README.md', 'utf8').includes('## Identifier topology')) fail('README contract missing');
if (fs.existsSync('.github/tmp/lake-identifier-topology-wave-18-trigger.json')) fail('temporary Wave 18 trigger remains');
if (receipt.boundaries.identifier_indexing_proves_identity !== false) fail('identity boundary drift');
if (receipt.boundaries.source_projection_proves_truth !== false) fail('truth boundary drift');
if (receipt.boundaries.cross_key_join_authorized !== false) fail('cross-key boundary drift');
if (receipt.boundaries.graph_effect !== 'none') fail('graph boundary drift');

if (failures) {
  console.error(`validate-lake-identifier-topology-wave-18: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`validate-lake-identifier-topology-wave-18: OK (${registry.records.length} topology rows, raw source-only/divergence ${current.source_only_raw}/${current.divergence_raw}, unadjudicated 0/0, graph effect none)`);
