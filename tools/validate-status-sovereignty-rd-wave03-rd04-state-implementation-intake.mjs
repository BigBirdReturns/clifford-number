#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
  SEED_PATH,
  MATRIX_PATH,
  PROTOCOL_PATH,
  MANIFEST_PATH,
  SCHEMA_PATH,
  PRODUCT_PATHS,
  CURRENT_MAIN_AT_DESIGN,
  CONSTITUTION_MERGE,
  WAVE03_LEDGER_PROMOTION,
  PARENT_TERMINAL_MERGE,
  BOUNDED_REMEDY_MERGE,
  QUERY_SPECS,
  deriveProtocol,
  deriveManifest
} from './build-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs';

export const FIRST_PASS_PATH = 'data/intake/status-sovereignty-f02-snap-gate-first-pass.json';
export const REMEDY_PATH = 'data/intake/status-sovereignty-rd04-snap-state-remedy.json';
export const PARENT_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave02-rd04-version-history/class-receipt.json';
export const PARENT_CLOSURE_PATH = 'data/project/ssc-residual-wave02/closures/RD-04-C01.json';

export const EXPECTED_BLOBS = Object.freeze({
  [SEED_PATH]: 'bf60cadae4d0f586646dd18366431614628adb1e',
  [MATRIX_PATH]: '5b2f094adbd860ac3e28161de0bfd00f67b2db8d',
  [FIRST_PASS_PATH]: 'e50b9b09c13b8cb6730194077ee5eed119cb1b7e',
  [REMEDY_PATH]: '4e4ef3d0e207f4eea1a3af7987dd2e040d254ebd',
  [PARENT_RECEIPT_PATH]: 'a91923019ceeba7050315a236a475bc18b78058f',
  [PARENT_CLOSURE_PATH]: '3371aa854d6522910748e96fcccfa069a800042e'
});

const EXPECTED_ROUTE_LEDGER_BYTES = 61068;
const EXPECTED_ROUTE_LEDGER_SHA256 = '7b8b6ac12ad73d9d3c0f65ea4fe672ca50e3bdfb24b6abdf6cccfbae9ea40eb6';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const exactKeys = (value, keys, message) => same(Object.keys(value).sort(), [...keys].sort(), message);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function gitBlobId(data) {
  const header = Buffer.from(`blob ${data.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(data).digest('hex');
}
function ensureClosedObject(schema, label, options = {}) {
  ok(schema?.type === 'object' && schema?.additionalProperties === false, `${label} is not schema-closed`);
  ok(Array.isArray(schema?.required), `${label}.required missing`);
  ok(schema?.properties && typeof schema.properties === 'object', `${label}.properties missing`);
  const propertyKeys = Object.keys(schema.properties);
  ok(schema.required.every((key) => propertyKeys.includes(key)), `${label} required key lacks a property`);
  if (options.allRequired ?? true) same([...schema.required].sort(), propertyKeys.sort(), `${label} required/property keys differ`);
}

export function validateSchemaContract(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd04-state-implementation-intake.schema.json', 'schema ID changed');
  ensureClosedObject(schema, 'schema');
  ok(schema.properties.schema_version?.const === 'ssc-rd-wave03-rd04-state-implementation-source-census-protocol@1', 'schema version contract changed');
  ok(schema.properties.authority?.const === 'fixed_source_availability_census_not_state_implementation_or_class_receipt', 'schema authority changed');

  for (const key of ['source_custody','denominator','inherited_source_custody','route_derivation','execution_contract','output_contract','current_result','authority_boundaries']) {
    ensureClosedObject(schema.properties[key], `schema.${key}`);
  }
  ensureClosedObject(schema.properties.query_specs?.items, 'schema.query_specs.items');
  ensureClosedObject(schema.properties.routes?.items, 'schema.routes.items', { allRequired: false });
  same(schema.properties.routes.items.required, [
    'route_id','route_type','scope','purpose','requested_url','allowed_final_host_suffix',
    'maximum_attempts','maximum_body_bytes','candidate_rows_are_admitted_sources','result_spawned_requests'
  ], 'schema.routes.items base required keys changed');

  const source = schema.properties.source_custody.properties;
  for (const [key, expected] of Object.entries({
    current_main_at_design: CURRENT_MAIN_AT_DESIGN,
    constitution_merge: CONSTITUTION_MERGE,
    wave03_current_ledger_merge_at_design: WAVE03_LEDGER_PROMOTION,
    bounded_remedy_merge: BOUNDED_REMEDY_MERGE,
    parent_terminal_merge: PARENT_TERMINAL_MERGE,
    seed_git_blob: EXPECTED_BLOBS[SEED_PATH],
    matrix_git_blob: EXPECTED_BLOBS[MATRIX_PATH],
    first_pass_git_blob: EXPECTED_BLOBS[FIRST_PASS_PATH],
    bounded_remedy_git_blob: EXPECTED_BLOBS[REMEDY_PATH],
    intake_product_manifest_path: MANIFEST_PATH
  })) ok(source[key]?.const === expected, `schema source custody ${key} changed`);

  const denominator = schema.properties.denominator.properties;
  for (const [key, expected] of Object.entries({
    state_rows: 50,
    district_of_columbia_rows: 0,
    territorial_rows: 0,
    required_fields_per_state: 9,
    required_cells: 450,
    shared_exact_official_routes: 4,
    state_exact_directory_routes: 50,
    candidate_query_classes_per_state: 3,
    candidate_census_routes: 150,
    fixed_routes: 204,
    maximum_candidate_rows: 1500
  })) ok(denominator[key]?.const === expected, `schema denominator ${key} changed`);

  ok(schema.properties.query_specs?.minItems === 3 && schema.properties.query_specs?.maxItems === 3, 'schema query-spec denominator changed');
  ok(schema.properties.routes?.minItems === 204 && schema.properties.routes?.maxItems === 204, 'schema route denominator changed');
  const route = schema.properties.routes.items.properties;
  ok(route.maximum_attempts?.const === 1, 'schema attempt ceiling changed');
  ok(route.maximum_candidate_rows?.const === 10, 'schema candidate-row ceiling changed');
  ok(route.candidate_rows_are_admitted_sources?.const === false, 'schema candidate admission changed');
  ok(route.result_spawned_requests?.const === 0, 'schema result-spawned requests changed');
  same(route.allowed_final_host_suffix?.enum, ['fns.usda.gov', 'bing.com'], 'schema route host boundary changed');

  for (const [key, expected] of Object.entries({
    maximum_attempts_per_route: 1,
    maximum_parallel_workers: 8,
    candidate_rows_are_admitted_sources: false,
    candidate_followup_without_separate_protocol: false,
    result_spawned_requests: 0,
    automatic_field_closure: false,
    automatic_class_closure: false
  })) ok(schema.properties.execution_contract.properties[key]?.const === expected, `schema execution ${key} changed`);
  ok(schema.properties.output_contract.properties.route_receipts?.const === 204, 'schema output receipt denominator changed');
  ok(schema.properties.current_result.properties.class_state?.const === 'still_open' && schema.properties.current_result.properties.class_closed?.const === false, 'schema class boundary changed');
  for (const key of ['unlawful_discrimination_finding','racial_hierarchy_finding','national_prevalence_finding','coordination_finding','common_purpose_finding','complete_compact_finding','reviewed_disposition_changed']) {
    ok(schema.properties.authority_boundaries.properties[key]?.const === false, `schema authority ${key} changed`);
  }
  for (const key of ['external_contacts','external_reviews']) {
    ok(schema.properties.authority_boundaries.properties[key]?.const === 0, `schema authority ${key} changed`);
  }
  for (const key of ['publication_effect','adoption_effect','graph_effect']) {
    ok(schema.properties.authority_boundaries.properties[key]?.const === 'none', `schema authority ${key} changed`);
  }
  return true;
}

export function validateImmutableSources(root = ROOT) {
  for (const [rel, expected] of Object.entries(EXPECTED_BLOBS)) {
    const data = fs.readFileSync(abs(root, rel));
    ok(gitBlobId(data) === expected, `${rel}: immutable Git blob changed`);
  }

  const firstPass = read(root, FIRST_PASS_PATH);
  ok(firstPass?.schema_version === 'status-sovereignty-institutional-gate-first-pass@1', 'first-pass schema changed');
  ok(firstPass?.lane_id === 'SSC-F02' && firstPass?.current_result?.terminal_state === 'requires_additional_acquisition', 'first-pass bounded state changed');
  ok(firstPass?.sources?.length === 7, 'first-pass source denominator changed');
  ok(firstPass?.current_result?.prevalence_finding === false, 'first-pass prevalence boundary changed');

  const remedy = read(root, REMEDY_PATH);
  ok(remedy?.execution_id === 'SSC-RD04-SNAP-01', 'bounded remedy identity changed');
  ok(remedy?.selection_contract?.declared_state_count === 50, 'bounded remedy state denominator changed');
  ok(remedy?.selection_audit?.states_deep_scored === 1 && remedy?.selection_audit?.selection_gate_complete === false, 'bounded remedy selection boundary changed');
  ok(remedy?.current_result?.national_prevalence_finding === false, 'bounded remedy prevalence boundary changed');

  const parentReceipt = read(root, PARENT_RECEIPT_PATH);
  ok(parentReceipt?.class_id === 'RD-04-C01' && parentReceipt?.class_closed === true, 'parent class receipt changed');
  ok(parentReceipt?.terminal_state === 'bounded_source_unavailable', 'parent terminal state changed');
  ok(parentReceipt?.counts?.exact_source_identities === 97, 'parent source-identity denominator changed');

  const parentClosure = read(root, PARENT_CLOSURE_PATH);
  ok(parentClosure?.class_id === 'RD-04-C01' && parentClosure?.class_closed === true, 'parent closure changed');
  ok(parentClosure?.source_pr === 804, 'parent closure PR custody changed');
  return true;
}

function validateAuthority(value) {
  exactKeys(value.current_result, [
    'protocol_frozen','requests_executed_by_this_object','candidate_urls_admitted',
    'field_matrix_terminal','class_state','class_closed','outside_human_dependency','project_blocking'
  ], 'current-result keys changed');
  const current = value.current_result;
  ok(current.protocol_frozen === true && current.requests_executed_by_this_object === false, 'protocol execution boundary changed');
  ok(current.candidate_urls_admitted === 0 && current.field_matrix_terminal === false, 'protocol result boundary changed');
  ok(current.class_state === 'still_open' && current.class_closed === false, 'class prematurely closed');
  ok(current.outside_human_dependency === false && current.project_blocking === false, 'human or blocking boundary changed');

  exactKeys(value.authority_boundaries, [
    'external_contacts','external_reviews','reviewed_disposition_changed',
    'unlawful_discrimination_finding','racial_hierarchy_finding','national_prevalence_finding',
    'coordination_finding','common_purpose_finding','complete_compact_finding',
    'publication_effect','adoption_effect','graph_effect'
  ], 'authority-boundary keys changed');
  const authority = value.authority_boundaries;
  for (const key of ['external_contacts', 'external_reviews']) ok(authority[key] === 0, `${key} changed`);
  for (const key of [
    'reviewed_disposition_changed','unlawful_discrimination_finding','racial_hierarchy_finding',
    'national_prevalence_finding','coordination_finding','common_purpose_finding','complete_compact_finding'
  ]) ok(authority[key] === false, `${key} changed`);
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) ok(authority[key] === 'none', `${key} changed`);
}

function validateRouteKeys(route) {
  const common = [
    'route_id','route_type','scope','purpose','requested_url','allowed_final_host_suffix',
    'maximum_attempts','maximum_body_bytes','candidate_rows_are_admitted_sources','result_spawned_requests'
  ];
  if (route.scope === 'shared_federal') {
    exactKeys(route, common, `${route.route_id}: shared route keys changed`);
    return;
  }
  const state = [...common, 'unit_ordinal','unit_id','postal_code','state_name','query_class'];
  if (route.route_type === 'candidate_census_rss') state.push('query', 'maximum_candidate_rows');
  exactKeys(route, state, `${route.route_id}: state route keys changed`);
}

export async function validateValue(value, root = ROOT) {
  validateImmutableSources(root);
  const derived = await deriveProtocol(root);
  same(value, derived, 'protocol differs from deterministic derivation');

  exactKeys(value, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','title','authority',
    'source_custody','denominator','inherited_source_custody','query_specs',
    'route_derivation','routes','execution_contract','output_contract','current_result',
    'authority_boundaries'
  ], 'protocol top-level keys changed');

  ok(value.schema_version === 'ssc-rd-wave03-rd04-state-implementation-source-census-protocol@1', 'protocol schema changed');
  ok(value.wave_id === 'SSC-RD-W03' && value.lane_id === 'RD-04' && value.class_id === 'RD-04-C02' && value.issue === 1017, 'protocol identity changed');
  ok(value.authority === 'fixed_source_availability_census_not_state_implementation_or_class_receipt', 'protocol authority changed');

  exactKeys(value.source_custody, [
    'current_main_at_design','constitution_merge','wave03_current_ledger_merge_at_design',
    'seed_path','seed_git_blob','matrix_path','matrix_git_blob','first_pass_path','first_pass_git_blob',
    'bounded_remedy_path','bounded_remedy_git_blob','bounded_remedy_merge',
    'parent_class_receipt_path','parent_closure_reference_path','parent_terminal_merge',
    'intake_product_manifest_path'
  ], 'source-custody keys changed');
  const custody = value.source_custody;
  ok(custody.current_main_at_design === CURRENT_MAIN_AT_DESIGN, 'current-main design custody changed');
  ok(custody.constitution_merge === CONSTITUTION_MERGE, 'constitution custody changed');
  ok(custody.wave03_current_ledger_merge_at_design === WAVE03_LEDGER_PROMOTION, 'Wave-03 current-ledger custody changed');
  ok(custody.parent_terminal_merge === PARENT_TERMINAL_MERGE, 'parent terminal merge changed');
  ok(custody.bounded_remedy_merge === BOUNDED_REMEDY_MERGE, 'bounded remedy merge changed');
  ok(custody.seed_git_blob === EXPECTED_BLOBS[SEED_PATH] && custody.matrix_git_blob === EXPECTED_BLOBS[MATRIX_PATH], 'seed or matrix blob custody changed');
  ok(custody.first_pass_git_blob === EXPECTED_BLOBS[FIRST_PASS_PATH] && custody.bounded_remedy_git_blob === EXPECTED_BLOBS[REMEDY_PATH], 'inherited source blob custody changed');
  ok(custody.intake_product_manifest_path === MANIFEST_PATH, 'product manifest path changed');

  same(value.denominator, {
    state_rows: 50,
    district_of_columbia_rows: 0,
    territorial_rows: 0,
    required_fields_per_state: 9,
    required_cells: 450,
    shared_exact_official_routes: 4,
    state_exact_directory_routes: 50,
    candidate_query_classes_per_state: 3,
    candidate_census_routes: 150,
    fixed_routes: 204,
    maximum_candidate_rows: 1500
  }, 'protocol denominator changed');

  same(value.inherited_source_custody, {
    federal_first_pass_source_identities: 7,
    bounded_california_source_identities: 6,
    wave02_exact_source_identities: 97,
    inherited_sources_are_not_current_state_practice: true,
    inherited_sources_are_not_reopened_or_rewritten: true,
    california_deep_dive_is_not_highest_coverage_state_finding: true
  }, 'inherited source custody changed');

  same(value.query_specs, QUERY_SPECS, 'query specs changed');
  ok(value.routes.length === 204, '204 routes required');
  ok(new Set(value.routes.map((row) => row.route_id)).size === 204, 'route IDs must be unique');
  value.routes.forEach(validateRouteKeys);
  same(value.routes.slice(0, 4).map((row) => row.route_id), [
    'RD04-W03-FED-STATE-DIRECTORY','RD04-W03-FED-STATE-OPTIONS',
    'RD04-W03-FED-FITNESS-WORK','RD04-W03-FED-WORK-REQUIREMENTS'
  ], 'shared route order changed');
  ok(value.routes.slice(0, 4).every((row) => row.scope === 'shared_federal' && row.route_type === 'exact_official_get'), 'shared route type changed');

  const matrix = read(root, MATRIX_PATH);
  const stateRoutes = value.routes.slice(4);
  ok(stateRoutes.length === 200, '200 state routes required');
  for (let ordinal = 1; ordinal <= 50; ordinal += 1) {
    const unit = matrix.units[ordinal - 1];
    const rows = stateRoutes.slice((ordinal - 1) * 4, ordinal * 4);
    ok(rows.length === 4, `${ordinal}: four routes required`);
    ok(rows.every((row) => row.unit_ordinal === ordinal && row.unit_id === unit.unit_id && row.postal_code === unit.postal_code && row.state_name === unit.state_name), `${ordinal}: route unit custody changed`);
    same(rows.map((row) => row.query_class), ['directory', 'implementation', 'waiver', 'screening'], `${ordinal}: route class order changed`);
    ok(rows[0].route_type === 'exact_official_get' && rows[0].allowed_final_host_suffix === 'fns.usda.gov', `${ordinal}: directory route boundary changed`);
    ok(rows.slice(1).every((row) => row.route_type === 'candidate_census_rss' && row.allowed_final_host_suffix === 'bing.com'), `${ordinal}: candidate route boundary changed`);
  }

  const candidateRoutes = value.routes.filter((row) => row.route_type === 'candidate_census_rss');
  const exactRoutes = value.routes.filter((row) => row.route_type === 'exact_official_get');
  ok(candidateRoutes.length === 150 && exactRoutes.length === 54, 'route class counts changed');
  ok(value.routes.every((row) => row.maximum_attempts === 1), 'route attempt ceiling changed');
  ok(value.routes.every((row) => row.candidate_rows_are_admitted_sources === false), 'candidate source admission changed');
  ok(value.routes.every((row) => row.result_spawned_requests === 0), 'result-spawned request count changed');
  ok(candidateRoutes.every((row) => row.maximum_candidate_rows === 10), 'candidate row ceiling changed');
  ok(exactRoutes.every((row) => row.requested_url.startsWith('https://') && row.allowed_final_host_suffix === 'fns.usda.gov'), 'exact route host boundary changed');
  ok(candidateRoutes.every((row) => row.requested_url.startsWith('https://www.bing.com/search?format=rss&q=')), 'candidate route base changed');

  exactKeys(value.route_derivation, [
    'shared_route_order','unit_order','per_state_route_order','state_directory_url_template',
    'candidate_query_template','candidate_search_base_url','url_encoding','route_ledger_columns',
    'route_ledger_bytes','route_ledger_sha256','route_ids_unique','result_spawned_requests'
  ], 'route-derivation keys changed');
  ok(value.route_derivation.route_ledger_bytes === EXPECTED_ROUTE_LEDGER_BYTES, 'route ledger bytes changed');
  ok(value.route_derivation.route_ledger_sha256 === EXPECTED_ROUTE_LEDGER_SHA256, 'route ledger SHA changed');
  ok(value.route_derivation.route_ids_unique === true && value.route_derivation.result_spawned_requests === 0, 'route derivation boundary changed');

  same(value.execution_contract, {
    maximum_attempts_per_route: 1,
    maximum_parallel_workers: 8,
    user_agent: 'clifford-number-rd04-wave03-source-census/1.0',
    exact_route_http_failure_is_typed_transport_state: true,
    candidate_rows_are_admitted_sources: false,
    candidate_followup_without_separate_protocol: false,
    result_spawned_requests: 0,
    federal_rule_is_state_implementation: false,
    waiver_authority_is_requested_approved_or_current_waiver: false,
    exemption_authority_is_observed_use: false,
    screening_rule_is_uniform_staff_practice: false,
    missing_state_record_is_no_policy_or_practice: false,
    automatic_field_closure: false,
    automatic_class_closure: false
  }, 'execution contract changed');

  same(value.output_contract, {
    route_receipts: 204,
    exact_request_query_and_url_required: true,
    headers_body_stderr_and_transport_metadata_required: true,
    candidate_index_required: true,
    route_result_index_required: true,
    execution_receipt_required: true,
    artifact_manifest_required: true,
    candidate_admission_requires_separate_adjudication: true
  }, 'output contract changed');
  validateAuthority(value);
  return true;
}

export function validateManifest(manifest, root = ROOT) {
  same(manifest, deriveManifest(root), 'intake product manifest differs from exact permanent files');
  ok(manifest.schema_version === 'ssc-rd-wave03-rd04-state-implementation-intake-manifest@1', 'manifest schema changed');
  ok(manifest.entry_count === 10, 'manifest entry denominator changed');
  same(manifest.entries.map((row) => row.path), [...PRODUCT_PATHS], 'manifest path order changed');
  ok(new Set(manifest.entries.map((row) => row.path)).size === 10, 'manifest paths must be unique');
  ok(manifest.entries.every((row) => Number.isInteger(row.bytes) && row.bytes > 0 && /^[0-9a-f]{64}$/.test(row.sha256)), 'manifest row format changed');
  ok(!manifest.entries.some((row) => /(^|\/)(transport|tmp)(\/|$)|trigger|carrier|materializer/i.test(row.path)), 'temporary transport path entered manifest');
  return true;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function isGitRepository(root) {
  return fs.existsSync(path.join(root, '.git'));
}

export async function validateBundle(bundle, root = ROOT, options = {}) {
  validateSchemaContract(bundle.schema);
  await validateValue(bundle.protocol, root);
  validateManifest(bundle.manifest, root);

  const workflow = fs.readFileSync(abs(root, PRODUCT_PATHS[0]), 'utf8');
  ok(workflow.includes('permissions:\n  contents: read'), 'standing workflow is not read-only');
  ok(!workflow.includes('contents: write') && !workflow.includes('pull-requests: write'), 'standing workflow gained write permission');
  ok(!/^\s*schedule:/m.test(workflow), 'standing workflow gained a schedule');
  ok(workflow.includes("startsWith(github.head_ref, 'agent/ssc-rd-wave03-rd04-source-census-trigger-')"), 'capture trigger boundary changed');

  const useGit = options.git ?? isGitRepository(root);
  if (useGit) {
    for (const ancestor of [CURRENT_MAIN_AT_DESIGN, CONSTITUTION_MERGE, WAVE03_LEDGER_PROMOTION, PARENT_TERMINAL_MERGE, BOUNDED_REMEDY_MERGE]) {
      execFileSync('git', ['merge-base', '--is-ancestor', ancestor, 'HEAD'], { cwd: root, stdio: 'ignore' });
    }
    for (const [rel, expected] of Object.entries(EXPECTED_BLOBS)) {
      ok(git(root, ['rev-parse', `HEAD:${rel}`]) === expected, `${rel}: HEAD Git blob changed`);
    }
    let comparisonRef = CURRENT_MAIN_AT_DESIGN;
    try {
      git(root, ['rev-parse', '--verify', 'origin/main']);
      execFileSync('git', ['merge-base', '--is-ancestor', CURRENT_MAIN_AT_DESIGN, 'origin/main'], { cwd: root, stdio: 'ignore' });
      comparisonRef = 'origin/main';
    } catch {
      comparisonRef = CURRENT_MAIN_AT_DESIGN;
    }
    const changed = git(root, ['diff', '--name-only', `${comparisonRef}...HEAD`]).split('\n').filter(Boolean);
    ok(changed.length === 11, `permanent path denominator ${changed.length}/11`);
    const expected = [...PRODUCT_PATHS, MANIFEST_PATH].sort();
    same(changed.sort(), expected, 'permanent path set changed');
  }
  return true;
}

export async function validateRepository(root = ROOT) {
  return validateBundle({
    protocol: read(root, PROTOCOL_PATH),
    schema: read(root, SCHEMA_PATH),
    manifest: read(root, MANIFEST_PATH)
  }, root);
}

async function run() {
  await validateRepository(ROOT);
  console.log('RD-04 Wave-03 intake validated: 50 states / 450 cells / 204 fixed routes / 10 exact manifest entries; class open');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await run();
}
