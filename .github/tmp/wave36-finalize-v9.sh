#!/usr/bin/env bash
set -euo pipefail

BRANCH='agent/lake-allocator-war-public-acquisition-wave-36'
BASE_COMMIT='4e6f046eeb08ef38a85287ba09e64906c52571c6'
OBSERVED_AT='2026-08-02T16:30:00Z'
SELF_PATH='.github/tmp/wave36-finalize-v9.sh'
TOPOLOGY_CARRIER='.github/tmp/wave36-topology-extension.mjs'

before="$(git rev-parse HEAD)"
test "$(git merge-base "$BASE_COMMIT" "$before")" = "$BASE_COMMIT"
test -f "$SELF_PATH"
test -f "$TOPOLOGY_CARRIER"

LAW36_ALLOW_REQUIRED_FAILURES=1 LAW36_OBSERVED_AT="$OBSERVED_AT" \
  node tools/acquire-lake-allocator-war-public-acquisition-wave-36.mjs

node - <<'NODE'
const fs = require('fs');
const rows = fs.readFileSync('data/acquisition/lake-allocator-war-wave-36/capture-ledger.jsonl','utf8')
  .trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const failed = rows.filter(row => row.required_success && !(row.response_ok && row.response_body_path && row.marker_audit?.passed));
if (failed.length) {
  console.error('Wave 36 required-source failures:');
  for (const row of failed) console.error(`- ${row.capture_ref} ${row.source_ref}: ${row.capture_state} ${row.request_error ?? ''}`);
  process.exit(1);
}
if (rows.filter(row => row.required_success).length !== 22) throw new Error('Wave 36 required-source denominator drift');
console.log('Wave 36 required-source gate passed: 22');
NODE

node tools/build-lake-allocator-war-public-acquisition-wave-36.mjs
node tools/validate-lake-allocator-war-public-acquisition-wave-36.mjs
node test/lake-allocator-war-public-acquisition-wave-36.test.js
node "$TOPOLOGY_CARRIER"

node - <<'NODE'
const fs = require('fs');
const policyPath = 'data/project/lake-index-policy.json';
const registryPath = 'data/project/lake-identifier-topology-registry-wave-18.json';
const projectionPath = 'build/lake-actions/identifier-topology-wave-18.json';
const snapshotPath = 'data/acquisition/lake-allocator-war-wave-36/snapshots/law36-c050.json';
const policy = JSON.parse(fs.readFileSync(policyPath,'utf8'));
const prior = policy.max_text_bytes;
policy.max_text_bytes = 8250000;
fs.writeFileSync(policyPath, `${JSON.stringify(policy,null,2)}\n`);
const registryBytes = fs.statSync(registryPath).size;
if (registryBytes > policy.max_text_bytes) throw new Error(`Wave 18 registry exceeds bounded parse ceiling: ${registryBytes}`);
if (prior !== 8000000 && prior !== 8250000) throw new Error(`unexpected prior max_text_bytes: ${prior}`);
const snapshot = JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const ids = new Set(snapshot.results.map(row => row.generated_internal_id));
if (ids.size !== 100) throw new Error(`Wave 36 snapshot identifier denominator: ${ids.size}`);
const registry = JSON.parse(fs.readFileSync(registryPath,'utf8'));
const projection = JSON.parse(fs.readFileSync(projectionPath,'utf8'));
const rows = registry.records.filter(row => row.id_key === 'generated_internal_id' && ids.has(row.id_value));
if (rows.length !== 100) throw new Error(`Wave 36 generated_internal_id topology rows: ${rows.length}`);
if (registry.counts.records !== 10713 || registry.counts.post_freeze_records !== 342) throw new Error('Wave 18 extended denominator drift');
if (projection.topology_decisions.length !== registry.records.length) throw new Error('Wave 18 projection denominator drift');
for (const row of rows) {
  if (row.source_only?.final_classification !== 'external_or_domain_identifier_source_only') throw new Error(`${row.id_value}: classification drift`);
  if (row.review_required_to_decide !== false || row.cross_key_join_authorized !== false || row.graph_effect !== 'none') throw new Error(`${row.id_value}: unsafe boundary`);
}
console.log(`Wave 36 bounded parse ceiling: ${prior} -> ${policy.max_text_bytes}`);
console.log(`Wave 18 registry bytes: ${registryBytes}`);
console.log('Wave 36 topology source decisions verified: 100/100');
NODE

rm -f "$TOPOLOGY_CARRIER" "$SELF_PATH"
test ! -e "$TOPOLOGY_CARRIER"
test ! -e "$SELF_PATH"
git add -A

for tracked in \
  data/acquisition/lake-allocator-war-wave-36/capture-ledger.jsonl \
  data/acquisition/lake-allocator-war-wave-36/snapshots/law36-c050.json \
  data/project/lake-identifier-topology-registry-wave-18.json \
  data/project/lake-index-policy.json \
  build/lake-actions/identifier-topology-wave-18.json \
  build/lake-actions/allocator-war-public-acquisition-wave-36.json \
  reports/lake-allocator-war-public-acquisition-wave-36.md; do
  git ls-files --error-unmatch "$tracked" >/dev/null
done

tree_hash() {
  git add -A
  git write-tree
}

lake_pass() {
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
  node tools/validate-lake-allocator-war-public-acquisition-wave-36.mjs
  git add -A
}

shard_and_validate() {
  node tools/shard-lake-index.mjs
  node tools/validate-lake-index-shards.mjs
  node tools/build-lake-basin-index.mjs
  node tools/validate-lake-basin-index.mjs
  git add -A
}

focused_validate() {
  node tools/validate-lake-residual-frontier-wave-17.mjs
  node tools/validate-lake-identifier-topology-wave-18.mjs
  node test/lake-identifier-topology-wave-18.test.js
  node tools/validate-lake-generator-contracts-wave-19.mjs
  node tools/validate-lake-receipt-custody-wave-20.mjs
  node tools/validate-lake-allocator-war-wave-21.mjs
  node tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
  node tools/validate-lake-allocator-war-structural-parses-wave-33.mjs
  node tools/validate-lake-allocator-war-schema-joins-wave-34.mjs
  node tools/validate-lake-allocator-war-join-requirements-wave-35.mjs
  node tools/validate-lake-allocator-war-public-acquisition-wave-36.mjs
  node test/lake-allocator-war-public-acquisition-wave-36.test.js
}

registry_before="$(sha256sum data/project/lake-basin-registry.json | awk '{print $1}')"
node tools/install-lake-allocator-war-wave-21.mjs
registry_after="$(sha256sum data/project/lake-basin-registry.json | awk '{print $1}')"
test "$registry_before" = "$registry_after"
git add -A
echo "Wave 36 basin installer fixed point: $registry_after"

lake_pass
pre1="$(tree_hash)"
lake_pass
pre2="$(tree_hash)"
lake_pass
pre3="$(tree_hash)"
test "$pre2" = "$pre3"
echo "Wave 36 pre-release fixed point: $pre3"

shard_and_validate
focused_validate
npm run release:check

lake_pass
post1="$(tree_hash)"
lake_pass
post2="$(tree_hash)"
test "$post1" = "$post2"
echo "Wave 36 post-release fixed point: $post2"

shard_and_validate
focused_validate
git diff --check

git config user.name 'BigBirdReturns'
git config user.email '219768509+BigBirdReturns@users.noreply.github.com'
git add -A
git commit -m 'Materialize allocator-war public acquisition Wave 36'
product_commit="$(git rev-parse HEAD)"
product_tree="$(git rev-parse 'HEAD^{tree}')"

git reset --hard HEAD
git clean -fd
test ! -e "$TOPOLOGY_CARRIER"
test ! -e "$SELF_PATH"
test "$(node -p "require('./data/project/lake-index-policy.json').max_text_bytes")" = '8250000'
registry_before_restore="$(sha256sum data/project/lake-basin-registry.json | awk '{print $1}')"
node tools/install-lake-allocator-war-wave-21.mjs
registry_after_restore="$(sha256sum data/project/lake-basin-registry.json | awk '{print $1}')"
test "$registry_before_restore" = "$registry_after_restore"
node tools/build-lake-allocator-war-public-acquisition-wave-36.mjs
git add -A
lake_pass
restored1="$(tree_hash)"
lake_pass
restored2="$(tree_hash)"
test "$restored1" = "$restored2"
shard_and_validate
focused_validate
test -z "$(git status --porcelain)"
test "$(git rev-parse 'HEAD^{tree}')" = "$product_tree"
echo "Wave 36 restored epoch: $restored2"

git fetch origin "$BRANCH"
test "$(git rev-parse FETCH_HEAD)" = "$before"
git push origin "HEAD:$BRANCH"
echo "Wave 36 product commit: $product_commit"
echo "Wave 36 product tree: $product_tree"
