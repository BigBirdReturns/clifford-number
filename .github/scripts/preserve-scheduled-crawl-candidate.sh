#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
RUN_ID="${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"
PROMOTION_KIND="${PROMOTION_KIND:?PROMOTION_KIND is required}"
WORKSPACE="${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"
RECEIPT_DIR="${RUNNER_TEMP:-/tmp}/scheduled-crawl-promotion-receipt"
CHECKPOINT="${RECEIPT_DIR}/checkpoint.txt"

mkdir -p "$RECEIPT_DIR"

fail_recovery() {
  local message="$1"
  printf '%s\n' "$message" > "$RECEIPT_DIR/recovery-error.txt"
  echo "::error title=Scheduled crawl candidate preservation failed::$message"
  exit 1
}

[[ -f "$CHECKPOINT" ]] || fail_recovery "promotion checkpoint is missing"

checkpoint_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); value=$0 } END { print value }' "$CHECKPOINT"
}

STAGE="$(checkpoint_value stage)"
BASE_SHA="$(checkpoint_value base_sha)"
CANDIDATE_BRANCH="$(checkpoint_value candidate_branch)"
CANDIDATE_SHA="$(checkpoint_value candidate_sha)"
PR_NUMBER="$(checkpoint_value pull_request)"

if [[ "$STAGE" != 'open-ordinary-pull-request' || -n "$PR_NUMBER" ]]; then
  {
    printf 'recovery_applicable=false\n'
    printf 'stage=%s\n' "$STAGE"
    printf 'pull_request=%s\n' "$PR_NUMBER"
  } > "$RECEIPT_DIR/recovery-not-applicable.txt"
  exit 0
fi

case "$PROMOTION_KIND" in
  industrial-exhaust)
    SLUG='industrial-exhaust'
    ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')
    ;;
  official-record)
    SLUG='official-record'
    ALLOWED_ROOTS=('data/crawl' 'receipts/crawl')
    ;;
  *)
    fail_recovery "unsupported PROMOTION_KIND: $PROMOTION_KIND"
    ;;
esac

EXPECTED_BRANCH="automation-crawl-${SLUG}-run-${RUN_ID}-${RUN_ATTEMPT}"
[[ -n "$BASE_SHA" ]] || fail_recovery "checkpoint base SHA is missing"
[[ -n "$CANDIDATE_SHA" ]] || fail_recovery "checkpoint candidate SHA is missing"
[[ "$CANDIDATE_BRANCH" == "$EXPECTED_BRANCH" ]] \
  || fail_recovery "candidate branch lease mismatch: expected $EXPECTED_BRANCH observed $CANDIDATE_BRANCH"

cd "$WORKSPACE"
git cat-file -e "${CANDIDATE_SHA}^{commit}" \
  || fail_recovery "candidate commit is unavailable locally: $CANDIDATE_SHA"
[[ "$(git rev-parse HEAD)" == "$CANDIDATE_SHA" ]] \
  || fail_recovery "local HEAD no longer equals the checkpoint candidate"
[[ "$(git rev-parse "${CANDIDATE_SHA}^")" == "$BASE_SHA" ]] \
  || fail_recovery "candidate is not a direct child of the checkpoint base"

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

mapfile -d '' -t COMMIT_PATHS < <(
  git diff-tree --no-commit-id --name-only -r -z "$CANDIDATE_SHA" | sort -zu
)
[[ "${#COMMIT_PATHS[@]}" -gt 0 ]] || fail_recovery "candidate commit has no changed paths"
printf '%s\n' "${COMMIT_PATHS[@]}" > "$RECEIPT_DIR/recovery-candidate-paths.txt"
for path in "${COMMIT_PATHS[@]}"; do
  path_is_allowed "$path" || fail_recovery "candidate contains forbidden path: $path"
done

remote_candidate="$(
  gh api --method GET "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" \
    --jq .object.sha 2>/dev/null || true
)"
if [[ -n "$remote_candidate" && "$remote_candidate" != "$CANDIDATE_SHA" ]]; then
  fail_recovery "candidate ref moved: expected $CANDIDATE_SHA observed $remote_candidate"
fi

RECOVERY_ACTION='already_present'
if [[ -z "$remote_candidate" ]]; then
  git push origin "${CANDIDATE_SHA}:refs/heads/${CANDIDATE_BRANCH}"
  RECOVERY_ACTION='republished'
fi

remote_candidate="$(
  gh api --method GET "repos/$REPO/git/ref/heads/$CANDIDATE_BRANCH" --jq .object.sha
)"
[[ "$remote_candidate" == "$CANDIDATE_SHA" ]] \
  || fail_recovery "preserved branch does not resolve to the exact candidate"

OWNER="${REPO%%/*}"
EXISTING_PR="$(
  gh api --method GET "repos/$REPO/pulls" \
    -f state=open \
    -f head="${OWNER}:${CANDIDATE_BRANCH}" \
    --jq '.[0].number // empty'
)"

jq -n \
  --arg repository "$REPO" \
  --arg promotion_kind "$PROMOTION_KIND" \
  --arg run_id "$RUN_ID" \
  --arg run_attempt "$RUN_ATTEMPT" \
  --arg base_sha "$BASE_SHA" \
  --arg candidate_branch "$CANDIDATE_BRANCH" \
  --arg candidate_sha "$CANDIDATE_SHA" \
  --arg recovery_action "$RECOVERY_ACTION" \
  --arg pull_request "$EXISTING_PR" \
  '{
    recovery_branch_preserved: true,
    recovery_reason: "pull_request_creation_failed",
    repository: $repository,
    promotion_kind: $promotion_kind,
    run_id: $run_id,
    run_attempt: $run_attempt,
    base_sha: $base_sha,
    candidate_branch: $candidate_branch,
    candidate_sha: $candidate_sha,
    recovery_action: $recovery_action,
    pull_request: $pull_request
  }' > "$RECEIPT_DIR/recovery-branch.json"

{
  printf 'recovery_branch_preserved=true\n'
  printf 'recovery_reason=pull_request_creation_failed\n'
  printf 'recovery_branch_sha=%s\n' "$CANDIDATE_SHA"
  printf 'recovery_branch=%s\n' "$CANDIDATE_BRANCH"
  printf 'recovery_action=%s\n' "$RECOVERY_ACTION"
  printf 'recovery_pull_request=%s\n' "$EXISTING_PR"
} >> "$CHECKPOINT"

printf '%s\n' "$CANDIDATE_BRANCH" > "$RECEIPT_DIR/recovery-branch.txt"
echo "::error title=Scheduled crawl pull-request creation blocked::Exact candidate $CANDIDATE_SHA was preserved at $CANDIDATE_BRANCH for owner recovery; main was not mutated."
exit 0
