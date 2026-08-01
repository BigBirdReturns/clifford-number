#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveRegistry } from '../tools/build-counter-selector-wave-15.mjs';
import { validateAttributionObject } from '../tools/validate-counter-selector-wave-15.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'data/project/counter-selector-wave-15-attribution-census.json'), 'utf8'));
const base = deriveRegistry(contract);
const clone = (value) => structuredClone(value);
const mutations = [];
const add = (name, fn) => mutations.push([name, fn]);

add('manufacture_complete_operator', (x) => { x.counts.complete_operator_findings = 1; });
add('manufacture_field_test', (x) => { x.counts.field_test_eligible_packets = 1; });
add('manufacture_rank', (x) => { x.counts.person_rankings = 1; });
add('manufacture_public_release', (x) => { x.counts.public_identity_releases = 3; });
add('manufacture_graph', (x) => { x.counts.graph_effects = 1; });
add('manufacture_external_review', (x) => { x.counts.external_independent_reviews = 1; });
add('inflate_denominator', (x) => { x.counts.denominator_objects = 31; });
add('drop_processed_object', (x) => { x.counts.processed_objects = 29; });
add('break_acquisition_partition', (x) => { x.counts.partial_acquisitions = 11; });
add('inflate_reviewed_packets', (x) => { x.counts.blind_reviewed_packets = 19; });
add('inflate_review_passes', (x) => { x.counts.procedurally_separated_review_passes = 37; });
add('inflate_supports', (x) => { x.counts.bounded_dimension_supports = 19; });
add('break_support_partition', (x) => { x.counts.function_level_bounded_supports = 12; });
add('add_near_hit', (x) => { x.person_near_hits.push(clone(x.person_near_hits[0])); });
add('remove_near_hit', (x) => { x.person_near_hits.pop(); });
add('reorder_as_rank', (x) => { x.person_near_hits.reverse(); });
add('add_score', (x) => { x.person_near_hits[0].score = 3; });
add('add_rank_field', (x) => { x.person_near_hits[0].rank = 1; });
add('promote_nancy', (x) => { x.person_near_hits[0].complete_operator_finding = true; });
add('authorize_nancy_test', (x) => { x.person_near_hits[0].field_test_eligible = true; });
add('credit_nancy_transfer', (x) => { x.person_near_hits[0].supported_dimensions.push('cross_domain_transfer'); x.person_near_hits[0].unresolved_dimensions = x.person_near_hits[0].unresolved_dimensions.filter((v) => v !== 'cross_domain_transfer'); });
add('credit_david_handoff', (x) => { x.person_near_hits[1].supported_dimensions.push('custody'); x.person_near_hits[1].unresolved_dimensions = x.person_near_hits[1].unresolved_dimensions.filter((v) => v !== 'custody'); });
add('credit_elliot_handoff', (x) => { x.person_near_hits[2].supported_dimensions.push('custody'); x.person_near_hits[2].unresolved_dimensions = x.person_near_hits[2].unresolved_dimensions.filter((v) => v !== 'custody'); });
add('drop_nancy_source', (x) => { x.person_near_hits[0].source_ids = []; });
add('drop_david_missing_receipts', (x) => { x.person_near_hits[1].missing_receipts = []; });
add('drop_elliot_identity', (x) => { x.person_near_hits[2].source_identity = ''; });
add('turn_function_into_person', (x) => { x.function_level_support[0].person_attribution_authorized = true; });
add('drop_function_packet', (x) => { x.function_level_support.pop(); });
add('duplicate_mechanism_control', (x) => { x.mechanism_control_packet_ids[9] = x.mechanism_control_packet_ids[0]; });
add('drop_mechanism_control', (x) => { x.mechanism_control_packet_ids.pop(); });
add('authorize_identity_release', (x) => { x.boundaries.public_identity_release_authorized = true; });
add('call_count_rank', (x) => { x.boundaries.supported_dimension_count_is_rank = true; });
add('call_procedural_external', (x) => { x.boundaries.procedural_separation_is_external_independence = true; });
add('authorize_contact', (x) => { x.boundaries.contact_authorized = true; });
add('authorize_field_test', (x) => { x.boundaries.field_test_authorized = true; });
add('create_graph_effect', (x) => { x.boundaries.graph_effect = 'actor_edge'; });

for (const [name, mutate] of mutations) {
  const candidate = clone(base);
  mutate(candidate);
  assert.throws(() => validateAttributionObject(candidate, contract), undefined, name);
}

console.log(`counter-selector-wave-15.test: PASS (${mutations.length} adversarial mutations)`);
