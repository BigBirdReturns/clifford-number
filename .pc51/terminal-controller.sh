#!/usr/bin/env bash
set -Eeuo pipefail

MODE=${1:-}
REPO=${GH_REPOSITORY:?GH_REPOSITORY is required}
TOKEN=${GH_TOKEN:?GH_TOKEN is required}
OWNER=${REPO%%/*}
NAME=${REPO#*/}
ISSUE=1268
PRODUCT_PR=1277
PRODUCT_BRANCH=agent/pc51-materializer
QUALIFIER_BRANCH=agent/pc51-repaired-head-qualifier
FROZEN_PARENT=5b841fcfe6d30929e0adfbb36548224d8d1959e8
OLD_PRODUCT=7802dcc91ca45d564a72f87c99183a6ed196e6fb
REPAIRED_PATH=test/preference-custody-manifest-v49.test.js
REPAIRED_BLOB=ccfad0438fe80e89a189d77a30325383c45acebf
SLUG=preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance
STATE_DIR=/tmp/pc51-terminal
mkdir -p "$STATE_DIR"

comment_issue() {
  local body=$1
  gh api --method POST \
    -H 'Accept: application/vnd.github+json' \
    "/repos/${REPO}/issues/${ISSUE}/comments" \
    -f body="$body" >/dev/null
}

expected_paths() {
  cat <<'EOF'
.github/workflows/preference-custody-v49.yml
.github/workflows/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.yml
data/research/preference-custody/control-manifest-v49.json
data/research/preference-custody/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.fixture.json
docs/preference-custody-laboratory-floor-v49.md
docs/preference-custody-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.md
test/preference-custody-manifest-v49.test.js
test/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.test.js
tools/compile-preference-custody-manifest-v49.mjs
tools/compile-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs
tools/lib/preference-custody-manifest-v49.mjs
tools/lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs
tools/validate-preference-custody-manifest-v49.mjs
tools/validate-preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs
EOF
}

fetch_sha() {
  local branch=$1
  git ls-remote --heads origin "refs/heads/${branch}" | awk '{print $1}'
}

verify_product() {
  local head=$1
  git fetch --no-tags origin "$FROZEN_PARENT" "$head" >/dev/null 2>&1
  test "$(git rev-parse "${head}^")" = "$FROZEN_PARENT"
  test "$(git rev-list --count "$FROZEN_PARENT..$head")" -eq 1
  test "$(git rev-list --parents -n 1 "$head" | awk '{print NF-1}')" -eq 1
  test "$(git rev-parse "$head:$REPAIRED_PATH")" = "$REPAIRED_BLOB"

  expected_paths | sort > "$STATE_DIR/expected-paths.txt"
  git diff --name-only "$FROZEN_PARENT" "$head" | sort > "$STATE_DIR/product-paths.txt"
  diff -u "$STATE_DIR/expected-paths.txt" "$STATE_DIR/product-paths.txt"
  test "$(wc -l < "$STATE_DIR/product-paths.txt" | tr -d ' ')" -eq 14

  git diff --name-status "$FROZEN_PARENT" "$head" > "$STATE_DIR/product-name-status.txt"
  test "$(awk '$1 != "A" {n++} END {print n+0}' "$STATE_DIR/product-name-status.txt")" -eq 0
  if grep -Eq '(^|/)(temp|carrier|shard|controller|marker|pulse|receipt|diagnostic)([-_.]|/)|^\.pc51/' "$STATE_DIR/product-paths.txt"; then
    echo 'transport path entered PC-51 product authority' >&2
    exit 1
  fi
}

matrix_state() {
  local product_head=$1
  gh api --paginate --slurp "/repos/${REPO}/actions/runs?head_sha=${product_head}&event=pull_request&per_page=100" > "$STATE_DIR/run-pages.json"
  PRODUCT_HEAD="$product_head" python - <<'PY'
import json, os, sys
from pathlib import Path
pages = json.loads(Path('/tmp/pc51-terminal/run-pages.json').read_text())
if isinstance(pages, dict):
    pages = [pages]
runs = []
for page in pages:
    runs.extend(page.get('workflow_runs', []))
required = ['Preference custody laboratory floor']
required += [f'Preference custody laboratory floor v{i}' for i in range(9, 50)]
required += [
    'Preference linkage source review reproducible build artifact provenance execution attestation assurance',
    'No magic human gate',
    'Release checks',
]
latest = {}
head = os.environ['PRODUCT_HEAD']
for run in runs:
    if run.get('head_sha') != head or run.get('event') != 'pull_request':
        continue
    name = run.get('name')
    if name not in required:
        continue
    if name not in latest or int(run.get('id', 0)) > int(latest[name].get('id', 0)):
        latest[name] = run
missing = [name for name in required if name not in latest]
pending = [name for name in required if name in latest and latest[name].get('status') != 'completed']
failed = [name for name in required if name in latest and latest[name].get('status') == 'completed' and latest[name].get('conclusion') != 'success']
summary = {
    'required': len(required),
    'observed': len(latest),
    'success': sum(1 for r in latest.values() if r.get('status') == 'completed' and r.get('conclusion') == 'success'),
    'missing': missing,
    'pending': pending,
    'failed': failed,
    'runs': {name: {'id': latest[name].get('id'), 'status': latest[name].get('status'), 'conclusion': latest[name].get('conclusion')} for name in sorted(latest)},
}
Path('/tmp/pc51-terminal/matrix.json').write_text(json.dumps(summary, indent=2) + '\n')
if failed:
    sys.exit(2)
if missing or pending:
    sys.exit(3)
PY
}

prepare() {
  git config --global --add safe.directory "$GITHUB_WORKSPACE"
  git fetch --no-tags origin main "$FROZEN_PARENT" >/dev/null 2>&1

  local product_head=''
  local qualifier_head=''
  for _ in $(seq 1 240); do
    product_head=$(fetch_sha "$PRODUCT_BRANCH")
    qualifier_head=$(fetch_sha "$QUALIFIER_BRANCH")
    if [[ -n "$product_head" && "$product_head" != "$OLD_PRODUCT" ]]; then
      if verify_product "$product_head" && [[ "$qualifier_head" = "$product_head" ]]; then
        break
      fi
    fi
    sleep 15
  done

  test -n "$product_head"
  test "$product_head" != "$OLD_PRODUCT"
  verify_product "$product_head"
  test "$qualifier_head" = "$product_head"

  local matrix_rc=3
  for _ in $(seq 1 540); do
    set +e
    matrix_state "$product_head"
    matrix_rc=$?
    set -e
    if [[ $matrix_rc -eq 0 ]]; then
      break
    fi
    if [[ $matrix_rc -eq 2 ]]; then
      comment_issue "PC-51 terminal controller refused merge: the newest exact-head hosted matrix contains a failed workflow on product \`${product_head}\`. See controller run \`${GITHUB_RUN_ID}\`."
      cat "$STATE_DIR/matrix.json" >&2
      exit 1
    fi
    sleep 20
  done
  test "$matrix_rc" -eq 0

  gh api "/repos/${REPO}/pulls/${PRODUCT_PR}" > "$STATE_DIR/product-pr.json"
  PRODUCT_HEAD="$product_head" python - <<'PY'
import json, os
from pathlib import Path
pr = json.loads(Path('/tmp/pc51-terminal/product-pr.json').read_text())
assert pr['state'] == 'open', pr['state']
assert not pr.get('draft', False)
assert pr['head']['sha'] == os.environ['PRODUCT_HEAD'], (pr['head']['sha'], os.environ['PRODUCT_HEAD'])
assert int(pr.get('commits', 0)) == 1, pr.get('commits')
assert int(pr.get('changed_files', 0)) == 14, pr.get('changed_files')
PY

  gh api graphql \
    -F owner="$OWNER" -F name="$NAME" -F number="$PRODUCT_PR" \
    -f query='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewDecision reviewThreads(first:100){nodes{isResolved}} reviews(last:100){nodes{state}}}}}' \
    > "$STATE_DIR/review-state.json"
  python - <<'PY'
import json
from pathlib import Path
node = json.loads(Path('/tmp/pc51-terminal/review-state.json').read_text())['data']['repository']['pullRequest']
threads = node['reviewThreads']['nodes']
assert all(t['isResolved'] for t in threads), threads
assert all(r['state'] != 'CHANGES_REQUESTED' for r in node['reviews']['nodes']), node['reviews']['nodes']
assert node.get('reviewDecision') != 'CHANGES_REQUESTED', node.get('reviewDecision')
PY

  git fetch --no-tags origin main >/dev/null 2>&1
  local base_head
  base_head=$(git rev-parse origin/main)
  git diff --name-only "$FROZEN_PARENT" "$base_head" | sort -u > "$STATE_DIR/main-since-parent.txt"
  if comm -12 "$STATE_DIR/expected-paths.txt" "$STATE_DIR/main-since-parent.txt" | grep -q .; then
    echo 'live main overlaps PC-51 product namespace' >&2
    comm -12 "$STATE_DIR/expected-paths.txt" "$STATE_DIR/main-since-parent.txt" >&2
    exit 1
  fi

  local merge_response merge_sha
  merge_response=$(gh api --method PUT \
    -H 'Accept: application/vnd.github+json' \
    "/repos/${REPO}/pulls/${PRODUCT_PR}/merge" \
    -f sha="$product_head" \
    -f merge_method='merge' \
    -f commit_title='Complete PC-51 source-review, reproducible-build, provenance, and execution-attestation custody (#1277)' \
    -f commit_message='Merge the exact one-parent, fourteen-path PC-51 product after the clean-checkout historical-floor defect was repaired, all 45 newest hosted workflows passed, every review thread was resolved, current-main overlap remained zero, and the authority ceiling remained intact.')
  printf '%s\n' "$merge_response" > "$STATE_DIR/merge-response.json"
  test "$(jq -r '.merged' <<<"$merge_response")" = true
  merge_sha=$(jq -r '.sha' <<<"$merge_response")
  test -n "$merge_sha"
  test "$merge_sha" != null

  git fetch --no-tags origin main "$merge_sha" "$product_head" >/dev/null 2>&1
  mapfile -t parents < <(git rev-list --parents -n 1 "$merge_sha" | cut -d' ' -f2- | tr ' ' '\n')
  test "${#parents[@]}" -eq 2
  local merge_base=${parents[0]}
  local merge_product=${parents[1]}
  test "$merge_product" = "$product_head"

  git diff --name-only "$FROZEN_PARENT" "$merge_base" | sort -u > "$STATE_DIR/merge-base-since-parent.txt"
  if comm -12 "$STATE_DIR/expected-paths.txt" "$STATE_DIR/merge-base-since-parent.txt" | grep -q .; then
    echo 'canonical merge first parent overlaps PC-51 product namespace' >&2
    exit 1
  fi
  git diff --name-status "$merge_base" "$merge_sha" > "$STATE_DIR/merge-name-status.txt"
  test "$(awk '$1 != "A" {n++} END {print n+0}' "$STATE_DIR/merge-name-status.txt")" -eq 0
  git diff --name-only "$merge_base" "$merge_sha" | sort > "$STATE_DIR/merge-paths.txt"
  diff -u "$STATE_DIR/expected-paths.txt" "$STATE_DIR/merge-paths.txt"

  : > "$STATE_DIR/blob-identities.tsv"
  while IFS= read -r path; do
    local product_blob merge_blob
    product_blob=$(git rev-parse "$product_head:$path")
    merge_blob=$(git rev-parse "$merge_sha:$path")
    test "$product_blob" = "$merge_blob"
    printf '%s\t%s\n' "$path" "$merge_blob" >> "$STATE_DIR/blob-identities.tsv"
  done < "$STATE_DIR/expected-paths.txt"

  git checkout --detach "$merge_sha"
  git clean -fdx
  node "tools/compile-${SLUG}.mjs"
  node "tools/validate-${SLUG}.mjs"
  node "test/${SLUG}.test.js"
  node tools/compile-preference-custody-manifest-v49.mjs
  node tools/validate-preference-custody-manifest-v49.mjs
  node test/preference-custody-manifest-v49.test.js
  for test_file in $(find test -maxdepth 1 -type f -name 'preference-custody-manifest-v*.test.js' | sort -V); do
    node "$test_file"
  done
  node test/preference-custody-manifest.test.js
  node tools/validate-no-magic-human-gate.mjs
  node test/no-magic-human-gate.test.js
  npm run release:check

  local merge_tree current_main
  merge_tree=$(git rev-parse "$merge_sha^{tree}")
  git fetch --no-tags origin main >/dev/null 2>&1
  current_main=$(git rev-parse origin/main)
  git merge-base --is-ancestor "$merge_sha" "$current_main"

  cat > "$STATE_DIR/state.env" <<EOF
PRODUCT_HEAD=$product_head
PRODUCT_TREE=$(git rev-parse "$product_head^{tree}")
MERGE_SHA=$merge_sha
MERGE_TREE=$merge_tree
MERGE_BASE=$merge_base
CURRENT_MAIN=$current_main
EOF

  python - <<PY
import json
from pathlib import Path
state = {
  'schema_version': 'pc51-exact-postmerge-proof@1',
  'issue': 1268,
  'product_pr': 1277,
  'frozen_parent': '$FROZEN_PARENT',
  'product_commit': '$product_head',
  'product_tree': '$(git rev-parse "$product_head^{tree}")',
  'canonical_merge': '$merge_sha',
  'canonical_merge_tree': '$merge_tree',
  'merge_first_parent': '$merge_base',
  'merge_second_parent': '$merge_product',
  'permanent_paths': 14,
  'canonical_product_blob_matches': 14,
  'transport_paths': 0,
  'hosted_workflows_required': 45,
  'hosted_workflows_success': 45,
  'standalone_pc51': 'pass',
  'floor_v49': 'pass',
  'historical_preference_custody_floors': 'pass',
  'base_preference_custody': 'pass',
  'no_magic_human': 'pass',
  'complete_release_gate': 'pass',
  'outside_human_dependency': False,
  'graph_effect': 'none',
}
Path('$STATE_DIR/postmerge-receipt.json').write_text(json.dumps(state, indent=2) + '\n')
PY
  cp "$STATE_DIR/matrix.json" "$STATE_DIR/exact-head-matrix.json"
  cp "$STATE_DIR/review-state.json" "$STATE_DIR/review-state-proof.json"
  mkdir -p "$STATE_DIR/build"
  find build/research -maxdepth 1 -type f \( -name "${SLUG}.*" -o -name 'preference-custody-laboratory-floor-v49.*' \) -exec cp {} "$STATE_DIR/build/" \;
  tar -C "$STATE_DIR" -czf "$STATE_DIR/pc51-exact-postmerge-proof.tar.gz" \
    postmerge-receipt.json exact-head-matrix.json review-state-proof.json \
    expected-paths.txt product-name-status.txt merge-name-status.txt blob-identities.tsv build
  sha256sum "$STATE_DIR/pc51-exact-postmerge-proof.tar.gz" > "$STATE_DIR/pc51-exact-postmerge-proof.tar.gz.sha256"
}

retire() {
  source "$STATE_DIR/state.env"
  git fetch --no-tags origin main "$MERGE_SHA" >/dev/null 2>&1
  git merge-base --is-ancestor "$MERGE_SHA" origin/main

  gh api --paginate "/repos/${REPO}/pulls?state=open&per_page=100" \
    --jq '.[] | select(.head.ref | startswith("agent/pc51")) | .number' \
    | sort -nu > "$STATE_DIR/open-pc51-prs.txt"
  while IFS= read -r pr; do
    [[ -z "$pr" ]] && continue
    gh api --method PATCH "/repos/${REPO}/pulls/${pr}" -f state=closed >/dev/null
  done < "$STATE_DIR/open-pc51-prs.txt"

  gh api --paginate "/repos/${REPO}/git/matching-refs/heads/agent/pc51" \
    --jq '.[].ref' | sed 's#^refs/heads/##' | sort -u > "$STATE_DIR/pc51-refs-before.txt"
  local controller_ref='agent/pc51-terminal-controller'
  grep -v "^${controller_ref}$" "$STATE_DIR/pc51-refs-before.txt" > "$STATE_DIR/pc51-refs-first.txt" || true
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    gh api --method DELETE "/repos/${REPO}/git/refs/heads/${branch}" >/dev/null
  done < "$STATE_DIR/pc51-refs-first.txt"
  if grep -qx "$controller_ref" "$STATE_DIR/pc51-refs-before.txt"; then
    gh api --method DELETE "/repos/${REPO}/git/refs/heads/${controller_ref}" >/dev/null
  fi

  gh api --paginate "/repos/${REPO}/git/matching-refs/heads/agent/pc51" \
    --jq '.[].ref' | sed 's#^refs/heads/##' | sort -u > "$STATE_DIR/pc51-refs-after.txt"
  test ! -s "$STATE_DIR/pc51-refs-after.txt"

  gh api --paginate "/repos/${REPO}/pulls?state=open&per_page=100" \
    --jq '.[] | select(.head.ref | startswith("agent/pc51")) | .number' \
    | sort -nu > "$STATE_DIR/open-pc51-prs-after.txt"
  test ! -s "$STATE_DIR/open-pc51-prs-after.txt"

  python - <<'PY'
import json
from pathlib import Path
state = {}
for line in Path('/tmp/pc51-terminal/state.env').read_text().splitlines():
    key, value = line.split('=', 1)
    state[key] = value
before = [x for x in Path('/tmp/pc51-terminal/pc51-refs-before.txt').read_text().splitlines() if x]
prs = [int(x) for x in Path('/tmp/pc51-terminal/open-pc51-prs.txt').read_text().splitlines() if x]
receipt = {
  'schema_version': 'pc51-terminal-ref-retirement@1',
  'canonical_merge': state['MERGE_SHA'],
  'canonical_merge_tree': state['MERGE_TREE'],
  'refs_retired': before,
  'ref_count_retired': len(before),
  'residual_pc51_refs': 0,
  'open_pc51_prs_closed': prs,
  'residual_open_pc51_prs': 0,
  'outside_human_dependency': False,
  'graph_effect': 'none',
}
Path('/tmp/pc51-terminal/ref-retirement-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
PY
  tar -C "$STATE_DIR" -czf "$STATE_DIR/pc51-terminal-ref-retirement.tar.gz" \
    ref-retirement-receipt.json pc51-refs-before.txt pc51-refs-after.txt \
    open-pc51-prs.txt open-pc51-prs-after.txt
  sha256sum "$STATE_DIR/pc51-terminal-ref-retirement.tar.gz" > "$STATE_DIR/pc51-terminal-ref-retirement.tar.gz.sha256"
}

finalize() {
  source "$STATE_DIR/state.env"
  gh api "/repos/${REPO}/actions/runs/${GITHUB_RUN_ID}/artifacts?per_page=100" > "$STATE_DIR/run-artifacts.json"
  python - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/tmp/pc51-terminal/run-artifacts.json').read_text())
by_name = {a['name']: a for a in payload.get('artifacts', [])}
required = ['pc51-exact-postmerge-proof', 'pc51-terminal-ref-retirement']
missing = [name for name in required if name not in by_name]
assert not missing, missing
Path('/tmp/pc51-terminal/artifact-receipts.json').write_text(json.dumps({name: {'id': by_name[name]['id'], 'digest': by_name[name].get('digest'), 'size_in_bytes': by_name[name].get('size_in_bytes')} for name in required}, indent=2) + '\n')
PY
  local proof_id proof_digest cleanup_id cleanup_digest
  proof_id=$(jq -r '."pc51-exact-postmerge-proof".id' "$STATE_DIR/artifact-receipts.json")
  proof_digest=$(jq -r '."pc51-exact-postmerge-proof".digest' "$STATE_DIR/artifact-receipts.json")
  cleanup_id=$(jq -r '."pc51-terminal-ref-retirement".id' "$STATE_DIR/artifact-receipts.json")
  cleanup_digest=$(jq -r '."pc51-terminal-ref-retirement".digest' "$STATE_DIR/artifact-receipts.json")

  local body
  body=$(cat <<EOF
## PC-51 terminal receipt

\`\`\`text
status                                  complete
qualified parent                        $FROZEN_PARENT
clean product commit                    $PRODUCT_HEAD
clean product tree                      $PRODUCT_TREE
canonical merge                         $MERGE_SHA
canonical merge tree                    $MERGE_TREE
permanent product paths                 14
hosted exact-head workflows             45 / 45 success
canonical/product blob matches          14 / 14
transport paths                         0
post-merge proof run                    $GITHUB_RUN_ID
post-merge proof artifact               $proof_id
post-merge proof digest                 $proof_digest
ref-retirement artifact                 $cleanup_id
ref-retirement digest                   $cleanup_digest
remaining agent/pc51-* refs             0
remaining open PC-51 transaction PRs    0
outside-human dependency                false
graph effect                            none
\`\`\`

The exact canonical merge passed topology, path, Git-blob, standalone PC-51, floor-v49, every historical Preference Custody floor, base Preference Custody, no-magic-human, and complete repository release proof. All temporary PC-51 PRs were closed without merge and every PC-51 transaction ref was retired. The authority ceiling remains unchanged; this synthetic control creates no real source-review, reproducible-build, provenance, execution, security, causal, prevalence, graph, allegation, coordination, common-purpose, or intent finding.
EOF
)
  comment_issue "$body"
  gh api --method PATCH "/repos/${REPO}/issues/${ISSUE}" \
    -f state=closed -f state_reason=completed >/dev/null
  gh api "/repos/${REPO}/issues/${ISSUE}" > "$STATE_DIR/terminal-issue.json"
  test "$(jq -r '.state' "$STATE_DIR/terminal-issue.json")" = closed
  test "$(jq -r '.state_reason' "$STATE_DIR/terminal-issue.json")" = completed
}

case "$MODE" in
  prepare) prepare ;;
  retire) retire ;;
  finalize) finalize ;;
  *) echo "usage: $0 {prepare|retire|finalize}" >&2; exit 64 ;;
esac
