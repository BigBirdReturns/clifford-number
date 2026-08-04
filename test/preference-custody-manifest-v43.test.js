import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  EXPECTED_LINKAGE_INTERVAL_CONSTRUCTION_METRICS,
  REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES,
  compilePreferenceLinkageIntervalConstructionAssuranceFixture
} from '../tools/lib/preference-linkage-interval-construction-assurance.mjs';
import { compilePreferenceCustodyManifestV42 } from '../tools/lib/preference-custody-manifest-v42.mjs';
import {
  compilePreferenceCustodyManifestV43,
  validatePreferenceCustodyManifestV43,
  validatePreferenceCustodyManifestV43Build
} from '../tools/lib/preference-custody-manifest-v43.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v43.mjs'], { stdio: 'pipe' });

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const manifest = load('data/research/preference-custody/control-manifest-v43.json');
const base = load('build/research/preference-custody-laboratory-floor-v42.json');
const intervalBuild = load('build/research/preference-linkage-interval-construction-assurance.json');
const intervalFixture = load('data/research/preference-custody/linkage-interval-construction-assurance.fixture.json');
const build = load('build/research/preference-custody-laboratory-floor-v43.json');
const markdown = readFileSync('build/research/preference-custody-laboratory-floor-v43.md', 'utf8');

const baseSources = {
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
};

assert.deepEqual(validatePreferenceCustodyManifestV43(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV43Build(build, manifest, base, intervalBuild, intervalFixture, baseSources), []);
assert.ok(validatePreferenceCustodyManifestV43Build(build).length > 0, 'complete source bundle is required');

assert.equal(Object.isFrozen(REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES), true);
const frozenRules = [...REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES];
assert.throws(() => { REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES[0] = 'arbitrary_unique_refusal_rule'; }, TypeError);
assert.deepEqual(REQUIRED_LINKAGE_INTERVAL_CONSTRUCTION_REFUSAL_RULES, frozenRules);
assert.deepEqual(validatePreferenceCustodyManifestV43(manifest), []);

assert.equal(build.control_count, 45);
assert.equal(build.composition.base_control_count, 44);
assert.equal(build.composition.extension_control_id, 'PC-45');
assert.equal(build.composition.v42_source_bundle_schema_version, 'preference-custody-v42-source-bundle@1');
assert.equal(build.composition.v42_source_bundle_sha256.length, 64);
assert.equal(build.control_integrity.v42_complete_source_bundle_bound, true);
assert.equal(build.composition.base_promotion_requirement_count, 1677);
assert.equal(build.composition.added_promotion_requirement_count, 54);
assert.equal(build.composition.final_promotion_requirement_count, 1731);
assert.deepEqual(build.controls.slice(0, 44), base.controls);
assert.deepEqual(build.composition.base_open_frontiers, base.open_frontiers);
assert.equal(build.composition.manifest_snapshot_sha256.length, 64);
assert.equal(build.composition.base_floor_snapshot_sha256.length, 64);
assert.equal(build.composition.extension_snapshot_sha256.length, 64);

const resolvedFrontier = 'linkage_uncertainty_interval_construction_empirical_coverage_dependence_and_multiplicity_assurance';
const targetSuccessor = 'linkage_interval_target_estimand_construction_method_and_out_of_sample_exchangeability_assurance';
const dependenceSuccessor = 'linkage_interval_dependence_resampling_effective_sample_size_multiplicity_adaptive_selection_and_simultaneous_coverage_governance';
const monitoringSibling = 'linkage_calibration_drift_subgroup_monitoring_recalibration_trigger_rollback_and_certificate_withdrawal_governance';
assert.ok(!build.open_frontiers.includes(resolvedFrontier));
assert.ok(build.open_frontiers.includes(targetSuccessor));
assert.ok(build.open_frontiers.includes(dependenceSuccessor));
assert.ok(build.open_frontiers.includes(monitoringSibling));
for (const frontier of base.open_frontiers.filter(item => item !== resolvedFrontier)) assert.ok(build.open_frontiers.includes(frontier), frontier);

const pc45 = build.controls.at(-1);
assert.equal(pc45.control_id, 'PC-45');
assert.equal(pc45.fixture_id, 'same-linkage-interval-validated-status-different-construction-states-v1');
for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_INTERVAL_CONSTRUCTION_METRICS)) assert.equal(pc45.proof_summary[key], expected, key);
assert.equal(pc45.proof_summary.unsupported_interval_decisions, 700);
assert.equal(pc45.proof_summary.complete_linkage_interval_construction_assurance_supported_in_at_least_one_world, true);
for (const value of Object.values(build.control_integrity)) assert.equal(value, true);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.promotion_boundary.laboratory_controls_are_real_world_evidence, false);
assert.equal(build.custody_chain.length, 5);
assert.equal(build.custody_chain.at(-1).event_sha256, build.custody_chain_head_sha256);
assert.match(markdown, /Controls:\*\* 45/);
assert.match(markdown, /Promotion requirements:\*\* 1731/);
assert.match(markdown, /PC-45 proof summary/);

// A validator-permitted manifest source revision must produce a fresh floor and reject the stale one.
const revisedManifest = clone(manifest);
revisedManifest.source_revision_receipt = 'PC45-V43-MANIFEST-REVISION-V2';
assert.deepEqual(validatePreferenceCustodyManifestV43(revisedManifest), []);
const revisedManifestBuild = compilePreferenceCustodyManifestV43(revisedManifest, base, intervalBuild, intervalFixture, baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV43Build(revisedManifestBuild, revisedManifest, base, intervalBuild, intervalFixture, baseSources), []);
assert.notEqual(revisedManifestBuild.composition.manifest_snapshot_sha256, build.composition.manifest_snapshot_sha256);
assert.ok(validatePreferenceCustodyManifestV43Build(build, revisedManifest, base, intervalBuild, intervalFixture, baseSources).length > 0, 'revised v43 manifest paired with stale floor');

// A valid revised PC-45 fixture must be rebuilt and cannot be paired with stale v43 output.
const revisedIntervalFixture = clone(intervalFixture);
revisedIntervalFixture.captured_at = '2026-08-04';
const revisedIntervalBuild = compilePreferenceLinkageIntervalConstructionAssuranceFixture(revisedIntervalFixture);
const revisedIntervalFloor = compilePreferenceCustodyManifestV43(manifest, base, revisedIntervalBuild, revisedIntervalFixture, baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV43Build(revisedIntervalFloor, manifest, base, revisedIntervalBuild, revisedIntervalFixture, baseSources), []);
assert.notEqual(revisedIntervalFloor.composition.extension_snapshot_sha256, build.composition.extension_snapshot_sha256);
assert.ok(validatePreferenceCustodyManifestV43Build(build, manifest, base, revisedIntervalBuild, revisedIntervalFixture, baseSources).length > 0, 'revised PC-45 fixture paired with stale floor');

// The complete v42 source bundle is hashed. A permitted v42-manifest revision requires fresh v42 and v43 builds.
const revisedV42Sources = clone(baseSources);
revisedV42Sources.manifest.source_revision_receipt = 'PC45-V42-MANIFEST-REVISION-V2';
const revisedV42Build = compilePreferenceCustodyManifestV42(
  revisedV42Sources.manifest,
  revisedV42Sources.baseBuild,
  revisedV42Sources.uncertaintyBuild,
  revisedV42Sources.uncertaintyFixture,
  revisedV42Sources.baseSources
);
const revisedV42Floor = compilePreferenceCustodyManifestV43(manifest, revisedV42Build, intervalBuild, intervalFixture, revisedV42Sources);
assert.deepEqual(validatePreferenceCustodyManifestV43Build(revisedV42Floor, manifest, revisedV42Build, intervalBuild, intervalFixture, revisedV42Sources), []);
assert.notEqual(revisedV42Floor.composition.v42_source_bundle_sha256, build.composition.v42_source_bundle_sha256);
assert.ok(validatePreferenceCustodyManifestV43Build(build, manifest, revisedV42Build, intervalBuild, intervalFixture, revisedV42Sources).length > 0, 'revised v42 manifest paired with stale v43 floor');

// A permitted downstream v40 source revision is also carried through the v42 build and the complete v42 bundle digest.
const revisedV40Sources = clone(baseSources);
revisedV40Sources.baseSources.baseSources.manifest.source_revision_receipt = 'PC45-V40-MANIFEST-REVISION-V2';
const revisedV40Base = compilePreferenceCustodyManifestV42(
  revisedV40Sources.manifest,
  revisedV40Sources.baseBuild,
  revisedV40Sources.uncertaintyBuild,
  revisedV40Sources.uncertaintyFixture,
  revisedV40Sources.baseSources
);
const revisedV40Floor = compilePreferenceCustodyManifestV43(manifest, revisedV40Base, intervalBuild, intervalFixture, revisedV40Sources);
assert.deepEqual(validatePreferenceCustodyManifestV43Build(revisedV40Floor, manifest, revisedV40Base, intervalBuild, intervalFixture, revisedV40Sources), []);
assert.notEqual(revisedV40Floor.composition.v42_source_bundle_sha256, build.composition.v42_source_bundle_sha256);
assert.ok(validatePreferenceCustodyManifestV43Build(build, manifest, revisedV40Base, intervalBuild, intervalFixture, revisedV40Sources).length > 0, 'revised v40 source paired with stale v43 floor');

const missingBundle = clone(baseSources);
delete missingBundle.baseSources;
assert.throws(() => compilePreferenceCustodyManifestV43(manifest, base, intervalBuild, intervalFixture, missingBundle), /v42 transitive sources|invalid v42 base/);

const substitutedRules = clone(manifest);
substitutedRules.extension_control.required_refusal_rules[0] = 'arbitrary_unique_refusal_rule';
assert.ok(validatePreferenceCustodyManifestV43(substitutedRules).length > 0);
assert.throws(() => compilePreferenceCustodyManifestV43(substitutedRules, base, intervalBuild, intervalFixture, baseSources), /exact PC-45 ledger/);
const substitutedRequirement = clone(manifest);
substitutedRequirement.real_case_requirements_added[0] = 'arbitrary_unique_requirement';
assert.ok(validatePreferenceCustodyManifestV43(substitutedRequirement).length > 0);
assert.throws(() => compilePreferenceCustodyManifestV43(substitutedRequirement, base, intervalBuild, intervalFixture, baseSources), /exact PC-45 extension/);
const substitutedInference = clone(manifest);
substitutedInference.prohibited_inferences[0] = 'Anything may be inferred.';
assert.ok(validatePreferenceCustodyManifestV43(substitutedInference).length > 0);
assert.throws(() => compilePreferenceCustodyManifestV43(substitutedInference, base, intervalBuild, intervalFixture, baseSources), /prohibited-inference ledger/);

const manifestMutations = [
  ['manifest schema', value => { value.schema_version = 'invalid'; }],
  ['manifest id', value => { value.manifest_id = 'invalid'; }],
  ['program issue', value => { value.issue = 595; }],
  ['control issue', value => { value.control_issue = 979; }],
  ['status', value => { value.status = 'real'; }],
  ['graph effect', value => { value.graph_effect = 'present'; }],
  ['thesis evidence', value => { value.counts_toward_thesis_evidence = true; }],
  ['base id', value => { value.base_floor.manifest_id = 'invalid'; }],
  ['base path', value => { value.base_floor.source_manifest_path = 'invalid'; }],
  ['base schema', value => { value.base_floor.expected_build_schema = 'invalid'; }],
  ['base count', value => { value.base_floor.expected_control_count = 43; }],
  ['control id', value => { value.extension_control.control_id = 'PC-44'; }],
  ['fixture id', value => { value.extension_control.fixture_id = 'invalid'; }],
  ['failure class', value => { value.extension_control.failure_class = 'invalid'; }],
  ['source path', value => { value.extension_control.source_fixture_path = 'invalid'; }],
  ['build path', value => { value.extension_control.build_artifact_path = 'invalid'; }],
  ['build schema', value => { value.extension_control.expected_build_schema = 'invalid'; }],
  ['refusal remove', value => { value.extension_control.required_refusal_rules.pop(); }],
  ['refusal substitute', value => { value.extension_control.required_refusal_rules[0] = 'arbitrary_unique_refusal_rule'; }],
  ['refusal duplicate', value => { value.extension_control.required_refusal_rules.push(value.extension_control.required_refusal_rules[0]); }],
  ['identification stage', value => { value.identification_requirement.stage = 'invalid'; }],
  ['identification required state', value => { value.identification_requirement.required_state = 'invalid'; }],
  ['identification refused inference', value => { value.identification_requirement.refused_inference = 'invalid'; }],
  ['identification extra field', value => { value.identification_requirement.unbound = 'value'; }],
  ['resolved frontier', value => { value.frontier_transition.resolved_base_frontier = 'invalid'; }],
  ['successor remove', value => { value.frontier_transition.successor_frontiers.pop(); }],
  ['successor substitute', value => { value.frontier_transition.successor_frontiers[0] = 'invalid'; }],
  ['successor duplicate', value => { value.frontier_transition.successor_frontiers.push(value.frontier_transition.successor_frontiers[0]); }],
  ['requirement remove', value => { value.real_case_requirements_added.pop(); }],
  ['requirement substitute', value => { value.real_case_requirements_added[0] = 'arbitrary_unique_requirement'; }],
  ['requirement format', value => { value.real_case_requirements_added[0] = 'Invalid Requirement'; }],
  ['requirement duplicate', value => { value.real_case_requirements_added.push(value.real_case_requirements_added[0]); }],
  ['inference remove', value => { value.prohibited_inferences.pop(); }],
  ['inference substitute', value => { value.prohibited_inferences[0] = 'Anything may be inferred.'; }],
  ['inference extra', value => { value.prohibited_inferences.push('Unbound inference.'); }],
  ['contract id', value => { value.interpretation_contract.contract_id = 'invalid'; }],
  ['contract what this is', value => { value.interpretation_contract.what_this_is = 'Anything.'; }],
  ['contract what this is not', value => { value.interpretation_contract.what_this_is_not = 'Nothing.'; }],
  ['contract caveat', value => { value.interpretation_contract.copy_ready_caveat = ''; }],
  ['contract extra field', value => { value.interpretation_contract.unbound = 'value'; }]
];

const buildMutations = [
  ['build schema', value => { value.schema_version = 'invalid'; }],
  ['build id', value => { value.manifest_id = 'invalid'; }],
  ['build control issue', value => { value.control_issue = 979; }],
  ['build status', value => { value.status = 'invalid'; }],
  ['build graph', value => { value.graph_effect = 'present'; }],
  ['build evidence state', value => { value.real_world_evidence_state = 'present'; }],
  ['build thesis', value => { value.counts_toward_thesis_evidence = true; }],
  ['build conclusion', value => { value.conclusion_generated = true; }],
  ['control count', value => { value.control_count = 44; }],
  ['control removed', value => { value.controls.pop(); }],
  ['base identity', value => { value.composition.base_manifest_id = 'invalid'; }],
  ['base schema', value => { value.composition.base_schema_version = 'invalid'; }],
  ['base count', value => { value.composition.base_control_count = 43; }],
  ['extension identity', value => { value.composition.extension_control_id = 'PC-44'; }],
  ['source bundle schema', value => { value.composition.v42_source_bundle_schema_version = 'invalid'; }],
  ['manifest snapshot', value => { value.composition.manifest_snapshot_sha256 = '0'.repeat(64); }],
  ['base snapshot', value => { value.composition.base_floor_snapshot_sha256 = '0'.repeat(64); }],
  ['extension snapshot', value => { value.composition.extension_snapshot_sha256 = '0'.repeat(64); }],
  ['source bundle hash', value => { value.composition.v42_source_bundle_sha256 = '0'.repeat(64); }],
  ['base controls hash', value => { value.composition.base_controls_sha256 = '0'.repeat(64); }],
  ['base requirements hash', value => { value.composition.base_promotion_requirements_sha256 = '0'.repeat(64); }],
  ['base promotion count', value => { value.composition.base_promotion_requirement_count = 1676; }],
  ['added promotion count', value => { value.composition.added_promotion_requirement_count = 53; }],
  ['final promotion count', value => { value.composition.final_promotion_requirement_count = 1730; }],
  ['base open frontier snapshot', value => { value.composition.base_open_frontiers.pop(); }],
  ['base control body', value => { value.controls[0].graph_effect = 'present'; }],
  ['PC45 identity', value => { value.controls.at(-1).control_id = 'PC-44'; }],
  ['PC45 fixture', value => { value.controls.at(-1).fixture_id = 'invalid'; }],
  ['PC45 metric', value => { value.controls.at(-1).proof_summary.unsupported_interval_decisions = 699; }],
  ['PC45 false classification', value => { value.controls.at(-1).proof_summary.nominal_coverage_identifies_empirical_target_population_coverage = true; }],
  ['PC45 complete path', value => { value.controls.at(-1).proof_summary.complete_linkage_interval_construction_assurance_supported_in_at_least_one_world = false; }],
  ['resolved frontier remains', value => { value.open_frontiers.push(resolvedFrontier); }],
  ['successor removed', value => { value.open_frontiers = value.open_frontiers.filter(item => item !== targetSuccessor); }],
  ['sibling removed', value => { value.open_frontiers = value.open_frontiers.filter(item => item !== monitoringSibling); }],
  ['transition resolved', value => { value.frontier_transition.resolved_base_frontier = 'invalid'; }],
  ['transition successor', value => { value.frontier_transition.successor_frontiers.pop(); }],
  ['promotion count', value => { value.promotion_boundary.promotion_requirement_count = 1730; }],
  ['promotion requirement removed', value => { value.promotion_boundary.real_case_requires.pop(); }],
  ['integrity flag', value => { value.control_integrity.v42_complete_source_bundle_bound = false; }],
  ['custody tamper', value => { value.custody_chain[1].payload.control.control_id = 'PC-44'; }]
];

assert.equal(manifestMutations.length + buildMutations.length, 80);
for (const [label, mutate] of manifestMutations) {
  const value = clone(manifest); mutate(value);
  assert.ok(validatePreferenceCustodyManifestV43(value).length > 0, label);
}
for (const [label, mutate] of buildMutations) {
  const value = clone(build); mutate(value);
  assert.ok(validatePreferenceCustodyManifestV43Build(value, manifest, base, intervalBuild, intervalFixture, baseSources).length > 0, label);
}

console.log('Preference custody floor v43 adversarial tests: PASS (80 mutations plus v42 complete-source-bundle, exact semantic-ledger, frozen-ledger, and source-succession checks)');
