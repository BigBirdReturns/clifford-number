#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const ledger = read('data/project/m04d-adversarial-triage-ledger.json');
const waves = ledger.source_waves.map((source) => read(source.path));

assert.equal(ledger.schema_version, 'm04d-adversarial-triage-ledger@1');
assert.equal(ledger.ledger_id, 'M04D-ATL-001');
assert.equal(ledger.source_waves.length, 7);
assert.deepEqual(
  ledger.source_waves.map((x) => x.wave_id),
  ['M04D-FR-W01', 'M04D-FR-W02', 'M04D-FR-W03', 'M04D-FR-W04', 'M04D-FR-W05', 'M04D-FR-W06', 'M04D-FR-W07']
);

for (const [index, wave] of waves.entries()) {
  const source = ledger.source_waves[index];
  assert.equal(wave.wave_id, source.wave_id, source.wave_id);
  assert.equal(wave.records.length, source.records, source.wave_id);
  assert.match(source.merge_sha, /^[0-9a-f]{40}$/);
}

const records = waves.flatMap((wave) => wave.records);
assert.equal(records.length, 63);
assert.equal(new Set(records.map((record) => record.record_id)).size, records.length, 'record IDs must be unique');

const byDisposition = Object.fromEntries([
  'supported_for_human_review',
  'requires_additional_acquisition',
  'bounded_non_link',
  'retained_candidate_only',
  'falsified',
  'source_restricted',
  'source_unavailable',
].map((disposition) => [disposition, records.filter((record) => record.disposition === disposition).length]));

assert.deepEqual(byDisposition, ledger.counts.by_disposition);
assert.equal(ledger.counts.records, records.length);
assert.equal(ledger.counts.waves, waves.length);
assert.deepEqual(byDisposition, {
  supported_for_human_review: 42,
  requires_additional_acquisition: 8,
  bounded_non_link: 5,
  retained_candidate_only: 8,
  falsified: 0,
  source_restricted: 0,
  source_unavailable: 0,
});

const idsByDisposition = (disposition) => records
  .filter((record) => record.disposition === disposition)
  .map((record) => record.record_id)
  .sort();

assert.deepEqual(
  [...ledger.open_record_ids.requires_additional_acquisition].sort(),
  idsByDisposition('requires_additional_acquisition')
);
assert.deepEqual(
  [...ledger.open_record_ids.retained_candidate_only].sort(),
  idsByDisposition('retained_candidate_only')
);
assert.deepEqual(
  ledger.terminal_non_links.map((row) => row.record_id).sort(),
  idsByDisposition('bounded_non_link')
);

assert.equal(ledger.program_verdict.post_Cold_War_externalization_and_phase_periodization.disposition, 'supported_for_human_review');
assert.equal(ledger.program_verdict.deliberate_market_shaping.disposition, 'supported_for_human_review');
assert.equal(ledger.program_verdict.institutional_replacement_and_dependency.disposition, 'supported_for_human_review');
assert.equal(ledger.program_verdict.coercive_ideological_governance.disposition, 'requires_additional_acquisition');
assert.equal(ledger.program_verdict.personal_extraction.disposition, 'requires_additional_acquisition');
assert.equal(ledger.program_verdict.system_wide_deliberate_coordinated_capture.disposition, 'retained_candidate_only');
assert.equal(ledger.program_verdict.organism_conclusion.disposition, 'not_eligible_for_promotion');

assert.equal(ledger.phase_adjudication.length, 5);
assert.ok(ledger.phase_adjudication.every((row) => row.disposition === 'supported_for_human_review'));
assert.deepEqual(ledger.intentionality_adjudication.map((row) => row.level_id), [
  'I0-structural-convergence',
  'I1-opportunistic-exploitation',
  'I2-deliberate-market-shaping',
  'I3-institutional-replacement',
  'I4-coercive-ideological-governance',
  'I5-personal-extraction',
]);
assert.deepEqual(ledger.intentionality_adjudication.map((row) => row.disposition), [
  'supported_for_human_review',
  'supported_for_human_review',
  'supported_for_human_review',
  'supported_for_human_review',
  'requires_additional_acquisition',
  'requires_additional_acquisition',
]);

assert.equal(ledger.organism_test_adjudication.length, 8);
assert.equal(new Set(ledger.organism_test_adjudication.map((row) => row.test_id)).size, 8);
assert.deepEqual(ledger.organism_test_adjudication.map((row) => row.test_id), [
  'T1-common-purpose',
  'T2-differentiation',
  'T3-metabolism',
  'T4-coordination',
  'T5-reproduction',
  'T6-feedback',
  'T7-membrane',
  'T8-coercion-extraction',
]);

assert.equal(ledger.next_decisive_frontier.length, 10);
assert.deepEqual(ledger.next_decisive_frontier.map((row) => row.priority), [1,2,3,4,5,6,7,8,9,10]);
assert.equal(new Set(ledger.next_decisive_frontier.map((row) => row.frontier_id)).size, 10);
for (const row of ledger.next_decisive_frontier) {
  assert.ok(row.question);
  assert.ok(row.required_objects.length);
  assert.ok(row.terminal_condition);
}

assert.equal(ledger.boundaries.promotes_to, 'candidate_only');
assert.equal(ledger.boundaries.graph_effect, 'none');
assert.equal(ledger.boundaries.conclusion_generated, false);
assert.equal(ledger.boundaries.estate_completion_claimed, false);
assert.equal(ledger.boundaries.local_support_promotes_system_claim, false);
assert.equal(ledger.boundaries.aggregate_count_proves_evidence, false);
assert.equal(ledger.boundaries.temporal_sequence_proves_causation, false);
assert.equal(ledger.boundaries.bounded_integration_proves_common_governance, false);
assert.equal(ledger.boundaries.military_effect_proves_civilian_coercion, false);
assert.equal(ledger.boundaries.government_revenue_proves_extraction, false);
assert.equal(ledger.boundaries.non_link_may_be_ignored, false);
assert.equal(ledger.boundaries.unresolved_means_false, false);

console.log('m04d-adversarial-triage-ledger.test: ok');
