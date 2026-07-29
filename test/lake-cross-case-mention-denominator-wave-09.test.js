#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

const validation = spawnSync(process.execPath, ['tools/validate-lake-cross-case-mention-denominator-wave-09.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-cross-case-mention-denominator-wave-09-policy.json');
const baseline = readJson(policy.baseline_receipt_path);
const lexicon = readJson(policy.lexicon_path);
const mentions = readJsonl(policy.mention_registry_path);
const entities = readJsonl(policy.case_entity_registry_path);
const pairs = readJsonl(policy.pair_denominator_path);
const decisions = readJsonl(policy.decision_registry_path);
const decisionIndex = readJson(policy.decision_index_path);
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);

assert.equal(baseline.counts.candidate_decisions, 0);
assert.equal(baseline.boundaries.zero_exact_candidates_proves_no_real_overlap, false);
assert.ok(receipt.counts.native_cases >= 4);
assert.equal(receipt.counts.case_pairs, receipt.counts.native_cases * (receipt.counts.native_cases - 1) / 2);
assert.ok(receipt.counts.source_records_scanned > 0);
assert.ok(receipt.counts.text_leaves_scanned > 0);
assert.ok(receipt.counts.text_characters_scanned > 0);
assert.ok(receipt.counts.exact_mentions > 0);
assert.equal(mentions.length, receipt.counts.exact_mentions);
assert.equal(entities.length, receipt.counts.mentioned_case_entities);
assert.equal(pairs.length, receipt.counts.case_pairs);
assert.equal(decisions.length, receipt.counts.candidate_decisions);
assert.deepEqual(decisionIndex.decisions, decisions);
assert.deepEqual(decisionIndex.counts, receipt.counts);
assert.equal(new Set(mentions.map(row => row.mention_id)).size, mentions.length);
assert.equal(new Set(entities.map(row => row.mentioned_entity_id)).size, entities.length);
assert.equal(new Set(pairs.map(row => row.pair_id)).size, pairs.length);
assert.equal(new Set(decisions.map(row => row.decision_id)).size, decisions.length);

assert.ok(lexicon.active.length > 0);
assert.equal(lexicon.counts.active_lexemes, lexicon.active.length);
assert.equal(lexicon.counts.excluded_lexemes, lexicon.excluded.length);
assert.ok(lexicon.active.every(row => row.active === true && row.match_mode && row.exclusion_reason === null));
assert.ok(lexicon.excluded.every(row => row.active === false && row.exclusion_reason));
assert.ok(lexicon.active.every(row => row.owner_canonical_ids.length === 1));
assert.equal(policy.text_scan.fuzzy_matching_authorized, false);

assert.ok(mentions.every(row => row.graph_effect === 'none'));
assert.ok(mentions.every(row => row.source_path.startsWith(`cases/${row.case_id}/`)));
assert.ok(mentions.every(row => row.span_start >= 0 && row.span_end > row.span_start && row.span_end <= row.source_text_length));
assert.ok(mentions.every(row => row.canonical_id && row.canonical_label && row.axm_entity_id));
assert.ok(mentions.filter(row => row.recurrence_eligible).every(row => row.public_receipt_ids.length > 0));

for (const entity of entities) {
  assert.equal(entity.mention_count, entity.mention_ids.length);
  assert.equal(entity.eligible_mention_count, entity.eligible_mention_ids.length);
  assert.equal(entity.source_record_count, entity.source_record_ids.length);
}
for (const pair of pairs) {
  assert.equal(pair.candidate_canonical_entities, pair.accepted_recurrences + pair.unresolved_recurrences + pair.rejected_recurrences);
  assert.equal(pair.accepted_recurrences, pair.accepted_independent_recurrences + pair.accepted_shared_source_family_recurrences);
  assert.equal(pair.denominator_complete_for_declared_exact_lexicon, true);
}
assert.equal(pairs.reduce((total, row) => total + row.candidate_canonical_entities, 0), decisions.length);

const accepted = decisions.filter(row => row.status === 'accepted');
const unresolved = decisions.filter(row => row.status === 'unresolved');
const rejected = decisions.filter(row => row.status === 'rejected');
assert.equal(accepted.length, receipt.counts.accepted_recurrences);
assert.equal(unresolved.length, receipt.counts.unresolved_recurrences);
assert.equal(rejected.length, receipt.counts.rejected_recurrences);
assert.ok(decisions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(decisions.every(row => row.records_merged === false));
assert.ok(decisions.every(row => row.relationship_created === false));
assert.ok(decisions.every(row => row.automatic_cross_case_join_authorized === false));
assert.ok(decisions.every(row => row.cross_case_graph_join_authorized === false));
assert.ok(decisions.every(row => row.cross_case_hop_creation_authorized === false));
assert.ok(decisions.every(row => row.active_projection_cross_case_join_authorized === false));
assert.ok(decisions.every(row => row.graph_effect === 'none'));
for (const row of accepted) {
  assert.match(row.recurrence_key, /^CCMREC-[a-f0-9]{24}$/);
  assert.ok(row.left_eligible_mention_count > 0);
  assert.ok(row.right_eligible_mention_count > 0);
  assert.ok(row.left_public_receipt_ids.length > 0);
  assert.ok(row.right_public_receipt_ids.length > 0);
}
for (const row of [...unresolved, ...rejected]) {
  assert.equal(row.recurrence_key, null);
  assert.equal(row.authorized_scope, null);
}

assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.structured_zero_candidate_baseline_preserved, true);
assert.equal(plan.completion.exact_mention_lexicon_built, true);
assert.equal(plan.completion.all_declared_source_record_types_scanned, true);
assert.equal(plan.completion.current_case_pair_mention_denominator_complete, true);
assert.equal(plan.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.structured_zero_candidate_baseline_preserved, true);
assert.equal(reconciliation.completion.deterministic_reconstruction_complete, true);
assert.equal(reconciliation.completion.every_mention_source_and_index_observed, true);
assert.equal(reconciliation.completion.every_mentioned_entity_source_and_index_observed, true);
assert.equal(reconciliation.completion.every_case_pair_source_observed, true);
assert.equal(reconciliation.completion.every_decision_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.accepted_recurrences_are_graph_inert, true);
assert.equal(reconciliation.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.active_projection_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.semantic_lake_complete, false);
assert.equal(reconciliation.completion.evidence_truth_determined, false);
assert.equal(reconciliation.completion.publication_cleared, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

console.log(`lake-cross-case-mention-denominator-wave-09.test: OK (${mentions.length} exact mentions, ${entities.length} case entities, ${decisions.length} recurrence decisions, ${accepted.length} accepted, ${unresolved.length} unresolved, ${rejected.length} rejected)`);
