#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-exact-canonical-subject-wave-14-policy.json';

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
function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}
function inputManifest(paths) {
  return uniqueSorted(paths).map(relative => {
    const bytes = fs.readFileSync(full(relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
  });
}
function fingerprint(rows) {
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const unresolvedRows = readJsonl(policy.unresolved_registry_path);
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const briefingIndex = readJson('build/briefings/index.json');
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');

assert.equal(policy.schema_version, 'lake-exact-canonical-subject-wave-14-policy@1');
assert.equal(projection.schema_version, 'exact-canonical-subject-projection-wave-14@1');
assert.equal(plan.schema_version, 'exact-canonical-subject-wave-14-plan@1');
assert.equal(projection.counts.exact_canonical_id_references, policy.expected.exact_canonical_references);
assert.equal(projection.counts.exact_canonical_subjects, policy.expected.exact_canonical_subjects);
assert.equal(projection.counts.unresolved_subject_references, policy.expected.unresolved_subject_references);
assert.equal(unresolvedRows.length, policy.expected.unresolved_distinct_subjects);
assert.equal(projection.exact_subject_observations.length, policy.expected.exact_canonical_subjects);
assert.equal(projection.unresolved_subjects.length, policy.expected.unresolved_distinct_subjects);
assert.deepEqual(projection.unresolved_subjects, unresolvedRows);
assert.deepEqual(projection.unresolved_classification_counts, policy.expected.unresolved_classification_counts);
assert.equal(projection.counts.source_subject_id_changes, 0);
assert.equal(projection.counts.source_claim_text_changes, 0);

const canonicalById = new Map([
  ...actors.map(row => [row.id, { kind: 'actor', row }]),
  ...organizations.map(row => [row.id, { kind: 'organization', row }])
]);
assert.equal(canonicalById.size, actors.length + organizations.length, 'canonical ID collision');
const cases = new Map(caseIndex.cases.map(entry => [entry.case_id, readJson(entry.href)]));
const catalogClaims = new Map(publicCatalog.claims.map(row => [row.key, row]));
let exactClaimReferencesObserved = 0;
const exactObservations = [];
for (const observation of projection.exact_subject_observations) {
  const canonicalRecord = canonicalById.get(observation.canonical_subject_id);
  assert.ok(canonicalRecord, `${observation.canonical_subject_id}: canonical source record missing`);
  assert.equal(canonicalRecord.kind, observation.canonical_kind);
  assert.equal(observation.local_subject_ids.length, 1, `${observation.exact_subject_observation_id}: exact lane must have one byte-identical local ID`);
  assert.equal(observation.local_subject_ids[0], observation.canonical_subject_id);
  assert.equal(observation.exact_string_equality, true);
  assert.equal(observation.normalized_name_match_used, false);
  assert.equal(observation.alias_match_used, false);
  assert.equal(observation.fuzzy_match_used, false);
  for (const key of observation.claim_ids) {
    const separator = key.indexOf('::');
    assert.ok(separator > 0, `${key}: malformed case claim key`);
    const caseId = key.slice(0, separator);
    const claimId = key.slice(separator + 2);
    const claim = cases.get(caseId)?.claims.find(row => row.claim_id === claimId);
    assert.ok(claim, `${key}: compiled claim missing`);
    assert.equal(claim.subject_id, observation.canonical_subject_id);
    assert.equal(claim.subject_identity.local_subject_id, observation.canonical_subject_id);
    assert.equal(claim.subject_identity.canonical_subject_id, observation.canonical_subject_id);
    assert.equal(claim.subject_identity.resolution_basis, 'exact_subject_id_equals_canonical_id');
    assert.equal(claim.subject_identity.resolution_id, null);
    const catalogClaim = catalogClaims.get(key);
    assert.ok(catalogClaim, `${key}: public catalog claim missing`);
    assert.equal(catalogClaim.canonical_subject_id, observation.canonical_subject_id);
    assert.equal(catalogClaim.subject_identity.resolution_basis, 'exact_subject_id_equals_canonical_id');
    exactClaimReferencesObserved += 1;
  }
  exactObservations.push({
    exact_subject_observation_id: observation.exact_subject_observation_id,
    canonical_subject_id: observation.canonical_subject_id,
    canonical_kind: observation.canonical_kind,
    canonical_source_record_present: true,
    compiled_claim_references_observed: observation.claim_ids.length,
    public_catalog_claim_references_observed: observation.catalog_claim_ids.length,
    exact_string_equality: true,
    graph_effect: 'none'
  });
}
assert.equal(exactClaimReferencesObserved, policy.expected.exact_canonical_references);

for (const row of projection.source_claim_manifest) {
  const bytes = fs.readFileSync(full(row.path));
  assert.equal(bytes.length, row.bytes, `${row.path}: source claim byte length changed`);
  assert.equal(sha256(bytes), row.sha256, `${row.path}: source claim bytes changed`);
}
assert.equal(stableDigest(participation), projection.graph_digests.participation_sha256, 'Wave 14 changed participation');
assert.equal(stableDigest(activeIdentity.claims), projection.graph_digests.active_claims_sha256, 'Wave 14 changed active claims');
assert.equal(stableDigest(hopGraph.edges), projection.graph_digests.hop_edges_sha256, 'Wave 14 changed hop edges');
assert.equal(stableDigest(hopGraph.rejected_hop_surfaces), projection.graph_digests.rejected_hop_surfaces_sha256, 'Wave 14 changed rejected hop surfaces');
assert.equal(stableDigest(hopGraph.rejected_hop_pairs), projection.graph_digests.rejected_hop_pairs_sha256, 'Wave 14 changed rejected hop pairs');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policyPath, policy.unresolved_registry_path]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: lake file row missing`);
  assert.equal(row.generated, false, `${relative}: source control marked generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: source control not authoritative-reachable`);
}
assert.equal(fileByPath.get(policy.unresolved_registry_path)?.index_file, true, 'Wave 14 unresolved registry is not an index surface');
for (const relative of [policy.projection_path, policy.plan_path]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: lake file row missing`);
  assert.equal(row.generated, true, `${relative}: expected generated file`);
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let unresolvedIdsObserved = 0;
const unresolvedObservations = [];
for (const row of unresolvedRows) {
  const object = objectByKey.get(`unresolved_subject_id:${row.unresolved_subject_id}`);
  assert.ok(object, `${row.unresolved_subject_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.unresolved_subject_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.unresolved_subject_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.unresolved_subject_id}: object is not indexed`);
  assert.ok(object.occurrences.some(item => item.path === policy.unresolved_registry_path && item.generated === false), `${row.unresolved_subject_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.projection_path && item.generated === true), `${row.unresolved_subject_id}: generated projection occurrence missing`);
  unresolvedIdsObserved += 1;
  unresolvedObservations.push({
    unresolved_subject_id: row.unresolved_subject_id,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    classification: row.classification,
    source_registry_observed: true,
    generated_projection_observed: true,
    indexed: true,
    graph_effect: 'none'
  });
}
assert.equal(unresolvedIdsObserved, policy.expected.unresolved_distinct_subjects);

const forbiddenTokens = [
  ...projection.exact_subject_observations.map(row => row.exact_subject_observation_id),
  ...unresolvedRows.map(row => row.unresolved_subject_id)
];
const hopGraphText = JSON.stringify(hopGraph);
assert.ok(forbiddenTokens.every(token => !hopGraphText.includes(token)), 'Wave 14 control token leaked into hop graph');

const manifestPaths = [
  policyPath,
  policy.unresolved_registry_path,
  policy.projection_path,
  policy.plan_path,
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'data/canonical/aliases.json',
  'data/ledger/participation.jsonl',
  'build/axm-identity.json',
  'build/hop-graph.json',
  'build/cases/index.json',
  ...caseIndex.cases.map(entry => entry.href),
  'build/public-catalog.json',
  'build/briefings/index.json',
  ...briefingIndex.briefings.map(entry => `build/briefings/${entry.case_id}.json`),
  ...projection.source_claim_manifest.map(row => row.path),
  'tools/build-lake-exact-canonical-subject-wave-14.mjs',
  'tools/finalize-lake-exact-canonical-subject-wave-14.mjs',
  'tools/reconcile-lake-exact-canonical-subject-wave-14.mjs',
  'tools/validate-lake-exact-canonical-subject-wave-14.mjs',
  'test/lake-exact-canonical-subject-wave-14.test.js'
].filter(relative => fs.existsSync(full(relative)));
const manifest = inputManifest(manifestPaths);
const sourceFingerprint = fingerprint(manifest);

const receipt = {
  schema_version: 'lake-exact-canonical-subject-wave-14@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts: {
    claim_subject_references: projection.counts.claim_subject_references,
    explicit_resolution_references: projection.counts.explicit_resolution_references,
    exact_canonical_id_references: projection.counts.exact_canonical_id_references,
    exact_canonical_subjects: projection.counts.exact_canonical_subjects,
    unresolved_subject_references: projection.counts.unresolved_subject_references,
    unresolved_distinct_subjects: unresolvedRows.length,
    briefing_exact_canonical_references: projection.counts.briefing_exact_canonical_references,
    exact_claim_references_observed: exactClaimReferencesObserved,
    unresolved_ids_source_projection_and_index_observed: unresolvedIdsObserved,
    source_subject_id_changes: 0,
    source_claim_text_changes: 0,
    participation_delta: 0,
    active_claim_delta: 0,
    graph_edge_delta: 0,
    accepted_cross_case_identity_bridges: 0
  },
  unresolved_classification_counts: projection.unresolved_classification_counts,
  exact_canonical_id_lane_complete: true,
  unresolved_routing_registry_built: true,
  source_claims_preserved: true,
  exact_string_equality_only: true,
  normalized_name_matching_authorized: false,
  alias_matching_authorized: false,
  fuzzy_matching_authorized: false,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};

const reconciliation = {
  schema_version: 'lake-exact-canonical-subject-wave-14-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts: receipt.counts,
  unresolved_classification_counts: projection.unresolved_classification_counts,
  exact_observations: exactObservations,
  unresolved_observations: unresolvedObservations,
  completion: {
    complete_claim_subject_denominator_recomputed: projection.counts.claim_subject_references === policy.expected.claim_subject_references,
    explicit_resolutions_preserved: projection.counts.explicit_resolution_references === policy.expected.explicitly_resolved_references,
    exact_canonical_reference_denominator_complete: exactClaimReferencesObserved === policy.expected.exact_canonical_references,
    exact_canonical_subject_denominator_complete: exactObservations.length === policy.expected.exact_canonical_subjects,
    every_unresolved_id_source_projection_and_index_observed: unresolvedIdsObserved === policy.expected.unresolved_distinct_subjects,
    unresolved_classification_denominator_complete: stableDigest(projection.unresolved_classification_counts) === stableDigest(policy.expected.unresolved_classification_counts),
    source_subject_ids_preserved: true,
    source_claim_text_preserved: true,
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
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};

writeJson(policy.receipt_path, receipt);
writeJson(policy.reconciliation_path, reconciliation);
const report = `# Exact canonical subject Wave 14 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nclaim-subject references:                    ${projection.counts.claim_subject_references}\nexplicit resolution references:              ${projection.counts.explicit_resolution_references}\nexact canonical-ID references:               ${projection.counts.exact_canonical_id_references}\nexact canonical subjects:                    ${projection.counts.exact_canonical_subjects}\nremaining unresolved references:             ${projection.counts.unresolved_subject_references}\nremaining distinct unresolved subjects:      ${unresolvedRows.length}\nexact claim references observed:              ${exactClaimReferencesObserved}\nunresolved IDs source/projected/indexed:      ${unresolvedIdsObserved}\nsource subject-ID / claim-text changes:        0 / 0\nparticipation / active-claim / graph / hop:    0 / 0 / 0 / 0\naccepted cross-case identity bridges:         0\nhuman-permission dependencies:                0\n\`\`\`\n\nThe exact-ID lane is complete for the pinned denominator. Every remaining unresolved subject has both a non-generated routing record and a generated projection occurrence, plus a named next action. No normalized-name, alias, fuzzy, object-side, or contextual identity inference was admitted.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);
console.log('exact canonical subject Wave 14 reconciled');
console.log(`  exact claim references / subjects observed: ${exactClaimReferencesObserved} / ${exactObservations.length}`);
console.log(`  unresolved IDs source/projected/indexed: ${unresolvedIdsObserved}/${unresolvedRows.length}`);
console.log('  source mutation, relationship, participation, graph, hop, and human-permission effects: 0');
