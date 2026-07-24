#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-03.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W03');
assert.deepEqual(wave.parent_waves, ['M04D-FR-W01', 'M04D-FR-W02']);
assert.equal(wave.records.length, 8);
assert.equal(new Set(wave.records.map((x) => x.record_id)).size, 8);

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
assert.equal(byId.get('M04D-FR-018').evidence_ceiling, 'public_demand_to_company_revenue');
assert.equal(byId.get('M04D-FR-019').evidence_ceiling, 'corporate_residual_control');
assert.equal(byId.get('M04D-FR-020').evidence_ceiling, 'mixed_data_and_platform_rights');
assert.equal(byId.get('M04D-FR-021').evidence_ceiling, 'formal_counterpower_rights');
assert.equal(byId.get('M04D-FR-022').disposition, 'supported_for_human_review');
assert.equal(byId.get('M04D-FR-023').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-024').disposition, 'bounded_non_link');
assert.equal(byId.get('M04D-FR-025').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.partial_T3_resource_metabolism, 'supported_for_human_review');
assert.equal(wave.triage_burndown.I5_personal_extraction, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.core_corporate_architecture_hidden, 'bounded_non_link');
assert.equal(wave.triage_burndown.system_wide_coordinated_capture_after_H6, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.government_revenue_proves_extraction, false);
assert.equal(wave.boundaries.founder_control_proves_self_dealing, false);
assert.equal(wave.boundaries.formal_counterpower_proves_effective_exit, false);
assert.equal(wave.boundaries.partial_resource_cycle_promotes_network_claim, false);

const regulatory = wave.records.flatMap((record) => record.sources).filter((source) => source.source_type === 'official_regulatory_filing');
assert.ok(regulatory.length >= 5);
assert.ok(regulatory.every((source) => source.url.startsWith('https://www.sec.gov/Archives/edgar/data/1321655/')));

console.log('m04d-fog-resolution-wave-03.test: ok');
