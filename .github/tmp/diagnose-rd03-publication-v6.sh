#!/usr/bin/env bash
set -Euo pipefail

export TARGET_BRANCH='agent/ssc-rd-wave02-rd03-negotiated-terms'
export EXPECTED_TARGET_HEAD='e70aec0f6809c77e198e0c4ee80f6bcadb6bbdc4'
export EXPECTED_MAIN_HEAD='a7940aa81b07caff1a9c2f8548c88ec37d60d676'
export QUALIFICATION_ARTIFACT_ID='8879304041'
export QUALIFICATION_ARTIFACT_SHA256='dd2d89caa7af2e8f6680d50491106b75cc8987ce498f0e255abe1d3791d733cf'
export QUALIFICATION_RECEIPT_SHA256='f2a14aafb4a2404b7d1b153c79eb021c137307334ff0b1b06907d2bbb95a68a9'
export PRODUCT_ARCHIVE_SHA256='5bec4818703a0495281278095356f57cd748ca580f2791e164a0e548b792961e'
export PRODUCT_PATHS_SHA256='49b59803c72ccdb0964b8b4bbdb88cac39b2b9ce21625704d013bd300e1983d4'
export EXPECTED_CANDIDATE_TREE='aef4ca876130c49084a62ef51232c9d28b6ed267'
export R019='data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/source-custody/public-record-census-v1/routes/RD03-CENSUS-R019/attempt-1/body.bin'
export R019_BYTES='5234'
export R019_SHA256='ca367be4eaba072d50128f104dd70d7338942ecac932e34925862893cf6b77c9'
export R019_BLOB='40827488d04ea18c9609559592d49e3d93aeac9a'

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${RUNNER_TEMP:?RUNNER_TEMP is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GITHUB_ENV:?GITHUB_ENV is required}"

OUT="$RUNNER_TEMP/rd03-publication-diagnostic-v6-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
QUALIFIED="$RUNNER_TEMP/rd03-qualified-v6-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
ARCHIVE="$RUNNER_TEMP/rd03-qualified-v6-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}.zip"
CURRENT_STEP='initialize'
mkdir -p "$OUT" "$QUALIFIED"
exec > >(tee "$OUT/trace.log") 2>&1
PS4='+${LINENO}: '
set -x

capture_state() {
  local rc="$1"
  set +e +x
  trap - EXIT
  printf '%s\n' "$rc" > "$OUT/exit-code.txt"
  printf '%s\n' "$CURRENT_STEP" > "$OUT/final-step.txt"
  printf '%s\n' "$EXPECTED_MAIN_HEAD" > "$OUT/expected-main.txt"
  printf '%s\n' "$EXPECTED_TARGET_HEAD" > "$OUT/expected-target.txt"
  git rev-parse HEAD > "$OUT/head.txt" 2>&1 || true
  git rev-parse 'HEAD^{tree}' > "$OUT/head-tree.txt" 2>&1 || true
  git status --porcelain=v1 --untracked-files=all > "$OUT/status.txt" 2>&1 || true
  git diff --cached --name-status > "$OUT/staged-name-status.txt" 2>&1 || true
  git diff --cached --name-only | sort > "$OUT/staged-paths.txt" 2>&1 || true
  git ls-files --stage -- "$R019" > "$OUT/r019-index.txt" 2>&1 || true
  if test -e "$R019"; then
    wc -c < "$R019" > "$OUT/r019-bytes.txt" 2>&1 || true
    sha256sum "$R019" > "$OUT/r019-sha256.txt" 2>&1 || true
    git hash-object "$R019" > "$OUT/r019-hash-object.txt" 2>&1 || true
  fi
  git write-tree > "$OUT/write-tree.txt" 2>&1 || true
  git rev-parse refs/remotes/origin/main > "$OUT/fetched-main.txt" 2>&1 || true
  git rev-parse "refs/remotes/origin/$TARGET_BRANCH" > "$OUT/fetched-target.txt" 2>&1 || true
  git ls-remote --heads origin refs/heads/main > "$OUT/remote-main.txt" 2>&1 || true
  git ls-remote --heads origin "refs/heads/$TARGET_BRANCH" > "$OUT/remote-target.txt" 2>&1 || true
  if test -f "$QUALIFIED/product-paths.txt"; then
    cp "$QUALIFIED/product-paths.txt" "$OUT/expected-product-paths.txt"
    diff -u "$QUALIFIED/product-paths.txt" "$OUT/staged-paths.txt" > "$OUT/path-diff.txt" 2>&1 || true
  fi
  python - "$OUT" "$rc" "$CURRENT_STEP" <<'PY'
import hashlib, json, sys
from pathlib import Path
out=Path(sys.argv[1])
record={
  'schema_version':'ssc-rd03-publication-diagnostic-v6@1',
  'exit_code':int(sys.argv[2]),
  'final_step':sys.argv[3],
  'outside_human_dependency':False,
  'external_contacts':0,
  'external_reviews':0,
  'publication_effect':'none',
  'adoption_effect':'none',
  'graph_effect':'none',
}
(out/'diagnostic.json').write_text(json.dumps(record,indent=2)+'\n')
for path in sorted(out.iterdir()):
  if path.is_file() and not path.name.endswith('.sha256'):
    (out/(path.name+'.sha256')).write_text(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name+'\n')
PY
  printf 'DIAGNOSTIC_DIR=%s\n' "$OUT" >> "$GITHUB_ENV"
  exit "$rc"
}
trap 'capture_state $?' EXIT

CURRENT_STEP='download-qualification-artifact'
curl --fail --location --retry 3 \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/artifacts/$QUALIFICATION_ARTIFACT_ID/zip" \
  -o "$ARCHIVE"
echo "$QUALIFICATION_ARTIFACT_SHA256  $ARCHIVE" | sha256sum -c -
unzip -q "$ARCHIVE" -d "$QUALIFIED"
echo "$QUALIFICATION_RECEIPT_SHA256  $QUALIFIED/receipt.json" | sha256sum -c -
echo "$PRODUCT_ARCHIVE_SHA256  $QUALIFIED/permanent-product.tar.gz" | sha256sum -c -
echo "$PRODUCT_PATHS_SHA256  $QUALIFIED/product-paths.txt" | sha256sum -c -

CURRENT_STEP='verify-and-fetch-leases'
git fetch --no-tags origin \
  "+refs/heads/main:refs/remotes/origin/main" \
  "+refs/heads/${TARGET_BRANCH}:refs/remotes/origin/${TARGET_BRANCH}"
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN_HEAD"
test "$(git rev-parse "origin/${TARGET_BRANCH}")" = "$EXPECTED_TARGET_HEAD"
test "$(git ls-remote --heads origin refs/heads/main | cut -f1)" = "$EXPECTED_MAIN_HEAD"
test "$(git ls-remote --heads origin "refs/heads/${TARGET_BRANCH}" | cut -f1)" = "$EXPECTED_TARGET_HEAD"

CURRENT_STEP='create-two-parent-integration'
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git checkout -B rd03-publication-diagnostic-v6 "$EXPECTED_MAIN_HEAD"
git merge --no-ff --no-commit "$EXPECTED_TARGET_HEAD"
printf '%s\n' \
  'data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/field-matrix.json' \
  'data/project/ssc-residual-wave02/seeds/RD-03-C04.json' \
  'test/status-sovereignty-rd-wave02-rd03-field-matrix.test.js' \
  'tools/acquisition/status-sovereignty-rd-wave02-rd03/build-field-matrix.mjs' \
  'tools/acquisition/status-sovereignty-rd-wave02-rd03/validate-field-matrix.mjs' \
  > "$OUT/integration-paths.expected"
git diff --cached --name-only | sort > "$OUT/integration-paths.actual"
cmp "$OUT/integration-paths.expected" "$OUT/integration-paths.actual"
test -z "$(git diff --cached --name-status | awk '$1 != "A" {print}')"
git commit -m 'Diagnostic two-parent RD-03 integration'
INTEGRATION_COMMIT="$(git rev-parse HEAD)"
printf '%s\n' "$INTEGRATION_COMMIT" > "$OUT/integration-commit.txt"
test "$(git rev-parse "$INTEGRATION_COMMIT^1")" = "$EXPECTED_MAIN_HEAD"
test "$(git rev-parse "$INTEGRATION_COMMIT^2")" = "$EXPECTED_TARGET_HEAD"

CURRENT_STEP='extract-qualified-product'
tar -xzf "$QUALIFIED/permanent-product.tar.gz" -C .
test -f "$R019"
test "$(wc -c < "$R019")" = "$R019_BYTES"
echo "$R019_SHA256  $R019" | sha256sum -c -
test "$(git hash-object "$R019")" = "$R019_BLOB"

CURRENT_STEP='ordinary-explicit-staging'
CENSUS_ROOT='data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/source-custody/public-record-census-v1'
EXECUTION_RECEIPT='data/intake/status-sovereignty-rd-wave02-rd03-negotiated-terms/public-record-census-execution-receipt.json'
git add -- \
  "$CENSUS_ROOT" \
  "$EXECUTION_RECEIPT" \
  .github/workflows/status-sovereignty-rd-wave02-rd03-negotiated-terms.yml \
  docs/milestones/ssc-rd-wave02-rd03-negotiated-terms.md \
  schemas/status-sovereignty-rd-wave02-rd03-negotiated-terms.schema.json \
  test/status-sovereignty-rd-wave02-rd03-negotiated-terms.test.js \
  tools/build-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs \
  tools/validate-status-sovereignty-rd-wave02-rd03-negotiated-terms.mjs \
  data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms \
  data/project/ssc-residual-wave02/closures/RD-03-C04.json
git diff --cached --name-only | sort > "$OUT/ordinary-staged-paths.txt"
git ls-files --stage -- "$R019" > "$OUT/r019-index-before-repair.txt"

CURRENT_STEP='exact-r019-index-repair'
if ! git diff --cached --name-only -- "$R019" | grep -Fxq "$R019"; then
  blob="$(git hash-object -w -- "$R019")"
  test "$blob" = "$R019_BLOB"
  git update-index --add --cacheinfo "100644,$blob,$R019"
fi
EXPECTED_STAGE="$(printf '100644 %s 0\t%s' "$R019_BLOB" "$R019")"
ACTUAL_STAGE="$(git ls-files --stage -- "$R019")"
printf '%s\n' "$EXPECTED_STAGE" > "$OUT/r019-index-expected.txt"
printf '%s\n' "$ACTUAL_STAGE" > "$OUT/r019-index-after-repair.txt"
test "$ACTUAL_STAGE" = "$EXPECTED_STAGE"

CURRENT_STEP='compare-276-path-denominator'
git diff --cached --name-only | sort > "$OUT/staged-paths-after-repair.txt"
diff -u "$QUALIFIED/product-paths.txt" "$OUT/staged-paths-after-repair.txt" > "$OUT/path-diff-after-repair.txt" || {
  cat "$OUT/path-diff-after-repair.txt"
  exit 31
}
test "$(wc -l < "$OUT/staged-paths-after-repair.txt")" = 276
test -z "$(git diff --cached --name-status | awk '$1 != "A" {print}')"

CURRENT_STEP='compare-qualified-tree'
WRITTEN_TREE="$(git write-tree)"
printf '%s\n' "$WRITTEN_TREE" > "$OUT/write-tree-before-commit.txt"
test "$WRITTEN_TREE" = "$EXPECTED_CANDIDATE_TREE"

CURRENT_STEP='create-diagnostic-product-commit'
git commit -m 'Diagnostic exact RD-03 product tree'
PRODUCT_COMMIT="$(git rev-parse HEAD)"
PRODUCT_TREE="$(git rev-parse 'HEAD^{tree}')"
printf '%s\n' "$PRODUCT_COMMIT" > "$OUT/product-commit.txt"
printf '%s\n' "$PRODUCT_TREE" > "$OUT/product-tree.txt"
test "$PRODUCT_TREE" = "$EXPECTED_CANDIDATE_TREE"

CURRENT_STEP='diagnostic-complete'
capture_state 0
