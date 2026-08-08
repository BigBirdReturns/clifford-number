#!/usr/bin/env bash
set -uo pipefail

OUT="${RUNNER_TEMP}/ssc-rd04-postpromotion-four-cell-promotion-stager-v1"
PRODUCT="$OUT/product"
WT="$OUT/worktree"
rm -rf "$OUT"
mkdir -p "$PRODUCT"
exec > >(tee "$OUT/stager.log") 2>&1
stage=bootstrap

finalize() {
  set +e
  (cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS)
}

on_error() {
  local code=$?
  trap - ERR
  set +e
  printf '%s\n' "$code" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  jq -n \
    --arg stage "$stage" \
    --argjson exit_code "$code" \
    --arg parent "$PRODUCT_PARENT" \
    --arg carrier_head "$(git rev-parse HEAD 2>/dev/null || true)" \
    '{schema_version:"ssc-rd04-postpromotion-four-cell-promotion-stager@1",state:"failed_closed",failed_or_final_stage:$stage,exit_code:$exit_code,product_parent:$parent,carrier_head:(if $carrier_head=="" then null else $carrier_head end),permanent_product_paths:14,matrix_updates:0,field_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",source_requests_executed:0,route_executions:0,product_authority_created:false}' > "$OUT/receipt.json"
  finalize
  exit "$code"
}
trap on_error ERR
set -Eeuo pipefail

stage=bind_carrier_and_live_main
test "${EVENT_NAME:-}" != pull_request || test "${PR_HEAD_REF:-}" = "$CARRIER_BRANCH"
test "$(git rev-parse HEAD^)" = "$PRODUCT_PARENT"
test "$(git rev-list --count "$PRODUCT_PARENT"..HEAD)" -eq 1
cat > "$OUT/expected-carrier-paths.txt" <<EOF_PATHS
$CARRIER_SCRIPT_PATH
$CARRIER_WORKFLOW_PATH
$CHUNK_DIR/part-00.b64
$CHUNK_DIR/part-01.b64
$CHUNK_DIR/part-02.b64
$CHUNK_DIR/part-03.b64
EOF_PATHS
LC_ALL=C sort -o "$OUT/expected-carrier-paths.txt" "$OUT/expected-carrier-paths.txt"
git diff --name-only --diff-filter=ACDMRTUXB "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/actual-carrier-paths.txt"
git diff --name-only --diff-filter=A "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/added-carrier-paths.txt"
diff -u "$OUT/expected-carrier-paths.txt" "$OUT/actual-carrier-paths.txt"
diff -u "$OUT/expected-carrier-paths.txt" "$OUT/added-carrier-paths.txt"
git diff --check "$PRODUCT_PARENT" HEAD
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$PRODUCT_PARENT"
test -z "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH")"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH")"

stage=reconstruct_and_authenticate_product_archive
cat > "$OUT/chunk-ledger.tsv" <<'EOF_CHUNKS'
part-00.b64	20000	9d9ab6a6f7b048f423cb67dbf0476ab6fbd03b53b7be3eb35e9de171de31b16b
part-01.b64	20000	a81a96b46d5976981eb8f9560cd53e8246feb8996a597808f0df3f9b2c9fe30b
part-02.b64	20000	3f6dcf7d6d1f83b736f0801f5b3e63a867b384d44165f4fc2c475a4b4ea302b0
part-03.b64	15896	2d45731cc39983056ba532db93ecdfc53069b597bff291c707221a56d08c19f5
EOF_CHUNKS
: > "$OUT/product.tar.xz.b64"
while IFS=$'\t' read -r name bytes digest; do
  test "$(stat -c %s "$CHUNK_DIR/$name")" -eq "$bytes"
  test "$(sha256sum "$CHUNK_DIR/$name" | cut -d' ' -f1)" = "$digest"
  cat "$CHUNK_DIR/$name" >> "$OUT/product.tar.xz.b64"
done < "$OUT/chunk-ledger.tsv"
test "$(stat -c %s "$OUT/product.tar.xz.b64")" -eq 75896
test "$(sha256sum "$OUT/product.tar.xz.b64" | cut -d' ' -f1)" = 7f63763d5e1e1392418411a42441b26ecca314c71957db7c3ae1767c2d15693c
base64 -d "$OUT/product.tar.xz.b64" > "$OUT/product.tar.xz"
test "$(stat -c %s "$OUT/product.tar.xz")" -eq 56920
test "$(sha256sum "$OUT/product.tar.xz" | cut -d' ' -f1)" = 8f9399a250db7e36fcea25f0c33f3762e1e85afe1d0f2af40d789a0c2721e433

cat > "$OUT/product-paths.txt" <<'EOF_PATHS'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.yml
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/cell-promotion-ledger.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/index.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/product-manifest.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promoted-partial-field-matrix.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promotion-decisions.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promotion-input-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promotion-summary.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/remaining-open-field-census.json
docs/milestones/ssc-rd-wave03-rd04-postpromotion-four-cell-promotion.md
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.schema.json
test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
EOF_PATHS
cat > "$OUT/file-ledger.tsv" <<'EOF_LEDGER'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.yml	6415	cfe4dd1664d7e84b4e7aded11810cb41416536208a9ae065b2000ab7ee55c650	963682f980f2725669dcb66e87100a6b45b9139e
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/cell-promotion-ledger.json	43205	4b2b478f1260d947723ccf99adad2b66e503807582fd92845e1b61dd8ff46693	4e2f528bdf11c02ed945ee95e10ac8a962642863
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/index.json	1855	68aa1bcaff386c62380d418b3a1d7e096caf8b2265cc1e4ec2a7f2da4f35dbd6	0d59b935f8e61e640954f81fd2f7c44b06266447
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/product-manifest.json	5848	26af14f451b25bc99bb9f00c0b531913aa402c7d1915b659c2ddc4185b9329f7	75164179b66a1a2934f93dac08ea821399184adf
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promoted-partial-field-matrix.json	477363	0e61600064296e14176b5cd43bb9e4e1d52b9f435d40ca4888175f98ca087182	66896190dd575f9867f1e121d845acfb4d27f56f
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promotion-decisions.json	12486	a88e3e38380867d9d3a6a97dbfe57d267f8c05ecbcdc61dc81a4a71b0ca4b3e6	49a0fd9d47d418cc338713f7c56d5c7439518643
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promotion-input-custody.json	4058	d829b8282869d620888c755412316ba8fc2940a43c929893cb3e91038b800b67	cf10c4e21392deb8463244a09d3cd6c644fca9f3
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promotion-summary.json	2501	86892565253c78017f89999b492190ac3fac77f46ddb920dd7b6720f67fffc34	5e0adc541a22c9b0bf4cd8a059bf083e08831a15
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/remaining-open-field-census.json	28633	17f8484b176a31afef185a389ce396baba5d9fddd4da704151b4338fdd3ee73b	d7f13b904875fee36b464fa033ead4967e12057f
docs/milestones/ssc-rd-wave03-rd04-postpromotion-four-cell-promotion.md	1906	286fcca1bfee59b7d73c714676617e7de6c43821a88da14ab9c36938dcbbbde2	1161ee8b14ee9ee1827838e79c374f1dc1892ea7
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.schema.json	819621	a5b3f54d33e27427ac74ffabed5db918affbfcf00a6cc6b8d4e06f825a6fec70	f807c33d28d67ea94d6878bab1c26d422f43cb5f
test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js	8411	7803e10034193336dc452771df848b10a6eeac0cfa7648a665c4a689bcdbac61	9254fb8808ddb37c8753ceb19c2a1966decf935a
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs	35872	d1985eb8bdf171662512521538060a2b7b8b1c5127cc453264be0790b85b4ef4	98bc8123a20e23b0739baf3c27dec4312440dde9
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs	17900	b20a9af3c43a27820e278480b1f02ffaf52e03782d524c90a0903f119082c177	4c40d30eb8e79284c47245d275fe3d0b50a834f8
EOF_LEDGER
python - "$OUT/product.tar.xz" "$PRODUCT" "$OUT/product-paths.txt" <<'PY'
import pathlib, sys, tarfile
archive, root, paths = map(pathlib.Path, sys.argv[1:])
expected = paths.read_text().splitlines()
with tarfile.open(archive, 'r:xz') as tf:
    actual = []
    for member in tf.getmembers():
        name = member.name.removeprefix('./')
        if not name:
            continue
        if not member.isfile() or name.startswith('/') or '..' in pathlib.PurePosixPath(name).parts:
            raise SystemExit(f'unsafe archive member: {member.name}')
        actual.append(name)
    if actual != expected:
        raise SystemExit(f'archive path denominator differs: {actual}')
    tf.extractall(root, filter='data')
PY
while IFS=$'\t' read -r rel bytes digest blob; do
  test "$(stat -c %s "$PRODUCT/$rel")" -eq "$bytes"
  test "$(sha256sum "$PRODUCT/$rel" | cut -d' ' -f1)" = "$digest"
  test "$(git hash-object "$PRODUCT/$rel")" = "$blob"
done < "$OUT/file-ledger.tsv"

stage=construct_and_qualify_full_candidate
git worktree add --detach "$WT" "$PRODUCT_PARENT"
(cd "$PRODUCT" && tar -cf - .) | (cd "$WT" && tar -xf -)
cd "$WT"
git add -A
git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m 'Promote four RD-04 postpromotion field cells' >/dev/null
FULL_COMMIT="$(git rev-parse HEAD)"
FULL_TREE="$(git rev-parse 'HEAD^{tree}')"
test "$(git rev-parse HEAD^)" = "$PRODUCT_PARENT"
git diff --name-only --diff-filter=A "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/full-candidate-added-paths.txt"
git diff --name-only --diff-filter=ACDMRTUXB "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/full-candidate-all-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/full-candidate-added-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/full-candidate-all-paths.txt"
test "$(wc -l < "$OUT/full-candidate-added-paths.txt")" -eq 14
git diff --check "$PRODUCT_PARENT" HEAD
printf '%s\n' "$FULL_COMMIT" > "$OUT/full-candidate-commit.txt"
printf '%s\n' "$FULL_TREE" > "$OUT/full-candidate-tree.txt"

python -m pip install --disable-pip-version-check --no-input 'PyYAML==6.0.2' 'jsonschema==4.25.1'
python -c "import yaml; yaml.safe_load(open('$PRODUCT_WORKFLOW'))"
node --check "$PRODUCT_BUILDER"
node --check "$PRODUCT_VALIDATOR"
node --check "$PRODUCT_TEST"
node "$PRODUCT_BUILDER"
python - <<'PY'
import json
from pathlib import Path
from jsonschema import Draft202012Validator
schema = json.loads(Path('schemas/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)
root = Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion')
for name in ['promotion-input-custody.json','promotion-decisions.json','cell-promotion-ledger.json','promoted-partial-field-matrix.json','remaining-open-field-census.json','promotion-summary.json','index.json','product-manifest.json']:
    errors = sorted(validator.iter_errors(json.loads((root/name).read_text())), key=lambda e: list(e.path))
    if errors:
        raise SystemExit(f'{name}: {errors[0].message} at {list(errors[0].path)}')
print('recursive_schema_validation=pass objects=8')
PY
node "$PRODUCT_VALIDATOR"
node "$PRODUCT_TEST"
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
npm run release:check

git reset --hard "$FULL_COMMIT"
git clean -fdx
node "$PRODUCT_BUILDER"
node "$PRODUCT_VALIDATOR"
node "$PRODUCT_TEST"
node tools/validate-no-magic-human-gate.mjs
git diff --check
git diff --exit-code
test -z "$(git status --porcelain=v1 --untracked-files=all)"
while IFS=$'\t' read -r rel bytes digest blob; do
  test "$(stat -c %s "$WT/$rel")" -eq "$bytes"
  test "$(sha256sum "$WT/$rel" | cut -d' ' -f1)" = "$digest"
  test "$(git hash-object "$WT/$rel")" = "$blob"
done < "$OUT/file-ledger.tsv"

stage=publish_ordinary_staging_commit
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$PRODUCT_PARENT"
test -z "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH")"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH")"
git reset --hard "$PRODUCT_PARENT"
git clean -fdx
(cd "$PRODUCT" && tar -cf - .) | tar -xf -
mkdir -p "$(dirname "$STAGED_WORKFLOW")"
mv "$PRODUCT_WORKFLOW" "$STAGED_WORKFLOW"
git add -A
git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m 'Stage exact RD-04 four-cell promotion ordinary blobs' >/dev/null
STAGING_COMMIT="$(git rev-parse HEAD)"
STAGING_TREE="$(git rev-parse 'HEAD^{tree}')"
test "$(git rev-parse HEAD^)" = "$PRODUCT_PARENT"
cat > "$OUT/expected-staging-paths.txt" <<EOF_STAGING
$STAGED_WORKFLOW
$(grep -v -F "$PRODUCT_WORKFLOW" "$OUT/product-paths.txt")
EOF_STAGING
LC_ALL=C sort -o "$OUT/expected-staging-paths.txt" "$OUT/expected-staging-paths.txt"
git diff --name-only --diff-filter=A "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/staging-added-paths.txt"
git diff --name-only --diff-filter=ACDMRTUXB "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/staging-all-paths.txt"
diff -u "$OUT/expected-staging-paths.txt" "$OUT/staging-added-paths.txt"
diff -u "$OUT/expected-staging-paths.txt" "$OUT/staging-all-paths.txt"
test "$(wc -l < "$OUT/staging-added-paths.txt")" -eq 14
test "$(git hash-object "$STAGED_WORKFLOW")" = 963682f980f2725669dcb66e87100a6b45b9139e
git push origin "HEAD:refs/heads/$STAGING_BRANCH"
test "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')" = "$STAGING_COMMIT"
printf '%s\n' "$STAGING_COMMIT" > "$OUT/staging-commit.txt"
printf '%s\n' "$STAGING_TREE" > "$OUT/staging-tree.txt"

stage=complete
cd - >/dev/null
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
jq -n \
  --arg parent "$PRODUCT_PARENT" \
  --arg parent_tree "$PRODUCT_PARENT_TREE" \
  --arg carrier_head "$(git rev-parse HEAD)" \
  --arg archive_sha256 '8f9399a250db7e36fcea25f0c33f3762e1e85afe1d0f2af40d789a0c2721e433' \
  --arg full_commit "$FULL_COMMIT" \
  --arg full_tree "$FULL_TREE" \
  --arg staging_branch "$STAGING_BRANCH" \
  --arg staging_commit "$STAGING_COMMIT" \
  --arg staging_tree "$STAGING_TREE" \
  '{schema_version:"ssc-rd04-postpromotion-four-cell-promotion-stager@1",state:"qualified_staging_published",failed_or_final_stage:"complete",exit_code:0,product_parent:$parent,product_parent_tree:$parent_tree,carrier_head:$carrier_head,product_archive_sha256:$archive_sha256,permanent_product_paths:14,qualified_full_candidate_commit:$full_commit,qualified_full_candidate_tree:$full_tree,staging_branch:$staging_branch,staging_commit:$staging_commit,staging_tree:$staging_tree,staging_paths:14,permanent_workflow_omitted_from_staging:true,permanent_workflow_git_blob:"963682f980f2725669dcb66e87100a6b45b9139e",candidate_findings_promoted:4,unique_cells_terminalized:4,terminal_cells_before:222,terminal_cells_after:226,open_substantive_cells_before:188,open_substantive_cells_after:184,terminal_units_before:10,terminal_units_after:10,held_north_dakota_cells:2,source_requests_executed:0,route_executions:0,matrix_updates_created_by_stager:0,field_terminalizations_created_by_stager:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",product_authority_created:false,connector_final_assembly_required:true}' > "$OUT/receipt.json"
cp "$OUT/product.tar.xz" "$OUT/qualified-product.tar.xz"
finalize
