#!/usr/bin/env bash
set -Eeuo pipefail

# Opens ONE ordinary pull request carrying crawler-owned intake paths.
#
# What this helper can do: build a single direct-child candidate commit of the
# leased main commit, push it to a run-scoped automation-crawl-* branch, and open
# a pull request from that branch.
#
# What it cannot do, by construction and by test/scheduled-crawl-promotion.test.js:
# merge or approve a pull request, enable auto-merge, dispatch another workflow,
# push main, or touch branch policy. A maintainer reviews and merges the pull
# request; the pull_request trigger of the Release checks workflow gates it.

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
RUN_ID="${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"
PROMOTION_KIND="${PROMOTION_KIND:?PROMOTION_KIND is required}"
WORKSPACE="${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"
RECEIPT_DIR="${RUNNER_TEMP:-/tmp}/scheduled-crawl-promotion-receipt"

rm -rf "$RECEIPT_DIR"
mkdir -p "$RECEIPT_DIR"
cd "$WORKSPACE"

STAGE='init'
OUTCOME='failed_closed'
BASE_SHA=''
CANDIDATE_SHA=''
CANDIDATE_BRANCH=''
PR_NUMBER=''
REMOTE_CLEANUP='not_needed'
PUBLISHED_CANDIDATE='false'

case "$PROMOTION_KIND" in
  industrial-exhaust)
    SLUG='industrial-exhaust'
    ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')
    COMMIT_MESSAGE="crawl: first-party industrial exhaust ($(date -u +%F))"
    PR_TITLE="$COMMIT_MESSAGE"
    PR_BODY=$(cat <<'BODY'
This pull request was opened by the manually dispatched first-party industrial-exhaust crawler. It contains only immutable first-party industrial-exhaust intake and retained source receipts, and it is left open for maintainer review. The workflow that opened it cannot merge or approve it and cannot start any other workflow.

The mechanism refuses main drift, rejects every path outside `data/exhaust/**` and `receipts/exhaust/**`, and publishes one direct-child candidate commit on a run-scoped `automation-crawl-*` branch. This object does not admit a graph edge, claim, score, case, identity, or conclusion.

Does the Release checks run on this pull request pass, and does the diff stay inside the two-root intake denominator?
BODY
)
    ;;
  official-record)
    SLUG='official-record'
    ALLOWED_ROOTS=('data/crawl' 'receipts/crawl')
    COMMIT_MESSAGE="crawl: official-record intake ($(date -u +%F))"
    PR_TITLE="$COMMIT_MESSAGE"
    PR_BODY=$(cat <<'BODY'
This pull request was opened by the manually dispatched official-record crawler. It contains only neutral official-record observations, candidates, rejections, crawl state, and retained crawl receipts, and it is left open for maintainer review. The workflow that opened it cannot merge or approve it and cannot start any other workflow.

The mechanism refuses main drift, rejects every path outside `data/crawl/**` and `receipts/crawl/**`, and publishes one direct-child candidate commit on a run-scoped `automation-crawl-*` branch. This object remains below canonical graph, case, identity, score, claim, and conclusion authority.

Does the Release checks run on this pull request pass, and does the diff stay inside the two-root intake denominator?
BODY
)
    ;;
  *)
    echo "unsupported PROMOTION_KIND: $PROMOTION_KIND" >&2
    exit 2
    ;;
esac

CANDIDATE_BRANCH="automation-crawl-${SLUG}-run-${RUN_ID}-${RUN_ATTEMPT}"

write_checkpoint() {
  local rc="$1"
  {
    printf 'outcome=%s\n' "$OUTCOME"
    printf 'stage=%s\n' "$STAGE"
    printf 'exit_code=%s\n' "$rc"
    printf 'repository=%s\n' "$REPO"
    printf 'promotion_kind=%s\n' "$PROMOTION_KIND"
    printf 'run_id=%s\n' "$RUN_ID"
    printf 'run_attempt=%s\n' "$RUN_ATTEMPT"
    printf 'base_sha=%s\n' "$BASE_SHA"
    printf 'candidate_branch=%s\n' "$CANDIDATE_BRANCH"
    printf 'candidate_sha=%s\n' "$CANDIDATE_SHA"
    printf 'pull_request=%s\n' "$PR_NUMBER"
    printf 'remote_cleanup=%s\n' "$REMOTE_CLEANUP"
    printf 'time_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$RECEIPT_DIR/checkpoint.txt"
}

# On failure only: withdraw this run's own candidate (close its pull request and
# delete its run-scoped branch, and only while the branch still holds the leased SHA).
safe_remote_cleanup() {
  local cleanup_errors=0
  REMOTE_CLEANUP='attempted'

  if [[ -n "$PR_NUMBER" ]]; then
    local pr_state
    pr_state="$(gh api "repos/$REPO/pulls/$PR_NUMBER" --jq .state 2>/dev/null || true)"
    if [[ "$pr_state" == 'open' ]]; then
      gh api --method PATCH "repos/$REPO/pulls/$PR_NUMBER" -f state=closed \
        > "$RECEIPT_DIR/cleanup-pr.json" 2> "$RECEIPT_DIR/cleanup-pr.stderr" \
        || cleanup_errors=$((cleanup_errors + 1))
    fi
  fi

  if [[ "$PUBLISHED_CANDIDATE" == 'true' && -n "$CANDIDATE_SHA" && -n "$CANDIDATE_BRANCH" ]]; then
    local remote_candidate
    remote_candidate="$(gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha 2>/dev/null || true)"
    if [[ "$remote_candidate" == "$CANDIDATE_SHA" ]]; then
      git push --force-with-lease="refs/heads/$CANDIDATE_BRANCH:$CANDIDATE_SHA" \
        origin ":refs/heads/$CANDIDATE_BRANCH" \
        > "$RECEIPT_DIR/cleanup-branch.txt" 2> "$RECEIPT_DIR/cleanup-branch.stderr" \
        || cleanup_errors=$((cleanup_errors + 1))
    elif [[ -n "$remote_candidate" ]]; then
      printf 'candidate ref moved: expected %s observed %s\n' \
        "$CANDIDATE_SHA" "$remote_candidate" > "$RECEIPT_DIR/cleanup-branch-refused.txt"
      cleanup_errors=$((cleanup_errors + 1))
    fi
  fi

  if [[ "$cleanup_errors" -eq 0 ]]; then
    REMOTE_CLEANUP='complete'
  else
    REMOTE_CLEANUP="incomplete_${cleanup_errors}"
  fi
}

finish() {
  local rc=$?
  trap - EXIT
  if [[ "$rc" -ne 0 ]]; then
    safe_remote_cleanup || true
  fi
  write_checkpoint "$rc"
  exit "$rc"
}
trap finish EXIT

path_is_allowed() {
  local candidate="$1"
  local root
  for root in "${ALLOWED_ROOTS[@]}"; do
    if [[ "$candidate" == "$root/"* ]]; then
      return 0
    fi
  done
  return 1
}

assert_paths_allowed() {
  local label="$1"
  shift
  local path
  for path in "$@"; do
    if ! path_is_allowed "$path"; then
      printf '%s contains forbidden path: %s\n' "$label" "$path" >&2
      return 1
    fi
  done
}

collect_worktree_paths() {
  {
    git diff --no-renames --name-only -z HEAD --
    git ls-files --others --exclude-standard -z
  } | sort -zu
}

collect_commit_paths() {
  git diff-tree --no-commit-id --no-renames --name-only -r -z "$1" | sort -zu
}

STAGE='lease-current-main'
BASE_SHA="$(git rev-parse HEAD)"
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$BASE_SHA"
printf 'base_sha=%s\n' "$BASE_SHA" > "$RECEIPT_DIR/base.txt"

STAGE='validate-worktree-denominator'
mapfile -d '' -t WORKTREE_PATHS < <(collect_worktree_paths)
printf '%s\n' "${WORKTREE_PATHS[@]}" > "$RECEIPT_DIR/worktree-paths.txt"
if [[ "${#WORKTREE_PATHS[@]}" -eq 0 ]]; then
  OUTCOME='no_changes'
  REMOTE_CLEANUP='not_needed'
  STAGE='complete'
  exit 0
fi
assert_paths_allowed 'worktree' "${WORKTREE_PATHS[@]}"
git diff --check

STAGE='construct-direct-child-candidate'
git config user.name "clifford-${SLUG}-bot"
git config user.email "clifford-${SLUG}-bot@users.noreply.github.com"
git add --all -- "${ALLOWED_ROOTS[@]}"
git diff --cached --check
git diff --cached --quiet && {
  OUTCOME='no_changes'
  REMOTE_CLEANUP='not_needed'
  STAGE='complete'
  exit 0
}
git commit -m "$COMMIT_MESSAGE"
CANDIDATE_SHA="$(git rev-parse HEAD)"
test "$(git rev-parse "$CANDIDATE_SHA^")" = "$BASE_SHA"
test -z "$(git status --porcelain)"
mapfile -d '' -t COMMIT_PATHS < <(collect_commit_paths "$CANDIDATE_SHA")
printf '%s\n' "${COMMIT_PATHS[@]}" > "$RECEIPT_DIR/commit-paths.txt"
test "${#COMMIT_PATHS[@]}" -gt 0
assert_paths_allowed 'candidate commit' "${COMMIT_PATHS[@]}"
printf 'candidate_sha=%s\ncandidate_tree=%s\n' \
  "$CANDIDATE_SHA" "$(git rev-parse "$CANDIDATE_SHA^{tree}")" > "$RECEIPT_DIR/candidate.txt"

STAGE='refuse-duplicate-pending-candidate'
# Retain this local acquisition in the recovery bundle without publishing a
# second crawler PR while an existing candidate still requires disposition.
gh api --paginate --slurp "repos/$REPO/pulls?state=open&base=main&per_page=100" \
  > "$RECEIPT_DIR/open-pull-requests.json"
OPEN_CRAWLER_COUNT="$(jq -er --arg repo "$REPO" \
  '[.[][] | select(.state == "open" and .base.ref == "main" and .head.repo.full_name == $repo and (.head.ref | test("^automation-crawl-(industrial-exhaust|official-record)-run-[0-9]+-[0-9]+$")))] | length' \
  "$RECEIPT_DIR/open-pull-requests.json")"
if [[ "$OPEN_CRAWLER_COUNT" -gt 0 ]]; then
  OUTCOME='blocked_by_open_crawler_candidate'
  echo 'An open crawler candidate requires disposition before another PR can be published.' >&2
  exit 1
fi

STAGE='publish-run-scoped-candidate'
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$BASE_SHA"
if gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" \
  > "$RECEIPT_DIR/preexisting-candidate.json" 2> "$RECEIPT_DIR/preexisting-candidate.stderr"; then
  echo "candidate branch already exists: $CANDIDATE_BRANCH" >&2
  exit 1
fi
git push origin "$CANDIDATE_SHA:refs/heads/$CANDIDATE_BRANCH"
PUBLISHED_CANDIDATE='true'
test "$(gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha)" = "$CANDIDATE_SHA"

STAGE='open-ordinary-pull-request'
PR_PAYLOAD="$(jq -n \
  --arg title "$PR_TITLE" \
  --arg body "$PR_BODY" \
  --arg head "$CANDIDATE_BRANCH" \
  '{title: $title, body: $body, head: $head, base: "main", draft: false}')"
gh api --method POST "repos/$REPO/pulls" --input - <<< "$PR_PAYLOAD" \
  > "$RECEIPT_DIR/pull-request-created.json"
PR_NUMBER="$(jq -r .number "$RECEIPT_DIR/pull-request-created.json")"
test "$PR_NUMBER" != 'null'
test "$(jq -r .head.sha "$RECEIPT_DIR/pull-request-created.json")" = "$CANDIDATE_SHA"
test "$(jq -r .base.sha "$RECEIPT_DIR/pull-request-created.json")" = "$BASE_SHA"

STAGE='verify-remote-denominator'
# Read the published object back. If it is not exactly the leased one-commit,
# two-root candidate, the failure path withdraws it; otherwise it stays open.
test "$(gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha)" = "$CANDIDATE_SHA"
gh api "repos/$REPO/pulls/$PR_NUMBER" > "$RECEIPT_DIR/pull-request-final.json"
jq -e --arg head "$CANDIDATE_SHA" --arg base "$BASE_SHA" \
  '.state == "open" and .draft == false and .merged == false and .head.sha == $head and .base.sha == $base' \
  "$RECEIPT_DIR/pull-request-final.json" >/dev/null
gh api "repos/$REPO/compare/$BASE_SHA...$CANDIDATE_SHA" > "$RECEIPT_DIR/compare-final.json"
jq -e '.status == "ahead" and .ahead_by == 1 and .behind_by == 0 and .total_commits == 1' \
  "$RECEIPT_DIR/compare-final.json" >/dev/null
mapfile -t REMOTE_PATHS < <(jq -r '.files[] | .filename, (.previous_filename // empty)' "$RECEIPT_DIR/compare-final.json" | sort -u)
printf '%s\n' "${REMOTE_PATHS[@]}" > "$RECEIPT_DIR/remote-paths.txt"
test "${#REMOTE_PATHS[@]}" -gt 0
assert_paths_allowed 'remote comparison' "${REMOTE_PATHS[@]}"

OUTCOME='pull_request_opened'
STAGE='complete'
printf 'The pull request is open for maintainer review: %s\n' \
  "$(jq -r .html_url "$RECEIPT_DIR/pull-request-final.json")"
