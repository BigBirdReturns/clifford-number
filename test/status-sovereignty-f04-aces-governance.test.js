#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadAcesGovernanceContext, validateAcesGovernance } from '../tools/validate-status-sovereignty-f04-aces-governance.mjs';

const clean = loadAcesGovernanceContext();
assert.deepEqual(validateAcesGovernance(clean), [], 'clean ACES first pass must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));

const mutations = [
  ['schema', (c) => { c.record.schema_version = 'other'; }, 'ACES schema'],
  ['hypothesis', (c) => { c.record.hypothesis_id = 'OTHER'; }, 'ACES hypothesis'],
  ['issue', (c) => { c.record.issue = 999; }, 'ACES issue'],
  ['observation', (c) => { c.record.observation_id = 'SSC-OBS-X'; }, 'ACES observation'],
  ['lane', (c) => { c.record.lane_id = 'SSC-F03'; }, 'ACES lane'],
  ['authority', (c) => { c.record.authority = 'adjudicated'; }, 'ACES authority'],
  ['target-first', (c) => { c.record.selection_contract.selected_because_expected_to_show_tokenism_or_neutrality = true; }, 'ACES target-first boundary'],
  ['source removed', (c) => { c.record.sources.pop(); }, 'ACES source denominator'],
  ['source order', (c) => { c.record.sources.reverse(); }, 'ACES source order'],
  ['source ID duplicate', (c) => { c.record.sources[1].source_id = c.record.sources[0].source_id; }, 'ACES source ID uniqueness'],
  ['source URL duplicate', (c) => { c.record.sources[1].url = c.record.sources[0].url; }, 'ACES source URL uniqueness'],
  ['nonofficial publisher', (c) => { c.record.sources[0].publisher = 'Unknown'; }, 'nonofficial publisher'],
  ['fact erasure', (c) => { c.record.sources[0].retrieved_facts = []; }, 'recovered facts missing'],
  ['member inflation', (c) => { c.record.governance_denominator.published_inaugural_members = 18; }, 'ACES member denominator'],
  ['binding budget invented', (c) => { c.record.governance_denominator.binding_budget_authority_observed = true; }, 'ACES budget authority'],
  ['binding licensing invented', (c) => { c.record.governance_denominator.binding_licensing_authority_observed = true; }, 'ACES licensing authority'],
  ['binding veto invented', (c) => { c.record.governance_denominator.binding_veto_or_stay_authority_observed = true; }, 'ACES veto authority'],
  ['nomination complete invented', (c) => { c.record.governance_denominator.complete_nomination_and_rejection_denominator = true; }, 'ACES nomination denominator'],
  ['neutrality claim invented', (c) => { c.record.mechanism_test.public_claim_that_representation_proves_neutrality_observed = true; }, 'ACES neutrality claim'],
  ['tokenism invented', (c) => { c.record.mechanism_test.tokenism_established = true; }, 'ACES tokenism finding'],
  ['counterpower invented', (c) => { c.record.mechanism_test.independent_multiracial_counterpower_established = true; }, 'ACES counterpower finding'],
  ['open denominator removed', (c) => { c.record.open_denominators.pop(); }, 'ACES open denominator count'],
  ['terminal promoted', (c) => { c.record.current_result.terminal_state = 'representation_legitimacy_mechanism_supported_bounded'; }, 'ACES current result'],
  ['neutrality finding promoted', (c) => { c.record.current_result.institutional_neutrality_proved = true; }, 'ACES current result'],
  ['racial finding promoted', (c) => { c.record.current_result.racial_hierarchy_finding = true; }, 'ACES current result'],
  ['graph effect promoted', (c) => { c.record.current_result.graph_effect = 'edge'; }, 'ACES current result'],
  ['boundary weakened', (c) => { c.record.boundaries.diverse_roster_proves_neutrality = true; }, 'ACES boundary diverse_roster_proves_neutrality'],
  ['schema issue drift', (c) => { c.schema.properties.issue.const = 545; }, 'ACES schema issue'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'ACES exact-byte manifest'],
  ['public report drift', (c) => { c.publicReport.counts.bounded_non_links = 0; }, 'ACES build/public report drift'],
  ['report finding invented', (c) => { c.buildReport.counts.neutrality_findings = 1; c.publicReport.counts.neutrality_findings = 1; }, 'ACES report neutrality_findings'],
  ['HTML boundary erased', (c) => { c.html = c.html.replace('NEUTRALITY NOT ESTABLISHED', 'NEUTRALITY ESTABLISHED'); }, 'ACES HTML neutrality boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateAcesGovernance(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`status-sovereignty-f04-aces-governance.test: ${mutations.length} adversarial mutations PASS`);
