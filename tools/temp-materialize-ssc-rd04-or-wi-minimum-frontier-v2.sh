#!/usr/bin/env bash
set -Eeuo pipefail

CONSTRUCTION_PARENT='146f5ceb1882d02c7be8d225d49665d63478a7df'
CONSTRUCTION_PARENT_TREE='4f9eb0269d5259bdc8cea438321d3a89683abdc8'
CURRENT_MATRIX_PATH='data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/promoted-partial-field-matrix.json'
CURRENT_MATRIX_BLOB='741bda42b609f386d71090e6368af537fd334914'
PRODUCT_MESSAGE='Adjudicate Oregon and Wisconsin RD-04 minimum frontier v2'
PRODUCT_DATE='2026-08-11T11:30:00Z'
TRANSPORT_ROOT='data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2'
OUT='/tmp/ssc-rd04-or-wi-minimum-frontier-materializer-v2'
WORK='/tmp/ssc-rd04-or-wi-minimum-frontier-work-v2'

rm -rf "$OUT" "$WORK"
mkdir -p "$OUT" "$WORK/product"
printf '%s\n' bootstrap > "$OUT/STAGE"
printf '%s\n' 1 > "$OUT/EXIT_CODE"

finalize_sums() {
  set +e
  (
    cd "$OUT"
    find . -type f ! -name SHA256SUMS -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > SHA256SUMS
  )
}

fail() {
  local rc=$?
  trap - ERR
  set +e
  printf '%s\n' "$rc" > "$OUT/EXIT_CODE"
  printf '%s\n' "${stage:-unknown}" > "$OUT/STAGE"
  python - "$OUT/failure.json" "$rc" "${stage:-unknown}" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
  'schema_version':'ssc-rd04-or-wi-minimum-frontier-materializer-failure@2',
  'state':'failed_closed',
  'exit_code':int(sys.argv[2]),
  'failed_stage':sys.argv[3],
  'canonical_parent':'146f5ceb1882d02c7be8d225d49665d63478a7df',
  'product_ref_updated':False,
  'source_requests':0,
  'source_admissions_created':0,
  'field_terminalizations':0,
  'matrix_updates':0,
  'row_state_mutations':0,
  'class_closed':False,
  'outside_human_dependency':False,
  'publication_effect':'none',
  'adoption_effect':'none',
  'graph_effect':'none',
  'authority':'failure_custody_only',
},indent=2,sort_keys=True)+'\n')
PY
  finalize_sums
  exit "$rc"
}
trap fail ERR

stage='bind_carrier_topology'
cat > "$OUT/carrier-paths.txt" <<'PATHS'
.github/workflows/temp-materialize-ssc-rd04-or-wi-minimum-frontier-v2.yml
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-00.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-01.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-02.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-03.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-04.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-05.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-06.b64
data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2/payload-07.b64
tools/temp-materialize-ssc-rd04-or-wi-minimum-frontier-v2.sh
PATHS
LC_ALL=C sort -c "$OUT/carrier-paths.txt"
test "$(wc -l < "$OUT/carrier-paths.txt" | tr -d ' ')" = 10
test "$(git rev-parse "$CONSTRUCTION_PARENT^{tree}")" = "$CONSTRUCTION_PARENT_TREE"
git merge-base --is-ancestor "$CONSTRUCTION_PARENT" HEAD
git diff --name-only "$CONSTRUCTION_PARENT" HEAD | LC_ALL=C sort > "$OUT/observed-carrier-paths.txt"
diff -u "$OUT/carrier-paths.txt" "$OUT/observed-carrier-paths.txt"
git diff --name-only --diff-filter=A "$CONSTRUCTION_PARENT" HEAD | LC_ALL=C sort > "$OUT/observed-carrier-additions.txt"
diff -u "$OUT/carrier-paths.txt" "$OUT/observed-carrier-additions.txt"
test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$CONSTRUCTION_PARENT" HEAD)"
git diff --check "$CONSTRUCTION_PARENT" HEAD

stage='authenticate_transport_chunks'
python - "$TRANSPORT_ROOT" "$OUT/chunk-receipt.json" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1])
expected=[
 ('payload-00.b64',9000,'ce2ce3f605cc8aba4ebbb94eedd7a03b768791bb7e50010eb4842a5beadf3e4c'),
 ('payload-01.b64',9000,'fd6758953da65e2075fef11abbc7cc2118c5275391ef29213439225c801f777a'),
 ('payload-02.b64',9000,'fc729ab5e59a0dfc3f5a8cd8fa98613acc16444ba38050fa981505a507469c8c'),
 ('payload-03.b64',9000,'d467e829ba0030057806d4d4da5f9e772bc178dce98d2f8098a75504adff4bd9'),
 ('payload-04.b64',9000,'443c50a3a3b44bad1be0551f4375eec9ce6da8b61eaa1376ab672fe183a02faa'),
 ('payload-05.b64',9000,'91df91d601029fde9a1a9818a3bf0dcef363d8ab3c25349591dd651216462dee'),
 ('payload-06.b64',9000,'b678bd1bc578dee589b23b900a0d9f8443456135a80dc53bb51adb19bcb43d69'),
 ('payload-07.b64',1273,'de5ffb1571bbc5eaaeb1095cb944e2bd331f6659046e7b873c39120f504283e1'),
]
rows=[]
for name,size,digest in expected:
    data=(root/name).read_bytes()
    assert len(data)==size,(name,len(data),size)
    assert hashlib.sha256(data).hexdigest()==digest,name
    rows.append({'name':name,'bytes':size,'sha256':digest})
Path(sys.argv[2]).write_text(json.dumps({'schema_version':'ssc-rd04-or-wi-chunk-custody@2','chunks':rows},indent=2,sort_keys=True)+'\n')
PY
cat "$TRANSPORT_ROOT"/payload-*.b64 > "$WORK/product.tar.gz.b64"
test "$(stat -c %s "$WORK/product.tar.gz.b64")" = 64273
test "$(sha256sum "$WORK/product.tar.gz.b64" | awk '{print $1}')" = e99d820657712d00f90ef3f0df8159c3d09172031c30a16db5376bba3a86a58b
base64 --decode "$WORK/product.tar.gz.b64" > "$WORK/product.tar.gz"
test "$(stat -c %s "$WORK/product.tar.gz")" = 48202
test "$(sha256sum "$WORK/product.tar.gz" | awk '{print $1}')" = b51a931e99b4640fd87ad1e169f3795b2a4bdc30055ad1cfc5687271f949ec6c

stage='extract_exact_product_archive'
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
LC_ALL=C sort -c "$OUT/product-paths.txt"
test "$(wc -l < "$OUT/product-paths.txt" | tr -d ' ')" = 14
python - "$WORK/product.tar.gz" "$WORK/product" "$OUT/product-paths.txt" <<'PY'
from pathlib import Path,PurePosixPath
import tarfile,sys
archive=Path(sys.argv[1]); dest=Path(sys.argv[2])
expected=Path(sys.argv[3]).read_text().splitlines()
with tarfile.open(archive,'r:gz') as tf:
    members=tf.getmembers()
    names=[m.name for m in members]
    assert names==expected,(names,expected)
    for m in members:
        p=PurePosixPath(m.name)
        assert not p.is_absolute() and '..' not in p.parts and m.isfile(),m.name
        data=tf.extractfile(m).read()
        out=dest/m.name
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(data)
        out.chmod(0o644)
PY
find "$WORK/product" -type f -printf '%P\n' | LC_ALL=C sort > "$OUT/extracted-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/extracted-paths.txt"

stage='prove_live_main_disjointness'
git fetch --no-tags --force origin '+refs/heads/main:refs/remotes/origin/main'
LIVE_MAIN="$(git rev-parse refs/remotes/origin/main)"
git merge-base --is-ancestor "$CONSTRUCTION_PARENT" "$LIVE_MAIN"
cat "$OUT/product-paths.txt" > "$OUT/protected-paths.txt"
cat >> "$OUT/protected-paths.txt" <<'PATHS'
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-mt-row-state-reconciliation/promoted-partial-field-matrix.json
data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/capture-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/source-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/field-adjudications.json
data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/selected-followup-protocol.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/archive-custody.json
data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2026-request-archive-adjudication/member-inventory.json
PATHS
LC_ALL=C sort -u -o "$OUT/protected-paths.txt" "$OUT/protected-paths.txt"
: > "$OUT/intervening-paths.txt"
parent="$CONSTRUCTION_PARENT"
while IFS= read -r child; do
  test "$(git rev-parse "$child^1")" = "$parent"
  git diff --name-only "$parent" "$child" | LC_ALL=C sort -u >> "$OUT/intervening-paths.txt"
  parent="$child"
done < <(git rev-list --first-parent --reverse "$CONSTRUCTION_PARENT..$LIVE_MAIN")
test "$parent" = "$LIVE_MAIN"
LC_ALL=C sort -u -o "$OUT/intervening-paths.txt" "$OUT/intervening-paths.txt"
comm -12 "$OUT/protected-paths.txt" "$OUT/intervening-paths.txt" > "$OUT/protected-overlap.txt"
test ! -s "$OUT/protected-overlap.txt"
printf '%s\n' "$LIVE_MAIN" > "$OUT/observed-live-main.txt"

stage='construct_and_focus_qualify_product'
git worktree add --detach "$WORK/repo" "$CONSTRUCTION_PARENT"
python - "$WORK/product" "$WORK/repo" "$OUT/product-paths.txt" <<'PY'
from pathlib import Path
import shutil,sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2])
for rel in Path(sys.argv[3]).read_text().splitlines():
    out=dst/rel
    out.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src/rel,out)
    out.chmod(0o644)
PY
cd "$WORK/repo"
git add --pathspec-from-file="$OUT/product-paths.txt"
git diff --cached --name-only | LC_ALL=C sort > "$OUT/staged-paths.txt"
diff -u "$OUT/product-paths.txt" "$OUT/staged-paths.txt"
git diff --cached --name-only --diff-filter=A | LC_ALL=C sort > "$OUT/staged-additions.txt"
diff -u "$OUT/product-paths.txt" "$OUT/staged-additions.txt"
test -z "$(git diff --cached --name-only --diff-filter=MDTCRUXB)"
git diff --cached --check
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.yml')"
node --check tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs
node --check tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs
node --check test/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.test.js
node tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs | tee "$OUT/builder.json"
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs | tee "$OUT/validator.json"
node --test test/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.test.js | tee "$OUT/adversarial.log"
node tools/validate-no-magic-human-gate.mjs | tee "$OUT/no-magic-human-validator.log"
node test/no-magic-human-gate.test.js | tee "$OUT/no-magic-human-test.log"
python - <<'PY' | tee "$OUT/schema-validation.log"
import json
from pathlib import Path
from jsonschema import Draft202012Validator
schema=json.loads(Path('schemas/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator=Draft202012Validator(schema)
root=Path('data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication')
for p in sorted(root.glob('*.json')):
    errors=list(validator.iter_errors(json.loads(p.read_text())))
    if errors:
        e=errors[0]
        raise SystemExit(f'{p}: {e.message} at {list(e.path)}')
print('draft_2020_12_recursive_closed_schema_validation=pass documents=8')
PY

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
GIT_AUTHOR_DATE="$PRODUCT_DATE" GIT_COMMITTER_DATE="$PRODUCT_DATE" git commit --no-gpg-sign -m "$PRODUCT_MESSAGE"
LOCAL_COMMIT="$(git rev-parse HEAD)"
LOCAL_TREE="$(git rev-parse 'HEAD^{tree}')"
test "$(git show -s --format='%P' HEAD)" = "$CONSTRUCTION_PARENT"
test "$(git diff --name-only "$CONSTRUCTION_PARENT" HEAD | LC_ALL=C sort)" = "$(cat "$OUT/product-paths.txt")"
test "$(git diff --name-only --diff-filter=A "$CONSTRUCTION_PARENT" HEAD | LC_ALL=C sort)" = "$(cat "$OUT/product-paths.txt")"
test -z "$(git diff --name-only --diff-filter=MDTCRUXB "$CONSTRUCTION_PARENT" HEAD)"
printf '%s\n' "$LOCAL_COMMIT" > "$OUT/local-product-commit.txt"
printf '%s\n' "$LOCAL_TREE" > "$OUT/local-product-tree.txt"
git cat-file commit "$LOCAL_COMMIT" > "$OUT/local-product-commit.raw"

stage='run_complete_release_gate'
npm run release:check > "$OUT/release.log" 2>&1

stage='restore_and_replay_product'
git reset --hard "$LOCAL_COMMIT"
git clean -fdx
test -z "$(git status --porcelain=v1 --untracked-files=all)"
node tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs > "$OUT/post-release-builder.json"
node tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.mjs > "$OUT/post-release-validator.json"
node --test test/status-sovereignty-rd-wave03-rd04-postpromotion-or-wi-minimum-frontier-adjudication.test.js > "$OUT/post-release-adversarial.log"
test -z "$(git status --porcelain=v1 --untracked-files=all)"

stage='create_exact_remote_git_objects'
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
while IFS= read -r product_path; do
  content="$(base64 -w0 "$product_path")"
  response="$(jq -n --arg content "$content" '{content:$content,encoding:"base64"}' | api_post git/blobs)"
  remote_blob="$(jq -er '.sha' <<< "$response")"
  local_blob="$(git hash-object "$product_path")"
  test "$remote_blob" = "$local_blob"
  jq -n --arg path "$product_path" --arg sha "$remote_blob" '{path:$path,mode:"100644",type:"blob",sha:$sha}' >> "$OUT/tree-entries.jsonl"
done < "$OUT/product-paths.txt"
jq -s --arg base_tree "$CONSTRUCTION_PARENT_TREE" '{base_tree:$base_tree,tree:.}' "$OUT/tree-entries.jsonl" > "$OUT/create-tree-request.json"
api_post git/trees < "$OUT/create-tree-request.json" > "$OUT/create-tree-response.json"
REMOTE_TREE="$(jq -er '.sha' "$OUT/create-tree-response.json")"
test "$REMOTE_TREE" = "$LOCAL_TREE"
jq -n \
  --arg message "$PRODUCT_MESSAGE" \
  --arg tree "$REMOTE_TREE" \
  --arg parent "$CONSTRUCTION_PARENT" \
  --arg date "$PRODUCT_DATE" \
  '{message:$message,tree:$tree,parents:[$parent],author:{name:"github-actions[bot]",email:"41898282+github-actions[bot]@users.noreply.github.com",date:$date},committer:{name:"github-actions[bot]",email:"41898282+github-actions[bot]@users.noreply.github.com",date:$date}}' > "$OUT/create-commit-request.json"
api_post git/commits < "$OUT/create-commit-request.json" > "$OUT/create-commit-response.json"
REMOTE_COMMIT="$(jq -er '.sha' "$OUT/create-commit-response.json")"
test "$REMOTE_COMMIT" = "$LOCAL_COMMIT"
test "$(jq -er '.tree.sha' "$OUT/create-commit-response.json")" = "$REMOTE_TREE"
test "$(jq -er '.parents | length' "$OUT/create-commit-response.json")" = 1
test "$(jq -er '.parents[0].sha' "$OUT/create-commit-response.json")" = "$CONSTRUCTION_PARENT"

stage='seal_terminal_receipt'
mkdir -p "$OUT/product"
while IFS= read -r product_path; do
  mkdir -p "$OUT/product/$(dirname "$product_path")"
  cp "$product_path" "$OUT/product/$product_path"
done < "$OUT/product-paths.txt"
python - "$OUT/receipt.json" "$REMOTE_COMMIT" "$REMOTE_TREE" "$LIVE_MAIN" <<'PY'
from pathlib import Path
import json,sys
value={
  'schema_version':'ssc-rd04-or-wi-minimum-frontier-materializer-receipt@2',
  'state':'exact_one_parent_fourteen_addition_product_object_created',
  'canonical_parent':'146f5ceb1882d02c7be8d225d49665d63478a7df',
  'canonical_parent_tree':'4f9eb0269d5259bdc8cea438321d3a89683abdc8',
  'observed_live_main':sys.argv[4],
  'product_commit':sys.argv[2],
  'product_tree':sys.argv[3],
  'product_message':'Adjudicate Oregon and Wisconsin RD-04 minimum frontier v2',
  'product_date':'2026-08-11T11:30:00Z',
  'permanent_path_count':14,
  'change_class':'addition_only',
  'transport_path_count':0,
  'source_admissions':12,
  'field_candidates':6,
  'observed_candidates':3,
  'typed_gap_candidates':3,
  'field_terminalizations':0,
  'matrix_updates':0,
  'row_state_mutations':0,
  'class_closed':False,
  'cumulative_ledger_effect':'none',
  'outside_human_dependency':False,
  'publication_effect':'none',
  'adoption_effect':'none',
  'graph_effect':'none',
  'release_check':'passed',
  'post_release_replay':'clean_and_exact',
  'product_ref_updated':False,
  'authority':'qualified_unreferenced_product_object_only',
}
Path(sys.argv[1]).write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
PY
printf '%s\n' complete > "$OUT/STAGE"
printf '%s\n' 0 > "$OUT/EXIT_CODE"
finalize_sums
(cd "$OUT" && sha256sum -c SHA256SUMS)
trap - ERR
