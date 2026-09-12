import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const VIEWPORTS = Object.freeze([
  Object.freeze({ name: 'desktop', width: 1440, height: 1000 }),
  Object.freeze({ name: 'mobile', width: 390, height: 844 })
]);

export const ROUTE_CASES = Object.freeze([
  Object.freeze({
    id: 'dated-connection',
    route: '#desk/keir-starmer/matt-clifford/2025',
    expected: Object.freeze([
      'Documented: 1 step as of 2025',
      'AI Opportunities Action Plan publication and government response, 13 January 2025'
    ])
  }),
  Object.freeze({
    id: 'documented-absence-boundary',
    route: '#desk/demet-mutlu/matt-clifford',
    expected: Object.freeze([
      'No documented connection',
      'That is a statement about the documentation gathered here, not proof of absence.'
    ])
  }),
  Object.freeze({
    id: 'dated-negative-with-all-time-route',
    route: '#desk/keir-starmer/matt-clifford/2020',
    expected: Object.freeze([
      'Not documented for 2020',
      'documented all-time connection exists'
    ])
  }),
  Object.freeze({
    id: 'dense-surface-boundary',
    route: '#surface/dialog-public-directory-exposure-2026-06-16',
    expected: Object.freeze([
      'Dialog public-directory exposure, 16 June 2026',
      'The 112-name roster is dense and semantically insufficient for pairwise topology.'
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

async function configureContext(browser, baseOrigin, viewport, timeoutMs, externalRequests) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    colorScheme: 'light',
    locale: 'en-US'
  });
  context.setDefaultTimeout(timeoutMs);
  context.setDefaultNavigationTimeout(timeoutMs);
  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseOrigin) return route.continue();
    if (requestUrl.hostname === 'fonts.googleapis.com') {
      return route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' });
    }
    externalRequests.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  return context;
}

export async function runSmoke(options) {
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
        const context = await configureContext(browser, baseOrigin, viewport, options.timeoutMs, externalRequests);
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', (error) => pageErrors.push(String(error)));
        const target = `${options.baseUrl}${routeCase.route}`;
        const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
        if (response && response.status() >= 400) throw new Error(`${routeCase.id}/${viewport.name}: HTTP ${response.status()}`);
        await page.waitForFunction(
          () => document.querySelector('#app-status')?.classList.contains('is-ready') === true,
          null,
          { timeout: options.timeoutMs }
        );
        for (const expected of routeCase.expected) await waitForText(page, expected, options.timeoutMs);
        if (page.url() !== target) throw new Error(`${routeCase.id}/${viewport.name}: URL drifted to ${page.url()}`);
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
          expected: routeCase.expected,
          metrics,
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
    await page.goto(options.baseUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
    await page.waitForFunction(
      () => document.querySelector('#app-status')?.classList.contains('is-ready') === true,
      null,
      { timeout: options.timeoutMs }
    );
    await waitForText(page, 'The machine is already in the records.', options.timeoutMs);
    await page.evaluate((route) => { location.hash = route; }, ROUTE_CASES[0].route);
    await waitForText(page, ROUTE_CASES[0].expected[0], options.timeoutMs);
    await page.goBack();
    await page.waitForFunction(() => location.hash === '', null, { timeout: options.timeoutMs });
    await waitForText(page, 'The machine is already in the records.', options.timeoutMs);
    await page.goForward();
    await page.waitForFunction((route) => location.hash === route, ROUTE_CASES[0].route, { timeout: options.timeoutMs });
    await waitForText(page, ROUTE_CASES[0].expected[0], options.timeoutMs);
    if (navigationExternalRequests.length) {
      throw new Error(`navigation: undeclared external requests ${JSON.stringify(navigationExternalRequests)}`);
    }
    report.navigation = {
      route: ROUTE_CASES[0].route,
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
  console.log(JSON.stringify({
    schema: report.schema,
    browser: report.browser,
    cases: report.cases.length,
    navigation: report.navigation?.back_forward,
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
