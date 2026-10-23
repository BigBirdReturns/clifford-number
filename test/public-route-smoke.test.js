import assert from 'node:assert/strict';
import { ROUTE_CASES, VIEWPORTS, WEBGL_PATH_PATTERN, normalizeBaseUrl, parseArgs, urlDrift } from '../tools/smoke-public-routes.mjs';

assert.deepEqual(VIEWPORTS.map(({ width, height }) => `${width},${height}`), ['1440,1000', '390,844', '320,568']);
assert.deepEqual(ROUTE_CASES.map(({ route }) => route), [
  'explorer.html',
  'explorer.html',
  'explorer.html?ap_v=1&ap_mode=timeline',
  'explorer.html?ap_v=1&ap_mode=timeline',
  'explorer.html?ap_v=1&ap_mode=timeline&ap_time_lanes=ben-warner,marc-warner,saul-klein&ap_time_from=2018-01-01&ap_time_to=2018-12-31&ap_time_sel=faculty-science-officer-employee-overlap-2018-01-24::actor::ben-warner',
  'explorer.html?ap_v=1&ap_mode=surface',
  'explorer.html#desk/keir-starmer/matt-clifford/2025',
  'explorer.html#desk/demet-mutlu/matt-clifford',
  'explorer.html#desk/keir-starmer/matt-clifford/2020',
  'explorer.html#surface/dialog-public-directory-exposure-2026-06-16',
  'explorer.html#actor/ben-warner',
  'explorer.html#organization/electric-twin',
  'explorer.html#type/employment_investment_surface',
  'explorer.html#year/2025'
]);
for (const routeCase of ROUTE_CASES) {
  assert.equal(routeCase.expected.length, 2, `${routeCase.id} must retain both semantic assertions`);
}
// Record pages assert a facts chip that names its denominator and the oldest
// ledger row, so the date sort and the 'of 54' denominator are both exercised
// in a browser at every viewport.
const recordCases = ROUTE_CASES.filter(routeCase => routeCase.id.endsWith('-record'));
assert.deepEqual(recordCases.map(routeCase => routeCase.id), ['actor-record', 'organization-record', 'type-record', 'year-record']);
assert.ok(recordCases.every(routeCase => / of 54\b|dated in the year/.test(routeCase.expected[0])), 'every record case pins a count with its denominator');
assert.equal(recordCases[0].expected[1], 'Faculty Science officer / employee overlap, 24 January 2018', 'Ben Warner\'s ledger opens on his oldest surface, not the ledger order');
const timelineCases = ROUTE_CASES.filter(routeCase => routeCase.timeline);
assert.deepEqual(timelineCases.map(routeCase => routeCase.id), ['timeline-default', 'timeline-default-slow-data', 'timeline-shared-view']);
assert.equal(timelineCases[0].timeline.min_marks, 48, 'the phone default domain draws 48 marks plus the roster block');
assert.equal(timelineCases[0].timeline.blocks, 1);
assert.equal(timelineCases[0].timeline.block_text, '112');
assert.equal(timelineCases[0].network, undefined, 'the fast arrival runs against the server as served');
// SPEC (g) under the race it was reviewed for: every JSON answer is held back so
// the aperture's script chain beats app.js; single_fetch then only passes when
// the mount waits for the handoff instead of reading eagerly.
assert.deepEqual(timelineCases[1].network, { delay_json_ms: 500 });
assert.deepEqual(timelineCases[1].timeline, timelineCases[0].timeline, 'the slow-data arrival asserts exactly what the fast one does');
assert.equal(timelineCases[2].timeline.selected, 'faculty-science-officer-employee-overlap-2018-01-24::actor::ben-warner');
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
assert.match(smokeSource, /ROUTE_CASES\.find\(routeCase => routeCase\.route\.includes\('#'\)\)/, 'back/forward is exercised on a hash route, not the query-less arrival page');
assert.equal(ROUTE_CASES.find(routeCase => routeCase.route.includes('#')).id, 'dated-connection');
assert.match(smokeSource, /#aperture-timeline \[data-ap-time-mark\]/);
// The renderer badge and the mode caption are measured against every lane
// label's cell and the case fails on any intersection, at every viewport.
assert.match(smokeSource, /querySelectorAll\('\.aperture-renderer-badge, \.aperture-stage-guide'\)/, 'the stage chrome is measured by its real class names');
assert.match(smokeSource, /querySelectorAll\('#aperture-timeline \[data-ap-time-lane\]'\)/, 'every lane label group is measured');
assert.match(smokeSource, /if \(metrics\.label_overlaps\.length\) throw new Error/, 'any chrome-over-label intersection fails the timeline case');
assert.match(smokeSource, /\[data-ap-mode="timeline"\]\.is-active/);
assert.match(smokeSource, /delay_json_ms/);
assert.match(smokeSource, /const response = await route\.fetch\(\);[\s\S]*?setTimeout\(resolve, delayJsonMs \|\| network\.delay_field_ms\)[\s\S]*?route\.fulfill\(\{ response \}\)/, 'delayed JSON is the real body served late, not a stub');
assert.match(smokeSource, /configureContext\(browser, baseOrigin, viewport, options\.timeoutMs, externalRequests, routeCase\.network\)/, 'each case carries its own network shaping');
const part11Source = fs.readFileSync('src/visual-aperture-part-11.js', 'utf8');
assert.match(part11Source, /await waitForPublicApp\(\);\s*\n\s*const \[surfaceGraph, hopGraph, receiptGraph, legacyGraph\] = await Promise\.all\(\[\s*\n\s*readData\('build\/surface-graph\.json'\)/, 'the mount waits for the app.js handoff before it reads any artifact');
assert.match(explorerSource, /<h1 id="desk-title"/);
assert.doesNotMatch(explorerSource, /<h3 id="desk-title"/);
assert.match(appSource, /function entityHeading[\s\S]*?<h1>\$\{esc\(label\)\}<\/h1>/);
assert.match(appSource, /<h1>Actor → named surface → actor\.<\/h1>/);
assert.match(appSource, /<h1>The receipts, inside the instrument\.<\/h1>/);
assert.match(appSource, /<h1>\$\{esc\(track\.label\)\}<\/h1>/);
assert.match(appSource, /globalThis\.__cliffordPublicData = \{ surfaceGraph, hopGraph, receiptGraph, legacyGraph \}/, 'app.js hands its loaded artifacts to the aperture');
// The record pages behind the four record cases: fed by the timeline model,
// routed by hash, and handed to the aperture through data-ap-open-timeline.
assert.match(appSource, /^import \{[^\n]*buildTimelineModel[^\n]*\} from '\.\/src\/visual-aperture-timeline\.mjs';$/m, 'app.js imports the ledger timeline model on one line');
assert.match(appSource, /state\.timeline = buildTimelineModel\(surfaceGraph, hopGraph\)/, 'one timeline model is built at init');
for (const name of ['renderActor', 'renderOrg', 'renderSurface', 'renderType', 'renderYear', 'actorRecordModel', 'organizationRecordModel', 'surfaceRecordModel', 'typeRecordModel', 'yearRecordModel', 'atlasInspectorOrigin']) {
  assert.match(appSource, new RegExp(`^function ${name}\\(`, 'm'), `app.js defines ${name}`);
}
assert.match(appSource, /data-ap-open-timeline="\$\{esc\(timelineToken\)\}"/);
assert.match(appSource, /globalThis\.__cliffordApertureOrigin/, 'the receipt dialog reads the origin the aperture publishes');
assert.doesNotMatch(appSource, /Structural context index|Factory Score|machine_score|factory_score/, 'no score bar survives on a record page');

console.log('public-route-smoke.test: OK');
