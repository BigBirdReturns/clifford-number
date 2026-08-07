import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACQUISITION_ARTIFACT_ID,
  ACQUISITION_ARTIFACT_NAME,
  ACQUISITION_ARTIFACT_SHA256,
  ACQUISITION_ARTIFACT_ZIP_BYTES,
  ACQUISITION_HEAD,
  ACQUISITION_PR,
  ACQUISITION_WORKFLOW_RUN,
  ARCHIVE_PATH,
  BUILD_PATH,
  CANONICAL_PARENT,
  CANONICAL_PARENT_TREE,
  CUSTODY_PATH,
  DOC_PATH,
  MANIFEST_PATH,
  PERMANENT_PATHS,
  SUMS_PATH,
  TEST_PATH,
  VALIDATE_PATH,
  applyProduct,
  deriveProduct,
  sha256,
} from './build-schoolhouse-irs-historical-filing-website-screen-custody.mjs';

const PROHIBITED_VALUE_KEYS = Object.freeze(new Set([
  'organization_name', 'observed_organization_name', 'taxpayer_name',
  'website_value', 'observed_website_value', 'officer_name', 'person_name',
  'street_address', 'address_line_1', 'address_line_2', 'city_name',
  'postal_code', 'phone_number', 'email_address', 'preparer_name',
  'preparer_value', 'raw_xml', 'raw_archive', 'central_directory',
  'matched_term_text', 'private_support',
]));

function walkForProhibitedKeys(value, trail = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForProhibitedKeys(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!PROHIBITED_VALUE_KEYS.has(key), `${trail}.${key} is prohibited retained content`);
    walkForProhibitedKeys(child, `${trail}.${key}`);
  }
}

function assertAuthority(row, label) {
  assert.equal(row.promotes_to, 'candidate_only', `${label}.promotes_to`);
  if ('identity_admitted' in row) assert.equal(row.identity_admitted, false, `${label}.identity_admitted`);
  if ('relationship_admitted' in row) assert.equal(row.relationship_admitted, false, `${label}.relationship_admitted`);
  if ('negative_existence_claim_created' in row) assert.equal(row.negative_existence_claim_created, false, `${label}.negative_existence_claim_created`);
  assert.equal(row.outside_human_dependency, false, `${label}.outside_human_dependency`);
  assert.equal(row.publication_effect, 'none', `${label}.publication_effect`);
  assert.equal(row.adoption_effect, 'none', `${label}.adoption_effect`);
  assert.equal(row.graph_effect, 'none', `${label}.graph_effect`);
}

export async function validateProduct(repoRoot = process.cwd()) {
  await applyProduct({ repoRoot, write: false });
  const generated = await deriveProduct(repoRoot);
  try {
    const { sourceCustody, productManifest, sealed } = generated;
    const { summary, receipt, policy, adjudication, artifactManifest, selection, results, ranges } = sealed;

    const sums = (await readFile(path.join(repoRoot, SUMS_PATH), 'utf8')).trimEnd().split('\n');
    assert.equal(sums.length, 7, 'outer SHA256SUMS denominator');
    const expectedOrder = [ARCHIVE_PATH, CUSTODY_PATH, MANIFEST_PATH, DOC_PATH, BUILD_PATH, TEST_PATH, VALIDATE_PATH];
    const observedOrder = [];
    for (const line of sums) {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/);
      assert(match, `malformed outer checksum row: ${line}`);
      const [, expected, rel] = match;
      observedOrder.push(rel);
      assert.equal(sha256(await readFile(path.join(repoRoot, rel))), expected, `${rel} outer checksum`);
    }
    assert.deepEqual(observedOrder, expectedOrder, 'outer checksum order');

    assert.deepEqual(productManifest.permanent_paths, PERMANENT_PATHS);
    assert.equal(productManifest.permanent_path_count, 8);
    assert.equal(productManifest.sealed_archive.path, ARCHIVE_PATH);
    assert.equal(productManifest.sealed_archive.bytes, ACQUISITION_ARTIFACT_ZIP_BYTES);
    assert.equal(productManifest.sealed_archive.sha256, ACQUISITION_ARTIFACT_SHA256);
    assert.equal(productManifest.sealed_archive.member_count, 11);

    assert.equal(sourceCustody.canonical_parent_commit, CANONICAL_PARENT);
    assert.equal(sourceCustody.canonical_parent_tree, CANONICAL_PARENT_TREE);
    assert.equal(sourceCustody.acquisition_pr, ACQUISITION_PR);
    assert.equal(sourceCustody.acquisition_head, ACQUISITION_HEAD);
    assert.equal(sourceCustody.acquisition_workflow_run_id, ACQUISITION_WORKFLOW_RUN);
    assert.equal(sourceCustody.acquisition_artifact_id, ACQUISITION_ARTIFACT_ID);
    assert.equal(sourceCustody.acquisition_artifact_name, ACQUISITION_ARTIFACT_NAME);
    assert.equal(sourceCustody.acquisition_artifact_zip_bytes, ACQUISITION_ARTIFACT_ZIP_BYTES);
    assert.equal(sourceCustody.acquisition_artifact_zip_sha256, ACQUISITION_ARTIFACT_SHA256);

    walkForProhibitedKeys({ sourceCustody, productManifest, summary, receipt, policy, adjudication, artifactManifest, selection, results, ranges });

    assert.equal(receipt.canonical_main, CANONICAL_PARENT);
    assert.equal(receipt.canonical_tree, CANONICAL_PARENT_TREE);
    assert.equal(artifactManifest.files.length, 7);
    assert.deepEqual(artifactManifest.counts, {
      historical_selection_rows: 180,
      identifier_grade_candidate_rows: 0,
      range_request_attempts: 543,
      result_rows: 180,
    });

    assert.equal(selection.length, 180);
    assert.equal(results.length, 180);
    assert.equal(ranges.length, 543);

    const selectionById = new Map();
    const objects = new Set();
    const eins = new Set();
    const archives = new Set();
    let compressedBytes = 0;
    let uncompressedBytes = 0;
    selection.forEach((row, index) => {
      assert.equal(row.schema_version, 'schoolhouse-irs-historical-filing-website-selection-v1@1');
      assert.equal(row.selection_ordinal, index + 1);
      assert.equal(row.selection_id, `historical-website:${row.ein}:${row.object_id}`);
      assert.equal(row.selection_rule, 'all_exact_locator_objects_excluding_v6_latest_exact_objects');
      assert.match(row.ein, /^\d{9}$/);
      assert.match(row.object_id, /^\d{18}$/);
      assert.equal(row.observed_organization_name_values_retained, 0);
      assert.equal(row.observed_website_values_retained, 0);
      assert.equal(row.raw_index_taxpayer_name_retained, false);
      assert(!selectionById.has(row.selection_id));
      assert(!objects.has(row.object_id));
      selectionById.set(row.selection_id, row);
      objects.add(row.object_id);
      eins.add(row.ein);
      archives.add(row.archive_id);
      compressedBytes += row.member_compressed_size;
      uncompressedBytes += row.member_uncompressed_size;
    });
    assert.equal(eins.size, 72);
    assert.equal(archives.size, 45);
    assert.equal(compressedBytes, 988415);
    assert.equal(uncompressedBytes, 4777706);

    const resultsById = new Map();
    let legalAlignments = 0;
    let websiteRows = 0;
    let exactHostRows = 0;
    let candidates = 0;
    let resultRequests = 0;
    let responseBytes = 0;
    let xmlBytes = 0;
    let xmlElements = 0;
    let xmlText = 0;
    results.forEach((row, index) => {
      const selected = selectionById.get(row.selection_id);
      assert(selected, `result ${index} lacks selection`);
      assert.equal(row.schema_version, 'schoolhouse-irs-historical-filing-website-result-v1@1');
      assert.equal(row.selection_ordinal, index + 1);
      for (const key of ['archive_id', 'archive_url_sha256', 'ein', 'filing_match_id', 'index_year', 'member_compressed_size', 'member_compression_method', 'member_crc32', 'member_name', 'member_uncompressed_size', 'object_id', 'return_id', 'return_type', 'tax_period']) {
        assert.deepEqual(row[key], selected[key], `result ${index} ${key}`);
      }
      assert.equal(row.state, 'screened_official_xml');
      assert.equal(row.filer_ein_present, true);
      assert.equal(row.filer_ein_matches_candidate, true);
      assert.equal(row.school_house_host_exact_match, false);
      assert.equal(row.school_house_host_match_count, 0);
      assert.equal(row.identifier_grade_candidate, false);
      assert.equal(row.identity_admitted, false);
      assert.equal(row.relationship_admitted, false);
      assert.equal(row.negative_existence_claim_created, false);
      assertAuthority(row, `result ${index}`);
      for (const key of ['observed_organization_name_values_retained', 'observed_website_values_retained', 'officer_or_person_name_values_retained', 'street_address_rows_retained', 'contact_detail_rows_retained', 'preparer_rows_retained', 'private_support_rows']) assert.equal(row[key], 0, `result ${index} ${key}`);
      for (const key of ['raw_xml_retained', 'raw_archive_retained', 'raw_central_directory_retained', 'raw_term_text_retained']) assert.equal(row[key], false, `result ${index} ${key}`);
      assert(row.source_requests === 3 || row.source_requests === 4);
      assert.equal(row.website_field_count > 0, row.website_field_local_names.length > 0);
      assert.equal(row.website_field_nonempty_count > 0, row.website_field_count > 0);
      assert(row.website_field_local_names.every((name) => name === 'WebsiteAddressTxt'));
      const conjunction = row.filer_ein_matches_candidate && row.candidate_legal_name_alignment && row.school_house_host_exact_match;
      assert.equal(row.identifier_grade_candidate, conjunction);
      assert(!resultsById.has(row.selection_id));
      resultsById.set(row.selection_id, row);
      legalAlignments += Number(row.candidate_legal_name_alignment);
      websiteRows += Number(row.website_field_count > 0);
      exactHostRows += Number(row.school_house_host_exact_match);
      candidates += Number(row.identifier_grade_candidate);
      resultRequests += row.source_requests;
      responseBytes += row.source_response_bytes;
      xmlBytes += row.xml_bytes;
      xmlElements += row.xml_elements_screened;
      xmlText += row.xml_text_characters_screened;
    });
    assert.equal(legalAlignments, 149);
    assert.equal(websiteRows, 161);
    assert.equal(exactHostRows, 0);
    assert.equal(candidates, 0);
    assert.equal(resultRequests, 543);
    assert.equal(responseBytes, 1000547);
    assert.equal(xmlBytes, 4777706);
    assert.equal(xmlElements, 74480);
    assert.equal(xmlText, 642248);

    const requestIds = new Set();
    const rangesBySelection = new Map();
    let acquired = 0;
    let errors = 0;
    let rangeBytes = 0;
    ranges.forEach((row, index) => {
      assert.equal(row.schema_version, 'schoolhouse-irs-historical-filing-website-range-receipt-v1@1');
      assert(selectionById.has(row.selection_id));
      assert(['local_header_fixed', 'local_header_tail', 'member_payload'].includes(row.phase));
      assert(row.attempt === 1 || row.attempt === 2);
      assert(!requestIds.has(row.request_id));
      requestIds.add(row.request_id);
      assertAuthority(row, `range ${index}`);
      if (row.state === 'range_acquired') {
        assert.equal(row.http_status, 206);
        assert.equal(row.content_range_present, true);
        assert.equal(row.response_bytes, row.range_end - row.range_start + 1);
        acquired += 1;
        rangeBytes += row.response_bytes;
      } else {
        assert.equal(row.state, 'transport_error');
        assert.equal(row.phase, 'local_header_tail');
        assert.equal(row.attempt, 1);
        assert.equal(row.http_status, null);
        assert.equal(row.content_range_present, false);
        assert.equal(row.response_bytes, 0);
        assert.equal(row.response_sha256, null);
        errors += 1;
      }
      const bucket = rangesBySelection.get(row.selection_id) ?? [];
      bucket.push(row);
      rangesBySelection.set(row.selection_id, bucket);
    });
    assert.equal(acquired, 540);
    assert.equal(errors, 3);
    assert.equal(rangeBytes, 1000547);
    for (const [selectionId, rows] of rangesBySelection) {
      const acquiredRows = rows.filter((row) => row.state === 'range_acquired');
      assert.equal(acquiredRows.length, 3);
      assert.deepEqual(acquiredRows.map((row) => row.phase).sort(), ['local_header_fixed', 'local_header_tail', 'member_payload']);
      assert.equal(rows.length, resultsById.get(selectionId).source_requests);
    }

    assert.equal(summary.state, 'terminal_historical_website_identifier_screen_no_identifier_grade_candidate');
    assert.equal(summary.historical_exact_locator_rows, 180);
    assert.equal(summary.historical_unique_candidate_eins, 72);
    assert.equal(summary.historical_archive_count, 45);
    assert.equal(summary.latest_exact_object_rows_excluded, 54);
    assert.equal(summary.screened_official_xml_rows, 180);
    assert.deepEqual(summary.terminal_state_counts, { screened_official_xml: 180 });
    assert.equal(summary.range_request_attempts, 543);
    assert.equal(summary.range_response_bytes, 1000547);
    assert.equal(summary.website_field_present_rows, 161);
    assert.equal(summary.website_field_nonempty_rows, 161);
    assert.equal(summary.candidate_legal_name_alignment_rows, 149);
    assert.equal(summary.school_house_exact_website_host_rows, 0);
    assert.equal(summary.identifier_grade_candidate_rows, 0);
    assert.equal(summary.identities_admitted, 0);
    assert.equal(summary.relationships_admitted, 0);
    assert.equal(summary.negative_existence_claims_created, 0);
    assert.equal(summary.outside_human_dependency, false);
    assert.equal(summary.publication_effect, 'none');
    assert.equal(summary.adoption_effect, 'none');
    assert.equal(summary.graph_effect, 'none');

    assert.equal(policy.selection_contract.historical_exact_locator_rows, 180);
    assert.equal(policy.selection_contract.historical_unique_candidate_eins, 72);
    assert.equal(policy.selection_contract.latest_exact_object_rows_excluded, 54);
    assert.equal(policy.selection_contract.sealed_exact_locator_rows, 234);
    assert.equal(policy.request_bounds.maximum_total_requests, 1080);
    assert.equal(policy.request_bounds.maximum_ranges_per_object, 3);
    assert.equal(policy.request_bounds.maximum_attempts_per_range, 2);
    assert.equal(policy.request_bounds.maximum_parallel_workers, 4);
    assert.equal(policy.request_bounds.maximum_aggregate_response_bytes, 16777216);
    assert.equal(policy.request_bounds.full_archive_fallback_forbidden, true);
    assert.deepEqual(policy.identifier_grade_candidate_rule.all_required, [
      'filer_ein_matches_candidate',
      'candidate_legal_name_alignment',
      'school_house_host_exact_match_in_official_website_field',
    ]);
    assert.equal(policy.identifier_grade_candidate_rule.canonical_host, 'school.house');
    assert.equal(policy.identifier_grade_candidate_rule.positive_candidate_requires_separate_adjudication, true);

    assert.equal(adjudication.state, summary.state);
    assert.equal(adjudication.identifier_grade_candidate_rows, 0);
    assert.equal(adjudication.public_schoolhouse_identity_admitted, false);
    assert.equal(adjudication.fiscal_sponsor_relationship_admitted, false);
    assert.equal(adjudication.funding_relationship_admitted, false);
    assert.equal(adjudication.governance_or_control_relationship_admitted, false);
    assert.equal(adjudication.related_party_relationship_admitted, false);
    assert.equal(adjudication.negative_existence_claim_created, false);
    assert.equal(adjudication.promotes_to, 'candidate_only');
    assert.equal(adjudication.outside_human_dependency, false);
    assert.equal(adjudication.publication_effect, 'none');
    assert.equal(adjudication.adoption_effect, 'none');
    assert.equal(adjudication.graph_effect, 'none');

    assert.equal(sourceCustody.authority.identities_admitted, 0);
    assert.equal(sourceCustody.authority.relationships_admitted, 0);
    assert.equal(sourceCustody.authority.negative_existence_claims_created, 0);
    assert.equal(sourceCustody.authority.public_schoolhouse_legal_identity, 'unresolved');
    assert.equal(sourceCustody.interpretation.zero_exact_host_rows_is_bounded_screen_result_not_global_absence, true);
    assert.equal(sourceCustody.interpretation.identical_source_retry_authorized, false);

    return { selection_rows: 180, result_rows: 180, range_rows: 543, website_rows: 161, exact_host_rows: 0, candidates: 0 };
  } finally {
    await import('node:fs/promises').then(({ rm }) => rm(generated.sealed.extracted, { recursive: true, force: true }));
  }
}

async function main() {
  const result = await validateProduct();
  console.log(`historical_filing_website_custody=pass selection=${result.selection_rows} results=${result.result_rows} ranges=${result.range_rows} website_fields=${result.website_rows} exact_host=${result.exact_host_rows} candidates=${result.candidates}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
