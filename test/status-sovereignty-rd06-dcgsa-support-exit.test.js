#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadDcgsaSupportContext, validateDcgsaSupportExit } from '../tools/validate-status-sovereignty-rd06-dcgsa-support-exit.mjs';

const clean = loadDcgsaSupportContext();
assert.deepEqual(validateDcgsaSupportExit(clean), [], 'clean DCGS-A support and exit execution must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['source custody escaped', (c) => { c.sourcePath = 'reports/public.json'; }, 'Source ledger must remain'],
  ['source erased', (c) => { c.source = {}; }, 'Source ledger missing Palantir'],
  ['schema identity', (c) => { c.schema.properties.schema_version.const = 'other'; }, 'Schema identity'],
  ['schema issue', (c) => { c.schema.properties.issue.const = 0; }, 'Schema issue'],
  ['schema parent', (c) => { c.schema.properties.parent_issue.const = 0; }, 'Schema parent issue'],
  ['schema lane', (c) => { c.schema.properties.lane_id.const = 'SSC-F12'; }, 'Schema lane'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['build manifest drift', (c) => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Build manifest drift'],
  ['report drift', (c) => { c.publicReport.counts.later_proposals_received = 9; }, 'Build/report drift'],
  ['report schema', (c) => { c.buildReport.schema_version = 'other'; c.publicReport.schema_version = 'other'; }, 'Report schema'],
  ['execution identity', (c) => { c.buildReport.execution_id = 'OTHER'; c.publicReport.execution_id = 'OTHER'; }, 'Execution identity'],
  ['hypothesis identity', (c) => { c.buildReport.hypothesis_id = 'OTHER'; c.publicReport.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.buildReport.issue = 0; c.publicReport.issue = 0; }, 'Issue identity'],
  ['parent identity', (c) => { c.buildReport.parent_issue = 0; c.publicReport.parent_issue = 0; }, 'Parent issue identity'],
  ['lane identity', (c) => { c.buildReport.lane_id = 'SSC-F12'; c.publicReport.lane_id = 'SSC-F12'; }, 'Lane identity'],
  ['authority inflated', (c) => { c.buildReport.authority = 'adjudication'; c.publicReport.authority = 'adjudication'; }, 'Authority ceiling'],
  ['source path drift', (c) => { c.buildReport.source_ledger_path = 'other'; c.publicReport.source_ledger_path = 'other'; }, 'Source ledger path'],
  ['source count drift', (c) => { c.buildReport.counts.source_records += 1; c.publicReport.counts.source_records += 1; }, 'Source record count'],
  ['proposal inflation', (c) => { c.buildReport.counts.later_proposals_received = 9; c.publicReport.counts.later_proposals_received = 9; }, 'Report count later_proposals_received'],
  ['offeror completion invented', (c) => { c.buildReport.counts.publicly_named_offerors = 8; c.publicReport.counts.publicly_named_offerors = 8; }, 'Report count publicly_named_offerors'],
  ['unresolved offerors erased', (c) => { c.buildReport.counts.unresolved_offeror_identities = 0; c.publicReport.counts.unresolved_offeror_identities = 0; }, 'Report count unresolved_offeror_identities'],
  ['awardees inflated', (c) => { c.buildReport.counts.awardees = 3; c.publicReport.counts.awardees = 3; }, 'Report count awardees'],
  ['demo tasks drift', (c) => { c.buildReport.counts.live_demonstration_tasks = 31; c.publicReport.counts.live_demonstration_tasks = 31; }, 'Report count live_demonstration_tasks'],
  ['requirements drift', (c) => { c.buildReport.counts.approximate_performance_requirements = 71; c.publicReport.counts.approximate_performance_requirements = 71; }, 'Report count approximate_performance_requirements'],
  ['correction erased', (c) => { c.buildReport.counts.external_judicial_corrections = 0; c.publicReport.counts.external_judicial_corrections = 0; }, 'Report count external_judicial_corrections'],
  ['fielding scale inflated', (c) => { c.buildReport.counts.fielded_systems_fy2021 = 880; c.publicReport.counts.fielded_systems_fy2021 = 880; }, 'Report count fielded_systems_fy2021'],
  ['operational results invented', (c) => { c.buildReport.counts.published_operational_test_result_sets = 1; c.publicReport.counts.published_operational_test_result_sets = 1; }, 'Report count published_operational_test_result_sets'],
  ['support differential invented', (c) => { c.buildReport.counts.complete_support_differentials = 1; c.publicReport.counts.complete_support_differentials = 1; }, 'Report count complete_support_differentials'],
  ['data rights invented', (c) => { c.buildReport.counts.complete_data_rights_records = 1; c.publicReport.counts.complete_data_rights_records = 1; }, 'Report count complete_data_rights_records'],
  ['exit invented', (c) => { c.buildReport.counts.complete_substitution_or_exit_records = 1; c.publicReport.counts.complete_substitution_or_exit_records = 1; }, 'Report count complete_substitution_or_exit_records'],
  ['winner preference shortcut', (c) => { c.buildReport.identification_floor.observed_winner_is_latent_preferred_option = true; c.publicReport.identification_floor.observed_winner_is_latent_preferred_option = true; }, 'Identification floor observed_winner_is_latent_preferred_option'],
  ['unsupported alternative shortcut', (c) => { c.buildReport.identification_floor.unoffered_or_undersupported_alternative_is_rejected = true; c.publicReport.identification_floor.unoffered_or_undersupported_alternative_is_rejected = true; }, 'Identification floor unoffered_or_undersupported_alternative_is_rejected'],
  ['later success shortcut', (c) => { c.buildReport.identification_floor.later_success_proves_intrinsic_superiority = true; c.publicReport.identification_floor.later_success_proves_intrinsic_superiority = true; }, 'Identification floor later_success_proves_intrinsic_superiority'],
  ['terminal promoted', (c) => { c.buildReport.current_result.terminal_state = 'counterfactual_foreclosure_supported_bounded'; c.publicReport.current_result.terminal_state = 'counterfactual_foreclosure_supported_bounded'; }, 'Current result'],
  ['correction control erased', (c) => { c.buildReport.current_result.external_correction_control_retained = false; c.publicReport.current_result.external_correction_control_retained = false; }, 'Current result'],
  ['competition control erased', (c) => { c.buildReport.current_result.later_competition_control_retained = false; c.publicReport.current_result.later_competition_control_retained = false; }, 'Current result'],
  ['support asymmetry invented', (c) => { c.buildReport.current_result.support_asymmetry_finding = true; c.publicReport.current_result.support_asymmetry_finding = true; }, 'Current result'],
  ['foreclosure invented', (c) => { c.buildReport.current_result.counterfactual_foreclosure_finding = true; c.publicReport.current_result.counterfactual_foreclosure_finding = true; }, 'Current result'],
  ['superiority invented', (c) => { c.buildReport.current_result.technical_superiority_finding = true; c.publicReport.current_result.technical_superiority_finding = true; }, 'Current result'],
  ['favoritism invented', (c) => { c.buildReport.current_result.favoritism_finding = true; c.publicReport.current_result.favoritism_finding = true; }, 'Current result'],
  ['dependency invented', (c) => { c.buildReport.current_result.unavoidable_dependency_finding = true; c.publicReport.current_result.unavoidable_dependency_finding = true; }, 'Current result'],
  ['coordination invented', (c) => { c.buildReport.current_result.coordination_finding = true; c.publicReport.current_result.coordination_finding = true; }, 'Current result'],
  ['common purpose invented', (c) => { c.buildReport.current_result.common_purpose_finding = true; c.publicReport.current_result.common_purpose_finding = true; }, 'Current result'],
  ['compact invented', (c) => { c.buildReport.current_result.complete_compact_finding = true; c.publicReport.current_result.complete_compact_finding = true; }, 'Current result'],
  ['graph invented', (c) => { c.buildReport.current_result.graph_effect = 'edge'; c.publicReport.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['publication invented', (c) => { c.buildReport.current_result.publication_effect = 'public'; c.publicReport.current_result.publication_effect = 'public'; }, 'Current result'],
  ['award superiority shortcut', (c) => { c.buildReport.boundaries.award_proves_technical_superiority = true; c.publicReport.boundaries.award_proves_technical_superiority = true; }, 'Boundary award_proves_technical_superiority'],
  ['fielding effectiveness shortcut', (c) => { c.buildReport.boundaries.fielding_scale_proves_comparative_effectiveness = true; c.publicReport.boundaries.fielding_scale_proves_comparative_effectiveness = true; }, 'Boundary fielding_scale_proves_comparative_effectiveness'],
  ['support exclusivity shortcut', (c) => { c.buildReport.boundaries.continued_support_proves_exclusivity = true; c.publicReport.boundaries.continued_support_proves_exclusivity = true; }, 'Boundary continued_support_proves_exclusivity'],
  ['correction fairness shortcut', (c) => { c.buildReport.boundaries.judicial_correction_proves_later_option_set_fairness = true; c.publicReport.boundaries.judicial_correction_proves_later_option_set_fairness = true; }, 'Boundary judicial_correction_proves_later_option_set_fairness'],
  ['digest drift', (c) => { c.buildReport.release_manifest.combined_sha256 = '0'.repeat(64); c.publicReport.release_manifest.combined_sha256 = '0'.repeat(64); }, 'Report release digest'],
  ['HTML proposal denominator erased', (c) => { c.html = c.html.replace('EIGHT PROPOSALS', 'ONE PROPOSAL'); }, 'HTML proposal denominator missing'],
  ['HTML identity boundary erased', (c) => { c.html = c.html.replace('FIVE OFFEROR IDENTITIES UNRESOLVED', 'ALL OFFERORS KNOWN'); }, 'HTML offeror-identity boundary missing'],
  ['HTML correction erased', (c) => { c.html = c.html.replace('EXTERNAL CORRECTION RETAINED', 'NO CORRECTION'); }, 'HTML correction control missing'],
  ['HTML open denominators erased', (c) => { c.html = c.html.replace('OPERATIONAL TEST RESULTS, SUPPORT DIFFERENTIALS, DATA RIGHTS, SUBSTITUTION, AND EXIT OPEN', 'ALL COMPLETE'); }, 'HTML open-denominator boundary missing'],
  ['HTML digest erased', (c) => { c.html = c.html.replace(c.manifest.combined_sha256, '0'.repeat(64)); }, 'HTML release digest missing'],
  ['HTML noindex erased', (c) => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }, 'HTML noindex boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateDcgsaSupportExit(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-rd06-dcgsa-support-exit.test: ${mutations.length} adversarial mutations PASS`);
