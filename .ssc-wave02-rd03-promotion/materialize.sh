set -Eeuo pipefail

EXPECTED_MAIN='580d9c998f747330d190bed5011c7a1a517a1c0d'
TARGET_BRANCH='agent/ssc-wave02-current-ledger-five-closures'

start="$(git rev-parse HEAD)"
test "$start" = "$EXPECTED_MAIN"
git fetch --no-tags origin main
test "$(git rev-parse FETCH_HEAD)" = "$EXPECTED_MAIN"
node tools/validate-no-magic-human-gate.mjs

python - <<'PY'
from pathlib import Path
import json

ROOT = Path('.')

def replace_once(path, old, new, label):
    p = ROOT / path
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    p.write_text(text.replace(old, new, 1))

builder = 'tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs'
replace_once(
    builder,
    "    manifest_combined_sha256: '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5'\n  }\n]);\n\nconst OPEN_IDS = Object.freeze(['RD-02-C04', 'RD-03-C04']);",
    "    manifest_combined_sha256: '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5'\n  },\n  {\n    lane_id: 'RD-03',\n    class_id: 'RD-03-C04',\n    issue: 788,\n    source_pr: 803,\n    merge_commit: '580d9c998f747330d190bed5011c7a1a517a1c0d',\n    constitutional_exact_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',\n    receipt_class_label: 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms',\n    labels_exact_match: false,\n    label_reconciliation: 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact',\n    terminal_state: 'bounded_source_unavailable',\n    closure_reference_path: 'data/project/ssc-residual-wave02/closures/RD-03-C04.json',\n    class_receipt_path: 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json',\n    manifest_combined_sha256: '1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e'\n  }\n]);\n\nconst OPEN_IDS = Object.freeze(['RD-02-C04']);",
    'builder closed denominator insertion'
)
replace_once(
    builder,
    "  const labelsMatch = receipt.class_label === constitutionalAttempt.exact_label;\n  ok(labelsMatch === expected.labels_exact_match, `${expected.class_id}: label-reconciliation state changed`);",
    "  const labelsMatch = expected.class_id === 'RD-03-C04'\n    ? closure?.label_custody?.labels_exact_match\n    : receipt.class_label === constitutionalAttempt.exact_label;\n  ok(labelsMatch === expected.labels_exact_match, `${expected.class_id}: label-reconciliation state changed`);\n  if (expected.class_id === 'RD-03-C04') {\n    ok(closure?.label_custody?.constitutional_class_label === expected.constitutional_exact_label, 'RD-03 constitutional label custody changed');\n    ok(closure?.label_custody?.seed_closure_target === 'loan, warrant, security, covenant, milestone, pricing, and seniority terms', 'RD-03 seed label custody changed');\n    ok(closure?.label_custody?.reconciliation === expected.label_reconciliation, 'RD-03 label reconciliation changed');\n  }",
    'builder label custody'
)
replace_once(
    builder,
    "  } else {\n    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, {\n      canonical_classes: 42,\n      open_before: 39,\n      closed_before: 3,\n      open_after: 38,\n      closed_after: 4\n    }, 'RD-06 atlas effect changed');\n  }",
    "  } else if (expected.class_id === 'RD-06-C01') {\n    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, {\n      canonical_classes: 42,\n      open_before: 39,\n      closed_before: 3,\n      open_after: 38,\n      closed_after: 4\n    }, 'RD-06 atlas effect changed');\n  } else {\n    same(closure?.residual_atlas_effect_if_promoted_after_rd04_rd05_rd01_and_rd06, {\n      canonical_classes: 42,\n      open_before: 38,\n      closed_before: 4,\n      open_after: 37,\n      closed_after: 5\n    }, 'RD-03 atlas effect changed');\n  }",
    'builder atlas transition'
)
for old, new, label in [
    ("as_of: '2026-08-03'", "as_of: '2026-08-04'", 'builder as_of'),
    ("authority: 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "authority: 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", 'builder authority'),
    ('terminal_class_receipts: 4,', 'terminal_class_receipts: 5,', 'builder receipt count'),
    ('classes_closed_this_wave: 4,', 'classes_closed_this_wave: 5,', 'builder wave closed count'),
    ('closed_residual_classes: 4,', 'closed_residual_classes: 5,', 'builder closed count'),
    ('open_residual_classes: 38,', 'open_residual_classes: 37,', 'builder open count'),
    ('label_reconciliations: 1,', 'label_reconciliations: 2,', 'builder label count'),
    ("terminal_state: 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open'", "terminal_state: 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open'", 'builder terminal state'),
    ('classes_closed: 4,', 'classes_closed: 5,', 'builder result closed'),
    ('classes_open: 38,', 'classes_open: 37,', 'builder result open'),
    ("console.log('Wave-02 current ledger: 38 open / 4 closed; receipts RD-04, RD-05, RD-01, and RD-06');", "console.log('Wave-02 current ledger: 37 open / 5 closed; receipts RD-04, RD-05, RD-01, RD-06, and RD-03');", 'builder console')
]:
    replace_once(builder, old, new, label)

validator = 'tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs'
for old, new, label in [
    ("current.as_of === '2026-08-03'", "current.as_of === '2026-08-04'", 'validator as_of'),
    ("current.authority === 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", "current.authority === 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'", 'validator authority'),
    ('current.promoted_class_receipts.length === 4', 'current.promoted_class_receipts.length === 5', 'validator receipt length'),
    ("['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']", "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']", 'validator promoted order first'),
    ('current.selected_classes_open.length === 2', 'current.selected_classes_open.length === 1', 'validator open length'),
    ("['RD-02-C04','RD-03-C04']", "['RD-02-C04']", 'validator open order first'),
    ('current.counts.terminal_class_receipts === 4', 'current.counts.terminal_class_receipts === 5', 'validator receipt count'),
    ('current.counts.classes_closed_this_wave === 4 && current.counts.closed_residual_classes === 4', 'current.counts.classes_closed_this_wave === 5 && current.counts.closed_residual_classes === 5', 'validator closed count'),
    ('current.counts.open_residual_classes === 38', 'current.counts.open_residual_classes === 37', 'validator open count'),
    ("current.current_result.terminal_state === 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open'", "current.current_result.terminal_state === 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open'", 'validator terminal state'),
    ('current.current_result.classes_closed === 4 && current.current_result.classes_open === 38', 'current.current_result.classes_closed === 5 && current.current_result.classes_open === 37', 'validator result arithmetic'),
    ('schema?.properties?.promoted_class_receipts?.minItems === 4 && schema?.properties?.promoted_class_receipts?.maxItems === 4', 'schema?.properties?.promoted_class_receipts?.minItems === 5 && schema?.properties?.promoted_class_receipts?.maxItems === 5', 'validator schema receipt denominator'),
    ('schema?.properties?.selected_classes_open?.minItems === 2 && schema?.properties?.selected_classes_open?.maxItems === 2', 'schema?.properties?.selected_classes_open?.minItems === 1 && schema?.properties?.selected_classes_open?.maxItems === 1', 'validator schema open denominator'),
    ('schema?.properties?.counts?.properties?.closed_residual_classes?.const === 4', 'schema?.properties?.counts?.properties?.closed_residual_classes?.const === 5', 'validator schema closed count'),
    ('schema?.properties?.counts?.properties?.open_residual_classes?.const === 38', 'schema?.properties?.counts?.properties?.open_residual_classes?.const === 37', 'validator schema open count')
]:
    replace_once(validator, old, new, label)
replace_once(validator, "  const rd06 = current.promoted_class_receipts[3];", "  const rd06 = current.promoted_class_receipts[3];\n  const rd03 = current.promoted_class_receipts[4];", 'validator RD03 variable')
replace_once(
    validator,
    "  ok(rd06.labels_exact_match === true && rd06.label_reconciliation === 'none', 'RD-06 label state changed');",
    "  ok(rd06.labels_exact_match === true && rd06.label_reconciliation === 'none', 'RD-06 label state changed');\n  ok(rd03.lane_id === 'RD-03' && rd03.issue === 788 && rd03.source_pr === 803, 'RD-03 custody changed');\n  ok(rd03.merge_commit === '580d9c998f747330d190bed5011c7a1a517a1c0d', 'RD-03 merge custody changed');\n  ok(rd03.manifest_combined_sha256 === '1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e', 'RD-03 manifest custody changed');\n  ok(rd03.terminal_state === 'bounded_source_unavailable', 'RD-03 terminal state changed');\n  ok(rd03.constitutional_exact_label === 'complete negotiated loan, warrant, security, covenant, milestone, pricing, and seniority terms', 'RD-03 constitutional label changed');\n  ok(rd03.receipt_class_label === rd03.constitutional_exact_label, 'RD-03 receipt label changed');\n  ok(rd03.labels_exact_match === false, 'RD-03 seed/constitution mismatch must remain explicit');\n  ok(rd03.label_reconciliation === 'constitution_adds_complete_and_negotiated_qualifiers_while_seed_label_is_retained_exact', 'RD-03 label reconciliation changed');",
    'validator RD03 custody assertions'
)
replace_once(validator, "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']", "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']", 'validator result closed ids')
replace_once(validator, "['RD-02-C04','RD-03-C04']", "['RD-02-C04']", 'validator result open ids')

test_path = 'test/status-sovereignty-residual-denominator-wave-02-current.test.js'
for old, new, label in [
    ("['close count', (v) => { v.counts.closed_residual_classes = 5; }]", "['close count', (v) => { v.counts.closed_residual_classes = 4; }]", 'test close mutation'),
    ("['open count', (v) => { v.counts.open_residual_classes = 37; }]", "['open count', (v) => { v.counts.open_residual_classes = 38; }]", 'test open mutation'),
    ("['open selected order changed', (v) => { v.selected_classes_open.reverse(); }]", "['open selected identity changed', (v) => { v.selected_classes_open[0].class_id = 'RD-03-C04'; }]", 'test open identity mutation'),
    ("['schema receipt denominator', (s) => { s.properties.promoted_class_receipts.maxItems = 5; }]", "['schema receipt denominator', (s) => { s.properties.promoted_class_receipts.maxItems = 4; }]", 'test schema receipt mutation')
]:
    replace_once(test_path, old, new, label)
replace_once(
    test_path,
    "  ['RD-06 merge custody changed', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],",
    "  ['RD-06 merge custody changed', (v) => { v.promoted_class_receipts[3].merge_commit = '0'.repeat(40); }],\n  ['RD-03 state changed', (v) => { v.promoted_class_receipts[4].terminal_state = 'evidence_complete'; }],\n  ['RD-03 merge custody changed', (v) => { v.promoted_class_receipts[4].merge_commit = '0'.repeat(40); }],\n  ['RD-03 manifest custody changed', (v) => { v.promoted_class_receipts[4].manifest_combined_sha256 = '0'.repeat(64); }],\n  ['RD-03 mismatch erased', (v) => { v.promoted_class_receipts[4].labels_exact_match = true; }],\n  ['RD-03 label reconciliation changed', (v) => { v.promoted_class_receipts[4].label_reconciliation = 'none'; }],",
    'test RD03 custody mutations'
)

schema_path = ROOT / 'schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json'
schema = json.loads(schema_path.read_text())
schema['properties']['as_of']['const'] = '2026-08-04'
schema['properties']['authority']['const'] = 'five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority'
receipts = schema['properties']['promoted_class_receipts']
receipts['minItems'] = receipts['maxItems'] = 5
rprops = receipts['items']['properties']
rprops['lane_id']['enum'].append('RD-03')
rprops['class_id']['enum'].append('RD-03-C04')
rprops['issue']['enum'].append(788)
rprops['source_pr']['enum'].append(803)
rprops['closure_reference_path']['pattern'] = '^data/project/ssc-residual-wave02/closures/(RD-04-C01|RD-05-C03|RD-01-C03|RD-06-C01|RD-03-C04)\\.json$'
open_rows = schema['properties']['selected_classes_open']
open_rows['minItems'] = open_rows['maxItems'] = 1
oprops = open_rows['items']['properties']
oprops['lane_id']['enum'] = ['RD-02']
oprops['class_id']['enum'] = ['RD-02-C04']
oprops['issue']['enum'] = [787]
counts = schema['properties']['counts']['properties']
for key, value in {'terminal_class_receipts':5,'classes_closed_this_wave':5,'closed_residual_classes':5,'open_residual_classes':37,'label_reconciliations':2}.items():
    counts[key]['const'] = value
result = schema['properties']['current_result']['properties']
result['terminal_state']['const'] = 'five_of_forty_two_residual_classes_closed_one_selected_attempt_open'
result['classes_closed']['const'] = 5
result['classes_open']['const'] = 37
result['closed_class_ids']['const'] = ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']
result['open_selected_class_ids']['const'] = ['RD-02-C04']
schema_path.write_text(json.dumps(schema, separators=(',', ':')) + '\n')

workflow = '.github/workflows/status-sovereignty-residual-denominator-wave-02-current.yml'
replace_once(workflow, "      - 'data/project/ssc-residual-wave02/closures/RD-01-C03.json'", "      - 'data/project/ssc-residual-wave02/closures/RD-01-C03.json'\n      - 'data/project/ssc-residual-wave02/closures/RD-03-C04.json'", 'workflow PR closure watch')
replace_once(workflow, "      - 'data/project/ssc-residual-wave02/closures/RD-01-C03.json'", "      - 'data/project/ssc-residual-wave02/closures/RD-01-C03.json'\n      - 'data/project/ssc-residual-wave02/closures/RD-03-C04.json'", 'workflow push closure watch')
replace_once(workflow, "      - 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json'", "      - 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json'\n      - 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json'", 'workflow PR receipt watch')
replace_once(workflow, "      - 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json'", "      - 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json'\n      - 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json'", 'workflow push receipt watch')

milestone = ROOT / 'docs/milestones/ssc-residual-denominator-wave-02-current.md'
milestone.write_text('''# SSC residual-denominator Wave 02 — current cumulative ledger

The immutable first-promotion object at `data/research/status-sovereignty-residual-denominator-wave-02-progress.json` remains a historical snapshot. The cumulative current ledger is separately generated at `data/research/status-sovereignty-residual-denominator-wave-02-current.json`.

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

RD-03 is bound to merged PR #803, merge commit `580d9c998f747330d190bed5011c7a1a517a1c0d`, closure reference `data/project/ssc-residual-wave02/closures/RD-03-C04.json`, class receipt `data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json`, and product-manifest SHA-256 `1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e`.

## Label custody

Two exact label reconciliations remain visible. RD-05's receipt omits the constitutional qualifier `complete`. RD-03's seed omits the constitutional qualifiers `complete` and `negotiated`, while its terminal receipt retains the full constitutional label. Neither historical string is silently rewritten.

## RD-03 terminal limit

```text
named instruments:                     5
required terminal fields:             70
observed fields:                        8
conditional-term-only fields:         15
source-unavailable fields:             47
fixed public-record routes:            30
admitted candidate sources:             0
result-spawned requests:                0
```

Source unavailability is not contractual nonexistence. A conditional commitment is not an executed loan; an announced warrant is not proof of issuance; disclosed pricing is not a complete negotiated agreement; cash disbursement is not performance, repayment, or public recovery.

## Promotion-aware custody

The dedicated RD-03 validator accepts exactly two cumulative-ledger states: the four-closure state with RD-03 still open, and this five-closure state where the exact merged RD-03 receipt replaces that row. The cumulative builder and validator bind promotion order, merge ancestry, product manifest, terminal state, label custody, authority zeros, and effect ceilings.

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

Five class closures do not close any broader lane or Wave 02. RD-02-C04 remains the sole selected open class.
''')
PY

node tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs --write
node tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
node test/status-sovereignty-residual-denominator-wave-02-current.test.js
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs

cat > /tmp/ssc-wave02-five-expected-paths.txt <<'PATHS'
.github/workflows/status-sovereignty-residual-denominator-wave-02-current.yml
data/research/status-sovereignty-residual-denominator-wave-02-current.json
docs/milestones/ssc-residual-denominator-wave-02-current.md
schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json
test/status-sovereignty-residual-denominator-wave-02-current.test.js
tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs
tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
PATHS

git diff --name-only | sort > /tmp/ssc-wave02-five-actual-paths.txt
diff -u /tmp/ssc-wave02-five-expected-paths.txt /tmp/ssc-wave02-five-actual-paths.txt
git diff --check

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git checkout -B "$TARGET_BRANCH"
git add --pathspec-from-file=/tmp/ssc-wave02-five-expected-paths.txt
git commit -m 'Promote RD-03 into Wave 02 cumulative closure ledger'
product_sha="$(git rev-parse HEAD)"

npm run release:check
git restore --worktree -- .
git clean -fdx
node tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs --check
node tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
node test/status-sovereignty-residual-denominator-wave-02-current.test.js
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs
git diff --exit-code HEAD
test -z "$(git status --porcelain=v1 --untracked-files=all)"

git fetch --no-tags origin main
test "$(git rev-parse FETCH_HEAD)" = "$EXPECTED_MAIN"
remote_target="$(git ls-remote --heads origin "refs/heads/${TARGET_BRANCH}" | cut -f1)"
if [ -n "$remote_target" ]; then
  echo "target branch already exists at ${remote_target}" >&2
  exit 1
fi
git push origin "HEAD:refs/heads/${TARGET_BRANCH}"
test "$(git ls-remote --heads origin "refs/heads/${TARGET_BRANCH}" | cut -f1)" = "$product_sha"

rm -rf /tmp/ssc-wave02-five-receipt
mkdir -p /tmp/ssc-wave02-five-receipt
cp /tmp/ssc-wave02-five-actual-paths.txt /tmp/ssc-wave02-five-receipt/changed-paths.txt
cp data/research/status-sovereignty-residual-denominator-wave-02-current.json /tmp/ssc-wave02-five-receipt/current.json
cp docs/milestones/ssc-residual-denominator-wave-02-current.md /tmp/ssc-wave02-five-receipt/milestone.md
cat > /tmp/ssc-wave02-five-receipt/materialization.json <<JSON
{
  "schema_version": "ssc-wave02-current-five-closures-materialization@1",
  "base_main": "$EXPECTED_MAIN",
  "product_head": "$product_sha",
  "permanent_changed_paths": 7,
  "transport_paths": 0,
  "canonical_residual_classes": 42,
  "closed_residual_classes": 5,
  "open_residual_classes": 37,
  "promoted_class": "RD-03-C04",
  "promoted_merge_commit": "580d9c998f747330d190bed5011c7a1a517a1c0d",
  "promoted_manifest_sha256": "1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e",
  "selected_classes_open": ["RD-02-C04"],
  "outside_human_dependency": false,
  "external_contacts": 0,
  "external_reviews": 0,
  "publication_effect": "none",
  "adoption_effect": "none",
  "graph_effect": "none"
}
JSON
sha256sum /tmp/ssc-wave02-five-receipt/* > /tmp/ssc-wave02-five-receipt/sha256.txt
