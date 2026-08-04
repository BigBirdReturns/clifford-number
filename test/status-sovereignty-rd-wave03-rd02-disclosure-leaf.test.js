#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  BASE,
  RECEIPT_PATH,
  ADJUDICATION_PATH,
  PROTOCOL_PATH,
  SCHEMA_PATH,
  validateBundle
} from '../tools/validate-status-sovereignty-rd-wave03-rd02-disclosure-leaf.mjs';

const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
const base = {
  receipt: read(RECEIPT_PATH),
  adjudication: read(ADJUDICATION_PATH),
  protocol: read(PROTOCOL_PATH),
  schema: read(SCHEMA_PATH)
};
const clone = () => structuredClone(base);
const mutations = [
  (x) => { x.schema.$id = 'https://example.com/wrong.json'; },
  (x) => { x.schema.additionalProperties = true; },
  (x) => { x.schema.properties.schema_version.const = 'wrong'; },
  (x) => { x.schema.properties.denominator.properties.captured_candidate_urls.const = 456; },
  (x) => { x.schema.properties.denominator.properties.fixed_leaf_pdf_routes.const = 3; },
  (x) => { x.schema.properties.selected_records.maxItems = 3; },

  (x) => { x.receipt.artifact_id += 1; },
  (x) => { x.receipt.artifact_zip_bytes -= 1; },
  (x) => { x.receipt.artifact_zip_sha256 = '0'.repeat(64); },
  (x) => { x.receipt.artifact_manifest.entries = 42; },
  (x) => { x.receipt.artifact_manifest.combined_sha256 = '1'.repeat(64); },
  (x) => { x.receipt.bound_file_sha256['same-host-link-candidates.json'] = '2'.repeat(64); },
  (x) => { x.receipt.counts.fixed_routes = 4; },
  (x) => { x.receipt.counts.route_attempts = 4; },
  (x) => { x.receipt.counts.route_state_counts.http_success_html_parsed = 3; },
  (x) => { x.receipt.counts.same_host_link_candidates = 456; },
  (x) => { x.receipt.counts.admitted_sources = 1; },
  (x) => { x.receipt.route_outcomes.pop(); },
  (x) => { x.receipt.route_outcomes[0].route_id = 'wrong'; },
  (x) => { x.receipt.route_outcomes[0].requested_url = 'https://example.com/'; },
  (x) => { x.receipt.route_outcomes[0].body_sha256 = '3'.repeat(64); },
  (x) => { x.receipt.route_outcomes[0].http_status = 404; },
  (x) => { x.receipt.route_outcomes[0].admitted_source = true; },
  (x) => { x.receipt.route_outcomes[0].lifecycle_event_observed = true; },
  (x) => { x.receipt.route_outcomes[0].result_spawned_requests = 1; },
  (x) => { x.receipt.annual_report_inspection.body_sha256 = '4'.repeat(64); },
  (x) => { x.receipt.annual_report_inspection.pdf_pages = 45; },
  (x) => { x.receipt.annual_report_inspection.embedded_text_characters = 1; },
  (x) => { x.receipt.annual_report_inspection.exact_term_occurrences['SBIC'] = 1; },
  (x) => { delete x.receipt.annual_report_inspection.exact_term_occurrences['AM Forward']; },
  (x) => { x.receipt.annual_report_inspection.terminal_disposition = 'admitted'; },
  (x) => { x.receipt.annual_report_inspection.admitted_source = true; },
  (x) => { x.receipt.current_result.candidate_urls_terminal = 456; },
  (x) => { x.receipt.current_result.fixed_leaf_pdf_routes = 3; },
  (x) => { x.receipt.current_result.field_matrix_terminal = true; },
  (x) => { x.receipt.current_result.class_state = 'closed'; },
  (x) => { x.receipt.current_result.class_closed = true; },
  (x) => { x.receipt.unapproved = true; },

  (x) => { x.adjudication.source_custody.artifact_zip_sha256 = '5'.repeat(64); },
  (x) => { x.adjudication.source_custody.captured_candidate_file_sha256 = '6'.repeat(64); },
  (x) => { x.adjudication.frozen_unit.unit_ordinal = 14; },
  (x) => { x.adjudication.frozen_unit.legal_vehicle = 'Stifel'; },
  (x) => { x.adjudication.denominator.captured_candidate_urls = 456; },
  (x) => { x.adjudication.denominator.terminally_adjudicated_urls = 456; },
  (x) => { x.adjudication.denominator.fixed_leaf_pdf_routes = 3; },
  (x) => { x.adjudication.denominator.terminal_without_request_urls = 454; },
  (x) => { x.adjudication.denominator.silent_urls = 1; },
  (x) => { x.adjudication.selection_law.direct_lexical_signal_required = false; },
  (x) => { x.adjudication.selection_law.unselected_urls_may_not_be_requested_in_this_lane = false; },
  (x) => { x.adjudication.selection_law.terminal_without_request_is_content_absence = true; },
  (x) => { x.adjudication.selected_records.pop(); },
  (x) => { x.adjudication.selected_records[0].candidate_ordinal = 275; },
  (x) => { x.adjudication.selected_records[0].url = 'https://example.com/'; },
  (x) => { x.adjudication.selected_records[0].candidate_id = '7'.repeat(64); },
  (x) => { x.adjudication.selected_records[0].source_route_id = 'RD02-W03-SH004'; },
  (x) => { x.adjudication.selected_records[0].followup_eligible = false; },
  (x) => { x.adjudication.selected_records[0].admitted_source = true; },
  (x) => { x.adjudication.selected_records[0].lifecycle_event_observed = true; },
  (x) => { x.adjudication.selected_records[0].result_spawned_requests = 1; },
  (x) => { x.adjudication.terminal_without_request.candidate_urls = 454; },
  (x) => { x.adjudication.terminal_without_request.content_inspected = true; },
  (x) => { x.adjudication.terminal_without_request.content_absence_finding = true; },
  (x) => { x.adjudication.terminal_without_request.underlying_record_absence_finding = true; },
  (x) => { x.adjudication.terminal_without_request.authorized_for_automatic_followup = true; },
  (x) => { x.adjudication.annual_report_disposition.pdf_pages = 45; },
  (x) => { x.adjudication.annual_report_disposition.exact_frozen_vehicle_or_sbic_terms_recovered = 1; },
  (x) => { x.adjudication.current_result.captured_candidate_adjudication_complete = false; },
  (x) => { x.adjudication.current_result.followup_protocol_frozen = false; },
  (x) => { x.adjudication.current_result.class_closed = true; },
  (x) => { x.adjudication.unapproved = true; },

  (x) => { x.protocol.source_custody.artifact_zip_sha256 = '8'.repeat(64); },
  (x) => { x.protocol.denominator.captured_candidates = 456; },
  (x) => { x.protocol.denominator.terminal_without_request = 454; },
  (x) => { x.protocol.denominator.fixed_followup_routes = 3; },
  (x) => { x.protocol.denominator.route_ledger_bytes += 1; },
  (x) => { x.protocol.denominator.route_ledger_sha256 = '9'.repeat(64); },
  (x) => { x.protocol.routes.pop(); },
  (x) => { x.protocol.routes[0].route_id = 'wrong'; },
  (x) => { x.protocol.routes[0].candidate_ordinal = 275; },
  (x) => { x.protocol.routes[0].candidate_id = 'a'.repeat(64); },
  (x) => { x.protocol.routes[0].requested_url = 'https://example.com/'; },
  (x) => { x.protocol.routes[0].route_type = 'manager_lineage_pdf_get'; },
  (x) => { x.protocol.routes[0].source_route_id = 'RD02-W03-SH001'; },
  (x) => { x.protocol.routes[0].unit_ordinal = 1; },
  (x) => { x.protocol.routes[0].maximum_attempts = 2; },
  (x) => { x.protocol.routes[0].maximum_response_body_bytes = 1; },
  (x) => { x.protocol.routes[0].candidate_is_admitted_source = true; },
  (x) => { x.protocol.routes[0].automatic_observation_admission = true; },
  (x) => { x.protocol.routes[0].result_spawned_requests = 1; },
  (x) => { x.protocol.routes[0].expected_observation_scope = []; },
  (x) => { x.protocol.routes[0].forbidden_promotions = []; },
  (x) => { x.protocol.execution_contract.routes_frozen_before_requests = false; },
  (x) => { x.protocol.execution_contract.maximum_attempts_per_route = 2; },
  (x) => { x.protocol.execution_contract.maximum_parallel_workers = 3; },
  (x) => { x.protocol.execution_contract.pdf_magic_required_for_success = false; },
  (x) => { x.protocol.execution_contract.pdf_text_extraction_in_capture = true; },
  (x) => { x.protocol.execution_contract.result_spawned_requests = 1; },
  (x) => { x.protocol.execution_contract.candidate_admission_without_separate_adjudication = true; },
  (x) => { x.protocol.execution_contract.automatic_observation_admission = true; },
  (x) => { x.protocol.execution_contract.automatic_field_closure = true; },
  (x) => { x.protocol.execution_contract.automatic_class_closure = true; },
  (x) => { x.protocol.current_counts.route_attempts = 1; },
  (x) => { x.protocol.current_counts.class_closed = true; },
  (x) => { x.protocol.authority_boundaries.outside_human_dependency = true; },
  (x) => { x.protocol.authority_boundaries.external_contacts = 1; },
  (x) => { x.protocol.authority_boundaries.capital_conversion_finding = true; },
  (x) => { x.protocol.authority_boundaries.graph_effect = 'created'; },
  (x) => { x.protocol.unapproved = true; }
];

let refused = 0;
for (const mutate of mutations) {
  const specimen = clone();
  mutate(specimen);
  try {
    validateBundle(specimen);
  } catch {
    refused += 1;
  }
}
if (refused !== mutations.length) {
  throw new Error(`adversarial refusals ${refused}/${mutations.length}`);
}
validateBundle(base);
console.log(`RD-02 disclosure-leaf adversarial suite: ${refused} PASS`);
