#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-bounded-hold-resolution-wave-12-policy.json';
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
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}
function stableDigest(value) { return sha256(Buffer.from(JSON.stringify(canonical(value)))); }
function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const sources = readJsonl(policy.source_registry_path);
const decisions = readJsonl(policy.decision_registry_path);
const localResolutions = readJsonl(policy.local_resolution_registry_path);
const mutationPlan = readJson(policy.mutation_plan_path);
const extensionRows = readJsonl(policy.extension_registry_path);
const receipt = readJson(policy.receipt_path);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const actors = readJson('data/canonical/actors.json')?.actors ?? [];
const organizations = readJson('data/canonical/organizations.json')?.organizations ?? [];
const aliases = readJson('data/canonical/aliases.json')?.aliases ?? [];
const publicInterestMap = readJson('data/research/clifford-cross-corpus-public-interest-map.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const surfaceGraph = readJson('build/surface-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

if (policy.schema_version !== 'lake-bounded-hold-resolution-wave-12-policy@1') fail('unexpected Wave 12 policy schema');
if (mutationPlan?.schema_version !== 'lake-bounded-hold-mutation-plan-wave-12@1') fail('unexpected Wave 12 mutation plan schema');
if (receipt?.schema_version !== 'lake-bounded-hold-resolution-wave-12@1') fail('unexpected Wave 12 receipt schema');
if (projection?.schema_version !== 'bounded-hold-resolution-index-wave-12@1') fail('unexpected Wave 12 projection schema');
if (plan?.schema_version !== 'lake-bounded-hold-resolution-wave-12-plan@1') fail('unexpected Wave 12 plan schema');
if (reconciliation?.schema_version !== 'lake-bounded-hold-resolution-wave-12-reconciliation@1') fail('unexpected Wave 12 reconciliation schema');
for (const artifact of [mutationPlan, receipt, projection, plan, reconciliation]) if (artifact?.program_key !== policy.program_key) fail('Wave 12 program key drift');
if (mutationPlan?.source_fingerprint_sha256 !== manifestFingerprint(mutationPlan?.input_manifest)) fail('Wave 12 mutation plan fingerprint mismatch');
if (projection?.source_fingerprint_sha256 !== mutationPlan?.source_fingerprint_sha256) fail('Wave 12 projection/mutation fingerprint mismatch');
if (plan?.source_fingerprint_sha256 !== mutationPlan?.source_fingerprint_sha256) fail('Wave 12 plan/mutation fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== manifestFingerprint(receipt?.input_manifest)) fail('Wave 12 receipt fingerprint mismatch');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 12 reconciliation fingerprint mismatch');

if (sources.length !== policy.expected.source_rows) fail('Wave 12 source denominator drift');
if (decisions.length !== policy.expected.bounded_hold_rows) fail('Wave 12 decision denominator drift');
if (localResolutions.length !== policy.expected.resolved_local_subjects) fail('Wave 12 local resolution denominator drift');
if (new Set(sources.map(row => row.source_id)).size !== sources.length) fail('duplicate Wave 12 source ID');
if (new Set(decisions.map(row => row.decision_id)).size !== decisions.length) fail('duplicate Wave 12 decision ID');
if (new Set(decisions.map(row => row.local_subject_id)).size !== decisions.length) fail('duplicate Wave 12 local subject decision');
if (new Set(localResolutions.map(row => row.resolution_id)).size !== localResolutions.length) fail('duplicate Wave 12 local resolution ID');
if (new Set(localResolutions.map(row => row.local_subject_id)).size !== localResolutions.length) fail('duplicate Wave 12 local subject resolution');
try { assert.deepEqual(decisions.map(row => row.local_subject_id).sort(), Object.keys(policy.resolutions).sort()); }
catch { fail('Wave 12 decisions do not cover the exact policy denominator'); }

const sourceById = new Map(sources.map(row => [row.source_id, row]));
for (const source of sources) {
  if (source.publicly_inspectable !== true) fail(`${source.source_id}: source is not publicly inspectable`);
  if (!source.repository_path && !source.url) fail(`${source.source_id}: source locator missing`);
  if (source.repository_path && !fs.existsSync(full(source.repository_path))) fail(`${source.source_id}: repository source path missing`);
  if (!(source.supports_subjects?.length > 0)) fail(`${source.source_id}: supported-subject denominator missing`);
  if (!(source.supports?.length > 0)) fail(`${source.source_id}: supported propositions missing`);
  if (!source.limits) fail(`${source.source_id}: source limit missing`);
}

const resolutionByLocal = new Map(localResolutions.map(row => [row.local_subject_id, row]));
for (const decision of decisions) {
  if (decision.resolution_status !== 'accepted_local_to_canonical_resolution') fail(`${decision.decision_id}: resolution status drift`);
  if (decision.explicit_same_entity_assertion !== true || decision.shared_identity_namespace !== 'clifford-number/canonical-v1' || decision.unambiguous_target !== true) fail(`${decision.decision_id}: acceptance gate missing`);
  if (!(decision.source_ids?.length > 0) || decision.source_custody?.length !== decision.source_ids.length) fail(`${decision.decision_id}: source custody incomplete`);
  for (const sourceId of decision.source_ids) {
    const source = sourceById.get(sourceId);
    if (!source) fail(`${decision.decision_id}: missing source ${sourceId}`);
    else if (!source.supports_subjects.includes(decision.local_subject_id)) fail(`${decision.decision_id}: ${sourceId} does not support local subject`);
  }
  if (!decision.source_custody.every(source => source.publicly_inspectable === true)) fail(`${decision.decision_id}: non-public custody admitted`);
  if (decision.review_dependency?.required_to_decide !== false) fail(`${decision.decision_id}: human-permission dependency introduced`);
  if (decision.reversibility?.mode !== 'append_preserving_supersession') fail(`${decision.decision_id}: reversibility contract missing`);
  if (decision.accepted_local_canonical_resolution !== true || decision.accepted_cross_case_identity_bridge !== false) fail(`${decision.decision_id}: local/cross-case boundary drift`);
  if (decision.source_records_merged !== false || decision.relationship_created !== false || decision.participation_created !== false) fail(`${decision.decision_id}: semantic effect overclaim`);
  if (decision.automatic_cross_case_join_authorized !== false || decision.cross_case_graph_join_authorized !== false || decision.cross_case_hop_creation_authorized !== false) fail(`${decision.decision_id}: join boundary drift`);
  if (decision.graph_effect !== 'none') fail(`${decision.decision_id}: graph effect drift`);
  const resolution = resolutionByLocal.get(decision.local_subject_id);
  if (!resolution || resolution.source_decision_id !== decision.decision_id || resolution.canonical_id !== decision.canonical_id) fail(`${decision.decision_id}: local resolution row mismatch`);
}
for (const row of localResolutions) {
  if (row.status !== 'accepted_graph_inert_local_resolution') fail(`${row.resolution_id}: local resolution status drift`);
  if (row.explicit_same_entity_assertion !== true || row.entities_merged !== false || row.relationship_created !== false || row.participation_created !== false) fail(`${row.resolution_id}: local resolution semantic boundary drift`);
  if (row.accepted_cross_case_identity_bridge !== false || row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false) fail(`${row.resolution_id}: local resolution join boundary drift`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession' || row.graph_effect !== 'none') fail(`${row.resolution_id}: local resolution judgment contract drift`);
}
if (resolutionByLocal.get('org-city-of-arcadia')?.canonical_id !== 'city-of-arcadia' || resolutionByLocal.get('org-city-arcadia')?.canonical_id !== 'city-of-arcadia') fail('City of Arcadia local identifiers do not converge');

const actorAdditions = mutationPlan?.mutations?.actor_additions ?? [];
const organizationAdditions = mutationPlan?.mutations?.organization_additions ?? [];
const aliasAdditions = mutationPlan?.mutations?.alias_additions ?? [];
if (actorAdditions.length !== policy.expected.new_actor_records) fail('Wave 12 actor mutation count drift');
if (organizationAdditions.length !== policy.expected.new_organization_records) fail('Wave 12 organization mutation count drift');
if (actorAdditions.length + organizationAdditions.length !== policy.expected.new_entity_records) fail('Wave 12 entity mutation count drift');
if (aliasAdditions.length !== policy.expected.new_alias_records) fail('Wave 12 alias mutation count drift');
if ((mutationPlan?.mutations?.participation_additions ?? []).length !== 0) fail('Wave 12 mutation plan adds participation');
if (mutationPlan?.expected_after?.accepted_cross_case_identity_bridges !== 0 || mutationPlan?.expected_after?.claim_delta !== 0 || mutationPlan?.expected_after?.graph_edge_delta !== 0) fail('Wave 12 mutation plan overclaims semantic effects');

const actorById = new Map(actors.map(row => [row.id, row]));
const organizationById = new Map(organizations.map(row => [row.id, row]));
const aliasKeys = new Set(aliases.map(row => `${row.kind}:${row.canonical_id}:${row.alias}`));
if (actors.length !== mutationPlan?.expected_after?.actor_rows) fail('Wave 12 materialized actor count drift');
if (organizations.length !== mutationPlan?.expected_after?.organization_rows) fail('Wave 12 materialized organization count drift');
if (aliases.length !== mutationPlan?.expected_after?.alias_rows) fail('Wave 12 materialized alias count drift');
try {
  for (const row of actorAdditions) assert.deepEqual(actorById.get(row.id), row);
  for (const row of organizationAdditions) assert.deepEqual(organizationById.get(row.id), row);
} catch (error) { fail(`Wave 12 materialized canonical record drift: ${error.message}`); }
for (const row of aliasAdditions) if (!aliasKeys.has(`${row.kind}:${row.canonical_id}:${row.alias}`)) fail(`${row.alias}: Wave 12 materialized alias missing`);
if (new Set([...actors.map(row => row.id), ...organizations.map(row => row.id)]).size !== actors.length + organizations.length) fail('Wave 12 canonical ID collision');
if (publicInterestMap?.inventory?.canonical?.actors !== actors.length || publicInterestMap?.inventory?.canonical?.organizations !== organizations.length) fail('Wave 12 cross-corpus canonical inventory drift');

const extensionEntityRows = extensionRows.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliasRows = extensionRows.filter(row => row.registry_row_type === 'alias_extension');
if (extensionEntityRows.length !== policy.expected.new_entity_records) fail('Wave 12 entity extension count drift');
if (extensionAliasRows.length !== policy.expected.new_alias_records) fail('Wave 12 alias extension count drift');
if (new Set(extensionRows.map(row => row.registry_key)).size !== extensionRows.length) fail('duplicate Wave 12 extension registry key');
for (const row of extensionRows) {
  if (row.active_projection_extension !== true || row.external_axm_gate_complete !== true || row.cross_case_join_authorized !== false) fail(`${row.registry_key}: extension state drift`);
  if (row.accepted_local_canonical_resolution !== true || row.accepted_cross_case_identity_bridge !== false || row.participation_created !== false) fail(`${row.registry_key}: extension semantic boundary drift`);
  if (row.review_dependency?.required_to_decide !== false || row.reversibility?.mode !== 'append_preserving_supersession' || row.graph_effect !== 'none') fail(`${row.registry_key}: extension judgment contract drift`);
}

if (participation.length !== mutationPlan?.before?.participation_rows || stableDigest(participation) !== mutationPlan?.before?.participation_digest_sha256) fail('Wave 12 changed participation rows');
if (active?.entities?.length !== mutationPlan?.expected_after?.active_entities) fail('Wave 12 active entity count drift');
if (active?.claims?.length !== mutationPlan?.before?.active_claims || stableDigest(active?.claims) !== mutationPlan?.before?.active_claim_digest_sha256) fail('Wave 12 active claim payload drift');
if (stableDigest(hopGraph?.edges) !== mutationPlan?.before?.hop_edge_digest_sha256) fail('Wave 12 hop edge payload drift');
if (stableDigest(hopGraph?.rejected_hop_surfaces) !== mutationPlan?.before?.hop_rejected_surface_digest_sha256) fail('Wave 12 rejected surface payload drift');
if (stableDigest(hopGraph?.rejected_hop_pairs) !== mutationPlan?.before?.hop_rejected_pair_digest_sha256) fail('Wave 12 rejected pair payload drift');

if (receipt?.counts?.bounded_hold_rows !== decisions.length || receipt?.counts?.source_rows !== sources.length || receipt?.counts?.accepted_local_canonical_resolutions !== localResolutions.length) fail('Wave 12 receipt denominator drift');
if (receipt?.counts?.actor_records_added !== actorAdditions.length || receipt?.counts?.organization_records_added !== organizationAdditions.length || receipt?.counts?.aliases_added !== aliasAdditions.length) fail('Wave 12 receipt mutation count drift');
if (receipt?.counts?.participation_rows_added !== 0 || receipt?.counts?.accepted_cross_case_identity_bridges !== 0 || receipt?.counts?.graph_edge_delta !== 0) fail('Wave 12 receipt semantic delta drift');
if (receipt?.canonical_mutations_applied !== true || receipt?.local_resolution_registry_built !== true || receipt?.identity_extension_registry_built !== true || receipt?.decisions_requiring_human_permission !== 0) fail('Wave 12 receipt completion state drift');

try { assert.deepEqual(projection?.decisions, decisions); } catch (error) { fail(`Wave 12 generated decision projection drift: ${error.message}`); }
try { assert.deepEqual(projection?.local_resolutions, localResolutions); } catch (error) { fail(`Wave 12 generated local-resolution projection drift: ${error.message}`); }
try { assert.deepEqual(projection?.mutations, mutationPlan?.mutations); } catch (error) { fail(`Wave 12 generated mutation projection drift: ${error.message}`); }

const surfaceResolutionByLocal = new Map((surfaceGraph?.local_canonical_resolutions ?? []).map(row => [row.local_subject_id, row]));
for (const row of localResolutions) {
  const surfaceRow = surfaceResolutionByLocal.get(row.local_subject_id);
  if (!surfaceRow || surfaceRow.canonical_id !== row.canonical_id || surfaceRow.resolution_id !== row.resolution_id) fail(`${row.local_subject_id}: surface graph local resolution missing`);
}
if ((surfaceGraph?.organizations ?? []).some(row => row.id === 'adl')) fail('legacy ADL node survived after canonical retargeting');
const canonicalAdl = (surfaceGraph?.organizations ?? []).find(row => row.id === 'anti-defamation-league');
if (!canonicalAdl) fail('canonical Anti-Defamation League missing from surface graph');
else if (!(canonicalAdl.legacy_local_ids ?? []).includes('adl')) fail('canonical Anti-Defamation League lacks legacy local ID context');
if (!(surfaceGraph?.aliases ?? []).some(row => row.alias === 'ADL' && row.canonical_id === 'anti-defamation-league')) fail('ADL alias does not resolve to canonical target');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.source_registry_path, policy.decision_registry_path, policy.local_resolution_registry_path, policy.mutation_plan_path, policy.extension_registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== false || row.authoritative_reachable !== true) fail(`${relative}: source-control state drift`);
}
for (const relative of [policy.source_registry_path, policy.decision_registry_path, policy.local_resolution_registry_path, policy.extension_registry_path]) {
  if (fileByPath.get(relative)?.index_file !== true) fail(`${relative}: expected index surface`);
}
if (fileByPath.get(policy.projection_path)?.generated !== true || fileByPath.get(policy.projection_path)?.index_file !== true) fail('Wave 12 projection is not a generated index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function validateLakeObject(idKey, idValue, sourcePath, projectionPath, label) {
  const object = objectByKey.get(`${idKey}:${idValue}`);
  if (!object) { fail(`${label}: lake object missing`); return; }
  if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${label}: source/projection/index state drift`);
  if (!object.occurrences.some(item => item.path === sourcePath && item.generated === false)) fail(`${label}: source occurrence missing`);
  if (!object.occurrences.some(item => item.path === projectionPath && item.generated === true)) fail(`${label}: projection occurrence missing`);
}
let decisionsObserved = 0;
for (const row of decisions) {
  validateLakeObject('decision_id', row.decision_id, policy.decision_registry_path, policy.projection_path, row.decision_id);
  decisionsObserved += 1;
}
let resolutionsObserved = 0;
for (const row of localResolutions) {
  validateLakeObject('resolution_id', row.resolution_id, policy.local_resolution_registry_path, policy.projection_path, row.resolution_id);
  resolutionsObserved += 1;
}
let extensionEntitiesObserved = 0;
for (const row of extensionEntityRows) {
  validateLakeObject('axm_entity_id', row.axm_entity_id, policy.extension_registry_path, 'build/axm-identity.json', row.local_id);
  validateLakeObject('legacy_provisional_entity_id', row.legacy_provisional_entity_id, policy.extension_registry_path, 'build/axm-identity.json', `${row.local_id}:legacy`);
  extensionEntitiesObserved += 1;
}

if (reconciliation?.after?.decision_rows !== decisions.length || reconciliation?.after?.local_resolution_rows !== localResolutions.length || reconciliation?.after?.source_rows !== sources.length) fail('Wave 12 reconciliation denominator drift');
if (reconciliation?.after?.actor_records_added !== actorAdditions.length || reconciliation?.after?.organization_records_added !== organizationAdditions.length || reconciliation?.after?.aliases_added !== aliasAdditions.length) fail('Wave 12 reconciliation mutation count drift');
if (reconciliation?.after?.decision_ids_source_projection_and_index_observed !== decisions.length || reconciliation?.after?.resolution_ids_source_projection_and_index_observed !== localResolutions.length || reconciliation?.after?.extension_entity_ids_source_projection_and_index_observed !== extensionEntityRows.length) fail('Wave 12 reconciliation observation count drift');
if (reconciliation?.after?.accepted_cross_case_identity_bridges !== 0 || reconciliation?.after?.participation_rows_added !== 0 || reconciliation?.after?.active_claim_delta !== 0 || reconciliation?.after?.graph_edge_delta !== 0) fail('Wave 12 reconciliation semantic delta drift');
for (const field of [
  'complete_hold_denominator_resolved',
  'every_source_row_publicly_inspectable',
  'every_local_resolution_explicit_and_reversible',
  'canonical_mutations_applied',
  'local_resolution_registry_built',
  'identity_extension_registry_built',
  'every_decision_id_source_projection_and_index_observed',
  'every_resolution_id_source_projection_and_index_observed',
  'every_extension_entity_id_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'participation_payload_unchanged',
  'active_claim_payload_unchanged',
  'hop_edge_payload_unchanged',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 12 completion ${field} missing`);
for (const field of ['automatic_cross_case_join_authorized', 'cross_case_graph_join_authorized', 'cross_case_hop_creation_authorized', 'evidence_truth_determined', 'publication_cleared']) {
  if (reconciliation?.completion?.[field] !== false) fail(`Wave 12 completion ${field} boundary drift`);
}
if (reconciliation?.completion?.accepted_local_canonical_resolutions !== localResolutions.length || reconciliation?.completion?.accepted_cross_case_identity_bridges !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 12 completion count drift');

if (!/bounded-hold resolution/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 12 contract');
if (!/bounded-hold resolution/i.test(readme)) fail('README lacks Wave 12 contract');
if (!report.includes('accepted cross-case identity bridges:0')) fail('Wave 12 report lacks cross-case bridge boundary');
if (!reconciliationReport.includes('hop edge delta:                          0')) fail('Wave 12 reconciliation report lacks zero-hop delta');
for (const [name, boundaries] of [['policy', policy.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.local_canonical_resolution_is_cross_case_bridge !== false) fail(`${name}: cross-case bridge boundary missing`);
  if (boundaries?.local_canonical_resolution_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.local_canonical_resolution_creates_participation !== false) fail(`${name}: participation boundary missing`);
  if (boundaries?.local_canonical_resolution_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph boundary drift`);
}

if (errors.length) {
  console.error(`lake bounded-hold resolution Wave 12 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('lake bounded-hold resolution Wave 12 validation: OK');
console.log(`  sources / decisions / local resolutions: ${sources.length} / ${decisions.length} / ${localResolutions.length}`);
console.log(`  actors / organizations / aliases added: ${actorAdditions.length} / ${organizationAdditions.length} / ${aliasAdditions.length}`);
console.log(`  decision / resolution / extension IDs observed: ${decisionsObserved} / ${resolutionsObserved} / ${extensionEntitiesObserved}`);
console.log('  cross-case bridge, claim, participation, relationship, graph, and hop deltas: 0');
