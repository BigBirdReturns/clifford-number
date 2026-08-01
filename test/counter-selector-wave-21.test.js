#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-21.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-21-gate-exhaustion.json'), 'utf8'));
const clone = () => structuredClone(original);
const expectRefusal = (name, mutate) => {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateContract(candidate), undefined, name);
};

const mutations = [
  ['inflate complete operator count', (x) => { x.counts.complete_operator_findings = 1; }],
  ['inflate field-test count', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['inflate new dimension count', (x) => { x.counts.new_dimension_supports = 1; }],
  ['inflate model elasticity support count', (x) => { x.counts.new_model_elasticity_supports = 1; }],
  ['inflate surplus support count', (x) => { x.counts.new_support_adjusted_surplus_supports = 1; }],
  ['inflate direct handoff count', (x) => { x.counts.direct_handoff_receipts = 1; }],
  ['inflate archive sent count', (x) => { x.counts.archive_requests_sent = 1; }],
  ['inflate external review response count', (x) => { x.counts.external_review_responses_received = 1; }],
  ['inflate external review executed count', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['authorize subject contact count', (x) => { x.counts.source_subject_contacts_authorized = 1; }],
  ['authorize custodian contact count', (x) => { x.counts.custodian_contacts_authorized = 1; }],
  ['authorize collaboration count', (x) => { x.counts.bounded_collaborations_authorized = 1; }],
  ['create promotion count', (x) => { x.counts.promotions = 1; }],
  ['create ranking count', (x) => { x.counts.person_rankings = 1; }],
  ['create profile count', (x) => { x.counts.public_identity_profiles = 1; }],
  ['create graph count', (x) => { x.counts.graph_effects = 1; }],
  ['change parent main', (x) => { x.parent_main_sha = '0'.repeat(40); }],
  ['change parent wave', (x) => { x.parent_wave_id = 'CS-W19-XD-01'; }],
  ['corrupt parent release digest', (x) => { x.parent_release_sha256 = '0'.repeat(64); }],
  ['add supported surplus dimension', (x) => { x.candidate_gate_state.supported_dimensions_after_exhaustion.push('support_adjusted_surplus'); }],
  ['remove unresolved surplus', (x) => { x.candidate_gate_state.unresolved_dimensions_after_exhaustion = ['model_elasticity']; }],
  ['promote candidate', (x) => { x.candidate_gate_state.complete_operator_finding = true; }],
  ['field-test candidate', (x) => { x.candidate_gate_state.field_test_eligible = true; }],
  ['authorize candidate contact', (x) => { x.candidate_gate_state.contact_authorized = true; }],
  ['authorize candidate profile', (x) => { x.candidate_gate_state.public_identity_profile_authorized = true; }],
  ['create candidate graph', (x) => { x.candidate_gate_state.graph_effect = 'edge'; }],
  ['drop one gate', (x) => { x.candidate_gate_state.gate_results.pop(); }],
  ['duplicate gate', (x) => { x.candidate_gate_state.gate_results[5].gate = x.candidate_gate_state.gate_results[4].gate; }],
  ['clear corroboration gate', (x) => { x.candidate_gate_state.gate_results[0].cleared = true; }],
  ['upgrade person causality in gate state', (x) => { x.candidate_gate_state.gate_results[0].state = 'person_causality_established'; }],
  ['clear model gate', (x) => { x.candidate_gate_state.gate_results[1].cleared = true; }],
  ['clear surplus gate', (x) => { x.candidate_gate_state.gate_results[2].cleared = true; }],
  ['clear handoff gate', (x) => { x.candidate_gate_state.gate_results[3].cleared = true; }],
  ['claim archive sent gate', (x) => { x.candidate_gate_state.gate_results[4].state = 'requests_sent'; }],
  ['claim external review complete gate', (x) => { x.candidate_gate_state.gate_results[5].state = 'external_review_completed'; }],
  ['upgrade corroboration causality', (x) => { x.contemporaneous_corroboration[0].person_causality_upgraded = true; }],
  ['drop corroboration record', (x) => { x.contemporaneous_corroboration.pop(); }],
  ['support retrospective update as elasticity', (x) => { x.model_elasticity_tests[0].supported = true; }],
  ['erase model missing sequence', (x) => { x.model_elasticity_tests[1].missing_sequence = []; }],
  ['rename model classification to support', (x) => { x.model_elasticity_tests[2].classification = 'bounded_support'; }],
  ['award support-adjusted surplus', (x) => { x.support_adjusted_surplus_adjudication.supported = true; }],
  ['erase heavy support', (x) => { x.support_adjusted_surplus_adjudication.substantial_support_observed = false; }],
  ['drop surplus comparator', (x) => { x.support_adjusted_surplus_adjudication.matched_comparator_lanes.pop(); }],
  ['claim normalized comparator', (x) => { x.support_adjusted_surplus_adjudication.matched_comparator_lanes[0].reason_not_normalized = 'fully normalized and decisive'; }],
  ['establish direct handoff', (x) => { x.direct_handoff_adjudication.established = true; }],
  ['add direct handoff receipt', (x) => { x.direct_handoff_adjudication.direct_handoff_receipts = 1; }],
  ['drop handoff route', (x) => { x.direct_handoff_adjudication.routes_tested.pop(); }],
  ['mark archive request sent', (x) => { x.archive_request_packets[0].state = 'sent'; }],
  ['execute archive route', (x) => { x.archive_request_packets[1].route_executed = true; }],
  ['authorize archive contact', (x) => { x.archive_request_packets[2].contact_authorized = true; }],
  ['close review request state', (x) => { x.external_review.request_opened = false; }],
  ['record external review response', (x) => { x.external_review.responses_received = 1; }],
  ['execute external review', (x) => { x.external_review.external_review_executed = true; }],
  ['authorize external field test', (x) => { x.external_review.field_test_authorized = true; }],
  ['create external review graph', (x) => { x.external_review.graph_effect = 'edge'; }],
  ['authorize gate exhaustion as operator', (x) => { x.boundaries.gate_exhaustion_is_complete_operator = true; }]
];

assert.equal(mutations.length, 56);
for (const [name, mutate] of mutations) expectRefusal(name, mutate);
validateContract(clone());
console.log('counter-selector-wave-21.test: 56 adversarial mutations refused');
