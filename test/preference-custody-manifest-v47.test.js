import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  compilePreferenceCustodyManifestV47,
  loadPreferenceCustodyV46SourceBundle,
  preferenceCustodyManifestV47Snapshot,
  preferenceCustodyV46SourceBundleSnapshot,
  validatePreferenceCustodyManifestV47,
  validatePreferenceCustodyManifestV47Build
} from '../tools/lib/preference-custody-manifest-v47.mjs';

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
if (!existsSync('build/research/preference-custody-laboratory-floor-v46.json')) execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v46.mjs'], { stdio: 'inherit' });
if (!existsSync('build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json')) execFileSync(process.execPath, ['tools/compile-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs'], { stdio: 'inherit' });

const manifest = load('data/research/preference-custody/control-manifest-v47.json');
const baseBuild = load('build/research/preference-custody-laboratory-floor-v46.json');
const targetBuild = load('build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV46SourceBundle(load);
const compiled = compilePreferenceCustodyManifestV47(manifest, baseBuild, targetBuild, targetFixture, baseSources);
const buildPath = 'build/research/preference-custody-laboratory-floor-v47.json';
const build = existsSync(buildPath) ? load(buildPath) : compiled;

assert.deepEqual(validatePreferenceCustodyManifestV47(manifest), []);
assert.deepEqual(validatePreferenceCustodyManifestV47Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources), []);
assert.deepEqual(compiled, build);
assert.deepEqual(compilePreferenceCustodyManifestV47(manifest, baseBuild, targetBuild, targetFixture, baseSources), compiled);
assert.equal(preferenceCustodyManifestV47Snapshot(manifest), 'f3f29b28a71ef9ca7f63140541ea863646c41f683d6b1853836c55c46e50f6c3');
assert.match(preferenceCustodyV46SourceBundleSnapshot(baseSources), /^[0-9a-f]{64}$/);
assert.equal(build.control_count, 49);
assert.equal(build.controls.at(-1).control_id, 'PC-49');
assert.equal(build.composition.base_control_count, 48);
assert.equal(build.composition.base_promotion_requirement_count, 1871);
assert.equal(build.composition.added_promotion_requirement_count, 49);
assert.equal(build.composition.final_promotion_requirement_count, 1920);
assert.equal(build.promotion_boundary.promotion_requirement_count, 1920);
assert.equal(build.promotion_boundary.real_case_requires.length, 1920);
assert.equal(new Set(build.promotion_boundary.real_case_requires).size, 1920);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.real_world_evidence_state, 'none');
assert.ok(Object.values(build.control_integrity).every(Boolean));
assert.ok(!build.open_frontiers.includes('linkage_interval_runtime_artifact_dependency_numerical_determinism_and_replay_assurance'));
assert.ok(build.open_frontiers.includes('linkage_interval_executable_artifact_build_dependency_environment_and_runtime_identity_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_numerical_determinism_seed_prng_parallelism_hardware_precision_and_replay_equivalence_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_deployment_applicability_monitoring_shift_trigger_abstention_rollback_and_release_succession_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_event_state_competing_event_censoring_abstention_and_ambiguity_governance'));
assert.ok(build.open_frontiers.includes('linkage_interval_estimand_population_unit_horizon_support_tail_coverage_meaning_and_interpretation_governance'));
assert.deepEqual(build.controls.slice(0, 48), baseBuild.controls);

const mutateLeaf = value => {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return Number.isInteger(value) ? value + 1 : value + 0.01;
  if (typeof value === 'string') return `${value}__mutation`;
  if (value === null) return 'mutation';
  throw new Error(`unsupported leaf ${typeof value}`);
};
function leaves(value, path = []) {
  if (value === null || typeof value !== 'object') return [{ path, value }];
  const output = [];
  if (Array.isArray(value)) value.forEach((item, index) => output.push(...leaves(item, [...path, index])));
  else Object.entries(value).forEach(([key, item]) => output.push(...leaves(item, [...path, key])));
  return output;
}
function setAt(root, path, value) {
  let cursor = root;
  for (const key of path.slice(0, -1)) cursor = cursor[key];
  cursor[path.at(-1)] = value;
}
function manifestRefused(candidate, label) {
  const errors = validatePreferenceCustodyManifestV47(candidate);
  assert.ok(errors.length > 0, `${label} must be refused`);
  assert.throws(() => compilePreferenceCustodyManifestV47(candidate, baseBuild, targetBuild, targetFixture, baseSources), undefined, `${label} compile must refuse`);
}
function inputRefused(candidateBase, candidateTarget, candidateFixture, candidateSources, label) {
  assert.throws(() => compilePreferenceCustodyManifestV47(manifest, candidateBase, candidateTarget, candidateFixture, candidateSources), undefined, `${label} must be refused`);
}
function buildRefused(candidate, label) {
  const errors = validatePreferenceCustodyManifestV47Build(candidate, manifest, baseBuild, targetBuild, targetFixture, baseSources);
  assert.ok(errors.length > 0, `${label} must be refused`);
}

let manifestMutationCount = 0;
for (const { path, value } of leaves(manifest)) {
  const candidate = clone(manifest);
  setAt(candidate, path, mutateLeaf(value));
  manifestRefused(candidate, `manifest leaf ${path.join('.')}`);
  manifestMutationCount += 1;
}
assert.ok(manifestMutationCount >= 90, `expected broad manifest mutation coverage, observed ${manifestMutationCount}`);

const extra = clone(manifest);
extra.unapproved = true;
manifestRefused(extra, 'extra manifest field');
const missing = clone(manifest);
delete missing.extension_control.failure_class;
manifestRefused(missing, 'missing extension field');
const reorderedRequirements = clone(manifest);
[reorderedRequirements.real_case_requirements_added[0], reorderedRequirements.real_case_requirements_added[1]] = [reorderedRequirements.real_case_requirements_added[1], reorderedRequirements.real_case_requirements_added[0]];
manifestRefused(reorderedRequirements, 'promotion requirement reordering');
const postdatedManifest = clone(manifest);
postdatedManifest.captured_at = '2026-08-05';
manifestRefused(postdatedManifest, 'postdated manifest');
const manifestCycle = clone(manifest);
manifestCycle.self = manifestCycle;
manifestRefused(manifestCycle, 'cyclic manifest');
const manifestProxy = new Proxy(clone(manifest), { ownKeys() { throw new Error('opaque'); } });
manifestRefused(manifestProxy, 'uninspectable manifest proxy');

const baseDrift = clone(baseBuild);
baseDrift.control_count = 47;
inputRefused(baseDrift, targetBuild, targetFixture, baseSources, 'base control denominator drift');
const baseControlDrift = clone(baseBuild);
baseControlDrift.controls[0].control_id = 'PC-XX';
inputRefused(baseControlDrift, targetBuild, targetFixture, baseSources, 'qualified base control mutation');
const targetDrift = clone(targetBuild);
targetDrift.metrics.worlds = 7;
inputRefused(baseBuild, targetDrift, targetFixture, baseSources, 'target build mutation');
const fixtureDrift = clone(targetFixture);
fixtureDrift.worlds[1].artifact_identity.unbound_artifact_executions = 99;
inputRefused(baseBuild, targetBuild, fixtureDrift, baseSources, 'target fixture mutation');
const sourceManifestDrift = clone(baseSources);
sourceManifestDrift.manifest.control_issue = 0;
inputRefused(baseBuild, targetBuild, targetFixture, sourceManifestDrift, 'v46 source manifest mutation');
const nestedPostdate = clone(baseSources);
nestedPostdate.baseSources.manifest.captured_at = '2026-08-05';
inputRefused(baseBuild, targetBuild, targetFixture, nestedPostdate, 'postdated transitive source snapshot');
const sourceAlias = clone(baseSources);
sourceAlias.targetFixture = sourceAlias.manifest;
inputRefused(baseBuild, targetBuild, targetFixture, sourceAlias, 'cross-root source alias');
const rootAlias = clone(baseSources);
inputRefused(baseBuild, targetBuild, targetFixture, { ...rootAlias, targetBuild }, 'source bundle alias to target build');
const sourceCycle = clone(baseSources);
sourceCycle.baseSources.cycle = sourceCycle;
inputRefused(baseBuild, targetBuild, targetFixture, sourceCycle, 'cyclic source bundle');
const nonCanonicalSource = clone(baseSources);
Object.setPrototypeOf(nonCanonicalSource.manifest, null);
inputRefused(baseBuild, targetBuild, targetFixture, nonCanonicalSource, 'non-canonical source object');
const proxySources = new Proxy(clone(baseSources), { ownKeys() { throw new Error('opaque'); } });
inputRefused(baseBuild, targetBuild, targetFixture, proxySources, 'uninspectable source proxy');

let buildMutationCount = 0;
const buildLeaves = leaves(build);
const stride = Math.max(1, Math.floor(buildLeaves.length / 48));
for (let index = 0; index < buildLeaves.length; index += stride) {
  const { path, value } = buildLeaves[index];
  const candidate = clone(build);
  setAt(candidate, path, mutateLeaf(value));
  buildRefused(candidate, `build leaf ${path.join('.')}`);
  buildMutationCount += 1;
}
assert.ok(buildMutationCount >= 40, `expected broad floor build tamper coverage, observed ${buildMutationCount}`);
const falseIntegrity = clone(build);
falseIntegrity.control_integrity.base_integrity_preserved = false;
buildRefused(falseIntegrity, 'false base-integrity substitution');
const droppedFrontier = clone(build);
droppedFrontier.open_frontiers = droppedFrontier.open_frontiers.filter(frontier => frontier !== 'linkage_interval_deployment_applicability_monitoring_shift_trigger_abstention_rollback_and_release_succession_governance');
buildRefused(droppedFrontier, 'independent deployment frontier deletion');
const floorAlias = clone(build);
floorAlias.controls[48].metrics = floorAlias.controls[47];
buildRefused(floorAlias, 'cross-control alias in floor build');
const floorCycle = clone(build);
floorCycle.controls[48].cycle = floorCycle;
buildRefused(floorCycle, 'cyclic floor build');

console.log(`validated Preference Custody floor v47 with ${manifestMutationCount} manifest mutations and ${buildMutationCount} floor build tamper checks`);
