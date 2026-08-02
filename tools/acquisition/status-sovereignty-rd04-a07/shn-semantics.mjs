#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'a07-shn-semantics');
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_DIR = path.join(ROOT, 'data/intake', A06_SLUG);
const SHARD_DIR = path.join(A06_DIR, 'denominator-shards');
const RELEASE_MANIFEST = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const REGISTRY = 'https://acms.dss.ca.gov/acms/page.request.do?page=public.decisionRegistry';
const RELIEF = new Set(['Grant', 'Partial Grant', 'Stipulation']);
const SAMPLE_SIZE = 16;
const DATE_AFTER = '07/01/2025';
const DATE_BEFORE = '08/01/2026';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };

fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

const errors = [];
const fail = (condition, message) => { if (!condition) errors.push(message); };

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

function normalizeShn(value) {
  return String(value ?? '').trim();
}

function loadD1() {
  const release = readJson(RELEASE_MANIFEST);
  fail(release.combined_sha256 === EXPECTED_A06_RELEASE,
    `canonical A06 release digest ${release.combined_sha256} != ${EXPECTED_A06_RELEASE}`);

  const allRegistryIds = new Set();
  const allDocumentIds = new Set();
  const reliefRows = [];
  const reliefDocuments = new Set();

  for (let index = 0; index < 64; index += 1) {
    const shardId = String(index).padStart(2, '0');
    const shardPath = path.join(SHARD_DIR, `${shardId}.json`);
    fail(fs.existsSync(shardPath), `missing A06 denominator shard ${shardId}`);
    if (!fs.existsSync(shardPath)) continue;
    const shard = readJson(shardPath);
    fail(shard.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `shard ${shardId} schema`);
    fail(shard.shard === shardId, `shard ${shardId} identity`);
    fail(Array.isArray(shard.documents), `shard ${shardId} documents array`);
    for (const document of shard.documents ?? []) {
      const docIdentity = String(document.document_identity ?? '').trim();
      fail(Boolean(docIdentity), `shard ${shardId} missing document identity`);
      if (docIdentity) allDocumentIds.add(docIdentity);
      for (const row of document.registry_rows ?? []) {
        const registryId = String(row.registry_id ?? '').trim();
        fail(Boolean(registryId), `shard ${shardId} missing registryId`);
        fail(!allRegistryIds.has(registryId), `duplicate canonical registryId ${registryId}`);
        if (registryId) allRegistryIds.add(registryId);
        fail(String(row.program ?? '').trim() === 'CalFresh', `non-CalFresh canonical row ${registryId}`);
        if (RELIEF.has(String(row.disposition ?? '').trim())) {
          reliefRows.push({
            registry_id: registryId,
            document_identity: docIdentity,
            decision_id: String(row.decision_id ?? '').trim(),
            shn_number: normalizeShn(row.shn_number),
            release_date: String(row.release_date ?? '').trim(),
            disposition: String(row.disposition ?? '').trim(),
            responsible_agency: String(row.responsible_agency ?? '').trim()
          });
          reliefDocuments.add(docIdentity);
        }
      }
    }
  }

  const shnMap = new Map();
  for (const row of reliefRows) {
    fail(Boolean(row.shn_number), `blank D1 SHN on registry ${row.registry_id}`);
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

  const sample = [...shnMap.entries()]
    .map(([shn, rows]) => ({ shn, rows, selection_sha256: sha256(Buffer.from(`A07-SHN-PILOT-V2\n${shn}`, 'utf8')) }))
    .sort((a, b) => a.selection_sha256.localeCompare(b.selection_sha256) || a.shn.localeCompare(b.shn))
    .slice(0, SAMPLE_SIZE);

  return { release, allRegistryIds, reliefRows, reliefDocuments, shnMap, sample };
}

function bootstrap() {
  const session = path.join(OUT, 'session');
  ensureDir(session);
  const cookie = path.join(session, 'cookies.txt');
  const headers = path.join(session, 'registry-page.headers.txt');
  const body = path.join(session, 'registry-page.html');
  const meta = runCurl([
    '--compressed', '--location', '--silent', '--show-error', '--fail-with-body',
    '--retry', '2', '--retry-delay', '2', '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-acquisition/1.0',
    '--cookie-jar', cookie,
    '--dump-header', headers,
    '--output', body,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    REGISTRY
  ], 'registry bootstrap').trim().split(/\n/);
  const bytes = fs.readFileSync(body);
  const receipt = {
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
  writeJson(path.join(session, 'registry-page.receipt.json'), receipt);
  fail(receipt.http_status === 200, `registry bootstrap HTTP ${receipt.http_status}`);
  fail(receipt.bytes > 0, 'registry bootstrap empty body');
  return cookie;
}

function queryExactShn(shn, replay, cookie) {
  const safe = sha256(Buffer.from(shn, 'utf8')).slice(0, 16);
  const directory = path.join(OUT, 'requests', safe, `replay-${replay}`);
  ensureDir(directory);
  const bodyPath = path.join(directory, 'response.bin');
  const headersPath = path.join(directory, 'headers.txt');
  const params = [
    ['releasedAfter', DATE_AFTER],
    ['releasedBefore', DATE_BEFORE],
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
  const meta = runCurl(args, `SHN ${shn} replay ${replay}`).trim().split(/\n/);
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
    replay,
    parameters: params,
    http_status: Number(meta[0] ?? 0),
    final_url: meta[1] ?? null,
    content_type: meta[2] ?? null,
    bytes: raw.length,
    sha256: sha256(raw),
    json_array: Array.isArray(rows),
    rows_returned: Array.isArray(rows) ? rows.length : null,
    parse_error: parseError
  };
  writeJson(path.join(directory, 'receipt.json'), receipt);
  if (Array.isArray(rows)) writeJson(path.join(directory, 'response.json'), rows);
  return { receipt, rows: Array.isArray(rows) ? rows : [] };
}

function normalizedIdentity(row) {
  return {
    registry_id: String(row?.registryId ?? '').trim(),
    decision_id: String(row?.decisionId ?? '').trim(),
    shn_number: normalizeShn(row?.shnNumber),
    release_date: String(row?.releaseDate ?? '').trim(),
    program: String(row?.program ?? '').trim(),
    disposition: String(row?.disposition ?? '').trim(),
    responsible_agency: String(row?.responsibleAgency ?? '').trim(),
    archived: row?.isArchived === true || row?.isArchived === 'true'
  };
}

let summary;
try {
  const d1 = loadD1();
  const cookie = bootstrap();
  const sampleResults = [];
  const allNewRegistryIds = new Set();

  for (const item of d1.sample) {
    const first = queryExactShn(item.shn, 1, cookie);
    const second = queryExactShn(item.shn, 2, cookie);
    for (const result of [first, second]) {
      fail(result.receipt.http_status === 200, `SHN ${item.shn} replay ${result.receipt.replay} HTTP ${result.receipt.http_status}`);
      fail(result.receipt.json_array === true, `SHN ${item.shn} replay ${result.receipt.replay} non-array response`);
      fail(result.rows.length > 0, `SHN ${item.shn} replay ${result.receipt.replay} returned zero rows`);
      for (const row of result.rows) {
        const normalized = normalizedIdentity(row);
        fail(Boolean(normalized.registry_id), `SHN ${item.shn} row missing registryId`);
        fail(normalized.shn_number === item.shn,
          `SHN ${item.shn} query leaked row SHN ${normalized.shn_number || '<blank>'}`);
      }
    }

    const firstRows = first.rows.map(normalizedIdentity).sort((a, b) => a.registry_id.localeCompare(b.registry_id));
    const secondRows = second.rows.map(normalizedIdentity).sort((a, b) => a.registry_id.localeCompare(b.registry_id));
    const firstStable = stable(firstRows);
    const secondStable = stable(secondRows);
    fail(firstStable === secondStable, `SHN ${item.shn} deterministic replay mismatch`);

    const returnedIds = new Set(firstRows.map((row) => row.registry_id));
    const knownIds = item.rows.map((row) => row.registry_id).sort();
    const missingKnown = knownIds.filter((id) => !returnedIds.has(id));
    fail(missingKnown.length === 0,
      `SHN ${item.shn} did not reproduce known A06 registry IDs: ${missingKnown.join(',')}`);
    const newRows = firstRows.filter((row) => !d1.allRegistryIds.has(row.registry_id));
    for (const row of newRows) allNewRegistryIds.add(row.registry_id);

    sampleResults.push({
      shn: item.shn,
      selection_sha256: item.selection_sha256,
      known_d1_registry_ids: knownIds,
      rows_returned: firstRows.length,
      source_cap_reached: firstRows.length === 100,
      known_ids_reproduced: missingKnown.length === 0,
      new_registry_rows: newRows,
      normalized_response_sha256: sha256(Buffer.from(firstStable, 'utf8'))
    });
  }

  const status = errors.length === 0 ? 'pass' : 'fail';
  summary = {
    schema_version: 'ssc-rd04-a07-shn-semantics-pilot@2',
    issue: 739,
    as_of_cutoff: '2026-08-02T00:00:00Z',
    status,
    query_contract: {
      endpoint: REGISTRY,
      released_after: DATE_AFTER,
      released_before: DATE_BEFORE,
      program_filter: 'omitted_all_programs',
      exact_shn: true,
      issue_codes_empty_text_input: true,
      disposition_filter: 'omitted',
      responsible_agency_filter: 'omitted',
      organizational_ar_filter: 'omitted'
    },
    source: {
      a06_release_sha256: d1.release.combined_sha256,
      a06_registry_rows: d1.allRegistryIds.size,
      a06_documents: 11672,
      d1_relief_rows: d1.reliefRows.length,
      d1_relief_documents: d1.reliefDocuments.size,
      d1_unique_nonblank_shns: d1.shnMap.size
    },
    sample_contract: {
      method: 'lowest_sha256_of_A07-SHN-PILOT-V2_newline_SHN',
      sample_size: SAMPLE_SIZE,
      content_or_outcome_inspection_before_selection: false
    },
    counts: {
      sampled_shns: sampleResults.length,
      query_replays: sampleResults.length * 2,
      exact_shn_leakage_rows: errors.filter((row) => row.includes('query leaked row SHN')).length,
      deterministic_replay_failures: errors.filter((row) => row.includes('deterministic replay mismatch')).length,
      missing_known_a06_failures: errors.filter((row) => row.includes('did not reproduce known A06')).length,
      capped_sample_queries: sampleResults.filter((row) => row.source_cap_reached).length,
      new_registry_rows_observed_in_sample: allNewRegistryIds.size
    },
    sample_results: sampleResults,
    authority: {
      semantics_validated_for_full_matrix: status === 'pass',
      exact_shn_match_is_claimant_identity: false,
      exact_shn_match_is_implementation: false,
      exact_shn_match_is_restoration: false,
      missing_public_followup_is_noncompliance: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    errors
  };
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'sample-selection.json'), d1.sample.map((item) => ({
    shn: item.shn,
    selection_sha256: item.selection_sha256,
    known_d1_registry_ids: item.rows.map((row) => row.registry_id).sort()
  })));
  console.log(JSON.stringify(summary.counts));
  if (errors.length) throw new Error(errors.join('\n'));
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a07-shn-semantics-pilot@2',
      issue: 739,
      status: 'fail',
      errors: [...errors, error.message],
      authority: {
        semantics_validated_for_full_matrix: false,
        exact_shn_match_is_implementation: false,
        missing_public_followup_is_noncompliance: false,
        external_contacts: 0,
        graph_effect: 'none'
      }
    };
    writeJson(path.join(OUT, 'summary.json'), summary);
  }
  console.error(error.stack || error.message);
  process.exit(1);
}
