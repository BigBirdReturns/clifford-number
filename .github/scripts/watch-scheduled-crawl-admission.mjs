#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REQUIRED = new Map([
  ['.github/workflows/ci.yml', 'Release checks'],
  ['.github/workflows/no-magic-human-gate.yml', 'No magic human gate']
]);
const BRANCH = /^automation-crawl-(industrial-exhaust|official-record)-run-[0-9]+-[0-9]+$/;
const SHA = /^[a-f0-9]{40}$/;
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

function flattenPages(value, key) {
  const pages = Array.isArray(value) ? value : [value];
  if (pages.every((page) => Array.isArray(page))) return pages.flat();
  return pages.flatMap((page) => {
    assert.ok(page && Array.isArray(page[key]), `missing ${key} page`);
    return page[key];
  });
}

function requireSha(value, label) {
  assert.match(value, SHA, `${label} is not a commit SHA`);
  return value;
}

export function assertWatchdogInvocation(eventName, event, repository) {
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
    return { event_name: eventName };
  }

  assert.equal(eventName, 'workflow_run',
    'watchdog requires schedule, workflow_dispatch, or an exact protected-main workflow completion');
  assert.equal(event?.action, 'completed', 'workflow_run watchdog action is not completed');
  const run = event?.workflow_run;
  assert.ok(run, 'workflow_run watchdog payload is missing');
  assert.equal(run.event, 'push', 'workflow_run watchdog trigger is not a push');
  assert.equal(run.status, 'completed', 'workflow_run watchdog trigger is not completed');
  assert.equal(run.conclusion, 'success', 'workflow_run watchdog trigger did not succeed');
  assert.equal(run.head_branch, 'main', 'workflow_run watchdog trigger is not on main');
  assert.ok(REQUIRED.has(run.path), 'workflow_run watchdog trigger is not a required workflow');
  assert.equal(run.name, REQUIRED.get(run.path), 'workflow_run watchdog name/path mismatch');
  assert.equal(run.repository?.full_name, repository,
    'workflow_run watchdog trigger has a foreign repository');
  assert.equal(run.head_repository?.full_name, repository,
    'workflow_run watchdog trigger has a foreign head repository');
  assert.ok(positiveInteger(run.repository?.id), 'workflow_run watchdog repository id is invalid');
  assert.equal(run.repository.id, run.head_repository?.id,
    'workflow_run watchdog repository ids disagree');
  assert.ok(positiveInteger(run.id), 'workflow_run watchdog run id is invalid');
  assert.ok(positiveInteger(run.run_attempt), 'workflow_run watchdog attempt is invalid');
  requireSha(run.head_sha, 'workflow_run watchdog head');

  return {
    event_name: eventName,
    action: event.action,
    trigger_run_id: run.id,
    trigger_run_attempt: run.run_attempt,
    trigger_workflow_name: run.name,
    trigger_workflow_path: run.path,
    trigger_head_sha: run.head_sha
  };
}

export function crawlerNamespacePulls(pulls) {
  assert.ok(Array.isArray(pulls), 'pull-request collection is missing');
  return pulls.filter((pr) => typeof pr?.head?.ref === 'string' && BRANCH.test(pr.head.ref));
}

export function selectWatchdogCandidate(pulls, repository) {
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  const matches = crawlerNamespacePulls(pulls);
  assert.ok(matches.length <= 1, 'multiple open crawler pull requests require disposition');
  if (matches.length === 0) return null;

  const pr = matches[0];
  assert.equal(pr.state, 'open', 'crawler pull request is not open');
  assert.equal(pr.draft, false, 'crawler pull request is a draft');
  assert.equal(pr.user?.login, 'github-actions[bot]', 'crawler pull request has a foreign author');
  assert.equal(pr.base?.ref, 'main', 'crawler pull request does not target main');
  assert.equal(pr.head?.repo?.full_name, repository, 'crawler pull request has a foreign head repository');
  assert.equal(pr.base?.repo?.full_name, repository, 'crawler pull request has a foreign base repository');
  assert.ok(positiveInteger(pr.head?.repo?.id), 'crawler head repository id is invalid');
  assert.equal(pr.head.repo.id, pr.base?.repo?.id, 'crawler repositories do not share one identity');
  assert.ok(positiveInteger(pr.number), 'crawler pull-request number is invalid');
  const branch = pr.head.ref;
  const match = branch.match(BRANCH);
  const candidateSha = requireSha(pr.head?.sha, 'crawler candidate head');
  return { number: pr.number, branch, candidateSha, kind: match[1] };
}

export function selectWatchdogTriggerRun(runs, repository, candidate) {
  assert.ok(Array.isArray(runs), 'workflow-run collection is missing');
  assert.ok(candidate && positiveInteger(candidate.number), 'watchdog candidate is missing');
  const exact = runs.filter((run) => run.event === 'pull_request'
    && run.head_branch === candidate.branch && run.head_sha === candidate.candidateSha
    && REQUIRED.has(run.path));
  for (const run of exact) {
    assert.equal(run.name, REQUIRED.get(run.path), 'required workflow name/path mismatch');
    assert.equal(run.repository?.full_name, repository, 'required workflow has a foreign repository');
    assert.equal(run.head_repository?.full_name, repository, 'required workflow has a foreign head repository');
    assert.equal(run.repository?.id, run.head_repository?.id, 'required workflow repository ids disagree');
    assert.ok(positiveInteger(run.id), 'required workflow run id is invalid');
    assert.ok(positiveInteger(run.run_attempt), 'required workflow attempt is invalid');
  }
  const completed = exact.filter((run) => run.status === 'completed');
  if (completed.length === 0) return null;
  completed.sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at || '');
    const rightTime = Date.parse(right.updated_at || right.created_at || '');
    assert.ok(Number.isFinite(leftTime) && Number.isFinite(rightTime),
      'required workflow timestamp is invalid');
    return rightTime - leftTime || right.run_attempt - left.run_attempt || right.id - left.id;
  });
  return completed[0];
}

function ghRead(endpoint, key) {
  const output = execFileSync('gh',
    ['api', '--method', 'GET', endpoint, '--paginate', '--slurp'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe'] });
  return flattenPages(JSON.parse(output), key);
}

function writeJson(directory, name, value) {
  writeFileSync(join(directory, name), `${JSON.stringify(value, null, 2)}\n`);
}

function terminal(directory, result) {
  writeJson(directory, 'result.json', result);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.exit_code;
}

function summarizePull(pr) {
  return {
    number: pr.number,
    state: pr.state,
    draft: pr.draft,
    author: pr.user?.login || null,
    head_ref: pr.head?.ref || null,
    head_sha: pr.head?.sha || null,
    head_repository: pr.head?.repo?.full_name || null,
    base_ref: pr.base?.ref || null,
    base_sha: pr.base?.sha || null,
    base_repository: pr.base?.repo?.full_name || null
  };
}

function summarizeRun(run) {
  return {
    id: run.id,
    run_attempt: run.run_attempt,
    name: run.name,
    path: run.path,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    head_branch: run.head_branch,
    head_sha: run.head_sha,
    repository: run.repository?.full_name || null,
    head_repository: run.head_repository?.full_name || null,
    created_at: run.created_at,
    updated_at: run.updated_at
  };
}

function runWatchdog() {
  const receiptDir = process.env.RUNNER_TEMP
    ? join(process.env.RUNNER_TEMP, 'scheduled-crawl-resumption-receipt')
    : join(process.cwd(), 'scheduled-crawl-resumption-receipt');
  mkdirSync(receiptDir, { recursive: true });
  try {
    const repository = process.env.GITHUB_REPOSITORY;
    const eventName = process.env.GITHUB_EVENT_NAME;
    let event = null;
    if (eventName === 'workflow_run') {
      assert.ok(process.env.GITHUB_EVENT_PATH, 'workflow_run watchdog event path is missing');
      event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    }
    const invocation = assertWatchdogInvocation(eventName, event, repository);
    writeJson(receiptDir, 'watchdog-invocation.json', invocation);
    const pulls = ghRead(`repos/${repository}/pulls?state=open&base=main&per_page=100`,
      'pull_requests');
    const namespaced = crawlerNamespacePulls(pulls);
    writeJson(receiptDir, 'watchdog-pull-census.json', {
      open_pull_request_count: pulls.length,
      crawler_namespace_count: namespaced.length,
      crawler_namespace: namespaced.map(summarizePull)
    });
    const candidate = selectWatchdogCandidate(pulls, repository);
    if (!candidate) {
      terminal(receiptDir, { schema_version: 1, outcome: 'ignored',
        reason: 'no open crawler candidate', repository, exit_code: 0 });
      return;
    }

    const runs = ghRead(
      `repos/${repository}/actions/runs?head_sha=${candidate.candidateSha}&event=pull_request&per_page=100`,
      'workflow_runs');
    const relevant = runs.filter((run) => run.head_branch === candidate.branch
      && run.head_sha === candidate.candidateSha && REQUIRED.has(run.path));
    writeJson(receiptDir, 'watchdog-run-census.json', {
      candidate,
      workflow_run_count: runs.length,
      required_candidate_runs: relevant.map(summarizeRun)
    });
    const trigger = selectWatchdogTriggerRun(runs, repository, candidate);
    if (!trigger) {
      terminal(receiptDir, { schema_version: 1, outcome: 'pending',
        reason: 'no completed required native workflow run', repository,
        promotion_kind: candidate.kind, pull_request: candidate.number,
        candidate_sha: candidate.candidateSha, candidate_branch: candidate.branch,
        exit_code: 0 });
      return;
    }

    const syntheticEvent = { workflow_run: trigger };
    const eventPath = join(receiptDir, 'watchdog-trigger-event.json');
    writeJson(receiptDir, 'watchdog-selected-trigger.json', summarizeRun(trigger));
    writeJson(receiptDir, 'watchdog-trigger-event.json', syntheticEvent);
    const resumer = fileURLToPath(new URL('./resume-scheduled-crawl-admission.mjs', import.meta.url));
    const child = spawnSync(process.execPath, [resumer], {
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
      stdio: 'inherit'
    });
    if (child.error) throw child.error;
    process.exitCode = Number.isInteger(child.status) ? child.status : 1;
  } catch (error) {
    terminal(receiptDir, { schema_version: 1, outcome: 'indeterminate_preserved',
      reason: error.message, exit_code: 1 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWatchdog();
}
