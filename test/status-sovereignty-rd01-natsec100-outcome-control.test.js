#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadNatSecOutcomeContext, validateNatSecOutcomeControl } from '../tools/validate-status-sovereignty-rd01-natsec100-outcome-control.mjs';

const clean = loadNatSecOutcomeContext();
assert.deepEqual(validateNatSecOutcomeControl(clean), [], 'clean NatSec100 outcome control must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['schema', c => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['execution', c => { c.record.execution_id = 'OTHER'; }, 'Execution identity'],
  ['hypothesis', c => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue', c => { c.record.issue = 0; }, 'Issue identity'],
  ['parent', c => { c.record.parent_issue = 0; }, 'Parent issue identity'],
  ['lane', c => { c.record.lane_id = 'SSC-F10'; }, 'Lane identity'],
  ['authority', c => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['parent receipt removed', c => { c.record.parent_receipts.pop(); }, 'Parent receipt count'],
  ['rank sample drift', c => { c.record.selection_contract.selected_rank_positions = [1, 49, 100]; }, 'Selected rank positions'],
  ['selection rule drift', c => { c.record.selection_contract.selected_sample_rule = 'famous_names'; }, 'Sample selection rule'],
  ['nonselection omitted', c => { c.record.selection_contract.all_explicit_assessed_nonselection_examples_included = false; }, 'Nonselection inclusion'],
  ['expected result selection', c => { c.record.selection_contract.selected_because_expected_result = true; }, 'Expected-result selection boundary'],
  ['window inflated', c => { c.record.selection_contract.post_publication_window_declared_sufficient_for_causal_inference = true; }, 'Post-publication window boundary'],
  ['sample removed', c => { c.record.sample.pop(); }, 'Sample row count'],
  ['sample id duplicate', c => { c.record.sample[1].sample_id = c.record.sample[0].sample_id; }, 'Sample IDs must be unique'],
  ['sample name duplicate', c => { c.record.sample[1].published_name = c.record.sample[0].published_name; }, 'Sample names must be unique'],
  ['selected count drift', c => { c.record.sample[3].selection_state = 'selected'; }, 'Selected row count'],
  ['rank order drift', c => { c.record.sample[1].rank = 49; }, 'Selected rank order'],
  ['selected name drift', c => { c.record.sample[1].published_name = 'SpaceX'; }, 'Selected name order'],
  ['nonselection name drift', c => { c.record.sample[3].published_name = 'Harmonic'; }, 'Nonselection name order'],
  ['input endogeneity erased', c => { c.record.sample[0].prepublication_contracting_or_capital_is_scoring_input = false; }, 'selector-input endogeneity'],
  ['capital join invented', c => { c.record.sample[0].postpublication_capital_join = 'complete'; }, 'Capital joins must remain open'],
  ['award join invented', c => { c.record.sample[0].postpublication_award_nonaward_join = 'complete'; }, 'Award/nonaward joins must remain open'],
  ['deployment join invented', c => { c.record.sample[0].deployment_failure_exit_join = 'complete'; }, 'Deployment/failure/exit joins must remain open'],
  ['rank effect invented', c => { c.record.sample[0].causal_effect_of_rank_identified = true; }, 'Rank causal effect must remain unidentified'],
  ['identification limit removed', c => { c.record.identification_limits.pop(); }, 'Identification-limit count'],
  ['identification limit duplicated', c => { c.record.identification_limits[1] = c.record.identification_limits[0]; }, 'Identification limits must be unique'],
  ['open denominator removed', c => { c.record.open_denominators.pop(); }, 'Open denominator count'],
  ['open denominator duplicated', c => { c.record.open_denominators[1] = c.record.open_denominators[0]; }, 'Open denominators must be unique'],
  ['terminal promoted', c => { c.record.current_result.terminal_state = 'bounded_selector_outcome_association'; }, 'Current result'],
  ['outcome complete', c => { c.record.current_result.matched_outcome_control_complete = true; }, 'Current result'],
  ['causation supported', c => { c.record.current_result.selection_causation_supported = true; }, 'Current result'],
  ['superiority invented', c => { c.record.current_result.technical_superiority_finding = true; }, 'Current result'],
  ['procurement invented', c => { c.record.current_result.procurement_causation_finding = true; }, 'Current result'],
  ['coordination invented', c => { c.record.current_result.coordination_finding = true; }, 'Current result'],
  ['common purpose invented', c => { c.record.current_result.common_purpose_finding = true; }, 'Current result'],
  ['review change invented', c => { c.record.current_result.reviewed_disposition_changed = true; }, 'Current result'],
  ['compact invented', c => { c.record.current_result.complete_compact_finding = true; }, 'Current result'],
  ['graph invented', c => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['publication invented', c => { c.record.current_result.publication_effect = 'public'; }, 'Current result'],
  ['rank superiority shortcut', c => { c.record.boundaries.rank_proves_technical_superiority = true; }, 'Boundary rank_proves_technical_superiority'],
  ['no record shortcut', c => { c.record.boundaries.no_joined_public_record_proves_no_event = true; }, 'Boundary no_joined_public_record_proves_no_event'],
  ['schema identity drift', c => { c.schema.properties.schema_version.const = 'other'; }, 'Schema identity'],
  ['schema issue drift', c => { c.schema.properties.issue.const = 0; }, 'Schema issue'],
  ['manifest drift', c => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['build manifest drift', c => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Build manifest drift'],
  ['report drift', c => { c.publicReport.counts.sample_rows = 6; }, 'Build/report drift'],
  ['report count inflated', c => { c.buildReport.counts.matched_outcome_controls_complete = 1; c.publicReport.counts.matched_outcome_controls_complete = 1; }, 'Report count matched_outcome_controls_complete'],
  ['digest drift', c => { c.buildReport.release_manifest.combined_sha256 = '0'.repeat(64); c.publicReport.release_manifest.combined_sha256 = '0'.repeat(64); }, 'Report release digest'],
  ['html sample erased', c => { c.html = c.html.replace('FIXED TOP–MIDDLE–BOTTOM SAMPLE', 'TARGET SAMPLE'); }, 'HTML selection boundary missing'],
  ['html nonselection erased', c => { c.html = c.html.replace('ALL EXPLICIT NONSELECTION EXAMPLES INCLUDED', 'NONSELECTION OMITTED'); }, 'HTML nonselection boundary missing'],
  ['html outcomes erased', c => { c.html = c.html.replace('POST-PUBLICATION OUTCOMES OPEN', 'OUTCOMES COMPLETE'); }, 'HTML outcome boundary missing'],
  ['html causation erased', c => { c.html = c.html.replace('RANKING CAUSATION NOT IDENTIFIED', 'RANKING CAUSED SUCCESS'); }, 'HTML causal boundary missing'],
  ['html digest erased', c => { c.html = c.html.replace(c.manifest.combined_sha256, '0'.repeat(64)); }, 'HTML release digest missing'],
  ['html noindex erased', c => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }, 'HTML noindex boundary missing']
];
for (const [name, mutate, expected] of mutations) {
  const context = clone(); mutate(context);
  const errors = validateNatSecOutcomeControl(context);
  assert(errors.some(error => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-rd01-natsec100-outcome-control.test: ${mutations.length} adversarial mutations PASS`);
