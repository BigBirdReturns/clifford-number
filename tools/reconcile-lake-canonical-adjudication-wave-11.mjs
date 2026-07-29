#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-adjudication-wave-11-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

const policy = readJson(policyPath);
const decisions = readJsonl(policy.decision_registry_path);
const mutationPlan = readJson(policy.mutation_plan_path);
const extensionRows = readJsonl(policy.extension_registry_path);
const receipt = readJson(policy.receipt_path);
const projection = readJson(policy.projection_path);
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const aliases = readJson('data/canonical/aliases.json').aliases;
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');

assert.equal(decisions.length, policy.expected.candidate_rows);
assert.equal(actors.length, mutationPlan.expected_after.actor_rows);
assert.equal(organizations.length, mutationPlan.expected_after.organization_rows);
assert.equal(aliases.length, mutationPlan.expected_after.alias_rows);
assert.equal(participation.length, mutationPlan.before.participation_rows);
assert.equal(active.entities.length, mutationPlan.expected_after.active_entities);
assert.equal(active.claims.length, mutationPlan.before.active_claims);
assert.equal(stableDigest(participation), mutationPlan.before.participation_digest_sha256, 'Wave 11 participation payload changed');
assert.equal(stableDigest(active.claims), mutationPlan.before.active_claim_digest_sha256, 'Wave 11 active claim payload changed');
assert.equal(stableDigest(hopGraph.edges), mutationPlan.before.hop_edge_digest_sha256, 'Wave 11 hop edge payload changed');
assert.equal(stableDigest(hopGraph.rejected_hop_surfaces), mutationPlan.before.hop_rejected_surface_digest_sha256, 'Wave 11 rejected-surface payload changed');
assert.equal(stableDigest(hopGraph.rejected_hop_pairs), mutationPlan.before.hop_rejected_pair_digest_sha256, 'Wave 11 rejected-pair payload changed');

const actorById = new Map(actors.map(row => [row.id, row]));
const organizationById = new Map(organizations.map(row => [row.id, row]));
const aliasKey = row => `${row.kind}:${row.canonical_id}:${row.alias}`;
const aliasSet = new Set(aliases.map(aliasKey));
for (const row of mutationPlan.mutations.actor_additions) assert.deepEqual(actorById.get(row.id), row, `${row.id}: materialized actor differs from mutation plan`);
for (const row of mutationPlan.mutations.organization_additions) assert.deepEqual(organizationById.get(row.id), row, `${row.id}: materialized organization differs from mutation plan`);
for (const row of mutationPlan.mutations.alias_additions) assert.ok(aliasSet.has(aliasKey(row)), `${row.alias}: materialized alias missing`);

const extensionEntityRows = extensionRows.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliasRows = extensionRows.filter(row => row.registry_row_type === 'alias_extension');
assert.equal(extensionEntityRows.length, mutationPlan.mutations.actor_additions.length + mutationPlan.mutations.organization_additions.length);
assert.equal(extensionAliasRows.length, mutationPlan.mutations.alias_additions.length);
assert.equal(new Set(extensionRows.map(row => row.registry_key)).size, extensionRows.length);

const activeByLocal = new Map(active.entities.map(row => [row.local_id, row]));
for (const row of extensionEntityRows) {
  const entity = activeByLocal.get(row.local_id);
  assert.ok(entity, `${row.local_id}: active identity extension missing`);
  assert.equal(entity.axm_entity_id, row.axm_entity_id);
  assert.equal(entity.legacy_provisional_entity_id, row.legacy_provisional_entity_id);
  assert.deepEqual(entity.alias_axm_ids, row.alias_axm_ids);
  assert.deepEqual(entity.legacy_provisional_alias_ids, row.legacy_provisional_alias_ids);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourceControlPaths = [
  policy.decision_registry_path,
  policy.mutation_plan_path,
  policy.extension_registry_path,
  policy.receipt_path
];
const sourceControlStates = sourceControlPaths.map(relative => {
  const row = fileByPath.get(relative);
  return {
    path: relative,
    present: Boolean(row),
    generated: row?.generated ?? null,
    index_file: row?.index_file ?? false,
    authoritative_reachable: row?.authoritative_reachable ?? false,
    public_reachable: row?.public_reachable ?? false
  };
});
assert.ok(sourceControlStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true), 'Wave 11 source controls are not authoritative-reachable');
assert.equal(fileByPath.get(policy.decision_registry_path)?.index_file, true, 'Wave 11 decision registry is not an index surface');
assert.equal(fileByPath.get(policy.extension_registry_path)?.index_file, true, 'Wave 11 extension registry is not an index surface');
assert.equal(fileByPath.get(policy.projection_path)?.generated, true, 'Wave 11 projection is not generated');
assert.equal(fileByPath.get(policy.projection_path)?.index_file, true, 'Wave 11 projection is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let adjudicationIdsObserved = 0;
for (const row of decisions) {
  const object = objectByKey.get(`adjudication_id:${row.adjudication_id}`);
  assert.ok(object, `${row.adjudication_id}: lake object missing`);
  assert.equal(object.source_occurrence, true);
  assert.equal(object.projection_occurrence, true);
  assert.equal(object.indexed, true);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false));
  assert.ok(object.occurrences.some(item => item.path === policy.projection_path && item.generated === true));
  adjudicationIdsObserved += 1;
}

let extensionEntityIdsObserved = 0;
for (const row of extensionEntityRows) {
  const current = objectByKey.get(`axm_entity_id:${row.axm_entity_id}`);
  const legacy = objectByKey.get(`legacy_provisional_entity_id:${row.legacy_provisional_entity_id}`);
  assert.ok(current && legacy, `${row.local_id}: extension AXM objects missing`);
  for (const object of [current, legacy]) {
    assert.equal(object.source_occurrence, true);
    assert.equal(object.projection_occurrence, true);
    assert.equal(object.indexed, true);
  }
  assert.ok(current.occurrences.some(item => item.path === policy.extension_registry_path && item.generated === false));
  assert.ok(current.occurrences.some(item => item.path === 'build/axm-identity.json' && item.generated === true));
  extensionEntityIdsObserved += 1;
}

const routingTokens = [...decisions.map(row => row.adjudication_id), ...extensionRows.map(row => row.registry_key)];
const hopGraphText = JSON.stringify(hopGraph);
assert.ok(routingTokens.every(token => !hopGraphText.includes(token)), 'Wave 11 decision or extension token leaked into hop graph');

const fingerprintPaths = [
  policyPath,
  policy.decision_registry_path,
  policy.mutation_plan_path,
  policy.extension_registry_path,
  policy.receipt_path,
  policy.projection_path,
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'data/canonical/aliases.json',
  'data/ledger/participation.jsonl',
  'build/axm-identity.json',
  'build/hop-graph.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json'
].sort();
const inputManifest = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const statusCounts = {};
for (const row of decisions) statusCounts[row.adjudication_status] = (statusCounts[row.adjudication_status] ?? 0) + 1;
const reconciliation = {
  schema_version: 'lake-canonical-adjudication-wave-11-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: mutationPlan.before,
  after: {
    actor_rows: actors.length,
    organization_rows: organizations.length,
    alias_rows: aliases.length,
    participation_rows: participation.length,
    active_entities: active.entities.length,
    active_claims: active.claims.length,
    hop_edges: hopGraph.edges.length,
    decision_rows: decisions.length,
    decision_status_counts: Object.fromEntries(Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right))),
    actor_records_added: mutationPlan.mutations.actor_additions.length,
    organization_records_added: mutationPlan.mutations.organization_additions.length,
    aliases_added: mutationPlan.mutations.alias_additions.length,
    nonidentity_reroutes: mutationPlan.mutations.nonidentity_reroutes.length,
    extension_entity_rows: extensionEntityRows.length,
    extension_alias_rows: extensionAliasRows.length,
    adjudication_ids_source_projection_and_index_observed: adjudicationIdsObserved,
    extension_entity_ids_source_projection_and_index_observed: extensionEntityIdsObserved,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    source_control_states: sourceControlStates,
    accepted_identity_bridges: 0,
    participation_rows_added: 0,
    graph_edge_delta: hopGraph.edges.length - mutationPlan.before.hop_edges,
    active_claim_delta: active.claims.length - mutationPlan.before.active_claims,
    global_machine_ids: summary.counts.distinct_machine_ids,
    unindexed_machine_ids: summary.counts.unindexed_machine_ids,
    exact_orphan_evidence_files: summary.counts.exact_orphan_evidence_files
  },
  deltas: {
    actor_rows: actors.length - mutationPlan.before.actor_rows,
    organization_rows: organizations.length - mutationPlan.before.organization_rows,
    alias_rows: aliases.length - mutationPlan.before.alias_rows,
    active_entities: active.entities.length - mutationPlan.before.active_entities,
    active_claims: active.claims.length - mutationPlan.before.active_claims,
    participation_rows: participation.length - mutationPlan.before.participation_rows,
    hop_edges: hopGraph.edges.length - mutationPlan.before.hop_edges,
    accepted_identity_bridges: 0,
    graph_effects_created: 0
  },
  decisions: [
    {
      decision_key: 'W11-RECONCILE-CANONICAL-MUTATIONS',
      judgment: 'the_unambiguous_source_custodied_public_subset_was_materialized_and_every_other_candidate_retains_a_named_refusal_or_reroute',
      action: 'retain_new_records_aliases_decisions_and_refusals_as_append_preserving_registry_state',
      evidence_count: decisions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W11-RECONCILE-IDENTITY-EXTENSION',
      judgment: 'new_canonical_records_extend_active_axm_identity_without_changing_any_participation_claim',
      action: 'retain_the_extension_registry_and_legacy_predecessor_resolution',
      evidence_count: extensionRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W11-RECONCILE-GRAPH-GATE',
      judgment: 'canonical_registry_expansion_does_not_create_relationships_graph_edges_or_hops',
      action: 'keep_all_cross_case_graph_and_hop_authorizations_false',
      evidence_count: hopGraph.edges.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    candidate_denominator_adjudicated: decisions.length === policy.expected.candidate_rows,
    authorized_canonical_mutations_applied: true,
    every_refusal_or_reroute_preserved: decisions.every(row => row.materialization_authorized || row.counterevidence.length > 0),
    identity_extension_registry_built: true,
    every_adjudication_id_source_projection_and_index_observed: adjudicationIdsObserved === decisions.length,
    every_extension_entity_id_source_projection_and_index_observed: extensionEntityIdsObserved === extensionEntityRows.length,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    participation_payload_unchanged: true,
    active_claim_payload_unchanged: true,
    hop_edge_payload_unchanged: true,
    accepted_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

writeJson(policy.reconciliation_path, reconciliation);
const report = `# Canonical acquisition adjudication Wave 11 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\ncandidates adjudicated:                 ${decisions.length}\nactor records added:                    ${mutationPlan.mutations.actor_additions.length}\norganization records added:             ${mutationPlan.mutations.organization_additions.length}\naliases added:                           ${mutationPlan.mutations.alias_additions.length}\nnonidentity reroutes:                    ${mutationPlan.mutations.nonidentity_reroutes.length}\nextension entity / alias rows:          ${extensionEntityRows.length} / ${extensionAliasRows.length}\nadjudication IDs source/projected/indexed:${adjudicationIdsObserved}\nextension entity IDs observed:          ${extensionEntityIdsObserved}\nactive entities before / after:          ${mutationPlan.before.active_entities} / ${active.entities.length}\nactive claims before / after:            ${mutationPlan.before.active_claims} / ${active.claims.length}\nparticipation rows added:                0\nhop edge delta:                          0\naccepted identity bridges:               0\nhuman-permission dependencies:           0\n\`\`\`\n\n## Judgment\n\nThe canonical registry now contains the evidence-sufficient, unambiguous subset. Every held, conflicting, private-only, contextual, acronym-only, or nonidentity candidate remains an explicit decision rather than disappearing. The AXM identity layer gained resolvable entities and aliases only; its participation claims and the hop graph are unchanged.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('canonical acquisition adjudication Wave 11 reconciled');
console.log(`  actors / organizations / aliases added: ${mutationPlan.mutations.actor_additions.length} / ${mutationPlan.mutations.organization_additions.length} / ${mutationPlan.mutations.alias_additions.length}`);
console.log(`  adjudication IDs observed: ${adjudicationIdsObserved}/${decisions.length}`);
console.log(`  active entity delta: ${active.entities.length - mutationPlan.before.active_entities}`);
console.log('  claim, participation, relationship, graph, and hop deltas: 0');
