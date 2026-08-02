#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-structural-parses-wave-33-v2'
base_checkpoint='2842a00aa36f9202d627163721020e56eddf3663'
parts=(
  '.github/tmp/wave33-source-patch.part-00'
  '.github/tmp/wave33-source-patch.part-01'
)
trigger='.github/tmp/wave33-source-materializer-trigger.json'
accidental_trigger='.github/tmp/wave33-tree-export-trigger.json'
runner='tools/run-wave33-patch-materializer.sh'
permanent_workflow='.github/workflows/lake-allocator-war-structural-parses-wave-33.yml'
b64='/tmp/wave33-source.patch.gz.b64'
patch_gz='/tmp/wave33-source.patch.gz'
patch='/tmp/wave33-source.patch'
expected_b64='91d0e2424c770aefc115842b932c13e3e4e028ed789364d0eaccc6166d561e20'
expected_patch_gz='282f511d1550ba14c8aa2089a541fab11f84a5390df142f49ee7c8425fc99570'
expected_patch='3e6ab452b50856586e66896c5718c0305e7a67bd3eae78d96ba73e463f99b8a6'
expected_workflow='139e725651e1ccdcc4f064793e8e96b46ef13049b3080ddce565176ec8ee1e4c'
expected_part_hashes=(
  '732c02c53cc7832030406d1f58127a3a1c19349906fc9411817f2f29a0683ce2'
  '3707b690610b43225b0cdcfa10605df6bda7280b27c261046e5b55a24c2f0806'
)
expected_patch_paths=(
  'BUILD-INSTRUCTIONS.md'
  'README.md'
  'data/project/lake-allocator-war-structural-parses-wave-33-plan.json'
  'data/project/lake-allocator-war-structural-parses-wave-33-policy.json'
  'data/project/lake-allocator-war-wave-21-policy.json'
  'data/project/lake-basin-registry.json'
  'data/project/lake-index-policy.json'
  'docs/methods/lake-allocator-war-structural-parses-wave-33.md'
  'docs/milestones/lake-allocator-war-structural-parses-wave-33.md'
  'package.json'
  'test/lake-allocator-war-structural-parses-wave-33.test.js'
  'tools/build-lake-allocator-war-structural-parses-wave-33.mjs'
  'tools/install-lake-allocator-war-wave-21.mjs'
  'tools/validate-lake-allocator-war-structural-parses-wave-33.mjs'
  'tools/validate-lake-allocator-war-wave-21.mjs'
)
expected_transport_paths=(
  '.github/tmp/wave33-source-materializer-trigger.json'
  '.github/tmp/wave33-source-patch.part-00'
  '.github/tmp/wave33-source-patch.part-01'
  '.github/workflows/lake-allocator-war-structural-parses-wave-33.yml'
  'tools/run-wave33-patch-materializer.sh'
)

# Refuse any branch state beyond the known transport surface.
git merge-base --is-ancestor "$base_checkpoint" HEAD || {
  echo "Wave 33 base checkpoint is not an ancestor of HEAD: $base_checkpoint" >&2
  exit 1
}
mapfile -t actual_transport < <(git diff --name-only "$base_checkpoint"...HEAD | sort)
mapfile -t sorted_transport < <(printf '%s\n' "${expected_transport_paths[@]}" | sort)
[[ "${actual_transport[*]}" == "${sorted_transport[*]}" ]] || {
  printf 'Wave 33 transport scope drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_transport[*]}" "${actual_transport[*]}" >&2
  exit 1
}

for index in "${!parts[@]}"; do
  part="${parts[$index]}"
  actual="$(sha256sum "$part" | awk '{print $1}')"
  [[ "$actual" == "${expected_part_hashes[$index]}" ]] || {
    echo "Wave 33 patch carrier mismatch: part=$part expected=${expected_part_hashes[$index]} actual=$actual" >&2
    exit 1
  }
done
cat "${parts[@]}" > "$b64"
actual_b64="$(sha256sum "$b64" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || {
  echo "Wave 33 patch Base64 mismatch: expected=$expected_b64 actual=$actual_b64" >&2
  exit 1
}
base64 -d "$b64" > "$patch_gz"
actual_patch_gz="$(sha256sum "$patch_gz" | awk '{print $1}')"
[[ "$actual_patch_gz" == "$expected_patch_gz" ]] || {
  echo "Wave 33 compressed patch mismatch: expected=$expected_patch_gz actual=$actual_patch_gz" >&2
  exit 1
}
gzip -dc "$patch_gz" > "$patch"
actual_patch="$(sha256sum "$patch" | awk '{print $1}')"
[[ "$actual_patch" == "$expected_patch" ]] || {
  echo "Wave 33 patch mismatch: expected=$expected_patch actual=$actual_patch" >&2
  exit 1
}
mapfile -t actual_patch_paths < <(git apply --numstat "$patch" | cut -f3 | sort)
mapfile -t sorted_patch_paths < <(printf '%s\n' "${expected_patch_paths[@]}" | sort)
[[ "${actual_patch_paths[*]}" == "${sorted_patch_paths[*]}" ]] || {
  printf 'Wave 33 patch path drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_patch_paths[*]}" "${actual_patch_paths[*]}" >&2
  exit 1
}

[[ -f "$permanent_workflow" ]] || { echo 'Wave 33 permanent workflow absent' >&2; exit 1; }
actual_workflow="$(sha256sum "$permanent_workflow" | awk '{print $1}')"
[[ "$actual_workflow" == "$expected_workflow" ]] || {
  echo "Wave 33 permanent workflow drift: expected=$expected_workflow actual=$actual_workflow" >&2
  exit 1
}

git apply --index --whitespace=error "$patch"
rm -f "${parts[@]}" "$trigger" "$accidental_trigger" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A

node --check tools/build-lake-allocator-war-structural-parses-wave-33.mjs
node --check tools/validate-lake-allocator-war-structural-parses-wave-33.mjs
node --check test/lake-allocator-war-structural-parses-wave-33.test.js
node - <<'NODE'
const fs = require('node:fs');
for (const relative of [
  'package.json',
  'data/project/lake-allocator-war-wave-21-policy.json',
  'data/project/lake-index-policy.json',
  'data/project/lake-basin-registry.json',
  'data/project/lake-allocator-war-structural-parses-wave-33-policy.json',
  'data/project/lake-allocator-war-structural-parses-wave-33-plan.json'
]) JSON.parse(fs.readFileSync(relative, 'utf8'));
NODE

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
  node tools/validate-lake-allocator-war-structural-parses-wave-33.mjs
}

seal_fixed_point() {
  local label="$1"
  local previous=''
  local current=''
  for pass in 1 2 3 4; do
    echo "Wave 33 ${label} fixed-point pass ${pass}"
    fixed_point_pass
    git add -A
    current="$(git write-tree)"
    if [[ "$pass" -ge 2 && "$current" == "$previous" ]]; then
      echo "Wave 33 ${label} fixed point reached: ${current}"
      return 0
    fi
    previous="$current"
  done
  echo "Wave 33 ${label} did not reach a two-pass tree fixed point" >&2
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

focused_validate() {
  node tools/validate-lake-allocator-war-wave-21.mjs
  node tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
  node tools/validate-lake-allocator-war-structural-parses-wave-33.mjs
  node test/lake-allocator-war-structural-parses-wave-33.test.js
}

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-structural-parses-wave-33.mjs
git add -A
seal_fixed_point 'pre-release'
shard_and_validate
focused_validate
npm run release:check
seal_fixed_point 'post-release'
shard_and_validate
focused_validate
git diff --check
git add -A

[[ -n "$(git status --porcelain)" ]] || { echo 'Wave 33 materializer produced no change' >&2; exit 1; }
git commit -m 'Materialize allocator-war frozen structural parses Wave 33'
sealed_tree="$(git rev-parse HEAD^{tree})"
sealed_commit="$(git rev-parse HEAD)"

# Reconstruct the committed epoch from source after deleting ignored products.
git reset --hard HEAD
git clean -fdx
node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-structural-parses-wave-33.mjs
git add -A
seal_fixed_point 'restored-epoch'
shard_and_validate
focused_validate
git diff --check
git add -A
restored_tree="$(git write-tree)"
[[ "$restored_tree" == "$sealed_tree" ]] || {
  echo "Wave 33 restored tree mismatch: sealed=$sealed_tree restored=$restored_tree" >&2
  exit 1
}

# Return to the exact commit and prove read-only validation from the committed shards.
git reset --hard "$sealed_commit"
git clean -fdx
node tools/validate-lake-index-shards.mjs
node tools/validate-lake-basin-index.mjs
focused_validate
git diff --check
[[ -z "$(git status --porcelain)" ]] || {
  git status --short >&2
  echo 'Wave 33 committed epoch became dirty during read-only validation' >&2
  exit 1
}
[[ "$sealed_tree" == "$(git rev-parse HEAD^{tree})" ]] || {
  echo 'Wave 33 committed tree changed during read-only validation' >&2
  exit 1
}

# Refuse to publish over any descendant or sibling head.
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || {
  echo "Wave 33 stale-head refusal: remote=$remote_head parent=$parent_head" >&2
  exit 1
}
git push origin "HEAD:$branch"
echo "Wave 33 sealed checkpoint published: $(git rev-parse HEAD)"
