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

const validation = spawnSync(process.execPath, ['tools/validate-lake-canonical-adjudication-wave-11.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-canonical-adjudication-wave-11-policy.json');
const decisions = readJsonl(policy.decision_registry_path);
const mutationPlan = readJson(policy.mutation_plan_path);
const extension = readJsonl(policy.extension_registry_path);
const receipt = readJson(policy.receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const aliases = readJson('data/canonical/aliases.json').aliases;
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(decisions.length, 67);
assert.equal(new Set(decisions.map(row => row.adjudication_id)).size, 67);
assert.ok(decisions.some(row => row.materialization_authorized), 'Wave 11 must materialize an evidence-sufficient subset');
assert.ok(decisions.some(row => !row.materialization_authorized), 'Wave 11 must preserve bounded refusals');
assert.ok(decisions.some(row => row.adjudication_status === 'reroute_nonidentity'), 'Wave 11 must correct nonidentity subjects');
assert.ok(decisions.some(row => row.adjudication_status === 'candidate_cluster_conflict' || row.adjudication_status === 'bounded_hold'), 'Wave 11 must retain collision or bounded-hold controls');
assert.ok(decisions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(decisions.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(decisions.every(row => row.accepted_identity_bridge === false));
assert.ok(decisions.every(row => row.participation_created === false));
assert.ok(decisions.every(row => row.relationship_created === false));
assert.ok(decisions.every(row => row.cross_case_graph_join_authorized === false));
assert.ok(decisions.every(row => row.cross_case_hop_creation_authorized === false));
assert.ok(decisions.every(row => row.graph_effect === 'none'));

const actorAdditions = mutationPlan.mutations.actor_additions;
const organizationAdditions = mutationPlan.mutations.organization_additions;
const aliasAdditions = mutationPlan.mutations.alias_additions;
assert.ok(actorAdditions.length + organizationAdditions.length > 0);
assert.equal(actors.length, mutationPlan.before.actor_rows + actorAdditions.length);
assert.equal(organizations.length, mutationPlan.before.organization_rows + organizationAdditions.length);
assert.equal(aliases.length, mutationPlan.before.alias_rows + aliasAdditions.length);
assert.equal(participation.length, mutationPlan.before.participation_rows);
assert.equal(active.entities.length, mutationPlan.before.active_entities + actorAdditions.length + organizationAdditions.length);
assert.equal(active.claims.length, mutationPlan.before.active_claims);
assert.equal(hopGraph.edges.length, mutationPlan.before.hop_edges);
assert.equal(mutationPlan.mutations.participation_additions.length, 0);

const extensionEntities = extension.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliases = extension.filter(row => row.registry_row_type === 'alias_extension');
assert.equal(extensionEntities.length, actorAdditions.length + organizationAdditions.length);
assert.equal(extensionAliases.length, aliasAdditions.length);
assert.ok(extension.every(row => row.active_projection_extension === true));
assert.ok(extension.every(row => row.cross_case_join_authorized === false));
assert.ok(extension.every(row => row.accepted_identity_bridge === false));
assert.ok(extension.every(row => row.participation_created === false));
assert.ok(extension.every(row => row.review_dependency.required_to_decide === false));
assert.ok(extension.every(row => row.graph_effect === 'none'));

assert.equal(receipt.counts.candidate_rows, 67);
assert.equal(receipt.counts.actor_records_added, actorAdditions.length);
assert.equal(receipt.counts.organization_records_added, organizationAdditions.length);
assert.equal(receipt.counts.aliases_added, aliasAdditions.length);
assert.equal(receipt.counts.participation_rows_added, 0);
assert.equal(receipt.counts.accepted_identity_bridges, 0);
assert.equal(receipt.counts.graph_edge_delta, 0);
assert.equal(receipt.decisions_requiring_human_permission, 0);

assert.equal(reconciliation.completion.candidate_denominator_adjudicated, true);
assert.equal(reconciliation.completion.authorized_canonical_mutations_applied, true);
assert.equal(reconciliation.completion.identity_extension_registry_built, true);
assert.equal(reconciliation.completion.participation_payload_unchanged, true);
assert.equal(reconciliation.completion.active_claim_payload_unchanged, true);
assert.equal(reconciliation.completion.hop_edge_payload_unchanged, true);
assert.equal(reconciliation.completion.accepted_identity_bridges, 0);
assert.equal(reconciliation.completion.automatic_cross_case_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

assert.equal(policy.boundaries.canonical_record_is_identity_bridge, false);
assert.equal(policy.boundaries.canonical_mutation_creates_participation, false);
assert.equal(policy.boundaries.canonical_mutation_creates_relationship, false);
assert.equal(policy.boundaries.canonical_mutation_creates_hop, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-canonical-adjudication-wave-11.test: OK (${decisions.length} decisions, ${actorAdditions.length} actors, ${organizationAdditions.length} organizations, ${aliasAdditions.length} aliases, 0 graph/hop deltas)`);
