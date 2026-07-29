#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson } from './lib/ledger.mjs';
import { loadLocalCanonicalResolutionIndex } from './lib/local-canonical-resolution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-subject-projection-wave-13-policy.json';
const full = relative => path.join(root, relative);

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
function manifest(paths) {
  return uniqueSorted(paths).map(relative => {
    const bytes = fs.readFileSync(full(relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
  });
}
function manifestFingerprint(rows) {
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}
function normalized(value) {
  return String(value ?? '').toLowerCase();
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-canonical-subject-projection-wave-13-policy@1');
const resolutionIndex = loadLocalCanonicalResolutionIndex({ refresh: true });
const resolutionEntries = [...resolutionIndex.current_by_case_and_local.values()]
  .sort((left, right) => `${left.row.source_case_id}\0${left.row.local_subject_id}`.localeCompare(`${right.row.source_case_id}\0${right.row.local_subject_id}`));
assert.equal(resolutionEntries.length, policy.expected.current_resolution_rows, 'Wave 13 current resolution denominator drift');
assert.equal(resolutionIndex.registry_paths.length, policy.expected.current_resolution_registry_files, 'Wave 13 resolution registry file count drift');

const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const briefingIndex = readJson('build/briefings/index.json');
const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
assert.ok(caseIndex.cases.length >= policy.expected.minimum_compiled_cases, 'Wave 13 compiled case denominator below minimum');
assert.ok(briefingIndex.counts.briefings >= policy.expected.minimum_reporter_briefings, 'Wave 13 briefing denominator below minimum');

const compiledCaseById = new Map();
const sourceClaimFiles = [];
const sourceClaimManifest = [];
let sourceClaimRows = 0;
let sourceSubjectIdChanges = 0;
let sourceClaimTextChanges = 0;
for (const entry of caseIndex.cases) {
  const compiled = readJson(entry.href);
  compiledCaseById.set(entry.case_id, compiled);
  const sourceClaimsPath = `cases/${entry.case_id}/claims.jsonl`;
  assert.ok(fs.existsSync(full(sourceClaimsPath)), `${entry.case_id}: source claims file missing`);
  sourceClaimFiles.push(sourceClaimsPath);
  const sourceClaims = readJsonl(sourceClaimsPath);
  sourceClaimRows += sourceClaims.length;
  const sourceById = new Map(sourceClaims.map(claim => [claim.claim_id, claim]));
  assert.equal(compiled.claims.length, sourceClaims.length, `${entry.case_id}: compiled/source claim denominator mismatch`);
  for (const claim of compiled.claims) {
    const source = sourceById.get(claim.claim_id);
    assert.ok(source, `${entry.case_id}/${claim.claim_id}: source claim missing`);
    if (claim.subject_id !== source.subject_id) sourceSubjectIdChanges += 1;
    if (claim.plain !== source.plain) sourceClaimTextChanges += 1;
    assert.ok(claim.subject_identity, `${entry.case_id}/${claim.claim_id}: subject_identity projection missing`);
    assert.equal(claim.subject_identity.local_subject_id, claim.subject_id, `${entry.case_id}/${claim.claim_id}: local subject ID not preserved`);
    assert.equal(claim.subject_identity.case_id, entry.case_id, `${entry.case_id}/${claim.claim_id}: subject case scope drift`);
    assert.equal(claim.subject_identity.source_records_mutated, false);
    assert.equal(claim.subject_identity.source_records_merged, false);
    assert.equal(claim.subject_identity.relationship_created, false);
    assert.equal(claim.subject_identity.participation_created, false);
    assert.equal(claim.subject_identity.graph_effect, 'none');
  }
  const bytes = fs.readFileSync(full(sourceClaimsPath));
  sourceClaimManifest.push({ path: sourceClaimsPath, bytes: bytes.length, sha256: sha256(bytes) });
}
assert.equal(sourceSubjectIdChanges, policy.expected.source_case_mutations, 'Wave 13 changed source subject IDs');
assert.equal(sourceClaimTextChanges, policy.expected.source_case_mutations, 'Wave 13 changed source claim text');

const catalogClaimsByCaseAndLocal = new Map();
for (const claim of publicCatalog.claims ?? []) {
  const key = `${claim.case_id}\0${claim.subject_id}`;
  if (!catalogClaimsByCaseAndLocal.has(key)) catalogClaimsByCaseAndLocal.set(key, []);
  catalogClaimsByCaseAndLocal.get(key).push(claim);
}
const catalogSubjectByKey = new Map((publicCatalog.subjects ?? []).map(row => [row.key, row]));
const briefingManifestByCase = new Map();
for (const entry of briefingIndex.briefings ?? []) {
  const manifestPath = `build/briefings/${entry.case_id}.json`;
  briefingManifestByCase.set(entry.case_id, readJson(manifestPath));
}

const aliasRows = surfaceGraph.aliases ?? [];
const resolutionProjections = [];
let caseResolutionOccurrences = 0;
let catalogResolutionOccurrences = 0;
let briefingResolutionOccurrences = 0;
let searchableResolutionRows = 0;
for (const entry of resolutionEntries) {
  const row = entry.row;
  const compiled = compiledCaseById.get(row.source_case_id);
  assert.ok(compiled, `${row.resolution_id}: compiled source case ${row.source_case_id} missing`);
  const caseClaims = compiled.claims.filter(claim => claim.subject_id === row.local_subject_id);
  assert.ok(caseClaims.length > 0, `${row.resolution_id}: no compiled claim subject occurrence`);
  for (const claim of caseClaims) {
    assert.equal(claim.subject_identity.canonical_subject_id, row.canonical_id, `${row.resolution_id}/${claim.claim_id}: canonical subject drift`);
    assert.equal(claim.subject_identity.canonical_kind, row.canonical_kind, `${row.resolution_id}/${claim.claim_id}: canonical kind drift`);
    assert.equal(claim.subject_identity.resolution_id, row.resolution_id, `${row.resolution_id}/${claim.claim_id}: resolution ID drift`);
    assert.ok(claim.subject_identity.search_keys.includes(row.local_subject_id), `${row.resolution_id}/${claim.claim_id}: local search key missing`);
    assert.ok(claim.subject_identity.search_keys.includes(row.canonical_id), `${row.resolution_id}/${claim.claim_id}: canonical search key missing`);
  }
  caseResolutionOccurrences += caseClaims.length;

  const catalogClaims = catalogClaimsByCaseAndLocal.get(`${row.source_case_id}\0${row.local_subject_id}`) ?? [];
  assert.equal(catalogClaims.length, caseClaims.length, `${row.resolution_id}: catalog claim occurrence drift`);
  for (const claim of catalogClaims) {
    assert.equal(claim.canonical_subject_id, row.canonical_id, `${row.resolution_id}/${claim.claim_id}: catalog canonical subject drift`);
    assert.equal(claim.subject_identity.resolution_id, row.resolution_id, `${row.resolution_id}/${claim.claim_id}: catalog resolution drift`);
    assert.ok(claim.subject_search_keys.includes(row.local_subject_id), `${row.resolution_id}/${claim.claim_id}: catalog local search key missing`);
    assert.ok(claim.subject_search_keys.includes(row.canonical_id), `${row.resolution_id}/${claim.claim_id}: catalog canonical search key missing`);
  }
  catalogResolutionOccurrences += catalogClaims.length;

  const subjectKey = `canonical:${row.canonical_id}`;
  const catalogSubject = catalogSubjectByKey.get(subjectKey);
  assert.ok(catalogSubject, `${row.resolution_id}: catalog subject ${subjectKey} missing`);
  assert.ok(catalogSubject.local_subjects.some(item => item.case_id === row.source_case_id && item.local_subject_id === row.local_subject_id && item.resolution_id === row.resolution_id), `${row.resolution_id}: catalog local-subject provenance missing`);

  const directCanonicalSearch = row.local_subject_id === row.canonical_id;
  const searchAlias = aliasRows.find(alias => alias.kind === row.canonical_kind
    && alias.canonical_id === row.canonical_id
    && normalized(alias.alias) === normalized(row.local_subject_id));
  assert.ok(directCanonicalSearch || searchAlias, `${row.resolution_id}: local subject is not searchable through canonical ID or alias`);
  if (searchAlias) {
    assert.notEqual(searchAlias.source, 'inferred');
    assert.equal(searchAlias.graph_effect ?? 'none', 'none');
  }
  searchableResolutionRows += 1;

  const briefing = briefingManifestByCase.get(row.source_case_id);
  const briefingClaims = briefing
    ? (briefing.claim_ids ?? []).filter(claimId => caseClaims.some(claim => claim.claim_id === claimId))
    : [];
  if (briefingClaims.length) {
    const briefingSubject = (briefing.subjects ?? []).find(subject => subject.canonical_subject_id === row.canonical_id
      && subject.local_subjects.some(item => item.case_id === row.source_case_id && item.local_subject_id === row.local_subject_id));
    assert.ok(briefingSubject, `${row.resolution_id}: briefing subject projection missing`);
    assert.ok(briefingClaims.every(claimId => briefingSubject.claim_ids.includes(claimId)), `${row.resolution_id}: briefing claim coverage drift`);
  }
  briefingResolutionOccurrences += briefingClaims.length;

  resolutionProjections.push({
    resolution_id: row.resolution_id,
    source_registry_path: entry.source_path,
    source_case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    canonical_id: row.canonical_id,
    canonical_kind: row.canonical_kind,
    case_claim_ids: caseClaims.map(claim => claim.claim_id).sort(),
    catalog_claim_ids: catalogClaims.map(claim => claim.key).sort(),
    catalog_subject_key: subjectKey,
    search_mode: directCanonicalSearch ? 'canonical_id' : 'canonical_alias',
    search_alias: searchAlias?.alias ?? null,
    briefing_claim_ids: briefingClaims.sort(),
    source_subject_id_preserved: true,
    claim_text_preserved: true,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  });
}

const allCompiledClaims = [...compiledCaseById.values()].flatMap(item => item.claims);
const resolvedCompiledClaims = allCompiledClaims.filter(claim => claim.subject_identity.resolution_status === 'resolved_local_to_canonical');
assert.ok(allCompiledClaims.length >= policy.expected.minimum_case_claim_subject_references);
assert.ok(resolvedCompiledClaims.length >= policy.expected.minimum_resolved_case_claim_subject_references);
assert.ok((publicCatalog.subjects ?? []).length >= policy.expected.minimum_public_catalog_subjects);
assert.equal(searchableResolutionRows, resolutionEntries.length, 'not every resolution is searchable');

const sourcePaths = [
  policyPath,
  ...policy.input_paths,
  ...sourceClaimFiles,
  'tools/build-lake-canonical-subject-projection-wave-13.mjs',
  'tools/reconcile-lake-canonical-subject-projection-wave-13.mjs',
  'tools/validate-lake-canonical-subject-projection-wave-13.mjs',
  'test/lake-canonical-subject-projection-wave-13.test.js'
].filter(relative => fs.existsSync(full(relative)));
const inputManifest = manifest(sourcePaths);
const sourceFingerprint = manifestFingerprint(inputManifest);
const counts = {
  resolution_registry_files: resolutionIndex.registry_paths.length,
  resolution_rows: resolutionEntries.length,
  compiled_cases: compiledCaseById.size,
  source_claim_files: sourceClaimFiles.length,
  source_claim_rows: sourceClaimRows,
  case_claim_subject_references: allCompiledClaims.length,
  resolved_case_claim_subject_references: resolvedCompiledClaims.length,
  unresolved_case_claim_subject_references: allCompiledClaims.length - resolvedCompiledClaims.length,
  distinct_case_local_subjects: caseIndex.subject_identity_projection?.counts?.distinct_case_local_subjects ?? null,
  distinct_canonical_subjects: caseIndex.subject_identity_projection?.counts?.canonical_subjects ?? null,
  case_resolution_occurrences: caseResolutionOccurrences,
  catalog_claim_subject_references: publicCatalog.counts.subject_references,
  catalog_resolved_subject_references: publicCatalog.counts.resolved_subject_references,
  catalog_unresolved_subject_references: publicCatalog.counts.unresolved_subject_references,
  public_catalog_subjects: publicCatalog.counts.subjects,
  public_catalog_canonical_subjects: publicCatalog.counts.canonical_subjects,
  catalog_resolution_occurrences: catalogResolutionOccurrences,
  searchable_resolution_rows: searchableResolutionRows,
  local_subject_search_aliases: (surfaceGraph.aliases ?? []).filter(alias => alias.source === 'local_canonical_subject_search_projection').length,
  ambiguous_local_subject_search_keys: surfaceGraph.ambiguous_local_canonical_search_keys?.length ?? 0,
  reporter_briefings: briefingIndex.counts.briefings,
  briefing_subject_references: briefingIndex.counts.subject_references,
  briefing_resolved_subject_references: briefingIndex.counts.resolved_subject_references,
  briefing_unresolved_subject_references: briefingIndex.counts.unresolved_subject_references,
  briefing_resolution_occurrences: briefingResolutionOccurrences,
  source_subject_id_changes: sourceSubjectIdChanges,
  source_claim_text_changes: sourceClaimTextChanges,
  accepted_cross_case_identity_bridges: 0,
  decisions_requiring_human_permission: 0
};

const graphDigests = {
  participation_sha256: stableDigest(participation),
  active_claims_sha256: stableDigest(activeIdentity.claims),
  hop_edges_sha256: stableDigest(hopGraph.edges),
  rejected_hop_surfaces_sha256: stableDigest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: stableDigest(hopGraph.rejected_hop_pairs)
};
const projection = {
  schema_version: 'canonical-subject-projection-wave-13@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  source_claim_manifest: sourceClaimManifest,
  counts,
  graph_digests: graphDigests,
  resolutions: resolutionProjections,
  completion: {
    every_current_resolution_projected_into_compiled_cases: resolutionProjections.every(row => row.case_claim_ids.length > 0),
    every_current_resolution_projected_into_public_catalog: resolutionProjections.every(row => row.catalog_claim_ids.length > 0),
    every_current_resolution_searchable: searchableResolutionRows === resolutionEntries.length,
    briefing_subjects_projected_for_selected_claims: true,
    unresolved_subjects_visible: publicCatalog.counts.unresolved_subject_references > 0,
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
  schema_version: 'canonical-subject-projection-wave-13-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  source_claim_manifest: sourceClaimManifest,
  counts,
  graph_digests: graphDigests,
  projection_paths: {
    compiled_cases: 'build/cases',
    public_catalog: 'build/public-catalog.json',
    surface_search: 'build/surface-graph.json',
    reporter_briefings: 'build/briefings'
  },
  completion: projection.completion,
  boundaries: policy.boundaries
};
writeJson(policy.projection_path, projection);
writeJson(policy.plan_path, plan);
const report = `# Canonical subject projection Wave 13

Source fingerprint: \`${sourceFingerprint}\`

## Projection census

\`\`\`text
current resolution rows:                 ${counts.resolution_rows}
compiled cases:                          ${counts.compiled_cases}
case claim subject references:           ${counts.case_claim_subject_references}
resolved case subject references:        ${counts.resolved_case_claim_subject_references}
unresolved case subject references:      ${counts.unresolved_case_claim_subject_references}
case resolution occurrences:             ${counts.case_resolution_occurrences}
public catalog subjects:                 ${counts.public_catalog_subjects}
catalog resolution occurrences:          ${counts.catalog_resolution_occurrences}
searchable resolution rows:              ${counts.searchable_resolution_rows}
local-subject search aliases:             ${counts.local_subject_search_aliases}
ambiguous search keys held:               ${counts.ambiguous_local_subject_search_keys}
reporter briefings:                       ${counts.reporter_briefings}
briefing resolved subject references:     ${counts.briefing_resolved_subject_references}
source subject-ID changes:                ${counts.source_subject_id_changes}
source claim-text changes:                ${counts.source_claim_text_changes}
relationship / participation / hop delta: 0 / 0 / 0
human-permission dependencies:            0
\`\`\`

## Judgment

Accepted case-scoped subject resolutions are now usable in compiled cases, the public catalog, browser search, and selected reporter-briefing claim manifests without rewriting source subject IDs or claim text. Unresolved subjects remain visible. A search alias is emitted only when the local key is globally unambiguous; ambiguous keys are refused rather than silently joined.
`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);
console.log('canonical subject projection Wave 13 built');
console.log(`  resolutions projected: ${counts.resolution_rows}/${counts.resolution_rows}`);
console.log(`  case / catalog resolution occurrences: ${counts.case_resolution_occurrences} / ${counts.catalog_resolution_occurrences}`);
console.log(`  searchable resolutions / ambiguous keys: ${counts.searchable_resolution_rows} / ${counts.ambiguous_local_subject_search_keys}`);
console.log(`  source subject/text mutations and graph effects: ${counts.source_subject_id_changes} / ${counts.source_claim_text_changes} / 0`);
