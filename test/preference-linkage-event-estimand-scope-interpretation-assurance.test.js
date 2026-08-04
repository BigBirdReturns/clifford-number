import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceLinkageEventEstimandScopeInterpretationFixture,
  renderPreferenceLinkageEventEstimandScopeInterpretationMarkdown,
  validatePreferenceLinkageEventEstimandScopeInterpretationBuild,
  validatePreferenceLinkageEventEstimandScopeInterpretationFixture
} from '../tools/lib/preference-linkage-event-estimand-scope-interpretation-assurance.mjs';

const fixturePath = 'data/research/preference-custody/linkage-event-estimand-scope-interpretation-assurance.fixture.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const clone = value => structuredClone(value);
const compiled = compilePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture);

assert.deepEqual(validatePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture), []);
assert.deepEqual(validatePreferenceLinkageEventEstimandScopeInterpretationBuild(compiled, fixture), []);
assert.deepEqual(compilePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture), compiled);
assert.equal(
  renderPreferenceLinkageEventEstimandScopeInterpretationMarkdown(compiled),
  renderPreferenceLinkageEventEstimandScopeInterpretationMarkdown(compiled)
);
assert.equal(compiled.metrics.worlds, 8);
assert.equal(compiled.metrics.public_event_estimand_population_coverage_signatures, 1);
assert.equal(compiled.metrics.semantic_governance_signatures, 8);
assert.equal(compiled.metrics.complete_event_estimand_scope_interpretation_assurance_worlds, 1);

const fixtureMutations = [];
const add = (name, mutate, expected) => fixtureMutations.push([name, mutate, expected]);

add('schema', x => x.schema_version = 'bad', 'fixture schema mismatch');
add('fixture id', x => x.fixture_id = 'bad', 'fixture identity mismatch');
add('issue', x => x.issue = 1, 'fixture issue custody mismatch');
add('parent issue', x => x.parent_program_issue = 1, 'fixture issue custody mismatch');
add('captured-at object', x => x.captured_at = { real_world_identity: 'Named Person', binding_public_authority: true }, 'fixture captured_at must be an exact ISO date');
add('captured-at impossible date', x => x.captured_at = '2026-02-30', 'fixture captured_at must be an exact ISO date');
add('status', x => x.status = 'real_world_finding', 'fixture status or graph effect mismatch');
add('graph', x => x.graph_effect = 'edge', 'fixture status or graph effect mismatch');
add('thesis', x => x.counts_toward_thesis_evidence = true, 'fixture thesis evidence must remain false');
add('unrecognized root field', x => x.real_world_identity = 'Named Person', 'fixture key ledger mismatch');

for (const key of Object.keys(fixture.baseline)) {
  add(`baseline ${key}`, x => {
    const value = x.baseline[key];
    x.baseline[key] = typeof value === 'number' ? value + 1 : 'bad';
  }, 'fixture frozen public surface mismatch');
}
add('baseline extra field', x => x.baseline.binding_public_authority = true, 'fixture baseline key ledger mismatch');
add('baseline missing field', x => delete x.baseline.approved_use, 'fixture baseline key ledger mismatch');

for (const key of Object.keys(fixture.interpretation_contract)) {
  add(`interpretation ${key}`, x => x.interpretation_contract[key] = 'A real identity, production coverage, and binding authority finding.', 'fixture interpretation contract mismatch');
}
add('interpretation extra field', x => x.interpretation_contract.real_world_effect = true, 'fixture interpretation contract key ledger mismatch');

add('refusal removed', x => x.required_refusal_rules.pop(), 'fixture refusal-rule ledger mismatch');
add('refusal duplicated', x => x.required_refusal_rules.push(x.required_refusal_rules[0]), 'fixture refusal-rule ledger mismatch');
add('refusal changed', x => x.required_refusal_rules[0] = 'bad', 'fixture refusal-rule ledger mismatch');

for (const key of Object.keys(fixture.expected_classification)) {
  add(`classification ${key}`, x => x.expected_classification[key] = !x.expected_classification[key], 'fixture classification mismatch');
}
add('classification extra field', x => x.expected_classification.real_world_coverage_proven = true, 'fixture classification key ledger mismatch');
add('classification missing field', x => delete x.expected_classification.graph_effect_present, 'fixture classification key ledger mismatch');

add('world removed', x => x.worlds.pop(), 'fixture must contain the eight exact ordered worlds');
add('world order', x => x.worlds.reverse(), 'fixture must contain the eight exact ordered worlds');
add('duplicate world id', x => x.worlds[1].world_id = x.worlds[0].world_id, 'fixture must contain the eight exact ordered worlds');
add('empty description', x => x.worlds[0].description = '', 'description is required');
add('claim-bearing description', x => x.worlds[1].description = 'Named Person has a verified real identity and 95% production coverage with binding authority.', 'snapshot mismatch');
add('world extra field', x => x.worlds[0].causal_finding = true, 'key ledger mismatch');

const sections = ['event_semantics', 'estimand', 'population_scope', 'unit_scope', 'horizon_scope', 'support_interpretation', 'governance'];
for (const section of sections) {
  add(`${section} extra field`, x => x.worlds[0][section].controller = 'external', `${section} key ledger mismatch`);
  const firstKey = Object.keys(fixture.worlds[0][section])[0];
  add(`${section} missing field`, x => delete x.worlds[0][section][firstKey], `${section} key ledger mismatch`);
}

for (let index = 0; index < fixture.worlds.length; index += 1) {
  add(`mechanism ${index}`, x => x.worlds[index].expected_mechanism = 'bad', 'mechanism mismatch');
  add(`expected flag ${index}`, x => {
    const key = Object.keys(x.worlds[index].expected_flags)[0];
    x.worlds[index].expected_flags[key] = !x.worlds[index].expected_flags[key];
  }, 'snapshot mismatch');
}

const partialStatePaths = [
  ['event_semantics', 'event_defined'],
  ['event_semantics', 'competing_events_resolved'],
  ['estimand', 'estimand_formula_frozen'],
  ['population_scope', 'sampling_frame_defined'],
  ['unit_scope', 'cluster_unit_defined'],
  ['horizon_scope', 'time_origin_defined'],
  ['support_interpretation', 'coverage_meaning_defined'],
  ['governance', 'interpretation_current']
];
for (let index = 0; index < partialStatePaths.length; index += 1) {
  const [section, key] = partialStatePaths[index];
  add(`partial world state ${index}`, x => x.worlds[index][section][key] = !x.worlds[index][section][key], 'snapshot mismatch');
}

const burdenPaths = [
  ['event_semantics', 'undefined_event_pairs'],
  ['event_semantics', 'censoring_competing_event_ambiguous_pairs'],
  ['estimand', 'estimand_mismatched_pairs'],
  ['population_scope', 'population_frame_mismatched_pairs'],
  ['unit_scope', 'unit_cluster_mismatched_pairs'],
  ['horizon_scope', 'horizon_time_origin_mismatched_pairs'],
  ['support_interpretation', 'support_tail_coverage_meaning_mismatched_pairs'],
  ['governance', 'unsupported_interpretation_decisions']
];
for (let index = 0; index < burdenPaths.length; index += 1) {
  const [section, key] = burdenPaths[index];
  add(`negative burden ${index}`, x => x.worlds[index][section][key] = -1, 'burden-state mismatch');
}

for (let index = 0; index < burdenPaths.length; index += 1) {
  const [section, key] = burdenPaths[index];
  const sourceIndex = index === 7 ? 1 : index + 1;
  add(`aggregate-preserving burden redistribution ${index}`, x => {
    const amount = x.worlds[sourceIndex][section][key];
    x.worlds[0][section][key] += amount;
    x.worlds[sourceIndex][section][key] = 0;
  }, 'burden-state mismatch');
}

for (const [name, mutate, expected] of fixtureMutations) {
  const candidate = clone(fixture);
  mutate(candidate);
  const errors = validatePreferenceLinkageEventEstimandScopeInterpretationFixture(candidate);
  assert.ok(errors.length > 0, `fixture mutation escaped: ${name}`);
  if (expected) assert.ok(errors.some(error => error.includes(expected)), `fixture mutation missed expected guard (${name}): ${errors.join('; ')}`);
}

const buildMutations = [];
const addBuild = (name, mutate, expected) => buildMutations.push([name, mutate, expected]);
addBuild('schema', x => x.schema_version = 'bad', 'compiled PC-47 schema mismatch');
addBuild('fixture id', x => x.fixture_id = 'bad', 'compiled PC-47 identity mismatch');
addBuild('issue', x => x.issue = 1, 'compiled PC-47 identity mismatch');
addBuild('parent issue', x => x.parent_program_issue = 1, 'compiled PC-47 identity mismatch');
addBuild('captured-at object', x => x.captured_at = { real_world_identity: 'Named Person' }, 'compiled PC-47 captured_at must be an exact ISO date');
addBuild('captured-at impossible date', x => x.captured_at = '2026-02-30', 'compiled PC-47 captured_at must be an exact ISO date');
addBuild('status', x => x.status = 'bad', 'compiled PC-47 status boundary mismatch');
addBuild('graph', x => x.graph_effect = 'edge', 'compiled PC-47 status boundary mismatch');
addBuild('real-world evidence', x => x.real_world_evidence_state = 'verified', 'compiled PC-47 status boundary mismatch');
addBuild('thesis', x => x.counts_toward_thesis_evidence = true, 'compiled PC-47 thesis evidence must remain false');
addBuild('conclusion', x => x.conclusion_generated = true, 'compiled PC-47 conclusion must remain false');
addBuild('source hash', x => x.source_fixture_sha256 = '0'.repeat(64), 'compiled PC-47 source fixture hash mismatch');
addBuild('rule drop', x => x.required_refusal_rules.pop(), 'compiled PC-47 refusal ledger mismatch');
addBuild('baseline', x => x.baseline.approved_use = 'binding_public_authority', 'compiled PC-47 baseline mismatch');
addBuild('interpretation contract', x => x.interpretation_contract.what_this_is = 'A real identity and production coverage finding.', 'compiled PC-47 interpretation contract mismatch');
addBuild('metric', x => x.metrics.undefined_event_pairs += 1, 'compiled PC-47 metric mismatch');
addBuild('metric extra field', x => x.metrics.real_world_prevalence = 0.95, 'compiled PC-47 metrics key ledger mismatch');
addBuild('classification', x => x.classification.public_event_badge_identifies_defined_event = true, 'compiled PC-47 classification mismatch');
addBuild('classification extra field', x => x.classification.real_world_effect = true, 'compiled PC-47 classification key ledger mismatch');
addBuild('world removed', x => x.worlds.pop(), 'compiled PC-47 world ledger mismatch');
addBuild('root extra field', x => x.controller = 'external', 'compiled PC-47 key ledger mismatch');
addBuild('world extra field', x => x.worlds[0].causal_finding = true, 'compiled PC-47 world complete_semantic_assurance key ledger mismatch');
addBuild('nested extra field', x => x.worlds[0].event_semantics.controller = 'external', 'event_semantics key ledger mismatch');
addBuild('public surface', x => x.worlds[0].public_surface.approved_use = 'bad', 'public surface mismatch');
addBuild('public signature', x => x.worlds[0].public_signature_sha256 = '0'.repeat(64), 'public signature mismatch');
addBuild('semantic signature', x => x.worlds[0].semantic_governance_signature_sha256 = '0'.repeat(64), 'governance signature mismatch');
addBuild('mechanism', x => x.worlds[0].expected_mechanism = 'bad', 'mechanism mismatch');
addBuild('expected flag', x => x.worlds[0].expected_flags.complete_event_semantics = false, 'snapshot mismatch');
addBuild('observed flag', x => x.worlds[0].observed_flags.complete_event_semantics = false, 'flag mismatch');
addBuild('partial state', x => x.worlds[1].event_semantics.event_defined = true, 'snapshot mismatch');
addBuild('claim-bearing description', x => x.worlds[1].description = 'Named Person is definitively linked with verified production coverage.', 'snapshot mismatch');
addBuild('burden state', x => {
  x.worlds[1].event_semantics.undefined_event_pairs = 99;
  x.worlds[1].burdens.undefined_event_pairs = 99;
}, 'burden-state mismatch');
addBuild('burden copy mismatch', x => x.worlds[1].burdens.undefined_event_pairs = 99, 'burden mismatch');
addBuild('binding authority', x => x.worlds[0].governance.binding_public_authority = true, 'snapshot mismatch');
addBuild('custody payload', x => x.custody_chain[0].payload.public_surface.approved_use = 'real_world_authority', 'custody event hash mismatch');
addBuild('custody event extra field', x => x.custody_chain[0].real_world_identity = 'Named Person', 'custody event key ledger mismatch');
addBuild('custody hash', x => x.custody_chain[1].event_sha256 = '0'.repeat(64), 'custody event hash mismatch');
addBuild('custody head', x => x.custody_chain_head_sha256 = '0'.repeat(64), 'custody head mismatch');

for (const [name, mutate, expected] of buildMutations) {
  const candidate = clone(compiled);
  mutate(candidate);
  const errors = validatePreferenceLinkageEventEstimandScopeInterpretationBuild(candidate, fixture);
  assert.ok(errors.length > 0, `build mutation escaped: ${name}`);
  if (expected) assert.ok(errors.some(error => error.includes(expected)), `build mutation missed expected guard (${name}): ${errors.join('; ')}`);
}

console.log(`Preference linkage event/estimand/scope/interpretation adversarial tests: PASS (${fixtureMutations.length} fixture mutations plus ${buildMutations.length} build-tamper checks)`);
