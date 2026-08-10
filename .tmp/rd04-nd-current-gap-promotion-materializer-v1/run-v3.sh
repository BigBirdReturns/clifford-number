#!/usr/bin/env bash
set -Eeuo pipefail

CANONICAL_PARENT='77aef3313e85e1fddc68805a9f22252ff147b4e8'
BASE_BRANCH='agent/ssc-rd04-nd-current-gap-promotion-materializer-base-v3'
HEAD_BRANCH='agent/ssc-rd04-nd-current-gap-promotion-materializer-trigger-v3'
PRODUCT_BRANCH='agent/ssc-rd04-nd-current-public-record-gap-promotion-v1'
CONTROLLER_ROOT='.tmp/rd04-nd-current-gap-promotion-materializer-v1'
CONTROLLER_PATH='.tmp/rd04-nd-current-gap-promotion-materializer-v1/materialize.py'
RUNNER_PATH='.tmp/rd04-nd-current-gap-promotion-materializer-v1/run-v3.sh'
WORKFLOW_PATH='.github/workflows/temp-materialize-rd04-nd-current-gap-promotion-v3.yml'
TRIGGER_PATH='.tmp/rd04-nd-current-gap-promotion-materializer-v1/trigger-v3.json'
CONTROLLER_BYTES='5283'
CONTROLLER_SHA256='de3467354411bf1ab8952f916a6206221045103fa55e534e2c4f6637fe6bad0d'
CONTROLLER_BLOB='25ac901459fd01ca90c0127ac2a4587566c04656'
ARCHIVE_BYTES='39440'
ARCHIVE_SHA256='db6fc2c935b11aa1bce1d54bf69cc7dd49f7e5146da694740d7a59cec6d9f79c'
PRODUCT_ROOT='data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-current-public-record-gap-promotion'
PRODUCT_MATRIX_SHA256='f80efa6f92b1fc9a48ab24b4258efff5426936c46cf1431513bd8da428af3843'
PRODUCT_MATRIX_BLOB='9c9b42817d34b7cd11783c8121405794e64c9013'
NEW_ROW_SHA256='0f3ba29ee5c7354249f89c96fc38c21b55341fc9fdad9b5919ecdb9243c4929e'
NEW_CELL_SHA256='8700619932bd128250a308d5dcd7b1586a363ae3b78e4eb80c23bfb72c8a2e25'
OUT='/tmp/rd04-nd-current-gap-promotion-materializer-v3'
WORKTREE='/tmp/rd04-nd-current-gap-promotion-worktree-v3'

: "${HEAD_SHA:?}" "${BASE_SHA:?}" "${HEAD_REF:?}" "${BASE_REF:?}" "${RUNNER_BYTES:?}" "${RUNNER_SHA256:?}" "${RUNNER_BLOB:?}"
rm -rf "$OUT" "$WORKTREE"
mkdir -p "$OUT"
STAGE=initializing
PRODUCT_BRANCH_MOVED=false
controller_commit=unknown
finish() {
  rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ]; then
    jq -n \
      --arg stage "$STAGE" \
      --argjson exit_code "$rc" \
      --arg canonical_parent "$CANONICAL_PARENT" \
      --arg controller_commit "$controller_commit" \
      --arg head "$HEAD_SHA" \
      --argjson product_branch_moved "$PRODUCT_BRANCH_MOVED" \
      '{
        schema_version:"ssc-rd04-nd-current-public-record-gap-promotion-materializer-failure@2",
        state:"failed_closed",
        failed_stage:$stage,
        exit_code:$exit_code,
        canonical_parent:$canonical_parent,
        controller_commit:$controller_commit,
        carrier_head:$head,
        product_branch_moved:$product_branch_moved,
        source_requests:0,
        route_executions:0,
        source_admissions:0,
        field_terminalizations:0,
        matrix_updates:0,
        row_state_mutations:0,
        row_terminalizations:0,
        class_closed:false,
        cumulative_ledger_effect:"none",
        publication_effect:"none",
        adoption_effect:"none",
        graph_effect:"none",
        outside_human_dependency:false
      }' > "$OUT/failure-receipt.json"
    printf '%s\n' "$STAGE" > "$OUT/STAGE"
    printf '%s\n' "$rc" > "$OUT/EXIT_CODE"
    (cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum > SHA256SUMS)
  fi
  exit "$rc"
}
trap finish EXIT

STAGE=authenticate_topology
test "$HEAD_REF" = "$HEAD_BRANCH"
test "$BASE_REF" = "$BASE_BRANCH"
test "$(git rev-parse HEAD)" = "$HEAD_SHA"
test "$(git rev-parse HEAD^)" = "$BASE_SHA"
controller_commit="$(git rev-parse "$BASE_SHA^")"
test "$(git rev-parse "$controller_commit^")" = "$CANONICAL_PARENT"
test "$(git rev-list --count "$CANONICAL_PARENT..$controller_commit")" = 1
test "$(git rev-list --count "$controller_commit..$BASE_SHA")" = 1
test "$(git rev-list --count "$BASE_SHA..$HEAD_SHA")" = 1
expected_controller_paths="$(cat <<'PATHS'
.tmp/rd04-nd-current-gap-promotion-materializer-v1/materialize.py
.tmp/rd04-nd-current-gap-promotion-materializer-v1/run-v3.sh
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-00.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-01.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-02.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-03.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-04.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-05.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-06.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-07.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-08.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-09.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-10.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-11.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-12.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-13.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-14.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-15.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-16.b64
.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-17.b64
PATHS
)"
test "$(git diff --name-only "$CANONICAL_PARENT" "$controller_commit" | LC_ALL=C sort)" = "$(printf '%s\n' "$expected_controller_paths" | LC_ALL=C sort)"
test "$(git diff --name-only --diff-filter=A "$CANONICAL_PARENT" "$controller_commit" | LC_ALL=C sort)" = "$(printf '%s\n' "$expected_controller_paths" | LC_ALL=C sort)"
test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$CANONICAL_PARENT" "$controller_commit")"
test "$(git diff --name-only "$controller_commit" "$BASE_SHA")" = "$WORKFLOW_PATH"
test "$(git diff --name-only --diff-filter=A "$controller_commit" "$BASE_SHA")" = "$WORKFLOW_PATH"
test "$(git diff --name-only "$BASE_SHA" "$HEAD_SHA")" = "$TRIGGER_PATH"
test "$(git diff --name-only --diff-filter=A "$BASE_SHA" "$HEAD_SHA")" = "$TRIGGER_PATH"
test "$(git rev-parse "$controller_commit:$CONTROLLER_PATH")" = "$CONTROLLER_BLOB"
test "$(git rev-parse "$controller_commit:$RUNNER_PATH")" = "$RUNNER_BLOB"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-00.b64")" = "7849a4d8e14526e021f7abb5159f94f5db998aaa"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-01.b64")" = "b90d0092d34118de0cc47a70f29bbab09bb99add"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-02.b64")" = "c9c517103b492e5566a8646c5e613a18fab0f456"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-03.b64")" = "d088eac46b74b151275559b7c9d352972cf13680"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-04.b64")" = "8bf54d52aaf6065061c6dd46ed87059224522836"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-05.b64")" = "3347cf93387ff686edd5281cc00262da65e93663"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-06.b64")" = "765bbe2c3468fe8974f9d5446b7a4cf4f9f6be04"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-07.b64")" = "70310a42a8c6aec0e38e18f4e274008e687a9d32"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-08.b64")" = "7932635e4d10fab069732ca46884100c4056241a"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-09.b64")" = "e9c2f2c3cbf669cfaf201740a9f5cc1b1cb03342"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-10.b64")" = "de919a6cd8801541b1dbd41c3c1666cf43bb7430"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-11.b64")" = "5af1fecedfe9e438eda4af29849b98d7f990fa13"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-12.b64")" = "11fee615aa159274132b37491d80ee198c83af68"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-13.b64")" = "10b21729706412be25d86945b83c535ca75b65e7"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-14.b64")" = "dad0d9747b92128dc0de5980daedd417fefce65d"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-15.b64")" = "a230ae3cf0877a13c7c1aad269d3c5dcc5552b7c"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-16.b64")" = "5e437dacd443663373369c8b825ca0fdc21ea489"
test "$(git rev-parse "$controller_commit:.tmp/rd04-nd-current-gap-promotion-materializer-v1/archive-17.b64")" = "974abeec46c56c213397253b219d801dd17f43df"
test "$(stat -c %s "$CONTROLLER_PATH")" = "$CONTROLLER_BYTES"
test "$(sha256sum "$CONTROLLER_PATH" | cut -d' ' -f1)" = "$CONTROLLER_SHA256"
test "$(git hash-object "$CONTROLLER_PATH")" = "$CONTROLLER_BLOB"
test "$(stat -c %s "$RUNNER_PATH")" = "$RUNNER_BYTES"
test "$(sha256sum "$RUNNER_PATH" | cut -d' ' -f1)" = "$RUNNER_SHA256"
test "$(git hash-object "$RUNNER_PATH")" = "$RUNNER_BLOB"
python -m py_compile "$CONTROLLER_PATH"
bash -n "$RUNNER_PATH"
test "$(jq -r .controller_commit "$TRIGGER_PATH")" = "$controller_commit"
test "$(jq -r .archive_sha256 "$TRIGGER_PATH")" = "$ARCHIVE_SHA256"
test "$(jq -r .archive_bytes "$TRIGGER_PATH")" = "$ARCHIVE_BYTES"
git diff --check "$CANONICAL_PARENT" "$HEAD_SHA"

STAGE=acquire_live_main_lease
git fetch --no-tags --force origin '+refs/heads/main:refs/remotes/origin/main'
test "$(git rev-parse origin/main)" = "$CANONICAL_PARENT"
if git ls-remote --exit-code --heads origin "refs/heads/$PRODUCT_BRANCH" >/dev/null 2>&1; then
  echo "product branch already exists" >&2
  exit 1
fi

STAGE=materialize_and_qualify
git worktree add --detach "$WORKTREE" "$CANONICAL_PARENT"
python "$CONTROLLER_PATH" "$WORKTREE" "$OUT/materialization"
cd "$WORKTREE"
EXPECTED="$(printf '%s\n' \
  '.github/workflows/status-sovereignty-rd-wave03-rd04-nd-current-public-record-gap-promotion.yml' \
  "$PRODUCT_ROOT/cell-promotion-ledger.json" \
  "$PRODUCT_ROOT/product-manifest.json" \
  "$PRODUCT_ROOT/promoted-partial-field-matrix.json" \
  "$PRODUCT_ROOT/promotion-decision.json" \
  "$PRODUCT_ROOT/promotion-input-custody.json" \
  "$PRODUCT_ROOT/remaining-open-field-census.json" \
  "$PRODUCT_ROOT/summary.json" | LC_ALL=C sort)"
test "$(git status --porcelain=v1 --untracked-files=all | sed -n 's/^?? //p' | LC_ALL=C sort)" = "$EXPECTED"
test -z "$(git status --porcelain=v1 --untracked-files=all | grep -v '^?? ' || true)"
test "$(sha256sum "$PRODUCT_ROOT/promoted-partial-field-matrix.json" | cut -d' ' -f1)" = "$PRODUCT_MATRIX_SHA256"
test "$(git hash-object "$PRODUCT_ROOT/promoted-partial-field-matrix.json")" = "$PRODUCT_MATRIX_BLOB"
npm run release:check > "$OUT/release-check.log" 2>&1

STAGE=deterministic_replay
git reset --hard "$CANONICAL_PARENT"
git clean -fdx
python "$GITHUB_WORKSPACE/$CONTROLLER_PATH" "$WORKTREE" "$OUT/replay"
test "$(git status --porcelain=v1 --untracked-files=all | sed -n 's/^?? //p' | LC_ALL=C sort)" = "$EXPECTED"
test "$(sha256sum "$PRODUCT_ROOT/promoted-partial-field-matrix.json" | cut -d' ' -f1)" = "$PRODUCT_MATRIX_SHA256"

STAGE=construct_product_commit
git add -- $EXPECTED
test "$(git diff --cached --name-only | LC_ALL=C sort)" = "$EXPECTED"
test "$(git diff --cached --name-only --diff-filter=A | LC_ALL=C sort)" = "$EXPECTED"
test -z "$(git diff --cached --name-only --diff-filter=MDTCRUXB)"
git -c user.name='BigBirdReturns' -c user.email='219768509+BigBirdReturns@users.noreply.github.com' commit -m 'Promote North Dakota current public-record-gap field'
product_commit="$(git rev-parse HEAD)"
product_tree="$(git rev-parse HEAD^{tree})"
test "$(git rev-parse HEAD^)" = "$CANONICAL_PARENT"
test "$(git rev-list --count "$CANONICAL_PARENT..HEAD")" = 1
test "$(git rev-parse "HEAD:$PRODUCT_ROOT/promoted-partial-field-matrix.json")" = "$PRODUCT_MATRIX_BLOB"

STAGE=publish_product_branch
git fetch --no-tags --force origin '+refs/heads/main:refs/remotes/origin/main'
test "$(git rev-parse origin/main)" = "$CANONICAL_PARENT"
git push origin "$product_commit:refs/heads/$PRODUCT_BRANCH"
PRODUCT_BRANCH_MOVED=true
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$product_commit"

STAGE=complete
jq -n \
  --arg product_branch "$PRODUCT_BRANCH" \
  --arg canonical_parent "$CANONICAL_PARENT" \
  --arg controller_commit "$controller_commit" \
  --arg product_commit "$product_commit" \
  --arg product_tree "$product_tree" \
  --arg product_matrix_sha256 "$PRODUCT_MATRIX_SHA256" \
  --arg product_matrix_blob "$PRODUCT_MATRIX_BLOB" \
  --arg new_row_sha256 "$NEW_ROW_SHA256" \
  --arg new_cell_sha256 "$NEW_CELL_SHA256" \
  '{
    schema_version:"ssc-rd04-nd-current-public-record-gap-promotion-publication-receipt@3",
    state:"complete",
    product_branch:$product_branch,
    canonical_parent:$canonical_parent,
    controller_commit:$controller_commit,
    product_commit:$product_commit,
    product_tree:$product_tree,
    product_path_count:8,
    addition_only:true,
    product_matrix_sha256:$product_matrix_sha256,
    product_matrix_git_blob:$product_matrix_blob,
    new_north_dakota_row_sha256:$new_row_sha256,
    promoted_cell_sha256:$new_cell_sha256,
    terminal_cells_before:227,
    terminal_cells_after:228,
    still_open_cells_before:223,
    still_open_cells_after:222,
    terminal_substantive_cells_before:117,
    terminal_substantive_cells_after:118,
    still_open_substantive_cells_before:183,
    still_open_substantive_cells_after:182,
    terminal_units_before:10,
    terminal_units_after:10,
    north_dakota_terminal_fields_before:7,
    north_dakota_terminal_fields_after:8,
    north_dakota_open_fields_before:2,
    north_dakota_open_fields_after:1,
    north_dakota_row_state_after:"still_open",
    field_terminalizations:1,
    matrix_updates:1,
    row_state_mutations:0,
    row_terminalizations:0,
    class_closed:false,
    source_requests:0,
    route_executions:0,
    source_admissions:0,
    cumulative_ledger_effect:"none",
    publication_effect:"none",
    adoption_effect:"none",
    graph_effect:"none",
    outside_human_dependency:false
  }' > "$OUT/publication-receipt.json"
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' 0 > "$OUT/EXIT_CODE"
(cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS && sha256sum -c SHA256SUMS)
trap - EXIT
