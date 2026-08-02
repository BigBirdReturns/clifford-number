#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve('a06-semantics');
const registry = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const cookiePath = path.join(root, 'cookies.txt');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const dayMs = 24 * 60 * 60 * 1000;
let requestCount = 0;

fs.rmSync(root, { recursive: true, force: true });
ensureDir(root);

function curl(args, label) {
  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    timeout: 420_000
  });
  if (result.status !== 0) {
    throw new Error(`${label} curl failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout;
}

curl([
  '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
  '--retry', '2', '--retry-delay', '2', '--max-time', '180',
  '--user-agent', 'clifford-number-public-record-acquisition/1.0',
  '--cookie-jar', cookiePath,
  '--dump-header', path.join(root, 'registry-page-headers.txt'),
  '--output', path.join(root, 'registry-page.html'),
  registry
], 'registry page');

function safeId(value) {
  return value.replace(/[^A-Za-z0-9_.-]+/g, '-');
}

function request(id, parameters, { preserveRaw = false, authority = 'mechanical_diagnostic' } = {}) {
  requestCount += 1;
  if (requestCount > 1000) throw new Error('diagnostic request ceiling exceeded');
  const dir = path.join(root, 'requests', safeId(id));
  ensureDir(dir);
  const bodyPath = path.join(dir, 'response.bin');
  const headersPath = path.join(dir, 'headers.txt');
  const args = [
    '--get', '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '300',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--header', 'Accept: application/json, text/javascript, */*; q=0.01',
    '--header', 'X-Requested-With: XMLHttpRequest',
    '--referer', registry,
    '--cookie', cookiePath
  ];
  for (const [key, value] of parameters) args.push('--data-urlencode', `${key}=${value}`);
  args.push(
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    registry
  );
  const metaText = curl(args, id).trim();
  fs.writeFileSync(path.join(dir, 'curl-meta.txt'), `${metaText}\n`);
  fs.writeFileSync(path.join(dir, 'parameters.json'), stable(parameters));
  const [statusText, finalUrl, contentType] = metaText.split(/\n/);
  const raw = fs.readFileSync(bodyPath);
  const text = raw.toString('utf8');
  let rows = null;
  let parseError = null;
  if (/^\s*</.test(text)) {
    parseError = 'html_body';
  } else {
    try {
      const value = JSON.parse(text);
      if (Array.isArray(value)) rows = value;
      else parseError = `json_${typeof value}`;
    } catch (error) {
      parseError = error.message;
    }
  }
  const receipt = {
    id,
    authority,
    parameters,
    http_status: Number(statusText),
    final_url: finalUrl,
    content_type: contentType,
    bytes: raw.length,
    sha256: sha256(raw),
    json_array: Array.isArray(rows),
    rows_returned: Array.isArray(rows) ? rows.length : null,
    parse_error: parseError
  };
  fs.writeFileSync(path.join(dir, 'receipt.json'), stable(receipt));
  if (!preserveRaw) fs.rmSync(bodyPath, { force: true });
  return { ...receipt, rows };
}

function browserParameters(start, end, { program = true, emptySelects = false, isForSearchFirst = false, emptyText = true } = {}) {
  const form = [];
  if (isForSearchFirst) form.push(['isForSearch', '1']);
  if (start) form.push(['releasedAfter', start]);
  if (end) form.push(['releasedBefore', end]);
  if (program) form.push(['programType', '2']);
  if (emptySelects) {
    form.push(['disposition', '']);
    form.push(['responsibleAgency', '']);
  }
  if (emptyText) {
    form.push(['shnNumber', '']);
    form.push(['issueCodes', '']);
  }
  form.push(['captcha', 'bypass']);
  form.push(['captchaHash', 'bypass']);
  if (!isForSearchFirst) form.push(['isForSearch', '1']);
  return form;
}

const diagnostics = [];
function diagnostic(id, parameters, options = {}) {
  const result = request(id, parameters, options);
  diagnostics.push({ ...result, rows: undefined });
  return result;
}

const originalFrozen = diagnostic('original_frozen_attempt', [
  ['isForSearch', '1'],
  ['releasedAfter', '07/01/2025'],
  ['releasedBefore', '06/30/2026'],
  ['programType', '2'],
  ['captcha', 'bypass'],
  ['captchaHash', 'bypass']
], { preserveRaw: true, authority: 'recorded_initial_mechanical_attempt' });

const browserFull = diagnostic(
  'browser_exact_full_year',
  browserParameters('07/01/2025', '06/30/2026'),
  { preserveRaw: true, authority: 'exact_browser_form_serialization_candidate' }
);

const originalOrderWithEmptyText = diagnostic(
  'original_order_with_empty_text',
  browserParameters('07/01/2025', '06/30/2026', { isForSearchFirst: true }),
  { authority: 'empty_text_vs_order_isolation' }
);

const browserOrderWithoutEmptyText = diagnostic(
  'browser_order_without_empty_text',
  browserParameters('07/01/2025', '06/30/2026', { emptyText: false }),
  { authority: 'empty_text_vs_order_isolation' }
);

const allProgramsBrowser = diagnostic(
  'browser_exact_all_programs',
  browserParameters('07/01/2025', '06/30/2026', { program: false }),
  { authority: 'program_filter_isolation_only' }
);

const emptySelects = diagnostic(
  'browser_with_empty_select_fields',
  browserParameters('07/01/2025', '06/30/2026', { emptySelects: true }),
  { authority: 'empty_select_parameter_diagnostic_only' }
);

const isoDates = diagnostic('iso_date_encoding', [
  ['releasedAfter', '2025-07-01'],
  ['releasedBefore', '2026-06-30'],
  ['programType', '2'],
  ['shnNumber', ''],
  ['issueCodes', ''],
  ['captcha', 'bypass'],
  ['captchaHash', 'bypass'],
  ['isForSearch', '1']
], { authority: 'date_encoding_diagnostic_only' });

function parseDate(value) {
  const match = String(value ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = Date.UTC(Number(year), Number(month) - 1, Number(day));
  if (!Number.isFinite(date)) return null;
  return date;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function isoDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function rowIdentity(row) {
  const archived = row?.isArchived === true || row?.isArchived === 'true';
  const current = row?.isArchived === false || row?.isArchived === 'false';
  if (!archived && !current) return { identity: null, error: `archive_state_${String(row?.isArchived ?? '')}` };
  const field = archived ? 'registryId' : 'decisionId';
  const value = String(row?.[field] ?? '').trim();
  if (!value) return { identity: null, error: `missing_${field}` };
  return { identity: `${archived ? 'archived:true:registry' : 'archived:false:decision'}:${value}`, field, value };
}

const partitionRequests = [];
const terminalSlices = [];
const partitionRows = [];
const partitionMalformed = [];
let maxDepth = 0;

function partition(start, end, depth = 0, existing = null) {
  maxDepth = Math.max(maxDepth, depth);
  if (depth > 20) throw new Error(`partition depth exceeded at ${isoDate(start)}..${isoDate(end)}`);
  const id = `partition-${isoDate(start)}--${isoDate(end)}`;
  const result = existing ?? request(
    id,
    browserParameters(formatDate(start), formatDate(end)),
    { preserveRaw: true, authority: 'deterministic_date_partition' }
  );
  partitionRequests.push({ ...result, rows: undefined, start: isoDate(start), end: isoDate(end), depth });
  if (result.http_status !== 200 || !Array.isArray(result.rows)) {
    throw new Error(`partition slice ${id} did not return a JSON array`);
  }
  if (result.rows.length === 100 && start < end) {
    const spanDays = Math.floor((end - start) / dayMs);
    const leftDays = Math.floor(spanDays / 2);
    const middle = start + leftDays * dayMs;
    partition(start, middle, depth + 1);
    partition(middle + dayMs, end, depth + 1);
    return;
  }
  const slice = {
    id,
    start: isoDate(start),
    end: isoDate(end),
    depth,
    rows: result.rows.length,
    capped_one_day: result.rows.length === 100 && start === end
  };
  terminalSlices.push(slice);
  for (let index = 0; index < result.rows.length; index += 1) {
    const row = result.rows[index];
    const released = parseDate(row?.releaseDate);
    const identity = rowIdentity(row);
    const errors = [];
    if (released === null) errors.push(`release_date_${String(row?.releaseDate ?? '')}`);
    else if (released < start || released > end) errors.push(`release_date_outside_slice_${row.releaseDate}`);
    if (!identity.identity) errors.push(identity.error);
    if (String(row?.program ?? '').trim() !== 'CalFresh') errors.push(`program_${String(row?.program ?? '')}`);
    if (errors.length) partitionMalformed.push({ slice: id, index, errors });
    partitionRows.push({
      slice: id,
      identity: identity.identity,
      release_date: String(row?.releaseDate ?? ''),
      program: String(row?.program ?? '')
    });
  }
}

if (browserFull.http_status === 200 && Array.isArray(browserFull.rows)) {
  partition(
    Date.UTC(2025, 6, 1),
    Date.UTC(2026, 5, 30),
    0,
    browserFull
  );
}

const identityMap = new Map();
const duplicateIdentities = [];
for (let index = 0; index < partitionRows.length; index += 1) {
  const row = partitionRows[index];
  if (!row.identity) continue;
  const prior = identityMap.get(row.identity);
  if (prior) duplicateIdentities.push({ identity: row.identity, first_index: prior.index, duplicate_index: index, first_slice: prior.row.slice, duplicate_slice: row.slice });
  else identityMap.set(row.identity, { index, row });
}

const terminalRowTotal = terminalSlices.reduce((sum, row) => sum + row.rows, 0);
const cappedOneDaySlices = terminalSlices.filter((row) => row.capped_one_day);
const capConfirmed = browserFull.rows_returned === 100 && terminalRowTotal > 100;
const emptyTextRequired = originalOrderWithEmptyText.rows_returned === browserFull.rows_returned && browserOrderWithoutEmptyText.rows_returned === 0;
const orderRequired = originalOrderWithEmptyText.rows_returned !== browserFull.rows_returned;

fs.rmSync(cookiePath, { force: true });
const summary = {
  schema_version: 'ssc-rd04-a06-registry-semantics@2',
  issue: 721,
  parent_main: '80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589',
  parent_release_sha256: 'b3f36dff2969d95767e6f0d564f7d3744bd72de98cf2b758d4729c6bc0de50c4',
  initial_attempt_preserved: true,
  initial_attempt_rows: originalFrozen.rows_returned,
  browser_serialization: {
    rows_returned: browserFull.rows_returned,
    empty_text_inputs_required: emptyTextRequired,
    parameter_order_required: orderRequired,
    empty_select_fields_must_be_omitted: emptySelects.rows_returned === 0,
    exact_parameters: browserParameters('07/01/2025', '06/30/2026')
  },
  source_cap: {
    suspected_threshold: 100,
    confirmed_by_date_partition: capConfirmed,
    full_year_rows_returned: browserFull.rows_returned,
    terminal_partition_row_total: terminalRowTotal,
    terminal_slices: terminalSlices.length,
    capped_one_day_slices: cappedOneDaySlices.length,
    max_depth: maxDepth
  },
  partition: {
    requests: partitionRequests.length,
    terminal_slices: terminalSlices,
    rows_observed_across_terminal_slices: partitionRows.length,
    unique_identities: identityMap.size,
    duplicate_identities: duplicateIdentities.length,
    malformed_rows: partitionMalformed.length,
    complete_for_frozen_date_program_query: capConfirmed && cappedOneDaySlices.length === 0 && duplicateIdentities.length === 0 && partitionMalformed.length === 0
  },
  diagnostics: diagnostics,
  authority: {
    correction_basis_is_form_semantics_not_outcomes: true,
    deterministic_partition_uses_dates_only: true,
    dispositions_inspected_for_correction: false,
    may_treat_registry_as_complete_fy_universe: false,
    case_level_join: false,
    implementation_or_restoration: false,
    external_review: false,
    graph_effect: 'none'
  }
};

fs.writeFileSync(path.join(root, 'summary.json'), stable(summary));
fs.writeFileSync(path.join(root, 'partition-identities.json'), stable([...identityMap.values()].map(({ row }) => row).sort((a, b) => a.identity.localeCompare(b.identity))));
fs.writeFileSync(path.join(root, 'duplicate-identities.json'), stable(duplicateIdentities));
fs.writeFileSync(path.join(root, 'partition-malformed.json'), stable(partitionMalformed));
console.log(JSON.stringify({
  initial_attempt: originalFrozen.rows_returned,
  browser_full_year: browserFull.rows_returned,
  original_order_with_empty_text: originalOrderWithEmptyText.rows_returned,
  browser_order_without_empty_text: browserOrderWithoutEmptyText.rows_returned,
  all_programs_browser: allProgramsBrowser.rows_returned,
  empty_selects: emptySelects.rows_returned,
  iso_dates: isoDates.rows_returned,
  cap_confirmed: capConfirmed,
  terminal_rows: terminalRowTotal,
  unique_identities: identityMap.size,
  terminal_slices: terminalSlices.length,
  capped_one_day_slices: cappedOneDaySlices.length,
  malformed_rows: partitionMalformed.length,
  duplicate_identities: duplicateIdentities.length
}));

if (browserFull.http_status !== 200 || !Array.isArray(browserFull.rows)) throw new Error('exact browser serialization did not return a JSON array');
if (!emptyTextRequired) throw new Error('empty-text input semantics were not isolated');
if (!capConfirmed) throw new Error('100-row source cap was not confirmed by deterministic date partitioning');
if (cappedOneDaySlices.length) throw new Error(`${cappedOneDaySlices.length} one-day slices remain capped`);
if (partitionMalformed.length) throw new Error(`${partitionMalformed.length} partition rows violate the mechanical contract`);
if (duplicateIdentities.length) throw new Error(`${duplicateIdentities.length} duplicate identities across terminal slices`);
