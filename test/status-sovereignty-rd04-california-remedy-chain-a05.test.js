#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadA05Context, validateA05 } from '../tools/validate-status-sovereignty-rd04-california-remedy-chain-a05.mjs';

const base = loadA05Context();
assert.deepEqual(validateA05(base), [], 'canonical A05 product must validate');

const mutations = [
  ['change selected state', (c) => { c.core.parent.selected_state = 'CT'; }],
  ['reopen state selection', (c) => { c.core.parent.state_selection_reopened = true; }],
  ['invent a substantive tiebreaker', (c) => { c.core.parent.substantive_tiebreaker = 'more favorable outcome'; }],
  ['alter the frozen A04 release', (c) => { c.core.parent.release_sha256 = '0'.repeat(64); }],
  ['revoke the A04 selected-state handoff', (c) => { c.parent.current_result.selected_state_chain_may_proceed = false; }],
  ['turn the unit into a linked cohort', (c) => { c.core.unit_contract.one_linked_case_cohort = true; }],
  ['authorize joins', (c) => { c.core.unit_contract.joins_authorized = true; }],
  ['add an outside-human dependency', (c) => { c.core.unit_contract.outside_human_dependency = true; }],
  ['remove one source', (c) => { c.sourceLedger.sources.pop(); c.core.source_ledger.newly_custodied_sources = 2; }],
  ['change a source host', (c) => { c.sourceLedger.sources[0].official_host = 'example.com'; }],
  ['lose source byte custody', (c) => { c.sourceLedger.sources[1].source_bytes_preserved = false; }],
  ['change a source digest', (c) => { c.sourceLedger.sources[2].body_sha256 = 'f'.repeat(64); }],
  ['mutate decision-registry bytes', (c) => { const b = new Uint8Array(c.sourceBytes['DECISION-REGISTRY']); b[0] ^= 1; c.sourceBytes['DECISION-REGISTRY'] = b; }],
  ['erase report heading', (c) => { c.reportText = c.reportText.replace('APPEALS FILED BY PROGRAM AND QUARTER', 'APPEALS'); }],
  ['erase registry nonprecedential boundary', (c) => { c.sourceBytes['DECISION-REGISTRY'] = Buffer.from(c.sourceBytes['DECISION-REGISTRY'].toString().replace(/not precedential/ig, 'binding precedent')); }],
  ['erase hearing deadline', (c) => { c.sourceBytes['HEARING-REQUESTS'] = Buffer.from(c.sourceBytes['HEARING-REQUESTS'].toString().replace(/90 days/ig, 'some time')); }],
  ['erase aid-pending custody', (c) => { c.parentFaq = c.parentFaq.replace(/aid pending/ig, 'continuity'); }],
  ['erase restoration custody', (c) => { c.parentRestoration = c.parentRestoration.replace(/Restoration of lost benefits/ig, 'Benefits'); }],
  ['remove a stage', (c) => { c.core.stages.pop(); c.core.counts.stages = 6; }],
  ['reorder stages', (c) => { c.core.stages.reverse(); }],
  ['claim a case-level stage', (c) => { c.core.stages[4].case_level_state = 'case_level_linked'; c.core.counts.case_level_linked_stages = 1; }],
  ['claim a complete case chain', (c) => { c.core.counts.complete_case_chains = 1; }],
  ['equate procedure with execution', (c) => { c.core.stages[0].boundaries.procedure_is_execution = true; }],
  ['join stage aggregates', (c) => { c.core.stages[4].boundaries.aggregate_counts_form_one_case_cohort = true; }],
  ['claim effective counterpower from a stage', (c) => { c.core.stages[6].boundaries.stage_proves_effective_counterpower = true; }],
  ['change appeals filed', (c) => { c.core.program_specific_aggregates.appeals_filed.total += 1; }],
  ['change hearings held', (c) => { c.core.program_specific_aggregates.hearings_held.total -= 1; }],
  ['join the CalFresh aggregate cohort', (c) => { c.core.program_specific_aggregates.cohort_join = true; }],
  ['apply all-program outcomes to CalFresh', (c) => { c.core.cross_program_aggregates.applicable_to_calfresh_distribution = true; }],
  ['invent a CalFresh disposition distribution', (c) => { c.core.counts.program_specific_disposition_distributions = 1; }],
  ['invent a CalFresh rehearing distribution', (c) => { c.core.counts.program_specific_rehearing_determination_distributions = 1; }],
  ['invent aid-pending outcomes', (c) => { c.core.counts.aid_pending_outcome_denominators = 1; }],
  ['invent restoration timing', (c) => { c.core.counts.restoration_timing_denominators = 1; }],
  ['count external contact', (c) => { c.core.counts.external_contacts = 1; }],
  ['count external review', (c) => { c.core.counts.external_reviews = 1; }],
  ['count adjudication', (c) => { c.core.counts.adjudications = 1; }],
  ['clear publication', (c) => { c.core.counts.publication_clearances = 1; }],
  ['create a graph effect', (c) => { c.core.current_result.graph_effect = 'edge'; }],
  ['claim case-level success', (c) => { c.core.current_result.case_level_success_supported = true; }],
  ['claim complete restoration', (c) => { c.core.current_result.complete_restoration_supported = true; }],
  ['claim remedy timeliness', (c) => { c.core.current_result.remedy_timeliness_supported = true; }],
  ['close the residual class', (c) => { c.core.current_result.residual_class_closed = true; }],
  ['change the reviewed disposition', (c) => { c.core.current_result.reviewed_disposition_changed = true; }],
  ['make A06 human-dependent', (c) => { c.core.next_handoff.outside_human_dependency = true; }],
  ['make A06 project-blocking', (c) => { c.core.next_handoff.project_blocking = true; }],
  ['remove the no-wait shortcut', (c) => { c.core.next_handoff.forbidden_shortcuts = c.core.next_handoff.forbidden_shortcuts.filter((x) => !x.includes('outside person')); }],
  ['turn aggregate throughput into a cohort', (c) => { c.core.anti_join_law.appeals_to_hearings = true; }],
  ['turn withdrawal into success', (c) => { c.core.anti_join_law.withdrawals_to_favorable_resolution = true; }],
  ['turn procedure into restoration', (c) => { c.core.anti_join_law.procedure_to_actual_restoration = true; }],
  ['turn the result into external review', (c) => { c.core.boundaries.result_is_external_review = true; }],
  ['remove noindex', (c) => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }],
  ['remove case-link banner', (c) => { c.html = c.html.replace('0 CASE-LEVEL JOINS', 'CASE LINKS'); }],
  ['drift build/report parity', (c) => { c.reportData.status = 'drift'; }],
  ['drift release manifest', (c) => { c.manifest.combined_sha256 = 'a'.repeat(64); }],
  ['authorize publication in manifest', (c) => { c.manifest.boundaries.manifest_authorizes_publication = true; }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(base);
  mutate(candidate);
  const errors = validateA05(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

console.log(`status-sovereignty-rd04-california-remedy-chain-a05.test: ${mutations.length} adversarial mutations PASS`);
