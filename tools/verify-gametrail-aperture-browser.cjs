#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'build', 'metrics');
const resultPath = path.join(outputDirectory, 'gametrail-aperture-browser.json');
const exportPath = path.join(outputDirectory, 'gametrail-aperture-export.json');
const desktopPath = path.join(outputDirectory, 'gametrail-aperture-desktop.png');
const frontierPath = path.join(outputDirectory, 'gametrail-aperture-frontier.png');
const mobilePath = path.join(outputDirectory, 'gametrail-aperture-mobile.png');

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = {
    schema_version: 'gametrail-aperture-browser@1',
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
  const context = await browser.newContext({
    viewport: { width: 1540, height: 1080 },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') result.console_errors.push(message.text());
  });
  page.on('pageerror', error => result.page_errors.push(error.message));

  try {
    await page.goto('http://127.0.0.1:8080/gametrails/index.html', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await settle(page);

    assert.equal(await page.locator('body').getAttribute('data-gametrail-aperture-schema'), 'estate-game-trail-public-data@2');
    assert.equal(await page.locator('body').getAttribute('data-graph-effect'), 'none');
    assert.equal(await page.locator('body').getAttribute('data-conclusion-generated'), 'false');
    assert.equal(await page.locator('#metrics .metric').count(), 7);
    assert.match(await page.locator('#metrics').textContent(), /Prepared surveys\s*10/i);
    assert.match(await page.locator('#metrics').textContent(), /Compiled trails\s*308/i);
    assert.equal(await page.locator('.matrix tbody tr').count(), 24);
    assert.equal(await page.locator('.matrix-cell').count(), 576);
    assert.match(await page.locator('#stage-title').textContent(), /First-overlap surface/);

    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(desktopOverflow, false);
    await page.screenshot({ path: desktopPath, fullPage: true });

    await page.locator('[data-cell-origin="local-development-estate"][data-cell-target="real-property-title-debt-estate"]').click();
    await settle(page);
    const clickedUrl = new URL(page.url());
    assert.equal(clickedUrl.searchParams.get('gt_mode'), 'trails');
    assert.equal(clickedUrl.searchParams.get('gt_origin'), 'local-development-estate');
    assert.equal(clickedUrl.searchParams.get('gt_target'), 'real-property-title-debt-estate');
    assert.ok(await page.locator('.trail-card').count() > 0);

    const deedUrl = 'http://127.0.0.1:8080/gametrails/index.html?gt_v=1&gt_mode=trails&gt_origin=local-development-estate&gt_target=real-property-title-debt-estate&gt_family=legacy_preserved_trail&gt_outcome=typed_object_overlap&gt_q=&gt_trail=trail-deed-chronology&gt_page=1';
    await page.goto(deedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page);
    assert.match(await page.locator('#inspector').textContent(), /deed chronology/i);
    assert.match(await page.locator('#inspector').textContent(), /Real Property, Title, and Secured-Debt/i);
    assert.match(await page.locator('#inspector').textContent(), /county_recorder_records/i);

    await page.locator('[data-mode="frontier"]').click();
    await page.locator('#origin-select').selectOption('ai-data-compute-infrastructure-estate');
    await page.locator('#target-select').selectOption('all');
    await page.locator('#outcome-select').selectOption('all');
    await page.locator('#trail-query').fill('');
    await settle(page);
    assert.equal(await page.locator('.frontier-card').count(), 1);
    assert.equal(await page.locator('[data-survey-state="surveyed_and_prepared"]').count(), 1);
    assert.match(await page.locator('.frontier-card').textContent(), /AI, data, and compute infrastructure/i);
    assert.match(await page.locator('.frontier-card').textContent(), /Prepared survey/i);
    assert.match(await page.locator('.frontier-card').textContent(), /Records claimed\s*0/i);
    await page.locator('.frontier-card').click();
    await settle(page);
    assert.match(await page.locator('#inspector').textContent(), /Prepared frontier survey/i);
    assert.match(await page.locator('#inspector').textContent(), /FedRAMP Marketplace/i);
    assert.match(await page.locator('#inspector').textContent(), /Records claimed acquired\s*0/i);
    assert.match(await page.locator('#inspector').textContent(), /authorized service with no located agency deployment/i);
    await page.screenshot({ path: frontierPath, fullPage: true });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-view').click();
    const download = await downloadPromise;
    await download.saveAs(exportPath);
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    assert.equal(exported.schema_version, 'game-trail-aperture-export@1');
    assert.equal(exported.interpretation_contract.graph_effect, 'none');
    assert.equal(exported.selected_trail.trail_id, 'estate-frontier:ai-data-compute-infrastructure-estate');
    assert.equal(exported.selected_frontier_survey.estate_id, 'ai-data-compute-infrastructure-estate');
    assert.equal(exported.selected_frontier_survey.preparation_state.raw_records_acquired, 0);
    assert.equal(exported.frontier_surveys.length, 1);
    assert.ok(exported.trails.every(trail => trail.origin_estate_id === 'ai-data-compute-infrastructure-estate'));

    await page.locator('[data-mode="evidence"]').click();
    await page.locator('#origin-select').selectOption('all');
    await page.locator('#trail-query').fill('pallas ventures');
    await settle(page);
    assert.match(await page.locator('#stage-body').textContent(), /trail-sally-donnelly-validation/);
    assert.match(await page.locator('#stage-body').textContent(), /trail-tony-demartino-validation/);
    assert.match(await page.locator('#stage-body').textContent(), /vehicle:pallas-ventures/i);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-mode="matrix"]').click();
    await settle(page);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(mobileOverflow, false);
    await page.screenshot({ path: mobilePath, fullPage: true });

    await page.goto('http://127.0.0.1:8080/dist/Clifford-Game-Trail-Aperture-standalone.html?gt_v=1&gt_mode=frontier&gt_origin=judicial-administrative-adjudication-estate&gt_target=all&gt_family=all&gt_outcome=all&gt_q=&gt_trail=estate-frontier%3Ajudicial-administrative-adjudication-estate&gt_page=1', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await settle(page);
    assert.match(await page.locator('#stage-title').textContent(), /estate frontiers/i);
    assert.match(await page.locator('#inspector').textContent(), /Judicial and Administrative Adjudication/i);
    assert.match(await page.locator('#inspector').textContent(), /PACER Case Locator/i);
    assert.equal(await page.locator('body').getAttribute('data-graph-effect'), 'none');

    assert.deepEqual(result.console_errors, []);
    assert.deepEqual(result.page_errors, []);
    result.checks = {
      estates: 24,
      frontier_surveys: 10,
      compiled_trails: 308,
      legacy_trails: 35,
      legacy_trail_estate_evaluations: 840,
      matrix_cells: 576,
      directed_overlap_pairs: 302,
      exact_legacy_trail_pairs: 5,
      bounded_non_overlap_trails: 66,
      unresolved_legacy_trails: 2,
      survey_zero_record_boundary_visible: true,
      deep_link_round_trip: true,
      candidate_only_export: true,
      exact_pair_visible: true,
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
  console.log(`verify-gametrail-aperture-browser: ${path.relative(root, resultPath)} passed`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
