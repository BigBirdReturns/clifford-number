#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCaseLedger, loadCaseLedger, validateCaseLedger } from './lib/case-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-native-source-migration-wave-03-policy.json';
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

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function semanticDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
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
const supersessions = readJsonl(policy.supersession_ledger_path);
const priorRegistrations = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl');
const nativeData = loadCaseLedger(policy.native_case_directory);
const sourceValidationErrors = validateCaseLedger(nativeData);
const compiledFromSource = compileCaseLedger(nativeData);
const compiledArtifact = readJson(policy.legacy_compiled_path);
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const reportFrontier = readJson('build/report-frontier.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
const planReport = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const publicCatalogSource = fs.readFileSync(full('tools/build-public-catalog.mjs'), 'utf8');

if (policy.schema_version !== 'lake-native-source-migration-wave-03-policy@1') fail('unexpected Wave 03 policy schema');
if (plan?.schema_version !== 'lake-native-source-migration-wave-03-plan@1') fail('unexpected Wave 03 plan schema');
if (receipt?.schema_version !== 'lake-native-source-migration-wave-03@1') fail('unexpected Wave 03 migration receipt schema');
if (reconciliation?.schema_version !== 'lake-native-source-migration-wave-03-reconciliation@1') fail('unexpected Wave 03 reconciliation schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key) fail('Wave 03 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 03 plan source fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 03 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 03 reconciliation fingerprint mismatch');

for (const relative of policy.native_source_paths ?? []) if (!fs.existsSync(full(relative))) fail(`native source path missing: ${relative}`);
for (const entry of receipt?.native_source_files ?? []) {
  if (!fs.existsSync(full(entry.path))) {
    fail(`receipt source file missing: ${entry.path}`);
    continue;
  }
  const bytes = fs.readFileSync(full(entry.path));
  if (bytes.length !== entry.bytes) fail(`${entry.path}: source byte count drift`);
  if (sha256(bytes) !== entry.sha256) fail(`${entry.path}: source hash drift`);
}

if (sourceValidationErrors.length) for (const error of sourceValidationErrors) fail(`native case source: ${error}`);
if (semanticDigest(nativeData) !== receipt?.source_semantic_digest_sha256) fail('native source semantic digest drift');
try { assert.deepEqual(compiledArtifact, compiledFromSource); }
catch { fail('compiled UK-AI artifact is not the deterministic native case compilation'); }

for (const [field, rows] of [
  ['claims', nativeData.claims],
  ['events', nativeData.events],
  ['receipts', nativeData.receipts],
  ['relations', nativeData.relations],
  ['beacons', nativeData.beacons],
  ['trails', nativeData.trails]
]) if (rows.length !== policy.expected[field]) fail(`native ${field} count drift: ${rows.length}`);
if (!nativeData.receipts.every(row => row.evidence_class)) fail('a native receipt lacks evidence_class');
if (!nativeData.claims.every(row => !('receipts' in row) && !('value' in row))) fail('native claim source contains compiler hydration fields');
if (!nativeData.events.every(row => !('claims' in row))) fail('native event source contains compiler hydration fields');

const priorByKey = new Map(priorRegistrations.map(row => [row.registration_key, row]));
const sourceIds = new Set([
  ...nativeData.claims.map(row => pair('claim_id', row.claim_id)),
  ...nativeData.events.map(row => pair('event_id', row.event_id))
]);
const supersessionKeys = new Set();
const supersessionPairs = new Set();
for (const row of supersessions) {
  if (row.schema_version !== 'lake-identifier-source-supersession@1') fail(`${row.supersession_key}: bad supersession schema`);
  if (!row.supersession_key || supersessionKeys.has(row.supersession_key)) fail(`duplicate or missing supersession key ${row.supersession_key}`);
  supersessionKeys.add(row.supersession_key);
  const rowPair = pair(row.identifier_key, row.identifier_value);
  if (supersessionPairs.has(rowPair)) fail(`${row.supersession_key}: duplicate identifier supersession`);
  supersessionPairs.add(rowPair);
  if (!policy.target_identifier_keys.includes(row.identifier_key)) fail(`${row.supersession_key}: identifier key outside Wave 03 target`);
  if (!sourceIds.has(rowPair)) fail(`${row.supersession_key}: native source identifier missing`);
  const prior = priorByKey.get(row.prior_registration_key);
  if (!prior) fail(`${row.supersession_key}: prior registration missing`);
  else {
    if (prior.matched_rule_key !== policy.target_prior_rule) fail(`${row.supersession_key}: prior rule drift`);
    if (prior.identifier_key !== row.identifier_key || prior.identifier_value !== row.identifier_value) fail(`${row.supersession_key}: prior identifier mismatch`);
    if (prior.native_source_migration_required !== true) fail(`${row.supersession_key}: prior registration did not carry native migration debt`);
  }
  if (row.supersession_status !== 'native_source_materialized') fail(`${row.supersession_key}: bad supersession status`);
  if (row.prior_native_source_migration_required !== true || row.current_native_source_migration_required !== false) fail(`${row.supersession_key}: migration-state transition drift`);
  if (!row.native_source_record_path?.startsWith(`${policy.native_case_directory}/`)) fail(`${row.supersession_key}: native source path drift`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.supersession_key}: human-permission gate remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.supersession_key}: correction route missing`);
  if (row.graph_effect !== 'none') fail(`${row.supersession_key}: graph effect created`);
}
if (supersessions.length !== policy.expected.superseded_identifier_registrations) fail('supersession row count drift');
if (supersessions.length !== receipt?.counts?.superseded_identifier_registrations) fail('receipt supersession count drift');
if (supersessions.length !== reconciliation?.identifier_supersessions?.rows) fail('reconciliation supersession count drift');

const objectByPair = new Map(objects.map(object => [pair(object.id_key, object.id_value), object]));
for (const row of supersessions) {
  const object = objectByPair.get(pair(row.identifier_key, row.identifier_value));
  if (!object) {
    fail(`${row.supersession_key}: object missing from lake`);
    continue;
  }
  if (!(object.occurrences ?? []).some(occurrence => occurrence.path.startsWith(`${policy.native_case_directory}/`) && occurrence.generated !== true)) {
    fail(`${row.supersession_key}: native source occurrence missing from lake`);
  }
}

const nativeIndexEntry = caseIndex?.cases?.find(row => row.case_id === 'uk-ai-policy');
const catalogEntry = publicCatalog?.cases?.find(row => row.case_id === 'uk-ai-policy');
const frontierEntry = reportFrontier?.cases?.find(row => row.case_id === 'uk-ai-policy');
if (!nativeIndexEntry) fail('UK-AI native case missing from compiled case index');
if (!catalogEntry) fail('UK-AI case missing from public catalog');
if (frontierEntry?.case_state !== 'case_ledger') fail('report frontier still treats UK-AI as a legacy projection');
if (frontierEntry?.current_stage !== 'case_ledger') fail('UK-AI report frontier current stage drift');
if (frontierEntry?.next_transition !== 'structured_report_specification') fail('UK-AI report frontier next transition drift');
if (frontierEntry?.blockers?.includes('canonical_case_ledger_missing')) fail('closed case-ledger blocker remains');
if (!publicCatalogSource.includes('const nativeUkAiCase = (caseIndex.cases ?? []).find')) fail('public catalog does not prefer the native UK-AI case');

if (reconciliation?.source_validation?.errors?.length !== 0) fail('reconciliation records source validation errors');
if (reconciliation?.identifier_supersessions?.rows_with_native_source_occurrence !== supersessions.length) fail('not every supersession has a native source occurrence');
if (reconciliation?.identifier_supersessions?.current_native_source_migration_debt !== 164) fail('remaining native-source debt must be 164');
if (reconciliation?.completion?.native_source_validation_complete !== true) fail('native source validation completion missing');
if (reconciliation?.completion?.source_semantic_equivalence_proved !== true) fail('source semantic equivalence completion missing');
if (reconciliation?.completion?.native_case_indexed !== true) fail('native case index completion missing');
if (reconciliation?.completion?.report_frontier_case_ledger_transition_complete !== true) fail('case-ledger frontier transition completion missing');
if (reconciliation?.completion?.every_targeted_registration_has_native_source_occurrence !== true) fail('native source occurrence completion missing');
if (reconciliation?.completion?.evidence_truth_determined !== false || reconciliation?.completion?.publication_cleared !== false) fail('Wave 03 overclaimed truth or publication clearance');
if (receipt?.decisions_requiring_human_permission !== 0 || plan?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 03 human-permission count drift');

for (const [name, boundaries] of [
  ['policy', policy.boundaries],
  ['plan', plan?.boundaries],
  ['receipt', receipt?.boundaries],
  ['reconciliation', reconciliation?.boundaries]
]) {
  if (boundaries?.native_source_migration_proves_evidence_truth !== false) fail(`${name}: evidence-truth boundary missing`);
  if (boundaries?.native_source_migration_resolves_identity !== false) fail(`${name}: identity boundary missing`);
  if (boundaries?.legacy_graph_edge_is_coordination_or_causation !== false) fail(`${name}: graph-inference boundary missing`);
  if (boundaries?.publication_cleared !== false) fail(`${name}: publication boundary missing`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph boundary drift`);
}

if (!planReport.includes('identifier registrations superseded:     448')) fail('Wave 03 report lacks supersession count');
if (!planReport.includes('decisions requiring human permission:    0')) fail('Wave 03 report lacks zero-permission count');
if (!reconciliationReport.includes('native source migration debt after:           164')) fail('Wave 03 reconciliation report lacks remaining debt count');
if (!reconciliationReport.includes('Native source custody and deterministic compiler equivalence improve reproducibility.')) fail('Wave 03 reconciliation report lacks custody boundary');

if (errors.length) {
  console.error(`lake native source migration Wave 03 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake native source migration Wave 03 validation: OK');
console.log(`  native claims: ${nativeData.claims.length}`);
console.log(`  native events: ${nativeData.events.length}`);
console.log(`  identifier supersessions: ${supersessions.length}`);
console.log('  remaining native source migration debt: 164');
console.log('  decisions requiring human permission: 0');
