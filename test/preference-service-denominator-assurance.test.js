import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  EXPECTED_SERVICE_DENOMINATOR_METRICS,
  FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS,
  compilePreferenceServiceDenominatorAssuranceFixture,
  renderPreferenceServiceDenominatorAssuranceMarkdown,
  validatePreferenceServiceDenominatorAssuranceBuild,
  validatePreferenceServiceDenominatorAssuranceFixture
} from '../tools/lib/preference-service-denominator-assurance.mjs';

const fixturePath = 'data/research/preference-custody/service-denominator-assurance.fixture.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

assert.deepEqual(validatePreferenceServiceDenominatorAssuranceFixture(fixture), []);
const compiled = compilePreferenceServiceDenominatorAssuranceFixture(fixture);
assert.deepEqual(validatePreferenceServiceDenominatorAssuranceBuild(compiled), []);
assert.deepEqual(compiled.metrics, EXPECTED_SERVICE_DENOMINATOR_METRICS);
assert.equal(compiled.worlds.length, 8);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.governance_signature)).size, 8);
assert.equal(compiled.classification.complete_service_denominator_assurance_supported_in_at_least_one_world, true);
for (const key of FALSE_SERVICE_DENOMINATOR_CLASSIFICATIONS) assert.equal(compiled.classification[key], false, key);

for (const world of compiled.worlds) {
  assert.equal(world.public_claim.public_service_status, 'service_denominator_verified');
  assert.equal(world.public_claim.published_completion_rate, 1);
  assert.equal(world.public_claim.published_queue_count, 0);
  assert.equal(world.public_claim.published_rationing_count, 0);
  assert.equal(world.public_claim.published_denial_rate, 0);
  assert.equal(world.public_claim.published_unserved_count, 0);
  assert.equal(world.governance.binding_public_authority, false);
  assert.equal(world.public_status_signature, sha256(world.public_claim));
  assert.match(world.governance_signature, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.length, 10);
  let previous = null;
  const seen = new Set();
  for (const event of world.custody_chain) {
    assert.equal(event.previous_event_sha256, previous);
    for (const sourceId of event.source_event_ids) assert.ok(seen.has(sourceId), sourceId);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    assert.equal(event.event_sha256, sha256(unsigned));
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  assert.equal(previous, world.custody_chain_head_sha256);
}

const positive = compiled.worlds.find(world => world.flags.complete_service_denominator_assurance);
assert.ok(positive);
for (const key of [
  'eligible_population_complete','request_attempt_complete','queue_wait_complete',
  'rationing_priority_complete','denial_disposition_complete','unserved_population_complete',
  'completion_reconciliation_complete','current_service_denominator_lineage_complete',
  'monitoring_correction_complete'
]) assert.equal(positive.flags[key], true, key);

const failureWorlds = new Map([
  ['operationally-eligible-population-omitted-before-intake','eligible_population_undercoverage_present'],
  ['request-and-attempt-loss-through-channel-intake-identity-duplicate-and-logging-failure','request_attempt_capture_failure_present'],
  ['queue-snapshot-reset-abandonment-and-wait-censoring','queue_wait_censoring_present'],
  ['rationing-priority-overrides-and-displacement-omitted','rationing_priority_opacity_present'],
  ['true-denials-relabeled-as-referral-deferral-ineligibility-no-response-withdrawal-or-pending','denial_reclassification_present'],
  ['completion-records-contain-partials-duplicates-rework-recurrence-and-survivor-selection','completion_reconciliation_failure_present'],
  ['historical-denominator-assurance-inherited-after-eligibility-intake-queue-rationing-denial-service-workflow-population-and-policy-succession','stale_service_denominator_lineage_present']
]);
for (const [worldId, flag] of failureWorlds) {
  const world = compiled.worlds.find(candidate => candidate.world_id === worldId);
  assert.ok(world, worldId);
  assert.equal(world.flags.complete_service_denominator_assurance, false);
  assert.equal(world.flags[flag], true);
  assert.equal(world.governance.unsupported_service_denominator_decision_count, 100);
}

assert.equal(compiled.metrics.total_omitted_eligible_unit_count, 40);
assert.equal(compiled.metrics.total_unserved_no_attempt_count, 40);
assert.equal(compiled.metrics.total_lost_request_count, 30);
assert.equal(compiled.metrics.total_lost_attempt_count, 30);
assert.equal(compiled.metrics.total_queued_unit_count, 40);
assert.equal(compiled.metrics.total_queue_abandoned_unit_count, 20);
assert.equal(compiled.metrics.total_censored_wait_unit_count, 40);
assert.equal(compiled.metrics.total_rationed_unit_count, 30);
assert.equal(compiled.metrics.total_priority_overridden_unit_count, 20);
assert.equal(compiled.metrics.total_true_denied_unit_count, 30);
assert.equal(compiled.metrics.total_relabeled_denial_count, 30);
assert.equal(compiled.metrics.total_partial_completion_count, 40);
assert.equal(compiled.metrics.total_duplicate_completion_count, 20);
assert.equal(compiled.metrics.total_rework_record_count, 20);
assert.equal(compiled.metrics.total_recurrent_service_record_count, 30);
assert.equal(compiled.metrics.total_stale_denominator_decision_count, 100);
assert.equal(compiled.metrics.total_unsupported_service_denominator_decisions, 700);

const markdown = renderPreferenceServiceDenominatorAssuranceMarkdown(compiled);
assert.match(markdown, /Preference Custody PC-31/);
assert.match(markdown, /service_denominator_verified/);
assert.match(markdown, /total_unsupported_service_denominator_decisions: 700/);
assert.doesNotMatch(markdown, /named provider failed|actual discrimination|publicly authorized/i);

const fixtureMutations = [
  c => { c.schema_version = 'wrong'; },
  c => { c.fixture_id = 'wrong'; },
  c => { c.issue = 814; },
  c => { c.parent_program_issue = 593; },
  c => { c.graph_effect = 'asserted'; },
  c => { c.counts_toward_thesis_evidence = true; },
  c => { c.baseline.public_service_status = 'verified'; },
  c => { c.baseline.published_completion_rate = 0.99; },
  c => { c.required_refusal_rules.pop(); },
  c => { c.prohibited_inferences = []; },
  c => { c.interpretation_contract.copy_ready_caveat = ''; },
  c => { c.worlds.pop(); },
  c => { c.worlds[1].world_id = c.worlds[0].world_id; },
  c => { c.world_defaults.public_claim.published_queue_count = 1; },
  c => { c.world_defaults.eligibility.operational_eligible_count = 101; },
  c => { c.world_defaults.request_attempt.recorded_request_count = 99; },
  c => { c.world_defaults.queue.published_queue_count = 1; },
  c => { c.world_defaults.rationing.published_rationing_count = 1; },
  c => { c.world_defaults.denial.published_denied_count = 1; },
  c => { c.world_defaults.completion.published_completion_count = 99; },
  c => { c.world_defaults.lineage.current_service_denominator_lineage = 'yes'; },
  c => { c.world_defaults.governance.binding_public_authority = true; },
  c => { delete c.worlds[0].expected_flags.queue_wait_complete; },
  c => { c.expected_classification.real_world_effect_claimed = true; }
];
for (const [index, mutate] of fixtureMutations.entries()) {
  const candidate = structuredClone(fixture);
  mutate(candidate);
  assert.ok(validatePreferenceServiceDenominatorAssuranceFixture(candidate).length > 0, `fixture mutation ${index + 1}`);
}

const buildMutations = [
  c => { c.schema_version = 'wrong'; },
  c => { c.issue = 814; },
  c => { c.metrics.total_queued_unit_count = 39; },
  c => { c.classification.binding_public_authority_supported = true; },
  c => { c.worlds[0].public_claim.published_queue_count = 1; },
  c => { c.worlds[0].public_status_signature = '0'.repeat(64); },
  c => { c.worlds[0].custody_chain[4].payload.rationed_count = 1; },
  c => { c.worlds[0].custody_chain_head_sha256 = '0'.repeat(64); },
  c => { c.worlds.pop(); },
  c => { c.interpretation_contract.copy_ready_caveat = ''; }
];
for (const [index, mutate] of buildMutations.entries()) {
  const candidate = structuredClone(compiled);
  mutate(candidate);
  assert.ok(validatePreferenceServiceDenominatorAssuranceBuild(candidate).length > 0, `build mutation ${index + 1}`);
}

console.log(`Preference service-denominator assurance tests: PASS (${fixtureMutations.length + buildMutations.length} adversarial mutations)`);
