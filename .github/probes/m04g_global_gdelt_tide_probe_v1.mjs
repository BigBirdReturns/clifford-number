#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDir = path.resolve(repoRoot, process.env.M04G_GDELT_OUTPUT_DIR || 'build/m04g-gdelt-global-tide-probe-v2');
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const registryPath = path.join(repoRoot, 'data/project/m04g-global-circulation-polls.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const gdeltRoutes = registry.polls
  .filter(route => route.enabled !== false && /api\.gdeltproject\.org/i.test(route.request?.url || ''))
  .sort((a, b) => a.poll_id.localeCompare(b.poll_id));
if (gdeltRoutes.length !== 12) throw new Error(`expected 12 preserved GDELT routes, found ${gdeltRoutes.length}`);
if (!gdeltRoutes.every(route => route.hydrology_class === 'ocean_discovery' && route.promotion_ceiling === 'locator_only')) {
  throw new Error('every preserved GDELT route must remain ocean_discovery with a locator_only ceiling');
}

const tideId = 'GDELT-GLOBAL-SERIAL';
const tideUrl = 'https://data.gdeltproject.org/gdeltv2/lastupdate.txt';
const startedAt = new Date().toISOString();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(new Error('global tide timeout after 30000ms')), 30000);
let status = null;
let finalUrl = tideUrl;
let responseHeaders = {};
let responseBody = Buffer.alloc(0);
let responseError = null;

try {
  const response = await fetch(tideUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: controller.signal,
    headers: {
      accept: 'text/plain,*/*;q=0.1',
      'user-agent': 'CliffordNumber-M04G-GDELT-Tide-Probe/2.0 (+https://github.com/BigBirdReturns/clifford-number)',
    },
  });
  status = response.status;
  finalUrl = response.url || finalUrl;
  responseHeaders = Object.fromEntries(response.headers);
  responseBody = Buffer.from(await response.arrayBuffer());
  if (responseBody.length > 65_536) throw new Error(`global tide exceeded 65536 bytes: ${responseBody.length}`);
} catch (error) {
  responseError = String(error?.message || error);
} finally {
  clearTimeout(timer);
}

const responseSha256 = responseBody.length ? sha256(responseBody) : null;
if (responseBody.length) fs.writeFileSync(path.join(outputDir, 'global-tide-response.txt'), responseBody);
const responseText = responseBody.toString('utf8').trim();
const lines = responseText ? responseText.split(/\r?\n/u).filter(Boolean) : [];
const files = lines.map((line, index) => {
  const parts = line.trim().split(/\s+/u);
  const bytes = Number(parts[0]);
  const checksum = parts[1] || null;
  const url = parts[2] || null;
  const valid = Number.isSafeInteger(bytes) && bytes > 0 && /^[a-f0-9]{32}$/iu.test(checksum || '') && /^https:\/\/data\.gdeltproject\.org\/gdeltv2\/.+\.zip$/iu.test(url || '');
  return { index, bytes: Number.isFinite(bytes) ? bytes : null, md5: checksum, url, valid };
});
const validFiles = files.filter(file => file.valid);
const transportHealthy = status === 200 && responseBody.length > 0 && !responseError;
const locatorHealthy = transportHealthy && files.length >= 3 && files.length === validFiles.length;

const projections = gdeltRoutes.map(route => {
  const originalQuery = new URL(route.request.url).searchParams.get('query');
  const projection = {
    schema_version: 'm04g-gdelt-global-tide-projection@2',
    tide_id: tideId,
    route_id: route.poll_id,
    basin_id: route.basin_id,
    hydrology_class: route.hydrology_class,
    promotion_ceiling: route.promotion_ceiling,
    original_query: originalQuery,
    original_route_url: route.request.url,
    global_tide_url: tideUrl,
    global_tide_response_sha256: responseSha256,
    deterministic_routing_key: `${route.basin_id}:${route.poll_id}`,
    routing_rule: 'one official GDELT update inventory is copied into each preserved locator-only route receipt without performing a basin-specific network request',
    locator_files: validFiles,
  };
  const bytes = Buffer.from(`${JSON.stringify(projection, null, 2)}\n`, 'utf8');
  const outputFile = `${route.poll_id}.json`;
  fs.writeFileSync(path.join(outputDir, outputFile), bytes);
  return {
    route_id: route.poll_id,
    basin_id: route.basin_id,
    original_query: originalQuery,
    deterministic_routing_key: projection.deterministic_routing_key,
    locator_file_count: validFiles.length,
    projection_bytes: bytes.length,
    projection_sha256: sha256(bytes),
    route_success: Boolean(locatorHealthy),
    content_success: Boolean(locatorHealthy && bytes.length > 0),
    output_file: outputFile,
  };
});

const routeSuccesses = projections.filter(row => row.route_success).length;
const contentSuccesses = projections.filter(row => row.content_success).length;
const candidateAuthorized = Boolean(
  locatorHealthy &&
  responseSha256 &&
  gdeltRoutes.length === 12 &&
  routeSuccesses === 12 &&
  contentSuccesses === 12
);
const reasons = [];
if (!transportHealthy) reasons.push('the single official GDELT update-inventory request did not return bounded HTTP 200 content');
if (!locatorHealthy) reasons.push(`the update inventory contained ${validFiles.length}/${files.length} valid locator rows; at least three valid rows are required`);
if (!responseSha256) reasons.push('the global tide response has no content hash');
if (routeSuccesses !== 12) reasons.push(`only ${routeSuccesses}/12 preserved route projections are healthy`);
if (contentSuccesses !== 12) reasons.push(`only ${contentSuccesses}/12 preserved route projections contain bounded content`);
if (candidateAuthorized) reasons.push('one hash-bound official update inventory produced twelve deterministic locator-only projections without changing the denominator, route identities, basin assignments, or promotion ceilings');

const ledger = {
  schema_version: 'm04g-gdelt-global-tide-probe@2',
  generated_at: new Date().toISOString(),
  started_at: startedAt,
  repository_product_files_modified: false,
  canonical_candidate_written: false,
  network_request_count: 1,
  network_retry_count: 0,
  tide_id: tideId,
  tide_url: tideUrl,
  response: {
    status,
    final_url: finalUrl,
    headers: responseHeaders,
    bytes: responseBody.length,
    sha256: responseSha256,
    error: responseError,
    raw_line_count: lines.length,
    valid_locator_count: validFiles.length,
  },
  locator_files: files,
  preserved_gdelt_routes: gdeltRoutes.length,
  route_successes: routeSuccesses,
  content_successes: contentSuccesses,
  candidate_authorized: candidateAuthorized,
  candidate_authorization_reasons: reasons,
  boundaries: {
    denominator_changed: false,
    route_ids_changed: false,
    basin_assignments_changed: false,
    promotion_ceilings_changed: false,
    metadata_counted_as_content: false,
    locator_content_treated_as_evidence: false,
    source_health_proves_evidentiary_sufficiency: false,
    source_health_proves_answer_effectiveness: false,
  },
  projections,
};
const ledgerBytes = Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDir, 'ledger.json'), ledgerBytes);
fs.writeFileSync(path.join(outputDir, 'ledger.sha256'), `${sha256(ledgerBytes)}  ledger.json\n`);
console.log(JSON.stringify({
  candidate_authorized: ledger.candidate_authorized,
  response_status: status,
  response_bytes: responseBody.length,
  response_sha256: responseSha256,
  valid_locator_count: validFiles.length,
  route_successes: routeSuccesses,
  content_successes: contentSuccesses,
}, null, 2));
