import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceLinkageScoreCalibrationAssuranceFixture,
  validatePreferenceLinkageScoreCalibrationAssuranceFixture,
  validatePreferenceLinkageScoreCalibrationAssuranceBuild
} from '../tools/lib/preference-linkage-score-calibration-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-linkage-score-calibration-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-score-calibration-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-linkage-score-calibration-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-linkage-score-calibration-assurance.md', 'utf8');
assert.deepEqual(validatePreferenceLinkageScoreCalibrationAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageScoreCalibrationAssuranceBuild(build, fixture), []);
assert.equal(build.worlds.length, 8);
assert.equal(build.metrics.distinct_public_status_signatures, 1);
assert.equal(build.metrics.distinct_linkage_score_governance_signatures, 8);
assert.equal(build.metrics.complete_linkage_score_assurance_worlds, 1);
assert.equal(build.metrics.total_miscalibrated_pairs, 50);
assert.equal(build.metrics.total_overconfident_pairs, 40);
assert.equal(build.metrics.total_underconfident_pairs, 30);
assert.equal(build.metrics.total_threshold_sensitive_pairs, 50);
assert.equal(build.metrics.total_hidden_ambiguous_pairs, 40);
assert.equal(build.metrics.total_force_resolved_pairs, 40);
assert.equal(build.metrics.total_unreviewed_pairs, 30);
assert.equal(build.metrics.total_reviewer_disagreements, 20);
assert.equal(build.metrics.total_reviewer_conflicted_pairs, 15);
assert.equal(build.metrics.total_false_positive_links, 30);
assert.equal(build.metrics.total_false_negative_links, 25);
assert.equal(build.metrics.total_leaked_label_pairs, 30);
assert.equal(build.metrics.total_circular_ground_truth_pairs, 25);
assert.equal(build.metrics.total_correlated_feature_pairs, 40);
assert.equal(build.metrics.total_subgroup_miscalibrated_pairs, 40);
assert.equal(build.metrics.total_negative_control_failures, 20);
assert.equal(build.metrics.total_falsification_failures, 20);
assert.equal(build.metrics.total_stale_score_decisions, 100);
assert.equal(build.metrics.total_unsupported_score_decisions, 700);
assert.equal(build.metrics.binding_public_authority_worlds, 0);
assert.equal(build.classification.complete_linkage_score_assurance_supported_in_at_least_one_world, true);
assert.match(markdown, /Linkage-score calibration/);
assert.ok(validatePreferenceLinkageScoreCalibrationAssuranceBuild(build).length > 0, 'fixture source required');
const clone = value => structuredClone(value);
const revisedFixture = clone(fixture);
revisedFixture.captured_at = '2026-08-04';
const revisedBuild = compilePreferenceLinkageScoreCalibrationAssuranceFixture(revisedFixture);
assert.deepEqual(validatePreferenceLinkageScoreCalibrationAssuranceBuild(revisedBuild, revisedFixture), []);
assert.ok(validatePreferenceLinkageScoreCalibrationAssuranceBuild(build, revisedFixture).length > 0, 'valid revised fixture paired with stale build');

const fixtureMutations = [
  ['schema', value => { value.schema_version = 'invalid'; }],
  ['fixture id', value => { value.fixture_id = 'invalid'; }],
  ['issue', value => { value.issue = 917; }],
  ['parent issue', value => { value.parent_program_issue = 593; }],
  ['status', value => { value.status = 'real'; }],
  ['graph effect', value => { value.graph_effect = 'asserted'; }],
  ['thesis evidence', value => { value.counts_toward_thesis_evidence = true; }],
  ['release id', value => { value.baseline.operative_release_id = 'OTHER'; }],
  ['source systems', value => { value.baseline.source_systems = 5; }],
  ['candidate pairs', value => { value.baseline.published_candidate_pairs = 99; }],
  ['linked pairs', value => { value.baseline.published_linked_pairs = 99; }],
  ['public status', value => { value.baseline.public_score_status = 'invalid'; }],
  ['refusal rule', value => { value.required_refusal_rules.pop(); }],
  ['classification true', value => { value.expected_classification.complete_linkage_score_assurance_supported_in_at_least_one_world = false; }],
  ['classification false', value => { value.expected_classification.highest_score_identifies_one_true_match = true; }],
  ['world count', value => { value.worlds.pop(); }],
  ['world id', value => { value.worlds[0].world_id = 'invalid'; }],
  ['world description', value => { value.worlds[0].description = ''; }],
  ['complete feature', value => { value.worlds[0].feature_model.feature_identity_complete = false; }],
  ['complete calibration', value => { value.worlds[0].calibration.calibration_method_current = false; }],
  ['complete threshold', value => { value.worlds[0].threshold_ambiguity.threshold_precommitted = false; }],
  ['complete adjudication', value => { value.worlds[0].adjudication_ground_truth.review_complete = false; }],
  ['complete controls', value => { value.worlds[0].controls_subgroups.negative_controls_complete = false; }],
  ['complete lineage', value => { value.worlds[0].governance.current_lineage = false; }],
  ['uncalibrated count', value => { value.worlds[1].calibration.miscalibrated_pairs = 49; }],
  ['uncalibrated mechanism', value => { value.worlds[1].expected_mechanism = 'invalid'; }],
  ['threshold count', value => { value.worlds[2].threshold_ambiguity.threshold_sensitive_pairs = 49; }],
  ['threshold flag', value => { value.worlds[2].expected_flags.complete_threshold_abstention_and_ambiguity_assurance = true; }],
  ['ambiguity count', value => { value.worlds[3].threshold_ambiguity.hidden_ambiguous_pairs = 39; }],
  ['ambiguity retention', value => { value.worlds[3].threshold_ambiguity.retained_alternatives_complete = true; }],
  ['review count', value => { value.worlds[4].adjudication_ground_truth.unreviewed_pairs = 29; }],
  ['review independence', value => { value.worlds[4].adjudication_ground_truth.reviewer_independence_complete = true; }],
  ['leaked label count', value => { value.worlds[5].adjudication_ground_truth.leaked_label_pairs = 29; }],
  ['feature dependence', value => { value.worlds[5].feature_model.feature_dependence_audited = true; }],
  ['false positive count', value => { value.worlds[6].controls_subgroups.false_positive_links = 29; }],
  ['negative control state', value => { value.worlds[6].controls_subgroups.negative_controls_complete = true; }],
  ['stale count', value => { value.worlds[7].governance.stale_score_decisions = 99; }],
  ['stale lineage', value => { value.worlds[7].governance.current_lineage = true; }],
  ['authority leak', value => { value.worlds[7].governance.binding_public_authority = true; }],
  ['expected flags leak', value => { value.worlds[7].expected_flags.binding_public_authority_supported = true; }]
];
assert.equal(fixtureMutations.length, 40);
for (const [label, mutate] of fixtureMutations) {
  const value = clone(fixture);
  mutate(value);
  assert.ok(validatePreferenceLinkageScoreCalibrationAssuranceFixture(value).length > 0, label);
}

const buildMutations = [
  ['build schema', value => { value.schema_version = 'invalid'; }],
  ['fixture hash', value => { value.fixture_sha256 = '0'.repeat(64); }],
  ['world count', value => { value.worlds.pop(); }],
  ['metric', value => { value.metrics.total_miscalibrated_pairs = 49; }],
  ['world section', value => { value.worlds[1].calibration.miscalibrated_pairs = 49; }],
  ['world flags', value => { value.worlds[1].flags.complete_probability_calibration_assurance = true; }],
  ['custody', value => { value.worlds[1].custody_chain[2].payload.miscalibrated_pairs = 49; }],
  ['classification', value => { value.classification.highest_score_identifies_one_true_match = true; }]
];
assert.equal(buildMutations.length, 8);
for (const [label, mutate] of buildMutations) {
  const value = clone(build);
  mutate(value);
  assert.ok(validatePreferenceLinkageScoreCalibrationAssuranceBuild(value, fixture).length > 0, label);
}
console.log('Preference linkage-score calibration assurance adversarial tests: PASS (40 fixture mutations plus source binding and 8 build tamper checks)');
