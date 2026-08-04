#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  PROTOCOL_PATH,
  SCHEMA_PATH,
  MATRIX_PATH,
  SEED_PATH,
  validateProtocolData
} from '../tools/validate-status-sovereignty-rd-wave03-rd02-search-census.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = {
  protocol: read(PROTOCOL_PATH),
  schema: read(SCHEMA_PATH),
  matrix: read(MATRIX_PATH),
  seed: read(SEED_PATH)
};
const clone = () => structuredClone(base);

validateProtocolData(base.protocol, base.schema, base.matrix, base.seed);

const cases = [
  ['protocol identity', (b) => { b.protocol.class_id = 'RD-02-C06'; }],
  ['issue custody', (b) => { b.protocol.issue = 999; }],
  ['authority escalation', (b) => { b.protocol.authority = 'empirical_receipt'; }],
  ['constitution parent', (b) => { b.protocol.source_custody.constitution_merge = '0'.repeat(40); }],
  ['current ledger parent', (b) => { b.protocol.source_custody.wave03_current_ledger_merge = '0'.repeat(40); }],
  ['publication base', (b) => { b.protocol.source_custody.protocol_publication_base = '0'.repeat(40); }],
  ['seed blob', (b) => { b.protocol.source_custody.seed_git_blob = '0'.repeat(40); }],
  ['matrix blob', (b) => { b.protocol.source_custody.matrix_git_blob = '0'.repeat(40); }],
  ['cohort denominator', (b) => { b.protocol.denominator.cohort_rows = 17; }],
  ['named denominator', (b) => { b.protocol.denominator.publicly_named_rows = 18; }],
  ['withheld denominator', (b) => { b.protocol.denominator.identity_withheld_rows = 0; }],
  ['cell denominator', (b) => { b.protocol.denominator.required_cells = 179; }],
  ['route denominator', (b) => { b.protocol.denominator.fixed_routes = 50; }],
  ['withheld routes', (b) => { b.protocol.denominator.withheld_row_routes = 1; }],
  ['query reorder', (b) => { b.protocol.query_specs.reverse(); }],
  ['query class', (b) => { b.protocol.query_specs[0].query_class = 'performance'; }],
  ['query terms', (b) => { b.protocol.query_specs[1].terms = '(award OR success)'; }],
  ['route order', (b) => { b.protocol.route_derivation.query_class_order.reverse(); }],
  ['route template', (b) => { b.protocol.route_derivation.route_id_template = 'invented'; }],
  ['query template', (b) => { b.protocol.route_derivation.query_template = '{legal_vehicle}'; }],
  ['search host', (b) => { b.protocol.route_derivation.search_base_url = 'https://example.com/?q='; }],
  ['URL encoding', (b) => { b.protocol.route_derivation.url_encoding = 'form encoding'; }],
  ['ledger columns', (b) => { b.protocol.route_derivation.route_ledger_columns.pop(); }],
  ['ledger bytes', (b) => { b.protocol.route_derivation.route_ledger_bytes = 22032; }],
  ['ledger digest', (b) => { b.protocol.route_derivation.route_ledger_sha256 = '0'.repeat(64); }],
  ['duplicate route permission', (b) => { b.protocol.route_derivation.route_ids_unique = false; }],
  ['route-spawned request', (b) => { b.protocol.route_derivation.result_spawned_requests = 1; }],
  ['second attempt', (b) => { b.protocol.execution_contract.maximum_attempts_per_route = 2; }],
  ['body ceiling', (b) => { b.protocol.execution_contract.maximum_body_bytes = 4194304; }],
  ['parallelism', (b) => { b.protocol.execution_contract.maximum_parallel_workers = 12; }],
  ['candidate admission', (b) => { b.protocol.execution_contract.candidate_rows_are_admitted_sources = true; }],
  ['candidate followup', (b) => { b.protocol.execution_contract.candidate_followup_without_separate_protocol = true; }],
  ['result-spawned request', (b) => { b.protocol.execution_contract.result_spawned_requests = 1; }],
  ['search silence', (b) => { b.protocol.execution_contract.search_silence_is_event_absence = true; }],
  ['search result event', (b) => { b.protocol.execution_contract.search_result_is_lifecycle_event = true; }],
  ['automatic closure', (b) => { b.protocol.execution_contract.automatic_class_closure = true; }],
  ['withheld ordinal', (b) => { b.protocol.withheld_boundary.unit_ordinal = 17; }],
  ['withheld network request', (b) => { b.protocol.withheld_boundary.network_routes = 1; }],
  ['identity guessing', (b) => { b.protocol.withheld_boundary.identity_guessing = true; }],
  ['manager substitution', (b) => { b.protocol.withheld_boundary.manager_substitution = true; }],
  ['lifecycle inference', (b) => { b.protocol.withheld_boundary.lifecycle_inference = true; }],
  ['route receipt denominator', (b) => { b.protocol.output_contract.route_receipts = 50; }],
  ['candidate admission shortcut', (b) => { b.protocol.output_contract.candidate_admission_requires_separate_followup_receipt = false; }],
  ['requests executed', (b) => { b.protocol.current_result.requests_executed_by_this_object = true; }],
  ['candidate promoted', (b) => { b.protocol.current_result.candidate_urls_admitted = 1; }],
  ['matrix terminal', (b) => { b.protocol.current_result.field_matrix_terminal = true; }],
  ['class closed', (b) => { b.protocol.current_result.class_closed = true; }],
  ['outside human', (b) => { b.protocol.current_result.outside_human_dependency = true; }],
  ['project block', (b) => { b.protocol.current_result.project_blocking = true; }],
  ['external contact', (b) => { b.protocol.authority_boundaries.external_contacts = 1; }],
  ['external review', (b) => { b.protocol.authority_boundaries.external_reviews = 1; }],
  ['capital conversion', (b) => { b.protocol.authority_boundaries.capital_conversion_finding = true; }],
  ['favoritism', (b) => { b.protocol.authority_boundaries.favoritism_finding = true; }],
  ['extraction', (b) => { b.protocol.authority_boundaries.extraction_finding = true; }],
  ['coordination', (b) => { b.protocol.authority_boundaries.coordination_finding = true; }],
  ['common purpose', (b) => { b.protocol.authority_boundaries.common_purpose_finding = true; }],
  ['complete compact', (b) => { b.protocol.authority_boundaries.complete_compact_finding = true; }],
  ['racial order', (b) => { b.protocol.authority_boundaries.racial_order_finding = true; }],
  ['prevalence', (b) => { b.protocol.authority_boundaries.prevalence_finding = true; }],
  ['graph effect', (b) => { b.protocol.authority_boundaries.graph_effect = 'changed'; }],
  ['schema open', (b) => { b.schema.additionalProperties = true; }],
  ['schema route count', (b) => { b.schema.properties.denominator.properties.fixed_routes.const = 50; }],
  ['schema closure', (b) => { b.schema.properties.current_result.properties.class_closed.const = true; }],
  ['matrix unit removed', (b) => { b.matrix.units.pop(); }],
  ['matrix unit reorder', (b) => { [b.matrix.units[0], b.matrix.units[1]] = [b.matrix.units[1], b.matrix.units[0]]; }],
  ['matrix legal vehicle', (b) => { b.matrix.units[0].legal_vehicle = 'Invented Fund, LP'; }],
  ['matrix withheld identity', (b) => { b.matrix.units[17].legal_vehicle = 'Guessed Fund, LP'; }],
  ['matrix field removed', (b) => { b.matrix.required_fields.pop(); }],
  ['matrix cell count', (b) => { b.matrix.expansion_contract.required_cells = 179; }],
  ['matrix materialized', (b) => { b.matrix.current_counts.materialized_cells = 1; }],
  ['matrix closed', (b) => { b.matrix.current_counts.class_closed = true; }],
  ['matrix inference', (b) => { b.matrix.expansion_contract.withheld_identity_guessing_or_replacement_allowed = true; }],
  ['seed class closed', (b) => { b.seed.class_closed = true; }],
  ['seed unit count', (b) => { b.seed.denominator_contract.unit_count = 17; }],
  ['seed withheld inference', (b) => { b.seed.denominator_contract.withheld_row_replacement_or_inference_allowed = true; }],
  ['seed graph effect', (b) => { b.seed.authority.graph_effect = 'changed'; }]
];

for (const [label, mutate] of cases) {
  const candidate = clone();
  mutate(candidate);
  assert.throws(
    () => validateProtocolData(candidate.protocol, candidate.schema, candidate.matrix, candidate.seed),
    undefined,
    label
  );
}

console.log(`status-sovereignty-rd-wave03-rd02-search-census.test: positive plus ${cases.length} adversarial mutations passed`);
