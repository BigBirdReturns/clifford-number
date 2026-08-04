#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
TARGET_BRANCH='agent/ssc-rd01-wave03-cumulative-promotion-v1'
MATERIALIZER_REF='archive/ssc-rd01-wave03-promotion-materializer-receipt'
MATERIALIZER_PATH='reports/transport/ssc-rd01-wave03-promotion-materializer-latest'
RECEIPT='/tmp/ssc-rd01-wave03-promotion-finalizer-receipt'
WORK='/tmp/ssc-rd01-wave03-promotion-finalizer-worktree'
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

close_temp_lanes() {
  local merge_sha=$1
  gh pr list --repo "$REPO" --state open --limit 100 --json number,headRefName --jq '.[] | select((.headRefName|startswith("agent/ssc-rd01-wave03-promotion-materializer-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-promotion-handoff-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-promotion-source-export-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-promotion-spec-trigger"))) | [.number,.headRefName] | @tsv' |
  while IFS=$'\t' read -r number head; do
    [[ -z "$number" ]] && continue
    [[ "$number" = "${FINALIZER_PR:-}" ]] && continue
    gh pr close "$number" --repo "$REPO" --comment "Retired unmerged after canonical Wave-03 cumulative promotion at $merge_sha." || true
  done
}

cat > "$RECEIPT/expected-paths.txt" <<'PATHS'
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
sort -o "$RECEIPT/expected-paths.txt" "$RECEIPT/expected-paths.txt"

STAGE='load-qualified-materializer-receipt'
for _ in $(seq 1 120); do
  git fetch --no-tags origin "$MATERIALIZER_REF" >/dev/null 2>&1 || true
  if git cat-file -e "origin/$MATERIALIZER_REF:$MATERIALIZER_PATH/checkpoint.txt" 2>/dev/null; then break; fi
  sleep 10
done
git show "origin/$MATERIALIZER_REF:$MATERIALIZER_PATH/checkpoint.txt" > "$RECEIPT/materializer-checkpoint.txt"
test "$(awk -F': ' '$1=="status" {print $2}' "$RECEIPT/materializer-checkpoint.txt")" = 'complete'
git show "origin/$MATERIALIZER_REF:$MATERIALIZER_PATH/lineage.txt" > "$RECEIPT/materializer-lineage.txt"
FULL_TREE=$(awk -F= '$1=="full_tree" {print $2}' "$RECEIPT/materializer-lineage.txt" | tail -1)
COMPOSED_COMMIT=$(awk -F= '$1=="composed_commit" {print $2}' "$RECEIPT/materializer-lineage.txt" | tail -1)
test "${#FULL_TREE}" -eq 40
test "${#COMPOSED_COMMIT}" -eq 40

STAGE='resolve-permanent-pr'
for _ in $(seq 1 120); do
  PERMANENT_PR=$(gh pr list --repo "$REPO" --state all --head "$TARGET_BRANCH" --json number,state,mergedAt --jq 'sort_by(.number) | last | .number // empty')
  [[ -n "$PERMANENT_PR" ]] && break
  sleep 10
done
test -n "$PERMANENT_PR"
PR=$(gh api "repos/$REPO/pulls/$PERMANENT_PR")
printf '%s\n' "$PR" > "$RECEIPT/pr.json"
if [[ "$(jq -r .merged <<<"$PR")" = 'true' ]]; then
  MERGE_SHA=$(jq -r .merge_commit_sha <<<"$PR")
  MAIN_SHA=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
  git fetch --no-tags origin "$MERGE_SHA" "$MAIN_SHA"
  git merge-base --is-ancestor "$MERGE_SHA" "$MAIN_SHA"
  close_temp_lanes "$MERGE_SHA"
  printf 'permanent_pr=%s\nmerge_sha=%s\nmain_sha=%s\n' "$PERMANENT_PR" "$MERGE_SHA" "$MAIN_SHA" > "$RECEIPT/final.txt"
  STAGE='complete-already-merged'
  exit 0
fi

test "$(jq -r .state <<<"$PR")" = 'open'
test "$(jq -r .head.ref <<<"$PR")" = "$TARGET_BRANCH"
if [[ "$(jq -r .draft <<<"$PR")" = 'true' ]]; then gh pr ready "$PERMANENT_PR" --repo "$REPO"; fi
MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
HEAD_START=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
printf 'permanent_pr=%s\nmain_start=%s\nhead_start=%s\nfull_tree=%s\ncomposed_commit=%s\n' "$PERMANENT_PR" "$MAIN_START" "$HEAD_START" "$FULL_TREE" "$COMPOSED_COMMIT" > "$RECEIPT/leases.txt"
git fetch --no-tags origin "$MAIN_START" "$HEAD_START" "$COMPOSED_COMMIT"
test "$(git rev-parse "$HEAD_START^{tree}")" = "$FULL_TREE"
test "$(git rev-parse "$COMPOSED_COMMIT^{tree}")" = "$FULL_TREE"

STAGE='verify-exact-nine-path-surface'
git diff --name-status "$MAIN_START...$HEAD_START" > "$RECEIPT/pr-name-status.txt"
test "$(wc -l < "$RECEIPT/pr-name-status.txt" | tr -d ' ')" -eq 9
test "$(awk '$1 != "A" {n++} END {print n+0}' "$RECEIPT/pr-name-status.txt")" -eq 0
cut -f2- "$RECEIPT/pr-name-status.txt" | sort > "$RECEIPT/actual-paths.txt"
cmp "$RECEIPT/expected-paths.txt" "$RECEIPT/actual-paths.txt"
if grep -E '(^|/)(transport|tmp)(/|$)|(^|/)\.ssc-|temp-|materializer|trigger' "$RECEIPT/actual-paths.txt"; then exit 1; fi

STAGE='construct-live-synthetic-merge'
rm -rf "$WORK"
git worktree add --detach "$WORK" "$MAIN_START"
cd "$WORK"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git merge --no-ff --no-commit "$HEAD_START"
git commit -m 'Synthetic qualification merge for RD-01 Wave-03 cumulative promotion'
SYNTHETIC=$(git rev-parse HEAD)
printf 'synthetic=%s\n' "$SYNTHETIC" >> "$RECEIPT/leases.txt"

STAGE='qualify-live-synthetic-merge'
run_focused
npm run release:check
git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

STAGE='wait-hosted-pr-matrix'
for _ in $(seq 1 120); do
  gh pr checks "$PERMANENT_PR" --repo "$REPO" --json name,bucket,state > "$RECEIPT/hosted-checks.json" 2>/dev/null || true
  COUNT=$(jq 'length' "$RECEIPT/hosted-checks.json" 2>/dev/null || echo 0)
  FAIL=$(jq '[.[] | select(.bucket=="fail" or .bucket=="cancel")] | length' "$RECEIPT/hosted-checks.json" 2>/dev/null || echo 0)
  PENDING=$(jq '[.[] | select(.bucket=="pending")] | length' "$RECEIPT/hosted-checks.json" 2>/dev/null || echo 0)
  test "$FAIL" -eq 0
  if [[ "$COUNT" -ge 5 && "$PENDING" -eq 0 ]]; then break; fi
  sleep 15
done
test "$(jq 'length' "$RECEIPT/hosted-checks.json")" -ge 5
test "$(jq '[.[] | select(.bucket=="pending" or .bucket=="fail" or .bucket=="cancel")] | length' "$RECEIPT/hosted-checks.json")" -eq 0

STAGE='recheck-leases-before-merge'
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" = "$MAIN_START"
test "$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)" = "$HEAD_START"

STAGE='merge-permanent-promotion-pr'
MERGE_JSON=$(gh api --method PUT "repos/$REPO/pulls/$PERMANENT_PR/merge" -f merge_method='merge' -f sha="$HEAD_START")
printf '%s\n' "$MERGE_JSON" > "$RECEIPT/merge.json"
test "$(jq -r .merged <<<"$MERGE_JSON")" = 'true'
MERGE_SHA=$(jq -r .sha <<<"$MERGE_JSON")
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" = "$MERGE_SHA"
printf 'merge_sha=%s\n' "$MERGE_SHA" >> "$RECEIPT/leases.txt"

STAGE='canonical-postmerge-proof'
git fetch --no-tags origin "$MERGE_SHA"
git checkout --detach "$MERGE_SHA"
run_focused
npm run release:check
git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

STAGE='publish-seven-thirty-five-marker'
TAG='ssc-rd01-wave03-promotion-proved'
EXISTING=$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq .object.sha 2>/dev/null || true)
if [[ -z "$EXISTING" ]]; then
  gh api --method POST "repos/$REPO/git/refs" -f ref="refs/tags/$TAG" -f sha="$MERGE_SHA" >/dev/null
elif [[ "$EXISTING" != "$MERGE_SHA" ]]; then
  gh api --method PATCH "repos/$REPO/git/refs/tags/$TAG" -f sha="$MERGE_SHA" -F force=true >/dev/null
fi
test "$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq .object.sha)" = "$MERGE_SHA"

STAGE='cleanup-temporary-lanes'
close_temp_lanes "$MERGE_SHA"
if [[ -n "${FINALIZER_PR:-}" ]]; then
  gh pr close "$FINALIZER_PR" --repo "$REPO" --comment "Never-merge finalizer completed canonical Wave-03 promotion at $MERGE_SHA."
fi
printf 'permanent_pr=%s\npermanent_head=%s\nmerge_sha=%s\nmarker_tag=%s\nclosed=7\nopen=35\nwave03_selected_open=5\n' "$PERMANENT_PR" "$HEAD_START" "$MERGE_SHA" "$TAG" > "$RECEIPT/final.txt"
STAGE='complete'
