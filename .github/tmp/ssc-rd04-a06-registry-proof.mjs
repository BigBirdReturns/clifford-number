#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve('a06-proof');
const registry = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const cookiePath = path.join(root, 'cookies.txt');
const dayMs = 24 * 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
let requestCount = 0;

fs.rmSync(root, { recursive: true, force: true });
ensureDir(root);

function curl(args, label) {
  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    timeout: 420_000
  });
  if (result.status !== 0) throw new Error(`${label} curl failed: ${(result.stderr || result.stdout || '').trim()}`);
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

function request(id, parameters, { preserveRaw = false, authority = 'mechanical_receipt' } = {}) {
  requestCount += 1;
  if (requestCount > 1000) throw new Error('request ceiling exceeded');
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
  if (/^\s*</.test(text)) parseError = 'html_body';
  else {
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

function browserParameters(start, end, { isForSearchFirst = false, emptyText = true } = {}) {
  const parameters = [];
  if (isForSearchFirst) parameters.push(['isForSearch', '1']);
  parameters.push(['releasedAfter', start]);
  parameters.push(['releasedBefore', end]);
  parameters.push(['programType', '2']);
  if (emptyText) {
    parameters.push(['shnNumber', '']);
    parameters.push(['issueCodes', '']);
  }
  parameters.push(['captcha', 'bypass']);
  parameters.push(['captchaHash', 'bypass']);
  if (!isForSearchFirst) parameters.push(['isForSearch', '1']);
  return parameters;
}

const initialAttempt = request('initial-attempt', [
  ['isForSearch', '1'],
  ['releasedAfter', '07/01/2025'],
  ['releasedBefore', '06/30/2026'],
  ['programType', '2'],
  ['captcha', 'bypass'],
  ['captchaHash', 'bypass']
], { preserveRaw: true, authority: 'preserved_initial_mechanical_attempt' });

const fullYear = request(
  'browser-exact-full-year',
  browserParameters('07/01/2025', '06/30/2026'),
  { preserveRaw: true, authority: 'corrected_exact_browser_serialization' }
);

const orderIsolation = request(
  'is-for-search-first-with-empty-text',
  browserParameters('07/01/2025', '06/30/2026', { isForSearchFirst: true }),
  { authority: 'parameter_order_isolation' }
);

const emptyTextIsolation = request(
  'browser-order-without-empty-text',
  browserParameters('07/01/2025', '06/30/2026', { emptyText: false }),
  { authority: 'empty_text_input_isolation' }
);

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function isoDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDate(value) {
  const match = String(value ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function identities(row) {
  const registryId = String(row?.registryId ?? '').trim();
  if (!registryId) return { error: 'missing_registryId' };
  const archived = row?.isArchived === true || row?.isArchived === 'true';
  const current = row?.isArchived === false || row?.isArchived === 'false';
  if (!archived && !current) return { error: `archive_state_${String(row?.isArchived ?? '')}` };
  if (archived) {
    return {
      registry_id: registryId,
      row_identity: `registry:${registryId}`,
      document_identity: `archived-registry:${registryId}`,
      document_id_field: 'registryId',
      document_id: registryId,
      download_url: `${registry}&registry=${encodeURIComponent(registryId)}&archived=true`
    };
  }
  const decisionId = String(row?.decisionId ?? '').trim();
  if (!decisionId) return { error: 'missing_decisionId' };
  return {
    registry_id: registryId,
    row_identity: `registry:${registryId}`,
    document_identity: `current-decision:${decisionId}`,
    document_id_field: 'decisionId',
    document_id: decisionId,
    download_url: `${registry.replace('public.decisionRegistry', 'public.decisionRegistryDownload')}&decision=${encodeURIComponent(decisionId)}&archived=false`
  };
}

function comparableDocumentRow(row) {
  const copy = { ...row };
  delete copy.registryId;
  return copy;
}

const terminalSlices = [];
const partitionReceipts = [];
const observedRows = [];
const malformedRows = [];
let maxDepth = 0;

function partition(start, end, depth = 0, existing = null) {
  maxDepth = Math.max(maxDepth, depth);
  if (depth > 20) throw new Error(`partition depth exceeded at ${isoDate(start)}..${isoDate(end)}`);
  const id = `partition-${isoDate(start)}--${isoDate(end)}`;
  const result = existing ?? request(
    id,
    browserParameters(formatDate(start), formatDate(end)),
    { preserveRaw: true, authority: 'deterministic_date_only_partition' }
  );
  partitionReceipts.push({ ...result, rows: undefined, start: isoDate(start), end: isoDate(end), depth });
  if (result.http_status !== 200 || !Array.isArray(result.rows)) throw new Error(`${id} did not return a JSON array`);
  if (result.rows.length === 100 && start < end) {
    const spanDays = Math.floor((end - start) / dayMs);
    const middle = start + Math.floor(spanDays / 2) * dayMs;
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
    const errors = [];
    const released = parseDate(row?.releaseDate);
    if (released === null) errors.push(`release_date_${String(row?.releaseDate ?? '')}`);
    else if (released < start || released > end) errors.push(`release_date_outside_slice_${String(row?.releaseDate ?? '')}`);
    if (String(row?.program ?? '').trim() !== 'CalFresh') errors.push(`program_${String(row?.program ?? '')}`);
    const identity = identities(row);
    if (identity.error) errors.push(identity.error);
    for (const field of ['releaseDate', 'program', 'disposition', 'issueCodes', 'responsibleAgency', 'orgArName', 'language', 'shnNumber', 'isArchived', 'registryId']) {
      if (!(field in (row ?? {}))) errors.push(`missing_${field}`);
    }
    if (errors.length) malformedRows.push({ slice: id, index, errors });
    observedRows.push({
      slice: id,
      source_index: index,
      ...identity,
      release_date: String(row?.releaseDate ?? ''),
      program: String(row?.program ?? ''),
      document_row_sha256: sha256(Buffer.from(JSON.stringify(comparableDocumentRow(row)))),
      row
    });
  }
}

if (fullYear.http_status === 200 && Array.isArray(fullYear.rows)) {
  partition(Date.UTC(2025, 6, 1), Date.UTC(2026, 5, 30), 0, fullYear);
}

const rowMap = new Map();
const duplicateRowIdentities = [];
for (let index = 0; index < observedRows.length; index += 1) {
  const row = observedRows[index];
  if (!row.row_identity) continue;
  const prior = rowMap.get(row.row_identity);
  if (prior) duplicateRowIdentities.push({ row_identity: row.row_identity, first_index: prior.index, duplicate_index: index, first_slice: prior.row.slice, duplicate_slice: row.slice });
  else rowMap.set(row.row_identity, { index, row });
}

const documentMap = new Map();
const documentConflicts = [];
for (const row of observedRows) {
  if (!row.document_identity) continue;
  const prior = documentMap.get(row.document_identity);
  if (!prior) {
    documentMap.set(row.document_identity, {
      document_identity: row.document_identity,
      document_id_field: row.document_id_field,
      document_id: row.document_id,
      download_url: row.download_url,
      document_row_sha256: row.document_row_sha256,
      registry_ids: [row.registry_id]
    });
    continue;
  }
  prior.registry_ids.push(row.registry_id);
  if (prior.document_row_sha256 !== row.document_row_sha256 || prior.download_url !== row.download_url) {
    documentConflicts.push({
      document_identity: row.document_identity,
      first_sha256: prior.document_row_sha256,
      conflicting_sha256: row.document_row_sha256,
      registry_id: row.registry_id
    });
  }
}

const documentMultiplicity = [...documentMap.values()]
  .map((row) => ({ ...row, registry_ids: [...row.registry_ids].sort((a, b) => Number(a) - Number(b)), registry_row_count: row.registry_ids.length }))
  .sort((a, b) => a.document_identity.localeCompare(b.document_identity));
const sharedDocuments = documentMultiplicity.filter((row) => row.registry_row_count > 1);
const currentRows = observedRows.filter((row) => row.document_identity?.startsWith('current-decision:')).length;
const archivedRows = observedRows.filter((row) => row.document_identity?.startsWith('archived-registry:')).length;
const terminalRowTotal = terminalSlices.reduce((sum, row) => sum + row.rows, 0);
const cappedOneDaySlices = terminalSlices.filter((row) => row.capped_one_day);
const capConfirmed = fullYear.rows_returned === 100 && terminalRowTotal > 100;
const emptyTextRequired = orderIsolation.rows_returned === fullYear.rows_returned && emptyTextIsolation.rows_returned === 0;
const orderMaterial = orderIsolation.rows_returned !== fullYear.rows_returned;

const complete = capConfirmed
  && emptyTextRequired
  && cappedOneDaySlices.length === 0
  && malformedRows.length === 0
  && duplicateRowIdentities.length === 0
  && documentConflicts.length === 0
  && rowMap.size === terminalRowTotal;

fs.rmSync(cookiePath, { force: true });
const summary = {
  schema_version: 'ssc-rd04-a06-registry-proof@1',
  issue: 721,
  parent_main: '80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589',
  parent_release_sha256: 'b3f36dff2969d95767e6f0d564f7d3744bd72de98cf2b758d4729c6bc0de50c4',
  query_contract: {
    date_interval: '2025-07-01/2026-06-30',
    program: 'CalFresh',
    programType: '2',
    exact_parameters: browserParameters('07/01/2025', '06/30/2026'),
    empty_text_inputs_required: emptyTextRequired,
    parameter_order_material: orderMaterial,
    initial_attempt_rows: initialAttempt.rows_returned,
    corrected_full_year_rows: fullYear.rows_returned
  },
  source_cap: {
    threshold: 100,
    confirmed: capConfirmed,
    partition_requests: partitionReceipts.length,
    terminal_slices: terminalSlices.length,
    max_depth: maxDepth,
    one_day_slices_still_capped: cappedOneDaySlices.length
  },
  counts: {
    registry_rows: terminalRowTotal,
    unique_registry_row_identities: rowMap.size,
    current_registry_rows: currentRows,
    archived_registry_rows: archivedRows,
    unique_download_documents: documentMap.size,
    shared_document_groups: sharedDocuments.length,
    shared_document_excess_registry_rows: terminalRowTotal - documentMap.size,
    maximum_registry_rows_per_document: Math.max(...documentMultiplicity.map((row) => row.registry_row_count)),
    duplicate_registry_row_identities: duplicateRowIdentities.length,
    document_conflicts: documentConflicts.length,
    malformed_rows: malformedRows.length,
    a05_decisions_released: 10582,
    registry_rows_minus_a05_aggregate: terminalRowTotal - 10582,
    download_documents_minus_a05_aggregate: documentMap.size - 10582
  },
  complete_mechanical_denominator: complete,
  authority: {
    registry_row_identity: 'registryId',
    current_document_identity: 'decisionId',
    archived_document_identity: 'registryId',
    shared_document_identity_collapses_registry_rows: false,
    deterministic_partition_uses_dates_only: true,
    correction_basis_is_form_and_identifier_semantics_not_disposition: true,
    complete_fy_administrative_universe: false,
    case_level_join: false,
    implementation_or_restoration: false,
    external_review: false,
    graph_effect: 'none'
  }
};

fs.writeFileSync(path.join(root, 'summary.json'), stable(summary));
fs.writeFileSync(path.join(root, 'terminal-slices.json'), stable(terminalSlices));
fs.writeFileSync(path.join(root, 'registry-row-map.json'), stable([...rowMap.values()].map(({ row }) => ({
  registry_id: row.registry_id,
  row_identity: row.row_identity,
  document_identity: row.document_identity,
  document_id_field: row.document_id_field,
  document_id: row.document_id,
  download_url: row.download_url,
  release_date: row.release_date,
  slice: row.slice
})).sort((a, b) => Number(a.registry_id) - Number(b.registry_id))));
fs.writeFileSync(path.join(root, 'document-multiplicity.json'), stable(documentMultiplicity));
fs.writeFileSync(path.join(root, 'duplicate-row-identities.json'), stable(duplicateRowIdentities));
fs.writeFileSync(path.join(root, 'document-conflicts.json'), stable(documentConflicts));
fs.writeFileSync(path.join(root, 'malformed-rows.json'), stable(malformedRows));
console.log(JSON.stringify(summary.counts));

if (!complete) throw new Error(`A06 mechanical proof incomplete: ${JSON.stringify(summary.counts)}`);
