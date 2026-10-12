import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computePayloadDigest, isSafePublicationPath, matchesHeldRule, validateArtifactPathSet, validatePublicationPolicy } from '../tools/lib/publication-allowlist.mjs';

const base = {
  schema_version: 'clifford-publication-allowlist@1',
  paths: ['.nojekyll', 'data/project/publication-allowlist.json', 'deployment-sha.txt', 'index.html', 'release-artifact-manifest.json'],
  generated_paths: {
    '.nojekyll': 'build-pages',
    'deployment-sha.txt': 'finalize-release-artifact',
    'release-artifact-manifest.json': 'finalize-release-artifact'
  },
  source_overrides: {},
  held_exact_paths: [],
  held_rules: [{ kind: 'prefix', value: 'reports/transport/' }, { kind: 'substring', value: 'poof' }],
  performance_budgets: {
    max_files: 10,
    max_total_bytes: 1000,
    max_single_file_bytes: 500,
    max_initial_shell_bytes: 500,
    max_standalone_bytes: 500,
    initial_shell_paths: ['index.html']
  }
};
assert.equal(isSafePublicationPath('build/cases/index.json'), true);
for (const value of ['', '../escape', '/absolute', 'a/../b', 'a\\b', 'dir/']) assert.equal(isSafePublicationPath(value), false, value);
assert.equal(matchesHeldRule('reports/transport/a.json', { kind: 'prefix', value: 'reports/transport/' }), true);
assert.equal(matchesHeldRule('docs/poof-law.md', { kind: 'substring', value: 'poof' }), true);
assert.doesNotThrow(() => validatePublicationPolicy(base));
assert.throws(() => validatePublicationPolicy({ ...base, paths: [...base.paths, '../escape'].sort() }), /unsafe publication path/u);
assert.throws(() => validatePublicationPolicy({ ...base, paths: [...base.paths, 'reports/transport/a.json'].sort() }), /held rule/u);
assert.throws(() => validateArtifactPathSet(base, base.paths.filter(path => path !== 'index.html')), /missing=.*index\.html/u);
assert.throws(() => validateArtifactPathSet(base, [...base.paths, 'extra.txt'].sort()), /extra=.*extra\.txt/u);
assert.equal(computePayloadDigest([{ path: 'a', bytes: 1, sha256: '0'.repeat(64) }]).length, 64);

// The recovered-research archive and the retrospective capture are held in the real policy:
// they can never be allowlisted, so they can never reach the Pages artifact.
const realPolicy = JSON.parse(fs.readFileSync('data/project/publication-allowlist.json', 'utf8'));
for (const prefix of ['archive/', 'retrospective/']) {
  const rule = realPolicy.held_rules.find(candidate => candidate.kind === 'prefix' && candidate.value === prefix);
  assert.ok(rule, `real publication policy must hold ${prefix}`);
  assert.equal(matchesHeldRule(`${prefix}README.md`, rule), true);
  assert.equal(matchesHeldRule(`${prefix}nested/deeper/file.json`, rule), true);
  assert.throws(() => validatePublicationPolicy({ ...realPolicy, paths: [...realPolicy.paths, `${prefix}README.md`].sort() }), /held rule/u, `${prefix} must not be allowlistable`);
  assert.equal(realPolicy.paths.some(candidate => candidate.startsWith(prefix)), false, `${prefix} must not be published`);
}
assert.doesNotThrow(() => validatePublicationPolicy(realPolicy));
console.log('publication-allowlist.test: OK (safe paths, holds, exact set and deterministic digest)');
