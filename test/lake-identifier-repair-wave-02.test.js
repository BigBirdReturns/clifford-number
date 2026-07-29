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

const validation = spawnSync(process.execPath, ['tools/validate-lake-identifier-repair-wave-02.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-identifier-repair-wave-02-policy.json');
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const registrations = readJsonl(policy.source_registry_path);
const objects = readJsonl('build/lake-index/objects.jsonl');
const idGaps = readJsonl('build/lake-index/id-gaps.jsonl');
const targetKeys = new Set(policy.target_identifier_keys);

assert.ok(registrations.length >= 1000);
assert.equal(registrations.length, plan.before.targeted_explicit_projection_rows);
assert.equal(registrations.length, receipt.registered_identifier_rows);
assert.equal(registrations.length, reconciliation.registration_state.rows);
assert.deepEqual(new Set(registrations.map(row => row.identifier_key)), targetKeys);
assert.ok(registrations.every(row => row[row.identifier_key] === row.identifier_value));
assert.ok(registrations.every(row => row.review_dependency.required_to_decide === false));
assert.ok(registrations.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(registrations.every(row => row.graph_effect === 'none'));
assert.ok(registrations.some(row => row.native_source_migration_required === true));
assert.ok(registrations.some(row => row.native_source_migration_required === false));

assert.equal(objects.some(row => row.id_key === 'id'), false);
assert.equal(idGaps.some(row => row.id_key === 'id'), false);
assert.equal(idGaps.filter(row => row.gap_class === policy.target_gap_class && targetKeys.has(row.id_key)).length, 0);
assert.equal(reconciliation.after.targeted_explicit_projection_rows_remaining, 0);
assert.equal(reconciliation.after.local_identifier_objects_in_global_index, 0);
assert.equal(reconciliation.after.local_identifier_rows_in_global_gap_queue, 0);
assert.equal(reconciliation.after.registered_rows_with_source_occurrence, registrations.length);
assert.equal(reconciliation.after.registered_rows_indexed, registrations.length);
assert.equal(reconciliation.deltas.targeted_explicit_projection_rows, -registrations.length);
assert.equal(reconciliation.completion.all_targeted_explicit_projection_rows_registered, true);
assert.equal(reconciliation.completion.bare_local_id_removed_from_global_join_semantics, true);
assert.equal(reconciliation.completion.native_source_migrations_complete, false);
assert.equal(reconciliation.completion.semantic_lake_complete, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);
assert.equal(policy.boundaries.source_registration_proves_evidence_truth, false);
assert.equal(policy.boundaries.source_registration_resolves_identity, false);
assert.equal(policy.boundaries.same_identifier_string_proves_same_entity, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-identifier-repair-wave-02.test: OK (${registrations.length} registrations, 0 targeted gaps remaining)`);
