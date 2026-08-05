#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CURRENT_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current.json';
export const WAVE02_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';

export const RD01_CLOSURE_PATH = 'data/project/ssc-residual-wave03/closures/RD-01-C06.json';
export const RD01_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/class-receipt.json';
export const RD01_MANIFEST_PATH = 'data/research/status-sovereignty-rd-wave03-rd01-methodology-correction/manifest.json';
export const RD03_CLOSURE_PATH = 'data/project/ssc-residual-wave03/closures/RD-03-C05.json';
export const RD03_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/class-receipt.json';
export const RD03_MANIFEST_PATH = 'data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/manifest.json';
export const RD02_CLOSURE_PATH = 'data/project/ssc-residual-wave03/closures/RD-02-C05.json';
export const RD02_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/class-receipt.json';
export const RD02_MANIFEST_PATH = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manifest.json';

export const WAVE02_PROMOTION_MERGE = '2af6bb7819a37e51c7198fb48da894445a29e494';
export const RD01_MERGE = 'c27e7d3cde2c94c1cde5d66dcce8eb06b514ff8a';
export const RD03_MERGE = 'eadf234983ae61eb25286c9472435c052a241854';
export const RD02_MERGE = '61a33f5459e64f1978d9c55c1b7ea7f925358cd8';
export const RD01_MANIFEST = '9b59871cf7ce40e68d0a2a89b41148a6c92b7201702d91a7724d1310ddbcc461';
export const RD03_MANIFEST = '595b2d1fd0a2315657935d44c87d984dd33043eff1f33b6b0e209c689299a35a';
export const RD02_MANIFEST = '068330d24a8bc378964cee2d88c3ebe1c5b48b36154f58636e72d78d40e71e82';
export const RD01_LABEL = 'methodology correction, appeal, and re-evaluation records';
export const RD03_LABEL = 'commitment, closing, draw, disbursement, amendment, waiver, default, cure, repayment, and recovery chronology';
export const RD03_RECEIPT_LABEL = 'commitment through repayment and public recovery chronology';
export const RD02_LABEL = 'complete portfolio investment, follow-on, exit, write-off, default, return, and repayment ledger';
export const RD03_LABEL_RECONCILIATION = 'receipt_label_summarizes_the_constitutional_scope_as_commitment_through_repayment_and_public_recovery_chronology; class identity remains bound by RD-03-C05, issue 1016, and the exact closure label';

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

export const CLOSED_IDS = Object.freeze([
  ...INHERITED_CLOSED_IDS,
  'RD-01-C06',
  'RD-03-C05',
  'RD-02-C05'
]);

export const OPEN_SELECTED_IDS = Object.freeze([
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

function validateNoFindings(value, prefix) {
  for (const key of [
    'reviewed_disposition_changed',
    'favoritism_finding',
    'extraction_finding',
    'public_recovery_finding',
    'coordination_finding',
    'common_purpose_finding'
  ]) {
    ok(value?.[key] === false, `${prefix}.${key} changed`);
  }
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
  ok(closure?.product?.class_receipt_path === RD01_RECEIPT_PATH, 'RD-01 closure receipt path changed');
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
  ok(receipt?.counts?.required_fields === 24 && receipt?.counts?.terminal_fields === 24, 'RD-01 terminal field denominator changed');
  ok(receipt?.counts?.fixed_routes === 30 && receipt?.counts?.candidate_rows === 269, 'RD-01 fixed-protocol accounting changed');
  ok(receipt?.counts?.admitted_candidate_sources === 0, 'RD-01 admitted candidate-source count changed');
  ok(receipt?.unresolved_limit?.missing_records_are_not_event_absence === true, 'RD-01 missing-record boundary changed');
  validateEffects(receipt.authority, 'RD-01 receipt authority');

  ok(attempt?.lane_id === 'RD-01' && attempt?.issue === 1014, 'RD-01 constitution binding changed');
  ok(attempt?.exact_label === RD01_LABEL, 'RD-01 constitutional label changed');
  ok(receipt.class_label === attempt.exact_label, 'RD-01 receipt and constitution labels diverged');
  ok(manifest?.combined_sha256 === RD01_MANIFEST, 'RD-01 manifest object changed');
}

function validateRD03(closure, receipt, manifest, attempt) {
  ok(closure?.schema_version === 'ssc-residual-denominator-wave03-class-closure-reference@1', 'RD-03 closure schema changed');
  ok(closure?.wave_issue === 1013 && closure?.child_issue === 1016 && closure?.source_pr === 1057, 'RD-03 closure custody changed');
  ok(closure?.lane_id === 'RD-03' && closure?.class_id === 'RD-03-C05', 'RD-03 closure identity changed');
  ok(closure?.exact_label === RD03_LABEL, 'RD-03 closure label changed');
  ok(closure?.terminal_state === 'bounded_source_restricted' && closure?.class_closed === true, 'RD-03 closure state changed');
  ok(closure?.product?.manifest_combined_sha256 === RD03_MANIFEST, 'RD-03 closure manifest changed');
  ok(closure?.product?.class_receipt_path === RD03_RECEIPT_PATH, 'RD-03 closure receipt path changed');
  same(closure?.residual_atlas_effect_if_promoted_after_rd01_wave03_closure, {
    canonical_classes: 42,
    open_before: 35,
    closed_before: 7,
    open_after: 34,
    closed_after: 8,
    wave03_selected_attempts_terminal_after_promotion: 2,
    wave_complete: false
  }, 'RD-03 residual-atlas effect changed');
  validateEffects(closure.authority, 'RD-03 closure authority');
  validateNoFindings(closure.authority, 'RD-03 closure authority');
  ok(closure?.authority?.denominator_widened === false, 'RD-03 closure denominator widened');

  ok(receipt?.schema_version === 'ssc-rd03-wave03-class-receipt@1', 'RD-03 receipt schema changed');
  ok(receipt?.wave_id === 'SSC-RD-W03' && receipt?.lane_id === 'RD-03' && receipt?.class_id === 'RD-03-C05', 'RD-03 receipt identity changed');
  ok(receipt?.issue === 1016 && receipt?.source_pr === 1057, 'RD-03 receipt custody changed');
  ok(receipt?.class_label === RD03_RECEIPT_LABEL, 'RD-03 receipt label changed');
  ok(receipt?.terminal_state === 'bounded_source_restricted' && receipt?.class_closed === true, 'RD-03 receipt state changed');
  same(receipt?.counts, {
    instrument_rows: 5,
    required_fields_per_instrument: 11,
    required_fields: 55,
    terminal_fields: 55,
    observed_fields: 23,
    conditional_term_only_fields: 4,
    source_restricted_fields: 28,
    source_unavailable_after_fixed_protocol_fields: 0,
    not_publicly_recovered_fields: 0,
    not_applicable_by_instrument_state_fields: 0,
    closed_instruments: 5,
    executed_and_cash_disbursed_instruments: 1,
    conditional_pre_close_instruments: 4,
    fixed_routes: 43,
    route_attempts: 43,
    transport_completions: 43,
    transport_failures: 0,
    http_successes: 31,
    exact_source_restrictions: 12,
    exact_regulatory_api_successes: 6,
    candidate_census_routes: 25,
    candidate_rows: 250,
    unique_candidate_urls: 10,
    admitted_candidate_sources: 0,
    result_spawned_requests: 0,
    admitted_amendment_or_waiver_records: 0,
    admitted_default_cure_acceleration_or_enforcement_records: 0,
    admitted_interest_payment_records: 0,
    admitted_principal_repayment_records: 0,
    admitted_public_recovery_records: 0,
    external_contacts: 0,
    external_reviews: 0
  }, 'RD-03 class-receipt counts changed');
  ok(receipt?.unresolved_limit?.missing_records_are_not_event_absence === true, 'RD-03 missing-record boundary changed');
  ok(receipt?.unresolved_limit?.outstanding_balance_is_not_default === true, 'RD-03 outstanding-balance boundary changed');
  ok(receipt?.unresolved_limit?.scheduled_payment_is_not_observed_payment === true, 'RD-03 scheduled-payment boundary changed');
  ok(receipt?.unresolved_limit?.automatic_additional_search_pass_authorized === false, 'RD-03 automatic-search boundary changed');
  validateEffects(receipt.authority, 'RD-03 receipt authority');
  validateNoFindings(receipt.authority, 'RD-03 receipt authority');
  ok(receipt?.authority?.denominator_widened === false, 'RD-03 receipt denominator widened');

  ok(attempt?.lane_id === 'RD-03' && attempt?.issue === 1016, 'RD-03 constitution binding changed');
  ok(attempt?.exact_label === RD03_LABEL, 'RD-03 constitutional label changed');
  ok(receipt.class_label !== attempt.exact_label, 'RD-03 label reconciliation unexpectedly disappeared');
  ok(manifest?.combined_sha256 === RD03_MANIFEST, 'RD-03 manifest object changed');
}


function validateRD02(closure, receipt, manifest, attempt) {
  ok(closure?.schema_version === 'ssc-residual-denominator-wave03-class-closure-reference@1', 'RD-02 closure schema changed');
  ok(closure?.wave_issue === 1013 && closure?.child_issue === 1015 && closure?.source_pr === 1098, 'RD-02 closure custody changed');
  ok(closure?.lane_id === 'RD-02' && closure?.class_id === 'RD-02-C05', 'RD-02 closure identity changed');
  ok(closure?.exact_label === RD02_LABEL, 'RD-02 closure label changed');
  ok(closure?.terminal_state === 'bounded_source_unavailable' && closure?.class_closed === true, 'RD-02 closure state changed');
  ok(closure?.product?.manifest_combined_sha256 === RD02_MANIFEST, 'RD-02 closure manifest changed');
  ok(closure?.product?.class_receipt_path === RD02_RECEIPT_PATH, 'RD-02 closure receipt path changed');
  same(closure?.residual_atlas_effect_if_promoted, {
    canonical_classes: 42,
    open_before: 34,
    closed_before: 8,
    open_after: 33,
    closed_after: 9
  }, 'RD-02 residual-atlas effect changed');
  same(closure?.source_custody, {
    canonical_source_merge: '41a1e46f8981001aeaf027662ed2f16ad9468d99',
    admitted_leaf_sources: 2,
    admitted_bounded_observations: 11,
    lifecycle_events_observed: 0,
    fixed_protocol_complete: true,
    automatic_additional_search_pass_authorized: false
  }, 'RD-02 source custody changed');
  validateEffects(closure.authority, 'RD-02 closure authority');
  for (const key of [
    'reviewed_disposition_changed',
    'complete_compact_finding',
    'capital_conversion_finding',
    'favoritism_finding',
    'extraction_finding',
    'coordination_finding',
    'common_purpose_finding',
    'racial_order_finding',
    'prevalence_finding'
  ]) ok(closure?.authority?.[key] === false, `RD-02 closure authority.${key} changed`);

  ok(receipt?.schema_version === 'ssc-rd-wave03-rd02-portfolio-lifecycle-class-receipt@1', 'RD-02 receipt schema changed');
  ok(receipt?.wave_id === 'SSC-RD-W03' && receipt?.lane_id === 'RD-02' && receipt?.class_id === 'RD-02-C05', 'RD-02 receipt identity changed');
  ok(receipt?.issue === 1015, 'RD-02 receipt issue changed');
  ok(receipt?.class_label === RD02_LABEL, 'RD-02 receipt label changed');
  ok(receipt?.terminal_state === 'bounded_source_unavailable' && receipt?.class_closed === true, 'RD-02 receipt state changed');
  same(receipt?.label_custody, {
    constitutional_class_label: RD02_LABEL,
    seed_closure_target: RD02_LABEL,
    labels_exact_match: true,
    reconciliation: 'none'
  }, 'RD-02 receipt label custody changed');
  same(receipt?.counts, {
    cohort_rows: 18,
    publicly_named_rows: 17,
    identity_withheld_rows: 1,
    required_fields_per_row: 10,
    required_fields: 180,
    observed_fields: 53,
    identity_withheld_under_policy_fields: 1,
    source_restricted_fields: 7,
    not_publicly_recovered_fields: 119,
    terminal_fields: 180,
    bounded_source_unavailable_rows: 17,
    bounded_source_restricted_rows: 1,
    search_routes: 51,
    unique_search_candidates: 210,
    candidate_followup_routes: 10,
    same_host_followup_routes: 5,
    disclosure_leaf_routes: 2,
    failed_route_replays: 1,
    admitted_leaf_sources: 2,
    admitted_bounded_observations: 11,
    lifecycle_events_observed: 0,
    publicly_identified_portfolio_investments_observed: 0,
    publicly_identified_follow_on_investments_observed: 0,
    publicly_identified_exits_observed: 0,
    publicly_identified_write_offs_or_realized_losses_observed: 0,
    publicly_identified_defaults_or_cures_observed: 0,
    publicly_identified_realized_fund_returns_observed: 0,
    sba_repayment_or_loss_allocation_events_observed: 0,
    result_spawned_requests: 0,
    external_contacts: 0,
    external_reviews: 0
  }, 'RD-02 class-receipt counts changed');
  same(receipt?.residual_atlas_effect_if_promoted, {
    canonical_classes: 42,
    open_before: 34,
    closed_before: 8,
    open_after: 33,
    closed_after: 9
  }, 'RD-02 receipt residual-atlas effect changed');
  ok(receipt?.current_result?.fixed_protocol_complete === true, 'RD-02 fixed-protocol state changed');
  ok(receipt?.current_result?.automatic_additional_search_pass_authorized === false, 'RD-02 automatic-search boundary changed');
  ok(receipt?.current_result?.all_eighteen_rows_preserved === true, 'RD-02 row denominator changed');
  ok(receipt?.current_result?.all_one_hundred_eighty_fields_terminal === true, 'RD-02 terminal field state changed');
  ok(receipt?.current_result?.complete_portfolio_lifecycle_ledger_observed === false, 'RD-02 complete-ledger observation was invented');
  ok(receipt?.current_result?.admitted_leaf_sources === 2 && receipt?.current_result?.admitted_bounded_observations === 11, 'RD-02 admitted source custody changed');
  ok(receipt?.current_result?.lifecycle_events_observed === 0, 'RD-02 lifecycle event count changed');
  ok(receipt?.current_result?.class_closed === true, 'RD-02 receipt reopened');
  validateEffects(receipt.authority, 'RD-02 receipt authority');
  for (const location of [receipt.current_result, receipt.authority]) {
    for (const key of [
      'reviewed_disposition_changed',
      'complete_compact_finding',
      'capital_conversion_finding',
      'favoritism_finding',
      'extraction_finding',
      'coordination_finding',
      'common_purpose_finding',
      'racial_order_finding',
      'prevalence_finding'
    ]) ok(location?.[key] === false, `RD-02 ${key} changed`);
  }
  for (const [key, expected] of Object.entries({
    program_projection_is_fund_investment: false,
    private_capital_commitment_is_portfolio_investment: false,
    manager_lineage_is_vehicle_lifecycle: false,
    fund_investment_is_follow_on_or_exit: false,
    exit_is_positive_realized_return: false,
    missing_public_write_off_is_no_loss: false,
    missing_public_default_is_no_default: false,
    missing_public_return_is_zero_return: false,
    private_return_is_sba_repayment_or_public_recovery: false,
    license_or_leverage_eligibility_is_sba_repayment: false,
    search_candidate_is_admitted_source: false,
    search_silence_is_event_absence: false,
    not_publicly_recovered_is_event_nonoccurrence: false,
    source_restricted_is_nonparticipation: false,
    withheld_identity_is_nonparticipation: false,
    class_closure_is_complete_compact: false,
    capital_conversion_finding: false,
    favoritism_finding: false,
    extraction_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    racial_order_finding: false,
    prevalence_finding: false
  })) ok(receipt?.boundaries?.[key] === expected, `RD-02 receipt boundary ${key} changed`);
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) {
    ok(receipt?.boundaries?.[key] === 'none', `RD-02 receipt boundary ${key} changed`);
  }

  ok(attempt?.lane_id === 'RD-02' && attempt?.issue === 1015, 'RD-02 constitution binding changed');
  ok(attempt?.exact_label === RD02_LABEL, 'RD-02 constitutional label changed');
  ok(receipt.class_label === attempt.exact_label, 'RD-02 exact label custody changed');
  ok(manifest?.combined_sha256 === RD02_MANIFEST, 'RD-02 manifest object changed');
}

function promotionFromWave02(row) {
  return { ...row };
}

export function deriveCurrent(root = ROOT) {
  const wave02 = read(root, WAVE02_PATH);
  const constitution = read(root, CONSTITUTION_PATH);
  const rd01Closure = read(root, RD01_CLOSURE_PATH);
  const rd01Receipt = read(root, RD01_RECEIPT_PATH);
  const rd01Manifest = read(root, RD01_MANIFEST_PATH);
  const rd03Closure = read(root, RD03_CLOSURE_PATH);
  const rd03Receipt = read(root, RD03_RECEIPT_PATH);
  const rd03Manifest = read(root, RD03_MANIFEST_PATH);
  const rd02Closure = read(root, RD02_CLOSURE_PATH);
  const rd02Receipt = read(root, RD02_RECEIPT_PATH);
  const rd02Manifest = read(root, RD02_MANIFEST_PATH);

  validateWave02(wave02);
  validateConstitution(constitution);
  const byClass = new Map(constitution.lane_attempts.map((row) => [row.class_id, row]));
  validateRD01(rd01Closure, rd01Receipt, rd01Manifest, byClass.get('RD-01-C06'));
  validateRD03(rd03Closure, rd03Receipt, rd03Manifest, byClass.get('RD-03-C05'));
  validateRD02(rd02Closure, rd02Receipt, rd02Manifest, byClass.get('RD-02-C05'));

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
    closure_reference_path: RD01_CLOSURE_PATH,
    class_receipt_path: RD01_RECEIPT_PATH,
    manifest_combined_sha256: RD01_MANIFEST,
    class_closed: true
  };

  const rd03Promotion = {
    lane_id: 'RD-03',
    class_id: 'RD-03-C05',
    issue: 1016,
    source_pr: 1057,
    merge_commit: RD03_MERGE,
    constitutional_exact_label: RD03_LABEL,
    receipt_class_label: RD03_RECEIPT_LABEL,
    labels_exact_match: false,
    label_reconciliation: RD03_LABEL_RECONCILIATION,
    terminal_state: 'bounded_source_restricted',
    closure_reference_path: RD03_CLOSURE_PATH,
    class_receipt_path: RD03_RECEIPT_PATH,
    manifest_combined_sha256: RD03_MANIFEST,
    class_closed: true
  };


  const rd02Promotion = {
    lane_id: 'RD-02',
    class_id: 'RD-02-C05',
    issue: 1015,
    source_pr: 1098,
    merge_commit: RD02_MERGE,
    constitutional_exact_label: RD02_LABEL,
    receipt_class_label: RD02_LABEL,
    labels_exact_match: true,
    label_reconciliation: 'none',
    terminal_state: 'bounded_source_unavailable',
    closure_reference_path: RD02_CLOSURE_PATH,
    class_receipt_path: RD02_RECEIPT_PATH,
    manifest_combined_sha256: RD02_MANIFEST,
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

  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-03-current@1',
    wave_id: 'SSC-RD-W03',
    hypothesis_id: 'SSC-H01',
    issue: 1013,
    as_of: '2026-08-04',
    authority: 'three_wave03_terminal_class_receipts_promoted_without_cross_lane_empirical_authority',
    source_snapshots: {
      wave_02_current_ledger_path: WAVE02_PATH,
      wave_02_cumulative_promotion_merge: WAVE02_PROMOTION_MERGE,
      wave_03_constitution_path: CONSTITUTION_PATH,
      rd01_closure_reference_path: RD01_CLOSURE_PATH,
      rd01_class_receipt_path: RD01_RECEIPT_PATH,
      rd01_merge_commit: RD01_MERGE,
      rd03_closure_reference_path: RD03_CLOSURE_PATH,
      rd03_class_receipt_path: RD03_RECEIPT_PATH,
      rd03_merge_commit: RD03_MERGE,
      rd02_closure_reference_path: RD02_CLOSURE_PATH,
      rd02_class_receipt_path: RD02_RECEIPT_PATH,
      rd02_merge_commit: RD02_MERGE
    },
    promoted_class_receipts: [
      ...wave02.promoted_class_receipts.map(promotionFromWave02),
      rd01Promotion,
      rd03Promotion,
      rd02Promotion
    ],
    selected_classes_open: selectedClassesOpen,
    counts: {
      canonical_residual_classes: 42,
      classes_closed_before_wave: 6,
      wave_03_selected_class_attempts: 6,
      wave_03_terminal_class_receipts: 3,
      classes_closed_this_wave: 3,
      closed_residual_classes: 9,
      open_residual_classes: 33,
      label_reconciliations: 2,
      wave_03_label_reconciliations: 1,
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
      terminal_state: 'three_of_six_wave03_selected_classes_terminal_nine_of_forty_two_residual_classes_closed',
      classes_closed: 9,
      classes_open: 33,
      closed_class_ids: [...CLOSED_IDS],
      wave_03_selected_attempts_terminal: 3,
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
      bounded_source_restricted_is_event_absence: false,
      not_publicly_recovered_is_nonoccurrence: false,
      prospective_re_evaluation_is_completed_re_evaluation: false,
      outstanding_balance_is_default: false,
      scheduled_payment_is_observed_payment: false,
      class_closure_is_selector_accuracy_or_technical_superiority: false,
      nine_closures_are_complete_compact: false,
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
    console.log('Wave-03 current ledger written: 33 open / 9 closed; RD-01-C06, RD-03-C05, and RD-02-C05 promoted');
    return;
  }
  if (mode !== '--check') throw new Error(`unsupported mode: ${mode}`);
  const committed = read(ROOT, CURRENT_PATH);
  same(committed, derived, 'committed Wave-03 current ledger differs from deterministic derivation');
  console.log('Wave-03 current ledger: 33 open / 9 closed; RD-01-C06, RD-03-C05, and RD-02-C05 promoted');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
