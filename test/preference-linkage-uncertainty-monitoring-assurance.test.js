import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { REQUIRED_LINKAGE_UNCERTAINTY_REFUSAL_RULES, compilePreferenceLinkageUncertaintyMonitoringAssuranceFixture, validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture, validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild } from '../tools/lib/preference-linkage-uncertainty-monitoring-assurance.mjs';
execFileSync(process.execPath, ['tools/compile-preference-linkage-uncertainty-monitoring-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-uncertainty-monitoring-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-linkage-uncertainty-monitoring-assurance.json', 'utf8'));
const markdown = readFileSync('build/research/preference-linkage-uncertainty-monitoring-assurance.md', 'utf8');
assert.deepEqual(validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(build, fixture), []);
assert.equal(build.worlds.length, 8);
for (const [key, expected] of Object.entries({
  "world_count": 8,
  "distinct_public_uncertainty_signatures": 1,
  "distinct_uncertainty_governance_signatures": 8,
  "complete_linkage_uncertainty_assurance_worlds": 1,
  "total_undercovered_pairs": 50,
  "total_in_sample_interval_pairs": 40,
  "total_heuristic_interval_pairs": 40,
  "total_dependence_invalidated_pairs": 40,
  "total_cluster_leaked_pairs": 30,
  "total_multiplicity_uncorrected_pairs": 40,
  "total_adaptive_monitoring_contaminated_pairs": 30,
  "total_subgroup_undercovered_pairs": 40,
  "total_source_geography_language_time_undercovered_pairs": 40,
  "total_drift_undetected_pairs": 50,
  "total_suppressed_drift_alerts": 30,
  "total_failed_recalibration_pairs": 30,
  "total_rollback_unavailable_decisions": 25,
  "total_certificates_not_withdrawn": 20,
  "total_negative_control_failures": 20,
  "total_falsification_failures": 20,
  "total_stale_uncertainty_decisions": 100,
  "total_unsupported_uncertainty_decisions": 700,
  "binding_public_authority_worlds": 0
})) assert.equal(build.metrics[key], expected, key);
assert.equal(build.classification.complete_linkage_uncertainty_assurance_supported_in_at_least_one_world, true);
assert.match(markdown, /Linkage-uncertainty coverage/);
assert.ok(validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(build).length > 0, 'fixture source required');
const clone = value => structuredClone(value);
assert.equal(Object.isFrozen(REQUIRED_LINKAGE_UNCERTAINTY_REFUSAL_RULES), true, 'exported canonical ledger must be frozen');
const frozenLedger = [...REQUIRED_LINKAGE_UNCERTAINTY_REFUSAL_RULES];
assert.throws(() => { REQUIRED_LINKAGE_UNCERTAINTY_REFUSAL_RULES[0] = 'arbitrary_unique_refusal_rule'; }, TypeError);
assert.deepEqual(REQUIRED_LINKAGE_UNCERTAINTY_REFUSAL_RULES, frozenLedger);
assert.deepEqual(validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture), []);
const revisedFixture = clone(fixture); revisedFixture.captured_at = '2026-08-04';
const revisedBuild = compilePreferenceLinkageUncertaintyMonitoringAssuranceFixture(revisedFixture);
assert.deepEqual(validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(revisedBuild, revisedFixture), []);
assert.ok(validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(build, revisedFixture).length > 0, 'valid revised fixture paired with stale build');
const fixtureMutations = [
  ['schema', v => { v.schema_version = 'invalid'; }], ['fixture id', v => { v.fixture_id = 'invalid'; }], ['issue', v => { v.issue = 953; }], ['parent issue', v => { v.parent_program_issue = 593; }], ['status', v => { v.status = 'real'; }], ['graph effect', v => { v.graph_effect = 'asserted'; }], ['thesis evidence', v => { v.counts_toward_thesis_evidence = true; }],
  ['release id', v => { v.baseline.operative_release_id = 'OTHER'; }], ['source systems', v => { v.baseline.source_systems = 5; }], ['candidate pairs', v => { v.baseline.published_candidate_pairs = 99; }], ['linked pairs', v => { v.baseline.published_linked_pairs = 99; }], ['coverage', v => { v.baseline.published_interval_coverage_pct = 99; }], ['width', v => { v.baseline.published_mean_interval_width = 0.03; }], ['misses', v => { v.baseline.published_interval_misses = 1; }], ['drift alerts', v => { v.baseline.published_subgroup_drift_alerts = 1; }], ['recalibration status', v => { v.baseline.published_recalibration_status = 'stale'; }], ['public status', v => { v.baseline.public_uncertainty_status = 'invalid'; }], ['approved use', v => { v.baseline.approved_use = 'invalid'; }],
  ['refusal rule', v => { v.required_refusal_rules.pop(); }], ['refusal substitution', v => { v.required_refusal_rules[0] = 'arbitrary_unique_refusal_rule'; }], ['classification true', v => { v.expected_classification.complete_linkage_uncertainty_assurance_supported_in_at_least_one_world = false; }], ['classification false', v => { v.expected_classification.numeric_bounds_identify_valid_uncertainty_interval = true; }], ['world count', v => { v.worlds.pop(); }], ['world id', v => { v.worlds[0].world_id = 'invalid'; }], ['world description', v => { v.worlds[0].description = ''; }],
  ['complete interval', v => { v.worlds[0].interval_semantics.uncertainty_target_explicit = false; }], ['complete dependence', v => { v.worlds[0].dependence_design.covariance_modeled = false; }], ['complete multiplicity', v => { v.worlds[0].multiplicity_selection.optional_stopping_accounted = false; }], ['complete subgroup', v => { v.worlds[0].subgroup_coverage.negative_controls_complete = false; }], ['complete monitoring', v => { v.worlds[0].monitoring_drift.monitoring_current = false; }], ['complete recalibration', v => { v.worlds[0].recalibration_governance.rollback_available = false; }], ['complete lineage', v => { v.worlds[0].lineage_authority.current_lineage = false; }],
  ['in-sample count', v => { v.worlds[1].interval_semantics.in_sample_interval_pairs = 39; }], ['heuristic count', v => { v.worlds[1].interval_semantics.heuristic_interval_pairs = 39; }], ['undercovered count', v => { v.worlds[1].interval_semantics.undercovered_pairs = 49; }], ['dependence count', v => { v.worlds[2].dependence_design.dependence_invalidated_pairs = 39; }], ['cluster count', v => { v.worlds[2].dependence_design.cluster_leaked_pairs = 29; }], ['multiplicity count', v => { v.worlds[3].multiplicity_selection.multiplicity_uncorrected_pairs = 39; }], ['adaptive count', v => { v.worlds[3].multiplicity_selection.adaptive_monitoring_contaminated_pairs = 29; }], ['subgroup count', v => { v.worlds[4].subgroup_coverage.subgroup_undercovered_pairs = 39; }], ['source count', v => { v.worlds[4].subgroup_coverage.source_geography_language_time_undercovered_pairs = 39; }], ['negative control count', v => { v.worlds[4].subgroup_coverage.negative_control_failures = 19; }], ['falsification count', v => { v.worlds[4].subgroup_coverage.falsification_failures = 19; }], ['drift count', v => { v.worlds[5].monitoring_drift.drift_undetected_pairs = 49; }], ['suppressed alerts', v => { v.worlds[5].monitoring_drift.suppressed_drift_alerts = 29; }], ['failed recalibration', v => { v.worlds[6].recalibration_governance.failed_recalibration_pairs = 29; }], ['rollback decisions', v => { v.worlds[6].recalibration_governance.rollback_unavailable_decisions = 24; }], ['certificate withdrawal', v => { v.worlds[6].recalibration_governance.certificates_not_withdrawn = 19; }], ['stale decisions', v => { v.worlds[7].lineage_authority.stale_uncertainty_decisions = 99; }], ['authority leak', v => { v.worlds[7].lineage_authority.binding_public_authority = true; }], ['expected flag leak', v => { v.worlds[7].expected_flags.binding_public_authority_supported = true; }]
];
assert.equal(fixtureMutations.length, 51);
for (const [label, mutate] of fixtureMutations) { const value = clone(fixture); mutate(value); assert.ok(validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(value).length > 0, label); }
const buildMutations = [
  ['schema', v => { v.schema_version = 'invalid'; }], ['status', v => { v.status = 'invalid'; }], ['graph', v => { v.graph_effect = 'present'; }], ['thesis evidence', v => { v.counts_toward_thesis_evidence = true; }], ['conclusion', v => { v.conclusion_generated = true; }], ['baseline', v => { v.baseline.public_uncertainty_status = 'invalid'; }], ['refusal ledger', v => { v.required_refusal_rules.pop(); }], ['fixture hash', v => { v.fixture_sha256 = '0'.repeat(64); }], ['world removal', v => { v.worlds.pop(); }], ['world metric', v => { v.worlds[1].interval_semantics.undercovered_pairs = 49; }], ['public signature', v => { v.worlds[0].public_uncertainty_signature_sha256 = '0'.repeat(64); }], ['governance signature', v => { v.worlds[0].uncertainty_governance_signature_sha256 = 'f'.repeat(64); }], ['custody chain', v => { v.worlds[0].custody_chain[2].payload.covariance_modeled = false; }], ['metric aggregate', v => { v.metrics.total_undercovered_pairs = 49; }], ['classification', v => { v.classification.numeric_bounds_identify_valid_uncertainty_interval = true; }], ['custody head', v => { v.worlds[0].custody_chain_head_sha256 = '0'.repeat(64); }]
];
assert.equal(buildMutations.length, 16);
for (const [label, mutate] of buildMutations) { const value = clone(build); mutate(value); assert.ok(validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(value, fixture).length > 0, label); }
console.log('Preference linkage-uncertainty monitoring assurance adversarial tests: PASS (51 fixture mutations plus frozen-ledger, source-binding, and 16 build-tamper checks)');
