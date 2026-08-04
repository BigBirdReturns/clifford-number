#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  CURRENT_PATH
} from '../tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs';
import {
  SCHEMA_PATH,
  validateCurrent,
  validateCurrentShape
} from '../tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const current = read(CURRENT_PATH);
const schema = read(SCHEMA_PATH);

validateCurrent(ROOT);

const mutations = [
  ['close count', (v) => { v.counts.closed_residual_classes = 6; }],
  ['open count', (v) => { v.counts.open_residual_classes = 36; }],
  ['terminal receipt count', (v) => { v.counts.terminal_class_receipts = 1; }],
  ['selected attempts', (v) => { v.counts.selected_class_attempts = 5; }],
  ['label reconciliation count', (v) => { v.counts.label_reconciliations = 0; }],
  ['duplicate closed class', (v) => { v.promoted_class_receipts[1].class_id = 'RD-04-C01'; }],
  ['closed class removed', (v) => { v.promoted_class_receipts.pop(); }],
  ['open class removed', (v) => { v.selected_classes_open.pop(); }],
  ['open class overclosed', (v) => { v.selected_classes_open[0].class_closed = true; }],
  ['open class state changed', (v) => { v.selected_classes_open[0].state = 'closed'; }],
  ['RD-04 state changed', (v) => { v.promoted_class_receipts[0].terminal_state = 'evidence_complete'; }],
  ['RD-05 state changed', (v) => { v.promoted_class_receipts[1].terminal_state = 'evidence_complete'; }],
  ['RD-05 exact mismatch erased', (v) => { v.promoted_class_receipts[1].labels_exact_match = true; }],
  ['RD-05 label reconciliation changed', (v) => { v.promoted_class_receipts[1].label_reconciliation = 'none'; }],
  ['RD-01 state changed', (v) => { v.promoted_class_receipts[2].terminal_state = 'evidence_complete'; }],
  ['RD-01 merge custody changed', (v) => { v.promoted_class_receipts[2].merge_commit = '0'.repeat(40); }],
  ['RD-06 state changed', (v) => { v.promoted_class_receipts[3].terminal_state = 'evidence_complete'; }],
  ['RD-06 merge custody changed', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],
  ['RD-03 state changed', (v) => { v.promoted_class_receipts[4].terminal_state = 'evidence_complete'; }],
  ['RD-03 merge custody changed', (v) => { v.promoted_class_receipts[4].merge_commit = '0'.repeat(40); }],
  ['RD-03 flattened exact-match flag changed', (v) => { v.promoted_class_receipts[4].labels_exact_match = false; }],
  ['RD-03 flattened reconciliation changed', (v) => { v.promoted_class_receipts[4].label_reconciliation = 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact'; }],
  ['manifest changed', (v) => { v.promoted_class_receipts[1].manifest_combined_sha256 = '0'.repeat(64); }],
  ['merge commit malformed', (v) => { v.promoted_class_receipts[1].merge_commit = 'bad'; }],
  ['outside human dependency added', (v) => { v.counts.outside_human_dependencies = 1; }],
  ['external contact added', (v) => { v.counts.external_contacts = 1; }],
  ['publication effect added', (v) => { v.current_result.publication_effect = 'published'; }],
  ['wave overclosed', (v) => { v.current_result.wave_complete = true; }],
  ['project blocked', (v) => { v.current_result.project_blocking = true; }],
  ['private influence inference added', (v) => { v.boundaries.bounded_non_link_is_no_private_influence = true; }],
  ['source absence inference added', (v) => { v.boundaries.source_unavailability_is_event_absence = true; }],
  ['historical snapshot made current', (v) => { v.source_snapshots.first_promotion_snapshot_is_historical = false; }],
  ['extra root property', (v) => { v.unreviewed = true; }],
  ['extra promoted property', (v) => { v.promoted_class_receipts[0].unreviewed = true; }],
  ['closed class order changed', (v) => { v.promoted_class_receipts.reverse(); }],
  ['open selected identity changed', (v) => { v.selected_classes_open[0].class_id = 'RD-03-C04'; }],
  ['graph effect added', (v) => { v.boundaries.graph_effect = 'graph_changed'; }],
  ['canonical denominator changed', (v) => { v.counts.canonical_residual_classes = 41; }]
];

for (const [name, mutate] of mutations) {
  const candidate = clone(current);
  mutate(candidate);
  assert.throws(() => validateCurrentShape(candidate, schema), undefined, name);
}

const schemaMutations = [
  ['schema open root', (s) => { s.additionalProperties = true; }],
  ['schema receipt denominator', (s) => { s.properties.promoted_class_receipts.maxItems = 4; }],
  ['schema open denominator', (s) => { s.properties.selected_classes_open.minItems = 4; }],
  ['schema closed count', (s) => { s.properties.counts.properties.closed_residual_classes.const = 1; }],
  ['schema open count', (s) => { s.properties.counts.properties.open_residual_classes.const = 41; }],
  ['schema label reconciliation count', (s) => { s.properties.counts.properties.label_reconciliations.const = 2; }]
];

for (const [name, mutate] of schemaMutations) {
  const candidate = clone(schema);
  mutate(candidate);
  assert.throws(() => validateCurrentShape(current, candidate), undefined, name);
}

console.log(`Wave-02 current ledger adversarial suite: ${mutations.length + schemaMutations.length} mutations refused`);
