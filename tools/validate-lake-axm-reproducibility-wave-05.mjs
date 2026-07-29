#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalizeGenesisV1,
  deriveGenesisProvenanceId,
  deriveGenesisSpanId,
  recomputeGenesisClaimId,
  recomputeGenesisEntityId
} from './lib/axm-genesis-identity-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-reproducibility-wave-05-policy.json';
const full = relative => path.join(root, relative);
const errors = [];
const fail = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
  catch (error) { fail(`${relative}: ${error.message}`); return null; }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const migration = readJson(policy.migration_map_path);
const reconciliation = readJson(policy.reconciliation_path);
const vectors = readJson(policy.local_fixture_path);
const attestation = readJson(policy.runtime_attestation_path);
const activeIdentity = readJson('build/axm-identity.json');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');

if (policy.schema_version !== 'lake-axm-reproducibility-wave-05-policy@1') fail('unexpected Wave 05 policy schema');
if (plan?.schema_version !== 'lake-axm-reproducibility-wave-05-plan@1') fail('unexpected Wave 05 plan schema');
if (receipt?.schema_version !== 'lake-axm-reproducibility-wave-05@1') fail('unexpected Wave 05 receipt schema');
if (migration?.schema_version !== 'axm-identity-genesis-v1-migration@1') fail('unexpected Wave 05 migration schema');
if (reconciliation?.schema_version !== 'lake-axm-reproducibility-wave-05-reconciliation@1') fail('unexpected Wave 05 reconciliation schema');
if (attestation?.schema_version !== 'axm-genesis-v1-runtime-attestation@1') fail('unexpected runtime attestation schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key || migration?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key) fail('Wave 05 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 05 plan source fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 05 receipt and plan fingerprints disagree');
if (migration?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 05 migration and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 05 reconciliation fingerprint mismatch');

if (attestation?.external_repository !== policy.external_reference.repository) fail('external repository pin drift');
if (attestation?.external_commit !== policy.external_reference.commit) fail('external commit pin drift');
if (attestation?.identity_module_path !== policy.external_reference.identity_module_path) fail('external identity-module path drift');
if (attestation?.fixture_source_path !== policy.external_reference.fixture_path) fail('external fixture path drift');
if (attestation?.fixture_bytes_equal !== true) fail('external fixture bytes differ');
if (attestation?.runtime_outputs_equal !== true) fail('Python and Node runtime outputs differ');
if (attestation?.python_runtime_sha256 !== attestation?.node_runtime_sha256) fail('runtime output hashes differ');

try {
  for (const item of vectors?.canonicalization ?? []) {
    if (Object.hasOwn(item, 'expected')) assert.equal(canonicalizeGenesisV1(item.input), item.expected);
    else assert.throws(() => canonicalizeGenesisV1(item.input), /NUL/);
  }
  for (const item of vectors?.entity_ids ?? []) assert.equal(recomputeGenesisEntityId(item.namespace, item.label), item.expected_id);
  for (const item of vectors?.claim_ids ?? []) assert.equal(recomputeGenesisClaimId(item.subject, item.predicate, item.object, item.object_type), item.expected_id);
  for (const item of vectors?.provenance_ids ?? []) assert.equal(deriveGenesisProvenanceId(item.claim_id, item.source_hash, item.byte_start, item.byte_end), item.expected_id);
  for (const item of vectors?.span_ids ?? []) assert.equal(deriveGenesisSpanId(item.source_hash, item.byte_start, item.byte_end, item.text), item.expected_id);
} catch (error) {
  fail(`Genesis v1 vector reproduction failed: ${error.message}`);
}

const vectorCounts = {
  canonicalization: vectors?.canonicalization?.length ?? 0,
  entity_ids: vectors?.entity_ids?.length ?? 0,
  claim_ids: vectors?.claim_ids?.length ?? 0,
  provenance_ids: vectors?.provenance_ids?.length ?? 0,
  span_ids: vectors?.span_ids?.length ?? 0
};
if (vectorCounts.canonicalization !== policy.expected.canonicalization_vectors) fail('canonicalization vector count drift');
if (vectorCounts.entity_ids !== policy.expected.entity_id_vectors) fail('entity vector count drift');
if (vectorCounts.claim_ids !== policy.expected.claim_id_vectors) fail('claim vector count drift');
if (vectorCounts.provenance_ids !== policy.expected.provenance_id_vectors) fail('provenance vector count drift');
if (vectorCounts.span_ids !== policy.expected.span_id_vectors) fail('span vector count drift');
try { assert.deepEqual(attestation?.vector_counts, vectorCounts); } catch { fail('attestation vector counts drift'); }

if (activeIdentity?.scheme?.status !== 'provisional') fail('active projection is not the quarantined provisional scheme');
if (migration?.active_projection?.migrated !== false || migration?.active_projection?.quarantined !== true) fail('migration map overclaims active projection state');
if (migration?.target_projection?.reference_runtime_parity_complete !== true || migration?.target_projection?.migrated !== false) fail('target projection state drift');

const entityRows = migration?.entity_migrations ?? [];
const claimRows = migration?.claim_migrations ?? [];
if (entityRows.length === 0) fail('migration map has no entity rows');
if (claimRows.length !== policy.expected.legacy_claim_migrations) fail('claim migration row count drift');
if (new Set(entityRows.map(row => row.local_id)).size !== entityRows.length) fail('duplicate local entity migration');
if (new Set(entityRows.map(row => row.legacy_provisional_entity_id)).size !== entityRows.length) fail('duplicate legacy entity migration');
if (new Set(entityRows.map(row => row.genesis_v1_entity_id)).size !== entityRows.length) fail('Genesis entity migration is not one-to-one');
if (new Set(claimRows.map(row => row.legacy_provisional_claim_id)).size !== claimRows.length) fail('duplicate legacy claim migration');
if (new Set(claimRows.map(row => row.genesis_v1_claim_id)).size !== claimRows.length) fail('Genesis claim migration is not one-to-one');

const entityByLocal = new Map(entityRows.map(row => [row.local_id, row]));
for (const row of entityRows) {
  if (!/^e_[a-z2-7]{24}$/.test(row.legacy_provisional_entity_id)) fail(`${row.local_id}: malformed legacy entity ID`);
  if (!/^e1_[a-z2-7]{52}$/.test(row.genesis_v1_entity_id)) fail(`${row.local_id}: malformed Genesis entity ID`);
  if (row.legacy_provisional_entity_id === row.genesis_v1_entity_id) fail(`${row.local_id}: migration did not change the entity ID`);
  if (row.active_projection_migrated !== false || row.graph_effect !== 'none') fail(`${row.local_id}: entity migration boundary drift`);
  if (!(row.genesis_v1_alias_ids ?? []).every(id => /^e1_[a-z2-7]{52}$/.test(id))) fail(`${row.local_id}: malformed Genesis alias ID`);
}
for (const row of claimRows) {
  const subject = entityByLocal.get(row.subject_local_id);
  const object = entityByLocal.get(row.object_local_id);
  if (!subject || !object) fail(`${row.legacy_provisional_claim_id}: entity migration missing`);
  if (!/^c_[a-z2-7]{24}$/.test(row.legacy_provisional_claim_id)) fail(`${row.legacy_provisional_claim_id}: malformed legacy claim ID`);
  if (!/^c1_[a-z2-7]{52}$/.test(row.genesis_v1_claim_id)) fail(`${row.legacy_provisional_claim_id}: malformed Genesis claim ID`);
  if (row.legacy_provisional_claim_id === row.genesis_v1_claim_id) fail(`${row.legacy_provisional_claim_id}: migration did not change the claim ID`);
  if (subject && row.genesis_v1_subject_id !== subject.genesis_v1_entity_id) fail(`${row.legacy_provisional_claim_id}: Genesis subject mismatch`);
  if (object && row.genesis_v1_object_id !== object.genesis_v1_entity_id) fail(`${row.legacy_provisional_claim_id}: Genesis object mismatch`);
  if (row.active_projection_migrated !== false || row.graph_effect !== 'none') fail(`${row.legacy_provisional_claim_id}: claim migration boundary drift`);
}

if (migration?.counts?.entity_migrations !== entityRows.length) fail('entity migration count summary drift');
if (migration?.counts?.claim_migrations !== claimRows.length) fail('claim migration count summary drift');
if (migration?.counts?.changed_entity_ids !== entityRows.length) fail('not every entity ID is recorded as changed');
if (migration?.counts?.changed_claim_ids !== claimRows.length) fail('not every claim ID is recorded as changed');
if (receipt?.fixture_bytes_equal !== true || receipt?.python_and_node_runtime_outputs_equal !== true || receipt?.migration_map_one_to_one !== true) fail('Wave 05 receipt parity state drift');
if (receipt?.active_projection_migrated !== false || receipt?.cross_case_join_authorized !== false) fail('Wave 05 receipt overclaims migration or join authority');

if (reconciliation?.after?.fixture_bytes_equal !== true || reconciliation?.after?.python_and_node_runtime_outputs_equal !== true) fail('reconciliation parity state drift');
if (reconciliation?.after?.entity_migration_one_to_one !== true || reconciliation?.after?.claim_migration_one_to_one !== true) fail('reconciliation migration-map state drift');
if (reconciliation?.after?.source_control_paths_ready !== true) fail('reconciliation source controls are not lake-reachable');
if (reconciliation?.after?.active_projection_migrated !== false || reconciliation?.after?.active_projection_quarantined !== true) fail('reconciliation active projection state drift');
if (reconciliation?.after?.external_axm_gate_complete !== false || reconciliation?.after?.cross_case_join_authorized !== false) fail('reconciliation overclaims AXM gate or join authority');
if (reconciliation?.completion?.pinned_external_reference_reproduced !== true) fail('pinned external reference completion missing');
if (reconciliation?.completion?.complete_one_to_one_migration_map_built !== true) fail('migration-map completion missing');
if (reconciliation?.completion?.active_projection_migrated !== false || reconciliation?.completion?.external_axm_gate_complete !== false || reconciliation?.completion?.cross_case_join_authorized !== false) fail('completion overclaims migration or join authority');
if (reconciliation?.completion?.evidence_truth_determined !== false || reconciliation?.completion?.publication_cleared !== false) fail('completion overclaims truth or publication clearance');
if (receipt?.decisions_requiring_human_permission !== 0 || plan?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('human-permission count drift');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['migration', migration?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.reference_runtime_parity_migrates_the_active_projection !== false) fail(`${name}: active migration boundary missing`);
  if (boundaries?.migration_map_authorizes_cross_case_join !== false) fail(`${name}: join-map boundary missing`);
  if (boundaries?.genesis_id_proves_entity_identity !== false) fail(`${name}: identity boundary missing`);
  if (boundaries?.external_fixture_proves_evidence_truth !== false) fail(`${name}: evidence-truth boundary missing`);
  if (boundaries?.active_projection_migrated !== false) fail(`${name}: active projection boundary drift`);
  if (boundaries?.cross_case_join_authorized !== false) fail(`${name}: cross-case boundary drift`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph boundary drift`);
}

if (!/AXM identity reconciliation[\s\S]*byte-for-byte against `axm-genesis`/i.test(buildInstructions) || !/no cross-case join ships/i.test(buildInstructions)) fail('constitutional AXM gate is not preserved');
if (!report.includes('Python / Node runtime outputs equal:   true')) fail('Wave 05 report lacks runtime parity');
if (!report.includes('active projection migrated:            false')) fail('Wave 05 report lacks active migration boundary');
if (!reconciliationReport.includes('cross-case join authorized:                false')) fail('reconciliation report lacks cross-case boundary');

if (errors.length) {
  console.error(`lake AXM reproducibility Wave 05 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake AXM reproducibility Wave 05 validation: OK');
console.log(`  entity migrations: ${entityRows.length}`);
console.log(`  claim migrations: ${claimRows.length}`);
console.log('  Python / Node runtime outputs equal: true');
console.log('  active projection migrated: false');
console.log('  external AXM gate complete: false');
console.log('  cross-case join authorized: false');
