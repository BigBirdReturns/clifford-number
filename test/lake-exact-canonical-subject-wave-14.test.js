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
function run(file) {
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
  }
  assert.equal(result.status, 0, `${file} failed`);
}
function buildWave14() {
  run('tools/build-lake-exact-canonical-subject-wave-14.mjs');
  run('tools/finalize-lake-exact-canonical-subject-wave-14.mjs');
}

const policy = readJson('data/project/lake-exact-canonical-subject-wave-14-policy.json');
buildWave14();
const deterministicPaths = [policy.projection_path, policy.plan_path, policy.report_path, policy.unresolved_registry_path];
const firstHashes = Object.fromEntries(deterministicPaths.map(file => [file, sha256(file)]));
buildWave14();
for (const file of deterministicPaths) assert.equal(sha256(file), firstHashes[file], `${file}: Wave 14 build is not deterministic`);

const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const caseIndex = readJson('build/cases/index.json');
const cases = new Map(caseIndex.cases.map(entry => [entry.case_id, readJson(entry.href)]));
const catalog = readJson('build/public-catalog.json');
const briefingIndex = readJson('build/briefings/index.json');
const unresolved = readJsonl(policy.unresolved_registry_path);
const wave13 = readJson(policy.baseline.wave_13_projection_path);
const hopGraphText = fs.readFileSync('build/hop-graph.json', 'utf8');

assert.equal(projection.schema_version, 'exact-canonical-subject-projection-wave-14@1');
assert.equal(plan.schema_version, 'exact-canonical-subject-wave-14-plan@1');
assert.equal(projection.counts.claim_subject_references, policy.expected.claim_subject_references);
assert.equal(projection.counts.explicit_resolution_references, policy.expected.explicitly_resolved_references);
assert.equal(projection.counts.exact_canonical_id_references, policy.expected.exact_canonical_references);
assert.equal(projection.counts.exact_canonical_subjects, policy.expected.exact_canonical_subjects);
assert.equal(projection.counts.unresolved_subject_references, policy.expected.unresolved_subject_references);
assert.equal(projection.counts.unresolved_distinct_subjects, policy.expected.unresolved_distinct_subjects);
assert.equal(projection.counts.briefing_exact_canonical_references, policy.expected.briefing_exact_canonical_references);
assert.equal(projection.counts.exact_subject_observation_rows, policy.expected.exact_canonical_subjects);
assert.equal(projection.counts.unresolved_registry_rows, policy.expected.unresolved_distinct_subjects);
assert.deepEqual(projection.unresolved_classification_counts, policy.expected.unresolved_classification_counts);
assert.equal(
  projection.counts.explicit_resolution_references
    + projection.counts.exact_canonical_id_references
    + projection.counts.unresolved_subject_references,
  projection.counts.claim_subject_references
);
assert.equal(projection.counts.unresolved_distinct_subjects, unresolved.length);
assert.equal(Object.values(projection.unresolved_classification_counts).reduce((total, count) => total + count, 0), unresolved.length);
assert.equal(projection.counts.source_subject_id_changes, policy.expected.source_subject_id_changes);
assert.equal(projection.counts.source_claim_text_changes, policy.expected.source_claim_text_changes);
assert.equal(projection.counts.accepted_cross_case_identity_bridges, policy.expected.accepted_cross_case_identity_bridges);
assert.equal(projection.counts.decisions_requiring_human_permission, 0);
assert.equal(projection.finalization.exact_subject_observations_projected, true);
assert.equal(projection.finalization.unresolved_registry_projected, true);
assert.equal(projection.finalization.graph_effect, 'none');
assert.equal(projection.exact_subject_observations.length, policy.expected.exact_canonical_subjects);
assert.equal(projection.unresolved_subjects.length, policy.expected.unresolved_distinct_subjects);
assert.deepEqual(projection.unresolved_subjects, unresolved);
assert.equal(new Set(projection.exact_subject_observations.map(row => row.exact_subject_observation_id)).size, projection.exact_subject_observations.length);
assert.equal(new Set(projection.unresolved_subjects.map(row => row.unresolved_subject_id)).size, projection.unresolved_subjects.length);

function claim(caseId, claimId) {
  const row = cases.get(caseId)?.claims.find(item => item.claim_id === claimId);
  assert.ok(row, `${caseId}/${claimId}: compiled claim missing`);
  return row;
}

const exact = claim('uk-ai-policy', 'clm-clifford-starmer-action-plan');
assert.equal(exact.subject_id, 'matt-clifford');
assert.equal(exact.subject_identity.local_subject_id, 'matt-clifford');
assert.equal(exact.subject_identity.canonical_subject_id, 'matt-clifford');
assert.equal(exact.subject_identity.resolution_status, 'resolved_local_to_canonical');
assert.equal(exact.subject_identity.resolution_basis, 'exact_subject_id_equals_canonical_id');
assert.equal(exact.subject_identity.resolution_id, null);
assert.equal(exact.subject_identity.source_records_mutated, false);
assert.equal(exact.subject_identity.source_records_merged, false);
assert.equal(exact.subject_identity.relationship_created, false);
assert.equal(exact.subject_identity.participation_created, false);
assert.equal(exact.subject_identity.graph_effect, 'none');

const explicit = claim('uk-ai-policy', 'clm-e-safegraph-hoffman');
assert.equal(explicit.subject_id, 'safegraph');
assert.equal(explicit.subject_identity.canonical_subject_id, 'safegraph');
assert.equal(explicit.subject_identity.resolution_basis, 'explicit_case_scoped_resolution');
assert.ok(explicit.subject_identity.resolution_id);

const stillUnresolved = claim('field-autopsy-03', 'clm-submissions-133');
assert.equal(stillUnresolved.subject_identity.resolution_status, 'local_only_unresolved');
assert.equal(stillUnresolved.subject_identity.resolution_basis, 'none');
assert.equal(stillUnresolved.subject_identity.canonical_subject_id, null);

const exactCatalogClaim = catalog.claims.find(item => item.key === 'uk-ai-policy::clm-clifford-starmer-action-plan');
assert.ok(exactCatalogClaim);
assert.equal(exactCatalogClaim.subject_id, 'matt-clifford');
assert.equal(exactCatalogClaim.canonical_subject_id, 'matt-clifford');
assert.equal(exactCatalogClaim.subject_identity.resolution_basis, 'exact_subject_id_equals_canonical_id');
assert.ok(catalog.subjects.find(item => item.key === 'canonical:matt-clifford'));
assert.equal(catalog.counts.resolved_subject_references,
  projection.counts.explicit_resolution_references + projection.counts.exact_canonical_id_references);
assert.equal(catalog.counts.unresolved_subject_references, projection.counts.unresolved_subject_references);
assert.equal(briefingIndex.counts.resolved_subject_references + briefingIndex.counts.unresolved_subject_references,
  briefingIndex.counts.subject_references);

for (const subject of projection.exact_subject_observations) {
  assert.ok(subject.exact_subject_observation_id);
  assert.equal(subject.exact_string_equality, true);
  assert.equal(subject.explicit_case_resolution_used, false);
  assert.equal(subject.normalized_name_match_used, false);
  assert.equal(subject.alias_match_used, false);
  assert.equal(subject.fuzzy_match_used, false);
  assert.equal(subject.source_records_mutated, false);
  assert.equal(subject.source_records_merged, false);
  assert.equal(subject.relationship_created, false);
  assert.equal(subject.participation_created, false);
  assert.equal(subject.accepted_cross_case_identity_bridge, false);
  assert.equal(subject.automatic_cross_case_join_authorized, false);
  assert.equal(subject.review_dependency.required_to_decide, false);
  assert.equal(subject.reversibility.mode, 'append_preserving_supersession');
  assert.equal(subject.graph_effect, 'none');
}

for (const row of unresolved) {
  assert.ok(row.unresolved_subject_id);
  assert.ok(row.source_case_id);
  assert.ok(row.local_subject_id);
  assert.ok(row.claim_ids.length > 0);
  assert.equal(row.claim_ids.length, row.claim_count);
  assert.ok(row.classification);
  assert.ok(row.classification_basis);
  assert.ok(row.next_action);
  assert.equal(row.exact_canonical_id_match, false);
  assert.equal(row.explicit_resolution_present, false);
  assert.equal(row.normalized_name_match_attempted, false);
  assert.equal(row.alias_match_attempted, false);
  assert.equal(row.fuzzy_match_attempted, false);
  assert.equal(row.review_dependency.required_to_decide, false);
  assert.equal(row.relationship_created, false);
  assert.equal(row.participation_created, false);
  assert.equal(row.accepted_cross_case_identity_bridge, false);
  assert.equal(row.automatic_cross_case_join_authorized, false);
  assert.equal(row.graph_effect, 'none');
  assert.doesNotMatch(hopGraphText, new RegExp(row.unresolved_subject_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.deepEqual(projection.source_claim_manifest, wave13.source_claim_manifest, 'Wave 14 source claim bytes must equal the Wave 13 baseline');
for (const row of projection.source_claim_manifest) assert.equal(sha256(row.path), row.sha256, `${row.path}: source claim bytes changed`);
for (const field of [
  'complete_wave13_subject_denominator_recomputed',
  'explicit_wave12_resolutions_preserved',
  'exact_canonical_id_lane_executed',
  'exact_string_equality_only',
  'unresolved_denominator_routed',
  'source_subject_ids_preserved',
  'source_claim_text_preserved'
]) assert.equal(projection.completion[field], true, `Wave 14 completion ${field} missing`);
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
]) assert.equal(projection.completion[field], false, `Wave 14 boundary ${field} drift`);
assert.equal(projection.completion.accepted_cross_case_identity_bridges, 0);
assert.equal(projection.completion.decisions_requiring_human_permission, 0);
assert.equal(projection.completion.graph_effect, 'none');

console.log(`lake-exact-canonical-subject-wave-14.test: OK (${projection.counts.exact_canonical_id_references} exact references across ${projection.counts.exact_canonical_subjects} canonical subjects; ${projection.counts.unresolved_subject_references} references remain routed; graph effect none)`);
