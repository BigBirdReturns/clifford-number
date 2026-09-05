import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectResumptionTrigger, runScheduledCrawlResumption,
  selectOpenCrawlerPullRequest } from '../.github/scripts/resume-scheduled-crawl-admission.mjs';

const clone = (value) => structuredClone(value);
const baseSha = 'a'.repeat(40);
const candidateSha = 'b'.repeat(40);
const mergeSha = 'c'.repeat(40);
const candidateTree = 'd'.repeat(40);
const repository = 'test-owner/test-repository';
const number = 12;

function fixture(kind = 'official-record') {
  const branch = `automation-crawl-${kind}-run-100-1`;
  const repo = { id: 123, full_name: repository };
  const pr = { number, state: 'open', draft: false, merged: false, commits: 1,
    created_at: '2026-09-05T00:00:00Z', user: { login: 'github-actions[bot]' },
    head: { sha: candidateSha, ref: branch, repo },
    base: { sha: baseSha, ref: 'main', repo } };
  const event = { workflow_run: { id: 91, run_attempt: 1,
    path: '.github/workflows/ci.yml', name: 'Release checks', event: 'pull_request',
    status: 'completed', conclusion: 'success', head_sha: candidateSha, head_branch: branch } };
  const paths = kind === 'official-record'
    ? ['data/crawl/state.json'] : ['data/exhaust/index.jsonl'];
  const runs = [], jobs = {}, checks = {};
  for (const [i, path, name] of [
    [1, '.github/workflows/ci.yml', 'release-check'],
    [2, '.github/workflows/no-magic-human-gate.yml', 'no-magic-human-gate']
  ]) {
    const run = { id: 100 + i, run_attempt: 1, check_suite_id: 200 + i,
      path, name: name === 'release-check' ? 'Release checks' : 'No magic human gate',
      event: 'pull_request', head_sha: candidateSha, head_branch: branch,
      repository: repo, head_repository: repo, created_at: '2026-09-05T00:00:01Z',
      status: 'completed', conclusion: 'success', pull_requests: [] };
    const job = { id: 300 + i, run_id: run.id, run_attempt: 1,
      head_sha: candidateSha, name, status: 'completed', conclusion: 'success',
      check_run_url: `https://api.github.com/repos/${repository}/check-runs/${400 + i}` };
    const check = { id: 400 + i, name, head_sha: candidateSha,
      status: 'completed', conclusion: 'success', app: { id: 15368 },
      check_suite: { id: run.check_suite_id },
      details_url: `https://github.com/${repository}/actions/runs/${run.id}/job/${job.id}` };
    runs.push(run); jobs[run.id] = [job]; checks[job.id] = check;
  }
  return { kind, branch, repo, pr, event, paths, runs, jobs, checks };
}

function createIo(f, options = {}) {
  const calls = [], records = {};
  let merged = false, deleted = false, closed = false;
  let mainReads = 0, prReads = 0;
  const root = `repos/${repository}`;
  const io = {
    repository,
    read(endpoint, paginated = false) {
      calls.push({ type: 'read', endpoint, paginated });
      if (endpoint === `${root}/pulls?state=open&base=main&per_page=100`) {
        return options.noPull ? [[]] : [[clone(f.pr)]];
      }
      if (endpoint === `${root}/pulls/${number}`) {
        prReads++;
        const value = clone(f.pr);
        if (closed) value.state = 'closed';
        if (options.prBaseMoved) value.base.sha = 'e'.repeat(40);
        if (options.movePrOnFinal && prReads >= 4) value.head.sha = 'e'.repeat(40);
        return value;
      }
      if (endpoint === `${root}/git/ref/heads/main`) {
        mainReads++;
        const moved = options.mainMoved || options.prBaseMoved || (options.moveMainOnFinal && mainReads >= 2);
        return { object: { sha: merged ? mergeSha : moved ? 'e'.repeat(40) : baseSha } };
      }
      if (endpoint === `${root}/git/ref/heads/${f.branch}`) {
        return { object: { sha: options.candidateMoved ? 'e'.repeat(40) : candidateSha } };
      }
      if (endpoint === `${root}/git/commits/${candidateSha}`) {
        return { sha: candidateSha, tree: { sha: candidateTree },
          parents: options.extraParent ? [{ sha: baseSha }, { sha: 'e'.repeat(40) }] : [{ sha: baseSha }] };
      }
      if (endpoint === `${root}/compare/${baseSha}...${candidateSha}`) {
        const comparisonPaths = options.comparisonPaths || f.paths;
        return { status: 'ahead', ahead_by: 1, behind_by: 0, total_commits: 1,
          files: comparisonPaths.map((filename, index) => ({ filename, ...(options.previousFilename && index === 0 ? { previous_filename: options.previousFilename } : {}) })) };
      }
      if (endpoint === `${root}/actions/runs?head_sha=${candidateSha}&event=pull_request&per_page=100`) {
        return [{ workflow_runs: clone(f.runs) }];
      }
      for (const run of f.runs) {
        if (endpoint === `${root}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`) {
          return [{ jobs: clone(f.jobs[run.id]) }];
        }
        for (const job of f.jobs[run.id] || []) {
          if (endpoint === `${root}/check-runs/${f.checks[job.id].id}`) return clone(f.checks[job.id]);
        }
      }
      if (endpoint === `${root}/git/commits/${mergeSha}`) {
        return { sha: mergeSha,
          tree: { sha: options.wrongMergeTree ? 'e'.repeat(40) : candidateTree },
          parents: options.wrongMergeParents
            ? [{ sha: baseSha }, { sha: 'e'.repeat(40) }]
            : [{ sha: baseSha }, { sha: candidateSha }] };
      }
      throw new Error(`unexpected read: ${endpoint}`);
    },
    write(method, endpoint, body) {
      calls.push({ type: 'write', method, endpoint, body: clone(body) });
      if (method === 'PATCH' && endpoint === `${root}/pulls/${number}`) {
        closed = true;
        return { ...clone(f.pr), state: 'closed' };
      }
      if (method === 'PUT' && endpoint === `${root}/pulls/${number}/merge`) {
        if (options.mergeRejected) return { merged: false, message: 'blocked' };
        merged = true;
        return { merged: true, sha: mergeSha };
      }
      throw new Error(`unexpected write: ${method} ${endpoint}`);
    },
    changedPaths(observedBase, observedCandidate, branch) {
      calls.push({ type: 'git-diff', observedBase, observedCandidate, branch });
      assert.equal(observedBase, baseSha);
      assert.equal(observedCandidate, candidateSha);
      assert.equal(branch, f.branch);
      return clone(f.paths);
    },
    deleteRef(branch, expectedSha) {
      calls.push({ type: 'delete', branch, expectedSha });
      assert.equal(branch, f.branch);
      assert.equal(expectedSha, candidateSha);
      if (options.deleteFails) throw new Error('leased retirement failed');
      deleted = true;
      return { branch, expected_sha: expectedSha, remote_absent: true };
    },
    record(name, value) {
      records[name] = clone(value);
    }
  };
  return { io, calls, records,
    state: () => ({ merged, deleted, closed, mainReads, prReads }) };
}

function runCase(name, change, expected, options = {}) {
  const f = fixture(options.kind);
  if (change) change(f);
  const harness = createIo(f, options);
  const result = runScheduledCrawlResumption(f.event, harness.io);
  assert.equal(result.outcome, expected, `${name}: ${JSON.stringify(result)}`);
  return { f, harness, result };
}

let count = 0;
for (const kind of ['official-record', 'industrial-exhaust']) {
  const { harness, result } = runCase(`ready ${kind}`, null, 'merged', { kind });
  assert.equal(result.exit_code, 0);
  assert.deepEqual(harness.state(), { merged: true, deleted: true, closed: false, mainReads: 3, prReads: 4 });
  assert.equal(harness.calls.filter((c) => c.type === 'write' && c.method === 'PUT').length, 1);
  count++;
}
{
  const f = fixture();
  f.event.workflow_run.event = 'workflow_dispatch';
  const h = createIo(f);
  const result = runScheduledCrawlResumption(f.event, h.io);
  assert.equal(result.outcome, 'ignored');
  assert.equal(h.calls.length, 0);
  count++;
}
{
  const f = fixture();
  f.event.workflow_run.path = '.github/workflows/other.yml';
  const h = createIo(f);
  assert.equal(runScheduledCrawlResumption(f.event, h.io).outcome, 'ignored');
  assert.equal(h.calls.length, 0);
  count++;
}
{
  const f = fixture();
  f.event.workflow_run.name = 'Wrong name';
  const h = createIo(f);
  const result = runScheduledCrawlResumption(f.event, h.io);
  assert.equal(result.outcome, 'indeterminate');
  assert.equal(result.exit_code, 1);
  assert.equal(h.calls.length, 0);
  count++;
}
{
  const { harness } = runCase('no exact PR', null, 'ignored', { noPull: true });
  assert.equal(harness.calls.filter((c) => c.type !== 'read').length, 0);
  count++;
}
for (const [label, status, conclusion, expected] of [
  ['pending', 'waiting', null, 'pending'],
  ['approval', 'action_required', null, 'awaiting_approval']
]) {
  const { harness, result } = runCase(label, (f) => {
    f.runs[0].status = status;
    f.runs[0].conclusion = conclusion;
    delete f.jobs[f.runs[0].id];
  }, expected);
  assert.equal(result.exit_code, 0);
  assert.deepEqual(harness.state(), { merged: false, deleted: false, closed: false, mainReads: 1, prReads: 3 });
  assert.equal(harness.calls.some((c) => c.type === 'write'), false);
  count++;
}
{
  const { harness, result } = runCase('missing association is indeterminate', (f) => {
    delete f.runs[0].pull_requests;
  }, 'indeterminate_preserved');
  assert.equal(result.exit_code, 1);
  assert.deepEqual(harness.state(), { merged: false, deleted: false, closed: false, mainReads: 1, prReads: 3 });
  count++;
}
{
  const { harness, result } = runCase('native failure is cleaned', (f) => {
    f.runs[0].conclusion = 'failure';
    delete f.jobs[f.runs[0].id];
  }, 'native_checks_failed_cleaned');
  assert.equal(result.exit_code, 1);
  assert.deepEqual(harness.state(), { merged: false, deleted: true, closed: true, mainReads: 1, prReads: 4 });
  count++;
}
{
  const { harness, result } = runCase('stale base is cleaned', null, 'stale_base_cleaned', { mainMoved: true });
  assert.equal(result.exit_code, 1);
  assert.deepEqual(harness.state(), { merged: false, deleted: true, closed: true, mainReads: 1, prReads: 2 });
  count++;
}
{
  const { harness, result } = runCase('moving PR base is reconciled to the immutable candidate parent',
    null, 'stale_base_cleaned', { prBaseMoved: true });
  assert.equal(result.base_sha, baseSha);
  assert.equal(result.observed_pull_request_base_sha, 'e'.repeat(40));
  assert.deepEqual(harness.state(), { merged: false, deleted: true, closed: true, mainReads: 1, prReads: 2 });
  count++;
}
for (const [label, change, options, pattern] of [
  ['forbidden path', (f) => { f.paths.push('graph.json'); }, {}, /forbidden path/],
  ['truncated comparison hides forbidden path', (f) => { f.paths.push('graph.json'); },
    { comparisonPaths: ['data/crawl/state.json'] }, /forbidden path/],
  ['renamed source outside the crawler roots is visible', null,
    { previousFilename: 'graph.json' }, /comparison path is absent/],
  ['extra candidate parent', null, { extraParent: true }, /exactly one parent/],
  ['moved candidate ref', null, { candidateMoved: true }, /candidate ref moved/],
  ['main moves before merge', null, { moveMainOnFinal: true }, /main moved/],
  ['PR moves before merge', null, { movePrOnFinal: true }, /Expected values to be strictly equal/]
]) {
  const f = fixture();
  if (change) change(f);
  const h = createIo(f, options);
  assert.throws(() => runScheduledCrawlResumption(f.event, h.io), pattern, label);
  if (!['merge refusal', 'wrong merge parents', 'wrong merge tree'].includes(label)) {
    assert.equal(h.calls.some((c) => c.type === 'write'), false, `${label} wrote before validation`);
  }
  assert.equal(h.state().deleted, false, `${label} deleted the candidate`);
  count++;
}
{
  const { harness, result } = runCase('merge refusal is recorded', null,
    'merge_refused', { mergeRejected: true });
  assert.equal(result.exit_code, 1);
  assert.deepEqual(harness.state(), { merged: false, deleted: false, closed: false, mainReads: 2, prReads: 4 });
  count++;
}
for (const [label, options] of [
  ['wrong merge parents', { wrongMergeParents: true }],
  ['wrong merge tree', { wrongMergeTree: true }]
]) {
  const { harness, result } = runCase(label, null, 'merge_verification_failed', options);
  assert.equal(result.exit_code, 1);
  assert.equal(result.cleanup, 'not_attempted');
  assert.deepEqual(harness.state(), { merged: true, deleted: false, closed: false, mainReads: 2, prReads: 4 });
  count++;
}
{
  const { harness, result } = runCase('merge retirement failure is recorded', null,
    'merged_cleanup_incomplete', { deleteFails: true });
  assert.equal(result.exit_code, 1);
  assert.equal(result.cleanup, 'incomplete');
  assert.deepEqual(harness.state(), { merged: true, deleted: false, closed: false, mainReads: 3, prReads: 4 });
  count++;
}
{
  const { harness, result } = runCase('native cleanup failure is recorded', (f) => {
    f.runs[0].conclusion = 'failure';
    delete f.jobs[f.runs[0].id];
  }, 'native_checks_failed_cleanup_incomplete', { deleteFails: true });
  assert.equal(result.pull_request_closed, true);
  assert.deepEqual(harness.state(), { merged: false, deleted: false, closed: true, mainReads: 1, prReads: 4 });
  count++;
}
{
  const f = fixture();
  f.pr.user.login = 'other';
  const h = createIo(f);
  assert.equal(runScheduledCrawlResumption(f.event, h.io).outcome, 'ignored');
  assert.equal(h.calls.some((c) => c.type === 'write'), false);
  count++;
}
{
  const f = fixture();
  assert.throws(() => selectOpenCrawlerPullRequest([f.pr, clone(f.pr)],
    repository, f.branch, candidateSha), /multiple open pull requests/);
  count++;
}
{
  const f = fixture();
  f.runs[0].pull_requests = [clone(f.pr)];
  const h = createIo(f);
  const result = runScheduledCrawlResumption(f.event, h.io);
  assert.equal(result.outcome, 'merged');
  assert.equal(result.native_admission.native_runs[0].pr_association, 'exact');
  count++;
}
{
  const f = fixture();
  f.runs[0].pull_requests = [{ ...clone(f.pr), number: 99 }];
  const h = createIo(f);
  const result = runScheduledCrawlResumption(f.event, h.io);
  assert.equal(result.outcome, 'indeterminate_preserved');
  assert.equal(h.calls.some((c) => c.type === 'write'), false);
  count++;
}

assert.equal(inspectResumptionTrigger({}).decision, 'ignored');
count++;

const workflow = readFileSync(new URL('../.github/workflows/resume-scheduled-crawl-admission.yml', import.meta.url), 'utf8');
assert.match(workflow, /workflow_run:\n    workflows:\n      - Release checks\n      - No magic human gate/);
assert.match(workflow, /permissions:\n  contents: read/);
assert.match(workflow, /group: scheduled-crawl-main-promotion\n  cancel-in-progress: false/);
assert.match(workflow, /actions: read\n      checks: read\n      contents: write\n      pull-requests: write/);
assert.match(workflow, /outputs:\n      outcome: \$\{\{ steps\.receipt\.outputs\.outcome \}\}/);
assert.match(workflow, /ref: main\n          fetch-depth: 0/);
assert.match(workflow, /run: node \.github\/scripts\/resume-scheduled-crawl-admission\.mjs/);
assert.match(workflow, /Classify resumption receipt[\s\S]*jq -er \.outcome/);
assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/scheduled-crawl-resumption-receipt/);
assert.match(workflow, /dispatch-official-fanout:[\s\S]*needs\.resume\.outputs\.outcome == 'merged'[\s\S]*needs\.resume\.outputs\.promotion_kind == 'official-record'/);
assert.match(workflow, /actions: write\n      contents: read[\s\S]*research-fanout\.yml\/dispatches/);
assert.equal((workflow.match(/actions: write/g) || []).length, 1);
assert.doesNotMatch(workflow, /secrets\.[A-Za-z_]/);
assert.doesNotMatch(workflow, /pull_request_target|branches\/main\/protection|rulesets/);
const source = readFileSync(new URL('../.github/scripts/resume-scheduled-crawl-admission.mjs', import.meta.url), 'utf8');
assert.match(source, /\['diff', '--no-renames', '--name-only', '-z', baseSha, candidateSha/);
assert.match(source, /previous_filename/);
assert.match(source, /candidate parent/);
assert.match(source, /allowBaseDrift: true/);
assert.match(source, /exact changed paths/);
assert.doesNotMatch(source, /branches\/main\/protection|repos\/\$\{repository\}\/rulesets/);
assert.doesNotMatch(source, /git[^\n]*push[^\n]*(?:refs\/heads\/main|:main)/);
count++;
console.log(`scheduled-crawl-resumption.test: ${count} resumption and workflow cases PASS`);
