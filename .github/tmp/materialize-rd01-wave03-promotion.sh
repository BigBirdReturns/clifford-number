#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
SPEC_REF='archive/ssc-rd01-wave03-promotion-spec-v1'
SPEC_PATH='reports/transport/ssc-rd01-wave03-promotion-spec-v1/promotion-spec.json'
TARGET_BRANCH='agent/ssc-rd01-wave03-cumulative-promotion-v1'
WORKFLOW_PATH='.github/workflows/status-sovereignty-residual-denominator-wave-03-current.yml'
RECEIPT='/tmp/ssc-rd01-wave03-promotion-materializer-receipt'
FULL='/tmp/ssc-rd01-wave03-promotion-full'
REPLAY='/tmp/ssc-rd01-wave03-promotion-replay'
RUNNER='/tmp/ssc-rd01-wave03-promotion-runner'
PACKAGE='/tmp/ssc-rd01-wave03-promotion-package'
STAGE='init'
mkdir -p "$RECEIPT"

finish() {
  local rc=$?
  {
    echo "status: $([[ $rc -eq 0 ]] && echo complete || echo failed_closed)"
    echo "stage: $STAGE"
    echo "exit_code: $rc"
    echo "time_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$RECEIPT/checkpoint.txt"
  exit "$rc"
}
trap finish EXIT

run_focused() {
  node tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs --check
  node tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs
  node test/status-sovereignty-residual-denominator-wave-03-current.test.js
  node tools/validate-no-magic-human-gate.mjs
  node test/no-magic-human-gate.test.js
}

STAGE='verify-canonical-preconditions'
PR=$(gh api "repos/$REPO/pulls/1022")
test "$(jq -r .merged <<<"$PR")" = 'true'
RD01_MERGE=$(jq -r .merge_commit_sha <<<"$PR")
POSTMERGE_TAG=$(gh api "repos/$REPO/git/ref/tags/ssc-rd01-wave03-postmerge-proved" --jq .object.sha)
test "$POSTMERGE_TAG" = "$RD01_MERGE"
MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
git fetch --no-tags origin "$MAIN_START" "$RD01_MERGE" "$SPEC_REF"
git merge-base --is-ancestor "$RD01_MERGE" "$MAIN_START"
printf 'main_start=%s\nrd01_merge=%s\n' "$MAIN_START" "$RD01_MERGE" > "$RECEIPT/lineage.txt"

STAGE='load-and-validate-promotion-spec'
git show "origin/$SPEC_REF:$SPEC_PATH" > "$RECEIPT/promotion-spec.json"
test "$(jq -r .schema_version "$RECEIPT/promotion-spec.json")" = 'ssc-rd-wave03-rd01-promotion-spec@1'
test "$(jq -r .lineage.rd01_merge_sha "$RECEIPT/promotion-spec.json")" = "$RD01_MERGE"
test "$(jq -r .counts.current_closed "$RECEIPT/promotion-spec.json")" -eq 7
test "$(jq -r .counts.current_open "$RECEIPT/promotion-spec.json")" -eq 35
test "$(jq -r '.wave03_terminal_class_ids | join(",")' "$RECEIPT/promotion-spec.json")" = 'RD-01-C06'

STAGE='generate-nine-path-package'
rm -rf "$PACKAGE"
mkdir -p "$PACKAGE"
python3 .github/tmp/build-rd01-wave03-promotion-package.py "$RECEIPT/promotion-spec.json" "$PACKAGE" > "$RECEIPT/package-shape.json"
find "$PACKAGE" -type f -printf '%P\n' | sort > "$RECEIPT/package-paths.txt"
test "$(wc -l < "$RECEIPT/package-paths.txt" | tr -d ' ')" -eq 7
# The deterministic builder creates the ledger and release manifest, bringing the final package to nine paths.

STAGE='construct-full-qualified-candidate'
rm -rf "$FULL"
git worktree add --detach "$FULL" "$MAIN_START"
while IFS= read -r path; do
  mkdir -p "$FULL/$(dirname "$path")"
  cp "$PACKAGE/$path" "$FULL/$path"
done < "$RECEIPT/package-paths.txt"
cd "$FULL"
node tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs --write
find data/research data/project schemas tools test docs .github/workflows -type f \( -path '*status-sovereignty-residual-denominator-wave-03-current*' -o -path '*ssc-residual-wave03/current-release-manifest.json' \) -printf '%P\n' | sort > "$RECEIPT/final-package-paths.txt"
# find -printf above strips its first search root; use the explicit approved list instead.
cat > "$RECEIPT/approved-paths.txt" <<'PATHS'
.github/workflows/status-sovereignty-residual-denominator-wave-03-current.yml
data/project/ssc-residual-wave03/current-release-manifest.json
data/research/status-sovereignty-residual-denominator-wave-03-current-source.json
data/research/status-sovereignty-residual-denominator-wave-03-current.json
docs/milestones/ssc-residual-denominator-wave-03-current.md
schemas/status-sovereignty-residual-denominator-wave-03-current.schema.json
test/status-sovereignty-residual-denominator-wave-03-current.test.js
tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs
tools/validate-status-sovereignty-residual-denominator-wave-03-current.mjs
PATHS
sort -o "$RECEIPT/approved-paths.txt" "$RECEIPT/approved-paths.txt"
for path in $(cat "$RECEIPT/approved-paths.txt"); do test -f "$path"; done
git add --pathspec-from-file="$RECEIPT/approved-paths.txt"
git diff --cached --name-only | sort > "$RECEIPT/full-staged-paths.txt"
cmp "$RECEIPT/approved-paths.txt" "$RECEIPT/full-staged-paths.txt"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'Promote RD-01-C06 into the Wave-03 cumulative ledger'
FULL_COMMIT=$(git rev-parse HEAD)
FULL_TREE=$(git rev-parse HEAD^{tree})
printf 'full_commit=%s\nfull_tree=%s\n' "$FULL_COMMIT" "$FULL_TREE" >> "$RECEIPT/lineage.txt"
run_focused
npm run release:check
git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

STAGE='prove-deterministic-replay'
rm -rf "$REPLAY"
git worktree add --detach "$REPLAY" "$MAIN_START"
while IFS= read -r path; do
  mkdir -p "$REPLAY/$(dirname "$path")"
  cp "$PACKAGE/$path" "$REPLAY/$path"
done < "$RECEIPT/package-paths.txt"
cd "$REPLAY"
node tools/build-status-sovereignty-residual-denominator-wave-03-current.mjs --write
git add --pathspec-from-file="$RECEIPT/approved-paths.txt"
REPLAY_TREE=$(git write-tree)
test "$REPLAY_TREE" = "$FULL_TREE"
printf 'replay_tree=%s\n' "$REPLAY_TREE" >> "$RECEIPT/lineage.txt"

STAGE='construct-eight-path-runner-commit'
rm -rf "$RUNNER"
git worktree add --detach "$RUNNER" "$MAIN_START"
grep -Fvx "$WORKFLOW_PATH" "$RECEIPT/approved-paths.txt" > "$RECEIPT/nonworkflow-paths.txt"
test "$(wc -l < "$RECEIPT/nonworkflow-paths.txt" | tr -d ' ')" -eq 8
while IFS= read -r path; do
  mkdir -p "$RUNNER/$(dirname "$path")"
  cp "$FULL/$path" "$RUNNER/$path"
done < "$RECEIPT/nonworkflow-paths.txt"
cd "$RUNNER"
git add --pathspec-from-file="$RECEIPT/nonworkflow-paths.txt"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'Materialize RD-01 Wave-03 cumulative promotion without workflow transport'
RUNNER_COMMIT=$(git rev-parse HEAD)
RUNNER_TREE=$(git rev-parse HEAD^{tree})
printf 'runner_commit=%s\nrunner_tree=%s\n' "$RUNNER_COMMIT" "$RUNNER_TREE" >> "$RECEIPT/lineage.txt"

STAGE='publish-eight-path-runner'
if git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null 2>&1; then
  echo 'promotion target already exists' >&2
  exit 1
fi
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" = "$MAIN_START"
git push origin "$RUNNER_COMMIT:refs/heads/$TARGET_BRANCH"

STAGE='compose-standing-workflow-object'
WORKFLOW_B64=$(base64 -w0 "$FULL/$WORKFLOW_PATH")
WORKFLOW_BLOB=$(gh api --method POST "repos/$REPO/git/blobs" -f content="$WORKFLOW_B64" -f encoding='base64' --jq .sha)
jq -n --arg base_tree "$RUNNER_TREE" --arg path "$WORKFLOW_PATH" --arg sha "$WORKFLOW_BLOB" '{base_tree:$base_tree,tree:[{path:$path,mode:"100644",type:"blob",sha:$sha}]}' > /tmp/rd01-promotion-tree.json
COMPOSED_TREE=$(gh api --method POST "repos/$REPO/git/trees" --input /tmp/rd01-promotion-tree.json --jq .sha)
test "$COMPOSED_TREE" = "$FULL_TREE"
jq -n --arg message 'Compose standing Wave-03 cumulative ledger workflow' --arg tree "$COMPOSED_TREE" --arg parent "$RUNNER_COMMIT" '{message:$message,tree:$tree,parents:[$parent]}' > /tmp/rd01-promotion-commit.json
COMPOSED_COMMIT=$(gh api --method POST "repos/$REPO/git/commits" --input /tmp/rd01-promotion-commit.json --jq .sha)
printf 'workflow_blob=%s\ncomposed_tree=%s\ncomposed_commit=%s\n' "$WORKFLOW_BLOB" "$COMPOSED_TREE" "$COMPOSED_COMMIT" >> "$RECEIPT/lineage.txt"

STAGE='advance-promotion-target-to-composed-commit'
UPDATED=false
if gh api --method PATCH "repos/$REPO/git/refs/heads/$TARGET_BRANCH" -f sha="$COMPOSED_COMMIT" -F force=false > "$RECEIPT/ref-update.json" 2> "$RECEIPT/ref-update.stderr"; then
  UPDATED=true
else
  TAG='ssc-rd01-wave03-promotion-composed-ready-v1'
  EXISTING=$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq .object.sha 2>/dev/null || true)
  if [[ -z "$EXISTING" ]]; then
    gh api --method POST "repos/$REPO/git/refs" -f ref="refs/tags/$TAG" -f sha="$COMPOSED_COMMIT" > "$RECEIPT/tag-create.json"
  elif [[ "$EXISTING" != "$COMPOSED_COMMIT" ]]; then
    gh api --method PATCH "repos/$REPO/git/refs/tags/$TAG" -f sha="$COMPOSED_COMMIT" -F force=true > "$RECEIPT/tag-update.json"
  fi
  echo "connector_handoff_sha=$COMPOSED_COMMIT" > "$RECEIPT/connector-handoff.txt"
fi

if [[ "$UPDATED" = true ]]; then
  STAGE='open-permanent-promotion-pr'
  PR_NUMBER=$(gh pr list --repo "$REPO" --state open --head "$TARGET_BRANCH" --json number --jq '.[0].number // empty')
  if [[ -z "$PR_NUMBER" ]]; then
    BODY=$(cat <<'EOF'
Promotes the canonically merged `RD-01-C06` terminal receipt into a new Wave-03 cumulative successor ledger without rewriting the historical six-closure Wave-02 object.

```text
canonical residual classes: 42
closed before / after:       6 / 7
open before / after:        36 / 35
Wave-03 selected attempts:    6
Wave-03 terminal receipts:    1
Wave-03 selected still open:  5
residual denominator complete:false
terminal state promoted:      bounded_source_unavailable
outside-human dependency:     false
external contacts/reviews:     0 / 0
publication/adoption/graph:    none / none / none
```

The permanent product is exactly nine addition-only paths: one source manifest, deterministic ledger, release manifest, closed schema, builder, validator, adversarial suite, milestone, and read-only workflow. Merge only after exact-head hosted qualification. The five other Wave-03 selected classes remain open.
EOF
)
    PR_URL=$(gh pr create --repo "$REPO" --base main --head "$TARGET_BRANCH" --title 'Promote RD-01 into the Wave-03 cumulative closure ledger' --body "$BODY" --draft)
    PR_NUMBER=${PR_URL##*/}
  fi
  printf 'permanent_pr=%s\n' "$PR_NUMBER" > "$RECEIPT/permanent-pr.txt"
fi

STAGE='complete'
