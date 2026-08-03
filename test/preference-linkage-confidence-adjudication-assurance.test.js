import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  EXPECTED_LINKAGE_CONFIDENCE_METRICS,
  compilePreferenceLinkageConfidenceAdjudicationAssuranceFixture,
  validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture,
  validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild
} from '../tools/lib/preference-linkage-confidence-adjudication-assurance.mjs';

const fixturePath = 'data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json';
const buildPath = 'build/research/preference-linkage-confidence-adjudication-assurance.json';
execFileSync(process.execPath, ['tools/compile-preference-linkage-confidence-adjudication-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const markdown = readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.md', 'utf8');

assert.deepEqual(validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild(build, fixture), []);
assert.deepEqual(build.metrics, EXPECTED_LINKAGE_CONFIDENCE_METRICS);
assert.equal(build.classification.complete_linkage_confidence_assurance_supported_in_at_least_one_world, true);
for (const [key, value] of Object.entries(build.classification)) {
  if (key !== 'complete_linkage_confidence_assurance_supported_in_at_least_one_world') assert.equal(value, false, key);
}

const byId = Object.fromEntries(build.worlds.map(world => [world.world_id, world]));
assert.equal(byId['complete-candidate-generation-calibrated-confidence-ambiguity-adjudication-falsification-and-current-lineage-assurance'].flags.complete_linkage_confidence_assurance, true);
assert.equal(byId['blocking-and-search-space-truncation-omit-true-candidate-pairs'].candidate_generation.omitted_candidate_pairs, 40);
assert.equal(byId['uncalibrated-match-scores-and-threshold-collapse-create-linkage-error'].scoring.false_positive_links, 30);
assert.equal(byId['multi-candidate-ambiguity-force-resolved-into-one-link'].ambiguity.force_resolved_pairs, 30);
assert.equal(byId['clerical-review-incomplete-conflicted-nonindependent-and-disagreement-suppressing'].adjudication.reviewer_disagreements, 20);
assert.equal(byId['label-leakage-circular-ground-truth-and-correlated-source-features'].ground_truth.circular_ground_truth_pairs, 25);
assert.equal(byId['subgroup-error-negative-control-falsification-and-sensitivity-failure'].falsification.negative_control_failures, 20);
assert.equal(byId['historical-linkage-confidence-assurance-after-source-model-reviewer-and-release-succession'].governance.stale_decisions, 100);

for (const world of build.worlds) {
  assert.equal(world.custody_chain.length, 10);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.linkage_confidence_governance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}
assert.equal(build.worlds[0].custody_chain[0].event_type, 'linkage_confidence_publication_surface_frozen');
assert.equal(build.worlds[0].custody_chain[3].event_type, 'ambiguity_force_resolution_and_retained_alternatives_state');
assert.equal(build.worlds[0].custody_chain[6].event_type, 'negative_control_falsification_subgroup_and_threshold_sensitivity_state');
assert.equal(build.worlds[0].custody_chain[9].event_type, 'linkage_confidence_governance_mechanism_classified');
assert.match(markdown, /Cross-source linkage confidence, ambiguity adjudication, and falsification custody/);
assert.match(markdown, /total_false_positive_links: 30/);
assert.match(markdown, /historical-linkage-confidence-assurance-after-source-model-reviewer-and-release-succession/);
assert.doesNotMatch(markdown, /named actor caused|real match probability|publicly authorized/i);

const clone = value => structuredClone(value);
const mutations = [
  ['schema drift', value => { value.schema_version = 'invalid'; }],
  ['fixture identity drift', value => { value.fixture_id = 'invalid'; }],
  ['issue drift', value => { value.issue = 880; }],
  ['parent issue drift', value => { value.parent_program_issue = 593; }],
  ['status drift', value => { value.status = 'real_control'; }],
  ['graph effect leak', value => { value.graph_effect = 'asserted'; }],
  ['thesis evidence leak', value => { value.counts_toward_thesis_evidence = true; }],
  ['release identity drift', value => { value.baseline.operative_release_id = 'OTHER'; }],
  ['source systems drift', value => { value.baseline.source_systems = 3; }],
  ['candidate pairs drift', value => { value.baseline.published_candidate_pairs = 99; }],
  ['linked pairs drift', value => { value.baseline.published_linked_pairs = 99; }],
  ['linkage coverage drift', value => { value.baseline.published_linkage_coverage_pct = 99; }],
  ['high confidence drift', value => { value.baseline.published_high_confidence_coverage_pct = 99; }],
  ['ambiguous publication drift', value => { value.baseline.published_ambiguous_pairs = 1; }],
  ['unmatched publication drift', value => { value.baseline.published_unmatched_records = 1; }],
  ['false match publication drift', value => { value.baseline.published_false_match_rate = 0.01; }],
  ['missed match publication drift', value => { value.baseline.published_missed_match_rate = 0.01; }],
  ['status publication drift', value => { value.baseline.public_confidence_status = 'partial'; }],
  ['approved use drift', value => { value.baseline.approved_use = 'other'; }],
  ['missing refusal rule', value => { value.required_refusal_rules.pop(); }],
  ['duplicate refusal rule', value => { value.required_refusal_rules[value.required_refusal_rules.length - 1] = value.required_refusal_rules[0]; }],
  ['classification escalation', value => { value.expected_classification.binding_public_authority_supported = true; }],
  ['missing world', value => { value.worlds.pop(); }],
  ['duplicate world id', value => { value.worlds[7].world_id = value.worlds[0].world_id; }],
  ['missing description', value => { value.worlds[0].description = ''; }],
  ['omitted pair drift', value => { value.worlds[1].candidate_generation.omitted_candidate_pairs = 39; }],
  ['blocking false negative drift', value => { value.worlds[1].candidate_generation.blocking_false_negative_pairs = 29; }],
  ['score false positive drift', value => { value.worlds[2].scoring.false_positive_links = 29; }],
  ['score false negative drift', value => { value.worlds[2].scoring.false_negative_links = 24; }],
  ['threshold sensitive drift', value => { value.worlds[2].scoring.threshold_sensitive_pairs = 49; }],
  ['ambiguity drift', value => { value.worlds[3].ambiguity.ambiguous_pairs = 39; }],
  ['force resolution drift', value => { value.worlds[3].ambiguity.force_resolved_pairs = 29; }],
  ['many-to-many drift', value => { value.worlds[3].ambiguity.many_to_many_links = 19; }],
  ['unreviewed drift', value => { value.worlds[4].adjudication.unreviewed_pairs = 29; }],
  ['review conflict drift', value => { value.worlds[4].adjudication.reviewer_conflicted_pairs = 14; }],
  ['leaked label drift', value => { value.worlds[5].ground_truth.leaked_label_pairs = 29; }],
  ['circular ground truth drift', value => { value.worlds[5].ground_truth.circular_ground_truth_pairs = 24; }],
  ['negative control drift', value => { value.worlds[6].falsification.negative_control_failures = 19; }],
  ['authority leak', value => { value.worlds[0].governance.binding_public_authority = true; }],
  ['complete flag tamper', value => { value.worlds[0].expected_flags.complete_linkage_confidence_assurance = false; }]
];
assert.equal(mutations.length, 40);
for (const [label, mutate] of mutations) {
  const value = clone(fixture);
  mutate(value);
  assert.ok(validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(value).length > 0, label);
}

const validFixtureRevision = clone(fixture);
validFixtureRevision.worlds[0].description = `${validFixtureRevision.worlds[0].description} Revised without rebuilding.`;
assert.deepEqual(validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(validFixtureRevision), []);
assert.ok(
  validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild(build, validFixtureRevision).some(error =>
    error.includes('fixture hash') || error.includes('deterministically reconstruct')
  ),
  'stale build must not validate against a different valid fixture revision'
);

const buildTamperCases = [
  ['metric tamper', value => { value.metrics.total_false_positive_links = 29; }],
  ['classification tamper', value => { value.classification.binding_public_authority_supported = true; }],
  ['chain payload tamper', value => { value.worlds[0].custody_chain[2].payload.scoring.false_positive_links = 1; }],
  ['custody head tamper', value => { value.worlds[0].custody_chain_head_sha256 = '0'.repeat(64); }],
  ['public signature tamper', value => { value.worlds[0].public_status_signature_sha256 = '0'.repeat(64); }],
  ['provenance signature tamper', value => { value.worlds[0].linkage_confidence_governance_signature_sha256 = '0'.repeat(64); }],
  ['mechanism tamper', value => { value.worlds[0].mechanism = 'invalid'; }],
  ['build refusal deletion', value => { value.required_refusal_rules.pop(); }]
];
for (const [label, mutate] of buildTamperCases) {
  const value = clone(build);
  mutate(value);
  assert.ok(validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild(value, fixture).length > 0, label);
}

const recompiled = compilePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture);
assert.deepEqual(recompiled, build);
console.log('Preference linkage-confidence adjudication assurance adversarial tests: PASS (40 fixture mutations plus source-binding and build tamper checks)');
