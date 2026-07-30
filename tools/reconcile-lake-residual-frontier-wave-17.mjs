#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) { return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function writeJson(relative, value) { fs.mkdirSync(path.dirname(full(relative)), { recursive: true }); fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }

const policy = readJson('data/project/lake-residual-frontier-wave-17-policy.json');
const preflight = readJson(policy.paths.preflight);
const pathRegistry = readJson(policy.paths.path_registry);
const projectionRegistry = readJson(policy.paths.projection_registry);
const projection = readJson(policy.paths.projection);
const liveLake = fs.existsSync(full('build/lake-index.json')) ? readJson('build/lake-index.json') : null;
const liveObjects = fs.existsSync(full('build/lake-object-index.json')) ? readJson('build/lake-object-index.json') : null;
const summary = liveLake?.summary ?? readJson('build/lake-index/summary.json');
const files = liveLake?.files ?? readJsonl('build/lake-index/files.jsonl');
const objects = liveObjects?.objects ?? readJsonl('build/lake-index/objects.jsonl');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(pathRegistry.schema_version, 'lake-residual-path-registry-wave-17@1');
assert.equal(projectionRegistry.schema_version, 'lake-projection-lineage-registry-wave-17@1');
assert.equal(projection.schema_version, 'lake-residual-frontier-wave-17@1');
assert.equal(pathRegistry.decisions.length, 601);
assert.equal(projectionRegistry.records.length, 2000);
assert.equal(pathRegistry.counts.typed_refusals, 0);

const currentGraphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
assert.deepEqual(currentGraphDigests, projection.graph_digests, 'Wave 17 changed participation, active claims, or hop controls');

const fileByPath = new Map(files.map(row => [row.path, row]));
const evidenceFiles = files.filter(row => row.evidence_bearing);
const afterCounts = {
  tracked_files_indexed: summary.counts.tracked_files_indexed,
  evidence_bearing_files: summary.counts.evidence_bearing_files,
  evidence_paths_without_program_owner: evidenceFiles.filter(row => row.ownership_state === 'no_program_owner_detected').length,
  exact_orphan_evidence_files: evidenceFiles.filter(row => row.exact_orphan).length,
  evidence_paths_not_index_reachable: evidenceFiles.filter(row => !row.index_reachable).length,
  projection_ids_without_source: objects.filter(row => row.projection_without_source).length
};
assert.equal(afterCounts.evidence_paths_without_program_owner, 0, 'Wave 17 left evidence paths without an owner');
assert.equal(afterCounts.exact_orphan_evidence_files, 0, 'Wave 17 left exact orphan evidence paths');
assert.equal(afterCounts.evidence_paths_not_index_reachable, 0, 'Wave 17 left evidence paths outside every index route');
assert.equal(afterCounts.projection_ids_without_source, 0, 'Wave 17 left projection identifiers without repository provenance');

let pathRowsObserved = 0;
const pathObservations = [];
for (const decision of pathRegistry.decisions) {
  const row = fileByPath.get(decision.path);
  assert.ok(row, `${decision.path}: final lake row missing`);
  assert.notEqual(row.ownership_state, 'no_program_owner_detected', `${decision.path}: owner not observed`);
  assert.equal(row.index_reachable, true, `${decision.path}: not index reachable`);
  assert.equal(row.exact_orphan, false, `${decision.path}: remains exact orphan`);
  assert.ok(row.incoming_refs.includes(policy.paths.path_registry), `${decision.path}: Wave 17 registry inbound reference missing`);
  pathRowsObserved += 1;
  if (pathObservations.length < 120) pathObservations.push({
    path: decision.path,
    owner_program: decision.owner_program,
    owner_scope: decision.owner_scope,
    baseline_residual_types: decision.baseline_residual_types,
    final_ownership_state: row.ownership_state,
    final_index_reachable: row.index_reachable,
    final_exact_orphan: row.exact_orphan
  });
}
assert.equal(pathRowsObserved, 601);

const objectByCompound = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let projectionRowsObserved = 0;
const projectionClassCounts = {};
const projectionObservations = [];
for (const record of projectionRegistry.records) {
  const object = objectByCompound.get(`${record.id_key}:${record.id_value}`);
  assert.ok(object, `${record.lineage_key}: final lake object missing`);
  assert.equal(object.source_occurrence, true, `${record.lineage_key}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${record.lineage_key}: projection occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.paths.projection_registry && item.generated === false), `${record.lineage_key}: lineage registry occurrence missing`);
  projectionRowsObserved += 1;
  projectionClassCounts[record.classification] = (projectionClassCounts[record.classification] ?? 0) + 1;
  if (projectionObservations.length < 160) projectionObservations.push({
    lineage_key: record.lineage_key,
    classification: record.classification,
    source_basis: record.source_basis,
    cross_key_source_occurrences: record.cross_key_source_occurrences.length,
    final_occurrence_count: object.occurrence_count,
    final_source_occurrence: object.source_occurrence,
    final_projection_occurrence: object.projection_occurrence
  });
}
assert.equal(projectionRowsObserved, 2000);

for (const relative of [
  'data/project/lake-residual-frontier-wave-17-policy.json',
  policy.paths.path_registry,
  policy.paths.projection_registry,
  policy.paths.receipt
]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: final lake source row missing`);
  assert.equal(row.generated, false, `${relative}: source row marked generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: source row not authoritative reachable`);
}
for (const relative of [policy.paths.projection, policy.paths.reconciliation]) {
  const row = fileByPath.get(relative);
  if (relative === policy.paths.reconciliation && !row) continue;
  assert.equal(row.generated, true, `${relative}: generated row marked source`);
  assert.equal(row.authoritative_reachable, true, `${relative}: generated row not authoritative reachable`);
}

const counts = {
  baseline: {
    evidence_paths_without_program_owner: policy.baseline.evidence_paths_without_program_owner,
    exact_orphan_evidence_files: policy.baseline.exact_orphan_evidence_files,
    evidence_paths_not_index_reachable: policy.baseline.evidence_paths_not_index_reachable,
    projection_ids_without_source: policy.baseline.projection_ids_without_source
  },
  after: afterCounts,
  path_rows_source_projected_indexed: pathRowsObserved,
  projection_lineage_rows_source_projected_indexed: projectionRowsObserved,
  path_typed_refusals: pathRegistry.counts.typed_refusals,
  projection_classification_counts: Object.fromEntries(Object.entries(projectionClassCounts).sort(([a], [b]) => a.localeCompare(b))),
  decisions_requiring_human_permission: 0,
  relationship_delta: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0
};
const receipt = {
  schema_version: 'lake-residual-frontier-wave-17-receipt@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  graph_digests: currentGraphDigests,
  counts,
  post_execution_reconciliation_complete: true,
  path_ownership_and_index_repair_complete_for_frozen_denominator: true,
  projection_lineage_complete_for_frozen_denominator: true,
  correction_mode: policy.decision_law.correction_mode,
  boundaries: policy.boundaries
};
const reconciliation = {
  schema_version: 'lake-residual-frontier-wave-17-reconciliation@1',
  program_id: policy.program_id,
  counts,
  path_observation_sample: pathObservations,
  projection_observation_sample: projectionObservations,
  completion: {
    all_601_frozen_path_rows_owned_and_index_reachable: pathRowsObserved === 601,
    all_2000_frozen_projection_rows_have_source_and_projection_occurrences: projectionRowsObserved === 2000,
    final_owner_gap_count: afterCounts.evidence_paths_without_program_owner,
    final_exact_orphan_count: afterCounts.exact_orphan_evidence_files,
    final_not_index_reachable_count: afterCounts.evidence_paths_not_index_reachable,
    final_projection_without_source_count: afterCounts.projection_ids_without_source,
    source_truth_determined: false,
    semantic_completeness_claimed: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.reconciliation, reconciliation);

const report = `# Residual lake frontier — Wave 17\n\n\`\`\`text\nownership gaps:                 ${policy.baseline.evidence_paths_without_program_owner} -> ${afterCounts.evidence_paths_without_program_owner}\nexact orphan evidence paths:     ${policy.baseline.exact_orphan_evidence_files} -> ${afterCounts.exact_orphan_evidence_files}\nnot index-reachable evidence:    ${policy.baseline.evidence_paths_not_index_reachable} -> ${afterCounts.evidence_paths_not_index_reachable}\nprojection IDs without source:   ${policy.baseline.projection_ids_without_source} -> ${afterCounts.projection_ids_without_source}\npath rows observed:              ${pathRowsObserved}/601\nprojection lineage rows observed:${projectionRowsObserved}/2000\npath typed refusals:             ${pathRegistry.counts.typed_refusals}\nhuman-permission dependencies:   0\nrelationship/participation/graph:0/0/0\n\`\`\`\n\nThe frozen residual denominator is now repository-addressable. This does not mean the lake is semantically complete, historically complete, externally source-complete, true, publication-cleared, or evidence of common purpose.\n`;
fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
fs.writeFileSync(full(policy.paths.report), report);

console.log('residual lake frontier Wave 17 reconciled');
console.log(`  owner/orphan/not-index/projection gaps: ${afterCounts.evidence_paths_without_program_owner}/${afterCounts.exact_orphan_evidence_files}/${afterCounts.evidence_paths_not_index_reachable}/${afterCounts.projection_ids_without_source}`);
console.log(`  path/projection rows observed: ${pathRowsObserved}/${projectionRowsObserved}`);
console.log('  review dependencies / graph effects: 0 / 0');
