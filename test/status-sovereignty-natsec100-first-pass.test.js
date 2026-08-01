#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadNatSec100FirstPassContext, validateNatSec100FirstPass } from '../tools/validate-status-sovereignty-natsec100-first-pass.mjs';

const clean = loadNatSec100FirstPassContext();
assert.deepEqual(validateNatSec100FirstPass(clean), [], 'clean NatSec100 first pass must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['schema identity', (c) => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['hypothesis identity', (c) => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.record.issue = 0; }, 'Issue identity'],
  ['observation identity', (c) => { c.record.observation_id = 'OTHER'; }, 'Observation identity'],
  ['lane identity', (c) => { c.record.lane_id = 'SSC-F10'; }, 'Lane identity'],
  ['status inflation', (c) => { c.record.status = 'complete'; }, 'Record status'],
  ['authority inflation', (c) => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['parent path drift', (c) => { c.record.parent_custody.path = 'other'; }, 'Parent custody path'],
  ['parent state closed', (c) => { c.record.parent_custody.state = 'closed'; }, 'Parent custody state'],
  ['source removed', (c) => { c.record.sources = []; }, 'Source count'],
  ['source identity', (c) => { c.record.sources[0].source_id = 'OTHER'; }, 'Source identity'],
  ['source class', (c) => { c.record.sources[0].source_class = 'government_endorsement'; }, 'Source class'],
  ['insecure URL', (c) => { c.record.sources[0].url = 'http://example.test'; }, 'Source URL must be HTTPS'],
  ['facts truncated', (c) => { c.record.sources[0].retrieved_facts.pop(); }, 'Recovered fact count'],
  ['limits truncated', (c) => { c.record.sources[0].does_not_support.pop(); }, 'Source-limit count'],
  ['limits duplicated', (c) => { c.record.sources[0].does_not_support[1] = c.record.sources[0].does_not_support[0]; }, 'Source limits must be unique'],
  ['selected rows drift', (c) => { c.record.recovered_denominator.published_selected_rows = 99; }, 'Recovered denominator'],
  ['nonselection drift', (c) => { c.record.recovered_denominator.explicit_assessed_nonselection_examples = 3; }, 'Recovered denominator'],
  ['candidate denominator invented', (c) => { c.record.recovered_denominator.complete_candidate_rows = 500; }, 'Recovered denominator'],
  ['rejected denominator invented', (c) => { c.record.recovered_denominator.complete_rejected_rows = 398; }, 'Recovered denominator'],
  ['weights invented', (c) => { c.record.recovered_denominator.exact_weights_published = true; }, 'Recovered denominator'],
  ['scoring reproducibility invented', (c) => { c.record.recovered_denominator.reproducible_scoring_data_published = true; }, 'Recovered denominator'],
  ['FOCI custody invented', (c) => { c.record.recovered_denominator.FOCI_decision_records_published = true; }, 'Recovered denominator'],
  ['capital denominator invented', (c) => { c.record.downstream_join_state.capital_denominator_complete = true; }, 'Downstream join state'],
  ['award denominator invented', (c) => { c.record.downstream_join_state.award_and_nonaward_denominator_complete = true; }, 'Downstream join state'],
  ['deployment denominator invented', (c) => { c.record.downstream_join_state.deployment_and_failure_denominator_complete = true; }, 'Downstream join state'],
  ['exit denominator invented', (c) => { c.record.downstream_join_state.exit_denominator_complete = true; }, 'Downstream join state'],
  ['matched controls invented', (c) => { c.record.downstream_join_state.matched_nonselected_controls_complete = true; }, 'Downstream join state'],
  ['causal join invented', (c) => { c.record.downstream_join_state.causal_join_generated = true; }, 'Downstream join state'],
  ['acquisition removed', (c) => { c.record.next_acquisitions.pop(); }, 'Next-acquisition count'],
  ['acquisition duplicated', (c) => { c.record.next_acquisitions[1] = c.record.next_acquisitions[0]; }, 'Next acquisitions must be unique'],
  ['ordinary control removed', (c) => { c.record.allowed_terminal_states = c.record.allowed_terminal_states.filter((x) => x !== 'ordinary_recognition_or_market_explanation'); }, 'Ordinary-recognition control state missing'],
  ['unsupported state removed', (c) => { c.record.allowed_terminal_states = c.record.allowed_terminal_states.filter((x) => x !== 'selection_causation_unsupported'); }, 'Unsupported-causation state missing'],
  ['open state removed', (c) => { c.record.allowed_terminal_states = c.record.allowed_terminal_states.filter((x) => x !== 'requires_additional_acquisition'); }, 'Open acquisition state missing'],
  ['result closed', (c) => { c.record.current_result.terminal_state = 'partial_selector_to_public_gate_chain'; }, 'Current result'],
  ['disposition changed', (c) => { c.record.current_result.reviewed_disposition_changed = true; }, 'Current result'],
  ['compact finding invented', (c) => { c.record.current_result.complete_compact_finding = true; }, 'Current result'],
  ['racial-order finding invented', (c) => { c.record.current_result.racial_order_finding = true; }, 'Current result'],
  ['coordination invented', (c) => { c.record.current_result.coordination_finding = true; }, 'Current result'],
  ['graph effect invented', (c) => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['rank inflated', (c) => { c.record.boundaries.rank_proves_technical_superiority = true; }, 'Boundary rank_proves_technical_superiority'],
  ['procurement causation inflated', (c) => { c.record.boundaries.rank_proves_procurement_causation = true; }, 'Boundary rank_proves_procurement_causation'],
  ['roster completeness inflated', (c) => { c.record.boundaries.published_roster_is_complete_candidate_denominator = true; }, 'Boundary published_roster_is_complete_candidate_denominator'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['report drift', (c) => { c.publicReport.counts.causal_joins_generated = 1; }, 'Build/public report drift'],
  ['HTML candidate boundary erased', (c) => { c.html = c.html.replace('CANDIDATE UNIVERSE OPEN', 'CANDIDATE UNIVERSE COMPLETE'); }, 'HTML candidate-denominator boundary missing'],
  ['HTML causal boundary erased', (c) => { c.html = c.html.replace('CAUSAL JOINS ZERO', 'CAUSAL JOINS COMPLETE'); }, 'HTML causal boundary missing'],
  ['HTML superiority boundary erased', (c) => { c.html = c.html.replace('TECHNICAL SUPERIORITY NOT ESTABLISHED', 'TECHNICAL SUPERIORITY ESTABLISHED'); }, 'HTML superiority boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateNatSec100FirstPass(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-natsec100-first-pass.test: ${mutations.length} adversarial mutations PASS`);
