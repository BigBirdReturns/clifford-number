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
const errors = [];
const fail = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
  catch (error) { fail(`${relative}: ${error.message}`); return null; }
}

function readJsonl(relative) {
  try {
    return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`line ${index + 1}: ${error.message}`); }
    });
  } catch (error) {
    fail(`${relative}: ${error.message}`);
    return [];
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const active = readJson(policy.active_projection_path);
const migration = readJson('build/axm-identity-genesis-v1-migration.json');
const registry = readJsonl(policy.migration_registry_path);
const objects = readJsonl('build/lake-index/objects.jsonl');
const files = readJsonl('build/lake-index/files.jsonl');
const hopGraph = readJson('build/hop-graph.json');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

if (policy.schema_version !== 'lake-axm-active-projection-wave-06-policy@1') fail('unexpected Wave 06 policy schema');
if (plan?.schema_version !== 'lake-axm-active-projection-wave-06-plan@1') fail('unexpected Wave 06 plan schema');
if (receipt?.schema_version !== 'lake-axm-active-projection-wave-06@1') fail('unexpected Wave 06 receipt schema');
if (reconciliation?.schema_version !== 'lake-axm-active-projection-wave-06-reconciliation@1') fail('unexpected Wave 06 reconciliation schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key) fail('Wave 06 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 06 plan source fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 06 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 06 reconciliation fingerprint mismatch');

if (active?.scheme?.status !== policy.expected.active_scheme_status) fail('active scheme status drift');
if (active?.scheme?.version !== 'axm-genesis-v1') fail('active scheme version drift');
if (active?.scheme?.external_commit !== policy.external_reference.commit) fail('active external commit pin drift');
if (active?.scheme?.active_projection_migrated !== true) fail('active projection migration marker missing');
if (active?.scheme?.legacy_provisional_ids_resolvable !== true) fail('legacy resolver marker missing');
if (active?.scheme?.active_projection_quarantined !== false) fail('active projection remains quarantined');
if (active?.scheme?.external_axm_gate_complete !== true) fail('external AXM gate is not complete');
if (active?.scheme?.cross_case_join_authorized !== false) fail('cross-case join gate opened');

try {
  const data = loadAll();
  const namespace = readJson('cases.json')?.default_case_id;
  const recomputed = buildIdentityLayer({
    namespace,
    actors: data.actors,
    organizations: data.organizations,
    surfaces: data.surfaces,
    participation: data.participation,
    aliases: data.aliases
  });
  assert.deepEqual({ scheme: active.scheme, entities: active.entities, claims: active.claims }, recomputed);
} catch (error) {
  fail(`active projection canonical recomputation failed: ${error.message}`);
}

const entityRows = registry.filter(row => row.registry_row_type === 'entity_supersession');
const claimRows = registry.filter(row => row.registry_row_type === 'claim_supersession');
if (entityRows.length !== policy.expected.entity_migrations) fail('entity registry count drift');
if (claimRows.length !== policy.expected.claim_migrations) fail('claim registry count drift');
if (registry.length !== policy.expected.migration_registry_rows) fail('migration registry count drift');
if (new Set(registry.map(row => row.registry_key)).size !== registry.length) fail('duplicate Wave 06 registry key');
if (new Set(entityRows.map(row => row.axm_entity_id)).size !== entityRows.length) fail('current entity registry is not one-to-one');
if (new Set(entityRows.map(row => row.legacy_provisional_entity_id)).size !== entityRows.length) fail('legacy entity registry is not one-to-one');
if (new Set(claimRows.map(row => row.claim_id)).size !== claimRows.length) fail('current claim registry is not one-to-one');
if (new Set(claimRows.map(row => row.legacy_provisional_claim_id)).size !== claimRows.length) fail('legacy claim registry is not one-to-one');

const entityRegistryByLocal = new Map(entityRows.map(row => [row.local_id, row]));
const claimRegistryByCurrent = new Map(claimRows.map(row => [row.claim_id, row]));
let currentEntityTokens = 0;
let legacyEntityTokens = 0;
for (const entity of active?.entities ?? []) {
  const row = entityRegistryByLocal.get(entity.local_id);
  if (!row) { fail(`${entity.local_id}: registry row missing`); continue; }
  if (!/^e1_[a-z2-7]{52}$/.test(entity.axm_entity_id)) fail(`${entity.local_id}: malformed Genesis entity ID`);
  if (!/^e_[a-z2-7]{24}$/.test(entity.legacy_provisional_entity_id)) fail(`${entity.local_id}: malformed legacy entity ID`);
  if (entity.axm_entity_id === entity.legacy_provisional_entity_id) fail(`${entity.local_id}: entity did not migrate`);
  try {
    assert.equal(entity.axm_entity_id, row.axm_entity_id);
    assert.equal(entity.legacy_provisional_entity_id, row.legacy_provisional_entity_id);
    assert.deepEqual(entity.alias_axm_ids, row.alias_axm_ids);
    assert.deepEqual(entity.legacy_provisional_alias_ids, row.legacy_provisional_alias_ids);
  } catch (error) { fail(`${entity.local_id}: registry mismatch: ${error.message}`); }
  for (const token of [entity.axm_entity_id, ...(entity.alias_axm_ids ?? [])]) {
    if (!/^e1_[a-z2-7]{52}$/.test(token)) fail(`${entity.local_id}: malformed current entity token ${token}`);
    if (resolveLocalId(active, token) !== entity.local_id) fail(`${entity.local_id}: current token does not resolve ${token}`);
    currentEntityTokens += 1;
  }
  for (const token of [entity.legacy_provisional_entity_id, ...(entity.legacy_provisional_alias_ids ?? [])]) {
    if (!/^e_[a-z2-7]{24}$/.test(token)) fail(`${entity.local_id}: malformed legacy entity token ${token}`);
    if (resolveLocalId(active, token) !== entity.local_id) fail(`${entity.local_id}: legacy token does not resolve ${token}`);
    legacyEntityTokens += 1;
  }
}
if (currentEntityTokens !== policy.expected.legacy_entity_tokens_resolvable) fail('current entity resolver count drift');
if (legacyEntityTokens !== policy.expected.legacy_entity_tokens_resolvable) fail('legacy entity resolver count drift');

const entityByLocal = new Map((active?.entities ?? []).map(row => [row.local_id, row]));
const migrationClaimByCurrent = new Map((migration?.claim_migrations ?? []).map(row => [row.genesis_v1_claim_id, row]));
for (const claim of active?.claims ?? []) {
  const row = claimRegistryByCurrent.get(claim.claim_id);
  const mapped = migrationClaimByCurrent.get(claim.claim_id);
  if (!row) { fail(`${claim.claim_id}: registry row missing`); continue; }
  if (!mapped) { fail(`${claim.claim_id}: Wave 05 migration row missing`); continue; }
  if (!/^c1_[a-z2-7]{52}$/.test(claim.claim_id)) fail(`${claim.claim_id}: malformed Genesis claim ID`);
  if (!/^c_[a-z2-7]{24}$/.test(claim.legacy_provisional_claim_id)) fail(`${claim.claim_id}: malformed legacy claim ID`);
  if (claim.claim_id === claim.legacy_provisional_claim_id) fail(`${claim.claim_id}: claim did not migrate`);
  const subject = entityByLocal.get(claim.subj_local_id);
  const object = entityByLocal.get(claim.obj_local_id);
  if (!subject || !object) fail(`${claim.claim_id}: endpoint entity missing`);
  if (subject && (claim.subj !== subject.axm_entity_id || claim.legacy_provisional_subj !== subject.legacy_provisional_entity_id)) fail(`${claim.claim_id}: subject endpoint drift`);
  if (object && (claim.obj !== object.axm_entity_id || claim.legacy_provisional_obj !== object.legacy_provisional_entity_id)) fail(`${claim.claim_id}: object endpoint drift`);
  if (claim.legacy_provisional_claim_id !== row.legacy_provisional_claim_id) fail(`${claim.claim_id}: registry predecessor drift`);
  if (stableDigest(claim.windows) !== row.temporal_windows_sha256) fail(`${claim.claim_id}: registry temporal digest drift`);
  if (stableDigest(claim.windows) !== mapped.temporal_windows_sha256) fail(`${claim.claim_id}: Wave 05 temporal digest drift`);
  try { assert.deepEqual(claim.windows, row.windows); } catch (error) { fail(`${claim.claim_id}: temporal/evidence payload drift: ${error.message}`); }
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function validateLakeObject(idKey, idValue, label) {
  const object = objectByKey.get(`${idKey}:${idValue}`);
  if (!object) { fail(`${label}: lake object missing`); return; }
  if (object.source_occurrence !== true) fail(`${label}: source occurrence missing`);
  if (object.projection_occurrence !== true) fail(`${label}: projection occurrence missing`);
  if (object.indexed !== true) fail(`${label}: index occurrence missing`);
  if (!object.occurrences.some(item => item.path === policy.migration_registry_path && item.generated === false)) fail(`${label}: registry occurrence missing`);
  if (!object.occurrences.some(item => item.path === policy.active_projection_path && item.generated === true)) fail(`${label}: active projection occurrence missing`);
}
for (const row of entityRows) {
  validateLakeObject('axm_entity_id', row.axm_entity_id, `entity ${row.local_id}`);
  validateLakeObject('legacy_provisional_entity_id', row.legacy_provisional_entity_id, `legacy entity ${row.local_id}`);
}
for (const row of claimRows) {
  validateLakeObject('claim_id', row.claim_id, `claim ${row.claim_id}`);
  validateLakeObject('legacy_provisional_claim_id', row.legacy_provisional_claim_id, `legacy claim ${row.legacy_provisional_claim_id}`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.migration_registry_path, policy.migration_receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.migration_registry_path)?.index_file !== true) fail('Wave 06 registry is not an index surface');

if (/"(?:axm_entity_id|legacy_provisional_entity_id|claim_id|legacy_provisional_claim_id)"/.test(JSON.stringify(hopGraph))) fail('identity fields leaked into hop graph');
if (receipt?.entity_migrations !== policy.expected.entity_migrations || receipt?.claim_migrations !== policy.expected.claim_migrations || receipt?.migration_registry_rows !== policy.expected.migration_registry_rows) fail('Wave 06 receipt counts drift');
if (receipt?.temporal_payload_changes !== 0 || receipt?.evidence_payload_changes !== 0 || receipt?.local_identifier_changes !== 0) fail('Wave 06 receipt records forbidden semantic changes');
if (receipt?.active_projection_migrated !== true || receipt?.external_axm_gate_complete !== true || receipt?.cross_case_join_authorized !== false) fail('Wave 06 receipt completion boundary drift');
if (receipt?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('human-permission count drift');

if (reconciliation?.after?.scheme_status !== policy.expected.active_scheme_status) fail('reconciliation active scheme drift');
if (reconciliation?.after?.active_projection_migrated !== true || reconciliation?.after?.active_projection_quarantined !== false) fail('reconciliation active migration state drift');
if (reconciliation?.after?.external_axm_gate_complete !== true || reconciliation?.after?.cross_case_join_authorized !== false) fail('reconciliation external/join gate drift');
if (reconciliation?.after?.registry_rows !== policy.expected.migration_registry_rows) fail('reconciliation registry count drift');
if (reconciliation?.after?.legacy_entity_tokens_resolved !== policy.expected.legacy_entity_tokens_resolvable) fail('reconciliation legacy entity resolver drift');
if (reconciliation?.after?.legacy_claim_tokens_mapped !== policy.expected.legacy_claim_tokens_resolvable) fail('reconciliation legacy claim map drift');
for (const field of ['temporal_payload_changes', 'evidence_payload_changes', 'local_identifier_changes', 'hop_graph_identity_fields']) {
  if (reconciliation?.after?.[field] !== 0) fail(`reconciliation ${field} must be zero`);
}
for (const field of [
  'migration_registry_built',
  'active_projection_rebuilt',
  'migration_map_applied',
  'active_projection_migrated',
  'legacy_identifiers_resolvable',
  'every_current_identifier_source_and_projection_observed',
  'every_legacy_identifier_source_and_projection_observed',
  'temporal_and_evidence_payloads_preserved',
  'local_identifiers_preserved',
  'external_axm_gate_complete',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`completion ${field} missing`);
if (reconciliation?.completion?.active_projection_quarantined !== false || reconciliation?.completion?.cross_case_join_authorized !== false) fail('completion quarantine/join boundary drift');
if (reconciliation?.completion?.evidence_truth_determined !== false || reconciliation?.completion?.publication_cleared !== false) fail('completion overclaims truth or publication clearance');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.active_projection_migration_proves_entity_identity !== false) fail(`${name}: entity-identity boundary missing`);
  if (boundaries?.active_projection_migration_proves_evidence_truth !== false) fail(`${name}: evidence-truth boundary missing`);
  if (boundaries?.legacy_identifier_resolution_merges_entities !== false) fail(`${name}: legacy-resolution boundary missing`);
  if (boundaries?.genesis_identifier_authorizes_cross_case_join !== false) fail(`${name}: join-authority boundary missing`);
  if (boundaries?.external_axm_gate_complete !== true || boundaries?.active_projection_migrated !== true) fail(`${name}: active/external completion boundary drift`);
  if (boundaries?.cross_case_join_authorized !== false || boundaries?.graph_effect !== 'none') fail(`${name}: join/graph boundary drift`);
}

if (!/AXM identity reconciliation — completed 2026-07-29/.test(buildInstructions)) fail('BUILD-INSTRUCTIONS does not record AXM reconciliation completion');
if (!/Cross-case joins remain disabled/.test(buildInstructions)) fail('BUILD-INSTRUCTIONS cross-case gate missing');
if (!/Temporal identity layer \(AXM Genesis v1\)/.test(readme)) fail('README active identity section not migrated');
if (!/retired predecessor/.test(readme)) fail('README predecessor resolution contract missing');
if (!report.includes('active projection migration declared:  true')) fail('Wave 06 report lacks migration declaration');
if (!reconciliationReport.includes('external AXM gate complete:                 true')) fail('Wave 06 reconciliation report lacks external gate completion');
if (!reconciliationReport.includes('cross-case join authorized:                 false')) fail('Wave 06 reconciliation report lacks join boundary');

if (errors.length) {
  console.error(`lake AXM active projection Wave 06 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake AXM active projection Wave 06 validation: OK');
console.log(`  active entities: ${active.entities.length}`);
console.log(`  active claims: ${active.claims.length}`);
console.log(`  legacy entity tokens resolved: ${legacyEntityTokens}`);
console.log(`  legacy claim tokens mapped: ${claimRows.length}`);
console.log('  external AXM gate complete: true');
console.log('  cross-case join authorized: false');
