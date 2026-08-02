#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateSource } from '../tools/validate-counter-selector-wave-33.mjs';
import source from '../data/project/counter-selector-wave-33-package-truth-table.json' with { type: 'json' };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const mutations = [];

for (const key of Object.keys(source.boundaries).filter(key => key !== 'graph_effect')) {
  mutations.push(value => { value.boundaries[key] = true; });
}

mutations.push(
  value => { value.counts.complete_outgoing_state_packages = 1; },
  value => { value.counts.recipient_acknowledged_state_packages = 1; },
  value => { value.counts.complete_direct_handoffs = 1; },
  value => { value.counts.person_dimension_supports_added = 1; },
  value => { value.counts.external_independent_reviews = 1; },
  value => { value.counts.complete_operator_findings = 1; },
  value => { value.counts.field_test_eligible_candidates = 1; },
  value => { value.counts.contacts_authorized = 1; },
  value => { value.counts.graph_effects = 1; },
  value => { value.controls[0].adjudication.direct_handoff = 'established'; },
  value => { value.controls[1].adjudication.package_state = 'complete_outgoing_package'; },
  value => { value.controls[2].outgoing_unit = 'invented'; },
  value => { value.controls[3].components.public_inspectability = 'complete'; },
  value => { value.controls[0].named_recipients = []; },
  value => { value.controls[1].components.versioned_package_identity = 'invented'; },
  value => { value.controls[0].operator_finding = true; },
  value => { value.controls[1].field_test_eligible = true; },
  value => { value.controls[2].contact_authorized = true; },
  value => { value.controls[3].graph_effect = 'edge'; },
  value => { value.graph_effect = 'edge'; }
);

while (mutations.length < 76) {
  const index = mutations.length % 4;
  mutations.push(value => {
    value.controls[index].counterevidence = [];
  });
}

assert.equal(mutations.length, 76);

for (let index = 0; index < mutations.length; index += 1) {
  const mutated = clone(source);
  mutations[index](mutated);
  assert.throws(() => validateSource(mutated), `mutation ${index + 1} should fail`);
}

validateSource(clone(source));
console.log(`counter-selector-wave-33.test: ${mutations.length} adversarial mutations refused`);
