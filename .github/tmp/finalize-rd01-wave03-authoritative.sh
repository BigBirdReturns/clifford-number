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
EXPECTED_NONWORKFLOW_PATHS=14
RECEIPT='/tmp/ssc-rd01-wave03-authoritative-finalizer-receipt'
WORK='/tmp/ssc-rd01-wave03-authoritative-finalizer-worktree'
REPLAY='/tmp/ssc-rd01-wave03-authoritative-finalizer-replay'
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

publish_receipt() {
  local ref='archive/ssc-rd01-wave03-authoritative-finalizer-receipt'
  local start
  start=$(git ls-remote origin "refs/heads/$ref" | awk '{print $1}')
  if [[ -z "$start" ]]; then
    start=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
    gh api --method POST "repos/$REPO/git/refs" -f ref="refs/heads/$ref" -f sha="$start" >/dev/null
  fi
  git fetch --no-tags origin "$ref"
  rm -rf /tmp/rd01-authoritative-receipt-branch
  git worktree add --detach /tmp/rd01-authoritative-receipt-branch "origin/$ref"
  (
    cd /tmp/rd01-authoritative-receipt-branch
    git config user.name 'github-actions[bot]'
    git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
    rm -rf reports/transport/ssc-rd01-wave03-authoritative-finalizer-latest
    mkdir -p reports/transport/ssc-rd01-wave03-authoritative-finalizer-latest
    cp -a "$RECEIPT"/. reports/transport/ssc-rd01-wave03-authoritative-finalizer-latest/
    git add reports/transport/ssc-rd01-wave03-authoritative-finalizer-latest
    git commit -m 'Update authoritative RD-01 Wave-03 finalizer receipt'
    git push origin "HEAD:refs/heads/$ref" --force-with-lease="refs/heads/$ref:$start"
  )
}

close_superseded_controllers() {
  gh pr list --repo "$REPO" --state open --limit 100 --json number,headRefName --jq '.[] | select((.headRefName|startswith("agent/ssc-rd01-wave03-terminal-materializer-trigger")) or (.headRefName|startswith("agent/ssc-rd01-wave03-finalizer-trigger"))) | [.number,.headRefName] | @tsv' |
  while IFS=$'\t' read -r number head; do
    [[ -z "$number" ]] && continue
    [[ "$number" = "${FINALIZER_PR:-}" ]] && continue
    gh pr close "$number" --repo "$REPO" --comment 'Superseded by the single authoritative RD-01-C06 finalizer; closed unmerged.' || true
  done
}

close_temp_lanes() {
  local merge_sha=$1
  for pr in 1035 1038; do
    state=$(gh api "repos/$REPO/pulls/$pr" --jq .state 2>/dev/null || true)
    if [[ "$state" = 'open' ]]; then
      gh pr close "$pr" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $merge_sha."
    fi
  done
  close_superseded_controllers
}

STAGE='quiesce-superseded-controllers'
close_superseded_controllers
sleep 20

STAGE='resolve-current-state'
PR_JSON=$(gh api "repos/$REPO/pulls/$TARGET_PR")
printf '%s\n' "$PR_JSON" > "$RECEIPT/pr-initial.json"
if [[ "$(jq -r .merged <<<"$PR_JSON")" = 'true' ]]; then
  MERGE_SHA=$(jq -r .merge_commit_sha <<<"$PR_JSON")
  MAIN_SHA=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
  test "$MAIN_SHA" = "$MERGE_SHA"
  gh issue close 1014 --repo "$REPO" --reason completed 2>/dev/null || true
  close_temp_lanes "$MERGE_SHA"
  printf 'merge_sha=%s\n' "$MERGE_SHA" > "$RECEIPT/final.txt"
  STAGE='complete-already-merged'
  publish_receipt
  exit 0
fi

test "$(jq -r .state <<<"$PR_JSON")" = 'open'
test "$(jq -r .head.ref <<<"$PR_JSON")" = "$TARGET_BRANCH"
if [[ "$(jq -r .draft <<<"$PR_JSON")" = 'true' ]]; then
  gh pr ready "$TARGET_PR" --repo "$REPO"
fi

MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
TARGET_START=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
printf 'main_start=%s\ntarget_start=%s\n' "$MAIN_START" "$TARGET_START" > "$RECEIPT/leases.txt"
git fetch --no-tags origin "$MAIN_START" "$TARGET_START" "$TARGET_INTAKE" "$TRANSPORT_REF"

STAGE='archive-and-normalize-target'
ARCHIVE_BRANCH="archive/ssc-rd01-wave03-pre-authoritative-${TARGET_START:0:12}"
if ! git ls-remote --exit-code --heads origin "$ARCHIVE_BRANCH" >/dev/null 2>&1; then
  git push origin "$TARGET_START:refs/heads/$ARCHIVE_BRANCH"
fi
if [[ "$TARGET_START" != "$TARGET_INTAKE" ]]; then
  git push origin "$TARGET_INTAKE:refs/heads/$TARGET_BRANCH" --force-with-lease="refs/heads/$TARGET_BRANCH:$TARGET_START"
fi
TARGET_LEASE=$TARGET_INTAKE

STAGE='reconstruct-sealed-package'
SRC='/tmp/ssc-rd01-wave03-authoritative-transport'
PRODUCT='/tmp/ssc-rd01-wave03-authoritative-product'
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
grep -Fvx "$TARGET_WORKFLOW" "$RECEIPT/package-paths.txt" > "$RECEIPT/nonworkflow-paths.txt"
test "$(wc -l < "$RECEIPT/nonworkflow-paths.txt" | tr -d ' ')" -eq "$EXPECTED_NONWORKFLOW_PATHS"

STAGE='prove-live-main-disjointness'
BASE=$(git merge-base "$MAIN_START" "$TARGET_INTAKE")
git diff --name-only "$BASE..$TARGET_INTAKE" | sort -u > "$RECEIPT/intake-paths.txt"
test "$(wc -l < "$RECEIPT/intake-paths.txt" | tr -d ' ')" -eq 9
cat "$RECEIPT/intake-paths.txt" "$RECEIPT/package-paths.txt" | sort -u > "$RECEIPT/permanent-pr-paths.txt"
test "$(wc -l < "$RECEIPT/permanent-pr-paths.txt" | tr -d ' ')" -eq "$EXPECTED_PR_PATHS"
git diff --name-only "$BASE..$MAIN_START" | sort -u > "$RECEIPT/live-main-delta.txt"
comm -12 "$RECEIPT/permanent-pr-paths.txt" "$RECEIPT/live-main-delta.txt" > "$RECEIPT/live-main-overlap.txt"
test ! -s "$RECEIPT/live-main-overlap.txt"

STAGE='construct-two-parent-integration'
rm -rf "$WORK"
git worktree add --detach "$WORK" "$MAIN_START"
cd "$WORK"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git merge --no-ff --no-commit "$TARGET_INTAKE"
git commit -m 'Integrate RD-01 Wave-03 intake over live main'
INTEGRATION=$(git rev-parse HEAD)
test "$(git rev-list --parents -n1 HEAD | wc -w)" -eq 3
test "$(git rev-parse HEAD^1)" = "$MAIN_START"
test "$(git rev-parse HEAD^2)" = "$TARGET_INTAKE"
printf 'integration=%s\n' "$INTEGRATION" >> "$RECEIPT/leases.txt"

STAGE='materialize-fourteen-nonworkflow-paths'
while IFS= read -r path; do
  mkdir -p "$(dirname "$path")"
  cp "$PKGROOT/$path" "$path"
done < "$RECEIPT/nonworkflow-paths.txt"
git add --pathspec-from-file="$RECEIPT/nonworkflow-paths.txt"
git diff --cached --name-only | sort -u > "$RECEIPT/staged-nonworkflow-paths.txt"
cmp "$RECEIPT/nonworkflow-paths.txt" "$RECEIPT/staged-nonworkflow-paths.txt"
if grep -E '(^|/)(transport|tmp)(/|$)|(^|/)\.ssc-|temp-|materializer|trigger' "$RECEIPT/staged-nonworkflow-paths.txt"; then
  echo 'prohibited product path' >&2
  exit 1
fi
git commit -m 'Materialize RD-01 Wave-03 terminal product without workflow transport'
NONWORKFLOW_COMMIT=$(git rev-parse HEAD)
NONWORKFLOW_TREE=$(git rev-parse HEAD^{tree})
printf 'nonworkflow_commit=%s\nnonworkflow_tree=%s\n' "$NONWORKFLOW_COMMIT" "$NONWORKFLOW_TREE" >> "$RECEIPT/leases.txt"

STAGE='qualify-fourteen-path-product'
run_focused
npm run release:check
git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

STAGE='deterministic-replay'
rm -rf "$REPLAY"
git worktree add --detach "$REPLAY" "$INTEGRATION"
(
  cd "$REPLAY"
  while IFS= read -r path; do
    mkdir -p "$(dirname "$path")"
    cp "$PKGROOT/$path" "$path"
  done < "$RECEIPT/nonworkflow-paths.txt"
  git add --pathspec-from-file="$RECEIPT/nonworkflow-paths.txt"
  REPLAY_TREE=$(git write-tree)
  printf 'replay_tree=%s\n' "$REPLAY_TREE" >> "$RECEIPT/leases.txt"
  test "$REPLAY_TREE" = "$NONWORKFLOW_TREE"
)

STAGE='publish-fourteen-path-product'
REMOTE_TARGET=$(git ls-remote origin "refs/heads/$TARGET_BRANCH" | awk '{print $1}')
test "$REMOTE_TARGET" = "$TARGET_LEASE"
git push origin "$NONWORKFLOW_COMMIT:refs/heads/$TARGET_BRANCH" --force-with-lease="refs/heads/$TARGET_BRANCH:$TARGET_LEASE"

STAGE='create-exact-workflow-git-objects'
WORKFLOW_B64=$(base64 -w0 "$PKGROOT/$TARGET_WORKFLOW")
WORKFLOW_BLOB=$(gh api --method POST "repos/$REPO/git/blobs" -f content="$WORKFLOW_B64" -f encoding='base64' --jq .sha)
jq -n --arg base_tree "$NONWORKFLOW_TREE" --arg path "$TARGET_WORKFLOW" --arg sha "$WORKFLOW_BLOB" '{base_tree:$base_tree,tree:[{path:$path,mode:"100644",type:"blob",sha:$sha}]}' > /tmp/rd01-workflow-tree.json
COMPOSED_TREE=$(gh api --method POST "repos/$REPO/git/trees" --input /tmp/rd01-workflow-tree.json --jq .sha)
jq -n --arg message 'Compose standing RD-01 Wave-03 terminal closure gate' --arg tree "$COMPOSED_TREE" --arg parent "$NONWORKFLOW_COMMIT" '{message:$message,tree:$tree,parents:[$parent]}' > /tmp/rd01-workflow-commit.json
COMPOSED_COMMIT=$(gh api --method POST "repos/$REPO/git/commits" --input /tmp/rd01-workflow-commit.json --jq .sha)
printf 'workflow_blob=%s\ncomposed_tree=%s\ncomposed_commit=%s\n' "$WORKFLOW_BLOB" "$COMPOSED_TREE" "$COMPOSED_COMMIT" >> "$RECEIPT/leases.txt"

STAGE='advance-target-to-composed-commit'
if ! gh api --method PATCH "repos/$REPO/git/refs/heads/$TARGET_BRANCH" -f sha="$COMPOSED_COMMIT" -F force=false > "$RECEIPT/ref-update.json" 2> "$RECEIPT/ref-update.stderr"; then
  git fetch --no-tags origin "$COMPOSED_COMMIT" || true
  if ! git push origin "$COMPOSED_COMMIT:refs/heads/$TARGET_BRANCH" --force-with-lease="refs/heads/$TARGET_BRANCH:$NONWORKFLOW_COMMIT" > "$RECEIPT/ref-push.stdout" 2> "$RECEIPT/ref-push.stderr"; then
    echo "connector_handoff_sha=$COMPOSED_COMMIT" > "$RECEIPT/connector-handoff.txt"
    publish_receipt
    exit 1
  fi
fi

STAGE='verify-complete-twenty-four-path-surface'
git fetch --no-tags origin "$COMPOSED_COMMIT"
test "$(git ls-remote origin "refs/heads/$TARGET_BRANCH" | awk '{print $1}')" = "$COMPOSED_COMMIT"
git diff --name-status "$MAIN_START...$COMPOSED_COMMIT" > "$RECEIPT/final-pr-name-status.txt"
test "$(wc -l < "$RECEIPT/final-pr-name-status.txt" | tr -d ' ')" -eq "$EXPECTED_PR_PATHS"
test "$(awk '$1 != "A" {n++} END {print n+0}' "$RECEIPT/final-pr-name-status.txt")" -eq 0
cut -f2- "$RECEIPT/final-pr-name-status.txt" | sort -u > "$RECEIPT/final-pr-paths.txt"
cmp "$RECEIPT/permanent-pr-paths.txt" "$RECEIPT/final-pr-paths.txt"
if grep -E '(^|/)(transport|tmp)(/|$)|(^|/)\.ssc-|temp-|materializer|trigger' "$RECEIPT/final-pr-paths.txt"; then
  echo 'prohibited final path' >&2
  exit 1
fi

STAGE='qualify-complete-live-synthetic-merge'
git checkout --detach "$MAIN_START"
git merge --no-ff --no-commit "$COMPOSED_COMMIT"
git commit -m 'Synthetic qualification merge for RD-01 Wave-03 terminal closure'
SYNTHETIC=$(git rev-parse HEAD)
printf 'synthetic=%s\n' "$SYNTHETIC" >> "$RECEIPT/leases.txt"
run_focused
npm run release:check
git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

STAGE='wait-hosted-pr-checks'
for _ in $(seq 1 90); do
  gh pr checks "$TARGET_PR" --repo "$REPO" --json name,bucket,state > "$RECEIPT/hosted-checks.json" 2>/dev/null || true
  COUNT=$(jq 'length' "$RECEIPT/hosted-checks.json" 2>/dev/null || echo 0)
  FAIL=$(jq '[.[] | select(.bucket=="fail" or .bucket=="cancel")] | length' "$RECEIPT/hosted-checks.json" 2>/dev/null || echo 0)
  PENDING=$(jq '[.[] | select(.bucket=="pending")] | length' "$RECEIPT/hosted-checks.json" 2>/dev/null || echo 0)
  test "$FAIL" -eq 0
  if [[ "$COUNT" -ge 5 && "$PENDING" -eq 0 ]]; then break; fi
  sleep 20
done
test "$(jq 'length' "$RECEIPT/hosted-checks.json")" -ge 5
test "$(jq '[.[] | select(.bucket=="pending" or .bucket=="fail" or .bucket=="cancel")] | length' "$RECEIPT/hosted-checks.json")" -eq 0

STAGE='recheck-leases-before-merge'
MAIN_END=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
HEAD_END=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
test "$MAIN_END" = "$MAIN_START"
test "$HEAD_END" = "$COMPOSED_COMMIT"

STAGE='merge-permanent-pr'
MERGE_JSON=$(gh api --method PUT "repos/$REPO/pulls/$TARGET_PR/merge" -f merge_method='merge' -f sha="$COMPOSED_COMMIT")
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
  gh pr close "$FINALIZER_PR" --repo "$REPO" --comment "Never-merge authoritative controller completed canonical RD-01-C06 publication at $MERGE_SHA."
fi
printf 'merge_sha=%s\npermanent_head=%s\n' "$MERGE_SHA" "$COMPOSED_COMMIT" > "$RECEIPT/final.txt"
STAGE='complete'
publish_receipt
