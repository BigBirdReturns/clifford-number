#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const writeJson = (target, value) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
};
const appendNdjson = (target, rows) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
};

const args = process.argv.slice(2);
const getArg = (name, fallback = undefined) => {
  const index = args.indexOf(name);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
};
const hasArg = (name) => args.includes(name);
const classArg = getArg('--class', 'all').split(',').map((value) => value.trim()).filter(Boolean);
const classSet = new Set(classArg);
const limit = Number.parseInt(getArg('--limit', '100'), 10);
const outputDir = path.resolve(root, getArg('--output-dir', 'build/evidence-hydrology'));
const dryRun = hasArg('--dry-run');
const strict = hasArg('--strict');
if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('--limit must be 1..500');

const sourcesDoc = readJson('data/intake/m04g-evidence-hydrology-sources-01.json');
const pollsDoc = readJson('data/project/m04g-evidence-hydrology-pilot-polls.json');
const sourceById = new Map(sourcesDoc.sources.map((source) => [source.source_id, source]));
const now = new Date();
const isoDate = (date) => date.toISOString().slice(0, 10);
const today = isoDate(now);
const dateMinus = (days) => isoDate(new Date(now.getTime() - days * 86_400_000));
const renderTemplate = (value) => {
  if (typeof value === 'string') return value
    .replaceAll('{today}', today)
    .replaceAll('{date_minus_7}', dateMinus(7))
    .replaceAll('{date_minus_30}', dateMinus(30));
  if (Array.isArray(value)) return value.map(renderTemplate);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, renderTemplate(child)]));
  return value;
};

const selected = pollsDoc.polls
  .filter((poll) => poll.enabled)
  .filter((poll) => classSet.has('all') || classSet.has(poll.hydrology_class))
  .slice(0, limit);

const plan = selected.map((poll) => ({
  poll_id: poll.poll_id,
  source_id: poll.source_id,
  source_name: sourceById.get(poll.source_id)?.name,
  hydrology_class: poll.hydrology_class,
  method: poll.request.method,
  url: renderTemplate(poll.request.url),
  cadence: poll.cadence,
  promotion_ceiling: poll.promotion_ceiling,
}));
if (dryRun) {
  console.log(JSON.stringify({ok:true,dry_run:true,as_of:now.toISOString(),selected:plan.length,plan}, null, 2));
  process.exit(0);
}

const statePath = path.join(outputDir, 'state', 'latest.json');
const previous = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { observations: {} };
const observations = {};
const changes = [];
const candidates = [];

async function readLimited(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('response exceeded configured max_bytes');
      throw new Error(`response exceeded max_bytes=${maxBytes}`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function summarizeBody(buffer, contentType) {
  const text = buffer.toString('utf8');
  const summary = { bytes: buffer.length };
  if (/json/i.test(contentType) || /^[\s]*[\[{]/.test(text)) {
    try {
      const value = JSON.parse(text);
      summary.format = 'json';
      summary.top_level = Array.isArray(value) ? 'array' : typeof value;
      summary.top_level_keys = value && !Array.isArray(value) && typeof value === 'object' ? Object.keys(value).slice(0, 30) : [];
      summary.array_length = Array.isArray(value) ? value.length : null;
      for (const key of ['count','total','total_count','numberOfElements','totalRecords','results']) {
        if (value && typeof value === 'object' && Object.hasOwn(value, key)) {
          const candidate = value[key];
          summary.reported_count = Array.isArray(candidate) ? candidate.length : (typeof candidate === 'number' ? candidate : null);
          if (summary.reported_count !== null) break;
        }
      }
      return summary;
    } catch (error) {
      summary.json_parse_error = error.message;
    }
  }
  summary.format = /xml|rss|atom/i.test(contentType) || /^\s*</.test(text) ? 'markup' : 'text';
  summary.title = text.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim() ?? null;
  summary.preview = text.replace(/\s+/g, ' ').slice(0, 240);
  return summary;
}

async function pollOne(poll) {
  const request = renderTemplate(poll.request);
  const url = new URL(request.url);
  if (url.protocol !== 'https:') throw new Error('only HTTPS pilot polls are allowed');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), poll.timeout_ms);
  const headers = {
    accept: 'application/json, application/xml, text/xml, text/html;q=0.9, */*;q=0.5',
    'user-agent': 'clifford-number-evidence-hydrology/1.0 (+https://github.com/BigBirdReturns/clifford-number)',
    ...(request.headers ?? {}),
  };
  const options = { method: request.method, headers, signal: controller.signal, redirect: 'follow' };
  if (request.body !== undefined) options.body = JSON.stringify(request.body);
  try {
    const response = await fetch(url, options);
    const body = request.method === 'HEAD' ? Buffer.alloc(0) : await readLimited(response, poll.max_bytes);
    const contentType = response.headers.get('content-type') ?? '';
    return {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      content_type: contentType,
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified'),
      date: response.headers.get('date'),
      sha256: crypto.createHash('sha256').update(body).digest('hex'),
      summary: summarizeBody(body, contentType),
    };
  } finally {
    clearTimeout(timer);
  }
}

for (const poll of selected) {
  const started = new Date().toISOString();
  const source = sourceById.get(poll.source_id);
  let result;
  try {
    result = await pollOne(poll);
  } catch (error) {
    result = { ok:false, status:null, error:error.name === 'AbortError' ? 'timeout' : error.message };
  }
  const observation = {
    poll_id: poll.poll_id,
    source_id: poll.source_id,
    source_name: source?.name,
    hydrology_class: poll.hydrology_class,
    started_at: started,
    request: { method: poll.request.method, url: renderTemplate(poll.request.url) },
    promotion_ceiling: 'locator_only',
    ...result,
  };
  const prior = previous.observations?.[poll.poll_id] ?? null;
  const changed = Boolean(prior) && (
    prior.sha256 !== observation.sha256 ||
    prior.status !== observation.status ||
    prior.etag !== observation.etag ||
    prior.last_modified !== observation.last_modified
  );
  observation.changed_from_previous = changed;
  observations[poll.poll_id] = observation;
  if (changed) {
    changes.push({
      event_type: 'source_state_changed',
      observed_at: started,
      poll_id: poll.poll_id,
      source_id: poll.source_id,
      prior: prior ? {status:prior.status,sha256:prior.sha256,etag:prior.etag,last_modified:prior.last_modified} : null,
      current: {status:observation.status,sha256:observation.sha256,etag:observation.etag,last_modified:observation.last_modified},
      promotion_ceiling: 'locator_only',
    });
  }
  if (observation.ok && (changed || !prior)) {
    candidates.push({
      candidate_type: prior ? 'changed_source_locator' : 'new_source_baseline',
      observed_at: started,
      poll_id: poll.poll_id,
      source_id: poll.source_id,
      source_name: source?.name,
      hydrology_class: poll.hydrology_class,
      catchments: source?.catchments ?? [],
      request_url: observation.request.url,
      response_sha256: observation.sha256,
      summary: observation.summary,
      terminal_state: 'unrouted_discovery',
      promotes_to: 'candidate_only',
      graph_effect: 'none',
    });
  }
  console.log(`${poll.poll_id} ${observation.ok ? 'OK' : 'FAIL'} ${observation.status ?? '-'} ${source?.name ?? poll.source_id}`);
}

const snapshot = {
  schema: 'm04g-evidence-hydrology-refresh@1',
  program_id: 'M04G-EH-001',
  observed_at: now.toISOString(),
  selected_classes: classArg,
  counts: {
    selected: selected.length,
    succeeded: Object.values(observations).filter((row) => row.ok).length,
    failed: Object.values(observations).filter((row) => !row.ok).length,
    changed: changes.length,
    candidates: candidates.length,
  },
  observations,
  boundaries: {
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
    estate_completion_claimed: false,
  },
};
writeJson(path.join(outputDir, 'snapshots', 'latest.json'), snapshot);
writeJson(statePath, snapshot);
appendNdjson(path.join(outputDir, 'changes.ndjson'), changes);
appendNdjson(path.join(outputDir, 'candidates.ndjson'), candidates);
writeJson(path.join(outputDir, 'run-plan.json'), { observed_at: now.toISOString(), plan });
console.log(JSON.stringify(snapshot.counts, null, 2));
if (strict && snapshot.counts.succeeded === 0) process.exit(2);
console.log('refresh-m04g-evidence-hydrology: COMPLETE');
