#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
SOURCE_REF='archive/ssc-rd01-wave03-verify-finalizer-receipt'
SOURCE_PATH='reports/transport/ssc-rd01-wave03-verify-finalizer-latest'
OUT='/tmp/ssc-rd01-wave03-result-classifier-receipt'
mkdir -p "$OUT"

for _ in $(seq 1 120); do
  git fetch --no-tags origin "$SOURCE_REF" >/dev/null 2>&1 || true
  if git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt" 2>/dev/null; then
    break
  fi
  sleep 10
done
git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt"
git show "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt" > "$OUT/checkpoint.txt"
for file in final.txt leases.txt pr.json hosted-checks.json pr-name-status.txt package-file-sha256.txt workflow.txt; do
  if git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/$file" 2>/dev/null; then
    git show "origin/$SOURCE_REF:$SOURCE_PATH/$file" > "$OUT/$file"
  fi
done
STATUS=$(awk -F': ' '$1=="status" {print $2}' "$OUT/checkpoint.txt")
STAGE=$(awk -F': ' '$1=="stage" {print $2}' "$OUT/checkpoint.txt")
printf 'status=%s\nstage=%s\n' "$STATUS" "$STAGE" > "$OUT/classification.txt"

if [[ "$STATUS" = 'complete' ]]; then
  PR=$(gh api "repos/$REPO/pulls/1022")
  test "$(jq -r .merged <<<"$PR")" = 'true'
  MERGE_SHA=$(jq -r .merge_commit_sha <<<"$PR")
  MAIN_SHA=$(gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha)
  git fetch --no-tags origin "$MAIN_SHA" "$MERGE_SHA"
  git merge-base --is-ancestor "$MERGE_SHA" "$MAIN_SHA"
  TAG='ssc-rd01-wave03-verified-complete'
  EXISTING=$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq .object.sha 2>/dev/null || true)
  if [[ -z "$EXISTING" ]]; then
    gh api --method POST "repos/$REPO/git/refs" -f ref="refs/tags/$TAG" -f sha="$MERGE_SHA" >/dev/null
  elif [[ "$EXISTING" != "$MERGE_SHA" ]]; then
    gh api --method PATCH "repos/$REPO/git/refs/tags/$TAG" -f sha="$MERGE_SHA" -F force=true >/dev/null
  fi
  printf 'merge_sha=%s\nmain_sha=%s\nmarker_tag=%s\n' "$MERGE_SHA" "$MAIN_SHA" "$TAG" >> "$OUT/classification.txt"
  gh issue comment 1014 --repo "$REPO" --body "Verification classifier: canonical RD-01-C06 terminal merge confirmed at \`$MERGE_SHA\`; marker tag \`$TAG\` published. Cumulative Wave-03 promotion remains separate." || true
else
  SAFE_STAGE=$(printf '%s' "$STAGE" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
  RECEIPT_SHA=$(git rev-parse "origin/$SOURCE_REF")
  TAG="ssc-rd01-wave03-verified-failed-${SAFE_STAGE:-unknown}"
  EXISTING=$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq .object.sha 2>/dev/null || true)
  if [[ -z "$EXISTING" ]]; then
    gh api --method POST "repos/$REPO/git/refs" -f ref="refs/tags/$TAG" -f sha="$RECEIPT_SHA" >/dev/null
  fi
  printf 'receipt_sha=%s\nmarker_tag=%s\n' "$RECEIPT_SHA" "$TAG" >> "$OUT/classification.txt"
  gh issue comment 1014 --repo "$REPO" --body "Verification classifier failed closed at stage \`$STAGE\`. Durable receipt: branch \`$SOURCE_REF\`, path \`$SOURCE_PATH\`. Marker tag: \`$TAG\`. No merge or cumulative promotion is authorized by this result." || true
fi
