import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'rd01-legal-entity-census-v1');
const SCAFFOLD_PATH = path.join(ROOT, 'data/intake/status-sovereignty-rd-wave02-rd01-legal-entity/roster-scaffold.json');
const EXPECTED_HEAD = '72e657baa024e0e90cca5bfc532f8350fe6bca60';
const MAX_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 25000;
const MAX_ATTEMPTS = 2;
const DELAY_MS = 175;
const USER_AGENT = 'BigBirdReturns-clifford-number RD-01 legal-entity census (https://github.com/BigBirdReturns/clifford-number)';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeJson = (p, value) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
};
function normalizeName(input, stripSuffix = true) {
  const suffixes = new Set([
    'INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LLC', 'LTD',
    'LIMITED', 'PLC', 'LP', 'LLP', 'PC', 'PLLC', 'GMBH', 'AG', 'SA', 'SAS', 'BV',
    'NV', 'PTY'
  ]);
  let text = String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/['’`]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (text.startsWith('THE ')) text = text.slice(4);
  if (stripSuffix) {
    const tokens = text.split(' ');
    while (tokens.length > 1 && suffixes.has(tokens.at(-1))) tokens.pop();
    text = tokens.join(' ');
  }
  return text;
}

function scoreName(display, candidate, aliases = []) {
  const d = normalizeName(display);
  const names = [candidate, ...aliases].map((n) => normalizeName(n)).filter(Boolean);
  let best = 0;
  for (const n of names) {
    if (n === d) best = Math.max(best, 100);
    const dt = new Set(d.split(' ').filter(Boolean));
    const nt = new Set(n.split(' ').filter(Boolean));
    const intersection = [...dt].filter((t) => nt.has(t)).length;
    const union = new Set([...dt, ...nt]).size || 1;
    const jaccard = intersection / union;
    if (d && n && (n.startsWith(`${d} `) || d.startsWith(`${n} `))) best = Math.max(best, 88);
    if (dt.size > 1 && nt.size > 1 && jaccard >= 0.8) best = Math.max(best, 86);
    if (jaccard >= 0.65) best = Math.max(best, Math.round(jaccard * 80));
  }
  return best;
}

function safeSegment(input) {
  return String(input).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);
}

function headersText(response) {
  const lines = [`HTTP ${response.status} ${response.statusText}`];
  for (const [key, value] of [...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${key}: ${value}`);
  }
  return lines.join('\n') + '\n';
}

async function boundedFetch({ requestId, method, url, body, outputDir }) {
  const requestBody = body == null ? null : Buffer.from(JSON.stringify(body));
  const attempts = [];
  let terminal = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const attemptDir = path.join(outputDir, `attempt-${attempt}`);
    ensureDir(attemptDir);
    const started = new Date().toISOString();
    const startedMs = Date.now();
    let receipt;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json,text/html;q=0.8,*/*;q=0.5',
          'Content-Type': body == null ? 'application/octet-stream' : 'application/json',
          'User-Agent': USER_AGENT
        },
        body: requestBody,
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      const arrayBuffer = await response.arrayBuffer();
      const responseBody = Buffer.from(arrayBuffer);
      const headerBytes = Buffer.from(headersText(response));
      if (responseBody.length > MAX_BYTES) {
        receipt = {
          request_id: requestId,
          attempt,
          started_at: started,
          elapsed_ms: Date.now() - startedMs,
          method,
          requested_url: url,
          request_body_sha256: requestBody ? sha256(requestBody) : null,
          final_url: response.url,
          http_status: response.status,
          content_type: response.headers.get('content-type'),
          terminal_state: 'body_exceeded_fixed_limit',
          response_body_bytes: responseBody.length,
          maximum_body_bytes: MAX_BYTES,
          exact_body_retained: false
        };
      } else {
        fs.writeFileSync(path.join(attemptDir, 'body.bin'), responseBody);
        fs.writeFileSync(path.join(attemptDir, 'headers.txt'), headerBytes);
        receipt = {
          request_id: requestId,
          attempt,
          started_at: started,
          elapsed_ms: Date.now() - startedMs,
          method,
          requested_url: url,
          request_body_sha256: requestBody ? sha256(requestBody) : null,
          final_url: response.url,
          http_status: response.status,
          content_type: response.headers.get('content-type'),
          terminal_state: response.ok ? 'http_success' : 'terminal_http_non_success',
          response_body_path: path.relative(OUT, path.join(attemptDir, 'body.bin')).replaceAll('\\', '/'),
          response_body_bytes: responseBody.length,
          response_body_sha256: sha256(responseBody),
          response_headers_path: path.relative(OUT, path.join(attemptDir, 'headers.txt')).replaceAll('\\', '/'),
          response_headers_bytes: headerBytes.length,
          response_headers_sha256: sha256(headerBytes),
          exact_body_retained: true
        };
      }
    } catch (error) {
      const errorBytes = Buffer.from(`${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n`);
      fs.writeFileSync(path.join(attemptDir, 'error.txt'), errorBytes);
      receipt = {
        request_id: requestId,
        attempt,
        started_at: started,
        elapsed_ms: Date.now() - startedMs,
        method,
        requested_url: url,
        request_body_sha256: requestBody ? sha256(requestBody) : null,
        terminal_state: attempt === MAX_ATTEMPTS ? 'transport_failure' : 'retryable_transport_failure',
        error_path: path.relative(OUT, path.join(attemptDir, 'error.txt')).replaceAll('\\', '/'),
        error_sha256: sha256(errorBytes)
      };
    }
    writeJson(path.join(attemptDir, 'receipt.json'), receipt);
    attempts.push(receipt);
    terminal = receipt;
    if (receipt.terminal_state === 'http_success' || receipt.terminal_state === 'terminal_http_non_success' || receipt.terminal_state === 'body_exceeded_fixed_limit') break;
    if (attempt < MAX_ATTEMPTS) await sleep(800);
  }
  const aggregate = {
    request_id: requestId,
    method,
    requested_url: url,
    maximum_attempts: MAX_ATTEMPTS,
    attempts,
    terminal_state: terminal.terminal_state,
    terminal_attempt: terminal.attempt,
    exact_body_retained: Boolean(terminal.exact_body_retained)
  };
  writeJson(path.join(outputDir, 'request-receipt.json'), aggregate);
  await sleep(DELAY_MS);
  return aggregate;
}

function readTerminalJson(requestReceipt) {
  if (!requestReceipt.exact_body_retained) return null;
  const terminal = requestReceipt.attempts.find((a) => a.attempt === requestReceipt.terminal_attempt);
  if (!terminal?.response_body_path) return null;
  const fullPath = path.join(OUT, terminal.response_body_path);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

function extractUsaCandidates(payload, displayName) {
  const found = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const name = value.recipient_name ?? value.name ?? value.legal_business_name;
    const identifier = value.uei ?? value.recipient_unique_id ?? value.legal_entity_id ?? value.recipient_id;
    if (typeof name === 'string' && identifier != null) {
      found.push({
        source: 'usaspending_recipient_autocomplete',
        legal_name: name,
        aliases: [],
        identifier_type: value.uei ? 'UEI' : value.recipient_unique_id ? 'recipient_unique_id' : 'USAspending_recipient_id',
        identifier: String(identifier),
        jurisdiction: value.recipient_country_code ?? null,
        score: scoreName(displayName, name)
      });
    }
    Object.values(value).forEach(visit);
  };
  visit(payload);
  const seen = new Set();
  return found.filter((candidate) => {
    const key = `${candidate.identifier_type}:${candidate.identifier}:${normalizeName(candidate.legal_name, false)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.score - a.score || a.legal_name.localeCompare(b.legal_name));
}

function extractGleifCandidates(payload, displayName) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row) => {
    const entity = row?.attributes?.entity ?? {};
    const legalName = entity?.legalName?.name ?? '';
    const aliases = Array.isArray(entity?.otherNames) ? entity.otherNames.map((x) => x?.name).filter(Boolean) : [];
    return {
      source: 'gleif_fulltext',
      legal_name: legalName,
      aliases,
      identifier_type: 'LEI',
      identifier: String(row?.id ?? row?.attributes?.lei ?? ''),
      jurisdiction: entity?.jurisdiction ?? entity?.legalAddress?.country ?? null,
      registration_authority_id: entity?.registeredAt?.id ?? entity?.registrationAuthority?.registrationAuthorityEntityID ?? null,
      score: scoreName(displayName, legalName, aliases)
    };
  }).filter((x) => x.legal_name && x.identifier)
    .sort((a, b) => b.score - a.score || a.legal_name.localeCompare(b.legal_name));
}

function extractSecCandidates(payload, displayName) {
  const rows = Array.isArray(payload) ? payload : Object.values(payload ?? {});
  return rows.map((row) => ({
    source: 'sec_company_tickers',
    legal_name: String(row?.title ?? ''),
    aliases: row?.ticker ? [String(row.ticker)] : [],
    identifier_type: 'SEC_CIK',
    identifier: row?.cik_str == null ? '' : String(row.cik_str).padStart(10, '0'),
    ticker: row?.ticker == null ? null : String(row.ticker),
    jurisdiction: 'US',
    score: scoreName(displayName, row?.title ?? '')
  })).filter((x) => x.legal_name && x.identifier && x.score >= 45)
    .sort((a, b) => b.score - a.score || a.legal_name.localeCompare(b.legal_name));
}

function collectFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...collectFiles(full));
    else result.push(full);
  }
  return result;
}

ensureDir(OUT);
const head = (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (head !== EXPECTED_HEAD) throw new Error(`unexpected research head ${head}`);
const scaffoldBytes = fs.readFileSync(SCAFFOLD_PATH);
const scaffold = JSON.parse(scaffoldBytes.toString('utf8'));
if (!Array.isArray(scaffold.rows) || scaffold.rows.length !== 102) throw new Error('expected exact 102-row scaffold');

const protocol = {
  schema_version: 'ssc-rd01-wave02-legal-entity-census-protocol@1',
  wave_id: 'SSC-RD-W02',
  class_id: 'RD-01-C03',
  issue: 786,
  research_head: EXPECTED_HEAD,
  row_denominator: 102,
  protocol_frozen_before_requests: true,
  sources: [
    { id: 'SEC-COMPANY-TICKERS', authority: 'U.S. Securities and Exchange Commission', method: 'GET', url: 'https://www.sec.gov/files/company_tickers.json', per_row: false },
    { id: 'USASPENDING-RECIPIENT-AUTOCOMPLETE', authority: 'U.S. Department of the Treasury USAspending API', method: 'POST', url: 'https://api.usaspending.gov/api/v2/autocomplete/recipient/', per_row: true, limit: 20 },
    { id: 'GLEIF-FULLTEXT', authority: 'Global Legal Entity Identifier Foundation Golden Copy API', method: 'GET', url: 'https://api.gleif.org/api/v1/lei-records', per_row: true, page_size: 20 }
  ],
  transport: { maximum_attempts_per_route: MAX_ATTEMPTS, timeout_ms: REQUEST_TIMEOUT_MS, maximum_body_bytes: MAX_BYTES, delay_ms: DELAY_MS, redirects: 'follow' },
  candidate_rules: { exact_normalized_name_score: 100, prefix_brand_score: 88, multi_token_jaccard_score: 86, admission_floor: 45, no_candidate_is_not_event_absence: true },
  boundaries: { display_name_is_legal_entity: false, recipient_candidate_is_entity_resolution: false, lei_candidate_is_entity_resolution: false, sec_ticker_match_is_common_control: false, external_contact: false, external_review: false, outside_human_dependency: false, graph_effect: 'none' }
};
writeJson(path.join(OUT, 'protocol.json'), protocol);
writeJson(path.join(OUT, 'input-receipt.json'), {
  scaffold_path: path.relative(ROOT, SCAFFOLD_PATH).replaceAll('\\', '/'),
  scaffold_bytes: scaffoldBytes.length,
  scaffold_sha256: sha256(scaffoldBytes),
  rows: scaffold.rows.length,
  research_head: head
});

const secDir = path.join(OUT, 'global', 'sec-company-tickers');
const secReceipt = await boundedFetch({ requestId: 'SEC-COMPANY-TICKERS', method: 'GET', url: 'https://www.sec.gov/files/company_tickers.json', body: null, outputDir: secDir });
const secPayload = readTerminalJson(secReceipt);

const rowResults = [];
for (let index = 0; index < scaffold.rows.length; index += 1) {
  const row = scaffold.rows[index];
  const displayName = row?.fields?.published_display_name?.value;
  if (typeof displayName !== 'string' || !displayName.trim()) throw new Error(`missing display name for ${row?.row_id}`);
  const rowDir = path.join(OUT, 'rows', safeSegment(row.row_id));
  ensureDir(rowDir);
  const usaBody = { search_text: displayName, limit: 20 };
  const usaReceipt = await boundedFetch({
    requestId: `${row.row_id}:USASPENDING`,
    method: 'POST',
    url: 'https://api.usaspending.gov/api/v2/autocomplete/recipient/',
    body: usaBody,
    outputDir: path.join(rowDir, 'usaspending')
  });
  const gleifUrl = new URL('https://api.gleif.org/api/v1/lei-records');
  gleifUrl.searchParams.set('filter[fulltext]', displayName);
  gleifUrl.searchParams.set('page[size]', '20');
  const gleifReceipt = await boundedFetch({
    requestId: `${row.row_id}:GLEIF`,
    method: 'GET',
    url: gleifUrl.toString(),
    body: null,
    outputDir: path.join(rowDir, 'gleif')
  });
  const usaPayload = readTerminalJson(usaReceipt);
  const gleifPayload = readTerminalJson(gleifReceipt);
  const candidates = [
    ...extractSecCandidates(secPayload, displayName),
    ...extractUsaCandidates(usaPayload, displayName),
    ...extractGleifCandidates(gleifPayload, displayName)
  ].sort((a, b) => b.score - a.score || a.source.localeCompare(b.source) || a.legal_name.localeCompare(b.legal_name));
  const result = {
    row_id: row.row_id,
    ordinal: index + 1,
    published_display_name: displayName,
    routes: {
      usaspending: { terminal_state: usaReceipt.terminal_state, terminal_attempt: usaReceipt.terminal_attempt, exact_body_retained: usaReceipt.exact_body_retained },
      gleif: { terminal_state: gleifReceipt.terminal_state, terminal_attempt: gleifReceipt.terminal_attempt, exact_body_retained: gleifReceipt.exact_body_retained },
      sec_global: { terminal_state: secReceipt.terminal_state, exact_body_retained: secReceipt.exact_body_retained }
    },
    candidate_count: candidates.length,
    candidates: candidates.slice(0, 20),
    exact_score_candidates: candidates.filter((x) => x.score === 100).length,
    high_score_candidates: candidates.filter((x) => x.score >= 86).length,
    adjudication_state: 'candidate_census_only_not_entity_resolution'
  };
  writeJson(path.join(rowDir, 'candidate-preview.json'), result);
  rowResults.push(result);
  console.log(`[${index + 1}/102] ${displayName}: ${candidates.length} candidates; top=${candidates[0]?.score ?? 0}`);
}

const routeStates = {};
for (const row of rowResults) {
  for (const [source, route] of Object.entries(row.routes)) {
    const key = `${source}:${route.terminal_state}`;
    routeStates[key] = (routeStates[key] ?? 0) + 1;
  }
}
const summary = {
  schema_version: 'ssc-rd01-wave02-legal-entity-census-summary@1',
  research_head: head,
  rows: rowResults.length,
  fixed_routes: 1 + rowResults.length * 2,
  sec_global_requests: 1,
  usaspending_requests: rowResults.length,
  gleif_requests: rowResults.length,
  route_states: routeStates,
  rows_with_exact_score_candidate: rowResults.filter((r) => r.exact_score_candidates > 0).length,
  rows_with_high_score_candidate: rowResults.filter((r) => r.high_score_candidates > 0).length,
  rows_without_high_score_candidate: rowResults.filter((r) => r.high_score_candidates === 0).length,
  total_candidates_retained_in_previews: rowResults.reduce((sum, r) => sum + r.candidates.length, 0),
  adjudication_performed: false,
  research_branch_mutated: false,
  external_contacts: 0,
  external_reviews: 0,
  outside_human_dependency: false,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none'
};
writeJson(path.join(OUT, 'summary.json'), summary);
writeJson(path.join(OUT, 'row-index.json'), rowResults.map((row) => ({
  row_id: row.row_id,
  published_display_name: row.published_display_name,
  candidate_count: row.candidate_count,
  exact_score_candidates: row.exact_score_candidates,
  high_score_candidates: row.high_score_candidates,
  top_candidates: row.candidates.slice(0, 5)
})));

const manifestEntries = collectFiles(OUT)
  .filter((p) => !p.endsWith(`${path.sep}manifest.json`))
  .map((p) => {
    const bytes = fs.readFileSync(p);
    return { path: path.relative(OUT, p).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) };
  })
  .sort((a, b) => a.path.localeCompare(b.path));
const combined = sha256(Buffer.from(manifestEntries.map((x) => `${x.sha256}  ${x.path}\n`).join('')));
writeJson(path.join(OUT, 'manifest.json'), {
  schema_version: 'ssc-rd01-wave02-legal-entity-census-manifest@1',
  entries: manifestEntries.length,
  combined_sha256: combined,
  files: manifestEntries
});
console.log(JSON.stringify({ ...summary, manifest_entries: manifestEntries.length, manifest_combined_sha256: combined }, null, 2));
