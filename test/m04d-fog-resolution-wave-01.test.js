#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-01.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W01');
assert.equal(wave.records.length, 8);
assert.equal(new Set(wave.records.map((x) => x.record_id)).size, wave.records.length);

const terminal = new Set(wave.method.terminal_states);
for (const record of wave.records) {
  assert.ok(record.record_id);
  assert.ok(record.lane);
  assert.ok(record.proposition);
  assert.ok(record.observation);
  assert.ok(record.supports.length);
  assert.ok(record.does_not_support.length);
  assert.ok(terminal.has(record.disposition), `${record.record_id}: disposition`);
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
assert.equal(byId.get('M04D-FR-001').disposition, 'supported_for_human_review');
assert.equal(byId.get('M04D-FR-002').evidence_ceiling, 'I2_bounded_procurement_gate');
assert.equal(byId.get('M04D-FR-004').evidence_ceiling, 'I3_and_C5_bounded_Army_lane');
assert.equal(byId.get('M04D-FR-005').evidence_ceiling, 'I3_C5_and_partial_H3_ICE_lane');
assert.equal(byId.get('M04D-FR-007').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-008').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.I2_deliberate_market_shaping, 'supported_for_human_review_in_Palantir_DCGS_lane');
assert.equal(wave.triage_burndown.I3_institutional_replacement, 'supported_for_human_review_in_Army_EA_and_ICE_ICM_lanes');
assert.equal(wave.triage_burndown.I4_coercive_ideological_governance, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.system_wide_deliberate_coordinated_capture, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.local_support_promotes_system_claim, false);
assert.equal(wave.boundaries.secondary_text_mirror_equals_primary_byte_custody, false);

const mirrorRecords = wave.records.filter((record) => record.sources.some((source) => source.source_type === 'secondary_text_mirror'));
assert.deepEqual(mirrorRecords.map((x) => x.record_id).sort(), ['M04D-FR-004', 'M04D-FR-005']);
for (const record of mirrorRecords) {
  assert.match(record.next_decisive_acquisition, /official .*bytes/i);
}

console.log('m04d-fog-resolution-wave-01.test: ok');
