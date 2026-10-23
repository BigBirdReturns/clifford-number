#!/usr/bin/env node
// Exercise the generated reservoir with its real records. No result is submitted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const url = option('--url', 'http://127.0.0.1:8080/build/reservoir/index.html');
const output = option('--output-dir', 'build/reservoir-smoke');
const executablePath = option('--chrome', undefined);
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const report = { url, browser: browser.version(), cases: [] };
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'page must fit viewport');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('#q').waitFor();
    assert.equal(await page.evaluate(() => scrollY), 0, 'arrival must not jump into a record');
    assert.equal(await page.locator('#counts > div').count(), 4);
    assert.equal(await page.locator('.welcome').count(), 1);
    const total = await page.locator('#summary').textContent();
    const originalRows = await page.locator('.row').count();
    await noOverflow();
    await page.screenshot({ path: path.join(output, `arrival-${viewport.width}.png`) });
    await page.keyboard.press('/');
    assert.equal(await page.locator('#q').evaluate(el => el === document.activeElement), true);
    await page.locator('#q').fill('zzzz-no-matching-inquiry-zzzz');
    assert.equal(await page.locator('.row').count(), 0);
    assert.match(await page.locator('.empty').textContent(), /Nothing matches/);
    await page.locator('#q').press('Escape');
    assert.equal(await page.locator('#summary').textContent(), total);
    await page.locator('#more').click();
    assert.ok(await page.locator('.row').count() > originalRows, 'read more reveals actual records');
    await page.locator('#filters > summary').click();
    await page.locator('#states [data-v="held"]').click();
    assert.equal(await page.locator('#states [data-v="held"]').getAttribute('aria-pressed'), 'true');
    assert.ok((await page.locator('.row > .pill').allTextContents()).every(text => text === 'held'));
    assert.equal(new URL(page.url()).searchParams.get('state'), 'held');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#states [data-v="held"]').getAttribute('aria-pressed'), 'true');
    await page.locator('#reset-filters').click();
    assert.equal(await page.locator('#summary').textContent(), total);
    assert.equal(await page.locator('#reset-filters').isDisabled(), true);
    await page.locator('#hubs summary').click();
    const hub = page.locator('.hub').first();
    await hub.click();
    assert.equal(await hub.getAttribute('aria-pressed'), 'true');
    assert.ok(new URL(page.url()).searchParams.has('hub'));
    await page.locator('#reset-filters').click();
    await page.locator('#hubs summary').click();
    await page.locator('#q').fill('synthetic');
    assert.ok(await page.locator('.row').count() > 0);
    const first = await page.locator('.row').first().getAttribute('data-id');
    await page.locator('.row').first().click();
    assert.equal(decodeURIComponent(new URL(page.url()).hash.slice(1)), first);
    assert.equal(await page.locator('#detail').getAttribute('data-inquiry-id'), first);
    assert.equal(await page.locator('#detail').evaluate(el => el === document.activeElement), true);
    const selection = await page.evaluate(() => new Promise(resolve => {
      addEventListener('reservoir:select', ev => resolve(ev.detail.id), { once: true });
      ReservoirView.open(document.querySelector('#detail').dataset.inquiryId);
    }));
    assert.equal(selection, first, 'local result form receives the selected inquiry');
    await page.locator('#copy-inquiry').click();
    await page.waitForFunction(() => document.getElementById('copy-inquiry').textContent === 'Link copied');
    assert.equal(await page.locator('#copy-inquiry').textContent(), 'Link copied');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url());
    await noOverflow();
    await page.screenshot({ path: path.join(output, `inquiry-${viewport.width}.png`) });
    await page.locator('#back-results').click();
    assert.equal(await page.locator('.row[aria-current="true"]').evaluate(el => el === document.activeElement), true);
    const second = await page.locator('.row').nth(1).getAttribute('data-id');
    await page.locator('.row').nth(1).click();
    await page.goBack();
    assert.equal(await page.locator('#detail').getAttribute('data-inquiry-id'), first);
    await page.goForward();
    assert.equal(await page.locator('#detail').getAttribute('data-inquiry-id'), second);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#detail').getAttribute('data-inquiry-id'), second);
    assert.equal(await page.locator('#q').inputValue(), 'synthetic');
    const local = await page.evaluate(() => Boolean(window.RESERVOIR_LOCAL));
    if (local) {
      await page.locator('#return-result textarea').waitFor();
      await page.locator('#native-estate > summary').click();
      await page.locator('#native-q').fill('terminal-field-matrix');
      await page.locator('#native-results [data-source-id]').first().waitFor();
      await page.locator('#native-results [data-source-id]').first().click();
      await page.locator('#native-source pre').waitFor();
      assert.ok((await page.locator('#native-source pre').textContent()).length > 100, 'native source displays current content');
      await noOverflow();
      await page.locator('#native-source').getByRole('button', { name: 'Attach to current inquiry', exact: true }).click();
      assert.match(await page.locator('#return-result').textContent(), /1 native source\(s\) attached/);
      await page.locator('#native-estate > summary').click();
      await page.locator('#return-result textarea').fill('Unsaved browser check');
      await page.locator('#back-results').click();
      await page.locator('.row').first().click();
      await page.locator('#back-results').click();
      await page.locator('.row').nth(1).click();
      assert.equal(await page.locator('#return-result textarea').inputValue(), 'Unsaved browser check');
      await page.locator('#return-result textarea').fill('');
    }
    await page.locator('#reservoir-theme').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await noOverflow();
    await page.screenshot({ path: path.join(output, `dark-${viewport.width}.png`) });
    await page.goto(url + '#missing-inquiry', { waitUntil: 'networkidle' });
    assert.match(await page.locator('.welcome').textContent(), /could not be found/);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    report.cases.push({ viewport, result: 'PASS', localResultForm: local, checks: ['arrival', 'search', 'empty-state', 'keyboard', 'pagination', 'status-filter', 'hub-filter', 'reset', 'url-state', 'selection-event', 'copy-link', 'return-to-results', 'back-forward', 'deep-link-reload', 'theme-persistence', 'no-overflow', 'missing-inquiry'] });
    await context.close();
  }
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL'; report.error = error.stack; throw error;
} finally {
  fs.writeFileSync(path.join(output, 'reservoir-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
