#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-join-requirements-wave-35'
base_head='301a88403b959704d655f13be079746e214af1c8'
expected_source_tree='9d777017a3a3fce113dddd1acca35b5ce42c43ba'
parts=(
  '.github/tmp/wave35-materialize.chunk-00'
  '.github/tmp/wave35-materialize.chunk-01'
  '.github/tmp/wave35-materialize.chunk-02'
  '.github/tmp/wave35-materialize.chunk-03'
  '.github/tmp/wave35-materialize.chunk-04'
  '.github/tmp/wave35-materialize.chunk-05'
  '.github/tmp/wave35-materialize.chunk-06'
  '.github/tmp/wave35-materialize.chunk-07'
  '.github/tmp/wave35-materialize.chunk-08'
  '.github/tmp/wave35-materialize.chunk-09'
)
trigger='.github/tmp/wave35-tree-export-trigger.json'
runner='tools/run-wave35-materializer.sh'
temporary_workflow='.github/workflows/temporary-wave35-materializer.yml'
b64='/tmp/wave35-source.patch.gz.b64'
patch_gz='/tmp/wave35-source.patch.gz'
patch='/tmp/wave35-source.patch'
expected_b64='20a9513d38e07eb420e80151cc5eed662a8d7c6c4e5cc7cfe00cd1f48d58922b'
expected_patch_gz='0f457cb0abe52fd65c5d80c8b450e2d1ec26ed75857bc6c3c25d6d0acb6ce691'
expected_patch='5839197df581c6c4e1a41eca93f64c78d369b461b90427de79cd8b8f2499e493'
expected_part_hashes=(
  '4b36c63cace24734bc39deb8228dd1847507844b63abccbebbd5853026dd49ca'
  '0755d43a13561ea27925a15f7bd6bd80c36b97977ff0f996a8c900a9ac464b16'
  '509e3fba2b778b2f46dd8aa9fe3fe9d9aca0b0aee8593f259e8c9188a9e29791'
  'bab76df9a6a63e9ed1b7e830a105b6176f488b11b76ba406267116aab1d6dcf1'
  '232d4d93cd049443de41c9a1653eaca19a0b7518d3a8546a8421221c7c55eda3'
  '0d3d8381a41aed421542effc0405d46ffefbb95ca49367053c8a67edeffe0370'
  '94e57145499f5c22df94a6653513f66d041d775e3e0cf9e2ae2f8b5a07ec4249'
  'b4c44c7bdbc5f42bba8f40ac6872cd01a94cfc35c357bda61514ff390becf201'
  '19e54f05c9c76427b8e504e016854571848bea0375a3c39b2cf400714cecb22e'
  '6f48cac2b007afedb53b7ff536e04ab4b4e55fa5c7a742464a21ec4cfd84579b'
)
expected_patch_paths=(
  '.github/tmp/wave35-tree-export-trigger.json'
  '.github/workflows/lake-allocator-war-join-requirements-wave-35.yml'
  'BUILD-INSTRUCTIONS.md'
  'README.md'
  'build/lake-actions/allocator-war-join-requirements-wave-35.json'
  'data/acquisition/lake-allocator-war-wave-35/affected-comparator-and-distributional-joins.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/correction-dockets-and-outcomes.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/financial-recovery-and-continuity.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/internal-authority-and-inventory.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/protected-personnel-records.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/public-award-and-contract-denominators.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/published-enforcement-and-action-registers.jsonl'
  'data/project/lake-allocator-war-join-requirements-wave-35-policy.json'
  'data/project/lake-allocator-war-wave-21-policy.json'
  'data/project/lake-basin-registry.json'
  'data/project/lake-index-policy.json'
  'docs/methods/lake-allocator-war-join-requirements-wave-35.md'
  'docs/milestones/lake-allocator-war-join-requirements-wave-35.md'
  'package.json'
  'reports/lake-allocator-war-join-requirements-wave-35.md'
  'test/lake-allocator-war-join-requirements-wave-35.test.js'
  'tools/build-lake-allocator-war-join-requirements-wave-35.mjs'
  'tools/install-lake-allocator-war-wave-21.mjs'
  'tools/validate-lake-allocator-war-join-requirements-wave-35.mjs'
  'tools/validate-lake-allocator-war-wave-21.mjs'
)
expected_transport_paths=(
  '.github/tmp/wave35-materialize.chunk-00'
  '.github/tmp/wave35-materialize.chunk-01'
  '.github/tmp/wave35-materialize.chunk-02'
  '.github/tmp/wave35-materialize.chunk-03'
  '.github/tmp/wave35-materialize.chunk-04'
  '.github/tmp/wave35-materialize.chunk-05'
  '.github/tmp/wave35-materialize.chunk-06'
  '.github/tmp/wave35-materialize.chunk-07'
  '.github/tmp/wave35-materialize.chunk-08'
  '.github/tmp/wave35-materialize.chunk-09'
  'tools/run-wave35-materializer.sh'
)
expected_final_paths=(
  '.github/tmp/wave35-tree-export-trigger.json'
  '.github/workflows/lake-allocator-war-join-requirements-wave-35.yml'
  'BUILD-INSTRUCTIONS.md'
  'README.md'
  'build/axm-identity.json'
  'build/build-hop-report.json'
  'build/canonical-subject-projection-wave-13.json'
  'build/hop-graph.json'
  'build/lake-actions/allocator-war-join-requirements-wave-35.json'
  'build/lake-actions/allocator-war-wave-21-reconciliation.json'
  'build/lake-actions/allocator-war-wave-21.json'
  'build/lake-actions/canonical-subject-projection-wave-13.json'
  'build/lake-actions/generator-contracts-wave-19-reconciliation.json'
  'build/lake-actions/identifier-topology-wave-18-reconciliation.json'
  'build/lake-actions/subject-integration-wave-16.json'
  'build/lake-index/basin-gaps.jsonl'
  'build/lake-index/basin-manifest.json'
  'build/lake-index/basin-membership.jsonl'
  'build/lake-index/basins.json'
  'build/lake-index/files.jsonl'
  'build/lake-index/gap-summary.json'
  'build/lake-index/id-gaps.jsonl'
  'build/lake-index/manifest.json'
  'build/lake-index/objects.jsonl'
  'build/lake-index/summary.json'
  'build/migration-review.md'
  'build/migration-summary.json'
  'build/receipt-graph.json'
  'build/scores.json'
  'build/scout-report.json'
  'build/scout-report.md'
  'build/subject-integration-wave-16.json'
  'build/surface-graph.json'
  'data/acquisition/lake-allocator-war-wave-35/affected-comparator-and-distributional-joins.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/correction-dockets-and-outcomes.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/financial-recovery-and-continuity.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/internal-authority-and-inventory.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/protected-personnel-records.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/public-award-and-contract-denominators.jsonl'
  'data/acquisition/lake-allocator-war-wave-35/published-enforcement-and-action-registers.jsonl'
  'data/project/lake-allocator-war-join-requirements-wave-35-policy.json'
  'data/project/lake-allocator-war-wave-21-policy.json'
  'data/project/lake-allocator-war-wave-21.json'
  'data/project/lake-basin-registry.json'
  'data/project/lake-generator-contracts-wave-19.json'
  'data/project/lake-identifier-topology-wave-18.json'
  'data/project/lake-index-policy.json'
  'docs/methods/lake-allocator-war-join-requirements-wave-35.md'
  'docs/milestones/lake-allocator-war-join-requirements-wave-35.md'
  'package.json'
  'reports/lake-allocator-war-join-requirements-wave-35.md'
  'reports/lake-basin-index.md'
  'reports/lake-canonical-subject-projection-wave-13.md'
  'reports/lake-index-census.md'
  'reports/lake-index-gap-summary.md'
  'reports/lake-subject-integration-wave-16.md'
  'test/lake-allocator-war-join-requirements-wave-35.test.js'
  'tools/build-lake-allocator-war-join-requirements-wave-35.mjs'
  'tools/install-lake-allocator-war-wave-21.mjs'
  'tools/validate-lake-allocator-war-join-requirements-wave-35.mjs'
  'tools/validate-lake-allocator-war-wave-21.mjs'
)

git merge-base --is-ancestor "$base_head" HEAD || {
  echo "Wave 35 materializer base is not an ancestor of HEAD: $base_head" >&2
  exit 1
}
[[ ! -e "$temporary_workflow" ]] || {
  echo 'temporary Wave 35 materializer workflow survived checkout' >&2
  exit 1
}
mapfile -t actual_transport < <(git diff --name-only "$base_head"...HEAD | sort)
mapfile -t sorted_transport < <(printf '%s\n' "${expected_transport_paths[@]}" | sort)
[[ "${actual_transport[*]}" == "${sorted_transport[*]}" ]] || {
  printf 'Wave 35 materializer transport scope drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_transport[*]}" "${actual_transport[*]}" >&2
  exit 1
}

for index in "${!parts[@]}"; do
  part="${parts[$index]}"
  actual="$(sha256sum "$part" | awk '{print $1}')"
  [[ "$actual" == "${expected_part_hashes[$index]}" ]] || {
    echo "Wave 35 carrier mismatch: part=$part expected=${expected_part_hashes[$index]} actual=$actual" >&2
    exit 1
  }
done
cat "${parts[@]}" > "$b64"
actual_b64="$(sha256sum "$b64" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || {
  echo "Wave 35 Base64 mismatch: expected=$expected_b64 actual=$actual_b64" >&2
  exit 1
}
base64 -d "$b64" > "$patch_gz"
actual_patch_gz="$(sha256sum "$patch_gz" | awk '{print $1}')"
[[ "$actual_patch_gz" == "$expected_patch_gz" ]] || {
  echo "Wave 35 compressed patch mismatch: expected=$expected_patch_gz actual=$actual_patch_gz" >&2
  exit 1
}
gzip -dc "$patch_gz" > "$patch"
actual_patch="$(sha256sum "$patch" | awk '{print $1}')"
[[ "$actual_patch" == "$expected_patch" ]] || {
  echo "Wave 35 patch mismatch: expected=$expected_patch actual=$actual_patch" >&2
  exit 1
}
mapfile -t actual_patch_paths < <(git apply --numstat "$patch" | cut -f3 | sort)
mapfile -t sorted_patch_paths < <(printf '%s\n' "${expected_patch_paths[@]}" | sort)
[[ "${actual_patch_paths[*]}" == "${sorted_patch_paths[*]}" ]] || {
  printf 'Wave 35 patch path drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_patch_paths[*]}" "${actual_patch_paths[*]}" >&2
  exit 1
}

git apply --index --whitespace=error "$patch"
rm -f "${parts[@]}" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
source_tree="$(git write-tree)"
[[ "$source_tree" == "$expected_source_tree" ]] || {
  echo "Wave 35 source tree mismatch: expected=$expected_source_tree actual=$source_tree" >&2
  exit 1
}
node --check tools/build-lake-allocator-war-join-requirements-wave-35.mjs
node --check tools/validate-lake-allocator-war-join-requirements-wave-35.mjs
node --check test/lake-allocator-war-join-requirements-wave-35.test.js

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
  node tools/validate-lake-allocator-war-join-requirements-wave-35.mjs
}

seal_fixed_point() {
  local label="$1"
  local previous=''
  local current=''
  for pass in 1 2 3 4; do
    echo "Wave 35 $label fixed-point pass $pass"
    fixed_point_pass
    git add -A
    current="$(git write-tree)"
    if [[ "$pass" -ge 2 && "$current" == "$previous" ]]; then
      echo "Wave 35 $label fixed point reached: $current"
      return 0
    fi
    previous="$current"
  done
  echo "Wave 35 $label did not reach a two-pass tree fixed point" >&2
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
  node tools/validate-lake-allocator-war-join-requirements-wave-35.mjs
  node test/lake-allocator-war-join-requirements-wave-35.test.js
}

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-join-requirements-wave-35.mjs
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

mapfile -t actual_final_paths < <(git diff --name-only "$base_head" | sort)
mapfile -t sorted_final_paths < <(printf '%s\n' "${expected_final_paths[@]}" | sort)
[[ "${actual_final_paths[*]}" == "${sorted_final_paths[*]}" ]] || {
  printf 'Wave 35 permanent scope drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_final_paths[*]}" "${actual_final_paths[*]}" >&2
  exit 1
}
[[ -n "$(git status --porcelain)" ]] || {
  echo 'Wave 35 materializer produced no change' >&2
  exit 1
}

git commit -m 'Fan out allocator-war lawful join requirements Wave 35'
sealed_commit="$(git rev-parse HEAD)"
sealed_tree="$(git rev-parse HEAD^{tree})"

# Rebuild the committed epoch from source and require exact tree equality.
git reset --hard HEAD
git clean -fdx
node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-join-requirements-wave-35.mjs
git add -A
seal_fixed_point 'restored-epoch'
shard_and_validate
focused_validate
git diff --check
git add -A
restored_tree="$(git write-tree)"
[[ "$restored_tree" == "$sealed_tree" ]] || {
  echo "Wave 35 restored tree mismatch: sealed=$sealed_tree restored=$restored_tree" >&2
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
  echo 'Wave 35 committed epoch became dirty during read-only validation' >&2
  exit 1
}
[[ "$sealed_tree" == "$(git rev-parse HEAD^{tree})" ]] || {
  echo 'Wave 35 committed tree changed during read-only validation' >&2
  exit 1
}

# Refuse publication over a descendant or sibling head.
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || {
  echo "Wave 35 stale-head refusal: remote=$remote_head parent=$parent_head" >&2
  exit 1
}
git push origin "HEAD:$branch"
echo "Wave 35 permanent checkpoint published: $(git rev-parse HEAD)"
