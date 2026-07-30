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

const policy = readJson('data/project/lake-residual-frontier-wave-17-policy.json');
const pathRegistry = readJson(policy.paths.path_registry);
const projectionRegistry = readJson(policy.paths.projection_registry);
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
  [policy, 'lake-residual-frontier-wave-17-policy@1'],
  [pathRegistry, 'lake-residual-path-registry-wave-17@1'],
  [projectionRegistry, 'lake-projection-lineage-registry-wave-17@1'],
  [projection, 'lake-residual-frontier-wave-17@1'],
  [receipt, 'lake-residual-frontier-wave-17-receipt@1'],
  [reconciliation, 'lake-residual-frontier-wave-17-reconciliation@1']
]) if (artifact.schema_version !== schema) fail(`schema drift: ${schema}`);

if (pathRegistry.decisions.length !== 601) fail('path decision denominator drift');
if (pathRegistry.counts.typed_refusals !== 0) fail('path typed refusal unexpectedly remains');
if (projectionRegistry.records.length !== 2000) fail('projection lineage denominator drift');
if (new Set(pathRegistry.decisions.map(row => row.path)).size !== 601) fail('duplicate path decision');
if (new Set(projectionRegistry.records.map(row => row.lineage_key)).size !== 2000) fail('duplicate projection lineage key');
if (!receipt.post_execution_reconciliation_complete) fail('receipt is not complete');
if (!reconciliation.completion.all_601_frozen_path_rows_owned_and_index_reachable) fail('path reconciliation incomplete');
if (!reconciliation.completion.all_2000_frozen_projection_rows_have_source_and_projection_occurrences) fail('projection reconciliation incomplete');

const evidence = files.filter(row => row.evidence_bearing);
const current = {
  owner: evidence.filter(row => row.ownership_state === 'no_program_owner_detected').length,
  orphan: evidence.filter(row => row.exact_orphan).length,
  not_index: evidence.filter(row => !row.index_reachable).length,
  projection_without_source: objects.filter(row => row.projection_without_source).length
};
for (const [field, value] of Object.entries(current)) if (value !== 0) fail(`${field} residual count is ${value}`);
if (summary.counts.no_program_owner_detected !== 0) fail('summary owner gap drift');
if (summary.counts.exact_orphan_evidence_files !== 0) fail('summary orphan gap drift');
if (summary.counts.projection_ids_without_source !== 0) fail('summary projection gap drift');

const graphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
if (JSON.stringify(graphDigests) !== JSON.stringify(receipt.graph_digests)) fail('graph or participation payload changed');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const decision of pathRegistry.decisions) {
  const row = fileByPath.get(decision.path);
  if (!row) { fail(`${decision.path}: missing final file row`); continue; }
  if (!row.incoming_refs.includes(policy.paths.path_registry)) fail(`${decision.path}: registry inbound link missing`);
  if (!row.index_reachable || row.exact_orphan || row.ownership_state === 'no_program_owner_detected') fail(`${decision.path}: residual state not closed`);
}
const objectByCompound = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
for (const record of projectionRegistry.records) {
  const row = objectByCompound.get(`${record.id_key}:${record.id_value}`);
  if (!row) { fail(`${record.lineage_key}: final object missing`); continue; }
  if (!row.source_occurrence || !row.projection_occurrence) fail(`${record.lineage_key}: source/projection dual occurrence missing`);
  if (!row.occurrences.some(item => item.path === policy.paths.projection_registry && item.generated === false)) fail(`${record.lineage_key}: registry source occurrence missing`);
}

if (!fs.readFileSync('BUILD-INSTRUCTIONS.md', 'utf8').includes('3.17 **Residual lake frontier')) fail('build instruction contract missing');
if (!fs.readFileSync('README.md', 'utf8').includes('## Residual lake frontier')) fail('README contract missing');
if (fs.existsSync('.github/tmp/lake-residual-frontier-wave-17-trigger.json')) fail('temporary Wave 17 trigger remains');
if (receipt.boundaries.source_truth_determined !== false) fail('source truth boundary drift');
if (receipt.boundaries.publication_cleared !== false) fail('publication boundary drift');
if (receipt.boundaries.graph_effect !== 'none') fail('graph boundary drift');

if (failures) {
  console.error(`validate-lake-residual-frontier-wave-17: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`validate-lake-residual-frontier-wave-17: OK (601 paths, 2000 projection identifiers, residual counts 0/0/0/0, graph effect none)`);
