#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const paths = {
  industrial: '.github/workflows/crawl-industrial-exhaust.yml',
  official: '.github/workflows/crawl-official.yml',
  release: '.github/workflows/ci.yml',
  noMagic: '.github/workflows/no-magic-human-gate.yml',
  helper: '.github/scripts/promote-scheduled-crawl.sh'
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
    requireMatch(errors, workflow, /permissions:\n(?:      .+\n)*      actions: write\n      contents: write\n/, `${label} promotion job must carry only actions and contents write authority`);
    requireAbsent(errors, workflow, /pull-requests:\s*write/, `${label} must not retain pull-request write authority`);
    requireMatch(errors, workflow, /group: scheduled-crawl-main-promotion\n      cancel-in-progress: false|group: scheduled-crawl-main-promotion\n  cancel-in-progress: false/, `${label} must share the serialized main-promotion concurrency group`);
    requireMatch(errors, workflow, /ref: main\n          fetch-depth: 0/, `${label} must crawl from a full-history main checkout`);
    requireMatch(errors, workflow, new RegExp(`PROMOTION_KIND: ${kind.replace('-', '\\-')}`), `${label} must bind the exact promotion kind`);
    requireMatch(errors, workflow, /name: Promote intake through qualified status checks/, `${label} must identify checks-first promotion`);
    requireMatch(errors, workflow, /run: bash \.github\/scripts\/promote-scheduled-crawl\.sh/, `${label} must invoke the common promotion helper`);
    requireMatch(errors, workflow, /uses: actions\/upload-artifact@v4/, `${label} must retain a promotion receipt`);
    requireMatch(errors, workflow, /path: \$\{\{ runner\.temp \}\}\/scheduled-crawl-promotion-receipt/, `${label} must upload the exact receipt directory`);
    requireMatch(errors, workflow, /PROMOTION_STEP_OUTCOME: \$\{\{ steps\.promote\.outcome \}\}/, `${label} must expose the helper outcome to the terminal gate`);
    requireMatch(errors, workflow, /run: test "\$PROMOTION_STEP_OUTCOME" = success/, `${label} must fail the workflow when promotion fails`);
    requireAbsent(errors, workflow, /git push(?:\s|$)/, `${label} must not push any ref directly inside the workflow`);
    requireAbsent(errors, workflow, /git pull --rebase/, `${label} must not rebase generated intake over a moved main`);
  }

  requireMatch(errors, files.industrial, /if: github\.event_name != 'pull_request'/, 'industrial-exhaust mutation must remain disabled on pull_request');

  requireMatch(errors, files.noMagic, /jobs:\n  no-magic-human-gate:\n/, 'No magic human gate must publish a unique stable check name');
  requireAbsent(errors, files.noMagic, /jobs:\n  validate:\n/, 'No magic human gate must not reuse the generic validate check name');
  requireMatch(errors, files.release, /Run scheduled crawler promotion contract tests\n        run: node test\/scheduled-crawl-promotion\.test\.js/, 'Release checks must execute the scheduled promotion contract test');

  const helper = files.helper;
  requireMatch(errors, helper, /^#!\/usr\/bin\/env bash\nset -Eeuo pipefail\n/, 'promotion helper must use strict Bash error handling');
  requireMatch(errors, helper, /industrial-exhaust\)[\s\S]*ALLOWED_ROOTS=\('data\/exhaust' 'receipts\/exhaust'\)/, 'industrial-exhaust promotion must be limited to its two intake roots');
  requireMatch(errors, helper, /official-record\)[\s\S]*ALLOWED_ROOTS=\('data\/crawl' 'receipts\/crawl'\)/, 'official-record promotion must be limited to its two intake roots');
  requireMatch(errors, helper, /CANDIDATE_BRANCH="automation-crawl-\$\{SLUG\}-run-\$\{RUN_ID\}-\$\{RUN_ATTEMPT\}"/, 'candidate branch must be unique to workflow run and attempt');
  requireMatch(errors, helper, /BASE_SHA="\$\(git rev-parse HEAD\)"/, 'promotion must lease the exact checked-out base SHA');
  const mainLeaseAssertions = helper.match(/test "\$\(git rev-parse origin\/main\)" = "\$BASE_SHA"/g) || [];
  if (mainLeaseAssertions.length < 3) errors.push('promotion must refuse a moved main before construction, publication, and final advancement');
  requireMatch(errors, helper, /test "\$\(git rev-parse "\$CANDIDATE_SHA\^"\)" = "\$BASE_SHA"/, 'candidate must be one direct child of the leased base');
  requireMatch(errors, helper, /git push origin "\$CANDIDATE_SHA:refs\/heads\/\$CANDIDATE_BRANCH"/, 'promotion may first publish only the run-scoped candidate branch');
  requireAbsent(errors, helper, /repos\/\$REPO\/pulls/, 'promotion must not depend on pull-request creation or merge authority');
  requireMatch(errors, helper, /actions\/workflows\/ci\.yml\/dispatches/, 'promotion must dispatch Release checks explicitly');
  requireMatch(errors, helper, /actions\/workflows\/no-magic-human-gate\.yml\/dispatches/, 'promotion must dispatch No magic human gate explicitly');
  requireMatch(errors, helper, /assert_check_success 'release-check'/, 'promotion must bind the stable Release checks context');
  requireMatch(errors, helper, /assert_check_success 'no-magic-human-gate'/, 'promotion must bind the stable No magic human gate context');
  requireMatch(errors, helper, /\.app\.slug == "github-actions"/, 'promotion must bind successful checks to the GitHub Actions app');
  requireMatch(errors, helper, /\.status == "ahead" and \.ahead_by == 1 and \.behind_by == 0 and \.total_commits == 1/, 'remote comparison must remain exactly one commit ahead and zero behind');
  requireMatch(errors, helper, /test "\$\(jq -r '\.parents \| length' "\$RECEIPT_DIR\/candidate-commit\.json"\)" = '1'/, 'remote candidate receipt must contain exactly one parent');
  requireMatch(errors, helper, /test "\$\(jq -r '\.parents\[0\]\.sha' "\$RECEIPT_DIR\/candidate-commit\.json"\)" = "\$BASE_SHA"/, 'remote candidate receipt must bind its parent to the leased base');
  requireMatch(errors, helper, /git push --porcelain origin "\$CANDIDATE_SHA:refs\/heads\/main"/, 'promotion must advance main only to the exact qualified candidate');
  requireAbsent(errors, helper, /git push[^\n]*(?:--force|-f(?:\s|$)|\+)/, 'promotion must never force-update a ref');
  requireMatch(errors, helper, /MAIN_UPDATE='attempting'[\s\S]*MAIN_SHA="\$\(gh api "repos\/\$REPO\/git\/ref\/heads\/main" --jq \.object\.sha\)"[\s\S]*test "\$MAIN_SHA" = "\$CANDIDATE_SHA"[\s\S]*MAIN_UPDATE='complete'/, 'main advancement must be observed and bound to the exact candidate');
  requireMatch(errors, helper, /remote_candidate" == "\$CANDIDATE_SHA"/, 'cleanup may delete a candidate ref only while it retains the leased SHA');
  requireMatch(errors, helper, /cleanup-branch-refused\.txt/, 'cleanup must record and refuse a moved candidate ref');
  requireAbsent(errors, helper, /branches\/main\/protection|repos\/\$REPO\/rulesets/, 'scheduled promotion must not mutate branch policy');

  requireOrdered(errors, helper, [
    "STAGE='dispatch-required-checks'",
    "STAGE='qualify-exact-candidate'",
    "STAGE='revalidate-lease-and-remote-denominator'",
    "STAGE='advance-qualified-main'",
    "STAGE='verify-main-update'"
  ], 'required checks, lease revalidation, main advancement, and final verification must occur in that order');

  return errors;
}

const canonical = load();
assert.deepEqual(validateScheduledCrawlPromotion(canonical), [], 'canonical scheduled-crawl promotion contract must validate');

const mutations = [
  ['restore generic no-magic check name', (c) => { c.noMagic = c.noMagic.replace('  no-magic-human-gate:', '  validate:'); }],
  ['remove the release-gate contract test', (c) => { c.release = c.release.replace('      - name: Run scheduled crawler promotion contract tests\n        run: node test/scheduled-crawl-promotion.test.js\n', ''); }],
  ['reintroduce a direct workflow push', (c) => { c.official += '\n      - run: git push origin main\n'; }],
  ['remove actions dispatch authority', (c) => { c.industrial = c.industrial.replace('      actions: write\n', ''); }],
  ['remove contents update authority', (c) => { c.official = c.official.replace('      contents: write\n', ''); }],
  ['reintroduce pull-request authority', (c) => { c.official = c.official.replace('      contents: write\n', '      contents: write\n      pull-requests: write\n'); }],
  ['split the crawler concurrency lock', (c) => { c.official = c.official.replace('scheduled-crawl-main-promotion', 'official-only-promotion'); }],
  ['allow shallow candidate ancestry', (c) => { c.industrial = c.industrial.replace('          fetch-depth: 0', '          fetch-depth: 1'); }],
  ['misbind the official promotion kind', (c) => { c.official = c.official.replace('PROMOTION_KIND: official-record', 'PROMOTION_KIND: industrial-exhaust'); }],
  ['broaden industrial intake roots', (c) => { c.helper = c.helper.replace("ALLOWED_ROOTS=('data/exhaust' 'receipts/exhaust')", "ALLOWED_ROOTS=('data' 'receipts')"); }],
  ['drop run-attempt branch uniqueness', (c) => { c.helper = c.helper.replace('-${RUN_ATTEMPT}', ''); }],
  ['remove exact-main lease refusal', (c) => { c.helper = c.helper.replaceAll('test "$(git rev-parse origin/main)" = "$BASE_SHA"', 'true # main lease removed'); }],
  ['skip No magic workflow dispatch', (c) => { c.helper = c.helper.replace('gh api --method POST "repos/$REPO/actions/workflows/no-magic-human-gate.yml/dispatches"', 'echo skipped-no-magic'); }],
  ['bind a generic no-magic check', (c) => { c.helper = c.helper.replaceAll("assert_check_success 'no-magic-human-gate'", "assert_check_success 'validate'"); }],
  ['drop check app binding', (c) => { c.helper = c.helper.replace('and .app.slug == "github-actions"', 'and true'); }],
  ['weaken remote one-commit topology', (c) => { c.helper = c.helper.replace('and .ahead_by == 1 and .behind_by == 0 and .total_commits == 1', 'and .ahead_by >= 1'); }],
  ['advance main to the base instead of candidate', (c) => { c.helper = c.helper.replace('"$CANDIDATE_SHA:refs/heads/main"', '"$BASE_SHA:refs/heads/main"'); }],
  ['force-update main', (c) => { c.helper = c.helper.replace('git push --porcelain origin', 'git push --porcelain --force origin'); }],
  ['delete a moved candidate ref', (c) => { c.helper = c.helper.replace('if [[ "$remote_candidate" == "$CANDIDATE_SHA" ]]; then', 'if [[ -n "$remote_candidate" ]]; then'); }],
  ['let scheduled promotion mutate policy', (c) => { c.helper += '\ngh api --method PUT "repos/$REPO/branches/main/protection"\n'; }],
  ['advance main before exact check qualification', (c) => {
    c.helper = c.helper.replace("STAGE='dispatch-required-checks'", "STAGE='temporary-swap-marker'")
      .replace("STAGE='advance-qualified-main'", "STAGE='dispatch-required-checks'")
      .replace("STAGE='temporary-swap-marker'", "STAGE='advance-qualified-main'");
  }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(canonical);
  mutate(candidate);
  const errors = validateScheduledCrawlPromotion(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

console.log(`scheduled-crawl-promotion.test: ${mutations.length} adversarial mutations PASS`);
