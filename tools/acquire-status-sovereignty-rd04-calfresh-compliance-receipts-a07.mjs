#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');
const DEFAULT_LEDGER = path.join(
  DEFAULT_ROOT,
  'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/source-ledger.json'
);
const DEFAULT_OUT = path.join(
  DEFAULT_ROOT,
  'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/a07-official-source-acquisition'
);
const EXPECTED_PENDING_SOURCE_IDS = Object.freeze([
  'CDSS-STATE-HEARINGS',
  'CDSS-HEARING-REQUESTS',
  'CDSS-REGULATIONS-HOME',
  'CDSS-SOCIAL-SERVICE-STANDARDS-MANUAL-LETTERS',
  'CDSS-COUNTY-OFFICES',
  'CDSS-CALFRESH-DASHBOARD',
  'CDSS-CALFRESH-DATA-TABLES',
  'LAC-DPSS-ASH-001',
  'LAC-DPSS-ASH-008'
]);
const REQUEST_HEADERS = Object.freeze([
  ['User-Agent', 'clifford-number-a07-public-source-custody/1.0'],
  ['Accept', 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8'],
  ['Accept-Language', 'en-US,en;q=0.5'],
  ['Accept-Encoding', 'identity'],
  ['Connection', 'close']
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 10;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const toPosix = (value) => value.split(path.sep).join('/');
const ensureDir = (directory) => fs.mkdirSync(directory, { recursive: true });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, stable(value));
}

function safeSourceId(sourceId) {
  const value = String(sourceId ?? '');
  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(value)) throw new Error(`unsafe source_id: ${value}`);
  return value;
}

function orderedHeadersObject(headers = REQUEST_HEADERS) {
  return Object.fromEntries(headers.map(([name, value]) => [name, value]));
}

function rawHeaderPairs(rawHeaders) {
  const pairs = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    pairs.push([rawHeaders[index], rawHeaders[index + 1]]);
  }
  return pairs;
}

function headerValue(pairs, name) {
  const wanted = name.toLowerCase();
  const match = pairs.find(([key]) => key.toLowerCase() === wanted);
  return match ? match[1] : null;
}

function requestOnce(urlString, { timeoutMs, requestHeaders }) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(urlString);
    } catch (error) {
      reject(new Error(`invalid URL ${urlString}: ${error.message}`));
      return;
    }
    if (!['http:', 'https:'].includes(target.protocol)) {
      reject(new Error(`unsupported URL protocol: ${target.protocol}`));
      return;
    }
    const transport = target.protocol === 'https:' ? https : http;
    const startedAt = new Date().toISOString();
    const request = transport.request(target, {
      method: 'GET',
      headers: orderedHeadersObject(requestHeaders),
      timeout: timeoutMs
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const body = Buffer.concat(chunks);
        const headers = rawHeaderPairs(response.rawHeaders ?? []);
        resolve({
          requested_url: urlString,
          status: response.statusCode ?? 0,
          status_message: response.statusMessage ?? '',
          http_version: response.httpVersion,
          headers,
          body,
          started_at: startedAt,
          completed_at: new Date().toISOString()
        });
      });
    });
    request.on('timeout', () => {
      const error = new Error(`request timeout after ${timeoutMs}ms`);
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    });
    request.on('error', reject);
    request.end();
  });
}

async function requestChain(initialUrl, options) {
  const hops = [];
  let currentUrl = initialUrl;
  const visited = new Set();
  for (let redirectIndex = 0; redirectIndex <= MAX_REDIRECTS; redirectIndex += 1) {
    if (visited.has(currentUrl)) throw new Error(`redirect loop at ${currentUrl}`);
    visited.add(currentUrl);
    const hop = await requestOnce(currentUrl, options);
    hops.push(hop);
    if (!REDIRECT_STATUSES.has(hop.status)) return { hops, terminal: hop };
    const location = headerValue(hop.headers, 'location');
    if (!location) return { hops, terminal: hop };
    currentUrl = new URL(location, currentUrl).href;
  }
  throw new Error(`redirect limit exceeded for ${initialUrl}`);
}

function classifyAttempt({ chain, error }) {
  if (error) {
    return {
      state: 'transport_error',
      retryable: true,
      exact_response_preserved: false
    };
  }
  const terminal = chain.terminal;
  if (terminal.status >= 200 && terminal.status < 300 && terminal.body.length > 0) {
    return {
      state: 'exact_response_preserved_pending_semantic_classification',
      retryable: false,
      exact_response_preserved: true
    };
  }
  if ([401, 403].includes(terminal.status)) {
    return {
      state: 'source_restricted',
      retryable: false,
      exact_response_preserved: true
    };
  }
  if ([404, 410].includes(terminal.status)) {
    return {
      state: 'source_unavailable',
      retryable: false,
      exact_response_preserved: true
    };
  }
  if ([408, 425, 429].includes(terminal.status) || terminal.status >= 500) {
    return {
      state: 'transient_http_failure',
      retryable: true,
      exact_response_preserved: true
    };
  }
  if (terminal.status >= 200 && terminal.status < 300 && terminal.body.length === 0) {
    return {
      state: 'empty_success_body',
      retryable: true,
      exact_response_preserved: true
    };
  }
  return {
    state: 'malformed_or_conflicting',
    retryable: false,
    exact_response_preserved: true
  };
}

function terminalState(attempts) {
  const last = attempts.at(-1);
  if (!last) return 'source_unavailable';
  if (last.classification === 'exact_response_preserved_pending_semantic_classification') {
    return 'exact_response_preserved_pending_semantic_classification';
  }
  if (last.classification === 'source_restricted') return 'source_restricted';
  if (last.classification === 'source_unavailable') return 'source_unavailable';
  if (last.classification === 'malformed_or_conflicting' || last.classification === 'empty_success_body') {
    return 'malformed_or_conflicting';
  }
  return 'source_unavailable';
}

function validateSourceLedger(ledger, {
  enforceFrozenCount = true,
  allowHttp = false
} = {}) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };

  eq(ledger?.schema_version, 'ssc-rd04-a07-source-ledger@1', 'source-ledger schema');
  eq(ledger?.acquisition_id, 'SSC-RD04-SNAP-A07', 'acquisition identity');
  eq(ledger?.issue, 741, 'issue receipt');
  eq(ledger?.exact_search_receipt_contract?.retry_limit, 2, 'retry limit');
  eq(ledger?.exact_search_receipt_contract?.query_expansion_after_result_inspection, false, 'query expansion boundary');
  for (const key of [
    'preserve_requested_url',
    'preserve_ordered_query',
    'preserve_request_headers',
    'preserve_response_headers',
    'preserve_redirects',
    'preserve_http_status',
    'preserve_content_type',
    'preserve_exact_body',
    'preserve_body_sha256',
    'preserve_zero_result_body',
    'preserve_timestamp'
  ]) eq(ledger?.exact_search_receipt_contract?.[key], true, `receipt contract ${key}`);

  const sources = (ledger?.sources ?? []).filter((source) => source.requested_url);
  const ids = sources.map((source) => source.source_id);
  if (enforceFrozenCount) {
    check(JSON.stringify(ids) === JSON.stringify(EXPECTED_PENDING_SOURCE_IDS), 'frozen pending source denominator and order');
  } else {
    check(sources.length > 0, 'test source denominator');
  }
  check(new Set(ids).size === ids.length, 'duplicate source identities');
  for (const source of sources) {
    try {
      safeSourceId(source.source_id);
    } catch (error) {
      errors.push(error.message);
    }
    let target;
    try {
      target = new URL(source.requested_url);
    } catch (error) {
      errors.push(`invalid source URL ${source.source_id}: ${error.message}`);
      continue;
    }
    if (!allowHttp) eq(target.protocol, 'https:', `HTTPS source ${source.source_id}`);
    else check(['http:', 'https:'].includes(target.protocol), `HTTP(S) source ${source.source_id}`);
    eq(target.hostname, source.official_host, `official host ${source.source_id}`);
    eq(source.source_bytes_preserved_in_a07, false, `pre-acquisition byte state ${source.source_id}`);
    eq(source.eligible_for_case_level_implementation_join, false, `pre-acquisition case-join state ${source.source_id}`);
    check(['pending_exact_custody', 'pending_exact_locator_resolution'].includes(source.custody_state), `pending custody state ${source.source_id}`);
  }

  for (const key of [
    'policy_proves_case_compliance',
    'aggregate_proves_case_compliance',
    'decision_order_proves_implementation',
    'submitted_report_proves_issuance',
    'absence_of_public_receipt_proves_noncompliance',
    'one_county_proves_statewide_prevalence',
    'outside_human_dependency'
  ]) eq(ledger?.boundaries?.[key], false, `source boundary ${key}`);
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(ledger?.boundaries?.[key], 'none', `source effect ${key}`);
  }
  return errors;
}

async function acquireSource(source, outputRoot, {
  timeoutMs,
  retryDelayMs,
  requestHeaders
}) {
  const sourceId = safeSourceId(source.source_id);
  const sourceDirectory = path.join(outputRoot, sourceId);
  ensureDir(sourceDirectory);
  const attempts = [];
  for (let attemptNumber = 1; attemptNumber <= 2; attemptNumber += 1) {
    const attemptDirectory = path.join(sourceDirectory, `attempt-${attemptNumber}`);
    ensureDir(attemptDirectory);
    const requestReceipt = {
      method: 'GET',
      requested_url: source.requested_url,
      ordered_query: [...new URL(source.requested_url).searchParams.entries()],
      ordered_headers: requestHeaders,
      timeout_ms: timeoutMs,
      attempt: attemptNumber,
      started_at: new Date().toISOString()
    };
    writeJson(path.join(attemptDirectory, 'request.json'), requestReceipt);

    let chain = null;
    let error = null;
    try {
      chain = await requestChain(source.requested_url, { timeoutMs, requestHeaders });
    } catch (caught) {
      error = caught;
    }
    const classification = classifyAttempt({ chain, error });
    if (error) {
      writeJson(path.join(attemptDirectory, 'transport-error.json'), {
        name: error.name,
        code: error.code ?? null,
        message: error.message,
        completed_at: new Date().toISOString()
      });
    }

    const hopReceipts = [];
    if (chain) {
      for (let index = 0; index < chain.hops.length; index += 1) {
        const hop = chain.hops[index];
        const hopId = String(index + 1).padStart(2, '0');
        const bodyFile = `hop-${hopId}.body.bin`;
        fs.writeFileSync(path.join(attemptDirectory, bodyFile), hop.body);
        const receipt = {
          hop: index + 1,
          requested_url: hop.requested_url,
          status: hop.status,
          status_message: hop.status_message,
          http_version: hop.http_version,
          response_headers: hop.headers,
          content_type: headerValue(hop.headers, 'content-type'),
          location: headerValue(hop.headers, 'location'),
          body_path: bodyFile,
          body_bytes: hop.body.length,
          body_sha256: sha256(hop.body),
          started_at: hop.started_at,
          completed_at: hop.completed_at
        };
        writeJson(path.join(attemptDirectory, `hop-${hopId}.json`), receipt);
        hopReceipts.push(receipt);
      }
    }

    const finalHop = hopReceipts.at(-1) ?? null;
    const attemptReceipt = {
      attempt: attemptNumber,
      classification: classification.state,
      retryable: classification.retryable,
      exact_response_preserved: classification.exact_response_preserved,
      redirect_hops: hopReceipts.length,
      final_url: finalHop?.requested_url ?? null,
      http_status: finalHop?.status ?? null,
      content_type: finalHop?.content_type ?? null,
      body_path: finalHop ? toPosix(path.join(`attempt-${attemptNumber}`, finalHop.body_path)) : null,
      body_bytes: finalHop?.body_bytes ?? 0,
      body_sha256: finalHop?.body_sha256 ?? null,
      request_path: toPosix(path.join(`attempt-${attemptNumber}`, 'request.json')),
      hop_receipts: hopReceipts.map((receipt) => toPosix(path.join(
        `attempt-${attemptNumber}`,
        `hop-${String(receipt.hop).padStart(2, '0')}.json`
      ))),
      completed_at: new Date().toISOString()
    };
    writeJson(path.join(attemptDirectory, 'attempt.json'), attemptReceipt);
    attempts.push(attemptReceipt);
    if (!classification.retryable || attemptNumber === 2) break;
    await sleep(retryDelayMs);
  }

  const state = terminalState(attempts);
  const result = {
    source_id: sourceId,
    source_class: source.source_class,
    authority: source.authority,
    requested_url: source.requested_url,
    official_host: source.official_host,
    county: source.county ?? null,
    expected_use: source.expected_use,
    attempts: attempts.length,
    attempt_receipts: attempts.map((attempt) => toPosix(path.join(
      sourceId,
      `attempt-${attempt.attempt}`,
      'attempt.json'
    ))),
    terminal_state: state,
    exact_response_preserved: attempts.at(-1)?.exact_response_preserved ?? false,
    final_url: attempts.at(-1)?.final_url ?? null,
    http_status: attempts.at(-1)?.http_status ?? null,
    content_type: attempts.at(-1)?.content_type ?? null,
    body_path: attempts.at(-1)?.body_path
      ? toPosix(path.join(sourceId, attempts.at(-1).body_path))
      : null,
    body_bytes: attempts.at(-1)?.body_bytes ?? 0,
    body_sha256: attempts.at(-1)?.body_sha256 ?? null,
    semantic_classification_complete: false,
    eligible_for_case_level_implementation_join: false,
    implementation_observed: false,
    separate_public_compliance_receipt_observed: false,
    complete_restoration_observed: false,
    remedy_timeliness_observed: false
  };
  writeJson(path.join(sourceDirectory, 'source-result.json'), result);
  return result;
}

export async function acquireFrozenSources({
  ledgerPath = DEFAULT_LEDGER,
  outputRoot = DEFAULT_OUT,
  timeoutMs = 60_000,
  retryDelayMs = 1_000,
  enforceFrozenCount = true,
  allowHttp = false,
  requestHeaders = REQUEST_HEADERS
} = {}) {
  const ledgerBytes = fs.readFileSync(ledgerPath);
  const ledger = JSON.parse(ledgerBytes.toString('utf8'));
  const errors = validateSourceLedger(ledger, { enforceFrozenCount, allowHttp });
  if (errors.length) throw new Error(`invalid A07 source ledger:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) {
    throw new Error(`invalid timeout: ${timeoutMs}`);
  }
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 30_000) {
    throw new Error(`invalid retry delay: ${retryDelayMs}`);
  }
  fs.rmSync(outputRoot, { recursive: true, force: true });
  ensureDir(outputRoot);

  const sources = ledger.sources.filter((source) => source.requested_url);
  const results = [];
  for (const source of sources) {
    results.push(await acquireSource(source, outputRoot, {
      timeoutMs,
      retryDelayMs,
      requestHeaders
    }));
  }

  const terminalStates = {};
  for (const result of results) {
    terminalStates[result.terminal_state] = (terminalStates[result.terminal_state] ?? 0) + 1;
  }
  const exactResponses = results.filter((result) => result.exact_response_preserved).length;
  const exactSuccessfulBodies = results.filter((result) =>
    result.terminal_state === 'exact_response_preserved_pending_semantic_classification'
  ).length;
  const summary = {
    schema_version: 'ssc-rd04-a07-official-source-acquisition@1',
    execution_id: 'SSC-RD04-SNAP-A07',
    issue: 741,
    as_of: ledger.as_of,
    source_ledger: {
      path: toPosix(path.relative(DEFAULT_ROOT, ledgerPath)),
      exact_bytes: ledgerBytes.length,
      sha256: sha256(ledgerBytes)
    },
    request_contract: {
      method: 'GET',
      ordered_headers: requestHeaders,
      accept_encoding: 'identity',
      redirect_limit: MAX_REDIRECTS,
      retry_limit: 2,
      timeout_ms: timeoutMs,
      query_expansion_after_result_inspection: false
    },
    counts: {
      frozen_sources: results.length,
      terminal_sources: results.length,
      exact_responses_preserved: exactResponses,
      exact_successful_bodies: exactSuccessfulBodies,
      terminal_states: terminalStates,
      semantic_classifications_complete: 0,
      case_level_implementation_joins: 0,
      complete_restorations_observed: 0,
      remedy_timeliness_observed: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    sources: results,
    authority: {
      policy_proves_case_compliance: false,
      aggregate_proves_case_compliance: false,
      exact_response_proves_case_compliance: false,
      exact_response_proves_implementation: false,
      exact_response_proves_restoration: false,
      source_unavailable_proves_noncompliance: false,
      case_level_follow_up_authorized: false,
      prevalence_supported: false,
      racial_order_supported: false,
      coordination_supported: false,
      common_purpose_supported: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
  writeJson(path.join(outputRoot, 'source-acquisition-ledger.json'), summary);
  return summary;
}

export function validateAcquisitionResult(outputRoot = DEFAULT_OUT, {
  expectedSources = 9
} = {}) {
  const errors = [];
  const file = path.join(outputRoot, 'source-acquisition-ledger.json');
  if (!fs.existsSync(file)) return [`acquisition ledger missing: ${file}`];
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return [`acquisition ledger parse failure: ${error.message}`];
  }
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };
  eq(ledger.schema_version, 'ssc-rd04-a07-official-source-acquisition@1', 'result schema');
  eq(ledger.execution_id, 'SSC-RD04-SNAP-A07', 'result execution');
  eq(ledger.issue, 741, 'result issue');
  eq(ledger.counts?.frozen_sources, expectedSources, 'result source denominator');
  eq(ledger.counts?.terminal_sources, expectedSources, 'terminal source denominator');
  eq(ledger.counts?.semantic_classifications_complete, 0, 'semantic classification ceiling');
  eq(ledger.counts?.case_level_implementation_joins, 0, 'case-level join ceiling');
  eq(ledger.counts?.complete_restorations_observed, 0, 'restoration ceiling');
  eq(ledger.counts?.remedy_timeliness_observed, 0, 'timeliness ceiling');
  eq(ledger.counts?.external_contacts, 0, 'external-contact ceiling');
  eq(ledger.counts?.external_reviews, 0, 'external-review ceiling');
  check(Array.isArray(ledger.sources) && ledger.sources.length === expectedSources, 'result source rows');
  check(new Set((ledger.sources ?? []).map((source) => source.source_id)).size === expectedSources, 'result source identity uniqueness');
  for (const source of ledger.sources ?? []) {
    check(source.attempts >= 1 && source.attempts <= 2, `bounded attempts ${source.source_id}`);
    eq(source.semantic_classification_complete, false, `semantic ceiling ${source.source_id}`);
    eq(source.eligible_for_case_level_implementation_join, false, `join ceiling ${source.source_id}`);
    eq(source.implementation_observed, false, `implementation ceiling ${source.source_id}`);
    eq(source.separate_public_compliance_receipt_observed, false, `compliance ceiling ${source.source_id}`);
    eq(source.complete_restoration_observed, false, `restoration ceiling ${source.source_id}`);
    eq(source.remedy_timeliness_observed, false, `timeliness ceiling ${source.source_id}`);
    for (const receiptPath of source.attempt_receipts ?? []) {
      check(fs.existsSync(path.join(outputRoot, receiptPath)), `attempt receipt missing ${source.source_id}: ${receiptPath}`);
    }
    if (source.body_path) {
      const bodyFile = path.join(outputRoot, source.body_path);
      check(fs.existsSync(bodyFile), `body missing ${source.source_id}`);
      if (fs.existsSync(bodyFile)) {
        const bytes = fs.readFileSync(bodyFile);
        eq(bytes.length, source.body_bytes, `body bytes ${source.source_id}`);
        eq(sha256(bytes), source.body_sha256, `body hash ${source.source_id}`);
      }
    }
  }
  for (const key of [
    'policy_proves_case_compliance',
    'aggregate_proves_case_compliance',
    'exact_response_proves_case_compliance',
    'exact_response_proves_implementation',
    'exact_response_proves_restoration',
    'source_unavailable_proves_noncompliance',
    'case_level_follow_up_authorized',
    'prevalence_supported',
    'racial_order_supported',
    'coordination_supported',
    'common_purpose_supported'
  ]) eq(ledger.authority?.[key], false, `result authority ${key}`);
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(ledger.authority?.[key], 'none', `result effect ${key}`);
  }
  return errors;
}

function parseArgs(argv) {
  const command = argv[0] ?? 'help';
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === 'validate-ledger') {
    const ledgerPath = options.ledger ? path.resolve(options.ledger) : DEFAULT_LEDGER;
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const errors = validateSourceLedger(ledger, { enforceFrozenCount: true, allowHttp: false });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(JSON.stringify({
      sources: ledger.sources.filter((source) => source.requested_url).length,
      retry_limit: ledger.exact_search_receipt_contract.retry_limit,
      query_expansion_after_result_inspection: false
    }, null, 2));
    return;
  }
  if (command === 'acquire') {
    const summary = await acquireFrozenSources({
      ledgerPath: options.ledger ? path.resolve(options.ledger) : DEFAULT_LEDGER,
      outputRoot: options.out ? path.resolve(options.out) : DEFAULT_OUT,
      timeoutMs: options.timeout ? Number(options.timeout) : 60_000,
      retryDelayMs: options['retry-delay'] ? Number(options['retry-delay']) : 1_000,
      enforceFrozenCount: true,
      allowHttp: false
    });
    console.log(JSON.stringify(summary.counts, null, 2));
    return;
  }
  if (command === 'validate-result') {
    const outputRoot = options.out ? path.resolve(options.out) : DEFAULT_OUT;
    const errors = validateAcquisitionResult(outputRoot, { expectedSources: 9 });
    if (errors.length) throw new Error(errors.join('\n'));
    const result = JSON.parse(fs.readFileSync(path.join(outputRoot, 'source-acquisition-ledger.json'), 'utf8'));
    console.log(JSON.stringify(result.counts, null, 2));
    return;
  }
  console.error('usage:');
  console.error('  node tools/acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs validate-ledger [--ledger PATH]');
  console.error('  node tools/acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs acquire [--ledger PATH] [--out DIR] [--timeout MS] [--retry-delay MS]');
  console.error('  node tools/acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs validate-result [--out DIR]');
  process.exit(command === 'help' ? 0 : 1);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) {
  main().catch((error) => {
    console.error(`acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07: ${error.message}`);
    process.exit(1);
  });
}

export { validateSourceLedger };
