#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-24.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-24-model-update-handoff.json'), 'utf8'));
const clone = () => structuredClone(original);
const expectRefusal = (name, mutate) => {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateContract(candidate), undefined, name);
};

const mutations = [
  ['inflate source count', (x) => { x.counts.source_records = 7; }],
  ['drop self-correction count', (x) => { x.counts.direct_self_correction_records = 0; }],
  ['invent second counterevidence intake', (x) => { x.counts.live_counterevidence_intake_records = 2; }],
  ['invent sole policy object', (x) => { x.counts.later_collective_policy_objects = 2; }],
  ['erase model support', (x) => { x.counts.model_elasticity_supports_added = 0; }],
  ['inflate model support', (x) => { x.counts.model_elasticity_supports_added = 2; }],
  ['claim eight dimensions', (x) => { x.counts.supported_dimensions_after_update = 8; }],
  ['invent handoff record', (x) => { x.counts.handoff_continuity_records = 4; }],
  ['erase custody refinement', (x) => { x.counts.custody_scope_refinements = 0; }],
  ['invent direct handoff', (x) => { x.counts.direct_handoff_receipts = 1; }],
  ['award surplus', (x) => { x.counts.support_adjusted_surplus_supports = 1; }],
  ['invent review response', (x) => { x.counts.external_review_responses_received = 1; }],
  ['invent completed review', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['promote complete operator', (x) => { x.counts.complete_operator_findings = 1; }],
  ['authorize field test count', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['authorize followup', (x) => { x.counts.custodian_followups_authorized = 1; }],
  ['invent subject contact', (x) => { x.counts.source_subject_contacts = 1; }],
  ['authorize collaboration', (x) => { x.counts.bounded_collaborations_authorized = 1; }],
  ['create promotion', (x) => { x.counts.promotions = 1; }],
  ['create rank count', (x) => { x.counts.person_rankings = 1; }],
  ['create profile', (x) => { x.counts.public_identity_profiles = 1; }],
  ['create graph count', (x) => { x.counts.graph_effects = 1; }],
  ['remove model elasticity from vector', (x) => { x.candidate_state.supported_dimensions = x.candidate_state.supported_dimensions.filter((v) => v !== 'model_elasticity'); }],
  ['add surplus to vector', (x) => { x.candidate_state.supported_dimensions.push('support_adjusted_surplus'); }],
  ['erase unresolved surplus', (x) => { x.candidate_state.unresolved_dimensions = []; }],
  ['promote model state', (x) => { x.candidate_state.new_dimension.state = 'independently_reviewed'; }],
  ['claim independent review on dimension', (x) => { x.candidate_state.new_dimension.independently_reviewed = true; }],
  ['claim repeated elasticity', (x) => { x.candidate_state.new_dimension.repeated_across_distinct_events = true; }],
  ['promote candidate', (x) => { x.candidate_state.complete_operator_finding = true; }],
  ['field test candidate', (x) => { x.candidate_state.field_test_eligible = true; }],
  ['invent rank', (x) => { x.candidate_state.rank = 1; }],
  ['create candidate graph', (x) => { x.candidate_state.graph_effect = 'edge'; }],
  ['remove a source', (x) => { x.source_records.pop(); }],
  ['duplicate source id', (x) => { x.source_records[5].source_id = x.source_records[0].source_id; }],
  ['downgrade primary count', (x) => { x.source_records[1].primary_record = false; }],
  ['drop direct quote custody', (x) => { x.source_records[0].direct_quote_custody = false; }],
  ['use insecure source URL', (x) => { x.source_records[0].url = 'http://example.com'; }],
  ['promote elasticity globally', (x) => { x.model_elasticity_adjudication.state = 'repeated_across_distinct_events'; }],
  ['erase model support flag', (x) => { x.model_elasticity_adjudication.dimension_support_added = false; }],
  ['remove model sequence stage', (x) => { x.model_elasticity_adjudication.sequence.pop(); }],
  ['claim model independent review', (x) => { x.model_elasticity_adjudication.independently_reviewed = true; }],
  ['claim model repetition', (x) => { x.model_elasticity_adjudication.repeated_across_distinct_events = true; }],
  ['erase model limits', (x) => { x.model_elasticity_adjudication.limits = []; }],
  ['claim direct handoff flag', (x) => { x.handoff_adjudication.direct_handoff_receipt = true; }],
  ['erase handoff record', (x) => { x.handoff_adjudication.records.pop(); }],
  ['erase handoff limits', (x) => { x.handoff_adjudication.limits = []; }],
  ['award surplus flag', (x) => { x.support_adjusted_surplus_adjudication.dimension_support_added = true; }],
  ['invent comparator', (x) => { x.support_adjusted_surplus_adjudication.resource_normalized_comparator_acquired = true; }],
  ['invent issue comment', (x) => { x.independent_review.comments_observed = 1; }],
  ['invent issue response', (x) => { x.independent_review.responses_received = 1; }],
  ['invent review execution', (x) => { x.independent_review.reviews_executed = 1; }],
  ['authorize review field test', (x) => { x.independent_review.field_test_authorized = true; }],
  ['equate self report with universal elasticity', (x) => { x.boundaries.self_reported_change_is_universal_model_elasticity = true; }],
  ['equate quote with decision file', (x) => { x.boundaries.journalist_mediated_quote_is_original_decision_file = true; }],
  ['equate concession with repair', (x) => { x.boundaries.public_concession_is_implemented_repair = true; }],
  ['equate collective object with sole authorship', (x) => { x.boundaries.collective_policy_object_is_sole_authorship = true; }],
  ['equate continuity with handoff', (x) => { x.boundaries.successor_objective_continuity_is_direct_handoff = true; }],
  ['equate expert role with acknowledgment', (x) => { x.boundaries.predecessor_remains_expert_is_recipient_acknowledgment = true; }],
  ['turn seven dimensions into rank', (x) => { x.boundaries.seven_supported_dimensions_is_rank = true; }],
  ['turn bounded elasticity into complete operator', (x) => { x.boundaries.bounded_model_elasticity_is_complete_operator = true; }]
];

assert.equal(mutations.length, 60);
for (const [name, mutate] of mutations) expectRefusal(name, mutate);
validateContract(clone());
console.log('counter-selector-wave-24.test: 60 adversarial mutations refused');
