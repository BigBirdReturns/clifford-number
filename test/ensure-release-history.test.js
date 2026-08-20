#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  FULL_HISTORY_DEPTH,
  MAIN_HISTORY_REFSPEC,
  buildHistoryRefspecs,
  ensureReleaseHistory,
  isUnavailableOptionalRef,
  isVolatilePullMergeRefspec
} from '../tools/ensure-release-history.mjs';

function result(status, stdout = '', stderr = '') {
  return { status, stdout, stderr };
}

function scriptedSpawn(script) {
  const calls = [];
  const spawn = (command, args) => {
    calls.push([command, ...args]);
    const next = script.shift();
    assert.ok(next, `unexpected command: ${command} ${args.join(' ')}`);
    if (next.expect) assert.deepEqual([command, ...args], next.expect);
    return next.result;
  };
  return { calls, spawn };
}

const fetchCommand = (refspec) => [
  'git', 'fetch', '--no-tags', '--prune', '--quiet', `--depth=${FULL_HISTORY_DEPTH}`,
  'origin', refspec
];

{
  assert.deepEqual(
    buildHistoryRefspecs({
      GITHUB_REF: 'refs/pull/2132/merge',
      GITHUB_BASE_REF: 'main',
      GITHUB_HEAD_REF: 'feature/history-fix'
    }),
    [
      MAIN_HISTORY_REFSPEC,
      '+refs/heads/feature/history-fix:refs/remotes/origin/feature/history-fix',
      '+refs/pull/2132/merge:refs/remotes/pull/2132/merge'
    ]
  );
  assert.deepEqual(
    buildHistoryRefspecs({ GITHUB_REF: 'refs/heads/feature/history-fix' }),
    [
      MAIN_HISTORY_REFSPEC,
      '+refs/heads/feature/history-fix:refs/remotes/origin/feature/history-fix'
    ]
  );
  assert.deepEqual(
    buildHistoryRefspecs({
      GITHUB_REF: 'refs/pull/2132/merge',
      GITHUB_BASE_REF: 'release/2026',
      GITHUB_HEAD_REF: 'unsafe..branch'
    }),
    [
      MAIN_HISTORY_REFSPEC,
      '+refs/heads/release/2026:refs/remotes/origin/release/2026',
      '+refs/pull/2132/merge:refs/remotes/pull/2132/merge'
    ]
  );
  assert.deepEqual(
    buildHistoryRefspecs({ GITHUB_REF: 'refs/heads/unsafe..branch' }),
    [MAIN_HISTORY_REFSPEC]
  );
}

{
  const pullMerge = '+refs/pull/2132/merge:refs/remotes/pull/2132/merge';
  const pullHead = '+refs/pull/2132/head:refs/remotes/pull/2132/head';
  const stableHead = '+refs/heads/feature/history-fix:refs/remotes/origin/feature/history-fix';

  assert.equal(isVolatilePullMergeRefspec(pullMerge), true);
  assert.equal(isVolatilePullMergeRefspec(pullHead), false);
  assert.equal(isVolatilePullMergeRefspec(stableHead), false);

  assert.equal(
    isUnavailableOptionalRef(
      pullMerge,
      result(128, '', "fatal: couldn't find remote ref refs/pull/2132/merge")
    ),
    true
  );
  assert.equal(
    isUnavailableOptionalRef(pullMerge, result(128, '', 'fatal: transport unavailable')),
    false
  );
  assert.equal(
    isUnavailableOptionalRef(
      pullHead,
      result(128, '', "fatal: couldn't find remote ref refs/pull/2132/head")
    ),
    false
  );
  assert.equal(
    isUnavailableOptionalRef(
      stableHead,
      result(128, '', "fatal: couldn't find remote ref refs/heads/feature/history-fix")
    ),
    false
  );
  assert.equal(
    isUnavailableOptionalRef(
      MAIN_HISTORY_REFSPEC,
      result(128, '', "fatal: couldn't find remote ref refs/heads/main")
    ),
    false
  );
}

{
  const messages = [];
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'false\n') }
  ]);
  const outcome = ensureReleaseHistory({ spawn: mock.spawn, log: (line) => messages.push(line) });
  assert.deepEqual(outcome, { fetched: false, refspecs: [] });
  assert.equal(mock.calls.length, 2);
  assert.match(messages[0], /already has complete history/u);
}

{
  const headRefspec = '+refs/heads/feature/history-fix:refs/remotes/origin/feature/history-fix';
  const pullRefspec = '+refs/pull/2132/merge:refs/remotes/pull/2132/merge';
  const messages = [];
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { expect: fetchCommand(MAIN_HISTORY_REFSPEC), result: result(0) },
    { expect: fetchCommand(headRefspec), result: result(0) },
    {
      expect: fetchCommand(pullRefspec),
      result: result(128, '', "fatal: couldn't find remote ref refs/pull/2132/merge")
    },
    { result: result(0, 'false\n') }
  ]);
  const outcome = ensureReleaseHistory({
    env: {
      GITHUB_REF: 'refs/pull/2132/merge',
      GITHUB_BASE_REF: 'main',
      GITHUB_HEAD_REF: 'feature/history-fix'
    },
    spawn: mock.spawn,
    log: (line) => messages.push(line)
  });
  assert.equal(outcome.fetched, true);
  assert.equal(mock.calls.length, 6);
  assert.match(messages.join('\n'), /skipped unavailable optional refspec/u);
}

{
  const sha = 'a'.repeat(40);
  const pullRefspec = '+refs/pull/42/merge:refs/remotes/pull/42/merge';
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { expect: fetchCommand(MAIN_HISTORY_REFSPEC), result: result(0) },
    { expect: fetchCommand(pullRefspec), result: result(0) },
    { result: result(0, 'true\n') },
    { result: result(0, `${sha}\n`) },
    { expect: fetchCommand(sha), result: result(0) },
    { result: result(0, 'false\n') }
  ]);
  const outcome = ensureReleaseHistory({
    env: { GITHUB_REF: 'refs/pull/42/merge' },
    spawn: mock.spawn,
    log: () => {}
  });
  assert.equal(outcome.fetched, true);
  assert.equal(mock.calls.length, 8);
}

{
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { expect: fetchCommand(MAIN_HISTORY_REFSPEC), result: result(128, '', 'fatal: transport unavailable') }
  ]);
  assert.throws(
    () => ensureReleaseHistory({ spawn: mock.spawn, log: () => {} }),
    /cannot acquire complete release history: fatal: transport unavailable/u
  );
}

{
  const headRefspec = '+refs/heads/feature/history-fix:refs/remotes/origin/feature/history-fix';
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { expect: fetchCommand(MAIN_HISTORY_REFSPEC), result: result(0) },
    { expect: fetchCommand(headRefspec), result: result(128, '', 'fatal: transport unavailable') }
  ]);
  assert.throws(
    () => ensureReleaseHistory({
      env: { GITHUB_HEAD_REF: 'feature/history-fix' },
      spawn: mock.spawn,
      log: () => {}
    }),
    /cannot acquire complete release history: fatal: transport unavailable/u
  );
}

{
  const headRefspec = '+refs/heads/feature/history-fix:refs/remotes/origin/feature/history-fix';
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { expect: fetchCommand(MAIN_HISTORY_REFSPEC), result: result(0) },
    {
      expect: fetchCommand(headRefspec),
      result: result(128, '', "fatal: couldn't find remote ref refs/heads/feature/history-fix")
    }
  ]);
  assert.throws(
    () => ensureReleaseHistory({
      env: { GITHUB_HEAD_REF: 'feature/history-fix' },
      spawn: mock.spawn,
      log: () => {}
    }),
    /cannot acquire complete release history: fatal: couldn't find remote ref refs\/heads\/feature\/history-fix/u
  );
}

{
  const pullHeadRefspec = '+refs/pull/2132/head:refs/remotes/pull/2132/head';
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { expect: fetchCommand(MAIN_HISTORY_REFSPEC), result: result(0) },
    {
      expect: fetchCommand(pullHeadRefspec),
      result: result(128, '', "fatal: couldn't find remote ref refs/pull/2132/head")
    }
  ]);
  assert.throws(
    () => ensureReleaseHistory({
      env: { GITHUB_REF: 'refs/pull/2132/head' },
      spawn: mock.spawn,
      log: () => {}
    }),
    /cannot acquire complete release history: fatal: couldn't find remote ref refs\/pull\/2132\/head/u
  );
}

console.log('ensure-release-history.test: OK');
