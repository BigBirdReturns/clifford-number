#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadOscFirstPassContext, validateOscFirstPass } from '../tools/validate-status-sovereignty-osc-first-pass.mjs';

const clean = loadOscFirstPassContext();
assert.deepEqual(validateOscFirstPass(clean), [], 'clean OSC first pass must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['record schema', (c) => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['hypothesis identity', (c) => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.record.issue = 0; }, 'Issue identity'],
  ['observation identity', (c) => { c.record.observation_id = 'OTHER'; }, 'Observation identity'],
  ['lane identity', (c) => { c.record.lane_id = 'SSC-F11'; }, 'Lane identity'],
  ['record status', (c) => { c.record.status = 'complete'; }, 'Record status'],
  ['authority inflation', (c) => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['parent path', (c) => { c.record.parent_custody.path = 'other'; }, 'Parent custody path'],
  ['parent state', (c) => { c.record.parent_custody.state = 'closed'; }, 'Parent custody state'],
  ['source removed', (c) => { c.record.sources.pop(); }, 'Source count'],
  ['source ID duplicate', (c) => { c.record.sources[1].source_id = c.record.sources[0].source_id; }, 'Source IDs must be unique'],
  ['source URL duplicate', (c) => { c.record.sources[1].url = c.record.sources[0].url; }, 'Source URLs must be unique'],
  ['program source class drift', (c) => { c.record.sources[0].source_class = 'press_summary'; }, 'Source class 1'],
  ['loan source class drift', (c) => { c.record.sources[2].source_class = 'conditional'; }, 'Source class 3'],
  ['commitment source class drift', (c) => { c.record.sources[4].source_class = 'executed_loan'; }, 'Source class 5'],
  ['source facts erased', (c) => { c.record.sources[1].retrieved_facts = []; }, 'Recovered fact count 2'],
  ['source URL insecure', (c) => { c.record.sources[0].url = 'http://example.test'; }, 'Source URL 1 must be HTTPS'],
  ['application count inflated', (c) => { c.record.published_program_denominator.applications_minimum = 201; }, 'Published program denominator'],
  ['requested amount drift', (c) => { c.record.published_program_denominator.requested_usd = 8900000001; }, 'Published program denominator'],
  ['capacity drift', (c) => { c.record.published_program_denominator.initial_capacity_usd = 985000000; }, 'Published program denominator'],
  ['states drift', (c) => { c.record.published_program_denominator.states_represented = 39; }, 'Published program denominator'],
  ['minimum request drift', (c) => { c.record.published_program_denominator.request_minimum_usd = 1; }, 'Published program denominator'],
  ['maximum request drift', (c) => { c.record.published_program_denominator.request_maximum_usd = 1; }, 'Published program denominator'],
  ['applicant identities invented', (c) => { c.record.published_program_denominator.complete_applicant_identities_published = true; }, 'Published program denominator'],
  ['selection denominator invented', (c) => { c.record.published_program_denominator.complete_selected_and_rejected_rows_published = true; }, 'Published program denominator'],
  ['executed loans inflated', (c) => { c.record.named_instrument_subset.executed_direct_loans = 5; }, 'Named instrument subset'],
  ['conditional commitments collapsed', (c) => { c.record.named_instrument_subset.conditional_commitments = 0; }, 'Named instrument subset'],
  ['named amount drift', (c) => { c.record.named_instrument_subset.named_amounts_usd = 2075000001; }, 'Named instrument subset'],
  ['NOFA reconciliation invented', (c) => { c.record.named_instrument_subset.reconciled_to_inaugural_NOFA = true; }, 'Named instrument subset'],
  ['current commitment denominator invented', (c) => { c.record.named_instrument_subset.complete_current_OSC_commitment_denominator = true; }, 'Named instrument subset'],
  ['named instrument count drift', (c) => { c.record.named_instrument_subset.executed_direct_loans = 2; c.record.named_instrument_subset.conditional_commitments = 4; }, 'Named instrument count'],
  ['state boundary removed', (c) => { c.record.state_distinctions.pop(); }, 'State distinctions'],
  ['commitment boundary reversed', (c) => { c.record.state_distinctions[3] = 'conditional_commitment_is_executed_loan'; }, 'State distinctions'],
  ['disbursement boundary reversed', (c) => { c.record.state_distinctions[4] = 'executed_loan_is_disbursement'; }, 'State distinctions'],
  ['state boundary duplicated', (c) => { c.record.state_distinctions[1] = c.record.state_distinctions[0]; }, 'State distinctions'],
  ['open denominator removed', (c) => { c.record.open_denominators.pop(); }, 'Open denominator count'],
  ['open denominator duplicated', (c) => { c.record.open_denominators[1] = c.record.open_denominators[0]; }, 'Open denominators must be unique'],
  ['terminal state closed', (c) => { c.record.current_result.terminal_state = 'complete_underwriting_to_recovery_chain'; }, 'Current result'],
  ['reviewed disposition changed', (c) => { c.record.current_result.reviewed_disposition_changed = true; }, 'Current result'],
  ['underwriting chain invented', (c) => { c.record.current_result.complete_underwriting_to_recovery_chain = true; }, 'Current result'],
  ['favoritism invented', (c) => { c.record.current_result.favoritism_finding = true; }, 'Current result'],
  ['extraction invented', (c) => { c.record.current_result.extraction_finding = true; }, 'Current result'],
  ['compact finding invented', (c) => { c.record.current_result.complete_compact_finding = true; }, 'Current result'],
  ['graph effect invented', (c) => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['publication effect invented', (c) => { c.record.current_result.publication_effect = 'public'; }, 'Current result'],
  ['application volume shortcut', (c) => { c.record.boundaries.application_volume_proves_selection_quality = true; }, 'Authority boundaries'],
  ['strategic financing shortcut', (c) => { c.record.boundaries.strategic_financing_proves_favoritism = true; }, 'Authority boundaries'],
  ['commitment loan shortcut', (c) => { c.record.boundaries.conditional_commitment_is_executed_loan = true; }, 'Authority boundaries'],
  ['loan disbursement shortcut', (c) => { c.record.boundaries.executed_loan_is_disbursed_and_repaid = true; }, 'Authority boundaries'],
  ['named cohort shortcut', (c) => { c.record.boundaries.named_subset_is_complete_cohort = true; }, 'Authority boundaries'],
  ['capacity extraction shortcut', (c) => { c.record.boundaries.private_capacity_proves_extraction = true; }, 'Authority boundaries'],
  ['schema issue drift', (c) => { c.schema.properties.issue.const = 0; }, 'Schema issue'],
  ['schema source minimum drift', (c) => { c.schema.properties.sources.minItems = 1; }, 'Schema source minimum'],
  ['schema state minimum drift', (c) => { c.schema.properties.state_distinctions.minItems = 1; }, 'Schema state distinction minimum'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['build manifest drift', (c) => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Build manifest drift'],
  ['report drift', (c) => { c.publicReport.counts.observed_public_recovery_denominators = 1; }, 'Build/public report drift'],
  ['report count inflation', (c) => { c.buildReport.counts.observed_disbursement_denominators = 1; c.publicReport.counts.observed_disbursement_denominators = 1; }, 'Report count observed_disbursement_denominators'],
  ['HTML applicant boundary erased', (c) => { c.html = c.html.replace('APPLICATION DENOMINATOR OPEN', 'APPLICATION DENOMINATOR COMPLETE'); }, 'HTML applicant-denominator boundary missing'],
  ['HTML commitment boundary erased', (c) => { c.html = c.html.replace('CONDITIONAL COMMITMENT NOT EXECUTED LOAN', 'CONDITIONAL COMMITMENT IS EXECUTED LOAN'); }, 'HTML commitment/loan boundary missing'],
  ['HTML disbursement boundary erased', (c) => { c.html = c.html.replace('EXECUTED LOAN NOT DISBURSEMENT', 'EXECUTED LOAN IS DISBURSEMENT'); }, 'HTML loan/disbursement boundary missing'],
  ['HTML recovery boundary erased', (c) => { c.html = c.html.replace('PUBLIC RECOVERY UNOBSERVED', 'PUBLIC RECOVERY OBSERVED'); }, 'HTML public-recovery boundary missing'],
  ['HTML digest erased', (c) => { c.html = c.html.replace(c.manifest.combined_sha256, '0'.repeat(64)); }, 'HTML release digest missing'],
  ['HTML noindex erased', (c) => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }, 'HTML noindex boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateOscFirstPass(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-osc-first-pass.test: ${mutations.length} adversarial mutations PASS`);
