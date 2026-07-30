#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson, writeJsonl } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-subject-integration-wave-16-policy.json';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
}

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-subject-integration-wave-16-policy@1');
const wave15Receipt = readJson(policy.baseline.wave_15_receipt_path);
const decisions = readJsonl(policy.baseline.wave_15_registry_path);
assert.equal(wave15Receipt.post_execution_reconciliation_complete, true, 'Wave 15 receipt is not complete');
assert.equal(decisions.length, policy.expected.wave_15_decisions);

const identityDecisions = decisions.filter(row => row.disposition !== 'bounded_nonidentity_object');
const existingIdentityDecisions = identityDecisions.filter(row => row.disposition !== 'identity_new_canonical_plan');
const plannedIdentityDecisions = identityDecisions.filter(row => row.disposition === 'identity_new_canonical_plan');
const subjectObjectDecisions = decisions.filter(row => row.disposition === 'bounded_nonidentity_object');
assert.equal(identityDecisions.length, policy.expected.identity_decisions);
assert.equal(existingIdentityDecisions.length, policy.expected.existing_identity_resolutions);
assert.equal(plannedIdentityDecisions.length, policy.expected.new_canonical_records);
assert.equal(subjectObjectDecisions.length, policy.expected.nonidentity_object_decisions);
assert.equal(identityDecisions.reduce((total, row) => total + row.claim_count, 0), policy.expected.identity_claim_references_integrated);
assert.equal(subjectObjectDecisions.reduce((total, row) => total + row.claim_count, 0), policy.expected.subject_object_claim_references_integrated);

const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const actorIds = new Set(actorsDoc.actors.map(row => row.id));
const organizationById = new Map(organizationsDoc.organizations.map(row => [row.id, row]));
assert.equal(actorsDoc.actors.length, policy.baseline.canonical_actor_rows);
assert.equal(aliasesDoc.aliases.length, policy.baseline.canonical_alias_rows);
assert.ok([policy.baseline.canonical_organization_rows, policy.expected.canonical_organization_rows_after].includes(organizationsDoc.organizations.length), 'unexpected canonical organization denominator');

const canonicalAdditions = [];
for (const decision of plannedIdentityDecisions.sort((left, right) => left.canonical_target.canonical_id.localeCompare(right.canonical_target.canonical_id))) {
  const target = decision.canonical_target;
  assert.equal(target.canonical_kind, 'organization');
  assert.ok(target.canonical_id && target.canonical_label && target.planned_kind);
  assert.ok(decision.receipt_ids.length > 0, `${decision.adjudication_id}: planned record lacks receipt custody`);
  assert.ok(!actorIds.has(target.canonical_id), `${target.canonical_id}: planned organization collides with actor`);
  const addition = {
    id: target.canonical_id,
    label: target.canonical_label,
    kind: target.planned_kind,
    source: 'lake-subject-integration-wave-16',
    source_case_id: decision.source_case_id,
    source_local_subject_id: decision.local_subject_id,
    source_decision_id: decision.adjudication_id,
    source_unresolved_subject_id: decision.unresolved_subject_id,
    receipt_ids: uniqueSorted(decision.receipt_ids),
    canonical_status: 'bounded_source_custodied_canonical_record',
    graph_effect: 'none'
  };
  const existing = organizationById.get(addition.id);
  if (existing) assert.deepEqual(canonical(existing), canonical(addition), `${addition.id}: existing Wave 16 canonical record drift`);
  else {
    organizationsDoc.organizations.push(addition);
    organizationById.set(addition.id, addition);
  }
  canonicalAdditions.push(addition);
}
assert.equal(canonicalAdditions.length, policy.expected.new_canonical_records);
assert.equal(organizationsDoc.organizations.length, policy.expected.canonical_organization_rows_after);
writeJson('data/canonical/organizations.json', organizationsDoc);

const localResolutionRows = identityDecisions.map(decision => {
  const target = decision.canonical_target;
  assert.ok(target?.canonical_id && target?.canonical_kind, `${decision.adjudication_id}: canonical target missing`);
  const sourceIds = uniqueSorted(decision.receipt_ids);
  assert.ok(sourceIds.length > 0, `${decision.adjudication_id}: local resolution lacks source custody`);
  return {
    schema_version: 'local-canonical-resolution@1',
    resolution_id: stableId('LOCALCANON', [policy.program_key, decision.adjudication_id, decision.source_case_id, decision.local_subject_id, target.canonical_id]),
    source_case_id: decision.source_case_id,
    local_subject_id: decision.local_subject_id,
    canonical_id: target.canonical_id,
    canonical_kind: target.canonical_kind,
    source_decision_id: decision.adjudication_id,
    source_ids: sourceIds,
    status: 'accepted_graph_inert_local_resolution',
    explicit_same_entity_assertion: true,
    entities_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_wave_16_resolution_and_update_current_projection_without_deleting_this_row'
    },
    graph_effect: 'none'
  };
}).sort((left, right) => left.resolution_id.localeCompare(right.resolution_id));
assert.equal(localResolutionRows.length, policy.expected.identity_decisions);
assert.equal(new Set(localResolutionRows.map(row => row.resolution_id)).size, localResolutionRows.length);
writeJsonl(policy.paths.local_resolution_registry, localResolutionRows);

const subjectObjectRows = subjectObjectDecisions.map(decision => {
  assert.ok(decision.subject_object_id && decision.object_kind, `${decision.adjudication_id}: subject-object decision incomplete`);
  return {
    schema_version: 'subject-object-resolution@1',
    subject_object_id: decision.subject_object_id,
    source_case_id: decision.source_case_id,
    local_subject_id: decision.local_subject_id,
    object_kind: decision.object_kind,
    source_decision_id: decision.adjudication_id,
    source_unresolved_subject_id: decision.unresolved_subject_id,
    source_claim_ids: uniqueSorted(decision.source_claim_ids),
    supporting_claim_ids: uniqueSorted(decision.supporting_claim_ids),
    receipt_ids: uniqueSorted(decision.receipt_ids),
    status: 'accepted_graph_inert_subject_object',
    actor_or_organization_join_authorized: false,
    identity_resolution_created: false,
    relationship_created: false,
    participation_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_subject_object_resolution_without_deleting_this_row'
    },
    graph_effect: 'none'
  };
}).sort((left, right) => left.subject_object_id.localeCompare(right.subject_object_id));
assert.equal(subjectObjectRows.length, policy.expected.subject_object_rows);
assert.equal(new Set(subjectObjectRows.map(row => row.subject_object_id)).size, subjectObjectRows.length);
writeJsonl(policy.paths.subject_object_registry, subjectObjectRows);

const wave13PolicyPath = 'data/project/lake-canonical-subject-projection-wave-13-policy.json';
const wave13Policy = readJson(wave13PolicyPath);
if (!wave13Policy.input_paths.includes(policy.paths.local_resolution_registry)) wave13Policy.input_paths.push(policy.paths.local_resolution_registry);
wave13Policy.input_paths.sort((left, right) => left.localeCompare(right));
wave13Policy.expected.current_resolution_rows = policy.expected.local_resolution_rows_after;
wave13Policy.expected.current_resolution_registry_files = policy.expected.local_resolution_registry_files_after;
wave13Policy.expected.minimum_resolved_case_claim_subject_references = policy.expected.resolved_identity_references_after;
writeJson(wave13PolicyPath, wave13Policy);

const mutationPlan = {
  schema_version: 'lake-subject-integration-source-mutation-wave-16@1',
  program_key: policy.program_key,
  before: {
    canonical_actor_rows: policy.baseline.canonical_actor_rows,
    canonical_organization_rows: policy.baseline.canonical_organization_rows,
    canonical_alias_rows: policy.baseline.canonical_alias_rows,
    local_resolution_rows: policy.baseline.local_resolution_rows,
    local_resolution_registry_files: policy.baseline.local_resolution_registry_files
  },
  after: {
    canonical_actor_rows: actorsDoc.actors.length,
    canonical_organization_rows: organizationsDoc.organizations.length,
    canonical_alias_rows: aliasesDoc.aliases.length,
    local_resolution_rows: policy.expected.local_resolution_rows_after,
    local_resolution_registry_files: policy.expected.local_resolution_registry_files_after,
    subject_object_rows: subjectObjectRows.length
  },
  canonical_organization_additions: canonicalAdditions,
  local_resolution_rows: localResolutionRows,
  subject_object_rows: subjectObjectRows,
  source_claims_mutated: false,
  participation_created: false,
  relationship_created: false,
  graph_effect: 'none'
};
writeJson(policy.paths.source_mutation_plan, mutationPlan);

console.log('Wave 16 source integration registries applied');
console.log(`  local resolutions / subject objects: ${localResolutionRows.length} / ${subjectObjectRows.length}`);
console.log(`  canonical organization rows: ${policy.baseline.canonical_organization_rows} -> ${organizationsDoc.organizations.length}`);
console.log('  source claims, participation, relationships, graph, hops, and human-permission effects: 0');
