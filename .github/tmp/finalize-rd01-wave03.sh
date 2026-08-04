#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
TARGET_PR=1022
TARGET_BRANCH='agent/ssc-rd-wave03-rd01-methodology-correction'
TARGET_WORKFLOW='.github/workflows/status-sovereignty-rd-wave03-rd01-methodology-correction-terminal.yml'
EXPECTED_PR_PATHS=24
RECEIPT='/tmp/ssc-rd01-wave03-finalizer-receipt'
WORK='/tmp/ssc-rd01-wave03-finalizer-worktree'
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

require_clean_terminal_surface() {
  local base_sha=$1
  local head_sha=$2
  git diff --name-status "$base_sha...$head_sha" > "$RECEIPT/pr-name-status.txt"
  local count
  count=$(wc -l < "$RECEIPT/pr-name-status.txt" | tr -d ' ')
  test "$count" -eq "$EXPECTED_PR_PATHS"
  test "$(awk '$1 != "A" { n++ } END { print n+0 }' "$RECEIPT/pr-name-status.txt")" -eq 0
  if cut -f2- "$RECEIPT/pr-name-status.txt" | grep -E '(^|/)(transport|tmp)(/|$)|(^|/)\.ssc-|temp-|materializer|trigger' > "$RECEIPT/prohibited-paths.txt"; then
    echo 'prohibited permanent path detected' >&2
    return 1
  fi
  git cat-file -e "$head_sha:$TARGET_WORKFLOW"
}

run_focused() {
  mapfile -t builds < <(find tools -maxdepth 1 -type f -name 'build-*rd-wave03-rd01-methodology-correction*terminal*.mjs' | sort)
  mapfile -t validators < <(find tools -maxdepth 1 -type f -name 'validate-*rd-wave03-rd01-methodology-correction*terminal*.mjs' | sort)
  mapfile -t tests < <(find test -maxdepth 1 -type f -name '*rd-wave03-rd01-methodology-correction*terminal*.test.js' | sort)
  test "${#builds[@]}" -ge 1
  test "${#validators[@]}" -ge 1
  test "${#tests[@]}" -ge 1
  printf '%s\n' "${builds[@]}" > "$RECEIPT/focused-builders.txt"
  printf '%s\n' "${validators[@]}" > "$RECEIPT/focused-validators.txt"
  printf '%s\n' "${tests[@]}" > "$RECEIPT/focused-tests.txt"
  for f in "${builds[@]}"; do node "$f" --check; done
  for f in "${validators[@]}"; do node "$f"; done
  for f in "${tests[@]}"; do node "$f"; done
  node tools/validate-no-magic-human-gate.mjs
  node test/no-magic-human-gate.test.js
}

STAGE='resolve-live-leases'
PR_JSON=$(gh api "repos/$REPO/pulls/$TARGET_PR")
printf '%s\n' "$PR_JSON" > "$RECEIPT/pr-start.json"
test "$(jq -r .state <<<"$PR_JSON")" = 'open'
test "$(jq -r .draft <<<"$PR_JSON")" = 'false'
test "$(jq -r .head.ref <<<"$PR_JSON")" = "$TARGET_BRANCH"
HEAD_START=$(jq -r .head.sha <<<"$PR_JSON")
MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
printf 'main_start=%s\nhead_start=%s\n' "$MAIN_START" "$HEAD_START" > "$RECEIPT/leases.txt"

git fetch --no-tags origin "$MAIN_START" "$HEAD_START"

STAGE='verify-permanent-denominator'
require_clean_terminal_surface "$MAIN_START" "$HEAD_START"

STAGE='construct-synthetic-merge'
rm -rf "$WORK"
git worktree add --detach "$WORK" "$MAIN_START"
cd "$WORK"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git merge --no-ff --no-commit "$HEAD_START"
git commit -m 'Synthetic qualification merge for RD-01 Wave-03 terminal closure'
SYNTHETIC_SHA=$(git rev-parse HEAD)
printf 'synthetic_merge=%s\n' "$SYNTHETIC_SHA" >> "$RECEIPT/leases.txt"

STAGE='focused-synthetic-qualification'
run_focused

STAGE='complete-synthetic-release-gate'
npm run release:check

git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

STAGE='wait-hosted-pr-matrix'
CHECK_COUNT=$(gh pr checks "$TARGET_PR" --repo "$REPO" --json name --jq 'length')
test "$CHECK_COUNT" -ge 5
timeout 7200 gh pr checks "$TARGET_PR" --repo "$REPO" --watch --interval 10 > "$RECEIPT/hosted-checks.txt"

STAGE='recheck-leases-before-merge'
MAIN_END=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
PR_END=$(gh api "repos/$REPO/pulls/$TARGET_PR")
HEAD_END=$(jq -r .head.sha <<<"$PR_END")
test "$MAIN_END" = "$MAIN_START"
test "$HEAD_END" = "$HEAD_START"
test "$(jq -r .state <<<"$PR_END")" = 'open'

STAGE='merge-permanent-pr'
MERGE_JSON=$(gh api --method PUT "repos/$REPO/pulls/$TARGET_PR/merge" -f merge_method='merge' -f sha="$HEAD_START")
printf '%s\n' "$MERGE_JSON" > "$RECEIPT/merge.json"
test "$(jq -r .merged <<<"$MERGE_JSON")" = 'true'
MERGE_SHA=$(jq -r .sha <<<"$MERGE_JSON")
MAIN_MERGED=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
test "$MAIN_MERGED" = "$MERGE_SHA"
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

STAGE='close-completed-issue-and-temp-lanes'
gh issue close 1014 --repo "$REPO" --reason completed --comment "Closed by canonical RD-01-C06 terminal merge $MERGE_SHA. The bounded_source_unavailable receipt closes only the declared public-record obligation; cumulative Wave-03 promotion remains separate."
for pr in 1035 1038; do
  state=$(gh api "repos/$REPO/pulls/$pr" --jq .state 2>/dev/null || true)
  if [[ "$state" = 'open' ]]; then
    gh pr close "$pr" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $MERGE_SHA."
  fi
done
for head in \
  'agent/ssc-rd01-wave03-terminal-materializer-trigger-v3' \
  'agent/ssc-rd01-wave03-terminal-materializer-trigger-v4'; do
  pr=$(gh pr list --repo "$REPO" --state open --head "$head" --json number --jq '.[0].number // empty')
  if [[ -n "$pr" ]]; then
    gh pr close "$pr" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $MERGE_SHA."
  fi
done
if [[ -n "${FINALIZER_PR:-}" ]]; then
  gh pr close "$FINALIZER_PR" --repo "$REPO" --comment "Never-merge controller completed canonical RD-01-C06 publication at $MERGE_SHA."
fi

STAGE='complete'
