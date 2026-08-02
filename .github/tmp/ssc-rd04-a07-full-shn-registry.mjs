#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ISSUE = 739;
const EXECUTION = 'SSC-RD04-SNAP-A07-D2-ALL-SHN';
const AUTHORIZATION_MAIN = 'dffed8d63e5cefb3b73b8ad49a96b268e098d204';
const A06_RELEASE_SHA256 = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const SHARD_DIR = path.join(ROOT, 'data/intake', A06_SLUG, 'denominator-shards');
const A06_RELEASE_MANIFEST = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const REGISTRY_URL = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const SHARD_COUNT = 16;
const SHARD_TEXT = String(process.env.A07_SHARD ?? '');
const SHARD_INDEX = Number(SHARD_TEXT);
const SHARD_ID = String(SHARD_INDEX).padStart(2, '0');
const OUT_ROOT = path.join(ROOT, 'a07-full-shn-registry');
const OUT = path.join(OUT_ROOT, `shard-${SHARD_ID}`);
const CAP = 100;
const PACE_MS = 100;
const A06_START = Date.UTC(2025, 6, 1);
const A06_END = Date.UTC(2026, 5, 30);
const CUTOFF = Date.UTC(2026, 7, 1);
const RELIEF_DISPOSITIONS = new Set(['Grant', 'Partial Grant', 'Stipulation']);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stable(value));
};
const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
const sleep = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
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

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = String(keyFn(row) ?? '').trim() || '(blank)';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
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

function assignedShard(shn) {
  const digest = sha256(Buffer.from(shn, 'utf8'));
  return Number(BigInt(`0x${digest}`) % BigInt(SHARD_COUNT));
}

function normalizeA06Row(row, documentIdentity) {
  const normalized = {
    registry_id: String(row.registry_id ?? '').trim(),
    document_identity: documentIdentity,
    decision_id: String(row.decision_id ?? '').trim(),
    release_date: String(row.release_date ?? '').trim(),
    program: String(row.program ?? '').trim(),
    disposition: String(row.disposition ?? '').trim(),
    issue_codes: String(row.issue_codes ?? '').trim(),
    responsible_agency: String(row.responsible_agency ?? '').trim(),
    organizational_ar_name: String(row.organizational_ar_name ?? '').trim(),
    alj_name: String(row.alj_name ?? '').trim(),
    language: String(row.language ?? '').trim(),
    shn_number: String(row.shn_number ?? '').trim()
  };
  invariant(normalized.registry_id, `missing A06 registry ID ${documentIdentity}`);
  invariant(normalized.shn_number || !RELIEF_DISPOSITIONS.has(normalized.disposition), `D1 A06 row missing SHN ${normalized.registry_id}`);
  invariant(parseDate(normalized.release_date) !== null, `malformed A06 release date ${normalized.registry_id}`);
  return normalized;
}

function loadInputs() {
  invariant(Number.isInteger(SHARD_INDEX) && SHARD_INDEX >= 0 && SHARD_INDEX < SHARD_COUNT, `invalid A07 shard ${SHARD_TEXT}`);
  const releaseManifest = readJson(A06_RELEASE_MANIFEST);
  invariant(releaseManifest.combined_sha256 === A06_RELEASE_SHA256, 'canonical A06 release digest mismatch');
  const files = fs.readdirSync(SHARD_DIR).filter((name) => /^\d{2}\.json$/.test(name)).sort();
  invariant(files.length === 64, `expected 64 A06 denominator shards, observed ${files.length}`);
  const allRows = [];
  const registryIds = new Set();
  const documentIds = new Set();
  for (const name of files) {
    const payload = readJson(path.join(SHARD_DIR, name));
    invariant(payload.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `invalid A06 shard schema ${name}`);
    invariant(Array.isArray(payload.documents), `missing A06 documents ${name}`);
    for (const document of payload.documents) {
      const documentIdentity = String(document.document_identity ?? '');
      invariant(documentIdentity && !documentIds.has(documentIdentity), `duplicate or missing A06 document identity ${documentIdentity}`);
      documentIds.add(documentIdentity);
      invariant(Array.isArray(document.registry_rows), `missing A06 registry rows ${documentIdentity}`);
      for (const row of document.registry_rows) {
        const normalized = normalizeA06Row(row, documentIdentity);
        invariant(!registryIds.has(normalized.registry_id), `duplicate A06 registry ID ${normalized.registry_id}`);
        registryIds.add(normalized.registry_id);
        allRows.push(normalized);
      }
    }
  }
  invariant(allRows.length === 12282 && registryIds.size === 12282, 'A06 row denominator drift');
  invariant(documentIds.size === 11672, 'A06 document denominator drift');
  const reliefShns = uniqueSorted(allRows.filter((row) => RELIEF_DISPOSITIONS.has(row.disposition)).map((row) => row.shn_number));
  invariant(reliefShns.length === 6292, `D1 SHN denominator drift: ${reliefShns.length}`);
  const allByShn = new Map();
  const d1ByShn = new Map();
  for (const shn of reliefShns) {
    allByShn.set(shn, []);
    d1ByShn.set(shn, []);
  }
  for (const row of allRows) {
    if (!allByShn.has(row.shn_number)) continue;
    allByShn.get(row.shn_number).push(row);
    if (RELIEF_DISPOSITIONS.has(row.disposition)) d1ByShn.get(row.shn_number).push(row);
  }
  const selected = reliefShns.filter((shn) => assignedShard(shn) === SHARD_INDEX);
  invariant(selected.length > 0, `A07 shard ${SHARD_ID} received zero SHNs`);
  for (const shn of selected) {
    invariant((allByShn.get(shn) ?? []).length > 0, `selected SHN missing A06 rows ${shn}`);
    invariant((d1ByShn.get(shn) ?? []).length > 0, `selected SHN missing D1 rows ${shn}`);
  }
  return { reliefShns, selected, allByShn, d1ByShn };
}

function runCurl(args, timeoutMs = 300_000) {
  const result = spawnSync('curl', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function bootstrap() {
  const dir = path.join(OUT, 'bootstrap');
  fs.mkdirSync(dir, { recursive: true });
  const cookiePath = path.join(OUT, 'cookies.txt');
  const bodyPath = path.join(dir, 'registry-page.html');
  const headersPath = path.join(dir, 'headers.txt');
  const result = runCurl([
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-all-errors', '--retry-delay', '2', '--max-time', '180',
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

function normalizeRegistryRow(raw, shn, index) {
  invariant(raw && typeof raw === 'object' && !Array.isArray(raw), `${shn} row ${index} is not an object`);
  const registryId = String(raw.registryId ?? '').trim();
  const decisionId = String(raw.decisionId ?? '').trim();
  const archived = raw.isArchived === true || raw.isArchived === 'true';
  const current = raw.isArchived === false || raw.isArchived === 'false';
  invariant(registryId, `${shn} row ${index} missing registryId`);
  invariant(archived || current, `${shn} row ${registryId} has invalid archive state`);
  invariant(archived || decisionId, `${shn} current row ${registryId} missing decisionId`);
  const observedShn = String(raw.shnNumber ?? '').trim();
  invariant(observedShn === shn, `${shn} query returned foreign SHN ${observedShn || '(blank)'}`);
  const releaseDate = String(raw.releaseDate ?? '').trim();
  invariant(parseDate(releaseDate) !== null, `${shn} row ${registryId} has malformed release date ${releaseDate}`);
  const documentIdentity = archived ? `archived-registry:${registryId}` : `current-decision:${decisionId}`;
  const normalized = {
    shn_number: shn,
    registry_id: registryId,
    row_identity: `registry:${registryId}`,
    decision_id: decisionId,
    document_identity: documentIdentity,
    archived,
    release_date: releaseDate,
    filing_date: String(raw.filingDate ?? '').trim(),
    program: String(raw.program ?? '').trim(),
    disposition: String(raw.disposition ?? '').trim(),
    issue_codes: String(raw.issueCodes ?? '').trim(),
    responsible_agency: String(raw.responsibleAgency ?? '').trim(),
    organizational_ar_name: String(raw.orgArName ?? '').trim(),
    alj_name: String(raw.aljName ?? '').trim(),
    language: String(raw.language ?? '').trim()
  };
  normalized.row_sha256 = sha256(Buffer.from(stableStringify(normalized), 'utf8'));
  return normalized;
}

function queryShn(shn, cookiePath, expectedRows, d1Rows) {
  const dir = path.join(OUT, 'requests', shn);
  fs.mkdirSync(dir, { recursive: true });
  const bodyPath = path.join(dir, 'response.json');
  const headersPath = path.join(dir, 'headers.txt');
  const metaPath = path.join(dir, 'curl-meta.txt');
  const parameters = [
    ['releasedAfter', ''],
    ['releasedBefore', ''],
    ['shnNumber', shn],
    ['issueCodes', ''],
    ['captcha', 'bypass'],
    ['captchaHash', 'bypass'],
    ['isForSearch', '1']
  ];
  const args = [
    '--get', '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-all-errors', '--retry-delay', '2', '--max-time', '180',
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
  invariant(result.status === 0, `${shn} registry query failed: ${(result.stderr || result.stdout).trim()}`);
  invariant(Number(statusText) === 200, `${shn} registry query HTTP ${statusText}`);
  const text = body.toString('utf8');
  invariant(!/^\s*</.test(text), `${shn} query returned HTML`);
  let rawRows;
  try {
    rawRows = JSON.parse(text);
  } catch (error) {
    throw new Error(`${shn} query JSON parse failed: ${error.message}`);
  }
  invariant(Array.isArray(rawRows), `${shn} query did not return an array`);
  invariant(rawRows.length < CAP, `${shn} query is cap-unresolved at ${rawRows.length} rows`);
  const rows = rawRows.map((row, index) => normalizeRegistryRow(row, shn, index));
  const returnedIds = new Set();
  for (const row of rows) {
    invariant(!returnedIds.has(row.registry_id), `${shn} query returned duplicate registryId ${row.registry_id}`);
    returnedIds.add(row.registry_id);
  }
  const expectedIds = uniqueSorted(expectedRows.map((row) => row.registry_id));
  const expectedIdSet = new Set(expectedIds);
  const missingExpected = expectedIds.filter((id) => !returnedIds.has(id));
  invariant(missingExpected.length === 0, `${shn} query omitted canonical A06 registry IDs: ${missingExpected.join(',')}`);
  const expectedDocuments = new Set(expectedRows.map((row) => row.document_identity));
  const extras = rows.filter((row) => !expectedIdSet.has(row.registry_id));
  const maxD1Date = Math.max(...d1Rows.map((row) => parseDate(row.release_date)));
  const classifiedExtras = extras.map((row) => {
    const releaseMs = parseDate(row.release_date);
    const relative = releaseMs < maxD1Date ? 'before_D1_max_release' : releaseMs === maxD1Date ? 'same_day_as_D1_max_release' : 'after_D1_max_release';
    return {
      ...row,
      relative_to_D1_max_release: relative,
      within_A07_cutoff: releaseMs <= CUTOFF,
      inside_A06_interval: releaseMs >= A06_START && releaseMs <= A06_END,
      shares_A06_document_identity: expectedDocuments.has(row.document_identity),
      later_row_is_implementation: false
    };
  });
  const receipt = {
    schema_version: 'ssc-rd04-a07-full-shn-request@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    shn_number: shn,
    ordered_parameters: parameters,
    http_status: Number(statusText),
    final_url: finalUrl,
    content_type: contentType,
    rows: rows.length,
    expected_a06_rows: expectedRows.length,
    expected_a06_registry_ids: expectedIds,
    missing_expected_a06_registry_ids: missingExpected,
    extra_public_rows: classifiedExtras.length,
    later_extra_rows_within_cutoff: classifiedExtras.filter((row) => row.relative_to_D1_max_release === 'after_D1_max_release' && row.within_A07_cutoff).length,
    post_cutoff_rows: classifiedExtras.filter((row) => !row.within_A07_cutoff).length,
    body_path: rel(bodyPath),
    body_bytes: body.length,
    body_sha256: sha256(body),
    headers_path: rel(headersPath),
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    curl_meta_path: rel(metaPath),
    cap_resolved: rows.length < CAP
  };
  writeJson(path.join(dir, 'receipt.json'), receipt);
  return { shn, receipt, rows, extras: classifiedExtras };
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const inputs = loadInputs();
  const cookiePath = bootstrap();
  const results = [];
  for (let index = 0; index < inputs.selected.length; index += 1) {
    const shn = inputs.selected[index];
    results.push(queryShn(shn, cookiePath, inputs.allByShn.get(shn) ?? [], inputs.d1ByShn.get(shn) ?? []));
    if (index + 1 < inputs.selected.length) sleep(PACE_MS);
  }
  fs.rmSync(cookiePath, { force: true });

  const returnedRows = results.flatMap((result) => result.rows);
  const extras = results.flatMap((result) => result.extras);
  const extraIds = new Set(extras.map((row) => row.registry_id));
  const extraDocs = new Set(extras.map((row) => row.document_identity));
  const extraShns = new Set(extras.map((row) => row.shn_number));
  const laterWithinCutoff = extras.filter((row) => row.relative_to_D1_max_release === 'after_D1_max_release' && row.within_A07_cutoff);
  const postCutoff = extras.filter((row) => !row.within_A07_cutoff);
  const sameDay = extras.filter((row) => row.relative_to_D1_max_release === 'same_day_as_D1_max_release');
  const earlier = extras.filter((row) => row.relative_to_D1_max_release === 'before_D1_max_release');
  const sharedA06Documents = extras.filter((row) => row.shares_A06_document_identity);

  const inputLedger = {
    schema_version: 'ssc-rd04-a07-full-shn-inputs@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    authorized_main: AUTHORIZATION_MAIN,
    shard: SHARD_ID,
    shard_index: SHARD_INDEX,
    shard_count: SHARD_COUNT,
    assignment: 'unsigned_sha256_SHN_mod_16',
    pacing_ms: PACE_MS,
    complete_d1_shns: inputs.reliefShns.length,
    selected_shns: inputs.selected.length,
    selected: inputs.selected.map((shn) => ({
      shn_number: shn,
      assignment_sha256: sha256(Buffer.from(shn, 'utf8')),
      expected_a06_rows: (inputs.allByShn.get(shn) ?? []).length,
      d1_rows: (inputs.d1ByShn.get(shn) ?? []).length,
      d1_release_dates: uniqueSorted((inputs.d1ByShn.get(shn) ?? []).map((row) => row.release_date))
    })),
    outside_human_dependency: false,
    external_contacts_authorized: 0
  };
  const requestLedger = {
    schema_version: 'ssc-rd04-a07-full-shn-request-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    requests: results.length,
    rows: results.map((result) => result.receipt)
  };
  const rowLedger = {
    schema_version: 'ssc-rd04-a07-full-shn-row-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    returned_rows: returnedRows.length,
    extra_public_rows: extras.length,
    rows: results.map((result) => ({
      shn_number: result.shn,
      returned_rows: result.rows,
      extra_rows: result.extras
    }))
  };
  const candidateLedger = {
    schema_version: 'ssc-rd04-a07-full-shn-later-candidate-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    frozen_cutoff: '2026-08-02T00:00:00Z',
    candidate_rows: laterWithinCutoff.length,
    candidate_shns: new Set(laterWithinCutoff.map((row) => row.shn_number)).size,
    candidate_documents: new Set(laterWithinCutoff.map((row) => row.document_identity)).size,
    rows: laterWithinCutoff,
    authority: {
      exact_shn_is_claimant_identity: false,
      later_registry_row_is_implementation: false,
      qualifying_public_implementation_receipts: 0,
      graph_effect: 'none'
    }
  };
  const summary = {
    schema_version: 'ssc-rd04-a07-full-shn-shard-summary@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    shard_index: SHARD_INDEX,
    shard_count: SHARD_COUNT,
    counts: {
      selected_shns: inputs.selected.length,
      successful_requests: results.length,
      cap_unresolved_requests: 0,
      expected_a06_rows: results.reduce((sum, result) => sum + result.receipt.expected_a06_rows, 0),
      returned_public_rows: returnedRows.length,
      extra_public_rows: extraIds.size,
      extra_public_documents: extraDocs.size,
      shns_with_extra_rows: extraShns.size,
      extra_rows_before_D1_max_release: earlier.length,
      extra_rows_same_day_as_D1_max_release: sameDay.length,
      extra_rows_after_D1_max_release_within_cutoff: laterWithinCutoff.length,
      shns_with_later_rows_within_cutoff: new Set(laterWithinCutoff.map((row) => row.shn_number)).size,
      later_documents_within_cutoff: new Set(laterWithinCutoff.map((row) => row.document_identity)).size,
      post_cutoff_extra_rows: postCutoff.length,
      extra_rows_sharing_A06_document_identity: sharedA06Documents.length,
      qualifying_public_implementation_receipts: 0,
      qualifying_restoration_amount_receipts: 0,
      qualifying_restoration_timing_receipts: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    returned_rows_by_program: countBy(returnedRows, (row) => row.program),
    extra_rows_by_program: countBy(extras, (row) => row.program),
    extra_rows_by_disposition: countBy(extras, (row) => row.disposition),
    later_candidate_rows_by_program: countBy(laterWithinCutoff, (row) => row.program),
    later_candidate_rows_by_disposition: countBy(laterWithinCutoff, (row) => row.disposition),
    complete_shard: true,
    terminal_state: 'complete_hash_shard_exact_shn_registry_topology_candidates_not_implementation',
    authority: {
      exact_shn_match_proves_claimant_identity: false,
      extra_registry_row_proves_implementation: false,
      missing_extra_row_proves_noncompliance: false,
      successful_shard_is_complete_denominator: false,
      external_review: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };

  writeJson(path.join(OUT, 'inputs.json'), inputLedger);
  writeJson(path.join(OUT, 'request-ledger.json'), requestLedger);
  writeJson(path.join(OUT, 'rows.json'), rowLedger);
  writeJson(path.join(OUT, 'later-candidates.json'), candidateLedger);
  writeJson(path.join(OUT, 'summary.json'), summary);
  const files = walkFiles(OUT).filter((file) => path.basename(file) !== 'manifest.json');
  const manifest = manifestFor(files);
  writeJson(path.join(OUT, 'manifest.json'), {
    schema_version: 'ssc-rd04-a07-full-shn-shard-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    hash_mode: 'sha256_exact_bytes',
    ...manifest,
    authority: {
      exact_bytes_prove_implementation: false,
      external_contacts: 0,
      graph_effect: 'none'
    }
  });
  console.log(JSON.stringify({
    shard: SHARD_ID,
    selected_shns: summary.counts.selected_shns,
    returned_rows: summary.counts.returned_public_rows,
    extra_rows: summary.counts.extra_public_rows,
    later_candidates: summary.counts.extra_rows_after_D1_max_release_within_cutoff,
    manifest_sha256: manifest.combined_sha256
  }, null, 2));
}

try {
  main();
} catch (error) {
  fs.mkdirSync(OUT, { recursive: true });
  writeJson(path.join(OUT, 'failure.json'), {
    schema_version: 'ssc-rd04-a07-full-shn-shard-failure@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shard: SHARD_ID,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
    external_contacts: 0,
    graph_effect: 'none'
  });
  console.error(error);
  process.exitCode = 1;
}
