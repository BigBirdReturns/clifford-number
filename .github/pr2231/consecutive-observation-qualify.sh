#!/usr/bin/env bash
set -euo pipefail
RECEIPT=/tmp/pr2231-consecutive-observation-qualification-v1.txt
WORK=/tmp/pr2231-consecutive-observation-product-v1
OUT=/tmp/pr2231-consecutive-observation-qualified-v1
: >"$RECEIPT"
stage() { printf '\n=== STAGE %s ===\n' "$1" | tee -a "$RECEIPT"; }
fail() { printf 'FAIL[%s] %s\n' "$1" "$2" | tee -a "$RECEIPT" >&2; exit 1; }
require_eq() {
  local label="$1" actual="$2" expected="$3"
  printf '%s actual=%s expected=%s\n' "$label" "$actual" "$expected" | tee -a "$RECEIPT"
  [ "$actual" = "$expected" ] || fail "$label" 'value mismatch'
}
fetch_leases() {
  git fetch --no-tags origin \
    "+refs/heads/main:refs/remotes/origin/main" \
    "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH" \
    "+refs/heads/$CONTROLLER_BRANCH:refs/remotes/origin/$CONTROLLER_BRANCH"
}

stage controller-envelope
require_eq controller-branch "$GITHUB_HEAD_REF" "$CONTROLLER_BRANCH"
require_eq controller-paths "$(git diff --name-only "$CONTROLLER_BASE..HEAD" | LC_ALL=C sort)" $'.github/pr2231/consecutive-observation-patch.py\n.github/pr2231/consecutive-observation-qualify.sh\n.github/workflows/temporary-pr2231-consecutive-observation-qualifier-v1.yml'

stage initial-live-leases
fetch_leases
CONTROLLER_HEAD="$(git rev-parse HEAD)"
require_eq controller-head "$(git rev-parse refs/remotes/origin/$CONTROLLER_BRANCH)" "$CONTROLLER_HEAD"
require_eq live-main "$(git rev-parse refs/remotes/origin/main)" "$EXPECTED_MAIN"
require_eq product-head "$(git rev-parse refs/remotes/origin/$PRODUCT_BRANCH)" "$EXPECTED_PRODUCT_HEAD"
require_eq product-parent "$(git rev-parse "$EXPECTED_PRODUCT_HEAD^")" "$EXPECTED_PRODUCT_PARENT"
require_eq product-lib "$(git rev-parse "$EXPECTED_PRODUCT_HEAD:tools/lib/industrial-exhaust.mjs")" "$EXPECTED_PRODUCT_LIB"
require_eq product-test "$(git rev-parse "$EXPECTED_PRODUCT_HEAD:test/industrial-exhaust.test.js")" "$EXPECTED_PRODUCT_TEST"
require_eq main-lib "$(git rev-parse "$EXPECTED_MAIN:tools/lib/industrial-exhaust.mjs")" "$EXPECTED_MAIN_LIB"
require_eq main-test "$(git rev-parse "$EXPECTED_MAIN:test/industrial-exhaust.test.js")" "$EXPECTED_MAIN_TEST"

stage assemble-product-on-live-main
rm -rf "$WORK" "$OUT"
git worktree prune
git worktree add --detach "$WORK" "$EXPECTED_MAIN"
git show "$EXPECTED_PRODUCT_HEAD:tools/lib/industrial-exhaust.mjs" >"$WORK/tools/lib/industrial-exhaust.mjs"
git show "$EXPECTED_PRODUCT_HEAD:test/industrial-exhaust.test.js" >"$WORK/test/industrial-exhaust.test.js"
cd "$WORK"
require_eq transplanted-lib "$(git hash-object tools/lib/industrial-exhaust.mjs)" "$EXPECTED_PRODUCT_LIB"
require_eq transplanted-test "$(git hash-object test/industrial-exhaust.test.js)" "$EXPECTED_PRODUCT_TEST"
require_eq transplanted-paths "$(git diff --name-only | LC_ALL=C sort)" $'test/industrial-exhaust.test.js\ntools/lib/industrial-exhaust.mjs'

stage reproduce-current-p2
node --input-type=module <<'NODE' 2>&1 | tee -a "$RECEIPT"
import assert from 'node:assert/strict';
import {redactContactData as redact} from './tools/lib/industrial-exhaust.mjs';
const labels = 'GUID '.repeat(4000);
const input = `Phone ${labels}record id: 09012345678 2026-08-17 2027-09-18 03-6216-8041`;
const expected = `Phone ${labels}record id: [contact omitted] 2026-08-17 2027-09-18 [contact omitted]`;
const actual = redact(input);
console.log(JSON.stringify({actualTail: actual.slice(-180), expectedTail: expected.slice(-180)}));
assert.notEqual(actual, expected);
assert.ok(!actual.includes('2027-09-18'));
assert.ok(actual.endsWith('8041'));
NODE

stage apply-forward-cursor-repair
python3 "$GITHUB_WORKSPACE/.github/pr2231/consecutive-observation-patch.py"

stage targeted-repaired-behavior
node --input-type=module <<'NODE' 2>&1 | tee -a "$RECEIPT"
import assert from 'node:assert/strict';
import {redactContactData as redact} from './tools/lib/industrial-exhaust.mjs';
const labels = 'GUID '.repeat(4000);
const cases = [
  [`Phone ${labels}record id: 09012345678 2026-08-17 2027-09-18 03-6216-8041`, `Phone ${labels}record id: [contact omitted] 2026-08-17 2027-09-18 [contact omitted]`],
  [`Phone ${labels}record id: 09012345678 2026-08-17 3.14 1 212 555 1234`, `Phone ${labels}record id: [contact omitted] 2026-08-17 3.14 [contact omitted]`],
  [`Phone ${labels}record id: 09012345678 2026-08-17 03-6216-8041 2027-09-18 1 212 555 1234`, `Phone ${labels}record id: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18 [contact omitted]`]
];
for (const [input, expected] of cases) {
  const actual = redact(input);
  console.log(JSON.stringify({actualTail: actual.slice(-180), expectedTail: expected.slice(-180)}));
  assert.equal(actual, expected);
}
NODE

stage syntax-and-focused-suites
node --check tools/lib/industrial-exhaust.mjs
node --check tools/crawl-industrial-exhaust.mjs
node --check test/industrial-exhaust.test.js
git diff --check
node test/industrial-exhaust.test.js 2>&1 | tee -a "$RECEIPT"
node test/industrial-exhaust-artifacts.test.js 2>&1 | tee -a "$RECEIPT"

stage pre-release-object-census
QUAL_LIB="$(git hash-object tools/lib/industrial-exhaust.mjs)"
QUAL_TEST="$(git hash-object test/industrial-exhaust.test.js)"
PATHS="$(git diff --name-only | LC_ALL=C sort)"
NUMSTAT="$(git diff --numstat | LC_ALL=C sort -k3)"
require_eq qualified-paths "$PATHS" $'test/industrial-exhaust.test.js\ntools/lib/industrial-exhaust.mjs'
printf 'qualified-lib=%s\nqualified-test=%s\nqualified-numstat<<EOF\n%s\nEOF\n' "$QUAL_LIB" "$QUAL_TEST" "$NUMSTAT" | tee -a "$RECEIPT"

stage complete-release-gate
npm run release:check 2>&1 | tee -a "$RECEIPT"

stage post-release-custody
while IFS= read -r changed; do
  case "$changed" in
    tools/lib/industrial-exhaust.mjs|test/industrial-exhaust.test.js) ;;
    *) git checkout "$EXPECTED_MAIN" -- "$changed" ;;
  esac
done < <(git diff --name-only)
git clean -fd
require_eq post-release-lib "$(git hash-object tools/lib/industrial-exhaust.mjs)" "$QUAL_LIB"
require_eq post-release-test "$(git hash-object test/industrial-exhaust.test.js)" "$QUAL_TEST"
require_eq post-release-paths "$(git diff --name-only | LC_ALL=C sort)" $'test/industrial-exhaust.test.js\ntools/lib/industrial-exhaust.mjs'
require_eq post-release-numstat "$(git diff --numstat | LC_ALL=C sort -k3)" "$NUMSTAT"
git diff --check

stage candidate-tree-and-artifact
git add tools/lib/industrial-exhaust.mjs test/industrial-exhaust.test.js
QUAL_TREE="$(git write-tree)"
require_eq staged-paths "$(git diff --cached --name-only "$EXPECTED_MAIN" | LC_ALL=C sort)" $'test/industrial-exhaust.test.js\ntools/lib/industrial-exhaust.mjs'
require_eq staged-numstat "$(git diff --cached --numstat "$EXPECTED_MAIN" | LC_ALL=C sort -k3)" "$NUMSTAT"
mkdir -p "$OUT/tools/lib" "$OUT/test"
cp tools/lib/industrial-exhaust.mjs "$OUT/tools/lib/industrial-exhaust.mjs"
cp test/industrial-exhaust.test.js "$OUT/test/industrial-exhaust.test.js"
printf 'QUALIFICATION_SUCCESS\nmain=%s\nproduct_predecessor=%s\ntree=%s\nlib=%s\ntest=%s\npaths<<EOF\n%s\nEOF\nnumstat<<EOF\n%s\nEOF\n' \
  "$EXPECTED_MAIN" "$EXPECTED_PRODUCT_HEAD" "$QUAL_TREE" "$QUAL_LIB" "$QUAL_TEST" "$PATHS" "$NUMSTAT" \
  | tee -a "$RECEIPT" "$OUT/finality.txt"
cp "$RECEIPT" "$OUT/qualification.txt"

stage final-live-lease-revalidation
cd "$GITHUB_WORKSPACE"
fetch_leases
require_eq final-main "$(git rev-parse refs/remotes/origin/main)" "$EXPECTED_MAIN"
require_eq final-product "$(git rev-parse refs/remotes/origin/$PRODUCT_BRANCH)" "$EXPECTED_PRODUCT_HEAD"
require_eq final-controller "$(git rev-parse refs/remotes/origin/$CONTROLLER_BRANCH)" "$CONTROLLER_HEAD"
require_eq final-main-lib "$(git rev-parse "$EXPECTED_MAIN:tools/lib/industrial-exhaust.mjs")" "$EXPECTED_MAIN_LIB"
require_eq final-main-test "$(git rev-parse "$EXPECTED_MAIN:test/industrial-exhaust.test.js")" "$EXPECTED_MAIN_TEST"
require_eq final-product-lib "$(git rev-parse "$EXPECTED_PRODUCT_HEAD:tools/lib/industrial-exhaust.mjs")" "$EXPECTED_PRODUCT_LIB"
require_eq final-product-test "$(git rev-parse "$EXPECTED_PRODUCT_HEAD:test/industrial-exhaust.test.js")" "$EXPECTED_PRODUCT_TEST"
printf 'FINAL_LEASE_SUCCESS\n' | tee -a "$RECEIPT" "$OUT/finality.txt"
cp "$RECEIPT" "$OUT/qualification.txt"
