// Shared machinery of the page-archiving intake lanes, moved here on 12 November 2026 from
// tools/promote-intake-lens-hunt-official.mjs (that lane runs on import, so its helpers could not be
// imported) for tools/promote-intake-bitter-struggle-chain.mjs. The code is the lens-hunt lane's,
// unchanged; that lane imports it and its staged output is byte-identical.
//
//   - URL keys and retrieval days (the operator's local calendar day);
//   - heldPageCopies: the in-repo copies of pages the ledger already stores, by URL key, so a lane
//     reuses a ledger receipt instead of archiving the same page twice;
//   - createPageArchiver: fetch one page (paced per host: about one request a second, eight seconds
//     for the Wayback Machine), take its closest Wayback snapshot when the host refuses a direct
//     fetch, store it under the lane's receipts folder hashed with the receipt contract's canonical
//     hash, and keep a pdftotext extract beside a PDF (a PDF with no text layer is not kept);
//   - the page-text comparison of the admission rule: markup stripped, entities decoded, whitespace
//     collapsed and curly quotes folded, ignoring letter case, as whole words;
//   - the id and name keys the lanes resolve entities with.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, slug } from './ledger.mjs';
import { canonicalReceiptHash } from './receipt-archival.mjs';

export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
export const SEC_UA = process.env.SEC_UA ?? 'clifford-number-research/1.0 public-records research noreply@clifford-number.invalid';

// ---------------------------------------------------------------- urls and days
export const splitUrls = s => String(s).split(/;\s*/).map(u => u.trim()).filter(Boolean);
export const urlKey = u => {
  const x = new URL(u);
  return `${x.hostname.toLowerCase().replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}${x.search}`;
};
export const isSec = u => /(^|\.)sec\.gov$/i.test(new URL(u).hostname);
export const localDay = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
export const isoUtc = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

// ---------------------------------------------------------------- held copies
// A held copy of a page: an in-repo copy of the page itself (not a written markdown extract).
export const isPageCopy = r => r.archive?.method === 'in_repo_content_hash' && typeof r.path === 'string' && !/\.(md|markdown)$/i.test(r.path);
export function heldPageCopies(receipts, lane) {
  const heldCopies = new Map();
  for (const r of receipts) {
    if (r.intake_source === lane || !isPageCopy(r)) continue;
    for (const u of [r.source_url, r.archive?.fetched_url].filter(v => typeof v === 'string' && /^https?:\/\//.test(v))) {
      let k;
      try { k = urlKey(u); } catch { continue; }
      if (!heldCopies.has(k)) heldCopies.set(k, []);
      if (!heldCopies.get(k).includes(r.receipt_id)) heldCopies.get(k).push(r.receipt_id);
    }
  }
  return heldCopies;
}

// ---------------------------------------------------------------- fetch
// One archiver per fetch run. archive(src, { store, name }) fetches src.url (src.sec marks an SEC page,
// which carries the declared SEC User-Agent and is never taken from Wayback), stores the body as
// <store>/<name>.<ext> and returns the manifest record for src.id; close() removes the download folder.
export function createPageArchiver({ tmpPrefix, timeoutS }) {
  const lastHit = new Map();
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const pace = url => {
    const host = new URL(url).host;
    const gap = /archive\.org$/.test(host) ? 8000 : 1100;
    const wait = (lastHit.get(host) ?? 0) + gap - Date.now();
    if (wait > 0) sleep(wait);
    lastHit.set(host, Date.now());
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), tmpPrefix));
  const curl = (url, ua, accept) => {
    pace(url);
    const body = path.join(tmp, 'body');
    if (fs.existsSync(body)) fs.rmSync(body);
    try {
      const meta = execFileSync('curl', ['-sS', '-L', '--max-redirs', '10', '--max-time', String(timeoutS), '-A', ua,
        '-H', `Accept: ${accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/json;q=0.8,*/*;q=0.7'}`,
        '-H', 'Accept-Language: en-US,en;q=0.9', '--compressed', '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const [status, contentType, finalUrl] = meta.split('\t');
      return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
    } catch (err) {
      return { ok: false, error: String(err.stderr || err.message).trim().split('\n').pop().slice(0, 200) };
    }
  };
  const blocked = res => {
    if (!res.ok) return `fetch_error: ${res.error}`;
    if (res.status >= 400) return `http_${res.status}`;
    if (res.bytes.length < 200) return 'empty_or_truncated_body';
    const head = res.bytes.subarray(0, 20000).toString('utf8');
    if (/<title>\s*(Just a moment|Attention Required|Access denied|Request Rejected|Log in)/i.test(head) || /Undeclared Automated Tool|cf-browser-verification|_Incapsula_Resource|px-captcha/i.test(head)) return 'bot_challenge_or_login';
    return null;
  };
  const extFor = (ct, bytes, url) => {
    const c = ct.toLowerCase();
    if (c.includes('pdf') || bytes.subarray(0, 5).toString() === '%PDF-') return 'pdf';
    if (c.includes('json')) return 'json';
    if (c.includes('csv')) return 'csv';
    if (c.includes('html')) return 'html';
    if (c.includes('xml') || /\.xml$/i.test(new URL(url).pathname)) return 'xml';
    return 'txt';
  };
  function archive(src, { store, name }) {
    const at = new Date();
    const base = { receipt_id: src.id, source_url: src.url, attempted_at: isoUtc(at) };
    let res = curl(src.url, src.sec ? SEC_UA : BROWSER_UA);
    let why = blocked(res);
    let fetchUrl = src.url;
    let waybackTs = null;
    if (why && !src.sec) {
      const avail = curl(`https://archive.org/wayback/available?url=${encodeURIComponent(src.url)}`, BROWSER_UA, 'application/json');
      let ts = null;
      try { ts = avail.ok && avail.status === 200 ? JSON.parse(avail.bytes.toString('utf8'))?.archived_snapshots?.closest?.timestamp ?? null : null; } catch { ts = null; }
      if (ts) {
        const wbUrl = `http://web.archive.org/web/${ts}id_/${src.url}`;
        const wb = curl(wbUrl, BROWSER_UA);
        const wbWhy = blocked(wb);
        if (!wbWhy) { res = wb; fetchUrl = wbUrl; waybackTs = ts; base.direct_fetch_refused = why; why = null; } else why = `${why}; wayback ${wbWhy}`;
      } else why = `${why}; no_wayback_snapshot`;
    }
    if (why) {
      const failed = { ...base, fetch_url: fetchUrl, status: 'failed', reason: why, http_status: res.status ?? null };
      console.log(`failed   ${src.id} ${why}`);
      return failed;
    }
    const ext = extFor(res.contentType, res.bytes, fetchUrl);
    const rel = `${store}/${name}.${ext}`;
    fs.writeFileSync(path.join(root, rel), res.bytes);
    const sha = canonicalReceiptHash(path.join(root, rel));
    const day = localDay(at);
    const rec = {
      ...base, fetch_url: fetchUrl, status: 'archived', path: rel, retrieved_at: day, retrieved_at_utc: isoUtc(at), http_status: res.status,
      final_url: res.finalUrl, content_type: res.contentType, content_bytes: res.bytes.length, content_sha256: sha,
      archive: {
        method: 'in_repo_content_hash', ref: `sha256:${sha}`, captured: day, checked: day, fetched_url: fetchUrl,
        content_type: res.contentType, bytes: res.bytes.length,
        ...(waybackTs ? { wayback_ref: `http://web.archive.org/web/${waybackTs}/${src.url}` } : {}),
        note: waybackTs
          ? `Direct fetch of the source is refused to automated clients; hash covers the in-repository copy of the Wayback snapshot ${waybackTs} of the source URL.`
          : 'Hash covers the in-repository copy of the source body as fetched (text line endings normalised to LF for hashing); markup, scripts and later page changes are not normalised.',
      },
    };
    if (ext === 'pdf') {
      const txt = `${store}/${name}.txt`;
      execFileSync('pdftotext', ['-layout', path.join(root, rel), path.join(root, txt)]);
      // A scanned PDF with no text layer cannot be read offline, so nobody can check a name on it:
      // it is not kept in the repository. The attempt is recorded and its rows go to gaps as unread.
      if (!fs.readFileSync(path.join(root, txt), 'utf8').replace(/\s+/g, '')) {
        fs.rmSync(path.join(root, rel));
        fs.rmSync(path.join(root, txt));
        const unread = {
          ...base, fetch_url: fetchUrl, status: 'not_archived', reason: 'pdf_has_no_text_layer', retrieved_at: day, retrieved_at_utc: isoUtc(at),
          http_status: res.status, final_url: res.finalUrl, content_type: res.contentType, content_bytes: res.bytes.length,
          note: 'Fetched, but pdftotext finds no text layer (a scan), so no name on it can be checked offline; the body is not kept in the repository.',
        };
        console.log(`unread   ${src.id} ${res.bytes.length}B (pdf has no text layer; not kept)`);
        return unread;
      }
      rec.text_extract = { path: txt, sha256: canonicalReceiptHash(path.join(root, txt)), tool: 'pdftotext -layout', note: 'Derived text of the archived PDF, kept so names can be checked offline; the PDF is the receipt.' };
    }
    console.log(`archived ${src.id} ${res.bytes.length}B${waybackTs ? ` (wayback ${waybackTs})` : ''}`);
    return rec;
  }
  return { archive, close: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------- keys
// Ids drop accents and curly apostrophes (Université de Montréal -> universite-de-montreal).
export const kebab = s => slug(String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/_/g, '-'));
export const uniq = xs => [...new Set(xs)];
export const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
export const entityKey = s => norm(String(s).replace(/\bL\.\s?L\.\s?C\.?/gi, 'LLC').replace(/\bL\.\s?P\.?(?=\s|$|,)/gi, 'LP').replace(/\bLtd\.?/gi, 'Ltd'));

// ---------------------------------------------------------------- page text
export const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', ndash: '–', mdash: '—', hellip: '…', middot: '·', bull: '•',
  copy: '©', reg: '®', trade: '™', eacute: 'é', Eacute: 'É', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä',
  aring: 'å', atilde: 'ã', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï', ccedil: 'ç', ntilde: 'ñ', szlig: 'ß', Ouml: 'Ö', Uuml: 'Ü', Auml: 'Ä',
};
export const decodeEntities = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
  if (e[0] === '#') {
    const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  }
  return Object.hasOwn(NAMED, e) ? NAMED[e] : m;
});
export const stripMarkup = html => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
export const fold = s => s.replace(/[‘’‚‛′`]/g, "'").replace(/[“”„‟″]/g, '"').replace(/[  -   　]/g, ' ').replace(/[­​-‍﻿]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
export const plain = s => fold(decodeEntities(stripMarkup(s)));
export const isWordChar = c => /[\p{L}\p{N}]/u.test(c ?? '');
export function showsWords(text, words) {
  const needle = fold(decodeEntities(String(words ?? '')));
  if (!needle) return false;
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) {
    const before = i > 0 ? text[i - 1] : '';
    const after = text[i + needle.length] ?? '';
    if (!(isWordChar(needle[0]) && isWordChar(before)) && !(isWordChar(needle.at(-1)) && isWordChar(after))) return true;
  }
  return false;
}

// The text of an archived receipt for the comparison: its pdftotext extract for a PDF, its body otherwise.
export function readArchivedText(r) {
  if (r.text_extract?.path) {
    const full = path.join(root, r.text_extract.path);
    if (!fs.existsSync(full)) return { text: null, unread: 'text_extract_missing' };
    if (r.text_extract.sha256 && canonicalReceiptHash(full) !== r.text_extract.sha256) return { text: null, unread: 'text_extract_hash_mismatch' };
    const text = fold(fs.readFileSync(full, 'utf8'));
    // A scanned PDF has no text layer: pdftotext yields only page breaks, so the copy is unread.
    return text ? { text } : { text: null, unread: 'pdf_has_no_text_layer' };
  }
  if (/\.pdf$/i.test(r.path) || /pdf/i.test(r.content_type ?? '')) return { text: null, unread: 'pdf_without_text_extract' };
  return { text: plain(fs.readFileSync(path.join(root, r.path), 'utf8')) };
}
