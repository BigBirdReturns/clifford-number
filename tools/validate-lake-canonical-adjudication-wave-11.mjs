#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-adjudication-wave-11-policy.json';
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

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const decisions = readJsonl(policy.decision_registry_path);
const mutationPlan = readJson(policy.mutation_plan_path);
const extensionRows = readJsonl(policy.extension_registry_path);
const receipt = readJson(policy.receipt_path);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const actors = readJson('data/canonical/actors.json')?.actors ?? [];
const organizations = readJson('data/canonical/organizations.json')?.organizations ?? [];
const aliases = readJson('data/canonical/aliases.json')?.aliases ?? [];
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

if (policy.schema_version !== 'lake-canonical-adjudication-wave-11-policy@1') fail('unexpected Wave 11 policy schema');
if (mutationPlan?.schema_version !== 'lake-canonical-mutation-plan-wave-11@1') fail('unexpected Wave 11 mutation plan schema');
if (receipt?.schema_version !== 'lake-canonical-adjudication-wave-11@1') fail('unexpected Wave 11 receipt schema');
if (projection?.schema_version !== 'canonical-adjudication-index-wave-11@1') fail('unexpected Wave 11 projection schema');
if (plan?.schema_version !== 'lake-canonical-adjudication-wave-11-plan@1') fail('unexpected Wave 11 generated plan schema');
if (reconciliation?.schema_version !== 'lake-canonical-adjudication-wave-11-reconciliation@1') fail('unexpected Wave 11 reconciliation schema');
for (const artifact of [mutationPlan, receipt, projection, plan, reconciliation]) {
  if (artifact?.program_key !== policy.program_key) fail('Wave 11 program key drift');
}
if (mutationPlan?.source_fingerprint_sha256 !== manifestFingerprint(mutationPlan?.input_manifest)) fail('Wave 11 mutation plan fingerprint mismatch');
if (plan?.source_fingerprint_sha256 !== mutationPlan?.source_fingerprint_sha256) fail('Wave 11 plan and mutation fingerprint disagree');
if (projection?.source_fingerprint_sha256 !== mutationPlan?.source_fingerprint_sha256) fail('Wave 11 projection and mutation fingerprint disagree');
if (receipt?.source_fingerprint_sha256 !== manifestFingerprint(receipt?.input_manifest)) fail('Wave 11 receipt fingerprint mismatch');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 11 reconciliation fingerprint mismatch');

if (decisions.length !== policy.expected.candidate_rows) fail('Wave 11 decision denominator drift');
if (new Set(decisions.map(row => row.adjudication_id)).size !== decisions.length) fail('duplicate Wave 11 adjudication ID');
if (new Set(decisions.map(row => row.acquisition_id)).size !== decisions.length) fail('duplicate Wave 10 acquisition adjudication');
const allowedStatuses = new Set([
  'reroute_nonidentity',
  'bounded_hold',
  'kind_conflict_with_existing_canonical',
  'ambiguous_existing_canonical_collision',
  'duplicate_existing_canonical',
  'materialize_alias_to_existing',
  'candidate_cluster_conflict',
  'materialize_new_canonical_record',
  'materialize_type_corrected_canonical_record'
]);
for (const row of decisions) {
  if (!allowedStatuses.has(row.adjudication_status)) fail(`${row.adjudication_id}: unknown adjudication status`);
  if (!['actor', 'organization', 'nonidentity'].includes(row.adjudicated_kind)) fail(`${row.adjudication_id}: invalid adjudicated kind`);
  if (!row.decision_reason) fail(`${row.adjudication_id}: decision reason missing`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.adjudication_id}: human permission dependency introduced`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.adjudication_id}: reversibility contract missing`);
  if (row.accepted_identity_bridge !== false || row.participation_created !== false || row.relationship_created !== false) fail(`${row.adjudication_id}: semantic effect overclaim`);
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false) fail(`${row.adjudication_id}: cross-case join gate drift`);
  if (row.graph_effect !== 'none') fail(`${row.adjudication_id}: graph effect drift`);
  if (row.materialization_authorized && !['materialize_alias_to_existing', 'materialize_new_canonical_record', 'materialize_type_corrected_canonical_record'].includes(row.adjudication_status)) fail(`${row.adjudication_id}: unauthorized status marked materializable`);
  if (!row.materialization_authorized && !(row.counterevidence?.length > 0)) fail(`${row.adjudication_id}: refusal lacks concrete counterevidence or blocker`);
}

const actorAdditions = mutationPlan?.mutations?.actor_additions ?? [];
const organizationAdditions = mutationPlan?.mutations?.organization_additions ?? [];
const aliasAdditions = mutationPlan?.mutations?.alias_additions ?? [];
const reroutes = mutationPlan?.mutations?.nonidentity_reroutes ?? [];
if (actorAdditions.length + organizationAdditions.length < policy.expected.minimum_materialized_new_records) fail('Wave 11 materialized no canonical records');
if ((mutationPlan?.mutations?.participation_additions ?? []).length !== 0) fail('Wave 11 mutation plan adds participation');
if (mutationPlan?.expected_after?.accepted_identity_bridges !== 0) fail('Wave 11 mutation plan accepts identity bridge');
if (mutationPlan?.expected_after?.graph_edge_delta !== 0 || mutationPlan?.expected_after?.claim_delta !== 0) fail('Wave 11 mutation plan authorizes graph or claim delta');

const actorById = new Map(actors.map(row => [row.id, row]));
const organizationById = new Map(organizations.map(row => [row.id, row]));
const aliasKeys = new Set(aliases.map(row => `${row.kind}:${row.canonical_id}:${row.alias}`));
if (actors.length !== mutationPlan?.expected_after?.actor_rows) fail('materialized actor count drift');
if (organizations.length !== mutationPlan?.expected_after?.organization_rows) fail('materialized organization count drift');
if (aliases.length !== mutationPlan?.expected_after?.alias_rows) fail('materialized alias count drift');
try {
  for (const row of actorAdditions) assert.deepEqual(actorById.get(row.id), row);
  for (const row of organizationAdditions) assert.deepEqual(organizationById.get(row.id), row);
} catch (error) { fail(`materialized canonical record drift: ${error.message}`); }
for (const row of aliasAdditions) if (!aliasKeys.has(`${row.kind}:${row.canonical_id}:${row.alias}`)) fail(`${row.alias}: materialized alias missing`);
if (new Set([...actors.map(row => row.id), ...organizations.map(row => row.id)]).size !== actors.length + organizations.length) fail('canonical actor/organization ID collision');

const extensionEntityRows = extensionRows.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliasRows = extensionRows.filter(row => row.registry_row_type === 'alias_extension');
if (extensionEntityRows.length !== actorAdditions.length + organizationAdditions.length) fail('Wave 11 entity extension count drift');
if (extensionAliasRows.length !== aliasAdditions.length) fail('Wave 11 alias extension count drift');
if (new Set(extensionRows.map(row => row.registry_key)).size !== extensionRows.length) fail('duplicate Wave 11 extension registry key');
for (const row of extensionRows) {
  if (row.active_projection_extension !== true || row.external_axm_gate_complete !== true) fail(`${row.registry_key}: extension state missing`);
  if (row.cross_case_join_authorized !== false || row.accepted_identity_bridge !== false || row.participation_created !== false || row.graph_effect !== 'none') fail(`${row.registry_key}: extension semantic boundary drift`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.registry_key}: extension judgment contract drift`);
}

if (participation.length !== mutationPlan?.before?.participation_rows || stableDigest(participation) !== mutationPlan?.before?.participation_digest_sha256) fail('Wave 11 changed participation rows');
if (active?.entities?.length !== mutationPlan?.expected_after?.active_entities) fail('Wave 11 active entity count drift');
if (active?.claims?.length !== mutationPlan?.before?.active_claims || stableDigest(active?.claims) !== mutationPlan?.before?.active_claim_digest_sha256) fail('Wave 11 active claim payload drift');
if (stableDigest(hopGraph?.edges) !== mutationPlan?.before?.hop_edge_digest_sha256) fail('Wave 11 hop edge payload drift');
if (stableDigest(hopGraph?.rejected_hop_surfaces) !== mutationPlan?.before?.hop_rejected_surface_digest_sha256) fail('Wave 11 rejected surface payload drift');
if (stableDigest(hopGraph?.rejected_hop_pairs) !== mutationPlan?.before?.hop_rejected_pair_digest_sha256) fail('Wave 11 rejected pair payload drift');

if (receipt?.counts?.candidate_rows !== decisions.length) fail('Wave 11 receipt decision count drift');
if (receipt?.counts?.actor_records_added !== actorAdditions.length || receipt?.counts?.organization_records_added !== organizationAdditions.length || receipt?.counts?.aliases_added !== aliasAdditions.length) fail('Wave 11 receipt mutation count drift');
if (receipt?.counts?.nonidentity_reroutes !== reroutes.length) fail('Wave 11 receipt reroute count drift');
if (receipt?.counts?.extension_registry_rows !== extensionRows.length) fail('Wave 11 receipt extension count drift');
if (receipt?.counts?.participation_rows_added !== 0 || receipt?.counts?.accepted_identity_bridges !== 0 || receipt?.counts?.graph_edge_delta !== 0) fail('Wave 11 receipt semantic delta drift');
if (receipt?.canonical_mutations_applied !== true || receipt?.identity_extension_registry_built !== true) fail('Wave 11 receipt completion state drift');
if (receipt?.decisions_requiring_human_permission !== 0) fail('Wave 11 receipt human permission drift');

if (projection?.decisions?.length !== decisions.length) fail('Wave 11 generated decision projection count drift');
try { assert.deepEqual(projection?.decisions, decisions); } catch (error) { fail(`Wave 11 generated decision projection drift: ${error.message}`); }
try { assert.deepEqual(projection?.mutations, mutationPlan?.mutations); } catch (error) { fail(`Wave 11 generated mutation projection drift: ${error.message}`); }

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.decision_registry_path, policy.mutation_plan_path, policy.extension_registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.decision_registry_path)?.index_file !== true) fail('Wave 11 decision registry is not an index surface');
if (fileByPath.get(policy.extension_registry_path)?.index_file !== true) fail('Wave 11 extension registry is not an index surface');
if (fileByPath.get(policy.projection_path)?.generated !== true || fileByPath.get(policy.projection_path)?.index_file !== true) fail('Wave 11 projection is not a generated index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let decisionIdsObserved = 0;
for (const row of decisions) {
  const object = objectByKey.get(`adjudication_id:${row.adjudication_id}`);
  if (!object) fail(`${row.adjudication_id}: lake decision object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.adjudication_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false)) fail(`${row.adjudication_id}: source decision occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.projection_path && item.generated === true)) fail(`${row.adjudication_id}: generated decision occurrence missing`);
    decisionIdsObserved += 1;
  }
}
let extensionIdsObserved = 0;
for (const row of extensionEntityRows) {
  const object = objectByKey.get(`axm_entity_id:${row.axm_entity_id}`);
  if (!object) fail(`${row.local_id}: extension entity object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.local_id}: extension source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.extension_registry_path && item.generated === false)) fail(`${row.local_id}: extension registry occurrence missing`);
    if (!object.occurrences.some(item => item.path === 'build/axm-identity.json' && item.generated === true)) fail(`${row.local_id}: active identity projection occurrence missing`);
    extensionIdsObserved += 1;
  }
}

if (reconciliation?.after?.decision_rows !== decisions.length) fail('Wave 11 reconciliation decision count drift');
if (reconciliation?.after?.actor_records_added !== actorAdditions.length || reconciliation?.after?.organization_records_added !== organizationAdditions.length || reconciliation?.after?.aliases_added !== aliasAdditions.length) fail('Wave 11 reconciliation mutation count drift');
if (reconciliation?.after?.adjudication_ids_source_projection_and_index_observed !== decisions.length) fail('Wave 11 reconciliation decision observation drift');
if (reconciliation?.after?.extension_entity_ids_source_projection_and_index_observed !== extensionEntityRows.length) fail('Wave 11 reconciliation extension observation drift');
if (reconciliation?.after?.accepted_identity_bridges !== 0 || reconciliation?.after?.participation_rows_added !== 0 || reconciliation?.after?.graph_edge_delta !== 0 || reconciliation?.after?.active_claim_delta !== 0) fail('Wave 11 reconciliation semantic delta drift');
for (const field of [
  'candidate_denominator_adjudicated',
  'authorized_canonical_mutations_applied',
  'every_refusal_or_reroute_preserved',
  'identity_extension_registry_built',
  'every_adjudication_id_source_projection_and_index_observed',
  'every_extension_entity_id_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'participation_payload_unchanged',
  'active_claim_payload_unchanged',
  'hop_edge_payload_unchanged',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 11 completion ${field} missing`);
for (const field of ['automatic_cross_case_join_authorized', 'cross_case_graph_join_authorized', 'cross_case_hop_creation_authorized', 'evidence_truth_determined', 'publication_cleared']) {
  if (reconciliation?.completion?.[field] !== false) fail(`Wave 11 completion ${field} boundary drift`);
}
if (reconciliation?.completion?.accepted_identity_bridges !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 11 completion count drift');

if (!/canonical acquisition adjudication/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 11 contract');
if (!/canonical acquisition adjudication/i.test(readme)) fail('README lacks Wave 11 contract');
if (!report.includes('accepted identity bridges:           0')) fail('Wave 11 report lacks identity bridge boundary');
if (!reconciliationReport.includes('hop edge delta:                          0')) fail('Wave 11 reconciliation report lacks zero-hop delta');

for (const [name, boundaries] of [['policy', policy.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.canonical_record_is_identity_bridge !== false) fail(`${name}: identity bridge boundary missing`);
  if (boundaries?.canonical_mutation_creates_participation !== false) fail(`${name}: participation boundary missing`);
  if (boundaries?.canonical_mutation_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.canonical_mutation_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph boundary drift`);
}

if (errors.length) {
  console.error(`lake canonical adjudication Wave 11 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake canonical adjudication Wave 11 validation: OK');
console.log(`  decisions: ${decisions.length}`);
console.log(`  actors / organizations / aliases added: ${actorAdditions.length} / ${organizationAdditions.length} / ${aliasAdditions.length}`);
console.log(`  decision IDs observed: ${decisionIdsObserved}/${decisions.length}`);
console.log(`  extension entity IDs observed: ${extensionIdsObserved}/${extensionEntityRows.length}`);
console.log('  participation, claim, relationship, graph, and hop deltas: 0');
