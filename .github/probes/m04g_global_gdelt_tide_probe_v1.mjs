#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDir = path.resolve(repoRoot, process.env.M04G_GDELT_OUTPUT_DIR || 'build/m04g-gdelt-global-tide-probe-v3');
fs.mkdirSync(outputDir, { recursive: true });
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/project/m04g-global-circulation-polls.json'), 'utf8'));
const gdeltRoutes = registry.polls
  .filter(route => route.enabled !== false && /api\.gdeltproject\.org/i.test(route.request?.url || ''))
  .sort((a, b) => a.poll_id.localeCompare(b.poll_id));
if (gdeltRoutes.length !== 12) throw new Error(`expected 12 preserved GDELT routes, found ${gdeltRoutes.length}`);
if (!gdeltRoutes.every(route => route.hydrology_class === 'ocean_discovery' && route.promotion_ceiling === 'locator_only')) {
  throw new Error('every preserved GDELT route must remain ocean_discovery with a locator_only ceiling');
}

const target = new Date(Date.now() - 5 * 60 * 1000);
target.setUTCSeconds(0, 0);
const pad = value => String(value).padStart(2, '0');
const stamp = `${target.getUTCFullYear()}${pad(target.getUTCMonth() + 1)}${pad(target.getUTCDate())}${pad(target.getUTCHours())}${pad(target.getUTCMinutes())}00`;
const tideId = 'GDELT-GLOBAL-SERIAL';
const tideUrl = `https://storage.googleapis.com/data.gdeltproject.org/gdeltv5/weblegacy/ngrams/${stamp}.toc.json.gz`;
const startedAt = new Date().toISOString();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(new Error('global tide timeout after 30000ms')), 30000);
let status = null;
let finalUrl = tideUrl;
let responseHeaders = {};
let compressed = Buffer.alloc(0);
let responseError = null;
let decompressed = Buffer.alloc(0);
let parseError = null;
let records = [];

try {
  const response = await fetch(tideUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: controller.signal,
    headers: {
      accept: 'application/gzip,application/octet-stream,*/*;q=0.1',
      'user-agent': 'CliffordNumber-M04G-GDELT-Tide-Probe/3.0 (+https://github.com/BigBirdReturns/clifford-number)',
    },
  });
  status = response.status;
  finalUrl = response.url || finalUrl;
  responseHeaders = Object.fromEntries(response.headers);
  compressed = Buffer.from(await response.arrayBuffer());
  if (compressed.length > 16_777_216) throw new Error(`compressed global tide exceeded 16777216 bytes: ${compressed.length}`);
  if (response.ok) {
    try {
      decompressed = zlib.gunzipSync(compressed, { maxOutputLength: 67_108_864 });
      const lines = decompressed.toString('utf8').split(/\r?\n/u).filter(Boolean);
      records = lines.map(line => JSON.parse(line));
    } catch (error) {
      parseError = String(error?.message || error);
    }
  }
} catch (error) {
  responseError = String(error?.message || error);
} finally {
  clearTimeout(timer);
}

const compressedSha256 = compressed.length ? sha256(compressed) : null;
const decompressedSha256 = decompressed.length ? sha256(decompressed) : null;
if (compressed.length) fs.writeFileSync(path.join(outputDir, 'global-tide-toc.json.gz'), compressed);
if (decompressed.length) fs.writeFileSync(path.join(outputDir, 'global-tide-toc.json'), decompressed);
const validRecords = records.filter(record => Number.isInteger(record?.ID) && typeof record?.url === 'string' && /^https?:\/\//iu.test(record.url));
const transportHealthy = status === 200 && compressed.length > 0 && !responseError;
const locatorHealthy = transportHealthy && !parseError && records.length > 0 && records.length === validRecords.length;

const projections = gdeltRoutes.map(route => {
  const originalQuery = new URL(route.request.url).searchParams.get('query');
  const projection = {
    schema_version: 'm04g-gdelt-global-tide-projection@3',
    tide_id: tideId,
    route_id: route.poll_id,
    basin_id: route.basin_id,
    hydrology_class: route.hydrology_class,
    promotion_ceiling: route.promotion_ceiling,
    original_query: originalQuery,
    original_route_url: route.request.url,
    global_tide_url: tideUrl,
    target_minute_utc: target.toISOString(),
    compressed_sha256: compressedSha256,
    decompressed_sha256: decompressedSha256,
    deterministic_routing_key: `${route.basin_id}:${route.poll_id}`,
    routing_rule: 'one official five-minute-delayed GDELT TOC is copied into each preserved locator-only route receipt without a basin-specific network request',
    locator_records: validRecords,
  };
  const bytes = Buffer.from(`${JSON.stringify(projection, null, 2)}\n`, 'utf8');
  const outputFile = `${route.poll_id}.json`;
  fs.writeFileSync(path.join(outputDir, outputFile), bytes);
  return {
    route_id: route.poll_id,
    basin_id: route.basin_id,
    deterministic_routing_key: projection.deterministic_routing_key,
    locator_record_count: validRecords.length,
    projection_bytes: bytes.length,
    projection_sha256: sha256(bytes),
    route_success: Boolean(locatorHealthy),
    content_success: Boolean(locatorHealthy && bytes.length > 0),
    output_file: outputFile,
  };
});

const routeSuccesses = projections.filter(row => row.route_success).length;
const contentSuccesses = projections.filter(row => row.content_success).length;
const candidateAuthorized = Boolean(locatorHealthy && compressedSha256 && decompressedSha256 && routeSuccesses === 12 && contentSuccesses === 12);
const reasons = [];
if (!transportHealthy) reasons.push('the single recommended GDELT TOC request did not return bounded HTTP 200 content');
if (parseError) reasons.push(`the GZIP TOC could not be parsed: ${parseError}`);
if (!locatorHealthy) reasons.push(`the TOC contained ${validRecords.length}/${records.length} valid locator records; at least one valid record is required`);
if (!compressedSha256 || !decompressedSha256) reasons.push('the GZIP and decompressed TOC hashes are incomplete');
if (routeSuccesses !== 12) reasons.push(`only ${routeSuccesses}/12 preserved route projections are healthy`);
if (contentSuccesses !== 12) reasons.push(`only ${contentSuccesses}/12 preserved route projections contain bounded content`);
if (candidateAuthorized) reasons.push('one hash-bound official GDELT TOC produced twelve deterministic locator-only projections without changing the denominator, route identities, basin assignments, or promotion ceilings');

const ledger = {
  schema_version: 'm04g-gdelt-global-tide-probe@3',
  generated_at: new Date().toISOString(),
  started_at: startedAt,
  repository_product_files_modified: false,
  canonical_candidate_written: false,
  network_request_count: 1,
  network_retry_count: 0,
  tide_id: tideId,
  tide_url: tideUrl,
  target_minute_utc: target.toISOString(),
  response: {
    status,
    final_url: finalUrl,
    headers: responseHeaders,
    compressed_bytes: compressed.length,
    compressed_sha256: compressedSha256,
    decompressed_bytes: decompressed.length,
    decompressed_sha256: decompressedSha256,
    error: responseError,
    parse_error: parseError,
    locator_record_count: validRecords.length,
  },
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
  target_minute_utc: ledger.target_minute_utc,
  compressed_bytes: compressed.length,
  compressed_sha256: compressedSha256,
  locator_record_count: validRecords.length,
  route_successes: routeSuccesses,
  content_successes: contentSuccesses,
}, null, 2));
