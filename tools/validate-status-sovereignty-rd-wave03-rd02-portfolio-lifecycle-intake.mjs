#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  PACKAGE_PATH,
  SCHEMA_PATH,
  CONTRACT_PATH,
  SEED_PATH,
  PARENT_MATRIX_PATH,
  PARENT_RECEIPT_PATH,
  CONTRACT_SHA256,
  SEED_SHA256,
  derivePackage,
  deriveSchema
} from './build-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.mjs';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const exactKeys = (value, keys, label) => same(Object.keys(value).sort(), [...keys].sort(), `${label} keys changed`);
const ROOT_KEYS = ['schema_version','wave_id','lane_id','class_id','issue','as_of','status','closure_target','source_custody','denominator','execution_contract','candidate_law','next_stage','current_counts','boundaries'];

function validateSchema(schema, value) {
  ok(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.schema.json', 'schema id changed');
  ok(schema.title === 'SSC RD-02 Wave 03 portfolio lifecycle fixed protocol', 'schema title changed');
  ok(schema.type === 'object' && schema.additionalProperties === false, 'schema root is not closed');
  same(schema.required, ROOT_KEYS, 'schema required keys changed');
  exactKeys(schema.properties, ROOT_KEYS, 'schema properties');
  for (const key of ROOT_KEYS) same(schema.properties[key], { const: value[key] }, `schema ${key} binding changed`);
  same(schema, deriveSchema(value), 'schema drifted from deterministic package');
}

export function validatePackageData(value, schema, expected) {
  exactKeys(value, ROOT_KEYS, 'package');
  ok(value.schema_version === 'ssc-rd-wave03-rd02-portfolio-lifecycle-fixed-protocol@1', 'package schema changed');
  ok(value.wave_id === 'SSC-RD-W03' && value.lane_id === 'RD-02' && value.class_id === 'RD-02-C05' && value.issue === 1015, 'package identity changed');
  ok(value.as_of === '2026-08-04' && value.status === 'fixed_protocol_frozen_acquisition_not_executed', 'package status changed');
  ok(value.closure_target === 'complete portfolio investment, follow-on, exit, write-off, default, return, and repayment ledger', 'closure target changed');

  exactKeys(value.source_custody, ['field_matrix_contract_path','field_matrix_contract_sha256','seed_path','seed_sha256','parent_terminal_matrix_path','parent_terminal_matrix_class_id','parent_class_receipt_path','parent_class_receipt_terminal_state','parent_row_membership_reused_without_reopening'], 'source custody');
  ok(value.source_custody.field_matrix_contract_path === CONTRACT_PATH && value.source_custody.field_matrix_contract_sha256 === CONTRACT_SHA256, 'contract custody changed');
  ok(value.source_custody.seed_path === SEED_PATH && value.source_custody.seed_sha256 === SEED_SHA256, 'seed custody changed');
  ok(value.source_custody.parent_terminal_matrix_path === PARENT_MATRIX_PATH && value.source_custody.parent_terminal_matrix_class_id === 'RD-02-C04', 'parent matrix custody changed');
  ok(value.source_custody.parent_class_receipt_path === PARENT_RECEIPT_PATH && value.source_custody.parent_class_receipt_terminal_state === 'bounded_source_unavailable', 'parent receipt custody changed');
  ok(value.source_custody.parent_row_membership_reused_without_reopening === true, 'parent row reuse boundary changed');

  exactKeys(value.denominator, ['units','required_fields','unit_count','publicly_named_units','identity_withheld_units','required_fields_per_unit','required_cells','materialized_cells','terminal_cells','terminal_units','class_closed'], 'denominator');
  ok(value.denominator.units.length === 18 && value.denominator.required_fields.length === 10, '18x10 denominator changed');
  ok(value.denominator.unit_count === 18 && value.denominator.publicly_named_units === 17 && value.denominator.identity_withheld_units === 1, 'unit counts changed');
  ok(value.denominator.required_fields_per_unit === 10 && value.denominator.required_cells === 180, 'cell denominator changed');
  ok(value.denominator.materialized_cells === 0 && value.denominator.terminal_cells === 0 && value.denominator.terminal_units === 0 && value.denominator.class_closed === false, 'unexecuted denominator advanced');
  same(value.denominator.units.map((row) => row.unit_ordinal), Array.from({ length: 18 }, (_, i) => i + 1), 'unit order changed');
  ok(new Set(value.denominator.units.map((row) => row.unit_id)).size === 18, 'duplicate unit id');
  ok(value.denominator.units[17].identity_state === 'identity_withheld_under_policy' && value.denominator.units[17].legal_vehicle === null, 'withheld row changed');

  exactKeys(value.execution_contract, ['fixed_before_results','fixed_routes','exact_get_routes','candidate_census_routes','result_spawned_requests','maximum_attempts_per_route','timeout_ms','maximum_body_bytes','concurrency','connection_header','search_result_limit_per_route','automatic_candidate_followup_authorized','automatic_second_pass_authorized','raw_request_response_and_hash_custody_required','terminal_http_non_success_is_typed_not_fatal','transport_failure_is_typed_not_absence'], 'execution contract');
  const routes = value.execution_contract.fixed_routes;
  ok(routes.length === 142 && value.execution_contract.exact_get_routes === 6 && value.execution_contract.candidate_census_routes === 136, 'fixed route count changed');
  same(routes.map((row) => row.ordinal), Array.from({ length: 142 }, (_, i) => i + 1), 'route order changed');
  ok(new Set(routes.map((row) => row.route_id)).size === 142, 'duplicate route id');
  ok(routes.filter((row) => row.route_type === 'exact_get').length === 6, 'exact route class changed');
  ok(routes.filter((row) => row.route_type === 'bing_rss_search').length === 136, 'search route class changed');
  for (const route of routes) {
    ok(route.method === 'GET' && route.maximum_attempts === 1, `${route.route_id}: request contract changed`);
    if (route.route_type === 'bing_rss_search') ok(route.candidate_only === true && route.evidence_admission_authorized === false, `${route.route_id}: candidate boundary changed`);
    else ok(route.candidate_only === false && route.evidence_admission_authorized === true, `${route.route_id}: exact-source boundary changed`);
  }
  ok(value.execution_contract.fixed_before_results === true && value.execution_contract.result_spawned_requests === 0, 'result-dependent expansion introduced');
  ok(value.execution_contract.maximum_attempts_per_route === 1 && value.execution_contract.timeout_ms === 45000 && value.execution_contract.maximum_body_bytes === 5242880 && value.execution_contract.concurrency === 2, 'bounded execution changed');
  ok(value.execution_contract.automatic_candidate_followup_authorized === false && value.execution_contract.automatic_second_pass_authorized === false, 'automatic expansion authorized');

  for (const [key, field] of Object.entries(value.candidate_law)) ok(field === false || field === true, `${key}: candidate law malformed`);
  ok(value.candidate_law.search_result_is_evidence === false, 'search result promoted to evidence');
  ok(value.candidate_law.official_domain_is_substantive_support === false && value.candidate_law.first_party_domain_is_substantive_support === false, 'domain promoted to support');
  ok(value.candidate_law.lexical_legal_vehicle_match_is_identity_resolution === false && value.candidate_law.result_rank_is_authority === false, 'lexical or rank authority introduced');
  ok(value.candidate_law.candidate_url_followup_requires_separate_frozen_successor === true && value.candidate_law.candidate_admission_requires_page_level_identity_event_and_instrument_custody === true, 'candidate successor law weakened');

  ok(value.next_stage.terminal_product_authorized_now === false && value.next_stage.class_closure_authorized_now === false, 'terminal authority introduced');
  exactKeys(value.current_counts, ['fixed_routes','exact_get_routes','candidate_census_routes','request_attempts','terminal_route_receipts','candidate_rows','admitted_evidence_sources','materialized_cells','terminal_cells','external_contacts','external_reviews'], 'current counts');
  same(value.current_counts, { fixed_routes:142, exact_get_routes:6, candidate_census_routes:136, request_attempts:0, terminal_route_receipts:0, candidate_rows:0, admitted_evidence_sources:0, materialized_cells:0, terminal_cells:0, external_contacts:0, external_reviews:0 }, 'current counts changed');

  for (const [key, field] of Object.entries(value.boundaries)) {
    if (key.endsWith('_effect')) ok(field === 'none', `${key} changed`);
    else ok(field === false, `${key} weakened`);
  }
  validateSchema(schema, value);
  same(value, expected, 'fixed protocol drifted from deterministic derivation');
  return value;
}

export function validatePackage(root = ROOT) {
  const value = read(root, PACKAGE_PATH);
  const schema = read(root, SCHEMA_PATH);
  validatePackageData(value, schema, derivePackage(root));
  console.log('validate-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake: 18 units, 180 cells, 142 fixed routes, acquisition not executed');
  return value;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { validatePackage(); }
  catch (error) { console.error(`validate-status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake: ${error.message}`); process.exit(1); }
}
