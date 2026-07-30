#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'reports/core-thesis/poof-clifford-ecology');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.txt':'text/plain', '.xml':'application/xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let relative = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(site, relative);
  if (!file.startsWith(site) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const routes = ['/', '/report/', '/reader-file/', '/examination/', '/estate/', '/newsroom/', '/methods/', '/machine/', '/audit/'];
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.locator('h1').count(), 1, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${route}: overflow ${overflow}px at ${viewport.width}`);
      results.push({ route, viewport, overflow });
    }
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    await page.goto(`http://127.0.0.1:${port}/reader-file/`);
    await page.locator('#reader-role').selectOption({ label: 'Reporter' });
    await page.locator('#reader-objective').fill('Test one bounded claim.');
    await page.locator('#reader-save').click();
    await assert.doesNotReject(async () => assert.match(await page.locator('#reader-result').textContent(), /Saved locally/));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('#site-search').fill('poof-o2');
    assert.equal(await page.locator('.object:visible').count(), 1);
    await page.locator('#site-search').fill('definitely-not-present');
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 0);
    await page.locator('#site-search').fill('');
    await Promise.all([
      page.waitForURL(`http://127.0.0.1:${port}/newsroom/index.html`),
      page.getByRole('link', { name: 'Use the newsroom desk' }).click()
    ]);
    for (const [name, value] of [['claim','bounded'],['receipt','limited'],['counterweight','preserve'],['candidate','candidate']]) await page.locator(`input[name="${name}"][value="${value}"]`).check();
    await page.locator('#prove').click();
    assert.match(await page.locator('#proof-result').textContent(), /transfer verified/i);
    await page.goto(`http://127.0.0.1:${port}/examination/`);
    await page.locator('#referral-export').click();
    assert.match(await page.locator('#referral-result').textContent(), /not exported/i);
    const validReferral = {
      '#ref-proposition': 'A bounded proposition requiring another record.',
      '#ref-ceiling': 'Candidate only.',
      '#ref-record': 'Acquire the exact decision record.',
      '#ref-route': 'Public-record request and lawful review.',
      '#ref-custodian': 'Evidence desk',
      '#ref-consequence': 'The proposition remains unresolved.',
      '#ref-privacy': 'Exclude personal data not required by the claim.'
    };
    for (const [selector, value] of Object.entries(validReferral)) await page.locator(selector).fill(value);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#referral-export').click()]);
    assert.equal(download.suggestedFilename(), 'poof-referral-packet.json');
    assert.match(await page.locator('#referral-result').textContent(), /validated graph-inert referral/i);
    await context.close();
  }
  const qa = { schema_version:'poof-ecology-browser-qa@1', tested_routes:routes, viewport_runs:2, route_checks:results.length, console_errors:0, page_errors:0, max_overflow_px:Math.max(...results.map((row)=>row.overflow)), reader_file_interaction:true, proving_ground_transfer:true };
  fs.mkdirSync(path.join(root, 'build/poof-clifford-ecology'), { recursive:true });
  fs.writeFileSync(path.join(root, 'build/poof-clifford-ecology/browser-qa.json'), JSON.stringify(qa, null, 2) + '\n');
  console.log('poof-clifford-ecology-browser.test: OK');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
