#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(modulePath), '..');

export const FULL_HISTORY_DEPTH = '2147483647';
export const MAIN_HISTORY_REFSPEC = '+refs/heads/main:refs/remotes/origin/main';

function formatFailure(result) {
  const detail = String(result?.stderr || result?.stdout || '').trim();
  return detail ? `: ${detail}` : '';
}

export function gitCommand(args, { cwd = defaultRoot, spawn = spawnSync } = {}) {
  return spawn('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
}

function isSafeBranchName(value) {
  const forbidden = ['~', '^', ':', '?', '*', '[', '\\'];
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 240 &&
    !value.startsWith('-') &&
    !value.startsWith('/') &&
    !value.endsWith('/') &&
    !value.endsWith('.') &&
    !value.includes('..') &&
    !value.includes('@{') &&
    !/\s/u.test(value) &&
    !forbidden.some((character) => value.includes(character)) &&
    !value.split('/').some((part) => !part || part.endsWith('.lock'));
}

function addBranchRefspec(refspecs, branch) {
  if (branch !== 'main' && isSafeBranchName(branch)) {
    refspecs.push(`+refs/heads/${branch}:refs/remotes/origin/${branch}`);
  }
}

export function buildHistoryRefspecs(env = process.env) {
  const refspecs = [MAIN_HISTORY_REFSPEC];
  const githubRef = env.GITHUB_REF;

  addBranchRefspec(refspecs, env.GITHUB_BASE_REF);
  addBranchRefspec(refspecs, env.GITHUB_HEAD_REF);

  const pullMatch = typeof githubRef === 'string'
    ? githubRef.match(/^refs\/pull\/(\d+)\/(merge|head)$/u)
    : null;
  if (pullMatch) {
    refspecs.push(`+${githubRef}:refs/remotes/pull/${pullMatch[1]}/${pullMatch[2]}`);
  }

  if (typeof githubRef === 'string' && githubRef.startsWith('refs/heads/')) {
    addBranchRefspec(refspecs, githubRef.slice('refs/heads/'.length));
  }

  return [...new Set(refspecs)];
}

function sourceRefFromRefspec(refspec) {
  if (typeof refspec !== 'string') return '';
  const separator = refspec.indexOf(':');
  const source = separator === -1 ? refspec : refspec.slice(0, separator);
  return source.replace(/^\+/u, '');
}

export function isVolatilePullMergeRefspec(refspec) {
  return /^refs\/pull\/\d+\/merge$/u.test(sourceRefFromRefspec(refspec));
}

export function isUnavailableOptionalRef(refspec, result) {
  if (!isVolatilePullMergeRefspec(refspec)) return false;
  const source = sourceRefFromRefspec(refspec);
  const detail = String(result?.stderr || result?.stdout || '');
  return detail.includes(`couldn't find remote ref ${source}`);
}

function readShallowState(git) {
  const result = git(['rev-parse', '--is-shallow-repository']);
  if (result.status !== 0) {
    throw new Error(`cannot determine repository history state${formatFailure(result)}`);
  }
  const state = String(result.stdout || '').trim();
  if (state !== 'true' && state !== 'false') {
    throw new Error(`unexpected repository history state ${JSON.stringify(state)}`);
  }
  return state === 'true';
}

export function ensureReleaseHistory({
  cwd = defaultRoot,
  env = process.env,
  spawn = spawnSync,
  log = console.log
} = {}) {
  const git = (args) => gitCommand(args, { cwd, spawn });
  const inside = git(['rev-parse', '--is-inside-work-tree']);
  if (inside.status !== 0 || String(inside.stdout || '').trim() !== 'true') {
    throw new Error(`release gate must run inside a Git work tree${formatFailure(inside)}`);
  }

  let shallow = readShallowState(git);
  if (!shallow) {
    log('ensure-release-history: repository already has complete history');
    return { fetched: false, refspecs: [] };
  }

  const refspecs = buildHistoryRefspecs(env);
  const skippedRefspecs = [];
  for (const refspec of refspecs) {
    const fetched = git([
      'fetch',
      '--no-tags',
      '--prune',
      '--quiet',
      `--depth=${FULL_HISTORY_DEPTH}`,
      'origin',
      refspec
    ]);
    if (fetched.status === 0) continue;
    if (isUnavailableOptionalRef(refspec, fetched)) {
      skippedRefspecs.push(refspec);
      log(`ensure-release-history: skipped unavailable optional refspec ${refspec}`);
      continue;
    }
    throw new Error(`cannot acquire complete release history${formatFailure(fetched)}`);
  }

  shallow = readShallowState(git);
  if (shallow) {
    const head = git(['rev-parse', 'HEAD']);
    if (head.status !== 0 || !/^[0-9a-f]{40}$/u.test(String(head.stdout || '').trim())) {
      throw new Error(`repository remains shallow and HEAD cannot be resolved${formatFailure(head)}`);
    }
    const headSha = String(head.stdout).trim();
    const completed = git([
      'fetch',
      '--no-tags',
      '--prune',
      '--quiet',
      `--depth=${FULL_HISTORY_DEPTH}`,
      'origin',
      headSha
    ]);
    if (completed.status !== 0) {
      throw new Error(`cannot complete current release ancestry${formatFailure(completed)}`);
    }
    shallow = readShallowState(git);
  }

  if (shallow) {
    throw new Error('repository remains shallow after bounded release-history acquisition');
  }

  const skipped = skippedRefspecs.length > 0
    ? `; skipped ${skippedRefspecs.length} unavailable optional refspec(s)`
    : '';
  log(`ensure-release-history: complete history acquired for ${refspecs.length} refspec(s)${skipped}`);
  return { fetched: true, refspecs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  try {
    ensureReleaseHistory();
  } catch (error) {
    console.error(`ensure-release-history: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
