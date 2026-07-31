#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg08Context, validateSg08 } from '../tools/validate-project-stable-ground-sg08.mjs';

const clean = loadSg08Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg08(clean), [], 'clean current SG-08 checkpoint must validate under injected custody');
const cloneContext = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)]));

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[7].checkpoint_id = 'SG-2026-07-30-07'; }, 'pointer history order'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['allow historical rewrite', (c) => { c.governor.history_law.historical_data_and_reports_rewritten = true; }, 'governor no-rewrite law'],
  ['allow manifest recompute', (c) => { c.governor.history_law.historical_release_manifests_recomputed = true; }, 'governor historical manifest law'],
  ['rewrite correction mode', (c) => { c.governor.checkpoint_contract.correction_mode = 'overwrite'; }, 'governor correction mode'],
  ['rewrite SG-07 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-07 preservation'],
  ['rewrite SG-07 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-07 merge receipt'],
  ['rewrite trigger type', (c) => { c.checkpoint.trigger.type = 'publication'; }, 'SG-08 trigger type'],
  ['rewrite acquisition identity', (c) => { c.checkpoint.trigger.acquisition_id = 'SSC-W01-TA99'; }, 'SG-08 acquisition identity'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-08 transition path denominator'],
  ['rewrite transition digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-08 transition path digest'],
  ['inflate trigger sources', (c) => { c.checkpoint.trigger.source_records = 13; }, 'SG-08 source count'],
  ['close trigger obligation', (c) => { c.checkpoint.trigger.closed = 1; }, 'SG-08 closed obligation count'],
  ['change trigger disposition', (c) => { c.checkpoint.trigger.reviewed_disposition_changes = 1; }, 'SG-08 disposition-change count'],
  ['self-award trigger second party', (c) => { c.checkpoint.trigger.second_party_reviewed = 1; }, 'SG-08 second-party count'],
  ['self-award trigger adjudication', (c) => { c.checkpoint.trigger.adjudicated = 1; }, 'SG-08 adjudication count'],
  ['rewrite current pointer', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-30-07'; }, 'current checkpoint after SG-07'],
  ['rewrite current path', (c) => { c.pointer.current_checkpoint_path = 'data/project/project-stable-ground-sg07.json'; }, 'pointer current path'],
  ['rewrite historical SG-07 status', (c) => { c.pointer.history[6].status = 'current'; c.pointer.history[7].status = 'superseded_preserved'; }, 'historical SG-07 pointer status'],
  ['rewrite historical SG-07 receipt', (c) => { c.pointer.history[6].merge_commit = 'f'.repeat(40); }, 'historical SG-07 pointer merge receipt'],
  ['erase frozen targeted sources', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.targeted_acquisition_source_records = 0; }, 'frozen targeted source count'],
  ['close frozen obligation', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.closed_acquisition_obligations = 1; }, 'frozen closed obligation count'],
  ['erase partial repairs', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.partially_repaired_acquisition_obligations = 0; }, 'frozen partially repaired count'],
  ['self-award frozen second party', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.second_party_reviewed = 1; }, 'frozen second-party review count'],
  ['promote frozen complete compact', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.complete_compact_findings = 1; }, 'frozen complete compact count'],
  ['promote frozen racial order', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.racial_order_finding_generated = true; }, 'frozen SSC racial_order_finding_generated'],
  ['advance frozen DCA', (c) => { c.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; }, 'frozen DCA execution'],
  ['deploy frozen POOF', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['advance frozen adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['close fanout obligation', (c) => { c.checkpoint.fanout_state.targeted_acquisition.closed = 1; }, 'fanout closed obligation count'],
  ['change fanout disposition', (c) => { c.checkpoint.fanout_state.targeted_acquisition.reviewed_disposition_changes = 1; }, 'fanout disposition changes'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-08 boundary graph_effect'],
  ['rewrite denominator build state', (c) => { c.checkpoint.build_order.find((row) => row.order === 3).state = 'complete'; }, 'SG-08 denominator build state'],
  ['erase live targeted sources', (c) => { c.status.current_state.targeted_acquisition_source_records = 0; }, 'live targeted source count'],
  ['close live acquisition', (c) => { c.acquisition.counts.closed = 1; }, 'live acquisition closed count'],
  ['change live review disposition', (c) => { c.review.counts.disposition_changes = 1; }, 'live review disposition changes'],
  ['drift target release', (c) => { c.targetRelease.combined_sha256 = 'f'.repeat(64); }, 'live targeted-acquisition release digest'],
  ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-08 exact-byte manifest'],
  ['fail transition custody', (c) => { c.transitionVerifier = () => ['SG-08 transition path denominator drift']; }, 'SG-08 transition path denominator drift'],
  ['fail historical custody', (c) => { c.historicalVerifier = () => ['historical SG-07 bytes drifted from merge receipt']; }, 'historical SG-07 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg08(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg08.test: ${mutations.length} adversarial mutations PASS`);
