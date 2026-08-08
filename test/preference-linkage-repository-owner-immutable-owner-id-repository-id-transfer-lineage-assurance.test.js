import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  classifyPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceWorld,
  compilePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture,
  preferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixtureSnapshot,
  validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceBuild,
  validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture
} from '../tools/lib/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs';

const fixturePath = 'data/research/preference-custody/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.fixture.json';
const buildPath = 'build/research/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const clone = value => structuredClone(value);
const fixture = load(fixturePath);
const compiled = compilePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture);
mkdirSync('build/research', { recursive: true });
writeFileSync(buildPath, JSON.stringify(compiled, null, 2) + '\n');
const build = load(buildPath);
assert.deepEqual(validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceBuild(build, fixture), []);
assert.deepEqual(compiled, build);
assert.equal(preferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixtureSnapshot(fixture), "85cdec50e64b699ee3439ba5ea5c4b669639b74eb045f5ab2080cd07b5433b29");
assert.equal(build.world_count, 8);
assert.equal(build.complete_assurance_world_count, 1);
assert.equal(build.public_signature_count, 1);
assert.equal(build.repository_transfer_governance_signature_count, 8);
assert.equal(build.metrics.unsupported_repository_transfer_decisions, 700);
assert.equal(build.metrics.binding_public_authority_worlds, 0);

const lifecycleSafeguards = Object.freeze(["default_branch_identity_continuity_bound","tag_release_binding_continuity_bound","review_time_commit_reachability_bound","advertised_object_presence_bound","protection_policy_identity_bound","assurance_current","approved_owner_identity_lineage_current","approved_repository_identity_lineage_current","approved_transfer_lineage_current","approved_namespace_lineage_current","approved_continuity_lineage_current","approved_policy_lineage_current","approved_correction_lineage_current","approved_release_lineage_current","approved_use_lineage_current","owner_identity_invalidation_defined","repository_identity_invalidation_defined","transfer_invalidation_defined","namespace_invalidation_defined","continuity_invalidation_defined","policy_invalidation_defined","quarantine_defined","correction_defined","rollback_defined","rereview_defined","republication_defined","appeal_defined","durability_defined"]);
for (const safeguard of lifecycleSafeguards) {
  const candidate = clone(fixture.worlds[0]);
  candidate.lineage[safeguard] = false;
  const candidateFlags = classifyPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceWorld(candidate);
  assert.equal(candidateFlags.current_repository_transfer_lineage, false, `${safeguard} must invalidate current transfer lineage`);
  assert.equal(candidateFlags["complete_repository_owner_id_transfer_lineage_assurance"], false, `${safeguard} must invalidate complete PC-57 assurance`);
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
const fixtureRefused = (candidate, label) => assert.ok(validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(candidate).length > 0, label);
const buildRefused = (candidate, label) => assert.ok(validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceBuild(candidate, fixture).length > 0, label);
let fixtureMutationCount = 0;
for (const { path, value } of leaves(fixture)) { const candidate = clone(fixture); setAt(candidate, path, mutateLeaf(value)); fixtureRefused(candidate, `fixture leaf ${path.join('.')}`); fixtureMutationCount += 1; }
assert.ok(fixtureMutationCount >= 700, `expected broad fixture mutation census, observed ${fixtureMutationCount}`);
let buildMutationCount = 0;
const buildLeaves = leaves(build);
const stride = Math.max(1, Math.ceil(buildLeaves.length / 110));
for (let index = 0; index < buildLeaves.length; index += stride) { const { path, value } = buildLeaves[index]; const candidate = clone(build); setAt(candidate, path, mutateLeaf(value)); buildRefused(candidate, `build leaf ${path.join('.')}`); buildMutationCount += 1; }
assert.ok(buildMutationCount >= 90, `expected bounded build tamper coverage, observed ${buildMutationCount}`);

for (const malformed of [null, 0, 'invalid', false, []]) {
  assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(malformed)); fixtureRefused(malformed, `malformed fixture ${String(malformed)}`);
  assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceBuild(malformed, fixture)); buildRefused(malformed, `malformed build ${String(malformed)}`);
}
for (const field of ['baseline','interpretation_contract','expected_classification']) for (const replacement of [null, 0, []]) { const candidate = clone(fixture); candidate[field] = replacement; assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(candidate)); fixtureRefused(candidate, `malformed ${field}`); }
for (const field of ['required_refusal_rules','worlds']) for (const replacement of [null, 0, {}]) { const candidate = clone(fixture); candidate[field] = replacement; assert.doesNotThrow(() => validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(candidate)); fixtureRefused(candidate, `malformed ${field}`); }

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
const dateFixture = clone(fixture); dateFixture.baseline = exoticRecord(dateFixture.baseline, () => new Date(0)); fixtureRefused(dateFixture, 'Date-backed fixture record with reset prototype');
const mapBuild = clone(build); mapBuild.worlds[0].flags = exoticRecord(mapBuild.worlds[0].flags, () => new Map()); buildRefused(mapBuild, 'Map-backed build record with reset prototype');
const negativeZeroFixture = clone(fixture); negativeZeroFixture.worlds[1].owner_identity.owner_login_or_immutable_owner_id_substitutions = -0; fixtureRefused(negativeZeroFixture, 'negative-zero fixture burden');
const namedBuild = clone(build); namedBuild.worlds.unapproved = true; buildRefused(namedBuild, 'named build array property');
const tamperedChain = clone(build); tamperedChain.custody_chain[1].previous_event_sha256 = '0'.repeat(64); buildRefused(tamperedChain, 'custody chain predecessor tamper');

const redistributed = clone(fixture);
redistributed.worlds[1].owner_identity.owner_login_or_immutable_owner_id_substitutions -= 1;
redistributed.worlds[2].owner_identity.owner_login_or_immutable_owner_id_substitutions += 1;
fixtureRefused(redistributed, 'aggregate-preserving burden redistribution');
const partial = clone(fixture);
partial.worlds[1].owner_identity.owner_type_bound = true;
partial.worlds[1].expected_flags.complete_owner_identity = false;
fixtureRefused(partial, 'partial state mutation preserving coarse classification');

const temp = mkdtempSync(join(tmpdir(), 'pc57-null-fixture-'));
try {
  const nullPath = join(temp, 'null.json'); writeFileSync(nullPath, 'null\n');
  const compileCli = spawnSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs', nullPath, join(temp, 'out.json'), join(temp, 'out.md')], { encoding: 'utf8' });
  assert.equal(compileCli.status, 1); assert.match(`${compileCli.stdout}\n${compileCli.stderr}`, /PC-57 fixture must be an object/);
  const validateCli = spawnSync(process.execPath, ['tools/validate-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs', nullPath, join(temp, 'missing.json')], { encoding: 'utf8' });
  assert.equal(validateCli.status, 1); assert.match(`${validateCli.stdout}\n${validateCli.stderr}`, /PC-57 fixture must be an object/); assert.doesNotMatch(`${validateCli.stdout}\n${validateCli.stderr}`, /ENOENT|TypeError/);
} finally { rmSync(temp, { recursive: true, force: true }); }
console.log(`validated PC-57 standalone fixture with ${fixtureMutationCount} fixture mutations and ${buildMutationCount} build tamper checks`);
