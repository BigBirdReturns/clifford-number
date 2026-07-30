#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg03Context, validateSg03 } from '../tools/validate-project-stable-ground-sg03.mjs';

const clean = loadSg03Context({ historicalVerifier: () => [] });
assert.deepEqual(validateSg03(clean), [], 'clean historical SG-03 checkpoint must validate');

const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['rewrite checkpoint identity', (c) => { c.checkpoint.checkpoint_id = 'SG-OTHER'; }, 'SG-03 checkpoint identity'],
  ['rewrite predecessor', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-02 preservation'],
  ['rewrite trigger receipt', (c) => { c.checkpoint.trigger.merge_commit = '0'.repeat(40); }, 'POOF trigger receipt'],
  ['promote historical K0', (c) => { c.checkpoint.canonical_snapshot.k0.query_templates_executed = 9; }, 'frozen K0 execution'],
  ['promote POOF deployment', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['promote DCA execution', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'frozen DCA execution'],
  ['advance adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['drift release digest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'historical SG-03 release digest'],
  ['drift report POOF digest', (c) => { c.report.poof_release.combined_sha256 = 'f'.repeat(64); }, 'historical SG-03 report POOF digest'],
  ['remove history row', (c) => { c.pointer.history = c.pointer.history.filter((r) => r.checkpoint_id !== 'SG-2026-07-29-03'); }, 'historical pointer row missing'],
  ['break merge receipt', (c) => { c.pointer.history[2].merge_commit = '0'.repeat(40); }, 'historical SG-03 merge receipt'],
  ['keep SG-03 current', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-29-03'; }, 'SG-03 remains current'],
  ['rewrite historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-03 bytes drifted from merge receipt']; }, 'historical SG-03 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg03(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`project-stable-ground-sg03.test: ${mutations.length} historical adversarial mutations PASS`);
