#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg05Context, validateSg05 } from '../tools/validate-project-stable-ground-sg05.mjs';

const historical = loadSg05Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg05(historical), [], 'clean historical SG-05 checkpoint must validate after an append-only successor');

const cloneContext = (source) => Object.fromEntries(
  Object.entries(source).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const current = cloneContext(historical);
current.pointer.history = current.pointer.history.slice(0, 5);
current.pointer.history[4].status = 'current';
delete current.pointer.history[4].merge_commit;
current.pointer.current_checkpoint_id = current.checkpoint.checkpoint_id;
current.pointer.current_checkpoint_path = 'data/project/project-stable-ground-sg05.json';
current.pointer.current_canonical_main_commit = current.checkpoint.trigger.transition_commit;
current.statusRelease.combined_sha256 = current.checkpoint.canonical_snapshot.status_sovereignty.release_sha256;
current.report.status_release.combined_sha256 = current.checkpoint.canonical_snapshot.status_sovereignty.release_sha256;
current.poofRelease.combined_sha256 = current.checkpoint.canonical_snapshot.poof.release_sha256;
current.transitionVerifier = () => [];
current.historicalVerifier = () => [];
current.manifestComputer = () => current.manifest;
assert.deepEqual(validateSg05(current), [], 'clean current SG-05 checkpoint must validate before succession');

const mutations = [
  ['duplicate checkpoint identity', 'historical', (c) => { c.pointer.history[4].checkpoint_id = 'SG-2026-07-29-04'; }, 'pointer history prefix'],
  ['reorder history', 'historical', (c) => { c.pointer.history.reverse(); }, 'pointer history prefix'],
  ['weaken append-only governor', 'historical', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['remove SSC trigger class', 'historical', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('status-for-sovereignty')); }, 'governor missing SSC trigger class'],
  ['rewrite SG-04 preservation', 'historical', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-04 preservation'],
  ['rewrite SG-04 receipt', 'historical', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-04 final custody receipt'],
  ['rewrite source digest', 'historical', (c) => { c.checkpoint.trigger.source_sha256 = 'f'.repeat(64); }, 'SG-05 source digest'],
  ['remove historical SG-05 row', 'historical', (c) => { c.pointer.history = c.pointer.history.filter((row) => row.checkpoint_id !== c.checkpoint.checkpoint_id); }, 'historical pointer row missing for SG-05'],
  ['remove append-only successor', 'historical', (c) => { c.pointer.history = c.pointer.history.slice(0, 5); }, 'SG-05 has no append-only successor'],
  ['lose historical custody', 'historical', (c) => { c.historicalVerifier = () => ['historical SG-05 bytes drifted from merge receipt']; }, 'historical SG-05 bytes drifted from merge receipt'],
  ['delete transition denominator', 'current', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-05 transition path denominator missing'],
  ['promote SSC execution', 'current', (c) => { c.status.current_state.query_or_field_execution_started = true; }, 'live SSC execution state'],
  ['retain SSC observation', 'current', (c) => { c.status.current_state.observations_retained = 1; }, 'live SSC retained count'],
  ['promote racial-order finding', 'current', (c) => { c.status.current_state.racial_order_finding_generated = true; }, 'live SSC racial_order_finding_generated'],
  ['promote common-purpose finding', 'current', (c) => { c.status.current_state.common_purpose_finding_generated = true; }, 'live SSC common_purpose_finding_generated'],
  ['turn patriotism into proof', 'current', (c) => { c.status.boundaries.patriotism_is_white_power = true; }, 'live patriotism boundary'],
  ['turn minority presence into neutrality', 'current', (c) => { c.status.boundaries.multiracial_presence_proves_neutrality = true; }, 'live neutrality boundary'],
  ['turn minority presence into tokenism', 'current', (c) => { c.status.boundaries.multiracial_presence_proves_tokenism = true; }, 'live tokenism boundary'],
  ['execute a lane', 'current', (c) => { c.fanout.lanes[0].execution.started = true; }, 'live SSC lane execution or graph drift'],
  ['create graph effect', 'current', (c) => { c.fanout.lanes[0].graph_effect = 'edge'; }, 'live SSC lane execution or graph drift'],
  ['invent external retrieval', 'current', (c) => { c.sources.counts.independently_retrieved_external_references = 8; }, 'live SSC retrieval state'],
  ['drift field-hypothesis bridge count', 'current', (c) => { c.core.field_hypothesis_bridges.pop(); }, 'live field hypothesis count'],
  ['promote K0 event', 'current', (c) => { c.k0.execution.included_events = 1; }, 'live K0 event count'],
  ['promote DCA execution', 'current', (c) => { c.denominator.execution.query_templates_executed = 1; }, 'live DCA execution'],
  ['deploy POOF', 'current', (c) => { c.poofAperture.publication.deployed = true; }, 'live POOF deployment'],
  ['advance adoption', 'current', (c) => { c.sprint09.current_result.maximum_verified_adoption_level = 'A1'; }, 'live adoption'],
  ['drift exact manifest', 'current', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-05 exact-byte manifest']
];

for (const [name, mode, mutate, expected] of mutations) {
  const context = cloneContext(mode === 'current' ? current : historical);
  mutate(context);
  const errors = validateSg05(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`project-stable-ground-sg05.test: ${mutations.length} current/historical adversarial mutations PASS`);
