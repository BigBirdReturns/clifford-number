#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson } from './lib/ledger.mjs';
import { loadLocalCanonicalResolutionIndex } from './lib/local-canonical-resolution.mjs';
import { loadSubjectObjectResolutionIndex } from './lib/subject-object-resolution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-subject-integration-wave-16-policy.json';

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
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function lakeRows() {
  if (fs.existsSync(full('build/lake-index.json'))) {
    return {
      files: readJson('build/lake-index.json').files,
      objects: readJson('build/lake-object-index.json').objects
    };
  }
  return {
    files: readJsonl('build/lake-index/files.jsonl'),
    objects: readJsonl('build/lake-index/objects.jsonl')
  };
}

const policy = readJson(policyPath);
const projection = readJson(policy.paths.projection);
const plan = readJson(policy.paths.plan);
const localResolutionIndex = loadLocalCanonicalResolutionIndex({ refresh: true });
const subjectObjectIndex = loadSubjectObjectResolutionIndex({ refresh: true });
const extensionRows = readJsonl(policy.paths.identity_extension_registry);
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const surfaceGraph = readJson('build/surface-graph.json');
const wave13Projection = readJson('build/canonical-subject-projection-wave-13.json');
const activeIdentity = readJson('build/axm-identity.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const hopGraph = readJson('build/hop-graph.json');
const { files, objects } = lakeRows();

assert.equal(policy.schema_version, 'lake-subject-integration-wave-16-policy@1');
assert.equal(projection.schema_version, 'lake-subject-integration-wave-16@1');
assert.equal(plan.schema_version, 'lake-subject-integration-wave-16-plan@1');
assert.equal(projection.counts.identity_decisions, policy.expected.identity_decisions);
assert.equal(projection.counts.subject_object_rows, policy.expected.subject_object_rows);
assert.equal(projection.counts.generic_unresolved_claim_references, 0);
assert.equal(stableDigest(participation), projection.graph_digests.participation_sha256, 'Wave 16 changed participation');
assert.equal(stableDigest(activeIdentity.claims), projection.graph_digests.active_claims_sha256, 'Wave 16 changed active claims');
assert.equal(stableDigest(hopGraph.edges), projection.graph_digests.hop_edges_sha256, 'Wave 16 changed hop edges');
assert.equal(stableDigest(hopGraph.rejected_hop_surfaces), projection.graph_digests.rejected_hop_surfaces_sha256, 'Wave 16 changed rejected hop surfaces');
assert.equal(stableDigest(hopGraph.rejected_hop_pairs), projection.graph_digests.rejected_hop_pairs_sha256, 'Wave 16 changed rejected hop pairs');
for (const row of projection.source_claim_manifest) {
  const bytes = fs.readFileSync(full(row.path));
  assert.equal(bytes.length, row.bytes, `${row.path}: source claim byte length changed`);
  assert.equal(sha256(bytes), row.sha256, `${row.path}: source claim bytes changed`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [
  policyPath,
  policy.paths.local_resolution_registry,
  policy.paths.subject_object_registry,
  policy.paths.identity_extension_registry,
  policy.paths.receipt
]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: lake file row missing`);
  assert.equal(row.generated, false, `${relative}: source control marked generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: source control not authoritative-reachable`);
}
for (const relative of [policy.paths.projection, policy.paths.plan]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: generated Wave 16 product missing from lake`);
  assert.equal(row.generated, true, `${relative}: generated Wave 16 product marked non-generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: generated Wave 16 product not authoritative-reachable`);
}
assert.equal(fileByPath.get(policy.paths.local_resolution_registry)?.index_file, true, 'Wave 16 resolution registry is not an index surface');
assert.equal(fileByPath.get(policy.paths.subject_object_registry)?.index_file, true, 'Wave 16 subject-object registry is not an index surface');
assert.equal(fileByPath.get(policy.paths.identity_extension_registry)?.index_file, true, 'Wave 16 identity-extension registry is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
const caseDocs = new Map(caseIndex.cases.map(entry => [entry.case_id, readJson(entry.href)]));
const catalogClaimByKey = new Map(publicCatalog.claims.map(row => [row.key, row]));
const wave13ResolutionById = new Map(wave13Projection.resolutions.map(row => [row.resolution_id, row]));
const wave16ResolutionById = new Map(projection.identity_resolutions.map(row => [row.resolution_id, row]));
const wave16SubjectObjectById = new Map(projection.subject_objects.map(row => [row.subject_object_id, row]));
const surfaceGraphText = JSON.stringify(surfaceGraph);

let resolutionIdsObserved = 0;
const resolutionObservations = [];
const wave16ResolutionEntries = [...localResolutionIndex.current_by_case_and_local.values()].filter(entry => entry.source_path === policy.paths.local_resolution_registry);
for (const entry of wave16ResolutionEntries) {
  const row = entry.row;
  const object = objectByKey.get(`resolution_id:${row.resolution_id}`);
  assert.ok(object, `${row.resolution_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.resolution_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.resolution_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.resolution_id}: object not indexed`);
  assert.ok(object.occurrences.some(item => item.path === policy.paths.local_resolution_registry && item.generated === false), `${row.resolution_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === `build/cases/${row.source_case_id}.json` && item.generated === true), `${row.resolution_id}: compiled case occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === 'build/public-catalog.json' && item.generated === true), `${row.resolution_id}: public catalog occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === 'build/surface-graph.json' && item.generated === true), `${row.resolution_id}: search projection occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === 'build/canonical-subject-projection-wave-13.json' && item.generated === true), `${row.resolution_id}: Wave 13 projection occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.paths.projection && item.generated === true), `${row.resolution_id}: Wave 16 projection occurrence missing`);
  assert.ok(wave13ResolutionById.has(row.resolution_id), `${row.resolution_id}: missing from live Wave 13 projection`);
  assert.ok(wave16ResolutionById.has(row.resolution_id), `${row.resolution_id}: missing from Wave 16 projection`);
  assert.ok(surfaceGraphText.includes(row.resolution_id), `${row.resolution_id}: missing from search projection bytes`);
  const caseClaims = caseDocs.get(row.source_case_id).claims.filter(claim => claim.subject_identity?.resolution_id === row.resolution_id);
  assert.ok(caseClaims.length > 0, `${row.resolution_id}: compiled claim metadata missing`);
  assert.ok(caseClaims.every(claim => catalogClaimByKey.get(`${row.source_case_id}::${claim.claim_id}`)?.subject_identity?.resolution_id === row.resolution_id), `${row.resolution_id}: catalog metadata missing`);
  resolutionIdsObserved += 1;
  resolutionObservations.push({
    resolution_id: row.resolution_id,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    canonical_id: row.canonical_id,
    source_registry_observed: true,
    compiled_case_observed: true,
    public_catalog_observed: true,
    surface_search_observed: true,
    wave_13_projection_observed: true,
    wave_16_projection_observed: true,
    indexed: true,
    graph_effect: 'none'
  });
}
assert.equal(resolutionIdsObserved, policy.expected.resolution_ids_source_projection_and_index_observed);

let subjectObjectIdsObserved = 0;
const subjectObjectObservations = [];
for (const entry of subjectObjectIndex.entries) {
  const row = entry.row;
  const object = objectByKey.get(`subject_object_id:${row.subject_object_id}`);
  assert.ok(object, `${row.subject_object_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.subject_object_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.subject_object_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.subject_object_id}: object not indexed`);
  assert.ok(object.occurrences.some(item => item.path === policy.paths.subject_object_registry && item.generated === false), `${row.subject_object_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === `build/cases/${row.source_case_id}.json` && item.generated === true), `${row.subject_object_id}: compiled case occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === 'build/public-catalog.json' && item.generated === true), `${row.subject_object_id}: public catalog occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.paths.projection && item.generated === true), `${row.subject_object_id}: Wave 16 projection occurrence missing`);
  assert.ok(wave16SubjectObjectById.has(row.subject_object_id), `${row.subject_object_id}: missing from Wave 16 projection`);
  const caseClaims = caseDocs.get(row.source_case_id).claims.filter(claim => claim.subject_object?.subject_object_id === row.subject_object_id);
  assert.ok(caseClaims.length > 0, `${row.subject_object_id}: compiled claim metadata missing`);
  assert.ok(caseClaims.every(claim => catalogClaimByKey.get(`${row.source_case_id}::${claim.claim_id}`)?.subject_object_id === row.subject_object_id), `${row.subject_object_id}: catalog metadata missing`);
  subjectObjectIdsObserved += 1;
  subjectObjectObservations.push({
    subject_object_id: row.subject_object_id,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    object_kind: row.object_kind,
    source_registry_observed: true,
    compiled_case_observed: true,
    public_catalog_observed: true,
    wave_16_projection_observed: true,
    indexed: true,
    graph_effect: 'none'
  });
}
assert.equal(subjectObjectIdsObserved, policy.expected.subject_object_ids_source_projection_and_index_observed);

const entityByLocal = new Map(activeIdentity.entities.map(row => [row.local_id, row]));
const extensionObservations = [];
for (const row of extensionRows) {
  assert.equal(row.registry_row_type, 'entity_extension');
  const entity = entityByLocal.get(row.local_id);
  assert.ok(entity, `${row.registry_key}: active AXM entity missing`);
  assert.equal(entity.axm_entity_id, row.axm_entity_id, `${row.registry_key}: AXM entity ID drift`);
  assert.equal(entity.legacy_provisional_entity_id, row.legacy_provisional_entity_id, `${row.registry_key}: legacy entity ID drift`);
  assert.ok(projection.identity_extensions.some(item => item.registry_key === row.registry_key), `${row.registry_key}: Wave 16 projection occurrence missing`);
  extensionObservations.push({
    registry_key: row.registry_key,
    local_id: row.local_id,
    axm_entity_id: row.axm_entity_id,
    source_registry_observed: true,
    active_projection_observed: true,
    wave_16_projection_observed: true,
    participation_created: false,
    graph_effect: 'none'
  });
}
assert.equal(extensionObservations.length, policy.expected.identity_extension_rows);

const forbiddenTokens = [
  ...wave16ResolutionEntries.map(entry => entry.row.resolution_id),
  ...subjectObjectIndex.entries.map(entry => entry.row.subject_object_id)
];
const hopGraphText = JSON.stringify(hopGraph);
assert.ok(forbiddenTokens.every(token => !hopGraphText.includes(token)), 'Wave 16 control ID leaked into hop graph');

const manifestPaths = [
  policyPath,
  policy.paths.local_resolution_registry,
  policy.paths.subject_object_registry,
  policy.paths.identity_extension_registry,
  policy.paths.projection,
  policy.paths.plan,
  'build/cases/index.json',
  ...caseIndex.cases.map(entry => entry.href),
  'build/public-catalog.json',
  'build/surface-graph.json',
  'build/canonical-subject-projection-wave-13.json',
  'build/axm-identity.json',
  'build/hop-graph.json',
  'data/ledger/participation.jsonl',
  ...projection.source_claim_manifest.map(row => row.path)
];
const manifest = inputManifest(manifestPaths);
const sourceFingerprint = fingerprint(manifest);
const counts = {
  ...projection.counts,
  resolution_ids_source_projection_and_index_observed: resolutionIdsObserved,
  subject_object_ids_source_projection_and_index_observed: subjectObjectIdsObserved
};
const receipt = {
  schema_version: 'lake-subject-integration-wave-16@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts,
  post_execution_reconciliation_complete: true,
  all_identity_and_subject_object_decisions_integrated: true,
  generic_wait_states: 0,
  correction_mode: policy.decision_law.correction_mode,
  boundaries: policy.boundaries
};
const reconciliation = {
  schema_version: 'lake-subject-integration-wave-16-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts,
  resolution_observations: resolutionObservations,
  subject_object_observations: subjectObjectObservations,
  identity_extension_observations: extensionObservations,
  completion: {
    all_wave_15_identity_decisions_integrated: true,
    all_wave_15_nonidentity_objects_integrated: true,
    every_resolution_id_source_projection_and_index_observed: resolutionIdsObserved === policy.expected.identity_decisions,
    every_subject_object_id_source_projection_and_index_observed: subjectObjectIdsObserved === policy.expected.subject_object_rows,
    all_identity_extensions_active_and_reconciled: extensionObservations.length === policy.expected.identity_extension_rows,
    generic_unresolved_claim_references: 0,
    generic_wait_states: 0,
    sealed_wave_14_and_wave_15_products_regenerated: false,
    source_subject_ids_preserved: projection.counts.source_subject_id_changes === 0,
    source_claim_text_preserved: projection.counts.source_claim_text_changes === 0,
    participation_payload_unchanged: true,
    active_claim_payload_unchanged: true,
    hop_edge_payload_unchanged: true,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0,
    post_execution_reconciliation_complete: true,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.reconciliation, reconciliation);
const report = `# Subject integration — Wave 16 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nresolution IDs source/projected/indexed:       ${resolutionIdsObserved}/${policy.expected.identity_decisions}\nsubject-object IDs source/projected/indexed:   ${subjectObjectIdsObserved}/${policy.expected.subject_object_rows}\nidentity extensions active/reconciled:         ${extensionObservations.length}/${policy.expected.identity_extension_rows}\nidentity claim references integrated:          ${projection.counts.identity_claim_references_integrated}\nsubject-object claim references integrated:    ${projection.counts.subject_object_claim_references_integrated}\ngeneric unresolved claim references:           0\ngeneric wait states:                            0\ncanonical organizations / active AXM entities: ${projection.counts.canonical_organization_rows_after} / ${projection.counts.active_axm_entities_after}\nsource subject/text changes:                    0 / 0\nparticipation / active claim / graph / hop:     0 / 0 / 0 / 0\naccepted cross-case identity bridges:           0\nhuman-permission dependencies:                  0\ngraph effect:                                   none\n\`\`\`\n\nEvery Wave 16 identity resolution and typed subject object is source-custodied, present in its generated projections, and indexed by the lake. No integration control identifier enters the hop graph.\n`;
fs.mkdirSync(path.dirname(full(policy.paths.reconciliation_report)), { recursive: true });
fs.writeFileSync(full(policy.paths.reconciliation_report), report);

console.log('subject integration Wave 16 reconciled');
console.log(`  resolution IDs source/projected/indexed: ${resolutionIdsObserved}/${policy.expected.identity_decisions}`);
console.log(`  subject-object IDs source/projected/indexed: ${subjectObjectIdsObserved}/${policy.expected.subject_object_rows}`);
console.log('  generic waits, graph effects, and human-permission dependencies: 0');
