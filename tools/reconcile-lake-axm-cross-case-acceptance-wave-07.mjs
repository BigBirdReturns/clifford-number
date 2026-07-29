#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCrossCaseAcceptance } from './lib/axm-cross-case-join.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-cross-case-acceptance-wave-07-policy.json';
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.acceptance_receipt_path);
const fixture = readJson(policy.fixture_path);
const active = readJson('build/axm-identity.json');
const registry = readJsonl(policy.decision_registry_path);
const projection = readJson(policy.decision_projection_path);
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const hopGraph = readJson('build/hop-graph.json');
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

const inputs = [
  policyPath,
  policy.fixture_path,
  policy.decision_registry_path,
  policy.decision_projection_path,
  policy.acceptance_receipt_path,
  policy.plan_path,
  'build/axm-identity.json',
  'build/hop-graph.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json',
  'BUILD-INSTRUCTIONS.md',
  'README.md'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((left, right) => left.path.localeCompare(right.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const recomputed = compileCrossCaseAcceptance(fixture);
assert.deepEqual(recomputed, plan.fixture_result, 'Wave 07 fixture result is not deterministic');
const expectedRows = [
  ...recomputed.assertion_decisions,
  ...recomputed.unasserted_decisions,
  ...recomputed.temporal_decisions,
  recomputed.hop_decision
].sort((left, right) => `${left.row_type}:${left.decision_id}`.localeCompare(`${right.row_type}:${right.decision_id}`));
assert.deepEqual(registry, expectedRows, 'Wave 07 decision registry does not equal the deterministic fixture result');
assert.equal(projection.schema_version, 'axm-cross-case-join-decision-index@1', 'Wave 07 decision projection schema drift');
assert.equal(projection.program_key, policy.program_key, 'Wave 07 decision projection program drift');
assert.equal(projection.source_registry_path, policy.decision_registry_path, 'Wave 07 decision projection source path drift');
assert.equal(projection.fixture_path, policy.fixture_path, 'Wave 07 decision projection fixture path drift');
assert.equal(projection.authorized_scope, policy.authorized_scope, 'Wave 07 decision projection scope drift');
assert.equal(projection.counts?.decisions, expectedRows.length, 'Wave 07 decision projection count drift');
assert.deepEqual(projection.decisions, expectedRows, 'Wave 07 generated decision projection does not equal the source registry');

assert.equal(active.scheme?.status, 'reconciled_genesis_v1', 'active identity scheme drift');
assert.equal(active.scheme?.external_axm_gate_complete, true, 'external AXM gate drift');
assert.equal(active.scheme?.cross_case_join_authorized, false, 'broad active-projection join flag must remain false');

const accepted = registry.filter(row => row.row_type === 'join_assertion' && row.status === 'accepted');
const rejected = registry.filter(row => row.row_type === 'join_assertion' && row.status === 'rejected');
const unasserted = registry.filter(row => row.row_type === 'unasserted_overlap_control');
const temporal = registry.filter(row => row.row_type === 'temporal_claim_control');
const hopControls = registry.filter(row => row.row_type === 'hop_control_summary');
assert.equal(accepted.length, policy.expected.accepted_join_assertions);
assert.equal(rejected.length, policy.expected.rejected_join_assertions);
assert.equal(unasserted.length, policy.expected.unasserted_overlap_controls);
assert.equal(temporal.length, policy.expected.temporal_claim_controls);
assert.equal(hopControls.length, 1);
assert.equal(accepted[0].authorized_scope, policy.authorized_scope);
assert.equal(accepted[0].entities_merged, false);
assert.equal(accepted[0].graph_effect, 'none');
assert.ok(registry.every(row => row.cross_case_graph_join_authorized === false));
assert.ok(registry.every(row => row.cross_case_hop_creation_authorized === false));
assert.ok(registry.every(row => row.graph_effect === 'none'));

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourceControls = [policy.fixture_path, policy.decision_registry_path, policy.acceptance_receipt_path];
const sourceStates = sourceControls.map(relative => {
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
assert.ok(sourceStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true), 'Wave 07 source controls are not authoritative-reachable');
assert.equal(fileByPath.get(policy.decision_registry_path)?.index_file, true, 'Wave 07 decision registry is not an index surface');
const projectionFile = fileByPath.get(policy.decision_projection_path);
assert.ok(projectionFile, 'Wave 07 decision projection is missing from the lake file index');
assert.equal(projectionFile.generated, true, 'Wave 07 decision projection is not marked generated');
assert.equal(projectionFile.index_file, true, 'Wave 07 decision projection is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let decisionIdsObserved = 0;
for (const row of registry) {
  const object = objectByKey.get(`decision_id:${row.decision_id}`);
  assert.ok(object, `${row.decision_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.decision_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.decision_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.decision_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false), `${row.decision_id}: registry source occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_projection_path && item.generated === true), `${row.decision_id}: generated decision projection occurrence missing`);
  decisionIdsObserved += 1;
}

const activeHopGraphText = JSON.stringify(hopGraph);
assert.ok(!/AXMBRIDGE-|fixture-join-accept-reciprocal-alias/.test(activeHopGraphText), 'synthetic identity bridge leaked into the active hop graph');
assert.ok(/explicit, source-custodied, graph-inert cross-case identity resolution/i.test(buildInstructions), 'BUILD-INSTRUCTIONS lacks the bounded Wave 07 contract');
assert.ok(/automatic same-label joins remain prohibited/i.test(buildInstructions), 'BUILD-INSTRUCTIONS lacks the automatic-join prohibition');
assert.ok(/explicit cross-case identity resolution/i.test(readme), 'README lacks the Wave 07 resolution lane');
assert.ok(/does not create a graph edge or hop/i.test(readme), 'README lacks the graph/hop boundary');

const reconciliation = {
  schema_version: 'lake-axm-cross-case-acceptance-wave-07-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: plan.before,
  after: {
    authorized_scope: policy.authorized_scope,
    fixture_cases: recomputed.counts.cases,
    accepted_explicit_assertions: accepted.length,
    rejected_assertions: rejected.length,
    unasserted_overlap_controls: unasserted.length,
    temporal_claim_controls: temporal.length,
    hop_control_edges: recomputed.counts.hop_control_edges,
    hop_control_rejected_surfaces: recomputed.counts.hop_control_rejected_surfaces,
    hop_control_rejected_pairs: recomputed.counts.hop_control_rejected_pairs,
    decision_registry_rows: registry.length,
    decision_projection_rows: projection.decisions.length,
    decision_ids_source_projection_and_index_observed: decisionIdsObserved,
    source_controls_authoritative_reachable: sourceStates.every(row => row.authoritative_reachable),
    source_control_states: sourceStates,
    decision_projection_indexed: projectionFile.index_file,
    explicit_cross_case_identity_resolution_authorized: true,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: active.scheme.cross_case_join_authorized,
    synthetic_bridge_tokens_in_active_hop_graph: 0,
    global_machine_ids: summary.counts.distinct_machine_ids
  },
  deltas: {
    explicit_cross_case_identity_resolution_authorized: 1,
    decision_projection_rows: projection.decisions.length,
    automatic_cross_case_join_authorizations: 0,
    cross_case_graph_join_authorizations: 0,
    cross_case_hop_creation_authorizations: 0,
    active_projection_join_flag_changes: 0,
    graph_effects_created: 0
  },
  decisions: [
    {
      decision_key: 'W07-RECONCILE-EXPLICIT-LANE',
      judgment: 'the_positive_fixture_authorizes_only_explicit_source_custodied_graph_inert_identity_resolution',
      action: 'retain_the_accepted_bridge_and_all_rejections_in_the_source_registry_and_generated_decision_index',
      evidence_count: accepted.length + rejected.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W07-RECONCILE-AUTOMATIC-JOIN-GATE',
      judgment: 'same_label_alias_or_token_recurrence_without_an_explicit_assertion_does_not_authorize_join',
      action: 'keep_automatic_cross_case_join_authorized_false',
      evidence_count: unasserted.length + rejected.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W07-RECONCILE-GRAPH-GATE',
      judgment: 'identity_resolution_temporal_overlap_and_bounded_surface_overlap_do_not_create_cross_case_graph_edges_or_hops',
      action: 'keep_graph_and_hop_creation_authorized_false',
      evidence_count: temporal.length + hopControls.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    synthetic_fixture_complete: true,
    deterministic_fixture_reconstruction_complete: true,
    positive_identity_resolution_control_passed: true,
    all_negative_controls_passed: true,
    decision_projection_built_and_indexed: true,
    all_decision_ids_source_projection_and_index_observed: decisionIdsObserved === registry.length,
    source_controls_authoritative_reachable: sourceStates.every(row => row.authoritative_reachable),
    explicit_cross_case_identity_resolution_authorized: true,
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

const report = `# AXM cross-case acceptance Wave 07 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nauthorized scope:                            ${policy.authorized_scope}\nfixture cases:                               ${recomputed.counts.cases}\naccepted explicit assertions:                ${accepted.length}\nrejected assertions:                         ${rejected.length}\nunasserted overlap controls:                 ${unasserted.length}\ntemporal claim controls:                     ${temporal.length}\nhop positive-control edges:                  ${recomputed.counts.hop_control_edges}\nhop rejected surfaces:                       ${recomputed.counts.hop_control_rejected_surfaces}\nhop rejected temporal pairs:                 ${recomputed.counts.hop_control_rejected_pairs}\ndecision registry rows:                      ${registry.length}\ndecision projection rows:                    ${projection.decisions.length}\ndecision IDs source/projection/indexed:      ${decisionIdsObserved}\nsource controls authoritative-reachable:     ${sourceStates.every(row => row.authoritative_reachable)}\ngenerated decision projection indexed:       ${projectionFile.index_file}\nexplicit identity resolution authorized:     true\nautomatic cross-case join authorized:        false\ncross-case graph join authorized:            false\ncross-case hop creation authorized:          false\nactive broad join flag:                      false\nsynthetic bridge tokens in active hop graph: 0\ndecisions requiring human permission:        0\n\`\`\`\n\n## Judgment\n\nThe fixture closes one narrow acceptance gate. A production identity bridge may be recorded only when an explicit same-entity assertion, source custody on both local records, assertion custody, a shared identity namespace, and an unambiguous token overlap are all present. The bridge remains graph-inert and reversible.\n\n## Boundary\n\nNo automatic same-label or alias join is authorized. No source entity is merged. No relationship, graph edge, or hop is created. The synthetic fixture is not evidence about any real person or institution.\n`;

writeJson(policy.reconciliation_path, reconciliation);
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('lake AXM cross-case acceptance Wave 07 reconciled');
console.log(`  accepted / rejected assertions: ${accepted.length} / ${rejected.length}`);
console.log(`  source / projection decision rows: ${registry.length} / ${projection.decisions.length}`);
console.log(`  decision IDs observed: ${decisionIdsObserved}/${registry.length}`);
console.log('  explicit identity resolution authorized: true');
console.log('  automatic, graph, and hop joins authorized: false');
