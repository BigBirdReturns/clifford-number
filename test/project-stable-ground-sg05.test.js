#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg05Context, validateSg05 } from '../tools/validate-project-stable-ground-sg05.mjs';

const clean = loadSg05Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg05(clean), [], 'clean historical SG-05 checkpoint must validate');
const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['rewrite checkpoint identity', (c) => { c.checkpoint.checkpoint_id = 'SG-OTHER'; }, 'SG-05 checkpoint identity'],
  ['rewrite SG-04 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-04 preservation'],
  ['rewrite SG-04 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-04 final custody receipt'],
  ['rewrite source digest', (c) => { c.checkpoint.trigger.source_sha256 = 'f'.repeat(64); }, 'SG-05 source digest'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-05 transition path denominator missing'],
  ['promote historical execution', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.query_or_field_execution_started = true; }, 'frozen SSC execution'],
  ['retain historical observation', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.records_retained = 1; }, 'frozen SSC retained count'],
  ['promote historical racial-order finding', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.racial_order_finding_generated = true; }, 'frozen SSC racial_order_finding_generated'],
  ['promote historical common purpose', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.common_purpose_finding_generated = true; }, 'frozen SSC common_purpose_finding_generated'],
  ['promote historical POOF deployment', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['promote historical DCA execution', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'frozen DCA execution'],
  ['advance historical adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['create historical graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-05 boundary graph_effect'],
  ['drift historical manifest', (c) => { c.historicalVerifier = () => ['historical SG-05 release digest drift']; }, 'historical SG-05 release digest drift'],
  ['remove history row', (c) => { c.pointer.history = c.pointer.history.filter((row) => row.checkpoint_id !== 'SG-2026-07-30-05'); }, 'historical pointer row missing for SG-05'],
  ['break merge receipt', (c) => { const row = c.pointer.history.find((item) => item.checkpoint_id === 'SG-2026-07-30-05'); row.merge_commit = '0'.repeat(40); c.historicalVerifier = () => ['historical SG-05 merge receipt is not a full commit SHA']; }, 'historical SG-05 merge receipt is not a full commit SHA'],
  ['keep SG-05 current', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-30-05'; }, 'current checkpoint after SG-05'],
  ['rewrite historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-05 bytes drifted from merge receipt']; }, 'historical SG-05 bytes drifted']
];
for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg05(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg05.test: ${mutations.length} historical adversarial mutations PASS`);
