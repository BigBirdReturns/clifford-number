#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadStatusSovereigntyContext, validateStatusSovereignty } from '../tools/validate-status-sovereignty-compact.mjs';

const clean = loadStatusSovereigntyContext();
assert.deepEqual(validateStatusSovereignty(clean), [], 'clean SSC-H01 two-wave state must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));

const mutations = [
  ['patriotism self-promoted', (c) => { c.hypothesis.boundaries.patriotism_is_white_power = true; }, 'SSC boundary patriotism_is_white_power'],
  ['minority presence neutralizes hierarchy', (c) => { c.hypothesis.boundaries.multiracial_presence_proves_neutrality = true; }, 'SSC boundary multiracial_presence_proves_neutrality'],
  ['minority presence forced into tokenism', (c) => { c.hypothesis.boundaries.multiracial_presence_proves_tokenism = true; }, 'SSC boundary multiracial_presence_proves_tokenism'],
  ['disparity self-awards intent', (c) => { c.hypothesis.boundaries.racial_disparity_proves_intent = true; }, 'SSC boundary racial_disparity_proves_intent'],
  ['functional convergence self-awards common purpose', (c) => { c.hypothesis.boundaries.functional_convergence_proves_common_purpose = true; }, 'SSC boundary functional_convergence_proves_common_purpose'],
  ['industrial policy self-awards capture', (c) => { c.hypothesis.boundaries.public_industrial_policy_proves_capture = true; }, 'SSC boundary public_industrial_policy_proves_capture'],
  ['graph edge created', (c) => { c.hypothesis.boundaries.field_hypothesis_creates_actor_edge = true; }, 'SSC boundary field_hypothesis_creates_actor_edge'],
  ['publication self-awarded', (c) => { c.hypothesis.boundaries.field_hypothesis_authorizes_publication = true; }, 'SSC boundary field_hypothesis_authorizes_publication'],
  ['execution erased', (c) => { c.hypothesis.current_state.query_or_field_execution_started = false; }, 'SSC execution state'],
  ['wave count inflated', (c) => { c.hypothesis.current_state.waves_executed = 3; }, 'SSC wave count'],
  ['observation count inflated', (c) => { c.hypothesis.current_state.observations_retained = 23; }, 'SSC retained observation count'],
  ['complete compact self-awarded', (c) => { c.hypothesis.current_state.complete_compact_findings = 1; }, 'SSC complete compact finding count'],
  ['maintainer review erased', (c) => { c.hypothesis.current_state.maintainer_reviewed_observations = 0; }, 'SSC maintainer-reviewed count'],
  ['racial-order finding self-awarded', (c) => { c.hypothesis.current_state.racial_order_finding_generated = true; }, 'SSC current racial_order_finding_generated'],
  ['common-purpose finding self-awarded', (c) => { c.hypothesis.current_state.common_purpose_finding_generated = true; }, 'SSC current common_purpose_finding_generated'],
  ['acquisition supplement erased', (c) => { c.hypothesis.current_state.targeted_acquisition_supplements = 0; }, 'SSC targeted-acquisition supplement count'],
  ['global obligation denominator undercounted', (c) => { c.hypothesis.current_state.open_acquisition_obligations = 3; }, 'SSC open-acquisition obligation count'],
  ['Wave 02 obligation denominator erased', (c) => { c.hypothesis.current_state.wave_02_open_acquisition_obligations = 0; }, 'SSC Wave 02 open-acquisition obligation count'],
  ['Wave 02 maintainer review dropped from registry', (c) => { c.hypothesis.maintainer_reviews.pop(); }, 'SSC maintainer-review registry count'],
  ['acquisition falsely closed', (c) => { c.hypothesis.current_state.closed_acquisition_obligations = 3; }, 'SSC closed acquisition obligation count'],
  ['acquisition disposition changed', (c) => { c.acquisition.counts.reviewed_disposition_changes = 1; }, 'SSC acquisition disposition-change count'],
  ['acquisition complete compact invented', (c) => { c.acquisition.counts.complete_compact_findings = 1; }, 'SSC acquisition complete compact count'],
  ['fanout lane deleted', (c) => { c.fanout.lanes.pop(); }, 'SSC fanout lane count'],
  ['executed lane erased', (c) => { c.fanout.lanes.find((row) => row.lane_id === 'SSC-F05').execution.started = false; }, 'SSC-F05: execution state'],
  ['executed Wave 02 lane erased', (c) => { const row = c.fanout.lanes.find((lane) => lane.lane_id === 'SSC-F01'); row.execution.started = false; }, 'SSC-F01: execution state'],
  ['fanout graph effect invented', (c) => { c.fanout.lanes[0].graph_effect = 'edge'; }, 'SSC-F01: graph effect'],
  ['source synthesis promoted as evidence', (c) => { c.sources.boundaries.source_document_is_canonical_evidence = true; }, 'SSC source authority boundary'],
  ['synthesis references laundered as retrieved', (c) => { c.sources.counts.independently_retrieved_external_references = 8; }, 'SSC synthesis-reference retrieval state'],
  ['field source count inflated', (c) => { c.sources.counts.field_source_records = 30; }, 'SSC field source count'],
  ['normalized facts laundered as bytes', (c) => { c.sources.boundaries.normalized_fact_records_equal_source_bytes = true; }, 'SSC normalized-fact authority boundary'],
  ['field source review laundered as maintainer review', (c) => { c.sources.boundaries.field_source_review_is_maintainer_review = true; }, 'SSC field-review authority boundary'],
  ['review second party invented', (c) => { c.review.counts.second_party_reviewed = 14; }, 'SSC review second-party denominator'],
  ['wave complete compact invented', (c) => { c.wave.counts.supported_bounded_compact = 1; }, 'SSC live wave complete compact count'],
  ['wave racial-order finding invented', (c) => { c.wave.current_result.racial_order_finding_generated = true; }, 'SSC live wave racial-order state'],
  ['core bridge dropped', (c) => { c.core.field_hypothesis_bridges.pop(); }, 'SSC core field-hypothesis bridge count'],
  ['Wave 02 review self-awarded', (c) => { c.wave02Review.counts.second_party_reviewed = 1; }, 'SSC Wave 02 second-party count'],
  ['release manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'SSC exact-byte release manifest'],
  ['public report drift', (c) => { c.publicReport.counts.retained_observations = 999; }, 'SSC build/public report drift']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateStatusSovereignty(context);
  assert(errors.some((error) => error.includes(expected)), `${name} did not fail closed: ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-compact.test: ${mutations.length} adversarial mutations PASS`);
