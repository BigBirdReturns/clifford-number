#!/usr/bin/env bash
set -Eeuo pipefail

export RESEARCH_HEAD="$(git rev-parse HEAD)"
observed="$(git ls-remote --heads origin refs/heads/agent/ssc-rd-wave02-rd06-offeror-universe | cut -f1)"
test "$observed" = "$RESEARCH_HEAD"
git fetch origin main
export MAIN_HEAD="$(git rev-parse origin/main)"

for path in \
  data/research/status-sovereignty-residual-denominator-wave-02-current.json \
  data/project/ssc-residual-wave02/closures/RD-01-C03.json \
  data/project/ssc-residual-wave02/closures/RD-04-C01.json \
  data/project/ssc-residual-wave02/closures/RD-05-C03.json; do
  test "$(git rev-parse HEAD:"$path")" = "$(git rev-parse origin/main:"$path")"
done

jq -e '
  .counts.canonical_residual_classes == 42 and
  .counts.closed_residual_classes == 3 and
  .counts.open_residual_classes == 39 and
  .current_result.closed_class_ids == ["RD-04-C01","RD-05-C03","RD-01-C03"] and
  (.current_result.open_selected_class_ids | index("RD-06-C01")) != null
' data/research/status-sovereignty-residual-denominator-wave-02-current.json >/dev/null

python - <<'PY'
from pathlib import Path

builder_path = Path('tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs')
validator_path = Path('tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs')
test_path = Path('test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js')
milestone_path = Path('docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md')

old_key = 'residual_atlas_effect_if_promoted_after_rd04_and_rd05'
new_key = 'residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01'

builder = builder_path.read_text()
assert builder.count(old_key) == 3, builder.count(old_key)
builder = builder.replace(old_key, new_key)
old_block = '''      canonical_classes: 42,
      open_before: 40,
      closed_before: 2,
      open_after: 39,
      closed_after: 3'''
new_block = '''      canonical_classes: 42,
      open_before: 39,
      closed_before: 3,
      open_after: 38,
      closed_after: 4'''
assert builder.count(old_block) == 1, builder.count(old_block)
builder_path.write_text(builder.replace(old_block, new_block))

validator = validator_path.read_text()
assert validator.count(old_key) == 3, validator.count(old_key)
validator = validator.replace(old_key, new_key)
old_effect = '{ canonical_classes: 42, open_before: 40, closed_before: 2, open_after: 39, closed_after: 3 }'
new_effect = '{ canonical_classes: 42, open_before: 39, closed_before: 3, open_after: 38, closed_after: 4 }'
assert validator.count(old_effect) == 1, validator.count(old_effect)
validator = validator.replace(old_effect, new_effect)
old_counts = "current?.counts?.closed_residual_classes === 2 && current?.counts?.open_residual_classes === 40"
new_counts = "current?.counts?.closed_residual_classes === 3 && current?.counts?.open_residual_classes === 39"
assert validator.count(old_counts) == 1, validator.count(old_counts)
validator = validator.replace(old_counts, new_counts)
old_ids = "['RD-04-C01','RD-05-C03']"
new_ids = "['RD-04-C01','RD-05-C03','RD-01-C03']"
assert validator.count(old_ids) == 1, validator.count(old_ids)
validator_path.write_text(validator.replace(old_ids, new_ids))

test_source = test_path.read_text()
assert test_source.count(old_key) == 1, test_source.count(old_key)
test_path.write_text(test_source.replace(old_key, new_key))

milestone = milestone_path.read_text()
old_milestone = '''atlas before promotion:
40 open / 2 closed

atlas after promotion:
39 open / 3 closed'''
new_milestone = '''atlas before promotion:
39 open / 3 closed

atlas after promotion:
38 open / 4 closed'''
assert milestone.count(old_milestone) == 1, milestone.count(old_milestone)
milestone_path.write_text(milestone.replace(old_milestone, new_milestone))
PY

node tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs --write
node tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs
node test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js
node tools/validate-no-magic-human-gate.mjs

git add \
  tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs \
  tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs \
  test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js \
  docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md \
  data/project/ssc-residual-wave02/closures/RD-06-C01.json \
  data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json \
  data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/manifest.json \
  data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/summary.json \
  data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/terminal-field-matrix.json

git diff --cached --name-only | sort > /tmp/rd06-fourth-observed.txt
cat > /tmp/rd06-fourth-expected.txt <<'EOF'
data/project/ssc-residual-wave02/closures/RD-06-C01.json
data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/class-receipt.json
data/research/status-sovereignty-rd-wave02-rd06-offeror-universe/manifest.json
docs/milestones/ssc-rd-wave02-rd06-offeror-universe.md
test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js
tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs
tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs
EOF
sort -o /tmp/rd06-fourth-expected.txt /tmp/rd06-fourth-expected.txt
diff -u /tmp/rd06-fourth-expected.txt /tmp/rd06-fourth-observed.txt
git diff --cached --check

npm run release:check
git restore --worktree -- .
git clean -fdx
git diff --exit-code
node tools/build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs --check
node tools/validate-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs
node test/status-sovereignty-rd-wave02-rd06-offeror-universe.test.js
node tools/validate-no-magic-human-gate.mjs
git diff --exit-code

observed="$(git ls-remote --heads origin refs/heads/agent/ssc-rd-wave02-rd06-offeror-universe | cut -f1)"
test "$observed" = "$RESEARCH_HEAD"
test "$(git rev-parse origin/main)" = "$MAIN_HEAD"

rm -rf /tmp/rd06-fourth-closure-export
mkdir -p /tmp/rd06-fourth-closure-export
while IFS= read -r path; do
  install -D -m 0644 "$path" "/tmp/rd06-fourth-closure-export/$path"
done < /tmp/rd06-fourth-observed.txt

python - <<'PY'
import hashlib
import json
import os
from pathlib import Path

root = Path('/tmp/rd06-fourth-closure-export')
entries = []
for path in sorted(p for p in root.rglob('*') if p.is_file()):
    rel = path.relative_to(root).as_posix()
    data = path.read_bytes()
    entries.append({'path': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
assert len(entries) == 7
combined = hashlib.sha256('\n'.join(f"{row['sha256']}  {row['path']}" for row in entries).encode()).hexdigest()
manifest = {
    'schema_version': 'ssc-rd06-wave02-fourth-closure-export@1',
    'research_head': os.environ['RESEARCH_HEAD'],
    'main_head': os.environ['MAIN_HEAD'],
    'entry_count': len(entries),
    'combined_sha256': combined,
    'entries': entries,
}
(root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f"RD-06 fourth-closure export: {len(entries)} files; {combined}; research {os.environ['RESEARCH_HEAD']}; main {os.environ['MAIN_HEAD']}")
PY
