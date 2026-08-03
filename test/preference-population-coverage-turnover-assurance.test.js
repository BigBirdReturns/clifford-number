import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  compilePreferencePopulationCoverageTurnoverAssuranceFixture,
  EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS,
  validatePreferencePopulationCoverageTurnoverAssuranceBuild,
  validatePreferencePopulationCoverageTurnoverAssuranceFixture,
} from '../tools/lib/preference-population-coverage-turnover-assurance.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/population-coverage-turnover-assurance.fixture.json', 'utf8'));
assert.deepEqual(validatePreferencePopulationCoverageTurnoverAssuranceFixture(fixture), []);
const compiled = compilePreferencePopulationCoverageTurnoverAssuranceFixture(fixture);
assert.deepEqual(validatePreferencePopulationCoverageTurnoverAssuranceBuild(compiled), []);
assert.deepEqual(compiled.metrics, EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.governance_signature)).size, 8);
assert.equal(compiled.worlds.filter(world => world.flags.complete_population_coverage_assurance).length, 1);
assert.equal(compiled.classification.real_world_effect_claimed, false);
assert.equal(compiled.graph_effect, 'none');

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
for (const world of compiled.worlds) {
  let previous = null;
  const seen = new Set();
  for (const event of world.custody_chain) {
    assert.equal(event.previous_event_sha256, previous);
    for (const id of event.source_event_ids) assert.ok(seen.has(id));
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    assert.equal(event.event_sha256, sha256(unsigned));
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  assert.equal(previous, world.custody_chain_head_sha256);
}

const fixtureMutations = [
  candidate => { candidate.schema_version = 'wrong'; },
  candidate => { candidate.fixture_id = 'wrong'; },
  candidate => { candidate.issue = 1; },
  candidate => { candidate.parent_program_issue = 1; },
  candidate => { candidate.status = 'real'; },
  candidate => { candidate.graph_effect = 'asserted'; },
  candidate => { candidate.counts_toward_thesis_evidence = true; },
  candidate => { candidate.baseline.declared_population_units = 99; },
  candidate => { candidate.required_refusal_rules.pop(); },
  candidate => { candidate.expected_classification.real_world_effect_claimed = true; },
  candidate => { candidate.expected_classification.complete_population_coverage_assurance_supported_in_at_least_one_world = false; },
  candidate => { candidate.prohibited_inferences = []; },
  candidate => { candidate.interpretation_contract.copy_ready_caveat = ''; },
  candidate => { candidate.worlds.pop(); },
  candidate => { candidate.worlds[0].world_id = 'wrong'; },
  candidate => { candidate.worlds[1].overrides.frame_coverage.omitted_population_unit_count = -1; },
  candidate => { candidate.worlds[2].expected_flags.missingness_failure_present = false; },
  candidate => { candidate.worlds[3].overrides.boundary_coverage.boundary_truncated_unit_count = '40'; },
  candidate => { candidate.worlds[4].mechanism = ''; },
  candidate => { candidate.world_defaults.public_claim.published_missingness_rate = 0.1; },
];
for (const [index, mutate] of fixtureMutations.entries()) {
  const candidate = structuredClone(fixture);
  mutate(candidate);
  assert.ok(validatePreferencePopulationCoverageTurnoverAssuranceFixture(candidate).length > 0, `fixture mutation ${index + 1}`);
}

const buildMutations = [
  candidate => { candidate.schema_version = 'wrong'; },
  candidate => { candidate.fixture_id = 'wrong'; },
  candidate => { candidate.issue = 1; },
  candidate => { candidate.parent_program_issue = 1; },
  candidate => { candidate.graph_effect = 'asserted'; },
  candidate => { candidate.counts_toward_thesis_evidence = true; },
  candidate => { candidate.conclusion_generated = true; },
  candidate => { candidate.preference_change_present = true; },
  candidate => { candidate.worlds.pop(); },
  candidate => { candidate.worlds[0].public_claim.published_missingness_rate = 0.1; },
  candidate => { candidate.worlds[1].flags.hard_to_enumerate_omission_present = false; },
  candidate => { candidate.worlds[2].governance_signature = '0'.repeat(64); },
  candidate => { candidate.worlds[3].custody_chain[2].payload = {}; },
  candidate => { candidate.worlds[4].custody_chain_head_sha256 = '0'.repeat(64); },
  candidate => { candidate.metrics.total_nonresponse_unit_count = 39; },
  candidate => { candidate.metrics.distinct_population_coverage_governance_signatures = 7; },
  candidate => { candidate.classification.binding_public_authority_supported = true; },
  candidate => { candidate.refusal_rules.pop(); },
  candidate => { candidate.interpretation_contract.copy_ready_caveat = ''; },
  candidate => { candidate.classification.complete_population_coverage_assurance_supported_in_at_least_one_world = false; },
];
for (const [index, mutate] of buildMutations.entries()) {
  const candidate = structuredClone(compiled);
  mutate(candidate);
  assert.ok(validatePreferencePopulationCoverageTurnoverAssuranceBuild(candidate).length > 0, `build mutation ${index + 1}`);
}

console.log(`Preference population-coverage turnover assurance tests: PASS (${fixtureMutations.length + buildMutations.length} adversarial mutations)`);
