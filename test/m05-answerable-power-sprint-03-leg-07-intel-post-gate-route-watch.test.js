import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canonicalJson,
  compareWithPrevious,
  fetchOfficialRoute,
  HostGate,
  routeActivation,
  runIntelRouteWatch,
  semanticSha256,
  sha256,
  validateContract,
  validateReceipt
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch.mjs';

const contract = JSON.parse(fs.readFileSync(
  new URL('../data/project/m05-answerable-power-sprint-03-leg-07-intel-post-gate-route-watch-contract.json', import.meta.url),
  'utf8'
));
const clone = (value) => JSON.parse(JSON.stringify(value));
const gateMs = Date.parse(contract.time_gate.ordinary_gate_utc);

function makeClock(start, step = 1) {
  let current = Number(start);
  return () => {
    const value = current;
    current += step;
    return value;
  };
}

function bodyFor(url) {
  return Buffer.from(`official-surface:${url}`, 'utf8');
}

function successfulFetch({ mutateRouteId = null, challengeRouteId = null, metadataRouteId = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const route = contract.routes.find((candidate) => candidate.url === url);
    assert(route, `unexpected route URL ${url}`);
    assert.equal(options.method, route.method);
    assert.equal(options.redirect, 'manual');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['user-agent'], contract.execution_policy.user_agent);
    assert(!('cookie' in options.headers));
    assert(!('authorization' in options.headers));
    if (route.method === 'POST') {
      assert.equal(options.headers['content-type'], 'application/json');
      assert.equal(options.body, canonicalJson(route.request_body));
      assert.equal(sha256(Buffer.from(options.body, 'utf8')), route.request_body_sha256);
    } else {
      assert.equal(options.body, undefined);
      assert(!('content-type' in options.headers));
    }
    calls.push({ url, options });
    if (route.route_id === challengeRouteId) {
      return new Response('<html><title>Just a moment</title><script src="/cdn-cgi/challenge-platform/x"></script></html>', {
        status: 200,
        headers: { 'content-type': 'text/html', date: 'Thu, 27 Aug 2026 00:00:00 GMT' }
      });
    }
    if (route.route_id === metadataRouteId) {
      return new Response(null, {
        status: 204,
        headers: { 'content-type': 'application/json', date: 'Thu, 27 Aug 2026 00:00:00 GMT' }
      });
    }
    const body = route.route_id === mutateRouteId
      ? Buffer.from(`changed:${url}`, 'utf8')
      : bodyFor(url);
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': route.source_class.includes('rss') ? 'application/rss+xml' : 'application/json',
        'content-length': String(body.length),
        etag: '"stable-test"',
        date: 'Thu, 27 Aug 2026 00:00:00 GMT',
        'x-undisclosed': 'must-not-be-retained'
      }
    });
  };
  return { fetchImpl, calls };
}

function resign(receipt) {
  const copy = clone(receipt);
  delete copy.proof_sha256;
  return {
    ...copy,
    proof_sha256: sha256(Buffer.from(canonicalJson(copy), 'utf8'))
  };
}

function expectReject(fn, pattern) {
  assert.throws(fn, pattern);
}

async function expectRejectAsync(fn, pattern) {
  await assert.rejects(fn, pattern);
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  process.stdout.write(`ok ${passed} - ${name}\n`);
}

await test('contract validates and binds one canonical POST body', () => {
  validateContract(contract);
  assert.equal(contract.routes.length, 5);
  const post = contract.routes.filter((route) => route.method === 'POST');
  assert.equal(post.length, 1);
  assert.equal(post[0].monitor_route_id, 'US-INTEL-REALIZATION-05');
  assert.equal(post[0].request_body_sha256, semanticSha256(post[0].request_body));
});

await test('activation is gated one millisecond before and active at equality', () => {
  assert.deepEqual(routeActivation(contract, gateMs - 1), {
    state: 'gated_not_before',
    not_before_utc: contract.time_gate.ordinary_gate_utc
  });
  assert.deepEqual(routeActivation(contract, gateMs), { state: 'active', not_before_utc: null });
});

await test('pre-gate execution produces five terminal gated rows and zero requests', async () => {
  let calls = 0;
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs - 1,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: async () => { calls += 1; throw new Error('must not execute'); },
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  assert.equal(calls, 0);
  assert.equal(receipt.summary.selected_routes, 5);
  assert.equal(receipt.summary.gated_not_before, 5);
  assert.equal(receipt.summary.executed_routes, 0);
  assert.equal(receipt.summary.network_requests, 0);
  assert(receipt.observations.every((row) => row.completed_at === null));
  assert(receipt.observations.every((row) => row.not_before_utc === contract.time_gate.ordinary_gate_utc));
});

await test('exact-gate execution calls all five routes with bound methods and body', async () => {
  const { fetchImpl, calls } = successfulFetch();
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  assert.equal(calls.length, 5);
  assert.equal(receipt.summary.executed_routes, 5);
  assert.equal(receipt.summary.network_requests, 5);
  assert.equal(receipt.summary.gated_not_before, 0);
  assert.equal(receipt.summary.content_successes, 5);
  assert.equal(receipt.summary.unclassified_failures, 0);
  assert(receipt.observations.every((row) => row.completed_at !== null));
  assert(receipt.observations.every((row) => row.not_before_utc === null));
  assert(receipt.observations.every((row) => !Object.hasOwn(row, 'body')));
  assert(receipt.observations.every((row) => !Object.hasOwn(row.response_headers, 'x-undisclosed')));
});

await test('compatible predecessor authenticates five unchanged boolean comparisons', async () => {
  const first = successfulFetch();
  const prior = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 20_000),
    fetchImpl: first.fetchImpl,
    sleepImpl: async () => {}
  });
  const second = successfulFetch();
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs + 60_000,
    clock: makeClock(gateMs + 80_000),
    fetchImpl: second.fetchImpl,
    previousReceipt: prior,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  assert.equal(receipt.previous_receipt_proof_sha256, prior.proof_sha256);
  assert.equal(receipt.summary.changed_routes, 0);
  assert.equal(receipt.summary.uncompared_routes, 0);
  assert(receipt.observations.every((row) => row.changed_since_previous === false));
});

await test('comparison detects exactly one changed decoded representation', async () => {
  const prior = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 20_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const target = contract.routes[2].route_id;
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs + 60_000,
    clock: makeClock(gateMs + 80_000),
    fetchImpl: successfulFetch({ mutateRouteId: target }).fetchImpl,
    previousReceipt: prior,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  assert.equal(receipt.summary.changed_routes, 1);
  assert.equal(receipt.observations.find((row) => row.route_id === target).changed_since_previous, true);
});

await test('challenge interstitial is classified as failure rather than content', async () => {
  const target = contract.routes[1].route_id;
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch({ challengeRouteId: target }).fetchImpl,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  const row = receipt.observations.find((candidate) => candidate.route_id === target);
  assert.equal(row.status, 'challenge_page');
  assert.equal(row.route_success, false);
  assert.equal(row.content_success, false);
  assert.equal(receipt.summary.challenge_pages, 1);
});

await test('zero-length success is retained as metadata_only', async () => {
  const target = contract.routes[3].route_id;
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch({ metadataRouteId: target }).fetchImpl,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  const row = receipt.observations.find((candidate) => candidate.route_id === target);
  assert.equal(row.status, 'metadata_only');
  assert.equal(row.content_success, false);
  assert.equal(receipt.summary.metadata_only, 1);
});

await test('HTTP and transport failures remain classified in the denominator', async () => {
  let index = 0;
  const fetchImpl = async () => {
    const current = index;
    index += 1;
    if (current === 0) return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    if (current === 1) throw new Error('socket reset');
    return new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } });
  };
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, contract);
  assert.equal(receipt.summary.failure_counts.http_failure, 1);
  assert.equal(receipt.summary.failure_counts.transport_failure, 1);
  assert.equal(receipt.summary.terminal_observations, 5);
});

await test('body ceiling fails closed without retaining overflow bytes', async () => {
  const tiny = clone(contract);
  tiny.execution_policy.max_body_bytes = 1024;
  validateContract(tiny);
  const fetchImpl = async () => new Response(Buffer.alloc(1025, 1), {
    status: 200,
    headers: { 'content-type': 'application/octet-stream' }
  });
  const receipt = await runIntelRouteWatch(tiny, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl,
    sleepImpl: async () => {}
  });
  validateReceipt(receipt, tiny);
  assert(receipt.observations.every((row) => row.status === 'body_limit_exceeded'));
  assert(receipt.observations.every((row) => row.body_bytes === 0 && row.body_sha256 === null));
});

await test('allowlisted GET redirect is followed and bound into receipt custody', async () => {
  const changed = clone(contract);
  const route = changed.routes[0];
  route.allowed_hosts.push('www.sec.gov');
  validateContract(changed);
  let call = 0;
  const fetchImpl = async (url) => {
    call += 1;
    if (call === 1) {
      assert.equal(url, route.url);
      return new Response(null, { status: 302, headers: { location: 'https://www.sec.gov/Archives/test.json' } });
    }
    assert.equal(url, 'https://www.sec.gov/Archives/test.json');
    return new Response('official', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const row = await fetchOfficialRoute(route, changed, {
    fetchImpl,
    clock: makeClock(gateMs + 10_000),
    beforeRequest: async () => {}
  });
  assert.equal(row.status, 'content_retrieved');
  assert.equal(row.network_request_count, 2);
  assert.equal(row.redirect_chain.length, 1);
  assert.equal(row.final_url, 'https://www.sec.gov/Archives/test.json');
});

await test('nonallowlisted redirect is refused after one bounded request', async () => {
  const route = contract.routes[0];
  const row = await fetchOfficialRoute(route, contract, {
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://example.com/escape' } }),
    clock: makeClock(gateMs + 10_000),
    beforeRequest: async () => {}
  });
  assert.equal(row.status, 'policy_refusal');
  assert.equal(row.reason, 'redirect_host_not_allowlisted');
  assert.equal(row.network_request_count, 1);
});

await test('POST redirect is refused rather than replayed', async () => {
  const route = contract.routes.at(-1);
  let calls = 0;
  const row = await fetchOfficialRoute(route, contract, {
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: 307, headers: { location: route.url } });
    },
    clock: makeClock(gateMs + 10_000),
    beforeRequest: async () => {}
  });
  assert.equal(calls, 1);
  assert.equal(row.status, 'policy_refusal');
  assert.equal(row.reason, 'post_redirect_refused');
});

await test('HostGate serializes one host and applies the minimum request interval', async () => {
  let now = 1000;
  const sleeps = [];
  const gate = new HostGate({
    clock: () => now,
    sleepImpl: async (ms) => { sleeps.push(ms); now += ms; }
  });
  await gate.waitForRequest('example.gov', 250);
  now += 100;
  await gate.waitForRequest('example.gov', 250);
  assert.deepEqual(sleeps, [150]);
  const order = [];
  await Promise.all([
    gate.run('example.gov', async () => { order.push('a-start'); await Promise.resolve(); order.push('a-end'); }),
    gate.run('example.gov', async () => { order.push('b-start'); order.push('b-end'); })
  ]);
  assert.deepEqual(order, ['a-start', 'a-end', 'b-start', 'b-end']);
});

await test('future observation clock is refused', async () => {
  await expectRejectAsync(
    () => runIntelRouteWatch(contract, {
      observedAtMs: gateMs + 10_000,
      clock: () => gateMs,
      fetchImpl: successfulFetch().fetchImpl,
      sleepImpl: async () => {}
    }),
    /observation clock cannot be in the future/
  );
});

await test('contract refuses a modified canonical POST body', () => {
  const changed = clone(contract);
  changed.routes.at(-1).request_body.filters.keywords = ['Intel Corporation'];
  expectReject(() => validateContract(changed), /POST body digest mismatch/);
});

await test('receipt unknown top-level field fails after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs - 1,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: async () => { throw new Error('must not execute'); },
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.undeclared = 'forbidden';
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /receipt keys drift/);
});

await test('receipt body alias fails closed after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].body = 'retained bytes';
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /observation 0 .* keys drift/);
});

await test('forged request method and request-body binding fail closed', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].request_method = 'POST';
  changed.observations[0].request_body_sha256 = '0'.repeat(64);
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /request method drift/);
});

await test('nonallowlisted final URL fails after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].final_url = 'https://example.com/escape';
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /final_url does not match redirect chain/);
});

await test('active row without completion fails after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].completed_at = null;
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /active row requires completed_at/);
});

await test('gated row with completion fails after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs - 1,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: async () => { throw new Error('must not execute'); },
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].completed_at = changed.generated_at;
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /gated row must not contain completion/);
});

await test('receipt generation before a terminal completion fails', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.generated_at = new Date(Date.parse(changed.observations[0].completed_at) - 1).toISOString();
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /begins after receipt generation|completes after receipt generation/);
});

await test('promotion authority mutation fails after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].promotion_authority = true;
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /must not grant promotion authority/);
});

await test('impossible request count fails after proof recomputation', async () => {
  const receipt = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  const changed = clone(receipt);
  changed.observations[0].network_request_count = 2;
  const resigned = resign(changed);
  expectReject(() => validateReceipt(resigned, contract), /request count is impossible/);
});

await test('tampered predecessor proof is rejected before successor execution', async () => {
  const prior = await runIntelRouteWatch(contract, {
    observedAtMs: gateMs,
    clock: makeClock(gateMs + 10_000),
    fetchImpl: successfulFetch().fetchImpl,
    sleepImpl: async () => {}
  });
  prior.proof_sha256 = '0'.repeat(64);
  await expectRejectAsync(
    () => runIntelRouteWatch(contract, {
      observedAtMs: gateMs + 60_000,
      clock: makeClock(gateMs + 80_000),
      fetchImpl: successfulFetch().fetchImpl,
      previousReceipt: prior,
      sleepImpl: async () => {}
    }),
    /receipt proof does not recompute/
  );
});

await test('comparison helper leaves absent predecessor routes uncompared', () => {
  const rows = contract.routes.map((route) => ({ route_id: route.route_id, request_method: route.method, request_body_sha256: route.request_body_sha256, status: 'gated_not_before', status_code: null, final_url: route.url, body_sha256: null, body_bytes: 0 }));
  const compared = compareWithPrevious(rows, { observations: rows.slice(0, 4) });
  assert.equal(compared.at(-1).changed_since_previous, null);
});

process.stdout.write(`m05 Intel post-gate route-watch tests: ${passed} passed\n`);
