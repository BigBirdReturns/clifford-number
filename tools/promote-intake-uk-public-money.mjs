#!/usr/bin/env node
// Put the UK public-money leg of the Faculty / Clifford estate on the ledger, with receipts.
//
//   node tools/promote-intake-uk-public-money.mjs --fetch [--refresh]   # network: archive sources
//   node tools/promote-intake-uk-public-money.mjs                       # offline: stage ledger rows
//
// Fetch mode (network, curl, browser-like User-Agent, 30 s timeout, about one request per second
// per host) archives every official source this lane cites under receipts/uk-public-money/ and
// records one line per source in data/ledger/staging/uk-public-money/archived-receipts.jsonl
// (path, canonical SHA-256 as tools/lib/receipt-archival.mjs computes it, retrieved_at, HTTP
// status, final URL, or the failure reason). Sources:
//   1. Contracts Finder public search API (POST /api/rest/2/search_notices/json) for the supplier
//      names Faculty Science / Faculty AI / Faculty, Electric Twin, Entrepreneur First and
//      ASI Data Science; the JSON responses are kept as custody copies, and every awarded notice
//      whose named supplier is one of those companies, awarded 2019-01-01 or later, is fetched as
//      its public notice page (https://www.contractsfinder.service.gov.uk/Notice/<id>);
//   2. GOV.UK pages for the AI Opportunities Action Plan follow-on programmes and for Faculty's
//      government roles outside contracts (publication landing pages plus their HTML attachment);
//   3. Companies House public register pages for Faculty Science Ltd (08873131): filing history,
//      persons with significant control, officers;
//   4. DSIT "spending over £25,000" transparency CSVs (2023, 2024, 2025 publications); a CSV is
//      stored only when it carries a payment to a Faculty-named supplier.
// A source already archived with a matching file hash is not refetched unless --refresh.
//
// Promote mode is deterministic (no clock, no network): it reads the archive records and the
// custody copies and writes data/ledger/staging/uk-public-money/{surfaces,participation,
// receipts}.jsonl, {actors,organizations}.json, gaps.jsonl and summary.json in the shapes that
// tools/merge-staging.mjs merges. Award facts (buyer, title, award date, value, reference,
// supplier, Companies House number) are parsed from the archived notice page itself, so a reader
// can check every staged figure against the custody copy. A row whose receipt fails the live
// receipt contract (tools/lib/receipt-contract.mjs) or whose stated facts are not shown in the
// archived copy goes to gaps.jsonl with the reason and its would-be rows.
//
// Money fields: an award's contract value is `funding_amount_gbp` on the supplier participation
// row and the surface (the awarded total value on the notice; a ceiling, not an outlay). A DSIT
// transparency payment is `payment_amount_gbp` (money actually paid), kept apart so that awards
// and payments against them are never summed together. Framework places carry no amount.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract } from './lib/receipt-contract.mjs';

const LANE = 'uk-public-money';
const OUT = `data/ledger/staging/${LANE}`;
const STORE = `receipts/${LANE}`;
const ARCHIVE_FILE = `${OUT}/archived-receipts.jsonl`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const TIMEOUT_S = 30;
const CF = 'https://www.contractsfinder.service.gov.uk';
const CF_SEARCH = `${CF}/api/rest/2/search_notices/json`;
const CH = 'https://find-and-update.company-information.service.gov.uk/company/08873131';
const GOV = 'https://www.gov.uk';

const args = process.argv.slice(2);
const FETCH = args.includes('--fetch');
const REFRESH = args.includes('--refresh');

// ---------------------------------------------------------------- source manifest
// Supplier names searched on Contracts Finder, and the exact supplier-name forms admitted as the
// company (case-insensitive, after HTML entity decoding). "Entrepreneur First CIC T/A Code First
// Girls" is a different legal entity from Entrepreneur First Operations Ltd and is not admitted.
const CF_KEYWORDS = ['Faculty Science', 'Faculty AI', 'Faculty', 'ASI Data Science', 'Electric Twin', 'Entrepreneur First'];
const SUPPLIERS = [
  { org: 'faculty', re: /^(?:faculty science(?: ltd\.?| limited)?|faculty ai|faculty|asi data science(?: ltd\.?| limited)?)$/i, companyNumber: '08873131' },
  { org: 'electric-twin', re: /^electric twin(?: ltd\.?| limited)?$/i, companyNumber: null },
  { org: 'entrepreneur-first', re: /^entrepreneur first operations(?: ltd\.?| limited)?$/i, companyNumber: null },
];
const AWARD_WINDOW_START = '2019-01-01';

// GOV.UK and other official pages. `pub: true` = a publication landing page whose first HTML
// attachment is fetched as a second receipt (key + '-html').
const PAGES = [
  // AI Opportunities Action Plan follow-on programmes
  { key: 'govuk-clifford-ai-opportunities-adviser-2025-01-13', url: `${GOV}/government/news/appointment-of-matt-clifford-cbe-as-the-ai-opportunities-adviser` },
  { key: 'govuk-ai-growth-zones-starting-gun-2025-02-10', url: `${GOV}/government/news/government-fires-starting-gun-on-ai-growth-zones-to-turbocharge-plan-for-change` },
  { key: 'govuk-ai-energy-council-announced-2025-04-07', url: `${GOV}/government/news/ai-energy-council-to-ensure-uks-energy-infrastructure-ready-for-ai-revolution` },
  { key: 'govuk-ai-growth-zone-delivery-2025-04-29', url: `${GOV}/government/news/investors-and-local-authorities-gear-up-as-ai-growth-zone-delivery-gathers-speed` },
  { key: 'govuk-national-supercomputer-edinburgh-2025-06-10', url: `${GOV}/government/news/scotland-to-host-uks-national-supercomputer-as-chancellor-confirms-750-million-investment` },
  { key: 'govuk-compute-roadmap-sovereign-ai-2025-07-16', url: `${GOV}/government/news/engines-of-ai-primed-to-accelerate-new-breakthroughs-economic-growth-and-transform-the-uk-into-an-ai-maker` },
  { key: 'govuk-uk-compute-roadmap', url: `${GOV}/government/publications/uk-compute-roadmap`, pub: true },
  { key: 'govuk-north-east-ai-growth-zone-2025-09-24', url: `${GOV}/government/news/north-east-ai-growth-zone-taskforce-launched-to-accelerate-jobs-skills-and-growth` },
  { key: 'govuk-ai-growth-zone-north-wales-2025-11-13', url: `${GOV}/government/news/ai-growth-zones-to-create-thousands-of-jobs-and-unlock-up-to-100-billion-in-investment-as-new-site-confirmed-for-north-wales` },
  { key: 'govuk-delivering-ai-growth-zones-2025-11-13', url: `${GOV}/government/publications/delivering-ai-growth-zones`, pub: true },
  { key: 'govuk-action-plan-one-year-on-2026-01-29', url: `${GOV}/government/publications/ai-opportunities-action-plan-one-year-on`, pub: true },
  { key: 'govuk-lanarkshire-ai-growth-zone-2026-02-03', url: `${GOV}/government/news/more-than-3400-jobs-and-targeted-support-for-local-communities-to-help-tackle-the-cost-of-living-as-lanarkshire-named-latest-ai-growth-zone` },
  { key: 'govuk-sovereign-ai-first-backing-2026-04-16', url: `${GOV}/government/news/ai-firms-pioneering-drug-discovery-cheaper-supercomputing-and-more-get-first-backing-through-uks-sovereign-ai` },
  { key: 'govuk-ai-energy-council-minutes', url: `${GOV}/government/publications/ai-energy-council-meetings-minutes`, pub: true },
  // Faculty's government roles outside contract notices
  { key: 'healthtech-power-of-data-in-a-pandemic-2020-03-28', url: 'https://healthtech.blog.gov.uk/2020/03/28/the-power-of-data-in-a-pandemic/' },
  { key: 'govuk-frontier-ai-taskforce-technical-organisations-2023-10-17', url: `${GOV}/government/news/frontier-ai-taskforcebrings-in-leading-technical-organisations-to-research-risks` },
  { key: 'govuk-frontier-ai-taskforce-second-progress-report-2023-10-30', url: `${GOV}/government/publications/frontier-ai-taskforce-second-progress-report`, pub: true },
  { key: 'govuk-dfe-ai-hackathon-2023-10-09', url: `${GOV}/government/news/first-ever-hackathon-in-education-to-explore-ai` },
  { key: 'govuk-dfe-ai-education-research-2023-11-28', url: `${GOV}/government/news/new-research-paves-way-for-artificial-intelligence-in-education` },
  // Companies House register pages
  { key: 'ch-faculty-filing-history-p1', url: `${CH}/filing-history` },
  { key: 'ch-faculty-filing-history-p2', url: `${CH}/filing-history?page=2` },
  { key: 'ch-faculty-filing-history-p3', url: `${CH}/filing-history?page=3` },
  { key: 'ch-faculty-psc', url: `${CH}/persons-with-significant-control` },
  { key: 'ch-faculty-officers', url: `${CH}/officers` },
];
const SPEND_PUBS = [
  { key: 'dsit-spend-2023', url: `${GOV}/government/publications/dsit-spending-over-25000-in-2023` },
  { key: 'dsit-spend-2024', url: `${GOV}/government/publications/dsit-spending-over-25000-in-2024` },
  { key: 'dsit-spend-2025', url: `${GOV}/government/publications/dsit-spending-over-25000-in-2025` },
];
const FACULTY_PAYEE = /^\s*"?faculty(?: science)?(?: ltd\.?| limited)?"?\s*$/i;

// ---------------------------------------------------------------- shared helpers
const decode = s => String(s ?? '')
  .replace(/&amp;/g, '&').replace(/&#0*39;|&apos;|&rsquo;|&#8217;/g, "'").replace(/&quot;/g, '"')
  .replace(/&pound;/g, '£').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#8208;|&#8211;|&ndash;/g, '-').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const htmlText = html => decode(String(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9£]/g, '');
const uniq = xs => [...new Set(xs)];
const MONTHS = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
function isoFromLong(s) {
  const m = /(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/i.exec(s ?? '');
  return m ? `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}` : null;
}
const gbp = n => `£${Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;

// ================================================================ FETCH MODE
if (FETCH) {
  const prev = new Map(readJsonl(ARCHIVE_FILE, { optional: true }).map(r => [r.key, r]));
  const records = new Map();
  const lastHit = new Map();
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const pace = url => {
    const host = new URL(url).host;
    const wait = (lastHit.get(host) ?? 0) + (host === new URL(CF).host ? 2500 : 1100) - Date.now();
    if (wait > 0) sleep(wait);
    lastHit.set(host, Date.now());
  };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ukpm-'));
  function curl(url, { body, accept } = {}) {
    pace(url);
    const out = path.join(tmpDir, 'body');
    if (fs.existsSync(out)) fs.rmSync(out);
    const cmd = ['-sS', '-L', '--max-redirs', '10', '--max-time', String(TIMEOUT_S), '-A', UA,
      '-H', `Accept: ${accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,text/csv;q=0.8,*/*;q=0.7'}`,
      '-H', 'Accept-Language: en-GB,en;q=0.9', '--compressed', '-o', out, '-w', '%{http_code}\t%{content_type}\t%{url_effective}'];
    if (body !== undefined) cmd.push('-X', 'POST', '-H', 'Content-Type: application/json', '--data-binary', JSON.stringify(body));
    cmd.push(url);
    try {
      const meta = execFileSync('curl', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const [status, contentType, finalUrl] = meta.split('\t');
      return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(out) ? fs.readFileSync(out) : Buffer.alloc(0) };
    } catch (err) {
      return { ok: false, reason: `curl_failed: ${String(err.stderr || err.message).trim().slice(0, 200)}` };
    }
  }
  const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  function cached(key) {
    const p = prev.get(key);
    if (REFRESH || !p || p.status !== 'archived') return null;
    const full = path.join(root, p.path);
    if (!fs.existsSync(full) || canonicalReceiptHash(full) !== p.content_sha256) return null;
    return p;
  }
  // Fetch url into STORE/<key>.<ext>; returns the archive record (and records it).
  function archive(key, url, { kind, body, accept, ext, keep = () => true, extra = {} } = {}) {
    const hit = cached(key);
    if (hit) { records.set(key, hit); return hit; }
    let r = curl(url, { body, accept });
    // Contracts Finder answers bursts with HTTP 429: back off and retry, up to three times.
    for (let attempt = 1; r.ok && r.status === 429 && attempt <= 3; attempt += 1) {
      sleep(20000 * attempt);
      r = curl(url, { body, accept });
    }
    let rec;
    if (!r.ok) rec = { key, kind, url, status: 'failed', reason: r.reason, attempted_at: nowIso() };
    else if (r.status >= 400 || r.bytes.length === 0) rec = { key, kind, url, status: 'failed', reason: `http_${r.status}${r.bytes.length ? '' : '_empty_body'}`, attempted_at: nowIso() };
    else if (/captcha|cf-challenge|access denied|are you a robot/i.test(r.bytes.subarray(0, 4000).toString('utf8'))) rec = { key, kind, url, status: 'failed', reason: 'bot_challenge_or_block_page', attempted_at: nowIso() };
    else {
      const e = ext ?? (/json/.test(r.contentType) ? 'json' : /csv/.test(r.contentType) ? 'csv' : /pdf/.test(r.contentType) ? 'pdf' : 'html');
      if (!keep(r.bytes)) {
        rec = { key, kind, url, status: 'searched_not_kept', reason: 'no_matching_rows', http_status: r.status, retrieved_at: nowIso(), content_bytes: r.bytes.length };
      } else {
        const rel = `${STORE}/${key}.${e}`;
        const full = path.join(root, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, r.bytes);
        rec = { key, kind, url, status: 'archived', path: rel, retrieved_at: nowIso(), content_sha256: canonicalReceiptHash(full), content_type: r.contentType, content_bytes: r.bytes.length, http_status: r.status, final_url: r.finalUrl };
      }
    }
    Object.assign(rec, extra);
    records.set(key, rec);
    console.log(`${rec.status.padEnd(18)} ${key}${rec.reason ? ` (${rec.reason})` : ''}`);
    return rec;
  }
  const readStored = rec => (rec?.status === 'archived' ? fs.readFileSync(path.join(root, rec.path), 'utf8') : null);

  // 1. Contracts Finder search, then each admitted notice page.
  const noticeIds = new Map();
  for (const kw of CF_KEYWORDS) {
    const body = { searchCriteria: { keyword: `"${kw}"`, statuses: ['Awarded'] }, size: 1000 };
    const rec = archive(`cf-search-${slug(kw)}`, CF_SEARCH, { kind: 'cf_search', body, accept: 'application/json', ext: 'json', extra: { request_body: body } });
    const text = readStored(rec);
    if (!text) continue;
    for (const h of JSON.parse(text).noticeList ?? []) {
      const it = h.item;
      const names = decode(it.awardedSupplier ?? '').split(',').map(s => s.trim());
      if (!names.some(n => SUPPLIERS.some(s => s.re.test(n)))) continue;
      if ((it.awardedDate ?? it.publishedDate ?? '').slice(0, 10) < AWARD_WINDOW_START) continue;
      noticeIds.set(it.id, it.noticeIdentifier ?? null);
    }
  }
  for (const id of [...noticeIds.keys()].sort()) archive(`cf-notice-${id}`, `${CF}/Notice/${id}`, { kind: 'cf_notice', ext: 'html' });

  // 2 and 3. Official pages (publication landing pages also fetch their first HTML attachment).
  for (const p of PAGES) {
    const rec = archive(p.key, p.url, { kind: p.key.startsWith('ch-') ? 'companies_house' : 'official_page', ext: 'html' });
    if (!p.pub) continue;
    const html = readStored(rec);
    const pathname = new URL(p.url).pathname;
    const child = html && new RegExp(`href="(${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[a-z0-9-]+)"`, 'i').exec(html)?.[1];
    if (child) archive(`${p.key}-html`, `${GOV}${child}`, { kind: 'official_page', ext: 'html' });
    else records.set(`${p.key}-html`, { key: `${p.key}-html`, kind: 'official_page', url: p.url, status: 'failed', reason: 'no_html_attachment_link_on_landing_page', attempted_at: nowIso() });
  }

  // 4. DSIT spending over £25,000: keep a CSV only when it names a Faculty payee.
  for (const sp of SPEND_PUBS) {
    const rec = archive(sp.key, sp.url, { kind: 'spend_publication', ext: 'html' });
    const html = readStored(rec);
    if (!html) continue;
    const csvs = uniq([...html.matchAll(/href="(https:\/\/assets\.publishing\.service\.gov\.uk\/[^"]+\.csv)"/gi)].map(m => m[1]));
    for (const u of csvs) {
      const base = slug(path.basename(new URL(u).pathname, '.csv'));
      archive(`${sp.key}-${base}`.slice(0, 120), u, {
        kind: 'spend_csv', ext: 'csv', accept: 'text/csv,*/*;q=0.5', extra: { publication_key: sp.key },
        keep: bytes => bytes.toString('utf8').split(/\r?\n/).some(line => line.split(',').some(cell => FACULTY_PAYEE.test(cell))),
      });
    }
  }
  const rows = [...records.values()].sort((a, b) => a.key.localeCompare(b.key));
  writeJsonl(ARCHIVE_FILE, rows);
  const by = rows.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log(`promote-intake-uk-public-money --fetch: ${rows.length} sources (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}) -> ${ARCHIVE_FILE}`);
  process.exit(0);
}

// ================================================================ PROMOTE MODE
// ---------------------------------------------------------------- canonical state
// Rows this lane already merged are not "existing state": a rerun after a merge restages them
// identically and merge-staging skips them as already present.
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const densityMax = readJson('data/canonical/surface-types.json').density_policy.max_hop_actor_count;
const ledgerSurfaceIds = new Set(readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== LANE).map(s => s.surface_id));
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').filter(r => r.intake_source !== LANE).map(r => [r.receipt_id, r]));
const canonOrgByLabel = new Map(canonOrgs.map(o => [norm(o.label), o]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
const canonAliases = readJson('data/canonical/aliases.json').aliases;
const orgAlias = new Map(canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

const newOrgs = new Map();
// Existing ids are reused (canonical id, label, or alias) before anything is minted; an id that
// names a person is never minted as an organization.
function ensureOrg(label, kind, id = slug(label)) {
  if (canonOrgById.has(id)) return id;
  const hit = canonOrgByLabel.get(norm(label));
  if (hit) return hit.id;
  if (orgAlias.has(norm(label))) return orgAlias.get(norm(label));
  if (canonActorById.has(id)) throw new Error(`refusing to mint organization ${id}: the id names an actor`);
  if (!newOrgs.has(id)) newOrgs.set(id, { id, label, kind, source: LANE });
  return id;
}
const orgLabel = id => newOrgs.get(id)?.label ?? canonOrgById.get(id)?.label ?? id;
function actor(id) {
  if (!canonActorById.has(id)) throw new Error(`actor ${id} is not canonical; this lane names only existing people`);
  return id;
}

// Contracts Finder buyer names -> registry entities (canonical ids first; the rest minted once).
const BUYERS = [
  [/^dsit$|science, innovation (and|&) technology/i, () => 'dsit'],
  [/^cabinet office$/i, () => 'cabinet-office'],
  [/^ministry of defence$/i, () => 'mod'],
  [/^home office$/i, () => 'home-office-border-force'],
  [/^beis$|business,? energy (and|&) industrial strategy/i, () => ensureOrg('Department for Business, Energy and Industrial Strategy (BEIS)', 'agency', 'beis')],
  [/digital, culture, media (and|&) sport/i, () => ensureOrg('Department for Digital, Culture, Media and Sport (DCMS)', 'agency', 'dcms')],
  [/^department of health (and|&) social care/i, () => ensureOrg('Department of Health and Social Care (DHSC)', 'agency', 'dhsc')],
  [/^department for education$/i, () => ensureOrg('Department for Education (DfE)', 'agency', 'dfe')],
  [/^government digital service$/i, () => ensureOrg('Government Digital Service (GDS)', 'agency', 'government-digital-service')],
  [/housing, communities (and|&) local government/i, () => ensureOrg('Ministry of Housing, Communities and Local Government (MHCLG)', 'agency', 'mhclg')],
  [/^office for national statistics$/i, () => ensureOrg('Office for National Statistics (ONS)', 'agency', 'ons')],
  [/environment, food (and|&) rural affairs|^defra network/i, () => ensureOrg('Department for Environment, Food and Rural Affairs (Defra)', 'agency', 'defra')],
  [/^uk research (and|&) innovation$/i, () => ensureOrg('UK Research and Innovation (UKRI)', 'agency', 'ukri')],
  [/^uk health security agency$/i, () => ensureOrg('UK Health Security Agency (UKHSA)', 'agency', 'ukhsa')],
  [/^nhs england$/i, () => ensureOrg('NHS England', 'agency', 'nhs-england')],
];
const titleCase = s => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\bNhs\b/g, 'NHS').replace(/\bUk\b/g, 'UK').replace(/\bFcdo\b/g, 'FCDO').replace(/\bAi\b/g, 'AI') : s);
function buyerOrg(name) {
  for (const [re, f] of BUYERS) if (re.test(name)) return f();
  return ensureOrg(titleCase(name), 'public_body');
}

// ---------------------------------------------------------------- receipts
const archived = new Map(readJsonl(ARCHIVE_FILE, { optional: true }).map(r => [r.key, r]));
const LIMITS = {
  cf_notice: 'A Contracts Finder award notice records the value the buyer published for the award, which is a contract value or ceiling and not money paid; it does not show invoices, outlays, contract performance, or why the supplier was chosen beyond the stated procedure.',
  spend_csv: 'A departmental spending-over-£25,000 row records one payment (date, amount, expense coding, supplier) as the department published it; it does not name the contract the payment is made under, and payments under £25,000 are not published.',
  official_page: "A government announcement gives the government's own account of a programme, appointment or engagement on its publication date; it does not establish amounts actually spent, contract terms, or any named person's influence on a decision.",
  companies_house: 'The Companies House register shows filings and register entries as the company submitted them; it does not establish the price paid for shares or the company, the individual holders behind corporate shareholders, or any person\'s influence.',
};
const pageText = new Map();
function textOf(key) {
  const rec = archived.get(key);
  if (rec?.status !== 'archived') return null;
  if (!pageText.has(key)) {
    const raw = fs.readFileSync(path.join(root, rec.path), 'utf8');
    const main = /<main[\s\S]*?<\/main>/i.exec(raw)?.[0] ?? raw;
    pageText.set(key, { raw, text: htmlText(main), all: htmlText(raw) });
  }
  return pageText.get(key);
}
const receiptCache = new Map();
function receiptFor(key, label) {
  if (receiptCache.has(key)) return receiptCache.get(key);
  const rec = archived.get(key);
  const problems = [];
  let cand = null;
  if (!rec) problems.push('not_archived: no archive record (run with --fetch)');
  else if (rec.status !== 'archived') problems.push(`archive_attempt_failed: ${rec.reason ?? rec.status}`);
  else {
    const kind = rec.kind === 'spend_publication' ? 'official_page' : rec.kind;
    cand = {
      receipt_id: `ukpm-${key}`,
      label,
      source_type: { cf_notice: 'official_contract_award_notice', spend_csv: 'official_transparency_spend_csv', companies_house: 'official_company_register_page', official_page: 'official_government_publication' }[kind] ?? 'official_record',
      evidence_class: 'official',
      path: rec.path,
      source_url: rec.url,
      retrieved_at: rec.retrieved_at,
      content_sha256: rec.content_sha256,
      content_type: rec.content_type,
      content_bytes: rec.content_bytes,
      notes: `Archived ${rec.retrieved_at} by tools/promote-intake-uk-public-money.mjs --fetch (HTTP ${rec.http_status}${rec.final_url && rec.final_url !== rec.url ? `, final URL ${rec.final_url}` : ''}).`,
      limits: LIMITS[kind] ?? LIMITS.official_page,
      archive: { method: 'in_repo_content_hash', ref: `sha256:${rec.content_sha256}`, captured: rec.retrieved_at },
      intake_source: LANE,
    };
    const { errors } = checkReceiptContract([cand], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
    const prior = ledgerReceipts.get(cand.receipt_id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(cand)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  }
  const out = { key, cand, problems };
  receiptCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- staging + accounting
const surfaces = new Map();
const participation = [];
const partKeys = new Set();
const citedReceipts = new Map();
const gaps = [];
const summary = {};
const tally = table => (summary[table] ??= { read: 0, promoted_rows: 0, refused: 0, refusal_reasons: {} });
function refuse(table, rowKey, reason, detail = {}) {
  const t = tally(table);
  t.refused += 1;
  t.refusal_reasons[reason] = (t.refusal_reasons[reason] ?? 0) + 1;
  gaps.push({ lane: LANE, table, row_key: rowKey, reason, ...detail });
}
function stage(surface, parts) {
  if (!surfaceTypes.has(surface.surface_type)) throw new Error(`unknown surface_type ${surface.surface_type}`);
  for (const t of surface.secondary_surface_types) if (!surfaceTypes.has(t)) throw new Error(`unknown secondary type ${t}`);
  if (ledgerSurfaceIds.has(surface.surface_id)) throw new Error(`surface id collides with ledger: ${surface.surface_id}`);
  if (surfaces.has(surface.surface_id)) throw new Error(`duplicate staged surface ${surface.surface_id}`);
  surfaces.set(surface.surface_id, surface);
  for (const p of parts) {
    const k = `${p.surface_id}|${p.actor_id ?? p.organization_id}|${p.participation_type}`;
    if (partKeys.has(k)) continue;
    partKeys.add(k);
    participation.push(p);
  }
}
// A row is admitted when every receipt it rests on passes the contract and the archived copy
// shows each stated fact (`must`); otherwise it goes to gaps with its would-be rows.
function admit({ table, rowKey, receipts, must = [], build }) {
  tally(table).read += 1;
  const rs = receipts.map(([key, label]) => receiptFor(key, label));
  const failures = rs.filter(r => r.problems.length).map(r => ({ receipt: r.key, problems: r.problems }));
  if (failures.length) {
    refuse(table, rowKey, failures.some(f => f.problems.some(p => p.startsWith('archive') || p.startsWith('not_archived'))) ? 'receipt_archive_unresolved' : 'receipt_not_admissible', { receipt_failures: failures });
    return false;
  }
  const texts = rs.map(r => textOf(r.key)?.all ?? '').map(norm).join(' ');
  const missing = must.filter(m => !texts.includes(norm(m)));
  const ids = rs.map(r => r.cand.receipt_id);
  if (missing.length) {
    let candidate = null;
    try { candidate = build(ids); } catch { candidate = null; }
    refuse(table, rowKey, 'stated_fact_not_shown_in_archived_copy', { missing, candidate });
    return false;
  }
  const built = build(ids);
  if (built?.refuse) { refuse(table, rowKey, built.refuse, built.detail ?? {}); return false; }
  for (const r of rs) citedReceipts.set(r.cand.receipt_id, r.cand);
  stage(built.surface, built.parts);
  tally(table).promoted_rows += 1;
  return true;
}
const P = (sid, date, ec, ids, rest) => ({ surface_id: sid, ...rest, time_start: date.start, time_end: date.end, evidence_class: ec, receipt_ids: ids });

// =============================================================== 1. Contracts Finder awards
function field(html, label) {
  const re = new RegExp(`<h4><strong>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</strong></h4>([\\s\\S]*?)(?=<h4>|<h3>|<div class="content-block">)`, 'i');
  const m = re.exec(html);
  return m ? htmlText(m[1]) : null;
}
function parseNotice(raw) {
  const title = htmlText(/<h1 class='govuk-heading-l break-word'>([\s\S]*?)<\/h1>/.exec(raw)?.[1] ?? '');
  const buyer = htmlText(/<h2 class='breadcrumb-description'>([\s\S]*?)<\/h2>/.exec(raw)?.[1] ?? '');
  const summaryHtml = /<h3>Contract summary<\/h3>([\s\S]*?)<h3>Description<\/h3>/.exec(raw)?.[1] ?? '';
  const award = /<h3>Award information<\/h3>([\s\S]*?)<h3>About the buyer<\/h3>/.exec(raw)?.[1] ?? '';
  const money = s => (s && /£[\d,.]+/.test(s) ? Number(/£([\d,.]+)/.exec(s)[1].replace(/,/g, '')) : null);
  const supplierCount = Number(/This contract was awarded to <strong>(\d+)<\/strong> supplier/.exec(award)?.[1] ?? 0);
  const suppliers = [];
  const afterCount = award.split(/This contract was awarded to/)[1] ?? '';
  for (const chunk of afterCount.split('<h4><strong>').slice(1)) {
    const name = htmlText(chunk.split('</strong></h4>')[0]);
    const t = htmlText(chunk);
    suppliers.push({
      name,
      address: /Address (.*?) Reference/.exec(t)?.[1] ?? null,
      companyNumber: /Companies House number: (\d+)/.exec(t)?.[1] ?? null,
      value: money(/Value of contract (£[\d,.]+)/.exec(t)?.[1]),
    });
  }
  return {
    title, buyer,
    reference: field(summaryHtml, 'Procurement reference'),
    procedure: field(summaryHtml, 'Procedure type'),
    valueRange: field(summaryHtml, 'Value of contract'),
    published: isoFromLong(field(summaryHtml, 'Published date')),
    awarded: isoFromLong(field(award, 'Awarded date')),
    start: isoFromLong(field(award, 'Contract start date')),
    end: isoFromLong(field(award, 'Contract end date')),
    total: money(field(award, 'Total value of contract')),
    supplierCount, suppliers,
  };
}
const FACULTY_ADDRESS = /54 wel+beck street|160 old street/i;
const awards = [];
for (const rec of [...archived.values()].filter(r => r.kind === 'cf_notice').sort((a, b) => a.key.localeCompare(b.key))) {
  const noticeId = rec.key.replace(/^cf-notice-/, '');
  const raw = rec.status === 'archived' ? textOf(rec.key).raw : null;
  const n = raw ? parseNotice(raw) : null;
  admit({
    table: 'contracts_finder_awards', rowKey: noticeId,
    receipts: [[rec.key, n ? `Contracts Finder award notice: ${n.title} (${n.buyer})` : `Contracts Finder notice ${noticeId}`]],
    must: n ? [n.title] : [],
    build: ids => {
      if (!n?.awarded) return { refuse: 'award_date_not_on_notice' };
      const sup = n.suppliers.map(s => ({ ...s, match: SUPPLIERS.find(x => x.re.test(s.name)) })).find(s => s.match);
      if (!sup) return { refuse: 'named_supplier_not_on_notice' };
      // Identity: the Companies House number on the notice, or Faculty's registered address.
      const chOk = sup.match.companyNumber && sup.companyNumber && sup.companyNumber.replace(/^0+/, '') === sup.match.companyNumber.replace(/^0+/, '');
      const addrOk = sup.match.org === 'faculty' && FACULTY_ADDRESS.test(sup.address ?? '');
      const nameOk = /science/i.test(sup.name) && sup.match.org === 'faculty';
      if (!chOk && !addrOk && !nameOk) return { refuse: 'supplier_identity_not_established', detail: { supplier: sup } };
      const identity = chOk ? `Companies House number ${sup.companyNumber} on the notice` : addrOk ? `supplier address "${sup.address}" (a Faculty Science registered address) on the notice; no Companies House number given` : 'supplier legal name on the notice; no Companies House number or address match';
      const framework = n.supplierCount > 1;
      const buyer = buyerOrg(n.buyer);
      const supplierOrg = sup.match.org;
      const date = { start: n.awarded, end: n.awarded };
      const amount = framework ? null : n.total;
      const sid = `cf-award-${buyer}-${supplierOrg}-${n.awarded}-${noticeId.slice(0, 8)}`;
      const notes = [
        `Contracts Finder notice ${noticeId}${n.reference ? `, procurement reference ${n.reference}` : ''}. Buyer as published: ${n.buyer}. Supplier as published: ${sup.name}; identity from ${identity}.`,
        `Awarded ${n.awarded}${n.start ? `; contract ${n.start} to ${n.end ?? 'unstated'}` : ''}${n.procedure ? `; procedure: ${n.procedure}` : ''}.`,
        framework
          ? `Framework or multi-supplier award to ${n.supplierCount} suppliers; the notice's total (${n.total != null ? gbp(n.total) : 'none'}) is the whole arrangement${sup.value != null ? ` and the per-supplier value shown for ${sup.name} is ${gbp(sup.value)}` : ''}, so no amount is carried to the supplier: a framework place is not an order.`
          : `Total value of contract on the notice: ${n.total != null ? gbp(n.total) : 'not stated'}${n.valueRange ? ` (advertised value ${n.valueRange})` : ''}. A contract value is a ceiling or estimate, not money paid.`,
      ].join(' ');
      return {
        surface: {
          surface_id: sid,
          surface_label: `${orgLabel(buyer)} award to ${sup.name}: ${n.title}, ${n.awarded}`,
          surface_type: 'procurement_contract_surface',
          secondary_surface_types: buyer === 'mod' ? ['defence_industrial_surface'] : [],
          hop_eligible: false,
          hop_refusal_reason: 'organization_only_procurement_instrument',
          scorable: true,
          status: framework ? 'official_framework_place' : 'official_award_notice',
          bounded_by: ['Contracts Finder award notice as archived'],
          time_start: date.start, time_end: date.end, evidence_class: 'official', receipt_ids: ids,
          ...(amount != null ? { funding_amount_gbp: amount, funding_amount_basis: 'Total value of contract on the Contracts Finder award notice (contract value, not outlay)' } : {}),
          contract_reference: n.reference ?? noticeId,
          contracts_finder_notice_id: noticeId,
          intake_source: LANE,
          notes,
        },
        parts: [
          P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: buyer, role: `buyer (${n.buyer})`, participation_type: 'buyer' }),
          P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: supplierOrg, role: framework ? `framework supplier (${sup.name})` : `supplier (award recipient, ${sup.name})`, participation_type: framework ? 'framework_supplier' : 'supplier', ...(amount != null ? { funding_amount_gbp: amount } : {}), notes: amount != null ? 'Total value of contract on the award notice; not an outlay.' : 'Framework place; no amount carried.' }),
        ],
        award: { noticeId, date: n.awarded, buyer: n.buyer, buyerId: buyer, supplier: sup.name, supplierOrg, title: n.title, value: amount, frameworkTotal: framework ? n.total : null, framework, reference: n.reference ?? noticeId, sid },
      };
    },
  });
  const last = [...surfaces.values()].at(-1);
  if (last?.contracts_finder_notice_id === noticeId) {
    awards.push({ noticeId, date: last.time_start, buyerId: participation.find(p => p.surface_id === last.surface_id && p.participation_type === 'buyer').organization_id, label: last.surface_label, value: last.funding_amount_gbp ?? null, framework: last.status === 'official_framework_place', reference: last.contract_reference, sid: last.surface_id });
  }
}
// Search responses are custody for completeness (what was searched and what came back); the
// awards rest on the notice pages themselves.
const searchCustody = [...archived.values()].filter(r => r.kind === 'cf_search').map(r => ({ key: r.key, keyword: r.request_body?.searchCriteria?.keyword, status: r.status, path: r.path ?? null, hits: r.status === 'archived' ? JSON.parse(fs.readFileSync(path.join(root, r.path), 'utf8')).hitCount : null }));

// =============================================================== 2. DSIT payments over £25,000
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const payments = [];
for (const rec of [...archived.values()].filter(r => r.kind === 'spend_csv' && r.status === 'archived').sort((a, b) => a.key.localeCompare(b.key))) {
  const rows = parseCsv(fs.readFileSync(path.join(root, rec.path), 'latin1'));
  const hi = rows.findIndex(r => r.some(c => /^supplier$/i.test(c.trim())) && r.some(c => /^amount$/i.test(c.trim())));
  const month = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)-(\d{4})/i.exec(rec.key);
  // Some months are published without a header row; they use the standard column order
  // (department, date of payment, expense type, expense area, supplier, transaction number, amount,
  // description, supplier post code, supplier type) and are read positionally.
  const headerless = hi < 0 && /^department for science/i.test(rows[0]?.[0] ?? '') && /^\d{2}\/\d{2}\/\d{4}$/.test(rows[0]?.[1] ?? '');
  if (hi < 0 && !headerless) { tally('dsit_spend_payments').read += 1; refuse('dsit_spend_payments', rec.key, 'csv_header_not_recognised'); continue; }
  const h = headerless ? ['department', 'date of payment', 'expense type', 'expense area', 'supplier', 'transaction number', 'amount', 'description', 'supplier post code', 'supplier type'] : rows[hi].map(c => c.trim().toLowerCase());
  const col = name => h.findIndex(c => c === name);
  const [cDate, cSup, cAmt, cTx, cArea, cType, cDesc] = ['date of payment', 'supplier', 'amount', 'transaction number', 'expense area', 'expense type', 'description'].map(col);
  const hits = rows.slice(hi + 1).filter(r => FACULTY_PAYEE.test(r[cSup] ?? '')).map(r => {
    const [d, m, y] = (r[cDate] ?? '').trim().split('/');
    return {
      date: `${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`,
      amount: Number(String(r[cAmt]).replace(/[^\d.-]/g, '')),
      tx: r[cTx]?.trim(), area: r[cArea]?.trim(), type: r[cType]?.trim(), desc: r[cDesc]?.trim(), supplier: r[cSup].trim(),
    };
  }).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.amount));
  if (!hits.length) continue;
  const total = Math.round(hits.reduce((n, p) => n + p.amount, 0) * 100) / 100;
  const dates = hits.map(p => p.date).sort();
  const ym = dates[0].slice(0, 7);
  const sid = `dsit-payments-faculty-science-${ym}`;
  const aisi = hits.some(p => /ai safety institute|ai security institute/i.test(p.area ?? ''));
  admit({
    table: 'dsit_spend_payments', rowKey: rec.key,
    receipts: [[rec.key, `DSIT spending over £25,000, ${month ? `${month[1]} ${month[2]}` : ym} (CSV)`]],
    must: ['Faculty Science Ltd', ...hits.map(p => p.tx).filter(Boolean)],
    build: ids => {
      const date = { start: dates[0], end: dates.at(-1) };
      const lines = hits.map(p => `${p.date} tx ${p.tx} ${gbp(p.amount)} (${p.type}; ${p.area}; ${p.desc})`).join('; ');
      payments.push({ month: ym, count: hits.length, total, aisi, sid, key: rec.key, hits });
      return {
        surface: {
          surface_id: sid,
          surface_label: `DSIT payments over £25,000 to Faculty Science Ltd, ${ym} (${hits.length} payment${hits.length > 1 ? 's' : ''}, ${gbp(total)})`,
          surface_type: 'procurement_contract_surface',
          secondary_surface_types: aisi ? ['public_private_ai_infrastructure'] : [],
          hop_eligible: false,
          hop_refusal_reason: 'organization_only_payment_record',
          scorable: true,
          status: 'official_payment_record',
          bounded_by: ['DSIT spending over £25,000 transparency CSV as archived'],
          time_start: date.start, time_end: date.end, evidence_class: 'official', receipt_ids: ids,
          payment_amount_gbp: total,
          payment_amount_basis: 'Sum of the Faculty Science Ltd rows in the monthly DSIT spend-over-£25,000 CSV (money paid; not summed with award values)',
          intake_source: LANE,
          notes: `Payments to "${hits[0].supplier}" (postcode EC1V 9BW in the CSV, Faculty Science's registered postcode): ${lines}. The CSV does not name the contract a payment is made under; payments under £25,000 are not published.`,
        },
        parts: [
          P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: 'dsit', role: 'payer (DSIT spend-over-£25,000 return)', participation_type: 'payer' }),
          P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: 'faculty', role: 'payee (Faculty Science Ltd)', participation_type: 'payee', payment_amount_gbp: total }),
          ...(aisi ? [P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: 'aisi', role: 'DSIT spending unit named in the expense area (AI Safety Institute)', participation_type: 'spending_unit' })] : []),
        ],
      };
    },
  });
}

// =============================================================== 3. Pages: programme follow-ons and Faculty's government roles
const published = key => {
  const t = textOf(key);
  if (!t) return null;
  return isoFromLong(/Published:? (\d{1,2} \w+ \d{4})/.exec(t.text)?.[1]) ?? (/datetime="(\d{4}-\d{2}-\d{2})T/.exec(t.raw)?.[1] ?? null);
};
const pageTitle = key => htmlText(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(textOf(key)?.raw ?? '')?.[1] ?? '') || key;
const AAP = 'AI Opportunities Action Plan (13 January 2025) follow-on';
const PAGE_SURFACES = [
  {
    sid: 'clifford-ai-opportunities-adviser-appointment-2025-01-13', keys: ['govuk-clifford-ai-opportunities-adviser-2025-01-13'],
    type: 'government_advisory_surface', secondary: ['policy_to_procurement_surface'], status: 'official_appointment',
    label: "Matt Clifford appointed the Prime Minister's AI Opportunities Adviser to drive implementation of the Action Plan",
    must: ['has been appointed as the Prime Minister’s AI Opportunities Adviser', 'AI Opportunities Action Plan'],
    orgs: [['dsit', 'department hosting the AI Opportunities Unit the adviser works with', 'host_department']],
    actors: [['matt-clifford', "Prime Minister's AI Opportunities Adviser", 'official_appointment_observation']],
    notes: 'Same-day follow-on to the Action Plan he authored: the announcement says he will advise ministers on implementing it and work with DSIT\'s AI Opportunities Unit.',
  },
  {
    sid: 'ai-growth-zones-bidding-opens-2025-02-10', keys: ['govuk-ai-growth-zones-starting-gun-2025-02-10'],
    type: 'policy_document_surface', secondary: ['public_private_ai_infrastructure', 'policy_to_procurement_surface'], status: 'official_programme_launch',
    label: 'AI Growth Zones: bidding opens (Action Plan follow-on)', must: ['AI Growth Zones', 'AI Opportunities Action Plan'],
    orgs: [['dsit', 'issuing department', 'programme_owner']], actors: [],
    notes: `${AAP}. Local and regional authorities invited to bid to host AI data-centre zones.`,
  },
  {
    sid: 'ai-energy-council-first-meeting-2025-04-08', keys: ['govuk-ai-energy-council-announced-2025-04-07'],
    type: 'board_advisory_surface', secondary: ['public_private_ai_infrastructure'], status: 'official_council_launch',
    label: 'AI Energy Council holds first meeting (Action Plan follow-on)', must: ['AI Energy Council', 'first meeting'],
    orgs: [['dsit', 'co-chairing department', 'co_chair_department'], [ensureOrg('Department for Energy Security and Net Zero (DESNZ)', 'agency', 'desnz'), 'co-chairing department', 'co_chair_department']], actors: [],
    notes: `${AAP}. The announcement names energy and technology company members; they are not staged as participants here.`,
  },
  {
    sid: 'ai-growth-zones-qualifying-process-2025-04-30', keys: ['govuk-ai-growth-zone-delivery-2025-04-29'],
    type: 'public_private_fund_surface', secondary: ['public_private_ai_infrastructure', 'policy_to_procurement_surface'], status: 'official_programme_phase',
    label: "AI Growth Zones formal qualifying process launched with investors and local authorities; Culham the first zone", must: ['Prime Minister’s AI Adviser Matt Clifford', 'Culham'],
    orgs: [['dsit', 'issuing department', 'programme_owner']],
    actors: [['matt-clifford', "Prime Minister's AI Adviser; named as leading launch engagements with investors and MPs and quoted", 'programme_launch_engagement']],
    notes: `${AAP}. The announcement names Matt Clifford as the Prime Minister's AI Adviser leading investor engagements at the launch.`,
  },
  {
    sid: 'national-supercomputer-edinburgh-750m-2025-06-11', keys: ['govuk-national-supercomputer-edinburgh-2025-06-10'],
    type: 'policy_document_surface', secondary: ['public_private_ai_infrastructure'], status: 'official_funding_commitment', commitment_gbp: 750000000,
    label: 'Up to £750 million for a national supercomputer at the University of Edinburgh (Spending Review)', must: ['£750 million', 'University of Edinburgh'],
    orgs: [['dsit', 'announcing department', 'programme_owner'], [ensureOrg('HM Treasury', 'agency', 'hm-treasury'), 'Spending Review funder', 'funder'], [ensureOrg('University of Edinburgh', 'university'), 'host of the national supercomputer', 'host_institution']], actors: [],
    notes: `${AAP} (compute). A programme commitment of up to £750 million, carried as programme_commitment_gbp and not as an award.`,
  },
  {
    sid: 'uk-compute-roadmap-sovereign-ai-unit-2025-07-17', keys: ['govuk-compute-roadmap-sovereign-ai-2025-07-16', 'govuk-uk-compute-roadmap', 'govuk-uk-compute-roadmap-html'],
    type: 'policy_document_surface', secondary: ['public_private_ai_infrastructure', 'policy_to_procurement_surface'], status: 'official_strategy_publication', commitment_gbp: 2000000000,
    label: 'UK Compute Roadmap published; Sovereign AI Unit established in DSIT with £500 million', must: ['Compute Roadmap', 'Sovereign AI Unit', '£500 million', '£2 billion'],
    orgs: [['dsit', 'publishing department; home of the Sovereign AI Unit', 'programme_owner'], [ensureOrg('HM Treasury', 'agency', 'hm-treasury'), 'co-publishing department', 'co_publisher'], [ensureOrg('UK Research and Innovation (UKRI)', 'agency', 'ukri'), 'co-publishing body', 'co_publisher']], actors: [],
    notes: `${AAP} (compute, sovereign AI). Up to £2 billion to 2030 for public compute per the roadmap; the Sovereign AI Unit backed with £500 million. Commitments, not awards.`,
  },
  {
    sid: 'north-east-ai-growth-zone-designation-2025-09-24', keys: ['govuk-north-east-ai-growth-zone-2025-09-24'],
    type: 'public_private_fund_surface', secondary: ['public_private_ai_infrastructure'], status: 'official_zone_designation',
    label: 'North East designated an AI Growth Zone; Blackstone £10 billion Cambois commitment cited', must: ['AI Growth Zone', 'Blackstone', '£10 billion'],
    orgs: [['dsit', 'designating department', 'programme_owner'], ['blackstone', 'private investor named in the designation announcement (£10 billion at Cambois)', 'named_private_investor']], actors: [],
    notes: `${AAP}. Investment figures are the government's stated private commitments, not public money.`,
  },
  {
    sid: 'ai-growth-zones-north-wales-delivery-package-2025-11-13', keys: ['govuk-ai-growth-zone-north-wales-2025-11-13', 'govuk-delivering-ai-growth-zones-2025-11-13', 'govuk-delivering-ai-growth-zones-2025-11-13-html'],
    type: 'policy_document_surface', secondary: ['public_private_ai_infrastructure', 'policy_to_procurement_surface'], status: 'official_policy_paper',
    label: 'North Wales AI Growth Zone confirmed and "Delivering AI Growth Zones" package (energy discounts, £5 million per zone)', must: ['North Wales', '£5 million', 'AI Opportunities Action Plan'],
    orgs: [['dsit', 'publishing department', 'programme_owner']], actors: [],
    notes: `${AAP}. Electricity-cost discounts for data centres in zones and up to £5 million per zone for local adoption and skills.`,
  },
  {
    sid: 'ai-opportunities-action-plan-one-year-on-2026-01-29', keys: ['govuk-action-plan-one-year-on-2026-01-29', 'govuk-action-plan-one-year-on-2026-01-29-html'],
    type: 'policy_document_surface', secondary: ['policy_to_procurement_surface'], status: 'official_implementation_report',
    label: 'AI Opportunities Action Plan: One Year On (5 AI Growth Zones, Sovereign AI Unit up to £500 million, Isambard-AI)', must: ['5 AI Growth Zones', 'Sovereign AI Unit', '£500 million'],
    orgs: [['dsit', 'publishing department', 'programme_owner']], actors: [],
    notes: 'Government implementation report on the Action Plan; the figures are the government\'s own account.',
  },
  {
    sid: 'lanarkshire-ai-growth-zone-designation-2026-01-29', keys: ['govuk-lanarkshire-ai-growth-zone-2026-02-03'],
    type: 'public_private_fund_surface', secondary: ['public_private_ai_infrastructure'], status: 'official_zone_designation',
    label: 'Lanarkshire named an AI Growth Zone (£8.2 billion private investment, community fund up to £543 million)', must: ['Lanarkshire', '£8.2 billion', 'Prime Minister Keir Starmer'],
    orgs: [['dsit', 'designating department', 'programme_owner'], [ensureOrg('DataVita', 'company'), 'site partner named in the announcement', 'named_private_partner']],
    actors: [['keir-starmer', 'Prime Minister, quoted in the designation announcement', 'quoted_official']],
    notes: `${AAP}. Private investment and community-fund figures are the government's stated commitments.`,
  },
  {
    sid: 'sovereign-ai-unit-first-backing-2026-04-16', keys: ['govuk-sovereign-ai-first-backing-2026-04-16'],
    type: 'public_private_fund_surface', secondary: ['public_private_ai_infrastructure', 'policy_to_procurement_surface'], status: 'official_fund_first_awards',
    label: "Sovereign AI Unit's first backing of UK AI firms (£500 million unit; £282 million R&D offer)", must: ['Sovereign AI', '£500 million', '£282 million'],
    orgs: [['dsit', 'department housing the Sovereign AI Unit', 'programme_owner']], actors: [],
    notes: `${AAP}. Backed firms are named in the announcement; Faculty is not among them in the archived copy.`,
  },
  // Faculty's government roles outside contract notices
  {
    sid: 'nhsx-covid-19-data-store-faculty-2020-03-28', keys: ['healthtech-power-of-data-in-a-pandemic-2020-03-28'],
    type: 'customer_vendor_surface', secondary: ['public_private_ai_infrastructure'], status: 'official_engagement_statement',
    label: 'NHSX names Faculty among the companies building the NHS COVID-19 data store', must: ['Faculty is a London-based AI technology specialist', 'NHSX'],
    orgs: [[ensureOrg('NHSX', 'agency'), 'publisher; NHS digital unit running the data store', 'customer'], ['faculty', 'AI technology supplier named as supporting the data platform', 'vendor']], actors: [],
    notes: 'Official NHSX blog post of 28 March 2020 naming Faculty, with other technology firms, on the COVID-19 data store. No value is stated; the related DHSC award notices are separate rows.',
  },
  {
    sid: 'frontier-ai-taskforce-faculty-contract-2023-10-18', keys: ['govuk-frontier-ai-taskforce-technical-organisations-2023-10-17', 'govuk-frontier-ai-taskforce-second-progress-report-2023-10-30-html'],
    type: 'procurement_contract_surface', secondary: ['public_private_ai_infrastructure', 'model_governance_surface'], status: 'official_contract_announcement_no_value',
    label: 'Frontier AI Taskforce contracts Faculty AI to study LLM uplift to novice bad actors; Chair Ian Hogarth stated recused', must: ['Faculty AI', 'Ian Hogarth had no involvement in the awarding of the Faculty contract'],
    orgs: [['aisi', 'buyer (Frontier AI Taskforce, predecessor of the AI Safety Institute)', 'buyer'], ['faculty', 'supplier (research contract)', 'supplier']],
    actors: [['ian-hogarth', 'Taskforce Chair; the announcement states he had no involvement in awarding the Faculty contract', 'stated_recusal_observation']],
    notes: 'Announcement of 18 October 2023, restated in the Taskforce second progress report (30 October 2023). No value is published here; the BEIS/AISI award notice of 1 January 2024 is a separate Contracts Finder row.',
  },
  {
    sid: 'dfe-ai-hackathon-faculty-2023-10-09', keys: ['govuk-dfe-ai-hackathon-2023-10-09', 'govuk-dfe-ai-education-research-2023-11-28'],
    type: 'customer_vendor_surface', secondary: ['public_private_ai_infrastructure'], status: 'official_engagement_statement',
    label: 'Department for Education AI hackathons run in collaboration with Faculty AI; LSIP analysis pilot with Faculty AI', must: ['in collaboration with Faculty AI', 'pilot project with Faculty AI'],
    orgs: [[ensureOrg('Department for Education (DfE)', 'agency', 'dfe'), 'department hosting the hackathons', 'customer'], ['faculty', 'collaborating AI company', 'vendor']], actors: [],
    notes: 'Matches the DfE Contracts Finder awards for the Generative AI Hackathons Research Project and the LSIP analysis fellowship, which are separate rows.',
  },
];
for (const def of PAGE_SURFACES) {
  const date0 = published(def.keys[0]);
  admit({
    table: 'page_surfaces', rowKey: def.sid,
    receipts: def.keys.map(k => [k, `${pageTitle(k)}${published(k) ? ` (${published(k)})` : ''}`]),
    must: def.must,
    build: ids => {
      if (!date0) return { refuse: 'publication_date_not_on_page' };
      if (!def.sid.endsWith(date0)) return { refuse: 'surface_date_disagrees_with_page', detail: { page_date: date0 } };
      const date = { start: date0, end: date0 };
      return {
        surface: {
          surface_id: def.sid, surface_label: def.label, surface_type: def.type, secondary_surface_types: def.secondary,
          hop_eligible: false, scorable: true, status: def.status, bounded_by: def.keys.map(k => pageTitle(k)),
          time_start: date.start, time_end: date.end, evidence_class: 'official', receipt_ids: ids,
          ...(def.commitment_gbp ? { programme_commitment_gbp: def.commitment_gbp } : {}),
          intake_source: LANE, notes: def.notes,
        },
        parts: [
          ...def.orgs.map(([org, role, ptype]) => P(def.sid, date, 'official', ids, { participant_type: 'organization', organization_id: org, role, participation_type: ptype })),
          ...def.actors.map(([a, role, ptype]) => P(def.sid, date, 'official', ids, { participant_type: 'actor', actor_id: actor(a), role, participation_type: ptype })),
        ],
      };
    },
  });
}

// =============================================================== 4. Companies House: control and capital
const fhText = ['ch-faculty-filing-history-p1', 'ch-faculty-filing-history-p2', 'ch-faculty-filing-history-p3'].map(k => textOf(k)?.all ?? '').join(' ');
const officersText = textOf('ch-faculty-officers')?.all ?? '';
const officersDate = archived.get('ch-faculty-officers')?.retrieved_at?.slice(0, 10) ?? null;
{
  const sid = 'faculty-science-control-change-accenture-2026-03-12';
  const date = { start: '2026-03-12', end: '2026-03-12' };
  const sh01 = /Statement of capital following an allotment of shares on 12 March 2026 GBP ([\d.]+)/.exec(fhText)?.[1];
  admit({
    table: 'companies_house', rowKey: sid,
    receipts: [['ch-faculty-psc', 'Companies House: FACULTY SCIENCE LIMITED (08873131) persons with significant control'], ['ch-faculty-filing-history-p1', 'Companies House: FACULTY SCIENCE LIMITED (08873131) filing history, page 1'], ['ch-faculty-officers', 'Companies House: FACULTY SCIENCE LIMITED (08873131) officers']],
    must: ['Notification of Accenture Plc as a person with significant control on 12 March 2026', 'Cessation of Applied Acquisition Co. Limited as a person with significant control on 12 March 2026', 'Ownership of shares – 75% or more', 'Termination of appointment of Saul Charles Klein as a director on 12 March 2026', 'WARNER, Marc'],
    build: ids => ({
      surface: {
        surface_id: sid,
        surface_label: 'Accenture Plc becomes the controlling person (75%+ shares and votes) of Faculty Science Ltd, 12 March 2026',
        surface_type: 'employment_investment_surface', secondary_surface_types: ['founder_officer_surface', 'surface_factory_capital_layer'],
        hop_eligible: false, scorable: true, status: 'official_register_control_change',
        bounded_by: ['Companies House PSC register, filing history and officers list for 08873131 as archived'],
        time_start: date.start, time_end: date.end, evidence_class: 'official', receipt_ids: ids, intake_source: LANE,
        notes: `PSC02: Accenture Plc (Ireland, IE471706) notified 12 March 2026 with ownership of shares 75% or more, voting rights 75% or more and the right to appoint or remove directors. PSC07: Applied Acquisition Co. Limited (Guernsey, 69131; PSC since 21 May 2021 at more than 25% but not more than 50%) ceased the same day. Same day: SH01 allotment${sh01 ? ` (nominal capital GBP ${sh01})` : ''}, directors Saul Charles Klein and Mark John Selwyn Beith terminated, two Accenture-side directors appointed. The register does not state the price. DSIT declared on 10 October 2024 that Matt Clifford held shares directly in Faculty Science; this register does not show whether or how his holding was sold.`,
      },
      parts: [
        P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: 'faculty', role: 'company whose control changed', participation_type: 'controlled_company' }),
        P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: ensureOrg('Accenture plc', 'company', 'accenture'), role: 'person with significant control from 12 March 2026 (75%+ shares and votes; right to appoint directors)', participation_type: 'psc_notified' }),
        P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: ensureOrg('Applied Acquisition Co. Limited', 'company', 'applied-acquisition-co-limited'), role: 'person with significant control 21 May 2021 to 12 March 2026 (more than 25%, not more than 50%)', participation_type: 'psc_ceased' }),
        P(sid, date, 'official', ids, { participant_type: 'actor', actor_id: actor('saul-klein'), role: 'Faculty Science director, appointment terminated 12 March 2026', participation_type: 'director_termination' }),
        ...(officersDate ? [{ surface_id: sid, participant_type: 'actor', actor_id: actor('marc-warner'), role: 'Faculty Science director appointed 3 February 2014, still listed as an active director after the control change', participation_type: 'director_continuing_observation', time_start: officersDate, time_end: officersDate, date_basis: 'record_retrieval_date', evidence_class: 'official', receipt_ids: ids, notes: `Observation dated by the officers-page retrieval date (${officersDate}).` }] : []),
      ],
    }),
  });
}
{
  const allot = [...fhText.matchAll(/Statement of capital following an allotment of shares on (\d{1,2} \w+ \d{4}) GBP ([\d.]+)/g)]
    .map(m => ({ date: isoFromLong(m[1]), long: m[1], nominal: m[2] })).filter(a => a.date && a.date >= '2023-01-01');
  const uniqAllot = [...new Map(allot.map(a => [a.date, a])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const cs01 = uniq([...fhText.matchAll(/Confirmation statement made on (\d{1,2} \w+ \d{4}) with updates/g)].map(m => isoFromLong(m[1])).filter(d => d >= '2023-01-01')).sort();
  if (uniqAllot.length) {
    const date = { start: uniqAllot[0].date, end: uniqAllot.at(-1).date };
    const sid = `faculty-science-share-allotments-${date.start}-${date.end}`;
    admit({
      table: 'companies_house', rowKey: sid,
      receipts: [['ch-faculty-filing-history-p1', 'Companies House: FACULTY SCIENCE LIMITED (08873131) filing history, page 1'], ['ch-faculty-filing-history-p2', 'Companies House: FACULTY SCIENCE LIMITED (08873131) filing history, page 2'], ['ch-faculty-filing-history-p3', 'Companies House: FACULTY SCIENCE LIMITED (08873131) filing history, page 3']],
      must: uniqAllot.map(a => `allotment of shares on ${a.long} GBP ${a.nominal}`),
      build: ids => ({
        surface: {
          surface_id: sid,
          surface_label: `Faculty Science Ltd share allotments (${uniqAllot.length} SH01 filings), ${date.start} to ${date.end}`,
          surface_type: 'employment_investment_surface', secondary_surface_types: ['surface_factory_capital_layer'],
          hop_eligible: false, hop_refusal_reason: 'organization_only_capital_record', scorable: true, status: 'official_register_capital_filings',
          bounded_by: ['Companies House filing history for 08873131 as archived'],
          time_start: date.start, time_end: date.end, evidence_class: 'official', receipt_ids: ids, intake_source: LANE,
          notes: `SH01 allotment dates and resulting nominal share capital: ${uniqAllot.map(a => `${a.date} GBP ${a.nominal}`).join('; ')}. Confirmation statements with updates: ${cs01.join(', ')}. Nominal capital is not value; the filings index does not show allottees or prices.`,
        },
        parts: [P(sid, date, 'official', ids, { participant_type: 'organization', organization_id: 'faculty', role: 'allotting company', participation_type: 'capital_allotment_subject' })],
      }),
    });
  }
}

// =============================================================== hop eligibility (as the defense-corridor lane)
for (const s of surfaces.values()) {
  const parts = participation.filter(p => p.surface_id === s.surface_id);
  const actors = uniq(parts.filter(p => p.participant_type === 'actor').map(p => p.actor_id));
  s.roster_entry_count = parts.length;
  if (actors.length >= densityMax + 1) { s.hop_eligible = false; s.hop_refusal_reason = 'dense_roster_density_policy'; continue; }
  const byDate = new Map();
  for (const p of parts.filter(p => p.participant_type === 'actor')) {
    if (!byDate.has(p.time_start)) byDate.set(p.time_start, new Set());
    byDate.get(p.time_start).add(p.actor_id);
  }
  if ([...byDate.values()].some(set => set.size >= 2)) { s.hop_eligible = true; delete s.hop_refusal_reason; continue; }
  s.hop_eligible = false;
  if (!s.hop_refusal_reason) s.hop_refusal_reason = actors.length === 0 ? 'organization_only_evidence' : 'single_actor_context_only';
}

// =============================================================== write
const orderedSurfaces = [...surfaces.values()].sort((a, b) => a.time_start.localeCompare(b.time_start) || a.surface_id.localeCompare(b.surface_id)).map(s => {
  const { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, hop_refusal_reason, scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest } = s;
  return { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, ...(hop_refusal_reason ? { hop_refusal_reason } : {}), scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest };
});
const order = new Map(orderedSurfaces.map((s, i) => [s.surface_id, i]));
participation.sort((a, b) => order.get(a.surface_id) - order.get(b.surface_id));
const usedReceiptIds = new Set([...orderedSurfaces.flatMap(s => s.receipt_ids), ...participation.flatMap(p => p.receipt_ids)]);
const receipts = [...citedReceipts.values()].filter(r => usedReceiptIds.has(r.receipt_id)).sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const usedOrgIds = new Set(participation.map(p => p.organization_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrgIds.has(o.id)).sort((a, b) => a.id.localeCompare(b.id));
const fundingTotal = Math.round(participation.reduce((n, p) => n + (p.funding_amount_gbp ?? 0), 0) * 100) / 100;
const paymentTotal = Math.round(participation.reduce((n, p) => n + (p.payment_amount_gbp ?? 0), 0) * 100) / 100;
const finalCheck = checkReceiptContract(receipts, { root });
if (finalCheck.errors.length) throw new Error(`staged receipts fail the contract: ${finalCheck.errors.map(e => `${e.receipt_id} ${e.message}`).join('; ')}`);

writeJsonl(`${OUT}/surfaces.jsonl`, orderedSurfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: [] });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
const fundingBySupplier = {};
for (const p of participation) if (p.funding_amount_gbp) fundingBySupplier[p.organization_id] = Math.round(((fundingBySupplier[p.organization_id] ?? 0) + p.funding_amount_gbp) * 100) / 100;
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: 'tools/promote-intake-uk-public-money.mjs',
  admission_rule: 'A row is promoted only when every receipt it rests on is archived in-repo with a matching SHA-256 and passes the live receipt contract, and the archived copy shows the facts the row states; otherwise it is written to gaps.jsonl with the reason.',
  money_fields: {
    funding_amount_gbp: 'Total value of contract on a single-supplier Contracts Finder award notice (a contract value or ceiling, not money paid). Framework places carry no amount.',
    payment_amount_gbp: 'Money paid, from DSIT spend-over-£25,000 CSV rows; never summed with funding_amount_gbp.',
    programme_commitment_gbp: 'A programme commitment stated in an announcement; not an award.',
  },
  contracts_finder_searches: searchCustody,
  tables: Object.fromEntries(Object.entries(summary).sort(([a], [b]) => a.localeCompare(b))),
  staged: {
    surfaces: orderedSurfaces.length,
    participation: participation.length,
    receipts: receipts.length,
    new_actors: 0,
    new_organizations: orgsOut.length,
    gaps: gaps.length,
    awards: awards.length,
    awards_with_amount: awards.filter(a => a.value != null).length,
    framework_places: awards.filter(a => a.framework).length,
    funding_amount_gbp_total: fundingTotal,
    funding_amount_gbp_by_supplier: fundingBySupplier,
    dsit_payment_months: payments.length,
    dsit_payments: payments.reduce((n, p) => n + p.count, 0),
    payment_amount_gbp_total: paymentTotal,
  },
});
console.log(`promote-intake-uk-public-money: ${orderedSurfaces.length} surfaces, ${participation.length} participation rows, ${receipts.length} receipts, ${orgsOut.length} organizations staged; ${gaps.length} gaps; ${awards.length} awards (${awards.filter(a => a.framework).length} framework places); funding_amount_gbp total ${fundingTotal}; payment_amount_gbp total ${paymentTotal}.`);
