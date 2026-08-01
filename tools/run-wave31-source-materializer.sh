#!/usr/bin/env bash
set -euo pipefail
branch='agent/lake-allocator-war-public-routes-wave-31'
carrier='.github/tmp/wave31-source.tar.gz.b64'
trigger='.github/tmp/wave31-source-trigger.json'
runner='tools/run-wave31-source-materializer.sh'
archive='/tmp/wave31-source.tar.gz'
stage='/tmp/wave31-source'
expected_archive='233761215938a029474d015c6b2fcf34d8b88b45a467976cc8ba81fdcd1d3763'
expected_b64='6f5c6bb8975e632a8563e16871c8ca3cb35b085723085f0fcbf3efdcd67dc319'

actual_b64="$(sha256sum "$carrier" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || { echo "Wave 31 source carrier hash mismatch" >&2; exit 1; }
base64 -d "$carrier" > "$archive"
actual_archive="$(sha256sum "$archive" | awk '{print $1}')"
[[ "$actual_archive" == "$expected_archive" ]] || { echo "Wave 31 source archive hash mismatch" >&2; exit 1; }

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
[[ "${actual_paths[*]}" == "${sorted_expected[*]}" ]] || { printf 'Wave 31 source archive path drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_expected[*]}" "${actual_paths[*]}" >&2; exit 1; }

for relative in "${expected_paths[@]}"; do
  mkdir -p "$(dirname "$relative")"
  cp "$stage/$relative" "$relative"
done

node --check tools/build-lake-allocator-war-public-route-execution-wave-31.mjs
node --check tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs
node --check test/lake-allocator-war-public-route-execution-wave-31.test.js
node -e "JSON.parse(require('fs').readFileSync('data/project/lake-allocator-war-public-route-execution-wave-31-policy.json','utf8')); JSON.parse(require('fs').readFileSync('data/project/lake-allocator-war-public-route-execution-wave-31-source-plan.json','utf8'));"

rm -f "$carrier" "$trigger" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
[[ -n "$(git status --porcelain)" ]] || { echo 'Wave 31 source materializer produced no change' >&2; exit 1; }
git commit -m 'Install allocator-war public-route Wave 31 source surface'
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || { echo "Wave 31 source stale-head refusal: remote=$remote_head parent=$parent_head" >&2; exit 1; }
git push origin "HEAD:$branch"
