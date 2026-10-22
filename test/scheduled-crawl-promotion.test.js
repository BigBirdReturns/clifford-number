#!/usr/bin/env node
// Contract for the two manually dispatched crawl workflows and their shared
// pull-request helper: they may open a pull request, and nothing else.
// They must never merge, approve, enable auto-merge, dispatch another workflow,
// push main, or change branch policy.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const paths = {
  industrial: '.github/workflows/crawl-industrial-exhaust.yml',
  official: '.github/workflows/crawl-official.yml',
  helper: '.github/scripts/promote-scheduled-crawl.sh',
  recovery: '.github/scripts/retain-scheduled-crawl-candidate.sh'
};

const load = () => Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, readFileSync(path, 'utf8')])
);

function requireMatch(errors, text, pattern, message) {
  if (!pattern.test(text)) errors.push(message);
}

function requireAbsent(errors, text, pattern, message) {
  if (pattern.test(text)) errors.push(message);
}

function requireOrdered(errors, text, markers, message) {
  let cursor = -1;
  for (const marker of markers) {
    const index = text.indexOf(marker, cursor + 1);
    if (index < 0 || index <= cursor) {
      errors.push(message);
      return;
    }
    cursor = index;
  }
}

const stripComments = (text) => text.replace(/^[ \t]*#.*$/gm, '');

function triggers(workflow) {
  const block = workflow.match(/^on:\n((?:(?: {2}.*|#.*)?\n)*)/m)?.[1] ?? '';
  return [...block.matchAll(/^ {2}([a-z_]+):/gm)].map((match) => match[1]);
}

function jobPermissions(workflow) {
  const block = workflow.match(/^ {4}permissions:\n((?: {6}.*\n)+)/m)?.[1] ?? '';
  return block
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => line.trim())
    .sort();
}

export function validateCrawlPullRequestContract(files) {
  const errors = [];

  for (const [label, workflow, kind] of [
    ['industrial-exhaust workflow', files.industrial, 'industrial-exhaust'],
    ['official-record workflow', files.official, 'official-record']
  ]) {
    if (JSON.stringify(triggers(workflow)) !== JSON.stringify(['workflow_dispatch'])) {
      errors.push(`${label} must be workflow_dispatch only`);
    }
    requireMatch(errors, workflow, /^permissions:\n {2}contents: read\n/m, `${label} must default to read-only contents`);
    if (JSON.stringify(jobPermissions(workflow)) !== JSON.stringify(['contents: write', 'pull-requests: write'])) {
      errors.push(`${label} crawl job must carry exactly contents: write (candidate branch) and pull-requests: write`);
    }
    requireAbsent(errors, workflow, /^\s+(?:actions|checks|statuses|issues|pages|id-token|packages|deployments): write\s*$/m, `${label} must not hold any other write scope`);
    requireMatch(errors, workflow, /group: crawl-candidate-pull-request\n/, `${label} must share the serialized crawl concurrency group`);
    requireMatch(errors, workflow, /cancel-in-progress: false/, `${label} must not cancel a running crawl`);
    requireMatch(errors, workflow, /ref: main\n {10}fetch-depth: 0/, `${label} must crawl from a full-history main checkout`);
    requireMatch(errors, workflow, new RegExp(`PROMOTION_KIND: ${kind.replace('-', '\\-')}\\n`), `${label} must bind the exact promotion kind`);
    requireMatch(errors, workflow, /run: bash \.github\/scripts\/promote-scheduled-crawl\.sh/, `${label} must invoke the common pull-request helper`);
    requireMatch(errors, workflow, /- name: Retain exact candidate recovery bundle\n {8}if: always\(\)\n {8}run: bash \.github\/scripts\/retain-scheduled-crawl-candidate\.sh/, `${label} must retain the exact candidate bundle`);
    requireMatch(errors, workflow, /uses: actions\/upload-artifact@v4/, `${label} must retain a promotion receipt`);
    requireMatch(errors, workflow, /path: \$\{\{ runner\.temp \}\}\/scheduled-crawl-promotion-receipt/, `${label} must upload the exact receipt directory`);
    requireMatch(errors, workflow, /PROMOTION_STEP_OUTCOME: \$\{\{ steps\.promote\.outcome \}\}/, `${label} must expose the helper outcome to the terminal gate`);
    requireMatch(errors, workflow, /run: test "\$PROMOTION_STEP_OUTCOME" = success/, `${label} must fail the workflow when the helper fails`);
    requireAbsent(errors, workflow, /git push(?:\s|$)/, `${label} must not push anything directly inside the workflow`);
    requireAbsent(errors, workflow, /git pull --rebase/, `${label} must not rebase generated intake over a moved main`);
    requireAbsent(errors, stripComments(workflow), /gh pr |gh workflow|gh run |\/merge\b|actions\/workflows|dispatches|--approve|APPROVE|[Aa]uto-?[Mm]erge/, `${label} must not merge, approve, auto-merge, or dispatch anything`);
    requireOrdered(errors, workflow, [
      'run: bash .github/scripts/promote-scheduled-crawl.sh',
      'run: bash .github/scripts/retain-scheduled-crawl-candidate.sh',
      'uses: actions/upload-artifact@v4'
    ], `${label} must bundle the candidate before uploading the receipt`);
  }

  const helper = files.helper;
  requireMatch(errors, helper, /^#!\/usr\/bin\/env bash\nset -Eeuo pipefail\n/, 'helper must use strict Bash error handling');
  requireMatch(errors, helper, /industrial-exhaust\)[\s\S]*ALLOWED_ROOTS=\('data\/exhaust' 'receipts\/exhaust'\)/, 'industrial-exhaust pull request must be limited to its two intake roots');
  requireMatch(errors, helper, /official-record\)[\s\S]*ALLOWED_ROOTS=\('data\/crawl' 'receipts\/crawl'\)/, 'official-record pull request must be limited to its two intake roots');
  requireMatch(errors, helper, /CANDIDATE_BRANCH="automation-crawl-\$\{SLUG\}-run-\$\{RUN_ID\}-\$\{RUN_ATTEMPT\}"/, 'candidate branch must be unique to workflow run and attempt');
  requireMatch(errors, helper, /BASE_SHA="\$\(git rev-parse HEAD\)"/, 'helper must lease the exact checked-out base SHA');
  const mainLeaseAssertions = helper.match(/test "\$\(git rev-parse origin\/main\)" = "\$BASE_SHA"/g) || [];
  if (mainLeaseAssertions.length < 2) errors.push('helper must refuse a moved main before candidate construction and again before publication');
  requireMatch(errors, helper, /test "\$\(git rev-parse "\$CANDIDATE_SHA\^"\)" = "\$BASE_SHA"/, 'candidate must be one direct child of the leased base');
  requireMatch(errors, helper, /git diff --no-renames --name-only -z HEAD --/, 'worktree path census must expand renames into both paths');
  requireMatch(errors, helper, /git diff-tree --no-commit-id --no-renames --name-only -r -z/, 'commit path census must expand renames into both paths');
  requireMatch(errors, helper, /previous_filename \/\/ empty/, 'remote comparison must include a renamed source path');
  requireMatch(errors, helper, /\.status == "ahead" and \.ahead_by == 1 and \.behind_by == 0 and \.total_commits == 1/, 'remote comparison must remain exactly one commit ahead and zero behind');
  requireMatch(errors, helper, /assert_paths_allowed 'remote comparison'/, 'remote comparison must be held to the intake roots');
  requireMatch(errors, helper, /if \[\[ "\$OPEN_CRAWLER_COUNT" -gt 0 \]\]; then[\s\S]*blocked_by_open_crawler_candidate/, 'helper must refuse a second open crawler candidate');
  requireMatch(errors, helper, /OUTCOME='pull_request_opened'/, 'a successful run must end with an open pull request');
  requireMatch(errors, helper, /remote_candidate" == "\$CANDIDATE_SHA"/, 'cleanup may delete a candidate ref only while it retains the leased SHA');
  requireMatch(errors, helper, /cleanup-branch-refused\.txt/, 'cleanup must record and refuse a moved candidate ref');

  const pushes = helper.match(/^\s*(?:\S+\s+)?git push[^\n]*$/gm) || [];
  for (const push of pushes) {
    const publishes = /git push origin "\$CANDIDATE_SHA:refs\/heads\/\$CANDIDATE_BRANCH"$/.test(push.trim());
    const retires = /git push --force-with-lease="refs\/heads\/\$CANDIDATE_BRANCH:\$CANDIDATE_SHA" \\?$/.test(push.trim());
    if (!publishes && !retires) errors.push(`helper may push only its own run-scoped candidate branch: ${push.trim()}`);
  }
  if (!pushes.some((push) => /git push origin "\$CANDIDATE_SHA:refs\/heads\/\$CANDIDATE_BRANCH"$/.test(push.trim()))) {
    errors.push('helper must publish the run-scoped candidate branch');
  }

  const apiCalls = helper.split('\n').filter((line) => /gh api[^\n]*--method/.test(line));
  const allowedCalls = [
    /^gh api --method POST "repos\/\$REPO\/pulls" --input - <<< "\$PR_PAYLOAD" \\$/,
    /^gh api --method PATCH "repos\/\$REPO\/pulls\/\$PR_NUMBER" -f state=closed \\$/
  ];
  for (const call of apiCalls) {
    if (!allowedCalls.some((pattern) => pattern.test(call.trim()))) {
      errors.push(`helper may only open a pull request or close its own failed one: ${call.trim()}`);
    }
  }
  if (apiCalls.length !== 2) errors.push('helper must make exactly two mutating API calls: open and (on failure) close');

  const helperCode = stripComments(helper);
  requireAbsent(errors, helperCode, /--method (?:PUT|DELETE)|\/merge\b|merge_method|enable_pull_request_automerge|[Aa]uto-?[Mm]erge|\/reviews|--approve|APPROVE/, 'helper must never merge, approve, or auto-merge');
  requireAbsent(errors, helperCode, /dispatches|actions\/workflows|actions\/runs|gh workflow|gh run |gh pr /, 'helper must never dispatch or poll another workflow');
  requireAbsent(errors, helperCode, /git push[^\n]*(?:refs\/heads\/main|\s+main(?=\s|$)|:main(?=\s|$))/, 'helper must never push main');
  requireAbsent(errors, helperCode, /branches\/main\/protection|repos\/\$REPO\/rulesets/, 'helper must not mutate branch policy');
  requireAbsent(errors, helperCode, /inspect-scheduled-crawl-admission|resume-scheduled-crawl-admission|watch-scheduled-crawl-admission/, 'helper must not call the removed auto-merge watchers');

  const recovery = files.recovery;
  requireMatch(errors, recovery, /^#!\/usr\/bin\/env bash\nset -Eeuo pipefail\n/, 'candidate recovery custodian must use strict Bash error handling');
  requireMatch(errors, recovery, /CHECKPOINT="\$RECEIPT_DIR\/checkpoint\.txt"/, 'candidate recovery must consume the helper checkpoint');
  requireMatch(errors, recovery, /BASE_SHA="\$\(checkpoint_value base_sha\)"/, 'candidate recovery must bind the checkpoint base SHA');
  requireMatch(errors, recovery, /CANDIDATE_SHA="\$\(checkpoint_value candidate_sha\)"/, 'candidate recovery must bind the checkpoint candidate SHA');
  requireMatch(errors, recovery, /git cat-file -e "\$BASE_SHA\^\{commit\}"[\s\S]*git cat-file -e "\$CANDIDATE_SHA\^\{commit\}"/, 'candidate recovery must require both commit objects');
  requireMatch(errors, recovery, /test "\$\(git rev-parse HEAD\)" = "\$CANDIDATE_SHA"/, 'candidate recovery must bind local HEAD to the checkpoint candidate');
  requireMatch(errors, recovery, /test "\$\(git rev-parse "\$CANDIDATE_SHA\^"\)" = "\$BASE_SHA"/, 'candidate recovery must authenticate direct-parent topology');
  requireMatch(errors, recovery, /git bundle create "\$BUNDLE" HEAD "\^\$BASE_SHA"/, 'candidate recovery must create a base-bound Git bundle');
  requireMatch(errors, recovery, /git bundle verify "\$BUNDLE"/, 'candidate recovery must verify the emitted bundle');
  requireMatch(errors, recovery, /BUNDLE_SHA256="\$\(sha256sum(?: <)? "\$BUNDLE" \| awk '\{print \$1\}'\)"/, 'candidate recovery must digest the exact bundle bytes');
  requireMatch(errors, recovery, /restore_hint=git fetch candidate\.bundle HEAD:refs\/heads\/recovered-scheduled-crawl/, 'candidate recovery must publish an executable restore hint');
  requireAbsent(errors, recovery, /gh api|git push/, 'candidate recovery must remain local and read-only with respect to GitHub');
  requireAbsent(errors, recovery, /branches\/main\/protection|repos\/\$REPO\/rulesets/, 'candidate recovery must not mutate branch policy');

  return errors;
}

const canonical = load();
assert.deepEqual(validateCrawlPullRequestContract(canonical), [], 'canonical crawl pull-request contract must validate');

const mutations = [
  ['re-add a schedule trigger', (c) => { c.official = c.official.replace('on:\n  workflow_dispatch:', "on:\n  schedule:\n    - cron: '0 6 * * *'\n  workflow_dispatch:"); }],
  ['re-add a pull_request trigger', (c) => { c.industrial = c.industrial.replace('on:\n  workflow_dispatch:', 'on:\n  pull_request:\n  workflow_dispatch:'); }],
  ['reintroduce a direct workflow push', (c) => { c.official += '\n      - run: git push origin main\n'; }],
  ['restore actions dispatch authority', (c) => { c.industrial = c.industrial.replace('      contents: write\n', '      actions: write\n      contents: write\n'); }],
  ['drop pull-request authority', (c) => { c.official = c.official.replace('      pull-requests: write\n', ''); }],
  ['grant a wider contents scope at job level', (c) => { c.official = c.official.replace('      contents: write\n      pull-requests: write\n', '      contents: write\n      pull-requests: write\n      issues: write\n'); }],
  ['split the crawler concurrency lock', (c) => { c.official = c.official.replace('crawl-candidate-pull-request', 'official-only'); }],
  ['allow shallow candidate ancestry', (c) => { c.industrial = c.industrial.replace('          fetch-depth: 0', '          fetch-depth: 1'); }],
  ['misbind the official promotion kind', (c) => { c.official = c.official.replace('PROMOTION_KIND: official-record', 'PROMOTION_KIND: industrial-exhaust'); }],
  ['add a gh pr merge step', (c) => { c.official += '\n      - run: gh pr merge --merge 1\n'; }],
  ['add a workflow dispatch call', (c) => { c.industrial += '\n      - run: gh api -X POST repos/o/r/actions/workflows/ci.yml/dispatches -f ref=main\n'; }],
  ['broaden industrial intake roots', (c) => { c.helper = c.helper.replace("ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')", "ALLOWED_ROOTS=('data' 'receipts')"); }],
  ['drop run-attempt branch uniqueness', (c) => { c.helper = c.helper.replace('-${RUN_ATTEMPT}"', '"'); }],
  ['remove exact-main lease refusal', (c) => { c.helper = c.helper.replaceAll('test "$(git rev-parse origin/main)" = "$BASE_SHA"', 'true # main lease removed'); }],
  ['drop duplicate pending-candidate refusal', (c) => { c.helper = c.helper.replace('if [[ "$OPEN_CRAWLER_COUNT" -gt 0 ]]; then', 'if false; then'); }],
  ['allow worktree rename collapse', (c) => { c.helper = c.helper.replace('git diff --no-renames --name-only -z HEAD --', 'git diff --name-only -z HEAD --'); }],
  ['allow commit rename collapse', (c) => { c.helper = c.helper.replace('git diff-tree --no-commit-id --no-renames --name-only -r -z', 'git diff-tree --no-commit-id --name-only -r -z'); }],
  ['omit remote renamed source path', (c) => { c.helper = c.helper.replace('(.previous_filename // empty)', '(empty)'); }],
  ['weaken remote one-commit topology', (c) => { c.helper = c.helper.replace('and .ahead_by == 1 and .behind_by == 0 and .total_commits == 1', 'and .ahead_by >= 1'); }],
  ['push the base branch', (c) => { c.helper += '\ngit push origin "$CANDIDATE_SHA:refs/heads/main"\n'; }],
  ['merge the pull request', (c) => { c.helper += '\ngh api --method PUT "repos/$REPO/pulls/$PR_NUMBER/merge" --input - <<< \'{}\'\n'; }],
  ['approve the pull request', (c) => { c.helper += '\ngh api --method POST "repos/$REPO/pulls/$PR_NUMBER/reviews" -f event=APPROVE\n'; }],
  ['dispatch a check workflow', (c) => { c.helper += '\ngh api --method POST "repos/$REPO/actions/workflows/ci.yml/dispatches" -f ref="$CANDIDATE_BRANCH"\n'; }],
  ['enable auto-merge', (c) => { c.helper += '\ngh pr merge "$PR_NUMBER" --auto --merge\n'; }],
  ['call the removed watcher', (c) => { c.helper += '\nnode .github/scripts/watch-scheduled-crawl-admission.mjs\n'; }],
  ['delete a moved candidate ref', (c) => { c.helper = c.helper.replace('if [[ "$remote_candidate" == "$CANDIDATE_SHA" ]]; then', 'if [[ -n "$remote_candidate" ]]; then'); }],
  ['let the helper mutate policy', (c) => { c.helper += '\ngh api "repos/$REPO/branches/main/protection"\n'; }],
  ['drop the recovery custodian', (c) => {
    c.industrial = c.industrial.replace('      - name: Retain exact candidate recovery bundle\n        if: always()\n        run: bash .github/scripts/retain-scheduled-crawl-candidate.sh\n', '');
  }],
  ['remove recovery direct-parent authentication', (c) => {
    c.recovery = c.recovery.replace('test "$(git rev-parse "$CANDIDATE_SHA^")" = "$BASE_SHA"', 'true # parent binding removed');
  }],
  ['replace exact bundle digest with a constant', (c) => {
    c.recovery = c.recovery.replace('BUNDLE_SHA256="$(sha256sum < "$BUNDLE" | awk \'{print $1}\')"', 'BUNDLE_SHA256=unverified');
  }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(canonical);
  mutate(candidate);
  const errors = validateCrawlPullRequestContract(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

function git(cwd, args, env = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
}

function gitPaths(cwd, args) {
  return execFileSync('git', args, { cwd }).toString('utf8').split('\0').filter(Boolean).sort();
}

function verifyRenamePathExpansionFixture() {
  const root = mkdtempSync(join(tmpdir(), 'crawl-rename-'));
  try {
    mkdirSync(join(root, 'data', 'crawl'), { recursive: true });
    git(root, ['init', '-q']);
    git(root, ['config', 'user.name', 'crawl-test']);
    git(root, ['config', 'user.email', 'crawl-test@example.invalid']);
    writeFileSync(join(root, 'graph.json'), '{}\n');
    git(root, ['add', 'graph.json']);
    git(root, ['commit', '-q', '-m', 'base']);
    git(root, ['mv', 'graph.json', 'data/crawl/state.json']);
    assert.deepEqual(gitPaths(root, ['diff', '--no-renames', '--name-only', '-z', 'HEAD', '--']),
      ['data/crawl/state.json', 'graph.json']);
    git(root, ['commit', '-q', '-am', 'rename']);
    assert.deepEqual(gitPaths(root, ['diff-tree', '--no-commit-id', '--no-renames', '--name-only', '-r', '-z', 'HEAD']),
      ['data/crawl/state.json', 'graph.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function verifyRecoveryBundleFixture() {
  const root = mkdtempSync(join(tmpdir(), 'crawl-recovery-'));
  try {
    const workspace = join(root, 'workspace');
    const runnerTemp = join(root, 'runner');
    const receiptDir = join(runnerTemp, 'scheduled-crawl-promotion-receipt');
    mkdirSync(workspace, { recursive: true });
    mkdirSync(receiptDir, { recursive: true });

    git(workspace, ['init', '-q']);
    git(workspace, ['config', 'user.name', 'crawl-test']);
    git(workspace, ['config', 'user.email', 'crawl-test@example.invalid']);
    writeFileSync(join(workspace, 'state.txt'), 'base\n');
    git(workspace, ['add', 'state.txt']);
    git(workspace, ['commit', '-q', '-m', 'base']);
    const baseSha = git(workspace, ['rev-parse', 'HEAD']);

    writeFileSync(join(workspace, 'state.txt'), 'candidate\n');
    git(workspace, ['commit', '-q', '-am', 'candidate']);
    const candidateSha = git(workspace, ['rev-parse', 'HEAD']);

    writeFileSync(join(receiptDir, 'checkpoint.txt'), [
      'outcome=failed_closed',
      `base_sha=${baseSha}`,
      `candidate_sha=${candidateSha}`,
      ''
    ].join('\n'));

    execFileSync('bash', [join(process.cwd(), paths.recovery)], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GITHUB_WORKSPACE: workspace,
        RUNNER_TEMP: runnerTemp
      },
      stdio: 'pipe'
    });

    const bundle = join(receiptDir, 'candidate.bundle');
    const heads = git(workspace, ['bundle', 'list-heads', bundle]);
    assert.equal(heads, `${candidateSha} HEAD`, 'bundle must retain the exact candidate HEAD');
    git(workspace, ['bundle', 'verify', bundle]);

    const digestLine = readFileSync(join(receiptDir, 'candidate-bundle.sha256'), 'utf8').trim();
    const [recordedDigest, recordedName] = digestLine.split(/\s+/);
    const computedDigest = createHash('sha256').update(readFileSync(bundle)).digest('hex');
    assert.equal(recordedName, 'candidate.bundle', 'digest receipt must name the exact bundle');
    assert.equal(recordedDigest, computedDigest, 'digest receipt must bind the exact bundle bytes');

    const bundleReceipt = readFileSync(join(receiptDir, 'candidate-bundle.txt'), 'utf8');
    assert.match(bundleReceipt, new RegExp(`base_sha=${baseSha}`));
    assert.match(bundleReceipt, new RegExp(`candidate_sha=${candidateSha}`));
    assert.match(bundleReceipt, new RegExp(`bundle_sha256=${computedDigest}`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// Fake GitHub CLI: answers only the read calls and the single pull-request
// creation the helper is allowed to make, and logs every invocation. Any other
// endpoint exits 99 so an unexpected merge, dispatch, or review cannot succeed.
const FAKE_GH = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
[[ "\${1:-}" == api ]] || { echo "unexpected gh subcommand: $*" >&2; exit 99; }
shift
method=GET; target=''; jqexpr=''
while (($#)); do
  case "$1" in
    --method) method="$2"; shift 2 ;;
    --jq) jqexpr="$2"; shift 2 ;;
    --input) cat > /dev/null; shift 2 ;;
    --paginate|--slurp) shift ;;
    -f|-H) shift 2 ;;
    *) target="$1"; shift ;;
  esac
done
remote() { git --git-dir="$FAKE_REMOTE" "$@"; }
branch='automation-crawl-official-record-run-1-1'
emit() { if [[ -n "$jqexpr" ]]; then jq -r "$jqexpr" <<< "$1"; else printf '%s\\n' "$1"; fi; }
pull() {
  jq -n --arg head "$(remote rev-parse "refs/heads/$branch")" --arg base "$(remote rev-parse refs/heads/main)" \\
    '{number: 7, state: "open", draft: false, merged: false, html_url: "https://example.invalid/pull/7", head: {sha: $head}, base: {sha: $base}}'
}
case "$method $target" in
  "GET repos/o/r/pulls?state=open&base=main&per_page=100")
    if [[ "\${FAKE_OPEN_CRAWLER_PR:-0}" == 1 ]]; then
      emit '[[{"state":"open","base":{"ref":"main"},"head":{"ref":"automation-crawl-official-record-run-0-1","repo":{"full_name":"o/r"}}}]]'
    else
      emit '[[]]'
    fi ;;
  "GET repos/o/r/git/ref/heads/$branch")
    sha="$(remote rev-parse -q --verify "refs/heads/$branch")" || exit 1
    emit "{\\"object\\":{\\"sha\\":\\"$sha\\"}}" ;;
  "POST repos/o/r/pulls") pull ;;
  "GET repos/o/r/pulls/7") emit "$(pull)" ;;
  "GET repos/o/r/compare/"*)
    cand="$(remote rev-parse "refs/heads/$branch")"
    files="$(remote diff-tree --no-commit-id --no-renames --name-only -r "$cand" | jq -R '{filename: .}' | jq -s .)"
    emit "$(jq -n --argjson files "$files" '{status: "ahead", ahead_by: 1, behind_by: 0, total_commits: 1, files: $files}')" ;;
  *) echo "unexpected GitHub API call: $method $target" >&2; exit 99 ;;
esac
`;

function runHelperFixture({ dirty, openCrawlerPr = false }) {
  const root = mkdtempSync(join(tmpdir(), 'crawl-helper-'));
  try {
    const env = {
      ...process.env,
      HOME: root,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      GIT_TERMINAL_PROMPT: '0'
    };
    const remote = join(root, 'remote.git');
    const workspace = join(root, 'workspace');
    const bin = join(root, 'bin');
    const runnerTemp = join(root, 'runner');
    const callLog = join(root, 'gh-calls.log');
    mkdirSync(bin, { recursive: true });
    mkdirSync(runnerTemp, { recursive: true });
    git(root, ['init', '-q', '--bare', '-b', 'main', remote], env);
    git(root, ['clone', '-q', remote, workspace], env);
    git(workspace, ['config', 'user.name', 'crawl-test'], env);
    git(workspace, ['config', 'user.email', 'crawl-test@example.invalid'], env);
    mkdirSync(join(workspace, 'data', 'crawl'), { recursive: true });
    mkdirSync(join(workspace, 'receipts', 'crawl'), { recursive: true });
    writeFileSync(join(workspace, 'receipts', 'crawl', 'README.md'), 'receipts\n');
    writeFileSync(join(workspace, 'graph.json'), '{}\n');
    writeFileSync(join(workspace, 'data', 'crawl', 'state.json'), '{"n":0}\n');
    git(workspace, ['add', '-A'], env);
    git(workspace, ['commit', '-q', '-m', 'base'], env);
    git(workspace, ['push', '-q', 'origin', 'HEAD:refs/heads/main'], env);
    const baseSha = git(workspace, ['rev-parse', 'HEAD'], env);

    writeFileSync(join(workspace, 'data', 'crawl', 'state.json'), '{"n":1}\n');
    if (dirty) writeFileSync(join(workspace, 'graph.json'), '{"edited":true}\n');

    writeFileSync(join(bin, 'gh'), FAKE_GH);
    chmodSync(join(bin, 'gh'), 0o755);

    const result = spawnSync('bash', [join(process.cwd(), paths.helper)], {
      cwd: workspace,
      encoding: 'utf8',
      env: {
        ...env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'o/r',
        GITHUB_RUN_ID: '1',
        GITHUB_RUN_ATTEMPT: '1',
        GITHUB_WORKSPACE: workspace,
        RUNNER_TEMP: runnerTemp,
        PROMOTION_KIND: 'official-record',
        CALL_LOG: callLog,
        FAKE_REMOTE: remote,
        FAKE_OPEN_CRAWLER_PR: openCrawlerPr ? '1' : '0'
      }
    });

    const checkpoint = readFileSync(join(runnerTemp, 'scheduled-crawl-promotion-receipt', 'checkpoint.txt'), 'utf8');
    const calls = existsSync(callLog) ? readFileSync(callLog, 'utf8').trim().split('\n').filter(Boolean) : [];
    const branches = git(root, ['--git-dir', remote, 'for-each-ref', '--format=%(refname:short)', 'refs/heads'], env).split('\n').sort();
    return { result, checkpoint, calls, branches, mainSha: git(root, ['--git-dir', remote, 'rev-parse', 'refs/heads/main'], env), baseSha };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function verifyHelperBehavior() {
  const forbidden = /merge|dispatches|workflows|runs\/|reviews|protection|rulesets|--method (?:PUT|DELETE)|--approve/;

  const opened = runHelperFixture({ dirty: false });
  assert.equal(opened.result.status, 0, `helper must open the pull request: ${opened.result.stderr}`);
  assert.match(opened.checkpoint, /outcome=pull_request_opened\n/);
  assert.match(opened.checkpoint, /pull_request=7\n/);
  assert.match(opened.checkpoint, /remote_cleanup=not_needed\n/);
  assert.deepEqual(opened.branches, ['automation-crawl-official-record-run-1-1', 'main'], 'only the run-scoped candidate branch may be published');
  assert.equal(opened.mainSha, opened.baseSha, 'main must be untouched');
  assert.equal(opened.calls.filter((call) => /--method POST/.test(call)).length, 1, 'exactly one mutating API call: open the pull request');
  assert.equal(opened.calls.filter((call) => /--method/.test(call)).length, 1, 'no other mutating verb may be used');
  for (const call of opened.calls) assert.doesNotMatch(call, forbidden, `forbidden GitHub call: ${call}`);

  const dirty = runHelperFixture({ dirty: true });
  assert.notEqual(dirty.result.status, 0, 'a path outside the intake roots must fail closed');
  assert.match(dirty.result.stderr, /forbidden path: graph\.json/);
  assert.deepEqual(dirty.branches, ['main'], 'nothing may be published when the denominator is violated');
  assert.equal(dirty.calls.length, 0, 'no GitHub call before the local denominator passes');

  const blocked = runHelperFixture({ dirty: false, openCrawlerPr: true });
  assert.notEqual(blocked.result.status, 0, 'an open crawler pull request must block a second one');
  assert.match(blocked.checkpoint, /outcome=blocked_by_open_crawler_candidate\n/);
  assert.deepEqual(blocked.branches, ['main'], 'nothing may be published while another candidate is open');
  for (const call of blocked.calls) assert.doesNotMatch(call, forbidden, `forbidden GitHub call: ${call}`);
}

// The recovery-bundle and PR-only helper fixtures run the real shell helpers:
// retain-scheduled-crawl-candidate.sh needs bash (plus sha256sum and awk), and
// promote-scheduled-crawl.sh needs bash and jq. CI on ubuntu-latest has all of
// them; a host without one skips that fixture and says so instead of failing
// on a missing tool. The adversarial mutations above and the git
// rename-expansion fixture run everywhere.
function toolOnPath(name) {
  return !spawnSync(name, ['--version'], { stdio: 'ignore' }).error;
}

const fixtures = [
  ['rename-expansion', [], verifyRenamePathExpansionFixture],
  ['recovery bundle', ['bash'], verifyRecoveryBundleFixture],
  ['PR-only helper', ['bash', 'jq'], verifyHelperBehavior]
];
const ran = [];
const skipped = [];
for (const [label, requiredTools, run] of fixtures) {
  const missing = requiredTools.filter((tool) => !toolOnPath(tool));
  if (missing.length > 0) {
    skipped.push(`${label} (${missing.join(' and ')} not on PATH)`);
    continue;
  }
  run();
  ran.push(label);
}
if (skipped.length > 0) {
  console.log(`scheduled-crawl-promotion.test: SKIPPED ${skipped.join('; ')}; CI on ubuntu-latest has bash and jq, so these fixtures still gate there`);
}
console.log(`scheduled-crawl-promotion.test: ${mutations.length} adversarial mutations and ${ran.join(', ')} fixture(s) PASS`);
