#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadWave01Context, validateWave01 } from '../tools/validate-status-sovereignty-wave-01.mjs';

const clean = loadWave01Context();
assert.deepEqual(validateWave01(clean), [], 'clean SSC Wave 01 must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));

// Key order must never become evidence. The validator canonicalizes count maps.
{
  const context = clone();
  context.wave.lane_counts = Object.fromEntries(Object.entries(context.wave.lane_counts).reverse());
  context.wave.disposition_counts = Object.fromEntries(Object.entries(context.wave.disposition_counts).reverse());
  assert.deepEqual(validateWave01(context), [], 'count-map insertion order must not alter the denominator');
}

const mutations = [
  ['wave identity drift', (c) => { c.wave.wave_id = 'SSC-W99'; }, 'Wave 01 identity'],
  ['target-first selection invented', (c) => { c.wave.selection_contract.target_first_selection = true; }, 'Wave 01 target-first selection boundary'],
  ['source record removed', (c) => { c.sources.records.pop(); }, 'Wave 01 source record count'],
  ['source IDs duplicated', (c) => { c.sources.records[1].source_id = c.sources.records[0].source_id; }, 'Wave 01 source IDs duplicate'],
  ['source digest drift', (c) => { c.sources.records[0].normalized_fact_record[0] += ' changed'; }, 'SSC-W01-S001: normalized fact digest'],
  ['source bytes invented', (c) => { c.sources.records[0].retrieval.source_bytes_preserved = true; }, 'SSC-W01-S001: source-byte state'],
  ['first-party source laundered', (c) => { c.sources.boundaries.first_party_statement_is_independent_validation = true; }, 'Wave 01 first-party authority boundary'],
  ['observation removed', (c) => { c.wave.observations.pop(); }, 'Wave 01 observation count'],
  ['observation ID duplicated', (c) => { c.wave.observations[1].observation_id = c.wave.observations[0].observation_id; }, 'Wave 01 observation IDs duplicate'],
  ['undeclared observation field', (c) => { c.wave.observations[0].secret_intent = true; }, 'undeclared field secret_intent'],
  ['missing affected population', (c) => { c.wave.observations[0].affected_population_or_institution = ''; }, 'affected population missing'],
  ['source reference orphaned', (c) => { c.wave.observations[0].source_ids = ['SSC-W01-S999']; }, 'missing source SSC-W01-S999'],
  ['complete compact self-awarded', (c) => { c.wave.observations[0].disposition = 'supported_bounded_compact'; }, 'complete compact self-awarded'],
  ['maintainer review erased', (c) => { c.wave.observations[0].review_state = 'unreviewed'; }, 'review state'],
  ['graph effect created', (c) => { c.wave.observations[0].graph_effect = 'edge'; }, 'graph effect'],
  ['racial-order finding promoted', (c) => { c.wave.current_result.racial_order_finding_generated = true; }, 'racial_order_finding_generated'],
  ['publication promoted', (c) => { c.wave.current_result.publication_status = 'public'; }, 'Wave 01 publication status'],
  ['partial count inflated', (c) => { c.wave.counts.partial_functional_convergence = 7; }, 'Wave 01 count partial_functional_convergence'],
  ['lane count inflated', (c) => { c.wave.lane_counts['SSC-F05'] = 2; }, 'Wave 01 lane denominator'],
  ['source usage rewritten', (c) => { c.sources.records[0].used_by_observation_ids = ['SSC-OBS-0014']; }, 'SSC-W01-S001: observation usage drift'],
  ['review row disposition laundered', (c) => { c.review.reviewed_observations[0].reviewed_disposition = 'supported_bounded_compact'; }, 'Wave 01 review row authority drift'],
  ['parent execution erased', (c) => { c.hypothesis.current_state.query_or_field_execution_started = false; }, 'Wave 01 parent execution state'],
  ['parent finding invented', (c) => { c.hypothesis.current_state.common_purpose_finding_generated = true; }, 'Wave 01 parent common_purpose_finding_generated'],
  ['fanout lane erased', (c) => { c.fanout.lanes.find((row) => row.lane_id === 'SSC-F05').execution.started = false; }, 'SSC-F05: execution state'],
  ['unexecuted lane invented', (c) => { const row = c.fanout.lanes.find((lane) => lane.lane_id === 'SSC-F01'); row.execution = { started: true, records_observed: 1, records_retained: 1, terminal_records: 1 }; }, 'SSC-F01: execution state'],
  ['field source count inflated', (c) => { c.sourceRegistry.counts.field_source_records = 16; }, 'Wave 01 source-registry field source count'],
  ['field review laundered', (c) => { c.sourceRegistry.boundaries.field_source_review_is_maintainer_review = true; }, 'Wave 01 review-authority boundary'],
  ['release manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Wave 01 exact-byte manifest'],
  ['public report drift', (c) => { c.publicReport.counts.observations = 99; }, 'Wave 01 build/public report drift']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateWave01(context);
  assert(errors.some((error) => error.includes(expected)), `${name} did not fail closed: ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-wave-01.test: ${mutations.length} adversarial mutations PASS`);
