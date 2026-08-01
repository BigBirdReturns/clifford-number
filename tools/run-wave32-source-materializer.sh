#!/usr/bin/env bash
set -euo pipefail
branch='agent/lake-allocator-war-snapshot-wave-32'
parts=(
  '.github/tmp/wave32-source.part-00'
  '.github/tmp/wave32-source.part-01'
  '.github/tmp/wave32-source.part-02'
  '.github/tmp/wave32-source.part-03'
  '.github/tmp/wave32-source.part-04'
  '.github/tmp/wave32-source.part-05'
  '.github/tmp/wave32-source.part-06'
  '.github/tmp/wave32-source.part-07'
  '.github/tmp/wave32-source.part-08'
  '.github/tmp/wave32-source.part-09'
)
trigger='.github/tmp/wave32-source-trigger.json'
runner='tools/run-wave32-source-materializer.sh'
archive='/tmp/wave32-source.tar.gz'
b64='/tmp/wave32-source.tar.gz.b64'
stage='/tmp/wave32-source'
expected_archive='25c1cea4adde79a0ebbc4d5f0327c787310aeaa50c633df28fc97af2ccbe4042'
expected_b64='eed50ae1dba876ccef97a8e5bd51ae89e164bdd487980113a6dbdedbfc9449f1'

for part in "${parts[@]}"; do wc -c "$part"; sha256sum "$part"; done
cat "${parts[@]}" > "$b64"
actual_b64="$(sha256sum "$b64" | awk '{print $1}')"
[[ "$actual_b64" == "$expected_b64" ]] || { echo "Wave 32 source carrier hash mismatch: expected=$expected_b64 actual=$actual_b64" >&2; exit 1; }
base64 -d "$b64" > "$archive"
actual_archive="$(sha256sum "$archive" | awk '{print $1}')"
[[ "$actual_archive" == "$expected_archive" ]] || { echo "Wave 32 source archive hash mismatch" >&2; exit 1; }

rm -rf "$stage"
mkdir -p "$stage"
tar -xzf "$archive" -C "$stage"

expected_paths=(
  '.github/workflows/lake-allocator-war-bounded-source-snapshots-wave-32.yml'
  'BUILD-INSTRUCTIONS.md'
  'README.md'
  'package.json'
  'data/project/lake-allocator-war-wave-21-policy.json'
  'tools/install-lake-allocator-war-wave-21.mjs'
  'tools/validate-lake-allocator-war-wave-21.mjs'
  'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json'
  'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-plan.json'
  'tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs'
  'tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs'
  'tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs'
  'test/lake-allocator-war-bounded-source-snapshots-wave-32.test.js'
  'docs/methods/lake-allocator-war-bounded-source-snapshots-wave-32.md'
  'docs/milestones/lake-allocator-war-bounded-source-snapshots-wave-32.md'
)
mapfile -t actual_paths < <(cd "$stage" && find . -type f -printf '%P\n' | sort)
mapfile -t sorted_expected < <(printf '%s\n' "${expected_paths[@]}" | sort)
[[ "${actual_paths[*]}" == "${sorted_expected[*]}" ]] || { printf 'Wave 32 source archive path drift\nexpected:\n%s\nactual:\n%s\n' "${sorted_expected[*]}" "${actual_paths[*]}" >&2; exit 1; }

for relative in "${expected_paths[@]}"; do
  mkdir -p "$(dirname "$relative")"
  cp "$stage/$relative" "$relative"
done

node --check tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
node --check tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
node --check tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs
node --check test/lake-allocator-war-bounded-source-snapshots-wave-32.test.js
node --check tools/install-lake-allocator-war-wave-21.mjs
node --check tools/validate-lake-allocator-war-wave-21.mjs
node -e "for (const p of ['package.json','data/project/lake-allocator-war-wave-21-policy.json','data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json','data/project/lake-allocator-war-bounded-source-snapshots-wave-32-plan.json']) JSON.parse(require('fs').readFileSync(p,'utf8'));"

rm -f "${parts[@]}" "$trigger" "$runner"
rmdir .github/tmp 2>/dev/null || true

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
[[ -n "$(git status --porcelain)" ]] || { echo 'Wave 32 source materializer produced no change' >&2; exit 1; }
git commit -m 'Install allocator-war bounded source snapshots Wave 32 surface'
git fetch origin "$branch"
remote_head="$(git rev-parse FETCH_HEAD)"
parent_head="$(git rev-parse HEAD^)"
[[ "$remote_head" == "$parent_head" ]] || { echo "Wave 32 source stale-head refusal: remote=$remote_head parent=$parent_head" >&2; exit 1; }
git push origin "HEAD:$branch"
