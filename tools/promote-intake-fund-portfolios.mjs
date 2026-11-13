#!/usr/bin/env node
// Put the defense funds' own portfolio pages on the record as one dense surface per fund.
//
// Why: data/intake/person-centered-defense-routers/co-investor-edges.jsonl names, for 11 defense
// companies, the funds that list them. Those rows were refused on 2026-10-23 because their only
// receipt was a locally derived "fund portfolio census" with nothing archivable behind it. This lane
// replaces the census with the funds' own pages: each page is fetched, stored under
// receipts/fund-portfolios/ with its SHA-256 and retrieval time (plus the Wayback snapshot when one
// exists), and becomes one surface "<Fund> portfolio page as represented, <date>" with the fund as
// "investor as represented" and every listed company that already exists in
// data/canonical/organizations.json as "listed". Companies that are not yet canonical are counted in
// the surface note, not minted, except the 11 companies of co-investor-edges.jsonl.
//
// Two modes:
//   node tools/promote-intake-fund-portfolios.mjs --fetch [--refresh] [--only <fund-id>] [--no-save]
//     network: fetches each fund page (curl, browser-like User-Agent, 30 s timeout, ~1 request per
//     second per host), asks the Wayback availability API for a snapshot, and for pages whose own
//     HTML carries no listing (JavaScript-only) captures the configured fallback (sitemap, JSON
//     endpoint, or the raw Wayback body). Writes receipts/fund-portfolios/* and
//     data/ledger/staging/fund-portfolios/archived-receipts.jsonl. A capture whose file still hashes
//     to the recorded value is not refetched unless --refresh.
//   node tools/promote-intake-fund-portfolios.mjs
//     offline and deterministic (no clock, no network): reads the archive records and the stored
//     copies and writes data/ledger/staging/fund-portfolios/{surfaces,participation,receipts}.jsonl,
//     {actors,organizations}.json, gaps.jsonl and summary.json for tools/merge-staging.mjs.
//
// Admission rule (the corridor's): a listed company enters only when its name is extracted from, and
// appears in, the archived copy the surface cites; a receipt enters only when it passes the live
// receipt contract (tools/lib/receipt-contract.mjs). A fund whose page could not be archived, or whose
// archived copy yields no listing, is written to gaps.jsonl with the reason.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';

const LANE = 'fund-portfolios';
const OUT = `data/ledger/staging/${LANE}`;
const STORE = `receipts/${LANE}`;
const ARCHIVE_FILE = `${OUT}/archived-receipts.jsonl`;
const INTAKE = 'data/intake/person-centered-defense-routers';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const TIMEOUT_S = 30;

const decode = s => String(s ?? '')
  .replace(/&(?:amp|#0*38);/gi, '&').replace(/&(?:#0*39|apos|rsquo|#8217|lsquo|#8216);/gi, "'")
  .replace(/&(?:quot|#0*34);/gi, '"').replace(/&nbsp;|&#0*160;/gi, ' ').replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\\//g, '/');
const clean = s => decode(String(s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const all = (re, text, group = 1) => [...text.matchAll(re)].map(m => clean(m[group]));

// ---------------------------------------------------------------- funds
// One entry per fund. `pages` are the URLs archived for the fund (the first is the fund's own
// portfolio page; later ones are fallbacks or continuation pages). `extract(text, page)` returns the
// company names the stored copy lists; it reads only the archived bytes.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const FUNDS = [
  {
    id: 'silent-ventures', label: 'Silent Ventures', org: 'silent-ventures',
    pages: [{ url: 'https://silentvc.com/' }, { url: 'https://silentvc.com/portfolio' }],
    // Home page: the portfolio grid (JSON-LD ItemList) and the "Unicorn Ticker"; /portfolio: the full list, carried as inline JSON.
    extract: (t, page) => page === 0
      ? [...all(/"@type":\s*"Organization",\s*"name":\s*"([^"]+)"/g, t), ...all(/class="ticker-item"><span class="tk-t">([^<]+)</g, t)]
      : all(/\{"o":\s*(?:null|\[[^\]]*\]),\s*"g":\s*\d+,\s*"n":\s*"([^"]+)",\s*"d":/g, t), // inline JSON the page renders client-side
  },
  {
    id: '8vc', label: '8VC', org: '8vc',
    pages: [{ url: 'https://8vc.com/companies' }],
    extract: t => all(/fs-cmsfilter-field="name"[^>]*>([^<]+)</g, t),
  },
  {
    id: 'founders-fund', label: 'Founders Fund', org: 'founders-fund',
    pages: [{ url: 'https://foundersfund.com/portfolio/' }],
    // Entry titled "Impulse" (slug impulse); its own description in the archived copy reads "Impulse Space is ...".
    listedAs: { Impulse: { id: 'impulse-space', note: 'Listed as "Impulse"; the entry\'s own description in the archived copy names Impulse Space.' } },
    extract: t => all(/"type":"company","link":"[^"]*","title":\{"rendered":"([^"]+)"/g, t),
  },
  {
    id: 'a16z-american-dynamism', label: 'a16z American Dynamism', org: 'andreessen-horowitz',
    orgNote: 'The American Dynamism practice page is published by Andreessen Horowitz; the practice is not a separate entity in the registry, so the investor row is andreessen-horowitz.',
    pages: [{ url: 'https://a16z.com/american-dynamism/' }],
    extract: t => all(/"id":"\d+","logo_width":"[^"]*","title":"([^"]+)"/g, t),
  },
  {
    id: 'pallas-ventures', label: 'Pallas Ventures', org: null, mint: { id: 'pallas-ventures', label: 'Pallas Ventures', kind: 'fund' },
    pages: [{ url: 'https://www.pallasadvisors.com/ventures' }],
    // Logos are untitled screenshots ("Screen Shot ... .png"); the copy carries no company names.
    extract: () => [],
    emptyReason: 'logos_only_no_company_names_in_archived_copy',
  },
  {
    id: 'shield-capital', label: 'Shield Capital', org: 'shield-capital',
    // /portfolio redirects to a single company page (/company/airspace); the home page "#companies" grid is the listing.
    pages: [{ url: 'https://www.shieldcap.com/' }],
    // Only the "Featured Companies" carousel is server-rendered; the firm states 50+ portfolio companies.
    extract: t => all(/class="meta-description"><p[^>]*><strong>([^<]+)<\/strong>/g, t),
  },
  {
    id: 'lux-capital', label: 'Lux Capital', org: 'lux-capital',
    pages: [{ url: 'https://www.luxcapital.com/companies' }],
    extract: t => all(/fs-cmssort-field="name" class="company_name">([^<]+)</g, t),
  },
  {
    id: 'dcvc', label: 'DCVC', org: null, mint: { id: 'dcvc', label: 'DCVC', kind: 'fund', aliases: ['Data Collective'] },
    pages: [{ url: 'https://www.dcvc.com/companies/' }],
    extract: t => all(/class="company-card__headline">([\s\S]{1,200}?)<\/h3>/g, t),
  },
  {
    id: 'in-q-tel', label: 'In-Q-Tel', org: null, mint: { id: 'in-q-tel', label: 'In-Q-Tel', kind: 'fund', aliases: ['IQT'] },
    // Webflow list paginated 15 per page (33 pages on 2026-10-23); page 1 also carries "portfolio spotlight" case studies.
    pages: [{ url: 'https://www.iqt.org/portfolio' }, ...range(2, 33).map(n => ({ url: `https://www.iqt.org/portfolio?c6fb1237_page=${n}`, wayback: false }))],
    extract: (t, page) => [...all(/class="cl-company">([^<]+)</g, t), ...(page === 0 ? all(/class="heading-psb-content">([^<]+)</g, t) : [])],
  },
  {
    id: 'washington-harbour-partners', label: 'Washington Harbour Partners', org: null, mint: { id: 'washington-harbour-partners', label: 'Washington Harbour Partners', kind: 'fund' },
    pages: [{ url: 'https://washingtonharbour.com/investments/' }],
    extract: t => all(/investments--card__logo">\s*<img[^>]+alt="([^"]+)"/g, t),
  },
  {
    id: 'valor-equity-partners', label: 'Valor Equity Partners', org: 'valor-equity-partners',
    pages: [{ url: 'https://valorep.com/portfolio/' }],
    extract: t => all(/<h3 style="white-space:pre-wrap;">([\s\S]{1,200}?)<\/h3>/g, t),
  },
  {
    id: 'point72-ventures', label: 'Point72 Ventures', org: null, mint: { id: 'point72-ventures', label: 'Point72 Ventures', kind: 'fund' },
    pages: [{ url: 'https://p72.vc/portfolio/' }],
    extract: t => all(/class="title-wrapper">\s*<h3>([^<]+)<\/h3>/g, t),
  },
  {
    id: 'general-catalyst', label: 'General Catalyst', org: null, mint: { id: 'general-catalyst', label: 'General Catalyst', kind: 'fund' },
    // The page shows "1 / 25" pagination, but the server returns the same first page for every
    // ?8f0d97d2_page=N (checked for N = 2, 3, 25 on 2026-10-23), so only the first page is archived.
    pages: [{ url: 'https://www.generalcatalyst.com/portfolio' }],
    extract: t => all(/class="portfolio_item-link[^"]*"><h2[^>]*>([^<]+)<\/h2>/g, t),
  },
  {
    id: 'thrive-capital', label: 'Thrive Capital', org: null, mint: { id: 'thrive-capital', label: 'Thrive Capital', kind: 'fund' },
    // /companies is a 404 with no Wayback snapshot; the home page is a JavaScript shell with no listing.
    pages: [{ url: 'https://thrivecap.com/companies' }, { url: 'https://thrivecap.com/' }],
    extract: () => [],
    emptyReason: 'no_listing_companies_page_404_and_home_page_javascript_only',
  },
  {
    id: 'altimeter-capital', label: 'Altimeter Capital', org: null, mint: { id: 'altimeter-capital', label: 'Altimeter Capital', kind: 'fund' },
    pages: [{ url: 'https://www.altimeter.com/' }],
    extract: () => [],
    emptyReason: 'no_public_portfolio_listing_home_page_is_investor_login_only',
  },
  {
    id: 'texas-venture-partners', label: 'Texas Venture Partners', org: null, mint: { id: 'texas-venture-partners', label: 'Texas Venture Partners', kind: 'fund' },
    pages: [{ url: 'https://www.texasventurepartners.com/' }],
    extract: () => [],
    emptyReason: 'home_page_lists_no_portfolio_companies',
  },
];
const FUND_BY_ID = new Map(FUNDS.map(f => [f.id, f]));
const receiptIdFor = (fund, i) => `r-fund-portfolio-${fund.id}${i ? `-p${i + 1}` : ''}`;

// ================================================================= fetch mode
// A snapshot taken long before the capture does not evidence the page as captured (the corridor's
// archive tool uses the same 120-day window); it stays on record as stale_snapshot, never as the ref.
const WAYBACK_MAX_LEAD_DAYS = 120;
function waybackFresh(ts, observed) {
  const snap = Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8));
  return snap >= Date.parse(`${observed}T00:00:00Z`) - WAYBACK_MAX_LEAD_DAYS * 86400000;
}
function dropStaleWayback(rec) {
  if (!rec.wayback?.timestamp || !rec.retrieved_at || waybackFresh(rec.wayback.timestamp, rec.retrieved_at)) return rec;
  const out = { ...rec, wayback: { checked: true, timestamp: null, stale_snapshot: rec.wayback.timestamp } };
  if (out.archive?.wayback_ref) { out.archive = { ...out.archive }; delete out.archive.wayback_ref; }
  return out;
}

function fetchMode(args) {
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const REFRESH = args.includes('--refresh');
  const SAVE = !args.includes('--no-save');
  const ONLY = opt('--only');
  const lastHit = new Map();
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const pace = (url, gapMs = 1100) => {
    const host = new URL(url).host;
    const wait = (lastHit.get(host) ?? 0) + gapMs - Date.now();
    if (wait > 0) sleep(wait);
    lastHit.set(host, Date.now());
  };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fund-portfolios-'));
  const curl = (url, { accept, timeout = TIMEOUT_S, gapMs } = {}) => {
    pace(url, gapMs);
    const body = path.join(tmpDir, 'body');
    if (fs.existsSync(body)) fs.rmSync(body);
    const cmd = ['-sS', '-L', '--max-redirs', '10', '--max-time', String(timeout), '-A', UA,
      '-H', `Accept: ${accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7'}`,
      '-H', 'Accept-Language: en-US,en;q=0.9', '--compressed', '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url];
    try {
      const meta = execFileSync('curl', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const [status, contentType, finalUrl] = meta.split('\t');
      return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
    } catch (err) {
      return { ok: false, error: String(err.stderr || err.message).trim().split('\n').pop().slice(0, 200) };
    }
  };
  const blockedReason = res => {
    if (!res.ok) return `fetch_error: ${res.error}`;
    if (res.status === 401 || res.status === 403) return `http_${res.status}_refused`;
    if (res.status === 429) return 'http_429_rate_limited';
    if (res.status >= 400) return `http_${res.status}`;
    if (res.bytes.length < 200) return 'empty_or_truncated_body';
    const head = res.bytes.subarray(0, 20000).toString('utf8');
    if (/<title>\s*(Just a moment|Attention Required|Access denied|Request Rejected)/i.test(head)
        || /cf-browser-verification|challenge-platform\/h\/[bg]\/orchestrate|_Incapsula_Resource|px-captcha/i.test(head)) return 'bot_challenge';
    return null;
  };
  const extFor = (ct, url) => {
    const c = (ct || '').toLowerCase();
    if (c.includes('json')) return 'json';
    if (c.includes('html')) return 'html';
    if (c.includes('xml')) return 'xml';
    if (c.startsWith('text/')) return 'txt';
    return /\.xml(?:$|\?)/i.test(url) ? 'xml' : 'html';
  };
  const waybackAvailable = url => {
    const res = curl(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { accept: 'application/json', timeout: 40 });
    if (!res.ok || res.status !== 200) return { checked: false, error: res.error ?? `http_${res.status}` };
    try {
      const snap = JSON.parse(res.bytes.toString('utf8'))?.archived_snapshots?.closest;
      return snap?.available && /^2\d\d$/.test(String(snap.status ?? '200')) ? { checked: true, timestamp: snap.timestamp } : { checked: true, timestamp: null };
    } catch (err) { return { checked: false, error: `bad_json: ${err.message}` }; }
  };
  const waybackSave = url => {
    const res = curl(`https://web.archive.org/save/${url}`, { timeout: 120, gapMs: 6000 });
    if (!res.ok) return { requested: true, error: res.error };
    const m = /web\.archive\.org\/web\/(\d{14})\//.exec(res.finalUrl ?? '');
    return res.status < 400 && m ? { requested: true, timestamp: m[1] } : { requested: true, error: `http_${res.status}` };
  };
  const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const prior = new Map(readJsonl(ARCHIVE_FILE, { optional: true }).map(r => [r.receipt_id, r]));
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  const out = [];
  for (const fund of FUNDS) {
    fund.pages.forEach((page, i) => {
      const receipt_id = receiptIdFor(fund, i);
      const prev = prior.get(receipt_id);
      const sameUrl = prev && prev.source_url === page.url;
      if ((ONLY && fund.id !== ONLY) || (!REFRESH && sameUrl && prev.status === 'archived' && prev.archive?.method === 'in_repo_content_hash'
          && fs.existsSync(path.join(root, prev.path)) && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref)) {
        if (prev) out.push(dropStaleWayback(prev));
        return;
      }
      const rec = { receipt_id, fund_id: fund.id, page_index: i, source_url: page.url, attempted: true };
      // A page that is a JavaScript shell can be read through its raw Wayback body (id_ form).
      const fetchUrl = page.via ?? page.url;
      const res = curl(fetchUrl, page.accept ? { accept: page.accept } : {});
      const blocked = blockedReason(res);
      rec.fetch = { url: fetchUrl, status: res.status ?? null, final_url: res.finalUrl ?? null, content_type: res.contentType ?? null, ...(blocked ? { refused: blocked } : {}) };
      let capture = null;
      if (!blocked) {
        const rel = `${STORE}/${slug(receipt_id)}.${extFor(res.contentType, res.finalUrl || fetchUrl)}`;
        fs.writeFileSync(path.join(root, rel), res.bytes);
        capture = { path: rel, sha256: canonicalReceiptHash(path.join(root, rel)), bytes: res.bytes.length, content_type: res.contentType, fetched_url: fetchUrl, final_url: res.finalUrl, http_status: res.status, retrieved_at_utc: now() };
      }
      const wb = page.wayback === false ? { checked: false, error: 'not_checked_continuation_page' } : waybackAvailable(page.url);
      rec.wayback = { ...wb };
      if (!capture && !wb.timestamp && SAVE && page.wayback !== false) {
        rec.wayback.save = waybackSave(page.url);
        if (rec.wayback.save.timestamp) rec.wayback.timestamp = rec.wayback.save.timestamp;
      }
      if (rec.wayback.timestamp && !waybackFresh(rec.wayback.timestamp, now().slice(0, 10))) rec.wayback = { checked: true, timestamp: null, stale_snapshot: rec.wayback.timestamp };
      if (rec.wayback.timestamp) rec.wayback.ref = `http://web.archive.org/web/${rec.wayback.timestamp}/${page.url}`;
      if (capture) {
        const day = capture.retrieved_at_utc.slice(0, 10);
        Object.assign(rec, {
          status: 'archived', path: capture.path, retrieved_at: day, retrieved_at_utc: capture.retrieved_at_utc,
          content_type: capture.content_type, content_bytes: capture.bytes, content_sha256: capture.sha256, capture,
          archive: {
            method: 'in_repo_content_hash', ref: `sha256:${capture.sha256}`, captured: day, checked: day,
            fetched_url: fetchUrl, content_type: capture.content_type, bytes: capture.bytes,
            ...(rec.wayback.ref ? { wayback_ref: rec.wayback.ref } : {}),
            note: fetchUrl !== page.url
              ? `Hash covers the in-repository copy fetched from ${fetchUrl} for the cited page (the live page does not carry its listing in HTML).`
              : 'Hash covers the in-repository copy of the source body as fetched; markup, scripts and later page changes are not normalized.',
          },
        });
      } else if (rec.wayback.ref) {
        const ts = rec.wayback.timestamp;
        Object.assign(rec, { status: 'archived', path: page.url, retrieved_at: `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`,
          archive: { method: 'internet_archive', ref: rec.wayback.ref, captured: ts, checked: now().slice(0, 10), note: `Direct fetch refused (${rec.fetch.refused}); the Wayback snapshot is the archive.` } });
      } else {
        rec.status = 'failed';
        rec.reason = `${rec.fetch.refused ?? 'no_capture'}; ${rec.wayback.checked ? 'no_wayback_snapshot' : `wayback_check_failed (${rec.wayback.error})`}`;
      }
      out.push(rec);
      console.log(`${rec.status.padEnd(8)} ${receipt_id} ${rec.archive?.method ?? rec.reason}${rec.content_bytes ? ` ${rec.content_bytes}B` : ''}${rec.wayback.ref ? ' +wayback' : ''}`);
    });
  }
  writeJsonl(ARCHIVE_FILE, out);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`fund-portfolios --fetch: ${out.length} pages; archived ${out.filter(r => r.status === 'archived').length}, failed ${out.filter(r => r.status === 'failed').length}`);
}

if (process.argv.includes('--fetch')) {
  fetchMode(process.argv.slice(2));
  process.exit(0);
}

// ================================================================= promote mode (offline)
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const SUFFIX = /(?:incorporated|inc|llc|corporation|corp|co|ltd|limited|technologies|technology|industries|systems|labs)$/;
const strip = s => { let n = norm(s); for (let i = 0; i < 2; i += 1) { const m = n.replace(SUFFIX, ''); if (m.length >= 4) n = m; } return n; };
// A suffix-insensitive match needs one side to be the bare name ("Palantir" / "Palantir Technologies"),
// never two different suffixes ("Quantum Systems" / "Quantum Corporation"), and a base of 6+ characters.
const uniq = xs => [...new Set(xs)];

const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorIds = new Set(readJson('data/canonical/actors.json').actors.map(a => a.id));
const densityMax = readJson('data/canonical/surface-types.json').density_policy.max_hop_actor_count;
const ledgerSurfaces = readJsonl('data/ledger/surfaces.jsonl');
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(r => [r.receipt_id, JSON.stringify(r)]));
// First canonical id wins for a label (file order), so a rerun resolves identically.
const byLabel = new Map();
const byStripped = new Map();
for (const o of canonOrgs) {
  if (!byLabel.has(norm(o.label))) byLabel.set(norm(o.label), o.id);
  for (const a of o.aliases ?? []) if (!byLabel.has(norm(a))) byLabel.set(norm(a), o.id);
  const k = strip(o.label);
  if (!byStripped.has(k)) byStripped.set(k, new Set());
  byStripped.get(k).add(o.id);
}
for (const x of readJson('data/canonical/aliases.json').aliases) {
  if (x.kind === 'organization' && canonOrgById.has(x.canonical_id) && !byLabel.has(norm(x.alias))) byLabel.set(norm(x.alias), x.canonical_id);
}

// The 11 companies of co-investor-edges.jsonl (the refused cap-table rows) may be minted; their
// listed short names resolve to the registry ids explicitly (exact-label matching would miss them).
const coEdges = readJsonl(`${INTAKE}/co-investor-edges.jsonl`);
const COMPANY_IDS = {
  Anduril: 'anduril-industries', Palantir: 'palantir', 'Palantir Technologies': 'palantir', Varda: 'varda-space-industries',
  'Varda Space': 'varda-space-industries', 'Varda Space Industries': 'varda-space-industries', SpaceX: 'spacex',
  Saronic: 'saronic', 'Saronic Technologies': 'saronic', Hadrian: 'hadrian', 'Hadrian Automation': 'hadrian',
  'Impulse Space': 'impulse-space', Firestorm: 'firestorm', 'Firestorm Labs': 'firestorm', Epirus: 'epirus',
  Traysar: 'traysar', 'Chariot Defense': 'chariot-defense', Chariot: 'chariot-defense',
  'Shield AI': 'shield-ai', Castelion: 'castelion', 'X-Bow Systems': 'x-bow-systems', 'X-Bow': 'x-bow-systems',
  CHAOS: 'chaos-industries', 'CHAOS Industries': 'chaos-industries',
};
const MINTABLE = new Map([['chariot-defense', { id: 'chariot-defense', label: 'Chariot Defense', kind: 'company' }]]);
const explicit = new Map(Object.entries(COMPANY_IDS).map(([k, v]) => [norm(k), v]));
const FOCUS = ['anduril-industries', 'palantir', 'shield-ai', 'saronic', 'castelion', 'hadrian', 'x-bow-systems', 'chaos-industries',
  'epirus', 'impulse-space', 'firestorm', 'spacex', 'varda-space-industries', 'chariot-defense', 'traysar'];

function resolveCompany(name, fund = null) {
  const n = norm(name);
  const own = fund?.listedAs && Object.entries(fund.listedAs).find(([k]) => norm(k) === n)?.[1];
  if (own && canonOrgById.has(own.id)) return { id: own.id, how: 'fund_entry_description', note: own.note };
  if (explicit.has(n)) {
    const id = explicit.get(n);
    if (canonOrgById.has(id)) return { id, how: 'explicit' };
    if (MINTABLE.has(id)) return { id, how: 'minted', mint: MINTABLE.get(id) };
  }
  if (byLabel.has(n)) return { id: byLabel.get(n), how: 'label' };
  const s = strip(name);
  if (s.length >= 6 && byStripped.has(s) && byStripped.get(s).size === 1) {
    const id = [...byStripped.get(s)][0];
    if (s === n || norm(canonOrgById.get(id).label) === s) return { id, how: 'label_without_corporate_suffix' };
  }
  return null;
}

const NOT_A_NAME = /^(?:logo|image|icon|portfolio|companies|view|read more|learn more|menu|close|home|search|.*\.(?:png|jpe?g|svg|gif|webp))$/i;
const archiveRecs = new Map(readJsonl(ARCHIVE_FILE, { optional: true }).map(r => [r.receipt_id, r]));
const copyCache = new Map();
const rawCopy = rel => { if (!copyCache.has(rel)) copyCache.set(rel, fs.readFileSync(path.join(root, rel), 'utf8')); return copyCache.get(rel); };
const textCache = new Map();
const copyText = rel => { if (!textCache.has(rel)) textCache.set(rel, norm(decode(rawCopy(rel).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')))); return textCache.get(rel); };

function limitsFor(fund, page) {
  const base = "A fund's portfolio page lists companies as the fund represents them on the retrieval date; it does not show investment dates, amounts, ownership stakes, lead roles, which vehicle invested, or whether the position is still held, and companies may be omitted or retained after exit.";
  if (fund.pages[page].wayback === false) return `${base} This is one continuation page of a paginated listing; the full listing is the set of pages cited together.`;
  return base;
}

const surfaces = [];
const participation = [];
const receipts = [];
const gaps = [];
const newOrgs = new Map();
const fundSummaries = [];
const capTable = new Map(FOCUS.map(id => [id, []]));
const SELF = 'tools/promote-intake-fund-portfolios.mjs';

for (const fund of FUNDS) {
  const fundLabel = fund.label;
  const recs = fund.pages.map((p, i) => archiveRecs.get(receiptIdFor(fund, i)) ?? { receipt_id: receiptIdFor(fund, i), source_url: p.url, status: 'not_attempted', reason: 'no_archive_record (run --fetch)' });
  const fsum = { fund_id: fund.id, fund: fundLabel, pages: recs.map(r => ({ receipt_id: r.receipt_id, url: r.source_url, status: r.status, ...(r.reason ? { reason: r.reason } : {}), ...(r.fetch?.final_url && r.fetch.final_url !== r.source_url ? { final_url: r.fetch.final_url } : {}), ...(r.wayback?.ref ? { wayback: r.wayback.ref } : {}), ...(r.archive?.method === 'in_repo_content_hash' ? { path: r.path, sha256: r.content_sha256 } : {}) })) };
  fundSummaries.push(fsum);
  // Receipts: every archived page that passes the live contract.
  const okRecs = [];
  for (const [i, r] of recs.entries()) {
    if (r.status !== 'archived') continue;
    const cand = {
      receipt_id: r.receipt_id,
      label: `${fundLabel} portfolio page${fund.pages.length > 1 ? ` (page ${i + 1} of ${fund.pages.length} archived)` : ''}, retrieved ${r.retrieved_at}`,
      source_type: 'fund_portfolio_page',
      evidence_class: 'primary_public',
      path: r.path,
      source_url: r.source_url,
      retrieved_at: r.retrieved_at,
      ...(r.content_sha256 ? { content_sha256: r.content_sha256, content_type: r.content_type, content_bytes: r.content_bytes } : {}),
      notes: `The fund's own portfolio page, archived ${r.retrieved_at} by ${SELF} --fetch.${r.fetch?.final_url && r.fetch.final_url !== r.source_url ? ` Final URL after redirects: ${r.fetch.final_url}.` : ''}`,
      limits: limitsFor(fund, i),
      archive: r.archive,
      lane_source: SELF,
    };
    if (cand.limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${cand.receipt_id}`);
    const { errors } = checkReceiptContract([cand], { root });
    const collide = ledgerReceipts.has(cand.receipt_id) && ledgerReceipts.get(cand.receipt_id) !== JSON.stringify(cand);
    if (errors.length || collide) {
      gaps.push({ lane: LANE, fund_id: fund.id, row_key: cand.receipt_id, reason: collide ? 'receipt_id_collides_with_existing_ledger_receipt' : 'receipt_contract_failed', errors: errors.map(e => `${e.check}: ${e.message}`) });
      continue;
    }
    okRecs.push({ rec: r, cand, page: i });
  }
  if (!okRecs.length) {
    fsum.outcome = 'no_archived_page';
    gaps.push({ lane: LANE, fund_id: fund.id, row_key: fund.id, reason: 'fund_page_not_archived', attempts: fsum.pages });
    continue;
  }
  // Listed names, extracted from the archived bytes only.
  const listed = [];
  for (const { rec, page } of okRecs) {
    if (rec.archive.method !== 'in_repo_content_hash') continue;
    for (const raw of fund.extract(rawCopy(rec.path), page)) {
      const name = raw.trim();
      if (name.length < 2 || name.length > 60 || NOT_A_NAME.test(name) || !norm(name) || norm(name) === norm(fundLabel)) continue;
      listed.push({ name, receipt_id: rec.receipt_id, path: rec.path });
    }
  }
  const byNorm = new Map();
  for (const l of listed) if (!byNorm.has(norm(l.name))) byNorm.set(norm(l.name), l);
  const names = [...byNorm.values()];
  fsum.listed_count = names.length;
  if (!names.length) {
    fsum.outcome = 'archived_but_no_listing_extracted';
    fsum.reason = fund.emptyReason ?? 'no_company_names_extracted_from_archived_copy';
    gaps.push({ lane: LANE, fund_id: fund.id, row_key: fund.id, reason: fsum.reason, receipts: okRecs.map(o => o.cand.receipt_id) });
    continue;
  }
  const date = okRecs[0].rec.retrieved_at;
  const sid = `fund-portfolio-page-${fund.id}-${date}`;
  if (ledgerSurfaces.some(s => s.surface_id === sid && s.lane_source !== SELF)) throw new Error(`surface id collides with ledger: ${sid}`);
  // Fund participant: the registry id when one exists, otherwise minted (funds are the subject of the lane).
  let fundOrg = fund.org && canonOrgById.has(fund.org) ? fund.org : null;
  if (!fundOrg) {
    const hit = resolveCompany(fundLabel);
    if (hit && hit.how !== 'minted') fundOrg = hit.id;
    else {
      if (canonActorIds.has(fund.mint.id)) throw new Error(`refusing to mint organization ${fund.mint.id}: the id names an actor`);
      fundOrg = fund.mint.id;
      newOrgs.set(fundOrg, { id: fundOrg, label: fund.mint.label, kind: fund.mint.kind, source: LANE, ...(fund.mint.aliases ? { aliases: fund.mint.aliases } : {}) });
    }
  }
  const usedRids = new Set();
  const parts = [];
  const matched = [];
  const unmatched = [];
  for (const l of names) {
    const hit = resolveCompany(l.name, fund);
    if (!hit || hit.id === fundOrg) { unmatched.push(l.name); continue; }
    // Admission: the listed name must appear in the archived copy the row cites.
    if (!copyText(l.path).includes(norm(l.name))) {
      gaps.push({ lane: LANE, fund_id: fund.id, row_key: `${fund.id}:${l.name}`, reason: 'company_name_not_in_archived_copy' });
      continue;
    }
    if (parts.some(p => p.organization_id === hit.id)) continue; // two listed spellings of one registry entity
    if (hit.how === 'minted') newOrgs.set(hit.id, { ...hit.mint, source: LANE });
    usedRids.add(l.receipt_id);
    const regLabel = canonOrgById.get(hit.id)?.label ?? hit.mint?.label;
    matched.push({ name: l.name, id: hit.id, how: hit.how });
    parts.push({
      surface_id: sid, participant_type: 'organization', organization_id: hit.id, role: 'listed', participation_type: 'listed_portfolio_company',
      time_start: date, time_end: date, evidence_class: 'primary_public', receipt_ids: [l.receipt_id],
      ...(hit.note ? { notes: hit.note } : norm(l.name) !== norm(regLabel) ? { notes: `Listed as "${l.name}".` } : {}),
    });
    if (capTable.has(hit.id)) capTable.get(hit.id).push({ fund: fundLabel, fund_id: fund.id, listed_as: l.name, receipt_id: l.receipt_id, surface_id: sid });
  }
  const pageRids = okRecs.map(o => o.cand.receipt_id);
  const surfaceRids = uniq([pageRids[0], ...pageRids.filter(r => usedRids.has(r))]);
  for (const o of okRecs) if (surfaceRids.includes(o.cand.receipt_id)) receipts.push(o.cand);
  const dense = names.length >= densityMax + 1;
  surfaces.push({
    surface_id: sid,
    surface_label: `${fundLabel} portfolio page as represented, ${date}`,
    surface_type: 'directory_roster_surface',
    secondary_surface_types: ['surface_factory_capital_layer', 'employment_investment_surface'],
    hop_eligible: false,
    hop_refusal_reason: dense ? 'dense_roster_density_policy' : 'organization_only_portfolio_listing',
    scorable: true,
    status: 'public_portfolio_listing',
    bounded_by: ['fund own portfolio page as archived'],
    time_start: date, time_end: date,
    evidence_class: 'primary_public',
    receipt_ids: surfaceRids,
    notes: `${fundLabel}'s own portfolio page lists ${names.length} companies in the archived copy${okRecs.length > 1 ? ` (${okRecs.length} pages archived; pages contributing no registry row are archived but not cited)` : ''}; ${matched.length} already exist in the organization registry and are rows here, ${unmatched.length} are not yet canonical and are counted here only, not minted. ${fund.orgNote ? `${fund.orgNote} ` : ''}Identity is by exact listed name against the registry (corporate suffixes ignored), not by legal record. A listing is the fund's own claim: it is not investment terms, amount, date, ownership, control, or current holding, and shared listing across funds is not coordination between them. Observation dated by the receipt's retrieval date (${date}).`,
    date_basis: 'record_retrieval_date',
    listed_company_count: names.length,
    listed_canonical_count: matched.length,
    listed_not_canonical_count: unmatched.length,
    roster_entry_count: parts.length + 1,
    lane_source: SELF,
  });
  participation.push({
    surface_id: sid, participant_type: 'organization', organization_id: fundOrg, role: 'investor as represented', participation_type: 'investor',
    time_start: date, time_end: date, evidence_class: 'primary_public', receipt_ids: [pageRids[0]],
    notes: 'Publisher of the portfolio page; the listing is its own representation of its investments.',
  }, ...parts);
  Object.assign(fsum, { outcome: 'staged', surface_id: sid, fund_organization_id: fundOrg, dense, listed_canonical: matched.length, listed_not_canonical: unmatched.length, matched, unmatched });
}

// Census check: which co-investor-edges claims the archived pages confirm.
const fundIdByLabel = new Map(FUNDS.map(f => [norm(f.label), f.id]));
const census = coEdges.map(e => {
  const id = resolveCompany(e.company)?.id ?? null;
  const confirmed = uniq((capTable.get(id) ?? []).map(x => x.fund));
  const claimed = e.funds.map(f => f.replace(/\s*\(.*\)$/, ''));
  return { company: e.company, organization_id: id, census_funds: e.funds, funds_whose_archived_page_lists_it: confirmed,
    census_claims_not_confirmed: claimed.filter(f => !confirmed.some(c => norm(c) === norm(f))).map(f => ({ fund: f, attempted: fundIdByLabel.has(norm(f)) })) };
});
for (const c of census) for (const miss of c.census_claims_not_confirmed) {
  gaps.push({ lane: LANE, row_key: `${c.company}:${miss.fund}`, reason: miss.attempted ? 'census_claim_not_shown_on_archived_fund_page' : 'census_claim_fund_page_not_in_scope', company: c.company, fund: miss.fund });
}

const usedOrg = new Set(participation.map(p => p.organization_id));
const orgsOut = [...newOrgs.values()].filter(o => usedOrg.has(o.id)).sort((a, b) => a.id.localeCompare(b.id));
writeJsonl(`${OUT}/surfaces.jsonl`, surfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: [] });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: SELF,
  admission_rule: 'One surface per fund whose own portfolio page is archived under receipts/fund-portfolios/ (SHA-256, retrieval date, Wayback snapshot when available) and passes the receipt contract. Listed companies are rows only when they already exist in the organization registry (or are one of the 11 co-investor-edges companies) and their name, extracted from the archived bytes, appears in the archived copy. Others are counted in the surface note.',
  staged: { surfaces: surfaces.length, participation: participation.length, receipts: receipts.length, new_organizations: orgsOut.length, gaps: gaps.length },
  funds: fundSummaries,
  cap_tables_as_recorded: Object.fromEntries(capTable),
  census_check: census,
});
console.log(`promote-intake-fund-portfolios: ${surfaces.length} surfaces, ${participation.length} participation rows, ${receipts.length} receipts, ${orgsOut.length} organizations staged; ${gaps.length} gaps.`);
for (const f of fundSummaries) console.log(`  ${f.fund_id.padEnd(28)} ${String(f.outcome).padEnd(34)} listed ${f.listed_count ?? '-'} canonical ${f.listed_canonical ?? '-'}`);
