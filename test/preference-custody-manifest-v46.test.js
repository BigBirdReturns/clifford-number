import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  compilePreferenceCustodyManifestV46,
  loadPreferenceCustodyV45SourceBundle,
  validatePreferenceCustodyManifestV46,
  validatePreferenceCustodyManifestV46Build
} from '../tools/lib/preference-custody-manifest-v46.mjs';
import { compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture } from '../tools/lib/preference-linkage-interval-method-partition-replication-deployment-assurance.mjs';

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const baseBuildPath = 'build/research/preference-custody-laboratory-floor-v45.json';
if (!existsSync(baseBuildPath)) execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v45.mjs'], { stdio: 'inherit' });
const manifest = load('data/research/preference-custody/control-manifest-v46.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const targetBuildPath = 'build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json';
const targetBuild = existsSync(targetBuildPath) ? load(targetBuildPath) : compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(targetFixture);
const baseBuild = load(baseBuildPath);
const baseSources = loadPreferenceCustodyV45SourceBundle(load);
const compiledBuild = compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, baseSources);
const buildPath = 'build/research/preference-custody-laboratory-floor-v46.json';
const build = existsSync(buildPath) ? load(buildPath) : compiledBuild;

assert.deepEqual(validatePreferenceCustodyManifestV46(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV46Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources), []);
assert.deepEqual(compiledBuild, build);
assert.equal(build.control_count, 48);
assert.equal(build.promotion_boundary.promotion_requirement_count, 1871);
assert.equal(build.controls.at(-1).control_id, 'PC-48');
assert.ok(!build.open_frontiers.includes('linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_runtime_artifact_dependency_numerical_determinism_and_replay_assurance'));
assert.ok(build.open_frontiers.includes('linkage_interval_deployment_applicability_monitoring_shift_trigger_abstention_rollback_and_release_succession_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_estimand_population_unit_horizon_support_tail_coverage_meaning_and_interpretation_governance'));

const cases = [];
const add = (name, part, mutate) => cases.push([name, part, mutate]);
const manifestMutations = [
  ['schema', x => x.schema_version = 'bad'],
  ['identity', x => x.manifest_id = 'bad'],
  ['issue', x => x.issue = 1],
  ['control issue', x => x.control_issue = 1],
  ['captured object', x => x.captured_at = { named_person: true }],
  ['captured impossible', x => x.captured_at = '2026-02-30'],
  ['status', x => x.status = 'real_world_finding'],
  ['graph', x => x.graph_effect = 'edge'],
  ['thesis', x => x.counts_toward_thesis_evidence = true],
  ['root extra', x => x.real_world_identity = 'Named Person'],
  ['base id', x => x.base_floor.manifest_id = 'bad'],
  ['base path', x => x.base_floor.source_manifest_path = 'bad'],
  ['base schema', x => x.base_floor.expected_build_schema = 'bad'],
  ['base count', x => x.base_floor.expected_control_count = 46],
  ['base extra', x => x.base_floor.controller = 'external'],
  ['extension id', x => x.extension_control.control_id = 'bad'],
  ['fixture id', x => x.extension_control.fixture_id = 'bad'],
  ['failure class', x => x.extension_control.failure_class = 'bad'],
  ['fixture path', x => x.extension_control.source_fixture_path = 'bad'],
  ['build path', x => x.extension_control.build_artifact_path = 'bad'],
  ['build schema', x => x.extension_control.expected_build_schema = 'bad'],
  ['extension extra', x => x.extension_control.binding_public_authority = true],
  ['rule drop', x => x.extension_control.required_refusal_rules.pop()],
  ['rule duplicate', x => x.extension_control.required_refusal_rules.push(x.extension_control.required_refusal_rules[0])],
  ['rule changed', x => x.extension_control.required_refusal_rules[0] = 'bad'],
  ['identification stage', x => x.identification_requirement.stage = 'bad'],
  ['identification state', x => x.identification_requirement.required_state = 'bad'],
  ['identification inference', x => x.identification_requirement.refused_inference = 'bad'],
  ['identification extra', x => x.identification_requirement.authority = 'binding'],
  ['resolved frontier', x => x.frontier_transition.resolved_base_frontier = 'bad'],
  ['successor drop', x => x.frontier_transition.successor_frontiers.pop()],
  ['successor changed', x => x.frontier_transition.successor_frontiers[0] = 'bad'],
  ['frontier extra', x => x.frontier_transition.controller = 'external'],
  ['requirement drop', x => x.real_case_requirements_added.pop()],
  ['requirement duplicate', x => x.real_case_requirements_added[47] = x.real_case_requirements_added[0]],
  ['requirement invalid', x => x.real_case_requirements_added[0] = 'INVALID'],
  ['prohibited changed', x => x.prohibited_inferences[0] = 'bad'],
  ['prohibited drop', x => x.prohibited_inferences.pop()],
  ['interpretation id', x => x.interpretation_contract.contract_id = 'bad'],
  ['interpretation what', x => x.interpretation_contract.what_this_is = 'A real production finding.'],
  ['interpretation not', x => x.interpretation_contract.what_this_is_not = 'No limits.'],
  ['interpretation caveat', x => x.interpretation_contract.copy_ready_caveat = 'Binding authority.'],
  ['interpretation extra', x => x.interpretation_contract.real_world_effect = true]
];
for (const [name, mutate] of manifestMutations) add(`manifest ${name}`, 'manifest', mutate);

const compiledMutations = [
  ['schema', x => x.schema_version = 'bad'],
  ['identity', x => x.manifest_id = 'bad'],
  ['issue', x => x.issue = 1],
  ['control issue', x => x.control_issue = 1],
  ['captured object', x => x.captured_at = { named_person: true }],
  ['captured impossible', x => x.captured_at = '2026-02-30'],
  ['captured stale', x => x.captured_at = '2026-08-03'],
  ['status', x => x.status = 'bad'],
  ['graph', x => x.graph_effect = 'edge'],
  ['real world evidence', x => x.real_world_evidence_state = 'verified'],
  ['thesis', x => x.counts_toward_thesis_evidence = true],
  ['conclusion', x => x.conclusion_generated = true],
  ['control count', x => x.control_count = 47],
  ['control removed', x => x.controls.pop()],
  ['control order', x => x.controls.reverse()],
  ['base control changed', x => x.controls[0].control_id = 'bad'],
  ['root extra', x => x.binding_public_authority = true],
  ['composition base id', x => x.composition.base_manifest_id = 'bad'],
  ['composition base schema', x => x.composition.base_schema_version = 'bad'],
  ['composition base count', x => x.composition.base_control_count = 46],
  ['composition extension', x => x.composition.extension_control_id = 'bad'],
  ['composition source schema', x => x.composition.v45_source_bundle_schema_version = 'bad'],
  ['composition final count', x => x.composition.final_promotion_requirement_count = 1],
  ['composition added count', x => x.composition.added_promotion_requirement_count = 47],
  ['composition extra', x => x.composition.controller = 'external'],
  ['manifest hash', x => x.composition.manifest_snapshot_sha256 = '0'.repeat(64)],
  ['base floor hash', x => x.composition.base_floor_snapshot_sha256 = '0'.repeat(64)],
  ['extension hash', x => x.composition.extension_snapshot_sha256 = '0'.repeat(64)],
  ['source bundle hash', x => x.composition.v45_source_bundle_sha256 = '0'.repeat(64)],
  ['base controls hash', x => x.composition.base_controls_sha256 = '0'.repeat(64)],
  ['base requirements hash', x => x.composition.base_promotion_requirements_sha256 = '0'.repeat(64)],
  ['base refusal hash', x => x.composition.base_refusal_rule_union_sha256 = '0'.repeat(64)],
  ['base identification hash', x => x.composition.base_identification_requirements_sha256 = '0'.repeat(64)],
  ['base frontier hash', x => x.composition.base_open_frontiers_sha256 = '0'.repeat(64)],
  ['base prohibited hash', x => x.composition.base_prohibited_inferences_sha256 = '0'.repeat(64)],
  ['base interpretation hash', x => x.composition.base_interpretation_contract_sha256 = '0'.repeat(64)],
  ['base frontier snapshot', x => x.composition.base_open_frontiers = []],
  ['PC48 id', x => x.controls.at(-1).control_id = 'bad'],
  ['PC48 fixture', x => x.controls.at(-1).fixture_id = 'bad'],
  ['PC48 failure', x => x.controls.at(-1).failure_class = 'bad'],
  ['PC48 graph', x => x.controls.at(-1).graph_effect = 'edge'],
  ['PC48 thesis', x => x.controls.at(-1).counts_toward_thesis_evidence = true],
  ['PC48 conclusion', x => x.controls.at(-1).conclusion_generated = true],
  ['PC48 real effect', x => x.controls.at(-1).real_world_effect_claimed = true],
  ['PC48 preference', x => x.controls.at(-1).preference_change_present = true],
  ['PC48 intent', x => x.controls.at(-1).manipulative_intent_inferable = true],
  ['PC48 rule', x => x.controls.at(-1).observed_refusal_rules.pop()],
  ['PC48 proof metric', x => x.controls.at(-1).proof_summary.unbound_method_pairs = 99],
  ['PC48 proof classification', x => x.controls.at(-1).proof_summary.public_method_badge_identifies_executed_code_and_artifact = true],
  ['PC48 proof extra', x => x.controls.at(-1).proof_summary.real_world_prevalence = 0.95],
  ['PC48 control extra', x => x.controls.at(-1).controller = 'external'],
  ['integrity base', x => x.control_integrity.base_floor_qualified = false],
  ['integrity bundle', x => x.control_integrity.v45_complete_source_bundle_bound = false],
  ['integrity path', x => x.control_integrity.complete_method_partition_replication_deployment_assurance_path_preserved = false],
  ['integrity PC47 event', x => x.control_integrity.pc47_event_state_successor_preserved = false],
  ['integrity PC47 estimand', x => x.control_integrity.pc47_estimand_scope_successor_preserved = false],
  ['integrity extra', x => x.control_integrity.binding_public_authority = true],
  ['resolved remains', x => x.open_frontiers.push(x.frontier_transition.resolved_base_frontier)],
  ['successor removed', x => x.open_frontiers = x.open_frontiers.filter(item => item !== x.frontier_transition.successor_frontiers[0])],
  ['PC47 successor removed', x => x.open_frontiers = x.open_frontiers.filter(item => item !== 'linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance')],
  ['frontier transition', x => x.frontier_transition.resolved_base_frontier = 'bad'],
  ['frontier extra', x => x.frontier_transition.controller = 'external'],
  ['promotion count', x => x.promotion_boundary.promotion_requirement_count = 1],
  ['promotion requirements', x => x.promotion_boundary.real_case_requires.pop()],
  ['laboratory evidence', x => x.promotion_boundary.laboratory_controls_are_real_world_evidence = true],
  ['identification', x => x.identification_requirements.pop()],
  ['refusal union', x => x.refusal_rule_union.pop()],
  ['prohibited', x => x.prohibited_inferences.pop()],
  ['interpretation', x => x.interpretation_contract.what_this_is = 'A real finding.'],
  ['custody payload', x => x.custody_chain[0].payload.manifest_id = 'bad'],
  ['custody extra', x => x.custody_chain[0].real_world_identity = 'Named Person'],
  ['custody hash', x => x.custody_chain[1].event_sha256 = '0'.repeat(64)],
  ['custody head', x => x.custody_chain_head_sha256 = '0'.repeat(64)]
];
for (const [name, mutate] of compiledMutations) add(`compiled ${name}`, 'build', mutate);

const targetFixtureMutations = [
  ['captured date', x => x.captured_at = '2026-08-05'],
  ['description', x => x.worlds[0].description += ' changed'],
  ['implementation burden', x => x.worlds[1].implementation.unbound_method_pairs = 99],
  ['runtime burden', x => x.worlds[2].runtime_configuration.configuration_drift_pairs = 89],
  ['partition burden', x => x.worlds[3].partition.partition_overlap_pairs = 79],
  ['selection burden', x => x.worlds[3].partition.selection_leakage_pairs = 69],
  ['exchangeability burden', x => x.worlds[4].exchangeability.exchangeability_violated_pairs = 59],
  ['replication burden', x => x.worlds[5].replication.independent_replication_failures = 49],
  ['deployment burden', x => x.worlds[6].deployment.out_of_scope_deployment_decisions = 39],
  ['stale burden', x => x.worlds[7].governance.stale_method_decisions = 99],
  ['rule', x => x.required_refusal_rules[0] = 'bad'],
  ['baseline', x => x.baseline.approved_use = 'bad']
];
for (const [name, mutate] of targetFixtureMutations) add(`target fixture ${name}`, 'targetFixture', mutate);
const targetBuildMutations = [
  ['metric', x => x.metrics.worlds = 7],
  ['source hash', x => x.source_fixture_sha256 = '0'.repeat(64)],
  ['world', x => x.worlds[0].expected_mechanism = 'bad'],
  ['classification', x => x.classification.graph_effect_present = true],
  ['rule', x => x.required_refusal_rules.pop()],
  ['chain', x => x.custody_chain[0].event_sha256 = '0'.repeat(64)],
  ['status', x => x.status = 'bad'],
  ['graph', x => x.graph_effect = 'edge'],
  ['public signature', x => x.worlds[0].public_signature_sha256 = '0'.repeat(64)],
  ['governance signature', x => x.worlds[0].method_governance_signature_sha256 = '0'.repeat(64)]
];
for (const [name, mutate] of targetBuildMutations) add(`target build ${name}`, 'targetBuild', mutate);
const baseBuildMutations = [
  ['control count', x => x.control_count = 46],
  ['control', x => x.controls[0].control_id = 'bad'],
  ['method frontier', x => x.open_frontiers = x.open_frontiers.filter(item => item !== 'linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability_governance')],
  ['PC47 event successor', x => x.open_frontiers = x.open_frontiers.filter(item => item !== 'linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance')],
  ['requirements', x => x.promotion_boundary.real_case_requires.pop()],
  ['integrity', x => x.control_integrity.base_floor_qualified = false],
  ['chain', x => x.custody_chain[0].event_sha256 = '0'.repeat(64)],
  ['status', x => x.status = 'bad'],
  ['graph', x => x.graph_effect = 'edge'],
  ['schema', x => x.schema_version = 'bad'],
  ['manifest', x => x.manifest_id = 'bad']
];
for (const [name, mutate] of baseBuildMutations) add(`base build ${name}`, 'baseBuild', mutate);

const unqualifiedBase = clone(baseBuild);
unqualifiedBase.status = 'bad';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, unqualifiedBase, targetBuild, targetFixture, baseSources),
  /v46 v45 build invalid/,
  'unqualified v45 base escaped compilation'
);

const deepExtraKeyBaseSources = clone(baseSources);
deepExtraKeyBaseSources.baseSources.baseSources.controller = 'external';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, deepExtraKeyBaseSources),
  /v46 v43 source bundle key ledger mismatch/,
  'deep transitive source extra key escaped compilation'
);

const deepExtraManifestKeyBaseSources = clone(baseSources);
deepExtraManifestKeyBaseSources.baseSources.baseSources.manifest.controller = 'external';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, deepExtraManifestKeyBaseSources),
  /v46 v43 manifest key ledger mismatch/,
  'deep transitive manifest extra key escaped compilation'
);

const deepExtraManifestNestedKeyBaseSources = clone(baseSources);
deepExtraManifestNestedKeyBaseSources.baseSources.baseSources.manifest.extension_control.controller = 'external';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, deepExtraManifestNestedKeyBaseSources),
  /v46 v43 manifest extension_control key ledger mismatch/,
  'deep transitive manifest nested extra key escaped compilation'
);

const deepManifestSchemaBaseSources = clone(baseSources);
deepManifestSchemaBaseSources.baseSources.baseSources.manifest.schema_version = 'bad';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, deepManifestSchemaBaseSources),
  /v46 v43 manifest schema mismatch/,
  'deep transitive manifest schema substitution escaped compilation'
);

const baseSourceMutations = [
  ['extra source field', x => x.controller = 'external'],
  ['deep extra source field', x => x.baseSources.baseSources.controller = 'external'],
  ['deep extra manifest field', x => x.baseSources.baseSources.manifest.controller = 'external'],
  ['deep extra manifest nested field', x => x.baseSources.baseSources.manifest.extension_control.controller = 'external'],
  ['deep manifest schema', x => x.baseSources.baseSources.manifest.schema_version = 'bad'],
  ['v45 manifest', x => x.manifest.captured_at = '2026-08-05'],
  ['v44 build', x => x.baseBuild.captured_at = '2099-01-01'],
  ['PC47 build', x => x.targetBuild.captured_at = '2099-01-01'],
  ['PC47 fixture', x => x.targetFixture.captured_at = '2099-01-01'],
  ['v44 manifest', x => x.baseSources.manifest.captured_at = '2099-01-01'],
  ['deep fixture', x => x.baseSources.baseSources.baseSources.baseSources.baseSources.baseSources.baseSources.confidenceFixture.captured_at = '2099-01-01'],
  ['invalid deep date', x => x.baseSources.baseSources.baseSources.baseSources.baseSources.baseSources.baseSources.confidenceFixture.captured_at = '2026-02-30']
];
for (const [name, mutate] of baseSourceMutations) add(`base source ${name}`, 'baseSources', mutate);

assert.ok(cases.length >= 150, `floor-v46 adversarial denominator too small: ${cases.length}`);
for (const [name, part, mutate] of cases) {
  const source = { build, manifest, baseBuild, targetBuild, targetFixture, baseSources };
  const candidate = { ...source, [part]: clone(source[part]) };
  mutate(candidate[part]);
  const errors = validatePreferenceCustodyManifestV46Build(candidate.build, candidate.manifest, candidate.baseBuild, candidate.targetBuild, candidate.targetFixture, candidate.baseSources);
  const sourceErrors = part === 'manifest' ? validatePreferenceCustodyManifestV46(candidate.manifest) : [];
  assert.ok(errors.length + sourceErrors.length > 0, `mutation escaped: ${name}`);
}

const changedManifest = clone(manifest);
changedManifest.captured_at = '2026-08-05';
const freshManifestBuild = compilePreferenceCustodyManifestV46(changedManifest, baseBuild, targetBuild, targetFixture, baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV46Build(freshManifestBuild, changedManifest, baseBuild, targetBuild, targetFixture, baseSources), []);
assert.ok(validatePreferenceCustodyManifestV46Build(build, changedManifest, baseBuild, targetBuild, targetFixture, baseSources).length > 0);

const changedFixture = clone(targetFixture);
changedFixture.captured_at = '2026-08-05';
const freshTargetBuild = compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(changedFixture);
assert.throws(() => compilePreferenceCustodyManifestV46(manifest, baseBuild, freshTargetBuild, changedFixture, baseSources), /v46 source snapshot postdates floor/);
const postdatedTargetErrors = validatePreferenceCustodyManifestV46Build(build, manifest, baseBuild, freshTargetBuild, changedFixture, baseSources);
assert.ok(postdatedTargetErrors.some(error => error.includes('v46 source snapshot postdates floor: targetBuild.captured_at')));
assert.ok(postdatedTargetErrors.some(error => error.includes('v46 source snapshot postdates floor: targetFixture.captured_at')));

const advancedManifest = clone(manifest);
advancedManifest.captured_at = '2026-08-05';
const freshFixtureFloor = compilePreferenceCustodyManifestV46(advancedManifest, baseBuild, freshTargetBuild, changedFixture, baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV46Build(freshFixtureFloor, advancedManifest, baseBuild, freshTargetBuild, changedFixture, baseSources), []);
assert.ok(validatePreferenceCustodyManifestV46Build(build, advancedManifest, baseBuild, freshTargetBuild, changedFixture, baseSources).length > 0);

const postdatedBaseSources = clone(baseSources);
postdatedBaseSources.targetFixture.captured_at = '2026-08-05';
const postdatedBaseErrors = validatePreferenceCustodyManifestV46Build(build, manifest, baseBuild, targetBuild, targetFixture, postdatedBaseSources);
assert.ok(postdatedBaseErrors.some(error => error.includes('v46 source snapshot postdates floor: baseSources.targetFixture.captured_at')));

console.log(`Preference custody floor v46 adversarial tests: PASS (${cases.length} mutations plus an unqualified-v45-base compile refusal, chronology-bound fresh-manifest, fresh-PC-48, stale-build, and transitive-source succession checks)`);
