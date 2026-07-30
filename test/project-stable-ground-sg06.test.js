#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg06Context, validateSg06 } from '../tools/validate-project-stable-ground-sg06.mjs';

const clean = loadSg06Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg06(clean), [], 'clean current SG-06 checkpoint must validate under injected transition custody');
const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[5].checkpoint_id = 'SG-2026-07-30-05'; }, 'pointer history order'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['remove field-execution trigger', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('field-execution')); }, 'governor missing field-execution trigger'],
  ['rewrite SG-05 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-05 preservation'],
  ['rewrite SG-05 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-05 merge receipt'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-06 transition path denominator missing'],
  ['rewrite wave identity', (c) => { c.checkpoint.trigger.wave_id = 'SSC-W99'; }, 'SG-06 source wave identity'],
  ['inflate frozen field sources', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.field_source_records = 16; }, 'frozen field source count'],
  ['inflate frozen executed lanes', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.executed_lanes = 9; }, 'frozen SSC executed lane count'],
  ['inflate frozen observations', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.records_retained = 15; }, 'frozen SSC retained count'],
  ['promote frozen complete compact', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.complete_compact_findings = 1; }, 'frozen complete compact count'],
  ['promote frozen maintainer review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.maintainer_reviewed = 14; }, 'frozen maintainer review count'],
  ['promote frozen racial-order finding', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.racial_order_finding_generated = true; }, 'frozen SSC racial_order_finding_generated'],
  ['promote frozen common purpose', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.common_purpose_finding_generated = true; }, 'frozen SSC common_purpose_finding_generated'],
  ['promote frozen POOF deployment', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['advance frozen adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-06 boundary graph_effect'],
  ['drop executed lane row', (c) => { c.checkpoint.fanout_state.ssc_lanes.find((row) => row.lane_id === 'SSC-F05').records_retained = 0; }, 'SG-06 lane retained denominator'],
  ['drift FAN-07 state', (c) => { c.checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-07').state = 'complete'; }, 'FAN-07 state'],
  ['erase live execution', (c) => { c.status.current_state.query_or_field_execution_started = false; }, 'live SSC execution state'],
  ['promote live complete compact', (c) => { c.status.current_state.complete_compact_findings = 1; }, 'live SSC complete compact count'],
  ['promote live review', (c) => { c.status.current_state.maintainer_reviewed_observations = 14; }, 'live SSC maintainer review count'],
  ['drift live wave source count', (c) => { c.wave.counts.source_records = 14; }, 'live wave source count'],
  ['drift live source registry', (c) => { c.sources.counts.field_source_records = 14; }, 'live source registry field count'],
  ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-06 exact-byte manifest'],
  ['launder historical mode', (c) => {
    c.pointer.current_checkpoint_id = 'SG-FUTURE';
    c.pointer.history[5].status = 'superseded_preserved';
    c.pointer.history[5].merge_commit = 'not-a-commit';
    c.historicalVerifier = () => ['historical SG-06 merge receipt is not a full commit SHA'];
  }, 'historical SG-06 merge receipt is not a full commit SHA']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg06(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg06.test: ${mutations.length} adversarial mutations PASS`);
