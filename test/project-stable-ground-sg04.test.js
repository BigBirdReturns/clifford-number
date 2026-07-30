#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg04Context, validateSg04 } from '../tools/validate-project-stable-ground-sg04.mjs';

const clean = loadSg04Context({ historicalVerifier: () => [] });
assert.deepEqual(validateSg04(clean), [], 'clean historical SG-04 checkpoint must validate');

const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['rewrite checkpoint identity', (c) => { c.checkpoint.checkpoint_id = 'SG-OTHER'; }, 'SG-04 checkpoint identity'],
  ['rewrite predecessor preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-03 preservation'],
  ['rewrite transition receipt', (c) => { c.checkpoint.trigger.transition_commit = '0'.repeat(40); }, 'SG-04 K0 transition receipt'],
  ['rewrite source Wave digest', (c) => { c.checkpoint.trigger.source_wave_release_sha256 = '0'.repeat(64); }, 'source Wave 08 digest'],
  ['promote historical K0 event', (c) => { c.checkpoint.canonical_snapshot.k0.included_events = 1; }, 'frozen K0 included_events'],
  ['reduce historical query battery', (c) => { c.checkpoint.canonical_snapshot.k0.query_templates_executed = 8; }, 'frozen K0 query_templates_executed'],
  ['inflate historical candidate count', (c) => { c.checkpoint.canonical_snapshot.k0.candidate_records = 29; }, 'frozen K0 candidate_records'],
  ['promote historical Wave CCD', (c) => { c.checkpoint.canonical_snapshot.wave_08.assigned_ccd_values = 1; }, 'frozen Wave 08 assigned_ccd_values'],
  ['complete historical field adjudication', (c) => { c.checkpoint.canonical_snapshot.wave_08.field_adjudication_complete = true; }, 'frozen Wave 08 field_adjudication_complete'],
  ['promote POOF deployment', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['promote DCA execution', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'frozen DCA execution'],
  ['advance adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-04 boundary graph_effect'],
  ['drift historical manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'historical SG-04 release digest'],
  ['drift historical report K0 digest', (c) => { c.report.k0_release.combined_sha256 = 'f'.repeat(64); }, 'historical SG-04 report K0 digest'],
  ['remove history row', (c) => { c.pointer.history = c.pointer.history.filter((r) => r.checkpoint_id !== 'SG-2026-07-29-04'); }, 'historical pointer row missing'],
  ['break merge receipt', (c) => { c.pointer.history[3].merge_commit = '0'.repeat(40); }, 'historical SG-04 merge receipt'],
  ['keep SG-04 current', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-29-04'; }, 'SG-04 remains current'],
  ['rewrite historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-04 bytes drifted from merge receipt']; }, 'historical SG-04 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg04(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`project-stable-ground-sg04.test: ${mutations.length} historical adversarial mutations PASS`);
