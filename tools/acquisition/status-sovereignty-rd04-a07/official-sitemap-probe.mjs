#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'a07-official-sitemap-probe');
const A06_RELEASE = path.join(ROOT, 'data/project/status-sovereignty-rd04-calfresh-decision-corpus-a06-release-manifest.json');
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const SEEDS = [
  { id: 'CDSS', url: 'https://www.cdss.ca.gov/sitemap.xml', hosts: ['www.cdss.ca.gov', 'cdss.ca.gov'] },
  { id: 'DHCS', url: 'https://www.dhcs.ca.gov/sitemap.xml', hosts: ['www.dhcs.ca.gov', 'dhcs.ca.gov'] },
  { id: 'AUDITOR', url: 'https://www.auditor.ca.gov/sitemap.xml', hosts: ['www.auditor.ca.gov', 'auditor.ca.gov'] },
  { id: 'COURTS', url: 'https://courts.ca.gov/sitemap.xml', hosts: ['courts.ca.gov', 'www.courts.ca.gov'] },
  { id: 'COURTS-LEGACY', url: 'https://www.courts.ca.gov/sitemap.xml', hosts: ['courts.ca.gov', 'www.courts.ca.gov'] }
];
const MAX_SITEMAPS_PER_SEED = 150;
const MAX_URLS_PER_SEED = 100000;
const CANDIDATE = /(calfresh|food[-_/ ]?(?:stamp|assistance)|\bsnap\b|state[-_/ ]?hearing|appeal|decision|compliance|corrective|restor|lost[-_/ ]?benefit|benefit[-_/ ]?restoration|administrative[-_/ ]?law|county[-_/ ]?welfare|public[-_/ ]?assistance|audit|settlement|stipulation)/i;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };

fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);
const failures = [];

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)]
    .map((match) => decodeXml(match[1].trim()))
    .filter(Boolean);
}

function fetchDocument(seed, url, index) {
  const safe = sha256(Buffer.from(url, 'utf8')).slice(0, 20);
  const dir = path.join(OUT, 'sources', seed.id, `${String(index).padStart(4, '0')}-${safe}`);
  ensureDir(dir);
  const body = path.join(dir, 'body.xml');
  const headers = path.join(dir, 'headers.txt');
  const result = spawnSync('curl', [
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--dump-header', headers,
    '--output', body,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    url
  ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240_000 });
  const meta = (result.stdout || '').trim().split(/\n/);
  const receipt = {
    seed_id: seed.id,
    requested_url: url,
    curl_exit: result.status,
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    error: result.status === 0 ? null : (result.stderr || result.stdout || '').trim()
  };
  if (fs.existsSync(body)) {
    const raw = fs.readFileSync(body);
    receipt.bytes = raw.length;
    receipt.sha256 = sha256(raw);
    receipt.body_path = path.relative(ROOT, body).replaceAll(path.sep, '/');
  } else {
    receipt.bytes = 0;
    receipt.sha256 = null;
    receipt.body_path = null;
  }
  if (fs.existsSync(headers)) {
    const raw = fs.readFileSync(headers);
    receipt.headers_bytes = raw.length;
    receipt.headers_sha256 = sha256(raw);
    receipt.headers_path = path.relative(ROOT, headers).replaceAll(path.sep, '/');
  }
  writeJson(path.join(dir, 'fetch.json'), receipt);
  return { receipt, body };
}

function probeSeed(seed) {
  const queue = [seed.url];
  const visited = new Set();
  const pageUrls = new Set();
  const sitemapUrls = new Set();
  const fetchReceipts = [];
  while (queue.length && visited.size < MAX_SITEMAPS_PER_SEED && pageUrls.size < MAX_URLS_PER_SEED) {
    const requested = queue.shift();
    if (visited.has(requested)) continue;
    visited.add(requested);
    let parsed;
    try { parsed = new URL(requested); } catch {
      failures.push({ seed: seed.id, message: `invalid sitemap URL ${requested}` });
      continue;
    }
    if (!seed.hosts.includes(parsed.hostname)) {
      failures.push({ seed: seed.id, message: `sitemap escaped official host ${requested}` });
      continue;
    }
    const fetched = fetchDocument(seed, requested, visited.size - 1);
    fetchReceipts.push(fetched.receipt);
    if (fetched.receipt.curl_exit !== 0 || fetched.receipt.http_status < 200 || fetched.receipt.http_status >= 400 || !fs.existsSync(fetched.body)) continue;
    const xml = fs.readFileSync(fetched.body, 'utf8');
    const locs = extractLocs(xml);
    const isIndex = /<sitemapindex\b/i.test(xml);
    const isUrlset = /<urlset\b/i.test(xml);
    if (!isIndex && !isUrlset) {
      failures.push({ seed: seed.id, message: `unrecognized sitemap body ${requested}` });
      continue;
    }
    for (const loc of locs) {
      let target;
      try { target = new URL(loc); } catch {
        failures.push({ seed: seed.id, message: `invalid loc ${loc}`, source: requested });
        continue;
      }
      if (!seed.hosts.includes(target.hostname)) {
        failures.push({ seed: seed.id, message: `loc escaped official host ${loc}`, source: requested });
        continue;
      }
      if (isIndex || /(?:sitemap|site-map).*(?:xml|gz)(?:$|\?)/i.test(target.pathname + target.search)) {
        sitemapUrls.add(target.href);
        if (!visited.has(target.href)) queue.push(target.href);
      } else {
        pageUrls.add(target.href);
      }
    }
  }
  const sortedPages = [...pageUrls].sort();
  const candidates = sortedPages.filter((url) => CANDIDATE.test(decodeURIComponent(url)));
  const result = {
    seed_id: seed.id,
    root_url: seed.url,
    official_hosts: seed.hosts,
    counts: {
      sitemap_documents_attempted: visited.size,
      sitemap_documents_successful: fetchReceipts.filter((row) => row.curl_exit === 0 && row.http_status >= 200 && row.http_status < 400).length,
      discovered_sitemap_urls: sitemapUrls.size,
      discovered_page_urls: sortedPages.length,
      lexical_candidate_urls: candidates.length,
      queue_remaining_at_bound: queue.length,
      hit_sitemap_bound: visited.size >= MAX_SITEMAPS_PER_SEED,
      hit_url_bound: pageUrls.size >= MAX_URLS_PER_SEED
    },
    fetch_receipts: fetchReceipts,
    sitemap_urls: [...sitemapUrls].sort(),
    page_urls: sortedPages,
    lexical_candidate_urls: candidates,
    authority: {
      sitemap_fetch_failure_is_page_absence: false,
      lexical_candidate_is_relevant_evidence: false,
      sitemap_inventory_is_complete_when_bound_hit: false,
      no_candidate_url_is_no_implementation: false
    }
  };
  writeJson(path.join(OUT, 'inventories', `${seed.id}.json`), result);
  return result;
}

const release = JSON.parse(fs.readFileSync(A06_RELEASE, 'utf8'));
if (release.combined_sha256 !== EXPECTED_A06_RELEASE) {
  failures.push({ message: `A06 release ${release.combined_sha256} != ${EXPECTED_A06_RELEASE}` });
}
const inventories = SEEDS.map(probeSeed);
const summary = {
  schema_version: 'ssc-rd04-a07-official-sitemap-probe@1',
  issue: 739,
  status: failures.length === 0 ? 'pass' : 'bounded_with_failures',
  parent_a06_release_sha256: release.combined_sha256,
  seeds: SEEDS.map((row) => row.id),
  counts: {
    seeds: inventories.length,
    successful_seed_roots: inventories.filter((row) => row.fetch_receipts[0]?.curl_exit === 0 && row.fetch_receipts[0]?.http_status >= 200 && row.fetch_receipts[0]?.http_status < 400).length,
    sitemap_documents_attempted: inventories.reduce((sum, row) => sum + row.counts.sitemap_documents_attempted, 0),
    sitemap_documents_successful: inventories.reduce((sum, row) => sum + row.counts.sitemap_documents_successful, 0),
    discovered_page_urls: inventories.reduce((sum, row) => sum + row.counts.discovered_page_urls, 0),
    lexical_candidate_urls: inventories.reduce((sum, row) => sum + row.counts.lexical_candidate_urls, 0),
    bound_hits: inventories.filter((row) => row.counts.hit_sitemap_bound || row.counts.hit_url_bound).length,
    failures: failures.length,
    external_contacts: 0
  },
  inventories: inventories.map((row) => ({ seed_id: row.seed_id, counts: row.counts })),
  authority: {
    probe_authorizes_only_bounded_crawl_planning: true,
    lexical_candidate_is_implementation_receipt: false,
    failed_sitemap_is_record_absence: false,
    missing_public_page_is_noncompliance: false,
    external_contacts: 0,
    external_reviews: 0,
    graph_effect: 'none'
  },
  failures
};
writeJson(path.join(OUT, 'summary.json'), summary);
writeJson(path.join(OUT, 'failure-ledger.json'), failures);
console.log(JSON.stringify(summary.counts));
if (release.combined_sha256 !== EXPECTED_A06_RELEASE) process.exit(1);
