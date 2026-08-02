#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SHARD_COUNT = 32;
const SHARD_INDEX = Number(process.env.SHARD_INDEX ?? -1);
const SHARD_ID = String(SHARD_INDEX).padStart(2, '0');
const OUT = path.join(ROOT, `a07-shn-full-${SHARD_ID}`);
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_DIR = path.join(ROOT, 'data/intake', A06_SLUG);
const A06_SHARDS = path.join(A06_DIR, 'denominator-shards');
const RELEASE_MANIFEST = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const REGISTRY = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const RELIEF = new Set(['Grant', 'Partial Grant', 'Stipulation']);
const DATE_START = '07/01/2025';
const DATE_END = '08/01/2026';
const DATE_START_UTC = Date.UTC(2025, 6, 1);
const DATE_END_UTC = Date.UTC(2026, 7, 1);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

if (!Number.isInteger(SHARD_INDEX) || SHARD_INDEX < 0 || SHARD_INDEX >= SHARD_COUNT) {
  throw new Error(`SHARD_INDEX must be 0..${SHARD_COUNT - 1}`);
}
fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

const failures = [];
const fail = (condition, message, context = null) => {
  if (!condition) failures.push({ message, context });
};

function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const date = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isFinite(date) ? date : null;
}

function formatDate(value) {
  const date = new Date(value);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function runCurl(args, label, timeout = 360_000) {
  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout
  });
  if (result.status !== 0) {
    throw new Error(`${label}: curl exit ${result.status}: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout;
}

function loadCanonical() {
  const release = readJson(RELEASE_MANIFEST);
  fail(release.combined_sha256 === EXPECTED_A06_RELEASE,
    `canonical A06 release digest ${release.combined_sha256} != ${EXPECTED_A06_RELEASE}`);
  const allRegistryIds = new Set();
  const allDocumentIds = new Set();
  const reliefRows = [];
  const reliefDocuments = new Set();

  for (let index = 0; index < 64; index += 1) {
    const id = String(index).padStart(2, '0');
    const file = path.join(A06_SHARDS, `${id}.json`);
    fail(fs.existsSync(file), `missing canonical A06 shard ${id}`);
    if (!fs.existsSync(file)) continue;
    const shard = readJson(file);
    fail(shard.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `canonical shard ${id} schema`);
    fail(shard.shard === id, `canonical shard ${id} identity`);
    for (const document of shard.documents ?? []) {
      const documentIdentity = String(document.document_identity ?? '').trim();
      fail(Boolean(documentIdentity), `canonical shard ${id} document identity`);
      if (documentIdentity) allDocumentIds.add(documentIdentity);
      for (const row of document.registry_rows ?? []) {
        const registryId = String(row.registry_id ?? '').trim();
        fail(Boolean(registryId), `canonical row missing registryId in shard ${id}`);
        fail(!allRegistryIds.has(registryId), `duplicate canonical registryId ${registryId}`);
        if (registryId) allRegistryIds.add(registryId);
        fail(String(row.program ?? '').trim() === 'CalFresh', `canonical row ${registryId} non-CalFresh`);
        if (RELIEF.has(String(row.disposition ?? '').trim())) {
          reliefRows.push({
            registry_id: registryId,
            document_identity: documentIdentity,
            shn_number: String(row.shn_number ?? '').trim(),
            release_date: String(row.release_date ?? '').trim(),
            disposition: String(row.disposition ?? '').trim()
          });
          reliefDocuments.add(documentIdentity);
        }
      }
    }
  }

  const shnMap = new Map();
  for (const row of reliefRows) {
    fail(Boolean(row.shn_number), `blank D1 SHN ${row.registry_id}`);
    if (!row.shn_number) continue;
    const bucket = shnMap.get(row.shn_number) ?? [];
    bucket.push(row);
    shnMap.set(row.shn_number, bucket);
  }

  fail(allRegistryIds.size === 12282, `A06 registry rows ${allRegistryIds.size} != 12282`);
  fail(allDocumentIds.size === 11672, `A06 documents ${allDocumentIds.size} != 11672`);
  fail(reliefRows.length === 6633, `D1 relief rows ${reliefRows.length} != 6633`);
  fail(reliefDocuments.size === 6294, `D1 relief documents ${reliefDocuments.size} != 6294`);
  fail(shnMap.size === 6292, `D1 unique SHNs ${shnMap.size} != 6292`);

  const shardFor = (shn) => Number.parseInt(sha256(Buffer.from(`A07-SHN-FULL-V2\n${shn}`, 'utf8')).slice(0, 8), 16) % SHARD_COUNT;
  const assigned = [...shnMap.entries()]
    .filter(([shn]) => shardFor(shn) === SHARD_INDEX)
    .map(([shn, rows]) => ({ shn, known_rows: rows.sort((a, b) => a.registry_id.localeCompare(b.registry_id)) }))
    .sort((a, b) => a.shn.localeCompare(b.shn));

  return { release, allRegistryIds, allDocumentIds, reliefRows, reliefDocuments, shnMap, assigned, shardFor };
}

function bootstrap() {
  const dir = path.join(OUT, 'session');
  ensureDir(dir);
  const cookie = path.join(dir, 'cookies.txt');
  const headers = path.join(dir, 'registry-page.headers.txt');
  const body = path.join(dir, 'registry-page.html');
  const meta = runCurl([
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--cookie-jar', cookie,
    '--dump-header', headers,
    '--output', body,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY
  ], `shard ${SHARD_ID} bootstrap`).trim().split(/\n/);
  const raw = fs.readFileSync(body);
  const receipt = {
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    bytes: raw.length,
    sha256: sha256(raw)
  };
  writeJson(path.join(dir, 'registry-page.receipt.json'), receipt);
  if (receipt.http_status !== 200 || raw.length === 0) throw new Error(`bootstrap failed: ${stable(receipt)}`);
  return cookie;
}

function normalizeRow(row) {
  const archived = row?.isArchived === true || row?.isArchived === 'true';
  const current = row?.isArchived === false || row?.isArchived === 'false';
  return {
    registry_id: String(row?.registryId ?? '').trim(),
    decision_id: String(row?.decisionId ?? '').trim(),
    archive_registry_id: String(row?.registryId ?? '').trim(),
    archived,
    archive_state_valid: archived || current,
    release_date: String(row?.releaseDate ?? '').trim(),
    program: String(row?.program ?? '').trim(),
    disposition: String(row?.disposition ?? '').trim(),
    issue_codes: row?.issueCodes ?? null,
    responsible_agency: String(row?.responsibleAgency ?? '').trim(),
    org_ar_name: String(row?.orgArName ?? '').trim(),
    language: String(row?.language ?? '').trim(),
    shn_number: String(row?.shnNumber ?? '').trim(),
    document_identity: archived
      ? `archived:registry:${String(row?.registryId ?? '').trim()}`
      : `current:decision:${String(row?.decisionId ?? '').trim()}`,
    raw: row
  };
}

function querySlice(shn, startUtc, endUtc, cookie, depth = 0) {
  const start = formatDate(startUtc);
  const end = formatDate(endUtc);
  const shnHash = sha256(Buffer.from(shn, 'utf8')).slice(0, 16);
  const sliceId = `${start.replaceAll('/', '')}-${end.replaceAll('/', '')}`;
  const dir = path.join(OUT, 'queries', shnHash, sliceId);
  ensureDir(dir);
  const bodyPath = path.join(dir, 'response.bin');
  const headersPath = path.join(dir, 'headers.txt');
  const params = [
    ['releasedAfter', start],
    ['releasedBefore', end],
    ['shnNumber', shn],
    ['issueCodes', ''],
    ['captcha', 'bypass'],
    ['captchaHash', 'bypass'],
    ['isForSearch', '1']
  ];
  const args = [
    '--get', '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '300',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--header', 'Accept: application/json, text/javascript, */*; q=0.01',
    '--header', 'X-Requested-With: XMLHttpRequest',
    '--referer', REGISTRY,
    '--cookie', cookie
  ];
  for (const [key, value] of params) args.push('--data-urlencode', `${key}=${value}`);
  args.push(
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY
  );
  const meta = runCurl(args, `SHN ${shn} ${start}-${end}`).trim().split(/\n/);
  const raw = fs.readFileSync(bodyPath);
  const text = raw.toString('utf8');
  let rows = null;
  let parseError = null;
  try {
    rows = /^\s*</.test(text) ? null : JSON.parse(text);
    if (!Array.isArray(rows)) parseError = /^\s*</.test(text) ? 'html_body' : 'not_array';
  } catch (error) {
    parseError = error.message;
  }
  const receipt = {
    shn,
    start,
    end,
    depth,
    parameters: params,
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    bytes: raw.length,
    sha256: sha256(raw),
    json_array: Array.isArray(rows),
    rows_returned: Array.isArray(rows) ? rows.length : null,
    source_cap_reached: Array.isArray(rows) && rows.length === 100,
    parse_error: parseError
  };
  writeJson(path.join(dir, 'receipt.json'), receipt);
  if (Array.isArray(rows)) writeJson(path.join(dir, 'response.json'), rows);

  if (receipt.http_status !== 200 || !Array.isArray(rows)) {
    failures.push({ message: `SHN ${shn} invalid response`, context: receipt });
    return { receipts: [receipt], rows: [], unresolved_cap: false };
  }

  if (rows.length < 100) {
    return { receipts: [receipt], rows, unresolved_cap: false };
  }

  if (startUtc === endUtc) {
    failures.push({ message: `SHN ${shn} one-day source cap`, context: receipt });
    return { receipts: [receipt], rows, unresolved_cap: true };
  }

  const day = 24 * 60 * 60 * 1000;
  const spanDays = Math.floor((endUtc - startUtc) / day);
  const leftEnd = startUtc + Math.floor(spanDays / 2) * day;
  const rightStart = leftEnd + day;
  const left = querySlice(shn, startUtc, leftEnd, cookie, depth + 1);
  const right = querySlice(shn, rightStart, endUtc, cookie, depth + 1);
  return {
    receipts: [receipt, ...left.receipts, ...right.receipts],
    rows: [...left.rows, ...right.rows],
    unresolved_cap: left.unresolved_cap || right.unresolved_cap
  };
}

let summary;
try {
  const canonical = loadCanonical();
  if (failures.length) throw new Error('canonical denominator validation failed');
  const cookie = bootstrap();
  const results = [];
  const shardRegistryIds = new Set();
  const candidateRegistryIds = new Set();
  let terminalSlices = 0;
  let cappedParentSlices = 0;
  let unresolvedCaps = 0;
  let queryReceipts = 0;

  for (let index = 0; index < canonical.assigned.length; index += 1) {
    const item = canonical.assigned[index];
    const queried = querySlice(item.shn, DATE_START_UTC, DATE_END_UTC, cookie);
    queryReceipts += queried.receipts.length;
    terminalSlices += queried.receipts.filter((row) => row.rows_returned !== 100).length;
    cappedParentSlices += queried.receipts.filter((row) => row.rows_returned === 100).length;
    if (queried.unresolved_cap) unresolvedCaps += 1;

    const normalized = queried.rows.map(normalizeRow);
    const byRegistry = new Map();
    for (const row of normalized) {
      fail(Boolean(row.registry_id), `SHN ${item.shn} row missing registryId`, row);
      fail(row.archive_state_valid, `SHN ${item.shn} invalid archive state`, row);
      fail(row.shn_number === item.shn,
        `SHN ${item.shn} query leaked row SHN ${row.shn_number || '<blank>'}`, row);
      const released = parseDate(row.release_date);
      fail(released !== null, `SHN ${item.shn} malformed release date ${row.release_date}`, row);
      fail(released !== null && released >= DATE_START_UTC && released <= DATE_END_UTC,
        `SHN ${item.shn} release date outside frozen interval ${row.release_date}`, row);
      fail(!byRegistry.has(row.registry_id), `SHN ${item.shn} duplicate returned registryId ${row.registry_id}`, row);
      if (row.registry_id) byRegistry.set(row.registry_id, row);
    }

    const knownIds = item.known_rows.map((row) => row.registry_id).sort();
    const returnedIds = new Set(byRegistry.keys());
    const missingKnown = knownIds.filter((id) => !returnedIds.has(id));
    fail(missingKnown.length === 0,
      `SHN ${item.shn} missing known A06 registry IDs ${missingKnown.join(',')}`,
      { knownIds, returned: [...returnedIds].sort() });

    const rows = [...byRegistry.values()].sort((a, b) => a.registry_id.localeCompare(b.registry_id));
    const candidates = rows.filter((row) => !canonical.allRegistryIds.has(row.registry_id));
    for (const row of rows) {
      fail(!shardRegistryIds.has(row.registry_id),
        `cross-SHN duplicate registryId ${row.registry_id}`, { shn: item.shn });
      shardRegistryIds.add(row.registry_id);
    }
    for (const row of candidates) candidateRegistryIds.add(row.registry_id);

    results.push({
      shn: item.shn,
      known_d1_registry_ids: knownIds,
      known_ids_reproduced: missingKnown.length === 0,
      query_receipts: queried.receipts.length,
      capped_parent_slices: queried.receipts.filter((row) => row.rows_returned === 100).length,
      unresolved_cap: queried.unresolved_cap,
      rows_returned_unique: rows.length,
      candidate_rows: candidates,
      rows
    });
    if ((index + 1) % 20 === 0) console.log(`shard ${SHARD_ID}: ${index + 1}/${canonical.assigned.length} SHNs`);
    sleep(100);
  }

  summary = {
    schema_version: 'ssc-rd04-a07-shn-full-shard@2',
    issue: 739,
    shard: SHARD_ID,
    shard_index: SHARD_INDEX,
    shard_count: SHARD_COUNT,
    status: failures.length === 0 ? 'pass' : 'fail',
    query_contract: {
      endpoint: REGISTRY,
      released_after: DATE_START,
      released_before: DATE_END,
      program_filter: 'omitted_all_programs',
      exact_shn: true,
      source_cap: 100,
      cap_resolution: 'recursive_nonoverlapping_date_partition',
      one_day_cap_is_failure: true
    },
    counts: {
      assigned_shns: canonical.assigned.length,
      completed_shns: results.length,
      query_receipts: queryReceipts,
      terminal_slices: terminalSlices,
      capped_parent_slices: cappedParentSlices,
      unresolved_capped_shns: unresolvedCaps,
      unique_registry_rows_returned: shardRegistryIds.size,
      candidate_registry_rows: candidateRegistryIds.size,
      failures: failures.length
    },
    authority: {
      complete_shard_exact_shn_denominator: failures.length === 0 && results.length === canonical.assigned.length,
      exact_shn_match_is_claimant_identity: false,
      exact_shn_match_is_implementation: false,
      exact_shn_match_is_restoration: false,
      missing_public_followup_is_noncompliance: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none'
    },
    failures
  };
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'results.json'), results);
  writeJson(path.join(OUT, 'failure-ledger.json'), failures);
  console.log(JSON.stringify(summary.counts));
  if (failures.length) throw new Error(`shard ${SHARD_ID} failed with ${failures.length} errors`);
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a07-shn-full-shard@2',
      issue: 739,
      shard: SHARD_ID,
      status: 'fail',
      counts: { failures: failures.length + 1 },
      authority: {
        complete_shard_exact_shn_denominator: false,
        exact_shn_match_is_implementation: false,
        missing_public_followup_is_noncompliance: false,
        external_contacts: 0,
        graph_effect: 'none'
      },
      failures: [...failures, { message: error.message }]
    };
    writeJson(path.join(OUT, 'summary.json'), summary);
    writeJson(path.join(OUT, 'failure-ledger.json'), summary.failures);
  }
  console.error(error.stack || error.message);
  process.exit(1);
}
