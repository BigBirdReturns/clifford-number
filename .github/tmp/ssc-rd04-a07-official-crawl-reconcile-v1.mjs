#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOWNLOAD = path.join(ROOT, 'a07-official-crawl-download');
const INPUT = path.join(ROOT, 'a07-sitemap-pass');
const OUT = path.join(ROOT, 'a07-official-crawl-reconciled');
const SHARD_COUNT = 16;
const ALLOWED_HOSTS = new Set([
  'www.cdss.ca.gov', 'cdss.ca.gov',
  'www.dhcs.ca.gov', 'dhcs.ca.gov',
  'www.auditor.ca.gov', 'auditor.ca.gov',
  'courts.ca.gov', 'www.courts.ca.gov'
]);
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, stable(value)); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const failures = [];
const fail = (condition, message, context = null) => { if (!condition) failures.push({ message, context }); };

function loadSelectedUrls() {
  const summaryPath = path.join(INPUT, 'summary.json');
  fail(fs.existsSync(summaryPath), 'missing sitemap pass summary');
  if (!fs.existsSync(summaryPath)) return { summary: null, selected: [] };
  const summary = readJson(summaryPath);
  fail(summary.parent_a06_release_sha256 === EXPECTED_A06_RELEASE,
    `sitemap parent digest ${summary.parent_a06_release_sha256}`);
  const inventoryDir = path.join(INPUT, 'inventories');
  fail(fs.existsSync(inventoryDir), 'missing sitemap inventories');
  const urls = new Map();
  if (fs.existsSync(inventoryDir)) {
    for (const name of fs.readdirSync(inventoryDir).filter((row) => row.endsWith('.json')).sort()) {
      const inventory = readJson(path.join(inventoryDir, name));
      fail(Array.isArray(inventory.lexical_candidate_urls), `inventory ${name} lexical candidates not array`);
      for (const raw of inventory.lexical_candidate_urls ?? []) {
        let parsed;
        try { parsed = new URL(raw); } catch {
          failures.push({ message: `invalid selected URL ${raw}`, context: { inventory: name } });
          continue;
        }
        fail(ALLOWED_HOSTS.has(parsed.hostname), `selected URL escaped official host ${raw}`);
        if (!ALLOWED_HOSTS.has(parsed.hostname)) continue;
        const normalized = parsed.href;
        const prior = urls.get(normalized) ?? { url: normalized, inventories: [] };
        prior.inventories.push(name.replace(/\.json$/, ''));
        urls.set(normalized, prior);
      }
    }
  }
  return {
    summary,
    selected: [...urls.values()]
      .map((row) => ({ ...row, inventories: [...new Set(row.inventories)].sort() }))
      .sort((a, b) => a.url.localeCompare(b.url))
  };
}

let summary;
try {
  const input = loadSelectedUrls();
  const artifactDirs = fs.existsSync(DOWNLOAD)
    ? fs.readdirSync(DOWNLOAD, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('ssc-rd04-a07-official-crawl-'))
      .map((entry) => path.join(DOWNLOAD, entry.name))
      .sort()
    : [];
  fail(artifactDirs.length === SHARD_COUNT,
    `official crawl artifacts ${artifactDirs.length} != ${SHARD_COUNT}`,
    artifactDirs.map((row) => path.basename(row)));

  const observedShards = new Set();
  const observedUrls = new Map();
  const shardSummaries = [];
  const pageReceipts = [];
  const shnCandidates = [];
  const languageCandidates = [];
  const unresolvedUrls = [];
  let structuralFailures = 0;

  const shardFor = (url) => Number.parseInt(sha256(Buffer.from(`A07-OFFICIAL-CRAWL-V1\n${url}`, 'utf8')).slice(0, 8), 16) % SHARD_COUNT;
  for (const directory of artifactDirs) {
    const summaryPath = path.join(directory, 'summary.json');
    const receiptsPath = path.join(directory, 'page-receipts.json');
    const shnPath = path.join(directory, 'shn-page-candidates.json');
    const languagePath = path.join(directory, 'generic-language-candidates.json');
    const unresolvedPath = path.join(directory, 'unresolved-urls.json');
    fail(fs.existsSync(summaryPath), `missing shard summary ${directory}`);
    fail(fs.existsSync(receiptsPath), `missing shard receipts ${directory}`);
    fail(fs.existsSync(shnPath), `missing shard SHN candidates ${directory}`);
    fail(fs.existsSync(languagePath), `missing shard language candidates ${directory}`);
    fail(fs.existsSync(unresolvedPath), `missing shard unresolved ledger ${directory}`);
    if (![summaryPath, receiptsPath, shnPath, languagePath, unresolvedPath].every(fs.existsSync)) continue;

    const shardSummary = readJson(summaryPath);
    const shardId = String(shardSummary.shard ?? '');
    fail(/^\d{2}$/.test(shardId), `invalid shard id ${shardId}`);
    fail(!observedShards.has(shardId), `duplicate shard ${shardId}`);
    observedShards.add(shardId);
    fail(shardSummary.status === 'pass', `shard ${shardId} status ${shardSummary.status}`,
      shardSummary.structural_failures);
    fail(shardSummary.shard_count === SHARD_COUNT, `shard ${shardId} shard_count ${shardSummary.shard_count}`);
    const receipts = readJson(receiptsPath);
    const shardShn = readJson(shnPath);
    const shardLanguage = readJson(languagePath);
    const shardUnresolved = readJson(unresolvedPath);
    fail(Array.isArray(receipts), `shard ${shardId} receipts not array`);
    fail(Array.isArray(shardShn), `shard ${shardId} SHN candidates not array`);
    fail(Array.isArray(shardLanguage), `shard ${shardId} language candidates not array`);
    fail(Array.isArray(shardUnresolved), `shard ${shardId} unresolved not array`);
    fail(receipts.length === shardSummary.counts.assigned_urls,
      `shard ${shardId} receipts ${receipts.length} != assigned ${shardSummary.counts.assigned_urls}`);
    structuralFailures += Number(shardSummary.counts.structural_failures ?? 0);

    for (const receipt of receipts) {
      const url = String(receipt.url ?? '').trim();
      fail(Boolean(url), `shard ${shardId} blank receipt URL`);
      fail(!observedUrls.has(url), `URL appears in multiple shards ${url}`,
        { first: observedUrls.get(url), second: shardId });
      observedUrls.set(url, shardId);
      fail(shardFor(url) === Number(shardId),
        `URL assigned to shard ${shardId} but expected ${String(shardFor(url)).padStart(2, '0')}`, { url });
    }
    shardSummaries.push(shardSummary);
    pageReceipts.push(...receipts);
    shnCandidates.push(...shardShn);
    languageCandidates.push(...shardLanguage);
    unresolvedUrls.push(...shardUnresolved);
  }

  for (let index = 0; index < SHARD_COUNT; index += 1) {
    fail(observedShards.has(String(index).padStart(2, '0')), `missing shard ${String(index).padStart(2, '0')}`);
  }
  for (const row of input.selected) fail(observedUrls.has(row.url), `selected URL not attempted ${row.url}`);
  for (const url of observedUrls.keys()) fail(input.selected.some((row) => row.url === url), `attempted URL outside selected denominator ${url}`);

  fail(observedUrls.size === input.selected.length,
    `observed URL count ${observedUrls.size} != selected ${input.selected.length}`);
  fail(structuralFailures === 0, `shard structural failures ${structuralFailures}`);

  const shnHitUrls = new Set(shnCandidates.map((row) => row.url));
  const matchedShns = new Set(shnCandidates.flatMap((row) => (row.shn_hits ?? []).map((hit) => hit.shn)));
  const languageUrls = new Set(languageCandidates.map((row) => row.url));
  const qualifiedLanguageUrls = new Set(languageCandidates
    .filter((row) => (row.language?.qualified_contexts?.length ?? 0) > 0)
    .map((row) => row.url));
  const caseJoinedLanguageCandidates = languageCandidates.filter((row) =>
    (row.shn_hits?.length ?? 0) > 0 && (row.language?.qualified_contexts?.length ?? 0) > 0);

  summary = {
    schema_version: 'ssc-rd04-a07-official-crawl-reconciliation@1',
    issue: 739,
    status: failures.length === 0 ? 'pass' : 'fail',
    input: {
      sitemap_probe_status: input.summary?.status ?? null,
      sitemap_failures: input.summary?.counts?.failures ?? null,
      sitemap_bound_hits: input.summary?.counts?.bound_hits ?? null,
      lexical_selected_urls: input.selected.length
    },
    counts: {
      shard_artifacts: artifactDirs.length,
      reconciled_shards: observedShards.size,
      selected_urls: input.selected.length,
      attempted_urls: observedUrls.size,
      successful_bodies: pageReceipts.filter((row) => row.curl_exit === 0 && row.http_status >= 200 && row.http_status < 400).length,
      unresolved_urls: unresolvedUrls.length,
      pages_with_exact_D1_shn_strings: shnHitUrls.size,
      exact_D1_shns_matched: matchedShns.size,
      pages_with_completed_action_language: languageUrls.size,
      pages_with_qualified_completed_action_language: qualifiedLanguageUrls.size,
      pages_with_exact_D1_shn_and_qualified_completed_action_language: caseJoinedLanguageCandidates.length,
      structural_failures: failures.length
    },
    authority: {
      complete_selected_url_attempt_denominator: failures.length === 0,
      complete_official_public_web_universe: false,
      exact_shn_string_proves_claimant_identity: false,
      exact_shn_string_proves_implementation: false,
      generic_language_proves_case_specific_implementation: false,
      combined_string_and_language_hit_is_verified_receipt: false,
      failed_fetch_is_record_absence: false,
      missing_public_page_is_noncompliance: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    failures
  };

  pageReceipts.sort((a, b) => a.url.localeCompare(b.url));
  shnCandidates.sort((a, b) => a.url.localeCompare(b.url));
  languageCandidates.sort((a, b) => a.url.localeCompare(b.url));
  unresolvedUrls.sort((a, b) => String(a.url).localeCompare(String(b.url)));
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'selected-urls.json'), input.selected);
  writeJson(path.join(OUT, 'shard-summaries.json'), shardSummaries.sort((a, b) => a.shard.localeCompare(b.shard)));
  writeJson(path.join(OUT, 'page-receipts.json'), pageReceipts);
  writeJson(path.join(OUT, 'shn-page-candidates.json'), shnCandidates);
  writeJson(path.join(OUT, 'generic-language-candidates.json'), languageCandidates);
  writeJson(path.join(OUT, 'case-joined-machine-candidates.json'), caseJoinedLanguageCandidates);
  writeJson(path.join(OUT, 'unresolved-urls.json'), unresolvedUrls);
  writeJson(path.join(OUT, 'failure-ledger.json'), failures);
  console.log(JSON.stringify(summary.counts));
  if (failures.length) throw new Error(`official crawl reconciliation failed with ${failures.length} errors`);
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a07-official-crawl-reconciliation@1',
      issue: 739,
      status: 'fail',
      counts: { structural_failures: failures.length + 1 },
      authority: {
        complete_official_public_web_universe: false,
        exact_shn_string_proves_implementation: false,
        failed_fetch_is_record_absence: false,
        missing_public_page_is_noncompliance: false,
        external_contacts: 0,
        graph_effect: 'none'
      },
      failures: [...failures, { message: error.message }]
    };
    writeJson(path.join(OUT, 'summary.json'), summary);
    writeJson(path.join(OUT, 'failure-ledger.json'), summary.failures);
  }
  console.error(error.stack || error.message);
  process.exit(1);
}
