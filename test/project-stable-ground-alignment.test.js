#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadAlignmentContext, validateAlignment } from '../tools/validate-project-stable-ground-alignment.mjs';

const clean = loadAlignmentContext();
assert.deepEqual(validateAlignment(clean), [], 'clean stable-ground checkpoint must validate');

const clone = (value) => structuredClone(value);
const cases = [
  {
    name: 'refuse mainline K0 promotion without source change',
    mutate(context) {
      context.record.canonical_snapshot.k0.query_templates_executed = 9;
    },
    expected: 'K0 executed-template count'
  },
  {
    name: 'refuse DCA graph promotion',
    mutate(context) {
      context.record.namespace_and_ontology.field_hypothesis_graph_effect = 'edge';
    },
    expected: 'DCA graph boundary'
  },
  {
    name: 'refuse story-ID collision',
    mutate(context) {
      context.record.namespace_and_ontology.story_id_policy['M05-S15'] = 'distributed counterpower aversion';
    },
    expected: 'M05-S15 reservation'
  },
  {
    name: 'refuse branch fact as canonical base',
    mutate(context) {
      context.record.canonical_main.commit = 'd0cb21a537dd20cbd1d14693f8f3ea26cbca4293';
    },
    expected: 'canonical base commit'
  },
  {
    name: 'refuse internal build as external adoption',
    mutate(context) {
      context.record.canonical_snapshot.sprint_09.A1_registry_entries = 1;
    },
    expected: 'Sprint 09 A1_registry_entries'
  },
  {
    name: 'refuse missing publication dependency',
    mutate(context) {
      context.record.noncanonical_active_surfaces =
        context.record.noncanonical_active_surfaces.filter((row) => row.surface_id !== 'NC-PR-382');
    },
    expected: 'noncanonical-surface denominator'
  }
];

for (const testCase of cases) {
  const context = {
    ...clean,
    record: clone(clean.record)
  };
  testCase.mutate(context);
  const errors = validateAlignment(context);
  assert(
    errors.some((error) => error.includes(testCase.expected)),
    `${testCase.name}: expected an error containing ${JSON.stringify(testCase.expected)}, observed ${JSON.stringify(errors)}`
  );
}

console.log(`project-stable-ground-alignment.test: ${cases.length} adversarial cases passed`);
