#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  RECONCILIATION_PATH
} from '../tools/build-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs';
import {
  SCHEMA_PATH,
  validateReconciliation,
  validateReconciliationShape
} from '../tools/validate-status-sovereignty-residual-denominator-wave-02-reconciliation.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const value = read(RECONCILIATION_PATH);
const schema = read(SCHEMA_PATH);

validateReconciliation(ROOT);

const mutations = [
  ['wave identity', (v) => { v.wave_id = 'SSC-RD-W03'; }],
  ['authority escalation', (v) => { v.authority = 'complete_compact'; }],
  ['starting denominator', (v) => { v.parent_custody.canonical_residual_classes_at_start = 41; }],
  ['ledger merge custody', (v) => { v.parent_custody.wave_02_current_ledger_merge = '0'.repeat(40); }],
  ['attempt count', (v) => { v.selected_class_execution.attempted_classes = 5; }],
  ['terminal receipt count', (v) => { v.selected_class_execution.terminal_class_receipts = 5; }],
  ['selected attempt reopened', (v) => { v.selected_class_execution.all_selected_attempts_terminal = false; }],
  ['selected order', (v) => { v.selected_class_execution.selected_class_ids.reverse(); }],
  ['promotion order', (v) => { v.selected_class_execution.promotion_order_class_ids.reverse(); }],
  ['terminal-state distribution', (v) => { v.selected_class_execution.terminal_state_counts.bounded_source_unavailable = 3; }],
  ['canonical class removed', (v) => { v.canonical_residual_atlas.all_class_ids.pop(); }],
  ['canonical class duplicated', (v) => { v.canonical_residual_atlas.all_class_ids[0] = v.canonical_residual_atlas.all_class_ids[1]; }],
  ['selected class removed', (v) => { v.canonical_residual_atlas.selected_class_ids.pop(); }],
  ['remaining class removed', (v) => { v.canonical_residual_atlas.remaining_open_class_ids.pop(); }],
  ['selected class left open', (v) => { v.canonical_residual_atlas.remaining_open_class_ids[0] = 'RD-01-C03'; }],
  ['closed after wave', (v) => { v.canonical_residual_atlas.closed_after_wave = 7; }],
  ['open after wave', (v) => { v.canonical_residual_atlas.open_after_wave = 35; }],
  ['nonselected open count', (v) => { v.canonical_residual_atlas.nonselected_classes_preserved_open = 35; }],
  ['receipt deleted', (v) => { v.promoted_class_receipts.pop(); }],
  ['receipt reordered', (v) => { v.promoted_class_receipts.reverse(); }],
  ['receipt reopened', (v) => { v.promoted_class_receipts[0].class_closed = false; }],
  ['receipt merge changed', (v) => { v.promoted_class_receipts[0].merge_commit = '0'.repeat(40); }],
  ['receipt manifest changed', (v) => { v.promoted_class_receipts[0].manifest_combined_sha256 = '0'.repeat(64); }],
  ['receipt label mismatch erased', (v) => { v.promoted_class_receipts[1].labels_exact_match = true; }],
  ['closed count', (v) => { v.counts.closed_residual_classes = 7; }],
  ['open count', (v) => { v.counts.open_residual_classes = 35; }],
  ['label reconciliation count', (v) => { v.counts.label_reconciliations = 0; }],
  ['outside human dependency', (v) => { v.counts.outside_human_dependencies = 1; }],
  ['external contact', (v) => { v.counts.external_contacts = 1; }],
  ['complete compact finding', (v) => { v.counts.complete_compact_findings = 1; }],
  ['execution wave incomplete', (v) => { v.current_result.execution_wave_complete = false; }],
  ['residual denominator overclosed', (v) => { v.current_result.residual_denominator_complete = true; }],
  ['parent issue incomplete', (v) => { v.current_result.parent_execution_issue_complete = false; }],
  ['next wave silently created', (v) => { v.current_result.next_wave_created_by_this_reconciliation = true; }],
  ['publication effect', (v) => { v.current_result.publication_effect = 'published'; }],
  ['source unavailable collapse', (v) => { v.boundaries.bounded_source_unavailable_is_event_absence = true; }],
  ['complete compact collapse', (v) => { v.boundaries.six_class_closures_are_complete_compact = true; }],
  ['prevalence collapse', (v) => { v.boundaries.remaining_open_class_count_is_prevalence = true; }],
  ['extra root property', (v) => { v.unreviewed = true; }],
  ['extra receipt property', (v) => { v.promoted_class_receipts[0].unreviewed = true; }]
];

for (const [name, mutate] of mutations) {
  const candidate = clone(value);
  mutate(candidate);
  assert.throws(() => validateReconciliationShape(candidate, schema), undefined, name);
}

const schemaMutations = [
  ['schema open root', (s) => { s.additionalProperties = true; }],
  ['schema receipt denominator', (s) => { s.properties.promoted_class_receipts.maxItems = 7; }],
  ['schema canonical denominator', (s) => { s.properties.canonical_residual_atlas.properties.all_class_ids.minItems = 41; }],
  ['schema remaining-open denominator', (s) => { s.properties.canonical_residual_atlas.properties.remaining_open_class_ids.minItems = 35; }],
  ['schema closed count', (s) => { s.properties.counts.properties.closed_residual_classes.const = 7; }],
  ['schema open count', (s) => { s.properties.counts.properties.open_residual_classes.const = 35; }]
];

for (const [name, mutate] of schemaMutations) {
  const candidate = clone(schema);
  mutate(candidate);
  assert.throws(() => validateReconciliationShape(value, candidate), undefined, name);
}

console.log(`Wave-02 reconciliation adversarial suite: ${mutations.length + schemaMutations.length} mutations refused`);
