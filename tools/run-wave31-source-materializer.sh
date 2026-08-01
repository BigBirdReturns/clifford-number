#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-public-routes-wave-31'
trigger='.github/tmp/wave31-source-trigger.json'
runner='tools/run-wave31-source-materializer.sh'
legacy_carrier='.github/tmp/wave31-source.tar.gz.b64'
combined='/tmp/wave31-source.tar.gz.b64'
archive='/tmp/wave31-source.tar.gz'
stage='/tmp/wave31-source'
expected_archive='233761215938a029474d015c6b2fcf34d8b88b45a467976cc8ba81fdcd1d3763'
expected_b64='6f5c6bb8975e632a8563e16871c8ca3cb35b085723085f0fcbf3efdcd67dc319'
segments=(
  '.github/tmp/wave31-source.part-00'
  '.github/tmp/wave31-source.part-01'
  '.github/tmp/wave31-source.part-02'
  '.github/tmp/wave31-source.part-03'
)
segment_hashes=(
  '1f23bb8a73bd4848425e96c3b7fbc920281770b3cc39d6daa47505b09c8bfa44'
  '44f9e28f39b8f53f2b7a748cd7a7fa3c09ec52e0f2aa261c4d0265b940def60c'
  '6168bd813f5aa952bba286c73522267115ff82b8c87394d6dd02ea6b398cd521'
  'ab03be1777364bd99ee543ef4c3983b10d7ad5cf8188cd91ce3c7df1c4c4d2eb'
)

for index in "${!segments[@]}"; do
  segment="${segments[$index]}"
  expected="${segment_hashes[$index]}"
  actual="$(sha256sum "$segment" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || {
    echo "Wave 31 source segment $index hash mismatch: expected=$expected actual=$actual" >&2
    exit 1
  }
done

cat "${segments[@]}" > "$combined"
actual_b64="$(sha256sum "$combined" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || {
  echo "Wave 31 combined source carrier hash mismatch: expected=$expected_b64 actual=$actual_b64" >&2
  exit 1
}

base64 -d "$combined" > "$archive"
actual_archive="$(sha256sum "$archive" | awk '{print $1}')"
[[ "$actual_archive" == "$expected_archive" ]] || {
  echo "Wave 31 source archive hash mismatch: expected=$expected_archive actual=$actual_archive" >&2
  exit 1
}

rm -rf "$stage"
mkdir -p "$stage"
tar -xzf "$archive" -C "$stage"

expected_paths=(
  'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json'
  'data/project/lake-allocator-war-public-route-execution-wave-31-source-plan.json'
  'tools/build-lake-allocator-war-public-route-execution-wave-31.mjs'
  'tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs'
  'test/lake-allocator-war-public-route-execution-wave-31.test.js'
  'docs/methods/lake-allocator-war-public-route-execution-wave-31.md'
  'docs/milestones/lake-allocator-war-public-route-execution-wave-31.md'
)
mapfile -t actual_paths < <(cd "$stage" && find . -type f -printf '%P\n' | sort)
mapfile -t sorted_expected < <(printf '%s\n' "${expected_paths[@]}" | sort)
[[ "${actual_paths[*]}" == "${sorted_expected[*]}" ]] || {
  printf 'Wave 31 source archive path drift\nexpected:\n%s\nactual:\n%s\n' \
    "${sorted_expected[*]}" "${actual_paths[*]}" >&2
  exit 1
}

for relative in "${expected_paths[@]}"; do
  mkdir -p "$(dirname "$relative")"
  cp "$stage/$relative" "$relative"
done

node --check tools/build-lake-allocator-war-public-route-execution-wave-31.mjs
node --check tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs
node --check test/lake-allocator-war-public-route-execution-wave-31.test.js
node -e "JSON.parse(require('fs').readFileSync('data/project/lake-allocator-war-public-route-execution-wave-31-policy.json','utf8')); JSON.parse(require('fs').readFileSync('data/project/lake-allocator-war-public-route-execution-wave-31-source-plan.json','utf8'));"

rm -f "$legacy_carrier" "$trigger" "$runner" "${segments[@]}"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
[[ -n "$(git status --porcelain)" ]] || {
  echo 'Wave 31 source materializer produced no change' >&2
  exit 1
}
git commit -m 'Install allocator-war public-route Wave 31 source surface'
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || {
  echo "Wave 31 source stale-head refusal: remote=$remote_head parent=$parent_head" >&2
  exit 1
}
git push origin "HEAD:$branch"
