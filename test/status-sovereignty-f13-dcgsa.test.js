#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadDcgsAFirstPassContext, validateDcgsAFirstPass } from '../tools/validate-status-sovereignty-f13-dcgsa.mjs';

const clean = loadDcgsAFirstPassContext();
assert.deepEqual(validateDcgsAFirstPass(clean), [], 'clean DCGS-A first pass must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['schema identity', (c) => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['hypothesis identity', (c) => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.record.issue = 0; }, 'Issue identity'],
  ['observation identity', (c) => { c.record.observation_id = 'OTHER'; }, 'Observation identity'],
  ['lane identity', (c) => { c.record.lane_id = 'SSC-F12'; }, 'Lane identity'],
  ['authority inflation', (c) => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['source removed', (c) => { c.record.sources.pop(); }, 'Source count'],
  ['source duplicate', (c) => { c.record.sources[1].source_id = c.record.sources[0].source_id; }, 'Source IDs must be unique'],
  ['URL duplicate', (c) => { c.record.sources[1].url = c.record.sources[0].url; }, 'Source URLs must be unique'],
  ['source class drift', (c) => { c.record.sources[2].source_class = 'press_summary'; }, 'Source class order'],
  ['fact loss', (c) => { c.record.sources[0].retrieved_facts = []; }, 'recovered facts missing'],
  ['insecure URL', (c) => { c.record.sources[0].url = 'http://example.test'; }, 'source URL must be HTTPS'],
  ['chronology removed', (c) => { c.record.chronology.pop(); }, 'Chronology count'],
  ['chronology order', (c) => { c.record.chronology.reverse(); }, 'Chronology order'],
  ['chronology trivialized', (c) => { c.record.chronology[0].event = 'short'; }, 'Chronology events must remain substantive'],
  ['architectures erased', (c) => { c.record.first_pass_findings.multiple_architectures_and_offerors_observed = false; }, 'First-pass findings'],
  ['correction erased', (c) => { c.record.first_pass_findings.external_judicial_correction_observed = false; }, 'First-pass findings'],
  ['foreclosure invented', (c) => { c.record.first_pass_findings.counterfactual_foreclosure_supported = true; }, 'First-pass findings'],
  ['option set invented complete', (c) => { c.record.first_pass_findings.complete_initial_option_universe = true; }, 'First-pass findings'],
  ['support equality invented', (c) => { c.record.first_pass_findings.comparable_data_and_test_access = true; }, 'First-pass findings'],
  ['denominator removed', (c) => { c.record.open_denominators.pop(); }, 'Open denominator count'],
  ['denominator duplicated', (c) => { c.record.open_denominators[1] = c.record.open_denominators[0]; }, 'Open denominators must be unique'],
  ['control terminal removed', (c) => { c.record.candidate_terminal_states = c.record.candidate_terminal_states.filter((x) => x !== 'open_competition_and_effective_review_control'); }, 'External-review control terminal state missing'],
  ['open state removed', (c) => { c.record.candidate_terminal_states = c.record.candidate_terminal_states.filter((x) => x !== 'requires_additional_acquisition'); }, 'Open acquisition terminal state missing'],
  ['result closed', (c) => { c.record.current_result.terminal_state = 'counterfactual_foreclosure_supported_bounded'; }, 'Current result'],
  ['superiority invented', (c) => { c.record.current_result.technical_superiority_finding = true; }, 'Current result'],
  ['favoritism invented', (c) => { c.record.current_result.favoritism_finding = true; }, 'Current result'],
  ['common purpose invented', (c) => { c.record.current_result.common_purpose_finding = true; }, 'Current result'],
  ['graph effect invented', (c) => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['boundary relaxed', (c) => { c.record.boundaries.court_victory_proves_vendor_superiority = true; }, 'Boundary court_victory_proves_vendor_superiority'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['report drift', (c) => { c.publicReport.counts.foreclosure_findings = 1; }, 'Build/public report drift'],
  ['HTML boundary erased', (c) => { c.html = c.html.replace('FORECLOSURE NOT ESTABLISHED', 'FORECLOSURE ESTABLISHED'); }, 'HTML foreclosure boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateDcgsAFirstPass(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-f13-dcgsa.test: ${mutations.length} adversarial mutations PASS`);
