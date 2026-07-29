#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCrossCaseAcceptance, CROSS_CASE_AUTHORIZED_SCOPE } from './lib/axm-cross-case-join.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-cross-case-acceptance-wave-07-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

const implementationPaths = [
  'tools/build-lake-axm-cross-case-acceptance-wave-07.mjs',
  'tools/reconcile-lake-axm-cross-case-acceptance-wave-07.mjs',
  'tools/validate-lake-axm-cross-case-acceptance-wave-07.mjs',
  'test/lake-axm-cross-case-acceptance-wave-07.test.js'
];

const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-axm-cross-case-acceptance-wave-07-policy@1') throw new Error('unsupported Wave 07 policy schema');
for (const relative of [...(policy.input_paths ?? []), ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 07 input: ${relative}`);
}
const inputPaths = [...new Set([policyPath, ...(policy.input_paths ?? []), ...implementationPaths])].sort();
const inputs = inputPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const fixture = readJson(policy.fixture_path);
const active = readJson('build/axm-identity.json');
const wave06 = readJson('build/lake-actions/axm-active-projection-wave-06-reconciliation.json');
assert.equal(active.scheme?.status, 'reconciled_genesis_v1', 'Wave 07 requires the migrated Genesis v1 projection');
assert.equal(active.scheme?.external_axm_gate_complete, true, 'Wave 07 requires completed external AXM reconciliation');
assert.equal(active.scheme?.cross_case_join_authorized, false, 'Wave 07 must start with the broad cross-case gate closed');
assert.equal(wave06.completion?.active_projection_migrated, true, 'Wave 06 active projection completion missing');
assert.equal(wave06.completion?.external_axm_gate_complete, true, 'Wave 06 external gate completion missing');
assert.equal(wave06.completion?.cross_case_join_authorized, false, 'Wave 06 cross-case boundary drift');

const result = compileCrossCaseAcceptance(fixture);
assert.equal(result.authorized_scope, policy.authorized_scope, 'authorized scope drift');
assert.equal(result.authorized_scope, CROSS_CASE_AUTHORIZED_SCOPE, 'library authorized scope drift');
for (const [key, expected] of Object.entries(policy.expected)) {
  if (Object.hasOwn(result.counts, key)) assert.equal(result.counts[key], expected, `${key} count drift`);
}
assert.equal(result.explicit_cross_case_identity_resolution_authorized, policy.expected.explicit_cross_case_identity_resolution_authorized);
assert.equal(result.automatic_cross_case_join_authorized, policy.expected.automatic_cross_case_join_authorized);
assert.equal(result.cross_case_graph_join_authorized, policy.expected.cross_case_graph_join_authorized);
assert.equal(result.cross_case_hop_creation_authorized, policy.expected.cross_case_hop_creation_authorized);

const assertionById = new Map(result.assertion_decisions.map(row => [row.decision_id, row]));
for (const expected of fixture.join_assertions ?? []) {
  const actual = assertionById.get(expected.assertion_id);
  assert.ok(actual, `${expected.assertion_id}: decision missing`);
  assert.equal(actual.status, expected.expected_status, `${expected.assertion_id}: status drift`);
  assert.equal(actual.reason, expected.expected_reason, `${expected.assertion_id}: reason drift`);
}
const accepted = result.assertion_decisions.filter(row => row.status === 'accepted');
const rejected = result.assertion_decisions.filter(row => row.status === 'rejected');
assert.equal(accepted.length, 1, 'exactly one synthetic join must be accepted');
assert.equal(rejected.length, 4, 'exactly four synthetic joins must be rejected');
assert.equal(accepted[0].entities_merged, false, 'accepted resolution may not merge entities');
assert.equal(accepted[0].explicit_cross_case_identity_resolution_authorized, true);
assert.equal(accepted[0].automatic_cross_case_join_authorized, false);
assert.equal(accepted[0].cross_case_graph_join_authorized, false);
assert.equal(accepted[0].cross_case_hop_creation_authorized, false);
assert.equal(accepted[0].graph_effect, 'none');
assert.ok(accepted[0].overlapping_identity_tokens.length > 0, 'accepted join lacks token overlap');
assert.ok(accepted[0].left_source_custody.length > 0 && accepted[0].right_source_custody.length > 0 && accepted[0].assertion_custody.length > 0, 'accepted join lacks source custody');

const unassertedById = new Map(result.unasserted_decisions.map(row => [row.decision_id, row]));
for (const expected of fixture.unasserted_overlap_controls ?? []) {
  const actual = unassertedById.get(expected.control_id);
  assert.ok(actual, `${expected.control_id}: unasserted control missing`);
  assert.equal(actual.token_overlap_observed, expected.expected_token_overlap);
  assert.equal(actual.explicit_cross_case_identity_resolution_authorized, expected.expected_authorized);
  assert.equal(actual.reason, expected.expected_reason);
}

const temporalById = new Map(result.temporal_decisions.map(row => [row.decision_id, row]));
for (const expected of fixture.temporal_claim_controls ?? []) {
  const actual = temporalById.get(expected.control_id);
  assert.ok(actual, `${expected.control_id}: temporal control missing`);
  assert.equal(actual.claim_identity_equal, expected.expected_claim_identity_equal);
  assert.equal(actual.temporal_overlap, expected.expected_temporal_overlap);
  assert.equal(actual.hop_basis_candidate, expected.expected_hop_basis);
  assert.equal(actual.cross_case_hop_creation_authorized, false);
  assert.equal(actual.graph_effect, 'none');
}

const hopExpected = fixture.hop_controls.expected;
assert.equal(result.hop_decision.edges.length, hopExpected.edges, 'hop positive-control edge count drift');
assert.equal(result.hop_decision.rejected_surfaces.length, hopExpected.rejected_surfaces, 'hop rejected-surface count drift');
assert.equal(result.hop_decision.rejected_pairs.length, hopExpected.rejected_pairs, 'hop rejected-pair count drift');
assert.deepEqual(result.hop_decision.rejected_surfaces.map(row => row.reason).sort(), [...hopExpected.rejected_surface_reasons].sort(), 'hop rejected-surface reasons drift');
assert.deepEqual(result.hop_decision.rejected_pairs.map(row => row.reason).sort(), [...hopExpected.rejected_pair_reasons].sort(), 'hop rejected-pair reasons drift');
assert.equal(result.hop_decision.cross_case_hop_creation_authorized, false);
assert.equal(result.hop_decision.graph_effect, 'none');

const decisionRows = [
  ...result.assertion_decisions,
  ...result.unasserted_decisions,
  ...result.temporal_decisions,
  result.hop_decision
].sort((left, right) => `${left.row_type}:${left.decision_id}`.localeCompare(`${right.row_type}:${right.decision_id}`));
assert.equal(decisionRows.length, policy.expected.decision_registry_rows, 'decision registry row count drift');
assert.equal(new Set(decisionRows.map(row => row.decision_id)).size, decisionRows.length, 'duplicate Wave 07 decision IDs');
writeJsonl(policy.decision_registry_path, decisionRows);

const receipt = {
  schema_version: 'lake-axm-cross-case-acceptance-wave-07@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  fixture_key: fixture.fixture_key,
  fixture_path: policy.fixture_path,
  decision_registry_path: policy.decision_registry_path,
  authorized_scope: policy.authorized_scope,
  counts: result.counts,
  accepted_identity_bridge_keys: accepted.map(row => row.identity_bridge_key),
  explicit_cross_case_identity_resolution_authorized: true,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  active_projection_cross_case_join_authorized: false,
  synthetic_fixture_only: true,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.acceptance_receipt_path, receipt);

const plan = {
  schema_version: 'lake-axm-cross-case-acceptance-wave-07-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    active_identity_scheme_status: active.scheme.status,
    external_axm_gate_complete: active.scheme.external_axm_gate_complete,
    active_projection_cross_case_join_authorized: active.scheme.cross_case_join_authorized,
    explicit_cross_case_identity_resolution_authorized: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false
  },
  fixture_result: result,
  decisions: [
    {
      decision_key: 'W07-EXPLICIT-IDENTITY-RESOLUTION',
      judgment: 'an_explicit_source_custodied_unambiguous_same_namespace_assertion_may_create_a_graph_inert_identity_bridge',
      action: `retain_accepted_and_rejected_decisions_in:${policy.decision_registry_path}`,
      evidence_count: result.counts.join_assertions,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W07-SAME-LABEL-NEGATIVE-CONTROL',
      judgment: 'token_overlap_without_an_explicit_assertion_does_not_authorize_resolution',
      action: 'retain_unasserted_overlap_as_rejected_control',
      evidence_count: result.counts.unasserted_overlap_controls,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W07-TEMPORAL-AND-DENSITY-CONTROLS',
      judgment: 'claim_identity_is_time_stable_but_hop_basis_requires_temporal_overlap_and_density_discipline',
      action: 'retain_disjoint_dense_and_broad_context_rejections_without_creating_cross_case_hops',
      evidence_count: result.counts.temporal_claim_controls + result.counts.hop_control_rejected_surfaces + result.counts.hop_control_rejected_pairs,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    synthetic_fixture_complete: true,
    positive_identity_resolution_control_passed: true,
    namespace_negative_control_passed: true,
    no_token_negative_control_passed: true,
    ambiguity_negative_control_passed: true,
    source_custody_negative_control_passed: true,
    unasserted_same_label_negative_control_passed: true,
    temporal_controls_passed: true,
    density_and_broad_context_controls_passed: true,
    explicit_cross_case_identity_resolution_authorized: true,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    post_execution_reconciliation_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# AXM cross-case acceptance Wave 07\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\nThe synthetic fixture authorizes one narrow operation: an explicit, source-custodied, unambiguous, same-namespace identity assertion may produce a graph-inert identity bridge. Same-label recurrence, alias recurrence, namespace mismatch, ambiguity, missing custody, temporal overlap, and bounded-surface overlap do not independently authorize a graph relation or hop.\n\n\`\`\`text\nfixture cases:                                 ${result.counts.cases}\njoin assertions:                              ${result.counts.join_assertions}\naccepted explicit assertions:                  ${result.counts.accepted_join_assertions}\nrejected assertions:                           ${result.counts.rejected_join_assertions}\nunasserted same-label controls:                ${result.counts.unasserted_overlap_controls}\ntemporal claim controls:                       ${result.counts.temporal_claim_controls}\nhop positive-control edges:                    ${result.counts.hop_control_edges}\nhop rejected surfaces:                         ${result.counts.hop_control_rejected_surfaces}\nhop rejected temporal pairs:                   ${result.counts.hop_control_rejected_pairs}\ndecision registry rows:                        ${decisionRows.length}\nexplicit identity resolution authorized:       true\nautomatic cross-case join authorized:          false\ncross-case graph join authorized:              false\ncross-case hop creation authorized:            false\nactive projection broad join flag:             false\ndecisions requiring human permission:          0\n\`\`\`\n\n## Authorized scope\n\n\`${policy.authorized_scope}\`\n\nThe accepted bridge does not merge source entities. It records a reversible identity-resolution decision with both source-custody records and the assertion custody. Every rejected control remains in the same registry.\n\n## Boundary\n\nThis synthetic acceptance result does not prove any real-world identity or relationship. Production rows must independently satisfy the same custody, namespace, explicit-assertion, and unambiguous-token requirements. Automatic same-label joins and all graph/hop creation remain disabled.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('lake AXM cross-case acceptance Wave 07 built');
console.log(`  accepted assertions: ${accepted.length}`);
console.log(`  rejected assertions: ${rejected.length}`);
console.log(`  unasserted controls: ${result.unasserted_decisions.length}`);
console.log(`  temporal controls: ${result.temporal_decisions.length}`);
console.log(`  hop edges / rejected surfaces / rejected pairs: ${result.hop_decision.edges.length} / ${result.hop_decision.rejected_surfaces.length} / ${result.hop_decision.rejected_pairs.length}`);
console.log('  explicit identity resolution authorized: true');
console.log('  automatic and graph joins authorized: false');
