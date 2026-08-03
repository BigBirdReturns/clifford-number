#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT, readInputs, deriveProduct, validateInputData, validateDerived,
} from '../tools/build-status-sovereignty-rd-wave02-rd05-recommendation-disposition.mjs';

const clone = (value) => structuredClone(value);
process.env.RD05_ALLOW_FIXTURE_INPUT = process.env.RD05_ALLOW_FIXTURE_INPUT || '0';
const inputs = readInputs(ROOT);
validateInputData(inputs);
const baseline = deriveProduct(ROOT, { write: false }).derived;
validateDerived(inputs, baseline);

let mutations = 0;
for (let index = 0; index < baseline.terminalClassification.objects.length; index += 1) {
  const mutant = clone(baseline);
  mutant.terminalClassification.objects[index].object_id = `MUTATED-${index}`;
  assert.throws(() => validateDerived(inputs, mutant), /object|identity|duplicate/i);
  mutations += 1;
}
for (let index = 0; index < inputs.census.routeResults.routes.length; index += 1) {
  const mutantInputs = clone(inputs);
  mutantInputs.census.routeResults.routes[index].route_id = `MUTATED-ROUTE-${index}`;
  assert.throws(() => validateInputData(mutantInputs), /route|identity|duplicate/i);
  mutations += 1;
}
const boundaryMutators = [
  (m) => { m.classReceipt.class_closed = false; },
  (m) => { m.classReceipt.terminal_state = 'evidence_complete'; },
  (m) => { m.classReceipt.counts.frozen_objects = 57; },
  (m) => { m.classReceipt.counts.open_chains = 1; },
  (m) => { m.classReceipt.counts.completed_recommendations = 1; },
  (m) => { m.classReceipt.counts.agency_responses = 1; },
  (m) => { m.classReceipt.counts.adopted_or_rejected_outputs = 1; },
  (m) => { m.classReceipt.counts.implementation_or_outcomes = 1; },
  (m) => { m.classReceipt.authority.outside_human_dependency = true; },
  (m) => { m.classReceipt.authority.external_contacts = 1; },
  (m) => { m.classReceipt.authority.publication_effect = 'publish'; },
  (m) => { m.classReceipt.authority.graph_effect = 'edge'; },
  (m) => { m.classReceipt.authority.denominator_widened = true; },
  (m) => { m.classReceipt.authority.suppression_finding = true; },
  (m) => { m.classReceipt.authority.no_private_influence_inferred = true; },
  (m) => { m.classReceipt.authority.reviewed_disposition_changed = true; },
];
for (const mutate of boundaryMutators) {
  const mutant = clone(baseline);
  mutate(mutant);
  assert.throws(() => validateDerived(inputs, mutant));
  mutations += 1;
}
assert.equal(mutations, 123);
console.log('status-sovereignty-rd-wave02-rd05-recommendation-disposition.test: 123 adversarial mutations PASS');
