#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateSource } from '../tools/validate-counter-selector-wave-28.mjs';

const source = JSON.parse(fs.readFileSync('data/project/counter-selector-wave-28-batch-b-blind-review.json', 'utf8'));
const clone = () => structuredClone(source);
const mutations = [
  s => { s.schema_version = 'bad'; },
  s => { s.program_id = 'bad'; },
  s => { s.wave_id = 'bad'; },
  s => { s.parent_wave_id = 'bad'; },
  s => { s.sibling_wave_id = 'bad'; },
  s => { s.parent_release_sha256 = 'bad'; },
  s => { s.sibling_release_sha256 = 'bad'; },
  s => { s.status = 'promoted'; },
  s => { s.packets.pop(); },
  s => { s.disagreements.pop(); },
  s => { s.counts.source_packets_audited = 3; },
  s => { s.counts.public_source_records = 13; },
  s => { s.counts.identity_minimized_packets_created = 1; },
  s => { s.counts.identity_minimized_packets_reviewed = 1; },
  s => { s.counts.procedurally_separated_review_passes = 5; },
  s => { s.counts.external_independent_reviews = 1; },
  s => { s.counts.support_ledgers_completed = 1; },
  s => { s.counts.packets_with_person_bounded_support = 2; },
  s => { s.counts.person_bounded_dimension_supports = 4; },
  s => { s.counts.packets_with_function_bounded_support = 1; },
  s => { s.counts.function_bounded_dimension_supports = 9; },
  s => { s.counts.disagreements_preserved = 1; },
  s => { s.counts.direct_handoff_receipts = 1; },
  s => { s.counts.observed_project_successions = 1; },
  s => { s.counts.valid_resource_normalized_comparators = 1; },
  s => { s.counts.complete_operator_findings = 1; },
  s => { s.counts.field_test_eligible_candidates = 1; },
  s => { s.counts.contacts_authorized = 1; },
  s => { s.counts.bounded_collaborations_authorized = 1; },
  s => { s.counts.promotions = 1; },
  s => { s.counts.person_rankings = 1; },
  s => { s.counts.public_identity_profiles = 1; },
  s => { s.counts.graph_effects = 1; },
  s => { s.counts.adversarial_mutations = 59; },
  s => { s.review_independence.identity_labels_removed = false; },
  s => { s.review_independence.identity_blindness_claimed = true; },
  s => { s.review_independence.artifact_inferability = 'none'; },
  s => { s.review_independence.external_human_independence_claimed = true; },
  s => { s.review_independence.different_model_or_institution_claimed = true; },
  s => { s.review_independence.same_system_limitation_preserved = false; },
  s => { s.review_independence.private_identity_map_available_during_passes = true; },
  s => { s.packets[0].source_identity = 'invented person'; },
  s => { s.packets[0].person_bounded_supports.push('governed_capacity'); },
  s => { s.packets[0].function_bounded_supports.pop(); },
  s => { s.packets[1].person_bounded_supports.push('custody'); },
  s => { s.packets[1].function_bounded_supports.pop(); },
  s => { s.packets[0].review_passes.pop(); },
  s => { s.packets[1].review_passes[0].reviewer_role = 'external'; },
  s => { s.packets[1].review_passes[1].external_independence_claimed = true; },
  s => { s.packets[0].support_ledger.valid_resource_normalized_comparator = true; },
  s => { s.packets[1].support_ledger.complete_for_current_public_surface = false; },
  s => { s.packets[0].field_test_eligible = true; },
  s => { s.packets[1].operator_finding = true; },
  s => { s.packets[1].contact_authorized = true; },
  s => { s.packets[0].graph_effect = 'edge'; },
  s => { s.disagreements[0].averaged = true; },
  s => { s.disagreements[1].resolution = 'person custody supported'; },
  s => { s.boundaries.open_sourcing_is_completed_handoff = true; },
  s => { s.boundaries.internal_two_pass_review_is_external_review = true; },
  s => { s.boundaries.graph_effect = 'edge'; }
];

assert.equal(mutations.length, 60);
for (const [index, mutate] of mutations.entries()) {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, `mutation ${index + 1} should fail`);
}
validateSource(source);
console.log('counter-selector-wave-28.test: 60 adversarial mutations refused');
