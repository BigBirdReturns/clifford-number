import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV37,
  validatePreferenceCustodyManifestV37Build
} from '../tools/lib/preference-custody-manifest-v37.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v37.mjs'], { stdio: 'pipe' });
const manifest = JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v37.json', 'utf8'));
const base = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v36.json', 'utf8'));
const build = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8'));
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v37.md', 'utf8');

assert.deepEqual(validatePreferenceCustodyManifestV37(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV37Build(build), []);
assert.equal(build.control_count, 39);
assert.equal(build.composition.base_control_count, 38);
assert.equal(build.composition.extension_control_id, 'PC-39');
assert.equal(build.composition.base_promotion_requirement_count, 1389);
assert.equal(build.composition.added_promotion_requirement_count, 48);
assert.equal(build.composition.final_promotion_requirement_count, 1437);
assert.deepEqual(build.controls.slice(0, 38), base.controls);
assert.deepEqual(build.composition.base_open_frontiers, base.open_frontiers);
assert.equal(build.composition.base_controls_sha256.length, 64);
assert.equal(build.composition.base_promotion_requirements_sha256.length, 64);

const expectedOpen = [...new Set([
  ...base.open_frontiers.filter(frontier => frontier !== 'record_linkage_namespace_temporal_identity_and_succession_assurance'),
  ...manifest.frontier_transition.successor_frontiers
])].sort();
assert.deepEqual([...build.open_frontiers].sort(), expectedOpen);
assert.ok(!build.open_frontiers.includes('record_linkage_namespace_temporal_identity_and_succession_assurance'));
for (const frontier of [
  'population_eligibility_membership_denominator_and_operational_frame_governance',
  'hard_to_enumerate_subgroup_enumeration_response_propensity_and_nonresponse_mechanism_governance',
  'inaccessible_source_suppression_proxy_external_frame_imputation_and_selection_assurance',
  'population_entry_exit_migration_merger_split_reactivation_snapshot_alignment_and_turnover_governance',
  'identity_collision_fragmentation_unit_boundary_duplicate_and_cross_source_linkage_assurance'
]) assert.ok(build.open_frontiers.includes(frontier), frontier);

const pc39 = build.controls.at(-1);
assert.equal(pc39.control_id, 'PC-39');
assert.equal(pc39.proof_summary.world_count, 8);
assert.equal(pc39.proof_summary.distinct_record_linkage_provenance_signatures, 8);
assert.equal(pc39.proof_summary.total_false_positive_cross_namespace_links, 30);
assert.equal(pc39.proof_summary.total_retroactive_relinked_records, 40);
assert.equal(pc39.proof_summary.total_unsupported_linkage_decisions, 700);
assert.equal(pc39.proof_summary.complete_record_linkage_assurance_supported_in_at_least_one_world, true);
for (const value of Object.values(build.control_integrity)) assert.equal(value, true);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(build.custody_chain.length, 5);
assert.equal(build.custody_chain.at(-1).event_sha256, build.custody_chain_head_sha256);
assert.match(markdown, /Controls:\*\* 39/);
assert.match(markdown, /Promotion requirements:\*\* 1437/);
assert.match(markdown, /PC-39 proof summary/);

const clone = value => structuredClone(value);
const manifestMutations = [
  ['manifest schema', value => { value.schema_version = 'invalid'; }],
  ['manifest id', value => { value.manifest_id = 'invalid'; }],
  ['program issue', value => { value.issue = 593; }],
  ['control issue', value => { value.control_issue = 869; }],
  ['status', value => { value.status = 'real'; }],
  ['graph effect', value => { value.graph_effect = 'asserted'; }],
  ['thesis evidence', value => { value.counts_toward_thesis_evidence = true; }],
  ['base id', value => { value.base_floor.manifest_id = 'invalid'; }],
  ['base path', value => { value.base_floor.source_manifest_path = 'invalid'; }],
  ['base schema', value => { value.base_floor.expected_build_schema = 'invalid'; }],
  ['base count', value => { value.base_floor.expected_control_count = 37; }],
  ['control id', value => { value.extension_control.control_id = 'PC-38'; }],
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
  ['build control count', value => { value.control_count = 38; }],
  ['build controls', value => { value.controls.pop(); }],
  ['composition base id', value => { value.composition.base_manifest_id = 'invalid'; }],
  ['composition base count', value => { value.composition.base_control_count = 37; }],
  ['composition extension id', value => { value.composition.extension_control_id = 'PC-38'; }],
  ['base requirement count', value => { value.composition.base_promotion_requirement_count = 1388; }],
  ['added requirement count', value => { value.composition.added_promotion_requirement_count = 47; }],
  ['final requirement count', value => { value.composition.final_promotion_requirement_count = 1436; }],
  ['resolved frontier retained', value => { value.open_frontiers.push('record_linkage_namespace_temporal_identity_and_succession_assurance'); }],
  ['integrity flag', value => { value.control_integrity.base_floor_qualified = false; }],
  ['PC-39 metric', value => { value.controls.at(-1).proof_summary.total_false_positive_cross_namespace_links = 29; }],
  ['promotion boundary', value => { value.promotion_boundary.real_case_requires.pop(); }],
  ['custody tamper', value => { value.custody_chain[2].payload.transition.resolved_base_frontier = 'tampered'; }]
];
assert.equal(manifestMutations.length + buildMutations.length, 41);
for (const [label, mutate] of manifestMutations) {
  const value = clone(manifest); mutate(value);
  assert.ok(validatePreferenceCustodyManifestV37(value).length > 0, label);
}
for (const [label, mutate] of buildMutations) {
  const value = clone(build); mutate(value);
  assert.ok(validatePreferenceCustodyManifestV37Build(value).length > 0, label);
}
console.log('Preference custody floor v37 adversarial tests: PASS (41 mutations)');
