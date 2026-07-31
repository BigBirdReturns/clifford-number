#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg07Context, validateSg07 } from '../tools/validate-project-stable-ground-sg07.mjs';

const clean = loadSg07Context({ historicalVerifier: () => [] });
assert.deepEqual(validateSg07(clean), [], 'clean historical SG-07 checkpoint must validate under injected custody');
const cloneContext = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)]));

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[6].checkpoint_id = 'SG-2026-07-30-06'; }, 'pointer history prefix'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history prefix'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['allow historical rewrite', (c) => { c.governor.history_law.historical_data_and_reports_rewritten = true; }, 'governor no-rewrite law'],
  ['allow manifest recompute', (c) => { c.governor.history_law.historical_release_manifests_recomputed = true; }, 'governor historical manifest law'],
  ['rewrite SG-06 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-06 preservation'],
  ['rewrite trigger type', (c) => { c.checkpoint.trigger.type = 'publication'; }, 'SG-07 trigger type'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-07 transition path denominator'],
  ['rewrite transition digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-07 transition path digest'],
  ['self-award second party', (c) => { c.checkpoint.trigger.second_party_reviewed = 14; }, 'SG-07 second-party review count'],
  ['self-award adjudication', (c) => { c.checkpoint.trigger.adjudicated = 14; }, 'SG-07 adjudication count'],
  ['change disposition count', (c) => { c.checkpoint.trigger.disposition_changes = 1; }, 'SG-07 disposition-change count'],
  ['rewrite historical status', (c) => { c.pointer.history[6].status = 'current'; c.pointer.history[7].status = 'superseded_preserved'; }, 'historical SG-07 pointer status'],
  ['rewrite merge receipt', (c) => { c.pointer.history[6].merge_commit = 'f'.repeat(40); }, 'historical SG-07 pointer merge receipt'],
  ['inflate observations', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.records_retained = 15; }, 'frozen SSC retained count'],
  ['erase maintainer review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.maintainer_reviewed = 0; }, 'frozen maintainer review count'],
  ['promote complete compact', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.complete_compact_findings = 1; }, 'frozen complete compact count'],
  ['erase effective controls', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.dispositions.effective_counterpower_controls = 0; }, 'frozen effective-counterpower control count'],
  ['erase open acquisitions', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.dispositions.requires_additional_acquisition = 0; }, 'frozen acquisition count'],
  ['promote prevalence', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.prevalence_finding_generated = true; }, 'frozen SSC prevalence_finding_generated'],
  ['deploy POOF', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['advance adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-07 boundary graph_effect'],
  ['drift historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-07 bytes drifted from merge receipt: checkpoint']; }, 'historical SG-07 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg07(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg07.test: ${mutations.length} historical adversarial mutations PASS`);
