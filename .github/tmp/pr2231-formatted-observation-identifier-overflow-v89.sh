#!/usr/bin/env bash
set -euo pipefail
REPO='BigBirdReturns/clifford-number'; PR=2231; MAIN_BRANCH='main'; PRODUCT_BRANCH='agent/current-main-identifier-context-product-v1'
EXPECTED_CONTROLLER='agent/pr2231-formatted-observation-identifier-overflow-controller-v89'
MAIN='0e57325d62cff371e6f138d4f01086b96dd202b5'; MAIN_TREE='8f42c38bef8ad33ba1c017c09630f52576700f9d'
MAIN_LIB='5f68254d3e44de693e83503aed879160f9b7b997'; MAIN_TEST='1659a7cc54666a2ac5a1d6b88eb8c6591d98008e'
PARENT='564da53a373bfee43b026d7ed0ba0022bcc38633'; PARENT_TREE='2e0ba796bf4648e899e8c425ce00fa9bbdb2c7cc'
PRODUCT='be72ba43acd7cb21a647e1aade108b29189ac4f2'; PRODUCT_TREE='2e4c321085d7d49a3304cac44206dc4cea8845c8'
PRODUCT_LIB='01457c2702a2929ae353751435b42ecbe1b3e2bb'; PRODUCT_TEST='8e3e24b95d11032f9e39a310b7e2904312002ab3'
CANDIDATE_LIB='30cad405be83a8e259be71fda8e81461e613833c'; CANDIDATE_TEST='a6ffb9788c89d116f7126abeae606277adf73967'
PATCH='.github/tmp/pr2231-formatted-observation-identifier-overflow-v89.patch'; PATCH_SHA='bfbc30e004a62a3b51acf4ea9f1a740f1e71a5648c6dda0b847c3028c7b5b7f2'
SCRIPT='.github/tmp/pr2231-formatted-observation-identifier-overflow-v89.sh'; WORKFLOW='.github/workflows/temporary-pr2231-formatted-observation-identifier-overflow-v89.yml'
LIB='tools/lib/industrial-exhaust.mjs'; TEST='test/industrial-exhaust.test.js'; MESSAGE='fix: preserve formatted observations and identifier overflow'
A='/tmp/pr2231-v89-artifact'; PW='/tmp/pr2231-v89-product'; MW='/tmp/pr2231-v89-main'; C='/tmp/pr2231-v89-candidate'; BASE='/tmp/pr2231-v89-base.mjs'
mkdir -p "$A"; exec > >(tee "$A/receipt.txt") 2>&1
stage(){ printf '\n=== STAGE %s ===\n' "$1"; }; fail(){ echo "FAIL: $*" >&2; exit 1; }
eq(){ printf '%s actual=%s expected=%s\n' "$1" "$2" "$3"; [[ "$2" == "$3" ]] || fail "$1 mismatch"; }
rh(){ git ls-remote origin "refs/heads/$1"|awk '{print $1}'; }; paths(){ git diff --name-only "$1..$2"|LC_ALL=C sort; }; wpaths(){ git diff --name-only|LC_ALL=C sort; }
ppaths(){ printf '%s\n%s\n' "$TEST" "$LIB"|LC_ALL=C sort; }; cpaths(){ printf '%s\n%s\n%s\n' "$PATCH" "$SCRIPT" "$WORKFLOW"|LC_ALL=C sort; }
prcheck(){ local j; j=$(gh api "repos/$REPO/pulls/$PR"); eq pr-state "$(jq -r .state<<<"$j")" open; eq pr-draft "$(jq -r .draft<<<"$j")" true; eq pr-merged "$(jq -r .merged<<<"$j")" false; eq pr-head "$(jq -r .head.sha<<<"$j")" "$PRODUCT"; eq pr-base "$(jq -r .base.ref<<<"$j")" main; }
maincheck(){ eq main-head "$(rh "$MAIN_BRANCH")" "$MAIN"; eq main-tree "$(git rev-parse "$MAIN^{tree}")" "$MAIN_TREE"; eq main-lib "$(git rev-parse "$MAIN:$LIB")" "$MAIN_LIB"; eq main-test "$(git rev-parse "$MAIN:$TEST")" "$MAIN_TEST"; eq main-count "$(git rev-list --count "$PARENT..$MAIN")" 2; eq parent-tree "$(git rev-parse "$PARENT^{tree}")" "$PARENT_TREE"; git diff --quiet "$PARENT" "$MAIN" -- "$LIB" "$TEST" || fail 'main changed product paths'; }
productcheck(){ eq product-head "$(rh "$PRODUCT_BRANCH")" "$PRODUCT"; eq product-parent "$(git rev-parse "$PRODUCT^")" "$PARENT"; eq product-tree "$(git rev-parse "$PRODUCT^{tree}")" "$PRODUCT_TREE"; eq merge-base "$(git merge-base "$MAIN" "$PRODUCT")" "$PARENT"; eq product-count "$(git rev-list --count "$PARENT..$PRODUCT")" 1; eq product-ahead "$(git rev-list --count "$MAIN..$PRODUCT")" 1; eq product-behind "$(git rev-list --count "$PRODUCT..$MAIN")" 2; eq product-paths "$(paths "$PARENT" "$PRODUCT")" "$(ppaths)"; eq product-lib "$(git rev-parse "$PRODUCT:$LIB")" "$PRODUCT_LIB"; eq product-test "$(git rev-parse "$PRODUCT:$TEST")" "$PRODUCT_TEST"; }
suites(){ local r="$1" e a; e=$'test/industrial-exhaust-artifacts.test.js\ntest/industrial-exhaust-retained-store-custody.test.js\ntest/industrial-exhaust.test.js'; a=$(find "$r/test" -maxdepth 1 -type f -name 'industrial-exhaust*.test.js' -printf 'test/%f\n'|LC_ALL=C sort); eq suite-list "$a" "$e"; while read -r s; do echo "RUN $s"; (cd "$r"&&node "$s"); done<<<"$a"; }

stage controller-envelope
: "${CONTROLLER_HEAD:?}"; : "${CONTROLLER_BRANCH:?}"; eq controller-branch "$CONTROLLER_BRANCH" "$EXPECTED_CONTROLLER"; eq controller-head "$(git rev-parse HEAD)" "$CONTROLLER_HEAD"; eq controller-parent "$(git rev-parse HEAD^)" "$MAIN"; eq controller-count "$(git rev-list --count "$MAIN..HEAD")" 1; eq controller-paths "$(paths "$MAIN" HEAD)" "$(cpaths)"; eq patch-sha "$(sha256sum "$PATCH"|awk '{print $1}')" "$PATCH_SHA"; bash -n "$SCRIPT"; git diff --check "$MAIN..HEAD"; git rev-parse 'HEAD^{tree}' >"$A/controller-tree.txt"

stage initial-leases
git fetch --no-tags origin "+refs/heads/$MAIN_BRANCH:refs/remotes/origin/$MAIN_BRANCH" "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"
maincheck; productcheck; prcheck
rm -rf "$PW" "$MW" "$C"; git worktree add --detach "$PW" "$PRODUCT"; cp "$PW/$LIB" "$BASE"

stage predecessor-reproduction
cat >/tmp/v89-repro.mjs <<'EOF'
import assert from'node:assert/strict';import{pathToFileURL}from'node:url';const{redactContactData:r}=await import(pathToFileURL(process.argv[2]).href);const xs=[['Phone: 09012345678 12:30:45-03-6216-8041','Phone: [contact omitted]:30:45-03-6216-8041'],['Archive 09012345678 12:30:45-03-6216-8041','Archive [contact omitted] 12:30:45-03-6216-8041'],[`Archive ${'ID '.repeat(4097)}09012345678`,`Archive ${'ID '.repeat(4097)}[contact omitted]`],[`Archive ${'ID '.repeat(4096)}09012345678`,`Archive ${'ID '.repeat(4096)}09012345678`]];for(const[i,e]of xs)assert.equal(r(i),e);console.log(`PREDECESSOR_REPRODUCTIONS=${xs.length}`)
EOF
node /tmp/v89-repro.mjs "$PW/$LIB"

stage apply-and-direct-matrix
(cd "$PW"; git apply --check --whitespace=error-all "$GITHUB_WORKSPACE/$PATCH"; git apply --whitespace=error-all "$GITHUB_WORKSPACE/$PATCH"; git diff --check; eq repair-paths "$(wpaths)" "$(ppaths)"; eq candidate-lib "$(git hash-object "$LIB")" "$CANDIDATE_LIB"; eq candidate-test "$(git hash-object "$TEST")" "$CANDIDATE_TEST"; node --check "$LIB"; node --check "$TEST")
cat >/tmp/v89-matrix.mjs <<'EOF'
import assert from'node:assert/strict';import{performance}from'node:perf_hooks';import{pathToFileURL}from'node:url';const[b,p]=process.argv.slice(2),{redactContactData:B}=await import(pathToFileURL(b).href),{redactContactData:R}=await import(pathToFileURL(p).href);const c=(i,e,n)=>assert.equal(R(i),e,n);const ds=['-','‐','‑','‒','–','—','−','－'];for(const d of ds){c(`Phone: 09012345678 12:30:45${d}03-6216-8041`,`Phone: [contact omitted] 12:30:45${d}[contact omitted]`,'labelled seconds');c(`Archive 09012345678 12:30:45${d}03-6216-8041`,`Archive [contact omitted] 12:30:45${d}[contact omitted]`,'unlabelled seconds');c(`Phone: 09012345678 12:30${d}050-12345678`,`Phone: [contact omitted] 12:30${d}[contact omitted]`,'minutes')}for(const[i,e,n]of[['電話：０９０１２３４５６７８ １２：３０：４５－０３－６２１６－８０４１','電話：[contact omitted] １２：３０：４５－[contact omitted]','fullwidth'],['Phone: 09012345678 12:30:45-555-1212','Phone: [contact omitted] 12:30:45-555-1212','weak refusal'],['Phone: 09012345678 12:30:45-12345678','Phone: [contact omitted] 12:30:45-12345678','bare refusal'],['Phone: 09012345678 12:30:45-2027-09-18','Phone: [contact omitted] 12:30:45-2027-09-18','date'],['Phone: 09012345678 12:30:45-3.14','Phone: [contact omitted] 12:30:45-3.14','decimal'],['Phone: 09012345678 12:30:45-03-62165111 people 03-6216-8041','Phone: [contact omitted] 12:30:45-03-62165111 people [contact omitted]','unit'],['Phone: 09012345678 12:30:45-((03) 6216 8041)','Phone: [contact omitted] 12:30:45-([contact omitted])','wrapper'],['Phone: 09012345678 12:30:45-03-6216-8041 13:40:50 666-1212','Phone: [contact omitted] 12:30:45-[contact omitted] 13:40:50 666-1212','nonrenewal'],['Phone: 09012345678. 12:30:45-03-6216-8041','Phone: [contact omitted]. 12:30:45-03-6216-8041','sentence'],['Phone: 09012345678; 12:30:45-03-6216-8041','Phone: [contact omitted]; 12:30:45-03-6216-8041','semicolon'],['Phone: 09012345678 and 12:30:45-03-6216-8041','Phone: [contact omitted] and 12:30:45-03-6216-8041','conjunction'],['Phone: 09012345678\n12:30:45-03-6216-8041','Phone: [contact omitted]\n12:30:45-03-6216-8041','newline']])c(i,e,n);for(const n of[4095,4096,4097]){const i=`Archive ${'ID '.repeat(n)}09012345678`;c(i,i,`ID ${n}`)}c(`Phone ${'ID '.repeat(4096)}09012345678`,`Phone ${'ID '.repeat(4096)}[contact omitted]`,'bounded label');{const i=`Phone ${'ID '.repeat(4097)}09012345678`;c(i,i,'unproved label')}c(`Archive ${'ID '.repeat(4097)}09012345678 / 03-6216-8041`,`Archive ${'ID '.repeat(4097)}09012345678 / [contact omitted]`,'disjoint intrinsic');assert.equal(B('Phone: 09012345678 12:30:45-03-6216-8041'),'Phone: [contact omitted]:30:45-03-6216-8041');let k=0;const t=performance.now();outer:for(let z=0;z<10;z++)for(const a of['Phone: ','Archive '])for(const f of['09012345678','03-6216-8041','+81 90 1234 5678'])for(const q of['12:30','12:30:45','23:59:58'])for(const d of ds)for(const l of['03-6216-8041','050-12345678','090-1234-5678','+81 3 6216 5111','(03) 6216 8041']){c(`${a}${f} ${q}${d}${l}`,`${a}[contact omitted] ${q}${d}[contact omitted]`,'stress');if(++k===600)break outer}const ms=performance.now()-t;assert.equal(k,600);assert.ok(ms<5000);console.log(JSON.stringify({V89_TRANSITION_MATRIX_SUCCESS:true,cases:k,elapsed_ms:ms}))
EOF
node /tmp/v89-matrix.mjs "$BASE" "$PW/$LIB"

stage repaired-suites
suites "$PW"

stage main-transplant-release
mkdir -p "$C/tools/lib" "$C/test"; cp "$PW/$LIB" "$C/tools/lib/industrial-exhaust.mjs"; cp "$PW/$TEST" "$C/test/industrial-exhaust.test.js"; git worktree add --detach "$MW" "$MAIN"; eq main-worktree-lib "$(git -C "$MW" rev-parse "HEAD:$LIB")" "$MAIN_LIB"; eq main-worktree-test "$(git -C "$MW" rev-parse "HEAD:$TEST")" "$MAIN_TEST"; cp "$C/tools/lib/industrial-exhaust.mjs" "$MW/$LIB"; cp "$C/test/industrial-exhaust.test.js" "$MW/$TEST"; (cd "$MW"; eq transplant-paths "$(wpaths)" "$(ppaths)"; eq transplant-lib "$(git hash-object "$LIB")" "$CANDIDATE_LIB"; eq transplant-test "$(git hash-object "$TEST")" "$CANDIDATE_TEST"; git diff --check); node /tmp/v89-matrix.mjs "$BASE" "$MW/$LIB"; suites "$MW"; (cd "$MW"&&npm run release:check)

stage restore-construct-product
(cd "$MW"; git reset --hard "$MAIN"; git clean -fdx; cp "$C/tools/lib/industrial-exhaust.mjs" "$LIB"; cp "$C/test/industrial-exhaust.test.js" "$TEST"; eq final-paths "$(wpaths)" "$(ppaths)"; eq final-lib "$(git hash-object "$LIB")" "$CANDIDATE_LIB"; eq final-test "$(git hash-object "$TEST")" "$CANDIDATE_TEST"; git diff --check; git add "$LIB" "$TEST"; GIT_AUTHOR_NAME=BigBirdReturns GIT_AUTHOR_EMAIL=bigbirdreturns@proton.me GIT_COMMITTER_NAME=BigBirdReturns GIT_COMMITTER_EMAIL=bigbirdreturns@proton.me git commit -m "$MESSAGE"; git rev-parse HEAD >"$A/new-head.txt"; git rev-parse 'HEAD^{tree}' >"$A/new-tree.txt"; eq new-parent "$(git rev-parse HEAD^)" "$MAIN"; eq new-count "$(git rev-list --count "$MAIN..HEAD")" 1; eq new-paths "$(paths "$MAIN" HEAD)" "$(ppaths)"; eq new-lib "$(git rev-parse "HEAD:$LIB")" "$CANDIDATE_LIB"; eq new-test "$(git rev-parse "HEAD:$TEST")" "$CANDIDATE_TEST"; cp "$LIB" "$A/industrial-exhaust.mjs"; cp "$TEST" "$A/industrial-exhaust.test.js"; git show --binary --format=fuller HEAD >"$A/product-commit.patch")
cp "$PATCH" "$A/candidate-increment.patch"

stage final-leases-publication
eq controller-live "$(rh "$CONTROLLER_BRANCH")" "$CONTROLLER_HEAD"; eq main-live "$(rh "$MAIN_BRANCH")" "$MAIN"; eq product-live "$(rh "$PRODUCT_BRANCH")" "$PRODUCT"; git fetch --no-tags origin "+refs/heads/$MAIN_BRANCH:refs/remotes/origin/$MAIN_BRANCH" "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"; maincheck; productcheck; prcheck; N=$(cat "$A/new-head.txt"); T=$(cat "$A/new-tree.txt"); (cd "$MW"; git push origin "$N:refs/heads/$PRODUCT_BRANCH" "--force-with-lease=refs/heads/$PRODUCT_BRANCH:$PRODUCT"); git fetch --no-tags origin "+refs/heads/$PRODUCT_BRANCH:refs/remotes/origin/$PRODUCT_BRANCH"; eq published-head "$(rh "$PRODUCT_BRANCH")" "$N"; eq published-tree "$(git rev-parse "$N^{tree}")" "$T"; eq published-parent "$(git rev-parse "$N^")" "$MAIN"; eq published-lib "$(git rev-parse "$N:$LIB")" "$CANDIDATE_LIB"; eq published-test "$(git rev-parse "$N:$TEST")" "$CANDIDATE_TEST"; eq published-count "$(git rev-list --count "$MAIN..$N")" 1; eq published-paths "$(paths "$MAIN" "$N")" "$(ppaths)"; for i in {1..20};do H=$(gh api "repos/$REPO/pulls/$PR" --jq '.head.sha');[[ "$H" == "$N" ]]&&break;sleep 1;done;eq published-pr-head "$H" "$N"; eq published-pr-draft "$(gh api "repos/$REPO/pulls/$PR" --jq '.draft')" true; eq published-pr-state "$(gh api "repos/$REPO/pulls/$PR" --jq '.state')" open; eq published-pr-merged "$(gh api "repos/$REPO/pulls/$PR" --jq '.merged')" false
cat >"$A/object-receipt.txt" <<EOF
main_head=$MAIN
main_tree=$MAIN_TREE
predecessor_product=$PRODUCT
predecessor_parent=$PARENT
predecessor_tree=$PRODUCT_TREE
published_product=$N
published_parent=$MAIN
published_tree=$T
published_library_blob=$CANDIDATE_LIB
published_test_blob=$CANDIDATE_TEST
controller_head=$CONTROLLER_HEAD
controller_tree=$(cat "$A/controller-tree.txt")
patch_sha256=$PATCH_SHA
product_paths=$TEST,$LIB
product_pr_draft=true
product_pr_merged=false
EOF
(cd "$A"; find . -maxdepth 1 -type f ! -name receipt.txt ! -name MANIFEST.sha256 -print0|LC_ALL=C sort -z|xargs -0 sha256sum>MANIFEST.sha256)
printf '\nQUALIFICATION_SUCCESS\n'
