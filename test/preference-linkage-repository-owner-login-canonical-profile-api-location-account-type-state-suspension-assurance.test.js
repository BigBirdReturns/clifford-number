import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  classifyPreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceWorld,
  compilePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture,
  preferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixtureSnapshot,
  validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceBuild,
  validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture
} from '../tools/lib/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs';

const fixturePath = 'data/research/preference-custody/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.fixture.json';
const buildPath = 'build/research/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const fixture = load(fixturePath);
const compiled = compilePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(fixture);
mkdirSync('build/research', { recursive: true });
writeFileSync(buildPath, JSON.stringify(compiled, null, 2) + '\n');
const build = load(buildPath);

assert.deepEqual(validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceBuild(build, fixture), []);
assert.deepEqual(compiled, build);
assert.equal(preferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixtureSnapshot(fixture), '1a3b739ea5af31fe19c98bd9b17c111cb5c4ca97f1ebfa66bef383407190ef1e');
assert.equal(build.world_count, 8);
assert.equal(build.complete_assurance_world_count, 1);
assert.equal(build.public_signature_count, 1);
assert.equal(build.owner_profile_governance_signature_count, 8);
assert.equal(build.metrics.unsupported_owner_profile_decisions, 700);
assert.equal(build.metrics.binding_public_authority_worlds, 0);

const complete = fixture.worlds[0];
assert.equal(classifyPreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceWorld(complete).complete_repository_owner_profile_api_account_state_suspension_assurance, true);
for (const safeguard of ["assurance_current","approved_login_lineage_current","approved_location_lineage_current","approved_owner_type_lineage_current","approved_account_state_lineage_current","approved_metadata_lineage_current","approved_continuity_lineage_current","approved_policy_lineage_current","approved_correction_lineage_current","approved_release_lineage_current","approved_use_lineage_current","login_invalidation_defined","location_invalidation_defined","owner_type_invalidation_defined","account_state_invalidation_defined","metadata_invalidation_defined","continuity_invalidation_defined","policy_invalidation_defined","quarantine_defined","correction_defined","rollback_defined","rereview_defined","republication_defined","appeal_defined","durability_defined"]) {
  const candidate = clone(complete);
  candidate.lineage[safeguard] = false;
  const flags = classifyPreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceWorld(candidate);
  assert.equal(flags.current_owner_profile_lineage, false, `${safeguard} must invalidate current lineage`);
  assert.equal(flags.complete_repository_owner_profile_api_account_state_suspension_assurance, false, `${safeguard} must invalidate complete PC-59 assurance`);
}

const mutateLeaf = value => {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return Number.isInteger(value) ? value + 1 : value + 0.01;
  if (typeof value === 'string') return `${value}__mutation`;
  if (value === null) return 'mutation';
  throw new Error(`unsupported leaf ${typeof value}`);
};
function leaves(value, path = []) {
  if (value === null || typeof value !== 'object') return [{ path, value }];
  const out = [];
  if (Array.isArray(value)) value.forEach((item, index) => out.push(...leaves(item, [...path, index])));
  else Object.entries(value).forEach(([key, item]) => out.push(...leaves(item, [...path, key])));
  return out;
}
function setAt(root, path, value) { let target = root; for (const key of path.slice(0, -1)) target = target[key]; target[path.at(-1)] = value; }
const fixtureRefused = (candidate, label) => assert.ok(validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(candidate).length > 0, label);
const buildRefused = (candidate, label) => assert.ok(validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceBuild(candidate, fixture).length > 0, label);

let fixtureMutationCount = 0;
for (const { path, value } of leaves(fixture)) { const candidate = clone(fixture); setAt(candidate, path, mutateLeaf(value)); fixtureRefused(candidate, `fixture leaf ${path.join('.')}`); fixtureMutationCount += 1; }
assert.ok(fixtureMutationCount >= 700, `expected broad fixture mutation census, observed ${fixtureMutationCount}`);
let buildMutationCount = 0;
const buildLeaves = leaves(build); const stride = Math.max(1, Math.ceil(buildLeaves.length / 110));
for (let index = 0; index < buildLeaves.length; index += stride) { const { path, value } = buildLeaves[index]; const candidate = clone(build); setAt(candidate, path, mutateLeaf(value)); buildRefused(candidate, `build leaf ${path.join('.')}`); buildMutationCount += 1; }
assert.ok(buildMutationCount >= 95, `expected bounded build tamper coverage, observed ${buildMutationCount}`);

for (const malformed of [null, 0, 'invalid', false, []]) {
  assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(malformed)); fixtureRefused(malformed, `malformed fixture ${String(malformed)}`);
  assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceBuild(malformed, fixture)); buildRefused(malformed, `malformed build ${String(malformed)}`);
}
for (const field of ['baseline','interpretation_contract','expected_classification']) for (const replacement of [null, 0, []]) { const candidate = clone(fixture); candidate[field] = replacement; assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(candidate)); fixtureRefused(candidate, `malformed ${field}`); }
for (const field of ['required_refusal_rules','worlds']) for (const replacement of [null, 0, {}]) { const candidate = clone(fixture); candidate[field] = replacement; assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(candidate)); fixtureRefused(candidate, `malformed ${field}`); }

const namedFixture = clone(fixture); namedFixture.worlds.unapproved = true; fixtureRefused(namedFixture, 'named fixture array property');
const symbolFixture = clone(fixture); symbolFixture.worlds[Symbol('unapproved')] = true; fixtureRefused(symbolFixture, 'symbol fixture array property');
const hugeSparseFixture = clone(fixture); hugeSparseFixture.worlds.length = 2 ** 32 - 1; fixtureRefused(hugeSparseFixture, 'huge sparse fixture array');
const aliasFixture = clone(fixture); aliasFixture.worlds[1].owner_identity = aliasFixture.worlds[0].owner_identity; fixtureRefused(aliasFixture, 'repeated fixture identity');
const cycleFixture = clone(fixture); cycleFixture.worlds[0].owner_identity.loop = cycleFixture.worlds[0].owner_identity; fixtureRefused(cycleFixture, 'fixture cycle');
const accessorFixture = clone(fixture); Object.defineProperty(accessorFixture.baseline, 'operative_release', { enumerable: true, get() { return 'RELEASE-INCIDENT-V1@1'; } }); fixtureRefused(accessorFixture, 'fixture accessor');
const hiddenFixture = clone(fixture); Object.defineProperty(hiddenFixture.baseline, 'unapproved', { enumerable: false, value: true }); fixtureRefused(hiddenFixture, 'non-enumerable fixture property');
const prototypeFixture = clone(fixture); Object.setPrototypeOf(prototypeFixture.baseline, { custom: true }); fixtureRefused(prototypeFixture, 'custom fixture prototype');
const proxyFixture = clone(fixture); proxyFixture.baseline = new Proxy(proxyFixture.baseline, {}); fixtureRefused(proxyFixture, 'proxy fixture');
function exoticRecord(source, make) { const exotic = make(); Object.setPrototypeOf(exotic, Object.prototype); Object.assign(exotic, source); return exotic; }
const dateFixture = clone(fixture); dateFixture.baseline = exoticRecord(dateFixture.baseline, () => new Date(0)); fixtureRefused(dateFixture, 'Date-backed fixture record');
const mapBuild = clone(build); mapBuild.worlds[0].flags = exoticRecord(mapBuild.worlds[0].flags, () => new Map()); buildRefused(mapBuild, 'Map-backed build record');
const negativeZeroFixture = clone(fixture); negativeZeroFixture.worlds[1].owner_identity.login_normalization_alias_substitutions = -0; fixtureRefused(negativeZeroFixture, 'negative-zero fixture burden');
const namedBuild = clone(build); namedBuild.worlds.unapproved = true; buildRefused(namedBuild, 'named build array property');
const tamperedChain = clone(build); tamperedChain.custody_chain[1].previous_event_sha256 = '0'.repeat(64); buildRefused(tamperedChain, 'custody chain predecessor tamper');

const temp = mkdtempSync(join(tmpdir(), 'pc59-null-fixture-'));
try {
  const nullPath = join(temp, 'null.json'); writeFileSync(nullPath, 'null\n');
  const compileCli = spawnSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs', nullPath, join(temp, 'out.json'), join(temp, 'out.md')], { encoding: 'utf8' });
  assert.equal(compileCli.status, 1); assert.match(`${compileCli.stdout}\n${compileCli.stderr}`, /PC-59 fixture must be an object/);
  const validateCli = spawnSync(process.execPath, ['tools/validate-preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs', nullPath, join(temp, 'missing.json')], { encoding: 'utf8' });
  assert.equal(validateCli.status, 1); assert.match(`${validateCli.stdout}\n${validateCli.stderr}`, /PC-59 fixture must be an object/); assert.doesNotMatch(`${validateCli.stdout}\n${validateCli.stderr}`, /ENOENT|TypeError/);
} finally { rmSync(temp, { recursive: true, force: true }); }

console.log(`validated PC-59 standalone fixture with ${fixtureMutationCount} fixture mutations and ${buildMutationCount} build tamper checks`);
