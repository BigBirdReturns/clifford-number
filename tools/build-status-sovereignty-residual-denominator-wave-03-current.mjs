#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CURRENT_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current.json';
export const WAVE02_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';
export const CLOSURE_PATH = 'data/project/ssc-residual-wave03/closures/RD-01-C06.json';
export const RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/class-receipt.json';
export const MANIFEST_PATH = 'data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/manifest.json';

export const WAVE02_PROMOTION_MERGE = '2af6bb7819a37e51c7198fb48da894445a29e494';
export const RD01_MERGE = 'c27e7d3cde2c94c1cde5d66dcce8eb06b514ff8a';
export const RD01_MANIFEST = '9b59871cf7ce40e68d0a2a89b41148a6c92b7201702d91a7724d1310ddbcc461';
export const RD01_LABEL = 'methodology correction, appeal, and re-evaluation records';

export const INHERITED_CLOSED_IDS = Object.freeze([
  'RD-04-C01',
  'RD-05-C03',
  'RD-01-C03',
  'RD-06-C01',
  'RD-03-C04',
  'RD-02-C04'
]);

export const WAVE03_SELECTED_IDS = Object.freeze([
  'RD-01-C06',
  'RD-02-C05',
  'RD-03-C05',
  'RD-04-C02',
  'RD-05-C02',
  'RD-06-C04'
]);

export const OPEN_SELECTED_IDS = Object.freeze([
  'RD-02-C05',
  'RD-03-C05',
  'RD-04-C02',
  'RD-05-C02',
  'RD-06-C04'
]);

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

function validateEffects(value, prefix) {
  ok(value?.outside_human_dependency === false, `${prefix}.outside_human_dependency changed`);
  ok(value?.external_contacts === 0, `${prefix}.external_contacts changed`);
  ok(value?.external_reviews === 0, `${prefix}.external_reviews changed`);
  ok(value?.publication_effect === 'none', `${prefix}.publication_effect changed`);
  ok(value?.adoption_effect === 'none', `${prefix}.adoption_effect changed`);
  ok(value?.graph_effect === 'none', `${prefix}.graph_effect changed`);
}

function validateWave02(wave02) {
  ok(wave02?.schema_version === 'status-sovereignty-residual-denominator-wave-02-current@1', 'Wave-02 current-ledger schema changed');
  ok(wave02?.wave_id === 'SSC-RD-W02' && wave02?.issue === 785, 'Wave-02 current-ledger identity changed');
  ok(wave02?.authority === 'six_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'Wave-02 authority changed');
  ok(Array.isArray(wave02?.promoted_class_receipts) && wave02.promoted_class_receipts.length === 6, 'Wave-02 must retain six promoted receipts');
  same(wave02.promoted_class_receipts.map((row) => row.class_id), INHERITED_CLOSED_IDS, 'Wave-02 promoted receipt order changed');
  ok(wave02.promoted_class_receipts.every((row) => row.class_closed === true), 'Wave-02 contains an unclosed promoted row');
  ok(Array.isArray(wave02?.selected_classes_open) && wave02.selected_classes_open.length === 0, 'Wave-02 selected-open set changed');
  ok(wave02?.counts?.canonical_residual_classes === 42, 'canonical residual denominator changed');
  ok(wave02?.counts?.terminal_class_receipts === 6, 'Wave-02 terminal receipt count changed');
  ok(wave02?.counts?.closed_residual_classes === 6 && wave02?.counts?.open_residual_classes === 36, 'Wave-02 residual arithmetic changed');
  ok(wave02?.counts?.label_reconciliations === 1, 'Wave-02 label-reconciliation count changed');
  same(wave02?.current_result?.closed_class_ids, INHERITED_CLOSED_IDS, 'Wave-02 closed class IDs changed');
  ok(wave02?.current_result?.wave_complete === false, 'Wave-02 residual denominator was incorrectly marked complete');
  ok(wave02?.current_result?.outside_human_dependency === false, 'Wave-02 outside-human dependency changed');
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    ok(wave02?.current_result?.[key] === 'none', `Wave-02 current_result.${key} changed`);
  }
}

function validateConstitution(constitution) {
  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-03-constitution@1', 'Wave-03 constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W03' && constitution?.issue === 1013, 'Wave-03 constitution identity changed');
  ok(constitution?.parent_custody?.wave_02_promotion_merge === WAVE02_PROMOTION_MERGE, 'Wave-03 parent promotion merge changed');
  ok(constitution?.parent_custody?.canonical_residual_classes === 42, 'Wave-03 canonical denominator changed');
  ok(constitution?.parent_custody?.closed_residual_classes === 6 && constitution?.parent_custody?.open_residual_classes === 36, 'Wave-03 launch arithmetic changed');
  ok(constitution?.closure_contract?.starting_closed_classes === 6 && constitution?.closure_contract?.starting_open_classes === 36, 'Wave-03 closure contract changed');
  ok(Array.isArray(constitution?.lane_attempts) && constitution.lane_attempts.length === 6, 'Wave-03 must retain six selected attempts');
  same(constitution.lane_attempts.map((row) => row.class_id), WAVE03_SELECTED_IDS, 'Wave-03 selected class order changed');
  ok(constitution.lane_attempts.every((row) => row.class_closed === false), 'Wave-03 constitution launch state was rewritten');
}

function validateRD01(closure, receipt, manifest, attempt) {
  ok(closure?.schema_version === 'ssc-residual-denominator-wave03-class-closure-reference@1', 'RD-01 closure schema changed');
  ok(closure?.wave_issue === 1013 && closure?.child_issue === 1014 && closure?.source_pr === 1022, 'RD-01 closure custody changed');
  ok(closure?.lane_id === 'RD-01' && closure?.class_id === 'RD-01-C06', 'RD-01 closure identity changed');
  ok(closure?.exact_label === RD01_LABEL, 'RD-01 closure label changed');
  ok(closure?.terminal_state === 'bounded_source_unavailable' && closure?.class_closed === true, 'RD-01 closure state changed');
  ok(closure?.product?.manifest_combined_sha256 === RD01_MANIFEST, 'RD-01 closure manifest changed');
  ok(closure?.product?.class_receipt_path === RECEIPT_PATH, 'RD-01 closure receipt path changed');
  same(closure?.residual_atlas_effect_if_promoted_after_wave02_six_closures, {
    canonical_classes: 42,
    open_before: 36,
    closed_before: 6,
    open_after: 35,
    closed_after: 7,
    wave03_selected_attempts_terminal_after_promotion: 1,
    wave_complete: false
  }, 'RD-01 residual-atlas effect changed');
  validateEffects(closure.authority, 'RD-01 closure authority');

  ok(receipt?.schema_version === 'ssc-rd01-wave03-class-receipt@1', 'RD-01 receipt schema changed');
  ok(receipt?.wave_id === 'SSC-RD-W03' && receipt?.lane_id === 'RD-01' && receipt?.class_id === 'RD-01-C06', 'RD-01 receipt identity changed');
  ok(receipt?.issue === 1014 && receipt?.source_pr === 1022, 'RD-01 receipt custody changed');
  ok(receipt?.class_label === RD01_LABEL, 'RD-01 receipt label changed');
  ok(receipt?.terminal_state === 'bounded_source_unavailable' && receipt?.class_closed === true, 'RD-01 receipt state changed');
  ok(receipt?.counts?.edition_rows === 3, 'RD-01 edition denominator changed');
  ok(receipt?.counts?.required_fields === 24 && receipt?.counts?.terminal_fields === 24, 'RD-01 terminal field denominator changed');
  ok(receipt?.counts?.observed_fields === 16 && receipt?.counts?.not_publicly_recovered_fields === 8, 'RD-01 field-state accounting changed');
  ok(receipt?.counts?.fixed_routes === 30 && receipt?.counts?.candidate_rows === 269, 'RD-01 fixed-protocol accounting changed');
  ok(receipt?.counts?.admitted_candidate_sources === 0, 'RD-01 admitted candidate-source count changed');
  ok(receipt?.counts?.prospective_future_re_evaluation_statements === 1, 'RD-01 prospective re-evaluation count changed');
  ok(receipt?.unresolved_limit?.missing_records_are_not_event_absence === true, 'RD-01 missing-record boundary changed');
  ok(receipt?.unresolved_limit?.prospective_re_evaluation_is_not_completed_re_evaluation === true, 'RD-01 prospective-re-evaluation boundary changed');
  validateEffects(receipt.authority, 'RD-01 receipt authority');

  ok(attempt?.lane_id === 'RD-01' && attempt?.issue === 1014, 'RD-01 constitution binding changed');
  ok(attempt?.exact_label === RD01_LABEL, 'RD-01 constitutional label changed');
  ok(receipt.class_label === attempt.exact_label, 'RD-01 receipt and constitution labels diverged');
  ok(manifest?.combined_sha256 === RD01_MANIFEST, 'RD-01 manifest object changed');
}

export function deriveCurrent(root = ROOT) {
  const wave02 = read(root, WAVE02_PATH);
  const constitution = read(root, CONSTITUTION_PATH);
  const closure = read(root, CLOSURE_PATH);
  const receipt = read(root, RECEIPT_PATH);
  const manifest = read(root, MANIFEST_PATH);

  validateWave02(wave02);
  validateConstitution(constitution);
  const byClass = new Map(constitution.lane_attempts.map((row) => [row.class_id, row]));
  validateRD01(closure, receipt, manifest, byClass.get('RD-01-C06'));

  const rd01Promotion = {
    lane_id: 'RD-01',
    class_id: 'RD-01-C06',
    issue: 1014,
    source_pr: 1022,
    merge_commit: RD01_MERGE,
    constitutional_exact_label: RD01_LABEL,
    receipt_class_label: RD01_LABEL,
    labels_exact_match: true,
    label_reconciliation: 'none',
    terminal_state: 'bounded_source_unavailable',
    closure_reference_path: CLOSURE_PATH,
    class_receipt_path: RECEIPT_PATH,
    manifest_combined_sha256: RD01_MANIFEST,
    class_closed: true
  };

  const selectedClassesOpen = OPEN_SELECTED_IDS.map((classId) => {
    const attempt = byClass.get(classId);
    ok(attempt, `${classId}: constitution attempt missing`);
    return {
      lane_id: attempt.lane_id,
      class_id: attempt.class_id,
      issue: attempt.issue,
      constitutional_exact_label: attempt.exact_label,
      state: 'open',
      class_closed: false
    };
  });

  const promotedClassReceipts = [
    ...wave02.promoted_class_receipts.map((row) => ({ ...row })),
    rd01Promotion
  ];
  const closedClassIds = [...INHERITED_CLOSED_IDS, 'RD-01-C06'];

  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-03-current@1',
    wave_id: 'SSC-RD-W03',
    hypothesis_id: 'SSC-H01',
    issue: 1013,
    as_of: '2026-08-04',
    authority: 'one_wave03_terminal_class_receipt_promoted_without_cross_lane_empirical_authority',
    source_snapshots: {
      wave_02_current_ledger_path: WAVE02_PATH,
      wave_02_cumulative_promotion_merge: WAVE02_PROMOTION_MERGE,
      wave_03_constitution_path: CONSTITUTION_PATH,
      rd01_closure_reference_path: CLOSURE_PATH,
      rd01_class_receipt_path: RECEIPT_PATH,
      rd01_merge_commit: RD01_MERGE
    },
    promoted_class_receipts: promotedClassReceipts,
    selected_classes_open: selectedClassesOpen,
    counts: {
      canonical_residual_classes: 42,
      classes_closed_before_wave: 6,
      wave_03_selected_class_attempts: 6,
      wave_03_terminal_class_receipts: 1,
      classes_closed_this_wave: 1,
      closed_residual_classes: 7,
      open_residual_classes: 35,
      label_reconciliations: 1,
      wave_03_label_reconciliations: 0,
      outside_human_dependencies: 0,
      external_contacts: 0,
      external_reviews: 0,
      reviewed_disposition_changes: 0,
      complete_compact_findings: 0,
      racial_order_findings: 0,
      prevalence_findings: 0,
      coordination_findings: 0,
      common_purpose_findings: 0,
      graph_effects: 0,
      publication_effects: 0,
      adoption_effects: 0
    },
    current_result: {
      terminal_state: 'one_of_six_wave03_selected_classes_terminal_seven_of_forty_two_residual_classes_closed',
      classes_closed: 7,
      classes_open: 35,
      closed_class_ids: closedClassIds,
      wave_03_selected_attempts_terminal: 1,
      open_selected_class_ids: [...OPEN_SELECTED_IDS],
      all_six_selected_classes_closed: false,
      wave_complete: false,
      residual_denominator_complete: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      wave_02_receipts_reopened_or_rewritten: false,
      one_wave03_class_closure_closes_lane: false,
      one_wave03_class_closure_closes_wave: false,
      bounded_source_unavailable_is_event_absence: false,
      not_publicly_recovered_is_nonoccurrence: false,
      prospective_re_evaluation_is_completed_re_evaluation: false,
      class_closure_is_selector_accuracy_or_technical_superiority: false,
      seven_closures_are_complete_compact: false,
      functional_convergence_is_coordination_or_common_purpose: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

function run() {
  const mode = process.argv[2] ?? '--check';
  const derived = deriveCurrent(ROOT);
  if (mode === '--write') {
    write(ROOT, CURRENT_PATH, derived);
    console.log('Wave-03 current ledger written: 35 open / 7 closed; RD-01-C06 promoted');
    return;
  }
  if (mode !== '--check') throw new Error(`unsupported mode: ${mode}`);
  const committed = read(ROOT, CURRENT_PATH);
  same(committed, derived, 'committed Wave-03 current ledger differs from deterministic derivation');
  console.log('Wave-03 current ledger: 35 open / 7 closed; RD-01-C06 promoted');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
