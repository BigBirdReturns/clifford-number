import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  compilePreferenceCustodyManifestV45,
  validatePreferenceCustodyManifestV45,
  validatePreferenceCustodyManifestV45Build
} from '../tools/lib/preference-custody-manifest-v45.mjs';
import {
  compilePreferenceLinkageEventEstimandScopeInterpretationFixture
} from '../tools/lib/preference-linkage-event-estimand-scope-interpretation-assurance.mjs';

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const baseBuildPath = 'build/research/preference-custody-laboratory-floor-v44.json';
if (!existsSync(baseBuildPath)) {
  execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v44.mjs'], { stdio: 'inherit' });
}

const manifest = load('data/research/preference-custody/control-manifest-v45.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const targetBuildPath = 'build/research/preference-linkage-event-estimand-scope-interpretation-assurance.json';
const targetBuild = existsSync(targetBuildPath)
  ? load(targetBuildPath)
  : compilePreferenceLinkageEventEstimandScopeInterpretationFixture(targetFixture);
const baseBuild = load(baseBuildPath);
const baseSources = {
  manifest: load('data/research/preference-custody/control-manifest-v44.json'),
  baseBuild: load('build/research/preference-custody-laboratory-floor-v43.json'),
  targetBuild: load('build/research/preference-linkage-target-construction-exchangeability-assurance.json'),
  targetFixture: load('data/research/preference-custody/linkage-target-construction-exchangeability-assurance.fixture.json'),
  baseSources: {
    manifest: load('data/research/preference-custody/control-manifest-v43.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v42.json'),
    intervalBuild: load('build/research/preference-linkage-interval-construction-assurance.json'),
    intervalFixture: load('data/research/preference-custody/linkage-interval-construction-assurance.fixture.json'),
    baseSources: {
      manifest: load('data/research/preference-custody/control-manifest-v42.json'),
      baseBuild: load('build/research/preference-custody-laboratory-floor-v41.json'),
      uncertaintyBuild: load('build/research/preference-linkage-uncertainty-monitoring-assurance.json'),
      uncertaintyFixture: load('data/research/preference-custody/linkage-uncertainty-monitoring-assurance.fixture.json'),
      baseSources: {
        manifest: load('data/research/preference-custody/control-manifest-v41.json'),
        baseBuild: load('build/research/preference-custody-laboratory-floor-v40.json'),
        probabilityBuild: load('build/research/preference-linkage-probability-calibration-assurance.json'),
        probabilityFixture: load('data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json'),
        baseSources: {
          manifest: load('data/research/preference-custody/control-manifest-v40.json'),
          baseBuild: load('build/research/preference-custody-laboratory-floor-v39.json'),
          scoreBuild: load('build/research/preference-linkage-score-calibration-assurance.json'),
          scoreFixture: load('data/research/preference-custody/linkage-score-calibration-assurance.fixture.json'),
          baseSources: {
            manifest: load('data/research/preference-custody/control-manifest-v39.json'),
            baseBuild: load('build/research/preference-custody-laboratory-floor-v38.json'),
            candidateBuild: load('build/research/preference-candidate-pair-blocking-recall-assurance.json'),
            candidateFixture: load('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json'),
            baseSources: {
              manifest: load('data/research/preference-custody/control-manifest-v38.json'),
              baseBuild: load('build/research/preference-custody-laboratory-floor-v37.json'),
              confidenceBuild: load('build/research/preference-linkage-confidence-adjudication-assurance.json'),
              confidenceFixture: load('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json'),
              v37SourceCutoff: {
                manifest: load('data/research/preference-custody/control-manifest-v37.json'),
                baseBuild: load('build/research/preference-custody-laboratory-floor-v36.json'),
                linkageBuild: load('build/research/preference-record-linkage-temporal-succession-assurance.json'),
                linkageFixture: load('data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json')
              }
            }
          }
        }
      }
    }
  }
};

const compiledBuild = compilePreferenceCustodyManifestV45(manifest, baseBuild, targetBuild, targetFixture, baseSources);
const buildPath = 'build/research/preference-custody-laboratory-floor-v45.json';
const build = existsSync(buildPath) ? load(buildPath) : compiledBuild;

assert.deepEqual(validatePreferenceCustodyManifestV45(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV45Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources), []);
assert.deepEqual(compiledBuild, build);
assert.equal(build.control_count, 47);
assert.equal(build.promotion_boundary.promotion_requirement_count, 1823);
assert.equal(build.controls.at(-1).control_id, 'PC-47');
assert.ok(build.open_frontiers.includes('linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability_governance'));
assert.ok(!build.open_frontiers.includes('linkage_interval_event_estimand_population_unit_horizon_support_tail_and_interpretation_custody'));

const cases = [];
const add = (name, part, mutate, expected) => cases.push([name, part, mutate, expected]);

const manifestMutations = [
  ['schema', x => x.schema_version = 'bad'],
  ['identity', x => x.manifest_id = 'bad'],
  ['issue', x => x.issue = 1],
  ['control issue', x => x.control_issue = 1],
  ['captured-at object', x => x.captured_at = { real_world_identity: 'Named Person', binding_public_authority: true }],
  ['captured-at impossible date', x => x.captured_at = '2026-02-30'],
  ['status', x => x.status = 'real_world_finding'],
  ['graph', x => x.graph_effect = 'edge'],
  ['thesis', x => x.counts_toward_thesis_evidence = true],
  ['root extra field', x => x.real_world_identity = 'Named Person'],
  ['base id', x => x.base_floor.manifest_id = 'bad'],
  ['base path', x => x.base_floor.source_manifest_path = 'bad'],
  ['base schema', x => x.base_floor.expected_build_schema = 'bad'],
  ['base count', x => x.base_floor.expected_control_count = 45],
  ['base extra field', x => x.base_floor.controller = 'external'],
  ['extension id', x => x.extension_control.control_id = 'bad'],
  ['fixture id', x => x.extension_control.fixture_id = 'bad'],
  ['failure class', x => x.extension_control.failure_class = 'bad'],
  ['fixture path', x => x.extension_control.source_fixture_path = 'bad'],
  ['build path', x => x.extension_control.build_artifact_path = 'bad'],
  ['build schema', x => x.extension_control.expected_build_schema = 'bad'],
  ['extension extra field', x => x.extension_control.binding_public_authority = true],
  ['rule drop', x => x.extension_control.required_refusal_rules.pop()],
  ['rule duplicate', x => x.extension_control.required_refusal_rules.push(x.extension_control.required_refusal_rules[0])],
  ['rule changed', x => x.extension_control.required_refusal_rules[0] = 'bad'],
  ['identification stage', x => x.identification_requirement.stage = 'bad'],
  ['identification state', x => x.identification_requirement.required_state = 'bad'],
  ['identification inference', x => x.identification_requirement.refused_inference = 'bad'],
  ['identification extra field', x => x.identification_requirement.authority = 'binding'],
  ['resolved frontier', x => x.frontier_transition.resolved_base_frontier = 'bad'],
  ['successor drop', x => x.frontier_transition.successor_frontiers.pop()],
  ['successor changed', x => x.frontier_transition.successor_frontiers[0] = 'bad'],
  ['frontier extra field', x => x.frontier_transition.controller = 'external'],
  ['requirement drop', x => x.real_case_requirements_added.pop()],
  ['requirement duplicate', x => x.real_case_requirements_added[39] = x.real_case_requirements_added[0]],
  ['requirement invalid', x => x.real_case_requirements_added[0] = 'INVALID REQUIREMENT'],
  ['prohibited changed', x => x.prohibited_inferences[0] = 'bad'],
  ['prohibited drop', x => x.prohibited_inferences.pop()],
  ['interpretation id', x => x.interpretation_contract.contract_id = 'bad'],
  ['interpretation what this is', x => x.interpretation_contract.what_this_is = 'A real identity and interval finding.'],
  ['interpretation what this is not', x => x.interpretation_contract.what_this_is_not = 'No limitations apply.'],
  ['interpretation caveat', x => x.interpretation_contract.copy_ready_caveat = 'Binding authority and production coverage are established.'],
  ['interpretation extra field', x => x.interpretation_contract.real_world_effect = true]
];
for (const [name, mutate] of manifestMutations) add(`manifest ${name}`, 'manifest', mutate);

const compiledMutations = [
  ['schema', x => x.schema_version = 'bad'],
  ['identity', x => x.manifest_id = 'bad'],
  ['issue', x => x.issue = 1],
  ['control issue', x => x.control_issue = 1],
  ['captured-at object', x => x.captured_at = { real_world_identity: 'Named Person' }],
  ['captured-at impossible date', x => x.captured_at = '2026-02-30'],
  ['captured-at stale valid date', x => x.captured_at = '2026-08-03'],
  ['status', x => x.status = 'bad'],
  ['graph', x => x.graph_effect = 'edge'],
  ['real-world evidence', x => x.real_world_evidence_state = 'verified'],
  ['thesis', x => x.counts_toward_thesis_evidence = true],
  ['conclusion', x => x.conclusion_generated = true],
  ['control count', x => x.control_count = 46],
  ['control removed', x => x.controls.pop()],
  ['control order', x => x.controls.reverse()],
  ['base control changed', x => x.controls[0].control_id = 'bad'],
  ['root extra field', x => x.binding_public_authority = true],
  ['composition base id', x => x.composition.base_manifest_id = 'bad'],
  ['composition base schema', x => x.composition.base_schema_version = 'bad'],
  ['composition base count', x => x.composition.base_control_count = 45],
  ['composition extension id', x => x.composition.extension_control_id = 'bad'],
  ['composition source schema', x => x.composition.v44_source_bundle_schema_version = 'bad'],
  ['composition promotion count', x => x.composition.final_promotion_requirement_count = 1],
  ['composition added count', x => x.composition.added_promotion_requirement_count = 39],
  ['composition extra field', x => x.composition.controller = 'external'],
  ['manifest hash', x => x.composition.manifest_snapshot_sha256 = '0'.repeat(64)],
  ['base floor hash', x => x.composition.base_floor_snapshot_sha256 = '0'.repeat(64)],
  ['extension hash', x => x.composition.extension_snapshot_sha256 = '0'.repeat(64)],
  ['source bundle hash', x => x.composition.v44_source_bundle_sha256 = '0'.repeat(64)],
  ['base controls hash', x => x.composition.base_controls_sha256 = '0'.repeat(64)],
  ['base requirements hash', x => x.composition.base_promotion_requirements_sha256 = '0'.repeat(64)],
  ['base refusal hash', x => x.composition.base_refusal_rule_union_sha256 = '0'.repeat(64)],
  ['base identification hash', x => x.composition.base_identification_requirements_sha256 = '0'.repeat(64)],
  ['base frontier hash', x => x.composition.base_open_frontiers_sha256 = '0'.repeat(64)],
  ['base prohibited hash', x => x.composition.base_prohibited_inferences_sha256 = '0'.repeat(64)],
  ['base interpretation hash', x => x.composition.base_interpretation_contract_sha256 = '0'.repeat(64)],
  ['base frontier snapshot', x => x.composition.base_open_frontiers = []],
  ['PC-47 id', x => x.controls.at(-1).control_id = 'bad'],
  ['PC-47 fixture id', x => x.controls.at(-1).fixture_id = 'bad'],
  ['PC-47 failure class', x => x.controls.at(-1).failure_class = 'bad'],
  ['PC-47 graph', x => x.controls.at(-1).graph_effect = 'edge'],
  ['PC-47 thesis', x => x.controls.at(-1).counts_toward_thesis_evidence = true],
  ['PC-47 real effect', x => x.controls.at(-1).real_world_effect_claimed = true],
  ['PC-47 preference change', x => x.controls.at(-1).preference_change_present = true],
  ['PC-47 intent', x => x.controls.at(-1).manipulative_intent_inferable = true],
  ['PC-47 required rule drop', x => x.controls.at(-1).required_refusal_rules.pop()],
  ['PC-47 observed rule drop', x => x.controls.at(-1).observed_refusal_rules.pop()],
  ['PC-47 proof metric', x => x.controls.at(-1).proof_summary.undefined_event_pairs = 99],
  ['PC-47 proof classification', x => x.controls.at(-1).proof_summary.public_event_badge_identifies_defined_event = true],
  ['PC-47 proof extra field', x => x.controls.at(-1).proof_summary.real_world_prevalence = 0.95],
  ['PC-47 control extra field', x => x.controls.at(-1).controller = 'external'],
  ['integrity flag', x => x.control_integrity.base_floor_qualified = false],
  ['integrity method frontier', x => x.control_integrity.method_governance_frontier_preserved = false],
  ['integrity extra field', x => x.control_integrity.binding_public_authority = true],
  ['resolved frontier remains', x => x.open_frontiers.push(x.frontier_transition.resolved_base_frontier)],
  ['successor removed', x => x.open_frontiers = x.open_frontiers.filter(item => item !== x.frontier_transition.successor_frontiers[0])],
  ['method frontier removed', x => x.open_frontiers = x.open_frontiers.filter(item => item !== 'linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability_governance')],
  ['frontier transition changed', x => x.frontier_transition.resolved_base_frontier = 'bad'],
  ['frontier transition extra field', x => x.frontier_transition.controller = 'external'],
  ['promotion count', x => x.promotion_boundary.promotion_requirement_count = 1],
  ['promotion requirements', x => x.promotion_boundary.real_case_requires.pop()],
  ['laboratory evidence', x => x.promotion_boundary.laboratory_controls_are_real_world_evidence = true],
  ['identification ledger', x => x.identification_requirements.pop()],
  ['refusal union', x => x.refusal_rule_union.pop()],
  ['prohibited ledger', x => x.prohibited_inferences.pop()],
  ['interpretation', x => x.interpretation_contract.what_this_is = 'A real identity finding.'],
  ['custody payload', x => x.custody_chain[0].payload.manifest_id = 'bad'],
  ['custody event extra field', x => x.custody_chain[0].real_world_identity = 'Named Person'],
  ['custody hash', x => x.custody_chain[1].event_sha256 = '0'.repeat(64)],
  ['custody head', x => x.custody_chain_head_sha256 = '0'.repeat(64)]
];
for (const [name, mutate] of compiledMutations) add(`compiled ${name}`, 'build', mutate);

const targetFixtureMutations = [
  ['captured date', x => x.captured_at = '2026-08-05'],
  ['description', x => x.worlds[0].description += ' changed'],
  ['event', x => x.worlds[1].event_semantics.undefined_event_pairs = 99],
  ['censoring', x => x.worlds[2].event_semantics.censoring_competing_event_ambiguous_pairs = 89],
  ['estimand', x => x.worlds[3].estimand.estimand_mismatched_pairs = 79],
  ['population', x => x.worlds[4].population_scope.population_frame_mismatched_pairs = 69],
  ['unit', x => x.worlds[5].unit_scope.unit_cluster_mismatched_pairs = 59],
  ['horizon', x => x.worlds[6].horizon_scope.horizon_time_origin_mismatched_pairs = 49],
  ['support', x => x.worlds[7].support_interpretation.support_tail_coverage_meaning_mismatched_pairs = 39],
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
  ['semantic signature', x => x.worlds[0].semantic_governance_signature_sha256 = '0'.repeat(64)]
];
for (const [name, mutate] of targetBuildMutations) add(`target build ${name}`, 'targetBuild', mutate);

const baseBuildMutations = [
  ['control count', x => x.control_count = 45],
  ['control', x => x.controls[0].control_id = 'bad'],
  ['semantic frontier', x => x.open_frontiers = x.open_frontiers.filter(item => item !== 'linkage_interval_event_estimand_population_unit_horizon_support_tail_and_interpretation_custody')],
  ['method frontier', x => x.open_frontiers = x.open_frontiers.filter(item => item !== 'linkage_interval_method_code_configuration_seed_data_partition_exchangeability_replication_and_deployment_applicability_governance')],
  ['requirements', x => x.promotion_boundary.real_case_requires.pop()],
  ['integrity', x => x.control_integrity.base_floor_qualified = false],
  ['chain', x => x.custody_chain[0].event_sha256 = '0'.repeat(64)],
  ['status', x => x.status = 'bad'],
  ['graph', x => x.graph_effect = 'edge'],
  ['schema', x => x.schema_version = 'bad'],
  ['manifest', x => x.manifest_id = 'bad']
];
for (const [name, mutate] of baseBuildMutations) add(`base build ${name}`, 'baseBuild', mutate);

const baseSourceMutations = [
  ['v44 manifest', x => x.manifest.captured_at = '2026-08-05'],
  ['v43 build', x => x.baseBuild.captured_at = '2099-01-01'],
  ['PC-46 build', x => x.targetBuild.captured_at = '2099-01-01'],
  ['PC-46 fixture', x => x.targetFixture.captured_at = '2099-01-01'],
  ['v43 manifest', x => x.baseSources.manifest.captured_at = '2099-01-01'],
  ['deep fixture', x => x.baseSources.baseSources.baseSources.baseSources.baseSources.baseSources.confidenceFixture.captured_at = '2099-01-01']
];
for (const [name, mutate] of baseSourceMutations) add(`base source ${name}`, 'baseSources', mutate);

assert.ok(cases.length >= 140, `adversarial case denominator unexpectedly small: ${cases.length}`);
for (const [name, part, mutate, expected] of cases) {
  const source = { build, manifest, baseBuild, targetBuild, targetFixture, baseSources };
  const candidate = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, clone(value)]));
  mutate(candidate[part]);
  const errors = validatePreferenceCustodyManifestV45Build(
    candidate.build,
    candidate.manifest,
    candidate.baseBuild,
    candidate.targetBuild,
    candidate.targetFixture,
    candidate.baseSources
  );
  const sourceErrors = part === 'manifest' ? validatePreferenceCustodyManifestV45(candidate.manifest) : [];
  assert.ok(errors.length + sourceErrors.length > 0, `mutation escaped: ${name}`);
  if (expected) assert.ok([...errors, ...sourceErrors].some(error => error.includes(expected)), `mutation missed expected guard (${name})`);
}

const changedManifest = clone(manifest);
changedManifest.captured_at = '2026-08-05';
const freshManifestBuild = compilePreferenceCustodyManifestV45(changedManifest, baseBuild, targetBuild, targetFixture, baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV45Build(freshManifestBuild, changedManifest, baseBuild, targetBuild, targetFixture, baseSources), []);
assert.ok(validatePreferenceCustodyManifestV45Build(build, changedManifest, baseBuild, targetBuild, targetFixture, baseSources).length > 0);

const changedFixture = clone(targetFixture);
changedFixture.captured_at = '2026-08-05';
const freshTargetBuild = compilePreferenceLinkageEventEstimandScopeInterpretationFixture(changedFixture);
assert.throws(
  () => compilePreferenceCustodyManifestV45(manifest, baseBuild, freshTargetBuild, changedFixture, baseSources),
  /v45 source snapshot postdates floor/
);
const postdatedTargetErrors = validatePreferenceCustodyManifestV45Build(
  build,
  manifest,
  baseBuild,
  freshTargetBuild,
  changedFixture,
  baseSources
);
assert.ok(postdatedTargetErrors.some(error => error.includes('v45 source snapshot postdates floor: targetBuild.captured_at')));
assert.ok(postdatedTargetErrors.some(error => error.includes('v45 source snapshot postdates floor: targetFixture.captured_at')));

const advancedManifest = clone(manifest);
advancedManifest.captured_at = '2026-08-05';
const freshFixtureFloor = compilePreferenceCustodyManifestV45(advancedManifest, baseBuild, freshTargetBuild, changedFixture, baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV45Build(freshFixtureFloor, advancedManifest, baseBuild, freshTargetBuild, changedFixture, baseSources), []);
assert.ok(validatePreferenceCustodyManifestV45Build(build, advancedManifest, baseBuild, freshTargetBuild, changedFixture, baseSources).length > 0);

const postdatedBaseSources = clone(baseSources);
postdatedBaseSources.targetFixture.captured_at = '2026-08-05';
const postdatedBaseErrors = validatePreferenceCustodyManifestV45Build(build, manifest, baseBuild, targetBuild, targetFixture, postdatedBaseSources);
assert.ok(postdatedBaseErrors.some(error => error.includes('v45 source snapshot postdates floor: baseSources.targetFixture.captured_at')));

console.log(`Preference custody floor v45 adversarial tests: PASS (${cases.length} mutations plus chronology-bound fresh-manifest and fresh-PC-47 succession checks)`);
