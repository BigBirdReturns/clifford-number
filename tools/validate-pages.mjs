#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const required = [
  'index.html', 'app.js', 'styles.css', '.nojekyll',
  'build/surface-graph.json', 'build/hop-graph.json', 'build/receipt-graph.json',
  'build/cases/index.json', 'build/cases/field-autopsy-03.json',
  'src/ui-utils.js', 'src/i18n.js', 'assets/social-card.png',
  'docs/methodology.md', 'cases/field-autopsy-03/case.json'
];
const missing = required.filter(file => !fs.existsSync(path.join(destination, file)));
if (missing.length) {
  console.error(`validate-pages failed: missing ${missing.join(', ')}`);
  process.exit(1);
}
for (const forbidden of ['data/crawl', 'data/intake', 'data/local', 'receipts/crawl']) {
  if (fs.existsSync(path.join(destination, forbidden))) {
    console.error(`validate-pages failed: intake path ${forbidden} must not be published`);
    process.exit(1);
  }
}
const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(destination, 'app.js'), 'utf8');
if (!html.includes('id="main-content"') || !app.includes('build/cases/index.json')) {
  console.error('validate-pages failed: public entrypoint does not expose the explorer and compiled cases');
  process.exit(1);
}
console.log(`validate-pages: OK (${required.length} required artifacts)`);
