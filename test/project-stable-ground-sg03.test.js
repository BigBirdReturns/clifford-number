#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg03Context, validateSg03 } from '../tools/validate-project-stable-ground-sg03.mjs';

const clean = loadSg03Context({ historicalVerifier: () => [] });
assert.deepEqual(validateSg03(clean), [], 'clean current SG-03 checkpoint must validate');

const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  {
    name: 'duplicate checkpoint identity',
    mutate(context) { context.pointer.history[2].checkpoint_id = 'SG-2026-07-29-02'; },
    expected: 'pointer history order'
  },
  {
    name: 'reorder history',
    mutate(context) { context.pointer.history.reverse(); },
    expected: 'pointer history order'
  },
  {
    name: 'weaken append-only governor',
    mutate(context) { context.governor.history_law.append_only = false; },
    expected: 'governor append-only law'
  },
  {
    name: 'permit historical live equality',
    mutate(context) {
      context.governor.validation_modes.historical.must_not_validate = context.governor.validation_modes.historical.must_not_validate.filter((row) => !row.includes('later live corpus state'));
    },
    expected: 'governor historical refusal count'
  },
  {
    name: 'reverse POOF authority',
    mutate(context) { context.checkpoint.authority_change.current_authority = 'canonical_evidence'; },
    expected: 'SG-03 current authority'
  },
  {
    name: 'drift POOF release digest',
    mutate(context) { context.poofRelease.combined_sha256 = '0'.repeat(64); },
    expected: 'SG-03 report POOF digest'
  },
  {
    name: 'promote POOF deployment',
    mutate(context) { context.checkpoint.canonical_snapshot.poof.deployed = true; },
    expected: 'frozen POOF deployment state'
  },
  {
    name: 'make POOF indexable',
    mutate(context) { context.poofAperture.publication.indexable = true; },
    expected: 'live POOF indexability state'
  },
  {
    name: 'create canonical POOF claim',
    mutate(context) { context.poofContract.boundaries.canonical_claim_created = true; },
    expected: 'live POOF canonical-claim boundary'
  },
  {
    name: 'drop an effect dimension',
    mutate(context) { context.poofObjects.effect_dimensions.pop(); },
    expected: 'live POOF effect count'
  },
  {
    name: 'rewrite constitutional change denominator',
    mutate(context) { context.poofChanges.changes.pop(); },
    expected: 'live POOF change-receipt count'
  },
  {
    name: 'drift core-thesis report count',
    mutate(context) { context.checkpoint.canonical_snapshot.core_thesis.report_contracts = 8; },
    expected: 'frozen core-thesis report count'
  },
  {
    name: 'remove M05-S15',
    mutate(context) { context.stories.stories.pop(); context.stories.counts.stories = 14; },
    expected: 'live M-05 story count'
  },
  {
    name: 'remove A18',
    mutate(context) { context.fanout.lanes.pop(); context.fanout.counts.lanes = 17; },
    expected: 'live research-lane count'
  },
  {
    name: 'promote K0 completion',
    mutate(context) { context.checkpoint.canonical_snapshot.k0.query_templates_executed = 9; },
    expected: 'frozen K0 execution count'
  },
  {
    name: 'promote DCA query execution',
    mutate(context) { context.denominator.execution.query_templates_executed = 1; },
    expected: 'live DCA query count'
  },
  {
    name: 'promote DCA prevalence',
    mutate(context) { context.dca.current_state.prevalence_finding_generated = true; },
    expected: 'live DCA prevalence state'
  },
  {
    name: 'advance A1',
    mutate(context) { context.sprint09.current_result.A1_registry_entries = 1; },
    expected: 'live A1 count'
  },
  {
    name: 'advance adoption',
    mutate(context) { context.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; },
    expected: 'frozen adoption ceiling'
  },
  {
    name: 'authorize real-person pilot',
    mutate(context) { context.checkpoint.canonical_snapshot.sprint_09.real_person_pilot_authorized = true; },
    expected: 'frozen pilot state'
  },
  {
    name: 'create graph effect',
    mutate(context) { context.checkpoint.boundaries.graph_effect = 'edge'; },
    expected: 'SG-03 boundary graph_effect'
  },
  {
    name: 'drift exact release manifest',
    mutate(context) { context.manifest.combined_sha256 = 'f'.repeat(64); },
    expected: 'current SG-03 exact-byte manifest'
  },
  {
    name: 'launder historical mode without merge receipt',
    mutate(context) {
      context.pointer.current_checkpoint_id = 'SG-FUTURE';
      context.pointer.history[2].status = 'superseded_preserved';
      context.pointer.history[2].merge_commit = 'not-a-commit';
      context.historicalVerifier = () => ['historical SG-03 merge receipt is not a full commit SHA'];
    },
    expected: 'historical SG-03 merge receipt is not a full commit SHA'
  }
];

for (const testCase of mutations) {
  const context = cloneContext();
  testCase.mutate(context);
  const errors = validateSg03(context);
  assert(
    errors.some((error) => error.includes(testCase.expected)),
    `${testCase.name}: expected ${JSON.stringify(testCase.expected)}, observed ${JSON.stringify(errors)}`
  );
}

console.log(`project-stable-ground-sg03.test: ${mutations.length} adversarial mutations PASS`);
