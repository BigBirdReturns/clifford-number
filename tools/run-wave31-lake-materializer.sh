#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-public-routes-wave-31'
trigger='.github/tmp/wave31-lake-materializer-trigger.json'
preparer='tools/prepare-wave31-materialization.mjs'
runner='tools/run-wave31-lake-materializer.sh'

run_allocator_builds() {
  node tools/install-lake-allocator-war-wave-21.mjs
  node tools/build-lake-allocator-war-wave-21.mjs
  node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
  node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
  node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
  node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
  node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
  node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
  node tools/build-lake-allocator-war-public-interest-downstream-wave-27.mjs
  node tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs
  node tools/build-lake-allocator-war-public-interest-execution-wave-29.mjs
  node tools/build-lake-allocator-war-gap-fanout-wave-30.mjs
  node tools/build-lake-allocator-war-public-route-execution-wave-31.mjs
}

run_fixed_point() {
  local label="$1"
  echo "$label"
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
  node tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs
}

validate_lake_chain() {
  node tools/validate-lake-index-shards.mjs
  node tools/validate-lake-basin-index.mjs
  node tools/validate-lake-residual-frontier-wave-17.mjs
  node tools/validate-lake-identifier-topology-wave-18.mjs
  node tools/validate-lake-generator-contracts-wave-19.mjs
  node tools/validate-lake-receipt-custody-wave-20.mjs
  node tools/validate-lake-allocator-war-wave-21.mjs
  node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
  node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
  node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
  node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
  node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
  node tools/validate-lake-allocator-war-public-interest-downstream-wave-27.mjs
  node tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs
  node tools/validate-lake-allocator-war-public-interest-execution-wave-29.mjs
  node tools/validate-lake-allocator-war-gap-fanout-wave-30.mjs
  node tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs
}

node "$preparer"
rm -f "$trigger" "$preparer" "$runner"
rmdir .github/tmp 2>/dev/null || true

git add -A
run_allocator_builds
GITHUB_TOKEN="${GITHUB_TOKEN:-}" GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-BigBirdReturns/clifford-number}" \
  node tools/build-lake-open-pr-shadow.mjs
git add -A

for pass in 1 2 3; do
  run_fixed_point "Wave 31 public-route fixed-point pass ${pass}"
done
node tools/shard-lake-index.mjs
node tools/validate-lake-index-shards.mjs
node tools/build-lake-basin-index.mjs
node tools/validate-lake-basin-index.mjs
validate_lake_chain
node test/lake-allocator-war-public-route-execution-wave-31.test.js

npm run release:check

git add -A
for pass in 1 2 3; do
  run_fixed_point "Wave 31 public-route post-release seal pass ${pass}"
done
node tools/shard-lake-index.mjs
node tools/validate-lake-index-shards.mjs
node tools/build-lake-basin-index.mjs
node tools/validate-lake-basin-index.mjs
validate_lake_chain
node test/lake-allocator-war-public-route-execution-wave-31.test.js

git add -A
git diff --cached --check
if git ls-files | grep -E 'wave31-(lake-materializer|protected-route-repair|tree-export|source)' >/dev/null; then
  echo 'Wave 31 temporary transport remains tracked' >&2
  git ls-files | grep -E 'wave31-(lake-materializer|protected-route-repair|tree-export|source)' >&2 || true
  exit 1
fi

status="$(git status --porcelain)"
[[ -n "$status" ]] || { echo 'Wave 31 materializer produced no change' >&2; exit 1; }

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'Materialize allocator-war public-route execution Wave 31'
committed_head="$(git rev-parse HEAD)"
committed_tree="$(git rev-parse HEAD^{tree})"

git reset --hard HEAD
git clean -fd
restored_tree="$(git rev-parse HEAD^{tree})"
[[ "$committed_tree" == "$restored_tree" ]] || {
  echo "Wave 31 restored-tree mismatch: committed=$committed_tree restored=$restored_tree" >&2
  exit 1
}
validate_lake_chain
node test/lake-allocator-war-public-route-execution-wave-31.test.js
git diff --check
test -z "$(git status --porcelain)"

git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || {
  echo "Wave 31 stale-head refusal: remote=$remote_head parent=$parent_head" >&2
  exit 1
}
git push origin "HEAD:$branch"
echo "Wave 31 sealed checkpoint published: $committed_head"
