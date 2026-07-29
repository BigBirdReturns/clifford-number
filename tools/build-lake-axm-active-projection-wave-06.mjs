#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}

const implementationPaths = [
  'tools/lib/axm-genesis-identity-v1.mjs',
  'tools/lib/axm-id.mjs',
  'tools/lib/axm-identity.mjs',
  'tools/build-lake-axm-active-projection-wave-06.mjs',
  'tools/reconcile-lake-axm-active-projection-wave-06.mjs',
  'tools/validate-lake-axm-active-projection-wave-06.mjs',
  'test/axm-id.test.js',
  'test/axm-identity.test.js',
  'test/lake-axm-active-projection-wave-06.test.js'
];

const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-axm-active-projection-wave-06-policy@1') throw new Error('unsupported Wave 06 policy schema');
for (const relative of [...(policy.input_paths ?? []), ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 06 input: ${relative}`);
}

const inputPaths = [...new Set([policyPath, ...(policy.input_paths ?? []), ...implementationPaths])].sort();
const inputs = inputPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const activeBefore = readJson(policy.active_projection_path);
const migration = readJson('build/axm-identity-genesis-v1-migration.json');
const wave05 = readJson('build/lake-actions/axm-reproducibility-wave-05-reconciliation.json');
const attestation = readJson(policy.external_reference.runtime_attestation_path);
const wave04Rows = readJsonl('data/project/lake-identifier-source-supersessions-wave-04.jsonl');

assert.equal(activeBefore.scheme?.status, 'provisional', 'Wave 06 must start from the quarantined provisional projection');
assert.equal(activeBefore.scheme?.namespace, migration.namespace, 'active projection namespace drift');
assert.equal(migration.active_projection?.migrated, false, 'Wave 05 migration map no longer describes a pre-migration projection');
assert.equal(migration.target_projection?.reference_runtime_parity_complete, true, 'Wave 05 runtime parity is not complete');
assert.equal(wave05.completion?.complete_one_to_one_migration_map_built, true, 'Wave 05 migration-map completion missing');
assert.equal(wave05.completion?.active_projection_migrated, false, 'Wave 05 overclaims active migration');
assert.equal(attestation.runtime_outputs_equal, true, 'AXM Genesis runtime parity is not attested');
assert.equal(attestation.external_commit, policy.external_reference.commit, 'AXM Genesis commit pin drift');
assert.equal(migration.entity_migrations.length, policy.expected.entity_migrations, 'entity migration count drift');
assert.equal(migration.claim_migrations.length, policy.expected.claim_migrations, 'claim migration count drift');
assert.equal(migration.counts.alias_migrations, policy.expected.alias_migrations, 'alias migration count drift');

const activeEntitiesByLocal = new Map(activeBefore.entities.map(row => [row.local_id, row]));
const activeClaimsById = new Map(activeBefore.claims.map(row => [row.claim_id, row]));
const wave04ByClaimId = new Map(wave04Rows.map(row => [row.claim_id, row]));
assert.equal(activeEntitiesByLocal.size, activeBefore.entities.length, 'duplicate active entity local IDs');
assert.equal(activeClaimsById.size, activeBefore.claims.length, 'duplicate active provisional claim IDs');
assert.equal(wave04ByClaimId.size, wave04Rows.length, 'duplicate Wave 04 claim lineage rows');

const reviewDependency = {
  required_to_decide: false,
  effect: 'challenge_may_correct_a_mapping_or_payload_but_does_not_block_the_reversible_active_projection_migration'
};
const reversibility = {
  mode: 'append_preserving_supersession',
  correction_route: 'a_later_identity_reconciliation_may_supersede_this_row_without_deleting_the_legacy_identifier_or_canonical_source_record'
};

function entitySourcePath(kind) {
  if (kind === 'actor') return 'data/canonical/actors.json';
  if (kind === 'organization') return 'data/canonical/organizations.json';
  if (kind === 'surface') return 'data/ledger/surfaces.jsonl';
  throw new Error(`unsupported entity kind: ${kind}`);
}

const entityRows = migration.entity_migrations.map(item => {
  const active = activeEntitiesByLocal.get(item.local_id);
  assert.ok(active, `${item.local_id}: missing from active provisional projection`);
  assert.equal(active.kind, item.kind, `${item.local_id}: entity kind drift`);
  assert.equal(active.label, item.label, `${item.local_id}: entity label drift`);
  assert.equal(active.axm_entity_id, item.legacy_provisional_entity_id, `${item.local_id}: legacy entity ID drift`);
  assert.deepEqual(uniqueSorted(active.alias_axm_ids), uniqueSorted(item.legacy_provisional_alias_ids), `${item.local_id}: legacy alias set drift`);
  return {
    schema_version: 'lake-axm-active-identity-registry@1',
    registry_row_type: 'entity_supersession',
    registry_key: `AXMREG6-${sha256(Buffer.from(`entity\0${item.local_id}`)).slice(0, 20)}`,
    local_id: item.local_id,
    entity_kind: item.kind,
    label: item.label,
    axm_entity_id: item.genesis_v1_entity_id,
    legacy_provisional_entity_id: item.legacy_provisional_entity_id,
    alias_axm_ids: uniqueSorted(item.genesis_v1_alias_ids),
    legacy_provisional_alias_ids: uniqueSorted(item.legacy_provisional_alias_ids),
    canonical_source_path: entitySourcePath(item.kind),
    source_identity_scope: 'canonical_local_registry_object_to_content_addressed_identifier_projection',
    predecessor_status: 'retired_but_resolvable',
    current_status: 'active_axm_genesis_v1',
    active_projection_migrated: true,
    external_axm_gate_complete: true,
    cross_case_join_authorized: false,
    review_dependency: reviewDependency,
    reversibility,
    graph_effect: 'none'
  };
}).sort((left, right) => left.local_id.localeCompare(right.local_id));

const claimRows = migration.claim_migrations.map(item => {
  const active = activeClaimsById.get(item.legacy_provisional_claim_id);
  const lineage = wave04ByClaimId.get(item.legacy_provisional_claim_id);
  assert.ok(active, `${item.legacy_provisional_claim_id}: missing from active provisional projection`);
  assert.ok(lineage, `${item.legacy_provisional_claim_id}: missing Wave 04 native lineage`);
  assert.equal(active.subj_local_id, item.subject_local_id, `${item.legacy_provisional_claim_id}: subject local ID drift`);
  assert.equal(active.obj_local_id, item.object_local_id, `${item.legacy_provisional_claim_id}: object local ID drift`);
  assert.equal(active.subj, item.legacy_provisional_subject_id, `${item.legacy_provisional_claim_id}: legacy subject drift`);
  assert.equal(active.obj, item.legacy_provisional_object_id, `${item.legacy_provisional_claim_id}: legacy object drift`);
  assert.equal(active.predicate, item.predicate, `${item.legacy_provisional_claim_id}: predicate drift`);
  assert.equal(active.obj_type, item.object_type, `${item.legacy_provisional_claim_id}: object type drift`);
  assert.equal(stableDigest(active.windows), item.temporal_windows_sha256, `${item.legacy_provisional_claim_id}: temporal-window digest drift`);
  assert.deepEqual(active.windows, lineage.windows, `${item.legacy_provisional_claim_id}: Wave 04 lineage windows drift`);
  return {
    schema_version: 'lake-axm-active-identity-registry@1',
    registry_row_type: 'claim_supersession',
    registry_key: `AXMREG6-${sha256(Buffer.from(`claim\0${item.legacy_provisional_claim_id}`)).slice(0, 20)}`,
    claim_id: item.genesis_v1_claim_id,
    legacy_provisional_claim_id: item.legacy_provisional_claim_id,
    prior_lineage_supersession_key: lineage.supersession_key,
    prior_registration_key: lineage.prior_registration_key,
    predicate: item.predicate,
    subject_axm_entity_id: item.genesis_v1_subject_id,
    legacy_provisional_subject_axm_entity_id: item.legacy_provisional_subject_id,
    subject_local_id: item.subject_local_id,
    object_axm_entity_id: item.genesis_v1_object_id,
    legacy_provisional_object_axm_entity_id: item.legacy_provisional_object_id,
    object_local_id: item.object_local_id,
    object_type: item.object_type,
    windows: active.windows,
    temporal_windows_sha256: item.temporal_windows_sha256,
    canonical_participation_path: lineage.canonical_participation_path,
    canonical_participation_rows: lineage.canonical_participation_rows,
    canonical_participation_digest_sha256: lineage.canonical_participation_digest_sha256,
    evidence_classes: lineage.evidence_classes,
    receipt_ids: lineage.receipt_ids,
    predecessor_status: 'retired_but_resolvable',
    current_status: 'active_axm_genesis_v1',
    native_source_lineage_materialized: true,
    active_projection_migrated: true,
    external_axm_gate_complete: true,
    cross_case_join_authorized: false,
    definition_scope: 'identifier_migration_only_not_evidence_truth_entity_resolution_coordination_or_cross_case_join_authority',
    review_dependency: reviewDependency,
    reversibility,
    graph_effect: 'none'
  };
}).sort((left, right) => left.legacy_provisional_claim_id.localeCompare(right.legacy_provisional_claim_id));

const registryRows = [...entityRows, ...claimRows];
assert.equal(registryRows.length, policy.expected.migration_registry_rows, 'migration registry row count drift');
assert.equal(new Set(registryRows.map(row => row.registry_key)).size, registryRows.length, 'duplicate Wave 06 registry keys');
assert.equal(new Set(entityRows.map(row => row.axm_entity_id)).size, entityRows.length, 'current entity migration is not one-to-one');
assert.equal(new Set(claimRows.map(row => row.claim_id)).size, claimRows.length, 'current claim migration is not one-to-one');
assert.equal(entityRows.reduce((total, row) => total + row.legacy_provisional_alias_ids.length, entityRows.length), policy.expected.legacy_entity_tokens_resolvable, 'legacy entity token count drift');

writeJsonl(policy.migration_registry_path, registryRows);

const receipt = {
  schema_version: 'lake-axm-active-projection-wave-06@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  external_reference: policy.external_reference,
  migration_registry_path: policy.migration_registry_path,
  entity_migrations: entityRows.length,
  alias_migrations: migration.counts.alias_migrations,
  claim_migrations: claimRows.length,
  migration_registry_rows: registryRows.length,
  legacy_entity_tokens_resolvable: policy.expected.legacy_entity_tokens_resolvable,
  legacy_claim_tokens_resolvable: claimRows.length,
  temporal_payload_changes: 0,
  evidence_payload_changes: 0,
  local_identifier_changes: 0,
  active_projection_migrated: true,
  external_axm_gate_complete: true,
  cross_case_join_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.migration_receipt_path, receipt);

const plan = {
  schema_version: 'lake-axm-active-projection-wave-06-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    scheme_status: activeBefore.scheme.status,
    active_projection_migrated: false,
    active_projection_quarantined: true,
    external_axm_gate_complete: false,
    cross_case_join_authorized: false,
    entity_ids: activeBefore.entities.length,
    claim_ids: activeBefore.claims.length
  },
  migration: {
    registry_path: policy.migration_registry_path,
    registry_rows: registryRows.length,
    entity_rows: entityRows.length,
    alias_rows: migration.counts.alias_migrations,
    claim_rows: claimRows.length,
    predecessor_tokens_retained: policy.expected.legacy_entity_tokens_resolvable + policy.expected.legacy_claim_tokens_resolvable,
    one_to_one: true,
    temporal_payload_changes: 0,
    evidence_payload_changes: 0,
    local_identifier_changes: 0
  },
  decisions: [
    {
      decision_key: 'W06-ACTIVATE-GENESIS-V1',
      judgment: 'the_complete_one_to_one_wave_05_map_is_sufficient_to_migrate_the_active_projection_without_changing_source_semantics',
      action: 'switch_active_entity_and_claim_identifiers_to_their_pinned_genesis_v1_successors',
      evidence_count: entityRows.length + claimRows.length,
      review_dependency: reviewDependency,
      graph_effect: 'none'
    },
    {
      decision_key: 'W06-PRESERVE-PREDECESSORS',
      judgment: 'every_retired_provisional_identifier_must_remain_resolvable_after_activation',
      action: `write:${policy.migration_registry_path}`,
      evidence_count: policy.expected.legacy_entity_tokens_resolvable + policy.expected.legacy_claim_tokens_resolvable,
      review_dependency: reviewDependency,
      graph_effect: 'none'
    },
    {
      decision_key: 'W06-CROSS-CASE-GATE',
      judgment: 'active_genesis_ids_close_external_reconciliation_but_do_not_by_themselves_authorize_cross_case_joins',
      action: 'retain_cross_case_join_authorized_false_until_a_multi_case_acceptance_fixture_passes',
      evidence_count: claimRows.length,
      review_dependency: reviewDependency,
      graph_effect: 'none'
    }
  ],
  completion: {
    migration_registry_built: true,
    active_projection_source_migration_declared: true,
    active_projection_rebuilt: false,
    migration_map_applied: false,
    legacy_identifiers_resolvable: false,
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

const report = `# AXM active projection migration Wave 06\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Migration contract\n\nWave 05 proved the exact Genesis v1 successors. Wave 06 materializes the append-preserving predecessor/successor registry before rebuilding the active projection. No temporal window, evidence class, receipt, local registry ID, or graph edge may change.\n\n\`\`\`text\nentity migrations:                     ${entityRows.length}\nalias migrations:                      ${migration.counts.alias_migrations}\nclaim migrations:                      ${claimRows.length}\nregistry rows:                         ${registryRows.length}\nlegacy entity tokens retained:         ${policy.expected.legacy_entity_tokens_resolvable}\nlegacy claim tokens retained:          ${claimRows.length}\ntemporal payload changes permitted:    0\nevidence payload changes permitted:    0\nlocal identifier changes permitted:    0\nactive projection migration declared:  true\nexternal AXM gate target:              complete\ncross-case join authorized:            false\ndecisions requiring human permission:  0\n\`\`\`\n\n## Boundary\n\nThis migration changes machine identifiers, not the underlying evidence or graph. Retired identifiers remain resolver inputs and predecessor keys. Genesis v1 compatibility does not prove that two labels identify the same real-world entity and does not authorize cross-case joins.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('lake AXM active projection Wave 06 built');
console.log(`  entity migrations: ${entityRows.length}`);
console.log(`  alias migrations: ${migration.counts.alias_migrations}`);
console.log(`  claim migrations: ${claimRows.length}`);
console.log(`  registry rows: ${registryRows.length}`);
console.log('  active projection migration declared: true');
console.log('  cross-case join authorized: false');
