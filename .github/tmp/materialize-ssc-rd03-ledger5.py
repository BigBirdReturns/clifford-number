#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()
MERGE = "580d9c998f747330d190bed5011c7a1a517a1c0d"
MANIFEST = "1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e"
LABEL = "complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms"
RECON = "constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact"


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value)


def replace_once(value: str, old: str, new: str, label: str) -> str:
    count = value.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return value.replace(old, new, 1)


builder_path = "tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs"
b = read(builder_path)
rd03 = f""",
  {{
    lane_id: 'RD-03',
    class_id: 'RD-03-C04',
    issue: 788,
    source_pr: 803,
    merge_commit: '{MERGE}',
    constitutional_exact_label: '{LABEL}',
    receipt_class_label: '{LABEL}',
    labels_exact_match: false,
    label_reconciliation: '{RECON}',
    terminal_state: 'bounded_source_unavailable',
    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-03-C04.json',
    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json',
    manifest_combined_sha256: '{MANIFEST}'
  }}
"""
b = replace_once(b, "\n]);\n\nconst OPEN_IDS", rd03 + "]);\n\nconst OPEN_IDS", "insert RD-03 receipt")
b = replace_once(b, "const OPEN_IDS = Object.freeze(['RD-02-C04', 'RD-03-C04']);", "const OPEN_IDS = Object.freeze(['RD-02-C04']);", "open ids")
b = replace_once(
    b,
    "  const labelsMatch = receipt.class_label === constitutionalAttempt.exact_label;",
    "  const labelsMatch = expected.class_id === 'RD-03-C04'\n    ? closure?.label_custody?.labels_exact_match\n    : receipt.class_label === constitutionalAttempt.exact_label;",
    "label custody",
)
old_atlas = """  } else {
    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, {
      canonical_classes: 42,
      open_before: 39,
      closed_before: 3,
      open_after: 38,
      closed_after: 4
    }, 'RD-06 atlas effect changed');
  }
"""
new_atlas = """  } else if (expected.class_id === 'RD-06-C01') {
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
"""
b = replace_once(b, old_atlas, new_atlas, "atlas custody")
for old, new, label in [
    ("authority: 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "authority: 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "builder authority"),
    ("terminal_class_receipts: 4", "terminal_class_receipts: 5", "receipt count"),
    ("classes_closed_this_wave: 4", "classes_closed_this_wave: 5", "wave closed count"),
    ("closed_residual_classes: 4", "closed_residual_classes: 5", "closed count"),
    ("open_residual_classes: 38", "open_residual_classes: 37", "open count"),
    ("label_reconciliations: 1", "label_reconciliations: 2", "label count"),
    ("terminal_state: 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open'", "terminal_state: 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open'", "result state"),
    ("classes_closed: 4", "classes_closed: 5", "result closed"),
    ("classes_open: 38", "classes_open: 37", "result open"),
    ("console.log('Wave-02 current ledger: 38 open / 4 closed; receipts RD-04, RD-05, RD-01, and RD-06');", "console.log('Wave-02 current ledger: 37 open / 5 closed; receipts RD-04, RD-05, RD-01, RD-06, and RD-03');", "console result"),
]:
    b = replace_once(b, old, new, label)
write(builder_path, b)

validator_path = "tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs"
v = read(validator_path)
for old, new, label in [
    ("current.authority === 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "current.authority === 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "validator authority"),
    ("current.promoted_class_receipts.length === 4", "current.promoted_class_receipts.length === 5", "validator receipt length"),
    ("['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']", "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']", "promoted order"),
    ("  const rd06 = current.promoted_class_receipts[3];", "  const rd06 = current.promoted_class_receipts[3];\n  const rd03 = current.promoted_class_receipts[4];", "RD03 declaration"),
    ("current.selected_classes_open.length === 2", "current.selected_classes_open.length === 1", "open length"),
    ("['RD-02-C04','RD-03-C04']", "['RD-02-C04']", "open order"),
    ("current.counts.terminal_class_receipts === 4", "current.counts.terminal_class_receipts === 5", "validator receipt count"),
    ("current.counts.classes_closed_this_wave === 4 && current.counts.closed_residual_classes === 4", "current.counts.classes_closed_this_wave === 5 && current.counts.closed_residual_classes === 5", "validator closed counts"),
    ("current.counts.open_residual_classes === 38", "current.counts.open_residual_classes === 37", "validator open count"),
    ("current.current_result.terminal_state === 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open'", "current.current_result.terminal_state === 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open'", "validator terminal state"),
    ("current.current_result.classes_closed === 4 && current.current_result.classes_open === 38", "current.current_result.classes_closed === 5 && current.current_result.classes_open === 37", "validator result arithmetic"),
    ("schema?.properties?.promoted_class_receipts?.minItems === 4 && schema?.properties?.promoted_class_receipts?.maxItems === 4", "schema?.properties?.promoted_class_receipts?.minItems === 5 && schema?.properties?.promoted_class_receipts?.maxItems === 5", "schema receipt validator"),
    ("schema?.properties?.selected_classes_open?.minItems === 2 && schema?.properties?.selected_classes_open?.maxItems === 2", "schema?.properties?.selected_classes_open?.minItems === 1 && schema?.properties?.selected_classes_open?.maxItems === 1", "schema open validator"),
    ("schema?.properties?.counts?.properties?.closed_residual_classes?.const === 4", "schema?.properties?.counts?.properties?.closed_residual_classes?.const === 5", "schema closed validator"),
    ("schema?.properties?.counts?.properties?.open_residual_classes?.const === 38", "schema?.properties?.counts?.properties?.open_residual_classes?.const === 37", "schema open count validator"),
]:
    v = replace_once(v, old, new, label)
rd03_checks = f"""  ok(rd03.lane_id === 'RD-03' && rd03.issue === 788 && rd03.source_pr === 803, 'RD-03 custody changed');
  ok(rd03.merge_commit === '{MERGE}', 'RD-03 merge custody changed');
  ok(rd03.manifest_combined_sha256 === '{MANIFEST}', 'RD-03 manifest custody changed');
  ok(rd03.terminal_state === 'bounded_source_unavailable', 'RD-03 terminal state changed');
  ok(rd03.labels_exact_match === false, 'RD-03 label mismatch must remain explicit');
  ok(rd03.label_reconciliation === '{RECON}', 'RD-03 label reconciliation changed');
"""
anchor = "  ok(rd06.labels_exact_match === true && rd06.label_reconciliation === 'none', 'RD-06 label state changed');\n"
v = replace_once(v, anchor, anchor + rd03_checks, "RD03 validator checks")
v = replace_once(v, "same(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01'], 'closed class ids changed');", "same(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04'], 'closed class ids changed');", "closed ids")
v = replace_once(v, "same(current.current_result.open_selected_class_ids, ['RD-02-C04','RD-03-C04'], 'open selected ids changed');", "same(current.current_result.open_selected_class_ids, ['RD-02-C04'], 'open selected ids changed');", "open ids result")
write(validator_path, v)

schema_path = "schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json"
s = json.loads(read(schema_path))
p = s["properties"]
p["authority"]["const"] = "five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority"
receipts = p["promoted_class_receipts"]
receipts["minItems"] = receipts["maxItems"] = 5
rp = receipts["items"]["properties"]
for key, value in [("lane_id", "RD-03"), ("class_id", "RD-03-C04"), ("issue", 788), ("source_pr", 803)]:
    rp[key]["enum"].append(value)
rp["closure_reference_path"]["pattern"] = r"^data/project/ssc-residual-wave02/closures/(RD-04-C01|RD-05-C03|RD-01-C03|RD-06-C01|RD-03-C04)\.json$"
opens = p["selected_classes_open"]
opens["minItems"] = opens["maxItems"] = 1
op = opens["items"]["properties"]
op["lane_id"]["enum"] = ["RD-02"]
op["class_id"]["enum"] = ["RD-02-C04"]
op["issue"]["enum"] = [787]
counts = p["counts"]["properties"]
for key, value in [("terminal_class_receipts", 5), ("classes_closed_this_wave", 5), ("closed_residual_classes", 5), ("open_residual_classes", 37), ("label_reconciliations", 2)]:
    counts[key]["const"] = value
result = p["current_result"]["properties"]
result["terminal_state"]["const"] = "five_of_forty_two_residual_classes_closed_one_selected_attempt_open"
result["classes_closed"]["const"] = 5
result["classes_open"]["const"] = 37
result["closed_class_ids"]["const"] = ["RD-04-C01", "RD-05-C03", "RD-01-C03", "RD-06-C01", "RD-03-C04"]
result["open_selected_class_ids"]["const"] = ["RD-02-C04"]
write(schema_path, json.dumps(s, separators=(",", ":")) + "\n")

test_path = "test/status-sovereignty-residual-denominator-wave-02-current.test.js"
t = read(test_path)
for old, new, label in [
    ("v.counts.closed_residual_classes = 5", "v.counts.closed_residual_classes = 6", "test close count"),
    ("v.counts.open_residual_classes = 37", "v.counts.open_residual_classes = 36", "test open count"),
    ("s.properties.promoted_class_receipts.maxItems = 5", "s.properties.promoted_class_receipts.maxItems = 4", "test schema receipts"),
    ("['open selected order changed', (v) => { v.selected_classes_open.reverse(); }]", "['open selected identity changed', (v) => { v.selected_classes_open[0].class_id = 'RD-03-C04'; }]", "test open identity"),
]:
    t = replace_once(t, old, new, label)
rd03_mutations = """  ['RD-03 state changed', (v) => { v.promoted_class_receipts[4].terminal_state = 'evidence_complete'; }],
  ['RD-03 merge custody changed', (v) => { v.promoted_class_receipts[4].merge_commit = '0'.repeat(40); }],
  ['RD-03 label reconciliation erased', (v) => { v.promoted_class_receipts[4].labels_exact_match = true; }],
"""
t = replace_once(t, "  ['RD-06 merge custody changed', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],\n", "  ['RD-06 merge custody changed', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],\n" + rd03_mutations, "RD03 test mutations")
write(test_path, t)

workflow_path = ".github/workflows/status-sovereignty-residual-denominator-wave-02-current.yml"
w = read(workflow_path)
for old, new, label in [
    ("      - 'data/project/ssc-residual-wave02/closures/RD-06-C01.json'\n", "      - 'data/project/ssc-residual-wave02/closures/RD-06-C01.json'\n      - 'data/project/ssc-residual-wave02/closures/RD-03-C04.json'\n", "workflow closure paths"),
    ("      - 'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json'\n", "      - 'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json'\n      - 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json'\n", "workflow receipt paths"),
]:
    count = w.count(old)
    if count != 2:
        raise RuntimeError(f"{label}: expected two matches, found {count}")
    w = w.replace(old, new)
write(workflow_path, w)

milestone = f"""# SSC residual-denominator Wave 02 — current cumulative ledger

The first-promotion object remains immutable historical evidence. The cumulative current ledger is:

```text
data/research/status-sovereignty-residual-denominator-wave-02-current.json
```

## Current atlas

```text
canonical residual classes: 42
closed residual classes:     5
open residual classes:      37

closed in promotion order:
RD-04-C01  bounded_source_unavailable
RD-05-C03  bounded_non_link
RD-01-C03  bounded_source_unavailable
RD-06-C01  bounded_source_restricted
RD-03-C04  bounded_source_unavailable

selected attempt still open:
RD-02-C04
```

RD‑03 is bound to merged PR #803, merge `{MERGE}`, and terminal manifest `{MANIFEST}`. Its five-instrument fixed protocol retains 8 observed fields, 15 conditional-term-only fields, 47 source-unavailable fields, 30 fixed routes, 15 HTTP successes, 15 typed terminal non-successes, 150 candidate rows, and zero admitted sources.

## Label custody

RD‑05 retains its explicit omission of the constitutional qualifier `complete`. RD‑03 retains the constitution’s `complete negotiated` label and the seed’s shorter label as separate historical objects; the reconciliation `{RECON}` does not silently rewrite either object. Two label reconciliations are therefore explicit in the cumulative ledger.

## Pre/post-promotion custody

The permanent RD‑03 validator accepts exactly the four-closure pre-promotion atlas or this five-closure post-promotion atlas. In the latter, RD‑03 must be the fifth promoted receipt with exact PR, merge, manifest, label, terminal-state, closure, receipt, authority-zero, and effect-ceiling custody. RD‑02 remains the sole open selected class; Wave 02 is not complete.

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

A typed source-unavailable field is not evidence that a term, instrument, obligation, payment, waiver, or record does not exist. Five class closures do not close a broader lane, the complete compact, or Wave 02.
"""
write("docs/milestones/ssc-residual-denominator-wave-02-current.md", milestone)

print("patched seven permanent five-closure ledger paths")
