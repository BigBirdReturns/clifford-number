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
const MAX_ROUTE_STEPS = 24;
const MAX_ROUTE_ACTORS = 25;
const MAX_OVERVIEW_ROWS = 100;
const MAX_STAGE_WIDTH = 8000;
const MAX_RENDER_MS = 300;
const MAX_LONG_TASK_MS = 250;
const MAX_DOM_NODES = 25_000;

function round(value) {
  return Number(Number(value).toFixed(3));
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const { buildVisualApertureScaleFixture, summarizeVisualApertureScaleFixture } = await import('./visual-aperture-scale-fixture.mjs');
  const fixture = buildVisualApertureScaleFixture({
    actorCount: 5000,
    surfaceCount: 1200,
    denseRosterSize: 5000,
    hopEdgeCount: 1000,
    participantsPerSurface: 8
  });
  const output = {
    schema_version: 'clifford-visual-aperture-route-browser-budget@1',
    status: 'bounded_route_budget_enforced',
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
    next_window: null,
    export_packet: null,
    export_preview_rows: null,
    print_preview_rows: null,
    long_tasks: [],
    dom_counters: null,
    console_errors: [],
    page_errors: [],
    error: null,
    interpretation_contract: {
      what_this_is: 'A Chromium enforcement run for a complete 1,000-step synthetic path rendered through a bounded route window.',
      what_this_is_not: 'A real-person path, a universal performance guarantee, or a truncated computed route.'
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
    await page.evaluate(() => { globalThis.__apertureRouteLongTasks = []; });
    const start = performance.now();
    await page.selectOption('#ap-route-to', output.to_actor_id);
    await page.waitForFunction(() => document.querySelectorAll('#aperture-layer .aperture-route-step').length === 24, null, { timeout: 120000 });
    await settle(page);
    output.render_ms = round(performance.now() - start);
    output.route_steps = await page.locator('#aperture-layer .aperture-route-step').count();
    output.route_actor_nodes = await page.locator('#aperture-layer .aperture-route-actor').count();
    output.overview_rows = await page.locator('#aperture-table-body tr').count();
    output.stage_min_width_px = await page.locator('#aperture-stage').evaluate(element => Number.parseFloat(getComputedStyle(element).minWidth) || 0);
    assert.equal(output.route_steps, MAX_ROUTE_STEPS);
    assert.equal(output.route_actor_nodes, MAX_ROUTE_ACTORS);
    assert.equal(output.overview_rows, 50);
    assert.ok(output.stage_min_width_px <= MAX_STAGE_WIDTH);
    assert.ok(output.render_ms <= MAX_RENDER_MS, `route render ${output.render_ms}ms exceeds ${MAX_RENDER_MS}ms`);

    await page.click('[data-ap-action="route-window-next"]');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('ap_route_window') === '24');
    await settle(page);
    output.next_window = {
      url_start: await page.evaluate(() => new URL(location.href).searchParams.get('ap_route_window')),
      first_step: await page.locator('#aperture-layer .aperture-route-step').first().getAttribute('data-ap-route-step'),
      last_step: await page.locator('#aperture-layer .aperture-route-step').last().getAttribute('data-ap-route-step'),
      route_steps: await page.locator('#aperture-layer .aperture-route-step').count()
    };
    assert.deepEqual(output.next_window, { url_start: '24', first_step: '24', last_step: '47', route_steps: 24 });

    await page.click('[data-ap-action="export-toggle"]');
    await page.waitForSelector('#aperture-export:not([hidden])');
    const packet = JSON.parse(await page.locator('#aperture-export-json').textContent());
    output.export_packet = {
      path_steps: packet.view.path.hops.length,
      table_rows: packet.view.table.rows.length,
      visible_step_from: packet.view.route_window.visible_step_from,
      visible_step_until: packet.view.route_window.visible_step_until,
      total_steps: packet.view.route_window.total_steps,
      complete_path_retained: packet.view.route_window.complete_path_retained,
      display_total_rows: packet.view.display.total_rows,
      caption_mentions_complete_path: /complete path is retained/i.test(packet.caption)
    };
    output.export_preview_rows = await page.locator('#aperture-export-table-body tr').count();
    output.print_preview_rows = await page.locator('#aperture-print-export tbody tr').count();
    assert.deepEqual(output.export_packet, {
      path_steps: 1000,
      table_rows: 1000,
      visible_step_from: 25,
      visible_step_until: 48,
      total_steps: 1000,
      complete_path_retained: true,
      display_total_rows: 1000,
      caption_mentions_complete_path: true
    });
    assert.ok(output.export_preview_rows <= MAX_OVERVIEW_ROWS);
    assert.ok(output.print_preview_rows <= MAX_OVERVIEW_ROWS);

    output.long_tasks = await page.evaluate(() => globalThis.__apertureRouteLongTasks || []);
    const session = await context.newCDPSession(page);
    output.dom_counters = await session.send('Memory.getDOMCounters');
    const maximumLongTask = Math.max(0, ...output.long_tasks.map(item => item.duration));
    assert.ok(maximumLongTask <= MAX_LONG_TASK_MS, `route long task ${maximumLongTask}ms exceeds ${MAX_LONG_TASK_MS}ms`);
    assert.ok(output.dom_counters.nodes <= MAX_DOM_NODES, `route DOM ${output.dom_counters.nodes} exceeds ${MAX_DOM_NODES}`);
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
      '# Visual aperture adversarial route budget',
      '',
      `Generated: ${output.generated_at}`,
      '',
      `Passed: ${output.passed}`,
      '',
      `- Complete path steps: ${output.export_packet?.path_steps ?? 'n/a'}`,
      `- Visible route steps: ${output.route_steps ?? 'n/a'}`,
      `- Visible route actor nodes: ${output.route_actor_nodes ?? 'n/a'}`,
      `- Overview rows: ${output.overview_rows ?? 'n/a'}`,
      `- Stage minimum width: ${output.stage_min_width_px ?? 'n/a'} px`,
      `- Route render: ${output.render_ms ?? 'n/a'} ms`,
      `- Maximum post-mount long task: ${round(maximumLongTask)} ms`,
      `- DOM nodes after export preview: ${output.dom_counters?.nodes ?? 'n/a'}`,
      `- Export preview rows: ${output.export_preview_rows ?? 'n/a'}`,
      `- Complete export table rows: ${output.export_packet?.table_rows ?? 'n/a'}`,
      '',
      '> Windowing bounds presentation, not computation or export. Every synthetic route step remains in the packet.',
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
