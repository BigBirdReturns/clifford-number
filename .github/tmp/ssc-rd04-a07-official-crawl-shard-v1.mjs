#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SHARD_COUNT = 16;
const SHARD_INDEX = Number(process.env.SHARD_INDEX ?? -1);
const SHARD_ID = String(SHARD_INDEX).padStart(2, '0');
const OUT = path.join(ROOT, `a07-official-crawl-${SHARD_ID}`);
const INPUT = path.join(ROOT, 'a07-sitemap-pass');
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_SHARDS = path.join(ROOT, 'data/intake', A06_SLUG, 'denominator-shards');
const A06_RELEASE = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const RELIEF = new Set(['Grant', 'Partial Grant', 'Stipulation']);
const ALLOWED_HOSTS = new Set([
  'www.cdss.ca.gov', 'cdss.ca.gov',
  'www.dhcs.ca.gov', 'dhcs.ca.gov',
  'www.auditor.ca.gov', 'auditor.ca.gov',
  'courts.ca.gov', 'www.courts.ca.gov'
]);
const MAX_SELECTED_URLS = 50000;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

if (!Number.isInteger(SHARD_INDEX) || SHARD_INDEX < 0 || SHARD_INDEX >= SHARD_COUNT) {
  throw new Error(`SHARD_INDEX must be 0..${SHARD_COUNT - 1}`);
}
fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

const structuralFailures = [];
const unresolved = [];
const fail = (condition, message, context = null) => { if (!condition) structuralFailures.push({ message, context }); };

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeText(value) {
  return decodeEntities(String(value ?? ''))
    .replace(/\r/g, '')
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToText(value) {
  return normalizeText(String(value ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: options.maxBuffer ?? 256 * 1024 * 1024,
    timeout: options.timeout ?? 360_000
  });
  return result;
}

function loadD1Shns() {
  const release = readJson(A06_RELEASE);
  fail(release.combined_sha256 === EXPECTED_A06_RELEASE,
    `canonical A06 release ${release.combined_sha256} != ${EXPECTED_A06_RELEASE}`);
  const shns = new Set();
  let reliefRows = 0;
  const reliefDocuments = new Set();
  for (let index = 0; index < 64; index += 1) {
    const id = String(index).padStart(2, '0');
    const file = path.join(A06_SHARDS, `${id}.json`);
    fail(fs.existsSync(file), `missing canonical A06 shard ${id}`);
    if (!fs.existsSync(file)) continue;
    const shard = readJson(file);
    fail(shard.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `canonical A06 shard ${id} schema`);
    for (const document of shard.documents ?? []) {
      for (const row of document.registry_rows ?? []) {
        if (!RELIEF.has(String(row.disposition ?? '').trim())) continue;
        reliefRows += 1;
        reliefDocuments.add(String(document.document_identity ?? '').trim());
        const shn = String(row.shn_number ?? '').trim();
        fail(Boolean(shn), `blank D1 SHN on registry ${String(row.registry_id ?? '')}`);
        if (shn) shns.add(shn);
      }
    }
  }
  fail(reliefRows === 6633, `D1 relief rows ${reliefRows} != 6633`);
  fail(reliefDocuments.size === 6294, `D1 relief documents ${reliefDocuments.size} != 6294`);
  fail(shns.size === 6292, `D1 SHNs ${shns.size} != 6292`);
  return [...shns].sort();
}

class AhoCorasick {
  constructor(patterns) {
    this.nodes = [{ next: new Map(), fail: 0, output: [] }];
    for (const pattern of patterns) {
      let state = 0;
      for (const char of pattern) {
        const node = this.nodes[state];
        if (!node.next.has(char)) {
          node.next.set(char, this.nodes.length);
          this.nodes.push({ next: new Map(), fail: 0, output: [] });
        }
        state = node.next.get(char);
      }
      this.nodes[state].output.push(pattern);
    }
    const queue = [];
    for (const next of this.nodes[0].next.values()) queue.push(next);
    while (queue.length) {
      const state = queue.shift();
      for (const [char, next] of this.nodes[state].next.entries()) {
        queue.push(next);
        let fallback = this.nodes[state].fail;
        while (fallback && !this.nodes[fallback].next.has(char)) fallback = this.nodes[fallback].fail;
        if (this.nodes[fallback].next.has(char)) fallback = this.nodes[fallback].next.get(char);
        this.nodes[next].fail = fallback;
        this.nodes[next].output.push(...this.nodes[fallback].output);
      }
    }
  }
  search(text) {
    const hits = new Map();
    let state = 0;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      while (state && !this.nodes[state].next.has(char)) state = this.nodes[state].fail;
      if (this.nodes[state].next.has(char)) state = this.nodes[state].next.get(char);
      for (const pattern of this.nodes[state].output) {
        const start = index - pattern.length + 1;
        const left = start === 0 ? '' : text[start - 1];
        const right = index + 1 >= text.length ? '' : text[index + 1];
        const boundary = !/[A-Za-z0-9]/.test(left) && !/[A-Za-z0-9]/.test(right);
        if (!boundary) continue;
        const bucket = hits.get(pattern) ?? [];
        if (bucket.length < 20) bucket.push(start);
        hits.set(pattern, bucket);
      }
    }
    return hits;
  }
}

function completedActionCandidates(text) {
  const normalized = normalizeText(text);
  const lower = normalized.toLowerCase();
  const completed = [
    /\b(?:county|agency|department|state)\s+(?:has\s+)?restored\b/g,
    /\bbenefits?\s+(?:have\s+been|were)\s+restored\b/g,
    /\bbenefits?\s+(?:have\s+been|were)\s+reinstated\b/g,
    /\b(?:county|agency|department|state)\s+(?:has\s+)?reinstated\b/g,
    /\b(?:county|agency|department|state)\s+(?:has\s+)?issued\s+(?:a\s+)?(?:payment|benefit|benefits|allotment|corrective payment)\b/g,
    /\b(?:payment|benefits?|allotment)\s+(?:has\s+been|have\s+been|was|were)\s+issued\b/g,
    /\b(?:county|agency|department|state)\s+(?:has\s+)?paid\b/g,
    /\b(?:county|agency|department|state)\s+(?:has\s+)?complied\b/g,
    /\bcompliance\s+(?:has\s+been|was)\s+(?:completed|achieved|verified)\b/g,
    /\bcorrective\s+(?:payment|benefits?)\s+(?:has\s+been|have\s+been|was|were)\s+(?:issued|paid|provided)\b/g,
    /\bretroactive\s+benefits?\s+(?:has\s+been|have\s+been|was|were)\s+(?:issued|paid|restored|provided)\b/g
  ];
  const exclusion = [
    /\b(?:appellant|claimant|plaintiff|petitioner|respondent)\s+(?:states|stated|alleges|alleged|claims|claimed|argues|argued)\b/i,
    /\bif\s+(?:the\s+)?(?:county|agency|department|state)\b/i,
    /\b(?:shall|must|is ordered to|was ordered to|should|will be required to)\b/i,
    /\brequest(?:s|ed)?\s+that\b/i,
    /\bnot\s+(?:yet\s+)?(?:restored|reinstated|issued|paid|complied)\b/i,
    /\bmay\s+(?:be\s+)?(?:restored|reinstated|issued|paid)\b/i
  ];
  const contexts = [];
  for (const pattern of completed) {
    for (const match of lower.matchAll(pattern)) {
      const start = Math.max(0, match.index - 300);
      const end = Math.min(normalized.length, match.index + match[0].length + 300);
      const context = normalized.slice(start, end);
      contexts.push({
        matched_phrase: normalized.slice(match.index, match.index + match[0].length),
        context,
        disqualified_by_order_allegation_condition_or_negation: exclusion.some((rule) => rule.test(context)),
        context_sha256: sha256(Buffer.from(context, 'utf8'))
      });
    }
  }
  return {
    contexts,
    qualified_contexts: contexts.filter((row) => !row.disqualified_by_order_allegation_condition_or_negation)
  };
}

function loadSelectedUrls() {
  const summaryPath = path.join(INPUT, 'summary.json');
  fail(fs.existsSync(summaryPath), 'missing sitemap pass summary');
  if (!fs.existsSync(summaryPath)) return { summary: null, urls: [] };
  const summary = readJson(summaryPath);
  fail(summary.parent_a06_release_sha256 === EXPECTED_A06_RELEASE, 'sitemap parent A06 digest drift');
  const inventoryDir = path.join(INPUT, 'inventories');
  fail(fs.existsSync(inventoryDir), 'missing sitemap inventory directory');
  const urls = new Map();
  if (fs.existsSync(inventoryDir)) {
    for (const name of fs.readdirSync(inventoryDir).filter((row) => row.endsWith('.json')).sort()) {
      const inventory = readJson(path.join(inventoryDir, name));
      fail(Array.isArray(inventory.lexical_candidate_urls), `inventory ${name} lexical candidates not array`);
      for (const raw of inventory.lexical_candidate_urls ?? []) {
        let parsed;
        try { parsed = new URL(raw); } catch {
          structuralFailures.push({ message: `invalid selected URL ${raw}`, context: { inventory: name } });
          continue;
        }
        fail(ALLOWED_HOSTS.has(parsed.hostname), `selected URL escaped official host ${raw}`, { inventory: name });
        if (!ALLOWED_HOSTS.has(parsed.hostname)) continue;
        const normalized = parsed.href;
        const prior = urls.get(normalized) ?? { url: normalized, inventories: [] };
        prior.inventories.push(name.replace(/\.json$/, ''));
        urls.set(normalized, prior);
      }
    }
  }
  fail(urls.size <= MAX_SELECTED_URLS, `selected URL denominator ${urls.size} exceeds ${MAX_SELECTED_URLS}`);
  const selected = [...urls.values()]
    .map((row) => ({ ...row, inventories: [...new Set(row.inventories)].sort() }))
    .sort((a, b) => a.url.localeCompare(b.url));
  return { summary, urls: selected };
}

function extractText(bodyPath, contentType, directory) {
  const raw = fs.readFileSync(bodyPath);
  const magic = raw.subarray(0, 5).toString('ascii');
  const type = String(contentType ?? '').toLowerCase();
  if (magic === '%PDF-' || type.includes('application/pdf')) {
    const pdfPath = path.join(directory, 'body.pdf');
    fs.renameSync(bodyPath, pdfPath);
    const textPath = path.join(directory, 'body.txt');
    const result = run('pdftotext', ['-layout', pdfPath, textPath]);
    if (result.status !== 0) return { kind: 'pdf', text: null, error: (result.stderr || result.stdout || '').trim(), bodyPath: pdfPath, textPath: null };
    const text = fs.readFileSync(textPath, 'utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(textPath, text);
    return { kind: 'pdf', text, error: null, bodyPath: pdfPath, textPath };
  }
  const decoded = raw.toString('utf8');
  if (type.includes('html') || /<html\b|<!doctype\s+html/i.test(decoded.slice(0, 4096))) {
    const htmlPath = path.join(directory, 'body.html');
    fs.renameSync(bodyPath, htmlPath);
    const text = htmlToText(decoded);
    const textPath = path.join(directory, 'body.txt');
    fs.writeFileSync(textPath, `${text}\n`);
    return { kind: 'html', text, error: null, bodyPath: htmlPath, textPath };
  }
  if (type.startsWith('text/') || type.includes('json') || type.includes('xml')) {
    const textPath = path.join(directory, 'body.txt');
    fs.renameSync(bodyPath, textPath);
    const text = normalizeText(decoded);
    return { kind: 'text', text, error: null, bodyPath: textPath, textPath };
  }
  return { kind: 'binary', text: null, error: 'unsupported_binary_content', bodyPath, textPath: null };
}

function fetchUrl(item, automaton) {
  const urlHash = sha256(Buffer.from(item.url, 'utf8'));
  const directory = path.join(OUT, 'pages', urlHash.slice(0, 2), urlHash);
  ensureDir(directory);
  const bodyPath = path.join(directory, 'body.bin');
  const headersPath = path.join(directory, 'headers.txt');
  const result = run('curl', [
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    item.url
  ], { timeout: 240_000 });
  const meta = (result.stdout || '').trim().split(/\n/);
  const receipt = {
    url: item.url,
    source_inventories: item.inventories,
    url_sha256: urlHash,
    curl_exit: result.status,
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    error: result.status === 0 ? null : (result.stderr || result.stdout || '').trim(),
    headers_path: fs.existsSync(headersPath) ? path.relative(ROOT, headersPath).replaceAll(path.sep, '/') : null
  };
  if (fs.existsSync(headersPath)) {
    const raw = fs.readFileSync(headersPath);
    receipt.headers_bytes = raw.length;
    receipt.headers_sha256 = sha256(raw);
  }
  if (!fs.existsSync(bodyPath)) {
    unresolved.push({ url: item.url, reason: 'no_body', receipt });
    writeJson(path.join(directory, 'fetch.json'), receipt);
    return { receipt, shn_hits: [], language: { contexts: [], qualified_contexts: [] } };
  }
  const body = fs.readFileSync(bodyPath);
  receipt.body_bytes = body.length;
  receipt.body_sha256 = sha256(body);
  if (result.status !== 0 || receipt.http_status < 200 || receipt.http_status >= 400) {
    unresolved.push({ url: item.url, reason: 'fetch_failed_or_non_success_status', receipt });
    receipt.body_path = path.relative(ROOT, bodyPath).replaceAll(path.sep, '/');
    writeJson(path.join(directory, 'fetch.json'), receipt);
    return { receipt, shn_hits: [], language: { contexts: [], qualified_contexts: [] } };
  }
  const extracted = extractText(bodyPath, receipt.content_type, directory);
  receipt.body_kind = extracted.kind;
  receipt.body_path = path.relative(ROOT, extracted.bodyPath).replaceAll(path.sep, '/');
  receipt.text_path = extracted.textPath ? path.relative(ROOT, extracted.textPath).replaceAll(path.sep, '/') : null;
  receipt.extraction_error = extracted.error;
  if (extracted.textPath && fs.existsSync(extracted.textPath)) {
    const raw = fs.readFileSync(extracted.textPath);
    receipt.text_bytes = raw.length;
    receipt.text_sha256 = sha256(raw);
  }
  let shnHits = [];
  let language = { contexts: [], qualified_contexts: [] };
  if (extracted.text !== null) {
    const normalized = normalizeText(extracted.text);
    const hitMap = automaton.search(normalized);
    shnHits = [...hitMap.entries()].map(([shn, offsets]) => ({
      shn,
      occurrence_count_capped: offsets.length,
      contexts: offsets.slice(0, 5).map((offset) => ({
        context: normalized.slice(Math.max(0, offset - 240), Math.min(normalized.length, offset + shn.length + 240)),
        context_sha256: sha256(Buffer.from(normalized.slice(Math.max(0, offset - 240), Math.min(normalized.length, offset + shn.length + 240)), 'utf8'))
      }))
    })).sort((a, b) => a.shn.localeCompare(b.shn));
    language = completedActionCandidates(normalized);
  }
  receipt.shn_hits = shnHits.length;
  receipt.completed_action_contexts = language.contexts.length;
  receipt.qualified_completed_action_contexts = language.qualified_contexts.length;
  writeJson(path.join(directory, 'fetch.json'), receipt);
  writeJson(path.join(directory, 'shn-hits.json'), shnHits);
  writeJson(path.join(directory, 'completed-action-language.json'), language);
  return { receipt, shn_hits: shnHits, language };
}

let summary;
try {
  const shns = loadD1Shns();
  const selected = loadSelectedUrls();
  if (structuralFailures.length) throw new Error('input denominator validation failed');
  const automaton = new AhoCorasick(shns);
  const shardFor = (url) => Number.parseInt(sha256(Buffer.from(`A07-OFFICIAL-CRAWL-V1\n${url}`, 'utf8')).slice(0, 8), 16) % SHARD_COUNT;
  const assigned = selected.urls.filter((row) => shardFor(row.url) === SHARD_INDEX);
  const pages = [];
  const shnPageCandidates = [];
  const genericLanguageCandidates = [];
  for (let index = 0; index < assigned.length; index += 1) {
    const item = assigned[index];
    const result = fetchUrl(item, automaton);
    pages.push(result.receipt);
    if (result.shn_hits.length) {
      shnPageCandidates.push({
        url: item.url,
        final_url: result.receipt.final_url,
        body_sha256: result.receipt.body_sha256,
        text_sha256: result.receipt.text_sha256 ?? null,
        shn_hits: result.shn_hits,
        authority: {
          exact_shn_string_is_same_claimant: false,
          page_is_implementation_receipt: false
        }
      });
    }
    if (result.language.contexts.length) {
      genericLanguageCandidates.push({
        url: item.url,
        final_url: result.receipt.final_url,
        body_sha256: result.receipt.body_sha256,
        shn_hits: result.shn_hits.map((row) => row.shn),
        language: result.language,
        authority: {
          generic_language_is_case_specific: false,
          machine_language_candidate_is_verified_implementation: false
        }
      });
    }
    if ((index + 1) % 25 === 0) console.log(`official crawl shard ${SHARD_ID}: ${index + 1}/${assigned.length}`);
    sleep(100);
  }
  summary = {
    schema_version: 'ssc-rd04-a07-official-crawl-shard@1',
    issue: 739,
    shard: SHARD_ID,
    shard_index: SHARD_INDEX,
    shard_count: SHARD_COUNT,
    status: structuralFailures.length === 0 ? 'pass' : 'fail',
    input: {
      D1_shns: shns.length,
      selected_lexical_urls: selected.urls.length,
      sitemap_probe_status: selected.summary?.status ?? null
    },
    counts: {
      assigned_urls: assigned.length,
      attempted_urls: pages.length,
      successful_bodies: pages.filter((row) => row.curl_exit === 0 && row.http_status >= 200 && row.http_status < 400).length,
      unresolved_urls: unresolved.length,
      pages_with_exact_D1_shn_strings: shnPageCandidates.length,
      exact_D1_shn_strings_matched: new Set(shnPageCandidates.flatMap((row) => row.shn_hits.map((hit) => hit.shn))).size,
      pages_with_completed_action_language: genericLanguageCandidates.length,
      pages_with_qualified_completed_action_language: genericLanguageCandidates.filter((row) => row.language.qualified_contexts.length > 0).length,
      structural_failures: structuralFailures.length
    },
    authority: {
      complete_selected_url_attempt_denominator: pages.length === assigned.length,
      complete_official_public_web_universe: false,
      exact_shn_string_proves_claimant_identity: false,
      exact_shn_string_proves_implementation: false,
      generic_language_proves_case_specific_implementation: false,
      failed_fetch_is_record_absence: false,
      missing_public_page_is_noncompliance: false,
      external_contacts: 0,
      graph_effect: 'none'
    },
    structural_failures
  };
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'page-receipts.json'), pages);
  writeJson(path.join(OUT, 'shn-page-candidates.json'), shnPageCandidates);
  writeJson(path.join(OUT, 'generic-language-candidates.json'), genericLanguageCandidates);
  writeJson(path.join(OUT, 'unresolved-urls.json'), unresolved);
  writeJson(path.join(OUT, 'structural-failures.json'), structuralFailures);
  console.log(JSON.stringify(summary.counts));
  if (structuralFailures.length) throw new Error(`official crawl shard ${SHARD_ID} structural failures ${structuralFailures.length}`);
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a07-official-crawl-shard@1',
      issue: 739,
      shard: SHARD_ID,
      status: 'fail',
      counts: { structural_failures: structuralFailures.length + 1 },
      authority: {
        complete_official_public_web_universe: false,
        exact_shn_string_proves_implementation: false,
        failed_fetch_is_record_absence: false,
        missing_public_page_is_noncompliance: false,
        external_contacts: 0,
        graph_effect: 'none'
      },
      structural_failures: [...structuralFailures, { message: error.message }]
    };
    writeJson(path.join(OUT, 'summary.json'), summary);
    writeJson(path.join(OUT, 'structural-failures.json'), summary.structural_failures);
    writeJson(path.join(OUT, 'unresolved-urls.json'), unresolved);
  }
  console.error(error.stack || error.message);
  process.exit(1);
}
