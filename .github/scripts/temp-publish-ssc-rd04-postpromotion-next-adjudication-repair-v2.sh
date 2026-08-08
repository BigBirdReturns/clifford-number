#!/usr/bin/env bash
set -Eeuo pipefail

OUT=/tmp/ssc-rd04-postpromotion-next-adjudication-repair-publisher-v2
SRC="$OUT/source-artifact"
WT="$OUT/candidate-worktree"
rm -rf "$OUT"
mkdir -p "$OUT" "$SRC"
exec > >(tee "$OUT/publisher.log") 2>&1
stage=bootstrap

write_failure() {
  local code="$1"
  set +e
  printf '%s\n' "$code" > "$OUT/EXIT_CODE"
  printf '%s\n' "$stage" > "$OUT/STAGE"
  jq -n \
    --arg state failed_closed \
    --arg stage "$stage" \
    --arg live_main "$LIVE_MAIN_LEASE" \
    --arg parent "$CANONICAL_PARENT" \
    --arg branch "$PRODUCT_BRANCH" \
    --arg old_head "$OLD_PRODUCT_HEAD" \
    --arg artifact_digest "$SOURCE_ARTIFACT_DIGEST" \
    --argjson exit_code "$code" \
    --argjson artifact_id "$SOURCE_ARTIFACT_ID" \
    '{schema_version:"ssc-rd04-postpromotion-next-adjudication-repair-publisher@2",state:$state,exit_code:$exit_code,failed_or_final_stage:$stage,live_main_lease:$live_main,canonical_parent:$parent,product_branch:$branch,old_product_head:$old_head,source_artifact_id:$artifact_id,source_artifact_digest:$artifact_digest,published_candidate:null,published_tree:null,product_ref_updated:false,source_requests_executed:0,route_executions:0,reviewed_source_admissions:4,promotion_candidates:4,held_open_cells:2,matrix_updates:0,field_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",authority:"failure_custody_only"}' \
    > "$OUT/receipt.json"
}

on_error() {
  local code=$?
  write_failure "$code"
  exit "$code"
}
trap on_error ERR

stage=bind_carrier
mapfile -t carrier_paths < <(git diff --name-only "$LIVE_MAIN_LEASE" HEAD | sort)
test "$(git rev-list --count "$LIVE_MAIN_LEASE"..HEAD)" -eq 2
test "${#carrier_paths[@]}" -eq 2
test "${carrier_paths[0]}" = '.github/scripts/temp-publish-ssc-rd04-postpromotion-next-adjudication-repair-v2.sh'
test "${carrier_paths[1]}" = '.github/workflows/temp-publish-ssc-rd04-postpromotion-next-adjudication-repair-v2.yml'
git diff --check "$LIVE_MAIN_LEASE" HEAD

git fetch --no-tags origin \
  '+refs/heads/main:refs/remotes/origin/main' \
  "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"
test "$(git rev-parse origin/main)" = "$LIVE_MAIN_LEASE"
test "$(git rev-parse "origin/$PRODUCT_BRANCH")" = "$OLD_PRODUCT_HEAD"
test "$(git rev-parse "$OLD_PRODUCT_HEAD^{tree}")" = "$OLD_PRODUCT_TREE"
test "$(git rev-parse "$OLD_PRODUCT_HEAD^")" = "$CANONICAL_PARENT"
test "$(git rev-list --count "$CANONICAL_PARENT".."$OLD_PRODUCT_HEAD")" -eq 1
git merge-base --is-ancestor "$CANONICAL_PARENT" "$LIVE_MAIN_LEASE"

printf '%s\n' \
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/adjudication-summary.json' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/capture-custody.json' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/field-adjudications.json' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/index.json' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/product-manifest.json' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/promotion-candidate-protocol.json' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/source-adjudications.json' \
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-next-adjudication.md' \
  'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json' \
  'test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js' \
  'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs' \
  'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs' \
  | sort > "$OUT/product-paths.txt"

git diff --name-only "$CANONICAL_PARENT" "$LIVE_MAIN_LEASE" | sort > "$OUT/intervening-main-paths.txt"
comm -12 "$OUT/product-paths.txt" "$OUT/intervening-main-paths.txt" > "$OUT/intervening-product-overlap.txt"
test ! -s "$OUT/intervening-product-overlap.txt"

stage=download_repair_artifact
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
test "$(cat "$SRC/EXIT_CODE")" = 0
test "$(cat "$SRC/STAGE")" = complete
test "$(cat "$SRC/candidate-commit.txt")" = "$EPHEMERAL_CANDIDATE"
test "$(cat "$SRC/candidate-tree.txt")" = "$EXPECTED_REPAIRED_TREE"
(cd "$SRC" && sha256sum -c SHA256SUMS) > "$OUT/source-internal-check.log"

printf '%s\n' \
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml' \
  'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/product-manifest.json' \
  'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json' \
  | sort > "$OUT/repaired-paths.txt"
diff -u "$OUT/repaired-paths.txt" "$SRC/expected-repaired-paths.txt"
diff -u "$OUT/repaired-paths.txt" "$SRC/repaired-paths.txt"

test "$(stat -c %s "$SRC/repaired/workflow.yml")" = 10912
test "$(sha256sum "$SRC/repaired/workflow.yml" | cut -d' ' -f1)" = "$REPAIRED_WORKFLOW_SHA256"
test "$(git hash-object --no-filters "$SRC/repaired/workflow.yml")" = "$REPAIRED_WORKFLOW_BLOB"
test "$(stat -c %s "$SRC/repaired/product-manifest.json")" = 4885
test "$(sha256sum "$SRC/repaired/product-manifest.json" | cut -d' ' -f1)" = "$REPAIRED_MANIFEST_SHA256"
test "$(git hash-object --no-filters "$SRC/repaired/product-manifest.json")" = "$REPAIRED_MANIFEST_BLOB"
test "$(stat -c %s "$SRC/repaired/schema.json")" = 57221
test "$(sha256sum "$SRC/repaired/schema.json" | cut -d' ' -f1)" = "$REPAIRED_SCHEMA_SHA256"
test "$(git hash-object --no-filters "$SRC/repaired/schema.json")" = "$REPAIRED_SCHEMA_BLOB"

stage=reconstruct_candidate
git worktree add --detach "$WT" "$OLD_PRODUCT_HEAD"
install -m 0644 "$SRC/repaired/workflow.yml" "$WT/.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml"
install -m 0644 "$SRC/repaired/product-manifest.json" "$WT/data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/product-manifest.json"
install -m 0644 "$SRC/repaired/schema.json" "$WT/schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json"
git -C "$WT" add \
  .github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml \
  data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication/product-manifest.json \
  schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json
git -C "$WT" diff --cached --name-only | sort > "$OUT/actual-repaired-paths.txt"
diff -u "$OUT/repaired-paths.txt" "$OUT/actual-repaired-paths.txt"
git -C "$WT" diff --cached --check

repaired_tree="$(git -C "$WT" write-tree)"
test "$repaired_tree" = "$EXPECTED_REPAIRED_TREE"
export GIT_AUTHOR_NAME='BigBirdReturns'
export GIT_AUTHOR_EMAIL='219768509+BigBirdReturns@users.noreply.github.com'
export GIT_AUTHOR_DATE='2026-08-08T07:31:20Z'
export GIT_COMMITTER_NAME='BigBirdReturns'
export GIT_COMMITTER_EMAIL='219768509+BigBirdReturns@users.noreply.github.com'
export GIT_COMMITTER_DATE='2026-08-08T07:31:20Z'
repaired_commit="$(printf '%s\n\n%s\n' \
  'Repair RD-04 postpromotion adjudication workflow identity' \
  'Replace only the invalid workflow, self-describing product manifest, and recursively closed schema while preserving all ten substantive product blobs and every authority ceiling.' \
  | git -C "$WT" commit-tree "$repaired_tree" -p "$CANONICAL_PARENT")"
test "$(git -C "$WT" rev-parse "$repaired_commit^{tree}")" = "$EXPECTED_REPAIRED_TREE"
test "$(git -C "$WT" rev-parse "$repaired_commit^")" = "$CANONICAL_PARENT"
git -C "$WT" reset --hard "$repaired_commit"

git -C "$WT" diff --name-only --diff-filter=ACDMRTUXB "$CANONICAL_PARENT" "$repaired_commit" | sort > "$OUT/actual-product-paths.txt"
git -C "$WT" diff --name-only --diff-filter=A "$CANONICAL_PARENT" "$repaired_commit" | sort > "$OUT/added-product-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/actual-product-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/added-product-paths.txt"
test "$(wc -l < "$OUT/actual-product-paths.txt")" -eq 13
test -z "$(grep -E '(^|/)(\.tmp|.*\.trigger)(/|$)' "$OUT/actual-product-paths.txt" || true)"
git -C "$WT" diff --check "$CANONICAL_PARENT" "$repaired_commit"
while IFS=$'\t' read -r path expected_blob; do
  test "$(git -C "$WT" rev-parse "$repaired_commit:$path")" = "$expected_blob"
done < "$SRC/product-blob-ledger.tsv"

stage=focused_qualification
cd "$WT"
python -m pip install --disable-pip-version-check --no-input 'jsonschema==4.25.1' 'PyYAML==6.0.2'
python - <<'PY'
from pathlib import Path
import json
import yaml
from jsonschema import Draft202012Validator
workflow = yaml.safe_load(Path('.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.yml').read_text())
if not isinstance(workflow, dict) or 'jobs' not in workflow:
    raise SystemExit('workflow did not parse to a jobs-bearing mapping')
schema = json.loads(Path('schemas/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)
root = Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication')
for name in ['capture-custody.json','source-adjudications.json','field-adjudications.json','promotion-candidate-protocol.json','adjudication-summary.json','index.json','product-manifest.json']:
    value = json.loads((root / name).read_text())
    errors = sorted(validator.iter_errors(value), key=lambda error: list(error.path))
    if errors:
        raise SystemExit(f'{name}: {errors[0].message} at {list(errors[0].path)}')
print('workflow_and_recursive_schema_validation=pass')
PY
node --check tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
node --check tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
node --check test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js
node tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
git diff --exit-code -- data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs
node test/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.test.js
node tools/validate-no-magic-human-gate.mjs
cd "$GITHUB_WORKSPACE"

stage=publish_product_ref
test "$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')" = "$OLD_PRODUCT_HEAD"
git push origin "$repaired_commit:refs/heads/$PRODUCT_BRANCH" --force-with-lease="refs/heads/$PRODUCT_BRANCH:$OLD_PRODUCT_HEAD"
published_head="$(git ls-remote --heads origin "refs/heads/$PRODUCT_BRANCH" | awk '{print $1}')"
test "$published_head" = "$repaired_commit"

stage=complete
trap - ERR
printf '%s\n' 0 > "$OUT/EXIT_CODE"
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' "$repaired_commit" > "$OUT/published-candidate.txt"
printf '%s\n' "$EXPECTED_REPAIRED_TREE" > "$OUT/published-tree.txt"
jq -n \
  --arg state published \
  --arg live_main "$LIVE_MAIN_LEASE" \
  --arg parent "$CANONICAL_PARENT" \
  --arg branch "$PRODUCT_BRANCH" \
  --arg old_head "$OLD_PRODUCT_HEAD" \
  --arg candidate "$repaired_commit" \
  --arg tree "$EXPECTED_REPAIRED_TREE" \
  --arg artifact_digest "$SOURCE_ARTIFACT_DIGEST" \
  --argjson artifact_id "$SOURCE_ARTIFACT_ID" \
  '{schema_version:"ssc-rd04-postpromotion-next-adjudication-repair-publisher@2",state:$state,exit_code:0,failed_or_final_stage:"complete",live_main_lease:$live_main,canonical_parent:$parent,product_branch:$branch,old_product_head:$old_head,source_artifact_id:$artifact_id,source_artifact_digest:$artifact_digest,published_candidate:$candidate,published_tree:$tree,product_ref_updated:true,permanent_path_count:13,repaired_path_count:3,unchanged_product_blob_count:10,intervening_current_main_product_path_overlap:0,workflow_yaml_parse:"pass",recursive_schema_validation:"pass",focused_product_test:"pass",no_magic_human_gate:"pass",source_requests_executed:0,route_executions:0,reviewed_source_admissions:4,promotion_candidates:4,held_open_cells:2,matrix_updates:0,field_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:"none",outside_human_dependency:false,publication_effect:"none",adoption_effect:"none",graph_effect:"none",authority:"product_ref_publication_only"}' \
  > "$OUT/receipt.json"

rm -f "$OUT/source-artifact.zip"
rm -rf "$SRC" "$WT"
(cd "$OUT" && find . -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
