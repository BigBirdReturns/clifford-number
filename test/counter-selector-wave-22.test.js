#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-22.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-22-external-execution.json'), 'utf8'));
const clone = () => structuredClone(original);
const expectRefusal = (name, mutate) => {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateContract(candidate), undefined, name);
};

const mutations = [
  ['claim recipient delivery', (x) => { x.archive_requests[0].recipient_delivery_confirmed = true; }],
  ['drop gmail receipt', (x) => { x.archive_requests[0].gmail_submission_receipt = false; }],
  ['claim archive evidence', (x) => { x.archive_requests[0].evidence_objects_acquired = 1; }],
  ['claim substantive LOC response', (x) => { x.archive_requests[0].substantive_reference_response = true; }],
  ['claim substantive UN response', (x) => { x.archive_requests[1].substantive_reference_response = true; }],
  ['turn auto reply into evidence', (x) => { x.archive_requests[1].evidence_objects_acquired = 1; }],
  ['erase service suspension', (x) => { x.archive_requests[1].external_reference_service_status = 'available'; }],
  ['erase digitization suspension', (x) => { x.archive_requests[1].digitization_on_demand_status = 'available'; }],
  ['invent Carter response', (x) => { x.archive_requests[2].response_received = true; }],
  ['duplicate recipient', (x) => { x.archive_requests[2].recipient = x.archive_requests[0].recipient; }],
  ['duplicate gmail id', (x) => { x.archive_requests[2].gmail_message_id = x.archive_requests[0].gmail_message_id; }],
  ['remove route verification', (x) => { x.archive_requests[0].official_route_verified = false; }],
  ['use non-https route', (x) => { x.archive_requests[0].official_route_url = 'http://example.com'; }],
  ['inflate sent count', (x) => { x.counts.archive_requests_sent = 4; }],
  ['inflate delivery count', (x) => { x.counts.recipient_delivery_confirmations = 1; }],
  ['inflate substantive responses', (x) => { x.counts.substantive_archive_responses = 1; }],
  ['inflate archive evidence count', (x) => { x.counts.archive_evidence_objects_acquired = 1; }],
  ['inflate review response', (x) => { x.counts.external_review_responses_received = 1; }],
  ['inflate completed review', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['inflate new dimension', (x) => { x.counts.new_dimension_supports = 1; }],
  ['award model elasticity', (x) => { x.counts.new_model_elasticity_supports = 1; }],
  ['award surplus', (x) => { x.counts.new_support_adjusted_surplus_supports = 1; }],
  ['invent direct handoff', (x) => { x.counts.direct_handoff_receipts = 1; }],
  ['promote complete operator', (x) => { x.counts.complete_operator_findings = 1; }],
  ['authorize field test count', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['invent subject contact', (x) => { x.counts.source_subject_contacts = 1; }],
  ['authorize followup', (x) => { x.counts.followups_authorized = 1; }],
  ['authorize collaboration', (x) => { x.counts.bounded_collaborations_authorized = 1; }],
  ['create promotion', (x) => { x.counts.promotions = 1; }],
  ['create rank', (x) => { x.counts.person_rankings = 1; }],
  ['create profile', (x) => { x.counts.public_identity_profiles = 1; }],
  ['create graph count', (x) => { x.counts.graph_effects = 1; }],
  ['add supported dimension', (x) => { x.candidate_state.supported_dimensions.push('model_elasticity'); }],
  ['remove unresolved dimension', (x) => { x.candidate_state.unresolved_dimensions = ['support_adjusted_surplus']; }],
  ['promote candidate', (x) => { x.candidate_state.complete_operator_finding = true; }],
  ['field test candidate', (x) => { x.candidate_state.field_test_eligible = true; }],
  ['create candidate graph', (x) => { x.candidate_state.graph_effect = 'edge'; }],
  ['invent issue comment', (x) => { x.independent_review.comments_observed = 1; }],
  ['invent issue response', (x) => { x.independent_review.responses_received = 1; }],
  ['invent executed review', (x) => { x.independent_review.reviews_executed = 1; }],
  ['authorize review field test', (x) => { x.independent_review.field_test_authorized = true; }],
  ['create review graph', (x) => { x.independent_review.graph_effect = 'edge'; }],
  ['equate sent with delivery', (x) => { x.boundaries.gmail_sent_label_is_recipient_delivery = true; }],
  ['equate suspension with absence', (x) => { x.boundaries.service_suspension_is_record_absence = true; }],
  ['equate request with evidence', (x) => { x.boundaries.archive_request_sent_is_evidence_acquired = true; }],
  ['equate issue with review', (x) => { x.boundaries.open_review_issue_is_completed_review = true; }],
  ['authorize followup boundary', (x) => { x.boundaries.followup_authorized = true; }],
  ['authorize field test boundary', (x) => { x.boundaries.field_test_authorized = true; }]
];

assert.equal(mutations.length, 48);
for (const [name, mutate] of mutations) expectRefusal(name, mutate);
validateContract(clone());
console.log('counter-selector-wave-22.test: 48 adversarial mutations refused');
