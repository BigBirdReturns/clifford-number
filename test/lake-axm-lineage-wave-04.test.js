#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

const validation = spawnSync(process.execPath, ['tools/validate-lake-axm-lineage-wave-04.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-axm-lineage-wave-04-policy.json');
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const identity = readJson(policy.target_projection_path);
const registrations = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl');
const wave03Supersessions = readJsonl('data/project/lake-identifier-source-supersessions-wave-03.jsonl');
const supersessions = readJsonl(policy.supersession_ledger_path);

assert.equal(identity.scheme.status, 'provisional');
assert.equal(identity.claims.length, 164);
assert.equal(supersessions.length, 164);
assert.equal(receipt.superseded_identifier_registrations, 164);
assert.equal(plan.lineage.supersession_rows, 164);
assert.equal(reconciliation.after.supersession_rows, 164);
assert.equal(reconciliation.after.supersession_rows_with_indexed_source_occurrence, 164);
assert.equal(reconciliation.after.indexed_supersession_rows, 164);
assert.equal(reconciliation.after.unsuperseded_fallback_registrations, 0);
assert.equal(reconciliation.after.unsuperseded_wave02_native_source_debt, 0);
assert.equal(reconciliation.after.native_source_migration_debt, 0);
assert.equal(reconciliation.deltas.native_source_migration_debt, -164);
assert.equal(receipt.native_source_migration_debt_before, 164);
assert.equal(receipt.native_source_migration_debt_after, 0);
assert.equal(receipt.external_axm_reconciliation_complete, false);
assert.equal(receipt.cross_case_join_authorized, false);
assert.equal(receipt.decisions_requiring_human_permission, 0);

const identityClaimIds = identity.claims.map(row => row.claim_id).sort();
assert.deepEqual(supersessions.map(row => row.claim_id).sort(), identityClaimIds);
assert.equal(new Set(supersessions.map(row => row.supersession_key)).size, supersessions.length);
assert.ok(supersessions.every(row => row.identifier_key === 'claim_id' && row.identifier_value === row.claim_id));
assert.ok(supersessions.every(row => row.supersession_status === 'native_participation_lineage_materialized'));
assert.ok(supersessions.every(row => row.canonical_participation_path === 'data/ledger/participation.jsonl'));
assert.ok(supersessions.every(row => row.canonical_participation_row_count > 0));
assert.ok(supersessions.every(row => row.canonical_participation_rows.length === row.canonical_participation_row_count));
assert.ok(supersessions.every(row => /^[a-f0-9]{64}$/.test(row.canonical_participation_digest_sha256)));
assert.ok(supersessions.every(row => row.canonical_participation_rows.every(source => /^[a-f0-9]{64}$/.test(source.source_row_sha256))));
assert.ok(supersessions.every(row => row.prior_native_source_migration_required === true));
assert.ok(supersessions.every(row => row.current_native_source_migration_required === false));
assert.ok(supersessions.every(row => row.external_axm_reconciliation_required === true));
assert.ok(supersessions.every(row => row.cross_case_join_authorized === false));
assert.ok(supersessions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(supersessions.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(supersessions.every(row => row.graph_effect === 'none'));

const supersededPriorKeys = new Set([...wave03Supersessions, ...supersessions].map(row => row.prior_registration_key));
const remainingDebt = registrations.filter(row => row.native_source_migration_required === true && !supersededPriorKeys.has(row.registration_key));
assert.equal(wave03Supersessions.length, 448);
assert.equal(supersessions.length, 164);
assert.equal(supersededPriorKeys.size, 612);
assert.deepEqual(remainingDebt, []);

assert.equal(plan.completion.every_fallback_registration_superseded, true);
assert.equal(plan.completion.every_axm_claim_has_canonical_participation_lineage, true);
assert.equal(plan.completion.native_source_migration_debt_after_wave, 0);
assert.equal(plan.completion.external_axm_reconciliation_complete, false);
assert.equal(plan.completion.cross_case_join_authorized, false);
assert.equal(reconciliation.completion.wave02_native_source_migration_debt_complete, true);
assert.equal(reconciliation.completion.external_axm_reconciliation_complete, false);
assert.equal(reconciliation.completion.external_axm_gate_preserved, true);
assert.equal(reconciliation.completion.cross_case_join_authorized, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

assert.equal(policy.boundaries.participation_lineage_proves_evidence_truth, false);
assert.equal(policy.boundaries.participation_lineage_resolves_identity, false);
assert.equal(policy.boundaries.provisional_axm_id_is_externally_reconciled, false);
assert.equal(policy.boundaries.cross_case_join_authorized, false);
assert.equal(policy.boundaries.participates_in_claim_is_coordination_or_causation, false);
assert.equal(policy.boundaries.dense_surface_creates_pairwise_hop, false);
assert.equal(policy.boundaries.publication_cleared, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-axm-lineage-wave-04.test: OK (${supersessions.length} supersessions, 0 native-source debt, external AXM gate retained)`);
