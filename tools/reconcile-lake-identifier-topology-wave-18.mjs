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
function increment(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }
function asObject(map) { return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b))); }

const policy = readJson('data/project/lake-identifier-topology-wave-18-policy.json');
const registry = readJson(policy.paths.registry);
const projection = readJson(policy.paths.projection);
const liveIndex = readJson('build/lake-index.json');
const liveObjectIndex = readJson('build/lake-object-index.json');
const summary = liveIndex.summary;
const files = liveIndex.files ?? [];
const objects = liveObjectIndex.objects ?? [];
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(registry.schema_version, 'lake-identifier-topology-registry-wave-18@1');
assert.equal(projection.schema_version, 'lake-identifier-topology-wave-18@1');
assert.equal(liveIndex.schema_version, 'lake-index@1');
assert.equal(liveObjectIndex.schema_version, 'lake-object-index@1');
assert.equal(registry.records.length, registry.counts.records);
assert.equal(registry.records.length, projection.topology_decisions.length);
assert.equal(registry.records.length, projection.counts.records);

const currentGraphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
assert.deepEqual(currentGraphDigests, registry.graph_digests, 'Wave 18 changed participation, active claims, or hop controls');
assert.deepEqual(currentGraphDigests, projection.graph_digests, 'Wave 18 projection graph digest drift');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [
  'data/project/lake-identifier-topology-wave-18-policy.json',
  policy.paths.registry,
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
  assert.ok(row, `${relative}: generated row missing`);
  assert.equal(row.generated, true, `${relative}: generated row marked source`);
  assert.equal(row.authoritative_reachable, true, `${relative}: generated row not authoritative reachable`);
}

const objectByCompound = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let targetRowsObserved = 0;
let decisionRowsObserved = 0;
const sourceOnlyCounts = new Map();
const divergenceCounts = new Map();
const observations = [];
for (const record of registry.records) {
  const target = objectByCompound.get(`${record.id_key}:${record.id_value}`);
  assert.ok(target, `${record.id_key}:${record.id_value}: final target object missing`);
  assert.equal(target.indexed, true, `${record.id_key}:${record.id_value}: target remains unindexed`);
  assert.equal(target.topology_adjudicated, true, `${record.id_key}:${record.id_value}: topology overlay missing`);
  assert.equal(target.topology_decision_id, record.topology_decision_id, `${record.id_key}:${record.id_value}: topology decision mismatch`);
  assert.ok(target.occurrences.some(item => item.path === policy.paths.registry && item.generated === false && item.index_file === true), `${record.id_key}:${record.id_value}: registry index occurrence missing`);
  if (record.source_only) {
    assert.equal(target.source_without_projection_unadjudicated, false, `${record.id_key}:${record.id_value}: source-only state remains unadjudicated`);
    increment(sourceOnlyCounts, record.source_only.final_classification);
  }
  if (record.divergence) {
    assert.equal(target.divergent_projections_unadjudicated, false, `${record.id_key}:${record.id_value}: divergence remains unadjudicated`);
    increment(divergenceCounts, record.divergence.final_classification);
  }
  targetRowsObserved += 1;

  const decision = objectByCompound.get(`topology_decision_id:${record.topology_decision_id}`);
  assert.ok(decision, `${record.topology_decision_id}: decision object missing`);
  assert.equal(decision.indexed, true, `${record.topology_decision_id}: decision object unindexed`);
  assert.equal(decision.source_occurrence, true, `${record.topology_decision_id}: decision source occurrence missing`);
  assert.equal(decision.projection_occurrence, true, `${record.topology_decision_id}: decision projection occurrence missing`);
  decisionRowsObserved += 1;

  if (observations.length < 240) observations.push({
    topology_decision_id: record.topology_decision_id,
    id_key: record.id_key,
    id_value: record.id_value,
    baseline_states: record.baseline_states,
    final_indexed: target.indexed,
    source_only_classification: record.source_only?.final_classification ?? null,
    divergence_classification: record.divergence?.final_classification ?? null,
    generator_contract_action_open: record.divergence?.generator_contract_action_open ?? false,
    graph_effect: 'none'
  });
}
assert.equal(targetRowsObserved, registry.records.length);
assert.equal(decisionRowsObserved, registry.records.length);

const afterCounts = {
  tracked_files_indexed: summary.counts.tracked_files_indexed,
  evidence_bearing_files: summary.counts.evidence_bearing_files,
  distinct_machine_ids: summary.counts.distinct_machine_ids,
  unindexed_machine_ids: summary.counts.unindexed_machine_ids,
  unindexed_machine_ids_unadjudicated: summary.counts.unindexed_machine_ids_unadjudicated,
  source_ids_without_projection: summary.counts.source_ids_without_projection,
  source_ids_without_projection_unadjudicated: summary.counts.source_ids_without_projection_unadjudicated,
  divergent_identifier_projections: summary.counts.divergent_identifier_projections,
  divergent_identifier_projections_unadjudicated: summary.counts.divergent_identifier_projections_unadjudicated,
  projection_ids_without_source: summary.counts.projection_ids_without_source,
  identifier_topology_registry_records: summary.counts.identifier_topology_registry_records,
  identifier_topology_generator_contract_actions: summary.counts.identifier_topology_generator_contract_actions
};
assert.equal(afterCounts.unindexed_machine_ids, 0, 'Wave 18 left machine identifiers unindexed');
assert.equal(afterCounts.unindexed_machine_ids_unadjudicated, 0, 'Wave 18 left unindexed topology undecided');
assert.equal(afterCounts.source_ids_without_projection_unadjudicated, 0, 'Wave 18 left source-only topology undecided');
assert.equal(afterCounts.divergent_identifier_projections_unadjudicated, 0, 'Wave 18 left divergence topology undecided');
assert.equal(afterCounts.projection_ids_without_source, 0, 'Wave 18 reopened projection-without-source debt');
assert.equal(afterCounts.identifier_topology_registry_records, registry.records.length, 'Wave 18 topology registry count drift');

const counts = {
  baseline: {
    distinct_machine_ids: policy.baseline.distinct_machine_ids,
    unindexed_machine_ids: policy.baseline.unindexed_machine_ids,
    source_ids_without_projection: policy.baseline.source_ids_without_projection,
    divergent_identifier_projections: policy.baseline.divergent_identifier_projections,
    projection_ids_without_source: policy.baseline.projection_ids_without_source
  },
  after: afterCounts,
  frozen_topology_rows_source_projected_indexed: targetRowsObserved,
  topology_decision_ids_source_projected_indexed: decisionRowsObserved,
  source_only_classifications: asObject(sourceOnlyCounts),
  divergence_classifications: asObject(divergenceCounts),
  decisions_requiring_human_permission: 0,
  relationship_delta: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0
};

const receipt = {
  schema_version: 'lake-identifier-topology-wave-18-receipt@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  registry_sha256: digest(registry),
  graph_digests: currentGraphDigests,
  counts,
  post_execution_reconciliation_complete: true,
  indexing_complete_for_frozen_unindexed_denominator: true,
  source_only_topology_adjudicated_for_frozen_denominator: true,
  divergent_topology_adjudicated_for_frozen_denominator: true,
  correction_mode: policy.decision_law.correction_mode,
  boundaries: policy.boundaries
};
const reconciliation = {
  schema_version: 'lake-identifier-topology-wave-18-reconciliation@1',
  program_id: policy.program_id,
  counts,
  observation_sample: observations,
  completion: {
    all_frozen_topology_rows_source_projected_and_indexed: targetRowsObserved === registry.records.length,
    all_topology_decision_ids_source_projected_and_indexed: decisionRowsObserved === registry.records.length,
    final_unindexed_count: afterCounts.unindexed_machine_ids,
    final_unindexed_unadjudicated_count: afterCounts.unindexed_machine_ids_unadjudicated,
    final_source_only_unadjudicated_count: afterCounts.source_ids_without_projection_unadjudicated,
    final_divergence_unadjudicated_count: afterCounts.divergent_identifier_projections_unadjudicated,
    source_truth_determined: false,
    semantic_completeness_claimed: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.reconciliation, reconciliation);

const report = `# Identifier topology — Wave 18\n\n\`\`\`text\nunindexed machine identifiers:           ${policy.baseline.unindexed_machine_ids} -> ${afterCounts.unindexed_machine_ids}\nsource IDs without projection (raw):      ${policy.baseline.source_ids_without_projection} -> ${afterCounts.source_ids_without_projection}\nsource-only IDs unadjudicated:             ${policy.baseline.source_ids_without_projection} -> ${afterCounts.source_ids_without_projection_unadjudicated}\ndivergent identifier projections (raw):   ${policy.baseline.divergent_identifier_projections} -> ${afterCounts.divergent_identifier_projections}\ndivergent projections unadjudicated:      ${policy.baseline.divergent_identifier_projections} -> ${afterCounts.divergent_identifier_projections_unadjudicated}\nprojection IDs without source:            ${policy.baseline.projection_ids_without_source} -> ${afterCounts.projection_ids_without_source}\nfrozen topology rows observed:            ${targetRowsObserved}/${registry.records.length}\ntopology decision IDs observed:            ${decisionRowsObserved}/${registry.records.length}\ngenerator-contract actions:               ${afterCounts.identifier_topology_generator_contract_actions}\nhuman-permission dependencies:            0\nrelationship/participation/graph:          0/0/0\n\`\`\`\n\nThe frozen topology union is now addressable and adjudicated. Raw source-only and divergent counts remain visible where the correct decision is to preserve a typed source-only state or a typed projection view. This does not establish identity, truth, semantic completeness, publication clearance, or a graph relationship.\n`;
fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
fs.writeFileSync(full(policy.paths.report), report);

console.log('identifier topology Wave 18 reconciled');
console.log(`  unindexed raw/unadjudicated: ${afterCounts.unindexed_machine_ids}/${afterCounts.unindexed_machine_ids_unadjudicated}`);
console.log(`  source-only raw/unadjudicated: ${afterCounts.source_ids_without_projection}/${afterCounts.source_ids_without_projection_unadjudicated}`);
console.log(`  divergence raw/unadjudicated: ${afterCounts.divergent_identifier_projections}/${afterCounts.divergent_identifier_projections_unadjudicated}`);
console.log(`  target/decision rows observed: ${targetRowsObserved}/${decisionRowsObserved}`);
console.log('  review dependencies / graph effects: 0 / 0');
