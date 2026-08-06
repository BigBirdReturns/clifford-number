import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture,
  EXPECTED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_METRICS,
  preferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixtureSnapshot,
  validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild,
  validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture
} from '../tools/lib/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs';

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const fixture = load('data/research/preference-custody/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.fixture.json');
const compiled = compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture);
const buildPath = 'build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json';
const build = existsSync(buildPath) ? load(buildPath) : compiled;

assert.deepEqual(validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(build, fixture), []);
assert.deepEqual(compiled, build);
assert.deepEqual(compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture), compiled);
assert.equal(preferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixtureSnapshot(fixture), '85efedba500298de2d30bf242bf591e2179ad600213e483cc6b21273f4fb2616');
assert.deepEqual(build.metrics, EXPECTED_LINKAGE_EXECUTABLE_ARTIFACT_BUILD_DEPENDENCY_ENVIRONMENT_RUNTIME_IDENTITY_METRICS);
assert.equal(build.world_count, 8);
assert.equal(build.public_signature_count, 1);
assert.equal(build.artifact_runtime_governance_signature_count, 8);
assert.equal(build.complete_artifact_runtime_assurance_world_count, 1);
assert.equal(build.graph_effect, 'none');
assert.equal(build.counts_toward_thesis_evidence, false);
assert.equal(build.conclusion_generated, false);
assert.equal(build.real_world_evidence_state, 'none');
assert.equal(build.classification.security_compromise_established, false);
assert.equal(build.classification.binding_public_authority_present, false);

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
function fixtureRefused(candidate, label) {
  const errors = validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(candidate);
  assert.ok(errors.length > 0, `${label} must be refused`);
  assert.throws(
    () => compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(candidate),
    error => error instanceof Error && !(error instanceof TypeError),
    `${label} compile must refuse without a TypeError escape`
  );
}
function buildRefused(candidate, label) {
  const errors = validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(candidate, fixture);
  assert.ok(errors.length > 0, `${label} must be refused`);
}

let fixtureMutationCount = 0;
for (const { path, value } of leaves(fixture)) {
  const candidate = clone(fixture);
  setAt(candidate, path, mutateLeaf(value));
  fixtureRefused(candidate, `fixture leaf ${path.join('.')}`);
  fixtureMutationCount += 1;
}
assert.ok(fixtureMutationCount >= 900, `expected a broad fixture mutation census, observed ${fixtureMutationCount}`);

const aggregatePreserving = clone(fixture);
aggregatePreserving.worlds[1].source_review.source_review_unbound_executions -= 1;
aggregatePreserving.worlds[2].build_reproducibility.build_toolchain_divergent_executions += 1;
fixtureRefused(aggregatePreserving, 'aggregate-preserving burden redistribution');
const partialState = clone(fixture);
partialState.worlds[3].artifact_package.package_identity_bound = true;
fixtureRefused(partialState, 'partial state mutation preserving coarse incompleteness');
const reordered = clone(fixture);
[reordered.worlds[1], reordered.worlds[2]] = [reordered.worlds[2], reordered.worlds[1]];
fixtureRefused(reordered, 'world reordering');
const extraTop = clone(fixture);
extraTop.unapproved = true;
fixtureRefused(extraTop, 'extra top-level field');
const extraNested = clone(fixture);
extraNested.worlds[0].source_review.unapproved = true;
fixtureRefused(extraNested, 'extra nested field');
const missingNested = clone(fixture);
delete missingNested.worlds[0].source_review.repository_bound;
fixtureRefused(missingNested, 'missing nested field');
const duplicatedRule = clone(fixture);
duplicatedRule.required_refusal_rules.push(duplicatedRule.required_refusal_rules[0]);
fixtureRefused(duplicatedRule, 'duplicated refusal rule');
const cyclic = clone(fixture);
cyclic.self = cyclic;
fixtureRefused(cyclic, 'cyclic fixture');
const aliased = clone(fixture);
aliased.worlds[1].source_review = aliased.worlds[0].source_review;
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

const getTrapFixture = new Proxy(clone(fixture), {
  get(target, property, receiver) {
    if (property === 'baseline') throw new Error('opaque baseline');
    return Reflect.get(target, property, receiver);
  }
});
assert.doesNotThrow(
  () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(getTrapFixture),
  'get-trap proxy fixture validation must not throw'
);
fixtureRefused(getTrapFixture, 'get-trap proxy fixture');

const nestedGetTrapFixture = clone(fixture);
nestedGetTrapFixture.baseline = new Proxy(nestedGetTrapFixture.baseline, {
  get(target, property, receiver) {
    if (property === 'approved_use') throw new Error('opaque approved use');
    return Reflect.get(target, property, receiver);
  }
});
assert.doesNotThrow(
  () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(nestedGetTrapFixture),
  'nested get-trap proxy fixture validation must not throw'
);
fixtureRefused(nestedGetTrapFixture, 'nested get-trap proxy fixture');

const lengthTrapFixture = clone(fixture);
lengthTrapFixture.worlds = new Proxy(lengthTrapFixture.worlds, {
  get(target, property, receiver) {
    if (property === 'length') throw new Error('opaque worlds length');
    return Reflect.get(target, property, receiver);
  }
});
assert.doesNotThrow(
  () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(lengthTrapFixture),
  'array length-trap proxy fixture validation must not throw'
);
fixtureRefused(lengthTrapFixture, 'array length-trap proxy fixture');

for (const malformedFixture of [null, 0, 'invalid', false, []]) {
  assert.doesNotThrow(
    () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(malformedFixture),
    `top-level malformed fixture ${String(malformedFixture)} validation must not throw`
  );
  fixtureRefused(malformedFixture, `top-level malformed fixture ${String(malformedFixture)}`);
}
for (const field of ['baseline', 'interpretation_contract', 'expected_classification']) {
  for (const replacement of [null, 0]) {
    const candidate = clone(fixture);
    candidate[field] = replacement;
    assert.doesNotThrow(
      () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(candidate),
      `${field} ${String(replacement)} validation must not throw`
    );
    fixtureRefused(candidate, `${field} ${String(replacement)}`);
  }
}
for (const field of ['required_refusal_rules', 'worlds']) {
  for (const replacement of [null, 0]) {
    const candidate = clone(fixture);
    candidate[field] = replacement;
    assert.doesNotThrow(
      () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(candidate),
      `${field} ${String(replacement)} validation must not throw`
    );
    fixtureRefused(candidate, `${field} ${String(replacement)}`);
  }
}
const nullFixtureWorld = clone(fixture);
nullFixtureWorld.worlds[0] = null;
assert.doesNotThrow(
  () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(nullFixtureWorld),
  'null fixture world validation must not throw'
);
fixtureRefused(nullFixtureWorld, 'null fixture world');
for (const field of [...Object.keys(fixture.worlds[0]).filter(key => [
  'source_review',
  'build_reproducibility',
  'artifact_package',
  'dependency_supply_chain',
  'runtime_environment',
  'execution_attestation',
  'governance',
  'expected_flags'
].includes(key))]) {
  for (const replacement of [null, 0]) {
    const candidate = clone(fixture);
    candidate.worlds[0][field] = replacement;
    assert.doesNotThrow(
      () => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(candidate),
      `world ${field} ${String(replacement)} validation must not throw`
    );
    fixtureRefused(candidate, `world ${field} ${String(replacement)}`);
  }
}

const fixtureCliTemp = mkdtempSync(join(tmpdir(), 'pc50-null-fixture-'));
try {
  const nullFixturePath = join(fixtureCliTemp, 'null-fixture.json');
  const compileJsonPath = join(fixtureCliTemp, 'compiled.json');
  const compileMarkdownPath = join(fixtureCliTemp, 'compiled.md');
  writeFileSync(nullFixturePath, 'null\n');
  const compileCli = spawnSync(process.execPath, [
    'tools/compile-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs',
    nullFixturePath,
    compileJsonPath,
    compileMarkdownPath
  ], { encoding: 'utf8' });
  assert.equal(compileCli.status, 1, 'null standalone fixture compile CLI must refuse');
  assert.match(`${compileCli.stdout}\n${compileCli.stderr}`, /PC-50 fixture must be an object/);
  assert.doesNotMatch(`${compileCli.stdout}\n${compileCli.stderr}`, /TypeError/);

  const missingBuildPath = join(fixtureCliTemp, 'missing-build.json');
  const validateCli = spawnSync(process.execPath, [
    'tools/validate-preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs',
    nullFixturePath,
    missingBuildPath
  ], { encoding: 'utf8' });
  assert.equal(validateCli.status, 1, 'null standalone fixture validate CLI must refuse before opening the build');
  assert.match(validateCli.stderr, /PC-50 fixture must be an object/);
  assert.doesNotMatch(`${validateCli.stdout}\n${validateCli.stderr}`, /TypeError|ENOENT/);
} finally {
  rmSync(fixtureCliTemp, { recursive: true, force: true });
}

let buildMutationCount = 0;
const buildLeaves = leaves(build);
const stride = Math.max(1, Math.floor(buildLeaves.length / 190));
for (let index = 0; index < buildLeaves.length; index += stride) {
  const { path, value } = buildLeaves[index];
  const candidate = clone(build);
  setAt(candidate, path, mutateLeaf(value));
  buildRefused(candidate, `build leaf ${path.join('.')}`);
  buildMutationCount += 1;
}
assert.ok(buildMutationCount >= 150, `expected broad build tamper coverage, observed ${buildMutationCount}`);
for (const field of ['worlds','required_refusal_rules','custody_chain','baseline','metrics','classification','interpretation_contract']) {
  const candidate = clone(build);
  candidate[field] = 0;
  assert.doesNotThrow(() => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(candidate, fixture), `scalar ${field} validation must not throw`);
  buildRefused(candidate, `scalar ${field}`);
}
const nullCompiledWorld = clone(build);
nullCompiledWorld.worlds[0] = null;
assert.doesNotThrow(() => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(nullCompiledWorld, fixture), 'null compiled world validation must not throw');
buildRefused(nullCompiledWorld, 'null compiled world');
const nullStandaloneCustodyEvent = clone(build);
nullStandaloneCustodyEvent.custody_chain[0] = null;
assert.doesNotThrow(() => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(nullStandaloneCustodyEvent, fixture), 'null standalone custody event validation must not throw');
buildRefused(nullStandaloneCustodyEvent, 'null standalone custody event');

for (const malformedBuild of [null, 0, 'invalid', false, []]) {
  assert.doesNotThrow(() => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(malformedBuild, fixture), 'top-level malformed standalone build validation must not throw');
  buildRefused(malformedBuild, `top-level malformed standalone build ${String(malformedBuild)}`);
}
for (const field of ['flags', 'numeric_burden']) {
  const candidate = clone(build);
  candidate.worlds[0][field] = 0;
  assert.doesNotThrow(() => validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(candidate, fixture), `scalar compiled world ${field} validation must not throw`);
  buildRefused(candidate, `scalar compiled world ${field}`);
}

const buildAlias = clone(build);
buildAlias.worlds[1].flags = buildAlias.worlds[0].flags;
buildRefused(buildAlias, 'aliased build flags');
const buildCycle = clone(build);
buildCycle.worlds[0].cycle = buildCycle;
buildRefused(buildCycle, 'cyclic build');
const buildAuthority = clone(build);
buildAuthority.worlds[0].governance.binding_public_authority = true;
buildRefused(buildAuthority, 'truthy binding authority substitution');

console.log(`validated PC-50 standalone fixture with ${fixtureMutationCount} fixture mutations and ${buildMutationCount} build tamper checks`);
