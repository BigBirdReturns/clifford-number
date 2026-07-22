#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const frontier = JSON.parse(fs.readFileSync(path.join(root, 'build', 'report-frontier.json'), 'utf8'));
const outputDirectory = path.join(root, 'build', 'metrics');
const resultPath = path.join(outputDirectory, 'report-frontier-browser.json');
const screenshotPath = path.join(outputDirectory, 'report-frontier.png');

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = {
    schema_version: 'report-frontier-browser@1',
    generated_at: new Date().toISOString(),
    graph_effect: 'none',
    conclusion_generated: false,
    passed: false,
    cases: 0,
    trail_programs: 0,
    case_trails: 0,
    desktop_horizontal_overflow: null,
    mobile_horizontal_overflow: null,
    console_errors: [],
    page_errors: [],
    error: null
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') result.console_errors.push(message.text()); });
  page.on('pageerror', error => result.page_errors.push(error.message));

  try {
    await page.goto('http://127.0.0.1:8080/reports/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);

    assert.equal(await page.locator('body').getAttribute('data-report-frontier-schema'), 'report-frontier@1');
    assert.equal(await page.locator('body').getAttribute('data-graph-effect'), 'none');
    assert.equal(await page.locator('body').getAttribute('data-conclusion-generated'), 'false');
    assert.equal(await page.locator('[data-stage]').count(), frontier.transition_order.length);
    assert.equal(await page.locator('[data-case-id]').count(), frontier.cases.length);
    assert.equal(await page.locator('[data-program-id]').count(), frontier.trail_programs.length);

    const expectedCaseTrails = frontier.trail_programs.reduce((total, program) => total + (program.trails?.length ?? 0), 0);
    assert.equal(await page.locator('[data-trail-id]').count(), expectedCaseTrails);
    assert.equal(await page.locator(`.stage.active[data-stage="${frontier.waterline.stage}"]`).count(), 1);

    for (const item of frontier.cases) {
      assert.equal(await page.locator(`[data-case-id="${item.case_id}"]`).count(), 1);
      assert.equal(await page.locator(`a[href="../#case/${item.case_id}"]`).count(), 1);
      if (item.report_id) assert.equal(await page.locator(`a[href="../briefs/${item.report_id}.html"]`).count(), 1);
    }

    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(desktopOverflow, false);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await page.setViewportSize({ width: 375, height: 812 });
    await settle(page);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(mobileOverflow, false);

    assert.deepEqual(result.console_errors, []);
    assert.deepEqual(result.page_errors, []);
    result.passed = true;
    result.cases = frontier.cases.length;
    result.trail_programs = frontier.trail_programs.length;
    result.case_trails = expectedCaseTrails;
    result.desktop_horizontal_overflow = desktopOverflow;
    result.mobile_horizontal_overflow = mobileOverflow;
  } catch (error) {
    result.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await context.close();
    await browser.close().catch(() => {});
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  console.log(`verify-report-frontier-browser: ${path.relative(root, resultPath)} passed`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
