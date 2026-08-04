#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PATHS = {
  capture: 'data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/capture-execution-receipt.json',
  contract: 'data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/field-matrix-contract.json',
  protocol: 'data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/fixed-protocol-package.json',
  parent: 'data/intake/status-sovereignty-rd03-osc-instrument-lifecycle.json',
  parentTerms: 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/terminal-field-matrix.json',
  parentReceipt: 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json',
  matrix: 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/terminal-field-matrix.json',
  summary: 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/summary.json',
  classReceipt: 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/class-receipt.json',
  manifest: 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/manifest.json',
  closure: 'data/project/ssc-residual-wave03/closures/RD-03-C05.json',
  schema: 'schemas/status-sovereignty-rd-wave03-rd03-lifecycle-recovery.schema.json'
};

export const REQUIRED_FIELDS = [
  'canonical_instrument_identity',
  'commitment_state_and_governing_date',
  'financial_close_and_executed_agreement_state_and_date',
  'draw_or_cash_disbursement_state_and_date',
  'amendment_and_waiver_chronology',
  'default_cure_acceleration_or_enforcement_chronology',
  'interest_payment_chronology',
  'principal_repayment_chronology',
  'public_recovery_or_unresolved_exposure_state',
  'source_identities_and_exact_custody',
  'field_and_instrument_terminal_state'
];

const SOURCE_PR = 1057;
const AS_OF = '2026-08-04';
const TERMINAL_STATE = 'bounded_source_restricted';
const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery';
const CAPTURE_ARTIFACT = {
  workflow_run: 30940153705,
  artifact_id: 8904843651,
  artifact_zip_sha256: 'd4720bd97ff9b8abc15c088b824174ab0314904cc16f8d7420bcd117241a36a5',
  manifest_entries: 348,
  manifest_combined_sha256: '86a8906c7eb9bebd13a6f8ec1a9101e980cedaadff50dbfa28df8f13a3756b21'
};

const INSTRUMENT_META = {
  'OSC-MP-MATERIALS-150M': {
    borrower: 'MP Materials Corp.',
    amount: 150000000,
    commitmentDate: '2025-08',
    commitmentDatePrecision: 'month_from_inherited_regulatory_filing',
    parentSourceIds: ['SSC-RD03-S001', 'SSC-RD03-S002', 'SSC-RD03-S003', 'SSC-RD03-S004'],
    exactRouteIds: ['RD03-W03-R001', 'RD03-W03-R002', 'RD03-W03-R003', 'RD03-W03-R004', 'RD03-W03-R005', 'RD03-W03-R013', 'RD03-W03-R016'],
    candidateRouteIds: ['RD03-W03-R019', 'RD03-W03-R020', 'RD03-W03-R021', 'RD03-W03-R022', 'RD03-W03-R023'],
    successfulExactRouteIds: ['RD03-W03-R013', 'RD03-W03-R016'],
    restrictedExactRouteIds: ['RD03-W03-R001', 'RD03-W03-R002', 'RD03-W03-R003', 'RD03-W03-R004', 'RD03-W03-R005'],
    parentState: 'executed_and_cash_disbursed_terms_recovered_performance_and_recovery_open',
    conditional: false
  },
  'OSC-VULCAN-620M': {
    borrower: 'Vulcan Elements', amount: 620000000,
    commitmentDate: '2025-11-03', commitmentDatePrecision: 'event_date_from_sec_submissions_index',
    parentSourceIds: ['SSC-RD03-S005'],
    exactRouteIds: ['RD03-W03-R006', 'RD03-W03-R007', 'RD03-W03-R008', 'RD03-W03-R014', 'RD03-W03-R017'],
    candidateRouteIds: ['RD03-W03-R024', 'RD03-W03-R025', 'RD03-W03-R026', 'RD03-W03-R027', 'RD03-W03-R028'],
    successfulExactRouteIds: ['RD03-W03-R014', 'RD03-W03-R017'],
    restrictedExactRouteIds: ['RD03-W03-R006', 'RD03-W03-R007', 'RD03-W03-R008'],
    parentState: 'conditional_pre_close_no_disbursement_observed', conditional: true
  },
  'OSC-REELEMENT-80M': {
    borrower: 'ReElement Technologies Corporation', amount: 80000000,
    commitmentDate: '2025-11-03', commitmentDatePrecision: 'event_date_from_sec_submissions_index',
    parentSourceIds: ['SSC-RD03-S005', 'SSC-RD03-S006'],
    exactRouteIds: ['RD03-W03-R006', 'RD03-W03-R007', 'RD03-W03-R008', 'RD03-W03-R014', 'RD03-W03-R017'],
    candidateRouteIds: ['RD03-W03-R029', 'RD03-W03-R030', 'RD03-W03-R031', 'RD03-W03-R032', 'RD03-W03-R033'],
    successfulExactRouteIds: ['RD03-W03-R014', 'RD03-W03-R017'],
    restrictedExactRouteIds: ['RD03-W03-R006', 'RD03-W03-R007', 'RD03-W03-R008'],
    parentState: 'conditional_pre_close_no_disbursement_or_warrant_issuance_observed', conditional: true
  },
  'OSC-PHOENIX-500M': {
    borrower: 'Phoenix Tailings, Inc.', amount: 500000000,
    commitmentDate: null, commitmentDatePrecision: 'source_restricted_after_fixed_protocol',
    parentSourceIds: ['SSC-RD03-S007'],
    exactRouteIds: ['RD03-W03-R009'],
    candidateRouteIds: ['RD03-W03-R034', 'RD03-W03-R035', 'RD03-W03-R036', 'RD03-W03-R037', 'RD03-W03-R038'],
    successfulExactRouteIds: [], restrictedExactRouteIds: ['RD03-W03-R009'],
    parentState: 'conditional_pre_close_no_disbursement_observed', conditional: true
  },
  'OSC-ENERGY-FUELS-725M': {
    borrower: 'Energy Fuels Inc.', amount: 725000000,
    commitmentDate: '2026-06-23', commitmentDatePrecision: 'event_date_from_sec_submissions_index',
    parentSourceIds: ['SSC-RD03-S008', 'SSC-RD03-S009'],
    exactRouteIds: ['RD03-W03-R010', 'RD03-W03-R011', 'RD03-W03-R012', 'RD03-W03-R015', 'RD03-W03-R018'],
    candidateRouteIds: ['RD03-W03-R039', 'RD03-W03-R040', 'RD03-W03-R041', 'RD03-W03-R042', 'RD03-W03-R043'],
    successfulExactRouteIds: ['RD03-W03-R015', 'RD03-W03-R018'],
    restrictedExactRouteIds: ['RD03-W03-R010', 'RD03-W03-R011', 'RD03-W03-R012'],
    parentState: 'conditional_pre_close_20_year_proposed_tenor_no_funding_observed', conditional: true
  }
};

const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fileSha256 = (root, rel) => sha256(fs.readFileSync(path.join(root, rel)));
const clone = (value) => structuredClone(value);

function field(state, value, sourceIds, routeIds, note) {
  return {
    state,
    value,
    source_ids: sourceIds,
    capture_route_ids: routeIds,
    note,
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
}

function terminalSourceIds(meta) {
  return [...meta.parentSourceIds];
}
function terminalRouteIds(meta) {
  return [...meta.exactRouteIds, ...meta.candidateRouteIds];
}

function custodyValue(meta, captureSha) {
  return {
    parent_source_ids: [...meta.parentSourceIds],
    exact_route_ids: [...meta.exactRouteIds],
    successful_exact_route_ids: [...meta.successfulExactRouteIds],
    restricted_exact_route_ids: [...meta.restrictedExactRouteIds],
    candidate_census_route_ids: [...meta.candidateRouteIds],
    candidate_rows_per_route: 10,
    candidate_sources_admitted: 0,
    result_spawned_requests: 0,
    capture_receipt_path: PATHS.capture,
    capture_receipt_sha256: captureSha,
    capture_artifact: clone(CAPTURE_ARTIFACT)
  };
}

function restrictedField(meta, note, partialValue = null) {
  return field('source_restricted', partialValue, terminalSourceIds(meta), terminalRouteIds(meta), note);
}

function buildMpFields(meta, captureSha) {
  const routes = terminalRouteIds(meta);
  const sources = terminalSourceIds(meta);
  const restricted = [
    'amendment_and_waiver_chronology',
    'default_cure_acceleration_or_enforcement_chronology',
    'interest_payment_chronology',
    'principal_repayment_chronology'
  ];
  return {
    canonical_instrument_identity: field('observed', {
      instrument_id: 'OSC-MP-MATERIALS-150M', borrower: meta.borrower,
      frozen_unit_ordinal: 1, frozen_five_instrument_member: true,
      complete_osc_cohort_member_claimed: false
    }, sources, routes, 'The exact parent denominator and source custody preserve MP Materials as the sole executed-and-cash-received instrument in this frozen five-unit class.'),
    commitment_state_and_governing_date: field('observed', {
      commitment_state: 'executed_direct_loan',
      governing_date: meta.commitmentDate,
      governing_date_precision: meta.commitmentDatePrecision,
      principal_usd: meta.amount,
      conditional_commitment: false
    }, sources, routes, 'Inherited official and regulatory custody supports a 150 million dollar executed direct loan issued in August 2025.'),
    financial_close_and_executed_agreement_state_and_date: field('observed', {
      financial_close_observed: true,
      executed_agreement_observed: true,
      observed_date: meta.commitmentDate,
      date_precision: meta.commitmentDatePrecision,
      complete_executed_agreement_stack_publicly_available: false
    }, sources, routes, 'The inherited record supports execution and financial close; it does not expose a complete current agreement and amendment stack.'),
    draw_or_cash_disbursement_state_and_date: field('observed', {
      cash_proceeds_received: true,
      observed_cash_amount_usd: 150000000,
      observed_date: meta.commitmentDate,
      date_precision: meta.commitmentDatePrecision,
      complete_draw_schedule_observed: false,
      full_draw_inferred_from_execution_alone: false
    }, sources, routes, 'The 2025 filing supports receipt of the 150 million dollar loan proceeds. The class does not generalize execution into a complete draw schedule.'),
    amendment_and_waiver_chronology: restrictedField(meta, 'The exact official and filing pages were HTTP-restricted during the fixed protocol, and the successful SEC indexes plus zero-admission candidate census did not supply an amendment or waiver chronology.'),
    default_cure_acceleration_or_enforcement_chronology: restrictedField(meta, 'The fixed protocol did not recover a complete default, cure, acceleration, or enforcement chronology. Outstanding principal snapshots are not default evidence.'),
    interest_payment_chronology: restrictedField(meta, 'The inherited filing states scheduled quarterly cash interest, but the restricted current filing pages and non-admitted candidate results do not establish actual installment payments.', {
      annual_interest_rate_percent: 5.38,
      scheduled_payment_frequency: 'quarterly_cash',
      first_scheduled_cash_interest_date: '2025-10-15',
      observed_interest_payment_events: null,
      complete_interest_payment_chronology: null
    }),
    principal_repayment_chronology: restrictedField(meta, 'The inherited filings preserve two 150 million dollar outstanding snapshots. Those snapshots do not establish a complete principal-payment history or event absence.', {
      outstanding_snapshots: [
        { as_of: '2025-12-31', amount_usd: 150000000 },
        { as_of: '2026-03-31', amount_usd: 150000000 }
      ],
      maturity_date: '2037-08-01',
      observed_principal_repayment_events: null,
      complete_principal_repayment_chronology: null
    }),
    public_recovery_or_unresolved_exposure_state: field('observed', {
      public_state: 'unresolved_public_exposure',
      outstanding_amount_usd_at_latest_observed_snapshot: 150000000,
      latest_observed_snapshot_date: '2026-03-31',
      public_recovery_observed: false,
      default_inferred_from_outstanding_balance: false,
      companion_equity_warrant_price_support_or_offtake_counted_as_loan_recovery: false
    }, sources, routes, 'The latest inherited filing snapshot retains a 150 million dollar public loan exposure. It does not establish default, repayment failure, or realized public recovery.'),
    source_identities_and_exact_custody: field('observed', custodyValue(meta, captureSha), sources, routes, 'The exact inherited sources, 12 instrument-addressed fixed routes, artifact digests, six successful regulatory APIs, five restricted exact pages, and zero admitted candidate sources are bound without result follow-up.'),
    field_and_instrument_terminal_state: field('observed', {
      instrument_terminal_state: TERMINAL_STATE,
      required_fields: 11,
      terminal_fields: 11,
      observed_fields: 7,
      conditional_term_only_fields: 0,
      source_restricted_fields: 4,
      source_restricted_field_ids: restricted,
      instrument_closed: true
    }, sources, routes, 'Every MP Materials field is terminally typed. Source restriction closes only this bounded acquisition obligation and does not establish event absence.')
  };
}

function buildConditionalFields(instrumentId, meta, ordinal, captureSha) {
  const routes = terminalRouteIds(meta);
  const sources = terminalSourceIds(meta);
  const restrictedIds = [
    'financial_close_and_executed_agreement_state_and_date',
    'draw_or_cash_disbursement_state_and_date',
    'amendment_and_waiver_chronology',
    'default_cure_acceleration_or_enforcement_chronology',
    'interest_payment_chronology',
    'principal_repayment_chronology'
  ];
  const sourceBoundary = 'The inherited public state is conditional pre-close. The exact official or filing pages were HTTP-restricted during the fixed protocol, and the successful indexes plus zero-admission candidate census did not establish a later state.';
  return {
    canonical_instrument_identity: field('observed', {
      instrument_id: instrumentId, borrower: meta.borrower,
      frozen_unit_ordinal: ordinal, frozen_five_instrument_member: true,
      complete_osc_cohort_member_claimed: false
    }, sources, routes, 'The exact parent denominator preserves this instrument as one of four distinct conditional pre-close units; it is not interchangeable with an executed loan.'),
    commitment_state_and_governing_date: field('conditional_term_only', {
      commitment_state: 'conditional_pre_close_commitment',
      announced_ceiling_usd: meta.amount,
      governing_date: meta.commitmentDate,
      governing_date_precision: meta.commitmentDatePrecision,
      financial_close_observed_in_parent: false,
      cash_disbursement_observed_in_parent: false
    }, sources, routes, 'The published amount remains a conditional commitment ceiling subject to due diligence, final agreements, approvals, closing, and disbursement conditions.'),
    financial_close_and_executed_agreement_state_and_date: restrictedField(meta, `${sourceBoundary} Financial close and execution remain unresolved rather than encoded as false.`),
    draw_or_cash_disbursement_state_and_date: restrictedField(meta, `${sourceBoundary} Cash disbursement remains unresolved rather than encoded as zero.`),
    amendment_and_waiver_chronology: restrictedField(meta, `${sourceBoundary} No complete amendment or waiver chronology is available.`),
    default_cure_acceleration_or_enforcement_chronology: restrictedField(meta, `${sourceBoundary} Downstream default, cure, acceleration, and enforcement states cannot be resolved without silently assuming whether close occurred.`),
    interest_payment_chronology: restrictedField(meta, `${sourceBoundary} A conditional advertised financing term is not an observed interest payment, and no complete payment chronology was recovered.`),
    principal_repayment_chronology: restrictedField(meta, `${sourceBoundary} No funded principal balance or complete repayment chronology was recovered; missing payment records are not zero repayment.`),
    public_recovery_or_unresolved_exposure_state: field('observed', {
      public_state: 'conditional_commitment_exposure_unresolved',
      last_publicly_observed_instrument_state: meta.parentState,
      funded_public_principal_observed: false,
      public_recovery_observed: false,
      current_legal_state_claimed: false,
      event_absence_claimed: false
    }, sources, routes, 'The terminal public state is unresolved conditional exposure, not an assertion that the loan never closed, funded, repaid, defaulted, or recovered.'),
    source_identities_and_exact_custody: field('observed', custodyValue(meta, captureSha), sources, routes, 'Exact inherited sources, instrument-addressed fixed routes, restricted primary pages, successful regulatory indexes where available, candidate-census digests, and zero admissions are bound without follow-up.'),
    field_and_instrument_terminal_state: field('observed', {
      instrument_terminal_state: TERMINAL_STATE,
      required_fields: 11,
      terminal_fields: 11,
      observed_fields: 4,
      conditional_term_only_fields: 1,
      source_restricted_fields: 6,
      source_restricted_field_ids: restrictedIds,
      instrument_closed: true
    }, sources, routes, 'Every field is terminally typed. The row closes as bounded source restricted while preserving the conditional pre-close boundary and every unresolved downstream event.')
  };
}

function buildMatrix(root, capture) {
  const parent = readJson(root, PATHS.parent);
  const captureSha = fileSha256(root, PATHS.capture);
  const orderedIds = parent.instruments.map((row) => row.instrument_id);
  assert.deepEqual(orderedIds, Object.keys(INSTRUMENT_META));
  const instruments = parent.instruments.map((parentRow, index) => {
    const meta = INSTRUMENT_META[parentRow.instrument_id];
    const fields = meta.conditional
      ? buildConditionalFields(parentRow.instrument_id, meta, index + 1, captureSha)
      : buildMpFields(meta, captureSha);
    return {
      instrument_id: parentRow.instrument_id,
      borrower: parentRow.borrower,
      inherited_parent_state: parentRow.bounded_state,
      fields,
      instrument_result: {
        fixed_protocol_executed: true,
        required_fields: 11,
        terminal_fields: 11,
        observed_fields: meta.conditional ? 4 : 7,
        conditional_term_only_fields: meta.conditional ? 1 : 0,
        source_restricted_fields: meta.conditional ? 6 : 4,
        instrument_closed: true,
        terminal_state: TERMINAL_STATE
      }
    };
  });
  return {
    schema_version: 'ssc-rd03-wave03-lifecycle-recovery-terminal-matrix@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-03', class_id: 'RD-03-C05', issue: 1016,
    class_label: 'commitment through repayment and public recovery chronology',
    status: 'five_instrument_fifty_five_cell_matrix_terminal_bounded_source_restricted',
    as_of: AS_OF,
    source_product: {
      constitution_merge: 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2',
      cumulative_parent_merge: '150f1693c70ce3699428c58c2687851a1ced39f7',
      canonical_intake_merge: 'f9327072a4856d514aa2e9f99479a2038f592bf6',
      terminal_branch_base: '44d4544b23dc24db24a4a7c61939396ada0b5fd5',
      seed_path: 'data/project/ssc-residual-wave03/seeds/RD-03-C05.json',
      field_matrix_contract_path: PATHS.contract,
      fixed_protocol_path: PATHS.protocol,
      capture_receipt_path: PATHS.capture,
      capture_receipt_sha256: captureSha,
      parent_lifecycle_path: PATHS.parent,
      parent_negotiated_terms_path: PATHS.parentTerms,
      parent_class_receipt_path: PATHS.parentReceipt
    },
    permitted_field_states: [
      'observed', 'conditional_term_only', 'not_applicable_by_instrument_state',
      'source_restricted', 'source_unavailable_after_fixed_protocol', 'not_publicly_recovered'
    ],
    required_fields: [...REQUIRED_FIELDS],
    instruments,
    counts: {
      instrument_rows: 5,
      required_fields_per_instrument: 11,
      required_fields: 55,
      terminal_fields: 55,
      observed_fields: 23,
      conditional_term_only_fields: 4,
      source_restricted_fields: 28,
      source_unavailable_after_fixed_protocol_fields: 0,
      not_publicly_recovered_fields: 0,
      not_applicable_by_instrument_state_fields: 0,
      closed_instruments: 5,
      executed_and_cash_disbursed_instruments: 1,
      conditional_pre_close_instruments: 4,
      fixed_routes: 43,
      route_attempts: 43,
      transport_completions: 43,
      transport_failures: 0,
      http_successes: 31,
      exact_source_restrictions: 12,
      exact_regulatory_api_successes: 6,
      candidate_census_routes: 25,
      candidate_rows: 250,
      unique_candidate_urls: 10,
      admitted_candidate_sources: 0,
      result_spawned_requests: 0,
      admitted_amendment_or_waiver_records: 0,
      admitted_default_cure_acceleration_or_enforcement_records: 0,
      admitted_interest_payment_records: 0,
      admitted_principal_repayment_records: 0,
      admitted_public_recovery_records: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    current_result: {
      terminal_state: TERMINAL_STATE,
      fixed_protocol_complete: true,
      class_closed: true,
      all_five_instruments_preserved: true,
      all_fifty_five_fields_terminal: true,
      executed_and_disbursed_instrument_preserved: true,
      four_conditional_pre_close_instruments_preserved: true,
      exact_source_restriction_preserved: true,
      candidate_results_admitted: 0,
      public_recovery_finding: false,
      favoritism_finding: false,
      extraction_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      reviewed_disposition_changed: false,
      outside_human_dependency: false,
      project_blocking: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    },
    boundaries: {
      conditional_commitment_is_financial_close: false,
      financial_close_is_cash_disbursement: false,
      executed_loan_is_full_draw: false,
      scheduled_interest_is_observed_payment: false,
      outstanding_obligation_is_default: false,
      maturity_term_is_repayment: false,
      companion_public_right_is_loan_recovery: false,
      http_restriction_is_event_absence: false,
      candidate_result_is_admitted_source: false,
      submissions_index_is_filing_content: false,
      company_facts_is_complete_lifecycle_chronology: false,
      no_public_event_is_event_absence: false,
      five_named_instruments_are_complete_osc_cohort: false,
      class_closure_is_lane_or_wave_completion: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    },
    authority: {
      outside_human_dependency: false,
      external_contacts: 0, external_reviews: 0,
      denominator_widened: false,
      reviewed_disposition_changed: false,
      favoritism_finding: false, extraction_finding: false,
      public_recovery_finding: false,
      coordination_finding: false, common_purpose_finding: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    }
  };
}

function buildSummary(matrix) {
  return {
    schema_version: 'ssc-rd03-wave03-lifecycle-recovery-summary@1',
    wave_id: matrix.wave_id, lane_id: matrix.lane_id, class_id: matrix.class_id,
    issue: matrix.issue, terminal_state: matrix.current_result.terminal_state,
    class_closed: true,
    counts: clone(matrix.counts),
    current_result: clone(matrix.current_result),
    authority: clone(matrix.authority)
  };
}

function buildClassReceipt(matrix, captureSha) {
  return {
    schema_version: 'ssc-rd03-wave03-class-receipt@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-03', class_id: 'RD-03-C05',
    issue: 1016, source_pr: SOURCE_PR,
    class_label: matrix.class_label,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    closure_basis: [
      'the immutable denominator retains exactly one executed-and-cash-received MP Materials instrument and four distinct conditional pre-close commitments',
      'the fixed protocol executed all forty-three predeclared routes exactly once, with forty-three transport completions, thirty-one HTTP successes, and twelve typed HTTP 403 primary-source restrictions',
      'the six successful exact endpoints are SEC submissions and company-facts APIs; they provide current regulatory custody but are not substituted for the restricted filing bodies or a complete lifecycle chronology',
      'all two hundred fifty candidate rows collapse to ten generic Microsoft service URLs, zero candidate sources are admitted, and no result-spawned requests occur',
      'all fifty-five required instrument-field cells are terminally typed as twenty-three observed, four conditional-term-only, and twenty-eight source-restricted states',
      'scheduled interest, maturity, and outstanding principal snapshots remain separate from observed payment, default, cure, repayment, or public recovery events',
      'source restriction and unresolved public exposure close only this bounded acquisition class and do not prove event absence, favoritism, extraction, coordination, common purpose, or a complete OSC cohort'
    ],
    counts: clone(matrix.counts),
    source_custody: {
      capture_receipt_path: PATHS.capture,
      capture_receipt_sha256: captureSha,
      fixed_protocol_path: PATHS.protocol,
      fixed_route_capture: clone(CAPTURE_ARTIFACT),
      canonical_intake_merge: 'f9327072a4856d514aa2e9f99479a2038f592bf6'
    },
    unresolved_limit: {
      source_restricted_fields: 28,
      exact_source_restrictions: 12,
      candidate_sources_admitted: 0,
      complete_amendment_or_waiver_chronologies: 0,
      complete_default_cure_acceleration_or_enforcement_chronologies: 0,
      complete_interest_payment_chronologies: 0,
      complete_principal_repayment_chronologies: 0,
      admitted_public_recovery_records: 0,
      missing_records_are_not_event_absence: true,
      outstanding_balance_is_not_default: true,
      scheduled_payment_is_not_observed_payment: true,
      automatic_additional_search_pass_authorized: false
    },
    authority: clone(matrix.authority)
  };
}

function buildManifest(matrix, summary, classReceipt) {
  const entries = [
    ['terminal-field-matrix.json', matrix],
    ['summary.json', summary],
    ['class-receipt.json', classReceipt]
  ].map(([rel, value]) => {
    const bytes = jsonBytes(value);
    return { path: rel, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return {
    schema_version: 'ssc-rd03-wave03-terminal-product-manifest@1',
    entries,
    entry_count: entries.length,
    combined_sha256: sha256(Buffer.from(entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}\n`).join('')))
  };
}

function buildClosure(manifest, captureSha) {
  return {
    schema_version: 'ssc-residual-denominator-wave03-class-closure-reference@1',
    wave_issue: 1013, child_issue: 1016, source_pr: SOURCE_PR,
    lane_id: 'RD-03', class_id: 'RD-03-C05',
    exact_label: 'commitment, closing, draw, disbursement, amendment, waiver, default, cure, repayment, and recovery chronology',
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    product: {
      root: PRODUCT_ROOT,
      manifest_path: PATHS.manifest,
      manifest_combined_sha256: manifest.combined_sha256,
      class_receipt_path: PATHS.classReceipt
    },
    source_custody: {
      capture_receipt_path: PATHS.capture,
      capture_receipt_sha256: captureSha,
      fixed_route_capture: clone(CAPTURE_ARTIFACT)
    },
    authority: {
      outside_human_dependency: false,
      external_contacts: 0, external_reviews: 0,
      denominator_widened: false,
      reviewed_disposition_changed: false,
      favoritism_finding: false, extraction_finding: false,
      public_recovery_finding: false,
      coordination_finding: false, common_purpose_finding: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    },
    residual_atlas_effect_if_promoted_after_rd01_wave03_closure: {
      canonical_classes: 42,
      open_before: 35,
      closed_before: 7,
      open_after: 34,
      closed_after: 8,
      wave03_selected_attempts_terminal_after_promotion: 2,
      wave_complete: false
    }
  };
}

function buildSchema() {
  const fieldSchema = {
    type: 'object', additionalProperties: false,
    required: ['state', 'value', 'source_ids', 'capture_route_ids', 'note', 'fixed_protocol_complete', 'terminal_for_class_closure'],
    properties: {
      state: { enum: ['observed', 'conditional_term_only', 'not_applicable_by_instrument_state', 'source_restricted', 'source_unavailable_after_fixed_protocol', 'not_publicly_recovered'] },
      value: {},
      source_ids: { type: 'array', minItems: 1, items: { type: 'string' } },
      capture_route_ids: { type: 'array', minItems: 6, items: { type: 'string', pattern: '^RD03-W03-R0[0-4][0-9]$' } },
      note: { type: 'string', minLength: 20 },
      fixed_protocol_complete: { const: true },
      terminal_for_class_closure: { const: true }
    }
  };
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/BigBirdReturns/clifford-number/schemas/status-sovereignty-rd-wave03-rd03-lifecycle-recovery.schema.json',
    title: 'SSC RD-03 Wave-03 terminal lifecycle and public-recovery matrix',
    type: 'object', additionalProperties: false,
    required: ['schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'class_label', 'status', 'as_of', 'source_product', 'permitted_field_states', 'required_fields', 'instruments', 'counts', 'current_result', 'boundaries', 'authority'],
    properties: {
      schema_version: { const: 'ssc-rd03-wave03-lifecycle-recovery-terminal-matrix@1' },
      wave_id: { const: 'SSC-RD-W03' }, lane_id: { const: 'RD-03' }, class_id: { const: 'RD-03-C05' }, issue: { const: 1016 },
      class_label: { const: 'commitment through repayment and public recovery chronology' },
      status: { const: 'five_instrument_fifty_five_cell_matrix_terminal_bounded_source_restricted' },
      as_of: { const: AS_OF },
      source_product: { type: 'object', minProperties: 10 },
      permitted_field_states: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'string' } },
      required_fields: { const: [...REQUIRED_FIELDS] },
      instruments: {
        type: 'array', minItems: 5, maxItems: 5,
        items: {
          type: 'object', additionalProperties: false,
          required: ['instrument_id', 'borrower', 'inherited_parent_state', 'fields', 'instrument_result'],
          properties: {
            instrument_id: { enum: Object.keys(INSTRUMENT_META) },
            borrower: { type: 'string', minLength: 3 },
            inherited_parent_state: { type: 'string', minLength: 3 },
            fields: {
              type: 'object', additionalProperties: false,
              required: [...REQUIRED_FIELDS],
              properties: Object.fromEntries(REQUIRED_FIELDS.map((id) => [id, clone(fieldSchema)]))
            },
            instrument_result: {
              type: 'object', additionalProperties: false,
              required: ['fixed_protocol_executed', 'required_fields', 'terminal_fields', 'observed_fields', 'conditional_term_only_fields', 'source_restricted_fields', 'instrument_closed', 'terminal_state'],
              properties: {
                fixed_protocol_executed: { const: true }, required_fields: { const: 11 }, terminal_fields: { const: 11 },
                observed_fields: { enum: [4, 7] }, conditional_term_only_fields: { enum: [0, 1] }, source_restricted_fields: { enum: [4, 6] },
                instrument_closed: { const: true }, terminal_state: { const: TERMINAL_STATE }
              }
            }
          }
        }
      },
      counts: {
        type: 'object', additionalProperties: false,
        required: ['instrument_rows', 'required_fields_per_instrument', 'required_fields', 'terminal_fields', 'observed_fields', 'conditional_term_only_fields', 'source_restricted_fields', 'source_unavailable_after_fixed_protocol_fields', 'not_publicly_recovered_fields', 'not_applicable_by_instrument_state_fields', 'closed_instruments', 'executed_and_cash_disbursed_instruments', 'conditional_pre_close_instruments', 'fixed_routes', 'route_attempts', 'transport_completions', 'transport_failures', 'http_successes', 'exact_source_restrictions', 'exact_regulatory_api_successes', 'candidate_census_routes', 'candidate_rows', 'unique_candidate_urls', 'admitted_candidate_sources', 'result_spawned_requests', 'admitted_amendment_or_waiver_records', 'admitted_default_cure_acceleration_or_enforcement_records', 'admitted_interest_payment_records', 'admitted_principal_repayment_records', 'admitted_public_recovery_records', 'external_contacts', 'external_reviews'],
        properties: {
          instrument_rows: { const: 5 }, required_fields_per_instrument: { const: 11 }, required_fields: { const: 55 }, terminal_fields: { const: 55 },
          observed_fields: { const: 23 }, conditional_term_only_fields: { const: 4 }, source_restricted_fields: { const: 28 },
          source_unavailable_after_fixed_protocol_fields: { const: 0 }, not_publicly_recovered_fields: { const: 0 }, not_applicable_by_instrument_state_fields: { const: 0 },
          closed_instruments: { const: 5 }, executed_and_cash_disbursed_instruments: { const: 1 }, conditional_pre_close_instruments: { const: 4 },
          fixed_routes: { const: 43 }, route_attempts: { const: 43 }, transport_completions: { const: 43 }, transport_failures: { const: 0 },
          http_successes: { const: 31 }, exact_source_restrictions: { const: 12 }, exact_regulatory_api_successes: { const: 6 },
          candidate_census_routes: { const: 25 }, candidate_rows: { const: 250 }, unique_candidate_urls: { const: 10 }, admitted_candidate_sources: { const: 0 }, result_spawned_requests: { const: 0 },
          admitted_amendment_or_waiver_records: { const: 0 }, admitted_default_cure_acceleration_or_enforcement_records: { const: 0 }, admitted_interest_payment_records: { const: 0 }, admitted_principal_repayment_records: { const: 0 }, admitted_public_recovery_records: { const: 0 },
          external_contacts: { const: 0 }, external_reviews: { const: 0 }
        }
      },
      current_result: { type: 'object', minProperties: 20 },
      boundaries: { type: 'object', minProperties: 18 },
      authority: { type: 'object', minProperties: 13 }
    }
  };
}

export function buildExpectedBundle(root = ROOT) {
  const capture = readJson(root, PATHS.capture);
  const matrix = buildMatrix(root, capture);
  const summary = buildSummary(matrix);
  const captureSha = fileSha256(root, PATHS.capture);
  const classReceipt = buildClassReceipt(matrix, captureSha);
  const manifest = buildManifest(matrix, summary, classReceipt);
  const closure = buildClosure(manifest, captureSha);
  const schema = buildSchema();
  return { capture, matrix, summary, classReceipt, manifest, closure, schema };
}

export function loadCommittedBundle(root = ROOT) {
  return {
    capture: readJson(root, PATHS.capture), matrix: readJson(root, PATHS.matrix), summary: readJson(root, PATHS.summary),
    classReceipt: readJson(root, PATHS.classReceipt), manifest: readJson(root, PATHS.manifest), closure: readJson(root, PATHS.closure), schema: readJson(root, PATHS.schema)
  };
}

export function checkCommittedBundle(root = ROOT) {
  const expected = buildExpectedBundle(root);
  const actual = loadCommittedBundle(root);
  for (const key of ['matrix', 'summary', 'classReceipt', 'manifest', 'closure', 'schema']) {
    assert.deepEqual(actual[key], expected[key], `${key} differs from deterministic build`);
  }
  return actual;
}

export function writeExpectedBundle(root = ROOT) {
  const bundle = buildExpectedBundle(root);
  const mapping = [['matrix', PATHS.matrix], ['summary', PATHS.summary], ['classReceipt', PATHS.classReceipt], ['manifest', PATHS.manifest], ['closure', PATHS.closure], ['schema', PATHS.schema]];
  for (const [key, rel] of mapping) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, jsonBytes(bundle[key]));
  }
  return bundle;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? '--check';
  if (mode === '--write') {
    const bundle = writeExpectedBundle(ROOT);
    console.log(`RD-03 Wave-03 terminal product written: ${bundle.matrix.counts.terminal_fields} / ${bundle.matrix.counts.required_fields} terminal, ${bundle.matrix.current_result.terminal_state}`);
  } else if (mode === '--check') {
    const bundle = checkCommittedBundle(ROOT);
    console.log(`RD-03 Wave-03 terminal product deterministic: ${bundle.matrix.counts.terminal_fields} / ${bundle.matrix.counts.required_fields} terminal, manifest ${bundle.manifest.combined_sha256}`);
  } else {
    console.error('usage: build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery.mjs [--write|--check]');
    process.exit(2);
  }
}
