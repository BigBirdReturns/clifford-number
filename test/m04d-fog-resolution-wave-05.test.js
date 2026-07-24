#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-05.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W05');
assert.deepEqual(wave.parent_waves, ['M04D-FR-W01', 'M04D-FR-W02', 'M04D-FR-W03', 'M04D-FR-W04']);
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
assert.equal(byId.get('M04D-FR-036').evidence_ceiling, 'policy_to_enforcement_system_design');
assert.equal(byId.get('M04D-FR-037').evidence_ceiling, 'bounded_ERO_operational_deployment');
assert.equal(byId.get('M04D-FR-038').evidence_ceiling, 'designed_enforcement_workflow_not_case_effect');
assert.equal(byId.get('M04D-FR-039').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-040').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-041').evidence_ceiling, 'award_level_public_resource_flow');
assert.equal(byId.get('M04D-FR-042').evidence_ceiling, 'formal_legislative_oversight_intervention');
assert.equal(byId.get('M04D-FR-043').disposition, 'bounded_non_link');
assert.equal(byId.get('M04D-FR-044').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.EO14159_to_ImmigrationOS_design, 'supported_for_human_review');
assert.equal(wave.triage_burndown.complete_I4_coercive_ideological_governance, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.case_level_ImmigrationOS_consequence, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.IRS_data_error_to_Palantir_join, 'bounded_non_link');
assert.equal(wave.triage_burndown.system_wide_I4_after_ImmigrationOS, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.policy_alignment_proves_unlawfulness, false);
assert.equal(wave.boundaries.contract_design_proves_actual_consequence, false);
assert.equal(wave.boundaries.congressional_oversight_proves_misuse, false);
assert.equal(wave.boundaries.adjacent_data_error_proves_Palantir_link, false);
assert.equal(wave.boundaries.local_I4_predicates_promote_system_claim, false);

const supported = wave.records.filter((record) => record.disposition === 'supported_for_human_review').length;
const additional = wave.records.filter((record) => record.disposition === 'requires_additional_acquisition').length;
const nonLinks = wave.records.filter((record) => record.disposition === 'bounded_non_link').length;
const retained = wave.records.filter((record) => record.disposition === 'retained_candidate_only').length;
assert.equal(supported, 5);
assert.equal(additional, 2);
assert.equal(nonLinks, 1);
assert.equal(retained, 1);

console.log('m04d-fog-resolution-wave-05.test: ok');
