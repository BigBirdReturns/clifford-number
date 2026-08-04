#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROTOCOL_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-protocol.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-search-census.schema.json';
export const MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/field-matrix-contract.json';
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-02-C05.json';
export const CURRENT_LEDGER_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current.json';

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const unique = (values, message) => ok(new Set(values).size === values.length, message);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const QUERY_SPECS = [
  {
    query_class: 'portfolio',
    order: 1,
    terms: '(portfolio OR investment OR invested OR backing OR backed OR follow-on OR "follow on")'
  },
  {
    query_class: 'disposition',
    order: 2,
    terms: '(exit OR exited OR acquisition OR acquired OR IPO OR write-off OR writeoff OR default OR cure OR loss)'
  },
  {
    query_class: 'recovery',
    order: 3,
    terms: '(return OR distribution OR repayment OR repaid OR debenture OR leverage OR SBA OR recovery)'
  }
];

export const EXPECTED_LEGAL_VEHICLES = [
  'Moonshots Capital Fund 3 SBIC, LP',
  'Acequia Capital Origin SBIC, LP',
  'First Spark Seed II, LP',
  'New North Ventures Fund II SBIC, LP',
  'BY Capital 3 (US), LP',
  'AE Ventures Fund III, LP',
  'Michigan Capital Network Venture Fund V, LP',
  'Dauntless Ventures SBIC-A, LP',
  'Dauntless Ventures SBIC-B, LP',
  'Snowpoint Ventures II - S&T, LP',
  'Ridgeline Ventures Fund II-S, LP',
  'Frontier Fund I Alpha, LP',
  'BIP III SBIC, LP',
  'One Bow River National Defense Fund, LP',
  'Stifel North Atlantic AM-Forward, LP',
  'Rochefort Ventures, LP',
  'BBK Ventures Fund I, LP'
];

export const EXPECTED_REQUIRED_FIELDS = [
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
];

const EXPECTED_SOURCE_CUSTODY = {
  constitution_merge: 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2',
  wave03_current_ledger_merge: '150f1693c70ce3699428c58c2687851a1ced39f7',
  protocol_publication_base: '830de50e3f14c5ef9787d2740847d1a80899663b',
  design_head: '431f94963c369f982d262e96ed378806862539aa',
  seed_path: SEED_PATH,
  seed_git_blob: '33571d5278b0defed45d2537b325a67d71ca57e3',
  matrix_path: MATRIX_PATH,
  matrix_git_blob: 'a042514e71920ab8549d8b5ebfe1f78e59b679dc',
  parent_terminal_matrix_path: 'data/research/status-sovereignty-rd-wave02-rd02-license-leverage/terminal-field-matrix.json',
  parent_class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd02-license-leverage/class-receipt.json',
  parent_closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-02-C04.json'
};

const EXPECTED_DENOMINATOR = {
  cohort_rows: 18,
  publicly_named_rows: 17,
  identity_withheld_rows: 1,
  required_fields_per_row: 10,
  required_cells: 180,
  query_classes: 3,
  fixed_routes: 51,
  withheld_row_routes: 0
};

const EXPECTED_ROUTE_COLUMNS = [
  'route_id',
  'unit_ordinal',
  'query_class',
  'legal_vehicle',
  'query',
  'url',
  'maximum_attempts',
  'maximum_body_bytes',
  'candidate_rows_are_admitted_sources',
  'result_spawned_requests'
];

const EXPECTED_EXECUTION = {
  maximum_attempts_per_route: 1,
  maximum_body_bytes: 2097152,
  maximum_parallel_workers: 6,
  user_agent: 'clifford-number-evidence-capture/1.0',
  candidate_rows_are_admitted_sources: false,
  candidate_followup_without_separate_protocol: false,
  result_spawned_requests: 0,
  search_silence_is_event_absence: false,
  search_result_is_lifecycle_event: false,
  automatic_class_closure: false
};

const EXPECTED_WITHHELD = {
  unit_ordinal: 18,
  identity_state: 'identity_withheld_under_policy',
  network_routes: 0,
  identity_guessing: false,
  manager_substitution: false,
  lifecycle_inference: false
};

const EXPECTED_OUTPUT = {
  route_receipts: 51,
  exact_request_query_and_url_required: true,
  headers_body_and_transport_metadata_required: true,
  candidate_index_required: true,
  route_result_index_required: true,
  execution_receipt_required: true,
  manifest_required: true,
  candidate_admission_requires_separate_followup_receipt: true
};

const EXPECTED_CURRENT = {
  protocol_frozen: true,
  requests_executed_by_this_object: false,
  candidate_urls_admitted: 0,
  field_matrix_terminal: false,
  class_state: 'still_open',
  class_closed: false,
  outside_human_dependency: false,
  project_blocking: false
};

const EXPECTED_AUTHORITY = {
  external_contacts: 0,
  external_reviews: 0,
  reviewed_disposition_changed: false,
  capital_conversion_finding: false,
  favoritism_finding: false,
  extraction_finding: false,
  coordination_finding: false,
  common_purpose_finding: false,
  complete_compact_finding: false,
  racial_order_finding: false,
  prevalence_finding: false,
  publication_effect: 'none',
  adoption_effect: 'none',
  graph_effect: 'none'
};

export function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function deriveRoutes(matrix, protocol) {
  const named = matrix.units.filter((unit) => unit.identity_state === 'publicly_named');
  const routes = [];
  for (const unit of named) {
    for (const spec of protocol.query_specs) {
      const query = `"${unit.legal_vehicle}" ${spec.terms}`;
      routes.push({
        route_id: `RD02-W03-R${String(unit.unit_ordinal).padStart(2, '0')}-${spec.query_class.toUpperCase()}`,
        unit_ordinal: unit.unit_ordinal,
        query_class: spec.query_class,
        legal_vehicle: unit.legal_vehicle,
        query,
        url: `${protocol.route_derivation.search_base_url}${encodeRfc3986(query)}`,
        maximum_attempts: protocol.execution_contract.maximum_attempts_per_route,
        maximum_body_bytes: protocol.execution_contract.maximum_body_bytes,
        candidate_rows_are_admitted_sources: protocol.execution_contract.candidate_rows_are_admitted_sources,
        result_spawned_requests: protocol.execution_contract.result_spawned_requests
      });
    }
  }
  return routes;
}

export function renderRouteLedger(routes, protocol) {
  const columns = protocol.route_derivation.route_ledger_columns;
  const rows = [columns.join('\t')];
  for (const route of routes) {
    rows.push(columns.map((column) => String(route[column])).join('\t'));
  }
  return `${rows.join('\n')}\n`;
}

function validateSchemaSurface(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd-wave03-rd02-search-census-protocol@1', 'schema protocol identity changed');
  ok(schema?.properties?.issue?.const === 1015, 'schema issue changed');
  ok(schema?.properties?.denominator?.properties?.fixed_routes?.const === 51, 'schema route denominator changed');
  ok(schema?.properties?.denominator?.properties?.withheld_row_routes?.const === 0, 'schema withheld route boundary changed');
  ok(schema?.properties?.route_derivation?.properties?.route_ledger_bytes?.const === 22033, 'schema route ledger bytes changed');
  ok(schema?.properties?.route_derivation?.properties?.route_ledger_sha256?.const === 'ea33c69fca431afafc7450b96eeaa4f5a994f57be87eb19f7e14f6f41439e41b', 'schema route ledger digest changed');
  ok(schema?.properties?.execution_contract?.properties?.automatic_class_closure?.const === false, 'schema pre-authorized class closure');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === false, 'schema current class state changed');
  ok(schema?.properties?.authority_boundaries?.properties?.graph_effect?.const === 'none', 'schema graph effect changed');
}

function validateSeed(seed) {
  ok(seed?.schema_version === 'ssc-residual-denominator-wave03-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_id === 'SSC-RD-W03' && seed?.child_issue === 1015 && seed?.class_id === 'RD-02-C05', 'seed identity changed');
  ok(seed?.status === 'wave03_lane_seed_bound_ready_for_fixed_protocol_design', 'seed status changed');
  ok(seed?.class_state === 'still_open' && seed?.class_closed === false, 'seed prematurely closed');
  ok(seed?.parent_custody?.cumulative_promotion_merge === '2af6bb7819a37e51c7198fb48da894445a29e494', 'seed Wave-02 custody changed');
  ok(seed?.parent_custody?.canonical_residual_classes === 42, 'seed canonical denominator changed');
  ok(seed?.parent_custody?.closed_residual_classes === 6 && seed?.parent_custody?.open_residual_classes === 36, 'seed launch accounting changed');
  ok(seed?.closure_target === 'complete portfolio investment, follow-on, exit, write-off, default, return, and repayment ledger', 'seed closure target changed');
  ok(seed?.denominator_contract?.unit_count === 18, 'seed unit denominator changed');
  ok(seed?.denominator_contract?.publicly_named_units === 17 && seed?.denominator_contract?.identity_withheld_units === 1, 'seed identity denominator changed');
  ok(seed?.denominator_contract?.withheld_row_replacement_or_inference_allowed === false, 'seed withheld boundary weakened');
  ok(seed?.authority?.outside_human_dependency === false && seed?.authority?.external_contacts === 0 && seed?.authority?.external_reviews === 0, 'seed human dependency introduced');
  ok(seed?.authority?.publication_effect === 'none' && seed?.authority?.adoption_effect === 'none' && seed?.authority?.graph_effect === 'none', 'seed authority escalated');
}

function validateMatrix(matrix) {
  ok(matrix?.schema_version === 'ssc-rd-wave03-rd02-portfolio-lifecycle-field-matrix-contract@1', 'matrix schema changed');
  ok(matrix?.wave_id === 'SSC-RD-W03' && matrix?.lane_id === 'RD-02' && matrix?.class_id === 'RD-02-C05' && matrix?.issue === 1015, 'matrix identity changed');
  ok(matrix?.constitution_head === 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2', 'matrix constitution changed');
  ok(matrix?.status === 'unit_and_field_contract_frozen_acquisition_not_executed', 'matrix status changed');
  ok(Array.isArray(matrix?.units) && matrix.units.length === 18, 'matrix requires eighteen units');
  unique(matrix.units.map((unit) => unit.unit_id), 'duplicate matrix unit id');
  unique(matrix.units.map((unit) => unit.unit_ordinal), 'duplicate matrix unit ordinal');
  matrix.units.forEach((unit, index) => {
    const ordinal = index + 1;
    ok(unit?.unit_ordinal === ordinal, `matrix unit ${ordinal}: order changed`);
    ok(unit?.unit_id === `SBICCT-FIRST-COHORT-${String(ordinal).padStart(2, '0')}`, `matrix unit ${ordinal}: id changed`);
    if (ordinal <= 17) {
      ok(unit?.legal_vehicle === EXPECTED_LEGAL_VEHICLES[index], `matrix unit ${ordinal}: legal vehicle changed`);
      ok(unit?.identity_state === 'publicly_named', `matrix unit ${ordinal}: identity state changed`);
      ok(!Object.hasOwn(unit, 'withheld_state_label'), `matrix unit ${ordinal}: invented withheld label`);
    } else {
      ok(unit?.legal_vehicle === null, 'withheld unit legal vehicle exposed or invented');
      ok(unit?.withheld_state_label === 'withheld under SBA policy', 'withheld state label changed');
      ok(unit?.identity_state === 'identity_withheld_under_policy', 'withheld identity state changed');
    }
  });
  ok(same(matrix?.required_fields, EXPECTED_REQUIRED_FIELDS), 'matrix required fields changed');
  ok(matrix?.expansion_contract?.matrix_shape === 'cartesian_product_of_frozen_units_and_required_fields', 'matrix shape changed');
  ok(matrix?.expansion_contract?.unit_count === 18 && matrix?.expansion_contract?.required_fields_per_unit === 10 && matrix?.expansion_contract?.required_cells === 180, 'matrix cell denominator changed');
  ok(matrix?.expansion_contract?.publicly_named_units === 17 && matrix?.expansion_contract?.identity_withheld_units === 1, 'matrix identity denominator changed');
  for (const key of [
    'silent_unit_or_field_removal_allowed',
    'withheld_identity_guessing_or_replacement_allowed',
    'padding_rows_allowed',
    'source_count_is_unit_denominator',
    'outcome_based_unit_selection_allowed'
  ]) ok(matrix?.expansion_contract?.[key] === false, `matrix ${key} weakened`);
  ok(matrix?.current_counts?.materialized_cells === 0 && matrix?.current_counts?.terminal_cells === 0 && matrix?.current_counts?.terminal_units === 0 && matrix?.current_counts?.class_closed === false, 'matrix acquisition state promoted');
  for (const [key, value] of Object.entries(matrix?.boundaries || {})) {
    if (key.endsWith('_effect')) ok(value === 'none', `matrix ${key} changed`);
    else ok(value === false, `matrix ${key} weakened`);
  }
}

export function validateProtocolData(protocol, schema, matrix, seed) {
  validateSchemaSurface(schema);
  validateSeed(seed);
  validateMatrix(matrix);

  ok(protocol?.schema_version === 'ssc-rd-wave03-rd02-search-census-protocol@1', 'protocol schema changed');
  ok(protocol?.wave_id === 'SSC-RD-W03' && protocol?.lane_id === 'RD-02' && protocol?.class_id === 'RD-02-C05' && protocol?.issue === 1015, 'protocol identity changed');
  ok(protocol?.as_of === '2026-08-04', 'protocol date changed');
  ok(protocol?.authority === 'fixed_search_census_protocol_not_empirical_receipt', 'protocol authority escalated');
  ok(same(protocol?.source_custody, EXPECTED_SOURCE_CUSTODY), 'protocol source custody changed');
  ok(same(protocol?.denominator, EXPECTED_DENOMINATOR), 'protocol denominator changed');
  ok(same(protocol?.query_specs, QUERY_SPECS), 'protocol query specification changed');

  const derivation = protocol.route_derivation;
  ok(derivation?.unit_order === 'matrix.units ascending unit_ordinal', 'route unit order changed');
  ok(same(derivation?.query_class_order, ['portfolio', 'disposition', 'recovery']), 'route query order changed');
  ok(derivation?.route_id_template === 'RD02-W03-R{unit_ordinal_2_digit}-{QUERY_CLASS_UPPER}', 'route id template changed');
  ok(derivation?.query_template === '"{legal_vehicle}" {terms}', 'query template changed');
  ok(derivation?.search_base_url === 'https://www.bing.com/search?format=rss&q=', 'search base URL changed');
  ok(derivation?.url_encoding === 'RFC3986 percent encoding with no additional safe characters', 'URL encoding changed');
  ok(same(derivation?.route_ledger_columns, EXPECTED_ROUTE_COLUMNS), 'route ledger columns changed');
  ok(derivation?.route_ledger_bytes === 22033, 'route ledger byte count changed');
  ok(derivation?.route_ledger_sha256 === 'ea33c69fca431afafc7450b96eeaa4f5a994f57be87eb19f7e14f6f41439e41b', 'route ledger digest changed');
  ok(derivation?.route_ids_unique === true && derivation?.result_spawned_requests === 0, 'route derivation boundary changed');

  ok(same(protocol?.execution_contract, EXPECTED_EXECUTION), 'execution contract changed');
  ok(same(protocol?.withheld_boundary, EXPECTED_WITHHELD), 'withheld boundary changed');
  ok(same(protocol?.output_contract, EXPECTED_OUTPUT), 'output contract changed');
  ok(same(protocol?.current_result, EXPECTED_CURRENT), 'protocol current result changed');
  ok(same(protocol?.authority_boundaries, EXPECTED_AUTHORITY), 'protocol authority boundary changed');

  const routes = deriveRoutes(matrix, protocol);
  ok(routes.length === 51, 'exactly fifty-one routes required');
  unique(routes.map((route) => route.route_id), 'duplicate route id');
  routes.forEach((route, index) => {
    const unitOrdinal = Math.floor(index / 3) + 1;
    const spec = QUERY_SPECS[index % 3];
    ok(route.unit_ordinal === unitOrdinal && route.unit_ordinal <= 17, `${route.route_id}: route unit changed`);
    ok(route.query_class === spec.query_class, `${route.route_id}: query class changed`);
    ok(route.legal_vehicle === EXPECTED_LEGAL_VEHICLES[unitOrdinal - 1], `${route.route_id}: legal vehicle changed`);
    ok(route.route_id === `RD02-W03-R${String(unitOrdinal).padStart(2, '0')}-${spec.query_class.toUpperCase()}`, `${route.route_id}: identity changed`);
    ok(route.query === `"${route.legal_vehicle}" ${spec.terms}`, `${route.route_id}: query changed`);
    ok(route.url === `https://www.bing.com/search?format=rss&q=${encodeRfc3986(route.query)}`, `${route.route_id}: URL changed`);
    ok(route.maximum_attempts === 1 && route.maximum_body_bytes === 2097152, `${route.route_id}: execution ceiling changed`);
    ok(route.candidate_rows_are_admitted_sources === false && route.result_spawned_requests === 0, `${route.route_id}: candidate boundary changed`);
  });
  ok(routes.every((route) => route.unit_ordinal !== 18), 'withheld row received a route');

  const ledger = renderRouteLedger(routes, protocol);
  ok(Buffer.byteLength(ledger, 'utf8') === 22033, 'derived route ledger byte count mismatch');
  ok(sha256(ledger) === 'ea33c69fca431afafc7450b96eeaa4f5a994f57be87eb19f7e14f6f41439e41b', 'derived route ledger SHA-256 mismatch');
  return { protocol, schema, matrix, seed, routes, ledger };
}

function validateRepositoryBindings(root, bundle) {
  for (const rel of [
    bundle.protocol.source_custody.parent_terminal_matrix_path,
    bundle.protocol.source_custody.parent_class_receipt_path,
    bundle.protocol.source_custody.parent_closure_reference_path,
    CURRENT_LEDGER_PATH
  ]) ok(fs.existsSync(path.join(root, rel)), `repository binding missing: ${rel}`);

  const parentReceipt = read(root, bundle.protocol.source_custody.parent_class_receipt_path);
  ok(parentReceipt?.class_id === 'RD-02-C04' && parentReceipt?.class_closed === true, 'parent RD-02 closure receipt changed');
  const parentClosure = read(root, bundle.protocol.source_custody.parent_closure_reference_path);
  ok(parentClosure?.class_id === 'RD-02-C04' && parentClosure?.class_closed === true, 'parent RD-02 closure reference changed');
  const current = read(root, CURRENT_LEDGER_PATH);
  ok(current?.counts?.canonical_residual_classes === 42, 'current canonical denominator changed');
  ok(current?.counts?.closed_residual_classes === 7 && current?.counts?.open_residual_classes === 35, 'current cumulative accounting changed');
  ok(current?.current_result?.wave_complete === false, 'Wave 03 prematurely completed');

  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status === 0) {
    for (const [rel, expected] of [
      [SEED_PATH, bundle.protocol.source_custody.seed_git_blob],
      [MATRIX_PATH, bundle.protocol.source_custody.matrix_git_blob]
    ]) {
      const result = spawnSync('git', ['hash-object', rel], { cwd: root, encoding: 'utf8' });
      ok(result.status === 0 && result.stdout.trim() === expected, `${rel}: Git blob binding changed`);
    }
    for (const commit of [
      bundle.protocol.source_custody.constitution_merge,
      bundle.protocol.source_custody.wave03_current_ledger_merge,
      bundle.protocol.source_custody.protocol_publication_base
    ]) {
      const result = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: root });
      ok(result.status === 0, `${commit}: required ancestor missing`);
    }
  }
}

export function validateSearchCensusProtocol(root = ROOT) {
  const protocol = read(root, PROTOCOL_PATH);
  const schema = read(root, SCHEMA_PATH);
  const matrix = read(root, MATRIX_PATH);
  const seed = read(root, SEED_PATH);
  const bundle = validateProtocolData(protocol, schema, matrix, seed);
  validateRepositoryBindings(root, bundle);
  console.log('validate-status-sovereignty-rd-wave03-rd02-search-census: 18 rows, 51 fixed routes, withheld row unrouted, class still open');
  return bundle;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    validateSearchCensusProtocol();
  } catch (error) {
    console.error(`validate-status-sovereignty-rd-wave03-rd02-search-census: ${error.message}`);
    process.exit(1);
  }
}
