#!/usr/bin/env bash
set -euo pipefail

branch='agent/allocator-war-estate-acquisition-wave-22'
base='ec730441e4779b24226f12f556707f4a89b7fe3f'
trigger='.github/tmp/lake-allocator-war-estate-execution-wave-22-trigger.json'
temporary_workflow='.github/workflows/temporary-lake-allocator-war-estate-execution-wave-22-materializer.yml'
carrier='tools/materialize-lake-allocator-war-estate-execution-wave-22.mjs'
runner='tools/run-wave22-push-materializer.sh'

# The push-event run checks out the live branch after connector-side workflow removal.
test -f "$trigger"
test -f "$carrier"
test ! -e "$temporary_workflow"
git merge-base --is-ancestor "$base" HEAD
original_sha="$(git rev-parse HEAD)"

npm run release:check

node --check "$carrier"
node "$carrier"
node - <<'NODE'
const fs = require('node:fs');

const testPath = 'test/lake-allocator-war-estate-execution-wave-22.test.js';
let testSource = fs.readFileSync(testPath, 'utf8');
const priorityBefore = "  ['change priority', state => { state.projection.queues[0].tasks[0].priority_tier = 'P2'; }],";
const priorityAfter = "  ['change priority', state => { const task = state.projection.queues[0].tasks[0]; task.priority_tier = task.priority_tier === 'P0' ? 'P1' : 'P0'; }],";
if (!testSource.includes(priorityBefore)) throw new Error('Wave 22 priority mutation marker missing');
testSource = testSource.replace(priorityBefore, priorityAfter);
fs.writeFileSync(testPath, testSource);

const validatorPath = 'tools/validate-lake-allocator-war-estate-execution-wave-22.mjs';
let validatorSource = fs.readFileSync(validatorPath, 'utf8');
const authorityBefore = "    const authority = policy.authority_law[source.route_authority];\n    if (queue.consumer_key !== source.consumer_key) fail(errors, queue.allocator_estate_feed_id + ': consumer drift');";
const authorityAfter = "    const authority = policy.authority_law[source.route_authority];\n    if (!authority) {\n      fail(errors, queue.allocator_estate_feed_id + ': unknown queue authority');\n      continue;\n    }\n    if (queue.consumer_key !== source.consumer_key) fail(errors, queue.allocator_estate_feed_id + ': consumer drift');";
if (!validatorSource.includes(authorityBefore)) throw new Error('Wave 22 authority guard marker missing');
validatorSource = validatorSource.replace(authorityBefore, authorityAfter);
fs.writeFileSync(validatorPath, validatorSource);
NODE

rm -f "$carrier" "$trigger" "$temporary_workflow" "$runner"
node --check tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node --check tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node --check test/lake-allocator-war-estate-execution-wave-22.test.js
node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
first_projection="$(sha256sum build/lake-actions/allocator-war-estate-execution-wave-22.json | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-estate-execution-wave-22.md | cut -d' ' -f1)"
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
test "$first_projection" = "$(sha256sum build/lake-actions/allocator-war-estate-execution-wave-22.json | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-estate-execution-wave-22.md | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
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
  LAW22_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
  git add -A
}

validate_sharded_epoch() {
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
  git add -A
  git diff --check
}

for pass in 1 2 3; do
  fixed_point_pass "allocator-war estate execution Wave 22 fixed-point pass $pass"
done
validate_sharded_epoch

npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "allocator-war estate execution Wave 22 post-release seal pass $pass"
done
validate_sharded_epoch

git add -A
git diff --cached --check
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
test ! -e "$carrier"
test ! -e "$runner"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git diff --cached --check
test "$(git write-tree)" = "$staged_tree"
git commit -m 'Materialize allocator-war estate execution Wave 22'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
