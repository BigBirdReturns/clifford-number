#!/usr/bin/env bash
set -uo pipefail

OUT="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-artifact-tail-repair-v1"
SOURCE_WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-artifact-tail-repair-source-v1"
QUAL_WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-artifact-tail-repair-qual-v1"
INDEX_FILE="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-artifact-tail-repair-v1.index"
STAGING_INDEX="${RUNNER_TEMP}/ssc-rd04-postpromotion-five-route-adjudication-artifact-tail-repair-staging-v1.index"
rm -rf "$OUT" "$SOURCE_WT" "$QUAL_WT" "$INDEX_FILE" "$STAGING_INDEX"
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
    --arg schema_version "ssc-rd04-postpromotion-five-route-adjudication-artifact-tail-repair@1" \
    --arg state "$state" \
    --arg stage "$stage" \
    --argjson exit_code "$code" \
    --arg canonical_parent "$CURRENT_MAIN" \
    --arg canonical_parent_tree "$main_tree" \
    --arg source_repair_commit "$SOURCE_REPAIR" \
    --arg source_repair_tree "$SOURCE_REPAIR_TREE" \
    --arg source_workflow_blob "$SOURCE_WORKFLOW_BLOB" \
    --arg source_manifest_blob "$SOURCE_MANIFEST_BLOB" \
    --arg source_builder_blob "$SOURCE_BUILDER_BLOB" \
    --arg source_schema_blob "$SOURCE_SCHEMA_BLOB" \
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
      canonical_parent:$canonical_parent,
      canonical_parent_tree:(if $canonical_parent_tree=="" then null else $canonical_parent_tree end),
      source_repair_commit:$source_repair_commit,
      source_repair_tree:$source_repair_tree,
      source_blobs:{workflow:$source_workflow_blob,manifest:$source_manifest_blob,builder:$source_builder_blob,schema:$source_schema_blob},
      qualified_candidate_commit:(if $candidate_commit=="" then null else $candidate_commit end),
      qualified_candidate_tree:(if $candidate_tree=="" then null else $candidate_tree end),
      final_workflow_blob:(if $workflow_blob=="" then null else $workflow_blob end),
      final_manifest_blob:(if $manifest_blob=="" then null else $manifest_blob end),
      repair_path_count:2,
      artifact_tail_change_count:1,
      semantic_product_paths_changed:0,
      receipt_preservation_replay:"pass",
      staging_branch:$staging_branch,
      staging_commit:(if $staging_commit=="" then null else $staging_commit end),
      staging_tree:(if $staging_tree=="" then null else $staging_tree end),
      workflow_shadow_path:$workflow_shadow_path,
      staging_path_count:2,
      permanent_workflow_updated_by_actions:false,
      permanent_repair_ref_updated_by_actions:false,
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
      authority:(if $state=="qualified_and_staged" then "artifact_tail_repair_candidate_and_staging_custody_only" else "failure_custody_only" end)
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

stage=bind_carrier_and_live_refs
printf '%s\n' "$CARRIER_SCRIPT_PATH" "$CARRIER_WORKFLOW_PATH" | LC_ALL=C sort > "$OUT/carrier-expected-paths.txt"
test "$(git rev-parse HEAD^^)" = "$CURRENT_MAIN"
test "$(git rev-list --count "$CURRENT_MAIN"..HEAD)" -eq 2
git diff --name-only "$CURRENT_MAIN" HEAD | LC_ALL=C sort > "$OUT/carrier-actual-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" HEAD | LC_ALL=C sort > "$OUT/carrier-added-paths.txt"
diff -u "$OUT/carrier-expected-paths.txt" "$OUT/carrier-actual-paths.txt"
diff -u "$OUT/carrier-expected-paths.txt" "$OUT/carrier-added-paths.txt"
git diff --check "$CURRENT_MAIN" HEAD

test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
test "$(git ls-remote --heads origin "refs/heads/$REPAIR_BRANCH" | awk '{print $1}')" = "$SOURCE_REPAIR"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git fetch --no-tags origin \
  "+refs/heads/main:refs/remotes/origin/main" \
  "+refs/heads/$REPAIR_BRANCH:refs/remotes/origin/$REPAIR_BRANCH"
test "$(git rev-parse origin/main)" = "$CURRENT_MAIN"
test "$(git rev-parse "origin/$REPAIR_BRANCH")" = "$SOURCE_REPAIR"
main_tree="$(git rev-parse "$CURRENT_MAIN^{tree}")"
printf '%s\n' "$main_tree" > "$OUT/current-main-tree.txt"

stage=bind_source_repair
test "$(git rev-parse "$SOURCE_REPAIR^")" = "$CURRENT_MAIN"
test "$(git rev-parse "$SOURCE_REPAIR^{tree}")" = "$SOURCE_REPAIR_TREE"
test "$(git rev-list --count "$CURRENT_MAIN".."$SOURCE_REPAIR")" -eq 1
git diff --name-only --diff-filter=ACDMRTUXB "$CURRENT_MAIN" "$SOURCE_REPAIR" | LC_ALL=C sort > "$OUT/source-repair-actual-paths.txt"
git diff --name-only --diff-filter=M "$CURRENT_MAIN" "$SOURCE_REPAIR" | LC_ALL=C sort > "$OUT/source-repair-modified-paths.txt"
diff -u "$REPAIR_PATHS" "$OUT/source-repair-actual-paths.txt"
diff -u "$REPAIR_PATHS" "$OUT/source-repair-modified-paths.txt"
test "$(git rev-parse "$SOURCE_REPAIR:$WORKFLOW_PATH")" = "$SOURCE_WORKFLOW_BLOB"
test "$(git rev-parse "$SOURCE_REPAIR:$MANIFEST_PATH")" = "$SOURCE_MANIFEST_BLOB"
test "$(git rev-parse "$SOURCE_REPAIR:$BUILDER_PATH")" = "$SOURCE_BUILDER_BLOB"
test "$(git rev-parse "$SOURCE_REPAIR:$SCHEMA_PATH")" = "$SOURCE_SCHEMA_BLOB"

stage=repair_artifact_tail_and_regenerate_manifest
git worktree add --detach "$SOURCE_WT" "$SOURCE_REPAIR"
cd "$SOURCE_WT"
git show "$SOURCE_REPAIR:$MANIFEST_PATH" > "$OUT/source-manifest.json"
export OUT_SOURCE_MANIFEST="$OUT/source-manifest.json"
python - <<'PY'
import os
from pathlib import Path
workflow=Path(os.environ['WORKFLOW_PATH'])
text=workflow.read_text()
old='          sha256sum -c "$OUT/SHA256SUMS"\n'
new='          (cd "$OUT" && sha256sum -c SHA256SUMS)\n'
if text.count(old)!=1:
    raise SystemExit(f'artifact-tail denominator={text.count(old)}')
if new in text:
    raise SystemExit('corrected artifact tail already present unexpectedly')
workflow.write_text(text.replace(old,new,1))
PY
node "$BUILDER_PATH" --write

git diff --name-only "$SOURCE_REPAIR" | LC_ALL=C sort > "$OUT/final-repair-actual-paths.txt"
diff -u "$REPAIR_PATHS" "$OUT/final-repair-actual-paths.txt"
git diff --check "$SOURCE_REPAIR"

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

stage=construct_exact_candidate
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
export GIT_AUTHOR_DATE='2026-08-08T17:30:00Z'
export GIT_COMMITTER_NAME='github-actions[bot]'
export GIT_COMMITTER_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_COMMITTER_DATE='2026-08-08T17:30:00Z'
candidate_commit="$(printf '%s\n\n%s\n' \
  'Repair RD-04 adjudication workflow contract and artifact custody' \
  'Preserve the historical and live contract split, verify qualification checksums inside their receipt directory, and regenerate only the product manifest. Preserve every source, field, candidate, hold, matrix, row, class, cumulative-ledger, publication, adoption, graph, outside-human, and route-execution boundary.' \
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
printf '%s\n' "$workflow_blob" > "$OUT/final-workflow-blob.txt"
printf '%s\n' "$manifest_blob" > "$OUT/final-manifest-blob.txt"

stage=qualify_exact_candidate
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

stage=replay_receipt_preservation
QOUT="$OUT/exact-head-qualification-replay"
rm -rf "$QOUT"
mkdir -p "$QOUT"
tar -cJf "$QOUT/product.tar.xz" -T "$PRODUCT_PATHS"
cp "$OUT/validation.json" "$QOUT/validation.json"
cp "$OUT/adversarial.json" "$QOUT/adversarial.json"
git rev-parse HEAD > "$QOUT/head-sha.txt"
git rev-parse 'HEAD^{tree}' > "$QOUT/head-tree.txt"
git ls-tree -r HEAD -- $(cat "$PRODUCT_PATHS") > "$QOUT/product-tree-rows.txt"
(cd "$QOUT" && find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS)
(cd "$QOUT" && sha256sum -c SHA256SUMS) | tee "$OUT/receipt-preservation-check.log"
test "$(grep -c ': OK$' "$OUT/receipt-preservation-check.log")" -eq 6

grep -F '(cd "$OUT" && sha256sum -c SHA256SUMS)' "$WORKFLOW_PATH" > "$OUT/corrected-tail-assertion.txt"
test "$(grep -cF 'sha256sum -c "$OUT/SHA256SUMS"' "$WORKFLOW_PATH" || true)" -eq 0

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
export GIT_AUTHOR_DATE='2026-08-08T17:31:00Z'
export GIT_COMMITTER_DATE='2026-08-08T17:31:00Z'
staging_commit="$(printf '%s\n\n%s\n' \
  'Stage RD-04 artifact-tail repair objects' \
  'Stage the final generated manifest and the final workflow under a non-workflow shadow path for connector-owned exact-tree assembly. This staging commit has no permanent repair, evidentiary, field, row, class, ledger, publication, adoption, graph, outside-human, or route-execution authority.' \
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
test "$(git ls-remote --heads origin "refs/heads/$REPAIR_BRANCH" | awk '{print $1}')" = "$SOURCE_REPAIR"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git push origin "$staging_commit:refs/heads/$STAGING_BRANCH" --force-with-lease="refs/heads/$STAGING_BRANCH:"
test "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')" = "$staging_commit"

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
write_receipt qualified_and_staged 0 "$candidate_commit" "$candidate_tree" "$workflow_blob" "$manifest_blob" "$staging_commit" "$staging_tree" "$main_tree"
cd "$GITHUB_WORKSPACE"
rm -rf "$OUT/repair-files" "$SOURCE_WT" "$QUAL_WT" "$INDEX_FILE" "$STAGING_INDEX"
finalize_ledger
