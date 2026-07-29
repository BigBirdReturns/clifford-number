#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }

const validation = spawnSync(process.execPath, ['tools/validate-lake-bounded-hold-resolution-wave-12.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-bounded-hold-resolution-wave-12-policy.json');
const sources = readJsonl(policy.source_registry_path);
const decisions = readJsonl(policy.decision_registry_path);
const resolutions = readJsonl(policy.local_resolution_registry_path);
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
const surfaceGraph = readJson('build/surface-graph.json');

assert.equal(sources.length, 14);
assert.equal(decisions.length, 12);
assert.equal(resolutions.length, 12);
assert.equal(new Set(decisions.map(row => row.local_subject_id)).size, 12);
assert.equal(new Set(resolutions.map(row => row.local_subject_id)).size, 12);
assert.ok(sources.every(row => row.publicly_inspectable === true));
assert.ok(sources.every(row => row.repository_path || row.url));
assert.ok(decisions.every(row => row.resolution_status === 'accepted_local_to_canonical_resolution'));
assert.ok(decisions.every(row => row.explicit_same_entity_assertion === true));
assert.ok(decisions.every(row => row.unambiguous_target === true));
assert.ok(decisions.every(row => row.accepted_local_canonical_resolution === true));
assert.ok(decisions.every(row => row.accepted_cross_case_identity_bridge === false));
assert.ok(decisions.every(row => row.source_records_merged === false));
assert.ok(decisions.every(row => row.relationship_created === false));
assert.ok(decisions.every(row => row.participation_created === false));
assert.ok(decisions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(decisions.every(row => row.reversibility.mode === 'append_preserving_supersession'));
assert.ok(decisions.every(row => row.graph_effect === 'none'));
assert.ok(resolutions.every(row => row.status === 'accepted_graph_inert_local_resolution'));
assert.ok(resolutions.every(row => row.entities_merged === false));
assert.ok(resolutions.every(row => row.relationship_created === false));
assert.ok(resolutions.every(row => row.participation_created === false));
assert.ok(resolutions.every(row => row.accepted_cross_case_identity_bridge === false));
assert.ok(resolutions.every(row => row.review_dependency.required_to_decide === false));
assert.ok(resolutions.every(row => row.graph_effect === 'none'));

const resolutionByLocal = new Map(resolutions.map(row => [row.local_subject_id, row]));
assert.equal(resolutionByLocal.get('org-city-of-arcadia').canonical_id, 'city-of-arcadia');
assert.equal(resolutionByLocal.get('org-city-arcadia').canonical_id, 'city-of-arcadia');
assert.equal(resolutionByLocal.get('adl').canonical_id, 'anti-defamation-league');
assert.equal(resolutionByLocal.get('p-ben-zhang-atc').canonical_id, 'ben-zhang');
assert.equal(resolutionByLocal.get('p-erik-wahl-arcadia').canonical_id, 'erik-wahl');

const actorAdditions = mutationPlan.mutations.actor_additions;
const organizationAdditions = mutationPlan.mutations.organization_additions;
const aliasAdditions = mutationPlan.mutations.alias_additions;
assert.equal(actorAdditions.length, 2);
assert.equal(organizationAdditions.length, 9);
assert.equal(aliasAdditions.length, 7);
assert.equal(actors.length, mutationPlan.before.actor_rows + 2);
assert.equal(organizations.length, mutationPlan.before.organization_rows + 9);
assert.equal(aliases.length, mutationPlan.before.alias_rows + 7);
assert.equal(participation.length, mutationPlan.before.participation_rows);
assert.equal(active.entities.length, mutationPlan.before.active_entities + 11);
assert.equal(active.claims.length, mutationPlan.before.active_claims);
assert.equal(hopGraph.edges.length, mutationPlan.before.hop_edges);
assert.equal(mutationPlan.mutations.participation_additions.length, 0);

const extensionEntities = extension.filter(row => row.registry_row_type === 'entity_extension');
const extensionAliases = extension.filter(row => row.registry_row_type === 'alias_extension');
assert.equal(extensionEntities.length, 11);
assert.equal(extensionAliases.length, 7);
assert.ok(extension.every(row => row.active_projection_extension === true));
assert.ok(extension.every(row => row.cross_case_join_authorized === false));
assert.ok(extension.every(row => row.accepted_local_canonical_resolution === true));
assert.ok(extension.every(row => row.accepted_cross_case_identity_bridge === false));
assert.ok(extension.every(row => row.participation_created === false));
assert.ok(extension.every(row => row.review_dependency.required_to_decide === false));
assert.ok(extension.every(row => row.graph_effect === 'none'));

assert.equal((surfaceGraph.organizations ?? []).some(row => row.id === 'adl'), false);
const adl = surfaceGraph.organizations.find(row => row.id === 'anti-defamation-league');
assert.ok(adl);
assert.ok(adl.legacy_local_ids.includes('adl'));
assert.ok(surfaceGraph.aliases.some(row => row.alias === 'ADL' && row.canonical_id === 'anti-defamation-league'));
assert.ok(surfaceGraph.local_canonical_resolutions.some(row => row.local_subject_id === 'adl' && row.canonical_id === 'anti-defamation-league'));

assert.equal(receipt.counts.bounded_hold_rows, 12);
assert.equal(receipt.counts.source_rows, 14);
assert.equal(receipt.counts.accepted_local_canonical_resolutions, 12);
assert.equal(receipt.counts.actor_records_added, 2);
assert.equal(receipt.counts.organization_records_added, 9);
assert.equal(receipt.counts.aliases_added, 7);
assert.equal(receipt.counts.participation_rows_added, 0);
assert.equal(receipt.counts.accepted_cross_case_identity_bridges, 0);
assert.equal(receipt.counts.graph_edge_delta, 0);
assert.equal(receipt.decisions_requiring_human_permission, 0);

assert.equal(reconciliation.completion.complete_hold_denominator_resolved, true);
assert.equal(reconciliation.completion.every_source_row_publicly_inspectable, true);
assert.equal(reconciliation.completion.every_local_resolution_explicit_and_reversible, true);
assert.equal(reconciliation.completion.canonical_mutations_applied, true);
assert.equal(reconciliation.completion.local_resolution_registry_built, true);
assert.equal(reconciliation.completion.identity_extension_registry_built, true);
assert.equal(reconciliation.completion.participation_payload_unchanged, true);
assert.equal(reconciliation.completion.active_claim_payload_unchanged, true);
assert.equal(reconciliation.completion.hop_edge_payload_unchanged, true);
assert.equal(reconciliation.completion.accepted_local_canonical_resolutions, 12);
assert.equal(reconciliation.completion.accepted_cross_case_identity_bridges, 0);
assert.equal(reconciliation.completion.cross_case_graph_join_authorized, false);
assert.equal(reconciliation.completion.cross_case_hop_creation_authorized, false);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);

assert.equal(policy.boundaries.local_canonical_resolution_is_cross_case_bridge, false);
assert.equal(policy.boundaries.local_canonical_resolution_creates_relationship, false);
assert.equal(policy.boundaries.local_canonical_resolution_creates_participation, false);
assert.equal(policy.boundaries.local_canonical_resolution_creates_hop, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log('lake-bounded-hold-resolution-wave-12.test: OK (12 holds resolved, 11 canonical records, 7 aliases, 0 graph/hop deltas)');
