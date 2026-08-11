import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compileManifest, loadPreferenceCustodyV59SourceBundle, validateBuild, validateManifest } from '../tools/lib/preference-custody-manifest-v60.mjs';

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const workflowText = readFileSync('.github/workflows/preference-custody-v60.yml', 'utf8');
const pullRequestPathsBlock = workflowText.match(/  pull_request:\n    paths:\n([\s\S]*?)  push:\n/)?.[1];
const pushPathsBlock = workflowText.match(/  push:\n    branches: \[main\]\n    paths:\n([\s\S]*?)\npermissions:\n/)?.[1];
assert.ok(pullRequestPathsBlock, 'floor-v60 workflow should declare pull_request paths');
assert.ok(pushPathsBlock, 'floor-v60 workflow should declare main push paths');
const parseWorkflowPaths = block => [...block.matchAll(/^\s+- '([^']+)'$/gm)].map(match => match[1]);
assert.deepEqual(
  parseWorkflowPaths(pushPathsBlock),
  parseWorkflowPaths(pullRequestPathsBlock),
  'floor-v60 push paths should exactly mirror pull_request paths so PC-62 dependency-only pushes validate the composed floor',
);

if (!existsSync('build/research/preference-custody-laboratory-floor-v59.json')) {
  execFileSync(process.execPath, ['test/preference-custody-manifest-v59.test.js'], { stdio: 'inherit' });
}
if (!existsSync('build/research/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.json')) {
  execFileSync(process.execPath, ['tools/compile-preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.mjs'], { stdio: 'inherit' });
}
const manifest = load('data/research/preference-custody/control-manifest-v60.json');
const baseBuild = load('build/research/preference-custody-laboratory-floor-v59.json');
const targetBuild = load('build/research/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = loadPreferenceCustodyV59SourceBundle(load);
assert.deepEqual(validateManifest(manifest), []);
const build = compileManifest(manifest, baseBuild, targetBuild, targetFixture, baseSources);
assert.deepEqual(validateBuild(build, manifest, baseBuild, targetBuild, targetFixture, baseSources), []);
mkdirSync('build/research', { recursive: true });
writeFileSync('build/research/preference-custody-laboratory-floor-v60.json', JSON.stringify(build, null, 2) + '\n');

const clone = value => structuredClone(value);
function badManifest(label, mutate) {
  const candidate = clone(manifest);
  mutate(candidate);
  assert.ok(validateManifest(candidate).length, `${label} should reject manifest`);
}
badManifest('date', value => { value.captured_at = '2026-02-30'; });
badManifest('issue', value => { value.control_issue += 1; });
badManifest('requirements', value => { value.real_case_requirements_added.pop(); });
badManifest('resolved', value => { value.frontier_transition.resolved_base_frontier = 'wrong'; });
badManifest('successor', value => { value.frontier_transition.successor_frontiers.pop(); });
badManifest('alias preserve', value => { value.preserved_alias_namespace_frontier = 'wrong'; });
badManifest('profile preserve', value => { value.preserved_profile_api_frontier = 'wrong'; });
badManifest('account preserve', value => { value.preserved_account_frontier = 'wrong'; });
badManifest('refusal', value => { value.extension_control.required_refusal_rules.pop(); });
badManifest('authority', value => { value.graph_effect = 'edge'; });

function badInputs(label, base, target, fixture, sources) {
  let threw = false;
  try {
    compileManifest(manifest, base, target, fixture, sources);
  } catch {
    threw = true;
  }
  assert.ok(threw, `${label} should reject input`);
}
let candidate = clone(baseBuild);
candidate.control_count = 60;
badInputs('base count', candidate, targetBuild, targetFixture, baseSources);
candidate = clone(targetBuild);
candidate.metrics.worlds = 7;
badInputs('target build', baseBuild, candidate, targetFixture, baseSources);
candidate = clone(targetFixture);
candidate.worlds[0].description = 'changed';
badInputs('target fixture', baseBuild, targetBuild, candidate, baseSources);
candidate = clone(baseSources);
candidate.manifest.captured_at = '2026-08-11';
badInputs('postdated source', baseBuild, targetBuild, targetFixture, candidate);

function badBuild(label, mutate) {
  const candidateBuild = clone(build);
  mutate(candidateBuild);
  assert.ok(validateBuild(candidateBuild, manifest, baseBuild, targetBuild, targetFixture, baseSources).length, `${label} should reject build`);
}
badBuild('control count', value => { value.control_count = 61; });
badBuild('promotion', value => { value.promotion_boundary.promotion_requirement_count = 2647; });
badBuild('frontier retained', value => { value.open_frontiers.push('linkage_interval_repository_owner_login_unicode_normalization_algorithm_casefold_locale_confusable_skeleton_and_collision_adjudication_governance'); });
badBuild('alias dropped', value => { value.open_frontiers = value.open_frontiers.filter(frontier => frontier !== 'linkage_interval_repository_owner_login_alias_validity_rename_redirect_recycled_reserved_namespace_and_identity_reuse_governance'); });
badBuild('profile dropped', value => { value.open_frontiers = value.open_frontiers.filter(frontier => frontier !== 'linkage_interval_repository_owner_profile_api_url_canonicalization_redirect_endpoint_version_pairing_and_observation_time_governance'); });
badBuild('integrity', value => { value.control_integrity.base_integrity_preserved = false; });
badBuild('custody', value => { value.custody_chain[1].event = 'changed'; });
badBuild('extension', value => { value.controls.at(-1).control_id = 'PC-61'; });

console.log('preference-custody-manifest-v60.test.js: OK');
