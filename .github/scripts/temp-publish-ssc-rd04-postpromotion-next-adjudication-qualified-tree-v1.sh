#!/usr/bin/env bash
set -Eeuo pipefail

OUT=/tmp/ssc-rd04-postpromotion-next-adjudication-qualified-tree-publisher-v1
SRC="$OUT/source-artifact"
PRODUCT="$OUT/product"
WT="$OUT/worktree"
rm -rf "$OUT"
mkdir -p "$OUT" "$SRC" "$PRODUCT"
exec > >(tee "$OUT/publisher.log") 2>&1
stage=bootstrap

write_receipt() {
  local state="$1"
  local code="$2"
  local candidate="${3:-}"
  local tree="${4:-}"
  jq -n \
    --arg schema_version 'ssc-rd04-postpromotion-next-adjudication-qualified-tree-publisher@1' \
    --arg state "$state" \
    --arg stage "$stage" \
    --arg canonical_parent "$CANONICAL_PARENT" \
    --arg canonical_parent_tree "$CANONICAL_PARENT_TREE" \
    --arg product_branch "$PRODUCT_BRANCH" \
    --arg old_product_head "$OLD_PRODUCT_HEAD" \
    --arg source_head "$SOURCE_HEAD" \
    --argjson source_run "$SOURCE_RUN" \
    --argjson source_artifact_id "$SOURCE_ARTIFACT_ID" \
    --arg source_artifact_digest "$SOURCE_ARTIFACT_DIGEST" \
    --arg source_receipt_schema "$SOURCE_RECEIPT_SCHEMA" \
    --arg source_qualified_commit "$SOURCE_QUALIFIED_COMMIT" \
    --arg qualified_tree "$QUALIFIED_TREE" \
    --arg product_archive_sha256 "$PRODUCT_ARCHIVE_SHA256" \
    --arg candidate "$candidate" \
    --arg tree "$tree" \
    --argjson exit_code "$code" \
    '{
      schema_version:$schema_version,
      state:$state,
      exit_code:$exit_code,
      failed_or_final_stage:$stage,
      canonical_parent:$canonical_parent,
      canonical_parent_tree:$canonical_parent_tree,
      product_branch:$product_branch,
      old_product_head:$old_product_head,
      source_head:$source_head,
      source_run:$source_run,
      source_artifact_id:$source_artifact_id,
      source_artifact_digest:$source_artifact_digest,
      source_receipt_schema:$source_receipt_schema,
      source_qualified_local_commit:$source_qualified_commit,
      qualified_tree:$qualified_tree,
      product_archive_sha256:$product_archive_sha256,
      published_candidate:(if $candidate=="" then null else $candidate end),
      published_tree:(if $tree=="" then null else $tree end),
      product_ref_updated:($state=="published"),
      permanent_path_count:13,
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
      authority:(if $state=="published" then "product_ref_publication_only" else "failure_custody_only" end)
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
test "${carrier_paths[0]}" = '.github/scripts/temp-publish-ssc-rd04-postpromotion-next-adjudication-qualified-tree-v1.sh'
test "${carrier_paths[1]}" = '.github/workflows/temp-publish-ssc-rd04-postpromotion-next-adjudication-qualified-tree-v1.yml'
git diff --check "$CANONICAL_PARENT" HEAD

git fetch --no-tags origin \
  '+refs/heads/main:refs/remotes/origin/main' \
  "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"
test "$(git rev-parse origin/main)" = "$CANONICAL_PARENT"
test "$(git rev-parse "$CANONICAL_PARENT^{tree}")" = "$CANONICAL_PARENT_TREE"
test "$(git rev-parse "origin/$PRODUCT_BRANCH")" = "$OLD_PRODUCT_HEAD"

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
test "$(cat "$SRC/STAGE")" = qualified
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

stage=construct_exact_tree
git worktree add --detach "$WT" "$CANONICAL_PARENT"
while IFS= read -r path; do
  install -D -m 0644 "$PRODUCT/$path" "$WT/$path"
done < "$OUT/product-paths.txt"
git -C "$WT" add --pathspec-from-file="$OUT/product-paths.txt"
git -C "$WT" diff --cached --name-only --diff-filter=ACDMRTUXB | sort > "$OUT/actual-paths.txt"
git -C "$WT" diff --cached --name-only --diff-filter=A | sort > "$OUT/added-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/actual-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/added-paths.txt"
git -C "$WT" diff --cached --check
constructed_tree="$(git -C "$WT" write-tree)"
test "$constructed_tree" = "$QUALIFIED_TREE"

export GIT_AUTHOR_NAME='BigBirdReturns'
export GIT_AUTHOR_EMAIL='219768509+BigBirdReturns@users.noreply.github.com'
export GIT_AUTHOR_DATE='2026-08-08T15:48:00Z'
export GIT_COMMITTER_NAME='BigBirdReturns'
export GIT_COMMITTER_EMAIL='219768509+BigBirdReturns@users.noreply.github.com'
export GIT_COMMITTER_DATE='2026-08-08T15:48:00Z'
published_commit="$(printf '%s\n\n%s\n' \
  'Adjudicate RD-04 postpromotion Montana and North Dakota captures' \
  'Rebind the qualified thirteen-path adjudication product to canonical execution-control main while preserving four bounded source admissions, four candidate-only findings, two held-open cells, and every zero-effect authority ceiling.' \
  | git -C "$WT" commit-tree "$constructed_tree" -p "$CANONICAL_PARENT")"
test "$(git -C "$WT" rev-parse "$published_commit^")" = "$CANONICAL_PARENT"
test "$(git -C "$WT" rev-parse "$published_commit^{tree}")" = "$QUALIFIED_TREE"

git -C "$WT" diff --name-only --diff-filter=ACDMRTUXB "$CANONICAL_PARENT" "$published_commit" | sort > "$OUT/commit-paths.txt"
git -C "$WT" diff --name-only --diff-filter=A "$CANONICAL_PARENT" "$published_commit" | sort > "$OUT/commit-added-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/commit-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/commit-added-paths.txt"

stage=publish_product_ref
test "$(git ls-remote --heads origin "refs/heads/main" | awk '{print $1}')" = "$CANONICAL_PARENT"
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$OLD_PRODUCT_HEAD"
git -C "$WT" push origin "$published_commit:refs/heads/$PRODUCT_BRANCH" \
  --force-with-lease="refs/heads/$PRODUCT_BRANCH:$OLD_PRODUCT_HEAD"
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$published_commit"

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' "$published_commit" > "$OUT/published-candidate.txt"
printf '%s\n' "$constructed_tree" > "$OUT/published-tree.txt"
write_receipt published 0 "$published_commit" "$constructed_tree"
rm -rf "$SRC" "$PRODUCT" "$WT" "$OUT/source-artifact.zip"
(cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
