#!/usr/bin/env node
// Capital Factory / Joshua Baer trajectory lane: archive the sources, then stage ledger rows.
//
//   node tools/promote-intake-capital-factory.mjs --fetch [--refresh] [--only <receipt_id>]
//   node tools/promote-intake-capital-factory.mjs            (promote; deterministic, offline)
//
// --fetch archives every source in SOURCES (and every Capital Factory / Joshua Baer Form D found
// by SEC full-text search) under receipts/capital-factory/, hashing each stored file with the
// receipt contract's canonical hash, and writes one record per source to
// data/ledger/staging/capital-factory/archived-receipts.jsonl. Pages that refuse a direct fetch are
// taken from a named Wayback snapshot (the snapshot body is stored in-repo and its URL kept as
// wayback_ref). Requests are paced per host (about one per second; eight seconds for Wayback);
// SEC asks automated clients to declare themselves, so SEC requests carry a project User-Agent.
// A source already archived with a matching hash is not refetched unless --refresh.
//
// Promote mode reads only that manifest and the archived copies, and writes the lane's
// surfaces.jsonl, participation.jsonl, receipts.jsonl, actors.json, organizations.json, gaps.jsonl
// and summary.json. tools/merge-staging.mjs appends the lane into data/ledger and the registries.
//
// Admission rule (the project's own, as in promote-intake-defense-corridor.mjs): a row enters only
// when every receipt it cites satisfies the live receipt contract (public source URL, resolving
// archive reference, limits). A named person is admitted on a row only when the archived copy of a
// cited receipt actually shows the name. Rows that fail go to gaps.jsonl with their would-be rows.
// Evidence classes: government and regulator records are "official"; Capital Factory's own pages
// and releases and all press are "reported" (a company's claim about itself is not a record).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';

const LANE = 'capital-factory';
const STORE = 'receipts/capital-factory';
const OUT = 'data/ledger/staging/capital-factory';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const SEC_UA = process.env.SEC_UA ?? 'clifford-number-research/1.0 public-records research noreply@clifford-number.invalid';
const TIMEOUT_S = 30;

// ---------------------------------------------------------------- limits vocabulary
const L = {
  press: 'A press article reports what its sources stated as of publication; it is secondary reporting and does not itself verify roles, dates, amounts or arrangements against primary records, and it does not establish influence or coordination.',
  cfRelease: "A Capital Factory newsroom release is the company's own announcement as of publication (the newsroom copy also carries an AI-drafting disclosure); it does not independently verify attendance, roles, amounts or partnerships, and planned speakers are not confirmed attendees.",
  cfPage: "A Capital Factory page states the company's own account as of retrieval; its timeline years and tenant claims are self-reported, carry no day-level dates, and do not show lease terms, payments, government commitments or control.",
  govRelease: "An official government release states the government's account as of publication; it does not show lease or space terms, money paid to the host, contracts, or what any named official decided beyond the announcement.",
  armyNews: 'An Army News Service article states the Army\'s account as of publication; it does not show lease terms, payments, contracts or decision authority, and quoted remarks are not a record of any agreement.',
  formD: 'A Form D is a notice of an exempt securities offering filed by the issuer; it reports the offering amount, amount sold, related persons and signer as of filing, is not reviewed by the SEC for accuracy, and does not show investors, investment terms, portfolio holdings or later events.',
  texasTax: 'A Texas Comptroller franchise-tax permit record shows a taxpayer name, address, organization type and Secretary of State charter and status dates as of retrieval; it names no owners, officers or managers and does not show who controls the entity or what it does.',
  efts: 'An SEC full-text search result lists filings whose text matched the query as of retrieval; it is an index, not the filings themselves, and a filing absent from the index is not proof that no filing exists.',
};

// ---------------------------------------------------------------- sources
// id, url (the public source), fetch (optional alternate fetch URL, e.g. a Wayback snapshot),
// ec (evidence class), publisher, published (source publication date), label, limits.
const WB = (ts, url) => `http://web.archive.org/web/${ts}id_/${url}`;
const SOURCES = [
  { id: 'cf-about-2026-10-23', url: 'https://capitalfactory.com/about', ec: 'reported', publisher: 'Capital Factory', label: 'Capital Factory About page with dated company timeline (2009 founding by Joshua Baer through 2026 STATION Austin)', limits: L.cfPage },
  { id: 'cf-government-2026-10-23', url: 'https://www.capitalfactory.com/government', ec: 'reported', publisher: 'Capital Factory', label: 'Capital Factory Government & Defense page: Center for Dual-Use Innovation timeline (2018 AFC, AFWERX, DIU; 2019 CDI; 2020 Fed Supernova; 2024 joint space and rebrand; STATION DC July 2024)', limits: L.cfPage },
  { id: 'cf-team-2026-10-23', url: 'https://www.capitalfactory.com/team', ec: 'reported', publisher: 'Capital Factory', label: 'Capital Factory team page as retrieved 2026-10-23 (still lists Joshua Baer as Founder & CEO)', limits: "A team page lists people and titles as of retrieval; it does not show start or end dates or decision authority, and this copy still lists a person reported dead in June 2026, so it is not current evidence of who runs the firm." },
  { id: 'cf-newsroom-index-2026-10-23', url: 'https://news.capitalfactory.com/', ec: 'reported', publisher: 'Capital Factory', label: 'Capital Factory newsroom index as retrieved 2026-10-23 (no release after 2 June 2026)', limits: 'A newsroom index lists the releases the company chose to publish as of retrieval; the absence of a release (for example on leadership succession) does not show that no change occurred.' },
  { id: 'cf-release-2021-09-15-fed-supernova', url: 'https://news.capitalfactory.com/release/f8996810-3e2e-43f8-97b2-e6f95d7c583b', ec: 'reported', publisher: 'Capital Factory (Business Wire release)', published: '2021-09-15', label: 'Capital Factory release: Fed Supernova 28-29 September 2021, named speakers', limits: L.cfRelease },
  { id: 'cf-release-2022-09-21-fed-supernova', url: 'https://news.capitalfactory.com/release/1931664c-e76f-4559-b85c-3b76200cf0e6', ec: 'reported', publisher: 'Capital Factory (Business Wire release)', published: '2022-09-21', label: 'Capital Factory release: Fed Supernova 27-29 September 2022, planned speakers', limits: L.cfRelease },
  { id: 'cf-release-2025-05-20-station-texas', url: 'https://news.capitalfactory.com/release/514cabb4-9d08-40b0-8e24-fa299d4221a0', ec: 'reported', publisher: 'Capital Factory (Business Wire release)', published: '2025-05-20', label: 'STATION TEXAS names Riffat Manasia founding Executive Director (Baer, Chambers quoted)', limits: L.cfRelease },
  { id: 'cf-release-2025-08-18-nightdragon', url: 'https://news.capitalfactory.com/release/9bc9f967-9935-4281-9f3f-18e151d67f71', ec: 'reported', publisher: 'Capital Factory (PR Newswire release)', published: '2025-08-18', label: 'NightDragon and Capital Factory partnership for national-defense technology', limits: L.cfRelease },
  { id: 'cf-release-2025-08-19-fed-supernova', url: 'https://news.capitalfactory.com/release/5470fef5-2864-4e5c-9a58-da92d5056ae1', ec: 'reported', publisher: 'Capital Factory (Business Wire release)', published: '2025-08-19', label: 'Capital Factory release: Fed Supernova 19-21 August 2025', limits: L.cfRelease },
  { id: 'cf-release-2026-01-13-station-nwa', url: 'https://news.capitalfactory.com/release/9a92a07b-c7f6-430e-bac2-e175e9b1ecd3', ec: 'reported', publisher: 'Capital Factory (Business Wire release)', published: '2026-01-13', label: 'Capital Factory launches STATION NWA with a $1.5 million Walton Family Foundation grant', limits: L.cfRelease },
  { id: 'cf-release-2026-03-10-station-austin', url: 'https://news.capitalfactory.com/release/56d81ac2-2bce-4ff3-855f-daee4c37fc56', ec: 'reported', publisher: 'Capital Factory (Business Wire release)', published: '2026-03-10', label: 'Capital Factory launches STATION Austin non-profit (Baer, Mayor Kirk Watson quoted)', limits: L.cfRelease },
  { id: 'texas-governor-2016-09-14-diux-austin', url: 'https://gov.texas.gov/news/post/governor_abbott_welcomes_defense_innovation_unit_experimental_to_austin', ec: 'official', publisher: 'Office of the Texas Governor', published: '2016-09-14', label: 'Governor Abbott welcomes DIUx Austin outpost at Capital Factory (Carter, McRaven announce)', limits: L.govRelease },
  { id: 'breakingdefense-2016-09-14-diux-austin', url: 'https://breakingdefense.com/2016/09/diux-lite-carter-announces-new-innovation-unit-in-austin/', ec: 'reported', publisher: 'Breaking Defense', published: '2016-09-14', label: 'Breaking Defense: DIUx Austin to occupy space within Capital Factory; Baer with Carter at roll-out', limits: L.press },
  { id: 'builtinaustin-2016-09-14-diux-austin', url: 'https://www.builtinaustin.com/articles/us-secretary-announces-austin-dod-startup', ec: 'reported', publisher: 'Built In Austin', published: '2016-09-14', label: 'Built In Austin: Carter at Capital Factory announces DIUx Austin; Baer quoted; Samantha Snabes first reservist', limits: L.press },
  { id: 'defensenews-2016-09-14-diux-austin', url: 'https://www.defensenews.com/pentagon/2016/09/14/carter-65-million-in-diux-contracts-in-pipeline/', ec: 'reported', publisher: 'Defense News', published: '2016-09-14', label: 'Defense News: Carter, $65 million in DIUx contracts in pipeline; Abizaid to lead Austin office', limits: L.press },
  { id: 'fedscoop-2018-06-29-afwerx-austin', url: 'https://fedscoop.com/afwerx-austin-texas-capital-factory-aetc-diux/', ec: 'reported', publisher: 'FedScoop', published: '2018-06-29', label: 'FedScoop: AFWERX Austin hub opens at Capital Factory; Secretary Heather Wilson visits', limits: L.press },
  { id: 'aetc-2018-afwerx-austin-hub', url: 'https://www.aetc.af.mil/News/Article-Display/Article/1662439/air-force-to-launch-new-innovation-and-collaboration-hub-in-austin/', fetch: WB('20250425050800', 'https://www.aetc.af.mil/News/Article-Display/Article/1662439/air-force-to-launch-new-innovation-and-collaboration-hub-in-austin/'), ec: 'official', publisher: 'Air Education and Training Command', label: 'AETC: Air Force to launch new innovation and collaboration hub in Austin', limits: L.govRelease },
  { id: 'stripes-2018-07-16-afc-hq-austin', url: 'https://www.stripes.com/news/2018-07-16/armys-new-futures-command-to-set-up-headquarters-at-university-of-texas-1508922.html', ec: 'reported', publisher: 'Stars and Stripes', published: '2018-07-16', label: 'Stars and Stripes: Futures Command HQ in Austin; Capital Factory named as potential team location; Baer quoted', limits: L.press },
  { id: 'kut-2018-07-12-afc-austin', url: 'https://www.kut.org/austin/2018-07-12/austin-chosen-as-site-for-u-s-armys-new-weapons-development-post', ec: 'reported', publisher: 'KUT', published: '2018-07-12', label: 'KUT: Austin chosen for Army Futures Command; Austin Chamber and Capital Factory pitched Central Texas', limits: L.press },
  { id: 'cnbc-2018-08-24-afc-austin', url: 'https://www.cnbc.com/2018/08/24/us-armys-new-future-war-command-located-in-austin-texas.html', ec: 'reported', publisher: 'CNBC', published: '2018-08-24', label: 'CNBC: Army Futures Command ribbon cutting; command shares space with Capital Factory', limits: L.press },
  { id: 'defenseone-2018-08-27-afc-austin', url: 'https://www.defenseone.com/technology/2018/08/austin-just-became-armys-silicon-valley/150835/', ec: 'reported', publisher: 'Defense One', published: '2018-08-27', label: 'Defense One: Futures Command to have big physical presence at Capital Factory', limits: L.press },
  { id: 'army-2018-10-22-afc-global-command', url: 'https://www.army.mil/article/212247/army_futures_command_to_become_global_command_says_its_leader', fetch: WB('20260614225119', 'https://www.army.mil/article/212247/army_futures_command_to_become_global_command_says_its_leader'), ec: 'official', publisher: 'Army News Service', published: '2018-10-22', label: "Army News Service: AFC HQ in the Capital Factory building; DIU and AFWERX on its fifth floor; AAL and SOFWERX hackathon (Gen. Murray)", limits: L.armyNews },
  { id: 'army-2019-afc-first-year', url: 'https://www.army.mil/article/224744/in_first_year_futures_command_grows_from_12_to_24000_personnel', fetch: WB('20260606102946', 'https://www.army.mil/article/224744/in_first_year_futures_command_grows_from_12_to_24000_personnel'), ec: 'official', publisher: 'Army News Service', label: 'Army News Service: in first year Futures Command grows from 12 to 24,000 personnel', limits: L.armyNews },
  { id: 'army-2019-afc-new-culture', url: 'https://www.army.mil/article/224201/embracing_a_new_culture_at_army_futures_command', fetch: WB('20250228060732', 'https://www.army.mil/article/224201/embracing_a_new_culture_at_army_futures_command'), ec: 'official', publisher: 'Army News Service', label: 'Army News Service: embracing a new culture at Army Futures Command', limits: L.armyNews },
  { id: 'army-aal-entrepreneur-in-residence', url: 'https://www.army.mil/article/268663/', fetch: WB('20260614231412', 'https://www.army.mil/article/268663/'), ec: 'official', publisher: 'U.S. Army', label: 'Army.mil: DA Civilian brings entrepreneurship to the Army (AAL at Capital Factory)', limits: L.armyNews },
  { id: 'aal-home-2026-10-23', url: 'https://aal.mil/', ec: 'official', publisher: 'Army Applications Laboratory', label: 'Army Applications Laboratory home page giving its address as Capital Factory, 701 Brazos St., Austin', limits: 'An official unit home page states its address and featured items as of retrieval; it does not show when the unit moved in, lease terms, payments, or any arrangement with the host.' },
  { id: 'diu-2024-03-08-joint-workspace-austin', url: 'https://www.diu.mil/latest/joint-defense-innovation-office-expands-presence-in-austin', ec: 'official', publisher: 'Defense Innovation Unit', published: '2024-03-08', label: 'DIU: AFWERX, DIU and NAVALX launch Joint Defense Innovation workspace at Capital Factory (Baer, Beck, Leigh, Plew quoted)', limits: L.govRelease },
  { id: 'texasmonthly-2026-06-17-baer', url: 'https://www.texasmonthly.com/news-politics/joshua-baer-capital-factory-austin/', ec: 'reported', publisher: 'Texas Monthly', published: '2026-06-17', label: 'Texas Monthly: Joshua Baer, cofounder and CEO of Capital Factory, died 16 June 2026; Bryan Chambers named as president and cofounder', limits: 'Magazine obituary and reporting as of publication; it does not verify role dates, holdings or decision authority against primary records, and it does not name a successor CEO.' },
  { id: 'cbsaustin-2026-06-17-baer', url: 'https://cbsaustin.com/news/local/capital-factory-ceo-joshua-baer-killed-in-plane-crash-near-laredo-texas', ec: 'reported', publisher: 'CBS Austin', published: '2026-06-17', label: 'CBS Austin: Capital Factory CEO Joshua Baer killed in plane crash near Laredo, 16 June 2026', limits: L.press },
  { id: 'texas-comptroller-capital-factory-entities', url: "https://data.texas.gov/resource/9cir-efmm.json?$where=upper(taxpayer_name)%20like%20'%25CAPITAL%20FACTORY%25'", ec: 'official', publisher: 'Texas Comptroller of Public Accounts (data.texas.gov)', label: 'Texas Comptroller active franchise-tax permit holders whose name contains CAPITAL FACTORY', limits: L.texasTax },
  { id: 'texas-comptroller-station-entities', url: "https://data.texas.gov/resource/9cir-efmm.json?$where=taxpayer_address%20like%20'701%20BRAZOS%25'%20AND%20upper(taxpayer_name)%20like%20'STATION%25'", ec: 'official', publisher: 'Texas Comptroller of Public Accounts (data.texas.gov)', label: 'Texas Comptroller active franchise-tax permit holders at 701 Brazos St whose name begins STATION', limits: L.texasTax },
  { id: 'sec-efts-capital-factory-form-d', url: 'https://efts.sec.gov/LATEST/search-index?q=%22Capital%20Factory%22&forms=D&from=0&size=100', ec: 'official', publisher: 'U.S. Securities and Exchange Commission (EDGAR full-text search)', label: 'EDGAR full-text search: Form D and D/A filings containing "Capital Factory"', limits: L.efts, sec: true },
  { id: 'sec-efts-joshua-baer-form-d', url: 'https://efts.sec.gov/LATEST/search-index?q=%22Joshua%20Baer%22&forms=D,D/A', ec: 'official', publisher: 'U.S. Securities and Exchange Commission (EDGAR full-text search)', label: 'EDGAR full-text search: Form D and D/A filings containing "Joshua Baer"', limits: L.efts, sec: true },
];
const FORM_D_INDEXES = ['sec-efts-capital-factory-form-d', 'sec-efts-joshua-baer-form-d'];
const formDId = adsh => `sec-form-d-${adsh}`;

// Form D sources are enumerated from the archived EDGAR search results (deterministic offline).
function formDSources(manifest) {
  const out = new Map();
  for (const idx of FORM_D_INDEXES) {
    const rec = manifest.get(idx);
    if (rec?.status !== 'archived') continue;
    const j = JSON.parse(fs.readFileSync(path.join(root, rec.path), 'utf8'));
    for (const h of j.hits?.hits ?? []) {
      const s = h._source;
      if (!/primary_doc\.xml$/.test(h._id) || !['D', 'D/A'].includes(s.form)) continue;
      const id = formDId(s.adsh);
      if (out.has(id)) continue;
      const cik = String(Number(s.ciks[0]));
      out.set(id, {
        id, url: `https://www.sec.gov/Archives/edgar/data/${cik}/${s.adsh.replace(/-/g, '')}/primary_doc.xml`,
        ec: 'official', publisher: 'U.S. Securities and Exchange Commission (EDGAR)', published: s.file_date, sec: true,
        label: `Form ${s.form} filed ${s.file_date}: ${s.display_names[0].replace(/\s*\(CIK \d+\)\s*$/, '')}`,
        limits: L.formD, form: s.form, file_date: s.file_date, adsh: s.adsh, index: idx,
      });
    }
  }
  return [...out.values()].sort((a, b) => a.file_date.localeCompare(b.file_date) || a.adsh.localeCompare(b.adsh));
}

const readManifest = () => new Map((fs.existsSync(path.join(root, MANIFEST)) ? readJsonl(MANIFEST) : []).map(r => [r.receipt_id, r]));

// =============================================================== fetch mode
function fetchMode(args) {
  const REFRESH = args.includes('--refresh');
  const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const lastHit = new Map();
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const pace = url => {
    const host = new URL(url).host;
    const gap = /archive\.org$/.test(host) ? 8000 : 1100;
    const wait = (lastHit.get(host) ?? 0) + gap - Date.now();
    if (wait > 0) sleep(wait);
    lastHit.set(host, Date.now());
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-archive-'));
  const curl = (url, ua) => {
    pace(url);
    const body = path.join(tmp, 'body');
    if (fs.existsSync(body)) fs.rmSync(body);
    try {
      const meta = execFileSync('curl', ['-sS', '-L', '--max-redirs', '10', '--max-time', String(TIMEOUT_S), '-A', ua,
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
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
    if (/<title>\s*(Just a moment|Attention Required|Access denied|Request Rejected|Log in)/i.test(head) || /Undeclared Automated Tool/i.test(head)) return 'bot_challenge_or_login';
    return null;
  };
  const extFor = (ct, url) => {
    const c = ct.toLowerCase();
    if (c.includes('json')) return 'json';
    if (c.includes('xml') || /\.xml$/i.test(new URL(url).pathname)) return 'xml';
    if (c.includes('html')) return 'html';
    return 'txt';
  };
  const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const manifest = readManifest();
  fs.mkdirSync(path.join(root, STORE), { recursive: true });

  const archiveOne = src => {
    const prev = manifest.get(src.id);
    if (ONLY && src.id !== ONLY) return;
    if (!REFRESH && prev?.status === 'archived' && fs.existsSync(path.join(root, prev.path))
        && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref) return;
    if (src.limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${src.id}`);
    const fetchUrl = src.fetch ?? src.url;
    const res = curl(fetchUrl, src.sec ? SEC_UA : UA);
    const why = blocked(res);
    const base = { receipt_id: src.id, source_url: src.url, fetch_url: fetchUrl, attempted_at: now() };
    if (why) {
      manifest.set(src.id, { ...base, status: 'failed', reason: why, http_status: res.status ?? null });
      console.log(`failed   ${src.id} ${why}`);
      return;
    }
    const ext = extFor(res.contentType, fetchUrl);
    const rel = `${STORE}/${slug(src.id)}.${ext}`;
    fs.writeFileSync(path.join(root, rel), res.bytes);
    const sha = canonicalReceiptHash(path.join(root, rel));
    const at = now();
    const day = at.slice(0, 10);
    const wb = /web\.archive\.org\/web\/(\d{14})id_\//.exec(fetchUrl);
    manifest.set(src.id, {
      ...base, status: 'archived', path: rel, retrieved_at: day, retrieved_at_utc: at, http_status: res.status,
      final_url: res.finalUrl, content_type: res.contentType, content_bytes: res.bytes.length, content_sha256: sha,
      archive: {
        method: 'in_repo_content_hash', ref: `sha256:${sha}`, captured: day, checked: day, fetched_url: fetchUrl,
        content_type: res.contentType, bytes: res.bytes.length,
        ...(wb ? { wayback_ref: `http://web.archive.org/web/${wb[1]}/${src.url}` } : {}),
        note: wb
          ? `Direct fetch of the source is refused to automated clients; hash covers the in-repository copy of the Wayback snapshot ${wb[1]} of the source URL.`
          : 'Hash covers the in-repository copy of the source body as fetched; markup, scripts and later page changes are not normalized.',
      },
    });
    console.log(`archived ${src.id} ${res.bytes.length}B`);
  };

  for (const src of SOURCES) archiveOne(src);
  writeJsonl(MANIFEST, [...manifest.values()]);
  for (const src of formDSources(manifest)) archiveOne(src);
  writeJsonl(MANIFEST, [...manifest.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id)));
  fs.rmSync(tmp, { recursive: true, force: true });
  const all = [...manifest.values()];
  console.log(`fetch: ${all.filter(r => r.status === 'archived').length} archived, ${all.filter(r => r.status === 'failed').length} failed; wrote ${MANIFEST}`);
}

const argv = process.argv.slice(2);
if (argv.includes('--fetch')) { fetchMode(argv); process.exit(0); }

// =============================================================== promote mode
const kebab = s => slug(String(s ?? '').replace(/_/g, '-'));
const uniq = xs => [...new Set(xs)];
const EC_RANK = { official: 1, primary_public: 2, reported: 3 };
const strongest = classes => classes.filter(Boolean).sort((a, b) => (EC_RANK[a] ?? 9) - (EC_RANK[b] ?? 9))[0] ?? 'reported';
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
// Legal-form spellings vary across filings (L.L.C., LLC, L.P., LP); one entity, one id.
const entityKey = s => norm(String(s).replace(/\bL\.\s?L\.\s?C\.?/gi, 'LLC').replace(/\bL\.\s?P\.?(?=\s|$|,)/gi, 'LP').replace(/\bLtd\.?/gi, 'Ltd'));
const usd = n => (n == null ? null : `$${Number(n).toLocaleString('en-US')}`);

// ---------------------------------------------------------------- canonical state
// Rows this lane already merged are not "existing state": a rerun after a merge restages them
// identically and merge-staging skips them as already present.
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const densityMax = readJson('data/canonical/surface-types.json').density_policy.max_hop_actor_count;
const ledgerSurfaceIds = new Set(readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== LANE).map(s => s.surface_id));
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(r => [r.receipt_id, JSON.stringify(r)]));
const canonOrgByKey = new Map(canonOrgs.map(o => [entityKey(o.label), o]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorByLabel = new Map(canonActors.map(a => [norm(a.label), a]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
const canonAliases = readJson('data/canonical/aliases.json').aliases;
const orgAlias = new Map(canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [entityKey(x.alias), x.canonical_id]));
const actorAlias = new Map(canonAliases.filter(x => x.kind === 'actor' && canonActorById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

const newOrgs = new Map();
const newActors = new Map();
const newOrgByKey = new Map();
function ensureOrg(label, kind, extra = {}) {
  const key = entityKey(label);
  if (canonOrgByKey.has(key)) return canonOrgByKey.get(key).id;
  if (orgAlias.has(key)) return orgAlias.get(key);
  if (extra.id && canonOrgById.has(extra.id)) return extra.id;
  if (newOrgByKey.has(key)) return newOrgByKey.get(key);
  const id = extra.id ?? kebab(String(label).replace(/\bL\.\s?L\.\s?C\.?/gi, 'LLC').replace(/\bL\.\s?P\.?(?=\s|$|,)/gi, 'LP'));
  if (canonOrgById.has(id)) return id;
  if (canonActorById.has(id) || newActors.has(id)) throw new Error(`refusing to mint organization ${id}: the id already names an actor`);
  newOrgs.set(id, { id, label, kind, source: LANE, ...(extra.fields ?? {}) });
  newOrgByKey.set(key, id);
  return id;
}
function ensureActor(label, extra = {}) {
  const hit = canonActorByLabel.get(norm(label));
  if (hit) return hit.id;
  if (actorAlias.has(norm(label))) return actorAlias.get(norm(label));
  const id = extra.id ?? kebab(label);
  if (canonActorById.has(id)) return id;
  if (canonOrgById.has(id) || newOrgs.has(id)) throw new Error(`refusing to mint actor ${id}: the id already names an organization`);
  if (!newActors.has(id)) newActors.set(id, { id, label, kind: 'person', source: LANE, ...(extra.fields ?? {}) });
  return id;
}

// ---------------------------------------------------------------- receipts
const manifest = readManifest();
const sourceById = new Map([...SOURCES, ...formDSources(manifest)].map(s => [s.id, s]));
const receiptState = new Map(); // id -> { candidate, problems }
for (const src of sourceById.values()) {
  const arc = manifest.get(src.id);
  const problems = [];
  let candidate = null;
  if (!arc) problems.push('not_attempted');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  else {
    candidate = {
      receipt_id: src.id,
      label: src.label,
      source_type: src.sec ? 'sec_edgar_record' : (src.ec === 'official' ? 'official_public_record' : 'press_or_self_published_page'),
      evidence_class: src.ec,
      publisher: src.publisher,
      ...(src.published ? { source_published_at: src.published } : {}),
      path: arc.path,
      source_url: src.url,
      retrieved_at: arc.retrieved_at,
      content_sha256: arc.content_sha256,
      content_type: arc.content_type,
      content_bytes: arc.content_bytes,
      notes: `Archived ${arc.retrieved_at} by tools/promote-intake-capital-factory.mjs --fetch.${arc.archive.wayback_ref ? ' The stored copy is a Wayback snapshot body because the source refuses automated fetches.' : ''}`,
      limits: src.limits,
      archive: arc.archive,
      intake_source: LANE,
    };
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
    if (ledgerReceipts.has(src.id) && ledgerReceipts.get(src.id) !== JSON.stringify(candidate)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  }
  receiptState.set(src.id, { candidate, problems });
}
const copyText = new Map();
function archivedText(id) {
  const c = receiptState.get(id)?.candidate;
  if (!c) return '';
  if (!copyText.has(id)) {
    const raw = fs.readFileSync(path.join(root, c.path), 'utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&(?:amp|#0*38);/gi, '&').replace(/&(?:#0*39|#x27|apos|rsquo|#8217);/gi, "'").replace(/&nbsp;|&#160;/gi, ' ');
    copyText.set(id, norm(raw));
  }
  return copyText.get(id);
}

// ---------------------------------------------------------------- accounting and staging
const summary = {};
const gaps = [];
const tally = table => (summary[table] ??= { read: 0, promoted_rows: 0, refused: 0, dropped_participants: 0, refusal_reasons: {} });
function refuse(table, rowKey, reason, detail = {}) {
  const t = tally(table);
  t.refused += 1;
  t.refusal_reasons[reason] = (t.refusal_reasons[reason] ?? 0) + 1;
  gaps.push({ lane: LANE, table, row_key: rowKey, reason, ...detail });
}
const surfaces = new Map();
const participation = [];
const partKeys = new Set();
const actorRowByKey = new Map(); // surface_id|actor_id -> the one staged row for that person on that surface
const cited = new Map();

// A row: { table, key, receipts, surface: {...}, parts: [...] }. Each actor part names the person as
// the archived copy shows them (shown); it is kept only with the receipts whose copy shows the name,
// and carries the evidence class of those receipts, so a press-only name never rides on an official
// record's class.
function admitRow(row) {
  const t = tally(row.table);
  t.read += 1;
  const failures = row.receipts.map(id => ({ id, st: receiptState.get(id) })).filter(x => !x.st || x.st.problems.length)
    .map(x => ({ receipt_id: x.id, problems: x.st ? x.st.problems : ['unknown_receipt'] }));
  const okIds = row.receipts.filter(id => receiptState.get(id) && !receiptState.get(id).problems.length);
  if (!okIds.length) {
    refuse(row.table, row.key, failures.some(f => f.problems.some(p => p.startsWith('archive_attempt_failed'))) ? 'receipt_archive_unresolved' : 'receipt_not_admissible',
      { receipt_failures: failures, candidate: { surface: row.surface, participation: row.parts.map(p => ({ ...p, receipt_ids: undefined })) } });
    return false;
  }
  if (!surfaceTypes.has(row.surface.surface_type)) throw new Error(`unknown surface_type ${row.surface.surface_type}`);
  for (const s of row.surface.secondary_surface_types ?? []) if (!surfaceTypes.has(s)) throw new Error(`unknown secondary surface_type ${s}`);
  if (ledgerSurfaceIds.has(row.surface.surface_id)) throw new Error(`surface id collides with ledger: ${row.surface.surface_id}`);
  const ecOf = ids => strongest(ids.map(id => receiptState.get(id).candidate.evidence_class));
  const staged = [];
  for (const p of row.parts) {
    let ids = okIds;
    if (p.actor) {
      const shown = p.shown ?? p.actor;
      ids = okIds.filter(id => archivedText(id).includes(norm(shown)));
      if (!ids.length) {
        t.dropped_participants += 1;
        gaps.push({ lane: LANE, table: row.table, row_key: `${row.key}:${p.actor}`, reason: 'name_not_in_archived_copy', receipts: okIds, shown_as: shown });
        continue;
      }
    }
    const ts = p.time_start ?? row.surface.time_start;
    staged.push({
      surface_id: row.surface.surface_id,
      participant_type: p.actor ? 'actor' : 'organization',
      ...(p.actor ? { actor_id: ensureActor(p.actor, { id: p.id }) } : { organization_id: ensureOrg(p.org, p.kind ?? 'organization', { id: p.id }) }),
      role: p.role,
      participation_type: p.type,
      time_start: ts,
      time_end: p.time_end ?? (p.time_start ? p.time_start : row.surface.time_end ?? ts),
      evidence_class: ecOf(ids),
      receipt_ids: ids,
      ...(p.funding_amount_usd != null ? { funding_amount_usd: p.funding_amount_usd } : {}),
      ...(p.notes ? { notes: p.notes } : {}),
    });
  }
  if (!staged.length) { refuse(row.table, row.key, 'no_participant_admitted', { receipts: okIds }); return false; }
  const usedIds = uniq(staged.flatMap(p => p.receipt_ids));
  for (const id of usedIds) cited.set(id, receiptState.get(id).candidate);
  const s = row.surface;
  surfaces.set(s.surface_id, {
    surface_id: s.surface_id, surface_label: s.surface_label, surface_type: s.surface_type,
    secondary_surface_types: s.secondary_surface_types ?? [], hop_eligible: false,
    ...(s.hop_refusal_reason ? { hop_refusal_reason: s.hop_refusal_reason } : {}),
    scorable: true, status: s.status, bounded_by: s.bounded_by, time_start: s.time_start, time_end: s.time_end ?? s.time_start,
    evidence_class: ecOf(usedIds), receipt_ids: usedIds, notes: s.notes,
    ...(s.date_basis ? { date_basis: s.date_basis } : {}),
    ...(s.extra ?? {}),
    intake_source: LANE,
    ...(failures.length ? { dropped_receipts: failures.map(f => f.receipt_id) } : {}),
  });
  // 2026-10-23 final repair round: one row per person per surface. A Form D names the same
  // person as a related person and as the signer; two rows for one person on one filing made
  // the hop compiler emit every basis twice (DUPLICATE_BASIS_KEY). The roles are merged into the
  // first row (roles joined with "; ", receipts unioned, evidence class recomputed over the
  // union), which reproduces the 2026-10-23 ledger dedupe of 40 Form D person rows.
  for (const p of staged) {
    if (p.participant_type === 'actor') {
      // An exact repeat (same person, participation type and start day: a second signer
      // entry with a respelled title) is still dropped, as before.
      const exactKey = `${p.surface_id}|${p.actor_id}|${p.participation_type}|${p.time_start}`;
      if (partKeys.has(exactKey)) continue;
      partKeys.add(exactKey);
      const actorKey = `${p.surface_id}|${p.actor_id}`;
      const prior = actorRowByKey.get(actorKey);
      if (prior) {
        if (!prior.role.split('; ').includes(p.role)) prior.role = `${prior.role}; ${p.role}`;
        prior.receipt_ids = uniq([...prior.receipt_ids, ...p.receipt_ids]);
        prior.evidence_class = ecOf(prior.receipt_ids);
        if (p.time_end && (!prior.time_end || p.time_end > prior.time_end)) prior.time_end = p.time_end;
        if (p.funding_amount_usd != null && prior.funding_amount_usd == null) prior.funding_amount_usd = p.funding_amount_usd;
        if (p.notes && p.notes !== prior.notes) prior.notes = prior.notes ? `${prior.notes} ${p.notes}` : p.notes;
        continue;
      }
      actorRowByKey.set(actorKey, p);
      participation.push(p);
      continue;
    }
    const key = `${p.surface_id}|${p.actor_id ?? p.organization_id}|${p.participation_type}|${p.time_start}`;
    if (partKeys.has(key)) continue;
    partKeys.add(key);
    participation.push(p);
  }
  t.promoted_rows += 1;
  return true;
}

// Shorthand builders.
const A = (actor, role, type, o = {}) => ({ actor, role, type, ...o });
const O = (org, kind, role, type, o = {}) => ({ org, kind, role, type, ...o });
const CF = (role, type = 'host_or_subject_organization') => O('Capital Factory', 'organization', role, type, { id: 'capital-factory' });
const BAER = (role, type, o = {}) => A('Joshua Baer', role, type, { id: 'joshua-baer', shown: 'Joshua Baer', ...o });
const AFC = (role, type) => O('U.S. Army Futures Command', 'military', role, type, { id: 'army-futures-command' });
const AAL = (role, type) => O('Army Applications Laboratory', 'military', role, type, { id: 'army-applications-laboratory' });
const AFWERX = (role, type) => O('AFWERX', 'military', role, type, { id: 'afwerx' });
const DIU = (role, type) => O('Defense Innovation Unit', 'agency', role, type, { id: 'defense-innovation-unit' });
const S = (id, label, type, secondary, time_start, time_end, status, bounded_by, notes, o = {}) => ({ surface_id: id, surface_label: label, surface_type: type, secondary_surface_types: secondary, time_start, time_end, status, bounded_by, notes, ...o });
const YEAR_NOTE = y => `Year-only date (${y}) from the company's own timeline; recorded as ${y}-01-01, month and day not established.`;
const PLANNED = 'Named in an announcement as planned or featured speakers; the release does not confirm attendance, and co-listing on a speaker roster is not a working relationship.';

// =============================================================== curated rows (press, official, company pages)
const ROWS = [
  { table: 'trajectory', key: 'cf-founding-2009', receipts: ['cf-about-2026-10-23', 'texasmonthly-2026-06-17-baer'],
    surface: S('capital-factory-founding-2009', 'Capital Factory founded in Austin by Joshua Baer, 2009', 'founder_officer_surface', ['surface_factory_capital_layer'], '2009-01-01', '2009-12-31', 'reported_founding', ['Capital Factory About timeline', 'Texas Monthly obituary'],
      `${YEAR_NOTE(2009)} Capital Factory says Baer started it as a mentorship-driven software accelerator taking five companies a year; Texas Monthly (17 June 2026) says Baer founded it in 2009 after URaPI and Netmonitor. No Texas Secretary of State formation record for the 2009 entity was recovered; the active franchise-tax records retrieved name later entities (Capital Factory Properties, LLC chartered 2012-04-30; Capital Factory, LLC chartered 2022-09-28).`, { date_basis: 'year_only' }),
    parts: [BAER('founder', 'founder', { shown: 'Baer' }), CF('company founded', 'founded_organization')] },

  { table: 'government_presence', key: 'diux-austin-2016-official', receipts: ['texas-governor-2016-09-14-diux-austin'],
    surface: S('diux-austin-outpost-at-capital-factory-2016-09-14', 'DIUx Austin outpost opened at Capital Factory, announced by Ash Carter and William McRaven, 14 September 2016', 'government_advisory_surface', ['defence_industrial_surface', 'public_private_ai_infrastructure'], '2016-09-14', '2016-09-14', 'official_announcement', ['Office of the Texas Governor press release'],
      'The Texas Governor\'s release says Secretary of Defense Ash Carter and UT System Chancellor William McRaven announced the opening of the DIUx Austin outpost "at the Capital Factory in Austin today", and quotes Governor Greg Abbott welcoming it. The release does not state lease or space terms or any payment to the host.', { date_basis: 'source_publication_date' }),
    parts: [A('Ash Carter', 'Secretary of Defense; announced the DIUx Austin outpost', 'announcing_official', { shown: 'Ash Carter' }),
      A('William McRaven', 'Chancellor, University of Texas System; announced the outpost', 'announcing_official', { shown: 'William McRaven' }),
      A('Greg Abbott', 'Governor of Texas; welcomed DIUx in the release', 'welcoming_official', { shown: 'Governor Abbott' }),
      DIU('Defense Innovation Unit Experimental (DIUx), third outpost', 'government_innovation_unit'),
      CF('host site named in the release', 'host_venue'),
      O('University of Texas System', 'public_university_system', 'co-announcing institution', 'co_announcing_institution', { id: 'university-of-texas-system' }),
      O('Office of the Texas Governor', 'government', 'issuer of the release', 'release_issuer', { id: 'office-of-the-texas-governor' })] },

  { table: 'government_presence', key: 'diux-austin-2016-press', receipts: ['breakingdefense-2016-09-14-diux-austin', 'builtinaustin-2016-09-14-diux-austin', 'defensenews-2016-09-14-diux-austin'],
    surface: S('diux-austin-roll-out-press-2016-09-14', 'DIUx Austin roll-out at Capital Factory as reported, 14 September 2016', 'government_advisory_surface', ['defence_industrial_surface'], '2016-09-14', '2016-09-14', 'reported_event', ['Breaking Defense', 'Built In Austin', 'Defense News'],
      'Breaking Defense reports DIU(X) Austin will occupy space within Capital Factory, be led by Christine (Christy) Abizaid and staffed largely by Guard and Reserve members reporting to Navy Reserve Commander Doug Beck, and captions a photo of "Capital Factory executive director Joshua Baer" talking with Carter at the roll-out. Built In Austin quotes Baer as Capital Factory founder and names First Lieutenant Samantha Snabes as the first reservist. Defense News reports $65 million in DIUx contracts in the pipeline (a pipeline figure, not obligations).', { date_basis: 'source_publication_date' }),
    parts: [BAER('Capital Factory executive director / founder at the roll-out (as reported)', 'host_executive'),
      A('Ash Carter', 'Secretary of Defense at the roll-out', 'announcing_official', { shown: 'Carter' }),
      A('Christine Abizaid', 'named to lead DIUx Austin', 'unit_lead', { shown: 'Abizaid' }),
      A('Doug Beck', 'Navy Reserve Commander, head of the DIUx in-house reserve unit (as reported)', 'reserve_unit_lead', { id: 'doug-beck', shown: 'Doug Beck' }),
      A('Samantha Snabes', 'first reservist named to the DIUx Joint Reserve Element (as reported)', 'reservist', { shown: 'Samantha Snabes' }),
      DIU('DIUx Austin', 'government_innovation_unit'), CF('host space for DIUx Austin (as reported)', 'host_venue')] },

  { table: 'government_presence', key: 'afwerx-austin-2018', receipts: ['fedscoop-2018-06-29-afwerx-austin', 'aetc-2018-afwerx-austin-hub'],
    surface: S('afwerx-austin-hub-at-capital-factory-2018-06-27', 'AFWERX Austin hub opens at Capital Factory; Air Force Secretary Heather Wilson visits, 27 June 2018', 'government_advisory_surface', ['defence_industrial_surface'], '2018-06-27', '2018-06-27', 'reported_event', ['FedScoop', 'AETC release (when archived)'],
      'FedScoop (29 June 2018) reports Air Force Secretary Heather Wilson visited the new AFWERX hub at Capital Factory "on Wednesday" (27 June 2018, derived from the publication date) and that DIUx already had a presence there. The AETC release could not be archived on this run (Wayback rate-limited); it is listed in gaps.', { date_basis: 'event_weekday_derived_from_publication_date' }),
    parts: [A('Heather Wilson', 'Secretary of the Air Force; visited the hub', 'visiting_official', { shown: 'Heather Wilson' }),
      AFWERX('Air Force innovation hub opened at Capital Factory', 'government_innovation_unit'), CF('host site', 'host_venue'),
      O('U.S. Air Force', 'military', 'parent service', 'parent_service', { id: 'us-air-force' })] },

  { table: 'government_presence', key: 'afc-austin-selection-2018-07-12', receipts: ['kut-2018-07-12-afc-austin'],
    surface: S('army-futures-command-austin-selection-2018-07-12', 'Army selects Austin for Futures Command; Austin Chamber and Capital Factory pitched Central Texas, 12 July 2018', 'government_advisory_surface', ['defence_industrial_surface'], '2018-07-12', '2018-07-12', 'reported_event', ['KUT'],
      'KUT reports the Army chose Austin for Army Futures Command and that "The Austin Chamber of Commerce and Capital Factory were involved in pitching Central Texas for the facility"; Governor Abbott is quoted. The article does not say what the pitch offered.', { date_basis: 'source_publication_date' }),
    parts: [AFC('command whose headquarters site was selected', 'selecting_command'), CF('involved in pitching Central Texas (as reported)', 'site_bid_participant'),
      O('Greater Austin Chamber of Commerce', 'business_association', 'involved in pitching Central Texas (as reported)', 'site_bid_participant', { id: 'greater-austin-chamber-of-commerce' }),
      A('Greg Abbott', 'Governor of Texas; quoted welcoming the selection', 'welcoming_official', { shown: 'Abbott' })] },

  { table: 'government_presence', key: 'afc-hq-news-conference-2018-07-13', receipts: ['stripes-2018-07-16-afc-hq-austin'],
    surface: S('army-futures-command-hq-news-conference-2018-07-13', 'Army Futures Command HQ news conference at the Greater Austin Chamber, 13 July 2018 (Stars and Stripes)', 'government_advisory_surface', ['defence_industrial_surface'], '2018-07-13', '2018-07-16', 'reported_event', ['Stars and Stripes'],
      'Stars and Stripes (16 July 2018) describes a Friday (13 July 2018) news conference at the Greater Austin Chamber of Commerce with Governor Greg Abbott, chamber SVP Charisse Bodisch and Lt. Gen. Eric Wesley; it names Capital Factory as one potential location for a Futures Command team and quotes "Josh Baer, founder and CEO of Capital Factory" ("This is a big deal"). Baer is quoted in the article, not placed at the news conference, so his row carries the publication date.', { date_basis: 'event_weekday_derived_from_publication_date' }),
    parts: [A('Greg Abbott', 'Governor of Texas; spoke at the news conference', 'news_conference_speaker', { shown: 'Greg Abbott' }),
      A('Eric Wesley', 'Lt. Gen., integration management officer for Army Futures Command', 'news_conference_speaker', { shown: 'Eric Wesley' }),
      A('Charisse Bodisch', 'senior vice president of economic development, Greater Austin Chamber of Commerce', 'news_conference_participant', { shown: 'Charisse Bodisch' }),
      BAER('quoted as founder and CEO of Capital Factory', 'quoted_executive', { shown: 'Josh Baer', time_start: '2018-07-16' }),
      AFC('command setting up its headquarters', 'command'), CF('named as a potential location for a Futures Command team', 'prospective_host_venue'),
      O('Greater Austin Chamber of Commerce', 'business_association', 'news conference venue', 'host_venue', { id: 'greater-austin-chamber-of-commerce' })] },

  { table: 'government_presence', key: 'afc-activation-2018-08-24-official', receipts: ['army-2019-afc-first-year'],
    surface: S('army-futures-command-activation-ceremony-2018-08-24', 'Army Futures Command activation ceremony in Austin, 24 August 2018 (Army photo caption)', 'government_advisory_surface', ['defence_industrial_surface'], '2018-08-24', '2018-08-24', 'official_record', ['Army News Service photo caption (article of 22 July 2019)'],
      'An Army News Service photo caption (article by Sean Kimmons, 22 July 2019) records Command Sgt. Maj. Michael Crosby participating in the command\'s activation ceremony in Austin on 24 August 2018 along with Gen. Mark Milley; the caption is truncated before the remaining names. The same article says the Army Applications Laboratory "has set up shop inside Capital Factory".', { date_basis: 'event_date_in_caption' }),
    parts: [A('Michael Crosby', 'Command Sgt. Maj., Army Futures Command senior enlisted leader', 'ceremony_participant', { shown: 'Michael Crosby' }),
      A('Mark Milley', 'Gen., Chief of Staff of the Army', 'ceremony_participant', { shown: 'Mark Milley' }),
      AFC('command activated', 'command')] },

  { table: 'government_presence', key: 'afc-activation-2018-08-24-press', receipts: ['cnbc-2018-08-24-afc-austin', 'defenseone-2018-08-27-afc-austin'],
    surface: S('army-futures-command-ribbon-cutting-press-2018-08-24', 'Army Futures Command ribbon cutting and Capital Factory co-location as reported, 24 August 2018', 'government_advisory_surface', ['defence_industrial_surface'], '2018-08-24', '2018-08-27', 'reported_event', ['CNBC', 'Defense One'],
      'CNBC reports Army Secretary Mark Esper spoke at the ribbon cutting and that the command "shares" space with Capital Factory; it quotes Under Secretary Ryan McCarthy. Defense One (27 August 2018) reports the command "will also have a big physical presence at Capital Factory" and quotes McCarthy and Gen. Mark Milley. Neither shows lease terms or payments.', { date_basis: 'source_publication_date' }),
    parts: [A('Mark Esper', 'Secretary of the Army; spoke at the ribbon cutting (as reported)', 'ceremony_speaker', { shown: 'Mark Esper' }),
      A('Ryan McCarthy', 'Under Secretary of the Army (quoted)', 'quoted_official', { shown: 'Ryan McCarthy' }),
      AFC('command opening in Austin', 'command'), CF('co-location host (as reported)', 'host_venue')] },

  { table: 'government_presence', key: 'murray-visit-2018-09-30', receipts: ['army-2019-afc-new-culture'],
    surface: S('army-futures-command-murray-at-capital-factory-2018-09-30', 'Gen. John Murray visits innovators at Capital Factory, 30 September 2018 (Army photo caption)', 'government_advisory_surface', ['defence_industrial_surface'], '2018-09-30', '2018-09-30', 'official_record', ['Army News Service photo caption (article of 11 July 2019)'],
      'Army photo caption: Gen. John Murray, commander of Army Futures Command, listens to innovators during a visit to Capital Factory on 30 September 2018; "The command\'s Army Applications Laboratory now operates out of the startup hub".', { date_basis: 'event_date_in_caption' }),
    parts: [A('John Murray', 'Gen., Commanding General, Army Futures Command', 'visiting_official', { shown: 'John Murray' }),
      AFC('command', 'command'), AAL('operates out of Capital Factory (per caption)', 'government_innovation_unit'), CF('site visited', 'host_venue')] },

  { table: 'government_presence', key: 'afc-hq-in-capital-factory-building-2018-10-22', receipts: ['army-2018-10-22-afc-global-command'],
    surface: S('army-news-afc-hq-capital-factory-building-2018-10-22', 'Army News Service: AFC HQ in the Capital Factory building, DIU and AFWERX on its fifth floor, AAL and SOFWERX hackathon, 22 October 2018', 'government_advisory_surface', ['defence_industrial_surface', 'public_private_ai_infrastructure'], '2018-10-22', '2018-10-22', 'official_record', ['Army News Service article by David Vergun'],
      'Army News Service (David Vergun, 22 October 2018), reporting Gen. John M. Murray: other organizations "have quietly set up shop in offices on the fifth floor of the Capital Factory building, where AFC HQ is located", including DIU and AFWERX; AFC\'s Army Applications Laboratory and SOCOM\'s SOFWERX sponsored a hackathon; Capital Factory and other hubs "will work with promising startups". This is the Army\'s own statement that its command headquarters sat in the Capital Factory building; it does not give lease or payment terms.', { date_basis: 'source_publication_date' }),
    parts: [A('John Murray', 'Gen., Commanding General, Army Futures Command (quoted)', 'quoted_official', { shown: 'John M. Murray' }),
      AFC('headquarters located in the Capital Factory building (per Army)', 'command'), DIU('offices on the fifth floor of the Capital Factory building (per Army)', 'government_innovation_unit'),
      AFWERX('offices on the fifth floor of the Capital Factory building (per Army)', 'government_innovation_unit'), AAL('AFC parallel unit; hackathon co-sponsor', 'government_innovation_unit'),
      O('SOFWERX', 'military', 'hackathon co-sponsor with AAL (per Army)', 'government_innovation_unit', { id: 'sofwerx' }), CF('building housing AFC HQ, DIU and AFWERX offices (per Army)', 'host_venue')] },

  { table: 'government_presence', key: 'wesley-baer-sxsw-2019-03-08', receipts: ['army-2019-afc-new-culture'],
    surface: S('army-futures-command-wesley-baer-sxsw-startup-crawl-2019-03-08', 'Lt. Gen. Eric Wesley talks with Josh Baer at a SXSW Startup Crawl, 8 March 2019 (Army photo caption)', 'government_advisory_surface', ['defence_industrial_surface'], '2019-03-08', '2019-03-08', 'official_record', ['Army News Service photo caption (article of 11 July 2019)'],
      'Army photo caption: "Lt. Gen. Eric Wesley, center, deputy commanding general of Army Futures Command and commander of Futures and Concepts Center, talks with Josh Baer, founder of Capital Factory, during a South by Southwest Startup Crawl on March 8, 2019, in Austin". A photographed conversation is co-presence on a dated official record; it does not show any agreement or decision.', { date_basis: 'event_date_in_caption' }),
    parts: [A('Eric Wesley', 'Lt. Gen., deputy commanding general of Army Futures Command and commander of Futures and Concepts Center', 'photographed_participant', { shown: 'Eric Wesley' }),
      BAER('founder of Capital Factory (per caption)', 'photographed_participant', { shown: 'Josh Baer' }),
      AFC('command', 'command'), CF('organization of the named founder', 'host_or_subject_organization')] },

  { table: 'government_presence', key: 'afc-demo-at-capital-factory-2019-04-11', receipts: ['army-2019-afc-new-culture'],
    surface: S('army-futures-command-demonstration-at-capital-factory-2019-04-11', 'Army Futures Command Soldier Lethality CFT equipment demonstration at Capital Factory, 11 April 2019 (Army photo caption)', 'government_advisory_surface', ['defence_industrial_surface'], '2019-04-11', '2019-04-11', 'official_record', ['Army News Service photo caption'],
      'Army photo caption: Sgt. 1st Class William Roth of the Soldier Lethality Cross-Functional Team conducts a live demonstration of new Army equipment at Capital Factory on 11 April 2019.', { date_basis: 'event_date_in_caption' }),
    parts: [A('William Roth', 'Sgt. 1st Class, Soldier Lethality Cross-Functional Team, Army Futures Command', 'demonstrator', { shown: 'William Roth' }),
      AFC('command', 'command'), CF('demonstration site', 'host_venue')] },

  { table: 'government_presence', key: 'aal-eighth-floor-2019', receipts: ['army-2019-afc-new-culture', 'army-2019-afc-first-year'],
    surface: S('army-applications-laboratory-at-capital-factory-2019-07', 'Army Applications Laboratory occupies the eighth floor of Capital Factory (Army News Service, July 2019)', 'government_advisory_surface', ['defence_industrial_surface'], '2019-07-11', '2019-07-22', 'official_record', ['Army News Service articles of 11 and 22 July 2019'],
      'Army News Service: "The Army Applications Laboratory occupies a corner on the eighth floor of Capital Factory" and shares space with other defense agencies (11 July 2019); AAL "has set up shop inside Capital Factory, a hub for startups, to help innovators navigate the Army\'s acquisition process" (22 July 2019, Sean Kimmons).', { date_basis: 'source_publication_date' }),
    parts: [AAL('tenant on the eighth floor of Capital Factory (per Army)', 'government_innovation_unit'), AFC('parent command', 'parent_command'), CF('host building', 'host_venue')] },

  { table: 'government_presence', key: 'cdi-opens-2019', receipts: ['cf-about-2026-10-23', 'cf-government-2026-10-23'],
    surface: S('capital-factory-center-for-defense-innovation-2019', 'Capital Factory Center for Defense Innovation opens with AFC, AFWERX and DIU as tenants, 2019 (company timeline)', 'public_private_ai_infrastructure', ['defence_industrial_surface', 'surface_factory_capital_layer'], '2019-01-01', '2019-12-31', 'self_reported_timeline', ['Capital Factory About and Government pages'],
      `${YEAR_NOTE(2019)} Capital Factory says 23,000 sq ft of public-private collaboration space opened "with Army Futures Command, AFWERX, and DIU as tenants", later renamed the Center for Dual-Use Innovation; its Government page says AFC "establishes its headquarters in Austin" and AFWERX and DIU "come to Capital Factory" in 2018, the Center opens in 2019, Fed Supernova begins in 2020 and the Center is rebranded in 2024 when "a joint DoW innovation space opens on the 8th floor of the Austin Centre". Tenancy is the company's claim; official records above corroborate the AFC, AAL, DIU and AFWERX presence for 2018-2019.`, { date_basis: 'year_only' }),
    parts: [CF('operator of the Center for Defense Innovation (self-reported)', 'facility_operator'),
      O('Center for Dual-Use Innovation', 'facility', 'facility (named Center for Defense Innovation until 2024, per Capital Factory)', 'facility', { id: 'capital-factory-center-for-dual-use-innovation' }),
      AFC('named tenant (self-reported)', 'claimed_tenant'), AFWERX('named tenant (self-reported)', 'claimed_tenant'), DIU('named tenant (self-reported)', 'claimed_tenant')] },

  { table: 'events', key: 'fed-supernova-2021', receipts: ['cf-release-2021-09-15-fed-supernova'],
    surface: S('capital-factory-fed-supernova-2021-09-28', 'Capital Factory Fed Supernova, 28-29 September 2021: named speakers', 'directory_roster_surface', ['defence_industrial_surface'], '2021-09-28', '2021-09-29', 'announced_speaker_roster', ['Capital Factory release of 15 September 2021'],
      `Capital Factory release: Baer says startups at Capital Factory received "$110 million in non-dilutive funding through the Department of Defense" the prior year (a company claim). ${PLANNED}`, { date_basis: 'announced_event_dates' }),
    parts: [BAER('Capital Factory CEO; host (quoted)', 'event_host_executive'),
      A('Stephanie Ahern', 'Brig. Gen., director of concepts at Army Futures Command (listed speaker)', 'listed_speaker', { shown: 'Stephanie Ahern' }),
      A('Aaron Swain', 'strategic director of digital transformation at VMware (listed speaker)', 'listed_speaker', { shown: 'Aaron Swain' }),
      A('Richard Benson', 'president of the University of Texas at Dallas (listed speaker)', 'listed_speaker', { shown: 'Richard Benson' }),
      A('Joe Lonsdale', 'general partner at 8VC (listed speaker)', 'listed_speaker', { id: 'joe-lonsdale', shown: 'Joe Lonsdale' }),
      CF('event host', 'event_host'), O('Fed Supernova', 'event_series', 'annual defense-innovation event hosted by Capital Factory', 'event_series', { id: 'fed-supernova' })] },

  { table: 'events', key: 'fed-supernova-2022', receipts: ['cf-release-2022-09-21-fed-supernova'],
    surface: S('capital-factory-fed-supernova-2022-09-27', 'Capital Factory Fed Supernova presented by IBM, 27-29 September 2022: planned speakers', 'directory_roster_surface', ['defence_industrial_surface'], '2022-09-27', '2022-09-29', 'announced_speaker_roster', ['Capital Factory release of 21 September 2022'],
      `Capital Factory release; Baer calls the Center for Defense Innovation "the only place in the country where multiple defense innovation units ... all work together in the same physical space". ${PLANNED}`, { date_basis: 'announced_event_dates' }),
    parts: [BAER('Capital Factory Founder & CEO; host (quoted)', 'event_host_executive'),
      A('Young Bang', 'Principal Deputy Assistant Secretary of the Army (ALT) (planned speaker)', 'listed_speaker', { shown: 'Young Bang' }),
      A('Thomas Todd', 'Lt. Gen., Deputy Commanding General, Acquisition and Systems Management, Army Futures Command (planned speaker)', 'listed_speaker', { shown: 'Thomas Todd' }),
      A('Alice Treviño', 'Maj. Gen., Deputy Assistant Secretary for Contracting, Air Force (planned speaker)', 'listed_speaker', { shown: 'Treviño' }),
      A('ShaChelle Manning', 'Chief of Commercial Strategy, DARPA (planned speaker)', 'listed_speaker', { shown: 'ShaChelle Manning' }),
      A('Steven Butow', 'Director, Space Portfolio, Defense Innovation Unit (planned speaker; quoted)', 'listed_speaker', { shown: 'Butow' }),
      A('Martin Salinas', 'Col., Chief Operating Officer, AFWERX (planned speaker)', 'listed_speaker', { shown: 'Martin Salinas' }),
      CF('event host', 'event_host'), O('Fed Supernova', 'event_series', 'annual defense-innovation event hosted by Capital Factory', 'event_series', { id: 'fed-supernova' }),
      O('IBM', 'company', 'presenting sponsor (per release)', 'event_sponsor')] },

  { table: 'government_presence', key: 'joint-defense-innovation-workspace-2024-03-08', receipts: ['diu-2024-03-08-joint-workspace-austin'],
    surface: S('diu-afwerx-navalx-joint-workspace-capital-factory-2024-03-08', 'AFWERX, DIU and NAVALX open a Joint Defense Innovation workspace at Capital Factory, 8 March 2024', 'government_advisory_surface', ['defence_industrial_surface', 'public_private_ai_infrastructure'], '2024-03-08', '2024-03-08', 'official_announcement', ['Defense Innovation Unit release'],
      'DIU release (8 March 2024): the joint workspace is "Located at the Capital Factory ... next to the Army Applications Laboratory"; it quotes Joshua Baer ("Founder and CEO of Capital Factory"; "we\'ve tracked more than $500 million in government funding to Texas startups with dual-use technology", a company claim), DIU Director Doug Beck, AFWERX Director Col. Elliott Leigh and NAVALX Director CAPT Stephen Plew; a ribbon cutting coincided with SXSW 2024. The release does not give space terms or payments.', { date_basis: 'source_publication_date' }),
    parts: [BAER('Founder and CEO of Capital Factory (quoted in the DIU release)', 'quoted_host_executive'),
      A('Doug Beck', 'Director of the Defense Innovation Unit (quoted)', 'quoted_official', { id: 'doug-beck', shown: 'Doug Beck' }),
      A('Elliott Leigh', 'Col., Director of AFWERX and Chief Commercialization Officer, Department of the Air Force (quoted)', 'quoted_official', { shown: 'Elliott Leigh' }),
      A('Stephen Plew', 'CAPT, Director, NAVALX (quoted)', 'quoted_official', { shown: 'Plew' }),
      DIU('joint workspace partner', 'government_innovation_unit'), AFWERX('joint workspace partner', 'government_innovation_unit'),
      O('NAVALX', 'military', 'joint workspace partner', 'government_innovation_unit', { id: 'navalx' }), AAL('adjacent tenant (per release)', 'government_innovation_unit'),
      CF('host site', 'host_venue')] },

  { table: 'government_presence', key: 'station-dc-2024-07', receipts: ['cf-government-2026-10-23'],
    surface: S('capital-factory-station-dc-2024-07', 'Capital Factory launches STATION DC with the City of Washington, D.C., July 2024 (company page)', 'public_private_fund_surface', ['defence_industrial_surface'], '2024-07-01', '2024-07-31', 'self_reported_timeline', ['Capital Factory Government page'],
      'Month-only date (July 2024); Capital Factory says STATION DC "launched in July 2024 in partnership with the City of Washington, D.C." in the Union Market District. The partnership is the company\'s claim; no District record was retrieved.', { date_basis: 'month_only' }),
    parts: [CF('launching organization (self-reported)', 'launching_organization'), O('STATION DC', 'nonprofit_convening', 'innovation hub launched by Capital Factory', 'launched_organization', { id: 'station-dc' }),
      O('Government of the District of Columbia', 'government', 'named partner (self-reported, unconfirmed)', 'claimed_partner', { id: 'government-of-the-district-of-columbia' })] },

  { table: 'events', key: 'station-texas-2025-05-20', receipts: ['cf-release-2025-05-20-station-texas'],
    surface: S('station-texas-founding-executive-director-2025-05-20', 'STATION TEXAS names Riffat Manasia founding Executive Director, 20 May 2025', 'founder_officer_surface', ['defence_industrial_surface'], '2025-05-20', '2025-05-20', 'self_reported_appointment', ['Capital Factory release'],
      'Capital Factory release: STATION TEXAS, a 501(c)(3) "Powered by Capital Factory", names Riffat Manasia founding Executive Director; Baer (Founder and CEO) and Bryan Chambers (Co-Founder and President of Capital Factory) are quoted; focus areas include defense.', { date_basis: 'source_publication_date' }),
    parts: [BAER('Founder and CEO of Capital Factory (quoted)', 'quoted_executive'),
      A('Bryan Chambers', 'Co-Founder and President of Capital Factory (quoted)', 'quoted_executive', { shown: 'Bryan Chambers' }),
      A('Riffat Manasia', 'founding Executive Director, STATION TEXAS', 'appointed_executive', { shown: 'Riffat Manasia' }),
      O('STATION TEXAS', 'nonprofit_convening', 'nonprofit "Powered by Capital Factory"', 'launched_organization', { id: 'station-texas' }), CF('sponsoring organization', 'sponsoring_organization')] },

  { table: 'events', key: 'nightdragon-2025-08-18', receipts: ['cf-release-2025-08-18-nightdragon'],
    surface: S('nightdragon-capital-factory-partnership-2025-08-18', 'NightDragon and Capital Factory partnership for national-defense technology, 18 August 2025', 'customer_vendor_surface', ['defence_industrial_surface', 'surface_factory_capital_layer'], '2025-08-18', '2025-08-18', 'self_reported_partnership', ['NightDragon / Capital Factory release'],
      'Release: NightDragon portfolio companies get access to Capital Factory\'s defense network, "including relationships with defense primes and national security accelerators like the Defense Innovation Unit (DIU), Defense Advanced Research Projects Agency (DARPA)"; quotes Dave DeWalt (NightDragon Founder and CEO) and Baer. Claimed relationships with DIU and DARPA are not confirmed by those agencies.', { date_basis: 'source_publication_date' }),
    parts: [BAER('Founder and CEO of Capital Factory (quoted)', 'quoted_executive'),
      A('Dave DeWalt', 'Founder and CEO of NightDragon (quoted)', 'quoted_executive', { shown: 'Dave DeWalt' }),
      O('NightDragon', 'fund', 'partner (investment and advisory firm)', 'partner_organization', { id: 'nightdragon' }), CF('partner', 'partner_organization')] },

  { table: 'events', key: 'fed-supernova-2025', receipts: ['cf-release-2025-08-19-fed-supernova'],
    surface: S('capital-factory-fed-supernova-2025-08-19', 'Capital Factory Fed Supernova, 19-21 August 2025', 'directory_roster_surface', ['defence_industrial_surface'], '2025-08-19', '2025-08-21', 'announced_event', ['Capital Factory release'],
      'Capital Factory release; Baer is the only person named. The release names no government participants.', { date_basis: 'announced_event_dates' }),
    parts: [BAER('Founder and CEO of Capital Factory; host (quoted)', 'event_host_executive'), CF('event host', 'event_host'),
      O('Fed Supernova', 'event_series', 'annual defense-innovation event hosted by Capital Factory', 'event_series', { id: 'fed-supernova' })] },

  { table: 'capital', key: 'station-nwa-2026-01-13', receipts: ['cf-release-2026-01-13-station-nwa'],
    surface: S('station-nwa-walton-family-foundation-grant-2026-01-13', 'Capital Factory launches STATION NWA with a $1.5 million Walton Family Foundation grant, 13 January 2026', 'public_private_fund_surface', ['surface_factory_capital_layer'], '2026-01-13', '2026-01-13', 'self_reported_grant', ['Capital Factory release'],
      'Capital Factory release: STATION NWA, a 501(c)(3) in Bentonville, launches "Thanks to a $1.5 million grant from the Walton Family Foundation"; quotes Baer (CEO of Capital Factory) and Tom Walton (Chair of the foundation\'s Home Region Program Committee). Planned programming includes Dual-Use Academy. The grant amount is as announced; no grant record was retrieved.', { date_basis: 'source_publication_date', extra: { funding_amount_usd: 1500000, funding_amount_basis: 'grant amount as announced in the release' } }),
    parts: [BAER('CEO of Capital Factory (quoted)', 'quoted_executive'),
      A('Tom Walton', "Chair, Walton Family Foundation Home Region Program Committee (quoted)", 'quoted_funder_representative', { shown: 'Tom Walton' }),
      O('Walton Family Foundation', 'foundation', 'grantor ($1.5 million, as announced)', 'grantor', { id: 'walton-family-foundation', funding_amount_usd: 1500000 }),
      O('STATION NWA', 'nonprofit_convening', 'grantee nonprofit launched by Capital Factory', 'grantee', { id: 'station-nwa' }), CF('launching organization', 'launching_organization')] },

  { table: 'events', key: 'station-austin-2026-03-10', receipts: ['cf-release-2026-03-10-station-austin'],
    surface: S('station-austin-launch-2026-03-10', 'Capital Factory launches STATION Austin non-profit, carrying Fed Supernova and the Center for Dual-Use Innovation, 10 March 2026', 'public_private_ai_infrastructure', ['defence_industrial_surface'], '2026-03-10', '2026-03-10', 'self_reported_launch', ['Capital Factory release'],
      'Release: STATION Austin inherits Fed Supernova, Health Supernova, Austin Tech Week and CF House at SXSW, and "includes the Center for Dual-Use Innovation, 23,000 square feet ... With the Army Applications Lab, AFWERX, DIU, and a dozen other services co-located together"; quotes Baer (CEO & Founder) and Austin Mayor Kirk Watson. Co-location is the company\'s claim as of March 2026.', { date_basis: 'source_publication_date' }),
    parts: [BAER('CEO & Founder of Capital Factory (quoted)', 'quoted_executive'),
      A('Kirk Watson', 'Mayor of Austin (quoted)', 'quoted_official', { shown: 'Kirk Watson' }),
      O('STATION Austin', 'nonprofit_convening', 'non-profit launched by Capital Factory', 'launched_organization', { id: 'station-austin' }), CF('launching organization', 'launching_organization'),
      O('Center for Dual-Use Innovation', 'facility', 'facility carried into STATION Austin (per release)', 'facility', { id: 'capital-factory-center-for-dual-use-innovation' }),
      AAL('claimed co-located tenant', 'claimed_tenant'), AFWERX('claimed co-located tenant', 'claimed_tenant'), DIU('claimed co-located tenant', 'claimed_tenant')] },

  { table: 'trajectory', key: 'baer-death-2026-06-16', receipts: ['texasmonthly-2026-06-17-baer', 'cbsaustin-2026-06-17-baer'],
    surface: S('joshua-baer-death-2026-06-16', 'Death of Joshua Baer, cofounder and CEO of Capital Factory, in a plane crash in Laredo, 16 June 2026', 'context_only_surface', [], '2026-06-16', '2026-06-16', 'reported_death', ['Texas Monthly', 'CBS Austin'],
      'CBS Austin (17 June 2026) reports the business jet crashed on a highway in Laredo on Tuesday 16 June 2026 and that Baer was killed; Texas Monthly reports he died Tuesday night, aged fifty, and that Bryan Chambers is president and cofounder. No official record (NTSB docket, death record) was retrieved. Context only: a death is not a hop.', { date_basis: 'event_date_in_source', hop_refusal_reason: 'context_only_event' }),
    parts: [BAER('died 16 June 2026 (as reported)', 'subject_of_death_report'), CF('organization he led', 'host_or_subject_organization')] },

  { table: 'trajectory', key: 'cf-leadership-as-reported-2026-06-17', receipts: ['texasmonthly-2026-06-17-baer'],
    surface: S('capital-factory-leadership-as-reported-2026-06-17', 'Capital Factory leadership as reported at Joshua Baer\'s death, 17 June 2026', 'founder_officer_surface', [], '2026-06-17', '2026-06-17', 'reported_roles', ['Texas Monthly obituary'],
      'Texas Monthly names Baer as cofounder and CEO and Bryan Chambers as "president and cofounder of Capital Factory"; it names no successor CEO. Jan Ryan is quoted as a "Capital Factory partner".', { date_basis: 'source_publication_date' }),
    parts: [BAER('cofounder and CEO (deceased the previous day)', 'reported_role', { shown: 'Baer' }),
      A('Bryan Chambers', 'president and cofounder of Capital Factory (as reported)', 'reported_role', { shown: 'Bryan Chambers' }),
      A('Jan Ryan', 'founder and CEO of 3Hills Group, Capital Factory partner (as quoted)', 'reported_role', { shown: 'Jan Ryan' }),
      CF('company', 'host_or_subject_organization')] },

  { table: 'trajectory', key: 'cf-team-page-2026-10-23', receipts: ['cf-team-2026-10-23', 'cf-newsroom-index-2026-10-23'],
    surface: S('capital-factory-team-page-2026-10-23', 'Capital Factory team page as retrieved 23 October 2026', 'founder_officer_surface', ['surface_factory_capital_layer'], '2026-10-23', '2026-10-23', 'self_represented_roster', ['Capital Factory team page'],
      'Roster as self-represented on the retrieval date. It still lists Joshua Baer as "Founder & CEO" four months after his reported death, and the Capital Factory newsroom index retrieved the same day shows no release after 2 June 2026 (none on his death or a successor), so it is evidence of what the page shows, not of who runs the firm. Jamie Serio (Vice President, Ventures) is the executive officer and signer on every Capital Factory-managed Form D filed after November 2024 (see the sec-form-d surfaces).', { date_basis: 'record_retrieval_date' }),
    parts: [BAER('listed as Founder & CEO (posthumous listing)', 'listed_role'),
      A('Bryan Chambers', 'Co-Founder & President', 'listed_role', { shown: 'Bryan Chambers' }),
      A('Gordon Daugherty', 'Co-Founder & Chairman', 'listed_role', { shown: 'Gordon Daugherty' }),
      A('Jamie Serio', 'Vice President, Ventures', 'listed_role', { shown: 'Jamie Serio' }),
      A('Nick Spiller', 'Managing Director, All Access Fund', 'listed_role', { shown: 'Nick Spiller' }),
      A('Morgan Odell', 'Director of Ventures', 'listed_role', { shown: 'Morgan Odell' }),
      A('Nina Shelat', 'Director of Government Ventures', 'listed_role', { shown: 'Nina Shelat' }),
      A('Luis Martinez', 'Venture Principal', 'listed_role', { shown: 'Luis Martinez' }),
      CF('publisher of the roster', 'roster_publisher')] },

  { table: 'government_presence', key: 'aal-address-2026-10-23', receipts: ['aal-home-2026-10-23'],
    surface: S('army-applications-laboratory-address-capital-factory-2026-10-23', 'Army Applications Laboratory gives its address as Capital Factory, 701 Brazos St., Austin (as retrieved 23 October 2026)', 'government_advisory_surface', ['defence_industrial_surface'], '2026-10-23', '2026-10-23', 'official_page_observation', ['Army Applications Laboratory home page'],
      'The AAL home page footer reads "Capital Factory 701 Brazos St. Austin, TX 78701". Observation dated by retrieval.', { date_basis: 'record_retrieval_date' }),
    parts: [AAL('unit whose official address is Capital Factory', 'government_innovation_unit'), CF('address named on the official page', 'host_venue')] },
];
for (const row of ROWS) admitRow(row);

// =============================================================== SEC Form D filings (official capital record)
const xmlTag = (b, tag) => (new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(b)?.[1] ?? '').trim();
const ENTITY_RE = /\b(LLC|L\.L\.C\.?|Ltd\.?|L\.?P\.?|LP|Inc\.?|Fund|Group|Management|Partners)\b/i;
const PERSON_LABEL = { clarencegordondaugherty: 'Gordon Daugherty' }; // goes by his middle name on the Capital Factory team page
function relatedName(b) {
  const first = xmlTag(b, 'firstName').replace(/^[.*\s]+/, '');
  const middle = xmlTag(b, 'middleName');
  const last = xmlTag(b, 'lastName').replace(/^[.*\s]+/, '');
  const firstNA = !first || first === 'N/A';
  if (/^(LLC|L\.L\.C\.?|Ltd\.?|L\.?P\.?|Inc\.?)$/i.test(first)) return { entity: true, label: `${last.replace(/,\s*$/, '')}, ${first}` };
  const full = [firstNA ? '' : first, middle && middle !== 'N/A' ? middle : '', last].filter(Boolean).join(' ').trim();
  if (firstNA || ENTITY_RE.test(full)) return { entity: true, label: full.replace(/^[.*\s]+/, '') };
  return { entity: false, label: PERSON_LABEL[norm(full)] ?? `${first} ${last}`, full };
}
const formDs = [...sourceById.values()].filter(s => s.adsh);
const parsed = [];
for (const src of formDs) {
  const st = receiptState.get(src.id);
  if (!st?.candidate) { tally('form_d').read += 1; refuse('form_d', src.id, 'receipt_archive_unresolved', { receipt_failures: [{ receipt_id: src.id, problems: st?.problems ?? ['missing'] }] }); continue; }
  const xml = fs.readFileSync(path.join(root, st.candidate.path), 'utf8');
  if (!/Capital Factory|Baer/i.test(xml)) { tally('form_d').read += 1; refuse('form_d', src.id, 'full_text_hit_without_capital_factory_or_baer_in_filing', { issuer: xmlTag(xml, 'entityName') }); continue; }
  const issuerBlock = xmlTag(xml, 'primaryIssuer');
  const offering = xmlTag(xml, 'offeringData');
  const num = v => (/^\d+(\.\d+)?$/.test(v) ? Number(v) : null);
  parsed.push({
    src, cik: xmlTag(issuerBlock, 'cik'), issuer: xmlTag(issuerBlock, 'entityName'), entityType: xmlTag(issuerBlock, 'entityType'),
    jurisdiction: xmlTag(issuerBlock, 'jurisdictionOfInc'), city: xmlTag(xmlTag(issuerBlock, 'issuerAddress'), 'city'), street: xmlTag(xmlTag(issuerBlock, 'issuerAddress'), 'street1'),
    industry: xmlTag(xmlTag(offering, 'industryGroup'), 'industryGroupType'), fundType: xmlTag(xmlTag(offering, 'investmentFundInfo'), 'investmentFundType'),
    firstSale: xmlTag(xmlTag(offering, 'dateOfFirstSale'), 'value') || (/<yetToOccur>true/.test(offering) ? 'yet to occur' : null),
    offered: xmlTag(xmlTag(offering, 'offeringSalesAmounts'), 'totalOfferingAmount'), sold: num(xmlTag(xmlTag(offering, 'offeringSalesAmounts'), 'totalAmountSold')),
    investors: num(xmlTag(xmlTag(offering, 'investors'), 'totalNumberAlreadyInvested')),
    minimum: num(xmlTag(offering, 'minimumInvestmentAccepted')),
    related: [...xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/g)].map(m => ({
      ...relatedName(m[1]), relationships: [...m[1].matchAll(/<relationship>([^<]*)<\/relationship>/g)].map(x => x[1]), clarification: xmlTag(m[1], 'relationshipClarification'),
    })),
    signers: uniq([...xml.matchAll(/<nameOfSigner>([^<]*)<\/nameOfSigner>[\s\S]*?<signatureTitle>([^<]*)<\/signatureTitle>[\s\S]*?<signatureDate>([^<]*)<\/signatureDate>/g)].map(m => JSON.stringify([m[1].trim(), m[2].trim(), m[3].trim()]))).map(s => JSON.parse(s)),
  });
}
// Amendments restate cumulative amounts sold; only the latest filing per issuer carries a funding
// figure, so lane totals do not double count an offering.
const latestByIssuer = new Map();
for (const f of parsed) latestByIssuer.set(f.cik, f.src.adsh);
for (const f of parsed) {
  const { src } = f;
  const isLatest = latestByIssuer.get(f.cik) === src.adsh;
  const cfName = /Capital Factory/i.test(f.issuer) || f.related.some(r => r.entity && /Capital Factory/i.test(r.label));
  const kind = /pooled investment fund/i.test(f.industry) ? 'fund' : 'company';
  const offered = /^\d+$/.test(f.offered) ? Number(f.offered) : null;
  const persons = f.related.filter(r => !r.entity);
  const parts = [
    O(f.issuer, kind, `issuer (${[f.entityType, f.jurisdiction, f.industry, f.fundType].filter(Boolean).join('; ')})`, 'form_d_issuer',
      isLatest && f.sold != null ? { funding_amount_usd: f.sold, notes: `Total amount sold as of this filing (latest Form D for the issuer): ${usd(f.sold)} of ${offered != null ? usd(offered) : f.offered} offered; ${f.investors ?? 'unreported'} investors.` } : {}),
    ...f.related.map(r => (r.entity
      ? O(r.label, /Fund GP|Management|GP\b|UGP/i.test(r.label) ? 'fund_manager' : 'company', `related person: ${r.relationships.join(', ')}${r.clarification ? ` (${r.clarification})` : ''}`, 'form_d_related_entity')
      : A(r.label, `related person: ${r.relationships.join(', ')}${r.clarification ? ` (${r.clarification})` : ''}`, 'form_d_related_person', { shown: r.full ?? r.label }))),
    ...f.signers.map(([name, title, date]) => A(name, `signer: ${title} (signed ${date})`, 'form_d_signer', { shown: name })),
    ...(cfName ? [CF("name-based link: the issuer or its general partner carries the name 'Capital Factory'; the filing does not show ownership or control by Capital Factory", 'name_based_affiliation')]
      : /Capital Factory/i.test(f.street) ? [CF(`address-only link: the issuer gives its address as "${f.street}"; the filing shows no investment, ownership or other relationship`, 'issuer_address_care_of')] : []),
  ];
  admitRow({
    table: 'form_d', key: src.id, receipts: [src.id, src.index],
    surface: S(`sec-form-d-${src.adsh}`, `${f.issuer}: SEC Form ${src.form} filed ${src.file_date}`, 'employment_investment_surface', ['surface_factory_capital_layer'], src.file_date, src.file_date, 'official_form_d_notice', ['SEC Form D notice of exempt offering'],
      `Form ${src.form} (accession ${src.adsh}) for ${f.issuer}, ${f.city || 'address not parsed'}. Offering ${offered != null ? usd(offered) : f.offered || 'not stated'}; sold ${usd(f.sold) ?? 'not stated'}; investors ${f.investors ?? 'not stated'}; first sale ${f.firstSale ?? 'not stated'}${f.minimum != null ? `; minimum investment ${usd(f.minimum)}` : ''}. Related persons: ${f.related.map(r => r.label).join('; ') || 'none'}; signed by ${f.signers.map(s => s[0]).join(', ') || 'unknown'}. Dated by the SEC filing date.${persons.length + f.signers.length === 0 ? ' Names no individual.' : ''} A Form D is a notice, not a registration; amounts are cumulative for the offering and amendments restate them.`,
      { date_basis: 'sec_filing_date', extra: { sec_accession: src.adsh, issuer_cik: f.cik, total_offering_amount_usd: offered, total_amount_sold_usd: f.sold, investors_count: f.investors, date_of_first_sale: f.firstSale } }),
    parts,
  });
}

// =============================================================== Texas Comptroller entity records (official)
const TX = [['texas-comptroller-capital-factory-entities', /CAPITAL FACTORY/], ['texas-comptroller-station-entities', /^STATION /]];
for (const [rid, re] of TX) {
  const st = receiptState.get(rid);
  if (!st?.candidate) { tally('texas_entities').read += 1; refuse('texas_entities', rid, 'receipt_archive_unresolved', { receipt_failures: [{ receipt_id: rid, problems: st?.problems ?? ['missing'] }] }); continue; }
  const rows = JSON.parse(fs.readFileSync(path.join(root, st.candidate.path), 'utf8')).filter(r => re.test(r.taxpayer_name))
    .sort((a, b) => a.taxpayer_number.localeCompare(b.taxpayer_number));
  for (const r of rows) {
    const charter = r.sos_charter_date?.slice(0, 10);
    const resp = r.responsibility_beginning_date?.slice(0, 10);
    const date = charter ?? resp;
    if (!date) { tally('texas_entities').read += 1; refuse('texas_entities', r.taxpayer_number, 'undated'); continue; }
    const name = r.taxpayer_name;
    const link = /^STATION AUSTIN/.test(name) ? O('STATION Austin', 'nonprofit_convening', "name-based link: the registered entity carries the name 'STATION Austin'; the record names no owner", 'name_based_affiliation', { id: 'station-austin' })
      : /CAPITAL FACTORY/.test(name) ? CF("name-based link: the registered entity carries the name 'Capital Factory'; the record names no owner or manager", 'name_based_affiliation') : null;
    admitRow({
      table: 'texas_entities', key: `${rid}:${r.taxpayer_number}`, receipts: [rid],
      surface: S(`texas-franchise-tax-${r.taxpayer_number}`, `${name}: Texas franchise-tax permit record (${charter ? `SOS charter ${charter}` : `tax responsibility from ${resp}`})`, 'founder_officer_surface', ['surface_factory_capital_layer'], date, date, 'official_entity_record', ['Texas Comptroller active franchise-tax permit holders'],
        `Texas Comptroller record for taxpayer ${r.taxpayer_number}: ${name}, ${r.taxpayer_address}, ${r.taxpayer_city} ${r.taxpayer_state}; organization type code ${r.taxpayer_organizational_type}; ${charter ? `Secretary of State file ${r.secretary_of_state_sos_or_coa_file_number}, charter date ${charter}, status ${r.sos_status_code} as of ${r.sos_status_date?.slice(0, 10)}` : 'no Secretary of State charter date on the record (dated by franchise-tax responsibility start, which is not a formation date)'}; right-to-transact code ${r.right_to_transact_business_code}. Names no people.`,
        { date_basis: charter ? 'sos_charter_date' : 'franchise_tax_responsibility_start', extra: { texas_taxpayer_number: r.taxpayer_number, ...(r.secretary_of_state_sos_or_coa_file_number ? { texas_sos_file_number: r.secretary_of_state_sos_or_coa_file_number } : {}) } }),
      parts: [O(name, r.taxpayer_organizational_type === 'PF' ? 'fund' : 'company', `registered entity (type ${r.taxpayer_organizational_type})`, 'registered_entity'), ...(link ? [link] : [])],
    });
  }
}

// =============================================================== hop eligibility (post-staging)
// A hop basis is two or more named people on the same date on a non-reported (official) surface.
for (const s of surfaces.values()) {
  const parts = participation.filter(p => p.surface_id === s.surface_id);
  const actorParts = parts.filter(p => p.participant_type === 'actor');
  const actors = uniq(actorParts.map(p => p.actor_id));
  s.roster_entry_count = parts.length;
  if (s.hop_refusal_reason === 'context_only_event') continue;
  if (actors.length > densityMax) { s.hop_eligible = false; s.hop_refusal_reason = 'dense_roster_density_policy'; continue; }
  const byDate = (ecFilter) => {
    const m = new Map();
    for (const p of actorParts.filter(ecFilter)) { if (!m.has(p.time_start)) m.set(p.time_start, new Set()); m.get(p.time_start).add(p.actor_id); }
    return [...m.values()].some(set => set.size >= 2);
  };
  if (byDate(p => p.evidence_class !== 'reported')) { s.hop_eligible = true; delete s.hop_refusal_reason; }
  else if (byDate(() => true)) { s.hop_eligible = false; s.hop_refusal_reason = 'reported_evidence_without_upgrade_disposition'; }
  else { s.hop_eligible = false; s.hop_refusal_reason = actors.length === 0 ? 'organization_only_evidence' : 'single_actor_context_only'; }
}

// =============================================================== write
const orderedSurfaces = [...surfaces.values()].map(s => {
  const { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, hop_refusal_reason, scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest } = s;
  return { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, ...(hop_refusal_reason ? { hop_refusal_reason } : {}), scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest };
}).sort((a, b) => a.time_start.localeCompare(b.time_start) || a.surface_id.localeCompare(b.surface_id));
const order = new Map(orderedSurfaces.map((s, i) => [s.surface_id, i]));
participation.sort((a, b) => order.get(a.surface_id) - order.get(b.surface_id));
const usedReceiptIds = new Set([...orderedSurfaces.flatMap(s => s.receipt_ids), ...participation.flatMap(p => p.receipt_ids)]);
const receipts = [...cited.values()].filter(r => usedReceiptIds.has(r.receipt_id)).sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const usedOrgIds = new Set(participation.map(p => p.organization_id).filter(Boolean));
const usedActorIds = new Set(participation.map(p => p.actor_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrgIds.has(o.id)).sort((a, b) => a.id.localeCompare(b.id));
const actorsOut = [...newActors.values()].filter(a => usedActorIds.has(a.id)).sort((a, b) => a.id.localeCompare(b.id));
const { errors: contractErrors } = checkReceiptContract(receipts, { root });
if (contractErrors.length) throw new Error(`staged receipts fail the receipt contract: ${contractErrors.map(e => `${e.receipt_id} ${e.message}`).join('; ')}`);
for (const src of sourceById.values()) {
  if (!usedReceiptIds.has(src.id) && !gaps.some(g => g.row_key === src.id || g.receipt_failures?.some(f => f.receipt_id === src.id))) {
    const st = receiptState.get(src.id);
    gaps.push({ lane: LANE, table: 'receipts', row_key: src.id, reason: st?.problems.length ? 'receipt_not_admissible' : 'receipt_archived_not_cited', ...(st?.problems.length ? { problems: st.problems } : {}), source_url: src.url });
  }
}

const fundingTotal = participation.reduce((n, p) => n + (p.funding_amount_usd ?? 0), 0);
writeJsonl(`${OUT}/surfaces.jsonl`, orderedSurfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: actorsOut });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
const hopBases = orderedSurfaces.filter(s => s.hop_eligible).map(s => s.surface_id);
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: 'tools/promote-intake-capital-factory.mjs',
  sources: { manifest: MANIFEST, store: STORE, attempted: manifest.size, archived: [...manifest.values()].filter(r => r.status === 'archived').length, failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })) },
  admission_rule: 'A row is promoted only when its cited receipts satisfy the live receipt contract (public source URL, in-repo archived copy whose SHA-256 matches, limits); a named person is kept only with the receipts whose archived copy shows the name, at those receipts\' evidence class. Hop basis: two or more named people on the same date at official evidence. Otherwise the row or participant goes to gaps.jsonl.',
  tables: Object.fromEntries(Object.entries(summary).sort(([a], [b]) => a.localeCompare(b))),
  staged: {
    surfaces: orderedSurfaces.length, participation: participation.length, receipts: receipts.length,
    new_actors: actorsOut.length, new_organizations: orgsOut.length, gaps: gaps.length,
    hop_eligible_surfaces: hopBases.length, funding_amount_usd_total: fundingTotal,
  },
  hop_bases: hopBases,
});
console.log(`promote-intake-capital-factory: ${orderedSurfaces.length} surfaces (${hopBases.length} hop-eligible), ${participation.length} participation rows, ${receipts.length} receipts, ${actorsOut.length} actors, ${orgsOut.length} organizations staged; ${gaps.length} gaps; funding_amount_usd total ${fundingTotal}.`);
