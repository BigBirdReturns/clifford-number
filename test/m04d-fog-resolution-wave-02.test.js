#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-02.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W02');
assert.equal(wave.parent_wave, 'M04D-FR-W01');
assert.equal(wave.records.length, 9);
assert.equal(new Set(wave.records.map((x) => x.record_id)).size, 9);

const terminal = new Set(wave.method.terminal_states);
for (const record of wave.records) {
  assert.ok(record.record_id);
  assert.ok(record.lane);
  assert.ok(record.proposition);
  assert.ok(record.observation);
  assert.ok(record.supports.length);
  assert.ok(record.does_not_support.length);
  assert.ok(terminal.has(record.disposition), record.record_id);
  assert.ok(record.evidence_ceiling);
  assert.ok(record.next_decisive_acquisition);
  assert.ok(record.falsifier);
  for (const source of record.sources) {
    assert.ok(source.publisher);
    assert.ok(source.title);
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.source_type);
    assert.ok(source.locator_state);
  }
}

const byId = new Map(wave.records.map((x) => [x.record_id, x]));
assert.equal(byId.get('M04D-FR-009').evidence_ceiling, 'P2_institutional_substrate');
assert.equal(byId.get('M04D-FR-010').disposition, 'supported_for_human_review');
assert.equal(byId.get('M04D-FR-011').evidence_ceiling, 'P3_P4_mechanism_diffusion');
assert.equal(byId.get('M04D-FR-012').evidence_ceiling, 'actor_specific_sequence_causality_unresolved');
assert.equal(byId.get('M04D-FR-013').disposition, 'bounded_non_link');
assert.equal(byId.get('M04D-FR-013').evidence_ceiling, 'direct_system_identity_non_link');
assert.equal(byId.get('M04D-FR-014').disposition, 'supported_for_human_review');
assert.equal(byId.get('M04D-FR-015').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-016').evidence_ceiling, 'institutional_periodization_not_single_causal_chain');
assert.equal(byId.get('M04D-FR-017').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.direct_ICM_to_RCA_system_join, 'bounded_non_link');
assert.equal(wave.triage_burndown.indirect_ICM_to_RCA_data_flow, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.P1_to_P5_institutional_periodization, 'supported_for_human_review');
assert.equal(wave.triage_burndown.continuous_founder_network_capture_lineage, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.temporal_sequence_proves_causation, false);
assert.equal(wave.boundaries.system_identity_non_link_may_be_ignored, false);
assert.equal(wave.boundaries.one_actor_lane_promotes_network_claim, false);

const opinionRecords = wave.records.filter((record) => record.sources.some((source) => source.source_type === 'judicial_opinion_public_mirror'));
assert.deepEqual(opinionRecords.map((x) => x.record_id).sort(), ['M04D-FR-013', 'M04D-FR-014', 'M04D-FR-015']);
for (const record of opinionRecords) assert.match(record.next_decisive_acquisition, /official opinion PDF|PIA|interface|system/i);

console.log('m04d-fog-resolution-wave-02.test: ok');
