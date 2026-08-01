#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-gap-fanout-wave-30'
carrier='.github/tmp/wave30-source-no-workflow.b64'
trigger='.github/tmp/wave30-source-surface-trigger.json'
temporary_workflow='.github/workflows/temporary-wave30-source-surface-materializer.yml'
runner='tools/run-wave30-source-surface-materializer.sh'
base64_sha='bf548f9b839ed1c24e9868d2622df4c4c1ea9a45fdd19412d66eab8628affc27'
archive_sha='bf09659dcd76eee23cd7d9af117281bb9e4076a716ce334d142f1a3ff358bfb1'

for path in "$carrier" "$trigger" "$runner"; do
  test -f "$path"
done
test ! -e "$temporary_workflow"
original_sha="$(git rev-parse HEAD)"

cp "$carrier" /tmp/wave30-source-no-workflow.tar.gz.b64
echo "$base64_sha  /tmp/wave30-source-no-workflow.tar.gz.b64" | sha256sum -c -
base64 -d /tmp/wave30-source-no-workflow.tar.gz.b64 > /tmp/wave30-source-no-workflow.tar.gz
echo "$archive_sha  /tmp/wave30-source-no-workflow.tar.gz" | sha256sum -c -

rm -rf /tmp/wave30-source
mkdir -p /tmp/wave30-source
tar -xzf /tmp/wave30-source-no-workflow.tar.gz -C /tmp/wave30-source
mapfile -t archive_paths < <(tar -tzf /tmp/wave30-source-no-workflow.tar.gz | sed -e '/\/$/d' -e 's#^\./##' | sort)
expected_paths=(build.mjs method.md milestone.md test.js validate.mjs)
mapfile -t expected_sorted < <(printf '%s\n' "${expected_paths[@]}" | sort)
test "${#archive_paths[@]}" = "${#expected_sorted[@]}"
for index in "${!expected_sorted[@]}"; do
  test "${archive_paths[$index]}" = "${expected_sorted[$index]}"
done

install -m 0644 /tmp/wave30-source/build.mjs tools/build-lake-allocator-war-gap-fanout-wave-30.mjs
install -m 0644 /tmp/wave30-source/validate.mjs tools/validate-lake-allocator-war-gap-fanout-wave-30.mjs
install -m 0644 /tmp/wave30-source/test.js test/lake-allocator-war-gap-fanout-wave-30.test.js
install -m 0644 /tmp/wave30-source/method.md docs/methods/lake-allocator-war-gap-fanout-wave-30.md
install -m 0644 /tmp/wave30-source/milestone.md docs/milestones/lake-allocator-war-gap-fanout-wave-30.md

node --check tools/build-lake-allocator-war-gap-fanout-wave-30.mjs
node --check tools/validate-lake-allocator-war-gap-fanout-wave-30.mjs
node --check test/lake-allocator-war-gap-fanout-wave-30.test.js
node -e "const p=JSON.parse(require('fs').readFileSync('data/project/lake-allocator-war-gap-fanout-wave-30-policy.json','utf8')); if(p.assignments.length!==38||p.route_classes.length!==7) throw new Error('Wave 30 source policy denominator drift')"

rm -f "$carrier" "$trigger" "$temporary_workflow" "$runner"
git add -A
git diff --cached --check
for path in "$carrier" "$trigger" "$temporary_workflow" "$runner"; do
  test ! -e "$path"
done

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'Install allocator-war gap fan-out Wave 30 source surface'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
