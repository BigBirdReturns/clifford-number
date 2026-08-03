#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path.cwd()


def replace_exact(rel: str, old: str, new: str, expected: int = 1) -> None:
    path = ROOT / rel
    text = path.read_text()
    observed = text.count(old)
    if observed != expected:
        raise SystemExit(f'{rel}: expected {expected} occurrences, observed {observed}: {old!r}')
    path.write_text(text.replace(old, new))


current_path = ROOT / 'data/research/status-sovereignty-residual-denominator-wave-02-current.json'
current = json.loads(current_path.read_text())
assert current['authority'] == 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'
assert current['counts']['canonical_residual_classes'] == 42
assert current['counts']['terminal_class_receipts'] == 3
assert current['counts']['closed_residual_classes'] == 3
assert current['counts']['open_residual_classes'] == 39
assert current['current_result']['closed_class_ids'] == ['RD-04-C01', 'RD-05-C03', 'RD-01-C03']
assert current['current_result']['open_selected_class_ids'] == ['RD-02-C04', 'RD-03-C04', 'RD-06-C01']

rd06_closure = json.loads((ROOT / 'data/project/ssc-residual-wave02/closures/RD-06-C01.json').read_text())
rd06_receipt = json.loads((ROOT / 'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json').read_text())
assert rd06_closure['terminal_state'] == 'bounded_source_restricted'
assert rd06_closure['class_closed'] is True
assert rd06_closure['product']['manifest_combined_sha256'] == '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5'
assert rd06_receipt['class_label'] == 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe'
assert rd06_receipt['terminal_state'] == 'bounded_source_restricted'
assert rd06_receipt['class_closed'] is True
assert rd06_receipt['counts']['proposal_slots'] == 8
assert rd06_receipt['counts']['identity_and_disposition_terminal_slots'] == 8

builder = 'tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs'
rd06_entry = """  {
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
  }
"""
replace_exact(
    builder,
    "    manifest_combined_sha256: '7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798'\n  }\n]);",
    "    manifest_combined_sha256: '7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798'\n  },\n" + rd06_entry + "]);",
)
replace_exact(builder, "const OPEN_IDS = Object.freeze(['RD-02-C04', 'RD-03-C04', 'RD-06-C01']);", "const OPEN_IDS = Object.freeze(['RD-02-C04', 'RD-03-C04']);")
replace_exact(
    builder,
    """  } else {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05, {
      canonical_classes: 42,
      open_before: 40,
      closed_before: 2,
      open_after: 39,
      closed_after: 3
    }, 'RD-01 atlas effect changed');
  }
""",
    """  } else if (expected.class_id === 'RD-01-C03') {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05, {
      canonical_classes: 42,
      open_before: 40,
      closed_before: 2,
      open_after: 39,
      closed_after: 3
    }, 'RD-01 atlas effect changed');
  } else {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, {
      canonical_classes: 42,
      open_before: 39,
      closed_before: 3,
      open_after: 38,
      closed_after: 4
    }, 'RD-06 atlas effect changed');
  }
""",
)
replace_exact(builder, 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority')
replace_exact(builder, 'terminal_class_receipts: 3,', 'terminal_class_receipts: 4,')
replace_exact(builder, 'classes_closed_this_wave: 3,', 'classes_closed_this_wave: 4,')
replace_exact(builder, 'closed_residual_classes: 3,', 'closed_residual_classes: 4,')
replace_exact(builder, 'open_residual_classes: 39,', 'open_residual_classes: 38,')
replace_exact(builder, "terminal_state: 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open',", "terminal_state: 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open',")
replace_exact(builder, 'classes_closed: 3,', 'classes_closed: 4,')
replace_exact(builder, 'classes_open: 39,', 'classes_open: 38,')
replace_exact(builder, "console.log('Wave-02 current ledger: 39 open / 3 closed; receipts RD-04, RD-05, and RD-01');", "console.log('Wave-02 current ledger: 38 open / 4 closed; receipts RD-04, RD-05, RD-01, and RD-06');")

validator = 'tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs'
replace_exact(validator, 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority', 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority')
replace_exact(validator, "current.promoted_class_receipts.length === 3, 'three promoted class receipts required'", "current.promoted_class_receipts.length === 4, 'four promoted class receipts required'")
replace_exact(validator, "['RD-04-C01','RD-05-C03','RD-01-C03'], 'promoted class order changed'", "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01'], 'promoted class order changed'")
replace_exact(validator, '  const rd01 = current.promoted_class_receipts[2];', '  const rd01 = current.promoted_class_receipts[2];\n  const rd06 = current.promoted_class_receipts[3];')
replace_exact(
    validator,
    "  ok(rd01.labels_exact_match === true && rd01.label_reconciliation === 'none', 'RD-01 label state changed');",
    """  ok(rd01.labels_exact_match === true && rd01.label_reconciliation === 'none', 'RD-01 label state changed');
  ok(rd06.lane_id === 'RD-06' && rd06.issue === 791 && rd06.source_pr === 806, 'RD-06 custody changed');
  ok(rd06.merge_commit === 'd7983e19c0783a048afb19adde0fb65ccf94c726', 'RD-06 merge custody changed');
  ok(rd06.manifest_combined_sha256 === '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5', 'RD-06 manifest custody changed');
  ok(rd06.terminal_state === 'bounded_source_restricted', 'RD-06 terminal state changed');
  ok(rd06.labels_exact_match === true && rd06.label_reconciliation === 'none', 'RD-06 label state changed');""",
)
replace_exact(validator, "current.selected_classes_open.length === 3, 'three selected classes must remain open'", "current.selected_classes_open.length === 2, 'two selected classes must remain open'")
replace_exact(validator, "['RD-02-C04','RD-03-C04','RD-06-C01'], 'open selected class order changed'", "['RD-02-C04','RD-03-C04'], 'open selected class order changed'")
replace_exact(validator, 'current.counts.terminal_class_receipts === 3', 'current.counts.terminal_class_receipts === 4')
replace_exact(validator, 'current.counts.classes_closed_this_wave === 3 && current.counts.closed_residual_classes === 3', 'current.counts.classes_closed_this_wave === 4 && current.counts.closed_residual_classes === 4')
replace_exact(validator, 'current.counts.open_residual_classes === 39', 'current.counts.open_residual_classes === 38')
replace_exact(validator, "current.current_result.terminal_state === 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open'", "current.current_result.terminal_state === 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open'")
replace_exact(validator, 'current.current_result.classes_closed === 3 && current.current_result.classes_open === 39', 'current.current_result.classes_closed === 4 && current.current_result.classes_open === 38')
replace_exact(validator, "['RD-04-C01','RD-05-C03','RD-01-C03'], 'closed class ids changed'", "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01'], 'closed class ids changed'")
replace_exact(validator, "['RD-02-C04','RD-03-C04','RD-06-C01'], 'open selected ids changed'", "['RD-02-C04','RD-03-C04'], 'open selected ids changed'")
replace_exact(validator, 'schema?.properties?.promoted_class_receipts?.minItems === 3 && schema?.properties?.promoted_class_receipts?.maxItems === 3', 'schema?.properties?.promoted_class_receipts?.minItems === 4 && schema?.properties?.promoted_class_receipts?.maxItems === 4')
replace_exact(validator, 'schema?.properties?.selected_classes_open?.minItems === 3 && schema?.properties?.selected_classes_open?.maxItems === 3', 'schema?.properties?.selected_classes_open?.minItems === 2 && schema?.properties?.selected_classes_open?.maxItems === 2')
replace_exact(validator, 'schema?.properties?.counts?.properties?.closed_residual_classes?.const === 3', 'schema?.properties?.counts?.properties?.closed_residual_classes?.const === 4')
replace_exact(validator, 'schema?.properties?.counts?.properties?.open_residual_classes?.const === 39', 'schema?.properties?.counts?.properties?.open_residual_classes?.const === 38')

schema_path = ROOT / 'schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json'
schema = json.loads(schema_path.read_text())
props = schema['properties']
props['authority']['const'] = 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'
promoted = props['promoted_class_receipts']
promoted['minItems'] = 4
promoted['maxItems'] = 4
promoted_props = promoted['items']['properties']
promoted_props['lane_id']['enum'] = ['RD-04', 'RD-05', 'RD-01', 'RD-06']
promoted_props['class_id']['enum'] = ['RD-04-C01', 'RD-05-C03', 'RD-01-C03', 'RD-06-C01']
promoted_props['issue']['enum'] = [789, 790, 786, 791]
promoted_props['source_pr']['enum'] = [804, 805, 801, 806]
promoted_props['terminal_state']['enum'] = ['bounded_source_unavailable', 'bounded_non_link', 'bounded_source_restricted']
promoted_props['closure_reference_path']['pattern'] = '^data/project/ssc-residual-wave02/closures/(RD-04-C01|RD-05-C03|RD-01-C03|RD-06-C01)\\.json$'
opened = props['selected_classes_open']
opened['minItems'] = 2
opened['maxItems'] = 2
open_props = opened['items']['properties']
open_props['lane_id']['enum'] = ['RD-02', 'RD-03']
open_props['class_id']['enum'] = ['RD-02-C04', 'RD-03-C04']
open_props['issue']['enum'] = [787, 788]
counts = props['counts']['properties']
counts['terminal_class_receipts']['const'] = 4
counts['classes_closed_this_wave']['const'] = 4
counts['closed_residual_classes']['const'] = 4
counts['open_residual_classes']['const'] = 38
result = props['current_result']['properties']
result['terminal_state']['const'] = 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open'
result['classes_closed']['const'] = 4
result['classes_open']['const'] = 38
result['closed_class_ids']['const'] = ['RD-04-C01', 'RD-05-C03', 'RD-01-C03', 'RD-06-C01']
result['open_selected_class_ids']['const'] = ['RD-02-C04', 'RD-03-C04']
schema_path.write_text(json.dumps(schema, separators=(',', ':')) + '\n')

test = 'test/status-sovereignty-residual-denominator-wave-02-current.test.js'
replace_exact(test, "['close count', (v) => { v.counts.closed_residual_classes = 4; }]", "['close count', (v) => { v.counts.closed_residual_classes = 5; }]")
replace_exact(test, "['open count', (v) => { v.counts.open_residual_classes = 38; }]", "['open count', (v) => { v.counts.open_residual_classes = 37; }]")
replace_exact(
    test,
    "  ['RD-01 merge custody changed', (v) => { v.promoted_class_receipts[2].merge_commit = '0'.repeat(40); }],",
    """  ['RD-01 merge custody changed', (v) => { v.promoted_class_receipts[2].merge_commit = '0'.repeat(40); }],
  ['RD-06 state changed', (v) => { v.promoted_class_receipts[3].terminal_state = 'evidence_complete'; }],
  ['RD-06 merge custody changed', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],""",
)
replace_exact(test, "s.properties.promoted_class_receipts.maxItems = 4;", "s.properties.promoted_class_receipts.maxItems = 5;")

milestone_path = ROOT / 'docs/milestones/ssc-residual-denominator-wave-02-current.md'
milestone_path.write_text("""# SSC residual-denominator Wave 02 — current cumulative ledger

The first promotion object at:

```text
data/research/status-sovereignty-residual-denominator-wave-02-progress.json
```

is an exact historical snapshot of the first class promotion. It correctly records RD‑04 alone at `41 open / 1 closed`, but it is not the cumulative current ledger after RD‑05, RD‑01, and RD‑06 merged.

The cumulative state is generated at:

```text
data/research/status-sovereignty-residual-denominator-wave-02-current.json
```

## Current atlas

```text
canonical residual classes: 42
closed residual classes:     4
open residual classes:      38

closed in promotion order:
RD-04-C01  bounded_source_unavailable
RD-05-C03  bounded_non_link
RD-01-C03  bounded_source_unavailable
RD-06-C01  bounded_source_restricted

selected attempts still open:
RD-02-C04
RD-03-C04
```

The current ledger is derived only from the Wave‑02 constitution, the immutable Wave‑01 starting registry, the historical first-promotion snapshot, and the exact RD‑04, RD‑05, RD‑01, and RD‑06 closure references and class receipts.

```text
RD-01 merge:    64af19ce7f860a7024a37ba5b6eef796b57c87b1
RD-01 manifest: 7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798

RD-06 merge:    d7983e19c0783a048afb19adde0fb65ccf94c726
RD-06 manifest: 2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5
```

## Label custody

RD‑05’s constitution uses the qualifier `complete`, while its seed and terminal receipt omit that qualifier. The current ledger preserves both strings and retains one explicit label reconciliation. RD‑01 and RD‑06 each match their constitutional labels exactly.

## RD‑06 terminal limit

```text
proposal slots:                    8 / 8 terminal
publicly named offerors:               3
identity-source-restricted slots:      5
fixed public-record routes:           40
HTTP successes:                       37
typed terminal non-successes:          3
admitted identity candidates:          0
```

The five unnamed proposal slots remain anonymous. Source restriction is not offeror absence, withdrawal, nonresponsiveness, unfairness, technical inferiority, or evidence that a proposal never existed. Named award, rejection, and protest records are not complete proposal-team, architecture, performance, or source-selection files.

## Authority ceiling

```text
outside-human dependencies:  0
external contacts/reviews:    0 / 0
reviewed disposition changes: 0
complete-compact findings:     0
racial-order findings:         0
prevalence findings:           0
coordination findings:         0
common-purpose findings:       0
graph/publication/adoption:     none / none / none
```

The RD‑05 `bounded_non_link` does not establish that private advice, informal influence, or unpublished action did not occur. RD‑04 and RD‑01 source gaps do not establish record absence or noncompliance. RD‑06 source restrictions do not establish nonexistence, unfairness, or nonparticipation. Four class closures do not close any broader lane or Wave 02.
""")

print('Wave-02 four-closure transformation prepared: 39/3 -> 38/4')
