#!/usr/bin/env node
// Archive the source receipts of a defense-corridor intake lane so its rows can satisfy the
// receipt contract (tools/lib/receipt-contract.mjs, test/receipt-contract.test.js).
//
//   node tools/archive-intake-receipts.mjs --lane A|B [--refresh] [--no-save] [--only <receipt_id>]
//
// Lane A = data/intake/person-centered-defense-routers, lane B = data/intake/austin-israel-defense-corridor.
// For every intake receipt with a public source URL the tool:
//   1. fetches the URL with curl (browser-like User-Agent, 30 s timeout, redirects followed),
//      refusing error statuses, login walls and bot challenges;
//   2. stores the body under receipts/defense-corridor/<receipt-id>.<ext> (HTML stays HTML,
//      PDF stays PDF, JSON stays JSON). USAspending award pages are a JavaScript shell, so the
//      award record is fetched from the public award API and stored as JSON instead;
//   3. hashes the stored file with the contract's canonical hash (canonicalReceiptHash) and
//      records retrieved_at (UTC), content type, byte count, HTTP status and final URL;
//   4. asks the Wayback availability API for a snapshot (closest to the intake retrieval date)
//      and, only when the in-repo capture failed and no snapshot exists, requests a Save Page Now
//      capture (skipped with --no-save);
//   5. writes a `limits` statement of what the source does not establish.
// Results go to data/ledger/staging/defense-corridor/archived-receipts-<lane>.jsonl, one record
// per intake receipt, which tools/promote-intake-defense-corridor.mjs overlays on the intake
// receipts. A receipt already archived with a matching file hash is not refetched unless --refresh.
// LinkedIn is never fetched (login wall). Requests are paced to about one per second per host.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJsonl, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';

const LANES = {
  A: 'data/intake/person-centered-defense-routers',
  B: 'data/intake/austin-israel-defense-corridor',
};
const STORE = 'receipts/defense-corridor';
const OUT_DIR = 'data/ledger/staging/defense-corridor';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const TIMEOUT_S = 30;

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const laneKey = (opt('--lane') ?? '').toUpperCase();
if (!LANES[laneKey]) {
  console.error('usage: node tools/archive-intake-receipts.mjs --lane A|B [--refresh] [--no-save] [--only <receipt_id>]');
  process.exit(1);
}
const REFRESH = args.includes('--refresh');
const SAVE = !args.includes('--no-save');
const ONLY = opt('--only');
const laneDir = LANES[laneKey];
const outFile = `${OUT_DIR}/archived-receipts-${laneKey}.jsonl`;

// ---------------------------------------------------------------- pacing
const lastHit = new Map();
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function pace(url, gapMs = 1100) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + gapMs - Date.now();
  if (wait > 0) sleep(wait);
  lastHit.set(host, Date.now());
}

// ---------------------------------------------------------------- curl
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-intake-'));
function curl(url, { method = 'GET', accept, timeout = TIMEOUT_S, gapMs } = {}) {
  pace(url, gapMs);
  const body = path.join(tmpDir, 'body');
  if (fs.existsSync(body)) fs.rmSync(body);
  const cmd = ['-sS', '-L', '--max-redirs', '10', '--max-time', String(timeout), '-A', UA,
    '-H', `Accept: ${accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/json;q=0.8,*/*;q=0.7'}`,
    '-H', 'Accept-Language: en-US,en;q=0.9', '--compressed',
    '-X', method, '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url];
  try {
    const meta = execFileSync('curl', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const [status, contentType, finalUrl] = meta.split('\t');
    return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
  } catch (err) {
    const msg = String(err.stderr || err.message).trim().split('\n').pop();
    return { ok: false, error: msg.slice(0, 200) };
  }
}

// ---------------------------------------------------------------- classification
const isLinkedIn = url => /(^|\.)linkedin\.com$/i.test(new URL(url).hostname);
function extFor(contentType, url) {
  const ct = contentType.toLowerCase();
  if (ct.includes('pdf')) return 'pdf';
  if (ct.includes('json')) return 'json';
  if (ct.includes('html')) return 'html';
  if (ct.includes('xml')) return 'xml';
  if (ct.startsWith('text/')) return 'txt';
  const m = /\.(pdf|json|html?|xml|txt)(?:$|\?)/i.exec(new URL(url).pathname);
  return m ? m[1].toLowerCase().replace('htm', 'html').replace('htmll', 'html') : 'bin';
}
function blockedReason(res) {
  if (!res.ok) return `fetch_error: ${res.error}`;
  if (res.status === 401 || res.status === 403) return `http_${res.status}_refused`;
  if (res.status === 429) return 'http_429_rate_limited';
  if (res.status >= 400) return `http_${res.status}`;
  if (res.bytes.length < 200) return 'empty_or_truncated_body';
  const head = res.bytes.subarray(0, 20000).toString('utf8');
  if (/<title>\s*(Just a moment|Attention Required|Access denied|Request Rejected)/i.test(head)
      || /cf-browser-verification|challenge-platform\/h\/[bg]\/orchestrate|_Incapsula_Resource|px-captcha/i.test(head)) {
    return 'bot_challenge';
  }
  if (/linkedin\.com\/(authwall|login)/i.test(res.finalUrl ?? '')) return 'login_wall';
  return null;
}

// USAspending award pages are a client-side app; the award record itself is the public API object.
function usaspendingApiUrl(url) {
  const m = /^https?:\/\/(?:www\.)?usaspending\.gov\/award\/([^/?#]+)/i.exec(url);
  return m ? `https://api.usaspending.gov/api/v2/awards/${m[1]}/` : null;
}

// ---------------------------------------------------------------- limits
const OVERRIDES = {
  'r-cf-natsec-press-corroboration-2026': 'The archived page is the Capital Factory portfolio listing only; the independent press corroboration the intake describes is not captured here, and a listing does not show investment dates, amounts, ownership or current holdings.',
  'r-raft-ussocom-2026': 'Trade-press report of an IDIQ contract ceiling; a ceiling is not money obligated or spent, and the article does not show task orders, payments or performance.',
  'r-baer-texasmonthly-2026': 'Magazine profile and reporting about Joshua Baer as of publication; it does not verify role dates, holdings or decision authority against primary records.',
  'r-icon-cf-startup-2026': 'A Capital Factory startup page shows that the accelerator lists ICON; it does not show investment dates, amounts, ownership or the terms of any relationship. The press items the intake also cites are not captured here.',
  'r-stratos-ctech-portfolio-2026': 'Press report naming Stratos Ventures portfolio companies as of publication; it does not show investment dates, amounts, ownership or the complete portfolio.',
  'r-portfolio-stratos-ventures': 'Press report naming Stratos Ventures portfolio companies as of publication; it does not show investment dates, amounts, ownership or the complete portfolio.',
};
function limitsFor(r, url) {
  if (OVERRIDES[r.receipt_id]) return OVERRIDES[r.receipt_id];
  const id = r.receipt_id;
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host.endsWith('usaspending.gov')) {
    return 'A USAspending award record shows reported obligations, ceilings and award fields as of retrieval; it does not show payments outlaid, performance, subcontractors, or why the award was made, and later modifications may change the figures.';
  }
  if (/^r-roster-|\/team|our[-_]team|\/team-/.test(`${id} ${url}`) && !/portfolio|companies|investments|ventures/.test(url)) {
    return 'A team page lists people and titles as of retrieval; it does not show start or end dates, investment decision authority, compensation, or roles held before or after retrieval.';
  }
  if (/^r-portfolio-|portfolio|\/companies|\/investments|\/ventures/.test(`${id} ${url}`)) {
    return "A portfolio page lists companies as of retrieval; it does not show investment dates, amounts, ownership stakes, lead roles or current holdings, and a listing is the publisher's own claim.";
  }
  if (r.evidence_class === 'reported' || /prnewswire|jpost|timesofisrael|refreshmiami|calcalistech|govconwire|texasmonthly/.test(host)) {
    if (/prnewswire/.test(host)) return 'A wire press release is the issuing company\'s own announcement as of publication; it does not independently verify the round size, investor roles, terms or later events.';
    return 'A press article reports what its sources stated as of publication; it is secondary reporting and does not itself verify amounts, dates, investor roles or terms against primary records.';
  }
  if (/\/news\/|raises|-raises-/.test(url)) {
    return 'A company announcement states the company\'s own account of a financing as of publication; it does not independently verify the amount, investor roles, terms, closing date or later events.';
  }
  if (/\/team\/|\/author\/|\/about/.test(url)) {
    return 'A self-published profile states claimed roles and affiliations as of retrieval; it does not independently verify them, give their start or end dates, or show control, compensation or decision authority.';
  }
  return 'A self-published organization page describes the organization as of retrieval; it does not independently verify its claims or show dates, ownership, control, funding or the completeness of any list it carries.';
}

// ---------------------------------------------------------------- wayback
function waybackAvailable(url, nearDate) {
  const ts = (nearDate ?? '').replace(/-/g, '');
  const q = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}${ts ? `&timestamp=${ts}` : ''}`;
  const res = curl(q, { accept: 'application/json', timeout: 40 });
  if (!res.ok || res.status !== 200) return { checked: false, error: res.error ?? `http_${res.status}` };
  try {
    const snap = JSON.parse(res.bytes.toString('utf8'))?.archived_snapshots?.closest;
    if (snap?.available && /^2\d\d$/.test(String(snap.status ?? '200'))) {
      return { checked: true, timestamp: snap.timestamp, snapshot_url: snap.url };
    }
    return { checked: true, timestamp: null };
  } catch (err) {
    return { checked: false, error: `bad_json: ${err.message}` };
  }
}
function waybackSave(url) {
  const res = curl(`https://web.archive.org/save/${url}`, { timeout: 120, gapMs: 6000 });
  if (!res.ok) return { requested: true, error: res.error };
  const m = /web\.archive\.org\/web\/(\d{14})\//.exec(res.finalUrl ?? '');
  if (res.status < 400 && m) return { requested: true, timestamp: m[1] };
  return { requested: true, error: `http_${res.status}`, final_url: res.finalUrl };
}
const WAYBACK_MAX_LEAD_DAYS = 120;
function waybackFresh(ts, observed) {
  if (!observed) return true;
  const snap = Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8));
  return snap >= Date.parse(`${observed}T00:00:00Z`) - WAYBACK_MAX_LEAD_DAYS * 86400000;
}
const waybackRef = (ts, url) => `http://web.archive.org/web/${ts}/${url}`;

// ---------------------------------------------------------------- main
const intake = readJsonl(`${laneDir}/receipts.jsonl`);
const prior = new Map((fs.existsSync(path.join(root, outFile)) ? readJsonl(outFile) : []).map(r => [r.intake_receipt_id, r]));
const byUrl = new Map(); // url -> stored capture this run (dedupe identical locators)
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
fs.mkdirSync(path.join(root, STORE), { recursive: true });
// Captures already made for the other lane are reused (same URL), never refetched or overwritten.
for (const other of Object.keys(LANES).filter(k => k !== laneKey)) {
  const file = `${OUT_DIR}/archived-receipts-${other}.jsonl`;
  for (const a of fs.existsSync(path.join(root, file)) ? readJsonl(file) : []) {
    if (a.status === 'archived' && a.capture && a.path === a.capture.path && !byUrl.has(a.source_url)
        && fs.existsSync(path.join(root, a.path)) && canonicalReceiptHash(path.join(root, a.path)) === a.capture.sha256) {
      byUrl.set(a.source_url, { ...a, intake_receipt_id: `${other}:${a.intake_receipt_id}` });
    }
  }
}

const PLACEHOLDER_TYPES = new Set(['search_provenance', 'derived_projection']);
const DERIVED_LEDGERS = /\(sources\/[^)]+\)|Committed portable .* projection/i;

const out = [];
const seen = new Set();
for (const r of intake) {
  if (seen.has(r.receipt_id)) continue; // later duplicate rows of the same id are ignored, as in the promote tool
  seen.add(r.receipt_id);
  const prev = prior.get(r.receipt_id);
  if (ONLY && r.receipt_id !== ONLY) { if (prev) out.push(prev); continue; }
  const url = r.locator_url || null;
  const base = { lane: laneKey, intake_source: laneDir, intake_receipt_id: r.receipt_id, source_url: url, intake_retrieved_at: r.retrieved_at ?? null, intake_content_sha256: r.content_sha256 ?? null };

  if (!url) { out.push({ ...base, status: 'failed', reason: 'no_source_url', attempted: false }); continue; }
  if (PLACEHOLDER_TYPES.has(r.evidence_class) || DERIVED_LEDGERS.test(r.note ?? '') || /linkedin-projection/.test(r.receipt_id)) {
    out.push({ ...base, status: 'failed', reason: 'locator_is_placeholder_for_local_derived_ledger', attempted: false,
      detail: 'The receipt stands for a locally derived ledger (search provenance, census or projection); archiving the placeholder URL would not archive the cited material.' });
    continue;
  }

  if (!REFRESH && prev?.status === 'archived' && prev.archive?.method === 'in_repo_content_hash'
      && fs.existsSync(path.join(root, prev.path)) && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref) {
    out.push(prev); byUrl.set(url, prev); continue;
  }

  const limits = limitsFor(r, url);
  if (limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${r.receipt_id}`);
  const rec = { ...base, limits, attempted: true };

  // 1. in-repo capture
  let capture = null;
  if (isLinkedIn(url)) {
    rec.fetch = { skipped: true, reason: 'login_wall' };
  } else if (byUrl.has(url) && byUrl.get(url).path) {
    capture = { reused_from: byUrl.get(url).intake_receipt_id, ...byUrl.get(url).capture };
    rec.fetch = { reused_from: capture.reused_from };
  } else {
    const api = usaspendingApiUrl(url);
    const fetchUrl = api ?? url;
    const res = curl(fetchUrl, api ? { accept: 'application/json' } : {});
    const blocked = blockedReason(res);
    rec.fetch = { url: fetchUrl, status: res.status ?? null, final_url: res.finalUrl ?? null, content_type: res.contentType ?? null, ...(blocked ? { refused: blocked } : {}) };
    if (!blocked) {
      const ext = extFor(res.contentType, res.finalUrl || fetchUrl);
      const rel = `${STORE}/${slug(r.receipt_id)}.${ext}`;
      fs.writeFileSync(path.join(root, rel), res.bytes);
      const hash = canonicalReceiptHash(path.join(root, rel));
      capture = { path: rel, sha256: hash, bytes: res.bytes.length, content_type: res.contentType, fetched_url: fetchUrl, final_url: res.finalUrl, http_status: res.status, retrieved_at_utc: now() };
    }
  }

  // 2. Wayback
  const wb = waybackAvailable(url, r.retrieved_at);
  rec.wayback = { ...wb };
  // A snapshot long before the intake observation does not evidence it; keep it on record, do not use it.
  if (wb.timestamp && !waybackFresh(wb.timestamp, r.retrieved_at)) {
    rec.wayback = { checked: true, timestamp: null, stale_snapshot: wb.timestamp };
  }
  if (!capture && !wb.timestamp && SAVE && !isLinkedIn(url)) {
    const saved = waybackSave(url);
    rec.wayback.save = saved;
    if (saved.timestamp) rec.wayback.timestamp = saved.timestamp;
  }
  if (rec.wayback.timestamp) rec.wayback.ref = waybackRef(rec.wayback.timestamp, url);

  // 3. archive object in the ledger's convention
  if (capture) {
    const day = capture.retrieved_at_utc.slice(0, 10);
    Object.assign(rec, {
      status: 'archived', path: capture.path, retrieved_at: day, retrieved_at_utc: capture.retrieved_at_utc,
      content_type: capture.content_type, content_bytes: capture.bytes, content_sha256: capture.sha256, capture,
      archive: {
        method: 'in_repo_content_hash', ref: `sha256:${capture.sha256}`, captured: day, checked: day,
        fetched_url: capture.fetched_url, content_type: capture.content_type, bytes: capture.bytes,
        ...(rec.wayback.ref ? { wayback_ref: rec.wayback.ref } : {}),
        note: capture.fetched_url !== url
          ? 'Hash covers the in-repository copy of the public award API record behind the cited award page (the page itself is a client-side shell).'
          : 'Hash covers the in-repository copy of the source body as fetched; markup, scripts and later page changes are not normalized.',
      },
    });
    byUrl.set(url, rec);
  } else if (rec.wayback.ref) {
    const ts = rec.wayback.timestamp;
    const day = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
    Object.assign(rec, {
      status: 'archived', path: url, retrieved_at: day,
      archive: { method: 'internet_archive', ref: rec.wayback.ref, captured: ts, checked: now().slice(0, 10),
        note: rec.fetch?.reason === 'login_wall' || rec.fetch?.refused ? `Direct fetch refused (${rec.fetch.reason ?? rec.fetch.refused}); the Wayback snapshot is the archive.` : 'Wayback snapshot of the source URL.' },
    });
  } else {
    rec.status = 'failed';
    rec.reason = rec.fetch?.reason ?? rec.fetch?.refused ?? 'no_capture';
    rec.reason += rec.wayback.checked ? '; no_wayback_snapshot' : `; wayback_check_failed (${rec.wayback.error})`;
  }
  out.push(rec);
  console.log(`${rec.status.padEnd(8)} ${r.receipt_id} ${rec.archive?.method ?? rec.reason}${rec.content_bytes ? ` ${rec.content_bytes}B` : ''}`);
}

writeJsonl(outFile, out);
fs.rmSync(tmpDir, { recursive: true, force: true });
const n = s => out.filter(s).length;
console.log(`archive-intake-receipts lane ${laneKey}: ${out.length} receipts; archived in-repo ${n(r => r.archive?.method === 'in_repo_content_hash')}, wayback-only ${n(r => r.archive?.method === 'internet_archive')}, wayback snapshot known ${n(r => r.wayback?.ref)}, failed ${n(r => r.status === 'failed')}; wrote ${outFile}`);
