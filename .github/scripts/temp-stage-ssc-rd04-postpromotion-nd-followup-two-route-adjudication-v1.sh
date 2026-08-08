#!/usr/bin/env bash
set -Eeuo pipefail

PRODUCT_PARENT='048e9d13a2555d8e6fabdbee5f45aea858f919b7'
PRODUCT_PARENT_TREE='d354309d6b936b499c78f3d0ff47d20f69abda78'
CARRIER_BRANCH='agent/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-stager-v1'
CARRIER_SCRIPT_PATH='.github/scripts/temp-stage-ssc-rd04-postpromotion-nd-followup-two-route-adjudication-v1.sh'
CARRIER_WORKFLOW_PATH='.github/workflows/temp-stage-ssc-rd04-postpromotion-nd-followup-two-route-adjudication-v1.yml'
CHUNK_DIR='.tmp/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-v1'
PRODUCT_BRANCH='agent/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-product-v1'
STAGING_BRANCH='staging/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-ordinary-v1'
PRODUCT_WORKFLOW='.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.yml'
STAGED_WORKFLOW='.tmp/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-staged/permanent-workflow.yml'
PRODUCT_BUILDER='tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs'
PRODUCT_VALIDATOR='tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs'
PRODUCT_TEST='test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.test.js'
PRODUCT_SCHEMA='schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.schema.json'
PRODUCT_DATA='data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication'
PRODUCT_MANIFEST="$PRODUCT_DATA/product-manifest.json"
PRODUCT_ARCHIVE_SHA256='2e5a31f9646962abf620d09d198c3481b4301cb16c11bed95fd59b88e0a6af71'
PRODUCT_BASE64_SHA256='3805464952c6a1b0f4552a085d481fcf87a38f264c952e9f248110d43b48d22b'
PRODUCT_MANIFEST_SHA256='6323bd5270be9b56f38639b8c8b5ccadbd986ee585f7f73ec7871a119134a98a'
EXPECTED_PRODUCT_TREE='9d5b15d4b78e3027a316f507e46692e215f7e5a8'
OUT="${RUNNER_TEMP:-/tmp}/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-stager-v1"
WORKTREE="${RUNNER_TEMP:-/tmp}/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-worktree"
STAGE='initializing'
mkdir -p "$OUT"
exec > >(tee "$OUT/stager.log") 2>&1

write_failure_receipt() {
  local rc="$1"
  if [[ ! -s "$OUT/receipt.json" ]]; then
    jq -n \
      --arg stage "$STAGE" \
      --arg parent "$PRODUCT_PARENT" \
      --arg parent_tree "$PRODUCT_PARENT_TREE" \
      --arg carrier_head "$(git rev-parse HEAD 2>/dev/null || printf unknown)" \
      --argjson exit_code "$rc" \
      '{schema_version:"ssc-rd04-postpromotion-nd-followup-two-route-adjudication-stager@1",state:"failed_closed",failed_or_final_stage:$stage,exit_code:$exit_code,product_parent:$parent,product_parent_tree:$parent_tree,carrier_head:$carrier_head,qualified_full_candidate_commit:null,qualified_full_candidate_tree:null,staging_commit:null,staging_tree:null,permanent_product_paths:14,candidate_findings:1,held_open_cells:1,source_requests_executed:0,route_executions:0,matrix_updates_created_by_stager:0,field_terminalizations_created_by_stager:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",product_authority_created:false}' > "$OUT/receipt.json"
  fi
}
finish() {
  local rc=$?
  trap - EXIT
  printf '%s\n' "$rc" > "$OUT/EXIT_CODE"
  printf '%s\n' "$STAGE" > "$OUT/STAGE"
  write_failure_receipt "$rc"
  (
    cd "$OUT"
    find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  )
  exit "$rc"
}
trap finish EXIT

expected_carrier_paths() {
  cat <<EOF
$CARRIER_SCRIPT_PATH
$CARRIER_WORKFLOW_PATH
$CHUNK_DIR/part-00
$CHUNK_DIR/part-01
$CHUNK_DIR/part-02
EOF
}
expected_product_paths() {
  cat <<'EOF'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.yml
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/capture-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/field-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/html-review-receipts.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/index.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/product-manifest.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/promotion-candidate-protocol.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/source-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/transport-duplication-ledger.json
docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.md
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.schema.json
test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.test.js
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs
EOF
}
expected_staging_paths() {
  expected_product_paths | grep -v -F "$PRODUCT_WORKFLOW"
  printf '%s\n' "$STAGED_WORKFLOW"
}
ref_absent() {
  local branch="$1"
  local rc=0
  git ls-remote --exit-code --heads origin "refs/heads/$branch" >/dev/null 2>&1 || rc=$?
  [[ $rc -eq 2 ]]
}
verify_product_files() {
  local root="$1"
  test "$(sha256sum "$root/$PRODUCT_MANIFEST" | cut -d' ' -f1)" = "$PRODUCT_MANIFEST_SHA256"
  jq -r '.hashed_files[] | [.path,(.bytes|tostring),.sha256,.git_blob] | @tsv' "$root/$PRODUCT_MANIFEST" > "$OUT/file-ledger.tsv"
  while IFS=$'\t' read -r rel bytes digest blob; do
    test -f "$root/$rel"
    test "$(stat -c %s "$root/$rel")" -eq "$bytes"
    test "$(sha256sum "$root/$rel" | cut -d' ' -f1)" = "$digest"
    test "$(git hash-object "$root/$rel")" = "$blob"
  done < "$OUT/file-ledger.tsv"
  jq -r '.permanent_paths[]' "$root/$PRODUCT_MANIFEST" | sort > "$OUT/manifest-product-paths.txt"
  expected_product_paths | sort > "$OUT/expected-product-paths.txt"
  diff -u "$OUT/expected-product-paths.txt" "$OUT/manifest-product-paths.txt"
}
run_product_gates() {
  local root="$1"
  (
    cd "$root"
    python -c "import yaml; yaml.safe_load(open('$PRODUCT_WORKFLOW'))"
    node --check "$PRODUCT_BUILDER"
    node --check "$PRODUCT_VALIDATOR"
    node --check "$PRODUCT_TEST"
    node "$PRODUCT_BUILDER"
    node "$PRODUCT_VALIDATOR"
    node "$PRODUCT_TEST"
    python - <<PY
import json
from pathlib import Path
from jsonschema import Draft202012Validator
schema=json.loads(Path('$PRODUCT_SCHEMA').read_text())
Draft202012Validator.check_schema(schema)
validator=Draft202012Validator(schema)
root=Path('$PRODUCT_DATA')
for p in sorted(root.glob('*.json')):
    errors=sorted(validator.iter_errors(json.loads(p.read_text())), key=lambda error:list(error.path))
    if errors:
        raise SystemExit(f'{p}: {errors[0].message} at {list(errors[0].path)}')
print('recursive_schema_validation=pass objects=8')
PY
    node tools/validate-no-magic-human-gate.mjs
    node test/no-magic-human-gate.test.js
  )
}

STAGE='authenticating-carrier'
test "${EVENT_NAME:-}" = pull_request
test "${PR_HEAD_REF:-}" = "$CARRIER_BRANCH"
test "$(git rev-parse HEAD^)" = "$PRODUCT_PARENT"
test "$(git rev-parse "$PRODUCT_PARENT^{tree}")" = "$PRODUCT_PARENT_TREE"
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$PRODUCT_PARENT"
expected_carrier_paths | sort > "$OUT/expected-carrier-paths.txt"
git diff --name-only "$PRODUCT_PARENT" HEAD | sort > "$OUT/actual-carrier-paths.txt"
diff -u "$OUT/expected-carrier-paths.txt" "$OUT/actual-carrier-paths.txt"
test "$(git diff --diff-filter=A --name-only "$PRODUCT_PARENT" HEAD | wc -l)" -eq 5
test -z "$(git diff --diff-filter=MDTCRUXB --name-only "$PRODUCT_PARENT" HEAD)"
ref_absent "$PRODUCT_BRANCH"
ref_absent "$STAGING_BRANCH"

STAGE='reconstructing-product'
test "$(stat -c %s "$CHUNK_DIR/part-00")" -eq 8000
test "$(sha256sum "$CHUNK_DIR/part-00" | cut -d' ' -f1)" = 035d633d281d381a1752e838627b120d57cb796ae6205d0735b45eb6736b1441
test "$(stat -c %s "$CHUNK_DIR/part-01")" -eq 8000
test "$(sha256sum "$CHUNK_DIR/part-01" | cut -d' ' -f1)" = 28e4288c1f3295377f67cfb4492977e25046ece24f2ab1fc3eca3bb3bb71bdfe
test "$(stat -c %s "$CHUNK_DIR/part-02")" -eq 6152
test "$(sha256sum "$CHUNK_DIR/part-02" | cut -d' ' -f1)" = af4fc567b8bbb11d74d790ba4f61c1f5fb04c545147827e8a8fa96e05632b1d1
cat "$CHUNK_DIR"/part-* > "$OUT/product.tar.xz.b64"
test "$(sha256sum "$OUT/product.tar.xz.b64" | cut -d' ' -f1)" = "$PRODUCT_BASE64_SHA256"
base64 -d "$OUT/product.tar.xz.b64" > "$OUT/product.tar.xz"
test "$(stat -c %s "$OUT/product.tar.xz")" -eq 16612
test "$(sha256sum "$OUT/product.tar.xz" | cut -d' ' -f1)" = "$PRODUCT_ARCHIVE_SHA256"
tar -tJf "$OUT/product.tar.xz" | sort > "$OUT/archive-product-paths.txt"
expected_product_paths | sort > "$OUT/expected-product-paths.txt"
diff -u "$OUT/expected-product-paths.txt" "$OUT/archive-product-paths.txt"

STAGE='constructing-candidate'
rm -rf "$WORKTREE"
git worktree add --detach "$WORKTREE" "$PRODUCT_PARENT"
tar -xJf "$OUT/product.tar.xz" -C "$WORKTREE"
verify_product_files "$WORKTREE"
git -C "$WORKTREE" config user.name 'RD-04 materializer'
git -C "$WORKTREE" config user.email 'rd04-materializer@users.noreply.github.com'
git -C "$WORKTREE" add -- $(expected_product_paths)
test "$(git -C "$WORKTREE" diff --cached --name-only | wc -l)" -eq 14
test -z "$(git -C "$WORKTREE" diff --cached --diff-filter=MDTCRUXB --name-only)"
git -C "$WORKTREE" commit -m 'Adjudicate RD-04 North Dakota follow-up routes'
CANDIDATE=$(git -C "$WORKTREE" rev-parse HEAD)
CANDIDATE_TREE=$(git -C "$WORKTREE" rev-parse 'HEAD^{tree}')
test "$(git -C "$WORKTREE" rev-parse HEAD^)" = "$PRODUCT_PARENT"
test "$CANDIDATE_TREE" = "$EXPECTED_PRODUCT_TREE"
expected_product_paths | sort > "$OUT/expected-product-paths.txt"
git -C "$WORKTREE" diff --name-only "$PRODUCT_PARENT" HEAD | sort > "$OUT/candidate-paths.txt"
diff -u "$OUT/expected-product-paths.txt" "$OUT/candidate-paths.txt"
printf '%s\n' "$CANDIDATE" > "$OUT/full-candidate-commit.txt"
printf '%s\n' "$CANDIDATE_TREE" > "$OUT/full-candidate-tree.txt"

STAGE='running-focused-gates'
run_product_gates "$WORKTREE"

STAGE='running-complete-release-gate'
(
  cd "$WORKTREE"
  npm run release:check
)

STAGE='clean-replay'
git -C "$WORKTREE" reset --hard "$CANDIDATE"
git -C "$WORKTREE" clean -fdx
run_product_gates "$WORKTREE"
verify_product_files "$WORKTREE"
test -z "$(git -C "$WORKTREE" status --porcelain)"
cp "$OUT/product.tar.xz" "$OUT/qualified-product.tar.xz"
test "$(sha256sum "$OUT/qualified-product.tar.xz" | cut -d' ' -f1)" = "$PRODUCT_ARCHIVE_SHA256"

STAGE='staging-ordinary-blobs'
git -C "$WORKTREE" reset --hard "$PRODUCT_PARENT"
git -C "$WORKTREE" clean -fdx
tar -xJf "$OUT/product.tar.xz" -C "$WORKTREE"
mkdir -p "$WORKTREE/$(dirname "$STAGED_WORKFLOW")"
mv "$WORKTREE/$PRODUCT_WORKFLOW" "$WORKTREE/$STAGED_WORKFLOW"
expected_staging_paths | sort > "$OUT/expected-staging-paths.txt"
git -C "$WORKTREE" add -- $(expected_staging_paths)
test "$(git -C "$WORKTREE" diff --cached --name-only | wc -l)" -eq 14
test -z "$(git -C "$WORKTREE" diff --cached --diff-filter=MDTCRUXB --name-only)"
git -C "$WORKTREE" commit -m 'Stage ordinary blobs for RD-04 North Dakota follow-up adjudication'
STAGING_COMMIT=$(git -C "$WORKTREE" rev-parse HEAD)
STAGING_TREE=$(git -C "$WORKTREE" rev-parse 'HEAD^{tree}')
test "$(git -C "$WORKTREE" rev-parse HEAD^)" = "$PRODUCT_PARENT"
git -C "$WORKTREE" diff --name-only "$PRODUCT_PARENT" HEAD | sort > "$OUT/staging-paths.txt"
diff -u "$OUT/expected-staging-paths.txt" "$OUT/staging-paths.txt"
printf '%s\n' "$STAGING_COMMIT" > "$OUT/staging-commit.txt"
printf '%s\n' "$STAGING_TREE" > "$OUT/staging-tree.txt"

STAGE='publishing-staging'
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = "$PRODUCT_PARENT"
ref_absent "$PRODUCT_BRANCH"
ref_absent "$STAGING_BRANCH"
git -C "$WORKTREE" push origin "HEAD:refs/heads/$STAGING_BRANCH"

git fetch --no-tags origin "refs/heads/$STAGING_BRANCH:refs/remotes/origin/$STAGING_BRANCH"
test "$(git rev-parse "refs/remotes/origin/$STAGING_BRANCH")" = "$STAGING_COMMIT"

STAGE='complete'
jq -n \
  --arg parent "$PRODUCT_PARENT" \
  --arg parent_tree "$PRODUCT_PARENT_TREE" \
  --arg carrier_head "$(git rev-parse HEAD)" \
  --arg candidate "$CANDIDATE" \
  --arg candidate_tree "$CANDIDATE_TREE" \
  --arg staging_branch "$STAGING_BRANCH" \
  --arg staging_commit "$STAGING_COMMIT" \
  --arg staging_tree "$STAGING_TREE" \
  '{schema_version:"ssc-rd04-postpromotion-nd-followup-two-route-adjudication-stager@1",state:"qualified_staging_published",failed_or_final_stage:"complete",exit_code:0,product_parent:$parent,product_parent_tree:$parent_tree,carrier_head:$carrier_head,product_archive_sha256:"2e5a31f9646962abf620d09d198c3481b4301cb16c11bed95fd59b88e0a6af71",permanent_product_paths:14,qualified_full_candidate_commit:$candidate,qualified_full_candidate_tree:$candidate_tree,staging_branch:$staging_branch,staging_commit:$staging_commit,staging_tree:$staging_tree,staging_paths:14,permanent_workflow_omitted_from_staging:true,permanent_workflow_staged_path:".tmp/ssc-rd04-postpromotion-nd-followup-two-route-adjudication-staged/permanent-workflow.yml",source_admissions:2,field_decisions:2,candidate_findings:1,held_open_cells:1,source_requests_executed:0,route_executions:0,matrix_updates_created_by_stager:0,field_terminalizations_created_by_stager:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",product_authority_created:false,connector_final_assembly_required:true}' > "$OUT/receipt.json"
