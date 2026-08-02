#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-schema-joins-wave-34'
base_head='08d463f728b86be03b323b132132649b236ef48a'
parts=(
  '.github/tmp/wave34-ancestry-repair.chunk-00'
  '.github/tmp/wave34-ancestry-repair.chunk-01'
  '.github/tmp/wave34-ancestry-repair.chunk-02'
  '.github/tmp/wave34-ancestry-repair.chunk-03'
)
trigger='.github/tmp/wave34-ancestry-repair-trigger.json'
runner='tools/run-wave34-ancestry-repair.sh'
temporary_workflow='.github/workflows/temporary-wave34-ancestry-repair.yml'
b64='/tmp/wave34-ancestry-repair.patch.gz.b64'
patch_gz='/tmp/wave34-ancestry-repair.patch.gz'
patch='/tmp/wave34-ancestry-repair.patch'
expected_b64='e9373386d10dba200b249fbb32fa584831a71d6f5cd76918f63ddf5d9290c637'
expected_patch_gz='7239ef26f1bf2206c1151314a60ec74768a87fc4a9c64efa8c814d90b3dd7e72'
expected_patch='7603510d45da561a65c676cef025141796ac876aa5b9fbca652444f2604b59c2'
expected_part_hashes=(
  '0f1294a9e81d21bbdb77ee4710fdcd044bd5f9160d3dd3dee5f3a7ca8f55ce51'
  '2cda42f6d6dd4bddfbeae9bf6282c70294ec6a926f8e115152ff94a79bd197bf'
  '422e7441b843f82d8e787a596319f8378f030668bbb05f2e1e784a3c4efdbe34'
  'fb0a46c697b16814df519887c2b0328f01a708efb46c4a6b5c49115467b292f0'
)
expected_patch_paths=(
  'build/lake-index/basin-manifest.json'
  'build/lake-index/basin-membership.jsonl'
  'build/lake-index/basins.json'
  'build/lake-index/files.jsonl'
  'build/lake-index/gap-summary.json'
  'build/lake-index/manifest.json'
  'build/lake-index/summary.json'
  'docs/methods/lake-allocator-war-schema-joins-wave-34.md'
  'docs/milestones/lake-allocator-war-schema-joins-wave-34.md'
  'reports/lake-index-census.md'
  'reports/lake-index-gap-summary.md'
  'tools/validate-lake-allocator-war-schema-joins-wave-34.mjs'
)
expected_transport_paths=(
  '.github/tmp/wave34-ancestry-repair.chunk-00'
  '.github/tmp/wave34-ancestry-repair.chunk-01'
  '.github/tmp/wave34-ancestry-repair.chunk-02'
  '.github/tmp/wave34-ancestry-repair.chunk-03'
  '.github/tmp/wave34-ancestry-repair-trigger.json'
  'tools/run-wave34-ancestry-repair.sh'
)

git merge-base --is-ancestor "$base_head" HEAD || {
  echo "Wave 34 repair base is not an ancestor of HEAD: $base_head" >&2
  exit 1
}
[[ ! -e "$temporary_workflow" ]] || {
  echo "temporary Wave 34 ancestry-repair workflow survived checkout" >&2
  exit 1
}
mapfile -t actual_transport < <(git diff --name-only "$base_head"...HEAD | sort)
mapfile -t sorted_transport < <(printf '%s\n' "${expected_transport_paths[@]}" | sort)
[[ "${actual_transport[*]}" == "${sorted_transport[*]}" ]] || {
  printf 'Wave 34 ancestry-repair transport scope drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_transport[*]}" "${actual_transport[*]}" >&2
  exit 1
}

for index in "${!parts[@]}"; do
  part="${parts[$index]}"
  actual="$(sha256sum "$part" | awk '{print $1}')"
  [[ "$actual" == "${expected_part_hashes[$index]}" ]] || {
    echo "Wave 34 repair carrier mismatch: part=$part expected=${expected_part_hashes[$index]} actual=$actual" >&2
    exit 1
  }
done
cat "${parts[@]}" > "$b64"
actual_b64="$(sha256sum "$b64" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || {
  echo "Wave 34 repair Base64 mismatch: expected=$expected_b64 actual=$actual_b64" >&2
  exit 1
}
base64 -d "$b64" > "$patch_gz"
actual_patch_gz="$(sha256sum "$patch_gz" | awk '{print $1}')"
[[ "$actual_patch_gz" == "$expected_patch_gz" ]] || {
  echo "Wave 34 compressed repair patch mismatch: expected=$expected_patch_gz actual=$actual_patch_gz" >&2
  exit 1
}
gzip -dc "$patch_gz" > "$patch"
actual_patch="$(sha256sum "$patch" | awk '{print $1}')"
[[ "$actual_patch" == "$expected_patch" ]] || {
  echo "Wave 34 repair patch mismatch: expected=$expected_patch actual=$actual_patch" >&2
  exit 1
}
mapfile -t actual_patch_paths < <(git apply --numstat "$patch" | cut -f3 | sort)
mapfile -t sorted_patch_paths < <(printf '%s\n' "${expected_patch_paths[@]}" | sort)
[[ "${actual_patch_paths[*]}" == "${sorted_patch_paths[*]}" ]] || {
  printf 'Wave 34 repair patch path drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_patch_paths[*]}" "${actual_patch_paths[*]}" >&2
  exit 1
}

git apply --index --whitespace=error "$patch"
rm -f "${parts[@]}" "$trigger" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
node --check tools/validate-lake-allocator-war-schema-joins-wave-34.mjs

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
  node tools/validate-lake-allocator-war-schema-joins-wave-34.mjs
}

seal_fixed_point() {
  local label="$1"
  local previous=''
  local current=''
  for pass in 1 2 3 4; do
    echo "Wave 34 repair ${label} fixed-point pass ${pass}"
    fixed_point_pass
    git add -A
    current="$(git write-tree)"
    if [[ "$pass" -ge 2 && "$current" == "$previous" ]]; then
      echo "Wave 34 repair ${label} fixed point reached: ${current}"
      return 0
    fi
    previous="$current"
  done
  echo "Wave 34 repair ${label} did not reach a two-pass tree fixed point" >&2
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
  node tools/validate-lake-allocator-war-schema-joins-wave-34.mjs
  node test/lake-allocator-war-schema-joins-wave-34.test.js
}

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-schema-joins-wave-34.mjs
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

[[ -n "$(git status --porcelain)" ]] || {
  echo 'Wave 34 ancestry repair produced no change' >&2
  exit 1
}
git commit -m 'Repair Wave 34 shallow-history ancestry validation'
sealed_commit="$(git rev-parse HEAD)"
sealed_tree="$(git rev-parse HEAD^{tree})"

# Rebuild the committed epoch from source and require exact tree equality.
git reset --hard HEAD
git clean -fdx
node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-schema-joins-wave-34.mjs
git add -A
seal_fixed_point 'restored-epoch'
shard_and_validate
focused_validate
git diff --check
git add -A
restored_tree="$(git write-tree)"
[[ "$restored_tree" == "$sealed_tree" ]] || {
  echo "Wave 34 repaired restored tree mismatch: sealed=$sealed_tree restored=$restored_tree" >&2
  exit 1
}

# Return to the exact commit and prove read-only validation from committed products.
git reset --hard "$sealed_commit"
git clean -fdx
node tools/validate-lake-index-shards.mjs
node tools/validate-lake-basin-index.mjs
focused_validate
git diff --check
[[ -z "$(git status --porcelain)" ]] || {
  git status --short >&2
  echo 'Wave 34 repaired committed epoch became dirty during read-only validation' >&2
  exit 1
}
[[ "$sealed_tree" == "$(git rev-parse HEAD^{tree})" ]] || {
  echo 'Wave 34 repaired committed tree changed during read-only validation' >&2
  exit 1
}

# Refuse publication over a descendant or sibling head.
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || {
  echo "Wave 34 repair stale-head refusal: remote=$remote_head parent=$parent_head" >&2
  exit 1
}
git push origin "HEAD:$branch"
echo "Wave 34 ancestry repair checkpoint published: $(git rev-parse HEAD)"
