#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entityId, legacyEntityId } from './lib/axm-id.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-bounded-hold-resolution-wave-12-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

const policy = readJson(policyPath);
const mutationPlan = readJson(policy.mutation_plan_path);
const decisions = readJsonl(policy.decision_registry_path);
const localResolutions = readJsonl(policy.local_resolution_registry_path);
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const aliases = readJson('data/canonical/aliases.json').aliases;
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(mutationPlan.schema_version, 'lake-bounded-hold-mutation-plan-wave-12@1');
assert.equal(decisions.length, policy.expected.bounded_hold_rows);
assert.equal(localResolutions.length, policy.expected.resolved_local_subjects);
assert.equal(actors.length, mutationPlan.expected_after.actor_rows, 'Wave 12 actor mutations not materialized');
assert.equal(organizations.length, mutationPlan.expected_after.organization_rows, 'Wave 12 organization mutations not materialized');
assert.equal(aliases.length, mutationPlan.expected_after.alias_rows, 'Wave 12 alias mutations not materialized');
assert.equal(participation.length, mutationPlan.before.participation_rows, 'Wave 12 changed participation rows');
assert.equal(active.entities.length, mutationPlan.expected_after.active_entities, 'Wave 12 active entity count drift');
assert.equal(active.claims.length, mutationPlan.before.active_claims, 'Wave 12 changed active claims');
assert.equal(hopGraph.edges.length, mutationPlan.before.hop_edges, 'Wave 12 changed hop edge count');

const entityByLocal = new Map(active.entities.map(row => [row.local_id, row]));
const decisionByLocal = new Map(decisions.map(row => [row.local_subject_id, row]));
const extensionRows = [];
for (const addition of [...mutationPlan.mutations.actor_additions, ...mutationPlan.mutations.organization_additions]) {
  const entity = entityByLocal.get(addition.id);
  assert.ok(entity, `${addition.id}: active AXM entity missing after Wave 12 mutation`);
  const decision = decisionByLocal.get(addition.source_local_subject_id);
  assert.ok(decision?.canonical_record_materialized, `${addition.id}: authorizing decision missing`);
  extensionRows.push({
    schema_version: 'axm-canonical-identity-extension@1',
    registry_row_type: 'entity_extension',
    registry_key: `W12-ENTITY:${addition.id}`,
    local_id: addition.id,
    canonical_kind: decision.canonical_kind,
    canonical_label: addition.label,
    source_local_subject_id: addition.source_local_subject_id,
    source_decision_id: decision.decision_id,
    source_ids: addition.source_ids,
    axm_entity_id: entity.axm_entity_id,
    legacy_provisional_entity_id: entity.legacy_provisional_entity_id,
    alias_axm_ids: entity.alias_axm_ids,
    legacy_provisional_alias_ids: entity.legacy_provisional_alias_ids,
    active_projection_extension: true,
    external_axm_gate_complete: true,
    cross_case_join_authorized: false,
    accepted_local_canonical_resolution: true,
    accepted_cross_case_identity_bridge: false,
    participation_created: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_extension_row_and_retire_or_relabel_the_canonical_record_without_deleting_this_row'
    },
    graph_effect: 'none'
  });
}
for (const addition of mutationPlan.mutations.alias_additions) {
  const entity = entityByLocal.get(addition.canonical_id);
  assert.ok(entity, `${addition.canonical_id}: Wave 12 alias target missing`);
  const currentAliasId = entityId(active.scheme.namespace, addition.alias);
  const legacyAliasId = legacyEntityId(active.scheme.namespace, addition.alias);
  assert.ok(entity.alias_axm_ids.includes(currentAliasId) || entity.axm_entity_id === currentAliasId, `${addition.alias}: current AXM alias not attached`);
  assert.ok(entity.legacy_provisional_alias_ids.includes(legacyAliasId) || entity.legacy_provisional_entity_id === legacyAliasId, `${addition.alias}: legacy AXM alias not attached`);
  const decision = decisionByLocal.get(addition.source_local_subject_id);
  extensionRows.push({
    schema_version: 'axm-canonical-identity-extension@1',
    registry_row_type: 'alias_extension',
    registry_key: `W12-ALIAS:${addition.kind}:${addition.canonical_id}:${sha256(Buffer.from(addition.alias)).slice(0, 16)}`,
    canonical_id: addition.canonical_id,
    canonical_kind: addition.kind,
    alias: addition.alias,
    source_local_subject_id: addition.source_local_subject_id,
    source_decision_id: decision?.decision_id ?? null,
    source_ids: addition.source_ids,
    axm_alias_id: currentAliasId,
    legacy_provisional_alias_id: legacyAliasId,
    active_projection_extension: true,
    external_axm_gate_complete: true,
    cross_case_join_authorized: false,
    accepted_local_canonical_resolution: true,
    accepted_cross_case_identity_bridge: false,
    participation_created: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_alias_extension_row_and_remove_the_alias_from_current_resolution_without_deleting_this_row'
    },
    graph_effect: 'none'
  });
}
extensionRows.sort((left, right) => left.registry_key.localeCompare(right.registry_key));
assert.equal(new Set(extensionRows.map(row => row.registry_key)).size, extensionRows.length);
assert.equal(extensionRows.filter(row => row.registry_row_type === 'entity_extension').length, policy.expected.new_entity_records);
assert.equal(extensionRows.filter(row => row.registry_row_type === 'alias_extension').length, mutationPlan.mutations.alias_additions.length);
writeJsonl(policy.extension_registry_path, extensionRows);

const fingerprintPaths = [
  policyPath,
  policy.source_registry_path,
  policy.decision_registry_path,
  policy.local_resolution_registry_path,
  policy.mutation_plan_path,
  policy.extension_registry_path,
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'data/canonical/aliases.json',
  'data/ledger/participation.jsonl',
  'build/axm-identity.json',
  'build/hop-graph.json'
].sort();
const inputManifest = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
const receipt = {
  schema_version: 'lake-bounded-hold-resolution-wave-12@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  counts: {
    bounded_hold_rows: decisions.length,
    source_rows: readJsonl(policy.source_registry_path).length,
    accepted_local_canonical_resolutions: localResolutions.length,
    actor_records_added: mutationPlan.mutations.actor_additions.length,
    organization_records_added: mutationPlan.mutations.organization_additions.length,
    aliases_added: mutationPlan.mutations.alias_additions.length,
    extension_registry_rows: extensionRows.length,
    active_entities_before: mutationPlan.before.active_entities,
    active_entities_after: active.entities.length,
    active_claims_before: mutationPlan.before.active_claims,
    active_claims_after: active.claims.length,
    participation_rows_added: 0,
    accepted_cross_case_identity_bridges: 0,
    graph_edge_delta: hopGraph.edges.length - mutationPlan.before.hop_edges
  },
  canonical_mutations_applied: true,
  local_resolution_registry_built: true,
  identity_extension_registry_built: true,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.receipt_path, receipt);
console.log('canonical identity extension Wave 12 built');
console.log(`  entity / alias extension rows: ${policy.expected.new_entity_records} / ${mutationPlan.mutations.alias_additions.length}`);
console.log(`  active entities / claims: ${active.entities.length} / ${active.claims.length}`);
console.log('  cross-case bridges, participation, relationship, graph, and hop effects: 0');
