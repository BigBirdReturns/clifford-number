#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
// The topology explorer (explorer.html/app.js/styles.css) ships as a public second page
// alongside the causal homepage. app.js imports src/ui-utils.js, src/i18n.js,
// src/route-projections.js, and src/release-delta.js as ES modules, and requires
// build/scores.json to initialize (init()'s Promise.all has no .catch for it) — all
// are shipped so the hosted explorer actually runs rather than hard-failing on load.
// build/atlas-projection.json is fetched with a .catch(() => null) fallback (ladder
// step 6: corridors + release deltas), so it is shipped for the live corridor overlay
// but its absence would not break the atlas; build/atlas-projection-baseline.json is
// deliberately never shipped here, so the release-delta strip honestly reports an
// absent baseline until a real prior release exists.
const files = [
  'index.html', 'home.js', 'home.css', 'explorer.html', 'app.js', 'styles.css',
  'src/ui-utils.js', 'src/i18n.js', 'src/route-projections.js', 'src/release-delta.js', 'src/evidence-rank.js',
  'package.json', 'graph.json'
];
const publicData = ['build/hop-graph.json', 'build/surface-graph.json', 'build/receipt-graph.json', 'build/scores.json', 'build/atlas-projection.json'];
const assets = ['assets/favicon.svg', 'assets/social-card.png', 'assets/social-card.svg'];

function copy(relative) {
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, relative), target);
}

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const relative of [...files, ...publicData, ...assets]) copy(relative);
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log(`build-pages: homepage + explorer release (${files.length + publicData.length + assets.length} files)`);
