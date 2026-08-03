#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadOscLifecycleContext, validateOscLifecycle } from '../tools/validate-status-sovereignty-rd03-osc-lifecycle.mjs';

const clean = loadOscLifecycleContext();
assert.deepEqual(validateOscLifecycle(clean), [], 'clean OSC lifecycle execution must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['source path escaped', (c) => { c.sourcePath = 'reports/public.json'; }, 'Source ledger must remain'],
  ['MP source erased', (c) => { c.source = {}; }, 'Source ledger missing MP Materials'],
  ['schema identity', (c) => { c.schema.properties.schema_version.const = 'other'; }, 'Schema identity'],
  ['schema issue', (c) => { c.schema.properties.issue.const = 0; }, 'Schema issue'],
  ['schema parent', (c) => { c.schema.properties.parent_issue.const = 0; }, 'Schema parent issue'],
  ['schema lane', (c) => { c.schema.properties.lane_id.const = 'SSC-F11'; }, 'Schema lane'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['build manifest drift', (c) => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Build manifest drift'],
  ['report drift', (c) => { c.publicReport.counts.named_instruments = 6; }, 'Build/report drift'],
  ['report schema', (c) => { c.buildReport.schema_version = 'other'; c.publicReport.schema_version = 'other'; }, 'Report schema'],
  ['execution identity', (c) => { c.buildReport.execution_id = 'OTHER'; c.publicReport.execution_id = 'OTHER'; }, 'Execution identity'],
  ['hypothesis identity', (c) => { c.buildReport.hypothesis_id = 'OTHER'; c.publicReport.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.buildReport.issue = 0; c.publicReport.issue = 0; }, 'Issue identity'],
  ['parent identity', (c) => { c.buildReport.parent_issue = 0; c.publicReport.parent_issue = 0; }, 'Parent issue identity'],
  ['lane identity', (c) => { c.buildReport.lane_id = 'SSC-F11'; c.publicReport.lane_id = 'SSC-F11'; }, 'Lane identity'],
  ['authority inflated', (c) => { c.buildReport.authority = 'adjudication'; c.publicReport.authority = 'adjudication'; }, 'Authority ceiling'],
  ['source path drift', (c) => { c.buildReport.source_ledger_path = 'other'; c.publicReport.source_ledger_path = 'other'; }, 'Source ledger path'],
  ['source count inflated', (c) => { c.buildReport.counts.source_records = 10; c.publicReport.counts.source_records = 10; }, 'Report counts'],
  ['instrument count inflated', (c) => { c.buildReport.counts.named_instruments = 6; c.publicReport.counts.named_instruments = 6; }, 'Report counts'],
  ['cash count inflated', (c) => { c.buildReport.counts.cash_disbursements_observed = 2; c.publicReport.counts.cash_disbursements_observed = 2; }, 'Report counts'],
  ['repayment invented', (c) => { c.buildReport.counts.repayments_observed = 1; c.publicReport.counts.repayments_observed = 1; }, 'Report counts'],
  ['recovery invented', (c) => { c.buildReport.counts.public_recoveries_observed = 1; c.publicReport.counts.public_recoveries_observed = 1; }, 'Report counts'],
  ['instrument removed', (c) => { c.buildReport.instrument_states.pop(); c.publicReport.instrument_states.pop(); }, 'Instrument-state denominator'],
  ['instrument duplicated', (c) => { c.buildReport.instrument_states[1].name = 'MP Materials'; c.publicReport.instrument_states[1].name = 'MP Materials'; }, 'Instrument names must be unique'],
  ['MP state downgraded', (c) => { c.buildReport.instrument_states[0].legal_state = 'conditional_preclose_commitment'; c.publicReport.instrument_states[0].legal_state = 'conditional_preclose_commitment'; }, 'MP Materials legal state'],
  ['MP cash erased', (c) => { c.buildReport.instrument_states[0].cash_disbursement_observed = false; c.publicReport.instrument_states[0].cash_disbursement_observed = false; }, 'MP Materials cash state'],
  ['conditional cash invented', (c) => { c.buildReport.instrument_states[1].cash_disbursement_observed = true; c.publicReport.instrument_states[1].cash_disbursement_observed = true; }, 'Conditional commitments may not claim cash disbursement'],
  ['instrument repayment invented', (c) => { c.buildReport.instrument_states[2].repayment_observed = true; c.publicReport.instrument_states[2].repayment_observed = true; }, 'Repayment must remain unobserved'],
  ['instrument recovery invented', (c) => { c.buildReport.instrument_states[3].public_recovery_observed = true; c.publicReport.instrument_states[3].public_recovery_observed = true; }, 'Public recovery must remain unobserved'],
  ['terminal state promoted', (c) => { c.buildReport.current_result.terminal_state = 'complete'; c.publicReport.current_result.terminal_state = 'complete'; }, 'Current result'],
  ['review change invented', (c) => { c.buildReport.current_result.reviewed_disposition_changed = true; c.publicReport.current_result.reviewed_disposition_changed = true; }, 'Current result'],
  ['complete chain invented', (c) => { c.buildReport.current_result.complete_underwriting_to_recovery_chain = true; c.publicReport.current_result.complete_underwriting_to_recovery_chain = true; }, 'Current result'],
  ['favoritism invented', (c) => { c.buildReport.current_result.favoritism_finding = true; c.publicReport.current_result.favoritism_finding = true; }, 'Current result'],
  ['extraction invented', (c) => { c.buildReport.current_result.extraction_finding = true; c.publicReport.current_result.extraction_finding = true; }, 'Current result'],
  ['compact invented', (c) => { c.buildReport.current_result.complete_compact_finding = true; c.publicReport.current_result.complete_compact_finding = true; }, 'Current result'],
  ['graph invented', (c) => { c.buildReport.current_result.graph_effect = 'edge'; c.publicReport.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['publication invented', (c) => { c.buildReport.current_result.publication_effect = 'public'; c.publicReport.current_result.publication_effect = 'public'; }, 'Current result'],
  ['commitment collapse', (c) => { c.buildReport.boundaries.conditional_commitment_is_executed_loan = true; c.publicReport.boundaries.conditional_commitment_is_executed_loan = true; }, 'Boundary conditional_commitment_is_executed_loan'],
  ['recovery shortcut', (c) => { c.buildReport.boundaries.repayment_terms_are_observed_repayment = true; c.publicReport.boundaries.repayment_terms_are_observed_repayment = true; }, 'Boundary repayment_terms_are_observed_repayment'],
  ['favoritism shortcut', (c) => { c.buildReport.boundaries.strategic_financing_proves_favoritism = true; c.publicReport.boundaries.strategic_financing_proves_favoritism = true; }, 'Boundary strategic_financing_proves_favoritism'],
  ['digest drift', (c) => { c.buildReport.release_manifest.combined_sha256 = '0'.repeat(64); c.publicReport.release_manifest.combined_sha256 = '0'.repeat(64); }, 'Report release digest'],
  ['HTML executed boundary erased', (c) => { c.html = c.html.replace('ONE EXECUTED AND CASH-DISBURSED LOAN', 'ALL ANNOUNCEMENTS EQUAL'); }, 'HTML executed-loan boundary missing'],
  ['HTML conditional boundary erased', (c) => { c.html = c.html.replace('FOUR CONDITIONAL PRE-CLOSE COMMITMENTS', 'FOUR EXECUTED LOANS'); }, 'HTML conditional-state boundary missing'],
  ['HTML recovery boundary erased', (c) => { c.html = c.html.replace('REPAYMENT AND PUBLIC RECOVERY UNOBSERVED', 'PUBLIC RECOVERY OBSERVED'); }, 'HTML recovery boundary missing'],
  ['HTML digest erased', (c) => { c.html = c.html.replace(c.manifest.combined_sha256, '0'.repeat(64)); }, 'HTML release digest missing'],
  ['HTML noindex erased', (c) => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }, 'HTML noindex boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateOscLifecycle(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-rd03-osc-lifecycle.test: ${mutations.length} adversarial mutations PASS`);
