#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-exact-canonical-subject-wave-14-policy.json';
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
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}
function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}
function validateManifest(rows, label) {
  for (const row of rows ?? []) {
    if (!fs.existsSync(full(row.path))) { fail(`${label}: ${row.path} missing`); continue; }
    const bytes = fs.readFileSync(full(row.path));
    if (bytes.length !== row.bytes) fail(`${label}: ${row.path} byte length drift`);
    if (sha256(bytes) !== row.sha256) fail(`${label}: ${row.path} hash drift`);
  }
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const unresolvedRows = readJsonl(policy.unresolved_registry_path);
const actors = readJson('data/canonical/actors.json')?.actors ?? [];
const organizations = readJson('data/canonical/organizations.json')?.organizations ?? [];
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const monolithicIndex = fs.existsSync(full('build/lake-index.json')) ? readJson('build/lake-index.json') : null;
const monolithicObjectIndex = fs.existsSync(full('build/lake-object-index.json')) ? readJson('build/lake-object-index.json') : null;
const files = monolithicIndex?.files ?? readJsonl('build/lake-index/files.jsonl');
const objects = monolithicObjectIndex?.objects ?? readJsonl('build/lake-index/objects.jsonl');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

if (policy.schema_version !== 'lake-exact-canonical-subject-wave-14-policy@1') fail('unexpected Wave 14 policy schema');
if (projection?.schema_version !== 'exact-canonical-subject-projection-wave-14@1') fail('unexpected Wave 14 projection schema');
if (plan?.schema_version !== 'exact-canonical-subject-wave-14-plan@1') fail('unexpected Wave 14 plan schema');
if (receipt?.schema_version !== 'lake-exact-canonical-subject-wave-14@1') fail('unexpected Wave 14 receipt schema');
if (reconciliation?.schema_version !== 'lake-exact-canonical-subject-wave-14-reconciliation@1') fail('unexpected Wave 14 reconciliation schema');
for (const artifact of [projection, plan, receipt, reconciliation]) if (artifact?.program_key !== policy.program_key) fail('Wave 14 program key drift');
if (projection?.source_fingerprint_sha256 !== manifestFingerprint(projection?.input_manifest)) fail('Wave 14 projection fingerprint mismatch');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 14 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== manifestFingerprint(receipt?.input_manifest)) fail('Wave 14 receipt fingerprint mismatch');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 14 reconciliation fingerprint mismatch');
validateManifest(projection?.input_manifest, 'projection manifest');
validateManifest(receipt?.input_manifest, 'receipt manifest');
validateManifest(reconciliation?.input_manifest, 'reconciliation manifest');

const counts = projection?.counts ?? {};
for (const [field, expected] of [
  ['claim_subject_references', policy.expected.claim_subject_references],
  ['explicit_resolution_references', policy.expected.explicitly_resolved_references],
  ['exact_canonical_id_references', policy.expected.exact_canonical_references],
  ['exact_canonical_subjects', policy.expected.exact_canonical_subjects],
  ['unresolved_subject_references', policy.expected.unresolved_subject_references],
  ['unresolved_distinct_subjects', policy.expected.unresolved_distinct_subjects],
  ['briefing_exact_canonical_references', policy.expected.briefing_exact_canonical_references],
  ['exact_subject_observation_rows', policy.expected.exact_canonical_subjects],
  ['unresolved_registry_rows', policy.expected.unresolved_distinct_subjects]
]) if (counts[field] !== expected) fail(`Wave 14 count ${field} drift`);
if (unresolvedRows.length !== policy.expected.unresolved_distinct_subjects) fail('Wave 14 unresolved registry denominator drift');
try { assert.deepEqual(projection?.unresolved_classification_counts, policy.expected.unresolved_classification_counts); }
catch (error) { fail(`Wave 14 classification denominator drift: ${error.message}`); }
try { assert.deepEqual(projection?.unresolved_subjects, unresolvedRows); }
catch (error) { fail(`Wave 14 unresolved source/projection drift: ${error.message}`); }
if (projection?.exact_subject_observations?.length !== policy.expected.exact_canonical_subjects) fail('Wave 14 exact observation denominator drift');
if (new Set((projection?.exact_subject_observations ?? []).map(row => row.exact_subject_observation_id)).size !== policy.expected.exact_canonical_subjects) fail('duplicate exact subject observation ID');
if (new Set(unresolvedRows.map(row => row.unresolved_subject_id)).size !== unresolvedRows.length) fail('duplicate unresolved subject ID');

const canonicalById = new Map([
  ...actors.map(row => [row.id, { kind: 'actor', row }]),
  ...organizations.map(row => [row.id, { kind: 'organization', row }])
]);
if (canonicalById.size !== actors.length + organizations.length) fail('canonical ID collision');
let exactReferenceTotal = 0;
for (const row of projection?.exact_subject_observations ?? []) {
  const canonicalRecord = canonicalById.get(row.canonical_subject_id);
  if (!canonicalRecord || canonicalRecord.kind !== row.canonical_kind) fail(`${row.exact_subject_observation_id}: canonical source record mismatch`);
  if (row.local_subject_ids?.length !== 1 || row.local_subject_ids[0] !== row.canonical_subject_id) fail(`${row.exact_subject_observation_id}: exact string equality drift`);
  if (row.exact_string_equality !== true || row.resolution_basis !== 'exact_subject_id_equals_canonical_id' || row.resolution_id !== undefined) {
    if (row.resolution_id !== undefined && row.resolution_id !== null) fail(`${row.exact_subject_observation_id}: exact lane manufactured a decision ID`);
    if (row.exact_string_equality !== true || row.resolution_basis !== 'exact_subject_id_equals_canonical_id') fail(`${row.exact_subject_observation_id}: exact lane basis drift`);
  }
  if (row.normalized_name_match_used !== false || row.alias_match_used !== false || row.fuzzy_match_used !== false) fail(`${row.exact_subject_observation_id}: forbidden match mode used`);
  if (row.source_records_mutated !== false || row.source_records_merged !== false || row.relationship_created !== false || row.participation_created !== false) fail(`${row.exact_subject_observation_id}: semantic effect overclaim`);
  if (row.accepted_cross_case_identity_bridge !== false || row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false || row.graph_effect !== 'none') fail(`${row.exact_subject_observation_id}: graph boundary drift`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.exact_subject_observation_id}: judgment contract drift`);
  exactReferenceTotal += row.claim_ids?.length ?? 0;
}
if (exactReferenceTotal !== policy.expected.exact_canonical_references) fail('Wave 14 exact claim-reference total drift');

for (const row of unresolvedRows) {
  if (!(row.claim_ids?.length > 0) || row.claim_count !== row.claim_ids.length) fail(`${row.unresolved_subject_id}: unresolved claim denominator drift`);
  if (!row.classification || !row.classification_basis || !row.next_action) fail(`${row.unresolved_subject_id}: routing decision incomplete`);
  if (row.exact_canonical_id_match !== false || row.explicit_resolution_present !== false) fail(`${row.unresolved_subject_id}: unresolved state drift`);
  if (row.normalized_name_match_attempted !== false || row.alias_match_attempted !== false || row.fuzzy_match_attempted !== false) fail(`${row.unresolved_subject_id}: forbidden match attempt recorded`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.unresolved_subject_id}: unresolved judgment contract drift`);
  if (row.relationship_created !== false || row.participation_created !== false || row.accepted_cross_case_identity_bridge !== false || row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false || row.graph_effect !== 'none') fail(`${row.unresolved_subject_id}: unresolved graph boundary drift`);
}

if (stableDigest(participation) !== projection?.graph_digests?.participation_sha256) fail('Wave 14 participation payload changed');
if (stableDigest(activeIdentity?.claims) !== projection?.graph_digests?.active_claims_sha256) fail('Wave 14 active claim payload changed');
if (stableDigest(hopGraph?.edges) !== projection?.graph_digests?.hop_edges_sha256) fail('Wave 14 hop edge payload changed');
if (stableDigest(hopGraph?.rejected_hop_surfaces) !== projection?.graph_digests?.rejected_hop_surfaces_sha256) fail('Wave 14 rejected hop surface payload changed');
if (stableDigest(hopGraph?.rejected_hop_pairs) !== projection?.graph_digests?.rejected_hop_pairs_sha256) fail('Wave 14 rejected hop pair payload changed');
for (const row of projection?.source_claim_manifest ?? []) {
  if (!fs.existsSync(full(row.path))) fail(`${row.path}: source claim file missing`);
  else {
    const bytes = fs.readFileSync(full(row.path));
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) fail(`${row.path}: source claim bytes changed`);
  }
}

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policyPath, policy.unresolved_registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== false || row.authoritative_reachable !== true) fail(`${relative}: source-control state drift`);
}
if (fileByPath.get(policy.unresolved_registry_path)?.index_file !== true) fail('Wave 14 unresolved registry is not an index surface');
const projectionFile = fileByPath.get(policy.projection_path);
if (!projectionFile || projectionFile.generated !== true || projectionFile.authoritative_reachable !== true) fail('Wave 14 generated projection state drift');
const planFile = fileByPath.get(policy.plan_path);
if (!planFile || planFile.generated !== true) fail('Wave 14 generated plan state drift');
const reconciliationFile = fileByPath.get(policy.reconciliation_path);
if (!reconciliationFile || reconciliationFile.generated !== true) fail('Wave 14 generated reconciliation state drift');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let unresolvedObserved = 0;
for (const row of unresolvedRows) {
  const object = objectByKey.get(`unresolved_subject_id:${row.unresolved_subject_id}`);
  if (!object) { fail(`${row.unresolved_subject_id}: lake object missing`); continue; }
  if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.unresolved_subject_id}: source/projection/index state drift`);
  if (!object.occurrences.some(item => item.path === policy.unresolved_registry_path && item.generated === false)) fail(`${row.unresolved_subject_id}: source occurrence missing`);
  if (!object.occurrences.some(item => item.path === policy.projection_path && item.generated === true)) fail(`${row.unresolved_subject_id}: projection occurrence missing`);
  unresolvedObserved += 1;
}
if (unresolvedObserved !== policy.expected.unresolved_distinct_subjects) fail('Wave 14 unresolved lake observation count drift');

if (receipt?.counts?.exact_canonical_id_references !== policy.expected.exact_canonical_references || receipt?.counts?.exact_canonical_subjects !== policy.expected.exact_canonical_subjects) fail('Wave 14 receipt exact denominator drift');
if (receipt?.counts?.unresolved_subject_references !== policy.expected.unresolved_subject_references || receipt?.counts?.unresolved_distinct_subjects !== policy.expected.unresolved_distinct_subjects) fail('Wave 14 receipt unresolved denominator drift');
if (receipt?.counts?.unresolved_ids_source_projection_and_index_observed !== policy.expected.unresolved_distinct_subjects) fail('Wave 14 receipt lake observation drift');
if (receipt?.counts?.source_subject_id_changes !== 0 || receipt?.counts?.source_claim_text_changes !== 0 || receipt?.counts?.participation_delta !== 0 || receipt?.counts?.active_claim_delta !== 0 || receipt?.counts?.graph_edge_delta !== 0 || receipt?.counts?.accepted_cross_case_identity_bridges !== 0) fail('Wave 14 receipt semantic delta drift');
if (receipt?.decisions_requiring_human_permission !== 0) fail('Wave 14 receipt human-permission drift');

for (const field of [
  'complete_claim_subject_denominator_recomputed',
  'explicit_resolutions_preserved',
  'exact_canonical_reference_denominator_complete',
  'exact_canonical_subject_denominator_complete',
  'every_unresolved_id_source_projection_and_index_observed',
  'unresolved_classification_denominator_complete',
  'source_subject_ids_preserved',
  'source_claim_text_preserved',
  'participation_payload_unchanged',
  'active_claim_payload_unchanged',
  'hop_edge_payload_unchanged',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 14 completion ${field} missing`);
for (const field of [
  'source_records_mutated',
  'source_records_merged',
  'relationship_created',
  'participation_created',
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`Wave 14 completion ${field} boundary drift`);
if (reconciliation?.completion?.accepted_cross_case_identity_bridges !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.graph_effect !== 'none') fail('Wave 14 completion count or graph drift');

for (const [name, boundaries] of [['policy', policy.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.exact_canonical_subject_proves_claim_truth !== false) fail(`${name}: truth boundary missing`);
  if (boundaries?.exact_canonical_subject_validates_all_claims !== false) fail(`${name}: claim-validation boundary missing`);
  if (boundaries?.exact_canonical_subject_is_cross_case_bridge !== false) fail(`${name}: cross-case bridge boundary missing`);
  if (boundaries?.source_records_mutated !== false || boundaries?.source_records_merged !== false) fail(`${name}: source mutation boundary missing`);
  if (boundaries?.relationship_created !== false || boundaries?.participation_created !== false) fail(`${name}: semantic effect boundary missing`);
  if (boundaries?.automatic_cross_case_join_authorized !== false || boundaries?.cross_case_graph_join_authorized !== false || boundaries?.cross_case_hop_creation_authorized !== false) fail(`${name}: join boundary missing`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph effect drift`);
}

if (!/Exact canonical subject projection/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 14 contract');
if (!/Exact canonical subject projection/i.test(readme)) fail('README lacks Wave 14 contract');
if (!report.includes('exact canonical-ID references:         212')) fail('Wave 14 report lacks exact denominator');
if (!reconciliationReport.includes('unresolved IDs source/projected/indexed:      57')) fail('Wave 14 reconciliation report lacks indexed unresolved denominator');

if (errors.length) {
  console.error(`lake exact canonical subject Wave 14 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('lake exact canonical subject Wave 14 validation: OK');
console.log(`  exact references / canonical subjects: ${policy.expected.exact_canonical_references} / ${policy.expected.exact_canonical_subjects}`);
console.log(`  unresolved references / distinct subjects: ${policy.expected.unresolved_subject_references} / ${policy.expected.unresolved_distinct_subjects}`);
console.log(`  unresolved IDs source/projected/indexed: ${unresolvedObserved}/${unresolvedRows.length}`);
console.log('  source mutation, relationship, participation, graph, hop, and human-permission effects: 0');
