import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles.css', 'utf8');
const app = readFileSync('app.js', 'utf8');
const socialCard = readFileSync('assets/social-card.svg', 'utf8');
const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

// Durable metadata and first-run semantics.
assert.match(html, /<meta name="description"/);
assert.match(html, /<meta property="og:title"/);
assert.match(html, /assets\/social-card\.png/);
assert.match(html, /<meta property="og:image:width" content="1200"/);
assert.match(html, /<link rel="icon" href="assets\/favicon\.svg"/);
assert.match(html, /class="skip-link" href="#main-content"/);
assert.match(html, /id="app-status"[^>]+role="status"/);
assert.match(html, /id="preferences-menu"/);
for (const id of ['theme-select', 'language-select', 'reading-select', 'density-select', 'contrast-toggle', 'preferences-reset']) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must ship in the display menu`);
}
assert.match(html, /data-i18n="heroDek"/);
assert.match(html, /id="browse-all"/);
assert.match(html, /clifford-preferences/);

// The tab pattern must expose state and relationships before JavaScript runs.
assert.match(html, /id="tab-map"[^>]+role="tab"[^>]+aria-selected="true"[^>]+aria-controls="view-map"/);
assert.match(html, /id="tab-desk"[^>]+role="tab"[^>]+aria-selected="false"[^>]+aria-controls="view-desk"/);
assert.match(html, /id="view-map" role="tabpanel" aria-labelledby="tab-map"/);
assert.match(html, /id="view-desk" role="tabpanel" aria-labelledby="tab-desk"/);

// Every desk input has a durable visible label; placeholders are not labels.
for (const id of ['desk-from', 'desk-to', 'desk-asof']) {
  assert.match(html, new RegExp(`<label for="${id}"(?:\\s[^>]*)?>`));
}

// Keyboard, motion, and visible-focus contracts.
assert.match(css, /:focus-visible\s*\{/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(app, /function onSearchKeydown/);
assert.match(app, /aria-activedescendant/);
assert.match(app, /function browseAll/);
assert.match(app, /function copyCitation/);
assert.match(app, /formatCitation/);
assert.match(app, /navigator\.share/);
assert.match(app, /function shareCitation/);
assert.match(html, /Translate page/);
assert.match(css, /\[data-reading="large"\]/);
assert.match(css, /\[data-contrast="high"\]/);

// Evidence is the primary UI object, and confirmed evidence is ranked explicitly.
assert.match(app, /function renderReceiptGrid/);
assert.match(app, /function renderTopologyMap/);
assert.match(app, /function renderCase/);
assert.match(app, /build\/cases\/index\.json/);
assert.match(app, /confirmed:\s*0/);
assert.match(app, /Shared context is not influence|does not establish contact/);

// Editable social artwork keeps the expected large-card aspect and brand boundary language;
// metadata points at its rasterized PNG counterpart for crawler compatibility.
assert.match(socialCard, /width="1200" height="630"/);
assert.match(socialCard, /EVERY HOP IS A SHARED BOUNDED SURFACE/);
assert.ok(statSync('assets/social-card.png').size > 10_000, 'raster social card must be present and non-empty');

// Every runtime dependency and local receipt link must ship in the Pages artifact.
const recursiveCopy = deployWorkflow.split(/\r?\n/).find(line => line.includes('cp -R')) ?? '';
for (const directory of ['assets', 'docs', 'data', 'build', 'src', 'receipts']) {
  assert.match(recursiveCopy, new RegExp(`(?:^|\\s)${directory}(?:\\s|$)`), `Pages artifact must include ${directory}/`);
}

console.log('ui-contract.test.js: OK');
