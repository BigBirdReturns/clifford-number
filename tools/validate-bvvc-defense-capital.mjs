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
    state_registry_admitted_identity_rows: schoolhouseFlFictitiousAdjudication.identity_decision.admitted_document_number === null ? 0 : 1
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
    schoolhouseFlFictitiousCandidates, schoolhouseFlFictitiousAdjudication
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
