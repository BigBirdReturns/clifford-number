#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-identifier-repair-wave-02-policy.json';
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
      catch (error) { fail(`${relative}:${index + 1}: ${error.message}`); return null; }
    }).filter(Boolean);
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

function pair(key, value) {
  return `${key}\0${value}`;
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const registrations = readJsonl(policy.source_registry_path);
const summary = readJson('build/lake-index/summary.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
const idGaps = readJsonl('build/lake-index/id-gaps.jsonl');
const planReport = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const targetKeys = new Set(policy.target_identifier_keys ?? []);
const localKeys = new Set(policy.local_only_identifier_keys ?? []);

if (policy.schema_version !== 'lake-identifier-repair-wave-02-policy@1') fail('unexpected Wave 02 policy schema');
if (plan?.schema_version !== 'lake-identifier-repair-wave-02-plan@1') fail('unexpected Wave 02 plan schema');
if (receipt?.schema_version !== 'lake-identifier-repair-wave-02@1') fail('unexpected Wave 02 migration receipt schema');
if (reconciliation?.schema_version !== 'lake-identifier-repair-wave-02-reconciliation@1') fail('unexpected Wave 02 reconciliation schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key) fail('Wave 02 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 02 plan source fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('migration receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('reconciliation source fingerprint mismatch');

const registrationPairs = new Set();
const registrationKeys = new Set();
for (const row of registrations) {
  const rowPair = pair(row.identifier_key, row.identifier_value);
  if (row.schema_version !== 'lake-identifier-source-registration@1') fail(`${row.registration_key}: bad registration schema`);
  if (!targetKeys.has(row.identifier_key)) fail(`${row.registration_key}: identifier key is outside the Wave 02 target set`);
  if (localKeys.has(row.identifier_key)) fail(`${row.registration_key}: local identifier cannot be registered as a global source object`);
  if (row[row.identifier_key] !== row.identifier_value) fail(`${row.registration_key}: dynamic source identifier does not equal identifier_value`);
  if (!row.registration_key || registrationKeys.has(row.registration_key)) fail(`duplicate or missing registration_key ${row.registration_key}`);
  registrationKeys.add(row.registration_key);
  if (registrationPairs.has(rowPair)) fail(`${row.registration_key}: duplicate identifier registration ${row.identifier_key}:${row.identifier_value}`);
  registrationPairs.add(rowPair);
  if (!Array.isArray(row.projection_paths) || row.projection_paths.length === 0) fail(`${row.registration_key}: projection paths missing`);
  for (const relative of row.projection_paths ?? []) if (!fs.existsSync(full(relative))) fail(`${row.registration_key}: projection path missing: ${relative}`);
  if (!Array.isArray(row.source_locators) || row.source_locators.length === 0) fail(`${row.registration_key}: source locators missing`);
  for (const relative of row.source_locators ?? []) if (!fs.existsSync(full(relative))) fail(`${row.registration_key}: source locator missing: ${relative}`);
  if (!row.definition_scope?.includes('not_evidence_truth')) fail(`${row.registration_key}: truth boundary missing from definition scope`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.registration_key}: human-permission gate remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.registration_key}: append-preserving correction route missing`);
  if (row.graph_effect !== 'none') fail(`${row.registration_key}: registration created graph effect`);
  if (row.registration_status === policy.fallback_registration.registration_status && row.native_source_migration_required !== true) fail(`${row.registration_key}: unresolved registration must retain native migration debt`);
}

if (registrations.length !== plan?.registrations?.rows) fail('plan registration count mismatch');
if (registrations.length !== receipt?.registered_identifier_rows) fail('migration receipt registration count mismatch');
if (registrations.length !== reconciliation?.registration_state?.rows) fail('reconciliation registration count mismatch');
if (registrations.length < 1000) fail('Wave 02 registered too few explicit identifiers to close the declared high-volume frontier');
if (receipt?.decisions_requiring_human_permission !== 0) fail('migration receipt still requires human permission');
if (plan?.completion?.decisions_requiring_human_permission !== 0) fail('plan still requires human permission');
if (reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('reconciliation still requires human permission');

const objectByPair = new Map(objects.map(object => [pair(object.id_key, object.id_value), object]));
for (const row of registrations) {
  const object = objectByPair.get(pair(row.identifier_key, row.identifier_value));
  if (!object) {
    fail(`${row.registration_key}: registered object missing from rebuilt lake`);
    continue;
  }
  if (object.source_occurrence !== true) fail(`${row.registration_key}: registered object lacks source occurrence`);
  if (object.projection_occurrence !== true) fail(`${row.registration_key}: registered object lost its projection occurrence`);
  if (object.indexed !== true) fail(`${row.registration_key}: registered object is not index-addressable`);
}

const targetedRemaining = idGaps.filter(row => row.gap_class === policy.target_gap_class && targetKeys.has(row.id_key));
const localObjects = objects.filter(object => localKeys.has(object.id_key));
const localGaps = idGaps.filter(row => localKeys.has(row.id_key));
if (targetedRemaining.length !== 0) fail(`targeted projection-without-source rows remain: ${targetedRemaining.length}`);
if (localObjects.length !== 0) fail(`local identifiers remain in the global object index: ${localObjects.length}`);
if (localGaps.length !== 0) fail(`local identifiers remain in the global gap queue: ${localGaps.length}`);
if (summary?.boundaries?.bare_local_identifier_globally_joined !== false) fail('lake summary local identifier boundary missing');
if (summary?.boundaries?.projection_divergence_includes_source_shape_difference !== false) fail('lake summary projection divergence boundary missing');

if (reconciliation?.after?.targeted_explicit_projection_rows_remaining !== 0) fail('reconciliation did not close targeted explicit gaps');
if (reconciliation?.after?.local_identifier_objects_in_global_index !== 0) fail('reconciliation retained local objects globally');
if (reconciliation?.after?.local_identifier_rows_in_global_gap_queue !== 0) fail('reconciliation retained local gaps globally');
if (reconciliation?.after?.registered_rows_with_source_occurrence !== registrations.length) fail('not every registration has a source occurrence');
if (reconciliation?.after?.registered_rows_indexed !== registrations.length) fail('not every registration is indexed');
if (reconciliation?.completion?.all_targeted_explicit_projection_rows_registered !== true) fail('target registration completion flag missing');
if (reconciliation?.completion?.bare_local_id_removed_from_global_join_semantics !== true) fail('local identifier completion flag missing');
if (reconciliation?.completion?.every_registration_has_source_occurrence !== true) fail('source occurrence completion flag missing');
if (reconciliation?.completion?.semantic_lake_complete !== false || reconciliation?.completion?.evidence_truth_determined !== false) fail('Wave 02 overclaimed semantic completion or evidence truth');

for (const [name, boundaries] of [
  ['policy', policy.boundaries],
  ['plan', plan?.boundaries],
  ['receipt', receipt?.boundaries],
  ['reconciliation', reconciliation?.boundaries]
]) {
  if (boundaries?.source_registration_proves_evidence_truth !== false) fail(`${name}: source-registration truth boundary missing`);
  if (boundaries?.source_registration_resolves_identity !== false) fail(`${name}: identity-resolution boundary missing`);
  if (boundaries?.same_identifier_string_proves_same_entity !== false) fail(`${name}: same-string identity boundary missing`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph boundary drift`);
}

if (!planReport.includes('decisions requiring human permission:        0')) fail('Wave 02 report lacks zero-permission count');
if (!planReport.includes('Same-string recurrence is not identity resolution.')) fail('Wave 02 report lacks identity boundary');
if (!reconciliationReport.includes('targeted explicit projection rows after:   0')) fail('reconciliation report lacks closed-target count');
if (!reconciliationReport.includes('Native migration debt remains executable work rather than a wait state.')) fail('reconciliation report lacks no-wait migration boundary');

if (errors.length) {
  console.error(`lake identifier repair Wave 02 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake identifier repair Wave 02 validation: OK');
console.log(`  registered identifiers: ${registrations.length}`);
console.log(`  targeted gaps remaining: ${targetedRemaining.length}`);
console.log(`  local objects in global index: ${localObjects.length}`);
console.log(`  native migrations still required: ${reconciliation.registration_state.native_source_migrations_still_required}`);
console.log('  decisions requiring human permission: 0');
