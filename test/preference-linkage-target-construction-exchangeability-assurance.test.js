import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceLinkageTargetConstructionExchangeabilityFixture,
  renderPreferenceLinkageTargetConstructionExchangeabilityMarkdown,
  validatePreferenceLinkageTargetConstructionExchangeabilityFixture,
  validatePreferenceLinkageTargetConstructionExchangeabilityBuild
} from '../tools/lib/preference-linkage-target-construction-exchangeability-assurance.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/linkage-target-construction-exchangeability-assurance.fixture.json','utf8'));
const clone = value => structuredClone(value);
const compiled = compilePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture);
assert.deepEqual(validatePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageTargetConstructionExchangeabilityBuild(compiled, fixture), []);
assert.deepEqual(compilePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture), compiled);
assert.equal(renderPreferenceLinkageTargetConstructionExchangeabilityMarkdown(compiled), renderPreferenceLinkageTargetConstructionExchangeabilityMarkdown(compiled));

const fixtureMutations=[];
const add=(name,fn,expected)=>fixtureMutations.push([name,fn,expected]);
add('schema',x=>x.schema_version='bad'); add('fixture id',x=>x.fixture_id='bad'); add('issue',x=>x.issue=999); add('parent issue',x=>x.parent_program_issue=1); add('captured-at object',x=>x.captured_at={real_world_identity:'Named Person is definitively linked',binding_public_authority:true,coverage_claim:'95% in production'},'fixture captured_at must be an exact ISO date'); add('captured-at invalid date',x=>x.captured_at='2026-02-30','fixture captured_at must be an exact ISO date'); add('status',x=>x.status='real'); add('graph',x=>x.graph_effect='edge'); add('thesis',x=>x.counts_toward_thesis_evidence=true); add('world removed',x=>x.worlds.pop());
for(const key of Object.keys(fixture.baseline)) add(`baseline ${key}`,x=>{x.baseline[key]=typeof x.baseline[key]==='number'?x.baseline[key]+1:'bad';});
add('refusal removed',x=>x.required_refusal_rules.pop()); add('refusal duplicated',x=>x.required_refusal_rules.push(x.required_refusal_rules[0])); add('refusal changed',x=>x.required_refusal_rules[0]='bad');
add('false classification true',x=>x.expected_classification.public_target_badges_identify_defined_event=true); add('complete classification false',x=>x.expected_classification.complete_linkage_interval_target_method_exchangeability_assurance_supported_in_at_least_one_world=false); add('classification removed',x=>delete x.expected_classification.graph_effect_present);
add('duplicate world id',x=>x.worlds[1].world_id=x.worlds[0].world_id); add('world order',x=>x.worlds.reverse()); add('empty description',x=>x.worlds[0].description='');
for(let i=0;i<8;i++) add(`mechanism ${i}`,x=>x.worlds[i].expected_mechanism='bad');
for(let i=0;i<8;i++) add(`expected flag ${i}`,x=>x.worlds[i].expected_flags.complete_linkage_interval_target_method_exchangeability_assurance=!x.worlds[i].expected_flags.complete_linkage_interval_target_method_exchangeability_assurance);
const countPaths=[['target_event','undefined_event_pairs'],['estimand_scope','estimand_mismatched_pairs'],['method_identity','unidentified_method_pairs'],['data_partition','construction_validation_overlap_pairs'],['data_partition','split_leaked_pairs'],['exchangeability_deployment','exchangeability_violated_pairs'],['exchangeability_deployment','deployment_shifted_pairs'],['governance','stale_target_method_decisions']];
for(let i=0;i<8;i++){const [section,key]=countPaths[i]; add(`negative count ${i}`,x=>x.worlds[i][section][key]=-1);}
const booleanPaths=[['target_event','event_defined'],['target_event','state_space_defined'],['estimand_scope','estimand_defined'],['method_identity','method_family_identified'],['data_partition','training_tuning_separate'],['data_partition','group_split_leakage_free'],['exchangeability_deployment','assumptions_stated'],['governance','current_lineage']];
for(let i=0;i<8;i++){const [section,key]=booleanPaths[i]; add(`boolean mismatch ${i}`,x=>x.worlds[0][section][key]=!x.worlds[0][section][key]);}
add('interpretation what this is',x=>x.interpretation_contract.what_this_is='A real identity and interval finding.','fixture interpretation contract mismatch');
add('interpretation what this is not',x=>x.interpretation_contract.what_this_is_not='No limitations apply.','fixture interpretation contract mismatch');
add('interpretation copy-ready caveat',x=>x.interpretation_contract.copy_ready_caveat='Binding authority and real-world coverage are established.','fixture interpretation contract mismatch');
add('unrecognized world field',x=>x.worlds[0].causal_finding=true,'world complete_target_method_exchangeability_assurance key ledger mismatch');
add('unrecognized nested world field',x=>x.worlds[0].target_event.controller='external','world complete_target_method_exchangeability_assurance target_event key ledger mismatch');
add('aggregate-preserving undefined burden redistribution',x=>{x.worlds[0].target_event.undefined_event_pairs=100;x.worlds[1].target_event.undefined_event_pairs=0;},'world complete_target_method_exchangeability_assurance burden-state mismatch');
add('aggregate-preserving unsupported burden redistribution',x=>{x.worlds[0].governance.unsupported_interval_decisions=100;x.worlds[1].governance.unsupported_interval_decisions=0;},'world complete_target_method_exchangeability_assurance burden-state mismatch');
add('claim-bearing world description',x=>x.worlds[1].description='Named Person has a confirmed real-world identity and verified 95% coverage.','world undefined_or_mismatched_predicted_event snapshot mismatch');
add('partial noncomplete world state',x=>x.worlds[1].target_event.event_defined=true,'world undefined_or_mismatched_predicted_event snapshot mismatch');
assert.equal(fixtureMutations.length,73);
for(const [name,mutate,expected] of fixtureMutations){
  const candidate=clone(fixture);
  mutate(candidate);
  const errors=validatePreferenceLinkageTargetConstructionExchangeabilityFixture(candidate);
  assert.ok(errors.length>0,`fixture mutation escaped: ${name}`);
  if(expected) assert.ok(errors.some(error=>error.includes(expected)),`fixture mutation missed expected guard (${name}): ${errors.join('; ')}`);
}

const buildMutations=[];
const addBuild=(name,fn,expected)=>buildMutations.push([name,fn,expected]);
addBuild('schema',x=>x.schema_version='bad'); addBuild('fixture id',x=>x.fixture_id='bad'); addBuild('captured-at object',x=>x.captured_at={real_world_identity:'Named Person is definitively linked',binding_public_authority:true,coverage_claim:'95% in production'},'compiled PC-46 captured_at must be an exact ISO date'); addBuild('captured-at invalid date',x=>x.captured_at='2026-02-30','compiled PC-46 captured_at must be an exact ISO date'); addBuild('status',x=>x.status='bad'); addBuild('graph',x=>x.graph_effect='edge'); addBuild('thesis',x=>x.counts_toward_thesis_evidence=true); addBuild('conclusion',x=>x.conclusion_generated=true); addBuild('source hash',x=>x.source_fixture_sha256='0'.repeat(64)); addBuild('rule drop',x=>x.required_refusal_rules.pop()); addBuild('world drop',x=>x.worlds.pop()); addBuild('public surface',x=>x.worlds[0].public_surface.approved_use='bad'); addBuild('public signature',x=>x.worlds[0].public_signature_sha256='0'.repeat(64)); addBuild('governance signature',x=>x.worlds[0].target_method_governance_signature_sha256='0'.repeat(64)); addBuild('mechanism',x=>x.worlds[0].expected_mechanism='bad'); addBuild('observed flag',x=>x.worlds[0].observed_flags.complete_target_event_assurance=false); addBuild('metric',x=>x.metrics.undefined_event_pairs+=1); addBuild('classification',x=>x.classification.public_target_badges_identify_defined_event=true); addBuild('chain hash',x=>x.custody_chain[1].event_sha256='0'.repeat(64)); addBuild('authority',x=>x.worlds[0].governance.binding_public_authority=true);
addBuild('interpretation contract',x=>x.interpretation_contract.what_this_is='A real identity and interval finding.','compiled PC-46 interpretation contract mismatch');
addBuild('unrecognized compiled root field',x=>x.controller='external','compiled PC-46 key ledger mismatch');
addBuild('unrecognized compiled world field',x=>x.worlds[0].causal_finding=true,'compiled PC-46 world complete_target_method_exchangeability_assurance key ledger mismatch');
addBuild('unrecognized compiled nested world field',x=>x.worlds[0].target_event.controller='external','compiled PC-46 world complete_target_method_exchangeability_assurance target_event key ledger mismatch');
addBuild('aggregate-preserving compiled burden redistribution',x=>{x.worlds[0].target_event.undefined_event_pairs=100;x.worlds[0].burdens.undefined_event_pairs=100;x.worlds[1].target_event.undefined_event_pairs=0;x.worlds[1].burdens.undefined_event_pairs=0;},'compiled PC-46 world complete_target_method_exchangeability_assurance burden-state mismatch');
addBuild('compiled claim-bearing world description',x=>x.worlds[1].description='Named Person has a confirmed real-world identity and verified 95% coverage.','compiled PC-46 world undefined_or_mismatched_predicted_event snapshot mismatch');
addBuild('compiled partial noncomplete world state',x=>x.worlds[1].target_event.event_defined=true,'compiled PC-46 world undefined_or_mismatched_predicted_event snapshot mismatch');
assert.equal(buildMutations.length,27);
for(const [name,mutate,expected] of buildMutations){
  const candidate=clone(compiled);
  mutate(candidate);
  const errors=validatePreferenceLinkageTargetConstructionExchangeabilityBuild(candidate,fixture);
  assert.ok(errors.length>0,`build mutation escaped: ${name}`);
  if(expected) assert.ok(errors.some(error=>error.includes(expected)),`build mutation missed expected guard (${name}): ${errors.join('; ')}`);
}
console.log('Preference linkage target/construction/exchangeability adversarial tests: PASS (73 fixture mutations plus 27 build-tamper checks)');
