#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-schema-joins-wave-34'
base_checkpoint='23d7dc75e759c771a685e43836a693a5efc13896'
parts=(
  '.github/tmp/wave34-source-patch.chunk-00'
  '.github/tmp/wave34-source-patch.chunk-01'
  '.github/tmp/wave34-source-patch.chunk-02'
  '.github/tmp/wave34-source-patch.chunk-03'
  '.github/tmp/wave34-source-patch.chunk-04'
  '.github/tmp/wave34-source-patch.chunk-05'
  '.github/tmp/wave34-source-patch.chunk-06'
  '.github/tmp/wave34-source-patch.chunk-07'
)
trigger='.github/tmp/wave34-source-materializer-trigger.json'
export_trigger='.github/tmp/wave34-tree-export-trigger.json'
runner='tools/run-wave34-patch-materializer.sh'
permanent_workflow='.github/workflows/lake-allocator-war-schema-joins-wave-34.yml'
b64='/tmp/wave34-source.patch.gz.b64'
patch_gz='/tmp/wave34-source.patch.gz'
patch='/tmp/wave34-source.patch'
expected_b64='eb8747709c8911d820dfe5c6a9c8848aad27ebd3c9753491b75045da4a21d777'
expected_patch_gz='4c4416c483c9cfc20b4b00b77b8b9be3dcd6c2892291a15297462d107f443180'
expected_patch='1ddbe9dc66b856d9591d209fc08924615288ef9a07041c020af1c86e5883bb14'
expected_workflow='701487f373dfaf8029717ea98613066a58e7b2609541f9c1fea6911c0f181200'
expected_part_hashes=(
  '6df3fccf0ec013c23f120b7e5e47822fe4b47657076855a213ad538d751c4727'
  'c7a523af26f520f5ecde15185706f18af8d747758526d6f7b1fae77df5cad4e1'
  '54dcd0b6134cee40e7a126d5d26556518ed3d6cc8f83653b3d4e75b3dafe6963'
  'a954d964d937af9f83fc24e9e2d2950c72adba1762f7eee832c433c67a0cebd5'
  '5b56e1f04d5beaabeed4c3d9918a4fc73df8c6320110659a46395db37f9b53e8'
  '450533dc54f3e1ec0fb97a4c2d687eb06cf3ee464ebb985cfc13d6acb3dc317a'
  '5e6e70caad3bc68c8cfc6fd351322f5c1ceca3b61234dd1b1a6aef5a9a8de797'
  '31ab4345c518a06e9bc5ca13056e818723b2f36aaa850225930bcf00b8c50eaa'
)
expected_patch_paths=(
  'BUILD-INSTRUCTIONS.md'
  'README.md'
  'data/project/lake-allocator-war-schema-joins-wave-34-plan.json'
  'data/project/lake-allocator-war-schema-joins-wave-34-policy.json'
  'data/project/lake-allocator-war-wave-21-policy.json'
  'data/project/lake-basin-registry.json'
  'data/project/lake-index-policy.json'
  'docs/methods/lake-allocator-war-schema-joins-wave-34.md'
  'docs/milestones/lake-allocator-war-schema-joins-wave-34.md'
  'package.json'
  'test/lake-allocator-war-schema-joins-wave-34.test.js'
  'tools/build-lake-allocator-war-schema-joins-wave-34.mjs'
  'tools/install-lake-allocator-war-wave-21.mjs'
  'tools/validate-lake-allocator-war-schema-joins-wave-34.mjs'
  'tools/validate-lake-allocator-war-wave-21.mjs'
)
expected_transport_paths=(
  '.github/tmp/wave34-source-materializer-trigger.json'
  '.github/tmp/wave34-source-patch.chunk-00'
  '.github/tmp/wave34-source-patch.chunk-01'
  '.github/tmp/wave34-source-patch.chunk-02'
  '.github/tmp/wave34-source-patch.chunk-03'
  '.github/tmp/wave34-source-patch.chunk-04'
  '.github/tmp/wave34-source-patch.chunk-05'
  '.github/tmp/wave34-source-patch.chunk-06'
  '.github/tmp/wave34-source-patch.chunk-07'
  '.github/tmp/wave34-tree-export-trigger.json'
  '.github/workflows/lake-allocator-war-schema-joins-wave-34.yml'
  'tools/run-wave34-patch-materializer.sh'
)
# Refuse any branch state beyond the known transport surface.
git merge-base --is-ancestor "$base_checkpoint" HEAD || {
  echo "Wave 34 base checkpoint is not an ancestor of HEAD: $base_checkpoint" >&2
  exit 1
}
mapfile -t actual_transport < <(git diff --name-only "$base_checkpoint"...HEAD | sort)
mapfile -t sorted_transport < <(printf '%s\n' "${expected_transport_paths[@]}" | sort)
[[ "${actual_transport[*]}" == "${sorted_transport[*]}" ]] || {
  printf 'Wave 34 transport scope drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_transport[*]}" "${actual_transport[*]}" >&2
  exit 1
}

for index in "${!parts[@]}"; do
  part="${parts[$index]}"
  actual="$(sha256sum "$part" | awk '{print $1}')"
  [[ "$actual" == "${expected_part_hashes[$index]}" ]] || {
    echo "Wave 34 patch carrier mismatch: part=$part expected=${expected_part_hashes[$index]} actual=$actual" >&2
    exit 1
  }
done
cat "${parts[@]}" > "$b64"
actual_b64="$(sha256sum "$b64" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || {
  echo "Wave 34 patch Base64 mismatch: expected=$expected_b64 actual=$actual_b64" >&2
  exit 1
}
base64 -d "$b64" > "$patch_gz"
actual_patch_gz="$(sha256sum "$patch_gz" | awk '{print $1}')"
[[ "$actual_patch_gz" == "$expected_patch_gz" ]] || {
  echo "Wave 34 compressed patch mismatch: expected=$expected_patch_gz actual=$actual_patch_gz" >&2
  exit 1
}
gzip -dc "$patch_gz" > "$patch"
actual_patch="$(sha256sum "$patch" | awk '{print $1}')"
[[ "$actual_patch" == "$expected_patch" ]] || {
  echo "Wave 34 patch mismatch: expected=$expected_patch actual=$actual_patch" >&2
  exit 1
}
mapfile -t actual_patch_paths < <(git apply --numstat "$patch" | cut -f3 | sort)
mapfile -t sorted_patch_paths < <(printf '%s\n' "${expected_patch_paths[@]}" | sort)
[[ "${actual_patch_paths[*]}" == "${sorted_patch_paths[*]}" ]] || {
  printf 'Wave 34 patch path drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_patch_paths[*]}" "${actual_patch_paths[*]}" >&2
  exit 1
}

[[ -f "$permanent_workflow" ]] || { echo 'Wave 34 permanent workflow absent' >&2; exit 1; }
actual_workflow="$(sha256sum "$permanent_workflow" | awk '{print $1}')"
[[ "$actual_workflow" == "$expected_workflow" ]] || {
  echo "Wave 34 permanent workflow drift: expected=$expected_workflow actual=$actual_workflow" >&2
  exit 1
}

git apply --index --whitespace=error "$patch"
rm -f "${parts[@]}" "$trigger" "$export_trigger" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A

node --check tools/build-lake-allocator-war-schema-joins-wave-34.mjs
node --check tools/validate-lake-allocator-war-schema-joins-wave-34.mjs
node --check test/lake-allocator-war-schema-joins-wave-34.test.js
node - <<'NODE'
const fs = require('node:fs');
for (const relative of [
  'package.json',
  'data/project/lake-allocator-war-wave-21-policy.json',
  'data/project/lake-index-policy.json',
  'data/project/lake-basin-registry.json',
  'data/project/lake-allocator-war-schema-joins-wave-34-policy.json',
  'data/project/lake-allocator-war-schema-joins-wave-34-plan.json'
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
  node tools/validate-lake-allocator-war-schema-joins-wave-34.mjs
}

seal_fixed_point() {
  local label="$1"
  local previous=''
  local current=''
  for pass in 1 2 3 4; do
    echo "Wave 34 ${label} fixed-point pass ${pass}"
    fixed_point_pass
    git add -A
    current="$(git write-tree)"
    if [[ "$pass" -ge 2 && "$current" == "$previous" ]]; then
      echo "Wave 34 ${label} fixed point reached: ${current}"
      return 0
    fi
    previous="$current"
  done
  echo "Wave 34 ${label} did not reach a two-pass tree fixed point" >&2
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

[[ -n "$(git status --porcelain)" ]] || { echo 'Wave 34 materializer produced no change' >&2; exit 1; }
git commit -m 'Materialize allocator-war source schemas and lawful joins Wave 34'
sealed_tree="$(git rev-parse HEAD^{tree})"
sealed_commit="$(git rev-parse HEAD)"

# Reconstruct the committed epoch from source after deleting ignored products.
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
  echo "Wave 34 restored tree mismatch: sealed=$sealed_tree restored=$restored_tree" >&2
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
  echo 'Wave 34 committed epoch became dirty during read-only validation' >&2
  exit 1
}
[[ "$sealed_tree" == "$(git rev-parse HEAD^{tree})" ]] || {
  echo 'Wave 34 committed tree changed during read-only validation' >&2
  exit 1
}

# Refuse to publish over any descendant or sibling head.
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || {
  echo "Wave 34 stale-head refusal: remote=$remote_head parent=$parent_head" >&2
  exit 1
}
git push origin "HEAD:$branch"
echo "Wave 34 sealed checkpoint published: $(git rev-parse HEAD)"
