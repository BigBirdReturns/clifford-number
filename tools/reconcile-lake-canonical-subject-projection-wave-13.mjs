#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson } from './lib/ledger.mjs';
import { loadLocalCanonicalResolutionIndex } from './lib/local-canonical-resolution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-subject-projection-wave-13-policy.json';
const full = relative => path.join(root, relative);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}
function inputManifest(paths) {
  return [...new Set(paths)].sort().map(relative => {
    const bytes = fs.readFileSync(full(relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
  });
}
function fingerprint(rows) {
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''));
}

const policy = readJson(policyPath);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const resolutionIndex = loadLocalCanonicalResolutionIndex({ refresh: true });
const resolutionEntries = [...resolutionIndex.current_by_case_and_local.values()]
  .sort((left, right) => `${left.row.source_case_id}\0${left.row.local_subject_id}`.localeCompare(`${right.row.source_case_id}\0${right.row.local_subject_id}`));
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const briefingIndex = readJson('build/briefings/index.json');
const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');

assert.equal(projection.counts.resolution_rows, resolutionEntries.length);
assert.equal(plan.counts.resolution_rows, resolutionEntries.length);
assert.equal(stableDigest(participation), projection.graph_digests.participation_sha256, 'Wave 13 participation payload changed');
assert.equal(stableDigest(activeIdentity.claims), projection.graph_digests.active_claims_sha256, 'Wave 13 active claim payload changed');
assert.equal(stableDigest(hopGraph.edges), projection.graph_digests.hop_edges_sha256, 'Wave 13 hop edge payload changed');
assert.equal(stableDigest(hopGraph.rejected_hop_surfaces), projection.graph_digests.rejected_hop_surfaces_sha256, 'Wave 13 rejected surface payload changed');
assert.equal(stableDigest(hopGraph.rejected_hop_pairs), projection.graph_digests.rejected_hop_pairs_sha256, 'Wave 13 rejected pair payload changed');
for (const row of projection.source_claim_manifest) {
  const bytes = fs.readFileSync(full(row.path));
  assert.equal(bytes.length, row.bytes, `${row.path}: source claim byte length changed`);
  assert.equal(sha256(bytes), row.sha256, `${row.path}: source claim bytes changed`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
const policyFile = fileByPath.get(policyPath);
assert.ok(policyFile, 'Wave 13 policy missing from lake file index');
assert.equal(policyFile.generated, false, 'Wave 13 policy marked generated');
for (const relative of [policy.projection_path, policy.plan_path, policy.report_path]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: generated Wave 13 file missing from lake index`);
  assert.equal(row.generated, true, `${relative}: expected generated projection`);
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
const observations = [];
let sourceObserved = 0;
let caseObserved = 0;
let catalogObserved = 0;
let surfaceSearchObserved = 0;
let briefingObserved = 0;
let projectionObserved = 0;
for (const entry of resolutionEntries) {
  const row = entry.row;
  const object = objectByKey.get(`resolution_id:${row.resolution_id}`);
  assert.ok(object, `${row.resolution_id}: lake object missing`);
  assert.equal(object.indexed, true, `${row.resolution_id}: lake object not indexed`);
  assert.equal(object.source_occurrence, true, `${row.resolution_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.resolution_id}: projection occurrence missing`);
  const sourcePaths = object.occurrences.filter(item => item.path === entry.source_path && item.generated === false).map(item => item.path);
  const casePaths = object.occurrences.filter(item => item.generated === true && item.path === `build/cases/${row.source_case_id}.json`).map(item => item.path);
  const catalogPaths = object.occurrences.filter(item => item.generated === true && item.path === 'build/public-catalog.json').map(item => item.path);
  const surfacePaths = object.occurrences.filter(item => item.generated === true && item.path === 'build/surface-graph.json').map(item => item.path);
  const briefingPaths = object.occurrences.filter(item => item.generated === true && item.path.startsWith('build/briefings/')).map(item => item.path);
  const projectionPaths = object.occurrences.filter(item => item.generated === true && item.path === policy.projection_path).map(item => item.path);
  assert.ok(sourcePaths.length > 0, `${row.resolution_id}: source registry occurrence absent`);
  assert.ok(casePaths.length > 0, `${row.resolution_id}: compiled case occurrence absent`);
  assert.ok(catalogPaths.length > 0, `${row.resolution_id}: public catalog occurrence absent`);
  assert.ok(surfacePaths.length > 0, `${row.resolution_id}: surface search occurrence absent`);
  assert.ok(projectionPaths.length > 0, `${row.resolution_id}: Wave 13 projection occurrence absent`);
  sourceObserved += 1;
  caseObserved += 1;
  catalogObserved += 1;
  surfaceSearchObserved += 1;
  if (briefingPaths.length) briefingObserved += 1;
  projectionObserved += 1;
  observations.push({
    resolution_id: row.resolution_id,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    canonical_id: row.canonical_id,
    source_registry_occurrence: sourcePaths[0],
    compiled_case_occurrence: casePaths[0],
    public_catalog_occurrence: catalogPaths[0],
    surface_search_occurrence: surfacePaths[0],
    briefing_occurrences: [...new Set(briefingPaths)].sort(),
    wave13_projection_occurrence: projectionPaths[0],
    indexed: true,
    graph_effect: 'none'
  });
}

const forbiddenTokens = resolutionEntries.map(entry => entry.row.resolution_id);
const hopGraphText = JSON.stringify(hopGraph);
assert.ok(forbiddenTokens.every(token => !hopGraphText.includes(token)), 'Wave 13 resolution token leaked into hop graph');

const manifestPaths = [
  policyPath,
  policy.projection_path,
  policy.plan_path,
  'build/cases/index.json',
  'build/public-catalog.json',
  'build/briefings/index.json',
  'build/surface-graph.json',
  'build/hop-graph.json',
  'build/axm-identity.json',
  'data/ledger/participation.jsonl',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json',
  ...resolutionIndex.registry_paths,
  ...projection.source_claim_manifest.map(row => row.path)
];
const manifest = inputManifest(manifestPaths);
const sourceFingerprint = fingerprint(manifest);
const reconciliation = {
  schema_version: 'canonical-subject-projection-wave-13-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts: {
    resolution_rows: resolutionEntries.length,
    resolution_ids_source_observed: sourceObserved,
    resolution_ids_compiled_case_observed: caseObserved,
    resolution_ids_public_catalog_observed: catalogObserved,
    resolution_ids_surface_search_observed: surfaceSearchObserved,
    resolution_ids_briefing_observed: briefingObserved,
    resolution_ids_wave13_projection_observed: projectionObserved,
    case_claim_subject_references: projection.counts.case_claim_subject_references,
    resolved_case_claim_subject_references: projection.counts.resolved_case_claim_subject_references,
    unresolved_case_claim_subject_references: projection.counts.unresolved_case_claim_subject_references,
    public_catalog_subjects: publicCatalog.counts.subjects,
    reporter_briefings: briefingIndex.counts.briefings,
    local_subject_search_aliases: projection.counts.local_subject_search_aliases,
    ambiguous_local_subject_search_keys: projection.counts.ambiguous_local_subject_search_keys,
    source_subject_id_changes: projection.counts.source_subject_id_changes,
    source_claim_text_changes: projection.counts.source_claim_text_changes,
    participation_delta: 0,
    active_claim_delta: 0,
    graph_edge_delta: 0,
    accepted_cross_case_identity_bridges: 0,
    global_machine_ids: summary.counts.distinct_machine_ids,
    unindexed_machine_ids: summary.counts.unindexed_machine_ids,
    exact_orphan_evidence_files: summary.counts.exact_orphan_evidence_files,
    decisions_requiring_human_permission: 0
  },
  observations,
  decisions: [
    {
      decision_key: 'W13-RECONCILE-DUAL-KEY-PROJECTION',
      judgment: 'accepted_case_scoped_subject_resolutions_are_visible_as_local_and_canonical_keys_without_source_rewrite',
      action: 'retain_local_subject_ids_canonical_metadata_resolution_provenance_and_unresolved_subject_counts_together',
      evidence_count: projection.counts.case_claim_subject_references,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W13-RECONCILE-SEARCH-BOUNDARY',
      judgment: 'only_globally_unambiguous_local_subject_keys_may_be_projected_as_search_aliases',
      action: 'retain_ambiguous_keys_as_explicit_refusals_without_alias_or_join_effect',
      evidence_count: resolutionEntries.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W13-RECONCILE-GRAPH-GATE',
      judgment: 'projection_metadata_does_not_create_relationship_participation_graph_or_hop_authority',
      action: 'keep_all_cross_case_graph_and_hop_authorizations_false',
      evidence_count: hopGraph.edges.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    every_resolution_id_source_and_index_observed: sourceObserved === resolutionEntries.length,
    every_resolution_id_compiled_case_and_index_observed: caseObserved === resolutionEntries.length,
    every_resolution_id_public_catalog_and_index_observed: catalogObserved === resolutionEntries.length,
    every_resolution_id_surface_search_and_index_observed: surfaceSearchObserved === resolutionEntries.length,
    every_resolution_id_wave13_projection_and_index_observed: projectionObserved === resolutionEntries.length,
    briefing_subjects_projected_for_selected_claims: true,
    unresolved_subjects_visible: projection.counts.unresolved_case_claim_subject_references > 0,
    source_subject_ids_preserved: projection.counts.source_subject_id_changes === 0,
    source_claim_text_preserved: projection.counts.source_claim_text_changes === 0,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.reconciliation_path, reconciliation);
const report = `# Canonical subject projection Wave 13 reconciliation

Source fingerprint: \`${sourceFingerprint}\`

## Result

\`\`\`text
resolution IDs source observed:         ${sourceObserved}/${resolutionEntries.length}
resolution IDs in compiled cases:       ${caseObserved}/${resolutionEntries.length}
resolution IDs in public catalog:       ${catalogObserved}/${resolutionEntries.length}
resolution IDs in search projection:    ${surfaceSearchObserved}/${resolutionEntries.length}
resolution IDs in briefing manifests:   ${briefingObserved}/${resolutionEntries.length}
resolution IDs in Wave 13 projection:   ${projectionObserved}/${resolutionEntries.length}
resolved case subject references:       ${projection.counts.resolved_case_claim_subject_references}
unresolved case subject references:     ${projection.counts.unresolved_case_claim_subject_references}
source subject-ID changes:              ${projection.counts.source_subject_id_changes}
source claim-text changes:              ${projection.counts.source_claim_text_changes}
participation / active-claim / hop delta:0 / 0 / 0
accepted cross-case identity bridges:   0
human-permission dependencies:          0
\`\`\`

Every current resolution is source-custodied, indexed, present in its compiled case, present in the public catalog, and usable through the search projection. Reporter-briefing observations are counted only when the briefing actually selects a claim with that subject. No missing briefing selection is rewritten as a defect or a relationship.
`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);
console.log('canonical subject projection Wave 13 reconciled');
console.log(`  source / case / catalog / search observations: ${sourceObserved} / ${caseObserved} / ${catalogObserved} / ${surfaceSearchObserved}`);
console.log(`  briefing-selected resolutions: ${briefingObserved}/${resolutionEntries.length}`);
console.log('  source mutation, relationship, participation, graph, and hop effects: 0');
