#!/usr/bin/env bash
set -euo pipefail

branch='agent/allocator-war-estate-acquisition-wave-22'
base='ec730441e4779b24226f12f556707f4a89b7fe3f'
trigger='.github/tmp/wave22-explicit-head-ancestry-repair-trigger.json'
temporary_workflow='.github/workflows/temporary-wave22-explicit-head-ancestry-repair.yml'
runner='tools/run-wave22-explicit-head-ancestry-repair.sh'
validator='tools/validate-lake-allocator-war-estate-execution-wave-22.mjs'
method='docs/methods/lake-allocator-war-estate-execution-wave-22.md'

# The connector removes the temporary workflow before checkout.
test -f "$trigger"
test ! -e "$temporary_workflow"
test -f "$validator"
git merge-base --is-ancestor "$base" HEAD
original_sha="$(git rev-parse HEAD)"

node - <<'NODE'
const fs = require('node:fs');

const validatorPath = 'tools/validate-lake-allocator-war-estate-execution-wave-22.mjs';
let source = fs.readFileSync(validatorPath, 'utf8');
const before = `  if (process.env.LAW22_SKIP_GIT !== '1') {
    const baseCommit = policy.base_checkpoint.commit;
    const quietGit = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    const hasBaseCommit = () => {
      try {
        quietGit(['cat-file', '-e', baseCommit + '^{commit}']);
        return true;
      } catch {
        return false;
      }
    };

    let baseAvailable = hasBaseCommit();
    if (!baseAvailable) {
      let shallow = false;
      try {
        shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim() === 'true';
      } catch {
        shallow = false;
      }

      if (shallow && process.env.GITHUB_ACTIONS === 'true') {
        try {
          quietGit(['fetch', '--no-tags', '--unshallow', 'origin']);
        } catch {
          // The availability check below records a bounded recovery failure.
        }
        baseAvailable = hasBaseCommit();
      }
    }

    if (!baseAvailable) {
      fail(errors, 'Wave 22 base checkpoint unavailable after shallow-history recovery');
    } else {
      try {
        quietGit(['merge-base', '--is-ancestor', baseCommit, 'HEAD']);
      } catch {
        fail(errors, 'Wave 22 base checkpoint is not an ancestor');
      }
    }
  }`;
const after = `  if (process.env.LAW22_SKIP_GIT !== '1') {
    const baseCommit = policy.base_checkpoint.commit;
    const quietGit = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    const hasCommit = commitish => {
      try {
        quietGit(['cat-file', '-e', commitish + '^{commit}']);
        return true;
      } catch {
        return false;
      }
    };

    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';
    let baseAvailable = hasCommit(baseCommit);

    if (!baseAvailable && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        quietGit([
          'fetch',
          '--no-tags',
          'origin',
          '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef
        ]);
      } catch {
        // The availability check below records a bounded targeted-recovery failure.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      baseAvailable = hasCommit(baseCommit);
    }

    if (!baseAvailable) {
      fail(errors, 'Wave 22 base checkpoint unavailable after explicit head-ref recovery');
    } else {
      try {
        quietGit(['merge-base', '--is-ancestor', baseCommit, ancestryTarget]);
      } catch {
        fail(errors, 'Wave 22 base checkpoint is not an ancestor');
      }
    }
  }`;
if (!source.includes(before)) throw new Error('Wave 22 shallow ancestry block marker missing');
source = source.replace(before, after);
fs.writeFileSync(validatorPath, source);

const methodPath = 'docs/methods/lake-allocator-war-estate-execution-wave-22.md';
let method = fs.readFileSync(methodPath, 'utf8');
const oldParagraph = 'Ancestry validation distinguishes an unavailable commit object from failed ancestry. In a shallow GitHub Actions checkout, the validator recovers remote history and then reruns the same merge-base ancestry test. A non-shallow missing checkpoint, failed recovery, or a recovered non-ancestor remains blocking.';
const newParagraph = 'Ancestry validation distinguishes an unavailable commit object from failed ancestry. In a depth-one GitHub pull-request merge checkout, the validator fetches `GITHUB_HEAD_REF` into an explicit remote-tracking ref and reruns the same merge-base ancestry test against that recovered feature-branch tip. A checkpoint missing after targeted recovery or a recovered non-ancestor remains blocking.';
if (!method.includes(oldParagraph)) throw new Error('Wave 22 ancestry method marker missing');
method = method.replace(oldParagraph, newParagraph);
fs.writeFileSync(methodPath, method);
NODE

rm -f "$trigger" "$temporary_workflow" "$runner"
node --check "$validator"
git add -A
git diff --check

# Validate all ordinary products on the repaired source before resealing the lake.
npm run release:check
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-index.mjs
  node tools/stabilize-lake-index.mjs
  node tools/stabilize-lake-generator-contracts-wave-19.mjs
  node tools/reconcile-lake-receipt-semantics.mjs
  node tools/stabilize-lake-receipt-custody-wave-20.mjs
  node tools/stabilize-lake-allocator-war-wave-21.mjs
  node tools/build-lake-gap-summary.mjs
  node tools/validate-lake-index.mjs
  node tools/validate-lake-receipt-semantics.mjs
  node tools/validate-lake-gap-summary.mjs
  node tools/reconcile-lake-identifier-topology-wave-18.mjs
  node tools/reconcile-lake-generator-contracts-wave-19.mjs
  node tools/reconcile-lake-receipt-custody-wave-20.mjs
  node tools/reconcile-lake-allocator-war-wave-21.mjs
  LAW22_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 22 explicit-head ancestry seal pass $pass"
done

node tools/shard-lake-index.mjs
node tools/validate-lake-index-shards.mjs
node tools/build-lake-basin-index.mjs
node tools/validate-lake-basin-index.mjs
node tools/validate-lake-residual-frontier-wave-17.mjs
node test/lake-residual-frontier-wave-17.test.js
node tools/validate-lake-identifier-topology-wave-18.mjs
node test/lake-identifier-topology-wave-18.test.js
node tools/validate-lake-generator-contracts-wave-19.mjs
node test/lake-generator-contracts-wave-19.test.js
node tools/validate-lake-receipt-custody-wave-20.mjs
node test/lake-receipt-custody-wave-20.test.js
node tools/validate-lake-allocator-war-wave-21.mjs
node test/lake-allocator-war-wave-21.test.js
node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node test/lake-allocator-war-estate-execution-wave-22.test.js

git add -A
git diff --cached --check
staged_tree="$(git write-tree)"

git restore --worktree .
git clean -fd
node tools/validate-lake-index-shards.mjs
node tools/validate-lake-basin-index.mjs
node tools/validate-lake-residual-frontier-wave-17.mjs
node tools/validate-lake-identifier-topology-wave-18.mjs
node tools/validate-lake-generator-contracts-wave-19.mjs
node tools/validate-lake-receipt-custody-wave-20.mjs
node tools/validate-lake-allocator-war-wave-21.mjs
node test/lake-allocator-war-wave-21.test.js
node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node test/lake-allocator-war-estate-execution-wave-22.test.js
git add -A
git diff --cached --check
git diff --quiet
current_tree="$(git write-tree)"
if [[ "$current_tree" != "$staged_tree" ]]; then
  git diff --name-status "$staged_tree" "$current_tree"
  exit 1
fi

test ! -e "$trigger"
test ! -e "$temporary_workflow"
test ! -e "$runner"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git diff --cached --check
test "$(git write-tree)" = "$staged_tree"
git commit -m 'Recover PR head before Wave 22 ancestry judgment'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
