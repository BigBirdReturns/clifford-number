import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { compileFixture, validateBuild, validateCanonicalJsonValue, validateFixture } from '../tools/lib/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.mjs';

const path = 'data/research/preference-custody/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.fixture.json';
const fixture = JSON.parse(readFileSync(path, 'utf8'));
assert.deepEqual(validateFixture(fixture), []);
const build = compileFixture(fixture);
assert.deepEqual(validateBuild(build, fixture), []);
mkdirSync('build/research', { recursive: true });
writeFileSync('build/research/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.json', JSON.stringify(build, null, 2) + '\n');

const clone = value => structuredClone(value);
const rejects = [];
function bad(label, mutate) {
  const candidate = clone(fixture);
  mutate(candidate);
  const errors = validateFixture(candidate);
  assert.ok(errors.length, `${label} should be rejected`);
  rejects.push(label);
}

bad('root key', value => { value.extra = true; });
bad('issue', value => { value.issue += 1; });
bad('date', value => { value.captured_at = '2026-02-30'; });
bad('status', value => { value.status = 'verified'; });
bad('graph', value => { value.graph_effect = 'edge'; });
bad('baseline', value => { value.baseline.public_owner_collision_status = 'verified'; });
bad('refusal', value => { value.required_refusal_rules.pop(); });
bad('world denominator', value => { value.worlds.pop(); });
bad('world duplicate', value => { value.worlds[1].world_id = value.worlds[0].world_id; });
bad('description', value => { value.worlds[0].description = 'changed'; });
bad('mechanism', value => { value.worlds[0].expected_mechanism = 'other'; });
bad('normalization boolean', value => { value.worlds[0].normalization_profile.normalization_form_bound = false; });
bad('normalization count', value => { value.worlds[1].normalization_profile.normalization_form_unicode_version_substitutions = 99; });
bad('implementation boolean', value => { value.worlds[0].implementation_conformance.normalization_idempotence_checked = false; });
bad('implementation count', value => { value.worlds[2].implementation_conformance.normalization_implementation_conformance_gaps = 89; });
bad('casefold boolean', value => { value.worlds[0].casefold_locale.locale_tailoring_table_bound = false; });
bad('casefold count', value => { value.worlds[3].casefold_locale.casefold_locale_tailoring_substitutions = 79; });
bad('script boolean', value => { value.worlds[0].script_policy.script_extensions_inventory_bound = false; });
bad('script count', value => { value.worlds[4].script_policy.script_inventory_mixed_script_gaps = 69; });
bad('confusable boolean', value => { value.worlds[0].confusable_mapping.skeleton_mapping_table_bound = false; });
bad('confusable count', value => { value.worlds[5].confusable_mapping.confusable_skeleton_substitutions = 59; });
bad('collision boolean', value => { value.worlds[0].collision_adjudication.collision_appeal_process_bound = false; });
bad('collision candidate count', value => { value.worlds[6].collision_adjudication.collision_candidate_set_gaps = 49; });
bad('collision appeal count', value => { value.worlds[6].collision_adjudication.collision_adjudication_appeal_gaps = 39; });
bad('unreconciled count', value => { value.worlds[6].lineage.unreconciled_normalization_collision_decisions = 39; });
bad('stale count', value => { value.worlds[7].lineage.stale_normalization_collision_decisions = 99; });
bad('unsupported total', value => { value.worlds[7].lineage.unsupported_normalization_collision_decisions = 99; });
bad('flag', value => { value.worlds[0].expected_flags.complete_confusable_mapping = false; });
bad('authority', value => { value.worlds[0].lineage.binding_public_authority = true; });
bad('negative zero', value => { value.worlds[0].normalization_profile.normalization_form_unicode_version_substitutions = -0; });
bad('nonfinite', value => { value.worlds[0].normalization_profile.normalization_form_unicode_version_substitutions = Infinity; });
bad('custom prototype', value => { Object.setPrototypeOf(value.worlds[0].confusable_mapping, {}); });
bad('repeated identity', value => { value.worlds[1].normalization_profile = value.worlds[0].normalization_profile; });
bad('sparse array', value => { delete value.worlds[1]; });
bad('named array key', value => { value.worlds.extra = 'x'; });
bad('accessor property', value => { Object.defineProperty(value.worlds[0], 'description', { get: () => 'x', enumerable: true }); });
bad('non-enumerable property', value => { Object.defineProperty(value.worlds[0], 'hidden', { value: true, enumerable: false }); });

const disguisedNodeExotics = [
  ['arguments', () => (function () { return arguments; })(1)],
  ['array buffer', () => new ArrayBuffer(8)],
  ['shared array buffer', () => new SharedArrayBuffer(8)],
  ['data view', () => new DataView(new ArrayBuffer(8))],
  ['typed array', () => new Uint8Array(0)],
  ['date', () => new Date(0)],
  ['map', () => new Map()],
  ['set', () => new Set()],
  ['weak map', () => new WeakMap()],
  ['weak set', () => new WeakSet()],
  ['map iterator', () => new Map().entries()],
  ['set iterator', () => new Set().values()],
  ['regular expression', () => /pc62/],
  ['native error', () => new Error('pc62')],
  ['promise', () => Promise.resolve('pc62')],
  ['boxed primitive', () => Object('pc62')]
];
for (const [label, factory] of disguisedNodeExotics) {
  const value = factory();
  Object.setPrototypeOf(value, Object.prototype);
  const errors = validateCanonicalJsonValue(value, `disguised ${label}`, []);
  assert.ok(errors.some(error => error.includes('Node exotic brand')), `${label} internal brand should be rejected`);
  rejects.push(`disguised ${label}`);
}

const disguisedWebExotics = [
  ['URL', () => new URL('https://example.test/pc62')],
  ['URLSearchParams', () => new URLSearchParams('pc62=1')],
  ['Headers', () => new Headers([['x-pc62', '1']])],
  ['FormData', () => {
    const value = new FormData();
    value.append('pc62', '1');
    return value;
  }]
];
for (const [label, factory] of disguisedWebExotics) {
  const candidate = clone(fixture);
  const value = factory();
  Object.setPrototypeOf(value, Object.prototype);
  Object.assign(value, candidate.worlds[0]);
  candidate.worlds[0] = value;
  const errors = validateFixture(candidate);
  assert.ok(errors.some(error => error.includes(`Web exotic brand ${label}`)), `${label} internal brand should be rejected through the complete fixture path`);
  assert.equal(Object.getPrototypeOf(value), Object.prototype, `${label} probe should restore the caller-visible prototype`);
  rejects.push(`disguised ${label}`);
}

for (const [label, factory] of disguisedWebExotics.filter(([name]) => name === 'Headers' || name === 'FormData')) {
  const candidate = clone(fixture);
  const value = factory();
  Object.setPrototypeOf(value, Object.prototype);
  Object.assign(value, candidate.worlds[0]);
  Object.preventExtensions(value);
  candidate.worlds[0] = value;
  const errors = validateFixture(candidate);
  assert.ok(errors.some(error => error.includes('extensible canonical JSON container')), `non-extensible ${label} should be rejected before plain-object admission`);
  assert.equal(Object.getPrototypeOf(value), Object.prototype, `non-extensible ${label} should retain its caller-visible prototype`);
  rejects.push(`non-extensible disguised ${label}`);
}

for (const [label, malformed] of [['null world', null], ['scalar world', 'pc62']]) {
  const candidate = clone(fixture);
  candidate.worlds[0] = malformed;
  let errors;
  assert.doesNotThrow(() => { errors = validateFixture(candidate); }, `${label} should return a rejection ledger rather than throw`);
  assert.ok(errors.some(error => error.includes('world 0 must be a plain object')), `${label} should be rejected as a malformed world shape`);
  rejects.push(label);
}

function badBuild(label, mutate) {
  const candidate = clone(build);
  mutate(candidate);
  const errors = validateBuild(candidate, fixture);
  assert.ok(errors.length, `${label} build should be rejected`);
}
badBuild('metric', value => { value.metrics.collision_adjudication_appeal_gaps += 1; });
badBuild('world', value => { value.worlds[0].flags.complete_collision_adjudication = false; });
badBuild('custody', value => { value.custody_chain[2].event = 'changed'; });
badBuild('fixture hash', value => { value.fixture_snapshot_sha256 = '0'.repeat(64); });
badBuild('authority build', value => { value.graph_effect = 'edge'; });
badBuild('public signature', value => { value.worlds[1].public_signature_sha256 = '0'.repeat(64); });
{
  const candidate = clone(build);
  candidate.worlds[0] = null;
  let errors;
  assert.doesNotThrow(() => { errors = validateBuild(candidate, fixture); }, 'null build world should return a rejection ledger rather than throw');
  assert.ok(errors.some(error => error.includes('PC-62 build world 0 must be a plain object')), 'null build world should be rejected as a malformed build-world shape');
  rejects.push('null build world');
}

console.log(`PC-62 fixture mutations rejected: ${rejects.length}`);
console.log('preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.test.js: OK');
