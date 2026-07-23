#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'build', 'metrics');
const resultPath = path.join(outputDirectory, 'estate-aperture-browser.json');
const desktopPath = path.join(outputDirectory, 'estate-aperture-desktop.png');
const mobilePath = path.join(outputDirectory, 'estate-aperture-mobile.png');

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = {
    schema_version: 'estate-aperture-browser@1',
    generated_at: new Date().toISOString(),
    graph_effect: 'none',
    conclusion_generated: false,
    passed: false,
    console_errors: [],
    page_errors: [],
    checks: {},
    error: null,
  };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') result.console_errors.push(message.text()); });
  page.on('pageerror', error => result.page_errors.push(error.message));

  try {
    await page.goto('http://127.0.0.1:8080/estates/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    assert.equal(await page.locator('body').getAttribute('data-estate-aperture-schema'), 'estate-aperture-data@1');
    assert.equal(await page.locator('body').getAttribute('data-graph-effect'), 'none');
    assert.equal(await page.locator('#metrics .metric').count(), 5);
    assert.equal(await page.locator('#viz [data-type="estate"]').count(), 14);
    assert.equal(await page.locator('#viz .corridor').count(), 34);
    assert.match(await page.locator('#stage-title').textContent(), /Macro-estate corpus/);
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(desktopOverflow, false);
    await page.screenshot({ path: desktopPath, fullPage: true });

    await page.locator('#viz [data-type="estate"][data-id="us-defense-estate"]').click();
    await settle(page);
    assert.equal(new URL(page.url()).searchParams.get('ea_level'), 'pipeline');
    assert.equal(await page.locator('#viz [data-type="stage"]').count(), 5);
    assert.match(await page.locator('#inspect').textContent(), /United States defense estate/);
    assert.match(await page.locator('#inspect').textContent(), /Shared source infrastructure/);

    await page.locator('#viz [data-type="stage"][data-id="source_acquisition"]').click();
    await settle(page);
    assert.equal(new URL(page.url()).searchParams.get('ea_level'), 'task');
    assert.equal(await page.locator('#viz [data-type="task"]').count(), 7);

    await page.locator('#viz [data-type="task"][data-id="estate:us-defense-estate:source:sam-gov"]').click();
    await settle(page);
    assert.equal(new URL(page.url()).searchParams.get('ea_level'), 'evidence');
    assert.equal(new URL(page.url()).searchParams.get('ea_task'), 'estate:us-defense-estate:source:sam-gov');
    assert.match(await page.locator('#inspect').textContent(), /SAM\.gov/);
    assert.match(await page.locator('#inspect').textContent(), /Some APIs require a key/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-json').click();
    const download = await downloadPromise;
    const downloadPath = path.join(outputDirectory, 'estate-aperture-export.json');
    await download.saveAs(downloadPath);
    const exported = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    assert.equal(exported.schema_version, 'estate-aperture-export@1');
    assert.equal(exported.interpretation_contract.graph_effect, 'none');
    assert.equal(exported.estate.estate_id, 'us-defense-estate');
    assert.equal(exported.task.task_id, 'estate:us-defense-estate:source:sam-gov');

    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    await page.locator('#inspect-toggle').click();
    await settle(page);
    assert.equal(await page.locator('#inspect').getAttribute('class').then(value => value.includes('open')), true);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(mobileOverflow, false);
    await page.screenshot({ path: mobilePath, fullPage: true });

    await page.goto('http://127.0.0.1:8080/dist/Clifford-Estate-Aperture-standalone.html?ea_v=1&ea_level=pipeline&ea_estate=local-development-estate', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    assert.match(await page.locator('#stage-title').textContent(), /Local development estate/);
    assert.equal(await page.locator('body').getAttribute('data-graph-effect'), 'none');

    assert.deepEqual(result.console_errors, []);
    assert.deepEqual(result.page_errors, []);
    result.checks = {
      estates: 14,
      shared_source_corridors: 34,
      pipeline_stages: 5,
      us_defense_source_tasks: 7,
      deep_link_round_trip: true,
      candidate_only_export: true,
      standalone_opened: true,
      desktop_horizontal_overflow: desktopOverflow,
      mobile_horizontal_overflow: mobileOverflow,
    };
    result.passed = true;
  } catch (error) {
    result.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await context.close();
    await browser.close().catch(() => {});
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(`verify-estate-aperture-browser: ${path.relative(root, resultPath)} passed`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
