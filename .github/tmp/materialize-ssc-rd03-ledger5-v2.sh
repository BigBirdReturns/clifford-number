#!/usr/bin/env bash
set -Eeuo pipefail

BASE_RD03_MERGE="580d9c998f747330d190bed5011c7a1a517a1c0d"
CONTROLLER_BRANCH="agent/ssc-rd03-ledger5-materializer-base-v1"
TARGET_BRANCH="agent/ssc-wave02-current-ledger-five-closures"
OUT="$RUNNER_TEMP/ssc-rd03-ledger5-v2-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
mkdir -p "$OUT"
echo "RECEIPT_DIR=$OUT" >> "$GITHUB_ENV"
exec > >(tee "$OUT/trace.log") 2>&1
step="initialize"
MAIN_HEAD=""
PRODUCT_COMMIT=""
PRODUCT_TREE=""

finish() {
  rc=$?
  set +e
  trap - EXIT
  printf '%s\n' "$rc" > "$OUT/exit-code.txt"
  printf '%s\n' "$step" > "$OUT/final-step.txt"
  printf '%s\n' "$MAIN_HEAD" > "$OUT/main-head.txt"
  printf '%s\n' "$PRODUCT_COMMIT" > "$OUT/product-commit.txt"
  printf '%s\n' "$PRODUCT_TREE" > "$OUT/product-tree.txt"
  git rev-parse HEAD > "$OUT/head.txt" 2>&1 || true
  git rev-parse 'HEAD^{tree}' > "$OUT/tree.txt" 2>&1 || true
  git status --porcelain=v1 --untracked-files=all > "$OUT/status.txt" 2>&1 || true
  if test -n "$MAIN_HEAD"; then
    git diff --name-status "$MAIN_HEAD" HEAD > "$OUT/name-status.txt" 2>&1 || true
    git diff --name-only "$MAIN_HEAD" HEAD | sort > "$OUT/paths.txt" 2>&1 || true
  fi
  git ls-remote --heads origin refs/heads/main > "$OUT/remote-main.txt" 2>&1 || true
  git ls-remote --heads origin "refs/heads/$TARGET_BRANCH" > "$OUT/remote-target.txt" 2>&1 || true
  OUT="$OUT" RC="$rc" STEP="$step" MAIN_HEAD="$MAIN_HEAD" PRODUCT_COMMIT="$PRODUCT_COMMIT" PRODUCT_TREE="$PRODUCT_TREE" python - <<'PY'
import hashlib, json, os
from pathlib import Path
out=Path(os.environ['OUT'])
receipt={
  'schema_version':'ssc-rd03-wave02-ledger5-materialization@2',
  'run':int(os.environ['GITHUB_RUN_ID']),
  'exit_code':int(os.environ['RC']),
  'final_step':os.environ['STEP'],
  'main_parent':os.environ['MAIN_HEAD'],
  'rd03_merge':'580d9c998f747330d190bed5011c7a1a517a1c0d',
  'target_branch':'agent/ssc-wave02-current-ledger-five-closures',
  'product_commit':os.environ['PRODUCT_COMMIT'],
  'product_tree':os.environ['PRODUCT_TREE'],
  'permanent_paths':8,
  'closed_residual_classes':5,
  'open_residual_classes':37,
  'open_selected_class_ids':['RD-02-C04'],
  'rd03_manifest':'1323477ae4b4bda480eb9bf1484cde7db9783920c834a69996ca0428c57fb16e',
  'current_ledger_mutations':42,
  'rd03_terminal_mutations':94,
  'outside_human_dependency':False,
  'external_contacts':0,
  'external_reviews':0,
  'publication_effect':'none',
  'adoption_effect':'none',
  'graph_effect':'none',
}
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
for path in sorted(out.iterdir()):
  if path.is_file() and not path.name.endswith('.sha256'):
    (out/(path.name+'.sha256')).write_text(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name+'\n')
PY
  exit "$rc"
}
trap finish EXIT

cat > "$OUT/expected-paths.txt" <<'PATHS'
.github/workflows/status-sovereignty-residual-denominator-wave-02-current.yml
data/research/status-sovereignty-residual-denominator-wave-02-current.json
docs/milestones/ssc-residual-denominator-wave-02-current.md
schemas/status-sovereignty-residual-denominator-wave-02-current.schema.json
test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
test/status-sovereignty-residual-denominator-wave-02-current.test.js
tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs
tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
PATHS
sort -o "$OUT/expected-paths.txt" "$OUT/expected-paths.txt"

step="freeze-descendant-main-and-overlap-boundary"
MAIN_HEAD="$(git rev-parse HEAD)"
test "$(git ls-remote --heads origin refs/heads/main | cut -f1)" = "$MAIN_HEAD"
git merge-base --is-ancestor "$BASE_RD03_MERGE" "$MAIN_HEAD"
git diff --name-only "$BASE_RD03_MERGE" "$MAIN_HEAD" | sort > "$OUT/main-advance-paths.txt"
comm -12 "$OUT/expected-paths.txt" "$OUT/main-advance-paths.txt" > "$OUT/main-overlap.txt"
test ! -s "$OUT/main-overlap.txt"
test -z "$(git ls-remote --heads origin "refs/heads/$TARGET_BRANCH")"
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs

step="load-and-rebind-existing-controller"
git fetch --no-tags origin "refs/heads/$CONTROLLER_BRANCH:refs/remotes/origin/$CONTROLLER_BRANCH"
git show "refs/remotes/origin/$CONTROLLER_BRANCH:.github/tmp/materialize-ssc-rd03-ledger5.py" > /tmp/materialize-ledger5.py
python - <<'PY'
from pathlib import Path
path=Path('/tmp/materialize-ledger5.py')
value=path.read_text()
replacements=[
  (
    '''    ("['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']", "['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04']", "promoted order"),''',
    '''    ("  same(current.promoted_class_receipts.map((row) => row.class_id), ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01'], 'promoted class order changed');", "  same(current.promoted_class_receipts.map((row) => row.class_id), ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01','RD-03-C04'], 'promoted class order changed');", "promoted order"),''',
    'promoted-order statement binding',
  ),
  (
    '''    ("['RD-02-C04','RD-03-C04']", "['RD-02-C04']", "open order"),''',
    '''    ("  same(current.selected_classes_open.map((row) => row.class_id), ['RD-02-C04','RD-03-C04'], 'open selected class order changed');", "  same(current.selected_classes_open.map((row) => row.class_id), ['RD-02-C04'], 'open selected class order changed');", "open order"),''',
    'open-order statement binding',
  ),
]
for old,new,label in replacements:
  count=value.count(old)
  if count != 1:
    raise RuntimeError(f'{label}: expected one materializer-source match, found {count}')
  value=value.replace(old,new,1)
path.write_text(value)
PY
python /tmp/materialize-ledger5.py

step="carry-rd03-standing-test-across-promotion"
python - <<'PY'
from pathlib import Path
path=Path('test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js')
value=path.read_text()
old="""assert.equal(validateCurrentAtlasCustody(bundle.current,bundle.manifest.combined_sha256),'pre_promotion');
const post=clone(bundle.current);
post.authority='five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';
post.promoted_class_receipts.push({lane_id:'RD-03',class_id:'RD-03-C04',issue:788,source_pr:803,merge_commit:'1'.repeat(40),constitutional_exact_label:CLASS_LABEL,receipt_class_label:CLASS_LABEL,labels_exact_match:false,label_reconciliation:LABEL_RECONCILIATION,terminal_state:TERMINAL_STATE,closure_reference_path:CLOSURE_REFERENCE_PATH,class_receipt_path:`${PRODUCT_ROOT}/class-receipt.json`,manifest_combined_sha256:bundle.manifest.combined_sha256,class_closed:true});
post.selected_classes_open=post.selected_classes_open.filter((row)=>row.class_id!=='RD-03-C04');
post.counts.terminal_class_receipts=5;post.counts.classes_closed_this_wave=5;post.counts.closed_residual_classes=5;post.counts.open_residual_classes=37;
post.current_result.terminal_state='five_of_forty_two_residual_classes_closed_one_selected_attempt_open';post.current_result.classes_closed=5;post.current_result.classes_open=37;post.current_result.closed_class_ids=[...post.current_result.closed_class_ids,'RD-03-C04'];post.current_result.open_selected_class_ids=['RD-02-C04'];
assert.equal(validateCurrentAtlasCustody(post,bundle.manifest.combined_sha256),'post_promotion');"""
new="""assert.equal(validateCurrentAtlasCustody(bundle.current,bundle.manifest.combined_sha256),'post_promotion');
const post=clone(bundle.current);
const pre=clone(bundle.current);
pre.authority='four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';
pre.promoted_class_receipts=pre.promoted_class_receipts.filter((row)=>row.class_id!=='RD-03-C04');
pre.selected_classes_open.push({lane_id:'RD-03',class_id:'RD-03-C04',issue:788,constitutional_exact_label:CLASS_LABEL,state:'open',class_closed:false});
pre.counts.terminal_class_receipts=4;pre.counts.classes_closed_this_wave=4;pre.counts.closed_residual_classes=4;pre.counts.open_residual_classes=38;pre.counts.label_reconciliations=1;
pre.current_result.terminal_state='four_of_forty_two_residual_classes_closed_two_selected_attempts_open';pre.current_result.classes_closed=4;pre.current_result.classes_open=38;pre.current_result.closed_class_ids=pre.current_result.closed_class_ids.filter((id)=>id!=='RD-03-C04');pre.current_result.open_selected_class_ids=['RD-02-C04','RD-03-C04'];
assert.equal(validateCurrentAtlasCustody(pre,bundle.manifest.combined_sha256),'pre_promotion');"""
count=value.count(old)
if count != 1:
  raise RuntimeError(f'RD-03 pre/post fixture: expected one block, found {count}')
value=value.replace(old,new,1)
old_line="const candidate=clone(name.startsWith('post')?post:bundle.current);"
new_line="const candidate=clone(name.startsWith('post')?post:pre);"
count=value.count(old_line)
if count != 1:
  raise RuntimeError(f'RD-03 custody mutation source: expected one line, found {count}')
path.write_text(value.replace(old_line,new_line,1))
PY
node tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs --write

step="focused-five-closure-qualification"
node --check tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs
node --check tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
node --check test/status-sovereignty-residual-denominator-wave-02-current.test.js
node --check test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs --check
node tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
node test/status-sovereignty-residual-denominator-wave-02-current.test.js
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs

step="commit-exact-eight-path-product"
git diff --name-only | sort > "$OUT/worktree-paths.txt"
cmp "$OUT/expected-paths.txt" "$OUT/worktree-paths.txt"
test -z "$(git diff --name-status | awk '$1 != "M" {print}')"
git diff --check
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git checkout -b "$TARGET_BRANCH"
git add -- $(cat "$OUT/expected-paths.txt")
git commit -m 'Promote RD-03 into Wave-02 cumulative closure ledger'
PRODUCT_COMMIT="$(git rev-parse HEAD)"
PRODUCT_TREE="$(git rev-parse 'HEAD^{tree}')"

step="complete-repository-release-gate"
npm run release:check

step="deterministic-clean-replay"
git reset --hard HEAD
git clean -fdx
node tools/build-status-sovereignty-residual-denominator-wave-02-current.mjs --check
node tools/validate-status-sovereignty-residual-denominator-wave-02-current.mjs
node test/status-sovereignty-residual-denominator-wave-02-current.test.js
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs
git diff --exit-code
test -z "$(git status --porcelain=v1 --untracked-files=all)"

step="final-main-and-target-lease"
test "$(git ls-remote --heads origin refs/heads/main | cut -f1)" = "$MAIN_HEAD"
test -z "$(git ls-remote --heads origin "refs/heads/$TARGET_BRANCH")"

step="publish-permanent-product"
git push origin "HEAD:refs/heads/$TARGET_BRANCH"
test "$(git ls-remote --heads origin "refs/heads/$TARGET_BRANCH" | cut -f1)" = "$PRODUCT_COMMIT"

step="materialization-complete"
finish
