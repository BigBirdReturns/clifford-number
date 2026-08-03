import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV38,
  validatePreferenceCustodyManifestV38Build
} from '../tools/lib/preference-custody-manifest-v38.mjs';
import { compilePreferenceLinkageConfidenceAdjudicationAssuranceFixture } from '../tools/lib/preference-linkage-confidence-adjudication-assurance.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v38.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v38.json', 'utf8'));
const base = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8'));
const confidenceBuild = JSON.parse(readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.json', 'utf8'));
const confidenceFixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v38.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v38.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV38(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV38Build(build, manifest, base, confidenceBuild, confidenceFixture), []);
assert.equal(build.control_count, 40);
assert.equal(build.composition.base_control_count, 39);
assert.equal(build.composition.extension_control_id, 'PC-40');
assert.equal(build.composition.base_promotion_requirement_count, 1437);
assert.equal(build.composition.added_promotion_requirement_count, 48);
assert.equal(build.composition.final_promotion_requirement_count, 1485);
assert.deepEqual(build.controls.slice(0, 39), base.controls);
assert.deepEqual(build.composition.base_open_frontiers, base.open_frontiers);
assert.equal(build.composition.base_floor_snapshot_sha256.length, 64);
assert.equal(build.composition.extension_snapshot_sha256.length, 64);
assert.equal(build.composition.base_controls_sha256.length, 64);
assert.equal(build.composition.base_promotion_requirements_sha256.length, 64);

const expectedOpen = [...new Set([
  ...base.open_frontiers.filter(frontier => frontier !== 'cross_source_linkage_confidence_ambiguity_adjudication_and_falsification_governance'),
  ...manifest.frontier_transition.successor_frontiers
])].sort();
assert.deepEqual([...build.open_frontiers].sort(), expectedOpen);
assert.ok(!build.open_frontiers.includes('cross_source_linkage_confidence_ambiguity_adjudication_and_falsification_governance'));
for (const frontier of [
  'temporal_identity_version_transition_succession_retroactive_correction_and_durability_assurance',
  'population_eligibility_membership_denominator_and_operational_frame_governance',
  'hard_to_enumerate_subgroup_enumeration_response_propensity_and_nonresponse_mechanism_governance',
  'inaccessible_source_suppression_proxy_external_frame_imputation_and_selection_assurance',
  'population_entry_exit_migration_merger_split_reactivation_snapshot_alignment_and_turnover_governance'
]) assert.ok(build.open_frontiers.includes(frontier), frontier);

const pc40 = build.controls.at(-1);
assert.equal(pc40.control_id, 'PC-40');
assert.equal(pc40.proof_summary.world_count, 8);
assert.equal(pc40.proof_summary.distinct_linkage_confidence_governance_signatures, 8);
assert.equal(pc40.proof_summary.total_omitted_candidate_pairs, 40);
assert.equal(pc40.proof_summary.total_false_positive_links, 30);
assert.equal(pc40.proof_summary.total_ambiguous_pairs, 40);
assert.equal(pc40.proof_summary.total_negative_control_failures, 20);
assert.equal(pc40.proof_summary.total_unsupported_confidence_decisions, 700);
assert.equal(pc40.proof_summary.complete_linkage_confidence_assurance_supported_in_at_least_one_world, true);
for (const value of Object.values(build.control_integrity)) assert.equal(value, true);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(build.custody_chain.length, 5);
assert.equal(build.custody_chain.at(-1).event_sha256, build.custody_chain_head_sha256);
assert.match(markdown, /Controls:\*\* 40/);
assert.match(markdown, /Promotion requirements:\*\* 1485/);
assert.match(markdown, /PC-40 proof summary/);

const clone = value => structuredClone(value);
assert.ok(validatePreferenceCustodyManifestV38Build(build).length > 0, 'source artifacts are required');
const revisedBase = clone(base);
revisedBase.interpretation_contract.copy_ready_caveat += ' Revised source snapshot.';
assert.ok(
  validatePreferenceCustodyManifestV38Build(build, manifest, revisedBase, confidenceBuild, confidenceFixture).length > 0,
  'valid revised base source paired with stale floor build'
);
const revisedConfidenceFixture = clone(confidenceFixture);
revisedConfidenceFixture.captured_at = '2026-08-04';
const revisedConfidenceBuild = compilePreferenceLinkageConfidenceAdjudicationAssuranceFixture(revisedConfidenceFixture);
assert.ok(
  validatePreferenceCustodyManifestV38Build(build, manifest, base, revisedConfidenceBuild, revisedConfidenceFixture).length > 0,
  'valid revised PC-40 source paired with stale floor build'
);
const manifestMutations = [
  ['manifest schema', value => { value.schema_version = 'invalid'; }],
  ['manifest id', value => { value.manifest_id = 'invalid'; }],
  ['program issue', value => { value.issue = 593; }],
  ['control issue', value => { value.control_issue = 880; }],
  ['status', value => { value.status = 'real'; }],
  ['graph effect', value => { value.graph_effect = 'asserted'; }],
  ['thesis evidence', value => { value.counts_toward_thesis_evidence = true; }],
  ['base id', value => { value.base_floor.manifest_id = 'invalid'; }],
  ['base path', value => { value.base_floor.source_manifest_path = 'invalid'; }],
  ['base schema', value => { value.base_floor.expected_build_schema = 'invalid'; }],
  ['base count', value => { value.base_floor.expected_control_count = 38; }],
  ['control id', value => { value.extension_control.control_id = 'PC-39'; }],
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
  ['build control count', value => { value.control_count = 39; }],
  ['build controls', value => { value.controls.pop(); }],
  ['preserved base-control body', value => { value.controls[0].failure_class = 'tampered'; }],
  ['preserved base-requirement body', value => { value.promotion_boundary.real_case_requires[0] = 'tampered'; }],
  ['composition base id', value => { value.composition.base_manifest_id = 'invalid'; }],
  ['composition base count', value => { value.composition.base_control_count = 38; }],
  ['composition extension id', value => { value.composition.extension_control_id = 'PC-39'; }],
  ['base snapshot hash binding', value => { value.composition.base_floor_snapshot_sha256 = '0'.repeat(64); }],
  ['extension snapshot hash binding', value => { value.composition.extension_snapshot_sha256 = 'f'.repeat(64); }],
  ['base requirement count', value => { value.composition.base_promotion_requirement_count = 1436; }],
  ['added requirement count', value => { value.composition.added_promotion_requirement_count = 47; }],
  ['final requirement count', value => { value.composition.final_promotion_requirement_count = 1484; }],
  ['resolved frontier retained', value => { value.open_frontiers.push('cross_source_linkage_confidence_ambiguity_adjudication_and_falsification_governance'); }],
  ['integrity flag', value => { value.control_integrity.base_floor_qualified = false; }],
  ['PC-40 metric', value => { value.controls.at(-1).proof_summary.total_false_positive_links = 29; }],
  ['promotion boundary', value => { value.promotion_boundary.real_case_requires.pop(); }],
  ['custody tamper', value => { value.custody_chain[2].payload.transition.resolved_base_frontier = 'tampered'; }]
];
assert.equal(manifestMutations.length + buildMutations.length, 45);
for (const [label, mutate] of manifestMutations) {
  const value = clone(manifest); mutate(value);
  assert.ok(validatePreferenceCustodyManifestV38(value).length > 0, label);
}
for (const [label, mutate] of buildMutations) {
  const value = clone(build); mutate(value);
  assert.ok(validatePreferenceCustodyManifestV38Build(value, manifest, base, confidenceBuild, confidenceFixture).length > 0, label);
}
console.log('Preference custody floor v38 adversarial tests: PASS (45 mutations plus source-binding succession checks)');
