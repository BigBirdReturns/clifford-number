#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json';
export const PARENT_PATH = 'data/intake/status-sovereignty-rd03-osc-instrument-lifecycle.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-03-C04.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const CURRENT_LEDGER_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const CENSUS_ROOT = 'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/source-custody/public-record-census-v1';
export const EXECUTION_RECEIPT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/public-record-census-execution-receipt.json';
export const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms';
export const CLOSURE_REFERENCE_PATH = 'data/project/ssc-residual-wave02/closures/RD-03-C04.json';

export const CLASS_LABEL = 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms';
export const SEED_LABEL = 'loan, warrant, security, covenant, milestone, pricing, and seniority terms';
export const LABEL_RECONCILIATION = 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact';
export const TERMINAL_STATE = 'bounded_source_unavailable';
export const SOURCE_HEAD = 'e70aec0f6809c77e198e0c4ee80f6bcadb6bbdc4';
export const MATRIX_SHA256 = '0d7924097f22816757891e70546d67c2bdfe685468e977b6d95406c108ddfa4a';
export const MATRIX_BLOB_SHA = '1ee428a1fc43365fd6987c5dbfe362a6338ec1e4';
export const PARENT_SHA256 = '3bd111cc56eb5046ed5ba2aa8a8dfdecaec9d37bbb273e6c75b695e6ae1e05a0';
export const CENSUS_ARTIFACT_SHA256 = '5b5414816cb626a7d9bbe16d914f67d5d02d1233c6ca0d84e21930909eba5f08';
export const CENSUS_MANIFEST_SHA256 = '0bcee2db7be4904f775c55a2533a2a5f1c199edff47e273993925b742f24ac06';
const SEED_INPUT_MANIFEST_SHA256 = '12da3be1a750276357c93530f7390b6925d4f556184e9654dc87339346f46a59';
const CENSUS_MANIFEST_ENTRIES = 263;

export const REQUIRED_FIELDS = [
  'legal_borrower_and_material_affiliates',
  'instrument_state_and_governing_date',
  'principal_or_ceiling',
  'pricing_and_cost_of_capital',
  'maturity_and_amortization',
  'security_and_collateral',
  'seniority_and_subordination',
  'warrant_or_other_public_rights',
  'conditions_precedent_and_close_conditions',
  'covenants_and_operating_restrictions',
  'milestones_and_performance_obligations',
  'reporting_inspection_and_information_rights',
  'amendment_default_cure_and_enforcement',
  'source_identity_and_exact_custody'
];
const INSTRUMENT_IDS = [
  'OSC-MP-MATERIALS-150M',
  'OSC-VULCAN-620M',
  'OSC-REELEMENT-80M',
  'OSC-PHOENIX-500M',
  'OSC-ENERGY-FUELS-725M'
];
const CONDITIONAL_CONFIG = {
  'OSC-VULCAN-620M': { amount: 620000000, warrant: true, tenor: null },
  'OSC-REELEMENT-80M': { amount: 80000000, warrant: true, tenor: null },
  'OSC-PHOENIX-500M': { amount: 500000000, warrant: false, tenor: null },
  'OSC-ENERGY-FUELS-725M': { amount: 725000000, warrant: false, tenor: 20 }
};

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

function field(state, value, sourceIds, routeIds, note) {
  return {
    state,
    value,
    source_ids: [...new Set(sourceIds || [])],
    census_route_ids: [...new Set(routeIds || [])],
    note,
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
}
function unavailable(routeIds, note, value = null, sourceIds = []) {
  return field('source_unavailable_after_fixed_protocol', value, sourceIds, routeIds, note);
}
function sourceIds(row) {
  return Array.isArray(row?.parent_state?.source_ids) ? row.parent_state.source_ids : [];
}
function routesFor(protocol, instrumentId) {
  const row = protocol.instruments.find((candidate) => candidate.instrument_id === instrumentId);
  ok(row && Array.isArray(row.fixed_route_ids), `${instrumentId}: fixed protocol row missing`);
  return row.fixed_route_ids;
}
function readInputs(root) {
  return {
    matrix: readJson(root, MATRIX_PATH),
    parent: readJson(root, PARENT_PATH),
    seed: readJson(root, SEED_PATH),
    constitution: readJson(root, CONSTITUTION_PATH),
    plan: readJson(root, `${CENSUS_ROOT}/plan.json`),
    censusSummary: readJson(root, `${CENSUS_ROOT}/summary.json`),
    routeResults: readJson(root, `${CENSUS_ROOT}/route-results.json`),
    protocol: readJson(root, `${CENSUS_ROOT}/instrument-protocol-ledger.json`),
    candidates: readJson(root, `${CENSUS_ROOT}/candidate-url-ledger.json`),
    censusManifest: readJson(root, `${CENSUS_ROOT}/manifest.json`),
    execution: readJson(root, EXECUTION_RECEIPT_PATH)
  };
}
function validateInputs(root, inputs) {
  const { matrix, parent, seed, constitution, censusSummary, routeResults, protocol, candidates, censusManifest, execution } = inputs;
  ok(sha256(readBytes(root, MATRIX_PATH)) === MATRIX_SHA256, 'field matrix exact bytes changed');
  ok(sha256(readBytes(root, PARENT_PATH)) === PARENT_SHA256, 'parent lifecycle exact bytes changed');
  ok(matrix.schema_version === 'ssc-rd-wave02-rd03-negotiated-terms-field-matrix@1', 'field matrix schema changed');
  ok(matrix.wave_id === 'SSC-RD-W02' && matrix.class_id === 'RD-03-C04' && matrix.issue === 788, 'field matrix identity changed');
  same(matrix.denominator_contract?.instrument_ids, INSTRUMENT_IDS, 'instrument denominator changed');
  same(matrix.required_fields, REQUIRED_FIELDS, 'required field denominator changed');
  ok(Array.isArray(matrix.instruments) && matrix.instruments.length === 5, 'five instruments required');
  same(matrix.instruments.map((row) => row.instrument_id), INSTRUMENT_IDS, 'instrument order changed');
  ok(parent.schema_version === 'status-sovereignty-residual-execution@1' && parent.execution_id === 'SSC-RD03-OSC-01', 'parent identity changed');
  same(parent.instruments.map((row) => row.instrument_id), INSTRUMENT_IDS, 'parent denominator changed');
  ok(seed.schema_version === 'ssc-residual-denominator-wave02-lane-seed-reference@1' && seed.child_issue === 788 && seed.class_id === 'RD-03-C04', 'seed identity changed');
  ok(seed.closure_target === SEED_LABEL, 'seed label changed');
  ok(seed.input_manifest?.combined_sha256 === SEED_INPUT_MANIFEST_SHA256, 'seed input manifest changed');
  const attempt = constitution.lane_attempts?.find((row) => row.class_id === 'RD-03-C04');
  ok(attempt?.issue === 788 && attempt?.exact_label === CLASS_LABEL, 'constitutional class label changed');
  ok(execution.schema_version === 'ssc-rd03-wave02-public-record-census-execution-receipt@1', 'execution receipt schema changed');
  ok(execution.research_head === SOURCE_HEAD && execution.workflow_run === 30864413469 && execution.job_id === 91853036710 && execution.artifact_id === 8875551993, 'execution identity changed');
  ok(execution.artifact_zip_sha256 === CENSUS_ARTIFACT_SHA256 && execution.manifest_combined_sha256 === CENSUS_MANIFEST_SHA256, 'execution digest changed');
  ok(censusManifest.entry_count === CENSUS_MANIFEST_ENTRIES && censusManifest.entries.length === CENSUS_MANIFEST_ENTRIES && censusManifest.combined_sha256 === CENSUS_MANIFEST_SHA256, 'census manifest changed');
  ok(censusSummary.fixed_routes === 30 && censusSummary.exact_get_routes === 15 && censusSummary.bing_rss_routes === 15 && censusSummary.route_attempts === 30, 'census route counts changed');
  same(censusSummary.terminal_transport_states, { http_terminal_non_success: 15, http_success: 15 }, 'census terminal transport counts changed');
  ok(censusSummary.candidate_rows === 150 && censusSummary.unique_candidate_urls === 60 && censusSummary.official_candidate_urls === 5 && censusSummary.first_party_candidate_urls === 1, 'census candidate counts changed');
  ok(censusSummary.result_spawned_requests === 0 && censusSummary.transport_census_complete === true && censusSummary.substantive_adjudication_complete === false && censusSummary.class_closed === false, 'census authority changed');
  ok(routeResults.route_count === 30 && routeResults.routes.length === 30 && routeResults.routes.every((row) => row.transport_terminal === true && row.result_spawned_requests === 0), 'route terminality changed');
  ok(protocol.instrument_count === 5 && protocol.instruments.length === 5 && protocol.instruments.every((row) => row.fixed_protocol_complete === true && row.transport_terminal === true), 'instrument protocol changed');
  same(protocol.instruments.map((row) => row.instrument_id), INSTRUMENT_IDS, 'protocol instrument order changed');
  ok(candidates.admitted_sources === 0 && candidates.followup_requests_executed === 0, 'candidate admission changed');
}

function custodyValue(row, routeIds) {
  return {
    source_matrix_head: SOURCE_HEAD,
    historical_field_matrix_path: MATRIX_PATH,
    historical_field_matrix_blob_sha: MATRIX_BLOB_SHA,
    historical_field_matrix_sha256: MATRIX_SHA256,
    parent_path: PARENT_PATH,
    parent_sha256: PARENT_SHA256,
    parent_source_ids: sourceIds(row),
    census_root: CENSUS_ROOT,
    census_artifact_sha256: CENSUS_ARTIFACT_SHA256,
    census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
    fixed_route_ids: routeIds
  };
}
function commonFields(row, routeIds) {
  const ids = sourceIds(row);
  return {
    legal_borrower_and_material_affiliates: field(
      'observed',
      { legal_borrower: row.borrower, material_affiliates: null, complete_affiliate_schedule_observed: false },
      ids,
      routeIds,
      'The retained parent record fixes the borrower label. No complete material-affiliate schedule was recovered.'
    ),
    source_identity_and_exact_custody: unavailable(
      routeIds,
      'Exact source and artifact custody is retained, but a complete source-addressable negotiated instrument stack was unavailable after the fixed protocol.',
      custodyValue(row, routeIds),
      ids
    )
  };
}
function orderedFields(values) {
  same(Object.keys(values), REQUIRED_FIELDS, 'terminal field order changed');
  return values;
}
function buildMp(row, routeIds) {
  const ids = sourceIds(row);
  const common = commonFields(row, routeIds);
  return orderedFields({
    legal_borrower_and_material_affiliates: common.legal_borrower_and_material_affiliates,
    instrument_state_and_governing_date: field(
      'observed',
      { parent_state: row.parent_state?.bounded_state, announced: true, conditional_commitment: false, financial_close_observed: true, executed_loan: true, cash_proceeds_received: true, complete_governing_date_terms: null },
      ids,
      routeIds,
      'The public record supports an executed and cash-received instrument; a complete governing-date term stack was not recovered.'
    ),
    principal_or_ceiling: field(
      'observed',
      { currency: 'USD', amount: 150000000, amount_type: 'executed_principal' },
      ['SSC-RD03-S001', 'SSC-RD03-S002', 'SSC-RD03-S003'],
      routeIds,
      'The executed instrument has a publicly stated principal of 150 million dollars.'
    ),
    pricing_and_cost_of_capital: field(
      'observed',
      { annual_interest_rate_percent: 5.38, interest_payment_frequency: 'quarterly_cash', first_stated_cash_interest_date: '2025-10-15', complete_fee_discount_and_pricing_schedule: null },
      ['SSC-RD03-S002', 'SSC-RD03-S003'],
      routeIds,
      'The public filings state 5.38 percent annual interest and a quarterly cash-interest cadence; the complete pricing stack remains unavailable.'
    ),
    maturity_and_amortization: unavailable(
      routeIds,
      'The disclosed maturity date is retained as a partial value, but complete maturity and amortization terms were unavailable after the fixed protocol.',
      { observed_maturity_date: '2037-08-01', complete_maturity_and_amortization_terms: null },
      ['SSC-RD03-S002', 'SSC-RD03-S003']
    ),
    security_and_collateral: unavailable(
      routeIds,
      'The unsecured-note form is retained as a partial value; complete collateral, negative-pledge, and security terms were unavailable after the fixed protocol.',
      { observed_instrument_form: 'unsecured_promissory_note', complete_collateral_terms: null },
      ['SSC-RD03-S002']
    ),
    seniority_and_subordination: unavailable(routeIds, 'No complete seniority, priority, intercreditor, or subordination stack was recovered.'),
    warrant_or_other_public_rights: unavailable(routeIds, 'No complete loan-specific warrant or other public-right allocation was recovered.'),
    conditions_precedent_and_close_conditions: unavailable(routeIds, 'Execution and cash receipt do not reveal the complete conditions-precedent and closing schedule.'),
    covenants_and_operating_restrictions: unavailable(routeIds, 'No complete affirmative, negative, financial, or operating covenant schedule was recovered.'),
    milestones_and_performance_obligations: unavailable(routeIds, 'No complete milestone or performance-obligation schedule was recovered.'),
    reporting_inspection_and_information_rights: unavailable(routeIds, 'No complete reporting, inspection, audit, or information-right schedule was recovered.'),
    amendment_default_cure_and_enforcement: unavailable(routeIds, 'No complete amendment, waiver, default, cure, acceleration, or enforcement schedule was recovered.'),
    source_identity_and_exact_custody: common.source_identity_and_exact_custody
  });
}
function buildConditional(row, routeIds) {
  const config = CONDITIONAL_CONFIG[row.instrument_id];
  ok(config, `${row.instrument_id}: conditional configuration missing`);
  const ids = sourceIds(row);
  const common = commonFields(row, routeIds);
  return orderedFields({
    legal_borrower_and_material_affiliates: common.legal_borrower_and_material_affiliates,
    instrument_state_and_governing_date: field(
      'conditional_term_only',
      { parent_state: row.parent_state?.bounded_state, announced: true, conditional_commitment: true, financial_close_observed: false, executed_loan: false, cash_proceeds_received: false, complete_governing_date_terms: null },
      ids,
      routeIds,
      'The record supports only a conditional pre-close commitment, not an executed loan, financial close, or cash disbursement.'
    ),
    principal_or_ceiling: field(
      'conditional_term_only',
      { currency: 'USD', amount: config.amount, amount_type: 'conditional_commitment_ceiling' },
      ids,
      routeIds,
      'The published amount is retained as a conditional commitment ceiling, not executed principal or cash drawn.'
    ),
    pricing_and_cost_of_capital: unavailable(routeIds, 'No final interest, fee, discount, warrant-economic, or other pricing schedule was recovered.'),
    maturity_and_amortization: config.tenor === null
      ? unavailable(routeIds, 'No final maturity or amortization schedule was recovered.')
      : field(
          'conditional_term_only',
          { proposed_tenor_years: config.tenor, exact_maturity_date: null, complete_amortization_schedule: null },
          ids,
          routeIds,
          'The proposed tenor remains a conditional advertised term; exact maturity and amortization remain unavailable.'
        ),
    security_and_collateral: unavailable(routeIds, 'No final security, collateral, negative-pledge, or lien package was recovered.'),
    seniority_and_subordination: unavailable(routeIds, 'No final seniority, priority, intercreditor, or subordination terms were recovered.'),
    warrant_or_other_public_rights: config.warrant
      ? field(
          'conditional_term_only',
          { announced_warrant: true, issuance_observed: false, issued_right: false, complete_terms: null },
          ids,
          routeIds,
          'The announced warrant remains conditional and unissued; complete terms were not recovered.'
        )
      : unavailable(routeIds, 'No source-addressable warrant, equity, price-protection, or other public-right term was recovered.'),
    conditions_precedent_and_close_conditions: field(
      'conditional_term_only',
      { due_diligence_remaining: true, final_agreements_remaining: true, closing_conditions_remaining: true, approvals_remaining: true, financial_close_observed: false, disbursement_observed: false, complete_condition_schedule: null },
      ids,
      routeIds,
      'Due diligence, final agreements, closing conditions, approvals, financial close, and disbursement remain distinct conditional states.'
    ),
    covenants_and_operating_restrictions: unavailable(routeIds, 'No final affirmative, negative, financial, or operating covenant schedule was recovered.'),
    milestones_and_performance_obligations: unavailable(routeIds, 'No final milestone or performance-obligation schedule was recovered.'),
    reporting_inspection_and_information_rights: unavailable(routeIds, 'No final reporting, inspection, audit, or information-right schedule was recovered.'),
    amendment_default_cure_and_enforcement: unavailable(routeIds, 'No final amendment, waiver, default, cure, acceleration, or enforcement schedule was recovered.'),
    source_identity_and_exact_custody: common.source_identity_and_exact_custody
  });
}
function authority() {
  return {
    outside_human_dependency: false,
    external_contacts: 0,
    external_reviews: 0,
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    favoritism_finding: false,
    extraction_finding: false,
    public_recovery_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    graph_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none'
  };
}
function buildTerminal(inputs) {
  const instruments = inputs.matrix.instruments.map((row) => {
    const routeIds = routesFor(inputs.protocol, row.instrument_id);
    const fields = row.instrument_id === INSTRUMENT_IDS[0] ? buildMp(row, routeIds) : buildConditional(row, routeIds);
    return {
      instrument_id: row.instrument_id,
      borrower: row.borrower,
      parent_state: row.parent_state,
      fields,
      instrument_result: {
        fixed_protocol_executed: true,
        required_fields: 14,
        terminal_fields: 14,
        instrument_closed: true,
        complete_negotiated_term_stack_observed: false,
        terminal_state: TERMINAL_STATE
      }
    };
  });
  const allFields = instruments.flatMap((instrument) => Object.values(instrument.fields));
  const stateCount = (state) => allFields.filter((item) => item.state === state).length;
  const counts = {
    instruments: 5,
    required_fields: 70,
    observed_fields: stateCount('observed'),
    conditional_term_only_fields: stateCount('conditional_term_only'),
    source_unavailable_after_fixed_protocol_fields: stateCount('source_unavailable_after_fixed_protocol'),
    terminal_fields: allFields.length,
    closed_instruments: 5,
    fixed_routes: 30,
    exact_get_routes: 15,
    bing_rss_routes: 15,
    route_attempts: 30,
    http_success: 15,
    terminal_non_success: 15,
    candidate_result_rows: 150,
    unique_candidate_urls: 60,
    official_candidate_urls: 5,
    first_party_candidate_urls: 1,
    admitted_candidate_urls: 0,
    result_spawned_requests: 0,
    external_contacts: 0,
    external_reviews: 0
  };
  same(
    [counts.observed_fields, counts.conditional_term_only_fields, counts.source_unavailable_after_fixed_protocol_fields, counts.terminal_fields],
    [8, 15, 47, 70],
    'terminal field-state accounting changed'
  );
  const currentResult = {
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    complete_negotiated_term_stack_observed: false,
    executed_and_conditional_states_preserved: true,
    source_unavailability_preserved: true,
    favoritism_finding: false,
    extraction_finding: false,
    public_recovery_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    complete_compact_finding: false,
    reviewed_disposition_changed: false,
    project_blocking: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  };
  const boundaries = {
    conditional_commitment_is_executed_loan: false,
    announced_warrant_is_issued_right: false,
    published_pricing_is_complete_negotiated_agreement: false,
    source_unavailability_is_term_absence: false,
    search_candidate_is_admitted_source: false,
    five_named_instruments_is_complete_cohort: false,
    executed_loan_is_complete_negotiated_term_stack: false,
    cash_disbursement_is_performance_or_public_recovery: false,
    disclosed_maturity_is_complete_amortization_schedule: false,
    unsecured_note_form_is_complete_collateral_and_priority_stack: false,
    parent_false_value_is_contractual_nonexistence: false,
    fixed_protocol_completion_is_complete_compact: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  };
  return {
    schema_version: 'ssc-rd-wave02-rd03-negotiated-terms-terminal-matrix@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    issue: 788,
    as_of: '2026-08-04',
    class_label: CLASS_LABEL,
    status: 'five_instrument_negotiated_term_stack_terminal_bounded_source_unavailable',
    source_product: {
      source_matrix_head: SOURCE_HEAD,
      historical_field_matrix_path: MATRIX_PATH,
      historical_field_matrix_sha256: MATRIX_SHA256,
      historical_field_matrix_blob_sha: MATRIX_BLOB_SHA,
      parent_path: PARENT_PATH,
      parent_sha256: PARENT_SHA256,
      execution_receipt_path: EXECUTION_RECEIPT_PATH,
      census_root: CENSUS_ROOT,
      census_artifact_sha256: CENSUS_ARTIFACT_SHA256,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
      census_manifest_entry_count: CENSUS_MANIFEST_ENTRIES,
      seed_path: SEED_PATH,
      seed_closure_target: SEED_LABEL,
      constitutional_class_label: CLASS_LABEL,
      seed_label_exact_match: false,
      seed_label_reconciliation: LABEL_RECONCILIATION
    },
    denominator_contract: {
      instruments: 5,
      instrument_ids: INSTRUMENT_IDS,
      required_fields_per_instrument: 14,
      required_fields: 70,
      executed_and_cash_received_parent_states: 1,
      conditional_pre_close_parent_states: 4,
      row_membership_frozen: true,
      silent_instrument_removal_allowed: false,
      outcome_based_selection_allowed: false,
      fixed_public_record_protocol_complete: true
    },
    required_fields: REQUIRED_FIELDS,
    permitted_terminal_field_states: ['observed', 'conditional_term_only', 'source_unavailable_after_fixed_protocol'],
    instruments,
    counts,
    current_result: currentResult,
    boundaries
  };
}
export function deriveProduct(root = ROOT) {
  const inputs = readInputs(root);
  validateInputs(root, inputs);
  const terminal = buildTerminal(inputs);
  const receipt = {
    schema_version: 'ssc-rd-wave02-rd03-class-receipt@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    issue: 788,
    class_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    label_custody: {
      constitutional_class_label: CLASS_LABEL,
      seed_closure_target: SEED_LABEL,
      labels_exact_match: false,
      reconciliation: LABEL_RECONCILIATION
    },
    closure_basis: [
      'the immutable five-instrument denominator remains complete and ordered',
      'the executed MP Materials state remains separate from four conditional pre-close commitments',
      'the fixed thirty-route protocol is terminal for all five instruments and generated no recursive requests',
      'all six official or first-party candidates were screened without admission as governing instruments',
      'all seventy required fields are terminally typed without inventing absent agreements, provisions, issuance, disbursement, repayment, or recovery'
    ],
    counts: terminal.counts,
    residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_and_rd06: {
      canonical_classes: 42,
      open_before: 38,
      closed_before: 4,
      open_after: 37,
      closed_after: 5
    },
    source_custody: {
      source_matrix_head: SOURCE_HEAD,
      historical_field_matrix_path: MATRIX_PATH,
      historical_field_matrix_blob_sha: MATRIX_BLOB_SHA,
      historical_field_matrix_sha256: MATRIX_SHA256,
      parent_path: PARENT_PATH,
      parent_sha256: PARENT_SHA256,
      execution_receipt_path: EXECUTION_RECEIPT_PATH,
      census_artifact_sha256: CENSUS_ARTIFACT_SHA256,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256
    },
    current_result: terminal.current_result,
    boundaries: terminal.boundaries,
    authority: authority()
  };
  const summary = {
    schema_version: 'ssc-rd-wave02-rd03-negotiated-terms-summary@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    issue: 788,
    class_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    counts: terminal.counts,
    current_result: terminal.current_result,
    boundaries: terminal.boundaries,
    authority: authority()
  };
  return { terminal, receipt, summary };
}
function artifactBytes(root) {
  const { terminal, receipt, summary } = deriveProduct(root);
  const output = new Map([
    [`${PRODUCT_ROOT}/class-receipt.json`, encode(receipt)],
    [`${PRODUCT_ROOT}/summary.json`, encode(summary)],
    [`${PRODUCT_ROOT}/terminal-field-matrix.json`, encode(terminal)]
  ]);
  const manifestEntries = [...output.entries()].map(([rel, bytes]) => ({
    path: path.basename(rel),
    bytes: bytes.length,
    sha256: sha256(bytes)
  }));
  const manifest = {
    schema_version: 'ssc-rd-wave02-rd03-negotiated-terms-manifest@1',
    entries: manifestEntries,
    combined_sha256: sha256(Buffer.from(manifestEntries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\n`).join(''), 'utf8'))
  };
  output.set(`${PRODUCT_ROOT}/manifest.json`, encode(manifest));
  const closure = {
    schema_version: 'ssc-residual-denominator-wave02-class-closure-reference@1',
    wave_issue: 785,
    child_issue: 788,
    source_pr: 803,
    class_id: 'RD-03-C04',
    lane_id: 'RD-03',
    exact_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    label_custody: receipt.label_custody,
    residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_and_rd06: receipt.residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_and_rd06,
    product: {
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      terminal_field_matrix_path: `${PRODUCT_ROOT}/terminal-field-matrix.json`,
      summary_path: `${PRODUCT_ROOT}/summary.json`,
      manifest_path: `${PRODUCT_ROOT}/manifest.json`,
      manifest_combined_sha256: manifest.combined_sha256
    },
    execution: {
      workflow_run: 30864413469,
      job_id: 91853036710,
      artifact_id: 8875551993,
      artifact_zip_sha256: CENSUS_ARTIFACT_SHA256,
      manifest_entry_count: CENSUS_MANIFEST_ENTRIES,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
      execution_receipt_path: EXECUTION_RECEIPT_PATH
    },
    authority: authority()
  };
  output.set(CLOSURE_REFERENCE_PATH, encode(closure));
  return { output, terminal, receipt, summary, manifest, closure };
}
export function writeProduct(root = ROOT) {
  const product = artifactBytes(root);
  for (const [rel, bytes] of product.output) {
    fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
    fs.writeFileSync(abs(root, rel), bytes);
  }
  return product;
}
export function checkProduct(root = ROOT) {
  const product = artifactBytes(root);
  for (const [rel, expected] of product.output) {
    ok(fs.existsSync(abs(root, rel)), `${rel}: missing generated product`);
    ok(readBytes(root, rel).equals(expected), `${rel}: deterministic drift`);
  }
  return product;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || '--write';
  if (mode === '--write') {
    const product = writeProduct(ROOT);
    console.log(`wrote RD-03 terminal product: ${product.terminal.counts.terminal_fields}/70 fields terminal; ${product.terminal.counts.source_unavailable_after_fixed_protocol_fields} source unavailable`);
  } else if (mode === '--check') {
    const product = checkProduct(ROOT);
    console.log(`RD-03 terminal product deterministic: ${product.terminal.counts.terminal_fields}/70 fields terminal`);
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}
