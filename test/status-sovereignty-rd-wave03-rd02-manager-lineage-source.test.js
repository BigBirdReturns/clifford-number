#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, EXECUTION_PATH, SOURCE_PATH, SUMMARY_PATH, MANIFEST_PATH, PREVIOUS_SOURCE_PATH, SCHEMA_PATH, validateBundle } from '../tools/validate-status-sovereignty-rd-wave03-rd02-manager-lineage-source.mjs';
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = { execution: read(EXECUTION_PATH), source: read(SOURCE_PATH), summary: read(SUMMARY_PATH), manifest: read(MANIFEST_PATH), previousSource: read(PREVIOUS_SOURCE_PATH), schema: read(SCHEMA_PATH) };
const clone = () => structuredClone(base);
const setPath = (value, dotted, replacement) => {
  const parts = dotted.split('.');
  let cursor = value;
  for (const part of parts.slice(0, -1)) cursor = cursor[Number.isInteger(Number(part)) ? Number(part) : part];
  cursor[Number.isInteger(Number(parts.at(-1))) ? Number(parts.at(-1)) : parts.at(-1)] = replacement;
};
const mutations = [];
const add = (target, path, replacement) => mutations.push((x) => setPath(x[target], path, replacement));
for (const [path, replacement] of [
  ['$id','https://example.com/wrong.json'],['additionalProperties',true],['properties.schema_version.const','wrong'],['properties.source_id.const','wrong'],['properties.unit_binding.properties.unit_ordinal.const',14],['properties.unit_binding.properties.exact_frozen_legal_vehicle_string_present.const',true],['properties.admitted_observations.minItems',3],['properties.admitted_observations.maxItems',5],['properties.source_disposition.properties.admitted_source.const',false],['properties.source_disposition.properties.lifecycle_events_for_rd02_c05_observed.const',1],['properties.source_disposition.properties.class_closed.const',true]
]) add('schema', path, replacement);
for (const [path, replacement] of [
  ['schema_version','wrong'],['canonical_replay_merge','0'.repeat(40)],['execution.workflow_run',1],['execution.trigger_pr',1],['execution.artifact_id',1],['execution.artifact_zip_bytes',1],['execution.artifact_zip_sha256','1'.repeat(64)],['execution.artifact_manifest_entries',1],['execution.artifact_manifest_combined_sha256','2'.repeat(64)],['counts.original_successful_routes_replayed',1],['counts.fixed_replay_routes',2],['counts.replay_attempts',2],['counts.terminal_replay_routes',0],['counts.http_success_pdf_captured',0],['counts.transport_failures',1],['counts.http_failures',1],['counts.source_restrictions',1],['counts.admitted_sources_in_raw_capture',1],['counts.observations_admitted_in_raw_capture',1],['counts.fields_closed_in_raw_capture',1],['counts.result_spawned_requests',1],['route_outcome.route_id','wrong'],['route_outcome.replays_route_id','RD02-W03-DL001'],['route_outcome.candidate_ordinal',404],['route_outcome.unit_ordinal',14],['route_outcome.transport_url','https://example.com/'],['route_outcome.curl_exit',3],['route_outcome.http_status',403],['route_outcome.final_host_allowed',false],['route_outcome.content_type','text/html'],['route_outcome.body_bytes',1],['route_outcome.body_sha256','3'.repeat(64)],['route_outcome.result_spawned_requests',1],['inspection_custody.pdf_pages',1],['inspection_custody.embedded_text_bytes',1],['inspection_custody.embedded_text_sha256','4'.repeat(64)],['inspection_custody.rendered_pages_inspected',1],['inspection_custody.all_pages_rendered_and_inspected',false],['current_result.new_admitted_sources',0],['current_result.new_bounded_observations',3],['current_result.new_lifecycle_events_observed',1],['current_result.fields_terminally_closed',1],['current_result.row_terminally_closed',true],['current_result.class_state','closed'],['current_result.class_closed',true],['current_result.automatic_additional_search_pass_authorized',true],['authority_boundaries.outside_human_dependency',true],['authority_boundaries.external_contacts',1],['authority_boundaries.capital_conversion_finding',true],['authority_boundaries.graph_effect','created']
]) add('execution', path, replacement);
for (const [path, replacement] of [
  ['source_id','wrong'],['publication_date','2021-02-18'],['transport_url','https://example.com/'],['unit_binding.unit_ordinal',14],['unit_binding.exact_frozen_legal_vehicle_string_present',true],['unit_binding.later_public_fund_name_present',true],['exact_custody.workflow_run',1],['exact_custody.artifact_id',1],['exact_custody.artifact_zip_sha256','5'.repeat(64)],['exact_custody.body_bytes',1],['exact_custody.body_sha256','6'.repeat(64)],['exact_custody.pdf_pages',1],['exact_custody.embedded_text_sha256','7'.repeat(64)],['exact_custody.all_pages_rendered_and_inspected',false],['admitted_observations.0.field','acquisition_closing'],['admitted_observations.0.state','inferred'],['admitted_observations.0.scope','observed closing'],['admitted_observations.2.scope','capital funded'],['class_field_effect.source_identities_and_exact_custody','none'],['class_field_effect.field_and_row_terminal_state','terminal'],['unresolved_limits.acquisition_closing_recovered',true],['unresolved_limits.actual_sba_leverage_draw_recovered',true],['unresolved_limits.publicly_identified_portfolio_investments_recovered',true],['unresolved_limits.realized_fund_returns_recovered',true],['unresolved_limits.missing_records_are_event_absence',true],['source_disposition.admitted_source',false],['source_disposition.admitted_observations',3],['source_disposition.lifecycle_events_for_rd02_c05_observed',1],['source_disposition.fields_terminally_closed',1],['source_disposition.row_terminally_closed',true],['source_disposition.class_closed',true],['authority_boundaries.coordination_finding',true],['authority_boundaries.publication_effect','published']
]) add('source', path, replacement);
for (const [path, replacement] of [
  ['source_id','wrong'],['source_disposition.admitted_source',false],['source_disposition.admitted_observations',6],['source_disposition.lifecycle_events_for_rd02_c05_observed',1],['source_disposition.fields_terminally_closed',1],['source_disposition.class_closed',true]
]) add('previousSource', path, replacement);
for (const [path, replacement] of [
  ['authority','complete'],['counts.frozen_cohort_rows',17],['counts.required_fields_per_row',9],['counts.required_matrix_cells',179],['counts.admitted_leaf_sources',1],['counts.admitted_bounded_observations',10],['counts.lifecycle_events_observed',1],['counts.fields_terminally_closed_by_leaf_sources',1],['counts.rows_terminally_closed_by_leaf_sources',1],['counts.result_spawned_requests',1],['current_result.automatic_additional_search_pass_authorized',true],['current_result.next_operation','search forever'],['current_result.field_matrix_terminal',true],['current_result.class_state','closed'],['current_result.class_closed',true],['boundaries.manager_lineage_is_exact_vehicle_identity',true],['boundaries.announced_acquisition_agreement_is_observed_closing',true],['boundaries.financial_commitment_is_capital_funded',true],['boundaries.financial_commitment_is_portfolio_investment',true],['boundaries.historical_manager_portfolio_is_later_fund_portfolio',true],['boundaries.leverage_eligibility_is_leverage_draw',true],['boundaries.missing_public_lifecycle_record_is_event_absence',true],['boundaries.two_leaf_sources_close_unit_or_class',true],['boundaries.functional_convergence_is_coordination_or_common_purpose',true]
]) add('summary', path, replacement);
for (const [path, replacement] of [['schema_version','wrong'],['entry_count',2],['combined_sha256','8'.repeat(64)],['entries.0.bytes',1],['entries.0.sha256','9'.repeat(64)],['entries.1.path',EXECUTION_PATH]]) add('manifest', path, replacement);
mutations.push((x) => { x.source.admitted_observations.pop(); });
mutations.push((x) => { x.source.context_not_promoted.pop(); });
mutations.push((x) => { x.execution.unapproved = true; });
mutations.push((x) => { x.source.unapproved = true; });
mutations.push((x) => { x.summary.unapproved = true; });
mutations.push((x) => { x.manifest.entries.pop(); });
let refused = 0;
for (const mutate of mutations) {
  const specimen = clone();
  mutate(specimen);
  try { validateBundle(specimen); } catch { refused += 1; }
}
if (refused !== mutations.length) throw new Error(`adversarial refusals ${refused}/${mutations.length}`);
validateBundle(base);
console.log(`RD-02 manager-lineage source adversarial suite: ${refused} PASS`);
