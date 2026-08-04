#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const PARENT_PATH = 'data/intake/status-sovereignty-rd03-osc-instrument-lifecycle.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-03-C04.json';
export const OUTPUT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json';
const EXPECTED_PARENT_SHA256 = '3bd111cc56eb5046ed5ba2aa8a8dfdecaec9d37bbb273e6c75b695e6ae1e05a0';
const EXPECTED_INPUT_MANIFEST_SHA256 = '12da3be1a750276357c93530f7390b6925d4f556184e9654dc87339346f46a59';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const field = (state, value, sourceIds, note, terminal = state === 'observed') => ({
  state,
  value,
  source_ids: sourceIds,
  note,
  fixed_protocol_complete: terminal,
  terminal_for_class_closure: terminal
});

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

export function buildMatrix() {
  const parentBody = fs.readFileSync(path.join(ROOT, PARENT_PATH));
  if (sha256(parentBody) !== EXPECTED_PARENT_SHA256) throw new Error('RD03 parent exact-byte digest changed');
  const parent = JSON.parse(parentBody.toString('utf8'));
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), 'utf8'));
  if (seed.input_manifest.combined_sha256 !== EXPECTED_INPUT_MANIFEST_SHA256) throw new Error('RD03 seed manifest changed');
  if (!Array.isArray(parent.instruments) || parent.instruments.length !== 5) throw new Error('RD03 instrument denominator changed');

  const rows = parent.instruments.map((source) => {
    const publicRightObserved = source.companion_public_right_issued === true;
    const closeObserved = source.financial_close === true || source.executed_loan === true || source.cash_proceeds_received === true;
    return {
      instrument_id: source.instrument_id,
      borrower: source.borrower,
      parent_state: source,
      fields: {
        legal_borrower_and_material_affiliates: field('observed', { legal_borrower: source.borrower, material_affiliates: [] }, source.source_ids, 'Exact borrower label retained; affiliate denominator remains pending fixed protocol.', true),
        instrument_state_and_governing_date: field('observed', {
          bounded_state: source.bounded_state,
          announced: source.announced,
          conditional_commitment: source.conditional_commitment,
          financial_close: source.financial_close,
          executed_loan: source.executed_loan,
          cash_proceeds_received: source.cash_proceeds_received,
          governing_date: null
        }, source.source_ids, 'Parent lifecycle state is retained; a governing date still requires source-level adjudication.', true),
        principal_or_ceiling: field('not_publicly_recovered', null, [], 'Instrument labels and announcement headlines are not substituted for adjudicated principal terms.', false),
        pricing_and_cost_of_capital: field('not_publicly_recovered', null, [], 'Interest, fees, discounts, warrant economics, and subsidy terms require exact custody.', false),
        maturity_and_amortization: field('not_publicly_recovered', null, [], 'No generic or proposed tenor is promoted without governing instrument custody.', false),
        security_and_collateral: field('not_publicly_recovered', null, [], 'Security and collateral terms remain open.', false),
        seniority_and_subordination: field('not_publicly_recovered', null, [], 'No seniority inference is made from lender identity or public announcement.', false),
        warrant_or_other_public_rights: field(
          publicRightObserved ? 'observed' : 'not_publicly_recovered',
          publicRightObserved ? { companion_public_right_issued: true } : null,
          publicRightObserved ? source.source_ids : [],
          publicRightObserved ? 'Parent execution observed a companion public right for this instrument.' : 'Absence of an observed issuance is not proof that no right exists.',
          publicRightObserved
        ),
        conditions_precedent_and_close_conditions: field(
          closeObserved ? 'observed' : 'not_publicly_recovered',
          closeObserved ? { financial_close: source.financial_close, executed_loan: source.executed_loan, cash_proceeds_received: source.cash_proceeds_received } : null,
          closeObserved ? source.source_ids : [],
          closeObserved ? 'Coarse close/execution facts retained from the parent; detailed conditions remain to be adjudicated.' : 'Conditional commitment is not financial close.',
          closeObserved
        ),
        covenants_and_operating_restrictions: field('not_publicly_recovered', null, [], 'Row-specific covenants require exact governing documents.', false),
        milestones_and_performance_obligations: field('not_publicly_recovered', null, [], 'A parent false observation does not establish absence of contractual milestones.', false),
        reporting_inspection_and_information_rights: field('not_publicly_recovered', null, [], 'Reporting and inspection rights require exact source custody.', false),
        amendment_default_cure_and_enforcement: field('not_publicly_recovered', null, [], 'No amendment, default, cure, or enforcement state is inferred from silence.', false),
        source_identity_and_exact_custody: field('observed', {
          parent_path: PARENT_PATH,
          parent_sha256: EXPECTED_PARENT_SHA256,
          seed_path: SEED_PATH,
          seed_input_manifest_sha256: EXPECTED_INPUT_MANIFEST_SHA256,
          parent_source_ids: source.source_ids
        }, source.source_ids, 'Exact parent source identities are retained without expanding their claim scope.', true)
      },
      instrument_result: {
        fixed_protocol_executed: false,
        terminal_fields: 3 + (publicRightObserved ? 1 : 0) + (closeObserved ? 1 : 0),
        required_fields: REQUIRED_FIELDS.length,
        instrument_closed: false,
        terminal_state: 'still_open'
      }
    };
  });

  const matrix = {
    schema_version: 'ssc-rd-wave02-rd03-negotiated-terms-field-matrix@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-03-C04',
    issue: 788,
    as_of: '2026-08-02',
    status: 'immutable_five_instrument_field_matrix_pending_fixed_protocol',
    parent: {
      execution_id: parent.execution_id,
      path: PARENT_PATH,
      sha256: EXPECTED_PARENT_SHA256,
      seed_path: SEED_PATH,
      seed_input_manifest_sha256: EXPECTED_INPUT_MANIFEST_SHA256,
      constitution_merge: seed.constitution.merge_commit,
      frozen_execution_base: seed.frozen_execution_base
    },
    denominator_contract: {
      instruments: 5,
      instrument_ids: rows.map((row) => row.instrument_id),
      row_membership_frozen: true,
      silent_instrument_removal_allowed: false,
      outcome_based_selection_allowed: false
    },
    required_fields: REQUIRED_FIELDS,
    permitted_field_states: [
      'observed',
      'not_applicable_by_instrument_state',
      'source_restricted',
      'source_unavailable_after_fixed_protocol',
      'not_publicly_recovered',
      'identity_withheld_under_policy'
    ],
    instruments: rows,
    counts: {
      instruments: rows.length,
      executed_and_disbursed_parent_states: rows.filter((row) => row.parent_state.cash_proceeds_received === true).length,
      conditional_pre_close_parent_states: rows.filter((row) => row.parent_state.conditional_commitment === true && row.parent_state.financial_close === false).length,
      observed_companion_public_rights: rows.filter((row) => row.fields.warrant_or_other_public_rights.state === 'observed').length,
      fixed_protocol_completed_instruments: 0,
      closed_instruments: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    current_result: {
      terminal_state: 'field_matrix_frozen_fixed_protocol_pending',
      exact_five_instrument_denominator_bound: true,
      fixed_protocol_complete: false,
      class_closed: false,
      reviewed_disposition_changed: false,
      project_blocking: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      announced_is_executed: false,
      conditional_commitment_is_financial_close: false,
      executed_loan_is_cash_disbursement: false,
      source_silence_is_term_absence: false,
      unrecovered_amount_is_zero: false,
      parent_false_boolean_is_contractual_nonexistence: false,
      matrix_completion_is_evidentiary_closure: false,
      outside_human_dependency: false,
      graph_effect: 'none'
    }
  };
  fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUTPUT_PATH), stable(matrix));
  return matrix;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const matrix = buildMatrix();
  console.log(`build-rd03-field-matrix: ${matrix.instruments.length} instruments, ${matrix.required_fields.length} required fields, class open`);
}
