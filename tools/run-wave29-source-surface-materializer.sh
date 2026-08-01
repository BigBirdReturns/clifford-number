#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-public-interest-execution-wave-29'
segments='.github/tmp/wave29-source-surface'
trigger='.github/tmp/wave29-source-surface-trigger.json'
temporary_workflow='.github/workflows/temporary-wave29-source-surface-materializer.yml'
runner='tools/run-wave29-source-surface-materializer.sh'
base64_sha='36d777b90f63e0b41b2bc7f65b4edd3c3c2b8c2c6302a81126fa4088c01c1d0e'
archive_sha='59b29c2056b05552a6d3955627cbd816766b2791fe8fc201c088bb86b618e796'

test -d "$segments"
test -f "$trigger"
test ! -e "$temporary_workflow"
original_sha="$(git rev-parse HEAD)"

find "$segments" -maxdepth 1 -type f -name 'seg-*.b64' -print | sort > /tmp/wave29-segment-list
segment_count="$(wc -l < /tmp/wave29-segment-list | tr -d ' ')"
test "$segment_count" = '11'
xargs cat < /tmp/wave29-segment-list > /tmp/wave29-source-surface.tar.gz.b64
test "$(wc -c < /tmp/wave29-source-surface.tar.gz.b64 | tr -d ' ')" = '30068'
echo "$base64_sha  /tmp/wave29-source-surface.tar.gz.b64" | sha256sum -c -
base64 -d /tmp/wave29-source-surface.tar.gz.b64 > /tmp/wave29-source-surface.tar.gz
echo "$archive_sha  /tmp/wave29-source-surface.tar.gz" | sha256sum -c -

mapfile -t archive_paths < <(tar -tzf /tmp/wave29-source-surface.tar.gz | sed '/\/$/d' | sort)
expected_paths=(
  '.github/workflows/lake-allocator-war-public-interest-execution-wave-29.yml'
  'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json'
  'docs/methods/lake-allocator-war-public-interest-execution-wave-29.md'
  'docs/milestones/lake-allocator-war-public-interest-execution-wave-29.md'
  'test/lake-allocator-war-public-interest-execution-wave-29.test.js'
  'tools/build-lake-allocator-war-public-interest-execution-wave-29.mjs'
  'tools/validate-lake-allocator-war-public-interest-execution-wave-29.mjs'
)
mapfile -t expected_sorted < <(printf '%s\n' "${expected_paths[@]}" | sort)
test "${#archive_paths[@]}" = "${#expected_sorted[@]}"
for index in "${!expected_sorted[@]}"; do
  test "${archive_paths[$index]}" = "${expected_sorted[$index]}"
done

tar -xzf /tmp/wave29-source-surface.tar.gz -C .
node --check tools/build-lake-allocator-war-public-interest-execution-wave-29.mjs
node --check tools/validate-lake-allocator-war-public-interest-execution-wave-29.mjs
node --check test/lake-allocator-war-public-interest-execution-wave-29.test.js
node -e "JSON.parse(require('fs').readFileSync('data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json','utf8'))"

rm -rf "$segments"
rm -f "$trigger" "$temporary_workflow" "$runner"
git add -A
git diff --cached --check
for path in "$segments" "$trigger" "$temporary_workflow" "$runner"; do
  test ! -e "$path"
done

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'Install allocator-war public-interest execution Wave 29 source surface'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
