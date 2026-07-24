#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-04.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W04');
assert.deepEqual(wave.parent_waves, ['M04D-FR-W01', 'M04D-FR-W02', 'M04D-FR-W03']);
assert.equal(wave.records.length, 10);
assert.equal(new Set(wave.records.map((x) => x.record_id)).size, 10);

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
    assert.equal(source.publisher, 'U.S. Army');
    assert.match(source.url, /^https:\/\/www\.army\.mil\//);
    assert.equal(source.source_type, 'official_public_record');
    assert.equal(source.locator_state, 'source_bounded');
  }
}

const byId = new Map(wave.records.map((x) => [x.record_id, x]));
assert.equal(byId.get('M04D-FR-026').evidence_ceiling, 'T2_bounded_NGC2_differentiation');
assert.equal(byId.get('M04D-FR-027').evidence_ceiling, 'T4_BRG09_bounded_NGC2_integration');
assert.equal(byId.get('M04D-FR-028').evidence_ceiling, 'T6_bounded_operational_feedback');
assert.equal(byId.get('M04D-FR-029').evidence_ceiling, 'I3_bounded_division_implementation');
assert.equal(byId.get('M04D-FR-030').evidence_ceiling, 'military_training_decision_effect_chain');
assert.equal(byId.get('M04D-FR-031').disposition, 'bounded_non_link');
assert.equal(byId.get('M04D-FR-032').evidence_ceiling, 'T1_bounded_public_program_purpose');
assert.equal(byId.get('M04D-FR-033').evidence_ceiling, 'bounded_intra_Army_replication');
assert.equal(byId.get('M04D-FR-034').disposition, 'retained_candidate_only');
assert.equal(byId.get('M04D-FR-035').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.T2_functional_differentiation_in_NGC2, 'supported_for_human_review');
assert.equal(wave.triage_burndown.T4_Palantir_Anduril_coordination_in_NGC2, 'supported_for_human_review');
assert.equal(wave.triage_burndown.T6_operational_feedback_in_NGC2, 'supported_for_human_review');
assert.equal(wave.triage_burndown.single_closed_vendor_NGC2_program, 'bounded_non_link');
assert.equal(wave.triage_burndown.system_wide_common_design_after_NGC2, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.bounded_integration_promotes_system_claim, false);
assert.equal(wave.boundaries.training_effect_equals_combat_effect, false);
assert.equal(wave.boundaries.military_effect_equals_civilian_coercion, false);
assert.equal(wave.boundaries.competition_proves_perfect_substitution, false);

const supported = wave.records.filter((record) => record.disposition === 'supported_for_human_review').length;
const nonLinks = wave.records.filter((record) => record.disposition === 'bounded_non_link').length;
const retained = wave.records.filter((record) => record.disposition === 'retained_candidate_only').length;
assert.equal(supported, 7);
assert.equal(nonLinks, 1);
assert.equal(retained, 2);

console.log('m04d-fog-resolution-wave-04.test: ok');
