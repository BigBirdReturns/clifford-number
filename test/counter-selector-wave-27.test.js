#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateSource } from '../tools/validate-counter-selector-wave-27.mjs';

const source = JSON.parse(fs.readFileSync('data/project/counter-selector-wave-27-batch-a-blind-review.json', 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

const mutations = [
  s => { s.schema_version = 'wrong'; },
  s => { s.program_id = 'wrong'; },
  s => { s.wave_id = 'CS-W27-WRONG'; },
  s => { s.parent_release_sha256 = '0'.repeat(64); },
  s => { s.status = 'promoted'; },
  s => { s.packets.pop(); },
  s => { s.disagreements.pop(); },
  s => { s.counts.source_packets_audited = 3; },
  s => { s.counts.public_source_records = 12; },
  s => { s.counts.identity_minimized_packets_created = 1; },
  s => { s.counts.procedurally_separated_review_passes = 3; },
  s => { s.counts.external_independent_reviews = 1; },
  s => { s.counts.support_ledgers_completed = 1; },
  s => { s.counts.person_bounded_dimension_supports = 6; },
  s => { s.counts.function_bounded_dimension_supports = 0; },
  s => { s.counts.disagreements_preserved = 1; },
  s => { s.counts.direct_handoff_receipts = 1; },
  s => { s.counts.valid_resource_normalized_comparators = 1; },
  s => { s.counts.complete_operator_findings = 1; },
  s => { s.counts.field_test_eligible_candidates = 1; },
  s => { s.counts.contacts_authorized = 1; },
  s => { s.counts.bounded_collaborations_authorized = 1; },
  s => { s.counts.promotions = 1; },
  s => { s.counts.person_rankings = 1; },
  s => { s.counts.public_identity_profiles = 1; },
  s => { s.counts.graph_effects = 1; },
  s => { s.counts.adversarial_mutations = 55; },
  s => { s.review_independence.identity_labels_removed = false; },
  s => { s.review_independence.identity_blindness_claimed = true; },
  s => { s.review_independence.artifact_inferability = 'low'; },
  s => { s.review_independence.external_human_independence_claimed = true; },
  s => { s.review_independence.private_identity_map_available_during_passes = true; },
  s => { s.packets[1].review_packet_id = s.packets[0].review_packet_id; },
  s => { s.packets[1].blind_token = s.packets[0].blind_token; },
  s => { s.packets[0].source_records.pop(); },
  s => { s.packets[1].source_records[0].source_id = s.packets[0].source_records[0].source_id; },
  s => { s.packets[0].source_records[0].url = 'http://example.test'; },
  s => { s.packets[0].blind_packet.task += ' curl'; },
  s => { s.packets[0].candidate_type = 'collective_custody_system'; },
  s => { s.packets[0].source_identity = ''; },
  s => { s.packets[0].support_ledger.valid_resource_normalized_comparator = true; },
  s => { s.packets[0].support_ledger.support_adjusted_surplus_supported = true; },
  s => { s.packets[0].support_ledger.support_elements = ['one']; },
  s => { s.packets[0].review_passes[0].external_independence_claimed = true; },
  s => { s.packets[0].review_passes[0].identity_cues_available = true; },
  s => { s.packets[0].person_bounded_supports.push('exception_handling'); },
  s => { s.packets[0].function_bounded_supports = []; },
  s => { s.packets[0].dimension_vector.exception_handling = 'bounded_person_support'; },
  s => { s.packets[1].person_bounded_supports.push('custody'); },
  s => { s.packets[1].dimension_vector.custody = 'bounded_person_support'; },
  s => { s.packets[1].dimension_vector.cross_domain_transfer = 'bounded_person_support'; },
  s => { s.packets[1].review_passes[0].provisional_person_support = ['exception_handling', 'model_elasticity', 'epistemic_restraint']; },
  s => { s.packets[1].review_passes[1].surviving_person_support.push('custody'); },
  s => { s.disagreements[0].averaged = true; },
  s => { s.disagreements[1].resolution = 'average_both_positions'; },
  s => { s.boundaries.living_person_is_contact_authorization = true; }
];

assert.equal(mutations.length, 56);

for (const [index, mutate] of mutations.entries()) {
  const candidate = clone(source);
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, `mutation ${index + 1} should fail`);
}

validateSource(source);
console.log(`counter-selector-wave-27.test: ${mutations.length} adversarial mutations refused`);
