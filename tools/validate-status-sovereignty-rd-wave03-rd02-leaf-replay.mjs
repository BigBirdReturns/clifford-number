#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle';
export const EXECUTION_PATH = `${BASE}/disclosure-leaf-execution-receipt.json`;
export const SOURCE_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/sources/stifel-am-forward-2024-final-approval.json';
export const REPLAY_PATH = `${BASE}/manager-lineage-replay-protocol.json`;
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-leaf-replay.schema.json';

export const CANONICAL_PROTOCOL_MERGE = '135bc5acc1bec7f13d817caf697aec9c36c157e0';
export const ARTIFACT_SHA = '711296d8a951c60191abc9dba2301d37de6d9f40f9b51694374198d229ed23d5';
export const MANIFEST_SHA = '4a129d9a70f49d2764128fa90010c51c365ff63c2b8c4d8c109d7522a95e8877';
export const APPROVAL_BODY_SHA = 'a5de66bc80db12ca7fc70de0bc41214cd3e0925c10d7139ede9ea6426fa3028d';
export const RAW_CANDIDATE_URL = 'https://www.stifel.com/docs/pdf/pressreleases/2021/Stifel North Atlantic NEW FINAL for 02.19.21-1.pdf';
export const TRANSPORT_URL = 'https://www.stifel.com/docs/pdf/pressreleases/2021/Stifel%20North%20Atlantic%20NEW%20FINAL%20for%2002.19.21-1.pdf';
export const CANDIDATE_ID = 'cf856a923b3d12b963214c6977e4bbc871d90d8c69bd6b81a44f556b07247f56';
export const OBSERVATION_FIELDS = Object.freeze([
  'public_fund_identity',
  'final_federal_approval',
  'sbic_license',
  'sba_leverage_eligibility',
  'prior_green_light',
  'private_capital_commitments',
  'manager_lineage'
]);
export const REQUIRED_CLASS_FIELDS = Object.freeze([
  'canonical_cohort_row_and_legal_vehicle_or_withheld_state_label',
  'publicly_identified_portfolio_investments',
  'publicly_identified_follow_on_investments',
  'publicly_identified_exits',
  'publicly_identified_write_offs_or_realized_losses',
  'publicly_identified_defaults_or_cures',
  'publicly_identified_realized_fund_returns',
  'sba_guaranteed_leverage_repayment_or_loss_allocation',
  'source_identities_and_exact_custody',
  'field_and_row_terminal_state'
]);

const abs = (relativePath) => path.join(ROOT, relativePath);
const readJson = (relativePath) => JSON.parse(fs.readFileSync(abs(relativePath), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
function exactKeys(object, keys, label) {
  same(Object.keys(object).sort(), [...keys].sort(), `${label}: exact keys mismatch`);
}
function validateBoundary(boundary, label) {
  ok(boundary?.outside_human_dependency === false, `${label}: outside-human dependency`);
  ok(boundary?.external_contacts === 0 && boundary?.external_reviews === 0, `${label}: external action`);
  for (const key of [
    'capital_conversion_finding','favoritism_finding','extraction_finding',
    'coordination_finding','common_purpose_finding','complete_compact_finding'
  ]) ok(boundary?.[key] === false, `${label}: ${key}`);
  ok(boundary?.publication_effect === 'none' && boundary?.adoption_effect === 'none' && boundary?.graph_effect === 'none', `${label}: effects`);
}

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd02-leaf-replay.schema.json', 'schema ID');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema closure');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd02-wave03-admitted-source-receipt@1', 'schema version');
  ok(schema?.properties?.source_id?.const === 'STIFEL-AM-FORWARD-2024-FINAL-APPROVAL', 'schema source ID');
  ok(schema?.properties?.unit_binding?.properties?.unit_ordinal?.const === 15, 'schema unit ordinal');
  ok(schema?.properties?.unit_binding?.properties?.exact_frozen_legal_vehicle_string_present?.const === false, 'schema legal-string boundary');
  ok(schema?.properties?.admitted_observations?.minItems === 7 && schema?.properties?.admitted_observations?.maxItems === 7, 'schema observation count');
  ok(schema?.properties?.source_disposition?.properties?.admitted_source?.const === true, 'schema source admission');
  ok(schema?.properties?.source_disposition?.properties?.lifecycle_events_for_rd02_c05_observed?.const === 0, 'schema lifecycle boundary');
  ok(schema?.properties?.source_disposition?.properties?.class_closed?.const === false, 'schema class boundary');
  return true;
}

export function validateBundle(bundle = {}) {
  const execution = bundle.execution ?? readJson(EXECUTION_PATH);
  const source = bundle.source ?? readJson(SOURCE_PATH);
  const replay = bundle.replay ?? readJson(REPLAY_PATH);
  const schema = bundle.schema ?? readJson(SCHEMA_PATH);
  validateSchemaContract(schema);

  exactKeys(execution, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','authority',
    'canonical_protocol_merge','execution','bound_file_sha256','counts',
    'route_outcomes','inspection_custody','current_result','authority_boundaries'
  ], 'execution');
  ok(execution.schema_version === 'ssc-rd02-wave03-disclosure-leaf-execution-receipt@1', 'execution schema');
  ok(execution.wave_id === 'SSC-RD-W03' && execution.lane_id === 'RD-02' && execution.class_id === 'RD-02-C05' && execution.issue === 1015, 'execution identity');
  ok(execution.canonical_protocol_merge === CANONICAL_PROTOCOL_MERGE, 'execution canonical merge');
  ok(execution.execution.workflow_run === 30952281385 && execution.execution.workflow_attempt === 1 && execution.execution.trigger_pr === 1082, 'execution run custody');
  ok(execution.execution.trigger_head === '741533b26b6d64bbd554f3df6cc67ccba843492f' && execution.execution.synthetic_merge_head === 'ad5c47d0a32754fa9ca7abf1ad4ff4b5f454cefb', 'execution Git custody');
  ok(execution.execution.artifact_id === 8909616198 && execution.execution.artifact_zip_bytes === 148771 && execution.execution.artifact_zip_sha256 === ARTIFACT_SHA, 'execution artifact');
  ok(execution.execution.manifest_entries === 18 && execution.execution.manifest_combined_sha256 === MANIFEST_SHA && execution.execution.manifest_file_sha256 === '3058cc541ddf85ed6e973b2bde9047eb8664f08d3c525599dbd29639f0e69c68', 'execution manifest');
  same(execution.counts, {
    fixed_routes: 2,
    route_attempts: 2,
    terminal_routes: 2,
    http_success_pdf_captured: 1,
    pretransport_failures: 1,
    http_failures: 0,
    source_restrictions: 0,
    pdf_bodies_captured: 1,
    admitted_sources_in_raw_capture: 0,
    observations_admitted_in_raw_capture: 0,
    fields_closed_in_raw_capture: 0,
    result_spawned_requests: 0,
    external_contacts: 0,
    external_reviews: 0
  }, 'execution counts');
  ok(execution.route_outcomes.length === 2, 'execution routes');
  const [success, failure] = execution.route_outcomes;
  ok(success.route_id === 'RD02-W03-DL001' && success.candidate_ordinal === 276 && success.curl_exit === 0 && success.http_status === 200, 'success route identity');
  ok(success.body_bytes === 145941 && success.body_sha256 === APPROVAL_BODY_SHA && success.terminal_route_state === 'http_success_pdf_captured_text_inspection_completed_separately', 'success route body');
  ok(success.admitted_source_in_raw_capture === false && success.result_spawned_requests === 0, 'success route raw authority');
  ok(failure.route_id === 'RD02-W03-DL002' && failure.candidate_ordinal === 405 && failure.candidate_id === CANDIDATE_ID, 'failure route identity');
  ok(failure.requested_url === RAW_CANDIDATE_URL && failure.curl_exit === 3 && failure.http_status === 0 && failure.body_bytes === 0, 'failure route transport');
  ok(failure.stderr === 'curl: (3) URL rejected: Malformed input to a URL function' && failure.terminal_route_state === 'terminal_pretransport_url_encoding_failure', 'failure classification');
  ok(failure.http_request_sent === false && failure.source_restricted === false && failure.source_unavailable === false && failure.replay_authorized === true && failure.result_spawned_requests === 0, 'failure authority');
  ok(execution.inspection_custody.route_id === 'RD02-W03-DL001' && execution.inspection_custody.pdf_pages === 2 && execution.inspection_custody.embedded_text_bytes === 4736, 'inspection denominator');
  ok(execution.inspection_custody.embedded_text_sha256 === 'dfe8142b7e0033c964fd97508d0aa3d5714a66d10ee1d8ff1b72464557a27a17', 'inspection text hash');
  same(execution.inspection_custody.rendered_page_sha256, [
    'e5a0d8cab035317382aeb7da20d41cd2a94b46faae747e9fe828340c4d4f7a4d',
    '866a7e001f2342246cc8b4f833e334e81c9c0dc78cfe16b2fa96c399ffbbd922'
  ], 'inspection renders');
  ok(execution.inspection_custody.all_pages_rendered_and_inspected === undefined || execution.inspection_custody.rendered_pages_inspected === 2, 'inspection completion');
  ok(execution.current_result.new_admitted_sources === 1 && execution.current_result.new_lifecycle_events_observed === 0 && execution.current_result.field_matrix_terminal === false && execution.current_result.class_state === 'still_open' && execution.current_result.class_closed === false, 'execution result');
  validateBoundary(execution.authority_boundaries, 'execution boundary');

  exactKeys(source, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','source_id',
    'source_type','source_title','publication_date','publisher','requested_url',
    'unit_binding','exact_custody','admitted_observations','class_field_effect',
    'unresolved_limits','source_disposition','authority_boundaries'
  ], 'source');
  ok(source.schema_version === 'ssc-rd02-wave03-admitted-source-receipt@1', 'source schema');
  ok(source.source_id === 'STIFEL-AM-FORWARD-2024-FINAL-APPROVAL' && source.source_type === 'issuer_press_release_pdf' && source.publication_date === '2024-10-22' && source.publisher === 'Stifel Financial Corp.', 'source identity');
  ok(source.requested_url === 'https://www.stifel.com/docs/pdf/pressreleases/2024/Stifel-SBA-Approval-for-10.22.24.pdf', 'source URL');
  ok(source.unit_binding.unit_ordinal === 15 && source.unit_binding.unit_id === 'SBICCT-FIRST-COHORT-15' && source.unit_binding.frozen_legal_vehicle === 'Stifel North Atlantic AM-Forward, LP', 'source unit');
  ok(source.unit_binding.public_fund_name_in_source === 'Stifel North Atlantic AM-Forward Fund' && source.unit_binding.exact_frozen_legal_vehicle_string_present === false, 'source identity boundary');
  ok(source.exact_custody.artifact_zip_sha256 === ARTIFACT_SHA && source.exact_custody.body_sha256 === APPROVAL_BODY_SHA && source.exact_custody.pdf_pages === 2 && source.exact_custody.all_pages_rendered_and_inspected === true, 'source exact custody');
  ok(source.admitted_observations.length === 7, 'seven observations');
  same(source.admitted_observations.map((row) => row.observation_id), OBSERVATION_FIELDS.map((_, index) => `STIFEL-AMF-OBS-${String(index + 1).padStart(3, '0')}`), 'observation IDs');
  same(source.admitted_observations.map((row) => row.field), [...OBSERVATION_FIELDS], 'observation fields');
  ok(source.admitted_observations.every((row) => row.state === 'observed' && Array.isArray(row.not_equivalent_to) && row.not_equivalent_to.length >= 3), 'observation semantic boundaries');
  const leverage = source.admitted_observations.find((row) => row.field === 'sba_leverage_eligibility');
  ok(leverage.scope === 'eligibility only' && leverage.not_equivalent_to.includes('leverage draw') && leverage.not_equivalent_to.includes('SBA repayment'), 'leverage boundary');
  const commitments = source.admitted_observations.find((row) => row.field === 'private_capital_commitments');
  same(commitments.value.named_commitment_sources, ['Lockheed Martin','GE Aerospace','ASTM International'], 'commitment names');
  ok(commitments.value.amounts_publicly_stated === false && commitments.not_equivalent_to.includes('portfolio investment'), 'commitment boundary');
  same(Object.keys(source.class_field_effect), [...REQUIRED_CLASS_FIELDS], 'class field effect denominator');
  ok(source.class_field_effect.source_identities_and_exact_custody === 'one_admitted_source' && source.class_field_effect.field_and_row_terminal_state === 'unchanged_unclassified', 'class field effect');
  for (const key of [
    'actual_sba_leverage_commitment_recovered','actual_sba_leverage_draw_recovered',
    'publicly_identified_portfolio_investments_recovered','follow_on_investments_recovered',
    'exits_recovered','write_offs_or_realized_losses_recovered','defaults_or_cures_recovered',
    'realized_fund_returns_recovered','sba_repayment_or_loss_allocation_recovered',
    'missing_records_are_event_absence'
  ]) ok(source.unresolved_limits[key] === false, `source unresolved ${key}`);
  same(source.source_disposition, {
    admitted_source: true,
    admitted_observations: 7,
    lifecycle_events_for_rd02_c05_observed: 0,
    fields_terminally_closed: 0,
    row_terminally_closed: false,
    class_closed: false
  }, 'source disposition');
  validateBoundary(source.authority_boundaries, 'source boundary');

  exactKeys(replay, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','authority',
    'source_custody','frozen_unit','denominator','routes','execution_contract',
    'current_counts','authority_boundaries'
  ], 'replay');
  ok(replay.schema_version === 'ssc-rd02-wave03-manager-lineage-replay-protocol@1', 'replay schema');
  ok(replay.source_custody.canonical_disclosure_leaf_protocol_merge === CANONICAL_PROTOCOL_MERGE && replay.source_custody.artifact_zip_sha256 === ARTIFACT_SHA, 'replay custody');
  ok(replay.source_custody.failed_route_id === 'RD02-W03-DL002' && replay.source_custody.failed_route_candidate_id === CANDIDATE_ID && replay.source_custody.failed_route_http_status === 0 && replay.source_custody.http_request_sent === false, 'replay failure custody');
  same(replay.denominator, {
    original_fixed_routes: 2,
    original_terminal_routes: 2,
    original_successful_pdf_routes: 1,
    original_pretransport_failures: 1,
    successful_routes_replayed: 0,
    fixed_replay_routes: 1,
    route_ledger_bytes: 266,
    route_ledger_sha256: '10e8c93e381c4bba4768e0914e7eb50cd8d7bdf0a1e5b634b6fa2952acfd4e12'
  }, 'replay denominator');
  ok(replay.routes.length === 1, 'one replay route');
  const route = replay.routes[0];
  ok(route.route_id === 'RD02-W03-DLR001' && route.replays_route_id === 'RD02-W03-DL002' && route.candidate_ordinal === 405 && route.candidate_id === CANDIDATE_ID, 'replay route identity');
  ok(route.candidate_url === RAW_CANDIDATE_URL && route.transport_url === TRANSPORT_URL, 'replay URLs');
  ok(sha256(route.candidate_url) === route.candidate_id && decodeURIComponent(route.transport_url) === route.candidate_url, 'replay candidate/transport relation');
  ok(route.transport_normalization === 'literal_ascii_spaces_percent_encoded_as_%20_only' && route.route_type === 'manager_lineage_pdf_replay_get', 'replay normalization');
  ok(route.maximum_replay_attempts === 1 && route.maximum_response_body_bytes === 10485760 && route.candidate_is_admitted_source === false && route.automatic_observation_admission === false && route.result_spawned_requests === 0, 'replay route limits');
  ok(route.expected_observation_scope.length === 3 && route.forbidden_promotions.length === 4, 'replay semantic bounds');
  const ledger = `${route.route_id}\t${route.unit_ordinal}\t${route.candidate_url}\t${route.transport_url}\t${route.route_type}\n`;
  ok(Buffer.byteLength(ledger) === replay.denominator.route_ledger_bytes && sha256(ledger) === replay.denominator.route_ledger_sha256, 'replay route ledger');
  ok(replay.execution_contract.replay_authorized_only_because_original_http_request_was_not_sent === true && replay.execution_contract.successful_route_replay_forbidden === true, 'replay authorization');
  ok(replay.execution_contract.raw_candidate_identity_preserved === true && replay.execution_contract.transport_normalization_limited_to_percent_encoding_literal_spaces === true, 'replay identity custody');
  ok(replay.execution_contract.maximum_replay_attempts === 1 && replay.execution_contract.maximum_parallel_workers === 1 && replay.execution_contract.pdf_magic_required_for_success === true, 'replay execution limits');
  ok(replay.execution_contract.result_spawned_requests === 0 && replay.execution_contract.candidate_admission_without_separate_adjudication === false && replay.execution_contract.automatic_observation_admission === false && replay.execution_contract.automatic_field_closure === false && replay.execution_contract.automatic_class_closure === false, 'replay automatic promotion boundary');
  same(replay.current_counts, {
    replay_attempts: 0,
    terminal_replay_routes: 0,
    captured_pdf_bodies: 0,
    admitted_sources: 0,
    observations_admitted: 0,
    fields_closed: 0,
    class_closed: false
  }, 'replay pre-execution state');
  validateBoundary(replay.authority_boundaries, 'replay boundary');

  return {
    sourceAdmitted: true,
    observationsAdmitted: 7,
    lifecycleEvents: 0,
    fieldsClosed: 0,
    replayRoutes: 1,
    successfulRoutesReplayed: 0,
    classClosed: false
  };
}

export function validateRepository(root = ROOT) {
  validateBundle();
  execFileSync('git', ['merge-base', '--is-ancestor', CANONICAL_PROTOCOL_MERGE, 'HEAD'], { cwd: root, stdio: 'ignore' });
  for (const relativePath of [EXECUTION_PATH, SOURCE_PATH, REPLAY_PATH, SCHEMA_PATH]) {
    ok(fs.existsSync(path.join(root, relativePath)), `missing repository path ${relativePath}`);
  }
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateRepository();
  console.log(`RD-02 leaf replay validation: PASS (1 admitted source; 7 bounded observations; ${result.replayRoutes} failed-route replay; class open)`);
}
