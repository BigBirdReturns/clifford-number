#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path('.')
RECONCILIATION = 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact'
CONSTITUTIONAL_LABEL = 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms'
SEED_LABEL = 'loan, warrant, security, covenant, milestone, pricing, and seniority terms'


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


builder = 'tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs'
replace_once(
    builder,
    f"""    labels_exact_match: false,\n    label_reconciliation: '{RECONCILIATION}',""",
    """    labels_exact_match: true,\n    label_reconciliation: 'none',""",
    'builder flattened RD-03 label state',
)
replace_once(
    builder,
    """  const labelsMatch = expected.class_id === 'RD-03-C04'\n    ? closure?.label_custody?.labels_exact_match\n    : receipt.class_label === constitutionalAttempt.exact_label;\n  ok(labelsMatch === expected.labels_exact_match, `${expected.class_id}: label-reconciliation state changed`);""",
    f"""  const labelsMatch = receipt.class_label === constitutionalAttempt.exact_label;\n  ok(labelsMatch === expected.labels_exact_match, `${{expected.class_id}}: receipt/constitution label state changed`);\n\n  if (expected.class_id === 'RD-03-C04') {{\n    const seedLabelCustody = {{\n      constitutional_class_label: '{CONSTITUTIONAL_LABEL}',\n      seed_closure_target: '{SEED_LABEL}',\n      labels_exact_match: false,\n      reconciliation: '{RECONCILIATION}'\n    }};\n    same(closure?.label_custody, seedLabelCustody, 'RD-03 closure seed-label custody changed');\n    same(receipt?.label_custody, seedLabelCustody, 'RD-03 receipt seed-label custody changed');\n  }}""",
    'builder separates flattened and seed label custody',
)
replace_once(
    builder,
    '      label_reconciliations: 2,',
    '      label_reconciliations: 1,',
    'builder reconciliation count',
)

validator = 'tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs'
replace_once(
    validator,
    "ok(Array.isArray(current.promoted_class_receipts) && current.promoted_class_receipts.length === 5, 'four promoted class receipts required');",
    "ok(Array.isArray(current.promoted_class_receipts) && current.promoted_class_receipts.length === 5, 'five promoted class receipts required');",
    'current validator receipt denominator message',
)
replace_once(
    validator,
    """  ok(rd03.labels_exact_match === false, 'RD-03 label mismatch must remain explicit');\n  ok(rd03.label_reconciliation === 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact', 'RD-03 label reconciliation changed');""",
    """  ok(rd03.labels_exact_match === true, 'RD-03 receipt/constitution label match changed');\n  ok(rd03.label_reconciliation === 'none', 'RD-03 flattened label reconciliation changed');""",
    'current validator flattened RD-03 label state',
)
replace_once(
    validator,
    "ok(Array.isArray(current.selected_classes_open) && current.selected_classes_open.length === 1, 'two selected classes must remain open');",
    "ok(Array.isArray(current.selected_classes_open) && current.selected_classes_open.length === 1, 'one selected class must remain open');",
    'current validator open denominator message',
)

schema_path = ROOT / 'schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json'
schema = json.loads(schema_path.read_text())
current_const = schema['properties']['counts']['properties']['label_reconciliations'].get('const')
if current_const != 2:
    raise SystemExit(f'schema reconciliation count: expected 2, found {current_const!r}')
schema['properties']['counts']['properties']['label_reconciliations']['const'] = 1
schema_path.write_text(json.dumps(schema, separators=(',', ':')) + '\n')

current_test = 'test/status-sovereignty-residual-denominator-wave-02-current.test.js'
replace_once(
    current_test,
    "  ['RD-03 label reconciliation erased', (v) => { v.promoted_class_receipts[4].labels_exact_match = true; }],",
    f"""  ['RD-03 receipt/constitution match falsified', (v) => {{ v.promoted_class_receipts[4].labels_exact_match = false; }}],\n  ['RD-03 flattened reconciliation invented', (v) => {{ v.promoted_class_receipts[4].label_reconciliation = '{RECONCILIATION}'; }}],""",
    'current adversarial flattened label mutations',
)

rd03_validator = 'tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs'
replace_once(
    rd03_validator,
    'rd03?.labels_exact_match===false&&rd03?.label_reconciliation===LABEL_RECONCILIATION',
    "rd03?.labels_exact_match===true&&rd03?.label_reconciliation==='none'",
    'RD-03 validator flattened label state',
)

rd03_test = 'test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js'
replace_once(
    rd03_test,
    "['post reconciliation',v=>{v.promoted_class_receipts[4].label_reconciliation='none';}],['post exact label flag',v=>{v.promoted_class_receipts[4].labels_exact_match=true;}],",
    f"""['post flattened reconciliation',v=>{{v.promoted_class_receipts[4].label_reconciliation='{RECONCILIATION}';}}],['post exact label flag',v=>{{v.promoted_class_receipts[4].labels_exact_match=false;}}],""",
    'RD-03 adversarial flattened label mutations',
)

rd06_validator = 'tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs'
replace_once(
    rd06_validator,
    '    current.counts.label_reconciliations === 2 &&',
    '    current.counts.label_reconciliations === 1 &&',
    'RD-06 successor reconciliation count',
)
replace_once(
    rd06_validator,
    f"""      labels_exact_match: false,\n      label_reconciliation: '{RECONCILIATION}',""",
    """      labels_exact_match: true,\n      label_reconciliation: 'none',""",
    'RD-06 successor flattened RD-03 label state',
)

rd06_test = 'test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js'
replace_once(
    rd06_test,
    """const preCustodyMutations = [""",
    f"""const postRd03CustodyMutations = [\n  ['post-RD-03 receipt/constitution match falsified', (v) => {{ v.promoted_class_receipts[4].labels_exact_match = false; }}],\n  ['post-RD-03 flattened reconciliation invented', (v) => {{ v.promoted_class_receipts[4].label_reconciliation = '{RECONCILIATION}'; }}],\n  ['post-RD-03 reconciliation count inflated', (v) => {{ v.counts.label_reconciliations = 2; }}]\n];\n\nfor (const [name, mutate] of postRd03CustodyMutations) {{\n  const candidate = clone(currentLedger);\n  mutate(candidate);\n  assert.throws(() => validateCurrentAtlasCustody(candidate), undefined, name);\n}}\n\nconst preCustodyMutations = [""",
    'RD-06 successor label mutation suite',
)
replace_once(
    rd06_test,
    'mutations.length + schemaMutations.length + custodyMutations.length + preCustodyMutations.length',
    'mutations.length + schemaMutations.length + custodyMutations.length + postRd03CustodyMutations.length + preCustodyMutations.length',
    'RD-06 mutation denominator',
)

docs = 'docs/milestones/ssc-residual-denominator-wave-02-current.md'
replace_once(
    docs,
    f"""RD‑05 retains its explicit omission of the constitutional qualifier `complete`. RD‑03 retains the constitution’s `complete negotiated` label and the seed’s shorter label as separate historical objects; the reconciliation `{RECONCILIATION}` does not silently rewrite either object. Two label reconciliations are therefore explicit in the cumulative ledger.""",
    f"""RD‑05 retains its explicit receipt-versus-constitution omission of the qualifier `complete`; it is the cumulative ledger’s one flattened label reconciliation. RD‑03’s receipt label and constitutional label are byte-identical, so its cumulative row records `labels_exact_match: true` and `label_reconciliation: none`. The shorter RD‑03 seed target remains separately and exactly bound in the receipt and closure `label_custody` objects with reconciliation `{RECONCILIATION}`; neither historical object is rewritten.""",
    'milestone separates flattened and seed label custody',
)

print('repaired flattened RD-03 receipt/constitution semantics while preserving exact seed-label custody')
