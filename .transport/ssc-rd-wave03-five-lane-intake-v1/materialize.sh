#!/usr/bin/env bash
set -Eeuo pipefail

RECEIPT_DIR="$RUNNER_TEMP/receipts"
RECEIPT="$RECEIPT_DIR/${LANE}-intake-materializer.json"
mkdir -p "$RECEIPT_DIR"
STATUS=failed
NEW_HEAD=""
MAIN_OBSERVED=""
FAILURE_STAGE=initializing

write_receipt() {
  local rc="$1"
  RECEIPT="$RECEIPT" STATUS="$STATUS" NEW_HEAD="$NEW_HEAD" MAIN_OBSERVED="$MAIN_OBSERVED" FAILURE_STAGE="$FAILURE_STAGE" RC="$rc" \
    LANE="$LANE" TARGET_BRANCH="$TARGET_BRANCH" EXPECTED_HEAD="$EXPECTED_HEAD" \
    EXPECTED_TOTAL_PATHS="$EXPECTED_TOTAL_PATHS" EXPECTED_NONWORKFLOW_PATHS="$EXPECTED_NONWORKFLOW_PATHS" \
    python - <<'PY'
import json, os
from pathlib import Path
payload = {
    "schema_version": "ssc-rd-wave03-five-lane-intake-materializer-receipt@1",
    "lane": os.environ["LANE"],
    "target_branch": os.environ["TARGET_BRANCH"],
    "expected_parent_head": os.environ["EXPECTED_HEAD"],
    "status": os.environ["STATUS"],
    "failure_stage": os.environ["FAILURE_STAGE"],
    "exit_code": int(os.environ["RC"]),
    "main_observed": os.environ.get("MAIN_OBSERVED") or None,
    "published_head": os.environ.get("NEW_HEAD") or None,
    "expected_total_paths": int(os.environ["EXPECTED_TOTAL_PATHS"]),
    "published_nonworkflow_paths": int(os.environ["EXPECTED_NONWORKFLOW_PATHS"]),
    "standing_workflow_composition_pending": os.environ["STATUS"] == "success",
    "class_closed": False,
    "outside_human_dependency": False,
    "external_contacts": 0,
    "external_reviews": 0,
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none"
}
Path(os.environ["RECEIPT"]).write_text(json.dumps(payload, indent=2) + "\n")
PY
}
finish() {
  rc=$?
  trap - EXIT
  write_receipt "$rc"
  exit "$rc"
}
trap finish EXIT

FAILURE_STAGE=verify_carrier_shards
TRANSPORT=.transport/ssc-rd-wave03-five-lane-intake-v1
WORK="$RUNNER_TEMP/w03-five-lane-${LANE,,}"
PRODUCT_ROOT="$RUNNER_TEMP/product"
rm -rf "$WORK" "$PRODUCT_ROOT"
mkdir -p "$WORK/carrier" "$PRODUCT_ROOT"

expected_shas=(
  0c470210382136ed07c3763152a4b7c26f0f6fb3cb9ba2accbe3afa9fb78f692
  f2df75b0c4a44b7da58f1171d96703ea063ed4faa55d666479626ddbc42baffa
  d86b20661282fe5d7d25858a3c08cc081e5065d1da9e6c6ff0347de8e307ad0f
  8236e42e007b42b41f62be83025021bdbe68ed1bea645b3b855e9c0c5096b798
  b338fe9fc66a317b922f758e6471b82b59ea90410a14eb56bd88513ee16109e4
  a51315d0fecec405238ed9a542e6f14df6e6b004ac43a3b76b85ede873d2eccc
  0600d9ff318cb49717dd3e66ccd45885a33267056c864154a9b8adfb3c506a4b
  84a5f33a717e906ad38a7a4318c54410f9c30bdcbab0048089adf16b5ba420d3
)
expected_sizes=(4096 4096 4096 4096 4096 4096 4096 3712)
: > "$WORK/product.b64"
for i in $(seq 0 7); do
  p=$(printf '%02d' "$i")
  src="$TRANSPORT/part-$p.b64"
  normalized="$WORK/carrier/part-$p.b64"
  test -f "$src"
  tr -d '\r\n' < "$src" > "$normalized"
  test "$(wc -c < "$normalized")" -eq "${expected_sizes[$i]}"
  echo "${expected_shas[$i]}  $normalized" | sha256sum -c -
  cat "$normalized" >> "$WORK/product.b64"
done
echo "$BASE64_SHA256  $WORK/product.b64" | sha256sum -c -
base64 --decode "$WORK/product.b64" > "$WORK/product.tar.xz"
echo "$PRODUCT_SHA256  $WORK/product.tar.xz" | sha256sum -c -
tar -tf "$WORK/product.tar.xz" > "$WORK/all-paths.txt"
test "$(wc -l < "$WORK/all-paths.txt")" -eq 37
echo "$PATH_LIST_SHA256  $WORK/all-paths.txt" | sha256sum -c -
tar -xJf "$WORK/product.tar.xz" -C "$PRODUCT_ROOT"

FAILURE_STAGE=derive_exact_lane_paths
grep -F "$SLUG" "$WORK/all-paths.txt" | sort > "$WORK/lane-all.txt"
test "$(wc -l < "$WORK/lane-all.txt")" -eq "$EXPECTED_TOTAL_PATHS"
grep -v '^\.github/workflows/' "$WORK/lane-all.txt" > "$WORK/lane-nonworkflow.txt"
test "$(wc -l < "$WORK/lane-nonworkflow.txt")" -eq "$EXPECTED_NONWORKFLOW_PATHS"
grep '^\.github/workflows/' "$WORK/lane-all.txt" > "$WORK/lane-workflow.txt"
test "$(wc -l < "$WORK/lane-workflow.txt")" -eq 1

FAILURE_STAGE=verify_branch_and_main_leases
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main" "+refs/heads/$TARGET_BRANCH:refs/remotes/origin/$TARGET_BRANCH"
MAIN_OBSERVED=$(git rev-parse origin/main)
test "$(git rev-parse "origin/$TARGET_BRANCH")" = "$EXPECTED_HEAD"
git merge-base --is-ancestor "$MAIN_ANCESTOR" origin/main
while IFS= read -r p; do
  if git cat-file -e "origin/main:$p" 2>/dev/null; then
    echo "Current main already contains candidate path: $p" >&2
    exit 1
  fi
  if git cat-file -e "origin/$TARGET_BRANCH:$p" 2>/dev/null; then
    echo "Target already contains candidate path: $p" >&2
    exit 1
  fi
done < "$WORK/lane-all.txt"

FAILURE_STAGE=materialize_exact_nonworkflow_paths
git worktree add --detach "$WORK/repo" "origin/$TARGET_BRANCH"
cd "$WORK/repo"
while IFS= read -r p; do
  mkdir -p "$(dirname "$p")"
  cp "$PRODUCT_ROOT/$p" "$p"
  git add -- "$p"
done < "$WORK/lane-nonworkflow.txt"
git diff --cached --name-only | sort > "$WORK/staged.txt"
diff -u "$WORK/lane-nonworkflow.txt" "$WORK/staged.txt"
git diff --cached --check
git commit -m "Freeze ${LANE} Wave-03 fixed intake protocol"
NEW_HEAD=$(git rev-parse HEAD)

FAILURE_STAGE=focused_qualification
node "$BUILDER"
node "$VALIDATOR"
node "$TEST_FILE"
git diff --exit-code
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js

FAILURE_STAGE=complete_release_gate
npm run release:check
git reset --hard HEAD
git clean -fd

FAILURE_STAGE=deterministic_replay
node "$BUILDER"
node "$VALIDATOR"
node "$TEST_FILE"
git diff --exit-code
test "$(git rev-parse HEAD)" = "$NEW_HEAD"

FAILURE_STAGE=final_lease_recheck
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main" "+refs/heads/$TARGET_BRANCH:refs/remotes/origin/$TARGET_BRANCH"
MAIN_OBSERVED=$(git rev-parse origin/main)
test "$(git rev-parse "origin/$TARGET_BRANCH")" = "$EXPECTED_HEAD"
git merge-base --is-ancestor "$MAIN_ANCESTOR" origin/main
while IFS= read -r p; do
  if git cat-file -e "origin/main:$p" 2>/dev/null; then
    echo "Current main gained candidate path: $p" >&2
    exit 1
  fi
done < "$WORK/lane-all.txt"

FAILURE_STAGE=lease_bound_push
git push origin "HEAD:refs/heads/$TARGET_BRANCH" \
  --force-with-lease="refs/heads/$TARGET_BRANCH:$EXPECTED_HEAD"

STATUS=success
FAILURE_STAGE=complete
