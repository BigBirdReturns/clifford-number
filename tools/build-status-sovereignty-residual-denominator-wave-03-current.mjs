#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CURRENT_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current.json';
export const SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json';
export const WAVE02_CURRENT_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const WAVE03_CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';
export const RD01_CLOSURE_PATH = 'data/project/ssc-residual-wave03/closures/RD-01-C06.json';
export const RD01_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/class-receipt.json';
export const RD01_MANIFEST_PATH = 'data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/manifest.json';

export const WAVE02_PROMOTION_MERGE = '2af6bb7819a37e51c7198fb48da894445a29e494';
export const WAVE03_CONSTITUTION_MERGE = 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2';
export const RD01_MERGE = 'c27e7d3cde2c94c1cde5d66dcce8eb06b514ff8a';
export const WAVE02_CURRENT_SHA256 = '2715f7e3a358b8b0b750d8814a8bdd918d69f1a41b75a481f5c979709518eeae';
export const WAVE03_CONSTITUTION_SHA256 = '25cc75ce1026e5b397d00f2da310d2bcdaf12507858c573b936345ebd51c8c5b';
export const RD01_CLOSURE_SHA256 = 'f2d495d60426fdadafdf5f2221fc4b42f20c2aa5f95d548ee33e665ad8beae7d';
export const RD01_RECEIPT_SHA256 = 'd805f6e19834ad273fdfc346ef21dd86265a56fab5801856e3fcfe84ba6f0626';
export const RD01_MANIFEST_SHA256 = 'e9a756c46379d1378b85ff67c371bc9e463dacfc0e8b42c1c9647cf090c44843';
export const RD01_PRODUCT_MANIFEST_SHA256 = '9b59871cf7ce40e68d0a2a89b41148a6c92b7201702d91a7724d1310ddbcc461';

export const INHERITED_CLOSED_IDS = Object.freeze([
  'RD-04-C01',
  'RD-05-C03',
  'RD-01-C03',
  'RD-06-C01',
  'RD-03-C04',
  'RD-02-C04'
]);

export const OPEN_WAVE03_IDS = Object.freeze([
  'RD-02-C05',
  'RD-03-C05',
  'RD-04-C02',
  'RD-05-C02',
  'RD-06-C04'
]);

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const sha256 = (root, rel) => crypto.createHash('sha256').update(fs.readFileSync(abs(root, rel))).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const clone = (value) => structuredClone(value);

export function readPromotionSources(root = ROOT) {
  return {
    wave02: read(root, WAVE02_CURRENT_PATH),
    constitution: read(root, WAVE03_CONSTITUTION_PATH),
    closure: read(root, RD01_CLOSURE_PATH),
    receipt: read(root, RD01_RECEIPT_PATH),
    manifest: read(root, RD01_MANIFEST_PATH),
    hashes: {
      wave02: sha256(root, WAVE02_CURRENT_PATH),
      constitution: sha256(root, WAVE03_CONSTITUTION_PATH),
      closure: sha256(root, RD01_CLOSURE_PATH),
      receipt: sha256(root, RD01_RECEIPT_PATH),
      manifest: sha256(root, RD01_MANIFEST_PATH)
    }
  };
}

export function validatePromotionSources(bundle) {
  const { wave02, constitution, closure, receipt, manifest, hashes } = bundle;

  ok(hashes?.wave02 === WAVE02_CURRENT_SHA256, 'Wave-02 current-ledger bytes changed');
  ok(hashes?.constitution === WAVE03_CONSTITUTION_SHA256, 'Wave-03 constitution bytes changed');
  ok(hashes?.closure === RD01_CLOSURE_SHA256, 'RD-01 closure bytes changed');
  ok(hashes?.receipt === RD01_RECEIPT_SHA256, 'RD-01 receipt bytes changed');
  ok(hashes?.manifest === RD01_MANIFEST_SHA256, 'RD-01 manifest bytes changed');

  ok(wave02?.schema_version === 'status-sovereignty-residual-denominator-wave-02-current@1', 'Wave-02 parent schema changed');
  ok(wave02?.wave_id === 'SSC-RD-W02' && wave02?.issue === 785, 'Wave-02 parent identity changed');
  ok(wave02?.authority === 'six_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'Wave-02 parent authority changed');
  ok(wave02?.counts?.canonical_residual_classes === 42, 'Wave-02 canonical denominator changed');
  ok(wave02?.counts?.terminal_class_receipts === 6, 'Wave-02 terminal-receipt count changed');
  ok(wave02?.counts?.closed_residual_classes === 6 && wave02?.counts?.open_residual_classes === 36, 'Wave-02 parent arithmetic changed');
  ok(Array.isArray(wave02?.promoted_class_receipts) && wave02.promoted_class_receipts.length === 6, 'Wave-02 inherited receipt denominator changed');
  same(wave02.current_result?.closed_class_ids, INHERITED_CLOSED_IDS, 'Wave-02 inherited closure order changed');
  ok(wave02.current_result?.all_six_selected_classes_closed === true && wave02.current_result?.wave_complete === false, 'Wave-02 parent completion boundary changed');

  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-03-constitution@1', 'Wave-03 constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W03' && constitution?.issue === 1013, 'Wave-03 constitution identity changed');
  ok(constitution?.parent_custody?.wave_02_promotion_merge === WAVE02_PROMOTION_MERGE, 'Wave-03 Wave-02 parent merge changed');
  ok(constitution?.parent_custody?.closed_residual_classes === 6 && constitution?.parent_custody?.open_residual_classes === 36, 'Wave-03 launch arithmetic changed');
  ok(constitution?.closure_contract?.attempted_classes === 6, 'Wave-03 attempt denominator changed');
  ok(Array.isArray(constitution?.lane_attempts) && constitution.lane_attempts.length === 6, 'Wave-03 lane denominator changed');

  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-01-C06');
  ok(attempt?.lane_id === 'RD-01' && attempt?.issue === 1014, 'RD-01 constitutional identity changed');
  ok(attempt?.exact_label === 'methodology correction, appeal, and re-evaluation records', 'RD-01 constitutional label changed');
  ok(attempt?.initial_unit_count === 3, 'RD-01 constitutional unit denominator changed');

  ok(closure?.schema_version === 'ssc-residual-denominator-wave03-class-closure-reference@1', 'RD-01 closure schema changed');
  ok(closure?.wave_issue === 1013 && closure?.child_issue === 1014 && closure?.source_pr === 1022, 'RD-01 closure custody changed');
  ok(closure?.lane_id === 'RD-01' && closure?.class_id === 'RD-01-C06', 'RD-01 closure identity changed');
  ok(closure?.exact_label === attempt.exact_label, 'RD-01 closure label changed');
  ok(closure?.terminal_state === 'bounded_source_unavailable' && closure?.class_closed === true, 'RD-01 closure state changed');
  ok(closure?.product?.manifest_combined_sha256 === RD01_PRODUCT_MANIFEST_SHA256, 'RD-01 closure manifest changed');
  same(closure?.residual_atlas_effect_if_promoted_after_wave02_six_closures, {
    canonical_classes: 42,
    open_before: 36,
    closed_before: 6,
    open_after: 35,
    closed_after: 7,
    wave03_selected_attempts_terminal_after_promotion: 1,
    wave_complete: false
  }, 'RD-01 residual-atlas effect changed');

  ok(receipt?.schema_version === 'ssc-rd01-wave03-class-receipt@1', 'RD-01 receipt schema changed');
  ok(receipt?.wave_id === 'SSC-RD-W03' && receipt?.lane_id === 'RD-01' && receipt?.class_id === 'RD-01-C06', 'RD-01 receipt identity changed');
  ok(receipt?.issue === 1014 && receipt?.source_pr === 1022, 'RD-01 receipt custody changed');
  ok(receipt?.class_label === attempt.exact_label, 'RD-01 receipt label changed');
  ok(receipt?.terminal_state === 'bounded_source_unavailable' && receipt?.class_closed === true, 'RD-01 receipt terminal state changed');
  ok(receipt?.counts?.edition_rows === 3 && receipt?.counts?.required_fields === 24 && receipt?.counts?.terminal_fields === 24, 'RD-01 receipt denominator changed');
  ok(receipt?.counts?.observed_fields === 16 && receipt?.counts?.not_publicly_recovered_fields === 8, 'RD-01 receipt field accounting changed');
  ok(receipt?.counts?.prospective_future_re_evaluation_statements === 1, 'RD-01 prospective re-evaluation count changed');
  ok(receipt?.counts?.completed_correction_or_errata_records === 0 && receipt?.counts?.published_formal_appeal_routes === 0 && receipt?.counts?.completed_reranking_or_changed_disposition_records === 0, 'RD-01 completion claims changed');
  ok(receipt?.unresolved_limit?.missing_records_are_not_event_absence === true, 'RD-01 missing-record boundary weakened');
  ok(receipt?.unresolved_limit?.prospective_re_evaluation_is_not_completed_re_evaluation === true, 'RD-01 prospective/completed boundary weakened');

  ok(manifest?.schema_version === 'ssc-rd01-wave03-terminal-product-manifest@1', 'RD-01 manifest schema changed');
  ok(manifest?.entry_count === 3 && Array.isArray(manifest?.entries) && manifest.entries.length === 3, 'RD-01 manifest denominator changed');
  ok(manifest?.combined_sha256 === RD01_PRODUCT_MANIFEST_SHA256, 'RD-01 product digest changed');

  for (const source of [closure.authority, receipt.authority]) {
    ok(source?.outside_human_dependency === false, 'outside-human dependency introduced');
    ok(source?.external_contacts === 0 && source?.external_reviews === 0, 'external contact or review invented');
    ok(source?.reviewed_disposition_changed === false, 'reviewed disposition changed');
    ok(source?.coordination_finding === false && source?.common_purpose_finding === false, 'coordination or common-purpose finding invented');
    ok(source?.publication_effect === 'none' && source?.adoption_effect === 'none' && source?.graph_effect === 'none', 'authority effect escalated');
  }

  return bundle;
}

function openSelectedAttempts(constitution) {
  return constitution.lane_attempts.slice(1).map((row) => ({
    lane_id: row.lane_id,
    class_id: row.class_id,
    issue: row.issue,
    constitutional_exact_label: row.exact_label,
    state: 'open',
    class_closed: false
  }));
}

export function buildCurrentValue(bundle = readPromotionSources(ROOT)) {
  validatePromotionSources(bundle);
  const { wave02, constitution, closure, receipt, manifest } = bundle;
  const rd01Attempt = constitution.lane_attempts[0];
  const inherited = clone(wave02.promoted_class_receipts);
  const promoted = [{
    lane_id: 'RD-01',
    class_id: 'RD-01-C06',
    issue: 1014,
    source_pr: 1022,
    merge_commit: RD01_MERGE,
    constitutional_exact_label: rd01Attempt.exact_label,
    receipt_class_label: receipt.class_label,
    labels_exact_match: receipt.class_label === rd01Attempt.exact_label,
    label_reconciliation: 'none',
    terminal_state: receipt.terminal_state,
    closure_reference_path: RD01_CLOSURE_PATH,
    class_receipt_path: RD01_RECEIPT_PATH,
    manifest_combined_sha256: manifest.combined_sha256,
    class_closed: true
  }];
  const open = openSelectedAttempts(constitution);
  const closedIds = [...INHERITED_CLOSED_IDS, 'RD-01-C06'];

  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-03-current@1',
    wave_id: 'SSC-RD-W03',
    hypothesis_id: 'SSC-H01',
    issue: 1013,
    as_of: '2026-08-04',
    authority: 'seven_terminal_class_receipts_promoted_without_cross_lane_empirical_authority',
    parent_custody: {
      wave_02_issue: 785,
      wave_02_cumulative_promotion_pr: 1012,
      wave_02_promotion_merge: WAVE02_PROMOTION_MERGE,
      wave_02_current_ledger_path: WAVE02_CURRENT_PATH,
      wave_02_current_ledger_sha256: WAVE02_CURRENT_SHA256,
      wave_02_current_is_historical_parent: true,
      wave_03_constitution_pr: 1020,
      wave_03_constitution_merge: WAVE03_CONSTITUTION_MERGE,
      wave_03_constitution_path: WAVE03_CONSTITUTION_PATH,
      wave_03_constitution_sha256: WAVE03_CONSTITUTION_SHA256,
      rd01_source_pr: 1022,
      rd01_merge_commit: RD01_MERGE,
      canonical_residual_classes: 42,
      closed_before_wave_03: 6,
      open_before_wave_03: 36
    },
    inherited_closed_class_receipts: inherited,
    promoted_wave_03_class_receipts: promoted,
    selected_wave_03_classes_open: open,
    counts: {
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
      label_reconciliations_total: 1,
      outside_human_dependencies: 0,
      external_contacts: 0,
      external_reviews: 0,
      reviewed_disposition_changes: 0,
      selector_accuracy_findings: 0,
      technical_superiority_findings: 0,
      favoritism_findings: 0,
      extraction_findings: 0,
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
      terminal_state: 'seven_of_forty_two_residual_classes_closed_one_wave03_selected_attempt_terminal',
      classes_closed: 7,
      classes_open: 35,
      closed_class_ids: closedIds,
      open_wave_03_selected_class_ids: [...OPEN_WAVE03_IDS],
      wave_03_selected_attempts_terminal: 1,
      all_six_wave_03_selected_classes_closed: false,
      wave_03_complete: false,
      complete_compact: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      wave_02_current_ledger_is_rewritten: false,
      inherited_class_receipt_is_reopened: false,
      one_wave_03_class_closure_closes_lane: false,
      one_wave_03_class_closure_closes_wave: false,
      seven_total_class_closures_complete_compact: false,
      not_publicly_recovered_is_event_absence: false,
      prospective_re_evaluation_is_completed_re_evaluation: false,
      methodology_change_is_correction: false,
      later_edition_is_prior_row_reconsideration: false,
      missing_public_appeal_route_is_no_appeal_or_challenge: false,
      rank_is_technical_superiority_or_causal_treatment: false,
      functional_convergence_is_coordination_or_common_purpose: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

function writeCurrent(root, value) {
  fs.mkdirSync(path.dirname(abs(root, CURRENT_PATH)), { recursive: true });
  fs.writeFileSync(abs(root, CURRENT_PATH), `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const mode = process.argv[2] ?? '--check';
  const expected = buildCurrentValue(readPromotionSources(ROOT));
  if (mode === '--write') {
    writeCurrent(ROOT, expected);
    console.log(`wrote ${CURRENT_PATH}: 42 canonical, 7 closed, 35 open`);
    return;
  }
  if (mode !== '--check') throw new Error(`unknown mode: ${mode}`);
  const current = read(ROOT, CURRENT_PATH);
  same(current, expected, `${CURRENT_PATH} drifted from exact source receipts`);
  console.log('build-status-sovereignty-residual-denominator-wave-03-current: exact 42 / 7 / 35 derivation passed');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { main(); }
  catch (error) {
    console.error(`build-status-sovereignty-residual-denominator-wave-03-current: ${error.message}`);
    process.exit(1);
  }
}
