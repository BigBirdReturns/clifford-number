import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture,
  renderPreferenceLinkageIntervalMethodPartitionReplicationDeploymentMarkdown,
  validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild,
  validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture
} from '../tools/lib/preference-linkage-interval-method-partition-replication-deployment-assurance.mjs';

const fixturePath = 'data/research/preference-custody/linkage-interval-method-partition-replication-deployment-assurance.fixture.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const clone = value => structuredClone(value);
const compiled = compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(fixture);

assert.deepEqual(validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(compiled, fixture), []);
assert.deepEqual(compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(fixture), compiled);
assert.equal(renderPreferenceLinkageIntervalMethodPartitionReplicationDeploymentMarkdown(compiled), renderPreferenceLinkageIntervalMethodPartitionReplicationDeploymentMarkdown(compiled));
assert.equal(compiled.metrics.worlds, 8);
assert.equal(compiled.metrics.public_method_replay_oos_deployment_signatures, 1);
assert.equal(compiled.metrics.method_governance_signatures, 8);
assert.equal(compiled.metrics.complete_method_assurance_worlds, 1);
assert.equal(compiled.metrics.unsupported_deployment_decisions, 700);

const fixtureMutations = [];
const add = (name, mutate) => fixtureMutations.push([name, mutate]);
add('schema', x => x.schema_version = 'bad');
add('fixture id', x => x.fixture_id = 'bad');
add('issue', x => x.issue = 1);
add('parent issue', x => x.parent_program_issue = 1);
add('captured object', x => x.captured_at = { named_person: true });
add('captured impossible', x => x.captured_at = '2026-02-30');
add('status', x => x.status = 'real_world_finding');
add('graph', x => x.graph_effect = 'edge');
add('thesis', x => x.counts_toward_thesis_evidence = true);
add('root extra', x => x.binding_public_authority = true);
for (const key of Object.keys(fixture.baseline)) add(`baseline ${key}`, x => { x.baseline[key] = typeof x.baseline[key] === 'number' ? x.baseline[key] + 1 : 'bad'; });
add('baseline extra', x => x.baseline.real_world_effect = true);
add('baseline missing', x => delete x.baseline.approved_use);
for (const key of Object.keys(fixture.interpretation_contract)) add(`interpretation ${key}`, x => x.interpretation_contract[key] = 'A binding real-world production finding.');
add('interpretation extra', x => x.interpretation_contract.real_world_effect = true);
add('refusal removed', x => x.required_refusal_rules.pop());
add('refusal duplicate', x => x.required_refusal_rules.push(x.required_refusal_rules[0]));
add('refusal changed', x => x.required_refusal_rules[0] = 'bad');
for (const key of Object.keys(fixture.expected_classification)) add(`classification ${key}`, x => x.expected_classification[key] = !x.expected_classification[key]);
add('classification extra', x => x.expected_classification.real_world_prevalence = true);
add('world removed', x => x.worlds.pop());
add('world order', x => x.worlds.reverse());
add('duplicate world', x => x.worlds[1].world_id = x.worlds[0].world_id);
add('world extra', x => x.worlds[0].causal_finding = true);
for (let index = 0; index < fixture.worlds.length; index += 1) {
  add(`description ${index}`, x => x.worlds[index].description += ' changed');
  add(`mechanism ${index}`, x => x.worlds[index].expected_mechanism = 'bad');
  add(`expected flag ${index}`, x => { const key = Object.keys(x.worlds[index].expected_flags)[0]; x.worlds[index].expected_flags[key] = !x.worlds[index].expected_flags[key]; });
}
const sections = ['implementation','runtime_configuration','partition','exchangeability','replication','deployment','governance'];
for (const section of sections) {
  add(`${section} extra`, x => x.worlds[0][section].controller = 'external');
  add(`${section} missing`, x => delete x.worlds[0][section][Object.keys(x.worlds[0][section])[0]]);
  for (const key of Object.keys(fixture.worlds[0][section])) {
    if (typeof fixture.worlds[0][section][key] === 'boolean') add(`${section} boolean ${key}`, x => x.worlds[0][section][key] = 'true');
  }
}
const burdenPaths = [
  ['implementation','unbound_method_pairs'],
  ['runtime_configuration','configuration_drift_pairs'],
  ['partition','partition_overlap_pairs'],
  ['partition','selection_leakage_pairs'],
  ['exchangeability','exchangeability_violated_pairs'],
  ['replication','independent_replication_failures'],
  ['deployment','out_of_scope_deployment_decisions'],
  ['governance','stale_method_decisions'],
  ['governance','unsupported_deployment_decisions']
];
const burdenSourceIndices = [1,2,3,3,4,5,6,7,1];
for (let index = 0; index < burdenPaths.length; index += 1) {
  const [section, key] = burdenPaths[index];
  add(`negative burden ${key}`, x => x.worlds[burdenSourceIndices[index]][section][key] = -1);
  const sourceIndex = burdenSourceIndices[index];
  add(`aggregate preserving redistribution ${key}`, x => {
    const amount = x.worlds[sourceIndex][section][key];
    x.worlds[0][section][key] += amount;
    x.worlds[sourceIndex][section][key] = 0;
  });
}
const partialStatePaths = [
  ['implementation','repository_bound'],
  ['runtime_configuration','configuration_frozen'],
  ['partition','cross_split_leakage_absent'],
  ['exchangeability','exchangeability_supported'],
  ['replication','independent_team'],
  ['deployment','validated_population_match'],
  ['governance','assurance_current'],
  ['governance','succession_ledger_complete']
];
for (let index = 0; index < partialStatePaths.length; index += 1) {
  const [section, key] = partialStatePaths[index];
  add(`partial state ${index}`, x => x.worlds[index][section][key] = !x.worlds[index][section][key]);
}
assert.ok(fixtureMutations.length >= 120, `fixture adversarial denominator too small: ${fixtureMutations.length}`);
for (const [name, mutate] of fixtureMutations) {
  const candidate = clone(fixture);
  mutate(candidate);
  const errors = validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(candidate);
  assert.ok(errors.length > 0, `fixture mutation escaped: ${name}`);
}

const buildMutations = [];
const addBuild = (name, mutate) => buildMutations.push([name, mutate]);
addBuild('schema', x => x.schema_version = 'bad');
addBuild('fixture id', x => x.fixture_id = 'bad');
addBuild('issue', x => x.issue = 1);
addBuild('parent issue', x => x.parent_program_issue = 1);
addBuild('captured object', x => x.captured_at = { named_person: true });
addBuild('captured impossible', x => x.captured_at = '2026-02-30');
addBuild('status', x => x.status = 'bad');
addBuild('graph', x => x.graph_effect = 'edge');
addBuild('real world evidence', x => x.real_world_evidence_state = 'verified');
addBuild('thesis', x => x.counts_toward_thesis_evidence = true);
addBuild('conclusion', x => x.conclusion_generated = true);
addBuild('source hash', x => x.source_fixture_sha256 = '0'.repeat(64));
addBuild('rule', x => x.required_refusal_rules.pop());
addBuild('root extra', x => x.controller = 'external');
for (const key of Object.keys(compiled.baseline)) addBuild(`baseline ${key}`, x => { x.baseline[key] = typeof x.baseline[key] === 'number' ? x.baseline[key] + 1 : 'bad'; });
for (const key of Object.keys(compiled.interpretation_contract)) addBuild(`interpretation ${key}`, x => x.interpretation_contract[key] = 'A real-world finding.');
for (const key of Object.keys(compiled.metrics)) addBuild(`metric ${key}`, x => x.metrics[key] += 1);
addBuild('metric extra', x => x.metrics.real_world_prevalence = 0.95);
for (const key of Object.keys(compiled.classification)) addBuild(`classification ${key}`, x => x.classification[key] = !x.classification[key]);
addBuild('classification extra', x => x.classification.real_world_effect = true);
addBuild('world removed', x => x.worlds.pop());
addBuild('world order', x => x.worlds.reverse());
addBuild('world extra', x => x.worlds[0].causal_finding = true);
addBuild('description', x => x.worlds[1].description += ' changed');
addBuild('public surface', x => x.worlds[0].public_surface.approved_use = 'bad');
addBuild('public signature', x => x.worlds[0].public_signature_sha256 = '0'.repeat(64));
addBuild('governance signature', x => x.worlds[0].method_governance_signature_sha256 = '0'.repeat(64));
addBuild('mechanism', x => x.worlds[0].expected_mechanism = 'bad');
addBuild('expected flag', x => x.worlds[0].expected_flags.complete_implementation_custody = false);
addBuild('observed flag', x => x.worlds[0].observed_flags.complete_implementation_custody = false);
addBuild('burden copy', x => x.worlds[1].burdens.unbound_method_pairs = 99);
addBuild('burden state', x => { x.worlds[1].implementation.unbound_method_pairs = 99; x.worlds[1].burdens.unbound_method_pairs = 99; });
addBuild('nested extra', x => x.worlds[0].implementation.controller = 'external');
addBuild('binding authority', x => x.worlds[0].governance.binding_public_authority = true);
addBuild('custody payload', x => x.custody_chain[0].payload.public_surface.approved_use = 'bad');
addBuild('custody extra', x => x.custody_chain[0].real_world_identity = 'Named Person');
addBuild('custody hash', x => x.custody_chain[1].event_sha256 = '0'.repeat(64));
addBuild('custody head', x => x.custody_chain_head_sha256 = '0'.repeat(64));
assert.ok(buildMutations.length >= 60, `build adversarial denominator too small: ${buildMutations.length}`);
for (const [name, mutate] of buildMutations) {
  const candidate = clone(compiled);
  mutate(candidate);
  const errors = validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(candidate, fixture);
  assert.ok(errors.length > 0, `build mutation escaped: ${name}`);
}

const changedFixture = clone(fixture);
changedFixture.captured_at = '2026-08-05';
const freshBuild = compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(changedFixture);
assert.deepEqual(validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(freshBuild, changedFixture), []);
assert.ok(validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(compiled, changedFixture).length > 0);

console.log(`Preference linkage-interval method/partition/replication/deployment adversarial tests: PASS (${fixtureMutations.length} fixture mutations plus ${buildMutations.length} build-tamper checks and source/build succession)`);
