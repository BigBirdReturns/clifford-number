import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compilePreferenceCandidatePairBlockingRecallAssuranceFixture, validatePreferenceCandidatePairBlockingRecallAssuranceFixture, validatePreferenceCandidatePairBlockingRecallAssuranceBuild } from '../tools/lib/preference-candidate-pair-blocking-recall-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-candidate-pair-blocking-recall-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.md', 'utf8');
assert.deepEqual(validatePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceCandidatePairBlockingRecallAssuranceBuild(build, fixture), []);
assert.equal(build.metrics.world_count, 8);
assert.equal(build.metrics.distinct_public_status_signatures, 1);
assert.equal(build.metrics.distinct_candidate_search_governance_signatures, 8);
assert.equal(build.metrics.complete_candidate_search_assurance_worlds, 1);
assert.equal(build.metrics.total_eligible_pairs_omitted, 60);
assert.equal(build.metrics.total_blocking_false_negatives, 35);
assert.equal(build.metrics.total_partition_pruned_pairs, 45);
assert.equal(build.metrics.total_candidate_cap_pruned_pairs, 40);
assert.equal(build.metrics.total_missed_true_matches, 55);
assert.equal(build.metrics.total_unsupported_candidate_search_decisions, 700);
assert.equal(build.metrics.binding_public_authority_worlds, 0);
assert.match(markdown, /Candidate-pair universe/);
assert.match(markdown, /Deterministic burden surface/);
const clone = value => structuredClone(value);
assert.ok(validatePreferenceCandidatePairBlockingRecallAssuranceBuild(build).length > 0, 'source fixture required');
const revisedFixture = clone(fixture);
revisedFixture.captured_at = '2026-08-04';
const revisedBuild = compilePreferenceCandidatePairBlockingRecallAssuranceFixture(revisedFixture);
assert.ok(validatePreferenceCandidatePairBlockingRecallAssuranceBuild(build, revisedFixture).length > 0, 'revised fixture with stale build');
assert.deepEqual(validatePreferenceCandidatePairBlockingRecallAssuranceBuild(revisedBuild, revisedFixture), []);
const fixtureMutations = [
  ["fixture schema", value => { value.schema_version = 'invalid'; }],
  ["fixture id", value => { value.fixture_id = 'invalid'; }],
  ["issue", value => { value.issue = 906; }],
  ["parent issue", value => { value.parent_program_issue = 593; }],
  ["status", value => { value.status = 'real'; }],
  ["graph effect", value => { value.graph_effect = 'asserted'; }],
  ["thesis evidence", value => { value.counts_toward_thesis_evidence = true; }],
  ["baseline release", value => { value.baseline.operative_release_id = 'OTHER'; }],
  ["baseline systems", value => { value.baseline.source_systems = 3; }],
  ["baseline records", value => { value.baseline.source_records = 99; }],
  ["baseline eligible", value => { value.baseline.published_eligible_pairs = 99; }],
  ["baseline candidates", value => { value.baseline.published_candidate_pairs = 99; }],
  ["baseline recall", value => { value.baseline.published_blocking_recall_pct = 99; }],
  ["baseline omitted", value => { value.baseline.published_omitted_pairs = 1; }],
  ["baseline missed", value => { value.baseline.published_missed_matches = 1; }],
  ["baseline status", value => { value.baseline.public_candidate_search_status = 'invalid'; }],
  ["baseline use", value => { value.baseline.approved_use = 'invalid'; }],
  ["refusal rule", value => { value.required_refusal_rules.pop(); }],
  ["classification key", value => { delete value.expected_classification.binding_public_authority_supported; }],
  ["classification false", value => { value.expected_classification.binding_public_authority_supported = true; }],
  ["classification true", value => { value.expected_classification.complete_candidate_search_assurance_supported_in_at_least_one_world = false; }],
  ["world removed", value => { value.worlds.pop(); }],
  ["world id", value => { value.worlds[0].world_id = 'invalid'; }],
  ["world description", value => { value.worlds[0].description = ''; }],
  ["universe complete", value => { value.worlds[0].universe.eligible_pair_universe_complete = false; }],
  ["source combinations", value => { value.worlds[0].universe.source_combination_coverage_complete = false; }],
  ["exclusion ledger", value => { value.worlds[0].universe.exclusion_ledger_complete = false; }],
  ["omitted eligible count", value => { value.worlds[1].universe.omitted_eligible_pairs = 59; }],
  ["blocking keys", value => { value.worlds[2].blocking.blocking_keys_complete = true; }],
  ["normalization count", value => { value.worlds[2].blocking.normalization_excluded_pairs = 29; }],
  ["partition count", value => { value.worlds[3].partitioning.partition_pruned_pairs = 44; }],
  ["topk count", value => { value.worlds[3].partitioning.window_topk_pruned_pairs = 39; }],
  ["candidate cap", value => { value.worlds[4].partitioning.candidate_cap_pruned_pairs = 39; }],
  ["resource budget", value => { value.worlds[4].partitioning.resource_budget_pruned_pairs = 29; }],
  ["early stop", value => { value.worlds[4].partitioning.early_stopped_pairs = 24; }],
  ["unreviewed audit", value => { value.worlds[5].audit.unreviewed_omitted_pairs = 24; }],
  ["circular labels", value => { value.worlds[6].audit.circular_label_audit_pairs = 29; }],
  ["subgroup recall", value => { value.worlds[6].audit.subgroup_recall_failures = 39; }],
  ["stale lineage", value => { value.worlds[7].governance.stale_candidate_search_decisions = 99; }],
  ["authority leak", value => { value.worlds[0].governance.binding_public_authority = true; }],
];
assert.equal(fixtureMutations.length, 40);
for (const [label, mutate] of fixtureMutations) {
  const value = clone(fixture); mutate(value);
  assert.ok(validatePreferenceCandidatePairBlockingRecallAssuranceFixture(value).length > 0, label);
}
const buildMutations = [
  ['build schema', value => { value.schema_version = 'invalid'; }],
  ['build fixture hash', value => { value.fixture_sha256 = '0'.repeat(64); }],
  ['build metric', value => { value.metrics.total_missed_true_matches = 54; }],
  ['build world section', value => { value.worlds[1].universe.omitted_eligible_pairs = 59; }],
  ['build governance signature', value => { value.worlds[0].candidate_search_governance_signature_sha256 = '0'.repeat(64); }],
  ['build custody', value => { value.worlds[0].custody_chain[2].payload.blocking_keys_complete = false; }],
  ['build classification', value => { value.classification.binding_public_authority_supported = true; }],
  ['build authority', value => { value.worlds[0].governance.binding_public_authority = true; }]
];
for (const [label, mutate] of buildMutations) {
  const value = clone(build); mutate(value);
  assert.ok(validatePreferenceCandidatePairBlockingRecallAssuranceBuild(value, fixture).length > 0, label);
}
console.log('Preference candidate-pair blocking-recall assurance adversarial tests: PASS (40 fixture mutations plus source binding and 8 build tamper checks)');
