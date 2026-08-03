import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compilePreferenceLinkageScoreCalibrationAssuranceFixture } from '../tools/lib/preference-linkage-score-calibration-assurance.mjs';
import { validatePreferenceCustodyManifestV40, validatePreferenceCustodyManifestV40Build } from '../tools/lib/preference-custody-manifest-v40.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v40.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v40.json', 'utf8'));
const base = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v39.json', 'utf8'));
const scoreBuild = JSON.parse(readFileSync('build/research/preference-linkage-score-calibration-assurance.json', 'utf8'));
const scoreFixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-score-calibration-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v40.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v40.md', 'utf8');
const baseSources = {
  manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v39.json', 'utf8')),
  baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v38.json', 'utf8')),
  candidateBuild: JSON.parse(readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.json', 'utf8')),
  candidateFixture: JSON.parse(readFileSync('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json', 'utf8')),
  baseSources: {
    manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v38.json', 'utf8')),
    baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8')),
    confidenceBuild: JSON.parse(readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.json', 'utf8')),
    confidenceFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8'))
  }
};
assert.deepEqual(validatePreferenceCustodyManifestV40(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV40Build(build, manifest, base, scoreBuild, scoreFixture, baseSources), []);
assert.equal(build.control_count, 42);
assert.equal(build.composition.base_control_count, 41);
assert.equal(build.composition.extension_control_id, 'PC-42');
assert.equal(build.composition.base_promotion_requirement_count, 1533);
assert.equal(build.composition.added_promotion_requirement_count, 48);
assert.equal(build.composition.final_promotion_requirement_count, 1581);
assert.deepEqual(build.controls.slice(0, 41), base.controls);
assert.deepEqual(build.composition.base_open_frontiers, base.open_frontiers);
assert.equal(build.composition.base_floor_snapshot_sha256.length, 64);
assert.equal(build.composition.extension_snapshot_sha256.length, 64);
assert.ok(!build.open_frontiers.includes('linkage_score_calibration_threshold_ambiguity_adjudication_falsification_and_error_governance'));
assert.ok(build.open_frontiers.includes('linkage_score_probability_calibration_validation_design_and_uncertainty_assurance'));
assert.ok(build.open_frontiers.includes('threshold_abstention_ambiguity_adjudication_error_monitoring_and_correction_governance'));
assert.ok(build.open_frontiers.includes('eligible_pair_universe_source_combination_denominator_and_exclusion_assurance'));
assert.ok(build.open_frontiers.includes('blocking_key_normalization_partition_candidate_cap_recall_audit_alternate_search_and_missed_match_governance'));
const pc42 = build.controls.at(-1);
assert.equal(pc42.control_id, 'PC-42');
assert.equal(pc42.proof_summary.world_count, 8);
assert.equal(pc42.proof_summary.distinct_linkage_score_governance_signatures, 8);
assert.equal(pc42.proof_summary.total_miscalibrated_pairs, 50);
assert.equal(pc42.proof_summary.total_threshold_sensitive_pairs, 50);
assert.equal(pc42.proof_summary.total_hidden_ambiguous_pairs, 40);
assert.equal(pc42.proof_summary.total_unsupported_score_decisions, 700);
assert.equal(pc42.proof_summary.complete_linkage_score_assurance_supported_in_at_least_one_world, true);
for (const value of Object.values(build.control_integrity)) assert.equal(value, true);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(build.custody_chain.length, 5);
assert.equal(build.custody_chain.at(-1).event_sha256, build.custody_chain_head_sha256);
assert.match(markdown, /Controls:\*\* 42/);
assert.match(markdown, /Promotion requirements:\*\* 1581/);
assert.match(markdown, /PC-42 proof summary/);
const clone = value => structuredClone(value);
assert.ok(validatePreferenceCustodyManifestV40Build(build).length > 0, 'source artifacts required');
const revisedScoreFixture = clone(scoreFixture);
revisedScoreFixture.captured_at = '2026-08-04';
const revisedScoreBuild = compilePreferenceLinkageScoreCalibrationAssuranceFixture(revisedScoreFixture);
assert.ok(validatePreferenceCustodyManifestV40Build(build, manifest, base, revisedScoreBuild, revisedScoreFixture, baseSources).length > 0, 'valid revised PC-42 source paired with stale floor');
const revisedBase = clone(base);
revisedBase.interpretation_contract.copy_ready_caveat += ' Revised source snapshot.';
assert.ok(validatePreferenceCustodyManifestV40Build(build, manifest, revisedBase, scoreBuild, scoreFixture, baseSources).length > 0, 'revised base paired with stale floor');

const manifestMutations = [
  ['manifest schema', value => { value.schema_version = 'invalid'; }],
  ['manifest id', value => { value.manifest_id = 'invalid'; }],
  ['program issue', value => { value.issue = 593; }],
  ['control issue', value => { value.control_issue = 917; }],
  ['status', value => { value.status = 'real'; }],
  ['graph effect', value => { value.graph_effect = 'asserted'; }],
  ['thesis evidence', value => { value.counts_toward_thesis_evidence = true; }],
  ['base id', value => { value.base_floor.manifest_id = 'invalid'; }],
  ['base path', value => { value.base_floor.source_manifest_path = 'invalid'; }],
  ['base schema', value => { value.base_floor.expected_build_schema = 'invalid'; }],
  ['base count', value => { value.base_floor.expected_control_count = 40; }],
  ['control id', value => { value.extension_control.control_id = 'PC-41'; }],
  ['fixture id', value => { value.extension_control.fixture_id = 'invalid'; }],
  ['failure class', value => { value.extension_control.failure_class = 'invalid'; }],
  ['build schema', value => { value.extension_control.expected_build_schema = 'invalid'; }],
  ['refusal rule', value => { value.extension_control.required_refusal_rules.pop(); }],
  ['identification stage', value => { value.identification_requirement.stage = 'invalid'; }],
  ['resolved frontier', value => { value.frontier_transition.resolved_base_frontier = 'invalid'; }],
  ['successor frontier', value => { value.frontier_transition.successor_frontiers.pop(); }],
  ['requirements', value => { value.real_case_requirements_added.pop(); }],
  ['interpretation', value => { value.interpretation_contract.copy_ready_caveat = ''; }]
];
const buildMutations = [
  ['build schema', value => { value.schema_version = 'invalid'; }],
  ['build identity', value => { value.manifest_id = 'invalid'; }],
  ['build status', value => { value.status = 'invalid'; }],
  ['build graph effect', value => { value.graph_effect = 'asserted'; }],
  ['build evidence state', value => { value.real_world_evidence_state = 'claimed'; }],
  ['build thesis evidence', value => { value.counts_toward_thesis_evidence = true; }],
  ['build conclusion', value => { value.conclusion_generated = true; }],
  ['build control count', value => { value.control_count = 41; }],
  ['build controls', value => { value.controls.pop(); }],
  ['preserved base control', value => { value.controls[0].failure_class = 'tampered'; }],
  ['preserved base requirement', value => { value.promotion_boundary.real_case_requires[0] = 'tampered'; }],
  ['composition base id', value => { value.composition.base_manifest_id = 'invalid'; }],
  ['composition base count', value => { value.composition.base_control_count = 40; }],
  ['composition extension id', value => { value.composition.extension_control_id = 'PC-41'; }],
  ['base snapshot hash', value => { value.composition.base_floor_snapshot_sha256 = '0'.repeat(64); }],
  ['extension snapshot hash', value => { value.composition.extension_snapshot_sha256 = 'f'.repeat(64); }],
  ['base requirement count', value => { value.composition.base_promotion_requirement_count = 1532; }],
  ['added requirement count', value => { value.composition.added_promotion_requirement_count = 47; }],
  ['final requirement count', value => { value.composition.final_promotion_requirement_count = 1580; }],
  ['resolved frontier retained', value => { value.open_frontiers.push('linkage_score_calibration_threshold_ambiguity_adjudication_falsification_and_error_governance'); }],
  ['PC41 successor lost', value => { value.open_frontiers = value.open_frontiers.filter(item => item !== 'eligible_pair_universe_source_combination_denominator_and_exclusion_assurance'); }],
  ['integrity flag', value => { value.control_integrity.base_floor_qualified = false; }],
  ['PC42 metric', value => { value.controls.at(-1).proof_summary.total_miscalibrated_pairs = 49; }],
  ['custody tamper', value => { value.custody_chain[2].payload.transition.resolved_base_frontier = 'tampered'; }]
];
assert.equal(manifestMutations.length + buildMutations.length, 45);
for (const [label, mutate] of manifestMutations) {
  const value = clone(manifest);
  mutate(value);
  assert.ok(validatePreferenceCustodyManifestV40(value).length > 0, label);
}
for (const [label, mutate] of buildMutations) {
  const value = clone(build);
  mutate(value);
  assert.ok(validatePreferenceCustodyManifestV40Build(value, manifest, base, scoreBuild, scoreFixture, baseSources).length > 0, label);
}
console.log('Preference custody floor v40 adversarial tests: PASS (45 mutations plus source-binding succession checks)');
