#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTRACT_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/field-matrix-contract.json';
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-02-C05.json';
export const PARENT_MATRIX_PATH = 'data/research/status-sovereignty-rd-wave02-rd02-license-leverage/terminal-field-matrix.json';
export const PARENT_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave02-rd02-license-leverage/class-receipt.json';
export const PACKAGE_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/fixed-protocol-package.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.schema.json';
export const CONTRACT_SHA256 = '933a16c6f945e2a7392e3919bbd6e238486fe45092350681a975f8a83a252dfc';
export const SEED_SHA256 = 'af1dfe80da4ac4d4e3c58a670636b89d39c35a440ebca79b6d5a9e3e8236b58e';

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const read = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const write = (root, rel, value) => { fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true }); fs.writeFileSync(abs(root, rel), encode(value)); };
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);

export const OFFICIAL_ROUTES = [
  ['OFFICIAL-001','official_first_cohort_release','https://www.defense.gov/News/Releases/Release/Article/4032999/department-of-defense-and-us-small-business-administration-publish-names-of-fir/'],
  ['OFFICIAL-002','official_first_cohort_pdf','https://www.cto.mil/wp-content/uploads/2025/02/SBICCT-First-Cohort.pdf'],
  ['OFFICIAL-003','official_program_projection_and_eligibility','https://www.cto.mil/osc/sbicct-initiative/'],
  ['OFFICIAL-004','official_later_license_directory','https://www.sba.gov/funding-programs/investment-capital/sbic-directory'],
  ['OFFICIAL-005','official_portfolio_reporting_and_repayment_rules','https://www.sba.gov/partners/sbics/manage-sbic'],
  ['OFFICIAL-006','official_program_resource_library','https://www.sba.gov/partners/sbics/resource-library']
];

export const QUERY_TEMPLATES = [
  ['IDENTITY','"{name}"'],
  ['PORTFOLIO','"{name}" portfolio'],
  ['INVESTMENT','"{name}" (investment OR invested OR financing)'],
  ['FOLLOW_ON','"{name}" (follow-on OR "follow on" OR additional investment)'],
  ['EXIT','"{name}" (exit OR exited OR acquisition OR acquired)'],
  ['LOSS','"{name}" (write-off OR writedown OR loss OR default OR cure)'],
  ['RETURN','"{name}" (return OR distribution OR realized OR DPI OR IRR)'],
  ['REPAYMENT','"{name}" (SBA leverage OR debenture OR repayment OR liquidation)']
];

const bing = (query) => `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
const exactGet = ([route_id, source_class, url], ordinal) => ({
  route_id,
  ordinal: ordinal + 1,
  route_type: 'exact_get',
  source_class,
  unit_id: null,
  legal_vehicle: null,
  query_family: null,
  query: null,
  url,
  method: 'GET',
  maximum_attempts: 1,
  candidate_only: false,
  evidence_admission_authorized: true
});

function searchRoutes(units) {
  const rows = [];
  for (const unit of units.filter((row) => row.identity_state === 'publicly_named')) {
    for (let i = 0; i < QUERY_TEMPLATES.length; i += 1) {
      const [family, template] = QUERY_TEMPLATES[i];
      const query = template.replace('{name}', unit.legal_vehicle);
      rows.push({
        route_id: `SEARCH-${String(unit.unit_ordinal).padStart(2,'0')}-${String(i + 1).padStart(2,'0')}`,
        ordinal: OFFICIAL_ROUTES.length + rows.length + 1,
        route_type: 'bing_rss_search',
        source_class: 'fixed_candidate_census_route',
        unit_id: unit.unit_id,
        legal_vehicle: unit.legal_vehicle,
        query_family: family,
        query,
        url: bing(query),
        method: 'GET',
        maximum_attempts: 1,
        candidate_only: true,
        evidence_admission_authorized: false
      });
    }
  }
  return rows;
}

function validateInputs(root) {
  ok(sha256(readBytes(root, CONTRACT_PATH)) === CONTRACT_SHA256, 'field-matrix contract bytes changed');
  ok(sha256(readBytes(root, SEED_PATH)) === SEED_SHA256, 'seed bytes changed');
  const contract = read(root, CONTRACT_PATH);
  const seed = read(root, SEED_PATH);
  const parent = read(root, PARENT_MATRIX_PATH);
  const parentReceipt = read(root, PARENT_RECEIPT_PATH);
  ok(contract.schema_version === 'ssc-rd-wave03-rd02-portfolio-lifecycle-field-matrix-contract@1', 'contract schema changed');
  ok(contract.wave_id === 'SSC-RD-W03' && contract.class_id === 'RD-02-C05' && contract.issue === 1015, 'contract identity changed');
  ok(seed.schema_version === 'ssc-residual-denominator-wave03-lane-seed-reference@1', 'seed schema changed');
  ok(seed.class_id === 'RD-02-C05' && seed.child_issue === 1015, 'seed identity changed');
  ok(seed.closure_target === 'complete portfolio investment, follow-on, exit, write-off, default, return, and repayment ledger', 'seed closure target changed');
  ok(contract.units.length === 18 && contract.required_fields.length === 10 && contract.expansion_contract.required_cells === 180, '18x10 denominator changed');
  ok(contract.units.filter((row) => row.identity_state === 'publicly_named').length === 17, 'public unit count changed');
  ok(contract.units.filter((row) => row.identity_state === 'identity_withheld_under_policy').length === 1, 'withheld unit count changed');
  ok(parent.rows.length === 18 && parent.counts.terminal_fields === 180 && parent.current_result.class_closed === true, 'parent terminal matrix changed');
  ok(parentReceipt.class_id === 'RD-02-C04' && parentReceipt.class_closed === true, 'parent class receipt changed');
  const parentUnits = parent.rows.map((row, index) => ({
    unit_ordinal: index + 1,
    unit_id: `SBICCT-FIRST-COHORT-${String(index + 1).padStart(2,'0')}`,
    legal_vehicle: row.legal_vehicle,
    ...(row.identity_state === 'identity_withheld_under_policy' ? { withheld_state_label: 'withheld under SBA policy' } : {}),
    identity_state: row.identity_state
  }));
  same(contract.units, parentUnits, 'Wave-03 units drifted from immutable parent rows');
  return { contract, seed, parent, parentReceipt };
}

export function derivePackage(root = ROOT) {
  const { contract, seed, parent, parentReceipt } = validateInputs(root);
  const routes = [
    ...OFFICIAL_ROUTES.map(exactGet),
    ...searchRoutes(contract.units)
  ];
  ok(routes.length === 142, 'fixed route count changed');
  same(routes.map((row) => row.ordinal), Array.from({ length: 142 }, (_, i) => i + 1), 'route ordinals changed');
  ok(new Set(routes.map((row) => row.route_id)).size === 142, 'duplicate route id');
  return {
    schema_version: 'ssc-rd-wave03-rd02-portfolio-lifecycle-fixed-protocol@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-02',
    class_id: 'RD-02-C05',
    issue: 1015,
    as_of: '2026-08-04',
    status: 'fixed_protocol_frozen_acquisition_not_executed',
    closure_target: seed.closure_target,
    source_custody: {
      field_matrix_contract_path: CONTRACT_PATH,
      field_matrix_contract_sha256: CONTRACT_SHA256,
      seed_path: SEED_PATH,
      seed_sha256: SEED_SHA256,
      parent_terminal_matrix_path: PARENT_MATRIX_PATH,
      parent_terminal_matrix_class_id: parent.class_id,
      parent_class_receipt_path: PARENT_RECEIPT_PATH,
      parent_class_receipt_terminal_state: parentReceipt.terminal_state,
      parent_row_membership_reused_without_reopening: true
    },
    denominator: {
      units: contract.units,
      required_fields: contract.required_fields,
      unit_count: 18,
      publicly_named_units: 17,
      identity_withheld_units: 1,
      required_fields_per_unit: 10,
      required_cells: 180,
      materialized_cells: 0,
      terminal_cells: 0,
      terminal_units: 0,
      class_closed: false
    },
    execution_contract: {
      fixed_before_results: true,
      fixed_routes: routes,
      exact_get_routes: 6,
      candidate_census_routes: 136,
      result_spawned_requests: 0,
      maximum_attempts_per_route: 1,
      timeout_ms: 45000,
      maximum_body_bytes: 5242880,
      concurrency: 2,
      connection_header: 'close',
      search_result_limit_per_route: 10,
      automatic_candidate_followup_authorized: false,
      automatic_second_pass_authorized: false,
      raw_request_response_and_hash_custody_required: true,
      terminal_http_non_success_is_typed_not_fatal: true,
      transport_failure_is_typed_not_absence: true
    },
    candidate_law: {
      search_result_is_evidence: false,
      official_domain_is_substantive_support: false,
      first_party_domain_is_substantive_support: false,
      lexical_legal_vehicle_match_is_identity_resolution: false,
      result_rank_is_authority: false,
      candidate_url_followup_requires_separate_frozen_successor: true,
      candidate_admission_requires_page_level_identity_event_and_instrument_custody: true
    },
    next_stage: {
      exact_action: 'execute all 142 fixed routes once, preserve every terminal receipt and candidate row, then freeze a separate page-level candidate-adjudication denominator',
      terminal_product_authorized_now: false,
      class_closure_authorized_now: false
    },
    current_counts: {
      fixed_routes: 142,
      exact_get_routes: 6,
      candidate_census_routes: 136,
      request_attempts: 0,
      terminal_route_receipts: 0,
      candidate_rows: 0,
      admitted_evidence_sources: 0,
      materialized_cells: 0,
      terminal_cells: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    boundaries: {
      program_projection_is_fund_investment: false,
      fund_investment_is_follow_on_or_exit: false,
      exit_is_positive_realized_return: false,
      missing_public_write_off_is_no_loss: false,
      private_return_is_sba_repayment_or_public_recovery: false,
      search_result_is_source_truth: false,
      search_nonreturn_is_record_absence: false,
      withheld_identity_is_nonparticipation: false,
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

export function deriveSchema(value) {
  const keys = Object.keys(value);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle-intake.schema.json',
    title: 'SSC RD-02 Wave 03 portfolio lifecycle fixed protocol',
    type: 'object',
    additionalProperties: false,
    required: keys,
    properties: Object.fromEntries(keys.map((key) => [key, { const: value[key] }]))
  };
}

export function checkPackage(root = ROOT) {
  const expected = derivePackage(root);
  same(read(root, PACKAGE_PATH), expected, 'fixed protocol package drifted');
  same(read(root, SCHEMA_PATH), deriveSchema(expected), 'fixed protocol schema drifted');
  return expected;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const mode = process.argv[2] || '--write';
  if (mode === '--write') {
    const value = derivePackage(ROOT);
    write(ROOT, PACKAGE_PATH, value);
    write(ROOT, SCHEMA_PATH, deriveSchema(value));
    console.log(`wrote ${PACKAGE_PATH}`);
    console.log(`wrote ${SCHEMA_PATH}`);
  } else if (mode === '--check') {
    const value = checkPackage(ROOT);
    console.log(`RD-02 Wave-03 intake: ${value.current_counts.fixed_routes} fixed routes, 180 frozen cells, acquisition not executed`);
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}
