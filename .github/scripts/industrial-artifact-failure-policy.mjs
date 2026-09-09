#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const EXPECTED_LANE = 'first_party_industrial_exhaust_artifact_hydration';
const ALLOWED_ORIGIN = 'https://www.dentsu.com';
const ALLOWED_PATH_PREFIX = '/news-releases/';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedFailure(failure) {
  return {
    stage: failure?.stage ?? null,
    canonical_url: failure?.canonical_url ?? null,
    error: failure?.error ?? null,
  };
}

export function isAllowedAccessControlChallenge(failure) {
  const item = normalizedFailure(failure);
  if (item.stage !== 'artifact' || typeof item.canonical_url !== 'string' || typeof item.error !== 'string') {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(item.canonical_url);
  } catch {
    return false;
  }

  if (parsed.origin !== ALLOWED_ORIGIN || !parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
    return false;
  }
  if (parsed.username || parsed.password || parsed.hash) return false;

  return item.error === `HTML artifact is an access-control challenge for ${item.canonical_url}`;
}

export function evaluateIndustrialArtifactResult(result) {
  invariant(result && typeof result === 'object' && !Array.isArray(result), 'hydration result must be an object');
  invariant(result.lane === EXPECTED_LANE, `unexpected hydration lane: ${result.lane}`);
  invariant(result.graph_effect === 'none', `unexpected graph effect: ${result.graph_effect}`);
  invariant(result.canonical_mutation_authorized === false, 'artifact hydration must not authorize canonical mutation');
  invariant(Array.isArray(result.failures), 'hydration result failures must be an array');

  const allowed_access_control_challenges = [];
  const unexpected_failures = [];
  for (const failure of result.failures) {
    const item = normalizedFailure(failure);
    if (isAllowedAccessControlChallenge(item)) allowed_access_control_challenges.push(item);
    else unexpected_failures.push(item);
  }

  return {
    schema_version: 'industrial-artifact-failure-policy@1',
    allowed_origin: ALLOWED_ORIGIN,
    allowed_path_prefix: ALLOWED_PATH_PREFIX,
    failure_count: result.failures.length,
    allowed_access_control_challenge_count: allowed_access_control_challenges.length,
    unexpected_failure_count: unexpected_failures.length,
    allowed_access_control_challenges,
    unexpected_failures,
    graph_effect: 'none',
    canonical_mutation_authorized: false,
  };
}

function selfTest() {
  const base = {
    lane: EXPECTED_LANE,
    failures: [],
    graph_effect: 'none',
    canonical_mutation_authorized: false,
  };
  assert.equal(evaluateIndustrialArtifactResult(base).unexpected_failure_count, 0);

  const url = 'https://www.dentsu.com/news-releases/example';
  const allowed = {
    stage: 'artifact',
    canonical_url: url,
    error: `HTML artifact is an access-control challenge for ${url}`,
  };
  assert.equal(isAllowedAccessControlChallenge(allowed), true);
  assert.equal(
    evaluateIndustrialArtifactResult({ ...base, failures: [allowed] }).allowed_access_control_challenge_count,
    1,
  );

  for (const rejected of [
    { ...allowed, stage: 'index' },
    { ...allowed, canonical_url: 'https://outside.example/news-releases/example' },
    { ...allowed, canonical_url: 'https://www.dentsu.com/blog/example' },
    { ...allowed, error: 'HTTP 500 Internal Server Error' },
    { ...allowed, error: `${allowed.error}-mismatch` },
  ]) {
    assert.equal(isAllowedAccessControlChallenge(rejected), false);
    assert.equal(
      evaluateIndustrialArtifactResult({ ...base, failures: [rejected] }).unexpected_failure_count,
      1,
    );
  }

  assert.throws(
    () => evaluateIndustrialArtifactResult({ ...base, graph_effect: 'candidate' }),
    /unexpected graph effect/,
  );
  assert.throws(
    () => evaluateIndustrialArtifactResult({ ...base, canonical_mutation_authorized: true }),
    /must not authorize canonical mutation/,
  );
  assert.throws(
    () => evaluateIndustrialArtifactResult({ ...base, failures: null }),
    /failures must be an array/,
  );

  console.log('industrial artifact failure policy self-test: OK');
}

function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }

  const filePath = process.argv[2];
  invariant(typeof filePath === 'string' && filePath.length > 0, 'usage: industrial-artifact-failure-policy.mjs <hydration-result.json>');
  const result = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const evaluation = evaluateIndustrialArtifactResult(result);
  console.log(JSON.stringify(evaluation, null, 2));
  if (evaluation.unexpected_failure_count > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
