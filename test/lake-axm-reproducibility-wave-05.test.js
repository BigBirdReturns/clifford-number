#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const validation = spawnSync(process.execPath, ['tools/validate-lake-axm-reproducibility-wave-05.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-axm-reproducibility-wave-05-policy.json');
const attestation = readJson(policy.runtime_attestation_path);
const receipt = readJson(policy.migration_receipt_path);
const plan = readJson(policy.plan_path);
const migration = readJson(policy.migration_map_path);
const reconciliation = readJson(policy.reconciliation_path);
const active = readJson('build/axm-identity.json');

assert.equal(attestation.external_commit, '411ef40e6cfc3ecb97ac3e256c8151be678347c8');
assert.equal(attestation.fixture_bytes_equal, true);
assert.equal(attestation.runtime_outputs_equal, true);
assert.equal(attestation.python_runtime_sha256, attestation.node_runtime_sha256);
assert.deepEqual(attestation.vector_counts, {
  canonicalization: 20,
  entity_ids: 12,
  claim_ids: 3,
  provenance_ids: 1,
  span_ids: 1
});

assert.equal(active.scheme.status, 'provisional');
assert.equal(migration.active_projection.migrated, false);
assert.equal(migration.active_projection.quarantined, true);
assert.equal(migration.target_projection.reference_runtime_parity_complete, true);
assert.equal(migration.target_projection.migrated, false);
assert.ok(migration.entity_migrations.length > 0);
assert.equal(migration.claim_migrations.length, 164);
assert.equal(migration.counts.changed_entity_ids, migration.entity_migrations.length);
assert.equal(migration.counts.changed_claim_ids, 164);
assert.equal(new Set(migration.entity_migrations.map(row => row.genesis_v1_entity_id)).size, migration.entity_migrations.length);
assert.equal(new Set(migration.claim_migrations.map(row => row.genesis_v1_claim_id)).size, 164);
assert.ok(migration.entity_migrations.every(row => /^e_[a-z2-7]{24}$/.test(row.legacy_provisional_entity_id)));
assert.ok(migration.entity_migrations.every(row => /^e1_[a-z2-7]{52}$/.test(row.genesis_v1_entity_id)));
assert.ok(migration.claim_migrations.every(row => /^c_[a-z2-7]{24}$/.test(row.legacy_provisional_claim_id)));
assert.ok(migration.claim_migrations.every(row => /^c1_[a-z2-7]{52}$/.test(row.genesis_v1_claim_id)));
assert.ok(migration.entity_migrations.every(row => row.legacy_provisional_entity_id !== row.genesis_v1_entity_id));
assert.ok(migration.claim_migrations.every(row => row.legacy_provisional_claim_id !== row.genesis_v1_claim_id));
assert.ok(migration.entity_migrations.every(row => row.active_projection_migrated === false && row.graph_effect === 'none'));
assert.ok(migration.claim_migrations.every(row => row.active_projection_migrated === false && row.graph_effect === 'none'));

assert.equal(receipt.fixture_bytes_equal, true);
assert.equal(receipt.python_and_node_runtime_outputs_equal, true);
assert.equal(receipt.migration_map_one_to_one, true);
assert.equal(receipt.active_projection_migrated, false);
assert.equal(receipt.cross_case_join_authorized, false);
assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.pinned_external_reference_reproduced, true);
assert.equal(plan.completion.complete_one_to_one_migration_map_built, true);
assert.equal(plan.completion.active_projection_migrated, false);
assert.equal(plan.completion.external_axm_gate_complete, false);
assert.equal(plan.completion.cross_case_join_authorized, false);
assert.equal(reconciliation.completion.pinned_external_reference_reproduced, true);
assert.equal(reconciliation.completion.shared_fixture_bytes_equal, true);
assert.equal(reconciliation.completion.python_and_node_runtime_outputs_equal, true);
assert.equal(reconciliation.completion.source_controls_indexed, true);
assert.equal(reconciliation.completion.complete_one_to_one_migration_map_built, true);
assert.equal(reconciliation.completion.active_projection_migrated, false);
assert.equal(reconciliation.completion.external_axm_gate_complete, false);
assert.equal(reconciliation.completion.cross_case_join_authorized, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

assert.equal(policy.boundaries.reference_runtime_parity_migrates_the_active_projection, false);
assert.equal(policy.boundaries.migration_map_authorizes_cross_case_join, false);
assert.equal(policy.boundaries.genesis_id_proves_entity_identity, false);
assert.equal(policy.boundaries.external_fixture_proves_evidence_truth, false);
assert.equal(policy.boundaries.active_projection_migrated, false);
assert.equal(policy.boundaries.cross_case_join_authorized, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-axm-reproducibility-wave-05.test: OK (${migration.entity_migrations.length} entities, 164 claims mapped, active projection still quarantined)`);
