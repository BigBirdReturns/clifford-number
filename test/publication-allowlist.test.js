import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { computeArtifactEntries, computePayloadDigest, isSafePublicationPath, matchesHeldRule, scanArtifactText, validateArtifactPathSet, validatePublicationPolicy } from '../tools/lib/publication-allowlist.mjs';

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
// Owner decision 2026-10-23: one intake subtree is released from the data/intake/ hold; the rest stays held.
const intakeRule = realPolicy.held_rules.find(candidate => candidate.kind === 'prefix' && candidate.value === 'data/intake/');
assert.equal(intakeRule.except_prefixes, undefined, 'data/intake stays fully held (derived LinkedIn files moved under receipts/, 2026-10-23)');
assert.equal(matchesHeldRule('receipts/linkedin-profile-captures/derived/linkedin-role-crossing-summary.json', intakeRule), false);
assert.equal(matchesHeldRule('data/intake/linkedin-targeted-review/other.json', intakeRule), true);
assert.equal(matchesHeldRule('data/intake/defense-corridor/x.json', intakeRule), true);
assert.ok(realPolicy.policy_changes.every(change => change.date && change.decided_by && change.reason), 'every policy change says when, who and why');
// Per-path budgets must name allowlisted paths; the explorer standalone and the endpoint carry their own.
// 2026-10-23 final re-pin (owner decision, research digs): endpoint 10,000,000 -> 12,000,000, main standalone
// 5,000,000 -> 8,000,000, max_files 3,200 -> 4,000. The budgets guard accidental growth, not the size of the record.
// 2026-11-10 one-pass entry of official records (owner decision, "Yes, one pass"): endpoint 12,000,000 -> 14,000,000,
// explorer standalone 16,000,000 -> 20,000,000, max_single_file_bytes 16,000,000 -> 20,000,000 (measured 12,255,884 and 17,128,704).
// 2026-11-10 Form D data sets (owner answer "Yes, fetch them"): endpoint 14,000,000 -> 18,000,000, explorer standalone
// and max_single_file_bytes 20,000,000 -> 24,000,000, main standalone 8,000,000 -> 11,000,000, max_files 4,000 -> 4,500,
// max_total_bytes 400,000,000 -> 450,000,000 (measured 16,203,703, 21,359,240, 9,675,826, 4,054 files, 400,309,860 bytes).
// 2026-11-10 hand-judged Form D filings (owner answer "All 527"): endpoint 18,000,000 -> 23,000,000, explorer standalone
// and max_single_file_bytes 24,000,000 -> 28,000,000, main standalone 11,000,000 -> 13,000,000, max_files 4,500 -> 5,000
// (measured 20,109,748, 25,449,761, 11,908,094 and 4,570 files; 431,501,726 bytes stays within max_total_bytes).
assert.deepEqual(realPolicy.performance_budgets.max_path_bytes, { 'Clifford-Number-endpoint.html': 23000000, 'Clifford-Number-explorer-standalone.html': 28000000 });
assert.equal(realPolicy.performance_budgets.max_single_file_bytes, 28000000, 'the single-file budget (raised 2026-11-10 from 16,000,000, then from 20,000,000 and 24,000,000)');
// 2026-11-12 UK ministerial meetings (owner answer "Yes, hunt them"): main standalone 13,000,000 -> 15,000,000 and max_total_bytes
// 450,000,000 -> 500,000,000 (measured 13,275,026 and 454,064,931 bytes before finalization).
assert.equal(realPolicy.performance_budgets.max_standalone_bytes, 15000000, 'the main standalone budget (raised 2026-10-23 from 5,000,000, 2026-11-10 from 8,000,000 and 11,000,000, 2026-11-12 from 13,000,000)');
assert.equal(realPolicy.performance_budgets.max_files, 5000, 'the file-count budget (raised 2026-10-23 from 3,200, 2026-11-10 from 4,000 and 4,500)');
assert.equal(realPolicy.performance_budgets.max_total_bytes, 500000000, 'the byte budget (raised 2026-11-10 from 400,000,000, 2026-11-12 from 450,000,000)');
assert.throws(() => validatePublicationPolicy({ ...base, performance_budgets: { ...base.performance_budgets, max_path_bytes: { 'nope.html': 1 } } }), /unlisted path/u);
// The forbidden-text scan covers every file within the single-file budget (2026-11-10 follow-up): the limit
// is the policy's max_single_file_bytes, not a separate 16 MiB constant, so the explorer standalone, now
// above 16 MiB and within the 20,000,000-byte budget, is still scanned. A file of 17 MiB that ends in key
// material is refused under the real budget; the same bytes without it pass; nothing passes without a budget.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publication-scan-'));
  try {
    const size = 17 * 1024 * 1024;
    assert.ok(size > 16 * 1024 * 1024 && size <= realPolicy.performance_budgets.max_single_file_bytes, 'the probe sits between 16 MiB and the single-file budget');
    const marker = Buffer.from('\n-----BEGIN ' + 'PRIVATE KEY-----\n');
    const body = Buffer.alloc(size, 0x61);
    marker.copy(body, size - marker.length);
    fs.writeFileSync(path.join(dir, 'large.html'), body);
    const entries = computeArtifactEntries(dir, ['large.html']);
    assert.throws(() => scanArtifactText(dir, entries, realPolicy.performance_budgets.max_single_file_bytes), /private key material in large\.html/u);
    fs.writeFileSync(path.join(dir, 'large.html'), Buffer.alloc(size, 0x61));
    assert.doesNotThrow(() => scanArtifactText(dir, computeArtifactEntries(dir, ['large.html']), realPolicy.performance_budgets.max_single_file_bytes));
    assert.throws(() => scanArtifactText(dir, entries), /single-file budget/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
console.log('publication-allowlist.test: OK (safe paths, holds, exact set, deterministic digest, text scan up to the single-file budget)');
