#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-exact-canonical-subject-wave-14-policy.json';

function stableId(prefix, parts) {
  const digest = crypto.createHash('sha256').update(Buffer.from(parts.join('\0'))).digest('hex');
  return `${prefix}-${digest.slice(0, 24)}`;
}

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

const policy = readJson(policyPath);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const unresolvedRows = readJsonl(policy.unresolved_registry_path);

assert.equal(projection.schema_version, 'exact-canonical-subject-projection-wave-14@1');
assert.equal(plan.schema_version, 'exact-canonical-subject-wave-14-plan@1');
assert.equal(projection.counts.exact_canonical_id_references, policy.expected.exact_canonical_references);
assert.equal(projection.counts.exact_canonical_subjects, policy.expected.exact_canonical_subjects);
assert.equal(projection.counts.unresolved_subject_references, policy.expected.unresolved_subject_references);
assert.equal(unresolvedRows.length, policy.expected.unresolved_distinct_subjects);
assert.deepEqual(projection.unresolved_classification_counts, policy.expected.unresolved_classification_counts);

const exactSubjectObservations = projection.exact_subjects.map(row => ({
  schema_version: 'exact-canonical-subject-observation@1',
  exact_subject_observation_id: stableId('EXACTSUBJECT', [
    row.canonical_subject_id,
    ...uniqueSorted(row.case_ids),
    ...uniqueSorted(row.claim_ids)
  ]),
  canonical_subject_id: row.canonical_subject_id,
  canonical_kind: row.canonical_kind,
  canonical_label: row.canonical_label,
  canonical_aliases: uniqueSorted(row.canonical_aliases),
  case_ids: uniqueSorted(row.case_ids),
  local_subject_ids: uniqueSorted(row.local_subject_ids),
  claim_ids: uniqueSorted(row.claim_ids),
  catalog_claim_ids: uniqueSorted(row.catalog_claim_ids),
  resolution_status: 'resolved_local_to_canonical',
  resolution_basis: 'exact_subject_id_equals_canonical_id',
  exact_string_equality: true,
  explicit_case_resolution_used: false,
  normalized_name_match_used: false,
  alias_match_used: false,
  fuzzy_match_used: false,
  source_records_mutated: false,
  source_records_merged: false,
  relationship_created: false,
  participation_created: false,
  accepted_cross_case_identity_bridge: false,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  review_dependency: { required_to_decide: false },
  reversibility: {
    mode: 'append_preserving_supersession',
    correction_route: 'append_an_explicit_case_scoped_resolution_or_superseding_exact_subject_observation_without_rewriting_the_source_claim'
  },
  graph_effect: 'none'
})).sort((left, right) => left.exact_subject_observation_id.localeCompare(right.exact_subject_observation_id));

assert.equal(exactSubjectObservations.length, policy.expected.exact_canonical_subjects);
assert.equal(new Set(exactSubjectObservations.map(row => row.exact_subject_observation_id)).size, exactSubjectObservations.length);
assert.equal(new Set(unresolvedRows.map(row => row.unresolved_subject_id)).size, unresolvedRows.length);

projection.counts.exact_subject_observation_rows = exactSubjectObservations.length;
projection.counts.unresolved_registry_rows = unresolvedRows.length;
projection.exact_subject_observations = exactSubjectObservations;
projection.unresolved_subjects = unresolvedRows;
projection.finalization = {
  schema_version: 'exact-canonical-subject-wave-14-finalization@1',
  exact_subject_observations_projected: true,
  unresolved_registry_projected: true,
  exact_subject_observation_ids: exactSubjectObservations.length,
  unresolved_subject_ids: unresolvedRows.length,
  source_records_mutated: false,
  source_records_merged: false,
  relationship_created: false,
  participation_created: false,
  graph_effect: 'none'
};

plan.counts.exact_subject_observation_rows = exactSubjectObservations.length;
plan.counts.unresolved_registry_rows = unresolvedRows.length;
plan.finalization = projection.finalization;

const preliminaryReceipt = {
  schema_version: 'lake-exact-canonical-subject-wave-14@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: projection.source_fingerprint_sha256,
  input_manifest: projection.input_manifest,
  counts: {
    claim_subject_references: projection.counts.claim_subject_references,
    explicit_resolution_references: projection.counts.explicit_resolution_references,
    exact_canonical_id_references: projection.counts.exact_canonical_id_references,
    exact_canonical_subjects: projection.counts.exact_canonical_subjects,
    unresolved_subject_references: projection.counts.unresolved_subject_references,
    unresolved_distinct_subjects: unresolvedRows.length,
    briefing_exact_canonical_references: projection.counts.briefing_exact_canonical_references,
    exact_claim_references_observed: 0,
    unresolved_ids_source_projection_and_index_observed: 0,
    source_subject_id_changes: 0,
    source_claim_text_changes: 0,
    participation_delta: 0,
    active_claim_delta: 0,
    graph_edge_delta: 0,
    accepted_cross_case_identity_bridges: 0
  },
  unresolved_classification_counts: projection.unresolved_classification_counts,
  exact_canonical_id_lane_complete: true,
  unresolved_routing_registry_built: true,
  source_claims_preserved: true,
  exact_string_equality_only: true,
  post_execution_reconciliation_complete: false,
  normalized_name_matching_authorized: false,
  alias_matching_authorized: false,
  fuzzy_matching_authorized: false,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};

let preserveCompletedReceipt = false;
if (fs.existsSync(full(policy.receipt_path)) && fs.existsSync(full(policy.reconciliation_path))) {
  const existingReceipt = readJson(policy.receipt_path);
  const existingReconciliation = readJson(policy.reconciliation_path);
  preserveCompletedReceipt = existingReceipt.schema_version === 'lake-exact-canonical-subject-wave-14@1'
    && existingReceipt.program_key === policy.program_key
    && existingReceipt.counts?.exact_claim_references_observed === policy.expected.exact_canonical_references
    && existingReceipt.counts?.unresolved_ids_source_projection_and_index_observed === policy.expected.unresolved_distinct_subjects
    && existingReconciliation.schema_version === 'lake-exact-canonical-subject-wave-14-reconciliation@1'
    && existingReconciliation.program_key === policy.program_key
    && existingReconciliation.completion?.post_execution_reconciliation_complete === true;
}

writeJson(policy.projection_path, projection);
writeJson(policy.plan_path, plan);
if (!preserveCompletedReceipt) writeJson(policy.receipt_path, preliminaryReceipt);
console.log('exact canonical subject Wave 14 finalized');
console.log(`  exact observation IDs / unresolved IDs projected: ${exactSubjectObservations.length} / ${unresolvedRows.length}`);
console.log(preserveCompletedReceipt
  ? '  completed post-execution receipt preserved'
  : '  preliminary receipt written; post-execution reconciliation complete: false');
console.log('  source mutation, relationship, participation, graph, and hop effects: 0');
