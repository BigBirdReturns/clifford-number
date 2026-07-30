#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readJson, readJsonl, writeJson, writeJsonl } from './lib/ledger.mjs';

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
const subjectObjectDecisions = decisions.filter(row => row.disposition === 'bounded_nonidentity_object');
assert.equal(identityDecisions.length, policy.expected.identity_decisions);
assert.equal(subjectObjectDecisions.length, policy.expected.nonidentity_object_decisions);
assert.equal(identityDecisions.reduce((total, row) => total + row.claim_count, 0), policy.expected.identity_claim_references_integrated);
assert.equal(subjectObjectDecisions.reduce((total, row) => total + row.claim_count, 0), policy.expected.subject_object_claim_references_integrated);

const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const actorById = new Map(actorsDoc.actors.map(row => [row.id, row]));
const organizationById = new Map(organizationsDoc.organizations.map(row => [row.id, row]));
assert.equal(actorsDoc.actors.length, policy.baseline.canonical_actor_rows);
assert.equal(aliasesDoc.aliases.length, policy.baseline.canonical_alias_rows);
assert.ok(
  [policy.baseline.canonical_organization_rows, policy.expected.canonical_organization_rows_after]
    .includes(organizationsDoc.organizations.length),
  'unexpected canonical organization denominator'
);

const decisionById = new Map(decisions.map(row => [row.adjudication_id, row]));
assert.equal(decisionById.size, decisions.length, 'duplicate Wave 15 adjudication ID');
const overrideByDecisionId = new Map();
for (const override of policy.identity_integration_overrides ?? []) {
  assert.ok(override.source_decision_id, 'Wave 16 identity override lacks source_decision_id');
  assert.ok(!overrideByDecisionId.has(override.source_decision_id), `${override.source_decision_id}: duplicate Wave 16 identity override`);
  const decision = decisionById.get(override.source_decision_id);
  assert.ok(decision, `${override.source_decision_id}: override source decision missing`);
  assert.equal(decision.disposition, override.supersedes_wave_15_disposition, `${override.source_decision_id}: superseded disposition drift`);
  assert.equal(decision.source_case_id, override.source_case_id, `${override.source_decision_id}: override source case drift`);
  assert.equal(decision.local_subject_id, override.local_subject_id, `${override.source_decision_id}: override local subject drift`);
  assert.equal(override.correction_mode, 'append_preserving_supersession', `${override.source_decision_id}: correction mode drift`);
  assert.ok(override.same_entity_basis, `${override.source_decision_id}: same-entity basis missing`);
  const requiredReceipts = uniqueSorted(override.required_receipt_ids);
  assert.ok(requiredReceipts.length > 0, `${override.source_decision_id}: override receipt custody missing`);
  for (const receiptId of requiredReceipts) {
    assert.ok((decision.receipt_ids ?? []).includes(receiptId), `${override.source_decision_id}: required receipt ${receiptId} absent from Wave 15 decision`);
  }
  const canonicalRecord = override.canonical_kind === 'actor'
    ? actorById.get(override.canonical_id)
    : organizationById.get(override.canonical_id);
  assert.ok(canonicalRecord, `${override.source_decision_id}: override canonical target ${override.canonical_id} missing`);
  const originalLabel = decision.canonical_target?.canonical_label;
  assert.ok(originalLabel, `${override.source_decision_id}: superseded planned label missing`);
  const explicitAlias = aliasesDoc.aliases.find(alias => alias.alias === originalLabel
    && alias.canonical_id === override.canonical_id
    && alias.kind === override.canonical_kind);
  assert.ok(explicitAlias, `${override.source_decision_id}: explicit canonical alias ${JSON.stringify(originalLabel)} -> ${override.canonical_id} missing`);
  overrideByDecisionId.set(override.source_decision_id, {
    ...override,
    required_receipt_ids: requiredReceipts,
    canonical_label: canonicalRecord.label
  });
}

const plannedIdentityDecisions = identityDecisions
  .filter(row => row.disposition === 'identity_new_canonical_plan' && !overrideByDecisionId.has(row.adjudication_id));
const existingIdentityDecisions = identityDecisions
  .filter(row => row.disposition !== 'identity_new_canonical_plan' || overrideByDecisionId.has(row.adjudication_id));
assert.equal(existingIdentityDecisions.length, policy.expected.existing_identity_resolutions);
assert.equal(plannedIdentityDecisions.length, policy.expected.new_canonical_records);

const canonicalAdditions = [];
for (const decision of plannedIdentityDecisions.sort((left, right) => left.canonical_target.canonical_id.localeCompare(right.canonical_target.canonical_id))) {
  const target = decision.canonical_target;
  assert.equal(target.canonical_kind, 'organization');
  assert.ok(target.canonical_id && target.canonical_label && target.planned_kind);
  assert.ok(decision.receipt_ids.length > 0, `${decision.adjudication_id}: planned record lacks receipt custody`);
  assert.ok(!actorById.has(target.canonical_id), `${target.canonical_id}: planned organization collides with actor`);
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

const crossCorpusMapPath = 'data/research/clifford-cross-corpus-public-interest-map.json';
const crossCorpusMap = readJson(crossCorpusMapPath);
assert.equal(crossCorpusMap.schema_version, 'clifford-cross-corpus-public-interest-map@1');
assert.equal(crossCorpusMap.inventory?.canonical?.actors, actorsDoc.actors.length, 'cross-corpus actor inventory drift');
assert.ok(
  [policy.baseline.canonical_organization_rows, policy.expected.canonical_organization_rows_after]
    .includes(crossCorpusMap.inventory?.canonical?.organizations),
  'cross-corpus organization inventory outside the bounded Wave 16 transition'
);
crossCorpusMap.generated_at = policy.as_of;
crossCorpusMap.inventory.canonical.organizations = organizationsDoc.organizations.length;
writeJson(crossCorpusMapPath, crossCorpusMap);

function effectiveTarget(decision) {
  const override = overrideByDecisionId.get(decision.adjudication_id);
  if (!override) return {
    canonical_id: decision.canonical_target?.canonical_id,
    canonical_kind: decision.canonical_target?.canonical_kind,
    canonical_label: decision.canonical_target?.canonical_label,
    override: null
  };
  return {
    canonical_id: override.canonical_id,
    canonical_kind: override.canonical_kind,
    canonical_label: override.canonical_label,
    override
  };
}

const localResolutionRows = identityDecisions.map(decision => {
  const target = effectiveTarget(decision);
  assert.ok(target.canonical_id && target.canonical_kind, `${decision.adjudication_id}: effective canonical target missing`);
  const canonicalRecord = target.canonical_kind === 'actor'
    ? actorById.get(target.canonical_id)
    : organizationById.get(target.canonical_id);
  assert.ok(canonicalRecord, `${decision.adjudication_id}: effective canonical target ${target.canonical_id} missing`);
  const sourceIds = uniqueSorted(decision.receipt_ids);
  assert.ok(sourceIds.length > 0, `${decision.adjudication_id}: local resolution lacks source custody`);
  for (const receiptId of target.override?.required_receipt_ids ?? []) {
    assert.ok(sourceIds.includes(receiptId), `${decision.adjudication_id}: override source receipt ${receiptId} missing`);
  }
  return {
    schema_version: 'local-canonical-resolution@1',
    resolution_id: stableId('LOCALCANON', [policy.program_key, decision.adjudication_id, decision.source_case_id, decision.local_subject_id, target.canonical_id]),
    source_case_id: decision.source_case_id,
    local_subject_id: decision.local_subject_id,
    canonical_id: target.canonical_id,
    canonical_kind: target.canonical_kind,
    source_decision_id: decision.adjudication_id,
    source_ids: sourceIds,
    source_disposition: decision.disposition,
    integration_mode: target.override
      ? 'existing_canonical_identity_override'
      : decision.disposition === 'identity_new_canonical_plan'
        ? 'new_canonical_record'
        : 'existing_canonical_identity',
    integration_resolution_basis: target.override
      ? 'append_preserving_named_identity_supersession'
      : decision.disposition === 'identity_new_canonical_plan'
        ? 'materialized_wave_15_canonical_plan'
        : 'accepted_wave_15_identity_decision',
    integration_override_applied: Boolean(target.override),
    supersedes_wave_15_disposition: target.override?.supersedes_wave_15_disposition ?? null,
    supersedes_planned_canonical_id: target.override ? decision.canonical_target.canonical_id : null,
    same_entity_basis: target.override?.same_entity_basis ?? null,
    required_receipt_ids: target.override?.required_receipt_ids ?? [],
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
assert.equal(localResolutionRows.filter(row => row.integration_override_applied).length, overrideByDecisionId.size);
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
  identity_integration_overrides: [...overrideByDecisionId.values()].map(override => ({
    source_decision_id: override.source_decision_id,
    source_case_id: override.source_case_id,
    local_subject_id: override.local_subject_id,
    supersedes_wave_15_disposition: override.supersedes_wave_15_disposition,
    canonical_id: override.canonical_id,
    canonical_kind: override.canonical_kind,
    same_entity_basis: override.same_entity_basis,
    required_receipt_ids: override.required_receipt_ids,
    correction_mode: override.correction_mode
  })),
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
console.log(`  existing resolutions / canonical additions: ${existingIdentityDecisions.length} / ${canonicalAdditions.length}`);
console.log(`  local resolutions / subject objects: ${localResolutionRows.length} / ${subjectObjectRows.length}`);
console.log(`  identity overrides applied: ${overrideByDecisionId.size}`);
console.log(`  canonical organization rows: ${policy.baseline.canonical_organization_rows} -> ${organizationsDoc.organizations.length}`);
console.log('  source claims, participation, relationships, graph, hops, and human-permission effects: 0');
