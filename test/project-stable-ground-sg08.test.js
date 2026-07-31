#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg08Context, validateSg08 } from '../tools/validate-project-stable-ground-sg08.mjs';

const clean = loadSg08Context({ historicalVerifier: () => [] });
assert.deepEqual(validateSg08(clean), [], 'clean historical SG-08 checkpoint must validate under injected custody');
const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[7].checkpoint_id = 'SG-2026-07-30-07'; }, 'pointer history prefix'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history prefix'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['allow historical rewrite', (c) => { c.governor.history_law.historical_data_and_reports_rewritten = true; }, 'governor no-rewrite law'],
  ['allow manifest recompute', (c) => { c.governor.history_law.historical_release_manifests_recomputed = true; }, 'governor historical manifest law'],
  ['rewrite SG-07 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-07 preservation'],
  ['rewrite trigger type', (c) => { c.checkpoint.trigger.type = 'publication'; }, 'SG-08 trigger type'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-08 transition path denominator'],
  ['rewrite transition digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-08 transition path digest'],
  ['inflate source count', (c) => { c.checkpoint.trigger.source_records = 13; }, 'SG-08 source count'],
  ['close obligation', (c) => { c.checkpoint.trigger.closed = 1; }, 'SG-08 closed obligation count'],
  ['self-award second party', (c) => { c.checkpoint.trigger.second_party_reviewed = 14; }, 'SG-08 second-party count'],
  ['self-award adjudication', (c) => { c.checkpoint.trigger.adjudicated = 14; }, 'SG-08 adjudication count'],
  ['rewrite historical status', (c) => { c.pointer.history[7].status = 'current'; c.pointer.history[8].status = 'superseded_preserved'; }, 'historical SG-08 pointer status'],
  ['rewrite merge receipt', (c) => { c.pointer.history[7].merge_commit = 'f'.repeat(40); }, 'historical SG-08 pointer merge receipt'],
  ['inflate observations', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.records_retained = 15; }, 'frozen SSC retained count'],
  ['erase maintainer review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.maintainer_reviewed = 0; }, 'frozen maintainer review count'],
  ['promote second party', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.second_party_reviewed = 1; }, 'frozen second-party review count'],
  ['promote complete compact', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.complete_compact_findings = 1; }, 'frozen complete compact count'],
  ['erase targeted acquisition', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.targeted_acquisition_supplements = 0; }, 'frozen acquisition supplement count'],
  ['close acquisition denominator', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.closed_acquisition_obligations = 3; }, 'frozen closed obligation count'],
  ['promote prevalence', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.prevalence_finding_generated = true; }, 'frozen SSC prevalence_finding_generated'],
  ['erase K0 execution', (c) => { c.checkpoint.canonical_snapshot.k0.query_templates_executed = 8; }, 'frozen K0 execution'],
  ['invent K0 event', (c) => { c.checkpoint.canonical_snapshot.k0.included_events = 1; }, 'frozen K0 events'],
  ['execute DCA', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'frozen DCA execution'],
  ['deploy POOF', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['advance adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-08 boundary graph_effect'],
  ['rewrite historical manifest digest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'historical SG-08 release digest'],
  ['drift historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-08 bytes drifted from merge receipt: checkpoint']; }, 'historical SG-08 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg08(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`project-stable-ground-sg08.test: ${mutations.length} historical adversarial mutations PASS`);
