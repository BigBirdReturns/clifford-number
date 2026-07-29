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

function readJsonl(relative, optional = false) {
  if (optional && !fs.existsSync(full(relative))) return [];
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

function extensionRegistryPaths() {
  const directory = full('data/project');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(name => /^lake-canonical-identity-extension-registry-wave-\d+\.jsonl$/.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map(name => `data/project/${name}`);
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
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const active = readJson(policy.active_projection_path);
const migration = readJson('build/axm-identity-genesis-v1-migration.json');
const baselineRegistry = readJsonl(policy.migration_registry_path);
const extensionPaths = extensionRegistryPaths();
const extensionEntries = extensionPaths.flatMap(sourcePath => readJsonl(sourcePath).map(row => ({ row, sourcePath })));
const extensionRegistry = extensionEntries.map(entry => entry.row);
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

const baselineEntityRows = baselineRegistry.filter(row => row.registry_row_type === 'entity_supersession');
const baselineClaimRows = baselineRegistry.filter(row => row.registry_row_type === 'claim_supersession');
if (baselineEntityRows.length !== policy.expected.entity_migrations) fail('baseline entity registry count drift');
if (baselineClaimRows.length !== policy.expected.claim_migrations) fail('baseline claim registry count drift');
if (baselineRegistry.length !== policy.expected.migration_registry_rows) fail('baseline migration registry count drift');
if (new Set(baselineRegistry.map(row => row.registry_key)).size !== baselineRegistry.length) fail('duplicate Wave 06 registry key');

const extensionEntityEntries = extensionEntries.filter(entry => entry.row.registry_row_type === 'entity_extension');
const extensionAliasEntries = extensionEntries.filter(entry => entry.row.registry_row_type === 'alias_extension');
const extensionEntityRows = extensionEntityEntries.map(entry => entry.row);
const extensionAliasRows = extensionAliasEntries.map(entry => entry.row);
if (new Set(extensionRegistry.map(row => row.registry_key)).size !== extensionRegistry.length) fail('duplicate post-Wave-06 extension registry key');
for (const { row, sourcePath } of extensionEntries) {
  if (row.active_projection_extension !== true) fail(`${sourcePath}:${row.registry_key}: extension marker missing`);
  if (row.external_axm_gate_complete !== true || row.cross_case_join_authorized !== false) fail(`${sourcePath}:${row.registry_key}: external/join gate drift`);
  const bridgeValue = row.accepted_cross_case_identity_bridge ?? row.accepted_identity_bridge;
  if (bridgeValue !== false || row.participation_created !== false || row.graph_effect !== 'none') fail(`${sourcePath}:${row.registry_key}: semantic effect drift`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession') fail(`${sourcePath}:${row.registry_key}: judgment contract drift`);
}

const baselineEntityByLocal = new Map(baselineEntityRows.map(row => [row.local_id, row]));
const extensionEntityEntryByLocal = new Map();
for (const entry of extensionEntityEntries) {
  const localId = entry.row.local_id;
  if (extensionEntityEntryByLocal.has(localId)) fail(`${localId}: duplicate extension entity across registries`);
  extensionEntityEntryByLocal.set(localId, entry);
  if (baselineEntityByLocal.has(localId)) fail(`${localId}: extension overlaps Wave 06 baseline entity`);
}
const aliasExtensionsByLocal = new Map();
for (const entry of extensionAliasEntries) {
  const localId = entry.row.canonical_id;
  if (!aliasExtensionsByLocal.has(localId)) aliasExtensionsByLocal.set(localId, []);
  aliasExtensionsByLocal.get(localId).push(entry);
}

const activeEntityByLocal = new Map((active?.entities ?? []).map(row => [row.local_id, row]));
if (activeEntityByLocal.size !== policy.expected.entity_migrations + extensionEntityRows.length) fail('active entity count does not equal Wave 06 baseline plus all append extensions');
if ((active?.claims ?? []).length !== policy.expected.claim_migrations) fail('post-Wave-06 canonical extension changed claim count');

let currentEntityTokens = 0;
let legacyEntityTokens = 0;
for (const entity of active?.entities ?? []) {
  const baseline = baselineEntityByLocal.get(entity.local_id);
  const extensionEntry = extensionEntityEntryByLocal.get(entity.local_id);
  if (!baseline && !extensionEntry) { fail(`${entity.local_id}: no Wave 06 baseline or append extension row`); continue; }
  const source = baseline ?? extensionEntry.row;
  if (!/^e1_[a-z2-7]{52}$/.test(entity.axm_entity_id)) fail(`${entity.local_id}: malformed Genesis entity ID`);
  if (!/^e_[a-z2-7]{24}$/.test(entity.legacy_provisional_entity_id)) fail(`${entity.local_id}: malformed legacy entity ID`);
  if (entity.axm_entity_id !== source.axm_entity_id) fail(`${entity.local_id}: current entity ID registry mismatch`);
  if (entity.legacy_provisional_entity_id !== source.legacy_provisional_entity_id) fail(`${entity.local_id}: legacy entity ID registry mismatch`);

  const aliasEntries = aliasExtensionsByLocal.get(entity.local_id) ?? [];
  const expectedCurrentAliases = uniqueSorted([...(source.alias_axm_ids ?? []), ...aliasEntries.map(entry => entry.row.axm_alias_id)]);
  const expectedLegacyAliases = uniqueSorted([...(source.legacy_provisional_alias_ids ?? []), ...aliasEntries.map(entry => entry.row.legacy_provisional_alias_id)]);
  try {
    assert.deepEqual(entity.alias_axm_ids, expectedCurrentAliases);
    assert.deepEqual(entity.legacy_provisional_alias_ids, expectedLegacyAliases);
  } catch (error) { fail(`${entity.local_id}: alias extension mismatch: ${error.message}`); }

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
if (currentEntityTokens !== legacyEntityTokens) fail('current and legacy entity resolver token counts disagree');
if (currentEntityTokens < policy.expected.legacy_entity_tokens_resolvable) fail('post-Wave-06 resolver lost baseline entity tokens');

const migrationEntityByLocal = new Map((migration?.entity_migrations ?? []).map(row => [row.local_id, row]));
for (const row of baselineEntityRows) {
  const mapped = migrationEntityByLocal.get(row.local_id);
  if (!mapped) { fail(`${row.local_id}: Wave 05 baseline migration row missing`); continue; }
  if (row.axm_entity_id !== mapped.genesis_v1_entity_id || row.legacy_provisional_entity_id !== mapped.legacy_provisional_entity_id) fail(`${row.local_id}: Wave 05/06 baseline entity mapping drift`);
}

const baselineClaimByCurrent = new Map(baselineClaimRows.map(row => [row.claim_id, row]));
const migrationClaimByCurrent = new Map((migration?.claim_migrations ?? []).map(row => [row.genesis_v1_claim_id, row]));
for (const claim of active?.claims ?? []) {
  const row = baselineClaimByCurrent.get(claim.claim_id);
  const mapped = migrationClaimByCurrent.get(claim.claim_id);
  if (!row || !mapped) { fail(`${claim.claim_id}: baseline claim registry or migration row missing`); continue; }
  if (claim.legacy_provisional_claim_id !== row.legacy_provisional_claim_id || claim.legacy_provisional_claim_id !== mapped.legacy_provisional_claim_id) fail(`${claim.claim_id}: claim predecessor drift`);
  if (stableDigest(claim.windows) !== row.temporal_windows_sha256 || stableDigest(claim.windows) !== mapped.temporal_windows_sha256) fail(`${claim.claim_id}: temporal digest drift`);
  try { assert.deepEqual(claim.windows, row.windows); } catch (error) { fail(`${claim.claim_id}: temporal/evidence payload drift: ${error.message}`); }
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function validateLakeObject(idKey, idValue, sourcePath, label) {
  const object = objectByKey.get(`${idKey}:${idValue}`);
  if (!object) { fail(`${label}: lake object missing`); return; }
  if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${label}: source/projection/index state drift`);
  if (!object.occurrences.some(item => item.path === sourcePath && item.generated === false)) fail(`${label}: source registry occurrence missing`);
  if (!object.occurrences.some(item => item.path === policy.active_projection_path && item.generated === true)) fail(`${label}: active projection occurrence missing`);
}
for (const row of baselineEntityRows) {
  validateLakeObject('axm_entity_id', row.axm_entity_id, policy.migration_registry_path, `baseline entity ${row.local_id}`);
  validateLakeObject('legacy_provisional_entity_id', row.legacy_provisional_entity_id, policy.migration_registry_path, `baseline legacy entity ${row.local_id}`);
}
for (const row of baselineClaimRows) {
  validateLakeObject('claim_id', row.claim_id, policy.migration_registry_path, `baseline claim ${row.claim_id}`);
  validateLakeObject('legacy_provisional_claim_id', row.legacy_provisional_claim_id, policy.migration_registry_path, `baseline legacy claim ${row.legacy_provisional_claim_id}`);
}
for (const entry of extensionEntityEntries) {
  validateLakeObject('axm_entity_id', entry.row.axm_entity_id, entry.sourcePath, `extension entity ${entry.row.local_id}`);
  validateLakeObject('legacy_provisional_entity_id', entry.row.legacy_provisional_entity_id, entry.sourcePath, `extension legacy entity ${entry.row.local_id}`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.migration_registry_path, policy.migration_receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== false || row.authoritative_reachable !== true) fail(`${relative}: baseline source-control state drift`);
}
if (fileByPath.get(policy.migration_registry_path)?.index_file !== true) fail('Wave 06 registry is not an index surface');
for (const relative of extensionPaths) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: extension registry missing from lake`);
  else if (row.generated !== false || row.authoritative_reachable !== true || row.index_file !== true) fail(`${relative}: extension registry source-control state drift`);
}

if (/"(?:axm_entity_id|legacy_provisional_entity_id|claim_id|legacy_provisional_claim_id)"/.test(JSON.stringify(hopGraph))) fail('identity fields leaked into hop graph');
if (receipt?.entity_migrations !== policy.expected.entity_migrations || receipt?.claim_migrations !== policy.expected.claim_migrations || receipt?.migration_registry_rows !== policy.expected.migration_registry_rows) fail('Wave 06 historical receipt counts drift');
if (receipt?.legacy_entity_tokens_resolvable !== policy.expected.legacy_entity_tokens_resolvable || receipt?.legacy_claim_tokens_resolvable !== policy.expected.legacy_claim_tokens_resolvable) fail('Wave 06 historical resolver counts drift');
if (receipt?.temporal_payload_changes !== 0 || receipt?.evidence_payload_changes !== 0 || receipt?.local_identifier_changes !== 0) fail('Wave 06 receipt records forbidden semantic changes');
if (receipt?.active_projection_migrated !== true || receipt?.external_axm_gate_complete !== true || receipt?.cross_case_join_authorized !== false) fail('Wave 06 receipt completion boundary drift');
if (receipt?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('human-permission count drift');

if (reconciliation?.after?.scheme_status !== policy.expected.active_scheme_status) fail('Wave 06 reconciliation active scheme drift');
if (reconciliation?.after?.registry_rows !== policy.expected.migration_registry_rows) fail('Wave 06 historical reconciliation registry count drift');
if (reconciliation?.after?.legacy_entity_tokens_resolved !== policy.expected.legacy_entity_tokens_resolvable) fail('Wave 06 historical reconciliation resolver drift');
if (reconciliation?.after?.legacy_claim_tokens_mapped !== policy.expected.legacy_claim_tokens_resolvable) fail('Wave 06 historical reconciliation claim map drift');
for (const field of ['temporal_payload_changes', 'evidence_payload_changes', 'local_identifier_changes', 'hop_graph_identity_fields']) {
  if (reconciliation?.after?.[field] !== 0) fail(`Wave 06 reconciliation ${field} drift`);
}
for (const field of ['active_projection_migrated', 'legacy_identifiers_resolvable', 'temporal_and_evidence_payloads_preserved', 'external_axm_gate_complete', 'post_execution_reconciliation_complete']) {
  if (reconciliation?.completion?.[field] !== true) fail(`Wave 06 completion ${field} missing`);
}
if (reconciliation?.completion?.cross_case_join_authorized !== false || reconciliation?.completion?.evidence_truth_determined !== false || reconciliation?.completion?.publication_cleared !== false) fail('Wave 06 completion boundary drift');

if (!/AXM identity/i.test(buildInstructions) || !/AXM Genesis v1/i.test(readme)) fail('Wave 06 documentation contract missing');
if (!report.includes('cross-case join authorized:              false')) fail('Wave 06 report join boundary missing');
if (!reconciliationReport.includes('cross-case join authorized:              false')) fail('Wave 06 reconciliation report join boundary missing');

if (errors.length) {
  console.error(`lake AXM active projection Wave 06 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake AXM active projection Wave 06 validation: OK');
console.log(`  baseline entities / claims: ${baselineEntityRows.length} / ${baselineClaimRows.length}`);
console.log(`  extension registries: ${extensionPaths.length}`);
console.log(`  extension entities / aliases: ${extensionEntityRows.length} / ${extensionAliasRows.length}`);
console.log(`  active entities / claims: ${active.entities.length} / ${active.claims.length}`);
console.log(`  current / legacy resolver tokens: ${currentEntityTokens} / ${legacyEntityTokens}`);
console.log('  cross-case joins: false');
