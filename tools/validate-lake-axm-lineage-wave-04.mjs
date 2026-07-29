#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIdentityLayer, PARTICIPATES_IN } from './lib/axm-identity.mjs';
import { loadAll } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-lineage-wave-04-policy.json';
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
  } catch (error) { fail(`${relative}: ${error.message}`); return []; }
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function stableDigest(value) { return sha256(Buffer.from(JSON.stringify(canonical(value)))); }
function manifestFingerprint(rows) { return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''))); }
function pair(key, value) { return `${key}\0${value}`; }
function participantLocal(row) { return row.participant_type === 'actor' ? row.actor_id : row.organization_id; }

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const supersessions = readJsonl(policy.supersession_ledger_path);
const priorRegistrations = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl');
const wave03Supersessions = readJsonl('data/project/lake-identifier-source-supersessions-wave-03.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const data = loadAll();
const identity = buildIdentityLayer({ namespace: data.caseConfig.namespace, actors: data.actors, organizations: data.organizations, surfaces: data.surfaces, participation: data.participation, aliases: data.aliases });
const committedIdentity = readJson(policy.target_projection_path);

if (policy.schema_version !== 'lake-axm-lineage-wave-04-policy@1') fail('unexpected Wave 04 policy schema');
if (plan?.schema_version !== 'lake-axm-lineage-wave-04-plan@1') fail('unexpected Wave 04 plan schema');
if (receipt?.schema_version !== 'lake-axm-lineage-wave-04@1') fail('unexpected Wave 04 migration receipt schema');
if (reconciliation?.schema_version !== 'lake-axm-lineage-wave-04-reconciliation@1') fail('unexpected Wave 04 reconciliation schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key) fail('Wave 04 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 04 plan source fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 04 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 04 reconciliation fingerprint mismatch');

try { assert.deepEqual(committedIdentity?.scheme, identity.scheme); } catch { fail('committed AXM scheme drift'); }
try { assert.deepEqual(committedIdentity?.entities, identity.entities); } catch { fail('committed AXM entity projection drift'); }
try { assert.deepEqual(committedIdentity?.claims, identity.claims); } catch { fail('committed AXM claim projection drift'); }
if (identity.scheme.status !== 'provisional') fail('AXM scheme is no longer marked provisional');
if (identity.claims.length !== policy.expected.axm_participates_in_claims) fail('AXM claim count drift');
if (!identity.claims.every(claim => claim.predicate === PARTICIPATES_IN)) fail('unexpected AXM predicate');

const targetRegistrations = priorRegistrations.filter(row => row.matched_rule_key === policy.target_prior_rule);
if (targetRegistrations.length !== policy.expected.target_registrations) fail('fallback registration count drift');
const targetByClaim = new Map(targetRegistrations.map(row => [row.identifier_value, row]));
if (new Set(targetByClaim.keys()).size !== targetRegistrations.length) fail('duplicate fallback claim registrations');
if (JSON.stringify([...targetByClaim.keys()].sort()) !== JSON.stringify(identity.claims.map(row => row.claim_id).sort())) fail('fallback IDs do not equal AXM claim IDs');

const participationByPair = new Map();
for (const row of data.participation) {
  const key = `${participantLocal(row)}\0${row.surface_id}`;
  if (!participationByPair.has(key)) participationByPair.set(key, []);
  participationByPair.get(key).push(row);
}
for (const rows of participationByPair.values()) rows.sort((a, b) => `${a.time_start ?? ''}\0${a.time_end ?? ''}\0${a.role ?? ''}`.localeCompare(`${b.time_start ?? ''}\0${b.time_end ?? ''}\0${b.role ?? ''}`));
const claimById = new Map(identity.claims.map(row => [row.claim_id, row]));
const supersessionKeys = new Set();
const supersessionClaims = new Set();
for (const row of supersessions) {
  if (row.schema_version !== 'lake-identifier-source-supersession@1') fail(`${row.supersession_key}: bad schema`);
  if (!row.supersession_key || supersessionKeys.has(row.supersession_key)) fail(`duplicate or missing supersession key ${row.supersession_key}`);
  supersessionKeys.add(row.supersession_key);
  if (supersessionClaims.has(row.claim_id)) fail(`${row.supersession_key}: duplicate claim supersession`);
  supersessionClaims.add(row.claim_id);
  const prior = targetByClaim.get(row.claim_id);
  if (!prior || prior.registration_key !== row.prior_registration_key) fail(`${row.supersession_key}: prior registration mismatch`);
  const claim = claimById.get(row.claim_id);
  if (!claim) { fail(`${row.supersession_key}: AXM claim missing`); continue; }
  if (row.identifier_key !== 'claim_id' || row.identifier_value !== row.claim_id) fail(`${row.supersession_key}: identifier mismatch`);
  if (row.supersession_status !== 'native_participation_lineage_materialized') fail(`${row.supersession_key}: status drift`);
  if (row.predicate !== PARTICIPATES_IN || row.subject_local_id !== claim.subj_local_id || row.object_local_id !== claim.obj_local_id) fail(`${row.supersession_key}: claim lineage identifiers drift`);
  try { assert.deepEqual(row.windows, claim.windows); } catch { fail(`${row.supersession_key}: temporal windows drift`); }
  const sourceRows = participationByPair.get(`${claim.subj_local_id}\0${claim.obj_local_id}`) ?? [];
  const rowRecords = sourceRows.map(source => ({
    source_row_sha256: stableDigest(source), participant_type: source.participant_type, participant_local_id: participantLocal(source), surface_id: source.surface_id,
    role: source.role ?? null, participation_type: source.participation_type ?? null, time_start: source.time_start ?? '', time_end: source.time_end ?? '',
    evidence_class: source.evidence_class ?? null, receipt_ids: [...new Set(source.receipt_ids ?? [])].sort()
  }));
  if (row.canonical_participation_row_count !== rowRecords.length) fail(`${row.supersession_key}: participation row count drift`);
  if (row.canonical_participation_digest_sha256 !== stableDigest(rowRecords)) fail(`${row.supersession_key}: participation digest drift`);
  try { assert.deepEqual(row.canonical_participation_rows, rowRecords); } catch { fail(`${row.supersession_key}: participation row mapping drift`); }
  if (row.prior_native_source_migration_required !== true || row.current_native_source_migration_required !== false) fail(`${row.supersession_key}: native-source transition drift`);
  if (row.external_axm_reconciliation_required !== true || row.cross_case_join_authorized !== false) fail(`${row.supersession_key}: external AXM boundary drift`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.supersession_key}: human-permission gate remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.supersession_key}: correction route missing`);
  if (row.graph_effect !== 'none') fail(`${row.supersession_key}: graph effect created`);
}
if (supersessions.length !== policy.expected.target_registrations) fail('supersession row count drift');
if (JSON.stringify([...supersessionClaims].sort()) !== JSON.stringify(identity.claims.map(row => row.claim_id).sort())) fail('not every AXM claim was superseded');

const objectByPair = new Map(objects.map(object => [pair(object.id_key, object.id_value), object]));
for (const row of supersessions) {
  const object = objectByPair.get(pair('claim_id', row.claim_id));
  if (!object) { fail(`${row.supersession_key}: claim absent from lake object index`); continue; }
  if (object.indexed !== true) fail(`${row.supersession_key}: claim is not index-addressable`);
  if (!(object.occurrences ?? []).some(occurrence => occurrence.path === policy.supersession_ledger_path && occurrence.generated !== true)) fail(`${row.supersession_key}: supersession source occurrence missing`);
}

const allSupersededPriorKeys = new Set([...wave03Supersessions, ...supersessions].map(row => row.prior_registration_key));
const remainingDebt = priorRegistrations.filter(row => row.native_source_migration_required === true && !allSupersededPriorKeys.has(row.registration_key));
if (remainingDebt.length !== 0) fail(`Wave 02 native-source debt remains: ${remainingDebt.length}`);
if (!/reconciled byte-for-byte against axm-genesis|AXM identity reconciliation/i.test(buildInstructions) || !/no cross-case join ships/i.test(buildInstructions)) fail('external AXM reconciliation gate is not preserved');

if (reconciliation?.after?.unsuperseded_fallback_registrations !== 0) fail('reconciliation retained fallback registrations');
if (reconciliation?.after?.unsuperseded_wave02_native_source_debt !== 0) fail('reconciliation retained Wave 02 native-source debt');
if (reconciliation?.after?.supersession_rows_with_indexed_source_occurrence !== supersessions.length) fail('not every supersession has an indexed source occurrence');
if (reconciliation?.after?.external_axm_reconciliation_complete !== false || reconciliation?.after?.cross_case_join_authorized !== false) fail('reconciliation overclaimed AXM authority');
if (reconciliation?.completion?.wave02_native_source_migration_debt_complete !== true) fail('native-source debt completion flag missing');
if (reconciliation?.completion?.external_axm_reconciliation_complete !== false || reconciliation?.completion?.cross_case_join_authorized !== false) fail('completion overclaimed AXM authority');
if (reconciliation?.completion?.evidence_truth_determined !== false || reconciliation?.completion?.publication_cleared !== false) fail('completion overclaimed truth or clearance');
if (receipt?.decisions_requiring_human_permission !== 0 || plan?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('human-permission count drift');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.participation_lineage_proves_evidence_truth !== false) fail(`${name}: evidence-truth boundary missing`);
  if (boundaries?.participation_lineage_resolves_identity !== false) fail(`${name}: identity boundary missing`);
  if (boundaries?.provisional_axm_id_is_externally_reconciled !== false) fail(`${name}: external reconciliation boundary missing`);
  if (boundaries?.cross_case_join_authorized !== false) fail(`${name}: cross-case boundary missing`);
  if (boundaries?.participates_in_claim_is_coordination_or_causation !== false) fail(`${name}: causation boundary missing`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph boundary drift`);
}

if (!report.includes('native source migration debt:           164 -> 0')) fail('Wave 04 report lacks debt closure');
if (!report.includes('external AXM reconciliation complete:   false')) fail('Wave 04 report lacks AXM boundary');
if (!reconciliationReport.includes('Wave 02 native source debt after:               0')) fail('reconciliation report lacks zero debt');
if (!reconciliationReport.includes('material reproducibility boundary, not a wait-for-human state')) fail('reconciliation report lacks no-human-gate boundary');

if (errors.length) {
  console.error(`lake AXM lineage Wave 04 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('lake AXM lineage Wave 04 validation: OK');
console.log(`  provisional AXM claims: ${identity.claims.length}`);
console.log(`  supersessions: ${supersessions.length}`);
console.log('  Wave 02 native source debt after: 0');
console.log('  external AXM reconciliation complete: false');
console.log('  cross-case join authorized: false');
