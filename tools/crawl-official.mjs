#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root, writeJson, writeJsonl } from './lib/ledger.mjs';
import { candidateFromObservation, containsPrivateContact, contentId, fetchAdapterRecords, observationFromRecord, recordMatchesTerm, stableJson } from './lib/official-crawl.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const now = new Date().toISOString();
const config = readJson('data/crawl/sources.json');
const state = readJson('data/crawl/state.json');
const observations = readJsonl('data/crawl/observations.jsonl', { optional: true });
const candidates = readJsonl('data/crawl/candidates.jsonl', { optional: true });
const rejections = readJsonl('data/crawl/rejections.jsonl', { optional: true });

const selectedSource = value('source', process.env.CRAWL_SOURCE ?? '');
const selectedTerm = value('term', process.env.CRAWL_TERM ?? '');
const limit = Number(value('limit', process.env.CRAWL_LIMIT ?? config.policy.default_limit));
const maxRecords = Number(value('max-records', process.env.CRAWL_MAX ?? 100));
const delayMs = Number(process.env.CRAWL_DELAY_MS ?? config.policy.default_delay_ms);
const terms = selectedTerm ? [selectedTerm] : config.frontiers.flatMap(frontier => frontier.terms);
const sources = config.sources.filter(source => source.enabled && (!selectedSource || source.id === selectedSource));
const observationById = new Map(observations.map(row => [row.observation_id, row]));
const candidateById = new Map(candidates.map(row => [row.candidate_id, row]));

if (flag('audit')) {
  console.log(`official crawl: ${sources.length} source(s), ${new Set(terms).size} frontier term(s)`);
  for (const source of sources) {
    const auth = source.auth?.kind === 'none' ? 'ready' : process.env[source.auth?.env] ? 'ready' : `skipped without ${source.auth?.env}`;
    console.log(`- ${source.id}: ${source.adapter} · ${auth}`);
  }
  console.log(`queue: ${observations.length} observations, ${candidates.length} candidates, ${rejections.length} rejections`);
  process.exit(0);
}

if (!sources.length) throw new Error(`no enabled source matches ${selectedSource}`);
const headers = { 'User-Agent': process.env.CRAWL_USER_AGENT ?? config.policy.user_agent, Accept: 'application/json,application/atom+xml,text/xml' };
let added = 0;
let seen = 0;

function reject(source, term, rawRecord, reason) {
  const upstreamId = String(rawRecord?.noticeId ?? rawRecord?.document_number ?? rawRecord?.accession ?? rawRecord?.['Award ID'] ?? rawRecord?.link ?? 'unknown');
  const rejection = {
    schema_version: 'official-crawl-rejection@1',
    rejection_id: contentId('reject', source.id, upstreamId, reason),
    source_id: source.id,
    source_record_id: upstreamId,
    term,
    rejected_at: now,
    reason,
    graph_effect: 'none'
  };
  if (!rejections.some(row => row.rejection_id === rejection.rejection_id)) rejections.push(rejection);
}

for (const source of sources) {
  const authEnv = source.auth?.env;
  if (source.auth?.kind !== 'none' && !process.env[authEnv]) {
    state.sources[source.id] = { status: 'skipped_missing_credential', credential_env: authEnv, last_run_at: now };
    console.log(`${source.id}: skipped (set ${authEnv})`);
    continue;
  }
  const sourceState = state.sources[source.id] ?? {};
  const initialLookback = Number(process.env.CRAWL_INITIAL_LOOKBACK_DAYS ?? 365);
  const prior = sourceState.last_successful_at ? new Date(sourceState.last_successful_at) : new Date(new Date(now).getTime() - initialLookback * 86400000);
  const from = value('from', new Date(prior.getTime() - config.policy.overlap_days * 86400000).toISOString().slice(0, 10));
  const to = value('to', now.slice(0, 10));
  let sourceSeen = 0;
  let sourceAdded = 0;
  const errors = [];
  for (const term of [...new Set(terms)]) {
    if (added >= maxRecords) break;
    try {
      const result = await fetchAdapterRecords(source, term, { apiKey: authEnv ? process.env[authEnv] : undefined, headers, secUserAgent: process.env.SEC_USER_AGENT, limit: Math.min(limit, maxRecords - added), from, to, overlapDays: config.policy.overlap_days, now });
      for (const rawRecord of result.records) {
        if (added >= maxRecords) break;
        seen++;
        sourceSeen++;
        try {
          if (!recordMatchesTerm(source.adapter, rawRecord, term)) {
            reject(source, term, rawRecord, 'upstream search result failed local relevance gate');
            continue;
          }
          const observation = observationFromRecord(source, term, rawRecord, now);
          if (containsPrivateContact(observation)) {
            reject(source, term, rawRecord, 'normalized record contained contact or address data');
            continue;
          }
          const existing = observationById.get(observation.observation_id);
          if (!existing) {
            const snapshotPath = path.join(root, observation.snapshot_path);
            fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
            fs.writeFileSync(snapshotPath, `${stableJson(observation.snapshot)}\n`);
            const { snapshot, ...row } = observation;
            observations.push(row);
            observationById.set(row.observation_id, row);
            added++;
            sourceAdded++;
          }
          const current = candidateById.get(observation.candidate_id);
          candidateById.set(observation.candidate_id, candidateFromObservation(observation, current));
        } catch (error) {
          reject(source, term, rawRecord, error.message);
        }
      }
    } catch (error) {
      errors.push(`${term}: ${error.message}`);
    }
    if (delayMs > 0) await sleep(delayMs);
  }
  state.sources[source.id] = {
    status: errors.length ? (sourceSeen ? 'partial' : 'error') : 'ok',
    last_run_at: now,
    ...(sourceSeen ? { last_successful_at: now } : {}),
    window: { from, to },
    records_seen: sourceSeen,
    observations_added: sourceAdded,
    errors
  };
  console.log(`${source.id}: ${sourceSeen} seen, +${sourceAdded} observations${errors.length ? `, ${errors.length} error(s)` : ''}`);
}

writeJsonl('data/crawl/observations.jsonl', observations.sort((a, b) => a.observation_id.localeCompare(b.observation_id)));
writeJsonl('data/crawl/candidates.jsonl', [...candidateById.values()].sort((a, b) => a.candidate_id.localeCompare(b.candidate_id)));
writeJsonl('data/crawl/rejections.jsonl', rejections.sort((a, b) => a.rejection_id.localeCompare(b.rejection_id)));
writeJson('data/crawl/state.json', state);
console.log(`official crawl complete: ${seen} records seen, +${added} immutable observations, ${candidateById.size} candidates`);
