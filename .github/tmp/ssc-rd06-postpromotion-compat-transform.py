#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()


def replace_exact(rel: str, old: str, new: str, expected: int = 1) -> None:
    path = ROOT / rel
    text = path.read_text()
    observed = text.count(old)
    if observed != expected:
        raise SystemExit(f'{rel}: expected {expected} occurrences, observed {observed}: {old!r}')
    path.write_text(text.replace(old, new))


validator = 'tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs'
replace_exact(
    validator,
    "const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);",
    "const equal = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);\nconst same = (actual, expected, message) => ok(equal(actual, expected), message);",
)

helper = r'''export function validateCurrentAtlasCustody(current) {
  ok(current?.counts?.canonical_residual_classes === 42, 'current atlas canonical denominator changed');
  ok(Array.isArray(current?.promoted_class_receipts), 'current atlas promoted receipts missing');
  ok(Array.isArray(current?.selected_classes_open), 'current atlas open selected classes missing');

  const promotedIds = current.promoted_class_receipts.map((row) => row.class_id);
  const openIds = current.selected_classes_open.map((row) => row.class_id);
  const rd06Promoted = current.promoted_class_receipts.find((row) => row.class_id === 'RD-06-C01');
  const rd06Open = current.selected_classes_open.find((row) => row.class_id === 'RD-06-C01');

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
  ]) ok(current.counts[key] === 0, `current atlas ${key} changed`);
  ok(current?.current_result?.outside_human_dependency === false, 'current atlas outside-human dependency changed');
  ok(current?.current_result?.project_blocking === false, 'current atlas project-blocking state changed');
  for (const key of ['graph_effect','publication_effect','adoption_effect']) {
    ok(current.current_result[key] === 'none', `current atlas ${key} changed`);
  }

  const prePromotion =
    current.authority === 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority' &&
    current.counts.terminal_class_receipts === 3 &&
    current.counts.classes_closed_this_wave === 3 &&
    current.counts.closed_residual_classes === 3 &&
    current.counts.open_residual_classes === 39 &&
    current.current_result.terminal_state === 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open' &&
    current.current_result.classes_closed === 3 &&
    current.current_result.classes_open === 39 &&
    equal(promotedIds, ['RD-04-C01','RD-05-C03','RD-01-C03']) &&
    equal(openIds, ['RD-02-C04','RD-03-C04','RD-06-C01']) &&
    equal(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03']) &&
    equal(current.current_result.open_selected_class_ids, ['RD-02-C04','RD-03-C04','RD-06-C01']) &&
    rd06Promoted === undefined &&
    equal(rd06Open, {
      lane_id: 'RD-06',
      class_id: 'RD-06-C01',
      issue: 791,
      constitutional_exact_label: CLASS_LABEL,
      state: 'open',
      class_closed: false
    });

  const postPromotion =
    current.authority === 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority' &&
    current.counts.terminal_class_receipts === 4 &&
    current.counts.classes_closed_this_wave === 4 &&
    current.counts.closed_residual_classes === 4 &&
    current.counts.open_residual_classes === 38 &&
    current.current_result.terminal_state === 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open' &&
    current.current_result.classes_closed === 4 &&
    current.current_result.classes_open === 38 &&
    equal(promotedIds, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']) &&
    equal(openIds, ['RD-02-C04','RD-03-C04']) &&
    equal(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']) &&
    equal(current.current_result.open_selected_class_ids, ['RD-02-C04','RD-03-C04']) &&
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
    });

  ok(prePromotion || postPromotion, 'current atlas is neither exact pre-promotion nor exact post-promotion RD-06 custody');
  return prePromotion ? 'pre_promotion' : 'post_promotion';
}

'''
replace_exact(validator, 'function validateGitCustody(root) {', helper + 'function validateGitCustody(root) {')
replace_exact(
    validator,
    """  if (fs.existsSync(abs(root, CURRENT_LEDGER_PATH))) {
    const current = readJson(root, CURRENT_LEDGER_PATH);
    ok(current?.counts?.canonical_residual_classes === 42 && current?.counts?.closed_residual_classes === 3 && current?.counts?.open_residual_classes === 39, 'current atlas pre-promotion state changed');
    same(current?.current_result?.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03'], 'prior closed-class custody changed');
    ok(current?.current_result?.open_selected_class_ids?.includes('RD-06-C01'), 'RD-06 missing from current open selected classes');
  }
""",
    """  if (fs.existsSync(abs(root, CURRENT_LEDGER_PATH))) {
    validateCurrentAtlasCustody(readJson(root, CURRENT_LEDGER_PATH));
  }
""",
)

test = 'test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js'
replace_exact(
    test,
    "  validateProduct,\n  validateProductShape",
    "  validateProduct,\n  validateProductShape,\n  validateCurrentAtlasCustody",
)

custody_tests = r'''
const currentLedger = read('data/research/status-sovereignty-residual-denominator-wave-02-current.json');
assert.equal(validateCurrentAtlasCustody(currentLedger), 'post_promotion');

const prePromotionLedger = clone(currentLedger);
prePromotionLedger.authority = 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';
prePromotionLedger.promoted_class_receipts = prePromotionLedger.promoted_class_receipts.slice(0, 3);
prePromotionLedger.selected_classes_open.push({
  lane_id: 'RD-06',
  class_id: 'RD-06-C01',
  issue: 791,
  constitutional_exact_label: 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe',
  state: 'open',
  class_closed: false
});
prePromotionLedger.counts.terminal_class_receipts = 3;
prePromotionLedger.counts.classes_closed_this_wave = 3;
prePromotionLedger.counts.closed_residual_classes = 3;
prePromotionLedger.counts.open_residual_classes = 39;
prePromotionLedger.current_result.terminal_state = 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open';
prePromotionLedger.current_result.classes_closed = 3;
prePromotionLedger.current_result.classes_open = 39;
prePromotionLedger.current_result.closed_class_ids = ['RD-04-C01','RD-05-C03','RD-01-C03'];
prePromotionLedger.current_result.open_selected_class_ids = ['RD-02-C04','RD-03-C04','RD-06-C01'];
assert.equal(validateCurrentAtlasCustody(prePromotionLedger), 'pre_promotion');

const custodyMutations = [
  ['post-promotion closed count', (v) => { v.counts.closed_residual_classes = 3; }],
  ['post-promotion open count', (v) => { v.counts.open_residual_classes = 39; }],
  ['post-promotion RD-06 merge', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],
  ['post-promotion RD-06 manifest', (v) => { v.promoted_class_receipts[3].manifest_combined_sha256 = '0'.repeat(64); }],
  ['post-promotion RD-06 terminal state', (v) => { v.promoted_class_receipts[3].terminal_state = 'evidence_complete'; }],
  ['post-promotion RD-06 reopened', (v) => { v.selected_classes_open.push({ lane_id: 'RD-06', class_id: 'RD-06-C01', issue: 791, constitutional_exact_label: v.promoted_class_receipts[3].constitutional_exact_label, state: 'open', class_closed: false }); }],
  ['post-promotion closed order', (v) => { v.promoted_class_receipts.reverse(); }],
  ['post-promotion graph effect', (v) => { v.current_result.graph_effect = 'graph_changed'; }]
];

for (const [name, mutate] of custodyMutations) {
  const candidate = clone(currentLedger);
  mutate(candidate);
  assert.throws(() => validateCurrentAtlasCustody(candidate), undefined, name);
}

const preCustodyMutations = [
  ['pre-promotion RD-06 missing from open set', (v) => { v.selected_classes_open.pop(); }],
  ['pre-promotion RD-06 silently promoted', (v) => { v.promoted_class_receipts.push(clone(currentLedger.promoted_class_receipts[3])); }],
  ['pre-promotion receipt count', (v) => { v.counts.terminal_class_receipts = 4; }],
  ['pre-promotion external review', (v) => { v.counts.external_reviews = 1; }]
];

for (const [name, mutate] of preCustodyMutations) {
  const candidate = clone(prePromotionLedger);
  mutate(candidate);
  assert.throws(() => validateCurrentAtlasCustody(candidate), undefined, name);
}
'''
replace_exact(test, 'const schema = read(SCHEMA_PATH);\n', 'const schema = read(SCHEMA_PATH);\n' + custody_tests + '\n')
replace_exact(
    test,
    'console.log(`RD-06 terminal adversarial suite: ${mutations.length + schemaMutations.length} mutations refused`);',
    'console.log(`RD-06 terminal adversarial suite: ${mutations.length + schemaMutations.length + custodyMutations.length + preCustodyMutations.length} mutations refused`);',
)

print('RD-06 promotion-aware compatibility prepared')
