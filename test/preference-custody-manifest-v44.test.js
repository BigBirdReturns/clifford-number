import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { compilePreferenceCustodyManifestV44, validatePreferenceCustodyManifestV44, validatePreferenceCustodyManifestV44Build } from '../tools/lib/preference-custody-manifest-v44.mjs';
import { compilePreferenceLinkageTargetConstructionExchangeabilityFixture } from '../tools/lib/preference-linkage-target-construction-exchangeability-assurance.mjs';
const load=path=>JSON.parse(readFileSync(path,'utf8')); const clone=value=>structuredClone(value);
const manifest=load('data/research/preference-custody/control-manifest-v44.json');
const targetFixture=load(manifest.extension_control.source_fixture_path);
const targetBuildPath='build/research/preference-linkage-target-construction-exchangeability-assurance.json';
const targetBuild=existsSync(targetBuildPath)?load(targetBuildPath):compilePreferenceLinkageTargetConstructionExchangeabilityFixture(targetFixture);
const baseBuild=load('build/research/preference-custody-laboratory-floor-v43.json');
const baseSources = {
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
};
const compiledBuild=compilePreferenceCustodyManifestV44(manifest,baseBuild,targetBuild,targetFixture,baseSources);
const buildPath='build/research/preference-custody-laboratory-floor-v44.json';
const build=existsSync(buildPath)?load(buildPath):compiledBuild;
assert.deepEqual(validatePreferenceCustodyManifestV44(manifest),[]);
assert.deepEqual(validatePreferenceCustodyManifestV44Build(build,manifest,baseBuild,targetBuild,targetFixture,baseSources),[]);
assert.deepEqual(compiledBuild,build);

const cases=[]; const add=(name,parts,mutate)=>cases.push([name,parts,mutate]);
const compiledMutations=[
 ['schema',x=>x.schema_version='bad'],['identity',x=>x.manifest_id='bad'],['control issue',x=>x.control_issue=1],['captured-at object',x=>x.captured_at={real_world_identity:'Named Person is definitively linked',binding_public_authority:true,coverage_claim:'95% in production'}],['captured-at invalid date',x=>x.captured_at='2026-02-30'],['status',x=>x.status='bad'],['graph',x=>x.graph_effect='edge'],['thesis',x=>x.counts_toward_thesis_evidence=true],['conclusion',x=>x.conclusion_generated=true],['control count',x=>x.control_count=45],['control removed',x=>x.controls.pop()],['base controls',x=>x.controls[0].control_id='bad'],['pc46 id',x=>x.controls.at(-1).control_id='bad'],['proof summary',x=>x.controls.at(-1).proof_summary.worlds=7],['composition base',x=>x.composition.base_manifest_id='bad'],['promotion count',x=>x.composition.final_promotion_requirement_count=1],['manifest hash',x=>x.composition.manifest_snapshot_sha256='0'.repeat(64)],['base hash',x=>x.composition.base_floor_snapshot_sha256='0'.repeat(64)],['extension hash',x=>x.composition.extension_snapshot_sha256='0'.repeat(64)],['bundle hash',x=>x.composition.v43_source_bundle_sha256='0'.repeat(64)],['frontier',x=>x.open_frontiers.push(x.frontier_transition.resolved_base_frontier)],['integrity',x=>x.control_integrity.base_floor_qualified=false],['chain',x=>x.custody_chain[1].event_sha256='0'.repeat(64)],['interpretation',x=>x.interpretation_contract.what_this_is='bad'],['frontier extra field',x=>x.frontier_transition.controller='external']
];
for(const [name,mutate] of compiledMutations)add(`compiled ${name}`,['build'],mutate);
const manifestMutations=[
 ['schema',x=>x.schema_version='bad'],['id',x=>x.manifest_id='bad'],['issue',x=>x.control_issue=1],['captured-at object',x=>x.captured_at={real_world_identity:'Named Person is definitively linked',binding_public_authority:true,coverage_claim:'95% in production'}],['captured-at invalid date',x=>x.captured_at='2026-02-30'],['status',x=>x.status='bad'],['graph',x=>x.graph_effect='edge'],['thesis',x=>x.counts_toward_thesis_evidence=true],['base id',x=>x.base_floor.manifest_id='bad'],['base path',x=>x.base_floor.source_manifest_path='bad'],['extension id',x=>x.extension_control.control_id='bad'],['fixture id',x=>x.extension_control.fixture_id='bad'],['failure class',x=>x.extension_control.failure_class='bad'],['fixture path',x=>x.extension_control.source_fixture_path='bad'],['build path',x=>x.extension_control.build_artifact_path='bad'],['rule drop',x=>x.extension_control.required_refusal_rules.pop()],['identification',x=>x.identification_requirement.stage='bad'],['resolved frontier',x=>x.frontier_transition.resolved_base_frontier='bad'],['successor drop',x=>x.frontier_transition.successor_frontiers.pop()],['requirement drop',x=>x.real_case_requirements_added.pop()],['prohibited',x=>x.prohibited_inferences[0]='bad'],['interpretation',x=>x.interpretation_contract.contract_id='bad'],['frontier extra field',x=>x.frontier_transition.controller='external']
];
for(const [name,mutate] of manifestMutations)add(`manifest ${name}`,['manifest'],mutate);
const targetFixtureMutations=[['description',x=>x.worlds[0].description+=' changed'],['event',x=>x.worlds[1].target_event.undefined_event_pairs=99],['estimand',x=>x.worlds[2].estimand_scope.estimand_mismatched_pairs=79],['method',x=>x.worlds[3].method_identity.unidentified_method_pairs=59],['overlap',x=>x.worlds[4].data_partition.construction_validation_overlap_pairs=39],['leakage',x=>x.worlds[5].data_partition.split_leaked_pairs=39],['exchangeability',x=>x.worlds[6].exchangeability_deployment.exchangeability_violated_pairs=49],['stale',x=>x.worlds[7].governance.stale_target_method_decisions=99],['rule',x=>x.required_refusal_rules[0]='bad'],['baseline',x=>x.baseline.approved_use='bad']];
for(const [name,mutate] of targetFixtureMutations)add(`target fixture ${name}`,['targetFixture'],mutate);
const targetBuildMutations=[['metric',x=>x.metrics.worlds=7],['hash',x=>x.source_fixture_sha256='0'.repeat(64)],['world',x=>x.worlds[0].expected_mechanism='bad'],['classification',x=>x.classification.graph_effect_present=true],['rule',x=>x.required_refusal_rules.pop()],['chain',x=>x.custody_chain[0].event_sha256='0'.repeat(64)],['status',x=>x.status='bad'],['graph',x=>x.graph_effect='edge'],['public signature',x=>x.worlds[0].public_signature_sha256='0'.repeat(64)],['governance signature',x=>x.worlds[0].target_method_governance_signature_sha256='0'.repeat(64)]];
for(const [name,mutate] of targetBuildMutations)add(`target build ${name}`,['targetBuild'],mutate);
const baseBuildMutations=[['control count',x=>x.control_count=44],['control',x=>x.controls[0].control_id='bad'],['frontier',x=>x.open_frontiers=[]],['requirements',x=>x.promotion_boundary.real_case_requires.pop()],['integrity',x=>x.control_integrity.base_floor_qualified=false],['chain',x=>x.custody_chain[0].event_sha256='0'.repeat(64)],['status',x=>x.status='bad'],['graph',x=>x.graph_effect='edge'],['schema',x=>x.schema_version='bad'],['manifest',x=>x.manifest_id='bad']];
for(const [name,mutate] of baseBuildMutations)add(`base build ${name}`,['baseBuild'],mutate);
const baseSourceMutations=[['v43 manifest',x=>x.manifest.captured_at='2099-01-01'],['v42 build',x=>x.baseBuild.captured_at='2099-01-01'],['pc45 build',x=>x.intervalBuild.captured_at='2099-01-01'],['pc45 fixture',x=>x.intervalFixture.captured_at='2099-01-01'],['v42 manifest',x=>x.baseSources.manifest.captured_at='2099-01-01'],['deep fixture',x=>x.baseSources.baseSources.baseSources.baseSources.baseSources.confidenceFixture.captured_at='2099-01-01']];
for(const [name,mutate] of baseSourceMutations)add(`base source ${name}`,['baseSources'],mutate);
const extra=[['promotion boundary',x=>x.promotion_boundary.promotion_requirement_count=1],['refusal union',x=>x.refusal_rule_union.pop()],['identification',x=>x.identification_requirements.pop()],['prohibited',x=>x.prohibited_inferences.pop()],['base open snapshot',x=>x.composition.base_open_frontiers=[]],['head hash',x=>x.custody_chain_head_sha256='0'.repeat(64)]];
for(const [name,mutate] of extra)add(`extra ${name}`,['build'],mutate);
assert.equal(cases.length,90);
for(const [name,parts,mutate] of cases){
  const candidate={build,manifest,baseBuild,targetBuild,targetFixture,baseSources};
  const cloned=Object.fromEntries(Object.entries(candidate).map(([key,value])=>[key,clone(value)]));
  mutate(cloned[parts[0]]);
  const errors=validatePreferenceCustodyManifestV44Build(cloned.build,cloned.manifest,cloned.baseBuild,cloned.targetBuild,cloned.targetFixture,cloned.baseSources);
  const sourceErrors=parts[0]==='manifest'?validatePreferenceCustodyManifestV44(cloned.manifest):[];
  assert.ok(errors.length+sourceErrors.length>0,`mutation escaped: ${name}`);
}

const changedManifest=clone(manifest); changedManifest.captured_at='2026-08-04';
const freshManifestBuild=compilePreferenceCustodyManifestV44(changedManifest,baseBuild,targetBuild,targetFixture,baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV44Build(freshManifestBuild,changedManifest,baseBuild,targetBuild,targetFixture,baseSources),[]);
assert.ok(validatePreferenceCustodyManifestV44Build(build,changedManifest,baseBuild,targetBuild,targetFixture,baseSources).length>0);
const changedFixture=clone(targetFixture); changedFixture.captured_at='2026-08-04';
const freshTargetBuild=compilePreferenceLinkageTargetConstructionExchangeabilityFixture(changedFixture);
const freshFixtureFloor=compilePreferenceCustodyManifestV44(manifest,baseBuild,freshTargetBuild,changedFixture,baseSources);
assert.deepEqual(validatePreferenceCustodyManifestV44Build(freshFixtureFloor,manifest,baseBuild,freshTargetBuild,changedFixture,baseSources),[]);
assert.ok(validatePreferenceCustodyManifestV44Build(build,manifest,baseBuild,targetBuild,changedFixture,baseSources).length>0);
console.log('Preference custody floor v44 adversarial tests: PASS (90 mutations plus fresh-manifest and fresh-PC-46 succession checks)');
