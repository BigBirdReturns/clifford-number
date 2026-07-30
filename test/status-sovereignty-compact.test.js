#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (rel) => JSON.parse(fs.readFileSync(rel, 'utf8'));
const original = read('data/project/status-sovereignty-compact.json');
const originalFanout = read('data/project/status-sovereignty-fanout.json');
const originalSources = read('data/project/status-sovereignty-source-registry.json');
const pagesBuilder = fs.readFileSync('tools/build-pages.mjs', 'utf8');
const publicationPlan = read('data/project/publication-plan.json');
const pagesValidator = fs.readFileSync('tools/validate-pages.mjs', 'utf8');

function errors(h, f, s) {
  const out = [];
  if (h.hypothesis_id !== 'SSC-H01') out.push('hypothesis_id');
  if (h.four_gate_discriminator.length !== 4) out.push('gate_count');
  if (h.dimensions.length !== 10) out.push('dimension_count');
  if (h.boundaries.patriotism_is_white_power !== false) out.push('patriotism_boundary');
  if (h.boundaries.multiracial_presence_proves_neutrality !== false) out.push('neutrality_boundary');
  if (h.boundaries.multiracial_presence_proves_tokenism !== false) out.push('tokenism_boundary');
  if (h.boundaries.racial_disparity_proves_intent !== false) out.push('intent_boundary');
  if (h.boundaries.functional_convergence_proves_common_purpose !== false) out.push('common_purpose_boundary');
  if (h.boundaries.public_industrial_policy_proves_capture !== false) out.push('industrial_policy_boundary');
  if (h.boundaries.field_hypothesis_creates_actor_edge !== false || h.boundaries.graph_effect !== 'none') out.push('graph_boundary');
  if (h.boundaries.field_hypothesis_authorizes_publication !== false) out.push('publication_boundary');
  if (h.current_state.query_or_field_execution_started !== false || h.current_state.observations_retained !== 0) out.push('execution_state');
  if (h.current_state.prevalence_finding_generated !== false || h.current_state.racial_order_finding_generated !== false || h.current_state.common_purpose_finding_generated !== false) out.push('finding_state');
  if (f.lanes.length !== 16 || f.issue_groups.length !== 8) out.push('fanout_denominator');
  if (f.lanes.some((row) => row.execution.started || row.execution.records_observed || row.execution.records_retained)) out.push('lane_execution');
  if (f.boundaries.issue_count_proves_coverage !== false) out.push('issue_coverage_boundary');
  if (f.boundaries.controls_may_be_dropped !== false) out.push('control_boundary');
  if (s.boundaries.source_document_is_canonical_evidence !== false) out.push('source_authority');
  if (s.counts.independently_retrieved_external_references !== 0) out.push('source_retrieval_state');
  return out;
}

assert.deepEqual(errors(original, originalFanout, originalSources), []);
assert.match(pagesBuilder, /buildPublicationArtifact/);
assert.equal(publicationPlan.default_decision, 'exclude');
const publicationHeld = new Set((publicationPlan.held_surfaces ?? []).map((item) => item.path.replace(/\/$/, '')));
for (const heldPath of [
  'build/core-thesis/status-sovereignty',
  'reports/core-thesis/status-sovereignty',
  'data/project/status-sovereignty-compact.json',
  'data/project/status-sovereignty-fanout.json',
  'data/project/status-sovereignty-release-manifest.json',
  'data/project/status-sovereignty-source-registry.json',
  'docs/methods/status-sovereignty-compact.md',
  'docs/milestones/m05-status-sovereignty-fanout.md'
]) {
  assert(publicationHeld.has(heldPath), `Publication plan does not hold ${heldPath}`);
  assert(pagesValidator.includes(`'${heldPath}'`), `Pages validator does not refuse ${heldPath}`);
}
const cases = [
  ['patriotism self-promoted', (h) => { h.boundaries.patriotism_is_white_power = true; }, 'patriotism_boundary'],
  ['minority presence neutralizes hierarchy', (h) => { h.boundaries.multiracial_presence_proves_neutrality = true; }, 'neutrality_boundary'],
  ['minority presence forced into tokenism', (h) => { h.boundaries.multiracial_presence_proves_tokenism = true; }, 'tokenism_boundary'],
  ['disparity self-awards intent', (h) => { h.boundaries.racial_disparity_proves_intent = true; }, 'intent_boundary'],
  ['functional convergence self-awards common purpose', (h) => { h.boundaries.functional_convergence_proves_common_purpose = true; }, 'common_purpose_boundary'],
  ['industrial policy self-awards capture', (h) => { h.boundaries.public_industrial_policy_proves_capture = true; }, 'industrial_policy_boundary'],
  ['graph edge created', (h) => { h.boundaries.field_hypothesis_creates_actor_edge = true; }, 'graph_boundary'],
  ['publication self-awarded', (h) => { h.boundaries.field_hypothesis_authorizes_publication = true; }, 'publication_boundary'],
  ['racial order finding self-awarded', (h) => { h.current_state.racial_order_finding_generated = true; }, 'finding_state'],
  ['execution self-awarded', (h) => { h.current_state.query_or_field_execution_started = true; h.current_state.observations_retained = 16; }, 'execution_state'],
  ['fanout lane deleted', (_h, f) => { f.lanes.pop(); }, 'fanout_denominator'],
  ['lane execution invented', (_h, f) => { f.lanes[0].execution.started = true; f.lanes[0].execution.records_observed = 1; }, 'lane_execution'],
  ['issue count laundered into coverage', (_h, f) => { f.boundaries.issue_count_proves_coverage = true; }, 'issue_coverage_boundary'],
  ['controls made optional', (_h, f) => { f.boundaries.controls_may_be_dropped = true; }, 'control_boundary'],
  ['source synthesis promoted as evidence', (_h, _f, s) => { s.boundaries.source_document_is_canonical_evidence = true; }, 'source_authority'],
  ['external retrieval invented', (_h, _f, s) => { s.counts.independently_retrieved_external_references = 8; }, 'source_retrieval_state']
];
for (const [name, mutate, expected] of cases) {
  const h = structuredClone(original);
  const f = structuredClone(originalFanout);
  const s = structuredClone(originalSources);
  mutate(h, f, s);
  assert(errors(h, f, s).includes(expected), `${name} did not fail closed`);
}
console.log(`status-sovereignty-compact.test: ${cases.length} adversarial mutations PASS`);
