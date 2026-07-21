#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const required = [
  'src/visual-aperture-windowing.mjs',
  'src/visual-aperture-bounded-runtime.js',
  'src/visual-aperture-bounded-address-runtime.js',
  'src/visual-aperture-export-preview-runtime.js',
  'src/visual-aperture-bounded.css'
];
const missing = required.filter(file => !fs.existsSync(path.join(destination, file)));
if (missing.length) {
  console.error(`validate-aperture-bounded-pages failed: missing ${missing.join(', ')}`);
  process.exit(1);
}

const loader = fs.readFileSync(path.join(destination, 'src', 'visual-aperture.js'), 'utf8');
const state = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-state.mjs'), 'utf8');
const windowing = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-windowing.mjs'), 'utf8');
const runtime = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-bounded-runtime.js'), 'utf8');
const exportModel = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-export.mjs'), 'utf8');
const preview = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-export-preview-runtime.js'), 'utf8');
const standalone = fs.readFileSync(path.join(destination, 'Clifford-Number-standalone.html'), 'utf8');

const boundedIndex = loader.indexOf('visual-aperture-bounded-runtime.js');
const mountIndex = loader.indexOf('visual-aperture-part-11.js');
const addressIndex = loader.indexOf('visual-aperture-bounded-address-runtime.js');
if (boundedIndex < 0 || mountIndex <= boundedIndex || addressIndex <= mountIndex) {
  console.error('validate-aperture-bounded-pages failed: bounded runtime load order does not protect the initial mount');
  process.exit(1);
}

const sourceContracts = [
  [state, 'ap_overview_page'],
  [state, 'ap_overview_size'],
  [state, 'ap_route_window'],
  [windowing, 'APERTURE_MAX_ROUTE_WINDOW_STEPS = 24'],
  [runtime, 'data-ap-action="overview-next"'],
  [runtime, 'data-ap-action="route-window-next"'],
  [exportModel, 'bounded_rendering_is_not_data_deletion: true'],
  [preview, 'APERTURE_EXPORT_PREVIEW_ROW_LIMIT = 100']
];
for (const [source, marker] of sourceContracts) {
  if (!source.includes(marker)) {
    console.error(`validate-aperture-bounded-pages failed: missing source contract ${marker}`);
    process.exit(1);
  }
}

for (const marker of [
  'APERTURE_OVERVIEW_PAGE_SIZES = Object.freeze([25, 50, 100])',
  'APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE = 50',
  'APERTURE_MAX_ROUTE_WINDOW_STEPS = 24',
  'data-ap-action="overview-next"',
  'data-ap-action="route-window-next"',
  'bounded_rendering_is_not_data_deletion: true',
  'APERTURE_EXPORT_PREVIEW_ROW_LIMIT = 100',
  'paginated_complete_rows_reachable'
]) {
  if (!standalone.includes(marker)) {
    console.error(`validate-aperture-bounded-pages failed: standalone omits ${marker}`);
    process.exit(1);
  }
}

if (/<(?:script|link)[^>]+(?:src|href)="[^"]*visual-aperture-(?:bounded|windowing)/.test(standalone)) {
  console.error('validate-aperture-bounded-pages failed: standalone references bounded-rendering assets externally');
  process.exit(1);
}

console.log(`validate-aperture-bounded-pages: OK (${required.length} bounded-rendering artifacts)`);
