#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  REQUIRED_FIELDS,
  buildExpectedBundle,
  checkCommittedBundle
} from '../tools/build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery.mjs';
import {
  validateBundleShape,
  validateRd03Wave03
} from '../tools/validate-status-sovereignty-rd-wave03-rd03-lifecycle-recovery.mjs';

validateRd03Wave03();
checkCommittedBundle();
const clone = () => structuredClone(buildExpectedBundle());
const cases = [];
const add = (name, mutate) => cases.push([name, mutate]);

// Capture identity, fixed-protocol custody, execution accounting, and authority.
add('capture schema', b => { b.capture.schema_version = 'bad'; });
add('capture class', b => { b.capture.class_id = 'RD-03-C04'; });
add('capture issue', b => { b.capture.issue = 1; });
add('capture cutoff', b => { b.capture.as_of = '2026-08-03'; });
add('capture intake merge', b => { b.capture.canonical_intake_merge = '0'.repeat(40); });
add('capture target head', b => { b.capture.capture_target_head = '0'.repeat(40); });
add('protocol path', b => { b.capture.fixed_protocol.path = 'elsewhere.json'; });
add('protocol blob', b => { b.capture.fixed_protocol.git_blob_sha = '0'.repeat(40); });
add('protocol digest', b => { b.capture.fixed_protocol.sha256 = '0'.repeat(64); });
add('protocol bytes', b => { b.capture.fixed_protocol.bytes -= 1; });
add('protocol routes', b => { b.capture.fixed_protocol.fixed_routes = 42; });
add('protocol exact routes', b => { b.capture.fixed_protocol.exact_predeclared_routes = 17; });
add('protocol candidate routes', b => { b.capture.fixed_protocol.candidate_census_routes = 24; });
add('protocol attempts', b => { b.capture.fixed_protocol.maximum_attempts_per_route = 2; });
add('protocol recursion', b => { b.capture.fixed_protocol.result_spawned_requests = 1; });
add('capture run', b => { b.capture.capture.workflow_run = 1; });
add('capture artifact', b => { b.capture.capture.artifact_id = 1; });
add('capture archive', b => { b.capture.capture.artifact_zip_sha256 = '0'.repeat(64); });
add('capture manifest schema', b => { b.capture.capture.manifest_schema = 'bad'; });
add('capture manifest entries', b => { b.capture.capture.manifest_entries = 347; });
add('capture manifest combined', b => { b.capture.capture.manifest_combined_sha256 = '0'.repeat(64); });
add('capture manifest file digest', b => { b.capture.capture.manifest_file_sha256 = 'bad'; });
add('capture fixed route count', b => { b.capture.capture.fixed_routes = 42; });
add('capture attempts count', b => { b.capture.capture.route_attempts = 42; });
add('capture completions count', b => { b.capture.capture.transport_completions = 42; });
add('capture transport failure', b => { b.capture.capture.transport_failures = 1; });
add('capture HTTP successes', b => { b.capture.capture.http_successes = 30; });
add('capture HTTP restrictions', b => { b.capture.capture.bounded_http_non_successes = 11; });
add('capture HTTP codes', b => { b.capture.capture.http_response_codes['500'] = 1; });
add('capture exact successes', b => { b.capture.capture.exact_predeclared_http_successes = 5; });
add('capture exact restrictions', b => { b.capture.capture.exact_predeclared_http_restrictions = 11; });
add('capture candidate successes', b => { b.capture.capture.candidate_census_http_successes = 24; });
add('capture candidate parse failure', b => { b.capture.capture.candidate_parse_failures = 1; });
add('capture candidate rows', b => { b.capture.capture.candidate_rows = 249; });
add('capture unique candidates', b => { b.capture.capture.unique_candidate_urls = 9; });
add('capture candidate admitted', b => { b.capture.capture.admitted_candidate_sources = 1; });
add('capture follow-up', b => { b.capture.capture.result_spawned_requests = 1; });
add('capture external contact', b => { b.capture.capture.external_contacts = 1; });
add('capture external review', b => { b.capture.capture.external_reviews = 1; });
add('candidate schema', b => { b.capture.candidate_census.schema_version = 'bad'; });
add('candidate row count', b => { b.capture.candidate_census.candidate_rows = 249; });
add('candidate unique count', b => { b.capture.candidate_census.unique_candidate_urls = 9; });
add('candidate parse failure', b => { b.capture.candidate_census.candidate_parse_failures = 1; });
add('candidate admission', b => { b.capture.candidate_census.admitted_candidate_sources = 1; });
add('candidate recursion', b => { b.capture.candidate_census.result_spawned_requests = 1; });
add('candidate host census', b => { b.capture.candidate_census.candidate_host_counts['www.office.com'] = 49; });
add('candidate URL removed', b => { b.capture.candidate_census.unique_urls.pop(); });
add('candidate URL reordered', b => { b.capture.candidate_census.unique_urls.reverse(); });
add('OSC candidate invented', b => { b.capture.candidate_census.osc_lifecycle_sources_recovered = 1; });
add('candidate followed', b => { b.capture.candidate_census.candidate_results_followed = 1; });
add('route receipt removed', b => { b.capture.route_receipts.pop(); });
add('route receipt reordered', b => { b.capture.route_receipts.reverse(); });
add('inspection method', b => { b.capture.inspection.method = 'human_review'; });
add('inspection OCR', b => { b.capture.inspection.ocr_used = true; });
add('inspection external review', b => { b.capture.inspection.external_review = true; });
add('inspection success set', b => { b.capture.inspection.exact_success_endpoints.pop(); });
add('inspection restriction set', b => { b.capture.inspection.exact_restricted_endpoints.pop(); });
add('inspection new event', b => { b.capture.inspection.new_lifecycle_event_admissions = 1; });
add('capture candidate promoted', b => { b.capture.boundaries.candidate_result_is_admitted_source = true; });
add('capture restriction made absence', b => { b.capture.boundaries.http_restriction_is_event_absence = true; });
add('capture complete cohort', b => { b.capture.boundaries.five_named_instruments_are_complete_osc_cohort = true; });
add('capture class prematurely closed', b => { b.capture.authority.class_closed = true; });
add('capture outside human', b => { b.capture.authority.outside_human_dependency = true; });
add('capture public recovery', b => { b.capture.authority.public_recovery_finding = true; });
add('capture graph effect', b => { b.capture.authority.graph_effect = 'changed'; });

for (let index = 0; index < 43; index += 1) {
  const id = `R${String(index + 1).padStart(3, '0')}`;
  add(`${id} ordinal`, b => { b.capture.route_receipts[index].route_ordinal = 99; });
  add(`${id} request digest`, b => { b.capture.route_receipts[index].request_sha256 = '0'.repeat(64); });
  add(`${id} result recursion`, b => { b.capture.route_receipts[index].result_spawned_requests = 1; });
  if (index < 12) add(`${id} restricted route promoted`, b => { b.capture.route_receipts[index].admitted_as_evidence = true; });
  else if (index < 18) add(`${id} exact API demoted`, b => { b.capture.route_receipts[index].admitted_as_evidence = false; });
  else add(`${id} candidate admitted`, b => { b.capture.route_receipts[index].admitted_as_evidence = true; });
}

// Terminal matrix, row semantics, and all fifty-five field cells.
add('matrix schema', b => { b.matrix.schema_version = 'bad'; });
add('matrix label', b => { b.matrix.class_label = 'lifecycle'; });
add('matrix status', b => { b.matrix.status = 'still_open'; });
add('matrix cutoff', b => { b.matrix.as_of = '2026-08-03'; });
add('matrix intake merge', b => { b.matrix.source_product.canonical_intake_merge = '0'.repeat(40); });
add('matrix terminal base', b => { b.matrix.source_product.terminal_branch_base = '0'.repeat(40); });
add('matrix capture digest', b => { b.matrix.source_product.capture_receipt_sha256 = '0'.repeat(64); });
add('permitted state removed', b => { b.matrix.permitted_field_states.pop(); });
add('required field removed', b => { b.matrix.required_fields.pop(); });
add('instrument removed', b => { b.matrix.instruments.pop(); });
add('instrument reordered', b => { b.matrix.instruments.reverse(); });
add('instrument duplicate', b => { b.matrix.instruments[1].instrument_id = b.matrix.instruments[0].instrument_id; });
add('MP executed state erased', b => { b.matrix.instruments[0].fields.commitment_state_and_governing_date.value.commitment_state = 'conditional_pre_close_commitment'; });
add('MP principal changed', b => { b.matrix.instruments[0].fields.commitment_state_and_governing_date.value.principal_usd = 149999999; });
add('MP close erased', b => { b.matrix.instruments[0].fields.financial_close_and_executed_agreement_state_and_date.value.financial_close_observed = false; });
add('MP cash erased', b => { b.matrix.instruments[0].fields.draw_or_cash_disbursement_state_and_date.value.cash_proceeds_received = false; });
add('MP scheduled interest made payment', b => { b.matrix.instruments[0].fields.interest_payment_chronology.value.observed_interest_payment_events = []; });
add('MP rate changed', b => { b.matrix.instruments[0].fields.interest_payment_chronology.value.annual_interest_rate_percent = 5.37; });
add('MP outstanding snapshot removed', b => { b.matrix.instruments[0].fields.principal_repayment_chronology.value.outstanding_snapshots.pop(); });
add('MP outstanding made default', b => { b.matrix.instruments[0].fields.public_recovery_or_unresolved_exposure_state.value.default_inferred_from_outstanding_balance = true; });
add('MP public recovery invented', b => { b.matrix.instruments[0].fields.public_recovery_or_unresolved_exposure_state.value.public_recovery_observed = true; });
add('Vulcan close invented', b => { b.matrix.instruments[1].fields.financial_close_and_executed_agreement_state_and_date.state = 'observed'; });
add('ReElement draw invented', b => { b.matrix.instruments[2].fields.draw_or_cash_disbursement_state_and_date.state = 'observed'; });
add('Phoenix date invented', b => { b.matrix.instruments[3].fields.commitment_state_and_governing_date.value.governing_date = '2026-01-01'; });
add('Phoenix date restriction erased', b => { b.matrix.instruments[3].fields.commitment_state_and_governing_date.value.governing_date_precision = 'day'; });
add('Energy proposed tenor erased', b => { b.matrix.instruments[4].inherited_parent_state = 'conditional_pre_close'; });
add('conditional event absence', b => { b.matrix.instruments[1].fields.public_recovery_or_unresolved_exposure_state.value.event_absence_claimed = true; });
add('conditional current legal state', b => { b.matrix.instruments[2].fields.public_recovery_or_unresolved_exposure_state.value.current_legal_state_claimed = true; });
add('conditional public recovery', b => { b.matrix.instruments[4].fields.public_recovery_or_unresolved_exposure_state.value.public_recovery_observed = true; });

for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
  for (const fieldId of REQUIRED_FIELDS) {
    const prefix = `${rowIndex + 1}/${fieldId}`;
    add(`${prefix} removed`, b => { delete b.matrix.instruments[rowIndex].fields[fieldId]; });
    add(`${prefix} reopened`, b => { b.matrix.instruments[rowIndex].fields[fieldId].state = 'unclassified'; });
    add(`${prefix} protocol incomplete`, b => { b.matrix.instruments[rowIndex].fields[fieldId].fixed_protocol_complete = false; });
    add(`${prefix} not terminal`, b => { b.matrix.instruments[rowIndex].fields[fieldId].terminal_for_class_closure = false; });
    add(`${prefix} sources removed`, b => { b.matrix.instruments[rowIndex].fields[fieldId].source_ids = []; });
    add(`${prefix} route removed`, b => { b.matrix.instruments[rowIndex].fields[fieldId].capture_route_ids.pop(); });
    add(`${prefix} note erased`, b => { b.matrix.instruments[rowIndex].fields[fieldId].note = ''; });
  }
}

add('matrix required count', b => { b.matrix.counts.required_fields = 54; });
add('matrix terminal count', b => { b.matrix.counts.terminal_fields = 54; });
add('matrix observed count', b => { b.matrix.counts.observed_fields = 22; });
add('matrix conditional count', b => { b.matrix.counts.conditional_term_only_fields = 3; });
add('matrix restricted count', b => { b.matrix.counts.source_restricted_fields = 27; });
add('matrix unavailable family', b => { b.matrix.counts.source_unavailable_after_fixed_protocol_fields = 1; });
add('matrix candidate admission', b => { b.matrix.counts.admitted_candidate_sources = 1; });
add('matrix interest event invented', b => { b.matrix.counts.admitted_interest_payment_records = 1; });
add('matrix repayment event invented', b => { b.matrix.counts.admitted_principal_repayment_records = 1; });
add('matrix recovery event invented', b => { b.matrix.counts.admitted_public_recovery_records = 1; });
add('matrix reopened', b => { b.matrix.current_result.class_closed = false; });
add('matrix fixed protocol incomplete', b => { b.matrix.current_result.fixed_protocol_complete = false; });
add('matrix candidate promoted', b => { b.matrix.current_result.candidate_results_admitted = 1; });
add('matrix favoritism', b => { b.matrix.current_result.favoritism_finding = true; });
add('matrix outside human', b => { b.matrix.current_result.outside_human_dependency = true; });
add('matrix project blocking', b => { b.matrix.current_result.project_blocking = true; });
add('conditional made close', b => { b.matrix.boundaries.conditional_commitment_is_financial_close = true; });
add('schedule made payment', b => { b.matrix.boundaries.scheduled_interest_is_observed_payment = true; });
add('restriction made absence', b => { b.matrix.boundaries.http_restriction_is_event_absence = true; });
add('class made wave complete', b => { b.matrix.boundaries.class_closure_is_lane_or_wave_completion = true; });
add('matrix authority widened', b => { b.matrix.authority.denominator_widened = true; });
add('matrix authority recovery', b => { b.matrix.authority.public_recovery_finding = true; });
add('matrix authority publication', b => { b.matrix.authority.publication_effect = 'changed'; });

// Summary, receipt, manifest, closure, and closed schema.
add('summary schema', b => { b.summary.schema_version = 'bad'; });
add('summary terminal state', b => { b.summary.terminal_state = 'still_open'; });
add('summary reopened', b => { b.summary.class_closed = false; });
add('summary count drift', b => { b.summary.counts.terminal_fields = 54; });
add('summary result drift', b => { b.summary.current_result.candidate_results_admitted = 1; });
add('summary authority drift', b => { b.summary.authority.external_reviews = 1; });
add('receipt schema', b => { b.classReceipt.schema_version = 'bad'; });
add('receipt source PR', b => { b.classReceipt.source_pr = 999; });
add('receipt label', b => { b.classReceipt.class_label = 'partial lifecycle'; });
add('receipt reopened', b => { b.classReceipt.class_closed = false; });
add('receipt terminal family', b => { b.classReceipt.terminal_state = 'bounded_source_unavailable'; });
add('receipt basis removed', b => { b.classReceipt.closure_basis.pop(); });
add('receipt count drift', b => { b.classReceipt.counts.source_restricted_fields = 27; });
add('receipt capture digest', b => { b.classReceipt.source_custody.capture_receipt_sha256 = '0'.repeat(64); });
add('receipt capture run', b => { b.classReceipt.source_custody.fixed_route_capture.workflow_run = 1; });
add('receipt restriction count', b => { b.classReceipt.unresolved_limit.exact_source_restrictions = 11; });
add('receipt candidate admitted', b => { b.classReceipt.unresolved_limit.candidate_sources_admitted = 1; });
add('receipt interest complete', b => { b.classReceipt.unresolved_limit.complete_interest_payment_chronologies = 1; });
add('receipt repayment complete', b => { b.classReceipt.unresolved_limit.complete_principal_repayment_chronologies = 1; });
add('receipt recovery complete', b => { b.classReceipt.unresolved_limit.admitted_public_recovery_records = 1; });
add('receipt missing means absence', b => { b.classReceipt.unresolved_limit.missing_records_are_not_event_absence = false; });
add('receipt outstanding means default', b => { b.classReceipt.unresolved_limit.outstanding_balance_is_not_default = false; });
add('receipt schedule means payment', b => { b.classReceipt.unresolved_limit.scheduled_payment_is_not_observed_payment = false; });
add('receipt extra pass', b => { b.classReceipt.unresolved_limit.automatic_additional_search_pass_authorized = true; });
add('receipt authority', b => { b.classReceipt.authority.coordination_finding = true; });
add('manifest schema', b => { b.manifest.schema_version = 'bad'; });
add('manifest entry removed', b => { b.manifest.entries.pop(); });
add('manifest entry reordered', b => { b.manifest.entries.reverse(); });
add('manifest entry bytes', b => { b.manifest.entries[0].bytes -= 1; });
add('manifest entry digest', b => { b.manifest.entries[1].sha256 = '0'.repeat(64); });
add('manifest combined digest', b => { b.manifest.combined_sha256 = '0'.repeat(64); });
add('closure schema', b => { b.closure.schema_version = 'bad'; });
add('closure issue', b => { b.closure.child_issue = 1; });
add('closure source PR', b => { b.closure.source_pr = 999; });
add('closure class', b => { b.closure.class_id = 'RD-03-C04'; });
add('closure reopened', b => { b.closure.class_closed = false; });
add('closure terminal family', b => { b.closure.terminal_state = 'bounded_source_unavailable'; });
add('closure manifest', b => { b.closure.product.manifest_combined_sha256 = '0'.repeat(64); });
add('closure capture', b => { b.closure.source_custody.capture_receipt_sha256 = '0'.repeat(64); });
add('closure authority', b => { b.closure.authority.extraction_finding = true; });
add('closure open before', b => { b.closure.residual_atlas_effect_if_promoted_after_rd01_wave03_closure.open_before = 36; });
add('closure closed after', b => { b.closure.residual_atlas_effect_if_promoted_after_rd01_wave03_closure.closed_after = 7; });
add('closure wave complete', b => { b.closure.residual_atlas_effect_if_promoted_after_rd01_wave03_closure.wave_complete = true; });
add('schema root opened', b => { b.schema.additionalProperties = true; });
add('schema class', b => { b.schema.properties.class_id.const = 'RD-03-C04'; });
add('schema terminal status', b => { b.schema.properties.status.const = 'still_open'; });
add('schema required count', b => { b.schema.properties.counts.properties.required_fields.const = 54; });
add('schema observed count', b => { b.schema.properties.counts.properties.observed_fields.const = 22; });
add('schema restricted count', b => { b.schema.properties.counts.properties.source_restricted_fields.const = 27; });
for (const fieldId of REQUIRED_FIELDS) {
  add(`schema ${fieldId} opened`, b => { b.schema.properties.instruments.items.properties.fields.properties[fieldId].additionalProperties = true; });
  add(`schema ${fieldId} nonterminal`, b => { b.schema.properties.instruments.items.properties.fields.properties[fieldId].properties.terminal_for_class_closure.const = false; });
}

for (const [name, mutate] of cases) {
  const bundle = clone();
  mutate(bundle);
  assert.throws(() => validateBundleShape(bundle), undefined, name);
}

console.log(`RD-03 Wave-03 terminal adversarial suite: ${cases.length} mutations refused`);
