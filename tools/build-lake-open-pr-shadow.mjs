#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const output = path.join(root, 'data/project/lake-open-pr-shadow.json');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const repository = process.env.GITHUB_REPOSITORY || process.argv[2] || '';
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function trackedFiles() {
  const raw = execFileSync('git', ['ls-files', '-z'], { cwd: root });
  return new Set(raw.toString('utf8').split('\0').filter(Boolean));
}

async function api(pathname) {
  const response = await fetch(`${apiBase}${pathname}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'clifford-number-lake-index'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${pathname}`);
  return response.json();
}

async function paginated(pathname) {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const joiner = pathname.includes('?') ? '&' : '?';
    const chunk = await api(`${pathname}${joiner}per_page=100&page=${page}`);
    rows.push(...chunk);
    if (chunk.length < 100) break;
  }
  return rows;
}

function evidenceLike(file) {
  return ['data/', 'receipts/', 'cases/', 'reports/', 'briefs/', 'docs/', 'build/', 'estates/', 'gametrails/', 'legacy/', 'contributions/']
    .some(prefix => file.startsWith(prefix));
}

const tracked = trackedFiles();
const result = {
  schema_version: 'lake-open-pr-shadow@1',
  observed_at: new Date().toISOString(),
  repository,
  exact_checkout_head: git('rev-parse', 'HEAD'),
  status: 'complete',
  pull_requests: [],
  counts: {
    open_pull_requests: 0,
    changed_paths: 0,
    evidence_like_changed_paths: 0,
    branch_only_paths: 0,
    branch_only_evidence_paths: 0
  },
  boundaries: {
    open_pr_path_proves_merged_corpus: false,
    changed_file_proves_evidence_truth: false,
    branch_only_path_semantically_indexed: false,
    closed_or_unpushed_branch_history_indexed: false
  }
};

if (!token || !repository.includes('/')) {
  result.status = 'unavailable_missing_token_or_repository';
} else {
  try {
    const prs = await paginated(`/repos/${repository}/pulls?state=open`);
    const allChanged = new Set();
    const allBranchOnly = new Set();
    for (const pr of prs) {
      const files = await paginated(`/repos/${repository}/pulls/${pr.number}/files?`);
      const entries = files.map(file => {
        const branchOnly = file.status === 'added' && !tracked.has(file.filename);
        allChanged.add(file.filename);
        if (branchOnly) allBranchOnly.add(file.filename);
        return {
          path: file.filename,
          status: file.status,
          blob_sha: file.sha,
          previous_path: file.previous_filename ?? null,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          evidence_like: evidenceLike(file.filename),
          branch_only_path: branchOnly
        };
      });
      result.pull_requests.push({
        number: pr.number,
        title: pr.title,
        draft: pr.draft,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        base_ref: pr.base.ref,
        base_sha: pr.base.sha,
        head_ref: pr.head.ref,
        head_sha: pr.head.sha,
        changed_files: pr.changed_files,
        files: entries
      });
    }
    result.pull_requests.sort((a, b) => a.number - b.number);
    const flattened = result.pull_requests.flatMap(pr => pr.files);
    result.counts = {
      open_pull_requests: result.pull_requests.length,
      changed_paths: allChanged.size,
      evidence_like_changed_paths: new Set(flattened.filter(file => file.evidence_like).map(file => file.path)).size,
      branch_only_paths: allBranchOnly.size,
      branch_only_evidence_paths: new Set(flattened.filter(file => file.branch_only_path && file.evidence_like).map(file => file.path)).size
    };
  } catch (error) {
    result.status = 'api_error';
    result.error = error.message;
  }
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(`lake open-PR shadow: ${result.status}`);
console.log(`  open PRs: ${result.counts.open_pull_requests}`);
console.log(`  changed paths: ${result.counts.changed_paths}`);
console.log(`  branch-only evidence paths: ${result.counts.branch_only_evidence_paths}`);
