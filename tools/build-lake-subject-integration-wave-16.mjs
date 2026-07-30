#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson, writeJsonl } from './lib/ledger.mjs';
import { loadLocalCanonicalResolutionIndex } from './lib/local-canonical-resolution.mjs';
import { loadSubjectObjectResolutionIndex } from './lib/subject-object-resolution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-subject-integration-wave-16-policy.json';

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

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function inputManifest(paths) {
  return uniqueSorted(paths).map(relative => {
    const bytes = fs.readFileSync(full(relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
  });
}

function fingerprint(rows) {
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function normalized(value) {
  return String(value ?? '').toLowerCase();
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-subject-integration-wave-16-policy@1');
for (const relative of [
  policy.baseline.wave_15_receipt_path,
  policy.baseline.wave_15_registry_path,
  policy.paths.local_resolution_registry,
  policy.paths.subject_object_registry,
  'build/cases/index.json',
  'build/public-catalog.json',
  'build/surface-graph.json',
  'build/axm-identity.json',
  'build/hop-graph.json'
]) assert.ok(fs.existsSync(full(relative)), `Wave 16 required input missing: ${relative}`);

const wave15Receipt = readJson(policy.baseline.wave_15_receipt_path);
const wave15Decisions = readJsonl(policy.baseline.wave_15_registry_path);
const decisionById = new Map(wave15Decisions.map(row => [row.adjudication_id, row]));
assert.equal(wave15Receipt.post_execution_reconciliation_complete, true);
assert.equal(wave15Decisions.length, policy.expected.wave_15_decisions);

const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const aliases = readJson('data/canonical/aliases.json').aliases;
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const surfaceGraph = readJson('build/surface-graph.json');
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const localResolutionIndex = loadLocalCanonicalResolutionIndex({ refresh: true });
const subjectObjectIndex = loadSubjectObjectResolutionIndex({ refresh: true });

assert.equal(actors.length, policy.expected.canonical_actor_rows_after);
assert.equal(organizations.length, policy.expected.canonical_organization_rows_after);
assert.equal(aliases.length, policy.expected.canonical_alias_rows_after);
assert.equal(activeIdentity.entities.length, policy.expected.active_axm_entities_after);
assert.equal(activeIdentity.claims.length, policy.expected.active_axm_claims_after);
assert.equal(localResolutionIndex.current_by_case_and_local.size, policy.expected.local_resolution_rows_after);
assert.equal(localResolutionIndex.registry_paths.length, policy.expected.local_resolution_registry_files_after);
assert.equal(subjectObjectIndex.entries.length, policy.expected.subject_object_rows);
assert.deepEqual(localResolutionIndex.registry_paths, [
  'data/project/lake-local-canonical-resolution-registry-wave-12.jsonl',
  policy.paths.local_resolution_registry
]);
assert.deepEqual(subjectObjectIndex.registry_paths, [policy.paths.subject_object_registry]);

const wave16ResolutionEntries = localResolutionIndex.current_entries
  .filter(entry => entry.source_path === policy.paths.local_resolution_registry)
  .sort((left, right) => left.row.resolution_id.localeCompare(right.row.resolution_id));
assert.equal(wave16ResolutionEntries.length, policy.expected.identity_decisions);

const caseById = new Map();
const sourceClaimManifest = [];
let sourceSubjectIdChanges = 0;
let sourceClaimTextChanges = 0;
for (const entry of caseIndex.cases) {
  const caseItem = readJson(entry.href);
  caseById.set(entry.case_id, caseItem);
  const sourcePath = `cases/${entry.case_id}/claims.jsonl`;
  const sourceClaims = readJsonl(sourcePath);
  const sourceById = new Map(sourceClaims.map(row => [row.claim_id, row]));
  assert.equal(caseItem.claims.length, sourceClaims.length, `${entry.case_id}: source/compiled denominator drift`);
  for (const claim of caseItem.claims) {
    const source = sourceById.get(claim.claim_id);
    assert.ok(source, `${entry.case_id}/${claim.claim_id}: source claim missing`);
    if (source.subject_id !== claim.subject_id) sourceSubjectIdChanges += 1;
    if (source.plain !== claim.plain) sourceClaimTextChanges += 1;
  }
  const bytes = fs.readFileSync(full(sourcePath));
  sourceClaimManifest.push({ path: sourcePath, bytes: bytes.length, sha256: sha256(bytes) });
}
assert.equal(sourceSubjectIdChanges, policy.expected.source_subject_id_changes);
assert.equal(sourceClaimTextChanges, policy.expected.source_claim_text_changes);

const catalogClaimByKey = new Map(publicCatalog.claims.map(row => [row.key, row]));
const surfaceAliases = surfaceGraph.aliases ?? [];
const resolutionProjections = [];
let identityClaimReferences = 0;
for (const entry of wave16ResolutionEntries) {
  const row = entry.row;
  const decision = decisionById.get(row.source_decision_id);
  assert.ok(decision, `${row.resolution_id}: Wave 15 source decision missing`);
  assert.notEqual(decision.disposition, 'bounded_nonidentity_object', `${row.resolution_id}: nonidentity decision entered identity registry`);
  assert.equal(decision.source_case_id, row.source_case_id);
  assert.equal(decision.local_subject_id, row.local_subject_id);
  assert.equal(decision.canonical_target.canonical_id, row.canonical_id);
  assert.equal(decision.canonical_target.canonical_kind, row.canonical_kind);
  const caseItem = caseById.get(row.source_case_id);
  assert.ok(caseItem, `${row.resolution_id}: compiled case missing`);
  const caseClaims = caseItem.claims.filter(claim => claim.subject_id === row.local_subject_id);
  assert.equal(caseClaims.length, decision.claim_count, `${row.resolution_id}: claim reference denominator drift`);
  for (const claim of caseClaims) {
    assert.equal(claim.subject_identity?.canonical_subject_id, row.canonical_id, `${row.resolution_id}/${claim.claim_id}: canonical ID drift`);
    assert.equal(claim.subject_identity?.canonical_kind, row.canonical_kind, `${row.resolution_id}/${claim.claim_id}: canonical kind drift`);
    assert.equal(claim.subject_identity?.resolution_id, row.resolution_id, `${row.resolution_id}/${claim.claim_id}: resolution ID drift`);
    assert.equal(claim.subject_identity?.resolution_basis, 'explicit_case_scoped_resolution', `${row.resolution_id}/${claim.claim_id}: explicit basis drift`);
    assert.equal(claim.subject_object ?? null, null, `${row.resolution_id}/${claim.claim_id}: identity claim also received subject object`);
  }
  const catalogClaims = caseClaims.map(claim => catalogClaimByKey.get(`${row.source_case_id}::${claim.claim_id}`));
  assert.ok(catalogClaims.every(Boolean), `${row.resolution_id}: public catalog occurrence missing`);
  for (const claim of catalogClaims) {
    assert.equal(claim.canonical_subject_id, row.canonical_id, `${row.resolution_id}/${claim.claim_id}: catalog canonical ID drift`);
    assert.equal(claim.subject_identity?.resolution_id, row.resolution_id, `${row.resolution_id}/${claim.claim_id}: catalog resolution drift`);
    assert.equal(claim.subject_object ?? null, null, `${row.resolution_id}/${claim.claim_id}: catalog identity claim also received subject object`);
  }
  const directSearch = row.local_subject_id === row.canonical_id;
  const alias = surfaceAliases.find(item => item.kind === row.canonical_kind
    && item.canonical_id === row.canonical_id
    && normalized(item.alias) === normalized(row.local_subject_id));
  assert.ok(directSearch || alias, `${row.resolution_id}: integrated local subject is not searchable`);
  if (alias) {
    assert.equal(alias.source, 'local_canonical_subject_search_projection');
    assert.equal(alias.graph_effect, 'none');
  }
  identityClaimReferences += caseClaims.length;
  resolutionProjections.push({
    resolution_id: row.resolution_id,
    source_decision_id: row.source_decision_id,
    source_registry_path: entry.source_path,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    canonical_id: row.canonical_id,
    canonical_kind: row.canonical_kind,
    claim_ids: caseClaims.map(claim => claim.claim_id).sort(),
    public_catalog_claim_ids: catalogClaims.map(claim => claim.key).sort(),
    search_mode: directSearch ? 'canonical_id' : 'canonical_alias',
    source_subject_id_preserved: true,
    source_claim_text_preserved: true,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    graph_effect: 'none'
  });
}
assert.equal(identityClaimReferences, policy.expected.identity_claim_references_integrated);

const subjectObjectProjections = [];
let subjectObjectClaimReferences = 0;
for (const entry of subjectObjectIndex.entries) {
  const row = entry.row;
  const decision = decisionById.get(row.source_decision_id);
  assert.ok(decision, `${row.subject_object_id}: Wave 15 source decision missing`);
  assert.equal(decision.disposition, 'bounded_nonidentity_object', `${row.subject_object_id}: identity decision entered subject-object registry`);
  assert.equal(decision.subject_object_id, row.subject_object_id);
  assert.equal(decision.object_kind, row.object_kind);
  const caseItem = caseById.get(row.source_case_id);
  assert.ok(caseItem, `${row.subject_object_id}: compiled case missing`);
  const caseClaims = caseItem.claims.filter(claim => claim.subject_id === row.local_subject_id);
  assert.equal(caseClaims.length, decision.claim_count, `${row.subject_object_id}: claim reference denominator drift`);
  for (const claim of caseClaims) {
    assert.equal(claim.subject_identity?.resolution_status, 'local_only_unresolved', `${row.subject_object_id}/${claim.claim_id}: nonidentity object became canonical identity`);
    assert.equal(claim.subject_object?.subject_object_id, row.subject_object_id, `${row.subject_object_id}/${claim.claim_id}: subject-object ID drift`);
    assert.equal(claim.subject_object?.object_kind, row.object_kind, `${row.subject_object_id}/${claim.claim_id}: object kind drift`);
    assert.equal(claim.subject_object?.source_decision_id, row.source_decision_id, `${row.subject_object_id}/${claim.claim_id}: source decision drift`);
  }
  const catalogClaims = caseClaims.map(claim => catalogClaimByKey.get(`${row.source_case_id}::${claim.claim_id}`));
  assert.ok(catalogClaims.every(Boolean), `${row.subject_object_id}: public catalog occurrence missing`);
  for (const claim of catalogClaims) {
    assert.equal(claim.subject_object_id, row.subject_object_id, `${row.subject_object_id}/${claim.claim_id}: catalog subject-object ID drift`);
    assert.equal(claim.subject_object_kind, row.object_kind, `${row.subject_object_id}/${claim.claim_id}: catalog object kind drift`);
    assert.equal(claim.canonical_subject_id, null, `${row.subject_object_id}/${claim.claim_id}: nonidentity object received canonical ID`);
  }
  subjectObjectClaimReferences += caseClaims.length;
  subjectObjectProjections.push({
    subject_object_id: row.subject_object_id,
    source_decision_id: row.source_decision_id,
    source_registry_path: entry.source_path,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    object_kind: row.object_kind,
    claim_ids: caseClaims.map(claim => claim.claim_id).sort(),
    public_catalog_claim_ids: catalogClaims.map(claim => claim.key).sort(),
    actor_or_organization_join_authorized: false,
    identity_resolution_created: false,
    relationship_created: false,
    participation_created: false,
    automatic_cross_case_join_authorized: false,
    graph_effect: 'none'
  });
}
assert.equal(subjectObjectClaimReferences, policy.expected.subject_object_claim_references_integrated);

assert.equal(caseIndex.subject_identity_projection.counts.subject_references, policy.baseline.claim_subject_references);
assert.equal(caseIndex.subject_identity_projection.counts.resolved_subject_references, policy.expected.resolved_identity_references_after);
assert.equal(caseIndex.subject_identity_projection.counts.unresolved_subject_references, policy.expected.unresolved_identity_references_after);
assert.equal(caseIndex.subject_object_projection.counts.typed_subject_object_references, policy.expected.subject_object_claim_references_integrated);
assert.equal(caseIndex.subject_object_projection.counts.distinct_subject_objects, policy.expected.subject_object_rows);
assert.equal(caseIndex.subject_object_projection.counts.generic_unresolved_references, policy.expected.generic_unresolved_claim_references);
assert.equal(publicCatalog.counts.resolved_subject_references, policy.expected.resolved_identity_references_after);
assert.equal(publicCatalog.counts.unresolved_subject_references, policy.expected.unresolved_identity_references_after);
assert.equal(publicCatalog.counts.typed_subject_object_references, policy.expected.subject_object_claim_references_integrated);
assert.equal(publicCatalog.counts.distinct_subject_objects, policy.expected.subject_object_rows);
assert.equal(publicCatalog.counts.generic_unresolved_subject_references, policy.expected.generic_unresolved_claim_references);

const plannedDecisions = wave15Decisions.filter(row => row.disposition === 'identity_new_canonical_plan')
  .sort((left, right) => left.canonical_target.canonical_id.localeCompare(right.canonical_target.canonical_id));
const entityByLocal = new Map(activeIdentity.entities.map(row => [row.local_id, row]));
const resolutionByDecision = new Map(wave16ResolutionEntries.map(entry => [entry.row.source_decision_id, entry.row]));
const identityExtensionRows = plannedDecisions.map(decision => {
  const target = decision.canonical_target;
  const entity = entityByLocal.get(target.canonical_id);
  assert.ok(entity, `${target.canonical_id}: active AXM entity missing`);
  assert.equal(entity.kind, 'organization', `${target.canonical_id}: active AXM kind drift`);
  assert.equal(entity.label, target.canonical_label, `${target.canonical_id}: active AXM label drift`);
  const resolution = resolutionByDecision.get(decision.adjudication_id);
  assert.ok(resolution, `${target.canonical_id}: Wave 16 local resolution missing`);
  return {
    schema_version: 'axm-canonical-identity-extension@1',
    registry_row_type: 'entity_extension',
    registry_key: `W16-ENTITY:${target.canonical_id}`,
    local_id: target.canonical_id,
    canonical_kind: 'organization',
    canonical_label: target.canonical_label,
    source_local_subject_id: decision.local_subject_id,
    source_decision_id: decision.adjudication_id,
    source_ids: uniqueSorted(decision.receipt_ids),
    axm_entity_id: entity.axm_entity_id,
    legacy_provisional_entity_id: entity.legacy_provisional_entity_id,
    alias_axm_ids: [...entity.alias_axm_ids],
    legacy_provisional_alias_ids: [...entity.legacy_provisional_alias_ids],
    active_projection_extension: true,
    external_axm_gate_complete: true,
    cross_case_join_authorized: false,
    accepted_local_canonical_resolution: true,
    accepted_cross_case_identity_bridge: false,
    participation_created: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_extension_row_and_retire_or_relabel_the_canonical_record_without_deleting_this_row'
    },
    graph_effect: 'none'
  };
});
assert.equal(identityExtensionRows.length, policy.expected.identity_extension_rows);
writeJsonl(policy.paths.identity_extension_registry, identityExtensionRows);

const graphDigests = {
  participation_sha256: stableDigest(participation),
  active_claims_sha256: stableDigest(activeIdentity.claims),
  hop_edges_sha256: stableDigest(hopGraph.edges),
  rejected_hop_surfaces_sha256: stableDigest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: stableDigest(hopGraph.rejected_hop_pairs)
};

const implementationPaths = [
  'tools/apply-lake-subject-integration-wave-16-sources.mjs',
  'tools/lib/subject-object-resolution.mjs',
  'tools/project-lake-subject-objects-wave-16.mjs',
  'tools/build-lake-subject-integration-wave-16.mjs',
  'tools/reconcile-lake-subject-integration-wave-16.mjs',
  'tools/validate-lake-subject-integration-wave-16.mjs',
  'test/lake-subject-integration-wave-16.test.js'
];
const manifestPaths = [
  policyPath,
  ...policy.input_paths,
  policy.paths.local_resolution_registry,
  policy.paths.subject_object_registry,
  policy.paths.identity_extension_registry,
  'build/canonical-subject-projection-wave-13.json',
  ...sourceClaimManifest.map(row => row.path),
  ...implementationPaths
].filter(relative => fs.existsSync(full(relative)));
const manifest = inputManifest(manifestPaths);
const sourceFingerprint = fingerprint(manifest);
const counts = {
  wave_15_decisions: wave15Decisions.length,
  identity_decisions: resolutionProjections.length,
  existing_identity_resolutions: resolutionProjections.filter(row => decisionById.get(row.source_decision_id)?.disposition !== 'identity_new_canonical_plan').length,
  new_canonical_records: identityExtensionRows.length,
  nonidentity_object_decisions: subjectObjectProjections.length,
  identity_claim_references_integrated: identityClaimReferences,
  subject_object_claim_references_integrated: subjectObjectClaimReferences,
  generic_unresolved_claim_references: caseIndex.subject_object_projection.counts.generic_unresolved_references,
  local_resolution_rows_after: localResolutionIndex.current_by_case_and_local.size,
  local_resolution_registry_files_after: localResolutionIndex.registry_paths.length,
  canonical_actor_rows_after: actors.length,
  canonical_organization_rows_after: organizations.length,
  canonical_alias_rows_after: aliases.length,
  active_axm_entities_after: activeIdentity.entities.length,
  active_axm_claims_after: activeIdentity.claims.length,
  resolved_identity_references_after: caseIndex.subject_identity_projection.counts.resolved_subject_references,
  unresolved_identity_references_after: caseIndex.subject_identity_projection.counts.unresolved_subject_references,
  subject_object_rows: subjectObjectProjections.length,
  identity_extension_rows: identityExtensionRows.length,
  source_subject_id_changes: sourceSubjectIdChanges,
  source_claim_text_changes: sourceClaimTextChanges,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0,
  accepted_cross_case_identity_bridges: 0,
  decisions_requiring_human_permission: 0
};
for (const [field, expected] of Object.entries(policy.expected)) {
  if (field.endsWith('_source_projection_and_index_observed')) continue;
  assert.equal(counts[field], expected, `Wave 16 count ${field} drift`);
}

const projection = {
  schema_version: 'lake-subject-integration-wave-16@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  source_claim_manifest: sourceClaimManifest,
  counts,
  graph_digests: graphDigests,
  identity_resolutions: resolutionProjections,
  subject_objects: subjectObjectProjections,
  identity_extensions: identityExtensionRows,
  completion: {
    all_wave_15_identity_decisions_integrated: resolutionProjections.length === policy.expected.identity_decisions,
    all_wave_15_nonidentity_objects_integrated: subjectObjectProjections.length === policy.expected.nonidentity_object_decisions,
    every_identity_claim_projected_into_cases_and_catalog: identityClaimReferences === policy.expected.identity_claim_references_integrated,
    every_subject_object_claim_projected_into_cases_and_catalog: subjectObjectClaimReferences === policy.expected.subject_object_claim_references_integrated,
    generic_unresolved_claim_references: 0,
    new_canonical_records_materialized: identityExtensionRows.length === policy.expected.new_canonical_records,
    sealed_wave_14_and_wave_15_products_regenerated: false,
    source_subject_ids_preserved: sourceSubjectIdChanges === 0,
    source_claim_text_preserved: sourceClaimTextChanges === 0,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
const plan = {
  schema_version: 'lake-subject-integration-wave-16-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts,
  projection_paths: {
    compiled_cases: 'build/cases',
    public_catalog: 'build/public-catalog.json',
    surface_search: 'build/surface-graph.json',
    active_axm_identity: 'build/axm-identity.json'
  },
  completion: projection.completion,
  boundaries: policy.boundaries
};
writeJson(policy.paths.projection, projection);
writeJson(policy.paths.plan, plan);
const report = `# Subject integration — Wave 16\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nWave 15 decisions:                         ${counts.wave_15_decisions}\nidentity decisions integrated:             ${counts.identity_decisions}\nidentity claim references integrated:       ${counts.identity_claim_references_integrated}\ntyped subject objects integrated:           ${counts.subject_object_rows}\nsubject-object claim references integrated: ${counts.subject_object_claim_references_integrated}\ngeneric unresolved claim references:        ${counts.generic_unresolved_claim_references}\nnew canonical records:                      ${counts.new_canonical_records}\ncanonical organizations:                    ${policy.baseline.canonical_organization_rows} -> ${counts.canonical_organization_rows_after}\nactive AXM entities:                        ${policy.baseline.active_axm_entities} -> ${counts.active_axm_entities_after}\nresolved / unresolved identity references:  ${counts.resolved_identity_references_after} / ${counts.unresolved_identity_references_after}\nsource subject/text changes:                 0 / 0\nparticipation / active claim / graph / hop:  0 / 0 / 0 / 0\naccepted cross-case identity bridges:        0\nhuman-permission dependencies:               0\ngraph effect:                                none\n\`\`\`\n\nThe live generated subject layer now distinguishes canonical identity from typed nonidentity objects. The 64 identity-unresolved references are all explicitly typed subject objects; the generic unresolved denominator is zero. Sealed Wave 14 and Wave 15 products remain historical and are not regenerated.\n`;
fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
fs.writeFileSync(full(policy.paths.report), report);

let preserveCompletedReceipt = false;
if (fs.existsSync(full(policy.paths.receipt)) && fs.existsSync(full(policy.paths.reconciliation))) {
  try {
    const existingReceipt = readJson(policy.paths.receipt);
    const existingReconciliation = readJson(policy.paths.reconciliation);
    preserveCompletedReceipt = existingReceipt.schema_version === 'lake-subject-integration-wave-16@1'
      && existingReceipt.post_execution_reconciliation_complete === true
      && existingReconciliation.completion?.post_execution_reconciliation_complete === true;
  } catch {
    preserveCompletedReceipt = false;
  }
}
if (!preserveCompletedReceipt) {
  writeJson(policy.paths.receipt, {
    schema_version: 'lake-subject-integration-wave-16@1',
    program_key: policy.program_key,
    as_of: policy.as_of,
    source_fingerprint_sha256: sourceFingerprint,
    input_manifest: manifest,
    counts: {
      ...counts,
      resolution_ids_source_projection_and_index_observed: 0,
      subject_object_ids_source_projection_and_index_observed: 0
    },
    post_execution_reconciliation_complete: false,
    correction_mode: policy.decision_law.correction_mode,
    boundaries: policy.boundaries
  });
}

console.log('subject integration Wave 16 built');
console.log(`  identity decisions / claim references: ${counts.identity_decisions} / ${counts.identity_claim_references_integrated}`);
console.log(`  subject objects / claim references: ${counts.subject_object_rows} / ${counts.subject_object_claim_references_integrated}`);
console.log(`  generic unresolved / graph / human-permission effects: ${counts.generic_unresolved_claim_references} / 0 / 0`);
