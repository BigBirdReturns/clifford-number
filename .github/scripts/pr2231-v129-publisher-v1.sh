#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C
export TZ=UTC

repo=BigBirdReturns/clifford-number
product_pr=2231
product_branch=agent/current-main-identifier-context-product-v1
main_sha=5b992ba8b7573cc9a859ac0dcb0d5edd20ea81ed
product_head=c10beb52cc37c3933e7a0d2e452c1d6502b36a39
product_tree=24a1487dac3e221601b905fd696b4888444a0032
product_parent=e0c772e962078878a1e4b659a861581cb2957a73
library_path=tools/lib/industrial-exhaust.mjs
test_path=test/industrial-exhaust.test.js
v128_library_blob=b2aefcdc6a2ae6715c5ae9dd748c12310c57564f
v128_test_blob=c76ea816162a2a47e1cbf3612322adc95cc60c4e
v128_library_sha256=a1acebc33a13502813b5d5abdac5d37f504efb38cd46bda8813cde29f72c0db7
v128_test_sha256=6508b93361da6bfb1fa12b2bd11f8ea34975d954e2f6e6629166e5bff68c2a22
apply_base=.github/scripts/pr2231-v129-apply-v1.py
apply_quote=.github/scripts/pr2231-v129-quoted-origin-v1.py
apply_base_blob=0672e8f9285b2601c9a16cbded8e163c6c3d7ab7
apply_quote_blob=7087b232cc3bb714622e9e53aada95f0db4d1cec
apply_base_sha256=3d794a5308600e28cf20d0a0ea0bcbe2f957490b107f42cffc68984d57730532
apply_quote_sha256=0c8e287c0ecd8ebd517c368c3e6210708c11626af79ae15f65b033c6b298c25a
candidate_commit=29070b8eb251b23298c9bde04094ec2cf7faf60e
candidate_tree=5316a5a8be2a11b9aac39d9f9ee53ba5ec58d3f8
candidate_library_blob=1c33608daa7d00b8a7935a5afc40e37a280ac073
candidate_test_blob=0e148a88fc4787152a841303072bbfc2997e4b07
candidate_library_sha256=3653b44e8df1d07097eb861c92a1a8553bcae73344e6bdeb8ab1072cd6992450
candidate_test_sha256=33d42400663eb6a423a55d076675196999b490dd71841f97bbfce4ad663de2ec
qualifier_run=33686850057
qualifier_artifact=9868529445
qualifier_artifact_digest=sha256:1741fc62ccc8ca7839d1e650b5f9e84bf2fd032ceb65f833eaf419b4ceb3fa8f
review_comments=(3912324673 3912338942 3912338949 3917571264 3917571271)
review_titles=(
  'Preserve a later phone-owned opener after the clean observation closer'
  'Compare embedded-email bounds in source coordinates'
  'Index token bounds before processing embedded emails'
  'Reject scheme syntax after a bare-host match'
  'Map URL origins using whole-prefix normalization'
)

out=/tmp/pr2231-v129-publisher-v1
work=/tmp/pr2231-v129-publisher-work-v1
rm -rf "$out" "$work"
mkdir -p "$out" "$work"
exec > >(tee -a "$out/publication.log") 2>&1

preserve() {
  rc=$?
  trap - EXIT
  set +e
  printf 'exit_status=%s\nmode=leased-v129-product-only-publication\n' "$rc" > "$out/status.env"
  find "$out" -type f ! -name artifact-sha256.txt -print0 \
    | sort -z | xargs -0 sha256sum > "$out/artifact-sha256.txt"
  find "$out" -type f -printf '%P\t%s\n' | sort > "$out/artifact-manifest.txt"
  exit "$rc"
}
trap preserve EXIT

require_equal() {
  local actual=$1 expected=$2 label=$3
  if [[ "$actual" != "$expected" ]]; then
    printf 'lease mismatch: %s\nexpected=%s\nactual=%s\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
}

fetch_blob() {
  local sha=$1 destination=$2
  mkdir -p "$(dirname "$destination")"
  gh api "repos/$repo/git/blobs/$sha" --jq '.content' \
    | tr -d '\n' | base64 -d > "$destination"
  require_equal "$(git hash-object "$destination")" "$sha" "blob-$sha"
}

snapshot_stable_state() {
  local label=$1
  gh api "repos/$repo/pulls/$product_pr" \
    | jq '{state,draft,merged_at,head_sha:.head.sha,head_ref:.head.ref,base_sha:.base.sha,commits,changed_files,title,body}' \
    > "$out/product-pr.$label.json"
  gh api "repos/$repo/pulls/$CONTROLLER_PR" \
    | jq '{state,draft,merged_at,head_sha:.head.sha,head_ref:.head.ref,base_sha:.base.sha,commits,changed_files,title,body}' \
    > "$out/controller-pr.$label.json"
  gh api --paginate --slurp "repos/$repo/issues/$product_pr/comments?per_page=100" \
    | jq 'add | sort_by(.id) | map({id,body,user:.user.login,created_at,updated_at})' \
    > "$out/issue-comments.$label.json"
  gh api --paginate --slurp "repos/$repo/pulls/$product_pr/reviews?per_page=100" \
    | jq 'add | sort_by(.id) | map({id,body,state,commit_id,user:.user.login,submitted_at})' \
    > "$out/reviews.$label.json"
  gh api --paginate --slurp "repos/$repo/pulls/$product_pr/comments?per_page=100" \
    | jq 'add | sort_by(.id) | map({id,body,user:.user.login,path,original_commit_id,original_line,original_start_line,in_reply_to_id,created_at})' \
    > "$out/review-comments-stable.$label.json"
  gh api graphql \
    -F owner=BigBirdReturns \
    -F name=clifford-number \
    -F number="$product_pr" \
    -f query='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved comments(first:100){nodes{databaseId body author{login}}}}}}}}' \
    | jq '.data.repository.pullRequest.reviewThreads.nodes | sort_by(.id) | map({id,isResolved,comments:(.comments.nodes | map({databaseId,body,author:.author.login}))})' \
    > "$out/review-threads-stable.$label.json"
}

require_equal "${CONTROLLER_BRANCH:-}" "${EXPECTED_CONTROLLER_BRANCH:-}" controller-branch-env
require_equal "$(git rev-parse HEAD)" "${EXPECTED_CONTROLLER:-}" controller-head
require_equal "$(gh api "repos/$repo/pulls/$CONTROLLER_PR" --jq '.head.sha')" "$EXPECTED_CONTROLLER" controller-pr-head
require_equal "$(gh api "repos/$repo/pulls/$CONTROLLER_PR" --jq '.head.ref')" "$EXPECTED_CONTROLLER_BRANCH" controller-pr-branch
require_equal "$(gh api "repos/$repo/pulls/$CONTROLLER_PR" --jq '.draft')" true controller-draft
require_equal "$(gh api "repos/$repo/pulls/$CONTROLLER_PR" --jq '.state')" open controller-state
require_equal "$(git hash-object "$apply_base")" "$apply_base_blob" apply-base-blob
require_equal "$(git hash-object "$apply_quote")" "$apply_quote_blob" apply-quote-blob
require_equal "$(sha256sum "$apply_base" | awk '{print $1}')" "$apply_base_sha256" apply-base-sha256
require_equal "$(sha256sum "$apply_quote" | awk '{print $1}')" "$apply_quote_sha256" apply-quote-sha256
python3 -m py_compile "$apply_base" "$apply_quote"

snapshot_stable_state before
require_equal "$(gh api "repos/$repo/git/ref/heads/main" --jq '.object.sha')" "$main_sha" main-ref-before
require_equal "$(gh api "repos/$repo/git/ref/heads/$product_branch" --jq '.object.sha')" "$product_head" product-ref-before
require_equal "$(jq -r '.head_sha' "$out/product-pr.before.json")" "$product_head" product-pr-head-before
require_equal "$(jq -r '.base_sha' "$out/product-pr.before.json")" "$main_sha" product-pr-base-before
require_equal "$(jq -r '.state' "$out/product-pr.before.json")" open product-pr-state-before
require_equal "$(jq -r '.draft' "$out/product-pr.before.json")" true product-pr-draft-before
require_equal "$(jq -r '.merged_at // ""' "$out/product-pr.before.json")" '' product-pr-merged-before
require_equal "$(jq -r '.commits' "$out/product-pr.before.json")" 2 product-pr-commits-before
require_equal "$(jq -r '.changed_files' "$out/product-pr.before.json")" 2 product-pr-files-before

product_commit_json="$out/product-commit-before.json"
gh api "repos/$repo/git/commits/$product_head" > "$product_commit_json"
require_equal "$(jq -r '.tree.sha' "$product_commit_json")" "$product_tree" product-tree-before
require_equal "$(jq -r '.parents[0].sha' "$product_commit_json")" "$product_parent" product-parent-before
require_equal "$(jq '.parents | length' "$product_commit_json")" 1 product-parent-count-before

for i in "${!review_comments[@]}"; do
  id=${review_comments[$i]}
  title=${review_titles[$i]}
  gh api "repos/$repo/pulls/comments/$id" > "$out/review-$id.before.json"
  jq -er --arg title "$title" '.body | contains($title)' "$out/review-$id.before.json" >/dev/null
  require_equal "$(jq -r '.path' "$out/review-$id.before.json")" "$library_path" "review-$id-path"
done

# Reconstruct the exact qualified V129 candidate over the frozen main lease.
git worktree add --detach "$work/replay" "$main_sha"
fetch_blob "$v128_library_blob" "$work/replay/$library_path"
fetch_blob "$v128_test_blob" "$work/replay/$test_path"
require_equal "$(sha256sum "$work/replay/$library_path" | awk '{print $1}')" "$v128_library_sha256" v128-library-sha256
require_equal "$(sha256sum "$work/replay/$test_path" | awk '{print $1}')" "$v128_test_sha256" v128-test-sha256
cp "$work/replay/$library_path" "$out/v128-industrial-exhaust.mjs"
cp "$work/replay/$test_path" "$out/v128-industrial-exhaust.test.js"
python3 "$apply_base" "$work/replay/$library_path" "$work/replay/$test_path"
python3 "$apply_quote" "$work/replay/$library_path" "$work/replay/$test_path"
node --check "$work/replay/$library_path"
node --check "$work/replay/$test_path"
git -C "$work/replay" diff --check

cp "$work/replay/$library_path" "$out/v129-industrial-exhaust.mjs"
cp "$work/replay/$test_path" "$out/v129-industrial-exhaust.test.js"
require_equal "$(git hash-object "$out/v129-industrial-exhaust.mjs")" "$candidate_library_blob" candidate-library-blob
require_equal "$(git hash-object "$out/v129-industrial-exhaust.test.js")" "$candidate_test_blob" candidate-test-blob
require_equal "$(sha256sum "$out/v129-industrial-exhaust.mjs" | awk '{print $1}')" "$candidate_library_sha256" candidate-library-sha256
require_equal "$(sha256sum "$out/v129-industrial-exhaust.test.js" | awk '{print $1}')" "$candidate_test_sha256" candidate-test-sha256
mapfile -t changed_paths < <(git -C "$work/replay" diff --name-only | sort)
require_equal "${#changed_paths[@]}" 2 candidate-changed-path-count
require_equal "${changed_paths[0]}" "$test_path" candidate-path-1
require_equal "${changed_paths[1]}" "$library_path" candidate-path-2
git -C "$work/replay" diff --numstat > "$out/candidate-numstat.txt"
git -C "$work/replay" diff -- "$library_path" "$test_path" > "$out/candidate.patch"

cat > "$out/v129-publication-direct.mjs" <<'NODE'
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const [modulePath] = process.argv.slice(2);
const { redactContactData } = await import(`${pathToFileURL(modulePath).href}?publisher=${Date.now()}`);
const cases = [
  ['ID: 123-45678/[62-16]-[03-6216-8041]', 'ID: 123-45678/[62-16]-[[contact omitted]]'],
  ['Phone: 03-6216-8041.https://example.test/03-6216-8041', 'Phone: [contact omitted].https://example.test/[contact omitted]'],
  ['Phone: 03-6216-8041="https://example.test/03-6216-8041', 'Phone: [contact omitted]="https://example.test/03-6216-8041'],
  ['Phone: 03-6216-8041="mailto://example.test/03-6216-8041', 'Phone: [contact omitted]="mailto://example.test/[contact omitted]'],
  ['192.0.2.1:443/03-6216-8041', '192.0.2.1:443/03-6216-8041'],
  ['192.0.2.1://03-6216-8041', '192.0.2.1://[contact omitted]']
];
for (const [input, expected] of cases) assert.equal(redactContactData(input), expected);
console.log(JSON.stringify({caseCount: cases.length, status: 'direct-success'}, null, 2));
NODE
node "$out/v129-publication-direct.mjs" "$work/replay/$library_path" | tee "$out/direct.json"

(
  cd "$work/replay"
  for file in test/industrial-exhaust*.test.js; do
    node "$file"
  done
) > "$out/focused.log" 2>&1
(
  cd "$work/replay"
  npm run release:check
) > "$out/release.log" 2>&1

# Remove generated release state and restore only the exact two qualified files.
git -C "$work/replay" reset --hard "$main_sha"
cp "$out/v129-industrial-exhaust.mjs" "$work/replay/$library_path"
cp "$out/v129-industrial-exhaust.test.js" "$work/replay/$test_path"
mapfile -t restored_paths < <(git -C "$work/replay" status --short | sed 's/^...//' | sort)
require_equal "${#restored_paths[@]}" 2 restored-path-count
require_equal "${restored_paths[0]}" "$test_path" restored-path-1
require_equal "${restored_paths[1]}" "$library_path" restored-path-2

git -C "$work/replay" add -- "$library_path" "$test_path"
replayed_tree=$(git -C "$work/replay" write-tree)
require_equal "$replayed_tree" "$candidate_tree" candidate-tree
candidate_message=$'fix: bind V129 source-indexed contact custody\n\nRetain V128 wrapper and embedded-email custody, reject malformed scheme-like origins, and map approved URL offsets through grapheme-segment NFKC source coordinates.'
replayed_commit=$(
  printf '%s\n' "$candidate_message" \
    | GIT_AUTHOR_NAME='BigBirdReturns' \
      GIT_AUTHOR_EMAIL='bigbirdreturns@proton.me' \
      GIT_AUTHOR_DATE='2026-09-02T22:10:00Z' \
      GIT_COMMITTER_NAME='BigBirdReturns' \
      GIT_COMMITTER_EMAIL='bigbirdreturns@proton.me' \
      GIT_COMMITTER_DATE='2026-09-02T22:10:00Z' \
      git -C "$work/replay" commit-tree "$replayed_tree" -p "$main_sha"
)
require_equal "$replayed_commit" "$candidate_commit" candidate-commit
require_equal "$(git -C "$work/replay" cat-file -p "$replayed_commit" | sed -n 's/^parent //p')" "$main_sha" candidate-parent
require_equal "$(git -C "$work/replay" diff-tree --no-commit-id --name-only -r "$replayed_commit" | sort | wc -l)" 2 candidate-path-count

git -C "$work/replay" cat-file -p "$replayed_commit" > "$out/candidate-commit.txt"
git -C "$work/replay" diff-tree --no-commit-id --name-status -r "$replayed_commit" > "$out/candidate-paths.txt"
cat > "$out/candidate.env" <<EOF
candidate_commit=$candidate_commit
candidate_parent=$main_sha
candidate_tree=$candidate_tree
library_blob=$candidate_library_blob
test_blob=$candidate_test_blob
qualifier_run=$qualifier_run
qualifier_artifact=$qualifier_artifact
qualifier_artifact_digest=$qualifier_artifact_digest
EOF

# Final exact leases immediately before the only authorized mutation.
require_equal "$(git rev-parse HEAD)" "$EXPECTED_CONTROLLER" controller-head-final
require_equal "$(gh api "repos/$repo/git/ref/heads/main" --jq '.object.sha')" "$main_sha" main-ref-final
require_equal "$(gh api "repos/$repo/git/ref/heads/$product_branch" --jq '.object.sha')" "$product_head" product-ref-final
require_equal "$(gh api "repos/$repo/pulls/$product_pr" --jq '.head.sha')" "$product_head" product-pr-head-final
require_equal "$(gh api "repos/$repo/pulls/$product_pr" --jq '.draft')" true product-pr-draft-final
require_equal "$(gh api "repos/$repo/pulls/$product_pr" --jq '.state')" open product-pr-state-final
require_equal "$(gh api "repos/$repo/pulls/$CONTROLLER_PR" --jq '.head.sha')" "$EXPECTED_CONTROLLER" controller-pr-head-final

# Product branch only. The old head is an exact force-with-lease, not a force guess.
git -C "$work/replay" push origin \
  "$candidate_commit:refs/heads/$product_branch" \
  --force-with-lease="refs/heads/$product_branch:$product_head"

require_equal "$(gh api "repos/$repo/git/ref/heads/$product_branch" --jq '.object.sha')" "$candidate_commit" product-ref-after
require_equal "$(gh api "repos/$repo/git/ref/heads/main" --jq '.object.sha')" "$main_sha" main-ref-after

# GitHub may briefly serve the preceding PR projection after the valid ref update.
for attempt in $(seq 1 30); do
  current_projection=$(gh api "repos/$repo/pulls/$product_pr"     --jq '[.head.sha, (.commits|tostring), (.changed_files|tostring)] | join(" ")')
  if [[ "$current_projection" == "$candidate_commit 1 2" ]]; then
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    printf 'product PR projection did not converge after publication: %s\n' "$current_projection" >&2
    exit 1
  fi
  sleep 1
done

snapshot_stable_state after
require_equal "$(jq -r '.head_sha' "$out/product-pr.after.json")" "$candidate_commit" product-pr-head-after
require_equal "$(jq -r '.base_sha' "$out/product-pr.after.json")" "$main_sha" product-pr-base-after
require_equal "$(jq -r '.state' "$out/product-pr.after.json")" open product-pr-state-after
require_equal "$(jq -r '.draft' "$out/product-pr.after.json")" true product-pr-draft-after
require_equal "$(jq -r '.merged_at // ""' "$out/product-pr.after.json")" '' product-pr-merged-after
require_equal "$(jq -r '.commits' "$out/product-pr.after.json")" 1 product-pr-commits-after
require_equal "$(jq -r '.changed_files' "$out/product-pr.after.json")" 2 product-pr-files-after
require_equal "$(jq -r '.head_sha' "$out/controller-pr.after.json")" "$EXPECTED_CONTROLLER" controller-pr-head-after
require_equal "$(jq -r '.state' "$out/controller-pr.after.json")" open controller-pr-state-after
require_equal "$(jq -r '.draft' "$out/controller-pr.after.json")" true controller-pr-draft-after
require_equal "$(jq -r '.merged_at // ""' "$out/controller-pr.after.json")" '' controller-pr-merged-after

cmp "$out/issue-comments.before.json" "$out/issue-comments.after.json"
cmp "$out/reviews.before.json" "$out/reviews.after.json"
cmp "$out/review-comments-stable.before.json" "$out/review-comments-stable.after.json"
cmp "$out/review-threads-stable.before.json" "$out/review-threads-stable.after.json"

mapfile -t pr_paths < <(gh api --paginate "repos/$repo/pulls/$product_pr/files?per_page=100" --jq '.[].filename' | sort)
require_equal "${#pr_paths[@]}" 2 product-pr-path-count-after
require_equal "${pr_paths[0]}" "$test_path" product-pr-path-1-after
require_equal "${pr_paths[1]}" "$library_path" product-pr-path-2-after

cat > "$out/publication-terminal.txt" <<EOF
PUBLICATION_SUCCESS
PRODUCT_REF_UPDATED
MAIN_MUTATION_SKIPPED
REVIEW_MUTATION_SKIPPED
DRAFT_MUTATION_SKIPPED
READINESS_MUTATION_SKIPPED
MERGE_SKIPPED
published_commit=$candidate_commit
published_parent=$main_sha
published_tree=$candidate_tree
library_blob=$candidate_library_blob
test_blob=$candidate_test_blob
EOF
cat "$out/publication-terminal.txt"
