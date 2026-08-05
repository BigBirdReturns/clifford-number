import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIR = 'data/intake/bvvc-defense-capital';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
  });
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function collectReceiptIds(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReceiptIds(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'receipt_id' && typeof item === 'string') out.push(item);
    else if (key === 'receipt_ids' && Array.isArray(item)) {
      for (const id of item) if (typeof id === 'string') out.push(id);
    } else collectReceiptIds(item, out);
  }
  return out;
}

function unique(values) {
  return new Set(values).size === values.length;
}

export function validateBVVCDefenseCapital(dir = DEFAULT_DIR) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const manifest = readJson(path.join(dir, 'manifest.json'));
  const sourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const leadership = manifest.storage_contract.leadership_current_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const leadershipHistory = readJsonl(path.join(dir, 'leadership-history.jsonl'));
  const portfolio = manifest.storage_contract.portfolio_current_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));
  const vehicles = readJsonl(path.join(dir, 'vehicles-offerings.jsonl'));
  const transactions = readJsonl(path.join(dir, 'transactions.jsonl'));
  const claims = readJsonl(path.join(dir, 'institutional-claims.jsonl'));
  const rejected = readJsonl(path.join(dir, 'rejected-joins.jsonl'));
  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));
  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));
  const portfolioDelta = readJsonl(path.join(dir, 'portfolio-delta-candidates.jsonl'));
  const secRouteResults = readJsonl(path.join(dir, 'sec-form-d-route-results.jsonl'));
  const secRouteCustody = readJson(path.join(dir, 'sec-form-d-route-custody.json'));
  const schoolhouseIrsRoutes = readJsonl(path.join(dir, 'schoolhouse-irs-source-routes.jsonl'));
  const schoolhouseIrsCandidates = manifest.storage_contract.schoolhouse_irs_candidate_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const schoolhouseIrsAdjudication = readJson(path.join(dir, 'schoolhouse-irs-identity-adjudication.json'));
  const stateRegistryRouteResults = readJsonl(path.join(dir, 'state-registry-route-results.jsonl'));
  const stateRegistryRouteCustody = readJson(path.join(dir, 'state-registry-route-custody.json'));
  const schoolhouseFlFictitiousSource = readJson(path.join(dir, 'schoolhouse-fl-fictitious-source-receipt.json'));
  const schoolhouseFlFictitiousMembers = readJsonl(path.join(dir, 'schoolhouse-fl-fictitious-member-inventory.jsonl'));
  const schoolhouseFlFictitiousCandidates = readJsonl(path.join(dir, 'schoolhouse-fl-fictitious-candidates.jsonl'));
  const schoolhouseFlFictitiousAdjudication = readJson(path.join(dir, 'schoolhouse-fl-fictitious-adjudication.json'));
  const schoolhouseFlCorporateSource = readJson(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-source-receipt.json'));
  const schoolhouseFlCorporateIndex = readJson(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-remote-zip-index.json'));
  const schoolhouseFlCorporateMembers = readJsonl(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-member-receipts.jsonl'));
  const schoolhouseFlCorporateRecords = readJsonl(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-records.jsonl'));
  const schoolhouseFlCorporateMatrix = readJsonl(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-matrix.jsonl'));
  const schoolhouseFlCorporateAdjudication = readJson(path.join(dir, 'schoolhouse-fl-corporate-owner-resolution-adjudication.json'));

  check(manifest.schema_version === 'bvvc-defense-capital-manifest@2', 'manifest schema must be v2');
  check(manifest.graph_effect === 'none' && manifest.promotes_to === 'candidate_only', 'manifest must remain graph-inert candidate custody');
  check(manifest.counts.private_support_rows === 0, 'private support rows must remain zero');
  check(manifest.counts.public_graph_rows_created === 0, 'public graph rows created must remain zero');

  const countChecks = {
    source_inventory_rows: sourceInventory.length,
    leadership_current_rows: leadership.length,
    leadership_historical_only_rows: leadershipHistory.length,
    portfolio_current_rows: portfolio.length,
    schoolhouse_faculty_rows: schoolhouse.faculty_surface.rows.length,
    schoolhouse_demo_day_company_rows: schoolhouse.demo_day_2024.companies.length,
    schoolhouse_demo_day_panelist_rows: schoolhouse.demo_day_2024.panelists.length,
    schoolhouse_demo_day_sponsor_partner_rows: schoolhouse.demo_day_2024.sponsors_and_partners.length,
    schoolhouse_demo_day_organizer_rows: schoolhouse.demo_day_2024.tagged_organizers.length,
    schoolhouse_visible_employee_rows: schoolhouse.linkedin_public_company_profile.visible_employees.length,
    vehicle_and_related_entity_rows: vehicles.length,
    transaction_and_investment_observation_rows: transactions.length,
    institutional_self_claim_rows: claims.length,
    rejected_join_rows: rejected.length,
    coverage_denominator_rows: coverage.denominators.length,
    explicit_gap_rows: coverage.explicit_nulls_and_gaps.length,
    acquisition_frontier_tasks: frontier.tasks.length,
    portfolio_delta_candidate_rows: portfolioDelta.length,
    sec_form_d_acquisition_attempts: secRouteCustody.official_route_attempts.length,
    sec_form_d_route_result_rows: secRouteResults.length,
    schoolhouse_irs_source_route_rows: schoolhouseIrsRoutes.length,
    schoolhouse_irs_candidate_rows: schoolhouseIrsCandidates.length,
    schoolhouse_irs_unique_candidate_eins: new Set(schoolhouseIrsCandidates.map(row => row.ein).filter(Boolean)).size,
    schoolhouse_irs_admitted_identity_rows: schoolhouseIrsAdjudication.identity_decision.admitted_ein === null ? 0 : 1,
    state_registry_route_result_rows: stateRegistryRouteResults.length,
    state_registry_search_submissions: stateRegistryRouteResults.filter(row => row.query_submitted).length,
    fl_fictitious_source_rows: schoolhouseFlFictitiousMembers.reduce((sum, row) => sum + row.row_count, 0),
    fl_fictitious_candidate_rows: schoolhouseFlFictitiousCandidates.length,
    fl_fictitious_exact_public_name_rows: schoolhouseFlFictitiousCandidates.filter(row => row.match_basis === 'exact_public_name').length,
    fl_fictitious_tampa_bay_candidate_rows: schoolhouseFlFictitiousCandidates.filter(row => row.public_tampa_bay_city_match).length,
    fl_fictitious_post_2023_candidate_rows: schoolhouseFlFictitiousCandidates.filter(row => row.filed_2023_or_later).length,
    fl_fictitious_owner_charter_numbers: new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_charter_number)).filter(Boolean)).size,
    fl_fictitious_owner_feis: new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_fei)).filter(Boolean)).size,
    state_registry_admitted_identity_rows: schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null ? 0 : 1,
    fl_corporate_remote_zip_members: schoolhouseFlCorporateIndex.members.length,
    fl_corporate_target_partitions: schoolhouseFlCorporateMembers.length,
    fl_corporate_selected_partition_rows: schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.row_count, 0),
    fl_corporate_selected_compressed_bytes: schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.compressed_size, 0),
    fl_corporate_selected_uncompressed_bytes: schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.uncompressed_size, 0),
    fl_corporate_range_requests: schoolhouseFlCorporateSource.range_requests.length,
    fl_corporate_owner_charter_targets: schoolhouseFlCorporateMatrix.length,
    fl_corporate_owner_charters_resolved: schoolhouseFlCorporateMatrix.filter(row => row.matched_corporate_record_count === 1).length,
    fl_corporate_owner_charters_unresolved: schoolhouseFlCorporateMatrix.filter(row => row.matched_corporate_record_count === 0).length,
    fl_corporate_records: schoolhouseFlCorporateRecords.length,
    fl_corporate_owner_linked_fictitious_candidates: new Set(schoolhouseFlCorporateMatrix.flatMap(row => row.fictitious_candidate_links.map(link => link.fictitious_candidate_id))).size,
    fl_corporate_schoolhouse_admitted_identity_rows: schoolhouseFlCorporateAdjudication.identity_decision.admitted_document_number === null ? 0 : 1
  };
  for (const [key, actual] of Object.entries(countChecks)) {
    check(manifest.counts[key] === actual, `manifest count drift for ${key}: expected ${manifest.counts[key]}, got ${actual}`);
  }

  check(leadership.length === 27, 'current leadership denominator must contain 27 rows');
  check(portfolio.length === 30, 'current Portfolio Universe denominator must contain 30 rows');
  check(schoolhouse.faculty_surface.rows.length === 18, 'School.House faculty denominator must contain 18 rows');
  check(schoolhouse.demo_day_2024.companies.length === 20, '2024 Demo Day must contain 20 company rows');
  check(schoolhouse.demo_day_2024.panelists.length === 6, '2024 Demo Day must contain 6 panelists');
  check(schoolhouse.demo_day_2024.sponsors_and_partners.length === 9, '2024 Demo Day must contain 9 sponsors and partners');
  check(vehicles.length === 7, 'vehicle plane must contain 7 filed or filed-related entity rows');
  check(transactions.length === 17, 'transaction plane must contain 17 typed observations');
  check(rejected.length === 16, 'rejected-join ledger must contain 16 rows');
  check(frontier.tasks.length === 7, 'acquisition frontier must contain 7 tasks');
  check(portfolioDelta.length === 9, 'portfolio delta must contain 9 public-claim candidates');
  check(secRouteCustody.official_route_attempts.length === 3, 'SEC route custody must contain 3 bounded attempts');
  check(secRouteResults.length === 95, 'SEC route-result denominator must contain 95 rows');
  check(schoolhouseIrsRoutes.length === 6, 'School.House IRS route denominator must contain 6 rows');
  check(schoolhouseIrsCandidates.length === 641, 'School.House IRS candidate census must contain 641 rows');
  check(new Set(schoolhouseIrsCandidates.map(row => row.ein).filter(Boolean)).size === 438, 'School.House IRS unique EIN count must be 438');
  check(schoolhouseIrsAdjudication.identity_decision.state === 'unresolved_no_registry_candidate_admitted', 'School.House IRS identity must remain unresolved');
  check(schoolhouseIrsAdjudication.identity_decision.admitted_ein === null, 'School.House IRS pass must admit no EIN');
  check(stateRegistryRouteResults.length === 16, 'School.House state-registry route denominator must contain 16 rows');
  check(stateRegistryRouteCustody.counts.declared_routes === 16 && stateRegistryRouteCustody.counts.terminal_route_rows === 16, 'state-registry route custody must be terminal');
  check(stateRegistryRouteCustody.counts.north_carolina_search_submissions === 0 && stateRegistryRouteCustody.counts.florida_charity_search_submissions === 0, 'state-registry route custody must preserve zero search submissions');
  check(schoolhouseFlFictitiousMembers.length === 1, 'Florida fictitious member denominator must contain one member');
  check(schoolhouseFlFictitiousMembers[0].row_count === 761040, 'Florida fictitious source denominator must contain 761,040 rows');
  check(schoolhouseFlFictitiousCandidates.length === 29, 'Florida fictitious candidate census must contain 29 rows');
  check(schoolhouseFlFictitiousAdjudication.identity_decision.state === 'unresolved_no_florida_fictitious_name_identity_admitted', 'Florida fictitious identity must remain unresolved');
  check(schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null, 'Florida fictitious pass must admit no document number');
  check(schoolhouseFlCorporateIndex.members.length === 10, 'Florida corporate remote ZIP must contain ten members');
  check(schoolhouseFlCorporateMembers.length === 7, 'Florida corporate owner resolution must scan seven target partitions');
  check(schoolhouseFlCorporateMembers.reduce((sum, row) => sum + row.row_count, 0) === 8965926, 'Florida corporate owner resolution must scan 8,965,926 rows');
  check(schoolhouseFlCorporateMatrix.length === 15, 'Florida corporate owner resolution must contain fifteen targets');
  check(schoolhouseFlCorporateRecords.length === 15, 'Florida corporate owner resolution must retain fifteen exact records');
  check(schoolhouseFlCorporateAdjudication.identity_decision.state === 'unresolved_after_exact_florida_owner_corporate_resolution_no_identity_admitted', 'Florida corporate owner resolution must preserve unresolved School.House identity');
  check(schoolhouseFlCorporateAdjudication.identity_decision.admitted_document_number === null, 'Florida corporate owner resolution must admit no document number');

  check(unique(leadership.map(row => row.actor_id)), 'leadership actor IDs must be unique');
  check(unique(portfolio.map(row => row.organization_id)), 'portfolio organization IDs must be unique');
  check(unique(sourceInventory.map(row => row.receipt_id)), 'receipt IDs must be unique');
  check(unique(transactions.map(row => row.transaction_id)), 'transaction IDs must be unique');
  check(unique(rejected.map(row => row.rejection_id)), 'rejection IDs must be unique');
  check(unique(portfolioDelta.map(row => row.candidate_id)), 'portfolio-delta candidate IDs must be unique');
  check(unique(secRouteResults.map(row => row.route_id)), 'SEC route-result IDs must be unique');
  check(unique(schoolhouseIrsCandidates.map(row => row.candidate_row_id)), 'School.House IRS candidate-row IDs must be unique');
  check(unique(stateRegistryRouteResults.map(row => row.route_id)), 'state-registry route-result IDs must be unique');
  check(unique(schoolhouseFlFictitiousCandidates.map(row => row.candidate_id)), 'Florida fictitious candidate IDs must be unique');
  check(unique(schoolhouseFlCorporateMembers.map(row => row.partition_digit)), 'Florida corporate partition digits must be unique');
  check(unique(schoolhouseFlCorporateRecords.map(row => row.document_number)), 'Florida corporate document numbers must be unique');
  check(unique(schoolhouseFlCorporateMatrix.map(row => row.target_charter_number)), 'Florida corporate target charter numbers must be unique');

  for (const row of leadership) {
    check(row.surface_population === 27, `${row.actor_id} must carry the 27-row denominator`);
    check(row.current_listing === true, `${row.actor_id} must remain a current-listing observation`);
    check(row.hop_eligible === false, `${row.actor_id} leadership roster row must not be hop-eligible`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.actor_id} must remain graph-inert`);
  }
  for (const row of portfolio) {
    check(row.surface_population === 30, `${row.organization_id} must carry the 30-row denominator`);
    check(row.current_listing === true, `${row.organization_id} must remain a current-listing observation`);
    check(row.hop_eligible === false, `${row.organization_id} portfolio roster row must not be hop-eligible`);
    check(row.ownership_state === 'not_established', `${row.organization_id} must not infer ownership`);
    check(row.governance_rights_state === 'not_established', `${row.organization_id} must not infer governance rights`);
    check(row.vehicle_join_state === 'not_established', `${row.organization_id} must not infer a vehicle join`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.organization_id} must remain graph-inert`);
  }
  check(schoolhouse.faculty_surface.hop_eligible === false, 'School.House faculty surface must not be hop-eligible');
  check(schoolhouse.demo_day_2024.hop_eligible === false, 'School.House Demo Day surface must not be hop-eligible');
  for (const row of portfolioDelta) {
    check(row.current_portfolio_snapshot_membership === false, `${row.candidate_id} must remain absent from the frozen current snapshot`);
    check(row.current_portfolio_membership_not_admitted === true, `${row.candidate_id} must not be admitted as a current-page member`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.candidate_id} must remain graph-inert`);
  }
  const appliedAtomicsDelta = portfolioDelta.find(row => row.candidate_id === 'delta-applied-atomics-space-mobility');
  check(appliedAtomicsDelta?.identity_state === 'predicate_specific_identity_unresolved', 'Applied Atomics space-mobility identity must remain unresolved');
  check(/must_not_merge/i.test(Object.keys(appliedAtomicsDelta || {}).join(' ')), 'Applied Atomics row must carry a non-merge boundary');
  check(secRouteCustody.counts.route_result_rows === 95, 'SEC custody route count must be 95');
  check(secRouteCustody.counts.source_rows_acquired === 0, 'SEC route attempts must not invent source rows');
  check(secRouteCustody.interpretation.source_failure_is_not_absence === true, 'SEC route custody must preserve source-failure boundary');
  check(secRouteCustody.graph_effect === 'none' && secRouteCustody.promotes_to === 'candidate_only', 'SEC route custody must remain graph-inert');
  const allowedSchoolhouseIrsCandidateKeys = new Set(["candidate_row_id","identity_candidate_key","source_id","receipt_id","dataset","source_member","source_row_number","ein","legal_name_as_recorded","normalized_name","matched_name_as_recorded","matched_name_field","match_basis","city","state","country","public_location_state_match","subsection","ruling_date","organization_status","deductibility_status","tax_period","filing_type","filing_date","revocation_date","reinstatement_date","cross_dataset_occurrence_count","identity_state","street_address_retained","contact_details_retained","graph_effect","promotes_to"]);
  for (const route of schoolhouseIrsRoutes) {
    check(route.state === 'captured_and_scanned', `${route.source_id} must be terminal`);
    check(route.street_address_retained === false && route.contact_details_retained === false, `${route.source_id} must retain no contact data`);
    check(route.graph_effect === 'none' && route.promotes_to === 'candidate_only', `${route.source_id} must remain graph-inert`);
  }
  for (const row of schoolhouseIrsCandidates) {
    check(Object.keys(row).every(key => allowedSchoolhouseIrsCandidateKeys.has(key)), `${row.candidate_row_id} contains an unapproved field`);
    check(row.street_address_retained === false && row.contact_details_retained === false, `${row.candidate_row_id} must retain no contact data`);
    check(row.identity_state === 'registry_candidate_not_admitted', `${row.candidate_row_id} must not be admitted`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.candidate_row_id} must remain graph-inert`);
  }
  check(schoolhouseIrsAdjudication.route_denominator.source_rows_scanned === 4428541, 'School.House IRS scanned-row count must remain 4,428,541');
  check(schoolhouseIrsAdjudication.exact_tests.schoolhouse_1776_name_rows === 0, 'School.House IRS pass must preserve zero 1776-name matches');
  check(schoolhouseIrsAdjudication.exact_tests.exact_fayetteville_rows === 0, 'School.House IRS pass must preserve zero Fayetteville matches');
  check(schoolhouseIrsAdjudication.exact_tests.exact_tampa_rows.length === 1, 'School.House IRS pass must preserve one distinct historical Tampa candidate');
  check(schoolhouseIrsAdjudication.post_2023_fl_nc_bmf_candidates.length === 5, 'School.House IRS pass must preserve five distinct recent FL/NC BMF candidates');
  check(schoolhouseIrsAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.contact_detail_rows_retained === 0 && schoolhouseIrsAdjudication.privacy.officer_name_rows_retained === 0, 'School.House IRS adjudication must retain no private contact fields');

  for (const row of stateRegistryRouteResults) {
    check(row.query_submitted === false, `${row.route_id} must preserve zero search submission`);
    check(row.source_rows_acquired === 0, `${row.route_id} must preserve zero acquired identity rows`);
    check(row.raw_source_retained === false, `${row.route_id} must retain no raw source`);
    check(row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0, `${row.route_id} must retain no contact fields`);
    check(row.identity_admitted === false, `${row.route_id} must admit no identity`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.route_id} must remain graph-inert`);
  }
  check(stateRegistryRouteCustody.florida.weakened_host_key_policy_used === false, 'state-registry custody must not weaken SSH host-key validation');
  check(stateRegistryRouteCustody.north_carolina.interactive_search_automation_permitted === false, 'North Carolina scripted-search prohibition must remain explicit');
  check(stateRegistryRouteCustody.interpretation.publisher_automation_policy_must_not_be_bypassed === true, 'publisher automation policy must remain binding');
  check(stateRegistryRouteCustody.graph_effect === 'none' && stateRegistryRouteCustody.promotes_to === 'candidate_only', 'state-registry route custody must remain graph-inert');

  check(schoolhouseFlFictitiousSource.bytes === 74947584, 'Florida fictitious source byte count must remain 74,947,584');
  check(schoolhouseFlFictitiousSource.sha256 === '38576d314638f16d074d963eb6fba784de095ca2146c04016638a43fe48da113', 'Florida fictitious source SHA-256 drift');
  check(schoolhouseFlFictitiousSource.source_rows_scanned === 761040 && schoolhouseFlFictitiousSource.candidate_rows_retained === 29, 'Florida fictitious source receipt denominator drift');
  check(schoolhouseFlFictitiousSource.raw_source_retained === false && schoolhouseFlFictitiousSource.street_address_rows_retained === 0 && schoolhouseFlFictitiousSource.postal_code_rows_retained === 0 && schoolhouseFlFictitiousSource.contact_detail_rows_retained === 0, 'Florida fictitious source receipt must retain no raw or contact fields');
  const flFictitiousMember = schoolhouseFlFictitiousMembers[0];
  check(flFictitiousMember.member === 'FICFILE.TXT', 'Florida fictitious member name drift');
  check(flFictitiousMember.zip_crc32 === 'aa36329a', 'Florida fictitious member CRC drift');
  check(flFictitiousMember.uncompressed_stream_sha256 === 'e74d9999516e4b87b9b5200e2792eff190a9c54e3da77dfb49aba71e11838da1', 'Florida fictitious member stream SHA-256 drift');
  check(flFictitiousMember.physical_line_count === 761101 && flFictitiousMember.direct_record_count === 761000 && flFictitiousMember.reassembled_record_count === 40 && flFictitiousMember.fragment_line_count === 101, 'Florida fictitious record-framing denominator drift');
  check(flFictitiousMember.reassembly_mode_counts.join_fragments_with_lf === 40, 'Florida fictitious embedded-linebreak reassembly drift');
  check(flFictitiousMember.short_record_count === 0 && flFictitiousMember.trailing_bytes === 0 && flFictitiousMember.state === 'scanned', 'Florida fictitious member must be completely scanned');
  const allowedFlCandidateKeys = new Set(['candidate_id','source_member','source_row_number','document_number','fictitious_name_as_recorded','normalized_fictitious_name','match_basis','county','city','state','filing_date','status','cancellation_date','expiration_date','declared_owner_count','fictitious_name_fei','more_than_ten_owners','owners','public_tampa_bay_city_match','filed_2023_or_later','identity_state','street_address_retained','postal_code_retained','contact_details_retained','private_support_rows','identity_admitted','graph_effect','promotes_to','source_record_bytes','schema_defined_prefix_bytes','physical_fragment_count','reassembly_mode','receipt_id']);
  const allowedFlOwnerKeys = new Set(['owner_index','owner_document_number','owner_name_as_recorded','owner_name_format','owner_fei','owner_charter_number','street_address_retained','contact_details_retained']);
  for (const row of schoolhouseFlFictitiousCandidates) {
    check(Object.keys(row).every(key => allowedFlCandidateKeys.has(key)), `${row.candidate_id} contains an unapproved field`);
    check(row.receipt_id === 'r-fl-sunbiz-quarterly-fictitious-bulk-2026-08-05', `${row.candidate_id} must bind the source receipt`);
    check(row.identity_state === 'fictitious_name_candidate_not_admitted' && row.identity_admitted === false, `${row.candidate_id} must not be admitted`);
    check(row.street_address_retained === false && row.postal_code_retained === false && row.contact_details_retained === false, `${row.candidate_id} must retain no contact fields`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.candidate_id} must remain graph-inert`);
    for (const owner of row.owners) {
      check(Object.keys(owner).every(key => allowedFlOwnerKeys.has(key)), `${row.candidate_id} owner contains an unapproved field`);
      check(owner.street_address_retained === false && owner.contact_details_retained === false, `${row.candidate_id} owner must retain no contact fields`);
    }
  }
  check(schoolhouseFlFictitiousCandidates.filter(row => row.match_basis === 'exact_public_name').length === 0, 'Florida fictitious pass must preserve zero exact public-name candidates');
  check(schoolhouseFlFictitiousCandidates.filter(row => row.public_tampa_bay_city_match).length === 2, 'Florida fictitious pass must preserve two Tampa Bay phrase candidates');
  check(schoolhouseFlFictitiousCandidates.filter(row => row.filed_2023_or_later).length === 16, 'Florida fictitious pass must preserve sixteen post-2023 phrase candidates');
  check(new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_charter_number)).filter(Boolean)).size === 15, 'Florida fictitious pass must preserve fifteen owner charter numbers');
  check(new Set(schoolhouseFlFictitiousCandidates.flatMap(row => row.owners.map(owner => owner.owner_fei)).filter(Boolean)).size === 15, 'Florida fictitious pass must preserve fifteen owner FEIs');
  check(schoolhouseFlFictitiousAdjudication.exact_tests.exact_public_name_candidate_count === 0 && schoolhouseFlFictitiousAdjudication.exact_tests.tampa_bay_city_candidate_count === 2 && schoolhouseFlFictitiousAdjudication.exact_tests.filed_2023_or_later_candidate_count === 16, 'Florida fictitious adjudication exact-test drift');
  check(schoolhouseFlFictitiousAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseFlFictitiousAdjudication.privacy.postal_code_rows_retained === 0 && schoolhouseFlFictitiousAdjudication.privacy.contact_detail_rows_retained === 0, 'Florida fictitious adjudication must retain no contact fields');
  check(schoolhouseFlFictitiousAdjudication.identity_admitted === false && schoolhouseFlFictitiousAdjudication.graph_effect === 'none', 'Florida fictitious adjudication must remain graph-inert');

  const expectedCorporateMembers = {"0":{"member":"cordata0.txt","compressed_size":181786383,"uncompressed_size":1846759306,"row_count":1280693,"crc32":"a10eac21","uncompressed_sha256":"4631c816b34fee06184920e80332eab096ed058a61f3daa168313b72cf103286"},"1":{"member":"cordata1.txt","compressed_size":181868847,"uncompressed_size":1847134226,"row_count":1280953,"crc32":"931cb9e1","uncompressed_sha256":"f961da32f2d251312fe247bdf5cb92bdf39dcafd3c2f490e2a8c6828caf3c5ec"},"2":{"member":"cordata2.txt","compressed_size":181880423,"uncompressed_size":1847037612,"row_count":1280886,"crc32":"278d9bb2","uncompressed_sha256":"8fa76b88491dca7a7598f343848b4486ae81e48b540db9a87c122c1aa235c571"},"3":{"member":"cordata3.txt","compressed_size":181950040,"uncompressed_size":1847163066,"row_count":1280973,"crc32":"01b448c3","uncompressed_sha256":"126afe3874a0422091cc05ecb06298505dce61f555347650a8068117f192fc65"},"4":{"member":"cordata4.txt","compressed_size":181950007,"uncompressed_size":1847093850,"row_count":1280925,"crc32":"a4c610a1","uncompressed_sha256":"afd4a8d0d97268e8cc408772b29393d91f48040c65cc06731f804f6efaaa972b"},"7":{"member":"cordata7.txt","compressed_size":181947770,"uncompressed_size":1846838616,"row_count":1280748,"crc32":"2bd6f2f3","uncompressed_sha256":"795784a64b6a004afd46e08c346f0ed90222dd15dd63d3f0bd496a71fb5719fa"},"9":{"member":"cordata9.txt","compressed_size":181872843,"uncompressed_size":1846838616,"row_count":1280748,"crc32":"1106a6cd","uncompressed_sha256":"286486856e0621bcff1879d64ca05af616f8ee97063b6ee0ada90e0bda0ea126"}};
  const expectedCorporateNames = {"L16000000673":"BOUTIQUE APARTMENTS III LLC","L17000090349":"AMELIA SCHOOLHOUSE PROJECT, LLC","L20000357931":"SIJ SCHOOLHOUSE LLC","L22000000212":"LUCE EDUCATIONAL SERVICES, LLC","L22000358309":"COLOBELA LLC","L23000133581":"STRUVEDMUNDS LLC","L23000411942":"CSI TUTORING SERVICES LLC","L28059":"LITTLE RED SCHOOL HOUSE OF PENSACOLA, INC.","N12000000884":"CLUB RECOVERY OF CITRUS COUNTY, INC.","N22000010097":"MODPOD INC.","N96000004081":"BOYNTON CULTURAL CENTRE, INC.","P02000130432":"MY LITTLE SCHOOL HOUSE, INC.","P07000017144":"THREE ANGELS PRESCHOOL INC.","P12000066520":"TANGERINE SCHOOLHOUSE INC.","P17000074851":"SYMBIO GLOBAL, INC."};
  check(schoolhouseFlCorporateSource.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', 'Florida corporate source receipt ID drift');
  check(schoolhouseFlCorporateSource.source_bytes === 1819049954 && schoolhouseFlCorporateSource.remote_zip_members === 10, 'Florida corporate source denominator drift');
  check(schoolhouseFlCorporateSource.selected_partition_count === 7 && schoolhouseFlCorporateSource.selected_partition_rows_scanned === 8965926, 'Florida corporate selected-partition denominator drift');
  check(schoolhouseFlCorporateSource.target_charters === 15 && schoolhouseFlCorporateSource.resolved_target_charters === 15 && schoolhouseFlCorporateSource.unresolved_target_charters === 0, 'Florida corporate target-resolution denominator drift');
  check(schoolhouseFlCorporateSource.range_request_count === 24 && schoolhouseFlCorporateSource.range_requests.length === 24, 'Florida corporate range-request denominator drift');
  check(schoolhouseFlCorporateSource.full_source_sha256 === null && schoolhouseFlCorporateSource.full_source_downloaded === false, 'Florida corporate source must not claim a full-source hash or download');
  check(schoolhouseFlCorporateSource.raw_source_retained === false && schoolhouseFlCorporateSource.raw_compressed_members_retained === false && schoolhouseFlCorporateSource.raw_uncompressed_members_retained === false, 'Florida corporate source must retain no raw source');
  check(schoolhouseFlCorporateSource.public_credential_password_retained === false, 'Florida corporate source must retain no public password');
  check(schoolhouseFlCorporateSource.street_address_rows_retained === 0 && schoolhouseFlCorporateSource.mailing_address_rows_retained === 0 && schoolhouseFlCorporateSource.postal_code_rows_retained === 0 && schoolhouseFlCorporateSource.contact_detail_rows_retained === 0, 'Florida corporate source must retain no contact fields');
  check(schoolhouseFlCorporateSource.private_support_rows === 0 && schoolhouseFlCorporateSource.schoolhouse_identity_admitted === false && schoolhouseFlCorporateSource.outside_human_dependency === false && schoolhouseFlCorporateSource.graph_effect === 'none', 'Florida corporate source authority drift');
  check(schoolhouseFlCorporateSource.range_requests[0].request_id === 'head-source' && schoolhouseFlCorporateSource.range_requests[0].status === 200, 'Florida corporate HEAD receipt drift');
  check(schoolhouseFlCorporateSource.range_requests.slice(1).every(row => row.status === 206 && Boolean(row.content_range) && row.state === 'captured'), 'Florida corporate range receipts must be terminal HTTP 206 captures');
  check(schoolhouseFlCorporateIndex.central_directory_sha256 === '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330', 'Florida corporate central-directory SHA-256 drift');
  check(schoolhouseFlCorporateIndex.declared_partitions === 10 && schoolhouseFlCorporateIndex.selected_partition_count === 7, 'Florida corporate remote ZIP partition drift');
  check(new Set(schoolhouseFlCorporateIndex.members.map(row => row.partition_digit)).size === 10, 'Florida corporate remote ZIP member digits must be complete');
  for (const member of schoolhouseFlCorporateMembers) {
    const expected = expectedCorporateMembers[member.partition_digit];
    check(Boolean(expected), `unexpected Florida corporate partition ${member.partition_digit}`);
    if (expected) {
      for (const key of ['member','compressed_size','uncompressed_size','row_count','crc32','uncompressed_sha256']) {
        check(member[key] === expected[key], `Florida corporate partition ${member.partition_digit} ${key} drift`);
      }
    }
    check(member.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `Florida corporate partition ${member.partition_digit} source receipt drift`);
    check(member.state === 'complete_partition_scanned' && member.direct_record_count === member.row_count && member.reassembled_record_count === 0 && member.fragment_line_count === 0 && member.physical_line_count === member.row_count, `Florida corporate partition ${member.partition_digit} scan-state drift`);
    check(member.raw_compressed_member_retained === false && member.raw_uncompressed_member_retained === false, `Florida corporate partition ${member.partition_digit} must retain no raw member`);
    check(member.street_address_rows_retained === 0 && member.postal_code_rows_retained === 0 && member.contact_detail_rows_retained === 0 && member.private_support_rows === 0, `Florida corporate partition ${member.partition_digit} must retain no contact fields`);
    check(member.schoolhouse_identity_admitted === false && member.graph_effect === 'none' && member.promotes_to === 'candidate_only', `Florida corporate partition ${member.partition_digit} authority drift`);
  }
  const allowedCorporateRecordKeys = new Set(['annual_reports','contact_details_retained','corporate_record_id','corporation_name_as_recorded','document_number','external_separator','fei','fictitious_candidate_links','file_date','file_date_as_recorded','filing_type','graph_effect','last_transaction_date','last_transaction_date_as_recorded','mailing_address_retained','more_than_six_officers','officers','physical_fragment_count','postal_code_retained','principal_city','principal_country','principal_state','private_support_rows','promotes_to','reassembly_mode','registered_agent_name_as_recorded','registered_agent_type','resolution_state','schoolhouse_identity_admitted','schoolhouse_identity_state','source_member','source_row_number','state_country','status','street_address_retained','receipt_id']);
  const allowedCorporateOfficerKeys = new Set(['actor_type','contact_details_retained','name_as_recorded','officer_index','postal_code_retained','street_address_retained','title_as_recorded']);
  for (const row of schoolhouseFlCorporateRecords) {
    check(Object.keys(row).every(key => allowedCorporateRecordKeys.has(key)), `${row.document_number} contains an unapproved corporate field`);
    check(row.corporation_name_as_recorded === expectedCorporateNames[row.document_number], `${row.document_number} corporate name drift`);
    check(row.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `${row.document_number} source receipt drift`);
    check(row.status === 'A' && row.resolution_state === 'exact_owner_charter_resolved', `${row.document_number} resolution-state drift`);
    check(row.schoolhouse_identity_state === 'resolved_owner_entity_not_admitted_as_schoolhouse' && row.schoolhouse_identity_admitted === false, `${row.document_number} must not be admitted as School.House`);
    check(row.street_address_retained === false && row.mailing_address_retained === false && row.postal_code_retained === false && row.contact_details_retained === false && row.private_support_rows === 0, `${row.document_number} must retain no contact fields`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.document_number} must remain graph-inert`);
    for (const officer of row.officers) {
      check(Object.keys(officer).every(key => allowedCorporateOfficerKeys.has(key)), `${row.document_number} officer contains an unapproved field`);
      check(officer.street_address_retained === false && officer.postal_code_retained === false && officer.contact_details_retained === false, `${row.document_number} officer must retain no contact fields`);
    }
  }
  for (const row of schoolhouseFlCorporateMatrix) {
    check(row.receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `${row.target_charter_number} matrix source receipt drift`);
    check(row.target_denominator === 15 && row.matched_corporate_record_count === 1 && row.resolution_state === 'exact_corporate_record_resolved', `${row.target_charter_number} matrix resolution drift`);
    check(row.resolved_corporation_name_as_recorded === expectedCorporateNames[row.target_charter_number], `${row.target_charter_number} matrix corporate name drift`);
    check(row.schoolhouse_identity_disposition === 'not_admitted_distinct_owner_entity' && row.schoolhouse_identity_admitted === false, `${row.target_charter_number} matrix must not admit School.House identity`);
    check(row.street_address_retained === false && row.postal_code_retained === false && row.contact_details_retained === false && row.private_support_rows === 0, `${row.target_charter_number} matrix must retain no contact fields`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.target_charter_number} matrix must remain graph-inert`);
  }
  check(new Set(schoolhouseFlCorporateMatrix.flatMap(row => row.fictitious_candidate_links.map(link => link.fictitious_candidate_id))).size === 17, 'Florida corporate matrix must type seventeen fictitious-name candidates');
  check(schoolhouseFlCorporateAdjudication.frozen_target_denominator.target_charters === 15 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.resolved_target_charters === 15 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.unresolved_target_charters === 0, 'Florida corporate adjudication target denominator drift');
  check(schoolhouseFlCorporateAdjudication.frozen_target_denominator.owner_linked_fictitious_candidates === 17 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.fictitious_candidates_without_owner_charter === 12 && schoolhouseFlCorporateAdjudication.frozen_target_denominator.tampa_bay_phrase_candidates_with_owner_charter === 0, 'Florida corporate adjudication candidate-link boundary drift');
  check(schoolhouseFlCorporateAdjudication.identity_decision.admitted_document_number === null && schoolhouseFlCorporateAdjudication.identity_decision.admitted_legal_name === null && schoolhouseFlCorporateAdjudication.identity_decision.admitted_ein === null, 'Florida corporate adjudication must admit no identity');
  check(schoolhouseFlCorporateAdjudication.privacy.raw_source_retained === false && schoolhouseFlCorporateAdjudication.privacy.street_address_rows_retained === 0 && schoolhouseFlCorporateAdjudication.privacy.mailing_address_rows_retained === 0 && schoolhouseFlCorporateAdjudication.privacy.postal_code_rows_retained === 0 && schoolhouseFlCorporateAdjudication.privacy.contact_detail_rows_retained === 0, 'Florida corporate adjudication must retain no raw or contact fields');
  check(schoolhouseFlCorporateAdjudication.schoolhouse_identity_admitted === false && schoolhouseFlCorporateAdjudication.outside_human_dependency === false && schoolhouseFlCorporateAdjudication.graph_effect === 'none' && schoolhouseFlCorporateAdjudication.promotes_to === 'candidate_only', 'Florida corporate adjudication authority drift');

  for (const row of secRouteResults) {
    check(row.state === 'source_unavailable_after_search', `${row.route_id} must preserve the source-unavailable state`);
    check(row.http_status === 403, `${row.route_id} must preserve HTTP 403`);
    check(row.result_rows === 0, `${row.route_id} must preserve zero acquired rows`);
    check(row.absence_claim_permitted === false, `${row.route_id} must refuse absence inference`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.route_id} must remain graph-inert`);
  }

  for (const row of vehicles) {
    check(row.portfolio_transaction_join_state === 'not_established', `${row.row_id} must not infer a portfolio transaction join`);
    check(/SEC has not necessarily reviewed/i.test(row.sec_caveat), `${row.row_id} must carry the SEC accuracy caveat`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.row_id} must remain graph-inert`);
  }
  for (const row of transactions) {
    check(Object.hasOwn(row, 'announced_round_amount'), `${row.transaction_id} must explicitly carry announced_round_amount`);
    check(row.transaction_to_vehicle_join_state === 'not_established', `${row.transaction_id} must not infer a vehicle join`);
    check(row.ownership_state === 'not_established', `${row.transaction_id} must not infer ownership`);
    check(row.governance_rights_state === 'not_established', `${row.transaction_id} must not infer governance rights`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.transaction_id} must remain graph-inert`);
    if (row.announced_round_amount !== null) {
      check(typeof row.announced_round_amount.value === 'number', `${row.transaction_id} amount must be numeric`);
      check(typeof row.announced_round_amount.currency === 'string', `${row.transaction_id} currency must be explicit`);
    }
  }

  check(rejected.some(row => row.rejection_id === 'reject-shield-ai'), 'Shield AI unsupported join must remain explicitly rejected');
  check(rejected.some(row => row.rejection_id === 'reject-private-dm-public-evidence'), 'private-message public-evidence join must remain explicitly rejected');
  check(rejected.every(row => row.disposition === 'not_admitted'), 'every rejected join must remain not_admitted');

  for (const task of frontier.tasks) {
    check(task.outside_human_dependency === false, `${task.task_id} must not depend on an outside human`);
    check(task.graph_effect === 'none' && task.promotes_to === 'candidate_only', `${task.task_id} must remain graph-inert`);
    check(Boolean(task.stopping_rule), `${task.task_id} must have a stopping rule`);
    check(Boolean(task.forbidden_inference), `${task.task_id} must carry a forbidden inference`);
  }

  const forbiddenLocatorFragments = ['linkedin.com/messaging', 'private-user-images', 'file://', '/mnt/data/'];
  for (const receipt of sourceInventory) {
    check(receipt.graph_effect === 'none' && receipt.promotes_to === 'candidate_only', `${receipt.receipt_id} must remain graph-inert`);
    check(typeof receipt.locator_url === 'string' && /^https:\/\//.test(receipt.locator_url), `${receipt.receipt_id} must have a public HTTPS locator`);
    for (const fragment of forbiddenLocatorFragments) {
      check(!receipt.locator_url.includes(fragment), `${receipt.receipt_id} contains forbidden private locator fragment ${fragment}`);
    }
  }

  const knownReceiptIds = new Set(sourceInventory.map(row => row.receipt_id));
  const referencedReceiptIds = collectReceiptIds([
    leadership, leadershipHistory, portfolio, schoolhouse, vehicles,
    transactions, claims, coverage, portfolioDelta, schoolhouseIrsCandidates, schoolhouseIrsAdjudication,
    stateRegistryRouteResults, stateRegistryRouteCustody, schoolhouseFlFictitiousSource,
    schoolhouseFlFictitiousCandidates, schoolhouseFlFictitiousAdjudication,
    schoolhouseFlCorporateSource, schoolhouseFlCorporateIndex, schoolhouseFlCorporateMembers,
    schoolhouseFlCorporateRecords, schoolhouseFlCorporateMatrix, schoolhouseFlCorporateAdjudication
  ]);
  for (const receiptId of referencedReceiptIds) {
    check(knownReceiptIds.has(receiptId), `referenced receipt is missing from source inventory: ${receiptId}`);
  }

  for (const [filename, expected] of Object.entries(manifest.files)) {
    const file = path.join(dir, filename);
    check(fs.existsSync(file), `manifest-bound file missing: ${filename}`);
    if (fs.existsSync(file)) {
      check(fs.statSync(file).size === expected.bytes, `${filename} byte-count drift`);
      check(sha256(file) === expected.sha256, `${filename} SHA-256 drift`);
    }
  }


  const schoolhouseFlMagnoliaSource = readJson(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-source-receipt.json'));
  const schoolhouseFlMagnoliaIndex = readJson(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-remote-zip-index.json'));
  const schoolhouseFlMagnoliaRequests = readJsonl(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-range-request-receipts.jsonl'));
  const schoolhouseFlMagnoliaMembers = readJsonl(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-member-receipts.jsonl'));
  const schoolhouseFlMagnoliaRecords = readJsonl(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-records.jsonl'));
  const schoolhouseFlMagnoliaMatrix = readJsonl(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-matrix.jsonl'));
  const schoolhouseFlMagnoliaAdjudication = readJson(path.join(dir, 'schoolhouse-fl-magnolia-corporate-resolution-adjudication.json'));

  check(manifest.counts.fl_magnolia_remote_zip_members === schoolhouseFlMagnoliaIndex.members.length, 'Magnolia remote ZIP member count drift');
  check(manifest.counts.fl_magnolia_target_partitions === schoolhouseFlMagnoliaMembers.length, 'Magnolia target partition count drift');
  check(manifest.counts.fl_magnolia_selected_partition_rows === schoolhouseFlMagnoliaMembers.reduce((sum, row) => sum + row.row_count, 0), 'Magnolia selected-row count drift');
  check(manifest.counts.fl_magnolia_selected_compressed_bytes === schoolhouseFlMagnoliaMembers.reduce((sum, row) => sum + row.compressed_size, 0), 'Magnolia compressed-byte count drift');
  check(manifest.counts.fl_magnolia_selected_uncompressed_bytes === schoolhouseFlMagnoliaMembers.reduce((sum, row) => sum + row.uncompressed_size, 0), 'Magnolia uncompressed-byte count drift');
  check(manifest.counts.fl_magnolia_range_requests === schoolhouseFlMagnoliaRequests.length, 'Magnolia range-request count drift');
  check(manifest.counts.fl_magnolia_target_documents === schoolhouseFlMagnoliaMatrix.length, 'Magnolia target-document count drift');
  check(manifest.counts.fl_magnolia_documents_resolved === schoolhouseFlMagnoliaMatrix.filter(row => row.matched_corporate_record_count === 1).length, 'Magnolia resolved-document count drift');
  check(manifest.counts.fl_magnolia_corporate_records === schoolhouseFlMagnoliaRecords.length, 'Magnolia corporate-record count drift');
  check(manifest.counts.fl_magnolia_shared_ein_reporting_entities === schoolhouseFlMagnoliaRecords.filter(row => row.fei === '392669585').length, 'Magnolia shared-EIN reporting-entity count drift');
  check(manifest.counts.fl_magnolia_identifier_grade_irs_candidate_resolution_rows === schoolhouseFlMagnoliaRecords.filter(row => row.irs_candidate_resolution_state === 'identifier_grade_irs_candidate_identity_resolved').length, 'Magnolia identifier-grade IRS resolution count drift');
  check(manifest.counts.fl_magnolia_public_schoolhouse_admitted_identity_rows === 0, 'Magnolia must admit no public School.House identity');

  check(schoolhouseFlMagnoliaSource.source_receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', 'Magnolia source receipt ID drift');
  check(schoolhouseFlMagnoliaSource.source_bytes === 1819049954 && schoolhouseFlMagnoliaSource.remote_zip_members === 10, 'Magnolia source denominator drift');
  check(schoolhouseFlMagnoliaSource.selected_partition_count === 2 && schoolhouseFlMagnoliaSource.selected_partition_rows === 2561478, 'Magnolia selected-partition denominator drift');
  check(schoolhouseFlMagnoliaSource.target_documents === 2 && schoolhouseFlMagnoliaSource.resolved_target_documents === 2, 'Magnolia target-resolution denominator drift');
  check(schoolhouseFlMagnoliaSource.range_request_count === 9, 'Magnolia source range-request denominator drift');
  check(schoolhouseFlMagnoliaSource.full_source_downloaded === false && schoolhouseFlMagnoliaSource.raw_source_retained === false && schoolhouseFlMagnoliaSource.raw_compressed_members_retained === false && schoolhouseFlMagnoliaSource.raw_uncompressed_members_retained === false, 'Magnolia source must retain no raw source');
  check(schoolhouseFlMagnoliaSource.public_credential_password_retained === false, 'Magnolia source must retain no public password');
  check(schoolhouseFlMagnoliaSource.street_address_rows_retained === 0 && schoolhouseFlMagnoliaSource.mailing_address_rows_retained === 0 && schoolhouseFlMagnoliaSource.postal_code_rows_retained === 0 && schoolhouseFlMagnoliaSource.registered_agent_name_rows_retained === 0 && schoolhouseFlMagnoliaSource.officer_name_rows_retained === 0 && schoolhouseFlMagnoliaSource.officer_address_rows_retained === 0 && schoolhouseFlMagnoliaSource.contact_detail_rows_retained === 0 && schoolhouseFlMagnoliaSource.private_support_rows === 0, 'Magnolia source privacy drift');
  check(schoolhouseFlMagnoliaSource.public_schoolhouse_identity_admitted === false && schoolhouseFlMagnoliaSource.negative_existence_claim_created === false && schoolhouseFlMagnoliaSource.outside_human_dependency === false && schoolhouseFlMagnoliaSource.graph_effect === 'none', 'Magnolia source authority drift');

  check(schoolhouseFlMagnoliaIndex.central_directory_sha256 === '5524144b32429b336a2799a164f4fa5278e7825023fff638d65e8f8bdc577330', 'Magnolia central-directory SHA-256 drift');
  check(schoolhouseFlMagnoliaIndex.declared_partitions === 10 && schoolhouseFlMagnoliaIndex.selected_partition_count === 2, 'Magnolia ZIP partition drift');
  check(JSON.stringify(schoolhouseFlMagnoliaIndex.selected_partitions) === JSON.stringify(['5','7']), 'Magnolia selected partition digits drift');
  check(new Set(schoolhouseFlMagnoliaIndex.members.map(row => row.partition_digit)).size === 10, 'Magnolia ZIP member digits must be complete');

  check(schoolhouseFlMagnoliaRequests.length === 9 && unique(schoolhouseFlMagnoliaRequests.map(row => row.request_id)), 'Magnolia range-request receipt drift');
  const schoolhouseFlMagnoliaHeadRequest = schoolhouseFlMagnoliaRequests.find(row => row.request_id === 'head-source');
  const schoolhouseFlMagnoliaRangeRequests = schoolhouseFlMagnoliaRequests.filter(row => row.request_id !== 'head-source');
  check(Boolean(schoolhouseFlMagnoliaHeadRequest) && schoolhouseFlMagnoliaHeadRequest.status === 200 && schoolhouseFlMagnoliaHeadRequest.state === 'captured', 'Magnolia HEAD receipt drift');
  check(schoolhouseFlMagnoliaRangeRequests.length === 8 && schoolhouseFlMagnoliaRangeRequests.every(row => row.status === 206 && Boolean(row.content_range) && row.state === 'captured'), 'Magnolia range receipts must be eight terminal HTTP 206 captures');
  check(schoolhouseFlMagnoliaRequests.every(row => row.source_receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05' && row.public_credential_password_retained === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'Magnolia range-request authority drift');

  const expectedMagnoliaMembers = {"5":{"member":"cordata5.txt","compressed_size":181873253,"uncompressed_size":1846812660,"row_count":1280730,"crc32":"39f1a07a","uncompressed_sha256":"b4427a149b3ffa1df69c50173bc1e2dae1c5eeab53a00d7eb8f3fd7b82439b0a","target_document":"L25000047895"},"7":{"member":"cordata7.txt","compressed_size":181947770,"uncompressed_size":1846838616,"row_count":1280748,"crc32":"2bd6f2f3","uncompressed_sha256":"795784a64b6a004afd46e08c346f0ed90222dd15dd63d3f0bd496a71fb5719fa","target_document":"N25000006947"}};
  check(schoolhouseFlMagnoliaMembers.length === 2 && unique(schoolhouseFlMagnoliaMembers.map(row => row.partition_digit)), 'Magnolia member denominator drift');
  for (const member of schoolhouseFlMagnoliaMembers) {
    const expected = expectedMagnoliaMembers[member.partition_digit];
    check(Boolean(expected), `unexpected Magnolia partition ${member.partition_digit}`);
    if (expected) {
      for (const key of ['member','compressed_size','uncompressed_size','row_count','crc32','uncompressed_sha256']) {
        check(member[key] === expected[key], `Magnolia partition ${member.partition_digit} ${key} drift`);
      }
      check(member.target_charter_count === 1 && member.target_charters[0] === expected.target_document && member.target_match_counts[expected.target_document] === 1, `Magnolia partition ${member.partition_digit} target match drift`);
    }
    check(member.state === 'complete_partition_scanned' && member.direct_record_count === member.row_count && member.reassembled_record_count === 0 && member.fragment_line_count === 0 && member.physical_line_count === member.row_count, `Magnolia partition ${member.partition_digit} scan-state drift`);
    check(member.raw_compressed_member_retained === false && member.raw_uncompressed_member_retained === false, `Magnolia partition ${member.partition_digit} retained raw data`);
    check(member.street_address_rows_retained === 0 && member.mailing_address_rows_retained === 0 && member.postal_code_rows_retained === 0 && member.registered_agent_name_rows_retained === 0 && member.officer_name_rows_retained === 0 && member.officer_address_rows_retained === 0 && member.contact_detail_rows_retained === 0 && member.private_support_rows === 0, `Magnolia partition ${member.partition_digit} privacy drift`);
    check(member.public_schoolhouse_identity_admitted === false && member.outside_human_dependency === false && member.graph_effect === 'none', `Magnolia partition ${member.partition_digit} authority drift`);
  }

  check(schoolhouseFlMagnoliaRecords.length === 2 && unique(schoolhouseFlMagnoliaRecords.map(row => row.document_number)), 'Magnolia corporate-record denominator drift');
  check(schoolhouseFlMagnoliaMatrix.length === 2 && unique(schoolhouseFlMagnoliaMatrix.map(row => row.target_document_number)), 'Magnolia matrix denominator drift');
  const magnoliaRecordByDocument = new Map(schoolhouseFlMagnoliaRecords.map(row => [row.document_number, row]));
  const magnoliaLlc = magnoliaRecordByDocument.get('L25000047895');
  const magnoliaNonprofit = magnoliaRecordByDocument.get('N25000006947');
  check(Boolean(magnoliaLlc) && Boolean(magnoliaNonprofit), 'Magnolia exact records missing');
  if (magnoliaLlc) {
    check(magnoliaLlc.corporation_name_as_recorded === 'THE MAGNOLIA SCHOOLHOUSE LLC' && magnoliaLlc.filing_type === 'FLAL' && magnoliaLlc.file_date === '2025-01-28' && magnoliaLlc.principal_city === 'VERO BEACH' && magnoliaLlc.principal_state === 'FL' && magnoliaLlc.fei === '392669585', 'Magnolia LLC exact fields drift');
    check(magnoliaLlc.exact_fei_search_association_state === 'bulk_reports_same_fei_requires_cross_surface_conflict_adjudication' && magnoliaLlc.irs_candidate_resolution_state === 'exact_fei_search_association_not_identifier_grade', 'Magnolia LLC conflict classification drift');
  }
  if (magnoliaNonprofit) {
    check(magnoliaNonprofit.corporation_name_as_recorded === 'THE MAGNOLIA SCHOOLHOUSE, INC.' && magnoliaNonprofit.filing_type === 'DOMNP' && magnoliaNonprofit.file_date === '2025-06-11' && magnoliaNonprofit.principal_city === 'VERO BEACH' && magnoliaNonprofit.principal_state === 'FL' && magnoliaNonprofit.fei === '392669585', 'Magnolia nonprofit exact fields drift');
    check(magnoliaNonprofit.exact_fei_search_association_state === 'bulk_confirms_exact_irs_candidate_ein' && magnoliaNonprofit.irs_candidate_resolution_state === 'identifier_grade_irs_candidate_identity_resolved', 'Magnolia nonprofit IRS classification drift');
  }
  for (const record of schoolhouseFlMagnoliaRecords) {
    check(record.source_receipt_id === 'r-fl-sunbiz-quarterly-corporate-bulk-2026-08-05', `Magnolia record ${record.document_number} source receipt drift`);
    check(record.shared_ein_conflict_state === 'two_distinct_florida_legal_entities_report_same_ein_no_control_or_tax_inference', `Magnolia record ${record.document_number} shared-EIN state drift`);
    check(record.street_address_retained === false && record.mailing_address_retained === false && record.postal_code_retained === false && record.registered_agent_name_retained === false && record.officer_names_retained === false && record.officer_addresses_retained === false && record.contact_details_retained === false && record.private_support_rows === 0, `Magnolia record ${record.document_number} privacy drift`);
    check(!Object.hasOwn(record, 'registered_agent_name_as_recorded') && !Object.hasOwn(record, 'officers'), `Magnolia record ${record.document_number} retained forbidden identity detail`);
    check(record.public_schoolhouse_brand_join_state === 'not_established' && record.public_schoolhouse_identity_admitted === false && record.outside_human_dependency === false && record.graph_effect === 'none' && record.promotes_to === 'candidate_only', `Magnolia record ${record.document_number} authority drift`);
  }
  check(schoolhouseFlMagnoliaMatrix.every(row => row.matched_corporate_record_count === 1 && row.resolution_state === 'exact_corporate_record_resolved' && row.target_denominator === 2 && row.public_schoolhouse_brand_join_state === 'not_established' && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'Magnolia matrix authority drift');
  check(schoolhouseFlMagnoliaAdjudication.shared_identifier_conflict.state === 'two_distinct_florida_legal_entities_report_same_ein', 'Magnolia shared-EIN conflict adjudication drift');
  check(schoolhouseFlMagnoliaAdjudication.shared_identifier_conflict.reporting_entity_count === 2, 'Magnolia shared-EIN reporting-entity denominator drift');
  check(schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_decision.state === 'unresolved_no_florida_corporate_identity_admitted' && schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_decision.admitted_document_number === null && schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_decision.negative_existence_claim_created === false, 'Magnolia public School.House identity decision drift');
  check(schoolhouseFlMagnoliaAdjudication.public_schoolhouse_identity_admitted === false && schoolhouseFlMagnoliaAdjudication.outside_human_dependency === false && schoolhouseFlMagnoliaAdjudication.graph_effect === 'none', 'Magnolia adjudication authority drift');
  check(schoolhouse.state_registry_identity_census.florida_magnolia_corporate_resolution.resolved_documents === 2, 'School.House Magnolia resolution projection drift');
  check(schoolhouse.state_registry_identity_census.florida_magnolia_corporate_resolution.shared_ein_reporting_entities === 2, 'School.House Magnolia shared-EIN projection drift');
  check(schoolhouse.state_registry_identity_census.florida_magnolia_corporate_resolution.public_schoolhouse_identity_state === 'unresolved_no_florida_corporate_identity_admitted', 'School.House Magnolia identity projection drift');


  {
    const routeCustody = readJson(path.join(dir, 'schoolhouse-charity-nc-route-custody.json'));
    const rootRoutes = readJsonl(path.join(dir, 'schoolhouse-charity-nc-root-route-results.jsonl'));
    const followedRoutes = readJsonl(path.join(dir, 'schoolhouse-charity-nc-followed-route-results.jsonl'));
    const discoveredLinks = readJsonl(path.join(dir, 'schoolhouse-charity-nc-discovered-links.jsonl'));
    const routeHtmlSurfaces = readJsonl(path.join(dir, 'schoolhouse-charity-nc-html-surfaces.jsonl'));
    const routeForms = readJsonl(path.join(dir, 'schoolhouse-charity-nc-surface-forms.jsonl'));
    const allRouteRows = [...rootRoutes, ...followedRoutes];

    check(manifest.counts.schoolhouse_charity_nc_root_route_rows === rootRoutes.length && rootRoutes.length === 8, 'charity/NC root-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_followed_route_rows === followedRoutes.length && followedRoutes.length === 24, 'charity/NC followed-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_terminal_route_rows === allRouteRows.length && allRouteRows.length === 32, 'charity/NC terminal-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_discovered_link_rows === discoveredLinks.length && discoveredLinks.length === 65, 'charity/NC discovered-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_unique_discovered_links === new Set(discoveredLinks.map(row => row.href)).size && manifest.counts.schoolhouse_charity_nc_unique_discovered_links === 55, 'charity/NC unique-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_html_surface_rows === routeHtmlSurfaces.length && routeHtmlSurfaces.length === 12, 'charity/NC HTML-surface denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_form_rows === routeForms.length && routeForms.length === 8, 'charity/NC form denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_search_submissions === 0 && allRouteRows.filter(row => row.query_submitted).length === 0, 'charity/NC search-submission boundary drift');
    check(manifest.counts.schoolhouse_charity_nc_source_rows_acquired === 0 && allRouteRows.reduce((sum, row) => sum + row.source_rows_acquired, 0) === 0, 'charity/NC source-row boundary drift');
    check(manifest.counts.schoolhouse_charity_nc_admitted_identity_rows === 0, 'charity/NC route pass must admit no identity');
    check(unique(allRouteRows.map(row => row.route_id)), 'charity/NC route IDs must be unique');
    check(unique(allRouteRows.map(row => row.receipt_id)), 'charity/NC receipt IDs must be unique');
    check(allRouteRows.every(row => row.query_submitted === false && row.source_rows_acquired === 0 && row.raw_source_retained === false && row.hidden_form_values_retained === false && row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'charity/NC route authority drift');
    check(allRouteRows.every(row => row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'charity/NC route privacy drift');
    check(allRouteRows.filter(row => row.state === 'accessible_file_sample').length === 11, 'charity/NC file-sample state count drift');
    check(allRouteRows.filter(row => row.state === 'accessible_html').length === 12, 'charity/NC HTML state count drift');
    check(allRouteRows.filter(row => row.state === 'accessible_non_html').length === 3, 'charity/NC non-HTML state count drift');
    check(allRouteRows.filter(row => row.state === 'provider_blocked').length === 1, 'charity/NC provider-blocked state count drift');
    check(allRouteRows.filter(row => row.state === 'timeout').length === 5, 'charity/NC timeout state count drift');
    check(discoveredLinks.every(row => row.official_host === true && row.relevant === true && row.query_submission_required === false && knownReceiptIds.has(row.source_receipt_id) && row.graph_effect === 'none'), 'charity/NC discovered-link boundary drift');
    check(routeHtmlSurfaces.every(row => row.raw_body_retained === false && row.query_submitted === false && knownReceiptIds.has(row.receipt_id) && row.graph_effect === 'none'), 'charity/NC HTML-surface boundary drift');
    check(routeForms.every(row => row.hidden_values_retained === false && row.query_submitted === false && knownReceiptIds.has(row.receipt_id) && row.graph_effect === 'none'), 'charity/NC form boundary drift');
    check(routeForms.every(row => (row.controls || []).every(control => !Object.hasOwn(control, 'value'))), 'charity/NC form retained a raw control value');

    check(routeCustody.acquisition.workflow_run_id === 30980115912 && routeCustody.acquisition.artifact_id === 8919817084 && routeCustody.acquisition.artifact_digest === 'sha256:87bb2327fea644c185e2b2bb8bdf542a95e12d14da524ac20157f190c0512068', 'charity/NC artifact custody drift');
    check(routeCustody.counts.terminal_route_rows === 32 && routeCustody.counts.discovered_link_rows === 65 && routeCustody.counts.unique_discovered_links === 55 && routeCustody.counts.html_surface_rows === 12 && routeCustody.counts.form_rows === 8, 'charity/NC custody denominator drift');
    check(routeCustody.counts.search_submissions === 0 && routeCustody.counts.source_rows_acquired === 0 && routeCustody.counts.identities_admitted === 0, 'charity/NC custody authority drift');
    check(routeCustody.florida.check_a_charity_state === 'timeout' && routeCustody.florida.search_submissions === 0 && routeCustody.florida.automation_permission_inferred === false, 'Florida charity route custody drift');
    check(routeCustody.north_carolina.automated_or_scripted_searches_not_permitted === true && routeCustody.north_carolina.bulk_data_subscription_direction_captured === true && routeCustody.north_carolina.search_submissions === 0, 'North Carolina route-policy custody drift');
    check(routeCustody.privacy.raw_source_retained === false && routeCustody.privacy.hidden_form_values_retained === false && routeCustody.privacy.street_address_rows_retained === 0 && routeCustody.privacy.contact_detail_rows_retained === 0 && routeCustody.privacy.private_support_rows === 0, 'charity/NC custody privacy drift');
    check(routeCustody.public_schoolhouse_identity_admitted === false && routeCustody.negative_existence_claim_created === false && routeCustody.outside_human_dependency === false && routeCustody.graph_effect === 'none' && routeCustody.promotes_to === 'candidate_only', 'charity/NC custody authority ceiling drift');

    const routeProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_route_discovery;
    check(routeProjection?.terminal_route_rows === 32 && routeProjection?.discovered_link_rows === 65 && routeProjection?.form_rows === 8, 'School.House route projection drift');
    check(routeProjection?.identity_state === 'unresolved_after_lawful_route_discovery_no_public_identity_admitted' && routeProjection?.admitted_legal_name === null && routeProjection?.admitted_ein === null, 'School.House route projection admitted an identity');
    const routeFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_route_discovery;
    check(routeFrontier?.terminal_route_rows === 32 && routeFrontier?.search_submissions === 0 && routeFrontier?.admitted_identities === 0, 'School.House route frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House Florida-charity and North Carolina lawful-route discovery' && row.enumerated_total === 32 && row.search_submissions === 0), 'charity/NC coverage denominator missing');
  }


  {
    const secondLevelCustody = readJson(path.join(dir, 'schoolhouse-charity-nc-second-level-route-custody.json'));
    const secondLevelRoots = readJsonl(path.join(dir, 'schoolhouse-charity-nc-second-level-root-route-results.jsonl'));
    const secondLevelFollowed = readJsonl(path.join(dir, 'schoolhouse-charity-nc-second-level-followed-route-results.jsonl'));
    const secondLevelDiscovered = readJsonl(path.join(dir, 'schoolhouse-charity-nc-second-level-discovered-links.jsonl'));
    const secondLevelHtml = readJsonl(path.join(dir, 'schoolhouse-charity-nc-second-level-html-surfaces.jsonl'));
    const secondLevelForms = readJsonl(path.join(dir, 'schoolhouse-charity-nc-second-level-surface-forms.jsonl'));
    const secondLevelRoutes = [...secondLevelRoots, ...secondLevelFollowed];

    check(manifest.counts.source_inventory_rows === 408, 'second-level source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 24, 'second-level coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'second-level explicit-gap count drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_root_route_rows === secondLevelRoots.length && secondLevelRoots.length === 8, 'second-level root-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_followed_route_rows === secondLevelFollowed.length && secondLevelFollowed.length === 80, 'second-level followed-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_terminal_route_rows === secondLevelRoutes.length && secondLevelRoutes.length === 88, 'second-level terminal-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_discovered_link_rows === secondLevelDiscovered.length && secondLevelDiscovered.length === 524, 'second-level discovered-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_unique_discovered_links === new Set(secondLevelDiscovered.map(row => row.href)).size && manifest.counts.schoolhouse_charity_nc_second_level_unique_discovered_links === 185, 'second-level unique-link denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_bounded_file_sample_routes === secondLevelRoutes.filter(row => row.state === 'accessible_file_sample').length && manifest.counts.schoolhouse_charity_nc_second_level_bounded_file_sample_routes === 68, 'second-level file-sample denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_html_surface_rows === secondLevelHtml.length && secondLevelHtml.length === 19, 'second-level HTML denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_form_rows === secondLevelForms.length && secondLevelForms.length === 3, 'second-level form denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_timeout_routes === secondLevelRoutes.filter(row => row.state === 'timeout').length && manifest.counts.schoolhouse_charity_nc_second_level_timeout_routes === 1, 'second-level timeout denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_second_level_search_submissions === 0 && manifest.counts.schoolhouse_charity_nc_second_level_source_rows_acquired === 0 && manifest.counts.schoolhouse_charity_nc_second_level_admitted_identity_rows === 0, 'second-level authority count drift');

    check(unique(secondLevelRoutes.map(row => row.route_id)), 'second-level route IDs must be unique');
    check(unique(secondLevelRoutes.map(row => row.receipt_id)), 'second-level receipt IDs must be unique');
    check(secondLevelRoutes.every(row => knownReceiptIds.has(row.receipt_id)), 'second-level route receipt missing from source inventory');
    check(secondLevelRoutes.every(row => row.query_submitted === false && row.source_rows_acquired === 0 && row.raw_source_retained === false && row.hidden_form_values_retained === false), 'second-level route search/source/privacy drift');
    check(secondLevelRoutes.every(row => row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'second-level route retained private/contact data');
    check(secondLevelRoutes.every(row => row.identity_admitted === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'second-level route authority drift');
    check(secondLevelRoutes.filter(row => row.depth === 0).length === 8 && secondLevelRoutes.filter(row => row.depth === 1).length === 80 && secondLevelRoutes.filter(row => row.depth === 2).length === 0, 'second-level depth denominator drift');
    check(secondLevelRoutes.filter(row => row.state === 'accessible_file_sample').length === 68 && secondLevelRoutes.filter(row => row.state === 'accessible_html').length === 19 && secondLevelRoutes.filter(row => row.state === 'timeout').length === 1, 'second-level state denominator drift');
    check(secondLevelRoots.some(row => row.route_id === 'fl-check-a-charity-retry' && row.state === 'timeout'), 'Florida Check-A-Charity timeout custody missing');

    const secondLevelRouteById = new Map(secondLevelRoutes.map(row => [row.route_id, row]));
    check(secondLevelFollowed.every(row => secondLevelRouteById.has(row.source_route_id)), 'second-level followed route has no source route');
    check(secondLevelDiscovered.every(row => secondLevelRouteById.has(row.source_route_id) && knownReceiptIds.has(row.source_receipt_id) && row.official_host === true && row.query_submission_required === false && row.graph_effect === 'none'), 'second-level discovered-link boundary drift');
    check(secondLevelHtml.every(row => secondLevelRouteById.has(row.route_id) && knownReceiptIds.has(row.receipt_id) && row.query_submitted === false && row.raw_body_retained === false && row.graph_effect === 'none'), 'second-level HTML boundary drift');
    check(secondLevelForms.every(row => secondLevelRouteById.has(row.route_id) && knownReceiptIds.has(row.receipt_id) && row.query_submitted === false && row.hidden_values_retained === false && row.graph_effect === 'none'), 'second-level form boundary drift');
    check(secondLevelForms.every(row => (row.controls || []).every(control => control.raw_value_retained === false && !Object.hasOwn(control, 'value'))), 'second-level form retained a raw value');

    const secondLevelProbedUrls = new Set(secondLevelRoutes.map(row => row.requested_url));
    const secondLevelUniqueLinks = new Map();
    for (const row of secondLevelDiscovered) if (!secondLevelUniqueLinks.has(row.href)) secondLevelUniqueLinks.set(row.href, row);
    const secondLevelResidual = [...secondLevelUniqueLinks.values()].filter(row => !secondLevelProbedUrls.has(row.href));
    const secondLevelRelevantResidual = secondLevelResidual.filter(row => row.relevant === true);
    const secondLevelFileSuffixes = new Set(['.csv','.doc','.docx','.json','.pdf','.txt','.xls','.xlsx','.xml','.zip']);
    const secondLevelResidualFiles = secondLevelRelevantResidual.filter(row => {
      try { return secondLevelFileSuffixes.has(path.posix.extname(new URL(row.href).pathname).toLowerCase()); } catch { return false; }
    });
    check(secondLevelResidual.length === 101 && manifest.counts.schoolhouse_charity_nc_second_level_residual_unique_links === 101, 'second-level residual-unique denominator drift');
    check(secondLevelRelevantResidual.length === 51 && manifest.counts.schoolhouse_charity_nc_second_level_residual_relevant_links === 51, 'second-level residual-relevant denominator drift');
    check(secondLevelResidualFiles.length === 16 && manifest.counts.schoolhouse_charity_nc_second_level_residual_file_links === 16, 'second-level residual-file denominator drift');

    check(secondLevelCustody.acquisition.workflow_run_id === 30982778498 && secondLevelCustody.acquisition.artifact_id === 8920802436 && secondLevelCustody.acquisition.artifact_digest === 'sha256:f109b0c3c1b0b582cdf124029cd5bf6663dc1510eec89eed6ee8bf25f1e55eec' && secondLevelCustody.acquisition.acquisition_head === '75c8f50ab1a31e5b115e3d6973cbd6ffb7c750ee', 'second-level acquisition custody drift');
    check(secondLevelCustody.bounds.maximum_followed_routes === 80 && secondLevelCustody.bounds.maximum_depth === 2 && secondLevelCustody.bounds.followed_route_cap_exhausted === true && secondLevelCustody.bounds.depth_two_routes_followed === 0, 'second-level bound custody drift');
    check(secondLevelCustody.counts.terminal_route_rows === 88 && secondLevelCustody.counts.discovered_link_rows === 524 && secondLevelCustody.counts.unique_discovered_links === 185 && secondLevelCustody.counts.bounded_file_sample_routes === 68 && secondLevelCustody.counts.html_surface_rows === 19 && secondLevelCustody.counts.form_rows === 3, 'second-level custody denominator drift');
    check(secondLevelCustody.counts.residual_unique_links === 101 && secondLevelCustody.counts.residual_relevant_links === 51 && secondLevelCustody.counts.residual_file_links === 16, 'second-level custody residual drift');
    check(secondLevelCustody.florida.check_a_charity_state === 'timeout' && secondLevelCustody.florida.query_submissions === 0 && secondLevelCustody.florida.automation_permission_inferred === false, 'second-level Florida custody drift');
    check(secondLevelCustody.north_carolina.automated_or_scripted_interactive_searches_not_permitted === true && secondLevelCustody.north_carolina.interactive_search_submissions === 0, 'second-level North Carolina policy custody drift');
    check(secondLevelCustody.privacy.raw_source_retained === false && secondLevelCustody.privacy.hidden_form_values_retained === false && secondLevelCustody.privacy.street_address_rows_retained === 0 && secondLevelCustody.privacy.contact_detail_rows_retained === 0 && secondLevelCustody.privacy.private_support_rows === 0, 'second-level custody privacy drift');
    check(secondLevelCustody.public_schoolhouse_identity_admitted === false && secondLevelCustody.negative_existence_claim_created === false && secondLevelCustody.outside_human_dependency === false && secondLevelCustody.publication_effect === 'none' && secondLevelCustody.adoption_effect === 'none' && secondLevelCustody.graph_effect === 'none' && secondLevelCustody.promotes_to === 'candidate_only', 'second-level custody authority drift');

    const secondLevelProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_second_level_route_discovery;
    check(secondLevelProjection?.terminal_route_rows === 88 && secondLevelProjection?.discovered_link_rows === 524 && secondLevelProjection?.residual_relevant_links === 51 && secondLevelProjection?.residual_file_links === 16, 'School.House second-level projection drift');
    check(secondLevelProjection?.identity_state === 'unresolved_after_terminal_second_level_static_route_discovery_no_public_identity_admitted' && secondLevelProjection?.admitted_legal_name === null && secondLevelProjection?.admitted_ein === null, 'School.House second-level identity authority drift');
    const secondLevelFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_second_level_route_discovery;
    check(secondLevelFrontier?.terminal_route_rows === 88 && secondLevelFrontier?.residual_relevant_links === 51 && secondLevelFrontier?.residual_file_links === 16 && secondLevelFrontier?.admitted_identities === 0, 'School.House second-level frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House Florida-charity and North Carolina second-level static-route discovery' && row.enumerated_total === 88 && row.residual_relevant_links === 51 && row.residual_file_links === 16 && row.search_submissions === 0), 'second-level coverage denominator missing');
  }


  {
    const finalResidualCustody = readJson(path.join(dir, 'schoolhouse-charity-nc-final-static-residual-custody.json'));
    const finalResidualInputs = readJsonl(path.join(dir, 'schoolhouse-charity-nc-final-static-residual-input-links.jsonl'));
    const finalResidualRoutes = readJsonl(path.join(dir, 'schoolhouse-charity-nc-final-static-residual-route-results.jsonl'));
    const finalResidualHtml = readJsonl(path.join(dir, 'schoolhouse-charity-nc-final-static-residual-html-surfaces.jsonl'));
    const finalResidualForms = readJsonl(path.join(dir, 'schoolhouse-charity-nc-final-static-residual-surface-forms.jsonl'));
    const finalResidualFiles = readJsonl(path.join(dir, 'schoolhouse-charity-nc-final-static-residual-file-samples.jsonl'));

    check(manifest.counts.source_inventory_rows === 408, 'final residual source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 24, 'final residual coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'final residual explicit-gap count drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_input_rows === finalResidualInputs.length && finalResidualInputs.length === 51, 'final residual input denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_route_rows === finalResidualRoutes.length && finalResidualRoutes.length === 51, 'final residual route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_file_target_rows === finalResidualInputs.filter(row => row.file_target === true).length && manifest.counts.schoolhouse_charity_nc_final_static_residual_file_target_rows === 16, 'final residual input file-target denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_file_target_rows === finalResidualRoutes.filter(row => row.input_file_target === true).length && manifest.counts.schoolhouse_charity_nc_final_static_residual_terminal_file_target_rows === 16, 'final residual terminal file-target denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_html_success_routes === finalResidualRoutes.filter(row => row.terminal_state === 'http_success_html').length && manifest.counts.schoolhouse_charity_nc_final_static_residual_html_success_routes === 34, 'final residual HTML-success denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_bounded_file_sample_routes === finalResidualRoutes.filter(row => row.terminal_state === 'http_success_file_sample').length && manifest.counts.schoolhouse_charity_nc_final_static_residual_bounded_file_sample_routes === 15, 'final residual file-sample-route denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_http_error_routes === finalResidualRoutes.filter(row => row.terminal_state === 'http_error').length && manifest.counts.schoolhouse_charity_nc_final_static_residual_http_error_routes === 2, 'final residual HTTP-error denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_html_surface_rows === finalResidualHtml.length && finalResidualHtml.length === 35, 'final residual HTML-surface denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_form_rows === finalResidualForms.length && finalResidualForms.length === 0, 'final residual form denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_file_sample_rows === finalResidualFiles.length && finalResidualFiles.length === 15, 'final residual file-sample denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_final_static_residual_search_submissions === 0 && manifest.counts.schoolhouse_charity_nc_final_static_residual_source_rows_acquired === 0 && manifest.counts.schoolhouse_charity_nc_final_static_residual_admitted_identity_rows === 0, 'final residual authority-count drift');

    check(unique(finalResidualInputs.map(row => row.route_id)) && unique(finalResidualInputs.map(row => row.url)), 'final residual input IDs and URLs must be unique');
    check(finalResidualInputs.every(row => knownReceiptIds.has(row.receipt_id) && row.source_receipt_ids.every(id => knownReceiptIds.has(id))), 'final residual input receipt custody drift');
    check(finalResidualInputs.every(row => row.official_host === true && row.relevant === true && row.query_submission_required === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'final residual input authority drift');
    check(unique(finalResidualRoutes.map(row => row.route_id)) && unique(finalResidualRoutes.map(row => row.receipt_id)), 'final residual route IDs and receipts must be unique');
    const finalResidualInputById = new Map(finalResidualInputs.map(row => [row.route_id, row]));
    check(finalResidualRoutes.every(row => finalResidualInputById.has(row.route_id) && finalResidualInputById.get(row.route_id).url === row.url && knownReceiptIds.has(row.receipt_id)), 'final residual route input/receipt drift');
    check(finalResidualRoutes.every(row => row.all_attempts_terminal === true && row.request_attempts === 1 && row.request_method === 'GET' && row.final_host_allowed === true), 'final residual route request-bound drift');
    check(finalResidualRoutes.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.complete_remote_file_retained === false), 'final residual route source/privacy drift');
    check(finalResidualRoutes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'final residual route authority drift');
    check(finalResidualRoutes.filter(row => row.status === 200).length === 34 && finalResidualRoutes.filter(row => row.status === 206).length === 15 && finalResidualRoutes.filter(row => row.status === 404).length === 1 && finalResidualRoutes.filter(row => row.status === 500).length === 1, 'final residual HTTP-status denominator drift');
    check(finalResidualRoutes.some(row => row.status === 404 && row.input_file_target === true && row.terminal_state === 'http_error'), 'final residual PDF 404 custody missing');
    check(finalResidualRoutes.some(row => row.status === 500 && row.input_file_target === false && row.terminal_state === 'http_error'), 'final residual manual-page 500 custody missing');

    check(unique(finalResidualHtml.map(row => row.route_id)), 'final residual HTML route IDs must be unique');
    check(finalResidualHtml.every(row => finalResidualInputById.has(row.route_id) && knownReceiptIds.has(row.receipt_id) && row.raw_html_retained === false && row.visible_text_retained === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.graph_effect === 'none'), 'final residual HTML custody drift');
    check(finalResidualForms.length === 0, 'final residual form rows must remain zero');
    check(unique(finalResidualFiles.map(row => row.route_id)), 'final residual file route IDs must be unique');
    check(finalResidualFiles.every(row => finalResidualInputById.get(row.route_id)?.file_target === true && knownReceiptIds.has(row.receipt_id) && row.status === 206 && row.range_requested === true && row.complete_remote_file_retained === false && row.full_file_sha256_claimed === false && row.source_rows_acquired === 0 && row.identity_admitted === false && row.graph_effect === 'none'), 'final residual file-sample custody drift');

    check(finalResidualCustody.acquisition.workflow_run_id === 30986284127 && finalResidualCustody.acquisition.artifact_id === 8922193975 && finalResidualCustody.acquisition.artifact_digest === 'sha256:aae714c531d7e4335c843ab9ce4bd7626c51c6f2d7be7588b6c8c02c7eb6142d' && finalResidualCustody.acquisition.acquisition_head === '4aba5edcd8f7680510aa464952c2fcf2f9efee38', 'final residual acquisition custody drift');
    check(finalResidualCustody.frozen_input.predecessor_sha256 === 'a25d2a537eda86f202ea438a53d6fd9369695a151163e2b67af304787fb25a52' && finalResidualCustody.frozen_input.residual_unique_links === 101 && finalResidualCustody.frozen_input.relevant_residual_routes === 51 && finalResidualCustody.frozen_input.file_targets === 16, 'final residual frozen input drift');
    check(finalResidualCustody.bounds.maximum_attempts_per_route === 1 && finalResidualCustody.bounds.maximum_parallel_workers === 8 && JSON.stringify(finalResidualCustody.bounds.request_methods) === JSON.stringify(['GET']) && finalResidualCustody.bounds.result_spawned_requests === 0, 'final residual bound custody drift');
    check(finalResidualCustody.counts.terminal_route_rows === 51 && finalResidualCustody.counts.terminal_file_target_rows === 16 && finalResidualCustody.counts.html_success_routes === 34 && finalResidualCustody.counts.bounded_file_sample_routes === 15 && finalResidualCustody.counts.http_error_routes === 2 && finalResidualCustody.counts.html_surface_rows === 35 && finalResidualCustody.counts.form_rows === 0 && finalResidualCustody.counts.file_sample_rows === 15, 'final residual custody denominator drift');
    check(finalResidualCustody.terminal_frontier.static_residual_route_denominator_terminal === true && finalResidualCustody.terminal_frontier.relevant_residual_routes_terminal === 51 && finalResidualCustody.terminal_frontier.file_targets_terminal === 16 && finalResidualCustody.terminal_frontier.outside_human_dependency === false, 'final residual terminal-frontier drift');
    check(finalResidualCustody.north_carolina.automated_or_scripted_interactive_searches_not_permitted === true && finalResidualCustody.north_carolina.interactive_search_submissions === 0, 'final residual North Carolina policy drift');
    check(finalResidualCustody.privacy.raw_source_retained === false && finalResidualCustody.privacy.complete_remote_files_retained === false && finalResidualCustody.privacy.hidden_form_values_retained === false && finalResidualCustody.privacy.street_address_rows_retained === 0 && finalResidualCustody.privacy.contact_detail_rows_retained === 0 && finalResidualCustody.privacy.private_support_rows === 0, 'final residual custody privacy drift');
    check(finalResidualCustody.public_schoolhouse_identity_admitted === false && finalResidualCustody.negative_existence_claim_created === false && finalResidualCustody.outside_human_dependency === false && finalResidualCustody.publication_effect === 'none' && finalResidualCustody.adoption_effect === 'none' && finalResidualCustody.graph_effect === 'none' && finalResidualCustody.promotes_to === 'candidate_only', 'final residual custody authority drift');

    const finalResidualProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_final_static_residual_custody;
    check(finalResidualProjection?.terminal_routes === 51 && finalResidualProjection?.terminal_file_targets === 16 && finalResidualProjection?.bounded_file_sample_routes === 15 && finalResidualProjection?.http_error_routes === 2 && finalResidualProjection?.html_surface_rows === 35 && finalResidualProjection?.form_rows === 0, 'School.House final residual projection drift');
    check(finalResidualProjection?.identity_state === 'unresolved_after_terminal_final_static_residual_no_public_identity_admitted' && finalResidualProjection?.admitted_legal_name === null && finalResidualProjection?.admitted_ein === null, 'School.House final residual identity authority drift');
    const finalResidualFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_final_static_residual_custody;
    check(finalResidualFrontier?.terminal_routes === 51 && finalResidualFrontier?.terminal_file_targets === 16 && finalResidualFrontier?.bounded_file_sample_routes === 15 && finalResidualFrontier?.http_error_routes === 2 && finalResidualFrontier?.admitted_identities === 0 && finalResidualFrontier?.static_residual_route_denominator_terminal === true, 'School.House final residual frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House North Carolina final static residual route custody' && row.enumerated_total === 51 && row.terminal_file_target_total === 16 && row.bounded_file_sample_routes === 15 && row.http_error_routes === 2 && row.search_submissions === 0), 'final residual coverage denominator missing');
  }


  {
    const completePdfCustody = readJson(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-custody.json'));
    const completePdfInputs = readJsonl(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-input-routes.jsonl'));
    const completePdfFull = readJsonl(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-full-file-custody.jsonl'));
    const completePdfClass = readJsonl(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-content-field-classification.jsonl'));
    const completePdfPolicy = readJson(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-route-policy.json'));
    const completePdfSummary = readJson(path.join(dir, 'schoolhouse-charity-nc-complete-pdf-field-summary.json'));

    check(manifest.counts.source_inventory_rows === 408, 'complete-PDF source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 24, 'complete-PDF coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'complete-PDF explicit-gap count drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_input_rows === completePdfInputs.length && completePdfInputs.length === 15, 'complete-PDF input denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_terminal_route_rows === completePdfFull.length && completePdfFull.length === 15, 'complete-PDF terminal denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_complete_file_hash_rows === completePdfFull.filter(row => row.state === 'complete_file_hashed').length && manifest.counts.schoolhouse_charity_nc_complete_pdf_complete_file_hash_rows === 15, 'complete-PDF hash denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_exact_length_match_rows === completePdfFull.filter(row => row.expected_length_matches === true).length && manifest.counts.schoolhouse_charity_nc_complete_pdf_exact_length_match_rows === 15, 'complete-PDF length-match denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_text_extraction_success_rows === completePdfClass.filter(row => row.text_extraction_state === 'success').length && manifest.counts.schoolhouse_charity_nc_complete_pdf_text_extraction_success_rows === 15, 'complete-PDF text-extraction denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_total_pages === completePdfClass.reduce((sum, row) => sum + row.page_count, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_total_pages === 377, 'complete-PDF page denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_screened_text_chars === completePdfClass.reduce((sum, row) => sum + row.extracted_text_chars, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_screened_text_chars === 332175, 'complete-PDF screened-text denominator drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_hit_rows === completePdfClass.filter(row => row.subject_term_hit).length && manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_hit_rows === 0, 'complete-PDF subject-hit row drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_total_hits === completePdfClass.reduce((sum, row) => sum + row.subject_term_hits, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_subject_term_total_hits === 0, 'complete-PDF subject-hit total drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_field_term_total_hits === completePdfClass.reduce((sum, row) => sum + row.field_term_hits, 0) && manifest.counts.schoolhouse_charity_nc_complete_pdf_field_term_total_hits === 586, 'complete-PDF field-term total drift');
    check(manifest.counts.schoolhouse_charity_nc_complete_pdf_search_submissions === 0 && manifest.counts.schoolhouse_charity_nc_complete_pdf_source_rows_acquired === 0 && manifest.counts.schoolhouse_charity_nc_complete_pdf_admitted_identity_rows === 0, 'complete-PDF authority-count drift');

    check(unique(completePdfInputs.map(row => row.route_id)) && unique(completePdfInputs.map(row => row.receipt_id)), 'complete-PDF input IDs must be unique');
    check(completePdfInputs.every(row => knownReceiptIds.has(row.receipt_id) && row.complete_remote_file_retained === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'complete-PDF input custody drift');
    check(unique(completePdfFull.map(row => row.route_id)) && unique(completePdfFull.map(row => row.receipt_id)), 'complete-PDF full-file IDs must be unique');
    check(completePdfFull.every(row => knownReceiptIds.has(row.receipt_id) && row.state === 'complete_file_hashed' && row.status === 200 && row.complete_file_hash_claimed === true && row.expected_length_matches === true && typeof row.full_file_sha256 === 'string' && row.full_file_sha256.length === 64), 'complete-PDF full-file state drift');
    check(completePdfFull.every(row => row.request_method === 'GET' && row.request_count === 1 && row.range_requested === false && row.query_submitted === false && row.organization_name_submitted === false && row.license_number_submitted === false), 'complete-PDF request-bound drift');
    check(completePdfFull.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.complete_remote_file_retained === false && row.hidden_form_values_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'complete-PDF privacy drift');
    check(completePdfFull.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'complete-PDF authority drift');
    check(unique(completePdfClass.map(row => row.route_id)) && unique(completePdfClass.map(row => row.receipt_id)), 'complete-PDF classification IDs must be unique');
    check(completePdfClass.every(row => knownReceiptIds.has(row.receipt_id) && row.pdfinfo_state === 'success' && row.text_extraction_state === 'success' && row.content_classification_state === 'aggregate_term_counts_complete_file'), 'complete-PDF classification state drift');
    check(completePdfClass.every(row => row.subject_term_hit === false && row.subject_term_hits === 0 && row.identity_admission_state === 'no_subject_term_observed_in_extracted_text' && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'complete-PDF subject/identity drift');

    check(completePdfPolicy.artifact_workflow_run_id === 30988735386 && completePdfPolicy.artifact_id === 8923190161 && completePdfPolicy.artifact_digest === 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8', 'complete-PDF policy artifact drift');
    check(completePdfPolicy.maximum_attempts_per_route === 1 && completePdfPolicy.search_submissions === 0 && completePdfPolicy.raw_source_retained === false && completePdfPolicy.complete_remote_files_retained === false && completePdfPolicy.extracted_text_retained === false && completePdfPolicy.identity_admitted === false && completePdfPolicy.graph_effect === 'none', 'complete-PDF policy authority drift');
    check(completePdfSummary.complete_file_hash_rows === 15 && completePdfSummary.text_extraction_success_rows === 15 && completePdfSummary.total_pdf_pages === 377 && completePdfSummary.total_extracted_text_chars_screened === 332175 && completePdfSummary.subject_term_total_hits === 0 && completePdfSummary.field_term_total_hits === 586, 'complete-PDF field summary denominator drift');
    check(completePdfSummary.extracted_text_retained === false && completePdfSummary.public_schoolhouse_identity_admitted === false && completePdfSummary.negative_existence_claim_created === false && completePdfSummary.graph_effect === 'none', 'complete-PDF field summary authority drift');

    check(completePdfCustody.acquisition.workflow_run_id === 30988735386 && completePdfCustody.acquisition.artifact_id === 8923190161 && completePdfCustody.acquisition.artifact_digest === 'sha256:173219a9ffe5dcdd22cccf533eb980f094e5b2fd8cc94e8a0ba7e886b9e33bd8' && completePdfCustody.acquisition.acquisition_head === '91a16438fecb1bde772dd88147c06f2c72eca38a', 'complete-PDF acquisition custody drift');
    check(completePdfCustody.counts.input_pdf_routes === 15 && completePdfCustody.counts.terminal_route_rows === 15 && completePdfCustody.counts.complete_file_hash_rows === 15 && completePdfCustody.counts.text_extraction_success_rows === 15 && completePdfCustody.counts.total_pdf_pages === 377 && completePdfCustody.counts.subject_term_total_hits === 0 && completePdfCustody.counts.field_term_total_hits === 586, 'complete-PDF custody denominator drift');
    check(completePdfCustody.terminal_frontier.complete_file_hash_denominator_terminal === true && completePdfCustody.terminal_frontier.fixed_subject_term_screen_terminal === true && completePdfCustody.terminal_frontier.outside_human_dependency === false, 'complete-PDF terminal frontier drift');
    check(completePdfCustody.privacy.raw_source_retained === false && completePdfCustody.privacy.complete_remote_files_retained === false && completePdfCustody.privacy.extracted_text_retained === false && completePdfCustody.privacy.street_address_rows_retained === 0 && completePdfCustody.privacy.contact_detail_rows_retained === 0 && completePdfCustody.privacy.private_support_rows === 0, 'complete-PDF custody privacy drift');
    check(completePdfCustody.public_schoolhouse_identity_admitted === false && completePdfCustody.negative_existence_claim_created === false && completePdfCustody.outside_human_dependency === false && completePdfCustody.publication_effect === 'none' && completePdfCustody.adoption_effect === 'none' && completePdfCustody.graph_effect === 'none' && completePdfCustody.promotes_to === 'candidate_only', 'complete-PDF custody authority drift');

    const completePdfProjection = schoolhouse.state_registry_identity_census?.charity_north_carolina_complete_pdf_custody;
    check(completePdfProjection?.complete_file_hash_rows === 15 && completePdfProjection?.text_extraction_success_rows === 15 && completePdfProjection?.total_pdf_pages === 377 && completePdfProjection?.subject_term_total_hits === 0 && completePdfProjection?.field_term_total_hits === 586, 'School.House complete-PDF projection drift');
    check(completePdfProjection?.identity_state === 'unresolved_after_complete_pdf_content_screen_no_public_identity_admitted' && completePdfProjection?.admitted_legal_name === null && completePdfProjection?.admitted_ein === null, 'School.House complete-PDF identity authority drift');
    const completePdfFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_charity_nc_complete_pdf_custody;
    check(completePdfFrontier?.complete_file_hash_rows === 15 && completePdfFrontier?.text_extraction_success_rows === 15 && completePdfFrontier?.total_pdf_pages === 377 && completePdfFrontier?.subject_term_total_hits === 0 && completePdfFrontier?.field_term_total_hits === 586 && completePdfFrontier?.admitted_identities === 0, 'School.House complete-PDF frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House North Carolina complete official PDF hash and fixed-term content custody' && row.enumerated_total === 15 && row.complete_file_hash_rows === 15 && row.total_pdf_pages === 377 && row.subject_term_total_hits === 0 && row.field_term_total_hits === 586 && row.search_submissions === 0), 'complete-PDF coverage denominator missing');
  }

  {
    const firstPartyCustody = readJson(path.join(dir, 'schoolhouse-first-party-legal-surface-custody.json'));
    const firstPartyRoutes = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-route-results.jsonl'));
    const firstPartyLinks = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-discovered-links.jsonl'));
    const firstPartyEvidence = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-evidence.jsonl'));
    const firstPartyCandidates = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-candidate-ledger.jsonl'));
    const firstPartyExternal = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-external-link-inventory.jsonl'));
    const firstPartyHtml = firstPartyEvidence.filter(row => row.surface_evidence_type === 'html_surface');
    const firstPartyForms = firstPartyEvidence.filter(row => row.surface_evidence_type === 'form_metadata');

    check(manifest.counts.source_inventory_rows === 408, 'first-party source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 24, 'first-party coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'first-party explicit-gap count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_root_route_rows === firstPartyRoutes.filter(row => row.route_class === 'fixed_root').length && manifest.counts.schoolhouse_first_party_legal_surface_root_route_rows === 5, 'first-party root-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_followed_route_rows === firstPartyRoutes.filter(row => row.route_class === 'query_free_same_host_follow').length && manifest.counts.schoolhouse_first_party_legal_surface_followed_route_rows === 41, 'first-party followed-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_terminal_route_rows === firstPartyRoutes.length && firstPartyRoutes.length === 46, 'first-party terminal-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_html_route_rows === firstPartyRoutes.filter(row => row.state === 'accessible_html').length && manifest.counts.schoolhouse_first_party_legal_surface_html_route_rows === 39, 'first-party HTML-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_xml_route_rows === firstPartyRoutes.filter(row => row.state === 'accessible_xml').length && manifest.counts.schoolhouse_first_party_legal_surface_xml_route_rows === 6, 'first-party XML-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_text_route_rows === firstPartyRoutes.filter(row => row.state === 'accessible_text').length && manifest.counts.schoolhouse_first_party_legal_surface_text_route_rows === 1, 'first-party text-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_discovered_link_rows === firstPartyLinks.length && firstPartyLinks.length === 555, 'first-party discovered-link denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_unique_discovered_links === new Set(firstPartyLinks.map(row => row.href)).size && manifest.counts.schoolhouse_first_party_legal_surface_unique_discovered_links === 78, 'first-party unique-link denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_same_host_link_rows === firstPartyLinks.filter(row => row.same_schoolhouse_host).length && manifest.counts.schoolhouse_first_party_legal_surface_same_host_link_rows === 444, 'first-party same-host link denominator drift');
    const firstPartyEligibleUrls = new Set(firstPartyLinks.filter(row => row.eligible_follow).map(row => row.href_without_query));
    const firstPartyRouteUrls = new Set(firstPartyRoutes.map(row => row.requested_url));
    const firstPartyUnfollowedEligible = [...firstPartyEligibleUrls].filter(url => !firstPartyRouteUrls.has(url));
    check(manifest.counts.schoolhouse_first_party_legal_surface_eligible_same_host_unique_links === firstPartyEligibleUrls.size && firstPartyEligibleUrls.size === 43, 'first-party eligible same-host denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_unfollowed_eligible_links === firstPartyUnfollowedEligible.length && firstPartyUnfollowedEligible.length === 0, 'first-party same-host closure drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_html_surface_rows === firstPartyHtml.length && firstPartyHtml.length === 39, 'first-party HTML-surface denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_structured_data_rows === 0, 'first-party structured-data denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_form_rows === firstPartyForms.length && firstPartyForms.length === 8, 'first-party form denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_candidate_rows === firstPartyCandidates.length && firstPartyCandidates.length === 78, 'first-party candidate denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_distinct_candidate_values === new Set(firstPartyCandidates.map(row => row.candidate_value)).size && manifest.counts.schoolhouse_first_party_legal_surface_distinct_candidate_values === 5, 'first-party distinct candidate-value drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_tax_status_claim_rows === firstPartyCandidates.filter(row => row.adjudication_state === 'first_party_501c3_or_nonprofit_claim_not_registry_grade').length && manifest.counts.schoolhouse_first_party_legal_surface_tax_status_claim_rows === 39, 'first-party tax-status claim denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_footer_brand_rows === firstPartyCandidates.filter(row => row.adjudication_state === 'footer_brand_string_not_legal_entity_name').length && manifest.counts.schoolhouse_first_party_legal_surface_footer_brand_rows === 38, 'first-party footer-brand denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_context_collision_rows === firstPartyCandidates.filter(row => row.adjudication_state === 'context_pattern_collision_not_schoolhouse_legal_status').length && manifest.counts.schoolhouse_first_party_legal_surface_context_collision_rows === 1, 'first-party context-collision denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_exact_legal_name_candidate_rows === 0, 'first-party exact legal-name candidate count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_legal_term_hits === firstPartyHtml.reduce((sum, row) => sum + row.legal_term_total_hits, 0) && manifest.counts.schoolhouse_first_party_legal_surface_legal_term_hits === 123, 'first-party legal-term count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_subject_term_hits === firstPartyHtml.reduce((sum, row) => sum + row.subject_term_total_hits, 0) && manifest.counts.schoolhouse_first_party_legal_surface_subject_term_hits === 77, 'first-party subject-term count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_external_link_rows === firstPartyExternal.length && firstPartyExternal.length === 111, 'first-party external-link denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_unique_external_hosts === new Set(firstPartyExternal.map(row => row.host)).size && manifest.counts.schoolhouse_first_party_legal_surface_unique_external_hosts === 31, 'first-party external-host denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_search_submissions === 0 && manifest.counts.schoolhouse_first_party_legal_surface_source_rows_acquired === 0 && manifest.counts.schoolhouse_first_party_legal_surface_admitted_identity_rows === 0, 'first-party authority count drift');

    check(unique(firstPartyRoutes.map(row => row.route_id)) && unique(firstPartyRoutes.map(row => row.receipt_id)), 'first-party route IDs and receipts must be unique');
    check(firstPartyRoutes.every(row => knownReceiptIds.has(row.receipt_id) && row.status === 200 && row.request_method === 'GET' && row.request_attempts === 1), 'first-party route receipt/request drift');
    check(firstPartyRoutes.every(row => row.query_submitted === false && row.form_submitted === false && row.application_submitted === false && row.account_action_submitted === false && row.payment_action_submitted === false && row.upload_submitted === false && row.contact_request_submitted === false), 'first-party submission boundary drift');
    check(firstPartyRoutes.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.visible_text_retained === false && row.hidden_form_values_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'first-party route privacy drift');
    check(firstPartyRoutes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'first-party route authority drift');
    check(firstPartyLinks.every(row => knownReceiptIds.has(row.source_receipt_id) && row.href === row.href_without_query && row.query_value_retained === false && row.query_submission_required === false && row.identity_admitted === false && row.graph_effect === 'none'), 'first-party discovered-link boundary drift');
    check(firstPartyHtml.every(row => knownReceiptIds.has(row.receipt_id) && row.raw_html_retained === false && row.visible_text_retained === false && row.footer_text_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.identity_admitted === false && row.graph_effect === 'none'), 'first-party HTML privacy/authority drift');
    check(firstPartyForms.every(row => knownReceiptIds.has(row.receipt_id) && row.hidden_values_retained === false && row.control_values_retained === false && row.query_submitted === false && row.form_submitted === false && row.identity_admitted === false && row.graph_effect === 'none'), 'first-party form privacy/authority drift');
    check(firstPartyCandidates.every(row => knownReceiptIds.has(row.receipt_id) && row.identifier_grade === false && row.registry_grade === false && row.legal_name_effect === 'none' && row.admitted_legal_name === null && row.admitted_ein === null && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'first-party candidate authority drift');
    check(firstPartyExternal.every(row => knownReceiptIds.has(row.source_receipt_id) && row.fetched === false && row.query_value_retained === false && row.query_submitted === false && row.identity_admitted === false && row.adjudication_state === 'external_public_lead_not_fetched_or_identity_joined' && row.graph_effect === 'none'), 'first-party external-link authority drift');
    check(firstPartyExternal.filter(row => row.route_class === 'public_social_platform').length === 42 && firstPartyExternal.filter(row => row.route_class === 'external_public_link_not_fetched').length === 69, 'first-party external route-class drift');

    check(firstPartyCustody.acquisition.workflow_run_id === 30990750394 && firstPartyCustody.acquisition.artifact_id === 8923990465 && firstPartyCustody.acquisition.artifact_digest === 'sha256:096bad980f5323fd04c1d75fcf3f2e7c954d13fdbb0ae47f8f06c8a160fbae8e' && firstPartyCustody.acquisition.acquisition_head === '71b13676c36c44d5e59d543c240f923304b5a4fb', 'first-party acquisition custody drift');
    check(firstPartyCustody.bounds.fixed_root_routes === 5 && firstPartyCustody.bounds.maximum_total_routes === 120 && firstPartyCustody.bounds.maximum_depth === 2 && firstPartyCustody.bounds.query_string_routes_followed === 0 && firstPartyCustody.bounds.external_links_fetched === 0, 'first-party bound custody drift');
    check(firstPartyCustody.counts.terminal_route_rows === 46 && firstPartyCustody.counts.eligible_query_free_same_host_unique_links === 43 && firstPartyCustody.counts.unfollowed_eligible_query_free_same_host_links === 0 && firstPartyCustody.counts.first_party_501c3_or_nonprofit_claim_rows === 39 && firstPartyCustody.counts.footer_brand_string_rows === 38 && firstPartyCustody.counts.explicit_schoolhouse_legal_name_candidate_rows === 0 && firstPartyCustody.counts.admitted_identities === 0, 'first-party custody denominator drift');
    check(firstPartyCustody.terminal_frontier.fixed_root_denominator_terminal === true && firstPartyCustody.terminal_frontier.discovered_query_free_same_host_route_denominator_terminal === true && firstPartyCustody.terminal_frontier.route_cap_exhausted === false && firstPartyCustody.terminal_frontier.outside_human_dependency === false, 'first-party terminal-frontier drift');
    check(firstPartyCustody.privacy.raw_source_retained === false && firstPartyCustody.privacy.visible_text_retained === false && firstPartyCustody.privacy.hidden_form_values_retained === false && firstPartyCustody.privacy.street_address_rows_retained === 0 && firstPartyCustody.privacy.contact_detail_rows_retained === 0 && firstPartyCustody.privacy.private_support_rows === 0, 'first-party custody privacy drift');
    check(firstPartyCustody.public_schoolhouse_identity_admitted === false && firstPartyCustody.admitted_legal_name === null && firstPartyCustody.admitted_ein === null && firstPartyCustody.negative_existence_claim_created === false && firstPartyCustody.outside_human_dependency === false && firstPartyCustody.publication_effect === 'none' && firstPartyCustody.adoption_effect === 'none' && firstPartyCustody.graph_effect === 'none' && firstPartyCustody.promotes_to === 'candidate_only', 'first-party custody authority drift');

    const firstPartyProjection = schoolhouse.state_registry_identity_census?.first_party_legal_surface_census;
    check(firstPartyProjection?.terminal_routes === 46 && firstPartyProjection?.eligible_query_free_same_host_unique_links === 43 && firstPartyProjection?.unfollowed_eligible_query_free_same_host_links === 0 && firstPartyProjection?.first_party_501c3_or_nonprofit_claim_rows === 39 && firstPartyProjection?.exact_legal_name_candidate_rows === 0, 'School.House first-party projection drift');
    check(firstPartyProjection?.identity_state === 'unresolved_after_terminal_first_party_surface_census_no_registry_identity_admitted' && firstPartyProjection?.admitted_legal_name === null && firstPartyProjection?.admitted_ein === null && firstPartyProjection?.public_schoolhouse_identity_admitted === false, 'School.House first-party identity authority drift');
    const firstPartyFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_first_party_legal_surface_census;
    check(firstPartyFrontier?.terminal_routes === 46 && firstPartyFrontier?.eligible_query_free_same_host_unique_links === 43 && firstPartyFrontier?.unfollowed_eligible_query_free_same_host_links === 0 && firstPartyFrontier?.first_party_tax_status_claim_rows === 39 && firstPartyFrontier?.exact_legal_name_candidate_rows === 0 && firstPartyFrontier?.admitted_identities === 0, 'School.House first-party frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House query-free first-party legal and governance surface census' && row.enumerated_total === 46 && row.eligible_query_free_same_host_unique_links === 43 && row.unfollowed_eligible_query_free_same_host_links === 0 && row.first_party_tax_status_claim_rows === 39 && row.exact_legal_name_candidate_rows === 0 && row.search_submissions === 0), 'first-party coverage denominator missing');
  }


  {
    const archiveCustody = readJson(path.join(dir, 'schoolhouse-first-party-archive-locator-custody.json'));
    const archiveAttempts = readJsonl(path.join(dir, 'schoolhouse-first-party-archive-locator-attempt-results.jsonl'));
    const archiveRoutes = readJsonl(path.join(dir, 'schoolhouse-first-party-archive-locator-route-results.jsonl'));
    const archiveLocators = readJsonl(path.join(dir, 'schoolhouse-first-party-archive-locators.jsonl'));
    const archiveReceiptIds = new Set(sourceInventory.map(row => row.receipt_id));
    const archiveBaselineAttempts = archiveAttempts.filter(row => row.acquisition_phase === 'baseline_archive_locator_census');
    const archiveReplayAttempts = archiveAttempts.filter(row => row.acquisition_phase === 'bounded_transport_replay');
    const archiveRoutesWithLocators = archiveRoutes.filter(row => row.snapshot_locator_rows > 0);
    const archiveBoundedZeroRoutes = archiveRoutes.filter(row => row.effective_state_class === 'bounded_zero_archive_locator_metadata');
    const archiveResidualProviderErrors = archiveRoutes.filter(row => row.effective_state_class === 'archive_locator_provider_error');

    check(manifest.counts.source_inventory_rows === 408, 'archive source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 24, 'archive coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'archive explicit-gap count drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_source_route_rows === archiveRoutes.length && archiveRoutes.length === 46, 'archive source-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_baseline_attempt_rows === archiveBaselineAttempts.length && archiveBaselineAttempts.length === 46, 'archive baseline-attempt denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_replay_attempt_rows === archiveReplayAttempts.length && archiveReplayAttempts.length === 26, 'archive replay-attempt denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_total_attempt_rows === archiveAttempts.length && archiveAttempts.length === 72, 'archive total-attempt denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_effective_route_rows === archiveRoutes.length && archiveRoutes.length === 46, 'archive effective-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_routes_with_locators === archiveRoutesWithLocators.length && archiveRoutesWithLocators.length === 21, 'archive routes-with-locators drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_bounded_zero_routes === archiveBoundedZeroRoutes.length && archiveBoundedZeroRoutes.length === 3, 'archive bounded-zero denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_residual_provider_error_routes === archiveResidualProviderErrors.length && archiveResidualProviderErrors.length === 22, 'archive residual-error denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_rows === archiveLocators.length && archiveLocators.length === 66, 'archive locator-row denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_unique_digests === new Set(archiveLocators.map(row => row.archive_digest)).size && manifest.counts.schoolhouse_first_party_archive_locator_unique_digests === 64, 'archive unique-digest denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_result_caps_exhausted === archiveAttempts.filter(row => row.result_cap_exhausted).length && manifest.counts.schoolhouse_first_party_archive_locator_result_caps_exhausted === 0, 'archive result-cap denominator drift');
    check(manifest.counts.schoolhouse_first_party_archive_locator_archived_bodies_fetched === 0 && manifest.counts.schoolhouse_first_party_archive_locator_replay_dereferences === 0 && manifest.counts.schoolhouse_first_party_archive_locator_search_submissions === 0 && manifest.counts.schoolhouse_first_party_archive_locator_source_rows_acquired === 0 && manifest.counts.schoolhouse_first_party_archive_locator_admitted_identity_rows === 0, 'archive authority count drift');

    check(unique(archiveAttempts.map(row => row.attempt_id)) && unique(archiveAttempts.map(row => row.attempt_receipt_id)), 'archive attempt IDs and receipts must be unique');
    check(unique(archiveRoutes.map(row => row.source_route_id)) && unique(archiveRoutes.map(row => row.route_custody_id)), 'archive effective-route IDs must be unique');
    check(unique(archiveLocators.map(row => row.locator_id)), 'archive locator IDs must be unique');
    check(archiveAttempts.every(row => archiveReceiptIds.has(row.attempt_receipt_id) && row.request_method === 'GET' && row.request_attempts === 1), 'archive attempt receipt/request drift');
    check(archiveAttempts.every(row => row.archived_bodies_fetched === 0 && row.replay_locators_dereferenced === 0 && row.interactive_search_submissions === 0 && row.organization_name_submissions === 0 && row.identifier_submissions === 0), 'archive attempt acquisition boundary drift');
    check(archiveAttempts.every(row => row.source_rows_acquired === 0 && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'archive attempt privacy drift');
    check(archiveAttempts.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'archive attempt authority drift');
    check(archiveBaselineAttempts.every(row => row.attempt_number_for_route === 1), 'archive baseline attempt-number drift');
    check(archiveReplayAttempts.every(row => row.attempt_number_for_route === 2 && row.baseline_state === 'terminal_archive_transport_error_not_absence_evidence'), 'archive replay predecessor drift');
    check(archiveRoutes.every(row => archiveReceiptIds.has(row.baseline_attempt_receipt_id) && (row.replay_attempt_receipt_id === null || archiveReceiptIds.has(row.replay_attempt_receipt_id))), 'archive route receipt linkage drift');
    check(archiveRoutes.every(row => row.total_archive_api_attempts === (row.replay_attempt_receipt_id === null ? 1 : 2)), 'archive route attempt-count drift');
    check(archiveRoutes.every(row => row.archived_content_custody === false && row.archived_bodies_fetched === 0 && row.replay_locators_dereferenced === 0 && row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'archive route authority drift');
    check(archiveRoutes.reduce((sum, row) => sum + row.snapshot_locator_rows, 0) === archiveLocators.length, 'archive effective-route locator total drift');
    check(archiveLocators.every(row => archiveReceiptIds.has(row.attempt_receipt_id) && row.status_code === 200 && row.archived_body_fetched === false && row.replay_dereferenced === false && row.archived_content_custody === false), 'archive locator custody drift');
    check(archiveLocators.every(row => row.source_rows_acquired === 0 && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'archive locator privacy drift');
    check(archiveLocators.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'archive locator authority drift');

    check(archiveCustody.acquisitions.baseline.workflow_run_id === 30995963355 && archiveCustody.acquisitions.baseline.artifact_id === 8926199862 && archiveCustody.acquisitions.baseline.artifact_digest === 'sha256:1db8ed490991492167b6b9c2a2fbaaaca83ae8f09d036457dbd151202c0cc103' && archiveCustody.acquisitions.baseline.route_results_sha256 === '713f5e8f973c277706131112b0c8bc68eba69ab8fd8e5470c58e2a53bc966e0e' && archiveCustody.acquisitions.baseline.snapshot_locators_sha256 === '10d03c93d0a45b41e8a77937b08a1acb1ebdf7c0fe5b377aa8b55be9c4036b0c', 'archive baseline acquisition custody drift');
    check(archiveCustody.acquisitions.bounded_transport_replay.workflow_run_id === 31019907916 && archiveCustody.acquisitions.bounded_transport_replay.artifact_id === 8936473911 && archiveCustody.acquisitions.bounded_transport_replay.artifact_digest === 'sha256:c20278d37fe505aa6d465e6f02da0e8dde69f7086fe05c064dcced980009dbab', 'archive replay acquisition custody drift');
    check(archiveCustody.counts.source_route_rows === 46 && archiveCustody.counts.total_attempt_rows === 72 && archiveCustody.counts.routes_with_snapshot_locators === 21 && archiveCustody.counts.bounded_zero_snapshot_locator_routes === 3 && archiveCustody.counts.residual_provider_error_routes === 22 && archiveCustody.counts.archive_snapshot_locator_rows === 66 && archiveCustody.counts.unique_archive_digests === 64, 'archive custody denominator drift');
    check(archiveCustody.interpretation.archive_locator_metadata_is_not_archived_content_custody === true && archiveCustody.interpretation.bounded_zero_rows_is_not_absence === true && archiveCustody.interpretation.provider_error_after_bounded_replay_is_not_absence === true && archiveCustody.interpretation.replay_locator_must_not_be_dereferenced_without_separate_authorization === true, 'archive interpretation drift');
    check(archiveCustody.terminal_frontier.declared_two_attempt_archive_metadata_protocol_terminal === true && archiveCustody.terminal_frontier.baseline_transport_errors_replayed_exactly_once === true && archiveCustody.terminal_frontier.archived_content_custody_open === true && archiveCustody.terminal_frontier.registry_grade_legal_identity_open === true && archiveCustody.terminal_frontier.outside_human_dependency === false, 'archive terminal-frontier drift');
    check(archiveCustody.privacy.raw_source_retained === false && archiveCustody.privacy.archived_page_bodies_retained === false && archiveCustody.privacy.archived_visible_text_retained === false && archiveCustody.privacy.street_address_rows_retained === 0 && archiveCustody.privacy.contact_detail_rows_retained === 0 && archiveCustody.privacy.private_support_rows === 0, 'archive custody privacy drift');
    check(archiveCustody.public_schoolhouse_identity_admitted === false && archiveCustody.admitted_legal_name === null && archiveCustody.admitted_ein === null && archiveCustody.negative_existence_claim_created === false && archiveCustody.outside_human_dependency === false && archiveCustody.publication_effect === 'none' && archiveCustody.adoption_effect === 'none' && archiveCustody.graph_effect === 'none' && archiveCustody.promotes_to === 'candidate_only', 'archive custody authority drift');

    const archiveProjection = schoolhouse.state_registry_identity_census?.first_party_archive_locator_custody;
    check(archiveProjection?.source_routes === 46 && archiveProjection?.total_attempt_rows === 72 && archiveProjection?.routes_with_snapshot_locators === 21 && archiveProjection?.bounded_zero_snapshot_locator_routes === 3 && archiveProjection?.residual_provider_error_routes === 22 && archiveProjection?.archive_snapshot_locator_rows === 66 && archiveProjection?.unique_archive_digests === 64, 'School.House archive projection drift');
    check(archiveProjection?.archived_content_state === 'not_acquired' && archiveProjection?.identity_state === 'unresolved_after_archive_locator_metadata_custody_no_registry_identity_admitted' && archiveProjection?.admitted_legal_name === null && archiveProjection?.admitted_ein === null && archiveProjection?.public_schoolhouse_identity_admitted === false, 'School.House archive identity authority drift');
    const archiveFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_first_party_archive_locator_custody;
    check(archiveFrontier?.source_routes === 46 && archiveFrontier?.total_attempt_rows === 72 && archiveFrontier?.routes_with_snapshot_locators === 21 && archiveFrontier?.bounded_zero_snapshot_locator_routes === 3 && archiveFrontier?.residual_provider_error_routes === 22 && archiveFrontier?.archive_snapshot_locator_rows === 66 && archiveFrontier?.admitted_identities === 0, 'School.House archive frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House first-party public Archive locator metadata custody' && row.enumerated_total === 46 && row.total_attempt_rows === 72 && row.routes_with_snapshot_locators === 21 && row.bounded_zero_snapshot_locator_routes === 3 && row.residual_provider_error_routes === 22 && row.archive_snapshot_locator_rows === 66 && row.search_submissions === 0), 'archive coverage denominator missing');
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] || DEFAULT_DIR;
  const errors = validateBVVCDefenseCapital(dir);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }
  console.log('BVVC defense-capital public-source lake: PASS');
}
