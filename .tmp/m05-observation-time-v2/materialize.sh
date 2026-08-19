#!/usr/bin/env bash
set -euo pipefail

BASE_SHA='46b2cb3bcd611f85c49088acc453fe81c32699a0'
BASE_TREE='dff78bb3d2b1c681bb8f4ea487e6be1d203b91d3'
PRODUCT_BRANCH='agent/m05-s03-l7-intel-realization-observation-time-custody-v2'
PAYLOAD_DIR='.tmp/m05-observation-time-v2'
ZIP_SHA256='ef1c6ae8b5190b085cf43f29014d7c696dc31f01e3b3dc9f9d5c9cf5ace26ee2'

CONTRACT='data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json'
VALIDATOR='tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs'
TEST='test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js'
WORKFLOW='.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml'
TARGETS=("$CONTRACT" "$VALIDATOR" "$TEST" "$WORKFLOW")

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cat "$PAYLOAD_DIR"/payload-*.b64 | base64 --decode > "$work/product.zip"
echo "$ZIP_SHA256  $work/product.zip" | sha256sum -c -
unzip -q "$work/product.zip" -d "$work/product"

check_file() {
  local rel="$1" expected_sha256="$2" expected_blob="$3"
  test -f "$work/product/$rel"
  echo "$expected_sha256  $work/product/$rel" | sha256sum -c -
  test "$(git hash-object "$work/product/$rel")" = "$expected_blob"
}
check_file "$CONTRACT" '73b08ac0e117451ed8ed18ee2d5568b91054bc85c118ad3620975371f0551aa7' '817f2b571c5f5feb755c6ac97226567630de5c38'
check_file "$VALIDATOR" '88bd94053359d1244ecc6e53afcc55c9aa0744978a4a19e727090112826b78db' 'e5c2afe704f1589816c6c242ba096430aac38d91'
check_file "$TEST" '2d22fb34b0127440944e7ecc6ecdbf93692c958220c25eeecb77a718655ba5a6' 'e04c076b0a764b77053db504b94606f3ced44c98'
check_file "$WORKFLOW" '57f3704f04c054d8211871b92e3d17dee0ce1be448e7b842043678fc61aa3828' 'd77e5a1a6a0bc2b22801d15850da5de177795641'

git fetch --no-tags origin main
actual_tree="$(git rev-parse "$BASE_SHA^{tree}")"
test "$actual_tree" = "$BASE_TREE"
for rel in "${TARGETS[@]}"; do
  if git cat-file -e "$BASE_SHA:$rel" 2>/dev/null; then
    echo "target already exists at leased base: $rel" >&2
    exit 1
  fi
  if git cat-file -e "origin/main:$rel" 2>/dev/null; then
    echo "target now exists on main: $rel" >&2
    exit 1
  fi
done
if git ls-remote --exit-code --heads origin "refs/heads/$PRODUCT_BRANCH" >/dev/null 2>&1; then
  git fetch --no-tags origin "$PRODUCT_BRANCH"
  existing_head="$(git rev-parse "origin/$PRODUCT_BRANCH")"
  test "$(git rev-parse "$existing_head^")" = "$BASE_SHA"
  test "$(git rev-parse "$existing_head:$CONTRACT")" = '817f2b571c5f5feb755c6ac97226567630de5c38'
  test "$(git rev-parse "$existing_head:$VALIDATOR")" = 'e5c2afe704f1589816c6c242ba096430aac38d91'
  test "$(git rev-parse "$existing_head:$TEST")" = 'e04c076b0a764b77053db504b94606f3ced44c98'
  test "$(git rev-parse "$existing_head:$WORKFLOW")" = 'd77e5a1a6a0bc2b22801d15850da5de177795641'
  printf 'product_branch=%s\nproduct_head=%s\nproduct_state=already_exact\n' "$PRODUCT_BRANCH" "$existing_head"
  exit 0
fi

git switch --detach "$BASE_SHA"
git switch -c "$PRODUCT_BRANCH"
for rel in "${TARGETS[@]}"; do
  mkdir -p "$(dirname "$rel")"
  cp "$work/product/$rel" "$rel"
done

node --check "$VALIDATOR"
node --check "$TEST"
node tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs
node test/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.test.js
node tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs
node test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js
node "$VALIDATOR"
node "$TEST"
npm run release:check
git restore --staged --worktree .
for rel in "${TARGETS[@]}"; do
  cp "$work/product/$rel" "$rel"
done

git add -- "${TARGETS[@]}"
mapfile -t staged < <(git diff --cached --name-only)
mapfile -t expected < <(printf '%s\n' "${TARGETS[@]}" | sort)
mapfile -t actual < <(printf '%s\n' "${staged[@]}" | sort)
test "${#actual[@]}" -eq 4
test "$(printf '%s\n' "${actual[@]}")" = "$(printf '%s\n' "${expected[@]}")"

git config user.name 'BigBirdReturns'
git config user.email 'bigbirdreturns@proton.me'
git commit -m '[M-05 S03-L7] Bind trusted observation-time custody'
head_sha="$(git rev-parse HEAD)"
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
git push origin "HEAD:refs/heads/$PRODUCT_BRANCH"
printf 'product_branch=%s\nproduct_head=%s\nproduct_tree=%s\n' "$PRODUCT_BRANCH" "$head_sha" "$(git rev-parse HEAD^{tree})"
