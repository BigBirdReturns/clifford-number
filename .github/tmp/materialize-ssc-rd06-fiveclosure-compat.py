#!/usr/bin/env python3
from pathlib import Path
import re

validator_path = Path('tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs')
test_path = Path('test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js')

validator = validator_path.read_text()
old_tail = """  ok(prePromotion || postPromotion, 'current atlas is neither exact pre-promotion nor exact post-promotion RD-06 custody');
  return prePromotion ? 'pre_promotion' : 'post_promotion';"""
new_tail = """  const subsequentRd03Promotion =
    current.authority === 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority' &&
    current.counts.terminal_class_receipts === 5 &&
    current.counts.classes_closed_this_wave === 5 &&
    current.counts.closed_residual_classes === 5 &&
    current.counts.open_residual_classes === 37 &&
    current.counts.label_reconciliations === 2 &&
    current.current_result.terminal_state === 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open' &&
    current.current_result.classes_closed === 5 &&
    current.current_result.classes_open === 37 &&
    current.current_result.all_six_selected_classes_closed === false &&
    current.current_result.wave_complete === false &&
    equal(promotedIds, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']) &&
    equal(openIds, ['RD-02-C04']) &&
    equal(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']) &&
    equal(current.current_result.open_selected_class_ids, ['RD-02-C04']) &&
    rd06Open === undefined &&
    equal(rd06Promoted, {
      lane_id: 'RD-06',
      class_id: 'RD-06-C01',
      issue: 791,
      source_pr: 806,
      merge_commit: 'd7983e19c0783a048afb19adde0fb65ccf94c726',
      constitutional_exact_label: CLASS_LABEL,
      receipt_class_label: CLASS_LABEL,
      labels_exact_match: true,
      label_reconciliation: 'none',
      terminal_state: TERMINAL_STATE,
      closure_reference_path: CLOSURE_REFERENCE_PATH,
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      manifest_combined_sha256: '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5',
      class_closed: true
    }) &&
    equal(current.promoted_class_receipts[4], {
      lane_id: 'RD-03',
      class_id: 'RD-03-C04',
      issue: 788,
      source_pr: 803,
      merge_commit: '580d9c998f747330d190bed5011c7a1a517a1c0d',
      constitutional_exact_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',
      receipt_class_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',
      labels_exact_match: false,
      label_reconciliation: 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact',
      terminal_state: 'bounded_source_unavailable',
      closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-03-C04.json',
      class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json',
      manifest_combined_sha256: '1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e',
      class_closed: true
    }) &&
    equal(current.selected_classes_open[0], {
      lane_id: 'RD-02',
      class_id: 'RD-02-C04',
      issue: 787,
      constitutional_exact_label: 'fund-level Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology',
      state: 'open',
      class_closed: false
    });

  ok(
    prePromotion || postPromotion || subsequentRd03Promotion,
    'current atlas is neither exact pre-promotion, exact RD-06 post-promotion, nor exact RD-03 subsequent-promotion custody'
  );
  return prePromotion ? 'pre_promotion' : 'post_promotion';"""
if validator.count(old_tail) != 1:
    raise SystemExit(f'validator tail match count: {validator.count(old_tail)}')
validator_path.write_text(validator.replace(old_tail, new_tail, 1))

test = test_path.read_text()
fixture_pattern = re.compile(
    r"const prePromotionLedger = clone\(currentLedger\);.*?assert\.equal\(validateCurrentAtlasCustody\(prePromotionLedger\), 'pre_promotion'\);",
    re.S,
)
fixture = """const prePromotionLedger = clone(currentLedger);
prePromotionLedger.authority = 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';
prePromotionLedger.promoted_class_receipts = prePromotionLedger.promoted_class_receipts.slice(0, 3);
prePromotionLedger.selected_classes_open = [
  {
    lane_id: 'RD-02',
    class_id: 'RD-02-C04',
    issue: 787,
    constitutional_exact_label: 'fund-level Green Light, license, leverage commitment, draw, fee, covenant, and amendment chronology',
    state: 'open',
    class_closed: false
  },
  {
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    issue: 788,
    constitutional_exact_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',
    state: 'open',
    class_closed: false
  },
  {
    lane_id: 'RD-06',
    class_id: 'RD-06-C01',
    issue: 791,
    constitutional_exact_label: 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe',
    state: 'open',
    class_closed: false
  }
];
prePromotionLedger.counts.terminal_class_receipts = 3;
prePromotionLedger.counts.classes_closed_this_wave = 3;
prePromotionLedger.counts.closed_residual_classes = 3;
prePromotionLedger.counts.open_residual_classes = 39;
prePromotionLedger.counts.label_reconciliations = 1;
prePromotionLedger.current_result.terminal_state = 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open';
prePromotionLedger.current_result.classes_closed = 3;
prePromotionLedger.current_result.classes_open = 39;
prePromotionLedger.current_result.closed_class_ids = ['RD-04-C01','RD-05-C03','RD-01-C03'];
prePromotionLedger.current_result.open_selected_class_ids = ['RD-02-C04','RD-03-C04','RD-06-C01'];
assert.equal(validateCurrentAtlasCustody(prePromotionLedger), 'pre_promotion');"""
test, count = fixture_pattern.subn(fixture, test, count=1)
if count != 1:
    raise SystemExit(f'pre-promotion fixture match count: {count}')

old_mutation_tail = """  ['post-promotion closed order', (v) => { v.promoted_class_receipts.reverse(); }],
  ['post-promotion graph effect', (v) => { v.current_result.graph_effect = 'graph_changed'; }]
];"""
new_mutation_tail = """  ['post-promotion closed order', (v) => { v.promoted_class_receipts.reverse(); }],
  ['post-promotion graph effect', (v) => { v.current_result.graph_effect = 'graph_changed'; }],
  ['subsequent RD-03 merge changed', (v) => { v.promoted_class_receipts[4].merge_commit = '0'.repeat(40); }],
  ['subsequent RD-03 manifest changed', (v) => { v.promoted_class_receipts[4].manifest_combined_sha256 = '0'.repeat(64); }],
  ['subsequent RD-03 silently reopened', (v) => { v.selected_classes_open.push({ lane_id: 'RD-03', class_id: 'RD-03-C04', issue: 788, constitutional_exact_label: v.promoted_class_receipts[4].constitutional_exact_label, state: 'open', class_closed: false }); }],
  ['subsequent RD-02 open custody removed', (v) => { v.selected_classes_open = []; }],
  ['subsequent label reconciliation count changed', (v) => { v.counts.label_reconciliations = 1; }]
];"""
if test.count(old_mutation_tail) != 1:
    raise SystemExit(f'custody mutation tail match count: {test.count(old_mutation_tail)}')
test_path.write_text(test.replace(old_mutation_tail, new_mutation_tail, 1))

print('patched exact RD-06 custody validator and adversarial suite for canonical RD-03 subsequent promotion')
