#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
TARGET_PR=1022
TARGET_BRANCH='agent/ssc-rd-wave03-rd01-methodology-correction'
TARGET_LEASE='c491c99b2deb79b069a6dd7bc92f68e764228151'
TRANSPORT_REF='agent/ssc-rd01-wave03-terminal-materializer-base-v2'
TRANSPORT_ROOT='data/project/transport/ssc-rd01-wave03-terminal-v1'
TARGET_WORKFLOW='.github/workflows/status-sovereignty-rd-wave03-rd01-methodology-correction-terminal.yml'
EXPECTED_PR_PATHS=24
RECEIPT='/tmp/ssc-rd01-wave03-finalizer-v2-receipt'
WORK='/tmp/ssc-rd01-wave03-finalizer-v2-worktree'
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

surface_complete() {
  local main_sha=$1
  local head_sha=$2
  git diff --name-status "$main_sha...$head_sha" > "$RECEIPT/current-surface.txt"
  local count
  count=$(wc -l < "$RECEIPT/current-surface.txt" | tr -d ' ')
  [[ "$count" -eq "$EXPECTED_PR_PATHS" ]] || return 1
  [[ "$(awk '$1 != "A" { n++ } END { print n+0 }' "$RECEIPT/current-surface.txt")" -eq 0 ]] || return 1
  if cut -f2- "$RECEIPT/current-surface.txt" | grep -E '(^|/)(transport|tmp)(/|$)|(^|/)\.ssc-|temp-|materializer|trigger' >/dev/null; then
    return 1
  fi
  git cat-file -e "$head_sha:$TARGET_WORKFLOW" || return 1
}

close_temp_lanes() {
  local merge_sha=$1
  for pr in 1035 1038; do
    state=$(gh api "repos/$REPO/pulls/$pr" --jq .state 2>/dev/null || true)
    if [[ "$state" = 'open' ]]; then
      gh pr close "$pr" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $merge_sha."
    fi
  done
  for head in \
    'agent/ssc-rd01-wave03-terminal-materializer-trigger-v3' \
    'agent/ssc-rd01-wave03-terminal-materializer-trigger-v4' \
    'agent/ssc-rd01-wave03-finalizer-trigger-v1'; do
    pr=$(gh pr list --repo "$REPO" --state open --head "$head" --json number --jq '.[0].number // empty')
    if [[ -n "$pr" ]]; then
      gh pr close "$pr" --repo "$REPO" --comment "Retired unmerged after canonical RD-01-C06 terminal publication at $merge_sha."
    fi
  done
}

STAGE='resolve-pr-state'
PR_JSON=$(gh api "repos/$REPO/pulls/$TARGET_PR")
printf '%s\n' "$PR_JSON" > "$RECEIPT/pr-initial.json"
if [[ "$(jq -r .merged <<<"$PR_JSON")" = 'true' ]]; then
  MERGE_SHA=$(jq -r .merge_commit_sha <<<"$PR_JSON")
  MAIN_SHA=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
  test "$MAIN_SHA" = "$MERGE_SHA"
  gh issue close 1014 --repo "$REPO" --reason completed 2>/dev/null || true
  close_temp_lanes "$MERGE_SHA"
  STAGE='complete-already-merged'
  exit 0
fi

test "$(jq -r .state <<<"$PR_JSON")" = 'open'
test "$(jq -r .head.ref <<<"$PR_JSON")" = "$TARGET_BRANCH"
if [[ "$(jq -r .draft <<<"$PR_JSON")" = 'true' ]]; then
  gh pr ready "$TARGET_PR" --repo "$REPO"
fi

STAGE='fetch-live-repository-state'
MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
HEAD_START=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
printf 'main_start=%s\nhead_start=%s\n' "$MAIN_START" "$HEAD_START" > "$RECEIPT/leases.txt"
git fetch --no-tags origin "$MAIN_START" "$HEAD_START" "$TRANSPORT_REF"

if ! surface_complete "$MAIN_START" "$HEAD_START"; then
  STAGE='archive-and-normalize-partial-target'
  ARCHIVE_BRANCH="archive/ssc-rd01-wave03-pre-finalizer-v2-${HEAD_START:0:12}"
  if ! git ls-remote --exit-code --heads origin "$ARCHIVE_BRANCH" >/dev/null 2>&1; then
    git push origin "$HEAD_START:refs/heads/$ARCHIVE_BRANCH"
  fi
  git push origin "$TARGET_LEASE:refs/heads/$TARGET_BRANCH" --force-with-lease="refs/heads/$TARGET_BRANCH:$HEAD_START"

  STAGE='reconstruct-sealed-transport'
  SRC='/tmp/ssc-rd01-wave03-transport-source'
  CACHE='/tmp/ssc-rd01-wave03-terminal-transport'
  rm -rf "$SRC" "$CACHE"
  mkdir -p "$SRC" "$CACHE/package"
  git archive --format=tar "origin/$TRANSPORT_REF" "$TRANSPORT_ROOT" | tar -xf - -C "$SRC"
  test "$(find "$SRC/$TRANSPORT_ROOT/package" -maxdepth 1 -type f -name '*.b64' | wc -l)" -eq 14
  test "$(find "$SRC/$TRANSPORT_ROOT/executor" -maxdepth 1 -type f -name '*.b64' | wc -l)" -eq 2
  cp "$SRC/$TRANSPORT_ROOT"/package/*.b64 "$CACHE/package/"
  cat "$CACHE"/package/*.b64 | tr -d '[:space:]' > /tmp/rd01-terminal-product.b64
  test "$(sha256sum /tmp/rd01-terminal-product.b64 | cut -d' ' -f1)" = '1ce3440e9cc6e86896608fd6ec1f13912131d3fd4609f6df2ac1bfac14b3993b'
  base64 -d /tmp/rd01-terminal-product.b64 > /tmp/rd01-terminal-product.tar.xz
  test "$(sha256sum /tmp/rd01-terminal-product.tar.xz | cut -d' ' -f1)" = 'c2e6b7c2aecbc1924497b2fb1b1eb2a5b68d11e2fd28ce060e33c772b38a0432'

  cat "$SRC/$TRANSPORT_ROOT"/executor/*.b64 | tr -d '[:space:]' > /tmp/rd01-executor.b64
  test "$(sha256sum /tmp/rd01-executor.b64 | cut -d' ' -f1)" = '4aed770ab8575e120f31ec285fdd97b89c8e8b793792841b8751f299f180e9ab'
  base64 -d /tmp/rd01-executor.b64 > /tmp/rd01-executor.sh.xz
  test "$(sha256sum /tmp/rd01-executor.sh.xz | cut -d' ' -f1)" = 'a31b4e0fe306be1f058b7b66ed860417f7333d78122b663a7de697ef1fc8e58f'
  xz -dc /tmp/rd01-executor.sh.xz > /tmp/publish-rd01-wave03-terminal.sh
  test "$(sha256sum /tmp/publish-rd01-wave03-terminal.sh | cut -d' ' -f1)" = 'a1c1d1a636c093bb57eb9f1d88b6066f1bf48b1bebb92ac4b9aff3f87a439079'
  python3 -c "from pathlib import Path; p=Path('/tmp/publish-rd01-wave03-terminal.sh'); q=Path('/tmp/publish-rd01-wave03-terminal-patched.sh'); s=p.read_text(); old='TRANSPORT_ROOT=\"data/project/transport/ssc-rd01-wave03-terminal-v1\"'; new='TRANSPORT_ROOT=\"/tmp/ssc-rd01-wave03-terminal-transport\"'; assert s.count(old)==1; t=s.replace(old,new); assert old not in t and t.count(new)==1; q.write_text(t)"
  chmod 0700 /tmp/publish-rd01-wave03-terminal-patched.sh

  STAGE='execute-sealed-nonworkflow-publication'
  bash -x /tmp/publish-rd01-wave03-terminal-patched.sh

  STAGE='compose-exact-standing-workflow'
  PRODUCT='/tmp/ssc-rd01-wave03-terminal-product'
  rm -rf "$PRODUCT"
  mkdir -p "$PRODUCT"
  tar -xJf /tmp/rd01-terminal-product.tar.xz -C "$PRODUCT"
  mapfile -t workflow_files < <(find "$PRODUCT" -type f -path "*/$TARGET_WORKFLOW")
  test "${#workflow_files[@]}" -eq 1
  WORKFLOW_FILE=${workflow_files[0]}
  CURRENT=$(gh api "repos/$REPO/contents/$TARGET_WORKFLOW?ref=$TARGET_BRANCH" 2>/dev/null || true)
  if [[ -n "$CURRENT" ]]; then
    python3 - "$WORKFLOW_FILE" "$RECEIPT/current-workflow.json" <<<"$CURRENT" <<'PY'
import base64, json, pathlib, sys
source = pathlib.Path(sys.argv[1]).read_bytes()
current = json.loads(sys.stdin.read())
actual = base64.b64decode(current['content'])
if actual != source:
    raise SystemExit('existing workflow bytes differ from sealed package')
pathlib.Path(sys.argv[2]).write_text(json.dumps(current, indent=2) + '\n')
PY
  else
    python3 - "$WORKFLOW_FILE" /tmp/rd01-workflow-put.json <<'PY'
import base64, json, pathlib, sys
content = base64.b64encode(pathlib.Path(sys.argv[1]).read_bytes()).decode()
pathlib.Path(sys.argv[2]).write_text(json.dumps({
  'message': 'Compose standing RD-01 Wave-03 terminal closure gate',
  'content': content,
  'branch': 'agent/ssc-rd-wave03-rd01-methodology-correction'
}) + '\n')
PY
    gh api --method PUT "repos/$REPO/contents/$TARGET_WORKFLOW" --input /tmp/rd01-workflow-put.json > "$RECEIPT/workflow-compose.json"
  fi

  HEAD_START=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
  MAIN_START=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
  printf 'main_after_materialization=%s\nhead_after_materialization=%s\n' "$MAIN_START" "$HEAD_START" >> "$RECEIPT/leases.txt"
  git fetch --no-tags origin "$MAIN_START" "$HEAD_START"
fi

STAGE='verify-complete-permanent-surface'
surface_complete "$MAIN_START" "$HEAD_START"

STAGE='construct-live-synthetic-merge'
rm -rf "$WORK"
git worktree add --detach "$WORK" "$MAIN_START"
cd "$WORK"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git merge --no-ff --no-commit "$HEAD_START"
git commit -m 'Synthetic qualification merge for RD-01 Wave-03 terminal closure'
SYNTHETIC_SHA=$(git rev-parse HEAD)
printf 'synthetic_merge=%s\n' "$SYNTHETIC_SHA" >> "$RECEIPT/leases.txt"

STAGE='hosted-synthetic-focused-gates'
run_focused
STAGE='hosted-synthetic-complete-release-gate'
npm run release:check
git restore --worktree -- .
git clean -fd
run_focused
test -z "$(git status --porcelain=v1 --untracked-files=all)"

gh pr checks "$TARGET_PR" --repo "$REPO" --json name,bucket,state > "$RECEIPT/current-pr-checks.json" 2>/dev/null || true
if jq -e '.[] | select(.bucket == "fail" or .bucket == "cancel")' "$RECEIPT/current-pr-checks.json" >/dev/null 2>&1; then
  echo 'current target PR has a failing hosted check' >&2
  exit 1
fi

STAGE='recheck-live-leases'
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

STAGE='close-issue-and-temporary-lanes'
gh issue close 1014 --repo "$REPO" --reason completed --comment "Closed by canonical RD-01-C06 terminal merge $MERGE_SHA. The bounded_source_unavailable receipt closes only the declared public-record obligation; cumulative Wave-03 promotion remains separate."
close_temp_lanes "$MERGE_SHA"
if [[ -n "${FINALIZER_PR:-}" ]]; then
  gh pr close "$FINALIZER_PR" --repo "$REPO" --comment "Never-merge controller completed canonical RD-01-C06 publication at $MERGE_SHA."
fi

STAGE='complete'
