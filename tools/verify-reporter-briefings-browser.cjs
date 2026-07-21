#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'build', 'briefings', 'index.json'), 'utf8'));
const outputDirectory = path.join(root, 'build', 'metrics');
const resultPath = path.join(outputDirectory, 'reporter-briefings-browser.json');
const screenshotPath = path.join(outputDirectory, 'reporter-briefing-first.png');
const evidenceScreenshotPath = path.join(outputDirectory, 'reporter-briefing-evidence-first.png');

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function waitForCase(page, title) {
  await page.waitForFunction(expected => document.querySelector('#detail .case-hero h2')?.textContent?.includes(expected), title, { timeout: 60000 });
  await settle(page);
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = {
    schema_version: 'reporter-briefings-browser@1',
    generated_at: new Date().toISOString(),
    graph_effect: 'none',
    conclusion_generated: false,
    passed: false,
    briefings: [],
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
    assert.equal(index.schema_version, 'reporter-briefing-index@1');
    assert.equal(index.graph_effect, 'none');
    assert.ok(index.briefings.length >= 1, 'at least one reporter briefing must be compiled');

    for (const [position, entry] of index.briefings.entries()) {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build', 'briefings', `${entry.briefing_id}.json`), 'utf8'));
      const caseItem = JSON.parse(fs.readFileSync(path.join(root, 'build', 'cases', `${entry.case_id}.json`), 'utf8'));
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto(`http://127.0.0.1:8080/${entry.output_path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(page);
      assert.equal(await page.locator('body').getAttribute('data-briefing-id'), entry.briefing_id);
      assert.equal(await page.locator('body').getAttribute('data-graph-effect'), 'none');
      assert.equal(await page.locator('.cards .card').count(), manifest.counts.threads);
      assert.equal(await page.locator('.sources a[href^="https://"]').count(), manifest.counts.public_receipts);
      assert.equal(await page.locator(`a[href="${entry.case_href}"]`).count(), 1);
      const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(desktopOverflow, false);
      if (position === 0) await page.screenshot({ path: screenshotPath, fullPage: true });

      await page.setViewportSize({ width: 375, height: 812 });
      await settle(page);
      const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(mobileOverflow, false);

      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto(`http://127.0.0.1:8080/#case/${entry.case_id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForCase(page, caseItem.title);
      const caseBriefLink = page.locator('#detail .case-brief-link');
      assert.equal(await caseBriefLink.count(), 1);
      assert.equal(await caseBriefLink.getAttribute('href'), entry.output_path);
      const verifiedCount = await page.locator('#detail .case-claim--verified').count();
      const reviewCount = await page.locator('#detail .case-claim--review_required').count();
      assert.equal(verifiedCount, caseItem.claim_status_counts.verified);
      assert.equal(reviewCount, caseItem.claim_status_counts.review_required);
      if (verifiedCount > 0) {
        await page.locator('#detail .case-claim--verified .claim-open').first().click();
        await page.waitForSelector('#evidence-dialog[open] .claim-inspector', { timeout: 10000 });
        assert.ok(await page.locator('#evidence-dialog .receipt-link[href^="https://"]').count() >= 1);
        assert.match(await page.locator('#evidence-dialog .claim-boundary').textContent(), /does not establish/i);
        if (position === 0) await page.screenshot({ path: evidenceScreenshotPath, fullPage: true });
        await page.locator('#evidence-dialog-close').click();
      }

      await page.goto(`http://127.0.0.1:8080/dist/Clifford-Number-standalone.html#case/${entry.case_id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForCase(page, caseItem.title);
      assert.equal(await page.locator('#detail .case-brief-link').count(), 0, 'portable release must suppress external briefing links');

      result.briefings.push({
        briefing_id: entry.briefing_id,
        case_id: entry.case_id,
        threads: manifest.counts.threads,
        public_receipts: manifest.counts.public_receipts,
        desktop_horizontal_overflow: desktopOverflow,
        mobile_horizontal_overflow: mobileOverflow,
        public_case_brief_link: true,
        portable_brief_link_suppressed: true,
        evidence_dialog_opened: verifiedCount > 0
      });
    }

    assert.deepEqual(result.console_errors, []);
    assert.deepEqual(result.page_errors, []);
    result.passed = true;
  } catch (error) {
    result.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await context.close();
    await browser.close().catch(() => {});
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  console.log(`verify-reporter-briefings-browser: ${path.relative(root, resultPath)} passed`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
