#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg05Context, validateSg05 } from '../tools/validate-project-stable-ground-sg05.mjs';

const clean = loadSg05Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg05(clean), [], 'clean current SG-05 checkpoint must validate under injected transition custody');
const cloneContext = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)]));

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[4].checkpoint_id = 'SG-2026-07-29-04'; }, 'pointer history order'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['remove SSC trigger class', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('status-for-sovereignty')); }, 'governor missing SSC trigger class'],
  ['rewrite SG-04 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-04 preservation'],
  ['rewrite SG-04 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-04 final custody receipt'],
  ['rewrite source digest', (c) => { c.checkpoint.trigger.source_sha256 = 'f'.repeat(64); }, 'SG-05 source digest'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-05 transition path denominator missing'],
  ['promote SSC execution', (c) => { c.status.current_state.query_or_field_execution_started = true; }, 'live SSC execution state'],
  ['retain SSC observation', (c) => { c.status.current_state.observations_retained = 1; }, 'live SSC retained count'],
  ['promote racial-order finding', (c) => { c.status.current_state.racial_order_finding_generated = true; }, 'live SSC racial_order_finding_generated'],
  ['promote common-purpose finding', (c) => { c.status.current_state.common_purpose_finding_generated = true; }, 'live SSC common_purpose_finding_generated'],
  ['turn patriotism into proof', (c) => { c.status.boundaries.patriotism_is_white_power = true; }, 'live patriotism boundary'],
  ['turn minority presence into neutrality', (c) => { c.status.boundaries.multiracial_presence_proves_neutrality = true; }, 'live neutrality boundary'],
  ['turn minority presence into tokenism', (c) => { c.status.boundaries.multiracial_presence_proves_tokenism = true; }, 'live tokenism boundary'],
  ['execute a lane', (c) => { c.fanout.lanes[0].execution.started = true; }, 'live SSC lane execution or graph drift'],
  ['create graph effect', (c) => { c.fanout.lanes[0].graph_effect = 'edge'; }, 'live SSC lane execution or graph drift'],
  ['invent external retrieval', (c) => { c.sources.counts.independently_retrieved_external_references = 8; }, 'live SSC retrieval state'],
  ['drift field-hypothesis bridge count', (c) => { c.core.field_hypothesis_bridges.pop(); }, 'live field hypothesis count'],
  ['promote K0 event', (c) => { c.k0.execution.included_events = 1; }, 'live K0 event count'],
  ['promote DCA execution', (c) => { c.denominator.execution.query_templates_executed = 1; }, 'live DCA execution'],
  ['deploy POOF', (c) => { c.poofAperture.publication.deployed = true; }, 'live POOF deployment'],
  ['advance adoption', (c) => { c.sprint09.current_result.maximum_verified_adoption_level = 'A1'; }, 'live adoption'],
  ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-05 exact-byte manifest'],
  ['launder historical mode', (c) => {
    c.pointer.current_checkpoint_id = 'SG-FUTURE';
    c.pointer.history[4].status = 'superseded_preserved';
    c.pointer.history[4].merge_commit = 'not-a-commit';
    c.historicalVerifier = () => ['historical SG-05 merge receipt is not a full commit SHA'];
  }, 'historical SG-05 merge receipt is not a full commit SHA']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg05(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg05.test: ${mutations.length} adversarial mutations PASS`);
