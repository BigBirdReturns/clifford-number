#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ISSUE = 739;
const EXECUTION = 'SSC-RD04-SNAP-A07-D2-REGISTRY';
const AUTHORIZATION_MAIN = 'dffed8d63e5cefb3b73b8ad49a96b268e098d204';
const A06_MERGE = 'd1597233110715e58e76e3b50b6792c226d9f7e8';
const A06_RELEASE_SHA256 = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_DIR = path.join(ROOT, 'data/intake', A06_SLUG);
const SHARD_DIR = path.join(A06_DIR, 'denominator-shards');
const A06_RELEASE_MANIFEST = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const OUT = path.join(ROOT, 'a07-postfy-registry-probe');
const REQUESTS_DIR = path.join(OUT, 'requests');
const REGISTRY_URL = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const START = Date.UTC(2026, 6, 1);
const END = Date.UTC(2026, 7, 1);
const DAY = 24 * 60 * 60 * 1000;
const CAP = 100;
const RELIEF_DISPOSITIONS = new Set(['Grant', 'Partial Grant', 'Stipulation']);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stable(value));
};
const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(keyFn(row) ?? '').trim() || '(blank)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function formatDate(ms) {
  const date = new Date(ms);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const month = Number(mm);
  const day = Number(dd);
  const year = Number(yyyy);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return ms;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const out = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(target));
    else if (entry.isFile()) out.push(target);
  }
  return out;
}

function rel(file) {
  return path.relative(OUT, file).split(path.sep).join('/');
}

function manifestFor(files) {
  const entries = files.sort((a, b) => rel(a).localeCompare(rel(b))).map((file) => {
    const bytes = fs.readFileSync(file);
    return { path: rel(file), bytes: bytes.length, sha256: sha256(bytes) };
  });
  return {
    entries,
    combined_sha256: sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join(''), 'utf8'))
  };
}

function compactA06Row(row, shard, documentIdentity) {
  return {
    shard,
    registry_id: String(row.registry_id ?? '').trim(),
    document_identity: documentIdentity,
    decision_id: String(row.decision_id ?? '').trim(),
    release_date: String(row.release_date ?? '').trim(),
    disposition: String(row.disposition ?? '').trim(),
    responsible_agency: String(row.responsible_agency ?? '').trim(),
    issue_codes: String(row.issue_codes ?? '').trim(),
    language: String(row.language ?? '').trim(),
    shn_number: String(row.shn_number ?? '').trim()
  };
}

function loadD1() {
  const manifest = readJson(A06_RELEASE_MANIFEST);
  invariant(manifest.combined_sha256 === A06_RELEASE_SHA256, 'canonical A06 release-manifest digest mismatch');
  const files = fs.readdirSync(SHARD_DIR).filter((name) => /^\d{2}\.json$/.test(name)).sort();
  invariant(files.length === 64, `expected 64 A06 denominator shards, observed ${files.length}`);
  let allRows = 0;
  let allDocuments = 0;
  let reliefRows = 0;
  const registryIds = new Set();
  const documentIds = new Set();
  const byShn = new Map();
  for (const name of files) {
    const payload = readJson(path.join(SHARD_DIR, name));
    const shard = name.slice(0, 2);
    invariant(payload.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `invalid A06 shard schema ${shard}`);
    invariant(payload.shard === shard, `A06 shard identity mismatch ${shard}`);
    invariant(Array.isArray(payload.documents), `A06 shard documents missing ${shard}`);
    invariant(payload.counts?.documents === payload.documents.length, `A06 shard document count mismatch ${shard}`);
    let shardRows = 0;
    for (const document of payload.documents) {
      const documentIdentity = String(document.document_identity ?? '');
      invariant(documentIdentity.length > 0, `missing A06 document identity ${shard}`);
      invariant(!documentIds.has(documentIdentity), `duplicate A06 document identity ${documentIdentity}`);
      documentIds.add(documentIdentity);
      allDocuments += 1;
      invariant(Array.isArray(document.registry_rows), `missing A06 registry rows ${documentIdentity}`);
      invariant(document.registry_row_count === document.registry_rows.length, `A06 registry-row count mismatch ${documentIdentity}`);
      for (const row of document.registry_rows) {
        const compact = compactA06Row(row, shard, documentIdentity);
        invariant(compact.registry_id.length > 0, `missing A06 registry ID ${documentIdentity}`);
        invariant(!registryIds.has(compact.registry_id), `duplicate A06 registry ID ${compact.registry_id}`);
        registryIds.add(compact.registry_id);
        invariant(parseDate(compact.release_date) !== null, `malformed A06 release date ${compact.registry_id}`);
        allRows += 1;
        shardRows += 1;
        if (!RELIEF_DISPOSITIONS.has(compact.disposition)) continue;
        reliefRows += 1;
        invariant(compact.shn_number.length > 0, `D1 relief row missing SHN ${compact.registry_id}`);
        let entry = byShn.get(compact.shn_number);
        if (!entry) {
          entry = {
            shn_number: compact.shn_number,
            registry_ids: new Set(),
            document_identities: new Set(),
            release_dates: new Set(),
            dispositions: new Set(),
            responsible_agencies: new Set()
          };
          byShn.set(compact.shn_number, entry);
        }
        entry.registry_ids.add(compact.registry_id);
        entry.document_identities.add(compact.document_identity);
        entry.release_dates.add(compact.release_date);
        entry.dispositions.add(compact.disposition);
        entry.responsible_agencies.add(compact.responsible_agency);
      }
    }
    invariant(payload.counts?.registry_rows === shardRows, `A06 shard registry-row count mismatch ${shard}`);
  }
  invariant(allRows === 12282 && registryIds.size === 12282, 'A06 registry denominator drift');
  invariant(allDocuments === 11672 && documentIds.size === 11672, 'A06 document denominator drift');
  invariant(reliefRows === 6633, `D1 relief-row denominator drift: ${reliefRows}`);
  invariant(byShn.size === 6292, `D1 SHN denominator drift: ${byShn.size}`);
  const normalized = new Map([...byShn.entries()].map(([shn, entry]) => [shn, {
    shn_number: shn,
    d1_registry_ids: uniqueSorted(entry.registry_ids),
    d1_document_identities: uniqueSorted(entry.document_identities),
    d1_release_dates: uniqueSorted(entry.release_dates),
    d1_dispositions: uniqueSorted(entry.dispositions),
    d1_responsible_agencies: uniqueSorted(entry.responsible_agencies)
  }]));
  return { allRows, allDocuments, reliefRows, byShn: normalized };
}

function runCurl(args, timeoutMs = 420_000) {
  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: timeoutMs
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function bootstrapSession() {
  const dir = path.join(OUT, 'bootstrap');
  fs.mkdirSync(dir, { recursive: true });
  const cookiePath = path.join(OUT, 'cookies.txt');
  const bodyPath = path.join(dir, 'registry-page.html');
  const headersPath = path.join(dir, 'headers.txt');
  const result = runCurl([
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--cookie-jar', cookiePath,
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY_URL
  ]);
  const [statusText, finalUrl, contentType] = result.stdout.trim().split(/\n/);
  const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
  const headers = fs.existsSync(headersPath) ? fs.readFileSync(headersPath) : Buffer.alloc(0);
  const receipt = {
    requested_url: REGISTRY_URL,
    http_status: Number(statusText || 0),
    final_url: finalUrl || null,
    content_type: contentType || null,
    body_path: rel(bodyPath),
    body_bytes: body.length,
    body_sha256: sha256(body),
    headers_path: rel(headersPath),
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    curl_status: result.status,
    curl_error: result.stderr.trim() || null
  };
  writeJson(path.join(dir, 'receipt.json'), receipt);
  invariant(result.status === 0 && receipt.http_status === 200 && body.length > 0, `registry bootstrap failed: ${JSON.stringify(receipt)}`);
  return cookiePath;
}

function normalizeRegistryRow(raw, interval, index) {
  invariant(raw && typeof raw === 'object' && !Array.isArray(raw), `registry row ${interval.id}:${index} is not an object`);
  const registryId = String(raw.registryId ?? '').trim();
  const decisionId = String(raw.decisionId ?? '').trim();
  const archived = raw.isArchived === true || raw.isArchived === 'true';
  const current = raw.isArchived === false || raw.isArchived === 'false';
  invariant(registryId.length > 0, `registry row ${interval.id}:${index} missing registryId`);
  invariant(archived || current, `registry row ${registryId} has malformed archive state`);
  invariant(archived || decisionId.length > 0, `current registry row ${registryId} missing decisionId`);
  const releaseDate = String(raw.releaseDate ?? '').trim();
  const releaseMs = parseDate(releaseDate);
  invariant(releaseMs !== null, `registry row ${registryId} has malformed release date ${releaseDate}`);
  invariant(releaseMs >= interval.start && releaseMs <= interval.end, `registry row ${registryId} lies outside ${interval.id}`);
  invariant(String(raw.program ?? '').trim() === 'CalFresh', `registry row ${registryId} is not CalFresh`);
  const documentIdentity = archived ? `archived-registry:${registryId}` : `current-decision:${decisionId}`;
  const normalized = {
    interval: interval.id,
    source_index: index,
    registry_id: registryId,
    row_identity: `registry:${registryId}`,
    decision_id: decisionId,
    document_identity: documentIdentity,
    archived,
    release_date: releaseDate,
    filing_date: String(raw.filingDate ?? '').trim(),
    program: 'CalFresh',
    disposition: String(raw.disposition ?? '').trim(),
    issue_codes: String(raw.issueCodes ?? '').trim(),
    responsible_agency: String(raw.responsibleAgency ?? '').trim(),
    organizational_ar_name: String(raw.orgArName ?? '').trim(),
    alj_name: String(raw.aljName ?? '').trim(),
    language: String(raw.language ?? '').trim(),
    shn_number: String(raw.shnNumber ?? '').trim()
  };
  normalized.row_sha256 = sha256(Buffer.from(stableStringify(normalized), 'utf8'));
  return normalized;
}

function queryInterval(interval, cookiePath) {
  const dir = path.join(REQUESTS_DIR, interval.id);
  fs.mkdirSync(dir, { recursive: true });
  const bodyPath = path.join(dir, 'response.json');
  const headersPath = path.join(dir, 'headers.txt');
  const metaPath = path.join(dir, 'curl-meta.txt');
  const parameters = [
    ['releasedAfter', formatDate(interval.start)],
    ['releasedBefore', formatDate(interval.end)],
    ['programType', '2'],
    ['shnNumber', ''],
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
    '--referer', REGISTRY_URL,
    '--cookie', cookiePath
  ];
  for (const [key, value] of parameters) args.push('--data-urlencode', `${key}=${value}`);
  args.push(
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY_URL
  );
  const result = runCurl(args);
  fs.writeFileSync(metaPath, result.stdout);
  const [statusText, finalUrl, contentType] = result.stdout.trim().split(/\n/);
  const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
  const headers = fs.existsSync(headersPath) ? fs.readFileSync(headersPath) : Buffer.alloc(0);
  invariant(result.status === 0, `registry query ${interval.id} failed: ${(result.stderr || result.stdout).trim()}`);
  invariant(Number(statusText) === 200, `registry query ${interval.id} HTTP ${statusText}`);
  const text = body.toString('utf8');
  invariant(!/^\s*</.test(text), `registry query ${interval.id} returned HTML`);
  let rawRows;
  try {
    rawRows = JSON.parse(text);
  } catch (error) {
    throw new Error(`registry query ${interval.id} JSON parse failed: ${error.message}`);
  }
  invariant(Array.isArray(rawRows), `registry query ${interval.id} did not return an array`);
  invariant(rawRows.length <= CAP, `registry query ${interval.id} exceeded cap with ${rawRows.length} rows`);
  const rows = rawRows.map((row, index) => normalizeRegistryRow(row, interval, index));
  const receipt = {
    schema_version: 'ssc-rd04-a07-d2-registry-request@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    id: interval.id,
    depth: interval.depth,
    start: formatDate(interval.start),
    end: formatDate(interval.end),
    ordered_parameters: parameters,
    requested_url: REGISTRY_URL,
    http_status: Number(statusText),
    final_url: finalUrl,
    content_type: contentType,
    rows: rows.length,
    capped: rows.length === CAP,
    body_path: rel(bodyPath),
    body_bytes: body.length,
    body_sha256: sha256(body),
    headers_path: rel(headersPath),
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    curl_meta_path: rel(metaPath)
  };
  writeJson(path.join(dir, 'receipt.json'), receipt);
  return { receipt, rows };
}

function compilePostFyDenominator(cookiePath) {
  const stack = [{ start: START, end: END, depth: 0, id: `${isoDate(START)}--${isoDate(END)}` }];
  const requests = [];
  const terminal = [];
  let maxDepth = 0;
  while (stack.length) {
    const interval = stack.pop();
    maxDepth = Math.max(maxDepth, interval.depth);
    const result = queryInterval(interval, cookiePath);
    requests.push(result.receipt);
    if (result.rows.length < CAP) {
      terminal.push({ ...result.receipt, rows_data: result.rows });
      continue;
    }
    if (interval.start === interval.end) throw new Error(`one-day registry slice remains capped: ${interval.id}`);
    const dayDistance = Math.floor((interval.end - interval.start) / DAY);
    const midpoint = interval.start + Math.floor(dayDistance / 2) * DAY;
    const rightStart = midpoint + DAY;
    invariant(rightStart <= interval.end, `invalid registry partition ${interval.id}`);
    const left = { start: interval.start, end: midpoint, depth: interval.depth + 1, id: `${isoDate(interval.start)}--${isoDate(midpoint)}` };
    const right = { start: rightStart, end: interval.end, depth: interval.depth + 1, id: `${isoDate(rightStart)}--${isoDate(interval.end)}` };
    stack.push(right);
    stack.push(left);
  }
  terminal.sort((a, b) => parseDate(a.start) - parseDate(b.start));
  const rows = terminal.flatMap((slice) => slice.rows_data);
  for (const slice of terminal) delete slice.rows_data;
  const registryIds = new Set();
  for (const row of rows) {
    invariant(!registryIds.has(row.registry_id), `duplicate registryId across terminal slices: ${row.registry_id}`);
    registryIds.add(row.registry_id);
  }
  return { requests, terminal, rows, maxDepth };
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(REQUESTS_DIR, { recursive: true });
  const d1 = loadD1();
  const cookiePath = bootstrapSession();
  const corpus = compilePostFyDenominator(cookiePath);
  fs.rmSync(cookiePath, { force: true });

  const documentIds = new Set(corpus.rows.map((row) => row.document_identity));
  const postShns = new Set(corpus.rows.map((row) => row.shn_number).filter(Boolean));
  const candidateRows = corpus.rows.filter((row) => row.shn_number && d1.byShn.has(row.shn_number));
  const candidateRegistryIds = new Set(candidateRows.map((row) => row.registry_id));
  const candidateDocumentIds = new Set(candidateRows.map((row) => row.document_identity));
  const candidateShns = new Set(candidateRows.map((row) => row.shn_number));
  const candidateByShn = new Map();
  for (const row of candidateRows) {
    if (!candidateByShn.has(row.shn_number)) candidateByShn.set(row.shn_number, []);
    candidateByShn.get(row.shn_number).push(row);
  }
  const candidates = [...candidateByShn.entries()].map(([shn, rows]) => ({
    shn_number: shn,
    d1: d1.byShn.get(shn),
    postfy_rows: rows.sort((a, b) => parseDate(a.release_date) - parseDate(b.release_date) || a.registry_id.localeCompare(b.registry_id)),
    postfy_registry_rows: rows.length,
    postfy_document_identities: uniqueSorted(rows.map((row) => row.document_identity)),
    exact_shn_join_observed: true,
    same_shn_is_same_claimant_proven: false,
    later_registry_record_is_implementation: false,
    qualifying_public_implementation_receipt_observed: false
  })).sort((a, b) => a.shn_number.localeCompare(b.shn_number));

  const queryContract = {
    schema_version: 'ssc-rd04-a07-d2-registry-contract@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    authorized_main: AUTHORIZATION_MAIN,
    parent_a06_merge: A06_MERGE,
    parent_a06_release_sha256: A06_RELEASE_SHA256,
    root_interval: '2026-07-01/2026-08-01',
    frozen_public_record_cutoff: '2026-08-02T00:00:00Z',
    endpoint: REGISTRY_URL,
    exact_root_parameters: [
      ['releasedAfter', '07/01/2026'],
      ['releasedBefore', '08/01/2026'],
      ['programType', '2'],
      ['shnNumber', ''],
      ['issueCodes', ''],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass'],
      ['isForSearch', '1']
    ],
    cap: {
      threshold: CAP,
      partition: 'recursive_nonoverlapping_inclusive_date_halves',
      one_day_at_cap: 'fail_closed'
    },
    selection_before_outcome_inspection: true,
    disposition_filter: null,
    agency_filter: null,
    language_filter: null,
    issue_code_filter: null,
    outside_human_dependency: false,
    external_contacts_authorized: 0
  };

  const requestLedger = {
    schema_version: 'ssc-rd04-a07-d2-registry-request-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    requests: corpus.requests.length,
    capped_requests: corpus.requests.filter((row) => row.capped).length,
    terminal_slices: corpus.terminal.length,
    max_depth: corpus.maxDepth,
    rows: corpus.requests
  };
  const terminalLedger = {
    schema_version: 'ssc-rd04-a07-d2-registry-terminal-slices@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    terminal_slices: corpus.terminal.length,
    rows: corpus.terminal
  };
  const rowLedger = {
    schema_version: 'ssc-rd04-a07-d2-postfy-row-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    count: corpus.rows.length,
    rows: corpus.rows.sort((a, b) => parseDate(a.release_date) - parseDate(b.release_date) || a.registry_id.localeCompare(b.registry_id))
  };
  const candidateLedger = {
    schema_version: 'ssc-rd04-a07-d2-exact-shn-candidate-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    d1_shns: d1.byShn.size,
    candidate_shns: candidateShns.size,
    candidate_registry_rows: candidateRegistryIds.size,
    candidate_documents: candidateDocumentIds.size,
    rows: candidates,
    authority: {
      exact_shn_join_is_claimant_identity: false,
      later_record_is_implementation: false,
      missing_candidate_is_noncompliance: false,
      qualifying_public_implementation_receipts: 0,
      graph_effect: 'none'
    }
  };
  const releaseValues = corpus.rows.map((row) => ({ value: row.release_date, ms: parseDate(row.release_date) })).sort((a, b) => a.ms - b.ms);
  const summary = {
    schema_version: 'ssc-rd04-a07-d2-registry-summary@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    parent: {
      authorized_main: AUTHORIZATION_MAIN,
      a06_merge: A06_MERGE,
      a06_release_sha256: A06_RELEASE_SHA256,
      d1_registry_rows: d1.reliefRows,
      d1_unique_nonblank_shns: d1.byShn.size
    },
    counts: {
      registry_requests: corpus.requests.length,
      capped_requests: corpus.requests.filter((row) => row.capped).length,
      terminal_slices: corpus.terminal.length,
      postfy_registry_rows: corpus.rows.length,
      postfy_unique_registry_ids: new Set(corpus.rows.map((row) => row.registry_id)).size,
      postfy_unique_documents: documentIds.size,
      postfy_nonblank_shn_rows: corpus.rows.filter((row) => row.shn_number).length,
      postfy_blank_shn_rows: corpus.rows.filter((row) => !row.shn_number).length,
      postfy_unique_nonblank_shns: postShns.size,
      exact_d1_shn_candidate_rows: candidateRegistryIds.size,
      exact_d1_shn_candidate_documents: candidateDocumentIds.size,
      exact_d1_shn_candidate_shns: candidateShns.size,
      qualifying_public_implementation_receipts: 0,
      qualifying_restoration_amount_receipts: 0,
      qualifying_restoration_timing_receipts: 0,
      external_contacts: 0,
      external_reviews: 0,
      case_level_implementation_joins: 0
    },
    postfy_registry_rows_by_disposition: countBy(corpus.rows, (row) => row.disposition),
    postfy_registry_rows_by_responsible_agency: countBy(corpus.rows, (row) => row.responsible_agency),
    postfy_registry_rows_by_language: countBy(corpus.rows, (row) => row.language),
    candidate_rows_by_disposition: countBy(candidateRows, (row) => row.disposition),
    release_date_range: {
      minimum: releaseValues.at(0)?.value ?? null,
      maximum: releaseValues.at(-1)?.value ?? null
    },
    terminal_state: 'complete_postfy_registry_denominator_exact_shn_candidates_not_implementation',
    authority: {
      registry_is_complete_agency_action_universe: false,
      exact_shn_match_proves_claimant_identity: false,
      later_decision_proves_implementation: false,
      missing_public_followup_proves_noncompliance: false,
      external_review: false,
      publication_effect: 'none',
      graph_effect: 'none',
      adoption_effect: 'none'
    }
  };

  writeJson(path.join(OUT, 'query-contract.json'), queryContract);
  writeJson(path.join(OUT, 'request-ledger.json'), requestLedger);
  writeJson(path.join(OUT, 'terminal-slices.json'), terminalLedger);
  writeJson(path.join(OUT, 'postfy-rows.json'), rowLedger);
  writeJson(path.join(OUT, 'candidate-join.json'), candidateLedger);
  writeJson(path.join(OUT, 'summary.json'), summary);
  const files = walkFiles(OUT).filter((file) => path.basename(file) !== 'manifest.json');
  const manifest = manifestFor(files);
  writeJson(path.join(OUT, 'manifest.json'), {
    schema_version: 'ssc-rd04-a07-d2-registry-probe-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    hash_mode: 'sha256_exact_bytes',
    ...manifest,
    authority: {
      exact_bytes_prove_implementation: false,
      exact_bytes_prove_restoration: false,
      external_contacts: 0,
      graph_effect: 'none'
    }
  });
  console.log(JSON.stringify({
    requests: summary.counts.registry_requests,
    terminal_slices: summary.counts.terminal_slices,
    postfy_registry_rows: summary.counts.postfy_registry_rows,
    candidate_shns: summary.counts.exact_d1_shn_candidate_shns,
    candidate_rows: summary.counts.exact_d1_shn_candidate_rows,
    candidate_documents: summary.counts.exact_d1_shn_candidate_documents,
    manifest_sha256: manifest.combined_sha256
  }, null, 2));
}

try {
  main();
} catch (error) {
  fs.mkdirSync(OUT, { recursive: true });
  writeJson(path.join(OUT, 'failure.json'), {
    schema_version: 'ssc-rd04-a07-d2-registry-failure@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
    external_contacts: 0,
    graph_effect: 'none'
  });
  console.error(error);
  process.exitCode = 1;
}
