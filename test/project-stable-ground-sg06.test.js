#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg06Context, validateSg06 } from '../tools/validate-project-stable-ground-sg06.mjs';

const clean = loadSg06Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg06(clean), [], 'clean historical SG-06 checkpoint must validate under injected custody');
const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[5].checkpoint_id = 'SG-2026-07-30-05'; }, 'pointer history prefix'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history prefix'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['remove field-execution trigger', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('field-execution')); }, 'governor missing field-execution trigger'],
  ['rewrite SG-05 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-05 preservation'],
  ['rewrite SG-05 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-05 merge receipt'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-06 transition path denominator'],
  ['rewrite trigger type', (c) => { c.checkpoint.trigger.type = 'publication'; }, 'SG-06 trigger type'],
  ['inflate frozen field sources', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.field_source_records = 16; }, 'frozen field source count'],
  ['inflate frozen observations', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.records_retained = 15; }, 'frozen SSC retained count'],
  ['promote frozen complete compact', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.complete_compact_findings = 1; }, 'frozen complete compact count'],
  ['promote frozen maintainer review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.maintainer_reviewed = 14; }, 'frozen maintainer review count'],
  ['promote frozen racial-order finding', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.racial_order_finding_generated = true; }, 'frozen SSC racial_order_finding_generated'],
  ['advance frozen adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-06 boundary graph_effect'],
  ['drop executed lane row', (c) => { c.checkpoint.fanout_state.ssc_lanes.find((row) => row.lane_id === 'SSC-F05').records_retained = 0; }, 'SG-06 lane retained denominator'],
  ['drift FAN-07 state', (c) => { c.checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-07').state = 'complete'; }, 'FAN-07 state'],
  ['rewrite historical pointer status', (c) => { c.pointer.history[5].status = 'current'; c.pointer.history[6].status = 'superseded_preserved'; }, 'historical SG-06 pointer status'],
  ['rewrite historical merge receipt', (c) => { c.pointer.history[5].merge_commit = 'f'.repeat(40); }, 'historical SG-06 pointer merge receipt'],
  ['drift historical bytes', (c) => { c.historicalVerifier = () => ['historical SG-06 bytes drifted from merge receipt: checkpoint']; }, 'historical SG-06 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg06(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg06.test: ${mutations.length} historical adversarial mutations PASS`);
