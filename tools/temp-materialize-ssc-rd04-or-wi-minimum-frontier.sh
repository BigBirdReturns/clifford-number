#!/usr/bin/env bash
set -Eeuo pipefail

rm -rf "$OUT" "$WORK"
mkdir -p "$OUT" "$WORK/product"
printf '%s\n' bootstrap > "$OUT/STAGE"
printf '%s\n' 1 > "$OUT/EXIT_CODE"

fail() {
  local rc=$?
  trap - ERR
  printf '%s\n' "$rc" > "$OUT/EXIT_CODE"
  (cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS) || true
  exit "$rc"
}
trap fail ERR

cat > "$OUT/carrier-paths.txt" <<'PATHS'
.github/workflows/temp-materialize-ssc-rd04-or-wi-minimum-frontier.yml
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-00.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-01.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-02.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-03.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-04.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-05.b64
tools/temp-materialize-ssc-rd04-or-wi-minimum-frontier.sh
PATHS

test "$(LC_ALL=C sort "$OUT/carrier-paths.txt")" = "$(cat "$OUT/carrier-paths.txt")"
test "$(wc -l < "$OUT/carrier-paths.txt" | tr -d ' ')" = 8
test "$(git rev-parse "$CANONICAL_PARENT^{tree}")" = "$CANONICAL_PARENT_TREE"
git merge-base --is-ancestor "$CANONICAL_PARENT" HEAD
test "$(git diff --name-only "$CANONICAL_PARENT" HEAD | LC_ALL=C sort)" = "$(cat "$OUT/carrier-paths.txt")"
test "$(git diff --name-only --diff-filter=A "$CANONICAL_PARENT" HEAD | LC_ALL=C sort)" = "$(cat "$OUT/carrier-paths.txt")"
test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$CANONICAL_PARENT" HEAD)"
git diff --check "$CANONICAL_PARENT" HEAD
git fetch --no-tags --force origin '+refs/heads/main:refs/remotes/origin/main'
test "$(git rev-parse refs/remotes/origin/main)" = "$CANONICAL_PARENT"

cat data/transport/ssc-rd04-or-wi-minimum-frontier-materializer/payload-*.b64 > "$WORK/product.tgz.b64"
base64 --decode "$WORK/product.tgz.b64" > "$WORK/product.tgz"
test "$(sha256sum "$WORK/product.tgz" | awk '{print $1}')" = "$PAYLOAD_SHA256"
tar -xzf "$WORK/product.tgz" -C "$WORK/product"

cat > "$OUT/product-paths.txt" <<'PATHS'
.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.yml
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/adjudication-summary.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/capture-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/field-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/index.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/product-manifest.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/promotion-candidate-protocol.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/review-receipts.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication/source-adjudications.json
docs/milestones/ssc-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.md
schemas/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.schema.json
test/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.test.js
tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs
tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs
PATHS

test "$(LC_ALL=C sort "$OUT/product-paths.txt")" = "$(cat "$OUT/product-paths.txt")"
test "$(wc -l < "$OUT/product-paths.txt" | tr -d ' ')" = 14
(cd "$WORK/product" && find . -type f -printf '%P\n' | LC_ALL=C sort) > "$OUT/payload-paths.txt"
cmp "$OUT/product-paths.txt" "$OUT/payload-paths.txt"
printf '%s\n' payload-unpacked > "$OUT/STAGE"

git worktree add --detach "$WORK/repo" "$CANONICAL_PARENT"
tar -xzf "$WORK/product.tgz" -C "$WORK/repo"
cd "$WORK/repo"
git add --pathspec-from-file="$OUT/product-paths.txt"
test "$(git diff --cached --name-only | LC_ALL=C sort)" = "$(cat "$OUT/product-paths.txt")"
test "$(git diff --cached --name-only --diff-filter=A | LC_ALL=C sort)" = "$(cat "$OUT/product-paths.txt")"
test -z "$(git diff --cached --name-only --diff-filter=MDTCRUXB)"
git diff --cached --check

python - <<'PY'
import yaml
yaml.safe_load(open('.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.yml'))
print('standing_workflow_yaml=pass')
PY
node tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs --check | tee "$OUT/builder.json"
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs | tee "$OUT/validator.json"
node --test test/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.test.js | tee "$OUT/adversarial.log"
python - <<'PY'
import json
from pathlib import Path
from jsonschema import Draft202012Validator
root=Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication')
schema=json.loads(Path('schemas/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator=Draft202012Validator(schema)
for path in sorted(root.glob('*.json')):
    errors=sorted(validator.iter_errors(json.loads(path.read_text())), key=lambda error:list(error.path))
    if errors:
        error=errors[0]
        raise SystemExit(f'{path}: {error.message} at {list(error.path)}')
print('draft_2020_12_recursive_closed_schema_validation=pass')
PY
node tools/validate-no-magic-human-gate.mjs | tee "$OUT/no-magic-human-validator.log"
node test/no-magic-human-gate.test.js | tee "$OUT/no-magic-human-test.log"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
GIT_AUTHOR_DATE="$PRODUCT_DATE" GIT_COMMITTER_DATE="$PRODUCT_DATE" git commit --no-gpg-sign -m "$PRODUCT_MESSAGE"
LOCAL_COMMIT="$(git rev-parse HEAD)"
LOCAL_TREE="$(git rev-parse 'HEAD^{tree}')"
test "$(git show -s --format='%P' HEAD)" = "$CANONICAL_PARENT"
test "$(git diff --name-only "$CANONICAL_PARENT" HEAD | LC_ALL=C sort)" = "$(cat "$OUT/product-paths.txt")"
test "$(git diff --name-only --diff-filter=A "$CANONICAL_PARENT" HEAD | LC_ALL=C sort)" = "$(cat "$OUT/product-paths.txt")"
test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$CANONICAL_PARENT" HEAD)"
printf '%s\n' "$LOCAL_COMMIT" > "$OUT/local-product-commit.txt"
printf '%s\n' "$LOCAL_TREE" > "$OUT/local-product-tree.txt"

npm run release:check > "$OUT/release-check.log" 2>&1
git reset --hard HEAD
git clean -fdx
test -z "$(git status --porcelain)"
node tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs --check > "$OUT/post-release-builder.json"
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs > "$OUT/post-release-validator.json"
cmp "$OUT/validator.json" "$OUT/post-release-validator.json"
printf '%s\n' local-product-qualified > "$OUT/STAGE"

api_post() {
  local endpoint="$1"
  curl --fail-with-body --silent --show-error \
    -X POST \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    --data-binary @- \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/$endpoint"
}

: > "$OUT/tree-entries.jsonl"
while IFS= read -r path; do
  content="$(base64 -w0 "$path")"
  response="$(jq -n --arg content "$content" '{content:$content,encoding:"base64"}' | api_post git/blobs)"
  remote_blob="$(jq -er '.sha' <<< "$response")"
  local_blob="$(git hash-object "$path")"
  test "$remote_blob" = "$local_blob"
  jq -n --arg path "$path" --arg sha "$remote_blob" '{path:$path,mode:"100644",type:"blob",sha:$sha}' >> "$OUT/tree-entries.jsonl"
done < "$OUT/product-paths.txt"

jq -s --arg base_tree "$CANONICAL_PARENT_TREE" '{base_tree:$base_tree,tree:.}' "$OUT/tree-entries.jsonl" > "$OUT/create-tree-request.json"
api_post git/trees < "$OUT/create-tree-request.json" > "$OUT/create-tree-response.json"
REMOTE_TREE="$(jq -er '.sha' "$OUT/create-tree-response.json")"
test "$REMOTE_TREE" = "$LOCAL_TREE"

jq -n \
  --arg message "$PRODUCT_MESSAGE" \
  --arg tree "$REMOTE_TREE" \
  --arg parent "$CANONICAL_PARENT" \
  --arg date "$PRODUCT_DATE" \
  '{message:$message,tree:$tree,parents:[$parent],author:{name:"github-actions[bot]",email:"41898282+github-actions[bot]@users.noreply.github.com",date:$date},committer:{name:"github-actions[bot]",email:"41898282+github-actions[bot]@users.noreply.github.com",date:$date}}' > "$OUT/create-commit-request.json"
api_post git/commits < "$OUT/create-commit-request.json" > "$OUT/create-commit-response.json"
REMOTE_COMMIT="$(jq -er '.sha' "$OUT/create-commit-response.json")"
test "$REMOTE_COMMIT" = "$LOCAL_COMMIT"
test "$(jq -er '.tree.sha' "$OUT/create-commit-response.json")" = "$REMOTE_TREE"
test "$(jq -er '.parents | length' "$OUT/create-commit-response.json")" = 1
test "$(jq -er '.parents[0].sha' "$OUT/create-commit-response.json")" = "$CANONICAL_PARENT"

python - "$OUT/materialization-receipt.json" "$REMOTE_COMMIT" "$REMOTE_TREE" <<'PY'
from pathlib import Path
import json, sys
value={
    'schema_version':'ssc-rd04-or-wi-materialization-receipt@1',
    'state':'exact_one_parent_fourteen_addition_product_object_created',
    'canonical_parent':'9510310129c3aab44f8b5b187430a3ede005b7b4',
    'canonical_parent_tree':'f26f766dba0d795660a4bb84489c233731031b9b',
    'product_commit':sys.argv[2],
    'product_tree':sys.argv[3],
    'product_message':'Adjudicate Oregon and Wisconsin RD-04 minimum frontier',
    'product_date':'2026-08-11T09:00:00Z',
    'permanent_path_count':14,
    'change_class':'addition_only',
    'transport_path_count':0,
    'candidate_count':6,
    'observed_candidates':3,
    'typed_gap_candidates':3,
    'source_admissions':12,
    'field_terminalizations':0,
    'matrix_updates':0,
    'row_state_mutations':0,
    'class_closed':False,
    'outside_human_dependency':False,
    'release_check':'passed',
    'post_release_replay':'byte_identical'
}
Path(sys.argv[1]).write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
PY
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' 0 > "$OUT/EXIT_CODE"
(cd "$OUT" && find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS && sha256sum -c SHA256SUMS)
trap - ERR

PRODUCT_COMMIT="$(jq -r '.product_commit' "$OUT/materialization-receipt.json")"
PRODUCT_TREE="$(jq -r '.product_tree' "$OUT/materialization-receipt.json")"
cat > "$OUT/comment.md" <<EOF
Materialization completed for the exact Oregon-Wisconsin minimum-frontier adjudication product.

\`\`\`text
canonical parent  $CANONICAL_PARENT
product commit    $PRODUCT_COMMIT
product tree      $PRODUCT_TREE
permanent paths   14 additions only
source admissions 12
field candidates  6, comprising 3 observed and 3 typed gaps
matrix updates    0
row mutations     0
class closed      false
release check     passed
\`\`\`

The Git objects were created through the Git database API without updating any product ref. The connector may now publish a branch at the exact product commit. The control question is whether exact commit \`$PRODUCT_COMMIT\` remains the one-parent, fourteen-addition product when attached to a review branch.
EOF
jq -n --rawfile body "$OUT/comment.md" '{body:$body}' | api_post "issues/$PR_NUMBER/comments" > "$OUT/comment-response.json"
