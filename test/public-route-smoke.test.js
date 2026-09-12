import assert from 'node:assert/strict';
import { ROUTE_CASES, VIEWPORTS, normalizeBaseUrl, parseArgs } from '../tools/smoke-public-routes.mjs';

assert.deepEqual(VIEWPORTS.map(({ width, height }) => `${width},${height}`), ['1440,1000', '390,844']);
assert.deepEqual(ROUTE_CASES.map(({ route }) => route), [
  '#desk/keir-starmer/matt-clifford/2025',
  '#desk/demet-mutlu/matt-clifford',
  '#desk/keir-starmer/matt-clifford/2020',
  '#surface/dialog-public-directory-exposure-2026-06-16'
]);
for (const routeCase of ROUTE_CASES) {
  assert.equal(routeCase.expected.length, 2, `${routeCase.id} must retain both semantic assertions`);
}
assert.equal(normalizeBaseUrl('https://example.test/clifford-number'), 'https://example.test/clifford-number/');
assert.equal(parseArgs(['--base-url', 'http://127.0.0.1:8080', '--timeout-ms', '10000']).timeoutMs, 10000);
assert.throws(() => parseArgs([]), /--base-url is required/);
assert.throws(() => parseArgs(['--base-url', 'file:///tmp/site']), /http or https/);
assert.throws(() => parseArgs(['--base-url', 'https://example.test', '--timeout-ms', '0']), /1000 through 120000/);
const fs = await import('node:fs');
const smokeSource = fs.readFileSync('tools/smoke-public-routes.mjs', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert.match(smokeSource, /body\?\.textContent\.includes/);
assert.match(indexSource, /<h1 id="desk-title"/);
assert.doesNotMatch(indexSource, /<h3 id="desk-title"/);

console.log('public-route-smoke.test: OK');
