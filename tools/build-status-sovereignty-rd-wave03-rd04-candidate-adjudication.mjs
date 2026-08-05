#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-candidate-adjudication';
export const SOURCE_RECEIPT_PATH = `${DATA_DIR}/source-census-execution-receipt.json`;
export const REPLAY_PROTOCOL_PATH = `${DATA_DIR}/official-redirect-replay-protocol.json`;
export const ADJ_DIR = `${DATA_DIR}/candidates`;
export const INDEX_PATH = `${ADJ_DIR}/index.json`;
export const PRODUCT_MANIFEST_PATH = `${ADJ_DIR}/product-manifest.json`;
export const SHARD_PATHS = Object.freeze(Array.from({ length: 5 }, (_, index) => `${ADJ_DIR}/part-${String(index).padStart(2, '0')}.jsonl`));
export const RESPONSIVE_TERMS = Object.freeze([
  'snap',
  'supplemental nutrition assistance',
  'food stamp',
  'food stamps',
  'abawd',
  'work requirement',
  'work requirements',
  'waiver',
  'discretionary exemption',
  'fitness for work',
  'eligibility screening'
]);

const abs = (root, rel) => path.join(root, rel);
const readJson = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const fileEntry = (root, rel) => {
  const bytes = fs.readFileSync(abs(root, rel));
  return { path: path.basename(rel), bytes: bytes.length, sha256: sha(bytes) };
};
const parseShard = (root, rel) => fs.readFileSync(abs(root, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const ok = (value, message) => { if (!value) throw new Error(message); };

export function responsiveHits(row) {
  const surface = `${row.title} ${row.snippet} ${row.url}`.toLowerCase();
  return RESPONSIVE_TERMS.filter((term) => surface.includes(term));
}

export function validateCandidateRow(row) {
  ok(row && typeof row === 'object' && !Array.isArray(row), 'candidate row must be an object');
  const required = [
    'candidate_id','route_id','unit_ordinal','unit_id','postal_code','state_name','query_class',
    'candidate_ordinal_within_route','title','url','snippet','published_text','url_host',
    'official_government_host','responsive_term_hits','terminal_disposition','selected_for_followup',
    'admitted_source','state_implementation_observed','field_classification_effect','result_spawned_requests'
  ];
  ok(JSON.stringify(Object.keys(row)) === JSON.stringify(required), `${row.candidate_id ?? 'candidate'}: key order or set changed`);
  ok(/^[0-9a-f]{64}$/.test(row.candidate_id), `${row.candidate_id}: candidate identity changed`);
  ok(/^RD04-W03-[0-9]{2}-(IMPLEMENTATION|WAIVER|SCREENING)$/.test(row.route_id), `${row.candidate_id}: route identity changed`);
  ok(Number.isInteger(row.unit_ordinal) && row.unit_ordinal >= 1 && row.unit_ordinal <= 50, `${row.candidate_id}: unit ordinal changed`);
  ok(row.route_id === `RD04-W03-${String(row.unit_ordinal).padStart(2, '0')}-${row.query_class.toUpperCase()}`, `${row.candidate_id}: route/unit/query binding changed`);
  ok(row.unit_id === `US-STATE-${row.postal_code}`, `${row.candidate_id}: state identity changed`);
  ok(['implementation','waiver','screening'].includes(row.query_class), `${row.candidate_id}: query class changed`);
  ok(Number.isInteger(row.candidate_ordinal_within_route) && row.candidate_ordinal_within_route >= 1 && row.candidate_ordinal_within_route <= 10, `${row.candidate_id}: candidate ordinal changed`);
  const host = new URL(row.url).hostname.toLowerCase();
  ok(row.url_host === host, `${row.candidate_id}: URL host changed`);
  const gov = host.endsWith('.gov');
  ok(row.official_government_host === gov, `${row.candidate_id}: government-host typing changed`);
  const hits = responsiveHits(row);
  ok(hits.length === 0, `${row.candidate_id}: responsive SNAP-domain term requires separate adjudication`);
  ok(Array.isArray(row.responsive_term_hits) && row.responsive_term_hits.length === 0, `${row.candidate_id}: responsive-term ledger changed`);
  const expected = gov ? 'official_domain_nonresponsive_without_snap_scope' : 'nonofficial_nonresponsive_without_snap_scope';
  ok(row.terminal_disposition === expected, `${row.candidate_id}: terminal disposition changed`);
  ok(row.selected_for_followup === false, `${row.candidate_id}: candidate follow-up was silently selected`);
  ok(row.admitted_source === false, `${row.candidate_id}: candidate was silently admitted`);
  ok(row.state_implementation_observed === false, `${row.candidate_id}: implementation observation was invented`);
  ok(row.field_classification_effect === 'none', `${row.candidate_id}: field authority changed`);
  ok(row.result_spawned_requests === 0, `${row.candidate_id}: result-spawned request changed`);
  return true;
}

export function validateReplayRoute(route, expectedOrdinal) {
  ok(route.replay_ordinal === expectedOrdinal, `replay ${expectedOrdinal}: ordinal changed`);
  ok(route.replay_route_id === `RD04-W03-FNA-${String(expectedOrdinal).padStart(3, '0')}`, `replay ${expectedOrdinal}: route ID changed`);
  ok(route.allowed_final_host === 'www.fna.usda.gov', `replay ${expectedOrdinal}: allowed final host changed`);
  ok(new URL(route.raw_requested_url).hostname === 'www.fns.usda.gov', `replay ${expectedOrdinal}: raw host changed`);
  ok(new URL(route.transport_url).hostname === 'www.fna.usda.gov', `replay ${expectedOrdinal}: transport host changed`);
  ok(new URL(route.redirected_final_url).hostname === 'www.fna.usda.gov', `replay ${expectedOrdinal}: redirected host changed`);
  ok(new URL(route.raw_requested_url).pathname === new URL(route.transport_url).pathname, `replay ${expectedOrdinal}: path identity changed`);
  ok(route.original_http_status === 200, `replay ${expectedOrdinal}: original HTTP custody changed`);
  ok(/^[0-9a-f]{64}$/.test(route.original_body_sha256) && /^[0-9a-f]{64}$/.test(route.original_headers_sha256), `replay ${expectedOrdinal}: hash custody changed`);
  ok(route.maximum_attempts === 1 && route.result_spawned_requests === 0, `replay ${expectedOrdinal}: request ceiling changed`);
  for (const key of ['candidate_rows_are_admitted_sources','automatic_source_admission','automatic_field_classification','automatic_class_closure']) {
    ok(route[key] === false, `replay ${expectedOrdinal}: ${key} changed`);
  }
  return true;
}

export function deriveIndex(root = ROOT) {
  const source = readJson(root, SOURCE_RECEIPT_PATH);
  const replay = readJson(root, REPLAY_PROTOCOL_PATH);
  const rows = [];
  const shardEntries = [];
  for (let index = 0; index < SHARD_PATHS.length; index += 1) {
    const rel = SHARD_PATHS[index];
    const chunk = parseShard(root, rel);
    ok(chunk.length === 300, `${rel}: shard row count changed`);
    chunk.forEach(validateCandidateRow);
    rows.push(...chunk);
    const entry = fileEntry(root, rel);
    shardEntries.push({ path: entry.path, first_candidate_ordinal: index * 300 + 1, last_candidate_ordinal: (index + 1) * 300, rows: 300, bytes: entry.bytes, sha256: entry.sha256 });
  }
  ok(rows.length === 1500, 'candidate denominator changed');
  ok(new Set(rows.map((row) => row.candidate_id)).size === 1500, 'candidate IDs are not unique');
  ok(new Set(rows.map((row) => row.url)).size === 500, 'unique URL denominator changed');
  ok(new Set(rows.map((row) => row.route_id)).size === 150, 'candidate route denominator changed');
  for (const routeId of new Set(rows.map((row) => row.route_id))) ok(rows.filter((row) => row.route_id === routeId).length === 10, `${routeId}: route candidate count changed`);
  const gov = rows.filter((row) => row.official_government_host).length;
  ok(gov === 164, 'official-domain candidate count changed');
  ok(rows.length - gov === 1336, 'nonofficial candidate count changed');
  ok(replay.routes.length === 54, 'official redirect replay denominator changed');
  replay.routes.forEach((route, index) => validateReplayRoute(route, index + 1));
  ok(new Set(replay.routes.map((route) => route.source_route_id)).size === 54, 'source replay routes are not unique');
  ok(source.counts.candidate_rows === 1500 && source.counts.disallowed_final_host_routes === 54, 'source execution accounting changed');
  return {
    schema_version: 'ssc-rd04-wave03-candidate-adjudication-index@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    source_execution_receipt_path: 'source-census-execution-receipt.json',
    source_candidate_index_sha256: source.candidate_index_sha256,
    classification_contract: {
      normalized_surface: 'lowercase concatenation of title, snippet, and URL',
      responsive_terms: [...RESPONSIVE_TERMS],
      responsive_term_required_for_followup: true,
      official_government_host_rule: 'URL hostname ends with .gov'
    },
    shards: shardEntries,
    counts: {
      candidate_rows: 1500, terminal_candidate_rows: 1500, unique_candidate_ids: 1500, unique_candidate_urls: 500,
      responsive_term_candidates: 0, official_domain_nonresponsive_without_snap_scope: 164,
      nonofficial_nonresponsive_without_snap_scope: 1336, selected_followups: 0, admitted_sources: 0,
      field_classifications: 0, result_spawned_requests: 0
    },
    current_result: {
      candidate_adjudication_complete: true, all_candidate_rows_terminal: true, exact_candidate_followups_selected: 0,
      official_redirect_replay_routes: 54, field_matrix_terminal: false, class_state: 'still_open', class_closed: false,
      outside_human_dependency: false, publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    },
    next_bounded_operation: 'execute exactly the 54-route official redirect replay and separately adjudicate captured response bodies before any field classification'
  };
}

export function deriveProductManifest(root = ROOT, index = deriveIndex(root)) {
  const paths = [SOURCE_RECEIPT_PATH, REPLAY_PROTOCOL_PATH, ...SHARD_PATHS, INDEX_PATH];
  const entries = paths.map((rel) => ({ path: rel.replace(`${DATA_DIR}/`, ''), ...fileEntry(root, rel) })).map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));
  const combined = sha(Buffer.from(entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}`).join('\n') + '\n'));
  return { schema_version: 'ssc-rd04-wave03-candidate-adjudication-product-manifest@1', entries, combined_sha256: combined };
}

function writeJson(root, rel, value) { fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true }); fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`); }
function run() {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check') || !write;
  const derived = deriveIndex(ROOT);
  if (write) writeJson(ROOT, INDEX_PATH, derived);
  if (check) ok(JSON.stringify(readJson(ROOT, INDEX_PATH)) === JSON.stringify(derived), 'candidate-adjudication index differs from deterministic derivation');
  const manifest = deriveProductManifest(ROOT, derived);
  if (write) writeJson(ROOT, PRODUCT_MANIFEST_PATH, manifest);
  if (check) ok(JSON.stringify(readJson(ROOT, PRODUCT_MANIFEST_PATH)) === JSON.stringify(manifest), 'candidate-adjudication product manifest differs from deterministic derivation');
  console.log('RD-04 candidate adjudication built: 1500/1500 terminal; 54 exact official redirect replays frozen; class still open');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
