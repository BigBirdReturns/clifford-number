#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

const validation = spawnSync(process.execPath, ['tools/validate-lake-axm-cross-case-acceptance-wave-07.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-axm-cross-case-acceptance-wave-07-policy.json');
const active = readJson('build/axm-identity.json');
const registry = readJsonl(policy.decision_registry_path);
const receipt = readJson(policy.acceptance_receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);

assert.equal(active.scheme.status, 'reconciled_genesis_v1');
assert.equal(active.scheme.external_axm_gate_complete, true);
assert.equal(active.scheme.cross_case_join_authorized, false);
assert.equal(registry.length, 9);
assert.equal(new Set(registry.map(row => row.decision_id)).size, 9);

const assertions = registry.filter(row => row.row_type === 'join_assertion');
const accepted = assertions.filter(row => row.status === 'accepted');
const rejected = assertions.filter(row => row.status === 'rejected');
assert.equal(assertions.length, 5);
assert.equal(accepted.length, 1);
assert.equal(rejected.length, 4);
assert.equal(accepted[0].decision_id, 'fixture-join-accept-reciprocal-alias');
assert.equal(accepted[0].reason, 'explicit_unambiguous_token_overlap');
assert.match(accepted[0].identity_bridge_key, /^AXMBRIDGE-[a-f0-9]{24}$/);
assert.equal(accepted[0].authorized_scope, 'explicit_source_custodied_graph_inert_identity_resolution_only');
assert.equal(accepted[0].entities_merged, false);
assert.ok(accepted[0].overlapping_identity_tokens.length > 0);
assert.ok(accepted[0].left_source_custody.length > 0);
assert.ok(accepted[0].right_source_custody.length > 0);
assert.ok(accepted[0].assertion_custody.length > 0);

const reasons = new Set(rejected.map(row => row.reason));
assert.deepEqual(reasons, new Set([
  'identity_namespace_mismatch',
  'no_declared_token_overlap',
  'ambiguous_token_overlap',
  'missing_assertion_custody'
]));
const unasserted = registry.find(row => row.decision_id === 'fixture-unasserted-same-label');
assert.ok(unasserted);
assert.equal(unasserted.token_overlap_observed, true);
assert.equal(unasserted.reason, 'explicit_assertion_missing');
assert.equal(unasserted.explicit_cross_case_identity_resolution_authorized, false);

const disjoint = registry.find(row => row.decision_id === 'fixture-temporal-disjoint');
const overlap = registry.find(row => row.decision_id === 'fixture-temporal-overlap');
assert.ok(disjoint && overlap);
assert.equal(disjoint.claim_identity_equal, true);
assert.equal(disjoint.temporal_overlap, false);
assert.equal(disjoint.hop_basis_candidate, false);
assert.equal(overlap.claim_identity_equal, true);
assert.equal(overlap.temporal_overlap, true);
assert.equal(overlap.hop_basis_candidate, true);
assert.equal(overlap.cross_case_hop_creation_authorized, false);

const hop = registry.find(row => row.row_type === 'hop_control_summary');
assert.ok(hop);
assert.equal(hop.edges.length, 1);
assert.equal(hop.rejected_surfaces.length, 2);
assert.equal(hop.rejected_pairs.length, 1);
assert.deepEqual(hop.rejected_surfaces.map(row => row.reason).sort(), ['broad_institution_context_only', 'density_limit_exceeded']);
assert.deepEqual(hop.rejected_pairs.map(row => row.reason), ['no_temporal_overlap']);

assert.ok(registry.every(row => row.automatic_cross_case_join_authorized === false));
assert.ok(registry.every(row => row.cross_case_graph_join_authorized === false));
assert.ok(registry.every(row => row.cross_case_hop_creation_authorized === false));
assert.ok(registry.every(row => row.graph_effect === 'none'));

assert.equal(receipt.explicit_cross_case_identity_resolution_authorized, true);
assert.equal(receipt.automatic_cross_case_join_authorized, false);
assert.equal(receipt.cross_case_graph_join_authorized, false);
assert.equal(receipt.cross_case_hop_creation_authorized, false);
assert.equal(receipt.active_projection_cross_case_join_authorized, false);
assert.equal(receipt.synthetic_fixture_only, true);
assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.synthetic_fixture_complete, true);
assert.equal(plan.completion.positive_identity_resolution_control_passed, true);
assert.equal(plan.completion.unasserted_same_label_negative_control_passed, true);
assert.equal(plan.completion.explicit_cross_case_identity_resolution_authorized, true);
assert.equal(plan.completion.automatic_cross_case_join_authorized, false);
assert.equal(plan.completion.cross_case_graph_join_authorized, false);
assert.equal(plan.completion.cross_case_hop_creation_authorized, false);
assert.equal(plan.completion.active_projection_cross_case_join_authorized, false);

assert.equal(reconciliation.completion.synthetic_fixture_complete, true);
assert.equal(reconciliation.completion.deterministic_fixture_reconstruction_complete, true);
assert.equal(reconciliation.completion.all_negative_controls_passed, true);
assert.equal(reconciliation.completion.all_decision_ids_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.explicit_cross_case_identity_resolution_authorized, true);
assert.equal(reconciliation.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.active_projection_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

assert.equal(policy.boundaries.synthetic_fixture_proves_real_world_identity, false);
assert.equal(policy.boundaries.same_label_proves_same_entity, false);
assert.equal(policy.boundaries.explicit_identity_resolution_merges_entities, false);
assert.equal(policy.boundaries.explicit_cross_case_identity_resolution_authorized, true);
assert.equal(policy.boundaries.automatic_cross_case_join_authorized, false);
assert.equal(policy.boundaries.cross_case_graph_join_authorized, false);
assert.equal(policy.boundaries.cross_case_hop_creation_authorized, false);
assert.equal(policy.boundaries.active_projection_cross_case_join_authorized, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log('lake-axm-cross-case-acceptance-wave-07.test: OK (1 accepted, 4 rejected, 4 negative-control classes, graph/hop gates closed)');
