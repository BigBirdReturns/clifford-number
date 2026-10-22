import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const VIEWPORTS = Object.freeze([
  Object.freeze({ name: 'desktop', width: 1440, height: 1000 }),
  Object.freeze({ name: 'mobile', width: 390, height: 844 }),
  Object.freeze({ name: 'narrow', width: 320, height: 568 })
]);

// Files the ledger timeline must never pull on arrival: the GPU field is loaded
// only when the Explore tab is chosen.
export const WEBGL_PATH_PATTERN = /atlas-webgl\.js|social-field\.js|\/vendor\//;

export const ROUTE_CASES = Object.freeze([
  Object.freeze({
    id: 'timeline-default',
    route: 'explorer.html',
    // The arrival card and the roster block read the same at every width; lane
    // labels are truncated at phone widths, so they are not text anchors here.
    expected: Object.freeze([
      'Every mark is one ledger row.',
      'names listed'
    ]),
    timeline: Object.freeze({ min_marks: 48, blocks: 1, block_text: '112', no_webgl: true, single_fetch: true })
  }),
  Object.freeze({
    id: 'timeline-default-slow-data',
    route: 'explorer.html',
    // Every JSON response is held for DELAYED_JSON_MS while the scripts arrive
    // at full speed, so the aperture's 24-file chain finishes before app.js
    // has its data. On a zero-latency server the handoff race never shows;
    // here single_fetch fails unless the mount waits for app.js first.
    network: Object.freeze({ delay_json_ms: 500 }),
    expected: Object.freeze([
      'Every mark is one ledger row.',
      'names listed'
    ]),
    timeline: Object.freeze({ min_marks: 48, blocks: 1, block_text: '112', no_webgl: true, single_fetch: true })
  }),
  Object.freeze({
    id: 'timeline-shared-view',
    route: 'explorer.html?ap_v=1&ap_mode=timeline&ap_time_lanes=ben-warner,marc-warner,saul-klein&ap_time_from=2018-01-01&ap_time_to=2018-12-31&ap_time_sel=faculty-science-officer-employee-overlap-2018-01-24::actor::ben-warner',
    expected: Object.freeze([
      'Faculty Science officer / employee overlap, 24 January 2018',
      'Commercial Principal, ASI Data Science'
    ]),
    timeline: Object.freeze({ min_marks: 3, blocks: 0, selected: 'faculty-science-officer-employee-overlap-2018-01-24::actor::ben-warner', no_webgl: true, single_fetch: true })
  }),
  Object.freeze({
    id: 'dated-connection',
    route: 'explorer.html#desk/keir-starmer/matt-clifford/2025',
    expected: Object.freeze([
      'Documented: 1 step as of 2025',
      'AI Opportunities Action Plan publication and government response, 13 January 2025'
    ])
  }),
  Object.freeze({
    id: 'documented-absence-boundary',
    route: 'explorer.html#desk/demet-mutlu/matt-clifford',
    expected: Object.freeze([
      'No documented connection',
      'That is a statement about the documentation gathered here, not proof of absence.'
    ])
  }),
  Object.freeze({
    id: 'dated-negative-with-all-time-route',
    route: 'explorer.html#desk/keir-starmer/matt-clifford/2020',
    expected: Object.freeze([
      'Not documented for 2020',
      'documented all-time connection exists'
    ])
  }),
  Object.freeze({
    id: 'dense-surface-boundary',
    route: 'explorer.html#surface/dialog-public-directory-exposure-2026-06-16',
    expected: Object.freeze([
      'Dialog public-directory exposure, 16 June 2026',
      'The 112-name roster is dense and semantically insufficient for pairwise topology.'
    ])
  }),
  // Record pages: a facts chip with its denominator and the first date-sorted
  // ledger row (the oldest surface, so the sort is what is asserted).
  Object.freeze({
    id: 'actor-record',
    route: 'explorer.html#actor/ben-warner',
    expected: Object.freeze([
      '10 documented surfaces of 54',
      'Faculty Science officer / employee overlap, 24 January 2018'
    ])
  }),
  Object.freeze({
    id: 'organization-record',
    route: 'explorer.html#organization/electric-twin',
    expected: Object.freeze([
      '18 documented surfaces of 54',
      'Electric Twin incorporation and initial-director surface, 28 September 2023'
    ])
  }),
  Object.freeze({
    id: 'type-record',
    route: 'explorer.html#type/employment_investment_surface',
    expected: Object.freeze([
      '8 surfaces of 54',
      'Faculty Science officer / employee overlap, 24 January 2018'
    ])
  }),
  Object.freeze({
    id: 'year-record',
    route: 'explorer.html#year/2025',
    expected: Object.freeze([
      '12 surfaces started of 54',
      '28 admitted hop bases dated in the year'
    ])
  })
]);

const DEFAULT_TIMEOUT_MS = 15_000;

export function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('base URL must use http or https');
  parsed.hash = '';
  parsed.search = '';
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  return parsed.href;
}

export function parseArgs(argv) {
  const options = {
    baseUrl: null,
    chrome: process.env.CLIFFORD_CHROME || null,
    outputDir: null,
    timeoutMs: DEFAULT_TIMEOUT_MS
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${token} requires a value`);
      index += 1;
      return value;
    };
    if (token === '--base-url') options.baseUrl = next();
    else if (token === '--chrome') options.chrome = next();
    else if (token === '--output-dir') options.outputDir = next();
    else if (token === '--timeout-ms') options.timeoutMs = Number(next());
    else if (token === '--help') options.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (options.help) return options;
  if (!options.baseUrl) throw new Error('--base-url is required');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 120_000) {
    throw new Error('--timeout-ms must be an integer from 1000 through 120000');
  }
  options.baseUrl = normalizeBaseUrl(options.baseUrl);
  return options;
}

function visibleCount(selector) {
  return [...document.querySelectorAll(selector)].filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  }).length;
}

async function waitForText(page, text, timeoutMs) {
  await page.waitForFunction(
    (needle) => document.body?.textContent.includes(needle) === true,
    text,
    { timeout: timeoutMs }
  );
}

function safeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

// A route without a query must end without one; a route that carries aperture
// state may be normalized (the aperture writes every key it owns) but every
// requested parameter must survive with its value, and path and hash must hold.
export function urlDrift(target, actual) {
  const expected = new URL(target);
  const current = new URL(actual);
  if (expected.origin !== current.origin || expected.pathname !== current.pathname || expected.hash !== current.hash) return 'path or hash changed';
  if (!expected.search) return current.search ? `query added: ${current.search}` : null;
  for (const [key, value] of expected.searchParams) {
    if (current.searchParams.get(key) !== value) return `query parameter ${key} changed`;
  }
  return null;
}

function timelineAssertions(routeCase, viewport, metrics) {
  const spec = routeCase.timeline;
  const label = `${routeCase.id}/${viewport.name}`;
  if (!metrics.active_tab) throw new Error(`${label}: the Timeline tab is not active`);
  if (metrics.stage_hidden) throw new Error(`${label}: #aperture-timeline is hidden`);
  if (metrics.marks < spec.min_marks) throw new Error(`${label}: ${metrics.marks} timeline marks, expected at least ${spec.min_marks}`);
  if (metrics.blocks.length !== spec.blocks) throw new Error(`${label}: ${metrics.blocks.length} roster blocks, expected ${spec.blocks}`);
  if (spec.block_text && !metrics.blocks.some(text => text.includes(spec.block_text))) throw new Error(`${label}: no roster block names ${spec.block_text}`);
  if (metrics.pair_lines !== 0) throw new Error(`${label}: ${metrics.pair_lines} person-to-person lines drawn; the timeline must never draw one`);
  if (spec.selected && metrics.selected !== spec.selected) throw new Error(`${label}: selected mark ${metrics.selected}, expected ${spec.selected}`);
  if (spec.no_webgl) {
    const webgl = metrics.resources.filter(entry => WEBGL_PATH_PATTERN.test(entry.name));
    if (webgl.length) throw new Error(`${label}: WebGL path fetched on arrival ${JSON.stringify(webgl.map(entry => entry.name))}`);
  }
  if (spec.single_fetch) {
    const counts = new Map();
    for (const entry of metrics.resources) if (/\.json$/.test(entry.name)) counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
    if (duplicates.length) throw new Error(`${label}: JSON fetched more than once ${JSON.stringify(duplicates)}`);
  }
}

async function configureContext(browser, baseOrigin, viewport, timeoutMs, externalRequests, network = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    colorScheme: 'light',
    locale: 'en-US'
  });
  context.setDefaultTimeout(timeoutMs);
  context.setDefaultNavigationTimeout(timeoutMs);
  const delayJsonMs = Number(network.delay_json_ms) || 0;
  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseOrigin) {
      if (delayJsonMs > 0 && /\.json$/.test(requestUrl.pathname)) {
        // Serve the real body, late: the server answers now, the page sees it
        // after the delay, so script order versus data order is inverted.
        const response = await route.fetch();
        await new Promise(resolve => setTimeout(resolve, delayJsonMs));
        return route.fulfill({ response });
      }
      return route.continue();
    }
    if (requestUrl.hostname === 'fonts.googleapis.com') {
      return route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' });
    }
    externalRequests.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  return context;
}

export async function runSmoke(options) {
  const { chromium } = await import('playwright');
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  };
  if (options.chrome) launchOptions.executablePath = options.chrome;
  const browser = await chromium.launch(launchOptions);
  const report = {
    schema: 'clifford/public-route-smoke@1',
    base_url: options.baseUrl,
    timeout_ms: options.timeoutMs,
    browser: await browser.version(),
    cases: [],
    navigation: null
  };
  const baseOrigin = new URL(options.baseUrl).origin;
  if (options.outputDir) fs.mkdirSync(options.outputDir, { recursive: true });
  try {
    for (const viewport of VIEWPORTS) {
      for (const routeCase of ROUTE_CASES) {
        const externalRequests = [];
        const context = await configureContext(browser, baseOrigin, viewport, options.timeoutMs, externalRequests, routeCase.network);
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', (error) => pageErrors.push(String(error)));
        const target = new URL(routeCase.route, options.baseUrl).href;
        const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
        if (response && response.status() >= 400) throw new Error(`${routeCase.id}/${viewport.name}: HTTP ${response.status()}`);
        await page.waitForFunction(
          () => document.querySelector('#app-status')?.classList.contains('is-ready') === true,
          null,
          { timeout: options.timeoutMs }
        );
        for (const expected of routeCase.expected) await waitForText(page, expected, options.timeoutMs);
        let timeline = null;
        if (routeCase.timeline) {
          await page.waitForFunction(
            (minimum) => document.querySelectorAll('#aperture-timeline [data-ap-time-mark]').length >= minimum,
            routeCase.timeline.min_marks,
            { timeout: options.timeoutMs }
          );
          timeline = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource').map(entry => ({ name: new URL(entry.name).pathname, bytes: entry.encodedBodySize }));
            return {
              active_tab: document.querySelector('[data-ap-mode="timeline"].is-active') !== null,
              stage_hidden: document.querySelector('#aperture-timeline')?.hidden ?? true,
              marks: document.querySelectorAll('#aperture-timeline [data-ap-time-mark]').length,
              columns: document.querySelectorAll('#aperture-timeline [data-ap-time-column]').length,
              blocks: [...document.querySelectorAll('#aperture-timeline [data-ap-time-block]')].map(element => element.textContent.replace(/\s+/g, ' ').trim()),
              pair_lines: document.querySelectorAll('#aperture-timeline line[data-ap-time-pair]').length,
              selected: document.querySelector('#aperture-timeline .is-selected[data-ap-time-mark]')?.dataset.apTimeMark ?? null,
              document_bytes: navigation?.encodedBodySize ?? 0,
              resources,
              resource_bytes: resources.reduce((sum, entry) => sum + entry.bytes, 0)
            };
          });
          timelineAssertions(routeCase, viewport, timeline);
        }
        const drift = urlDrift(target, page.url());
        if (drift) throw new Error(`${routeCase.id}/${viewport.name}: URL drifted to ${page.url()} (${drift})`);
        const metrics = await page.evaluate(visibleCountSource => {
          const countVisible = new Function(`return (${visibleCountSource})`)();
          const root = document.documentElement;
          return {
            title: document.title,
            client_width: root.clientWidth,
            scroll_width: root.scrollWidth,
            client_height: root.clientHeight,
            scroll_height: root.scrollHeight,
            visible_h1: countVisible('h1'),
            visible_main: countVisible('main'),
            focusable: countVisible('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
            reduced_motion: matchMedia('(prefers-reduced-motion: reduce)').matches
          };
        }, visibleCount.toString());
        if (metrics.scroll_width > metrics.client_width + 1) {
          throw new Error(`${routeCase.id}/${viewport.name}: horizontal overflow ${metrics.scroll_width}>${metrics.client_width}`);
        }
        if (metrics.visible_h1 !== 1) throw new Error(`${routeCase.id}/${viewport.name}: expected one visible h1, saw ${metrics.visible_h1}`);
        if (metrics.visible_main !== 1) throw new Error(`${routeCase.id}/${viewport.name}: expected one visible main, saw ${metrics.visible_main}`);
        if (metrics.focusable < 1) throw new Error(`${routeCase.id}/${viewport.name}: no focusable controls`);
        if (!metrics.reduced_motion) throw new Error(`${routeCase.id}/${viewport.name}: reduced-motion contract not active`);
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const active = document.activeElement;
          return {
            tag: active?.tagName || null,
            id: active?.id || null,
            body: active === document.body || active === document.documentElement
          };
        });
        if (focused.body || !focused.tag) throw new Error(`${routeCase.id}/${viewport.name}: keyboard focus did not enter the interface`);
        if (consoleErrors.length || pageErrors.length) {
          throw new Error(`${routeCase.id}/${viewport.name}: browser errors ${JSON.stringify({ consoleErrors, pageErrors })}`);
        }
        if (externalRequests.length) {
          throw new Error(`${routeCase.id}/${viewport.name}: undeclared external requests ${JSON.stringify(externalRequests)}`);
        }
        let screenshot = null;
        if (options.outputDir) {
          screenshot = `${safeName(viewport.name)}-${safeName(routeCase.id)}.png`;
          await page.screenshot({ path: path.join(options.outputDir, screenshot), fullPage: false });
        }
        report.cases.push({
          id: routeCase.id,
          route: routeCase.route,
          viewport,
          network: routeCase.network ?? null,
          expected: routeCase.expected,
          metrics,
          timeline: timeline ? { ...timeline, resources: timeline.resources.length, resource_list: timeline.resources } : null,
          focused,
          console_errors: consoleErrors,
          page_errors: pageErrors,
          external_requests: externalRequests,
          screenshot
        });
        await context.close();
      }
    }

    const navigationExternalRequests = [];
    const context = await configureContext(browser, baseOrigin, VIEWPORTS[0], options.timeoutMs, navigationExternalRequests);
    const page = await context.newPage();
    const explorerUrl = new URL('explorer.html', options.baseUrl).href;
    await page.goto(explorerUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
    await page.waitForFunction(
      () => document.querySelector('#app-status')?.classList.contains('is-ready') === true,
      null,
      { timeout: options.timeoutMs }
    );
    await waitForText(page, 'The machine is already in the records.', options.timeoutMs);
    // Back/Forward is exercised on the first hash route (the desk), not on the
    // query-less arrival page, so the history step is a real route change.
    const navigationCase = ROUTE_CASES.find(routeCase => routeCase.route.includes('#'));
    const navigationHash = new URL(navigationCase.route, options.baseUrl).hash;
    await page.evaluate((route) => { location.hash = route; }, navigationHash);
    await waitForText(page, navigationCase.expected[0], options.timeoutMs);
    await page.goBack();
    await page.waitForFunction(() => location.hash === '', null, { timeout: options.timeoutMs });
    await waitForText(page, 'The machine is already in the records.', options.timeoutMs);
    await page.goForward();
    await page.waitForFunction((route) => location.hash === route, navigationHash, { timeout: options.timeoutMs });
    await waitForText(page, navigationCase.expected[0], options.timeoutMs);
    if (navigationExternalRequests.length) {
      throw new Error(`navigation: undeclared external requests ${JSON.stringify(navigationExternalRequests)}`);
    }
    report.navigation = {
      route: navigationCase.route,
      back_forward: 'PASS',
      final_url: page.url(),
      external_requests: navigationExternalRequests
    };
    await context.close();
  } finally {
    await browser.close();
  }
  if (options.outputDir) {
    fs.writeFileSync(path.join(options.outputDir, 'public-route-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

function usage() {
  return [
    'Usage: node tools/smoke-public-routes.mjs --base-url URL [options]',
    '  --chrome PATH       Chromium/Chrome executable (or CLIFFORD_CHROME)',
    '  --output-dir PATH   Save screenshots and JSON report',
    '  --timeout-ms N      Per-navigation/assertion timeout (default 15000)'
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const report = await runSmoke(options);
  const arrival = report.cases.find(item => item.id === 'timeline-default' && item.viewport.name === 'desktop');
  const slowData = report.cases.find(item => item.id === 'timeline-default-slow-data' && item.viewport.name === 'desktop');
  const jsonRequests = item => item?.timeline ? item.timeline.resource_list.filter(entry => /\.json$/.test(entry.name)).length : null;
  console.log(JSON.stringify({
    schema: report.schema,
    browser: report.browser,
    cases: report.cases.length,
    navigation: report.navigation?.back_forward,
    timeline_arrival: arrival?.timeline ? {
      marks: arrival.timeline.marks,
      columns: arrival.timeline.columns,
      blocks: arrival.timeline.blocks.length,
      requests: arrival.timeline.resources + 1,
      json_requests: jsonRequests(arrival),
      bytes: arrival.timeline.document_bytes + arrival.timeline.resource_bytes
    } : null,
    // The same arrival with every JSON response held back: the JSON request
    // count must match the fast arrival, or the aperture re-fetched.
    timeline_slow_data: slowData?.timeline ? {
      delay_json_ms: slowData.network?.delay_json_ms ?? null,
      requests: slowData.timeline.resources + 1,
      json_requests: jsonRequests(slowData)
    } : null,
    status: 'PASS'
  }));
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}
