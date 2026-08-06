#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  SEED_PATH,
  MATRIX_PATH,
  PROTOCOL_PATH,
  MANIFEST_PATH,
  FIRST_PASS_PATH,
  AUTHORITY_CONTROL_PATH,
  PARENT_RECEIPT_PATH,
  PARENT_CLOSURE_PATH,
  ROSTER_CAPTURE_PATH,
  SCHEMA_PATH,
  TEST_PATH,
  RUNNER_PATH,
  MILESTONE_PATH,
  WORKFLOW_PATH,
  BUILDER_PATH,
  VALIDATOR_PATH,
  CONSTITUTION_MERGE,
  WAVE03_LEDGER_PROMOTION,
  PARENT_TERMINAL_MERGE,
  SEED_SHA256,
  MATRIX_SHA256,
  FIRST_PASS_SHA256,
  AUTHORITY_CONTROL_SHA256,
  PARENT_RECEIPT_SHA256,
  PARENT_CLOSURE_SHA256,
  ROSTER_CAPTURE_SHA256,
  ROSTER_CAPTURE_BYTES,
  MANIFEST_INPUTS,
  PERMANENT_PATHS,
  QUERY_SPECS,
  deriveProtocol,
  deriveSchema,
  deriveManifest,
  sha256
} from './build-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs';

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const read = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const exactKeys = (value, keys, label) => same(Object.keys(value).sort(), [...keys].sort(), `${label} keys changed`);

const ROOT_KEYS = [
  'schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'as_of', 'title', 'authority',
  'source_custody', 'denominator', 'inherited_source_custody', 'query_specs', 'route_derivation',
  'fixed_routes', 'execution_contract', 'candidate_law', 'next_stage', 'current_counts', 'boundaries'
];

function validateSchema(schema, value) {
  ok(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave03-rd05-member-participation-intake.schema.json', 'schema id changed');
  ok(schema.title === 'SSC RD-05 Wave 03 member participation fixed source census', 'schema title changed');
  ok(schema.type === 'object' && schema.additionalProperties === false, 'schema root is not closed');
  same(schema.required, ROOT_KEYS, 'schema required keys changed');
  exactKeys(schema.properties, ROOT_KEYS, 'schema properties');
  for (const key of ROOT_KEYS) same(schema.properties[key], { const: value[key] }, `schema ${key} binding changed`);
  same(schema, deriveSchema(value), 'schema drifted from deterministic protocol');
}

function validateMatrix(matrix) {
  exactKeys(matrix, [
    'schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'as_of', 'constitution_merge',
    'wave03_current_ledger_merge_at_design', 'seed_path', 'status', 'units', 'required_fields',
    'source_anchors', 'expansion_contract', 'current_counts', 'boundaries'
  ], 'matrix');
  ok(matrix.schema_version === 'ssc-rd-wave03-rd05-member-participation-field-matrix-contract@1', 'matrix schema changed');
  ok(matrix.wave_id === 'SSC-RD-W03' && matrix.lane_id === 'RD-05' && matrix.class_id === 'RD-05-C02' && matrix.issue === 1018, 'matrix identity changed');
  ok(matrix.constitution_merge === CONSTITUTION_MERGE && matrix.wave03_current_ledger_merge_at_design === WAVE03_LEDGER_PROMOTION, 'matrix ancestry custody changed');
  ok(matrix.seed_path === SEED_PATH && matrix.status === 'unit_and_field_contract_frozen_acquisition_not_executed', 'matrix status changed');
  ok(matrix.units.length === 17 && matrix.required_fields.length === 10, 'matrix 17x10 denominator changed');
  same(matrix.units.map((row) => row.unit_ordinal), Array.from({ length: 17 }, (_, index) => index + 1), 'member order changed');
  same(matrix.units.map((row) => row.unit_id), Array.from({ length: 17 }, (_, index) => `ACES-MEMBER-${String(index + 1).padStart(2, '0')}`), 'member id order changed');
  ok(new Set(matrix.units.map((row) => row.canonical_name)).size === 17, 'duplicate member name');
  ok(new Set(matrix.units.map((row) => row.profile_url)).size === 17, 'duplicate member profile');
  ok(matrix.units.every((row) => row.identity_state === 'published_member_row' && row.term_end === '2026-08-30'), 'member identity or term state changed');
  ok(matrix.units.filter((row) => row.leadership_role === 'chair').length === 1, 'chair count changed');
  ok(matrix.units.filter((row) => row.leadership_role === 'vice_chair').length === 1, 'vice-chair count changed');
  ok(matrix.units.filter((row) => row.appointment_capacity === 'Special Government Employee').length === 3, 'special-government-employee count changed');
  ok(matrix.units[10].canonical_name === 'Jared Hautamaki' && matrix.units[10].affiliation === null, 'unaffiliated published row changed');
  ok(matrix.units[14].canonical_name === 'Danielle Piñeres', 'Unicode member identity changed');
  ok(matrix.source_anchors.roster_capture_path === ROSTER_CAPTURE_PATH && matrix.source_anchors.roster_capture_sha256 === ROSTER_CAPTURE_SHA256 && matrix.source_anchors.roster_capture_bytes === ROSTER_CAPTURE_BYTES, 'matrix roster custody changed');
  ok(matrix.source_anchors.published_roster_rows === 17 && matrix.source_anchors.public_meetings_held_at_parent_cutoff === 1 && matrix.source_anchors.canceled_public_meetings_at_parent_cutoff === 1 && matrix.source_anchors.published_subcommittees === 3, 'matrix source-anchor denominator changed');
  same(matrix.expansion_contract, {
    matrix_shape: 'cartesian_product_of_frozen_units_and_required_fields',
    unit_count: 17,
    required_fields_per_unit: 10,
    required_cells: 170,
    initial_cell_state: 'unclassified',
    all_cells_must_be_materialized: true,
    silent_unit_or_field_removal_or_insertion_allowed: false,
    affiliation_based_member_merger_allowed: false,
    unfilled_charter_slot_substitution_allowed: false,
    roster_membership_substitutes_for_attendance_or_participation: false,
    source_count_is_unit_denominator: false,
    outcome_based_unit_selection_allowed: false
  }, 'matrix expansion contract changed');
  same(matrix.current_counts, { materialized_cells: 0, terminal_cells: 0, terminal_members: 0, class_closed: false }, 'matrix pre-execution counts changed');
  for (const [key, field] of Object.entries(matrix.boundaries)) {
    if (key.endsWith('_effect')) ok(field === 'none', `matrix ${key} changed`);
    else ok(field === false, `matrix ${key} weakened`);
  }
}

function validateRoute(route, index) {
  ok(route.ordinal === index + 1, `${route.route_id}: ordinal changed`);
  ok(route.method === undefined, `${route.route_id}: undeclared method field introduced`);
  ok(route.maximum_attempts === 1 && route.timeout_ms === 45000, `${route.route_id}: bounded attempt contract changed`);
  ok(route.result_spawned_requests === 0, `${route.route_id}: result-spawned request introduced`);
  ok(route.candidate_rows_are_admitted_sources === false && route.evidence_admission_authorized === false, `${route.route_id}: evidence authority escalated`);
  if (route.route_type === 'exact_official_get') {
    ok(route.allowed_final_host_suffix === 'space.commerce.gov', `${route.route_id}: official host changed`);
    ok(route.maximum_body_bytes === 10485760 && route.maximum_candidate_rows === 0, `${route.route_id}: exact route limits changed`);
    ok(route.requested_url.startsWith('https://space.commerce.gov/'), `${route.route_id}: exact route left official host`);
  } else {
    ok(route.route_type === 'candidate_census_rss', `${route.route_id}: unknown route type`);
    ok(route.allowed_final_host_suffix === 'bing.com', `${route.route_id}: candidate host changed`);
    ok(route.maximum_body_bytes === 2097152 && route.maximum_candidate_rows === 10, `${route.route_id}: candidate route limits changed`);
    ok(route.requested_url.startsWith('https://www.bing.com/search?format=rss&q='), `${route.route_id}: candidate search endpoint changed`);
    ok(route.query?.includes('site:space.commerce.gov'), `${route.route_id}: site-bound query changed`);
  }
}

function validateManifest(root, manifest, expectedManifest) {
  exactKeys(manifest, [
    'schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'as_of', 'hash_mode',
    'scope_ordered', 'self_included', 'manifest_path', 'permanent_paths', 'entries',
    'combined_sha256', 'counts', 'boundaries'
  ], 'manifest');
  ok(manifest.schema_version === 'ssc-rd-wave03-rd05-member-participation-intake-product-manifest@1', 'manifest schema changed');
  ok(manifest.wave_id === 'SSC-RD-W03' && manifest.lane_id === 'RD-05' && manifest.class_id === 'RD-05-C02' && manifest.issue === 1018, 'manifest identity changed');
  ok(manifest.hash_mode === 'sha256_exact_bytes' && manifest.scope_ordered === true && manifest.self_included === false, 'manifest hash contract changed');
  ok(manifest.manifest_path === MANIFEST_PATH, 'manifest path changed');
  same(manifest.permanent_paths, PERMANENT_PATHS, 'permanent path denominator changed');
  same(manifest.entries.map((row) => row.path), MANIFEST_INPUTS, 'manifest input order changed');
  ok(manifest.entries.length === 10 && manifest.permanent_paths.length === 11, 'manifest path counts changed');
  for (const row of manifest.entries) {
    const bytes = readBytes(root, row.path);
    ok(row.bytes === bytes.length, `${row.path}: manifest byte count changed`);
    ok(row.sha256 === sha256(bytes), `${row.path}: manifest digest changed`);
  }
  ok(manifest.counts.permanent_paths === 11 && manifest.counts.manifest_entries === 10 && manifest.counts.member_rows === 17 && manifest.counts.required_cells === 170 && manifest.counts.fixed_routes === 161, 'manifest counts changed');
  ok(manifest.counts.request_attempts === 0 && manifest.counts.terminal_cells === 0, 'manifest advanced execution state');
  for (const [key, field] of Object.entries(manifest.boundaries)) {
    if (key === 'graph_effect') ok(field === 'none', 'manifest graph effect changed');
    else ok(field === false, `manifest ${key} weakened`);
  }
  same(manifest, expectedManifest, 'manifest drifted from deterministic derivation');
}

export function validatePackageData(value, schema, manifest, matrix, expectedProtocol, expectedManifest, root = ROOT) {
  exactKeys(value, ROOT_KEYS, 'protocol');
  ok(value.schema_version === 'ssc-rd-wave03-rd05-member-participation-source-census-protocol@1', 'protocol schema changed');
  ok(value.wave_id === 'SSC-RD-W03' && value.lane_id === 'RD-05' && value.class_id === 'RD-05-C02' && value.issue === 1018, 'protocol identity changed');
  ok(value.as_of === '2026-08-05' && value.authority === 'fixed_source_availability_census_not_member_participation_or_class_receipt', 'protocol status or authority changed');
  validateMatrix(matrix);

  exactKeys(value.source_custody, [
    'constitution_merge', 'wave03_current_ledger_merge_at_design', 'parent_terminal_merge',
    'seed_path', 'seed_sha256', 'matrix_path', 'matrix_sha256', 'first_pass_path',
    'first_pass_sha256', 'authority_control_path', 'authority_control_sha256',
    'parent_class_receipt_path', 'parent_class_receipt_sha256',
    'parent_closure_reference_path', 'parent_closure_reference_sha256',
    'roster_capture_path', 'roster_capture_sha256', 'roster_capture_bytes',
    'intake_product_manifest_path'
  ], 'source custody');
  same(value.source_custody, {
    constitution_merge: CONSTITUTION_MERGE,
    wave03_current_ledger_merge_at_design: WAVE03_LEDGER_PROMOTION,
    parent_terminal_merge: PARENT_TERMINAL_MERGE,
    seed_path: SEED_PATH,
    seed_sha256: SEED_SHA256,
    matrix_path: MATRIX_PATH,
    matrix_sha256: MATRIX_SHA256,
    first_pass_path: FIRST_PASS_PATH,
    first_pass_sha256: FIRST_PASS_SHA256,
    authority_control_path: AUTHORITY_CONTROL_PATH,
    authority_control_sha256: AUTHORITY_CONTROL_SHA256,
    parent_class_receipt_path: PARENT_RECEIPT_PATH,
    parent_class_receipt_sha256: PARENT_RECEIPT_SHA256,
    parent_closure_reference_path: PARENT_CLOSURE_PATH,
    parent_closure_reference_sha256: PARENT_CLOSURE_SHA256,
    roster_capture_path: ROSTER_CAPTURE_PATH,
    roster_capture_sha256: ROSTER_CAPTURE_SHA256,
    roster_capture_bytes: ROSTER_CAPTURE_BYTES,
    intake_product_manifest_path: MANIFEST_PATH
  }, 'source custody changed');

  same(value.denominator, {
    published_member_rows: 17,
    required_fields_per_member: 10,
    required_cells: 170,
    shared_exact_official_routes: 8,
    member_profile_exact_official_routes: 17,
    candidate_query_classes_per_member: 8,
    candidate_census_routes: 136,
    fixed_routes: 161,
    maximum_candidate_rows: 1360,
    public_meetings_held_at_parent_cutoff: 1,
    canceled_public_meetings_at_parent_cutoff: 1,
    published_subcommittees: 3
  }, 'protocol denominator changed');
  ok(value.inherited_source_custody.wave02_terminal_state === 'bounded_non_link', 'parent terminal state changed');
  ok(value.inherited_source_custody.inherited_roster_is_identity_and_affiliation_custody_only === true, 'roster authority widened');
  ok(value.inherited_source_custody.inherited_agenda_or_subcommittee_surface_is_not_member_participation === true, 'agenda/subcommittee authority widened');
  ok(value.inherited_source_custody.inherited_sources_are_not_reopened_or_rewritten === true, 'parent custody reopened');

  same(value.query_specs, QUERY_SPECS.map((row) => ({ ...row })), 'query specification changed');
  ok(value.route_derivation.route_ledger_columns.length === 17, 'route ledger columns changed');
  ok(/^[0-9a-f]{64}$/.test(value.route_derivation.route_ledger_sha256) && value.route_derivation.route_ledger_bytes > 0, 'route ledger custody malformed');

  const routes = value.fixed_routes;
  ok(routes.length === 161, 'fixed route count changed');
  ok(new Set(routes.map((row) => row.route_id)).size === 161, 'duplicate route id');
  routes.forEach(validateRoute);
  ok(routes.slice(0, 8).every((row) => row.route_type === 'exact_official_get' && row.scope === 'shared_aces'), 'shared route prefix changed');
  for (let memberIndex = 0; memberIndex < 17; memberIndex += 1) {
    const member = matrix.units[memberIndex];
    const offset = 8 + memberIndex * 9;
    const group = routes.slice(offset, offset + 9);
    ok(group.length === 9, `${member.unit_id}: route group missing`);
    const profile = group[0];
    ok(profile.route_type === 'exact_official_get' && profile.query_class === 'profile' && profile.unit_id === member.unit_id && profile.requested_url === member.profile_url, `${member.unit_id}: profile route changed`);
    same(group.slice(1).map((row) => row.query_class), QUERY_SPECS.map((row) => row.query_class), `${member.unit_id}: query route order changed`);
    ok(group.every((row) => row.unit_ordinal === member.unit_ordinal && row.unit_id === member.unit_id && row.canonical_name === member.canonical_name), `${member.unit_id}: route/member join changed`);
  }
  ok(routes.filter((row) => row.route_type === 'exact_official_get').length === 25, 'exact official route count changed');
  ok(routes.filter((row) => row.route_type === 'candidate_census_rss').length === 136, 'candidate route count changed');

  same(value.execution_contract, {
    fixed_before_results: true,
    maximum_attempts_per_route: 1,
    timeout_ms: 45000,
    concurrency: 2,
    connection_header: 'close',
    raw_request_response_and_hash_custody_required: true,
    automatic_candidate_followup_authorized: false,
    automatic_second_pass_authorized: false,
    terminal_http_non_success_is_typed_not_fatal: true,
    transport_failure_is_typed_not_absence: true,
    result_spawned_requests: 0
  }, 'execution contract changed');
  ok(value.candidate_law.search_result_is_evidence === false, 'search result promoted to evidence');
  ok(value.candidate_law.official_domain_is_substantive_support === false && value.candidate_law.first_party_domain_is_substantive_support === false, 'domain promoted to substantive support');
  ok(value.candidate_law.lexical_member_match_is_identity_resolution === false && value.candidate_law.result_rank_is_authority === false, 'lexical or rank authority introduced');
  ok(value.candidate_law.member_profile_is_attendance_vote_dissent_access_or_authorship === false, 'member profile promoted to participation');
  ok(value.candidate_law.candidate_url_followup_requires_separate_frozen_successor === true && value.candidate_law.candidate_admission_requires_page_level_member_event_and_source_custody === true, 'candidate successor law weakened');

  ok(value.next_stage.terminal_product_authorized_now === false && value.next_stage.class_closure_authorized_now === false && value.next_stage.cumulative_ledger_promotion_authorized_now === false, 'terminal authority introduced');
  same(value.current_counts, {
    fixed_routes: 161,
    exact_official_routes: 25,
    candidate_census_routes: 136,
    request_attempts: 0,
    terminal_route_receipts: 0,
    candidate_rows: 0,
    admitted_evidence_sources: 0,
    materialized_cells: 0,
    terminal_cells: 0,
    terminal_members: 0,
    external_contacts: 0,
    external_reviews: 0
  }, 'current counts changed');
  for (const [key, field] of Object.entries(value.boundaries)) {
    if (key.endsWith('_effect')) ok(field === 'none', `${key} changed`);
    else ok(field === false, `${key} weakened`);
  }

  validateSchema(schema, value);
  validateManifest(root, manifest, expectedManifest);
  same(value, expectedProtocol, 'protocol drifted from deterministic derivation');
  return value;
}

export function validatePackage(root = ROOT) {
  const value = read(root, PROTOCOL_PATH);
  const schema = read(root, SCHEMA_PATH);
  const manifest = read(root, MANIFEST_PATH);
  const matrix = read(root, MATRIX_PATH);
  const expectedProtocol = deriveProtocol(root);
  const expectedManifest = deriveManifest(root);
  validatePackageData(value, schema, manifest, matrix, expectedProtocol, expectedManifest, root);
  console.log('validate-status-sovereignty-rd-wave03-rd05-member-participation-intake: 17 members, 170 cells, 161 fixed routes, acquisition not executed');
  return value;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    validatePackage(ROOT);
  } catch (error) {
    console.error(`validate-status-sovereignty-rd-wave03-rd05-member-participation-intake: ${error.message}`);
    process.exit(1);
  }
}
