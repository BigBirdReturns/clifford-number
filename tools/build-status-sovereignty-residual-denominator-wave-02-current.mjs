#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CURRENT_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const WAVE01_PATH = 'data/research/status-sovereignty-residual-denominator-wave-01.json';
export const FIRST_PROGRESS_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-progress.json';

const CLOSED = Object.freeze([
  {
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    source_pr: 804,
    merge_commit: '7b21d1f2b0606a5550b9c26fadc0cb465ba88b7e',
    constitutional_exact_label: 'current statutory, regulatory, and guidance version history after the 2025 law',
    receipt_class_label: 'current statutory, regulatory, and guidance version history after the 2025 law',
    labels_exact_match: true,
    label_reconciliation: 'none',
    terminal_state: 'bounded_source_unavailable',
    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-04-C01.json',
    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd04-version-history/class-receipt.json',
    manifest_combined_sha256: 'b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b'
  },
  {
    lane_id: 'RD-05',
    class_id: 'RD-05-C03',
    issue: 790,
    source_pr: 805,
    merge_commit: '209c30585301a1069507d2e6b16db62ff4ffe1bd',
    constitutional_exact_label: 'complete recommendation, agency response, adoption, rejection, implementation, and outcome ledger',
    receipt_class_label: 'recommendation, agency response, adoption, rejection, implementation, and outcome ledger',
    labels_exact_match: false,
    label_reconciliation: 'receipt_and_seed_label_omit_the_constitutional_qualifier_complete; class identity remains bound by RD-05-C03 and issue 790',
    terminal_state: 'bounded_non_link',
    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-05-C03.json',
    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd05-recommendation-disposition/class-receipt.json',
    manifest_combined_sha256: 'd9fcb123ad57bf86b355920702aa961e32c95a6a3b3237eb8ece91e863baca11'
  },
  {
    lane_id: 'RD-01',
    class_id: 'RD-01-C03',
    issue: 786,
    source_pr: 801,
    merge_commit: '64af19ce7f860a7024a37ba5b6eef796b57c87b1',
    constitutional_exact_label: 'legal-entity resolution for selected and matched control companies',
    receipt_class_label: 'legal-entity resolution for selected and matched control companies',
    labels_exact_match: true,
    label_reconciliation: 'none',
    terminal_state: 'bounded_source_unavailable',
    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-01-C03.json',
    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json',
    manifest_combined_sha256: '7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798'
  },
  {
    lane_id: 'RD-06',
    class_id: 'RD-06-C01',
    issue: 791,
    source_pr: 806,
    merge_commit: 'd7983e19c0783a048afb19adde0fb65ccf94c726',
    constitutional_exact_label: 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe',
    receipt_class_label: 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe',
    labels_exact_match: true,
    label_reconciliation: 'none',
    terminal_state: 'bounded_source_restricted',
    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-06-C01.json',
    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json',
    manifest_combined_sha256: '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5'
  },
  {
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    issue: 788,
    source_pr: 803,
    merge_commit: '580d9c998f747330d190bed5011c7a1a517a1c0d',
    constitutional_exact_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',
    receipt_class_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',
    labels_exact_match: true,
    label_reconciliation: 'none',
    terminal_state: 'bounded_source_unavailable',
    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-03-C04.json',
    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json',
    manifest_combined_sha256: '1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e'
  }
]);

const OPEN_IDS = Object.freeze(['RD-02-C04']);
const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);

function validateAuthorityZeros(value, prefix) {
  for (const key of ['external_contacts', 'external_reviews']) {
    ok(value?.[key] === 0, `${prefix}.${key} changed`);
  }
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    ok(value?.[key] === 'none', `${prefix}.${key} changed`);
  }
}

function validateClosure(root, expected, constitutionalAttempt) {
  const closure = read(root, expected.closure_reference_path);
  const receipt = read(root, expected.class_receipt_path);

  ok(closure?.schema_version === 'ssc-residual-denominator-wave02-class-closure-reference@1', `${expected.class_id}: closure schema changed`);
  ok(closure?.wave_issue === 785 && closure?.child_issue === expected.issue && closure?.source_pr === expected.source_pr, `${expected.class_id}: closure custody changed`);
  ok(closure?.lane_id === expected.lane_id && closure?.class_id === expected.class_id, `${expected.class_id}: closure identity changed`);
  ok(closure?.terminal_state === expected.terminal_state && closure?.class_closed === true, `${expected.class_id}: closure state changed`);
  ok(closure?.product?.manifest_combined_sha256 === expected.manifest_combined_sha256, `${expected.class_id}: closure manifest changed`);

  ok(receipt?.wave_id === 'SSC-RD-W02' && receipt?.lane_id === expected.lane_id && receipt?.class_id === expected.class_id, `${expected.class_id}: receipt identity changed`);
  ok(receipt?.issue === expected.issue && receipt?.terminal_state === expected.terminal_state && receipt?.class_closed === true, `${expected.class_id}: receipt terminal state changed`);
  ok(receipt?.class_label === expected.receipt_class_label, `${expected.class_id}: receipt label changed`);

  ok(constitutionalAttempt?.issue === expected.issue && constitutionalAttempt?.lane_id === expected.lane_id, `${expected.class_id}: constitution binding changed`);
  ok(constitutionalAttempt?.exact_label === expected.constitutional_exact_label, `${expected.class_id}: constitutional label changed`);

  const labelsMatch = receipt.class_label === constitutionalAttempt.exact_label;
  ok(labelsMatch === expected.labels_exact_match, `${expected.class_id}: label-reconciliation state changed`);

  if (expected.class_id === 'RD-03-C04') {
    ok(closure?.label_custody?.constitutional_class_label === expected.constitutional_exact_label, 'RD-03 closure constitutional label changed');
    ok(closure?.label_custody?.seed_closure_target === 'loan, warrant, security, covenant, milestone, pricing, and seniority terms', 'RD-03 closure seed label changed');
    ok(closure?.label_custody?.labels_exact_match === false, 'RD-03 constitution-versus-seed mismatch erased');
    ok(closure?.label_custody?.reconciliation === 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact', 'RD-03 seed-label reconciliation changed');
  }

  if (expected.class_id === 'RD-04-C01') {
    same(closure?.residual_atlas_effect, {
      canonical_classes_before: 42,
      open_before: 42,
      closed_before: 0,
      open_after: 41,
      closed_after: 1
    }, 'RD-04 atlas effect changed');
  } else if (expected.class_id === 'RD-05-C03') {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04, {
      canonical_classes: 42,
      open_before: 41,
      closed_before: 1,
      open_after: 40,
      closed_after: 2
    }, 'RD-05 atlas effect changed');
  } else if (expected.class_id === 'RD-01-C03') {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05, {
      canonical_classes: 42,
      open_before: 40,
      closed_before: 2,
      open_after: 39,
      closed_after: 3
    }, 'RD-01 atlas effect changed');
  } else if (expected.class_id === 'RD-06-C01') {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, {
      canonical_classes: 42,
      open_before: 39,
      closed_before: 3,
      open_after: 38,
      closed_after: 4
    }, 'RD-06 atlas effect changed');
  } else {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_and_rd06, {
      canonical_classes: 42,
      open_before: 38,
      closed_before: 4,
      open_after: 37,
      closed_after: 5
    }, 'RD-03 atlas effect changed');
  }

  validateAuthorityZeros(closure.authority, `${expected.class_id}.closure.authority`);
  validateAuthorityZeros(receipt.authority, `${expected.class_id}.receipt.authority`);
}

export function deriveCurrent(root = ROOT) {
  const constitution = read(root, CONSTITUTION_PATH);
  const wave01 = read(root, WAVE01_PATH);
  const firstProgress = read(root, FIRST_PROGRESS_PATH);

  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-02-constitution@1', 'Wave-02 constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W02' && constitution?.issue === 785, 'Wave-02 constitution identity changed');
  ok(constitution?.parent_custody?.canonical_residual_classes === 42, 'canonical residual denominator changed');
  ok(Array.isArray(constitution?.lane_attempts) && constitution.lane_attempts.length === 6, 'six selected class attempts required');

  ok(wave01?.schema_version === 'status-sovereignty-residual-denominator-wave-01@1', 'Wave-01 registry schema changed');
  ok(wave01?.counts?.canonical_residual_classes === 42, 'Wave-01 denominator changed');
  ok(wave01?.counts?.open_residual_classes === 42 && wave01?.counts?.closed_residual_classes === 0, 'Wave-01 historical starting state changed');

  ok(firstProgress?.schema_version === 'status-sovereignty-residual-denominator-wave-02-progress@1', 'first promotion snapshot schema changed');
  ok(firstProgress?.counts?.closed_residual_classes === 1 && firstProgress?.counts?.open_residual_classes === 41, 'first promotion snapshot state changed');
  ok(Array.isArray(firstProgress?.promoted_class_receipts) && firstProgress.promoted_class_receipts.length === 1, 'first promotion snapshot must retain one receipt');
  ok(firstProgress.promoted_class_receipts[0]?.class_id === 'RD-04-C01', 'first promotion snapshot no longer identifies RD-04');

  const byClass = new Map(constitution.lane_attempts.map((row) => [row.class_id, row]));
  for (const expected of CLOSED) validateClosure(root, expected, byClass.get(expected.class_id));

  const selectedClassesOpen = OPEN_IDS.map((classId) => {
    const attempt = byClass.get(classId);
    ok(attempt, `${classId}: constitution attempt missing`);
    ok(attempt.class_closed === false, `${classId}: constitution launch state unexpectedly closed`);
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
    schema_version: 'status-sovereignty-residual-denominator-wave-02-current@1',
    wave_id: 'SSC-RD-W02',
    hypothesis_id: 'SSC-H01',
    issue: 785,
    as_of: '2026-08-03',
    authority: 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority',
    source_snapshots: {
      constitution_path: CONSTITUTION_PATH,
      wave_01_registry_path: WAVE01_PATH,
      first_promotion_snapshot_path: FIRST_PROGRESS_PATH,
      first_promotion_snapshot_is_historical: true
    },
    promoted_class_receipts: CLOSED.map((row) => ({ ...row, class_closed: true })),
    selected_classes_open: selectedClassesOpen,
    counts: {
      canonical_residual_classes: 42,
      selected_class_attempts: 6,
      terminal_class_receipts: 5,
      classes_closed_this_wave: 5,
      closed_residual_classes: 5,
      open_residual_classes: 37,
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
      terminal_state: 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open',
      classes_closed: 5,
      classes_open: 37,
      closed_class_ids: CLOSED.map((row) => row.class_id),
      open_selected_class_ids: [...OPEN_IDS],
      all_six_selected_classes_closed: false,
      wave_complete: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      historical_first_promotion_snapshot_is_current_ledger: false,
      one_class_closure_closes_lane: false,
      two_class_closures_close_wave: false,
      bounded_non_link_is_no_private_influence: false,
      source_unavailability_is_event_absence: false,
      source_unavailability_is_noncompliance: false,
      publication_is_observed_implementation: false,
      class_closure_is_complete_compact: false,
      functional_convergence_is_coordination_or_common_purpose: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

export function checkCurrent(root = ROOT) {
  const expected = deriveCurrent(root);
  const observed = read(root, CURRENT_PATH);
  same(observed, expected, 'current Wave-02 ledger drifted from closure receipts');
  return observed;
}

const mode = process.argv[2] || '--write';
if (mode === '--write') {
  write(ROOT, CURRENT_PATH, deriveCurrent(ROOT));
  console.log(`wrote ${CURRENT_PATH}`);
} else if (mode === '--check') {
  checkCurrent(ROOT);
  console.log('Wave-02 current ledger: 37 open / 5 closed; receipts RD-04, RD-05, RD-01, RD-06, and RD-03');
} else {
  throw new Error(`unknown mode: ${mode}`);
}
