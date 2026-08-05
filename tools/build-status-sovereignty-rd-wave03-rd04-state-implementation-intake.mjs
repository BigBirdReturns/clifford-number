#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-04-C02.json';
export const MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-state-implementation/field-matrix-contract.json';
export const PROTOCOL_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-state-implementation/source-census-protocol.json';
export const MANIFEST_PATH = 'data/intake/status-sovereignty-rd-wave03-rd04-state-implementation/intake-product-manifest.json';
export const FIRST_PASS_PATH = 'data/intake/status-sovereignty-f02-snap-gate-first-pass.json';
export const REMEDY_PATH = 'data/intake/status-sovereignty-rd04-snap-state-remedy.json';
export const PARENT_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave02-rd04-version-history/class-receipt.json';
export const PARENT_CLOSURE_PATH = 'data/project/ssc-residual-wave02/closures/RD-04-C01.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd04-state-implementation-intake.schema.json';
export const TEST_PATH = 'test/status-sovereignty-rd-wave03-rd04-state-implementation-intake.test.js';
export const RUNNER_PATH = 'tools/acquisition/status-sovereignty-rd-wave03-rd04/run-source-census.py';
export const MILESTONE_PATH = 'docs/milestones/ssc-rd-wave03-rd04-state-implementation-intake.md';
export const WORKFLOW_PATH = '.github/workflows/status-sovereignty-rd-wave03-rd04-state-implementation-intake.yml';
export const BUILDER_PATH = 'tools/build-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs';
export const VALIDATOR_PATH = 'tools/validate-status-sovereignty-rd-wave03-rd04-state-implementation-intake.mjs';

export const CURRENT_MAIN_AT_DESIGN = '36b453139c2c5040f5df0148838ea232607b95d3';
export const CONSTITUTION_MERGE = 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2';
export const WAVE03_LEDGER_PROMOTION = '2374980372d98e7f9ca68fe373d25c9bb812c374';
export const PARENT_TERMINAL_MERGE = '7b21d1f2b0606a5550b9c26fadc0cb465ba88b7e';
export const BOUNDED_REMEDY_MERGE = '346e6881e68f85bbf204911b7915b4d5869efd2d';
export const PARENT_MANIFEST = 'b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b';

export const PRODUCT_PATHS = Object.freeze([
  WORKFLOW_PATH,
  MATRIX_PATH,
  PROTOCOL_PATH,
  SEED_PATH,
  MILESTONE_PATH,
  SCHEMA_PATH,
  TEST_PATH,
  RUNNER_PATH,
  BUILDER_PATH,
  VALIDATOR_PATH
]);
export const MANIFEST_INPUTS = PRODUCT_PATHS;

const SHARED_ROUTES = Object.freeze([
  {
    route_id: 'RD04-W03-FED-STATE-DIRECTORY',
    route_type: 'exact_official_get',
    scope: 'shared_federal',
    purpose: 'official fifty-state SNAP directory universe',
    requested_url: 'https://www.fns.usda.gov/snap/state-directory',
    allowed_final_host_suffix: 'fns.usda.gov',
    maximum_attempts: 1,
    maximum_body_bytes: 10485760,
    candidate_rows_are_admitted_sources: false,
    result_spawned_requests: 0
  },
  {
    route_id: 'RD04-W03-FED-STATE-OPTIONS',
    route_type: 'exact_official_get',
    scope: 'shared_federal',
    purpose: 'official state administration and policy-option universe',
    requested_url: 'https://www.fns.usda.gov/snap/waivers/state-options-report',
    allowed_final_host_suffix: 'fns.usda.gov',
    maximum_attempts: 1,
    maximum_body_bytes: 52428800,
    candidate_rows_are_admitted_sources: false,
    result_spawned_requests: 0
  },
  {
    route_id: 'RD04-W03-FED-FITNESS-WORK',
    route_type: 'exact_official_get',
    scope: 'shared_federal',
    purpose: 'official cross-state fitness-for-work screening study',
    requested_url: 'https://www.fns.usda.gov/research/snap/fitness-work',
    allowed_final_host_suffix: 'fns.usda.gov',
    maximum_attempts: 1,
    maximum_body_bytes: 10485760,
    candidate_rows_are_admitted_sources: false,
    result_spawned_requests: 0
  },
  {
    route_id: 'RD04-W03-FED-WORK-REQUIREMENTS',
    route_type: 'exact_official_get',
    scope: 'shared_federal',
    purpose: 'official current federal work-requirement and consequence surface',
    requested_url: 'https://www.fns.usda.gov/snap/work-requirements',
    allowed_final_host_suffix: 'fns.usda.gov',
    maximum_attempts: 1,
    maximum_body_bytes: 10485760,
    candidate_rows_are_admitted_sources: false,
    result_spawned_requests: 0
  }
]);

export const QUERY_SPECS = Object.freeze([
  {
    query_class: 'implementation',
    order: 1,
    terms: 'SNAP (manual OR policy OR eligibility OR "work requirements") site:.gov'
  },
  {
    query_class: 'waiver',
    order: 2,
    terms: 'SNAP (ABAWD OR waiver OR "work requirement") site:.gov'
  },
  {
    query_class: 'screening',
    order: 3,
    terms: 'SNAP ("discretionary exemption" OR "fitness for work" OR screening OR verification) site:.gov'
  }
]);

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function rfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}
function slug(value) {
  return value.toLowerCase().replaceAll(' ', '-');
}
function routeLine(row) {
  return [
    row.route_id,
    row.route_type,
    row.scope,
    row.unit_ordinal ?? '',
    row.postal_code ?? '',
    row.query_class ?? '',
    row.state_name ?? '',
    row.query ?? '',
    row.requested_url,
    row.allowed_final_host_suffix,
    row.maximum_attempts,
    row.maximum_body_bytes,
    String(row.candidate_rows_are_admitted_sources),
    row.result_spawned_requests
  ].join('\t') + '\n';
}

function validateInputs(seed, matrix) {
  ok(seed?.schema_version === 'ssc-residual-denominator-wave03-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_id === 'SSC-RD-W03' && seed?.child_issue === 1017, 'seed identity changed');
  ok(seed?.class_id === 'RD-04-C02' && seed?.class_state === 'still_open' && seed?.class_closed === false, 'seed class boundary changed');
  ok(seed?.denominator_contract?.unit_count === 50, 'seed state denominator changed');
  ok(seed?.denominator_contract?.district_of_columbia_included === false && seed?.denominator_contract?.territories_included === false, 'seed district/territory boundary changed');
  ok(seed?.authority?.outside_human_dependency === false && seed?.authority?.external_contacts === 0 && seed?.authority?.external_reviews === 0, 'seed human boundary changed');
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) ok(seed?.authority?.[key] === 'none', `seed ${key} changed`);

  ok(matrix?.schema_version === 'ssc-rd-wave03-rd04-state-implementation-field-matrix-contract@1', 'matrix schema changed');
  ok(matrix?.wave_id === 'SSC-RD-W03' && matrix?.lane_id === 'RD-04' && matrix?.class_id === 'RD-04-C02' && matrix?.issue === 1017, 'matrix identity changed');
  ok(Array.isArray(matrix?.units) && matrix.units.length === 50, 'matrix state denominator changed');
  ok(Array.isArray(matrix?.required_fields) && matrix.required_fields.length === 9, 'matrix field denominator changed');
  ok(matrix?.expansion_contract?.required_cells === 450, 'matrix cell denominator changed');
  ok(matrix?.current_counts?.materialized_cells === 0 && matrix?.current_counts?.terminal_cells === 0 && matrix?.current_counts?.class_closed === false, 'matrix pre-execution state changed');
  same(matrix.units.map((row) => row.unit_ordinal), Array.from({ length: 50 }, (_, index) => index + 1), 'state ordinal order changed');
  ok(new Set(matrix.units.map((row) => row.postal_code)).size === 50, 'state postal codes must be unique');
  ok(matrix.units.every((row) => row.unit_id === `US-STATE-${row.postal_code}`), 'state unit identity changed');
  ok(!matrix.units.some((row) => ['DC', 'PR', 'VI', 'GU', 'AS', 'MP'].includes(row.postal_code)), 'district or territory inserted');
}

export function deriveProtocol(root = ROOT) {
  const seed = read(root, SEED_PATH);
  const matrix = read(root, MATRIX_PATH);
  validateInputs(seed, matrix);

  const routes = SHARED_ROUTES.map((row) => ({ ...row }));
  for (const unit of matrix.units) {
    routes.push({
      route_id: `RD04-W03-${String(unit.unit_ordinal).padStart(2, '0')}-DIRECTORY`,
      route_type: 'exact_official_get',
      scope: 'state',
      unit_ordinal: unit.unit_ordinal,
      unit_id: unit.unit_id,
      postal_code: unit.postal_code,
      state_name: unit.state_name,
      query_class: 'directory',
      purpose: 'official FNS state directory entry and state-agency route',
      requested_url: `https://www.fns.usda.gov/snap-directory-entry/${slug(unit.state_name)}`,
      allowed_final_host_suffix: 'fns.usda.gov',
      maximum_attempts: 1,
      maximum_body_bytes: 10485760,
      candidate_rows_are_admitted_sources: false,
      result_spawned_requests: 0
    });
    for (const spec of QUERY_SPECS) {
      const query = `"${unit.state_name}" ${spec.terms}`;
      routes.push({
        route_id: `RD04-W03-${String(unit.unit_ordinal).padStart(2, '0')}-${spec.query_class.toUpperCase()}`,
        route_type: 'candidate_census_rss',
        scope: 'state',
        unit_ordinal: unit.unit_ordinal,
        unit_id: unit.unit_id,
        postal_code: unit.postal_code,
        state_name: unit.state_name,
        query_class: spec.query_class,
        purpose: `bounded ${spec.query_class} source discovery for the frozen state row`,
        query,
        requested_url: `https://www.bing.com/search?format=rss&q=${rfc3986(query)}`,
        allowed_final_host_suffix: 'bing.com',
        maximum_attempts: 1,
        maximum_body_bytes: 2097152,
        maximum_candidate_rows: 10,
        candidate_rows_are_admitted_sources: false,
        result_spawned_requests: 0
      });
    }
  }
  const ledger = routes.map(routeLine).join('');

  return {
    schema_version: 'ssc-rd-wave03-rd04-state-implementation-source-census-protocol@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    as_of: '2026-08-05',
    title: 'RD-04 Wave 03 fixed fifty-state implementation, waiver, exemption, and screening source census',
    authority: 'fixed_source_availability_census_not_state_implementation_or_class_receipt',
    source_custody: {
      current_main_at_design: CURRENT_MAIN_AT_DESIGN,
      constitution_merge: CONSTITUTION_MERGE,
      wave03_current_ledger_merge_at_design: WAVE03_LEDGER_PROMOTION,
      seed_path: SEED_PATH,
      seed_git_blob: 'bf60cadae4d0f586646dd18366431614628adb1e',
      matrix_path: MATRIX_PATH,
      matrix_git_blob: '5b2f094adbd860ac3e28161de0bfd00f67b2db8d',
      first_pass_path: FIRST_PASS_PATH,
      first_pass_git_blob: 'e50b9b09c13b8cb6730194077ee5eed119cb1b7e',
      bounded_remedy_path: REMEDY_PATH,
      bounded_remedy_git_blob: '4e4ef3d0e207f4eea1a3af7987dd2e040d254ebd',
      bounded_remedy_merge: BOUNDED_REMEDY_MERGE,
      parent_class_receipt_path: PARENT_RECEIPT_PATH,
      parent_closure_reference_path: PARENT_CLOSURE_PATH,
      parent_terminal_merge: PARENT_TERMINAL_MERGE,
      intake_product_manifest_path: MANIFEST_PATH
    },
    denominator: {
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
    },
    inherited_source_custody: {
      federal_first_pass_source_identities: 7,
      bounded_california_source_identities: 6,
      wave02_exact_source_identities: 97,
      inherited_sources_are_not_current_state_practice: true,
      inherited_sources_are_not_reopened_or_rewritten: true,
      california_deep_dive_is_not_highest_coverage_state_finding: true
    },
    query_specs: QUERY_SPECS.map((row) => ({ ...row })),
    route_derivation: {
      shared_route_order: SHARED_ROUTES.map((row) => row.route_id),
      unit_order: 'matrix.units ascending unit_ordinal',
      per_state_route_order: ['directory', 'implementation', 'waiver', 'screening'],
      state_directory_url_template: 'https://www.fns.usda.gov/snap-directory-entry/{state_name_lower_hyphen}',
      candidate_query_template: '"{state_name}" {terms}',
      candidate_search_base_url: 'https://www.bing.com/search?format=rss&q=',
      url_encoding: 'RFC3986 percent encoding with no additional safe characters',
      route_ledger_columns: [
        'route_id', 'route_type', 'scope', 'unit_ordinal', 'postal_code', 'query_class',
        'state_name', 'query', 'requested_url', 'allowed_final_host_suffix', 'maximum_attempts',
        'maximum_body_bytes', 'candidate_rows_are_admitted_sources', 'result_spawned_requests'
      ],
      route_ledger_bytes: Buffer.byteLength(ledger),
      route_ledger_sha256: sha256(ledger),
      route_ids_unique: true,
      result_spawned_requests: 0
    },
    routes,
    execution_contract: {
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
    },
    output_contract: {
      route_receipts: 204,
      exact_request_query_and_url_required: true,
      headers_body_stderr_and_transport_metadata_required: true,
      candidate_index_required: true,
      route_result_index_required: true,
      execution_receipt_required: true,
      artifact_manifest_required: true,
      candidate_admission_requires_separate_adjudication: true
    },
    current_result: {
      protocol_frozen: true,
      requests_executed_by_this_object: false,
      candidate_urls_admitted: 0,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false
    },
    authority_boundaries: {
      external_contacts: 0,
      external_reviews: 0,
      reviewed_disposition_changed: false,
      unlawful_discrimination_finding: false,
      racial_hierarchy_finding: false,
      national_prevalence_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      complete_compact_finding: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

export function deriveManifest(root = ROOT) {
  const entries = PRODUCT_PATHS.map((rel) => {
    const data = fs.readFileSync(abs(root, rel));
    return { path: rel, bytes: data.length, sha256: sha256(data) };
  });
  const combined = entries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\0`).join('');
  return {
    schema_version: 'ssc-rd-wave03-rd04-state-implementation-intake-manifest@1',
    entry_count: entries.length,
    combined_sha256: sha256(combined),
    entries,
    permanent_paths: 11,
    transport_or_trigger_paths: 0,
    standing_workflow_permissions: 'contents_read',
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  };
}

async function run() {
  const mode = process.argv[2] ?? '--check';
  const derived = await deriveProtocol(ROOT);
  if (mode === '--write') {
    write(ROOT, PROTOCOL_PATH, derived);
    write(ROOT, MANIFEST_PATH, deriveManifest(ROOT));
    console.log('RD-04 Wave-03 intake written: 50 states / 450 cells / 204 fixed routes / 10 manifest entries');
    return;
  }
  if (mode !== '--check') throw new Error(`unsupported mode: ${mode}`);
  same(read(ROOT, PROTOCOL_PATH), derived, 'committed RD-04 source census differs from deterministic derivation');
  same(read(ROOT, MANIFEST_PATH), deriveManifest(ROOT), 'committed RD-04 intake manifest differs from exact permanent files');
  console.log('RD-04 Wave-03 intake: 50 states / 450 cells / 204 routes frozen; 10-file manifest exact; class open');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await run();
}
