#!/usr/bin/env bash
set -uo pipefail

OUT="${RUNNER_TEMP}/ssc-rd04-postpromotion-four-cell-promotion-materializer-v2"
WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-four-cell-promotion-materializer-v2-wt"
CWT="${RUNNER_TEMP}/ssc-rd04-postpromotion-four-cell-promotion-materializer-v2-candidate-wt"
rm -rf "$OUT" "$WT" "$CWT"
mkdir -p "$OUT"
exec > >(tee "$OUT/materialization.log") 2>&1
stage=bootstrap

finalize() {
  set +e
  (
    cd "$OUT"
    find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 |
      LC_ALL=C sort -z |
      xargs -0 sha256sum > SHA256SUMS
  )
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
    '{
      schema_version:"ssc-rd04-postpromotion-four-cell-promotion-materializer@2",
      state:"failed_closed",
      failed_or_final_stage:$stage,
      exit_code:$exit_code,
      product_parent:$parent,
      carrier_head:(if $carrier_head=="" then null else $carrier_head end),
      candidate_commit:null,
      candidate_tree:null,
      staging_branch:null,
      permanent_path_count:0,
      matrix_updates:0,
      field_terminalizations:0,
      row_state_mutations:0,
      class_closed:false,
      cumulative_ledger_effect:"none",
      outside_human_dependency:false,
      publication_effect:"none",
      adoption_effect:"none",
      graph_effect:"none"
    }' > "$OUT/materialization-receipt.json"
  finalize
  exit "$code"
}

trap on_error ERR
set -Eeuo pipefail

stage=bind_carrier_and_live_main
if test "$EVENT_NAME" = pull_request; then
  test "$PR_HEAD_REF" = "$CARRIER_BRANCH"
  test "$PR_HEAD_SHA" = "$(git rev-parse HEAD)"
fi
test "$(git rev-parse HEAD^)" = "$PRODUCT_PARENT"
test "$(git rev-parse "$PRODUCT_PARENT^{tree}")" = "$PRODUCT_PARENT_TREE"
test "$(git rev-list --count "$PRODUCT_PARENT"..HEAD)" -eq 1
cat > "$OUT/expected-carrier-paths.txt" <<'EOF_CARRIER'
.github/scripts/temp-materialize-ssc-rd04-postpromotion-four-cell-promotion-v2.sh
.github/workflows/temp-materialize-ssc-rd04-postpromotion-four-cell-promotion-v2.yml
.tmp/rd04-postpromotion-four-cell-promotion-v2/product-static.part-00.b64
.tmp/rd04-postpromotion-four-cell-promotion-v2/product-static.part-01.b64
.tmp/rd04-postpromotion-four-cell-promotion-v2/product-static.part-02.b64
EOF_CARRIER
LC_ALL=C sort -o "$OUT/expected-carrier-paths.txt" "$OUT/expected-carrier-paths.txt"
git diff --name-only "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/actual-carrier-paths.txt"
git diff --name-only --diff-filter=A "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/actual-carrier-additions.txt"
diff -u "$OUT/expected-carrier-paths.txt" "$OUT/actual-carrier-paths.txt"
diff -u "$OUT/expected-carrier-paths.txt" "$OUT/actual-carrier-additions.txt"
test -z "$(git diff --name-only --diff-filter=MD "$PRODUCT_PARENT" HEAD)"
git diff --check "$PRODUCT_PARENT" HEAD
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$PRODUCT_PARENT"
test -z "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main"
test "$(git rev-parse origin/main)" = "$PRODUCT_PARENT"

stage=reconstruct_static_product_archive
cat > "$OUT/expected-payload-parts.tsv" <<'EOF_PARTS'
.tmp/rd04-postpromotion-four-cell-promotion-v2/product-static.part-00.b64	8000	31a8c44f27a15e17e63447c6613161bf9ad9f3d5d67907ff1a7f4fbd6bc1619e
.tmp/rd04-postpromotion-four-cell-promotion-v2/product-static.part-01.b64	8000	63a1ac48481bb5d254701048c7879f8fb5d547a530fd05326a78ca18f4e884d6
.tmp/rd04-postpromotion-four-cell-promotion-v2/product-static.part-02.b64	7356	d36de246ec7fce99144dc07418ffcc7fb5ef746437d16ff40fa08324b4fd413a
EOF_PARTS
: > "$OUT/product-static.tar.xz.b64"
while IFS=$'\t' read -r payload_path expected_bytes expected_sha; do
  test "$(wc -c < "$payload_path")" -eq "$expected_bytes"
  test "$(sha256sum "$payload_path" | awk '{print $1}')" = "$expected_sha"
  cat "$payload_path" >> "$OUT/product-static.tar.xz.b64"
done < "$OUT/expected-payload-parts.tsv"
test "$(wc -c < "$OUT/product-static.tar.xz.b64")" -eq 23356
test "$(sha256sum "$OUT/product-static.tar.xz.b64" | awk '{print $1}')" = 37be980b6b969834be7496d0b6c0e975ea9e620a4801019d30c1a27bf0f860f3
base64 -d "$OUT/product-static.tar.xz.b64" > "$OUT/product-static.tar.xz"
test "$(wc -c < "$OUT/product-static.tar.xz")" -eq 17516
test "$(sha256sum "$OUT/product-static.tar.xz" | awk '{print $1}')" = a1328fff267ee0a083c997d10ca864f25b535a2afe73a75948670624666a48cf
xz -t "$OUT/product-static.tar.xz"
cat > "$OUT/expected-static-paths.txt" <<'EOF_STATIC'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.yml
docs/milestones/ssc-rd-wave03-rd04-postpromotion-four-cell-promotion.md
test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
EOF_STATIC
LC_ALL=C sort -o "$OUT/expected-static-paths.txt" "$OUT/expected-static-paths.txt"
tar -tJf "$OUT/product-static.tar.xz" | LC_ALL=C sort > "$OUT/actual-static-paths.txt"
diff -u "$OUT/expected-static-paths.txt" "$OUT/actual-static-paths.txt"
cat > "$OUT/static-SHA256SUMS" <<'EOF_STATIC_SUMS'
0f5baae8a1b5315df683e7f204d4a03a3b3fddec8bb29c787023d908b91844de  .github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.yml
f0df88e314c0c08d54afaeb76b165f3e65c6e615d465b819bd81c42e7aa9ae22  docs/milestones/ssc-rd-wave03-rd04-postpromotion-four-cell-promotion.md
dce5dc0e47299095040c6a7e0fe28ad238a3a86d7e936efee3f43864267489b1  test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js
d320005c3d3c120a8d220729bd01bed865fde76414ba1bb5ad32d79e3a62e3a5  tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
5b71ddfe565ea0302025ebfb52436dd1ea38451f32bee9b444441245c0f1b3ee  tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs
EOF_STATIC_SUMS

stage=authenticate_validation_artifact
gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$VALIDATION_ARTIFACT/zip" > "$OUT/validation.zip"
test "$(wc -c < "$OUT/validation.zip")" -eq "$VALIDATION_ARTIFACT_BYTES"
test "$(sha256sum "$OUT/validation.zip" | awk '{print $1}')" = "$VALIDATION_ARTIFACT_ZIP_SHA256"
mkdir -p "$OUT/validation"
unzip -q "$OUT/validation.zip" -d "$OUT/validation"
(
  cd "$OUT/validation"
  sha256sum -c SHA256SUMS
)
test "$(sha256sum "$OUT/validation/validation-receipt.json" | awk '{print $1}')" = "$VALIDATION_RECEIPT_SHA256"
test "$(sha256sum "$OUT/validation/candidate-validation-ledger.json" | awk '{print $1}')" = "$VALIDATION_CANDIDATE_LEDGER_SHA256"
test "$(sha256sum "$OUT/validation/input-inventory.json" | awk '{print $1}')" = "$VALIDATION_INPUT_INVENTORY_SHA256"
jq -e \
  --arg parent "$PRODUCT_PARENT" \
  --arg head "$VALIDATION_HEAD" \
  --argjson run "$VALIDATION_RUN" \
  '.state=="validated" and
   .failed_or_final_stage=="complete" and
   .exit_code==0 and
   .execution_parent==$parent and
   .execution_head==$head and
   .workflow_run==$run and
   .candidate_count==4 and
   .admissible_candidate_count==4 and
   .scope_held_candidate_count==0 and
   .unique_candidate_cell_count==4 and
   .validated_open_cell_count==4 and
   .held_cell_count==2 and
   (.validations|length)==4 and
   ([.validations[].route_target_scope_validation]|all(.=="pass")) and
   ([.validations[].source_candidate_field_scope_validation]|all(.=="pass")) and
   .matrix_transition_if_separately_promoted.terminal_cells_before==222 and
   .matrix_transition_if_separately_promoted.terminal_cells_after==226 and
   .matrix_transition_if_separately_promoted.open_substantive_cells_before==188 and
   .matrix_transition_if_separately_promoted.open_substantive_cells_after==184 and
   .matrix_updates==0 and
   .field_terminalizations==0 and
   .row_state_mutations==0 and
   .class_closed==false and
   .cumulative_ledger_effect=="none" and
   .promotion_authority_created==false' \
  "$OUT/validation/validation-receipt.json" > /dev/null

stage=extract_and_build_product
git worktree add --detach "$WT" "$PRODUCT_PARENT"
cd "$WT"
tar -xJf "$OUT/product-static.tar.xz"
sha256sum -c "$OUT/static-SHA256SUMS"
cat > "$OUT/expected-product-paths.txt" <<'EOF_PRODUCT'
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
EOF_PRODUCT
LC_ALL=C sort -o "$OUT/expected-product-paths.txt" "$OUT/expected-product-paths.txt"
node "$BUILDER_PATH"
python -c "import yaml; yaml.safe_load(open('$WORKFLOW_PATH'))"
node --check "$BUILDER_PATH"
node --check "$VALIDATOR_PATH"
node --check "$TEST_PATH"
cat > "$OUT/schema-validation.py" <<'PYSCHEMA'
import json
import os
from pathlib import Path
from jsonschema import Draft202012Validator
schema = json.loads(Path(os.environ['SCHEMA_PATH']).read_text())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)
root = Path(os.environ['OUTPUT_DIR'])
names = [
    'promotion-input-custody.json',
    'promotion-decisions.json',
    'cell-promotion-ledger.json',
    'promoted-partial-field-matrix.json',
    'remaining-open-field-census.json',
    'promotion-summary.json',
    'index.json',
    'product-manifest.json',
]
for name in names:
    value = json.loads((root / name).read_text())
    errors = sorted(validator.iter_errors(value), key=lambda error: list(error.path))
    if errors:
        raise SystemExit(f'{name}: {errors[0].message} at {list(errors[0].path)}')
print(f'recursive_exact_const_schema_validation=pass objects={len(names)}')
PYSCHEMA
python "$OUT/schema-validation.py"
node "$VALIDATOR_PATH"
node "$TEST_PATH"
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
git status --porcelain=v1 --untracked-files=all | awk '{print substr($0,4)}' | LC_ALL=C sort > "$OUT/actual-product-paths.txt"
diff -u "$OUT/expected-product-paths.txt" "$OUT/actual-product-paths.txt"
test "$(wc -l < "$OUT/actual-product-paths.txt")" -eq 14
test -z "$(grep -E '(^|/)(\.tmp|trigger)(/|$)' "$OUT/actual-product-paths.txt" || true)"
git diff --check
tar -cJf "$OUT/product-source.tar.xz" -T "$OUT/expected-product-paths.txt"

stage=complete_repository_release_gate
npm run release:check

stage=clean_parent_replay
git reset --hard "$PRODUCT_PARENT"
git clean -fdx
tar -xJf "$OUT/product-source.tar.xz"
node "$BUILDER_PATH"
python -c "import yaml; yaml.safe_load(open('$WORKFLOW_PATH'))"
python "$OUT/schema-validation.py"
node "$VALIDATOR_PATH"
node "$TEST_PATH"
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
git status --porcelain=v1 --untracked-files=all | awk '{print substr($0,4)}' | LC_ALL=C sort > "$OUT/replay-product-paths.txt"
diff -u "$OUT/expected-product-paths.txt" "$OUT/replay-product-paths.txt"
git diff --check
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$PRODUCT_PARENT"

stage=compose_detached_candidate
INDEX="$OUT/candidate.index"
rm -f "$INDEX"
GIT_INDEX_FILE="$INDEX" git read-tree "$PRODUCT_PARENT"
: > "$OUT/product-blob-ledger.tsv"
while IFS= read -r product_path; do
  blob="$(git hash-object -w "$product_path")"
  GIT_INDEX_FILE="$INDEX" git update-index --add --cacheinfo "100644,$blob,$product_path"
  printf '%s\t%s\n' "$product_path" "$blob" >> "$OUT/product-blob-ledger.tsv"
done < "$OUT/expected-product-paths.txt"
CANDIDATE_TREE="$(GIT_INDEX_FILE="$INDEX" git write-tree)"
export GIT_AUTHOR_NAME='github-actions[bot]'
export GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export GIT_AUTHOR_DATE='2026-08-08T19:00:00Z'
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"
CANDIDATE_COMMIT="$(printf '%s\n' 'Promote four bounded RD-04 postpromotion findings' | git commit-tree "$CANDIDATE_TREE" -p "$PRODUCT_PARENT")"
export CANDIDATE_TREE CANDIDATE_COMMIT
printf '%s\n' "$CANDIDATE_TREE" > "$OUT/candidate-tree.txt"
printf '%s\n' "$CANDIDATE_COMMIT" > "$OUT/candidate-commit.txt"
git worktree add --detach "$CWT" "$CANDIDATE_COMMIT"
test "$(git -C "$CWT" rev-parse HEAD^)" = "$PRODUCT_PARENT"
test "$(git -C "$CWT" rev-parse 'HEAD^{tree}')" = "$CANDIDATE_TREE"
test "$(git -C "$CWT" rev-list --count "$PRODUCT_PARENT"..HEAD)" -eq 1
git -C "$CWT" diff --name-only "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/candidate-paths.txt"
git -C "$CWT" diff --name-only --diff-filter=A "$PRODUCT_PARENT" HEAD | LC_ALL=C sort > "$OUT/candidate-added-paths.txt"
diff -u "$OUT/expected-product-paths.txt" "$OUT/candidate-paths.txt"
diff -u "$OUT/expected-product-paths.txt" "$OUT/candidate-added-paths.txt"
test -z "$(git -C "$CWT" diff --name-only --diff-filter=MD "$PRODUCT_PARENT" HEAD)"
test -z "$(git -C "$CWT" status --porcelain=v1 --untracked-files=all)"

stage=publish_ordinary_staging
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$PRODUCT_PARENT"
test -z "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git push origin "$CANDIDATE_COMMIT:refs/heads/$STAGING_BRANCH"
test "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')" = "$CANDIDATE_COMMIT"

stage=seal_materialization_receipt
mapfile -t product_paths < "$OUT/expected-product-paths.txt"
git -C "$CWT" archive --format=tar HEAD "${product_paths[@]}" | xz -9e > "$OUT/product.tar.xz"
export OUT
python - <<'PYRECEIPT'
import hashlib
import json
import os
from pathlib import Path
out = Path(os.environ['OUT'])
output_dir = Path(os.environ['OUTPUT_DIR'])
manifest = json.loads((output_dir / 'product-manifest.json').read_text())
summary = json.loads((output_dir / 'promotion-summary.json').read_text())
archive = out / 'product.tar.xz'
receipt = {
    'schema_version':'ssc-rd04-postpromotion-four-cell-promotion-materializer@2',
    'state':'qualified_staging_published',
    'failed_or_final_stage':'complete',
    'exit_code':0,
    'issue':1017,
    'product_parent':os.environ['PRODUCT_PARENT'],
    'product_parent_tree':os.environ['PRODUCT_PARENT_TREE'],
    'carrier_head':os.environ['GITHUB_SHA'],
    'candidate_commit':os.environ['CANDIDATE_COMMIT'],
    'candidate_tree':os.environ['CANDIDATE_TREE'],
    'product_branch':os.environ['PRODUCT_BRANCH'],
    'staging_branch':os.environ['STAGING_BRANCH'],
    'carrier_path_count':5,
    'permanent_path_count':14,
    'addition_only':True,
    'modified_paths':0,
    'deleted_paths':0,
    'validation_custody':{
        'workflow_run':int(os.environ['VALIDATION_RUN']),
        'head':os.environ['VALIDATION_HEAD'],
        'artifact_id':int(os.environ['VALIDATION_ARTIFACT']),
        'artifact_bytes':int(os.environ['VALIDATION_ARTIFACT_BYTES']),
        'artifact_zip_sha256':os.environ['VALIDATION_ARTIFACT_ZIP_SHA256'],
        'receipt_sha256':os.environ['VALIDATION_RECEIPT_SHA256'],
    },
    'static_archive_bytes':17516,
    'static_archive_sha256':'a1328fff267ee0a083c997d10ca864f25b535a2afe73a75948670624666a48cf',
    'product_manifest_combined_sha256':manifest['combined_sha256'],
    'product_archive_bytes':archive.stat().st_size,
    'product_archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
    'candidate_count':4,
    'promoted_cells':4,
    'held_decisions':2,
    'matrix_transition':summary['matrix_transition'],
    'matrix_updates':4,
    'field_terminalizations':4,
    'row_state_mutations':0,
    'class_closed':False,
    'cumulative_ledger_effect':'none',
    'outside_human_dependency':False,
    'publication_effect':'none',
    'adoption_effect':'none',
    'graph_effect':'none',
}
payload = json.dumps(receipt, indent=2, sort_keys=True) + '\n'
(out / 'materialization-receipt.json').write_text(payload)
(out / 'materialization-receipt-sha256.txt').write_text(hashlib.sha256(payload.encode()).hexdigest() + '\n')
PYRECEIPT

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
finalize
