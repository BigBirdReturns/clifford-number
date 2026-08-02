#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json';
const PLAN_PATH = 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json';
const FIXTURE_MODE = process.env.LAW36_FIXTURE_MODE === '1';
const FIXED_OBSERVED_AT = process.env.LAW36_OBSERVED_AT ?? null;
const ALLOW_REQUIRED_FAILURES = process.env.LAW36_ALLOW_REQUIRED_FAILURES === '1';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const stableJson = value => JSON.stringify(stable(value));
const readJson = (root, relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const writeJsonl = (root, relative, rows) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value)]).sort(([a], [b]) => a.localeCompare(b)));
}

function requestDescriptor(spec, defaults) {
  const method = String(spec.request?.method ?? 'GET').toUpperCase();
  const headers = normalizeHeaders({
    accept: '*/*',
    'user-agent': defaults.user_agent,
    ...(spec.request?.headers ?? {})
  });
  const body = spec.request?.body === null || spec.request?.body === undefined
    ? null
    : (typeof spec.request.body === 'string' ? spec.request.body : stableJson(spec.request.body));
  if (body !== null && !headers['content-type']) headers['content-type'] = 'application/json';
  const descriptor = { method, url: spec.request.url, headers, body };
  return {
    ...descriptor,
    body_sha256: body === null ? null : sha256(Buffer.from(body)),
    fingerprint_sha256: sha256(Buffer.from(stableJson(descriptor)))
  };
}

function fixtureResponse(spec, request) {
  const markerText = (spec.marker_groups ?? []).flat().join(' ');
  const expected = spec.expected_format === 'auto' ? 'html' : spec.expected_format;
  if (expected === 'json') {
    const body = Buffer.from(JSON.stringify({
      fixture: true,
      source_ref: spec.source_ref,
      title: spec.title,
      markers: markerText,
      request_fingerprint: request.fingerprint_sha256,
      results: spec.source_ref === 'LAW36-S050'
        ? [{ 'Award ID': 'FIXTURE-AWARD-1', 'Recipient Name': 'INTERNATIONAL BUSINESS MACHINES CORPORATION', 'Recipient UEI': 'FIXTUREUEI0001', 'Awarding Agency': 'Department of Defense', 'Award Amount': 1000000, 'Start Date': '2025-02-01', 'End Date': '2026-01-31', Description: 'fixture official award row', 'Award Type': 'Definitive Contract' }]
        : { contracts: 1, grants: 1, total: 2 }
    }, null, 2));
    return { status: 200, ok: true, finalUrl: request.url, headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': String(body.length), date: FIXED_OBSERVED_AT ?? 'Sat, 01 Aug 2026 00:00:00 GMT' }, body, attempts: 1 };
  }
  if (expected === 'pdf') {
    const body = Buffer.from(`%PDF-1.4\n% fixture ${spec.source_ref}\n1 0 obj<</Type/Catalog>>endobj\n% ${spec.title} ${markerText}\n%%EOF\n`);
    return { status: 200, ok: true, finalUrl: request.url, headers: { 'content-type': 'application/pdf', 'content-length': String(body.length), date: FIXED_OBSERVED_AT ?? 'Sat, 01 Aug 2026 00:00:00 GMT' }, body, attempts: 1 };
  }
  const html = `<!doctype html><html><head><title>${spec.title}</title></head><body><main><h1>${spec.title}</h1><p>${markerText}</p><p>${spec.stable_identifier}</p><p>${spec.publisher}</p></main></body></html>`;
  const body = Buffer.from(html);
  return { status: 200, ok: true, finalUrl: request.url, headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': String(body.length), date: FIXED_OBSERVED_AT ?? 'Sat, 01 Aug 2026 00:00:00 GMT' }, body, attempts: 1 };
}

async function requestWithRetry(spec, request, defaults) {
  let lastError = null;
  for (let attempt = 1; attempt <= defaults.max_attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), defaults.timeout_ms);
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
        signal: controller.signal
      });
      const arrayBuffer = await response.arrayBuffer();
      clearTimeout(timeout);
      return {
        status: response.status,
        ok: response.ok,
        finalUrl: response.url,
        headers: normalizeHeaders(Object.fromEntries(response.headers.entries())),
        body: Buffer.from(arrayBuffer),
        attempts: attempt
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < defaults.max_attempts) await sleep(defaults.backoff_ms * attempt);
    }
  }
  throw lastError ?? new Error(`request failed without error: ${spec.source_ref}`);
}

function classifyBody(spec, response) {
  const type = String(response.headers['content-type'] ?? '').toLowerCase();
  const head = response.body.subarray(0, 16).toString('utf8').trimStart();
  if (type.includes('application/json') || spec.expected_format === 'json' || head.startsWith('{') || head.startsWith('[')) return { format: 'json', extension: 'json', state: 'captured_json_response' };
  if (type.includes('application/pdf') || spec.expected_format === 'pdf' || response.body.subarray(0, 5).toString('utf8') === '%PDF-') return { format: 'pdf', extension: 'pdf', state: 'captured_pdf_response' };
  if (type.includes('text/html') || type.includes('application/xhtml') || head.startsWith('<!DOCTYPE') || head.startsWith('<html') || head.startsWith('<')) return { format: 'html', extension: 'html', state: 'captured_html_response' };
  if (type.includes('text/plain') || type.includes('text/')) return { format: 'text', extension: 'txt', state: 'captured_text_response' };
  return { format: 'binary', extension: 'bin', state: 'captured_binary_response' };
}

function markerAudit(spec, response, format) {
  const groups = spec.marker_groups ?? [];
  if (!groups.length) return { required_groups: 0, matched_groups: 0, passed: true, matches: [] };
  if (format === 'pdf' || format === 'binary') return { required_groups: groups.length, matched_groups: 0, passed: true, matches: [], audit_state: 'binary_marker_audit_not_required' };
  const text = response.body.toString('utf8').toLowerCase();
  const matches = groups.map(group => {
    const matched = group.find(marker => text.includes(String(marker).toLowerCase())) ?? null;
    return { alternatives: group, matched };
  });
  return { required_groups: groups.length, matched_groups: matches.filter(row => row.matched).length, passed: matches.every(row => row.matched), matches };
}

function parseSummary(response, format) {
  if (format === 'json') {
    try {
      const value = JSON.parse(response.body.toString('utf8'));
      return {
        format,
        root_type: Array.isArray(value) ? 'array' : typeof value,
        root_keys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort().slice(0, 40) : [],
        row_count: Array.isArray(value) ? value.length : null,
        result_count: Array.isArray(value?.results) ? value.results.length : (typeof value?.results === 'object' && value?.results ? Object.keys(value.results).length : null)
      };
    } catch (error) {
      return { format, parse_error: String(error.message ?? error) };
    }
  }
  if (format === 'html' || format === 'text') {
    const text = response.body.toString('utf8');
    const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
    const linkCount = [...text.matchAll(/<a\b/gi)].length;
    const headingCount = [...text.matchAll(/<h[1-6]\b/gi)].length;
    return { format, title, link_count: linkCount, heading_count: headingCount, character_count: text.length };
  }
  if (format === 'pdf') return { format, pdf_header: response.body.subarray(0, 8).toString('utf8'), bytes: response.body.length };
  return { format, bytes: response.body.length };
}

async function acquireOne(root, policy, plan, spec) {
  const defaults = plan.request_defaults;
  const observedAt = FIXED_OBSERVED_AT ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const request = requestDescriptor(spec, defaults);
  let response = null;
  let requestError = null;
  try {
    response = FIXTURE_MODE ? fixtureResponse(spec, request) : await requestWithRetry(spec, request, defaults);
  } catch (error) {
    requestError = String(error?.message ?? error);
  }

  if (!response) {
    return {
      schema_version: 'lake-allocator-war-public-capture-wave-36@1', row_type: 'official_record_capture',
      program_ref: policy.program_ref, wave_ref: policy.wave_ref, capture_ref: spec.capture_ref, capture_sequence: spec.capture_sequence,
      source_ref: spec.source_ref, title: spec.title, publisher: spec.publisher, source_type: spec.source_type, action_class: spec.action_class,
      source_locator: spec.source_locator, stable_identifier: spec.stable_identifier, required_success: spec.required_success, observed_at: observedAt,
      request, attempts: defaults.max_attempts, capture_state: 'request_failed', response_status: null, response_ok: false, response_final_url: null,
      response_headers: {}, response_body_path: null, response_body_bytes: 0, response_body_sha256: null, observed_format: null,
      marker_audit: { required_groups: (spec.marker_groups ?? []).length, matched_groups: 0, passed: false, matches: [] }, parsed_summary: null,
      request_error: requestError, capture_authority: 'frozen_official_source_response_acquisition_only', requirement_satisfied: false,
      authorized_join: false, complete_denominator: false, evidence_adjudicated: false, graph_effect: 'none', publication_status: 'blocked'
    };
  }

  const bodyTooLarge = response.body.length > defaults.max_response_bytes;
  const classified = classifyBody(spec, response);
  const markers = markerAudit(spec, response, classified.format);
  let bodyPath = null;
  let bodyHash = null;
  let captureState = response.ok ? classified.state : `captured_http_${response.status}_response`;
  if (bodyTooLarge) captureState = 'response_refused_too_large';
  if (response.ok && !markers.passed) captureState = 'captured_marker_mismatch';
  if (!bodyTooLarge) {
    bodyPath = spec.storage_path;
    const target = path.join(root, bodyPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, response.body);
    bodyHash = sha256(response.body);
  }

  return {
    schema_version: 'lake-allocator-war-public-capture-wave-36@1', row_type: 'official_record_capture',
    program_ref: policy.program_ref, wave_ref: policy.wave_ref, capture_ref: spec.capture_ref, capture_sequence: spec.capture_sequence,
    source_ref: spec.source_ref, inherited_source_ref: spec.inherited_source_ref, title: spec.title, publisher: spec.publisher,
    source_type: spec.source_type, jurisdiction: spec.jurisdiction, issued_at: spec.issued_at, action_class: spec.action_class,
    source_locator: spec.source_locator, stable_identifier: spec.stable_identifier, custody_refs: spec.custody_refs,
    required_success: spec.required_success, observed_at: observedAt, request, attempts: response.attempts,
    capture_state: captureState, response_status: response.status, response_ok: response.ok, response_final_url: response.finalUrl,
    response_headers: Object.fromEntries(Object.entries(response.headers).filter(([key]) => ['content-type','content-length','date','last-modified','etag','cache-control'].includes(key))),
    response_body_path: bodyPath, response_body_bytes: bodyTooLarge ? 0 : response.body.length, response_body_sha256: bodyHash,
    observed_format: classified.format, marker_audit: markers, parsed_summary: bodyTooLarge ? null : parseSummary(response, classified.format),
    request_error: null, represented_value: spec.represented_value, request_purpose: spec.request_purpose, coverage: spec.coverage, limits: spec.limits,
    capture_authority: 'frozen_official_source_response_acquisition_only', requirement_satisfied: false, authorized_join: false,
    complete_denominator: false, evidence_adjudicated: false, graph_effect: 'none', publication_status: 'blocked'
  };
}

async function runPool(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function consume() {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, consume));
  return output;
}

export async function acquireRepository(root = defaultRoot) {
  const policy = readJson(root, POLICY_PATH);
  const plan = readJson(root, PLAN_PATH);
  if (policy.schema_version !== 'lake-allocator-war-public-acquisition-wave-36-policy@1') throw new Error('Wave 36 policy schema mismatch');
  if (plan.schema_version !== 'lake-allocator-war-public-acquisition-wave-36-plan@1') throw new Error('Wave 36 plan schema mismatch');
  if (plan.source_specs.length !== policy.expected_counts.source_specs) throw new Error('Wave 36 source-spec denominator mismatch');

  const snapshotRoot = path.join(root, policy.paths.snapshot_root);
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
  fs.mkdirSync(snapshotRoot, { recursive: true });
  const rows = await runPool(plan.source_specs, plan.request_defaults.concurrency, spec => acquireOne(root, policy, plan, spec));
  rows.sort((a, b) => a.capture_sequence - b.capture_sequence);
  writeJsonl(root, policy.paths.capture_ledger, rows);

  const requiredFailures = rows.filter(row => row.required_success && !(row.response_ok && row.response_body_path && row.marker_audit.passed));
  if (requiredFailures.length && !ALLOW_REQUIRED_FAILURES) {
    throw new Error(`Wave 36 required captures failed:\n${requiredFailures.map(row => `- ${row.capture_ref} ${row.source_ref}: ${row.capture_state}`).join('\n')}`);
  }
  const stateCounts = Object.fromEntries([...new Set(rows.map(row => row.capture_state))].sort().map(state => [state, rows.filter(row => row.capture_state === state).length]));
  console.log('allocator-war official-record public acquisition Wave 36 captured');
  console.log(`  source specs / captures: ${plan.source_specs.length} / ${rows.length}`);
  console.log(`  response files / required failures: ${rows.filter(row => row.response_body_path).length} / ${requiredFailures.length}`);
  console.log(`  capture states: ${JSON.stringify(stateCounts)}`);
  return rows;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) await acquireRepository(defaultRoot);
