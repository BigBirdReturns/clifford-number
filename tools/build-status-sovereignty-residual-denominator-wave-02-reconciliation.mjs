#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECONCILIATION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-reconciliation.json';
export const CURRENT_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const WAVE01_PATH = 'data/research/status-sovereignty-residual-denominator-wave-01.json';
export const CURRENT_LEDGER_PROMOTION_PR = 1012;
export const CURRENT_LEDGER_PROMOTION_MERGE = '2af6bb7819a37e51c7198fb48da894445a29e494';

export const EXPECTED_RECEIPTS = Object.freeze([
  {
    "lane_id": "RD-04",
    "class_id": "RD-04-C01",
    "issue": 789,
    "source_pr": 804,
    "merge_commit": "7b21d1f2b0606a5550b9c26fadc0cb465ba88b7e",
    "constitutional_exact_label": "current statutory, regulatory, and guidance version history after the 2025 law",
    "receipt_class_label": "current statutory, regulatory, and guidance version history after the 2025 law",
    "labels_exact_match": true,
    "label_reconciliation": "none",
    "terminal_state": "bounded_source_unavailable",
    "closure_reference_path": "data/project/ssc-residual-wave02/closures/RD-04-C01.json",
    "class_receipt_path": "data/research/status-sovereignty-rd-wave02-rd04-version-history/class-receipt.json",
    "manifest_combined_sha256": "b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b",
    "class_closed": true
  },
  {
    "lane_id": "RD-05",
    "class_id": "RD-05-C03",
    "issue": 790,
    "source_pr": 805,
    "merge_commit": "209c30585301a1069507d2e6b16db62ff4ffe1bd",
    "constitutional_exact_label": "complete recommendation, agency response, adoption, rejection, implementation, and outcome ledger",
    "receipt_class_label": "recommendation, agency response, adoption, rejection, implementation, and outcome ledger",
    "labels_exact_match": false,
    "label_reconciliation": "receipt_and_seed_label_omit_the_constitutional_qualifier_complete; class identity remains bound by RD-05-C03 and issue 790",
    "terminal_state": "bounded_non_link",
    "closure_reference_path": "data/project/ssc-residual-wave02/closures/RD-05-C03.json",
    "class_receipt_path": "data/research/status-sovereignty-rd-wave02-rd05-recommendation-disposition/class-receipt.json",
    "manifest_combined_sha256": "d9fcb123ad57bf86b355920702aa961e32c95a6a3b3237eb8ece91e863baca11",
    "class_closed": true
  },
  {
    "lane_id": "RD-01",
    "class_id": "RD-01-C03",
    "issue": 786,
    "source_pr": 801,
    "merge_commit": "64af19ce7f860a7024a37ba5b6eef796b57c87b1",
    "constitutional_exact_label": "legal-entity resolution for selected and matched control companies",
    "receipt_class_label": "legal-entity resolution for selected and matched control companies",
    "labels_exact_match": true,
    "label_reconciliation": "none",
    "terminal_state": "bounded_source_unavailable",
    "closure_reference_path": "data/project/ssc-residual-wave02/closures/RD-01-C03.json",
    "class_receipt_path": "data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json",
    "manifest_combined_sha256": "7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798",
    "class_closed": true
  },
  {
    "lane_id": "RD-06",
    "class_id": "RD-06-C01",
    "issue": 791,
    "source_pr": 806,
    "merge_commit": "d7983e19c0783a048afb19adde0fb65ccf94c726",
    "constitutional_exact_label": "complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe",
    "receipt_class_label": "complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe",
    "labels_exact_match": true,
    "label_reconciliation": "none",
    "terminal_state": "bounded_source_restricted",
    "closure_reference_path": "data/project/ssc-residual-wave02/closures/RD-06-C01.json",
    "class_receipt_path": "data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json",
    "manifest_combined_sha256": "2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5",
    "class_closed": true
  },
  {
    "lane_id": "RD-03",
    "class_id": "RD-03-C04",
    "issue": 788,
    "source_pr": 803,
    "merge_commit": "580d9c998f747330d190bed5011c7a1a517a1c0d",
    "constitutional_exact_label": "complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms",
    "receipt_class_label": "complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms",
    "labels_exact_match": true,
    "label_reconciliation": "none",
    "terminal_state": "bounded_source_unavailable",
    "closure_reference_path": "data/project/ssc-residual-wave02/closures/RD-03-C04.json",
    "class_receipt_path": "data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json",
    "manifest_combined_sha256": "1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e",
    "class_closed": true
  },
  {
    "lane_id": "RD-02",
    "class_id": "RD-02-C04",
    "issue": 787,
    "source_pr": 802,
    "merge_commit": "72abc35c408d172d9be33b619b630a96ac317193",
    "constitutional_exact_label": "fund-level Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology",
    "receipt_class_label": "fund-level Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology",
    "labels_exact_match": true,
    "label_reconciliation": "none",
    "terminal_state": "bounded_source_unavailable",
    "closure_reference_path": "data/project/ssc-residual-wave02/closures/RD-02-C04.json",
    "class_receipt_path": "data/research/status-sovereignty-rd-wave02-rd02-license-leverage/class-receipt.json",
    "manifest_combined_sha256": "0ca72d32840bf079975448fa9e9de3f75cdad68555c085f7f0749d007c1dc427",
    "class_closed": true
  }
]);

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);
const classId = (laneId, ordinal) => `${laneId}-C${String(ordinal).padStart(2, '0')}`;

function authorityZeros(counts, prefix) {
  for (const key of [
    'outside_human_dependencies',
    'external_contacts',
    'external_reviews',
    'reviewed_disposition_changes',
    'complete_compact_findings',
    'racial_order_findings',
    'prevalence_findings',
    'coordination_findings',
    'common_purpose_findings',
    'graph_effects',
    'publication_effects',
    'adoption_effects'
  ]) ok(counts?.[key] === 0, `${prefix}.${key} changed`);
}

function validateInputs(constitution, wave01, current) {
  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-02-constitution@1', 'Wave-02 constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W02' && constitution?.issue === 785, 'Wave-02 constitution identity changed');
  ok(constitution?.parent_custody?.wave_01_issue === 615, 'Wave-01 issue custody changed');
  ok(constitution?.parent_custody?.wave_01_reconciliation_pr === 660, 'Wave-01 reconciliation custody changed');
  ok(constitution?.parent_custody?.frozen_execution_base === 'c1997a1bfea3e214e2769df31f64f6fad6a4295c', 'Wave-02 frozen execution base changed');
  ok(constitution?.closure_contract?.starting_open_classes === 42, 'Wave-02 starting open denominator changed');
  ok(constitution?.closure_contract?.starting_closed_classes === 0, 'Wave-02 starting closed denominator changed');
  ok(constitution?.closure_contract?.attempted_classes === 6, 'Wave-02 attempted-class denominator changed');
  ok(Array.isArray(constitution?.lane_attempts) && constitution.lane_attempts.length === 6, 'six constitutional lane attempts required');

  ok(wave01?.schema_version === 'status-sovereignty-residual-denominator-wave-01@1', 'Wave-01 registry schema changed');
  ok(wave01?.wave_id === 'SSC-RD-W01' && wave01?.issue === 615, 'Wave-01 registry identity changed');
  ok(wave01?.canonical_residual_atlas?.class_groups === 6, 'Wave-01 class-group denominator changed');
  ok(wave01?.canonical_residual_atlas?.residual_classes === 42, 'Wave-01 residual denominator changed');
  ok(wave01?.canonical_residual_atlas?.closed_residual_classes === 0, 'Wave-01 starting closed denominator changed');
  ok(wave01?.canonical_residual_atlas?.open_residual_classes === 42, 'Wave-01 starting open denominator changed');
  ok(Array.isArray(wave01?.canonical_residual_atlas?.groups) && wave01.canonical_residual_atlas.groups.length === 6, 'six Wave-01 residual groups required');

  ok(current?.schema_version === 'status-sovereignty-residual-denominator-wave-02-current@1', 'current ledger schema changed');
  ok(current?.wave_id === 'SSC-RD-W02' && current?.issue === 785, 'current ledger identity changed');
  ok(current?.authority === 'six_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'current ledger authority changed');
  ok(current?.counts?.canonical_residual_classes === 42, 'current canonical denominator changed');
  ok(current?.counts?.selected_class_attempts === 6, 'current selected-attempt count changed');
  ok(current?.counts?.terminal_class_receipts === 6, 'current terminal-receipt count changed');
  ok(current?.counts?.classes_closed_this_wave === 6, 'current wave closure count changed');
  ok(current?.counts?.closed_residual_classes === 6 && current?.counts?.open_residual_classes === 36, 'current residual accounting changed');
  ok(current?.counts?.label_reconciliations === 1, 'current label-reconciliation count changed');
  authorityZeros(current.counts, 'current.counts');
  ok(Array.isArray(current?.selected_classes_open) && current.selected_classes_open.length === 0, 'selected class remains open');
  ok(current?.current_result?.terminal_state === 'six_of_forty_two_residual_classes_closed_all_selected_attempts_terminal', 'current terminal state changed');
  ok(current?.current_result?.all_six_selected_classes_closed === true, 'all selected classes must be closed');
  ok(current?.current_result?.wave_complete === false, 'current ledger overstates residual completion');
  ok(current?.current_result?.outside_human_dependency === false && current?.current_result?.project_blocking === false, 'current dependency boundary changed');
  for (const key of ['graph_effect','publication_effect','adoption_effect']) {
    ok(current.current_result[key] === 'none', `current.${key} changed`);
  }
  same(current.promoted_class_receipts, EXPECTED_RECEIPTS, 'current promoted receipt custody changed');
}

function deriveClassAtlas(constitution, wave01) {
  const groups = wave01.canonical_residual_atlas.groups;
  const laneAttempts = constitution.lane_attempts;
  const attemptByLane = new Map(laneAttempts.map((row) => [row.lane_id, row]));
  unique(groups.map((row) => row.lane_id), 'duplicate Wave-01 residual lane');
  unique(laneAttempts.map((row) => row.lane_id), 'duplicate Wave-02 attempt lane');

  const allClassIds = [];
  const selectedClassIds = [];
  for (const group of groups) {
    ok(Number.isInteger(group.count) && group.count > 0, `${group.lane_id} residual count invalid`);
    const attempt = attemptByLane.get(group.lane_id);
    ok(attempt, `${group.lane_id} Wave-02 attempt missing`);
    ok(Number.isInteger(attempt.canonical_ordinal) && attempt.canonical_ordinal >= 1 && attempt.canonical_ordinal <= group.count, `${group.lane_id} selected ordinal invalid`);
    const expectedSelected = classId(group.lane_id, attempt.canonical_ordinal);
    ok(attempt.class_id === expectedSelected, `${group.lane_id} selected class identity changed`);
    selectedClassIds.push(expectedSelected);
    for (let ordinal = 1; ordinal <= group.count; ordinal += 1) {
      allClassIds.push(classId(group.lane_id, ordinal));
    }
  }

  unique(allClassIds, 'duplicate canonical class id');
  unique(selectedClassIds, 'duplicate selected class id');
  ok(allClassIds.length === 42, 'canonical class-id denominator changed');
  ok(selectedClassIds.length === 6, 'selected class-id denominator changed');

  const selectedSet = new Set(selectedClassIds);
  const remainingOpenClassIds = allClassIds.filter((id) => !selectedSet.has(id));
  ok(remainingOpenClassIds.length === 36, 'remaining open class-id denominator changed');
  return { allClassIds, selectedClassIds, remainingOpenClassIds };
}

export function deriveReconciliation(root = ROOT) {
  const constitution = read(root, CONSTITUTION_PATH);
  const wave01 = read(root, WAVE01_PATH);
  const current = read(root, CURRENT_PATH);
  validateInputs(constitution, wave01, current);

  const { allClassIds, selectedClassIds, remainingOpenClassIds } = deriveClassAtlas(constitution, wave01);
  const promotionOrderClassIds = EXPECTED_RECEIPTS.map((row) => row.class_id);
  unique(promotionOrderClassIds, 'duplicate promoted class id');
  same([...promotionOrderClassIds].sort(), [...selectedClassIds].sort(), 'promoted receipt set differs from selected class set');

  const terminalStateCounts = {
    evidence_complete: 0,
    bounded_non_link: 0,
    bounded_source_restricted: 0,
    bounded_source_unavailable: 0,
    still_open: 0
  };
  for (const receipt of EXPECTED_RECEIPTS) {
    ok(Object.hasOwn(terminalStateCounts, receipt.terminal_state), `${receipt.class_id} terminal state outside constitution`);
    terminalStateCounts[receipt.terminal_state] += 1;
  }
  same(terminalStateCounts, {
    evidence_complete: 0,
    bounded_non_link: 1,
    bounded_source_restricted: 1,
    bounded_source_unavailable: 4,
    still_open: 0
  }, 'terminal-state distribution changed');

  return {
    schema_version: 'status-sovereignty-residual-denominator-wave-02-reconciliation@1',
    wave_id: 'SSC-RD-W02',
    hypothesis_id: 'SSC-H01',
    issue: 785,
    as_of: '2026-08-04',
    title: 'SSC residual-denominator Wave 02 · six class-closure reconciliation',
    authority: 'execution_wave_reconciled_six_class_closures_without_broader_empirical_authority',
    parent_custody: {
      wave_01_registry_path: WAVE01_PATH,
      wave_02_constitution_path: CONSTITUTION_PATH,
      wave_02_current_ledger_path: CURRENT_PATH,
      wave_01_issue: 615,
      wave_01_reconciliation_pr: 660,
      wave_02_constitution_pr: 796,
      wave_02_current_ledger_pr: CURRENT_LEDGER_PROMOTION_PR,
      wave_02_current_ledger_merge: CURRENT_LEDGER_PROMOTION_MERGE,
      frozen_execution_base: constitution.parent_custody.frozen_execution_base,
      canonical_residual_classes_at_start: 42,
      closed_residual_classes_at_start: 0,
      open_residual_classes_at_start: 42
    },
    selected_class_execution: {
      attempted_classes: 6,
      terminal_class_receipts: 6,
      all_selected_attempts_terminal: true,
      selected_class_ids: selectedClassIds,
      promotion_order_class_ids: promotionOrderClassIds,
      terminal_state_counts: terminalStateCounts
    },
    canonical_residual_atlas: {
      class_groups: 6,
      all_class_ids: allClassIds,
      selected_class_ids: selectedClassIds,
      remaining_open_class_ids: remainingOpenClassIds,
      canonical_residual_classes: 42,
      closed_before_wave: 0,
      open_before_wave: 42,
      classes_closed_this_wave: 6,
      closed_after_wave: 6,
      open_after_wave: 36,
      nonselected_classes_preserved_open: 36,
      selected_classes_still_open: 0
    },
    promoted_class_receipts: EXPECTED_RECEIPTS,
    counts: {
      execution_lanes: 6,
      selected_class_attempts: 6,
      terminal_class_receipts: 6,
      classes_closed_this_wave: 6,
      canonical_residual_classes: 42,
      closed_residual_classes: 6,
      open_residual_classes: 36,
      nonselected_classes_preserved_open: 36,
      selected_classes_still_open: 0,
      label_reconciliations: 1,
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
      terminal_state: 'wave02_execution_complete_six_selected_classes_closed_thirty_six_nonselected_classes_open',
      execution_wave_complete: true,
      all_six_selected_attempts_terminal: true,
      selected_class_closures: 6,
      current_ledger_wave_complete: false,
      residual_denominator_complete: false,
      parent_execution_issue_complete: true,
      next_wave_may_select_only_from_remaining_open_classes: true,
      next_wave_created_by_this_reconciliation: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      execution_wave_complete_is_residual_denominator_complete: false,
      six_class_closures_are_complete_compact: false,
      selected_class_closure_closes_broader_lane: false,
      bounded_source_unavailable_is_event_absence: false,
      bounded_source_restricted_is_fairness_or_nonparticipation_finding: false,
      bounded_non_link_is_no_private_influence: false,
      legal_entity_resolution_is_common_control: false,
      license_or_green_light_is_leverage_draw: false,
      executed_loan_is_repayment_or_public_recovery: false,
      version_history_is_effective_implementation: false,
      recommendation_record_is_adopted_output: false,
      named_offeror_universe_proves_equal_support: false,
      functional_convergence_is_coordination_or_common_purpose: false,
      remaining_open_class_count_is_prevalence: false,
      next_wave_created_by_this_reconciliation: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

export function checkReconciliation(root = ROOT) {
  const observed = read(root, RECONCILIATION_PATH);
  const expected = deriveReconciliation(root);
  same(observed, expected, 'Wave-02 reconciliation drifted from exact source custody');
  return observed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || '--write';
  if (mode === '--write') {
    write(ROOT, RECONCILIATION_PATH, deriveReconciliation(ROOT));
    console.log(`wrote ${RECONCILIATION_PATH}`);
  } else if (mode === '--check') {
    const value = checkReconciliation(ROOT);
    console.log(`Wave-02 reconciliation: ${value.counts.closed_residual_classes} closed / ${value.counts.open_residual_classes} open; selected attempts ${value.counts.terminal_class_receipts}/${value.counts.selected_class_attempts} terminal`);
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}
