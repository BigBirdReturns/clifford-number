#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-production-cross-case-census-wave-08-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function pairKey(left, right) {
  return [left, right].sort().join('\0');
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.census_receipt_path);
const candidates = readJsonl(policy.candidate_registry_path);
const casePairs = readJsonl(policy.case_pair_denominator_path);
const projection = readJson(policy.candidate_projection_path);
const caseIndex = readJson('build/cases/index.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(policy.schema_version, 'lake-production-cross-case-census-wave-08-policy@1', 'Wave 08 policy schema drift');
assert.equal(plan.schema_version, 'lake-production-cross-case-census-wave-08-plan@1', 'Wave 08 plan schema drift');
assert.equal(receipt.schema_version, 'lake-production-cross-case-census-wave-08@1', 'Wave 08 receipt schema drift');
assert.equal(plan.program_key, policy.program_key, 'Wave 08 plan program drift');
assert.equal(receipt.program_key, policy.program_key, 'Wave 08 receipt program drift');
assert.equal(plan.source_fingerprint_sha256, manifestFingerprint(plan.input_manifest), 'Wave 08 plan fingerprint mismatch');
assert.equal(receipt.source_fingerprint_sha256, plan.source_fingerprint_sha256, 'Wave 08 receipt and plan fingerprints disagree');

const orderedCandidates = [...candidates].sort((left, right) => `${left.left_case_id}\0${left.right_case_id}\0${left.normalized_identity_value}`
  .localeCompare(`${right.left_case_id}\0${right.right_case_id}\0${right.normalized_identity_value}`));
const orderedPairs = [...casePairs].sort((left, right) => left.case_pair_id.localeCompare(right.case_pair_id));
assert.equal(projection.schema_version, 'axm-production-cross-case-candidate-index-wave-08@1', 'Wave 08 projection schema drift');
assert.equal(projection.program_key, policy.program_key, 'Wave 08 projection program drift');
assert.equal(projection.candidate_registry_path, policy.candidate_registry_path, 'Wave 08 projection candidate source drift');
assert.equal(projection.case_pair_denominator_path, policy.case_pair_denominator_path, 'Wave 08 projection denominator source drift');
assert.deepEqual(projection.candidates, orderedCandidates, 'Wave 08 candidate projection disagrees with source registry');
assert.deepEqual(projection.case_pairs, orderedPairs, 'Wave 08 pair projection disagrees with source denominator');
assert.equal(projection.counts.candidates, candidates.length, 'Wave 08 projected candidate count drift');
assert.equal(projection.counts.case_pairs, casePairs.length, 'Wave 08 projected pair count drift');
assert.equal(projection.counts.accepted_production_identity_bridges, 0, 'Wave 08 projection accepted a production bridge');

const cases = [...caseIndex.cases].sort((left, right) => left.case_id.localeCompare(right.case_id));
assert.equal(cases.length, policy.expected.native_cases, 'Wave 08 native case count drift');
assert.equal(casePairs.length, policy.expected.case_pairs, 'Wave 08 case-pair denominator count drift');
const expectedPairKeys = new Set();
for (let i = 0; i < cases.length; i += 1) {
  for (let j = i + 1; j < cases.length; j += 1) expectedPairKeys.add(pairKey(cases[i].case_id, cases[j].case_id));
}
assert.deepEqual(new Set(casePairs.map(row => pairKey(row.left_case_id, row.right_case_id))), expectedPairKeys,
  'Wave 08 case-pair denominator does not cover every current native case pair');

const candidateIds = new Set();
for (const row of candidates) {
  assert.ok(row.candidate_id && !candidateIds.has(row.candidate_id), `duplicate or missing Wave 08 candidate ID ${row.candidate_id}`);
  candidateIds.add(row.candidate_id);
  assert.equal(row.status, 'candidate_only', `${row.candidate_id}: production recurrence escaped candidate-only state`);
  assert.equal(row.accepted_production_identity_bridge, false, `${row.candidate_id}: production bridge accepted`);
  assert.ok(Array.isArray(row.blocking_conditions) && row.blocking_conditions.length > 0, `${row.candidate_id}: no material blocker recorded`);
  assert.equal(row.explicit_same_entity_assertion_present, false, `${row.candidate_id}: unregistered production assertion appeared`);
  assert.equal(row.assertion_source_custody_present, false, `${row.candidate_id}: unregistered assertion custody appeared`);
  assert.equal(row.shared_identity_namespace_present, false, `${row.candidate_id}: case IDs were laundered into a shared namespace`);
  assert.equal(row.unambiguous_identity_token_overlap_present, false, `${row.candidate_id}: local string recurrence was laundered into AXM token overlap`);
  assert.equal(row.automatic_cross_case_join_authorized, false, `${row.candidate_id}: automatic join authorized`);
  assert.equal(row.cross_case_graph_join_authorized, false, `${row.candidate_id}: graph join authorized`);
  assert.equal(row.cross_case_hop_creation_authorized, false, `${row.candidate_id}: hop creation authorized`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${row.candidate_id}: human-permission dependency remains`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${row.candidate_id}: correction route missing`);
  assert.equal(row.graph_effect, 'none', `${row.candidate_id}: graph effect created`);
}

const pairIds = new Set();
for (const row of casePairs) {
  assert.ok(row.case_pair_id && !pairIds.has(row.case_pair_id), `duplicate or missing Wave 08 pair ID ${row.case_pair_id}`);
  pairIds.add(row.case_pair_id);
  const pairCandidates = candidates.filter(candidate => pairKey(candidate.left_case_id, candidate.right_case_id) === pairKey(row.left_case_id, row.right_case_id));
  assert.equal(row.exact_local_identifier_recurrences, pairCandidates.length, `${row.case_pair_id}: recurrence count drift`);
  assert.equal(row.distinct_identity_values, new Set(pairCandidates.map(candidate => candidate.normalized_identity_value)).size,
    `${row.case_pair_id}: distinct identity-value count drift`);
  assert.equal(row.candidates_with_source_custody_on_both_sides,
    pairCandidates.filter(candidate => candidate.left_source_custody_present && candidate.right_source_custody_present).length,
    `${row.case_pair_id}: custody count drift`);
  assert.equal(row.accepted_production_identity_bridges, 0, `${row.case_pair_id}: production bridge accepted`);
  assert.equal(row.case_pair_measured, true, `${row.case_pair_id}: pair not measured`);
  assert.equal(row.automatic_cross_case_join_authorized, false, `${row.case_pair_id}: automatic join authorized`);
  assert.equal(row.cross_case_graph_join_authorized, false, `${row.case_pair_id}: graph join authorized`);
  assert.equal(row.cross_case_hop_creation_authorized, false, `${row.case_pair_id}: hop creation authorized`);
  assert.equal(row.graph_effect, 'none', `${row.case_pair_id}: graph effect created`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourceControlPaths = [
  policy.candidate_registry_path,
  policy.case_pair_denominator_path,
  policy.census_receipt_path
];
const sourceControlStates = sourceControlPaths.map(relative => {
  const row = fileByPath.get(relative);
  return {
    path: relative,
    present: Boolean(row),
    generated: row?.generated ?? null,
    index_file: row?.index_file ?? false,
    authoritative_reachable: row?.authoritative_reachable ?? false,
    public_reachable: row?.public_reachable ?? false
  };
});
assert.ok(sourceControlStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true),
  'Wave 08 source controls are not authoritative-reachable');
assert.equal(fileByPath.get(policy.candidate_registry_path)?.index_file, true, 'Wave 08 candidate registry is not an index surface');
assert.equal(fileByPath.get(policy.case_pair_denominator_path)?.index_file, true, 'Wave 08 pair denominator is not an index surface');
const projectionFile = fileByPath.get(policy.candidate_projection_path);
assert.ok(projectionFile, 'Wave 08 generated candidate projection is missing from the lake');
assert.equal(projectionFile.generated, true, 'Wave 08 candidate projection is not marked generated');
assert.equal(projectionFile.index_file, true, 'Wave 08 candidate projection is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let candidatesObserved = 0;
for (const row of candidates) {
  const object = objectByKey.get(`candidate_id:${row.candidate_id}`);
  assert.ok(object, `${row.candidate_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.candidate_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.candidate_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.candidate_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.candidate_registry_path && item.generated === false),
    `${row.candidate_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true),
    `${row.candidate_id}: generated projection occurrence missing`);
  candidatesObserved += 1;
}

let pairsObserved = 0;
for (const row of casePairs) {
  const object = objectByKey.get(`case_pair_id:${row.case_pair_id}`);
  assert.ok(object, `${row.case_pair_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.case_pair_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.case_pair_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.case_pair_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.case_pair_denominator_path && item.generated === false),
    `${row.case_pair_id}: source denominator occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true),
    `${row.case_pair_id}: generated projection occurrence missing`);
  pairsObserved += 1;
}

assert.equal(activeIdentity.scheme?.cross_case_join_authorized, false, 'active identity projection broad join flag opened');
const topologyText = JSON.stringify(hopGraph);
assert.ok(!/XCCAND-|XCPAIR-|production-cross-case/i.test(topologyText), 'Wave 08 census leaked into the active hop graph');

const reconciliationInputs = [
  policyPath,
  policy.candidate_registry_path,
  policy.case_pair_denominator_path,
  policy.census_receipt_path,
  policy.candidate_projection_path,
  policy.plan_path,
  'build/cases/index.json',
  'build/axm-identity.json',
  'build/hop-graph.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((left, right) => left.path.localeCompare(right.path));
const reconciliationFingerprint = manifestFingerprint(reconciliationInputs);
const bothSidesCustodied = candidates.filter(row => row.left_source_custody_present && row.right_source_custody_present).length;
const publiclyCustodiedBothSides = candidates.filter(row => row.left_publicly_inspectable_custody_present && row.right_publicly_inspectable_custody_present).length;
const blockingCounts = {};
for (const blocker of candidates.flatMap(row => row.blocking_conditions)) blockingCounts[blocker] = (blockingCounts[blocker] ?? 0) + 1;

const reconciliation = {
  schema_version: 'lake-production-cross-case-census-wave-08-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: reconciliationFingerprint,
  input_manifest: reconciliationInputs,
  before: plan.before,
  after: {
    native_cases: cases.length,
    case_pair_denominator_rows: casePairs.length,
    candidate_rows: candidates.length,
    candidate_projection_rows: projection.candidates.length,
    pair_projection_rows: projection.case_pairs.length,
    candidates_with_source_custody_on_both_sides: bothSidesCustodied,
    candidates_with_publicly_inspectable_custody_on_both_sides: publiclyCustodiedBothSides,
    blocking_condition_counts: Object.fromEntries(Object.entries(blockingCounts).sort(([left], [right]) => left.localeCompare(right))),
    candidate_ids_source_projection_and_index_observed: candidatesObserved,
    case_pair_ids_source_projection_and_index_observed: pairsObserved,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    source_control_states: sourceControlStates,
    candidate_projection_indexed: projectionFile.index_file,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: activeIdentity.scheme.cross_case_join_authorized,
    census_tokens_in_active_hop_graph: 0,
    global_machine_ids: summary.counts.distinct_machine_ids,
    unindexed_machine_ids: summary.counts.unindexed_machine_ids,
    exact_orphan_evidence_files: summary.counts.exact_orphan_evidence_files
  },
  deltas: {
    native_case_pair_denominator_measured: 1,
    production_candidate_registry_present: 1,
    candidate_rows: candidates.length,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorizations: 0,
    cross_case_graph_join_authorizations: 0,
    cross_case_hop_creation_authorizations: 0,
    graph_effects_created: 0
  },
  decisions: [
    {
      decision_key: 'W08-RECONCILE-DENOMINATOR',
      judgment: 'all_current_native_case_pairs_have_an_explicit_identity_recurrence_denominator',
      action: 'retain_the_complete_six_pair_denominator',
      evidence_count: casePairs.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-RECONCILE-PRODUCTION-CANDIDATES',
      judgment: 'every_exact_local_identifier_recurrence_remains_candidate_only_with_named_material_blockers',
      action: 'retain_the_source_registry_and_generated_candidate_index',
      evidence_count: candidates.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-RECONCILE-JOIN-GATE',
      judgment: 'no_current_production_candidate_satisfies_the_complete_wave_07_identity_resolution_contract',
      action: 'keep_all_automatic_graph_and_hop_join_authorizations_false',
      evidence_count: candidates.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    native_case_pair_denominator_measured: true,
    production_candidate_registry_present: true,
    generated_candidate_projection_built_and_indexed: true,
    every_candidate_has_material_blockers: candidates.every(row => row.blocking_conditions.length > 0),
    every_candidate_id_source_projection_and_index_observed: candidatesObserved === candidates.length,
    every_case_pair_id_source_projection_and_index_observed: pairsObserved === casePairs.length,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.reconciliation_path, reconciliation);

const report = `# Production cross-case identity census Wave 08 reconciliation\n\nSource fingerprint: \`${reconciliationFingerprint}\`\n\n## Result\n\n\`\`\`text\nnative cases:                                      ${cases.length}\ncase-pair denominator rows:                        ${casePairs.length}\nproduction candidate rows:                         ${candidates.length}\nsource / generated candidate rows:                 ${candidates.length} / ${projection.candidates.length}\nsource / generated pair rows:                      ${casePairs.length} / ${projection.case_pairs.length}\ncandidates custodied on both sides:                ${bothSidesCustodied}\ncandidates publicly inspectable on both sides:     ${publiclyCustodiedBothSides}\ncandidate IDs source/projection/indexed:           ${candidatesObserved}\ncase-pair IDs source/projection/indexed:            ${pairsObserved}\naccepted production identity bridges:              0\nautomatic cross-case join authorized:              false\ncross-case graph join authorized:                  false\ncross-case hop creation authorized:                false\nactive broad join flag:                            false\ncensus tokens in active hop graph:                 0\ndecisions requiring human permission:              0\n\`\`\`\n\n## Judgment\n\nThe production corpus now has a complete current case-pair denominator and a reproducible candidate registry. Exact local-identifier recurrence is useful acquisition evidence, but none of the current rows carries the full Wave 07 combination of an explicit same-entity assertion, assertion custody, a declared shared identity namespace, and unambiguous AXM token overlap. Every current production recurrence therefore remains candidate-only.\n\n## Boundary\n\nNo entity is merged. No relationship, graph edge, or hop is created. The decision does not wait for a reviewer: it is a present bounded non-join judgment based on named material defects and may be superseded when those defects are repaired.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('production cross-case identity census Wave 08 reconciled');
console.log(`  native cases / case pairs: ${cases.length} / ${casePairs.length}`);
console.log(`  candidate rows: ${candidates.length}`);
console.log(`  candidates / pairs observed: ${candidatesObserved}/${candidates.length} / ${pairsObserved}/${casePairs.length}`);
console.log('  accepted production identity bridges: 0');
console.log('  automatic, graph, and hop joins authorized: false');
