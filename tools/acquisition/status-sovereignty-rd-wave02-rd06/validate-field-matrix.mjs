#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PARENT_PATH, SEED_PATH, OUTPUT_PATH, REQUIRED_FIELDS } from './build-field-matrix.mjs';

const EXPECTED_PARENT_SHA256 = '68e10fd794ca8a49c3d52e5456c04add0853d9e1eb6b79af20d2c81734622334';
const EXPECTED_INPUT_MANIFEST_SHA256 = 'ab710d4112396b6bfa58da643faf56ee6a3446c0b7dd653401e30349511ec4ac';
const EXPECTED_SLOT_IDS = [
  'CD1-PROP-NAMED-RAYTHEON',
  'CD1-PROP-NAMED-PALANTIR',
  'CD1-PROP-NAMED-GENERAL-DYNAMICS',
  'CD1-PROP-UNRESOLVED-01',
  'CD1-PROP-UNRESOLVED-02',
  'CD1-PROP-UNRESOLVED-03',
  'CD1-PROP-UNRESOLVED-04',
  'CD1-PROP-UNRESOLVED-05'
];
const PERMITTED_FIELD_STATES = new Set(['observed', 'not_publicly_recovered', 'source_restricted', 'source_unavailable_after_fixed_protocol', 'public_identity_ambiguous']);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => { if (!condition) fail(message); };
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export function validateMatrixData(value, parent, seed) {
  ok(value?.schema_version === 'ssc-rd-wave02-rd06-offeror-universe-field-matrix@1', 'schema version changed');
  ok(value?.wave_id === 'SSC-RD-W02' && value?.class_id === 'RD-06-C01' && value?.issue === 791, 'lane identity changed');
  ok(value?.as_of === '2026-08-02', 'cutoff changed');
  ok(value?.status === 'immutable_eight_slot_field_matrix_five_unresolved_pending_fixed_protocol', 'matrix status changed');
  ok(value.parent?.sha256 === EXPECTED_PARENT_SHA256, 'parent digest changed');
  ok(value.parent?.seed_input_manifest_sha256 === EXPECTED_INPUT_MANIFEST_SHA256, 'seed manifest changed');
  ok(seed?.input_manifest?.combined_sha256 === EXPECTED_INPUT_MANIFEST_SHA256, 'seed input manifest drift');
  ok(parent?.recovered_denominators?.later_procurement_proposals_received === 8, 'parent proposal denominator changed');
  ok(parent?.recovered_denominators?.publicly_named_offerors === 3, 'parent named denominator changed');
  ok(parent?.recovered_denominators?.publicly_unresolved_offeror_identities === 5, 'parent unresolved denominator changed');

  ok(JSON.stringify(value.required_fields) === JSON.stringify(REQUIRED_FIELDS), 'required fields changed');
  ok(Array.isArray(value.slots) && value.slots.length === 8, 'eight slots required');
  ok(JSON.stringify(value.slots.map((slot) => slot.slot_id)) === JSON.stringify(EXPECTED_SLOT_IDS), 'slot identity or order changed');
  ok(new Set(value.slots.map((slot) => slot.slot_id)).size === 8, 'duplicate slot ID');

  for (const slot of value.slots) {
    ok(slot.slot_basis.includes('not an original submission ordinal'), `${slot.slot_id}: ordinal boundary missing`);
    ok(slot.fields && typeof slot.fields === 'object', `${slot.slot_id}: fields missing`);
    ok(JSON.stringify(Object.keys(slot.fields)) === JSON.stringify(REQUIRED_FIELDS), `${slot.slot_id}: field set changed`);
    for (const [fieldName, field] of Object.entries(slot.fields)) {
      ok(PERMITTED_FIELD_STATES.has(field.state), `${slot.slot_id}.${fieldName}: invalid field state`);
      ok(Array.isArray(field.source_ids), `${slot.slot_id}.${fieldName}: source IDs missing`);
      ok(typeof field.note === 'string' && field.note.length > 0, `${slot.slot_id}.${fieldName}: note missing`);
      ok(field.fixed_protocol_complete === false, `${slot.slot_id}.${fieldName}: protocol prematurely complete`);
      if (field.state === 'not_publicly_recovered') ok(field.terminal_for_class_closure === false, `${slot.slot_id}.${fieldName}: unresolved field marked terminal`);
    }
  }

  const [raytheon, palantir, gd, ...unresolved] = value.slots;
  ok(raytheon.fields.legal_offeror_and_bidding_entity.value === 'Raytheon', 'Raytheon identity changed');
  ok(palantir.fields.legal_offeror_and_bidding_entity.value === 'Palantir', 'Palantir identity changed');
  ok(gd.fields.legal_offeror_and_bidding_entity.value === 'General Dynamics Mission Systems, Inc.', 'General Dynamics identity changed');
  ok(raytheon.slot_result.terminal_state === 'named_awardee' && palantir.slot_result.terminal_state === 'named_awardee', 'awardee states changed');
  ok(gd.slot_result.terminal_state === 'named_rejected_offeror', 'rejected state changed');
  ok(raytheon.fields.evaluation_or_protest_cross_reference.value.evaluation.evaluated_price_usd === parent.evaluation_control.Raytheon.evaluated_price_usd, 'Raytheon evaluation drift');
  ok(palantir.fields.evaluation_or_protest_cross_reference.value.evaluation.evaluated_price_usd === parent.evaluation_control.Palantir.evaluated_price_usd, 'Palantir evaluation drift');
  ok(gd.fields.evaluation_or_protest_cross_reference.value.evaluation.evaluated_price_usd === parent.evaluation_control.General_Dynamics.evaluated_price_usd, 'General Dynamics evaluation drift');
  ok(unresolved.length === 5, 'five unresolved slots required');
  for (const slot of unresolved) {
    ok(slot.identity_state === 'public_identity_unresolved', `${slot.slot_id}: identity state changed`);
    ok(slot.fields.legal_offeror_and_bidding_entity.value === null, `${slot.slot_id}: guessed identity introduced`);
    ok(slot.fields.identity_confidence_and_alternative_candidates.value.confidence === 'unresolved', `${slot.slot_id}: confidence changed`);
    ok(slot.fields.identity_confidence_and_alternative_candidates.value.alternative_candidates.length === 0, `${slot.slot_id}: candidate guess introduced`);
    ok(slot.fields.evaluation_or_protest_cross_reference.state === 'not_publicly_recovered' && slot.fields.evaluation_or_protest_cross_reference.value === null, `${slot.slot_id}: named evaluation copied onto unresolved slot`);
    ok(slot.fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state.state === 'not_publicly_recovered', `${slot.slot_id}: unresolved disposition promoted`);
    ok(slot.slot_result.terminal_state === 'still_open' && slot.slot_result.slot_closed_for_identity_and_disposition === false, `${slot.slot_id}: prematurely closed`);
  }

  const counts = value.counts;
  ok(counts?.proposal_slots === 8 && counts?.publicly_named_offerors === 3 && counts?.unresolved_offeror_identities === 5, 'slot accounting changed');
  ok(counts?.named_awardees === 2 && counts?.named_rejected_offerors === 1, 'named disposition accounting changed');
  ok(counts?.fixed_protocol_completed_slots === 0 && counts?.identity_and_disposition_terminal_slots === 3, 'terminal accounting changed');
  ok(counts?.complete_offeror_team_architecture_records === 0, 'complete records prematurely asserted');
  ok(counts?.external_contacts === 0 && counts?.external_reviews === 0 && counts?.graph_effects === 0, 'outside authority changed');

  const result = value.current_result;
  ok(result?.fixed_protocol_complete === false && result?.class_closed === false, 'class prematurely closed');
  ok(result?.named_public_identities_reconciled === 3 && result?.unresolved_slots_terminally_classified === 0, 'result accounting changed');
  for (const key of ['technical_superiority_finding','favoritism_finding','foreclosure_finding','coordination_finding','common_purpose_finding','reviewed_disposition_changed']) ok(result?.[key] === false, `${key} escalated`);
  ok(result?.publication_effect === 'none' && result?.adoption_effect === 'none' && result?.graph_effect === 'none', 'effect authority changed');
  ok(value.boundaries?.outside_human_dependency === false, 'outside-human dependency introduced');
  for (const [key, state] of Object.entries(value.boundaries || {})) {
    if (key === 'graph_effect') ok(state === 'none', 'graph effect changed');
    else ok(state === false, `${key} weakened`);
  }
  return value;
}

export function validateMatrixRepository() {
  const parentBody = fs.readFileSync(path.join(ROOT, PARENT_PATH));
  ok(sha256(parentBody) === EXPECTED_PARENT_SHA256, 'exact parent body digest changed');
  const parent = JSON.parse(parentBody.toString('utf8'));
  const seed = readJson(SEED_PATH);
  const value = readJson(OUTPUT_PATH);
  validateMatrixData(value, parent, seed);
  console.log('validate-rd06-field-matrix: PASS — exact 8 slots, 3 named, 5 unresolved, fixed protocol open');
  return value;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { validateMatrixRepository(); }
  catch (error) { console.error(`validate-rd06-field-matrix: ${error.message}`); process.exit(1); }
}
