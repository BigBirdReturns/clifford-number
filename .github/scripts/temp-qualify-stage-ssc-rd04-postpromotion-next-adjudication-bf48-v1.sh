#!/usr/bin/env bash
set -uo pipefail

OUT="${RUNNER_TEMP}/ssc-rd04-postpromotion-next-adjudication-bf48-rebind-stager-v1"
SOURCE_WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-next-adjudication-bf48-source-v1"
QUAL_WT="${RUNNER_TEMP}/ssc-rd04-postpromotion-next-adjudication-bf48-qualified-v1"
INDEX_FILE="${RUNNER_TEMP}/ssc-rd04-postpromotion-next-adjudication-bf48.index"
ORDINARY_INDEX="${RUNNER_TEMP}/ssc-rd04-postpromotion-next-adjudication-bf48-ordinary.index"
rm -rf "$OUT" "$SOURCE_WT" "$QUAL_WT" "$INDEX_FILE" "$ORDINARY_INDEX"
mkdir -p "$OUT"
exec > >(tee "$OUT/transaction.log") 2>&1
stage=bootstrap

write_boundary() {
  cat > "$OUT/BOUNDARY" <<'BOUNDARY'
source_requests=0
route_executions=0
reviewed_source_admissions=4
promotion_candidates=4
held_open_cells=2
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
  local ordinary_commit="${5:-}"
  local ordinary_tree="${6:-}"
  local main_tree="${7:-}"
  jq -n \
    --arg schema_version "ssc-rd04-postpromotion-next-adjudication-bf48-rebind-stager@1" \
    --arg state "$state" \
    --arg stage "$stage" \
    --argjson exit_code "$code" \
    --arg canonical_parent "$CURRENT_MAIN" \
    --arg canonical_parent_tree "$main_tree" \
    --arg prior_parent "$SOURCE_PARENT" \
    --arg source_product_head "$SOURCE_PRODUCT" \
    --arg source_product_branch "$PRODUCT_BRANCH" \
    --arg source_workflow_blob "$SOURCE_WORKFLOW_BLOB" \
    --arg source_builder_blob "$SOURCE_BUILDER_BLOB" \
    --arg source_manifest_blob "$SOURCE_MANIFEST_BLOB" \
    --arg source_schema_blob "$SOURCE_SCHEMA_BLOB" \
    --arg route_ledger_blob "$ROUTE_LEDGER_BLOB" \
    --arg route_contract_blob "$ROUTE_CONTRACT_BLOB" \
    --arg matrix_blob "$MATRIX_BLOB" \
    --arg census_blob "$CENSUS_BLOB" \
    --arg predecessor_adjudication_blob "$PREDECESSOR_ADJUDICATION_BLOB" \
    --arg candidate_commit "$candidate_commit" \
    --arg candidate_tree "$candidate_tree" \
    --arg ordinary_staging_branch "$STAGING_BRANCH" \
    --arg ordinary_staging_commit "$ordinary_commit" \
    --arg ordinary_staging_tree "$ordinary_tree" \
    '{
      schema_version:$schema_version,
      state:$state,
      exit_code:$exit_code,
      failed_or_final_stage:$stage,
      canonical_parent:$canonical_parent,
      canonical_parent_tree:(if $canonical_parent_tree=="" then null else $canonical_parent_tree end),
      prior_parent:$prior_parent,
      source_product_head:$source_product_head,
      source_product_branch:$source_product_branch,
      source_product_blobs:{workflow:$source_workflow_blob,builder:$source_builder_blob,manifest:$source_manifest_blob,schema:$source_schema_blob},
      immutable_inputs:{route_ledger:$route_ledger_blob,route_query_contract:$route_contract_blob,promoted_partial_field_matrix:$matrix_blob,remaining_open_field_census:$census_blob,predecessor_field_adjudications:$predecessor_adjudication_blob},
      qualified_candidate_commit:(if $candidate_commit=="" then null else $candidate_commit end),
      qualified_candidate_tree:(if $candidate_tree=="" then null else $candidate_tree end),
      permanent_path_count:13,
      repair_path_count:4,
      semantic_unchanged_path_count:9,
      main_delta_overlap:0,
      ordinary_staging_branch:$ordinary_staging_branch,
      ordinary_staging_commit:(if $ordinary_staging_commit=="" then null else $ordinary_staging_commit end),
      ordinary_staging_tree:(if $ordinary_staging_tree=="" then null else $ordinary_staging_tree end),
      ordinary_staging_path_count:12,
      permanent_workflow_omitted_from_staging:true,
      product_candidate_created_by_actions:false,
      product_ref_updated_by_actions:false,
      connector_publication_required:true,
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
      authority:(if $state=="qualified_and_staged" then "qualified_tree_and_ordinary_blob_custody_only" else "failure_custody_only" end)
    }' > "$OUT/receipt.json"
}

finalize_ledger() {
  set +e
  if [[ -d "$OUT" ]]; then
    (cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
  fi
}

on_error() {
  local code=$?
  trap - ERR
  set +e
  printf '%s\n' "$code" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  write_receipt failed_closed "$code" "${candidate_commit:-}" "${candidate_tree:-}" "${ordinary_commit:-}" "${ordinary_tree:-}" "${main_tree:-}"
  finalize_ledger
  exit "$code"
}
trap on_error ERR
set -Eeuo pipefail
write_boundary

PRODUCT_PATHS_FILE="$OUT/product-paths.txt"
REPAIR_PATHS_FILE="$OUT/repair-paths.txt"
SEMANTIC_PATHS_FILE="$OUT/semantic-unchanged-paths.txt"
IMMUTABLE_PATHS_FILE="$OUT/immutable-input-paths.txt"
MAIN_DELTA_EXPECTED="$OUT/main-delta-expected.txt"

cat > "$PRODUCT_PATHS_FILE" <<'PATHS'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/adjudication-summary.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/capture-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/field-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/index.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/product-manifest.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/promotion-candidate-protocol.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/source-adjudications.json
docs/milestones/ssc-rd-wave03-rd04-postpromotion-next-adjudication.md
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json
test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
PATHS
sort -o "$PRODUCT_PATHS_FILE" "$PRODUCT_PATHS_FILE"

cat > "$REPAIR_PATHS_FILE" <<'PATHS'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/product-manifest.json
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
PATHS
sort -o "$REPAIR_PATHS_FILE" "$REPAIR_PATHS_FILE"
comm -23 "$PRODUCT_PATHS_FILE" "$REPAIR_PATHS_FILE" > "$SEMANTIC_PATHS_FILE"
test "$(wc -l < "$SEMANTIC_PATHS_FILE")" -eq 9

cat > "$IMMUTABLE_PATHS_FILE" <<'PATHS'
data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/promoted-partial-field-matrix.json
data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/remaining-open-field-census.json
data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/field-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-ledger.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-query-contract.json
PATHS
sort -o "$IMMUTABLE_PATHS_FILE" "$IMMUTABLE_PATHS_FILE"

cat > "$MAIN_DELTA_EXPECTED" <<'PATHS'
.github/workflows/preference-custody-v54.yml
.github/workflows/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.yml
data/research/preference-custody/control-manifest-v54.json
data/research/preference-custody/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.fixture.json
docs/preference-custody-laboratory-floor-v54.md
docs/preference-custody-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.md
test/preference-custody-manifest-v54.test.js
test/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.test.js
tools/compile-preference-custody-manifest-v54.mjs
tools/compile-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs
tools/lib/preference-custody-manifest-v54.mjs
tools/lib/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs
tools/validate-preference-custody-manifest-v54.mjs
tools/validate-preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs
PATHS
sort -o "$MAIN_DELTA_EXPECTED" "$MAIN_DELTA_EXPECTED"

stage=bind_carrier_and_live_refs
CARRIER_PATHS="$OUT/carrier-paths.txt"
printf '%s\n' "$CARRIER_SCRIPT_PATH" "$CARRIER_WORKFLOW_PATH" | sort > "$CARRIER_PATHS"
test "$(git rev-parse HEAD^^)" = "$CURRENT_MAIN"
test "$(git rev-list --count "$CURRENT_MAIN"..HEAD)" -eq 2
git diff --name-only "$CURRENT_MAIN" HEAD | sort > "$OUT/carrier-actual-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" HEAD | sort > "$OUT/carrier-added-paths.txt"
diff -u "$CARRIER_PATHS" "$OUT/carrier-actual-paths.txt"
diff -u "$CARRIER_PATHS" "$OUT/carrier-added-paths.txt"
git diff --check "$CURRENT_MAIN" HEAD

test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$SOURCE_PRODUCT"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"

git fetch --no-tags origin \
  "+refs/heads/main:refs/remotes/origin/main" \
  "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"
test "$(git rev-parse origin/main)" = "$CURRENT_MAIN"
test "$(git rev-parse "origin/$PRODUCT_BRANCH")" = "$SOURCE_PRODUCT"
main_tree="$(git rev-parse "$CURRENT_MAIN^{tree}")"
printf '%s\n' "$main_tree" > "$OUT/current-main-tree.txt"

stage=bind_source_product_and_disjoint_main_delta
test "$(git rev-parse "$SOURCE_PRODUCT^")" = "$SOURCE_PARENT"
test "$(git rev-list --count "$SOURCE_PARENT".."$SOURCE_PRODUCT")" -eq 1
git diff --name-only --diff-filter=ACDMRTUXB "$SOURCE_PARENT" "$SOURCE_PRODUCT" | sort > "$OUT/source-product-actual-paths.txt"
git diff --name-only --diff-filter=A "$SOURCE_PARENT" "$SOURCE_PRODUCT" | sort > "$OUT/source-product-added-paths.txt"
diff -u "$PRODUCT_PATHS_FILE" "$OUT/source-product-actual-paths.txt"
diff -u "$PRODUCT_PATHS_FILE" "$OUT/source-product-added-paths.txt"
test "$(git rev-parse "$SOURCE_PRODUCT:$WORKFLOW_PATH")" = "$SOURCE_WORKFLOW_BLOB"
test "$(git rev-parse "$SOURCE_PRODUCT:$BUILDER_PATH")" = "$SOURCE_BUILDER_BLOB"
test "$(git rev-parse "$SOURCE_PRODUCT:$MANIFEST_PATH")" = "$SOURCE_MANIFEST_BLOB"
test "$(git rev-parse "$SOURCE_PRODUCT:$SCHEMA_PATH")" = "$SOURCE_SCHEMA_BLOB"

git diff --name-only "$SOURCE_PARENT" "$CURRENT_MAIN" | sort > "$OUT/main-delta-actual.txt"
diff -u "$MAIN_DELTA_EXPECTED" "$OUT/main-delta-actual.txt"
comm -12 "$OUT/main-delta-actual.txt" "$PRODUCT_PATHS_FILE" > "$OUT/main-product-overlap.txt"
comm -12 "$OUT/main-delta-actual.txt" "$IMMUTABLE_PATHS_FILE" > "$OUT/main-immutable-overlap.txt"
test ! -s "$OUT/main-product-overlap.txt"
test ! -s "$OUT/main-immutable-overlap.txt"

stage=bind_current_immutable_inputs
test "$(git rev-parse "$CURRENT_MAIN:data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-ledger.json")" = "$ROUTE_LEDGER_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-query-contract.json")" = "$ROUTE_CONTRACT_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/promoted-partial-field-matrix.json")" = "$MATRIX_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/remaining-open-field-census.json")" = "$CENSUS_BLOB"
test "$(git rev-parse "$CURRENT_MAIN:data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/field-adjudications.json")" = "$PREDECESSOR_ADJUDICATION_BLOB"

stage=repair_parent_and_immutable_binding
git worktree add --detach "$SOURCE_WT" "$SOURCE_PRODUCT"
cd "$SOURCE_WT"
python - <<'PY'
import hashlib
import json
import os
from pathlib import Path

old_parent=os.environ['SOURCE_PARENT']
new_parent=os.environ['CURRENT_MAIN']
old_contract=os.environ['OLD_ROUTE_CONTRACT_BLOB']
new_contract=os.environ['ROUTE_CONTRACT_BLOB']
workflow=Path(os.environ['WORKFLOW_PATH'])
builder=Path(os.environ['BUILDER_PATH'])
manifest=Path(os.environ['MANIFEST_PATH'])
schema_path=Path(os.environ['SCHEMA_PATH'])

wf=workflow.read_text()
if wf.count(old_parent)!=1:
    raise SystemExit(f'workflow parent denominator={wf.count(old_parent)}')
if wf.count(old_contract)!=1:
    raise SystemExit(f'workflow route-contract denominator={wf.count(old_contract)}')
wf=wf.replace(old_parent,new_parent,1).replace(old_contract,new_contract,1)
workflow.write_text(wf)

b=builder.read_text()
if b.count(old_parent)!=1:
    raise SystemExit(f'builder parent denominator={b.count(old_parent)}')
builder.write_text(b.replace(old_parent,new_parent,1))

sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
schema=json.loads(schema_path.read_text())
manifest_consts=[]

def walk(value):
    if isinstance(value,dict):
        const=value.get('const')
        if isinstance(const,dict) and const.get('object_type')=='product_manifest':
            manifest_consts.append(const)
        for child in value.values():
            walk(child)
    elif isinstance(value,list):
        for child in value:
            walk(child)
walk(schema)
if len(manifest_consts)!=1:
    raise SystemExit(f'product manifest const denominator={len(manifest_consts)}')
const=manifest_consts[0]
if const.get('canonical_parent')!=old_parent:
    raise SystemExit('schema product manifest parent mismatch')
const['canonical_parent']=new_parent
seen={'workflow':0,'builder':0}
for item in const.get('hashed_files',[]):
    if item.get('path')==str(workflow):
        item['bytes']=workflow.stat().st_size
        item['sha256']=sha(workflow)
        seen['workflow']+=1
    if item.get('path')==str(builder):
        item['bytes']=builder.stat().st_size
        item['sha256']=sha(builder)
        seen['builder']+=1
if seen!={'workflow':1,'builder':1}:
    raise SystemExit(f'schema hashed-file denominator={seen}')
schema_path.write_text(json.dumps(schema,indent=2,sort_keys=True)+'\n')
PY
node "$BUILDER_PATH" --write

python - <<'PY'
import hashlib
import json
import os
from pathlib import Path

workflow=Path(os.environ['WORKFLOW_PATH'])
builder=Path(os.environ['BUILDER_PATH'])
manifest_path=Path(os.environ['MANIFEST_PATH'])
schema_path=Path(os.environ['SCHEMA_PATH'])
parent=os.environ['CURRENT_MAIN']
route_contract=os.environ['ROUTE_CONTRACT_BLOB']
old_contract=os.environ['OLD_ROUTE_CONTRACT_BLOB']
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

wf=workflow.read_text()
if wf.count(parent)!=1 or wf.count(route_contract)!=1 or old_contract in wf:
    raise SystemExit('final workflow binding mismatch')
manifest=json.loads(manifest_path.read_text())
if manifest.get('canonical_parent')!=parent:
    raise SystemExit('manifest parent mismatch')
entries={x['path']:x for x in manifest.get('hashed_files',[])}
for p in (workflow,builder):
    e=entries.get(str(p))
    if not e or e.get('bytes')!=p.stat().st_size or e.get('sha256')!=sha(p):
        raise SystemExit(f'manifest hash mismatch: {p}')

schema=json.loads(schema_path.read_text())
consts=[]
def walk(v):
    if isinstance(v,dict):
        c=v.get('const')
        if isinstance(c,dict) and c.get('object_type')=='product_manifest':
            consts.append(c)
        for z in v.values(): walk(z)
    elif isinstance(v,list):
        for z in v: walk(z)
walk(schema)
if len(consts)!=1 or consts[0]!=manifest:
    raise SystemExit('schema manifest const differs from generated manifest')
PY

git diff --name-only "$SOURCE_PRODUCT" | sort > "$OUT/repair-actual-paths.txt"
diff -u "$REPAIR_PATHS_FILE" "$OUT/repair-actual-paths.txt"
git diff --check "$SOURCE_PRODUCT"

: > "$OUT/semantic-blob-ledger.tsv"
while IFS= read -r path; do
  source_blob="$(git rev-parse "$SOURCE_PRODUCT:$path")"
  repaired_blob="$(git hash-object --no-filters "$path")"
  test "$source_blob" = "$repaired_blob"
  printf '%s\t%s\n' "$path" "$source_blob" >> "$OUT/semantic-blob-ledger.tsv"
done < "$SEMANTIC_PATHS_FILE"

stage=construct_exact_candidate
rm -f "$INDEX_FILE"
GIT_INDEX_FILE="$INDEX_FILE" git read-tree "$CURRENT_MAIN"
: > "$OUT/candidate-blob-ledger.tsv"
while IFS= read -r path; do
  blob="$(git hash-object -w --no-filters "$path")"
  GIT_INDEX_FILE="$INDEX_FILE" git update-index --add --cacheinfo "100644,$blob,$path"
  printf '%s\t%s\n' "$path" "$blob" >> "$OUT/candidate-blob-ledger.tsv"
done < "$PRODUCT_PATHS_FILE"
candidate_tree="$(GIT_INDEX_FILE="$INDEX_FILE" git write-tree)"
export GIT_AUTHOR_NAME='github-actions[bot]'
export GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_AUTHOR_DATE='2026-08-08T16:20:00Z'
export GIT_COMMITTER_NAME='github-actions[bot]'
export GIT_COMMITTER_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_COMMITTER_DATE='2026-08-08T16:20:00Z'
candidate_commit="$(printf '%s\n\n%s\n' \
  'Adjudicate RD-04 postpromotion Montana and North Dakota captures' \
  'Rebind the exact candidate-only adjudication product to current canonical main and the repaired route-contract identity. Preserve four reviewed source admissions, four promotion candidates, two holds, and zero matrix, field-terminalization, row-state, class, cumulative-ledger, publication, adoption, graph, outside-human, or route-execution effect.' \
  | git commit-tree "$candidate_tree" -p "$CURRENT_MAIN")"
test "$(git rev-parse "$candidate_commit^")" = "$CURRENT_MAIN"
test "$(git rev-parse "$candidate_commit^{tree}")" = "$candidate_tree"
printf '%s\n' "$candidate_commit" > "$OUT/candidate-commit.txt"
printf '%s\n' "$candidate_tree" > "$OUT/candidate-tree.txt"

git diff --name-only --diff-filter=ACDMRTUXB "$CURRENT_MAIN" "$candidate_commit" | sort > "$OUT/candidate-actual-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" "$candidate_commit" | sort > "$OUT/candidate-added-paths.txt"
diff -u "$PRODUCT_PATHS_FILE" "$OUT/candidate-actual-paths.txt"
diff -u "$PRODUCT_PATHS_FILE" "$OUT/candidate-added-paths.txt"

stage=qualify_exact_candidate
git worktree add --detach "$QUAL_WT" "$candidate_commit"
cd "$QUAL_WT"
python -m pip install --disable-pip-version-check --no-input 'PyYAML==6.0.2' 'jsonschema==4.25.1'
python -c "import yaml; yaml.safe_load(open('$WORKFLOW_PATH'))"
node --check "$BUILDER_PATH"
node --check tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
node --check test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js
node "$BUILDER_PATH"
python - <<'PY'
import json
from pathlib import Path
from jsonschema import Draft202012Validator
schema=json.loads(Path('schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator=Draft202012Validator(schema)
root=Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication')
names=['capture-custody.json','source-adjudications.json','field-adjudications.json','promotion-candidate-protocol.json','adjudication-summary.json','index.json','product-manifest.json']
for name in names:
    value=json.loads((root/name).read_text())
    errors=sorted(validator.iter_errors(value),key=lambda e:list(e.path))
    if errors:
        raise SystemExit(f'{name}: {errors[0].message} at {list(errors[0].path)}')
print(f'recursive_schema_validation=pass objects={len(names)}')
PY
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
node test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
npm run release:check

git restore --staged --worktree .
git clean -fdx
node "$BUILDER_PATH" --write
node "$BUILDER_PATH"
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
node test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js
node tools/validate-no-magic-human-gate.mjs
git diff --check
git diff --exit-code
test -z "$(git status --porcelain=v1 --untracked-files=all)"

# Verify the exact current immutable inputs from the candidate checkout.
test "$(git hash-object data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-ledger.json)" = "$ROUTE_LEDGER_BLOB"
test "$(git hash-object data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol/route-query-contract.json)" = "$ROUTE_CONTRACT_BLOB"
test "$(git hash-object data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/promoted-partial-field-matrix.json)" = "$MATRIX_BLOB"
test "$(git hash-object data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/remaining-open-field-census.json)" = "$CENSUS_BLOB"
test "$(git hash-object data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/field-adjudications.json)" = "$PREDECESSOR_ADJUDICATION_BLOB"

stage=preserve_qualified_product
mkdir -p "$OUT/product-files"
while IFS= read -r path; do
  install -D -m 0644 "$path" "$OUT/product-files/$path"
done < "$PRODUCT_PATHS_FILE"
tar -cJf "$OUT/product.tar.xz" -C "$OUT/product-files" --files-from="$PRODUCT_PATHS_FILE"
product_archive_bytes="$(stat -c %s "$OUT/product.tar.xz")"
product_archive_sha256="$(sha256sum "$OUT/product.tar.xz" | cut -d' ' -f1)"
printf '%s\n' "$product_archive_bytes" > "$OUT/product-archive-bytes.txt"
printf '%s\n' "$product_archive_sha256" > "$OUT/product-archive-sha256.txt"
(cd "$OUT/product-files" && while IFS= read -r path; do sha256sum "$path"; done < "$PRODUCT_PATHS_FILE") > "$OUT/product-file-sha256-ledger.txt"

stage=construct_and_publish_ordinary_staging
WORKFLOW_REL="$WORKFLOW_PATH"
grep -vxF "$WORKFLOW_REL" "$PRODUCT_PATHS_FILE" > "$OUT/ordinary-paths.txt"
test "$(wc -l < "$OUT/ordinary-paths.txt")" -eq 12
rm -f "$ORDINARY_INDEX"
GIT_INDEX_FILE="$ORDINARY_INDEX" git read-tree "$CURRENT_MAIN"
: > "$OUT/ordinary-blob-ledger.tsv"
while IFS= read -r path; do
  blob="$(git rev-parse "$candidate_commit:$path")"
  GIT_INDEX_FILE="$ORDINARY_INDEX" git update-index --add --cacheinfo "100644,$blob,$path"
  printf '%s\t%s\n' "$path" "$blob" >> "$OUT/ordinary-blob-ledger.tsv"
done < "$OUT/ordinary-paths.txt"
ordinary_tree="$(GIT_INDEX_FILE="$ORDINARY_INDEX" git write-tree)"
export GIT_AUTHOR_DATE='2026-08-08T16:21:00Z'
export GIT_COMMITTER_DATE='2026-08-08T16:21:00Z'
ordinary_commit="$(printf '%s\n\n%s\n' \
  'Stage qualified RD-04 adjudication ordinary blobs over bf48e7f' \
  'Retain the twelve non-workflow blobs from the exact qualified candidate for connector-owned final tree assembly. This staging object grants no evidentiary, field, row, class, cumulative-ledger, publication, adoption, graph, outside-human, or route-execution authority.' \
  | git commit-tree "$ordinary_tree" -p "$CURRENT_MAIN")"
test "$(git rev-parse "$ordinary_commit^")" = "$CURRENT_MAIN"
test "$(git rev-parse "$ordinary_commit^{tree}")" = "$ordinary_tree"
git diff --name-only --diff-filter=ACDMRTUXB "$CURRENT_MAIN" "$ordinary_commit" | sort > "$OUT/ordinary-actual-paths.txt"
git diff --name-only --diff-filter=A "$CURRENT_MAIN" "$ordinary_commit" | sort > "$OUT/ordinary-added-paths.txt"
diff -u "$OUT/ordinary-paths.txt" "$OUT/ordinary-actual-paths.txt"
diff -u "$OUT/ordinary-paths.txt" "$OUT/ordinary-added-paths.txt"
printf '%s\n' "$ordinary_commit" > "$OUT/ordinary-commit.txt"
printf '%s\n' "$ordinary_tree" > "$OUT/ordinary-tree.txt"

test "$(git ls-remote --heads origin refs/heads/main | awk '{print $1}')" = "$CURRENT_MAIN"
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$SOURCE_PRODUCT"
test -z "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')"
git push origin "$ordinary_commit:refs/heads/$STAGING_BRANCH" --force-with-lease="refs/heads/$STAGING_BRANCH:"
test "$(git ls-remote --heads origin "refs/heads/$STAGING_BRANCH" | awk '{print $1}')" = "$ordinary_commit"

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
write_receipt qualified_and_staged 0 "$candidate_commit" "$candidate_tree" "$ordinary_commit" "$ordinary_tree" "$main_tree"
cd "$GITHUB_WORKSPACE"
rm -rf "$OUT/product-files" "$SOURCE_WT" "$QUAL_WT" "$INDEX_FILE" "$ORDINARY_INDEX"
finalize_ledger
