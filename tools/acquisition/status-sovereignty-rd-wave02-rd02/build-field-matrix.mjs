#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const PARENT_PATH = 'data/intake/status-sovereignty-rd02-sbicct-state-transitions.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-02-C04.json';
export const OUTPUT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd02-license-leverage/field-matrix.json';
const EXPECTED_PARENT_SHA256 = 'c856caa5406ae49e150b2151848273b01e400edd14019eda468d9b0fd7a2c446';
const EXPECTED_INPUT_MANIFEST_SHA256 = '657fdf875e175150daaa8d213ea7fd1f4baa5eaa82f03aad4d070bd1e0331b7c';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const field = (state, value, sourceIds, note, terminal = state === 'observed') => ({
  state,
  value,
  source_ids: sourceIds,
  note,
  fixed_protocol_complete: terminal,
  terminal_for_class_closure: terminal
});

export const REQUIRED_FIELDS = [
  'legal_vehicle_or_withheld_state_label',
  'initial_state_and_date',
  'later_license_state_and_date',
  'leveraged_or_non_leveraged_license_state',
  'public_leverage_commitment_amount_and_date',
  'actual_sba_guaranteed_leverage_draw_amount_and_date',
  'fee_and_pricing_terms',
  'covenants_and_remedies',
  'amendments_waivers_suspension_surrender_or_termination',
  'source_identities_and_exact_custody'
];

export function buildMatrix() {
  const parentBody = fs.readFileSync(path.join(ROOT, PARENT_PATH));
  if (sha256(parentBody) !== EXPECTED_PARENT_SHA256) throw new Error('RD02 parent exact-byte digest changed');
  const parent = JSON.parse(parentBody.toString('utf8'));
  const seed = readJson(SEED_PATH);
  if (seed.input_manifest.combined_sha256 !== EXPECTED_INPUT_MANIFEST_SHA256) throw new Error('RD02 seed manifest changed');
  if (!Array.isArray(parent.cohort_rows) || parent.cohort_rows.length !== 18) throw new Error('RD02 cohort denominator changed');

  const rows = parent.cohort_rows.map((sourceRow) => {
    const withheld = sourceRow.row === 18;
    const laterObserved = sourceRow.later_license_state === 'licensed_directory_observed' || sourceRow.later_license_state === 'licensed_in_first_cohort';
    const laterValue = sourceRow.later_license_state === 'licensed_directory_observed'
      ? { state: 'licensed_directory_observed', directory_vintage_year: sourceRow.directory_vintage_year }
      : sourceRow.later_license_state === 'licensed_in_first_cohort'
        ? { state: 'licensed_in_first_cohort', as_of: '2025-01-17' }
        : null;
    const identityState = withheld ? 'identity_withheld_under_policy' : 'publicly_named';
    return {
      row: sourceRow.row,
      legal_vehicle: sourceRow.legal_vehicle,
      identity_state: identityState,
      parent_state: sourceRow,
      fields: {
        legal_vehicle_or_withheld_state_label: field(
          withheld ? 'identity_withheld_under_policy' : 'observed',
          sourceRow.legal_vehicle,
          ['SSC-RD02-S002', 'SSC-RD02-S003'],
          withheld ? 'The eighteenth identity is deliberately retained under the SBA withholding state.' : 'Exact legal-vehicle label retained from the frozen eighteen-row cohort.',
          true
        ),
        initial_state_and_date: field(
          'observed',
          { state: sourceRow.initial_state_as_of_2025_01_17, as_of: '2025-01-17' },
          ['SSC-RD02-S002', 'SSC-RD02-S003'],
          'Initial cohort state reproduced from the canonical parent execution.',
          true
        ),
        later_license_state_and_date: field(
          laterObserved ? 'observed' : (withheld ? 'identity_withheld_under_policy' : 'not_publicly_recovered'),
          laterValue,
          laterObserved ? ['SSC-RD02-S005'] : [],
          laterObserved ? 'Later exact directory state retained from the parent execution.' : 'No exact later-license disposition is admitted before the fixed protocol is executed.',
          laterObserved
        ),
        leveraged_or_non_leveraged_license_state: field('not_publicly_recovered', null, [], 'Requires exact license and leverage-authority records.', false),
        public_leverage_commitment_amount_and_date: field('not_publicly_recovered', null, [], 'Projected aggregate program capital is not a row-level commitment.', false),
        actual_sba_guaranteed_leverage_draw_amount_and_date: field('not_publicly_recovered', null, [], 'License or commitment is not an actual draw.', false),
        fee_and_pricing_terms: field('not_publicly_recovered', null, [], 'No zero or generic program term is substituted for row-specific pricing.', false),
        covenants_and_remedies: field('not_publicly_recovered', null, [], 'Row-specific covenants and remedies require exact custody.', false),
        amendments_waivers_suspension_surrender_or_termination: field('not_publicly_recovered', null, [], 'No absence is inferred from an unrecovered public record.', false),
        source_identities_and_exact_custody: field(
          'observed',
          {
            parent_path: PARENT_PATH,
            parent_sha256: EXPECTED_PARENT_SHA256,
            seed_path: SEED_PATH,
            seed_input_manifest_sha256: EXPECTED_INPUT_MANIFEST_SHA256,
            parent_source_ids: ['SSC-RD02-S002', 'SSC-RD02-S003', 'SSC-RD02-S005']
          },
          ['SSC-RD02-S002', 'SSC-RD02-S003', 'SSC-RD02-S005'],
          'Custody identifies the parent cohort and later directory source; it does not prove unobserved leverage terms.',
          true
        )
      },
      row_result: {
        fixed_protocol_executed: false,
        terminal_fields: laterObserved ? 4 : 3,
        required_fields: REQUIRED_FIELDS.length,
        row_closed: false,
        terminal_state: 'still_open'
      }
    };
  });

  const matrix = {
    schema_version: 'ssc-rd-wave02-rd02-license-leverage-field-matrix@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-02-C04',
    issue: 787,
    as_of: '2026-08-02',
    status: 'immutable_eighteen_row_field_matrix_pending_fixed_protocol',
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
      rows: 18,
      publicly_named_rows: 17,
      withheld_rows: 1,
      row_membership_frozen: true,
      silent_row_removal_allowed: false,
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
    rows,
    counts: {
      rows: rows.length,
      publicly_named_rows: rows.filter((row) => row.identity_state === 'publicly_named').length,
      withheld_rows: rows.filter((row) => row.identity_state === 'identity_withheld_under_policy').length,
      initial_states_observed: rows.filter((row) => row.fields.initial_state_and_date.state === 'observed').length,
      later_license_states_observed: rows.filter((row) => row.fields.later_license_state_and_date.state === 'observed').length,
      fixed_protocol_completed_rows: 0,
      closed_rows: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    current_result: {
      terminal_state: 'field_matrix_frozen_fixed_protocol_pending',
      exact_eighteen_row_denominator_bound: true,
      fixed_protocol_complete: false,
      class_closed: false,
      reviewed_disposition_changed: false,
      project_blocking: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      green_light_is_license: false,
      license_is_leverage_commitment_or_draw: false,
      directory_presence_is_successful_investment: false,
      unrecovered_amount_is_zero: false,
      unrecovered_record_is_nonoccurrence: false,
      withheld_identity_may_be_silently_removed: false,
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
  console.log(`build-rd02-field-matrix: ${matrix.rows.length} rows, ${matrix.required_fields.length} required fields, class open`);
}
