#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolveLocalId } from '../tools/lib/axm-identity.mjs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function extensionRegistryPaths() {
  return fs.readdirSync('data/project')
    .filter(name => /^lake-canonical-identity-extension-registry-wave-\d+\.jsonl$/.test(name))
    .sort()
    .map(name => `data/project/${name}`);
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}

const validation = spawnSync(process.execPath, ['tools/validate-lake-axm-active-projection-wave-06.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-axm-active-projection-wave-06-policy.json');
const active = readJson(policy.active_projection_path);
const migration = readJson('build/axm-identity-genesis-v1-migration.json');
const baselineRegistry = readJsonl(policy.migration_registry_path);
const extensionPaths = extensionRegistryPaths();
const extensionRegistry = extensionPaths.flatMap(sourcePath => readJsonl(sourcePath).map(row => ({ ...row, __sourcePath: sourcePath })));
const receipt = readJson(policy.migration_receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);

assert.equal(active.scheme.status, 'reconciled_genesis_v1');
assert.equal(active.scheme.version, 'axm-genesis-v1');
assert.equal(active.scheme.external_commit, '411ef40e6cfc3ecb97ac3e256c8151be678347c8');
assert.equal(active.scheme.active_projection_migrated, true);
assert.equal(active.scheme.legacy_provisional_ids_resolvable, true);
assert.equal(active.scheme.active_projection_quarantined, false);
assert.equal(active.scheme.external_axm_gate_complete, true);
assert.equal(active.scheme.cross_case_join_authorized, false);

const baselineEntityRows = baselineRegistry.filter(row => row.registry_row_type === 'entity_supersession');
const baselineClaimRows = baselineRegistry.filter(row => row.registry_row_type === 'claim_supersession');
const extensionEntityRows = extensionRegistry.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliasRows = extensionRegistry.filter(row => row.registry_row_type === 'alias_extension');
assert.equal(baselineEntityRows.length, 176);
assert.equal(baselineClaimRows.length, 164);
assert.equal(baselineRegistry.length, 340);
assert.equal(active.entities.length, 176 + extensionEntityRows.length);
assert.equal(active.claims.length, 164);
assert.equal(new Set(baselineRegistry.map(row => row.registry_key)).size, 340);
assert.equal(new Set(extensionRegistry.map(row => row.registry_key)).size, extensionRegistry.length);
assert.ok(baselineRegistry.every(row => row.review_dependency.required_to_decide === false));
assert.ok(baselineRegistry.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(extensionRegistry.every(row => row.review_dependency.required_to_decide === false));
assert.ok(extensionRegistry.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(extensionRegistry.every(row => row.active_projection_extension === true));
assert.ok(extensionRegistry.every(row => row.cross_case_join_authorized === false));
assert.ok(extensionRegistry.every(row => (row.accepted_cross_case_identity_bridge ?? row.accepted_identity_bridge) === false));
assert.ok(extensionRegistry.every(row => row.participation_created === false));
assert.ok(extensionRegistry.every(row => row.graph_effect === 'none'));

const baselineByLocal = new Map(baselineEntityRows.map(row => [row.local_id, row]));
const extensionByLocal = new Map();
for (const row of extensionEntityRows) {
  assert.equal(extensionByLocal.has(row.local_id), false, `${row.local_id}: duplicate extension entity`);
  extensionByLocal.set(row.local_id, row);
}
const aliasExtensionsByLocal = new Map();
for (const row of extensionAliasRows) {
  if (!aliasExtensionsByLocal.has(row.canonical_id)) aliasExtensionsByLocal.set(row.canonical_id, []);
  aliasExtensionsByLocal.get(row.canonical_id).push(row);
}
const migrationByLocal = new Map(migration.entity_migrations.map(row => [row.local_id, row]));
let currentEntityTokens = 0;
let legacyEntityTokens = 0;
let canonicalEquivalentAliasRows = 0;
for (const entity of active.entities) {
  const baseline = baselineByLocal.get(entity.local_id);
  const extension = extensionByLocal.get(entity.local_id);
  assert.ok(baseline || extension, `${entity.local_id}: missing baseline or extension row`);
  const source = baseline ?? extension;
  if (baseline) {
    const mapped = migrationByLocal.get(entity.local_id);
    assert.ok(mapped);
    assert.equal(entity.axm_entity_id, mapped.genesis_v1_entity_id);
    assert.equal(entity.legacy_provisional_entity_id, mapped.legacy_provisional_entity_id);
  } else {
    assert.equal(entity.axm_entity_id, extension.axm_entity_id);
    assert.equal(entity.legacy_provisional_entity_id, extension.legacy_provisional_entity_id);
  }
  const aliasRows = aliasExtensionsByLocal.get(entity.local_id) ?? [];
  for (const row of aliasRows) {
    const currentCollapsesToPrimary = row.axm_alias_id === entity.axm_entity_id;
    const legacyCollapsesToPrimary = row.legacy_provisional_alias_id === entity.legacy_provisional_entity_id;
    assert.equal(currentCollapsesToPrimary, legacyCollapsesToPrimary, `${row.registry_key}: current/legacy alias collapse mismatch`);
    assert.ok(currentCollapsesToPrimary || entity.alias_axm_ids.includes(row.axm_alias_id), `${row.registry_key}: current alias token missing`);
    assert.ok(legacyCollapsesToPrimary || entity.legacy_provisional_alias_ids.includes(row.legacy_provisional_alias_id), `${row.registry_key}: legacy alias token missing`);
    if (currentCollapsesToPrimary) canonicalEquivalentAliasRows += 1;
  }
  const expectedCurrentAliases = uniqueSorted([
    ...(source.alias_axm_ids ?? []),
    ...aliasRows.map(row => row.axm_alias_id)
  ].filter(token => token !== entity.axm_entity_id));
  const expectedLegacyAliases = uniqueSorted([
    ...(source.legacy_provisional_alias_ids ?? []),
    ...aliasRows.map(row => row.legacy_provisional_alias_id)
  ].filter(token => token !== entity.legacy_provisional_entity_id));
  assert.deepEqual(entity.alias_axm_ids, expectedCurrentAliases);
  assert.deepEqual(entity.legacy_provisional_alias_ids, expectedLegacyAliases);
  for (const token of [entity.axm_entity_id, ...entity.alias_axm_ids]) {
    assert.equal(resolveLocalId(active, token), entity.local_id);
    currentEntityTokens += 1;
  }
  for (const token of [entity.legacy_provisional_entity_id, ...entity.legacy_provisional_alias_ids]) {
    assert.equal(resolveLocalId(active, token), entity.local_id);
    legacyEntityTokens += 1;
  }
}
assert.equal(currentEntityTokens, legacyEntityTokens);
assert.ok(currentEntityTokens >= 197);

const regentAlias = extensionAliasRows.find(row => row.canonical_id === 'regent-defense' && row.alias === 'Regent Defense');
if (regentAlias) {
  const regent = active.entities.find(row => row.local_id === 'regent-defense');
  assert.ok(regent);
  assert.equal(regentAlias.axm_alias_id, regent.axm_entity_id, 'case-only capitalization must collapse to the canonical current token');
  assert.equal(regentAlias.legacy_provisional_alias_id, regent.legacy_provisional_entity_id, 'case-only capitalization must collapse to the canonical predecessor token');
  assert.equal(regent.alias_axm_ids.includes(regent.axm_entity_id), false, 'primary current token must not be duplicated in alias_axm_ids');
  assert.equal(regent.legacy_provisional_alias_ids.includes(regent.legacy_provisional_entity_id), false, 'primary predecessor token must not be duplicated in legacy alias IDs');
}

const baselineClaimByCurrent = new Map(baselineClaimRows.map(row => [row.claim_id, row]));
const migrationClaimByCurrent = new Map(migration.claim_migrations.map(row => [row.genesis_v1_claim_id, row]));
for (const claim of active.claims) {
  const mapped = migrationClaimByCurrent.get(claim.claim_id);
  const registered = baselineClaimByCurrent.get(claim.claim_id);
  assert.ok(mapped && registered);
  assert.equal(claim.legacy_provisional_claim_id, mapped.legacy_provisional_claim_id);
  assert.equal(claim.legacy_provisional_claim_id, registered.legacy_provisional_claim_id);
  assert.deepEqual(claim.windows, registered.windows);
}

assert.equal(receipt.entity_migrations, 176);
assert.equal(receipt.alias_migrations, 21);
assert.equal(receipt.claim_migrations, 164);
assert.equal(receipt.migration_registry_rows, 340);
assert.equal(receipt.legacy_entity_tokens_resolvable, 197);
assert.equal(receipt.legacy_claim_tokens_resolvable, 164);
assert.equal(receipt.temporal_payload_changes, 0);
assert.equal(receipt.evidence_payload_changes, 0);
assert.equal(receipt.local_identifier_changes, 0);
assert.equal(receipt.active_projection_migrated, true);
assert.equal(receipt.external_axm_gate_complete, true);
assert.equal(receipt.cross_case_join_authorized, false);
assert.equal(receipt.decisions_requiring_human_permission, 0);

assert.equal(plan.migration.registry_rows, 340);
assert.equal(reconciliation.after.active_projection_migrated, true);
assert.equal(reconciliation.after.external_axm_gate_complete, true);
assert.equal(reconciliation.after.cross_case_join_authorized, false);
assert.equal(reconciliation.after.temporal_payload_changes, 0);
assert.equal(reconciliation.after.evidence_payload_changes, 0);
assert.equal(reconciliation.after.local_identifier_changes, 0);
assert.equal(reconciliation.after.hop_graph_identity_fields, 0);
assert.equal(reconciliation.completion.active_projection_migrated, true);
assert.equal(reconciliation.completion.legacy_identifiers_resolvable, true);
assert.equal(reconciliation.completion.external_axm_gate_complete, true);
assert.equal(reconciliation.completion.cross_case_join_authorized, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

console.log(`lake-axm-active-projection-wave-06.test: OK (176 baseline entities, ${extensionPaths.length} extension registries, ${extensionEntityRows.length} extensions, ${canonicalEquivalentAliasRows} canonical-equivalent aliases, 164 claims; joins disabled)`);
