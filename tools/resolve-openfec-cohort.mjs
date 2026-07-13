#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { authenticatedCandidateSearchUrl, resolveOpenFecCohort, stableJson, summarizeOpenFecRows } from './lib/openfec-cohort.mjs';

const args = process.argv.slice(2);
const has = flag => args.includes(`--${flag}`);
const value = (flag, fallback) => {
  const index = args.indexOf(`--${flag}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const root = process.cwd();
const outputDir = path.resolve(root, value('output', 'build/openfec-cohort'));
const delayMs = Number(value('delay-ms', process.env.OPENFEC_DELAY_MS ?? 1500));
const maxRetries = Number(value('retries', process.env.OPENFEC_RETRIES ?? 3));
const requestTimeoutMs = Number(value('request-timeout-ms', process.env.OPENFEC_REQUEST_TIMEOUT_MS ?? 15000));
const provisionedKey = process.env.FEC_API_KEY;
const allowDemoKey = has('allow-demo-key') || process.env.OPENFEC_ALLOW_DEMO_KEY === '1';
const apiKey = provisionedKey ?? (allowDemoKey ? 'DEMO_KEY' : null);
const credentialMode = provisionedKey ? 'provisioned_api_key' : allowDemoKey ? 'demo_key_trial' : 'missing';
const userAgent = process.env.CRAWL_USER_AGENT ?? 'clifford-number/0.3 OpenFEC cohort resolver (+https://github.com/BigBirdReturns/clifford-number)';

if (!apiKey) {
  console.error('OpenFEC cohort resolution blocked: set FEC_API_KEY for a reproducible run, or pass --allow-demo-key for a non-release trial.');
  process.exit(2);
}

const cohort = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical/us-presidential-officeholder-cohort.json'), 'utf8'));
const contracts = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical/consumption-contracts.json'), 'utf8'));
const contract = contracts.contracts.find(item => item.contract_id === 'public-topology-map@1');
const consumptionContract = {
  contract_id: contract.contract_id,
  what_this_is: contract.what_this_is,
  what_this_is_not: contract.what_this_is_not,
  copy_ready_caveat: contract.copy_ready_caveat,
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(outputDir, { recursive: true });
const rowsPath = path.join(outputDir, 'resolutions.jsonl');
const progressPath = path.join(outputDir, 'progress.json');
fs.writeFileSync(rowsPath, '');

async function fetchJson(member) {
  const url = authenticatedCandidateSearchUrl(member.name, apiKey);
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

const retrievedAt = new Date().toISOString();
const rows = await resolveOpenFecCohort({
  cohort,
  fetchJson,
  retrievedAt,
  consumptionContract,
  credentialMode,
  delay: () => sleep(delayMs),
  onRow: async (row, completedRows) => {
    fs.appendFileSync(rowsPath, `${stableJson(row)}\n`);
    fs.writeFileSync(progressPath, `${JSON.stringify({
      schema_version: 'openfec-cohort-progress@1',
      cohort_id: cohort.cohort_id,
      retrieved_at: retrievedAt,
      completed_members: completedRows.length,
      expected_members: cohort.members.length,
      last_person_id: row.person_id,
      summary: summarizeOpenFecRows(completedRows),
      graph_effect: 'none',
    }, null, 2)}\n`);
  },
});
const summary = summarizeOpenFecRows(rows);
const manifest = {
  schema_version: 'openfec-cohort-manifest@1',
  cohort_id: cohort.cohort_id,
  retrieved_at: retrievedAt,
  endpoint: 'https://api.open.fec.gov/v1/candidates/search/',
  credential_mode: credentialMode,
  release_eligible: credentialMode === 'provisioned_api_key' && summary.by_query_status.source_failure === 0,
  summary,
  interpretation: 'Candidate search observations are source intake. They do not resolve canonical identity, establish a crossing, or count a null/source failure as absence.',
  consumption: consumptionContract,
  graph_effect: 'none',
};

fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.rmSync(progressPath, { force: true });
console.log(`OpenFEC cohort: ${summary.queries_completed}/${summary.cohort_members} queries completed; ${summary.candidate_records_observed} candidate record(s); ${summary.by_query_status.source_failure} source failure(s)`);
console.log(`output: ${path.relative(root, outputDir).replaceAll('\\', '/')}`);
if (summary.queries_completed === 0) process.exitCode = 1;
