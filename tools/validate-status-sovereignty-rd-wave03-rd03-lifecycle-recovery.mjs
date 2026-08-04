#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  PATHS,
  REQUIRED_FIELDS,
  buildExpectedBundle,
  loadCommittedBundle
} from './build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery.mjs';

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const exactKeys = (value, keys, label) => {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  ok(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), `${label} keys changed`);
};
const unique = (values, label) => ok(new Set(values).size === values.length, `${label} duplicated`);
const sorted = (values) => [...values].sort();
const shaPattern = /^[0-9a-f]{64}$/;
const routePattern = /^RD03-W03-R0(?:0[1-9]|[1-3][0-9]|4[0-3])$/;
const TERMINAL_STATE = 'bounded_source_restricted';
const TERMINAL_FIELD_STATES = new Set([
  'observed',
  'conditional_term_only',
  'not_applicable_by_instrument_state',
  'source_restricted',
  'source_unavailable_after_fixed_protocol',
  'not_publicly_recovered'
]);
const INSTRUMENT_IDS = [
  'OSC-MP-MATERIALS-150M',
  'OSC-VULCAN-620M',
  'OSC-REELEMENT-80M',
  'OSC-PHOENIX-500M',
  'OSC-ENERGY-FUELS-725M'
];
const EXPECTED_ROUTE_IDS = Array.from({ length: 43 }, (_, index) => `RD03-W03-R${String(index + 1).padStart(3, '0')}`);
const RESTRICTED_EXACT_ROUTE_IDS = EXPECTED_ROUTE_IDS.slice(0, 12);
const SUCCESSFUL_EXACT_ROUTE_IDS = EXPECTED_ROUTE_IDS.slice(12, 18);
const CANDIDATE_ROUTE_IDS = EXPECTED_ROUTE_IDS.slice(18);
const EXPECTED_CANDIDATE_URLS = [
  'https://myapplications.microsoft.com/',
  'https://outlook.office.com/mail/?ui=en-US&rs=US',
  'https://outlook.office.com/mail/inbox',
  'https://portal.office.com/Home/',
  'https://support.microsoft.com/en-us/office/lifecycle/officeinstall/download-and-install-or-reinstall-office-2021-office-2019-or-office-2016',
  'https://support.microsoft.com/en-us/office/lifecycle/officeinstall/download-install-or-reinstall-microsoft-365-or-office-2024-on-a-pc-or-mac',
  'https://www.microsoft.com/en-us/microsoft-365/download-office',
  'https://www.microsoft.com/en-us/microsoft-365/microsoft-office',
  'https://www.office.com/?omkt=en-GB',
  'https://www.office.com/html/MsaToken.html'
];
const EXPECTED_ROUTE_SETS = {
  'OSC-MP-MATERIALS-150M': [
    'RD03-W03-R001','RD03-W03-R002','RD03-W03-R003','RD03-W03-R004','RD03-W03-R005',
    'RD03-W03-R013','RD03-W03-R016',
    'RD03-W03-R019','RD03-W03-R020','RD03-W03-R021','RD03-W03-R022','RD03-W03-R023'
  ],
  'OSC-VULCAN-620M': [
    'RD03-W03-R006','RD03-W03-R007','RD03-W03-R008','RD03-W03-R014','RD03-W03-R017',
    'RD03-W03-R024','RD03-W03-R025','RD03-W03-R026','RD03-W03-R027','RD03-W03-R028'
  ],
  'OSC-REELEMENT-80M': [
    'RD03-W03-R006','RD03-W03-R007','RD03-W03-R008','RD03-W03-R014','RD03-W03-R017',
    'RD03-W03-R029','RD03-W03-R030','RD03-W03-R031','RD03-W03-R032','RD03-W03-R033'
  ],
  'OSC-PHOENIX-500M': [
    'RD03-W03-R009','RD03-W03-R034','RD03-W03-R035','RD03-W03-R036','RD03-W03-R037','RD03-W03-R038'
  ],
  'OSC-ENERGY-FUELS-725M': [
    'RD03-W03-R010','RD03-W03-R011','RD03-W03-R012','RD03-W03-R015','RD03-W03-R018',
    'RD03-W03-R039','RD03-W03-R040','RD03-W03-R041','RD03-W03-R042','RD03-W03-R043'
  ]
};

function validateAuthority(authority, label, { sourceAcquisitionOnly = false } = {}) {
  exactKeys(authority, sourceAcquisitionOnly
    ? ['source_acquisition_only','outside_human_dependency','external_contacts','external_reviews','class_closed','reviewed_disposition_changed','favoritism_finding','extraction_finding','public_recovery_finding','coordination_finding','common_purpose_finding','publication_effect','adoption_effect','graph_effect']
    : ['outside_human_dependency','external_contacts','external_reviews','denominator_widened','reviewed_disposition_changed','favoritism_finding','extraction_finding','public_recovery_finding','coordination_finding','common_purpose_finding','publication_effect','adoption_effect','graph_effect'], label);
  for (const [key, value] of Object.entries(authority)) {
    if (key.endsWith('_effect')) ok(value === 'none', `${label}.${key} changed`);
    else if (key === 'source_acquisition_only') ok(value === true, `${label}.${key} changed`);
    else if (typeof value === 'boolean') ok(value === false, `${label}.${key} changed`);
    else ok(value === 0, `${label}.${key} changed`);
  }
}

function validateCapture(capture) {
  exactKeys(capture, ['schema_version','wave_id','lane_id','class_id','issue','as_of','canonical_intake_merge','capture_target_head','fixed_protocol','capture','candidate_census','route_receipts','inspection','boundaries','authority'], 'capture');
  ok(capture.schema_version === 'ssc-rd03-wave03-lifecycle-recovery-capture-receipt@1', 'capture schema changed');
  ok(capture.wave_id === 'SSC-RD-W03' && capture.lane_id === 'RD-03' && capture.class_id === 'RD-03-C05' && capture.issue === 1016, 'capture identity changed');
  ok(capture.as_of === '2026-08-04', 'capture cutoff changed');
  ok(capture.canonical_intake_merge === 'f9327072a4856d514aa2e9f99479a2038f592bf6', 'canonical intake merge changed');
  ok(capture.capture_target_head === '31ae26b5b493e6072aa2501fc2327c3003729225', 'capture target head changed');

  exactKeys(capture.fixed_protocol, ['path','git_blob_sha','sha256','bytes','fixed_routes','exact_predeclared_routes','candidate_census_routes','maximum_attempts_per_route','result_spawned_requests'], 'capture.fixed_protocol');
  ok(capture.fixed_protocol.path === PATHS.protocol, 'capture protocol path changed');
  ok(capture.fixed_protocol.git_blob_sha === '03724a45a92b2446a0b82339d31d6e0a1d893905', 'capture protocol blob changed');
  ok(capture.fixed_protocol.sha256 === '882e9543516378fd50861784c7efd36764dfee47bd8c01ee8e9fad0c0fa06ba5', 'capture protocol digest changed');
  ok(capture.fixed_protocol.bytes === 38465, 'capture protocol bytes changed');
  ok(capture.fixed_protocol.fixed_routes === 43 && capture.fixed_protocol.exact_predeclared_routes === 18 && capture.fixed_protocol.candidate_census_routes === 25, 'capture route denominator changed');
  ok(capture.fixed_protocol.maximum_attempts_per_route === 1 && capture.fixed_protocol.result_spawned_requests === 0, 'capture recursion or attempt contract changed');

  exactKeys(capture.capture, ['workflow_run','artifact_id','artifact_zip_sha256','manifest_schema','manifest_entries','manifest_combined_sha256','manifest_file_sha256','fixed_routes','route_attempts','transport_completions','transport_failures','http_successes','bounded_http_non_successes','http_response_codes','exact_predeclared_routes','exact_predeclared_http_successes','exact_predeclared_http_restrictions','candidate_census_routes','candidate_census_http_successes','candidate_parse_failures','candidate_rows','unique_candidate_urls','admitted_candidate_sources','result_spawned_requests','external_contacts','external_reviews'], 'capture.capture');
  ok(capture.capture.workflow_run === 30940153705 && capture.capture.artifact_id === 8904843651, 'capture workflow or artifact identity changed');
  ok(capture.capture.artifact_zip_sha256 === 'd4720bd97ff9b8abc15c088b824174ab0314904cc16f8d7420bcd117241a36a5', 'capture archive digest changed');
  ok(capture.capture.manifest_schema === 'ssc-rd03-wave03-fixed-capture-manifest@1', 'capture manifest schema changed');
  ok(capture.capture.manifest_entries === 348 && capture.capture.manifest_combined_sha256 === '86a8906c7eb9bebd13a6f8ec1a9101e980cedaadff50dbfa28df8f13a3756b21', 'capture manifest custody changed');
  ok(shaPattern.test(capture.capture.manifest_file_sha256), 'capture manifest file digest malformed');
  ok(capture.capture.fixed_routes === 43 && capture.capture.route_attempts === 43 && capture.capture.transport_completions === 43 && capture.capture.transport_failures === 0, 'capture execution counts changed');
  ok(capture.capture.http_successes === 31 && capture.capture.bounded_http_non_successes === 12, 'capture HTTP counts changed');
  ok(JSON.stringify(capture.capture.http_response_codes) === JSON.stringify({ 200: 31, 403: 12 }), 'capture HTTP code ledger changed');
  ok(capture.capture.exact_predeclared_routes === 18 && capture.capture.exact_predeclared_http_successes === 6 && capture.capture.exact_predeclared_http_restrictions === 12, 'exact-route accounting changed');
  ok(capture.capture.candidate_census_routes === 25 && capture.capture.candidate_census_http_successes === 25 && capture.capture.candidate_parse_failures === 0, 'candidate-route execution changed');
  ok(capture.capture.candidate_rows === 250 && capture.capture.unique_candidate_urls === 10 && capture.capture.admitted_candidate_sources === 0, 'candidate-census accounting changed');
  ok(capture.capture.result_spawned_requests === 0 && capture.capture.external_contacts === 0 && capture.capture.external_reviews === 0, 'capture authority widened');

  exactKeys(capture.candidate_census, ['schema_version','candidate_rows','unique_candidate_urls','candidate_parse_failures','admitted_candidate_sources','result_spawned_requests','candidate_host_counts','unique_urls','osc_lifecycle_sources_recovered','candidate_results_followed'], 'capture.candidate_census');
  ok(capture.candidate_census.schema_version === 'ssc-rd03-wave03-fixed-candidate-census-index@1', 'candidate census schema changed');
  ok(capture.candidate_census.candidate_rows === 250 && capture.candidate_census.unique_candidate_urls === 10 && capture.candidate_census.candidate_parse_failures === 0, 'candidate census counts changed');
  ok(capture.candidate_census.admitted_candidate_sources === 0 && capture.candidate_census.result_spawned_requests === 0 && capture.candidate_census.osc_lifecycle_sources_recovered === 0 && capture.candidate_census.candidate_results_followed === 0, 'candidate result promoted');
  ok(JSON.stringify(capture.candidate_census.candidate_host_counts) === JSON.stringify({
    'myapplications.microsoft.com': 25,
    'outlook.office.com': 50,
    'portal.office.com': 25,
    'support.microsoft.com': 50,
    'www.microsoft.com': 50,
    'www.office.com': 50
  }), 'candidate host census changed');
  ok(JSON.stringify(capture.candidate_census.unique_urls) === JSON.stringify(EXPECTED_CANDIDATE_URLS), 'candidate URL census changed');

  ok(Array.isArray(capture.route_receipts) && capture.route_receipts.length === 43, '43 route receipts required');
  ok(JSON.stringify(capture.route_receipts.map((route) => route.route_id)) === JSON.stringify(EXPECTED_ROUTE_IDS), 'route receipt order or identity changed');
  unique(capture.route_receipts.map((route) => route.request_url), 'request URL');
  for (const [index, route] of capture.route_receipts.entries()) {
    exactKeys(route, ['route_ordinal','route_id','route_type','instrument_ids','purpose','request_url','search_term','response_code','curl_exit_code','terminal_transport_state','admitted_as_evidence','candidate_count','result_spawned_requests','body_bytes','body_sha256','headers_sha256','request_sha256','attempt_sha256','candidate_census_sha256','source_receipt_sha256'], `capture.route_receipts[${index}]`);
    ok(route.route_ordinal === index + 1 && route.route_id === EXPECTED_ROUTE_IDS[index], `${route.route_id}: ordinal changed`);
    ok(routePattern.test(route.route_id), `${route.route_id}: malformed route identity`);
    ok(Array.isArray(route.instrument_ids) && route.instrument_ids.length >= 1 && route.instrument_ids.every((id) => INSTRUMENT_IDS.includes(id)), `${route.route_id}: instrument custody changed`);
    ok(typeof route.purpose === 'string' && route.purpose.length > 15, `${route.route_id}: purpose missing`);
    ok(typeof route.request_url === 'string' && route.request_url.startsWith('https://'), `${route.route_id}: request URL malformed`);
    ok(route.curl_exit_code === 0 && route.result_spawned_requests === 0 && route.body_bytes > 0, `${route.route_id}: transport or recursion changed`);
    for (const key of ['body_sha256','headers_sha256','request_sha256','attempt_sha256','candidate_census_sha256','source_receipt_sha256']) {
      ok(shaPattern.test(route[key]), `${route.route_id}: ${key} malformed`);
    }
    if (index < 12) {
      ok(route.route_type === 'exact_predeclared_get' && route.search_term === null, `${route.route_id}: exact-route type changed`);
      ok(route.response_code === 403 && route.terminal_transport_state === 'bounded_http_non_success', `${route.route_id}: restriction state changed`);
      ok(route.admitted_as_evidence === false && route.candidate_count === 0, `${route.route_id}: restricted source promoted`);
    } else if (index < 18) {
      ok(route.route_type === 'exact_predeclared_get' && route.search_term === null, `${route.route_id}: exact-route type changed`);
      ok(route.response_code === 200 && route.terminal_transport_state === 'transport_success', `${route.route_id}: exact API state changed`);
      ok(route.admitted_as_evidence === true && route.candidate_count === 0, `${route.route_id}: exact regulatory API custody changed`);
    } else {
      ok(route.route_type === 'fixed_candidate_query_bing_rss' && typeof route.search_term === 'string' && route.search_term.length > 2, `${route.route_id}: candidate-route type changed`);
      ok(route.response_code === 200 && route.terminal_transport_state === 'transport_success', `${route.route_id}: candidate transport state changed`);
      ok(route.admitted_as_evidence === false && route.candidate_count === 10, `${route.route_id}: candidate admission or count changed`);
    }
  }

  exactKeys(capture.inspection, ['method','ocr_used','external_review','exact_success_endpoints','exact_restricted_endpoints','new_lifecycle_event_admissions'], 'capture.inspection');
  ok(capture.inspection.method === 'internal_machine_parse_of_exact_capture_artifact_and_inherited_repository_sources', 'inspection method changed');
  ok(capture.inspection.ocr_used === false && capture.inspection.external_review === false && capture.inspection.new_lifecycle_event_admissions === 0, 'inspection authority changed');
  ok(JSON.stringify(capture.inspection.exact_success_endpoints) === JSON.stringify(SUCCESSFUL_EXACT_ROUTE_IDS), 'successful exact endpoints changed');
  ok(JSON.stringify(capture.inspection.exact_restricted_endpoints) === JSON.stringify(RESTRICTED_EXACT_ROUTE_IDS), 'restricted exact endpoints changed');
  for (const [key, value] of Object.entries(capture.boundaries)) ok(value === false, `capture boundary ${key} weakened`);
  validateAuthority(capture.authority, 'capture.authority', { sourceAcquisitionOnly: true });
}

function validateMatrix(matrix) {
  exactKeys(matrix, ['schema_version','wave_id','lane_id','class_id','issue','class_label','status','as_of','source_product','permitted_field_states','required_fields','instruments','counts','current_result','boundaries','authority'], 'matrix');
  ok(matrix.schema_version === 'ssc-rd03-wave03-lifecycle-recovery-terminal-matrix@1', 'matrix schema changed');
  ok(matrix.wave_id === 'SSC-RD-W03' && matrix.lane_id === 'RD-03' && matrix.class_id === 'RD-03-C05' && matrix.issue === 1016, 'matrix identity changed');
  ok(matrix.class_label === 'commitment through repayment and public recovery chronology', 'matrix class label changed');
  ok(matrix.status === 'five_instrument_fifty_five_cell_matrix_terminal_bounded_source_restricted' && matrix.as_of === '2026-08-04', 'matrix status or cutoff changed');
  ok(JSON.stringify(matrix.permitted_field_states) === JSON.stringify([...TERMINAL_FIELD_STATES]), 'permitted field states changed');
  ok(JSON.stringify(matrix.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required field order changed');
  ok(matrix.source_product.canonical_intake_merge === 'f9327072a4856d514aa2e9f99479a2038f592bf6', 'matrix intake merge changed');
  ok(matrix.source_product.terminal_branch_base === '44d4544b23dc24db24a4a7c61939396ada0b5fd5', 'terminal base changed');
  ok(matrix.source_product.capture_receipt_path === PATHS.capture && shaPattern.test(matrix.source_product.capture_receipt_sha256), 'matrix capture custody changed');

  ok(Array.isArray(matrix.instruments) && matrix.instruments.length === 5, 'five terminal instruments required');
  ok(JSON.stringify(matrix.instruments.map((row) => row.instrument_id)) === JSON.stringify(INSTRUMENT_IDS), 'instrument denominator or order changed');
  unique(matrix.instruments.map((row) => row.borrower), 'borrower');
  const stateCounts = Object.fromEntries([...TERMINAL_FIELD_STATES].map((state) => [state, 0]));
  let terminalCells = 0;
  for (const [index, row] of matrix.instruments.entries()) {
    exactKeys(row, ['instrument_id','borrower','inherited_parent_state','fields','instrument_result'], `${row.instrument_id} row`);
    exactKeys(row.fields, REQUIRED_FIELDS, `${row.instrument_id} fields`);
    const expectedRoutes = EXPECTED_ROUTE_SETS[row.instrument_id];
    for (const fieldId of REQUIRED_FIELDS) {
      const cell = row.fields[fieldId];
      exactKeys(cell, ['state','value','source_ids','capture_route_ids','note','fixed_protocol_complete','terminal_for_class_closure'], `${row.instrument_id}/${fieldId}`);
      ok(TERMINAL_FIELD_STATES.has(cell.state), `${row.instrument_id}/${fieldId}: nonterminal state`);
      ok(cell.fixed_protocol_complete === true && cell.terminal_for_class_closure === true, `${row.instrument_id}/${fieldId}: fixed protocol incomplete`);
      ok(Array.isArray(cell.source_ids) && cell.source_ids.length >= 1 && cell.source_ids.every((id) => /^SSC-RD03-S00[1-9]$/.test(id)), `${row.instrument_id}/${fieldId}: parent source custody missing`);
      ok(Array.isArray(cell.capture_route_ids) && JSON.stringify(cell.capture_route_ids) === JSON.stringify(expectedRoutes), `${row.instrument_id}/${fieldId}: route custody changed`);
      unique(cell.capture_route_ids, `${row.instrument_id}/${fieldId} route`);
      ok(typeof cell.note === 'string' && cell.note.length > 40, `${row.instrument_id}/${fieldId}: explanatory note missing`);
      stateCounts[cell.state] += 1;
      terminalCells += 1;
    }
    exactKeys(row.instrument_result, ['fixed_protocol_executed','required_fields','terminal_fields','observed_fields','conditional_term_only_fields','source_restricted_fields','instrument_closed','terminal_state'], `${row.instrument_id}.instrument_result`);
    ok(row.instrument_result.fixed_protocol_executed === true && row.instrument_result.required_fields === 11 && row.instrument_result.terminal_fields === 11, `${row.instrument_id}: terminal denominator changed`);
    ok(row.instrument_result.instrument_closed === true && row.instrument_result.terminal_state === TERMINAL_STATE, `${row.instrument_id}: terminal state changed`);
    if (index === 0) {
      ok(row.instrument_result.observed_fields === 7 && row.instrument_result.conditional_term_only_fields === 0 && row.instrument_result.source_restricted_fields === 4, 'MP field accounting changed');
    } else {
      ok(row.instrument_result.observed_fields === 4 && row.instrument_result.conditional_term_only_fields === 1 && row.instrument_result.source_restricted_fields === 6, `${row.instrument_id}: conditional field accounting changed`);
    }
  }
  ok(terminalCells === 55, '55 terminal cells required');
  ok(stateCounts.observed === 23 && stateCounts.conditional_term_only === 4 && stateCounts.source_restricted === 28, 'terminal field-state distribution changed');
  ok(stateCounts.not_applicable_by_instrument_state === 0 && stateCounts.source_unavailable_after_fixed_protocol === 0 && stateCounts.not_publicly_recovered === 0, 'terminal family drifted away from bounded source restriction');

  const mp = matrix.instruments[0].fields;
  ok(mp.commitment_state_and_governing_date.state === 'observed' && mp.commitment_state_and_governing_date.value.commitment_state === 'executed_direct_loan' && mp.commitment_state_and_governing_date.value.principal_usd === 150000000, 'MP executed-loan state changed');
  ok(mp.financial_close_and_executed_agreement_state_and_date.value.financial_close_observed === true && mp.financial_close_and_executed_agreement_state_and_date.value.executed_agreement_observed === true, 'MP financial-close state changed');
  ok(mp.draw_or_cash_disbursement_state_and_date.value.cash_proceeds_received === true && mp.draw_or_cash_disbursement_state_and_date.value.observed_cash_amount_usd === 150000000, 'MP cash receipt changed');
  ok(mp.interest_payment_chronology.state === 'source_restricted' && mp.interest_payment_chronology.value.annual_interest_rate_percent === 5.38 && mp.interest_payment_chronology.value.first_scheduled_cash_interest_date === '2025-10-15' && mp.interest_payment_chronology.value.observed_interest_payment_events === null, 'scheduled interest converted into payment or erased');
  ok(mp.principal_repayment_chronology.state === 'source_restricted' && mp.principal_repayment_chronology.value.maturity_date === '2037-08-01' && mp.principal_repayment_chronology.value.outstanding_snapshots.length === 2 && mp.principal_repayment_chronology.value.observed_principal_repayment_events === null, 'MP repayment boundary changed');
  ok(mp.public_recovery_or_unresolved_exposure_state.state === 'observed' && mp.public_recovery_or_unresolved_exposure_state.value.public_state === 'unresolved_public_exposure' && mp.public_recovery_or_unresolved_exposure_state.value.public_recovery_observed === false && mp.public_recovery_or_unresolved_exposure_state.value.default_inferred_from_outstanding_balance === false, 'MP exposure converted into recovery or default');
  ok(mp.field_and_instrument_terminal_state.value.source_restricted_field_ids.length === 4, 'MP restricted-field denominator changed');

  const conditionalExpected = {
    'OSC-VULCAN-620M': ['2025-11-03', 620000000],
    'OSC-REELEMENT-80M': ['2025-11-03', 80000000],
    'OSC-PHOENIX-500M': [null, 500000000],
    'OSC-ENERGY-FUELS-725M': ['2026-06-23', 725000000]
  };
  for (const row of matrix.instruments.slice(1)) {
    const fields = row.fields;
    const [date, ceiling] = conditionalExpected[row.instrument_id];
    const commitment = fields.commitment_state_and_governing_date;
    ok(commitment.state === 'conditional_term_only' && commitment.value.commitment_state === 'conditional_pre_close_commitment' && commitment.value.announced_ceiling_usd === ceiling, `${row.instrument_id}: conditional ceiling changed`);
    ok(commitment.value.governing_date === date && commitment.value.financial_close_observed_in_parent === false && commitment.value.cash_disbursement_observed_in_parent === false, `${row.instrument_id}: parent state changed`);
    for (const fieldId of ['financial_close_and_executed_agreement_state_and_date','draw_or_cash_disbursement_state_and_date','amendment_and_waiver_chronology','default_cure_acceleration_or_enforcement_chronology','interest_payment_chronology','principal_repayment_chronology']) {
      ok(fields[fieldId].state === 'source_restricted' && fields[fieldId].value === null, `${row.instrument_id}/${fieldId}: restricted downstream state changed`);
    }
    const exposure = fields.public_recovery_or_unresolved_exposure_state;
    ok(exposure.state === 'observed' && exposure.value.public_state === 'conditional_commitment_exposure_unresolved' && exposure.value.funded_public_principal_observed === false && exposure.value.public_recovery_observed === false && exposure.value.current_legal_state_claimed === false && exposure.value.event_absence_claimed === false, `${row.instrument_id}: unresolved conditional exposure changed`);
    ok(fields.field_and_instrument_terminal_state.value.source_restricted_field_ids.length === 6, `${row.instrument_id}: restricted-field denominator changed`);
  }
  ok(matrix.instruments[3].fields.commitment_state_and_governing_date.value.governing_date_precision === 'source_restricted_after_fixed_protocol', 'Phoenix governing-date restriction erased');
  ok(matrix.instruments[4].inherited_parent_state.includes('20_year_proposed_tenor'), 'Energy Fuels proposed tenor custody changed');

  for (const row of matrix.instruments) {
    const custody = row.fields.source_identities_and_exact_custody.value;
    ok(custody.capture_receipt_path === PATHS.capture && custody.capture_artifact.workflow_run === 30940153705 && custody.capture_artifact.artifact_id === 8904843651, `${row.instrument_id}: capture identity changed`);
    ok(custody.capture_artifact.artifact_zip_sha256 === 'd4720bd97ff9b8abc15c088b824174ab0314904cc16f8d7420bcd117241a36a5', `${row.instrument_id}: capture archive changed`);
    ok(custody.candidate_sources_admitted === 0 && custody.result_spawned_requests === 0, `${row.instrument_id}: candidate source promoted`);
    ok(JSON.stringify([...custody.exact_route_ids, ...custody.candidate_census_route_ids]) === JSON.stringify(EXPECTED_ROUTE_SETS[row.instrument_id]), `${row.instrument_id}: custody route split changed`);
  }

  const expectedCounts = {
    instrument_rows: 5, required_fields_per_instrument: 11, required_fields: 55, terminal_fields: 55,
    observed_fields: 23, conditional_term_only_fields: 4, source_restricted_fields: 28,
    source_unavailable_after_fixed_protocol_fields: 0, not_publicly_recovered_fields: 0, not_applicable_by_instrument_state_fields: 0,
    closed_instruments: 5, executed_and_cash_disbursed_instruments: 1, conditional_pre_close_instruments: 4,
    fixed_routes: 43, route_attempts: 43, transport_completions: 43, transport_failures: 0,
    http_successes: 31, exact_source_restrictions: 12, exact_regulatory_api_successes: 6,
    candidate_census_routes: 25, candidate_rows: 250, unique_candidate_urls: 10,
    admitted_candidate_sources: 0, result_spawned_requests: 0,
    admitted_amendment_or_waiver_records: 0,
    admitted_default_cure_acceleration_or_enforcement_records: 0,
    admitted_interest_payment_records: 0,
    admitted_principal_repayment_records: 0,
    admitted_public_recovery_records: 0,
    external_contacts: 0, external_reviews: 0
  };
  ok(JSON.stringify(matrix.counts) === JSON.stringify(expectedCounts), 'matrix counts changed');
  ok(matrix.current_result.terminal_state === TERMINAL_STATE && matrix.current_result.fixed_protocol_complete === true && matrix.current_result.class_closed === true && matrix.current_result.all_five_instruments_preserved === true && matrix.current_result.all_fifty_five_fields_terminal === true, 'matrix terminal result changed');
  ok(matrix.current_result.exact_source_restriction_preserved === true && matrix.current_result.candidate_results_admitted === 0 && matrix.current_result.outside_human_dependency === false && matrix.current_result.project_blocking === false, 'matrix restriction or no-human boundary changed');
  for (const [key, value] of Object.entries(matrix.boundaries)) {
    if (key.endsWith('_effect')) ok(value === 'none', `matrix boundary ${key} changed`);
    else ok(value === false, `matrix boundary ${key} weakened`);
  }
  validateAuthority(matrix.authority, 'matrix.authority');
}

export function validateBundleShape(bundle) {
  exactKeys(bundle, ['capture','matrix','summary','classReceipt','manifest','closure','schema'], 'bundle');
  const { capture, matrix, summary, classReceipt, manifest, closure, schema } = bundle;
  validateCapture(capture);
  validateMatrix(matrix);

  exactKeys(summary, ['schema_version','wave_id','lane_id','class_id','issue','terminal_state','class_closed','counts','current_result','authority'], 'summary');
  ok(summary.schema_version === 'ssc-rd03-wave03-lifecycle-recovery-summary@1' && summary.terminal_state === TERMINAL_STATE && summary.class_closed === true, 'summary identity or terminal state changed');
  assert.deepEqual(summary.counts, matrix.counts, 'summary counts drift');
  assert.deepEqual(summary.current_result, matrix.current_result, 'summary result drift');
  assert.deepEqual(summary.authority, matrix.authority, 'summary authority drift');

  exactKeys(classReceipt, ['schema_version','wave_id','lane_id','class_id','issue','source_pr','class_label','terminal_state','class_closed','closure_basis','counts','source_custody','unresolved_limit','authority'], 'classReceipt');
  ok(classReceipt.schema_version === 'ssc-rd03-wave03-class-receipt@1' && classReceipt.class_id === 'RD-03-C05' && classReceipt.issue === 1016 && classReceipt.source_pr === 1057, 'class receipt identity changed');
  ok(classReceipt.terminal_state === TERMINAL_STATE && classReceipt.class_closed === true && classReceipt.closure_basis.length === 7, 'class receipt terminal basis changed');
  assert.deepEqual(classReceipt.counts, matrix.counts, 'class receipt counts drift');
  ok(classReceipt.source_custody.capture_receipt_path === PATHS.capture && classReceipt.source_custody.capture_receipt_sha256 === matrix.source_product.capture_receipt_sha256, 'class receipt capture custody changed');
  ok(classReceipt.source_custody.fixed_route_capture.workflow_run === 30940153705 && classReceipt.source_custody.fixed_route_capture.artifact_id === 8904843651, 'class receipt capture identity changed');
  ok(classReceipt.unresolved_limit.source_restricted_fields === 28 && classReceipt.unresolved_limit.exact_source_restrictions === 12 && classReceipt.unresolved_limit.candidate_sources_admitted === 0, 'class receipt unresolved denominator changed');
  ok(classReceipt.unresolved_limit.complete_interest_payment_chronologies === 0 && classReceipt.unresolved_limit.complete_principal_repayment_chronologies === 0 && classReceipt.unresolved_limit.admitted_public_recovery_records === 0, 'unsupported lifecycle completion promoted');
  ok(classReceipt.unresolved_limit.missing_records_are_not_event_absence === true && classReceipt.unresolved_limit.outstanding_balance_is_not_default === true && classReceipt.unresolved_limit.scheduled_payment_is_not_observed_payment === true && classReceipt.unresolved_limit.automatic_additional_search_pass_authorized === false, 'class receipt inference boundary changed');
  assert.deepEqual(classReceipt.authority, matrix.authority, 'class receipt authority drift');

  exactKeys(manifest, ['schema_version','entries','entry_count','combined_sha256'], 'manifest');
  ok(manifest.schema_version === 'ssc-rd03-wave03-terminal-product-manifest@1' && manifest.entry_count === 3 && manifest.entries.length === 3, 'manifest denominator changed');
  ok(JSON.stringify(manifest.entries.map((entry) => entry.path)) === JSON.stringify(['terminal-field-matrix.json','summary.json','class-receipt.json']), 'manifest entry order changed');
  for (const entry of manifest.entries) {
    exactKeys(entry, ['path','bytes','sha256'], `manifest.${entry.path}`);
    ok(Number.isInteger(entry.bytes) && entry.bytes > 100, `manifest ${entry.path} bytes malformed`);
    ok(shaPattern.test(entry.sha256), `manifest ${entry.path} digest malformed`);
  }
  ok(shaPattern.test(manifest.combined_sha256), 'manifest combined digest malformed');

  exactKeys(closure, ['schema_version','wave_issue','child_issue','source_pr','lane_id','class_id','exact_label','terminal_state','class_closed','product','source_custody','authority','residual_atlas_effect_if_promoted_after_rd01_wave03_closure'], 'closure');
  ok(closure.schema_version === 'ssc-residual-denominator-wave03-class-closure-reference@1' && closure.wave_issue === 1013 && closure.child_issue === 1016 && closure.source_pr === 1057, 'closure issue custody changed');
  ok(closure.lane_id === 'RD-03' && closure.class_id === 'RD-03-C05' && closure.terminal_state === TERMINAL_STATE && closure.class_closed === true, 'closure identity or terminal state changed');
  ok(closure.product.root === 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery' && closure.product.manifest_path === PATHS.manifest && closure.product.manifest_combined_sha256 === manifest.combined_sha256 && closure.product.class_receipt_path === PATHS.classReceipt, 'closure product custody changed');
  ok(closure.source_custody.capture_receipt_path === PATHS.capture && closure.source_custody.capture_receipt_sha256 === matrix.source_product.capture_receipt_sha256, 'closure capture custody changed');
  validateAuthority(closure.authority, 'closure.authority');
  const atlas = closure.residual_atlas_effect_if_promoted_after_rd01_wave03_closure;
  ok(atlas.canonical_classes === 42 && atlas.open_before === 35 && atlas.closed_before === 7 && atlas.open_after === 34 && atlas.closed_after === 8 && atlas.wave03_selected_attempts_terminal_after_promotion === 2 && atlas.wave_complete === false, 'closure atlas arithmetic changed');

  exactKeys(schema, ['$schema','$id','title','type','additionalProperties','required','properties'], 'schema');
  ok(schema.$schema === 'https://json-schema.org/draft/2020-12/schema' && schema.additionalProperties === false, 'schema root opened');
  ok(schema.properties.schema_version.const === 'ssc-rd03-wave03-lifecycle-recovery-terminal-matrix@1' && schema.properties.class_id.const === 'RD-03-C05' && schema.properties.issue.const === 1016, 'schema identity changed');
  ok(schema.properties.status.const === 'five_instrument_fifty_five_cell_matrix_terminal_bounded_source_restricted', 'schema status changed');
  ok(JSON.stringify(schema.properties.required_fields.const) === JSON.stringify(REQUIRED_FIELDS), 'schema field denominator changed');
  ok(schema.properties.instruments.minItems === 5 && schema.properties.instruments.maxItems === 5, 'schema instrument denominator changed');
  ok(schema.properties.counts.properties.required_fields.const === 55 && schema.properties.counts.properties.terminal_fields.const === 55 && schema.properties.counts.properties.observed_fields.const === 23 && schema.properties.counts.properties.conditional_term_only_fields.const === 4 && schema.properties.counts.properties.source_restricted_fields.const === 28, 'schema terminal counts changed');
  for (const fieldId of REQUIRED_FIELDS) {
    const cell = schema.properties.instruments.items.properties.fields.properties[fieldId];
    ok(cell.additionalProperties === false && cell.properties.fixed_protocol_complete.const === true && cell.properties.terminal_for_class_closure.const === true, `schema ${fieldId} terminal contract changed`);
  }

  const expected = buildExpectedBundle();
  assert.deepEqual(bundle, expected, 'terminal bundle differs from the deterministic frozen product');
  return bundle;
}

function validateManifestBytes(root, bundle) {
  const entries = [
    ['terminal-field-matrix.json', PATHS.matrix],
    ['summary.json', PATHS.summary],
    ['class-receipt.json', PATHS.classReceipt]
  ].map(([entryPath, rel]) => {
    const bytes = fs.readFileSync(path.join(root, rel));
    return { path: entryPath, bytes: bytes.length, sha256: sha256(bytes) };
  });
  assert.deepEqual(entries, bundle.manifest.entries, 'manifest file bytes or hashes changed');
  const combined = sha256(Buffer.from(entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}\n`).join('')));
  ok(combined === bundle.manifest.combined_sha256, 'manifest combined digest changed');
  const captureBytes = fs.readFileSync(path.join(root, PATHS.capture));
  ok(sha256(captureBytes) === bundle.matrix.source_product.capture_receipt_sha256, 'capture receipt file digest changed');
  ok(sha256(captureBytes) === bundle.classReceipt.source_custody.capture_receipt_sha256, 'class receipt capture digest changed');
  const protocolBytes = fs.readFileSync(path.join(root, PATHS.protocol));
  ok(protocolBytes.length === bundle.capture.fixed_protocol.bytes && sha256(protocolBytes) === bundle.capture.fixed_protocol.sha256, 'fixed protocol file custody changed');
}

function validateRepositoryBindings(root) {
  const constitution = read(root, 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json');
  ok(constitution.wave_id === 'SSC-RD-W03' && constitution.issue === 1013, 'Wave-03 constitution identity changed');
  const lane = constitution.lane_attempts.find((row) => row.class_id === 'RD-03-C05');
  ok(lane?.exact_label === 'commitment, closing, draw, disbursement, amendment, waiver, default, cure, repayment, and recovery chronology' && lane?.initial_unit_count === 5, 'constitutional RD-03 class changed');
  ok(constitution.parent_custody.closed_residual_classes === 6 && constitution.parent_custody.open_residual_classes === 36, 'Wave-03 launch parent changed');

  const wave02 = read(root, 'data/research/status-sovereignty-residual-denominator-wave-02-current.json');
  ok(wave02.counts.closed_residual_classes === 6 && wave02.counts.open_residual_classes === 36 && wave02.current_result.all_six_selected_classes_closed === true, 'Wave-02 cumulative parent changed');
  const rd01Closure = read(root, 'data/project/ssc-residual-wave03/closures/RD-01-C06.json');
  ok(rd01Closure.class_id === 'RD-01-C06' && rd01Closure.class_closed === true, 'RD-01 Wave-03 closure changed');
  ok(rd01Closure.residual_atlas_effect_if_promoted_after_wave02_six_closures.closed_after === 7 && rd01Closure.residual_atlas_effect_if_promoted_after_wave02_six_closures.open_after === 35, 'RD-01 Wave-03 atlas custody changed');

  const seed = read(root, 'data/project/ssc-residual-wave03/seeds/RD-03-C05.json');
  ok(seed.class_id === 'RD-03-C05' && seed.child_issue === 1016 && seed.denominator_contract.unit_count === 5 && seed.class_closed === false, 'RD-03 seed denominator changed');
  ok(seed.denominator_contract.executed_at_parent_cutoff === 1 && seed.denominator_contract.conditional_pre_close_at_parent_cutoff === 4, 'RD-03 seed state split changed');
  const contract = read(root, PATHS.contract);
  ok(contract.class_id === 'RD-03-C05' && contract.expansion_contract.unit_count === 5 && contract.expansion_contract.required_fields_per_unit === 11 && contract.expansion_contract.required_cells === 55, 'RD-03 field-matrix contract changed');
  ok(contract.current_counts.materialized_cells === 0 && contract.current_counts.terminal_cells === 0 && contract.current_counts.class_closed === false, 'intake contract silently preclosed');
  ok(JSON.stringify(contract.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'intake required fields changed');
  const protocol = read(root, PATHS.protocol);
  ok(protocol.class_id === 'RD-03-C05' && protocol.routes.length === 43 && protocol.counts.fixed_routes === 43 && protocol.counts.exact_predeclared_routes === 18 && protocol.counts.candidate_census_routes === 25, 'fixed protocol denominator changed');
  ok(JSON.stringify(protocol.routes.map((route) => route.route_id)) === JSON.stringify(EXPECTED_ROUTE_IDS), 'fixed protocol route order changed');
  unique(protocol.routes.map((route) => route.request_url), 'fixed protocol request URL');
  ok(protocol.routes.every((route) => route.automatic_result_followups === 0 && route.maximum_attempts === 1), 'fixed protocol recursion or attempt count changed');

  const parent = read(root, PATHS.parent);
  ok(parent.instruments.length === 5 && JSON.stringify(parent.instruments.map((row) => row.instrument_id)) === JSON.stringify(INSTRUMENT_IDS), 'parent five-instrument denominator changed');
  ok(parent.instruments.filter((row) => row.executed_loan && row.cash_proceeds_received).length === 1, 'parent executed-and-disbursed count changed');
  ok(parent.instruments.filter((row) => row.conditional_commitment && !row.financial_close && !row.cash_proceeds_received).length === 4, 'parent conditional pre-close count changed');
  const parentTerms = read(root, PATHS.parentTerms);
  ok(parentTerms.class_id === 'RD-03-C04' && parentTerms.instruments.length === 5 && parentTerms.counts.terminal_fields === 70, 'parent negotiated-term matrix changed');
  const parentReceipt = read(root, PATHS.parentReceipt);
  ok(parentReceipt.class_id === 'RD-03-C04' && parentReceipt.class_closed === true && parentReceipt.terminal_state === 'bounded_source_unavailable', 'parent negotiated-term receipt changed');
}

export function validateRd03Wave03(root = ROOT) {
  const bundle = loadCommittedBundle(root);
  validateBundleShape(bundle);
  validateManifestBytes(root, bundle);
  validateRepositoryBindings(root);
  console.log(`validate-status-sovereignty-rd-wave03-rd03-lifecycle-recovery: 5 instruments, 55 / 55 terminal, 23 observed, 4 conditional-term-only, 28 source-restricted, class ${TERMINAL_STATE}`);
  return bundle;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    validateRd03Wave03(ROOT);
  } catch (error) {
    console.error(`validate-status-sovereignty-rd-wave03-rd03-lifecycle-recovery: ${error.message}`);
    process.exit(1);
  }
}
