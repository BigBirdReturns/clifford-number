#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  let relative = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const target = path.resolve(site, relative);
  if (!target.startsWith(site) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404); response.end('not found'); return;
  }
  response.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(response);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const requests = [];
    const consoleErrors = [];
    const pageErrors = [];
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    for (const route of ['/', '/estates/', '/gametrails/']) {
      const result = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
      assert.equal(result.status(), 200, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${route}: overflow ${overflow}px`);
      checks.push({ route, viewport, overflow });
    }
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-network-mode="research"]').count(), 0);
    assert.equal(await page.locator('[data-network-mode="hops"]').count(), 1);
    assert.match(await page.locator('#atlas-stats').textContent(), /valid hops/);
    assert.equal(requests.some(value => value.endsWith('/graph.json') || value.includes('/legacy/')), false);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    const poof = await page.goto(`http://127.0.0.1:${port}/reports/core-thesis/poof-clifford-ecology/`);
    assert.equal(poof.status(), 404);
    const manifest = await page.goto(`http://127.0.0.1:${port}/publication-manifest.json`);
    assert.equal(manifest.status(), 200);
    await context.close();
  }
  fs.mkdirSync(path.join(root, 'build', 'publication'), { recursive: true });
  fs.writeFileSync(path.join(root, 'build', 'publication', 'browser-qa.json'), JSON.stringify({
    schema_version: 'clifford-publication-browser-qa@1',
    route_checks: checks.length,
    graph_json_requested: false,
    legacy_requested: false,
    poof_github_pages_status: 404,
    manifest_status: 200,
    checks,
  }, null, 2) + '\n');
  console.log('publication-pages-browser.test: OK');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
