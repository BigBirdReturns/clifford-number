#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../tools/validate-counter-selector-wave-16.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-16-targeted-receipts.json'), 'utf8'));
const clone = () => structuredClone(source);
const mutations = [
  (x) => { x.counts.field_test_eligible_candidates = 1; },
  (x) => { x.counts.complete_operator_findings = 1; },
  (x) => { x.counts.person_rankings = 1; },
  (x) => { x.counts.public_identity_releases = 1; },
  (x) => { x.counts.graph_effects = 1; },
  (x) => { x.counts.external_selector_reviews = 1; },
  (x) => { x.counts.contacts_authorized = 1; },
  (x) => { x.counts.promotions = 1; },
  (x) => { x.counts.new_person_bounded_supports = 5; },
  (x) => { x.counts.person_attributable_bounded_supports_total = 12; },
  (x) => { x.counts.targeted_source_records = 9; },
  (x) => { x.counts.route_only_sources = 2; },
  (x) => { x.candidate_updates[0].new_supported_dimensions.pop(); },
  (x) => { x.candidate_updates[0].supported_dimensions_after_update.pop(); },
  (x) => { x.candidate_updates[0].unresolved_dimensions.push('custody'); },
  (x) => { x.candidate_updates[0].support_context.support_adjusted_surplus_established = true; },
  (x) => { x.candidate_updates[0].field_test_eligible = true; },
  (x) => { x.candidate_updates[0].complete_operator_finding = true; },
  (x) => { x.candidate_updates[0].contact_authorized = true; },
  (x) => { x.candidate_updates[1].new_supported_dimensions.push('custody'); },
  (x) => { x.candidate_updates[1].external_second_party_review_ready = true; },
  (x) => { x.candidate_updates[2].new_supported_dimensions = []; },
  (x) => { x.candidate_updates[2].supported_dimensions_after_update.pop(); },
  (x) => { x.candidate_updates[2].receipt_findings[1].state = 'bounded_support_direct_handoff'; },
  (x) => { x.candidate_updates[2].graph_effect = 'edge'; },
  (x) => { x.sources[1].source_id = x.sources[0].source_id; },
  (x) => { x.sources.pop(); },
  (x) => { x.sources[4].record_state = 'full_text_pdf_acquired'; },
  (x) => { x.sources[0].limits = []; },
  (x) => { x.candidate_updates[0].receipt_findings[0].ceiling = ''; },
  (x) => { x.boundaries.independent_source_inquiry_is_external_selector_review = true; },
  (x) => { x.boundaries.safe_patient_transition_is_independent_project_handoff = true; },
  (x) => { x.boundaries.successor_institutional_continuity_is_direct_person_handoff = true; },
  (x) => { x.boundaries.new_bounded_support_is_field_test_eligibility = true; },
  (x) => { x.boundaries.supported_dimension_count_is_rank = true; },
  (x) => { x.boundaries.public_identity_release_authorized = true; }
];

assert.equal(mutations.length, 36);
assert.equal(validateContract(clone()), true);
for (const mutate of mutations) {
  const specimen = clone();
  mutate(specimen);
  assert.throws(() => validateContract(specimen));
}
console.log(`counter-selector-wave-16.test: ${mutations.length} adversarial mutations refused`);
