#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-closure-execution-wave-26'
base='7ad3c012dd1dd441942fc1e6e71f147a9f63c949'
trigger='.github/tmp/wave26-targeted-closure-reseal-trigger.json'
temporary_workflow='.github/workflows/temporary-wave26-targeted-closure-reseal.yml'
runner='tools/run-wave26-targeted-closure-reseal.sh'

test -f "$trigger"
test ! -e "$temporary_workflow"
git merge-base --is-ancestor "$base" HEAD
original_sha="$(git rev-parse HEAD)"

node --check tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
node --check tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
node --check tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
node --check test/lake-allocator-war-targeted-closure-wave-26.test.js

rm -f "$trigger" "$temporary_workflow" "$runner"

node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
first_plan="$(sha256sum data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
test "$first_plan" = "$(sha256sum data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json | cut -d' ' -f1)"

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
first_projection="$(sha256sum build/lake-actions/allocator-war-targeted-closure-wave-26.json | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-targeted-closure-wave-26.md | cut -d' ' -f1)"
first_results="$(find data/acquisition/lake-allocator-war-wave-26 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
test "$first_projection" = "$(sha256sum build/lake-actions/allocator-war-targeted-closure-wave-26.json | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-targeted-closure-wave-26.md | cut -d' ' -f1)"
test "$first_results" = "$(find data/acquisition/lake-allocator-war-wave-26 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
  node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/build-lake-index.mjs
  node tools/stabilize-lake-index.mjs
  node tools/stabilize-lake-generator-contracts-wave-19.mjs
  node tools/reconcile-lake-receipt-semantics.mjs
  node tools/stabilize-lake-receipt-custody-wave-20.mjs
  node tools/stabilize-lake-allocator-war-wave-21.mjs
  node tools/build-lake-gap-summary.mjs
  node tools/validate-lake-index.mjs
  node tools/validate-lake-receipt-semantics.mjs
  node tools/validate-lake-gap-summary.mjs
  node tools/reconcile-lake-identifier-topology-wave-18.mjs
  node tools/reconcile-lake-generator-contracts-wave-19.mjs
  node tools/reconcile-lake-receipt-custody-wave-20.mjs
  node tools/reconcile-lake-allocator-war-wave-21.mjs
  LAW26_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 26 corrected fixed-point pass $pass"
done

validate_epoch() {
  node tools/shard-lake-index.mjs
  node tools/validate-lake-index-shards.mjs
  node tools/build-lake-basin-index.mjs
  node tools/validate-lake-basin-index.mjs
  node tools/validate-lake-residual-frontier-wave-17.mjs
  node test/lake-residual-frontier-wave-17.test.js
  node tools/validate-lake-identifier-topology-wave-18.mjs
  node test/lake-identifier-topology-wave-18.test.js
  node tools/validate-lake-generator-contracts-wave-19.mjs
  node test/lake-generator-contracts-wave-19.test.js
  node tools/validate-lake-receipt-custody-wave-20.mjs
  node test/lake-receipt-custody-wave-20.test.js
  node tools/validate-lake-allocator-war-wave-21.mjs
  node test/lake-allocator-war-wave-21.test.js
  node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
  node test/lake-allocator-war-estate-execution-wave-22.test.js
  node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
  node test/lake-allocator-war-lead-acquisition-wave-23.test.js
  node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
  node test/lake-allocator-war-lead-execution-wave-24.test.js
  node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
  node test/lake-allocator-war-denominator-closure-wave-25.test.js
  node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
  node test/lake-allocator-war-targeted-closure-wave-26.test.js
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 26 corrected post-release seal pass $pass"
done
validate_epoch

staged_tree="$(git write-tree)"
git restore --worktree .
git clean -fd
node tools/validate-lake-index-shards.mjs
node tools/validate-lake-basin-index.mjs
node tools/validate-lake-residual-frontier-wave-17.mjs
node tools/validate-lake-identifier-topology-wave-18.mjs
node tools/validate-lake-generator-contracts-wave-19.mjs
node tools/validate-lake-receipt-custody-wave-20.mjs
node tools/validate-lake-allocator-war-wave-21.mjs
node test/lake-allocator-war-wave-21.test.js
node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node test/lake-allocator-war-estate-execution-wave-22.test.js
node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
node test/lake-allocator-war-lead-acquisition-wave-23.test.js
node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
node test/lake-allocator-war-lead-execution-wave-24.test.js
node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
node test/lake-allocator-war-denominator-closure-wave-25.test.js
node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
node test/lake-allocator-war-targeted-closure-wave-26.test.js
git add -A
git diff --cached --check
git diff --quiet
current_tree="$(git write-tree)"
if [[ "$current_tree" != "$staged_tree" ]]; then
  git diff --name-status "$staged_tree" "$current_tree"
  exit 1
fi

test ! -e "$trigger"
test ! -e "$temporary_workflow"
test ! -e "$runner"
test ! -e 'tools/run-wave26-targeted-closure-materializer.sh'
test ! -e 'tools/run-wave26-targeted-closure-materializer-v2.sh'

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git diff --cached --check
test "$(git write-tree)" = "$staged_tree"
git commit -m 'Reseal allocator-war targeted closure Wave 26'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
