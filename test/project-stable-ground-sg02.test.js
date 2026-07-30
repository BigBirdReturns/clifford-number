#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg02Context, validateSg02 } from '../tools/validate-project-stable-ground-sg02.mjs';

const clean = loadSg02Context();
assert.deepEqual(validateSg02(clean), [], 'clean historical SG-02 checkpoint must validate');

const clone = (value) => structuredClone(value);
const mutations = [
  {
    name: 'rewrite SG-01 preservation',
    mutate(context) { context.checkpoint.supersedes.preserved_unchanged = false; },
    expected: 'SG-01 preservation law'
  },
  {
    name: 'promote frozen DCA execution',
    mutate(context) { context.checkpoint.canonical_snapshot.dca.query_templates_executed = 1; },
    expected: 'frozen DCA execution count'
  },
  {
    name: 'promote frozen K0 completion',
    mutate(context) { context.checkpoint.canonical_snapshot.k0.query_templates_executed = 9; },
    expected: 'frozen K0 execution count'
  },
  {
    name: 'launder issue opening into execution',
    mutate(context) { context.checkpoint.fanout_state.dca_execution_waves[0].state = 'executed'; },
    expected: 'silently promotes execution'
  },
  {
    name: 'promote coordination finding',
    mutate(context) { context.checkpoint.canonical_snapshot.dca.coordination_finding_generated = true; },
    expected: 'frozen DCA coordination finding'
  },
  {
    name: 'advance frozen adoption',
    mutate(context) { context.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; },
    expected: 'frozen adoption ceiling'
  },
  {
    name: 'authorize frozen pilot',
    mutate(context) { context.checkpoint.canonical_snapshot.sprint_09.real_person_pilot_authorized = true; },
    expected: 'frozen pilot state'
  },
  {
    name: 'create frozen graph effect',
    mutate(context) { context.checkpoint.boundaries.graph_effect = 'edge'; },
    expected: 'SG-02 boundary graph_effect'
  },
  {
    name: 'remove historical SG-02 row',
    mutate(context) { context.pointer.history = context.pointer.history.filter((row) => row.checkpoint_id !== 'SG-2026-07-29-02'); },
    expected: 'historical pointer row missing'
  },
  {
    name: 'rewrite SG-02 merge receipt',
    mutate(context) {
      const row = context.pointer.history.find((entry) => entry.checkpoint_id === 'SG-2026-07-29-02');
      row.merge_commit = '0000000000000000000000000000000000000000';
    },
    expected: 'historical SG-02 merge receipt'
  },
  {
    name: 'rewrite historical release digest',
    mutate(context) { context.manifest.combined_sha256 = '0'.repeat(64); },
    expected: 'historical SG-02 release digest'
  }
];

for (const testCase of mutations) {
  const context = {
    ...clean,
    checkpoint: clone(clean.checkpoint),
    pointer: clone(clean.pointer),
    manifest: clone(clean.manifest)
  };
  testCase.mutate(context);
  const errors = validateSg02(context);
  assert(
    errors.some((error) => error.includes(testCase.expected)),
    `${testCase.name}: expected ${JSON.stringify(testCase.expected)}, observed ${JSON.stringify(errors)}`
  );
}

console.log(`project-stable-ground-sg02.test: ${mutations.length} historical adversarial mutations PASS`);
