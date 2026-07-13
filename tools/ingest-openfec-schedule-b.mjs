#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256, stableJson } from './lib/openfec-cohort.mjs';
import { authenticatedScheduleBUrl, normalizeScheduleBPage, publicScheduleBUrl, summarizeScheduleBQueries } from './lib/openfec-schedule-b.mjs';

const args = process.argv.slice(2);
const has = flag => args.includes(`--${flag}`);
const value = (flag, fallback) => {
  const index = args.indexOf(`--${flag}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const root = process.cwd();
const identifiersFile = path.resolve(root, value('identifiers', 'data/research/openfec-presidential-identifiers.json'));
const outputDir = path.resolve(root, value('output', 'build/openfec-schedule-b'));
const perPage = Number(value('per-page', 100));
const maxPages = Number(value('max-pages', 1));
const minDate = value('min-date', undefined);
const maxDate = value('max-date', undefined);
const delayMs = Number(value('delay-ms', process.env.OPENFEC_DELAY_MS ?? 1500));
const maxRetries = Number(value('retries', process.env.OPENFEC_RETRIES ?? 3));
const requestTimeoutMs = Number(value('request-timeout-ms', process.env.OPENFEC_REQUEST_TIMEOUT_MS ?? 15000));
const provisionedKey = process.env.FEC_API_KEY;
const allowDemoKey = has('allow-demo-key') || process.env.OPENFEC_ALLOW_DEMO_KEY === '1';
const apiKey = provisionedKey ?? (allowDemoKey ? 'DEMO_KEY' : null);
const credentialMode = provisionedKey ? 'provisioned_api_key' : allowDemoKey ? 'demo_key_trial' : 'missing';
const userAgent = process.env.CRAWL_USER_AGENT ?? 'clifford-number/0.3 OpenFEC Schedule B intake (+https://github.com/BigBirdReturns/clifford-number)';

if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('--per-page must be an integer from 1 through 100');
if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('--max-pages must be a positive integer');
if (!apiKey) {
  console.error('OpenFEC Schedule B intake blocked: set FEC_API_KEY for a reproducible run, or pass --allow-demo-key for a non-release trial.');
  process.exit(2);
}

const identifiers = JSON.parse(fs.readFileSync(identifiersFile, 'utf8'));
const committees = identifiers.identities.flatMap(identity => identity.authorized_committees.map(committee => ({
  cohort_id: identifiers.cohort_id,
  person_id: identity.person_id,
  person_name: identity.person_name,
  candidate_id: identity.candidate_id,
  committee_id: committee.committee_id,
  committee_name: committee.name,
})));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(outputDir, { recursive: true });
const queriesPath = path.join(outputDir, 'queries.jsonl');
const recordsPath = path.join(outputDir, 'records.jsonl');
const progressPath = path.join(outputDir, 'progress.json');
fs.writeFileSync(queriesPath, '');
fs.writeFileSync(recordsPath, '');
const queries = [];
const records = [];

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': userAgent },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (response.ok) return await response.json();
      const retryable = response.status === 429 || response.status === 503;
      const retryAfter = Number(response.headers.get('retry-after'));
      const body = (await response.text()).slice(0, 240).replaceAll(apiKey, '[redacted]');
      lastError = new Error(`OpenFEC ${response.status}${body ? `: ${body}` : ''}`);
      if (!retryable || attempt === maxRetries) throw lastError;
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500 * (2 ** attempt));
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !/429|503|fetch failed/i.test(String(error?.message ?? error))) throw error;
    }
  }
  throw lastError;
}

function checkpoint(lastQuery) {
  fs.writeFileSync(progressPath, `${JSON.stringify({
    schema_version: 'openfec-schedule-b-progress@1',
    identifier_snapshot_sha256: sha256(identifiers),
    committees_expected: committees.length,
    last_committee_id: lastQuery.committee_id,
    last_page: lastQuery.pagination?.page ?? null,
    summary: summarizeScheduleBQueries(queries, records),
    graph_effect: 'none',
  }, null, 2)}\n`);
}

for (const committee of committees) {
  for (let page = 1; page <= maxPages; page += 1) {
    const publicUrl = publicScheduleBUrl(committee.committee_id, { perPage, page, minDate, maxDate });
    const authenticatedUrl = authenticatedScheduleBUrl(committee.committee_id, apiKey, { perPage, page, minDate, maxDate });
    const retrievedAt = new Date().toISOString();
    try {
      const payload = await fetchJson(authenticatedUrl);
      const normalized = normalizeScheduleBPage(payload, {
        ...committee,
        page,
        query_url: publicUrl.toString(),
        retrieved_at: retrievedAt,
        credential_mode: credentialMode,
        consumption: identifiers.consumption,
      });
      queries.push(normalized.query);
      records.push(...normalized.records);
      fs.appendFileSync(queriesPath, `${stableJson(normalized.query)}\n`);
      for (const record of normalized.records) fs.appendFileSync(recordsPath, `${stableJson(record)}\n`);
      checkpoint(normalized.query);
      if (normalized.query.coverage_status === 'source_pages_complete' || normalized.records.length === 0) break;
    } catch (error) {
      const failure = {
        schema_version: 'openfec-schedule-b-query@1',
        ...committee,
        query_url: publicUrl.toString(),
        retrieved_at: retrievedAt,
        credential_mode: credentialMode,
        query_status: 'source_failure',
        coverage_status: 'unavailable',
        pagination: { count: null, pages: null, page, per_page: perPage, last_indexes: null },
        records_observed: 0,
        source_error: String(error?.message ?? error).replaceAll(apiKey, '[redacted]'),
        evidence_state: 'unavailable',
        privacy_projection: 'No filing record was retained from the failed request.',
        interpretation: 'The source or transport query failed. This does not establish an empty committee record or an absence of disbursements.',
        consumption: identifiers.consumption,
        graph_effect: 'none',
      };
      queries.push(failure);
      fs.appendFileSync(queriesPath, `${stableJson(failure)}\n`);
      checkpoint(failure);
      break;
    }
    await sleep(delayMs);
  }
  await sleep(delayMs);
}

const summary = summarizeScheduleBQueries(queries, records);
const manifest = {
  schema_version: 'openfec-schedule-b-manifest@1',
  cohort_id: identifiers.cohort_id,
  identifier_snapshot: path.relative(root, identifiersFile).replaceAll('\\', '/'),
  identifier_snapshot_sha256: sha256(identifiers),
  retrieved_at: new Date().toISOString(),
  endpoint: 'https://api.open.fec.gov/v1/schedules/schedule_b/',
  query_bounds: { per_page: perPage, max_pages_per_committee: maxPages, min_date: minDate ?? null, max_date: maxDate ?? null },
  credential_mode: credentialMode,
  credential_reproducible: credentialMode === 'provisioned_api_key',
  release_eligible: credentialMode === 'provisioned_api_key' && summary.source_failures === 0,
  summary,
  privacy_projection: 'Preserves public filing payee text and transaction fields needed for entity review; excludes payee street, city, state, ZIP, employer, occupation, and contact fields.',
  interpretation: 'This bounded intake cannot create a crossing. A later review must resolve payee identity, attach a contemporaneous beneficial-interest source, test temporal overlap, and preserve rejected and null outcomes.',
  consumption: identifiers.consumption,
  graph_effect: 'none',
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.rmSync(progressPath, { force: true });
console.log(`OpenFEC Schedule B: ${summary.committees_queried}/${committees.length} committee(s) queried; ${summary.records_observed} record(s); ${summary.source_failures} source failure(s)`);
console.log(`output: ${path.relative(root, outputDir).replaceAll('\\', '/')}`);
if (summary.committees_queried === 0) process.exitCode = 1;
