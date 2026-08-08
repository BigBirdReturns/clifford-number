#!/usr/bin/env bash
set -uo pipefail

OUT="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-workflow-repair-v1"
REPAIR_WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-workflow-repair-v1-wt"
QUAL_WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-workflow-repair-v1-qual"
INDEX_FILE="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-workflow-repair-v1.index"
STAGING_INDEX="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-workflow-repair-v1-staging.index"
rm -rf "$OUT" "$REPAIR_WT" "$QUAL_WT" "$INDEX_FILE" "$STAGING_INDEX"
mkdir -p "$OUT"
exec > >(tee "$OUT/transaction.log") 2>&1
stage=bootstrap

write_boundary() {
  cat > "$OUT/BOUNDARY" <<'BOUNDARY'
source_requests=0
route_executions=0
source_admissions_created=0
reviewed_source_admissions_preserved=4
promotion_candidates_preserved=4
held_open_cells_preserved=2
matrix_updates=0
field_terminalizations=0
row_state_mutations=0
class_closed=false
cumulative_ledger_effect=none
outside_human_dependency=false
publication_effect=none
adoption_effect=none
graph_effect=none
BOUNDARY
}

write_receipt() {
  local state="$1"
  local code="$2"
  local candidate_commit="${3:-}"
  local candidate_tree="${4:-}"
  local workflow_blob="${5:-}"
  local manifest_blob="${6:-}"
  local staging_commit="${7:-}"
  local staging_tree="${8:-}"
  local main_tree="${9:-}"
  jq -n \
    --arg schema_version "ssc-rd04-postpromotion-five-route-adjudication-workflow-repair@1" \
    --arg state "$state" \
    --arg stage "$stage" \
    --argjson exit_code "$code" \
    --arg canonical_main "$CURRENT_MAIN" \
    --arg canonical_main_tree "$main_tree" \
    --arg canonical_first_parent "$FIRST_PARENT" \
    --arg product_commit "$PRODUCT_COMMIT" \
    --arg product_parent "$PRODUCT_PARENT" \
    --arg source_workflow_blob "$SOURCE_WORKFLOW_BLOB" \
    --arg source_manifest_blob "$SOURCE_MANIFEST_BLOB" \
    --arg source_builder_blob "$SOURCE_BUILDER_BLOB" \
    --arg source_schema_blob "$SOURCE_SCHEMA_BLOB" \
    --arg historical_contract_blob "$HISTORICAL_CONTRACT_BLOB" \
    --arg live_contract_blob "$LIVE_CONTRACT_BLOB" \
    --arg route_ledger_blob "$ROUTE_LEDGER_BLOB" \
    --arg matrix_blob "$MATRIX_BLOB" \
    --arg exclusion_blob "$EXCLUSION_BLOB" \
    --arg candidate_commit "$candidate_commit" \
    --arg candidate_tree "$candidate_tree" \
    --arg workflow_blob "$workflow_blob" \
    --arg manifest_blob "$manifest_blob" \
    --arg staging_branch "$STAGING_BRANCH" \
    --arg staging_commit "$staging_commit" \
    --arg staging_tree "$staging_tree" \
    --arg workflow_shadow_path "$WORKFLOW_SHADOW_PATH" \
    '{
      schema_version:$schema_version,
      state:$state,
      exit_code:$exit_code,
      failed_or_final_stage:$stage,
      canonical_main:$canonical_main,
      canonical_main_tree:(if $canonical_main_tree=="" then null else $canonical_main_tree end),
      canonical_first_parent:$canonical_first_parent,
      product_commit:$product_commit,
      product_parent:$product_parent,
      source_product_blobs:{workflow:$source_workflow_blob,manifest:$source_manifest_blob,builder:$source_builder_blob,schema:$source_schema_blob},
      contract_bindings:{historical_protocol_parent:$historical_contract_blob,live_repaired_main:$live_contract_blob},
      immutable_inputs:{route_ledger:$route_ledger_blob,promoted_partial_field_matrix:$matrix_blob,previously_frozen_url_exclusion:$exclusion_blob},
      qualified_candidate_commit:(if $candidate_commit=="" then null else $candidate_commit end),
      qualified_candidate_tree:(if $candidate_tree=="" then null else $candidate_tree end),
      repaired_workflow_blob:(if $workflow_blob=="" then null else $workflow_blob end),
      regenerated_manifest_blob:(if $manifest_blob=="" then null else $manifest_blob end),
      repair_path_count:2,
      semantic_product_paths_changed:0,
      staging_branch:$staging_branch,
      staging_commit:(if $staging_commit=="" then null else $staging_commit end),
      staging_tree:(if $staging_tree=="" then null else $staging_tree end),
      workflow_shadow_path:$workflow_shadow_path,
      staging_path_count:2,
      permanent_workflow_updated_by_actions:false,
      repair_product_ref_updated_by_actions:false,
      connector_publication_required:true,
      source_requests_executed:0,
      route_executions:0,
      source_admissions_created:0,
      reviewed_source_admissions_preserved:4,
      promotion_candidates_preserved:4,
      held_open_cells_preserved:2,
      matrix_updates:0,
      field_terminalizations:0,
      row_state_mutations:0,
      class_closed:false,
      cumulative_ledger_effect:"none",
      outside_human_dependency:false,
      publication_effect:"none",
      adoption_effect:"none",
      graph_effect:"none",
      authority:(if $state=="qualified_and_staged" then "workflow_repair_candidate_and_staging_custody_only" else "failure_custody_only" end)
    }' > "$OUT/receipt.json"
}

finalize_ledger() {
  set +e
  if [[ -d "$OUT" ]]; then
    (cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS)
  fi
}

on_error() {
  local code=$?
  trap - ERR
  set +e
  printf '%s\n' "$code" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  write_receipt failed_closed "$code" "${candidate_commit:-}" "${candidate_tree:-}" "${workflow_blob:-}" "${manifest_blob:-}" "${staging_commit:-}" "${staging_tree:-}" "${main_tree:-}"
  finalize_ledger
  exit "$code"
}
trap on_error ERR
set -Eeuo pipefail
write_boundary

PRODUCT_PATHS="$OUT/product-paths.txt"
REPAIR_PATHS="$OUT/repair-paths.txt"
STAGING_PATHS="$OUT/staging-paths.txt"

cat > "$PRODUCT_PATHS" <<'PATHS'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.yml
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/capture-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/field-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/index.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/pdf-review-receipts.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/product-manifest.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/promotion-candidate-protocol.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/selected-followup-protocol.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/source-adjudications.json
docs/milestones/ssc-rd-wave03-rd04-postpromotion-five-route-adjudication.md
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.schema.json
test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs
PATHS
LC_ALL=C sort -o "$PRODUCT_PATHS" "$PRODUCT_PATHS"

printf '%s\n' "$WORKFLOW_PATH" "$MANIFEST_PATH" | LC_ALL=C sort > "$REPAIR_PATHS"
printf '%s\n' "$MANIFEST_PATH" "$WORKFLOW_SHADOW_PATH" | LC_ALL=C sort > "$STAGING_PATHS"

stage=bind_carrier_and_live_main
printf '%s\n' "$CARRIER_SCRIPT_PATH" "$CARRIER_WORKFLOW_PATH" | LC_ALL=C sort > "$OUT/carrier-expected-paths.txt"
test "$(git rev-parse HEAD^^)" = "$CURRENT_MAIN"
test "$(git rev-list --count "$CURRENT_MAIN"..HEAD)" -eq 2
git diff --name-only "$CURRENT_MAIN" HEAD | LC_ALL=C sort > "$OUT/carrier-actual-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" HEAD | LC_ALL=C sort > "$OUT/carrier-added-paths.txt"
diff -u "$OUT/carrier-expected-paths.txt" "$OUT/carrier-actual-paths.txt"
diff -u "$OUT/carrier-expected-paths.txt" "$OUT/carrier-added-paths.txt"
git diff --check "$CURRENT_MAIN" HEAD

test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main"
test "$(git rev-parse origin/main)" = "$CURRENT_MAIN"
main_tree="$(git rev-parse "$CURRENT_MAIN^{tree}")"
printf '%s\n' "$main_tree" > "$OUT/current-main-tree.txt"

stage=bind_canonical_merge_and_product
test "$(git rev-parse "$CURRENT_MAIN^1")" = "$FIRST_PARENT"
test "$(git rev-parse "$CURRENT_MAIN^2")" = "$PRODUCT_COMMIT"
test "$(git rev-parse "$PRODUCT_COMMIT^")" = "$PRODUCT_PARENT"
test "$(git rev-list --count "$PRODUCT_PARENT".."$PRODUCT_COMMIT")" -eq 1

git diff --name-only --diff-filter=ACDMRTUXB "$FIRST_PARENT" "$CURRENT_MAIN" | LC_ALL=C sort > "$OUT/main-product-paths.txt"
git diff --name-only --diff-filter=A "$FIRST_PARENT" "$CURRENT_MAIN" | LC_ALL=C sort > "$OUT/main-product-added-paths.txt"
git diff --name-only --diff-filter=ACDMRTUXB "$PRODUCT_PARENT" "$PRODUCT_COMMIT" | LC_ALL=C sort > "$OUT/source-product-paths.txt"
git diff --name-only --diff-filter=A "$PRODUCT_PARENT" "$PRODUCT_COMMIT" | LC_ALL=C sort > "$OUT/source-product-added-paths.txt"
diff -u "$PRODUCT_PATHS" "$OUT/main-product-paths.txt"
diff -u "$PRODUCT_PATHS" "$OUT/main-product-added-paths.txt"
diff -u "$PRODUCT_PATHS" "$OUT/source-product-paths.txt"
diff -u "$PRODUCT_PATHS" "$OUT/source-product-added-paths.txt"

: > "$OUT/canonical-product-blob-ledger.tsv"
while IFS= read -r path; do
  main_blob="$(git rev-parse "$CURRENT_MAIN:$path")"
  product_blob="$(git rev-parse "$PRODUCT_COMMIT:$path")"
  test "$main_blob" = "$product_blob"
  printf '%s\t%s\n' "$path" "$main_blob" >> "$OUT/canonical-product-blob-ledger.tsv"
done < "$PRODUCT_PATHS"

test "$(git rev-parse "$CURRENT_MAIN:$WORKFLOW_PATH")" = "$SOURCE_WORKFLOW_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$MANIFEST_PATH")" = "$SOURCE_MANIFEST_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$BUILDER_PATH")" = "$SOURCE_BUILDER_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$SCHEMA_PATH")" = "$SOURCE_SCHEMA_BLOB"

stage=bind_historical_and_live_inputs
test "$(git rev-parse "$PRODUCT_PARENT:$ROUTE_CONTRACT_PATH")" = "$HISTORICAL_CONTRACT_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$ROUTE_CONTRACT_PATH")" = "$LIVE_CONTRACT_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$ROUTE_LEDGER_PATH")" = "$ROUTE_LEDGER_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$MATRIX_PATH")" = "$MATRIX_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:$EXCLUSION_PATH")" = "$EXCLUSION_BLOB"

stage=repair_workflow_and_regenerate_manifest
git worktree add --detach "$REPAIR_WT" "$CURRENT_MAIN"
cd "$REPAIR_WT"
git show "$CURRENT_MAIN:$MANIFEST_PATH" > "$OUT/source-manifest.json"
export OUT_SOURCE_MANIFEST="$OUT/source-manifest.json"
python - <<'PY'
import os
from pathlib import Path

workflow=Path(os.environ['WORKFLOW_PATH'])
contract_path=os.environ['ROUTE_CONTRACT_PATH']
historical=os.environ['HISTORICAL_CONTRACT_BLOB']
live=os.environ['LIVE_CONTRACT_BLOB']
text=workflow.read_text()
old=f'          test "$(git hash-object {contract_path})" = {historical}\n'
new=(
    f'          test "$(git rev-parse "$PRODUCT_PARENT:{contract_path}")" = {historical}\n'
    f'          test "$(git hash-object {contract_path})" = {live}\n'
)
if text.count(old)!=1:
    raise SystemExit(f'workflow stale-contract denominator={text.count(old)}')
if live in text:
    raise SystemExit('live contract already present unexpectedly')
workflow.write_text(text.replace(old,new,1))
PY
node "$BUILDER_PATH" --write

git diff --name-only "$CURRENT_MAIN" | LC_ALL=C sort > "$OUT/repair-actual-paths.txt"
diff -u "$REPAIR_PATHS" "$OUT/repair-actual-paths.txt"
git diff --check "$CURRENT_MAIN"

python - <<'PY'
import hashlib
import json
import os
from pathlib import Path

old=json.loads(Path(os.environ['OUT_SOURCE_MANIFEST']).read_text())
new=json.loads(Path(os.environ['MANIFEST_PATH']).read_text())
workflow=Path(os.environ['WORKFLOW_PATH'])
workflow_path=os.environ['WORKFLOW_PATH']

def git_blob(data: bytes) -> str:
    return hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()

for key in old:
    if key not in {'combined_sha256','hashed_files'} and old[key]!=new.get(key):
        raise SystemExit(f'manifest top-level drift: {key}')
old_rows={row['path']:row for row in old['hashed_files']}
new_rows={row['path']:row for row in new['hashed_files']}
if old_rows.keys()!=new_rows.keys():
    raise SystemExit('manifest path denominator changed')
for path,row in old_rows.items():
    if path!=workflow_path and row!=new_rows[path]:
        raise SystemExit(f'manifest non-workflow row changed: {path}')
data=workflow.read_bytes()
expected={'path':workflow_path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'git_blob':git_blob(data)}
if new_rows[workflow_path]!=expected:
    raise SystemExit('new workflow manifest row mismatch')
if old['combined_sha256']==new['combined_sha256']:
    raise SystemExit('combined manifest digest did not change')
if new['authority_boundary']!=old['authority_boundary']:
    raise SystemExit('authority boundary changed')
print(json.dumps(expected,sort_keys=True))
PY

stage=construct_exact_repair_candidate
rm -f "$INDEX_FILE"
GIT_INDEX_FILE="$INDEX_FILE" git read-tree "$CURRENT_MAIN"
: > "$OUT/candidate-blob-ledger.tsv"
while IFS= read -r path; do
  blob="$(git hash-object -w --no-filters "$path")"
  GIT_INDEX_FILE="$INDEX_FILE" git update-index --add --cacheinfo "100644,$blob,$path"
  printf '%s\t%s\n' "$path" "$blob" >> "$OUT/candidate-blob-ledger.tsv"
done < "$REPAIR_PATHS"
candidate_tree="$(GIT_INDEX_FILE="$INDEX_FILE" git write-tree)"
export GIT_AUTHOR_NAME='github-actions[bot]'
export GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_AUTHOR_DATE='2026-08-08T17:15:00Z'
export GIT_COMMITTER_NAME='github-actions[bot]'
export GIT_COMMITTER_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_COMMITTER_DATE='2026-08-08T17:15:00Z'
candidate_commit="$(printf '%s\n\n%s\n' \
  'Repair RD-04 five-route adjudication workflow contract binding' \
  'Separate the historical protocol-parent route contract from the repaired live-main contract and regenerate only the product manifest. Preserve every source, field, candidate, hold, matrix, row, class, cumulative-ledger, publication, adoption, graph, outside-human, and route-execution boundary.' \
  | git commit-tree "$candidate_tree" -p "$CURRENT_MAIN")"
test "$(git rev-parse "$candidate_commit^")" = "$CURRENT_MAIN"
test "$(git rev-parse "$candidate_commit^{tree}")" = "$candidate_tree"
printf '%s\n' "$candidate_commit" > "$OUT/candidate-commit.txt"
printf '%s\n' "$candidate_tree" > "$OUT/candidate-tree.txt"
git diff --name-only --diff-filter=ACDMRTUXB "$CURRENT_MAIN" "$candidate_commit" | LC_ALL=C sort > "$OUT/candidate-actual-paths.txt"
git diff --name-only --diff-filter=M "$CURRENT_MAIN" "$candidate_commit" | LC_ALL=C sort > "$OUT/candidate-modified-paths.txt"
diff -u "$REPAIR_PATHS" "$OUT/candidate-actual-paths.txt"
diff -u "$REPAIR_PATHS" "$OUT/candidate-modified-paths.txt"
workflow_blob="$(git rev-parse "$candidate_commit:$WORKFLOW_PATH")"
manifest_blob="$(git rev-parse "$candidate_commit:$MANIFEST_PATH")"
printf '%s\n' "$workflow_blob" > "$OUT/repaired-workflow-blob.txt"
printf '%s\n' "$manifest_blob" > "$OUT/regenerated-manifest-blob.txt"

stage=qualify_exact_repair_candidate
git worktree add --detach "$QUAL_WT" "$candidate_commit"
cd "$QUAL_WT"
python -m pip install --disable-pip-version-check --no-input 'jsonschema==4.25.1' 'PyYAML==6.0.2'
python - <<'PYYAML'
from pathlib import Path
import yaml
value=yaml.safe_load(Path('.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.yml').read_text())
if not isinstance(value,dict):
    raise SystemExit('workflow YAML did not parse as an object')
print('workflow_yaml_parse=pass')
PYYAML
node --check "$BUILDER_PATH"
node --check tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs
node --check test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js
node "$BUILDER_PATH"
git diff --exit-code -- data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication

python - <<'PYSCHEMA'
import copy
import json
from pathlib import Path
from jsonschema import Draft202012Validator
schema=json.loads(Path('schemas/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.schema.json').read_text())
validator=Draft202012Validator(schema)
root=Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication')
names=['capture-custody.json','source-adjudications.json','field-adjudications.json','pdf-review-receipts.json','promotion-candidate-protocol.json','selected-followup-protocol.json','index.json','product-manifest.json']
refusals=0
for name in names:
    value=json.loads((root/name).read_text())
    errors=sorted(validator.iter_errors(value),key=lambda e:list(e.path))
    if errors:
        raise SystemExit(f'{name}: {errors[0].message} at {list(errors[0].path)}')
    top=copy.deepcopy(value); top['unreviewed_authority']=True
    if not list(validator.iter_errors(top)):
        raise SystemExit(f'{name} accepted top-level unknown key')
    refusals+=1
print(f'recursively_exact_schema_validation=pass objects={len(names)} mutation_refusals={refusals}')
PYSCHEMA

node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs | tee "$OUT/validation.json"
node test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js | tee "$OUT/adversarial.json"
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
npm run release:check

git restore --staged --worktree .
git clean -fdx
node "$BUILDER_PATH" --write
node "$BUILDER_PATH"
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs > "$OUT/validation-replay.json"
node test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js > "$OUT/adversarial-replay.json"
node tools/validate-no-magic-human-gate.mjs
git diff --check
git diff --exit-code
test -z "$(git status --porcelain=v1 --untracked-files=all)"

test "$(git rev-parse "$PRODUCT_PARENT:$ROUTE_CONTRACT_PATH")" = "$HISTORICAL_CONTRACT_BLOB"
test "$(git hash-object "$ROUTE_CONTRACT_PATH")" = "$LIVE_CONTRACT_BLOB"
test "$(git hash-object "$ROUTE_LEDGER_PATH")" = "$ROUTE_LEDGER_BLOB"
test "$(git hash-object "$MATRIX_PATH")" = "$MATRIX_BLOB"
test "$(git hash-object "$EXCLUSION_PATH")" = "$EXCLUSION_BLOB"

grep -F 'git rev-parse "$PRODUCT_PARENT:'"$ROUTE_CONTRACT_PATH"'"' "$WORKFLOW_PATH" > "$OUT/historical-contract-assertion.txt"
grep -F 'git hash-object '"$ROUTE_CONTRACT_PATH" "$WORKFLOW_PATH" > "$OUT/live-contract-assertion.txt"

stage=preserve_exact_repair
mkdir -p "$OUT/repair-files"
while IFS= read -r path; do
  install -D -m 0644 "$path" "$OUT/repair-files/$path"
done < "$REPAIR_PATHS"
tar -cJf "$OUT/repair.tar.xz" -C "$OUT/repair-files" --files-from="$REPAIR_PATHS"
printf '%s\n' "$(stat -c %s "$OUT/repair.tar.xz")" > "$OUT/repair-archive-bytes.txt"
printf '%s\n' "$(sha256sum "$OUT/repair.tar.xz" | cut -d' ' -f1)" > "$OUT/repair-archive-sha256.txt"
(cd "$OUT/repair-files" && while IFS= read -r path; do sha256sum "$path"; done < "$REPAIR_PATHS") > "$OUT/repair-file-sha256-ledger.txt"

stage=construct_and_publish_staging
rm -f "$STAGING_INDEX"
GIT_INDEX_FILE="$STAGING_INDEX" git read-tree "$CURRENT_MAIN"
GIT_INDEX_FILE="$STAGING_INDEX" git update-index --add --cacheinfo "100644,$manifest_blob,$MANIFEST_PATH"
GIT_INDEX_FILE="$STAGING_INDEX" git update-index --add --cacheinfo "100644,$workflow_blob,$WORKFLOW_SHADOW_PATH"
staging_tree="$(GIT_INDEX_FILE="$STAGING_INDEX" git write-tree)"
export GIT_AUTHOR_DATE='2026-08-08T17:16:00Z'
export GIT_COMMITTER_DATE='2026-08-08T17:16:00Z'
staging_commit="$(printf '%s\n\n%s\n' \
  'Stage RD-04 adjudication workflow-repair objects' \
  'Stage the regenerated manifest at its final path and the repaired workflow under a non-workflow shadow path for connector-owned exact-tree assembly. This staging commit has no permanent repair, evidentiary, field, row, class, ledger, publication, adoption, graph, outside-human, or route-execution authority.' \
  | git commit-tree "$staging_tree" -p "$CURRENT_MAIN")"
test "$(git rev-parse "$staging_commit^")" = "$CURRENT_MAIN"
test "$(git rev-parse "$staging_commit^{tree}")" = "$staging_tree"
git diff --name-only --diff-filter=ACDMRTUXB "$CURRENT_MAIN" "$staging_commit" | LC_ALL=C sort > "$OUT/staging-actual-paths.txt"
git diff --name-only --diff-filter=M "$CURRENT_MAIN" "$staging_commit" | LC_ALL=C sort > "$OUT/staging-modified-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" "$staging_commit" | LC_ALL=C sort > "$OUT/staging-added-paths.txt"
diff -u "$STAGING_PATHS" "$OUT/staging-actual-paths.txt"
printf '%s\n' "$MANIFEST_PATH" | diff -u - "$OUT/staging-modified-paths.txt"
printf '%s\n' "$WORKFLOW_SHADOW_PATH" | diff -u - "$OUT/staging-added-paths.txt"
printf '%s\n' "$staging_commit" > "$OUT/staging-commit.txt"
printf '%s\n' "$staging_tree" > "$OUT/staging-tree.txt"

test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git push origin "$staging_commit:refs/heads/$STAGING_BRANCH" --force-with-lease="refs/heads/$STAGING_BRANCH:"
test "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')" = "$staging_commit"

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
write_receipt qualified_and_staged 0 "$candidate_commit" "$candidate_tree" "$workflow_blob" "$manifest_blob" "$staging_commit" "$staging_tree" "$main_tree"
cd "$GITHUB_WORKSPACE"
rm -rf "$OUT/repair-files" "$REPAIR_WT" "$QUAL_WT" "$INDEX_FILE" "$STAGING_INDEX"
finalize_ledger
