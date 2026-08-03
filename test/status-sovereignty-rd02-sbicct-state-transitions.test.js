#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSbicTransitionsContext, validateSbicTransitions } from '../tools/validate-status-sovereignty-rd02-sbicct-state-transitions.mjs';

const clean = loadSbicTransitionsContext();
assert.deepEqual(validateSbicTransitions(clean), [], 'clean SBIC state-transition denominator must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['record schema', c => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['execution identity', c => { c.record.execution_id = 'OTHER'; }, 'Execution identity'],
  ['hypothesis identity', c => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', c => { c.record.issue = 0; }, 'Issue identity'],
  ['parent issue', c => { c.record.parent_issue = 0; }, 'Parent issue identity'],
  ['lane identity', c => { c.record.lane_id = 'SSC-F11'; }, 'Lane identity'],
  ['authority inflation', c => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['parent receipt removed', c => { c.record.parent_receipts.pop(); }, 'Parent receipt count'],
  ['cohort size drift', c => { c.record.cohort_contract.published_first_cohort = 17; }, 'Cohort contract'],
  ['named count drift', c => { c.record.cohort_contract.publicly_named_rows = 18; }, 'Cohort contract'],
  ['withheld row erased', c => { c.record.cohort_contract.withheld_rows = 0; }, 'Cohort contract'],
  ['licensed aggregate inflated', c => { c.record.cohort_contract.fully_licensed_rows_at_2025_01_17 = 8; }, 'Cohort contract'],
  ['slot preservation erased', c => { c.record.cohort_contract.all_eighteen_slots_preserved = false; }, 'Cohort contract'],
  ['withheld dropped', c => { c.record.cohort_contract.withheld_row_dropped = true; }, 'Cohort contract'],
  ['mapping invented', c => { c.record.cohort_contract.fund_specific_license_mapping_recovered = true; }, 'Cohort contract'],
  ['expected-result selection', c => { c.record.cohort_contract.selected_because_expected_result = true; }, 'Cohort contract'],
  ['slot removed', c => { c.record.cohort_slots.pop(); }, 'Cohort slot denominator'],
  ['slot duplicated', c => { c.record.cohort_slots[1].slot = 1; }, 'Cohort slots must be unique'],
  ['slot order drift', c => { [c.record.cohort_slots[0], c.record.cohort_slots[1]] = [c.record.cohort_slots[1], c.record.cohort_slots[0]]; }, 'Cohort slot order'],
  ['published slot count drift', c => { c.record.cohort_slots[0].identity_state = 'withheld_under_sba_policy'; }, 'Published identity slot count'],
  ['withheld slot count drift', c => { c.record.cohort_slots[17].identity_state = 'published_identity_requires_source_transcription'; }, 'Withheld identity slot count'],
  ['withheld position drift', c => { c.record.cohort_slots[0].identity_state = 'withheld_under_sba_policy'; c.record.cohort_slots[17].identity_state = 'published_identity_requires_source_transcription'; }, 'Withheld row position'],
  ['license assigned', c => { c.record.cohort_slots[0].fund_specific_license_state = 'licensed'; }, 'Slot 1 license state'],
  ['commitment assigned', c => { c.record.cohort_slots[1].leverage_commitment = 'observed'; }, 'Slot 2 leverage commitment'],
  ['draw assigned', c => { c.record.cohort_slots[2].leverage_draw = 'observed'; }, 'Slot 3 leverage draw'],
  ['portfolio assigned', c => { c.record.cohort_slots[3].portfolio_investment = 'observed'; }, 'Slot 4 portfolio investment'],
  ['performance assigned', c => { c.record.cohort_slots[4].realized_performance = 'positive'; }, 'Slot 5 realized performance'],
  ['repayment assigned', c => { c.record.cohort_slots[5].repayment_or_loss = 'repaid'; }, 'Slot 6 repayment or loss'],
  ['recovery assigned', c => { c.record.cohort_slots[6].public_recovery = 'observed'; }, 'Slot 7 public recovery'],
  ['interest drift', c => { c.record.aggregate_states.expressions_of_interest_minimum = 101; }, 'Aggregate state denominator'],
  ['application drift', c => { c.record.aggregate_states.formal_applications_as_of_2024_10_22 = 23; }, 'Aggregate state denominator'],
  ['approval drift', c => { c.record.aggregate_states.approved_as_of_2024_10_22 = 14; }, 'Aggregate state denominator'],
  ['cohort drift', c => { c.record.aggregate_states.published_first_cohort = 19; }, 'Aggregate state denominator'],
  ['licensed drift', c => { c.record.aggregate_states.fully_licensed_as_of_2025_01_17 = 8; }, 'Aggregate state denominator'],
  ['commitment count invented', c => { c.record.aggregate_states.fund_specific_leverage_commitments_recovered = 1; }, 'Aggregate state denominator'],
  ['draw count invented', c => { c.record.aggregate_states.fund_specific_leverage_draws_recovered = 1; }, 'Aggregate state denominator'],
  ['performance count invented', c => { c.record.aggregate_states.realized_performance_ledgers_recovered = 1; }, 'Aggregate state denominator'],
  ['recovery count invented', c => { c.record.aggregate_states.public_recovery_ledgers_recovered = 1; }, 'Aggregate state denominator'],
  ['open denominator removed', c => { c.record.open_denominators.pop(); }, 'Open denominator count'],
  ['open denominator duplicated', c => { c.record.open_denominators[1] = c.record.open_denominators[0]; }, 'Open denominators must be unique'],
  ['terminal state promoted', c => { c.record.current_result.terminal_state = 'bounded_state_transition_chain'; }, 'Current result'],
  ['slot preservation result erased', c => { c.record.current_result.all_eighteen_slots_preserved = false; }, 'Current result'],
  ['complete transition invented', c => { c.record.current_result.fund_specific_transition_chain_complete = true; }, 'Current result'],
  ['control invented', c => { c.record.current_result.lawful_industrial_policy_control_complete = true; }, 'Current result'],
  ['capital conversion invented', c => { c.record.current_result.capital_conversion_finding = true; }, 'Current result'],
  ['favoritism invented', c => { c.record.current_result.favoritism_finding = true; }, 'Current result'],
  ['extraction invented', c => { c.record.current_result.extraction_finding = true; }, 'Current result'],
  ['review change invented', c => { c.record.current_result.reviewed_disposition_changed = true; }, 'Current result'],
  ['compact finding invented', c => { c.record.current_result.complete_compact_finding = true; }, 'Current result'],
  ['graph invented', c => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['publication invented', c => { c.record.current_result.publication_effect = 'public'; }, 'Current result'],
  ['approval-license collapse', c => { c.record.boundaries.approval_is_license = true; }, 'Boundary approval_is_license'],
  ['license-draw collapse', c => { c.record.boundaries.license_is_leverage_draw = true; }, 'Boundary license_is_leverage_draw'],
  ['draw-investment collapse', c => { c.record.boundaries.fund_draw_is_portfolio_investment = true; }, 'Boundary fund_draw_is_portfolio_investment'],
  ['performance collapse', c => { c.record.boundaries.portfolio_investment_is_realized_performance = true; }, 'Boundary portfolio_investment_is_realized_performance'],
  ['private-public collapse', c => { c.record.boundaries.private_return_is_public_recovery = true; }, 'Boundary private_return_is_public_recovery'],
  ['missing disclosure success shortcut', c => { c.record.boundaries.missing_disclosure_is_successful_outcome = true; }, 'Boundary missing_disclosure_is_successful_outcome'],
  ['membership favoritism shortcut', c => { c.record.boundaries.program_membership_proves_favoritism_or_coordination = true; }, 'Boundary program_membership_proves_favoritism_or_coordination'],
  ['schema identity drift', c => { c.schema.properties.schema_version.const = 'other'; }, 'Schema identity'],
  ['schema issue drift', c => { c.schema.properties.issue.const = 0; }, 'Schema issue'],
  ['schema parent drift', c => { c.schema.properties.parent_issue.const = 0; }, 'Schema parent issue'],
  ['schema lane drift', c => { c.schema.properties.lane_id.const = 'SSC-F11'; }, 'Schema lane'],
  ['manifest drift', c => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['build manifest drift', c => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Build manifest drift'],
  ['report drift', c => { c.publicReport.counts.cohort_slots = 17; }, 'Build/report drift'],
  ['report mapping invented', c => { c.buildReport.counts.fund_specific_license_mappings = 1; c.publicReport.counts.fund_specific_license_mappings = 1; }, 'Report count fund_specific_license_mappings'],
  ['report recovery invented', c => { c.buildReport.counts.public_recovery_ledgers = 1; c.publicReport.counts.public_recovery_ledgers = 1; }, 'Report count public_recovery_ledgers'],
  ['digest drift', c => { c.buildReport.release_manifest.combined_sha256 = '0'.repeat(64); c.publicReport.release_manifest.combined_sha256 = '0'.repeat(64); }, 'Report release digest'],
  ['html cohort erased', c => { c.html = c.html.replace('ALL EIGHTEEN SLOTS PRESERVED', 'SEVENTEEN SLOTS'); }, 'HTML cohort denominator missing'],
  ['html withheld erased', c => { c.html = c.html.replace('ONE WITHHELD ROW RETAINED', 'WITHHELD ROW DROPPED'); }, 'HTML withheld-row boundary missing'],
  ['html aggregate mapping erased', c => { c.html = c.html.replace('SEVEN AGGREGATE LICENSES NOT ASSIGNED TO FUNDS', 'SEVEN FUNDS LICENSED'); }, 'HTML aggregate-to-fund boundary missing'],
  ['html transitions erased', c => { c.html = c.html.replace('DRAW, PERFORMANCE, REPAYMENT, AND PUBLIC RECOVERY UNRESOLVED', 'ALL OUTCOMES COMPLETE'); }, 'HTML state-transition boundary missing'],
  ['html digest erased', c => { c.html = c.html.replace(c.manifest.combined_sha256, '0'.repeat(64)); }, 'HTML release digest missing'],
  ['html noindex erased', c => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }, 'HTML noindex boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateSbicTransitions(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-rd02-sbicct-state-transitions.test: ${mutations.length} adversarial mutations PASS`);
