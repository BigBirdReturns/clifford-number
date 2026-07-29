#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/ledger.mjs';
import {
  AXM_GENESIS_V1_SCHEME,
  canonicalizeGenesisV1,
  deriveGenesisProvenanceId,
  deriveGenesisSpanId,
  recomputeGenesisClaimId,
  recomputeGenesisEntityId
} from './lib/axm-genesis-identity-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-reproducibility-wave-05-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
}

const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-axm-reproducibility-wave-05-policy@1') throw new Error('unsupported Wave 05 policy schema');
for (const relative of [...(policy.input_paths ?? []), ...(policy.implementation_paths ?? [])]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 05 input: ${relative}`);
}

const fingerprintPaths = [...new Set([policyPath, ...(policy.input_paths ?? []), ...(policy.implementation_paths ?? [])])].sort();
const inputs = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const vectors = readJson(policy.local_fixture_path);
const attestation = readJson(policy.runtime_attestation_path);
const vectorCounts = {
  canonicalization: vectors.canonicalization?.length ?? 0,
  entity_ids: vectors.entity_ids?.length ?? 0,
  claim_ids: vectors.claim_ids?.length ?? 0,
  provenance_ids: vectors.provenance_ids?.length ?? 0,
  span_ids: vectors.span_ids?.length ?? 0
};
assert.equal(vectorCounts.canonicalization, policy.expected.canonicalization_vectors, 'canonicalization vector count drift');
assert.equal(vectorCounts.entity_ids, policy.expected.entity_id_vectors, 'entity vector count drift');
assert.equal(vectorCounts.claim_ids, policy.expected.claim_id_vectors, 'claim vector count drift');
assert.equal(vectorCounts.provenance_ids, policy.expected.provenance_id_vectors, 'provenance vector count drift');
assert.equal(vectorCounts.span_ids, policy.expected.span_id_vectors, 'span vector count drift');

for (const item of vectors.canonicalization ?? []) {
  if (Object.hasOwn(item, 'expected')) assert.equal(canonicalizeGenesisV1(item.input), item.expected, `canonicalization drift: ${JSON.stringify(item.input)}`);
  else assert.throws(() => canonicalizeGenesisV1(item.input), /NUL/, `canonicalization error drift: ${JSON.stringify(item.input)}`);
}
for (const item of vectors.entity_ids ?? []) assert.equal(recomputeGenesisEntityId(item.namespace, item.label), item.expected_id, `entity vector drift: ${item.expected_id}`);
for (const item of vectors.claim_ids ?? []) assert.equal(recomputeGenesisClaimId(item.subject, item.predicate, item.object, item.object_type), item.expected_id, `claim vector drift: ${item.expected_id}`);
for (const item of vectors.provenance_ids ?? []) assert.equal(deriveGenesisProvenanceId(item.claim_id, item.source_hash, item.byte_start, item.byte_end), item.expected_id, `provenance vector drift: ${item.expected_id}`);
for (const item of vectors.span_ids ?? []) assert.equal(deriveGenesisSpanId(item.source_hash, item.byte_start, item.byte_end, item.text), item.expected_id, `span vector drift: ${item.expected_id}`);

assert.equal(attestation.schema_version, 'axm-genesis-v1-runtime-attestation@1', 'runtime attestation schema drift');
assert.equal(attestation.external_repository, policy.external_reference.repository, 'runtime attestation repository drift');
assert.equal(attestation.external_commit, policy.external_reference.commit, 'runtime attestation commit drift');
assert.equal(attestation.identity_module_path, policy.external_reference.identity_module_path, 'runtime attestation module drift');
assert.equal(attestation.fixture_source_path, policy.external_reference.fixture_path, 'runtime attestation fixture path drift');
assert.equal(attestation.fixture_local_path, policy.local_fixture_path, 'runtime attestation local fixture drift');
assert.equal(attestation.fixture_bytes_equal, true, 'pinned Genesis fixture bytes differ');
assert.equal(attestation.runtime_outputs_equal, true, 'Python and Node runtime outputs differ');
assert.equal(attestation.python_runtime_sha256, attestation.node_runtime_sha256, 'runtime output digests differ');
assert.deepEqual(attestation.vector_counts, vectorCounts, 'runtime attestation vector counts drift');

const data = loadAll();
const namespace = readJson('cases.json').default_case_id;
assert.ok(namespace, 'cases.json lacks default_case_id');
const legacyIdentity = readJson('build/axm-identity.json');
assert.equal(legacyIdentity.scheme?.status, 'provisional', 'active AXM projection is no longer the quarantined provisional scheme');
assert.equal(legacyIdentity.scheme?.namespace, namespace, 'active AXM namespace drift');
assert.equal(legacyIdentity.claims?.length, policy.expected.legacy_claim_migrations, 'active AXM claim count drift');

const sourceEntities = [
  ...data.actors.map(row => ({ local_id: row.id, kind: 'actor', label: row.label })),
  ...data.organizations.map(row => ({ local_id: row.id, kind: 'organization', label: row.label })),
  ...data.surfaces.map(row => ({ local_id: row.surface_id, kind: 'surface', label: row.surface_label }))
].sort((a, b) => a.local_id.localeCompare(b.local_id));
const sourceByLocal = new Map(sourceEntities.map(row => [row.local_id, row]));
const legacyByLocal = new Map((legacyIdentity.entities ?? []).map(row => [row.local_id, row]));
assert.equal(sourceByLocal.size, sourceEntities.length, 'duplicate local entity source IDs');
assert.equal(legacyByLocal.size, legacyIdentity.entities.length, 'duplicate active projection local IDs');
assert.deepEqual([...sourceByLocal.keys()].sort(), [...legacyByLocal.keys()].sort(), 'active projection entity set does not equal canonical sources');

const genesisOwnerById = new Map();
const genesisByLocal = new Map();
for (const source of sourceEntities) {
  const genesisId = recomputeGenesisEntityId(namespace, source.label);
  const priorOwner = genesisOwnerById.get(genesisId);
  assert.ok(!priorOwner || priorOwner === source.local_id, `Genesis entity collision: ${priorOwner} and ${source.local_id}`);
  genesisOwnerById.set(genesisId, source.local_id);
  genesisByLocal.set(source.local_id, genesisId);
}

const aliasesByLocal = new Map();
for (const alias of data.aliases ?? []) {
  if (!sourceByLocal.has(alias.canonical_id)) continue;
  if (!aliasesByLocal.has(alias.canonical_id)) aliasesByLocal.set(alias.canonical_id, []);
  aliasesByLocal.get(alias.canonical_id).push(alias.alias);
}

const entityMigrations = sourceEntities.map(source => {
  const legacy = legacyByLocal.get(source.local_id);
  assert.equal(legacy.kind, source.kind, `${source.local_id}: active kind drift`);
  assert.equal(legacy.label, source.label, `${source.local_id}: active label drift`);
  const genesisId = genesisByLocal.get(source.local_id);
  const genesisAliasIds = [];
  for (const aliasLabel of aliasesByLocal.get(source.local_id) ?? []) {
    const aliasId = recomputeGenesisEntityId(namespace, aliasLabel);
    if (aliasId === genesisId) continue;
    const priorOwner = genesisOwnerById.get(aliasId);
    assert.ok(!priorOwner || priorOwner === source.local_id, `Genesis alias collision: ${aliasLabel} maps to ${priorOwner}`);
    genesisOwnerById.set(aliasId, source.local_id);
    genesisAliasIds.push(aliasId);
  }
  return {
    local_id: source.local_id,
    kind: source.kind,
    label: source.label,
    legacy_provisional_entity_id: legacy.axm_entity_id,
    genesis_v1_entity_id: genesisId,
    legacy_provisional_alias_ids: uniqueSorted(legacy.alias_axm_ids),
    genesis_v1_alias_ids: uniqueSorted(genesisAliasIds),
    active_projection_migrated: false,
    graph_effect: 'none'
  };
});

const claimMigrations = (legacyIdentity.claims ?? []).map(claim => {
  const subjectGenesisId = genesisByLocal.get(claim.subj_local_id);
  const objectGenesisId = genesisByLocal.get(claim.obj_local_id);
  assert.ok(subjectGenesisId, `${claim.claim_id}: missing Genesis subject`);
  assert.ok(objectGenesisId, `${claim.claim_id}: missing Genesis object`);
  const genesisClaimId = recomputeGenesisClaimId(subjectGenesisId, claim.predicate, objectGenesisId, claim.obj_type);
  return {
    subject_local_id: claim.subj_local_id,
    object_local_id: claim.obj_local_id,
    predicate: claim.predicate,
    object_type: claim.obj_type,
    legacy_provisional_subject_id: claim.subj,
    legacy_provisional_object_id: claim.obj,
    legacy_provisional_claim_id: claim.claim_id,
    genesis_v1_subject_id: subjectGenesisId,
    genesis_v1_object_id: objectGenesisId,
    genesis_v1_claim_id: genesisClaimId,
    temporal_windows_sha256: stableDigest(claim.windows ?? []),
    active_projection_migrated: false,
    graph_effect: 'none'
  };
}).sort((a, b) => a.legacy_provisional_claim_id.localeCompare(b.legacy_provisional_claim_id));
assert.equal(claimMigrations.length, policy.expected.legacy_claim_migrations, 'claim migration count drift');
assert.equal(new Set(claimMigrations.map(row => row.legacy_provisional_claim_id)).size, claimMigrations.length, 'duplicate legacy claim migration');
assert.equal(new Set(claimMigrations.map(row => row.genesis_v1_claim_id)).size, claimMigrations.length, 'Genesis claim migration is not one-to-one');
assert.ok(entityMigrations.every(row => row.legacy_provisional_entity_id !== row.genesis_v1_entity_id), 'a legacy entity ID unexpectedly equals a Genesis v1 ID');
assert.ok(claimMigrations.every(row => row.legacy_provisional_claim_id !== row.genesis_v1_claim_id), 'a legacy claim ID unexpectedly equals a Genesis v1 ID');

const migrationMap = {
  schema_version: 'axm-identity-genesis-v1-migration@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  external_reference: policy.external_reference,
  namespace,
  active_projection: {
    scheme_status: legacyIdentity.scheme.status,
    migrated: false,
    quarantined: true
  },
  target_projection: {
    scheme: AXM_GENESIS_V1_SCHEME,
    reference_runtime_parity_complete: true,
    migrated: false
  },
  counts: {
    entity_migrations: entityMigrations.length,
    alias_migrations: entityMigrations.reduce((total, row) => total + row.genesis_v1_alias_ids.length, 0),
    claim_migrations: claimMigrations.length,
    changed_entity_ids: entityMigrations.filter(row => row.legacy_provisional_entity_id !== row.genesis_v1_entity_id).length,
    changed_claim_ids: claimMigrations.filter(row => row.legacy_provisional_claim_id !== row.genesis_v1_claim_id).length
  },
  entity_migrations: entityMigrations,
  claim_migrations: claimMigrations,
  boundaries: policy.boundaries
};
writeJson(policy.migration_map_path, migrationMap);

const receipt = {
  schema_version: 'lake-axm-reproducibility-wave-05@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  external_reference: policy.external_reference,
  fixture_bytes_equal: attestation.fixture_bytes_equal,
  python_and_node_runtime_outputs_equal: attestation.runtime_outputs_equal,
  vector_counts: vectorCounts,
  entity_migrations: entityMigrations.length,
  claim_migrations: claimMigrations.length,
  migration_map_one_to_one: true,
  active_projection_migrated: false,
  cross_case_join_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.migration_receipt_path, receipt);

const plan = {
  schema_version: 'lake-axm-reproducibility-wave-05-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    active_projection_scheme_status: legacyIdentity.scheme.status,
    active_projection_migrated: false,
    external_runtime_parity_complete: false,
    cross_case_join_authorized: false,
    provisional_claim_ids: legacyIdentity.claims.length
  },
  reference_parity: {
    external_commit: policy.external_reference.commit,
    fixture_bytes_equal: true,
    python_and_node_runtime_outputs_equal: true,
    vector_counts: vectorCounts,
    runtime_digest_sha256: attestation.node_runtime_sha256
  },
  migration: {
    migration_map_path: policy.migration_map_path,
    entity_rows: entityMigrations.length,
    claim_rows: claimMigrations.length,
    one_to_one: true,
    active_projection_migrated: false
  },
  decisions: [
    {
      decision_key: 'W05-REFERENCE-PARITY',
      judgment: 'the_pinned_node_implementation_matches_axm_genesis_v1_across_the_shared_fixture_and_direct_python_runtime',
      action: 'retain_the_pinned_vectors_and_runtime_attestation_as_the_external_reproducibility_control',
      evidence_count: Object.values(vectorCounts).reduce((total, count) => total + count, 0),
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W05-MIGRATION-MAP',
      judgment: 'every_active_provisional_entity_and_claim_has_exactly_one_genesis_v1_successor',
      action: `write:${policy.migration_map_path}`,
      evidence_count: entityMigrations.length + claimMigrations.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W05-ACTIVE-PROJECTION-BOUNDARY',
      judgment: 'reference_parity_does_not_itself_migrate_the_active_projection_or_authorize_cross_case_joins',
      action: 'execute_a_separate_append_preserving_active_projection_migration_before_closing_the_join_gate',
      evidence_count: claimMigrations.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    pinned_external_reference_reproduced: true,
    shared_fixture_bytes_equal: true,
    python_and_node_runtime_outputs_equal: true,
    complete_one_to_one_migration_map_built: true,
    active_projection_migrated: false,
    external_axm_gate_complete: false,
    cross_case_join_authorized: false,
    post_execution_reconciliation_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# AXM Genesis v1 reproducibility Wave 05\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\nThe pinned Node implementation reproduces the AXM Genesis v1 identity fixture and the pinned Python reference runtime. The current Clifford Number projection is not compatible with Genesis v1: it uses the retired truncated, unversioned scheme. A complete one-to-one migration map now exists, but this wave does not silently rewrite the active IDs or authorize cross-case joins.\n\n\`\`\`text\nexternal repository:                   ${policy.external_reference.repository}\nexternal commit:                       ${policy.external_reference.commit}\nfixture bytes equal:                   true\nPython / Node runtime outputs equal:   true\ncanonicalization vectors:              ${vectorCounts.canonicalization}\nentity-ID vectors:                     ${vectorCounts.entity_ids}\nclaim-ID vectors:                      ${vectorCounts.claim_ids}\nentity migrations mapped:              ${entityMigrations.length}\nclaim migrations mapped:               ${claimMigrations.length}\nmigration map one-to-one:              true\nactive projection migrated:            false\ncross-case join authorized:            false\ndecisions requiring human permission:  0\n\`\`\`\n\n## Boundary\n\nReference-runtime parity closes the ambiguity about the target algorithm. It does not mutate the current projection, prove that two labels denote the same real-world entity, establish evidence truth, or create graph edges. The active migration remains a separate append-preserving execution wave.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('lake AXM reproducibility Wave 05 built');
console.log(`  vector cases: ${Object.values(vectorCounts).reduce((total, count) => total + count, 0)}`);
console.log(`  entity migrations: ${entityMigrations.length}`);
console.log(`  claim migrations: ${claimMigrations.length}`);
console.log('  Python / Node runtime outputs equal: true');
console.log('  active projection migrated: false');
console.log('  cross-case join authorized: false');
