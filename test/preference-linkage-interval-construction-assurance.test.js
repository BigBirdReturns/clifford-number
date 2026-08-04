import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES,
  EXPECTED_LINKAGE_INTERVAL_CONSTRUCTION_METRICS,
  compilePreferenceLinkageIntervalConstructionAssuranceFixture,
  validatePreferenceLinkageIntervalConstructionAssuranceFixture,
  validatePreferenceLinkageIntervalConstructionAssuranceBuild
} from '../tools/lib/preference-linkage-interval-construction-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-linkage-interval-construction-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-interval-construction-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-linkage-interval-construction-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-linkage-interval-construction-assurance.md', 'utf8');
const clone = value => structuredClone(value);

assert.deepEqual(validatePreferenceLinkageIntervalConstructionAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageIntervalConstructionAssuranceBuild(build, fixture), []);
assert.equal(Object.isFrozen(REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES), true);
const frozen = [...REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES];
assert.throws(() => { REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES[0] = 'arbitrary_unique_refusal_rule'; }, TypeError);
assert.deepEqual(REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES, frozen);
assert.deepEqual(validatePreferenceLinkageIntervalConstructionAssuranceFixture(fixture), []);
for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_INTERVAL_CONSTRUCTION_METRICS)) assert.equal(build.metrics[key], expected, key);
assert.equal(build.classification.complete_linkage_interval_construction_assurance_supported_in_at_least_one_world, true);
assert.match(markdown, /Linkage interval construction/);
assert.ok(validatePreferenceLinkageIntervalConstructionAssuranceBuild(build).length > 0, 'fixture source required');

const revisedFixture = clone(fixture);
revisedFixture.captured_at = '2026-08-04';
const revisedBuild = compilePreferenceLinkageIntervalConstructionAssuranceFixture(revisedFixture);
assert.deepEqual(validatePreferenceLinkageIntervalConstructionAssuranceBuild(revisedBuild, revisedFixture), []);
assert.ok(validatePreferenceLinkageIntervalConstructionAssuranceBuild(build, revisedFixture).length > 0, 'valid revised fixture paired with stale build');

const fixtureMutations = [
  ['schema', value => { value.schema_version = 'invalid'; }],
  ['fixture id', value => { value.fixture_id = 'invalid'; }],
  ['issue', value => { value.issue = 979; }],
  ['parent issue', value => { value.parent_program_issue = 595; }],
  ['status', value => { value.status = 'invalid'; }],
  ['graph', value => { value.graph_effect = 'present'; }],
  ['thesis', value => { value.counts_toward_thesis_evidence = true; }],
  ['release id', value => { value.baseline.operative_release_id = 'OTHER'; }],
  ['release version', value => { value.baseline.operative_release_version = 2; }],
  ['source systems', value => { value.baseline.source_systems = 3; }],
  ['candidate pairs', value => { value.baseline.published_candidate_pairs = 99; }],
  ['interval pairs', value => { value.baseline.published_interval_bearing_pairs = 99; }],
  ['nominal coverage', value => { value.baseline.published_nominal_coverage_pct = 94; }],
  ['empirical coverage', value => { value.baseline.published_empirical_coverage_pct = 94; }],
  ['misses', value => { value.baseline.published_interval_misses = 4; }],
  ['width', value => { value.baseline.published_mean_interval_width = 0.01; }],
  ['simultaneous status', value => { value.baseline.published_simultaneous_coverage_status = 'unknown'; }],
  ['public status', value => { value.baseline.public_construction_status = 'invalid'; }],
  ['approved use', value => { value.baseline.approved_use = 'invalid'; }],
  ['refusal remove', value => { value.required_refusal_rules.pop(); }],
  ['refusal substitute', value => { value.required_refusal_rules[0] = 'arbitrary_unique_refusal_rule'; }],
  ['classification false', value => { value.expected_classification.nominal_coverage_identifies_empirical_target_population_coverage = true; }],
  ['classification true', value => { value.expected_classification.complete_linkage_interval_construction_assurance_supported_in_at_least_one_world = false; }],
  ['world denominator', value => { value.worlds.pop(); }],
  ['world id', value => { value.worlds[0].world_id = 'invalid'; }],
  ['world description', value => { value.worlds[1].description = 'changed'; }],
  ['target event', value => { value.worlds[0].target_construction.target_event_defined = false; }],
  ['estimand', value => { value.worlds[0].target_construction.estimand_defined = false; }],
  ['coverage meaning', value => { value.worlds[0].target_construction.coverage_meaning_defined = false; }],
  ['interval type', value => { value.worlds[0].target_construction.interval_type_valid = false; }],
  ['method predeclared', value => { value.worlds[0].target_construction.construction_method_predeclared = false; }],
  ['method current', value => { value.worlds[0].target_construction.construction_method_current = false; }],
  ['exchangeability', value => { value.worlds[0].target_construction.exchangeability_assumption_stated = false; }],
  ['shift', value => { value.worlds[0].target_construction.distribution_shift_bounded = false; }],
  ['undefined count', value => { value.worlds[1].target_construction.undefined_target_pairs = 99; }],
  ['in sample count', value => { value.worlds[2].target_construction.in_sample_interval_pairs = 39; }],
  ['training separation', value => { value.worlds[0].data_separation.training_construction_separate = false; }],
  ['calibration separation', value => { value.worlds[0].data_separation.calibration_validation_separate = false; }],
  ['label independence', value => { value.worlds[0].data_separation.independent_labels_complete = false; }],
  ['overlap count', value => { value.worlds[2].data_separation.calibration_validation_overlap_pairs = 39; }],
  ['entity block', value => { value.worlds[0].dependence_resampling.entity_block_split_safe = false; }],
  ['source block', value => { value.worlds[0].dependence_resampling.source_block_split_safe = false; }],
  ['temporal block', value => { value.worlds[0].dependence_resampling.temporal_block_split_safe = false; }],
  ['dependence count', value => { value.worlds[3].dependence_resampling.dependence_invalidated_pairs = 39; }],
  ['cluster count', value => { value.worlds[3].dependence_resampling.cluster_leaked_pairs = 29; }],
  ['resampling count', value => { value.worlds[4].dependence_resampling.invalid_resampling_pairs = 29; }],
  ['effective n', value => { value.worlds[4].dependence_resampling.effective_sample_size_overstatement = 59; }],
  ['multiplicity count', value => { value.worlds[5].multiplicity_selection.multiplicity_uncorrected_pairs = 39; }],
  ['adaptive count', value => { value.worlds[5].multiplicity_selection.adaptively_selected_pairs = 29; }],
  ['optional stopping count', value => { value.worlds[5].multiplicity_selection.optional_stopping_contaminated_pairs = 29; }],
  ['simultaneous count', value => { value.worlds[5].multiplicity_selection.simultaneous_coverage_unsupported_pairs = 49; }],
  ['denominator count', value => { value.worlds[6].empirical_coverage.denominator_excluded_pairs = 49; }],
  ['hard negatives', value => { value.worlds[6].empirical_coverage.omitted_hard_negatives = 19; }],
  ['unlabelled', value => { value.worlds[6].empirical_coverage.omitted_unlabelled_pairs = 19; }],
  ['stale decisions', value => { value.worlds[7].governance.stale_interval_decisions = 99; }],
  ['unsupported decisions', value => { value.worlds[7].governance.unsupported_interval_decisions = 99; }],
  ['authority leak', value => { value.worlds[7].governance.binding_public_authority = true; }],
  ['expected flags', value => { value.worlds[0].expected_flags.complete_linkage_interval_construction_assurance = false; }]
];
assert.equal(fixtureMutations.length, 58);
for (const [label, mutate] of fixtureMutations) {
  const value = clone(fixture); mutate(value);
  assert.ok(validatePreferenceLinkageIntervalConstructionAssuranceFixture(value).length > 0, label);
}

const buildMutations = [
  ['schema', value => { value.schema_version = 'invalid'; }],
  ['fixture id', value => { value.fixture_id = 'invalid'; }],
  ['issue', value => { value.issue = 979; }],
  ['status', value => { value.status = 'invalid'; }],
  ['graph', value => { value.graph_effect = 'present'; }],
  ['thesis', value => { value.counts_toward_thesis_evidence = true; }],
  ['conclusion', value => { value.conclusion_generated = true; }],
  ['fixture hash', value => { value.fixture_sha256 = '0'.repeat(64); }],
  ['baseline', value => { value.baseline.published_empirical_coverage_pct = 94; }],
  ['refusal', value => { value.required_refusal_rules.pop(); }],
  ['world denominator', value => { value.worlds.pop(); }],
  ['metric', value => { value.metrics.denominator_excluded_pairs = 49; }],
  ['classification', value => { value.classification.nominal_coverage_identifies_empirical_target_population_coverage = true; }],
  ['world section', value => { value.worlds[0].target_construction.target_event_defined = false; }],
  ['signature', value => { value.worlds[0].interval_construction_governance_signature_sha256 = '0'.repeat(64); }],
  ['custody', value => { value.worlds[0].custody_chain[1].payload.target_event_defined = false; }]
];
assert.equal(buildMutations.length, 16);
for (const [label, mutate] of buildMutations) {
  const value = clone(build); mutate(value);
  assert.ok(validatePreferenceLinkageIntervalConstructionAssuranceBuild(value, fixture).length > 0, label);
}
console.log('Preference linkage-interval construction assurance adversarial tests: PASS (58 fixture mutations plus frozen-ledger, source-binding, and 16 build-tamper checks)');
