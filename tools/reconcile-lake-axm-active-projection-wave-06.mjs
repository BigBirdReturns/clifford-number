#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/ledger.mjs';
import { buildIdentityLayer, resolveLocalId } from './lib/axm-identity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-active-projection-wave-06-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}

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

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const migration = readJson('build/axm-identity-genesis-v1-migration.json');
const active = readJson(policy.active_projection_path);
const registry = readJsonl(policy.migration_registry_path);
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const hopGraph = readJson('build/hop-graph.json');
const data = loadAll();
const namespace = readJson('cases.json').default_case_id;

const inputs = [
  policyPath,
  policy.plan_path,
  policy.migration_receipt_path,
  policy.migration_registry_path,
  'build/axm-identity-genesis-v1-migration.json',
  policy.active_projection_path,
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json',
  'build/hop-graph.json',
  'BUILD-INSTRUCTIONS.md',
  'README.md'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((left, right) => left.path.localeCompare(right.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

assert.equal(active.scheme?.status, policy.expected.active_scheme_status, 'active scheme status drift');
assert.equal(active.scheme?.version, 'axm-genesis-v1', 'active scheme version drift');
assert.equal(active.scheme?.external_commit, policy.external_reference.commit, 'active scheme external commit drift');
assert.equal(active.scheme?.namespace, namespace, 'active namespace drift');
assert.equal(active.scheme?.active_projection_migrated, true, 'active migration marker missing');
assert.equal(active.scheme?.legacy_provisional_ids_resolvable, true, 'legacy resolver marker missing');
assert.equal(active.scheme?.active_projection_quarantined, false, 'active projection remains quarantined');
assert.equal(active.scheme?.external_axm_gate_complete, true, 'external AXM gate is not complete');
assert.equal(active.scheme?.cross_case_join_authorized, false, 'cross-case join gate was opened');

const recomputed = buildIdentityLayer({
  namespace,
  actors: data.actors,
  organizations: data.organizations,
  surfaces: data.surfaces,
  participation: data.participation,
  aliases: data.aliases
});
assert.deepEqual({ scheme: active.scheme, entities: active.entities, claims: active.claims }, recomputed, 'active identity projection does not equal canonical Genesis v1 recomputation');

const entityRegistryRows = registry.filter(row => row.registry_row_type === 'entity_supersession');
const claimRegistryRows = registry.filter(row => row.registry_row_type === 'claim_supersession');
assert.equal(entityRegistryRows.length, policy.expected.entity_migrations, 'entity registry count drift');
assert.equal(claimRegistryRows.length, policy.expected.claim_migrations, 'claim registry count drift');
assert.equal(registry.length, policy.expected.migration_registry_rows, 'registry row count drift');

const registryEntityByLocal = new Map(entityRegistryRows.map(row => [row.local_id, row]));
const registryClaimByCurrent = new Map(claimRegistryRows.map(row => [row.claim_id, row]));
const activeEntityByLocal = new Map(active.entities.map(row => [row.local_id, row]));
const activeClaimByCurrent = new Map(active.claims.map(row => [row.claim_id, row]));
assert.equal(registryEntityByLocal.size, entityRegistryRows.length, 'duplicate entity registry local IDs');
assert.equal(registryClaimByCurrent.size, claimRegistryRows.length, 'duplicate current claim registry IDs');
assert.equal(activeEntityByLocal.size, active.entities.length, 'duplicate active entity local IDs');
assert.equal(activeClaimByCurrent.size, active.claims.length, 'duplicate active current claim IDs');

let legacyEntityTokensResolved = 0;
let currentEntityTokensResolved = 0;
for (const entity of active.entities) {
  const row = registryEntityByLocal.get(entity.local_id);
  assert.ok(row, `${entity.local_id}: missing active identity registry row`);
  assert.equal(entity.axm_entity_id, row.axm_entity_id, `${entity.local_id}: current entity ID drift`);
  assert.equal(entity.legacy_provisional_entity_id, row.legacy_provisional_entity_id, `${entity.local_id}: legacy entity ID drift`);
  assert.deepEqual(entity.alias_axm_ids, row.alias_axm_ids, `${entity.local_id}: current alias drift`);
  assert.deepEqual(entity.legacy_provisional_alias_ids, row.legacy_provisional_alias_ids, `${entity.local_id}: legacy alias drift`);
  for (const token of [entity.axm_entity_id, ...(entity.alias_axm_ids ?? [])]) {
    assert.equal(resolveLocalId(active, token), entity.local_id, `${token}: current AXM token does not resolve`);
    currentEntityTokensResolved += 1;
  }
  for (const token of [entity.legacy_provisional_entity_id, ...(entity.legacy_provisional_alias_ids ?? [])]) {
    assert.equal(resolveLocalId(active, token), entity.local_id, `${token}: legacy AXM token does not resolve`);
    legacyEntityTokensResolved += 1;
  }
}
assert.equal(legacyEntityTokensResolved, policy.expected.legacy_entity_tokens_resolvable, 'legacy entity resolver count drift');
assert.equal(currentEntityTokensResolved, policy.expected.legacy_entity_tokens_resolvable, 'current entity resolver count drift');

const legacyClaimMap = new Map();
for (const claim of active.claims) {
  const row = registryClaimByCurrent.get(claim.claim_id);
  assert.ok(row, `${claim.claim_id}: missing active claim registry row`);
  assert.equal(claim.legacy_provisional_claim_id, row.legacy_provisional_claim_id, `${claim.claim_id}: legacy claim predecessor drift`);
  assert.equal(claim.subj, row.subject_axm_entity_id, `${claim.claim_id}: current subject drift`);
  assert.equal(claim.legacy_provisional_subj, row.legacy_provisional_subject_axm_entity_id, `${claim.claim_id}: legacy subject drift`);
  assert.equal(claim.obj, row.object_axm_entity_id, `${claim.claim_id}: current object drift`);
  assert.equal(claim.legacy_provisional_obj, row.legacy_provisional_object_axm_entity_id, `${claim.claim_id}: legacy object drift`);
  assert.equal(claim.subj_local_id, row.subject_local_id, `${claim.claim_id}: subject local ID drift`);
  assert.equal(claim.obj_local_id, row.object_local_id, `${claim.claim_id}: object local ID drift`);
  assert.equal(claim.predicate, row.predicate, `${claim.claim_id}: predicate drift`);
  assert.equal(claim.obj_type, row.object_type, `${claim.claim_id}: object type drift`);
  assert.deepEqual(claim.windows, row.windows, `${claim.claim_id}: temporal or evidence payload drift`);
  assert.equal(stableDigest(claim.windows), row.temporal_windows_sha256, `${claim.claim_id}: temporal digest drift`);
  assert.ok(!legacyClaimMap.has(claim.legacy_provisional_claim_id), `${claim.legacy_provisional_claim_id}: duplicate legacy claim predecessor`);
  legacyClaimMap.set(claim.legacy_provisional_claim_id, claim.claim_id);
}
assert.equal(legacyClaimMap.size, policy.expected.legacy_claim_tokens_resolvable, 'legacy claim mapping count drift');

const migrationEntityByLocal = new Map(migration.entity_migrations.map(row => [row.local_id, row]));
for (const entity of active.entities) {
  const prior = migrationEntityByLocal.get(entity.local_id);
  assert.ok(prior, `${entity.local_id}: Wave 05 migration row missing`);
  assert.equal(entity.axm_entity_id, prior.genesis_v1_entity_id, `${entity.local_id}: Wave 05 successor mismatch`);
  assert.equal(entity.legacy_provisional_entity_id, prior.legacy_provisional_entity_id, `${entity.local_id}: Wave 05 predecessor mismatch`);
}
const migrationClaimByCurrent = new Map(migration.claim_migrations.map(row => [row.genesis_v1_claim_id, row]));
for (const claim of active.claims) {
  const prior = migrationClaimByCurrent.get(claim.claim_id);
  assert.ok(prior, `${claim.claim_id}: Wave 05 migration row missing`);
  assert.equal(claim.legacy_provisional_claim_id, prior.legacy_provisional_claim_id, `${claim.claim_id}: Wave 05 predecessor mismatch`);
  assert.equal(stableDigest(claim.windows), prior.temporal_windows_sha256, `${claim.claim_id}: Wave 05 temporal payload mismatch`);
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function requireSourceProjection(idKey, idValue, label) {
  const object = objectByKey.get(`${idKey}:${idValue}`);
  assert.ok(object, `${label}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${label}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${label}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${label}: registry index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.migration_registry_path && item.generated === false), `${label}: migration-registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.active_projection_path && item.generated === true), `${label}: active-projection occurrence missing`);
}
for (const entity of active.entities) {
  requireSourceProjection('axm_entity_id', entity.axm_entity_id, `entity ${entity.local_id}`);
  requireSourceProjection('legacy_provisional_entity_id', entity.legacy_provisional_entity_id, `legacy entity ${entity.local_id}`);
}
for (const claim of active.claims) {
  requireSourceProjection('claim_id', claim.claim_id, `claim ${claim.claim_id}`);
  requireSourceProjection('legacy_provisional_claim_id', claim.legacy_provisional_claim_id, `legacy claim ${claim.legacy_provisional_claim_id}`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
const registryFile = fileByPath.get(policy.migration_registry_path);
const receiptFile = fileByPath.get(policy.migration_receipt_path);
assert.ok(registryFile && receiptFile, 'Wave 06 source controls missing from lake file index');
assert.equal(registryFile.generated, false, 'Wave 06 migration registry marked generated');
assert.equal(registryFile.index_file, true, 'Wave 06 migration registry is not an index surface');
assert.equal(registryFile.authoritative_reachable, true, 'Wave 06 migration registry is not authoritative-reachable');
assert.equal(receiptFile.generated, false, 'Wave 06 migration receipt marked generated');
assert.equal(receiptFile.authoritative_reachable, true, 'Wave 06 migration receipt is not authoritative-reachable');

const hopGraphText = JSON.stringify(hopGraph);
assert.ok(!/"(?:axm_entity_id|legacy_provisional_entity_id|claim_id|legacy_provisional_claim_id)"/.test(hopGraphText), 'identity migration leaked into hop graph semantics');

const reconciliation = {
  schema_version: 'lake-axm-active-projection-wave-06-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: plan.before,
  after: {
    scheme_status: active.scheme.status,
    scheme_version: active.scheme.version,
    external_commit: active.scheme.external_commit,
    active_projection_migrated: active.scheme.active_projection_migrated,
    active_projection_quarantined: active.scheme.active_projection_quarantined,
    external_axm_gate_complete: active.scheme.external_axm_gate_complete,
    cross_case_join_authorized: active.scheme.cross_case_join_authorized,
    entity_rows: active.entities.length,
    alias_rows: active.entities.reduce((total, row) => total + row.alias_axm_ids.length, 0),
    claim_rows: active.claims.length,
    registry_rows: registry.length,
    legacy_entity_tokens_resolved: legacyEntityTokensResolved,
    current_entity_tokens_resolved: currentEntityTokensResolved,
    legacy_claim_tokens_mapped: legacyClaimMap.size,
    registry_current_entity_ids_source_and_projection_observed: active.entities.length,
    registry_legacy_entity_ids_source_and_projection_observed: active.entities.length,
    registry_current_claim_ids_source_and_projection_observed: active.claims.length,
    registry_legacy_claim_ids_source_and_projection_observed: active.claims.length,
    temporal_payload_changes: 0,
    evidence_payload_changes: 0,
    local_identifier_changes: 0,
    hop_graph_identity_fields: 0,
    global_machine_ids: summary.counts.distinct_machine_ids
  },
  deltas: {
    active_projection_migrated: 1,
    active_projection_quarantined: -1,
    external_axm_gate_complete: 1,
    current_entity_ids_activated: active.entities.length,
    current_claim_ids_activated: active.claims.length,
    predecessor_tokens_deleted: 0,
    temporal_payload_changes: 0,
    evidence_payload_changes: 0,
    graph_effects_created: 0,
    cross_case_join_authorizations: 0
  },
  decisions: [
    {
      decision_key: 'W06-RECONCILE-ACTIVE-PROJECTION',
      judgment: 'the_active_projection_exactly_matches_the_pinned_genesis_v1_recomputation_and_wave_05_successor_map',
      action: 'retain_genesis_v1_as_the_active_identity_projection',
      evidence_count: active.entities.length + active.claims.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W06-RECONCILE-PREDECESSORS',
      judgment: 'every_retired_entity_alias_and_claim_identifier_remains_uniquely_resolvable_or_mapped',
      action: 'retain_predecessor_fields_and_the_wave_06_registry',
      evidence_count: legacyEntityTokensResolved + legacyClaimMap.size,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W06-RECONCILE-CROSS-CASE-GATE',
      judgment: 'external_reconciliation_is_complete_but_no_multi_case_join_acceptance_fixture_has_run',
      action: 'keep_cross_case_join_authorized_false',
      evidence_count: active.claims.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    migration_registry_built: true,
    active_projection_rebuilt: true,
    migration_map_applied: true,
    active_projection_migrated: true,
    active_projection_quarantined: false,
    legacy_identifiers_resolvable: true,
    every_current_identifier_source_and_projection_observed: true,
    every_legacy_identifier_source_and_projection_observed: true,
    temporal_and_evidence_payloads_preserved: true,
    local_identifiers_preserved: true,
    external_axm_gate_complete: true,
    cross_case_join_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

const report = `# AXM active projection Wave 06 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nactive scheme:                              ${active.scheme.status}\nactive version:                             ${active.scheme.version}\nexternal commit:                            ${active.scheme.external_commit}\nentity IDs activated:                       ${active.entities.length}\nalias IDs activated:                        ${active.entities.reduce((total, row) => total + row.alias_axm_ids.length, 0)}\nclaim IDs activated:                        ${active.claims.length}\nregistry rows:                              ${registry.length}\nlegacy entity tokens resolved:              ${legacyEntityTokensResolved}\nlegacy claim tokens mapped:                 ${legacyClaimMap.size}\ntemporal payload changes:                   0\nevidence payload changes:                   0\nlocal identifier changes:                   0\nhop-graph identity fields:                  0\nactive projection migrated:                 true\nactive projection quarantined:              false\nexternal AXM gate complete:                 true\ncross-case join authorized:                 false\ndecisions requiring human permission:       0\n\`\`\`\n\n## Judgment\n\nThe active identity projection now uses the exact Genesis v1 successors proved in Wave 05. Every retired identifier remains attached to the same local object or claim as an explicit predecessor. Temporal and evidence payloads are unchanged, and identity fields remain absent from the hop graph.\n\n## Boundary\n\nThis closes the external reproducibility and active-projection migration gate. It does not establish real-world identity, merge same-label records, change any graph edge, or authorize cross-case joins. A separate multi-case acceptance fixture remains required.\n`;

writeJson(policy.reconciliation_path, reconciliation);
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('lake AXM active projection Wave 06 reconciled');
console.log(`  active entities: ${active.entities.length}`);
console.log(`  active claims: ${active.claims.length}`);
console.log(`  legacy entity tokens resolved: ${legacyEntityTokensResolved}`);
console.log(`  legacy claim tokens mapped: ${legacyClaimMap.size}`);
console.log('  external AXM gate complete: true');
console.log('  cross-case join authorized: false');
