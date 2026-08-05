import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  COMPLETE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_REPLAY_CLASSIFICATION,
  EXPECTED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_METRICS,
  compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture,
  preferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixtureSnapshot,
  validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild,
  validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture
} from '../tools/lib/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs';

const fixturePath = 'data/research/preference-custody/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.fixture.json';
const buildPath = 'build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
if (!existsSync(buildPath)) execFileSync(process.execPath, ['tools/compile-preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs'], { stdio: 'inherit' });

const fixture = load(fixturePath);
const build = load(buildPath);
const compiled = compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture);
assert.deepEqual(validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild(build, fixture), []);
assert.deepEqual(compiled, build);
assert.deepEqual(compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture), compiled);
assert.equal(preferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixtureSnapshot(fixture), '262848ba8b020a61f8d6a01f488749ac8df2badc70271407d994fce4c2c1719b');
assert.deepEqual(build.metrics, EXPECTED_LINKAGE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_DETERMINISM_REPLAY_METRICS);
assert.equal(build.world_count, 8);
assert.equal(build.public_signature_count, 1);
assert.equal(build.runtime_governance_signature_count, 8);
assert.equal(build.complete_runtime_assurance_world_count, 1);
assert.equal(build.worlds.filter(world => world.flags.complete_runtime_artifact_dependency_numerical_replay_assurance).length, 1);
assert.equal(build.worlds.find(world => world.flags.complete_runtime_artifact_dependency_numerical_replay_assurance)?.expected_mechanism, COMPLETE_RUNTIME_ARTIFACT_DEPENDENCY_NUMERICAL_REPLAY_CLASSIFICATION);
assert.equal(build.metrics.binding_public_authority_worlds, 0);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.real_world_evidence_state, 'none');

const mutateLeaf = value => {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return Number.isInteger(value) ? value + 1 : value + 0.01;
  if (typeof value === 'string') return `${value}__mutation`;
  if (value === null) return 'mutation';
  throw new Error(`unsupported mutation leaf ${typeof value}`);
};
function leaves(value, path = []) {
  if (value === null || typeof value !== 'object') return [{ path, value }];
  const output = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => output.push(...leaves(item, [...path, index])));
  } else {
    Object.entries(value).forEach(([key, item]) => output.push(...leaves(item, [...path, key])));
  }
  return output;
}
function setAt(root, path, value) {
  let cursor = root;
  for (const key of path.slice(0, -1)) cursor = cursor[key];
  cursor[path.at(-1)] = value;
}
function fixtureRefused(candidate, label) {
  const errors = validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(candidate);
  assert.ok(errors.length > 0, `${label} must be refused`);
  assert.throws(() => compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(candidate), undefined, `${label} compile must refuse`);
}
function buildRefused(candidate, label) {
  const errors = validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild(candidate, fixture);
  assert.ok(errors.length > 0, `${label} must be refused`);
}

let fixtureMutationCount = 0;
for (const { path, value } of leaves(fixture)) {
  const candidate = clone(fixture);
  setAt(candidate, path, mutateLeaf(value));
  fixtureRefused(candidate, `fixture leaf ${path.join('.')}`);
  fixtureMutationCount += 1;
}
assert.ok(fixtureMutationCount >= 500, `expected a broad fixture mutation census, observed ${fixtureMutationCount}`);

const aggregatePreserving = clone(fixture);
aggregatePreserving.worlds[1].artifact_identity.unbound_artifact_executions -= 1;
aggregatePreserving.worlds[2].environment_dependency.dependency_environment_drift_executions += 1;
fixtureRefused(aggregatePreserving, 'aggregate-preserving burden redistribution');

const partialState = clone(fixture);
partialState.worlds[1].artifact_identity.build_artifact_bound = true;
fixtureRefused(partialState, 'partial state mutation preserving coarse incompleteness');

const reordered = clone(fixture);
[reordered.worlds[1], reordered.worlds[2]] = [reordered.worlds[2], reordered.worlds[1]];
fixtureRefused(reordered, 'world reordering');

const extraTop = clone(fixture);
extraTop.unapproved = true;
fixtureRefused(extraTop, 'extra top-level field');
const extraNested = clone(fixture);
extraNested.worlds[0].artifact_identity.unapproved = true;
fixtureRefused(extraNested, 'extra nested field');
const missingNested = clone(fixture);
delete missingNested.worlds[0].artifact_identity.reviewed_source_bound;
fixtureRefused(missingNested, 'missing nested field');
const duplicatedRule = clone(fixture);
duplicatedRule.required_refusal_rules.push(duplicatedRule.required_refusal_rules[0]);
fixtureRefused(duplicatedRule, 'duplicated refusal rule');

const cyclic = clone(fixture);
cyclic.self = cyclic;
fixtureRefused(cyclic, 'cyclic fixture');
const aliased = clone(fixture);
aliased.worlds[1].artifact_identity = aliased.worlds[0].artifact_identity;
fixtureRefused(aliased, 'cross-world aliased fixture section');
const nonCanonical = clone(fixture);
Object.setPrototypeOf(nonCanonical.worlds[0], null);
fixtureRefused(nonCanonical, 'non-canonical object prototype');
const sparse = clone(fixture);
delete sparse.worlds[3];
fixtureRefused(sparse, 'sparse world array');
const accessor = clone(fixture);
Object.defineProperty(accessor.baseline, 'approved_use', { enumerable: true, get() { return 'longitudinal_exposure_estimation'; } });
fixtureRefused(accessor, 'accessor-bearing fixture');
const proxied = new Proxy(clone(fixture), { ownKeys() { throw new Error('opaque'); } });
fixtureRefused(proxied, 'uninspectable proxy fixture');

let buildMutationCount = 0;
const buildLeaves = leaves(build);
const stride = Math.max(1, Math.floor(buildLeaves.length / 160));
for (let index = 0; index < buildLeaves.length; index += stride) {
  const { path, value } = buildLeaves[index];
  const candidate = clone(build);
  setAt(candidate, path, mutateLeaf(value));
  buildRefused(candidate, `build leaf ${path.join('.')}`);
  buildMutationCount += 1;
}
assert.ok(buildMutationCount >= 120, `expected broad build tamper coverage, observed ${buildMutationCount}`);

const buildAlias = clone(build);
buildAlias.worlds[1].flags = buildAlias.worlds[0].flags;
buildRefused(buildAlias, 'aliased build flags');
const buildCycle = clone(build);
buildCycle.worlds[0].cycle = buildCycle;
buildRefused(buildCycle, 'cyclic build');
const buildAuthority = clone(build);
buildAuthority.worlds[0].governance.binding_public_authority = true;
buildRefused(buildAuthority, 'truthy binding authority substitution');

console.log(`validated PC-49 standalone fixture with ${fixtureMutationCount} fixture mutations and ${buildMutationCount} build tamper checks`);
