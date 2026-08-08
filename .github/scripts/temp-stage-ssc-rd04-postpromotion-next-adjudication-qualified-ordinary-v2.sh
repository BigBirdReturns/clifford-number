#!/usr/bin/env bash
set -Eeuo pipefail

OUT=/tmp/ssc-rd04-postpromotion-next-adjudication-qualified-ordinary-stager-v2
SRC="$OUT/source-artifact"
PRODUCT="$OUT/product"
WT="$OUT/worktree"
rm -rf "$OUT"
mkdir -p "$OUT" "$SRC" "$PRODUCT"
exec > >(tee "$OUT/stager.log") 2>&1
stage=bootstrap

write_receipt() {
  local state="$1"
  local code="$2"
  local ordinary_commit="${3:-}"
  local ordinary_tree="${4:-}"
  jq -n \
    --arg state "$state" \
    --arg stage "$stage" \
    --arg parent "$CANONICAL_PARENT" \
    --arg parent_tree "$CANONICAL_PARENT_TREE" \
    --arg source_head "$SOURCE_HEAD" \
    --argjson source_run "$SOURCE_RUN" \
    --argjson source_artifact_id "$SOURCE_ARTIFACT_ID" \
    --arg source_artifact_digest "$SOURCE_ARTIFACT_DIGEST" \
    --arg qualified_tree "$QUALIFIED_TREE" \
    --arg archive_sha "$PRODUCT_ARCHIVE_SHA256" \
    --arg staging_branch "$STAGING_BRANCH" \
    --arg ordinary_commit "$ordinary_commit" \
    --arg ordinary_tree "$ordinary_tree" \
    --argjson exit_code "$code" \
    '{
      schema_version:"ssc-rd04-postpromotion-next-adjudication-qualified-ordinary-stager@2",
      state:$state,
      exit_code:$exit_code,
      failed_or_final_stage:$stage,
      canonical_parent:$parent,
      canonical_parent_tree:$parent_tree,
      source_head:$source_head,
      source_run:$source_run,
      source_artifact_id:$source_artifact_id,
      source_artifact_digest:$source_artifact_digest,
      qualified_full_tree:$qualified_tree,
      product_archive_sha256:$archive_sha,
      staging_branch:$staging_branch,
      ordinary_staging_commit:(if $ordinary_commit=="" then null else $ordinary_commit end),
      ordinary_staging_tree:(if $ordinary_tree=="" then null else $ordinary_tree end),
      ordinary_path_count:12,
      permanent_workflow_omitted:true,
      product_candidate_created:false,
      product_ref_updated:false,
      source_requests_executed:0,
      route_executions:0,
      reviewed_source_admissions:4,
      promotion_candidates:4,
      held_open_cells:2,
      matrix_updates:0,
      field_terminalizations:0,
      row_state_mutations:0,
      class_closed:false,
      cumulative_ledger_effect:"none",
      outside_human_dependency:false,
      publication_effect:"none",
      adoption_effect:"none",
      graph_effect:"none",
      authority:(if $state=="staged" then "ordinary_blob_custody_only" else "failure_custody_only" end)
    }' > "$OUT/receipt.json"
}

on_error() {
  local code=$?
  set +e
  printf '%s\n' "$code" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  write_receipt failed_closed "$code"
  exit "$code"
}
trap on_error ERR

stage=bind_carrier
mapfile -t carrier_paths < <(git diff --name-only "$CANONICAL_PARENT" HEAD | sort)
test "$(git rev-list --count "$CANONICAL_PARENT"..HEAD)" -eq 2
test "${#carrier_paths[@]}" -eq 2
test "${carrier_paths[0]}" = '.github/scripts/temp-stage-ssc-rd04-postpromotion-next-adjudication-qualified-ordinary-v2.sh'
test "${carrier_paths[1]}" = '.github/workflows/temp-stage-ssc-rd04-postpromotion-next-adjudication-qualified-ordinary-v2.yml'
git diff --check "$CANONICAL_PARENT" HEAD

git fetch --no-tags origin \
  '+refs/heads/main:refs/remotes/origin/main' \
  "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"
test "$(git rev-parse origin/main)" = "$CANONICAL_PARENT"
test "$(git rev-parse "$CANONICAL_PARENT^{tree}")" = "$CANONICAL_PARENT_TREE"
test "$(git rev-parse "origin/$PRODUCT_BRANCH")" = "$OLD_PRODUCT_HEAD"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"

stage=download_qualified_artifact
curl -fsSL -L \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/artifacts/$SOURCE_ARTIFACT_ID/zip" \
  > "$OUT/source-artifact.zip"
test "$(stat -c %s "$OUT/source-artifact.zip")" = "$SOURCE_ARTIFACT_BYTES"
test "sha256:$(sha256sum "$OUT/source-artifact.zip" | cut -d' ' -f1)" = "$SOURCE_ARTIFACT_DIGEST"
unzip -t "$OUT/source-artifact.zip" > "$OUT/source-zip-test.log"
unzip -q "$OUT/source-artifact.zip" -d "$SRC"
(cd "$SRC" && sha256sum -c SHA256SUMS) > "$OUT/source-internal-check.log"

test "$(cat "$SRC/EXIT_CODE")" = 0
test "$(cat "$SRC/STAGE")" = complete
test "$(cat "$SRC/current-main-tree.txt")" = "$CANONICAL_PARENT_TREE"
test "$(cat "$SRC/current-tree.txt")" = "$QUALIFIED_TREE"
test "$(cat "$SRC/current-commit.txt")" = "$SOURCE_QUALIFIED_COMMIT"
test ! -s "$SRC/overlap.txt"
jq -e \
  --arg schema "$SOURCE_RECEIPT_SCHEMA" \
  --arg parent "$CANONICAL_PARENT" \
  --arg parent_tree "$CANONICAL_PARENT_TREE" \
  --arg tree "$QUALIFIED_TREE" \
  --arg commit "$SOURCE_QUALIFIED_COMMIT" \
  --arg archive_sha "$PRODUCT_ARCHIVE_SHA256" \
  '.schema_version==$schema and .current_main==$parent and .current_main_tree==$parent_tree and .qualified_candidate_tree==$tree and .qualified_local_candidate_commit==$commit and .product_archive_sha256==$archive_sha and .permanent_path_count==13 and .main_delta_overlap==0 and .ref_mutations==0 and .connector_publication_required==true and .matrix_updates==0 and .field_terminalizations==0 and .row_state_mutations==0 and .class_closed==false' \
  "$SRC/receipt.json" > /dev/null

test "$(stat -c %s "$SRC/product.tar.xz")" = "$PRODUCT_ARCHIVE_BYTES"
test "$(sha256sum "$SRC/product.tar.xz" | cut -d' ' -f1)" = "$PRODUCT_ARCHIVE_SHA256"
tar -xJf "$SRC/product.tar.xz" -C "$PRODUCT" --no-same-owner

stage=verify_product_archive
find "$PRODUCT" -type f | sed "s#^$PRODUCT/##" | sort > "$OUT/product-paths.txt"
test "$(wc -l < "$OUT/product-paths.txt")" -eq 13
diff -u "$SRC/product-paths.txt" "$OUT/product-paths.txt"
while IFS=$'\t' read -r path expected_blob; do
  test -f "$PRODUCT/$path"
  test "$(git hash-object --no-filters "$PRODUCT/$path")" = "$expected_blob"
done < "$SRC/current-blob-ledger.tsv"
grep -vxF "$PERMANENT_WORKFLOW_PATH" "$OUT/product-paths.txt" > "$OUT/ordinary-paths.txt"
test "$(wc -l < "$OUT/ordinary-paths.txt")" -eq 12
test "$(grep -cFx "$PERMANENT_WORKFLOW_PATH" "$OUT/product-paths.txt")" -eq 1

stage=construct_ordinary_tree
git worktree add --detach "$WT" "$CANONICAL_PARENT"
while IFS= read -r path; do
  install -D -m 0644 "$PRODUCT/$path" "$WT/$path"
  git -C "$WT" add -- "$path"
done < "$OUT/ordinary-paths.txt"
git -C "$WT" diff --cached --name-only --diff-filter=ACDMRTUXB | sort > "$OUT/actual-ordinary-paths.txt"
git -C "$WT" diff --cached --name-only --diff-filter=A | sort > "$OUT/added-ordinary-paths.txt"
diff -u "$OUT/ordinary-paths.txt" "$OUT/actual-ordinary-paths.txt"
diff -u "$OUT/ordinary-paths.txt" "$OUT/added-ordinary-paths.txt"
git -C "$WT" diff --cached --check
ordinary_tree="$(git -C "$WT" write-tree)"

export GIT_AUTHOR_NAME='github-actions[bot]'
export GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_AUTHOR_DATE='2026-08-08T16:20:00Z'
export GIT_COMMITTER_NAME='github-actions[bot]'
export GIT_COMMITTER_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_COMMITTER_DATE='2026-08-08T16:20:00Z'
ordinary_commit="$(printf '%s\n\n%s\n' \
  'Stage qualified RD-04 postpromotion adjudication ordinary blobs' \
  'Retain twelve non-workflow product blobs from the exact current-main qualification artifact for connector-owned final tree assembly. This commit grants no product, source, field, row, class, ledger, publication, adoption, or graph authority.' \
  | git -C "$WT" commit-tree "$ordinary_tree" -p "$CANONICAL_PARENT")"
test "$(git -C "$WT" rev-parse "$ordinary_commit^")" = "$CANONICAL_PARENT"
test "$(git -C "$WT" rev-parse "$ordinary_commit^{tree}")" = "$ordinary_tree"
git -C "$WT" diff --name-only --diff-filter=ACDMRTUXB "$CANONICAL_PARENT" "$ordinary_commit" | sort > "$OUT/commit-ordinary-paths.txt"
git -C "$WT" diff --name-only --diff-filter=A "$CANONICAL_PARENT" "$ordinary_commit" | sort > "$OUT/commit-added-ordinary-paths.txt"
diff -u "$OUT/ordinary-paths.txt" "$OUT/commit-ordinary-paths.txt"
diff -u "$OUT/ordinary-paths.txt" "$OUT/commit-added-ordinary-paths.txt"

stage=publish_ordinary_ref
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CANONICAL_PARENT"
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$OLD_PRODUCT_HEAD"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git -C "$WT" push origin "$ordinary_commit:refs/heads/$STAGING_BRANCH" \
  --force-with-lease="refs/heads/$STAGING_BRANCH:"
test "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')" = "$ordinary_commit"

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' "$ordinary_commit" > "$OUT/ordinary-commit.txt"
printf '%s\n' "$ordinary_tree" > "$OUT/ordinary-tree.txt"
write_receipt staged 0 "$ordinary_commit" "$ordinary_tree"
rm -rf "$SRC" "$PRODUCT" "$WT" "$OUT/source-artifact.zip"
(cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
