#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function run(file) {
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
  }
  assert.equal(result.status, 0, `${file} failed`);
}

const policy = readJson('data/project/lake-canonical-subject-projection-wave-13-policy.json');
run('tools/build-lake-canonical-subject-projection-wave-13.mjs');
const deterministicPaths = [policy.projection_path, policy.plan_path, policy.report_path];
const firstHashes = Object.fromEntries(deterministicPaths.map(file => [file, sha256(file)]));
run('tools/build-lake-canonical-subject-projection-wave-13.mjs');
for (const file of deterministicPaths) assert.equal(sha256(file), firstHashes[file], `${file}: Wave 13 build is not deterministic`);

const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const cases = new Map(readJson('build/cases/index.json').cases.map(entry => [entry.case_id, readJson(entry.href)]));
const catalog = readJson('build/public-catalog.json');
const surfaceGraph = readJson('build/surface-graph.json');
const briefingIndex = readJson('build/briefings/index.json');
const hopGraphText = fs.readFileSync('build/hop-graph.json', 'utf8');

assert.equal(projection.schema_version, 'canonical-subject-projection-wave-13@1');
assert.equal(plan.schema_version, 'canonical-subject-projection-wave-13-plan@1');
assert.equal(projection.counts.resolution_rows, 12);
assert.equal(projection.resolutions.length, 12);
assert.equal(projection.counts.searchable_resolution_rows, 12);
assert.equal(projection.counts.source_subject_id_changes, 0);
assert.equal(projection.counts.source_claim_text_changes, 0);
assert.equal(projection.completion.every_current_resolution_projected_into_compiled_cases, true);
assert.equal(projection.completion.every_current_resolution_projected_into_public_catalog, true);
assert.equal(projection.completion.every_current_resolution_searchable, true);
assert.equal(projection.completion.unresolved_subjects_visible, true);
assert.equal(projection.completion.decisions_requiring_human_permission, 0);
assert.equal(projection.completion.graph_effect, 'none');

function claim(caseId, claimId) {
  const row = cases.get(caseId)?.claims.find(item => item.claim_id === claimId);
  assert.ok(row, `${caseId}/${claimId}: compiled claim missing`);
  return row;
}
function assertResolved(caseId, claimId, localSubjectId, canonicalId, canonicalKind) {
  const row = claim(caseId, claimId);
  assert.equal(row.subject_id, localSubjectId);
  assert.equal(row.subject_identity.local_subject_id, localSubjectId);
  assert.equal(row.subject_identity.canonical_subject_id, canonicalId);
  assert.equal(row.subject_identity.canonical_kind, canonicalKind);
  assert.equal(row.subject_identity.resolution_status, 'resolved_local_to_canonical');
  assert.ok(row.subject_identity.resolution_id);
  assert.ok(row.subject_identity.search_keys.includes(localSubjectId));
  assert.ok(row.subject_identity.search_keys.includes(canonicalId));
  assert.equal(row.subject_identity.source_records_mutated, false);
  assert.equal(row.subject_identity.source_records_merged, false);
  assert.equal(row.subject_identity.relationship_created, false);
  assert.equal(row.subject_identity.participation_created, false);
  assert.equal(row.subject_identity.graph_effect, 'none');
  return row;
}

assertResolved('arcadia-field-autopsy', 'clm-daia-assessment-bookends', 'org-daia', 'arcadia-improvement-association', 'organization');
assertResolved('arcadia-field-autopsy', 'clm-incorporation', 'org-city-of-arcadia', 'city-of-arcadia', 'organization');
assertResolved('arcadia-field-autopsy', 'clm-arcadia-station-betterments', 'org-city-arcadia', 'city-of-arcadia', 'organization');
assertResolved('arcadia-field-autopsy', 'clm-monrovia', 'org-tcr', 'trammell-crow-residential', 'organization');
assertResolved('uk-ai-policy', 'clm-e-adl-umbrella-u13-umbrella-membership', 'adl', 'anti-defamation-league', 'organization');
assertResolved('uk-ai-policy', 'clm-e-safegraph-hoffman', 'safegraph', 'safegraph', 'organization');
assertResolved('field-autopsy-03', 'clm-fit-data-blanket', 'org-data-blanket', 'data-blanket', 'organization');

const unresolved = claim('field-autopsy-03', 'clm-submissions-133');
assert.equal(unresolved.subject_identity.resolution_status, 'local_only_unresolved');
assert.equal(unresolved.subject_identity.canonical_subject_id, null);
assert.ok(projection.counts.unresolved_case_claim_subject_references > 0);

const daiaCatalogClaim = catalog.claims.find(item => item.case_id === 'arcadia-field-autopsy' && item.claim_id === 'clm-daia-assessment-bookends');
assert.ok(daiaCatalogClaim);
assert.equal(daiaCatalogClaim.subject_id, 'org-daia');
assert.equal(daiaCatalogClaim.canonical_subject_id, 'arcadia-improvement-association');
assert.ok(daiaCatalogClaim.subject_search_keys.includes('org-daia'));
assert.ok(daiaCatalogClaim.subject_search_keys.includes('Arcadia Improvement Association'));
const daiaCatalogSubject = catalog.subjects.find(item => item.key === 'canonical:arcadia-improvement-association');
assert.ok(daiaCatalogSubject);
assert.ok(daiaCatalogSubject.local_subjects.some(item => item.case_id === 'arcadia-field-autopsy' && item.local_subject_id === 'org-daia'));
assert.ok(catalog.counts.resolved_subject_references > 0);
assert.ok(catalog.counts.unresolved_subject_references > 0);

const localSearchAlias = surfaceGraph.aliases.find(alias => alias.canonical_id === 'arcadia-improvement-association' && alias.alias === 'org-daia');
assert.ok(localSearchAlias, 'local subject ID must be searchable as a bounded canonical alias');
assert.equal(localSearchAlias.source, 'local_canonical_subject_search_projection');
assert.equal(localSearchAlias.graph_effect, 'none');
const adlSearchAlias = surfaceGraph.aliases.find(alias => alias.canonical_id === 'anti-defamation-league' && String(alias.alias).toLowerCase() === 'adl');
assert.ok(adlSearchAlias, 'ADL local key must remain searchable through the canonical alias');
assert.equal(surfaceGraph.ambiguous_local_canonical_search_keys.length, 0);

assert.equal(briefingIndex.counts.subject_references, briefingIndex.counts.claims);
assert.equal(briefingIndex.counts.resolved_subject_references + briefingIndex.counts.unresolved_subject_references, briefingIndex.counts.subject_references);
for (const entry of briefingIndex.briefings) {
  assert.equal(entry.subject_identity_projection.graph_effect, 'none');
  assert.equal(entry.subject_identity_projection.counts.subject_references, entry.counts.claims);
}

for (const row of projection.resolutions) {
  assert.doesNotMatch(hopGraphText, new RegExp(row.resolution_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(row.case_claim_ids.length > 0);
  assert.equal(row.case_claim_ids.length, row.catalog_claim_ids.length);
  assert.equal(row.source_subject_id_preserved, true);
  assert.equal(row.claim_text_preserved, true);
  assert.equal(row.relationship_created, false);
  assert.equal(row.participation_created, false);
  assert.equal(row.accepted_cross_case_identity_bridge, false);
  assert.equal(row.automatic_cross_case_join_authorized, false);
  assert.equal(row.graph_effect, 'none');
}

console.log(`lake-canonical-subject-projection-wave-13.test: OK (${projection.counts.resolution_rows} resolutions; ${projection.counts.resolved_case_claim_subject_references} resolved and ${projection.counts.unresolved_case_claim_subject_references} unresolved subject references; graph effect none)`);
