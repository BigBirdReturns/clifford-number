#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()


def read(rel: str) -> str:
    return (ROOT / rel).read_text()


def write(rel: str, value: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value)


def replace_once(rel: str, old: str, new: str) -> None:
    text = read(rel)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{rel}: expected one replacement target, found {count}: {old[:120]!r}")
    write(rel, text.replace(old, new, 1))


BUILDER = 'tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs'
VALIDATOR = 'tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs'
TEST = 'test/status-sovereignty-residual-denominator-wave-02-current.test.js'
SCHEMA = 'schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json'
DOC = 'docs/milestones/ssc-residual-denominator-wave-02-current.md'

replace_once(
    BUILDER,
    """    manifest_combined_sha256: 'd9fcb123ad57bf86b355920702aa961e32c95a6a3b3237eb8ece91e863baca11'\n  }\n]);\n\nconst OPEN_IDS = Object.freeze(['RD-01-C03', 'RD-02-C04', 'RD-03-C04', 'RD-06-C01']);""",
    """    manifest_combined_sha256: 'd9fcb123ad57bf86b355920702aa961e32c95a6a3b3237eb8ece91e863baca11'\n  },\n  {\n    lane_id: 'RD-01',\n    class_id: 'RD-01-C03',\n    issue: 786,\n    source_pr: 801,\n    merge_commit: '64af19ce7f860a7024a37ba5b6eef796b57c87b1',\n    constitutional_exact_label: 'legal-entity resolution for selected and matched control companies',\n    receipt_class_label: 'legal-entity resolution for selected and matched control companies',\n    labels_exact_match: true,\n    label_reconciliation: 'none',\n    terminal_state: 'bounded_source_unavailable',\n    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-01-C03.json',\n    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json',\n    manifest_combined_sha256: '7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798'\n  }\n]);\n\nconst OPEN_IDS = Object.freeze(['RD-02-C04', 'RD-03-C04', 'RD-06-C01']);"""
)
replace_once(
    BUILDER,
    """  if (expected.class_id === 'RD-04-C01') {\n    same(closure?.residual_atlas_effect, {\n      canonical_classes_before: 42,\n      open_before: 42,\n      closed_before: 0,\n      open_after: 41,\n      closed_after: 1\n    }, 'RD-04 atlas effect changed');\n  } else {\n    same(closure?.residual_atlas_effect_if_promoted_after_rd04, {\n      canonical_classes: 42,\n      open_before: 41,\n      closed_before: 1,\n      open_after: 40,\n      closed_after: 2\n    }, 'RD-05 atlas effect changed');\n  }""",
    """  if (expected.class_id === 'RD-04-C01') {\n    same(closure?.residual_atlas_effect, {\n      canonical_classes_before: 42,\n      open_before: 42,\n      closed_before: 0,\n      open_after: 41,\n      closed_after: 1\n    }, 'RD-04 atlas effect changed');\n  } else if (expected.class_id === 'RD-05-C03') {\n    same(closure?.residual_atlas_effect_if_promoted_after_rd04, {\n      canonical_classes: 42,\n      open_before: 41,\n      closed_before: 1,\n      open_after: 40,\n      closed_after: 2\n    }, 'RD-05 atlas effect changed');\n  } else {\n    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05, {\n      canonical_classes: 42,\n      open_before: 40,\n      closed_before: 2,\n      open_after: 39,\n      closed_after: 3\n    }, 'RD-01 atlas effect changed');\n  }"""
)
for old, new in [
    ("authority: 'two_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "authority: 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'"),
    ("terminal_class_receipts: 2,\n      classes_closed_this_wave: 2,\n      closed_residual_classes: 2,\n      open_residual_classes: 40,", "terminal_class_receipts: 3,\n      classes_closed_this_wave: 3,\n      closed_residual_classes: 3,\n      open_residual_classes: 39,"),
    ("terminal_state: 'two_of_forty_two_residual_classes_closed_four_selected_attempts_open',\n      classes_closed: 2,\n      classes_open: 40,", "terminal_state: 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open',\n      classes_closed: 3,\n      classes_open: 39,"),
    ("console.log('Wave-02 current ledger: 40 open / 2 closed; receipts RD-04 and RD-05');", "console.log('Wave-02 current ledger: 39 open / 3 closed; receipts RD-04, RD-05, and RD-01');"),
]:
    replace_once(BUILDER, old, new)

for old, new in [
    ("current.authority === 'two_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "current.authority === 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'"),
    ("current.promoted_class_receipts.length === 2, 'two promoted class receipts required'", "current.promoted_class_receipts.length === 3, 'three promoted class receipts required'"),
    ("['RD-04-C01','RD-05-C03'], 'promoted class order changed'", "['RD-04-C01','RD-05-C03','RD-01-C03'], 'promoted class order changed'"),
    ("current.selected_classes_open.length === 4, 'four selected classes must remain open'", "current.selected_classes_open.length === 3, 'three selected classes must remain open'"),
    ("['RD-01-C03','RD-02-C04','RD-03-C04','RD-06-C01'], 'open selected class order changed'", "['RD-02-C04','RD-03-C04','RD-06-C01'], 'open selected class order changed'"),
    ("current.counts.terminal_class_receipts === 2", "current.counts.terminal_class_receipts === 3"),
    ("current.counts.classes_closed_this_wave === 2 && current.counts.closed_residual_classes === 2", "current.counts.classes_closed_this_wave === 3 && current.counts.closed_residual_classes === 3"),
    ("current.counts.open_residual_classes === 40", "current.counts.open_residual_classes === 39"),
    ("current.current_result.terminal_state === 'two_of_forty_two_residual_classes_closed_four_selected_attempts_open'", "current.current_result.terminal_state === 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open'"),
    ("current.current_result.classes_closed === 2 && current.current_result.classes_open === 40", "current.current_result.classes_closed === 3 && current.current_result.classes_open === 39"),
    ("['RD-04-C01','RD-05-C03'], 'closed class ids changed'", "['RD-04-C01','RD-05-C03','RD-01-C03'], 'closed class ids changed'"),
    ("['RD-01-C03','RD-02-C04','RD-03-C04','RD-06-C01'], 'open selected ids changed'", "['RD-02-C04','RD-03-C04','RD-06-C01'], 'open selected ids changed'"),
    ("promoted_class_receipts?.minItems === 2 && schema?.properties?.promoted_class_receipts?.maxItems === 2", "promoted_class_receipts?.minItems === 3 && schema?.properties?.promoted_class_receipts?.maxItems === 3"),
    ("selected_classes_open?.minItems === 4 && schema?.properties?.selected_classes_open?.maxItems === 4", "selected_classes_open?.minItems === 3 && schema?.properties?.selected_classes_open?.maxItems === 3"),
    ("closed_residual_classes?.const === 2", "closed_residual_classes?.const === 3"),
    ("open_residual_classes?.const === 40", "open_residual_classes?.const === 39"),
]:
    replace_once(VALIDATOR, old, new)
replace_once(
    VALIDATOR,
    """  const rd04 = current.promoted_class_receipts[0];\n  const rd05 = current.promoted_class_receipts[1];""",
    """  const rd04 = current.promoted_class_receipts[0];\n  const rd05 = current.promoted_class_receipts[1];\n  const rd01 = current.promoted_class_receipts[2];"""
)
replace_once(
    VALIDATOR,
    """  ok(rd05.label_reconciliation === 'receipt_and_seed_label_omit_the_constitutional_qualifier_complete; class identity remains bound by RD-05-C03 and issue 790', 'RD-05 label reconciliation changed');\n\n  ok(Array.isArray(current.selected_classes_open)""",
    """  ok(rd05.label_reconciliation === 'receipt_and_seed_label_omit_the_constitutional_qualifier_complete; class identity remains bound by RD-05-C03 and issue 790', 'RD-05 label reconciliation changed');\n  ok(rd01.lane_id === 'RD-01' && rd01.issue === 786 && rd01.source_pr === 801, 'RD-01 custody changed');\n  ok(rd01.merge_commit === '64af19ce7f860a7024a37ba5b6eef796b57c87b1', 'RD-01 merge custody changed');\n  ok(rd01.manifest_combined_sha256 === '7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798', 'RD-01 manifest custody changed');\n  ok(rd01.terminal_state === 'bounded_source_unavailable', 'RD-01 terminal state changed');\n  ok(rd01.labels_exact_match === true && rd01.label_reconciliation === 'none', 'RD-01 label state changed');\n\n  ok(Array.isArray(current.selected_classes_open)"""
)

for old, new in [
    ("['close count', (v) => { v.counts.closed_residual_classes = 3; }]", "['close count', (v) => { v.counts.closed_residual_classes = 4; }]"),
    ("['open count', (v) => { v.counts.open_residual_classes = 39; }]", "['open count', (v) => { v.counts.open_residual_classes = 38; }]"),
    ("s.properties.promoted_class_receipts.maxItems = 3", "s.properties.promoted_class_receipts.maxItems = 4"),
    ("s.properties.selected_classes_open.minItems = 3", "s.properties.selected_classes_open.minItems = 4"),
]:
    replace_once(TEST, old, new)
replace_once(
    TEST,
    """  ['RD-05 label reconciliation changed', (v) => { v.promoted_class_receipts[1].label_reconciliation = 'none'; }],\n  ['manifest changed'""",
    """  ['RD-05 label reconciliation changed', (v) => { v.promoted_class_receipts[1].label_reconciliation = 'none'; }],\n  ['RD-01 state changed', (v) => { v.promoted_class_receipts[2].terminal_state = 'evidence_complete'; }],\n  ['RD-01 merge custody changed', (v) => { v.promoted_class_receipts[2].merge_commit = '0'.repeat(40); }],\n  ['manifest changed'"""
)

schema = json.loads(read(SCHEMA))
props = schema['properties']
props['authority']['const'] = 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'
promoted = props['promoted_class_receipts']
promoted['minItems'] = 3
promoted['maxItems'] = 3
promoted_props = promoted['items']['properties']
promoted_props['lane_id']['enum'] = ['RD-04', 'RD-05', 'RD-01']
promoted_props['class_id']['enum'] = ['RD-04-C01', 'RD-05-C03', 'RD-01-C03']
promoted_props['issue']['enum'] = [789, 790, 786]
promoted_props['source_pr']['enum'] = [804, 805, 801]
promoted_props['closure_reference_path']['pattern'] = r'^data/project/ssc-residual-wave02/closures/(RD-04-C01|RD-05-C03|RD-01-C03)\.json$'
open_items = props['selected_classes_open']
open_items['minItems'] = 3
open_items['maxItems'] = 3
open_props = open_items['items']['properties']
open_props['lane_id']['enum'] = ['RD-02', 'RD-03', 'RD-06']
open_props['class_id']['enum'] = ['RD-02-C04', 'RD-03-C04', 'RD-06-C01']
open_props['issue']['enum'] = [787, 788, 791]
counts = props['counts']['properties']
counts['terminal_class_receipts']['const'] = 3
counts['classes_closed_this_wave']['const'] = 3
counts['closed_residual_classes']['const'] = 3
counts['open_residual_classes']['const'] = 39
result = props['current_result']['properties']
result['terminal_state']['const'] = 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open'
result['classes_closed']['const'] = 3
result['classes_open']['const'] = 39
result['closed_class_ids']['const'] = ['RD-04-C01', 'RD-05-C03', 'RD-01-C03']
result['open_selected_class_ids']['const'] = ['RD-02-C04', 'RD-03-C04', 'RD-06-C01']
write(SCHEMA, json.dumps(schema, separators=(',', ':')) + '\n')

write(DOC, """# SSC residual-denominator Wave 02 — current cumulative ledger

The first promotion object at:

```text
data/research/status-sovereignty-residual-denominator-wave-02-progress.json
```

is an exact historical snapshot of the first class promotion. It correctly records RD‑04 alone at `41 open / 1 closed`, but it is not the cumulative current ledger after RD‑05 and RD‑01 merged.

The cumulative state is generated at:

```text
data/research/status-sovereignty-residual-denominator-wave-02-current.json
```

## Current atlas

```text
canonical residual classes: 42
closed residual classes:     3
open residual classes:      39

closed in promotion order:
RD-04-C01  bounded_source_unavailable
RD-05-C03  bounded_non_link
RD-01-C03  bounded_source_unavailable

selected attempts still open:
RD-02-C04
RD-03-C04
RD-06-C01
```

The current ledger is derived only from the Wave‑02 constitution, the immutable Wave‑01 starting registry, the historical first-promotion snapshot, and the exact RD‑04, RD‑05, and RD‑01 closure references and class receipts. RD‑01 is bound to merge `64af19ce7f860a7024a37ba5b6eef796b57c87b1` and manifest `7d5cc33a8fb8fc759dd2794076ffcd7ca4e1ad9c463f49593459edfca793a798`.

## Label custody

RD‑05’s constitution uses:

```text
complete recommendation, agency response, adoption, rejection,
implementation, and outcome ledger
```

Its seed and terminal receipt use the same phrase without the qualifier `complete`. The current ledger preserves both strings and records one explicit label reconciliation. RD‑01’s constitutional and receipt labels match exactly.

## RD‑01 terminal limit

```text
frozen / terminal rows:       102 / 102
final successful routes:      612 / 612
legal entities resolved:       48
identity ambiguous:            44
identity source unavailable:    10
automatic third pass:        false
```

The ten source-unavailable rows are typed public-record limits, not entity-absence findings. Legal-entity resolution is not parent or common control, selector causation, technical superiority, coordination, common purpose, publication, adoption, or graph evidence.

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

The RD‑05 `bounded_non_link` does not establish that private advice, informal influence, or unpublished action did not occur. The RD‑04 and RD‑01 source gaps do not establish record absence or noncompliance. Three class closures do not close any broader lane or Wave 02.
""")

print('patched Wave-02 current ledger sources for 39 open / 3 closed')
