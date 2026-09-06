import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  ARCHIVAL_CUTOFF,
  checkReceiptArchival,
  summarizeReceiptArchival,
  todayString,
} from '../tools/lib/receipt-archival.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-archival-'));
fs.writeFileSync(path.join(fixtureRoot, 'good.txt'), 'hello archived world\n');
const goodHash = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(fixtureRoot, 'good.txt')))
  .digest('hex');
fs.writeFileSync(path.join(fixtureRoot, 'crlf.txt'), 'hello archived world\r\n');
fs.mkdirSync(path.join(fixtureRoot, 'not-a-file'));

const withRef = {
  receipt_id: 'has-ref',
  path: 'https://x.test/source',
  archive: {
    method: 'internet_archive',
    ref: 'https://web.archive.org/web/20260706000000/https://x.test/source',
  },
};
const localPaste = {
  receipt_id: 'local-paste',
  path: '/mnt/data/Pasted text.txt',
  archive: { method: 'unrecoverable_local_paste', ref: null },
};
const noArchive = { receipt_id: 'no-archive', path: 'https://z.test/' };
const emptyRef = {
  receipt_id: 'empty-ref',
  path: 'https://q.test/',
  archive: { method: 'internet_archive', ref: '   ' },
};
const hashGood = {
  receipt_id: 'hash-good',
  path: 'good.txt',
  archive: { method: 'in_repo_content_hash', ref: `sha256:${goodHash}` },
};
const hashBad = {
  receipt_id: 'hash-bad',
  path: 'good.txt',
  archive: { method: 'in_repo_content_hash', ref: `sha256:${'0'.repeat(64)}` },
};
const hashCrlf = {
  receipt_id: 'hash-crlf',
  path: 'crlf.txt',
  archive: { method: 'in_repo_content_hash', ref: `sha256:${goodHash}` },
};

const PRE = '2026-09-06';
const POST = '2027-06-01';
assert.equal(PRE >= ARCHIVAL_CUTOFF, false);
assert.equal(POST >= ARCHIVAL_CUTOFF, true);

// Historical replay can still model the original grace period explicitly.
{
  const result = checkReceiptArchival(
    [localPaste, noArchive, emptyRef, withRef],
    { today: PRE, root: fixtureRoot, strict: false },
  );
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 3);
  assert.ok(result.warnings.some(message => message.includes('local-paste')));
}

// Phase 0 closure is strict before the deadline: new gaps fail immediately.
{
  const result = checkReceiptArchival(
    [localPaste, noArchive, emptyRef, withRef],
    { today: PRE, root: fixtureRoot },
  );
  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 3);
}

// Even compatibility mode becomes mandatory on and after the stated deadline.
{
  const result = checkReceiptArchival(
    [localPaste, noArchive, emptyRef, withRef],
    { today: POST, root: fixtureRoot, strict: false },
  );
  assert.equal(result.warnings.length, 0);
  assert.equal(result.errors.length, 3);
}

for (const today of [PRE, POST]) {
  const result = checkReceiptArchival([hashBad], { today, root: fixtureRoot });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /hash-bad.*mismatch/);
}

{
  const result = checkReceiptArchival(
    [withRef, hashGood, hashCrlf],
    { today: PRE, root: fixtureRoot },
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.summary.method_counts, {
    in_repo_content_hash: 2,
    internet_archive: 1,
  });
  assert.equal(result.summary.source_url_count, 1);
  assert.equal(result.summary.unresolved_receipt_count, 0);
}

{
  const unsupported = {
    receipt_id: 'unsupported',
    path: 'https://x.test/',
    archive: { method: 'search_result', ref: 'https://example.test/' },
  };
  assert.match(
    checkReceiptArchival([unsupported], { root: fixtureRoot }).errors[0],
    /unsupported archive\.method/,
  );
}

{
  const malformedWayback = structuredClone(withRef);
  malformedWayback.receipt_id = 'malformed-wayback';
  malformedWayback.archive.ref = 'https://example.test/not-a-snapshot';
  assert.match(
    checkReceiptArchival([malformedWayback], { root: fixtureRoot }).errors[0],
    /timestamped web\.archive\.org snapshot/,
  );
}

{
  const detachedWayback = structuredClone(withRef);
  detachedWayback.receipt_id = 'detached-wayback';
  detachedWayback.path = 'local-note.md';
  assert.match(
    checkReceiptArchival([detachedWayback], { root: fixtureRoot }).errors[0],
    /no source URL/,
  );
}

{
  const wrongTarget = structuredClone(withRef);
  wrongTarget.receipt_id = 'wrong-target';
  wrongTarget.archive.ref = 'https://web.archive.org/web/20260706000000/https://other.test/source';
  assert.match(
    checkReceiptArchival([wrongTarget], { root: fixtureRoot }).errors[0],
    /target is not one of the receipt's source URLs/,
  );
}

{
  const absoluteHash = structuredClone(hashGood);
  absoluteHash.receipt_id = 'absolute-hash';
  absoluteHash.path = path.join(fixtureRoot, 'good.txt');
  assert.match(
    checkReceiptArchival([absoluteHash], { root: fixtureRoot }).errors[0],
    /repository-relative path/,
  );
}

{
  const traversalHash = structuredClone(hashGood);
  traversalHash.receipt_id = 'traversal-hash';
  traversalHash.path = '../good.txt';
  assert.match(
    checkReceiptArchival([traversalHash], { root: fixtureRoot }).errors[0],
    /escapes the repository root/,
  );
}

{
  const directoryHash = structuredClone(hashGood);
  directoryHash.receipt_id = 'directory-hash';
  directoryHash.path = 'not-a-file';
  assert.match(
    checkReceiptArchival([directoryHash], { root: fixtureRoot }).errors[0],
    /regular repository file/,
  );
}

{
  const linkPath = path.join(fixtureRoot, 'linked.txt');
  try {
    fs.symlinkSync('good.txt', linkPath);
    const symlinkHash = structuredClone(hashGood);
    symlinkHash.receipt_id = 'symlink-hash';
    symlinkHash.path = 'linked.txt';
    assert.match(
      checkReceiptArchival([symlinkHash], { root: fixtureRoot }).errors[0],
      /regular repository file/,
    );
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
  }
}

assert.equal(todayString({ CLIFFORD_VALIDATE_TODAY: POST }), POST);
assert.match(todayString({}), /^\d{4}-\d{2}-\d{2}$/);

// The live release denominator must already satisfy strict archival custody.
const liveReceipts = fs.readFileSync(path.join(repoRoot, 'data/ledger/receipts.jsonl'), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const live = checkReceiptArchival(liveReceipts, { root: repoRoot, today: PRE });
assert.deepEqual(live.errors, []);
assert.deepEqual(live.warnings, []);
assert.equal(live.summary.total_receipts, liveReceipts.length);
assert.equal(live.summary.archive_ref_count, liveReceipts.length);
assert.equal(live.summary.unresolved_receipt_count, 0);
assert.deepEqual(
  Object.keys(live.summary.method_counts).sort(),
  ['in_repo_content_hash', 'internet_archive'],
);

const summary = summarizeReceiptArchival(liveReceipts);
assert.deepEqual(summary, live.summary);

fs.rmSync(fixtureRoot, { recursive: true, force: true });
console.log(`receipt-archival.test: OK ${JSON.stringify(live.summary)}`);
