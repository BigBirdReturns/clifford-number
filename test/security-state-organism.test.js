#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const program = read('data/project/security-state-organism-program.json');
const registry = read('data/project/security-state-entity-registry.json');
const routes = read('data/intake/security-state-organism-source-routes.json');
const alignment = read('data/project/security-state-estate-alignment.json');
const work = read('data/project/security-state-work-packages.json');
const evidence = read('data/intake/security-state-organism-evidence-intake.json');
const manifest = read('build/core-thesis/security-state-organism/manifest.json');
const issuePlan = read('build/core-thesis/security-state-organism/issue-plan.json');

assert.equal(work.packages.length, 121);
assert.deepEqual(manifest.counts.package_classes, {
  cross_estate_bridge: 18,
  entity: 41,
  estate: 24,
  lineage_stage: 8,
  organ: 15,
  organism_test: 8,
  theater: 7,
});
assert.deepEqual(manifest.counts.routing_statuses, {
  derived_from_explicit_registry: 39,
  methodological_scope: 8,
  source_explicit_candidate: 41,
  title_explicit_candidate_targets: 18,
  unresolved_target_selection: 15,
});
assert.equal(program.lineage_stages.length, 8);
assert.equal(program.organ_types.length, 15);
assert.equal(program.organism_tests.length, 8);
assert.equal(program.theaters.length, 7);
assert.equal(registry.entities.length, 41);
assert.equal(routes.routes.length, 82);
assert.equal(alignment.estates.length, 24);
assert.equal(evidence.records.length, 17);
assert.equal(issuePlan.issues.length, 61);
assert.equal(issuePlan.estate_handoffs.length, 24);
assert.equal(issuePlan.issues.filter((x) => x.issue_class === 'cluster_index').length, 12);

for (const packet of work.packages) {
  assert.equal(packet.routing.synthetic_assignment, false, packet.package_id);
  assert.equal(packet.boundaries.synthetic_routing_allowed, false, packet.package_id);
  assert.equal(packet.boundaries.graph_effect, 'none', packet.package_id);
  assert.equal(packet.boundaries.conclusion_generated, false, packet.package_id);
  assert.equal(packet.boundaries.estate_completion_claimed, false, packet.package_id);
  assert.ok(packet.priority_basis, packet.package_id);
  assert.ok(packet.falsifier, packet.package_id);
  assert.ok(packet.terminal_states.includes('falsified'), packet.package_id);
}

for (const packet of work.packages.filter((x) => x.routing.status === 'unresolved_target_selection')) {
  assert.deepEqual(packet.entity_ids, [], packet.package_id);
  assert.deepEqual(packet.estate_ids, [], packet.package_id);
  assert.deepEqual(packet.organ_ids, [], packet.package_id);
  assert.deepEqual(packet.source_route_ids, [], packet.package_id);
}

for (const entity of registry.entities) {
  assert.ok(Array.isArray(entity.candidate_organ_ids), entity.entity_id);
  assert.ok(Array.isArray(entity.candidate_estate_ids), entity.entity_id);
  assert.equal('candidate_organs' in entity, false, entity.entity_id);
  assert.equal('candidate_estates' in entity, false, entity.entity_id);
  assert.equal(entity.routing.synthetic_assignment, false, entity.entity_id);
}

const generic = routes.routes.filter((x) => x.url === 'https://www.usa.gov/' || x.locators.some((y) => y.url === 'https://www.usa.gov/'));
assert.deepEqual(generic, []);
assert.ok(routes.routes.some((x) => x.locator_status === 'unresolved_locator'));
for (const route of routes.routes.filter((x) => x.locator_status === 'unresolved_locator')) {
  assert.equal(route.url, null, route.route_id);
  assert.ok(route.acquisition_query, route.route_id);
}

const dodCloudAto = routes.routes.find((x) => x.route_id === 'DOD-CLOUD-ATO');
assert.ok(dodCloudAto, 'DOD-CLOUD-ATO');
assert.equal(dodCloudAto.locator_status, 'candidate_system_locator');
assert.equal(dodCloudAto.url, "https://public.cyber.mil/dccs/cso/");
assert.deepEqual(dodCloudAto.locators, [{
  url: "https://public.cyber.mil/dccs/cso/",
  scope: 'system_or_first_party_entrypoint',
  verification_state: 'bounded_system_locator_requires_record_level_acquisition',
  evidence_ids: [],
}]);
assert.equal(dodCloudAto.acquisition_query, null);
assert.equal(dodCloudAto.notes, "The DoD Cyber Exchange Current Authorized CSOs register is an authoritative public system locator. A responsive provider or program record from that register is still required before any authorization claim may be promoted. Route presence is acquisition infrastructure, not evidence of a relationship, event, transfer, consequence, or proposition.");
const dodCloudAtoPackages = work.packages.filter((x) => x.source_route_ids.includes('DOD-CLOUD-ATO'));
assert.equal(dodCloudAtoPackages.length, 8);
for (const packet of dodCloudAtoPackages) {
  assert.equal(packet.boundaries.promotes_to, 'candidate_only', packet.package_id);
  assert.equal(packet.boundaries.graph_effect, 'none', packet.package_id);
  assert.equal(packet.boundaries.conclusion_generated, false, packet.package_id);
  assert.equal(packet.boundaries.estate_completion_claimed, false, packet.package_id);
}

const evidenceById = new Map(evidence.records.map((x) => [x.evidence_id, x]));
for (const packet of work.packages) for (const id of packet.evidence_record_ids) {
  assert.ok(evidenceById.has(id), `${packet.package_id}:${id}`);
  assert.ok(evidenceById.get(id).packet_ids.includes(packet.package_id), `${packet.package_id}:${id}`);
}
for (const record of evidence.records) {
  assert.ok(record.supports.length, record.evidence_id);
  assert.ok(record.does_not_support.length, record.evidence_id);
  assert.ok(record.next_acquisition, record.evidence_id);
}

const builder = fs.readFileSync('tools/build-security-state-organism.mjs', 'utf8');
const dispatcher = fs.readFileSync('tools/dispatch-security-state-organism.mjs', 'utf8');
assert.equal(builder.includes('https://www.usa.gov/'), false);
assert.equal(/\b(?:round.?robin|count.?balanc|synthetic.?coverage)\b/i.test(builder), false);
for (const required of ["GITHUB_ACTIONS === 'true'", "GITHUB_EVENT_NAME === 'push'", "GITHUB_REF === 'refs/heads/main'", "group.issue_class === 'cluster_index'", "`ENTITY-${group.issue_id.replace('CLUSTER-', '')}`", 'multiple current or legacy issue lanes found', 'multiple current or legacy estate handoffs found']) assert.ok(dispatcher.includes(required), required);
const waveIds = new Set(['M04B-EV-010','M04B-EV-011','M04B-EV-012','M04B-EV-013','M04B-EV-014','M04B-EV-015','M04B-EV-016','M04B-EV-017']);
assert.equal(evidence.records.filter((x) => waveIds.has(x.evidence_id)).length, 8);
for (const id of waveIds) { const record = evidenceById.get(id); assert.ok(record, id); assert.equal(record.acquisition_wave, 'M04B-W01', id); assert.equal(record.boundaries.graph_effect, 'none', id); assert.equal(record.boundaries.conclusion_generated, false, id); }
assert.ok(routes.routes.find((x) => x.route_id === 'EREBOR-OCC').locators.some((x) => x.evidence_ids.includes('M04B-EV-011')));
assert.ok(routes.routes.find((x) => x.route_id === 'US-IAPD').locators.some((x) => x.evidence_ids.includes('M04B-EV-015')));
assert.ok(routes.routes.find((x) => x.route_id === 'US-SEC-FORM-D').locators.some((x) => x.evidence_ids.includes('M04B-EV-016')));
assert.ok(dispatcher.includes('receipt.estate_comments_updated.push(handoff.issue_number);'));
assert.equal(dispatcher.includes('isssue_number'), false);
console.log('security-state-organism.test: ok');
