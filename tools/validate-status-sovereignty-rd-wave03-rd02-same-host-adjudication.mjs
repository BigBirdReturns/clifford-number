#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle';
const RECEIPT_PATH = `${BASE}/candidate-followup-execution-receipt.json`;
const ADJUDICATION_PATH = `${BASE}/same-host-link-adjudication.json`;
const PROTOCOL_PATH = `${BASE}/same-host-followup-protocol.json`;

const EXPECTED_URLS = [
  'https://stifelinstitutional.com/capabilities/investment-banking/',
  'https://stifelinstitutional.com/capabilities/investment-banking/product-coverage/fund-placement/',
  'https://stifelinstitutional.com/capabilities/serving-business-leaders/',
  'https://stifelinstitutional.com/wp-content/uploads/2026/07/Stifel_Aerospace-and-Defense_Jon-Siegmann.pdf',
  'https://www.stifel.com/docs/pdf/investorrelations/annualreports/annual2025.pdf',
  'https://www.stifel.com/individual/investment-advisory-services',
  'https://www.stifel.com/institutional/investment-banking/careers/campus-recruiting',
  'https://www.stifel.com/investor-relations',
  'https://www.stifel.com/investor-relations/annual-reports',
  'https://www.stifel.com/investor-relations/earnings-releases#collapse1',
  'https://www.stifel.com/investor-relations/press-releases',
];
const FOLLOWUP_ORDINALS = [5, 8, 9, 10, 11];
const FOLLOWUP_URLS = FOLLOWUP_ORDINALS.map((ordinal) => EXPECTED_URLS[ordinal - 1]);
const ARTIFACT_SHA = '4a4a3317c032fca5db026614a7304d6f9d79c0dff30bb1d9e46876fa05149e9f';
const CANDIDATE_FILE_SHA = '3203dbafdf0d84311794e66ad51aeb8eea3b2f25bf5c7aacda46a3ac04a0d69d';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
function exactKeys(object, keys, label) {
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: exact keys mismatch`);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

export function validateBundle(bundle = {}) {
  const receipt = bundle.receipt ?? readJson(RECEIPT_PATH);
  const adjudication = bundle.adjudication ?? readJson(ADJUDICATION_PATH);
  const protocol = bundle.protocol ?? readJson(PROTOCOL_PATH);

  exactKeys(receipt, ['schema_version','wave_id','lane_id','class_id','issue','as_of','authority','canonical_protocol_merge','canonical_runner_repair_merge','workflow_run','workflow_attempt','trigger_head','synthetic_merge_head','artifact_id','artifact_zip_bytes','artifact_zip_sha256','artifact_manifest','bound_file_sha256','counts','route_outcomes','current_result','authority_boundaries'], 'receipt');
  assert(receipt.schema_version === 'ssc-rd02-wave03-candidate-followup-execution-receipt@1', 'receipt schema');
  assert(receipt.workflow_run === 30945963570 && receipt.artifact_id === 8907118043, 'receipt workflow custody');
  assert(receipt.artifact_zip_sha256 === ARTIFACT_SHA, 'receipt artifact hash');
  assert(receipt.artifact_manifest.entries === 86 && receipt.artifact_manifest.combined_sha256 === '7e8e0031354c8d79a5e8b701ef77c397dca5ccf621b5acf873b02a7205d86b70', 'receipt manifest custody');
  assert(receipt.route_outcomes.length === 10, 'ten route outcomes');
  assert(receipt.route_outcomes.every((row, index) => row.route_id === `RD02-W03-CF${String(index + 1).padStart(3, '0')}`), 'route identity/order');
  assert(receipt.route_outcomes.every((row) => row.admitted_source === false && row.lifecycle_event_observed === false && row.result_spawned_requests === 0), 'route authority');
  assert(receipt.counts.route_attempts === 10 && receipt.counts.terminal_routes === 10 && receipt.counts.same_host_link_candidates === 11, 'receipt counts');

  exactKeys(adjudication, ['schema_version','wave_id','lane_id','class_id','issue','as_of','authority','source_custody','frozen_unit','denominator','records','current_result','refused_inferences','authority_boundaries'], 'adjudication');
  assert(adjudication.schema_version === 'ssc-rd02-wave03-same-host-link-adjudication@1', 'adjudication schema');
  assert(adjudication.source_custody.artifact_zip_sha256 === ARTIFACT_SHA && adjudication.source_custody.same_host_candidate_file_sha256 === CANDIDATE_FILE_SHA, 'adjudication source custody');
  assert(adjudication.frozen_unit.legal_vehicle === 'Stifel North Atlantic AM-Forward, LP', 'frozen legal vehicle');
  assert(adjudication.denominator.same_host_candidate_urls === 11 && adjudication.denominator.terminally_adjudicated_urls === 11 && adjudication.denominator.followup_eligible_urls === 5 && adjudication.denominator.terminal_without_request_urls === 6 && adjudication.denominator.silent_urls === 0, 'adjudication denominator');
  assert(adjudication.records.length === 11, 'eleven adjudication records');
  assert(adjudication.records.every((row, index) => row.candidate_ordinal === index + 1 && row.url === EXPECTED_URLS[index] && row.candidate_id === sha256(row.url)), 'candidate identity/order');
  assert(adjudication.records.filter((row) => row.followup_eligible).map((row) => row.candidate_ordinal).join(',') === FOLLOWUP_ORDINALS.join(','), 'followup selection');
  assert(adjudication.records.every((row) => row.admitted_source === false && row.lifecycle_event_observed === false && row.result_spawned_requests === 0), 'candidate authority');
  assert(adjudication.current_result.class_state === 'still_open' && adjudication.current_result.class_closed === false && adjudication.current_result.admitted_sources === 0 && adjudication.current_result.lifecycle_events_observed === 0, 'adjudication class boundary');

  exactKeys(protocol, ['schema_version','wave_id','lane_id','class_id','issue','as_of','authority','source_custody','denominator','routes','execution_contract','current_counts','authority_boundaries'], 'protocol');
  assert(protocol.schema_version === 'ssc-rd02-wave03-same-host-followup-protocol@1', 'protocol schema');
  assert(protocol.source_custody.artifact_zip_sha256 === ARTIFACT_SHA && protocol.source_custody.same_host_candidate_file_sha256 === CANDIDATE_FILE_SHA, 'protocol source custody');
  assert(protocol.denominator.same_host_candidates === 11 && protocol.denominator.terminal_without_request === 6 && protocol.denominator.fixed_followup_routes === 5 && protocol.denominator.unit_15_routes === 5 && protocol.denominator.other_unit_routes === 0, 'protocol denominator');
  assert(protocol.routes.length === 5, 'five exact routes');
  assert(protocol.routes.every((row, index) => row.route_id === `RD02-W03-SH${String(index + 1).padStart(3, '0')}` && row.link_candidate_ordinal === FOLLOWUP_ORDINALS[index] && row.requested_url === FOLLOWUP_URLS[index]), 'protocol route identity/order');
  assert(protocol.routes.every((row) => row.unit_ordinal === 15 && row.maximum_attempts === 1 && row.candidate_is_admitted_source === false && row.result_spawned_requests === 0), 'protocol route authority');
  assert(protocol.routes[0].route_type === 'pdf_disclosure_get' && protocol.routes[0].maximum_response_body_bytes === 52428800, 'PDF route contract');
  assert(protocol.routes.slice(1).every((row) => row.route_type === 'html_disclosure_index_get' && row.maximum_response_body_bytes === 10485760), 'HTML route contract');
  const ledger = protocol.routes.map((row) => `${row.route_id}\t${row.unit_ordinal}\t${row.requested_url}\t${row.route_type}\n`).join('');
  assert(Buffer.byteLength(ledger) === protocol.denominator.route_ledger_bytes && sha256(ledger) === protocol.denominator.route_ledger_sha256, 'route ledger custody');
  assert(protocol.execution_contract.routes_frozen_before_requests === true && protocol.execution_contract.maximum_attempts_per_route === 1 && protocol.execution_contract.result_spawned_requests === 0 && protocol.execution_contract.candidate_admission_without_separate_adjudication === false && protocol.execution_contract.automatic_field_closure === false && protocol.execution_contract.automatic_class_closure === false, 'execution contract');
  assert(protocol.current_counts.route_attempts === 0 && protocol.current_counts.terminal_routes === 0 && protocol.current_counts.admitted_sources === 0 && protocol.current_counts.lifecycle_events_observed === 0 && protocol.current_counts.class_closed === false, 'pre-execution zero state');

  for (const boundary of [receipt.authority_boundaries, adjudication.authority_boundaries, protocol.authority_boundaries]) {
    assert(boundary.outside_human_dependency === false && boundary.external_contacts === 0 && boundary.external_reviews === 0 && boundary.publication_effect === 'none' && boundary.adoption_effect === 'none' && boundary.graph_effect === 'none', 'authority ceiling');
  }
  return {candidateUrls: 11, terminalCandidates: 11, followupRoutes: 5, admittedSources: 0, lifecycleEvents: 0, classClosed: false};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateBundle();
  console.log(`RD-02 same-host adjudication validation: PASS (${result.terminalCandidates}/11 terminal; ${result.followupRoutes} fixed routes; class open)`);
}
