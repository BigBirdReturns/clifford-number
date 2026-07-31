#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveRegistry, deriveRoutes } from '../tools/build-counter-selector-wave-06.mjs';
import { validateRegistryObject } from '../tools/validate-counter-selector-wave-06.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const contract = read('data/project/counter-selector-wave-06-custody-finality.json');
const sources = read('data/project/counter-selector-wave-06-source-registry.json');
const baseRegistry = deriveRegistry(contract);
const baseRoutes = deriveRoutes(contract);
const clone = (value) => structuredClone(value);

const registryMutations = [
  ['promote same-matter continuity to direct handoff', (r) => { r.records[0].findings.direct_outgoing_to_successor_handoff_receipt_located = true; }],
  ['promote later outcome to predecessor attribution', (r) => { r.records[0].findings.predecessor_attribution_for_later_outcome_established = true; }],
  ['invent original work object', (r) => { r.records[0].findings.original_contemporaneous_work_object_located = true; }],
  ['invent cross-domain transfer', (r) => { r.records[0].findings.cross_domain_transfer_artifact_located = true; }],
  ['invent public final decision', (r) => { r.records[1].findings.public_final_decision_located = true; }],
  ['invent public initial decision', (r) => { r.records[1].findings.public_initial_decision_located = true; }],
  ['invent durable custody', (r) => { r.records[1].findings.durable_post_finality_custody_observed = true; }],
  ['claim request was sent', (r) => { r.records[1].findings.record_request_sent = true; }],
  ['erase bounded-absence limit', (r) => { r.records[1].findings.bounded_public_absence_only = false; }],
  ['erase record-access route', (r) => { r.records[1].findings.record_access_route_identified = false; }],
  ['authorize field test packet 16', (r) => { r.records[0].field_test_eligible = true; }],
  ['authorize field test packet 21', (r) => { r.records[1].field_test_eligible = true; }],
  ['create operator finding packet 16', (r) => { r.records[0].operator_finding = true; }],
  ['create operator finding packet 21', (r) => { r.records[1].operator_finding = true; }],
  ['create graph edge packet 16', (r) => { r.records[0].graph_effect = 'edge'; }],
  ['create graph edge packet 21', (r) => { r.records[1].graph_effect = 'edge'; }],
  ['add bounded support packet 16', (r) => { r.records[0].new_bounded_dimension_supports = 1; }],
  ['add bounded support packet 21', (r) => { r.records[1].new_bounded_dimension_supports = 1; }],
  ['rewrite custody as direct handoff', (r) => { r.records[0].dimension_vector.custody = 'direct_handoff_supported'; }],
  ['rewrite finality as resolved', (r) => { r.records[1].dimension_vector.custody = 'final_merits_and_durable_custody'; }],
  ['remove packet 16', (r) => { r.records.shift(); }],
  ['duplicate packet 16', (r) => { r.records[1] = clone(r.records[0]); }],
  ['detach wave id', (r) => { r.wave_id = 'CS-W06-OTHER'; }],
  ['inflate direct-handoff count', (r) => { r.counts.direct_handoff_receipts = 1; }],
  ['remove source custody', (r) => { r.records[0].source_ids = []; }],
  ['invent source id', (r) => { r.records[0].source_ids = ['CS-W06-S999']; }],
  ['erase dimension', (r) => { delete r.records[0].dimension_vector.epistemic_restraint; }]
];

for (const [name, mutate] of registryMutations) {
  const registry = clone(baseRegistry);
  const routes = clone(baseRoutes);
  mutate(registry);
  assert.throws(() => validateRegistryObject(registry, contract, sources, routes), undefined, name);
}

const routeMutations = [
  ['execute route', (routes) => { routes.routes[0].state = 'executed'; }],
  ['authorize contact', (routes) => { routes.routes[0].contact_authorized = true; }],
  ['inflate route execution count', (routes) => { routes.counts.routes_executed = 1; }]
];
for (const [name, mutate] of routeMutations) {
  const registry = clone(baseRegistry);
  const routes = clone(baseRoutes);
  mutate(routes);
  assert.throws(() => validateRegistryObject(registry, contract, sources, routes), undefined, name);
}

assert.equal(registryMutations.length, 27);
assert.equal(routeMutations.length, 3);
console.log(`counter-selector-wave-06.test: PASS (${registryMutations.length} adversarial registry mutations + ${routeMutations.length} route refusals)`);
