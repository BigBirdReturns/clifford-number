#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-snapshot-wave-32'
trigger='.github/tmp/wave32-lake-materializer-trigger.json'
export_trigger='.github/tmp/wave32-sealed-tree-export-trigger.json'
runner='tools/run-wave32-lake-materializer.sh'

allocator_builds() {
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

fixed_point_pass() {
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
  node tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
}

seal_fixed_point() {
  local label="$1"
  local previous=''
  local current=''
  for pass in 1 2 3; do
    echo "Wave 32 ${label} fixed-point pass ${pass}"
    fixed_point_pass
    git add -A
    current="$(git write-tree)"
    if [[ "$pass" -ge 2 && "$current" == "$previous" ]]; then
      echo "Wave 32 ${label} fixed point reached: ${current}"
      return 0
    fi
    previous="$current"
  done
  echo "Wave 32 ${label} did not reach a two-pass tree fixed point" >&2
  return 1
}

shard_and_validate() {
  node tools/shard-lake-index.mjs
  node tools/validate-lake-index-shards.mjs
  node tools/build-lake-basin-index.mjs
  node tools/validate-lake-basin-index.mjs
  node tools/validate-lake-index-shards.mjs
  node tools/validate-lake-basin-index.mjs
}

validate_allocator_chain() {
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
  node tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
  node test/lake-allocator-war-bounded-source-snapshots-wave-32.test.js
}

observed_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
export LAW32_OBSERVED_AT="$observed_at"
echo "Wave 32 live acquisition observed_at=${LAW32_OBSERVED_AT}"

node tools/install-lake-allocator-war-wave-21.mjs
allocator_builds
node tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
node tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs

node - <<'NODE'
const fs = require('node:fs');
const policy = JSON.parse(fs.readFileSync('data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync(policy.paths.snapshot_plan, 'utf8'));
const rows = fs.readFileSync(policy.paths.snapshot_ledger, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
for (const ref of plan.required_success_snapshot_refs) {
  const row = rows.find(item => item.snapshot_ref === ref);
  if (!row || row.capture_state !== 'captured_json_response' || row.response_ok !== true) {
    throw new Error(`${ref}: required live JSON control was not captured`);
  }
}
NODE

GITHUB_TOKEN="${GITHUB_TOKEN:-}" GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}" node tools/build-lake-open-pr-shadow.mjs
rm -f "$trigger" "$export_trigger" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A

seal_fixed_point 'pre-release'
shard_and_validate
validate_allocator_chain
npm run release:check

seal_fixed_point 'post-release'
shard_and_validate
validate_allocator_chain
git diff --check

git add -A
[[ -n "$(git status --porcelain)" ]] || { echo 'Wave 32 materializer produced no change' >&2; exit 1; }
git commit -m 'Materialize allocator-war bounded source snapshots Wave 32'
sealed_tree="$(git rev-parse HEAD^{tree})"

# Restore from the committed epoch and prove that validation is read-only.
git reset --hard HEAD
git clean -fd
shard_and_validate
validate_allocator_chain
git diff --check
[[ -z "$(git status --porcelain)" ]] || { git status --short >&2; echo 'Wave 32 restored epoch is dirty' >&2; exit 1; }
[[ "$sealed_tree" == "$(git rev-parse HEAD^{tree})" ]] || { echo 'Wave 32 committed tree changed during restored validation' >&2; exit 1; }

# Refuse to publish over a descendant or sibling head.
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || { echo "Wave 32 stale-head refusal: remote=$remote_head parent=$parent_head" >&2; exit 1; }
git push origin "HEAD:$branch"
echo "Wave 32 sealed checkpoint published: $(git rev-parse HEAD)"
