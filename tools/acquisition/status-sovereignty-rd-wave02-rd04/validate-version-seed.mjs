#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const INPUT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd04-version-history/seed-universe.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave02-rd04-version-seed.schema.json';

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const EXPECTED_BODY_SHA256 = 'd3aa66844880b48d63466f64347a8b06389ec52b5a85159ad205942fc4f88bff';
const EXPECTED_IDS = [
  'FED-PL119-21',
  'FED-FRA-2023-FINAL-RULE',
  'FED-OBBB-INFO-MEMO',
  'FED-OBBB-ABAWD-EXCEPTIONS',
  'FED-OBBB-ABAWD-WAIVERS',
  'CA-ACL-25-60',
  'CA-ACL-25-64',
  'CA-ACL-25-93',
  'CA-ACL-25-93E',
  'CA-ACL-26-15',
  'CA-ACL-26-26',
  'CA-ACIN-I-14-26',
  'CA-ACL-26-29',
  'CA-ACL-26-43'
];

const EXPECTED_CA_BASENAMES = [
  '25-60.pdf',
  '25-64.pdf',
  '25-93.pdf',
  '25-93E.pdf',
  '26-15.pdf',
  '26-26.pdf',
  'I-14_26.pdf',
  '26-29.pdf',
  '26-43.pdf'
];

export function validateSeedData(value, schema = null) {
  if (schema) {
    ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
    ok(schema?.additionalProperties === false, 'schema root is not closed');
    ok(schema?.properties?.class_id?.const === 'RD-04-C01', 'schema class identity changed');
    ok(schema?.properties?.issue?.const === 789, 'schema issue changed');
    ok(schema?.properties?.direct_california_source?.properties?.expected_direct_instruments?.const === 9, 'schema direct-source denominator changed');
    ok(schema?.properties?.capture_contract?.properties?.maximum_attempts_per_source?.const === 2, 'schema retry ceiling changed');
    ok(schema?.properties?.sources?.minItems === 14 && schema?.properties?.sources?.maxItems === 14, 'schema source denominator changed');
  }

  ok(value?.schema_version === 'ssc-rd-wave02-rd04-version-seed@1', 'schema_version changed');
  ok(value?.wave_id === 'SSC-RD-W02' && value?.lane_id === 'RD-04' && value?.class_id === 'RD-04-C01', 'lane identity changed');
  ok(value?.issue === 789 && value?.as_of === '2026-08-02', 'issue or cutoff changed');
  ok(value?.status === 'predeclared_seed_universe_pending_exact_fetch', 'seed status escalated');

  const parent = value.parent;
  ok(parent?.wave_issue === 785, 'parent wave changed');
  ok(parent?.wave_constitution_merge === '69c06a2cc552a09588b2657e247b301468ccae87', 'constitution merge changed');
  ok(parent?.frozen_execution_base === 'c1997a1bfea3e214e2769df31f64f6fad6a4295c', 'frozen base changed');
  ok(parent?.canonical_class_label === 'current statutory, regulatory, and guidance version history after the 2025 law', 'canonical class label changed');
  ok(parent?.a09_terminal_state === 'no_changed_input_observed', 'A09 result changed');

  const direct = value.direct_california_source;
  ok(direct?.source_id === 'A04-CA-ABAWD', 'direct California source changed');
  ok(direct?.body_path === 'data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/page-custody/a02/CA-ABAWD/attempt-1.body', 'direct source body path changed');
  ok(direct?.fetch_path === 'data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/page-custody/a02/CA-ABAWD/fetch.json', 'direct source fetch path changed');
  ok(direct?.body_sha256 === EXPECTED_BODY_SHA256, 'direct source digest changed');
  ok(direct?.expected_direct_instruments === 9, 'direct California denominator changed');

  const capture = value.capture_contract;
  ok(capture?.maximum_attempts_per_source === 2, 'attempt ceiling changed');
  ok(capture?.connect_timeout_seconds === 15 && capture?.total_timeout_seconds === 60, 'timeout contract changed');
  ok(capture?.follow_redirects === true && capture?.retry_only_on_transport_or_non_200_terminal_state === true, 'transport contract weakened');
  ok(capture?.outcome_selected_retry === false, 'outcome-selected retry authorized');
  ok(capture?.changed_source_is_implementation === false && capture?.failed_source_is_noncompliance === false, 'source-state authority escalated');

  ok(Array.isArray(value.sources) && value.sources.length === 14, 'fourteen seed sources required');
  const ids = value.sources.map((source) => source.source_id);
  ok(JSON.stringify(ids) === JSON.stringify(EXPECTED_IDS), 'source identity or order changed');
  ok(new Set(ids).size === 14, 'duplicate source id');
  ok(new Set(value.sources.map((source) => source.ordinal)).size === 14, 'duplicate ordinal');
  ok(value.sources.every((source, index) => source.ordinal === index + 1), 'source ordinals are not contiguous');
  ok(value.sources.every((source) => typeof source.title === 'string' && source.title.length > 0), 'source title missing');
  ok(value.sources.every((source) => typeof source.selection_basis === 'string' && source.selection_basis.length > 0), 'selection basis missing');
  ok(value.sources.every((source) => /^https:\/\//.test(source.url)), 'non-HTTPS source');
  ok(value.sources.every((source) => ['html', 'pdf'].includes(source.expected_content_class)), 'invalid content class');
  ok(new Set(value.sources.map((source) => source.url)).size === 14, 'duplicate source URL');
  ok(value.sources.filter((source) => source.jurisdiction === 'federal').length === 5, 'federal source count changed');
  ok(value.sources.filter((source) => source.jurisdiction === 'california').length === 9, 'California source count changed');
  ok(value.sources.filter((source) => source.expected_content_class === 'pdf').length === 9, 'PDF source count changed');

  const counts = value.counts;
  ok(counts?.seed_sources === 14 && counts?.federal_sources === 5 && counts?.direct_california_sources === 9, 'seed accounting changed');
  for (const key of ['exact_source_receipts','version_edges_adjudicated','class_closed','external_contacts','external_reviews','graph_effects','publication_effects']) {
    ok(counts?.[key] === 0, `${key} changed before execution`);
  }

  const result = value.current_result;
  ok(result?.terminal_state === 'seed_universe_predeclared_exact_fetch_pending', 'terminal state changed');
  ok(result?.candidate_universe_complete === false && result?.cross_reference_expansion_complete === false, 'candidate universe prematurely completed');
  ok(result?.version_adjudication_complete === false && result?.class_closed === false, 'class prematurely closed');
  ok(result?.outside_human_dependency === false && result?.project_blocking === false, 'human or project dependency introduced');
  ok(result?.graph_effect === 'none' && result?.publication_effect === 'none' && result?.adoption_effect === 'none', 'effect authority escalated');

  for (const [key, state] of Object.entries(value.boundaries || {})) {
    if (key.endsWith('_effect')) ok(state === 'none', `${key} changed`);
    else ok(state === false, `${key} weakened`);
  }
  return value;
}

export function validateSeedRepository(root = ROOT) {
  const schema = readJson(root, SCHEMA_PATH);
  const value = validateSeedData(readJson(root, INPUT_PATH), schema);
  const bodyPath = path.join(root, value.direct_california_source.body_path);
  const body = fs.readFileSync(bodyPath);
  ok(sha256(body) === EXPECTED_BODY_SHA256, 'exact ABAWD source body digest mismatch');
  ok(sha256(body) === value.direct_california_source.body_sha256, 'seed and exact source body differ');
  const html = body.toString('utf8');
  for (const basename of EXPECTED_CA_BASENAMES) ok(html.includes(basename), `direct source does not expose ${basename}`);
  const discovered = EXPECTED_CA_BASENAMES.filter((basename) => html.includes(basename));
  ok(discovered.length === 9, 'direct California source denominator mismatch');

  const fetch = readJson(root, value.direct_california_source.fetch_path);
  const fetchAttempt = fetch?.attempts?.[0];
  ok(fetch?.accessible === true, 'parent ABAWD fetch is not accessible');
  ok(fetch?.attempt_count === 1 && fetchAttempt?.attempt === 1, 'parent ABAWD fetch denominator changed');
  ok(fetchAttempt?.curl_exit === 0 && fetchAttempt?.http_status === 200, 'parent ABAWD fetch was not successful');
  ok(fetchAttempt?.body_sha256 === EXPECTED_BODY_SHA256, 'parent fetch receipt digest mismatch');
  ok(fetchAttempt?.body_path === value.direct_california_source.body_path, 'parent fetch body path mismatch');

  console.log('validate-version-seed: 14 sources, 9 direct California instruments, exact parent body, authority zero');
  return value;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    validateSeedRepository();
  } catch (error) {
    console.error(`validate-version-seed: ${error.message}`);
    process.exit(1);
  }
}
