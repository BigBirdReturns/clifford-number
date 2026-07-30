#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg04Context, validateSg04 } from '../tools/validate-project-stable-ground-sg04.mjs';

const clean = loadSg04Context({
  transitionVerifier: () => [],
  historicalVerifier: () => []
});
assert.deepEqual(validateSg04(clean), [], 'clean current SG-04 checkpoint must validate');

const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[3].checkpoint_id = 'SG-2026-07-29-03'; }, 'pointer history order'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['rewrite SG-03 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-03 preservation'],
  ['rewrite transition receipt', (c) => { c.checkpoint.trigger.transition_commit = '0'.repeat(40); }, 'SG-04 K0 transition receipt'],
  ['rewrite source Wave digest', (c) => { c.checkpoint.trigger.source_wave_release_sha256 = '0'.repeat(64); }, 'source Wave 08 digest'],
  ['promote a K0 event', (c) => { c.checkpoint.canonical_snapshot.k0.included_events = 1; }, 'frozen K0 included_events'],
  ['reduce query battery', (c) => { c.k0.execution.query_templates_executed = 8; }, 'live K0 query count'],
  ['inflate candidate count', (c) => { c.k0.execution.candidate_records = 29; }, 'live K0 candidate count'],
  ['promote Wave 08 CCD', (c) => { c.wave08.records[0].ccd_chain_depth = 3; }, 'live Wave 08 promotion boundary'],
  ['complete field adjudication', (c) => { c.checkpoint.canonical_snapshot.wave_08.field_adjudication_complete = true; }, 'frozen Wave 08 field_adjudication_complete'],
  ['clear publication', (c) => { c.wave08.records[0].publication_status = 'cleared'; }, 'live Wave 08 promotion boundary'],
  ['promote POOF deployment', (c) => { c.poofAperture.publication.deployed = true; }, 'live POOF deployment'],
  ['make POOF indexable', (c) => { c.poofAperture.publication.indexable = true; }, 'live POOF indexability'],
  ['promote DCA query execution', (c) => { c.denominator.execution.query_templates_executed = 1; }, 'live DCA query count'],
  ['promote DCA prevalence', (c) => { c.dca.current_state.prevalence_finding_generated = true; }, 'live DCA prevalence state'],
  ['advance A1', (c) => { c.sprint09.current_result.A1_registry_entries = 1; }, 'live A1 count'],
  ['advance adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['authorize real-person pilot', (c) => { c.sprint09.current_result.real_person_pilot_authorized = true; }, 'live pilot state'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-04 boundary graph_effect'],
  ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-04 exact-byte manifest'],
  ['drift report K0 digest', (c) => { c.report.k0_release.combined_sha256 = 'f'.repeat(64); }, 'SG-04 report K0 digest'],
  ['fail transition custody', (c) => { c.transitionVerifier = () => ['K0 transition path denominator drift']; }, 'K0 transition path denominator drift'],
  ['launder historical mode', (c) => {
    c.pointer.current_checkpoint_id = 'SG-FUTURE';
    c.pointer.history[3].status = 'superseded_preserved';
    c.pointer.history[3].merge_commit = 'not-a-commit';
    c.historicalVerifier = () => ['historical SG-04 merge receipt is not a full commit SHA'];
  }, 'historical SG-04 merge receipt is not a full commit SHA']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg04(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`project-stable-ground-sg04.test: ${mutations.length} adversarial mutations PASS`);
