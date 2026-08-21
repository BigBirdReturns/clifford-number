#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  readJson,
  readJsonl,
  validateWatchTerms,
  writeJson,
  writeJsonl
} from './lib/industrial-exhaust.mjs';
import {
  ARTIFACT_LANE,
  artifactReceiptPath,
  artifactStateTemplate,
  assertAllowedArtifactUrl,
  buildArtifactAlerts,
  buildHydrationCandidates,
  extractHtmlArtifact,
  mergeArtifactProjection,
  mergeDiscoveryRecords,
  parseHtmlLinkIndex,
  selectHydrationCandidates,
  validateArtifactConfig,
  writeArtifactReceipt,
  writeIndexReceipt
} from './lib/industrial-exhaust-artifacts.mjs';

function parseArgs(argv) {
  const flags = new Set(argv.filter(arg => arg.startsWith('--') && !arg.includes('=')));
  const values = Object.fromEntries(argv.filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => arg.slice(2).split(/=(.*)/su).slice(0, 2)));
  return {
    audit: flags.has('--audit'),
    dryRun: flags.has('--dry-run'),
    strict: flags.has('--strict'),
    refresh: flags.has('--refresh'),
    limit: values.limit ? Number(values.limit) : null
  };
}

function isoNow() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runtimeInteger(name, value, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return parsed;
}

async function readBoundedBody(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel('artifact byte ceiling exceeded');
        throw new Error(`body exceeds ${maxBytes} bytes`);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function fetchBuffer(url, prior, { maxBytes, timeoutMs, accept, config, maxRedirects = 5 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    accept,
    'user-agent': process.env.EXHAUST_USER_AGENT || 'clifford-number first-party industrial-exhaust artifact crawler'
  };
  if (prior?.etag) headers['if-none-match'] = prior.etag;
  if (prior?.last_modified) headers['if-modified-since'] = prior.last_modified;
  let currentUrl = assertAllowedArtifactUrl(url, config);
  const seen = new Set();
  const redirectChain = [];
  try {
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      if (seen.has(currentUrl)) throw new Error(`redirect loop detected at ${currentUrl}`);
      seen.add(currentUrl);
      const response = await fetch(currentUrl, { headers, redirect: 'manual', signal: controller.signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (response.body) await response.body.cancel();
        if (!location) throw new Error(`redirect ${response.status} lacks location`);
        if (hop >= maxRedirects) throw new Error(`redirect chain exceeds ${maxRedirects} hops`);
        const nextUrl = assertAllowedArtifactUrl(new URL(location, currentUrl).href, config);
        redirectChain.push({ status: response.status, from: currentUrl, to: nextUrl });
        currentUrl = nextUrl;
        continue;
      }
      if (response.status === 304) {
        return { status: 304, response, body: null, finalUrl: currentUrl, redirectChain };
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const declared = response.headers.get('content-length');
      if (declared !== null && Number(declared) > maxBytes) {
        if (response.body) await response.body.cancel();
        throw new Error(`declared body exceeds ${maxBytes} bytes`);
      }
      const body = await readBoundedBody(response, maxBytes);
      return { status: response.status, response, body, finalUrl: currentUrl, redirectChain };
    }
    throw new Error('redirect traversal ended without a terminal response');
  } finally {
    clearTimeout(timer);
  }
}

function responseHeaders(fetched) {
  const response = fetched.response;
  return {
    content_type: String(response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() || null,
    etag: response.headers.get('etag'),
    last_modified: response.headers.get('last-modified'),
    final_url: fetched.finalUrl,
    redirect_chain: fetched.redirectChain
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data', 'exhaust');
  const config = validateArtifactConfig(readJson(path.join(dataDir, 'artifact-sources.json'), null));
  const watchConfig = validateWatchTerms(readJson(path.join(dataDir, 'watch-terms.json'), null));
  const limit = args.limit ?? Number(config.hydration.default_limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('limit must be an integer from 1 to 500');

  const enabledIndexes = config.indexes.filter(source => source.enabled);
  if (args.audit) {
    console.log(JSON.stringify({
      lane: ARTIFACT_LANE,
      enabled_indexes: enabledIndexes.map(source => ({ id: source.id, index_url: source.index_url, publisher: source.publisher })),
      allowed_hosts: config.hydration.allowed_hosts,
      default_limit: config.hydration.default_limit,
      graph_effect: 'none',
      canonical_mutation_authorized: false
    }, null, 2));
    return;
  }

  const capturedAt = isoNow();
  const timeoutMs = runtimeInteger('EXHAUST_TIMEOUT_MS', process.env.EXHAUST_TIMEOUT_MS || 30_000, 1_000, 300_000);
  const maxBytes = runtimeInteger('EXHAUST_ARTIFACT_MAX_BYTES', process.env.EXHAUST_ARTIFACT_MAX_BYTES || config.hydration.max_bytes, 1_000, 50_000_000);
  const delayMs = runtimeInteger('EXHAUST_ARTIFACT_DELAY_MS', process.env.EXHAUST_ARTIFACT_DELAY_MS || config.hydration.request_delay_ms, 0, 60_000);
  let discoveryRecords = readJsonl(path.join(dataDir, 'discovery-observations.jsonl'));
  let artifacts = readJsonl(path.join(dataDir, 'artifacts.jsonl'));
  const state = readJson(path.join(dataDir, 'artifact-state.json'), artifactStateTemplate());
  const failures = [];
  const indexSummaries = [];

  for (const source of enabledIndexes) {
    const prior = args.refresh ? null : state.indexes?.[source.id] ?? null;
    try {
      const fetched = await fetchBuffer(source.index_url, prior, {
        maxBytes,
        timeoutMs,
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        config
      });
      if (fetched.status === 304) {
        state.indexes[source.id] = {
...prior,
last_checked_at: capturedAt,
last_status: 'not_modified',
last_error: null,
new_discovery_count: 0,
resolved_url: fetched.finalUrl,
redirect_chain: fetched.redirectChain
        };
        indexSummaries.push({ source_id: source.id, status: 'not_modified', added: 0 });
        continue;
      }
      const html = fetched.body.toString('utf8');
      const parsed = parseHtmlLinkIndex(html, source);
      const headers = responseHeaders(fetched);
      const receiptPath = args.dryRun
        ? `receipts/exhaust/indexes/${source.id}/${parsed.index_sha256}.json`
        : writeIndexReceipt({ rootDir, source, parsedIndex: parsed, html, capturedAt, responseHeaders: headers });
      const merged = mergeDiscoveryRecords({ records: discoveryRecords, source, parsedIndex: parsed, capturedAt, indexReceiptPath: receiptPath });
      discoveryRecords = merged.records;
      state.indexes[source.id] = {
        index_url: source.index_url,
        publisher: source.publisher,
        last_checked_at: capturedAt,
        last_changed_at: merged.added.length ? capturedAt : prior?.last_changed_at ?? null,
        last_status: 'ok',
        last_error: null,
        index_sha256: parsed.index_sha256,
        index_item_count: parsed.item_count,
        new_discovery_count: merged.added.length,
        etag: headers.etag,
        last_modified: headers.last_modified,
        resolved_url: headers.final_url,
        redirect_chain: headers.redirect_chain
      };
      indexSummaries.push({ source_id: source.id, status: 'ok', items: parsed.item_count, added: merged.added.length });
    } catch (error) {
      failures.push({ stage: 'index', source_id: source.id, error: error.message });
      state.indexes[source.id] = { ...prior, index_url: source.index_url, publisher: source.publisher, last_checked_at: capturedAt, last_status: 'error', last_error: error.message, new_discovery_count: 0 };
      indexSummaries.push({ source_id: source.id, status: 'error', error: error.message });
    }
  }

  const baseAlerts = readJsonl(path.join(dataDir, 'alerts.jsonl'));
  const candidates = buildHydrationCandidates({ baseAlerts, discoveryRecords, watchConfig });
  const selected = selectHydrationCandidates(candidates, state, limit);
  const artifactSummaries = [];

  for (let index = 0; index < selected.length; index += 1) {
    const candidate = selected[index];
    let canonicalUrl;
    try {
      canonicalUrl = assertAllowedArtifactUrl(candidate.canonical_url, config);
      const prior = args.refresh ? null : state.pages?.[canonicalUrl] ?? null;
      const fetched = await fetchBuffer(canonicalUrl, prior, {
        maxBytes,
        timeoutMs,
        accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.1',
        config
      });
      if (fetched.status === 304) {
        state.pages[canonicalUrl] = {
...prior,
last_checked_at: capturedAt,
last_status: 'not_modified',
last_error: null,
resolved_url: fetched.finalUrl,
redirect_chain: fetched.redirectChain
        };
        artifactSummaries.push({ canonical_url: canonicalUrl, status: 'not_modified' });
      } else {
        const headers = responseHeaders(fetched);
        const bodySha256 = crypto.createHash('sha256').update(fetched.body).digest('hex');
        let projection;
        if (headers.content_type === 'application/pdf') {
          projection = {
            title: candidate.title,
            description: '',
            normalized_text: '',
            normalized_text_sha256: null,
            published_at: null
          };
        } else if (headers.content_type?.includes('html') || headers.content_type?.startsWith('text/')) {
          projection = extractHtmlArtifact(fetched.body.toString('utf8'), canonicalUrl, config.hydration.max_normalized_chars);
        } else {
          throw new Error(`unsupported artifact content type ${headers.content_type ?? 'unknown'}`);
        }        const receiptPath = args.dryRun
? path.relative(rootDir, artifactReceiptPath(rootDir, canonicalUrl, bodySha256)).split(path.sep).join('/')
: writeArtifactReceipt({ rootDir, canonicalUrl, body: fetched.body, bodySha256, capturedAt, responseHeaders: headers });
const merged = mergeArtifactProjection({
          artifacts,
          candidate: { ...candidate, canonical_url: canonicalUrl },
          sourceProjection: projection,
          capturedAt,
          bodyReceiptPath: receiptPath,
          bodySha256,
          responseHeaders: { ...headers, watch_config: watchConfig }
        });
        artifacts = merged.artifacts;
        state.pages[canonicalUrl] = {
          source_id: candidate.source_id,
          last_checked_at: capturedAt,
          last_changed_at: merged.added ? capturedAt : prior?.last_changed_at ?? null,
          last_status: 'ok',
          last_error: null,
          body_sha256: bodySha256,
          artifact_id: merged.added?.artifact_id ?? merged.unchanged?.artifact_id ?? null,          etag: headers.etag,
last_modified: headers.last_modified,
resolved_url: headers.final_url,
redirect_chain: headers.redirect_chain
};
        artifactSummaries.push({
          canonical_url: canonicalUrl,
          status: 'ok',
          artifact_id: merged.added?.artifact_id ?? merged.unchanged?.artifact_id ?? null,
          changed: Boolean(merged.added),
          matched_terms: merged.added?.matched_terms ?? merged.unchanged?.matched_terms ?? []
        });
      }
    } catch (error) {
      const key = canonicalUrl ?? candidate.canonical_url;
      const prior = state.pages?.[key] ?? null;
      failures.push({ stage: 'artifact', canonical_url: key, error: error.message });
      state.pages[key] = { ...prior, source_id: candidate.source_id, last_checked_at: capturedAt, last_status: 'error', last_error: error.message };
      artifactSummaries.push({ canonical_url: key, status: 'error', error: error.message });
    }
    if (delayMs > 0 && index < selected.length - 1) await sleep(delayMs);
  }

  const artifactAlerts = buildArtifactAlerts(artifacts, { watchConfig, candidates });
  state.last_run_at = capturedAt;
  state.last_candidate_count = candidates.length;
  state.last_selected_count = selected.length;
  state.last_deferred_count = Math.max(0, candidates.length - selected.length);
  state.graph_effect = 'none';
  state.promotion_authority = false;
  state.canonical_mutation_authorized = false;

  if (!args.dryRun) {
    fs.mkdirSync(dataDir, { recursive: true });
    writeJsonl(path.join(dataDir, 'discovery-observations.jsonl'), discoveryRecords);
    writeJsonl(path.join(dataDir, 'artifacts.jsonl'), artifacts);
    writeJsonl(path.join(dataDir, 'artifact-alerts.jsonl'), artifactAlerts);
    writeJson(path.join(dataDir, 'artifact-state.json'), state);
  }

  console.log(JSON.stringify({
    lane: ARTIFACT_LANE,
    dry_run: args.dryRun,
    indexes: indexSummaries,
    candidate_count: candidates.length,
    selected_count: selected.length,
    deferred_count: Math.max(0, candidates.length - selected.length),
    artifacts: artifactSummaries,
    total_discovery_records: discoveryRecords.length,
    total_artifacts: artifacts.length,
    current_artifact_alerts: artifactAlerts.length,
    failures,
    graph_effect: 'none',
    canonical_mutation_authorized: false
  }, null, 2));

  if (args.strict && failures.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
