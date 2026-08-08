#!/usr/bin/env bash
set -Eeuo pipefail
OUT="$RUNNER_TEMP/ssc-rd04-onecell-terminal-cleanup-v1"
PROOF="$OUT/proof"
rm -rf "$OUT"
mkdir -p "$OUT" "$PROOF"
stage=bootstrap
printf '%s\n' "$stage" > "$OUT/STAGE"
exec > >(tee "$OUT/cleanup.log") 2>&1

finalize() {
  local rc=$?
  trap - EXIT
  set +e
  printf '%s\n' "$rc" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  if [ ! -f "$OUT/receipt.json" ]; then
    jq -n \
      --arg state failed_closed \
      --arg failed_stage "$stage" \
      --argjson exit_code "$rc" \
      --arg canonical_main "$CANONICAL_MAIN" \
      '{schema_version:"ssc-rd04-onecell-terminal-cleanup@1",
        state:$state,failed_stage:$failed_stage,exit_code:$exit_code,
        canonical_main:$canonical_main,
        source_requests:0,route_executions:0,source_admissions:0,
        matrix_updates:0,field_terminalizations:0,row_state_mutations:0,
        class_closed:false,cumulative_ledger_effect:"none",
        outside_human_dependency:false,publication_effect:"none",
        adoption_effect:"none",graph_effect:"none"}' > "$OUT/receipt.json"
  fi
  (
    cd "$OUT"
    find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS
  )
  exit "$rc"
}
trap finalize EXIT

stage=bind_cleanup_topology
BASE_COMMIT="$(git rev-parse HEAD^)"
test "$(git rev-parse "$BASE_COMMIT^")" = "$CANONICAL_MAIN"
test "$(git rev-list --count "$CANONICAL_MAIN".."$BASE_COMMIT")" -eq 1
test "$(git rev-list --count "$BASE_COMMIT"..HEAD)" -eq 1
printf '%s\n' "$SCRIPT_PATH" "$WORKFLOW_PATH" | LC_ALL=C sort > "$OUT/expected-base-paths.txt"
git diff --name-only "$CANONICAL_MAIN" "$BASE_COMMIT" | LC_ALL=C sort > "$OUT/actual-base-paths.txt"
git diff --name-only --diff-filter=A "$CANONICAL_MAIN" "$BASE_COMMIT" | LC_ALL=C sort > "$OUT/added-base-paths.txt"
diff -u "$OUT/expected-base-paths.txt" "$OUT/actual-base-paths.txt"
diff -u "$OUT/expected-base-paths.txt" "$OUT/added-base-paths.txt"
test "$(git diff --name-only "$BASE_COMMIT" HEAD)" = "$TRIGGER_PATH"
test "$(git diff --name-only --diff-filter=A "$BASE_COMMIT" HEAD)" = "$TRIGGER_PATH"
test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$CANONICAL_MAIN" HEAD)"
git diff --check "$CANONICAL_MAIN" HEAD
test "$(git rev-parse "$CANONICAL_MAIN^{tree}")" = "$CANONICAL_TREE"
test "$(git hash-object "$SCRIPT_PATH")" = "$(git rev-parse "$BASE_COMMIT:$SCRIPT_PATH")"
printf '%s\n' "$BASE_COMMIT" > "$OUT/cleanup-base-commit.txt"
git rev-parse HEAD > "$OUT/cleanup-trigger-head.txt"

stage=bind_live_main
git fetch --no-tags --force origin "+refs/heads/main:refs/remotes/origin/main"
test "$(git rev-parse origin/main)" = "$CANONICAL_MAIN"
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CANONICAL_MAIN"

stage=authenticate_terminal_proof
gh api -H 'Accept: application/vnd.github+json' \
  "/repos/$GITHUB_REPOSITORY/actions/artifacts/$CONTROLLING_PROOF_ARTIFACT" > "$OUT/proof-artifact.json"
jq -e \
  --argjson id "$CONTROLLING_PROOF_ARTIFACT" \
  --argjson bytes "$CONTROLLING_PROOF_ARTIFACT_BYTES" \
  --arg digest "sha256:$CONTROLLING_PROOF_ARTIFACT_SHA256" \
  '.id==$id and .expired==false and .size_in_bytes==$bytes and .digest==$digest' \
  "$OUT/proof-artifact.json" > /dev/null
gh api -H 'Accept: application/vnd.github+json' \
  "/repos/$GITHUB_REPOSITORY/actions/artifacts/$CONTROLLING_PROOF_ARTIFACT/zip" > "$OUT/proof.zip"
test "$(stat -c %s "$OUT/proof.zip")" -eq "$CONTROLLING_PROOF_ARTIFACT_BYTES"
test "$(sha256sum "$OUT/proof.zip" | awk '{print $1}')" = "$CONTROLLING_PROOF_ARTIFACT_SHA256"
unzip -t "$OUT/proof.zip" > "$OUT/proof-zip-test.txt"
unzip -q "$OUT/proof.zip" -d "$PROOF"
(cd "$PROOF" && sha256sum -c SHA256SUMS)
test "$(sha256sum "$PROOF/receipt.json" | awk '{print $1}')" = "$CONTROLLING_PROOF_RECEIPT_SHA256"
test "$(cat "$PROOF/STAGE")" = complete
test "$(cat "$PROOF/EXIT_CODE")" = 0
jq -e '
  .schema_version=="ssc-rd04-onecell-workflow-repair-postmerge-proof@1" and
  .state=="canonical_repair_and_native_push_verified" and
  .canonical_merge=="b1d1d8afb6c957401a762bf9d0b2abc464bd5e07" and
  .repair_commit=="c91c1abd3beadd73e80424e6a9f0286a64a2b6bb" and
  .shared_tree=="64f5b5e9e9d72bdf86ef6cf14d728b2ae996f834" and
  .native_push_run==31282330542 and
  .native_push_job==93165548838 and
  .native_product_artifact==9028797462 and
  .canonical_product_paths==14 and
  .canonical_product_matrix_updates==1 and
  .canonical_product_field_terminalizations==1 and
  .repair_matrix_updates==0 and
  .repair_field_terminalizations==0 and
  .row_state_mutations==0 and
  .north_dakota_row_state=="still_open" and
  .waiver_period_cell_state=="still_open" and
  .waiver_period_cell_excluded==true and
  .class_closed==false and
  .cumulative_ledger_effect=="none" and
  .outside_human_dependency==false and
  .publication_effect=="none" and
  .adoption_effect=="none" and
  .graph_effect=="none"
' "$PROOF/receipt.json" > /dev/null

stage=freeze_exact_ref_denominator
cat > "$OUT/targets.txt" <<'EOF_TARGETS'
agent/ssc-rd04-onecell-materializer-ref-probe-base-v1
agent/ssc-rd04-onecell-materializer-ref-probe-trigger-v1
agent/ssc-rd04-onecell-qualified-product-publisher-v1
agent/ssc-rd04-onecell-terminal-cleanup-base-v1
agent/ssc-rd04-onecell-terminal-cleanup-trigger-v1
agent/ssc-rd04-postpromotion-nd-followup-adjudication-materializer-base-v1
agent/ssc-rd04-postpromotion-nd-followup-adjudication-materializer-trigger-v1
agent/ssc-rd04-postpromotion-nd-followup-adjudication-materializer-v1
agent/ssc-rd04-postpromotion-nd-followup-adjudication-v1
agent/ssc-rd04-postpromotion-nd-followup-candidate-validation-v1
agent/ssc-rd04-postpromotion-nd-followup-one-cell-promotion-materializer-trigger-v1
agent/ssc-rd04-postpromotion-nd-followup-one-cell-promotion-materializer-v1
agent/ssc-rd04-postpromotion-nd-followup-one-cell-promotion-v1
agent/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-product-v1
agent/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-stager-v1
agent/ssc-rd04-postpromotion-nd-followup-two-route-execution-base-v1
agent/ssc-rd04-postpromotion-nd-followup-two-route-execution-trigger-v1
agent/ssc-rd04-postpromotion-nd-followup-two-route-execution-v1
agent/ssc-rd04-postpromotion-nd-followup-two-route-execution-v2
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-base-v2
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-base-v3
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-trigger-v2
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-trigger-v3
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-v1
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-v2
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-v3
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-v4
agent/ssc-rd04-postpromotion-nd-one-cell-promotion-materializer-v5
agent/ssc-rd04-postpromotion-nd-operative-authority-promotion-stager-v1
agent/ssc-rd04-postpromotion-nd-operative-authority-promotion-stager-v2
agent/ssc-rd04-postpromotion-nd-operative-authority-validation-base-v1
agent/ssc-rd04-postpromotion-nd-operative-authority-validation-trigger-v1
diagnostic/ssc-rd04-postpromotion-nd-one-cell-materializer-v5
observer/ssc-rd04-onecell-materializer-push-proof-v1
observer/ssc-rd04-onecell-sealed-product-qualification-v1
observer/ssc-rd04-onecell-workflow-repair-postmerge-v1
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-base-v1
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-trigger-v1
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v1
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v2
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v3-diagnostic
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v4-diagnostic
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v5-diagnostic
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v6-terminal
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v7-terminal
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v8-terminal
observer/ssc-rd04-postpromotion-nd-followup-adjudication-postmerge-v9-terminal
observer/ssc-rd04-postpromotion-nd-one-cell-promotion-postmerge-base-v1
observer/ssc-rd04-postpromotion-nd-one-cell-promotion-postmerge-base-v2
observer/ssc-rd04-postpromotion-nd-one-cell-promotion-postmerge-trigger-v1
observer/ssc-rd04-postpromotion-nd-one-cell-promotion-postmerge-trigger-v2
repair/ssc-rd04-onecell-standing-workflow-runner-context-v1
staging/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-ordinary-v1
EOF_TARGETS
sed -i 's/^          //' "$OUT/targets.txt"
LC_ALL=C sort -o "$OUT/targets.txt" "$OUT/targets.txt"
test "$(wc -l < "$OUT/targets.txt")" -eq 53
test "$(sort "$OUT/targets.txt" | uniq | wc -l)" -eq 53
! grep -Fx "$DURABLE_LOCK" "$OUT/targets.txt"

git ls-remote --heads origin \
  | awk '{sub("refs/heads/","",$2); print $1 "\t" $2}' \
  | LC_ALL=C sort -k2,2 > "$OUT/all-heads-before.tsv"
awk -F '\t' '$2 ~ /^(agent|diagnostic|lock|observer|repair|staging)\/ssc-rd04-(postpromotion-nd|onecell)/ {print $2}' \
  "$OUT/all-heads-before.tsv" | LC_ALL=C sort > "$OUT/scoped-heads-before.txt"
{
  cat "$OUT/targets.txt"
  printf '%s\n' "$DURABLE_LOCK"
} | LC_ALL=C sort -u > "$OUT/allowed-scoped-heads.txt"
comm -23 "$OUT/scoped-heads-before.txt" "$OUT/allowed-scoped-heads.txt" > "$OUT/unexpected-scoped-heads.txt"
test ! -s "$OUT/unexpected-scoped-heads.txt"
LOCK_SHA="$(awk -F '\t' -v branch="$DURABLE_LOCK" '$2==branch {print $1}' "$OUT/all-heads-before.tsv")"
test -n "$LOCK_SHA"
test "$(awk -F '\t' -v branch="$DURABLE_LOCK" '$2==branch {count++} END {print count+0}' "$OUT/all-heads-before.tsv")" -eq 1
printf '%s\n' "$LOCK_SHA" > "$OUT/durable-lock-sha.txt"

while IFS= read -r branch; do
  sha="$(awk -F '\t' -v branch="$branch" '$2==branch {print $1}' "$OUT/all-heads-before.tsv")"
  if [ -n "$sha" ]; then
    printf '%s\t%s\n' "$branch" "$sha"
  else
    printf '%s\tabsent\n' "$branch"
  fi
done < "$OUT/targets.txt" > "$OUT/target-snapshot.tsv"
PRESENT_BEFORE="$(awk -F '\t' '$2!="absent" {count++} END {print count+0}' "$OUT/target-snapshot.tsv")"
ABSENT_BEFORE="$(awk -F '\t' '$2=="absent" {count++} END {print count+0}' "$OUT/target-snapshot.tsv")"
printf '%s\n' "$PRESENT_BEFORE" > "$OUT/present-before-count.txt"
printf '%s\n' "$ABSENT_BEFORE" > "$OUT/absent-before-count.txt"

stage=close_exact_open_pull_requests
gh api --paginate -H 'Accept: application/vnd.github+json' \
  "/repos/$GITHUB_REPOSITORY/pulls?state=open&per_page=100" \
  | jq -s 'add' > "$OUT/open-pulls-before.json"
python - "$OUT/targets.txt" "$OUT/open-pulls-before.json" "$OUT/affected-pulls.tsv" <<'PY'
import json,sys
from pathlib import Path
targets=set(Path(sys.argv[1]).read_text().splitlines())
pulls=json.loads(Path(sys.argv[2]).read_text())
rows=[]
for pull in pulls:
    head=pull["head"]["ref"]
    base=pull["base"]["ref"]
    if head in targets or base in targets:
        rows.append((pull["number"],head,base))
Path(sys.argv[3]).write_text("".join(f"{number}\t{head}\t{base}\n" for number,head,base in sorted(rows)))
PY
: > "$OUT/closed-pulls.tsv"
while IFS=$'\t' read -r number head base; do
  test -n "$number"
  gh api -X PATCH -H 'Accept: application/vnd.github+json' \
    "/repos/$GITHUB_REPOSITORY/pulls/$number" -f state=closed > "$OUT/pull-$number-closed.json"
  jq -e '.state=="closed" and .merged==false' "$OUT/pull-$number-closed.json" > /dev/null
  printf '%s\t%s\t%s\n' "$number" "$head" "$base" >> "$OUT/closed-pulls.tsv"
done < "$OUT/affected-pulls.tsv"
CLOSED_PULLS="$(wc -l < "$OUT/closed-pulls.tsv")"
printf '%s\n' "$CLOSED_PULLS" > "$OUT/closed-pull-count.txt"

stage=recheck_ref_leases
git ls-remote --heads origin \
  | awk '{sub("refs/heads/","",$2); print $1 "\t" $2}' \
  | LC_ALL=C sort -k2,2 > "$OUT/all-heads-predelete.tsv"
while IFS=$'\t' read -r branch expected; do
  actual="$(awk -F '\t' -v branch="$branch" '$2==branch {print $1}' "$OUT/all-heads-predelete.tsv")"
  if [ "$expected" = absent ]; then
    test -z "$actual"
  else
    test "$actual" = "$expected"
  fi
done < "$OUT/target-snapshot.tsv"
test "$(awk -F '\t' -v branch="$DURABLE_LOCK" '$2==branch {print $1}' "$OUT/all-heads-predelete.tsv")" = "$LOCK_SHA"
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CANONICAL_MAIN"

stage=delete_exact_temporary_refs
: > "$OUT/deleted-refs.tsv"
: > "$OUT/absent-before-refs.txt"
while IFS=$'\t' read -r branch expected; do
  if [ "$branch" = "$CLEANUP_BASE" ] || [ "$branch" = "$CLEANUP_TRIGGER" ]; then
    continue
  fi
  if [ "$expected" = absent ]; then
    printf '%s\n' "$branch" >> "$OUT/absent-before-refs.txt"
    continue
  fi
  gh api -X DELETE -H 'Accept: application/vnd.github+json' \
    "/repos/$GITHUB_REPOSITORY/git/refs/heads/$branch"
  if gh api -H 'Accept: application/vnd.github+json' \
    "/repos/$GITHUB_REPOSITORY/git/ref/heads/$branch" > /dev/null 2>&1; then
    echo "ref survived deletion: $branch" >&2
    exit 1
  fi
  printf '%s\t%s\n' "$branch" "$expected" >> "$OUT/deleted-refs.tsv"
done < "$OUT/target-snapshot.tsv"

for branch in "$CLEANUP_TRIGGER" "$CLEANUP_BASE"; do
  expected="$(awk -F '\t' -v branch="$branch" '$1==branch {print $2}' "$OUT/target-snapshot.tsv")"
  if [ "$expected" = absent ]; then
    printf '%s\n' "$branch" >> "$OUT/absent-before-refs.txt"
    continue
  fi
  current="$(gh api -H 'Accept: application/vnd.github+json' \
    "/repos/$GITHUB_REPOSITORY/git/ref/heads/$branch" --jq '.object.sha')"
  test "$current" = "$expected"
  gh api -X DELETE -H 'Accept: application/vnd.github+json' \
    "/repos/$GITHUB_REPOSITORY/git/refs/heads/$branch"
  if gh api -H 'Accept: application/vnd.github+json' \
    "/repos/$GITHUB_REPOSITORY/git/ref/heads/$branch" > /dev/null 2>&1; then
    echo "self ref survived deletion: $branch" >&2
    exit 1
  fi
  printf '%s\t%s\n' "$branch" "$expected" >> "$OUT/deleted-refs.tsv"
done
DELETED_REFS="$(wc -l < "$OUT/deleted-refs.tsv")"
printf '%s\n' "$DELETED_REFS" > "$OUT/deleted-ref-count.txt"

stage=prove_zero_residual
git ls-remote --heads origin \
  | awk '{sub("refs/heads/","",$2); print $1 "\t" $2}' \
  | LC_ALL=C sort -k2,2 > "$OUT/all-heads-after.tsv"
while IFS= read -r branch; do
  test -z "$(awk -F '\t' -v branch="$branch" '$2==branch {print $1}' "$OUT/all-heads-after.tsv")"
done < "$OUT/targets.txt"
test "$(awk -F '\t' -v branch="$DURABLE_LOCK" '$2==branch {print $1}' "$OUT/all-heads-after.tsv")" = "$LOCK_SHA"
awk -F '\t' '$2 ~ /^(agent|diagnostic|lock|observer|repair|staging)\/ssc-rd04-(postpromotion-nd|onecell)/ {print $2}' \
  "$OUT/all-heads-after.tsv" | LC_ALL=C sort > "$OUT/scoped-heads-after.txt"
printf '%s\n' "$DURABLE_LOCK" > "$OUT/expected-scoped-heads-after.txt"
diff -u "$OUT/expected-scoped-heads-after.txt" "$OUT/scoped-heads-after.txt"

gh api --paginate -H 'Accept: application/vnd.github+json' \
  "/repos/$GITHUB_REPOSITORY/pulls?state=open&per_page=100" \
  | jq -s 'add' > "$OUT/open-pulls-after.json"
python - "$OUT/targets.txt" "$OUT/open-pulls-after.json" "$OUT/residual-open-pulls.tsv" <<'PY'
import json,sys
from pathlib import Path
targets=set(Path(sys.argv[1]).read_text().splitlines())
pulls=json.loads(Path(sys.argv[2]).read_text())
rows=[]
for pull in pulls:
    head=pull["head"]["ref"]
    base=pull["base"]["ref"]
    if head in targets or base in targets:
        rows.append((pull["number"],head,base))
Path(sys.argv[3]).write_text("".join(f"{number}\t{head}\t{base}\n" for number,head,base in sorted(rows)))
PY
test ! -s "$OUT/residual-open-pulls.tsv"
test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CANONICAL_MAIN"

stage=seal_terminal_cleanup_receipt
jq -n \
  --arg canonical_main "$CANONICAL_MAIN" \
  --arg canonical_tree "$CANONICAL_TREE" \
  --arg repair_commit "$REPAIR_COMMIT" \
  --arg product_commit "$ORIGINAL_PRODUCT_COMMIT" \
  --arg proof_artifact "$CONTROLLING_PROOF_ARTIFACT" \
  --arg proof_artifact_sha256 "$CONTROLLING_PROOF_ARTIFACT_SHA256" \
  --arg proof_receipt_sha256 "$CONTROLLING_PROOF_RECEIPT_SHA256" \
  --arg durable_lock "$DURABLE_LOCK" \
  --arg durable_lock_sha "$LOCK_SHA" \
  --argjson target_ref_count 53 \
  --argjson present_before "$PRESENT_BEFORE" \
  --argjson absent_before "$ABSENT_BEFORE" \
  --argjson deleted_refs "$DELETED_REFS" \
  --argjson closed_pulls "$CLOSED_PULLS" \
  --rawfile target_refs "$OUT/targets.txt" \
  --rawfile deleted_ref_rows "$OUT/deleted-refs.tsv" \
  --rawfile absent_ref_rows "$OUT/absent-before-refs.txt" \
  --rawfile closed_pull_rows "$OUT/closed-pulls.tsv" \
  '{
    schema_version:"ssc-rd04-onecell-terminal-cleanup@1",
    state:"canonical_transaction_terminalized",
    failed_or_final_stage:"complete",
    exit_code:0,
    canonical_main:$canonical_main,
    canonical_tree:$canonical_tree,
    repair_commit:$repair_commit,
    product_commit:$product_commit,
    controlling_proof_artifact:($proof_artifact|tonumber),
    controlling_proof_artifact_sha256:$proof_artifact_sha256,
    controlling_proof_receipt_sha256:$proof_receipt_sha256,
    target_ref_count:$target_ref_count,
    present_before:$present_before,
    absent_before:$absent_before,
    deleted_ref_count:$deleted_refs,
    closed_pull_request_count:$closed_pulls,
    target_refs:($target_refs|split("\n")|map(select(length>0))),
    deleted_refs:($deleted_ref_rows|split("\n")|map(select(length>0))),
    absent_before_refs:($absent_ref_rows|split("\n")|map(select(length>0))),
    closed_pull_requests:($closed_pull_rows|split("\n")|map(select(length>0))),
    zero_residual_target_refs:true,
    zero_residual_open_pull_requests:true,
    retained_durable_lock:$durable_lock,
    retained_durable_lock_sha:$durable_lock_sha,
    terminal_cells:227,
    still_open_cells:223,
    open_substantive_cells:183,
    terminal_units:10,
    north_dakota_terminal_fields:7,
    north_dakota_open_fields:2,
    north_dakota_row_state:"still_open",
    waiver_period_field_state:"still_open",
    waiver_period_field_excluded:true,
    source_requests:0,
    route_executions:0,
    source_admissions:0,
    matrix_updates:0,
    field_terminalizations:0,
    row_state_mutations:0,
    class_closed:false,
    cumulative_ledger_effect:"none",
    outside_human_dependency:false,
    publication_effect:"none",
    adoption_effect:"none",
    graph_effect:"none"
  }' > "$OUT/receipt.json"
stage=complete
printf '%s\n' "$stage" > "$OUT/STAGE"
printf '%s\n' 0 > "$OUT/EXIT_CODE"
