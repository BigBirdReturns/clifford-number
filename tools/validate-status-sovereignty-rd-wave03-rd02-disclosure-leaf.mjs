#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle';
export const RECEIPT_PATH = `${BASE}/same-host-followup-execution-receipt.json`;
export const ADJUDICATION_PATH = `${BASE}/disclosure-leaf-adjudication.json`;
export const PROTOCOL_PATH = `${BASE}/disclosure-leaf-followup-protocol.json`;
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-disclosure-leaf.schema.json';

export const ARTIFACT_SHA = '5d4924bf616cf65f93430a570580e5144359bcc6acb0c55b33161d2563e58364';
export const MANIFEST_SHA = '2ffcd2bb46e067e1842d6277a7e0c7b43dabda707ce57d6905287262ac499bbf';
export const CANDIDATE_FILE_SHA = '26dcf0c76250051192626477e4949e6a49b4934587c0d8665110e4bb02209352';
export const ANNUAL_REPORT_SHA = '5ebcb106dc62b4d20884d87c0c5f962a2972cd45e7bc83c9b2ef81fe7ead296c';
export const LEAF_URLS = Object.freeze([
  'https://www.stifel.com/docs/pdf/pressreleases/2024/Stifel-SBA-Approval-for-10.22.24.pdf',
  'https://www.stifel.com/docs/pdf/pressreleases/2021/Stifel North Atlantic NEW FINAL for 02.19.21-1.pdf'
]);
export const LEAF_ORDINALS = Object.freeze([276, 405]);
export const LEAF_TYPES = Object.freeze(['exact_vehicle_approval_pdf_get', 'manager_lineage_pdf_get']);
const ORIGINAL_ROUTE_URLS = Object.freeze([
  'https://www.stifel.com/docs/pdf/investorrelations/annualreports/annual2025.pdf',
  'https://www.stifel.com/investor-relations',
  'https://www.stifel.com/investor-relations/annual-reports',
  'https://www.stifel.com/investor-relations/earnings-releases#collapse1',
  'https://www.stifel.com/investor-relations/press-releases'
]);
const ORIGINAL_BODY_SHAS = Object.freeze([
  ANNUAL_REPORT_SHA,
  'f93ea60cf8517dfc92faee06d5de1070535b038b0cb1fb449acbf471d3af73b3',
  '5f51c02258658da5e6c73fd3b68980c01b9deae31038d096366862af9eb10938',
  'f4f8182fbb4c733031402e3a695bb662ba088e22cd169fe9d588cd21d0c43381',
  'ef5f36036fcaf8d5f0591a46efaefc13a633bfcd24b092a57543b9d47ee1d69e'
]);
const ANNUAL_TERMS = Object.freeze([
  'Stifel North Atlantic AM-Forward, LP',
  'Stifel North Atlantic AM-Forward',
  'AM-Forward',
  'AM Forward',
  'North Atlantic',
  'SBIC',
  'Small Business Investment Company',
  'Small Business Investment'
]);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
function ok(condition, message) {
  if (!condition) throw new Error(message);
}
function same(actual, expected, message) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), message);
}
function exactKeys(object, keys, label) {
  same(Object.keys(object).sort(), [...keys].sort(), `${label}: exact keys mismatch`);
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd02-disclosure-leaf.schema.json', 'schema ID');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema top-level closure');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd02-wave03-disclosure-leaf-adjudication@1', 'schema version');
  ok(schema?.properties?.denominator?.properties?.captured_candidate_urls?.const === 457, 'schema candidate denominator');
  ok(schema?.properties?.denominator?.properties?.fixed_leaf_pdf_routes?.const === 2, 'schema leaf route denominator');
  ok(schema?.properties?.denominator?.properties?.terminal_without_request_urls?.const === 455, 'schema terminal-without-request denominator');
  ok(schema?.properties?.selected_records?.minItems === 2 && schema?.properties?.selected_records?.maxItems === 2, 'schema selected record denominator');
  return true;
}

export function validateBundle(bundle = {}) {
  const receipt = bundle.receipt ?? readJson(RECEIPT_PATH);
  const adjudication = bundle.adjudication ?? readJson(ADJUDICATION_PATH);
  const protocol = bundle.protocol ?? readJson(PROTOCOL_PATH);
  const schema = bundle.schema ?? readJson(SCHEMA_PATH);
  validateSchemaContract(schema);

  exactKeys(receipt, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','authority',
    'canonical_same_host_adjudication_merge','workflow_run','workflow_attempt',
    'synthetic_merge_head','artifact_id','artifact_zip_bytes','artifact_zip_sha256',
    'artifact_manifest','bound_file_sha256','counts','route_outcomes',
    'annual_report_inspection','current_result','authority_boundaries'
  ], 'receipt');
  ok(receipt.schema_version === 'ssc-rd02-wave03-same-host-followup-execution-receipt@1', 'receipt schema');
  ok(receipt.wave_id === 'SSC-RD-W03' && receipt.lane_id === 'RD-02' && receipt.class_id === 'RD-02-C05' && receipt.issue === 1015, 'receipt identity');
  ok(receipt.canonical_same_host_adjudication_merge === 'feccd61f8ef6b47c337fb0e53f0066ed9d0d94ad', 'receipt canonical merge');
  ok(receipt.workflow_run === 30949324081 && receipt.workflow_attempt === 1 && receipt.artifact_id === 8908442108, 'receipt workflow custody');
  ok(receipt.artifact_zip_bytes === 9598784 && receipt.artifact_zip_sha256 === ARTIFACT_SHA, 'receipt artifact custody');
  ok(receipt.artifact_manifest.entries === 43 && receipt.artifact_manifest.combined_sha256 === MANIFEST_SHA, 'receipt manifest custody');
  ok(receipt.bound_file_sha256['same-host-link-candidates.json'] === CANDIDATE_FILE_SHA, 'receipt candidate hash');
  ok(receipt.counts.fixed_routes === 5 && receipt.counts.route_attempts === 5 && receipt.counts.terminal_routes === 5, 'receipt route count');
  same(receipt.counts.route_state_counts, {
    http_success_pdf_captured_text_inspection_pending: 1,
    http_success_html_parsed: 4
  }, 'receipt route states');
  ok(receipt.counts.same_host_link_candidates === 457 && receipt.counts.admitted_sources === 0 && receipt.counts.lifecycle_events_observed === 0 && receipt.counts.result_spawned_requests === 0, 'receipt capture counts');
  ok(receipt.route_outcomes.length === 5, 'receipt five route outcomes');
  for (const [index, row] of receipt.route_outcomes.entries()) {
    ok(row.route_id === `RD02-W03-SH${String(index + 1).padStart(3, '0')}`, `receipt route ${index + 1} ID`);
    ok(row.requested_url === ORIGINAL_ROUTE_URLS[index], `receipt route ${index + 1} URL`);
    ok(row.body_sha256 === ORIGINAL_BODY_SHAS[index], `receipt route ${index + 1} body hash`);
    ok(row.http_status === 200 && row.admitted_source === false && row.lifecycle_event_observed === false && row.result_spawned_requests === 0, `receipt route ${index + 1} authority`);
  }
  ok(receipt.annual_report_inspection.body_sha256 === ANNUAL_REPORT_SHA, 'annual report hash');
  ok(receipt.annual_report_inspection.pdf_pages === 46 && receipt.annual_report_inspection.embedded_text_characters === 37889, 'annual report inspection denominator');
  same(Object.keys(receipt.annual_report_inspection.exact_term_occurrences), [...ANNUAL_TERMS], 'annual report terms');
  ok(Object.values(receipt.annual_report_inspection.exact_term_occurrences).every((count) => count === 0), 'annual report exact term absence');
  ok(receipt.annual_report_inspection.terminal_disposition === 'parent_annual_report_no_exact_frozen_vehicle_or_sbic_identity_recovered', 'annual report disposition');
  ok(receipt.annual_report_inspection.admitted_source === false && receipt.annual_report_inspection.lifecycle_event_observed === false, 'annual report authority');
  ok(receipt.current_result.candidate_urls_terminal === 457 && receipt.current_result.fixed_leaf_pdf_routes === 2, 'receipt continuation denominator');
  ok(receipt.current_result.class_state === 'still_open' && receipt.current_result.class_closed === false && receipt.current_result.field_matrix_terminal === false, 'receipt class boundary');

  exactKeys(adjudication, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','authority',
    'source_custody','frozen_unit','denominator','selection_law','selected_records',
    'terminal_without_request','annual_report_disposition','current_result',
    'refused_inferences','authority_boundaries'
  ], 'adjudication');
  ok(adjudication.schema_version === 'ssc-rd02-wave03-disclosure-leaf-adjudication@1', 'adjudication schema');
  ok(adjudication.source_custody.artifact_zip_sha256 === ARTIFACT_SHA && adjudication.source_custody.artifact_manifest_combined_sha256 === MANIFEST_SHA && adjudication.source_custody.captured_candidate_file_sha256 === CANDIDATE_FILE_SHA, 'adjudication source custody');
  ok(adjudication.frozen_unit.unit_ordinal === 15 && adjudication.frozen_unit.unit_id === 'SBICCT-FIRST-COHORT-15' && adjudication.frozen_unit.legal_vehicle === 'Stifel North Atlantic AM-Forward, LP', 'adjudication frozen unit');
  same(adjudication.denominator, {
    captured_candidate_urls: 457,
    terminally_adjudicated_urls: 457,
    fixed_leaf_pdf_routes: 2,
    terminal_without_request_urls: 455,
    selected_source_route_candidates: 2,
    silent_urls: 0
  }, 'adjudication denominator');
  ok(adjudication.denominator.fixed_leaf_pdf_routes + adjudication.denominator.terminal_without_request_urls === adjudication.denominator.captured_candidate_urls, 'adjudication arithmetic');
  ok(adjudication.selection_law.candidate_surface === 'captured_url_and_anchor_text_only' && adjudication.selection_law.direct_lexical_signal_required === true, 'adjudication selection law');
  ok(adjudication.selection_law.unselected_urls_may_not_be_requested_in_this_lane === true && adjudication.selection_law.terminal_without_request_is_content_absence === false && adjudication.selection_law.candidate_is_admitted_source === false, 'adjudication bounded selection');
  ok(adjudication.selected_records.length === 2, 'adjudication two selected records');
  for (const [index, row] of adjudication.selected_records.entries()) {
    ok(row.candidate_ordinal === LEAF_ORDINALS[index], `selected ${index + 1} ordinal`);
    ok(row.url === LEAF_URLS[index] && row.candidate_id === sha256(row.url), `selected ${index + 1} identity`);
    ok(row.source_route_id === 'RD02-W03-SH005' && row.unit_ordinal === 15, `selected ${index + 1} source custody`);
    ok(row.followup_eligible === true && row.admitted_source === false && row.lifecycle_event_observed === false && row.result_spawned_requests === 0, `selected ${index + 1} authority`);
  }
  ok(adjudication.terminal_without_request.candidate_urls === 455 && adjudication.terminal_without_request.content_inspected === false && adjudication.terminal_without_request.content_absence_finding === false && adjudication.terminal_without_request.underlying_record_absence_finding === false && adjudication.terminal_without_request.authorized_for_automatic_followup === false, 'terminal-without-request boundary');
  ok(adjudication.annual_report_disposition.body_sha256 === ANNUAL_REPORT_SHA && adjudication.annual_report_disposition.pdf_pages === 46 && adjudication.annual_report_disposition.exact_frozen_vehicle_or_sbic_terms_recovered === 0, 'adjudication annual report custody');
  ok(adjudication.current_result.captured_candidate_adjudication_complete === true && adjudication.current_result.followup_protocol_frozen === true && adjudication.current_result.class_state === 'still_open' && adjudication.current_result.class_closed === false, 'adjudication current result');

  exactKeys(protocol, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','authority',
    'source_custody','denominator','routes','execution_contract','current_counts',
    'authority_boundaries'
  ], 'protocol');
  ok(protocol.schema_version === 'ssc-rd02-wave03-disclosure-leaf-followup-protocol@1', 'protocol schema');
  ok(protocol.source_custody.artifact_zip_sha256 === ARTIFACT_SHA && protocol.source_custody.captured_candidate_file_sha256 === CANDIDATE_FILE_SHA, 'protocol source custody');
  same(protocol.denominator, {
    captured_candidates: 457,
    terminal_without_request: 455,
    fixed_followup_routes: 2,
    unit_15_routes: 2,
    other_unit_routes: 0,
    route_ledger_bytes: 281,
    route_ledger_sha256: '946241fadba51e6da56d059ed296c37021e567f50061152d79e6d5baa2cea5e0'
  }, 'protocol denominator');
  ok(protocol.routes.length === 2, 'protocol two routes');
  for (const [index, row] of protocol.routes.entries()) {
    ok(row.route_id === `RD02-W03-DL${String(index + 1).padStart(3, '0')}`, `protocol route ${index + 1} ID`);
    ok(row.candidate_ordinal === LEAF_ORDINALS[index] && row.candidate_id === sha256(row.requested_url), `protocol route ${index + 1} candidate`);
    ok(row.requested_url === LEAF_URLS[index] && row.route_type === LEAF_TYPES[index], `protocol route ${index + 1} request`);
    ok(row.source_route_id === 'RD02-W03-SH005' && row.unit_ordinal === 15 && row.maximum_attempts === 1 && row.maximum_response_body_bytes === 10485760, `protocol route ${index + 1} limits`);
    ok(row.candidate_is_admitted_source === false && row.automatic_observation_admission === false && row.result_spawned_requests === 0, `protocol route ${index + 1} authority`);
    ok(Array.isArray(row.expected_observation_scope) && row.expected_observation_scope.length >= 3 && Array.isArray(row.forbidden_promotions) && row.forbidden_promotions.length >= 3, `protocol route ${index + 1} semantic bounds`);
  }
  const ledger = protocol.routes.map((row) => `${row.route_id}\t${row.unit_ordinal}\t${row.requested_url}\t${row.route_type}\n`).join('');
  ok(Buffer.byteLength(ledger) === protocol.denominator.route_ledger_bytes && sha256(ledger) === protocol.denominator.route_ledger_sha256, 'protocol route ledger custody');
  ok(protocol.execution_contract.routes_frozen_before_requests === true && protocol.execution_contract.maximum_attempts_per_route === 1 && protocol.execution_contract.maximum_parallel_workers === 2 && protocol.execution_contract.pdf_magic_required_for_success === true, 'protocol execution limits');
  ok(protocol.execution_contract.pdf_text_extraction_in_capture === false && protocol.execution_contract.result_spawned_requests === 0 && protocol.execution_contract.candidate_admission_without_separate_adjudication === false && protocol.execution_contract.automatic_observation_admission === false && protocol.execution_contract.automatic_field_closure === false && protocol.execution_contract.automatic_class_closure === false, 'protocol automatic promotion boundary');
  ok(protocol.current_counts.route_attempts === 0 && protocol.current_counts.terminal_routes === 0 && protocol.current_counts.captured_pdf_bodies === 0 && protocol.current_counts.admitted_sources === 0 && protocol.current_counts.lifecycle_events_observed === 0 && protocol.current_counts.class_closed === false, 'protocol pre-execution zero state');

  for (const boundary of [receipt.authority_boundaries, adjudication.authority_boundaries, protocol.authority_boundaries]) {
    ok(boundary.outside_human_dependency === false && boundary.external_contacts === 0 && boundary.external_reviews === 0, 'outside-human boundary');
    ok(boundary.capital_conversion_finding === false && boundary.favoritism_finding === false && boundary.extraction_finding === false && boundary.coordination_finding === false && boundary.common_purpose_finding === false && boundary.complete_compact_finding === false, 'finding authority boundary');
    ok(boundary.publication_effect === 'none' && boundary.adoption_effect === 'none' && boundary.graph_effect === 'none', 'effect authority boundary');
  }

  return {
    capturedCandidates: 457,
    terminalCandidates: 457,
    terminalWithoutRequest: 455,
    fixedLeafRoutes: 2,
    admittedSources: 0,
    lifecycleEvents: 0,
    classClosed: false
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateBundle();
  console.log(`RD-02 disclosure-leaf validation: PASS (${result.terminalCandidates}/457 terminal; ${result.fixedLeafRoutes} fixed PDF routes; class open)`);
}
