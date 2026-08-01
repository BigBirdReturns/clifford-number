#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-23.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(
  path.join(root, 'data/project/counter-selector-wave-23-full-record-corroboration.json'),
  'utf8'
));
const clone = () => structuredClone(original);
const expectRefusal = (name, mutate) => {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateContract(candidate), undefined, name);
};

const mutations = [
  ['inflate source records', (x) => { x.counts.source_records = 7; }],
  ['inflate full text', (x) => { x.counts.full_text_institutional_records_acquired = 2; }],
  ['change page count', (x) => { x.counts.pages_in_full_text_record = 135; }],
  ['erase page image check', (x) => { x.counts.page_image_checks_completed = 0; }],
  ['inflate corroborations', (x) => { x.counts.person_action_corroborations = 4; }],
  ['inflate existing dimensions', (x) => { x.counts.existing_dimension_corroborations = 3; }],
  ['inflate custody refinements', (x) => { x.counts.custody_scope_refinements = 2; }],
  ['claim sole causality', (x) => { x.counts.sole_person_causality_upgrades = 1; }],
  ['claim new dimension', (x) => { x.counts.new_dimension_supports = 1; }],
  ['claim direct handoff', (x) => { x.counts.direct_handoff_receipts = 1; }],
  ['claim model elasticity', (x) => { x.counts.new_model_elasticity_supports = 1; }],
  ['claim surplus', (x) => { x.counts.new_support_adjusted_surplus_supports = 1; }],
  ['invent external response', (x) => { x.counts.external_review_responses_received = 1; }],
  ['invent external review', (x) => { x.counts.external_selector_reviews_executed = 1; }],
  ['promote complete operator', (x) => { x.counts.complete_operator_findings = 1; }],
  ['authorize field test count', (x) => { x.counts.field_test_eligible_candidates = 1; }],
  ['authorize followup count', (x) => { x.counts.custodian_followups_authorized = 1; }],
  ['invent subject contact', (x) => { x.counts.source_subject_contacts = 1; }],
  ['authorize collaboration', (x) => { x.counts.bounded_collaborations_authorized = 1; }],
  ['create promotion', (x) => { x.counts.promotions = 1; }],
  ['create rank', (x) => { x.counts.person_rankings = 1; }],
  ['create profile', (x) => { x.counts.public_identity_profiles = 1; }],
  ['create graph count', (x) => { x.counts.graph_effects = 1; }],
  ['change mutation count', (x) => { x.counts.adversarial_mutations = 55; }],
  ['add supported dimension', (x) => { x.candidate_state.supported_dimensions.push('model_elasticity'); }],
  ['remove unresolved dimension', (x) => { x.candidate_state.unresolved_dimensions = ['support_adjusted_surplus']; }],
  ['promote candidate', (x) => { x.candidate_state.complete_operator_finding = true; }],
  ['field test candidate', (x) => { x.candidate_state.field_test_eligible = true; }],
  ['rank candidate', (x) => { x.candidate_state.rank = 1; }],
  ['graph candidate', (x) => { x.candidate_state.graph_effect = 'edge'; }],
  ['remove source', (x) => { x.source_records.pop(); }],
  ['duplicate source id', (x) => { x.source_records[1].source_id = x.source_records[0].source_id; }],
  ['erase full report', (x) => { x.source_records[0].full_text_acquired = false; }],
  ['change full report pages', (x) => { x.source_records[0].page_count = 133; }],
  ['erase visual check', (x) => { x.source_records[0].page_image_checked = false; }],
  ['claim independent report review', (x) => { x.source_records[0].independent_counter_selector_review = true; }],
  ['remove corroboration', (x) => { x.corroborations.pop(); }],
  ['duplicate corroboration id', (x) => { x.corroborations[1].corroboration_id = x.corroborations[0].corroboration_id; }],
  ['award corroboration support', (x) => { x.corroborations[0].new_dimension_support = true; }],
  ['award sole causality', (x) => { x.corroborations[0].sole_person_causality_upgrade = true; }],
  ['award direct handoff', (x) => { x.corroborations[2].direct_handoff_receipt = true; }],
  ['award normalized comparator', (x) => { x.support_ledger.resource_normalized_comparator_acquired = true; }],
  ['award surplus ledger', (x) => { x.support_ledger.support_adjusted_surplus_supported = true; }],
  ['erase support element', (x) => { x.support_ledger.elements = []; }],
  ['claim UN item acquired', (x) => { x.catalogue_refinements[0].underlying_items_acquired = true; }],
  ['authorize UN followup', (x) => { x.catalogue_refinements[0].followup_authorized = true; }],
  ['change UN series', (x) => { x.catalogue_refinements[0].reference_code = 'S-0000'; }],
  ['change UN accessions', (x) => { x.catalogue_refinements[0].accessions = ['93/166']; }],
  ['change LOS boxes', (x) => { x.catalogue_refinements[1].box_range = 'I:346-393'; }],
  ['change HEW boxes', (x) => { x.catalogue_refinements[2].box_range = 'I:108-172'; }],
  ['invent issue comment', (x) => { x.independent_review.comments_observed = 1; }],
  ['invent review response', (x) => { x.independent_review.responses_received = 1; }],
  ['invent completed review', (x) => { x.independent_review.reviews_executed = 1; }],
  ['authorize review field test', (x) => { x.independent_review.field_test_authorized = true; }]
];

assert.equal(mutations.length, 54);
for (const [name, mutate] of mutations) expectRefusal(name, mutate);
validateContract(clone());
console.log('counter-selector-wave-23.test: 54 adversarial mutations refused');
