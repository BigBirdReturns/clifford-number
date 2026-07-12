#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root } from './lib/ledger.mjs';
import { EVENT_HINTS, containsPrivateContact, sha256 } from './lib/official-crawl.mjs';

const config = readJson('data/crawl/sources.json');
const observations = readJsonl('data/crawl/observations.jsonl', { optional: true });
const candidates = readJsonl('data/crawl/candidates.jsonl', { optional: true });
const rejections = readJsonl('data/crawl/rejections.jsonl', { optional: true });
const sourceIds = new Set(config.sources.map(source => source.id));
const sourceById = new Map(config.sources.map(source => [source.id, source]));
const observationIds = new Set();
const candidateIds = new Set();
const rejectionIds = new Set();
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const timestamp = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value ?? '');

for (const observation of observations) {
  assert(!observationIds.has(observation.observation_id), `duplicate observation ${observation.observation_id}`);
  observationIds.add(observation.observation_id);
  assert(sourceIds.has(observation.source_id), `observation ${observation.observation_id} uses unknown source ${observation.source_id}`);
  assert(observation.graph_effect === 'none', `observation ${observation.observation_id} graph_effect must be none`);
  assert(observation.status === 'observed', `observation ${observation.observation_id} must remain observed`);
  assert(observation.causal_status === 'not_established', `observation ${observation.observation_id} cannot assert causation`);
  assert(timestamp(observation.retrieved_at), `observation ${observation.observation_id} has invalid retrieved_at`);
  assert(/^https:\/\//.test(observation.source_url), `observation ${observation.observation_id} lacks HTTPS source_url`);
  try {
    const host = new URL(observation.source_url).hostname.toLowerCase();
    const allowed = sourceById.get(observation.source_id)?.allowed_record_hosts ?? [];
    assert(allowed.some(suffix => host === suffix || host.endsWith(`.${suffix}`)), `observation ${observation.observation_id} source host ${host} is not allowed`);
  } catch {
    errors.push(`observation ${observation.observation_id} has malformed source_url`);
  }
  assert(!containsPrivateContact(observation), `observation ${observation.observation_id} contains private contact/address data`);
  for (const hint of observation.event_hints ?? []) assert(EVENT_HINTS.has(hint), `observation ${observation.observation_id} has invalid event hint ${hint}`);
  for (const amount of observation.amounts ?? []) assert(['requested', 'authorized', 'appropriated', 'allocated', 'obligated', 'outlaid', 'paid', 'ceiling'].includes(amount.amount_kind), `observation ${observation.observation_id} has invalid amount_kind`);
  const snapshotFile = path.join(root, observation.snapshot_path ?? '');
  assert(/^receipts\/crawl\/obs_[a-f0-9]{24}\.json$/.test(observation.snapshot_path ?? ''), `observation ${observation.observation_id} has unsafe snapshot_path`);
  assert(fs.existsSync(snapshotFile), `observation ${observation.observation_id} snapshot missing`);
  if (fs.existsSync(snapshotFile)) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
    assert(sha256(snapshot) === observation.snapshot_sha256, `observation ${observation.observation_id} snapshot hash mismatch`);
    assert(!containsPrivateContact(snapshot), `snapshot ${observation.observation_id} contains private contact/address data`);
  }
}

for (const candidate of candidates) {
  assert(!candidateIds.has(candidate.candidate_id), `duplicate candidate ${candidate.candidate_id}`);
  candidateIds.add(candidate.candidate_id);
  assert(candidate.status === 'intake_only', `candidate ${candidate.candidate_id} cannot self-promote`);
  assert(candidate.graph_effect === 'none', `candidate ${candidate.candidate_id} graph_effect must be none`);
  assert(candidate.causal_status === 'not_established', `candidate ${candidate.candidate_id} cannot assert causation`);
  assert(['high', 'medium', 'low'].includes(candidate.priority), `candidate ${candidate.candidate_id} has invalid priority`);
  assert(['title', 'summary', 'record', 'body'].includes(candidate.match_basis), `candidate ${candidate.candidate_id} has invalid match_basis`);
  assert(!containsPrivateContact(candidate), `candidate ${candidate.candidate_id} contains private contact/address data`);
  assert(candidate.observation_ids?.length > 0, `candidate ${candidate.candidate_id} has no observations`);
  for (const id of candidate.observation_ids ?? []) assert(observationIds.has(id), `candidate ${candidate.candidate_id} references missing observation ${id}`);
}

for (const rejection of rejections) {
  assert(!rejectionIds.has(rejection.rejection_id), `duplicate rejection ${rejection.rejection_id}`);
  rejectionIds.add(rejection.rejection_id);
  assert(rejection.graph_effect === 'none', `rejection ${rejection.rejection_id} graph_effect must be none`);
  assert(sourceIds.has(rejection.source_id), `rejection ${rejection.rejection_id} uses unknown source`);
}

if (errors.length) {
  console.error('validate-crawl failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`validate-crawl: OK (${observations.length} observations, ${candidates.length} candidates, ${rejections.length} rejections)`);
