#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  FULL_HISTORY_DEPTH,
  MAIN_HISTORY_REFSPEC,
  buildHistoryRefspecs,
  ensureReleaseHistory
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

{
  assert.deepEqual(
    buildHistoryRefspecs({ GITHUB_REF: 'refs/pull/2132/merge' }),
    [
      MAIN_HISTORY_REFSPEC,
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
    buildHistoryRefspecs({ GITHUB_REF: 'refs/heads/unsafe..branch' }),
    [MAIN_HISTORY_REFSPEC]
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
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    {
      expect: [
        'git', 'fetch', '--no-tags', '--prune', '--quiet', `--depth=${FULL_HISTORY_DEPTH}`,
        'origin', MAIN_HISTORY_REFSPEC,
        '+refs/pull/2132/merge:refs/remotes/pull/2132/merge'
      ],
      result: result(0)
    },
    { result: result(0, 'false\n') }
  ]);
  const outcome = ensureReleaseHistory({
    env: { GITHUB_REF: 'refs/pull/2132/merge' },
    spawn: mock.spawn,
    log: () => {}
  });
  assert.equal(outcome.fetched, true);
  assert.equal(mock.calls.length, 4);
}

{
  const sha = 'a'.repeat(40);
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { result: result(0) },
    { result: result(0, 'true\n') },
    { result: result(0, `${sha}\n`) },
    {
      expect: [
        'git', 'fetch', '--no-tags', '--prune', '--quiet', `--depth=${FULL_HISTORY_DEPTH}`,
        'origin', sha
      ],
      result: result(0)
    },
    { result: result(0, 'false\n') }
  ]);
  const outcome = ensureReleaseHistory({ spawn: mock.spawn, log: () => {} });
  assert.equal(outcome.fetched, true);
}

{
  const mock = scriptedSpawn([
    { result: result(0, 'true\n') },
    { result: result(0, 'true\n') },
    { result: result(128, '', 'fatal: transport unavailable') }
  ]);
  assert.throws(
    () => ensureReleaseHistory({ spawn: mock.spawn, log: () => {} }),
    /cannot acquire complete release history: fatal: transport unavailable/u
  );
}

console.log('ensure-release-history.test: OK');
