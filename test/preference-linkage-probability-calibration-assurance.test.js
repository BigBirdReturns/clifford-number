import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compilePreferenceLinkageProbabilityCalibrationAssuranceFixture, validatePreferenceLinkageProbabilityCalibrationAssuranceFixture, validatePreferenceLinkageProbabilityCalibrationAssuranceBuild } from '../tools/lib/preference-linkage-probability-calibration-assurance.mjs';
execFileSync(process.execPath, ['tools/compile-preference-linkage-probability-calibration-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-linkage-probability-calibration-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-linkage-probability-calibration-assurance.md', 'utf8');
assert.deepEqual(validatePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(build, fixture), []);
assert.equal(build.worlds.length, 8);
for (const [key, expected] of Object.entries({
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_probability_governance_signatures": 8,
  "complete_linkage_probability_assurance_worlds": 1,
  "total_miscalibrated_pairs": 50,
  "total_raw_score_as_probability_pairs": 40,
  "total_leaked_label_pairs": 30,
  "total_circular_ground_truth_pairs": 25,
  "total_validation_sample_excluded_pairs": 40,
  "total_hard_negative_omissions": 30,
  "total_prevalence_shift_pairs": 40,
  "total_subgroup_miscalibrated_pairs": 40,
  "total_source_geography_language_time_miscalibrated_pairs": 40,
  "total_uncertainty_undercovered_pairs": 50,
  "total_adaptive_selection_contaminated_pairs": 30,
  "total_negative_control_failures": 20,
  "total_falsification_failures": 20,
  "total_stale_calibration_decisions": 100,
  "total_unsupported_probability_decisions": 700,
  "binding_public_authority_worlds": 0
})) assert.equal(build.metrics[key], expected, key);
assert.equal(build.classification.complete_linkage_probability_assurance_supported_in_at_least_one_world, true);
assert.match(markdown, /Linkage-probability calibration/);
assert.ok(validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(build).length > 0, 'fixture source required');
const clone = value => structuredClone(value);
const revisedFixture = clone(fixture); revisedFixture.captured_at = '2026-08-04';
const revisedBuild = compilePreferenceLinkageProbabilityCalibrationAssuranceFixture(revisedFixture);
assert.deepEqual(validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(revisedBuild, revisedFixture), []);
assert.ok(validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(build, revisedFixture).length > 0, 'valid revised fixture paired with stale build');
const fixtureMutations = [
  ["schema", value => { value.schema_version = 'invalid'; }],
  ["fixture id", value => { value.fixture_id = 'invalid'; }],
  ["issue", value => { value.issue = 927; }],
  ["parent issue", value => { value.parent_program_issue = 593; }],
  ["status", value => { value.status = 'real'; }],
  ["graph effect", value => { value.graph_effect = 'asserted'; }],
  ["thesis evidence", value => { value.counts_toward_thesis_evidence = true; }],
  ["release id", value => { value.baseline.operative_release_id = 'OTHER'; }],
  ["source systems", value => { value.baseline.source_systems = 5; }],
  ["candidate pairs", value => { value.baseline.published_candidate_pairs = 99; }],
  ["linked pairs", value => { value.baseline.published_linked_pairs = 99; }],
  ["public status", value => { value.baseline.public_probability_status = 'invalid'; }],
  ["refusal rule", value => { value.required_refusal_rules.pop(); }],
  ["classification true", value => { value.expected_classification.complete_linkage_probability_assurance_supported_in_at_least_one_world = false; }],
  ["classification false", value => { value.expected_classification.mean_probability_identifies_correctness = true; }],
  ["world count", value => { value.worlds.pop(); }],
  ["world id", value => { value.worlds[0].world_id = 'invalid'; }],
  ["world description", value => { value.worlds[0].description = ''; }],
  ["complete score semantic", value => { value.worlds[0].score_semantics.probabilistic_target_explicit = false; }],
  ["complete label state", value => { value.worlds[0].labels_validation.ground_truth_independent = false; }],
  ["complete sampling state", value => { value.worlds[0].prevalence_sampling.validation_frame_representative = false; }],
  ["complete uncertainty state", value => { value.worlds[0].calibration_uncertainty.empirical_coverage_complete = false; }],
  ["complete controls state", value => { value.worlds[0].controls_subgroups.negative_controls_complete = false; }],
  ["complete lineage state", value => { value.worlds[0].governance.current_lineage = false; }],
  ["raw score count", value => { value.worlds[1].score_semantics.raw_score_as_probability_pairs = 39; }],
  ["raw score mechanism", value => { value.worlds[1].expected_mechanism = 'invalid'; }],
  ["leaked label count", value => { value.worlds[2].labels_validation.leaked_label_pairs = 29; }],
  ["circularity state", value => { value.worlds[2].labels_validation.circularity_audit_complete = true; }],
  ["validation exclusion count", value => { value.worlds[3].prevalence_sampling.validation_sample_excluded_pairs = 39; }],
  ["hard negative state", value => { value.worlds[3].prevalence_sampling.hard_negatives_complete = true; }],
  ["prevalence shift count", value => { value.worlds[4].prevalence_sampling.prevalence_shift_pairs = 39; }],
  ["prior adjustment state", value => { value.worlds[4].prevalence_sampling.prior_shift_adjusted = true; }],
  ["subgroup count", value => { value.worlds[5].controls_subgroups.subgroup_miscalibrated_pairs = 39; }],
  ["negative control state", value => { value.worlds[5].controls_subgroups.negative_controls_complete = true; }],
  ["uncertainty count", value => { value.worlds[6].calibration_uncertainty.uncertainty_undercovered_pairs = 49; }],
  ["adaptive state", value => { value.worlds[6].calibration_uncertainty.adaptive_selection_accounted = true; }],
  ["stale count", value => { value.worlds[7].governance.stale_calibration_decisions = 99; }],
  ["stale lineage", value => { value.worlds[7].governance.current_lineage = true; }],
  ["authority leak", value => { value.worlds[7].governance.binding_public_authority = true; }],
  ["expected flag leak", value => { value.worlds[7].expected_flags.binding_public_authority_supported = true; }],
];
assert.equal(fixtureMutations.length, 40);
for (const [label, mutate] of fixtureMutations) { const value = clone(fixture); mutate(value); assert.ok(validatePreferenceLinkageProbabilityCalibrationAssuranceFixture(value).length > 0, label); }
const buildMutations = [
  ['schema', value => { value.schema_version = 'invalid'; }],
  ['fixture hash', value => { value.fixture_sha256 = '0'.repeat(64); }],
  ['world removal', value => { value.worlds.pop(); }],
  ['world metric', value => { value.worlds[1].score_semantics.miscalibrated_pairs = 49; }],
  ['public signature', value => { value.worlds[0].public_status_signature_sha256 = '0'.repeat(64); }],
  ['governance signature', value => { value.worlds[0].probability_governance_signature_sha256 = 'f'.repeat(64); }],
  ['custody chain', value => { value.worlds[0].custody_chain[2].payload.ground_truth_independent = false; }],
  ['metric aggregate', value => { value.metrics.total_miscalibrated_pairs = 49; }]
];
assert.equal(buildMutations.length, 8);
for (const [label, mutate] of buildMutations) { const value = clone(build); mutate(value); assert.ok(validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(value, fixture).length > 0, label); }
console.log('Preference linkage-probability calibration assurance adversarial tests: PASS (40 fixture mutations plus source binding and 8 build tamper checks)');
