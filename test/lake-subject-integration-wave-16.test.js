#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function run(file, ...args) {
  const result = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
  }
  assert.equal(result.status, 0, `${file} ${args.join(' ')} failed`);
}

const policy = readJson('data/project/lake-subject-integration-wave-16-policy.json');
const sealedPaths = [
  'build/exact-canonical-subject-projection-wave-14.json',
  'build/lake-actions/exact-canonical-subject-wave-14.json',
  'build/lake-actions/exact-canonical-subject-wave-14-reconciliation.json',
  'data/project/lake-exact-canonical-subject-wave-14.json',
  'data/project/lake-unresolved-subject-registry-wave-14.jsonl',
  'build/unresolved-subject-adjudication-wave-15.json',
  'build/lake-actions/unresolved-subject-adjudication-wave-15.json',
  'build/lake-actions/unresolved-subject-adjudication-wave-15-reconciliation.json',
  'data/project/lake-unresolved-subject-adjudication-wave-15.json',
  'data/project/lake-unresolved-subject-adjudication-registry-wave-15.jsonl'
];
const sealedHashes = Object.fromEntries(sealedPaths.map(file => [file, sha256(file)]));

function buildWave16() {
  run('tools/project-lake-subject-objects-wave-16.mjs', '--target=cases');
  run('tools/project-lake-subject-objects-wave-16.mjs', '--target=catalog');
  run('tools/build-lake-subject-integration-wave-16.mjs');
}

buildWave16();
const deterministicPaths = [
  policy.paths.identity_extension_registry,
  policy.paths.projection,
  policy.paths.plan,
  policy.paths.report
];
const firstHashes = Object.fromEntries(deterministicPaths.map(file => [file, sha256(file)]));
buildWave16();
for (const file of deterministicPaths) assert.equal(sha256(file), firstHashes[file], `${file}: Wave 16 build is not deterministic`);
for (const file of sealedPaths) assert.equal(sha256(file), sealedHashes[file], `${file}: sealed historical product changed`);

const projection = readJson(policy.paths.projection);
const plan = readJson(policy.paths.plan);
const localResolutions = readJsonl(policy.paths.local_resolution_registry);
const subjectObjects = readJsonl(policy.paths.subject_object_registry);
const extensions = readJsonl(policy.paths.identity_extension_registry);
const caseIndex = readJson('build/cases/index.json');
const cases = new Map(caseIndex.cases.map(entry => [entry.case_id, readJson(entry.href)]));
const catalog = readJson('build/public-catalog.json');
const organizations = readJson('data/canonical/organizations.json').organizations;
const activeIdentity = readJson('build/axm-identity.json');
const hopGraphText = fs.readFileSync('build/hop-graph.json', 'utf8');

assert.equal(projection.schema_version, 'lake-subject-integration-wave-16@1');
assert.equal(plan.schema_version, 'lake-subject-integration-wave-16-plan@1');
for (const [field, expected] of Object.entries(policy.expected)) {
  if (!field.endsWith('_source_projection_and_index_observed')) assert.equal(projection.counts[field], expected, `Wave 16 count ${field} drift`);
}
assert.equal(localResolutions.length, policy.expected.identity_decisions);
assert.equal(subjectObjects.length, policy.expected.subject_object_rows);
assert.equal(extensions.length, policy.expected.identity_extension_rows);
assert.equal(caseIndex.subject_identity_projection.counts.resolved_subject_references, policy.expected.resolved_identity_references_after);
assert.equal(caseIndex.subject_identity_projection.counts.unresolved_subject_references, policy.expected.unresolved_identity_references_after);
assert.equal(caseIndex.subject_object_projection.counts.typed_subject_object_references, policy.expected.subject_object_claim_references_integrated);
assert.equal(caseIndex.subject_object_projection.counts.distinct_subject_objects, policy.expected.subject_object_rows);
assert.equal(caseIndex.subject_object_projection.counts.generic_unresolved_references, 0);
assert.equal(catalog.counts.typed_subject_object_references, policy.expected.subject_object_claim_references_integrated);
assert.equal(catalog.counts.distinct_subject_objects, policy.expected.subject_object_rows);
assert.equal(catalog.counts.generic_unresolved_subject_references, 0);

function claim(caseId, claimId) {
  const row = cases.get(caseId)?.claims.find(item => item.claim_id === claimId);
  assert.ok(row, `${caseId}/${claimId}: claim missing`);
  return row;
}

const anduril = claim('anduril-access-ownership', 'clm-axis-working-proposition');
assert.equal(anduril.subject_id, 'anduril-industries');
assert.equal(anduril.subject_identity.canonical_subject_id, 'anduril');
assert.equal(anduril.subject_identity.resolution_basis, 'explicit_case_scoped_resolution');
assert.ok(anduril.subject_identity.resolution_id.startsWith('LOCALCANON-'));
assert.equal(anduril.subject_object, undefined);

const no10 = claim('uk-ai-policy', 'clm-e-no10-starmer-layer');
assert.equal(no10.subject_id, 'no10');
assert.equal(no10.subject_identity.canonical_subject_id, 'no-10');
assert.equal(no10.subject_identity.resolution_basis, 'explicit_case_scoped_resolution');

const codeFirstGirls = claim('uk-ai-policy', 'clm-e-code-first-mc');
assert.equal(codeFirstGirls.subject_id, 'code-first-girls');
assert.equal(codeFirstGirls.subject_identity.canonical_subject_id, 'code-first-girls');
assert.equal(codeFirstGirls.subject_identity.resolution_basis, 'explicit_case_scoped_resolution');
assert.ok(organizations.some(row => row.id === 'code-first-girls' && row.source === 'lake-subject-integration-wave-16'));

const detachment = claim('uk-ai-policy', 'clm-e-detachment-201-umbrella-u15-umbrella-membership');
assert.equal(detachment.subject_identity.canonical_subject_id, 'detachment-201');
assert.ok(organizations.some(row => row.id === 'detachment-201' && row.kind === 'military_unit'));

const contractOrder = claim('anduril-access-ownership', 'clm-cbp-order-362974500');
assert.equal(contractOrder.subject_identity.resolution_status, 'local_only_unresolved');
assert.equal(contractOrder.subject_object.object_kind, 'contract_order_identifier');
assert.ok(contractOrder.subject_object.subject_object_id.startsWith('SUBJECTOBJECT-'));
assert.equal(contractOrder.subject_object.actor_or_organization_join_authorized, false);

const crucible = claim('field-autopsy-03', 'clm-submissions-133');
assert.equal(crucible.subject_identity.resolution_status, 'local_only_unresolved');
assert.equal(crucible.subject_object.object_kind, 'defense_innovation_program');

const raymondFault = claim('arcadia-field-autopsy', 'clm-raymond-fault');
assert.equal(raymondFault.subject_object.object_kind, 'geological_feature');

for (const row of catalog.claims) {
  if (row.subject_object_id) {
    assert.equal(row.canonical_subject_id, null, `${row.key}: subject object received canonical identity`);
    assert.ok(row.subject_object_kind);
  }
}

const activeByLocal = new Map(activeIdentity.entities.map(row => [row.local_id, row]));
for (const row of extensions) {
  const entity = activeByLocal.get(row.local_id);
  assert.ok(entity, `${row.registry_key}: active entity missing`);
  assert.equal(entity.axm_entity_id, row.axm_entity_id);
  assert.equal(entity.legacy_provisional_entity_id, row.legacy_provisional_entity_id);
  assert.equal(row.participation_created, false);
  assert.equal(row.cross_case_join_authorized, false);
  assert.equal(row.graph_effect, 'none');
}

assert.deepEqual(projection.source_claim_manifest.map(row => row.path).sort(), [
  'cases/anduril-access-ownership/claims.jsonl',
  'cases/arcadia-field-autopsy/claims.jsonl',
  'cases/field-autopsy-03/claims.jsonl',
  'cases/uk-ai-policy/claims.jsonl'
]);
for (const row of projection.source_claim_manifest) assert.equal(sha256(row.path), row.sha256, `${row.path}: source claim bytes changed`);
for (const row of localResolutions) assert.doesNotMatch(hopGraphText, new RegExp(row.resolution_id));
for (const row of subjectObjects) assert.doesNotMatch(hopGraphText, new RegExp(row.subject_object_id));

assert.equal(projection.completion.all_wave_15_identity_decisions_integrated, true);
assert.equal(projection.completion.all_wave_15_nonidentity_objects_integrated, true);
assert.equal(projection.completion.generic_unresolved_claim_references, 0);
assert.equal(projection.completion.sealed_wave_14_and_wave_15_products_regenerated, false);
assert.equal(projection.completion.source_subject_ids_preserved, true);
assert.equal(projection.completion.source_claim_text_preserved, true);
assert.equal(projection.completion.relationship_created, false);
assert.equal(projection.completion.participation_created, false);
assert.equal(projection.completion.accepted_cross_case_identity_bridges, 0);
assert.equal(projection.completion.decisions_requiring_human_permission, 0);
assert.equal(projection.completion.graph_effect, 'none');

console.log('lake-subject-integration-wave-16.test: OK (17 identities, 40 subject objects, 93 references fully integrated, generic unresolved 0, graph effect none)');
