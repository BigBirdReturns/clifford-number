#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateArtifacts } from '../tools/validate-lake-allocator-war-wave-21.mjs';

const readJson = relative => JSON.parse(fs.readFileSync(relative, 'utf8'));
const readJsonl = relative => fs.readFileSync(relative, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const clone = value => structuredClone(value);
const policy = readJson('data/project/lake-allocator-war-wave-21-policy.json');

function load() {
  return {
    policy: readJson('data/project/lake-allocator-war-wave-21-policy.json'),
    observations: readJsonl(policy.paths.observation_registry),
    waterline: readJsonl(policy.paths.waterline_registry),
    estates: readJsonl(policy.paths.estate_registry),
    programs: readJsonl(policy.paths.program_registry),
    receipt: readJson(policy.paths.receipt),
    projection: readJson(policy.paths.projection),
    reconciliation: fs.existsSync(policy.paths.reconciliation) ? readJson(policy.paths.reconciliation) : null
  };
}
function expectFailure(label, mutate) {
  const state = clone(load());
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, `${label}: mutation unexpectedly passed`);
}

assert.deepEqual(validateArtifacts(load()), [], 'committed allocator-war Wave 21 artifacts must validate');

const mutations = [
  ['promote Wave 02 review state', state => { state.observations.find(row => row.source_wave_key === 'SSC-W02').review_state = 'maintainer_reviewed'; }],
  ['promote Wave 02 authority state', state => { state.observations.find(row => row.source_wave_key === 'SSC-W02').authority_state = 'maintainer_reviewed_below_second_party_review'; }],
  ['assign Wave 02 finding', state => { state.observations.find(row => row.source_wave_key === 'SSC-W02').source_finding_ref = 'AW-FAKE'; }],
  ['promote Wave 02 compact', state => { state.observations.find(row => row.source_wave_key === 'SSC-W02').complete_compact_supported = true; }],
  ['create observation graph effect', state => { state.observations[0].graph_effect = 'edge'; }],
  ['drop observation denominator row', state => { state.observations.pop(); }],
  ['duplicate observation identifier', state => { state.observations[1].allocator_record_id = state.observations[0].allocator_record_id; }],
  ['promote frontier class', state => { state.waterline.find(row => row.source_wave_key === 'SSC-W02').finding_generated = true; }],
  ['promote estate finding', state => { state.estates[0].finding_promoted = true; }],
  ['transfer program authority', state => { state.programs[0].authority_transferred = true; }],
  ['generate recurrence', state => { state.programs[0].prevalence_or_recurrence_generated = true; }],
  ['route unknown observation', state => { state.estates[0].unreviewed_intake_observation_refs.push('SSC-OBS-9999'); }],
  ['remove canonical program consumer', state => { state.programs[0].consumer_key = 'unknown-program'; }],
  ['inflate racial-order finding', state => { state.receipt.counts.racial_order_findings = 1; }],
  ['mutate source authority', state => { state.receipt.source_mutations = 1; }],
  ['drift observation projection', state => { state.projection.observations[0].working_interpretation = 'mutated'; }],
  ['drift estate projection', state => { state.projection.estate_acquisition_routes.pop(); }],
  ['drift program projection', state => { state.projection.program_feeds[0].authority_transferred = true; }]
];

for (const [label, mutate] of mutations) expectFailure(label, mutate);

console.log(`allocator-war Wave 21 adversarial mutations passed: ${mutations.length}`);
