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

const validation = spawnSync(process.execPath, ['tools/validate-lake-axm-active-projection-wave-06.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-axm-active-projection-wave-06-policy.json');
const active = readJson(policy.active_projection_path);
const migration = readJson('build/axm-identity-genesis-v1-migration.json');
const registry = readJsonl(policy.migration_registry_path);
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
assert.equal(active.entities.length, 176);
assert.equal(active.claims.length, 164);

const entityRows = registry.filter(row => row.registry_row_type === 'entity_supersession');
const claimRows = registry.filter(row => row.registry_row_type === 'claim_supersession');
assert.equal(entityRows.length, 176);
assert.equal(claimRows.length, 164);
assert.equal(registry.length, 340);
assert.equal(new Set(registry.map(row => row.registry_key)).size, 340);
assert.equal(new Set(entityRows.map(row => row.axm_entity_id)).size, 176);
assert.equal(new Set(entityRows.map(row => row.legacy_provisional_entity_id)).size, 176);
assert.equal(new Set(claimRows.map(row => row.claim_id)).size, 164);
assert.equal(new Set(claimRows.map(row => row.legacy_provisional_claim_id)).size, 164);
assert.ok(entityRows.every(row => /^e1_[a-z2-7]{52}$/.test(row.axm_entity_id)));
assert.ok(entityRows.every(row => /^e_[a-z2-7]{24}$/.test(row.legacy_provisional_entity_id)));
assert.ok(claimRows.every(row => /^c1_[a-z2-7]{52}$/.test(row.claim_id)));
assert.ok(claimRows.every(row => /^c_[a-z2-7]{24}$/.test(row.legacy_provisional_claim_id)));
assert.ok(registry.every(row => row.active_projection_migrated === true));
assert.ok(registry.every(row => row.external_axm_gate_complete === true));
assert.ok(registry.every(row => row.cross_case_join_authorized === false));
assert.ok(registry.every(row => row.review_dependency.required_to_decide === false));
assert.ok(registry.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(registry.every(row => row.graph_effect === 'none'));

const entityByLocal = new Map(active.entities.map(row => [row.local_id, row]));
const migrationByLocal = new Map(migration.entity_migrations.map(row => [row.local_id, row]));
let currentEntityTokens = 0;
let legacyEntityTokens = 0;
for (const entity of active.entities) {
  const mapped = migrationByLocal.get(entity.local_id);
  assert.ok(mapped);
  assert.equal(entity.axm_entity_id, mapped.genesis_v1_entity_id);
  assert.equal(entity.legacy_provisional_entity_id, mapped.legacy_provisional_entity_id);
  assert.deepEqual(entity.alias_axm_ids, mapped.genesis_v1_alias_ids);
  assert.deepEqual(entity.legacy_provisional_alias_ids, mapped.legacy_provisional_alias_ids);
  for (const token of [entity.axm_entity_id, ...entity.alias_axm_ids]) {
    assert.equal(resolveLocalId(active, token), entity.local_id);
    currentEntityTokens += 1;
  }
  for (const token of [entity.legacy_provisional_entity_id, ...entity.legacy_provisional_alias_ids]) {
    assert.equal(resolveLocalId(active, token), entity.local_id);
    legacyEntityTokens += 1;
  }
}
assert.equal(currentEntityTokens, 197);
assert.equal(legacyEntityTokens, 197);

const migrationClaimByCurrent = new Map(migration.claim_migrations.map(row => [row.genesis_v1_claim_id, row]));
const registryClaimByCurrent = new Map(claimRows.map(row => [row.claim_id, row]));
for (const claim of active.claims) {
  const mapped = migrationClaimByCurrent.get(claim.claim_id);
  const registered = registryClaimByCurrent.get(claim.claim_id);
  assert.ok(mapped && registered);
  assert.equal(claim.legacy_provisional_claim_id, mapped.legacy_provisional_claim_id);
  assert.equal(claim.legacy_provisional_claim_id, registered.legacy_provisional_claim_id);
  assert.equal(claim.subj, entityByLocal.get(claim.subj_local_id).axm_entity_id);
  assert.equal(claim.obj, entityByLocal.get(claim.obj_local_id).axm_entity_id);
  assert.equal(claim.legacy_provisional_subj, entityByLocal.get(claim.subj_local_id).legacy_provisional_entity_id);
  assert.equal(claim.legacy_provisional_obj, entityByLocal.get(claim.obj_local_id).legacy_provisional_entity_id);
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

assert.equal(plan.before.active_projection_migrated, false);
assert.equal(plan.before.active_projection_quarantined, true);
assert.equal(plan.before.external_axm_gate_complete, false);
assert.equal(plan.migration.registry_rows, 340);
assert.equal(reconciliation.after.active_projection_migrated, true);
assert.equal(reconciliation.after.active_projection_quarantined, false);
assert.equal(reconciliation.after.external_axm_gate_complete, true);
assert.equal(reconciliation.after.cross_case_join_authorized, false);
assert.equal(reconciliation.after.temporal_payload_changes, 0);
assert.equal(reconciliation.after.evidence_payload_changes, 0);
assert.equal(reconciliation.after.local_identifier_changes, 0);
assert.equal(reconciliation.after.hop_graph_identity_fields, 0);
assert.equal(reconciliation.completion.active_projection_migrated, true);
assert.equal(reconciliation.completion.legacy_identifiers_resolvable, true);
assert.equal(reconciliation.completion.temporal_and_evidence_payloads_preserved, true);
assert.equal(reconciliation.completion.external_axm_gate_complete, true);
assert.equal(reconciliation.completion.cross_case_join_authorized, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

assert.equal(policy.boundaries.active_projection_migration_proves_entity_identity, false);
assert.equal(policy.boundaries.active_projection_migration_proves_evidence_truth, false);
assert.equal(policy.boundaries.legacy_identifier_resolution_merges_entities, false);
assert.equal(policy.boundaries.genesis_identifier_authorizes_cross_case_join, false);
assert.equal(policy.boundaries.external_axm_gate_complete, true);
assert.equal(policy.boundaries.active_projection_migrated, true);
assert.equal(policy.boundaries.cross_case_join_authorized, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log('lake-axm-active-projection-wave-06.test: OK (176 entities, 164 claims active; 361 predecessor tokens retained; joins disabled)');
