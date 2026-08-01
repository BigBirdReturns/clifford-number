#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-19.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-19-cross-domain-governance.json'), 'utf8'));
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
  ['create rank count', (x) => { x.counts.person_rankings = 1; }],
  ['create graph count', (x) => { x.counts.graph_effects = 1; }],
  ['inflate external review', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['inflate request sent', (x) => { x.counts.external_review_requests_sent = 1; }],
  ['change parent wave', (x) => { x.parent_wave_id = 'CS-W17-FA-01'; }],
  ['corrupt parent digest', (x) => { x.parent_release_sha256 = '0'.repeat(64); }],
  ['add unsupported dimension', (x) => { x.supported_trace.supported_dimensions_after_update.push('support_adjusted_surplus'); }],
  ['remove transfer support', (x) => { x.supported_trace.new_support_assignments = x.supported_trace.new_support_assignments.filter((r) => r.dimension !== 'cross_domain_transfer'); }],
  ['remove custody support', (x) => { x.supported_trace.new_support_assignments = x.supported_trace.new_support_assignments.filter((r) => r.dimension !== 'custody'); }],
  ['turn appointment into performance', (x) => { x.boundaries.appointment_is_performance = true; }],
  ['turn titles into transfer', (x) => { x.boundaries.multiple_titles_are_cross_domain_transfer = true; }],
  ['turn adjacent breadth into transfer', (x) => { x.boundaries.adjacent_domain_expansion_is_materially_unrelated_transfer = true; }],
  ['turn same program into transfer', (x) => { x.boundaries.same_program_stage_breadth_is_cross_domain_transfer = true; }],
  ['turn continuity into direct handoff', (x) => { x.boundaries.successor_continuity_is_direct_person_handoff = true; }],
  ['turn letter into state package', (x) => { x.boundaries.outgoing_transition_letter_is_complete_state_package = true; }],
  ['turn near completion into finality', (x) => { x.boundaries.treaty_near_completion_is_finality = true; }],
  ['erase support context', (x) => { x.supported_trace.support_context.substantial_support_observed = false; }],
  ['award surplus', (x) => { x.supported_trace.support_context.support_adjusted_surplus_established = true; }],
  ['promote trace', (x) => { x.supported_trace.complete_operator_finding = true; }],
  ['field-test trace', (x) => { x.supported_trace.field_test_eligible = true; }],
  ['authorize trace contact', (x) => { x.supported_trace.contact_authorized = true; }],
  ['authorize trace profile', (x) => { x.supported_trace.public_identity_profile_authorized = true; }],
  ['create trace graph', (x) => { x.supported_trace.graph_effect = 'edge'; }],
  ['reduce domain count', (x) => { x.supported_trace.new_support_assignments.find((r) => r.dimension === 'cross_domain_transfer').domain_receipts.pop(); }],
  ['duplicate domain', (x) => { x.supported_trace.new_support_assignments.find((r) => r.dimension === 'cross_domain_transfer').domain_receipts[2].domain = 'multilateral_oceans_governance'; }],
  ['erase operation signature', (x) => { x.supported_trace.new_support_assignments.find((r) => r.dimension === 'cross_domain_transfer').operation_signature = []; }],
  ['erase transfer ceiling', (x) => { x.supported_trace.new_support_assignments.find((r) => r.dimension === 'cross_domain_transfer').ceiling = 'three appointments prove transfer'; }],
  ['convert custody to direct handoff', (x) => { x.supported_trace.new_support_assignments.find((r) => r.dimension === 'custody').ceiling = 'This is a direct handoff.'; }],
  ['advance Olivieri control', (x) => { x.matched_controls.find((r) => r.candidate_id === 'CS-C0005').cross_domain_transfer_supported = true; }],
  ['advance McDonald control', (x) => { x.matched_controls.find((r) => r.source_identity === 'Allan McDonald').new_dimension_supports = 1; }],
  ['drop a control', (x) => { x.matched_controls.pop(); }],
  ['duplicate source id', (x) => { x.sources[11].source_id = x.sources[10].source_id; }],
  ['remove source limit', (x) => { x.sources[0].limits = []; }],
  ['use unapproved host', (x) => { x.sources[0].url = 'https://example.com/story'; }],
  ['refer to missing source', (x) => { x.supported_trace.new_support_assignments[1].source_ids = ['CS-W19-S999']; }],
  ['reveal identity in export', (x) => { x.external_review_export_update.source_identity_omitted_from_export = false; }],
  ['execute external review', (x) => { x.external_review_export_update.external_review_executed = true; }],
  ['authorize review contact', (x) => { x.external_review_export_update.contact_authorized = true; }],
  ['authorize review field test', (x) => { x.external_review_export_update.field_test_authorized = true; }],
  ['create export graph', (x) => { x.external_review_export_update.graph_effect = 'edge'; }],
  ['authorize acquisition contact', (x) => { x.acquisition_lanes[0].contact_authorized = true; }],
  ['reopen Richardson transfer', (x) => { x.acquisition_lanes.find((r) => r.subject === 'Elliot Richardson').required_objects.push('materially unrelated-domain transfer artifact'); }]
];

assert.equal(mutations.length, 46);
for (const [name, mutate] of mutations) expectRefusal(name, mutate);
validateContract(clone());
console.log('counter-selector-wave-19.test: 46 adversarial mutations refused');
