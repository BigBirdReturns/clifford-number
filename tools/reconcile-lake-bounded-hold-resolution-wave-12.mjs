#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}
function stableDigest(value) { return sha256(Buffer.from(JSON.stringify(canonical(value)))); }

const policy = readJson(policyPath);
const sources = readJsonl(policy.source_registry_path);
const decisions = readJsonl(policy.decision_registry_path);
const localResolutions = readJsonl(policy.local_resolution_registry_path);
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

assert.equal(decisions.length, policy.expected.bounded_hold_rows);
assert.equal(localResolutions.length, policy.expected.resolved_local_subjects);
assert.equal(actors.length, mutationPlan.expected_after.actor_rows);
assert.equal(organizations.length, mutationPlan.expected_after.organization_rows);
assert.equal(aliases.length, mutationPlan.expected_after.alias_rows);
assert.equal(participation.length, mutationPlan.before.participation_rows);
assert.equal(active.entities.length, mutationPlan.expected_after.active_entities);
assert.equal(active.claims.length, mutationPlan.before.active_claims);
assert.equal(stableDigest(participation), mutationPlan.before.participation_digest_sha256, 'Wave 12 participation payload changed');
assert.equal(stableDigest(active.claims), mutationPlan.before.active_claim_digest_sha256, 'Wave 12 active claim payload changed');
assert.equal(stableDigest(hopGraph.edges), mutationPlan.before.hop_edge_digest_sha256, 'Wave 12 hop edge payload changed');
assert.equal(stableDigest(hopGraph.rejected_hop_surfaces), mutationPlan.before.hop_rejected_surface_digest_sha256, 'Wave 12 rejected-surface payload changed');
assert.equal(stableDigest(hopGraph.rejected_hop_pairs), mutationPlan.before.hop_rejected_pair_digest_sha256, 'Wave 12 rejected-pair payload changed');

const actorById = new Map(actors.map(row => [row.id, row]));
const organizationById = new Map(organizations.map(row => [row.id, row]));
const aliasSet = new Set(aliases.map(row => `${row.kind}:${row.canonical_id}:${row.alias}`));
for (const row of mutationPlan.mutations.actor_additions) assert.deepEqual(actorById.get(row.id), row, `${row.id}: Wave 12 actor mutation drift`);
for (const row of mutationPlan.mutations.organization_additions) assert.deepEqual(organizationById.get(row.id), row, `${row.id}: Wave 12 organization mutation drift`);
for (const row of mutationPlan.mutations.alias_additions) assert.ok(aliasSet.has(`${row.kind}:${row.canonical_id}:${row.alias}`), `${row.alias}: Wave 12 alias missing`);

const resolutionByLocal = new Map(localResolutions.map(row => [row.local_subject_id, row]));
for (const decision of decisions) {
  const row = resolutionByLocal.get(decision.local_subject_id);
  assert.ok(row, `${decision.local_subject_id}: local resolution missing`);
  assert.equal(row.canonical_id, decision.canonical_id);
  assert.equal(row.source_decision_id, decision.decision_id);
}
assert.equal(resolutionByLocal.get('org-city-of-arcadia')?.canonical_id, 'city-of-arcadia');
assert.equal(resolutionByLocal.get('org-city-arcadia')?.canonical_id, 'city-of-arcadia');

const extensionEntityRows = extensionRows.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliasRows = extensionRows.filter(row => row.registry_row_type === 'alias_extension');
assert.equal(extensionEntityRows.length, policy.expected.new_entity_records);
assert.equal(extensionAliasRows.length, mutationPlan.mutations.alias_additions.length);
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
  policy.source_registry_path,
  policy.decision_registry_path,
  policy.local_resolution_registry_path,
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
assert.ok(sourceControlStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true), 'Wave 12 source controls are not authoritative-reachable');
for (const relative of [policy.source_registry_path, policy.decision_registry_path, policy.local_resolution_registry_path, policy.extension_registry_path]) {
  assert.equal(fileByPath.get(relative)?.index_file, true, `${relative}: expected index surface`);
}
assert.equal(fileByPath.get(policy.projection_path)?.generated, true);
assert.equal(fileByPath.get(policy.projection_path)?.index_file, true);

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function observe(idKey, idValue, sourcePath, projectionPath) {
  const object = objectByKey.get(`${idKey}:${idValue}`);
  assert.ok(object, `${idKey}:${idValue}: lake object missing`);
  assert.equal(object.source_occurrence, true);
  assert.equal(object.projection_occurrence, true);
  assert.equal(object.indexed, true);
  assert.ok(object.occurrences.some(item => item.path === sourcePath && item.generated === false), `${idKey}:${idValue}: source occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === projectionPath && item.generated === true), `${idKey}:${idValue}: projection occurrence missing`);
  return object;
}
let decisionIdsObserved = 0;
for (const row of decisions) {
  observe('decision_id', row.decision_id, policy.decision_registry_path, policy.projection_path);
  decisionIdsObserved += 1;
}
let resolutionIdsObserved = 0;
for (const row of localResolutions) {
  observe('resolution_id', row.resolution_id, policy.local_resolution_registry_path, policy.projection_path);
  resolutionIdsObserved += 1;
}
let extensionEntityIdsObserved = 0;
for (const row of extensionEntityRows) {
  observe('axm_entity_id', row.axm_entity_id, policy.extension_registry_path, 'build/axm-identity.json');
  observe('legacy_provisional_entity_id', row.legacy_provisional_entity_id, policy.extension_registry_path, 'build/axm-identity.json');
  extensionEntityIdsObserved += 1;
}

const forbiddenTokens = [...decisions.map(row => row.decision_id), ...localResolutions.map(row => row.resolution_id), ...extensionRows.map(row => row.registry_key)];
const hopGraphText = JSON.stringify(hopGraph);
assert.ok(forbiddenTokens.every(token => !hopGraphText.includes(token)), 'Wave 12 control token leaked into hop graph');

const fingerprintPaths = [
  policyPath,
  policy.source_registry_path,
  policy.decision_registry_path,
  policy.local_resolution_registry_path,
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
const reconciliation = {
  schema_version: 'lake-bounded-hold-resolution-wave-12-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: mutationPlan.before,
  after: {
    source_rows: sources.length,
    decision_rows: decisions.length,
    local_resolution_rows: localResolutions.length,
    actor_rows: actors.length,
    organization_rows: organizations.length,
    alias_rows: aliases.length,
    participation_rows: participation.length,
    active_entities: active.entities.length,
    active_claims: active.claims.length,
    hop_edges: hopGraph.edges.length,
    actor_records_added: mutationPlan.mutations.actor_additions.length,
    organization_records_added: mutationPlan.mutations.organization_additions.length,
    aliases_added: mutationPlan.mutations.alias_additions.length,
    extension_entity_rows: extensionEntityRows.length,
    extension_alias_rows: extensionAliasRows.length,
    decision_ids_source_projection_and_index_observed: decisionIdsObserved,
    resolution_ids_source_projection_and_index_observed: resolutionIdsObserved,
    extension_entity_ids_source_projection_and_index_observed: extensionEntityIdsObserved,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    source_control_states: sourceControlStates,
    accepted_local_canonical_resolutions: localResolutions.length,
    accepted_cross_case_identity_bridges: 0,
    participation_rows_added: 0,
    active_claim_delta: active.claims.length - mutationPlan.before.active_claims,
    graph_edge_delta: hopGraph.edges.length - mutationPlan.before.hop_edges,
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
    resolved_holds: localResolutions.length,
    accepted_cross_case_identity_bridges: 0,
    graph_effects_created: 0
  },
  decisions: [
    {
      decision_key: 'W12-RECONCILE-HOLD-DENOMINATOR',
      judgment: 'all_twelve_wave11_holds_have_publicly_inspectable_source_custody_and_explicit_local_to_canonical_resolutions',
      action: 'retain_every_resolution_source_record_and_correction_route',
      evidence_count: sources.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W12-RECONCILE-CANONICAL-EXTENSION',
      judgment: 'eleven_new_canonical_records_and_their_aliases_extend_active_identity_without_changing_participation_claims',
      action: 'retain_the_wave12_extension_registry_and_all_predecessor_resolution',
      evidence_count: extensionRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W12-RECONCILE-GRAPH-GATE',
      judgment: 'local_to_canonical_resolution_does_not_create_cross_case_relationship_graph_or_hop_authority',
      action: 'keep_all_cross_case_graph_and_hop_authorizations_false',
      evidence_count: hopGraph.edges.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    complete_hold_denominator_resolved: decisions.length === policy.expected.bounded_hold_rows,
    every_source_row_publicly_inspectable: sources.every(row => row.publicly_inspectable === true),
    every_local_resolution_explicit_and_reversible: localResolutions.every(row => row.explicit_same_entity_assertion && row.reversibility.mode === 'append_preserving_supersession'),
    canonical_mutations_applied: true,
    local_resolution_registry_built: true,
    identity_extension_registry_built: true,
    every_decision_id_source_projection_and_index_observed: decisionIdsObserved === decisions.length,
    every_resolution_id_source_projection_and_index_observed: resolutionIdsObserved === localResolutions.length,
    every_extension_entity_id_source_projection_and_index_observed: extensionEntityIdsObserved === extensionEntityRows.length,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    participation_payload_unchanged: true,
    active_claim_payload_unchanged: true,
    hop_edge_payload_unchanged: true,
    accepted_local_canonical_resolutions: localResolutions.length,
    accepted_cross_case_identity_bridges: 0,
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
const report = `# Bounded-hold resolution Wave 12 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nWave 11 holds resolved:                 ${decisions.length}\nsource records:                         ${sources.length}\nlocal/canonical resolutions:            ${localResolutions.length}\nactor records added:                    ${mutationPlan.mutations.actor_additions.length}\norganization records added:             ${mutationPlan.mutations.organization_additions.length}\naliases added:                           ${mutationPlan.mutations.alias_additions.length}\nextension entity / alias rows:          ${extensionEntityRows.length} / ${extensionAliasRows.length}\ndecision IDs source/projected/indexed:   ${decisionIdsObserved}\nresolution IDs source/projected/indexed: ${resolutionIdsObserved}\nextension entity IDs observed:          ${extensionEntityIdsObserved}\nactive entities before / after:          ${mutationPlan.before.active_entities} / ${active.entities.length}\nactive claims before / after:            ${mutationPlan.before.active_claims} / ${active.claims.length}\nparticipation rows added:                0\nhop edge delta:                          0\naccepted cross-case identity bridges:    0\nhuman-permission dependencies:           0\n\`\`\`\n\n## Judgment\n\nThe twelve former holds are now explicit, source-custodied local-to-canonical resolutions. The City of Arcadia's two case-local identifiers converge on one municipal record. First-party company sources cure the five private-only identity records without converting Crucible selection into performance or acceptance. No relationship, participation, claim, graph edge, or hop changed.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);
console.log('bounded-hold resolution Wave 12 reconciled');
console.log(`  decisions / local resolutions / sources: ${decisions.length} / ${localResolutions.length} / ${sources.length}`);
console.log(`  actors / organizations / aliases added: ${mutationPlan.mutations.actor_additions.length} / ${mutationPlan.mutations.organization_additions.length} / ${mutationPlan.mutations.alias_additions.length}`);
console.log('  cross-case bridge, claim, participation, relationship, graph, and hop deltas: 0');
