import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root } from './ledger.mjs';

// The governing acceptance deadline remains 2027-01-01. Phase 0 closure uses
// strict mode now so a newly admitted receipt cannot wait for that deadline.
export const ARCHIVAL_CUTOFF = '2027-01-01';
export const ARCHIVAL_METHODS = Object.freeze([
  'in_repo_content_hash',
  'internet_archive',
  'unrecoverable_local_paste',
]);

const TEXT_RECEIPT_EXTENSIONS = new Set([
  '.css', '.csv', '.htm', '.html', '.js', '.json', '.jsonl', '.md', '.mjs',
  '.txt', '.tsv', '.xml', '.yaml', '.yml',
]);
const SHA256_REF = /^sha256:([0-9a-f]{64})$/i;
const WAYBACK_REF = /^https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:id_)?\/(https?:\/\/.+)$/i;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function normalizeHttpUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

function collectSourceUrls(value, { insideArchive = false, out = new Set() } = {}) {
  if (Array.isArray(value)) {
    for (const item of value) collectSourceUrls(item, { insideArchive, out });
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'archive') {
      collectSourceUrls(item, { insideArchive: true, out });
      continue;
    }
    if (!insideArchive && httpUrl(item)) out.add(item.trim());
    if (item && typeof item === 'object') collectSourceUrls(item, { insideArchive, out });
  }
  return out;
}

export function canonicalReceiptBytes(fullPath) {
  const bytes = fs.readFileSync(fullPath);
  if (!TEXT_RECEIPT_EXTENSIONS.has(path.extname(fullPath).toLowerCase())) return bytes;
  const text = bytes.toString('utf8').replace(/\r\n?/g, '\n');
  return Buffer.from(text, 'utf8');
}

export function canonicalReceiptHash(fullPath) {
  return crypto.createHash('sha256').update(canonicalReceiptBytes(fullPath)).digest('hex');
}

export function todayString(env = process.env) {
  const override = env.CLIFFORD_VALIDATE_TODAY;
  if (override) return override;
  return new Date().toISOString().slice(0, 10);
}

export function summarizeReceiptArchival(receipts = []) {
  const methodCounts = {};
  let archiveRefCount = 0;
  let sourceUrlCount = 0;
  let receiptsWithSourceUrls = 0;
  let unresolvedCount = 0;

  for (const receipt of receipts) {
    const method = receipt?.archive?.method ?? 'missing';
    methodCounts[method] = (methodCounts[method] ?? 0) + 1;
    const ref = nonEmpty(receipt?.archive?.ref) ? receipt.archive.ref.trim() : '';
    if (ref) archiveRefCount += 1;
    const urls = collectSourceUrls(receipt);
    sourceUrlCount += urls.size;
    if (urls.size) receiptsWithSourceUrls += 1;
    if (!ref || method === 'unrecoverable_local_paste') unresolvedCount += 1;
  }

  return {
    total_receipts: receipts.length,
    archive_ref_count: archiveRefCount,
    unresolved_receipt_count: unresolvedCount,
    receipts_with_source_urls: receiptsWithSourceUrls,
    source_url_count: sourceUrlCount,
    method_counts: Object.fromEntries(
      Object.entries(methodCounts).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

function addMissingReference({ errors, warnings, receiptId, enforce }) {
  const message = `receipt ${receiptId} lacks an archival reference (link-rot risk; BUILD-INSTRUCTIONS 2.5)`;
  if (enforce) errors.push(message);
  else warnings.push(message);
}

function validateInRepoHash(receipt, ref, base, errors) {
  const match = SHA256_REF.exec(ref);
  if (!match) {
    errors.push(`receipt ${receipt.receipt_id} archive.method in_repo_content_hash requires a sha256:<hex> ref, got ${JSON.stringify(receipt.archive?.ref)}`);
    return;
  }
  if (!nonEmpty(receipt.path) || httpUrl(receipt.path) || path.isAbsolute(receipt.path)) {
    errors.push(`receipt ${receipt.receipt_id} in_repo_content_hash requires a repository-relative path, got ${JSON.stringify(receipt.path)}`);
    return;
  }
  const resolvedBase = path.resolve(base);
  const fullPath = path.resolve(resolvedBase, receipt.path);
  if (fullPath !== resolvedBase && !fullPath.startsWith(`${resolvedBase}${path.sep}`)) {
    errors.push(`receipt ${receipt.receipt_id} in_repo_content_hash path escapes the repository root: ${receipt.path}`);
    return;
  }
  if (!fs.existsSync(fullPath)) {
    errors.push(`receipt ${receipt.receipt_id} in_repo_content_hash references missing file ${receipt.path}`);
    return;
  }
  if (!fs.lstatSync(fullPath).isFile()) {
    errors.push(`receipt ${receipt.receipt_id} in_repo_content_hash must reference a regular repository file: ${receipt.path}`);
    return;
  }
  const actual = canonicalReceiptHash(fullPath);
  if (actual.toLowerCase() !== match[1].toLowerCase()) {
    errors.push(`receipt ${receipt.receipt_id} in_repo_content_hash mismatch: ${receipt.path} now hashes to sha256:${actual}, not ${ref}`);
  }
}

function validateInternetArchive(receipt, ref, errors) {
  const match = WAYBACK_REF.exec(ref);
  if (!match) {
    errors.push(`receipt ${receipt.receipt_id} internet_archive ref must be a timestamped web.archive.org snapshot, got ${JSON.stringify(receipt.archive?.ref)}`);
    return;
  }
  const sourceUrls = [...collectSourceUrls(receipt)];
  if (sourceUrls.length === 0) {
    errors.push(`receipt ${receipt.receipt_id} internet_archive ref has no source URL on the receipt row`);
    return;
  }
  const target = normalizeHttpUrl(match[1]);
  const normalizedSources = new Set(sourceUrls.map(normalizeHttpUrl).filter(Boolean));
  if (!target || !normalizedSources.has(target)) {
    errors.push(`receipt ${receipt.receipt_id} internet_archive snapshot target is not one of the receipt's source URLs`);
  }
}

// strict=true closes Phase 0 now. strict=false preserves the governing grace
// period for historical fixture replay, but release validation uses the default.
export function checkReceiptArchival(
  receipts,
  { today = todayString(), root: base = root, strict = true } = {},
) {
  const errors = [];
  const warnings = [];
  const enforce = strict || today >= ARCHIVAL_CUTOFF;

  for (const receipt of receipts) {
    const receiptId = nonEmpty(receipt?.receipt_id) ? receipt.receipt_id : '<missing-id>';
    const archive = receipt?.archive;
    const method = archive?.method;
    const ref = nonEmpty(archive?.ref) ? archive.ref.trim() : '';

    if (!archive || !nonEmpty(method)) {
      addMissingReference({ errors, warnings, receiptId, enforce });
      continue;
    }

    if (!ARCHIVAL_METHODS.includes(method)) {
      errors.push(`receipt ${receiptId} has unsupported archive.method ${JSON.stringify(method)}`);
      continue;
    }

    if (method === 'unrecoverable_local_paste') {
      addMissingReference({ errors, warnings, receiptId, enforce });
      continue;
    }

    if (!ref) {
      addMissingReference({ errors, warnings, receiptId, enforce });
      continue;
    }

    if (method === 'in_repo_content_hash') {
      validateInRepoHash(receipt, ref, base, errors);
    } else if (method === 'internet_archive') {
      validateInternetArchive(receipt, ref, errors);
    }
  }

  return { errors, warnings, summary: summarizeReceiptArchival(receipts) };
}
