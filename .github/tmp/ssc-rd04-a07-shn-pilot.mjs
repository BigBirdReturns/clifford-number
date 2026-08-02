#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ISSUE = 739;
const EXECUTION = 'SSC-RD04-SNAP-A07-D2-SHN-PILOT';
const AUTHORIZATION_MAIN = 'dffed8d63e5cefb3b73b8ad49a96b268e098d204';
const A06_RELEASE_SHA256 = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const SHARD_DIR = path.join(ROOT, 'data/intake', A06_SLUG, 'denominator-shards');
const A06_RELEASE_MANIFEST = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const OUT = path.join(ROOT, 'a07-shn-pilot');
const REGISTRY_URL = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const CAP = 100;
const RELIEF_DISPOSITIONS = new Set(['Grant', 'Partial Grant', 'Stipulation']);
const FROZEN_SHNS = [
  'SHN-105019339',
  'SHN-105063116',
  'SHN-105068042',
  'SHN-105070266',
  'SHN-105084594',
  'SHN-105085550',
  'SHN-105087782',
  'SHN-105088771',
  'SHN-105089159',
  'SHN-105091507',
  'SHN-105096786',
  'SHN-105098447',
  'SHN-105100880',
  'SHN-105102184',
  'SHN-105103605',
  'SHN-105107764'
];

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

function normalizeA06Row(row, documentIdentity) {
  return {
    registry_id: String(row.registry_id ?? '').trim(),
    document_identity: documentIdentity,
    decision_id: String(row.decision_id ?? '').trim(),
    release_date: String(row.release_date ?? '').trim(),
    program: String(row.program ?? '').trim(),
    disposition: String(row.disposition ?? '').trim(),
    issue_codes: String(row.issue_codes ?? '').trim(),
    responsible_agency: String(row.responsible_agency ?? '').trim(),
    language: String(row.language ?? '').trim(),
    shn_number: String(row.shn_number ?? '').trim()
  };
}

function loadPilotInputs() {
  const releaseManifest = readJson(A06_RELEASE_MANIFEST);
  invariant(releaseManifest.combined_sha256 === A06_RELEASE_SHA256, 'canonical A06 release digest mismatch');
  const files = fs.readdirSync(SHARD_DIR).filter((name) => /^\d{2}\.json$/.test(name)).sort();
  invariant(files.length === 64, `expected 64 A06 shards, observed ${files.length}`);
  const allByShn = new Map();
  const reliefShns = new Set();
  let allRows = 0;
  let documents = 0;
  const registryIds = new Set();
  const documentIds = new Set();
  for (const name of files) {
    const payload = readJson(path.join(SHARD_DIR, name));
    invariant(payload.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `invalid A06 shard ${name}`);
    for (const document of payload.documents) {
      const documentIdentity = String(document.document_identity ?? '');
      invariant(documentIdentity && !documentIds.has(documentIdentity), `duplicate or missing A06 document identity ${documentIdentity}`);
      documentIds.add(documentIdentity);
      documents += 1;
      for (const row of document.registry_rows) {
        const normalized = normalizeA06Row(row, documentIdentity);
        invariant(normalized.registry_id && !registryIds.has(normalized.registry_id), `duplicate or missing A06 registry ID ${normalized.registry_id}`);
        registryIds.add(normalized.registry_id);
        allRows += 1;
        if (RELIEF_DISPOSITIONS.has(normalized.disposition)) {
          invariant(normalized.shn_number, `D1 row missing SHN ${normalized.registry_id}`);
          reliefShns.add(normalized.shn_number);
        }
        if (!FROZEN_SHNS.includes(normalized.shn_number)) continue;
        if (!allByShn.has(normalized.shn_number)) allByShn.set(normalized.shn_number, []);
        allByShn.get(normalized.shn_number).push(normalized);
      }
    }
  }
  invariant(allRows === 12282 && registryIds.size === 12282, 'A06 row denominator drift');
  invariant(documents === 11672 && documentIds.size === 11672, 'A06 document denominator drift');
  const lexical = [...reliefShns].sort().slice(0, FROZEN_SHNS.length);
  invariant(stableStringify(lexical) === stableStringify(FROZEN_SHNS), `frozen pilot selection drift: ${JSON.stringify(lexical)}`);
  for (const shn of FROZEN_SHNS) invariant((allByShn.get(shn) ?? []).length > 0, `frozen SHN missing from A06: ${shn}`);
  return { allByShn, allRows, documents, reliefShns: reliefShns.size };
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

function queryShn(shn, cookiePath, expectedRows) {
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
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
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
  const missingExpected = expectedIds.filter((id) => !returnedIds.has(id));
  invariant(missingExpected.length === 0, `${shn} query omitted canonical A06 registry IDs: ${missingExpected.join(',')}`);
  const expectedIdSet = new Set(expectedIds);
  const extraRows = rows.filter((row) => !expectedIdSet.has(row.registry_id));
  const receipt = {
    schema_version: 'ssc-rd04-a07-shn-pilot-request@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    shn_number: shn,
    ordered_parameters: parameters,
    http_status: Number(statusText),
    final_url: finalUrl,
    content_type: contentType,
    rows: rows.length,
    expected_a06_rows: expectedRows.length,
    expected_a06_registry_ids: expectedIds,
    missing_expected_a06_registry_ids: missingExpected,
    extra_public_rows: extraRows.length,
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
  return { shn, receipt, rows, extraRows };
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const inputs = loadPilotInputs();
  const cookiePath = bootstrap();
  const results = [];
  for (const shn of FROZEN_SHNS) results.push(queryShn(shn, cookiePath, inputs.allByShn.get(shn) ?? []));
  fs.rmSync(cookiePath, { force: true });

  const allReturned = results.flatMap((result) => result.rows);
  const extras = results.flatMap((result) => result.extraRows);
  const extraIds = new Set(extras.map((row) => row.registry_id));
  const extraDocs = new Set(extras.map((row) => row.document_identity));
  const extraShns = new Set(extras.map((row) => row.shn_number));
  const cutoffStart = Date.UTC(2025, 6, 1);
  const cutoffEnd = Date.UTC(2026, 5, 30);
  const extrasAfterA06 = extras.filter((row) => parseDate(row.release_date) > cutoffEnd);
  const extrasBeforeA06 = extras.filter((row) => parseDate(row.release_date) < cutoffStart);
  const extrasOtherPrograms = extras.filter((row) => row.program !== 'CalFresh');

  const contract = {
    schema_version: 'ssc-rd04-a07-shn-pilot-contract@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    authorized_main: AUTHORIZATION_MAIN,
    selection: 'first_sixteen_D1_SHNs_in_lexical_order',
    frozen_shns: FROZEN_SHNS,
    endpoint: REGISTRY_URL,
    exact_parameters_per_request: [
      ['releasedAfter', ''],
      ['releasedBefore', ''],
      ['programType', '<omitted_all_programs>'],
      ['shnNumber', '<exact_frozen_SHN>'],
      ['issueCodes', ''],
      ['captcha', 'bypass'],
      ['captchaHash', 'bypass'],
      ['isForSearch', '1']
    ],
    cap_threshold: CAP,
    outside_human_dependency: false,
    external_contacts_authorized: 0,
    complete_execution_authorized: false
  };
  const requestLedger = {
    schema_version: 'ssc-rd04-a07-shn-pilot-request-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    requests: results.length,
    rows: results.map((result) => result.receipt)
  };
  const rowLedger = {
    schema_version: 'ssc-rd04-a07-shn-pilot-row-ledger@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    returned_rows: allReturned.length,
    extra_public_rows: extras.length,
    rows: results.map((result) => ({
      shn_number: result.shn,
      rows: result.rows,
      extra_public_registry_ids: result.extraRows.map((row) => row.registry_id)
    }))
  };
  const summary = {
    schema_version: 'ssc-rd04-a07-shn-pilot-summary@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    counts: {
      frozen_shns: FROZEN_SHNS.length,
      successful_requests: results.length,
      cap_unresolved_requests: 0,
      canonical_a06_rows_for_pilot_shns: FROZEN_SHNS.reduce((sum, shn) => sum + (inputs.allByShn.get(shn) ?? []).length, 0),
      returned_public_rows: allReturned.length,
      extra_public_rows_outside_a06_registry_ids: extraIds.size,
      extra_public_documents: extraDocs.size,
      extra_public_shns: extraShns.size,
      extra_rows_after_a06_interval: extrasAfterA06.length,
      extra_rows_before_a06_interval: extrasBeforeA06.length,
      extra_rows_in_other_programs: extrasOtherPrograms.length,
      qualifying_public_implementation_receipts: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    returned_rows_by_program: countBy(allReturned, (row) => row.program),
    extra_rows_by_program: countBy(extras, (row) => row.program),
    extra_rows_by_disposition: countBy(extras, (row) => row.disposition),
    extra_rows_by_release_date: countBy(extras, (row) => row.release_date),
    form_semantics_validated: true,
    complete_6292_shn_execution_authorized_by_pilot: true,
    terminal_state: 'pilot_exact_shn_all_program_registry_semantics_validated_extras_not_implementation',
    authority: {
      exact_shn_match_proves_claimant_identity: false,
      extra_registry_row_proves_implementation: false,
      missing_extra_row_proves_noncompliance: false,
      external_review: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };

  writeJson(path.join(OUT, 'contract.json'), contract);
  writeJson(path.join(OUT, 'request-ledger.json'), requestLedger);
  writeJson(path.join(OUT, 'rows.json'), rowLedger);
  writeJson(path.join(OUT, 'summary.json'), summary);
  const files = walkFiles(OUT).filter((file) => path.basename(file) !== 'manifest.json');
  const manifest = manifestFor(files);
  writeJson(path.join(OUT, 'manifest.json'), {
    schema_version: 'ssc-rd04-a07-shn-pilot-manifest@1',
    execution_id: EXECUTION,
    issue: ISSUE,
    hash_mode: 'sha256_exact_bytes',
    ...manifest,
    authority: {
      exact_bytes_prove_implementation: false,
      external_contacts: 0,
      graph_effect: 'none'
    }
  });
  console.log(JSON.stringify({
    requests: results.length,
    returned_rows: allReturned.length,
    extra_rows: extraIds.size,
    extra_after_a06: extrasAfterA06.length,
    extra_other_programs: extrasOtherPrograms.length,
    manifest_sha256: manifest.combined_sha256
  }, null, 2));
}

try {
  main();
} catch (error) {
  fs.mkdirSync(OUT, { recursive: true });
  writeJson(path.join(OUT, 'failure.json'), {
    schema_version: 'ssc-rd04-a07-shn-pilot-failure@1',
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
