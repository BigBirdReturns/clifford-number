#!/usr/bin/env bash
set -Eeuo pipefail

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
RELEASE_RUN_ID=''
NO_MAGIC_RUN_ID=''
MERGE_SHA=''
MERGED='false'
REMOTE_CLEANUP='not_needed'
PUBLISHED_CANDIDATE='false'
PRESERVE_CANDIDATE='false'
NATIVE_ADMISSION='not_observed'
NATIVE_ADMISSION_ATTEMPTS=0
NATIVE_ADMISSION_POLLS="${NATIVE_ADMISSION_POLLS:-120}"
NATIVE_ADMISSION_POLL_SECONDS="${NATIVE_ADMISSION_POLL_SECONDS:-15}"
[[ "$NATIVE_ADMISSION_POLLS" =~ ^[1-9][0-9]*$ ]]
[[ "$NATIVE_ADMISSION_POLL_SECONDS" =~ ^[1-9][0-9]*$ ]]

case "$PROMOTION_KIND" in
  industrial-exhaust)
    SLUG='industrial-exhaust'
    ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')
    COMMIT_MESSAGE="crawl: first-party industrial exhaust ($(date -u +%F))"
    PR_TITLE="$COMMIT_MESSAGE"
    PR_BODY=$(cat <<'BODY'
This automated pull request contains only immutable first-party industrial-exhaust intake and retained source receipts produced by the scheduled crawler. The actors are the scheduled intake workflow, the exact leased main commit, the run-scoped candidate branch, the Release checks workflow, the No magic human gate workflow, and GitHub's ordinary pull-request merge API.

The mechanism refuses main drift, rejects every path outside `data/exhaust/**` and `receipts/exhaust/**`, publishes one direct-child candidate commit, explicitly dispatches both required checks on that exact candidate SHA, revalidates the remote comparison and pull-request head, and merges only while main remains at the leased base. This object does not admit a graph edge, claim, score, case, identity, or conclusion.

The wider control purpose is to preserve scheduled acquisition after main receives deletion refusal, non-fast-forward refusal, required pull requests, and stable required checks without granting GitHub Actions a broad direct-main bypass. Does the exact run-scoped candidate pass both required gates and preserve the two-root intake denominator before ordinary merge?
BODY
)
    ;;
  official-record)
    SLUG='official-record'
    ALLOWED_ROOTS=('data/crawl' 'receipts/crawl')
    COMMIT_MESSAGE="crawl: official-record intake ($(date -u +%F))"
    PR_TITLE="$COMMIT_MESSAGE"
    PR_BODY=$(cat <<'BODY'
This automated pull request contains only neutral official-record observations, candidates, rejections, crawl state, and retained crawl receipts produced by the scheduled intake workflow. The actors are the scheduled official-record crawler, the exact leased main commit, the run-scoped candidate branch, the Release checks workflow, the No magic human gate workflow, and GitHub's ordinary pull-request merge API.

The mechanism refuses main drift, rejects every path outside `data/crawl/**` and `receipts/crawl/**`, publishes one direct-child candidate commit, explicitly dispatches both required checks on that exact candidate SHA, revalidates the remote comparison and pull-request head, and merges only while main remains at the leased base. This object remains below canonical graph, case, identity, score, claim, and conclusion authority.

The wider control purpose is to preserve scheduled acquisition after main receives deletion refusal, non-fast-forward refusal, required pull requests, and stable required checks without granting GitHub Actions a broad direct-main bypass. Does the exact run-scoped candidate pass both required gates and preserve the two-root intake denominator before ordinary merge?
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
    printf 'release_run_id=%s\n' "$RELEASE_RUN_ID"
    printf 'no_magic_run_id=%s\n' "$NO_MAGIC_RUN_ID"
    printf 'merged=%s\n' "$MERGED"
    printf 'merge_sha=%s\n' "$MERGE_SHA"
    printf 'remote_cleanup=%s\n' "$REMOTE_CLEANUP"
    printf 'native_admission=%s\n' "$NATIVE_ADMISSION"
    printf 'native_admission_attempts=%s\n' "$NATIVE_ADMISSION_ATTEMPTS"
    printf 'native_admission_poll_limit=%s\n' "$NATIVE_ADMISSION_POLLS"
    printf 'candidate_preserved=%s\n' "$PRESERVE_CANDIDATE"
    printf 'time_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$RECEIPT_DIR/checkpoint.txt"
}

safe_remote_cleanup() {
  local cleanup_errors=0
  REMOTE_CLEANUP='attempted'

  if [[ "$MERGED" != 'true' && -n "$PR_NUMBER" ]]; then
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
    if [[ "$PRESERVE_CANDIDATE" == 'true' ]]; then
      REMOTE_CLEANUP='preserved_pending_native_admission'
    else
      safe_remote_cleanup || true
    fi
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

wait_for_dispatched_run() {
  local workflow_file="$1"
  local output_file="$2"
  local run_id=''
  local payload=''

  for _ in $(seq 1 60); do
    payload="$(gh api --method GET "repos/$REPO/actions/workflows/$workflow_file/runs" \
      -f branch="$CANDIDATE_BRANCH" \
      -f event='workflow_dispatch' \
      -f per_page=100)"
    run_id="$(jq -r --arg sha "$CANDIDATE_SHA" \
      '[.workflow_runs[] | select(.head_sha == $sha and .event == "workflow_dispatch")] | sort_by(.id) | last | .id // empty' \
      <<< "$payload")"
    if [[ -n "$run_id" ]]; then
      printf '%s\n' "$payload" > "$output_file"
      printf '%s\n' "$run_id"
      return 0
    fi
    sleep 5
  done

  echo "dispatched run did not appear for $workflow_file at $CANDIDATE_SHA" >&2
  return 1
}

wait_for_run_success() {
  local run_id="$1"
  local label="$2"
  local output_file="$3"
  local payload=''
  local status=''
  local conclusion=''

  for _ in $(seq 1 360); do
    payload="$(gh api "repos/$REPO/actions/runs/$run_id")"
    status="$(jq -r .status <<< "$payload")"
    if [[ "$status" == 'completed' ]]; then
      printf '%s\n' "$payload" > "$output_file"
      conclusion="$(jq -r .conclusion <<< "$payload")"
      if [[ "$conclusion" != 'success' ]]; then
        echo "$label run $run_id concluded $conclusion" >&2
        return 1
      fi
      return 0
    fi
    sleep 10
  done

  echo "$label run $run_id did not complete inside the bounded polling window" >&2
  return 1
}

assert_check_success() {
  local check_name="$1"
  local checks_file="$2"
  local run_id="$3"
  local run_payload suite_id payload

  run_payload="$(gh api "repos/$REPO/actions/runs/$run_id")"
  jq -e --arg sha "$CANDIDATE_SHA" --arg branch "$CANDIDATE_BRANCH" \
    '.head_sha == $sha and .head_branch == $branch and .event == "workflow_dispatch" and .status == "completed" and .conclusion == "success"' \
    <<< "$run_payload" >/dev/null
  suite_id="$(jq -er .check_suite_id <<< "$run_payload")"
  payload="$(gh api -H 'Accept: application/vnd.github+json' \
    "repos/$REPO/commits/$CANDIDATE_SHA/check-runs?per_page=100")"
  printf '%s\n' "$payload" > "$checks_file"
  jq -e --arg name "$check_name" --arg sha "$CANDIDATE_SHA" --argjson suite "$suite_id" \
    '[.check_runs[] | select(.name == $name and .head_sha == $sha and .app.id == 15368 and .check_suite.id == $suite and .status == "completed" and .conclusion == "success")] | length == 1' \
    <<< "$payload" >/dev/null
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
  echo 'An open scheduled crawler candidate requires disposition before another PR can be published.' >&2
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

STAGE='dispatch-required-checks'
gh api --method POST "repos/$REPO/actions/workflows/ci.yml/dispatches" \
  -f ref="$CANDIDATE_BRANCH"
gh api --method POST "repos/$REPO/actions/workflows/no-magic-human-gate.yml/dispatches" \
  -f ref="$CANDIDATE_BRANCH"

STAGE='bind-dispatched-runs'
RELEASE_RUN_ID="$(wait_for_dispatched_run 'ci.yml' "$RECEIPT_DIR/release-runs.json")"
NO_MAGIC_RUN_ID="$(wait_for_dispatched_run 'no-magic-human-gate.yml' "$RECEIPT_DIR/no-magic-runs.json")"
printf 'release_run_id=%s\nno_magic_run_id=%s\n' \
  "$RELEASE_RUN_ID" "$NO_MAGIC_RUN_ID" > "$RECEIPT_DIR/dispatched-runs.txt"

STAGE='qualify-exact-candidate'
wait_for_run_success "$RELEASE_RUN_ID" 'Release checks' "$RECEIPT_DIR/release-run-final.json"
wait_for_run_success "$NO_MAGIC_RUN_ID" 'No magic human gate' "$RECEIPT_DIR/no-magic-run-final.json"
assert_check_success 'release-check' "$RECEIPT_DIR/release-check-runs.json" "$RELEASE_RUN_ID"
assert_check_success 'no-magic-human-gate' "$RECEIPT_DIR/no-magic-check-runs.json" "$NO_MAGIC_RUN_ID"

STAGE='revalidate-lease-and-remote-denominator'
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" = "$BASE_SHA"
test "$(gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha)" = "$CANDIDATE_SHA"
gh api "repos/$REPO/pulls/$PR_NUMBER" > "$RECEIPT_DIR/pull-request-premerge.json"
test "$(jq -r .state "$RECEIPT_DIR/pull-request-premerge.json")" = 'open'
test "$(jq -r .head.sha "$RECEIPT_DIR/pull-request-premerge.json")" = "$CANDIDATE_SHA"
test "$(jq -r .base.sha "$RECEIPT_DIR/pull-request-premerge.json")" = "$BASE_SHA"
gh api "repos/$REPO/compare/$BASE_SHA...$CANDIDATE_SHA" > "$RECEIPT_DIR/compare-premerge.json"
jq -e '.status == "ahead" and .ahead_by == 1 and .behind_by == 0 and .total_commits == 1' \
  "$RECEIPT_DIR/compare-premerge.json" >/dev/null
mapfile -t REMOTE_PATHS < <(jq -r '.files[] | .filename, (.previous_filename // empty)' "$RECEIPT_DIR/compare-premerge.json" | sort -u)
printf '%s\n' "${REMOTE_PATHS[@]}" > "$RECEIPT_DIR/remote-paths.txt"
test "${#REMOTE_PATHS[@]}" -gt 0
assert_paths_allowed 'remote comparison' "${REMOTE_PATHS[@]}"

STAGE='inspect-native-pr-admission'
# Dispatch success cannot substitute for an approval-gated PR workflow. Keep
# the originating job alive for a bounded approval window, then preserve the
# exact PR and branch for the separate resumption workflow if approval is late.
PRESERVE_CANDIDATE='true'
OUTCOME='awaiting_native_pr_admission'
: > "$RECEIPT_DIR/native-admission-timeline.jsonl"
for ((attempt = 1; attempt <= NATIVE_ADMISSION_POLLS; attempt++)); do
  NATIVE_ADMISSION_ATTEMPTS="$attempt"
  node .github/scripts/inspect-scheduled-crawl-admission.mjs \
    "$REPO" "$PR_NUMBER" "$BASE_SHA" "$CANDIDATE_SHA" "$CANDIDATE_BRANCH" \
    > "$RECEIPT_DIR/native-admission.json"
  NATIVE_ADMISSION="$(jq -er .decision "$RECEIPT_DIR/native-admission.json")"
  jq -c --argjson poll "$attempt" --arg observed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '. + {poll: $poll, observed_at: $observed_at}' "$RECEIPT_DIR/native-admission.json" \
    >> "$RECEIPT_DIR/native-admission-timeline.jsonl"
  case "$NATIVE_ADMISSION" in
    ready)
      OUTCOME='native_admission_ready'
      break
      ;;
    failed)
      PRESERVE_CANDIDATE='false'
      OUTCOME='failed_closed'
      exit 1
      ;;
    pending|awaiting_approval)
      if [[ "$attempt" -eq "$NATIVE_ADMISSION_POLLS" ]]; then
        echo "Native PR admission remained $NATIVE_ADMISSION after $attempt bounded observations; preserving PR $PR_NUMBER." >&2
        exit 1
      fi
      sleep "$NATIVE_ADMISSION_POLL_SECONDS"
      ;;
    *)
      echo "Native PR admission is $NATIVE_ADMISSION; preserving PR $PR_NUMBER for adjudication." >&2
      exit 1
      ;;
  esac
done

# Native inspection takes time. Re-read mutable leases before the merge call.
test "$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)" = "$BASE_SHA"
test "$(gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha)" = "$CANDIDATE_SHA"
gh api "repos/$REPO/pulls/$PR_NUMBER" > "$RECEIPT_DIR/pull-request-admission-final.json"
jq -e --arg head "$CANDIDATE_SHA" --arg base "$BASE_SHA" \
  '.state == "open" and .draft == false and .merged == false and .head.sha == $head and .base.sha == $base' \
  "$RECEIPT_DIR/pull-request-admission-final.json" >/dev/null

STAGE='merge-qualified-pull-request'
MERGE_PAYLOAD="$(jq -n \
  --arg title "$PR_TITLE" \
  --arg message "Qualified scheduled intake from $CANDIDATE_BRANCH at $CANDIDATE_SHA." \
  --arg sha "$CANDIDATE_SHA" \
  '{commit_title: $title, commit_message: $message, sha: $sha, merge_method: "merge"}')"
gh api --method PUT "repos/$REPO/pulls/$PR_NUMBER/merge" --input - <<< "$MERGE_PAYLOAD" \
  > "$RECEIPT_DIR/merge.json"
test "$(jq -r .merged "$RECEIPT_DIR/merge.json")" = 'true'
MERGE_SHA="$(jq -r .sha "$RECEIPT_DIR/merge.json")"
test "$MERGE_SHA" != 'null'
MERGED='true'
PRESERVE_CANDIDATE='false'

STAGE='verify-merge-topology'
gh api "repos/$REPO/git/commits/$MERGE_SHA" > "$RECEIPT_DIR/merge-commit.json"
jq -e '.parents | length == 2' "$RECEIPT_DIR/merge-commit.json" >/dev/null
test "$(jq -r .tree.sha "$RECEIPT_DIR/merge-commit.json")" = "$(git rev-parse "$CANDIDATE_SHA^{tree}")"
test "$(jq -r '.parents[0].sha' "$RECEIPT_DIR/merge-commit.json")" = "$BASE_SHA"
test "$(jq -r '.parents[1].sha' "$RECEIPT_DIR/merge-commit.json")" = "$CANDIDATE_SHA"
git fetch --no-tags origin main
git merge-base --is-ancestor "$MERGE_SHA" origin/main

STAGE='retire-run-scoped-candidate'
test "$(gh api "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha)" = "$CANDIDATE_SHA"
git push --force-with-lease="refs/heads/$CANDIDATE_BRANCH:$CANDIDATE_SHA" \
  origin ":refs/heads/$CANDIDATE_BRANCH" > "$RECEIPT_DIR/delete-candidate.txt"
REMOTE_CLEANUP='complete'
OUTCOME='complete'
STAGE='complete'
