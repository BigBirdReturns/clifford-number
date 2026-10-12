import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  checkReceiptContract,
  extractLimitsSection,
  limitsStatus,
  sourceUrlProblems,
  urlProblem,
} from '../tools/lib/receipt-contract.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const validator = path.join(repoRoot, 'tools/validate-receipt-contract.mjs');

// ---------------------------------------------------------------- fixture repo
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-contract-'));
fs.mkdirSync(path.join(fixtureRoot, 'receipts/topology'), { recursive: true });
fs.mkdirSync(path.join(fixtureRoot, 'data/ledger'), { recursive: true });

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
function extract(name, body) {
  fs.writeFileSync(path.join(fixtureRoot, 'receipts/topology', name), body);
  return { path: `receipts/topology/${name}`, hash: `sha256:${sha(body)}` };
}

const withLimitsSection = extract('with-limits-section.md',
  '# Appointment\n\n## Recorded facts\n\nThe appointment was announced on 2026-01-02.\n\n'
  + '## Limits\n\nEstablishes only that the named appointment was announced on the stated date.\n');
const noLimitsAtAll = extract('no-limits.md',
  '# Appointment\n\n## Recorded facts\n\nThe appointment was announced on 2026-01-02.\n');
const emptyLimitsSection = extract('empty-limits.md',
  '# Appointment\n\n## Limits\n\n## Recorded facts\n\nThe appointment was announced on 2026-01-02.\n');
const mismatched = extract('mismatch.md', '# Appointment\n\n## Limits\n\nEstablishes only the stated filing date.\n');

const ROW_LIMITS = 'Establishes only that the filing exists on the stated date; says nothing about its effect.';
const good = (id, e, extra = {}) => ({
  receipt_id: id,
  path: e.path,
  source_url: `https://register.example.org/${id}`,
  archive: { method: 'in_repo_content_hash', ref: e.hash },
  ...extra,
});

const rows = {
  goodSection: good('good-section', withLimitsSection),
  goodRowLimits: good('good-row-limits', noLimitsAtAll, { limits: ROW_LIMITS }),
  missingLimits: good('missing-limits', noLimitsAtAll),
  emptySection: good('empty-section', emptyLimitsSection),
  hashMismatch: {
    ...good('hash-mismatch', mismatched),
    archive: { method: 'in_repo_content_hash', ref: `sha256:${'0'.repeat(64)}` },
  },
  missingFile: {
    ...good('missing-file', withLimitsSection),
    path: 'receipts/topology/does-not-exist.md',
  },
  noSourceUrl: { ...good('no-source-url', withLimitsSection), source_url: undefined },
  badSourceUrl: good('bad-source-url', withLimitsSection, { source_url: 'not a url' }),
  waybackNoLimits: {
    receipt_id: 'wayback-no-limits',
    path: 'https://www.gov.example/page',
    archive: {
      method: 'internet_archive',
      ref: 'http://web.archive.org/web/20260625150104/https://www.gov.example/page',
    },
  },
  waybackWithLimits: {
    receipt_id: 'wayback-with-limits',
    path: 'https://www.gov.example/page',
    archive: {
      method: 'internet_archive',
      ref: 'http://web.archive.org/web/20260625150104/https://www.gov.example/page',
    },
    limits: ROW_LIMITS,
  },
  noArchive: { receipt_id: 'no-archive', path: withLimitsSection.path, source_url: 'https://register.example.org/x', limits: ROW_LIMITS },
  outsideReceipts: (() => {
    fs.mkdirSync(path.join(fixtureRoot, 'elsewhere'), { recursive: true });
    const body = '# x\n\n## Limits\n\nEstablishes only the stated filing date.\n';
    fs.writeFileSync(path.join(fixtureRoot, 'elsewhere/x.md'), body);
    return {
      receipt_id: 'outside-receipts',
      path: 'elsewhere/x.md',
      source_url: 'https://register.example.org/x',
      archive: { method: 'in_repo_content_hash', ref: `sha256:${sha(body)}` },
    };
  })(),
};
for (const row of Object.values(rows)) if (row.source_url === undefined) delete row.source_url;

const check = list => checkReceiptContract(list, { root: fixtureRoot });
const messages = result => result.errors.map(e => `${e.receipt_id}:${e.check}`);

// ---------------------------------------------------------------- unit rules
assert.equal(urlProblem('https://www.gov.uk/government/publications/x'), null);
assert.match(urlProblem('ftp://example.org/x'), /http\(s\)/);
assert.match(urlProblem('https://localhost/x'), /public host/);
assert.match(urlProblem('http://intranet/x'), /public host/);
assert.match(urlProblem('https://example.org/a b'), /whitespace/);
assert.match(urlProblem(''), /empty/);
assert.deepEqual(sourceUrlProblems({ source_url: 'https://a.example.org/x' }), []);
assert.deepEqual(sourceUrlProblems({ path: 'https://a.example.org/x' }), []);
assert.equal(sourceUrlProblems({ path: 'receipts/x.md' }).length, 1);
assert.equal(sourceUrlProblems({ source_url: 'https://a.example.org/x', secondary_source_url: 'nope' }).length, 1);

assert.equal(extractLimitsSection('# T\n\n## Limits\n\nbody text here\n\n## Next\n\nother'), 'body text here');
assert.equal(extractLimitsSection('# T\n\n## Scope and limitations\n\nbody'), null,
  'only a section titled exactly "Limits" satisfies the contract');
assert.equal(extractLimitsSection('# T\n\n### Limits\n\nbody'), null, 'a ### subsection is not the Limits section');
assert.equal(extractLimitsSection('# T\n\n## Limits\n\n## Next\n\nother'), '');
assert.equal(extractLimitsSection('# T\n\n## limits\r\n\r\nlower-case heading body\r\n'), 'lower-case heading body');

assert.equal(limitsStatus({ limits: ROW_LIMITS }, fixtureRoot).source, 'row');
assert.equal(limitsStatus({ limits: [ROW_LIMITS, 'Second statement of what is not established.'] }, fixtureRoot).source, 'row');
assert.match(limitsStatus({ limits: '   ' }, fixtureRoot).problems[0], /shorter than|non-empty/);
assert.match(limitsStatus({ limits: 'TBD' }, fixtureRoot).problems[0], /shorter than|placeholder/);
assert.match(limitsStatus({ limits: 42 }, fixtureRoot).problems[0], /non-empty string/);
assert.equal(limitsStatus(rows.goodSection, fixtureRoot).source, 'extract');
assert.equal(limitsStatus(rows.missingLimits, fixtureRoot).source, null);

// ---------------------------------------------------------------- fixture verdicts
{
  const ok = check([rows.goodSection, rows.goodRowLimits, rows.waybackWithLimits]);
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.summary.limits_on_row, 2);
  assert.equal(ok.summary.limits_in_extract, 1);
  assert.equal(ok.summary.in_repo_hash_checked, 2);
  assert.equal(ok.summary.wayback_snapshots, 1);
}
{
  const bad = check([rows.missingLimits]);
  assert.deepEqual(messages(bad), ['missing-limits:limits'], 'a receipt with no limits statement must fail');
  assert.match(bad.errors[0].message, /no `limits`/);
}
{
  const bad = check([rows.emptySection]);
  assert.deepEqual(messages(bad), ['empty-section:limits'], 'an empty ## Limits section must fail');
  assert.match(bad.errors[0].message, /empty/);
}
{
  const bad = check([rows.hashMismatch]);
  assert.deepEqual(messages(bad), ['hash-mismatch:archive'], 'a SHA-256 mismatch must fail');
  assert.match(bad.errors[0].message, /mismatch/);
}
{
  const bad = check([rows.missingFile]);
  assert.ok(messages(bad).includes('missing-file:archive'), 'a missing archived extract must fail');
}
{
  assert.ok(messages(check([rows.noSourceUrl])).includes('no-source-url:source_url'));
  assert.ok(messages(check([rows.badSourceUrl])).includes('bad-source-url:source_url'));
}
{
  const bad = check([rows.waybackNoLimits]);
  assert.deepEqual(messages(bad), ['wayback-no-limits:limits'],
    'a Wayback-archived receipt has no extract, so it needs limits on the row');
}
{
  assert.ok(messages(check([rows.noArchive])).includes('no-archive:archive'));
  const outside = check([rows.outsideReceipts]);
  assert.ok(messages(outside).includes('outside-receipts:archive'), 'in-repo extracts must live under receipts/');
}
{
  const dup = check([rows.goodSection, { ...rows.goodSection }]);
  assert.deepEqual(messages(dup), ['good-section:identity']);
}
{
  const all = check(Object.values(rows));
  assert.ok(all.errors.length >= 8);
}

// ---------------------------------------------------------------- the CLI gate
function runCli(list) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-contract-cli-'));
  fs.cpSync(path.join(fixtureRoot, 'receipts'), path.join(root, 'receipts'), { recursive: true });
  fs.cpSync(path.join(fixtureRoot, 'elsewhere'), path.join(root, 'elsewhere'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/ledger'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/ledger/receipts.jsonl'), `${list.map(r => JSON.stringify(r)).join('\n')}\n`);
  const result = spawnSync(process.execPath, [validator, '--root', root], { encoding: 'utf8' });
  fs.rmSync(root, { recursive: true, force: true });
  return result;
}
{
  const pass = runCli([rows.goodSection, rows.goodRowLimits, rows.waybackWithLimits]);
  assert.equal(pass.status, 0, pass.stderr);
  assert.match(pass.stdout, /validate-receipt-contract: OK 3 receipts/);

  const noLimits = runCli([rows.goodSection, rows.missingLimits]);
  assert.equal(noLimits.status, 1);
  assert.match(noLimits.stderr, /receipt missing-limits \[limits\]/);
  assert.doesNotMatch(noLimits.stderr, /good-section/);

  const mismatch = runCli([rows.goodSection, rows.hashMismatch]);
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /receipt hash-mismatch \[archive\].*mismatch/);

  const bad = spawnSync(process.execPath, [validator, '--bogus'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
}

// ---------------------------------------------------------------- the live ledger
const liveReceipts = fs.readFileSync(path.join(repoRoot, 'data/ledger/receipts.jsonl'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const live = checkReceiptContract(liveReceipts, { root: repoRoot });
assert.deepEqual(live.errors.map(e => `${e.receipt_id}:${e.check}:${e.message}`), [],
  'every live receipt must satisfy the receipt contract');
assert.equal(live.summary.total_receipts, liveReceipts.length);
assert.equal(live.summary.limits_on_row + live.summary.limits_in_extract, liveReceipts.length);
assert.equal(live.summary.in_repo_hash_checked + live.summary.wayback_snapshots, liveReceipts.length);

fs.rmSync(fixtureRoot, { recursive: true, force: true });
console.log(`receipt-contract.test: OK ${JSON.stringify(live.summary)}`);
