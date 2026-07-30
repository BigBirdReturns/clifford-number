#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-subject-integration-wave-16-policy.json';
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

function lakeRows() {
  if (fs.existsSync(full('build/lake-index.json'))) {
    return {
      files: readJson('build/lake-index.json')?.files ?? [],
      objects: readJson('build/lake-object-index.json')?.objects ?? []
    };
  }
  return {
    files: readJsonl('build/lake-index/files.jsonl'),
    objects: readJsonl('build/lake-index/objects.jsonl')
  };
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const projection = readJson(policy.paths.projection);
const plan = readJson(policy.paths.plan);
const receipt = readJson(policy.paths.receipt);
const reconciliation = readJson(policy.paths.reconciliation);
const localResolutionRows = readJsonl(policy.paths.local_resolution_registry);
const subjectObjectRows = readJsonl(policy.paths.subject_object_registry);
const extensionRows = readJsonl(policy.paths.identity_extension_registry);
const actors = readJson('data/canonical/actors.json')?.actors ?? [];
const organizations = readJson('data/canonical/organizations.json')?.organizations ?? [];
const aliases = readJson('data/canonical/aliases.json')?.aliases ?? [];
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const surfaceGraph = readJson('build/surface-graph.json');
const wave13Projection = readJson('build/canonical-subject-projection-wave-13.json');
const wave14Receipt = readJson(policy.baseline.wave_15_receipt_path.replace('wave-15.json', 'wave-14.json'));
const wave15Receipt = readJson(policy.baseline.wave_15_receipt_path);
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');
const report = fs.existsSync(full(policy.paths.report)) ? fs.readFileSync(full(policy.paths.report), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.paths.reconciliation_report)) ? fs.readFileSync(full(policy.paths.reconciliation_report), 'utf8') : '';
const { files, objects } = lakeRows();

if (policy.schema_version !== 'lake-subject-integration-wave-16-policy@1') fail('unexpected Wave 16 policy schema');
if (projection?.schema_version !== 'lake-subject-integration-wave-16@1') fail('unexpected Wave 16 projection schema');
if (plan?.schema_version !== 'lake-subject-integration-wave-16-plan@1') fail('unexpected Wave 16 plan schema');
if (receipt?.schema_version !== 'lake-subject-integration-wave-16@1') fail('unexpected Wave 16 receipt schema');
if (reconciliation?.schema_version !== 'lake-subject-integration-wave-16-reconciliation@1') fail('unexpected Wave 16 reconciliation schema');
for (const artifact of [projection, plan, receipt, reconciliation]) {
  if (artifact?.program_key !== policy.program_key) fail('Wave 16 program key drift');
  if (artifact?.source_fingerprint_sha256 !== manifestFingerprint(artifact?.input_manifest)) fail('Wave 16 fingerprint mismatch');
}
validateManifest(projection?.input_manifest, 'Wave 16 projection manifest');
validateManifest(receipt?.input_manifest, 'Wave 16 receipt manifest');
validateManifest(reconciliation?.input_manifest, 'Wave 16 reconciliation manifest');

for (const [field, expected] of Object.entries(policy.expected)) {
  if (projection?.counts?.[field] !== expected && !field.endsWith('_source_projection_and_index_observed')) fail(`Wave 16 projection count ${field} drift`);
}
if (receipt?.counts?.resolution_ids_source_projection_and_index_observed !== policy.expected.resolution_ids_source_projection_and_index_observed) fail('Wave 16 receipt resolution observation drift');
if (receipt?.counts?.subject_object_ids_source_projection_and_index_observed !== policy.expected.subject_object_ids_source_projection_and_index_observed) fail('Wave 16 receipt subject-object observation drift');
if (localResolutionRows.length !== policy.expected.identity_decisions) fail('Wave 16 local resolution denominator drift');
if (subjectObjectRows.length !== policy.expected.subject_object_rows) fail('Wave 16 subject-object denominator drift');
if (extensionRows.length !== policy.expected.identity_extension_rows) fail('Wave 16 identity extension denominator drift');
if (new Set(localResolutionRows.map(row => row.resolution_id)).size !== localResolutionRows.length) fail('duplicate Wave 16 resolution ID');
if (new Set(subjectObjectRows.map(row => row.subject_object_id)).size !== subjectObjectRows.length) fail('duplicate Wave 16 subject-object ID');
if (new Set(extensionRows.map(row => row.registry_key)).size !== extensionRows.length) fail('duplicate Wave 16 extension key');

if (actors.length !== policy.expected.canonical_actor_rows_after) fail('Wave 16 canonical actor count drift');
if (organizations.length !== policy.expected.canonical_organization_rows_after) fail('Wave 16 canonical organization count drift');
if (aliases.length !== policy.expected.canonical_alias_rows_after) fail('Wave 16 canonical alias count drift');
if (activeIdentity?.entities?.length !== policy.expected.active_axm_entities_after) fail('Wave 16 active AXM entity count drift');
if (activeIdentity?.claims?.length !== policy.expected.active_axm_claims_after) fail('Wave 16 active AXM claim count drift');
if (caseIndex?.subject_identity_projection?.counts?.resolved_subject_references !== policy.expected.resolved_identity_references_after) fail('Wave 16 case resolved identity count drift');
if (caseIndex?.subject_identity_projection?.counts?.unresolved_subject_references !== policy.expected.unresolved_identity_references_after) fail('Wave 16 case unresolved identity count drift');
if (caseIndex?.subject_object_projection?.counts?.typed_subject_object_references !== policy.expected.subject_object_claim_references_integrated) fail('Wave 16 case subject-object reference count drift');
if (caseIndex?.subject_object_projection?.counts?.distinct_subject_objects !== policy.expected.subject_object_rows) fail('Wave 16 case subject-object count drift');
if (caseIndex?.subject_object_projection?.counts?.generic_unresolved_references !== 0) fail('Wave 16 case generic unresolved denominator is not zero');
if (publicCatalog?.counts?.resolved_subject_references !== policy.expected.resolved_identity_references_after) fail('Wave 16 catalog resolved identity count drift');
if (publicCatalog?.counts?.unresolved_subject_references !== policy.expected.unresolved_identity_references_after) fail('Wave 16 catalog unresolved identity count drift');
if (publicCatalog?.counts?.typed_subject_object_references !== policy.expected.subject_object_claim_references_integrated) fail('Wave 16 catalog subject-object reference count drift');
if (publicCatalog?.counts?.distinct_subject_objects !== policy.expected.subject_object_rows) fail('Wave 16 catalog subject-object count drift');
if (publicCatalog?.counts?.generic_unresolved_subject_references !== 0) fail('Wave 16 catalog generic unresolved denominator is not zero');
if (wave13Projection?.counts?.resolution_rows !== policy.expected.local_resolution_rows_after) fail('Wave 13 live resolution count does not include Wave 16');
if (wave13Projection?.counts?.resolution_registry_files !== policy.expected.local_resolution_registry_files_after) fail('Wave 13 live registry count does not include Wave 16');

const organizationById = new Map(organizations.map(row => [row.id, row]));
const entityByLocal = new Map((activeIdentity?.entities ?? []).map(row => [row.local_id, row]));
for (const row of extensionRows) {
  if (row.schema_version !== 'axm-canonical-identity-extension@1' || row.registry_row_type !== 'entity_extension') fail(`${row.registry_key}: extension schema drift`);
  const organization = organizationById.get(row.local_id);
  if (!organization) fail(`${row.registry_key}: canonical organization missing`);
  else {
    if (organization.label !== row.canonical_label) fail(`${row.registry_key}: canonical label drift`);
    if (organization.source !== 'lake-subject-integration-wave-16') fail(`${row.registry_key}: canonical source drift`);
    if (organization.graph_effect !== 'none') fail(`${row.registry_key}: canonical graph effect drift`);
  }
  const entity = entityByLocal.get(row.local_id);
  if (!entity) fail(`${row.registry_key}: active AXM entity missing`);
  else if (entity.axm_entity_id !== row.axm_entity_id || entity.legacy_provisional_entity_id !== row.legacy_provisional_entity_id) fail(`${row.registry_key}: active AXM identity drift`);
  if (row.active_projection_extension !== true || row.external_axm_gate_complete !== true) fail(`${row.registry_key}: active AXM extension incomplete`);
  if (row.cross_case_join_authorized !== false || row.accepted_cross_case_identity_bridge !== false || row.participation_created !== false || row.review_dependency?.required_to_decide !== false || row.graph_effect !== 'none') fail(`${row.registry_key}: extension boundary drift`);
}

if (stableDigest(participation) !== projection?.graph_digests?.participation_sha256) fail('Wave 16 participation payload changed');
if (stableDigest(activeIdentity?.claims) !== projection?.graph_digests?.active_claims_sha256) fail('Wave 16 active claim payload changed');
if (stableDigest(hopGraph?.edges) !== projection?.graph_digests?.hop_edges_sha256) fail('Wave 16 hop edge payload changed');
if (stableDigest(hopGraph?.rejected_hop_surfaces) !== projection?.graph_digests?.rejected_hop_surfaces_sha256) fail('Wave 16 rejected hop surface payload changed');
if (stableDigest(hopGraph?.rejected_hop_pairs) !== projection?.graph_digests?.rejected_hop_pairs_sha256) fail('Wave 16 rejected hop pair payload changed');
for (const row of projection?.source_claim_manifest ?? []) {
  if (!fs.existsSync(full(row.path))) fail(`${row.path}: source claim file missing`);
  else {
    const bytes = fs.readFileSync(full(row.path));
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) fail(`${row.path}: source claim bytes changed`);
  }
}

const caseDocs = new Map((caseIndex?.cases ?? []).map(entry => [entry.case_id, readJson(entry.href)]));
const catalogClaimByKey = new Map((publicCatalog?.claims ?? []).map(row => [row.key, row]));
let identityClaimReferences = 0;
for (const row of localResolutionRows) {
  if (row.schema_version !== 'local-canonical-resolution@1' || row.status !== 'accepted_graph_inert_local_resolution') fail(`${row.resolution_id}: local resolution schema/status drift`);
  if (row.explicit_same_entity_assertion !== true || row.entities_merged !== false || row.relationship_created !== false || row.participation_created !== false || row.accepted_cross_case_identity_bridge !== false || row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false || row.review_dependency?.required_to_decide !== false || row.graph_effect !== 'none') fail(`${row.resolution_id}: local resolution boundary drift`);
  const claims = caseDocs.get(row.source_case_id)?.claims?.filter(claim => claim.subject_identity?.resolution_id === row.resolution_id) ?? [];
  if (!claims.length) fail(`${row.resolution_id}: compiled case projection missing`);
  for (const claim of claims) {
    if (claim.subject_id !== row.local_subject_id || claim.subject_identity?.canonical_subject_id !== row.canonical_id || claim.subject_object) fail(`${row.resolution_id}/${claim.claim_id}: identity projection drift`);
    const catalogClaim = catalogClaimByKey.get(`${row.source_case_id}::${claim.claim_id}`);
    if (catalogClaim?.subject_identity?.resolution_id !== row.resolution_id || catalogClaim?.subject_object) fail(`${row.resolution_id}/${claim.claim_id}: catalog identity projection drift`);
  }
  const searchable = row.local_subject_id === row.canonical_id || (surfaceGraph?.aliases ?? []).some(alias => alias.canonical_id === row.canonical_id && String(alias.alias).toLowerCase() === String(row.local_subject_id).toLowerCase());
  if (!searchable) fail(`${row.resolution_id}: local subject not searchable`);
  identityClaimReferences += claims.length;
}
if (identityClaimReferences !== policy.expected.identity_claim_references_integrated) fail('Wave 16 identity claim-reference denominator drift');

let subjectObjectClaimReferences = 0;
for (const row of subjectObjectRows) {
  if (row.schema_version !== 'subject-object-resolution@1' || row.status !== 'accepted_graph_inert_subject_object') fail(`${row.subject_object_id}: subject-object schema/status drift`);
  if (row.actor_or_organization_join_authorized !== false || row.identity_resolution_created !== false || row.relationship_created !== false || row.participation_created !== false || row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false || row.review_dependency?.required_to_decide !== false || row.graph_effect !== 'none') fail(`${row.subject_object_id}: subject-object boundary drift`);
  const claims = caseDocs.get(row.source_case_id)?.claims?.filter(claim => claim.subject_object?.subject_object_id === row.subject_object_id) ?? [];
  if (!claims.length) fail(`${row.subject_object_id}: compiled case projection missing`);
  for (const claim of claims) {
    if (claim.subject_id !== row.local_subject_id || claim.subject_identity?.resolution_status === 'resolved_local_to_canonical' || claim.subject_object?.object_kind !== row.object_kind) fail(`${row.subject_object_id}/${claim.claim_id}: subject-object projection drift`);
    const catalogClaim = catalogClaimByKey.get(`${row.source_case_id}::${claim.claim_id}`);
    if (catalogClaim?.subject_object_id !== row.subject_object_id || catalogClaim?.canonical_subject_id !== null) fail(`${row.subject_object_id}/${claim.claim_id}: catalog subject-object projection drift`);
  }
  subjectObjectClaimReferences += claims.length;
}
if (subjectObjectClaimReferences !== policy.expected.subject_object_claim_references_integrated) fail('Wave 16 subject-object claim-reference denominator drift');

const hopGraphText = JSON.stringify(hopGraph);
if ([...localResolutionRows.map(row => row.resolution_id), ...subjectObjectRows.map(row => row.subject_object_id)].some(token => hopGraphText.includes(token))) fail('Wave 16 control ID leaked into hop graph');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policyPath, policy.paths.local_resolution_registry, policy.paths.subject_object_registry, policy.paths.identity_extension_registry, policy.paths.receipt]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== false || row.authoritative_reachable !== true) fail(`${relative}: source-control lake state drift`);
}
for (const relative of [policy.paths.projection, policy.paths.plan, policy.paths.reconciliation]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== true || row.authoritative_reachable !== true) fail(`${relative}: generated lake state drift`);
}
const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let resolutionIdsObserved = 0;
for (const row of localResolutionRows) {
  const object = objectByKey.get(`resolution_id:${row.resolution_id}`);
  if (!object || object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.resolution_id}: lake source/projection/index drift`);
  else resolutionIdsObserved += 1;
}
let subjectObjectIdsObserved = 0;
for (const row of subjectObjectRows) {
  const object = objectByKey.get(`subject_object_id:${row.subject_object_id}`);
  if (!object || object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.subject_object_id}: lake source/projection/index drift`);
  else subjectObjectIdsObserved += 1;
}
if (resolutionIdsObserved !== policy.expected.resolution_ids_source_projection_and_index_observed) fail('Wave 16 lake resolution observation count drift');
if (subjectObjectIdsObserved !== policy.expected.subject_object_ids_source_projection_and_index_observed) fail('Wave 16 lake subject-object observation count drift');

if (receipt?.post_execution_reconciliation_complete !== true) fail('Wave 16 receipt is not complete');
for (const field of [
  'all_wave_15_identity_decisions_integrated',
  'all_wave_15_nonidentity_objects_integrated',
  'every_resolution_id_source_projection_and_index_observed',
  'every_subject_object_id_source_projection_and_index_observed',
  'all_identity_extensions_active_and_reconciled',
  'source_subject_ids_preserved',
  'source_claim_text_preserved',
  'participation_payload_unchanged',
  'active_claim_payload_unchanged',
  'hop_edge_payload_unchanged',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 16 completion ${field} missing`);
for (const field of [
  'sealed_wave_14_and_wave_15_products_regenerated',
  'source_records_mutated',
  'source_records_merged',
  'relationship_created',
  'participation_created',
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`Wave 16 completion ${field} boundary drift`);
if (reconciliation?.completion?.generic_unresolved_claim_references !== 0 || reconciliation?.completion?.generic_wait_states !== 0 || reconciliation?.completion?.accepted_cross_case_identity_bridges !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.graph_effect !== 'none') fail('Wave 16 completion count or graph drift');

if (wave14Receipt?.counts?.exact_canonical_id_references !== 212 || wave14Receipt?.counts?.unresolved_distinct_subjects !== 57) fail('sealed Wave 14 receipt drift');
if (wave15Receipt?.counts?.subject_rows !== 57 || wave15Receipt?.counts?.identity_decisions !== 17 || wave15Receipt?.counts?.nonidentity_object_decisions !== 40) fail('sealed Wave 15 receipt drift');
if (!/Integrated subject layer/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 16 contract');
if (!/Integrated subject layer/i.test(readme)) fail('README lacks Wave 16 contract');
if (!report.includes('generic unresolved claim references:        0')) fail('Wave 16 report lacks zero generic unresolved denominator');
if (!reconciliationReport.includes('resolution IDs source/projected/indexed:       17/17')) fail('Wave 16 reconciliation report lacks resolution observation denominator');
if (!reconciliationReport.includes('subject-object IDs source/projected/indexed:   40/40')) fail('Wave 16 reconciliation report lacks subject-object observation denominator');

if (errors.length) {
  console.error(`lake subject integration Wave 16 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('lake subject integration Wave 16 validation: OK');
console.log(`  identity decisions / references: ${localResolutionRows.length} / ${identityClaimReferences}`);
console.log(`  subject objects / references: ${subjectObjectRows.length} / ${subjectObjectClaimReferences}`);
console.log(`  source/projected/indexed: ${resolutionIdsObserved} resolutions; ${subjectObjectIdsObserved} subject objects`);
console.log('  generic unresolved, graph, hop, cross-case bridge, and human-permission effects: 0');
