#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./scheduled-crawl-promotion-core.test.js');

const paths = {
  industrial: '.github/workflows/crawl-industrial-exhaust.yml',
  official: '.github/workflows/crawl-official.yml',
  recovery: '.github/scripts/preserve-scheduled-crawl-candidate.sh'
};

const load = () => Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, readFileSync(path, 'utf8')])
);

function requireText(errors, text, needle, message) {
  if (!text.includes(needle)) errors.push(message);
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

export function validateScheduledCrawlCandidatePreservation(files) {
  const errors = [];

  for (const [label, workflow, kind] of [
    ['industrial-exhaust workflow', files.industrial, 'industrial-exhaust'],
    ['official-record workflow', files.official, 'official-record']
  ]) {
    requireText(errors, workflow,
      "- name: Preserve candidate when pull-request creation is blocked\n        if: steps.promote.outcome == 'failure'",
      `${label} must invoke recovery only after a failed promotion step`);
    requireText(errors, workflow,
      `PROMOTION_KIND: ${kind}\n        run: bash .github/scripts/preserve-scheduled-crawl-candidate.sh`,
      `${label} must bind the exact recovery kind and shared preservation script`);
    requireOrdered(errors, workflow, [
      'run: bash .github/scripts/promote-scheduled-crawl.sh',
      '- name: Preserve candidate when pull-request creation is blocked',
      'uses: actions/upload-artifact@v4',
      'run: test "$PROMOTION_STEP_OUTCOME" = success'
    ], `${label} must preserve the candidate before uploading the receipt and still fail on the original promotion outcome`);
  }

  const recovery = files.recovery;
  requireText(errors, recovery,
    '#!/usr/bin/env bash\nset -Eeuo pipefail\n',
    'candidate preservation must use strict Bash error handling');
  requireText(errors, recovery,
    'RECEIPT_DIR="${RUNNER_TEMP:-/tmp}/scheduled-crawl-promotion-receipt"',
    'candidate preservation must read and extend the exact promotion receipt');
  requireText(errors, recovery,
    `if [[ "$STAGE" != 'open-ordinary-pull-request' || -n "$PR_NUMBER" ]]; then`,
    'recovery must be limited to failure before an ordinary pull request exists');
  requireText(errors, recovery,
    'EXPECTED_BRANCH="automation-crawl-${SLUG}-run-${RUN_ID}-${RUN_ATTEMPT}"',
    'recovery must derive the run-scoped branch independently');
  requireText(errors, recovery,
    '[[ "$CANDIDATE_BRANCH" == "$EXPECTED_BRANCH" ]]',
    'recovery must bind the checkpoint branch to the independently derived branch');
  requireText(errors, recovery,
    '[[ "$(git rev-parse HEAD)" == "$CANDIDATE_SHA" ]]',
    'recovery must require local HEAD to remain the exact candidate');
  requireText(errors, recovery,
    '[[ "$(git rev-parse "${CANDIDATE_SHA}^")" == "$BASE_SHA" ]]',
    'recovery must require a direct-child candidate over the checkpoint base');
  requireText(errors, recovery,
    "ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')",
    'industrial recovery must retain the exact two-root denominator');
  requireText(errors, recovery,
    "ALLOWED_ROOTS=('data/crawl' 'receipts/crawl')",
    'official-record recovery must retain the exact two-root denominator');
  requireText(errors, recovery,
    'git diff-tree --no-commit-id --name-only -r -z "$CANDIDATE_SHA"',
    'recovery must rederive every candidate path from the commit');
  requireText(errors, recovery,
    'if [[ -n "$remote_candidate" && "$remote_candidate" != "$CANDIDATE_SHA" ]]; then',
    'recovery must refuse a divergent public candidate ref');
  requireText(errors, recovery,
    'git push origin "${CANDIDATE_SHA}:refs/heads/${CANDIDATE_BRANCH}"',
    'recovery may republish only the exact candidate to its run-scoped branch');
  requireText(errors, recovery,
    '[[ "$remote_candidate" == "$CANDIDATE_SHA" ]]',
    'recovery must verify the public branch after preservation');
  requireText(errors, recovery,
    'recovery_branch_preserved: true',
    'recovery must write a structured affirmative custody receipt');
  requireText(errors, recovery,
    "printf 'recovery_branch_preserved=true\\n'",
    'recovery must extend the terminal checkpoint with the custody result');
  requireText(errors, recovery,
    'Scheduled crawl pull-request creation blocked',
    'recovery must expose the repository authorization failure');
  requireText(errors, recovery,
    'exit 0',
    'successful branch preservation must return control to the original terminal failure gate');

  requireAbsent(errors, recovery, /refs\/heads\/main/,
    'candidate preservation must never push main');
  requireAbsent(errors, recovery, /--method\s+(?:POST|PATCH|PUT|DELETE)/,
    'candidate preservation must not create, edit, merge, close, or delete GitHub objects');
  requireAbsent(errors, recovery, /branches\/main\/protection|repos\/\$REPO\/rulesets/,
    'candidate preservation must not mutate branch policy');

  return errors;
}

const canonical = load();
assert.deepEqual(
  validateScheduledCrawlCandidatePreservation(canonical),
  [],
  'canonical scheduled-crawl candidate-preservation contract must validate'
);

const mutations = [
  ['remove exact failure-stage targeting', (c) => {
    c.recovery = c.recovery.replace(
      `if [[ "$STAGE" != 'open-ordinary-pull-request' || -n "$PR_NUMBER" ]]; then`,
      'if false; then'
    );
  }],
  ['broaden industrial recovery roots', (c) => {
    c.recovery = c.recovery.replace(
      "ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')",
      "ALLOWED_ROOTS=('data' 'receipts')"
    );
  }],
  ['remove direct-parent lease', (c) => {
    c.recovery = c.recovery.replace(
      '[[ "$(git rev-parse "${CANDIDATE_SHA}^")" == "$BASE_SHA" ]]',
      'true # parent lease removed'
    );
  }],
  ['redirect recovery to main', (c) => {
    c.recovery = c.recovery.replace(
      'git push origin "${CANDIDATE_SHA}:refs/heads/${CANDIDATE_BRANCH}"',
      'git push origin "${CANDIDATE_SHA}:refs/heads/main"'
    );
  }],
  ['drop official recovery invocation', (c) => {
    c.official = c.official.replace(
      '- name: Preserve candidate when pull-request creation is blocked',
      '- name: Recovery removed'
    );
  }],
  ['allow candidate ref mutation', (c) => {
    c.recovery += '\ngh api --method DELETE "repos/$REPO/git/refs/heads/$CANDIDATE_BRANCH"\n';
  }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(canonical);
  mutate(candidate);
  const errors = validateScheduledCrawlCandidatePreservation(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

console.log(`scheduled-crawl-candidate-preservation: ${mutations.length} adversarial mutations PASS`);
