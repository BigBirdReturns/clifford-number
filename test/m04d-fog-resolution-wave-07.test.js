#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-07.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W07');
assert.deepEqual(wave.parent_waves, ['M04D-FR-W01', 'M04D-FR-W02', 'M04D-FR-W03', 'M04D-FR-W04', 'M04D-FR-W05', 'M04D-FR-W06']);
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
    assert.ok(source.publisher);
    assert.ok(source.title);
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.source_type);
    assert.ok(source.locator_state);
  }
}

const byId = new Map(wave.records.map((x) => [x.record_id, x]));
assert.equal(byId.get('M04D-FR-054').evidence_ceiling, 'bounded_Ukraine_combat_data_platform');
assert.equal(byId.get('M04D-FR-055').evidence_ceiling, 'public_platform_ecosystem_reproduction');
assert.equal(byId.get('M04D-FR-056').evidence_ceiling, 'two_sided_Ukraine_UK_data_to_production_transfer');
assert.equal(byId.get('M04D-FR-057').evidence_ceiling, 'feedback_to_procurement_scaling_mechanism');
assert.equal(byId.get('M04D-FR-058').evidence_ceiling, 'two_sided_Ukraine_Poland_method_and_standard_transfer');
assert.equal(byId.get('M04D-FR-059').evidence_ceiling, 'Ukraine_to_NATO_validated_solution_scaling');
assert.equal(byId.get('M04D-FR-060').evidence_ceiling, 'public_battlefield_feedback_market_cycle');
assert.equal(byId.get('M04D-FR-061').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-062').evidence_ceiling, 'institution_level_Ukraine_feedback_and_normalization');
assert.equal(byId.get('M04D-FR-063').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.Palantir_Brave1_combat_data_platform, 'supported_for_human_review');
assert.equal(wave.triage_burndown.Ukraine_frontline_data_to_UK_production, 'supported_for_human_review');
assert.equal(wave.triage_burndown.Ukraine_feedback_to_follow_on_procurement, 'supported_for_human_review');
assert.equal(wave.triage_burndown.Palantir_specific_Ukraine_to_allied_transfer, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.Ukraine_theater_feedback_and_normalization, 'supported_for_human_review');
assert.equal(wave.triage_burndown.system_wide_common_design_after_Ukraine, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.Palantir_participation_proves_transfer_object, false);
assert.equal(wave.boundaries.allied_transfer_proves_private_control, false);
assert.equal(wave.boundaries.institutional_normalization_promotes_network_claim, false);

const supported = wave.records.filter((record) => record.disposition === 'supported_for_human_review').length;
const additional = wave.records.filter((record) => record.disposition === 'requires_additional_acquisition').length;
const retained = wave.records.filter((record) => record.disposition === 'retained_candidate_only').length;
assert.equal(supported, 8);
assert.equal(additional, 1);
assert.equal(retained, 1);

console.log('m04d-fog-resolution-wave-07.test: ok');
