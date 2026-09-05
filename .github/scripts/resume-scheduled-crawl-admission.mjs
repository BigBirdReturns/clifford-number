#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readNativeAdmission } from './inspect-scheduled-crawl-admission.mjs';

const REQUIRED = new Map([
  ['.github/workflows/ci.yml', 'Release checks'],
  ['.github/workflows/no-magic-human-gate.yml', 'No magic human gate']
]);
const ROOTS = {
  'industrial-exhaust': ['data/exhaust/', 'receipts/exhaust/'],
  'official-record': ['data/crawl/', 'receipts/crawl/']
};
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
export function inspectResumptionTrigger(event) {
  const run = event?.workflow_run;
  if (!run || run.event !== 'pull_request') return { decision: 'ignored', reason: 'not a pull_request workflow run' };
  if (!REQUIRED.has(run.path)) return { decision: 'ignored', reason: 'not a required workflow' };
  if (REQUIRED.get(run.path) !== run.name) return { decision: 'indeterminate', reason: 'workflow name/path mismatch' };
  if (run.status !== 'completed') return { decision: 'ignored', reason: 'workflow run is not completed' };
  requireSha(run.head_sha, 'trigger head');
  assert.match(run.head_branch, BRANCH, 'trigger branch is outside the crawler namespace');
  assert.ok(positiveInteger(run.id) && positiveInteger(run.run_attempt), 'invalid triggering run identity');
  return { decision: 'candidate', candidateSha: run.head_sha, branch: run.head_branch,
    kind: run.head_branch.match(BRANCH)[1], triggerRunId: run.id };
}

export function selectOpenCrawlerPullRequest(pulls, repository, branch, candidateSha) {
  assert.ok(Array.isArray(pulls), 'pull-request collection is missing');
  const matches = pulls.filter((pr) => pr.state === 'open' && pr.draft === false
    && pr.head?.ref === branch && pr.head?.sha === candidateSha
    && pr.head?.repo?.full_name === repository && pr.base?.ref === 'main'
    && pr.base?.repo?.full_name === repository && pr.head?.repo?.id === pr.base?.repo?.id
    && pr.user?.login === 'github-actions[bot]');
  assert.ok(matches.length <= 1, 'crawler candidate maps to multiple open pull requests');
  return matches[0] || null;
}

function assertPullRequestIdentity(pr, repository, number, branch, candidateSha) {
  assert.equal(pr.number, number);
  assert.equal(pr.state, 'open');
  assert.equal(pr.draft, false);
  assert.equal(pr.merged, false);
  assert.equal(pr.user.login, 'github-actions[bot]');
  assert.equal(pr.head.ref, branch);
  assert.equal(pr.head.sha, candidateSha);
  assert.equal(pr.base.ref, 'main');
  requireSha(pr.base.sha, 'pull-request base');
  assert.equal(pr.head.repo.full_name, repository);
  assert.equal(pr.base.repo.full_name, repository);
  assert.equal(pr.head.repo.id, pr.base.repo.id);
  assert.equal(pr.commits, 1);
}
function assertPullRequest(pr, repository, number, branch, baseSha, candidateSha) {
  assertPullRequestIdentity(pr, repository, number, branch, candidateSha);
  assert.equal(pr.base.sha, baseSha, 'pull-request base moved from the candidate parent');
}
function assertCandidateTopology(kind, baseSha, candidateSha, mainRef, candidateRef, commit, compare, exactPaths) {
  assert.equal(mainRef.object?.sha, baseSha, 'main moved from the pull-request base');
  assert.equal(candidateRef.object?.sha, candidateSha, 'candidate ref moved');
  assert.equal(commit.sha, candidateSha);
  assert.equal(commit.parents?.length, 1, 'candidate must have exactly one parent');
  assert.equal(commit.parents[0].sha, baseSha, 'candidate is not a direct child of the leased base');
  requireSha(commit.tree?.sha, 'candidate tree');
  assert.equal(compare.status, 'ahead');
  assert.equal(compare.ahead_by, 1);
  assert.equal(compare.behind_by, 0);
  assert.equal(compare.total_commits, 1);
  assert.ok(Array.isArray(compare.files) && compare.files.length > 0, 'candidate has no comparison paths');
  assert.ok(Array.isArray(exactPaths) && exactPaths.length > 0, 'candidate has no exact changed paths');
  assert.equal(new Set(exactPaths).size, exactPaths.length, 'exact changed paths are duplicated');
  const roots = ROOTS[kind];
  for (const path of exactPaths) {
    assert.ok(typeof path === 'string' && roots.some((root) => path.startsWith(root)),
      `candidate contains forbidden path: ${path}`);
  }
  const exact = new Set(exactPaths);
  for (const file of compare.files) {
    for (const path of [file.filename, file.previous_filename].filter(Boolean)) {
      assert.ok(exact.has(path), `comparison path is absent from the exact Git diff: ${path}`);
    }
  }
  return commit.tree.sha;
}

function classifyAdmission(admission) {
  assert.ok(admission && typeof admission.decision === 'string', 'native admission result is missing');
  if (admission.decision === 'ready') return 'merge';
  if (admission.decision === 'failed') return 'cleanup_failed';
  if (admission.decision === 'pending' || admission.decision === 'awaiting_approval') return 'waiting';
  return 'preserve_indeterminate';
}

function refEndpoint(repository, branch) {
  return `repos/${repository}/git/ref/heads/${branch}`;
}

function pullPages(io, repository) {
  const value = io.read(`repos/${repository}/pulls?state=open&base=main&per_page=100`, true);
  return flattenPages(value, 'pull_requests');
}

function snapshot(io, name, value) {
  if (io.record) io.record(name, value);
  return value;
}
function cleanupExactCandidate(io, context) {
  const { repository, number, branch, baseSha, candidateSha, allowBaseDrift = false } = context;
  const pr = snapshot(io, 'cleanup-pr-preflight.json', io.read(`repos/${repository}/pulls/${number}`));
  if (allowBaseDrift) assertPullRequestIdentity(pr, repository, number, branch, candidateSha);
  else assertPullRequest(pr, repository, number, branch, baseSha, candidateSha);
  const ref = snapshot(io, 'cleanup-ref-preflight.json', io.read(refEndpoint(repository, branch)));
  assert.equal(ref.object?.sha, candidateSha, 'candidate ref moved before cleanup');
  let pullRequestClosed = false;
  try {
    const closed = snapshot(io, 'cleanup-pr.json',
      io.write('PATCH', `repos/${repository}/pulls/${number}`, { state: 'closed' }));
    assert.equal(closed.state, 'closed', 'pull request did not close');
    pullRequestClosed = true;
    const retired = io.deleteRef(branch, candidateSha);
    snapshot(io, 'cleanup-branch.json', retired || { branch, expected_sha: candidateSha });
    return { pull_request: number, branch, candidate_sha: candidateSha,
      pull_request_closed: true, cleanup: 'complete' };
  } catch (error) {
    return { pull_request: number, branch, candidate_sha: candidateSha,
      pull_request_closed: pullRequestClosed, cleanup: 'incomplete', cleanup_reason: error.message };
  }
}

export function runScheduledCrawlResumption(event, io) {
  const trigger = inspectResumptionTrigger(event);
  snapshot(io, 'trigger.json', trigger);
  if (trigger.decision !== 'candidate') {
    return { schema_version: 1, outcome: trigger.decision, reason: trigger.reason,
      exit_code: trigger.decision === 'indeterminate' ? 1 : 0 };
  }
  const { candidateSha, branch, kind, triggerRunId } = trigger;
  const repository = io.repository;
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  const listed = snapshot(io, 'open-pull-requests.json', pullPages(io, repository));
  const selected = selectOpenCrawlerPullRequest(listed, repository, branch, candidateSha);
  if (!selected) {
    return { schema_version: 1, outcome: 'ignored', reason: 'no exact open crawler pull request',
      repository, promotion_kind: kind, candidate_sha: candidateSha, candidate_branch: branch, trigger_run_id: triggerRunId, exit_code: 0 };
  }

  const number = selected.number;
  assert.ok(positiveInteger(number), 'invalid pull-request number');
  const pr = snapshot(io, 'pull-request.json', io.read(`repos/${repository}/pulls/${number}`));
  assertPullRequestIdentity(pr, repository, number, branch, candidateSha);
  const mainRef = snapshot(io, 'main-ref.json', io.read(refEndpoint(repository, 'main')));
  const candidateRef = snapshot(io, 'candidate-ref.json', io.read(refEndpoint(repository, branch)));
  const commit = snapshot(io, 'candidate-commit.json', io.read(`repos/${repository}/git/commits/${candidateSha}`));
  assert.equal(commit.sha, candidateSha);
  assert.equal(commit.parents?.length, 1, 'candidate must have exactly one parent');
  const baseSha = requireSha(commit.parents[0].sha, 'candidate parent');
  const context = { repository, number, branch, baseSha, candidateSha };
  if (mainRef.object?.sha !== baseSha || pr.base.sha !== baseSha) {
    const cleanup = cleanupExactCandidate(io, { ...context, allowBaseDrift: true });
    const result = { schema_version: 1,
      outcome: cleanup.cleanup === 'complete' ? 'stale_base_cleaned' : 'stale_base_cleanup_incomplete',
      repository, promotion_kind: kind,
      pull_request: number, base_sha: baseSha, observed_pull_request_base_sha: pr.base.sha,
      candidate_sha: candidateSha, trigger_run_id: triggerRunId, ...cleanup, exit_code: 1 };
    snapshot(io, 'result.json', result);
    return result;
  }
  assertPullRequest(pr, repository, number, branch, baseSha, candidateSha);
  const compare = snapshot(io, 'compare.json', io.read(`repos/${repository}/compare/${baseSha}...${candidateSha}`));
  const exactPaths = snapshot(io, 'exact-paths.json', io.changedPaths(baseSha, candidateSha, branch));
  const candidateTree = assertCandidateTopology(kind, baseSha, candidateSha,
    mainRef, candidateRef, commit, compare, exactPaths);
  const admission = snapshot(io, 'native-admission.json', readNativeAdmission(
    repository, number, baseSha, candidateSha, branch,
    (endpoint, paginate = false) => io.read(endpoint, paginate)));
  const action = classifyAdmission(admission);
  if (action === 'waiting' || action === 'preserve_indeterminate') {
    const result = { schema_version: 1,
      outcome: action === 'waiting' ? admission.decision : 'indeterminate_preserved',
      repository, promotion_kind: kind, pull_request: number, base_sha: baseSha, candidate_sha: candidateSha,
      candidate_tree: candidateTree, candidate_branch: branch, trigger_run_id: triggerRunId,
      native_admission: admission, exit_code: action === 'waiting' ? 0 : 1 };
    snapshot(io, 'result.json', result);
    return result;
  }
  if (action === 'cleanup_failed') {
    const cleanup = cleanupExactCandidate(io, context);
    const result = { schema_version: 1,
      outcome: cleanup.cleanup === 'complete' ? 'native_checks_failed_cleaned' : 'native_checks_failed_cleanup_incomplete',
      repository, promotion_kind: kind,
      pull_request: number, base_sha: baseSha, candidate_sha: candidateSha,
      candidate_tree: candidateTree, candidate_branch: branch, trigger_run_id: triggerRunId,
      native_admission: admission, ...cleanup, exit_code: 1 };
    snapshot(io, 'result.json', result);
    return result;
  }

  const mainFinal = snapshot(io, 'main-ref-final.json', io.read(refEndpoint(repository, 'main')));
  const candidateFinal = snapshot(io, 'candidate-ref-final.json', io.read(refEndpoint(repository, branch)));
  const prFinal = snapshot(io, 'pull-request-final.json', io.read(`repos/${repository}/pulls/${number}`));
  const compareFinal = snapshot(io, 'compare-final.json', io.read(`repos/${repository}/compare/${baseSha}...${candidateSha}`));
  assertPullRequest(prFinal, repository, number, branch, baseSha, candidateSha);
  assertCandidateTopology(kind, baseSha, candidateSha, mainFinal, candidateFinal, commit, compareFinal, exactPaths);
  const title = kind === 'official-record'
    ? 'crawl: official-record intake'
    : 'crawl: first-party industrial exhaust';
  const merge = snapshot(io, 'merge.json', io.write('PUT', `repos/${repository}/pulls/${number}/merge`, {
    commit_title: title,
    commit_message: `Qualified scheduled intake from ${branch} at ${candidateSha}.`,
    sha: candidateSha,
    merge_method: 'merge'
  }));
  if (merge.merged !== true) {
    const result = { schema_version: 1, outcome: 'merge_refused', repository,
      promotion_kind: kind, pull_request: number, base_sha: baseSha,
      candidate_sha: candidateSha, candidate_tree: candidateTree,
      candidate_branch: branch, trigger_run_id: triggerRunId,
      native_admission: admission, reason: merge.message || 'unknown response', exit_code: 1 };
    snapshot(io, 'result.json', result);
    return result;
  }
  const mergeSha = requireSha(merge.sha, 'merge commit');
  try {
    const mergeCommit = snapshot(io, 'merge-commit.json', io.read(`repos/${repository}/git/commits/${mergeSha}`));
    assert.equal(mergeCommit.parents?.length, 2, 'merge must have exactly two parents');
    assert.equal(mergeCommit.parents[0].sha, baseSha);
    assert.equal(mergeCommit.parents[1].sha, candidateSha);
    assert.equal(mergeCommit.tree?.sha, candidateTree, 'merge tree differs from candidate tree');
    const mainAfter = snapshot(io, 'main-ref-after.json', io.read(refEndpoint(repository, 'main')));
    assert.equal(mainAfter.object?.sha, mergeSha, 'main does not name the admitted merge');
    const refAfter = snapshot(io, 'candidate-ref-after-merge.json', io.read(refEndpoint(repository, branch)));
    assert.equal(refAfter.object?.sha, candidateSha, 'candidate ref moved before retirement');
  } catch (error) {
    const result = { schema_version: 1, outcome: 'merge_verification_failed', repository,
      promotion_kind: kind, pull_request: number, base_sha: baseSha,
      candidate_sha: candidateSha, candidate_tree: candidateTree,
      candidate_branch: branch, merge_sha: mergeSha, trigger_run_id: triggerRunId,
      native_admission: admission, reason: error.message, cleanup: 'not_attempted', exit_code: 1 };
    snapshot(io, 'result.json', result);
    return result;
  }
  let retirement;
  try {
    retirement = io.deleteRef(branch, candidateSha);
    snapshot(io, 'candidate-retirement.json', retirement || { branch, expected_sha: candidateSha });
  } catch (error) {
    const result = { schema_version: 1, outcome: 'merged_cleanup_incomplete', repository,
      promotion_kind: kind, pull_request: number, base_sha: baseSha,
      candidate_sha: candidateSha, candidate_tree: candidateTree,
      candidate_branch: branch, merge_sha: mergeSha, trigger_run_id: triggerRunId,
      native_admission: admission, reason: error.message, cleanup: 'incomplete', exit_code: 1 };
    snapshot(io, 'result.json', result);
    return result;
  }
  const result = { schema_version: 1, outcome: 'merged', repository,
    promotion_kind: kind, pull_request: number, base_sha: baseSha,
    candidate_sha: candidateSha, candidate_tree: candidateTree,
    candidate_branch: branch, merge_sha: mergeSha, trigger_run_id: triggerRunId,
    native_admission: admission, cleanup: 'complete', retirement, exit_code: 0 };
  snapshot(io, 'result.json', result);
  return result;
}

function createCliIo(repository, receiptDir) {
  mkdirSync(receiptDir, { recursive: true });
  const gh = (args, input) => JSON.parse(execFileSync('gh', args, {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 120000,
    input: input === undefined ? undefined : JSON.stringify(input),
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe']
  }));
  return {
    repository,
    read(endpoint, paginate = false) {
      const args = ['api', '--method', 'GET', endpoint, ...(paginate ? ['--paginate', '--slurp'] : [])];
      return gh(args);
    },
    write(method, endpoint, body) {
      return gh(['api', '--method', method, endpoint, '--input', '-'], body);
    },
    changedPaths(baseSha, candidateSha, branch) {
      execFileSync('git', ['fetch', '--no-tags', 'origin', `refs/heads/${branch}`], {
        encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe']
      });
      const fetched = execFileSync('git', ['rev-parse', 'FETCH_HEAD'], { encoding: 'utf8' }).trim();
      assert.equal(fetched, candidateSha, 'fetched candidate ref moved');
      assert.equal(execFileSync('git', ['rev-parse', `${candidateSha}^`], { encoding: 'utf8' }).trim(), baseSha);
      const raw = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', baseSha, candidateSha, '--']);
      return raw.toString('utf8').split('\0').filter(Boolean).sort();
    },
    deleteRef(branch, expectedSha) {
      const output = execFileSync('git', ['push',
        `--force-with-lease=refs/heads/${branch}:${expectedSha}`,
        'origin', `:refs/heads/${branch}`], {
        encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe']
      }).trim();
      const remaining = execFileSync('git', ['ls-remote', '--heads',
        'origin', `refs/heads/${branch}`], {
        encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe']
      }).trim();
      assert.equal(remaining, '', 'candidate ref still exists after leased retirement');
      return { branch, expected_sha: expectedSha, remote_absent: true, git_output: output };
    },
    record(name, value) {
      writeFileSync(join(receiptDir, name), `${JSON.stringify(value, null, 2)}\n`);
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const receiptDir = process.env.RUNNER_TEMP
    ? join(process.env.RUNNER_TEMP, 'scheduled-crawl-resumption-receipt')
    : join(process.cwd(), 'scheduled-crawl-resumption-receipt');
  let result;
  try {
    const repository = process.env.GITHUB_REPOSITORY;
    assert.match(repository || '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    const eventPath = process.env.GITHUB_EVENT_PATH;
    assert.ok(eventPath, 'GITHUB_EVENT_PATH is required');
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    result = runScheduledCrawlResumption(event, createCliIo(repository, receiptDir));
    writeFileSync(join(receiptDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    mkdirSync(receiptDir, { recursive: true });
    result = { schema_version: 1, outcome: 'indeterminate_preserved',
      reason: error.message, exit_code: 1 };
    writeFileSync(join(receiptDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.exit_code;
}
