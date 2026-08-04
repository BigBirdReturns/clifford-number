#!/usr/bin/env bash
set -Eeuo pipefail

export TARGET_BRANCH='agent/ssc-rd-wave02-rd03-negotiated-terms'
export EXPECTED_TARGET_HEAD='e70aec0f6809c77e198e0c4ee80f6bcadb6bbdc4'
export EXPECTED_MAIN_HEAD='a7940aa81b07caff1a9c2f8548c88ec37d60d676'
export QUALIFICATION_RUN_ID='30875262352'
export QUALIFICATION_ARTIFACT_ID='8879304041'
export QUALIFICATION_ARTIFACT_SHA256='dd2d89caa7af2e8f6680d50491106b75cc8987ce498f0e255abe1d3791d733cf'
export QUALIFICATION_RECEIPT_SHA256='f2a14aafb4a2404b7d1b153c79eb021c137307334ff0b1b06907d2bbb95a68a9'
export PRODUCT_ARCHIVE_SHA256='5bec4818703a0495281278095356f57cd748ca580f2791e164a0e548b792961e'
export PRODUCT_PATHS_SHA256='49b59803c72ccdb0964b8b4bbdb88cac39b2b9ce21625704d013bd300e1983d4'
export PACKAGE_MANIFEST_SHA256='9c9209d361475abc7387a1a6f41fba9a28ec41b56a11cb8b2816dc4f000683bc'
export EXPECTED_CANDIDATE_TREE='aef4ca876130c49084a62ef51232c9d28b6ed267'
export EXPECTED_QUALIFICATION_INTEGRATION='f654dd5555649d9d795942de160b6b37b3b08a97'
export EXPECTED_QUALIFICATION_CANDIDATE='3506de15302b1e42f743c42063315c4205890de1'
export PACKAGE_ZIP_SHA256='c4a55ee9059a898292d4c56640978fb09b2b6debf66c8fb1b6bede49766fa656'
export PACKAGE_BASE64_SHA256='ec425c1a30aef16969ba3b4dca2a4c3ebe2ba0dab272a394dd4f32b2a9931c68'
export CENSUS_ARTIFACT_SHA256='5b5414816cb626a7d9bbe16d914f67d5d02d1233c6ca0d84e21930909eba5f08'
export CENSUS_MANIFEST_SHA256='0bcee2db7be4904f775c55a2533a2a5f1c199edff47e273993925b742f24ac06'

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

qualified="$RUNNER_TEMP/rd03-qualified-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
archive="$RUNNER_TEMP/rd03-qualified-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}.zip"
out="$RUNNER_TEMP/rd03-qualified-publication-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
rm -rf "$qualified" "$archive" "$out"
mkdir -p "$qualified" "$out"

curl --fail --location --retry 3 \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/artifacts/$QUALIFICATION_ARTIFACT_ID/zip" \
  -o "$archive"
echo "$QUALIFICATION_ARTIFACT_SHA256  $archive" | sha256sum -c -
unzip -q "$archive" -d "$qualified"
echo "$QUALIFICATION_RECEIPT_SHA256  $qualified/receipt.json" | sha256sum -c -
echo "$PRODUCT_ARCHIVE_SHA256  $qualified/permanent-product.tar.gz" | sha256sum -c -
echo "$PRODUCT_PATHS_SHA256  $qualified/product-paths.txt" | sha256sum -c -
echo "$PACKAGE_MANIFEST_SHA256  $qualified/package-manifest.json" | sha256sum -c -
echo "$PACKAGE_ZIP_SHA256  $qualified/authored.zip" | sha256sum -c -
echo "$PACKAGE_BASE64_SHA256  $qualified/authored.b64" | sha256sum -c -

QUALIFIED_DIR="$qualified" python - <<'PY'
import json, os
from pathlib import Path
root=Path(os.environ['QUALIFIED_DIR'])
receipt=json.loads((root/'receipt.json').read_text())
expected={
  'schema_version':'ssc-rd03-authored-rebuild-qualification@1',
  'main_parent':os.environ['EXPECTED_MAIN_HEAD'],
  'source_parent':os.environ['EXPECTED_TARGET_HEAD'],
  'integration_commit':os.environ['EXPECTED_QUALIFICATION_INTEGRATION'],
  'candidate_commit':os.environ['EXPECTED_QUALIFICATION_CANDIDATE'],
  'candidate_tree':os.environ['EXPECTED_CANDIDATE_TREE'],
  'product_paths':276,
  'package_zip_sha256':os.environ['PACKAGE_ZIP_SHA256'],
  'package_base64_sha256':os.environ['PACKAGE_BASE64_SHA256'],
  'census_artifact_sha256':os.environ['CENSUS_ARTIFACT_SHA256'],
  'census_manifest_sha256':os.environ['CENSUS_MANIFEST_SHA256'],
  'focused_validation':'pass',
  'adversarial_mutations':94,
  'complete_release_gate':'pass',
  'deterministic_replay':'pass',
  'outside_human_dependency':False,
  'external_contacts':0,
  'external_reviews':0,
  'publication_effect':'none',
  'adoption_effect':'none',
  'graph_effect':'none',
}
assert receipt == expected, (receipt, expected)
paths=(root/'product-paths.txt').read_text().splitlines()
assert len(paths)==276
assert paths==sorted(paths)
assert len(paths)==len(set(paths))
PY

git fetch --no-tags origin \
  "+refs/heads/main:refs/remotes/origin/main" \
  "+refs/heads/${TARGET_BRANCH}:refs/remotes/origin/${TARGET_BRANCH}"
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN_HEAD"
test "$(git rev-parse origin/${TARGET_BRANCH})" = "$EXPECTED_TARGET_HEAD"
test "$(git ls-remote --heads origin refs/heads/main | cut -f1)" = "$EXPECTED_MAIN_HEAD"
test "$(git ls-remote --heads origin refs/heads/${TARGET_BRANCH} | cut -f1)" = "$EXPECTED_TARGET_HEAD"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git checkout -B rd03-qualified-publication "$EXPECTED_MAIN_HEAD"
git merge --no-ff --no-commit "$EXPECTED_TARGET_HEAD"
printf '%s\n' \
  'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json' \
  'data/project/ssc-residual-wave02/seeds/RD-03-C04.json' \
  'test/status-sovereignty-rd-wave02-rd03-field-matrix.test.js' \
  'tools/acquisition/status-sovereignty-rd-wave02-rd03/build-field-matrix.mjs' \
  'tools/acquisition/status-sovereignty-rd-wave02-rd03/validate-field-matrix.mjs' \
  > "$RUNNER_TEMP/rd03-integration-paths.expected"
git diff --cached --name-only | sort > "$RUNNER_TEMP/rd03-integration-paths.actual"
cmp "$RUNNER_TEMP/rd03-integration-paths.expected" "$RUNNER_TEMP/rd03-integration-paths.actual"
test -z "$(git diff --cached --name-status | awk '$1 != "A" {print}')"
git diff --cached --check
git commit -m 'Integrate qualified current main with RD-03 acquisition lineage'
integration_commit="$(git rev-parse HEAD)"
test "$(git rev-list --parents -n 1 "$integration_commit" | wc -w)" = 3
test "$(git rev-parse "$integration_commit^1")" = "$EXPECTED_MAIN_HEAD"
test "$(git rev-parse "$integration_commit^2")" = "$EXPECTED_TARGET_HEAD"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

test -f "$qualified/permanent-product.tar.gz"
test -f "$qualified/product-paths.txt"
tar -xzf "$qualified/permanent-product.tar.gz" -C .
git add -A
git diff --cached --name-only | sort > "$RUNNER_TEMP/rd03-product-paths.actual"
cmp "$qualified/product-paths.txt" "$RUNNER_TEMP/rd03-product-paths.actual"
test "$(wc -l < "$RUNNER_TEMP/rd03-product-paths.actual")" = 276
test -z "$(git diff --cached --name-status | awk '$1 != "A" {print}')"
git diff --cached --check
git commit -m 'Close RD-03 negotiated-term public-record obligation'
product_commit="$(git rev-parse HEAD)"
product_tree="$(git rev-parse HEAD^{tree})"
test "$product_tree" = "$EXPECTED_CANDIDATE_TREE"

node tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs --check
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs
npm run release:check

git reset --hard HEAD
git clean -fdx
node tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs --check
node tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs
node test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js
node tools/validate-no-magic-human-gate.mjs
git diff --exit-code
test -z "$(git status --porcelain=v1 --untracked-files=all)"

test "$(git ls-remote --heads origin refs/heads/main | cut -f1)" = "$EXPECTED_MAIN_HEAD"
test "$(git ls-remote --heads origin refs/heads/${TARGET_BRANCH} | cut -f1)" = "$EXPECTED_TARGET_HEAD"
test "$(git rev-parse HEAD)" = "$product_commit"
test "$(git rev-parse HEAD^{tree})" = "$product_tree"
git push origin \
  "$product_commit:refs/heads/${TARGET_BRANCH}" \
  --force-with-lease="refs/heads/${TARGET_BRANCH}:${EXPECTED_TARGET_HEAD}"
test "$(git ls-remote --heads origin refs/heads/${TARGET_BRANCH} | cut -f1)" = "$product_commit"

cp "$qualified/receipt.json" "$out/qualification-receipt.json"
cp "$qualified/product-paths.txt" "$out/product-paths.txt"
cp "$qualified/package-manifest.json" "$out/package-manifest.json"
OUT="$out" \
INTEGRATION_COMMIT="$integration_commit" \
PRODUCT_COMMIT="$product_commit" \
PRODUCT_TREE="$product_tree" \
python - <<'PY'
import hashlib, json, os
from pathlib import Path
out=Path(os.environ['OUT'])
receipt={
  'schema_version':'ssc-rd03-qualified-publication@1',
  'publication_run':int(os.environ['GITHUB_RUN_ID']),
  'qualification_run':int(os.environ['QUALIFICATION_RUN_ID']),
  'qualification_artifact_id':int(os.environ['QUALIFICATION_ARTIFACT_ID']),
  'qualification_artifact_sha256':os.environ['QUALIFICATION_ARTIFACT_SHA256'],
  'main_parent':os.environ['EXPECTED_MAIN_HEAD'],
  'source_parent':os.environ['EXPECTED_TARGET_HEAD'],
  'integration_commit':os.environ['INTEGRATION_COMMIT'],
  'product_commit':os.environ['PRODUCT_COMMIT'],
  'product_tree':os.environ['PRODUCT_TREE'],
  'product_paths':276,
  'focused_validation':'pass',
  'adversarial_mutations':94,
  'complete_release_gate':'pass',
  'deterministic_replay':'pass',
  'main_lease_preserved':True,
  'target_lease_preserved':True,
  'outside_human_dependency':False,
  'external_contacts':0,
  'external_reviews':0,
  'publication_effect':'none',
  'adoption_effect':'none',
  'graph_effect':'none',
}
payload=(json.dumps(receipt,indent=2)+'\n').encode()
(out/'publication-receipt.json').write_bytes(payload)
for path in sorted(out.iterdir()):
    if path.is_file():
        (out/(path.name+'.sha256')).write_text(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name+'\n')
PY

echo "PUBLICATION_RECEIPT_DIR=$out" >> "$GITHUB_ENV"
echo "INTEGRATION_COMMIT=$integration_commit" >> "$GITHUB_ENV"
echo "PRODUCT_COMMIT=$product_commit" >> "$GITHUB_ENV"
echo "PRODUCT_TREE=$product_tree" >> "$GITHUB_ENV"
