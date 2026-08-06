#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(repoRoot, 'data/intake/schoolhouse-irs-candidate-latest-filing-xml-v6');
const expectedFiles = [
  'acquisition-SHA256SUMS',
  'adjudication.json',
  'artifact-manifest.json',
  'range-receipts.jsonl',
  'route-policy.json',
  'selection.jsonl',
  'source-custody.json',
  'source-receipt.json',
  'summary.json',
  'xml-results.jsonl',
];
const acquisitionFiles = [
  'adjudication.json',
  'artifact-manifest.json',
  'range-receipts.jsonl',
  'route-policy.json',
  'selection.jsonl',
  'source-receipt.json',
  'summary.json',
  'xml-results.jsonl',
];
const load = (name) => JSON.parse(readFileSync(path.join(dataRoot, name), 'utf8'));
const rows = (name) => readFileSync(path.join(dataRoot, name), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const bytes = (name) => readFileSync(path.join(dataRoot, name));
const sha = (name) => createHash('sha256').update(bytes(name)).digest('hex');
const parseSums = () => {
  const result = new Map();
  for (const line of readFileSync(path.join(dataRoot, 'acquisition-SHA256SUMS'), 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
    assert(match, `invalid acquisition-SHA256SUMS row: ${line}`);
    assert(!result.has(match[2]), `duplicate acquisition digest: ${match[2]}`);
    result.set(match[2], match[1]);
  }
  return result;
};

assert.deepEqual(readdirSync(dataRoot).sort(), expectedFiles, 'permanent data-file denominator drift');
const custody = load('source-custody.json');
const summary = load('summary.json');
const policy = load('route-policy.json');
const adjudication = load('adjudication.json');
const artifact = load('artifact-manifest.json');
const sourceReceipt = load('source-receipt.json');
const selection = rows('selection.jsonl');
const results = rows('xml-results.jsonl');
const ranges = rows('range-receipts.jsonl');
const sums = parseSums();

assert.equal(custody.schema_version, 'schoolhouse-irs-candidate-latest-filing-xml-v6-custody@1');
assert.equal(custody.state, 'terminal_privacy_minimized_latest_filing_xml_v6_public_schoolhouse_identity_unresolved');
assert.equal(custody.canonical_parent_commit, 'a49b18304a69e9637cd854d38e80b67d4165cc6c');
assert.equal(custody.canonical_parent_tree, 'fdc4acfb8b3381872c157d0bf9a8bd6947631bd3');
assert.equal(custody.predecessor_filing_index_merge_commit, '773bdf96026e9fe6d5e11f4d9dffa1629e2c0ea3');
assert.equal(custody.predecessor_filing_index_tree, '73d54e1b38eeaff00425108b43294876cc634510');
assert.equal(custody.acquisition_workflow_run_id, 31109883159);
assert.equal(custody.acquisition_head, '0d026a31e200c2f613beae5da7025274950a7a5d');
assert.equal(custody.acquisition_artifact_id, 8971196288);
assert.equal(custody.acquisition_artifact_digest, 'sha256:2ab96de4007eea40668e17b184cf169670ab2b0e06eacca31603a72f446f6031');
assert.equal(custody.locator_workflow_run_id, 31108653166);
assert.equal(custody.locator_artifact_id, 8970691385);
assert.equal(custody.locator_artifact_digest, 'sha256:42fed8f0dbafe0f504b4234040e2d4e56920888aa846ac58debcf61fe8794333');
assert.equal(custody.rebuild_contract.byte_identical_to_claimed_v5_package, false);
assert.equal(custody.rebuild_contract.acquisition_bytes_reused_exactly, true);
assert.equal(custody.rebuild_contract.authored_layer_rebuilt, true);
assert.equal(custody.rebuild_contract.product_version, 'v6');
assert.equal(custody.superseded_v5_materializer.expected_bundle_bytes, 34492);
assert.equal(custody.superseded_v5_materializer.expected_bundle_sha256, '8d708c542e632eb528cf89a79f6b1482e2495ec49d1bbd33c08c352b80963c4e');
assert.equal(custody.superseded_v5_materializer.observed_bundle_bytes, 20083);
assert.equal(custody.superseded_v5_materializer.observed_bundle_sha256, '7e255a2b5ebfde99d7da80f681a256c3b505d4809a2eef55f613f146ee678cc2');
assert.equal(custody.superseded_v5_materializer.disposition, 'typed_transport_defect_no_product_authority');

assert.deepEqual([...sums.keys()].sort(), acquisitionFiles, 'acquisition digest denominator drift');
for (const [name, digest] of sums) assert.equal(sha(name), digest, `acquisition digest mismatch: ${name}`);
const expectedSourceFiles = ['acquisition-SHA256SUMS', ...acquisitionFiles].sort();
assert.deepEqual(custody.source_files.map((row) => row.path).sort(), expectedSourceFiles, 'source-file denominator drift');
for (const file of custody.source_files) {
  assert.equal(sha(file.path), file.sha256, `source SHA drift: ${file.path}`);
  assert.equal(bytes(file.path).length, file.bytes, `source byte drift: ${file.path}`);
}

assert.equal(summary.schema_version, 'schoolhouse-irs-candidate-latest-filing-xml-v5@1');
assert.equal(summary.state, 'terminal_privacy_repaired_latest_filing_xml_v5');
const exactCounts = {
  sealed_candidate_rows: 641,
  sealed_candidate_eins: 438,
  filing_index_match_rows: 486,
  candidate_eins_with_filing_rows: 92,
  selected_latest_xml_routes: 92,
  selected_latest_xml_routes_with_exact_locator: 54,
  selected_latest_xml_routes_without_locator: 38,
  successful_xml_screens: 54,
  request_count: 162,
  range_response_bytes: 300091,
  candidate_legal_name_alignment_rows: 48,
  target_term_hit_xml_rows: 51,
  target_term_total_hits: 144,
  mechanism_term_hit_xml_rows: 2,
  mechanism_term_total_hits: 3,
  schedule_i_rows: 5,
  schedule_l_rows: 5,
  schedule_o_rows: 47,
  schedule_r_rows: 4,
  xml_elements_screened: 22839,
  xml_text_characters_screened: 451326,
};
for (const [key, value] of Object.entries(exactCounts)) assert.equal(summary[key], value, `summary count drift: ${key}`);
for (const key of [
  'observed_organization_name_values_retained', 'officer_or_person_name_values_retained',
  'street_address_rows_retained', 'contact_detail_rows_retained', 'preparer_rows_retained',
  'private_support_rows', 'identities_admitted', 'relationships_admitted',
  'negative_existence_claims_created', 'batch_zip_fetches', 'result_spawned_requests',
  'query_submissions', 'forms_submitted', 'cookie_replays', 'subscription_purchases',
]) assert.equal(summary[key], 0, `summary authority/retention drift: ${key}`);
for (const key of ['raw_archive_retained', 'raw_central_directory_retained', 'raw_term_text_retained', 'raw_xml_retained']) {
  assert.equal(summary[key], false, `summary raw-retention drift: ${key}`);
}
assert.equal(summary.outside_human_dependency, false);
for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) assert.equal(summary[key], 'none', `summary effect drift: ${key}`);

assert.equal(selection.length, 92);
assert.equal(results.length, 92);
assert.equal(ranges.length, 162);
assert.deepEqual(selection.map((row) => row.selection_ordinal), Array.from({length: 92}, (_, index) => index + 1));
assert.equal(new Set(selection.map((row) => row.ein)).size, 92);
assert.equal(new Set(selection.map((row) => row.object_id)).size, 92);
assert.deepEqual(
  Object.fromEntries([...selection.reduce((m, row) => m.set(row.locator_state, (m.get(row.locator_state) ?? 0) + 1), new Map()).entries()].sort()),
  {exact_one_locator: 54, missing_locator: 38},
);
const selectionById = new Map(selection.map((row) => [row.selection_id, row]));
assert.equal(selectionById.size, 92);
for (const row of selection) {
  assert.equal(row.schema_version, 'schoolhouse-irs-candidate-latest-filing-selection-v5@1');
  assert.equal(row.selection_rule, 'maximum_index_year_then_object_id_per_candidate_ein');
  assert.equal(row.raw_index_taxpayer_name_retained, false);
  assert.equal(row.observed_xml_organization_name_values_retained, 0);
}

let screened = 0;
let targetRows = 0;
let targetHits = 0;
let mechanismRows = 0;
let mechanismHits = 0;
let resultBytes = 0;
const schedules = {schedule_i: 0, schedule_l: 0, schedule_o: 0, schedule_r: 0};
const screenedObjects = new Set();
const forbiddenRetainedKeys = new Set([
  'observed_organization_name', 'filing_organization_name', 'raw_organization_name',
  'officer_name', 'person_name', 'street_address', 'contact_detail', 'preparer_value',
  'raw_xml', 'raw_term_text', 'archive_body', 'central_directory_body', 'private_support_value',
]);
const inspectForbiddenKeys = (value) => {
  if (Array.isArray(value)) return value.forEach(inspectForbiddenKeys);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!forbiddenRetainedKeys.has(key.toLowerCase()), `forbidden retained field: ${key}`);
    inspectForbiddenKeys(child);
  }
};
for (const row of results) {
  inspectForbiddenKeys(row);
  const selected = selectionById.get(row.selection_id);
  assert(selected, 'result without selection');
  for (const key of ['ein', 'object_id', 'filing_match_id', 'selection_ordinal', 'locator_state', 'return_type', 'tax_period', 'index_year']) {
    assert.equal(row[key], selected[key], `selection/result mismatch: ${key}`);
  }
  assert.equal(row.schema_version, 'schoolhouse-irs-candidate-latest-filing-xml-result-v5@1');
  assert.equal(row.promotes_to, 'candidate_only');
  assert.equal(row.identity_admitted, false);
  assert.equal(row.relationship_admitted, false);
  assert.equal(row.negative_existence_claim_created, false);
  assert.equal(row.outside_human_dependency, false);
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) assert.equal(row[key], 'none', `result effect drift: ${key}`);
  for (const key of [
    'observed_organization_name_values_retained', 'officer_or_person_name_values_retained',
    'street_address_rows_retained', 'contact_detail_rows_retained', 'preparer_rows_retained', 'private_support_rows',
  ]) assert.equal(row[key], 0, `result retention drift: ${key}`);
  for (const key of ['raw_archive_retained', 'raw_central_directory_retained', 'raw_term_text_retained', 'raw_xml_retained']) {
    assert.equal(row[key], false, `result raw retention drift: ${key}`);
  }
  if (row.state === 'member_not_located_in_sealed_locator_denominator') {
    assert.equal(row.locator_state, 'missing_locator');
    assert.equal(row.source_requests, 0);
    assert.equal(row.source_response_bytes, 0);
    assert(!Object.hasOwn(row, 'candidate_legal_name_alignment'));
  } else {
    assert.equal(row.state, 'screened_official_xml');
    assert.equal(row.locator_state, 'exact_one_locator');
    assert.equal(row.source_requests, 3);
    assert.equal(row.filer_ein_present, true);
    assert.equal(row.filer_ein_matches_candidate, true);
    assert.equal(typeof row.candidate_legal_name_alignment, 'boolean');
    assert.equal(typeof row.target_term_total_hits, 'number');
    assert.equal(typeof row.mechanism_term_total_hits, 'number');
    screened += 1;
    screenedObjects.add(row.object_id);
    targetRows += Number(row.target_term_total_hits > 0);
    targetHits += row.target_term_total_hits;
    mechanismRows += Number(row.mechanism_term_total_hits > 0);
    mechanismHits += row.mechanism_term_total_hits;
    resultBytes += row.source_response_bytes;
    for (const key of Object.keys(schedules)) {
      assert.equal(typeof row[key], 'boolean', `schedule flag invalid: ${key}`);
      schedules[key] += Number(row[key]);
    }
  }
}
assert.equal(screened, 54);
assert.deepEqual([targetRows, targetHits, mechanismRows, mechanismHits], [51, 144, 2, 3]);
assert.deepEqual(schedules, {schedule_i: 5, schedule_l: 5, schedule_o: 47, schedule_r: 4});
assert.equal(resultBytes, 300091);

const rangeCounts = new Map();
const phases = new Map();
let rangeBytes = 0;
for (const row of ranges) {
  inspectForbiddenKeys(row);
  assert.equal(row.schema_version, 'schoolhouse-irs-candidate-latest-filing-xml-range-receipt@1');
  assert.equal(row.state, 'range_acquired');
  assert.equal(row.request_method, 'GET_RANGE');
  assert.equal(row.http_status, 206);
  assert.equal(row.raw_source_retained, false);
  assert.equal(row.outside_human_dependency, false);
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) assert.equal(row[key], 'none', `range effect drift: ${key}`);
  assert(screenedObjects.has(row.object_id));
  assert.match(row.response_sha256, /^[0-9a-f]{64}$/);
  rangeCounts.set(row.object_id, (rangeCounts.get(row.object_id) ?? 0) + 1);
  phases.set(row.phase, (phases.get(row.phase) ?? 0) + 1);
  rangeBytes += row.response_bytes;
}
assert.equal(rangeCounts.size, 54);
assert.deepEqual(new Set(rangeCounts.values()), new Set([3]));
assert.deepEqual(Object.fromEntries([...phases.entries()].sort()), {local_header: 54, local_name_extra: 54, member_payload: 54});
assert.equal(rangeBytes, 300091);

assert.equal(policy.schema_version, 'schoolhouse-irs-candidate-latest-filing-xml-policy-v5@1');
assert.equal(policy.retention.first_header_name_used_only_for_alignment_boolean, true);
assert.equal(policy.retention.observed_organization_name_values_retained, 0);
assert.equal(policy.request_bounds.exact_sealed_member_locators_only, true);
assert.equal(policy.request_bounds.full_archive_fallback_forbidden, true);
assert.equal(adjudication.state, 'candidate_latest_filing_xml_screen_only_public_schoolhouse_identity_unresolved');
assert.equal(adjudication.public_schoolhouse_identity_admitted, false);
assert.equal(adjudication.negative_existence_claim_created, false);
assert.deepEqual(artifact.counts, {selection_rows: 92, xml_result_rows: 92, range_receipt_rows: 162});
assert.equal(artifact.raw_source_retained, false);
assert.equal(sourceReceipt.range_only_member_access, true);
assert.equal(sourceReceipt.batch_zip_downloaded, false);
assert.equal(sourceReceipt.selected_latest_xml_routes, 92);

assert.equal(custody.counts.selected_latest_xml_routes, 92);
assert.equal(custody.counts.successful_xml_screens, 54);
assert.equal(custody.counts.selected_missing_locator_rows, 38);
assert.equal(custody.authority.identities_admitted, 0);
assert.equal(custody.authority.relationships_admitted, 0);
assert.equal(custody.authority.negative_existence_claims, 0);
assert.equal(custody.authority.outside_human_dependency, false);
assert.equal(custody.authority.publication_effect, 'none');
assert.equal(custody.authority.adoption_effect, 'none');
assert.equal(custody.authority.graph_effect, 'none');
assert.equal(custody.authority.public_schoolhouse_legal_identity, 'unresolved');

console.log(JSON.stringify({
  state: custody.state,
  selected_latest_xml_routes: 92,
  successful_xml_screens: 54,
  selected_missing_locator_rows: 38,
  candidate_legal_name_alignment_rows: 48,
  target_term_hit_xml_rows: 51,
  mechanism_term_hit_xml_rows: 2,
  observed_organization_name_values_retained: 0,
  identities_admitted: 0,
  relationships_admitted: 0,
  outside_human_dependency: false,
  graph_effect: 'none',
}, null, 2));
