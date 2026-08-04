#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  CURRENT_PATH,
  SCHEMA_PATH,
  WAVE02_PROMOTION_MERGE,
  WAVE03_CONSTITUTION_MERGE,
  RD01_MERGE,
  INHERITED_CLOSED_IDS,
  OPEN_WAVE03_IDS,
  readPromotionSources,
  validatePromotionSources,
  buildCurrentValue
} from './build-status-sovereignty-residual-denominator-wave-03-current.mjs';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const exactKeys = (value, expected, message) => {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${message}: object required`);
  same(Object.keys(value).sort(), [...expected].sort(), `${message}: property set changed`);
};

const TOP_KEYS = [
  'schema_version','wave_id','hypothesis_id','issue','as_of','authority','parent_custody',
  'inherited_closed_class_receipts','promoted_wave_03_class_receipts','selected_wave_03_classes_open',
  'counts','current_result','boundaries'
];
const PARENT_KEYS = [
  'wave_02_issue','wave_02_cumulative_promotion_pr','wave_02_promotion_merge','wave_02_current_ledger_path',
  'wave_02_current_ledger_sha256','wave_02_current_is_historical_parent','wave_03_constitution_pr',
  'wave_03_constitution_merge','wave_03_constitution_path','wave_03_constitution_sha256',
  'rd01_source_pr','rd01_merge_commit','canonical_residual_classes','closed_before_wave_03','open_before_wave_03'
];
const RECEIPT_KEYS = [
  'lane_id','class_id','issue','source_pr','merge_commit','constitutional_exact_label','receipt_class_label',
  'labels_exact_match','label_reconciliation','terminal_state','closure_reference_path','class_receipt_path',
  'manifest_combined_sha256','class_closed'
];
const OPEN_KEYS = ['lane_id','class_id','issue','constitutional_exact_label','state','class_closed'];
const COUNT_KEYS = [
  'canonical_residual_classes','inherited_terminal_class_receipts','wave_03_selected_class_attempts',
  'wave_03_terminal_class_receipts','terminal_class_receipts_total','classes_closed_before_wave_03',
  'classes_closed_this_wave','closed_residual_classes','open_residual_classes','open_wave_03_selected_classes',
  'label_reconciliations_total','outside_human_dependencies','external_contacts','external_reviews',
  'reviewed_disposition_changes','selector_accuracy_findings','technical_superiority_findings',
  'favoritism_findings','extraction_findings','complete_compact_findings','racial_order_findings',
  'prevalence_findings','coordination_findings','common_purpose_findings','graph_effects',
  'publication_effects','adoption_effects'
];
const RESULT_KEYS = [
  'terminal_state','classes_closed','classes_open','closed_class_ids','open_wave_03_selected_class_ids',
  'wave_03_selected_attempts_terminal','all_six_wave_03_selected_classes_closed','wave_03_complete',
  'complete_compact','outside_human_dependency','project_blocking','graph_effect','publication_effect','adoption_effect'
];
const BOUNDARY_KEYS = [
  'wave_02_current_ledger_is_rewritten','inherited_class_receipt_is_reopened',
  'one_wave_03_class_closure_closes_lane','one_wave_03_class_closure_closes_wave',
  'seven_total_class_closures_complete_compact','not_publicly_recovered_is_event_absence',
  'prospective_re_evaluation_is_completed_re_evaluation','methodology_change_is_correction',
  'later_edition_is_prior_row_reconsideration','missing_public_appeal_route_is_no_appeal_or_challenge',
  'rank_is_technical_superiority_or_causal_treatment','functional_convergence_is_coordination_or_common_purpose',
  'graph_effect','publication_effect','adoption_effect'
];

export function validateCurrentShape(value, schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === 'status-sovereignty-residual-denominator-wave-03-current@1', 'schema version const changed');
  ok(schema?.properties?.issue?.const === 1013, 'schema issue const changed');
  ok(schema?.properties?.counts?.properties?.closed_residual_classes?.const === 7, 'schema closed count changed');
  ok(schema?.properties?.counts?.properties?.open_residual_classes?.const === 35, 'schema open count changed');
  ok(schema?.properties?.promoted_wave_03_class_receipts?.minItems === 1 && schema?.properties?.promoted_wave_03_class_receipts?.maxItems === 1, 'schema Wave-03 receipt denominator changed');
  ok(schema?.properties?.selected_wave_03_classes_open?.minItems === 5 && schema?.properties?.selected_wave_03_classes_open?.maxItems === 5, 'schema Wave-03 open denominator changed');

  exactKeys(value, TOP_KEYS, 'current ledger root');
  ok(value.schema_version === 'status-sovereignty-residual-denominator-wave-03-current@1', 'schema_version changed');
  ok(value.wave_id === 'SSC-RD-W03' && value.hypothesis_id === 'SSC-H01' && value.issue === 1013, 'ledger identity changed');
  ok(value.as_of === '2026-08-04', 'ledger date changed');
  ok(value.authority === 'seven_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'ledger authority changed');

  exactKeys(value.parent_custody, PARENT_KEYS, 'parent custody');
  ok(value.parent_custody.wave_02_issue === 785 && value.parent_custody.wave_02_cumulative_promotion_pr === 1012, 'Wave-02 parent custody changed');
  ok(value.parent_custody.wave_02_promotion_merge === WAVE02_PROMOTION_MERGE, 'Wave-02 parent merge changed');
  ok(value.parent_custody.wave_02_current_is_historical_parent === true, 'Wave-02 current ledger lost historical-parent status');
  ok(value.parent_custody.wave_03_constitution_pr === 1020 && value.parent_custody.wave_03_constitution_merge === WAVE03_CONSTITUTION_MERGE, 'Wave-03 constitution custody changed');
  ok(value.parent_custody.rd01_source_pr === 1022 && value.parent_custody.rd01_merge_commit === RD01_MERGE, 'RD-01 merge custody changed');
  ok(value.parent_custody.canonical_residual_classes === 42 && value.parent_custody.closed_before_wave_03 === 6 && value.parent_custody.open_before_wave_03 === 36, 'parent arithmetic changed');

  ok(Array.isArray(value.inherited_closed_class_receipts) && value.inherited_closed_class_receipts.length === 6, 'six inherited receipts required');
  value.inherited_closed_class_receipts.forEach((row, index) => {
    exactKeys(row, RECEIPT_KEYS, `inherited receipt ${index + 1}`);
    ok(row.class_id === INHERITED_CLOSED_IDS[index], `inherited receipt ${index + 1}: order or identity changed`);
    ok(row.class_closed === true, `inherited receipt ${index + 1}: reopened`);
    ok(['bounded_source_unavailable','bounded_non_link','bounded_source_restricted'].includes(row.terminal_state), `inherited receipt ${index + 1}: terminal state changed`);
  });

  ok(Array.isArray(value.promoted_wave_03_class_receipts) && value.promoted_wave_03_class_receipts.length === 1, 'one promoted Wave-03 receipt required');
  const promoted = value.promoted_wave_03_class_receipts[0];
  exactKeys(promoted, RECEIPT_KEYS, 'Wave-03 promoted receipt');
  ok(promoted.lane_id === 'RD-01' && promoted.class_id === 'RD-01-C06' && promoted.issue === 1014 && promoted.source_pr === 1022, 'RD-01 promoted identity changed');
  ok(promoted.merge_commit === RD01_MERGE, 'RD-01 promoted merge changed');
  ok(promoted.constitutional_exact_label === 'methodology correction, appeal, and re-evaluation records', 'RD-01 constitutional label changed');
  ok(promoted.receipt_class_label === promoted.constitutional_exact_label && promoted.labels_exact_match === true && promoted.label_reconciliation === 'none', 'RD-01 label custody changed');
  ok(promoted.terminal_state === 'bounded_source_unavailable' && promoted.class_closed === true, 'RD-01 promoted state changed');
  ok(promoted.manifest_combined_sha256 === '9b59871cf7ce40e68d0a2a89b41148a6c92b7201702d91a7724d1310ddbcc461', 'RD-01 promoted manifest changed');

  ok(Array.isArray(value.selected_wave_03_classes_open) && value.selected_wave_03_classes_open.length === 5, 'five selected Wave-03 classes must remain open');
  value.selected_wave_03_classes_open.forEach((row, index) => {
    exactKeys(row, OPEN_KEYS, `open selected class ${index + 1}`);
    ok(row.class_id === OPEN_WAVE03_IDS[index], `open selected class ${index + 1}: order or identity changed`);
    ok(row.state === 'open' && row.class_closed === false, `open selected class ${index + 1}: overclosed`);
  });

  exactKeys(value.counts, COUNT_KEYS, 'counts');
  const expectedCounts = {
    canonical_residual_classes: 42,
    inherited_terminal_class_receipts: 6,
    wave_03_selected_class_attempts: 6,
    wave_03_terminal_class_receipts: 1,
    terminal_class_receipts_total: 7,
    classes_closed_before_wave_03: 6,
    classes_closed_this_wave: 1,
    closed_residual_classes: 7,
    open_residual_classes: 35,
    open_wave_03_selected_classes: 5,
    label_reconciliations_total: 1
  };
  for (const [key, expected] of Object.entries(expectedCounts)) ok(value.counts[key] === expected, `${key} changed`);
  for (const key of COUNT_KEYS.slice(11)) ok(value.counts[key] === 0, `${key} changed`);
  ok(value.counts.closed_residual_classes + value.counts.open_residual_classes === value.counts.canonical_residual_classes, 'class arithmetic does not close');

  exactKeys(value.current_result, RESULT_KEYS, 'current result');
  ok(value.current_result.terminal_state === 'seven_of_forty_two_residual_classes_closed_one_wave03_selected_attempt_terminal', 'current terminal state changed');
  ok(value.current_result.classes_closed === 7 && value.current_result.classes_open === 35, 'current result arithmetic changed');
  same(value.current_result.closed_class_ids, [...INHERITED_CLOSED_IDS, 'RD-01-C06'], 'closed-class order changed');
  same(value.current_result.open_wave_03_selected_class_ids, OPEN_WAVE03_IDS, 'open Wave-03 selected classes changed');
  ok(value.current_result.wave_03_selected_attempts_terminal === 1, 'Wave-03 terminal selected count changed');
  ok(value.current_result.all_six_wave_03_selected_classes_closed === false && value.current_result.wave_03_complete === false && value.current_result.complete_compact === false, 'Wave-03 or compact completion invented');
  ok(value.current_result.outside_human_dependency === false && value.current_result.project_blocking === false, 'human or blocking dependency introduced');
  ok(value.current_result.graph_effect === 'none' && value.current_result.publication_effect === 'none' && value.current_result.adoption_effect === 'none', 'current effect authority escalated');

  exactKeys(value.boundaries, BOUNDARY_KEYS, 'boundaries');
  for (const [key, state] of Object.entries(value.boundaries)) {
    if (key.endsWith('_effect')) ok(state === 'none', `${key} changed`);
    else ok(state === false, `${key} weakened`);
  }

  return value;
}

function validateGitAncestry(root) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;
  for (const [name, commit] of [
    ['Wave-02 promotion', WAVE02_PROMOTION_MERGE],
    ['Wave-03 constitution', WAVE03_CONSTITUTION_MERGE],
    ['RD-01 merge', RD01_MERGE]
  ]) {
    const check = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: root });
    ok(check.status === 0, `${name} is not an ancestor of HEAD`);
  }
}

export function validateCurrent(root = ROOT) {
  const schema = read(root, SCHEMA_PATH);
  const current = read(root, CURRENT_PATH);
  const bundle = readPromotionSources(root);
  validatePromotionSources(bundle);
  validateCurrentShape(current, schema);
  const expected = buildCurrentValue(bundle);
  same(current, expected, 'committed Wave-03 current ledger does not equal exact receipt derivation');
  validateGitAncestry(root);
  console.log('validate-status-sovereignty-residual-denominator-wave-03-current: 42 canonical, 7 closed, 35 open, one Wave-03 terminal receipt, authority zero');
  return current;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { validateCurrent(); }
  catch (error) {
    console.error(`validate-status-sovereignty-residual-denominator-wave-03-current: ${error.message}`);
    process.exit(1);
  }
}
