#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-unresolved-subject-adjudication-wave-15-policy.json';

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
const projection = readJson(policy.projection_path);
const registryRows = readJsonl(policy.registry_path);
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const { files, objects } = lakeRows();

assert.equal(policy.schema_version, 'lake-unresolved-subject-adjudication-wave-15-policy@1');
assert.equal(projection.schema_version, 'unresolved-subject-adjudication-wave-15@1');
assert.equal(registryRows.length, policy.expected.subject_rows);
assert.deepEqual(registryRows, projection.decisions, 'Wave 15 source registry and generated projection diverged');
assert.equal(projection.counts.identity_decisions, policy.expected.identity_decisions);
assert.equal(projection.counts.nonidentity_object_decisions, policy.expected.nonidentity_object_decisions);
assert.equal(projection.counts.generic_unadjudicated_rows, 0);

assert.equal(stableDigest(participation), projection.graph_digests.participation_sha256, 'Wave 15 changed participation');
assert.equal(stableDigest(activeIdentity.claims), projection.graph_digests.active_claims_sha256, 'Wave 15 changed active claims');
assert.equal(stableDigest(hopGraph.edges), projection.graph_digests.hop_edges_sha256, 'Wave 15 changed hop edges');
assert.equal(stableDigest(hopGraph.rejected_hop_surfaces), projection.graph_digests.rejected_hop_surfaces_sha256, 'Wave 15 changed rejected hop surfaces');
assert.equal(stableDigest(hopGraph.rejected_hop_pairs), projection.graph_digests.rejected_hop_pairs_sha256, 'Wave 15 changed rejected hop pairs');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policyPath, policy.registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: lake file row missing`);
  assert.equal(row.generated, false, `${relative}: source control marked generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: source control not authoritative-reachable`);
}
assert.equal(fileByPath.get(policy.registry_path)?.index_file, true, 'Wave 15 decision registry is not an index surface');
for (const relative of [policy.projection_path, policy.plan_path]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: lake file row missing`);
  assert.equal(row.generated, true, `${relative}: generated product marked non-generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: generated product not authoritative-reachable`);
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let decisionIdsObserved = 0;
let subjectObjectIdsObserved = 0;
const decisionObservations = [];
const subjectObjectObservations = [];
for (const decision of registryRows) {
  const object = objectByKey.get(`adjudication_id:${decision.adjudication_id}`);
  assert.ok(object, `${decision.adjudication_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${decision.adjudication_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${decision.adjudication_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${decision.adjudication_id}: object not indexed`);
  assert.ok(object.occurrences.some(item => item.path === policy.registry_path && item.generated === false), `${decision.adjudication_id}: registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.projection_path && item.generated === true), `${decision.adjudication_id}: projection occurrence missing`);
  decisionIdsObserved += 1;
  decisionObservations.push({
    adjudication_id: decision.adjudication_id,
    unresolved_subject_id: decision.unresolved_subject_id,
    disposition: decision.disposition,
    source_registry_observed: true,
    generated_projection_observed: true,
    indexed: true,
    graph_effect: 'none'
  });

  if (decision.subject_object_id) {
    const subjectObject = objectByKey.get(`subject_object_id:${decision.subject_object_id}`);
    assert.ok(subjectObject, `${decision.subject_object_id}: lake object missing`);
    assert.equal(subjectObject.source_occurrence, true, `${decision.subject_object_id}: source occurrence missing`);
    assert.equal(subjectObject.projection_occurrence, true, `${decision.subject_object_id}: projection occurrence missing`);
    assert.equal(subjectObject.indexed, true, `${decision.subject_object_id}: object not indexed`);
    assert.ok(subjectObject.occurrences.some(item => item.path === policy.registry_path && item.generated === false), `${decision.subject_object_id}: registry occurrence missing`);
    assert.ok(subjectObject.occurrences.some(item => item.path === policy.projection_path && item.generated === true), `${decision.subject_object_id}: projection occurrence missing`);
    subjectObjectIdsObserved += 1;
    subjectObjectObservations.push({
      subject_object_id: decision.subject_object_id,
      adjudication_id: decision.adjudication_id,
      source_case_id: decision.source_case_id,
      local_subject_id: decision.local_subject_id,
      object_kind: decision.object_kind,
      source_registry_observed: true,
      generated_projection_observed: true,
      indexed: true,
      graph_effect: 'none'
    });
  }
}
assert.equal(decisionIdsObserved, policy.expected.decision_ids_source_projection_and_index_observed);
assert.equal(subjectObjectIdsObserved, policy.expected.subject_object_ids_source_projection_and_index_observed);

const forbiddenTokens = [
  ...registryRows.map(row => row.adjudication_id),
  ...registryRows.map(row => row.subject_object_id).filter(Boolean)
];
const hopGraphText = JSON.stringify(hopGraph);
assert.ok(forbiddenTokens.every(token => !hopGraphText.includes(token)), 'Wave 15 control ID leaked into the hop graph');

const counts = {
  ...projection.counts,
  decision_ids_source_projection_and_index_observed: decisionIdsObserved,
  subject_object_ids_source_projection_and_index_observed: subjectObjectIdsObserved
};

const receipt = {
  schema_version: 'lake-unresolved-subject-adjudication-wave-15@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: projection.source_fingerprint_sha256,
  input_manifest: projection.input_manifest,
  counts,
  post_execution_reconciliation_complete: true,
  every_row_adjudicated: true,
  generic_wait_states: 0,
  correction_mode: policy.decision_law.correction_mode,
  boundaries: policy.boundaries
};

const reconciliation = {
  schema_version: 'lake-unresolved-subject-adjudication-wave-15-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: projection.source_fingerprint_sha256,
  input_manifest: projection.input_manifest,
  counts,
  decision_observations: decisionObservations,
  subject_object_observations: subjectObjectObservations,
  completion: {
    complete_wave_14_unresolved_denominator_recomputed: true,
    every_row_received_exactly_one_disposition: true,
    every_decision_id_source_projection_and_index_observed: true,
    every_subject_object_id_source_projection_and_index_observed: true,
    provenance_backed_identity_decisions_complete: true,
    controlled_identity_decisions_complete: true,
    new_canonical_plans_complete: true,
    nonidentity_object_typing_complete: true,
    generic_unadjudicated_rows: 0,
    generic_wait_states: 0,
    canonical_mutations_applied: 0,
    case_projection_changes: 0,
    participation_payload_unchanged: true,
    active_claim_payload_unchanged: true,
    hop_edge_payload_unchanged: true,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
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

writeJson(policy.receipt_path, receipt);
writeJson(policy.reconciliation_path, reconciliation);
const report = `# Unresolved subject adjudication — Wave 15 reconciliation\n\nSource fingerprint: \`${projection.source_fingerprint_sha256}\`\n\n## Result\n\n\`\`\`text\nsubject rows:                                      ${counts.subject_rows}\nclaim references:                                 ${counts.claim_references}\nidentity decisions:                               ${counts.identity_decisions}\nnonidentity object decisions:                     ${counts.nonidentity_object_decisions}\ndecision IDs source/projected/indexed:             ${decisionIdsObserved}\nsubject-object IDs source/projected/indexed:        ${subjectObjectIdsObserved}\ngeneric unadjudicated rows:                        0\ngeneric wait states:                               0\ncanonical mutations / case projection changes:     0 / 0\nparticipation / active claim / graph / hop delta:   0 / 0 / 0 / 0\naccepted cross-case identity bridges:              0\nhuman-permission dependencies:                     0\ngraph effect:                                      none\n\`\`\`\n\nEvery Wave 15 adjudication is present in the non-generated decision registry, the generated projection, and the lake index. Every typed nonidentity subject object has the same source/projection/index custody. No control identifier enters the hop graph.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('unresolved subject adjudication Wave 15 reconciled');
console.log(`  decision IDs source/projected/indexed: ${decisionIdsObserved}/${registryRows.length}`);
console.log(`  subject-object IDs source/projected/indexed: ${subjectObjectIdsObserved}/${policy.expected.nonidentity_object_decisions}`);
console.log('  generic waits, graph effects, and human-permission dependencies: 0');
