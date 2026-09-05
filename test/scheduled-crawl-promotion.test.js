#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const paths = {
  industrial: '.github/workflows/crawl-industrial-exhaust.yml',
  official: '.github/workflows/crawl-official.yml',
  release: '.github/workflows/ci.yml',
  noMagic: '.github/workflows/no-magic-human-gate.yml',
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

export function validateScheduledCrawlPromotion(files) {
  const errors = [];

  for (const [label, workflow, kind] of [
    ['industrial-exhaust workflow', files.industrial, 'industrial-exhaust'],
    ['official-record workflow', files.official, 'official-record']
  ]) {
    requireMatch(errors, workflow, /permissions:\n  contents: read\n/, `${label} must default to read-only contents`);
    requireMatch(errors, workflow, /permissions:\n(?:      .+\n)*      actions: write\n      contents: write\n      pull-requests: write\n/, `${label} promotion job must carry only the required mutation scopes`);
    requireMatch(errors, workflow, /group: scheduled-crawl-main-promotion\n      cancel-in-progress: false|group: scheduled-crawl-main-promotion\n  cancel-in-progress: false/, `${label} must share the serialized main-promotion concurrency group`);
    requireMatch(errors, workflow, /ref: main\n          fetch-depth: 0/, `${label} must crawl from a full-history main checkout`);
    requireMatch(errors, workflow, new RegExp(`PROMOTION_KIND: ${kind.replace('-', '\\-')}`), `${label} must bind the exact promotion kind`);
    requireMatch(errors, workflow, /run: bash \.github\/scripts\/promote-scheduled-crawl\.sh/, `${label} must invoke the common promotion helper`);
    requireMatch(errors, workflow, /- name: Retain exact candidate recovery bundle\n        if: always\(\)\n        run: bash \.github\/scripts\/retain-scheduled-crawl-candidate\.sh/, `${label} must retain the exact candidate bundle after promotion`);
    requireMatch(errors, workflow, /uses: actions\/upload-artifact@v4/, `${label} must retain a promotion receipt`);
    requireMatch(errors, workflow, /path: \$\{\{ runner\.temp \}\}\/scheduled-crawl-promotion-receipt/, `${label} must upload the exact receipt directory`);
    requireMatch(errors, workflow, /PROMOTION_STEP_OUTCOME: \$\{\{ steps\.promote\.outcome \}\}/, `${label} must expose the helper outcome to the terminal gate`);
    requireMatch(errors, workflow, /run: test "\$PROMOTION_STEP_OUTCOME" = success/, `${label} must fail the workflow when promotion fails`);
    requireAbsent(errors, workflow, /git push(?:\s|$)/, `${label} must not push main or any branch directly inside the workflow`);
    requireAbsent(errors, workflow, /git pull --rebase/, `${label} must not rebase generated intake over a moved main`);
    requireOrdered(errors, workflow, [
      'run: bash .github/scripts/promote-scheduled-crawl.sh',
      'run: bash .github/scripts/retain-scheduled-crawl-candidate.sh',
      'uses: actions/upload-artifact@v4'
    ], `${label} must bundle the candidate before uploading the promotion receipt`);
  }

  requireMatch(errors, files.industrial, /if: github\.event_name != 'pull_request'/, 'industrial-exhaust mutation must remain disabled on pull_request');

  requireMatch(errors, files.noMagic, /jobs:\n  no-magic-human-gate:\n/, 'No magic human gate must publish a unique stable check name');
  requireAbsent(errors, files.noMagic, /jobs:\n  validate:\n/, 'No magic human gate must not reuse the generic validate check name');
  requireMatch(errors, files.release, /Run scheduled crawler promotion contract tests\n        run: node test\/scheduled-crawl-promotion\.test\.js/, 'Release checks must execute the scheduled promotion contract test');
  requireMatch(errors, files.release, /Run scheduled crawler admission observation tests\n        run: node test\/scheduled-crawl-admission\.test\.js/, 'Release checks must execute native-admission observation tests');
  requireMatch(errors, files.release, /Run scheduled crawler resumption tests\n        run: node test\/scheduled-crawl-resumption\.test\.js/, 'Release checks must execute protected resumption tests');

  const helper = files.helper;
  requireMatch(errors, helper, /^#!\/usr\/bin\/env bash\nset -Eeuo pipefail\n/, 'promotion helper must use strict Bash error handling');
  requireMatch(errors, helper, /industrial-exhaust\)[\s\S]*ALLOWED_ROOTS=\('data\/exhaust' 'receipts\/exhaust'\)/, 'industrial-exhaust promotion must be limited to its two intake roots');
  requireMatch(errors, helper, /official-record\)[\s\S]*ALLOWED_ROOTS=\('data\/crawl' 'receipts\/crawl'\)/, 'official-record promotion must be limited to its two intake roots');
  requireMatch(errors, helper, /CANDIDATE_BRANCH="automation-crawl-\$\{SLUG\}-run-\$\{RUN_ID\}-\$\{RUN_ATTEMPT\}"/, 'candidate branch must be unique to workflow run and attempt');
  requireMatch(errors, helper, /BASE_SHA="\$\(git rev-parse HEAD\)"/, 'promotion must lease the exact checked-out base SHA');
  const mainLeaseAssertions = helper.match(/test "\$\(git rev-parse origin\/main\)" = "\$BASE_SHA"/g) || [];
  if (mainLeaseAssertions.length < 2) errors.push('promotion must refuse a moved main before candidate construction and again before publication');
  requireMatch(errors, helper, /test "\$\(git rev-parse "\$CANDIDATE_SHA\^"\)" = "\$BASE_SHA"/, 'candidate must be one direct child of the leased base');
  requireMatch(errors, helper, /git diff --no-renames --name-only -z HEAD --/, 'worktree path census must expand renames into both paths');
  requireMatch(errors, helper, /git diff-tree --no-commit-id --no-renames --name-only -r -z/, 'commit path census must expand renames into both paths');
  requireMatch(errors, helper, /previous_filename \/\/ empty/, 'remote comparison must include a renamed source path');
  requireMatch(errors, helper, /git push origin "\$CANDIDATE_SHA:refs\/heads\/\$CANDIDATE_BRANCH"/, 'promotion may publish only the run-scoped candidate branch');
  requireAbsent(errors, helper, /git push[^\n]*(?:refs\/heads\/main|\s+main(?=\s|$)|:main(?=\s|$))/, 'promotion helper must never push main');
  requireMatch(errors, helper, /repos\/\$REPO\/pulls" --input/, 'promotion must open an ordinary pull request');
  requireMatch(errors, helper, /actions\/workflows\/ci\.yml\/dispatches/, 'promotion must dispatch Release checks explicitly');
  requireMatch(errors, helper, /actions\/workflows\/no-magic-human-gate\.yml\/dispatches/, 'promotion must dispatch No magic human gate explicitly');
  requireMatch(errors, helper, /assert_check_success 'release-check'/, 'promotion must bind the stable Release checks context');
  requireMatch(errors, helper, /assert_check_success 'no-magic-human-gate'/, 'promotion must bind the stable No magic human gate context');
  requireMatch(errors, helper, /\.app\.id == 15368 and \.check_suite\.id == \$suite/, 'dispatched checks must bind the GitHub Actions app and exact suite');
  requireMatch(errors, helper, /if \[\[ "\$OPEN_CRAWLER_COUNT" -gt 0 \]\]; then[\s\S]*blocked_by_open_crawler_candidate/, 'promotion must refuse a second open crawler candidate');
  requireMatch(errors, helper, /PRESERVE_CANDIDATE='true'[\s\S]*OUTCOME='awaiting_native_pr_admission'/, 'promotion must preserve a candidate while native admission is unresolved');
  requireMatch(errors, helper, /NATIVE_ADMISSION_POLLS="\$\{NATIVE_ADMISSION_POLLS:-120\}"/, 'native admission must use a bounded default polling window');
  requireMatch(errors, helper, /for \(\(attempt = 1; attempt <= NATIVE_ADMISSION_POLLS; attempt\+\+\)\)/, 'native admission must poll within the bounded window');
  requireMatch(errors, helper, /native-admission-timeline\.jsonl/, 'native admission must retain every polling observation');
  requireMatch(errors, helper, /pending\|awaiting_approval\)/, 'pending and approval-required states must remain non-mergeable');
  requireMatch(errors, helper, /node \.github\/scripts\/inspect-scheduled-crawl-admission\.mjs/, 'promotion must inspect native PR admission before merge');
  requireMatch(errors, helper, /preserved_pending_native_admission/, 'failure cleanup must retain an approval-pending candidate');
  requireMatch(errors, helper, /ready\)[\s\S]*OUTCOME='native_admission_ready'[\s\S]*break/, 'native readiness must retain the candidate until merge admission');
  requireOrdered(errors, helper, ["MERGED='true'", "PRESERVE_CANDIDATE='false'", "STAGE='verify-merge-topology'"], 'candidate preservation may clear only after the exact merge is admitted');
  requireMatch(errors, helper, /\.status == "ahead" and \.ahead_by == 1 and \.behind_by == 0 and \.total_commits == 1/, 'remote comparison must remain exactly one commit ahead and zero behind');
  const mergePayloadStart = helper.indexOf('MERGE_PAYLOAD=');
  const mergeCallStart = helper.indexOf('gh api --method PUT "repos/$REPO/pulls/$PR_NUMBER/merge"', mergePayloadStart);
  const mergeSection = mergePayloadStart >= 0 && mergeCallStart > mergePayloadStart
    ? helper.slice(mergePayloadStart, mergeCallStart)
    : '';
  requireMatch(errors, mergeSection, /--arg sha "\$CANDIDATE_SHA"[\s\S]*sha: \$sha, merge_method: "merge"/, 'merge request must be leased to the exact candidate SHA');
  requireMatch(errors, helper, /test "\$\(jq -r '\.parents\[0\]\.sha'[^\n]*\)" = "\$BASE_SHA"[\s\S]*test "\$\(jq -r '\.parents\[1\]\.sha'[^\n]*\)" = "\$CANDIDATE_SHA"/, 'post-merge receipt must authenticate both merge parents');
  requireMatch(errors, helper, /jq -e '\.parents \| length == 2'/, 'post-merge receipt must require exactly two parents');
  requireMatch(errors, helper, /\.tree\.sha[^\n]*CANDIDATE_SHA\^\{tree\}/, 'post-merge receipt must preserve the candidate tree');
  requireMatch(errors, helper, /remote_candidate" == "\$CANDIDATE_SHA"/, 'cleanup may delete a candidate ref only while it retains the leased SHA');
  requireMatch(errors, helper, /cleanup-branch-refused\.txt/, 'cleanup must record and refuse a moved candidate ref');
  requireAbsent(errors, helper, /branches\/main\/protection|repos\/\$REPO\/rulesets/, 'scheduled promotion must not mutate branch policy');

  requireOrdered(errors, helper, [
    "STAGE='dispatch-required-checks'",
    "STAGE='qualify-exact-candidate'",
    "STAGE='revalidate-lease-and-remote-denominator'",
    "STAGE='inspect-native-pr-admission'",
    "STAGE='merge-qualified-pull-request'"
  ], 'dispatched checks, native PR admission, lease revalidation, and merge must occur in order');

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
  requireMatch(errors, recovery, /BUNDLE_SHA256="\$\(sha256sum "\$BUNDLE" \| awk '\{print \$1\}'\)"/, 'candidate recovery must digest the exact bundle bytes');
  requireMatch(errors, recovery, /restore_hint=git fetch candidate\.bundle HEAD:refs\/heads\/recovered-scheduled-crawl/, 'candidate recovery must publish an executable restore hint');
  requireAbsent(errors, recovery, /gh api|git push/, 'candidate recovery must remain local and read-only with respect to GitHub');
  requireAbsent(errors, recovery, /branches\/main\/protection|repos\/\$REPO\/rulesets/, 'candidate recovery must not mutate branch policy');

  return errors;
}

const canonical = load();
assert.deepEqual(validateScheduledCrawlPromotion(canonical), [], 'canonical scheduled-crawl promotion contract must validate');

const mutations = [
  ['restore generic no-magic check name', (c) => { c.noMagic = c.noMagic.replace('  no-magic-human-gate:', '  validate:'); }],
  ['remove the release-gate contract test', (c) => { c.release = c.release.replace('      - name: Run scheduled crawler promotion contract tests\n        run: node test/scheduled-crawl-promotion.test.js\n', ''); }],
  ['remove native-admission tests from release', (c) => { c.release = c.release.replace('      - name: Run scheduled crawler admission observation tests\n        run: node test/scheduled-crawl-admission.test.js\n', ''); }],
  ['remove resumption tests from release', (c) => { c.release = c.release.replace('      - name: Run scheduled crawler resumption tests\n        run: node test/scheduled-crawl-resumption.test.js\n', ''); }],
  ['reintroduce a direct workflow push', (c) => { c.official += '\n      - run: git push origin main\n'; }],
  ['remove actions dispatch authority', (c) => { c.industrial = c.industrial.replace('      actions: write\n', ''); }],
  ['remove pull-request authority', (c) => { c.official = c.official.replace('      pull-requests: write\n', ''); }],
  ['split the crawler concurrency lock', (c) => { c.official = c.official.replace('scheduled-crawl-main-promotion', 'official-only-promotion'); }],
  ['allow shallow candidate ancestry', (c) => { c.industrial = c.industrial.replace('          fetch-depth: 0', '          fetch-depth: 1'); }],
  ['misbind the official promotion kind', (c) => { c.official = c.official.replace('PROMOTION_KIND: official-record', 'PROMOTION_KIND: industrial-exhaust'); }],
  ['broaden industrial intake roots', (c) => { c.helper = c.helper.replace("ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')", "ALLOWED_ROOTS=('data' 'receipts')"); }],
  ['drop run-attempt branch uniqueness', (c) => { c.helper = c.helper.replace('-${RUN_ATTEMPT}', ''); }],
  ['remove exact-main lease refusal', (c) => { c.helper = c.helper.replaceAll('test "$(git rev-parse origin/main)" = "$BASE_SHA"', 'true # main lease removed'); }],
  ['skip No magic workflow dispatch', (c) => { c.helper = c.helper.replace('gh api --method POST "repos/$REPO/actions/workflows/no-magic-human-gate.yml/dispatches"', 'echo skipped-no-magic'); }],
  ['bind a generic no-magic check', (c) => { c.helper = c.helper.replace("assert_check_success 'no-magic-human-gate'", "assert_check_success 'validate'"); }],
  ['drop dispatched-check app binding', (c) => { c.helper = c.helper.replace('.app.id == 15368 and .check_suite.id == $suite and ', ''); }],
  ['drop duplicate pending-candidate refusal', (c) => { c.helper = c.helper.replace("if [[ \"$OPEN_CRAWLER_COUNT\" -gt 0 ]]; then", 'if false; then'); }],
  ['drop native-admission inspection', (c) => { c.helper = c.helper.replace('node .github/scripts/inspect-scheduled-crawl-admission.mjs', 'node -e true'); }],
  ['drop pending-candidate preservation', (c) => { c.helper = c.helper.replace("PRESERVE_CANDIDATE='true'", "PRESERVE_CANDIDATE='false'"); }],
  ['remove bounded native polling', (c) => { c.helper = c.helper.replace('NATIVE_ADMISSION_POLLS="${NATIVE_ADMISSION_POLLS:-120}"', 'NATIVE_ADMISSION_POLLS=unbounded'); }],
  ['drop native-admission timeline', (c) => { c.helper = c.helper.replaceAll('native-admission-timeline.jsonl', 'discarded-native-admission'); }],
  ['clear preservation before merge admission', (c) => { c.helper = c.helper.replace("MERGED='true'\nPRESERVE_CANDIDATE='false'", "PRESERVE_CANDIDATE='false'\nMERGED='true'"); }],
  ['allow worktree rename collapse', (c) => { c.helper = c.helper.replace('git diff --no-renames --name-only -z HEAD --', 'git diff --name-only -z HEAD --'); }],
  ['allow commit rename collapse', (c) => { c.helper = c.helper.replace('git diff-tree --no-commit-id --no-renames --name-only -r -z', 'git diff-tree --no-commit-id --name-only -r -z'); }],
  ['omit remote renamed source path', (c) => { c.helper = c.helper.replace(".filename, (.previous_filename // empty)", '.filename'); }],
  ['weaken remote one-commit topology', (c) => { c.helper = c.helper.replace('and .ahead_by == 1 and .behind_by == 0 and .total_commits == 1', 'and .ahead_by >= 1'); }],
  ['merge against the base instead of candidate', (c) => {
    const marker = 'MERGE_PAYLOAD=';
    const start = c.helper.indexOf(marker);
    c.helper = c.helper.slice(0, start) + c.helper.slice(start).replace('--arg sha "$CANDIDATE_SHA"', '--arg sha "$BASE_SHA"');
  }],
  ['drop exact two-parent merge proof', (c) => { c.helper = c.helper.replace("jq -e '.parents | length == 2'", 'true # parent count removed'); }],
  ['drop candidate-tree merge proof', (c) => { c.helper = c.helper.replace('test "$(jq -r .tree.sha "$RECEIPT_DIR/merge-commit.json")" = "$(git rev-parse "$CANDIDATE_SHA^{tree}")"', 'true # tree proof removed'); }],
  ['delete a moved candidate ref', (c) => { c.helper = c.helper.replace('if [[ "$remote_candidate" == "$CANDIDATE_SHA" ]]; then', 'if [[ -n "$remote_candidate" ]]; then'); }],
  ['let scheduled promotion mutate policy', (c) => { c.helper += '\ngh api --method PUT "repos/$REPO/branches/main/protection"\n'; }],
  ['merge before exact check qualification', (c) => {
    c.helper = c.helper.replace("STAGE='dispatch-required-checks'", "STAGE='temporary-swap-marker'")
      .replace("STAGE='merge-qualified-pull-request'", "STAGE='dispatch-required-checks'")
      .replace("STAGE='temporary-swap-marker'", "STAGE='merge-qualified-pull-request'");
  }],
  ['drop the industrial recovery custodian', (c) => {
    c.industrial = c.industrial.replace("      - name: Retain exact candidate recovery bundle\n        if: always()\n        run: bash .github/scripts/retain-scheduled-crawl-candidate.sh\n", '');
  }],
  ['remove recovery direct-parent authentication', (c) => {
    c.recovery = c.recovery.replace('test "$(git rev-parse "$CANDIDATE_SHA^")" = "$BASE_SHA"', 'true # parent binding removed');
  }],
  ['replace exact bundle digest with a constant', (c) => {
    c.recovery = c.recovery.replace('BUNDLE_SHA256="$(sha256sum "$BUNDLE" | awk \'{print $1}\')"', 'BUNDLE_SHA256=unverified');
  }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(canonical);
  mutate(candidate);
  const errors = validateScheduledCrawlPromotion(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function gitPaths(cwd, args) {
  return execFileSync('git', args, { cwd }).toString('utf8').split('\0').filter(Boolean).sort();
}

function verifyRenamePathExpansionFixture() {
  const root = mkdtempSync(join(tmpdir(), 'scheduled-crawl-rename-'));
  try {
    mkdirSync(join(root, 'data', 'crawl'), { recursive: true });
    git(root, ['init', '-q']);
    git(root, ['config', 'user.name', 'scheduled-crawl-test']);
    git(root, ['config', 'user.email', 'scheduled-crawl-test@example.invalid']);
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
  const root = mkdtempSync(join(tmpdir(), 'scheduled-crawl-recovery-'));
  try {
    const workspace = join(root, 'workspace');
    const runnerTemp = join(root, 'runner');
    const receiptDir = join(runnerTemp, 'scheduled-crawl-promotion-receipt');
    mkdirSync(workspace, { recursive: true });
    mkdirSync(receiptDir, { recursive: true });

    git(workspace, ['init', '-q']);
    git(workspace, ['config', 'user.name', 'scheduled-crawl-test']);
    git(workspace, ['config', 'user.email', 'scheduled-crawl-test@example.invalid']);
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

verifyRenamePathExpansionFixture();
verifyRecoveryBundleFixture();
console.log(`scheduled-crawl-promotion.test: ${mutations.length} adversarial mutations, rename-expansion and recovery bundle fixtures PASS`);
