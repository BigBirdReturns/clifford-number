import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { checkReceiptArchival, todayString, ARCHIVAL_CUTOFF } from '../tools/lib/receipt-archival.mjs';

// Self-contained fixtures in a temp dir: never depend on the live repo data.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-archival-'));
fs.writeFileSync(path.join(root, 'good.txt'), 'hello archived world\n');
const goodHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'good.txt'))).digest('hex');
fs.writeFileSync(path.join(root, 'crlf.txt'), 'hello archived world\r\n');

const withRef = { receipt_id: 'has-ref', path: 'https://x/', archive: { method: 'internet_archive', ref: 'https://web.archive.org/web/2026/https://x/' } };
const localPaste = { receipt_id: 'local-paste', path: '/mnt/data/Pasted text.txt', archive: { method: 'unrecoverable_local_paste', ref: null } };
const noArchive = { receipt_id: 'no-archive', path: 'https://z/' };
const emptyRef = { receipt_id: 'empty-ref', path: 'https://q/', archive: { method: 'internet_archive', ref: '   ' } };
const hashGood = { receipt_id: 'hash-good', path: 'good.txt', archive: { method: 'in_repo_content_hash', ref: `sha256:${goodHash}` } };
const hashBad = { receipt_id: 'hash-bad', path: 'good.txt', archive: { method: 'in_repo_content_hash', ref: 'sha256:' + '0'.repeat(64) } };
const hashCrlf = { receipt_id: 'hash-crlf', path: 'crlf.txt', archive: { method: 'in_repo_content_hash', ref: `sha256:${goodHash}` } };

const PRE = '2026-07-06';
const POST = '2027-06-01';
assert.equal(POST >= ARCHIVAL_CUTOFF, true);
assert.equal(PRE >= ARCHIVAL_CUTOFF, false);

// (a) Missing/empty refs only warn before the cutoff.
{
  const { errors, warnings } = checkReceiptArchival([localPaste, noArchive, emptyRef, withRef], { today: PRE, root });
  assert.equal(errors.length, 0, 'pre-cutoff missing refs must not fail');
  assert.equal(warnings.length, 3, 'each missing/empty ref must surface as a warning');
  assert.ok(warnings.some(w => w.includes('local-paste')), 'unrecoverable_local_paste must be warned, not silently skipped');
}

// (b) The same rows fail on/after the cutoff.
{
  const { errors, warnings } = checkReceiptArchival([localPaste, noArchive, emptyRef, withRef], { today: POST, root });
  assert.equal(warnings.length, 0);
  assert.equal(errors.length, 3, 'post-cutoff missing refs must fail');
}

// (c) A stale in_repo_content_hash fails immediately, regardless of date.
for (const today of [PRE, POST]) {
  const { errors } = checkReceiptArchival([hashBad], { today, root });
  assert.equal(errors.length, 1, `content-hash mismatch must fail on ${today}`);
  assert.ok(errors[0].includes('hash-bad') && errors[0].includes('mismatch'));
}

// (d) Rows with a valid ref (URL snapshot or matching content hash) pass cleanly,
// even after the cutoff.
{
  const { errors, warnings } = checkReceiptArchival([withRef, hashGood, hashCrlf], { today: POST, root });
  assert.equal(errors.length, 0, 'rows with valid refs must pass');
  assert.equal(warnings.length, 0);
}

// "Now" is overridable via the env var, and defaults to a real YYYY-MM-DD date.
assert.equal(todayString({ CLIFFORD_VALIDATE_TODAY: POST }), POST);
assert.match(todayString({}), /^\d{4}-\d{2}-\d{2}$/);

fs.rmSync(root, { recursive: true, force: true });
console.log('receipt-archival.test: OK');
