#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-20.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-20-exception-falsification.json'), 'utf8'));
const clone = () => structuredClone(original);
const expectRefusal = (name, mutate) => {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateContract(candidate), undefined, name);
};

const mutations = [
  ['inflate complete operator', (x) => { x.counts.complete_operator_findings = 1; }],
  ['inflate field test', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['authorize contact count', (x) => { x.counts.contacts_authorized = 1; }],
  ['authorize collaboration count', (x) => { x.counts.bounded_collaborations_authorized = 1; }],
  ['create promotion count', (x) => { x.counts.promotions = 1; }],
  ['create rank count', (x) => { x.counts.person_rankings = 1; }],
  ['create graph count', (x) => { x.counts.graph_effects = 1; }],
  ['inflate external review', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['inflate review request', (x) => { x.counts.external_review_requests_sent = 1; }],
  ['change parent wave', (x) => { x.parent_wave_id = 'CS-W18-RC-01'; }],
  ['corrupt parent digest', (x) => { x.parent_release_sha256 = '0'.repeat(64); }],
  ['add surplus support', (x) => { x.candidate_audit.supported_dimensions_after_update.push('support_adjusted_surplus'); }],
  ['remove exception assignment', (x) => { x.candidate_audit.new_support_assignments = []; }],
  ['remove exception from vector', (x) => { x.candidate_audit.supported_dimensions_after_update = x.candidate_audit.supported_dimensions_after_update.filter((d) => d !== 'exception_handling'); }],
  ['award model elasticity', (x) => { x.candidate_audit.model_elasticity_adjudication.supported = true; }],
  ['award surplus', (x) => { x.candidate_audit.support_context.support_adjusted_surplus_established = true; }],
  ['claim direct handoff', (x) => { x.candidate_audit.custody_adjudication.direct_handoff_established = true; }],
  ['claim new custody', (x) => { x.candidate_audit.custody_adjudication.new_custody_support = true; }],
  ['erase prior custody', (x) => { x.candidate_audit.custody_adjudication.prior_bounded_law_of_sea_transition_custody_preserved = false; }],
  ['drop an intervention', (x) => { x.candidate_audit.new_support_assignments[0].interventions.pop(); }],
  ['duplicate intervention id', (x) => { x.candidate_audit.new_support_assignments[0].interventions[3].intervention_id = 'CS-W20-I003'; }],
  ['duplicate intervention gate', (x) => { x.candidate_audit.new_support_assignments[0].interventions[3].gate = x.candidate_audit.new_support_assignments[0].interventions[2].gate; }],
  ['remove intervention source', (x) => { x.candidate_audit.new_support_assignments[0].interventions[0].source_ids = []; }],
  ['drop team mechanism', (x) => { x.candidate_audit.team_mechanisms_not_person_support.pop(); }],
  ['drop update indicator', (x) => { x.candidate_audit.model_elasticity_adjudication.indicators.pop(); }],
  ['erase model threshold reason', (x) => { x.candidate_audit.model_elasticity_adjudication.reason = 'Not enough.'; }],
  ['reduce support ledger', (x) => { x.candidate_audit.support_context.observed_support = ['one']; }],
  ['drop source', (x) => { x.sources.pop(); }],
  ['duplicate source id', (x) => { x.sources[9].source_id = x.sources[8].source_id; }],
  ['use unapproved host', (x) => { x.sources[0].url = 'https://example.com/archive'; }],
  ['remove source supports', (x) => { x.sources[0].supports = []; }],
  ['remove source limits', (x) => { x.sources[0].limits = []; }],
  ['change acquisition date', (x) => { x.sources[0].acquired_on = '2026-07-31'; }],
  ['refer to missing source', (x) => { x.candidate_audit.new_support_assignments[0].source_ids = ['CS-W20-S999']; }],
  ['reveal export identity label', (x) => { x.external_review_export_update.source_identity_omitted_from_export = false; }],
  ['execute external review', (x) => { x.external_review_export_update.external_review_executed = true; }],
  ['require contact for review', (x) => { x.external_review_export_update.contact_required = true; }],
  ['authorize export contact', (x) => { x.external_review_export_update.contact_authorized = true; }],
  ['authorize export field test', (x) => { x.external_review_export_update.field_test_authorized = true; }],
  ['authorize public profile', (x) => { x.external_review_export_update.public_identity_profile_authorized = true; }],
  ['create export graph', (x) => { x.external_review_export_update.graph_effect = 'edge'; }],
  ['execute acquisition route', (x) => { x.acquisition_lanes[0].route_executed = true; }],
  ['authorize acquisition contact', (x) => { x.acquisition_lanes[0].contact_authorized = true; }],
  ['drop acquisition lane', (x) => { x.acquisition_lanes = []; }],
  ['advance title control', (x) => { x.negative_controls[0].new_dimension_supports = 1; }],
  ['create self-critique graph', (x) => { x.negative_controls[1].graph_effect = 'edge'; }],
  ['turn appointment into exception', (x) => { x.boundaries.unprecedented_appointment_is_exception_handling = true; }],
  ['turn assessment into elasticity', (x) => { x.boundaries.retrospective_assessment_change_is_model_elasticity = true; }],
  ['authorize archive contact', (x) => { x.boundaries.known_archive_route_authorizes_contact = true; }],
  ['replace next action with promotion', (x) => { x.next_action = 'Promote the candidate immediately.'; }]
];

assert.equal(mutations.length, 50);
for (const [name, mutate] of mutations) expectRefusal(name, mutate);
validateContract(clone());
console.log('counter-selector-wave-20.test: 50 adversarial mutations refused');
