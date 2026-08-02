import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const INTAKE = path.join(ROOT, 'data', 'intake', 'status-sovereignty-rd04-calfresh-decision-registry-a06');
const CUSTODY = path.join(INTAKE, 'source-custody');
const CONTRACT_PATH = path.join(INTAKE, 'contract.json');
const DENOMINATOR_PATH = path.join(INTAKE, 'registry-denominator.json');
const SAMPLE_PATH = path.join(INTAKE, 'pdf-sample.json');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const toPosix = (value) => path.relative(ROOT, value).split(path.sep).join('/');
const ensureDir = (value) => fs.mkdirSync(value, { recursive: true });
const writeJson = (file, value) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function headerText(headers) {
  return [...headers.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n') + '\n';
}

function cookiesFrom(headers) {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);
  return values.map((value) => String(value).split(';', 1)[0]).join('; ');
}

function normalizeScalar(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(normalizeScalar).filter(Boolean).join(', ');
  return String(value).trim();
}

function normalizeArchived(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function canonicalRowFromRegistry(row) {
  const archived = normalizeArchived(row.isArchived);
  const registryId = normalizeScalar(row.registryId);
  const decisionId = normalizeScalar(row.decisionId);
  const rowIdentity = archived
    ? `registry:${registryId}`
    : `decision:${decisionId}`;
  if ((archived && !registryId) || (!archived && !decisionId)) {
    throw new Error(`registry row lacks a usable download identity: ${JSON.stringify(row)}`);
  }

  const canonical = {
    release_date: normalizeScalar(row.releaseDate),
    program: normalizeScalar(row.program),
    disposition: normalizeScalar(row.disposition),
    issue_codes: normalizeScalar(row.issueCodes),
    responsible_agency: normalizeScalar(row.responsibleAgency),
    organizational_ar_name: normalizeScalar(row.orgArName),
    language: normalizeScalar(row.language),
    shn_number: normalizeScalar(row.shnNumber),
    archived,
    registry_id: registryId,
    decision_id: decisionId,
    row_identity: rowIdentity
  };

  const download = new URL('https://acms.dss.ca.gov/acms/page.request.do');
  download.searchParams.append('page', 'public.decisionRegistryDownload');
  if (archived) {
    download.searchParams.append('registry', registryId);
    download.searchParams.append('archived', 'true');
  } else {
    download.searchParams.append('decision', decisionId);
    download.searchParams.append('archived', 'false');
  }

  return {
    canonical,
    canonical_json: stableStringify(canonical),
    download_url: download.toString()
  };
}

async function fetchAttempt(url, options, directory, attempt, label) {
  ensureDir(directory);
  const startedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const headersPath = path.join(directory, `${label}-attempt-${attempt}.headers.txt`);
  const bodyPath = path.join(directory, `${label}-attempt-${attempt}.body`);
  let response;
  let body = Buffer.alloc(0);
  let error = null;

  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: options.headers,
      signal: controller.signal
    });
    body = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(headersPath, headerText(response.headers));
    fs.writeFileSync(bodyPath, body);
  } catch (caught) {
    error = caught instanceof Error ? `${caught.name}: ${caught.message}` : String(caught);
    fs.writeFileSync(headersPath, '');
    fs.writeFileSync(bodyPath, body);
  } finally {
    clearTimeout(timer);
  }

  return {
    attempt,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    requested_url: url,
    final_url: response?.url ?? null,
    http_status: response?.status ?? null,
    content_type: response?.headers.get('content-type') ?? null,
    headers_path: toPosix(headersPath),
    headers_bytes: fs.statSync(headersPath).size,
    headers_sha256: sha256(fs.readFileSync(headersPath)),
    body_path: toPosix(bodyPath),
    body_bytes: body.length,
    body_sha256: sha256(body),
    ok: Boolean(response?.ok && body.length > 0),
    error,
    cookies: response ? cookiesFrom(response.headers) : ''
  };
}

async function fetchBounded(url, options, directory, label, accept) {
  const attempts = [];
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const receipt = await fetchAttempt(url, options, directory, attempt, label);
    attempts.push(receipt);
    if (receipt.ok) {
      const body = fs.readFileSync(path.join(ROOT, receipt.body_path));
      const accepted = await accept(receipt, body);
      if (accepted) return { attempts, selected: receipt, body };
    }
  }
  return { attempts, selected: null, body: null };
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function issueCodes(value) {
  return [...new Set(String(value ?? '').match(/\b\d{3,4}\b/g) ?? [])].sort();
}

async function main() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  ensureDir(CUSTODY);

  const landingUrl = contract.query.endpoint + '?page=public.decisionRegistry';
  const commonHeaders = {
    'user-agent': 'Clifford-Number-SSC-RD04-A06/1.0 (+public-evidence-custody)',
    'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
  };
  const baseOptions = {
    timeoutMs: contract.query.timeout_seconds * 1000,
    maxAttempts: contract.query.max_attempts,
    headers: commonHeaders
  };

  const landingDir = path.join(CUSTODY, 'registry-session');
  const landing = await fetchBounded(
    landingUrl,
    baseOptions,
    landingDir,
    'landing',
    (receipt) => receipt.http_status === 200 && String(receipt.content_type ?? '').includes('text/html')
  );
  if (!landing.selected) throw new Error('registry session bootstrap failed after bounded retry');
  writeJson(path.join(landingDir, 'fetch.json'), {
    source_id: 'A06-REGISTRY-SESSION',
    authority: 'official_public_decision_registry',
    attempts: landing.attempts,
    terminal_state: 'official_registry_session_recovered'
  });

  const queryUrl = new URL(contract.query.endpoint);
  for (const [name, value] of contract.query.ordered_parameters) queryUrl.searchParams.append(name, value);
  const sessionCookie = landing.selected.cookies;
  const queryHeaders = {
    ...commonHeaders,
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'referer': landingUrl,
    'x-requested-with': 'XMLHttpRequest',
    ...(sessionCookie ? { cookie: sessionCookie } : {})
  };
  const queryDir = path.join(CUSTODY, 'registry-query');
  const query = await fetchBounded(
    queryUrl.toString(),
    { ...baseOptions, headers: queryHeaders },
    queryDir,
    'query',
    (_receipt, body) => {
      try {
        const parsed = JSON.parse(body.toString('utf8'));
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    }
  );
  if (!query.selected || !query.body) throw new Error('registry query failed, was non-JSON, or returned an empty set after bounded retry');

  const rawRows = JSON.parse(query.body.toString('utf8'));
  const identities = new Set();
  const rows = rawRows.map((row, index) => {
    const normalized = canonicalRowFromRegistry(row);
    if (normalized.canonical.program !== contract.query.program) {
      throw new Error(`non-CalFresh row at ordered position ${index + 1}: ${normalized.canonical.program}`);
    }
    if (identities.has(normalized.canonical.row_identity)) {
      throw new Error(`duplicate canonical row identity: ${normalized.canonical.row_identity}`);
    }
    identities.add(normalized.canonical.row_identity);
    return {
      ordered_position: index + 1,
      ...normalized.canonical,
      download_url: normalized.download_url,
      canonical_row_sha256: sha256(Buffer.from(normalized.canonical_json, 'utf8')),
      parsed_issue_codes: issueCodes(normalized.canonical.issue_codes)
    };
  });

  writeJson(path.join(queryDir, 'fetch.json'), {
    source_id: 'A06-CALFRESH-REGISTRY-QUERY',
    authority: 'official_public_decision_registry',
    exact_request_url: queryUrl.toString(),
    session_cookie_used: Boolean(sessionCookie),
    attempts: query.attempts,
    selected_attempt: query.selected.attempt,
    terminal_state: 'nonempty_json_registry_result_recovered',
    returned_rows: rows.length
  });

  const denominator = {
    schema_version: 'ssc-rd04-a06-registry-denominator@1',
    execution_id: contract.execution_id,
    issue: contract.issue,
    as_of: contract.as_of,
    query: {
      exact_request_url: queryUrl.toString(),
      ordered_parameters: contract.query.ordered_parameters,
      date_boundary_semantics: contract.query.date_boundary_semantics,
      raw_body_path: query.selected.body_path,
      raw_body_bytes: query.selected.body_bytes,
      raw_body_sha256: query.selected.body_sha256
    },
    returned_count: rows.length,
    complete_ordered_response_preserved: true,
    registry_returned_set_is_all_calfresh_decisions: false,
    rows
  };
  writeJson(DENOMINATOR_PATH, denominator);

  const selectedRows = [...rows]
    .sort((a, b) => a.canonical_row_sha256.localeCompare(b.canonical_row_sha256) || a.row_identity.localeCompare(b.row_identity))
    .slice(0, Math.min(contract.pdf_selection.cap, rows.length))
    .map((row, index) => ({
      selection_position: index + 1,
      ordered_registry_position: row.ordered_position,
      row_identity: row.row_identity,
      canonical_row_sha256: row.canonical_row_sha256,
      download_url: row.download_url,
      disposition: row.disposition,
      responsible_agency: row.responsible_agency,
      issue_codes: row.issue_codes,
      parsed_issue_codes: row.parsed_issue_codes,
      shn_number: row.shn_number,
      release_date: row.release_date,
      selected_before_pdf_content: true
    }));

  const decisionResults = await mapPool(selectedRows, 4, async (selected) => {
    const safeId = selected.row_identity.replace(/[^A-Za-z0-9._-]+/g, '_');
    const directory = path.join(CUSTODY, 'decisions', safeId);
    const fetched = await fetchBounded(
      selected.download_url,
      {
        ...baseOptions,
        headers: {
          ...commonHeaders,
          'accept': 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.5',
          'referer': landingUrl,
          ...(sessionCookie ? { cookie: sessionCookie } : {})
        }
      },
      directory,
      'decision',
      (receipt) => receipt.http_status === 200 && receipt.body_bytes > 0
    );

    let terminalState = 'source_unavailable_after_bounded_retry';
    let textPath = null;
    let textBytes = 0;
    let textSha256 = null;
    let parseError = null;
    if (fetched.selected) {
      const selectedBody = path.join(ROOT, fetched.selected.body_path);
      const textFile = path.join(directory, 'decision.txt');
      const contentType = String(fetched.selected.content_type ?? '').toLowerCase();
      if (contentType.includes('pdf') || fs.readFileSync(selectedBody).subarray(0, 4).toString('ascii') === '%PDF') {
        try {
          execFileSync('pdftotext', ['-layout', selectedBody, textFile], { stdio: 'pipe' });
          const text = fs.readFileSync(textFile);
          textPath = toPosix(textFile);
          textBytes = text.length;
          textSha256 = sha256(text);
          terminalState = 'exact_pdf_and_text_recovered';
        } catch (error) {
          parseError = error instanceof Error ? error.message : String(error);
          terminalState = 'unparseable_exact_bytes_preserved';
        }
      } else {
        terminalState = 'unparseable_exact_bytes_preserved';
        parseError = `unexpected content type: ${fetched.selected.content_type}`;
      }
    }

    const receipt = {
      schema_version: 'ssc-rd04-a06-decision-fetch@1',
      execution_id: contract.execution_id,
      row_identity: selected.row_identity,
      canonical_row_sha256: selected.canonical_row_sha256,
      exact_download_url: selected.download_url,
      attempts: fetched.attempts,
      selected_attempt: fetched.selected?.attempt ?? null,
      selected_body_path: fetched.selected?.body_path ?? null,
      selected_body_bytes: fetched.selected?.body_bytes ?? 0,
      selected_body_sha256: fetched.selected?.body_sha256 ?? null,
      selected_content_type: fetched.selected?.content_type ?? null,
      text_path: textPath,
      text_bytes: textBytes,
      text_sha256: textSha256,
      parse_error: parseError,
      terminal_state: terminalState
    };
    writeJson(path.join(directory, 'fetch.json'), receipt);
    return receipt;
  });

  const sample = {
    schema_version: 'ssc-rd04-a06-pdf-sample@1',
    execution_id: contract.execution_id,
    issue: contract.issue,
    selection_rule: contract.pdf_selection,
    registry_returned_count: rows.length,
    selected_count: selectedRows.length,
    selected_before_pdf_content: true,
    replacements_after_content_inspection: 0,
    rows: selectedRows.map((row, index) => ({ ...row, fetch: decisionResults[index] }))
  };
  writeJson(SAMPLE_PATH, sample);

  console.log(JSON.stringify({
    execution_id: contract.execution_id,
    exact_query: queryUrl.toString(),
    registry_rows: rows.length,
    selected_decisions: selectedRows.length,
    exact_pdf_and_text_recovered: decisionResults.filter((row) => row.terminal_state === 'exact_pdf_and_text_recovered').length,
    unparseable_exact_bytes_preserved: decisionResults.filter((row) => row.terminal_state === 'unparseable_exact_bytes_preserved').length,
    unavailable: decisionResults.filter((row) => row.terminal_state === 'source_unavailable_after_bounded_retry').length
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
