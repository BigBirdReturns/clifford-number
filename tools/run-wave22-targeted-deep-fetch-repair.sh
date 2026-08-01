#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-lead-acquisition-wave-23'
base='28328956d9b0d413555629aaafa093a2c6a83195'
trigger='.github/tmp/wave22-targeted-deep-fetch-repair-trigger.json'
temporary_workflow='.github/workflows/temporary-wave22-targeted-deep-fetch-repair.yml'
runner='tools/run-wave22-targeted-deep-fetch-repair.sh'

# The connector removes the temporary repair workflow before checkout.
test -f "$trigger"
test ! -e "$temporary_workflow"
git merge-base --is-ancestor "$base" HEAD
original_sha="$(git rev-parse HEAD)"

node - <<'NODE'
const fs = require('node:fs');

function replaceBlock(path, startMarker, endMarker, replacement) {
  let source = fs.readFileSync(path, 'utf8');
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(path + ': ancestry block start marker missing');
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(path + ': ancestry block end marker missing');
  source = source.slice(0, start) + replacement + source.slice(end);
  fs.writeFileSync(path, source);
}

function ancestryBlock(skipVariable, unavailableMessage, nonAncestorMessage) {
  return `  if (process.env.${skipVariable} !== '1') {
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
    const isAncestor = (ancestor, target) => {
      try {
        quietGit(['merge-base', '--is-ancestor', ancestor, target]);
        return true;
      } catch {
        return false;
      }
    };

    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';
    let baseAvailable = hasCommit(baseCommit);
    let ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);

    if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        quietGit([
          'fetch',
          '--no-tags',
          '--depth=1000000',
          'origin',
          '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef
        ]);
      } catch {
        // The availability and ancestry checks below record bounded recovery failure.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      baseAvailable = hasCommit(baseCommit);
      ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);
    }

    if (!baseAvailable) {
      fail(errors, '${unavailableMessage}');
    } else if (!ancestrySatisfied) {
      fail(errors, '${nonAncestorMessage}');
    }
  }`;
}

replaceBlock(
  'tools/validate-lake-allocator-war-estate-execution-wave-22.mjs',
  "  if (process.env.LAW22_SKIP_GIT !== '1') {",
  "\n\n  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {",
  ancestryBlock(
    'LAW22_SKIP_GIT',
    'Wave 22 base checkpoint unavailable after targeted deep-history recovery',
    'Wave 22 base checkpoint is not an ancestor'
  )
);

replaceBlock(
  'tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs',
  "  if (process.env.LAW23_SKIP_GIT !== '1') {",
  "\n\n  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {",
  ancestryBlock(
    'LAW23_SKIP_GIT',
    'Wave 23 base checkpoint unavailable after targeted deep-history recovery',
    'Wave 23 base checkpoint is not an ancestor'
  )
);

const methodUpdates = [
  {
    path: 'docs/methods/lake-allocator-war-estate-execution-wave-22.md',
    before: 'Ancestry validation distinguishes an unavailable commit object from failed ancestry. In a depth-one GitHub pull-request merge checkout, the validator performs a targeted `--unshallow` fetch of `GITHUB_HEAD_REF` into an explicit remote-tracking ref, then reruns the same merge-base ancestry test against that recovered feature-branch tip. This recovers ancestry across descendant feature branches while preserving the original predicate. A checkpoint missing after targeted full-history recovery or a recovered non-ancestor remains blocking.',
    after: 'Ancestry validation distinguishes an unavailable commit object from failed ancestry. Wave 21 custody checks may add several independent depth-one boundaries to a pull-request checkout, which makes `--unshallow` fail because the shallow file changes during recovery. The validator therefore retries only when the initial predicate cannot be proved, fetching `GITHUB_HEAD_REF` into an explicit remote-tracking ref at depth 1,000,000 and rerunning the same merge-base ancestry test against that recovered feature-branch tip. The repository may remain formally shallow, but the complete head-to-checkpoint path is present. A checkpoint missing after targeted deep-history recovery or a recovered non-ancestor remains blocking.'
  },
  {
    path: 'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',
    before: 'Ancestry validation is portable across full-history checkouts and depth-one pull-request merge checkouts. In GitHub Actions, the validator performs a targeted `--unshallow` fetch of `GITHUB_HEAD_REF` into an explicit remote-tracking ref and tests the same ancestry predicate against that recovered feature-branch tip. This remains valid when Wave 23 is itself a descendant of an earlier feature merge. Missing ancestry after targeted full-history recovery and genuine non-ancestry remain blocking.',
    after: 'Ancestry validation is portable across full-history checkouts and pull-request checkouts carrying several depth-one custody boundaries. The validator first tests the declared predicate without fetching. When that proof is unavailable, it fetches `GITHUB_HEAD_REF` into an explicit remote-tracking ref at depth 1,000,000 and tests the same ancestry predicate against the recovered feature-branch tip. This avoids the multi-boundary `--unshallow` failure while restoring the complete head-to-checkpoint path. Missing ancestry after targeted deep-history recovery and genuine non-ancestry remain blocking.'
  }
];
for (const update of methodUpdates) {
  let source = fs.readFileSync(update.path, 'utf8');
  if (!source.includes(update.before)) throw new Error(update.path + ': ancestry method marker missing');
  source = source.replace(update.before, update.after);
  fs.writeFileSync(update.path, source);
}
NODE

rm -f \
  .github/workflows/temporary-wave22-post-wave21-fetch-diagnostic.yml \
  .github/tmp/wave22-post-wave21-fetch-diagnostic-trigger.json \
  "$trigger" \
  "$temporary_workflow" \
  "$runner"

node --check tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node --check tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node test/lake-allocator-war-estate-execution-wave-22.test.js
node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
node test/lake-allocator-war-lead-acquisition-wave-23.test.js
git add -A
git diff --check

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
  LAW23_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
  git add -A
}

validate_epoch() {
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
  node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
  node test/lake-allocator-war-lead-acquisition-wave-23.test.js
  git add -A
  git diff --cached --check
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 22 targeted deep-fetch repair pass $pass"
done
validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 22 targeted deep-fetch post-release seal pass $pass"
done
validate_epoch

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
node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
node test/lake-allocator-war-lead-acquisition-wave-23.test.js
git add -A
git diff --cached --check
git diff --quiet
current_tree="$(git write-tree)"
if [[ "$current_tree" != "$staged_tree" ]]; then
  git diff --name-status "$staged_tree" "$current_tree"
  exit 1
fi

test ! -e .github/workflows/temporary-wave22-post-wave21-fetch-diagnostic.yml
test ! -e .github/tmp/wave22-post-wave21-fetch-diagnostic-trigger.json
test ! -e "$trigger"
test ! -e "$temporary_workflow"
test ! -e "$runner"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git diff --cached --check
test "$(git write-tree)" = "$staged_tree"
git commit -m 'Recover bounded descendant history after custody fetches'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
