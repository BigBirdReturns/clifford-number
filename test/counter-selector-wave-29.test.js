#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSource } from '../tools/validate-counter-selector-wave-29.mjs';

const original = JSON.parse(readFileSync('data/project/counter-selector-wave-29-resumability-audit.json', 'utf8'));

function clone() {
  return structuredClone(original);
}

const mutations = [];

for (const key of Object.keys(original.counts)) {
  mutations.push({
    name: `count_${key}`,
    apply(value) { value.counts[key] += 1; }
  });
}

for (const key of Object.keys(original.boundaries).filter(key => key !== 'graph_effect')) {
  mutations.push({
    name: `boundary_${key}`,
    apply(value) { value.boundaries[key] = true; }
  });
}

mutations.push(
  { name: 'wrong_parent', apply: value => { value.parent_wave_ids = ['CS-W27-BA-01']; } },
  { name: 'graph_effect', apply: value => { value.boundaries.graph_effect = 'person_edge'; } },
  { name: 'wrong_wave', apply: value => { value.wave_id = 'CS-W29-BAD'; } },
  { name: 'wrong_status', apply: value => { value.status = 'operator_found'; } },
  { name: 'drop_lane', apply: value => { value.lanes.pop(); } },
  { name: 'duplicate_lane', apply: value => { value.lanes[3].lane_id = value.lanes[0].lane_id; } },
  { name: 'duplicate_source', apply: value => { value.lanes[3].source_records[0].source_id = value.lanes[0].source_records[0].source_id; } },
  { name: 'add_person_support', apply: value => { value.lanes[0].dimension_effects.person_supports_added.push('custody'); } },
  { name: 'add_person_custody', apply: value => { value.lanes[2].dimension_effects.person_custody_added = true; } },
  { name: 'support_resumability', apply: value => { value.lanes[0].tested_claims.independent_resumability = 'supported'; } },
  { name: 'support_handoff', apply: value => { value.lanes[3].tested_claims.direct_handoff = 'supported'; } },
  { name: 'curl_deconcentrate_without_receipt', apply: value => { value.lanes[0].tested_claims.authority_concentration = 'none'; } },
  { name: 'sqlite_person', apply: value => { value.lanes[1].source_identity = 'invented person'; } },
  { name: 'django_direct_handoff', apply: value => { value.lanes[2].tested_claims.observed_succession = 'direct_person_handoff'; } },
  { name: 'hibp_resumable', apply: value => { value.lanes[3].tested_claims.independent_resumability = 'supported'; } },
  { name: 'average_disagreement', apply: value => { value.disagreements[0].averaged = true; } },
  { name: 'drop_disagreement', apply: value => { value.disagreements.pop(); } },
  { name: 'contact_required', apply: value => { value.audit_contract.contact_required = true; } },
  { name: 'short_public_contract', apply: value => { value.audit_contract.public_reproduction_requires = []; } },
  { name: 'short_resumability_contract', apply: value => { value.audit_contract.independent_resumability_requires = []; } },
  { name: 'short_handoff_contract', apply: value => { value.audit_contract.direct_handoff_requires = []; } }
);

assert.equal(mutations.length, 64, `expected 64 mutations, got ${mutations.length}`);

for (const mutation of mutations) {
  const value = clone();
  mutation.apply(value);
  assert.throws(() => validateSource(value), undefined, mutation.name);
}

validateSource(original);
console.log(`counter-selector-wave-29.test: ${mutations.length} adversarial mutations refused`);
