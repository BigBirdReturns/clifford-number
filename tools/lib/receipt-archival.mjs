import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root } from './ledger.mjs';

// Receipt archival gate (BUILD-INSTRUCTIONS 2.5). Link rot is the number one
// decade-scale threat to this repo, so every receipt must carry an archived
// snapshot reference. Before the cutoff a missing reference is only a warning;
// on or after it, a hard failure.
export const ARCHIVAL_CUTOFF = '2027-01-01';

const TEXT_RECEIPT_EXTENSIONS = new Set([
  '.css', '.csv', '.htm', '.html', '.js', '.json', '.jsonl', '.md', '.mjs',
  '.txt', '.tsv', '.xml', '.yaml', '.yml',
]);

// Git may materialize text files with CRLF on Windows even when the archived
// source bytes and ledger hash use LF. Hash a canonical UTF-8/LF form for
// text receipts, while preserving byte-exact hashing for binary formats.
export function canonicalReceiptBytes(fullPath) {
  const bytes = fs.readFileSync(fullPath);
  if (!TEXT_RECEIPT_EXTENSIONS.has(path.extname(fullPath).toLowerCase())) return bytes;
  const text = bytes.toString('utf8').replace(/\r\n?/g, '\n');
  return Buffer.from(text, 'utf8');
}

export function canonicalReceiptHash(fullPath) {
  return crypto.createHash('sha256').update(canonicalReceiptBytes(fullPath)).digest('hex');
}

// "Now" is overridable for tests via CLIFFORD_VALIDATE_TODAY (YYYY-MM-DD);
// otherwise the real current date. Comparison is lexicographic on YYYY-MM-DD.
export function todayString(env = process.env) {
  const override = env.CLIFFORD_VALIDATE_TODAY;
  if (override) return override;
  return new Date().toISOString().slice(0, 10);
}

// Returns { errors, warnings } — arrays of message strings. The caller pushes
// errors into its own accumulator (they fail the run) and prints warnings.
export function checkReceiptArchival(receipts, { today = todayString(), root: base = root } = {}) {
  const errors = [];
  const warnings = [];
  const afterCutoff = today >= ARCHIVAL_CUTOFF;
  for (const r of receipts) {
    const archive = r.archive;
    const ref = archive && typeof archive.ref === 'string' ? archive.ref.trim() : '';

    // A stored content hash that no longer matches the file means the referenced
    // bytes changed after they were hashed — a failure at any date.
    if (archive && archive.method === 'in_repo_content_hash') {
      const m = /^sha256:([0-9a-f]{64})$/i.exec(ref);
      if (!m) {
        errors.push(`receipt ${r.receipt_id} archive.method in_repo_content_hash requires a sha256:<hex> ref, got ${JSON.stringify(archive.ref)}`);
        continue;
      }
      const full = path.join(base, r.path);
      if (!fs.existsSync(full)) {
        errors.push(`receipt ${r.receipt_id} in_repo_content_hash references missing file ${r.path}`);
        continue;
      }
      const actual = canonicalReceiptHash(full);
      if (actual.toLowerCase() !== m[1].toLowerCase()) {
        errors.push(`receipt ${r.receipt_id} in_repo_content_hash mismatch: ${r.path} now hashes to sha256:${actual}, not ${ref}`);
      }
      continue;
    }

    // Any other row (including method "unrecoverable_local_paste" with ref null)
    // needs a non-empty archive.ref. Warn before the cutoff, fail on/after it.
    if (!ref) {
      const msg = `receipt ${r.receipt_id} lacks an archive.ref (link-rot risk; BUILD-INSTRUCTIONS 2.5)`;
      if (afterCutoff) errors.push(msg);
      else warnings.push(msg);
    }
  }
  return { errors, warnings };
}
