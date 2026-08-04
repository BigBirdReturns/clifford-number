#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
TARGET_PR=1022
TARGET_BRANCH='agent/ssc-rd-wave03-rd01-methodology-correction'
TARGET_INTAKE='c491c99b2deb79b069a6dd7bc92f68e764228151'
TRANSPORT_REF='agent/ssc-rd01-wave03-terminal-materializer-base-v2'
TRANSPORT_ROOT='data/project/transport/ssc-rd01-wave03-terminal-v1'
TARGET_WORKFLOW='.github/workflows/status-sovereignty-rd-wave03-rd01-methodology-correction-terminal.yml'
EXPECTED_PR_PATHS=24
EXPECTED_PACKAGE_PATHS=15
RECEIPT='/tmp/ssc-rd01-wave03-verify-finalizer-receipt'
WORK='/tmp/ssc-rd01-wave03-verify-finalizer-worktree'
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

close_temp_lanes() {
  local merge_sha=$1
  gh pr list --repo "$REPO" --state open --limit 100 --json number,headRefName --jq '.[] | select((.headRefName|startswith("agent/ssc-rd01-wave03-terminal-materializer-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-finalizer-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-authoritative-finalizer-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-workflow-handoff-trigger"))) | [.number,.headRefName] | @tsv' |
  while IFS=$'\t' read -r number head; do
    [[ -z "$number" ]] && continue
    [[ "$number" = "${FINALIZER_PR:-}" ]] && continue
    gh pr close "$number" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $merge_sha." || true
  done
  for pr in 1035 1038; do
    state=$(gh api "repos/$REPO/pulls/$pr" --jq .state 2>/dev/null || true)
    if [[ "$state" = 'open' ]]; then
      gh pr close "$pr" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $merge_sha."
    fi
  done
}

STAGE='resolve-pr-and-leases'
PR_JSON=$(gh api "repos/$REPO/pulls/$TARGET_PR")
printf '%s\n' "$PR_JSON" > "$RECEIPT/pr.json"
if [[ "$(jq -r .merged <<<"$PR_JSON")" = 'true' ]]; then
  MERGE_SHA=$(jq -r .merge_commit_sha <<<"$PR_JSON")
  MAIN_SHA=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
  git fetch --no-tags origin "$MAIN_SHA" "$MERGE_SHA"
  git merge-base --is-ancestor "$MERGE_SHA" "$MAIN_SHA"
  gh issue close 1014 --repo "$REPO" --reason completed 2>/dev/null || true
  close_temp_lanes "$MERGE_SHA"
  printf 'merge_sha=%s\nmain_sha=%s\n' "$MERGE_SHA" "$MAIN_SHA" > "$RECEIPT/final.txt"
  STAGE='complete-already-merged'
  exit 0
fi

test "$(jq -r .state <<<"$PR_JSON")" = 'open'
test "$(jq -r .head.ref <<<"$PR_JSON")" = "$TARGET_BRANCH"
if [[ "$(jq -r .draft <<<"$PR_JSON")" = 'true' ]]; then
  gh pr ready "$TARGET_PR" --repo "$REPO"
fi
MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
HEAD_START=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
printf 'main_start=%s\nhead_start=%s\n' "$MAIN_START" "$HEAD_START" > "$RECEIPT/leases.txt"
git fetch --no-tags origin "$MAIN_START" "$HEAD_START" "$TARGET_INTAKE" "$TRANSPORT_REF"
git merge-base --is-ancestor "$TARGET_INTAKE" "$HEAD_START"

STAGE='reconstruct-sealed-package'
SRC='/tmp/ssc-rd01-wave03-verify-transport'
PRODUCT='/tmp/ssc-rd01-wave03-verify-product'
rm -rf "$SRC" "$PRODUCT"
mkdir -p "$SRC" "$PRODUCT"
git archive --format=tar "origin/$TRANSPORT_REF" "$TRANSPORT_ROOT" | tar -xf - -C "$SRC"
test "$(find "$SRC/$TRANSPORT_ROOT/package" -maxdepth 1 -type f -name '*.b64' | wc -l)" -eq 14
cat "$SRC/$TRANSPORT_ROOT"/package/*.b64 | tr -d '[:space:]' > /tmp/rd01-terminal-product.b64
test "$(sha256sum /tmp/rd01-terminal-product.b64 | cut -d' ' -f1)" = '1ce3440e9cc6e86896608fd6ec1f13912131d3fd4609f6df2ac1bfac14b3993b'
base64 -d /tmp/rd01-terminal-product.b64 > /tmp/rd01-terminal-product.tar.xz
test "$(sha256sum /tmp/rd01-terminal-product.tar.xz | cut -d' ' -f1)" = 'c2e6b7c2aecbc1924497b2fb1b1eb2a5b68d11e2fd28ce060e33c772b38a0432'
tar -xJf /tmp/rd01-terminal-product.tar.xz -C "$PRODUCT"
WORKFLOW_ABS=$(find "$PRODUCT" -type f -path "*/$TARGET_WORKFLOW" -print -quit)
test -n "$WORKFLOW_ABS"
PKGROOT=${WORKFLOW_ABS%/$TARGET_WORKFLOW}
(
  cd "$PKGROOT"
  find . -type f -printf '%P\n' | sort > "$RECEIPT/package-paths.txt"
  sha256sum $(cat "$RECEIPT/package-paths.txt") > "$RECEIPT/package-file-sha256.txt"
)
test "$(wc -l < "$RECEIPT/package-paths.txt" | tr -d ' ')" -eq "$EXPECTED_PACKAGE_PATHS"
test "$(grep -Fx "$TARGET_WORKFLOW" "$RECEIPT/package-paths.txt" | wc -l)" -eq 1

STAGE='verify-exact-twenty-four-path-surface'
BASE=$(git merge-base "$MAIN_START" "$TARGET_INTAKE")
git diff --name-only "$BASE..$TARGET_INTAKE" | sort -u > "$RECEIPT/intake-paths.txt"
test "$(wc -l < "$RECEIPT/intake-paths.txt" | tr -d ' ')" -eq 9
cat "$RECEIPT/intake-paths.txt" "$RECEIPT/package-paths.txt" | sort -u > "$RECEIPT/expected-pr-paths.txt"
test "$(wc -l < "$RECEIPT/expected-pr-paths.txt" | tr -d ' ')" -eq "$EXPECTED_PR_PATHS"
git diff --name-status "$MAIN_START...$HEAD_START" > "$RECEIPT/pr-name-status.txt"
test "$(wc -l < "$RECEIPT/pr-name-status.txt" | tr -d ' ')" -eq "$EXPECTED_PR_PATHS"
test "$(awk '$1 != "A" {n++} END {print n+0}' "$RECEIPT/pr-name-status.txt")" -eq 0
cut -f2- "$RECEIPT/pr-name-status.txt" | sort -u > "$RECEIPT/actual-pr-paths.txt"
cmp "$RECEIPT/expected-pr-paths.txt" "$RECEIPT/actual-pr-paths.txt"
if grep -E '(^|/)(transport|tmp)(/|$)|(^|/)\.ssc-|temp-|materializer|trigger' "$RECEIPT/actual-pr-paths.txt"; then
  echo 'prohibited permanent path' >&2
  exit 1
fi

STAGE='verify-sealed-terminal-bytes'
while IFS= read -r path; do
  mkdir -p "/tmp/rd01-head-compare/$(dirname "$path")"
  git show "$HEAD_START:$path" > "/tmp/rd01-head-compare/$path"
  cmp "$PKGROOT/$path" "/tmp/rd01-head-compare/$path"
done < "$RECEIPT/package-paths.txt"

STAGE='verify-immutable-intake-bytes'
comm -23 "$RECEIPT/intake-paths.txt" "$RECEIPT/package-paths.txt" > "$RECEIPT/intake-only-paths.txt"
test "$(wc -l < "$RECEIPT/intake-only-paths.txt" | tr -d ' ')" -eq 9
while IFS= read -r path; do
  git show "$TARGET_INTAKE:$path" > /tmp/rd01-intake-expected
  git show "$HEAD_START:$path" > /tmp/rd01-intake-actual
  cmp /tmp/rd01-intake-expected /tmp/rd01-intake-actual
done < "$RECEIPT/intake-only-paths.txt"

STAGE='construct-live-synthetic-merge'
rm -rf "$WORK"
git worktree add --detach "$WORK" "$MAIN_START"
cd "$WORK"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git merge --no-ff --no-commit "$HEAD_START"
git commit -m 'Synthetic qualification merge for RD-01 Wave-03 terminal closure'
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
  gh pr checks "$TARGET_PR" --repo "$REPO" --json name,bucket,state > "$RECEIPT/hosted-checks.json" 2>/dev/null || true
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

STAGE='merge-permanent-pr'
MERGE_JSON=$(gh api --method PUT "repos/$REPO/pulls/$TARGET_PR/merge" -f merge_method='merge' -f sha="$HEAD_START")
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

STAGE='close-issue-and-temporary-lanes'
gh issue close 1014 --repo "$REPO" --reason completed --comment "Closed by canonical RD-01-C06 terminal merge $MERGE_SHA. The bounded_source_unavailable receipt closes only the declared public-record obligation; cumulative Wave-03 promotion remains separate."
close_temp_lanes "$MERGE_SHA"
if [[ -n "${FINALIZER_PR:-}" ]]; then
  gh pr close "$FINALIZER_PR" --repo "$REPO" --comment "Never-merge verification controller completed canonical RD-01-C06 publication at $MERGE_SHA."
fi
printf 'merge_sha=%s\npermanent_head=%s\n' "$MERGE_SHA" "$HEAD_START" > "$RECEIPT/final.txt"
STAGE='complete'
