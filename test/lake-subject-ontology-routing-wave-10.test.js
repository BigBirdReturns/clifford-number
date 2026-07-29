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

const validation = spawnSync(process.execPath, ['tools/validate-lake-subject-ontology-routing-wave-10.mjs'], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stdout || '');
  process.stderr.write(validation.stderr || '');
  process.exit(validation.status ?? 1);
}

const policy = readJson('data/project/lake-subject-ontology-routing-wave-10-policy.json');
const routing = readJsonl(policy.routing_registry_path);
const canonical = readJsonl(policy.canonical_acquisition_queue_path);
const noncanonical = readJsonl(policy.noncanonical_routing_registry_path);
const projection = readJson(policy.projection_path);
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const hopGraph = readJson('build/hop-graph.json');

assert.equal(routing.length, 106);
assert.equal(canonical.length + noncanonical.length, 106);
assert.equal(new Set(routing.map(row => row.routing_id)).size, 106);
assert.equal(new Set(canonical.map(row => row.acquisition_id)).size, canonical.length);
assert.equal(new Set(noncanonical.map(row => row.route_id)).size, noncanonical.length);
assert.ok(canonical.length > 0, 'Wave 10 must identify at least one custodied canonical acquisition candidate');
assert.ok(noncanonical.length > 0, 'Wave 10 must route at least one subject outside the custodied canonical registry');
assert.deepEqual(projection.routing_rows, routing);
assert.deepEqual(projection.canonical_acquisition_queue, canonical);
assert.deepEqual(projection.noncanonical_routing_rows, noncanonical);

const types = new Set(routing.map(row => row.semantic_type));
assert.ok(types.has('actor_candidate'), 'Wave 10 lacks actor candidates');
assert.ok(types.has('organization_candidate'), 'Wave 10 lacks organization candidates');
assert.ok(types.has('program_or_capability'), 'Wave 10 lacks program/capability routes');
assert.ok(types.has('procurement_award_or_protest_identifier') || types.has('opaque_record_identifier'), 'Wave 10 lacks procurement or opaque-record routes');
assert.ok(types.has('geographic_feature') || types.has('infrastructure_or_facility') || types.has('project_or_development'), 'Wave 10 lacks place, infrastructure, or project routes');
assert.ok(types.has('case_internal_or_analytic_object'), 'Wave 10 lacks case-internal or analytic-object routes');

for (const row of routing) {
  assert.equal(row.destination_registry, policy.routes[row.semantic_type]);
  assert.ok(['high', 'medium', 'low'].includes(row.typing_confidence));
  assert.ok(row.typing_rule_id);
  assert.ok(row.typing_rationale);
  assert.ok(Number.isInteger(row.priority_score));
  assert.ok(['P0', 'P1', 'P2', 'P3'].includes(row.priority_band));
  assert.equal(row.canonical_mutation_applied, false);
  assert.equal(row.accepted_identity_bridge, false);
  assert.equal(row.review_dependency.required_to_decide, false);
  assert.equal(row.reversibility.mode, 'append_preserving_supersession');
  assert.equal(row.automatic_cross_case_join_authorized, false);
  assert.equal(row.cross_case_graph_join_authorized, false);
  assert.equal(row.cross_case_hop_creation_authorized, false);
  assert.equal(row.graph_effect, 'none');
}

const actorIds = new Set(actors.map(row => row.id));
const organizationIds = new Set(organizations.map(row => row.id));
for (const row of canonical) {
  assert.ok(['actor', 'organization'].includes(row.candidate_kind));
  assert.equal(row.source_custody_present, true);
  assert.equal(row.status, 'acquisition_candidate_only');
  assert.equal(actorIds.has(row.identity_value), false);
  assert.equal(organizationIds.has(row.identity_value), false);
  assert.equal(row.canonical_mutation_applied, false);
  assert.equal(row.accepted_identity_bridge, false);
  assert.equal(row.review_dependency.required_to_decide, false);
  assert.equal(row.reversibility.mode, 'append_preserving_supersession');
  assert.equal(row.graph_effect, 'none');
}

for (const row of noncanonical) {
  if (['actor_candidate', 'organization_candidate'].includes(row.semantic_type)) {
    assert.equal(row.source_custody_present, false, `${row.route_id}: custodied identity candidate was kept outside canonical acquisition`);
  }
  assert.equal(row.canonical_mutation_applied, false);
  assert.equal(row.accepted_identity_bridge, false);
  assert.equal(row.review_dependency.required_to_decide, false);
  assert.equal(row.reversibility.mode, 'append_preserving_supersession');
  assert.equal(row.graph_effect, 'none');
}

assert.equal(receipt.counts.target_rows, 106);
assert.equal(receipt.counts.canonical_acquisition_rows, canonical.length);
assert.equal(receipt.counts.noncanonical_routing_rows, noncanonical.length);
assert.equal(receipt.counts.canonical_mutations_applied, 0);
assert.equal(receipt.counts.accepted_identity_bridges, 0);
assert.equal(receipt.decisions_requiring_human_permission, 0);
assert.equal(plan.completion.every_target_row_typed_and_routed, true);
assert.equal(plan.completion.canonical_acquisition_queue_present, true);
assert.equal(plan.completion.noncanonical_routing_registry_present, true);
assert.equal(plan.completion.canonical_mutations_applied, 0);
assert.equal(plan.completion.accepted_identity_bridges, 0);
assert.equal(plan.completion.decisions_requiring_human_permission, 0);
assert.equal(reconciliation.completion.every_target_row_typed_and_routed, true);
assert.equal(reconciliation.completion.every_routing_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.every_acquisition_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.every_noncanonical_route_id_source_projection_and_index_observed, true);
assert.equal(reconciliation.completion.canonical_mutations_applied, 0);
assert.equal(reconciliation.completion.accepted_identity_bridges, 0);
assert.equal(reconciliation.completion.decisions_requiring_human_permission, 0);
assert.equal(/SUBJROUTE-|CANACQ-|NONCANON-|subject-ontology-routing/i.test(JSON.stringify(hopGraph)), false);
assert.equal(policy.boundaries.semantic_type_proves_real_world_identity, false);
assert.equal(policy.boundaries.actor_candidate_is_canonical_actor, false);
assert.equal(policy.boundaries.organization_candidate_is_canonical_organization, false);
assert.equal(policy.boundaries.routing_destination_creates_relationship, false);
assert.equal(policy.boundaries.routing_destination_creates_hop, false);
assert.equal(policy.boundaries.graph_effect, 'none');

console.log(`lake-subject-ontology-routing-wave-10.test: OK (${routing.length} routed, ${canonical.length} custodied canonical acquisition candidates, ${noncanonical.length} other routes, 0 mutations)`);
