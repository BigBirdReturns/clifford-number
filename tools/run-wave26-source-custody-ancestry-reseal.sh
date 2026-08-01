#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-wave26-source-custody-repair'
base='8f6fcf160d3c5ac0824263513337d21645cbd57f'
trigger='.github/tmp/wave26-source-custody-ancestry-reseal-trigger.json'
temporary_workflow='.github/workflows/temporary-wave26-source-custody-ancestry-reseal.yml'
runner='tools/run-wave26-source-custody-ancestry-reseal.sh'

test -f "$trigger"
test ! -e "$temporary_workflow"
git merge-base --is-ancestor "$base" HEAD
original_sha="$(git rev-parse HEAD)"

python3 - <<'PY'
from pathlib import Path
path = Path('tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs')
text = path.read_text()
before = """function ancestryErrors(root, policy) {
  const errors = [];
  if (process.env.LAW26_SC_SKIP_GIT === '1') return errors;
  const checkpoint = policy.base_checkpoint.commit;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', checkpoint, 'HEAD'], { cwd: root, stdio: 'ignore' });
  } catch {
    fail(errors, checkpoint + ': repair base checkpoint is not an ancestor');
  }
  return errors;
}
"""
after = """function ancestryErrors(root, policy) {
  const errors = [];
  if (process.env.LAW26_SC_SKIP_GIT === '1') return errors;
  const checkpoint = policy.base_checkpoint.commit;
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
  let checkpointAvailable = hasCommit(checkpoint);
  let ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
  if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
    try {
      quietGit(['fetch', '--no-tags', '--depth=1000000', 'origin', '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef]);
    } catch {
      // Bounded recovery failure is reported below.
    }
    if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
    checkpointAvailable = hasCommit(checkpoint);
    ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
  }
  if (!checkpointAvailable) fail(errors, checkpoint + ': repair base checkpoint unavailable after targeted history recovery');
  else if (!ancestrySatisfied) fail(errors, checkpoint + ': repair base checkpoint is not an ancestor');
  return errors;
}
"""
if before not in text:
    raise SystemExit('repair ancestry marker absent')
path.write_text(text.replace(before, after))

method = Path('docs/methods/lake-allocator-war-wave26-source-custody-repair.md')
method_text = method.read_text()
marker = '## CI ancestry portability'
if marker not in method_text:
    method_text += """

## CI ancestry portability

The repair retains the exact required base checkpoint. In full-history repositories the validator tests that checkpoint directly against `HEAD`. In GitHub Actions pull-request jobs, a depth-one synthetic merge may omit the checkpoint object even when the feature branch descends from it. When direct validation cannot prove ancestry, the validator fetches only the exact `GITHUB_HEAD_REF` into an explicit remote-tracking reference with a bounded depth and reruns the unchanged `merge-base --is-ancestor` predicate against that branch tip. Missing history, failed recovery, or a recovered branch that does not descend from the checkpoint remains blocking.
"""
    method.write_text(method_text)
PY

node --check tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
rm -f "$trigger" "$temporary_workflow" "$runner"

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
  node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
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
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 26 source-custody ancestry reseal pass $pass"
done

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
  node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
  node test/lake-allocator-war-lead-execution-wave-24.test.js
  node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
  node test/lake-allocator-war-denominator-closure-wave-25.test.js
  node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
  node test/lake-allocator-war-targeted-closure-wave-26.test.js
  node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
  node test/lake-allocator-war-wave26-source-custody-repair.test.js
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 26 source-custody ancestry post-release pass $pass"
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
node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
node test/lake-allocator-war-lead-execution-wave-24.test.js
node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
node test/lake-allocator-war-denominator-closure-wave-25.test.js
node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
node test/lake-allocator-war-targeted-closure-wave-26.test.js
node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
node test/lake-allocator-war-wave26-source-custody-repair.test.js
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
git commit -m 'Repair source-custody ancestry portability'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
