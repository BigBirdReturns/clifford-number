#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateSource } from '../tools/validate-counter-selector-wave-30.mjs';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync('data/project/counter-selector-wave-30-handoff-controls.json', 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

const mutations = [
  s => { s.counts.complete_direct_handoffs = 1; },
  s => { s.counts.person_dimension_supports_added = 1; },
  s => { s.counts.complete_operator_findings = 1; },
  s => { s.counts.field_test_eligible_candidates = 1; },
  s => { s.counts.contacts_authorized = 1; },
  s => { s.counts.graph_effects = 1; },
  s => { s.boundaries.role_change_is_complete_state_handoff = true; },
  s => { s.boundaries.vote_is_credential_transfer = true; },
  s => { s.boundaries.current_title_is_recipient_acknowledgment = true; },
  s => { s.boundaries.key_rotation_is_knowledge_transfer = true; },
  s => { s.boundaries.successor_action_is_predecessor_handoff = true; },
  s => { s.boundaries.continuous_operation_is_complete_custody = true; },
  s => { s.boundaries.transition_plan_is_completed_transition = true; },
  s => { s.boundaries.manual_fallback_is_equivalent_automation = true; },
  s => { s.boundaries.positive_control_is_candidate_promotion = true; },
  s => { s.boundaries.function_refinement_is_person_support = true; },
  s => { s.boundaries.same_system_adjudication_is_external_review = true; },
  s => { s.boundaries.living_person_is_contact_authorization = true; },
  s => { s.boundaries.field_test_authorized = true; },
  s => { s.boundaries.promotion_authorized = true; },
  s => { s.boundaries.person_ranking_authorized = true; },
  s => { s.boundaries.public_identity_profile_authorized = true; },
  s => { s.controls[0].adjudication.direct_state_handoff = 'established'; },
  s => { s.controls[1].adjudication.direct_state_handoff = 'established'; },
  s => { s.controls[0].adjudication.person_custody_support_added = true; },
  s => { s.controls[1].adjudication.person_custody_support_added = true; },
  s => { s.controls[0].operator_finding = true; },
  s => { s.controls[1].operator_finding = true; },
  s => { s.controls[0].field_test_eligible = true; },
  s => { s.controls[1].field_test_eligible = true; },
  s => { s.controls[0].contact_authorized = true; },
  s => { s.controls[1].contact_authorized = true; },
  s => { s.controls[0].graph_effect = 'person_edge'; },
  s => { s.controls[1].graph_effect = 'provider_edge'; },
  s => { s.controls[0].components.open_decision_and_dependency_inventory = 'complete'; },
  s => { s.controls[0].components.rollback_and_safe_decline_conditions = 'complete'; },
  s => { s.controls[1].components.open_decision_and_dependency_inventory = 'complete'; },
  s => { s.controls[1].components.rollback_and_safe_decline_conditions = 'complete'; },
  s => { s.controls[0].outgoing_entity = 'unknown'; },
  s => { s.controls[0].incoming_entities = []; },
  s => { s.controls[1].incoming_entities = ['LlamaRisk']; },
  s => { s.controls[1].outgoing_entity = 'unknown'; },
  s => { s.controls[0].source_records.pop(); },
  s => { s.controls[1].source_records.pop(); },
  s => { s.controls[0].source_records[0].source_id = s.controls[0].source_records[1].source_id; },
  s => { s.controls[1].source_records[0].source_id = s.controls[0].source_records[0].source_id; },
  s => { s.controls[0].counterevidence = []; },
  s => { s.controls[1].counterevidence = []; },
  s => { s.controls[0].falsifiers = []; },
  s => { s.controls[1].falsifiers = []; },
  s => { s.handoff_contract.contact_required = true; },
  s => { s.handoff_contract.positive_control_is_promotion = true; },
  s => { s.handoff_contract.component_order.pop(); },
  s => { s.handoff_contract.complete_direct_handoff_requires = []; },
  s => { s.status = 'complete_handoff_found'; },
  s => { s.wave_id = 'CS-W30-HC-02'; },
  s => { s.parent_wave_id = 'CS-W28-BB-01'; },
  s => { s.controls.reverse(); },
  s => { s.controls[0].adjudication.authority_transfer = 'complete'; },
  s => { s.controls[1].adjudication.authority_transfer = 'complete'; },
  s => { s.controls[0].components.authority_or_credential_transfer = 'none'; },
  s => { s.controls[1].components.authority_or_credential_transfer = 'none'; },
  s => { s.controls[0].components.successor_action = 'none'; },
  s => { s.controls[1].components.successor_action = 'none'; },
  s => { s.counts.public_source_records = 12; },
  s => { s.counts.authority_transfer_events = 1; },
  s => { s.counts.successor_action_chains = 1; },
  s => { s.graph_effect = 'edge'; }
];

assert.equal(mutations.length, 68);
for (const [index, mutate] of mutations.entries()) {
  const candidate = clone(source);
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, `mutation ${index + 1} was not refused`);
}

validateSource(source);
console.log(`counter-selector-wave-30.test: ${mutations.length} adversarial mutations refused`);
