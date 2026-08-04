#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  CURRENT_PATH,
  WAVE02_PATH,
  CONSTITUTION_PATH,
  RD01_CLOSURE_PATH,
  RD01_RECEIPT_PATH,
  RD01_MANIFEST_PATH,
  RD03_CLOSURE_PATH,
  RD03_RECEIPT_PATH,
  RD03_MANIFEST_PATH,
  CLOSED_IDS,
  OPEN_SELECTED_IDS,
  deriveCurrent
} from '../tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs';
import {
  SCHEMA_PATH,
  validateSchemaContract,
  validateValue
} from '../tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs';

const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const write = (root, rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const clone = (value) => structuredClone(value);

const ledger = read(ROOT, CURRENT_PATH);
const schema = read(ROOT, SCHEMA_PATH);
assert.deepEqual(ledger, deriveCurrent(ROOT));
assert.equal(validateValue(ledger, ROOT), true);
assert.equal(validateSchemaContract(schema), true);
assert.deepEqual(ledger.current_result.closed_class_ids, [...CLOSED_IDS]);
assert.deepEqual(ledger.current_result.open_selected_class_ids, [...OPEN_SELECTED_IDS]);
assert.equal(ledger.counts.closed_residual_classes + ledger.counts.open_residual_classes, 42);
assert.equal(ledger.promoted_class_receipts[7].labels_exact_match, false);
assert.notEqual(
  ledger.promoted_class_receipts[7].constitutional_exact_label,
  ledger.promoted_class_receipts[7].receipt_class_label
);

const refusals = [];
const ledgerMutation = (name, mutate) => refusals.push({
  name,
  run() {
    const value = clone(ledger);
    mutate(value);
    assert.throws(() => validateValue(value, ROOT), undefined, name);
  }
});
const schemaMutation = (name, mutate) => refusals.push({
  name,
  run() {
    const value = clone(schema);
    mutate(value);
    assert.throws(() => validateSchemaContract(value), undefined, name);
  }
});

for (const [key, replacement] of Object.entries({
  schema_version: 'status-sovereignty-residual-denominator-wave-03-current@2',
  wave_id: 'SSC-RD-W04',
  hypothesis_id: 'SSC-H02',
  issue: 9999,
  as_of: '2026-08-05',
  authority: 'three_wave03_terminal_class_receipts_promoted'
})) ledgerMutation(`top-level ${key} mutation`, (v) => { v[key] = replacement; });

for (const key of Object.keys(ledger.source_snapshots)) {
  ledgerMutation(`source snapshot ${key} mutation`, (v) => { v.source_snapshots[key] = 'mutated'; });
}

for (let i = 0; i < ledger.promoted_class_receipts.length; i += 1) {
  for (const key of ['lane_id', 'class_id', 'issue', 'source_pr', 'merge_commit', 'terminal_state', 'closure_reference_path', 'class_receipt_path', 'manifest_combined_sha256', 'class_closed']) {
    ledgerMutation(`promoted[${i}].${key} mutation`, (v) => {
      const row = v.promoted_class_receipts[i];
      row[key] = typeof row[key] === 'boolean' ? !row[key] : typeof row[key] === 'number' ? row[key] + 1 : `${row[key]}-mutated`;
    });
  }
}

for (const key of ['constitutional_exact_label', 'receipt_class_label', 'labels_exact_match', 'label_reconciliation']) {
  ledgerMutation(`RD-03 promotion ${key} mutation`, (v) => {
    const row = v.promoted_class_receipts[7];
    row[key] = typeof row[key] === 'boolean' ? !row[key] : `${row[key]}-mutated`;
  });
}
ledgerMutation('promoted receipt reorder', (v) => { [v.promoted_class_receipts[6], v.promoted_class_receipts[7]] = [v.promoted_class_receipts[7], v.promoted_class_receipts[6]]; });
ledgerMutation('promoted receipt duplicate', (v) => { v.promoted_class_receipts[7] = clone(v.promoted_class_receipts[6]); });
ledgerMutation('promoted receipt removal', (v) => { v.promoted_class_receipts.pop(); });

for (let i = 0; i < ledger.selected_classes_open.length; i += 1) {
  for (const key of ['lane_id', 'class_id', 'issue', 'constitutional_exact_label', 'state', 'class_closed']) {
    ledgerMutation(`open[${i}].${key} mutation`, (v) => {
      const row = v.selected_classes_open[i];
      row[key] = typeof row[key] === 'boolean' ? !row[key] : typeof row[key] === 'number' ? row[key] + 1 : `${row[key]}-mutated`;
    });
  }
}
ledgerMutation('open selected reorder', (v) => { v.selected_classes_open.reverse(); });
ledgerMutation('closed class reintroduced as open', (v) => { v.selected_classes_open[0].class_id = 'RD-03-C05'; });

for (const key of Object.keys(ledger.counts)) {
  ledgerMutation(`count ${key} mutation`, (v) => { v.counts[key] += 1; });
}

for (const key of ['terminal_state', 'classes_closed', 'classes_open', 'wave_03_selected_attempts_terminal', 'all_six_selected_classes_closed', 'wave_complete', 'residual_denominator_complete', 'outside_human_dependency', 'project_blocking', 'graph_effect', 'publication_effect', 'adoption_effect']) {
  ledgerMutation(`current_result ${key} mutation`, (v) => {
    const value = v.current_result[key];
    v.current_result[key] = typeof value === 'boolean' ? !value : typeof value === 'number' ? value + 1 : `${value}-mutated`;
  });
}
ledgerMutation('closed ID removal', (v) => { v.current_result.closed_class_ids.pop(); });
ledgerMutation('closed ID reorder', (v) => { v.current_result.closed_class_ids.reverse(); });
ledgerMutation('open ID removal', (v) => { v.current_result.open_selected_class_ids.pop(); });
ledgerMutation('open ID includes promoted RD-03', (v) => { v.current_result.open_selected_class_ids[0] = 'RD-03-C05'; });

for (const key of Object.keys(ledger.boundaries)) {
  ledgerMutation(`boundary ${key} mutation`, (v) => {
    v.boundaries[key] = typeof v.boundaries[key] === 'boolean' ? !v.boundaries[key] : 'changed';
  });
}

schemaMutation('schema dialect mutation', (v) => { v.$schema = 'https://json-schema.org/draft/2019-09/schema'; });
schemaMutation('schema ID mutation', (v) => { v.$id += '.mutated'; });
schemaMutation('schema top-level openness', (v) => { v.additionalProperties = true; });
schemaMutation('schema authority mutation', (v) => { v.properties.authority.const = 'one_wave03_terminal_class_receipt_promoted_without_cross_lane_empirical_authority'; });
schemaMutation('schema promoted minimum mutation', (v) => { v.properties.promoted_class_receipts.minItems = 7; });
schemaMutation('schema promoted maximum mutation', (v) => { v.properties.promoted_class_receipts.maxItems = 9; });
schemaMutation('schema open minimum mutation', (v) => { v.properties.selected_classes_open.minItems = 5; });
schemaMutation('schema open maximum mutation', (v) => { v.properties.selected_classes_open.maxItems = 5; });
for (const key of ['canonical_residual_classes', 'closed_residual_classes', 'open_residual_classes', 'wave_03_terminal_class_receipts', 'wave_03_label_reconciliations']) {
  schemaMutation(`schema count ${key} mutation`, (v) => { v.properties.counts.properties[key].const += 1; });
}
schemaMutation('schema closed IDs mutation', (v) => { v.properties.current_result.properties.closed_class_ids.const.pop(); });
schemaMutation('schema open IDs mutation', (v) => { v.properties.current_result.properties.open_selected_class_ids.const.push('RD-03-C05'); });
for (const key of Object.keys(ledger.boundaries).filter((key) => typeof ledger.boundaries[key] === 'boolean')) {
  schemaMutation(`schema boundary ${key} mutation`, (v) => { v.properties.boundaries.properties[key].const = true; });
}

const sourcePaths = [
  WAVE02_PATH,
  CONSTITUTION_PATH,
  RD01_CLOSURE_PATH,
  RD01_RECEIPT_PATH,
  RD01_MANIFEST_PATH,
  RD03_CLOSURE_PATH,
  RD03_RECEIPT_PATH,
  RD03_MANIFEST_PATH
];
function sourceMutation(name, rel, mutate) {
  refusals.push({
    name,
    run() {
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd03-promotion-'));
      try {
        for (const source of sourcePaths) write(temp, source, read(ROOT, source));
        const value = read(temp, rel);
        mutate(value);
        write(temp, rel, value);
        assert.throws(() => deriveCurrent(temp), undefined, name);
      } finally {
        fs.rmSync(temp, { recursive: true, force: true });
      }
    }
  });
}

sourceMutation('Wave-02 closed arithmetic mutation', WAVE02_PATH, (v) => { v.counts.closed_residual_classes = 7; });
sourceMutation('Wave-02 promoted receipt mutation', WAVE02_PATH, (v) => { v.promoted_class_receipts[0].class_closed = false; });
sourceMutation('constitution selected order mutation', CONSTITUTION_PATH, (v) => { v.lane_attempts.reverse(); });
sourceMutation('constitution RD-03 label mutation', CONSTITUTION_PATH, (v) => { v.lane_attempts.find((r) => r.class_id === 'RD-03-C05').exact_label += ' changed'; });
sourceMutation('RD-01 closure state mutation', RD01_CLOSURE_PATH, (v) => { v.class_closed = false; });
sourceMutation('RD-01 manifest mutation', RD01_MANIFEST_PATH, (v) => { v.combined_sha256 = '0'.repeat(64); });
sourceMutation('RD-03 closure state mutation', RD03_CLOSURE_PATH, (v) => { v.terminal_state = 'evidence_complete'; });
sourceMutation('RD-03 closure atlas arithmetic mutation', RD03_CLOSURE_PATH, (v) => { v.residual_atlas_effect_if_promoted_after_rd01_wave03_closure.closed_after = 9; });
sourceMutation('RD-03 receipt field denominator mutation', RD03_RECEIPT_PATH, (v) => { v.counts.terminal_fields = 54; });
sourceMutation('RD-03 receipt candidate admission mutation', RD03_RECEIPT_PATH, (v) => { v.counts.admitted_candidate_sources = 1; });
sourceMutation('RD-03 receipt event-absence mutation', RD03_RECEIPT_PATH, (v) => { v.unresolved_limit.missing_records_are_not_event_absence = false; });
sourceMutation('RD-03 receipt external review mutation', RD03_RECEIPT_PATH, (v) => { v.authority.external_reviews = 1; });
sourceMutation('RD-03 manifest mutation', RD03_MANIFEST_PATH, (v) => { v.combined_sha256 = 'f'.repeat(64); });

for (const test of refusals) test.run();
console.log(`Wave-03 current-ledger adversarial suite: ${refusals.length} mutations refused; 34 open / 8 closed preserved`);
