import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { compilePreferenceHardToEnumerateMissingnessAssuranceFixture, EXPECTED_HARD_TO_ENUMERATE_MISSINGNESS_METRICS, validatePreferenceHardToEnumerateMissingnessAssuranceBuild, validatePreferenceHardToEnumerateMissingnessAssuranceFixture } from '../tools/lib/preference-hard-to-enumerate-missingness-assurance.mjs';
const fixture = JSON.parse(readFileSync('data/research/preference-custody/hard-to-enumerate-missingness-assurance.fixture.json','utf8'));
assert.deepEqual(validatePreferenceHardToEnumerateMissingnessAssuranceFixture(fixture),[]);
const compiled=compilePreferenceHardToEnumerateMissingnessAssuranceFixture(fixture);
assert.deepEqual(validatePreferenceHardToEnumerateMissingnessAssuranceBuild(compiled),[]);
assert.deepEqual(compiled.metrics,EXPECTED_HARD_TO_ENUMERATE_MISSINGNESS_METRICS);
assert.equal(new Set(compiled.worlds.map(world=>world.public_status_signature)).size,1);
assert.equal(new Set(compiled.worlds.map(world=>world.governance_signature)).size,8);
assert.equal(compiled.worlds.filter(world=>world.flags.complete_hard_to_enumerate_missingness_assurance).length,1);
assert.equal(compiled.classification.real_world_effect_claimed,false); assert.equal(compiled.graph_effect,'none');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const sha256=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
for (const world of compiled.worlds) { let previous=null; const seen=new Set(); for (const event of world.custody_chain) { assert.equal(event.previous_event_sha256,previous); for (const id of event.source_event_ids) assert.ok(seen.has(id)); const unsigned={...event}; delete unsigned.event_sha256; assert.equal(event.event_sha256,sha256(unsigned)); seen.add(event.event_id); previous=event.event_sha256; } assert.equal(previous,world.custody_chain_head_sha256); }
const fixtureMutations=[
 c=>{c.schema_version='wrong';},c=>{c.fixture_id='wrong';},c=>{c.issue=1;},c=>{c.parent_program_issue=1;},c=>{c.status='real';},c=>{c.graph_effect='asserted';},c=>{c.counts_toward_thesis_evidence=true;},c=>{c.baseline.declared_population_units=99;},c=>{c.required_refusal_rules.pop();},c=>{c.expected_classification.real_world_effect_claimed=true;},c=>{c.expected_classification.complete_hard_to_enumerate_missingness_assurance_supported_in_at_least_one_world=false;},c=>{c.prohibited_inferences=[];},c=>{c.interpretation_contract.copy_ready_caveat='';},c=>{c.worlds.pop();},c=>{c.worlds[0].world_id='wrong';},c=>{c.worlds[1].overrides.subgroup_coverage.hard_to_enumerate_omitted_count=-1;},c=>{c.worlds[2].expected_flags.nonresponse_mechanism_failure_present=false;},c=>{c.worlds[3].overrides.source_missingness.unknown_missingness_unit_count='40';},c=>{c.worlds[4].mechanism='';},c=>{c.world_defaults.public_claim.published_nonresponse_rate=.1;}
];
for (const [index,mutate] of fixtureMutations.entries()) { const candidate=structuredClone(fixture); mutate(candidate); assert.ok(validatePreferenceHardToEnumerateMissingnessAssuranceFixture(candidate).length>0,`fixture mutation ${index+1}`); }
const buildMutations=[
 c=>{c.schema_version='wrong';},c=>{c.fixture_id='wrong';},c=>{c.issue=1;},c=>{c.parent_program_issue=1;},c=>{c.graph_effect='asserted';},c=>{c.counts_toward_thesis_evidence=true;},c=>{c.conclusion_generated=true;},c=>{c.preference_change_present=true;},c=>{c.worlds.pop();},c=>{c.worlds[0].public_claim.published_nonresponse_rate=.1;},c=>{c.worlds[1].flags.subgroup_omission_present=false;},c=>{c.worlds[2].governance_signature='0'.repeat(64);},c=>{c.worlds[3].custody_chain[2].payload={};},c=>{c.worlds[4].custody_chain_head_sha256='0'.repeat(64);},c=>{c.metrics.total_nonresponse_unit_count=39;},c=>{c.metrics.distinct_hard_to_enumerate_missingness_governance_signatures=7;},c=>{c.classification.binding_public_authority_supported=true;},c=>{c.refusal_rules.pop();},c=>{c.interpretation_contract.copy_ready_caveat='';},c=>{c.classification.complete_hard_to_enumerate_missingness_assurance_supported_in_at_least_one_world=false;}
];
for (const [index,mutate] of buildMutations.entries()) { const candidate=structuredClone(compiled); mutate(candidate); assert.ok(validatePreferenceHardToEnumerateMissingnessAssuranceBuild(candidate).length>0,`build mutation ${index+1}`); }
console.log(`Preference hard-to-enumerate missingness assurance tests: PASS (${fixtureMutations.length+buildMutations.length} adversarial mutations)`);
