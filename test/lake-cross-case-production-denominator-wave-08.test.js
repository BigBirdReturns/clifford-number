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

const validation = spawnSync(process.execPath, ['tools/validate-lake-cross-case-production-denominator-wave-08.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-cross-case-production-denominator-wave-08-policy.json');
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const entities = readJsonl(policy.entity_registry_path);
const pairs = readJsonl(policy.pair_denominator_path);
const decisions = readJsonl(policy.decision_registry_path);
const decisionIndex = readJson(policy.decision_index_path);

assert.ok(receipt.counts.native_cases >= 4);
assert.equal(receipt.counts.case_pairs, receipt.counts.native_cases * (receipt.counts.native_cases - 1) / 2);
assert.equal(pairs.length, receipt.counts.case_pairs);
assert.equal(entities.length, receipt.counts.entity_occurrences);
assert.equal(decisions.length, receipt.counts.candidate_decisions);
assert.equal(decisionIndex.decisions.length, decisions.length);
assert.deepEqual(decisionIndex.decisions, decisions);
assert.equal(new Set(entities.map(row => row.occurrence_id)).size, entities.length);
assert.equal(new Set(pairs.map(row => row.pair_id)).size, pairs.length);
assert.equal(new Set(decisions.map(row => row.decision_id)).size, decisions.length);

const accepted = decisions.filter(row => row.status === 'accepted');
const unresolved = decisions.filter(row => row.status === 'unresolved');
const rejected = decisions.filter(row => row.status === 'rejected');
assert.equal(accepted.length, receipt.counts.accepted_decisions);
assert.equal(unresolved.length, receipt.counts.unresolved_decisions);
assert.equal(rejected.length, receipt.counts.rejected_decisions);
assert.equal(accepted.length + unresolved.length + rejected.length, decisions.length);
assert.ok(decisions.every(row => row.reason && row.confidence));
assert.ok(decisions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(decisions.every(row => row.entities_merged === false));
assert.ok(decisions.every(row => row.relationship_created === false));
assert.ok(decisions.every(row => row.automatic_cross_case_join_authorized === false));
assert.ok(decisions.every(row => row.cross_case_graph_join_authorized === false));
assert.ok(decisions.every(row => row.cross_case_hop_creation_authorized === false));
assert.ok(decisions.every(row => row.active_projection_cross_case_join_authorized === false));
assert.ok(decisions.every(row => row.graph_effect === 'none'));
for (const row of accepted) {
  assert.equal(row.asserted_same_entity, true);
  assert.equal(row.left_canonical_id, row.right_canonical_id);
  assert.ok(row.left_public_receipt_ids.length > 0);
  assert.ok(row.right_public_receipt_ids.length > 0);
  assert.match(row.identity_bridge_key, /^AXMPROD-[a-f0-9]{24}$/);
}
for (const row of [...unresolved, ...rejected]) {
  assert.equal(row.asserted_same_entity, false);
  assert.equal(row.identity_bridge_key, null);
}
for (const pair of pairs) {
  assert.equal(pair.cartesian_entity_pairs, pair.candidate_pairs + pair.noncandidate_pairs);
  assert.equal(pair.candidate_pairs, pair.accepted_decisions + pair.unresolved_decisions + pair.rejected_decisions);
  assert.equal(pair.accepted_decisions, pair.accepted_independent_decisions + pair.accepted_shared_source_family_decisions);
  assert.equal(pair.denominator_complete_for_current_extraction_rules, true);
}

assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.current_native_case_pair_denominator_complete, true);
assert.equal(plan.completion.current_candidate_decisions_executed, true);
assert.equal(plan.completion.semantic_lake_complete, false);
assert.equal(reconciliation.completion.current_native_case_pair_denominator_complete, true);
assert.equal(reconciliation.completion.deterministic_reconstruction_complete, true);
assert.equal(reconciliation.completion.every_decision_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.every_entity_occurrence_source_and_index_observed, true);
assert.equal(reconciliation.completion.every_case_pair_source_observed, true);
assert.equal(reconciliation.completion.accepted_decisions_are_graph_inert, true);
assert.equal(reconciliation.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.active_projection_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.semantic_lake_complete, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

console.log(`lake-cross-case-production-denominator-wave-08.test: OK (${receipt.counts.native_cases} cases, ${pairs.length} pairs, ${decisions.length} decisions, ${accepted.length} accepted, ${unresolved.length} unresolved, ${rejected.length} rejected)`);
