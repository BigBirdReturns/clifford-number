#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
SOURCE_REF='archive/ssc-rd01-wave03-authoritative-finalizer-receipt'
SOURCE_PATH='reports/transport/ssc-rd01-wave03-authoritative-finalizer-latest'
TAG_REF='ssc-rd01-wave03-composed-ready-v1'
CONNECTOR_BRANCH='agent/ssc-rd01-wave03-composed-connector-v1'
TARGET_BRANCH='agent/ssc-rd-wave03-rd01-methodology-correction'
RECEIPT='/tmp/ssc-rd01-wave03-workflow-handoff-receipt'
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

STAGE='wait-authoritative-receipt'
for _ in $(seq 1 60); do
  git fetch --no-tags origin "$SOURCE_REF" >/dev/null 2>&1 || true
  if git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt" 2>/dev/null; then
    git show "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt" > "$RECEIPT/source-checkpoint.txt"
    break
  fi
  sleep 10
done
test -s "$RECEIPT/source-checkpoint.txt"

STATUS=$(awk -F': ' '$1=="status" {print $2}' "$RECEIPT/source-checkpoint.txt")
SOURCE_STAGE=$(awk -F': ' '$1=="stage" {print $2}' "$RECEIPT/source-checkpoint.txt")
printf 'source_status=%s\nsource_stage=%s\n' "$STATUS" "$SOURCE_STAGE" > "$RECEIPT/source-state.txt"

if [[ "$STATUS" = 'complete' ]]; then
  STAGE='complete-authoritative-finalizer-already-complete'
  exit 0
fi

STAGE='resolve-composed-commit'
for file in connector-handoff.txt leases.txt; do
  if git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/$file" 2>/dev/null; then
    git show "origin/$SOURCE_REF:$SOURCE_PATH/$file" > "$RECEIPT/$file"
  fi
done
COMPOSED=''
if [[ -s "$RECEIPT/connector-handoff.txt" ]]; then
  COMPOSED=$(awk -F= '$1=="connector_handoff_sha" {print $2}' "$RECEIPT/connector-handoff.txt")
fi
if [[ -z "$COMPOSED" && -s "$RECEIPT/leases.txt" ]]; then
  COMPOSED=$(awk -F= '$1=="composed_commit" {print $2}' "$RECEIPT/leases.txt" | tail -1)
fi
test "$COMPOSED" != ''
test "${#COMPOSED}" -eq 40
gh api "repos/$REPO/git/commits/$COMPOSED" > "$RECEIPT/composed-commit.json"
test "$(jq -r .sha "$RECEIPT/composed-commit.json")" = "$COMPOSED"
printf 'composed_commit=%s\n' "$COMPOSED" > "$RECEIPT/handoff.txt"

STAGE='publish-fixed-composed-tag'
TAG_SHA=$(gh api "repos/$REPO/git/ref/tags/$TAG_REF" --jq .object.sha 2>/dev/null || true)
if [[ -z "$TAG_SHA" ]]; then
  gh api --method POST "repos/$REPO/git/refs" -f ref="refs/tags/$TAG_REF" -f sha="$COMPOSED" > "$RECEIPT/tag-create.json"
elif [[ "$TAG_SHA" != "$COMPOSED" ]]; then
  gh api --method PATCH "repos/$REPO/git/refs/tags/$TAG_REF" -f sha="$COMPOSED" -F force=true > "$RECEIPT/tag-update.json"
fi
test "$(gh api "repos/$REPO/git/ref/tags/$TAG_REF" --jq .object.sha)" = "$COMPOSED"

STAGE='wait-connector-branch'
for _ in $(seq 1 120); do
  BRANCH_SHA=$(gh api "repos/$REPO/git/ref/heads/$CONNECTOR_BRANCH" --jq .object.sha 2>/dev/null || true)
  if [[ "$BRANCH_SHA" = "$COMPOSED" ]]; then break; fi
  if [[ -n "$BRANCH_SHA" && "$BRANCH_SHA" != "$COMPOSED" ]]; then
    echo "connector branch points to unexpected SHA: $BRANCH_SHA" >&2
    exit 1
  fi
  sleep 10
done
test "${BRANCH_SHA:-}" = "$COMPOSED"
printf 'connector_branch=%s\n' "$CONNECTOR_BRANCH" >> "$RECEIPT/handoff.txt"

STAGE='advance-permanent-target-from-connector-object'
TARGET_SHA=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
if [[ "$TARGET_SHA" != "$COMPOSED" ]]; then
  if ! gh api --method PATCH "repos/$REPO/git/refs/heads/$TARGET_BRANCH" -f sha="$COMPOSED" -F force=false > "$RECEIPT/target-update.json" 2> "$RECEIPT/target-update.stderr"; then
    PR_NUMBER=$(gh pr list --repo "$REPO" --state open --base "$TARGET_BRANCH" --head "$CONNECTOR_BRANCH" --json number --jq '.[0].number // empty')
    if [[ -z "$PR_NUMBER" ]]; then
      PR_URL=$(gh pr create --repo "$REPO" --base "$TARGET_BRANCH" --head "$CONNECTOR_BRANCH" --title 'TEMP: compose exact RD-01 terminal workflow object' --body 'Connector-authored one-commit workflow composition. Merge only after exact object verification; no evidence or authority change.')
      PR_NUMBER=${PR_URL##*/}
    fi
    printf 'composition_pr=%s\n' "$PR_NUMBER" >> "$RECEIPT/handoff.txt"
    gh pr merge "$PR_NUMBER" --repo "$REPO" --merge --delete-branch=false
  fi
fi
FINAL_TARGET=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
if [[ "$FINAL_TARGET" != "$COMPOSED" ]]; then
  git fetch --no-tags origin "$FINAL_TARGET" "$COMPOSED"
  test "$(git rev-parse "$FINAL_TARGET^{tree}")" = "$(git rev-parse "$COMPOSED^{tree}")"
fi
printf 'final_target=%s\n' "$FINAL_TARGET" >> "$RECEIPT/handoff.txt"

STAGE='complete'
