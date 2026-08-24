import crypto from 'node:crypto';

export const CONTRACT_SCHEMA = 'm05-answerable-power-s03-l7-intel-post-gate-route-watch-contract@1';
export const RECEIPT_SCHEMA = 'm05-answerable-power-s03-l7-intel-post-gate-route-watch-receipt@1';

export const TERMINAL_STATUSES = new Set([
  'content_retrieved',
  'metadata_only',
  'challenge_page',
  'gated_not_before',
  'http_failure',
  'transport_failure',
  'timeout',
  'body_limit_exceeded',
  'policy_refusal'
]);

const EXPECTEDDhONITOR_ROUTE_IDS = [
  'US-INTEL-REALIZATION-01',
  'US-INTEL-REALIZATION-02',
  'US-INTEL-REALIZATION-03',
  'US-INTEL-REALIZATION-04',
  'US-INTEL-REALIZATION-05'
];

const NON_FAILURE_STATUSES = new Set(['content_retrieved', 'metadata_only', 'gated_not_before']);
const ACTIVE_STATUSES = new Set([...TERMINAL_STATUSES].filter((status) => status !== 'gated_not_before'));
const POLICY_REFUSAL_REASONS = new Set([
  'non_https_target',
  'redirect_host_not_allowlisted',
  'embedded_credentials_refused',
  'redirect_without_location',
  'invalid_redirect_location',
  'https_downgrade_refused',
  'post_redirect_refused',
  'redirect_limit_exceeded'
]);

const CONTRACT_KEYS = [
  'schema_version',
  'object_class',
  'program_id',
  'sprint_id',
  'leg_id',
  'issue',
  'status',
  'canonical_base_at_authoring',
  'canonical_bindings',
  'denominator',
  'execution_policy',
  'time_gate',
  'authority_boundaries',
  'routes'
];
const BASE_KEYS = ['branch', 'commit', 'tree'];
const BINDING_KEYS = ['path', 'blob_sha'];
const DENOMINATOR_KEYS = ['routes', 'failed_routes_preserved', 'gated_routes_preserved', 'one_terminal_observation_per_route'];
const POLICY_KEYS = [
  'allowed_methods',
  'required_protocol',
  'global_concurrency',
  'per_host_concurrency',
  'minimum_host_interval_ms',
  'timeout_ms',
  'max_redirects',
  'max_body_bytes',
  'credentials',
  'cookies_sent',
  'authorization_sent',
  'cache_mode',
  'body_hash_domain',
  'body_retained_in_receipt',
  'user_agent',
  'host_interval_applies_to_each_http_request',
  'challenge_pages_count_as_substantive_content',
  'receipt_unknown_fields_allowed',
  'future_observation_clock_authorizes_execution',
  'retained_response_headers'
];
const TIME_GATE_KEYS = [
  'ordinary_gate_utc',
  'before_gate_route_state',
  'earlier_activation_requires_source_addressed_bilateral_agreement',
  'bilateral_exception_observed',
  'elapsed_time_is_transaction_evidence',
  'scheduled_clock_check_cron_utc'
];
const AUTHORITY_KEYS = [
  'network_observation_only',
  'metadata_counts_as_substantive_content',
  'route_reachability_is_evidentiary_sufficiency',
  'changed_bytes_are_claim_evidence',
  'access_controls_bypassed',
  'promotion_authority',
  'answer_changes_authorized',
  'effective_domain_answers',
  'qualifying_jurisdictions',
  'cross_domain_regression_completed',
  'graph_effect',
  'issue_345_may_close'
];
const ROUTE_KEYS = [
  'route_id',
  'monitor_route_id',
  'authority',
  'source_class',
  'method',
  'url',
  'allowed_hosts',
  'request_body',
  'request_body_sha256'
];
const RECEIPT_KEYS = [
  'schema_version',
  'object_class',
  'program_id',
  'sprint_id',
  'leg_id',
  'issue',
  'generated_at',
  'observation_clock_utc',
  'contract_semantic_sha256',
  'contract_authoring_base',
  'previous_receipt_proof_sha256',
  'body_hash_domain',
  'intel_gate',
  'summary',
  'observations',
  'authority_boundaries',
  'proof_sha256'
];
const INTEL_GATE_KEYS = [
  'ordinary_gate_utc',
  'standard_route_eligible',
  'bilateral_exception_observed',
  'elapsed_time_is_transaction_evidence'
];
const SUMMARY_KEYS = [
  'selected_routes',
  'terminal_observations',
  'executed_routes',
  'network_requests',
  'gated_not_before',
  'route_successes',
  'content_successes',
  'metadata_only',
  'challenge_pages',
  'failed_routes',
  'policy_refusals',
  'unclassified_failures',
  'changed_routes',
  'uncompared_routes',
  'failure_counts',
  'execution_complete',
  'denominator_preserved',
  'network_observation_only',
  'qualifying_evidence_receipts',
  'answer_changes_authorized',
  'effective_domain_answers',
  'qualifying_jurisdictions',
  'cross_domain_regression_completed',
  'graph_effect',
  'issue_345_may_close'
];
const OBSERVATION_KEYS = [
  'route_id',
  'monitor_route_id',
  'authority',
  'source_class',
  'request_method',
  'request_body_sha256',
  'requested_url',
  'final_url',
  'observed_at',
  'completed_at',
  'not_before_utc',
  'terminal',
  'status',
  'status_code',
  'reason',
  'route_success',
  'content_success',
  'metadata_only',
  'network_request_count',
  'redirect_chain',
  'response_headers',
  'body_bytes',
  'body_sha256',
  'changed_since_previous',
  'network_observation_only',
  'promotion_authority',
  'answer_effect',
  'graph_effect'
];
const REDIRECT_KEYS = ['from', 'status', 'location', 'to'];

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function fail(message) {
  throw new Error(message);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function normalizeHost(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/u, '');
}
function validSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
}
function validGitSha1(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value);
}
function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}
function validTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function parseUrl(value, label) {
  try {
    return new URL(value);
  } catch {
    fail(`${label} is not a valid URL`);
  }
}
function exactKeys(object, expected, label) {
  assert(isObject(object), `${label} must be an object`);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} keys drift: ${actual.join(', ')}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}
export function semanticSha256(value) {
  return sha256(Buffer.from(canonicalJson(value), 'utf8'));
}

function expectedAuthorityBoundaries() {
  return {
    network_observation_only: true,
    metadata_counts_as_substantive_content: false,
    route_reachability_is_evidentiary_sufficiency: false,
    changed_bytes_are_claim_evidence: false,
    access_controls_bypassed: false,
    promotion_authority: false,
    answer_changes_authorized: false,
    effective_domain_answers: 0,
    qualifying_jurisdictions: 0,
    cross_domain_regression_completed: false,
    graph_effect: 'none',
    issue_345_may_close: false
  };
}

function validateAuthorityBoundaries(boundaries) {
  exactKeys(boundaries, AUTHORITY_KEYS, 'authority_boundaries');
  const expected = expectedAuthorityBoundaries();
  for (const [key, value] of Object.entries(expected)) {
    assert(boundaries[key] === value, `authority boundary ${key} must remain ${JSON.stringify(value)}`);
  }
}

function validateExecutionPolicy(policy) {
  exactKeys(policy, POLICY_KEYS, 'execution_policy');
  assert(canonicalJson(policy.allowed_methods) === canonicalJson(['GET', 'POST']), 'allowed_methods must remain GET, POST');
  assert(policy.required_protocol === 'https:', 'only HTTPS is permitted');
  assert(Number.isInteger(policy.global_concurrency) && policy.global_concurrency >= 1 && policy.global_concurrency <= 5, 'global_concurrency must be between 1 and 5');
  assert(policy.per_host_concurrency === 1, 'per-host execution must remain serialized');
  assert(Number.isInteger(policy.minimum_host_interval_ms) && policy.minimum_host_interval_ms >= 250, 'minimum_host_interval_ms must be at least 250');
  assert(Number.isInteger(policy.timeout_ms) && policy.timeout_ms >= 1000 && policy.timeout_ms <= 60000, 'timeout_ms must be between 1000 and 60000');
  assert(Number.isInteger(policy.max_redirects) && policy.max_redirects >= 0 && policy.max_redirects <= 8, 'max_redirects must be between 0 and 8');
  assert(Number.isInteger(policy.max_body_bytes) && policy.max_body_bytes >= 1024 && policy.max_body_bytes <= 10 * 1024 * 1024, 'max_body_bytes must be between 1 KiB and 10 MiB');
  assert(policy.credentials === 'omit', 'credentials must be omitted');
  assert(policy.cookies_sent === false, 'cookies must not be sent');
  assert(policy.authorization_sent === false, 'authorization must not be sent');
  assert(policy.cache_mode === 'no-store', 'cache mode must remain no-store');
  assert(policy.body_hash_domain === 'http_representation_octets_after_content_decoding', 'body hash domain drift');
  assert(policy.body_retained_in_receipt === false, 'response bodies must not be retained');
  assert(policy.host_interval_applies_to_each_http_request === true, 'host interval must apply to every request and redirect hop');
  assert(policy.challenge_pages_count_as_substantive_content === false, 'challenge pages must not count as content');
  assert(policy.receipt_unknown_fields_allowed === false, 'receipt schemas must remain closed');
  assert(policy.future_observation_clock_authorizes_execution === false, 'future clocks must not authorize execution');
  const retainedHeaders = ['content-type', 'content-length', 'content-encoding', 'etag', 'last-modified', 'cache-control', 'date'];
  assert(canonicalJson(policy.retained_response_headers) === canonicalJson(retainedHeaders), 'retained response-header allowlist drift');
  assert(nonEmptyString(policy.user_agent) && policy.user_agent.includes('M05-Intel-Post-Gate-Route-Watch/'), 'bounded watcher user agent is required');
}

function validateRoute(route, routeIds, urls, monitorIds) {
  exactKeys(route, ROUTE_KEYS, `route ${route?.route_id || '<unknown>'}`);
  assert(nonEmptyString(route.route_id) && route.route_id.startsWith('M05-INTEL-POST-GATE-'), 'route_id prefix drift');
  assert(!routeIds.has(route.route_id), `duplicate route_id ${route.route_id}`);
  routeIds.add(route.route_id);
  assert(EXPECTEDDhONITOR_ROUTE_IDS.includes(route.monitor_route_id), `${route.route_id} has unknown monitor_route_id`);
  assert(!monitorIds.has(route.monitor_route_id), `duplicate monitor_route_id ${route.monitor_route_id}`);
  monitorIds.add(route.monitor_route_id);
  assert(nonEmptyString(route.authority), `${route.route_id} requires authority`);
  assert(nonEmptyString(route.source_class), `${route.route_id} requires source_class`);
  assert(['GET', 'POST'].includes(route.method), `${route.route_id} has unsupported method`);
  const parsed = parseUrl(route.url, `${route.route_id} URL`);
  assert(parsed.protocol === 'https:', `${route.route_id} must use HTTPS`);
  assert(!parsed.username && !parsed.password, `${route.route_id} must not embed credentials`);
  assert(!urls.has(route.url), `duplicate route URL ${route.url}`);
  urls.add(route.url);
  assert(Array.isArray(route.allowed_hosts) && route.allowed_hosts.length >= 1, `${route.route_id} requires allowed_hosts`);
  const hosts = route.allowed_hosts.map(normalizeHost);
  assert(hosts.every((host) => host && host === host.toLowerCase() && !host.includes('*') && !host.includes('/')), `${route.route_id} has an invalid allowed host`);
  assert(new Set(hosts).size === hosts.length, `${route.route_id} repeats an allowed host`);
  assert(hosts.includes(normalizeHost(parsed.hostname)), `${route.route_id} initial host is not allowlisted`);
  if (route.method === 'GET') {
    assert(route.request_body === null, `${route.route_id} GET body must be null`);
    assert(route.request_body_sha256 === null, `${route.route_id} GET body digest must be null`);
  } else {
    assert(isObject(route.request_body), `${route.route_id} POST body must be an object`);
    assert(validSha256(route.request_body_sha256), `${route.route_id} POST body digest is invalid`);
    assert(route.request_body_sha256 === semanticSha256(route.request_body), `${route.route_id} POST body digest mismatch`);
  }
}

export function validateContract(contract) {
  exactKeys(contract, CONTRACT_KEYS, 'contract');
  assert(contract.schema_version === CONTRACT_SCHEMA, `unexpected contract schema ${contract.schema_version}`);
  assert(contract.object_class === 'bounded_intel_post_gate_official_route_watch_contract', 'unexpected object_class');
  assert(contract.program_id === 'M-05' && contract.sprint_id === 'M05-SPRINT-03' && contract.leg_id === 'S03-L7', 'program identity drift');
  assert(contract.issue === 345, 'issue binding must remain 345');
  assert(contract.status === 'network_observation_only', 'contract status must remain network_observation_only');
  exactKeys(contract.canonical_base_at_authoring, BASE_KEYS, 'canonical_base_at_authoring');
  assert(contract.canonical_base_at_authoring.branch === 'main', 'authoring branch must remain main');
  assert(validGitSha1(contract.canonical_base_at_authoring.commit), 'authoring commit is invalid');
  assert(validGitSha1(contract.canonical_base_at_authoring.tree), 'authoring tree is invalid');
  assert(isObject(contract.canonical_bindings), 'canonical_bindings must be an object');
  const requiredBindings = [
    'intel_date_gate_monitor',
    'five_domain_contract',
    'five_domain_library',
    'five_domain_runner',
    'five_domain_validator',
    'five_domain_test',
    'five_domain_workflow'
  ];
  assert(canonicalJson(Object.keys(contract.canonical_bindings)) === canonicalJson(requiredBindings), 'canonical binding identities or order drift');
  for (const [name, binding] of Object.entries(contract.canonical_bindings)) {
    exactKeys(binding, BINDING_KEYS, `canonical binding ${name}`);
    assert(nonEmptyString(binding.path), `canonical binding ${name} path is required`);
    assert(validGitSha1(binding.blob_sha), `canonical binding ${name} blob SHA is invalid`);
  }
  exactKeys(contract.denominator, DENOMINATOR_KEYS, 'denominator');
  assert(contract.denominator.routes === 5, 'route denominator must remain five');
  assert(contract.denominator.failed_routes_preserved === true, 'failed routes must remain in the denominator');
  assert(contract.denominator.gated_routes_preserved === true, 'gated routes must remain in the denominator');
  assert(contract.denominator.one_terminal_observation_per_route === true, 'one terminal observation per route is required');
  validateExecutionPolicy(contract.execution_policy);
  exactKeys(contract.time_gate, TIME_GATE_KEYS, 'time_gate');
  assert(contract.time_gate.ordinary_gate_utc === '2026-08-27T00:00:00Z', 'ordinary gate drift');
  assert(contract.time_gate.before_gate_route_state === 'gated_not_before', 'pre-gate state drift');
  assert(contract.time_gate.earlier_activation_requires_source_addressed_bilateral_agreement === true, 'early activation boundary drift');
  assert(contract.time_gate.bilateral_exception_observed === false, 'contract invents a bilateral exception');
  assert(contract.time_gate.elapsed_time_is_transaction_evidence === false, 'elapsed time must not become transaction evidence');
  assert(contract.time_gate.scheduled_clock_check_cron_utc === '17 12 * * *', 'scheduled clock-check drift');
  validateAuthorityBoundaries(contract.authority_boundaries);
  assert(Array.isArray(contract.routes) && contract.routes.length === 5, 'contract must contain five routes');
  const routeIds = new Set();
  const urls = new Set();
  const monitorIds = new Set();
  for (const route of contract.routes) validateRoute(route, routeIds, urls, monitorIds);
  assert(canonicalJson(contract.routes.map((route) => route.monitor_route_id)) === canonicalJson(EXPECTEDDhONITOR_ROUTE_IDS), 'monitor route identity or order drift');
  assert(contract.routes.filter((route) => route.method === 'POST').length === 1, 'exactly one POST route is required');
  assert(contract.routes.at(-1).monitor_route_id === 'US-INTEL-REALIZATION-05' && contract.routes.at(-1).method === 'POST', 'USAspending must remain the sole POST route');
  return contract;
}

export function routeActivation(contract, observedAtMs) {
  validateContract(contract);
  const clock = Number(observedAtMs);
  assert(Number.isFinite(clock), 'observedAtMs must be a finite number');
  const gate = Date.parse(contract.time_gate.ordinary_gate_utc);
  assert(Number.isFinite(gate), 'ordinary gate must parse as a timestamp');
  return clock < gate
    ? { state: 'gated_not_before', not_before_utc: contract.time_gate.ordinary_gate_utc }
    : { state: 'active', not_before_utc: null };
}

function routeBase(route) {
  return {
    route_id: route.route_id,
    monitor_route_id: route.monitor_route_id,
    authority: route.authority,
    source_class: route.source_class,
    request_method: route.method,
    request_body_sha256: route.request_body_sha256,
    requested_url: route.url
  };
}

function createObservation(route, observedAt, status, reason, extra = {}) {
  return {
    ...routeBase(route),
    final_url: route.url,
    observed_at: observedAt,
    completed_at: null,
    not_before_utc: null,
    terminal: true,
    status,
    status_code: null,
    reason,
    route_success: false,
    content_success: false,
    metadata_only: false,
    network_request_count: 0,
    redirect_chain: [],
    response_headers: {},
    body_bytes: 0,
    body_sha256: null,
    changed_since_previous: null,
    network_observation_only: true,
    promotion_authority: false,
    answer_effect: 'none',
    graph_effect: 'none',
    ...extra
  };
}

function hostAllowed(route, url) {
  return route.allowed_hosts.map(normalizeHost).includes(normalizeHost(url.hostname));
}

function selectedHeaders(headers, names) {
  const result = {};
  for (const name of names) {
    const value = headers?.get?.(name);
    if (value !== null && value !== undefined) result[name] = value;
  }
  return result;
}

async function readBounded(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      try {
        await response.body.cancel();
      } catch {}
      const error = new Error(`response exceeded ${maxBytes} bytes`);
      error.code = 'BODY_LIMIT_EXCEEDED';
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function isChallengePage(body, headers) {
  const contentType = String(headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return false;
  const text = body.subarray(0, 131072).toString('utf8').toLowerCase();
  return (
    (text.includes('just a moment') && (text.includes('cf-chl-') || text.includes('/cdn-cgi/challenge-platform/'))) ||
    (text.includes('attention required') && text.includes('cloudflare ray id')) ||
    (text.includes('enable javascript and cookies to continue') && text.includes('cloudflare')) ||
    (text.includes('request unsuccessful') && text.includes('incapsula incident id')) ||
    (text.includes('access denied') && text.includes('reference #') && text.includes('akamai'))
  );
}

export function classifyTransportError(error) {
  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  const message = String(error?.message || error || '').toLowerCase();
  if (code === 'BODY_LIMIT_EXCEEDED') return 'body_limit_exceeded';
  if (error?.name === 'AbortError' || message.includes('timeout') || message.includes('aborted')) return 'timeout';
  return 'transport_failure';
}

function requestPayload(route) {
  if (route.method === 'GET') return { body: undefined, headers: {} };
  return {
    body: canonicalJson(route.request_body),
    headers: { 'content-type': 'application/json' }
  };
}

export async function fetchOfficialRoute(route, contract, { fetchImpl = globalThis.fetch, clock = Date.now, beforeRequest = async () => {} } = {}) {
  assert(typeof fetchImpl === 'function', 'fetch implementation is required');
  assert(typeof beforeRequest === 'function', 'beforeRequest hook is required');
  const policy = contract.execution_policy;
  const startedAt = new Date(clock()).toISOString();
  const terminal = (status, reason, extra = {}) => createObservation(route, startedAt, status, reason, {
    completed_at: new Date(clock()).toISOString(),
    ...extra
  });
  let current = new URL(route.url);
  let requestCount = 0;
  const redirectChain = [];
  for (let redirectIndex = 0; redirectIndex <= policy.max_redirects; redirectIndex += 1) {
    if (current.protocol !== policy.required_protocol) {
      return terminal('policy_refusal', 'non_https_target', { final_url: current.toString(), network_request_count: requestCount, redirect_chain: redirectChain });
    }
    if (!hostAllowed(route, current)) {
      return terminal('policy_refusal', 'redirect_host_not_allowlisted', { final_url: current.toString(), network_request_count: requestCount, redirect_chain: redirectChain });
    }
    if (current.username || current.password) {
      return terminal('policy_refusal', 'embedded_credentials_refused', { final_url: current.toString(), network_request_count: requestCount, redirect_chain: redirectChain });
    }
    await beforeRequest(normalizeHost(current.hostname), policy.minimum_host_interval_ms);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`timeout after ${policy.timeout_ms}ms`)), policy.timeout_ms);
    let response;
    const payload = requestPayload(route);
    try {
      requestCount += 1;
      response = await fetchImpl(current.toString(), {
        method: route.method,
        redirect: 'manual',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        body: payload.body,
        headers: {
          'user-agent': policy.user_agent,
          accept: 'text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/json,application/xml,text/xml,text/plain,application/pdf,application/octet-stream,*/*;q=0.1',
          ...payload.headers
        }
      });
    } catch (error) {
      clearTimeout(timer);
      const status = classifyTransportError(error);
      return terminal(status, String(error?.message || error), {
        final_url: current.toString(),
        network_request_count: requestCount,
        redirect_chain: redirectChain
      });
    }
    const headers = selectedHeaders(response.headers, policy.retained_response_headers);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      try {
        await response.body?.cancel();
      } catch {}
      clearTimeout(timer);
      if (!location) {
        return terminal('policy_refusal', 'redirect_without_location', {
          status_code: response.status,
          final_url: current.toString(),
          network_request_count: requestCount,
          redirect_chain: redirectChain,
          response_headers: headers
        });
      }
      let next;
      try {
        next = new URL(location, current);
      } catch {
        return terminal('policy_refusal', 'invalid_redirect_location', {
          status_code: response.status,
          final_url: current.toString(),
          network_request_count: requestCount,
          redirect_chain: redirectChain,
          response_headers: headers
        });
      }
      redirectChain.push({ from: current.toString(), status: response.status, location, to: next.toString() });
      if (route.method === 'POST') {
        return terminal('policy_refusal', 'post_redirect_refused', {
          status_code: response.status,
          final_url: next.toString(),
          network_request_count: requestCount,
          redirect_chain: redirectChain,
          response_headers: headers
        });
      }
      if (next.protocol !== 'https:') {
        return terminal('policy_refusal', 'https_downgrade_refused', {
          status_code: response.status,
          final_url: next.toString(),
          network_request_count: requestCount,
          redirect_chain: redirectChain,
          response_headers: headers
        });
      }
      if (!hostAllowed(route, next)) {
        return terminal('policy_refusal', 'redirect_host_not_allowlisted', {
          status_code: response.status,
          final_url: next.toString(),
          network_request_count: requestCount,
          redirect_chain: redirectChain,
          response_headers: headers
        });
      }
      current = next;
      continue;
    }
    let body;
    try {
      body = await readBounded(response, policy.max_body_bytes);
    } catch (error) {
      clearTimeout(timer);
      const status = classifyTransportError(error);
      return terminal(status, String(error?.message || error), {
        status_code: response.status,
        final_url: current.toString(),
        network_request_count: requestCount,
        redirect_chain: redirectChain,
        response_headers: headers
      });
    } finally {
      clearTimeout(timer);
    }
    const completedAt = new Date(clock()).toISOString();
    const challengePage = body.length > 0 && isChallengePage(body, headers);
    const metadataOnly = response.ok && !challengePage && body.length === 0;
    const status = challengePage ? 'challenge_page' : response.ok ? (metadataOnly ? 'metadata_only' : 'content_retrieved') : 'http_failure';
    return {
      ...routeBase(route),
      final_url: current.toString(),
      observed_at: startedAt,
      completed_at: completedAt,
      not_before_utc: null,
      terminal: true,
      status,
      status_code: response.status,
      reason: challengePage ? 'challenge_page_detected' : response.ok ? null : `HTTP ${response.status}`,
      route_success: Boolean(response.ok && !challengePage),
      content_success: Boolean(response.ok && !challengePage && body.length > 0),
      metadata_only: metadataOnly,
      network_request_count: requestCount,
      redirect_chain: redirectChain,
      response_headers: headers,
      body_bytes: body.length,
      body_sha256: body.length ? sha256(body) : null,
      changed_since_previous: null,
      network_observation_only: true,
      promotion_authority: false,
      answer_effect: 'none',
      graph_effect: 'none'
    };
  }
  return terminal('policy_refusal', 'redirect_limit_exceeded', {
    final_url: current.toString(),
    network_request_count: requestCount,
    redirect_chain: redirectChain
  });
}

export class HostGate {
  constructor({ sleepImpl = sleep, clock = Date.now } = {}) {
    this.sleepImpl = sleepImpl;
    this.clock = clock;
    this.chains = new Map();
    this.lastRequestStart = new Map();
  }
  async run(host, operation) {
    const key = normalizeHost(host);
    const prior = this.chains.get(key) || Promise.resolve();
    let release;
    const turn = new Promise((resolve) => { release = resolve; });
    const chain = prior.then(() => turn);
    this.chains.set(key, chain);
    await prior;
    try {
      return await operation();
    } finally {
      release();
      if (this.chains.get(key) === chain) this.chains.delete(key);
    }
  }
  async waitForRequest(host, minimumIntervalMs) {
    const key = normalizeHost(host);
    const previous = this.lastRequestStart.get(key);
    const now = this.clock();
    const wait = previous === undefined ? 0 : Math.max(0, minimumIntervalMs - (now - previous));
    if (wait) await this.sleepImpl(wait);
    const started = this.clock();
    this.lastRequestStart.set(key, started);
    return started;
  }
  async runMany(hosts, operation) {
    const ordered = [...new Set(hosts.map(normalizeHost))].sort();
    assert(ordered.length > 0, 'at least one host lock is required');
    const acquire = (index) => index === ordered.length ? operation() : this.run(ordered[index], () => acquire(index + 1));
    return acquire(0);
  }
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function comparableObservation(row) {
  return {
    request_method: row.request_method,
    request_body_sha256: row.request_body_sha256,
    status: row.status,
    status_code: row.status_code,
    final_url: row.final_url,
    body_sha256: row.body_sha256,
    body_bytes: row.body_bytes
  };
}

export function compareWithPrevious(observations, previousReceipt) {
  if (!previousReceipt) return observations.map((row) => ({ ...row, changed_since_previous: null }));
  const prior = new Map(previousReceipt.observations.map((row) => [row.route_id, row]));
  return observations.map((row) => {
    const previous = prior.get(row.route_id);
    return {
      ...row,
      changed_since_previous: previous
        ? canonicalJson(comparableObservation(previous)) !== canonicalJson(comparableObservation(row))
        : null
    };
  });
}

function summarizeObservations(observations, contract) {
  const counts = (status) => observations.filter((row) => row.status === status).length;
  const failureCounts = {};
  for (const row of observations) {
    if (NON_FAILURE_STATUSES.has(row.status)) continue;
    failureCounts[row.status] = (failureCounts[row.status] || 0) + 1;
  }
  return {
    selected_routes: contract.denominator.routes,
    terminal_observations: observations.filter((row) => row.terminal).length,
    executed_routes: observations.filter((row) => row.network_request_count > 0).length,
    network_requests: observations.reduce((sum, row) => sum + row.network_request_count, 0),
    gated_not_before: counts('gated_not_before'),
    route_successes: observations.filter((row) => row.route_success).length,
    content_successes: observations.filter((row) => row.content_success).length,
    metadata_only: counts('metadata_only'),
    challenge_pages: counts('challenge_page'),
    failed_routes: observations.filter((row) => !row.route_success && row.status !== 'gated_not_before').length,
    policy_refusals: counts('policy_refusal'),
    unclassified_failures: observations.filter((row) => !TERMINAL_STATUSES.has(row.status)).length,
    changed_routes: observations.filter((row) => row.changed_since_previous === true).length,
    uncompared_routes: observations.filter((row) => row.changed_since_previous === null).length,
    failure_counts: failureCounts,
    execution_complete: observations.length === contract.denominator.routes && observations.every((row) => row.terminal === true),
    denominator_preserved: observations.length === contract.denominator.routes,
    network_observation_only: true,
    qualifying_evidence_receipts: 0,
    answer_changes_authorized: false,
    effective_domain_answers: 0,
    qualifying_jurisdictions: 0,
    cross_domain_regression_completed: false,
    graph_effect: 'none',
    issue_345_may_close: false
  };
}

export async function runIntelRouteWatch(contract, { fetchImpl = globalThis.fetch, observedAtMs = Date.now(), previousReceipt = null, sleepImpl = sleep, clock = Date.now } = {}) {
  validateContract(contract);
  const actualClockMs = Number(clock());
  assert(Number.isFinite(actualClockMs), 'execution clock must be finite');
  assert(Number.isFinite(Number(observedAtMs)), 'observation clock must be finite');
  assert(Number(observedAtMs) <= actualClockMs, 'observation clock cannot be in the future');
  let receiptClockMs = actualClockMs;
  const receiptClock = () => {
    const next = Number(clock());
    assert(Number.isFinite(next), 'execution clock must be finite');
    receiptClockMs = Math.max(receiptClockMs, next);
    return receiptClockMs;
  };
  if (previousReceipt) validateReceipt(previousReceipt, contract);
  const observedAt = new Date(observedAtMs).toISOString();
  const activation = routeActivation(contract, observedAtMs);
  const gate = new HostGate({ sleepImpl, clock });
  const observations = await mapLimit(contract.routes, contract.execution_policy.global_concurrency, async (route) => {
    if (activation.state === 'gated_not_before') {
      return createObservation(route, observedAt, 'gated_not_before', 'ordinary Intel acquisition gate has not opened', {
        not_before_utc: activation.not_before_utc
      });
    }
    return gate.runMany(route.allowed_hosts, () => fetchOfficialRoute(route, contract, {
      fetchImpl,
      clock: receiptClock,
      beforeRequest: (host, interval) => gate.waitForRequest(host, interval)
    }));
  });
  const compared = compareWithPrevious(observations, previousReceipt);
  const summary = summarizeObservations(compared, contract);
  assert(summary.execution_complete, 'route watch did not produce one terminal row per route');
  assert(summary.unclassified_failures === 0, 'route watch produced an unclassified terminal state');
  const receiptCore = {
    schema_version: RECEIPT_SCHEMA,
    object_class: 'bounded_intel_post_gate_official_route_watch_receipt',
    program_id: 'M-05',
    sprint_id: 'M05-SPRINT-03',
    leg_id: 'S03-L7',
    issue: 345,
    generated_at: new Date(receiptClock()).toISOString(),
    observation_clock_utc: observedAt,
    contract_semantic_sha256: semanticSha256(contract),
    contract_authoring_base: contract.canonical_base_at_authoring,
    previous_receipt_proof_sha256: previousReceipt?.proof_sha256 || null,
    body_hash_domain: contract.execution_policy.body_hash_domain,
    intel_gate: {
      ordinary_gate_utc: contract.time_gate.ordinary_gate_utc,
      standard_route_eligible: observedAtMs >= Date.parse(contract.time_gate.ordinary_gate_utc),
      bilateral_exception_observed: false,
      elapsed_time_is_transaction_evidence: false
    },
    summary,
    observations: compared,
    authority_boundaries: contract.authority_boundaries
  };
  return { ...receiptCore, proof_sha256: sha256(Buffer.from(canonicalJson(receiptCore), 'utf8')) };
}

function validateResponseHeaders(headers, policy, label) {
  assert(isObject(headers), `${label} response_headers must be an object`);
  const allowed = new Set(policy.retained_response_headers);
  for (const [name, value] of Object.entries(headers)) {
    assert(allowed.has(name), `${label} retains undeclared response header ${name}`);
    assert(typeof value === 'string', `${label} response header ${name} must be a string`);
    assert(!value.includes('\n') && !value.includes('\r'), `${label} response header ${name} contains a line break`);
  }
}

function validateRedirectChain(row, route, label) {
  assert(Array.isArray(row.redirect_chain), `${label} redirect_chain must be an array`);
  assert(row.redirect_chain.length <= 1 + 8, `${label} redirect chain is unbounded`);
  let expectedFrom = route.url;
  for (let index = 0; index < row.redirect_chain.length; index += 1) {
    const redirect = row.redirect_chain[index];
    exactKeys(redirect, REDIRECT_KEYS, `${label} redirect ${index}`);
    assert(redirect.from === expectedFrom, `${label} redirect ${index} from-address drift`);
    assert(Number.isInteger(redirect.status) && redirect.status >= 300 && redirect.status < 400, `${label} redirect ${index} status is invalid`);
    assert(nonEmptyString(redirect.location), `${label} redirect ${index} location is required`);
    const resolved = new URL(redirect.location, redirect.from).toString();
    assert(resolved === redirect.to, `${label} redirect ${index} resolution mismatch`);
    expectedFrom = redirect.to;
  }
  assert(row.final_url === expectedFrom, `${label} final_url does not match redirect chain`);
  assert(row.network_request_count >= row.redirect_chain.length, `${label} request count is smaller than redirect chain`);
  assert(row.network_request_count <= row.redirect_chain.length + 1, `${label} request count is impossible`);
}

function validateObservation(row, route, receipt, contract, index) {
  const label = `observation ${index} (${route.route_id})`;
  exactKeys(row, OBSERVATION_KEYS, label);
  assert(row.route_id === route.route_id, `${label} route_id drift`);
  assert(row.monitor_route_id === route.monitor_route_id, `${label} monitor_route_id drift`);
  assert(row.authority === route.authority, `${label} authority drift`);
  assert(row.source_class === route.source_class, `${label} source_class drift`);
  assert(row.request_method === route.method, `${label} request method drift`);
  assert(row.request_body_sha256 === route.request_body_sha256, `${label} request body digest drift`);
  assert(row.requested_url === route.url, `${label} requested_url drift`);
  assert(validTimestamp(row.observed_at), `${label} observed_at is invalid`);
  assert(Date.parse(row.observed_at) >= Date.parse(receipt.observation_clock_utc), `${label} begins before the receipt clock`);
  assert(Date.parse(row.observed_at) <= Date.parse(receipt.generated_at), `${label} begins after receipt generation`);
  assert(row.terminal === true, `${label} must be terminal`);
  assert(TERMINAL_STATUSES.has(row.status), `${label} has an unknown status`);
  assert(Number.isInteger(row.network_request_count) && row.network_request_count >= 0, `${label} request count is invalid`);
  assert(typeof row.route_success === 'boolean', `${label} route_success must be boolean`);
  assert(typeof row.content_success === 'boolean', `${label} content_success must be boolean`);
  assert(typeof row.metadata_only === 'boolean', `${label} metadata_only must be boolean`);
  assert(row.changed_since_previous === null || typeof row.changed_since_previous === 'boolean', `${label} comparison flag must be boolean or null`);
  assert(row.network_observation_only === true, `${label} must remain network-observation-only`);
  assert(row.promotion_authority === false, `${label} must not grant promotion authority`);
  assert(row.answer_effect === 'none', `${label} must not create an answer effect`);
  assert(row.graph_effect === 'none', `${label} must not create a graph effect`);
  assert(Number.isInteger(row.body_bytes) && row.body_bytes >= 0 && row.body_bytes <= contract.execution_policy.max_body_bytes, `${label} body length is invalid`);
  assert(row.body_sha256 === null || validSha256(row.body_sha256), `${label} body digest is invalid`);
  assert(row.status_code === null || (Number.isInteger(row.status_code) && row.status_code >= 100 && row.status_code <= 599), `${label} status code is invalid`);
  validateResponseHeaders(row.response_headers, contract.execution_policy, label);
  validateRedirectChain(row, route, label);

  const gateMs = Date.parse(contract.time_gate.ordinary_gate_utc);
  const receiptEligible = Date.parse(receipt.observation_clock_utc) >= gateMs;
  if (row.status === 'gated_not_before') {
    assert(!receiptEligible, `${label} remains gated at or after the ordinary gate`);
    assert(row.completed_at === null, `${label} gated row must not contain completion`);
    assert(row.not_before_utc === contract.time_gate.ordinary_gate_utc, `${label} not-before timestamp drift`);
    assert(row.network_request_count === 0 && row.redirect_chain.length === 0, `${label} gated row executed a request`);
    assert(row.final_url === route.url, `${label} gated row final URL drift`);
    assert(row.status_code === null, `${label} gated row has a status code`);
    assert(row.reason === 'ordinary Intel acquisition gate has not opened', `${label} gated reason drift`);
    assert(row.route_success === false && row.content_success === false && row.metadata_only === false, `${label} gated flags drift`);
    assert(Object.keys(row.response_headers).length === 0, `${label} gated row retains headers`);
    assert(row.body_bytes === 0 && row.body_sha256 === null, `${label} gated row retains body state`);
    return;
  }

  assert(receiptEligible, `${label} executed before the ordinary gate`);
  assert(ACTIVE_STATUSES.has(row.status), `${label} active status drift`);
  assert(validTimestamp(row.completed_at), `${label} active row requires completed_at`);
  assert(row.not_before_utc === null, `${label} active row must not retain not_before_utc`);
  assert(Date.parse(row.completed_at) >= Date.parse(row.observed_at), `${label} completes before it begins`);
  assert(Date.parse(row.completed_at) <= Date.parse(receipt.generated_at), `${label} completes after receipt generation`);
  assert(row.network_request_count >= 1, `${label} active row must execute a request`);

  const final = parseUrl(row.final_url, `${label} final_url`);
  const finalAllowed = final.protocol === 'https:' && !final.username && !final.password && hostAllowed(route, final);
  if (row.status !== 'policy_refusal') assert(finalAllowed, `${label} final URL escapes the route allowlist`);

  if (row.status === 'content_retrieved') {
    assert(row.status_code >= 200 && row.status_code < 300, `${label} content status code drift`);
    assert(row.route_success === true && row.content_success === true && row.metadata_only === false, `${label} content flags drift`);
    assert(row.body_bytes > 0 && validSha256(row.body_sha256), `${label} content body state drift`);
    assert(row.reason === null, `${label} successful content reason must be null`);
  } else if (row.status === 'metadata_only') {
    assert(row.status_code >= 200 && row.status_code < 300, `${label} metadata status code drift`);
    assert(row.route_success === true && row.content_success === false && row.metadata_only === true, `${label} metadata flags drift`);
    assert(row.body_bytes === 0 && row.body_sha256 === null, `${label} metadata body state drift`);
    assert(row.reason === null, `${label} metadata reason must be null`);
  } else if (row.status === 'challenge_page') {
    assert(row.status_code !== null, `${label} challenge page requires a status code`);
    assert(row.route_success === false && row.content_success === false && row.metadata_only === false, `${label} challenge flags drift`);
    assert(row.body_bytes > 0 && validSha256(row.body_sha256), `${label} challenge body state drift`);
    assert(row.reason === 'challenge_page_detected', `${label} challenge reason drift`);
  } else if (row.status === 'http_failure') {
    assert(row.status_code !== null && !(row.status_code >= 200 && row.status_code < 400), `${label} HTTP failure status drift`);
    assert(row.route_success === false && row.content_success === false && row.metadata_only === false, `${label} HTTP failure flags drift`);
    assert(row.reason === `HTTP ${row.status_code}`, `${label} HTTP failure reason drift`);
    assert(row.body_bytes === 0 ? row.body_sha256 === null : validSha256(row.body_sha256), `${label} HTTP failure body state drift`);
  } else if (['transport_failure', 'timeout'].includes(row.status)) {
    assert(row.status_code === null, `${label} transport failure must not have status code`);
    assert(row.body_bytes === 0 && row.body_sha256 === null, `${label} transport failure retains body state`);
    assert(row.route_success === false && row.content_success === false && row.metadata_only === false, `${label} transport failure flags drift`);
    assert(nonEmptyString(row.reason), `${label} transport failure requires a reason`);
  } else if (row.status === 'body_limit_exceeded') {
    assert(row.status_code !== null, `${label} body-limit failure requires status code`);
    assert(row.body_bytes === 0 && row.body_sha256 === null, `${label} body-limit failure retains body state`);
    assert(row.route_success === false && row.content_success === false && row.metadata_only === false, `${label} body-limit flags drift`);
    assert(nonEmptyString(row.reason), `${label} body-limit failure requires reason`);
  } else if (row.status === 'policy_refusal') {
    assert(POLICY_REFUSAL_REASONS.has(row.reason), `${label} policy-refusal reason drift`);
    assert(row.body_bytes === 0 && row.body_sha256 === null, `${label} policy refusal retains body state`);
    assert(row.route_success === false && row.content_success === false && row.metadata_only === false, `${label} policy-refusal flags drift`);
    if (row.reason === 'post_redirect_refused') assert(route.method === 'POST', `${label} post-redirect refusal on non-POST route`);
  }
}

function expectedSummary(receipt, contract) {
  return summarizeObservations(receipt.observations, contract);
}

export function validateReceipt(receipt, contract) {
  validateContract(contract);
  exactKeys(receipt, RECEIPT_KEYS, 'receipt');
  assert(receipt.schema_version === RECEIPT_SCHEMA, `unexpected receipt schema ${receipt.schema_version}`);
  assert(receipt.object_class === 'bounded_intel_post_gate_official_route_watch_receipt', 'unexpected receipt object_class');
  assert(receipt.program_id === 'M-05' && receipt.sprint_id === 'M05-SPRINT-03' && receipt.leg_id === 'S03-L7', 'receipt program identity drift');
  assert(receipt.issue === 345, 'receipt issue binding drift');
  assert(validTimestamp(receipt.generated_at), 'receipt generated_at is invalid');
  assert(validTimestamp(receipt.observation_clock_utc), 'receipt observation clock is invalid');
  assert(Date.parse(receipt.observation_clock_utc) <= Date.parse(receipt.generated_at), 'receipt generated before its observation clock');
  assert(receipt.contract_semantic_sha256 === semanticSha256(contract), 'receipt contract semantic digest mismatch');
  assert(canonicalJson(receipt.contract_authoring_base) === canonicalJson(contract.canonical_base_at_authoring), 'receipt contract-authoring base drift');
  assert(receipt.previous_receipt_proof_sha256 === null || validSha256(receipt.previous_receipt_proof_sha256), 'previous receipt proof is invalid');
  assert(receipt.body_hash_domain === contract.execution_policy.body_hash_domain, 'receipt body-hash domain drift');
  exactKeys(receipt.intel_gate, INTEL_GATE_KEYS, 'receipt intel_gate');
  assert(receipt.intel_gate.ordinary_gate_utc === contract.time_gate.ordinary_gate_utc, 'receipt ordinary gate drift');
  const eligible = Date.parse(receipt.observation_clock_utc) >= Date.parse(contract.time_gate.ordinary_gate_utc);
  assert(receipt.intel_gate.standard_route_eligible === eligible, 'receipt gate eligibility mismatch');
  assert(receipt.intel_gate.bilateral_exception_observed === false, 'receipt invents a bilateral exception');
  assert(receipt.intel_gate.elapsed_time_is_transaction_evidence === false, 'receipt treats elapsed time as transaction evidence');
  exactKeys(receipt.summary, SUMMARY_KEYS, 'receipt summary');
  assert(Array.isArray(receipt.observations) && receipt.observations.length === 5, 'receipt must contain five observations');
  for (let index = 0; index < contract.routes.length; index += 1) {
    validateObservation(receipt.observations[index], contract.routes[index], receipt, contract, index);
  }
  const actualSummary = expectedSummary(receipt, contract);
  assert(canonicalJson(receipt.summary) === canonicalJson(actualSummary), 'receipt summary does not recompute');
  if (eligible) {
    assert(receipt.summary.gated_not_before === 0, 'post-gate receipt retains gated routes');
    assert(receipt.summary.executed_routes === 5, 'post-gate receipt did not execute all five routes');
  } else {
    assert(receipt.summary.gated_not_before === 5, 'pre-gate receipt did not preserve all five gated rows');
    assert(receipt.summary.executed_routes === 0 && receipt.summary.network_requests === 0, 'pre-gate receipt executed network requests');
  }
  validateAuthorityBoundaries(receipt.authority_boundaries);
  assert(validSha256(receipt.proof_sha256), 'receipt proof is invalid');
  const { proof_sha256: proof, ...core } = receipt;
  assert(proof === sha256(Buffer.from(canonicalJson(core), 'utf8')), 'receipt proof does not recompute');
  return receipt;
}
