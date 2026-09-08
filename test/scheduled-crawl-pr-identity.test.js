#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ACTION_COMMIT = 'bcd2ba49218906704ab6c1aa796996da409d3eb1';
const paths = {
  industrial: '.github/workflows/crawl-industrial-exhaust.yml',
  official: '.github/workflows/crawl-official.yml',
  gate: '.github/scripts/scheduled-crawl-pr-identity.sh',
  ci: '.github/workflows/ci.yml'
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

function publisherStep(workflow) {
  const startMarker = '      - name: Mint PR-only scheduled-crawl publisher token\n';
  const endMarker = '      - name: Promote intake through qualified pull request\n';
  const start = workflow.indexOf(startMarker);
  const end = workflow.indexOf(endMarker, start + startMarker.length);
  return start >= 0 && end > start ? workflow.slice(start, end) : '';
}

function functionBody(source, name, nextName) {
  const start = source.indexOf(`${name}() {`);
  const end = source.indexOf(`\n}\n\n${nextName}() {`, start);
  return start >= 0 && end > start ? source.slice(start, end + 2) : '';
}

export function validateScheduledCrawlPrIdentity(files) {
  const errors = [];

  for (const [label, workflow, kind] of [
    ['industrial-exhaust workflow', files.industrial, 'industrial-exhaust'],
    ['official-record workflow', files.official, 'official-record']
  ]) {
    const mint = publisherStep(workflow);
    requireMatch(errors, mint, /id: pr-publisher\n/, `${label} must give the publisher-token step a stable id`);
    requireMatch(errors, mint, /continue-on-error: true\n/, `${label} must continue into fail-closed candidate retention when token minting fails`);
    requireMatch(errors, mint, new RegExp(`uses: actions/create-github-app-token@${ACTION_COMMIT}\\n`), `${label} must pin the official token action to the reviewed v3 commit`);
    requireMatch(errors, mint, /client-id: \$\{\{ vars\.SCHEDULED_CRAWL_PR_APP_CLIENT_ID \}\}\n/, `${label} must use the dedicated App client-id variable`);
    requireMatch(errors, mint, /private-key: \$\{\{ secrets\.SCHEDULED_CRAWL_PR_APP_PRIVATE_KEY \}\}\n/, `${label} must use the dedicated App private-key secret`);
    requireMatch(errors, mint, /permission-pull-requests: write\n/, `${label} must downscope the installation token to pull-request write`);
    requireAbsent(errors, mint, /^\s+(?:owner|repositories):/m, `${label} must leave owner and repositories unset so the token remains current-repository scoped`);
    requireAbsent(errors, mint, /^\s+app-id:/m, `${label} must use the current client-id input rather than the deprecated app-id input`);

    const permissions = [...mint.matchAll(/^\s+(permission-[a-z0-9-]+):\s*(\S+)\s*$/gm)]
      .map((match) => `${match[1]}:${match[2]}`);
    if (permissions.length !== 1 || permissions[0] !== 'permission-pull-requests:write') {
      errors.push(`${label} must request no installation-token permission beyond pull-request write`);
    }

    requireMatch(errors, workflow, /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}\n/, `${label} must retain the job token as the primary GitHub credential`);
    requireMatch(errors, workflow, /BASH_ENV: \$\{\{ github\.workspace \}\}\/\.github\/scripts\/scheduled-crawl-pr-identity\.sh\n/, `${label} must load the identity gate only inside the promotion Bash process`);
    requireMatch(errors, workflow, /SCHEDULED_CRAWL_PR_TOKEN: \$\{\{ steps\.pr-publisher\.outputs\.token \}\}\n/, `${label} must pass the installation token under its bounded variable`);
    requireMatch(errors, workflow, /SCHEDULED_CRAWL_PR_TOKEN_MINT_OUTCOME: \$\{\{ steps\.pr-publisher\.outcome \}\}\n/, `${label} must pass the actual mint outcome`);
    requireMatch(errors, workflow, /SCHEDULED_CRAWL_PR_APP_SLUG: \$\{\{ steps\.pr-publisher\.outputs\.app-slug \}\}\n/, `${label} must retain the publisher App slug`);
    requireMatch(errors, workflow, /SCHEDULED_CRAWL_PR_INSTALLATION_ID: \$\{\{ steps\.pr-publisher\.outputs\.installation-id \}\}\n/, `${label} must retain the publisher installation id`);
    requireMatch(errors, workflow, new RegExp(`PROMOTION_KIND: ${kind.replace('-', '\\-')}\\n`), `${label} must retain its exact promotion kind`);
    requireAbsent(errors, workflow, /GH_TOKEN: \$\{\{ steps\.pr-publisher\.outputs\.token \}\}/, `${label} must not globally replace the job token with the publisher token`);
    requireOrdered(errors, workflow, [
      '- name: Mint PR-only scheduled-crawl publisher token',
      `uses: actions/create-github-app-token@${ACTION_COMMIT}`,
      '- name: Promote intake through qualified pull request',
      'GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}',
      'BASH_ENV: ${{ github.workspace }}/.github/scripts/scheduled-crawl-pr-identity.sh',
      'run: bash .github/scripts/promote-scheduled-crawl.sh'
    ], `${label} must mint, bind, and consume the PR-only identity in order`);
  }

  const gateTriggerCount = (files.industrial.match(/- '\.github\/scripts\/scheduled-crawl-pr-identity\.sh'/g) || []).length;
  if (gateTriggerCount !== 2) errors.push('industrial validation must cover identity-gate changes on pull request and main push');
  const identityTestTriggerCount = (files.industrial.match(/- 'test\/scheduled-crawl-pr-identity\.test\.js'/g) || []).length;
  if (identityTestTriggerCount !== 2) errors.push('industrial validation must cover identity-contract changes on pull request and main push');

  const gate = files.gate;
  requireMatch(errors, gate, /^#!\/usr\/bin\/env bash\n/, 'identity gate must execute under Bash');
  requireAbsent(errors, gate, /set -x|set -o xtrace/, 'identity gate must never enable token-revealing shell tracing');
  requireMatch(errors, gate, /SCHEDULED_CRAWL_REAL_GIT="\$\(type -P git\)"/, 'identity gate must lease the runner git binary before interposition');
  requireMatch(errors, gate, /SCHEDULED_CRAWL_REAL_GH="\$\(type -P gh\)"/, 'identity gate must lease the runner gh binary before interposition');
  requireMatch(errors, gate, /mint_outcome=%s\\n/, 'identity receipt must retain the token-mint outcome');
  requireMatch(errors, gate, /app_slug=%s\\n/, 'identity receipt must retain the App slug');
  requireMatch(errors, gate, /installation_id=%s\\n/, 'identity receipt must retain the installation id');
  requireMatch(errors, gate, /token_state=%s\\n/, 'identity receipt must report only token state');

  for (const line of gate.split('\n')) {
    if (line.includes('printf') && /SCHEDULED_CRAWL_PR_TOKEN(?!_)/.test(line)) {
      errors.push('identity receipt must never print the installation token');
      break;
    }
  }

  const gitBody = functionBody(gate, 'git', 'gh');
  requireMatch(errors, gitBody, /"\$#" -eq 3/, 'git interposition must match the exact candidate-publish argument count');
  requireMatch(errors, gitBody, /"\$\{3:-\}" == "\$\{CANDIDATE_SHA\}:refs\/heads\/\$\{CANDIDATE_BRANCH\}"/, 'git interposition must bind the exact leased candidate ref');
  requireMatch(errors, gitBody, /OUTCOME='publication_identity_unavailable'/, 'missing identity must produce a distinct fail-closed outcome');
  requireMatch(errors, gitBody, /STAGE='require-pull-request-publication-identity'/, 'missing identity must identify the refused publication stage');
  requireOrdered(errors, gitBody, [
    'if ! scheduled_crawl_pr_identity_available; then',
    "OUTCOME='publication_identity_unavailable'",
    'return 86',
    '"$SCHEDULED_CRAWL_REAL_GIT" "$@"'
  ], 'identity availability must be checked before the candidate branch reaches the real git binary');
  const firstRealGit = gitBody.indexOf('"$SCHEDULED_CRAWL_REAL_GIT" "$@"');
  const identityCheck = gitBody.indexOf('if ! scheduled_crawl_pr_identity_available; then');
  if (firstRealGit >= 0 && identityCheck >= 0 && firstRealGit < identityCheck) {
    errors.push('candidate publication must not reach the real git binary before identity validation');
  }

  const ghBody = gate.slice(gate.indexOf('gh() {'));
  requireMatch(errors, ghBody, /"\$#" -eq 6/, 'gh interposition must match the exact PR-create argument count');
  requireMatch(errors, ghBody, /"\$\{4:-\}" == "repos\/\$\{REPO:-\}\/pulls"/, 'gh interposition must match only this repository pull-request collection');
  const scopedAssignments = ghBody.match(/GH_TOKEN="\$SCHEDULED_CRAWL_PR_TOKEN" "\$SCHEDULED_CRAWL_REAL_GH" "\$@"/g) || [];
  if (scopedAssignments.length !== 1) errors.push('publisher token must be assigned to exactly one gh invocation');
  const tokenUnsets = gate.match(/unset SCHEDULED_CRAWL_PR_TOKEN/g) || [];
  if (tokenUnsets.length < 2) errors.push('publisher token must be unset after candidate-publication failure and after its single PR-create use');
  requireAbsent(errors, gate, /^(?:export\s+)?GH_TOKEN=.*SCHEDULED_CRAWL_PR_TOKEN/m, 'identity gate must not replace the shell-wide GitHub credential');
  requireOrdered(errors, ghBody, [
    'if ! scheduled_crawl_pr_identity_available; then',
    'GH_TOKEN="$SCHEDULED_CRAWL_PR_TOKEN" "$SCHEDULED_CRAWL_REAL_GH" "$@"',
    'unset SCHEDULED_CRAWL_PR_TOKEN',
    "PR_PUBLISHER_IDENTITY='used_for_pr_create_only'",
    '"$SCHEDULED_CRAWL_REAL_GH" "$@"'
  ], 'publisher token must be command-scoped, cleared, and followed by ordinary job-token delegation');

  requireMatch(errors, files.ci, /Run scheduled crawler PR identity contract tests\n        run: node test\/scheduled-crawl-pr-identity\.test\.js\n/, 'Release checks must execute the PR-identity contract test');

  return errors;
}

const canonical = load();
assert.deepEqual(validateScheduledCrawlPrIdentity(canonical), [], 'canonical scheduled-crawl PR identity contract must validate');

const mutations = [
  ['remove the pinned token action', (c) => {
    c.industrial = c.industrial.replace(`        uses: actions/create-github-app-token@${ACTION_COMMIT}\n`, '');
  }],
  ['broaden the token to repository contents', (c) => {
    c.official = c.official.replace('          permission-pull-requests: write\n', '          permission-pull-requests: write\n          permission-contents: write\n');
  }],
  ['broaden the token repository denominator', (c) => {
    c.industrial = c.industrial.replace('          permission-pull-requests: write\n', '          permission-pull-requests: write\n          owner: BigBirdReturns\n');
  }],
  ['replace the job token globally', (c) => {
    c.official = c.official.replace('          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}', '          GH_TOKEN: ${{ steps.pr-publisher.outputs.token }}');
  }],
  ['drop the Bash identity gate binding', (c) => {
    c.industrial = c.industrial.replace('          BASH_ENV: ${{ github.workspace }}/.github/scripts/scheduled-crawl-pr-identity.sh\n', '');
  }],
  ['allow candidate publication before identity validation', (c) => {
    c.gate = c.gate.replace('    if ! scheduled_crawl_pr_identity_available; then', '    "$SCHEDULED_CRAWL_REAL_GIT" "$@"\n    if ! scheduled_crawl_pr_identity_available; then');
  }],
  ['erase the distinct identity refusal outcome', (c) => {
    c.gate = c.gate.replaceAll("OUTCOME='publication_identity_unavailable'", "OUTCOME='failed_closed'");
  }],
  ['use the publisher token for every gh call', (c) => {
    c.gate = c.gate.replace('  "$SCHEDULED_CRAWL_REAL_GH" "$@"\n}', '  GH_TOKEN="$SCHEDULED_CRAWL_PR_TOKEN" "$SCHEDULED_CRAWL_REAL_GH" "$@"\n}');
  }],
  ['retain the publisher token after use', (c) => {
    c.gate = c.gate.replaceAll('    unset SCHEDULED_CRAWL_PR_TOKEN\n', '');
  }],
  ['remove the release-gate identity test', (c) => {
    c.ci = c.ci.replace('      - name: Run scheduled crawler PR identity contract tests\n        run: node test/scheduled-crawl-pr-identity.test.js\n', '');
  }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(canonical);
  mutate(candidate);
  assert.ok(validateScheduledCrawlPrIdentity(candidate).length > 0, `mutation should fail closed: ${label}`);
}

function writeExecutable(path, content) {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

function runGateFixture() {
  const fixture = mkdtempSync(join(tmpdir(), 'scheduled-crawl-pr-identity-'));
  try {
    const bin = join(fixture, 'bin');
    const runner = join(fixture, 'runner');
    const commandLog = join(fixture, 'commands.log');
    mkdirSync(bin, { recursive: true });
    mkdirSync(runner, { recursive: true });

    writeExecutable(join(bin, 'git'), `#!/usr/bin/env bash
printf 'git|%s|%s\n' "\${GH_TOKEN:-}" "$*" >> "$COMMAND_LOG"
exit "\${FAKE_GIT_EXIT:-0}"
`);
    writeExecutable(join(bin, 'gh'), `#!/usr/bin/env bash
printf 'gh|%s|%s\n' "\${GH_TOKEN:-}" "$*" >> "$COMMAND_LOG"
if [[ "\${FAIL_PR_CREATE:-0}" == '1' && "$*" == 'api --method POST repos/BigBirdReturns/clifford-number/pulls --input -' ]]; then
  exit 17
fi
printf '{"number":99}\n'
`);

    const commonEnv = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      BASH_ENV: join(process.cwd(), paths.gate),
      RUNNER_TEMP: runner,
      COMMAND_LOG: commandLog,
      REPO: 'BigBirdReturns/clifford-number',
      CANDIDATE_SHA: 'abc123',
      CANDIDATE_BRANCH: 'automation-crawl-industrial-exhaust-run-1-1',
      GH_TOKEN: 'job-token'
    };

    const missingState = join(fixture, 'missing-state.txt');
    execFileSync('bash', ['-c', `
source "$BASH_ENV"
set +e
OUTCOME='failed_closed'
STAGE='publish-run-scoped-candidate'
git push origin "$CANDIDATE_SHA:refs/heads/$CANDIDATE_BRANCH"
rc=$?
printf 'rc=%s\noutcome=%s\nstage=%s\n' "$rc" "$OUTCOME" "$STAGE" > "$STATE_FILE"
exit 0
`], {
      env: {
        ...commonEnv,
        STATE_FILE: missingState,
        SCHEDULED_CRAWL_PR_TOKEN_MINT_OUTCOME: 'failure'
      },
      stdio: 'pipe'
    });

    const missing = readFileSync(missingState, 'utf8');
    assert.match(missing, /rc=86\n/);
    assert.match(missing, /outcome=publication_identity_unavailable\n/);
    assert.match(missing, /stage=require-pull-request-publication-identity\n/);
    assert.equal(existsSync(commandLog), false, 'missing identity must not reach the real git binary');

    const missingReceipt = readFileSync(join(runner, 'scheduled-crawl-promotion-receipt', 'pr-publication-identity.txt'), 'utf8');
    assert.match(missingReceipt, /state=unavailable_before_branch_publication/);
    assert.doesNotMatch(missingReceipt, /job-token|app-token/);

    rmSync(commandLog, { force: true });
    rmSync(join(runner, 'scheduled-crawl-promotion-receipt'), { recursive: true, force: true });

    const successState = join(fixture, 'success-state.txt');
    execFileSync('bash', ['-c', `
source "$BASH_ENV"
set -e
OUTCOME='failed_closed'
STAGE='publish-run-scoped-candidate'
git push origin "$CANDIDATE_SHA:refs/heads/$CANDIDATE_BRANCH"
gh api --method POST "repos/$REPO/pulls" --input - <<< '{}' > /dev/null
gh api "repos/$REPO/pulls/99" > /dev/null
if [[ -v SCHEDULED_CRAWL_PR_TOKEN ]]; then token_live=true; else token_live=false; fi
printf 'outcome=%s\npublisher=%s\ntoken_live=%s\n' "$OUTCOME" "$PR_PUBLISHER_IDENTITY" "$token_live" > "$STATE_FILE"
`], {
      env: {
        ...commonEnv,
        STATE_FILE: successState,
        SCHEDULED_CRAWL_PR_TOKEN: 'app-token',
        SCHEDULED_CRAWL_PR_TOKEN_MINT_OUTCOME: 'success',
        SCHEDULED_CRAWL_PR_APP_SLUG: 'clifford-crawl-publisher',
        SCHEDULED_CRAWL_PR_INSTALLATION_ID: '12345'
      },
      stdio: 'pipe'
    });

    const success = readFileSync(successState, 'utf8');
    assert.match(success, /publisher=used_for_pr_create_only\n/);
    assert.match(success, /token_live=false\n/);
    const calls = readFileSync(commandLog, 'utf8').trim().split('\n');
    assert.deepEqual(calls, [
      'git|job-token|push origin abc123:refs/heads/automation-crawl-industrial-exhaust-run-1-1',
      'gh|app-token|api --method POST repos/BigBirdReturns/clifford-number/pulls --input -',
      'gh|job-token|api repos/BigBirdReturns/clifford-number/pulls/99'
    ]);

    const successReceipt = readFileSync(join(runner, 'scheduled-crawl-promotion-receipt', 'pr-publication-identity.txt'), 'utf8');
    assert.match(successReceipt, /state=used_for_pr_create_only/);
    assert.match(successReceipt, /app_slug=clifford-crawl-publisher/);
    assert.match(successReceipt, /installation_id=12345/);
    assert.match(successReceipt, /token_state=unset/);
    assert.doesNotMatch(successReceipt, /job-token|app-token/);

    rmSync(commandLog, { force: true });
    rmSync(join(runner, 'scheduled-crawl-promotion-receipt'), { recursive: true, force: true });

    const failureState = join(fixture, 'failure-state.txt');
    execFileSync('bash', ['-c', `
source "$BASH_ENV"
set +e
OUTCOME='failed_closed'
STAGE='open-ordinary-pull-request'
gh api --method POST "repos/$REPO/pulls" --input - > /dev/null
rc=$?
if [[ -v SCHEDULED_CRAWL_PR_TOKEN ]]; then token_live=true; else token_live=false; fi
printf 'rc=%s\noutcome=%s\npublisher=%s\ntoken_live=%s\n' "$rc" "$OUTCOME" "$PR_PUBLISHER_IDENTITY" "$token_live" > "$STATE_FILE"
exit 0
`], {
      env: {
        ...commonEnv,
        STATE_FILE: failureState,
        SCHEDULED_CRAWL_PR_TOKEN: 'app-token',
        SCHEDULED_CRAWL_PR_TOKEN_MINT_OUTCOME: 'success',
        FAIL_PR_CREATE: '1'
      },
      stdio: 'pipe'
    });

    const failure = readFileSync(failureState, 'utf8');
    assert.match(failure, /rc=17\n/);
    assert.match(failure, /outcome=publication_identity_pr_create_failed\n/);
    assert.match(failure, /publisher=pr_create_failed\n/);
    assert.match(failure, /token_live=false\n/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

runGateFixture();
console.log(`scheduled-crawl-pr-identity.test: ${mutations.length} adversarial mutations and command-scope fixtures PASS`);
