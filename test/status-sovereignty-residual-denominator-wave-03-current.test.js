#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  CURRENT_PATH,
  deriveCurrent
} from '../tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs';
import {
  SCHEMA_PATH,
  validateSchemaContract,
  validateValue
} from '../tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);

const current = read(CURRENT_PATH);
const schema = read(SCHEMA_PATH);
assert.deepEqual(current, deriveCurrent(ROOT));
assert.equal(validateValue(current, ROOT), true);
assert.equal(validateSchemaContract(schema), true);

const mutations = [
  ['schema version', (v) => { v.schema_version = 'status-sovereignty-residual-denominator-wave-03-current@2'; }],
  ['wave identity', (v) => { v.wave_id = 'SSC-RD-W04'; }],
  ['issue identity', (v) => { v.issue = 1014; }],
  ['as-of custody', (v) => { v.as_of = '2026-08-05'; }],
  ['authority escalation', (v) => { v.authority = 'substantive_empirical_authority'; }],
  ['Wave-02 path', (v) => { v.source_snapshots.wave_02_current_ledger_path = 'data/research/other.json'; }],
  ['Wave-02 promotion merge', (v) => { v.source_snapshots.wave_02_cumulative_promotion_merge = '0'.repeat(40); }],
  ['Wave-03 constitution path', (v) => { v.source_snapshots.wave_03_constitution_path = 'data/research/other.json'; }],
  ['RD-01 closure path', (v) => { v.source_snapshots.rd01_closure_reference_path = 'data/project/other.json'; }],
  ['RD-01 receipt path', (v) => { v.source_snapshots.rd01_class_receipt_path = 'data/research/other.json'; }],
  ['RD-01 source merge', (v) => { v.source_snapshots.rd01_merge_commit = '0'.repeat(40); }],
  ['promoted receipt removed', (v) => { v.promoted_class_receipts.pop(); }],
  ['promoted receipt duplicated', (v) => { v.promoted_class_receipts[6] = clone(v.promoted_class_receipts[5]); }],
  ['promoted receipt order', (v) => { [v.promoted_class_receipts[0], v.promoted_class_receipts[1]] = [v.promoted_class_receipts[1], v.promoted_class_receipts[0]]; }],
  ['inherited receipt reopened', (v) => { v.promoted_class_receipts[0].class_closed = false; }],
  ['inherited receipt manifest', (v) => { v.promoted_class_receipts[4].manifest_combined_sha256 = '0'.repeat(64); }],
  ['RD-01 lane', (v) => { v.promoted_class_receipts[6].lane_id = 'RD-02'; }],
  ['RD-01 class', (v) => { v.promoted_class_receipts[6].class_id = 'RD-02-C05'; }],
  ['RD-01 issue', (v) => { v.promoted_class_receipts[6].issue = 1015; }],
  ['RD-01 source PR', (v) => { v.promoted_class_receipts[6].source_pr = 1023; }],
  ['RD-01 merge', (v) => { v.promoted_class_receipts[6].merge_commit = '0'.repeat(40); }],
  ['RD-01 manifest', (v) => { v.promoted_class_receipts[6].manifest_combined_sha256 = '0'.repeat(64); }],
  ['RD-01 terminal state', (v) => { v.promoted_class_receipts[6].terminal_state = 'evidence_complete'; }],
  ['RD-01 exact-match flag', (v) => { v.promoted_class_receipts[6].labels_exact_match = false; }],
  ['RD-01 reconciliation', (v) => { v.promoted_class_receipts[6].label_reconciliation = 'seed_mismatch'; }],
  ['RD-01 closure path row', (v) => { v.promoted_class_receipts[6].closure_reference_path = 'data/project/other.json'; }],
  ['RD-01 receipt path row', (v) => { v.promoted_class_receipts[6].class_receipt_path = 'data/research/other.json'; }],
  ['open selected removed', (v) => { v.selected_classes_open.pop(); }],
  ['open selected order', (v) => { v.selected_classes_open.reverse(); }],
  ['open selected identity', (v) => { v.selected_classes_open[0].class_id = 'RD-01-C06'; }],
  ['open selected silently closed', (v) => { v.selected_classes_open[0].class_closed = true; }],
  ['open selected state', (v) => { v.selected_classes_open[0].state = 'terminal'; }],
  ['canonical count', (v) => { v.counts.canonical_residual_classes = 43; }],
  ['starting closed count', (v) => { v.counts.classes_closed_before_wave = 7; }],
  ['selected attempt count', (v) => { v.counts.wave_03_selected_class_attempts = 5; }],
  ['Wave-03 receipt count', (v) => { v.counts.wave_03_terminal_class_receipts = 2; }],
  ['classes closed this wave', (v) => { v.counts.classes_closed_this_wave = 2; }],
  ['closed residual count', (v) => { v.counts.closed_residual_classes = 8; }],
  ['open residual count', (v) => { v.counts.open_residual_classes = 34; }],
  ['inherited label reconciliation count', (v) => { v.counts.label_reconciliations = 0; }],
  ['Wave-03 label reconciliation count', (v) => { v.counts.wave_03_label_reconciliations = 1; }],
  ['outside-human count', (v) => { v.counts.outside_human_dependencies = 1; }],
  ['external contact count', (v) => { v.counts.external_contacts = 1; }],
  ['external review count', (v) => { v.counts.external_reviews = 1; }],
  ['reviewed disposition count', (v) => { v.counts.reviewed_disposition_changes = 1; }],
  ['compact finding count', (v) => { v.counts.complete_compact_findings = 1; }],
  ['racial-order finding count', (v) => { v.counts.racial_order_findings = 1; }],
  ['prevalence finding count', (v) => { v.counts.prevalence_findings = 1; }],
  ['coordination finding count', (v) => { v.counts.coordination_findings = 1; }],
  ['common-purpose finding count', (v) => { v.counts.common_purpose_findings = 1; }],
  ['graph effect count', (v) => { v.counts.graph_effects = 1; }],
  ['publication effect count', (v) => { v.counts.publication_effects = 1; }],
  ['adoption effect count', (v) => { v.counts.adoption_effects = 1; }],
  ['terminal summary state', (v) => { v.current_result.terminal_state = 'wave_complete'; }],
  ['result closed count', (v) => { v.current_result.classes_closed = 8; }],
  ['result open count', (v) => { v.current_result.classes_open = 34; }],
  ['closed ID order', (v) => { v.current_result.closed_class_ids.reverse(); }],
  ['closed ID substitution', (v) => { v.current_result.closed_class_ids[6] = 'RD-02-C05'; }],
  ['Wave-03 terminal result count', (v) => { v.current_result.wave_03_selected_attempts_terminal = 2; }],
  ['open selected result order', (v) => { v.current_result.open_selected_class_ids.reverse(); }],
  ['all selected closed', (v) => { v.current_result.all_six_selected_classes_closed = true; }],
  ['Wave complete', (v) => { v.current_result.wave_complete = true; }],
  ['residual denominator complete', (v) => { v.current_result.residual_denominator_complete = true; }],
  ['result outside-human dependency', (v) => { v.current_result.outside_human_dependency = true; }],
  ['project blocking', (v) => { v.current_result.project_blocking = true; }],
  ['result graph effect', (v) => { v.current_result.graph_effect = 'added'; }],
  ['result publication effect', (v) => { v.current_result.publication_effect = 'published'; }],
  ['result adoption effect', (v) => { v.current_result.adoption_effect = 'adopted'; }],
  ['Wave-02 receipt rewrite boundary', (v) => { v.boundaries.wave_02_receipts_reopened_or_rewritten = true; }],
  ['lane closure boundary', (v) => { v.boundaries.one_wave03_class_closure_closes_lane = true; }],
  ['wave closure boundary', (v) => { v.boundaries.one_wave03_class_closure_closes_wave = true; }],
  ['source-unavailable boundary', (v) => { v.boundaries.bounded_source_unavailable_is_event_absence = true; }],
  ['not-publicly-recovered boundary', (v) => { v.boundaries.not_publicly_recovered_is_nonoccurrence = true; }],
  ['prospective re-evaluation boundary', (v) => { v.boundaries.prospective_re_evaluation_is_completed_re_evaluation = true; }],
  ['selector-accuracy boundary', (v) => { v.boundaries.class_closure_is_selector_accuracy_or_technical_superiority = true; }],
  ['complete-compact boundary', (v) => { v.boundaries.seven_closures_are_complete_compact = true; }],
  ['coordination boundary', (v) => { v.boundaries.functional_convergence_is_coordination_or_common_purpose = true; }],
  ['boundary graph effect', (v) => { v.boundaries.graph_effect = 'added'; }],
  ['boundary publication effect', (v) => { v.boundaries.publication_effect = 'published'; }],
  ['boundary adoption effect', (v) => { v.boundaries.adoption_effect = 'adopted'; }]
];

let refused = 0;
for (const [label, mutate] of mutations) {
  const candidate = clone(current);
  mutate(candidate);
  assert.throws(() => validateValue(candidate, ROOT), undefined, label);
  refused += 1;
}

const schemaMutations = [
  ['schema top-level reopening', (s) => { s.additionalProperties = true; }],
  ['schema receipt minimum', (s) => { s.properties.promoted_class_receipts.minItems = 6; }],
  ['schema receipt maximum', (s) => { s.properties.promoted_class_receipts.maxItems = 8; }],
  ['schema open-selected minimum', (s) => { s.properties.selected_classes_open.minItems = 4; }],
  ['schema open-selected maximum', (s) => { s.properties.selected_classes_open.maxItems = 6; }],
  ['schema canonical denominator', (s) => { s.properties.counts.properties.canonical_residual_classes.const = 43; }],
  ['schema closed count', (s) => { s.properties.counts.properties.closed_residual_classes.const = 8; }],
  ['schema open count', (s) => { s.properties.counts.properties.open_residual_classes.const = 34; }],
  ['schema receipt count', (s) => { s.properties.counts.properties.wave_03_terminal_class_receipts.const = 2; }],
  ['schema closed IDs', (s) => { s.properties.current_result.properties.closed_class_ids.const.pop(); }],
  ['schema open IDs', (s) => { s.properties.current_result.properties.open_selected_class_ids.const.reverse(); }],
  ['schema wave completion', (s) => { s.properties.current_result.properties.wave_complete.const = true; }],
  ['schema residual completion', (s) => { s.properties.current_result.properties.residual_denominator_complete.const = true; }],
  ['schema source-unavailable boundary', (s) => { s.properties.boundaries.properties.bounded_source_unavailable_is_event_absence.const = true; }],
  ['schema coordination boundary', (s) => { s.properties.boundaries.properties.functional_convergence_is_coordination_or_common_purpose.const = true; }]
];

for (const [label, mutate] of schemaMutations) {
  const candidate = clone(schema);
  mutate(candidate);
  assert.throws(() => validateSchemaContract(candidate), undefined, label);
  refused += 1;
}

console.log(`Wave-03 current-ledger adversarial suite: ${refused} mutations refused`);
