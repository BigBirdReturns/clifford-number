#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSource } from '../tools/validate-counter-selector-wave-26.mjs';

const ROOT = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/project/counter-selector-wave-26-observability-pivot.json'), 'utf8'));

function clone() {
  return structuredClone(source);
}

function mustReject(name, mutate) {
  const candidate = clone();
  mutate(candidate);
  assert.throws(() => validateSource(candidate), name);
}

const mutations = [
  ['promote packet', x => { x.counts.complete_operator_findings = 1; }],
  ['authorize field test', x => { x.counts.field_test_eligible_candidates = 1; }],
  ['authorize contact', x => { x.counts.contacts_authorized = 1; }],
  ['manufacture ranking', x => { x.counts.rankings = 1; }],
  ['manufacture graph effect', x => { x.counts.graph_effects = 1; }],
  ['claim blind review', x => { x.counts.blind_reviews_executed = 1; }],
  ['claim external review', x => { x.counts.external_reviews_executed = 1; }],
  ['claim dimension support', x => { x.counts.dimension_supports_added = 1; }],
  ['drop packet', x => { x.packets.pop(); }],
  ['duplicate packet id', x => { x.packets[1].packet_id = x.packets[0].packet_id; }],
  ['duplicate source id', x => { x.packets[1].source_records[0].source_id = x.packets[0].source_records[0].source_id; }],
  ['inflate source count', x => { x.counts.public_source_records = 14; }],
  ['convert collective to person', x => { const p=x.packets[1]; p.candidate_type='person_attributable_living_operator'; p.source_identity='Named Person'; }],
  ['assign collective identity', x => { x.packets[1].source_identity='Named Person'; }],
  ['remove gate surface', x => { delete x.packets[0].observable_gate_surfaces.custody; }],
  ['remove countermodels', x => { x.packets[0].matched_countermodels=[]; }],
  ['remove next receipts', x => { x.packets[0].required_next_receipts=[]; }],
  ['authorize source contact boundary', x => { x.boundaries.contact_authorized=true; }],
  ['authorize field test boundary', x => { x.boundaries.field_test_authorized=true; }],
  ['change graph boundary', x => { x.boundaries.graph_effect='candidate_edges'; }],
  ['claim historical handoff', x => { x.pivot_trigger.direct_handoff_receipt=true; }],
  ['claim review response', x => { x.pivot_trigger.external_review_responses=1; }],
  ['claim archival response', x => { x.pivot_trigger.substantive_archival_responses=1; }],
  ['change prior vector', x => { x.pivot_trigger.supported_dimensions=8; }],
  ['turn batch into merit ranking', x => { x.review_plan.batching_rule='merit_rank'; }],
  ['swap batch A', x => { x.review_plan.batch_a=['CS-OBS-0002','CS-OBS-0003']; }],
  ['swap batch B', x => { x.review_plan.batch_b=['CS-OBS-0001','CS-OBS-0004']; }],
  ['remove blind first', x => { x.review_plan.blind_first_required=false; }],
  ['remove support ledger', x => { x.review_plan.support_ledger_required=false; }],
  ['remove external promotion gate', x => { x.review_plan.external_review_required_for_promotion=false; }],
  ['remove consent gate', x => { x.review_plan.field_test_requires_consent=false; }],
  ['claim living person authorizes contact', x => { x.boundaries.living_person_is_contact_authorization=true; }],
  ['claim blog is independent review', x => { x.boundaries.public_blog_is_independent_review=true; }],
  ['claim scale is surplus', x => { x.boundaries.project_scale_is_person_surplus=true; }],
  ['claim small team is surplus', x => { x.boundaries.small_team_is_support_adjusted_surplus=true; }],
  ['claim open source proves orientation', x => { x.boundaries.open_source_is_non_zero_sum_proof=true; }],
  ['claim correction is universal elasticity', x => { x.boundaries.public_correction_is_universal_model_elasticity=true; }],
  ['claim governance document is handoff', x => { x.boundaries.governance_document_is_completed_handoff=true; }],
  ['claim plan is succession', x => { x.boundaries.succession_plan_is_observed_succession=true; }],
  ['claim process is person exception', x => { x.boundaries.security_process_is_person_exception_handling=true; }],
  ['claim collective is person', x => { x.boundaries.collective_system_is_person_operator=true; }],
  ['claim source routing is blind', x => { x.boundaries.source_routing_is_blind_review=true; }],
  ['claim observability priority is merit', x => { x.boundaries.observability_priority_is_merit_ranking=true; }],
  ['claim complete denominator', x => { x.boundaries.four_packets_are_complete_denominator=true; }],
  ['authorize promotion', x => { x.boundaries.promotion_authorized=true; }],
  ['authorize ranking', x => { x.boundaries.person_ranking_authorized=true; }],
  ['authorize profile', x => { x.boundaries.public_identity_profile_authorized=true; }],
  ['wrong status', x => { x.status='operators_found'; }]
];

for (const [name, mutate] of mutations) mustReject(name, mutate);
assert.equal(mutations.length, 48);
console.log('counter-selector-wave-26.test: 48 adversarial mutations refused');
