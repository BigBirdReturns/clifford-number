#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  buildAlerts,
  emptyState,
  mergeFeedItems,
  parseFeed,
  readBoundedUtf8Body,
  readJson,
  readJsonl,
  validateRegistry,
  validateWatchTerms,
  writeFeedReceipt,
  writeJson,
  writeJsonl
} from './lib/industrial-exhaust.mjs';

function parseArgs(argv) {
  const flags = new Set(argv.filter(arg => arg.startsWith('--') && !arg.includes('=')));
  const values = Object.fromEntries(argv.filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => arg.slice(2).split(/=(.*)/su).slice(0, 2)));
  return {
    audit: flags.has('--audit'),
    dryRun: flags.has('--dry-run'),
    strict: flags.has('--strict'),
    sourceId: values.source ?? null
  };
}

function isoNow() {
  return new Date().toISOString();
}

async function fetchText(source, sourceState, maxBytes, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
    'user-agent': process.env.EXHAUST_USER_AGENT || 'clifford-number first-party industrial-exhaust crawler'
  };
  if (sourceState?.etag) headers['if-none-match'] = sourceState.etag;
  if (sourceState?.last_modified) headers['if-modified-since'] = sourceState.last_modified;

  try {
    const response = await fetch(source.feed_url, { headers, redirect: 'follow', signal: controller.signal });
    if (response.status === 304) return { status: 304, response, xml: null };
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error(`declared body exceeds ${maxBytes} bytes`);
    const xml = await readBoundedUtf8Body(response, maxBytes);
    return { status: response.status, response, xml };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data', 'exhaust');
  const registry = validateRegistry(readJson(path.join(dataDir, 'sources.json'), null));
  const watchConfig = validateWatchTerms(readJson(path.join(dataDir, 'watch-terms.json'), null));
  const enabledSources = registry.sources.filter(source => source.enabled && (!args.sourceId || source.id === args.sourceId));
  if (args.sourceId && !enabledSources.length) throw new Error(`enabled source not found: ${args.sourceId}`);

  if (args.audit) {
    console.log(JSON.stringify({
      lane: 'first_party_industrial_exhaust',
      enabled_sources: enabledSources.map(source => ({ id: source.id, feed_url: source.feed_url, publisher: source.publisher })),
      watch_term_count: watchConfig.terms.length,
      graph_effect: 'none',
      canonical_mutation_authorized: false
    }, null, 2));
    return;
  }

  const capturedAt = isoNow();
  const maxBytes = Number(process.env.EXHAUST_MAX_FEED_BYTES || 5_000_000);
  const timeoutMs = Number(process.env.EXHAUST_TIMEOUT_MS || 30_000);
  let observations = readJsonl(path.join(dataDir, 'observations.jsonl'));
  const state = readJson(path.join(dataDir, 'state.json'), emptyState());
  const failures = [];
  const summaries = [];

  for (const source of enabledSources) {
    const prior = state.sources?.[source.id] ?? null;
    try {
      const fetched = await fetchText(source, prior, Number(source.max_bytes ?? maxBytes), timeoutMs);
      if (fetched.status === 304) {
        state.sources[source.id] = {
          ...prior,
          last_checked_at: capturedAt,
          last_status: 'not_modified',
          last_error: null
        };
        summaries.push({ source_id: source.id, status: 'not_modified', added: 0 });
        continue;
      }

      const parsedFeed = parseFeed(fetched.xml, source);
      const headers = {
        content_type: fetched.response.headers.get('content-type'),
        etag: fetched.response.headers.get('etag'),
        last_modified: fetched.response.headers.get('last-modified')
      };
      const receiptPath = args.dryRun
        ? `receipts/exhaust/${source.id}/${parsedFeed.feed_sha256}.json`
        : writeFeedReceipt({ rootDir, source, parsedFeed, xml: fetched.xml, capturedAt, responseHeaders: headers });
      const merged = mergeFeedItems({ observations, source, parsedFeed, capturedAt, feedReceiptPath: receiptPath });
      observations = merged.observations;
      state.sources[source.id] = {
        feed_url: source.feed_url,
        publisher: source.publisher,
        last_checked_at: capturedAt,
        last_changed_at: merged.added.length ? capturedAt : prior?.last_changed_at ?? null,
        last_status: 'ok',
        last_error: null,
        feed_sha256: parsedFeed.feed_sha256,
        feed_item_count: parsedFeed.item_count,
        new_observation_count: merged.added.length,
        etag: headers.etag,
        last_modified: headers.last_modified
      };
      summaries.push({
        source_id: source.id,
        status: 'ok',
        feed_items: parsedFeed.item_count,
        added: merged.added.length,
        feed_sha256: parsedFeed.feed_sha256
      });
    } catch (error) {
      failures.push({ source_id: source.id, error: error.message });
      state.sources[source.id] = {
        ...prior,
        feed_url: source.feed_url,
        publisher: source.publisher,
        last_checked_at: capturedAt,
        last_status: 'error',
        last_error: error.message
      };
      summaries.push({ source_id: source.id, status: 'error', error: error.message });
    }
  }

  const alerts = buildAlerts(observations, watchConfig);
  state.last_run_at = capturedAt;
  state.graph_effect = 'none';
  state.promotion_authority = false;
  state.canonical_mutation_authorized = false;

  if (!args.dryRun) {
    fs.mkdirSync(dataDir, { recursive: true });
    writeJsonl(path.join(dataDir, 'observations.jsonl'), observations);
    writeJsonl(path.join(dataDir, 'alerts.jsonl'), alerts);
    writeJson(path.join(dataDir, 'state.json'), state);
  }

  console.log(JSON.stringify({
    lane: 'first_party_industrial_exhaust',
    dry_run: args.dryRun,
    sources: summaries,
    total_observations: observations.length,
    current_alerts: alerts.length,
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
