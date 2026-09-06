import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  crawlerNamespacePulls,
  selectWatchdogCandidate,
  selectWatchdogTriggerRun
} from '../.github/scripts/watch-scheduled-crawl-admission.mjs';

const repository = 'test-owner/test-repository';
const candidateSha = 'b'.repeat(40);
const baseSha = 'a'.repeat(40);
const branch = 'automation-crawl-industrial-exhaust-run-100-1';

function pull(overrides = {}) {
  const repo = { id: 123, full_name: repository };
  const value = {
    number: 12,
    state: 'open',
    draft: false,
    user: { login: 'github-actions[bot]' },
    head: { ref: branch, sha: candidateSha, repo: { ...repo } },
    base: { ref: 'main', sha: baseSha, repo: { ...repo } }
  };
  return Object.assign(value, overrides);
}

function run(overrides = {}) {
  const repo = { id: 123, full_name: repository };
  return {
    id: 91,
    run_attempt: 1,
    name: 'Release checks',
    path: '.github/workflows/ci.yml',
    event: 'pull_request',
    status: 'completed',
    conclusion: 'success',
    head_branch: branch,
    head_sha: candidateSha,
    repository: { ...repo },
    head_repository: { ...repo },
    created_at: '2026-09-06T20:00:00Z',
    updated_at: '2026-09-06T20:01:00Z',
    ...overrides
  };
}

let count = 0;

assert.deepEqual(crawlerNamespacePulls([pull(), {
  head: { ref: 'agent/ordinary-product' }
}]).map((entry) => entry.number), [12]);
count++;

assert.equal(selectWatchdogCandidate([], repository), null);
count++;

{
  const selected = selectWatchdogCandidate([pull()], repository);
  assert.deepEqual(selected, {
    number: 12,
    branch,
    candidateSha,
    kind: 'industrial-exhaust'
  });
  count++;
}

assert.throws(() => selectWatchdogCandidate([pull(), pull({ number: 13 })], repository),
  /multiple open crawler pull requests/);
count++;

for (const [label, mutate, pattern] of [
  ['foreign author', (value) => { value.user.login = 'other'; }, /foreign author/],
  ['draft candidate', (value) => { value.draft = true; }, /is a draft/],
  ['foreign head repository', (value) => { value.head.repo.full_name = 'other/repository'; },
    /foreign head repository/],
  ['foreign base repository', (value) => { value.base.repo.full_name = 'other/repository'; },
    /foreign base repository/],
  ['different repository ids', (value) => { value.head.repo.id = 999; },
    /repository ids disagree|share one identity/],
  ['invalid candidate SHA', (value) => { value.head.sha = 'not-a-sha'; },
    /not a commit SHA/],
  ['invalid pull number', (value) => { value.number = 0; },
    /number is invalid/]
]) {
  const value = pull();
  mutate(value);
  assert.throws(() => selectWatchdogCandidate([value], repository), pattern, label);
  count++;
}

{
  const candidate = selectWatchdogCandidate([pull()], repository);
  const earlier = run();
  const later = run({
    id: 92,
    name: 'No magic human gate',
    path: '.github/workflows/no-magic-human-gate.yml',
    run_attempt: 2,
    updated_at: '2026-09-06T20:02:00Z'
  });
  assert.equal(selectWatchdogTriggerRun([earlier, later], repository, candidate).id, 92);
  count++;
}

{
  const candidate = selectWatchdogCandidate([pull()], repository);
  const queued = run({ status: 'queued', conclusion: null });
  const unrelated = run({ path: '.github/workflows/other.yml', name: 'Other' });
  assert.equal(selectWatchdogTriggerRun([queued, unrelated], repository, candidate), null);
  count++;
}

{
  const candidate = selectWatchdogCandidate([pull()], repository);
  assert.throws(() => selectWatchdogTriggerRun([
    run({ name: 'Wrong name' })
  ], repository, candidate), /name\/path mismatch/);
  count++;
}

{
  const candidate = selectWatchdogCandidate([pull()], repository);
  assert.throws(() => selectWatchdogTriggerRun([
    run({ repository: { id: 321, full_name: 'other/repository' } })
  ], repository, candidate), /foreign repository/);
  count++;
}

{
  const candidate = selectWatchdogCandidate([pull()], repository);
  assert.throws(() => selectWatchdogTriggerRun([
    run({ run_attempt: 0 })
  ], repository, candidate), /attempt is invalid/);
  count++;
}

{
  const candidate = selectWatchdogCandidate([pull()], repository);
  const otherBranch = run({ head_branch: 'automation-crawl-industrial-exhaust-run-200-1' });
  assert.equal(selectWatchdogTriggerRun([otherBranch], repository, candidate), null);
  count++;
}

const workflow = readFileSync(
  new URL('../.github/workflows/resume-scheduled-crawl-admission.yml', import.meta.url),
  'utf8'
);
assert.match(workflow, /schedule:\n    - cron: '3-58\/5 \* \* \* \*'/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /github\.event_name == 'schedule'/);
assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
assert.match(workflow, /watch-scheduled-crawl-admission\.mjs/);
assert.match(workflow, /ref: main\n          fetch-depth: 0/);
assert.match(workflow, /group: scheduled-crawl-main-promotion\n  cancel-in-progress: false/);
assert.equal((workflow.match(/actions: write/g) || []).length, 1);
assert.doesNotMatch(workflow, /secrets\.[A-Za-z_]/);
assert.doesNotMatch(workflow, /pull_request_target|branches\/main\/protection|rulesets/);
count++;

const source = readFileSync(
  new URL('../.github/scripts/watch-scheduled-crawl-admission.mjs', import.meta.url),
  'utf8'
);
assert.match(source, /\['api', '--method', 'GET'/);
assert.match(source, /GITHUB_EVENT_PATH: eventPath/);
assert.match(source, /resume-scheduled-crawl-admission\.mjs/);
assert.doesNotMatch(source, /--method', '(?:POST|PUT|PATCH|DELETE)'/);
assert.doesNotMatch(source, /branches\/main\/protection|rulesets|secrets\./);
count++;

console.log(`scheduled-crawl-watchdog.test: ${count} watchdog and workflow cases PASS`);
