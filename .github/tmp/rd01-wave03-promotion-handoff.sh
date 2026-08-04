#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${GITHUB_REPOSITORY:?}"
SOURCE_REF='archive/ssc-rd01-wave03-promotion-materializer-receipt'
SOURCE_PATH='reports/transport/ssc-rd01-wave03-promotion-materializer-latest'
TARGET_BRANCH='agent/ssc-rd01-wave03-cumulative-promotion-v1'
CONNECTOR_BRANCH='agent/ssc-rd01-wave03-promotion-composed-connector-v1'
RECEIPT='/tmp/ssc-rd01-wave03-promotion-handoff-receipt'
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

STAGE='wait-materializer-receipt'
for _ in $(seq 1 120); do
  git fetch --no-tags origin "$SOURCE_REF" >/dev/null 2>&1 || true
  if git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt" 2>/dev/null; then break; fi
  sleep 10
done
git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/checkpoint.txt"
for file in checkpoint.txt lineage.txt connector-handoff.txt permanent-pr.txt approved-paths.txt; do
  if git cat-file -e "origin/$SOURCE_REF:$SOURCE_PATH/$file" 2>/dev/null; then
    git show "origin/$SOURCE_REF:$SOURCE_PATH/$file" > "$RECEIPT/$file"
  fi
done
STATUS=$(awk -F': ' '$1=="status" {print $2}' "$RECEIPT/checkpoint.txt")
SOURCE_STAGE=$(awk -F': ' '$1=="stage" {print $2}' "$RECEIPT/checkpoint.txt")
printf 'source_status=%s\nsource_stage=%s\n' "$STATUS" "$SOURCE_STAGE" > "$RECEIPT/source-state.txt"
test "$STATUS" = 'complete'

STAGE='resolve-exact-composed-object'
COMPOSED=$(awk -F= '$1=="composed_commit" {print $2}' "$RECEIPT/lineage.txt" | tail -1)
FULL_TREE=$(awk -F= '$1=="full_tree" {print $2}' "$RECEIPT/lineage.txt" | tail -1)
RUNNER_COMMIT=$(awk -F= '$1=="runner_commit" {print $2}' "$RECEIPT/lineage.txt" | tail -1)
test "${#COMPOSED}" -eq 40
test "${#FULL_TREE}" -eq 40
test "${#RUNNER_COMMIT}" -eq 40
gh api "repos/$REPO/git/commits/$COMPOSED" > "$RECEIPT/composed-commit.json"
test "$(jq -r .sha "$RECEIPT/composed-commit.json")" = "$COMPOSED"
test "$(jq -r .tree.sha "$RECEIPT/composed-commit.json")" = "$FULL_TREE"
test "$(jq -r .parents[0].sha "$RECEIPT/composed-commit.json")" = "$RUNNER_COMMIT"

STAGE='advance-target-if-needed'
TARGET_SHA=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
if [[ "$TARGET_SHA" != "$COMPOSED" ]]; then
  for _ in $(seq 1 120); do
    CONNECTOR_SHA=$(gh api "repos/$REPO/git/ref/heads/$CONNECTOR_BRANCH" --jq .object.sha 2>/dev/null || true)
    if [[ "$CONNECTOR_SHA" = "$COMPOSED" ]]; then break; fi
    if [[ -n "$CONNECTOR_SHA" && "$CONNECTOR_SHA" != "$COMPOSED" ]]; then
      echo "connector branch mismatch: $CONNECTOR_SHA" >&2
      exit 1
    fi
    sleep 10
  done
  test "${CONNECTOR_SHA:-}" = "$COMPOSED"
  if ! gh api --method PATCH "repos/$REPO/git/refs/heads/$TARGET_BRANCH" -f sha="$COMPOSED" -F force=false > "$RECEIPT/target-update.json" 2> "$RECEIPT/target-update.stderr"; then
    COMPOSITION_PR=$(gh pr list --repo "$REPO" --state open --base "$TARGET_BRANCH" --head "$CONNECTOR_BRANCH" --json number --jq '.[0].number // empty')
    if [[ -z "$COMPOSITION_PR" ]]; then
      URL=$(gh pr create --repo "$REPO" --base "$TARGET_BRANCH" --head "$CONNECTOR_BRANCH" --title 'TEMP: compose exact Wave-03 cumulative workflow' --body 'Connector-authored one-commit standing-workflow composition; exact tree is already qualified. No evidence or authority change.' )
      COMPOSITION_PR=${URL##*/}
    fi
    gh pr merge "$COMPOSITION_PR" --repo "$REPO" --merge --delete-branch=false
  fi
fi
FINAL_TARGET=$(gh api "repos/$REPO/git/ref/heads/$TARGET_BRANCH" --jq .object.sha)
if [[ "$FINAL_TARGET" != "$COMPOSED" ]]; then
  git fetch --no-tags origin "$FINAL_TARGET" "$COMPOSED"
  test "$(git rev-parse "$FINAL_TARGET^{tree}")" = "$FULL_TREE"
fi
printf 'composed_commit=%s\nfull_tree=%s\nfinal_target=%s\n' "$COMPOSED" "$FULL_TREE" "$FINAL_TARGET" > "$RECEIPT/final.txt"

STAGE='open-permanent-promotion-pr'
PERMANENT_PR=$(gh pr list --repo "$REPO" --state open --head "$TARGET_BRANCH" --json number --jq '.[0].number // empty')
if [[ -z "$PERMANENT_PR" ]]; then
  BODY=$(cat <<'EOF'
Promotes the canonically merged `RD-01-C06` terminal receipt into a new Wave-03 cumulative successor ledger without rewriting the historical six-closure Wave-02 object.

```text
canonical residual classes: 42
closed before / after:       6 / 7
open before / after:        36 / 35
Wave-03 selected attempts:    6
Wave-03 terminal receipts:    1
Wave-03 selected still open:  5
residual denominator complete:false
terminal state promoted:      bounded_source_unavailable
outside-human dependency:     false
external contacts/reviews:     0 / 0
publication/adoption/graph:    none / none / none
```

The permanent product is exactly nine addition-only paths: one source manifest, deterministic ledger, release manifest, closed schema, builder, validator, adversarial suite, milestone, and read-only workflow. The prior six-closure ledger remains immutable. Merge only after exact-head hosted qualification.
EOF
)
  URL=$(gh pr create --repo "$REPO" --base main --head "$TARGET_BRANCH" --title 'Promote RD-01 into the Wave-03 cumulative closure ledger' --body "$BODY" --draft)
  PERMANENT_PR=${URL##*/}
fi
printf 'permanent_pr=%s\n' "$PERMANENT_PR" >> "$RECEIPT/final.txt"
STAGE='complete'
