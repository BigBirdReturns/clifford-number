#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wave = JSON.parse(fs.readFileSync('data/intake/m04d-fog-resolution-wave-06.json', 'utf8'));

assert.equal(wave.schema_version, 'm04d-fog-resolution-wave@1');
assert.equal(wave.wave_id, 'M04D-FR-W06');
assert.deepEqual(wave.parent_waves, ['M04D-FR-W01', 'M04D-FR-W02', 'M04D-FR-W03', 'M04D-FR-W04', 'M04D-FR-W05']);
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
assert.equal(byId.get('M04D-FR-045').evidence_ceiling, 'filer_reported_counterterror_product_origin');
assert.equal(byId.get('M04D-FR-046').evidence_ceiling, 'Army_public_platform_lineage');
assert.equal(byId.get('M04D-FR-047').evidence_ceiling, 'Army_identity_method_transfer');
assert.equal(byId.get('M04D-FR-048').evidence_ceiling, 'actor_specific_Army_platform_expansion');
assert.equal(byId.get('M04D-FR-049').evidence_ceiling, 'functional_lineage_exact_transfer_unresolved');
assert.equal(byId.get('M04D-FR-050').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-051').disposition, 'requires_additional_acquisition');
assert.equal(byId.get('M04D-FR-052').disposition, 'bounded_non_link');
assert.equal(byId.get('M04D-FR-053').disposition, 'retained_candidate_only');

assert.equal(wave.triage_burndown.Army_DCGS_wartime_to_servicewide_lineage, 'supported_for_human_review');
assert.equal(wave.triage_burndown.Army_biometric_identity_method_transfer, 'supported_for_human_review');
assert.equal(wave.triage_burndown.exact_Gotham_to_TITAN_NGC2_transfer, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.counterterror_to_ICE_transfer, 'requires_additional_acquisition');
assert.equal(wave.triage_burndown.sole_private_origin_of_architecture, 'bounded_non_link');
assert.equal(wave.triage_burndown.system_wide_counterterror_origin_capture, 'retained_candidate_only');

assert.equal(wave.boundaries.promotes_to, 'candidate_only');
assert.equal(wave.boundaries.graph_effect, 'none');
assert.equal(wave.boundaries.conclusion_generated, false);
assert.equal(wave.boundaries.estate_completion_claimed, false);
assert.equal(wave.boundaries.filer_reported_history_is_independent_operational_proof, false);
assert.equal(wave.boundaries.functional_similarity_proves_transfer, false);
assert.equal(wave.boundaries.company_sequence_proves_causation, false);
assert.equal(wave.boundaries.brand_continuity_proves_code_or_data_continuity, false);

const supported = wave.records.filter((record) => record.disposition === 'supported_for_human_review').length;
const additional = wave.records.filter((record) => record.disposition === 'requires_additional_acquisition').length;
const nonLinks = wave.records.filter((record) => record.disposition === 'bounded_non_link').length;
const retained = wave.records.filter((record) => record.disposition === 'retained_candidate_only').length;
assert.equal(supported, 5);
assert.equal(additional, 2);
assert.equal(nonLinks, 1);
assert.equal(retained, 1);

console.log('m04d-fog-resolution-wave-06.test: ok');
