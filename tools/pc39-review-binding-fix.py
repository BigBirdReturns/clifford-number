#!/usr/bin/env python3
from pathlib import Path
import os
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: pc39-review-binding-fix.py <repository-root>')
os.chdir(sys.argv[1])


def replace_once(path_name: str, old: str, new: str) -> None:
    path = Path(path_name)
    source = path.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path_name}: expected one replacement target, found {count}')
    path.write_text(source.replace(old, new))


standalone_lib = 'tools/lib/preference-record-linkage-temporal-succession-assurance.mjs'
replace_once(
    standalone_lib,
    'export function validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build) {',
    'export function validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build, fixture) {'
)
replace_once(
    standalone_lib,
    "  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');",
    """  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }"""
)

standalone_validator = 'tools/validate-preference-record-linkage-temporal-succession-assurance.mjs'
replace_once(
    standalone_validator,
    '  ...validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build)',
    '  ...validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build, fixture)'
)

standalone_test = 'test/preference-record-linkage-temporal-succession-assurance.test.js'
replace_once(
    standalone_test,
    'assert.deepEqual(validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build), []);',
    'assert.deepEqual(validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build, fixture), []);'
)
replace_once(
    standalone_test,
    """for (const [label, mutate] of mutations) {
  const value = clone(fixture);
  mutate(value);
  assert.ok(validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(value).length > 0, label);
}

const buildTamperCases = [""",
    """for (const [label, mutate] of mutations) {
  const value = clone(fixture);
  mutate(value);
  assert.ok(validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(value).length > 0, label);
}

const validFixtureRevision = clone(fixture);
validFixtureRevision.worlds[0].description = `${validFixtureRevision.worlds[0].description} Revised without rebuilding.`;
assert.deepEqual(validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(validFixtureRevision), []);
assert.ok(
  validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build, validFixtureRevision).some(error =>
    error.includes('fixture hash') || error.includes('deterministically reconstruct')
  ),
  'stale build must not validate against a different valid fixture revision'
);

const buildTamperCases = ["""
)
replace_once(
    standalone_test,
    'assert.ok(validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(value).length > 0, label);',
    'assert.ok(validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(value, fixture).length > 0, label);'
)
replace_once(
    standalone_test,
    "console.log('Preference record-linkage temporal-succession assurance adversarial tests: PASS (40 fixture mutations plus build tamper checks)');",
    "console.log('Preference record-linkage temporal-succession assurance adversarial tests: PASS (40 fixture mutations plus source-binding and build tamper checks)');"
)

floor_lib = 'tools/lib/preference-custody-manifest-v37.mjs'
replace_once(
    floor_lib,
    'export function compilePreferenceCustodyManifestV37(manifest, baseBuild, linkageBuild) {',
    'export function compilePreferenceCustodyManifestV37(manifest, baseBuild, linkageBuild, linkageFixture) {'
)
replace_once(
    floor_lib,
    '  const linkageErrors = validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(linkageBuild);',
    '  const linkageErrors = validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(linkageBuild, linkageFixture);'
)
replace_once(
    floor_lib,
    """  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v37 invalid hash: ${key}`);""",
    """  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v37 invalid hash: ${key}`);
  const compiledBaseControls = array(compiled?.controls).slice(0, 38);
  if (composition.base_controls_sha256 !== sha256(compiledBaseControls)) errors.push('compiled v37 base controls hash mismatch');
  const compiledBaseRequirements = unique(array(compiled?.promotion_boundary?.real_case_requires).slice(0, 1389));
  if (composition.base_promotion_requirements_sha256 !== sha256(compiledBaseRequirements)) errors.push('compiled v37 base promotion requirements hash mismatch');"""
)

floor_compiler = 'tools/compile-preference-custody-manifest-v37.mjs'
replace_once(
    floor_compiler,
    """const linkageBuild = JSON.parse(readFileSync('build/research/preference-record-linkage-temporal-succession-assurance.json', 'utf8'));
const compiled = compilePreferenceCustodyManifestV37(manifest, baseBuild, linkageBuild);""",
    """const linkageBuild = JSON.parse(readFileSync('build/research/preference-record-linkage-temporal-succession-assurance.json', 'utf8'));
const linkageFixture = JSON.parse(readFileSync(manifest.extension_control.source_fixture_path, 'utf8'));
const compiled = compilePreferenceCustodyManifestV37(manifest, baseBuild, linkageBuild, linkageFixture);"""
)

floor_test = 'test/preference-custody-manifest-v37.test.js'
replace_once(
    floor_test,
    """  ['build controls', value => { value.controls.pop(); }],
  ['composition base id', value => { value.composition.base_manifest_id = 'invalid'; }],""",
    """  ['build controls', value => { value.controls.pop(); }],
  ['preserved base-control body', value => { value.controls[0].failure_class = 'tampered'; }],
  ['composition base id', value => { value.composition.base_manifest_id = 'invalid'; }],"""
)
replace_once(
    floor_test,
    'assert.equal(manifestMutations.length + buildMutations.length, 41);',
    'assert.equal(manifestMutations.length + buildMutations.length, 42);'
)
replace_once(
    floor_test,
    "console.log('Preference custody floor v37 adversarial tests: PASS (41 mutations)');",
    "console.log('Preference custody floor v37 adversarial tests: PASS (42 mutations)');"
)

print('PC-39 review checksum-binding patches applied')
