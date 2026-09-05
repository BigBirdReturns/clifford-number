#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REQUIRED = [
  ['.github/workflows/ci.yml', 'release-check'],
  ['.github/workflows/no-magic-human-gate.yml', 'no-magic-human-gate']
];
const ACTIVE = new Set(['queued', 'requested', 'waiting', 'pending', 'in_progress']);
const FAILED = new Set(['failure', 'cancelled', 'timed_out', 'startup_failure', 'stale']);
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const id = (value) => Number.isSafeInteger(value) && value > 0;

export function selectNativeRuns(runs, candidateSha, branch) {
  assert.ok(Array.isArray(runs), 'workflow run collection is missing');
  return REQUIRED.map(([path, name]) => ({ path, name, run: runs
    .filter((r) => r.path === path && r.event === 'pull_request'
      && r.head_sha === candidateSha && r.head_branch === branch)
    .sort((a, b) => b.id - a.id)[0] }));
}

// This is an admission observation, not authority to approve, mutate or merge.
export function inspectNativeAdmission(input) {
  const { repository, number, baseSha, candidateSha, branch, pr, runs,
    jobsByRun = {}, checksByJob = {} } = input;
  const observed = [];
  try {
    assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    assert.ok(id(number) && sha(baseSha) && sha(candidateSha), 'invalid PR or SHA lease');
    assert.match(branch, /^automation-crawl-(industrial-exhaust|official-record)-run-[0-9]+-[0-9]+$/);
    assert.equal(pr.number, number);
    assert.equal(pr.state, 'open');
    assert.equal(pr.draft, false);
    assert.equal(pr.merged, false);
    assert.equal(pr.head.sha, candidateSha);
    assert.equal(pr.head.ref, branch);
    assert.equal(pr.base.sha, baseSha);
    assert.equal(pr.base.ref, 'main');
    assert.equal(pr.head.repo.full_name, repository);
    assert.equal(pr.base.repo.full_name, repository);
    assert.ok(id(pr.base.repo.id));
    assert.equal(pr.head.repo.id, pr.base.repo.id);
    const created = Date.parse(pr.created_at);
    assert.ok(Number.isFinite(created), 'PR creation time is missing');

    for (const { path, name, run } of selectNativeRuns(runs, candidateSha, branch)) {
      if (!run) {
        observed.push({ path, name, state: 'missing', run_id: null });
        continue;
      }
      assert.ok(id(run.id) && id(run.run_attempt) && id(run.check_suite_id));
      assert.equal(run.repository.id, pr.base.repo.id);
      assert.equal(run.head_repository.id, pr.base.repo.id);
      assert.ok(Date.parse(run.created_at) >= created, 'native run predates the PR');
      const row = { path, name, run_id: run.id, run_attempt: run.run_attempt,
        check_suite_id: run.check_suite_id, status: run.status, conclusion: run.conclusion };
      // GitHub can return [] even for a successful native PR run. The direct
      // PR/repository/branch/SHA lease and run/job/check chain stay mandatory.
      // Missing, malformed or contradictory association data is not ignored.
      assert.ok(Array.isArray(run.pull_requests), 'native PR association collection is missing');
      assert.ok(run.pull_requests.length <= 1, 'native PR association is ambiguous');
      for (const linked of run.pull_requests) {
        assert.equal(linked.number, number, 'native PR association number contradicts the lease');
        assert.equal(linked.head.sha, candidateSha, 'native PR association head contradicts the lease');
        assert.equal(linked.base.sha, baseSha, 'native PR association base contradicts the lease');
      }
      row.pr_association = run.pull_requests.length === 0 ? 'not_returned' : 'exact';
      observed.push(row);
      if (run.status === 'action_required' || run.conclusion === 'action_required') {
        row.state = 'approval_required';
        continue;
      }
      if (ACTIVE.has(run.status) && run.conclusion === null) {
        row.state = 'pending';
        continue;
      }
      assert.equal(run.status, 'completed', 'unrecognized native run state');
      if (FAILED.has(run.conclusion)) {
        row.state = 'failed';
        continue;
      }
      assert.equal(run.conclusion, 'success', 'native run did not succeed');
      const jobs = jobsByRun[run.id];
      assert.ok(Array.isArray(jobs), 'native job collection is missing');
      const matches = jobs.filter((j) => j.name === name);
      assert.equal(matches.length, 1, 'native required job is missing or ambiguous');
      const job = matches[0];
      assert.ok(id(job.id));
      assert.equal(job.run_id, run.id);
      assert.equal(job.run_attempt, run.run_attempt);
      assert.equal(job.head_sha, candidateSha);
      assert.equal(job.status, 'completed');
      assert.equal(job.conclusion, 'success');
      const check = checksByJob[job.id];
      assert.ok(check && id(check.id), 'native check receipt is missing');
      assert.equal(job.check_run_url, `https://api.github.com/repos/${repository}/check-runs/${check.id}`);
      assert.equal(check.name, name);
      assert.equal(check.head_sha, candidateSha);
      assert.equal(check.check_suite.id, run.check_suite_id);
      assert.equal(check.app.id, 15368, 'native check is not from GitHub Actions');
      assert.equal(check.status, 'completed');
      assert.equal(check.conclusion, 'success');
      assert.equal(check.details_url, `https://github.com/${repository}/actions/runs/${run.id}/job/${job.id}`);
      row.state = 'success';
      row.job_id = job.id;
      row.check_id = check.id;
    }
    const states = observed.map((r) => r.state);
    const decision = states.includes('failed') ? 'failed'
      : states.every((s) => s === 'success') ? 'ready'
        : states.includes('approval_required') ? 'awaiting_approval' : 'pending';
    return { schema_version: 1, decision, repository, pull_request: number,
      base_sha: baseSha, candidate_sha: candidateSha, candidate_branch: branch, native_runs: observed };
  } catch (error) {
    return { schema_version: 1, decision: 'indeterminate', repository, pull_request: number,
      base_sha: baseSha, candidate_sha: candidateSha, candidate_branch: branch,
      reason: error.message, native_runs: observed };
  }
}

function api(endpoint, paginate = false) {
  const args = ['api', '--method', 'GET', endpoint, ...(paginate ? ['--paginate', '--slurp'] : [])];
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] }));
}

export function readNativeAdmission(repository, number, baseSha, candidateSha, branch, read = api) {
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.ok(id(number) && sha(baseSha) && sha(candidateSha));
  const root = `repos/${repository}`;
  const pr = read(`${root}/pulls/${number}`);
  const pages = read(`${root}/actions/runs?head_sha=${candidateSha}&event=pull_request&per_page=100`, true);
  const runs = pages.flatMap((p) => {
    assert.ok(Array.isArray(p.workflow_runs));
    return p.workflow_runs;
  });
  const jobsByRun = {}, checksByJob = {};
  for (const { name, run } of selectNativeRuns(runs, candidateSha, branch)) {
    if (!run || run.status !== 'completed' || run.conclusion !== 'success') continue;
    assert.ok(id(run.id) && id(run.run_attempt));
    const jobs = read(`${root}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`, true)
      .flatMap((p) => { assert.ok(Array.isArray(p.jobs)); return p.jobs; });
    jobsByRun[run.id] = jobs;
    for (const job of jobs.filter((j) => j.name === name)) {
      const prefix = `https://api.github.com/${root}/check-runs/`;
      assert.ok(typeof job.check_run_url === 'string' && job.check_run_url.startsWith(prefix));
      const checkId = job.check_run_url.slice(prefix.length);
      assert.match(checkId, /^[1-9][0-9]*$/);
      checksByJob[job.id] = read(`${root}/check-runs/${checkId}`);
    }
  }
  return inspectNativeAdmission({ repository, number, baseSha, candidateSha, branch, pr: read(`${root}/pulls/${number}`), runs, jobsByRun, checksByJob });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  try {
    assert.equal(process.argv.length, 7, 'expected repository, PR, base, candidate and branch');
    const [, , repository, number, baseSha, candidateSha, branch] = process.argv;
    result = readNativeAdmission(repository, Number(number), baseSha, candidateSha, branch);
  } catch (error) {
    result = { schema_version: 1, decision: 'indeterminate', reason: error.message };
  }
  console.log(JSON.stringify(result, null, 2));
}
