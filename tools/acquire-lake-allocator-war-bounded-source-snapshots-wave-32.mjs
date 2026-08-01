#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function responseHeaders(response) {
  const selected = {};
  for (const name of ['cache-control', 'content-length', 'content-type', 'date', 'etag', 'last-modified', 'x-request-id', 'x-amzn-requestid']) {
    const value = response.headers.get(name);
    if (value !== null) selected[name] = value;
  }
  return selected;
}

function summarizeJson(value) {
  const summary = {
    root_type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
    root_keys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : []
  };
  if (Array.isArray(value)) summary.row_count = value.length;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['results', 'data', 'items', 'opportunities', 'files', 'awards']) {
      if (Array.isArray(value[key])) {
        summary.row_array_key = key;
        summary.row_count = value[key].length;
        break;
      }
    }
    for (const key of ['count', 'total', 'total_count', 'totalRecords', 'hitCount']) {
      if (typeof value[key] === 'number' || typeof value[key] === 'string') {
        summary.reported_count_key = key;
        summary.reported_count = value[key];
        break;
      }
    }
    if (value.page_metadata && typeof value.page_metadata === 'object') {
      summary.page_metadata_keys = Object.keys(value.page_metadata).sort();
      if (typeof value.page_metadata.count === 'number') summary.reported_count = value.page_metadata.count;
    }
  }
  return summary;
}

function summarizeHtml(text) {
  const match = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
  return {
    title,
    has_html_element: /<html[\s>]/i.test(text),
    has_body_element: /<body[\s>]/i.test(text)
  };
}

function fixtureBody(spec) {
  if (spec.expected_format === 'json') {
    return Buffer.from(JSON.stringify({
      fixture: true,
      snapshot_ref: spec.snapshot_ref,
      source_ref: spec.source_ref,
      count: 1,
      results: [{ id: spec.snapshot_ref + '-ROW-001', state: 'fixture' }]
    }, null, 2) + '\n');
  }
  return Buffer.from('<!doctype html><html><head><title>' + spec.snapshot_ref + ' fixture</title></head><body><p>' +
    spec.source_ref + '</p></body></html>\n');
}

function rawPath(spec, policy) {
  const extension = spec.expected_format === 'json' ? 'json' : spec.expected_format === 'html' ? 'html' : 'bin';
  return policy.paths.snapshot_root + '/' + spec.snapshot_ref.toLowerCase() + '.' + extension;
}

async function readBounded(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    try { await response.body?.cancel(); } catch {}
    return { oversize: true, declared_bytes: declared, bytes: null };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) return { oversize: true, declared_bytes: declared || null, bytes: null };
  return { oversize: false, declared_bytes: declared || null, bytes };
}

async function captureHttp(spec, plan, policy, observedAt) {
  const defaults = plan.request_defaults;
  const requestBody = spec.request.body === undefined ? null : canonicalJson(spec.request.body);
  const requestHeaders = canonical({
    ...spec.request.headers,
    'user-agent': defaults.user_agent
  });
  const requestFingerprint = sha256(canonicalJson({
    method: spec.request.method,
    url: spec.request.url,
    headers: requestHeaders,
    body: requestBody
  }));

  if (process.env.LAW32_FIXTURE_MODE === '1') {
    const body = fixtureBody(spec);
    const relative = rawPath(spec, policy);
    fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
    fs.writeFileSync(full(relative), body);
    const parsed = spec.expected_format === 'json'
      ? summarizeJson(JSON.parse(body.toString('utf8')))
      : summarizeHtml(body.toString('utf8'));
    return {
      schema_version: 'lake-allocator-war-source-snapshot-wave-32@1',
      row_type: 'bounded_source_snapshot',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      snapshot_ref: spec.snapshot_ref,
      source_ref: spec.source_ref,
      source_title: spec.source_title,
      publisher: spec.publisher,
      source_locator: spec.source_locator,
      capture_mode: spec.capture_mode,
      expected_format: spec.expected_format,
      required_success: spec.required_success,
      observed_at: observedAt,
      request: {
        method: spec.request.method,
        url: spec.request.url,
        headers: requestHeaders,
        body: requestBody,
        body_sha256: requestBody === null ? null : sha256(requestBody),
        fingerprint_sha256: requestFingerprint
      },
      attempts: 1,
      capture_state: spec.expected_format === 'json' ? 'captured_json_response' : 'captured_html_response',
      response_status: 200,
      response_ok: true,
      response_final_url: spec.request.url,
      response_headers: { 'content-type': spec.expected_format === 'json' ? 'application/json' : 'text/html' },
      response_body_path: relative,
      response_body_bytes: body.length,
      response_body_sha256: sha256(body),
      parsed_summary: parsed,
      request_purpose: spec.request_purpose,
      coverage: spec.coverage,
      limits: spec.limits,
      capture_authority: 'frozen_official_source_response_acquisition_only',
      complete_denominator: false,
      evidence_adjudicated: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
  }

  let lastError = null;
  for (let attempt = 1; attempt <= defaults.max_attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('request timeout')), defaults.timeout_ms);
    try {
      const response = await fetch(spec.request.url, {
        method: spec.request.method,
        headers: requestHeaders,
        body: requestBody,
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timer);
      const bounded = await readBounded(response, defaults.max_response_bytes);
      if (bounded.oversize) {
        return {
          schema_version: 'lake-allocator-war-source-snapshot-wave-32@1',
          row_type: 'bounded_source_snapshot',
          program_ref: policy.program_ref,
          wave_ref: policy.wave_ref,
          snapshot_ref: spec.snapshot_ref,
          source_ref: spec.source_ref,
          source_title: spec.source_title,
          publisher: spec.publisher,
          source_locator: spec.source_locator,
          capture_mode: spec.capture_mode,
          expected_format: spec.expected_format,
          required_success: spec.required_success,
          observed_at: observedAt,
          request: {
            method: spec.request.method,
            url: spec.request.url,
            headers: requestHeaders,
            body: requestBody,
            body_sha256: requestBody === null ? null : sha256(requestBody),
            fingerprint_sha256: requestFingerprint
          },
          attempts: attempt,
          capture_state: 'response_oversize_refused',
          response_status: response.status,
          response_ok: response.ok,
          response_final_url: response.url,
          response_headers: responseHeaders(response),
          response_body_path: null,
          response_body_bytes: null,
          response_body_sha256: null,
          parsed_summary: { declared_bytes: bounded.declared_bytes, maximum_bytes: defaults.max_response_bytes },
          request_purpose: spec.request_purpose,
          coverage: spec.coverage,
          limits: spec.limits,
          capture_authority: 'bounded_response_refusal_acquisition_only',
          complete_denominator: false,
          evidence_adjudicated: false,
          graph_effect: 'none',
          publication_status: 'blocked'
        };
      }

      const body = bounded.bytes;
      const relative = rawPath(spec, policy);
      fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
      fs.writeFileSync(full(relative), body);
      let captureState = response.ok ? 'captured_unparsed_response' : 'captured_http_error_response';
      let parsedSummary = null;
      if (response.ok && spec.expected_format === 'json') {
        try {
          parsedSummary = summarizeJson(JSON.parse(body.toString('utf8')));
          captureState = 'captured_json_response';
        } catch (error) {
          parsedSummary = { parse_error: error.message };
        }
      } else if (response.ok && spec.expected_format === 'html') {
        parsedSummary = summarizeHtml(body.toString('utf8'));
        captureState = 'captured_html_response';
      }

      if (!response.ok && defaults.retry_statuses.includes(response.status) && attempt < defaults.max_attempts) {
        fs.rmSync(full(relative), { force: true });
        await sleep(500 * attempt);
        continue;
      }

      return {
        schema_version: 'lake-allocator-war-source-snapshot-wave-32@1',
        row_type: 'bounded_source_snapshot',
        program_ref: policy.program_ref,
        wave_ref: policy.wave_ref,
        snapshot_ref: spec.snapshot_ref,
        source_ref: spec.source_ref,
        source_title: spec.source_title,
        publisher: spec.publisher,
        source_locator: spec.source_locator,
        capture_mode: spec.capture_mode,
        expected_format: spec.expected_format,
        required_success: spec.required_success,
        observed_at: observedAt,
        request: {
          method: spec.request.method,
          url: spec.request.url,
          headers: requestHeaders,
          body: requestBody,
          body_sha256: requestBody === null ? null : sha256(requestBody),
          fingerprint_sha256: requestFingerprint
        },
        attempts: attempt,
        capture_state: captureState,
        response_status: response.status,
        response_ok: response.ok,
        response_final_url: response.url,
        response_headers: responseHeaders(response),
        response_body_path: relative,
        response_body_bytes: body.length,
        response_body_sha256: sha256(body),
        parsed_summary: parsedSummary,
        request_purpose: spec.request_purpose,
        coverage: spec.coverage,
        limits: spec.limits,
        capture_authority: 'frozen_official_source_response_acquisition_only',
        complete_denominator: false,
        evidence_adjudicated: false,
        graph_effect: 'none',
        publication_status: 'blocked'
      };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < defaults.max_attempts) {
        await sleep(500 * attempt);
        continue;
      }
    }
  }

  return {
    schema_version: 'lake-allocator-war-source-snapshot-wave-32@1',
    row_type: 'bounded_source_snapshot',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    snapshot_ref: spec.snapshot_ref,
    source_ref: spec.source_ref,
    source_title: spec.source_title,
    publisher: spec.publisher,
    source_locator: spec.source_locator,
    capture_mode: spec.capture_mode,
    expected_format: spec.expected_format,
    required_success: spec.required_success,
    observed_at: observedAt,
    request: {
      method: spec.request.method,
      url: spec.request.url,
      headers: requestHeaders,
      body: requestBody,
      body_sha256: requestBody === null ? null : sha256(requestBody),
      fingerprint_sha256: requestFingerprint
    },
    attempts: plan.request_defaults.max_attempts,
    capture_state: 'network_error_after_retry',
    response_status: null,
    response_ok: false,
    response_final_url: null,
    response_headers: {},
    response_body_path: null,
    response_body_bytes: null,
    response_body_sha256: null,
    parsed_summary: { error_name: lastError?.name ?? 'Error', error_message: lastError?.message ?? 'unknown network error' },
    request_purpose: spec.request_purpose,
    coverage: spec.coverage,
    limits: spec.limits,
    capture_authority: 'bounded_network_failure_acquisition_only',
    complete_denominator: false,
    evidence_adjudicated: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

function credentialBoundary(spec, policy, observedAt) {
  return {
    schema_version: 'lake-allocator-war-source-snapshot-wave-32@1',
    row_type: 'bounded_source_snapshot',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    snapshot_ref: spec.snapshot_ref,
    source_ref: spec.source_ref,
    source_title: spec.source_title,
    publisher: spec.publisher,
    source_locator: spec.source_locator,
    capture_mode: spec.capture_mode,
    expected_format: spec.expected_format,
    required_success: spec.required_success,
    observed_at: observedAt,
    request: null,
    attempts: 0,
    capture_state: 'credential_boundary_preserved',
    credential_requirement: spec.credential_requirement,
    boundary_reason: spec.boundary_reason,
    response_status: null,
    response_ok: false,
    response_final_url: null,
    response_headers: {},
    response_body_path: null,
    response_body_bytes: null,
    response_body_sha256: null,
    parsed_summary: null,
    request_purpose: spec.request_purpose,
    coverage: spec.coverage,
    limits: spec.limits,
    capture_authority: 'explicit_credential_boundary_acquisition_only',
    complete_denominator: false,
    evidence_adjudicated: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

export async function runAcquisition() {
  const policy = readJson('data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json');
  const plan = readJson(policy.paths.snapshot_plan);
  const observedAt = process.env.LAW32_OBSERVED_AT || new Date().toISOString();

  fs.rmSync(full(policy.paths.snapshot_root), { recursive: true, force: true });
  fs.mkdirSync(full(path.dirname(policy.paths.snapshot_ledger)), { recursive: true });

  const rows = [];
  for (const spec of plan.snapshot_specs) {
    const row = spec.capture_mode === 'credential_boundary'
      ? credentialBoundary(spec, policy, observedAt)
      : await captureHttp(spec, plan, policy, observedAt);
    rows.push(row);
    console.log(spec.snapshot_ref + ': ' + row.capture_state + (row.response_status === null ? '' : ' (' + row.response_status + ')'));
  }

  fs.writeFileSync(full(policy.paths.snapshot_ledger), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
  const counts = Object.fromEntries([...new Set(rows.map(row => row.capture_state))].sort().map(state => [state, rows.filter(row => row.capture_state === state).length]));
  console.log('allocator-war bounded source snapshots Wave 32 acquired');
  console.log('  snapshots / public / credential: ' + rows.length + ' / ' + rows.filter(row => row.capture_mode === 'public_http').length + ' / ' + rows.filter(row => row.capture_mode === 'credential_boundary').length);
  console.log('  capture states: ' + JSON.stringify(counts));
  return rows;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await runAcquisition();
}
