#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECEIPT_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-execution-receipt.json';
export const ADJUDICATION_INDEX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-adjudication/index.json';
export const FOLLOWUP_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-followup-protocol.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-candidate-adjudication.schema.json';
export const PROTOCOL_MERGE = '44d4544b23dc24db24a4a7c61939396ada0b5fd5';
export const RECEIPT_SHA256 = '362a5a2fefe944aff9895a74dd2ced528bcb90356cb2b4691f67b781fa728312';
export const ADJUDICATION_INDEX_SHA256 = 'd6f5ff837956d176a41834b3a2b00a722eb92743ae4c761f44a9d2f2ece5eaf3';
export const ADJUDICATION_SHARD_COMBINED_SHA256 = 'd94d7a24923b5894b6a91bd9773ba595ffe71c31b086f18a37fcaf5654e10942';
export const FOLLOWUP_SHA256 = '78f87ea8b147c1a304eec9dacf548c5975cc9197254957b18ee59d0fa97043ca';
export const ROUTE_LEDGER_SHA256 = '727f226d913a5f53677f6b32dbe47e76d9affe06fe6394e57d655f719350c01c';
export const ROUTE_LEDGER_BYTES = 789;

export const EXACT_MANAGER_URLS = new Set(['https://moonshotscapital.com/']);
export const PARENT_ORGANIZATION_URLS = new Set([
  'https://bankwithstifel.com/',
  'https://bankwithstifel.com/login/',
  'https://open.stifel.com/open.stifel.com',
  'https://stifelinstitutional.com/',
  'https://www.stifel.com/',
  'https://www.stifel.com/tracker',
  'https://www.stifelbank.com/about-us/',
  'https://www.stifelchicagoland.com/',
  'https://www.stifelonenorth.com/meet-the-team.htm'
]);
export const OFFICIAL_COLLISION_URLS = new Set([
  'https://www.michigan.gov/',
  'https://www.michigan.gov/sos'
]);
export const EXPECTED_FOLLOWUP_URLS = [...EXACT_MANAGER_URLS, ...PARENT_ORGANIZATION_URLS].sort();

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const sha256Bytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha256File = (root, rel) => sha256Bytes(fs.readFileSync(abs(root, rel)));
const candidateId = (url) => sha256Bytes(Buffer.from(url));

export function loadCandidateAdjudication(root = ROOT) {
  const index = read(root, ADJUDICATION_INDEX_PATH);
  ok(Array.isArray(index.shards) && index.shards.length === 7, 'seven adjudication shards required');
  const candidates = [];
  const bindings = [];
  for (let shardIndex = 0; shardIndex < index.shards.length; shardIndex += 1) {
    const binding = index.shards[shardIndex];
    ok(binding.shard_ordinal === shardIndex + 1, `shard binding ${shardIndex + 1} order changed`);
    const shard = read(root, binding.path);
    ok(sha256File(root, binding.path) === binding.sha256, `shard ${shardIndex + 1} digest changed`);
    ok(shard.schema_version === 'ssc-rd02-wave03-search-candidate-adjudication-shard@1', `shard ${shardIndex + 1} schema changed`);
    ok(shard.shard_ordinal === binding.shard_ordinal, `shard ${shardIndex + 1} identity changed`);
    ok(shard.first_candidate_ordinal === binding.first_candidate_ordinal && shard.last_candidate_ordinal === binding.last_candidate_ordinal, `shard ${shardIndex + 1} range changed`);
    ok(Array.isArray(shard.candidate_urls) && shard.candidate_urls.length === binding.candidate_urls, `shard ${shardIndex + 1} denominator changed`);
    candidates.push(...shard.candidate_urls);
    bindings.push(`${binding.path}\t${binding.sha256}`);
  }
  ok(sha256Bytes(Buffer.from(bindings.join('\n'))) === ADJUDICATION_SHARD_COMBINED_SHA256, 'adjudication shard-set digest changed');
  return { ...index, candidate_urls: candidates };
}

export function validateExecutionReceipt(value) {
  ok(value?.schema_version === 'ssc-rd02-wave03-search-census-execution-receipt@1', 'execution-receipt schema changed');
  ok(value?.wave_id === 'SSC-RD-W03' && value?.lane_id === 'RD-02' && value?.class_id === 'RD-02-C05' && value?.issue === 1015, 'execution-receipt identity changed');
  ok(value?.protocol_merge === PROTOCOL_MERGE, 'execution-receipt protocol merge changed');
  ok(value?.trigger_pr === 1056 && value?.trigger_head === '9a5cacfab49b543e7888b0084a318ad64a43d70b', 'trigger custody changed');
  ok(value?.workflow_merge_ref === 'fe18ee85ee47ee726ea2f3584f84b471fba3d0dd', 'workflow merge-ref custody changed');
  ok(value?.workflow_run === 30941752301 && value?.workflow_attempt === 1, 'workflow execution custody changed');
  ok(value?.artifact_id === 8905467301 && value?.artifact_bytes === 1181932, 'artifact identity or size changed');
  ok(value?.artifact_zip_sha256 === '6842a094437246095ac69c51dc4813c5e21a6298a60e81648f136485c6fc318a', 'artifact ZIP digest changed');
  ok(value?.manifest_entries === 572 && value?.manifest_combined_sha256 === '8cda804e330de9aa53c5065322414c79fd2b03bd49d773c07e1741e990647513', 'artifact manifest custody changed');
  ok(value?.protocol_sha256 === '9c1822d5b59dc3b15d107afd462b43174961de8f98941697cbc72849a0dd10f2', 'search protocol digest changed');
  ok(value?.route_ledger_sha256 === 'ea33c69fca431afafc7450b96eeaa4f5a994f57be87eb19f7e14f6f41439e41b', 'search route-ledger digest changed');
  ok(value?.counts?.candidate_rows === 480 && value?.counts?.unique_candidate_urls === 210, 'candidate denominator changed');
  ok(value?.counts?.fixed_routes === 51 && value?.counts?.terminal_routes === 51, 'search route execution changed');
  same(value?.counts?.route_state_counts, { http_success_rss_parsed: 51 }, 'search route states changed');
  ok(value?.counts?.candidate_urls_admitted === 0 && value?.counts?.result_spawned_requests === 0, 'candidate admission or request spawning changed');
  ok(value?.current_result?.class_state === 'still_open' && value?.current_result?.class_closed === false, 'execution receipt prematurely closes class');
  for (const key of ['outside_human_dependency', 'candidate_is_admitted_source', 'candidate_is_lifecycle_event', 'search_silence_is_event_absence', 'withheld_identity_inferred']) {
    ok(value?.boundaries?.[key] === false, `execution boundary ${key} changed`);
  }
  for (const key of ['external_contacts', 'external_reviews']) ok(value?.boundaries?.[key] === 0, `${key} changed`);
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) ok(value?.boundaries?.[key] === 'none', `${key} changed`);
  return true;
}

function expectedClassification(url) {
  if (EXACT_MANAGER_URLS.has(url)) return 'exact_manager_site_candidate';
  if (PARENT_ORGANIZATION_URLS.has(url)) return 'name_aligned_parent_organization_candidate';
  if (OFFICIAL_COLLISION_URLS.has(url)) return 'official_domain_lexical_collision';
  return 'nonresponsive_lexical_collision_or_generic_result';
}

export function validateCandidateAdjudication(value) {
  ok(value?.schema_version === 'ssc-rd02-wave03-search-candidate-adjudication@1', 'adjudication schema changed');
  ok(value?.wave_id === 'SSC-RD-W03' && value?.lane_id === 'RD-02' && value?.class_id === 'RD-02-C05' && value?.issue === 1015, 'adjudication identity changed');
  ok(value?.authority === 'complete_unique_url_candidate_adjudication_and_bounded_followup_selection_not_source_admission', 'adjudication authority changed');
  ok(value?.source_custody?.workflow_run === 30941752301 && value?.source_custody?.artifact_id === 8905467301, 'adjudication source run changed');
  ok(value?.source_custody?.execution_receipt_sha256 === RECEIPT_SHA256, 'execution receipt binding changed');
  ok(value?.source_custody?.artifact_zip_sha256 === '6842a094437246095ac69c51dc4813c5e21a6298a60e81648f136485c6fc318a', 'adjudication artifact binding changed');
  ok(value?.source_custody?.candidate_index_sha256 === '3f16f42fec220ed1f0094126437ca9b5ab8059ac290c0f3dbe6be8f30ed5a66e', 'candidate-index binding changed');
  ok(value?.source_custody?.artifact_manifest_combined_sha256 === '8cda804e330de9aa53c5065322414c79fd2b03bd49d773c07e1741e990647513', 'manifest binding changed');
  ok(value?.adjudication_contract?.candidate_rows === 480 && value?.adjudication_contract?.unique_candidate_urls === 210, 'adjudication denominator changed');
  ok(value?.adjudication_contract?.all_unique_urls_represented === true && value?.adjudication_contract?.silent_candidate_removal_allowed === false, 'candidate completeness contract changed');
  ok(value?.adjudication_contract?.candidate_admission_by_search_result_allowed === false, 'search result admission changed');
  ok(value?.adjudication_contract?.outcome_based_denominator_widening_allowed === false, 'outcome-based widening changed');
  ok(value?.adjudication_contract?.followup_selection_rule === 'exact_manager_site_or_name_aligned_parent_organization_candidate_only', 'followup selection rule changed');

  const candidates = value?.candidate_urls;
  ok(Array.isArray(candidates) && candidates.length === 210, 'exactly 210 candidate URLs required');
  const urls = candidates.map((row) => row.url);
  same(urls, [...urls].sort(), 'candidate URL order changed');
  ok(new Set(urls).size === 210, 'candidate URLs must be unique');
  ok(candidates.reduce((sum, row) => sum + row.occurrences, 0) === 480, 'candidate occurrence denominator changed');
  const counts = new Map();
  const selected = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    ok(row.candidate_ordinal === index + 1, `candidate ordinal ${index + 1} changed`);
    ok(row.candidate_id === candidateId(row.url), `candidate ID ${index + 1} changed`);
    ok(row.domain === new URL(row.url).hostname.toLowerCase(), `candidate domain ${index + 1} changed`);
    ok(Number.isInteger(row.occurrences) && row.occurrences > 0, `candidate occurrences ${index + 1} invalid`);
    ok(Array.isArray(row.unit_ordinals) && row.unit_ordinals.length > 0, `candidate units ${index + 1} missing`);
    ok(!row.unit_ordinals.includes(18), `withheld row received candidate ${index + 1}`);
    same(row.unit_ordinals, [...row.unit_ordinals].sort((a, b) => a - b), `candidate units ${index + 1} reordered`);
    ok(row.query_classes.every((item) => ['disposition', 'portfolio', 'recovery'].includes(item)), `candidate query class ${index + 1} invalid`);
    same(row.query_classes, [...row.query_classes].sort(), `candidate query classes ${index + 1} reordered`);
    const expected = expectedClassification(row.url);
    ok(row.classification === expected, `candidate classification ${index + 1} changed`);
    counts.set(expected, (counts.get(expected) || 0) + 1);
    const isSelected = expected === 'exact_manager_site_candidate' || expected === 'name_aligned_parent_organization_candidate';
    if (isSelected) {
      selected.push(row);
      ok(row.followup_route_id === `RD02-W03-CF${String(selected.length).padStart(3, '0')}`, `followup route ID ${index + 1} changed`);
    } else {
      ok(row.followup_route_id === null, `nonselected candidate ${index + 1} received route`);
    }
    ok(row.admitted_source === false && row.lifecycle_event_observed === false, `candidate ${index + 1} gained evidence authority`);
    ok(row.field_effect === 'none' && row.class_effect === 'none', `candidate ${index + 1} changed field or class`);
  }
  ok(counts.get('exact_manager_site_candidate') === 1, 'exact manager candidate count changed');
  ok(counts.get('name_aligned_parent_organization_candidate') === 9, 'parent organization candidate count changed');
  ok(counts.get('official_domain_lexical_collision') === 2, 'official collision count changed');
  ok(counts.get('nonresponsive_lexical_collision_or_generic_result') === 198, 'nonresponsive candidate count changed');
  same(selected.map((row) => row.url), EXPECTED_FOLLOWUP_URLS, 'selected followup URL set changed');

  const c = value.counts;
  ok(c.candidate_rows === 480 && c.unique_candidate_urls === 210, 'summary denominator changed');
  ok(c.exact_manager_site_candidates === 1 && c.name_aligned_parent_organization_candidates === 9, 'selected candidate summary changed');
  ok(c.official_domain_lexical_collisions === 2 && c.nonresponsive_lexical_collisions_or_generic_results === 198, 'rejected candidate summary changed');
  ok(c.fixed_followup_routes === 10 && c.candidate_urls_admitted === 0 && c.lifecycle_events_observed === 0, 'adjudication outcome changed');
  ok(c.withheld_row_candidates === 0 && c.external_contacts === 0 && c.external_reviews === 0, 'withheld or external count changed');
  ok(value.current_result.candidate_adjudication_complete === true && value.current_result.followup_protocol_frozen === true, 'adjudication completion changed');
  ok(value.current_result.followup_execution_complete === false && value.current_result.field_matrix_terminal === false, 'future execution or field state fabricated');
  ok(value.current_result.class_state === 'still_open' && value.current_result.class_closed === false, 'adjudication prematurely closes class');
  for (const key of ['outside_human_dependency', 'project_blocking', 'capital_conversion_finding', 'favoritism_finding', 'extraction_finding', 'coordination_finding', 'common_purpose_finding', 'complete_compact_finding']) {
    ok(value.current_result[key] === false, `current-result boundary ${key} changed`);
  }
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) ok(value.current_result[key] === 'none', `current-result ${key} changed`);
  for (const key of ['exact_manager_candidate_is_admitted_source', 'name_aligned_parent_surface_is_fund_specific_evidence', 'official_domain_collision_is_official_fund_record', 'nonresponsive_candidate_is_event_absence', 'candidate_followup_route_is_lifecycle_event', 'withheld_identity_inferred']) {
    ok(value.boundaries[key] === false, `adjudication boundary ${key} changed`);
  }
  return true;
}

export function buildRouteLedger(value) {
  const header = 'route_id\tcandidate_ordinal\tunit_ordinal\trequested_url\tallowed_final_host_suffix\n';
  return header + value.routes.map((row) => `${row.route_id}\t${row.candidate_ordinal}\t${row.unit_ordinal}\t${row.requested_url}\t${row.allowed_final_host_suffix}\n`).join('');
}

export function validateFollowupProtocol(value, adjudication) {
  ok(value?.schema_version === 'ssc-rd02-wave03-candidate-followup-protocol@1', 'followup protocol schema changed');
  ok(value?.wave_id === 'SSC-RD-W03' && value?.lane_id === 'RD-02' && value?.class_id === 'RD-02-C05' && value?.issue === 1015, 'followup protocol identity changed');
  ok(value?.authority === 'fixed_candidate_followup_capture_only_not_source_admission_or_terminal_class_receipt', 'followup authority changed');
  ok(value?.source_custody?.protocol_merge === PROTOCOL_MERGE, 'followup parent merge changed');
  ok(value?.source_custody?.candidate_adjudication_index_sha256 === ADJUDICATION_INDEX_SHA256, 'candidate adjudication index binding changed');
  ok(value?.source_custody?.candidate_adjudication_shards === 7 && value?.source_custody?.candidate_adjudication_shard_combined_sha256 === ADJUDICATION_SHARD_COMBINED_SHA256, 'candidate adjudication shard binding changed');
  ok(value?.source_custody?.candidate_index_artifact_id === 8905467301, 'candidate artifact ID changed');
  ok(value?.source_custody?.candidate_index_sha256 === '3f16f42fec220ed1f0094126437ca9b5ab8059ac290c0f3dbe6be8f30ed5a66e', 'candidate artifact file digest changed');
  const d = value.denominator;
  ok(d.unique_candidate_urls === 210 && d.terminally_adjudicated_candidate_urls === 210, 'followup source denominator changed');
  ok(d.fixed_followup_routes === 10 && d.unit_01_routes === 1 && d.unit_15_routes === 9 && d.withheld_row_routes === 0, 'followup route denominator changed');
  ok(d.route_ledger_bytes === ROUTE_LEDGER_BYTES && d.route_ledger_sha256 === ROUTE_LEDGER_SHA256, 'followup route-ledger custody changed');
  ok(Array.isArray(value.routes) && value.routes.length === 10, 'ten followup routes required');
  const selected = adjudication.candidate_urls.filter((row) => row.followup_route_id !== null);
  for (let index = 0; index < value.routes.length; index += 1) {
    const route = value.routes[index];
    const candidate = selected[index];
    ok(route.route_id === `RD02-W03-CF${String(index + 1).padStart(3, '0')}`, `route ${index + 1} ID changed`);
    ok(route.route_id === candidate.followup_route_id, `route ${index + 1} candidate binding changed`);
    ok(route.candidate_ordinal === candidate.candidate_ordinal && route.candidate_id === candidate.candidate_id, `route ${index + 1} candidate identity changed`);
    ok(route.requested_url === candidate.url && route.requested_url === EXPECTED_FOLLOWUP_URLS[index], `route ${index + 1} URL changed`);
    ok(route.unit_ordinal === candidate.unit_ordinals[0], `route ${index + 1} unit changed`);
    ok(route.route_type === 'exact_candidate_url_get' && route.maximum_attempts === 1, `route ${index + 1} execution changed`);
    ok(route.candidate_is_admitted_source === false && route.result_spawned_requests === 0, `route ${index + 1} gained authority`);
    const host = new URL(route.requested_url).hostname.replace(/^www\./, '');
    const expectedSuffix = host.endsWith('stifel.com') ? 'stifel.com' : host;
    ok(route.allowed_final_host_suffix === expectedSuffix, `route ${index + 1} host rule changed`);
  }
  const ledger = buildRouteLedger(value);
  ok(Buffer.byteLength(ledger) === ROUTE_LEDGER_BYTES && sha256Bytes(Buffer.from(ledger)) === ROUTE_LEDGER_SHA256, 'derived followup route ledger changed');
  const e = value.execution_contract;
  ok(e.routes_frozen_before_requests === true && e.maximum_attempts_per_route === 1, 'followup freeze or attempts changed');
  ok(e.maximum_response_body_bytes === 10485760 && e.connect_timeout_seconds === 15 && e.total_timeout_seconds === 60 && e.maximum_parallel_workers === 4, 'followup resource bounds changed');
  ok(e.redirects === 'followed_and_recorded' && e.allowed_final_host_rule === 'exact_declared_suffix_or_subdomain', 'followup redirect or host contract changed');
  ok(e.same_host_link_census === true && e.result_spawned_requests === 0, 'followup link census or spawning changed');
  ok(e.candidate_admission_without_separate_adjudication === false && e.automatic_class_closure === false, 'followup authority changed');
  ok(value.current_counts.route_attempts === 0 && value.current_counts.terminal_routes === 0 && value.current_counts.same_host_link_candidates === 0 && value.current_counts.admitted_sources === 0 && value.current_counts.class_closed === false, 'pre-execution counts changed');
  for (const key of ['outside_human_dependency', 'reviewed_disposition_changed', 'capital_conversion_finding', 'favoritism_finding', 'extraction_finding', 'coordination_finding', 'common_purpose_finding', 'complete_compact_finding']) {
    ok(value.authority_boundaries[key] === false, `followup boundary ${key} changed`);
  }
  ok(value.authority_boundaries.external_contacts === 0 && value.authority_boundaries.external_reviews === 0, 'external count changed');
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) ok(value.authority_boundaries[key] === 'none', `followup ${key} changed`);
  return true;
}

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd02-candidate-adjudication.schema.json', 'schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema closure changed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd02-wave03-search-candidate-adjudication@1', 'schema version changed');
  ok(schema?.properties?.shards?.minItems === 7 && schema?.properties?.shards?.maxItems === 7, 'schema shard denominator changed');
  ok(schema?.properties?.counts?.properties?.candidate_rows?.const === 480, 'schema row denominator changed');
  ok(schema?.properties?.counts?.properties?.fixed_followup_routes?.const === 10, 'schema followup denominator changed');
  ok(schema?.$defs?.candidate?.additionalProperties === false, 'candidate item schema reopened');
  return true;
}

export function validateRepository(root = ROOT) {
  const receipt = read(root, RECEIPT_PATH);
  const adjudication = loadCandidateAdjudication(root);
  const followup = read(root, FOLLOWUP_PATH);
  const schema = read(root, SCHEMA_PATH);
  validateExecutionReceipt(receipt);
  validateCandidateAdjudication(adjudication);
  validateFollowupProtocol(followup, adjudication);
  validateSchemaContract(schema);
  ok(sha256File(root, RECEIPT_PATH) === RECEIPT_SHA256, 'execution receipt file digest changed');
  ok(sha256File(root, ADJUDICATION_INDEX_PATH) === ADJUDICATION_INDEX_SHA256, 'candidate adjudication index digest changed');
  ok(sha256File(root, FOLLOWUP_PATH) === FOLLOWUP_SHA256, 'followup protocol file digest changed');
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status === 0) {
    ok(spawnSync('git', ['merge-base', '--is-ancestor', PROTOCOL_MERGE, 'HEAD'], { cwd: root }).status === 0, 'permanent search-protocol merge is not an ancestor');
    ok(spawnSync('git', ['cat-file', '-e', `${PROTOCOL_MERGE}:data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-protocol.json`], { cwd: root }).status === 0, 'parent search protocol missing from exact merge');
  }
  return true;
}

function run() {
  validateRepository(ROOT);
  console.log('RD-02 Wave-03 candidate adjudication validated: 210 / 210 URLs terminally classified; 10 exact followups frozen; class still open');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
