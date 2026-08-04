#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  CURRENT_PATH,
  SCHEMA_PATH,
  readPromotionSources,
  validatePromotionSources,
  buildCurrentValue
} from '../tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs';
import { validateCurrentShape } from '../tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clone = (value) => structuredClone(value);
const current = read(CURRENT_PATH);
const schema = read(SCHEMA_PATH);
const bundle = readPromotionSources(ROOT);

validatePromotionSources(bundle);
validateCurrentShape(current, schema);
assert.deepEqual(current, buildCurrentValue(bundle));

const expectFailure = (name, source, mutate, validate) => {
  const candidate = clone(source);
  mutate(candidate);
  assert.throws(() => validate(candidate), undefined, name);
};

const currentMutations = [
  ['schema version', v => { v.schema_version = 'bad'; }],
  ['wave identity', v => { v.wave_id = 'SSC-RD-W04'; }],
  ['issue identity', v => { v.issue = 785; }],
  ['authority escalation', v => { v.authority = 'complete_compact'; }],
  ['extra root property', v => { v.unreviewed = true; }],
  ['Wave-02 parent merge', v => { v.parent_custody.wave_02_promotion_merge = '0'.repeat(40); }],
  ['Wave-02 historical flag', v => { v.parent_custody.wave_02_current_is_historical_parent = false; }],
  ['Wave-03 constitution merge', v => { v.parent_custody.wave_03_constitution_merge = '0'.repeat(40); }],
  ['RD-01 merge', v => { v.parent_custody.rd01_merge_commit = '0'.repeat(40); }],
  ['parent arithmetic', v => { v.parent_custody.open_before_wave_03 = 35; }],
  ['inherited receipt removed', v => { v.inherited_closed_class_receipts.pop(); }],
  ['inherited receipt reordered', v => { v.inherited_closed_class_receipts.reverse(); }],
  ['inherited receipt reopened', v => { v.inherited_closed_class_receipts[0].class_closed = false; }],
  ['inherited receipt extra property', v => { v.inherited_closed_class_receipts[0].unreviewed = true; }],
  ['Wave-03 receipt removed', v => { v.promoted_wave_03_class_receipts = []; }],
  ['Wave-03 receipt duplicated', v => { v.promoted_wave_03_class_receipts.push(clone(v.promoted_wave_03_class_receipts[0])); }],
  ['Wave-03 receipt class', v => { v.promoted_wave_03_class_receipts[0].class_id = 'RD-01-C05'; }],
  ['Wave-03 receipt issue', v => { v.promoted_wave_03_class_receipts[0].issue = 1015; }],
  ['Wave-03 receipt source PR', v => { v.promoted_wave_03_class_receipts[0].source_pr = 999; }],
  ['Wave-03 receipt merge', v => { v.promoted_wave_03_class_receipts[0].merge_commit = '1'.repeat(40); }],
  ['Wave-03 constitutional label', v => { v.promoted_wave_03_class_receipts[0].constitutional_exact_label = 'methodology changes'; }],
  ['Wave-03 receipt label', v => { v.promoted_wave_03_class_receipts[0].receipt_class_label = 'methodology changes'; }],
  ['Wave-03 label match', v => { v.promoted_wave_03_class_receipts[0].labels_exact_match = false; }],
  ['Wave-03 reconciliation', v => { v.promoted_wave_03_class_receipts[0].label_reconciliation = 'invented'; }],
  ['Wave-03 state', v => { v.promoted_wave_03_class_receipts[0].terminal_state = 'evidence_complete'; }],
  ['Wave-03 manifest', v => { v.promoted_wave_03_class_receipts[0].manifest_combined_sha256 = '0'.repeat(64); }],
  ['Wave-03 reopened', v => { v.promoted_wave_03_class_receipts[0].class_closed = false; }],
  ['open class removed', v => { v.selected_wave_03_classes_open.pop(); }],
  ['open class reordered', v => { v.selected_wave_03_classes_open.reverse(); }],
  ['open class overclosed', v => { v.selected_wave_03_classes_open[0].class_closed = true; }],
  ['open class state', v => { v.selected_wave_03_classes_open[0].state = 'closed'; }],
  ['canonical denominator', v => { v.counts.canonical_residual_classes = 41; }],
  ['inherited count', v => { v.counts.inherited_terminal_class_receipts = 5; }],
  ['selected attempts', v => { v.counts.wave_03_selected_class_attempts = 5; }],
  ['Wave-03 receipt count', v => { v.counts.wave_03_terminal_class_receipts = 2; }],
  ['total receipt count', v => { v.counts.terminal_class_receipts_total = 8; }],
  ['closed this wave', v => { v.counts.classes_closed_this_wave = 2; }],
  ['closed total', v => { v.counts.closed_residual_classes = 8; }],
  ['open total', v => { v.counts.open_residual_classes = 34; }],
  ['open selected count', v => { v.counts.open_wave_03_selected_classes = 4; }],
  ['label reconciliation count', v => { v.counts.label_reconciliations_total = 2; }],
  ['outside human count', v => { v.counts.outside_human_dependencies = 1; }],
  ['external contact', v => { v.counts.external_contacts = 1; }],
  ['external review', v => { v.counts.external_reviews = 1; }],
  ['reviewed disposition', v => { v.counts.reviewed_disposition_changes = 1; }],
  ['selector accuracy', v => { v.counts.selector_accuracy_findings = 1; }],
  ['technical superiority', v => { v.counts.technical_superiority_findings = 1; }],
  ['favoritism', v => { v.counts.favoritism_findings = 1; }],
  ['extraction', v => { v.counts.extraction_findings = 1; }],
  ['complete compact', v => { v.counts.complete_compact_findings = 1; }],
  ['racial order', v => { v.counts.racial_order_findings = 1; }],
  ['prevalence', v => { v.counts.prevalence_findings = 1; }],
  ['coordination', v => { v.counts.coordination_findings = 1; }],
  ['common purpose', v => { v.counts.common_purpose_findings = 1; }],
  ['graph count', v => { v.counts.graph_effects = 1; }],
  ['publication count', v => { v.counts.publication_effects = 1; }],
  ['adoption count', v => { v.counts.adoption_effects = 1; }],
  ['result state', v => { v.current_result.terminal_state = 'wave_complete'; }],
  ['result closed', v => { v.current_result.classes_closed = 8; }],
  ['result open', v => { v.current_result.classes_open = 34; }],
  ['closed ids', v => { v.current_result.closed_class_ids.pop(); }],
  ['open ids', v => { v.current_result.open_wave_03_selected_class_ids.pop(); }],
  ['selected terminal count', v => { v.current_result.wave_03_selected_attempts_terminal = 2; }],
  ['all selected closed', v => { v.current_result.all_six_wave_03_selected_classes_closed = true; }],
  ['wave complete', v => { v.current_result.wave_03_complete = true; }],
  ['compact complete', v => { v.current_result.complete_compact = true; }],
  ['project blocked', v => { v.current_result.project_blocking = true; }],
  ['result graph', v => { v.current_result.graph_effect = 'graph_changed'; }],
  ['result publication', v => { v.current_result.publication_effect = 'published'; }],
  ['result adoption', v => { v.current_result.adoption_effect = 'adopted'; }],
  ['historical rewrite', v => { v.boundaries.wave_02_current_ledger_is_rewritten = true; }],
  ['inherited reopened boundary', v => { v.boundaries.inherited_class_receipt_is_reopened = true; }],
  ['lane closure', v => { v.boundaries.one_wave_03_class_closure_closes_lane = true; }],
  ['wave closure', v => { v.boundaries.one_wave_03_class_closure_closes_wave = true; }],
  ['compact boundary', v => { v.boundaries.seven_total_class_closures_complete_compact = true; }],
  ['missing record absence', v => { v.boundaries.not_publicly_recovered_is_event_absence = true; }],
  ['prospective completion', v => { v.boundaries.prospective_re_evaluation_is_completed_re_evaluation = true; }],
  ['methodology correction collapse', v => { v.boundaries.methodology_change_is_correction = true; }],
  ['later edition collapse', v => { v.boundaries.later_edition_is_prior_row_reconsideration = true; }],
  ['appeal absence collapse', v => { v.boundaries.missing_public_appeal_route_is_no_appeal_or_challenge = true; }],
  ['rank superiority', v => { v.boundaries.rank_is_technical_superiority_or_causal_treatment = true; }],
  ['functional convergence', v => { v.boundaries.functional_convergence_is_coordination_or_common_purpose = true; }],
  ['boundary graph', v => { v.boundaries.graph_effect = 'graph_changed'; }]
];

for (const [name, mutate] of currentMutations) {
  expectFailure(name, current, mutate, candidate => validateCurrentShape(candidate, schema));
}

const schemaMutations = [
  ['schema root open', s => { s.additionalProperties = true; }],
  ['schema version const', s => { s.properties.schema_version.const = 'bad'; }],
  ['schema issue const', s => { s.properties.issue.const = 999; }],
  ['schema promoted denominator', s => { s.properties.promoted_wave_03_class_receipts.maxItems = 2; }],
  ['schema open denominator', s => { s.properties.selected_wave_03_classes_open.minItems = 4; }],
  ['schema closed count', s => { s.properties.counts.properties.closed_residual_classes.const = 8; }],
  ['schema open count', s => { s.properties.counts.properties.open_residual_classes.const = 34; }]
];
for (const [name, mutate] of schemaMutations) {
  expectFailure(name, schema, mutate, candidate => validateCurrentShape(current, candidate));
}

const sourceMutations = [
  ['Wave-02 bytes', b => { b.hashes.wave02 = '0'.repeat(64); }],
  ['constitution bytes', b => { b.hashes.constitution = '0'.repeat(64); }],
  ['closure bytes', b => { b.hashes.closure = '0'.repeat(64); }],
  ['receipt bytes', b => { b.hashes.receipt = '0'.repeat(64); }],
  ['manifest bytes', b => { b.hashes.manifest = '0'.repeat(64); }],
  ['Wave-02 authority', b => { b.wave02.authority = 'complete_compact'; }],
  ['Wave-02 closed count', b => { b.wave02.counts.closed_residual_classes = 7; }],
  ['Wave-02 closure order', b => { b.wave02.current_result.closed_class_ids.reverse(); }],
  ['constitution attempt count', b => { b.constitution.lane_attempts.pop(); }],
  ['constitution label', b => { b.constitution.lane_attempts[0].exact_label = 'methodology changes'; }],
  ['closure source PR', b => { b.closure.source_pr = 999; }],
  ['closure state', b => { b.closure.terminal_state = 'evidence_complete'; }],
  ['closure atlas count', b => { b.closure.residual_atlas_effect_if_promoted_after_wave02_six_closures.open_after = 34; }],
  ['receipt terminal fields', b => { b.receipt.counts.terminal_fields = 23; }],
  ['receipt observed fields', b => { b.receipt.counts.observed_fields = 17; }],
  ['receipt missing boundary', b => { b.receipt.unresolved_limit.missing_records_are_not_event_absence = false; }],
  ['receipt prospective boundary', b => { b.receipt.unresolved_limit.prospective_re_evaluation_is_not_completed_re_evaluation = false; }],
  ['receipt coordination', b => { b.receipt.authority.coordination_finding = true; }],
  ['manifest entry count', b => { b.manifest.entry_count = 2; }],
  ['manifest digest', b => { b.manifest.combined_sha256 = '0'.repeat(64); }]
];
for (const [name, mutate] of sourceMutations) {
  expectFailure(name, bundle, mutate, validatePromotionSources);
}

console.log(`Wave-03 current-ledger adversarial suite: ${currentMutations.length + schemaMutations.length + sourceMutations.length} mutations refused`);
