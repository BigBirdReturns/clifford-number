#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const PARENT_PATH = 'data/intake/status-sovereignty-rd06-dcgsa-support-exit.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-06-C01.json';
export const OUTPUT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd06-offeror-universe/field-matrix.json';
const EXPECTED_PARENT_SHA256 = '68e10fd794ca8a49c3d52e5456c04add0853d9e1eb6b79af20d2c81734622334';
const EXPECTED_INPUT_MANIFEST_SHA256 = 'ab710d4112396b6bfa58da643faf56ee6a3446c0b7dd653401e30349511ec4ac';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const field = (state, value, sourceIds, note, terminal = state === 'observed') => ({
  state,
  value,
  source_ids: sourceIds,
  note,
  fixed_protocol_complete: false,
  terminal_for_class_closure: terminal
});

export const REQUIRED_FIELDS = [
  'stable_proposal_slot',
  'legal_offeror_and_bidding_entity',
  'team_prime_subcontractor_and_architecture_identity_where_public',
  'proposal_status',
  'award_rejection_withdrawal_nonresponsive_or_unresolved_state',
  'evaluation_or_protest_cross_reference',
  'source_identity_and_exact_custody',
  'identity_confidence_and_alternative_candidates',
  'public_restricted_or_unavailable_classification',
  'terminal_proposal_slot_state'
];

const named = [
  {
    slot_id: 'CD1-PROP-NAMED-RAYTHEON',
    offeror: 'Raytheon',
    disposition: 'named_awardee',
    evaluation_key: 'Raytheon',
    confidence: 'exact_public_decision_identity'
  },
  {
    slot_id: 'CD1-PROP-NAMED-PALANTIR',
    offeror: 'Palantir',
    disposition: 'named_awardee',
    evaluation_key: 'Palantir',
    confidence: 'exact_public_decision_identity'
  },
  {
    slot_id: 'CD1-PROP-NAMED-GENERAL-DYNAMICS',
    offeror: 'General Dynamics Mission Systems, Inc.',
    disposition: 'named_rejected_offeror',
    evaluation_key: 'General_Dynamics',
    confidence: 'exact_public_decision_identity'
  }
];

export function buildMatrix() {
  const parentBody = fs.readFileSync(path.join(ROOT, PARENT_PATH));
  if (sha256(parentBody) !== EXPECTED_PARENT_SHA256) throw new Error('RD06 parent exact-byte digest changed');
  const parent = JSON.parse(parentBody.toString('utf8'));
  const seed = readJson(SEED_PATH);
  if (seed.input_manifest?.combined_sha256 !== EXPECTED_INPUT_MANIFEST_SHA256) throw new Error('RD06 seed manifest changed');
  if (parent.recovered_denominators?.later_procurement_proposals_received !== 8) throw new Error('RD06 proposal denominator changed');
  if (parent.recovered_denominators?.publicly_named_offerors !== 3 || parent.recovered_denominators?.publicly_unresolved_offeror_identities !== 5) throw new Error('RD06 named/unresolved denominator changed');

  const namedSlots = named.map((spec) => {
    const evaluation = parent.evaluation_control?.[spec.evaluation_key];
    if (!evaluation) throw new Error(`${spec.slot_id}: evaluation control missing`);
    return {
      slot_id: spec.slot_id,
      slot_basis: 'repository-stable analytical slot keyed to a public offeror identity; not an original submission ordinal',
      identity_state: 'publicly_named',
      fields: {
        stable_proposal_slot: field('observed', spec.slot_id, ['SSC-RD06-S004'], 'Stable analytical identity only; it does not claim original proposal order.', true),
        legal_offeror_and_bidding_entity: field('observed', spec.offeror, ['SSC-RD06-S004'], 'Exact public decision label retained without parent, affiliate, or architecture substitution.', true),
        team_prime_subcontractor_and_architecture_identity_where_public: field('not_publicly_recovered', null, [], 'Offeror identity is not silently converted into architecture, team, product, or subcontractor identity.', false),
        proposal_status: field('observed', 'proposal_received_and_publicly_evaluated', ['SSC-RD06-S004'], 'The public decision records a proposal and a bounded evaluation.', true),
        award_rejection_withdrawal_nonresponsive_or_unresolved_state: field('observed', spec.disposition, ['SSC-RD06-S004'], 'Award or rejection state is preserved separately from technical superiority and later performance.', true),
        evaluation_or_protest_cross_reference: field('observed', { decision: 'General Dynamics Mission Systems, Inc., B-416181', evaluation }, ['SSC-RD06-S004'], 'Bounded public evaluation and protest record; not a complete source-selection file.', true),
        source_identity_and_exact_custody: field('observed', { parent_path: PARENT_PATH, parent_sha256: EXPECTED_PARENT_SHA256, seed_path: SEED_PATH, seed_input_manifest_sha256: EXPECTED_INPUT_MANIFEST_SHA256, source_id: 'SSC-RD06-S004' }, ['SSC-RD06-S004'], 'Exact repository custody for the public decision-derived fields.', true),
        identity_confidence_and_alternative_candidates: field('observed', { confidence: spec.confidence, alternative_candidates: [] }, ['SSC-RD06-S004'], 'No alternative identity is introduced where the public decision names the offeror.', true),
        public_restricted_or_unavailable_classification: field('observed', 'public_identity_and_disposition_observed_remaining_team_and_architecture_fields_open', ['SSC-RD06-S004'], 'Public identity does not make every required field public or complete.', true),
        terminal_proposal_slot_state: field('observed', spec.disposition, ['SSC-RD06-S004'], 'Named slot is terminal for identity/disposition only; the class remains open until all eight slots and required fields are terminal.', true)
      },
      slot_result: {
        fixed_protocol_executed: false,
        terminal_fields: 9,
        required_fields: REQUIRED_FIELDS.length,
        slot_closed_for_identity_and_disposition: true,
        complete_offeror_team_architecture_record: false,
        terminal_state: spec.disposition
      }
    };
  });

  const unresolvedSlots = Array.from({ length: 5 }, (_, index) => {
    const ordinal = String(index + 1).padStart(2, '0');
    const slotId = `CD1-PROP-UNRESOLVED-${ordinal}`;
    return {
      slot_id: slotId,
      slot_basis: 'repository-stable unresolved analytical slot; not an original submission ordinal and not a guessed offeror',
      identity_state: 'public_identity_unresolved',
      fields: {
        stable_proposal_slot: field('observed', slotId, ['SSC-RD06-S004'], 'Preserves one of the five affirmative unresolved proposal identities without inventing order.', true),
        legal_offeror_and_bidding_entity: field('not_publicly_recovered', null, [], 'No offeror is guessed from market participation, later awards, press coverage, or technical similarity.', false),
        team_prime_subcontractor_and_architecture_identity_where_public: field('not_publicly_recovered', null, [], 'No architecture or subcontractor is substituted for the missing offeror identity.', false),
        proposal_status: field('observed', 'proposal_received_identity_unresolved', ['SSC-RD06-S004'], 'The eight-proposal denominator affirmatively includes this unresolved slot.', true),
        award_rejection_withdrawal_nonresponsive_or_unresolved_state: field('not_publicly_recovered', 'unresolved_public_disposition', [], 'Award, rejection, withdrawal, and nonresponsiveness remain distinct and unguessed.', false),
        evaluation_or_protest_cross_reference: field('not_publicly_recovered', null, [], 'The named evaluation table is not copied onto an unidentified proposal.', false),
        source_identity_and_exact_custody: field('observed', { parent_path: PARENT_PATH, parent_sha256: EXPECTED_PARENT_SHA256, seed_path: SEED_PATH, seed_input_manifest_sha256: EXPECTED_INPUT_MANIFEST_SHA256, denominator_source_id: 'SSC-RD06-S004' }, ['SSC-RD06-S004'], 'Custody proves the unresolved denominator member, not its identity or disposition.', true),
        identity_confidence_and_alternative_candidates: field('not_publicly_recovered', { confidence: 'unresolved', alternative_candidates: [] }, [], 'An empty candidate list records no admissible public candidate, not nonexistence.', false),
        public_restricted_or_unavailable_classification: field('not_publicly_recovered', 'fixed_public_record_protocol_pending', [], 'Restricted or unavailable may be assigned only after the same fixed protocol is completed for this slot.', false),
        terminal_proposal_slot_state: field('not_publicly_recovered', 'still_open', [], 'The slot remains open until identity and disposition receive an allowed terminal state.', false)
      },
      slot_result: {
        fixed_protocol_executed: false,
        terminal_fields: 3,
        required_fields: REQUIRED_FIELDS.length,
        slot_closed_for_identity_and_disposition: false,
        complete_offeror_team_architecture_record: false,
        terminal_state: 'still_open'
      }
    };
  });

  const slots = [...namedSlots, ...unresolvedSlots];
  const matrix = {
    schema_version: 'ssc-rd-wave02-rd06-offeror-universe-field-matrix@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-06-C01',
    issue: 791,
    as_of: '2026-08-02',
    status: 'immutable_eight_slot_field_matrix_five_unresolved_pending_fixed_protocol',
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
      proposal_slots: 8,
      publicly_named_offerors: 3,
      unresolved_offeror_identities: 5,
      awardees: 2,
      named_rejected_offerors: 1,
      slot_membership_frozen: true,
      analytical_slot_is_original_submission_ordinal: false,
      silent_slot_removal_allowed: false,
      source_count_is_unit_denominator: false,
      outcome_based_selection_allowed: false
    },
    required_fields: REQUIRED_FIELDS,
    permitted_field_states: ['observed', 'not_publicly_recovered', 'source_restricted', 'source_unavailable_after_fixed_protocol', 'public_identity_ambiguous'],
    permitted_terminal_slot_states: ['named_awardee', 'named_rejected_offeror', 'named_withdrawn_or_nonresponsive_offeror', 'identity_source_restricted', 'identity_source_unavailable_after_fixed_protocol', 'public_identity_ambiguous', 'still_open'],
    slots,
    counts: {
      proposal_slots: slots.length,
      publicly_named_offerors: slots.filter((slot) => slot.identity_state === 'publicly_named').length,
      unresolved_offeror_identities: slots.filter((slot) => slot.identity_state === 'public_identity_unresolved').length,
      named_awardees: slots.filter((slot) => slot.slot_result.terminal_state === 'named_awardee').length,
      named_rejected_offerors: slots.filter((slot) => slot.slot_result.terminal_state === 'named_rejected_offeror').length,
      fixed_protocol_completed_slots: 0,
      identity_and_disposition_terminal_slots: slots.filter((slot) => slot.slot_result.slot_closed_for_identity_and_disposition).length,
      complete_offeror_team_architecture_records: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    current_result: {
      terminal_state: 'field_matrix_frozen_five_unresolved_slots_require_fixed_protocol',
      exact_eight_slot_denominator_bound: true,
      named_public_identities_reconciled: 3,
      unresolved_slots_terminally_classified: 0,
      fixed_protocol_complete: false,
      class_closed: false,
      technical_superiority_finding: false,
      favoritism_finding: false,
      foreclosure_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      reviewed_disposition_changed: false,
      project_blocking: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      proposal_count_is_complete_named_offeror_universe: false,
      named_offeror_is_named_architecture: false,
      award_is_technical_superiority: false,
      rejection_is_absence_of_viable_counterfactual: false,
      public_competition_is_equal_support: false,
      protest_denial_is_complete_fairness: false,
      unresolved_identity_is_nonexistent_offeror: false,
      Palantir_presence_is_coordination_or_common_purpose: false,
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
  console.log(`build-rd06-field-matrix: ${matrix.slots.length} slots, ${matrix.required_fields.length} required fields, ${matrix.counts.unresolved_offeror_identities} unresolved, class open`);
}
