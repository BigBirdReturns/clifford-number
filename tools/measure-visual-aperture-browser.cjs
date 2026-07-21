#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'build', 'metrics');
const jsonPath = path.join(outputDirectory, 'visual-aperture-browser.json');
const markdownPath = path.join(outputDirectory, 'visual-aperture-browser.md');
const MAX_OVERVIEW_ROWS = 100;
const MAX_INTERACTION_MS = 300;
const MAX_LONG_TASK_MS = 250;
const MAX_DOM_NODES = 25_000;

function round(value) {
  return Number(Number(value).toFixed(3));
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function measuredAction(page, action, ready) {
  const start = performance.now();
  await action();
  if (ready) await ready();
  await settle(page);
  return round(performance.now() - start);
}

async function createMeasuredPage(browser, fixture, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference'
  });
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
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    globalThis.__apertureScaleLongTasks = [];
    if ('PerformanceObserver' in globalThis) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            globalThis.__apertureScaleLongTasks.push({
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
  const navigationStart = performance.now();
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#network-atlas')?.dataset.apertureMounted === 'true', null, { timeout: 60000 });
  await settle(page);
  const mountMs = round(performance.now() - navigationStart);
  await page.evaluate(() => { globalThis.__apertureScaleLongTasks = []; });
  return { context, page, mountMs, consoleErrors, pageErrors };
}

async function setMapScale(page, value) {
  await page.locator('#ap-map-scale').evaluate((element, next) => {
    element.value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function desktopMeasurements(browser, fixture) {
  const measured = await createMeasuredPage(browser, fixture, {
    viewport: { width: 1440, height: 1100 },
    reducedMotion: false
  });
  const { context, page } = measured;
  const result = {
    mount_ms: measured.mountMs,
    semantic_levels: {},
    overview_pagination: {},
    surface_mode: {},
    route_mode: {},
    interaction_measurements_ms: [],
    long_tasks: [],
    dom_counters: null,
    console_errors: measured.consoleErrors,
    page_errors: measured.pageErrors
  };

  try {
    await page.click('[data-ap-mode="map"]');

    const corpusMs = await measuredAction(page, () => setMapScale(page, 1), () => page.waitForSelector('.aperture-scene--corpus'));
    result.interaction_measurements_ms.push(corpusMs);
    result.semantic_levels.corpus = {
      interaction_ms: corpusMs,
      cluster_nodes: await page.locator('#aperture-layer .aperture-cluster').count(),
      corridor_lines: await page.locator('#aperture-layer .aperture-corridor').count(),
      overview_rows: await page.locator('#aperture-table-body tr').count()
    };
    assert.ok(result.semantic_levels.corpus.cluster_nodes <= 7);
    assert.ok(result.semantic_levels.corpus.corridor_lines <= 21);

    const machineMs = await measuredAction(page, () => setMapScale(page, 2), () => page.waitForSelector('.aperture-scene--machine'));
    result.interaction_measurements_ms.push(machineMs);
    result.semantic_levels.machine = {
      interaction_ms: machineMs,
      type_nodes: await page.locator('#aperture-layer .aperture-machine-node').count(),
      overview_rows: await page.locator('#aperture-table-body tr').count()
    };
    assert.ok(result.semantic_levels.machine.type_nodes <= 16);

    const surfaceMs = await measuredAction(page, () => setMapScale(page, 3.2), () => page.waitForSelector('.aperture-scene--surface'));
    result.interaction_measurements_ms.push(surfaceMs);
    result.semantic_levels.surface = {
      interaction_ms: surfaceMs,
      actor_brackets: await page.locator('#aperture-layer .aperture-actor-bracket').count(),
      overview_rows: await page.locator('#aperture-table-body tr').count()
    };
    assert.ok(result.semantic_levels.surface.actor_brackets <= 18);
    assert.ok(result.semantic_levels.surface.overview_rows <= MAX_OVERVIEW_ROWS);

    const evidenceMs = await measuredAction(page, () => setMapScale(page, 4.4), () => page.waitForSelector('.aperture-scene--evidence'));
    result.interaction_measurements_ms.push(evidenceMs);
    result.semantic_levels.evidence = {
      interaction_ms: evidenceMs,
      actor_brackets: await page.locator('#aperture-layer .aperture-actor-bracket').count(),
      overview_rows: await page.locator('#aperture-table-body tr').count(),
      status: await page.locator('#aperture-overview-status').textContent()
    };
    assert.ok(result.semantic_levels.evidence.actor_brackets <= 12);
    assert.equal(result.semantic_levels.evidence.overview_rows, 50);
    assert.match(result.semantic_levels.evidence.status, /Showing 1–50 of 5000/);
    await page.screenshot({ path: path.join(outputDirectory, 'visual-aperture-evidence-baseline.png') });

    result.overview_pagination.page_size_100_ms = await measuredAction(
      page,
      () => page.selectOption('#ap-overview-size', '100'),
      () => page.waitForFunction(() => document.querySelectorAll('#aperture-table-body tr').length === 100)
    );
    result.interaction_measurements_ms.push(result.overview_pagination.page_size_100_ms);
    result.overview_pagination.page_1_rows = await page.locator('#aperture-table-body tr').count();
    result.overview_pagination.next_page_ms = await measuredAction(
      page,
      () => page.click('[data-ap-action="overview-next"]'),
      () => page.waitForFunction(() => new URL(location.href).searchParams.get('ap_overview_page') === '2')
    );
    result.interaction_measurements_ms.push(result.overview_pagination.next_page_ms);
    result.overview_pagination.page_2_rows = await page.locator('#aperture-table-body tr').count();
    result.overview_pagination.url_page = await page.evaluate(() => new URL(location.href).searchParams.get('ap_overview_page'));
    result.overview_pagination.url_page_size = await page.evaluate(() => new URL(location.href).searchParams.get('ap_overview_size'));
    assert.equal(result.overview_pagination.page_1_rows, 100);
    assert.equal(result.overview_pagination.page_2_rows, 100);
    assert.equal(result.overview_pagination.url_page, '2');
    assert.equal(result.overview_pagination.url_page_size, '100');

    result.surface_mode.switch_ms = await measuredAction(page, () => page.click('[data-ap-mode="surface"]'), () => page.waitForSelector('.aperture-scene--dense'));
    result.interaction_measurements_ms.push(result.surface_mode.switch_ms);
    await page.selectOption('#ap-surface-select', fixture.dense_surface_id);
    await page.waitForSelector('.aperture-scene--dense');
    await settle(page);
    result.surface_mode.default_actor_brackets = await page.locator('#aperture-layer .aperture-actor-bracket').count();
    result.surface_mode.participant_to_participant_lines = await page.locator('#aperture-layer .aperture-participation-line').count();
    result.surface_mode.default_overview_rows = await page.locator('#aperture-table-body tr').count();
    assert.ok(result.surface_mode.default_actor_brackets <= 18);
    assert.equal(result.surface_mode.participant_to_participant_lines, 0);

    result.surface_mode.budget_36_ms = await measuredAction(
      page,
      () => page.locator('#ap-surface-budget').evaluate(element => {
        element.value = '36';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }),
      () => page.waitForFunction(() => document.querySelectorAll('#aperture-layer .aperture-actor-bracket').length === 36)
    );
    result.interaction_measurements_ms.push(result.surface_mode.budget_36_ms);
    result.surface_mode.budget_36_actor_brackets = await page.locator('#aperture-layer .aperture-actor-bracket').count();
    result.surface_mode.budget_36_overview_rows = await page.locator('#aperture-table-body tr').count();
    assert.equal(result.surface_mode.budget_36_actor_brackets, 36);
    assert.equal(result.surface_mode.budget_36_overview_rows, 36);
    await page.screenshot({ path: path.join(outputDirectory, 'visual-aperture-surface-budget.png') });

    result.surface_mode.search_ms = await measuredAction(
      page,
      () => page.fill('#ap-surface-query', 'Synthetic Actor 00001'),
      () => page.waitForFunction(() => document.querySelectorAll('#aperture-table-body tr').length === 1)
    );
    result.interaction_measurements_ms.push(result.surface_mode.search_ms);
    result.surface_mode.search_rows = await page.locator('#aperture-table-body tr').count();
    assert.equal(result.surface_mode.search_rows, 1);

    result.route_mode.switch_ms = await measuredAction(page, () => page.click('[data-ap-mode="route"]'), () => page.waitForSelector('#ap-route-from'));
    result.interaction_measurements_ms.push(result.route_mode.switch_ms);
    await page.selectOption('#ap-route-from', 'synthetic-actor-00001');
    await page.selectOption('#ap-route-to', 'synthetic-actor-00002');
    await page.waitForSelector('.aperture-route-step');
    await settle(page);
    result.route_mode.route_steps = await page.locator('#aperture-layer .aperture-route-step').count();
    result.route_mode.route_actor_nodes = await page.locator('#aperture-layer .aperture-route-actor').count();
    result.route_mode.overview_rows = await page.locator('#aperture-table-body tr').count();
    assert.equal(result.route_mode.route_steps, 1);
    assert.equal(result.route_mode.route_actor_nodes, 2);
    assert.equal(result.route_mode.overview_rows, 1);

    result.long_tasks = await page.evaluate(() => globalThis.__apertureScaleLongTasks || []);
    const session = await context.newCDPSession(page);
    result.dom_counters = await session.send('Memory.getDOMCounters');
    result.reduced_motion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    const maximumInteraction = Math.max(...result.interaction_measurements_ms);
    const maximumLongTask = Math.max(0, ...result.long_tasks.map(item => item.duration));
    result.budgets = {
      maximum_interaction_ms: round(maximumInteraction),
      maximum_long_task_ms: round(maximumLongTask),
      maximum_overview_rows: Math.max(...Object.values(result.semantic_levels).map(item => item.overview_rows), result.surface_mode.budget_36_overview_rows, result.route_mode.overview_rows),
      dom_nodes: result.dom_counters.nodes
    };
    assert.ok(maximumInteraction <= MAX_INTERACTION_MS, `post-mount interaction ${maximumInteraction}ms exceeds ${MAX_INTERACTION_MS}ms`);
    assert.ok(maximumLongTask <= MAX_LONG_TASK_MS, `post-mount long task ${maximumLongTask}ms exceeds ${MAX_LONG_TASK_MS}ms`);
    assert.ok(result.budgets.maximum_overview_rows <= MAX_OVERVIEW_ROWS);
    assert.ok(result.dom_counters.nodes <= MAX_DOM_NODES, `DOM nodes ${result.dom_counters.nodes} exceed ${MAX_DOM_NODES}`);
    assert.equal(result.reduced_motion, false);
    assert.deepEqual(result.console_errors, []);
    assert.deepEqual(result.page_errors, []);
    return result;
  } finally {
    await context.close();
  }
}

async function mobileMeasurements(browser, fixture) {
  const measured = await createMeasuredPage(browser, fixture, {
    viewport: { width: 375, height: 812 },
    reducedMotion: true
  });
  const { context, page } = measured;
  const result = {
    mount_ms: measured.mountMs,
    reduced_motion: false,
    horizontal_overflow: null,
    actor_brackets: 0,
    overview_rows: 0,
    participant_to_participant_lines: 0,
    inspector_sheet_opened: false,
    console_errors: measured.consoleErrors,
    page_errors: measured.pageErrors
  };
  try {
    result.reduced_motion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    await page.click('[data-ap-mode="surface"]');
    await page.selectOption('#ap-surface-select', fixture.dense_surface_id);
    await page.waitForSelector('.aperture-scene--dense');
    await settle(page);
    result.horizontal_overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    result.actor_brackets = await page.locator('#aperture-layer .aperture-actor-bracket').count();
    result.overview_rows = await page.locator('#aperture-table-body tr').count();
    result.participant_to_participant_lines = await page.locator('#aperture-layer .aperture-participation-line').count();
    await page.locator('[data-ap-surface-actor]').first().click();
    await page.waitForSelector('.aperture-inspector.is-open');
    result.inspector_sheet_opened = true;
    assert.equal(result.reduced_motion, true);
    assert.equal(result.horizontal_overflow, false);
    assert.ok(result.actor_brackets <= 18);
    assert.ok(result.overview_rows <= MAX_OVERVIEW_ROWS);
    assert.equal(result.participant_to_participant_lines, 0);
    assert.deepEqual(result.console_errors, []);
    assert.deepEqual(result.page_errors, []);
    return result;
  } finally {
    await context.close();
  }
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
    schema_version: 'clifford-visual-aperture-browser-budget@1',
    status: 'bounded_rendering_budgets_enforced',
    generated_at: new Date().toISOString(),
    graph_effect: 'none',
    conclusion_generated: false,
    fixture: summarizeVisualApertureScaleFixture(fixture),
    desktop: null,
    mobile_reduced_motion: null,
    passed: false,
    error: null,
    interpretation_contract: {
      what_this_is: 'A Chromium enforcement run for bounded aperture rendering against deterministic synthetic compiled artifacts.',
      what_this_is_not: 'A universal performance guarantee, a real-person dataset, or evidence about any relationship.'
    }
  };
  const browser = await chromium.launch({ headless: true });
  try {
    output.desktop = await desktopMeasurements(browser, fixture);
    output.mobile_reduced_motion = await mobileMeasurements(browser, fixture);
    output.passed = true;
  } catch (error) {
    output.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await browser.close().catch(() => {});
    fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
    const lines = [
      '# Visual aperture browser rendering budget',
      '',
      `Generated: ${output.generated_at}`,
      '',
      `Passed: ${output.passed}`,
      '',
      `- Desktop mount: ${output.desktop?.mount_ms ?? 'n/a'} ms`,
      `- Map evidence overview rows: ${output.desktop?.semantic_levels?.evidence?.overview_rows ?? 'n/a'}`,
      `- Maximum overview rows: ${output.desktop?.budgets?.maximum_overview_rows ?? 'n/a'}`,
      `- Maximum post-mount interaction: ${output.desktop?.budgets?.maximum_interaction_ms ?? 'n/a'} ms`,
      `- Maximum post-mount long task: ${output.desktop?.budgets?.maximum_long_task_ms ?? 'n/a'} ms`,
      `- DOM nodes: ${output.desktop?.budgets?.dom_nodes ?? 'n/a'}`,
      `- Dense-surface participant-to-participant lines: ${output.desktop?.surface_mode?.participant_to_participant_lines ?? 'n/a'}`,
      `- Mobile horizontal overflow: ${output.mobile_reduced_motion?.horizontal_overflow ?? 'n/a'}`,
      `- Mobile reduced-motion query matched: ${output.mobile_reduced_motion?.reduced_motion ?? 'n/a'}`,
      '',
      '> Structural budgets are universal to this fixture. Timing values remain environment-specific measurements enforced on the declared runner.',
      ''
    ];
    fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`);
  }
  console.log(`measure-visual-aperture-browser: wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
