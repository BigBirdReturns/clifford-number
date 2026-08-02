import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  EXPECTED_ELIGIBILITY_OUTREACH_METRICS,
  derivePreferenceEligibilityOutreachFlags,
  validatePreferenceEligibilityOutreachAssuranceFixture,
  validatePreferenceEligibilityOutreachAssuranceBuild
} from '../tools/lib/preference-eligibility-outreach-assurance.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const dir = mkdtempSync(join(tmpdir(), 'eligibility-outreach-'));
const jsonPath = join(dir, 'build.json');
const markdownPath = join(dir, 'build.md');
const run = spawnSync(process.execPath, ['tools/compile-preference-eligibility-outreach-assurance.mjs','data/research/preference-custody/eligibility-outreach-assurance.fixture.json',jsonPath,markdownPath], { encoding:'utf8' });
assert.equal(run.status, 0, run.stderr || run.stdout);
const fixture = JSON.parse(readFileSync('data/research/preference-custody/eligibility-outreach-assurance.fixture.json','utf8'));
const compiled = JSON.parse(readFileSync(jsonPath,'utf8'));
const markdown = readFileSync(markdownPath,'utf8');
assert.deepEqual(validatePreferenceEligibilityOutreachAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceEligibilityOutreachAssuranceBuild(compiled), []);
assert.deepEqual(compiled.metrics, EXPECTED_ELIGIBILITY_OUTREACH_METRICS);
assert.equal(compiled.worlds.length, 8);
assert.equal(new Set(compiled.worlds.map(world => world.public_status_signature)).size, 1);
assert.equal(new Set(compiled.worlds.map(world => world.governance_signature)).size, 8);
for (const world of compiled.worlds) {
  assert.deepEqual(derivePreferenceEligibilityOutreachFlags(world), world.flags);
  assert.equal(world.custody_chain.length, 10);
  let previous = null;
  const seen = new Set();
  for (const event of world.custody_chain) {
    assert.equal(event.previous_event_sha256, previous);
    for (const sourceId of event.source_event_ids) assert.ok(seen.has(sourceId));
    const unsigned = { ...event }; delete unsigned.event_sha256;
    assert.equal(event.event_sha256, sha256(unsigned));
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  assert.equal(previous, world.custody_chain_head_sha256);
}
assert.match(markdown, /PC-33/);
assert.match(markdown, /total_unsupported_eligibility_outreach_decisions: 700/);
assert.match(markdown, /total_omitted_source_population_unit_count: 40/);
assert.doesNotMatch(markdown, /named service failed|actual discrimination|publicly authorized/i);

const fixtureMutations = [
  c=>{c.schema_version='wrong';},
  c=>{c.fixture_id='wrong';},
  c=>{c.issue=830;},
  c=>{c.graph_effect='asserted';},
  c=>{c.counts_toward_thesis_evidence=true;},
  c=>{c.baseline.declared_eligible_units=99;},
  c=>{c.required_refusal_rules.pop();},
  c=>{c.expected_classification.real_world_effect_claimed=true;},
  c=>{c.worlds.pop();},
  c=>{c.worlds[0].expected_flags.complete_eligibility_outreach_assurance=false;},
  c=>{c.worlds[1].overrides.source_population.omitted_source_population_count=39;},
  c=>{c.worlds[2].overrides.source_population.false_exclusion_count=31;},
  c=>{c.worlds[3].overrides.awareness.unaware_count=39;},
  c=>{c.worlds[4].overrides.invitation_delivery.contact_failed_count=39;},
  c=>{c.worlds[5].overrides.reachability.unreachable_count=39;},
  c=>{c.worlds[6].overrides.usability_assistance.assistance_unavailable_count=29;},
  c=>{c.worlds[7].overrides.lineage.stale_eligibility_outreach_decision_count=101;},
  c=>{c.world_defaults.source_population.source_frame_complete='yes';},
  c=>{c.prohibited_inferences=[];},
  c=>{c.interpretation_contract.copy_ready_caveat='';}
];
for (const [index, mutate] of fixtureMutations.entries()) {
  const candidate = structuredClone(fixture);
  mutate(candidate);
  assert.ok(validatePreferenceEligibilityOutreachAssuranceFixture(candidate).length > 0, `fixture mutation ${index + 1}`);
}

const buildMutations = [
  c=>{c.schema_version='wrong';},
  c=>{c.fixture_id='wrong';},
  c=>{c.issue=830;},
  c=>{c.graph_effect='asserted';},
  c=>{c.counts_toward_thesis_evidence=true;},
  c=>{c.conclusion_generated=true;},
  c=>{c.preference_change_present=true;},
  c=>{c.metrics.world_count=7;},
  c=>{c.metrics.total_false_exclusion_count=29;},
  c=>{c.classification.binding_public_authority_supported=true;},
  c=>{c.worlds.pop();},
  c=>{c.worlds[0].flags.complete_eligibility_outreach_assurance=false;},
  c=>{c.worlds[1].source_population.omitted_source_population_count=39;},
  c=>{c.worlds[2].source_population.false_exclusion_count=29;},
  c=>{c.worlds[3].public_status_signature='0'.repeat(64);},
  c=>{c.worlds[4].governance_signature='bad';},
  c=>{c.worlds[5].governance.binding_public_authority=true;},
  c=>{c.worlds[6].custody_chain[2].payload={};},
  c=>{c.worlds[7].custody_chain_head_sha256='0'.repeat(64);},
  c=>{c.interpretation_contract.copy_ready_caveat='';}
];
for (const [index, mutate] of buildMutations.entries()) {
  const candidate = structuredClone(compiled);
  mutate(candidate);
  assert.ok(validatePreferenceEligibilityOutreachAssuranceBuild(candidate).length > 0, `build mutation ${index + 1}`);
}
console.log(`Preference eligibility-outreach assurance tests: PASS (${fixtureMutations.length + buildMutations.length} adversarial mutations)`);
