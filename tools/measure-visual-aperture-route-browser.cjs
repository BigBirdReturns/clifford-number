#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'build', 'metrics');
const jsonPath = path.join(outputDirectory, 'visual-aperture-route-browser.json');
const markdownPath = path.join(outputDirectory, 'visual-aperture-route-browser.md');

function round(value) {
  return Number(Number(value).toFixed(3));
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const {
    buildVisualApertureScaleFixture,
    summarizeVisualApertureScaleFixture
  } = await import('./visual-aperture-scale-fixture.mjs');
  const fixture = buildVisualApertureScaleFixture({
    actorCount: 5000,
    surfaceCount: 1200,
    denseRosterSize: 5000,
    hopEdgeCount: 1000,
    participantsPerSurface: 8
  });
  const output = {
    schema_version: 'clifford-visual-aperture-route-browser-baseline@1',
    status: 'measurement_only_no_budget_enforced',
    generated_at: new Date().toISOString(),
    graph_effect: 'none',
    conclusion_generated: false,
    fixture: summarizeVisualApertureScaleFixture(fixture),
    from_actor_id: 'synthetic-actor-00001',
    to_actor_id: 'synthetic-actor-01001',
    passed: false,
    render_ms: null,
    route_steps: null,
    route_actor_nodes: null,
    overview_rows: null,
    stage_min_width_px: null,
    long_tasks: [],
    dom_counters: null,
    console_errors: [],
    page_errors: [],
    error: null,
    interpretation_contract: {
      what_this_is: 'A Chromium cardinality and timing measurement for a deterministic 1,000-step synthetic route.',
      what_this_is_not: 'A real-person path, a universal performance guarantee, or an accepted route-rendering budget.'
    }
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  for (const [pattern, payload] of [
    ['**/build/surface-graph.json', fixture.surfaceGraph],
    ['**/build/hop-graph.json', fixture.hopGraph],
    ['**/build/receipt-graph.json', fixture.receiptGraph]
  ]) {
    await context.route(pattern, route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload)
    }));
  }
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') output.console_errors.push(message.text());
  });
  page.on('pageerror', error => output.page_errors.push(error.message));
  await page.addInitScript(() => {
    globalThis.__apertureRouteLongTasks = [];
    if ('PerformanceObserver' in globalThis) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            globalThis.__apertureRouteLongTasks.push({
              name: entry.name,
              start_time: entry.startTime,
              duration: entry.duration
            });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {}
    }
  });

  try {
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#network-atlas')?.dataset.apertureMounted === 'true', null, { timeout: 60000 });
    await page.click('[data-ap-mode="route"]');
    await page.waitForSelector('#ap-route-from');
    await page.selectOption('#ap-route-from', output.from_actor_id);
    const start = performance.now();
    await page.selectOption('#ap-route-to', output.to_actor_id);
    await page.waitForFunction(() => document.querySelectorAll('#aperture-layer .aperture-route-step').length === 1000, null, { timeout: 120000 });
    await settle(page);
    output.render_ms = round(performance.now() - start);
    output.route_steps = await page.locator('#aperture-layer .aperture-route-step').count();
    output.route_actor_nodes = await page.locator('#aperture-layer .aperture-route-actor').count();
    output.overview_rows = await page.locator('#aperture-table-body tr').count();
    output.stage_min_width_px = await page.locator('#aperture-stage').evaluate(element => Number.parseFloat(getComputedStyle(element).minWidth) || 0);
    output.long_tasks = await page.evaluate(() => globalThis.__apertureRouteLongTasks || []);
    const session = await context.newCDPSession(page);
    output.dom_counters = await session.send('Memory.getDOMCounters');
    assert.equal(output.route_steps, 1000);
    assert.equal(output.route_actor_nodes, 1001);
    assert.equal(output.overview_rows, 1000);
    assert.ok(output.stage_min_width_px > 100000);
    assert.deepEqual(output.console_errors, []);
    assert.deepEqual(output.page_errors, []);
    output.passed = true;
  } catch (error) {
    output.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await context.close();
    await browser.close().catch(() => {});
    fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
    const maximumLongTask = Math.max(0, ...output.long_tasks.map(item => item.duration));
    const lines = [
      '# Visual aperture adversarial route baseline',
      '',
      `Generated: ${output.generated_at}`,
      '',
      `Passed: ${output.passed}`,
      '',
      `- Route render: ${output.render_ms ?? 'n/a'} ms`,
      `- Route steps: ${output.route_steps ?? 'n/a'}`,
      `- Route actor nodes: ${output.route_actor_nodes ?? 'n/a'}`,
      `- Overview rows: ${output.overview_rows ?? 'n/a'}`,
      `- Stage minimum width: ${output.stage_min_width_px ?? 'n/a'} px`,
      `- Long tasks: ${output.long_tasks.length}`,
      `- Maximum long task: ${round(maximumLongTask)} ms`,
      `- DOM nodes: ${output.dom_counters?.nodes ?? 'n/a'}`,
      '',
      '> Measurement only. A 1,000-step synthetic path is not an accepted production rendering budget.',
      ''
    ];
    fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`);
  }

  console.log(`measure-visual-aperture-route-browser: wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
