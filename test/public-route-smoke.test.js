import assert from 'node:assert/strict';
import { ROUTE_CASES, VIEWPORTS, WEBGL_PATH_PATTERN, normalizeBaseUrl, parseArgs, urlDrift } from '../tools/smoke-public-routes.mjs';

assert.deepEqual(VIEWPORTS.map(({ width, height }) => `${width},${height}`), ['1440,1000', '390,844', '320,568']);
assert.deepEqual(ROUTE_CASES.map(({ route }) => route), [
  'explorer.html',
  'explorer.html?ap_v=1&ap_mode=timeline&ap_time_lanes=ben-warner,marc-warner,saul-klein&ap_time_from=2018-01-01&ap_time_to=2018-12-31&ap_time_sel=faculty-science-officer-employee-overlap-2018-01-24::actor::ben-warner',
  'explorer.html#desk/keir-starmer/matt-clifford/2025',
  'explorer.html#desk/demet-mutlu/matt-clifford',
  'explorer.html#desk/keir-starmer/matt-clifford/2020',
  'explorer.html#surface/dialog-public-directory-exposure-2026-06-16'
]);
for (const routeCase of ROUTE_CASES) {
  assert.equal(routeCase.expected.length, 2, `${routeCase.id} must retain both semantic assertions`);
}
const timelineCases = ROUTE_CASES.filter(routeCase => routeCase.timeline);
assert.deepEqual(timelineCases.map(routeCase => routeCase.id), ['timeline-default', 'timeline-shared-view']);
assert.equal(timelineCases[0].timeline.min_marks, 48, 'the phone default domain draws 48 marks plus the roster block');
assert.equal(timelineCases[0].timeline.blocks, 1);
assert.equal(timelineCases[0].timeline.block_text, '112');
assert.equal(timelineCases[1].timeline.selected, 'faculty-science-officer-employee-overlap-2018-01-24::actor::ben-warner');
assert.ok(timelineCases.every(routeCase => routeCase.timeline.no_webgl && routeCase.timeline.single_fetch), 'arrival never loads the WebGL path or fetches a JSON twice');
assert.equal(WEBGL_PATH_PATTERN.test('/src/atlas-webgl.js'), true);
assert.equal(WEBGL_PATH_PATTERN.test('/vendor/three.core.js'), true);
assert.equal(WEBGL_PATH_PATTERN.test('/src/visual-aperture-social-field-runtime.js'), false, 'the classic social-field runtime is part of the loader, not the WebGL path');
assert.equal(normalizeBaseUrl('https://example.test/clifford-number'), 'https://example.test/clifford-number/');
assert.equal(parseArgs(['--base-url', 'http://127.0.0.1:8080', '--timeout-ms', '10000']).timeoutMs, 10000);
assert.throws(() => parseArgs([]), /--base-url is required/);
assert.throws(() => parseArgs(['--base-url', 'file:///tmp/site']), /http or https/);
assert.throws(() => parseArgs(['--base-url', 'https://example.test', '--timeout-ms', '0']), /1000 through 120000/);
assert.equal(urlDrift('https://x.test/explorer.html', 'https://x.test/explorer.html'), null);
assert.match(urlDrift('https://x.test/explorer.html', 'https://x.test/explorer.html?ap_v=1'), /query added/, 'a query-less route must end without a query');
assert.match(urlDrift('https://x.test/explorer.html#a', 'https://x.test/explorer.html#b'), /path or hash/);
assert.equal(urlDrift('https://x.test/explorer.html?ap_v=1&ap_mode=timeline&ap_time_lanes=a,b', 'https://x.test/explorer.html?ap_v=1&ap_mode=timeline&ap_overview_page=1&ap_time_lanes=a%2Cb'), null, 'the aperture may normalize a shared URL but must keep every requested value');
assert.match(urlDrift('https://x.test/explorer.html?ap_v=1&ap_mode=timeline', 'https://x.test/explorer.html?ap_v=1&ap_mode=map'), /ap_mode changed/);
const fs = await import('node:fs');
const smokeSource = fs.readFileSync('tools/smoke-public-routes.mjs', 'utf8');
const explorerSource = fs.readFileSync('explorer.html', 'utf8');
const appSource = fs.readFileSync('app.js', 'utf8');
assert.doesNotMatch(smokeSource, /^import\s+.*from ['"]playwright['"];?$/m);
assert.match(smokeSource, /await import\(['"]playwright['"]\)/);
assert.match(smokeSource, /body\?\.textContent\.includes/);
assert.match(smokeSource, /#aperture-timeline line\[data-ap-time-pair\]/, 'the reserved never-matching selector is asserted absent');
assert.match(smokeSource, /#aperture-timeline \[data-ap-time-mark\]/);
assert.match(smokeSource, /\[data-ap-mode="timeline"\]\.is-active/);
assert.match(explorerSource, /<h1 id="desk-title"/);
assert.doesNotMatch(explorerSource, /<h3 id="desk-title"/);
assert.match(appSource, /function entityHeading[\s\S]*?<h1>\$\{esc\(label\)\}<\/h1>/);
assert.match(appSource, /<h1>Actor → named surface → actor\.<\/h1>/);
assert.match(appSource, /<h1>The receipts, inside the instrument\.<\/h1>/);
assert.match(appSource, /<h1>\$\{esc\(track\.label\)\}<\/h1>/);
assert.match(appSource, /globalThis\.__cliffordPublicData = \{ surfaceGraph, hopGraph, receiptGraph, legacyGraph \}/, 'app.js hands its loaded artifacts to the aperture');

console.log('public-route-smoke.test: OK');
