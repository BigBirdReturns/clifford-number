#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateSource } from '../tools/validate-counter-selector-wave-31.mjs';

const source = JSON.parse(fs.readFileSync('data/project/counter-selector-wave-31-recipient-handoff-controls.json', 'utf8'));
const cases = [];

function add(name, mutate) {
  cases.push({ name, mutate });
}

add('schema version drift', value => { value.schema_version = 'counter-selector-recipient-handoff-controls@2'; });
add('wave id drift', value => { value.wave_id = 'CS-W31-RH-X'; });
add('parent wave drift', value => { value.parent_wave_id = 'CS-W29-RA-01'; });
add('status inflation', value => { value.status = 'complete_handoffs_found'; });
add('control deletion', value => { value.controls.pop(); });
add('component contract truncation', value => { value.handoff_contract.component_order.pop(); });
add('recipient acknowledgment ladder truncation', value => { value.handoff_contract.recipient_acknowledgment_levels.pop(); });

for (const key of Object.keys(source.counts)) {
  add(`count mutation ${key}`, value => { value.counts[key] += 1; });
}

for (const key of Object.keys(source.boundaries).filter(key => key !== 'graph_effect')) {
  add(`boundary mutation ${key}`, value => { value.boundaries[key] = true; });
}
add('graph effect mutation', value => { value.boundaries.graph_effect = 'edge'; });

for (let index = 0; index < source.controls.length; index += 1) {
  add(`control ${index + 1} source deletion`, value => { value.controls[index].source_records.pop(); });
  add(`control ${index + 1} duplicate source id`, value => {
    value.controls[index].source_records[1].source_id = value.controls[index].source_records[0].source_id;
  });
  add(`control ${index + 1} operator promotion`, value => { value.controls[index].operator_finding = true; });
  add(`control ${index + 1} field-test promotion`, value => { value.controls[index].field_test_eligible = true; });
  add(`control ${index + 1} contact authorization`, value => { value.controls[index].contact_authorized = true; });
  add(`control ${index + 1} graph mutation`, value => { value.controls[index].graph_effect = 'edge'; });
}

assert.equal(cases.length, 72);

for (const { name, mutate } of cases) {
  const candidate = structuredClone(source);
  mutate(candidate);
  assert.throws(() => validateSource(candidate), undefined, name);
}

console.log(`counter-selector-wave-31.test: ${cases.length} adversarial mutations refused`);
