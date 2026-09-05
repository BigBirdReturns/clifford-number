import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectNativeAdmission, readNativeAdmission } from '../.github/scripts/inspect-scheduled-crawl-admission.mjs';

const clone = (value) => structuredClone(value);
function fixture(kind = 'official-record') {
  const repository = 'test-owner/test-repository';
  const baseSha = 'a'.repeat(40), candidateSha = 'b'.repeat(40);
  const branch = `automation-crawl-${kind}-run-100-1`, number = 12;
  const repo = { id: 123, full_name: repository };
  const pr = { number, state: 'open', draft: false, merged: false,
    created_at: '2026-09-05T00:00:00Z',
    head: { sha: candidateSha, ref: branch, repo }, base: { sha: baseSha, ref: 'main', repo } };
  const runs = [], jobsByRun = {}, checksByJob = {};
  for (const [i, path, name] of [
    [1, '.github/workflows/ci.yml', 'release-check'],
    [2, '.github/workflows/no-magic-human-gate.yml', 'no-magic-human-gate']
  ]) {
    const run = { id: 100 + i, run_attempt: 1, check_suite_id: 200 + i,
      path, event: 'pull_request', head_sha: candidateSha, head_branch: branch,
      repository: repo, head_repository: repo, created_at: '2026-09-05T00:00:01Z',
      status: 'completed', conclusion: 'success', pull_requests: [pr] };
    const job = { id: 300 + i, run_id: run.id, run_attempt: 1, head_sha: candidateSha,
      name, status: 'completed', conclusion: 'success',
      check_run_url: `https://api.github.com/repos/${repository}/check-runs/${400 + i}` };
    const check = { id: 400 + i, name, head_sha: candidateSha, app: { id: 15368 },
      check_suite: { id: run.check_suite_id }, status: 'completed', conclusion: 'success',
      details_url: `https://github.com/${repository}/actions/runs/${run.id}/job/${job.id}` };
    runs.push(run); jobsByRun[run.id] = [job]; checksByJob[job.id] = check;
  }
  return { repository, number, baseSha, candidateSha, branch, pr, runs, jobsByRun, checksByJob };
}

let count = 0;
function caseTest(name, change, expected = 'indeterminate') {
  const f = fixture();
  change(f);
  const report = inspectNativeAdmission(f);
  assert.equal(report.decision, expected, `${name}: ${JSON.stringify(report)}`);
  count++;
}
for (const kind of ['official-record', 'industrial-exhaust']) {
  const report = inspectNativeAdmission(fixture(kind));
  assert.equal(report.decision, 'ready');
  assert.equal(report.native_runs.length, 2);
  assert.ok(report.native_runs.every((r) => r.job_id && r.check_id));
  count++;
}

caseTest('dispatch checks alone cannot satisfy native admission', (f) => {
  f.runs.forEach((r) => { r.event = 'workflow_dispatch'; });
}, 'pending');
caseTest('explicit approval-required conclusion', (f) => {
  f.runs[0].conclusion = 'action_required'; delete f.jobsByRun[101];
}, 'awaiting_approval');
caseTest('explicit approval-required status', (f) => {
  f.runs[0].status = 'action_required'; f.runs[0].conclusion = null;
}, 'awaiting_approval');
for (const status of ['queued', 'requested', 'waiting', 'pending', 'in_progress']) {
  caseTest(`active state ${status} remains pending`, (f) => {
    f.runs[1].status = status; f.runs[1].conclusion = null;
  }, 'pending');
}
caseTest('missing original PR runs stay unqualified', (f) => { f.runs = []; }, 'pending');
caseTest('one missing workflow stays unqualified', (f) => { f.runs.pop(); }, 'pending');
for (const conclusion of ['failure', 'cancelled', 'timed_out', 'startup_failure', 'stale']) {
  caseTest(`terminal ${conclusion} is not an approval hold`, (f) => {
    f.runs[0].conclusion = conclusion;
  }, 'failed');
}
caseTest('failure dominates another pending workflow', (f) => {
  f.runs[0].conclusion = 'failure'; f.runs[1].conclusion = 'action_required';
}, 'failed');
caseTest('latest native run supersedes older success', (f) => {
  f.runs.push({ ...f.runs[0], id: 999, status: 'waiting', conclusion: null });
}, 'pending');
caseTest('foreign branch cannot supply native run', (f) => { f.runs[0].head_branch = 'other'; }, 'pending');
caseTest('foreign SHA cannot supply native run', (f) => { f.runs[0].head_sha = 'c'.repeat(40); }, 'pending');
caseTest('different workflow cannot supply native run', (f) => { f.runs[0].path = '.github/workflows/other.yml'; }, 'pending');
caseTest('wrong PR number', (f) => { f.pr.number++; });
caseTest('closed PR', (f) => { f.pr.state = 'closed'; });
caseTest('draft PR', (f) => { f.pr.draft = true; });
caseTest('merged PR', (f) => { f.pr.merged = true; });
caseTest('moved base lease', (f) => { f.pr.base.sha = 'c'.repeat(40); });
caseTest('moved candidate lease', (f) => { f.pr.head.sha = 'c'.repeat(40); });
caseTest('changed branch', (f) => { f.pr.head.ref = 'other'; });
caseTest('wrong base branch', (f) => { f.pr.base.ref = 'other'; });
caseTest('foreign repository', (f) => { f.pr.head.repo = { id: 99, full_name: 'other/repo' }; });
caseTest('fork with matching name but different id', (f) => { f.pr.head.repo = { ...f.pr.head.repo, id: 99 }; });
caseTest('different run repository', (f) => { f.runs[0].repository = { id: 99 }; });
caseTest('different run head repository', (f) => { f.runs[0].head_repository = { id: 99 }; });
caseTest('run predates PR', (f) => { f.runs[0].created_at = '2026-09-04T00:00:00Z'; });
caseTest('missing creation time', (f) => { delete f.pr.created_at; });
caseTest('unknown run status', (f) => { f.runs[0].status = 'unexpected'; });
caseTest('skipped is not success', (f) => { f.runs[0].conclusion = 'skipped'; });
caseTest('neutral is not success', (f) => { f.runs[0].conclusion = 'neutral'; });
caseTest('empty native PR association may be omitted by GitHub', (f) => {
  f.runs[0].pull_requests = [];
}, 'ready');
caseTest('missing native PR association collection', (f) => { delete f.runs[0].pull_requests; });
caseTest('ambiguous native PR associations', (f) => {
  f.runs[0].pull_requests.push(clone(f.runs[0].pull_requests[0]));
});
caseTest('different native PR association', (f) => { f.runs[0].pull_requests = [{ ...f.pr, number: 99 }]; });
caseTest('wrong base in PR association', (f) => {
  f.runs[0].pull_requests = [{ ...f.pr, base: { ...f.pr.base, sha: 'c'.repeat(40) } }];
});
caseTest('no jobs is not successful execution', (f) => { f.jobsByRun[101] = []; });
caseTest('missing job collection', (f) => { delete f.jobsByRun[101]; });
caseTest('duplicate required jobs', (f) => { f.jobsByRun[101].push(clone(f.jobsByRun[101][0])); });
caseTest('wrong job name', (f) => { f.jobsByRun[101][0].name = 'other'; });
caseTest('wrong job run', (f) => { f.jobsByRun[101][0].run_id++; });
caseTest('stale job attempt', (f) => { f.runs[0].run_attempt = 2; });
caseTest('wrong job head', (f) => { f.jobsByRun[101][0].head_sha = 'c'.repeat(40); });
caseTest('failed native job', (f) => { f.jobsByRun[101][0].conclusion = 'failure'; });
caseTest('missing check', (f) => { delete f.checksByJob[301]; });
caseTest('wrong check name', (f) => { f.checksByJob[301].name = 'other'; });
caseTest('wrong check suite', (f) => { f.checksByJob[301].check_suite.id++; });
caseTest('wrong check app', (f) => { f.checksByJob[301].app.id++; });
caseTest('wrong check SHA', (f) => { f.checksByJob[301].head_sha = 'c'.repeat(40); });
caseTest('wrong check identity', (f) => { f.checksByJob[301].id++; });
caseTest('wrong check details URL', (f) => { f.checksByJob[301].details_url += '/other'; });
caseTest('check failed despite successful run', (f) => { f.checksByJob[301].conclusion = 'failure'; });
caseTest('invalid run id', (f) => { f.runs[0].id = '../other'; });
caseTest('invalid candidate branch grammar', (f) => { f.branch = 'arbitrary-branch'; });
caseTest('invalid repository grammar', (f) => { f.repository = 'owner/repo/../other'; });

const f = fixture(), calls = [];
const root = `repos/${f.repository}`;
function read(endpoint, paginated) {
  calls.push({ endpoint, paginated });
  if (endpoint === `${root}/pulls/${f.number}`) return clone(f.pr);
  if (endpoint.includes('/actions/runs?')) return [{ workflow_runs: [f.runs[0]] }, { workflow_runs: [f.runs[1]] }];
  for (const run of f.runs) {
    if (endpoint === `${root}/actions/runs/${run.id}/attempts/1/jobs?per_page=100`) {
      return [{ jobs: [] }, { jobs: clone(f.jobsByRun[run.id]) }];
    }
    const job = f.jobsByRun[run.id][0];
    if (endpoint === `${root}/check-runs/${f.checksByJob[job.id].id}`) return clone(f.checksByJob[job.id]);
  }
  throw new Error(`unexpected API read: ${endpoint}`);
}
const result = readNativeAdmission(f.repository, f.number, f.baseSha, f.candidateSha, f.branch, read);
assert.equal(result.decision, 'ready');
assert.equal(calls.length, 7);
assert.equal(calls.filter((c) => c.paginated).length, 3);
assert.equal(calls.filter((c) => c.endpoint === `${root}/pulls/${f.number}`).length, 2);
assert.ok(calls.every((c) => c.endpoint.startsWith(`${root}/`)));
count++;

const historicalFixture = JSON.parse(readFileSync(
  new URL('./fixtures/scheduled-crawl-admission/pr2602-owner-recovery.json', import.meta.url), 'utf8'));
const historicalResult = inspectNativeAdmission(historicalFixture.snapshot);
assert.equal(historicalResult.decision, 'ready');
assert.ok(historicalResult.native_runs.every((r) => r.pr_association === 'not_returned'));
count++;
console.log(`scheduled-crawl-admission.test: ${count} native-admission cases PASS`);
