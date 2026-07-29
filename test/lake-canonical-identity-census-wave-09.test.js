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

const validation = spawnSync(process.execPath, ['tools/validate-lake-canonical-identity-census-wave-09.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-canonical-identity-census-wave-09-policy.json');
const mentions = readJsonl(policy.mention_registry_path);
const candidates = readJsonl(policy.candidate_registry_path);
const projection = readJson(policy.candidate_projection_path);
const receipt = readJson(policy.census_receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(mentions.length, 229);
assert.equal(new Set(mentions.map(row => row.mention_id)).size, 229);
assert.equal(new Set(candidates.map(row => row.candidate_id)).size, candidates.length);
assert.deepEqual(projection.mentions, mentions);
assert.deepEqual(projection.cross_case_candidates, candidates);

const statuses = new Set(mentions.map(row => row.mapping_status));
assert.ok(statuses.has('exact_canonical_id') || statuses.has('normalized_canonical_id') || statuses.has('exact_canonical_label'));
assert.ok(statuses.has('controlled_stem_candidate') || statuses.has('uncovered_name_like_identifier'));
assert.ok(statuses.has('opaque_identifier'));

for (const mention of mentions) {
  assert.equal(mention.canonical_mapping_resolved, false);
  assert.equal(mention.accepted_production_identity_bridge, false);
  assert.ok(mention.blocking_conditions.includes('explicit_same_entity_assertion_absent'));
  assert.ok(mention.blocking_conditions.includes('assertion_source_custody_absent'));
  assert.ok(mention.blocking_conditions.includes('shared_identity_namespace_absent'));
  assert.ok(mention.blocking_conditions.includes('unambiguous_axm_token_overlap_absent'));
  assert.equal(mention.automatic_cross_case_join_authorized, false);
  assert.equal(mention.cross_case_graph_join_authorized, false);
  assert.equal(mention.cross_case_hop_creation_authorized, false);
  assert.equal(mention.review_dependency.required_to_decide, false);
  assert.equal(mention.reversibility.mode, 'append_preserving_supersession');
  assert.equal(mention.graph_effect, 'none');
}

for (const candidate of candidates) {
  assert.equal(candidate.status, 'candidate_only');
  assert.equal(candidate.accepted_production_identity_bridge, false);
  assert.ok(candidate.left_mention_ids.length > 0);
  assert.ok(candidate.right_mention_ids.length > 0);
  assert.ok(candidate.blocking_conditions.includes('explicit_same_entity_assertion_absent'));
  assert.ok(candidate.blocking_conditions.includes('assertion_source_custody_absent'));
  assert.ok(candidate.blocking_conditions.includes('shared_identity_namespace_absent'));
  assert.ok(candidate.blocking_conditions.includes('unambiguous_axm_token_overlap_absent'));
  assert.equal(candidate.automatic_cross_case_join_authorized, false);
  assert.equal(candidate.cross_case_graph_join_authorized, false);
  assert.equal(candidate.cross_case_hop_creation_authorized, false);
  assert.equal(candidate.review_dependency.required_to_decide, false);
  assert.equal(candidate.reversibility.mode, 'append_preserving_supersession');
  assert.equal(candidate.graph_effect, 'none');
}

assert.equal(receipt.counts.source_identity_occurrences, 336);
assert.equal(receipt.counts.distinct_case_local_identity_values, 229);
assert.equal(receipt.counts.cross_case_candidate_rows, candidates.length);
assert.equal(receipt.counts.accepted_production_identity_bridges, 0);
assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.every_case_local_identity_value_classified, true);
assert.equal(plan.completion.ambiguous_and_uncovered_mentions_preserved, true);
assert.equal(plan.completion.cross_case_candidate_denominator_measured, true);
assert.equal(plan.completion.accepted_production_identity_bridges, 0);
assert.equal(plan.completion.decisions_requiring_human_permission, 0);
assert.equal(reconciliation.completion.every_case_local_identity_value_classified, true);
assert.equal(reconciliation.completion.every_mention_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.every_candidate_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.cross_case_candidate_denominator_measured, true);
assert.equal(reconciliation.completion.accepted_production_identity_bridges, 0);
assert.equal(reconciliation.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.active_projection_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);
assert.equal(activeIdentity.scheme.cross_case_join_authorized, false);
assert.equal(/CANMENTION-|CANCROSS-|canonical-cross-case-identity-candidate/i.test(JSON.stringify(hopGraph)), false);
assert.equal(policy.boundaries.canonical_registry_match_proves_real_world_identity, false);
assert.equal(policy.boundaries.controlled_stem_match_proves_same_entity, false);
assert.equal(policy.boundaries.canonical_candidate_creates_relationship, false);
assert.equal(policy.boundaries.canonical_candidate_creates_hop, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-canonical-identity-census-wave-09.test: OK (${mentions.length} mentions, ${candidates.length} cross-case candidates, 0 accepted bridges)`);
