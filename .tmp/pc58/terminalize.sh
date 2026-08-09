#!/usr/bin/env bash
set -Eeuo pipefail

MODE=${1:?mode required}
: "${GH_REPOSITORY:?}"
: "${API_URL:?}"
: "${ISSUE:?}"
: "${PRODUCT_PR:?}"
: "${PRODUCT:?}"
: "${PRODUCT_PARENT:?}"
: "${PRODUCT_TREE:?}"
: "${CANONICAL_MERGE:?}"
: "${MERGE_FIRST_PARENT:?}"
: "${PROOF_RUN:?}"
: "${PROOF_ARTIFACT_ID:?}"
: "${PROOF_ARTIFACT_DIGEST:?}"
: "${PROOF_ZIP_SHA256:?}"
: "${PROOF_DIR:?}"
: "${CENSUS_DIR:?}"

cleanup() {
  mkdir -p "$PROOF_DIR" "$CENSUS_DIR"

  gh api "/repos/${GH_REPOSITORY}/actions/artifacts/${PROOF_ARTIFACT_ID}" > "$CENSUS_DIR/proof-artifact-metadata.json"
  test "$(jq -r .digest "$CENSUS_DIR/proof-artifact-metadata.json")" = "$PROOF_ARTIFACT_DIGEST"
  test "$(jq -r .workflow_run.id "$CENSUS_DIR/proof-artifact-metadata.json")" = "$PROOF_RUN"
  test "$(jq -r .expired "$CENSUS_DIR/proof-artifact-metadata.json")" = false

  curl --fail --location --silent --show-error \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H 'Accept: application/vnd.github+json' \
    "$API_URL/repos/$GH_REPOSITORY/actions/artifacts/$PROOF_ARTIFACT_ID/zip" \
    --output /tmp/pc58-proof.zip
  test "$(sha256sum /tmp/pc58-proof.zip | awk '{print $1}')" = "$PROOF_ZIP_SHA256"
  unzip -q /tmp/pc58-proof.zip -d "$PROOF_DIR"

  test "$(jq -r .status "$PROOF_DIR/terminal.json")" = complete
  test "$(jq -r .issue "$PROOF_DIR/terminal.json")" = "$ISSUE"
  test "$(jq -r .product_pr "$PROOF_DIR/terminal.json")" = "$PRODUCT_PR"
  test "$(jq -r .product_commit "$PROOF_DIR/terminal.json")" = "$PRODUCT"
  test "$(jq -r .product_parent "$PROOF_DIR/terminal.json")" = "$PRODUCT_PARENT"
  test "$(jq -r .product_tree "$PROOF_DIR/terminal.json")" = "$PRODUCT_TREE"
  test "$(jq -r .canonical_merge "$PROOF_DIR/terminal.json")" = "$CANONICAL_MERGE"
  test "$(jq -r .merge_first_parent "$PROOF_DIR/terminal.json")" = "$MERGE_FIRST_PARENT"
  test "$(jq -r .merge_second_parent "$PROOF_DIR/terminal.json")" = "$PRODUCT"
  test "$(jq -r .permanent_paths "$PROOF_DIR/terminal.json")" = 14
  test "$(jq -r .canonical_product_blob_matches "$PROOF_DIR/terminal.json")" = 14
  test "$(jq -r .workflow_matrix "$PROOF_DIR/terminal.json")" = 52
  test "$(jq -r .focused_pc58 "$PROOF_DIR/terminal.json")" = pass
  test "$(jq -r .floor_v56 "$PROOF_DIR/terminal.json")" = pass
  test "$(jq -r .historical_floor_reconstruction "$PROOF_DIR/terminal.json")" = pass
  test "$(jq -r .base_preference_custody "$PROOF_DIR/terminal.json")" = pass
  test "$(jq -r .no_magic_human "$PROOF_DIR/terminal.json")" = pass
  test "$(jq -r .release_check "$PROOF_DIR/terminal.json")" = pass
  test "$(jq -r .outside_human_dependency "$PROOF_DIR/terminal.json")" = false
  test "$(jq -r .graph_effect "$PROOF_DIR/terminal.json")" = none
  test "$(jq -r .count "$PROOF_DIR/matrix.json")" = 52
  test "$(jq -r .pending "$PROOF_DIR/matrix.json")" = 0
  test "$(jq -r .failed "$PROOF_DIR/matrix.json")" = 0
  test "$(wc -l < "$PROOF_DIR/product-paths.txt" | tr -d ' ')" = 14
  test "$(wc -l < "$PROOF_DIR/canonical-product-blobs.tsv" | tr -d ' ')" = 14
  cmp "$PROOF_DIR/canonical-product-blobs.tsv" "$PROOF_DIR/live-main-product-blobs.tsv"

  git fetch --no-tags origin main "$CANONICAL_MERGE" "$PRODUCT" "$PRODUCT_PARENT"
  test "$(git show -s --format='%P' "$PRODUCT")" = "$PRODUCT_PARENT"
  test "$(git rev-parse "$PRODUCT^{tree}")" = "$PRODUCT_TREE"
  test "$(git show -s --format='%P' "$CANONICAL_MERGE")" = "$MERGE_FIRST_PARENT $PRODUCT"
  LIVE_MAIN=$(git rev-parse origin/main)
  git merge-base --is-ancestor "$CANONICAL_MERGE" "$LIVE_MAIN"
  while IFS= read -r path; do
    test "$(git rev-parse "$CANONICAL_MERGE:$path")" = "$(git rev-parse "$LIVE_MAIN:$path")"
  done < "$PROOF_DIR/product-paths.txt"
  printf '%s\n' "$LIVE_MAIN" > "$CENSUS_DIR/live-main.txt"

  gh api "/repos/${GH_REPOSITORY}/pulls/${PRODUCT_PR}" > "$CENSUS_DIR/product-pr.json"
  test "$(jq -r .merged "$CENSUS_DIR/product-pr.json")" = true
  test "$(jq -r .merge_commit_sha "$CENSUS_DIR/product-pr.json")" = "$CANONICAL_MERGE"
  test "$(jq -r .head.sha "$CENSUS_DIR/product-pr.json")" = "$PRODUCT"
  gh api "/repos/${GH_REPOSITORY}/issues/${ISSUE}" > "$CENSUS_DIR/issue-before.json"
  test "$(jq -r .state "$CENSUS_DIR/issue-before.json")" = open

  gh api --paginate "/repos/${GH_REPOSITORY}/pulls?state=open&per_page=100" \
    --jq '.[] | select(.head.ref | startswith("agent/pc58")) | [.number,.head.ref,.head.sha] | @tsv' \
    | sort -n > "$CENSUS_DIR/open-prs-before.tsv"
  while IFS=$'\t' read -r pr branch sha; do
    [[ -z "$pr" ]] && continue
    gh api --method PATCH "/repos/${GH_REPOSITORY}/pulls/${pr}" -f state=closed >/dev/null
  done < "$CENSUS_DIR/open-prs-before.tsv"

  gh api --paginate "/repos/${GH_REPOSITORY}/git/matching-refs/heads/agent/pc58" \
    --jq '.[] | [.ref,.object.sha] | @tsv' | sed 's#^refs/heads/##' | sort > "$CENSUS_DIR/refs-before.tsv"
  while IFS=$'\t' read -r branch sha; do
    [[ -z "$branch" ]] && continue
    gh api --method DELETE "/repos/${GH_REPOSITORY}/git/refs/heads/${branch}" >/dev/null 2>&1 || true
  done < "$CENSUS_DIR/refs-before.tsv"

  gh api --paginate "/repos/${GH_REPOSITORY}/git/matching-refs/heads/agent/pc58" \
    --jq '.[] | [.ref,.object.sha] | @tsv' | sed 's#^refs/heads/##' | sort > "$CENSUS_DIR/refs-after.tsv"
  test ! -s "$CENSUS_DIR/refs-after.tsv"
  gh api --paginate "/repos/${GH_REPOSITORY}/pulls?state=open&per_page=100" \
    --jq '.[] | select(.head.ref | startswith("agent/pc58")) | [.number,.head.ref,.head.sha] | @tsv' \
    | sort -n > "$CENSUS_DIR/open-prs-after.tsv"
  test ! -s "$CENSUS_DIR/open-prs-after.tsv"

  jq -n \
    --arg status complete \
    --arg canonical_merge "$CANONICAL_MERGE" \
    --arg product_commit "$PRODUCT" \
    --arg product_tree "$PRODUCT_TREE" \
    --arg live_main "$LIVE_MAIN" \
    --arg proof_artifact_id "$PROOF_ARTIFACT_ID" \
    --arg proof_artifact_digest "$PROOF_ARTIFACT_DIGEST" \
    --argjson retired_refs "$(wc -l < "$CENSUS_DIR/refs-before.tsv" | tr -d ' ')" \
    --argjson closed_prs "$(wc -l < "$CENSUS_DIR/open-prs-before.tsv" | tr -d ' ')" \
    '{schema_version:"pc58-terminal-census@1",status:$status,canonical_merge:$canonical_merge,product_commit:$product_commit,product_tree:$product_tree,live_main:$live_main,proof_artifact_id:$proof_artifact_id,proof_artifact_digest:$proof_artifact_digest,retired_refs:$retired_refs,closed_execution_prs:$closed_prs,remaining_pc58_refs:0,remaining_open_pc58_prs:0,outside_human_dependency:false,graph_effect:"none"}' \
    > "$CENSUS_DIR/census.json"
  sha256sum "$CENSUS_DIR"/* > "$CENSUS_DIR/SHA256SUMS"
}

receipt() {
  : "${CENSUS_ARTIFACT_ID:?}"
  : "${CENSUS_ARTIFACT_DIGEST:?}"
  cat > /tmp/pc58-terminal-comment.md <<EOF
## PC-58 terminal receipt

\`\`\`text
status                                  complete
product pull request                    #$PRODUCT_PR
clean product commit
$PRODUCT
clean product tree
$PRODUCT_TREE
canonical merge
$CANONICAL_MERGE

permanent product paths                 14
canonical/product blob matches       14 / 14
hosted exact-head workflows          52 / 52
failed or pending workflows               0
remaining agent/pc58-* refs               0
remaining open PC-58 transaction PRs      0
outside-human dependency                false
graph effect                              none
\`\`\`

Exact post-merge proof artifact: \`$PROOF_ARTIFACT_ID\` / \`$PROOF_ARTIFACT_DIGEST\`.

Terminal census artifact: \`$CENSUS_ARTIFACT_ID\` / \`$CENSUS_ARTIFACT_DIGEST\`.

PC-58 is merged, exact-head qualified, canonically replayed, transport-clean, ref-clean, and terminal.
EOF
  gh issue comment "$ISSUE" --repo "$GH_REPOSITORY" --body-file /tmp/pc58-terminal-comment.md
  gh issue close "$ISSUE" --repo "$GH_REPOSITORY" --reason completed
}

case "$MODE" in
  cleanup) cleanup ;;
  receipt) receipt ;;
  *) echo "unknown mode: $MODE" >&2; exit 2 ;;
esac
