#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSnapGateContext, validateSnapGate } from '../tools/validate-status-sovereignty-f02-snap.mjs';

const clean = loadSnapGateContext();
assert.deepEqual(validateSnapGate(clean), [], 'clean SNAP gate first pass must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['schema identity', (c) => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['hypothesis identity', (c) => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.record.issue = 0; }, 'Issue identity'],
  ['observation identity', (c) => { c.record.observation_id = 'OTHER'; }, 'Observation identity'],
  ['lane identity', (c) => { c.record.lane_id = 'SSC-F03'; }, 'Lane identity'],
  ['authority inflation', (c) => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['selection expectation', (c) => { c.record.selection_contract.selected_because_expected_to_confirm_hypothesis = true; }, 'Selection expectation boundary'],
  ['selection universe erased', (c) => { c.record.selection_contract.declared_universe = 'other'; }, 'Declared selection universe missing'],
  ['source removed', (c) => { c.record.sources.pop(); }, 'Source count'],
  ['source duplicate', (c) => { c.record.sources[1].source_id = c.record.sources[0].source_id; }, 'Source IDs must be unique'],
  ['URL duplicate', (c) => { c.record.sources[1].url = c.record.sources[0].url; }, 'Source URLs must be unique'],
  ['source class drift', (c) => { c.record.sources[5].source_class = 'advocacy_summary'; }, 'Source class order'],
  ['facts erased', (c) => { c.record.sources[0].retrieved_facts = []; }, 'recovered facts missing'],
  ['insecure URL', (c) => { c.record.sources[0].url = 'http://example.test'; }, 'source URL must be HTTPS'],
  ['G1 erased', (c) => { c.record.four_gate_first_pass['SSC-G1_status_and_deservingness'] = 'unsupported'; }, 'Four-gate first pass'],
  ['G2 promoted', (c) => { c.record.four_gate_first_pass['SSC-G2_epistemic_admissibility'] = 'complete'; }, 'Four-gate first pass'],
  ['G3 erased', (c) => { c.record.four_gate_first_pass['SSC-G3_material_conversion'] = 'none'; }, 'Four-gate first pass'],
  ['G4 effectiveness invented', (c) => { c.record.four_gate_first_pass['SSC-G4_correction_monopoly'] = 'effective_counterpower'; }, 'Four-gate first pass'],
  ['denominator removed', (c) => { c.record.open_denominators.pop(); }, 'Open denominator count'],
  ['denominator duplicated', (c) => { c.record.open_denominators[1] = c.record.open_denominators[0]; }, 'Open denominators must be unique'],
  ['ordinary policy control removed', (c) => { c.record.candidate_terminal_states = c.record.candidate_terminal_states.filter((x) => x !== 'ordinary_lawful_policy_explanation'); }, 'Ordinary-policy control state missing'],
  ['unsupported state removed', (c) => { c.record.candidate_terminal_states = c.record.candidate_terminal_states.filter((x) => x !== 'racial_hierarchy_unsupported'); }, 'Unsupported racial-hierarchy state missing'],
  ['open state removed', (c) => { c.record.candidate_terminal_states = c.record.candidate_terminal_states.filter((x) => x !== 'requires_additional_acquisition'); }, 'Open acquisition state missing'],
  ['result closed', (c) => { c.record.current_result.terminal_state = 'bounded_nested_superiority_chain_supported'; }, 'Current result'],
  ['racial finding invented', (c) => { c.record.current_result.racial_hierarchy_finding = true; }, 'Current result'],
  ['unlawful finding invented', (c) => { c.record.current_result.unlawful_discrimination_finding = true; }, 'Current result'],
  ['prevalence invented', (c) => { c.record.current_result.prevalence_finding = true; }, 'Current result'],
  ['graph effect invented', (c) => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['formal hearing inflated', (c) => { c.record.boundaries.formal_hearing_proves_effective_counterpower = true; }, 'Boundary formal_hearing_proves_effective_counterpower'],
  ['rhetoric inflated', (c) => { c.record.boundaries.deservingness_rhetoric_proves_racial_hierarchy = true; }, 'Boundary deservingness_rhetoric_proves_racial_hierarchy'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['report drift', (c) => { c.publicReport.counts.racial_hierarchy_findings = 1; }, 'Build/public report drift'],
  ['HTML correction erased', (c) => { c.html = c.html.replace('PRACTICAL CORRECTION UNRESOLVED', 'PRACTICAL CORRECTION COMPLETE'); }, 'HTML correction boundary missing'],
  ['HTML racial boundary erased', (c) => { c.html = c.html.replace('RACIAL HIERARCHY NOT ESTABLISHED', 'RACIAL HIERARCHY ESTABLISHED'); }, 'HTML racial-hierarchy boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateSnapGate(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-f02-snap.test: ${mutations.length} adversarial mutations PASS`);
