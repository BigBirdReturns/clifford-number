import fs from 'node:fs';
import path from 'node:path';
import { checkReceiptArchival } from './receipt-archival.mjs';
import { root as repoRoot } from './ledger.mjs';

// The receipt contract (docs/methodology.md, docs/definitions.md, docs/case-ledger.md):
// every row of data/ledger/receipts.jsonl must
//   1. point at a concrete public source (a well-formed http(s) URL),
//   2. carry an archive reference that resolves (an in-repo extract under
//      receipts/ whose canonical SHA-256 matches archive.ref, or a Wayback
//      snapshot of the source URL), and
//   3. state what the source does NOT establish (`limits` on the row, or a
//      `## Limits` section in the archived extract).
// This module enforces that mechanically and offline; it never fetches anything.

export const MIN_LIMITS_LENGTH = 20;
const PLACEHOLDER_LIMITS = /^(?:n\/?a|none|nil|null|tbd|todo|unknown|\.{1,3}|-+)$/i;
const SOURCE_URL_FIELDS = ['source_url', 'secondary_source_url', 'tertiary_source_url'];

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

/** Returns a problem string when `value` is not a concrete, well-formed public http(s) URL. */
export function urlProblem(value) {
  if (!nonEmpty(value)) return 'is empty';
  if (value !== value.trim() || /\s/.test(value)) return 'contains whitespace';
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return 'is not a parseable URL';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'is not an http(s) URL';
  const host = parsed.hostname.toLowerCase();
  if (!host.includes('.')) return 'has no public host name';
  if (host === 'localhost' || /^(?:127|10|0)\./.test(host) || host === '[::1]') {
    return 'points at a local or private host';
  }
  return null;
}

/**
 * Source-URL rule: the row must name a resolvable source. `source_url` is the
 * canonical field; a receipt whose `path` is itself an http(s) URL (the
 * Wayback-archived rows) is accepted too. Optional secondary/tertiary URLs must
 * be well-formed when present.
 */
export function sourceUrlProblems(receipt) {
  const problems = [];
  const candidates = [];
  if (receipt?.source_url !== undefined) candidates.push(['source_url', receipt.source_url]);
  if (httpUrl(receipt?.path)) candidates.push(['path', receipt.path]);
  if (candidates.length === 0) {
    problems.push('has no source URL (needs `source_url`, or an http(s) `path`)');
    return problems;
  }
  for (const [field, value] of candidates) {
    const problem = urlProblem(value);
    if (problem) problems.push(`${field} ${problem}: ${JSON.stringify(value)}`);
  }
  for (const field of SOURCE_URL_FIELDS.slice(1)) {
    if (receipt?.[field] === undefined) continue;
    const problem = urlProblem(receipt[field]);
    if (problem) problems.push(`${field} ${problem}: ${JSON.stringify(receipt[field])}`);
  }
  return problems;
}

/** Body of the first `## Limits` section of a markdown extract, or null when absent. */
export function extractLimitsSection(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
  let start = -1;
  let fence = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*(?:```|~~~)/.test(lines[i])) fence = !fence;
    if (!fence && /^##[ \t]+Limits[ \t]*#*[ \t]*$/i.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return null;
  const body = [];
  fence = false;
  for (let i = start; i < lines.length; i += 1) {
    if (/^\s*(?:```|~~~)/.test(lines[i])) fence = !fence;
    if (!fence && /^#{1,2}[ \t]+\S/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

function limitsTextProblem(text) {
  if (text.length < MIN_LIMITS_LENGTH) return `is shorter than ${MIN_LIMITS_LENGTH} characters`;
  if (PLACEHOLDER_LIMITS.test(text)) return 'is a placeholder';
  return null;
}

/**
 * Limits rule: a non-empty `limits` on the row (string, or array of strings),
 * or a non-empty `## Limits` section in the archived extract.
 * Returns { source: 'row' | 'extract' | null, problems: [] }.
 */
export function limitsStatus(receipt, base = repoRoot) {
  if (receipt?.limits !== undefined && receipt.limits !== null) {
    const raw = receipt.limits;
    const parts = Array.isArray(raw) ? raw : [raw];
    if (parts.length === 0 || !parts.every(nonEmpty)) {
      return { source: null, problems: ['`limits` on the row must be a non-empty string (or non-empty array of strings)'] };
    }
    const bad = limitsTextProblem(parts.map(part => part.trim()).join(' '));
    return bad
      ? { source: null, problems: [`\`limits\` on the row ${bad}`] }
      : { source: 'row', problems: [] };
  }
  const problems = [];
  if (nonEmpty(receipt?.path) && !httpUrl(receipt.path) && !path.isAbsolute(receipt.path)) {
    const resolvedBase = path.resolve(base);
    const full = path.resolve(resolvedBase, receipt.path);
    const inside = full === resolvedBase || full.startsWith(`${resolvedBase}${path.sep}`);
    if (inside && fs.existsSync(full) && fs.lstatSync(full).isFile() && /\.(?:md|markdown|txt)$/i.test(full)) {
      const section = extractLimitsSection(fs.readFileSync(full, 'utf8'));
      if (section !== null) {
        const bad = section.length === 0 ? 'is empty' : limitsTextProblem(section);
        if (!bad) return { source: 'extract', problems: [] };
        problems.push(`\`## Limits\` section of ${receipt.path} ${bad}`);
      }
    }
  }
  if (problems.length === 0) {
    problems.push('has no `limits` (needs a non-empty `limits` on the row or a `## Limits` section in the archived extract)');
  }
  return { source: null, problems };
}

function archiveContractProblems(receipt, base) {
  const problems = [];
  const method = receipt?.archive?.method;
  if (method === 'in_repo_content_hash') {
    const p = receipt.path;
    if (nonEmpty(p) && !httpUrl(p) && !path.isAbsolute(p) && !/^receipts\//.test(p.replace(/\\/g, '/'))) {
      problems.push(`archive.method in_repo_content_hash must point at a file under receipts/, got ${JSON.stringify(p)}`);
    }
  }
  // Existence, SHA-256 equality (canonical line-ending form), Wayback target and
  // missing/unsupported archive references are all enforced by the shared checker.
  const { errors } = checkReceiptArchival([receipt], { root: base, strict: true });
  for (const message of errors) {
    problems.push(message.replace(/^receipt \S+ /, ''));
  }
  return problems;
}

/**
 * Check every receipt against the contract.
 * Returns { errors: [{ receipt_id, check, message }], summary }.
 */
export function checkReceiptContract(receipts, { root: base = repoRoot } = {}) {
  const errors = [];
  const seen = new Set();
  const summary = {
    total_receipts: receipts.length,
    limits_on_row: 0,
    limits_in_extract: 0,
    in_repo_hash_checked: 0,
    wayback_snapshots: 0,
  };
  const add = (receiptId, check, message) => errors.push({ receipt_id: receiptId, check, message });

  for (const receipt of receipts) {
    const id = nonEmpty(receipt?.receipt_id) ? receipt.receipt_id : '<missing-id>';
    if (id === '<missing-id>') add(id, 'identity', 'row has no receipt_id');
    else if (seen.has(id)) add(id, 'identity', 'duplicate receipt_id');
    seen.add(id);

    for (const problem of sourceUrlProblems(receipt)) add(id, 'source_url', problem);
    const archiveProblems = archiveContractProblems(receipt, base);
    for (const problem of archiveProblems) add(id, 'archive', problem);
    if (archiveProblems.length === 0) {
      if (receipt.archive.method === 'in_repo_content_hash') summary.in_repo_hash_checked += 1;
      if (receipt.archive.method === 'internet_archive') summary.wayback_snapshots += 1;
    }
    const limits = limitsStatus(receipt, base);
    for (const problem of limits.problems) add(id, 'limits', problem);
    if (limits.source === 'row') summary.limits_on_row += 1;
    if (limits.source === 'extract') summary.limits_in_extract += 1;
  }
  return { errors, summary };
}

export function formatReceiptContractError(error) {
  return `receipt ${error.receipt_id} [${error.check}] ${error.message}`;
}
