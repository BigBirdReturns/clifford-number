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

const validation = spawnSync(process.execPath, ['tools/validate-lake-production-cross-case-census-wave-08.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-production-cross-case-census-wave-08-policy.json');
const caseIndex = readJson('build/cases/index.json');
const candidates = readJsonl(policy.candidate_registry_path);
const pairs = readJsonl(policy.case_pair_denominator_path);
const projection = readJson(policy.candidate_projection_path);
const receipt = readJson(policy.census_receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(caseIndex.cases.length, 4);
assert.equal(pairs.length, 6);
assert.equal(new Set(pairs.map(row => row.case_pair_id)).size, 6);
assert.equal(new Set(candidates.map(row => row.candidate_id)).size, candidates.length);
assert.deepEqual(projection.candidates, candidates);
assert.deepEqual(projection.case_pairs, [...pairs].sort((left, right) => left.case_pair_id.localeCompare(right.case_pair_id)));

for (const candidate of candidates) {
  assert.equal(candidate.status, 'candidate_only');
  assert.equal(candidate.accepted_production_identity_bridge, false);
  assert.ok(candidate.blocking_conditions.length >= 4);
  assert.ok(candidate.blocking_conditions.includes('explicit_same_entity_assertion_absent'));
  assert.ok(candidate.blocking_conditions.includes('assertion_source_custody_absent'));
  assert.ok(candidate.blocking_conditions.includes('shared_identity_namespace_absent'));
  assert.ok(candidate.blocking_conditions.includes('unambiguous_identity_token_overlap_absent'));
  assert.equal(candidate.automatic_cross_case_join_authorized, false);
  assert.equal(candidate.cross_case_graph_join_authorized, false);
  assert.equal(candidate.cross_case_hop_creation_authorized, false);
  assert.equal(candidate.review_dependency.required_to_decide, false);
  assert.equal(candidate.reversibility.mode, 'append_preserving_supersession');
  assert.equal(candidate.graph_effect, 'none');
}

for (const pair of pairs) {
  assert.equal(pair.case_pair_measured, true);
  assert.equal(pair.accepted_production_identity_bridges, 0);
  assert.equal(pair.automatic_cross_case_join_authorized, false);
  assert.equal(pair.cross_case_graph_join_authorized, false);
  assert.equal(pair.cross_case_hop_creation_authorized, false);
  assert.equal(pair.graph_effect, 'none');
}

assert.equal(receipt.counts.native_cases, 4);
assert.equal(receipt.counts.case_pairs, 6);
assert.equal(receipt.counts.candidate_pair_rows, candidates.length);
assert.equal(receipt.counts.accepted_production_identity_bridges, 0);
assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.native_case_pair_denominator_measured, true);
assert.equal(plan.completion.production_candidate_registry_present, true);
assert.equal(plan.completion.accepted_production_identity_bridges, 0);
assert.equal(plan.completion.decisions_requiring_human_permission, 0);
assert.equal(reconciliation.completion.native_case_pair_denominator_measured, true);
assert.equal(reconciliation.completion.every_candidate_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.every_case_pair_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.accepted_production_identity_bridges, 0);
assert.equal(reconciliation.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.active_projection_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);
assert.equal(activeIdentity.scheme.cross_case_join_authorized, false);
assert.equal(/XCCAND-|XCPAIR-|production-cross-case/i.test(JSON.stringify(hopGraph)), false);
assert.equal(policy.boundaries.exact_local_identifier_recurrence_proves_same_entity, false);
assert.equal(policy.boundaries.candidate_status_creates_relationship, false);
assert.equal(policy.boundaries.candidate_status_creates_hop, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-production-cross-case-census-wave-08.test: OK (${caseIndex.cases.length} cases, ${pairs.length} pairs, ${candidates.length} candidates, 0 accepted bridges)`);
