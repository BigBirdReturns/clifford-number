#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path.cwd()


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = ROOT / path
    text = target.read_text()
    observed = text.count(old)
    if observed != expected:
        raise SystemExit(f"{path}: expected {expected} occurrences, observed {observed}: {old!r}")
    target.write_text(text.replace(old, new))


current = json.loads((ROOT / 'data/research/status-sovereignty-residual-denominator-wave-02-current.json').read_text())
assert current['counts']['canonical_residual_classes'] == 42
assert current['counts']['closed_residual_classes'] == 3
assert current['counts']['open_residual_classes'] == 39
assert current['current_result']['closed_class_ids'] == ['RD-04-C01', 'RD-05-C03', 'RD-01-C03']
assert 'RD-06-C01' in current['current_result']['open_selected_class_ids']

old_key = 'residual_atlas_effect_if_promoted_after_rd04_and_rd05'
new_key = 'residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01'

builder = 'tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs'
replace_exact(builder, old_key, new_key, expected=3)
replace_exact(
    builder,
    "      canonical_classes: 42,\n      open_before: 40,\n      closed_before: 2,\n      open_after: 39,\n      closed_after: 3",
    "      canonical_classes: 42,\n      open_before: 39,\n      closed_before: 3,\n      open_after: 38,\n      closed_after: 4",
)

validator = 'tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs'
replace_exact(validator, old_key, new_key, expected=3)
replace_exact(
    validator,
    "{ canonical_classes: 42, open_before: 40, closed_before: 2, open_after: 39, closed_after: 3 }",
    "{ canonical_classes: 42, open_before: 39, closed_before: 3, open_after: 38, closed_after: 4 }",
)
replace_exact(
    validator,
    "ok(current?.counts?.canonical_residual_classes === 42 && current?.counts?.closed_residual_classes === 2 && current?.counts?.open_residual_classes === 40, 'current atlas pre-promotion state changed');",
    "ok(current?.counts?.canonical_residual_classes === 42 && current?.counts?.closed_residual_classes === 3 && current?.counts?.open_residual_classes === 39, 'current atlas pre-promotion state changed');",
)
replace_exact(
    validator,
    "same(current?.current_result?.closed_class_ids, ['RD-04-C01','RD-05-C03'], 'prior closed-class custody changed');",
    "same(current?.current_result?.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03'], 'prior closed-class custody changed');",
)

suite = 'test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js'
replace_exact(suite, old_key, new_key, expected=1)

milestone = 'docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md'
replace_exact(
    milestone,
    "atlas before promotion:\n40 open / 2 closed\n\natlas after promotion:\n39 open / 3 closed",
    "atlas before promotion:\n39 open / 3 closed\n\natlas after promotion:\n38 open / 4 closed",
)

print('RD-06 source rebind prepared: 39/3 -> 38/4')
